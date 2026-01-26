/**
 * AI Module
 * Handles ML-powered creator-campaign matching
 */

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AiMatchingService } from './ai-matching.service';
import { AiController } from './ai.controller';

@Module({
  imports: [ConfigModule],
  providers: [AiMatchingService],
  controllers: [AiController],
  exports: [AiMatchingService],
})
export class AiModule {}
