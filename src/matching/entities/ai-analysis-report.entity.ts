import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { Campaign } from '../../campaigns/entities/campaign.entity';
import { Creator } from '../../creators/entities/creator.entity';

@Entity('ai_analysis_reports')
export class AIAnalysisReport {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'campaign_id', type: 'uuid' })
  campaign_id: string;

  @Column({ name: 'creator_id', type: 'uuid' })
  creator_id: string;

  @ManyToOne(() => Campaign, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'campaign_id' })
  campaign: Campaign;

  @ManyToOne(() => Creator, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'creator_id' })
  creator: Creator;

  // Match scores and predictions
  @Column('decimal', { precision: 5, scale: 2, name: 'match_score', default: 0 })
  match_score: number;

  @Column('decimal', { precision: 5, scale: 2, name: 'ml_match_score', nullable: true })
  ml_match_score: number;

  @Column('decimal', { precision: 5, scale: 2, name: 'dl_match_score', nullable: true })
  dl_match_score: number;

  @Column('decimal', { precision: 6, scale: 2, name: 'estimated_roi', nullable: true })
  estimated_roi: number;

  @Column('decimal', { precision: 4, scale: 3, name: 'success_probability', nullable: true })
  success_probability: number;

  @Column('decimal', { precision: 5, scale: 2, name: 'predicted_engagement', nullable: true })
  predicted_engagement: number;

  @Column('decimal', { precision: 5, scale: 2, name: 'audience_overlap', nullable: true })
  audience_overlap: number;

  // Analysis components
  @Column('jsonb', { nullable: true })
  strengths: string[];

  @Column('jsonb', { nullable: true })
  concerns: string[];

  @Column('jsonb', { nullable: true })
  reasons: string[];

  // AI-generated content
  @Column('text', { name: 'ai_summary', nullable: true })
  ai_summary: string;

  @Column('jsonb', { name: 'ai_recommendations', nullable: true })
  ai_recommendations: string[];

  @Column('text', { name: 'full_report', nullable: true })
  full_report: string;

  @Column('jsonb', { name: 'risk_assessment', nullable: true })
  risk_assessment: {
    risk_level: string;
    risk_factors: string[];
    mitigation_strategies: string[];
  };

  // Metadata
  @Column({ name: 'model_version', nullable: true, length: 50 })
  model_version: string;

  @Column({ name: 'confidence_level', nullable: true, length: 20 })
  confidence_level: string;

  @Column('jsonb', { name: 'features_used', nullable: true })
  features_used: any;

  @CreateDateColumn({ name: 'created_at' })
  created_at: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updated_at: Date;
}
