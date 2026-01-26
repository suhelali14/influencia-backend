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
 * Instagram API Service
 * Fetches metrics and insights from Instagram Graph API
 */
@Injectable()
export class InstagramApiService implements IPlatformApiService {
  private readonly logger = new Logger(InstagramApiService.name);
  private readonly graphUrl = 'https://graph.instagram.com';
  private readonly graphFacebookUrl = 'https://graph.facebook.com/v18.0';

  constructor(private configService: ConfigService) {}

  /**
   * Get user profile information
   */
  async getProfile(accessToken: string): Promise<PlatformProfile> {
    try {
      const response = await axios.get(`${this.graphUrl}/me`, {
        params: {
          fields: 'id,username,account_type,media_count',
          access_token: accessToken,
        },
      });

      return {
        platform_user_id: response.data.id,
        username: response.data.username,
        account_type: response.data.account_type,
      };
    } catch (error) {
      this.logger.error('Failed to get Instagram profile', error.response?.data);
      throw new BadRequestException('Failed to get Instagram profile');
    }
  }

  /**
   * Get Instagram Business profile (with more metrics)
   */
  async getBusinessProfile(accessToken: string, igUserId: string): Promise<PlatformProfile> {
    try {
      const fields = [
        'id',
        'username',
        'name',
        'biography',
        'website',
        'profile_picture_url',
        'followers_count',
        'follows_count',
        'media_count',
      ].join(',');

      const response = await axios.get(`${this.graphFacebookUrl}/${igUserId}`, {
        params: {
          fields: fields,
          access_token: accessToken,
        },
      });

      return {
        platform_user_id: response.data.id,
        username: response.data.username,
        display_name: response.data.name,
        profile_picture_url: response.data.profile_picture_url,
        bio: response.data.biography,
        website: response.data.website,
        account_type: 'business',
      };
    } catch (error) {
      this.logger.error('Failed to get Instagram business profile', error.response?.data);
      throw new BadRequestException('Failed to get Instagram business profile');
    }
  }

  /**
   * Get platform metrics
   */
  async getMetrics(accessToken: string, igUserId?: string): Promise<PlatformMetrics> {
    try {
      // Get basic account info
      const profileResponse = await axios.get(`${this.graphUrl}/me`, {
        params: {
          fields: 'id,username,media_count,account_type',
          access_token: accessToken,
        },
      });

      // Get recent media for engagement calculation
      const mediaResponse = await axios.get(`${this.graphUrl}/me/media`, {
        params: {
          fields: 'id,like_count,comments_count,media_type,timestamp',
          limit: 25,
          access_token: accessToken,
        },
      });

      const media = mediaResponse.data.data || [];
      
      // Calculate engagement metrics
      const totalLikes = media.reduce((sum: number, m: any) => sum + (m.like_count || 0), 0);
      const totalComments = media.reduce((sum: number, m: any) => sum + (m.comments_count || 0), 0);
      const mediaCount = media.length;

      const avgLikes = mediaCount > 0 ? totalLikes / mediaCount : 0;
      const avgComments = mediaCount > 0 ? totalComments / mediaCount : 0;

      // Note: followers_count is only available for business/creator accounts via Graph API
      // For Basic Display API, we'll use what we can get
      
      return {
        followers_count: 0, // Will be updated if business account
        posts_count: profileResponse.data.media_count || 0,
        engagement_rate: 0, // Calculated later with followers
        avg_likes_per_post: Math.round(avgLikes),
        avg_comments_per_post: Math.round(avgComments),
        total_likes: totalLikes,
        total_comments: totalComments,
        platform_specific: {
          account_type: profileResponse.data.account_type,
          media_analyzed: mediaCount,
        },
      };
    } catch (error) {
      this.logger.error('Failed to get Instagram metrics', error.response?.data);
      throw new BadRequestException('Failed to get Instagram metrics');
    }
  }

