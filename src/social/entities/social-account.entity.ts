import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Creator } from '../../creators/entities/creator.entity';

export enum SocialPlatform {
  INSTAGRAM = 'instagram',
  YOUTUBE = 'youtube',
  TIKTOK = 'tiktok',
  TWITTER = 'twitter',
}

@Entity('social_accounts')
export class SocialAccount {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  creator_id: string;

  @ManyToOne(() => Creator)
  @JoinColumn({ name: 'creator_id' })
  creator: Creator;

  @Column({ type: 'enum', enum: SocialPlatform })
  platform: SocialPlatform;

  @Column()
  platform_user_id: string;

  @Column()
  username: string;

  @Column({ nullable: true })
  access_token: string;

  @Column({ nullable: true })
  refresh_token: string;

  @Column({ type: 'timestamp', nullable: true })
  token_expires_at: Date | null;

  @Column({ type: 'int', default: 0 })
  followers_count: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  engagement_rate: number;

  @Column({ type: 'jsonb', nullable: true })
  metrics: {
    posts?: number;
    avg_likes?: number;
    avg_comments?: number;
    avg_views?: number;
  } | null;

  @Column({ default: true })
  is_connected: boolean;

  @Column({ type: 'timestamp', nullable: true })
  last_synced_at: Date;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
