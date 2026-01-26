import { Entity, Column, OneToMany } from 'typeorm';
import { BaseEntity } from './base.entity';
import { User } from '../../auth/entities/user.entity';

@Entity('tenants')
export class Tenant extends BaseEntity {
  @Column({ unique: true })
  name: string;

  @Column({ unique: true })
  slug: string;

  @Column({ type: 'enum', enum: ['active', 'suspended', 'trial'], default: 'trial' })
  status: string;

  @Column({ type: 'enum', enum: ['basic', 'pro', 'enterprise'], default: 'basic' })
  plan: string;

  @Column({ type: 'jsonb', nullable: true })
  settings: Record<string, any>;

  @Column({ type: 'timestamp', nullable: true })
  trial_ends_at: Date | null;

  @OneToMany(() => User, (user) => user.tenant)
  users: User[];
}
