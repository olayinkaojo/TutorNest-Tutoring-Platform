/**
 * Tutor API Client
 * Centralized API layer for tutor dashboard operations
 * Provides caching, deduplication, validation, and error handling
 */

import { edgeFunctionBaseUrl, edgeFunctionHeaders } from './supabase-edge-fetch';
import type { APIResponse } from '../types/dashboard';

// Configuration
const API_BASE_URL = edgeFunctionBaseUrl();
const TIMEOUT_MS = 30000;

// Request cache to prevent duplicate requests
const requestCache = new Map<string, { promise: Promise<any>; timestamp: number }>();
const CACHE_TTL_MS = 5000; // 5 seconds

export class TutorAPIError extends Error {
  constructor(
    public code: string,
    message: string,
    public status: number,
    public details?: unknown
  ) {
    super(message);
    this.name = 'TutorAPIError';
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

  // Check cache for GET requests
  if (method === 'GET' && !skipCache) {
    const cacheKey = `${method}:${endpoint}`;
    const cached = requestCache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      return cached.promise;
    }

    // Store promise to prevent concurrent identical requests
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
        ...edgeFunctionHeaders(accessToken),
        ...options.headers,
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
      signal: controller.signal,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new TutorAPIError(
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
 * Tutor API Client
 */
const tutorAPI = {
  /**
   * Get all students for a tutor
   */
  async getTutorStudents(accessToken: string, tutorId: string) {
    if (!tutorId) {
      throw new TutorAPIError('INVALID_INPUT', 'Tutor ID required', 400);
    }

    const response = await makeRequest<any>(
      `/tutors/${tutorId}/students`,
      accessToken
    );

    return response.students || [];
  },

  /**
   * Get student progress for tutor view
   */
  async getStudentProgress(
    accessToken: string,
    tutorId: string,
    studentId: string
  ) {
    if (!studentId || !tutorId) {
      throw new TutorAPIError('INVALID_INPUT', 'Student ID and Tutor ID required', 400);
    }

    const response = await makeRequest<any>(
      `/tutors/${tutorId}/students/${studentId}/progress`,
      accessToken
    );

    return response;
  },

  /**
   * Get tutor's student bookings
   */
  async getTutorStudentBookings(accessToken: string, tutorId: string) {
    if (!tutorId) {
      throw new TutorAPIError('INVALID_INPUT', 'Tutor ID required', 400);
    }

    const response = await makeRequest<any>(
      `/tutors/${tutorId}/bookings`,
      accessToken
    );

    return response.bookings || [];
  },

  /**
   * Get student metrics (engagement, completion, etc.)
   */
  async getStudentMetrics(
    accessToken: string,
    tutorId: string,
    studentId: string
  ) {
    if (!studentId || !tutorId) {
      throw new TutorAPIError('INVALID_INPUT', 'Student ID and Tutor ID required', 400);
    }

    const response = await makeRequest<any>(
      `/tutors/${tutorId}/students/${studentId}/metrics`,
      accessToken
    );

    return response;
  },

  /**
   * Get reports submitted for specific student
   */
  async getStudentReports(
    accessToken: string,
    tutorId: string,
    studentId: string
  ) {
    if (!studentId || !tutorId) {
      throw new TutorAPIError('INVALID_INPUT', 'Student ID and Tutor ID required', 400);
    }

    const response = await makeRequest<any>(
      `/tutors/${tutorId}/students/${studentId}/reports`,
      accessToken
    );

    return response.reports || [];
  },

  /**
   * Get tutor's overall statistics
   */
  async getTutorStats(accessToken: string, tutorId: string) {
    if (!tutorId) {
      throw new TutorAPIError('INVALID_INPUT', 'Tutor ID required', 400);
    }

    const response = await makeRequest<any>(
      `/tutors/${tutorId}/stats`,
      accessToken
    );

    return response;
  },

  /**
   * Get pending notifications for tutor
   */
  async getTutorNotifications(accessToken: string, tutorId: string) {
    if (!tutorId) {
      throw new TutorAPIError('INVALID_INPUT', 'Tutor ID required', 400);
    }

    const response = await makeRequest<any>(
      `/tutors/${tutorId}/notifications`,
      accessToken
    );

    return response.notifications || [];
  },

  /**
   * Get student sessions with reports
   */
  async getSessionsWithReports(
    accessToken: string,
    tutorId: string,
    studentId: string
  ) {
    if (!studentId || !tutorId) {
      throw new TutorAPIError('INVALID_INPUT', 'Student ID and Tutor ID required', 400);
    }

    const response = await makeRequest<any>(
      `/tutors/${tutorId}/students/${studentId}/sessions-reports`,
      accessToken
    );

    return response.sessions || [];
  },

  /**
   * Get engagement metrics for all students
   */
  async getAllStudentMetrics(accessToken: string, tutorId: string) {
    if (!tutorId) {
      throw new TutorAPIError('INVALID_INPUT', 'Tutor ID required', 400);
    }

    const response = await makeRequest<any>(
      `/tutors/${tutorId}/all-students-metrics`,
      accessToken
    );

    return response.metrics || [];
  },

  /**
   * Get performance trends for student
   */
  async getPerformanceTrends(
    accessToken: string,
    tutorId: string,
    studentId: string,
    weeks: number = 12
  ) {
    if (!studentId || !tutorId) {
      throw new TutorAPIError('INVALID_INPUT', 'Student ID and Tutor ID required', 400);
    }

    const response = await makeRequest<any>(
      `/tutors/${tutorId}/students/${studentId}/trends?weeks=${weeks}`,
      accessToken
    );

    return response.trends || [];
  },

  /**
   * Get recent reports for dashboard overview
   */
  async getRecentReports(accessToken: string, tutorId: string, limit: number = 5) {
    if (!tutorId) {
      throw new TutorAPIError('INVALID_INPUT', 'Tutor ID required', 400);
    }

    if (limit < 1 || limit > 50) {
      throw new TutorAPIError('INVALID_INPUT', 'Limit must be between 1 and 50', 400);
    }

    const response = await makeRequest<any>(
      `/tutors/${tutorId}/recent-reports?limit=${limit}`,
      accessToken
    );

    return response.reports || [];
  },

  /**
   * Get payout dashboard data (earnings, history, stats)
   */
  async getPayoutDashboard(accessToken: string) {
    const response = await makeRequest<any>(
      '/tutor/payouts/dashboard',
      accessToken,
      { skipCache: false }
    );

    return {
      earnings: response.earnings || [],
      payouts: response.payouts || [],
      stats: response.stats || {},
      settings: response.settings || {},
    };
  },

  /**
   * Get tutor's bank account
   */
  async getBankAccount(accessToken: string) {
    const response = await makeRequest<any>(
      '/tutor/payouts/bank-account',
      accessToken
    );
    return response.account || null;
  },

  /**
   * Update tutor's bank account
   */
  async updateBankAccount(
    accessToken: string,
    bankName: string,
    accountNumber: string,
    accountHolder: string,
    bankCode: string
  ) {
    if (!bankName || !accountNumber || !accountHolder || !bankCode) {
      throw new TutorAPIError('INVALID_INPUT', 'All bank details are required', 400);
    }

    const response = await makeRequest<any>(
      '/tutor/payouts/bank-account',
      accessToken,
      {
        method: 'POST',
        body: { bankName, accountNumber, accountHolder, bankCode },
      }
    );

    return response;
  },

  /**
   * Request a payout
   */
  async requestPayout(accessToken: string, amount: string) {
    if (!amount || parseFloat(amount) <= 0) {
      throw new TutorAPIError('INVALID_INPUT', 'Amount must be greater than 0', 400);
    }

    const response = await makeRequest<any>(
      '/tutor/payouts/request',
      accessToken,
      {
        method: 'POST',
        body: { amount },
        skipCache: true,
      }
    );

    return response;
  },

  /**
   * Get tutor's payout requests
   */
  async getPayoutRequests(accessToken: string) {
    const response = await makeRequest<any>(
      '/tutor/payouts/requests',
      accessToken
    );

    return response.requests || [];
  },

  /**
   * Get payout notifications
   */
  async getPayoutNotifications(accessToken: string) {
    const response = await makeRequest<any>(
      '/tutor/payouts/notifications',
      accessToken
    );

    return response.notifications || [];
  },

  /**
   * Get tax report for a year
   */
  async getTaxReport(accessToken: string, year: number) {
    if (year < 2000 || year > 2100) {
      throw new TutorAPIError('INVALID_INPUT', 'Invalid year', 400);
    }

    const response = await makeRequest<any>(
      `/tutor/payouts/tax-report/${year}`,
      accessToken
    );

    return response;
  },
};

export default tutorAPI;
