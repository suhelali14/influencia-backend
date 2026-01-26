import { Injectable, Logger } from '@nestjs/common';
import { PlatformMetrics, SyncResult } from '../platforms/platform-api.interface';
import { SocialPlatform } from '../entities/social-account.entity';

export interface NormalizedMetrics {
  // Account Info
  platform: SocialPlatform;
  platform_user_id: string;
  username: string;
  
  // Core Metrics
  followers_count: number;
  following_count: number;
  posts_count: number;
  
  // Engagement Metrics
  engagement_rate: number;
  avg_likes_per_post: number;
  avg_comments_per_post: number;
  avg_views_per_post: number;
  avg_shares_per_post: number;
  
  // Reach Metrics
  total_impressions: number;
  total_reach: number;
  profile_views: number;
  
  // Totals
  total_likes: number;
  total_views: number;
  total_comments: number;
  
  // Growth & Trends
  follower_growth_rate: number;
  engagement_trend: 'up' | 'stable' | 'down';
  
  // Quality Score (calculated)
  quality_score: number;
  
  // Timestamps
  last_synced_at: Date;
  data_freshness: 'fresh' | 'stale' | 'expired';
}

export interface AggregatedStats {
  total_followers: number;
  total_reach: number;
  avg_engagement_rate: number;
  weighted_engagement_rate: number;
  platforms_connected: number;
  primary_platform: SocialPlatform | null;
  overall_quality_score: number;
  by_platform: Record<SocialPlatform, NormalizedMetrics>;
}

/**
 * Metrics Normalizer Service
 * Normalizes metrics from different platforms into a unified format
 */
@Injectable()
export class MetricsNormalizerService {
  private readonly logger = new Logger(MetricsNormalizerService.name);

  /**
   * Normalize platform-specific metrics to a unified format
   */
  normalize(
    platform: SocialPlatform,
    platformUserId: string,
    username: string,
    rawMetrics: PlatformMetrics,
    previousMetrics?: NormalizedMetrics,
  ): NormalizedMetrics {
    // Calculate quality score (0-100)
    const qualityScore = this.calculateQualityScore(platform, rawMetrics);

    // Calculate follower growth rate
    let followerGrowthRate = 0;
    if (previousMetrics && previousMetrics.followers_count > 0) {
      followerGrowthRate = 
        ((rawMetrics.followers_count - previousMetrics.followers_count) / 
        previousMetrics.followers_count) * 100;
    }

    // Determine engagement trend
    let engagementTrend: 'up' | 'stable' | 'down' = 'stable';
    if (previousMetrics) {
      const engagementDiff = rawMetrics.engagement_rate - previousMetrics.engagement_rate;
      if (engagementDiff > 0.5) engagementTrend = 'up';
      else if (engagementDiff < -0.5) engagementTrend = 'down';
    }

    return {
      platform,
      platform_user_id: platformUserId,
      username,
      
      // Core metrics
      followers_count: rawMetrics.followers_count || 0,
      following_count: rawMetrics.following_count || 0,
      posts_count: rawMetrics.posts_count || 0,
      
      // Engagement metrics
      engagement_rate: rawMetrics.engagement_rate || 0,
      avg_likes_per_post: rawMetrics.avg_likes_per_post || 0,
      avg_comments_per_post: rawMetrics.avg_comments_per_post || 0,
      avg_views_per_post: rawMetrics.avg_views_per_post || 0,
      avg_shares_per_post: rawMetrics.avg_shares_per_post || 0,
      
      // Reach metrics
      total_impressions: rawMetrics.total_impressions || 0,
      total_reach: rawMetrics.total_reach || 0,
      profile_views: rawMetrics.profile_views || 0,
      
      // Totals
      total_likes: rawMetrics.total_likes || 0,
      total_views: rawMetrics.total_views || 0,
      total_comments: rawMetrics.total_comments || 0,
      
      // Growth & Trends
      follower_growth_rate: Math.round(followerGrowthRate * 100) / 100,
      engagement_trend: engagementTrend,
      
      // Quality
      quality_score: qualityScore,
      
      // Timestamps
      last_synced_at: new Date(),
      data_freshness: 'fresh',
    };
  }

