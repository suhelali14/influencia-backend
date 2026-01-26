-- SafarCollab Initial Database Schema
-- Migration: 001_initial_schema
-- Description: Create core tables for multi-tenant influencer marketplace
-- Author: System
-- Date: 2025-11-06

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- TENANTS & USERS
-- ============================================================================

CREATE TABLE tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  type VARCHAR(50) NOT NULL CHECK (type IN ('brand', 'agency', 'platform_admin')),
  domain VARCHAR(255),
  subscription_tier VARCHAR(50) DEFAULT 'free',
  subscription_status VARCHAR(50) DEFAULT 'active',
  platform_cut_pct DECIMAL(5,2) DEFAULT 12.00,
  billing_email VARCHAR(255),
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  deleted_at TIMESTAMP
);

CREATE INDEX idx_tenants_type ON tenants(type);
CREATE INDEX idx_tenants_domain ON tenants(domain);

COMMENT ON TABLE tenants IS 'Multi-tenant organizations (brands, agencies)';
COMMENT ON COLUMN tenants.platform_cut_pct IS 'Default platform commission percentage for this tenant';

-- ============================================================================

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id),
  email VARCHAR(255) NOT NULL UNIQUE,
  phone VARCHAR(20),
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL CHECK (role IN ('creator', 'brand_admin', 'brand_member', 'platform_admin')),
  status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'pending_verification')),
  email_verified BOOLEAN DEFAULT FALSE,
  phone_verified BOOLEAN DEFAULT FALSE,
  last_login_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_tenant ON users(tenant_id);
CREATE INDEX idx_users_role ON users(role);

COMMENT ON TABLE users IS 'Unified user authentication table';

-- ============================================================================
-- CREATORS & BRANDS
-- ============================================================================

CREATE TABLE creators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  display_name VARCHAR(255),
  bio TEXT,
  profile_image_url TEXT,
  primary_platform VARCHAR(50),
  categories VARCHAR(100)[] DEFAULT '{}',
  languages VARCHAR(50)[] DEFAULT '{}',
  base_rate_inr DECIMAL(10,2),
  currency VARCHAR(3) DEFAULT 'INR',
  location_city VARCHAR(100),
  location_state VARCHAR(100),
  location_country VARCHAR(3) DEFAULT 'IN',
  kyc_status VARCHAR(50) DEFAULT 'pending' CHECK (kyc_status IN ('pending', 'submitted', 'verified', 'rejected')),
  kyc_documents JSONB DEFAULT '[]',
  tax_info JSONB DEFAULT '{}',
  payout_methods JSONB DEFAULT '[]',
  availability_status VARCHAR(50) DEFAULT 'available',
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_creators_user ON creators(user_id);
CREATE INDEX idx_creators_categories ON creators USING GIN(categories);
CREATE INDEX idx_creators_kyc_status ON creators(kyc_status);

COMMENT ON TABLE creators IS 'Influencer/creator profiles';
COMMENT ON COLUMN creators.tax_info IS 'Stores PAN, GST number, tax residency info';

-- ============================================================================

CREATE TABLE brands (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  logo_url TEXT,
  industry VARCHAR(100),
  website VARCHAR(255),
  description TEXT,
  company_size VARCHAR(50),
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_brands_tenant ON brands(tenant_id);

COMMENT ON TABLE brands IS 'Brand/advertiser profiles';

-- ============================================================================
-- SOCIAL ACCOUNTS & POSTS
-- ============================================================================

CREATE TABLE social_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID NOT NULL REFERENCES creators(id) ON DELETE CASCADE,
  platform VARCHAR(50) NOT NULL CHECK (platform IN ('instagram', 'youtube', 'tiktok', 'twitter', 'linkedin')),
  platform_user_id VARCHAR(255) NOT NULL,
  username VARCHAR(255) NOT NULL,
  display_name VARCHAR(255),
  profile_url TEXT,
  profile_image_url TEXT,
  follower_count BIGINT DEFAULT 0,
  following_count BIGINT DEFAULT 0,
  total_posts BIGINT DEFAULT 0,
  verified BOOLEAN DEFAULT FALSE,
  business_account BOOLEAN DEFAULT FALSE,
  access_token_encrypted TEXT,
  refresh_token_encrypted TEXT,
  token_expires_at TIMESTAMP,
  permissions_granted TEXT[] DEFAULT '{}',
  connection_status VARCHAR(50) DEFAULT 'active' CHECK (connection_status IN ('active', 'expired', 'revoked', 'error')),
  last_sync_at TIMESTAMP,
  next_sync_at TIMESTAMP,
  sync_frequency_hours INTEGER DEFAULT 24,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(creator_id, platform, platform_user_id)
);

