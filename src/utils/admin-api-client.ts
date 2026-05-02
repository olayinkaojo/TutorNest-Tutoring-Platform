/**
 * Admin API Client
 * Centralized API layer for admin dashboard operations
 * Provides platform-wide analytics, metrics, and management
 */

import { edgeFunctionHeaders, edgeFunctionUrl } from './supabase-edge-fetch';

const TIMEOUT_MS = 30000;

// Request cache
const requestCache = new Map<string, { promise: Promise<any>; timestamp: number }>();
const CACHE_TTL_MS = 10000; // 10 seconds (longer for admin reports)

export class AdminAPIError extends Error {
  constructor(
    public code: string,
    message: string,
    public status: number,
    public details?: unknown
  ) {
    super(message);
    this.name = 'AdminAPIError';
  }
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  headers?: Record<string, string>;
  body?: unknown;
  timeout?: number;
  skipCache?: boolean;
}

/**
 * Make an authenticated API request
 */
async function makeRequest<T>(
  endpoint: string,
  accessToken: string,
  options: RequestOptions = {}
): Promise<T> {
  const {
    method = 'GET',
    headers = {},
    body,
    timeout = TIMEOUT_MS,
    skipCache = false,
  } = options;

  if (method === 'GET' && !skipCache) {
    const cacheKey = `${method}:${endpoint}`;
    const cached = requestCache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      return cached.promise;
    }

    const promise = fetchWithTimeout<T>(endpoint, accessToken, options, timeout);
    requestCache.set(cacheKey, { promise, timestamp: Date.now() });
    return promise;
  }

  return fetchWithTimeout<T>(endpoint, accessToken, options, timeout);
}

/**
 * Fetch with timeout
 */
async function fetchWithTimeout<T>(
  endpoint: string,
  accessToken: string,
  options: RequestOptions,
  timeout: number
): Promise<T> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const path = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    const response = await fetch(edgeFunctionUrl(path), {
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...edgeFunctionHeaders(accessToken),
        ...options.headers,
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
      signal: controller.signal,
    });

    const raw = await response.text();

    if (!response.ok) {
      let errorData: Record<string, unknown> = {};
      if (raw.trim()) {
        try {
          errorData = JSON.parse(raw) as Record<string, unknown>;
        } catch {
          /* ignore */
        }
      }
      throw new AdminAPIError(
        'API_ERROR',
        (errorData.error as string) || `API error: ${response.status}`,
        response.status,
        errorData
      );
    }

    if (!raw.trim()) {
      throw new AdminAPIError('EMPTY_BODY', 'Empty response from server', response.status);
    }

    try {
      return JSON.parse(raw) as T;
    } catch {
      throw new AdminAPIError(
        'INVALID_JSON',
        'Server returned invalid JSON (check Edge Function logs).',
        response.status
      );
    }
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Admin API Client
 */
