import type { VercelRequest, VercelResponse } from '@vercel/node';

// This endpoint is called by Vercel Cron every day at 07:00 UTC and 12:00 UTC.
// It triggers the Supabase edge function that schedules 24h and 1h session reminder emails.
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
    return res.status(200).json({ success: true, result: data, triggeredAt: new Date().toISOString() });
  } catch (err: any) {
    console.error('Cron error:', err);
    return res.status(500).json({ error: err.message });
  }
}
