import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, MoreThanOrEqual, LessThanOrEqual } from 'typeorm';
import { Creator } from '../creators/entities/creator.entity';
import { SocialAccount } from '../social/entities/social-account.entity';
import { Collaboration, CollaborationStatus } from '../campaigns/entities/collaboration.entity';
import { Campaign, CampaignStatus } from '../campaigns/entities/campaign.entity';
import { CreatorsService } from '../creators/creators.service';

export interface PlatformAnalytics {
  platform: string;
  followers: number;
  engagement_rate: number;
  total_views?: number;
  posts_count?: number;
  avg_likes?: number;
  avg_comments?: number;
  avg_views?: number;
  growth_percentage?: number;
  last_synced_at?: string;
  recent_videos?: any[];
  quality_score?: number;
}

export interface CampaignAnalytics {
  id: string;
  title: string;
  brand_name: string;
  status: string;
  budget: number;
  earned: number;
  start_date: string;
  end_date: string;
  deliverables_completed: number;
  deliverables_total: number;
  performance?: {
    reach?: number;
    impressions?: number;
    engagement?: number;
    clicks?: number;
  };
}

export interface OverallAnalytics {
  // Summary Stats
  total_followers: number;
  total_reach: number;
  avg_engagement_rate: number;
  platforms_connected: number;
  total_campaigns: number;
  active_campaigns: number;
  completed_campaigns: number;
  total_earnings: number;
  pending_earnings: number;
  
  // Platform breakdown
  platforms: PlatformAnalytics[];
  
  // Campaigns
  past_campaigns: CampaignAnalytics[];
  active_campaigns_list: CampaignAnalytics[];
  upcoming_campaigns: CampaignAnalytics[];
  
  // Performance metrics
  monthly_earnings: { month: string; amount: number }[];
  engagement_trend: { date: string; rate: number }[];
  followers_trend: { date: string; count: number }[];
  
  // Top performing content
  top_content: {
    platform: string;
    title: string;
    views: number;
    likes: number;
    comments: number;
    thumbnail_url?: string;
    url?: string;
  }[];
  
