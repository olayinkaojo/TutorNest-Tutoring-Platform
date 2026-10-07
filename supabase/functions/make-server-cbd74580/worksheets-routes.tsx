/**
 * Worksheets — a free-sampler-to-subscription resource library, separate
 * from curriculum-routes.tsx (tutor-only grade curricula) and admin-routes.tsx's
 * generic parent/student "resources" (base64-in-KV, no anonymous access, no
 * per-item purchase). This one is deliberately usable by someone who has
 * never signed up at all:
 *
 *   anonymous visitor → picks 3 year groups → 5 free downloads total →
 *   hits the limit → sign up → subscribe (₦15,000) → everything (except
 *   per-item "premium" worksheets, which always need their own one-time
 *   purchase, subscribed or not — owning something needs an account, so
 *   that's the one point where even an anonymous visitor must sign up).
 *
 * An anonymous visitor has no account, so their free-tier usage is tracked
 * against a random id their browser generates and sends as X-Visitor-Id —
 * not airtight (clearing it/incognito resets the count), accepted as a
 * known trade-off for a no-signup-required sampler rather than something
 * worth real anti-abuse engineering for.
 *
 * Billing is "soft recurring": Flutterwave NGN card auto-debit needs card
 * tokenization and compliance groundwork this account doesn't have, so a
 * subscription is a 30-day window a parent manually re-pays to extend
 * (checkWorksheetRenewals, below, emails a reminder near/at expiry) rather
 * than a silently auto-charged subscription.
 */
import { Hono } from 'npm:hono@4';
import { createClient } from 'npm:@supabase/supabase-js@2';
import * as kv from './kv_store.tsx';
import { requireAdmin, verifyUser } from './route-auth.tsx';
import { logAuditEvent } from './activity-log.tsx';
import { sendEmail, renderBroadcastEmailHtml } from './email-service.tsx';

const app = new Hono();

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
);

const FLUTTERWAVE_SECRET_KEY = Deno.env.get('FLUTTERWAVE_SECRET_KEY') ?? '';
const BUCKET = 'make-cbd74580-worksheets';
const FREE_DOWNLOAD_LIMIT = 5;
const FREE_YEAR_GROUP_LIMIT = 3;
const SUBSCRIPTION_PRICE = 15_000; // ₦, NGN
const SUBSCRIPTION_PERIOD_DAYS = 30;

export const SUBJECTS = ['Maths', 'English'];
export const YEAR_GROUPS = [
  { value: 'year_1', label: 'Year 1 / Primary 1 (P1)' },
  { value: 'year_2', label: 'Year 2 / Primary 2 (P2)' },
  { value: 'year_3', label: 'Year 3 / Primary 3 (P3)' },
  { value: 'year_4', label: 'Year 4 / Primary 4 (P4)' },
  { value: 'year_5', label: 'Year 5 / Primary 5 (P5)' },
  { value: 'year_6', label: 'Year 6 / Primary 6 (P6)' },
  { value: 'year_7', label: 'Year 7 / JSS 1' },
  { value: 'year_8', label: 'Year 8 / JSS 2' },
  { value: 'year_9', label: 'Year 9 / JSS 3' },
  { value: 'year_10', label: 'Year 10 / SS 1' },
  { value: 'year_11', label: 'Year 11 / SS 2' },
  { value: 'year_12', label: 'Year 12 / SS 3' },
  { value: 'year_13', label: 'Year 13 / Post-Secondary' },
];

async function ensureBucket() {
  const { data: buckets } = await supabase.storage.listBuckets();
  if (!buckets?.some((b) => b.name === BUCKET)) {
    await supabase.storage.createBucket(BUCKET, { public: false, fileSizeLimit: 26_214_400 }); // 25MB
  }
}

type Identity = { userId: string | null; visitorId: string | null };

async function resolveIdentity(c: any): Promise<Identity> {
  const accessToken = c.req.header('Authorization')?.split(' ')[1];
  const userId = accessToken ? await verifyUser(c) : null;
  if (userId) return { userId, visitorId: null };
  const visitorId = c.req.header('X-Visitor-Id') || null;
  return { userId: null, visitorId };
}

function accessKey(identity: Identity): string | null {
  if (identity.userId) return `worksheet_access:user:${identity.userId}`;
  if (identity.visitorId) return `worksheet_access:visitor:${identity.visitorId}`;
  return null;
}

