import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';

interface AIAnalysisResult {
  match_score: number;
  ml_predictions: {
    match_score: number;
    estimated_roi: number;
    estimated_engagement: number;
  };
  dl_predictions: {
    success_probability: number;
    match_score: number;
    predicted_engagement: number;
  };
  strengths: string[];
  concerns: string[];
  reasons: string[];
  audience_overlap: number;
  budget_fit: string;
  experience_level: string;
  features: any;
}

interface AIReportResult extends AIAnalysisResult {
  report_id: string;
  generated_at: string;
  full_report: string;
  quick_summary: string;
  recommendations: string[];
  risk_assessment: {
    risk_level: string;
    risk_factors: string[];
    mitigation_strategies: string[];
  };
}

@Injectable()
export class AIPythonService {
  private readonly logger = new Logger(AIPythonService.name);
  private readonly aiServiceUrl: string;
  private readonly timeout: number = 30000; // 30 seconds

  constructor() {
    // AI Microservice URL from environment or default
    // Flask API runs on port 5002 (FastAPI ML inference is on 5001)
    this.aiServiceUrl = process.env.AI_SERVICE_URL || 'http://localhost:5002';
    this.logger.log(`🤖 AI Microservice configured at: ${this.aiServiceUrl}`);
  }

  /**
   * Check if AI service is healthy
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await axios.get(`${this.aiServiceUrl}/health`, {
        timeout: 5000,
      });
      return response.data.status === 'healthy';
    } catch (error) {
      this.logger.warn('AI service health check failed');
      return false;
    }
  }

  /**
   * Call Python AI microservice via HTTP
   */
  private async callAIService(endpoint: string, data: any): Promise<any> {
    try {
      this.logger.log(`📡 Calling AI service: ${endpoint}`);
      
      const response = await axios.post(`${this.aiServiceUrl}${endpoint}`, data, {
        timeout: this.timeout,
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      this.logger.log(`✅ AI service response received`);
      return response.data;
      
    } catch (error) {
      if (axios.isAxiosError(error)) {
        this.logger.error(`❌ AI service error: ${error.message}`);
        if (error.response) {
          this.logger.error(`Response data: ${JSON.stringify(error.response.data)}`);
        }
      }
      throw error;
    }
  }

  /**
   * Get comprehensive AI analysis for creator-campaign match
   */
  async getAnalysis(creator: any, campaign: any): Promise<AIAnalysisResult> {
    try {
      const result = await this.callAIService('/api/analyze', {
        creator: this.prepareCreatorData(creator),
        campaign: this.prepareCampaignData(campaign),
      });
      
      return result as AIAnalysisResult;
    } catch (error) {
      this.logger.error(`AI analysis failed: ${error.message}`);
      // Return fallback analysis
      return this.getFallbackAnalysis(creator, campaign);
    }
  }

  /**
   * Generate comprehensive AI report with Gemini
   */
  async generateReport(creator: any, campaign: any, analysis?: AIAnalysisResult): Promise<AIReportResult> {
    try {
      const result = await this.callAIService('/api/generate-report', {
        creator: this.prepareCreatorData(creator),
        campaign: this.prepareCampaignData(campaign),
        analysis,
      });
      
      return result as AIReportResult;
    } catch (error) {
      this.logger.error(`AI report generation failed: ${error.message}`);
      // Return fallback report
      return this.getFallbackReport(creator, campaign, analysis);
    }
  }

  /**
   * Calculate match score using AI
   */
  async calculateMatchScore(creator: any, campaign: any): Promise<number> {
    try {
      const result = await this.callAIService('/api/match-score', {
        creator: this.prepareCreatorData(creator),
        campaign: this.prepareCampaignData(campaign),
      });
      
      return result.match_score;
    } catch (error) {
      this.logger.error(`Match score calculation failed: ${error.message}`);
      // Return fallback score
      return this.calculateFallbackScore(creator, campaign);
    }
  }

  /**
   * Prepare creator data for Python
   */
  private prepareCreatorData(creator: any): any {
    return {
      id: creator.id,
      user: creator.user ? {
        first_name: creator.user.first_name,
        last_name: creator.user.last_name,
      } : null,
      categories: creator.categories || [],
      languages: creator.languages || [],
      total_campaigns: creator.total_campaigns || 0,
      overall_rating: Number(creator.overall_rating) || 0,
      location: creator.location || '',
      bio: creator.bio || '',
      estimated_followers: creator.total_campaigns * 10000, // Estimate
      estimated_engagement_rate: 0.05, // Default 5%
      account_age_days: 365, // Default
    };
  }

  /**
   * Prepare campaign data for Python
   */
  private prepareCampaignData(campaign: any): any {
    const requirements = campaign.requirements || {};
    const target_audience = campaign.target_audience || {};
    
    const startDate = new Date(campaign.start_date);
    const endDate = new Date(campaign.end_date);
    const duration_days = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    
    return {
      id: campaign.id,
      title: campaign.title,
      category: campaign.category,
      platform: campaign.platform,
      budget: Number(campaign.budget),
      duration_days,
      requirements: {
        min_followers: requirements.min_followers || 0,
        min_engagement_rate: requirements.min_engagement_rate || 0,
      },
      target_audience: {
        locations: target_audience.locations || [],
        age_range: target_audience.age_range || '',
        gender: target_audience.gender || '',
      },
    };
  }

  /**
   * Fallback analysis when AI is unavailable
   */
  private getFallbackAnalysis(creator: any, campaign: any): AIAnalysisResult {
    const score = this.calculateFallbackScore(creator, campaign);
    
    return {
      match_score: score,
      ml_predictions: {
        match_score: score,
        estimated_roi: 100,
        estimated_engagement: 5.0,
      },
      dl_predictions: {
        success_probability: score / 120,
        match_score: score,
        predicted_engagement: 5.0,
      },
      strengths: [
        Number(creator.overall_rating) >= 4.5 ? 'Highly rated creator' : 'Established creator',
        creator.total_campaigns >= 10 ? 'Experienced with multiple campaigns' : 'Growing creator',
      ],
      concerns: [
        score < 70 ? 'Match score could be higher' : '',
      ].filter(Boolean),
      reasons: [
        'Category alignment',
        'Experience level',
        'Creator rating',
      ],
      audience_overlap: 65,
      budget_fit: 'Good Fit',
      experience_level: creator.total_campaigns >= 20 ? 'Advanced' : creator.total_campaigns >= 10 ? 'Intermediate' : 'Beginner',
      features: {},
    };
  }

  /**
   * Fallback report when AI is unavailable
   */
  private getFallbackReport(creator: any, campaign: any, analysis?: AIAnalysisResult): AIReportResult {
    const analysisData = analysis || this.getFallbackAnalysis(creator, campaign);
    const creatorName = creator.user ? `${creator.user.first_name} ${creator.user.last_name}` : 'Creator';
    
    return {
      ...analysisData,
      report_id: `RPT_${Date.now()}`,
      generated_at: new Date().toISOString(),
      full_report: `
**Comprehensive Analysis Report**

Creator: ${creatorName}
Campaign: ${campaign.title}
Match Score: ${analysisData.match_score}/100

This creator shows ${analysisData.match_score >= 80 ? 'excellent' : analysisData.match_score >= 60 ? 'good' : 'moderate'} 
potential for this campaign. Based on their experience with ${creator.total_campaigns} campaigns and rating of 
${creator.overall_rating}/5.0, they demonstrate reliability and quality.

**Key Strengths:**
${analysisData.strengths.map((s, i) => `${i + 1}. ${s}`).join('\n')}

**Recommendations:**
- Set clear expectations and deliverables
- Establish milestone-based payment structure
- Include performance metrics in contract
- Regular communication throughout campaign

**Expected Outcomes:**
With an estimated ROI of ${analysisData.ml_predictions.estimated_roi}% and success probability of 
${(analysisData.dl_predictions.success_probability * 100).toFixed(1)}%, this collaboration shows strong potential.
      `.trim(),
      quick_summary: `${creatorName} is a ${analysisData.experience_level.toLowerCase()} creator with ${creator.total_campaigns} campaigns completed and a ${creator.overall_rating}/5.0 rating, showing ${analysisData.match_score >= 80 ? 'excellent' : 'good'} alignment with your campaign objectives.`,
      recommendations: [
        'Set clear expectations and deliverables upfront',
        'Establish milestone-based payment structure',
        'Include performance metrics in contract',
        'Schedule regular check-ins during campaign',
        'Request content approval before publishing',
      ],
      risk_assessment: {
        risk_level: analysisData.match_score >= 80 ? 'Low' : analysisData.match_score >= 60 ? 'Medium' : 'High',
        risk_factors: [
          analysisData.match_score < 70 ? 'Moderate match score' : '',
          creator.total_campaigns < 5 ? 'Limited campaign experience' : '',
        ].filter(Boolean),
        mitigation_strategies: [
          'Set clear expectations upfront',
          'Use milestone-based payments',
          'Include performance clauses in contract',
        ],
      },
    };
  }

  /**
   * Simple fallback scoring algorithm
   */
  private calculateFallbackScore(creator: any, campaign: any): number {
    let score = 0;
    
    // Category match (30 points)
    if (creator.categories?.includes(campaign.category)) {
      score += 30;
    } else if (creator.categories?.length > 0) {
      score += 10;
    }
    
    // Experience (20 points)
    const campaigns = creator.total_campaigns || 0;
    if (campaigns >= 20) score += 20;
    else if (campaigns >= 10) score += 15;
    else if (campaigns >= 5) score += 10;
    else if (campaigns >= 1) score += 5;
    
    // Rating (15 points)
    const rating = Number(creator.overall_rating) || 0;
    if (rating >= 4.5) score += 15;
    else if (rating >= 4.0) score += 10;
    else if (rating >= 3.0) score += 5;
    
    // Platform (10 points) - simplified
    score += 10;
    
    // Requirements (25 points) - simplified
    score += 15;
    
    return Math.min(100, Math.max(0, score));
  }
}
