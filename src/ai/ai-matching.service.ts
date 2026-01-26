/**
 * AI Matching Service
 * Integrates with ML API for intelligent creator-campaign matching
 */

import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

/**
 * FastAPI CreatorProfile schema - matches api_server.py
 * All fields must match Python Pydantic model exactly
 */
export interface CreatorProfile {
  creator_id: number; // int, not UUID string
  bio?: string;
  categories: string[]; // List[str], not comma-separated string
  platforms: string[]; // List[str], not comma-separated string
  followers: number; // Not follower_count!
  engagement_rate: number;
  tier?: string; // 'nano', 'micro', 'mid', 'macro', 'mega'
  total_campaigns?: number;
  successful_campaigns?: number;
  success_rate?: number;
  overall_rating?: number;
  total_earnings?: number;
  audience_age_18_24?: number;
  audience_age_25_34?: number;
  audience_female_pct?: number;
}

/**
 * FastAPI CampaignDetails schema - matches api_server.py
 * All fields must match Python Pydantic model exactly
 */
export interface CampaignDetails {
  campaign_id: number; // int, not UUID string
  title: string;
  description?: string;
  category: string;
  platform: string;
  industry?: string;
  budget: number;
  duration_days: number;
  deliverables: string[]; // List[str], not comma-separated string
  min_followers: number;
  min_engagement: number;
  target_age_group?: string;
  target_gender?: string;
}

export interface MatchPrediction {
  match_score: number;
  confidence: number;
  model_scores?: {
    semantic: number;
    requirements: number;
    experience: number;
  };
  explanation?: string;
}

@Injectable()
export class AiMatchingService {
  private readonly logger = new Logger(AiMatchingService.name);
  private readonly mlApiUrl: string;
  private readonly timeout = 30000; // 30 seconds

  constructor(private configService: ConfigService) {
    this.mlApiUrl = this.configService.get<string>('ML_API_URL', 'http://localhost:5001');
    this.logger.log(`ML API configured at: ${this.mlApiUrl}`);
  }

  /**
   * Get match score for a creator-campaign pair
   */
  async getMatchScore(
    creator: CreatorProfile,
    campaign: CampaignDetails,
  ): Promise<MatchPrediction> {
    try {
      const requestPayload = { creator, campaign };
      
      // Log detailed request for debugging
      this.logger.debug(`📤 ML API Request:
        Creator ID: ${creator.creator_id} (type: ${typeof creator.creator_id})
        Categories: ${JSON.stringify(creator.categories)} (type: ${typeof creator.categories})
        Platforms: ${JSON.stringify(creator.platforms)} (type: ${typeof creator.platforms})
        Followers: ${creator.followers} (type: ${typeof creator.followers})
        Campaign ID: ${campaign.campaign_id} (type: ${typeof campaign.campaign_id})
        Deliverables: ${JSON.stringify(campaign.deliverables)} (type: ${typeof campaign.deliverables})
      `);

      const response = await axios.post(
        `${this.mlApiUrl}/predict`,
        requestPayload,
        {
          timeout: this.timeout,
          headers: {
            'Content-Type': 'application/json',
          },
        },
      );

      this.logger.log(`✅ ML API Success: score=${response.data.match_score}, confidence=${response.data.confidence}`);
      return response.data;
    } catch (error) {
      this.logger.error(`❌ ML API prediction failed: ${error.message}`);
      if (error.response?.data) {
        this.logger.error(`Response data: ${JSON.stringify(error.response.data)}`);
      }
      
      // Fallback to basic matching if ML API is unavailable
      this.logger.warn('⚠️ ML API unavailable, using fallback predictions');
      return this.fallbackMatching(creator, campaign);
    }
  }

  /**
   * Get ranked list of creators for a campaign
   */
  async rankCreatorsForCampaign(
    creators: CreatorProfile[],
    campaign: CampaignDetails,
    topK: number = 20,
  ): Promise<Array<CreatorProfile & MatchPrediction>> {
    try {
      const response = await axios.post(
        `${this.mlApiUrl}/batch_predict`,
        {
          creators,
          campaign,
          top_k: topK,
        },
        {
          timeout: this.timeout * 2, // Longer timeout for batch
          headers: {
            'Content-Type': 'application/json',
          },
        },
      );

      return response.data.ranked_creators || [];
    } catch (error) {
      this.logger.error(`ML API batch prediction failed: ${error.message}`);
      
      // Fallback: rank using basic matching
      const scoredCreators = await Promise.all(
        creators.map(async (creator) => {
          const prediction = await this.getMatchScore(creator, campaign);
          return { ...creator, ...prediction };
        }),
      );

      return scoredCreators
        .sort((a, b) => b.match_score - a.match_score)
        .slice(0, topK);
    }
  }