type AccessState = {
  chosenYearGroups: string[];
  downloadCount: number;
  downloadedIds: string[];
  lockedIn: boolean;
};

function defaultAccessState(): AccessState {
  return { chosenYearGroups: [], downloadCount: 0, downloadedIds: [], lockedIn: false };
}

async function getSubscription(userId: string | null) {
  if (!userId) return null;
  const sub = (await kv.get(`worksheet_subscription:${userId}`)) as any;
  if (!sub) return null;
  // A subscription past its period end is treated as lapsed even if the
  // renewal-check cron hasn't run yet — status on the record is the
  // authoritative record of what happened, but expiry is a plain date
  // comparison, always re-checked live rather than trusted stale.
  const active = sub.status === 'active' && new Date(sub.currentPeriodEnd) > new Date();
  return { ...sub, active };
}

async function getOwnedPremiumIds(userId: string | null): Promise<string[]> {
  if (!userId) return [];
  return ((await kv.get(`worksheet_owned:${userId}`)) as string[] | null) ?? [];
}

// ── Catalog (public — works for anonymous visitors and logged-in users) ────
app.get('/catalog', async (c) => {
  try {
    const identity = await resolveIdentity(c);
    const subject = c.req.query('subject');
    const yearGroup = c.req.query('yearGroup');

    const all = (await kv.getByPrefix('worksheet:')) as any[];
    const filtered = all.filter(
      (w) => (!subject || w.subject === subject) && (!yearGroup || w.yearGroup === yearGroup),
    );

    const key = accessKey(identity);
    const access = key ? ((await kv.get(key)) as AccessState | null) ?? defaultAccessState() : defaultAccessState();
    const subscription = await getSubscription(identity.userId);
    const ownedIds = await getOwnedPremiumIds(identity.userId);

    const items = filtered
      .map((w) => {
        let locked = false;
        let lockReason: 'premium' | 'subscribe' | null = null;

        if (w.isPremium) {
          if (!ownedIds.includes(w.id)) {
            locked = true;
            lockReason = 'premium';
          }
        } else if (!subscription?.active) {
          const inChosenGroups = access.chosenYearGroups.length === 0 || access.chosenYearGroups.includes(w.yearGroup);
          const alreadyDownloaded = access.downloadedIds.includes(w.id);
          if (!alreadyDownloaded && (!inChosenGroups || access.downloadCount >= FREE_DOWNLOAD_LIMIT)) {
            locked = true;
            lockReason = 'subscribe';
          }
        }

        return {
          id: w.id,
          subject: w.subject,
          yearGroup: w.yearGroup,
          title: w.title,
          description: w.description,
          isPremium: !!w.isPremium,
          premiumPrice: w.isPremium ? w.premiumPrice : undefined,
          thumbnailUrl: w.thumbnailPath ? `/make-server-cbd74580/worksheets/${w.id}/thumbnail` : null,
          locked,
          lockReason,
        };
      })
      .sort((a, b) => a.title.localeCompare(b.title));

    return c.json({ items });
  } catch (error: any) {
    console.error('Error fetching worksheet catalog:', error);
    return c.json({ error: error.message || 'Internal server error' }, 500);
  }
});

// ── My access state (drives the picker/paywall UI) ──────────────────────────
app.get('/my-access', async (c) => {
  try {
    const identity = await resolveIdentity(c);
    const key = accessKey(identity);
    const access = key ? ((await kv.get(key)) as AccessState | null) ?? defaultAccessState() : defaultAccessState();
    const subscription = await getSubscription(identity.userId);
    const ownedPremiumIds = await getOwnedPremiumIds(identity.userId);

    return c.json({
      isLoggedIn: !!identity.userId,
      chosenYearGroups: access.chosenYearGroups,
      lockedIn: access.lockedIn,
      downloadCount: access.downloadCount,
      freeLimit: FREE_DOWNLOAD_LIMIT,
      yearGroupLimit: FREE_YEAR_GROUP_LIMIT,
      subscription: subscription ? { active: subscription.active, status: subscription.status, currentPeriodEnd: subscription.currentPeriodEnd } : null,
      ownedPremiumIds,
    });
  } catch (error: any) {
    console.error('Error fetching worksheet access state:', error);
    return c.json({ error: error.message || 'Internal server error' }, 500);
  }
});

