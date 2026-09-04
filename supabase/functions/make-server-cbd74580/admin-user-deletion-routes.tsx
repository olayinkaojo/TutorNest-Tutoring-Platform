import { Hono } from 'npm:hono@4';
import * as kv from './kv_store.tsx';
import { logAuditEvent } from './activity-log.tsx';

/**
 * Hard-deletes a user's own identity/account data.
 *
 * Scope is deliberate, not exhaustive: this removes the user's own login
 * (Supabase Auth account), profile, role-specific profiles, connected-service
 * tokens, payout/banking settings, and personal notifications.
 *
 * It deliberately does NOT delete: documents, the verification record, or
 * any audit/action log — kept for security and safeguarding purposes even
 * after the account is gone (e.g. a tutor's uploaded ID/certificates, or the
 * record of why a verification was rejected, may still matter later). It
 * also does NOT touch bookings, payments/invoices, reviews, disputes, session
 * reports, or messages that reference this user. Those records legitimately
 * belong to (or involve) other real users too, and several are under
 * retention requirements the app's own privacy policy commits to (7yr
 * payment records, 6yr dispute records, indefinite safeguarding records) —
 * deleting an account isn't supposed to erase someone else's transaction or
 * dispute history with them. Once the user's profile record is gone, those
 * historical rows display the account as "Unknown" rather than crashing or
 * leaking a stale name, which is the correct behaviour for a deleted user's
 * footprint elsewhere in the system.
 *
 * The known roles list mirrors what add-role/switch-role in
 * role-management-routes.tsx accept.
 */
const KNOWN_ROLES = ['parent', 'tutor', 'student'];

export const adminUserDeletionRoutes = (app: Hono, getUserId: Function, supabase: any) => {
  const requireAdmin = async (c: any): Promise<string | Response> => {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const userId = await getUserId(accessToken ?? null);
    if (!userId) return c.json({ error: 'Unauthorized' }, 401);
    const profile = (await kv.get(`user:${userId}`)) as { role?: string } | null;
    if (String(profile?.role || '').toLowerCase() !== 'admin') {
      return c.json({ error: 'Admin access required' }, 403);
    }
    return userId;
  };

  app.delete('/make-server-cbd74580/admin/users/:userId', async (c) => {
    const adminIdOrResponse = await requireAdmin(c);
    if (adminIdOrResponse instanceof Response) return adminIdOrResponse;
    const adminId = adminIdOrResponse as string;

    const targetUserId = c.req.param('userId');
    if (targetUserId === adminId) {
      return c.json({ error: 'You cannot delete your own account this way.' }, 400);
    }

    let reason = '';
    try {
      const body = await c.req.json();
      reason = String(body?.reason || '').trim();
    } catch {
      /* no body / non-JSON — reason stays empty, caught below */
    }
    if (!reason) {
      return c.json({ error: 'A reason is required for account deletion.' }, 400);
    }

    const targetUser = (await kv.get(`user:${targetUserId}`)) as Record<string, unknown> | null;
    if (!targetUser) {
      return c.json({ error: 'User not found' }, 404);
    }
    if (String(targetUser.role || '').toLowerCase() === 'admin') {
      return c.json({ error: 'Admin accounts cannot be deleted through this action.' }, 400);
    }

    // Audit log first — this survives independently of the user's own data,
    // so the record of who deleted this account and why exists even if a
    // later step below fails partway through.
    await logAuditEvent({
      userId: targetUserId,
      adminId,
      action: 'account_deleted',
      category: 'account',
      description: `Account permanently deleted. Email: ${targetUser.email || 'unknown'}. Reason: ${reason}`,
      severity: 'warning',
      metadata: { reason, email: targetUser.email, role: targetUser.role },
    });

    const deleted = {
      documentsRetained: 0,
      roleProfiles: 0,
      notifications: 0,
      authAccount: false,
    };
    const warnings: string[] = [];

    // ── Documents are intentionally NOT deleted — kept for security and ─────
    // safeguarding purposes. Just count them so the admin can see what's
    // still there.
    try {
      const allDocuments = await kv.getByPrefix('document:');
      deleted.documentsRetained = allDocuments.filter(
        (d: any) => d.uploadedBy === targetUserId,
      ).length;
    } catch (err: any) {
      warnings.push(`Could not count retained documents: ${err.message}`);
    }

    // ── Role-specific profiles ───────────────────────────────────────────────
    try {
      const roles = ((await kv.get(`user_roles:${targetUserId}`)) as string[] | null) || KNOWN_ROLES;
      for (const role of roles) {
        const profileKey = `profile_${role}_${targetUserId}`;
        const existing = await kv.get(profileKey);
        if (existing) {
          await kv.del(profileKey);
          deleted.roleProfiles++;
        }
      }
    } catch (err: any) {
      warnings.push(`Role profile cleanup incomplete: ${err.message}`);
    }

    // ── Personal notifications ───────────────────────────────────────────────
    try {
      const allNotifications = await kv.getByPrefix('notification:');
      const own = allNotifications.filter((n: any) => n.userId === targetUserId);
      for (const n of own) {
        await kv.del(n.id ?? `notification:${n.id}`);
        deleted.notifications++;
      }
    } catch (err: any) {
      warnings.push(`Notification cleanup incomplete: ${err.message}`);
    }

    // ── Directly-keyed personal/account records ──────────────────────────────
    // Note: verification:<id> is deliberately NOT included — it's the record
    // of why a tutor was approved/rejected, kept for the same security reason
    // documents are.
    const directKeys = [
      `user_roles:${targetUserId}`,
      `google_calendar_tokens:${targetUserId}`,
      `parent_children:${targetUserId}`,
      `payout_settings:${targetUserId}`,
      `bank_account:${targetUserId}`,
      `notification-preferences:${targetUserId}`,
    ];
    for (const key of directKeys) {
      try {
        await kv.del(key);
      } catch (err: any) {
        warnings.push(`Could not delete ${key}: ${err.message}`);
      }
    }

    // ── Supabase Auth account ────────────────────────────────────────────────
    try {
      const { error: authError } = await supabase.auth.admin.deleteUser(targetUserId);
      if (authError) {
        warnings.push(`Auth account not removed: ${authError.message}`);
      } else {
        deleted.authAccount = true;
      }
    } catch (err: any) {
      warnings.push(`Auth account not removed: ${err.message}`);
    }

    // ── The user's own profile record, last ──────────────────────────────────
    await kv.del(`user:${targetUserId}`);

    return c.json({ success: true, deleted, warnings });
  });
};
