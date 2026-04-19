import { Router } from 'npm:hono@4';
import {
  getClassAnalytics,
  getStudentAnalytics,
  getAssignmentAnalytics,
  getRecentActivity,
  logActivity,
  getStrugglingSudents,
} from './class-analytics-service.tsx';

export const analyticsRoutes = new Router();

// ========== CLASS ANALYTICS ENDPOINTS ==========

analyticsRoutes.get('/class/:classId/overview', async (c) => {
  try {
    const userId = c.req.header('X-User-Id');
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
    const userId = c.req.header('X-User-Id');
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
    const userId = c.req.header('X-User-Id');
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
    const userId = c.req.header('X-User-Id');
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
    const userId = c.req.header('X-User-Id');
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
    const userId = c.req.header('X-User-Id');
    if (!userId) return c.json({ error: 'Unauthorized' }, 401);

    const { classId, studentId, studentName, action, details } = await c.req.json();

    await logActivity(classId, studentId, studentName, action, details);

    return c.json({ success: true });
  } catch (error) {
    return c.json({ error: error.message }, 400);
  }
});
