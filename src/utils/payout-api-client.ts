/**
 * Payout API Client
 * Standardized API for payout operations following international financial standards
 * Uses ISO 8601 timestamps and RFC 3339 formatting
 */

import { projectId } from './supabase/info';

interface PayoutRequest {
  tutorId: string;
  amount: number;
  idempotencyKey?: string;
}

interface PayoutResponse {
  id: string;
  status: 'pending_approval' | 'approved' | 'processing' | 'completed' | 'failed';
  reference: string;
  amount: number;
  requestedAt: string; // ISO 8601
  processedAt?: string;
}

interface PayoutBatchResponse {
  batchId: string;
  batchNumber: string;
  status: 'scheduled' | 'processing' | 'completed' | 'failed';
  totalAmount: number;
  successCount: number;
  failureCount: number;
  createdAt: string;
  processedAt?: string;
}

const BASE_URL = `https://${projectId}.supabase.co/functions/v1/make-server-cbd74580`;

/**
 * Generate unique idempotency key to prevent duplicate payouts
 * Format: {tutorId}-{amount}-{date}
 */
const generateIdempotencyKey = (tutorId: string, amount: number): string => {
  const date = new Date().toISOString().split('T')[0];
  return `${tutorId}-${amount}-${date}`;
};

/**
 * Get tutor payout summary with ISO 8601 timestamps
 */
