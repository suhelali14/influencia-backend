import { IsString, IsOptional, IsArray, IsObject } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateCreatorDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  bio?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  location?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  avatar_url?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsObject()
  social_links?: {
    instagram?: string;
    youtube?: string;
    tiktok?: string;
    twitter?: string;
  };

  @ApiProperty({ required: false, type: [String] })
  @IsOptional()
  @IsArray()
  categories?: string[];

  @ApiProperty({ required: false, type: [String] })
  @IsOptional()
  @IsArray()
  languages?: string[];
}
