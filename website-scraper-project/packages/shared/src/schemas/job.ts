import { z } from 'zod';

export const JobStatusSchema = z.enum(['pending', 'processing', 'paused', 'completed', 'failed']);
export const ProcessingStageSchema = z.enum(['fetching', 'filtering', 'classifying']);

export const JobSchema = z.object({
  id: z.string().uuid(),
  name: z.string().nullable(),
  status: JobStatusSchema,
  totalUrls: z.number().int().min(0),
  processedUrls: z.number().int().min(0),
  successfulUrls: z.number().int().min(0),
  failedUrls: z.number().int().min(0),
  rejectedUrls: z.number().int().min(0),
  currentUrl: z.string().url().nullable(),
  currentStage: ProcessingStageSchema.nullable(),
  progressPercentage: z.number().min(0).max(100),
  processingRate: z.number().nullable(),
  estimatedTimeRemaining: z.number().int().nullable(),
  totalCost: z.number().min(0),
  geminiCost: z.number().min(0),
  gptCost: z.number().min(0),
  startedAt: z.string().datetime().nullable(),
  completedAt: z.string().datetime().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type JobSchemaType = z.infer<typeof JobSchema>;
