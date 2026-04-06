import { Router } from 'npm:hono';
import {
  createCollaborationSession,
  startCollaboration,
  pauseCollaboration,
  addAnnotation,
  getAnnotations,
  eraseAnnotation,
  undoLastAnnotation,
  clearAllAnnotations,
  exportAnnotations,
  endCollaboration,
  getCollaboration,
  getSessionCollaboration,
  getPendingBroadcasts,
  getAnnotationStats,
} from './live-collaboration-service.tsx';

export const liveCollaborationRoutes = new Router();

// ========== COLLABORATION SESSION MANAGEMENT ==========

liveCollaborationRoutes.post('/collaboration/create', async (c) => {
  try {
    const userId = c.req.header('X-User-Id');
    if (!userId) return c.json({ error: 'Unauthorized' }, 401);

    const { sessionId, studentIds, documentUrl } = await c.req.json();

    const collaboration = await createCollaborationSession(sessionId, userId, studentIds, documentUrl);

    return c.json({ collaboration });
  } catch (error) {
    return c.json({ error: error.message }, 400);
  }
});

liveCollaborationRoutes.get('/collaboration/:collaborationId', async (c) => {
  try {
    const userId = c.req.header('X-User-Id');
    if (!userId) return c.json({ error: 'Unauthorized' }, 401);

    const collaborationId = c.req.param('collaborationId');
    const collaboration = await getCollaboration(collaborationId);

    if (!collaboration) {
      return c.json({ error: 'Collaboration not found' }, 404);
    }

    return c.json({ collaboration });
  } catch (error) {
    return c.json({ error: error.message }, 400);
  }
});

liveCollaborationRoutes.get('/tutoring-sessions/:sessionId/collaboration', async (c) => {
  try {
    const userId = c.req.header('X-User-Id');
    if (!userId) return c.json({ error: 'Unauthorized' }, 401);

    const sessionId = c.req.param('sessionId');
    const collaboration = await getSessionCollaboration(sessionId);

    if (!collaboration) {
      return c.json({ error: 'No collaboration session found' }, 404);
    }

    return c.json({ collaboration });
  } catch (error) {
    return c.json({ error: error.message }, 400);
  }
});

// ========== COLLABORATION LIFECYCLE ==========

liveCollaborationRoutes.post('/collaboration/:collaborationId/start', async (c) => {
  try {
    const userId = c.req.header('X-User-Id');
    if (!userId) return c.json({ error: 'Unauthorized' }, 401);

    const collaborationId = c.req.param('collaborationId');
    await startCollaboration(collaborationId);

    return c.json({ success: true });
  } catch (error) {
    return c.json({ error: error.message }, 400);
  }
});

liveCollaborationRoutes.post('/collaboration/:collaborationId/pause', async (c) => {
  try {
    const userId = c.req.header('X-User-Id');
    if (!userId) return c.json({ error: 'Unauthorized' }, 401);

    const collaborationId = c.req.param('collaborationId');
    await pauseCollaboration(collaborationId);

    return c.json({ success: true });
  } catch (error) {
    return c.json({ error: error.message }, 400);
  }
});

liveCollaborationRoutes.post('/collaboration/:collaborationId/end', async (c) => {
  try {
    const userId = c.req.header('X-User-Id');
    if (!userId) return c.json({ error: 'Unauthorized' }, 401);

    const collaborationId = c.req.param('collaborationId');
    await endCollaboration(collaborationId);

    return c.json({ success: true });
  } catch (error) {
    return c.json({ error: error.message }, 400);
  }
});

// ========== ANNOTATIONS ==========

liveCollaborationRoutes.post('/collaboration/:collaborationId/annotate', async (c) => {
  try {
    const userId = c.req.header('X-User-Id');
    if (!userId) return c.json({ error: 'Unauthorized' }, 401);

    const collaborationId = c.req.param('collaborationId');
    const annotationData = await c.req.json();

    const annotation = await addAnnotation(collaborationId, userId, annotationData);

    return c.json({ annotation });
  } catch (error) {
    return c.json({ error: error.message }, 400);
  }
});

liveCollaborationRoutes.get('/collaboration/:collaborationId/annotations', async (c) => {
  try {
    const userId = c.req.header('X-User-Id');
    if (!userId) return c.json({ error: 'Unauthorized' }, 401);

    const collaborationId = c.req.param('collaborationId');
    const annotations = await getAnnotations(collaborationId);

    return c.json({ annotations });
  } catch (error) {
    return c.json({ error: error.message }, 400);
  }
});

liveCollaborationRoutes.delete('/collaboration/:collaborationId/annotation/:annotationId', async (c) => {
  try {
    const userId = c.req.header('X-User-Id');
    if (!userId) return c.json({ error: 'Unauthorized' }, 401);

    const collaborationId = c.req.param('collaborationId');
    const annotationId = c.req.param('annotationId');

    await eraseAnnotation(collaborationId, annotationId, userId);

    return c.json({ success: true });
  } catch (error) {
    return c.json({ error: error.message }, 400);
  }
});

liveCollaborationRoutes.post('/collaboration/:collaborationId/undo', async (c) => {
  try {
    const userId = c.req.header('X-User-Id');
    if (!userId) return c.json({ error: 'Unauthorized' }, 401);

    const collaborationId = c.req.param('collaborationId');
    const undone = await undoLastAnnotation(collaborationId, userId);

    return c.json({ success: true, undone });
  } catch (error) {
    return c.json({ error: error.message }, 400);
  }
});

liveCollaborationRoutes.post('/collaboration/:collaborationId/clear', async (c) => {
  try {
    const userId = c.req.header('X-User-Id');
    if (!userId) return c.json({ error: 'Unauthorized' }, 401);

    const collaborationId = c.req.param('collaborationId');
    const clearedCount = await clearAllAnnotations(collaborationId, userId);

    return c.json({ success: true, clearedCount });
  } catch (error) {
    return c.json({ error: error.message }, 400);
  }
});

// ========== REAL-TIME POLLING (WebSocket fallback) ==========

liveCollaborationRoutes.get('/collaboration/:collaborationId/broadcasts', async (c) => {
  try {
    const userId = c.req.header('X-User-Id');
    if (!userId) return c.json({ error: 'Unauthorized' }, 401);

    const collaborationId = c.req.param('collaborationId');
    const lastSeen = c.req.query('lastSeen');

    const broadcasts = await getPendingBroadcasts(collaborationId, userId, lastSeen);

    return c.json({ broadcasts });
  } catch (error) {
    return c.json({ error: error.message }, 400);
  }
});

// ========== EXPORT & REVIEW ==========

liveCollaborationRoutes.get('/collaboration/:collaborationId/export', async (c) => {
  try {
    const userId = c.req.header('X-User-Id');
    if (!userId) return c.json({ error: 'Unauthorized' }, 401);

    const collaborationId = c.req.param('collaborationId');
    const exported = await exportAnnotations(collaborationId);

    return c.json(exported);
  } catch (error) {
    return c.json({ error: error.message }, 400);
  }
});

liveCollaborationRoutes.get('/collaboration/:collaborationId/stats', async (c) => {
  try {
    const userId = c.req.header('X-User-Id');
    if (!userId) return c.json({ error: 'Unauthorized' }, 401);

    const collaborationId = c.req.param('collaborationId');
    const stats = await getAnnotationStats(collaborationId);

    return c.json({ stats });
  } catch (error) {
    return c.json({ error: error.message }, 400);
  }
});
