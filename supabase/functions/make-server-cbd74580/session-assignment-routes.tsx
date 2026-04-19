import { Router } from 'npm:hono@4';
import {
  linkAssignmentToSession,
  unlinkAssignmentFromSession,
  getSessionAssignments,
  getSessionWorkflow,
  recordWorkflowSubmission,
  getSessionStudentProgress,
  markSessionStarted,
  markSessionEnded,
  getSessionWorkflowSummary,
} from './session-assignment-service.tsx';

export const sessionAssignmentRoutes = new Router();

// ========== ASSIGNMENT LINKING ==========

sessionAssignmentRoutes.post('/tutoring-sessions/:sessionId/assignments/link', async (c) => {
  try {
    const userId = c.req.header('X-User-Id');
    if (!userId) return c.json({ error: 'Unauthorized' }, 401);

    const sessionId = c.req.param('sessionId');
    const { assignmentId, type } = await c.req.json();

    if (!['pre-work', 'session', 'homework', 'normal'].includes(type)) {
      return c.json({ error: 'Invalid assignment type' }, 400);
    }

    const link = await linkAssignmentToSession(assignmentId, sessionId, type, userId);

    return c.json({ success: true, link });
  } catch (error) {
    return c.json({ error: error.message }, 400);
  }
});

sessionAssignmentRoutes.delete('/tutoring-sessions/:sessionId/assignments/:assignmentId/unlink', async (c) => {
  try {
    const userId = c.req.header('X-User-Id');
    if (!userId) return c.json({ error: 'Unauthorized' }, 401);

    const sessionId = c.req.param('sessionId');
    const assignmentId = c.req.param('assignmentId');

    await unlinkAssignmentFromSession(assignmentId, sessionId);

    return c.json({ success: true });
  } catch (error) {
    return c.json({ error: error.message }, 400);
  }
});

// ========== WORKFLOW MANAGEMENT ==========

sessionAssignmentRoutes.get('/tutoring-sessions/:sessionId/workflow', async (c) => {
  try {
    const userId = c.req.header('X-User-Id');
    if (!userId) return c.json({ error: 'Unauthorized' }, 401);

    const sessionId = c.req.param('sessionId');
    const workflow = await getSessionWorkflow(sessionId);

    return c.json({ workflow });
  } catch (error) {
    return c.json({ error: error.message }, 400);
  }
});

sessionAssignmentRoutes.get('/tutoring-sessions/:sessionId/assignments', async (c) => {
  try {
    const userId = c.req.header('X-User-Id');
    if (!userId) return c.json({ error: 'Unauthorized' }, 401);

    const sessionId = c.req.param('sessionId');
    const type = c.req.query('type') as any; // pre-work | session | homework

    const assignments = await getSessionAssignments(sessionId, type);

    return c.json({ assignments });
  } catch (error) {
    return c.json({ error: error.message }, 400);
  }
});

// ========== STUDENT SUBMISSIONS ==========

sessionAssignmentRoutes.post('/tutoring-sessions/:sessionId/assignments/:assignmentId/submit', async (c) => {
  try {
    const userId = c.req.header('X-User-Id');
    if (!userId) return c.json({ error: 'Unauthorized' }, 401);

    const sessionId = c.req.param('sessionId');
    const assignmentId = c.req.param('assignmentId');
    const { type, responses, startedAt, completedAt } = await c.req.json();

    if (!['pre-work', 'session', 'homework'].includes(type)) {
      return c.json({ error: 'Invalid type' }, 400);
    }

    const responseData = {
      id: `response:${assignmentId}:${userId}:${Date.now()}`,
      studentId: userId,
      assignmentId,
      sessionId,
      responses,
      startedAt,
      completedAt,
    };

    await recordWorkflowSubmission(sessionId, userId, assignmentId, type, responseData);

    return c.json({ success: true, responseId: responseData.id });
  } catch (error) {
    return c.json({ error: error.message }, 400);
  }
});

// ========== PROGRESS TRACKING ==========

sessionAssignmentRoutes.get('/tutoring-sessions/:sessionId/progress', async (c) => {
  try {
    const userId = c.req.header('X-User-Id');
    if (!userId) return c.json({ error: 'Unauthorized' }, 401);

    const sessionId = c.req.param('sessionId');
    const progress = await getSessionStudentProgress(sessionId);

    return c.json({ progress });
  } catch (error) {
    return c.json({ error: error.message }, 400);
  }
});

sessionAssignmentRoutes.get('/tutoring-sessions/:sessionId/workflow-summary', async (c) => {
  try {
    const userId = c.req.header('X-User-Id');
    if (!userId) return c.json({ error: 'Unauthorized' }, 401);

    const sessionId = c.req.param('sessionId');
    const summary = await getSessionWorkflowSummary(sessionId);

    return c.json({ summary });
  } catch (error) {
    return c.json({ error: error.message }, 400);
  }
});

// ========== SESSION LIFECYCLE ==========

sessionAssignmentRoutes.post('/tutoring-sessions/:sessionId/start', async (c) => {
  try {
    const userId = c.req.header('X-User-Id');
    if (!userId) return c.json({ error: 'Unauthorized' }, 401);

    const sessionId = c.req.param('sessionId');
    await markSessionStarted(sessionId);

    return c.json({ success: true });
  } catch (error) {
    return c.json({ error: error.message }, 400);
  }
});

sessionAssignmentRoutes.post('/tutoring-sessions/:sessionId/end', async (c) => {
  try {
    const userId = c.req.header('X-User-Id');
    if (!userId) return c.json({ error: 'Unauthorized' }, 401);

    const sessionId = c.req.param('sessionId');
    await markSessionEnded(sessionId);

    return c.json({ success: true });
  } catch (error) {
    return c.json({ error: error.message }, 400);
  }
});
