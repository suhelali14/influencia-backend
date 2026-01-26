import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, ManyToOne, JoinColumn, Index } from 'typeorm';
import { SocialAccount } from './social-account.entity';

@Entity('social_metrics_history')
@Index(['social_account_id', 'recorded_at'])
export class MetricsHistory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  social_account_id: string;

  @ManyToOne(() => SocialAccount, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'social_account_id' })
  social_account: SocialAccount;

  @Column({ type: 'int', default: 0 })
  followers_count: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  engagement_rate: number;

  @Column({ type: 'bigint', nullable: true })
  impressions: number;

  @Column({ type: 'bigint', nullable: true })
  reach: number;

  @Column({ type: 'int', nullable: true })
  avg_likes: number;

  @Column({ type: 'int', nullable: true })
  avg_comments: number;

  @Column({ type: 'int', nullable: true })
  avg_views: number;

  @Column({ type: 'int', nullable: true })
  quality_score: number;

  @Column({ type: 'timestamp' })
  recorded_at: Date;

  @CreateDateColumn()
  created_at: Date;
}
