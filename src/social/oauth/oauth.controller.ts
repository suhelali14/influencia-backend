import {
  Controller,
  Get,
  Post,
  Query,
  Param,
  Res,
  Body,
  UseGuards,
  Request,
  BadRequestException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import type { Response } from 'express';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { ConfigService } from '@nestjs/config';
import { OAuthStateService } from './oauth-state.service';
import { InstagramOAuthService } from './instagram-oauth.service';
import { YouTubeOAuthService } from './youtube-oauth.service';
import { TikTokOAuthService } from './tiktok-oauth.service';
import { TokenEncryptionService } from '../security/token-encryption.service';
import { SocialService } from '../social.service';
import { SocialPlatform } from '../entities/social-account.entity';
import { CreatorsService } from '../../creators/creators.service';

type Platform = 'instagram' | 'youtube' | 'tiktok' | 'twitter';

@ApiTags('oauth')
@Controller('oauth')
export class OAuthController {
  private readonly logger = new Logger(OAuthController.name);

  constructor(
    private configService: ConfigService,
    private oauthStateService: OAuthStateService,
    private instagramOAuth: InstagramOAuthService,
    private youtubeOAuth: YouTubeOAuthService,
    private tiktokOAuth: TikTokOAuthService,
    private tokenEncryption: TokenEncryptionService,
    private socialService: SocialService,
    private creatorsService: CreatorsService,
  ) {}

  /**
   * Helper to get creator ID from user ID
   */
  private async getCreatorId(userId: string): Promise<string> {
    try {
      const creator = await this.creatorsService.findByUserId(userId);
      return creator.id;
    } catch (error) {
      throw new NotFoundException('Creator profile not found. Please create a creator profile first.');
    }
  }

  // =====================================================
  // INSTAGRAM OAUTH
  // =====================================================

  @Get('instagram/auth')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get Instagram OAuth authorization URL' })
  @ApiQuery({ name: 'useGraphApi', required: false, description: 'Use Instagram Graph API (for business accounts)' })
  async getInstagramAuthUrl(
    @Request() req,
    @Query('useGraphApi') useGraphApi?: string,
    @Query('redirectUrl') redirectUrl?: string,
  ) {
    // Get creator ID from user ID
    const creatorId = await this.getCreatorId(req.user.userId);
    
    const state = this.oauthStateService.generateState(
      creatorId,
      'instagram',
      redirectUrl,
    );

    const authUrl = useGraphApi === 'true'
      ? this.instagramOAuth.getGraphApiAuthorizationUrl(state)
      : this.instagramOAuth.getAuthorizationUrl(state);

    return { authUrl, state };
  }

  @Get('instagram/callback')
  @ApiOperation({ summary: 'Handle Instagram OAuth callback' })
  async handleInstagramCallback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Query('error') error: string,
    @Query('error_reason') errorReason: string,
    @Res() res: Response,
  ) {
    const appUrl = this.configService.get<string>('FRONTEND_URL') || this.configService.get<string>('APP_URL') || 'http://localhost:5173';

    if (error) {
      this.logger.warn(`Instagram OAuth error: ${error} - ${errorReason}`);
      return res.redirect(`${appUrl}/creator/social-connect?error=${encodeURIComponent(errorReason || error)}&platform=instagram`);
    }

    if (!code || !state) {
      return res.redirect(`${appUrl}/creator/social-connect?error=missing_params&platform=instagram`);
    }

    // Validate state
    const stateData = this.oauthStateService.validateAndConsume(state);
    if (!stateData) {
      return res.redirect(`${appUrl}/creator/social-connect?error=invalid_state&platform=instagram`);
    }

    try {
      // Exchange code for token
      const tokenResponse = await this.instagramOAuth.exchangeCodeForToken(code);
      
      // Get long-lived token
      const longLivedToken = await this.instagramOAuth.getLongLivedToken(tokenResponse.access_token);
      
      // Get user profile
      const profile = await this.instagramOAuth.getUserProfile(longLivedToken.access_token);
      
      // Encrypt tokens before storage
      const encryptedAccessToken = this.tokenEncryption.encrypt(longLivedToken.access_token);
      
      // Save to database
      await this.socialService.connectOAuth(stateData.creatorId, {
        platform: SocialPlatform.INSTAGRAM,
        platform_user_id: profile.id,
        username: profile.username,
        access_token: encryptedAccessToken,
        refresh_token: '', // Instagram long-lived tokens don't have refresh tokens
        token_expires_at: this.instagramOAuth.calculateTokenExpiry(longLivedToken.expires_in),
        followers_count: profile.followers_count || 0,
        metrics: {
          posts: profile.media_count || 0,
          account_type: profile.account_type,
        },
      });

      this.logger.log(`Instagram connected for creator ${stateData.creatorId}`);
      return res.redirect(`${stateData.redirectUrl || appUrl + '/creator/social-connect'}?success=true&platform=instagram`);
    } catch (err) {
      this.logger.error('Instagram OAuth callback error', err);
      return res.redirect(`${appUrl}/creator/social-connect?error=${encodeURIComponent(err.message)}&platform=instagram`);
    }
  }

  @Post('instagram/deauthorize')
  @ApiOperation({ summary: 'Handle Instagram deauthorization callback from Meta' })
  async handleInstagramDeauthorize(
    @Body() body: { signed_request: string },
  ) {
    this.logger.log('Instagram deauthorization callback received');
    // Parse the signed request and deauthorize user
    // For now, just acknowledge receipt
    return { success: true };
  }

  @Post('instagram/delete-data')
  @ApiOperation({ summary: 'Handle Instagram data deletion request from Meta' })
  async handleInstagramDataDeletion(
    @Body() body: { signed_request: string },
  ) {
    this.logger.log('Instagram data deletion request received');
    // Parse the signed request and delete user data
    // Generate a confirmation code
    const confirmationCode = `DEL_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    
    return {
      url: `https://influencia.app/data-deletion-status?code=${confirmationCode}`,
      confirmation_code: confirmationCode,
    };
  }

  // =====================================================
  // YOUTUBE OAUTH
  // =====================================================

  @Get('youtube/auth')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get YouTube OAuth authorization URL' })
  async getYouTubeAuthUrl(
    @Request() req,
    @Query('redirectUrl') redirectUrl?: string,
  ) {
    // Get creator ID from user ID
    const creatorId = await this.getCreatorId(req.user.userId);
    
    const state = this.oauthStateService.generateState(
      creatorId,
      'youtube',
      redirectUrl,
    );

    const authUrl = this.youtubeOAuth.getAuthorizationUrl(state);
    return { authUrl, state };
  }

  @Get('youtube/callback')
  @ApiOperation({ summary: 'Handle YouTube OAuth callback' })
  async handleYouTubeCallback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Query('error') error: string,
    @Res() res: Response,
  ) {
    const appUrl = this.configService.get<string>('FRONTEND_URL') || this.configService.get<string>('APP_URL') || 'http://localhost:5173';

    if (error) {
      this.logger.warn(`YouTube OAuth error: ${error}`);
      return res.redirect(`${appUrl}/creator/social-connect?error=${encodeURIComponent(error)}&platform=youtube`);
    }

    if (!code || !state) {
      return res.redirect(`${appUrl}/creator/social-connect?error=missing_params&platform=youtube`);
    }

    // Validate state
    const stateData = this.oauthStateService.validateAndConsume(state);
    if (!stateData) {
      return res.redirect(`${appUrl}/creator/social-connect?error=invalid_state&platform=youtube`);
    }

    try {
      // Exchange code for token
      const tokenResponse = await this.youtubeOAuth.exchangeCodeForToken(code);
      
      // Get comprehensive channel info including recent videos
      const channelInfo = await this.youtubeOAuth.getChannelInfo(tokenResponse.access_token);
      
      // Encrypt tokens before storage
      const encryptedAccessToken = this.tokenEncryption.encrypt(tokenResponse.access_token);
      const encryptedRefreshToken = tokenResponse.refresh_token 
        ? this.tokenEncryption.encrypt(tokenResponse.refresh_token) 
        : '';
      
      // Calculate average engagement from recent videos
      let avgLikes = 0;
      let avgComments = 0;
      let avgViews = 0;
      if (channelInfo.recentVideos && channelInfo.recentVideos.length > 0) {
        avgLikes = Math.round(channelInfo.recentVideos.reduce((sum, v) => sum + v.likeCount, 0) / channelInfo.recentVideos.length);
        avgComments = Math.round(channelInfo.recentVideos.reduce((sum, v) => sum + v.commentCount, 0) / channelInfo.recentVideos.length);
        avgViews = Math.round(channelInfo.recentVideos.reduce((sum, v) => sum + v.viewCount, 0) / channelInfo.recentVideos.length);
      }

      // Save comprehensive metrics to database
      await this.socialService.connectOAuth(stateData.creatorId, {
        platform: SocialPlatform.YOUTUBE,
        platform_user_id: channelInfo.id,
        username: channelInfo.customUrl || channelInfo.title,
        access_token: encryptedAccessToken,
        refresh_token: encryptedRefreshToken,
        token_expires_at: this.youtubeOAuth.calculateTokenExpiry(tokenResponse.expires_in),
        followers_count: channelInfo.subscriberCount,
        engagement_rate: channelInfo.estimatedEngagementRate,
        metrics: {
          // Basic info
          channel_title: channelInfo.title,
          channel_description: channelInfo.description?.substring(0, 500),
          thumbnail_url: channelInfo.thumbnailUrl,
          banner_url: channelInfo.bannerUrl,
          custom_url: channelInfo.customUrl,
          country: channelInfo.country,
          
          // Statistics
          posts: channelInfo.videoCount,
          total_views: channelInfo.viewCount,
          subscriber_count: channelInfo.subscriberCount,
          hidden_subscriber_count: channelInfo.hiddenSubscriberCount,
          
          // Calculated metrics
          channel_age_days: channelInfo.channelAge,
          avg_views_per_video: channelInfo.avgViewsPerVideo,
          engagement_rate: channelInfo.estimatedEngagementRate,
          avg_likes: avgLikes,
          avg_comments: avgComments,
          avg_views: avgViews,
          
          // Channel keywords/categories
          keywords: channelInfo.keywords,
          
          // Recent videos (last 10)
          recent_videos: channelInfo.recentVideos?.map(v => ({
            id: v.id,
            title: v.title,
            published_at: v.publishedAt,
            thumbnail_url: v.thumbnailUrl,
            view_count: v.viewCount,
            like_count: v.likeCount,
            comment_count: v.commentCount,
            duration: v.duration,
          })),
          
          // Timestamps
          channel_created_at: channelInfo.publishedAt,
          last_synced_at: new Date().toISOString(),
        },
      });

      this.logger.log(`YouTube connected for creator ${stateData.creatorId} with ${channelInfo.recentVideos?.length || 0} recent videos`);
      return res.redirect(`${stateData.redirectUrl || appUrl + '/creator/social-connect'}?success=true&platform=youtube`);
    } catch (err) {
      this.logger.error('YouTube OAuth callback error', err);
      return res.redirect(`${appUrl}/creator/social-connect?error=${encodeURIComponent(err.message)}&platform=youtube`);
    }
  }

  // =====================================================
  // TIKTOK OAUTH
  // =====================================================

  @Get('tiktok/auth')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get TikTok OAuth authorization URL' })
  async getTikTokAuthUrl(
    @Request() req,
    @Query('redirectUrl') redirectUrl?: string,
  ) {
    // Get creator ID from user ID
    const creatorId = await this.getCreatorId(req.user.userId);
    
    const state = this.oauthStateService.generateState(
      creatorId,
      'tiktok',
      redirectUrl,
    );

    const authUrl = this.tiktokOAuth.getAuthorizationUrl(state);
    return { authUrl, state };
  }

  @Get('tiktok/callback')
  @ApiOperation({ summary: 'Handle TikTok OAuth callback' })
  async handleTikTokCallback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Query('error') error: string,
    @Query('error_description') errorDescription: string,
    @Res() res: Response,
  ) {
    const appUrl = this.configService.get<string>('FRONTEND_URL') || this.configService.get<string>('APP_URL') || 'http://localhost:5173';

    if (error) {
      this.logger.warn(`TikTok OAuth error: ${error} - ${errorDescription}`);
      return res.redirect(`${appUrl}/creator/social-connect?error=${encodeURIComponent(errorDescription || error)}&platform=tiktok`);
    }

    if (!code || !state) {
      return res.redirect(`${appUrl}/creator/social-connect?error=missing_params&platform=tiktok`);
    }

    // Validate state
    const stateData = this.oauthStateService.validateAndConsume(state);
    if (!stateData) {
      return res.redirect(`${appUrl}/creator/social-connect?error=invalid_state&platform=tiktok`);
    }

    try {
      // Exchange code for token
      const tokenResponse = await this.tiktokOAuth.exchangeCodeForToken(code);
      
      // Get user info
      const userInfo = await this.tiktokOAuth.getUserInfo(tokenResponse.access_token);
      
      // Encrypt tokens before storage
      const encryptedAccessToken = this.tokenEncryption.encrypt(tokenResponse.access_token);
      const encryptedRefreshToken = this.tokenEncryption.encrypt(tokenResponse.refresh_token);
      
      // Save to database
      await this.socialService.connectOAuth(stateData.creatorId, {
        platform: SocialPlatform.TIKTOK,
        platform_user_id: userInfo.open_id,
        username: userInfo.display_name,
        access_token: encryptedAccessToken,
        refresh_token: encryptedRefreshToken,
        token_expires_at: this.tiktokOAuth.calculateTokenExpiry(tokenResponse.expires_in),
        followers_count: userInfo.follower_count || 0,
        metrics: {
          posts: userInfo.video_count || 0,
          total_likes: userInfo.likes_count || 0,
          following_count: userInfo.following_count || 0,
          is_verified: userInfo.is_verified || false,
          avatar_url: userInfo.avatar_url,
        },
      });

      this.logger.log(`TikTok connected for creator ${stateData.creatorId}`);
      return res.redirect(`${stateData.redirectUrl || appUrl + '/creator/social-connect'}?success=true&platform=tiktok`);
    } catch (err) {
      this.logger.error('TikTok OAuth callback error', err);
      return res.redirect(`${appUrl}/creator/social-connect?error=${encodeURIComponent(err.message)}&platform=tiktok`);
    }
  }

  // =====================================================
  // GENERIC ENDPOINTS
  // =====================================================

  @Post(':platform/refresh')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Refresh access token for a platform' })
  async refreshToken(
    @Request() req,
    @Param('platform') platform: Platform,
  ) {
    return this.socialService.refreshPlatformToken(req.user.userId, platform);
  }

  @Post(':platform/revoke')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Revoke access for a platform' })
  async revokeToken(
    @Request() req,
    @Param('platform') platform: Platform,
  ) {
    return this.socialService.revokePlatformAccess(req.user.userId, platform);
  }
}
