import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull, Not } from 'typeorm';
import { Creator } from './entities/creator.entity';
import { CreateCreatorDto } from './dto/create-creator.dto';
import { UpdateCreatorDto } from './dto/update-creator.dto';
import { Collaboration, CollaborationStatus } from '../campaigns/entities/collaboration.entity';
import { Campaign } from '../campaigns/entities/campaign.entity';
import { AIAnalysisReport } from '../matching/entities/ai-analysis-report.entity';
import { MatchingService } from '../matching/matching.service';

@Injectable()
export class CreatorsService {
  private readonly logger = new Logger(CreatorsService.name);

  constructor(
    @InjectRepository(Creator)
    private creatorsRepository: Repository<Creator>,
    @InjectRepository(Collaboration)
    private collaborationsRepository: Repository<Collaboration>,
    @InjectRepository(Campaign)
    private campaignsRepository: Repository<Campaign>,
    @InjectRepository(AIAnalysisReport)
    private aiReportsRepository: Repository<AIAnalysisReport>,
    private readonly matchingService: MatchingService,
  ) {}

  async create(userId: string, createCreatorDto: CreateCreatorDto): Promise<Creator> {
    const creator = this.creatorsRepository.create({
      user_id: userId,
      ...createCreatorDto,
    });
    return this.creatorsRepository.save(creator);
  }

  async findAll(): Promise<Creator[]> {
    return this.creatorsRepository.find({
      relations: ['user'],
      where: { is_active: true },
    });
  }

  async findOne(id: string): Promise<Creator> {
    const creator = await this.creatorsRepository.findOne({
      where: { id },
      relations: ['user'],
    });
    
    if (!creator) {
      throw new NotFoundException(`Creator with ID ${id} not found`);
    }
    
    return creator;
  }

  async findByUserId(userId: string): Promise<Creator> {
    const creator = await this.creatorsRepository.findOne({
      where: { user_id: userId },
      relations: ['user'],
    });
    
    if (!creator) {
      throw new NotFoundException(`Creator profile not found for user ${userId}`);
    }
    
    return creator;
  }

  async update(id: string, updateCreatorDto: UpdateCreatorDto): Promise<Creator> {
    const creator = await this.findOne(id);
    Object.assign(creator, updateCreatorDto);
    return this.creatorsRepository.save(creator);
  }

  async remove(id: string): Promise<void> {
    const creator = await this.findOne(id);
    creator.is_active = false;
    await this.creatorsRepository.save(creator);
  }

  async search(query: string): Promise<Creator[]> {
    return this.creatorsRepository
      .createQueryBuilder('creator')
      .leftJoinAndSelect('creator.user', 'user')
      .where('creator.bio ILIKE :query', { query: `%${query}%` })
      .orWhere('user.first_name ILIKE :query', { query: `%${query}%` })
      .orWhere('user.last_name ILIKE :query', { query: `%${query}%` })
      .andWhere('creator.is_active = :active', { active: true })
      .getMany();
  }

  async getCreatorStats(userId: string) {
    this.logger.log(`📊 Getting stats for user ${userId}`);
    
    const creator = await this.creatorsRepository.findOne({
      where: { user_id: userId },
    });

    if (!creator) {
      throw new NotFoundException('Creator not found');
    }

    // Get collaboration statistics
    const collaborations = await this.collaborationsRepository.find({
      where: { creator_id: creator.id },
    });

    const totalCollaborations = collaborations.length;
    const activeCollaborations = collaborations.filter(
      (c) => c.status === CollaborationStatus.ACCEPTED,
    ).length;
    const completedCollaborations = collaborations.filter(
      (c) => c.status === CollaborationStatus.COMPLETED,
    ).length;
    const pendingRequests = collaborations.filter(
      (c) => c.status === CollaborationStatus.PENDING,
    ).length;

    // Calculate total earnings from completed collaborations
    const totalEarnings = collaborations
      .filter((c) => c.status === CollaborationStatus.COMPLETED)
      .reduce((sum, c) => sum + (parseFloat(c.proposed_budget?.toString() || '0') || 0), 0);

    // Get total reach from creator metrics (mock data for now)
    const totalReach = 0; // TODO: Calculate from social accounts
    const engagementRate = 0; // TODO: Calculate from social accounts

    this.logger.log(`✅ Stats calculated: ${totalCollaborations} total, ${pendingRequests} pending`);

    return {
      totalCollaborations,
      activeCollaborations,
      completedCollaborations,
      totalEarnings: Math.round(totalEarnings),
      averageRating: parseFloat(creator.overall_rating?.toString() || '0') || 0,
      totalReach,
      engagementRate,
      pendingRequests,
    };
  }