CREATE INDEX idx_social_accounts_creator ON social_accounts(creator_id);
CREATE INDEX idx_social_accounts_platform ON social_accounts(platform);
CREATE INDEX idx_social_accounts_sync ON social_accounts(next_sync_at) WHERE connection_status = 'active';

COMMENT ON TABLE social_accounts IS 'Connected social media accounts for creators';
COMMENT ON COLUMN social_accounts.access_token_encrypted IS 'OAuth token encrypted with AWS KMS';

-- ============================================================================

CREATE TABLE posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  social_account_id UUID NOT NULL REFERENCES social_accounts(id) ON DELETE CASCADE,
  platform VARCHAR(50) NOT NULL,
  platform_post_id VARCHAR(255) NOT NULL,
  post_type VARCHAR(50) CHECK (post_type IN ('image', 'video', 'carousel', 'story', 'reel', 'short', 'live')),
  published_at TIMESTAMP NOT NULL,
  caption TEXT,
  hashtags VARCHAR(100)[] DEFAULT '{}',
  mentions VARCHAR(100)[] DEFAULT '{}',
  media_urls JSONB DEFAULT '[]',
  thumbnail_url TEXT,
  
  -- Normalized metrics
  views BIGINT DEFAULT 0,
  impressions BIGINT DEFAULT 0,
  reach BIGINT DEFAULT 0,
  likes BIGINT DEFAULT 0,
  comments BIGINT DEFAULT 0,
  shares BIGINT DEFAULT 0,
  saves BIGINT DEFAULT 0,
  clicks BIGINT DEFAULT 0,
  watch_time_seconds BIGINT DEFAULT 0,
  engagement_rate DECIMAL(5,4),
  
  audience_demographics JSONB DEFAULT '{}',
  
  raw_payload_url TEXT,
  raw_payload_hash VARCHAR(64),
  
  campaign_id UUID,
  is_sponsored BOOLEAN DEFAULT FALSE,
  disclosure_compliant BOOLEAN,
  
  metrics_last_updated_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(social_account_id, platform_post_id)
);

CREATE INDEX idx_posts_social_account ON posts(social_account_id);
CREATE INDEX idx_posts_published_at ON posts(published_at DESC);
CREATE INDEX idx_posts_campaign ON posts(campaign_id);
CREATE INDEX idx_posts_platform ON posts(platform);
CREATE INDEX idx_posts_engagement ON posts(engagement_rate DESC NULLS LAST);

COMMENT ON TABLE posts IS 'Normalized social media posts across all platforms';
COMMENT ON COLUMN posts.engagement_rate IS 'Calculated as (likes + comments + shares) / impressions';

-- ============================================================================

CREATE TABLE metrics_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  recorded_at TIMESTAMP NOT NULL DEFAULT NOW(),
  
  views BIGINT DEFAULT 0,
  impressions BIGINT DEFAULT 0,
  reach BIGINT DEFAULT 0,
  likes BIGINT DEFAULT 0,
  comments BIGINT DEFAULT 0,
  shares BIGINT DEFAULT 0,
  saves BIGINT DEFAULT 0,
  clicks BIGINT DEFAULT 0,
  watch_time_seconds BIGINT DEFAULT 0,
  
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_metrics_history_post ON metrics_history(post_id);
CREATE INDEX idx_metrics_history_recorded ON metrics_history(recorded_at DESC);

COMMENT ON TABLE metrics_history IS 'Time-series metrics snapshots for posts';

-- ============================================================================
-- CAMPAIGNS & OFFERS
-- ============================================================================

CREATE TABLE campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  created_by_user_id UUID NOT NULL REFERENCES users(id),
  
  title VARCHAR(255) NOT NULL,
  description TEXT,
  objective VARCHAR(100),
  
  budget_min_inr DECIMAL(12,2),
  budget_max_inr DECIMAL(12,2),
  currency VARCHAR(3) DEFAULT 'INR',
  
  start_date DATE,
  end_date DATE,
  application_deadline DATE,
  
  status VARCHAR(50) DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'paused', 'completed', 'cancelled')),
  
  target_demographics JSONB DEFAULT '{}',
  target_platforms VARCHAR(50)[] DEFAULT '{}',
  target_categories VARCHAR(100)[] DEFAULT '{}',
  min_follower_count BIGINT,
  max_follower_count BIGINT,
  required_engagement_rate DECIMAL(5,4),
  
  content_requirements JSONB DEFAULT '{}',
  hashtags_required VARCHAR(100)[] DEFAULT '{}',
  disclosure_required BOOLEAN DEFAULT TRUE,
  
  platform_cut_pct DECIMAL(5,2),
  auto_match_enabled BOOLEAN DEFAULT TRUE,
  
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_campaigns_brand ON campaigns(brand_id);
CREATE INDEX idx_campaigns_status ON campaigns(status);
CREATE INDEX idx_campaigns_dates ON campaigns(start_date, end_date);