  /**
   * Get Business account metrics (includes insights)
   */
  async getBusinessMetrics(accessToken: string, igUserId: string): Promise<PlatformMetrics> {
    try {
      // Get profile with follower count
      const profileResponse = await axios.get(`${this.graphFacebookUrl}/${igUserId}`, {
        params: {
          fields: 'followers_count,follows_count,media_count',
          access_token: accessToken,
        },
      });

      const followersCount = profileResponse.data.followers_count || 0;

      // Get insights (last 30 days)
      let insights = {
        impressions: 0,
        reach: 0,
        profile_views: 0,
      };

      try {
        const insightsResponse = await axios.get(`${this.graphFacebookUrl}/${igUserId}/insights`, {
          params: {
            metric: 'impressions,reach,profile_views',
            period: 'day',
            access_token: accessToken,
          },
        });

        for (const metric of insightsResponse.data.data || []) {
          if (metric.name === 'impressions') {
            insights.impressions = metric.values.reduce((sum: number, v: any) => sum + v.value, 0);
          }
          if (metric.name === 'reach') {
            insights.reach = metric.values.reduce((sum: number, v: any) => sum + v.value, 0);
          }
          if (metric.name === 'profile_views') {
            insights.profile_views = metric.values.reduce((sum: number, v: any) => sum + v.value, 0);
          }
        }
      } catch (insightError) {
        this.logger.warn('Failed to get insights, using defaults', insightError.message);
      }

      // Get recent media for engagement calculation
      const mediaResponse = await axios.get(`${this.graphFacebookUrl}/${igUserId}/media`, {
        params: {
          fields: 'id,like_count,comments_count,media_type',
          limit: 25,
          access_token: accessToken,
        },
      });

      const media = mediaResponse.data.data || [];
      const totalLikes = media.reduce((sum: number, m: any) => sum + (m.like_count || 0), 0);
      const totalComments = media.reduce((sum: number, m: any) => sum + (m.comments_count || 0), 0);
      const mediaCount = media.length;

      const avgLikes = mediaCount > 0 ? totalLikes / mediaCount : 0;
      const avgComments = mediaCount > 0 ? totalComments / mediaCount : 0;

      // Calculate engagement rate
      const avgEngagement = avgLikes + avgComments;
      const engagementRate = followersCount > 0 
        ? (avgEngagement / followersCount) * 100 
        : 0;

      return {
        followers_count: followersCount,
        following_count: profileResponse.data.follows_count || 0,
        posts_count: profileResponse.data.media_count || 0,
        engagement_rate: Math.round(engagementRate * 100) / 100,
        avg_likes_per_post: Math.round(avgLikes),
        avg_comments_per_post: Math.round(avgComments),
        total_impressions: insights.impressions,
        total_reach: insights.reach,
        profile_views: insights.profile_views,
        total_likes: totalLikes,
        total_comments: totalComments,
        platform_specific: {
          account_type: 'business',
          media_analyzed: mediaCount,
        },
      };
    } catch (error) {
      this.logger.error('Failed to get Instagram business metrics', error.response?.data);
      throw new BadRequestException('Failed to get Instagram business metrics');
    }
  }

  /**
   * Get audience demographics (Business/Creator accounts only)
   */
  async getAudienceDemographics(accessToken: string, igUserId: string): Promise<AudienceDemographics> {
    try {
      const response = await axios.get(`${this.graphFacebookUrl}/${igUserId}/insights`, {
        params: {
          metric: 'audience_city,audience_country,audience_gender_age',
          period: 'lifetime',
          access_token: accessToken,
        },
      });

      const demographics: AudienceDemographics = {};

      for (const metric of response.data.data || []) {
        if (metric.name === 'audience_country' && metric.values?.[0]?.value) {
          demographics.top_countries = Object.entries(metric.values[0].value)
            .map(([country, count]: [string, any]) => ({
              country,
              percentage: count,
            }))
            .sort((a, b) => b.percentage - a.percentage)
            .slice(0, 10);
        }

        if (metric.name === 'audience_city' && metric.values?.[0]?.value) {
          demographics.top_cities = Object.entries(metric.values[0].value)
            .map(([city, count]: [string, any]) => ({
              city,
              percentage: count,
            }))
            .sort((a, b) => b.percentage - a.percentage)
            .slice(0, 10);
        }

        if (metric.name === 'audience_gender_age' && metric.values?.[0]?.value) {
          const genderAge = metric.values[0].value;
          const genderTotals: Record<string, number> = {};
          const ageTotals: Record<string, number> = {};

          for (const [key, value] of Object.entries(genderAge)) {
            const [gender, age] = key.split('.');
            genderTotals[gender] = (genderTotals[gender] || 0) + (value as number);
            ageTotals[age] = (ageTotals[age] || 0) + (value as number);
          }

          demographics.gender = Object.entries(genderTotals).map(([gender, count]) => ({
            gender: gender === 'M' ? 'Male' : gender === 'F' ? 'Female' : 'Other',
            percentage: count,
          }));

          demographics.age_ranges = Object.entries(ageTotals).map(([range, count]) => ({
            range,
            percentage: count,
          }));
        }
      }

      return demographics;
    } catch (error) {
      this.logger.warn('Failed to get Instagram demographics', error.response?.data);
      return {};
    }
  }

  /**
   * Get recent media posts
   */
  async getRecentContent(accessToken: string, igUserId?: string, limit: number = 12): Promise<any[]> {
    try {
      const response = await axios.get(`${this.graphUrl}/me/media`, {
        params: {
          fields: 'id,caption,media_type,media_url,thumbnail_url,permalink,timestamp,like_count,comments_count',
          limit: limit,
          access_token: accessToken,
        },
      });

      return response.data.data || [];
    } catch (error) {
      this.logger.error('Failed to get Instagram content', error.response?.data);
      return [];
    }
  }
}
