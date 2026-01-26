import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { SocialService } from './social.service';
import { SocialController } from './social.controller';
import { SocialAccount } from './entities/social-account.entity';
import { MetricsHistory } from './entities/metrics-history.entity';

// OAuth services
import { OAuthModule } from './oauth/oauth.module';
import { OAuthController } from './oauth/oauth.controller';
import { OAuthStateService } from './oauth/oauth-state.service';
import { InstagramOAuthService } from './oauth/instagram-oauth.service';
import { YouTubeOAuthService } from './oauth/youtube-oauth.service';
import { TikTokOAuthService } from './oauth/tiktok-oauth.service';

// Platform API services
import { InstagramApiService } from './platforms/instagram-api.service';
import { YouTubeApiService } from './platforms/youtube-api.service';
import { TikTokApiService } from './platforms/tiktok-api.service';

// Sync services
import { MetricsSyncService } from './sync/metrics-sync.service';
import { MetricsNormalizerService } from './sync/metrics-normalizer.service';

// Security
import { TokenEncryptionService } from './security/token-encryption.service';

// Creators module for looking up creator by user ID
import { CreatorsModule } from '../creators/creators.module';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([SocialAccount, MetricsHistory]),
    forwardRef(() => CreatorsModule),
  ],
  controllers: [SocialController, OAuthController],
  providers: [
    // Core service
    SocialService,
    
    // OAuth services
    OAuthStateService,
    InstagramOAuthService,
    YouTubeOAuthService,
    TikTokOAuthService,
    
    // Platform API services
    InstagramApiService,
    YouTubeApiService,
    TikTokApiService,
    
    // Sync services
    MetricsSyncService,
    MetricsNormalizerService,
    
    // Security
    TokenEncryptionService,
  ],
  exports: [
    SocialService,
    MetricsSyncService,
    MetricsNormalizerService,
    TokenEncryptionService,
    InstagramApiService,
    YouTubeApiService,
    TikTokApiService,
  ],
})
export class SocialModule {}
