import { useMutation } from '@tanstack/react-query';
import { resultsApi, type ExportResultsParams } from '@/lib/api-client';

interface UseExportResultsOptions {
  jobId: string;
  jobName?: string;
}

export function useExportResults({ jobId, jobName }: UseExportResultsOptions) {
  return useMutation({
    mutationFn: (params: ExportResultsParams) => resultsApi.exportJobResults(jobId, params),
    onSuccess: (blob, variables) => {
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;

      // Generate filename
      const timestamp = new Date().toISOString().slice(0, 10);
      const name = jobName || jobId;
      const extension = variables.format === 'csv' ? 'csv' : 'json';
      link.download = `${name}-results-${timestamp}.${extension}`;

      // Trigger download
      document.body.appendChild(link);
      link.click();

      // Cleanup
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    },
  });
}
