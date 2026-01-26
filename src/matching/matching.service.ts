import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Creator } from '../creators/entities/creator.entity';
import { Campaign, CampaignStatus } from '../campaigns/entities/campaign.entity';
import { Collaboration, CollaborationStatus } from '../campaigns/entities/collaboration.entity';
import { AIAnalysisReport } from './entities/ai-analysis-report.entity';
import { AIPythonService } from './ai-python.service';
import { AiMatchingService } from '../ai/ai-matching.service';

interface MatchAnalysis {
  score: number;
  reasons: string[];
  strengths: string[];
  concerns: string[];
  audienceOverlap: number;
  budgetFit: string;
  experienceLevel: string;
  estimatedROI: number;
}

interface CreatorMatch {
  creator: Creator;
  matchScore: number;
  analysis: MatchAnalysis;
  aiAnalysis?: AIAnalysisReport | null;
  rank: number;
}

@Injectable()
export class MatchingService {
  private readonly logger = new Logger(MatchingService.name);

  constructor(
    @InjectRepository(Creator)
    private creatorsRepository: Repository<Creator>,
    @InjectRepository(Campaign)
    private campaignsRepository: Repository<Campaign>,
    @InjectRepository(Collaboration)
    private collaborationsRepository: Repository<Collaboration>,
    @InjectRepository(AIAnalysisReport)
    private aiReportsRepository: Repository<AIAnalysisReport>,
    private aiPythonService: AIPythonService,
    private aiMatchingService: AiMatchingService,
  ) {}

  async findMatchingCreators(campaignId: string): Promise<CreatorMatch[]> {
    const campaign = await this.campaignsRepository.findOne({
      where: { id: campaignId },
    });

    if (!campaign) {
      throw new NotFoundException('Campaign not found');
    }

    // Get all active and verified creators
    const creators = await this.creatorsRepository.find({
      where: { is_active: true, is_verified: true },
      relations: ['user'],
    });

    // Calculate matches with detailed analysis + AI predictions
    const matches = await Promise.all(
      creators.map(async (creator) => {
        // Get rule-based analysis
        const analysis = this.analyzeMatch(creator, campaign);
        
        // Get AI-enhanced analysis (cached or generate new)
        let aiAnalysis: AIAnalysisReport | null = null;
        try {
          aiAnalysis = await this.getAIAnalysis(campaignId, creator.id);
          
          // Use AI match score if available (prioritize ML score, fallback to overall score)
          if (aiAnalysis && aiAnalysis.ml_match_score) {
            analysis.score = aiAnalysis.ml_match_score;
          } else if (aiAnalysis && aiAnalysis.match_score) {
            analysis.score = aiAnalysis.match_score;
          }
          
          // Enhance with AI predictions
          if (aiAnalysis) {
            if (aiAnalysis.estimated_roi) {
              analysis.estimatedROI = aiAnalysis.estimated_roi;
            }
            
            // Add AI-specific strengths
            if (aiAnalysis.strengths && aiAnalysis.strengths.length > 0) {
              analysis.strengths = [...new Set([...analysis.strengths, ...aiAnalysis.strengths])];
            }
            
            // Add AI-specific concerns
            if (aiAnalysis.concerns && aiAnalysis.concerns.length > 0) {
              analysis.concerns = [...new Set([...analysis.concerns, ...aiAnalysis.concerns])];
            }
            
            // Add AI reasons
            if (aiAnalysis.reasons && aiAnalysis.reasons.length > 0) {
              analysis.reasons = [...new Set([...analysis.reasons, ...aiAnalysis.reasons])];
            }
          }
        } catch (error) {
          // AI failed, use rule-based scoring (already calculated)
          console.log(`AI analysis skipped for creator ${creator.id}:`, error.message);
        }
        
        return {
          creator,
          matchScore: analysis.score,
          analysis,
          aiAnalysis, // Include AI data for frontend
          rank: 0, // Will be set after sorting
        };
      })
    );

    // Sort by match score and assign ranks
    const sortedMatches = matches
      .sort((a, b) => b.matchScore - a.matchScore)
      .map((match, index) => ({
        ...match,
        rank: index + 1,
      }));

    return sortedMatches;
  }

