import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { TokenEncryptionService } from '../security/token-encryption.service';

export interface YouTubeTokenResponse {
  access_token: string;
  expires_in: number;
  refresh_token?: string;
  scope: string;
  token_type: string;
}

export interface YouTubeChannelInfo {
  id: string;
  title: string;
  description: string;
  customUrl?: string;
  publishedAt: string;
  thumbnailUrl: string;
  subscriberCount: number;
  videoCount: number;
  viewCount: number;
  hiddenSubscriberCount: boolean;
  // Extended metrics
  country?: string;
  keywords?: string[];
  bannerUrl?: string;
  recentVideos?: YouTubeVideoInfo[];
  channelAge?: number; // in days
  avgViewsPerVideo?: number;
  estimatedEngagementRate?: number;
}

export interface YouTubeVideoInfo {
  id: string;
  title: string;
  publishedAt: string;
  thumbnailUrl: string;
  viewCount: number;
  likeCount: number;
  commentCount: number;
  duration: string;
}

/**
 * YouTube OAuth Service
 * Handles OAuth 2.0 flow for YouTube Data API v3
 */
@Injectable()
export class YouTubeOAuthService {
  private readonly logger = new Logger(YouTubeOAuthService.name);
  private readonly authUrl = 'https://accounts.google.com/o/oauth2/v2/auth';
  private readonly tokenUrl = 'https://oauth2.googleapis.com/token';
  private readonly apiUrl = 'https://www.googleapis.com/youtube/v3';

  constructor(
    private configService: ConfigService,
    private tokenEncryption: TokenEncryptionService,
  ) {}

