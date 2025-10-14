export type LogSeverity = 'success' | 'info' | 'warning' | 'error';

export interface ActivityLog {
  id: string;
  jobId: string;
  severity: LogSeverity;
  message: string;
  context: Record<string, any> | null;
  createdAt: string;
}