COMMENT ON TABLE campaigns IS 'Brand campaigns seeking creator partnerships';

-- ============================================================================

CREATE TABLE campaign_offers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  creator_id UUID NOT NULL REFERENCES creators(id) ON DELETE CASCADE,
  
  state VARCHAR(50) DEFAULT 'pending' CHECK (state IN ('pending', 'accepted', 'declined', 'negotiating', 'completed', 'cancelled')),
  
  proposed_fee_inr DECIMAL(10,2) NOT NULL,
  negotiated_fee_inr DECIMAL(10,2),
  final_fee_inr DECIMAL(10,2),
  platform_cut_pct DECIMAL(5,2) NOT NULL,
  platform_fee_inr DECIMAL(10,2),
  creator_payout_inr DECIMAL(10,2),
  
  deliverables JSONB DEFAULT '[]',
  deliverables_submitted JSONB DEFAULT '[]',
  
  match_score DECIMAL(5,2),
  recommendation VARCHAR(50),
  recommendation_reasons JSONB DEFAULT '[]',
  estimated_reach BIGINT,
  estimated_engagement BIGINT,
  estimated_conversions INTEGER,
  
  offer_sent_at TIMESTAMP DEFAULT NOW(),
  accepted_at TIMESTAMP,
  declined_at TIMESTAMP,
  completed_at TIMESTAMP,
  deadline DATE,
  
  notes TEXT,
  creator_notes TEXT,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(campaign_id, creator_id)
);

CREATE INDEX idx_campaign_offers_campaign ON campaign_offers(campaign_id);
CREATE INDEX idx_campaign_offers_creator ON campaign_offers(creator_id);
CREATE INDEX idx_campaign_offers_state ON campaign_offers(state);

COMMENT ON TABLE campaign_offers IS 'Brand offers to creators for campaigns';

-- Add foreign key to posts table now that campaigns exists
ALTER TABLE posts ADD CONSTRAINT fk_posts_campaign 
  FOREIGN KEY (campaign_id) REFERENCES campaigns(id);

-- ============================================================================
-- MATCHING & SCORING
-- ============================================================================

CREATE TABLE match_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  creator_id UUID NOT NULL REFERENCES creators(id) ON DELETE CASCADE,
  
  total_score DECIMAL(5,2) NOT NULL,
  audience_fit_score DECIMAL(5,2),
  engagement_score DECIMAL(5,2),
  content_fit_score DECIMAL(5,2),
  authenticity_score DECIMAL(5,2),
  
  recommendation VARCHAR(50) CHECK (recommendation IN ('accept', 'consider', 'decline')),
  reasons JSONB DEFAULT '[]',
  
  estimated_reach BIGINT,
  estimated_engagement BIGINT,
  estimated_conversions INTEGER,
  estimated_cpm DECIMAL(10,2),
  estimated_cpe DECIMAL(10,2),
  
  generated_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP,
  
  UNIQUE(campaign_id, creator_id, generated_at)
);

CREATE INDEX idx_match_scores_campaign ON match_scores(campaign_id);
CREATE INDEX idx_match_scores_creator ON match_scores(creator_id);
CREATE INDEX idx_match_scores_score ON match_scores(total_score DESC);
CREATE INDEX idx_match_scores_generated ON match_scores(generated_at DESC);

COMMENT ON TABLE match_scores IS 'AI-generated match scores for campaign-creator pairs';

-- ============================================================================
-- PAYMENTS & INVOICES
-- ============================================================================

CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  offer_id UUID NOT NULL REFERENCES campaign_offers(id),
  
  payment_type VARCHAR(50) NOT NULL CHECK (payment_type IN ('escrow_deposit', 'creator_payout', 'platform_fee', 'refund')),
  
  amount_inr DECIMAL(12,2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'INR',
  
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'refunded')),
  
  provider VARCHAR(50),
  provider_transaction_id VARCHAR(255),
  provider_payment_method VARCHAR(100),
  provider_metadata JSONB DEFAULT '{}',
  
  escrow_held_amount DECIMAL(12,2),
  escrow_released_amount DECIMAL(12,2),
  escrow_status VARCHAR(50),
  
  initiated_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP,
  failed_at TIMESTAMP,
  
  failure_reason TEXT,
  notes TEXT,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_payments_offer ON payments(offer_id);
CREATE INDEX idx_payments_status ON payments(status);
CREATE INDEX idx_payments_provider_txn ON payments(provider_transaction_id);

COMMENT ON TABLE payments IS 'Payment transactions including escrow';

-- ============================================================================

CREATE TABLE invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id UUID NOT NULL REFERENCES payments(id),
  creator_id UUID REFERENCES creators(id),
  brand_id UUID REFERENCES brands(id),
  
  invoice_number VARCHAR(100) NOT NULL UNIQUE,
  invoice_type VARCHAR(50) CHECK (invoice_type IN ('creator_payout', 'brand_charge', 'platform_fee')),
  
  amount DECIMAL(12,2) NOT NULL,
  tax_amount DECIMAL(12,2) DEFAULT 0,
  total_amount DECIMAL(12,2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'INR',
  
  gst_number VARCHAR(50),
  gstin VARCHAR(15),
  place_of_supply VARCHAR(100),
  
  cgst DECIMAL(12,2) DEFAULT 0,
  sgst DECIMAL(12,2) DEFAULT 0,
  igst DECIMAL(12,2) DEFAULT 0,
  
  invoice_date DATE NOT NULL,
  due_date DATE,
  
  pdf_url TEXT,
  
  status VARCHAR(50) DEFAULT 'generated' CHECK (status IN ('generated', 'sent', 'paid', 'cancelled')),
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_invoices_payment ON invoices(payment_id);
CREATE INDEX idx_invoices_invoice_number ON invoices(invoice_number);
CREATE INDEX idx_invoices_creator ON invoices(creator_id);
CREATE INDEX idx_invoices_brand ON invoices(brand_id);

COMMENT ON TABLE invoices IS 'Generated invoices with GST compliance';

-- ============================================================================
-- SYSTEM TABLES
-- ============================================================================

CREATE TABLE sync_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  social_account_id UUID NOT NULL REFERENCES social_accounts(id) ON DELETE CASCADE,
  
  job_type VARCHAR(50) NOT NULL CHECK (job_type IN ('full_sync', 'incremental_sync', 'metrics_update')),
  status VARCHAR(50) DEFAULT 'queued' CHECK (status IN ('queued', 'running', 'completed', 'failed', 'cancelled')),
  
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  
  posts_fetched INTEGER DEFAULT 0,
  posts_created INTEGER DEFAULT 0,
  posts_updated INTEGER DEFAULT 0,
  errors_count INTEGER DEFAULT 0,
  
  error_details JSONB DEFAULT '[]',
  metadata JSONB DEFAULT '{}',
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_sync_jobs_social_account ON sync_jobs(social_account_id);
CREATE INDEX idx_sync_jobs_status ON sync_jobs(status);
CREATE INDEX idx_sync_jobs_created ON sync_jobs(created_at DESC);

COMMENT ON TABLE sync_jobs IS 'Background social media sync job tracking';

-- ============================================================================

CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id),
  user_id UUID REFERENCES users(id),
  
  action VARCHAR(100) NOT NULL,
  resource_type VARCHAR(100) NOT NULL,
  resource_id UUID,
  
  old_values JSONB,
  new_values JSONB,
  
  ip_address INET,
  user_agent TEXT,
  
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_tenant ON audit_logs(tenant_id);
CREATE INDEX idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_resource ON audit_logs(resource_type, resource_id);
CREATE INDEX idx_audit_logs_created ON audit_logs(created_at DESC);

COMMENT ON TABLE audit_logs IS 'System-wide audit trail for compliance';

-- ============================================================================
-- VIEWS
-- ============================================================================

-- Creator performance summary view
CREATE VIEW creator_performance_summary AS
SELECT 
  c.id as creator_id,
  c.name,
  COUNT(DISTINCT sa.id) as connected_accounts,
  COUNT(DISTINCT p.id) as total_posts,
  AVG(p.engagement_rate) as avg_engagement_rate,
  SUM(p.views) as total_views,
  SUM(p.likes) as total_likes,
  COUNT(DISTINCT co.id) FILTER (WHERE co.state = 'completed') as completed_campaigns,
  SUM(co.creator_payout_inr) FILTER (WHERE co.state = 'completed') as total_earnings
