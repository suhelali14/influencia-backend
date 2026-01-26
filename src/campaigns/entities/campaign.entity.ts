import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Brand } from '../../brands/entities/brand.entity';

export enum CampaignStatus {
  DRAFT = 'draft',
  ACTIVE = 'active',
  PAUSED = 'paused',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

export enum Platform {
  INSTAGRAM = 'instagram',
  YOUTUBE = 'youtube',
  TIKTOK = 'tiktok',
  TWITTER = 'twitter',
}

@Entity('campaigns')
export class Campaign {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  brand_id: string;

  @ManyToOne(() => Brand)
  @JoinColumn({ name: 'brand_id' })
  brand: Brand;

  @Column()
  title: string;

  @Column({ type: 'text' })
  description: string;

  @Column({ type: 'enum', enum: Platform })
  platform: Platform;

  @Column()
  category: string;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  budget: number;

  @Column({ type: 'timestamp' })
  start_date: Date;

  @Column({ type: 'timestamp' })
  end_date: Date;

  @Column({ type: 'enum', enum: CampaignStatus, default: CampaignStatus.DRAFT })
  status: CampaignStatus;

  @Column({ type: 'jsonb', nullable: true })
  requirements: {
    min_followers?: number;
    min_engagement_rate?: number;
    content_types?: string[];
    deliverables?: string[];
  };

  @Column({ type: 'jsonb', nullable: true })
  target_audience: {
    age_range?: string;
    gender?: string;
    locations?: string[];
    interests?: string[];
  };

  @Column({ type: 'int', default: 0 })
  total_creators: number;

  @Column({ type: 'int', default: 0 })
  total_reach: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  total_spent: number;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
