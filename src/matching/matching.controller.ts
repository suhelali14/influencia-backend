import { Controller, Get, Post, Body, Param, UseGuards, Res, StreamableFile } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import type { Response } from 'express';
import { MatchingService } from './matching.service';
import { AIPythonService } from './ai-python.service';
import { PdfGenerationService } from './pdf-generation.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('matching')
@Controller('matching')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class MatchingController {
  constructor(
    private readonly matchingService: MatchingService,
    private readonly aiService: AIPythonService,
    private readonly pdfService: PdfGenerationService,
  ) {}

  @Get('campaign/:campaignId/creators')
  @ApiOperation({ summary: 'Find matching creators for campaign' })
  async findMatchingCreators(@Param('campaignId') campaignId: string): Promise<any> {
    return this.matchingService.findMatchingCreators(campaignId);
  }

  @Get('campaign/:campaignId/creator/:creatorId/analysis')
  @ApiOperation({ summary: 'Get detailed creator analysis for campaign' })
  getDetailedAnalysis(
    @Param('campaignId') campaignId: string,
    @Param('creatorId') creatorId: string,
  ) {
    return this.matchingService.getDetailedCreatorAnalysis(campaignId, creatorId);
  }

  @Post('campaign/:campaignId/creator/:creatorId/request')
  @ApiOperation({ summary: 'Send collaboration request to creator' })
  sendCollaborationRequest(
    @Param('campaignId') campaignId: string,
    @Param('creatorId') creatorId: string,
    @Body() data: { proposed_budget?: number; message?: string; deliverables?: any; deadline?: Date },
  ) {
    return this.matchingService.createCollaborationRequest(campaignId, creatorId, data);
  }

  @Get('campaign/:campaignId/collaborations')
  @ApiOperation({ summary: 'Get all collaboration requests for campaign' })
  getCollaborations(@Param('campaignId') campaignId: string) {
    return this.matchingService.getCollaborationsByCampaign(campaignId);
  }

  @Get('creator/:creatorId/campaigns')
  @ApiOperation({ summary: 'Get recommended campaigns for creator' })
  getRecommendedCampaigns(@Param('creatorId') creatorId: string) {
    return this.matchingService.getRecommendedCampaigns(creatorId);
  }

  @Get('campaign/:campaignId/creator/:creatorId/ai-analysis')
  @ApiOperation({ summary: 'Get AI-powered comprehensive analysis' })
  async getAIAnalysis(
    @Param('campaignId') campaignId: string,
    @Param('creatorId') creatorId: string,
  ) {
    return this.matchingService.getAIAnalysis(campaignId, creatorId);
  }

  @Post('campaign/:campaignId/creator/:creatorId/generate-report')
  @ApiOperation({ summary: 'Generate AI-powered report with Gemini' })
  async generateAIReport(
    @Param('campaignId') campaignId: string,
    @Param('creatorId') creatorId: string,
  ) {
    return this.matchingService.generateAIReport(campaignId, creatorId);
  }

  @Get('campaign/:campaignId/ai-reports')
  @ApiOperation({ summary: 'Get all AI analysis reports for campaign' })
  async getAIReports(@Param('campaignId') campaignId: string) {
    return this.matchingService.getAIReportsByCampaign(campaignId);
  }

  @Get('campaign/:campaignId/creator/:creatorId/download-report')
  @ApiOperation({ summary: 'Download comprehensive AI-powered PDF report' })
  async downloadPDFReport(
    @Param('campaignId') campaignId: string,
    @Param('creatorId') creatorId: string,
    @Res() res: Response,
  ) {
    // Get detailed analysis data
    const analysisData = await this.matchingService.getDetailedCreatorAnalysis(campaignId, creatorId);
    
    // Generate PDF
    const pdfBuffer = await this.pdfService.generateComprehensiveReport(analysisData);
    
    // Set response headers
    const creatorName = `${analysisData.creator.user?.first_name || 'Creator'}_${analysisData.creator.user?.last_name || 'Report'}`.replace(/\s+/g, '_');
    const filename = `Influencia_AI_Report_${creatorName}_${new Date().toISOString().split('T')[0]}.pdf`;
    
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': pdfBuffer.length,
    });
    
    res.send(pdfBuffer);
  }
}