// ── Choose (or change, before the first download) free year groups ─────────
app.post('/my-free-picks', async (c) => {
  try {
    const identity = await resolveIdentity(c);
    const key = accessKey(identity);
    if (!key) return c.json({ error: 'A visitor id or login is required' }, 400);

    const { yearGroups } = (await c.req.json()) as { yearGroups: string[] };
    if (!Array.isArray(yearGroups) || yearGroups.length === 0 || yearGroups.length > FREE_YEAR_GROUP_LIMIT) {
      return c.json({ error: `Choose up to ${FREE_YEAR_GROUP_LIMIT} year groups` }, 400);
    }
    const validValues = new Set(YEAR_GROUPS.map((g) => g.value));
    if (!yearGroups.every((g) => validValues.has(g))) {
      return c.json({ error: 'Invalid year group' }, 400);
    }

    const access = ((await kv.get(key)) as AccessState | null) ?? defaultAccessState();
    if (access.lockedIn) {
      return c.json({ error: 'Your free year groups are already locked in after your first download' }, 409);
    }

    access.chosenYearGroups = yearGroups;
    await kv.set(key, access);
    return c.json({ success: true, chosenYearGroups: yearGroups });
  } catch (error: any) {
    console.error('Error setting free year-group picks:', error);
    return c.json({ error: error.message || 'Internal server error' }, 500);
  }
});

// ── Thumbnail (public, low-stakes — not gated the way the real file is) ────
app.get('/:id/thumbnail', async (c) => {
  try {
    const id = c.req.param('id');
    const w = (await kv.get(`worksheet:${id}`)) as any;
    if (!w?.thumbnailPath) return c.json({ error: 'Not found' }, 404);
    const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(w.thumbnailPath, 3600);
    if (error || !data) return c.json({ error: 'Not found' }, 404);
    return c.redirect(data.signedUrl, 302);
  } catch (error: any) {
    return c.json({ error: error.message || 'Internal server error' }, 500);
  }
});

// ── The gated file itself ───────────────────────────────────────────────────
app.get('/:id/file', async (c) => {
  try {
    const id = c.req.param('id');
    const w = (await kv.get(`worksheet:${id}`)) as any;
    if (!w) return c.json({ error: 'Not found' }, 404);

    const identity = await resolveIdentity(c);

    if (w.isPremium) {
      if (!identity.userId) {
        return c.json({ error: 'Sign up to purchase this worksheet', code: 'signup_required' }, 401);
      }
      const owned = await getOwnedPremiumIds(identity.userId);
      if (!owned.includes(id)) {
        return c.json({ error: 'Purchase this worksheet to access it', code: 'purchase_required', price: w.premiumPrice }, 402);
      }
    } else {
      const subscription = await getSubscription(identity.userId);
      if (!subscription?.active) {
        const key = accessKey(identity);
        if (!key) return c.json({ error: 'Sign up to continue', code: 'signup_required' }, 401);

        const access = ((await kv.get(key)) as AccessState | null) ?? defaultAccessState();
        const alreadyDownloaded = access.downloadedIds.includes(id);

        if (!alreadyDownloaded) {
          const willUseNewGroup = !access.chosenYearGroups.includes(w.yearGroup);
          if (willUseNewGroup && access.chosenYearGroups.length >= FREE_YEAR_GROUP_LIMIT) {
            return c.json({ error: 'Sign up and subscribe to access more year groups', code: 'subscribe_required' }, 402);
          }
          if (access.downloadCount >= FREE_DOWNLOAD_LIMIT) {
            return c.json({ error: 'Sign up and subscribe to download more worksheets', code: 'subscribe_required' }, 402);
          }

          if (willUseNewGroup) access.chosenYearGroups.push(w.yearGroup);
          access.downloadCount += 1;
          access.downloadedIds.push(id);
          access.lockedIn = true; // first real download locks in the 3 picks
          await kv.set(key, access);
        }
      }
    }

    const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(w.filePath, 300);
    if (error || !data) return c.json({ error: 'Could not generate a download link' }, 500);
    return c.json({ url: data.signedUrl, title: w.title });
  } catch (error: any) {
    console.error('Error serving worksheet file:', error);
    return c.json({ error: error.message || 'Internal server error' }, 500);
  }
});

