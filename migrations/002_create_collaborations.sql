-- Create collaborations table
CREATE TABLE IF NOT EXISTS collaborations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  creator_id UUID NOT NULL REFERENCES creators(id) ON DELETE CASCADE,
  status VARCHAR(50) NOT NULL DEFAULT 'pending',
  proposed_budget DECIMAL(12, 2),
  message TEXT,
  deliverables JSONB,
  deadline TIMESTAMP,
  rejection_reason TEXT,
  submitted_content JSONB,
  payment_completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(campaign_id, creator_id)
);

-- Create index for faster lookups
CREATE INDEX idx_collaborations_campaign_id ON collaborations(campaign_id);
CREATE INDEX idx_collaborations_creator_id ON collaborations(creator_id);
CREATE INDEX idx_collaborations_status ON collaborations(status);