  /**
   * Calculate a quality score based on various factors
   * Score is 0-100
   */
  calculateQualityScore(platform: SocialPlatform, metrics: PlatformMetrics): number {
    let score = 0;
    const weights = {
      engagement: 40,      // Engagement rate importance
      followers: 20,       // Follower count importance
      consistency: 20,     // Post frequency importance
      reach: 20,           // Reach/views importance
    };

    // Engagement score (higher engagement = better)
    // Good engagement rates vary by platform:
    // Instagram: 1-3% is average, 3-6% is good, >6% is excellent
    // YouTube: 2-5% is average, 5-10% is good
    // TikTok: 5-10% is average, 10-20% is good
    const engagementBenchmarks: Record<SocialPlatform, { avg: number; good: number; excellent: number }> = {
      [SocialPlatform.INSTAGRAM]: { avg: 2, good: 4, excellent: 6 },
      [SocialPlatform.YOUTUBE]: { avg: 3, good: 6, excellent: 10 },
      [SocialPlatform.TIKTOK]: { avg: 6, good: 12, excellent: 18 },
      [SocialPlatform.TWITTER]: { avg: 1, good: 2, excellent: 4 },
    };

    const benchmark = engagementBenchmarks[platform] || engagementBenchmarks[SocialPlatform.INSTAGRAM];
    
    if (metrics.engagement_rate >= benchmark.excellent) {
      score += weights.engagement;
    } else if (metrics.engagement_rate >= benchmark.good) {
      score += weights.engagement * 0.8;
    } else if (metrics.engagement_rate >= benchmark.avg) {
      score += weights.engagement * 0.5;
    } else {
      score += weights.engagement * (metrics.engagement_rate / benchmark.avg) * 0.5;
    }

    // Follower score (log scale to not over-favor mega influencers)
    // 1K = 10%, 10K = 40%, 100K = 70%, 1M = 100%
    const followerScore = Math.min(
      Math.log10(Math.max(metrics.followers_count, 1)) / 6, // log10(1M) = 6
      1
    ) * weights.followers;
    score += followerScore;

    // Consistency score (based on post count - assuming more posts = more consistent)
    // 10+ posts = full score
    const consistencyScore = Math.min(metrics.posts_count / 10, 1) * weights.consistency;
    score += consistencyScore;

    // Reach score (based on avg views relative to followers)
    if (metrics.avg_views_per_post && metrics.followers_count > 0) {
      const viewsToFollowersRatio = metrics.avg_views_per_post / metrics.followers_count;
      // Good ratio is 10-30% of followers see each post
      const reachScore = Math.min(viewsToFollowersRatio / 0.3, 1) * weights.reach;
      score += reachScore;
    } else if (metrics.total_impressions && metrics.followers_count > 0) {
      const reachRatio = metrics.total_impressions / (metrics.followers_count * 30); // Assume 30-day period
      const reachScore = Math.min(reachRatio / 0.3, 1) * weights.reach;
      score += reachScore;
    } else {
      // If no reach data, give partial score based on engagement
      score += weights.reach * 0.3;
    }

    return Math.round(Math.min(score, 100));
  }

  /**
   * Aggregate metrics from multiple platforms
   */
  aggregate(platformMetrics: NormalizedMetrics[]): AggregatedStats {
    if (platformMetrics.length === 0) {
      return {
        total_followers: 0,
        total_reach: 0,
        avg_engagement_rate: 0,
        weighted_engagement_rate: 0,
        platforms_connected: 0,
        primary_platform: null,
        overall_quality_score: 0,
        by_platform: {} as Record<SocialPlatform, NormalizedMetrics>,
      };
    }

    const byPlatform: Record<string, NormalizedMetrics> = {};
    let totalFollowers = 0;
    let totalReach = 0;
    let totalEngagement = 0;
    let weightedEngagement = 0;
    let totalQualityScore = 0;

    for (const metrics of platformMetrics) {
      byPlatform[metrics.platform] = metrics;
      totalFollowers += metrics.followers_count;
      totalReach += metrics.total_reach || metrics.total_impressions || 0;
      totalEngagement += metrics.engagement_rate;
      weightedEngagement += metrics.engagement_rate * metrics.followers_count;
      totalQualityScore += metrics.quality_score;
    }

    // Find primary platform (highest followers)
    const primaryPlatform = platformMetrics.reduce(
      (max, m) => (m.followers_count > max.followers_count ? m : max),
      platformMetrics[0]
    ).platform;

    return {
      total_followers: totalFollowers,
      total_reach: totalReach,
      avg_engagement_rate: Math.round((totalEngagement / platformMetrics.length) * 100) / 100,
      weighted_engagement_rate: totalFollowers > 0 
        ? Math.round((weightedEngagement / totalFollowers) * 100) / 100 
        : 0,
      platforms_connected: platformMetrics.length,
      primary_platform: primaryPlatform,
      overall_quality_score: Math.round(totalQualityScore / platformMetrics.length),
      by_platform: byPlatform as Record<SocialPlatform, NormalizedMetrics>,
    };
  }

  /**
   * Determine data freshness based on last sync time
   */
  getDataFreshness(lastSyncedAt: Date | null): 'fresh' | 'stale' | 'expired' {
    if (!lastSyncedAt) return 'expired';

    const hoursSinceSync = (Date.now() - lastSyncedAt.getTime()) / (1000 * 60 * 60);

    if (hoursSinceSync < 6) return 'fresh';      // Less than 6 hours
    if (hoursSinceSync < 24) return 'stale';     // Less than 24 hours
    return 'expired';                             // More than 24 hours
  }
}
