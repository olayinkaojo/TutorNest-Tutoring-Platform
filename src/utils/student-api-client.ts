/**
 * Student API Client
 * Centralized API layer for all student dashboard operations
 * Provides caching, deduplication, validation, and error handling
 */

import { edgeFunctionBaseUrl, edgeFunctionHeaders } from './supabase-edge-fetch';
import type { 
  SessionReport, 
  ProgressMetrics,
  APIResponse
} from '../types/dashboard';

// Configuration
const API_BASE_URL = edgeFunctionBaseUrl();
const TIMEOUT_MS = 30000;

// Request cache to prevent duplicate requests
const requestCache = new Map<string, { promise: Promise<any>; timestamp: number }>();
const CACHE_TTL_MS = 5000; // 5 seconds

export class StudentAPIError extends Error {
  constructor(
    public code: string,
    message: string,
    public status: number,
    public details?: unknown
  ) {
    super(message);
    this.name = 'StudentAPIError';
  }
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  headers?: Record<string, string>;
  body?: unknown;
  /** Override default TIMEOUT_MS for this request */
  timeout?: number;
  skipCache?: boolean;
}

/** Optional per-call timeout (e.g. 10_000 to match dashboard fetch patterns) */
export type StudentRequestOpts = { timeout?: number };

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

  const url = `${API_BASE_URL}${endpoint}`;
  const cacheKey = `${method}:${url}`;

  // Check cache for GET requests
  if (method === 'GET' && !skipCache) {
    const cached = requestCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      return cached.promise;
    }
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  const promise = (async () => {
    try {
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...edgeFunctionHeaders(accessToken),
          ...headers,
        },
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const error = await response.text();
        throw new StudentAPIError(
          'API_ERROR',
          `API request failed: ${response.statusText}`,
          response.status,
          error
        );
      }

      const data = await response.json();
      return data as T;
    } catch (error: any) {
      clearTimeout(timeoutId);

      if (error instanceof StudentAPIError) throw error;

      if (error.name === 'AbortError') {
        throw new StudentAPIError(
          'TIMEOUT',
          `Request timeout after ${timeout}ms`,
          408
        );
      }

      throw new StudentAPIError(
        'NETWORK_ERROR',
        error.message || 'Network request failed',
        0,
        error
      );
    }
  })();

  // Cache GET requests
  if (method === 'GET' && !skipCache) {
    requestCache.set(cacheKey, { promise, timestamp: Date.now() });
  }

  return promise;
}

/**
 * Student API methods
 */
