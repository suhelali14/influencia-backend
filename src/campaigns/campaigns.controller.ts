import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Request, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { CampaignsService } from './campaigns.service';
import { CreateCampaignDto } from './dto/create-campaign.dto';
import { UpdateCampaignDto } from './dto/update-campaign.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { BrandsService } from '../brands/brands.service';
import { PaginationDto } from '../common/dto/pagination.dto';

@ApiTags('campaigns')
@Controller('campaigns')
export class CampaignsController {
  constructor(
    private readonly campaignsService: CampaignsService,
    private readonly brandsService: BrandsService,
  ) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new campaign' })
  async create(@Request() req, @Body() createCampaignDto: CreateCampaignDto) {
    // Get the brand profile for the authenticated user
    const brand = await this.brandsService.findByUserId(req.user.userId);
    return this.campaignsService.create(brand.id, createCampaignDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all campaigns (paginated)' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'pageSize', required: false, type: Number })
  findAll(
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    const pagination = new PaginationDto();
    if (page) pagination.page = parseInt(page, 10) || 1;
    if (pageSize) pagination.pageSize = Math.min(parseInt(pageSize, 10) || 20, 100);
    return this.campaignsService.findAll(pagination);
  }

  @Get('active')
  @ApiOperation({ summary: 'Get active campaigns (paginated)' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'pageSize', required: false, type: Number })
  findActive(
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    const pagination = new PaginationDto();
    if (page) pagination.page = parseInt(page, 10) || 1;
    if (pageSize) pagination.pageSize = Math.min(parseInt(pageSize, 10) || 20, 100);
    return this.campaignsService.findActive(pagination);
  }

  @Get('search')
  @ApiOperation({ summary: 'Search campaigns (paginated)' })
  @ApiQuery({ name: 'q', required: true, type: String })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'pageSize', required: false, type: Number })
  search(
    @Query('q') query: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    const pagination = new PaginationDto();
    if (page) pagination.page = parseInt(page, 10) || 1;
    if (pageSize) pagination.pageSize = Math.min(parseInt(pageSize, 10) || 20, 100);
    return this.campaignsService.search(query, pagination);
  }

  @Get('brand/:brandId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get campaigns by brand' })
  findByBrand(@Param('brandId') brandId: string) {
    return this.campaignsService.findByBrand(brandId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get campaign by ID' })
  findOne(@Param('id') id: string) {
    return this.campaignsService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update campaign' })
  update(@Param('id') id: string, @Body() updateCampaignDto: UpdateCampaignDto) {
    return this.campaignsService.update(id, updateCampaignDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete campaign' })
  remove(@Param('id') id: string) {
    return this.campaignsService.remove(id);
  }
}