export const getPayoutSummary = async (
  accessToken: string,
  tutorId: string
): Promise<any> => {
  try {
    const response = await fetch(`${BASE_URL}/payouts/tutor/${tutorId}/summary`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    return {
      earnings: data.earnings || [],
      payouts: data.payouts || [],
      summary: data.summary || {},
      bankAccount: data.bankAccount || null,
    };
  } catch (error) {
    console.error('[PAYOUT API] Error fetching payout summary:', error);
    throw error;
  }
};

/**
 * Get detailed earnings breakdown with transaction IDs
 */
export const getEarningsBreakdown = async (
  accessToken: string,
  tutorId: string
): Promise<any> => {
  try {
    const response = await fetch(`${BASE_URL}/payouts/tutor/${tutorId}/breakdown`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('[PAYOUT API] Error fetching earnings breakdown:', error);
    throw error;
  }
};

/**
 * Request a payout with idempotency key
 * Returns payout request with ISO 8601 timestamps
 */
export const requestPayout = async (
  accessToken: string,
  tutorId: string,
  amount: number
): Promise<PayoutResponse> => {
  try {
    const idempotencyKey = generateIdempotencyKey(tutorId, amount);

    const response = await fetch(`${BASE_URL}/payouts/request`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'Idempotency-Key': idempotencyKey,
      },
      body: JSON.stringify({
        tutorId,
        amount,
        idempotencyKey,
        requestedAt: new Date().toISOString(), // ISO 8601
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || `HTTP ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('[PAYOUT API] Error requesting payout:', error);
    throw error;
  }
};

/**
 * Get payout request status with full audit trail
 */
export const getPayoutStatus = async (
  accessToken: string,
  payoutId: string
): Promise<any> => {
  try {
    const response = await fetch(`${BASE_URL}/payouts/${payoutId}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('[PAYOUT API] Error fetching payout status:', error);
    throw error;
  }
};

/**
 * Get payout audit trail (complete transaction history)
 */
export const getPayoutAuditTrail = async (
  accessToken: string,
  payoutId: string
): Promise<any> => {
  try {
    const response = await fetch(`${BASE_URL}/payouts/${payoutId}/audit`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('[PAYOUT API] Error fetching audit trail:', error);
    throw error;
  }
};

/**
 * Get next payout date (typically Fridays at 2 PM UTC)
 */
export const getNextPayoutDate = async (accessToken: string): Promise<string> => {
  try {
    const response = await fetch(`${BASE_URL}/payouts/schedule/next`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    return data.nextPayoutDate; // ISO 8601 format
  } catch (error) {
    console.error('[PAYOUT API] Error fetching next payout date:', error);
    // Return next Friday as fallback
    const today = new Date();
    const dayOfWeek = today.getDay();
    const daysUntilFriday = (5 - dayOfWeek + 7) % 7 || 7;
    const nextFriday = new Date(today);
    nextFriday.setDate(today.getDate() + daysUntilFriday);
    return nextFriday.toISOString().split('T')[0];
  }
};

/**
 * Update payout settings (schedule, minimum threshold, etc.)
 */
export const updatePayoutSettings = async (
  accessToken: string,
  tutorId: string,
  settings: {
    payoutSchedule?: 'weekly' | 'biweekly' | 'monthly';
    minimumThreshold?: number;
    autoPayoutEnabled?: boolean;
  }
): Promise<any> => {
  try {
    const response = await fetch(`${BASE_URL}/payouts/settings/${tutorId}`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(settings),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('[PAYOUT API] Error updating payout settings:', error);
    throw error;
  }
};

/**
 * Verify bank account for payout (KYC check)
 */
export const verifyBankAccount = async (
  accessToken: string,
  tutorId: string,
  accountNumber: string,
  bankCode: string
): Promise<any> => {
  try {
    const response = await fetch(`${BASE_URL}/payouts/verify-bank`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        tutorId,
        accountNumber,
        bankCode,
        verifiedAt: new Date().toISOString(), // ISO 8601
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || `HTTP ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('[PAYOUT API] Error verifying bank account:', error);
    throw error;
  }
};

/**
 * Admin: Get all payout batches with filtering
 */
export const getPayoutBatches = async (
  accessToken: string,
  filters?: {
    status?: string;
    startDate?: string; // ISO 8601
    endDate?: string; // ISO 8601
  }
): Promise<PayoutBatchResponse[]> => {
  try {
    const queryParams = new URLSearchParams();
    if (filters?.status) queryParams.append('status', filters.status);
    if (filters?.startDate) queryParams.append('startDate', filters.startDate);
    if (filters?.endDate) queryParams.append('endDate', filters.endDate);

    const response = await fetch(
      `${BASE_URL}/payouts/admin/batches?${queryParams.toString()}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/json',
        },
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('[PAYOUT API] Error fetching payout batches:', error);
    throw error;
  }
};

/**
 * Admin: Approve a payout batch for processing
 */
export const approveBatch = async (
  accessToken: string,
  batchId: string,
  notes?: string
): Promise<PayoutBatchResponse> => {
  try {
    const response = await fetch(`${BASE_URL}/payouts/admin/batches/${batchId}/approve`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        approvalNotes: notes,
        approvedAt: new Date().toISOString(), // ISO 8601
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('[PAYOUT API] Error approving batch:', error);
    throw error;
  }
};

/**
 * Admin: Process a batch (execute payouts)
 */
export const processBatch = async (
  accessToken: string,
  batchId: string
): Promise<PayoutBatchResponse> => {
  try {
    const response = await fetch(`${BASE_URL}/payouts/admin/batches/${batchId}/process`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        processedAt: new Date().toISOString(), // ISO 8601
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('[PAYOUT API] Error processing batch:', error);
    throw error;
  }
};

/**
 * Admin: Retry failed payouts in a batch
 */
export const retryFailedPayouts = async (
  accessToken: string,
  batchId: string
): Promise<PayoutBatchResponse> => {
  try {
    const response = await fetch(`${BASE_URL}/payouts/admin/batches/${batchId}/retry`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        retriedAt: new Date().toISOString(), // ISO 8601
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('[PAYOUT API] Error retrying failed payouts:', error);
    throw error;
  }
};

/**
 * Admin: Get payout batch details with all requests
 */
export const getPayoutBatchDetails = async (
  accessToken: string,
  batchId: string
): Promise<any> => {
  try {
    const response = await fetch(`${BASE_URL}/payouts/admin/batches/${batchId}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('[PAYOUT API] Error fetching batch details:', error);
    throw error;
  }
};

/**
 * Admin: Export payout report (CSV)
 */
export const exportPayoutReport = async (
  accessToken: string,
  filters?: {
    status?: string;
    startDate?: string;
    endDate?: string;
  }
): Promise<Blob> => {
  try {
    const queryParams = new URLSearchParams();
    if (filters?.status) queryParams.append('status', filters.status);
    if (filters?.startDate) queryParams.append('startDate', filters.startDate);
    if (filters?.endDate) queryParams.append('endDate', filters.endDate);

    const response = await fetch(
      `${BASE_URL}/payouts/admin/export?${queryParams.toString()}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'text/csv',
        },
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return await response.blob();
  } catch (error) {
    console.error('[PAYOUT API] Error exporting report:', error);
    throw error;
  }
};

const payoutAPI = {
  getPayoutSummary,
  getEarningsBreakdown,
  requestPayout,
  getPayoutStatus,
  getPayoutAuditTrail,
  getNextPayoutDate,
  updatePayoutSettings,
  verifyBankAccount,
  getPayoutBatches,
  approveBatch,
  processBatch,
  retryFailedPayouts,
  getPayoutBatchDetails,
  exportPayoutReport,
};

export default payoutAPI;
