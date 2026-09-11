import { edgeFunctionBaseUrl, edgeFunctionHeaders } from './supabase-edge-fetch';
import { validateChildId, validateFilter, validateGradeLevel, safeValidateFilter } from './validation';
import type { 
  Child, 
  Tutor, 
  BookingData, 
  SessionReport, 
  ProgressMetrics,
  Curriculum,
  FilterState,
  APIResponse,
  PaginatedResponse
} from '../types/dashboard';

// Configuration
const API_BASE_URL = edgeFunctionBaseUrl();
const TIMEOUT_MS = 30000;

// Request cache to prevent duplicate requests
const requestCache = new Map<string, { promise: Promise<any>; timestamp: number }>();
const CACHE_TTL_MS = 5000; // 5 seconds

export class APIError extends Error {
  constructor(
    public code: string,
    message: string,
    public status: number,
    public details?: unknown
  ) {
    super(message);
    this.name = 'APIError';
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

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new APIError(
          errorData.code || 'UNKNOWN_ERROR',
          errorData.message || response.statusText || 'API request failed',
          response.status,
          errorData.details
        );
      }

      const data = await response.json();
      return data as T;
    } catch (error) {
      if (error instanceof APIError) {
        throw error;
      }
      if (error instanceof Error && error.name === 'AbortError') {
        throw new APIError('TIMEOUT', 'Request timeout', 408);
      }
      throw new APIError(
        'NETWORK_ERROR',
        error instanceof Error ? error.message : 'Network error',
        0,
        error
      );
    } finally {
      clearTimeout(timeoutId);
    }
  })();

  // Cache GET requests
  if (method === 'GET' && !skipCache) {
    requestCache.set(cacheKey, { promise, timestamp: Date.now() });
  }

  return promise;
}

/**
 * Clear the request cache
 */
export function clearAPICache() {
  requestCache.clear();
}

/**
 * Clear a specific cache entry
 */
export function clearAPICacheEntry(endpoint: string, method = 'GET') {
  const url = `${API_BASE_URL}${endpoint}`;
  const cacheKey = `${method}:${url}`;
  requestCache.delete(cacheKey);
}

// ==================== PARENT DASHBOARD APIs ====================

