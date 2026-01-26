import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Brand } from './entities/brand.entity';
import { CreateBrandDto } from './dto/create-brand.dto';
import { UpdateBrandDto } from './dto/update-brand.dto';

@Injectable()
export class BrandsService {
  constructor(
    @InjectRepository(Brand)
    private brandsRepository: Repository<Brand>,
  ) {}

  async create(userId: string, createBrandDto: CreateBrandDto): Promise<Brand> {
    const brand = this.brandsRepository.create({
      user_id: userId,
      ...createBrandDto,
    });
    return this.brandsRepository.save(brand);
  }

  async findAll(): Promise<Brand[]> {
    return this.brandsRepository.find({
      relations: ['user'],
      where: { is_active: true },
    });
  }

  async findOne(id: string): Promise<Brand> {
    const brand = await this.brandsRepository.findOne({
      where: { id },
      relations: ['user'],
    });
    
    if (!brand) {
      throw new NotFoundException(`Brand with ID ${id} not found`);
    }
    
    return brand;
  }

  async findByUserId(userId: string): Promise<Brand> {
    const brand = await this.brandsRepository.findOne({
      where: { user_id: userId },
      relations: ['user'],
    });
    
    if (!brand) {
      throw new NotFoundException(`Brand profile not found for user ${userId}`);
    }
    
    return brand;
  }

  async update(id: string, updateBrandDto: UpdateBrandDto): Promise<Brand> {
    const brand = await this.findOne(id);
    Object.assign(brand, updateBrandDto);
    return this.brandsRepository.save(brand);
  }

  async remove(id: string): Promise<void> {
    const brand = await this.findOne(id);
    brand.is_active = false;
    await this.brandsRepository.save(brand);
  }
}
