import type { VercelRequest, VercelResponse } from '@vercel/node';

// This endpoint is called by Vercel Cron every day at 07:00 UTC and 12:00 UTC.
// It triggers the Supabase edge function that schedules 24h and 1h session
// reminder emails, and (piggybacking on the same daily trigger rather than
// adding a third cron entry) the Worksheets subscription renewal check —
// sends a reminder a few days before a subscription lapses, and flips any
// subscription past its period end to lapsed.
export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Vercel Cron calls with Authorization header containing CRON_SECRET
  const authHeader = req.headers.authorization;
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceKey) {
    return res.status(500).json({ error: 'Missing Supabase env vars' });
  }

  try {
    const response = await fetch(
      `${supabaseUrl}/functions/v1/make-server-cbd74580/notifications/schedule-reminders`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${serviceKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ triggered_by: 'vercel-cron' }),
      }
    );

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      console.error('Reminder cron failed:', data);
      return res.status(500).json({ error: 'Reminders endpoint failed', details: data });
    }

    console.log('Reminders triggered successfully:', data);

    // Best-effort, non-blocking — a failure here shouldn't mark the whole
    // cron run as failed when session reminders above already succeeded.
    let worksheetResult: unknown = null;
    try {
      const wRes = await fetch(
        `${supabaseUrl}/functions/v1/make-server-cbd74580/worksheets/check-renewals`,
        { method: 'POST', headers: { Authorization: `Bearer ${serviceKey}` } },
      );
      worksheetResult = await wRes.json().catch(() => ({}));
      if (!wRes.ok) console.error('Worksheet renewal check failed:', worksheetResult);
    } catch (wErr: any) {
      console.error('Worksheet renewal check error:', wErr);
      worksheetResult = { error: wErr.message };
    }

    return res.status(200).json({
      success: true,
      result: data,
      worksheetRenewals: worksheetResult,
      triggeredAt: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error('Cron error:', err);
    return res.status(500).json({ error: err.message });
  }
}
