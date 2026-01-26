import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';
import { Creator } from '../creators/entities/creator.entity';
import { SocialAccount } from '../social/entities/social-account.entity';
import { Collaboration } from '../campaigns/entities/collaboration.entity';
import { Campaign } from '../campaigns/entities/campaign.entity';
import { CreatorsModule } from '../creators/creators.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Creator, SocialAccount, Collaboration, Campaign]),
    CreatorsModule,
  ],
  controllers: [AnalyticsController],
  providers: [AnalyticsService],
  exports: [AnalyticsService],
})
export class AnalyticsModule {}
