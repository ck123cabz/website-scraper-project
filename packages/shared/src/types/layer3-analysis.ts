/**
 * Layer 3 Analysis Types
 *
 * Defines types for Layer 3 sophistication detection and analysis results.
 * These types are shared between backend detectors and frontend display.
 */

import { SophisticationSignal } from './manual-review';

/**
 * Complete Layer 3 analysis result with all detector signals and aggregate scoring
 */
export interface Layer3AnalysisResult {
  passed: boolean;
  classification: 'suitable' | 'not_suitable';
  sophistication_score: number;
  needs_manual_review: boolean;
  manual_review_reason?: string;
  manual_review_label?: string;
  layer3_signals: {
    design_quality: SophisticationSignal;
    authority_indicators: SophisticationSignal;
    professional_presentation: SophisticationSignal;
    content_originality: SophisticationSignal;
    aggregate: {
      sophistication_score: number;
      classification: 'suitable' | 'not_suitable';
      weights_used: {
        design: number;
        authority: number;
        presentation: number;
        content: number;
      };
    };
  };
  cost_tracking?: {
    llm_tokens_used: number;
    estimated_cost: number;
  };
}
