-- Migration: Update AI reports table to use UUID foreign keys
-- Changes campaign_id and creator_id from integer to uuid

-- Drop existing foreign key constraints
ALTER TABLE ai_analysis_reports DROP CONSTRAINT IF EXISTS fk_ai_reports_campaign;
ALTER TABLE ai_analysis_reports DROP CONSTRAINT IF EXISTS fk_ai_reports_creator;

-- Drop the table and recreate with correct types (safer than alter column with data)
DROP TABLE IF EXISTS ai_analysis_reports CASCADE;

CREATE TABLE ai_analysis_reports (
  id SERIAL PRIMARY KEY,
  campaign_id UUID NOT NULL,
  creator_id UUID NOT NULL,
  match_score DECIMAL(5,2) DEFAULT 0,
  ml_match_score DECIMAL(5,2),
  dl_match_score DECIMAL(5,2),
  estimated_roi DECIMAL(6,2),
  success_probability DECIMAL(4,3),
  predicted_engagement DECIMAL(5,2),
  audience_overlap DECIMAL(5,2),
  strengths JSONB,
  concerns JSONB,
  reasons JSONB,
  ai_summary TEXT,
  ai_recommendations JSONB,
  full_report TEXT,
  risk_assessment JSONB,
  model_version VARCHAR(50),
  confidence_level VARCHAR(20),
  features_used JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  -- Add foreign key constraints
  CONSTRAINT fk_ai_reports_campaign FOREIGN KEY (campaign_id) 
    REFERENCES campaigns(id) ON DELETE CASCADE,
  CONSTRAINT fk_ai_reports_creator FOREIGN KEY (creator_id) 
    REFERENCES creators(id) ON DELETE CASCADE,
    
  -- Add unique constraint to prevent duplicate reports
  CONSTRAINT unique_campaign_creator UNIQUE (campaign_id, creator_id)
);

-- Add indexes for performance
CREATE INDEX idx_ai_reports_campaign ON ai_analysis_reports(campaign_id);
CREATE INDEX idx_ai_reports_creator ON ai_analysis_reports(creator_id);
CREATE INDEX idx_ai_reports_match_score ON ai_analysis_reports(match_score DESC);
CREATE INDEX idx_ai_reports_created_at ON ai_analysis_reports(created_at DESC);
