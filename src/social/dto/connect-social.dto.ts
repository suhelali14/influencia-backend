import { IsEnum, IsString, IsOptional, IsNumber, IsObject, IsDate } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { SocialPlatform } from '../entities/social-account.entity';

export class ConnectSocialDto {
  @ApiProperty({ enum: SocialPlatform })
  @IsEnum(SocialPlatform)
  platform: SocialPlatform;

  @ApiProperty()
  @IsString()
  access_token: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  refresh_token?: string;

  @ApiProperty()
  @IsString()
  platform_user_id: string;

  @ApiProperty()
  @IsString()
  username: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  followers_count?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  engagement_rate?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsObject()
  metrics?: {
    posts?: number;
    avg_likes?: number;
    avg_comments?: number;
    avg_views?: number;
  };
}

/**
 * DTO for OAuth-based connection (used internally after OAuth callback)
 */
export class OAuthConnectDto {
  @IsEnum(SocialPlatform)
  platform: SocialPlatform;

  @IsString()
  platform_user_id: string;

  @IsString()
  username: string;

  @IsString()
  access_token: string;

  @IsOptional()
  @IsString()
  refresh_token?: string;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  token_expires_at?: Date;

  @IsOptional()
  @IsNumber()
  followers_count?: number;

  @IsOptional()
  @IsNumber()
  engagement_rate?: number;

  @IsOptional()
  @IsObject()
  metrics?: Record<string, any>;
}

/**
 * DTO for OAuth callback query parameters
 */
export class OAuthCallbackDto {
  @IsString()
  code: string;

  @IsString()
  state: string;

  @IsOptional()
  @IsString()
  error?: string;

  @IsOptional()
  @IsString()
  error_reason?: string;

  @IsOptional()
  @IsString()
  error_description?: string;
}