  private analyzeMatch(creator: Creator, campaign: Campaign): MatchAnalysis {
    let score = 0;
    const reasons: string[] = [];
    const strengths: string[] = [];
    const concerns: string[] = [];

    // Category Match (30 points)
    if (creator.categories && creator.categories.includes(campaign.category)) {
      score += 30;
      reasons.push(`Perfect category match: ${campaign.category}`);
      strengths.push('Expert in campaign category');
    } else if (creator.categories && creator.categories.length > 0) {
      score += 10;
      concerns.push('Category mismatch - creator specializes in different niches');
    }

    // Requirements Match (25 points)
    if (campaign.requirements) {
      const req = campaign.requirements;
      
      // Followers check
      if (req.min_followers) {
        const totalFollowers = this.getTotalFollowers(creator);
        if (totalFollowers >= req.min_followers) {
          score += 15;
          reasons.push(`Exceeds follower requirement (${totalFollowers.toLocaleString()} followers)`);
          strengths.push(`Strong audience size (${this.formatNumber(totalFollowers)} followers)`);
        } else {
          concerns.push(`Below follower requirement (has ${totalFollowers.toLocaleString()}, needs ${req.min_followers.toLocaleString()})`);
        }
      }

      // Note: Engagement rate check - requires social account data
      // Will be implemented when social accounts are tracked
    }

    // Experience Level (20 points)
    const experienceScore = this.calculateExperienceScore(creator);
    score += experienceScore;
    if (creator.total_campaigns > 20) {
      reasons.push(`Highly experienced (${creator.total_campaigns} campaigns completed)`);
      strengths.push('Proven track record with multiple successful campaigns');
    } else if (creator.total_campaigns > 5) {
      reasons.push(`Experienced creator (${creator.total_campaigns} campaigns)`);
      strengths.push('Solid campaign experience');
    } else if (creator.total_campaigns > 0) {
      concerns.push('Limited campaign experience');
    } else {
      concerns.push('No previous campaign experience');
    }

    // Rating & Reliability (15 points)
    if (creator.overall_rating >= 4.5) {
      score += 15;
      reasons.push(`Excellent rating: ${creator.overall_rating}/5.0`);
      strengths.push('Highly rated by previous brand partners');
    } else if (creator.overall_rating >= 4.0) {
      score += 10;
      strengths.push('Good reputation with brands');
    } else if (creator.overall_rating >= 3.0) {
      score += 5;
      concerns.push('Average rating from previous collaborations');
    }

    // Platform Match (10 points)
    const platformMatch = this.checkPlatformMatch(creator, campaign);
    score += platformMatch.score;
    if (platformMatch.matched) {
      reasons.push(`Active on ${campaign.platform}`);
      strengths.push(`Strong ${campaign.platform} presence`);
    } else {
      concerns.push(`Not primarily active on ${campaign.platform}`);
    }

    // Audience Demographics Match
    const audienceOverlap = this.calculateAudienceOverlap(creator, campaign);
    if (audienceOverlap > 70) {
      strengths.push('Excellent target audience alignment');
    } else if (audienceOverlap > 40) {
      strengths.push('Good audience match');
    } else {
      concerns.push('Limited audience overlap with target demographics');
    }

    // Budget Fit
    const budgetFit = this.assessBudgetFit(creator, campaign);

    // Experience Level
    const experienceLevel = this.getExperienceLevel(creator);

    // Estimated ROI
    const estimatedROI = this.calculateEstimatedROI(creator, campaign, score);

    return {
      score: Math.min(score, 100),
      reasons,
      strengths,
      concerns,
      audienceOverlap,
      budgetFit,
      experienceLevel,
      estimatedROI,
    };
  }

  private getTotalFollowers(creator: Creator): number {
    // Estimate followers - will be replaced with actual social account data
    // For now, use campaign count as a proxy (10K followers per campaign)
    return creator.total_campaigns * 10000 + 5000;
  }

  private calculateExperienceScore(creator: Creator): number {
    if (creator.total_campaigns >= 20) return 20;
    if (creator.total_campaigns >= 10) return 15;
    if (creator.total_campaigns >= 5) return 10;
    if (creator.total_campaigns >= 1) return 5;
    return 0;
  }

