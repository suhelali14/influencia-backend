import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SocialAccount, SocialPlatform } from './entities/social-account.entity';
import { ConnectSocialDto, OAuthConnectDto } from './dto/connect-social.dto';
import { TokenEncryptionService } from './security/token-encryption.service';
import { InstagramOAuthService } from './oauth/instagram-oauth.service';
import { YouTubeOAuthService } from './oauth/youtube-oauth.service';
import { TikTokOAuthService } from './oauth/tiktok-oauth.service';

@Injectable()
export class SocialService {
  private readonly logger = new Logger(SocialService.name);

  constructor(
    @InjectRepository(SocialAccount)
    private socialAccountsRepository: Repository<SocialAccount>,
    private tokenEncryption: TokenEncryptionService,
    private instagramOAuth: InstagramOAuthService,
    private youtubeOAuth: YouTubeOAuthService,
    private tiktokOAuth: TikTokOAuthService,
  ) {}

  async connect(creatorId: string, connectSocialDto: ConnectSocialDto): Promise<SocialAccount> {
    // Check if account already connected
    const existing = await this.socialAccountsRepository.findOne({
      where: {
        creator_id: creatorId,
        platform: connectSocialDto.platform,
      },
    });

    if (existing) {
      throw new BadRequestException(`${connectSocialDto.platform} account already connected`);
    }

    const socialAccount = this.socialAccountsRepository.create({
      creator_id: creatorId,
      ...connectSocialDto,
      last_synced_at: new Date(),
    });

    return this.socialAccountsRepository.save(socialAccount);
  }

  /**
   * Connect a social account via OAuth (called from OAuth callback)
   */
  async connectOAuth(creatorId: string, oauthData: OAuthConnectDto): Promise<SocialAccount> {
    // Check if account already exists
    const existing = await this.socialAccountsRepository.findOne({
      where: {
        creator_id: creatorId,
        platform: oauthData.platform,
      },
    });

    if (existing) {
      // Update existing account
      existing.platform_user_id = oauthData.platform_user_id;
      existing.username = oauthData.username;
      existing.access_token = oauthData.access_token;
      existing.refresh_token = oauthData.refresh_token || '';
      existing.token_expires_at = oauthData.token_expires_at ?? existing.token_expires_at;
      existing.followers_count = oauthData.followers_count || 0;
      existing.metrics = oauthData.metrics ?? existing.metrics;
      existing.is_connected = true;
      existing.last_synced_at = new Date();

      this.logger.log(`Updated ${oauthData.platform} account for creator ${creatorId}`);
      return this.socialAccountsRepository.save(existing);
    }

    // Create new account
    const socialAccount = this.socialAccountsRepository.create({
      creator_id: creatorId,
      platform: oauthData.platform,
      platform_user_id: oauthData.platform_user_id,
      username: oauthData.username,
      access_token: oauthData.access_token,
      refresh_token: oauthData.refresh_token || '',
      token_expires_at: oauthData.token_expires_at ?? new Date(),
      followers_count: oauthData.followers_count || 0,
      metrics: oauthData.metrics ?? { posts: 0, avg_likes: 0, avg_comments: 0, avg_views: 0 },
      is_connected: true,
      last_synced_at: new Date(),
    });

    this.logger.log(`Connected ${oauthData.platform} account for creator ${creatorId}`);
    return this.socialAccountsRepository.save(socialAccount);
  }

