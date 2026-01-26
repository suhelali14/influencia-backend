import { Entity, Column, ManyToOne, JoinColumn, OneToOne } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { Tenant } from '../../common/entities/tenant.entity';
import { Exclude } from 'class-transformer';

@Entity('users')
export class User extends BaseEntity {
  @ManyToOne(() => Tenant, (tenant) => tenant.users, { nullable: true })
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;

  @Column({ type: 'uuid', nullable: true })
  tenant_id: string;

  @Column({ unique: true })
  email: string;

  @Column({ nullable: true })
  phone: string;

  @Column()
  @Exclude()
  password_hash: string;

  @Column({
    type: 'enum',
    enum: ['creator', 'brand_admin', 'brand_member', 'platform_admin'],
  })
  role: string;

  @Column({ type: 'enum', enum: ['active', 'inactive', 'suspended'], default: 'active' })
  status: string;

  @Column({ default: false })
  email_verified: boolean;

  @Column({ default: false })
  phone_verified: boolean;

  @Column({ type: 'timestamp', nullable: true })
  last_login_at: Date | null;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @Column({ nullable: true })
  first_name: string;

  @Column({ nullable: true })
  last_name: string;

  @Column({ nullable: true })
  avatar_url: string;
}
