import { z } from 'zod';

export const resultStatusSchema = z.enum(['success', 'rejected', 'failed']);
export const classificationResultSchema = z.enum(['suitable', 'not_suitable', 'rejected_prefilter']);
export const llmProviderSchema = z.enum(['gemini', 'gpt', 'none']);

export const resultSchema = z.object({
  id: z.string().uuid(),
  job_id: z.string().uuid(),
  url: z.string().url(),
  status: resultStatusSchema,
  classification_result: classificationResultSchema.nullable(),
  classification_score: z.number().min(0).max(1).nullable(),
  classification_reasoning: z.string().nullable(),
  llm_provider: llmProviderSchema.nullable(),
  llm_cost: z.number().min(0).nullable(),
  processing_time_ms: z.number().int().min(0).nullable(),
  retry_count: z.number().int().min(0).nullable(),
  error_message: z.string().nullable(),
  created_at: z.string().datetime(),
});

export type ResultSchema = z.infer<typeof resultSchema>;