export const studentAPI = {
  /**
   * Get student's bookings/sessions
   */
  async getStudentBookings(
    accessToken: string,
    studentId: string,
    filter?: { status?: string },
    opts?: StudentRequestOpts
  ) {
    if (!studentId || typeof studentId !== 'string') {
      throw new StudentAPIError('INVALID_INPUT', 'Student ID is required', 400);
    }

    const queryParams = new URLSearchParams();
    queryParams.append('studentId', studentId);
    if (filter?.status) queryParams.append('status', filter.status);

    const response = await makeRequest<any>(
      `/bookings?${queryParams.toString()}`,
      accessToken,
      { skipCache: false, ...(opts?.timeout != null ? { timeout: opts.timeout } : {}) }
    );

    return response.bookings || [];
  },

  /**
   * Get student's assessments
   */
  async getStudentAssessments(
    accessToken: string,
    studentId: string,
    limit: number = 10,
    opts?: StudentRequestOpts
  ) {
    if (!studentId || typeof studentId !== 'string') {
      throw new StudentAPIError('INVALID_INPUT', 'Student ID is required', 400);
    }

    const response = await makeRequest<any>(
      `/assessments/student/${studentId}?limit=${Math.min(limit, 100)}`,
      accessToken,
      { skipCache: false, ...(opts?.timeout != null ? { timeout: opts.timeout } : {}) }
    );

    return response.assessments || [];
  },

  /**
   * Get student's progress data
   */
  async getStudentProgress(
    accessToken: string,
    studentId: string,
    timeframe: 'week' | 'month' | 'all' = 'month'
  ): Promise<ProgressMetrics> {
    if (!studentId || typeof studentId !== 'string') {
      throw new StudentAPIError('INVALID_INPUT', 'Student ID is required', 400);
    }

    const response = await makeRequest<any>(
      `/students/${studentId}/progress?timeframe=${timeframe}`,
      accessToken,
      { skipCache: true }
    );

    return {
      totalSessions: response.stats?.totalSessions || 0,
      completedSessions: response.stats?.completedSessions || 0,
      averageScore: response.stats?.averageRating || 0,
      improvementTrend: response.stats?.currentStreak || 0,
    };
  },

  /**
   * Get student's stats summary
   */
  async getStudentStats(
    accessToken: string,
    studentId: string
  ) {
    if (!studentId || typeof studentId !== 'string') {
      throw new StudentAPIError('INVALID_INPUT', 'Student ID is required', 400);
    }

    const response = await makeRequest<any>(
      `/students/${studentId}/stats`,
      accessToken,
      { skipCache: true }
    );

    return {
      totalSessions: response.totalSessions || 0,
      completedSessions: response.completedSessions || 0,
      upcomingSessions: response.upcomingSessions || 0,
      averageScore: response.averageScore || 0,
      attendanceRate: response.attendanceRate || 0,
      currentStreak: response.currentStreak || 0,
    };
  },

  /**
   * Mark a report as viewed by student
   */
  async markReportViewed(
    accessToken: string,
    reportId: string
  ) {
    if (!reportId || typeof reportId !== 'string') {
      throw new StudentAPIError('INVALID_INPUT', 'Report ID is required', 400);
    }

    const response = await makeRequest<any>(
      `/reports/${reportId}/mark-viewed`,
      accessToken,
      { method: 'POST' }
    );

    return response;
  },

  /**
   * Notify tutor of student progress improvement.
   *
   * A single options object (not positional args) — the call site in
   * StudentDashboard.tsx used to pass previousScore/currentScore/subject as
   * bare positional numbers/strings that didn't line up with this
   * function's old (accessToken, studentId, tutorId, data) signature at
   * all, and the body field names sent (newScore/improvement) didn't match
   * what POST /students/:studentId/notify-progress actually validates
   * (currentScore/improvementPercentage) — so this call has never
   * actually succeeded. Fixed on both ends.
   */
  async notifyProgressImprovement(
    accessToken: string,
    studentId: string,
    data: {
      tutorId?: string;
      previousScore: number;
      currentScore: number;
      subject: string;
      improvementPercentage: number;
    }
  ) {
    if (!studentId) {
      throw new StudentAPIError('INVALID_INPUT', 'Student ID required', 400);
    }

    if (data.improvementPercentage < 5) {
      // Only notify for significant improvements (>5%)
      return { success: false, reason: 'improvement_too_small' };
    }

    const response = await makeRequest<any>(
      `/students/${studentId}/notify-progress`,
      accessToken,
      {
        method: 'POST',
        body: {
          tutorId: data.tutorId,
          previousScore: data.previousScore,
          currentScore: data.currentScore,
          subject: data.subject,
          improvementPercentage: data.improvementPercentage,
        }
      }
    );

    return response;
  },

  /**
   * Get batch reports for multiple bookings
   */
  async getReportsForBookings(
    accessToken: string,
    bookingIds: string[],
    opts?: StudentRequestOpts
  ) {
    if (!Array.isArray(bookingIds) || bookingIds.length === 0) {
      throw new StudentAPIError('INVALID_INPUT', 'Booking IDs array required', 400);
    }

    const response = await makeRequest<any>(
      `/bookings/${bookingIds.join(',')}/reports`,
      accessToken,
      { skipCache: true, ...(opts?.timeout != null ? { timeout: opts.timeout } : {}) }
    );

    return {
      reports: response.reports || [],
      missing: response.missing || [],
      count: response.count || 0,
    };
  },

  /**
   * Submit assessment feedback
   */
  async submitAssessmentFeedback(
    accessToken: string,
    assessmentId: string,
    feedback: {
      rating?: number;
      comment?: string;
    }
  ) {
    if (!assessmentId) {
      throw new StudentAPIError('INVALID_INPUT', 'Assessment ID required', 400);
    }

    if (feedback.rating && (feedback.rating < 1 || feedback.rating > 5)) {
      throw new StudentAPIError('INVALID_INPUT', 'Rating must be between 1-5', 400);
    }

    const response = await makeRequest<any>(
      `/assessments/${assessmentId}/feedback`,
      accessToken,
      {
        method: 'POST',
        body: feedback
      }
    );

    return response;
  },

  /**
   * Get learning paths
   */
  async getLearningPaths(
    accessToken: string,
    studentId: string
  ) {
    if (!studentId) {
      throw new StudentAPIError('INVALID_INPUT', 'Student ID required', 400);
    }

    const response = await makeRequest<any>(
      `/students/${studentId}/learning-paths`,
      accessToken,
      { skipCache: true }
    );

    return response.paths || [];
  },

  /**
   * Get curriculum materials for grade
   */
  async getCurriculumForGrade(
    accessToken: string,
    gradeLevel: string
  ) {
    if (!gradeLevel) {
      throw new StudentAPIError('INVALID_INPUT', 'Grade level required', 400);
    }

    const response = await makeRequest<any>(
      `/curriculum/${gradeLevel}`,
      accessToken,
      { skipCache: false }
    );

    return response.curriculum || [];
  },

  /**
   * Get curriculum PDF URL
   */
  async getCurriculumPDFUrl(
    accessToken: string,
    gradeLevel: string
  ): Promise<string> {
    if (!gradeLevel) {
      throw new StudentAPIError('INVALID_INPUT', 'Grade level required', 400);
    }

    const response = await makeRequest<any>(
      `/curriculum/${gradeLevel}/pdf`,
      accessToken,
      { skipCache: true }
    );

    return response.url || '';
  },

  /**
   * Get student achievements/badges
*/
  async getStudentAchievements(
    accessToken: string,
    studentId: string
  ) {
    if (!studentId) {
      throw new StudentAPIError('INVALID_INPUT', 'Student ID required', 400);
    }

    const response = await makeRequest<any>(
      `/students/${studentId}/achievements`,
      accessToken,
      { skipCache: true }
    );

    return response.achievements || [];
  },
};

export default studentAPI;