// ── Subscription payment (authenticated only — owning access needs an id) ──
app.post('/subscribe/initiate', async (c) => {
  try {
    const userId = await verifyUser(c);
    if (!userId) return c.json({ error: 'Please sign in first' }, 401);
    if (!FLUTTERWAVE_SECRET_KEY) return c.json({ error: 'Payments are not configured yet' }, 503);

    const reference = `WSUB_${crypto.randomUUID().replace(/-/g, '')}`;
    await kv.set(`worksheet_payment:${reference}`, {
      type: 'subscription',
      userId,
      amount: SUBSCRIPTION_PRICE,
      reference,
      status: 'pending',
      createdAt: new Date().toISOString(),
    });

    return c.json({ success: true, reference, amount: SUBSCRIPTION_PRICE });
  } catch (error: any) {
    console.error('Error initiating worksheet subscription:', error);
    return c.json({ error: error.message || 'Internal server error' }, 500);
  }
});

app.post('/purchase/initiate', async (c) => {
  try {
    const userId = await verifyUser(c);
    if (!userId) return c.json({ error: 'Please sign in first' }, 401);
    if (!FLUTTERWAVE_SECRET_KEY) return c.json({ error: 'Payments are not configured yet' }, 503);

    const { worksheetId } = (await c.req.json()) as { worksheetId: string };
    const w = (await kv.get(`worksheet:${worksheetId}`)) as any;
    if (!w?.isPremium) return c.json({ error: 'This worksheet is not individually purchasable' }, 400);

    const owned = await getOwnedPremiumIds(userId);
    if (owned.includes(worksheetId)) return c.json({ error: 'You already own this worksheet' }, 409);

    const reference = `WBUY_${crypto.randomUUID().replace(/-/g, '')}`;
    await kv.set(`worksheet_payment:${reference}`, {
      type: 'premium_purchase',
      userId,
      worksheetId,
      amount: w.premiumPrice,
      reference,
      status: 'pending',
      createdAt: new Date().toISOString(),
    });

    return c.json({ success: true, reference, amount: w.premiumPrice, title: w.title });
  } catch (error: any) {
    console.error('Error initiating worksheet purchase:', error);
    return c.json({ error: error.message || 'Internal server error' }, 500);
  }
});

// ── Shared confirm: verifies the real charge against what we expect ────────
// Same amount/currency/tx_ref hardening as confirmPlanPayment in
// payment-routes.tsx — "successful" alone only proves SOME charge went
// through under this reference, not that it was for the right amount.
async function confirmWorksheetPayment(reference: string, userId: string) {
  if (!FLUTTERWAVE_SECRET_KEY) throw new Error('Payments are not configured yet');

  const record = (await kv.get(`worksheet_payment:${reference}`)) as any;
  if (!record) throw new Error('Payment record not found');
  if (record.userId !== userId) throw new Error('This payment does not belong to you');
  if (record.status === 'successful') return record; // idempotent

  const verifyRes = await fetch(
    `https://api.flutterwave.com/v3/transactions/verify_by_reference?tx_ref=${reference}`,
    { headers: { Authorization: `Bearer ${FLUTTERWAVE_SECRET_KEY}` } },
  );
  const verifyData = (await verifyRes.json()) as any;
  if (verifyData.status !== 'success' || verifyData.data?.status !== 'successful') {
    throw new Error(`Payment not confirmed by Flutterwave (status: ${verifyData.data?.status ?? 'unknown'})`);
  }

  const paidAmount = Number(verifyData.data?.amount);
  const paidCurrency = verifyData.data?.currency;
  const paidRef = verifyData.data?.tx_ref;
  if (paidRef !== reference || paidCurrency !== 'NGN' || !(paidAmount >= Number(record.amount))) {
    await logAuditEvent({
      userId,
      action: 'worksheet_payment_amount_mismatch',
      category: 'payments',
      description: `Worksheet payment ${reference} succeeded on Flutterwave but for ${paidAmount} ${paidCurrency}, expected ₦${record.amount}.`,
      severity: 'critical',
      metadata: { reference, expectedAmount: record.amount, paidAmount, paidCurrency },
    }).catch(() => {});
    throw new Error('Payment amount did not match the expected price. Please contact support.');
  }

  record.status = 'successful';
  record.confirmedAt = new Date().toISOString();
  await kv.set(`worksheet_payment:${reference}`, record);
  return record;
}

