import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

// Request interceptor for logging
apiClient.interceptors.request.use(
  (config) => {
    console.log(`[API Request] ${config.method?.toUpperCase()} ${config.url}`);
    return config;
  },
  (error) => {
    console.error('[API Request Error]', error);
    return Promise.reject(error);
  }
);

// Helper function to convert snake_case to camelCase
function toCamelCase(str: string): string {
  return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
}

// Helper function to recursively transform object keys from snake_case to camelCase
function transformKeysToCamelCase(obj: any): any {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(transformKeysToCamelCase);
  }

  if (typeof obj === 'object' && obj.constructor === Object) {
    const transformed: any = {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        const camelKey = toCamelCase(key);
        transformed[camelKey] = transformKeysToCamelCase(obj[key]);
      }
    }
    return transformed;
  }

  return obj;
}

// Response interceptor for error handling and snake_case to camelCase transformation
apiClient.interceptors.response.use(
  (response) => {
    console.log(`[API Response] ${response.status} ${response.config.url}`);

    // Transform response data keys from snake_case to camelCase
    if (response.data) {
      response.data = transformKeysToCamelCase(response.data);
    }

    return response;
  },
  (error) => {
    if (error.response) {
      // Server responded with error status
      console.error(`[API Error] ${error.response.status}:`, error.response.data);
    } else if (error.request) {
      // Request made but no response
      console.error('[API Error] No response received:', error.message);
    } else {
      // Error setting up request
      console.error('[API Error]', error.message);
    }
    return Promise.reject(error);
  }
);

// API endpoint functions
export const jobsApi = {
  // Get all jobs
  getAll: async () => {
    const response = await apiClient.get('/jobs');
    return response.data;
  },

  // Get single job by ID
  getById: async (id: string) => {
    const response = await apiClient.get(`/jobs/${id}`);
    return response.data;
  },

  // Pause job
  pause: async (id: string) => {
    const response = await apiClient.patch(`/jobs/${id}/pause`);
    return response.data;
  },

  // Resume job
  resume: async (id: string) => {
    const response = await apiClient.patch(`/jobs/${id}/resume`);
    return response.data;
  },

  // Cancel job
  cancel: async (id: string) => {
    const response = await apiClient.delete(`/jobs/${id}/cancel`);
    return response.data;
  },

  // Retry job
  retry: async (id: string) => {
    const response = await apiClient.post(`/jobs/${id}/retry`);
    return response.data;
  },

  // Delete job
  deleteJob: async (id: string) => {
    const response = await apiClient.delete(`/jobs/${id}`);
    return response.data;
  },

  // Queue status for dashboard polling
  getQueueStatus: async (params?: { includeCompleted?: boolean; limit?: number; offset?: number }) => {
    const queryParams: Record<string, string | number | boolean> = {};

    if (typeof params?.includeCompleted === 'boolean') {
      queryParams.includeCompleted = params.includeCompleted;
    }
    if (typeof params?.limit === 'number') {
      queryParams.limit = params.limit;
    }
    if (typeof params?.offset === 'number') {
      queryParams.offset = params.offset;
    }

    const response = await apiClient.get('/jobs/queue/status', {
      params: Object.keys(queryParams).length ? queryParams : undefined,
    });
    return response.data;
  },

  // Get single result details with full factor data
  getResultDetails: async (jobId: string, resultId: string) => {
    const response = await apiClient.get(`/jobs/${jobId}/results/${resultId}`);
    return response.data;
  },
};

// Results API
export interface GetResultsParams {
  page?: number;
  pageSize?: number; // API expects 'pageSize', not 'limit'
  status?: 'success' | 'rejected' | 'failed';
  classification?: 'suitable' | 'not_suitable' | 'rejected_prefilter';
  search?: string;
  // T053: New filter parameters
  filter?: 'all' | 'approved' | 'rejected';
  layer?: 'all' | 'layer1' | 'layer2' | 'layer3' | 'passed_all';
  confidence?: 'all' | 'high' | 'medium' | 'low';
}

export interface ExportResultsParams {
  format: 'complete' | 'summary' | 'layer1' | 'layer2' | 'layer3';
  filter?: 'all' | 'approved' | 'rejected';
  layer?: 'all' | 'layer1' | 'layer2' | 'layer3' | 'passed_all';
  confidence?: 'all' | 'high' | 'medium' | 'low';
}

export const resultsApi = {
  // Get job results with pagination and filtering
  getJobResults: async (jobId: string, params?: GetResultsParams) => {
    const response = await apiClient.get(`/jobs/${jobId}/results`, { params });
    return response.data;
  },

  // Export job results
  exportJobResults: async (jobId: string, params: ExportResultsParams) => {
    const response = await apiClient.post(`/jobs/${jobId}/export`, {}, {
      params,
      responseType: 'blob',
    });
    return response.data;
  },
};
