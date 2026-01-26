import { IsString, IsEnum, IsNumber, IsDateString, IsOptional, IsObject } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Platform } from '../entities/campaign.entity';

export class CreateCampaignDto {
  @ApiProperty()
  @IsString()
  title: string;

  @ApiProperty()
  @IsString()
  description: string;

  @ApiProperty({ enum: Platform })
  @IsEnum(Platform)
  platform: Platform;

  @ApiProperty()
  @IsString()
  category: string;

  @ApiProperty()
  @IsNumber()
  budget: number;

  @ApiProperty()
  @IsDateString()
  start_date: string;

  @ApiProperty()
  @IsDateString()
  end_date: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsObject()
  requirements?: {
    min_followers?: number;
    min_engagement_rate?: number;
    content_types?: string[];
    deliverables?: string[];
  };

  @ApiProperty({ required: false })
  @IsOptional()
  @IsObject()
  target_audience?: {
    age_range?: string;
    gender?: string;
    locations?: string[];
    interests?: string[];
  };
}
