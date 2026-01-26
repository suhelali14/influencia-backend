import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import {
  IPlatformApiService,
  PlatformMetrics,
  PlatformProfile,
} from './platform-api.interface';

/**
 * TikTok API Service
 * Fetches metrics and insights from TikTok API
 */
@Injectable()
export class TikTokApiService implements IPlatformApiService {
  private readonly logger = new Logger(TikTokApiService.name);
  private readonly apiUrl = 'https://open.tiktokapis.com/v2';

  constructor(private configService: ConfigService) {}

  /**
   * Get user profile information
   */
  async getProfile(accessToken: string): Promise<PlatformProfile> {
    try {
      const fields = [
        'open_id',
        'union_id',
        'avatar_url',
        'avatar_url_100',
        'display_name',
        'bio_description',
        'profile_deep_link',
        'is_verified',
        'username',
      ].join(',');

      const response = await axios.get(`${this.apiUrl}/user/info/`, {
        params: { fields },
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (response.data.error?.code && response.data.error.code !== 'ok') {
        throw new BadRequestException(response.data.error.message || 'TikTok API error');
      }

      const user = response.data.data?.user;
      if (!user) {
        throw new BadRequestException('No TikTok user data returned');
      }

      return {
        platform_user_id: user.open_id,
        username: user.username || user.display_name,
        display_name: user.display_name,
        profile_picture_url: user.avatar_url || user.avatar_url_100,
        bio: user.bio_description,
        is_verified: user.is_verified,
      };
    } catch (error) {
      this.logger.error('Failed to get TikTok profile', error.response?.data);
      throw new BadRequestException('Failed to get TikTok profile');
    }
  }

  /**
   * Get platform metrics
   */
  async getMetrics(accessToken: string, userId?: string): Promise<PlatformMetrics> {
    try {
      // Get user stats
      const statsFields = [
        'open_id',
        'follower_count',
        'following_count',
        'likes_count',
        'video_count',
      ].join(',');

      const userResponse = await axios.get(`${this.apiUrl}/user/info/`, {
        params: { fields: statsFields },
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (userResponse.data.error?.code && userResponse.data.error.code !== 'ok') {
        throw new BadRequestException(userResponse.data.error.message || 'TikTok API error');
      }

      const user = userResponse.data.data?.user;
      if (!user) {
        throw new BadRequestException('No TikTok user data returned');
      }

      const followerCount = user.follower_count || 0;
      const videoCount = user.video_count || 0;
      const totalLikes = user.likes_count || 0;

      // Get recent videos for detailed engagement calculation
      let avgViews = 0;
      let avgLikes = 0;
      let avgComments = 0;
      let avgShares = 0;
      let analyzedVideos = 0;

      try {
        const videosResponse = await axios.post(
          `${this.apiUrl}/video/list/`,
          {
            max_count: 20,
          },
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
            params: {
              fields: 'id,create_time,view_count,like_count,comment_count,share_count',
            },
          }
        );

        const videos = videosResponse.data.data?.videos || [];
        analyzedVideos = videos.length;

        if (analyzedVideos > 0) {
          let totalViews = 0;
          let totalVideoLikes = 0;
          let totalComments = 0;
          let totalShares = 0;

          for (const video of videos) {
            totalViews += video.view_count || 0;
            totalVideoLikes += video.like_count || 0;
            totalComments += video.comment_count || 0;
            totalShares += video.share_count || 0;
          }

          avgViews = totalViews / analyzedVideos;
          avgLikes = totalVideoLikes / analyzedVideos;
          avgComments = totalComments / analyzedVideos;
          avgShares = totalShares / analyzedVideos;
        }
      } catch (videoError) {
        this.logger.warn('Failed to get TikTok videos for metrics', videoError.message);
        // Fall back to estimated engagement from total likes
        if (videoCount > 0) {
          avgLikes = totalLikes / videoCount;
        }
      }

      // Calculate engagement rate
      // TikTok engagement = (likes + comments + shares) / views * 100
      // Or if views not available: (likes + comments) / followers * 100
      let engagementRate = 0;
      if (avgViews > 0) {
        engagementRate = ((avgLikes + avgComments + avgShares) / avgViews) * 100;
      } else if (followerCount > 0) {
        engagementRate = ((avgLikes + avgComments) / followerCount) * 100;
      }

      return {
        followers_count: followerCount,
        following_count: user.following_count || 0,
        posts_count: videoCount,
        engagement_rate: Math.round(engagementRate * 100) / 100,
        avg_likes_per_post: Math.round(avgLikes),
        avg_comments_per_post: Math.round(avgComments),
        avg_views_per_post: Math.round(avgViews),
        avg_shares_per_post: Math.round(avgShares),
        total_likes: totalLikes,
        platform_specific: {
          videos_analyzed: analyzedVideos,
        },
      };
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      this.logger.error('Failed to get TikTok metrics', error.response?.data);
      throw new BadRequestException('Failed to get TikTok metrics');
    }
  }

  /**
   * Get recent videos
   */
  async getRecentContent(accessToken: string, userId?: string, limit: number = 12): Promise<any[]> {
    try {
      const response = await axios.post(
        `${this.apiUrl}/video/list/`,
        {
          max_count: limit,
        },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          params: {
            fields: 'id,create_time,cover_image_url,share_url,video_description,duration,title,view_count,like_count,comment_count,share_count',
          },
        }
      );

      if (response.data.error?.code && response.data.error.code !== 'ok') {
        throw new BadRequestException(response.data.error.message || 'TikTok API error');
      }

      return response.data.data?.videos || [];
    } catch (error) {
      this.logger.error('Failed to get TikTok content', error.response?.data);
      return [];
    }
  }
}