  async getCreatorCollaborations(
    userId: string,
    limit: number = 100,
    recent: boolean = false,
  ) {
    this.logger.log(`📋 Getting collaborations for user ${userId} (limit: ${limit}, recent: ${recent})`);
    
    const creator = await this.creatorsRepository.findOne({
      where: { user_id: userId },
    });

    if (!creator) {
      throw new NotFoundException('Creator not found');
    }

    const queryBuilder = this.collaborationsRepository
      .createQueryBuilder('collab')
      .leftJoinAndSelect('collab.campaign', 'campaign')
      .leftJoinAndSelect('campaign.brand', 'brand')
      .where('collab.creator_id = :creatorId', { creatorId: creator.id })
      .orderBy('collab.created_at', 'DESC')
      .take(limit);

    const collaborations = await queryBuilder.getMany();

    // Enrich with AI data
    const enrichedCollaborations = await Promise.all(
      collaborations.map(async (collab) => {
        const aiReport = await this.aiReportsRepository.findOne({
          where: {
            campaign_id: collab.campaign_id,
            creator_id: creator.id,
          },
          order: { created_at: 'DESC' },
        });

        return {
          id: collab.id,
          campaign_id: collab.campaign_id,
          creator_id: collab.creator_id,
          status: collab.status,
          proposed_budget: parseFloat(collab.proposed_budget?.toString() || '0') || null,
          message: collab.message,
          deadline: collab.deadline,
          created_at: collab.created_at,
          updated_at: collab.updated_at,
          campaign: {
            id: collab.campaign.id,
            title: collab.campaign.title,
            description: collab.campaign.description,
            platform: collab.campaign.platform,
            category: collab.campaign.category,
            budget: parseFloat(collab.campaign.budget?.toString() || '0') || 0,
            start_date: collab.campaign.start_date,
            end_date: collab.campaign.end_date,
            brand: {
              company_name: collab.campaign.brand?.company_name || 'Unknown Brand',
              website: collab.campaign.brand?.website || null,
            },
          },
          ai_match_score: aiReport?.ml_match_score ? parseFloat(aiReport.ml_match_score.toString()) : null,
          ai_recommendations: aiReport
            ? [
                ...(aiReport.strengths || []).slice(0, 1),
                ...(aiReport.ai_recommendations || []).slice(0, 1),
              ].filter(Boolean)
            : [],
        };
      }),
    );

    this.logger.log(`✅ Found ${enrichedCollaborations.length} collaborations`);

    return enrichedCollaborations;
  }