  private checkPlatformMatch(creator: Creator, campaign: Campaign): { score: number; matched: boolean } {
    // Check if creator has linked social accounts for the platform
    const socialLinks = creator.social_links || {};
    const platform = campaign.platform.toLowerCase();
    
    const hasPlatform = !!(socialLinks as any)[platform];

    return {
      score: hasPlatform ? 10 : 5, // Give partial credit if no social link
      matched: hasPlatform,
    };
  }

  private calculateAudienceOverlap(creator: Creator, campaign: Campaign): number {
    // Simplified audience overlap calculation
    // In production, use actual demographic data
    let overlap = 50; // Base overlap

    if (campaign.target_audience) {
      // Check category alignment
      if (creator.categories && creator.categories.includes(campaign.category)) {
        overlap += 30;
      }

      // Check location overlap
      if (campaign.target_audience.locations && creator.location) {
        const locationMatch = campaign.target_audience.locations.some(
          (loc: string) => creator.location.toLowerCase().includes(loc.toLowerCase())
        );
        if (locationMatch) overlap += 20;
      }
    }

    return Math.min(overlap, 100);
  }

  private assessBudgetFit(creator: Creator, campaign: Campaign): string {
    const estimatedCost = this.estimateCreatorCost(creator);
    const budgetPerCreator = campaign.budget / Math.max(campaign.total_creators || 5, 1);

    if (estimatedCost <= budgetPerCreator * 0.7) {
      return 'Excellent fit - well within budget';
    } else if (estimatedCost <= budgetPerCreator) {
      return 'Good fit - within budget range';
    } else if (estimatedCost <= budgetPerCreator * 1.3) {
      return 'Moderate fit - slightly above typical budget';
    } else {
      return 'Premium pricing - above budget range';
    }
  }

  private estimateCreatorCost(creator: Creator): number {
    // Estimate based on followers, engagement, and experience
    const followers = this.getTotalFollowers(creator);
    const baseRate = followers * 0.01; // $0.01 per follower as base
    const experienceMultiplier = 1 + (creator.total_campaigns * 0.05);
    const ratingMultiplier = creator.overall_rating / 4.0;

    return baseRate * experienceMultiplier * ratingMultiplier;
  }

  private getExperienceLevel(creator: Creator): string {
    if (creator.total_campaigns >= 20) return 'Expert';
    if (creator.total_campaigns >= 10) return 'Advanced';
    if (creator.total_campaigns >= 5) return 'Intermediate';
    if (creator.total_campaigns >= 1) return 'Beginner';
    return 'New';
  }

  private calculateEstimatedROI(creator: Creator, campaign: Campaign, matchScore: number): number {
    // ROI estimation based on various factors
    const engagementFactor = 1; // Default engagement factor
    const ratingFactor = Number(creator.overall_rating) / 5;
    const matchFactor = matchScore / 100;
    const experienceFactor = Math.min(creator.total_campaigns / 20, 1);

    const roi = (engagementFactor + ratingFactor + matchFactor + experienceFactor) / 4 * 300;
    return Math.round(roi);
  }

  private formatNumber(num: number): string {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  }

