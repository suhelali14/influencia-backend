-- Social Media API Integration Migration
-- Migration: 005_social_media_api_integration
-- Description: Add OAuth token fields and metrics history table
-- Date: 2026-01-18

-- ============================================================================
-- UPDATE social_accounts TABLE
-- ============================================================================

-- Add token_expires_at column if not exists
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'social_accounts' 
                   AND column_name = 'token_expires_at') THEN
        ALTER TABLE social_accounts ADD COLUMN token_expires_at TIMESTAMP;
    END IF;
END $$;

-- Ensure access_token can store encrypted tokens (longer length)
ALTER TABLE social_accounts 
ALTER COLUMN access_token TYPE TEXT;

-- Ensure refresh_token can store encrypted tokens (longer length)
ALTER TABLE social_accounts 
ALTER COLUMN refresh_token TYPE TEXT;

-- Add index for efficient queries
CREATE INDEX IF NOT EXISTS idx_social_accounts_creator_platform 
ON social_accounts(creator_id, platform);

CREATE INDEX IF NOT EXISTS idx_social_accounts_token_expires 
ON social_accounts(token_expires_at);

CREATE INDEX IF NOT EXISTS idx_social_accounts_last_synced 
ON social_accounts(last_synced_at);

-- ============================================================================
-- CREATE social_metrics_history TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS social_metrics_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  social_account_id UUID NOT NULL REFERENCES social_accounts(id) ON DELETE CASCADE,
  followers_count INTEGER DEFAULT 0,
  engagement_rate DECIMAL(5,2) DEFAULT 0,
  impressions BIGINT,
  reach BIGINT,
  avg_likes INTEGER,
  avg_comments INTEGER,
  avg_views INTEGER,
  quality_score INTEGER,
  recorded_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for efficient time-series queries
CREATE INDEX IF NOT EXISTS idx_metrics_history_account_time 
ON social_metrics_history(social_account_id, recorded_at DESC);

CREATE INDEX IF NOT EXISTS idx_metrics_history_recorded_at 
ON social_metrics_history(recorded_at);

-- ============================================================================
-- CREATE oauth_states TABLE (for CSRF protection)
-- ============================================================================

CREATE TABLE IF NOT EXISTS oauth_states (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  state VARCHAR(255) NOT NULL UNIQUE,
  creator_id UUID NOT NULL,
  platform VARCHAR(50) NOT NULL,
  redirect_url TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_oauth_states_state ON oauth_states(state);
CREATE INDEX IF NOT EXISTS idx_oauth_states_expires ON oauth_states(expires_at);

-- Clean up expired states (can be run periodically)
-- DELETE FROM oauth_states WHERE expires_at < NOW();

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE social_metrics_history IS 'Historical record of social media metrics for trend analysis';
COMMENT ON COLUMN social_metrics_history.quality_score IS 'Calculated quality score (0-100) based on engagement and reach';

COMMENT ON TABLE oauth_states IS 'Temporary storage for OAuth state parameters (CSRF protection)';

COMMENT ON COLUMN social_accounts.token_expires_at IS 'When the access token expires (for refresh scheduling)';
COMMENT ON COLUMN social_accounts.access_token IS 'Encrypted OAuth access token';
COMMENT ON COLUMN social_accounts.refresh_token IS 'Encrypted OAuth refresh token';
