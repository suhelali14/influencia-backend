import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SocialAccount, SocialPlatform } from '../entities/social-account.entity';
import { MetricsHistory } from '../entities/metrics-history.entity';
import { TokenEncryptionService } from '../security/token-encryption.service';
import { InstagramApiService } from '../platforms/instagram-api.service';
import { YouTubeApiService } from '../platforms/youtube-api.service';
import { TikTokApiService } from '../platforms/tiktok-api.service';
import { MetricsNormalizerService, NormalizedMetrics, AggregatedStats } from './metrics-normalizer.service';
import { InstagramOAuthService } from '../oauth/instagram-oauth.service';
import { YouTubeOAuthService } from '../oauth/youtube-oauth.service';
import { TikTokOAuthService } from '../oauth/tiktok-oauth.service';
import { SyncResult } from '../platforms/platform-api.interface';

@Injectable()
export class MetricsSyncService {
  private readonly logger = new Logger(MetricsSyncService.name);

  constructor(
    @InjectRepository(SocialAccount)
    private socialAccountsRepository: Repository<SocialAccount>,
    @InjectRepository(MetricsHistory)
    private metricsHistoryRepository: Repository<MetricsHistory>,
    private tokenEncryption: TokenEncryptionService,
    private instagramApi: InstagramApiService,
    private youtubeApi: YouTubeApiService,
    private tiktokApi: TikTokApiService,
    private instagramOAuth: InstagramOAuthService,
    private youtubeOAuth: YouTubeOAuthService,
    private tiktokOAuth: TikTokOAuthService,
    private metricsNormalizer: MetricsNormalizerService,
  ) {}

  /**
   * Sync metrics for a specific platform account
   */
  async syncPlatform(creatorId: string, platform: SocialPlatform): Promise<SyncResult> {
    const account = await this.socialAccountsRepository.findOne({
      where: { creator_id: creatorId, platform, is_connected: true },
    });

    if (!account) {
      return {
        success: false,
        platform,
        error: `${platform} account not connected`,
        synced_at: new Date(),
      };
    }

    try {
      // Check if token needs refresh
      await this.ensureValidToken(account);

      // Decrypt access token
      const accessToken = this.tokenEncryption.decrypt(account.access_token);

      // Fetch metrics based on platform
      let metrics;
      switch (platform) {
        case SocialPlatform.INSTAGRAM:
          metrics = await this.instagramApi.getMetrics(accessToken);
          break;
        case SocialPlatform.YOUTUBE:
          metrics = await this.youtubeApi.getMetrics(accessToken);
          break;
        case SocialPlatform.TIKTOK:
          metrics = await this.tiktokApi.getMetrics(accessToken);
          break;
        default:
          throw new Error(`Unsupported platform: ${platform}`);
      }

      // Normalize metrics
      const previousMetrics = account.metrics as NormalizedMetrics | undefined;
      const normalizedMetrics = this.metricsNormalizer.normalize(
        platform,
        account.platform_user_id,
        account.username,
        metrics,
        previousMetrics,
      );

      // Update account with new metrics
      account.followers_count = normalizedMetrics.followers_count;
      account.engagement_rate = normalizedMetrics.engagement_rate;
      account.metrics = normalizedMetrics as any;
      account.last_synced_at = new Date();

      await this.socialAccountsRepository.save(account);

      // Save to history
      await this.saveMetricsHistory(account.id, normalizedMetrics);

      this.logger.log(`Synced ${platform} metrics for creator ${creatorId}`);

      return {
        success: true,
        platform,
        metrics,
        synced_at: new Date(),
      };
    } catch (error) {
      this.logger.error(`Failed to sync ${platform} for creator ${creatorId}`, error);
      return {
        success: false,
        platform,
        error: error.message,
        synced_at: new Date(),
      };
    }
  }

  /**
   * Sync all connected platforms for a creator
   */
  async syncAllPlatforms(creatorId: string): Promise<SyncResult[]> {
    const accounts = await this.socialAccountsRepository.find({
      where: { creator_id: creatorId, is_connected: true },
    });

    const results: SyncResult[] = [];

    for (const account of accounts) {
      const result = await this.syncPlatform(creatorId, account.platform);
      results.push(result);
    }

    return results;
  }

  /**
   * Get aggregated stats for a creator across all platforms
   */
  async getAggregatedStats(creatorId: string): Promise<AggregatedStats> {
    const accounts = await this.socialAccountsRepository.find({
      where: { creator_id: creatorId, is_connected: true },
    });

    const platformMetrics: NormalizedMetrics[] = [];

    for (const account of accounts) {
      if (account.metrics) {
        const metrics = account.metrics as unknown as NormalizedMetrics;
        metrics.data_freshness = this.metricsNormalizer.getDataFreshness(account.last_synced_at);
        platformMetrics.push(metrics);
      }
    }

    return this.metricsNormalizer.aggregate(platformMetrics);
  }

