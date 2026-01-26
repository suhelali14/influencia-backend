/**
 * AI Controller
 * REST endpoints for ML-powered matching
 */

import { Controller, Post, Body, Get, Param, UseGuards, Logger } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AiMatchingService, CreatorProfile, CampaignDetails, MatchPrediction } from './ai-matching.service';

@Controller('api/ai')
export class AiController {
  private readonly logger = new Logger(AiController.name);

  constructor(private readonly aiService: AiMatchingService) {}

  /**
   * Get match score for creator-campaign pair
   */
  @Post('match')
  @UseGuards(JwtAuthGuard)
  async getMatch(
    @Body() body: { creator: CreatorProfile; campaign: CampaignDetails },
  ): Promise<{ success: boolean; data: MatchPrediction }> {
    this.logger.log(`Calculating match for creator ${body.creator.creator_id} and campaign ${body.campaign.campaign_id}`);
    
    const prediction = await this.aiService.getMatchScore(
      body.creator,
      body.campaign,
    );

    return {
      success: true,
      data: prediction,
    };
  }

  /**
   * Get ranked creators for a campaign
   */
  @Post('rank-creators')
  @UseGuards(JwtAuthGuard)
  async rankCreators(
    @Body() body: { creators: CreatorProfile[]; campaign: CampaignDetails; top_k?: number },
  ): Promise<{ success: boolean; data: { ranked_creators: Array<CreatorProfile & MatchPrediction>; total: number } }> {
    this.logger.log(`Ranking ${body.creators.length} creators for campaign ${body.campaign.campaign_id}`);
    
    const rankedCreators = await this.aiService.rankCreatorsForCampaign(
      body.creators,
      body.campaign,
      body.top_k || 20,
    );

    return {
      success: true,
      data: {
        ranked_creators: rankedCreators,
        total: rankedCreators.length,
      },
    };
  }

  /**
   * Get explanation for a match
   */
  @Post('explain')
  @UseGuards(JwtAuthGuard)
  async explainMatch(
    @Body() body: { creator: CreatorProfile; campaign: CampaignDetails },
  ): Promise<{ success: boolean; data: any }> {
    this.logger.log(`Explaining match for creator ${body.creator.creator_id}`);
    
    const explanation = await this.aiService.explainMatch(
      body.creator,
      body.campaign,
    );

    return {
      success: true,
      data: explanation,
    };
  }

  /**
   * Health check for ML API
   */
  @Get('health')
  async checkHealth(): Promise<{ success: boolean; data: { ml_api_status: string; fallback_enabled: boolean } }> {
    const isHealthy = await this.aiService.checkHealth();
    
    return {
      success: true,
      data: {
        ml_api_status: isHealthy ? 'healthy' : 'unavailable',
        fallback_enabled: true,
      },
    };
  }
}