  /**
   * Get the OAuth authorization URL for YouTube
   */
  getAuthorizationUrl(state: string): string {
    const clientId = this.configService.get<string>('YOUTUBE_CLIENT_ID');
    const redirectUri = this.configService.get<string>('YOUTUBE_REDIRECT_URI');

    if (!clientId || !redirectUri) {
      throw new BadRequestException('YouTube OAuth not configured');
    }

    // YouTube Data API scopes
    const scopes = [
      'https://www.googleapis.com/auth/youtube.readonly',
      'https://www.googleapis.com/auth/yt-analytics.readonly',
      'https://www.googleapis.com/auth/userinfo.profile',
    ].join(' ');

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: scopes,
      access_type: 'offline', // Request refresh token
      prompt: 'consent', // Force consent to get refresh token
      state: state,
    });

    return `${this.authUrl}?${params.toString()}`;
  }

  /**
   * Exchange authorization code for access token
   */
  async exchangeCodeForToken(code: string): Promise<YouTubeTokenResponse> {
    const clientId = this.configService.get<string>('YOUTUBE_CLIENT_ID') || '';
    const clientSecret = this.configService.get<string>('YOUTUBE_CLIENT_SECRET') || '';
    const redirectUri = this.configService.get<string>('YOUTUBE_REDIRECT_URI') || '';

    try {
      const response = await axios.post(
        this.tokenUrl,
        new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          code: code,
          grant_type: 'authorization_code',
          redirect_uri: redirectUri,
        }),
        {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        }
      );

      this.logger.debug('YouTube token exchange successful');
      return response.data;
    } catch (error) {
      this.logger.error('YouTube token exchange failed', error.response?.data);
      throw new BadRequestException(
        error.response?.data?.error_description || 'Failed to exchange YouTube code for token'
      );
    }
  }

  /**
   * Refresh the access token using refresh token
   */
  async refreshAccessToken(refreshToken: string): Promise<YouTubeTokenResponse> {
    const clientId = this.configService.get<string>('YOUTUBE_CLIENT_ID') || '';
    const clientSecret = this.configService.get<string>('YOUTUBE_CLIENT_SECRET') || '';

    try {
      const response = await axios.post(
        this.tokenUrl,
        new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          refresh_token: refreshToken,
          grant_type: 'refresh_token',
        }),
        {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        }
      );

      this.logger.debug('YouTube token refreshed');
      return response.data;
    } catch (error) {
      this.logger.error('YouTube token refresh failed', error.response?.data);
      throw new BadRequestException('Failed to refresh YouTube token');
    }
  }

  /**
   * Revoke access token
   */
  async revokeToken(token: string): Promise<void> {
    try {
      await axios.post(
        `https://oauth2.googleapis.com/revoke?token=${token}`,
        {},
        {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        }
      );
      this.logger.debug('YouTube token revoked');
    } catch (error) {
      this.logger.error('YouTube token revocation failed', error.response?.data);
      throw new BadRequestException('Failed to revoke YouTube token');
    }
  }

  /**
   * Get authenticated user's channel information with extended metrics
   */
  async getChannelInfo(accessToken: string): Promise<YouTubeChannelInfo> {
    try {
      // Fetch channel data with all parts
      const response = await axios.get(`${this.apiUrl}/channels`, {
        params: {
          part: 'snippet,statistics,brandingSettings,contentDetails,status',
          mine: true,
        },
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      const channel = response.data.items?.[0];
      if (!channel) {
        throw new BadRequestException('No YouTube channel found for this account');
      }

      // Calculate channel age
      const publishedDate = new Date(channel.snippet.publishedAt);
      const channelAge = Math.floor((Date.now() - publishedDate.getTime()) / (1000 * 60 * 60 * 24));

      // Calculate average views per video
      const totalViews = parseInt(channel.statistics.viewCount) || 0;
      const videoCount = parseInt(channel.statistics.videoCount) || 1;
      const avgViewsPerVideo = Math.round(totalViews / videoCount);

      // Fetch recent videos for engagement calculation
      let recentVideos: YouTubeVideoInfo[] = [];
      let estimatedEngagementRate = 0;
      
      try {
        recentVideos = await this.getRecentVideos(accessToken, channel.contentDetails?.relatedPlaylists?.uploads);
        
        // Calculate engagement rate from recent videos
        if (recentVideos.length > 0) {
          const subscriberCount = parseInt(channel.statistics.subscriberCount) || 1;
          const totalEngagement = recentVideos.reduce((sum, video) => 
            sum + video.likeCount + video.commentCount, 0);
          const avgEngagementPerVideo = totalEngagement / recentVideos.length;
          estimatedEngagementRate = (avgEngagementPerVideo / subscriberCount) * 100;
        }
      } catch (error) {
        this.logger.warn('Could not fetch recent videos for engagement calculation');
      }

      return {
        id: channel.id,
        title: channel.snippet.title,
        description: channel.snippet.description,
        customUrl: channel.snippet.customUrl,
        publishedAt: channel.snippet.publishedAt,
        thumbnailUrl: channel.snippet.thumbnails?.high?.url || channel.snippet.thumbnails?.default?.url,
        subscriberCount: parseInt(channel.statistics.subscriberCount) || 0,
        videoCount: parseInt(channel.statistics.videoCount) || 0,
        viewCount: parseInt(channel.statistics.viewCount) || 0,
        hiddenSubscriberCount: channel.statistics.hiddenSubscriberCount || false,
        // Extended metrics
        country: channel.snippet.country,
        keywords: channel.brandingSettings?.channel?.keywords?.split(',').map((k: string) => k.trim()),
        bannerUrl: channel.brandingSettings?.image?.bannerExternalUrl,
        recentVideos,
        channelAge,
        avgViewsPerVideo,
        estimatedEngagementRate: Math.round(estimatedEngagementRate * 100) / 100,
      };
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      this.logger.error('Failed to get YouTube channel info', error.response?.data);
      throw new BadRequestException('Failed to get YouTube channel info');
    }
  }

  /**
   * Get recent videos from channel's uploads playlist
   */
  async getRecentVideos(accessToken: string, uploadsPlaylistId?: string): Promise<YouTubeVideoInfo[]> {
    if (!uploadsPlaylistId) return [];

    try {
      // Get playlist items (recent uploads)
      const playlistResponse = await axios.get(`${this.apiUrl}/playlistItems`, {
        params: {
          part: 'snippet,contentDetails',
          playlistId: uploadsPlaylistId,
          maxResults: 10,
        },
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      const videoIds = playlistResponse.data.items
        ?.map((item: any) => item.contentDetails.videoId)
        .join(',');

      if (!videoIds) return [];

      // Get video statistics
      const videosResponse = await axios.get(`${this.apiUrl}/videos`, {
        params: {
          part: 'snippet,statistics,contentDetails',
          id: videoIds,
        },
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      return videosResponse.data.items?.map((video: any) => ({
        id: video.id,
        title: video.snippet.title,
        publishedAt: video.snippet.publishedAt,
        thumbnailUrl: video.snippet.thumbnails?.medium?.url || video.snippet.thumbnails?.default?.url,
        viewCount: parseInt(video.statistics.viewCount) || 0,
        likeCount: parseInt(video.statistics.likeCount) || 0,
        commentCount: parseInt(video.statistics.commentCount) || 0,
        duration: video.contentDetails.duration,
      })) || [];
    } catch (error) {
      this.logger.warn('Failed to fetch recent videos', error.response?.data);
      return [];
    }
  }

  /**
   * Calculate token expiry date
   */
  calculateTokenExpiry(expiresIn: number): Date {
    return new Date(Date.now() + expiresIn * 1000);
  }
}
