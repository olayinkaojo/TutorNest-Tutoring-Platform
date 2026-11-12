import { Hono } from 'npm:hono@4';
import * as kv from './kv_store.tsx';
import * as db from './db.tsx';

// The three check-* endpoints below are meant to be called on a schedule
// (see .github/workflows/system-alert-checks.yml), not by a logged-in
// admin — they had no auth check at all before this, meaning anyone on the
// public internet could POST to them and write arbitrary KV records. A
// shared secret (set once via `supabase secrets set CRON_SECRET=...`) is
// enough for an internal scheduled caller without needing a real user
// session.
function requireCronSecret(c: any): Response | null {
  const expected = Deno.env.get('CRON_SECRET');
  const provided = c.req.header('x-cron-secret');
  if (!expected || provided !== expected) {
    return c.json({ error: 'Unauthorized' }, 401);
  }
  return null;
}

export const systemAlertsRoutes = (app: Hono, getUserId: Function) => {

  // Get all system alerts (admin only)
  app.get('/make-server-cbd74580/admin/system-alerts', async (c) => {
    try {
      const accessToken = c.req.header('Authorization')?.split(' ')[1];
      const userId = await getUserId(accessToken ?? null);

      if (!userId) {
        return c.json({ error: 'Unauthorized' }, 401);
      }

      // TODO: Verify admin role in production
      const user = await kv.get(`user:${userId}`) as any;
      if (!user || user.role !== 'admin') {
        return c.json({ error: 'Admin access required' }, 403);
      }

      const allAlerts = await kv.getByPrefix('system-alert:');
      const sortedAlerts = allAlerts.sort((a: any, b: any) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

      return c.json({ alerts: sortedAlerts });
    } catch (error: any) {
      console.error('Error fetching system alerts:', error);
      return c.json({ error: error.message || 'Internal server error' }, 500);
    }
  });

  // Get daily digest
  app.get('/make-server-cbd74580/admin/daily-digest', async (c) => {
    try {
      const accessToken = c.req.header('Authorization')?.split(' ')[1];
      const userId = await getUserId(accessToken ?? null);

      if (!userId) {
        return c.json({ error: 'Unauthorized' }, 401);
      }

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const allAlerts = await kv.getByPrefix('system-alert:');
      
      // Filter alerts for today
      const todayAlerts = allAlerts.filter((a: any) => {
        const alertDate = new Date(a.createdAt);
        alertDate.setHours(0, 0, 0, 0);
        return alertDate.getTime() === today.getTime();
      });

      const resolvedToday = allAlerts.filter((a: any) => {
        if (!a.resolvedAt) return false;
        const resolvedDate = new Date(a.resolvedAt);
        resolvedDate.setHours(0, 0, 0, 0);
        return resolvedDate.getTime() === today.getTime();
      });

      const digest = {
        date: today.toISOString(),
        totalAlerts: allAlerts.length,
        newAlerts: todayAlerts.length,
        resolvedAlerts: resolvedToday.length,
        criticalAlerts: allAlerts.filter((a: any) => a.severity === 'critical' && a.status !== 'resolved').length,
        paymentFailures: allAlerts.filter((a: any) => a.type === 'payment_failure' && a.status !== 'resolved').length,
        complianceExpiries: allAlerts.filter((a: any) => 
          (a.type === 'compliance_expiry' || a.type === 'dbs_expiry') && a.status !== 'resolved'
        ).length,
        abuseReports: allAlerts.filter((a: any) => a.type === 'abuse_report' && a.status !== 'resolved').length,
      };

      return c.json({ digest });
    } catch (error: any) {
      console.error('Error generating daily digest:', error);
      return c.json({ error: error.message || 'Internal server error' }, 500);
    }
  });

  // Update alert status
  app.put('/make-server-cbd74580/admin/system-alerts/:alertId/status', async (c) => {
    try {
      const accessToken = c.req.header('Authorization')?.split(' ')[1];
      const userId = await getUserId(accessToken ?? null);

      if (!userId) {
        return c.json({ error: 'Unauthorized' }, 401);
      }

      const user = await kv.get(`user:${userId}`) as any;
      if (!user || user.role !== 'admin') {
        return c.json({ error: 'Admin access required' }, 403);
      }

      const alertId = c.req.param('alertId');
      const { status, notes } = await c.req.json();

      const alert = await kv.get(alertId) as any;
      if (!alert) {
        return c.json({ error: 'Alert not found' }, 404);
      }

      const previousStatus = alert.status;
      alert.status = status;
      alert.updatedAt = new Date().toISOString();

      if (status === 'resolved') {
        alert.resolvedAt = new Date().toISOString();
      }

      // Add to audit trail
      const auditEntry = {
        id: `audit:${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        action: `Status changed from ${previousStatus} to ${status}`,
        performedBy: userId,
        performedByName: user.name || user.email,
        timestamp: new Date().toISOString(),
        notes: notes || '',
      };

      alert.auditTrail = alert.auditTrail || [];
      alert.auditTrail.push(auditEntry);

      await kv.set(alertId, alert);

      return c.json({ success: true, alert });
    } catch (error: any) {
      console.error('Error updating alert status:', error);
      return c.json({ error: error.message || 'Internal server error' }, 500);
    }
  });

  // Create system alert (called by other services)
  app.post('/make-server-cbd74580/admin/system-alerts', async (c) => {
    try {
      const accessToken = c.req.header('Authorization')?.split(' ')[1];
      const userId = await getUserId(accessToken ?? null);

      if (!userId) {
        return c.json({ error: 'Unauthorized' }, 401);
      }

      const alertData = await c.req.json();
      
      const alert = {
        id: `system-alert:${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        type: alertData.type,
        severity: alertData.severity,
        title: alertData.title,
        description: alertData.description,
        relatedUserId: alertData.relatedUserId,
        relatedUserName: alertData.relatedUserName,
        relatedEntityId: alertData.relatedEntityId,
        status: 'new',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        auditTrail: [],
      };

      await kv.set(alert.id, alert);

      // Send real-time notification for critical/high severity alerts
      if (alert.severity === 'critical' || alert.severity === 'high') {
        // TODO: Send real-time alert via WebSocket, email, or SMS
        console.log(`HIGH PRIORITY ALERT: ${alert.title}`);
      }

      return c.json({ alert });
    } catch (error: any) {
      console.error('Error creating system alert:', error);
      return c.json({ error: error.message || 'Internal server error' }, 500);
    }
  });

  // Scheduled job to check for compliance expiries
  app.post('/make-server-cbd74580/admin/check-compliance', async (c) => {
    const authError = requireCronSecret(c);
    if (authError) return authError;
    try {
      const allTutors = await kv.getByPrefix('user:');
      const tutors = allTutors.filter((user: any) => user.role === 'tutor');
      const now = new Date();
      const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

      let alertsCreated = 0;

      for (const tutor of tutors) {
        const tutorId = tutor.userId || tutor.id; // Handle both field names
        const tutorName =
          tutor.fullName || tutor.full_name || tutor.name ||
          `${tutor.firstName || ''} ${tutor.lastName || ''}`.trim() ||
          'A tutor';

        // Check DBS expiry — dbsCheckExpiry is never written by any live
        // signup or profile-edit form (confirmed by grep: this file is the
        // only reference to that field anywhere in the codebase), so this
        // branch is correctly inert until that field actually gets
        // collected somewhere. Left in place rather than removed, since
        // wiring it up later should start working immediately with no
        // further change here.
        if (tutor.dbsCheckExpiry) {
          const expiryDate = new Date(tutor.dbsCheckExpiry);

          if (expiryDate <= now) {
            // DBS has expired
            await kv.set(`system-alert:dbs-expired-${tutorId}`, {
              id: `system-alert:dbs-expired-${tutorId}`,
              type: 'dbs_expiry',
              severity: 'critical',
              title: 'DBS Check Expired',
              description: `DBS check for ${tutorName} has expired`,
              relatedUserId: tutorId,
              relatedUserName: tutorName,
              status: 'new',
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              auditTrail: [],
            });
            alertsCreated++;
          } else if (expiryDate <= thirtyDaysFromNow) {
            // DBS expiring soon
            await kv.set(`system-alert:dbs-expiring-${tutorId}`, {
              id: `system-alert:dbs-expiring-${tutorId}`,
              type: 'dbs_expiry',
              severity: 'high',
              title: 'DBS Check Expiring Soon',
              description: `DBS check for ${tutorName} expires on ${expiryDate.toLocaleDateString()}`,
              relatedUserId: tutorId,
              relatedUserName: tutorName,
              status: 'new',
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              auditTrail: [],
            });
            alertsCreated++;
          }
        }

        // Check profile completeness. dbsCheckExpiry was previously in this
        // list too — since nothing anywhere ever sets it, that made EVERY
        // verified tutor "incomplete" unconditionally, regardless of how
        // complete their actual profile was (confirmed: 0 of 122 tutor
        // profiles have it set). Dropped it; a field no UI lets anyone fill
        // in isn't a completeness signal, just permanent noise. Also
        // accepts a single `name`/`fullName` field, not just a split
        // firstName/lastName — many real profiles only have the former.
        if (tutor.verificationStatus === 'verified') {
          const hasName = !!(tutor.fullName || tutor.full_name || tutor.name || (tutor.firstName && tutor.lastName));
          // hourlyRate dropped from this list too (2026-11-12): every
          // tutor now charges the same platform flat rate and can no
          // longer set their own, so a missing one is expected, not an
          // incompleteness signal.
          const missingFields = [
            !hasName && 'name',
            !tutor.subjects && 'subjects',
          ].filter((f): f is string => !!f);

          const alertId = `system-alert:incomplete-profile-${tutorId}`;
          if (missingFields.length > 0) {
            await kv.set(alertId, {
              id: alertId,
              type: 'compliance_expiry',
              severity: 'medium',
              title: 'Incomplete Tutor Profile',
              description: `Tutor ${tutorName} is missing: ${missingFields.join(', ')}`,
              relatedUserId: tutorId,
              relatedUserName: tutorName,
              status: 'new',
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              auditTrail: [],
            });
            alertsCreated++;
          } else {
            // Profile is now complete — clear a stale alert from a
            // previous run rather than leaving it to sit forever.
            await kv.del(alertId).catch(() => {});
          }
        }
      }

      return c.json({ alertsCreated });
    } catch (error: any) {
      console.error('Error checking compliance:', error);
      return c.json({ error: error.message || 'Internal server error' }, 500);
    }
  });

  // Scheduled job to flag abandoned payments. There is no real "failed"
  // payment state in this system — a Flutterwave checkout that's abandoned
  // or declined just never calls back, leaving the payment permanently
  // `pending` in Postgres (see payment-routes.tsx's initiate-plan/
  // confirm-plan). The original version of this check read a KV
  // `payment:` prefix for `status === 'failed'`, a value nothing anywhere
  // ever writes — it could never match a single record. Re-pointed at the
  // real signal: a payment stuck in `pending` for more than 2 hours.
  app.post('/make-server-cbd74580/admin/check-payment-failures', async (c) => {
    const authError = requireCronSecret(c);
    if (authError) return authError;
    try {
      const allPayments = await db.getAllPaymentsForAdmin().catch(() => [] as any[]);
      const twoHoursAgo = Date.now() - 2 * 60 * 60 * 1000;
      const abandoned = allPayments.filter(
        (p: any) => p.status === 'pending' && new Date(p.createdAt).getTime() < twoHoursAgo,
      );

      let alertsCreated = 0;

      for (const payment of abandoned) {
        const alertId = `system-alert:payment-abandoned-${payment.id}`;
        const existingAlert = await kv.get(alertId);
        if (existingAlert) continue;

        await kv.set(alertId, {
          id: alertId,
          type: 'payment_failure',
          severity: 'medium',
          title: 'Abandoned Checkout',
          description: `A ₦${payment.amount} checkout (ref ${payment.reference}) was started but never completed, and has been pending for over 2 hours.`,
          relatedUserId: payment.userId,
          relatedEntityId: payment.id,
          status: 'new',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          auditTrail: [],
        });
        alertsCreated++;
      }

      return c.json({ alertsCreated });
    } catch (error: any) {
      console.error('Error checking payment failures:', error);
      return c.json({ error: error.message || 'Internal server error' }, 500);
    }
  });

  // Scheduled job to check for overdue reports. Previously read only the
  // legacy KV `booking:` prefix — the free-booking path's storage, which
  // confirmPlanPayment (the real paid-booking flow) never writes to — so a
  // tutor could go indefinitely without filing a report for a paid session
  // and nothing would ever flag it. Reads Postgres bookings (the primary
  // store for both booking paths) plus any KV-only stragglers, same merge
  // GET /admin/sessions already does.
  app.post('/make-server-cbd74580/admin/check-overdue-reports', async (c) => {
    const authError = requireCronSecret(c);
    if (authError) return authError;
    try {
      const dbBookings = await db.getAllBookingsForAdmin().catch(() => [] as any[]);
      const dbIds = new Set(dbBookings.map((b: any) => b.id));
      const kvBookingsRaw = ((await kv.getByPrefix('booking:').catch(() => [])) as any[]) || [];
      const kvOnly = kvBookingsRaw.filter((b: any) => b?.id && !dbIds.has(b.id));
      const allBookings = [...dbBookings, ...kvOnly];

      const completedBookings = allBookings.filter((b: any) => b.status === 'completed');
      const now = new Date();

      let alertsCreated = 0;

      for (const booking of completedBookings) {
        const sessionEnd = new Date(`${booking.date}T${booking.endTime || booking.startTime || '00:00'}`);
        const hoursSinceSession = (now.getTime() - sessionEnd.getTime()) / (1000 * 60 * 60);

        // Check if report is overdue (48 hours)
        if (hoursSinceSession > 48) {
          const report = await kv.get(`report:${booking.id}`);

          if (!report) {
            // No report exists
            const alertId = `system-alert:report-overdue-${booking.id}`;
            const existingAlert = await kv.get(alertId);
            if (existingAlert) continue;

            const tutorProfile = (await db.getProfile(booking.tutorId).catch(() => null))
              ?? (await kv.get(`user:${booking.tutorId}`).catch(() => null));
            const tutorName = tutorProfile?.fullName || tutorProfile?.full_name || booking.tutorName || 'A tutor';

            await kv.set(alertId, {
              id: alertId,
              type: 'report_overdue',
              severity: 'medium',
              title: 'Session Report Overdue',
              description: `${tutorName} has not submitted a report for the session on ${new Date(booking.date).toLocaleDateString()}`,
              relatedUserId: booking.tutorId,
              relatedUserName: tutorName,
              relatedEntityId: booking.id,
              status: 'new',
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              auditTrail: [],
            });
            alertsCreated++;
          }
        }
      }

      return c.json({ alertsCreated });
    } catch (error: any) {
      console.error('Error checking overdue reports:', error);
      return c.json({ error: error.message || 'Internal server error' }, 500);
    }
  });
};