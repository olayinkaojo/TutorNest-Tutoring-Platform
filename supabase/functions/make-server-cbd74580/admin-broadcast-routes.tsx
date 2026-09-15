/**
 * Admin → role-segmented email broadcasts ("Announcements" tab).
 *
 * Replaces the previous workflow of an admin manually copying tutor emails
 * out of individual profiles into a BCC field — a real privacy risk (one
 * slip putting recipients in "To" instead of "Bcc" leaks every address to
 * everyone), a deliverability risk (a single email with dozens of BCC
 * recipients reads as spam-like to mail providers, which can hurt the
 * sending domain's reputation for OUR real transactional email too), and
 * leaves no record of who was actually messaged.
 *
 * Every recipient gets their own individually-addressed, personalized
 * email (sent through the same Resend integration as every other system
 * email) instead of one email BCC'd to everyone — this is the standard
 * approach for role-segmented operational broadcasts.
 */
import { Hono } from 'npm:hono@4';
import * as kv from './kv_store.tsx';
import { requireAdmin } from './route-auth.tsx';
import { sendEmail, renderBroadcastEmailHtml } from './email-service.tsx';
import { logAuditEvent } from './activity-log.tsx';

const app = new Hono();

// Keeps one broadcast well inside the Edge Function's execution window even
// at a send rate deliberately throttled for Resend's rate limits. If this
// platform's user base grows well past this, sending should move to a
// background job/queue instead of a single request — flagged here rather
// than silently truncating a larger audience.
const MAX_RECIPIENTS_PER_SEND = 2000;
const SEND_CONCURRENCY = 5;
const SEND_BATCH_DELAY_MS = 300;

type AudienceFilters = {
  roles: string[]; // e.g. ['tutor', 'parent'] — empty/absent means "every role"
  verificationStatus?: string; // 'verified' | 'pending' | 'rejected' | 'any' — tutor-only, ignored for other roles
  excludeSuspended?: boolean; // defaults true
};

type Recipient = { id: string; email: string; firstName: string };

/** Same role/verification resolution logic as GET /admin/users, kept in sync. */
async function resolveAudience(filters: AudienceFilters): Promise<Recipient[]> {
  const rawUsers = await kv.getByPrefix('user:');
  const userIds = rawUsers.map((u: any) => u.id || u.userId).filter(Boolean);
  const roleLists = userIds.length ? await kv.mget(userIds.map((id: string) => `user_roles:${id}`)) : [];
  const rolesByUserId = new Map<string, string[]>(
    userIds.map((id: string, i: number) => [id, (roleLists[i] as string[] | undefined) ?? []]),
  );

  const roles = filters.roles ?? [];
  const excludeSuspended = filters.excludeSuspended !== false;

  const matched = rawUsers.filter((user: any) => {
    if (!user.email) return false;
    if (excludeSuspended && (user.suspended || user.banned || user.deleted)) return false;

    const id = user.id || user.userId;
    const storedRoles = rolesByUserId.get(id) ?? [];
    const allRoles = storedRoles.length
      ? Array.from(new Set([...storedRoles, ...(user.role ? [user.role] : [])]))
      : (user.role ? [user.role] : []);

    if (roles.length > 0 && !roles.some((r) => allRoles.includes(r))) return false;

    if (filters.verificationStatus && filters.verificationStatus !== 'any' && allRoles.includes('tutor')) {
      const status = user.verificationStatus || 'pending';
      if (status !== filters.verificationStatus) return false;
    }

    return true;
  });

  // De-dupe by email — a dual-role user (e.g. tutor+parent) matching both
  // selected roles would otherwise get the same broadcast twice.
  const seen = new Set<string>();
  const recipients: Recipient[] = [];
  for (const user of matched) {
    const email = String(user.email).toLowerCase().trim();
    if (seen.has(email)) continue;
    seen.add(email);
    recipients.push({
      id: user.id || user.userId,
      email: user.email,
      firstName: user.firstName || (user.fullName || user.full_name || user.name || '').split(' ')[0] || 'there',
    });
  }
  return recipients;
}

function personalize(text: string, firstName: string): string {
  return text.replace(/\{\{\s*firstName\s*\}\}/gi, firstName);
}

// ── Preview: how many people would this reach? ──────────────────────────────
app.post('/preview', async (c) => {
  const auth = await requireAdmin(c);
  if (auth instanceof Response) return auth;

  try {
    const filters = (await c.req.json()) as AudienceFilters;
    const recipients = await resolveAudience(filters);
    return c.json({
      count: recipients.length,
      sample: recipients.slice(0, 8).map((r) => ({ name: r.firstName, email: r.email })),
    });
  } catch (error: any) {
    console.error('Error previewing broadcast audience:', error);
    return c.json({ error: error.message || 'Internal server error' }, 500);
  }
});

