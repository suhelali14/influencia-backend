import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { OAuthController } from './oauth.controller';
import { OAuthStateService } from './oauth-state.service';
import { InstagramOAuthService } from './instagram-oauth.service';
import { YouTubeOAuthService } from './youtube-oauth.service';
import { TikTokOAuthService } from './tiktok-oauth.service';
import { TokenEncryptionService } from '../security/token-encryption.service';

@Module({
  imports: [ConfigModule],
  controllers: [OAuthController],
  providers: [
    OAuthStateService,
    InstagramOAuthService,
    YouTubeOAuthService,
    TikTokOAuthService,
    TokenEncryptionService,
  ],
  exports: [
    OAuthStateService,
    InstagramOAuthService,
    YouTubeOAuthService,
    TikTokOAuthService,
    TokenEncryptionService,
  ],
})
export class OAuthModule {}