  async getDetailedCreatorAnalysis(campaignId: string, creatorId: string): Promise<any> {
    const campaign = await this.campaignsRepository.findOne({
      where: { id: campaignId },
    });

    const creator = await this.creatorsRepository.findOne({
      where: { id: creatorId },
      relations: ['user'],
    });

    if (!campaign || !creator) {
      throw new NotFoundException('Campaign or Creator not found');
    }

    // Start with basic rule-based analysis
    const analysis = this.analyzeMatch(creator, campaign);

    // Get AI/ML analysis
    let aiAnalysis: any = null;
    try {
      aiAnalysis = await this.getAIAnalysis(campaignId, creatorId);
      
      // ✅ FIX: Use ML score instead of rule-based score
      // getAIAnalysis returns ml_predictions.match_score (already 0-100 percentage)
      if (aiAnalysis?.ml_predictions?.match_score !== undefined) {
        analysis.score = Math.round(aiAnalysis.ml_predictions.match_score);
        this.logger.log(`📊 Using ML predictions score: ${analysis.score}%`);
      } else if (aiAnalysis?.match_score !== undefined) {
        analysis.score = Math.round(aiAnalysis.match_score);
        this.logger.log(`📊 Using combined match score: ${analysis.score}%`);
      } else {
        this.logger.warn(`⚠️ No ML score available, using rule-based: ${analysis.score}%`);
      }
      
      // Update other metrics from AI analysis
      if (aiAnalysis?.ml_predictions?.estimated_roi) {
        analysis.estimatedROI = Math.round(aiAnalysis.ml_predictions.estimated_roi);
      }
      if (aiAnalysis?.audience_overlap) {
        analysis.audienceOverlap = Math.round(aiAnalysis.audience_overlap);
      }
      
      // Update experience level from AI insights
      if (aiAnalysis?.ml_predictions?.confidence) {
        const confidence = aiAnalysis.ml_predictions.confidence;
        if (confidence >= 90) {
          analysis.experienceLevel = 'Expert';
        } else if (confidence >= 75) {
          analysis.experienceLevel = 'Advanced';
        } else if (confidence >= 60) {
          analysis.experienceLevel = 'Intermediate';
        }
      }
    } catch (error) {
      this.logger.error(`❌ AI analysis failed, using rule-based score: ${analysis.score}%`, error.message);
    }

    return {
      creator,
      campaign,
      analysis,
      recommendations: this.generateRecommendations(creator, campaign, analysis),
      comparisons: await this.getComparativeMetrics(creator, campaign),
      aiAnalysis, // Include AI analysis in response
    };
  }

  private generateRecommendations(creator: Creator, campaign: Campaign, analysis: MatchAnalysis): string[] {
    const recommendations: string[] = [];

    if (analysis.score >= 80) {
      recommendations.push('Highly recommended collaboration');
      recommendations.push('Send collaboration request immediately');
    } else if (analysis.score >= 60) {
      recommendations.push('Good potential match');
      recommendations.push('Consider for collaboration with clear deliverables');
    }

    if (analysis.concerns.length > 0) {
      recommendations.push('Address concerns in collaboration brief');
    }

    if (creator.total_campaigns === 0) {
      recommendations.push('New creator - consider starting with smaller deliverables');
    }

    return recommendations;
  }

  private async getComparativeMetrics(creator: Creator, campaign: Campaign): Promise<any> {
    // Get average metrics from similar campaigns
    const similarCampaigns = await this.campaignsRepository.find({
      where: { category: campaign.category, status: CampaignStatus.COMPLETED },
      take: 10,
    });

    const avgBudget = similarCampaigns.reduce((sum, c) => sum + Number(c.budget), 0) / similarCampaigns.length;
    const avgReach = similarCampaigns.reduce((sum, c) => sum + c.total_reach, 0) / similarCampaigns.length;

    return {
      industryAverageBudget: avgBudget,
      industryAverageReach: avgReach,
      creatorPositioning: creator.overall_rating >= 4.0 ? 'Above Average' : 'Average',
    };
  }

  async getRecommendedCampaigns(creatorId: string): Promise<any[]> {
    const creator = await this.creatorsRepository.findOne({
      where: { id: creatorId },
    });

    if (!creator) {
      return [];
    }

    const campaigns = await this.campaignsRepository.find({
      where: { status: CampaignStatus.ACTIVE },
      relations: ['brand'],
    });

    return campaigns.map(campaign => ({
      ...campaign,
      matchScore: this.analyzeMatch(creator, campaign).score,
    })).sort((a, b) => b.matchScore - a.matchScore);
  }

  async createCollaborationRequest(
    campaignId: string,
    creatorId: string,
    data: { proposed_budget?: number; message?: string; deliverables?: any; deadline?: Date },
  ): Promise<Collaboration> {
    // Check if collaboration already exists
    const existing = await this.collaborationsRepository.findOne({
      where: { campaign_id: campaignId, creator_id: creatorId },
    });

    if (existing) {
      throw new Error('Collaboration request already exists');
    }

    const collaboration = this.collaborationsRepository.create({
      campaign_id: campaignId,
      creator_id: creatorId,
      ...data,
      status: CollaborationStatus.PENDING,
    });

    return this.collaborationsRepository.save(collaboration);
  }