FROM creators c
LEFT JOIN social_accounts sa ON c.id = sa.creator_id
LEFT JOIN posts p ON sa.id = p.social_account_id
LEFT JOIN campaign_offers co ON c.id = co.creator_id
GROUP BY c.id, c.name;

COMMENT ON VIEW creator_performance_summary IS 'Aggregated creator performance metrics';

-- ============================================================================

-- Campaign performance view
CREATE VIEW campaign_performance AS
SELECT 
  cam.id as campaign_id,
  cam.title,
  b.name as brand_name,
  COUNT(DISTINCT co.id) as total_offers,
  COUNT(DISTINCT co.id) FILTER (WHERE co.state = 'accepted') as accepted_offers,
  COUNT(DISTINCT co.id) FILTER (WHERE co.state = 'completed') as completed_offers,
  SUM(co.final_fee_inr) FILTER (WHERE co.state = 'completed') as total_spent,
  SUM(co.platform_fee_inr) FILTER (WHERE co.state = 'completed') as total_platform_fees,
  SUM(co.estimated_reach) as total_estimated_reach,
  AVG(co.match_score) as avg_match_score
FROM campaigns cam
JOIN brands b ON cam.brand_id = b.id
LEFT JOIN campaign_offers co ON cam.id = co.campaign_id
GROUP BY cam.id, cam.title, b.name;

COMMENT ON VIEW campaign_performance IS 'Aggregated campaign performance metrics';

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- Function to calculate engagement rate
CREATE OR REPLACE FUNCTION calculate_engagement_rate(
  p_likes BIGINT,
  p_comments BIGINT,
  p_shares BIGINT,
  p_impressions BIGINT
) RETURNS DECIMAL(5,4) AS $$
BEGIN
  IF p_impressions = 0 OR p_impressions IS NULL THEN
    RETURN NULL;
  END IF;
  RETURN ROUND(
    (COALESCE(p_likes, 0) + COALESCE(p_comments, 0) + COALESCE(p_shares, 0))::DECIMAL / p_impressions,
    4
  );
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION calculate_engagement_rate IS 'Calculate engagement rate from metrics';

-- ============================================================================

-- Trigger to automatically update engagement_rate
CREATE OR REPLACE FUNCTION update_post_engagement_rate()
RETURNS TRIGGER AS $$
BEGIN
  NEW.engagement_rate := calculate_engagement_rate(
    NEW.likes,
    NEW.comments,
    NEW.shares,
    NEW.impressions
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_post_engagement_rate
BEFORE INSERT OR UPDATE ON posts
FOR EACH ROW
EXECUTE FUNCTION update_post_engagement_rate();

-- ============================================================================

-- Trigger to update updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to all tables with updated_at
CREATE TRIGGER update_tenants_updated_at BEFORE UPDATE ON tenants FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_creators_updated_at BEFORE UPDATE ON creators FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_brands_updated_at BEFORE UPDATE ON brands FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_social_accounts_updated_at BEFORE UPDATE ON social_accounts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_posts_updated_at BEFORE UPDATE ON posts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_campaigns_updated_at BEFORE UPDATE ON campaigns FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_campaign_offers_updated_at BEFORE UPDATE ON campaign_offers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_payments_updated_at BEFORE UPDATE ON payments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_invoices_updated_at BEFORE UPDATE ON invoices FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_sync_jobs_updated_at BEFORE UPDATE ON sync_jobs FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- SEED DATA (Optional - for development)
-- ============================================================================

-- Insert platform admin tenant
INSERT INTO tenants (id, name, type, subscription_tier, subscription_status)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'SafarCollab Platform',
  'platform_admin',
  'enterprise',
  'active'
);

-- Insert platform admin user
INSERT INTO users (id, tenant_id, email, password_hash, role, email_verified)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000001',
  'admin@safarcollab.com',
  '$2b$10$dummy.hash.for.initial.admin.user',
  'platform_admin',
  TRUE
);

COMMENT ON COLUMN users.password_hash IS 'Remember to change default admin password on first login';

-- ============================================================================
-- GRANTS (adjust based on your user setup)
-- ============================================================================

-- Grant permissions to application user (create this user separately)
-- GRANT CONNECT ON DATABASE influencia TO influencia_app;
-- GRANT USAGE ON SCHEMA public TO influencia_app;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO influencia_app;
-- GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO influencia_app;

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