  async getCollaborationDetail(userId: string, collaborationId: string) {
    this.logger.log(`🔍 Getting collaboration detail: ${collaborationId}`);
    
    const creator = await this.creatorsRepository.findOne({
      where: { user_id: userId },
    });

    if (!creator) {
      throw new NotFoundException('Creator not found');
    }

    const collaboration = await this.collaborationsRepository.findOne({
      where: {
        id: collaborationId,
        creator_id: creator.id,
      },
      relations: ['campaign', 'campaign.brand'],
    });

    if (!collaboration) {
      throw new NotFoundException('Collaboration not found');
    }

    // Get AI analysis
    const aiReport = await this.aiReportsRepository.findOne({
      where: {
        campaign_id: collaboration.campaign_id,
        creator_id: creator.id,
      },
      order: { created_at: 'DESC' },
    });

    return {
      id: collaboration.id,
      campaign_id: collaboration.campaign_id,
      creator_id: collaboration.creator_id,
      status: collaboration.status,
      proposed_budget: parseFloat(collaboration.proposed_budget?.toString() || '0') || null,
      message: collaboration.message,
      deadline: collaboration.deadline,
      created_at: collaboration.created_at,
      updated_at: collaboration.updated_at,
      campaign: {
        id: collaboration.campaign.id,
        title: collaboration.campaign.title,
        description: collaboration.campaign.description,
        platform: collaboration.campaign.platform,
        category: collaboration.campaign.category,
        budget: parseFloat(collaboration.campaign.budget?.toString() || '0') || 0,
        start_date: collaboration.campaign.start_date,
        end_date: collaboration.campaign.end_date,
        requirements: null, // TODO: Add to campaign entity
        deliverables: null, // TODO: Add to campaign entity
        brand: {
          company_name: collaboration.campaign.brand?.company_name || 'Unknown Brand',
          website: collaboration.campaign.brand?.website || null,
          description: collaboration.campaign.brand?.description || null,
        },
      },
      aiAnalysis: aiReport
        ? {
            mlMatchScore: parseFloat(aiReport.ml_match_score?.toString() || '0') || 0,
            estimatedRoi: parseFloat(aiReport.estimated_roi?.toString() || '0') || 0,
            successProbability: parseFloat(aiReport.success_probability?.toString() || '0') || 0,
            riskAssessment: aiReport.risk_assessment || {
              overall: 'medium',
              factors: [],
            },
            strengths: aiReport.strengths || [],
            concerns: aiReport.concerns || [],
            recommendations: aiReport.ai_recommendations || [],
            aiSummary: aiReport.ai_summary || '',
          }
        : null,
    };
  }

  async getRecommendedCampaigns(userId: string) {
    this.logger.log(`🤖 Getting AI-powered recommendations for user ${userId}`);
    
    const creator = await this.creatorsRepository.findOne({
      where: { user_id: userId },
    });

    if (!creator) {
      throw new NotFoundException('Creator not found');
    }

    // Get active campaigns the creator hasn't collaborated with yet
    const existingCollabCampaignIds = await this.collaborationsRepository
      .find({ where: { creator_id: creator.id } })
      .then((collabs) => collabs.map((c) => c.campaign_id));

    const queryBuilder = this.campaignsRepository
      .createQueryBuilder('campaign')
      .leftJoinAndSelect('campaign.brand', 'brand')
      .where('campaign.status = :status', { status: 'active' })
      .andWhere('campaign.end_date > :now', { now: new Date() });

    if (existingCollabCampaignIds.length > 0) {
      queryBuilder.andWhere('campaign.id NOT IN (:...ids)', { ids: existingCollabCampaignIds });
    }

    const activeCampaigns = await queryBuilder.getMany();

    this.logger.log(`📊 Found ${activeCampaigns.length} active campaigns to analyze`);

    if (activeCampaigns.length === 0) {
      return [];
    }

    // Get or calculate AI analysis for each campaign
    const campaignScores = await Promise.all(
      activeCampaigns.slice(0, 20).map(async (campaign) => {
        try {
          // Check if we have a cached AI analysis
          let aiReport = await this.aiReportsRepository.findOne({
            where: {
              campaign_id: campaign.id,
              creator_id: creator.id,
            },
            order: { created_at: 'DESC' },
          });

          // If no cached analysis or it's old, generate new one
          if (!aiReport) {
            this.logger.log(`🔄 Generating AI analysis for campaign ${campaign.id}`);
            try {
              aiReport = await this.matchingService.getAIAnalysis(campaign.id, creator.id);
            } catch (error) {
              this.logger.warn(`⚠️ Failed to generate AI analysis for campaign ${campaign.id}`);
              return null;
            }
          }

          const mlMatchScore = parseFloat(aiReport?.ml_match_score?.toString() || '0') || 0;

          return {
            id: campaign.id,
            title: campaign.title,
            description: campaign.description,
            platform: campaign.platform,
            category: campaign.category,
            budget: parseFloat(campaign.budget?.toString() || '0') || 0,
            start_date: campaign.start_date,
            end_date: campaign.end_date,
            brand: {
              company_name: campaign.brand?.company_name || 'Unknown Brand',
              website: campaign.brand?.website || null,
            },
            aiMatchScore: mlMatchScore,
            estimatedRoi: parseFloat(aiReport?.estimated_roi?.toString() || '0') || 0,
            successProbability: parseFloat(aiReport?.success_probability?.toString() || '0') || 0,
            matchReasons: aiReport?.strengths?.slice(0, 4) || [],
            requirements: null, // TODO: Add to campaign entity
            location: 'Remote', // TODO: Add to campaign entity
          };
        } catch (error) {
          this.logger.error(`❌ Failed to analyze campaign ${campaign.id}:`, error);
          return null;
        }
      }),
    );

    // Filter out null results and low scores, then sort by match score
    const recommendations = campaignScores
      .filter((c): c is NonNullable<typeof c> => c !== null && c.aiMatchScore >= 70)
      .sort((a, b) => b.aiMatchScore - a.aiMatchScore)
      .slice(0, 20);

    this.logger.log(`✅ Returning ${recommendations.length} recommendations`);

    return recommendations;
  }

