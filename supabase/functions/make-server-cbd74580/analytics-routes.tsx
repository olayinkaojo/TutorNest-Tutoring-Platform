import { Hono } from 'npm:hono@4';
import {
  getClassAnalytics,
  getStudentAnalytics,
  getAssignmentAnalytics,
  getRecentActivity,
  logActivity,
  getStrugglingSudents,
} from './class-analytics-service.tsx';
import { verifyUser } from './route-auth.tsx';

export const analyticsRoutes = new Hono();

// Every endpoint below used to accept a bare client-supplied `X-User-Id`
// header as proof of identity — anyone could set that header to any value
// with no token behind it at all. Confirmed unreachable from any live
// screen today (ClassAnalyticsDashboard.tsx is never imported anywhere),
// but still directly callable, so fixed to the same verified-token check
// every other route in this codebase uses.

// ========== CLASS ANALYTICS ENDPOINTS ==========

analyticsRoutes.get('/class/:classId/overview', async (c) => {
  try {
    const userId = await verifyUser(c);
    if (!userId) return c.json({ error: 'Unauthorized' }, 401);

    const classId = c.req.param('classId');
    const analytics = await getClassAnalytics(classId);

    return c.json({ analytics });
  } catch (error) {
    return c.json({ error: error.message }, 400);
  }
});

analyticsRoutes.get('/class/:classId/struggling-students', async (c) => {
  try {
    const userId = await verifyUser(c);
    if (!userId) return c.json({ error: 'Unauthorized' }, 401);

    const classId = c.req.param('classId');
    const threshold = parseInt(c.req.query('threshold') || '70');

    const students = await getStrugglingSudents(classId, threshold);

    return c.json({ students });
  } catch (error) {
    return c.json({ error: error.message }, 400);
  }
});

analyticsRoutes.get('/class/:classId/activity-log', async (c) => {
  try {
    const userId = await verifyUser(c);
    if (!userId) return c.json({ error: 'Unauthorized' }, 401);

    const classId = c.req.param('classId');
    const activities = await getRecentActivity(classId);

    return c.json({ activities });
  } catch (error) {
    return c.json({ error: error.message }, 400);
  }
});

// ========== STUDENT ANALYTICS ENDPOINTS ==========

analyticsRoutes.get('/student/:studentId/class/:classId/progress', async (c) => {
  try {
    const userId = await verifyUser(c);
    if (!userId) return c.json({ error: 'Unauthorized' }, 401);

    const studentId = c.req.param('studentId');
    const classId = c.req.param('classId');

    const stats = await getStudentAnalytics(classId, studentId);

    return c.json({ stats });
  } catch (error) {
    return c.json({ error: error.message }, 400);
  }
});

// ========== ASSIGNMENT ANALYTICS ENDPOINTS ==========

analyticsRoutes.get('/assignment/:assignmentId/analytics', async (c) => {
  try {
    const userId = await verifyUser(c);
    if (!userId) return c.json({ error: 'Unauthorized' }, 401);

    const assignmentId = c.req.param('assignmentId');
    const analytics = await getAssignmentAnalytics(assignmentId);

    return c.json({ analytics });
  } catch (error) {
    return c.json({ error: error.message }, 400);
  }
});

// ========== ACTIVITY LOGGING ==========

analyticsRoutes.post('/log-activity', async (c) => {
  try {
    const userId = await verifyUser(c);
    if (!userId) return c.json({ error: 'Unauthorized' }, 401);

    const { classId, studentId, studentName, action, details } = await c.req.json();

    await logActivity(classId, studentId, studentName, action, details);

    return c.json({ success: true });
  } catch (error) {
    return c.json({ error: error.message }, 400);
  }
});