  // AI insights
  insights: {
    type: 'success' | 'warning' | 'info';
    message: string;
  }[];
}

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);

  constructor(
    @InjectRepository(Creator)
    private creatorsRepository: Repository<Creator>,
    @InjectRepository(SocialAccount)
    private socialAccountsRepository: Repository<SocialAccount>,
    @InjectRepository(Collaboration)
    private collaborationsRepository: Repository<Collaboration>,
    @InjectRepository(Campaign)
    private campaignsRepository: Repository<Campaign>,
    private creatorsService: CreatorsService,
  ) {}

  /**
   * Get creator ID from user ID
   */
  private async getCreatorId(userId: string): Promise<string> {
    try {
      const creator = await this.creatorsService.findByUserId(userId);
      return creator.id;
    } catch (error) {
      throw new NotFoundException('Creator profile not found');
    }
  }

  /**
   * Get comprehensive analytics for a creator
   */
  async getCreatorAnalytics(userId: string): Promise<OverallAnalytics> {
    const creatorId = await this.getCreatorId(userId);
    this.logger.log(`📊 Getting comprehensive analytics for creator ${creatorId}`);

    // Fetch all data in parallel
    const [
      socialAccounts,
      collaborations,
      creator,
    ] = await Promise.all([
      this.socialAccountsRepository.find({
        where: { creator_id: creatorId, is_connected: true },
      }),
      this.collaborationsRepository.find({
        where: { creator_id: creatorId },
        relations: ['campaign', 'campaign.brand'],
        order: { created_at: 'DESC' },
      }),
      this.creatorsRepository.findOne({ where: { id: creatorId } }),
    ]);

    // Calculate platform analytics
    const platforms = this.calculatePlatformAnalytics(socialAccounts);
    
    // Calculate campaign analytics
    const { past, active, upcoming } = this.categorizeCampaigns(collaborations);
    
    // Calculate summary stats
    const totalFollowers = platforms.reduce((sum, p) => sum + p.followers, 0);
    const avgEngagement = platforms.length > 0 
      ? platforms.reduce((sum, p) => sum + p.engagement_rate, 0) / platforms.length 
      : 0;
    
    // Calculate earnings
    const totalEarnings = collaborations
      .filter(c => c.status === CollaborationStatus.COMPLETED)
      .reduce((sum, c) => sum + Number(c.proposed_budget || 0), 0);
    
    const pendingEarnings = collaborations
      .filter(c => c.status === CollaborationStatus.ACCEPTED)
      .reduce((sum, c) => sum + Number(c.proposed_budget || 0), 0);

    // Get top content from social accounts
    const topContent = this.extractTopContent(socialAccounts);
    
    // Generate AI insights
    const insights = this.generateInsights(platforms, collaborations, totalFollowers, avgEngagement);

    // Generate trends (mock data for now, can be enhanced with historical data)
    const monthlyEarnings = this.generateMonthlyEarnings(collaborations);
    const engagementTrend = this.generateEngagementTrend(platforms);
    const followersTrend = this.generateFollowersTrend(platforms, totalFollowers);

    return {
      total_followers: totalFollowers,
      total_reach: this.calculateTotalReach(socialAccounts),
      avg_engagement_rate: Math.round(avgEngagement * 100) / 100,
      platforms_connected: platforms.length,
      total_campaigns: collaborations.length,
      active_campaigns: active.length,
      completed_campaigns: past.filter(c => c.status === 'completed').length,
      total_earnings: totalEarnings,
      pending_earnings: pendingEarnings,
      
      platforms,
      past_campaigns: past,
      active_campaigns_list: active,
      upcoming_campaigns: upcoming,
      
      monthly_earnings: monthlyEarnings,
      engagement_trend: engagementTrend,
      followers_trend: followersTrend,
      
      top_content: topContent,
      insights,
    };
  }

  /**
   * Get platform-specific analytics
   */
  async getPlatformAnalytics(userId: string, platform: string): Promise<PlatformAnalytics> {
    const creatorId = await this.getCreatorId(userId);
    
    const account = await this.socialAccountsRepository.findOne({
      where: { creator_id: creatorId, platform: platform as any, is_connected: true },
    });

    if (!account) {
      throw new NotFoundException(`${platform} account not connected`);
    }

    return this.mapAccountToAnalytics(account);
  }

  /**
   * Get campaign analytics
   */
  async getCampaignAnalytics(userId: string, campaignId?: string): Promise<CampaignAnalytics[]> {
    const creatorId = await this.getCreatorId(userId);
    
    const whereClause: any = { creator_id: creatorId };
    if (campaignId) {
      whereClause.campaign_id = campaignId;
    }

    const collaborations = await this.collaborationsRepository.find({
      where: whereClause,
      relations: ['campaign', 'campaign.brand'],
      order: { created_at: 'DESC' },
    });

    return collaborations.map(collab => this.mapCollaborationToAnalytics(collab));
  }

  /**
   * Get earnings analytics
   */
  async getEarningsAnalytics(userId: string, period: 'week' | 'month' | 'year' | 'all' = 'all') {
    const creatorId = await this.getCreatorId(userId);
    
    let dateFilter: Date | undefined;
    const now = new Date();
    
    switch (period) {
      case 'week':
        dateFilter = new Date(now.setDate(now.getDate() - 7));
        break;
      case 'month':
        dateFilter = new Date(now.setMonth(now.getMonth() - 1));
        break;
      case 'year':
        dateFilter = new Date(now.setFullYear(now.getFullYear() - 1));
        break;
    }

    const whereClause: any = { 
      creator_id: creatorId,
      status: CollaborationStatus.COMPLETED,
    };
    
    if (dateFilter) {
      whereClause.updated_at = MoreThanOrEqual(dateFilter);
    }

    const collaborations = await this.collaborationsRepository.find({
      where: whereClause,
      relations: ['campaign', 'campaign.brand'],
      order: { updated_at: 'DESC' },
    });

    const totalEarnings = collaborations.reduce(
      (sum, c) => sum + Number(c.proposed_budget || 0), 
      0
    );

    const byBrand = this.groupEarningsByBrand(collaborations);
    const byMonth = this.groupEarningsByMonth(collaborations);

    return {
      total: totalEarnings,
      count: collaborations.length,
      average: collaborations.length > 0 ? totalEarnings / collaborations.length : 0,
      by_brand: byBrand,
      by_month: byMonth,
      recent: collaborations.slice(0, 10).map(c => ({
        campaign: c.campaign?.title,
        brand: c.campaign?.brand?.company_name,
        amount: Number(c.proposed_budget || 0),
        date: c.updated_at,
      })),
    };
  }

  // =====================================================
  // HELPER METHODS
  // =====================================================

  private calculatePlatformAnalytics(accounts: SocialAccount[]): PlatformAnalytics[] {
    return accounts.map(account => this.mapAccountToAnalytics(account));
  }

  private mapAccountToAnalytics(account: SocialAccount): PlatformAnalytics {
    const metrics = account.metrics as any || {};
    
    return {
      platform: account.platform,
      followers: account.followers_count,
      engagement_rate: Number(account.engagement_rate) || 0,
      total_views: metrics.total_views || metrics.avg_views,
      posts_count: metrics.posts,
      avg_likes: metrics.avg_likes,
      avg_comments: metrics.avg_comments,
      avg_views: metrics.avg_views,
      last_synced_at: account.last_synced_at?.toISOString(),
      recent_videos: metrics.recent_videos?.slice(0, 5),
      quality_score: metrics.quality_score,
    };
  }

  private categorizeCampaigns(collaborations: Collaboration[]): {
    past: CampaignAnalytics[];
    active: CampaignAnalytics[];
    upcoming: CampaignAnalytics[];
  } {
    const now = new Date();
    const past: CampaignAnalytics[] = [];
    const active: CampaignAnalytics[] = [];
    const upcoming: CampaignAnalytics[] = [];

    for (const collab of collaborations) {
      const analytics = this.mapCollaborationToAnalytics(collab);
      const campaign = collab.campaign;
      
      if (!campaign) continue;

      const startDate = new Date(campaign.start_date);
      const endDate = new Date(campaign.end_date);

      if (collab.status === CollaborationStatus.COMPLETED || 
          collab.status === CollaborationStatus.REJECTED ||
          endDate < now) {
        past.push(analytics);
      } else if (collab.status === CollaborationStatus.PENDING) {
        upcoming.push(analytics);
      } else if (startDate <= now && endDate >= now) {
        active.push(analytics);
      } else if (startDate > now) {
        upcoming.push(analytics);
      } else {
        active.push(analytics);
      }
    }

    return { past, active, upcoming };
  }

  private mapCollaborationToAnalytics(collab: Collaboration): CampaignAnalytics {
    const campaign = collab.campaign;
    return {
      id: collab.id,
      title: campaign?.title || 'Unknown Campaign',
      brand_name: campaign?.brand?.company_name || 'Unknown Brand',
      status: collab.status,
      budget: Number(collab.proposed_budget || 0),
      earned: Number(collab.proposed_budget || 0),
      start_date: campaign?.start_date?.toISOString() || '',
      end_date: campaign?.end_date?.toISOString() || '',
      deliverables_completed: collab.deliverables?.filter?.((d: any) => d.completed)?.length || 0,
      deliverables_total: collab.deliverables?.length || campaign?.requirements?.deliverables?.length || 0,
      performance: {
        reach: (collab.submitted_content as any)?.reach,
        impressions: (collab.submitted_content as any)?.impressions,
        engagement: (collab.submitted_content as any)?.engagement,
        clicks: (collab.submitted_content as any)?.clicks,
      },
    };
  }

  private calculateTotalReach(accounts: SocialAccount[]): number {
    return accounts.reduce((sum, account) => {
      const metrics = account.metrics as any || {};
      return sum + (metrics.total_views || metrics.avg_views || account.followers_count * 0.1);
    }, 0);
  }

  private extractTopContent(accounts: SocialAccount[]): any[] {
    const content: any[] = [];
    
    for (const account of accounts) {
      const metrics = account.metrics as any || {};
      if (metrics.recent_videos) {
        for (const video of metrics.recent_videos.slice(0, 3)) {
          content.push({
            platform: account.platform,
            title: video.title,
            views: video.view_count || video.views,
            likes: video.like_count || video.likes,
            comments: video.comment_count || video.comments,
            thumbnail_url: video.thumbnail_url,
            url: account.platform === 'youtube' 
              ? `https://youtube.com/watch?v=${video.id}`
              : null,
          });
        }
      }
    }
    
    // Sort by views and return top 6
    return content.sort((a, b) => (b.views || 0) - (a.views || 0)).slice(0, 6);
  }

  private generateInsights(
    platforms: PlatformAnalytics[], 
    collaborations: Collaboration[],
    totalFollowers: number,
    avgEngagement: number
  ): { type: 'success' | 'warning' | 'info'; message: string }[] {
    const insights: { type: 'success' | 'warning' | 'info'; message: string }[] = [];

    // Engagement insights
    if (avgEngagement >= 5) {
      insights.push({
        type: 'success',
        message: `🎉 Excellent engagement rate of ${avgEngagement.toFixed(1)}%! You're in the top 10% of creators.`,
      });
    } else if (avgEngagement >= 2) {
      insights.push({
        type: 'info',
        message: `📊 Your engagement rate of ${avgEngagement.toFixed(1)}% is above average. Keep up the good work!`,
      });
    } else if (avgEngagement > 0) {
      insights.push({
        type: 'warning',
        message: `💡 Your engagement rate of ${avgEngagement.toFixed(1)}% could be improved. Try more interactive content.`,
      });
    }

    // Platform diversity
    if (platforms.length >= 3) {
      insights.push({
        type: 'success',
        message: '🌐 Great platform diversity! Having multiple platforms increases your reach.',
      });
    } else if (platforms.length === 1) {
      insights.push({
        type: 'info',
        message: '💡 Consider connecting more platforms to increase your visibility to brands.',
      });
    }

    // Campaign performance
    const completedCampaigns = collaborations.filter(c => c.status === CollaborationStatus.COMPLETED);
    if (completedCampaigns.length >= 5) {
      insights.push({
        type: 'success',
        message: `🏆 You've completed ${completedCampaigns.length} campaigns! Your experience makes you attractive to brands.`,
      });
    }

    // Follower milestones
    if (totalFollowers >= 100000) {
      insights.push({
        type: 'success',
        message: '⭐ Congratulations! You have over 100K followers, qualifying you for premium campaigns.',
      });
    } else if (totalFollowers >= 10000) {
      insights.push({
        type: 'info',
        message: '📈 You have over 10K followers. You qualify for micro-influencer campaigns.',
      });
    }

    return insights.slice(0, 5);
  }

  private generateMonthlyEarnings(collaborations: Collaboration[]): { month: string; amount: number }[] {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const currentMonth = new Date().getMonth();
    const result: { month: string; amount: number }[] = [];

    for (let i = 5; i >= 0; i--) {
      const monthIndex = (currentMonth - i + 12) % 12;
      const monthName = months[monthIndex];
      
      const monthEarnings = collaborations
        .filter(c => {
          if (c.status !== CollaborationStatus.COMPLETED) return false;
          const date = new Date(c.updated_at);
          return date.getMonth() === monthIndex;
        })
        .reduce((sum, c) => sum + Number(c.proposed_budget || 0), 0);
      
      result.push({ month: monthName, amount: monthEarnings });
    }

    return result;
  }

  private generateEngagementTrend(platforms: PlatformAnalytics[]): { date: string; rate: number }[] {
    // Generate trend data for last 7 days (mock for now)
    const result: { date: string; rate: number }[] = [];
    const baseRate = platforms.reduce((sum, p) => sum + p.engagement_rate, 0) / Math.max(platforms.length, 1);
    
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      result.push({
        date: date.toISOString().split('T')[0],
        rate: Math.round((baseRate + (Math.random() - 0.5) * 2) * 100) / 100,
      });
    }

    return result;
  }

  private generateFollowersTrend(platforms: PlatformAnalytics[], total: number): { date: string; count: number }[] {
    const result: { date: string; count: number }[] = [];
    
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const variation = Math.floor(total * 0.001 * (Math.random() - 0.3));
      result.push({
        date: date.toISOString().split('T')[0],
        count: Math.max(0, total - (i * 10) + variation),
      });
    }

    return result;
  }

  private groupEarningsByBrand(collaborations: Collaboration[]): { brand: string; amount: number }[] {
    const brandMap = new Map<string, number>();
    
    for (const collab of collaborations) {
      const brandName = collab.campaign?.brand?.company_name || 'Unknown';
      const amount = Number(collab.proposed_budget || 0);
      brandMap.set(brandName, (brandMap.get(brandName) || 0) + amount);
    }

    return Array.from(brandMap.entries())
      .map(([brand, amount]) => ({ brand, amount }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5);
  }

  private groupEarningsByMonth(collaborations: Collaboration[]): { month: string; amount: number }[] {
    return this.generateMonthlyEarnings(collaborations);
  }
}
