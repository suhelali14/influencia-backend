import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CreatorsService } from './creators.service';
import { CreatorsController } from './creators.controller';
import { Creator } from './entities/creator.entity';
import { Collaboration } from '../campaigns/entities/collaboration.entity';
import { Campaign } from '../campaigns/entities/campaign.entity';
import { AIAnalysisReport } from '../matching/entities/ai-analysis-report.entity';
import { MatchingModule } from '../matching/matching.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Creator, Collaboration, Campaign, AIAnalysisReport]),
    MatchingModule,
  ],
  controllers: [CreatorsController],
  providers: [CreatorsService],
  exports: [CreatorsService],
})
export class CreatorsModule {}
