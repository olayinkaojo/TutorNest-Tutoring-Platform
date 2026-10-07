/**
 * Worksheets API client — the one tricky bit is identity: a visitor browsing
 * for free has no account yet, so every call attaches EITHER a real bearer
 * token (logged in) OR a random visitor id generated once and kept in
 * localStorage (anonymous) — the backend treats both the same way for the
 * free-tier logic, see worksheets-routes.tsx.
 */
import { edgeFunctionBaseUrl } from './supabase-edge-fetch';

const API_BASE = `${edgeFunctionBaseUrl()}/worksheets`;
const VISITOR_ID_KEY = 'kfa_worksheets_visitor_id';

export function getVisitorId(): string {
  try {
    let id = localStorage.getItem(VISITOR_ID_KEY);
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem(VISITOR_ID_KEY, id);
    }
    return id;
  } catch {
    // Private browsing / storage blocked — fall back to a per-load id. Free
    // limits just won't persist across reloads for this one visitor, which
    // is a strictly more generous failure mode, not a broken one.
    return crypto.randomUUID();
  }
}

function identityHeaders(accessToken?: string | null): Record<string, string> {
  if (accessToken) return { Authorization: `Bearer ${accessToken}` };
  return { 'X-Visitor-Id': getVisitorId() };
}

async function request<T>(
  path: string,
  accessToken: string | null | undefined,
  options: RequestInit = {},
): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...identityHeaders(accessToken),
      ...options.headers,
    },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const err = new Error(data.error || `Request failed (${response.status})`) as Error & {
      status?: number;
      code?: string;
      price?: number;
    };
    err.status = response.status;
    err.code = data.code;
    err.price = data.price;
    throw err;
  }
  return data as T;
}

export interface WorksheetItem {
  id: string;
  subject: string;
  yearGroup: string;
  title: string;
  description: string;
  isPremium: boolean;
  premiumPrice?: number;
  thumbnailUrl: string | null;
  locked: boolean;
  lockReason: 'premium' | 'subscribe' | null;
}

export interface WorksheetAccess {
  isLoggedIn: boolean;
  chosenYearGroups: string[];
  lockedIn: boolean;
  downloadCount: number;
  freeLimit: number;
  yearGroupLimit: number;
  subscription: { active: boolean; status: string; currentPeriodEnd: string } | null;
  ownedPremiumIds: string[];
}

export const worksheetsAPI = {
  async getCatalog(accessToken: string | null | undefined, subject?: string, yearGroup?: string) {
    const params = new URLSearchParams();
    if (subject) params.set('subject', subject);
    if (yearGroup) params.set('yearGroup', yearGroup);
    const qs = params.toString();
    const data = await request<{ items: WorksheetItem[] }>(`/catalog${qs ? `?${qs}` : ''}`, accessToken);
    return data.items;
  },

  async getMyAccess(accessToken: string | null | undefined) {
    return request<WorksheetAccess>('/my-access', accessToken);
  },

  async setFreePicks(accessToken: string | null | undefined, yearGroups: string[]) {
    return request<{ success: true; chosenYearGroups: string[] }>('/my-free-picks', accessToken, {
      method: 'POST',
      body: JSON.stringify({ yearGroups }),
    });
  },

  async getFileUrl(accessToken: string | null | undefined, worksheetId: string) {
    return request<{ url: string; title: string }>(`/${worksheetId}/file`, accessToken);
  },

  async initiateSubscription(accessToken: string) {
    return request<{ success: true; reference: string; amount: number }>('/subscribe/initiate', accessToken, {
      method: 'POST',
    });
  },

  async confirmSubscription(accessToken: string, reference: string) {
    return request<{ success: true; subscription: any }>('/subscribe/confirm', accessToken, {
      method: 'POST',
      body: JSON.stringify({ reference }),
    });
  },

  async initiatePurchase(accessToken: string, worksheetId: string) {
    return request<{ success: true; reference: string; amount: number; title: string }>('/purchase/initiate', accessToken, {
      method: 'POST',
      body: JSON.stringify({ worksheetId }),
    });
  },

  async confirmPurchase(accessToken: string, reference: string) {
    return request<{ success: true; worksheetId: string }>('/purchase/confirm', accessToken, {
      method: 'POST',
      body: JSON.stringify({ reference }),
    });
  },
};