  async getCollaborationsByCampaign(campaignId: string): Promise<Collaboration[]> {
    return this.collaborationsRepository.find({
      where: { campaign_id: campaignId },
      relations: ['creator', 'creator.user'],
      order: { created_at: 'DESC' },
    });
  }

  // AI-POWERED METHODS

  /**
   * Get AI-powered comprehensive analysis
   * Flow: ML API (predictions) → AI Service (Gemini reports)
   */
  async getAIAnalysis(campaignId: string, creatorId: string): Promise<any> {
    // ALWAYS generate fresh analysis (no cache for now)
    this.logger.log(`🔍 Getting AI analysis for campaign ${campaignId} and creator ${creatorId}`);
    
    const campaign = await this.campaignsRepository.findOne({
      where: { id: campaignId },
    });

    const creator = await this.creatorsRepository.findOne({
      where: { id: creatorId },
      relations: ['user'],  // socialAccounts relation may not exist
    });

    if (!campaign || !creator) {
      throw new NotFoundException('Campaign or creator not found');
    }

    // STEP 1: Get ML predictions from FastAPI (port 5001)
    this.logger.log(`📊 Step 1: Getting ML predictions from FastAPI...`);
    let mlPrediction: any;
    try {
      mlPrediction = await this.aiMatchingService.getMatchScore(
        this.aiMatchingService.formatCreatorForML(creator, []),  // Empty social accounts for now
        this.aiMatchingService.formatCampaignForML(campaign)
      );
      this.logger.log(`✅ ML Prediction received: score=${mlPrediction.match_score}, confidence=${mlPrediction.confidence}`);
    } catch (error) {
      this.logger.warn(`⚠️ ML API unavailable, using fallback predictions`);
      // Fallback to basic scoring
      mlPrediction = {
        match_score: this.analyzeMatch(creator, campaign).score / 100,
        confidence: 0.5,
        model_scores: {
          xgboost: 0,
          neural_network: 0,
          bert_semantic: 0
        }
      };
    }

    // STEP 2: Get AI-powered comprehensive analysis from Flask API (port 5002)
    this.logger.log(`🤖 Step 2: Generating AI-powered report with Gemini...`);
    let aiAnalysis: any;
    try {
      aiAnalysis = await this.aiPythonService.getAnalysis(creator, campaign);
      this.logger.log(`✅ AI Analysis received with Gemini insights`);
    } catch (error) {
      this.logger.warn(`⚠️ AI service unavailable, using basic analysis`);
      aiAnalysis = {
        match_score: mlPrediction.match_score * 100,
        ml_predictions: {
          match_score: mlPrediction.match_score * 100,
          estimated_roi: 150,
          estimated_engagement: 5.0
        },
        strengths: [],
        concerns: [],
        reasons: [],
        audience_overlap: 50
      };
    }

    // STEP 3: Merge ML predictions with AI analysis
    const combinedAnalysis = {
      ...aiAnalysis,
      ml_predictions: {
        match_score: mlPrediction.match_score * 100,
        confidence: mlPrediction.confidence * 100,
        estimated_roi: aiAnalysis.ml_predictions?.estimated_roi || 150,
        estimated_engagement: aiAnalysis.ml_predictions?.estimated_engagement || 5.0,
        model_breakdown: {
          xgboost: (mlPrediction.model_scores?.xgboost || 0) * 100,
          neural_network: (mlPrediction.model_scores?.neural_network || 0) * 100,
          bert_semantic: (mlPrediction.model_scores?.bert_semantic || 0) * 100
        }
      },
      match_score: mlPrediction.match_score * 100  // Use ML score as primary
    };

    this.logger.log(`✅ Combined Analysis: ML=${combinedAnalysis.ml_predictions.match_score.toFixed(2)}%, Confidence=${combinedAnalysis.ml_predictions.confidence.toFixed(2)}%, ROI=${combinedAnalysis.ml_predictions.estimated_roi}%`);

    // Delete old cached report if exists
    await this.aiReportsRepository.delete({
      campaign_id: campaignId,
      creator_id: creatorId,
    });

    // Save NEW analysis to database
    const report = new AIAnalysisReport();
    report.campaign_id = campaignId;
    report.creator_id = creatorId;
    report.match_score = combinedAnalysis.match_score || 0;
    if (combinedAnalysis.ml_predictions?.match_score) report.ml_match_score = combinedAnalysis.ml_predictions.match_score;
    if (combinedAnalysis.dl_predictions?.match_score) report.dl_match_score = combinedAnalysis.dl_predictions.match_score;
    if (combinedAnalysis.ml_predictions?.estimated_roi) report.estimated_roi = combinedAnalysis.ml_predictions.estimated_roi;
    if (combinedAnalysis.dl_predictions?.success_probability) report.success_probability = combinedAnalysis.dl_predictions.success_probability;
    if (combinedAnalysis.dl_predictions?.predicted_engagement) report.predicted_engagement = combinedAnalysis.dl_predictions.predicted_engagement;
    if (combinedAnalysis.audience_overlap) report.audience_overlap = combinedAnalysis.audience_overlap;
    report.strengths = combinedAnalysis.strengths || [];
    report.concerns = combinedAnalysis.concerns || [];
    report.reasons = combinedAnalysis.reasons || [];
    report.model_version = '1.0';
    report.confidence_level = combinedAnalysis.match_score >= 80 ? 'high' : combinedAnalysis.match_score >= 60 ? 'medium' : 'low';
    report.features_used = combinedAnalysis.features || {};

    await this.aiReportsRepository.save(report);

    this.logger.log(`💾 Saved AI report to database`);

    return combinedAnalysis;
  }

