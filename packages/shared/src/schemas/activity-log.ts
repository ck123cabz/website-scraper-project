import { z } from 'zod';

export const LogSeveritySchema = z.enum(['success', 'info', 'warning', 'error']);

export const ActivityLogSchema = z.object({
  id: z.string().uuid(),
  jobId: z.string().uuid(),
  severity: LogSeveritySchema,
  message: z.string().min(1),
  context: z.record(z.any()).nullable(),
  createdAt: z.string().datetime(),
});

export type ActivityLogSchemaType = z.infer<typeof ActivityLogSchema>;