export const parentAPI = {
  // Children Management
  async getChildren(accessToken: string): Promise<Child[]> {
    const response = await makeRequest<{ children: Child[] }>(
      '/parent/children',
      accessToken
    );
    return response.children || [];
  },

  async addChild(accessToken: string, child: Partial<Child>): Promise<Child> {
    const response = await makeRequest<Child>(
      '/parent/children',
      accessToken,
      {
        method: 'POST',
        body: child,
      }
    );
    return response;
  },

  async updateChild(
    accessToken: string,
    childId: string,
    updates: Partial<Child>
  ): Promise<Child> {
    const response = await makeRequest<Child>(
      `/parent/children/${childId}`,
      accessToken,
      {
        method: 'PUT',
        body: updates,
      }
    );
    return response;
  },

  // Tutor Search
  async searchTutors(
    accessToken: string,
    childId: string,
    filters?: FilterState,
    options?: { page?: number; pageSize?: number }
  ): Promise<PaginatedResponse<Tutor>> {
    // Validate inputs
    const validatedChildId = validateChildId(childId);
    const validatedFilters = safeValidateFilter(filters) || {};

    const params = new URLSearchParams({
      childId: validatedChildId,
      ...(validatedFilters.subject && { subject: validatedFilters.subject }),
      ...(validatedFilters.level && { level: validatedFilters.level }),
      ...(validatedFilters.availability && { availability: validatedFilters.availability }),
      ...(validatedFilters.minPrice !== undefined && { minPrice: validatedFilters.minPrice.toString() }),
      ...(validatedFilters.maxPrice !== undefined && { maxPrice: validatedFilters.maxPrice.toString() }),
      ...(validatedFilters.minRating !== undefined && { minRating: validatedFilters.minRating.toString() }),
      ...(validatedFilters.dbsVerified !== undefined && { dbsVerified: validatedFilters.dbsVerified.toString() }),
      ...(validatedFilters.sortBy && { sortBy: validatedFilters.sortBy }),
      ...(validatedFilters.sortOrder && { sortOrder: validatedFilters.sortOrder }),
      page: (options?.page || 1).toString(),
      pageSize: (options?.pageSize || 25).toString(),
    });

    const response = await makeRequest<PaginatedResponse<Tutor>>(
      `/search/tutors?${params.toString()}`,
      accessToken
    );
    return response;
  },

  async getTutorRecommendations(accessToken: string, childId: string): Promise<Tutor[]> {
    const response = await makeRequest<{ tutors: Tutor[] }>(
      `/search/recommendations?childId=${childId}`,
      accessToken
    );
    return response.tutors || [];
  },

  // Bookings
  async getBookings(
    accessToken: string,
    studentId: string,
    filters?: { status?: string; startDate?: string; endDate?: string }
  ): Promise<BookingData[]> {
    const params = new URLSearchParams({
      studentId,
      ...(filters?.status && { status: filters.status }),
      ...(filters?.startDate && { startDate: filters.startDate }),
      ...(filters?.endDate && { endDate: filters.endDate }),
    });

    const response = await makeRequest<{ bookings: BookingData[] }>(
      `/bookings?${params.toString()}`,
      accessToken
    );
    return response.bookings || [];
  },

  async getBookingReports(accessToken: string, bookingIds: string[]): Promise<Record<string, SessionReport>> {
    if (bookingIds.length === 0) return {};

    // The endpoint returns { reports: SessionReport[], missing: [...] } —
    // not a map — so callers (BookingManager.tsx's `bookingReports[id]`
    // lookups) need it re-keyed by bookingId here.
    const response = await makeRequest<{ reports: (SessionReport & { bookingId: string })[] }>(
      `/bookings/${bookingIds.join(',')}/reports`,
      accessToken,
      { skipCache: true }
    );
    const byBookingId: Record<string, SessionReport> = {};
    for (const report of response.reports ?? []) {
      byBookingId[report.bookingId] = report;
    }
    return byBookingId;
  },

  async cancelBooking(
    accessToken: string,
    bookingId: string,
    reason?: string
  ): Promise<{ success: boolean; refundAmount: number; refundPercentage: number }> {
    const response = await makeRequest<{ success: boolean; refundAmount: number; refundPercentage: number }>(
      `/bookings/${bookingId}/cancel`,
      accessToken,
      {
        method: 'POST',
        body: { reason },
        skipCache: true,
      }
    );
    clearAPICacheEntry(`/bookings`);
    return response;
  },

  async calculateRefund(
    accessToken: string,
    bookingId: string
  ): Promise<{ refundAmount: number; refundPercentage: number; policy: string }> {
    const response = await makeRequest<{ refundAmount: number; refundPercentage: number; policy: string }>(
      `/bookings/${bookingId}/calculate-refund`,
      accessToken
    );
    return response;
  },

  // Progress Tracking
  async getProgress(
    accessToken: string,
    studentId: string,
    timeframe: '7days' | '30days' | '90days' | 'alltime'
  ): Promise<ProgressMetrics> {
    const response = await makeRequest<ProgressMetrics>(
      `/students/${studentId}/progress?timeframe=${timeframe}`,
      accessToken
    );
    return response;
  },

  // Session Reports
  async getSessionReports(
    accessToken: string,
    parentId: string,
    studentId?: string,
    options?: { page?: number; pageSize?: number; filters?: { subject?: string; status?: string } }
  ): Promise<PaginatedResponse<SessionReport>> {
    const params = new URLSearchParams({
      parentId,
      ...(studentId && { studentId }),
      page: (options?.page || 1).toString(),
      pageSize: (options?.pageSize || 10).toString(),
    });

    const response = await makeRequest<PaginatedResponse<SessionReport>>(
      `/tutor-session-reports/by-parent/${parentId}?${params.toString()}`,
      accessToken
    );
    return response;
  },

  // Curriculum
  async getCurricula(
    accessToken: string,
    gradeLevel: string
  ): Promise<Curriculum[]> {
    const response = await makeRequest<{ curricula: Curriculum[] }>(
      `/curriculum/grade/${gradeLevel}`,
      accessToken
    );
    return response.curricula || [];
  },

  async getCurriculumPDFUrl(
    accessToken: string,
    curriculumId: string
  ): Promise<{ signedUrl: string; expiresIn: number }> {
    const response = await makeRequest<{ signedUrl: string; expiresIn: number }>(
      `/curriculum/${curriculumId}/view`,
      accessToken,
      { skipCache: true }
    );
    return response;
  },

  // Invitations
  async sendTutorInvitation(
    accessToken: string,
    tutorId: string,
    childId: string
  ): Promise<{ success: boolean; message?: string }> {
    const response = await makeRequest<{ success: boolean; message?: string }>(
      '/invitations/send',
      accessToken,
      {
        method: 'POST',
        body: { tutorId, childId },
      }
    );
    return response;
  },
};

// ==================== UTILITY FUNCTIONS ====================

export function getAPIBaseURL(): string {
  return API_BASE_URL;
}

export function getProjectId(): string {
  return projectId;
}
