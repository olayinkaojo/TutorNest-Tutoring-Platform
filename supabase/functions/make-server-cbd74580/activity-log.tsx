import * as kv from './kv_store.tsx';

/**
 * Single source of truth for writing to the KV audit trail
 * (`audit:<userId>:<timestamp>`), read back by GET /admin/audit-log.
 *
 * Before this existed, every call site hand-built the same object literal —
 * inconsistent field names were an easy way to silently drop an entry from
 * views that expect a specific shape. `category` in particular is what lets
 * the admin dashboard's Audit Log tab split into sub-tabs instead of being
 * one long undifferentiated list.
 */
export type ActivityCategory =
  | 'account'
  | 'payments'
  | 'bookings'
  | 'disputes'
  | 'coupons'
  | 'subscriptions'
  | 'moderation'
  | 'content'
  | 'tax'
  | 'verification';

export const ACTIVITY_CATEGORY_LABELS: Record<ActivityCategory, string> = {
  account: 'Account & Access',
  payments: 'Payments & Payouts',
  bookings: 'Bookings',
  disputes: 'Disputes',
  coupons: 'Coupons & Credits',
  subscriptions: 'Subscriptions',
  moderation: 'Moderation',
  content: 'Content',
  tax: 'Tax & Invoicing',
  verification: 'Verification',
};

interface LogAuditEventParams {
  /** The account this activity is about — whose history it shows up under. */
  userId: string;
  /** Set when an admin performed the action on someone else's behalf. */
  adminId?: string;
  action: string;
  category: ActivityCategory;
  description: string;
  severity?: 'info' | 'warning' | 'critical';
  metadata?: Record<string, unknown>;
}

export async function logAuditEvent(params: LogAuditEventParams): Promise<void> {
  const id = `audit:${params.userId}:${Date.now()}`;
  await kv.set(id, {
    id,
    userId: params.userId,
    adminId: params.adminId,
    action: params.action,
    category: params.category,
    description: params.description,
    timestamp: new Date().toISOString(),
    severity: params.severity || 'info',
    metadata: params.metadata || {},
  });
}
