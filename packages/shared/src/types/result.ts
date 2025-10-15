import { Tables } from './database.types';

export type Result = Tables<'results'>;

export type ResultStatus = 'success' | 'rejected' | 'failed';
export type ClassificationResult = 'suitable' | 'not_suitable' | 'rejected_prefilter';
export type LlmProvider = 'gemini' | 'gpt' | 'none';

/**
 * Classification response from LLM providers (Gemini, GPT)
 */
export interface ClassificationResponse {
  suitable: boolean;
  confidence: number; // 0-1
  reasoning: string;
}
