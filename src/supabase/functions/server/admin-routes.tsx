import { Hono } from 'npm:hono@4';
import * as kv from './kv_store.tsx';
import * as db from './db.tsx';
import { sendEmail, emailTemplates } from './email-service.tsx';

// Checks KV → DB profiles → auth user_metadata for admin role.
// Auto-upserts the DB profile on first admin access so future checks work.
async function isAdminUser(userId: string): Promise<boolean> {
  const kvProfile = await kv.get(`user:${userId}`) as any;
  if (kvProfile?.role === 'admin') return true;

  const dbProfile = await db.getProfile(userId);
  if (dbProfile?.role === 'admin') return true;

  // Final fallback: check Supabase auth user_metadata (uses db.tsx service-role client)
  const metadata = await db.getUserAuthMetadata(userId);
  if (metadata?.role === 'admin') {
    // Auto-upsert into DB so future checks find the role without hitting auth API
    await db.upsertProfile(userId, {
      id: userId,
      userId,
      role: 'admin',
      email: '',
      fullName: metadata?.name ?? metadata?.full_name ?? '',
    }).catch(() => {});
    return true;
  }

  return false;
}

// Helper function to format timestamp
function formatTimestamp(timestamp: string): string {
  if (!timestamp) return 'Recently';
  
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
  
  return date.toLocaleDateString();
}

// Helper function to calculate age
function calculateAge(dateOfBirth: string): number {
  if (!dateOfBirth) return 0;
  const birthDate = new Date(dateOfBirth);
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
}

/** Last `count` calendar months as stable keys + short labels (oldest → newest). */
function rollingMonthSlots(count: number): { key: string; label: string }[] {
  const out: { key: string; label: string }[] = [];
  const now = new Date();
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const label = d.toLocaleDateString('en-US', { month: 'short' });
    out.push({ key, label });
  }
  return out;
}

