-- Migration: Create AI Analysis Reports Table
-- Stores AI-generated analysis and reports for creator-campaign matches

CREATE TABLE IF NOT EXISTS ai_analysis_reports (
    id SERIAL PRIMARY KEY,
    campaign_id INTEGER NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    creator_id INTEGER NOT NULL REFERENCES creators(id) ON DELETE CASCADE,
    
    -- Match scores and predictions
    match_score DECIMAL(5,2) NOT NULL DEFAULT 0,
    ml_match_score DECIMAL(5,2),
    dl_match_score DECIMAL(5,2),
    estimated_roi DECIMAL(6,2),
    success_probability DECIMAL(4,3),
    predicted_engagement DECIMAL(5,2),
    audience_overlap DECIMAL(5,2),
    
    -- Analysis components
    strengths JSONB,
    concerns JSONB,
    reasons JSONB,
    
    -- AI-generated content
    ai_summary TEXT,
    ai_recommendations JSONB,
    full_report TEXT,
    risk_assessment JSONB,
    
    -- Metadata
    model_version VARCHAR(50),
    confidence_level VARCHAR(20),
    features_used JSONB,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    UNIQUE(campaign_id, creator_id)
);

-- Indexes for faster lookups
CREATE INDEX idx_ai_reports_campaign ON ai_analysis_reports(campaign_id);
CREATE INDEX idx_ai_reports_creator ON ai_analysis_reports(creator_id);
CREATE INDEX idx_ai_reports_match_score ON ai_analysis_reports(match_score DESC);
CREATE INDEX idx_ai_reports_created_at ON ai_analysis_reports(created_at DESC);

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION update_ai_reports_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_ai_reports_timestamp
BEFORE UPDATE ON ai_analysis_reports
FOR EACH ROW
EXECUTE FUNCTION update_ai_reports_updated_at();

-- Comments
COMMENT ON TABLE ai_analysis_reports IS 'Stores AI/ML-powered analysis reports for creator-campaign matches';
COMMENT ON COLUMN ai_analysis_reports.match_score IS 'Overall match score (0-100)';
COMMENT ON COLUMN ai_analysis_reports.ml_match_score IS 'Machine learning model match score';
COMMENT ON COLUMN ai_analysis_reports.dl_match_score IS 'Deep learning model match score';
COMMENT ON COLUMN ai_analysis_reports.estimated_roi IS 'Predicted return on investment (%)';
COMMENT ON COLUMN ai_analysis_reports.success_probability IS 'Probability of successful collaboration (0-1)';
COMMENT ON COLUMN ai_analysis_reports.ai_summary IS 'AI-generated summary from Gemini';
COMMENT ON COLUMN ai_analysis_reports.full_report IS 'Complete AI-generated analysis report';
