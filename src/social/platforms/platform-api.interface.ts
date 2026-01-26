/**
 * Platform API Interface
 * Defines the common interface for all social platform API services
 */
export interface PlatformMetrics {
  // Basic metrics
  followers_count: number;
  following_count?: number;
  posts_count: number;
  
  // Engagement metrics
  engagement_rate: number;
  avg_likes_per_post: number;
  avg_comments_per_post: number;
  avg_views_per_post?: number;
  avg_shares_per_post?: number;
  
  // Reach metrics (last 30 days)
  total_impressions?: number;
  total_reach?: number;
  profile_views?: number;
  
  // Additional metrics
  total_likes?: number;
  total_views?: number;
  total_comments?: number;
  
  // Platform-specific
  platform_specific?: Record<string, any>;
}

export interface AudienceDemographics {
  age_ranges?: { range: string; percentage: number }[];
  gender?: { gender: string; percentage: number }[];
  top_countries?: { country: string; percentage: number }[];
  top_cities?: { city: string; percentage: number }[];
}

export interface PlatformProfile {
  platform_user_id: string;
  username: string;
  display_name?: string;
  profile_picture_url?: string;
  bio?: string;
  website?: string;
  is_verified?: boolean;
  account_type?: string;
}

export interface IPlatformApiService {
  /**
   * Get user profile information
   */
  getProfile(accessToken: string): Promise<PlatformProfile>;
  
  /**
   * Get platform metrics
   */
  getMetrics(accessToken: string, userId?: string): Promise<PlatformMetrics>;
  
  /**
   * Get audience demographics (if available)
   */
  getAudienceDemographics?(accessToken: string, userId?: string): Promise<AudienceDemographics>;
  
  /**
   * Get recent posts/content
   */
  getRecentContent?(accessToken: string, userId?: string, limit?: number): Promise<any[]>;
}

export interface SyncResult {
  success: boolean;
  platform: string;
  metrics?: PlatformMetrics;
  profile?: PlatformProfile;
  error?: string;
  synced_at: Date;
}