function paymentMonthKey(p: any): string | null {
  const s = p.paidAt || p.paid_at || p.createdAt || p.created_at || p.updatedAt || p.updated_at;
  if (!s) return null;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function userCreatedMonthKey(u: any): string | null {
  const s = u.createdAt || u.created_at;
  if (!s) return null;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

const SUBJECT_PIE_COLORS = ['#625d9c', '#5d9827', '#3b82f6', '#f59e0b', '#8b5cf6', '#ec4899', '#14b8a6', '#f43f5e'];

export function adminRoutes(app: Hono, getUserId: (token: string | null) => Promise<string | null>) {
  
  // Admin Dashboard Overview Stats
  app.get('/make-server-cbd74580/admin/dashboard-stats', async (c) => {
    try {
      const accessToken = c.req.header('Authorization')?.split(' ')[1];
      const userId = await getUserId(accessToken ?? null);
      if (!userId) return c.json({ error: 'Unauthorized' }, 401);

      if (!await isAdminUser(userId)) return c.json({ error: 'Forbidden' }, 403);

      const year  = c.req.query('year')  ? parseInt(c.req.query('year')!)  : new Date().getFullYear();
      const month = c.req.query('month') ? parseInt(c.req.query('month')!) : new Date().getMonth() + 1;

      // ── Fetch from both KV (legacy) and DB (new) in parallel ──────────────
      const [
        kvUsers, kvBookings, kvPayments, kvAlerts, kvNotifications,
        dbBookings, dbPayments,
      ] = await Promise.all([
        kv.getByPrefix('user:'),
        kv.getByPrefix('booking:'),
        kv.getByPrefix('payment:'),
        kv.getByPrefix('alert:'),
        kv.getByPrefix('notification:'),
        db.getAllBookingsForAdmin(year, month),
        db.getAllPaymentsForAdmin(year, month),
      ]);

      // Merge, deduplicating by id (DB records take precedence)
      const kvBookingIds = new Set(kvBookings.map((b: any) => b.id));
      const allBookings = [
        ...kvBookings,
        ...dbBookings.filter((b) => !kvBookingIds.has(b.id)),
      ];

      const kvPaymentIds = new Set(kvPayments.map((p: any) => p.id));
      const allPayments = [
        ...kvPayments,
        ...dbPayments.filter((p) => !kvPaymentIds.has(p.id)),
      ];

      // Filter KV bookings for the selected period (DB bookings already filtered)
      const kvFiltered = kvBookings.filter((b: any) => {
        if (!b.date) return false;
        const d = new Date(b.date);
        return d.getFullYear() === year && d.getMonth() + 1 === month;
      });
      const filteredBookings = [
        ...kvFiltered,
        ...dbBookings,
      ];

      // Filter KV payments for the selected period (DB payments already filtered)
      const kvPaymentsFiltered = kvPayments.filter((p: any) => {
        if (!p.createdAt) return false;
        const d = new Date(p.createdAt);
        return d.getFullYear() === year && d.getMonth() + 1 === month;
      });
      const filteredPayments = [
        ...kvPaymentsFiltered,
        ...dbPayments,
      ];

      // ── Compute stats ──────────────────────────────────────────────────────
      const allTutors = kvUsers.filter((u: any) => u.role === 'tutor');
      const activeTutorsCount = allTutors.filter((u: any) =>
        u.verificationStatus === 'verified'
      ).length;

      const totalSessions = filteredBookings.length;

      const revenue = filteredPayments.reduce((sum: number, p: any) =>
        sum + (parseFloat(p.amount) || 0), 0
      );

      const activeAlerts = kvAlerts.filter((a: any) =>
        a.status !== 'resolved' && a.status !== 'dismissed'
      ).length;

      // Unread notifications: KV count + DB count
      const kvUnread = kvNotifications.filter((n: any) => n.userId === userId && !n.read).length;
      const dbUnread = await db.getUnreadNotificationCount(userId).catch(() => 0);
      const unreadNotifications = kvUnread + dbUnread;

      return c.json({
        stats: {
          activeTutors: activeTutorsCount,
          totalSessions,
          revenue: revenue.toFixed(2),
          activeAlerts,
          unreadNotifications,
        },
      });
    } catch (error: any) {
      console.error('Error fetching dashboard stats:', error);
      return c.json({ error: error.message || 'Internal server error' }, 500);
    }
  });

  // Platform Overview - Comprehensive Stats
  app.get('/make-server-cbd74580/admin/platform-overview', async (c) => {
    const startedAt = Date.now();
    try {
      const accessToken = c.req.header('Authorization')?.split(' ')[1];
      const userId = await getUserId(accessToken ?? null);
      if (!userId) return c.json({ error: 'Unauthorized' }, 401);

      if (!await isAdminUser(userId)) return c.json({ error: 'Forbidden' }, 403);

      // Fetch from KV (legacy) and DB (new) in parallel
      const [kvUsers, kvBookings, kvPayments, allVerifications, dbBookings, dbPayments, dbProfiles] =
        await Promise.all([
          kv.getByPrefix('user:'),
          kv.getByPrefix('booking:'),
          kv.getByPrefix('payment:'),
          kv.getByPrefix('verification:'),
          db.getAllBookingsForAdmin(),
          db.getAllPaymentsForAdmin(),
          db.getAllProfilesForAdmin().catch(() => [] as any[]),
        ]);

      // Merge users (DB profiles take precedence for deduplication)
      const dbProfileIds = new Set(dbProfiles.map((p: any) => p.id));
      const allUsers = [...kvUsers.filter((u: any) => !dbProfileIds.has(u.id || u.userId)), ...dbProfiles];

      // Merge bookings and payments
      const kvBookingIds = new Set(kvBookings.map((b: any) => b.id));
      const allBookings = [...kvBookings, ...dbBookings.filter((b) => !kvBookingIds.has(b.id))];

      const kvPaymentIds = new Set(kvPayments.map((p: any) => p.id));
      const allPayments = [...kvPayments, ...dbPayments.filter((p) => !kvPaymentIds.has(p.id))];

      // Calculate date ranges
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

      // User metrics
      const totalUsers = allUsers.length;
      const parents = allUsers.filter((u: any) => u.role === 'parent').length;
      const students = allUsers.filter((u: any) => u.role === 'student').length;
      const tutors = allUsers.filter((u: any) => u.role === 'tutor').length;
      const admins = allUsers.filter((u: any) => u.role === 'admin').length;
      const newThisMonth = allUsers.filter((u: any) => 
        u.createdAt && new Date(u.createdAt) >= startOfMonth
      ).length;
      const activeToday = allUsers.filter((u: any) => 
        u.lastLogin && new Date(u.lastLogin) >= today
      ).length;

      // Session metrics
      const totalSessions = allBookings.length;
      const sessionsThisMonth = allBookings.filter((b: any) => 
        b.createdAt && new Date(b.createdAt) >= startOfMonth
      ).length;
      const sessionsToday = allBookings.filter((b: any) => 
        b.date && new Date(b.date) >= today
      ).length;
      const completedSessions = allBookings.filter((b: any) => 
        b.status === 'completed'
      ).length;
      const upcomingSessions = allBookings.filter((b: any) => 
        b.status === 'confirmed' && new Date(b.date) > now
      ).length;
      const cancelledSessions = allBookings.filter((b: any) => 
        b.status === 'cancelled'
      ).length;

      // Booking metrics
      const pendingBookings = allBookings.filter((b: any) => 
        b.status === 'pending'
      ).length;
      const confirmedBookings = allBookings.filter((b: any) => 
        b.status === 'confirmed'
      ).length;

      // Revenue metrics
      const allPaymentsThisMonth = allPayments.filter((p: any) => 
        p.createdAt && new Date(p.createdAt) >= startOfMonth
      );
      const allPaymentsLastMonth = allPayments.filter((p: any) => {
        if (!p.createdAt) return false;
        const date = new Date(p.createdAt);
        return date >= startOfLastMonth && date <= endOfLastMonth;
      });

      const totalRevenue = allPayments.reduce((sum: number, p: any) => 
        sum + (parseFloat(p.amount) || 0), 0
      );
      const revenueThisMonth = allPaymentsThisMonth.reduce((sum: number, p: any) => 
        sum + (parseFloat(p.amount) || 0), 0
      );
      const revenueLastMonth = allPaymentsLastMonth.reduce((sum: number, p: any) => 
        sum + (parseFloat(p.amount) || 0), 0
      );
      const growthPercent = revenueLastMonth > 0 
        ? Math.round(((revenueThisMonth - revenueLastMonth) / revenueLastMonth) * 100)
        : 0;

      // Verification metrics
      const pendingVerifications = allVerifications.filter((v: any) => 
        v.status === 'pending'
      ).length;
      const verifiedTutors = allUsers.filter((u: any) => 
        u.role === 'tutor' && u.verificationStatus === 'verified'
      ).length;
      const rejectedVerifications = allVerifications.filter((v: any) => 
        v.status === 'rejected'
      ).length;

      const actionableBookings = pendingBookings + confirmedBookings;
      const bookingConfirmRate = actionableBookings > 0
        ? Math.round((confirmedBookings / actionableBookings) * 1000) / 10
        : null;
      const tutorVerificationRate = tutors > 0
        ? Math.round((verifiedTutors / tutors) * 1000) / 10
        : null;

      const last7Days: { date: string; bookings: number; revenue: number }[] = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
        const dayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
        const dayEnd = dayStart + 86400000;
        const bookingsDay = allBookings.filter((b: any) => {
          const t = b.createdAt
            ? new Date(b.createdAt).getTime()
            : (b.date ? new Date(b.date).getTime() : NaN);
          return !Number.isNaN(t) && t >= dayStart && t < dayEnd;
        }).length;
        const rev = allPayments.filter((p: any) => {
          const t = p.createdAt ? new Date(p.createdAt).getTime() : NaN;
          return !Number.isNaN(t) && t >= dayStart && t < dayEnd;
        }).reduce((s: number, p: any) => s + (parseFloat(p.amount) || 0), 0);
        last7Days.push({
          date: d.toISOString().slice(0, 10),
          bookings: bookingsDay,
          revenue: Math.round(rev),
        });
      }

      const computeTimeMs = Date.now() - startedAt;
      const systemHealth = {
        serverStatus: 'healthy' as const,
        databaseStatus: 'healthy' as const,
        uptime: null as number | null,
        responseTime: null as number | null,
        computeTimeMs,
      };

      return c.json({
        meta: {
          generatedAt: new Date().toISOString(),
          currency: 'NGN',
          coverage: {
            profiles: totalUsers,
            bookings: totalSessions,
            payments: allPayments.length,
          },
        },
        stats: {
          users: {
            total: totalUsers,
            parents,
            students,
            tutors,
            admins,
            newThisMonth,
            activeToday,
          },
          sessions: {
            total: totalSessions,
            thisMonth: sessionsThisMonth,
            today: sessionsToday,
            completed: completedSessions,
            upcoming: upcomingSessions,
            cancelled: cancelledSessions
          },
          bookings: {
            pending: pendingBookings,
            confirmed: confirmedBookings,
            total: totalSessions
          },
          revenue: {
            total: Math.round(totalRevenue),
            thisMonth: Math.round(revenueThisMonth),
            lastMonth: Math.round(revenueLastMonth),
            growthPercent
          },
          verification: {
            pending: pendingVerifications,
            verified: verifiedTutors,
            rejected: rejectedVerifications
          },
          system: systemHealth,
          trends: { last7Days },
          insights: {
            bookingConfirmRate,
            tutorVerificationRate,
          },
        }
      });
    } catch (error: any) {
      console.error('Error fetching platform overview:', error);
      return c.json({ error: error.message || 'Internal server error' }, 500);
    }
  });

  // Recent Activity
  app.get('/make-server-cbd74580/admin/recent-activity', async (c) => {
    try {
      const accessToken = c.req.header('Authorization')?.split(' ')[1];
      const userId = await getUserId(accessToken ?? null);

      if (!userId) {
        return c.json({ error: 'Unauthorized' }, 401);
      }

      if (!await isAdminUser(userId)) {
        return c.json({ error: 'Forbidden' }, 403);
      }

      const rawLimit = parseInt(c.req.query('limit') || '10', 10);
      const limit = Math.min(Math.max(Number.isFinite(rawLimit) ? rawLimit : 10, 1), 50);

      // Get recent audit logs
      const allAudits = await kv.getByPrefix('audit:');
      const sortedAudits = allAudits
        .sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, limit);

      const activity = sortedAudits.map((audit: any, i: number) => ({
        id: (audit as any).id || `audit:${audit.timestamp}:${i}`,
        type: audit.action || 'activity',
        description: audit.description || 'Activity occurred',
        timestamp: formatTimestamp(audit.timestamp),
        user: audit.userId || 'System'
      }));

      // If no audit logs, create some sample activity from recent data
      if (activity.length === 0) {
        const allUsers = await kv.getByPrefix('user:');
        const allBookings = await kv.getByPrefix('booking:');
        
        const recentUsers = allUsers
          .filter((u: any) => u.createdAt)
          .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
          .slice(0, 3);
        
        const recentBookings = allBookings
          .filter((b: any) => b.createdAt)
          .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
          .slice(0, 3);

        recentUsers.forEach((user: any) => {
          activity.push({
            id: `derived:user:${user.id || user.email}:${user.createdAt}`,
            type: 'user_signup',
            description: `New ${user.role} registered: ${user.name || user.email}`,
            timestamp: formatTimestamp(user.createdAt),
            user: user.name || user.email
          });
        });

        recentBookings.forEach((booking: any) => {
          activity.push({
            id: `derived:booking:${booking.id || booking.createdAt}`,
            type: 'booking',
            description: `New booking created for ${booking.subject || 'session'}`,
            timestamp: formatTimestamp(booking.createdAt),
            user: booking.parentId || 'User'
          });
        });
      }

      return c.json({ activity: activity.slice(0, limit) });
    } catch (error: any) {
      console.error('Error fetching recent activity:', error);
      return c.json({ error: error.message || 'Internal server error' }, 500);
    }
  });

  // Admin Platform Metrics
  app.get('/make-server-cbd74580/admin/metrics', async (c) => {
    try {
      const accessToken = c.req.header('Authorization')?.split(' ')[1];
      const userId = await getUserId(accessToken ?? null);
      if (!userId) return c.json({ error: 'Unauthorized' }, 401);

      if (!await isAdminUser(userId)) return c.json({ error: 'Forbidden' }, 403);

      // Get all users and metrics
      const allUsers = await kv.getByPrefix('user:');
      const allBookings = await kv.getByPrefix('booking:');
      const allPayments = await kv.getByPrefix('payment:');

      const totalStudents = allUsers.filter((u: any) => u.role === 'student').length;
      const totalTutors = allUsers.filter((u: any) => u.role === 'tutor').length;
      const totalSessions = allBookings.length;
      const completedSessions = allBookings.filter((b: any) => b.status === 'completed').length;
      const completionRate = totalSessions > 0 ? Math.round((completedSessions / totalSessions) * 100) : 0;
      
      // Calculate engagement (simplified - based on active bookings)
      const activeBookings = allBookings.filter((b: any) => b.status === 'active' || b.status === 'upcoming').length;
      const averageEngagement = Math.min(100, Math.round((activeBookings / totalTutors) * 20));
      
      const totalRevenue = allPayments.reduce((sum: number, p: any) => sum + (parseFloat(p.amount) || 0), 0);
      const activeUsers = Math.floor(allUsers.length * 0.25); // Estimate 25% active
      
      // New users this month
      const thisMonth = new Date();
      const monthStart = new Date(thisMonth.getFullYear(), thisMonth.getMonth(), 1);
      const newUsersThisMonth = allUsers.filter((u: any) => {
        if (!u.createdAt) return false;
        const createdDate = new Date(u.createdAt);
        return createdDate >= monthStart;
      }).length;

      return c.json({
        totalStudents,
        totalTutors,
        totalSessions,
        completionRate,
        averageEngagement,
        totalRevenue: Math.round(totalRevenue),
        activeUsers,
        newUsersThisMonth
      });
    } catch (error: any) {
      console.error('Error fetching platform metrics:', error);
      return c.json({ error: error.message || 'Internal server error' }, 500);
    }
  });

  // Admin Analytics (admin role only; charts from KV bookings/payments/users)
  app.get('/make-server-cbd74580/admin/analytics', async (c) => {
    try {
      const accessToken = c.req.header('Authorization')?.split(' ')[1];
      const userId = await getUserId(accessToken ?? null);

      if (!userId) {
        return c.json({ error: 'Unauthorized' }, 401);
      }

      if (!await isAdminUser(userId)) return c.json({ error: 'Forbidden' }, 403);

      const allUsers = await kv.getByPrefix('user:');
      const allBookings = await kv.getByPrefix('booking:');
      const allPayments = await kv.getByPrefix('payment:');

      const totalUsers = allUsers.length;
      const totalTutors = allUsers.filter((u: any) => u.role === 'tutor').length;
      const totalParents = allUsers.filter((u: any) => u.role === 'parent').length;
      const totalStudents = allUsers.filter((u: any) => u.role === 'student').length;
      const verifiedTutors = allUsers.filter((u: any) => u.role === 'tutor' && u.verificationStatus === 'verified').length;
      const pendingVerifications = allUsers.filter((u: any) => u.role === 'tutor' && u.verificationStatus === 'pending').length;

      const totalBookings = allBookings.length;
      const completedSessions = allBookings.filter((b: any) => b.status === 'completed').length;

      const totalRevenue = allPayments.reduce((sum: number, p: any) => sum + (parseFloat(p.amount) || 0), 0);
      const platformFees = totalRevenue * 0.20;

      const dayAgo = Date.now() - 24 * 60 * 60 * 1000;
      const activeUsers = allUsers.filter((u: any) => {
        const t = u.lastLogin || u.last_login || u.lastSignIn || u.last_seen || u.updatedAt;
        if (!t) return false;
        const ms = new Date(t).getTime();
        return !Number.isNaN(ms) && ms > dayAgo;
      }).length;

      const tutorsWithRatings = allUsers.filter((u: any) => u.role === 'tutor' && u.rating != null && u.rating !== '');
      const averageRating =
        tutorsWithRatings.length > 0
          ? Math.round(
              (tutorsWithRatings.reduce((sum: number, t: any) => sum + parseFloat(String(t.rating || 0)), 0) /
                tutorsWithRatings.length) *
                10
            ) / 10
          : null;

      const sessionCompletionRate =
        totalBookings > 0 ? Math.round((completedSessions / totalBookings) * 1000) / 10 : 0;

      const slots = rollingMonthSlots(6);
      const slotKeys = new Set(slots.map((s) => s.key));

      const revenueByKey = new Map<string, { revenue: number; fees: number }>();
      for (const { key } of slots) {
        revenueByKey.set(key, { revenue: 0, fees: 0 });
      }
      for (const p of allPayments) {
        const mk = paymentMonthKey(p);
        if (!mk || !slotKeys.has(mk)) continue;
        const amt = parseFloat(p.amount) || 0;
        const cur = revenueByKey.get(mk)!;
        cur.revenue += amt;
        cur.fees += amt * 0.2;
      }
      const revenueData = slots.map(({ key, label }) => {
        const v = revenueByKey.get(key) ?? { revenue: 0, fees: 0 };
        return { month: label, revenue: Math.round(v.revenue), fees: Math.round(v.fees) };
      });

      const growthByKey = new Map<string, { tutors: number; parents: number; students: number }>();
      for (const { key } of slots) {
        growthByKey.set(key, { tutors: 0, parents: 0, students: 0 });
      }
      for (const u of allUsers) {
        const mk = userCreatedMonthKey(u);
        if (!mk || !slotKeys.has(mk)) continue;
        const g = growthByKey.get(mk)!;
        if (u.role === 'tutor') g.tutors += 1;
        else if (u.role === 'parent') g.parents += 1;
        else if (u.role === 'student') g.students += 1;
      }
      const userGrowthData = slots.map(({ key, label }) => {
        const g = growthByKey.get(key) ?? { tutors: 0, parents: 0, students: 0 };
        return { month: label, tutors: g.tutors, parents: g.parents, students: g.students };
      });

      const subjectCounts = new Map<string, number>();
      for (const b of allBookings) {
        const raw = (b.subject || b.topic || 'General') as string;
        const name = String(raw).trim() || 'General';
        subjectCounts.set(name, (subjectCounts.get(name) ?? 0) + 1);
      }
      const subjectDistribution = [...subjectCounts.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 8)
        .map(([name, value], i) => ({
          name,
          value,
          color: SUBJECT_PIE_COLORS[i % SUBJECT_PIE_COLORS.length],
        }));

      return c.json({
        stats: {
          totalUsers,
          totalTutors,
          totalParents,
          totalStudents,
          verifiedTutors,
          pendingVerifications,
          totalBookings,
          completedSessions,
          totalRevenue: Math.round(totalRevenue),
          platformFees: Math.round(platformFees),
          averageRating,
          activeUsers,
          sessionCompletionRate,
        },
        revenueData,
        userGrowthData,
        subjectDistribution,
      });
    } catch (error: any) {
      console.error('Error fetching admin analytics:', error);
      return c.json({ error: error.message || 'Internal server error' }, 500);
    }
  });

  // Admin User Management
  app.get('/make-server-cbd74580/admin/users', async (c) => {
    try {
      const accessToken = c.req.header('Authorization')?.split(' ')[1];
      const userId = await getUserId(accessToken ?? null);

      if (!userId) {
        return c.json({ error: 'Unauthorized' }, 401);
      }

      const allUsers = await kv.getByPrefix('user:');
      
      // Enhance users with additional admin data
      const enhancedUsers = allUsers.map((user: any) => {
        const resolvedName =
          user.full_name || user.fullName || user.name ||
          `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email || 'Unknown';
        return {
          ...user,
          displayName: resolvedName,
          status: user.suspended ? 'suspended' : user.banned ? 'banned' : user.deleted ? 'deleted' : 'active',
          verificationStatus: user.verificationStatus || (user.role === 'tutor' ? 'pending' : 'verified'),
          totalSessions: user.totalSessions || 0,
          totalSpent: user.totalSpent || 0,
          flagCount: user.flagCount || 0,
          notes: user.adminNotes || '',
          lastLogin: user.lastLogin || user.createdAt,
          // Ensure all tutor profile fields are surfaced for admin display
          photo_url: user.photo_url || user.photoUrl || null,
          photoUrl: user.photo_url || user.photoUrl || null,
          headline: user.headline || '',
          education_level: user.education_level || user.educationLevel || '',
          educationLevel: user.education_level || user.educationLevel || '',
          institution: user.institution || '',
          experience_years: user.experience_years ?? user.experienceYears ?? null,
          experienceYears: user.experience_years ?? user.experienceYears ?? null,
          dbs_checked: user.dbs_checked === true || user.dbsChecked === true,
          dbsChecked: user.dbs_checked === true || user.dbsChecked === true,
          has_insurance: user.has_insurance === true || user.hasInsurance === true,
          hasInsurance: user.has_insurance === true || user.hasInsurance === true,
        };
      });
      
      // Sort by creation date (newest first)
      const sortedUsers = enhancedUsers.sort((a: any, b: any) => {
        return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
      });

      return c.json({ users: sortedUsers });
    } catch (error: any) {
      console.error('Error fetching users:', error);
      return c.json({ error: error.message || 'Internal server error' }, 500);
    }
  });

  // Get User Activity
  app.get('/make-server-cbd74580/admin/users/:userId/activity', async (c) => {
    try {
      const accessToken = c.req.header('Authorization')?.split(' ')[1];
      const adminId = await getUserId(accessToken ?? null);

      if (!adminId) {
        return c.json({ error: 'Unauthorized' }, 401);
      }

      const targetUserId = c.req.param('userId');
      
      // Get audit logs for this user
      const auditLogs = await kv.getByPrefix(`audit:${targetUserId}:`);
      
      const activity = auditLogs.map((log: any) => ({
        id: log.id || Math.random().toString(),
        type: log.action || 'Activity',
        description: log.description || 'User activity',
        timestamp: log.timestamp || new Date().toISOString(),
        severity: log.severity || 'info'
      })).sort((a: any, b: any) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      ).slice(0, 50);

      return c.json({ activity });
    } catch (error: any) {
      console.error('Error fetching user activity:', error);
      return c.json({ error: error.message || 'Internal server error' }, 500);
    }
  });

  // Update User Status
  app.put('/make-server-cbd74580/admin/users/:userId/status', async (c) => {
    try {
      const accessToken = c.req.header('Authorization')?.split(' ')[1];
      const adminId = await getUserId(accessToken ?? null);

      if (!adminId) {
        return c.json({ error: 'Unauthorized' }, 401);
      }

      const targetUserId = c.req.param('userId');
      const body = await c.req.json();
      const { status, reason } = body;

      const user = await kv.get(`user:${targetUserId}`) as any;

      if (!user) {
        return c.json({ error: 'User not found' }, 404);
      }

      // Update status
      user.suspended = status === 'suspended';
      user.banned = status === 'banned';
      user.deleted = status === 'deleted';
      
      if (status === 'active') {
        user.suspended = false;
        user.banned = false;
        user.deleted = false;
      }

      user.statusUpdatedAt = new Date().toISOString();
      user.statusUpdatedBy = adminId;

      await kv.set(`user:${targetUserId}`, user);

      // Create audit log
      const auditId = `audit:${targetUserId}:${Date.now()}`;
      await kv.set(auditId, {
        id: auditId,
        userId: targetUserId,
        adminId,
        action: `status_changed_to_${status}`,
        description: `User status changed to ${status}. Reason: ${reason}`,
        timestamp: new Date().toISOString(),
        severity: status === 'banned' || status === 'suspended' ? 'warning' : 'info',
        metadata: { status, reason }
      });

      return c.json({ success: true, message: `User ${status}` });
    } catch (error: any) {
      console.error('Error updating user status:', error);
      return c.json({ error: error.message || 'Internal server error' }, 500);
    }
  });

  // Reset 2FA
  app.post('/make-server-cbd74580/admin/users/:userId/reset-2fa', async (c) => {
    try {
      const accessToken = c.req.header('Authorization')?.split(' ')[1];
      const adminId = await getUserId(accessToken ?? null);

      if (!adminId) {
        return c.json({ error: 'Unauthorized' }, 401);
      }

      const targetUserId = c.req.param('userId');
      const body = await c.req.json();
      const { reason } = body;

      const user = await kv.get(`user:${targetUserId}`) as any;

      if (!user) {
        return c.json({ error: 'User not found' }, 404);
      }

      // Reset 2FA settings
      user.twoFactorEnabled = false;
      user.twoFactorSecret = null;
      user.twoFactorResetAt = new Date().toISOString();
      user.twoFactorResetBy = adminId;

      await kv.set(`user:${targetUserId}`, user);

      // Create audit log
      const auditId = `audit:${targetUserId}:${Date.now()}`;
      await kv.set(auditId, {
        id: auditId,
        userId: targetUserId,
        adminId,
        action: '2fa_reset',
        description: `2FA reset by admin. Reason: ${reason}`,
        timestamp: new Date().toISOString(),
        severity: 'warning',
        metadata: { reason }
      });

      return c.json({ success: true, message: '2FA reset successfully' });
    } catch (error: any) {
      console.error('Error resetting 2FA:', error);
      return c.json({ error: error.message || 'Internal server error' }, 500);
    }
  });

  // Force Logout
  app.post('/make-server-cbd74580/admin/users/:userId/force-logout', async (c) => {
    try {
      const accessToken = c.req.header('Authorization')?.split(' ')[1];
      const adminId = await getUserId(accessToken ?? null);

      if (!adminId) {
        return c.json({ error: 'Unauthorized' }, 401);
      }

      const targetUserId = c.req.param('userId');
      const body = await c.req.json();
      const { reason } = body;

      const user = await kv.get(`user:${targetUserId}`) as any;

      if (!user) {
        return c.json({ error: 'User not found' }, 404);
      }

      // Invalidate all sessions
      user.forceLogoutAt = new Date().toISOString();
      user.forceLogoutBy = adminId;
      
      await kv.set(`user:${targetUserId}`, user);

      // Create audit log
      const auditId = `audit:${targetUserId}:${Date.now()}`;
      await kv.set(auditId, {
        id: auditId,
        userId: targetUserId,
        adminId,
        action: 'force_logout',
        description: `User forced logout by admin. Reason: ${reason}`,
        timestamp: new Date().toISOString(),
        severity: 'warning',
        metadata: { reason }
      });

      return c.json({ success: true, message: 'User logged out successfully' });
    } catch (error: any) {
      console.error('Error forcing logout:', error);
      return c.json({ error: error.message || 'Internal server error' }, 500);
    }
  });

  // Impersonate User
  app.post('/make-server-cbd74580/admin/users/:userId/impersonate', async (c) => {
    try {
      const accessToken = c.req.header('Authorization')?.split(' ')[1];
      const adminId = await getUserId(accessToken ?? null);

      if (!adminId) {
        return c.json({ error: 'Unauthorized' }, 401);
      }

      const targetUserId = c.req.param('userId');
      const body = await c.req.json();

      const user = await kv.get(`user:${targetUserId}`) as any;

      if (!user) {
        return c.json({ error: 'User not found' }, 404);
      }

      // Create impersonation token (simplified - in production use proper JWT)
      const token = `impersonate_${adminId}_${targetUserId}_${Date.now()}`;

      // Store impersonation session
      await kv.set(`impersonate:${token}`, {
        adminId,
        targetUserId,
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 3600000).toISOString() // 1 hour
      });

      // Create audit log
      const auditId = `audit:${targetUserId}:${Date.now()}`;
      await kv.set(auditId, {
        id: auditId,
        userId: targetUserId,
        adminId,
        action: 'impersonation_started',
        description: `Admin started impersonation session`,
        timestamp: new Date().toISOString(),
        severity: 'warning'
      });

      return c.json({ success: true, token });
    } catch (error: any) {
      console.error('Error creating impersonation session:', error);
      return c.json({ error: error.message || 'Internal server error' }, 500);
    }
  });

  // Export User Data
  app.get('/make-server-cbd74580/admin/users/:userId/export', async (c) => {
    try {
      const accessToken = c.req.header('Authorization')?.split(' ')[1];
      const adminId = await getUserId(accessToken ?? null);

      if (!adminId) {
        return c.json({ error: 'Unauthorized' }, 401);
      }

      const targetUserId = c.req.param('userId');
      
      const user = await kv.get(`user:${targetUserId}`) as any;
      if (!user) {
        return c.json({ error: 'User not found' }, 404);
      }

      // Gather all user data
      const bookings = await kv.getByPrefix(`booking:${targetUserId}:`);
      const payments = await kv.getByPrefix(`payment:${targetUserId}:`);
      const messages = await kv.getByPrefix(`message:${targetUserId}:`);
      const auditLogs = await kv.getByPrefix(`audit:${targetUserId}:`);

      const exportData = {
        user,
        bookings,
        payments,
        messages: messages.map((m: any) => ({ ...m, content: '[REDACTED]' })),
        auditLogs,
        exportedAt: new Date().toISOString(),
        exportedBy: adminId
      };

      // Create audit log
      const auditId = `audit:${targetUserId}:${Date.now()}`;
      await kv.set(auditId, {
        id: auditId,
        userId: targetUserId,
        adminId,
        action: 'data_export',
        description: `User data exported by admin`,
        timestamp: new Date().toISOString(),
        severity: 'info'
      });

      return c.json(exportData);
    } catch (error: any) {
      console.error('Error exporting user data:', error);
      return c.json({ error: error.message || 'Internal server error' }, 500);
    }
  });

  // Admin Activity Feed
  app.get('/make-server-cbd74580/admin/activity', async (c) => {
    try {
      const accessToken = c.req.header('Authorization')?.split(' ')[1];
      const userId = await getUserId(accessToken ?? null);

      if (!userId) {
        return c.json({ error: 'Unauthorized' }, 401);
      }

      // Get recent activities
      const allUsers = await kv.getByPrefix('user:');
      const allBookings = await kv.getByPrefix('booking:');
      
      const activities: any[] = [];

      // Add user signups
      allUsers
        .filter((u: any) => u.createdAt)
        .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 5)
        .forEach((user: any) => {
          activities.push({
            type: 'user_signup',
            description: `New ${user.role} signed up`,
            user: {
              name: `${user.firstName} ${user.lastName}`,
              email: user.email
            },
            timestamp: user.createdAt
          });
        });

      // Add bookings
      allBookings
        .filter((b: any) => b.createdAt)
        .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 5)
        .forEach((booking: any) => {
          activities.push({
            type: booking.status === 'completed' ? 'booking_completed' : 'booking_created',
            description: booking.status === 'completed' ? 'Session completed' : 'New booking created',
            metadata: {
              subject: booking.subject,
              amount: booking.amount
            },
            timestamp: booking.status === 'completed' ? booking.completedAt : booking.createdAt
          });
        });

      // Sort all activities by timestamp
      const sortedActivities = activities.sort((a, b) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );

      return c.json({ activities: sortedActivities.slice(0, 20) });
    } catch (error: any) {
      console.error('Error fetching activity feed:', error);
      return c.json({ error: error.message || 'Internal server error' }, 500);
    }
  });

  // Admin - Get All Child Profiles
  app.get('/make-server-cbd74580/admin/child-profiles', async (c) => {
    try {
      const accessToken = c.req.header('Authorization')?.split(' ')[1];
      const userId = await getUserId(accessToken ?? null);

      if (!userId) {
        return c.json({ error: 'Unauthorized' }, 401);
      }

      // Get all children
      const allChildren = await kv.getByPrefix('child:');
      
      // Get all parent users
      const allParents = await kv.getByPrefix('user:');
      const parentMap = new Map();
      allParents.forEach((parent: any) => {
        if (parent.role === 'parent') {
          parentMap.set(parent.id, parent);
        }
      });

      // Enhance child profiles with parent info and session stats
      const profiles = [];
      for (const child of allChildren) {
        const parent = parentMap.get(child.parentId);
        if (parent) {
          // Get session statistics
          const sessions = await kv.getByPrefix(`session:${child.id}:`);
          const totalSessions = sessions.length;
          const completedSessions = sessions.filter((s: any) => s.status === 'completed').length;
          const upcomingSessions = sessions.filter((s: any) => 
            new Date(s.scheduledTime) > new Date() && s.status === 'scheduled'
          ).length;
          const totalHours = sessions
            .filter((s: any) => s.status === 'completed')
            .reduce((sum: number, s: any) => sum + (s.duration || 1), 0);

          // Get current tutors
          const tutorIds = [...new Set(sessions.map((s: any) => s.tutorId))];
          const currentTutors = [];
          for (const tutorId of tutorIds.slice(0, 3)) {
            const tutor = await kv.get(`user:${tutorId}`);
            if (tutor) {
              currentTutors.push({
                id: tutor.id,
                name: `${tutor.firstName} ${tutor.lastName}`,
                subject: tutor.subjects?.[0] || 'General'
              });
            }
          }

          // Calculate age
          const age = calculateAge(child.dateOfBirth);

          profiles.push({
            id: child.id,
            firstName: child.firstName,
            lastName: child.lastName,
            dateOfBirth: child.dateOfBirth,
            age,
            yearGroup: child.gradeLevel,
            parentId: child.parentId,
            parentName: `${parent.firstName || ''} ${parent.lastName || ''}`.trim(),
            parentEmail: parent.email,
            createdAt: child.createdAt,
            learningPreferences: {
              subjects: child.subjects || [],
              learningStyle: child.learningStyle || 'Visual',
              specialNeeds: child.specialNeeds ? [child.specialNeeds] : []
            },
            sessionStats: {
              totalSessions,
              completedSessions,
              upcomingSessions,
              totalHours
            },
            currentTutors,
            status: child.status || 'active'
          });
        }
      }

      return c.json({ profiles });
    } catch (error: any) {
      console.error('Error fetching child profiles:', error);
      return c.json({ error: error.message || 'Internal server error' }, 500);
    }
  });

  // Admin - Get Parent-Child Summaries
  app.get('/make-server-cbd74580/admin/parent-child-summaries', async (c) => {
    try {
      const accessToken = c.req.header('Authorization')?.split(' ')[1];
      const userId = await getUserId(accessToken ?? null);

      if (!userId) {
        return c.json({ error: 'Unauthorized' }, 401);
      }

      // Get all parents
      const allUsers = await kv.getByPrefix('user:');
      const parents = allUsers.filter((u: any) => u.role === 'parent');

      const summaries = [];

      for (const parent of parents) {
        // Get subscription
        const subscription = await kv.get(`subscription_parent_${parent.id}`);
        
        // Get children
        const parentChildrenKey = `parent_children:${parent.id}`;
        const childrenIds = (await kv.get(parentChildrenKey)) || [];
        
        const children = [];
        if (Array.isArray(childrenIds)) {
          for (const childId of childrenIds) {
            const child = await kv.get(`child:${childId}`);
            if (child) {
              const age = calculateAge(child.dateOfBirth);
              children.push({
                id: child.id,
                firstName: child.firstName,
                lastName: child.lastName,
                age
              });
            }
          }
        }

        summaries.push({
          parentId: parent.id,
          parentName: `${parent.firstName || ''} ${parent.lastName || ''}`.trim(),
          parentEmail: parent.email,
          subscriptionTier: subscription?.tierName || 'basic',
          childLimit: subscription?.maxChildren || 1,
          childrenCount: children.length,
          children
        });
      }

      return c.json({ summaries });
    } catch (error: any) {
      console.error('Error fetching parent-child summaries:', error);
      return c.json({ error: error.message || 'Internal server error' }, 500);
    }
  });

  // Content Moderation Routes
  
  // Get prohibited keywords
  app.get('/make-server-cbd74580/admin/moderation/keywords', async (c) => {
    try {
      const accessToken = c.req.header('Authorization')?.split(' ')[1];
      const userId = await getUserId(accessToken ?? null);

      if (!userId) {
        return c.json({ error: 'Unauthorized' }, 401);
      }

      const keywords = await kv.getByPrefix('moderation:keyword:');
      return c.json({ keywords: keywords || [] });
    } catch (error: any) {
      console.error('Error fetching keywords:', error);
      return c.json({ error: error.message || 'Internal server error' }, 500);
    }
  });

  // Add prohibited keyword
  app.post('/make-server-cbd74580/admin/moderation/keywords', async (c) => {
    try {
      const accessToken = c.req.header('Authorization')?.split(' ')[1];
      const userId = await getUserId(accessToken ?? null);

      if (!userId) {
        return c.json({ error: 'Unauthorized' }, 401);
      }

      const body = await c.req.json();
      const { keyword, category, severity, action, matchType, addedBy } = body;

      const keywordId = `moderation:keyword:${Date.now()}`;
      await kv.set(keywordId, {
        id: keywordId,
        keyword,
        category,
        severity,
        action,
        matchType,
        enabled: true,
        hits: 0,
        addedBy,
        createdAt: new Date().toISOString()
      });

      return c.json({ success: true, id: keywordId });
    } catch (error: any) {
      console.error('Error adding keyword:', error);
      return c.json({ error: error.message || 'Internal server error' }, 500);
    }
  });

  // Update keyword
  app.put('/make-server-cbd74580/admin/moderation/keywords/:keywordId', async (c) => {
    try {
      const accessToken = c.req.header('Authorization')?.split(' ')[1];
      const userId = await getUserId(accessToken ?? null);

      if (!userId) {
        return c.json({ error: 'Unauthorized' }, 401);
      }

      const keywordId = c.req.param('keywordId');
      const body = await c.req.json();
      const { enabled } = body;

      const keyword = await kv.get(keywordId) as any;
      if (!keyword) {
        return c.json({ error: 'Keyword not found' }, 404);
      }

      keyword.enabled = enabled;
      await kv.set(keywordId, keyword);

      return c.json({ success: true });
    } catch (error: any) {
      console.error('Error updating keyword:', error);
      return c.json({ error: error.message || 'Internal server error' }, 500);
    }
  });

  // Delete keyword
  app.delete('/make-server-cbd74580/admin/moderation/keywords/:keywordId', async (c) => {
    try {
      const accessToken = c.req.header('Authorization')?.split(' ')[1];
      const userId = await getUserId(accessToken ?? null);

      if (!userId) {
        return c.json({ error: 'Unauthorized' }, 401);
      }

      const keywordId = c.req.param('keywordId');
      await kv.del(keywordId);

      return c.json({ success: true });
    } catch (error: any) {
      console.error('Error deleting keyword:', error);
      return c.json({ error: error.message || 'Internal server error' }, 500);
    }
  });

  // Bulk add keywords
  app.post('/make-server-cbd74580/admin/moderation/keywords/bulk', async (c) => {
    try {
      const accessToken = c.req.header('Authorization')?.split(' ')[1];
      const userId = await getUserId(accessToken ?? null);

      if (!userId) {
        return c.json({ error: 'Unauthorized' }, 401);
      }

      const body = await c.req.json();
      const { keywords, addedBy } = body;

      const ids = [];
      for (const kw of keywords) {
        const keywordId = `moderation:keyword:${Date.now()}_${Math.random()}`;
        await kv.set(keywordId, {
          id: keywordId,
          ...kw,
          enabled: true,
          hits: 0,
          addedBy,
          createdAt: new Date().toISOString()
        });
        ids.push(keywordId);
      }

      return c.json({ success: true, ids });
    } catch (error: any) {
      console.error('Error bulk adding keywords:', error);
      return c.json({ error: error.message || 'Internal server error' }, 500);
    }
  });

  // Get flagged content
  app.get('/make-server-cbd74580/admin/moderation/flags', async (c) => {
    try {
      const accessToken = c.req.header('Authorization')?.split(' ')[1];
      const userId = await getUserId(accessToken ?? null);

      if (!userId) {
        return c.json({ error: 'Unauthorized' }, 401);
      }

      const status = c.req.query('status') || 'all';
      
      const allFlags = await kv.getByPrefix('moderation:flag:');
      
      let flags = allFlags;
      if (status !== 'all') {
        flags = allFlags.filter((f: any) => f.status === status);
      }

      return c.json({ flags: flags || [] });
    } catch (error: any) {
      console.error('Error fetching flags:', error);
      return c.json({ error: error.message || 'Internal server error' }, 500);
    }
  });

  // Review flagged content
  app.post('/make-server-cbd74580/admin/moderation/flags/:flagId/review', async (c) => {
    try {
      const accessToken = c.req.header('Authorization')?.split(' ')[1];
      const userId = await getUserId(accessToken ?? null);

      if (!userId) {
        return c.json({ error: 'Unauthorized' }, 401);
      }

      const flagId = c.req.param('flagId');
      const body = await c.req.json();
      const { action, notes, reviewedBy } = body;

      const flag = await kv.get(flagId) as any;
      if (!flag) {
        return c.json({ error: 'Flag not found' }, 404);
      }

      flag.status = 'reviewed';
      flag.action = action;
      flag.reviewNotes = notes;
      flag.reviewedBy = reviewedBy;
      flag.reviewedAt = new Date().toISOString();
      
      // Calculate SLA compliance
      const flagTime = new Date(flag.timestamp).getTime();
      const reviewTime = new Date().getTime();
      const hoursToReview = (reviewTime - flagTime) / (1000 * 60 * 60);
      flag.hoursToReview = hoursToReview;
      flag.slaCompliant = hoursToReview <= 24; // 24 hour SLA

      await kv.set(flagId, flag);

      return c.json({ success: true });
    } catch (error: any) {
      console.error('Error reviewing flag:', error);
      return c.json({ error: error.message || 'Internal server error' }, 500);
    }
  });

  // Get moderation stats
  app.get('/make-server-cbd74580/admin/moderation/stats', async (c) => {
    try {
      const accessToken = c.req.header('Authorization')?.split(' ')[1];
      const userId = await getUserId(accessToken ?? null);

      if (!userId) {
        return c.json({ error: 'Unauthorized' }, 401);
      }

      const flags = await kv.getByPrefix('moderation:flag:');
      const keywords = await kv.getByPrefix('moderation:keyword:');

      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

      const flaggedToday = flags.filter((f: any) => 
        new Date(f.timestamp) >= today
      ).length;

      const pendingReview = flags.filter((f: any) => f.status === 'pending').length;
      
      const blockedMessages = flags.filter((f: any) => 
        f.action === 'block' || f.action === 'auto-moderate'
      ).length;

      const totalKeywords = keywords.filter((k: any) => k.enabled).length;

      // Calculate false positive rate
      const reviewedFlags = flags.filter((f: any) => f.status === 'reviewed');
      const falsePositives = reviewedFlags.filter((f: any) => f.action === 'no-action');
      const falsePositiveRate = reviewedFlags.length > 0 
        ? (falsePositives.length / reviewedFlags.length) * 100 
        : 0;

      // Calculate auto-moderated rate
      const autoModerated = flags.filter((f: any) => f.action === 'auto-moderate');
      const autoModeratedRate = flags.length > 0
        ? (autoModerated.length / flags.length) * 100
        : 0;

      return c.json({
        stats: {
          flaggedToday,
          pendingReview,
          blockedMessages,
          totalKeywords,
          falsePositiveRate,
          autoModeratedRate
        }
      });
    } catch (error: any) {
      console.error('Error fetching moderation stats:', error);
      return c.json({ error: error.message || 'Internal server error' }, 500);
    }
  });

  // Get SLA metrics
  app.get('/make-server-cbd74580/admin/moderation/sla', async (c) => {
    try {
      const accessToken = c.req.header('Authorization')?.split(' ')[1];
      const userId = await getUserId(accessToken ?? null);

      if (!userId) {
        return c.json({ error: 'Unauthorized' }, 401);
      }

      const flags = await kv.getByPrefix('moderation:flag:');
      const reviewedFlags = flags.filter((f: any) => f.status === 'reviewed');

      if (reviewedFlags.length === 0) {
        return c.json({
          sla: {
            averageReviewTime: 0,
            slaComplianceRate: 100,
            totalReviewed: 0,
            withinSLA: 0,
            breachedSLA: 0
          }
        });
      }

      const totalReviewTime = reviewedFlags.reduce((sum: number, f: any) => 
        sum + (f.hoursToReview || 0), 0
      );
      const averageReviewTime = totalReviewTime / reviewedFlags.length;

      const withinSLA = reviewedFlags.filter((f: any) => f.slaCompliant).length;
      const breachedSLA = reviewedFlags.length - withinSLA;
      const slaComplianceRate = (withinSLA / reviewedFlags.length) * 100;

      return c.json({
        sla: {
          averageReviewTime: averageReviewTime.toFixed(2),
          slaComplianceRate: slaComplianceRate.toFixed(1),
          totalReviewed: reviewedFlags.length,
          withinSLA,
          breachedSLA
        }
      });
    } catch (error: any) {
      console.error('Error fetching SLA metrics:', error);
      return c.json({ error: error.message || 'Internal server error' }, 500);
    }
  });

  // Get moderation trends
  app.get('/make-server-cbd74580/admin/moderation/trends', async (c) => {
    try {
      const accessToken = c.req.header('Authorization')?.split(' ')[1];
      const userId = await getUserId(accessToken ?? null);

      if (!userId) {
        return c.json({ error: 'Unauthorized' }, 401);
      }

      const flags = await kv.getByPrefix('moderation:flag:');
      
      // Group by day for last 30 days
      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      
      const dailyStats = [];
      for (let i = 0; i < 30; i++) {
        const date = new Date(thirtyDaysAgo.getTime() + i * 24 * 60 * 60 * 1000);
        const dateStr = date.toISOString().split('T')[0];
        const nextDate = new Date(date.getTime() + 24 * 60 * 60 * 1000);
        
        const flagsOnDay = flags.filter((f: any) => {
          const flagDate = new Date(f.timestamp);
          return flagDate >= date && flagDate < nextDate;
        });

        dailyStats.push({
          date: dateStr,
          totalFlags: flagsOnDay.length,
          pending: flagsOnDay.filter((f: any) => f.status === 'pending').length,
          reviewed: flagsOnDay.filter((f: any) => f.status === 'reviewed').length,
          removed: flagsOnDay.filter((f: any) => f.action === 'content-removed').length,
          falsePositives: flagsOnDay.filter((f: any) => f.action === 'no-action').length
        });
      }

      // Category breakdown
      const keywords = await kv.getByPrefix('moderation:keyword:');
      const categoryStats = {};
      keywords.forEach((kw: any) => {
        if (!categoryStats[kw.category]) {
          categoryStats[kw.category] = { count: 0, hits: 0 };
        }
        categoryStats[kw.category].count++;
        categoryStats[kw.category].hits += kw.hits || 0;
      });

      return c.json({
        trends: {
          daily: dailyStats,
          byCategory: categoryStats,
          total30Days: flags.filter((f: any) => 
            new Date(f.timestamp) >= thirtyDaysAgo
          ).length
        }
      });
    } catch (error: any) {
      console.error('Error fetching moderation trends:', error);
      return c.json({ error: error.message || 'Internal server error' }, 500);
    }
  });

  // Policy Configuration Routes
  
  // Get policy config
  app.get('/make-server-cbd74580/admin/policy-config', async (c) => {
    try {
      const accessToken = c.req.header('Authorization')?.split(' ')[1];
      const userId = await getUserId(accessToken ?? null);

      if (!userId) {
        return c.json({ error: 'Unauthorized' }, 401);
      }

      const config = await kv.get('policy:config');
      return c.json({ config });
    } catch (error: any) {
      console.error('Error fetching policy config:', error);
      return c.json({ error: error.message || 'Internal server error' }, 500);
    }
  });

  // Update policy config
  app.put('/make-server-cbd74580/admin/policy-config', async (c) => {
    try {
      const accessToken = c.req.header('Authorization')?.split(' ')[1];
      const userId = await getUserId(accessToken ?? null);

      if (!userId) {
        return c.json({ error: 'Unauthorized' }, 401);
      }

      const body = await c.req.json();
      const { config, updatedBy } = body;

      config.lastUpdated = new Date().toISOString();
      config.updatedBy = updatedBy;

      await kv.set('policy:config', config);

      // Add to history
      const historyId = `policy:history:${Date.now()}`;
      await kv.set(historyId, {
        id: historyId,
        config,
        updatedBy,
        timestamp: new Date().toISOString(),
        description: 'Policy configuration updated'
      });

      return c.json({ success: true });
    } catch (error: any) {
      console.error('Error updating policy config:', error);
      return c.json({ error: error.message || 'Internal server error' }, 500);
    }
  });

  // Get policy config history
  app.get('/make-server-cbd74580/admin/policy-config/history', async (c) => {
    try {
      const accessToken = c.req.header('Authorization')?.split(' ')[1];
      const userId = await getUserId(accessToken ?? null);

      if (!userId) {
        return c.json({ error: 'Unauthorized' }, 401);
      }

      const history = await kv.getByPrefix('policy:history:');
      
      // Sort by timestamp descending
      const sortedHistory = history.sort((a: any, b: any) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      ).slice(0, 50);

      return c.json({ history: sortedHistory });
    } catch (error: any) {
      console.error('Error fetching policy history:', error);
      return c.json({ error: error.message || 'Internal server error' }, 500);
    }
  });

  // Get pending verifications
  app.get('/make-server-cbd74580/admin/verifications/pending', async (c) => {
    try {
      const accessToken = c.req.header('Authorization')?.split(' ')[1];
      const userId = await getUserId(accessToken ?? null);

      if (!userId) {
        return c.json({ error: 'Unauthorized' }, 401);
      }

      // Get all tutors with pending verification
      const allUsers = await kv.getByPrefix('user:');
      const pendingTutors = allUsers.filter((u: any) => 
        u.role === 'tutor' && u.verificationStatus === 'pending'
      );

      // Get verification data for each tutor
      const verifications = [];
      for (const tutor of pendingTutors) {
        const verification = await kv.get(`verification:${tutor.id || tutor.userId}`) as any;
        
        const resolvedName =
          tutor.full_name || tutor.fullName || tutor.name ||
          `${tutor.firstName || ''} ${tutor.lastName || ''}`.trim() || 'Unknown Tutor';

        verifications.push({
          userId: tutor.id || tutor.userId,
          submittedAt: tutor.createdAt,
          kycStatus: verification?.kycStatus || 'pending',
          dbsStatus: verification?.dbsStatus || 'pending',
          documents: {
            dbs: tutor.dbsCertificateUrl || null,
            qualifications: tutor.qualificationCertificates || [],
            insurance: tutor.insuranceDocumentUrl || null
          },
          profile: {
            ...tutor,
            fullName: resolvedName,
            full_name: resolvedName,
            email: tutor.email,
            phone: tutor.phone || tutor.phone_number || '',
            location: tutor.location || '',
            headline: tutor.headline || '',
            bio: tutor.bio || '',
            education_level: tutor.education_level || tutor.educationLevel || '',
            institution: tutor.institution || '',
            hourly_rate: tutor.hourly_rate || tutor.hourlyRate || null,
            hourlyRate: tutor.hourly_rate || tutor.hourlyRate || null,
            experience_years: tutor.experience_years ?? tutor.experienceYears ?? null,
            experienceYears: tutor.experience_years ?? tutor.experienceYears ?? null,
            qualifications: tutor.qualifications || '',
            teaching_style: tutor.teaching_style || tutor.teachingStyle || '',
            teachingStyle: tutor.teaching_style || tutor.teachingStyle || '',
            subjects: tutor.subjects || [],
            age_groups: tutor.age_groups || tutor.ageGroups || [],
            ageGroups: tutor.age_groups || tutor.ageGroups || [],
            classes: tutor.classes || [],
            teaching_format: tutor.teaching_format || tutor.teachingFormat || '',
            teachingFormat: tutor.teaching_format || tutor.teachingFormat || '',
            group_size: tutor.group_size || tutor.groupSize || '',
            groupSize: tutor.group_size || tutor.groupSize || '',
            exam_boards: tutor.exam_boards || tutor.examBoards || [],
            examBoards: tutor.exam_boards || tutor.examBoards || [],
            learning_difficulties: tutor.learning_difficulties || tutor.learningDifficulties || [],
            learningDifficulties: tutor.learning_difficulties || tutor.learningDifficulties || [],
            methodologies: tutor.methodologies || [],
            languages: tutor.languages || [],
            dbs_checked: tutor.dbs_checked === true || tutor.dbsChecked === true,
            dbsChecked: tutor.dbs_checked === true || tutor.dbsChecked === true,
            has_insurance: tutor.has_insurance === true || tutor.hasInsurance === true,
            hasInsurance: tutor.has_insurance === true || tutor.hasInsurance === true,
            hasDbsCheck: tutor.dbs_checked === true || tutor.dbsChecked === true,
            photo_url: tutor.photo_url || tutor.photoUrl || null,
            photoUrl: tutor.photo_url || tutor.photoUrl || null,
          },
        });
      }

      return c.json({ verifications });
    } catch (error: any) {
      console.error('Error fetching pending verifications:', error);
      return c.json({ error: error.message || 'Internal server error' }, 500);
    }
  });

  // Verification metrics
  app.get('/make-server-cbd74580/admin/verifications/metrics', async (c) => {
    try {
      const accessToken = c.req.header('Authorization')?.split(' ')[1];
      const userId = await getUserId(accessToken ?? null);
      if (!userId) return c.json({ error: 'Unauthorized' }, 401);

      const allUsers = await kv.getByPrefix('user:');
      const tutors = allUsers.filter((u: any) => u.role === 'tutor');

      const pending  = tutors.filter((u: any) => u.verificationStatus === 'pending').length;
      const approved = tutors.filter((u: any) => u.verificationStatus === 'verified').length;
      const rejected = tutors.filter((u: any) => u.verificationStatus === 'rejected').length;
      const total    = approved + rejected;
      const approvalRate = total > 0 ? (approved / total) * 100 : 0;

      // Average hours from submission to review
      const reviewedTutors = tutors.filter((u: any) =>
        u.verificationStatus === 'verified' || u.verificationStatus === 'rejected'
      );
      let avgReviewTimeHours = 0;
      if (reviewedTutors.length > 0) {
        const times = await Promise.all(
          reviewedTutors.map(async (tutor: any) => {
            const v = await kv.get(`verification:${tutor.id || tutor.userId}`) as any;
            if (!v?.reviewedAt || !tutor.createdAt) return null;
            return (new Date(v.reviewedAt).getTime() - new Date(tutor.createdAt).getTime()) / (1000 * 60 * 60);
          })
        );
        const valid = times.filter((t): t is number => t !== null && t > 0);
        if (valid.length > 0) avgReviewTimeHours = valid.reduce((a, b) => a + b, 0) / valid.length;
      }

      // Pending tutors with no photo and no DBS cert
      const pendingTutors = tutors.filter((u: any) => u.verificationStatus === 'pending');
      const documentIssues = pendingTutors.filter((u: any) =>
        !u.photo_url && !u.photoUrl && !u.dbsCertificateUrl
      ).length;

      return c.json({
        metrics: {
          total_pending: pending,
          total_approved: approved,
          total_rejected: rejected,
          approval_rate: approvalRate,
          avg_review_time_hours: avgReviewTimeHours,
          document_issues: documentIssues,
        },
      });
    } catch (error: any) {
      console.error('Error fetching verification metrics:', error);
      return c.json({ error: error.message || 'Internal server error' }, 500);
    }
  });

  // Verification history (approved + rejected)
  app.get('/make-server-cbd74580/admin/verifications/history', async (c) => {
    try {
      const accessToken = c.req.header('Authorization')?.split(' ')[1];
      const userId = await getUserId(accessToken ?? null);
      if (!userId) return c.json({ error: 'Unauthorized' }, 401);

      const allUsers = await kv.getByPrefix('user:');
      const reviewedTutors = allUsers.filter((u: any) =>
        u.role === 'tutor' &&
        (u.verificationStatus === 'verified' || u.verificationStatus === 'rejected')
      );

      const verifications = [];
      for (const tutor of reviewedTutors) {
        const tutorId = tutor.id || tutor.userId;
        const verification = await kv.get(`verification:${tutorId}`) as any;
        const resolvedName =
          tutor.full_name || tutor.fullName || tutor.name ||
          `${tutor.firstName || ''} ${tutor.lastName || ''}`.trim() || 'Unknown Tutor';

        verifications.push({
          userId: tutorId,
          submittedAt: tutor.createdAt,
          status: tutor.verificationStatus,
          reviewer: verification?.reviewedBy || tutor.verifiedBy || tutor.rejectedBy || null,
          reviewedAt: verification?.reviewedAt || tutor.verifiedAt || tutor.rejectedAt || null,
          rejectionReason: tutor.rejectionReason || null,
          kycStatus: verification?.kycStatus || (tutor.verificationStatus === 'verified' ? 'verified' : 'rejected'),
          dbsStatus: verification?.dbsStatus || (tutor.verificationStatus === 'verified' ? 'verified' : 'rejected'),
          documents: {
            dbs: tutor.dbsCertificateUrl || null,
            qualifications: tutor.qualificationCertificates || [],
            insurance: tutor.insuranceDocumentUrl || null,
          },
          profile: {
            ...tutor,
            fullName: resolvedName,
            full_name: resolvedName,
            email: tutor.email,
            phone: tutor.phone || tutor.phone_number || '',
            location: tutor.location || '',
            bio: tutor.bio || '',
            qualifications: tutor.qualifications || '',
            subjects: tutor.subjects || [],
            experience_years: tutor.experience_years ?? tutor.experienceYears ?? null,
            experienceYears: tutor.experience_years ?? tutor.experienceYears ?? null,
            dbs_checked: tutor.dbs_checked === true || tutor.dbsChecked === true,
            dbsChecked: tutor.dbs_checked === true || tutor.dbsChecked === true,
            has_insurance: tutor.has_insurance === true || tutor.hasInsurance === true,
            hasInsurance: tutor.has_insurance === true || tutor.hasInsurance === true,
            photo_url: tutor.photo_url || tutor.photoUrl || null,
            photoUrl: tutor.photo_url || tutor.photoUrl || null,
          },
        });
      }

      verifications.sort((a, b) =>
        new Date(b.reviewedAt || b.submittedAt).getTime() -
        new Date(a.reviewedAt || a.submittedAt).getTime()
      );

      return c.json({ verifications });
    } catch (error: any) {
      console.error('Error fetching verification history:', error);
      return c.json({ error: error.message || 'Internal server error' }, 500);
    }
  });

  // Review verification
  app.post('/make-server-cbd74580/admin/verifications/:userId/review', async (c) => {
    try {
      const accessToken = c.req.header('Authorization')?.split(' ')[1];
      const adminId = await getUserId(accessToken ?? null);

      if (!adminId) {
        return c.json({ error: 'Unauthorized' }, 401);
      }

      const tutorId = c.req.param('userId');
      const body = await c.req.json();
      const { action, rejectionReason, kycStatus, dbsStatus } = body;

      // Get tutor profile
      const tutor = await kv.get(`user:${tutorId}`) as any;
      if (!tutor) {
        return c.json({ error: 'Tutor not found' }, 404);
      }

      // Ensure we have an email — fall back to DB profile if KV entry lacks one
      if (!tutor.email) {
        try {
          const dbProfile = await db.getProfile(tutorId);
          if (dbProfile?.email) tutor.email = dbProfile.email;
        } catch (emailLookupErr) {
          console.error('Could not look up tutor email from DB:', emailLookupErr);
        }
      }

      // Update verification status
      if (action === 'approve') {
        tutor.verificationStatus = 'verified';
        tutor.verifiedAt = new Date().toISOString();
        tutor.verifiedBy = adminId;
      } else if (action === 'reject') {
        tutor.verificationStatus = 'rejected';
        tutor.rejectionReason = rejectionReason;
        tutor.rejectedAt = new Date().toISOString();
        tutor.rejectedBy = adminId;
      }

      await kv.set(`user:${tutorId}`, tutor);

      // Keep the role-specific profile in sync so that switching roles doesn't
      // revert the verification status back to 'pending'.
      const tutorRoleProfile = await kv.get(`profile_tutor_${tutorId}`) as any;
      if (tutorRoleProfile) {
        if (action === 'approve') {
          tutorRoleProfile.verificationStatus = 'verified';
          tutorRoleProfile.verifiedAt = tutor.verifiedAt;
          tutorRoleProfile.verifiedBy = adminId;
        } else if (action === 'reject') {
          tutorRoleProfile.verificationStatus = 'rejected';
          tutorRoleProfile.rejectionReason = rejectionReason;
          tutorRoleProfile.rejectedAt = tutor.rejectedAt;
        }
        await kv.set(`profile_tutor_${tutorId}`, tutorRoleProfile);
      }

      // Update or create verification record
      const verificationId = `verification:${tutorId}`;
      const verification = {
        userId: tutorId,
        kycStatus: action === 'approve' ? 'verified' : kycStatus,
        dbsStatus: action === 'approve' ? 'verified' : dbsStatus,
        status: action === 'approve' ? 'approved' : 'rejected',
        reviewedBy: adminId,
        reviewedAt: new Date().toISOString(),
        rejectionReason: action === 'reject' ? rejectionReason : null
      };
      await kv.set(verificationId, verification);

      // Create notification for tutor
      const notificationId = `notification:${tutorId}:${Date.now()}`;
      const notification = {
        id: notificationId,
        userId: tutorId,
        type: action === 'approve' ? 'verification_approved' : 'verification_rejected',
        title: action === 'approve' ? 'Verification Approved!' : 'Verification Rejected',
        message: action === 'approve' 
          ? 'Your tutor profile has been verified. You can now start accepting bookings!'
          : `Your verification was not approved. Reason: ${rejectionReason}`,
        read: false,
        createdAt: new Date().toISOString()
      };
      await kv.set(notificationId, notification);

      // Create audit log
      const auditId = `audit:${tutorId}:${Date.now()}`;
      await kv.set(auditId, {
        id: auditId,
        userId: tutorId,
        adminId,
        action: `verification_${action}`,
        description: `Tutor verification ${action === 'approve' ? 'approved' : 'rejected'} by admin`,
        timestamp: new Date().toISOString(),
        severity: 'info',
        metadata: { action, rejectionReason }
      });

      // Send email notification (non-blocking — don't fail the request on email errors)
      try {
        if (action === 'approve' && tutor.email) {
          console.log(`Sending approval email to ${tutor.email}`);
          const emailData = emailTemplates.tutorVerificationApproved(
            tutor.fullName || tutor.full_name || tutor.name || 'Tutor',
            `https://tutornest.org/tutor-dashboard`
          );
          await sendEmail({
            to: tutor.email,
            subject: emailData.subject,
            html: emailData.html,
            replyTo: 'support@tutornest.org'
          });
          console.log('Approval email sent successfully');
        } else if (action === 'reject' && tutor.email) {
          console.log(`Sending rejection email to ${tutor.email}`);
          const emailData = emailTemplates.tutorVerificationRejected(
            tutor.fullName || tutor.full_name || tutor.name || 'Tutor',
            rejectionReason,
            `https://tutornest.org/tutor-dashboard`
          );
          await sendEmail({
            to: tutor.email,
            subject: emailData.subject,
            html: emailData.html,
            replyTo: 'support@tutornest.org'
          });
          console.log('Rejection email sent successfully');
        } else {
          console.warn(`No email sent: tutor.email=${tutor.email}, action=${action}`);
        }
      } catch (emailErr) {
        console.error('Failed to send verification email (non-fatal):', emailErr);
      }

      return c.json({ success: true });
    } catch (error: any) {
      console.error('Error reviewing verification:', error);
      return c.json({ error: error.message || 'Internal server error' }, 500);
    }
  });

  // ============================================
  // ADMIN RESOURCE MANAGEMENT ROUTES
  // ============================================

  // Get all resources (admin view)
  app.get('/make-server-cbd74580/admin/resources/all', async (c) => {
    try {
      const accessToken = c.req.header('Authorization')?.split(' ')[1];
      const userId = await getUserId(accessToken ?? null);

      if (!userId) {
        return c.json({ error: 'Unauthorized' }, 401);
      }

      // Verify admin role
      const userProfile = await kv.get(`user:${userId}`) as any;
      if (userProfile.role !== 'admin') {
        return c.json({ error: 'Forbidden - Admin access required' }, 403);
      }

      const resources = await kv.getByPrefix('admin_resource:');
      
      return c.json({ 
        resources: resources.sort((a: any, b: any) => 
          new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime()
        )
      });
    } catch (error: any) {
      console.error('Error fetching admin resources:', error);
      return c.json({ error: error.message || 'Internal server error' }, 500);
    }
  });

  // Upload resource (admin only)
  app.post('/make-server-cbd74580/admin/resources/upload', async (c) => {
    try {
      const accessToken = c.req.header('Authorization')?.split(' ')[1];
      const userId = await getUserId(accessToken ?? null);

      if (!userId) {
        return c.json({ error: 'Unauthorized' }, 401);
      }

      // Verify admin role
      const userProfile = await kv.get(`user:${userId}`) as any;
      if (userProfile.role !== 'admin') {
        return c.json({ error: 'Forbidden - Admin access required' }, 403);
      }

      const formData = await c.req.formData();
      const file = formData.get('file') as File;
      const gradeLevel = formData.get('gradeLevel') as string;
      const subject = formData.get('subject') as string || 'General';
      const resourceType = formData.get('resourceType') as string || 'Worksheet';
      const title = formData.get('title') as string;
      const description = formData.get('description') as string || '';
      const accessControl = formData.get('accessControl') as string || 'public';

      if (!file || !gradeLevel) {
        return c.json({ error: 'File and grade level are required' }, 400);
      }

      // Validate file type
      const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/gif', 'image/webp'];
      if (!allowedTypes.includes(file.type)) {
        return c.json({ 
          error: 'Invalid file type. Only PDF and image files are allowed.' 
        }, 400);
      }

      // Validate file size (10MB max)
      const maxSize = 10 * 1024 * 1024;
      if (file.size > maxSize) {
        return c.json({ 
          error: 'File size exceeds 10MB limit' 
        }, 400);
      }

      // Convert file to base64 for storage
      const arrayBuffer = await file.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      const base64Data = btoa(String.fromCharCode(...uint8Array));

      const resourceId = `resource_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const resource = {
        id: resourceId,
        fileName: file.name,
        fileType: file.type,
        fileSize: file.size,
        fileData: base64Data,
        gradeLevel,
        subject,
        resourceType,
        title: title || file.name,
        description,
        accessControl,
        uploadedBy: userId,
        uploadedByName: `${userProfile.firstName || ''} ${userProfile.lastName || ''}`.trim(),
        uploadedAt: new Date().toISOString(),
        downloadCount: 0,
        status: 'approved'
      };

      await kv.set(`admin_resource:${resourceId}`, resource);

      console.log(`Admin resource uploaded: ${resourceId} by ${userId}`);

      return c.json({ 
        success: true, 
        resource: {
          id: resource.id,
          title: resource.title,
          fileName: resource.fileName
        }
      });
    } catch (error: any) {
      console.error('Error uploading admin resource:', error);
      return c.json({ error: error.message || 'Internal server error' }, 500);
    }
  });

  // Delete resource (admin only)
  app.delete('/make-server-cbd74580/admin/resources/:resourceId', async (c) => {
    try {
      const accessToken = c.req.header('Authorization')?.split(' ')[1];
      const userId = await getUserId(accessToken ?? null);

      if (!userId) {
        return c.json({ error: 'Unauthorized' }, 401);
      }

      // Verify admin role
      const userProfile = await kv.get(`user:${userId}`) as any;
      if (userProfile.role !== 'admin') {
        return c.json({ error: 'Forbidden - Admin access required' }, 403);
      }

      const resourceId = c.req.param('resourceId');
      
      await kv.del(`admin_resource:${resourceId}`);

      console.log(`Admin resource deleted: ${resourceId} by ${userId}`);

      return c.json({ success: true });
    } catch (error: any) {
      console.error('Error deleting admin resource:', error);
      return c.json({ error: error.message || 'Internal server error' }, 500);
    }
  });

  // Download/view resource
  app.get('/make-server-cbd74580/admin/resources/:resourceId/download', async (c) => {
    try {
      const accessToken = c.req.header('Authorization')?.split(' ')[1];
      const userId = await getUserId(accessToken ?? null);

      if (!userId) {
        return c.json({ error: 'Unauthorized' }, 401);
      }

      const resourceId = c.req.param('resourceId');
      const resource = await kv.get(`admin_resource:${resourceId}`) as any;

      if (!resource) {
        return c.json({ error: 'Resource not found' }, 404);
      }

      // Check access control
      const userProfile = await kv.get(`user:${userId}`) as any;
      
      if (resource.accessControl === 'private') {
        // Check if user has subscription
        const subscription = await kv.get(`subscription_parent_${userId}`) as any;
        
        if (!subscription || subscription.tierName === 'basic') {
          // No subscription - check free limit
          if (userProfile.role !== 'admin') {
            const usageKey = `resource_usage:${userId}`;
            const usage = (await kv.get(usageKey)) || { count: 0, resources: [] };
            
            const FREE_RESOURCE_LIMIT = 5;
            
            if (usage.count >= FREE_RESOURCE_LIMIT) {
              return c.json({ error: 'Free resource limit reached. Please subscribe for unlimited access.' }, 403);
            }
            
            // Track this download
            usage.count += 1;
            usage.resources.push({
              resourceId,
              downloadedAt: new Date().toISOString()
            });
            await kv.set(usageKey, usage);
          }
        }
      }

      // Increment download count
      resource.downloadCount = (resource.downloadCount || 0) + 1;
      await kv.set(`admin_resource:${resourceId}`, resource);

      // Convert base64 back to binary
      const binaryString = atob(resource.fileData);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      return new Response(bytes, {
        headers: {
          'Content-Type': resource.fileType,
          'Content-Disposition': `attachment; filename="${resource.fileName}"`,
        },
      });
    } catch (error: any) {
      console.error('Error downloading resource:', error);
      return c.json({ error: error.message || 'Internal server error' }, 500);
    }
  });

  // Get resource usage stats
  app.get('/make-server-cbd74580/resources/usage-stats', async (c) => {
    try {
      const accessToken = c.req.header('Authorization')?.split(' ')[1];
      const userId = await getUserId(accessToken ?? null);

      if (!userId) {
        return c.json({ error: 'Unauthorized' }, 401);
      }

      const usageKey = `resource_usage:${userId}`;
      const usage = (await kv.get(usageKey)) || { count: 0, resources: [] };

      return c.json({ 
        freeResourcesUsed: usage.count || 0,
        resourcesAccessed: usage.resources || []
      });
    } catch (error: any) {
      console.error('Error fetching usage stats:', error);
      return c.json({ error: error.message || 'Internal server error' }, 500);
    }
  });
}