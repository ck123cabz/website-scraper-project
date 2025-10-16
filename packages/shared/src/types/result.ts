import { Tables } from './database.types';

export type Result = Tables<'results'>;

export type ResultStatus = 'success' | 'rejected' | 'failed';
export type ClassificationResult = 'suitable' | 'not_suitable' | 'rejected_prefilter';
export type LlmProvider = 'gemini' | 'gpt' | 'none';

/**
 * Confidence band classification for Layer 3 results
 * - high: 0.8-1.0 (auto-approve)
 * - medium: 0.5-0.79 (manual review)
 * - low: 0.3-0.49 (manual review)
 * - auto_reject: 0-0.29 (auto-reject)
 */
export type ConfidenceBand = 'high' | 'medium' | 'low' | 'auto_reject';

/**
 * Classification response from LLM providers (Gemini, GPT)
 * Enhanced with sophistication signals for Story 2.4-refactored
 */
export interface ClassificationResponse {
  suitable: boolean;
  confidence: number; // 0-1
  reasoning: string;
  sophistication_signals?: string[]; // Optional: detected content marketing, SEO, and guest post signals
}
