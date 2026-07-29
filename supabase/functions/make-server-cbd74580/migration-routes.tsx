import { Hono } from 'npm:hono@4';
import * as kv from './kv_store.tsx';
import { verifyAccessToken } from './route-auth.tsx';
import * as db from './db.tsx';

const migrationRoutes = new Hono();

const getUserIdFromToken = async (accessToken: string | null): Promise<string | null> => {
  return verifyAccessToken(accessToken);
};

// POST /admin/migrate-kv-to-postgres
// Migrates all KV bookings and payments to Postgres. Safe to run multiple times (upsert).
migrationRoutes.post('/admin/migrate-kv-to-postgres', async (c) => {
  const accessToken = c.req.header('Authorization')?.split(' ')[1];
  const userId = await getUserIdFromToken(accessToken);
  if (!userId) return c.json({ error: 'Unauthorized' }, 401);

  const adminUser = await kv.get(`user:${userId}`);
  if (!adminUser || adminUser.role !== 'admin') return c.json({ error: 'Admin only' }, 403);

  const results = { bookingsMigrated: 0, bookingsSkipped: 0, paymentsMigrated: 0, paymentsSkipped: 0, errors: [] as string[] };

  // --- Migrate bookings ---
  try {
    const kvBookings = await kv.getByPrefix('booking:');
    for (const b of kvBookings) {
      try {
        if (!b.id) continue;
        // Try to create — if it already exists (duplicate key), skip
        await db.createBooking({
          id: b.id,
          paymentId: b.paymentId || b.payment_id || '',
          planType: b.planType || b.plan_type || 'single',
          sessionNumber: b.sessionNumber || 1,
          totalSessions: b.totalSessions || 1,
          tutorId: b.tutorId || b.tutor_id || '',
          studentId: b.studentId || b.student_id || b.userId || '',
          userId: b.userId || b.parentId || '',
          date: b.date || b.sessionDate || '',
          startTime: b.startTime || b.time || '00:00',
          endTime: b.endTime || '00:00',
          duration: b.duration || 60,
          subject: b.subject || null,
          status: b.status || 'scheduled',
          paymentStatus: b.paymentStatus || b.payment_status || 'pending',
          meetLink: b.googleMeetLink || b.meetLink || undefined,
        }).catch((e: any) => {
          // Duplicate — already migrated
          if (e.message?.includes('duplicate') || e.message?.includes('unique')) {
            results.bookingsSkipped++;
          } else {
            results.errors.push(`booking ${b.id}: ${e.message}`);
          }
        });
        results.bookingsMigrated++;
      } catch (e: any) {
        results.errors.push(`booking ${b.id}: ${e.message}`);
      }
    }
  } catch (e: any) {
    results.errors.push(`KV bookings scan: ${e.message}`);
  }

  // --- Migrate payments ---
  try {
    const kvPayments = await kv.getByPrefix('payment:');
    for (const p of kvPayments) {
      try {
        if (!p.id || !p.reference) continue;
        await db.createPayment({
          id: p.id,
          userId: p.userId || p.user_id || '',
          tutorId: p.tutorId || p.tutor_id || '',
          studentId: p.studentId || p.student_id || '',
          planType: p.planType || p.plan_type || 'single',
          amount: Number(p.amount) || 0,
          reference: p.reference,
          startDate: p.startDate || p.date || new Date().toISOString().slice(0, 10),
          startTime: p.startTime || p.time || '00:00',
          subject: p.subject || null,
          status: p.status || 'pending',
        }).catch((e: any) => {
          if (e.message?.includes('duplicate') || e.message?.includes('unique')) {
            results.paymentsSkipped++;
          } else {
            results.errors.push(`payment ${p.id}: ${e.message}`);
          }
        });
        results.paymentsMigrated++;
      } catch (e: any) {
        results.errors.push(`payment ${p.id}: ${e.message}`);
      }
    }
  } catch (e: any) {
    results.errors.push(`KV payments scan: ${e.message}`);
  }

  return c.json({ success: true, results });
});

export default migrationRoutes;
