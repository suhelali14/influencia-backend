import { Controller, Get, Query, UseGuards, Request, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AnalyticsService } from './analytics.service';

@ApiTags('analytics')
@Controller('analytics')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('overview')
  @ApiOperation({ summary: 'Get comprehensive analytics overview' })
  getOverview(@Request() req) {
    return this.analyticsService.getCreatorAnalytics(req.user.userId);
  }

  @Get('platform/:platform')
  @ApiOperation({ summary: 'Get analytics for a specific platform' })
  getPlatformAnalytics(
    @Request() req,
    @Param('platform') platform: string,
  ) {
    return this.analyticsService.getPlatformAnalytics(req.user.userId, platform);
  }

  @Get('campaigns')
  @ApiOperation({ summary: 'Get campaign analytics' })
  @ApiQuery({ name: 'campaignId', required: false })
  getCampaignAnalytics(
    @Request() req,
    @Query('campaignId') campaignId?: string,
  ) {
    return this.analyticsService.getCampaignAnalytics(req.user.userId, campaignId);
  }

  @Get('earnings')
  @ApiOperation({ summary: 'Get earnings analytics' })
  @ApiQuery({ name: 'period', required: false, enum: ['week', 'month', 'year', 'all'] })
  getEarningsAnalytics(
    @Request() req,
    @Query('period') period?: 'week' | 'month' | 'year' | 'all',
  ) {
    return this.analyticsService.getEarningsAnalytics(req.user.userId, period);
  }
}
