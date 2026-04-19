/**
 * Admin API Client
 * Centralized API layer for admin dashboard operations
 * Provides platform-wide analytics, metrics, and management
 */

import { projectId } from './supabase/info';

// Configuration
const API_BASE_URL = `https://${projectId}.supabase.co/functions/v1/make-server-cbd74580`;
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
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
        ...options.headers,
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
      signal: controller.signal,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new AdminAPIError(
        'API_ERROR',
        errorData.error || `API error: ${response.status}`,
        response.status,
        errorData
      );
    }

    return await response.json();
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
};

export default adminAPI;
