import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Campaign, CampaignStatus } from './entities/campaign.entity';
import { CreateCampaignDto } from './dto/create-campaign.dto';
import { UpdateCampaignDto } from './dto/update-campaign.dto';
import { PaginationDto, PaginatedResponse } from '../common/dto/pagination.dto';

@Injectable()
export class CampaignsService {
  constructor(
    @InjectRepository(Campaign)
    private campaignsRepository: Repository<Campaign>,
  ) {}

  async create(brandId: string, createCampaignDto: CreateCampaignDto): Promise<Campaign> {
    const campaign = this.campaignsRepository.create({
      brand_id: brandId,
      ...createCampaignDto,
    });
    return this.campaignsRepository.save(campaign);
  }

  async findAll(pagination?: PaginationDto): Promise<PaginatedResponse<Campaign>> {
    const page = pagination?.page ?? 1;
    const pageSize = pagination?.pageSize ?? 20;
    const skip = (page - 1) * pageSize;

    const [data, totalCount] = await this.campaignsRepository.findAndCount({
      relations: ['brand', 'brand.user'],
      order: { created_at: 'DESC' },
      skip,
      take: pageSize,
    });

    return new PaginatedResponse(data, totalCount, page, pageSize);
  }

  async findByBrand(brandId: string): Promise<Campaign[]> {
    return this.campaignsRepository.find({
      where: { brand_id: brandId },
      relations: ['brand'],
      order: { created_at: 'DESC' },
    });
  }

  async findOne(id: string): Promise<Campaign> {
    const campaign = await this.campaignsRepository.findOne({
      where: { id },
      relations: ['brand', 'brand.user'],
    });
    
    if (!campaign) {
      throw new NotFoundException(`Campaign with ID ${id} not found`);
    }
    
    return campaign;
  }

  async update(id: string, updateCampaignDto: UpdateCampaignDto): Promise<Campaign> {
    const campaign = await this.findOne(id);
    Object.assign(campaign, updateCampaignDto);
    return this.campaignsRepository.save(campaign);
  }

  async remove(id: string): Promise<void> {
    const campaign = await this.findOne(id);
    campaign.status = CampaignStatus.CANCELLED;
    await this.campaignsRepository.save(campaign);
  }

  async findActive(pagination?: PaginationDto): Promise<PaginatedResponse<Campaign>> {
    const page = pagination?.page ?? 1;
    const pageSize = pagination?.pageSize ?? 20;
    const skip = (page - 1) * pageSize;

    const [data, totalCount] = await this.campaignsRepository.findAndCount({
      where: { status: CampaignStatus.ACTIVE },
      relations: ['brand'],
      order: { created_at: 'DESC' },
      skip,
      take: pageSize,
    });

    return new PaginatedResponse(data, totalCount, page, pageSize);
  }

  async search(query: string, pagination?: PaginationDto): Promise<PaginatedResponse<Campaign>> {
    const page = pagination?.page ?? 1;
    const pageSize = pagination?.pageSize ?? 20;
    const skip = (page - 1) * pageSize;

    const qb = this.campaignsRepository
      .createQueryBuilder('campaign')
      .leftJoinAndSelect('campaign.brand', 'brand')
      .where('campaign.title ILIKE :query', { query: `%${query}%` })
      .orWhere('campaign.description ILIKE :query', { query: `%${query}%` })
      .orWhere('campaign.category ILIKE :query', { query: `%${query}%` })
      .orderBy('campaign.created_at', 'DESC')
      .skip(skip)
      .take(pageSize);

    const [data, totalCount] = await qb.getManyAndCount();
    return new PaginatedResponse(data, totalCount, page, pageSize);
  }
}