app.post('/subscribe/confirm', async (c) => {
  try {
    const userId = await verifyUser(c);
    if (!userId) return c.json({ error: 'Please sign in first' }, 401);

    const { reference } = (await c.req.json()) as { reference: string };
    const record = await confirmWorksheetPayment(reference, userId);
    if (record.type !== 'subscription') return c.json({ error: 'Invalid reference for a subscription' }, 400);

    const existing = (await kv.get(`worksheet_subscription:${userId}`)) as any;
    // Renewing before expiry extends from the current end date, not from
    // today — paying early shouldn't cost a parent the days they already paid for.
    const base = existing?.currentPeriodEnd && new Date(existing.currentPeriodEnd) > new Date()
      ? new Date(existing.currentPeriodEnd)
      : new Date();
    const currentPeriodEnd = new Date(base);
    currentPeriodEnd.setDate(currentPeriodEnd.getDate() + SUBSCRIPTION_PERIOD_DAYS);

    const subscription = {
      userId,
      status: 'active',
      startedAt: existing?.startedAt ?? new Date().toISOString(),
      currentPeriodEnd: currentPeriodEnd.toISOString(),
      lastPaymentReference: reference,
      reminderSentAt: null,
    };
    await kv.set(`worksheet_subscription:${userId}`, subscription);

    await logAuditEvent({
      userId,
      action: 'worksheet_subscription_started',
      category: 'payments',
      description: `Worksheets subscription active until ${subscription.currentPeriodEnd}`,
      metadata: { reference },
    }).catch(() => {});

    return c.json({ success: true, subscription });
  } catch (error: any) {
    console.error('Error confirming worksheet subscription:', error);
    return c.json({ error: error.message || 'Internal server error' }, 500);
  }
});

app.post('/purchase/confirm', async (c) => {
  try {
    const userId = await verifyUser(c);
    if (!userId) return c.json({ error: 'Please sign in first' }, 401);

    const { reference } = (await c.req.json()) as { reference: string };
    const record = await confirmWorksheetPayment(reference, userId);
    if (record.type !== 'premium_purchase') return c.json({ error: 'Invalid reference for a purchase' }, 400);

    const owned = await getOwnedPremiumIds(userId);
    if (!owned.includes(record.worksheetId)) {
      owned.push(record.worksheetId);
      await kv.set(`worksheet_owned:${userId}`, owned);
    }

    return c.json({ success: true, worksheetId: record.worksheetId });
  } catch (error: any) {
    console.error('Error confirming worksheet purchase:', error);
    return c.json({ error: error.message || 'Internal server error' }, 500);
  }
});

// ── Admin: upload / list / delete (same pattern as CurriculumUploader) ─────
app.post('/admin/upload', async (c) => {
  const auth = await requireAdmin(c);
  if (auth instanceof Response) return auth;
  const adminId = auth;

  try {
    await ensureBucket();
    const formData = await c.req.formData();
    const file = formData.get('file') as File;
    const thumbnail = formData.get('thumbnail') as File | null;
    const subject = formData.get('subject') as string;
    const yearGroup = formData.get('yearGroup') as string;
    const title = formData.get('title') as string;
    const description = (formData.get('description') as string) || '';
    const isPremium = formData.get('isPremium') === 'true';
    const premiumPrice = isPremium ? Number(formData.get('premiumPrice')) : undefined;

    if (!file || !subject || !yearGroup || !title) {
      return c.json({ error: 'File, subject, year group and title are required' }, 400);
    }
    if (isPremium && (!premiumPrice || premiumPrice <= 0)) {
      return c.json({ error: 'Premium worksheets need a price greater than 0' }, 400);
    }

    const id = `worksheet_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    const fileExt = file.name.split('.').pop() || 'pdf';
    const filePath = `files/${id}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(filePath, await file.arrayBuffer(), { contentType: file.type, upsert: false });
    if (uploadError) return c.json({ error: `File upload failed: ${uploadError.message}` }, 500);

    let thumbnailPath: string | null = null;
    if (thumbnail) {
      const thumbExt = thumbnail.name.split('.').pop() || 'jpg';
      thumbnailPath = `thumbnails/${id}.${thumbExt}`;
      const { error: thumbError } = await supabase.storage
        .from(BUCKET)
        .upload(thumbnailPath, await thumbnail.arrayBuffer(), { contentType: thumbnail.type, upsert: false });
      if (thumbError) {
        console.warn('Thumbnail upload failed (non-fatal):', thumbError.message);
        thumbnailPath = null;
      }
    }

    const worksheet = {
      id,
      subject,
      yearGroup,
      title,
      description,
      filePath,
      thumbnailPath,
      fileSize: file.size,
      isPremium,
      premiumPrice: isPremium ? premiumPrice : undefined,
      uploadedBy: adminId,
      uploadedAt: new Date().toISOString(),
    };
    await kv.set(`worksheet:${id}`, worksheet);

    await logAuditEvent({
      userId: adminId,
      action: 'worksheet_uploaded',
      category: 'content',
      description: `Worksheet uploaded: "${title}" (${subject}, ${yearGroup}${isPremium ? `, premium ₦${premiumPrice}` : ''})`,
      metadata: { id, subject, yearGroup, isPremium },
    });

    return c.json({ success: true, worksheet: { id, title } });
  } catch (error: any) {
    console.error('Error uploading worksheet:', error);
    return c.json({ error: error.message || 'Internal server error' }, 500);
  }
});