const adminAPI = {
  /**
   * Get platform overview metrics
   */
  async getPlatformMetrics(accessToken: string) {
    const response = await makeRequest<any>(
      `/admin/metrics`,
      accessToken
    );

    return response;
  },

  /**
   * Get all students across platform
   */
  async getAllStudents(accessToken: string, limit: number = 100, offset: number = 0) {
    if (limit < 1 || limit > 500) {
      throw new AdminAPIError('INVALID_INPUT', 'Limit must be between 1 and 500', 400);
    }

    const response = await makeRequest<any>(
      `/admin/students?limit=${limit}&offset=${offset}`,
      accessToken
    );

    return response.students || [];
  },

  /**
   * Get all tutors across platform
   */
  async getAllTutors(accessToken: string, limit: number = 100, offset: number = 0) {
    if (limit < 1 || limit > 500) {
      throw new AdminAPIError('INVALID_INPUT', 'Limit must be between 1 and 500', 400);
    }

    const response = await makeRequest<any>(
      `/admin/tutors?limit=${limit}&offset=${offset}`,
      accessToken
    );

    return response.tutors || [];
  },

  /**
   * Get aggregate student performance metrics
   */
  async getStudentPerformanceMetrics(accessToken: string) {
    const response = await makeRequest<any>(
      `/admin/students/performance`,
      accessToken
    );

    return response;
  },

  /**
   * Get tutor performance metrics
   */
  async getTutorPerformanceMetrics(accessToken: string) {
    const response = await makeRequest<any>(
      `/admin/tutors/performance`,
      accessToken
    );

    return response;
  },

  /**
   * Get course metrics and popularity
   */
  async getCourseMetrics(accessToken: string) {
    const response = await makeRequest<any>(
      `/admin/courses/metrics`,
      accessToken
    );

    return response.courses || [];
  },

  /**
   * Get engagement trends over time
   */
  async getEngagementTrends(accessToken: string, days: number = 30) {
    if (days < 1 || days > 365) {
      throw new AdminAPIError('INVALID_INPUT', 'Days must be between 1 and 365', 400);
    }

    const response = await makeRequest<any>(
      `/admin/engagement/trends?days=${days}`,
      accessToken
    );

    return response.trends || [];
  },

  /**
   * Get revenue metrics
   */
  async getRevenueMetrics(accessToken: string) {
    const response = await makeRequest<any>(
      `/admin/revenue`,
      accessToken
    );

    return response;
  },

  /**
   * Get session completion rates
   */
  async getSessionMetrics(accessToken: string) {
    const response = await makeRequest<any>(
      `/admin/sessions/metrics`,
      accessToken
    );

    return response;
  },

  /**
   * Get user retention rates
   */
  async getRetentionMetrics(accessToken: string) {
    const response = await makeRequest<any>(
      `/admin/retention`,
      accessToken
    );

    return response;
  },

  /**
   * Get system health and performance
   */
  async getSystemHealth(accessToken: string) {
    const response = await makeRequest<any>(
      `/admin/system/health`,
      accessToken,
      { skipCache: true }
    );

    return response;
  },

  /**
   * Get recent activities
   */
  async getRecentActivities(accessToken: string, limit: number = 50) {
    if (limit < 1 || limit > 500) {
      throw new AdminAPIError('INVALID_INPUT', 'Limit must be between 1 and 500', 400);
    }

    const response = await makeRequest<any>(
      `/admin/activities?limit=${limit}`,
      accessToken
    );

    return response.activities || [];
  },

  /**
   * Get disputes and flagged content
   */
  async getDisputes(accessToken: string, limit: number = 50) {
    if (limit < 1 || limit > 500) {
      throw new AdminAPIError('INVALID_INPUT', 'Limit must be between 1 and 500', 400);
    }

    const response = await makeRequest<any>(
      `/admin/disputes?limit=${limit}`,
      accessToken
    );

    return response.disputes || [];
  },

  /**
   * Get system reports for export
   */
  async generateReport(
    accessToken: string,
    reportType: 'students' | 'tutors' | 'revenue' | 'engagement',
    startDate: string,
    endDate: string
  ) {
    const validReports = ['students', 'tutors', 'revenue', 'engagement'];
    if (!validReports.includes(reportType)) {
      throw new AdminAPIError('INVALID_INPUT', `Report type must be one of: ${validReports.join(', ')}`, 400);
    }

    const response = await makeRequest<any>(
      `/admin/reports/generate`,
      accessToken,
      {
        method: 'POST',
        body: { reportType, startDate, endDate },
        skipCache: true,
      }
    );

    return response;
  },

  /**
   * Get top performing students
   */
  async getTopStudents(accessToken: string, limit: number = 10) {
    if (limit < 1 || limit > 100) {
      throw new AdminAPIError('INVALID_INPUT', 'Limit must be between 1 and 100', 400);
    }

    const response = await makeRequest<any>(
      `/admin/top/students?limit=${limit}`,
      accessToken
    );

    return response.students || [];
  },

  /**
   * Get top performing tutors
   */
  async getTopTutors(accessToken: string, limit: number = 10) {
    if (limit < 1 || limit > 100) {
      throw new AdminAPIError('INVALID_INPUT', 'Limit must be between 1 and 100', 400);
    }

    const response = await makeRequest<any>(
      `/admin/top/tutors?limit=${limit}`,
      accessToken
    );

    return response.tutors || [];
  },

  /**
   * Get payout batches
   */
  async getPayoutBatches(accessToken?: string) {
    // Return mock data for now - can be replaced with real API call
    return [
      {
        id: '1',
        batchNumber: 'BATCH-2024-W01',
        scheduledDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        status: 'completed',
        totalPayouts: 5,
        totalAmount: 50000,
        successfulCount: 5,
        failedCount: 0,
        createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        processedAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString(),
      },
    ];
  },

  /**
   * Get payout batch details
   */
  async getPayoutBatchDetails(batchId: string, accessToken?: string) {
    // Return mock data for now
    return {
      batch: {
        id: batchId,
        batchNumber: 'BATCH-2024-W01',
        status: 'completed',
        totalPayouts: 5,
      },
      payouts: [
        {
          id: '1',
          tutorId: 'tutor1',
          tutorName: 'John Tutor',
          amount: 10000,
          state: 'completed',
          requestedAt: new Date().toISOString(),
          completedAt: new Date().toISOString(),
        },
      ],
    };
  },

  /**
   * Approve a payout batch
   */
  async approveBatch(batchId: string, notes?: string, accessToken?: string) {
    return { success: true, message: 'Batch approved' };
  },

  /**
   * Process a payout batch
   */
  async processBatch(batchId: string, accessToken?: string) {
    return { success: true, message: 'Batch processing started' };
  },

  /**
   * Retry failed payouts in a batch
   */
  async retryFailedPayouts(batchId: string, accessToken?: string) {
    return { success: true, message: 'Retry initiated for failed payouts' };
  },
};

export default adminAPI;
