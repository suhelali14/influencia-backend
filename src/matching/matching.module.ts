import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MatchingService } from './matching.service';
import { MatchingController } from './matching.controller';
import { AIPythonService } from './ai-python.service';
import { PdfGenerationService } from './pdf-generation.service';
import { Creator } from '../creators/entities/creator.entity';
import { Campaign } from '../campaigns/entities/campaign.entity';
import { Collaboration } from '../campaigns/entities/collaboration.entity';
import { AIAnalysisReport } from './entities/ai-analysis-report.entity';
import { AiModule } from '../ai/ai.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Creator, Campaign, Collaboration, AIAnalysisReport]),
    AiModule,
  ],
  controllers: [MatchingController],
  providers: [MatchingService, AIPythonService, PdfGenerationService],
  exports: [MatchingService, AIPythonService, PdfGenerationService],
})
export class MatchingModule {}
