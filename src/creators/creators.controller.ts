import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Query, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { CreatorsService } from './creators.service';
import { CreateCreatorDto } from './dto/create-creator.dto';
import { UpdateCreatorDto } from './dto/update-creator.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('creators')
@Controller('creators')
export class CreatorsController {
  constructor(private readonly creatorsService: CreatorsService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create creator profile' })
  create(@Request() req, @Body() createCreatorDto: CreateCreatorDto) {
    return this.creatorsService.create(req.user.userId, createCreatorDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all creators' })
  findAll() {
    return this.creatorsService.findAll();
  }

  @Get('search')
  @ApiOperation({ summary: 'Search creators' })
  search(@Query('q') query: string) {
    return this.creatorsService.search(query);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get my creator profile' })
  findMe(@Request() req) {
    return this.creatorsService.findByUserId(req.user.userId);
  }

  @Get('me/stats')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get creator dashboard statistics' })
  getMyStats(@Request() req) {
    return this.creatorsService.getCreatorStats(req.user.userId);
  }

  @Get('me/collaborations')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get creator collaborations' })
  getMyCollaborations(
    @Request() req,
    @Query('limit') limit?: string,
    @Query('recent') recent?: string,
  ) {
    return this.creatorsService.getCreatorCollaborations(
      req.user.userId,
      limit ? parseInt(limit) : 100,
      recent === 'true',
    );
  }

  @Get('me/recommended-campaigns')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get AI-powered campaign recommendations' })
  getRecommendedCampaigns(@Request() req) {
    return this.creatorsService.getRecommendedCampaigns(req.user.userId);
  }

  @Get('collaborations/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get collaboration detail' })
  getCollaborationDetail(@Request() req, @Param('id') collaborationId: string) {
    return this.creatorsService.getCollaborationDetail(req.user.userId, collaborationId);
  }

  @Post('collaborations/:id/accept')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Accept collaboration' })
  acceptCollaboration(
    @Request() req,
    @Param('id') collaborationId: string,
    @Body() body: { counter_offer?: number },
  ) {
    return this.creatorsService.acceptCollaboration(
      req.user.userId,
      collaborationId,
      body.counter_offer,
    );
  }

  @Post('collaborations/:id/reject')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Reject collaboration' })
  rejectCollaboration(
    @Request() req,
    @Param('id') collaborationId: string,
    @Body() body: { reason: string },
  ) {
    if (!body.reason || body.reason.trim().length === 0) {
      throw new Error('Reason is required');
    }
    return this.creatorsService.rejectCollaboration(
      req.user.userId,
      collaborationId,
      body.reason,
    );
  }

  @Post('collaborations/:id/generate-ai-report')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Generate AI-powered analysis report for creator' })
  generateAIReport(@Request() req, @Param('id') collaborationId: string) {
    return this.creatorsService.generateAIReport(req.user.userId, collaborationId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get creator by ID' })
  findOne(@Param('id') id: string) {
    return this.creatorsService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update creator profile' })
  update(@Param('id') id: string, @Body() updateCreatorDto: UpdateCreatorDto) {
    return this.creatorsService.update(id, updateCreatorDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete creator profile' })
  remove(@Param('id') id: string) {
    return this.creatorsService.remove(id);
  }
}