app.get('/admin/all', async (c) => {
  const auth = await requireAdmin(c);
  if (auth instanceof Response) return auth;

  const all = (await kv.getByPrefix('worksheet:')) as any[];
  return c.json({
    worksheets: all.sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime()),
  });
});

app.delete('/admin/:id', async (c) => {
  const auth = await requireAdmin(c);
  if (auth instanceof Response) return auth;
  const adminId = auth;

  const id = c.req.param('id');
  const w = (await kv.get(`worksheet:${id}`)) as any;
  if (w) {
    await supabase.storage.from(BUCKET).remove([w.filePath, ...(w.thumbnailPath ? [w.thumbnailPath] : [])]).catch(() => {});
    await kv.del(`worksheet:${id}`);
    await logAuditEvent({
      userId: adminId,
      action: 'worksheet_deleted',
      category: 'content',
      description: `Worksheet deleted: "${w.title}"`,
      metadata: { id },
    });
  }
  return c.json({ success: true });
});

// ── Cron-only: renewal reminders + lapsing expired subscriptions ───────────
// Called from the same daily Vercel cron that already triggers session
// reminders (api/cron/send-reminders.ts) — gated on the service role key,
// the same credential that function already holds, rather than the
// unauthenticated pattern notifications/schedule-reminders used.
app.post('/check-renewals', async (c) => {
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const presented = c.req.header('Authorization')?.split(' ')[1];
  if (!serviceKey || presented !== serviceKey) return c.json({ error: 'Unauthorized' }, 401);

  const results = { reminded: 0, lapsed: 0, errors: [] as string[] };
  try {
    const subs = (await kv.getByPrefix('worksheet_subscription:')) as any[];
    const now = new Date();

    for (const sub of subs) {
      try {
        if (sub.status !== 'active') continue;
        const end = new Date(sub.currentPeriodEnd);
        const daysLeft = (end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);

        if (daysLeft <= 0) {
          sub.status = 'lapsed';
          await kv.set(`worksheet_subscription:${sub.userId}`, sub);
          results.lapsed++;
          continue;
        }

        // One reminder, 3 days out, not repeated every run until it renews/lapses.
        if (daysLeft <= 3 && !sub.reminderSentAt) {
          const profile = (await kv.get(`user:${sub.userId}`)) as any;
          if (profile?.email) {
            const firstName = profile.firstName || 'there';
            await sendEmail({
              to: profile.email,
              subject: 'Your Worksheets subscription renews soon',
              html: renderBroadcastEmailHtml(
                firstName,
                `Your Knowledge Fons Academy Worksheets subscription ends on ${end.toLocaleDateString('en-GB', { dateStyle: 'long' })}.\n\nRenew any time before then from the Worksheets tab to keep uninterrupted access — it only takes a moment.`,
              ),
            }).catch(() => {});
          }
          sub.reminderSentAt = now.toISOString();
          await kv.set(`worksheet_subscription:${sub.userId}`, sub);
          results.reminded++;
        }
      } catch (e: any) {
        results.errors.push(`${sub.userId}: ${e.message}`);
      }
    }
  } catch (e: any) {
    results.errors.push(e.message);
  }

  return c.json({ success: true, results });
});

export default app;