  async acceptCollaboration(
    userId: string,
    collaborationId: string,
    counterOffer?: number,
  ) {
    this.logger.log(`✅ Accepting collaboration ${collaborationId}`);
    
    const creator = await this.creatorsRepository.findOne({
      where: { user_id: userId },
    });

    if (!creator) {
      throw new NotFoundException('Creator not found');
    }

    const collaboration = await this.collaborationsRepository.findOne({
      where: {
        id: collaborationId,
        creator_id: creator.id,
        status: CollaborationStatus.PENDING,
      },
      relations: ['campaign', 'campaign.brand'],
    });

    if (!collaboration) {
      throw new NotFoundException('Collaboration not found or not pending');
    }

    // Update collaboration status
    collaboration.status = counterOffer
      ? CollaborationStatus.PENDING
      : CollaborationStatus.ACCEPTED;

    // Note: In a real app, we'd add a counter_offer column
    // For now, we'll just update the proposed_budget if counter offer is provided
    if (counterOffer) {
      collaboration.proposed_budget = counterOffer;
      collaboration.message = `Counter offer: $${counterOffer}`;
    }

    await this.collaborationsRepository.save(collaboration);

    this.logger.log(`✅ Collaboration ${collaborationId} ${counterOffer ? 'counter-offered' : 'accepted'}`);

    return {
      success: true,
      collaboration,
      message: counterOffer
        ? 'Counter offer submitted. Waiting for brand response.'
        : 'Collaboration accepted! You can now start working with the brand.',
    };
  }

  async rejectCollaboration(userId: string, collaborationId: string, reason: string) {
    this.logger.log(`❌ Rejecting collaboration ${collaborationId}`);
    
    const creator = await this.creatorsRepository.findOne({
      where: { user_id: userId },
    });

    if (!creator) {
      throw new NotFoundException('Creator not found');
    }

    const collaboration = await this.collaborationsRepository.findOne({
      where: {
        id: collaborationId,
        creator_id: creator.id,
        status: CollaborationStatus.PENDING,
      },
      relations: ['campaign', 'campaign.brand'],
    });

    if (!collaboration) {
      throw new NotFoundException('Collaboration not found or not pending');
    }

    // Update collaboration status
    collaboration.status = CollaborationStatus.REJECTED;
    collaboration.rejection_reason = reason;

    await this.collaborationsRepository.save(collaboration);

    this.logger.log(`✅ Collaboration ${collaborationId} rejected`);

    return {
      success: true,
      message: 'Collaboration declined. The brand has been notified.',
    };
  }

