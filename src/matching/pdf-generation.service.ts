import { Injectable } from '@nestjs/common';
import * as PDFDocument from 'pdfkit';

interface ReportData {
  creator: any;
  campaign: any;
  analysis: any;
  aiAnalysis?: any;
  recommendations: string[];
  comparisons: any;
}

interface Prediction {
  label: string;
  value: string;
  model: string;
  color: string;
}

@Injectable()
export class PdfGenerationService {
  /**
   * Generate comprehensive AI-powered PDF report
   */
  async generateComprehensiveReport(data: ReportData): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = [];
      const PDFDoc = require('pdfkit');
      const doc = new PDFDoc({
        size: 'A4',
        margins: { top: 50, bottom: 50, left: 50, right: 50 },
      });

      // Collect PDF chunks
      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // Generate report content
      this.addHeader(doc, data);
      this.addExecutiveSummary(doc, data);
      this.addAIPredictions(doc, data);
      this.addMatchAnalysis(doc, data);
      this.addStrengthsAndConcerns(doc, data);
      this.addRecommendations(doc, data);
      this.addRiskAssessment(doc, data);
      this.addComparativeMetrics(doc, data);
      this.addFooter(doc);

      doc.end();
    });
  }

  private addHeader(doc: any, data: ReportData) {
    const { creator, campaign } = data;

    // Header background
    doc
      .rect(0, 0, doc.page.width, 150)
      .fillAndStroke('#6366f1', '#4f46e5');

    // Title
    doc
      .fontSize(28)
      .fillColor('#ffffff')
      .font('Helvetica-Bold')
      .text('Creator-Campaign Analysis Report', 50, 40, { align: 'center' });

    // Subtitle
    doc
      .fontSize(12)
      .fillColor('#e0e7ff')
      .font('Helvetica')
      .text('AI-Powered Comprehensive Analysis', { align: 'center' });

    // Creator and Campaign info
    const creatorName = `${creator.user?.first_name || ''} ${creator.user?.last_name || ''}`.trim();
    
    doc
      .fontSize(10)
      .fillColor('#ffffff')
      .text(`Creator: ${creatorName}`, 50, 100);

    doc
      .text(`Campaign: ${campaign.title}`, 50, 115);

    doc
      .text(`Generated: ${new Date().toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      })}`, 50, 130);

    doc.moveDown(3);
  }

  private addExecutiveSummary(doc: any, data: ReportData) {
    const { analysis, aiAnalysis } = data;

    doc
      .fontSize(18)
      .fillColor('#111827')
      .font('Helvetica-Bold')
      .text('Executive Summary', { underline: true });

    doc.moveDown(0.5);

    // Match Score Box
    doc
      .rect(doc.x, doc.y, 200, 80)
      .fillAndStroke('#f0fdf4', '#16a34a');

    const boxX = doc.x + 10;
    const boxY = doc.y + 10;

    doc
      .fontSize(12)
      .fillColor('#166534')
      .font('Helvetica')
      .text('Overall Match Score', boxX, boxY);

    doc
      .fontSize(36)
      .fillColor('#16a34a')
      .font('Helvetica-Bold')
      .text(`${analysis.score}%`, boxX, boxY + 25);

    doc
      .fontSize(10)
      .fillColor('#166534')
      .font('Helvetica')
      .text(this.getMatchRating(analysis.score), boxX, boxY + 65);

    doc.moveDown(6);

    // AI Predictions Summary
    if (aiAnalysis) {
      doc
        .fontSize(12)
        .fillColor('#374151')
        .font('Helvetica')
        .text('This analysis is powered by advanced machine learning models trained on thousands of creator-campaign collaborations.', {
          align: 'left',
          width: 495,
        });

      doc.moveDown(1);

      if (aiAnalysis.ai_summary) {
        doc
          .fontSize(11)
          .fillColor('#4b5563')
          .font('Helvetica')
          .text(aiAnalysis.ai_summary, {
            align: 'left',
            width: 495,
          });
      }
    }

    doc.moveDown(2);
  }

  private addAIPredictions(doc: any, data: ReportData) {
    const { aiAnalysis } = data;

    if (!aiAnalysis) return;

    doc
      .fontSize(18)
      .fillColor('#111827')
      .font('Helvetica-Bold')
      .text('AI-Powered Predictions', { underline: true });

    doc.moveDown(1);

    const predictions: Prediction[] = [];

    if (aiAnalysis.ml_match_score) {
      predictions.push({
        label: 'ML Match Score',
        value: `${Number(aiAnalysis.ml_match_score).toFixed(1)}%`,
        model: 'Random Forest',
        color: '#7c3aed',
      });
    }

    if (aiAnalysis.estimated_roi) {
      predictions.push({
        label: 'Estimated ROI',
        value: `${Number(aiAnalysis.estimated_roi).toFixed(0)}%`,
        model: 'Gradient Boosting',
        color: '#16a34a',
      });
    }

    if (aiAnalysis.success_probability !== undefined) {
      predictions.push({
        label: 'Success Probability',
        value: `${(Number(aiAnalysis.success_probability) * 100).toFixed(1)}%`,
        model: 'Neural Network',
        color: '#2563eb',
      });
    }

    if (aiAnalysis.predicted_engagement) {
      predictions.push({
        label: 'Predicted Engagement',
        value: `${Number(aiAnalysis.predicted_engagement).toFixed(2)}%`,
        model: 'ML Ensemble',
        color: '#dc2626',
      });
    }

    // Draw prediction boxes in a grid
    const startY = doc.y;
    predictions.forEach((pred, index) => {
      const col = index % 2;
      const row = Math.floor(index / 2);
      const x = 50 + (col * 260);
      const y = startY + (row * 90);

      doc
        .rect(x, y, 240, 70)
        .fillAndStroke('#f9fafb', '#e5e7eb');

      doc
        .fontSize(10)
        .fillColor('#6b7280')
        .font('Helvetica')
        .text(pred.label, x + 10, y + 10);

      doc
        .fontSize(8)
        .fillColor('#9ca3af')
        .text(pred.model, x + 10, y + 25);

      doc
        .fontSize(24)
        .fillColor(pred.color)
        .font('Helvetica-Bold')
        .text(pred.value, x + 10, y + 40);
    });

    doc.moveDown(Math.ceil(predictions.length / 2) * 5);
  }

  private addMatchAnalysis(doc: any, data: ReportData) {
    const { analysis } = data;

    doc.addPage();

    doc
      .fontSize(18)
      .fillColor('#111827')
      .font('Helvetica-Bold')
      .text('Match Analysis', { underline: true });

    doc.moveDown(1);

    // Key Metrics
    const metrics = [
      { label: 'Audience Overlap', value: `${analysis.audienceOverlap}%` },
      { label: 'Budget Fit', value: analysis.budgetFit },
      { label: 'Experience Level', value: analysis.experienceLevel },
      { label: 'Estimated ROI', value: `${analysis.estimatedROI}%` },
    ];

    metrics.forEach((metric) => {
      doc
        .fontSize(11)
        .fillColor('#374151')
        .font('Helvetica-Bold')
        .text(`${metric.label}: `, { continued: true })
        .font('Helvetica')
        .fillColor('#4b5563')
        .text(metric.value);

      doc.moveDown(0.5);
    });

    doc.moveDown(1);

    // Match Reasons
    if (analysis.reasons && analysis.reasons.length > 0) {
      doc
        .fontSize(14)
        .fillColor('#111827')
        .font('Helvetica-Bold')
        .text('Why This Creator Matches');

      doc.moveDown(0.5);

      analysis.reasons.forEach((reason: string, index: number) => {
        doc
          .fontSize(11)
          .fillColor('#4b5563')
          .font('Helvetica')
          .text(`${index + 1}. ${reason}`, { indent: 10 });

        doc.moveDown(0.3);
      });
    }

    doc.moveDown(2);
  }

  private addStrengthsAndConcerns(doc: any, data: ReportData) {
    const { analysis, aiAnalysis } = data;

    // Strengths
    const strengths = analysis.strengths || [];
    const aiStrengths = aiAnalysis?.strengths || [];
    const allStrengths = [...new Set([...strengths, ...aiStrengths])];

    if (allStrengths.length > 0) {
      doc
        .fontSize(14)
        .fillColor('#16a34a')
        .font('Helvetica-Bold')
        .text('✓ Key Strengths');

      doc.moveDown(0.5);

      allStrengths.forEach((strength: string) => {
        doc
          .fontSize(11)
          .fillColor('#166534')
          .font('Helvetica')
          .text(`• ${strength}`, { indent: 10 });

        doc.moveDown(0.3);
      });

      doc.moveDown(1);
    }

    // Concerns
    const concerns = analysis.concerns || [];
    const aiConcerns = aiAnalysis?.concerns || [];
    const allConcerns = [...new Set([...concerns, ...aiConcerns])];

    if (allConcerns.length > 0) {
      doc
        .fontSize(14)
        .fillColor('#dc2626')
        .font('Helvetica-Bold')
        .text('⚠ Points to Consider');

      doc.moveDown(0.5);

      allConcerns.forEach((concern: string) => {
        doc
          .fontSize(11)
          .fillColor('#991b1b')
          .font('Helvetica')
          .text(`• ${concern}`, { indent: 10 });

        doc.moveDown(0.3);
      });
    }

    doc.moveDown(2);
  }

  private addRecommendations(doc: any, data: ReportData) {
    const { recommendations, aiAnalysis } = data;

    const allRecommendations = [
      ...recommendations,
      ...(aiAnalysis?.ai_recommendations || []),
    ];

    if (allRecommendations.length === 0) return;

    doc.addPage();

    doc
      .fontSize(18)
      .fillColor('#111827')
      .font('Helvetica-Bold')
      .text('Strategic Recommendations', { underline: true });

    doc.moveDown(1);

    allRecommendations.forEach((rec, index) => {
      doc
        .fontSize(11)
        .fillColor('#2563eb')
        .font('Helvetica-Bold')
        .text(`${index + 1}. `, { continued: true })
        .fillColor('#374151')
        .font('Helvetica')
        .text(rec, { indent: 15 });

      doc.moveDown(0.5);
    });

    doc.moveDown(2);
  }

  private addRiskAssessment(doc: any, data: ReportData) {
    const { aiAnalysis } = data;

    if (!aiAnalysis?.risk_assessment) return;

    const risk = aiAnalysis.risk_assessment;

    doc
      .fontSize(18)
      .fillColor('#111827')
      .font('Helvetica-Bold')
      .text('Risk Assessment', { underline: true });

    doc.moveDown(1);

    // Risk Level
    const riskColor =
      risk.risk_level === 'Low'
        ? '#16a34a'
        : risk.risk_level === 'Medium'
        ? '#ea580c'
        : '#dc2626';

    doc
      .fontSize(12)
      .fillColor('#374151')
      .font('Helvetica-Bold')
      .text('Risk Level: ', { continued: true })
      .fillColor(riskColor)
      .text(risk.risk_level);

    doc.moveDown(1);

    // Risk Factors
    if (risk.risk_factors && risk.risk_factors.length > 0) {
      doc
        .fontSize(12)
        .fillColor('#dc2626')
        .font('Helvetica-Bold')
        .text('Risk Factors:');

      doc.moveDown(0.5);

      risk.risk_factors.forEach((factor) => {
        doc
          .fontSize(10)
          .fillColor('#991b1b')
          .font('Helvetica')
          .text(`• ${factor}`, { indent: 10 });

        doc.moveDown(0.3);
      });

      doc.moveDown(1);
    }

    // Mitigation Strategies
    if (risk.mitigation_strategies && risk.mitigation_strategies.length > 0) {
      doc
        .fontSize(12)
        .fillColor('#16a34a')
        .font('Helvetica-Bold')
        .text('Mitigation Strategies:');

      doc.moveDown(0.5);

      risk.mitigation_strategies.forEach((strategy) => {
        doc
          .fontSize(10)
          .fillColor('#166534')
          .font('Helvetica')
          .text(`✓ ${strategy}`, { indent: 10 });

        doc.moveDown(0.3);
      });
    }

    doc.moveDown(2);
  }

  private addComparativeMetrics(doc: any, data: ReportData) {
    const { comparisons } = data;

    if (!comparisons) return;

    doc.addPage();

    doc
      .fontSize(18)
      .fillColor('#111827')
      .font('Helvetica-Bold')
      .text('Industry Benchmarks', { underline: true });

    doc.moveDown(1);

    if (comparisons.industryAverageBudget) {
      doc
        .fontSize(11)
        .fillColor('#374151')
        .font('Helvetica-Bold')
        .text('Industry Average Budget: ', { continued: true })
        .font('Helvetica')
        .fillColor('#4b5563')
        .text(`$${comparisons.industryAverageBudget.toLocaleString()}`);

      doc.moveDown(0.5);
    }

    if (comparisons.industryAverageReach) {
      doc
        .fontSize(11)
        .fillColor('#374151')
        .font('Helvetica-Bold')
        .text('Industry Average Reach: ', { continued: true })
        .font('Helvetica')
        .fillColor('#4b5563')
        .text(comparisons.industryAverageReach.toLocaleString());

      doc.moveDown(0.5);
    }

    if (comparisons.creatorPositioning) {
      doc
        .fontSize(11)
        .fillColor('#374151')
        .font('Helvetica-Bold')
        .text('Creator Positioning: ', { continued: true })
        .font('Helvetica')
        .fillColor('#4b5563')
        .text(comparisons.creatorPositioning);
    }

    doc.moveDown(2);
  }

  private addFooter(doc: any) {
    const pages = doc.bufferedPageRange();

    for (let i = 0; i < pages.count; i++) {
      doc.switchToPage(pages.start + i);

      // Footer line
      doc
        .moveTo(50, doc.page.height - 40)
        .lineTo(doc.page.width - 50, doc.page.height - 40)
        .stroke('#e5e7eb');

      // Footer text
      doc
        .fontSize(8)
        .fillColor('#9ca3af')
        .font('Helvetica')
        .text(
          `Influencia AI-Powered Analysis • Page ${i + 1} of ${pages.count} • Generated ${new Date().toLocaleDateString()}`,
          50,
          doc.page.height - 30,
          { align: 'center', width: doc.page.width - 100 }
        );
    }
  }

  private getMatchRating(score: number): string {
    if (score >= 90) return 'Excellent Match';
    if (score >= 80) return 'Great Match';
    if (score >= 70) return 'Good Match';
    if (score >= 60) return 'Moderate Match';
    return 'Limited Match';
  }
}
