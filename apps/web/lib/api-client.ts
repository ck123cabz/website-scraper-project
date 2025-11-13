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

// Response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => {
    console.log(`[API Response] ${response.status} ${response.config.url}`);
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

  // Get single result details with full factor data
  getResultDetails: async (jobId: string, resultId: string) => {
    const response = await apiClient.get(`/jobs/${jobId}/results/${resultId}`);
    return response.data;
  },
};

// Results API
export interface GetResultsParams {
  page?: number;
  limit?: number;
  status?: 'success' | 'rejected' | 'failed';
  classification?: 'suitable' | 'not_suitable' | 'rejected_prefilter';
  search?: string;
}

export interface ExportResultsParams {
  format: 'csv' | 'json';
  status?: 'success' | 'rejected' | 'failed';
  classification?: 'suitable' | 'not_suitable' | 'rejected_prefilter';
  search?: string;
}

export const resultsApi = {
  // Get job results with pagination and filtering
  getJobResults: async (jobId: string, params?: GetResultsParams) => {
    const response = await apiClient.get(`/jobs/${jobId}/results`, { params });
    return response.data;
  },

  // Export job results
  exportJobResults: async (jobId: string, params: ExportResultsParams) => {
    const response = await apiClient.get(`/jobs/${jobId}/export`, {
      params,
      responseType: 'blob',
    });
    return response.data;
  },
};
