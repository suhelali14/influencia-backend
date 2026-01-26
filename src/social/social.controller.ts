import { Controller, Get, Post, Body, Param, Delete, UseGuards, Request, Query, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { SocialService } from './social.service';
import { MetricsSyncService } from './sync/metrics-sync.service';
import { ConnectSocialDto } from './dto/connect-social.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SocialPlatform } from './entities/social-account.entity';
import { CreatorsService } from '../creators/creators.service';

@ApiTags('social')
@Controller('social')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class SocialController {
  private readonly logger = new Logger(SocialController.name);

  constructor(
    private readonly socialService: SocialService,
    private readonly metricsSyncService: MetricsSyncService,
    private readonly creatorsService: CreatorsService,
  ) {}

  /**
   * Helper to get creator ID from user ID
   */
  private async getCreatorId(userId: string): Promise<string> {
    try {
      const creator = await this.creatorsService.findByUserId(userId);
      return creator.id;
    } catch (error) {
      this.logger.warn(`No creator found for user ${userId}, returning userId as fallback`);
      return userId; // Fallback to userId for backward compatibility
    }
  }

  @Post('connect')
  @ApiOperation({ summary: 'Connect social media account (manual)' })
  async connect(@Request() req, @Body() connectSocialDto: ConnectSocialDto) {
    const creatorId = await this.getCreatorId(req.user.userId);
    return this.socialService.connect(creatorId, connectSocialDto);
  }

  @Delete('disconnect/:platform')
  @ApiOperation({ summary: 'Disconnect social media account' })
  async disconnect(@Request() req, @Param('platform') platform: SocialPlatform) {
    const creatorId = await this.getCreatorId(req.user.userId);
    return this.socialService.disconnect(creatorId, platform);
  }

  @Get('accounts')
  @ApiOperation({ summary: 'Get connected social accounts' })
  async getAccounts(@Request() req) {
    const creatorId = await this.getCreatorId(req.user.userId);
    this.logger.log(`Fetching social accounts for creator ${creatorId} (user: ${req.user.userId})`);
    return this.socialService.findByCreator(creatorId);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get social media stats' })
  async getStats(@Request() req) {
    const creatorId = await this.getCreatorId(req.user.userId);
    return this.socialService.getStats(creatorId);
  }

  @Get('aggregated-stats')
  @ApiOperation({ summary: 'Get aggregated stats across all platforms' })
  async getAggregatedStats(@Request() req) {
    const creatorId = await this.getCreatorId(req.user.userId);
    return this.metricsSyncService.getAggregatedStats(creatorId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get social account by ID' })
  findOne(@Param('id') id: string) {
    return this.socialService.findOne(id);
  }

  // =====================================================
  // SYNC ENDPOINTS
  // =====================================================

  @Get('connected-platforms')
  @ApiOperation({ summary: 'Get list of connected platforms' })
  async getConnectedPlatforms(@Request() req) {
    const creatorId = await this.getCreatorId(req.user.userId);
    const accounts = await this.socialService.findByCreator(creatorId);
    
    return {
      connected: accounts
        .filter(a => a.is_connected)
        .map(a => ({
          platform: a.platform,
          username: a.username,
          last_synced_at: a.last_synced_at,
          followers_count: a.followers_count,
        })),
      disconnected: accounts
        .filter(a => !a.is_connected)
        .map(a => a.platform),
    };
  }

  @Post('sync/:platform')
  @ApiOperation({ summary: 'Sync metrics for a specific platform (must be connected)' })
  async syncPlatform(@Request() req, @Param('platform') platform: SocialPlatform) {
    const creatorId = await this.getCreatorId(req.user.userId);
    
    // First check if platform is connected
    const accounts = await this.socialService.findByCreator(creatorId);
    const account = accounts.find(a => a.platform === platform);
    
    if (!account) {
      return {
        success: false,
        platform,
        error: `${platform} is not linked to your account. Please connect it first.`,
        synced_at: new Date(),
      };
    }
    
    if (!account.is_connected) {
      return {
        success: false,
        platform,
        error: `${platform} account is disconnected. Please reconnect it.`,
        synced_at: new Date(),
      };
    }
    
    return this.metricsSyncService.syncPlatform(creatorId, platform);
  }

  @Post('sync/all')
  @ApiOperation({ summary: 'Sync metrics for all connected platforms' })
  async syncAll(@Request() req) {
    const creatorId = await this.getCreatorId(req.user.userId);
    
    // Get connected platforms first
    const accounts = await this.socialService.findByCreator(creatorId);
    const connectedAccounts = accounts.filter(a => a.is_connected);
    
    if (connectedAccounts.length === 0) {
      return {
        success: false,
        message: 'No social media platforms connected. Please connect at least one platform first.',
        results: [],
        connected_count: 0,
      };
    }
    
    const results = await this.metricsSyncService.syncAllPlatforms(creatorId);
    
    return {
      success: results.some(r => r.success),
      message: `Synced ${results.filter(r => r.success).length}/${results.length} platforms`,
      results,
      connected_count: connectedAccounts.length,
      connected_platforms: connectedAccounts.map(a => a.platform),
    };
  }

  @Get('metrics/history')
  @ApiOperation({ summary: 'Get historical metrics data' })
  @ApiQuery({ name: 'platform', required: false, enum: SocialPlatform })
  @ApiQuery({ name: 'days', required: false, type: Number })
  async getMetricsHistory(
    @Request() req,
    @Query('platform') platform?: SocialPlatform,
    @Query('days') days?: string,
  ) {
    const creatorId = await this.getCreatorId(req.user.userId);
    return this.metricsSyncService.getMetricsHistory(
      creatorId,
      platform,
      days ? parseInt(days) : 30,
    );
  }
}