  /**
   * Generate comprehensive AI report with Gemini
   * Flow: Get/Generate ML analysis → Generate Gemini report
   */
  async generateAIReport(campaignId: string, creatorId: string): Promise<any> {
    this.logger.log(`📝 Generating comprehensive AI report for campaign ${campaignId} and creator ${creatorId}`);
    
    const campaign = await this.campaignsRepository.findOne({
      where: { id: campaignId },
    });

    const creator = await this.creatorsRepository.findOne({
      where: { id: creatorId },
      relations: ['user'],
    });

    if (!campaign || !creator) {
      throw new NotFoundException('Campaign or creator not found');
    }

    // STEP 1: Get or generate ML-powered analysis
    let analysis = await this.aiReportsRepository.findOne({
      where: { campaign_id: campaignId, creator_id: creatorId },
    });

    if (!analysis) {
      this.logger.log(`📊 No existing analysis found, generating new ML analysis...`);
      const combinedAnalysis = await this.getAIAnalysis(campaignId, creatorId);
      // Analysis is now saved in database by getAIAnalysis
      analysis = await this.aiReportsRepository.findOne({
        where: { campaign_id: campaignId, creator_id: creatorId },
      });
    } else {
      this.logger.log(`✅ Using existing ML analysis (score: ${analysis.ml_match_score})`);
    }

    // STEP 2: Generate Gemini-powered comprehensive report
    this.logger.log(`🤖 Generating Gemini AI report...`);
    // Pass undefined for now - Gemini will use creator/campaign data directly
    const report = await this.aiPythonService.generateReport(creator, campaign, undefined);

    // STEP 3: Update database with full Gemini report
    if (analysis) {
      analysis.full_report = report.full_report;
      analysis.ai_summary = report.quick_summary;
      analysis.ai_recommendations = report.recommendations;
      analysis.risk_assessment = report.risk_assessment;

      await this.aiReportsRepository.save(analysis);
      this.logger.log(`💾 Saved Gemini report to database`);
    }

    return report;
  }

  /**
   * Get all AI reports for a campaign
   */
  async getAIReportsByCampaign(campaignId: string): Promise<AIAnalysisReport[]> {
    return this.aiReportsRepository.find({
      where: { campaign_id: campaignId },
      relations: ['creator', 'creator.user'],
      order: { match_score: 'DESC' },
    });
  }
}
