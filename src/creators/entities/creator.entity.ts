import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, OneToOne, OneToMany, JoinColumn } from 'typeorm';
import { User } from '../../auth/entities/user.entity';

@Entity('creators')
export class Creator {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  user_id: string;

  @OneToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ nullable: true })
  bio: string;

  @Column({ nullable: true })
  phone: string;

  @Column({ nullable: true })
  location: string;

  @Column({ nullable: true })
  avatar_url: string;

  @Column({ type: 'jsonb', nullable: true })
  social_links: {
    instagram?: string;
    youtube?: string;
    tiktok?: string;
    twitter?: string;
  };

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  overall_rating: number;

  @Column({ type: 'int', default: 0 })
  total_campaigns: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  total_earnings: number;

  @Column({ type: 'varchar', array: true, default: '{}' })
  categories: string[];

  @Column({ type: 'varchar', array: true, default: '{}' })
  languages: string[];

  @Column({ default: true })
  is_active: boolean;

  @Column({ default: false })
  is_verified: boolean;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
