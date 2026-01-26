import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { Campaign } from './campaign.entity';
import { Creator } from '../../creators/entities/creator.entity';

export enum CollaborationStatus {
  PENDING = 'pending',
  ACCEPTED = 'accepted',
  REJECTED = 'rejected',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

@Entity('collaborations')
export class Collaboration {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  campaign_id: string;

  @Column({ type: 'uuid' })
  creator_id: string;

  @Column({
    type: 'enum',
    enum: CollaborationStatus,
    default: CollaborationStatus.PENDING,
  })
  status: CollaborationStatus;

  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  proposed_budget: number;

  @Column({ type: 'text', nullable: true })
  message: string;

  @Column({ type: 'jsonb', nullable: true })
  deliverables: any;

  @Column({ type: 'timestamp', nullable: true })
  deadline: Date;

  @Column({ type: 'text', nullable: true })
  rejection_reason: string;

  @Column({ type: 'jsonb', nullable: true })
  submitted_content: any;

  @Column({ type: 'boolean', default: false })
  payment_completed: boolean;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @ManyToOne(() => Campaign, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'campaign_id' })
  campaign: Campaign;

  @ManyToOne(() => Creator, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'creator_id' })
  creator: Creator;
}