  /**
   * Refresh platform token
   */
  async refreshPlatformToken(creatorId: string, platform: string): Promise<SocialAccount> {
    const account = await this.socialAccountsRepository.findOne({
      where: { creator_id: creatorId, platform: platform as SocialPlatform },
    });

    if (!account) {
      throw new NotFoundException(`${platform} account not found`);
    }

    if (!account.refresh_token) {
      throw new BadRequestException(`No refresh token available for ${platform}`);
    }

    const refreshToken = this.tokenEncryption.decrypt(account.refresh_token);
    let newAccessToken: string;
    let newRefreshToken: string | undefined;
    let expiresIn: number;

    switch (platform) {
      case 'instagram':
        const igToken = await this.instagramOAuth.refreshLongLivedToken(
          this.tokenEncryption.decrypt(account.access_token)
        );
        newAccessToken = igToken.access_token;
        expiresIn = igToken.expires_in;
        break;

      case 'youtube':
        const ytToken = await this.youtubeOAuth.refreshAccessToken(refreshToken);
        newAccessToken = ytToken.access_token;
        newRefreshToken = ytToken.refresh_token;
        expiresIn = ytToken.expires_in;
        break;

      case 'tiktok':
        const ttToken = await this.tiktokOAuth.refreshAccessToken(refreshToken);
        newAccessToken = ttToken.access_token;
        newRefreshToken = ttToken.refresh_token;
        expiresIn = ttToken.expires_in;
        break;

      default:
        throw new BadRequestException(`Token refresh not supported for ${platform}`);
    }

    account.access_token = this.tokenEncryption.encrypt(newAccessToken);
    if (newRefreshToken) {
      account.refresh_token = this.tokenEncryption.encrypt(newRefreshToken);
    }
    account.token_expires_at = new Date(Date.now() + expiresIn * 1000);

    return this.socialAccountsRepository.save(account);
  }

  /**
   * Revoke platform access and disconnect
   */
  async revokePlatformAccess(creatorId: string, platform: string): Promise<void> {
    const account = await this.socialAccountsRepository.findOne({
      where: { creator_id: creatorId, platform: platform as SocialPlatform },
    });

    if (!account) {
      throw new NotFoundException(`${platform} account not found`);
    }

    // Try to revoke token with the platform (optional, some platforms don't support this)
    try {
      const accessToken = this.tokenEncryption.decrypt(account.access_token);
      
      switch (platform) {
        case 'youtube':
          await this.youtubeOAuth.revokeToken(accessToken);
          break;
        case 'tiktok':
          await this.tiktokOAuth.revokeToken(accessToken, account.platform_user_id);
          break;
        // Instagram doesn't have a revoke endpoint
      }
    } catch (error) {
      this.logger.warn(`Failed to revoke ${platform} token: ${error.message}`);
    }

    // Disconnect the account
    account.is_connected = false;
    account.access_token = '';
    account.refresh_token = '';
    account.token_expires_at = null;
    await this.socialAccountsRepository.save(account);
  }

  async disconnect(creatorId: string, platform: SocialPlatform): Promise<void> {
    const account = await this.socialAccountsRepository.findOne({
      where: { creator_id: creatorId, platform },
    });

    if (!account) {
      throw new NotFoundException(`${platform} account not found`);
    }

    account.is_connected = false;
    account.access_token = '';
    account.refresh_token = '';
    await this.socialAccountsRepository.save(account);
  }

  async findByCreator(creatorId: string): Promise<SocialAccount[]> {
    return this.socialAccountsRepository.find({
      where: { creator_id: creatorId, is_connected: true },
      order: { created_at: 'DESC' },
    });
  }

  async findOne(id: string): Promise<SocialAccount> {
    const account = await this.socialAccountsRepository.findOne({
      where: { id },
      relations: ['creator'],
    });

    if (!account) {
      throw new NotFoundException(`Social account not found`);
    }

    return account;
  }

  async syncMetrics(id: string, metrics: any): Promise<SocialAccount> {
    const account = await this.findOne(id);
    account.metrics = metrics;
    account.last_synced_at = new Date();
    return this.socialAccountsRepository.save(account);
  }

  async getStats(creatorId: string) {
    const accounts = await this.findByCreator(creatorId);
    
    return {
      total_followers: accounts.reduce((sum, acc) => sum + acc.followers_count, 0),
      avg_engagement_rate: accounts.length > 0 
        ? accounts.reduce((sum, acc) => sum + Number(acc.engagement_rate), 0) / accounts.length 
        : 0,
      platforms_connected: accounts.length,
      accounts: accounts.map(acc => ({
        platform: acc.platform,
        username: acc.username,
        followers: acc.followers_count,
        engagement_rate: acc.engagement_rate,
      })),
    };
  }
}