// ── Test send: to the admin's own email only ────────────────────────────────
app.post('/test-send', async (c) => {
  const auth = await requireAdmin(c);
  if (auth instanceof Response) return auth;
  const userId = auth;

  try {
    const { subject, body } = (await c.req.json()) as { subject: string; body: string };
    if (!subject?.trim() || !body?.trim()) {
      return c.json({ error: 'Subject and message are required' }, 400);
    }

    const admin = (await kv.get(`user:${userId}`)) as any;
    if (!admin?.email) return c.json({ error: 'Could not find your own email on file' }, 400);

    const firstName = admin.firstName || 'Admin';
    const result = await sendEmail({
      to: admin.email,
      subject: `[TEST] ${personalize(subject, firstName)}`,
      html: renderBroadcastEmailHtml(firstName, personalize(body, firstName)),
    });

    if (!result.success) return c.json({ error: result.error || 'Test send failed' }, 502);
    return c.json({ success: true, sentTo: admin.email });
  } catch (error: any) {
    console.error('Error sending broadcast test email:', error);
    return c.json({ error: error.message || 'Internal server error' }, 500);
  }
});

// ── Real send ────────────────────────────────────────────────────────────────
app.post('/send', async (c) => {
  const auth = await requireAdmin(c);
  if (auth instanceof Response) return auth;
  const userId = auth;

  try {
    const payload = (await c.req.json()) as AudienceFilters & { subject: string; body: string };
    const { subject, body, ...filters } = payload;
    if (!subject?.trim() || !body?.trim()) {
      return c.json({ error: 'Subject and message are required' }, 400);
    }

    const recipients = await resolveAudience(filters);
    if (recipients.length === 0) {
      return c.json({ error: 'No recipients match this audience' }, 400);
    }
    if (recipients.length > MAX_RECIPIENTS_PER_SEND) {
      return c.json({
        error: `This audience (${recipients.length}) exceeds the ${MAX_RECIPIENTS_PER_SEND}-recipient limit for a single broadcast. Narrow the audience or split it into multiple sends.`,
      }, 400);
    }

    const failures: { email: string; error?: string }[] = [];
    let sentCount = 0;

    for (let i = 0; i < recipients.length; i += SEND_CONCURRENCY) {
      const batch = recipients.slice(i, i + SEND_CONCURRENCY);
      const results = await Promise.allSettled(
        batch.map((r) =>
          sendEmail({
            to: r.email,
            subject: personalize(subject, r.firstName),
            html: renderBroadcastEmailHtml(r.firstName, personalize(body, r.firstName)),
          }),
        ),
      );
      results.forEach((res, idx) => {
        const recipient = batch[idx];
        if (res.status === 'fulfilled' && res.value.success) {
          sentCount += 1;
        } else {
          failures.push({
            email: recipient.email,
            error: res.status === 'fulfilled' ? res.value.error : String(res.reason),
          });
        }
      });
      if (i + SEND_CONCURRENCY < recipients.length) {
        await new Promise((resolve) => setTimeout(resolve, SEND_BATCH_DELAY_MS));
      }
    }

    const broadcastId = `broadcast_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    const record = {
      id: broadcastId,
      subject,
      body,
      filters,
      totalRecipients: recipients.length,
      sentCount,
      failedCount: failures.length,
      failures: failures.slice(0, 50), // enough to diagnose without an unbounded row
      sentBy: userId,
      sentAt: new Date().toISOString(),
    };
    await kv.set(`broadcast:${broadcastId}`, record);

    await logAuditEvent({
      userId,
      action: 'admin_broadcast_sent',
      category: 'account',
      description: `Broadcast email sent: "${subject}" to ${sentCount}/${recipients.length} recipients (${(filters.roles ?? []).join(', ') || 'all roles'})`,
      severity: failures.length > 0 ? 'warning' : 'info',
      metadata: { broadcastId, subject, totalRecipients: recipients.length, sentCount, failedCount: failures.length },
    });

    return c.json({
      success: true,
      broadcastId,
      totalRecipients: recipients.length,
      sentCount,
      failedCount: failures.length,
    });
  } catch (error: any) {
    console.error('Error sending broadcast:', error);
    return c.json({ error: error.message || 'Internal server error' }, 500);
  }
});

// ── History ──────────────────────────────────────────────────────────────────
app.get('/history', async (c) => {
  const auth = await requireAdmin(c);
  if (auth instanceof Response) return auth;

  const broadcasts = await kv.getByPrefix('broadcast:');
  return c.json({
    broadcasts: broadcasts.sort((a: any, b: any) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime()),
  });
});

export default app;