  async generateAIReport(userId: string, collaborationId: string) {
    this.logger.log(`🤖 Generating AI report for collaboration ${collaborationId}`);
    
    const creator = await this.creatorsRepository.findOne({
      where: { user_id: userId },
      relations: ['user'],
    });

    if (!creator) {
      throw new NotFoundException('Creator not found');
    }

    const collaboration = await this.collaborationsRepository.findOne({
      where: {
        id: collaborationId,
        creator_id: creator.id,
      },
      relations: ['campaign', 'campaign.brand'],
    });

    if (!collaboration) {
      throw new NotFoundException('Collaboration not found');
    }

    // Call AI microservice to generate creator-focused report
    try {
      const axios = require('axios');
      const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:5001';
      
      this.logger.log(`🌐 Calling AI microservice at ${AI_SERVICE_URL}/api/generate-creator-report`);
      
      const response = await axios.post(`${AI_SERVICE_URL}/api/generate-creator-report`, {
        creator: {
          id: creator.id,
          user: {
            first_name: creator.user?.first_name || '',
            last_name: creator.user?.last_name || '',
          },
          bio: creator.bio || '',
          categories: creator.categories || [],
          languages: creator.languages || [],
          total_campaigns: creator.total_campaigns || 0,
          overall_rating: parseFloat(creator.overall_rating?.toString() || '0'),
          location: creator.location || 'N/A',
          total_earnings: parseFloat(creator.total_earnings?.toString() || '0'),
          is_verified: creator.is_verified || false,
          social_links: creator.social_links || {},
        },
        campaign: {
          id: collaboration.campaign.id,
          title: collaboration.campaign.title,
          description: collaboration.campaign.description,
          platform: collaboration.campaign.platform,
          category: collaboration.campaign.category,
          budget: parseFloat(collaboration.campaign.budget?.toString() || '0'),
          start_date: collaboration.campaign.start_date,
          end_date: collaboration.campaign.end_date,
          status: collaboration.campaign.status,
          // Requirements and target audience from JSONB fields
          requirements: collaboration.campaign.requirements || {
            min_followers: 0,
            min_engagement_rate: 0,
            content_types: [],
            deliverables: [],
          },
          target_audience: collaboration.campaign.target_audience || {
            age_range: '',
            gender: '',
            locations: [],
            interests: [],
          },
          total_creators: collaboration.campaign.total_creators || 0,
          total_reach: collaboration.campaign.total_reach || 0,
          brand: {
            company_name: collaboration.campaign.brand?.company_name || 'Brand',
            description: collaboration.campaign.brand?.description || '',
            website: collaboration.campaign.brand?.website || '',
            industry: collaboration.campaign.brand?.industry || collaboration.campaign.category || 'N/A',
          },
        },
        collaboration: {
          id: collaboration.id,
          proposed_budget: parseFloat(collaboration.proposed_budget?.toString() || '0'),
          status: collaboration.status,
          message: collaboration.message || '',
          deadline: collaboration.deadline,
        },
      });

      const aiReport = response.data;

      // Save the report text to AI analysis report
      let analysisReport = await this.aiReportsRepository.findOne({
        where: {
          campaign_id: collaboration.campaign_id,
          creator_id: creator.id,
        },
      });

      if (!analysisReport) {
        analysisReport = this.aiReportsRepository.create({
          campaign_id: collaboration.campaign_id,
          creator_id: creator.id,
        });
      }

      // Store the Gemini-generated report
      analysisReport.ai_summary = aiReport.full_report || '';
      analysisReport.ai_recommendations = aiReport.quick_insights || [];
      
      await this.aiReportsRepository.save(analysisReport);

      this.logger.log(`✅ AI report generated and saved for collaboration ${collaborationId}`);

      return {
        success: true,
        report: aiReport,
        saved_to_database: true,
      };
    } catch (error) {
      this.logger.error(`❌ Failed to generate AI report: ${error.message}`);
      throw new Error(`Failed to generate AI report: ${error.message}`);
    }
  }
}