  /**
   * Get explanation for a match
   */
  async explainMatch(
    creator: CreatorProfile,
    campaign: CampaignDetails,
  ): Promise<any> {
    try {
      const response = await axios.post(
        `${this.mlApiUrl}/explain`,
        {
          creator,
          campaign,
        },
        {
          timeout: this.timeout,
          headers: {
            'Content-Type': 'application/json',
          },
        },
      );

      return response.data;
    } catch (error) {
      this.logger.error(`ML API explanation failed: ${error.message}`);
      throw new HttpException(
        'Failed to generate match explanation',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
  }

  /**
   * Check ML API health
   */
  async checkHealth(): Promise<boolean> {
    try {
      const response = await axios.get(`${this.mlApiUrl}/health`, {
        timeout: 5000,
      });
      return response.data.status === 'healthy';
    } catch (error) {
      this.logger.warn(`ML API health check failed: ${error.message}`);
      return false;
    }
  }

  /**
   * Fallback matching algorithm when ML API is unavailable
   * Uses the new CreatorProfile interface (arrays, not strings)
   */
  private fallbackMatching(
    creator: CreatorProfile,
    campaign: CampaignDetails,
  ): MatchPrediction {
    let score = 0;
    
    // Category match (40%)
    const creatorCategories = creator.categories?.map(c => c.toLowerCase()) || [];
    const campaignCategory = campaign.category?.toLowerCase() || '';
    if (creatorCategories.includes(campaignCategory)) {
      score += 0.4;
    }

    // Platform match (20%)
    const creatorPlatforms = creator.platforms?.map(p => p.toLowerCase()) || [];
    const campaignPlatform = campaign.platform?.toLowerCase() || '';
    if (creatorPlatforms.includes(campaignPlatform)) {
      score += 0.2;
    }

    // Follower requirement (20%) - now using 'followers' field
    if (creator.followers >= campaign.min_followers) {
      score += 0.2;
    }

    // Engagement requirement (20%)
    if (creator.engagement_rate >= campaign.min_engagement) {
      score += 0.2;
    }

    return {
      match_score: Math.min(score, 1.0),
      confidence: 0.5, // Lower confidence for fallback
      explanation: 'Basic matching (ML API unavailable)',
    };
  }

  /**
   * Convert UUID to integer hash for ML API
   * FastAPI expects int, not UUID string
   */
  private uuidToInt(uuid: string): number {
    // Use first 8 chars of UUID hex, convert to int (max: 4294967295)
    const hex = uuid.replace(/-/g, '').substring(0, 8);
    return parseInt(hex, 16);
  }

  /**
   * Convert database user to ML API creator format
   * Matches FastAPI CreatorProfile schema exactly
   */
  formatCreatorForML(creator: any, socialAccounts: any[]): CreatorProfile {
    // Calculate total followers across all platforms
    const totalFollowers = socialAccounts.length > 0
      ? socialAccounts.reduce((sum, acc) => sum + (acc.followers || 0), 0)
      : (creator.estimated_followers || 1000);
    
    // Calculate average engagement rate
    const avgEngagementRate = socialAccounts.length > 0
      ? socialAccounts.reduce((sum, acc) => sum + (acc.engagement_rate || 0), 0) / socialAccounts.length
      : (creator.engagement_rate || 5.0);

    // Parse categories (handle both array and string formats)
    let categories: string[] = [];
    if (Array.isArray(creator.categories)) {
      categories = creator.categories;
    } else if (typeof creator.categories === 'string' && creator.categories) {
      categories = creator.categories.split(',').map(c => c.trim()).filter(c => c);
    }
    if (categories.length === 0) categories = ['General'];

    // Parse platforms from social accounts - MUST BE ARRAY
    const platforms = socialAccounts.length > 0
      ? socialAccounts.map(s => s.platform?.toLowerCase() || 'instagram')
      : ['instagram'];

    // Determine tier based on followers
    let tier = 'micro';
    if (totalFollowers >= 1000000) tier = 'mega';
    else if (totalFollowers >= 100000) tier = 'macro';
    else if (totalFollowers >= 10000) tier = 'mid';
    else tier = 'nano';

    return {
      creator_id: this.uuidToInt(creator.id), // FastAPI expects int
      bio: creator.bio || '',
      categories, // FastAPI expects List[str]
      platforms, // FastAPI expects List[str]
      followers: totalFollowers, // FastAPI field name is 'followers'
      engagement_rate: avgEngagementRate,
      tier,
      total_campaigns: creator.total_campaigns || 0,
      successful_campaigns: creator.successful_campaigns || Math.floor((creator.total_campaigns || 0) * 0.8),
      success_rate: creator.success_rate || (creator.total_campaigns > 0 ? 0.8 : 0),
      overall_rating: parseFloat(creator.overall_rating) || 4.0,
      total_earnings: creator.total_earnings || 0,
      audience_age_18_24: creator.audience_age_18_24 || 40,
      audience_age_25_34: creator.audience_age_25_34 || 35,
      audience_female_pct: creator.audience_female_pct || 50,
    };
  }

  /**
   * Convert database campaign to ML API format
   * Matches FastAPI CampaignDetails schema exactly
   */
  formatCampaignForML(campaign: any): CampaignDetails {
    // Calculate duration in days
    const duration = campaign.duration || (campaign.end_date && campaign.start_date
      ? Math.ceil((new Date(campaign.end_date).getTime() - new Date(campaign.start_date).getTime()) / (1000 * 60 * 60 * 24))
      : 30);

    // Parse deliverables - MUST BE ARRAY
    let deliverables: string[] = [];
    if (Array.isArray(campaign.deliverables)) {
      deliverables = campaign.deliverables;
    } else if (typeof campaign.deliverables === 'string' && campaign.deliverables) {
      deliverables = campaign.deliverables.split(',').map(d => d.trim()).filter(d => d);
    }
    if (deliverables.length === 0) deliverables = ['1 Post'];

    return {
      campaign_id: this.uuidToInt(campaign.id), // FastAPI expects int
      title: campaign.title || 'Campaign',
      description: campaign.description || '',
      category: campaign.category || 'General',
      platform: campaign.platform || 'Instagram',
      industry: campaign.brand?.industry || campaign.industry || '',
      budget: parseFloat(campaign.budget) || 10000,
      duration_days: duration,
      deliverables, // FastAPI expects List[str]
      min_followers: campaign.requirements?.min_followers || campaign.min_followers || 1000,
      min_engagement: campaign.requirements?.min_engagement || campaign.min_engagement || 2.0,
      target_age_group: campaign.target_audience?.age_range || campaign.target_age || '18-34',
      target_gender: campaign.target_audience?.gender || campaign.target_gender || 'All',
    };
  }
}