  /**
   * Get metrics history for a platform
   */
  async getMetricsHistory(
    creatorId: string,
    platform?: SocialPlatform,
    days: number = 30,
  ): Promise<MetricsHistory[]> {
    const accounts = await this.socialAccountsRepository.find({
      where: platform 
        ? { creator_id: creatorId, platform, is_connected: true }
        : { creator_id: creatorId, is_connected: true },
    });

    if (accounts.length === 0) {
      return [];
    }

    const accountIds = accounts.map(a => a.id);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    return this.metricsHistoryRepository
      .createQueryBuilder('history')
      .where('history.social_account_id IN (:...accountIds)', { accountIds })
      .andWhere('history.recorded_at >= :startDate', { startDate })
      .orderBy('history.recorded_at', 'DESC')
      .getMany();
  }

  /**
   * Ensure the access token is valid, refresh if needed
   */
  private async ensureValidToken(account: SocialAccount): Promise<void> {
    // Check if token is expired or about to expire (within 1 hour)
    const tokenExpiresAt = account.token_expires_at;
    const oneHourFromNow = new Date(Date.now() + 60 * 60 * 1000);

    if (!tokenExpiresAt || tokenExpiresAt > oneHourFromNow) {
      return; // Token is still valid
    }

    this.logger.debug(`Refreshing token for ${account.platform} account`);

    // Token needs refresh
    if (!account.refresh_token) {
      throw new Error(`No refresh token available for ${account.platform}`);
    }

    const refreshToken = this.tokenEncryption.decrypt(account.refresh_token);

    let newAccessToken: string;
    let newRefreshToken: string | undefined;
    let expiresIn: number;

    switch (account.platform) {
      case SocialPlatform.INSTAGRAM:
        // Instagram long-lived tokens can be refreshed
        const igToken = await this.instagramOAuth.refreshLongLivedToken(
          this.tokenEncryption.decrypt(account.access_token)
        );
        newAccessToken = igToken.access_token;
        expiresIn = igToken.expires_in;
        break;

      case SocialPlatform.YOUTUBE:
        const ytToken = await this.youtubeOAuth.refreshAccessToken(refreshToken);
        newAccessToken = ytToken.access_token;
        newRefreshToken = ytToken.refresh_token;
        expiresIn = ytToken.expires_in;
        break;

      case SocialPlatform.TIKTOK:
        const ttToken = await this.tiktokOAuth.refreshAccessToken(refreshToken);
        newAccessToken = ttToken.access_token;
        newRefreshToken = ttToken.refresh_token;
        expiresIn = ttToken.expires_in;
        break;

      default:
        throw new Error(`Token refresh not supported for ${account.platform}`);
    }

    // Update account with new tokens
    account.access_token = this.tokenEncryption.encrypt(newAccessToken);
    if (newRefreshToken) {
      account.refresh_token = this.tokenEncryption.encrypt(newRefreshToken);
    }
    account.token_expires_at = new Date(Date.now() + expiresIn * 1000);

    await this.socialAccountsRepository.save(account);
    this.logger.log(`Token refreshed for ${account.platform} account`);
  }

  /**
   * Save metrics to history table
   */
  private async saveMetricsHistory(
    socialAccountId: string,
    metrics: NormalizedMetrics,
  ): Promise<void> {
    const history = this.metricsHistoryRepository.create({
      social_account_id: socialAccountId,
      followers_count: metrics.followers_count,
      engagement_rate: metrics.engagement_rate,
      impressions: metrics.total_impressions,
      reach: metrics.total_reach,
      avg_likes: metrics.avg_likes_per_post,
      avg_comments: metrics.avg_comments_per_post,
      avg_views: metrics.avg_views_per_post,
      quality_score: metrics.quality_score,
      recorded_at: new Date(),
    });

    await this.metricsHistoryRepository.save(history);
  }

  /**
   * Sync all accounts that haven't been synced in X hours
   */
  async syncStaleAccounts(hoursThreshold: number = 6): Promise<number> {
    const staleDate = new Date(Date.now() - hoursThreshold * 60 * 60 * 1000);

    const staleAccounts = await this.socialAccountsRepository
      .createQueryBuilder('account')
      .where('account.is_connected = :connected', { connected: true })
      .andWhere('(account.last_synced_at < :staleDate OR account.last_synced_at IS NULL)', { staleDate })
      .getMany();

    this.logger.log(`Found ${staleAccounts.length} stale accounts to sync`);

    let syncedCount = 0;
    for (const account of staleAccounts) {
      try {
        await this.syncPlatform(account.creator_id, account.platform);
        syncedCount++;
      } catch (error) {
        this.logger.error(`Failed to sync stale account ${account.id}`, error);
      }
    }

    return syncedCount;
  }
}
