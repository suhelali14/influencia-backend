import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import {
  IPlatformApiService,
  PlatformMetrics,
  PlatformProfile,
  AudienceDemographics,
} from './platform-api.interface';

/**
 * YouTube API Service
 * Fetches metrics and analytics from YouTube Data API v3
 */
@Injectable()
export class YouTubeApiService implements IPlatformApiService {
  private readonly logger = new Logger(YouTubeApiService.name);
  private readonly apiUrl = 'https://www.googleapis.com/youtube/v3';
  private readonly analyticsUrl = 'https://youtubeanalytics.googleapis.com/v2';

  constructor(private configService: ConfigService) {}

  /**
   * Get channel profile information
   */
  async getProfile(accessToken: string): Promise<PlatformProfile> {
    try {
      const response = await axios.get(`${this.apiUrl}/channels`, {
        params: {
          part: 'snippet,statistics',
          mine: true,
        },
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      const channel = response.data.items?.[0];
      if (!channel) {
        throw new BadRequestException('No YouTube channel found');
      }

      return {
        platform_user_id: channel.id,
        username: channel.snippet.customUrl || channel.snippet.title,
        display_name: channel.snippet.title,
        profile_picture_url: channel.snippet.thumbnails?.high?.url || channel.snippet.thumbnails?.default?.url,
        bio: channel.snippet.description,
        is_verified: false, // YouTube doesn't expose this easily
      };
    } catch (error) {
      this.logger.error('Failed to get YouTube profile', error.response?.data);
      throw new BadRequestException('Failed to get YouTube profile');
    }
  }

  /**
   * Get channel metrics
   */
  async getMetrics(accessToken: string, channelId?: string): Promise<PlatformMetrics> {
    try {
      // Get channel statistics
      const channelResponse = await axios.get(`${this.apiUrl}/channels`, {
        params: {
          part: 'statistics,snippet',
          mine: true,
        },
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      const channel = channelResponse.data.items?.[0];
      if (!channel) {
        throw new BadRequestException('No YouTube channel found');
      }

      const stats = channel.statistics;
      const subscriberCount = parseInt(stats.subscriberCount) || 0;
      const videoCount = parseInt(stats.videoCount) || 0;
      const totalViews = parseInt(stats.viewCount) || 0;

      // Get recent videos for engagement calculation
      const videosResponse = await axios.get(`${this.apiUrl}/search`, {
        params: {
          part: 'id',
          forMine: true,
          type: 'video',
          maxResults: 25,
          order: 'date',
        },
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      let avgViews = 0;
      let avgLikes = 0;
      let avgComments = 0;
      let totalVideoLikes = 0;
      let totalVideoComments = 0;
      let analyzedVideos = 0;

      const videoIds = videosResponse.data.items?.map((v: any) => v.id.videoId).filter(Boolean) || [];

      if (videoIds.length > 0) {
        const videoStatsResponse = await axios.get(`${this.apiUrl}/videos`, {
          params: {
            part: 'statistics',
            id: videoIds.join(','),
          },
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        });

        const videoStats = videoStatsResponse.data.items || [];
        analyzedVideos = videoStats.length;

        for (const video of videoStats) {
          const vStats = video.statistics;
          totalVideoLikes += parseInt(vStats.likeCount) || 0;
          totalVideoComments += parseInt(vStats.commentCount) || 0;
          avgViews += parseInt(vStats.viewCount) || 0;
        }

        if (analyzedVideos > 0) {
          avgViews = avgViews / analyzedVideos;
          avgLikes = totalVideoLikes / analyzedVideos;
          avgComments = totalVideoComments / analyzedVideos;
        }
      }

      // Calculate engagement rate (likes + comments) / subscribers * 100
      const avgEngagement = avgLikes + avgComments;
      const engagementRate = subscriberCount > 0 
        ? (avgEngagement / subscriberCount) * 100 
        : 0;

      return {
        followers_count: subscriberCount,
        posts_count: videoCount,
        engagement_rate: Math.round(engagementRate * 100) / 100,
        avg_likes_per_post: Math.round(avgLikes),
        avg_comments_per_post: Math.round(avgComments),
        avg_views_per_post: Math.round(avgViews),
        total_views: totalViews,
        total_likes: totalVideoLikes,
        total_comments: totalVideoComments,
        platform_specific: {
          channel_id: channel.id,
          channel_title: channel.snippet.title,
          videos_analyzed: analyzedVideos,
          hidden_subscriber_count: stats.hiddenSubscriberCount,
        },
      };
    } catch (error) {
      this.logger.error('Failed to get YouTube metrics', error.response?.data);
      throw new BadRequestException('Failed to get YouTube metrics');
    }
  }

  /**
   * Get YouTube Analytics (requires yt-analytics scope)
   */
  async getAnalytics(accessToken: string, channelId: string, startDate: string, endDate: string): Promise<any> {
    try {
      const response = await axios.get(`${this.analyticsUrl}/reports`, {
        params: {
          ids: `channel==${channelId}`,
          startDate: startDate,
          endDate: endDate,
          metrics: 'views,estimatedMinutesWatched,averageViewDuration,likes,shares,comments,subscribersGained,subscribersLost',
          dimensions: 'day',
          sort: 'day',
        },
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      return response.data;
    } catch (error) {
      this.logger.warn('Failed to get YouTube analytics', error.response?.data);
      return null;
    }
  }

  /**
   * Get audience demographics from YouTube Analytics
   */
  async getAudienceDemographics(accessToken: string, channelId?: string): Promise<AudienceDemographics> {
    try {
      // Get channel ID if not provided
      if (!channelId) {
        const profile = await this.getProfile(accessToken);
        channelId = profile.platform_user_id;
      }

      const endDate = new Date().toISOString().split('T')[0];
      const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      // Get demographics by age and gender
      const demographicsResponse = await axios.get(`${this.analyticsUrl}/reports`, {
        params: {
          ids: `channel==${channelId}`,
          startDate: startDate,
          endDate: endDate,
          metrics: 'viewerPercentage',
          dimensions: 'ageGroup,gender',
        },
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      // Get demographics by country
      const countryResponse = await axios.get(`${this.analyticsUrl}/reports`, {
        params: {
          ids: `channel==${channelId}`,
          startDate: startDate,
          endDate: endDate,
          metrics: 'views',
          dimensions: 'country',
          sort: '-views',
          maxResults: 10,
        },
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      const demographics: AudienceDemographics = {};

      // Process age/gender data
      if (demographicsResponse.data.rows) {
        const genderTotals: Record<string, number> = {};
        const ageTotals: Record<string, number> = {};

        for (const row of demographicsResponse.data.rows) {
          const [ageGroup, gender, percentage] = row;
          genderTotals[gender] = (genderTotals[gender] || 0) + percentage;
          ageTotals[ageGroup] = (ageTotals[ageGroup] || 0) + percentage;
        }

        demographics.gender = Object.entries(genderTotals).map(([gender, percentage]) => ({
          gender: gender === 'male' ? 'Male' : gender === 'female' ? 'Female' : 'Other',
          percentage: Math.round(percentage * 100) / 100,
        }));

        demographics.age_ranges = Object.entries(ageTotals).map(([range, percentage]) => ({
          range,
          percentage: Math.round(percentage * 100) / 100,
        }));
      }

      // Process country data
      if (countryResponse.data.rows) {
        const totalViews = countryResponse.data.rows.reduce((sum: number, row: any) => sum + row[1], 0);
        demographics.top_countries = countryResponse.data.rows.map((row: any) => ({
          country: row[0],
          percentage: totalViews > 0 ? Math.round((row[1] / totalViews) * 10000) / 100 : 0,
        }));
      }

      return demographics;
    } catch (error) {
      this.logger.warn('Failed to get YouTube demographics', error.response?.data);
      return {};
    }
  }

  /**
   * Get recent videos
   */
  async getRecentContent(accessToken: string, channelId?: string, limit: number = 12): Promise<any[]> {
    try {
      // Get recent video IDs
      const searchResponse = await axios.get(`${this.apiUrl}/search`, {
        params: {
          part: 'id,snippet',
          forMine: true,
          type: 'video',
          maxResults: limit,
          order: 'date',
        },
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      const videos = searchResponse.data.items || [];
      const videoIds = videos.map((v: any) => v.id.videoId).filter(Boolean);

      if (videoIds.length === 0) {
        return [];
      }

      // Get video statistics
      const statsResponse = await axios.get(`${this.apiUrl}/videos`, {
        params: {
          part: 'statistics,contentDetails',
          id: videoIds.join(','),
        },
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      const statsMap = new Map();
      for (const video of statsResponse.data.items || []) {
        statsMap.set(video.id, video);
      }

      // Combine data
      return videos.map((video: any) => {
        const stats = statsMap.get(video.id.videoId);
        return {
          id: video.id.videoId,
          title: video.snippet.title,
          description: video.snippet.description,
          thumbnail_url: video.snippet.thumbnails?.high?.url,
          published_at: video.snippet.publishedAt,
          view_count: parseInt(stats?.statistics?.viewCount) || 0,
          like_count: parseInt(stats?.statistics?.likeCount) || 0,
          comment_count: parseInt(stats?.statistics?.commentCount) || 0,
          duration: stats?.contentDetails?.duration,
        };
      });
    } catch (error) {
      this.logger.error('Failed to get YouTube content', error.response?.data);
      return [];
    }
  }
}
