import { Router } from 'npm:hono';
import {
  startScreenShare,
  stopScreenShare,
  pauseScreenShare,
  resumeScreenShare,
  getCurrentScreenShare,
  isScreenSharingActive,
  updateScreenShareResolution,
  updateScreenShareFrameRate,
  getScreenShareStats,
  archiveScreenShare,
  getScreenShareHistory,
  getOptimalResolution,
  getOptimalFrameRate,
} from './screen-share-service.tsx';

export const screenShareRoutes = new Router();

// ========== SCREEN SHARE LIFECYCLE ==========

screenShareRoutes.post('/screen-share/start', async (c) => {
  try {
    const userId = c.req.header('X-User-Id');
    if (!userId) return c.json({ error: 'Unauthorized' }, 401);

    const { sessionId, userName, audioIncluded } = await c.req.json();

    const screenShare = await startScreenShare(sessionId, userId, userName, audioIncluded);

    return c.json({ screenShare });
  } catch (error) {
    return c.json({ error: error.message }, 400);
  }
});

screenShareRoutes.post('/screen-share/:screenShareId/stop', async (c) => {
  try {
    const userId = c.req.header('X-User-Id');
    if (!userId) return c.json({ error: 'Unauthorized' }, 401);

    const screenShareId = c.req.param('screenShareId');
    await stopScreenShare(screenShareId);
    await archiveScreenShare(screenShareId);

    return c.json({ success: true });
  } catch (error) {
    return c.json({ error: error.message }, 400);
  }
});

screenShareRoutes.post('/screen-share/:screenShareId/pause', async (c) => {
  try {
    const userId = c.req.header('X-User-Id');
    if (!userId) return c.json({ error: 'Unauthorized' }, 401);

    const screenShareId = c.req.param('screenShareId');
    await pauseScreenShare(screenShareId);

    return c.json({ success: true });
  } catch (error) {
    return c.json({ error: error.message }, 400);
  }
});

screenShareRoutes.post('/screen-share/:screenShareId/resume', async (c) => {
  try {
    const userId = c.req.header('X-User-Id');
    if (!userId) return c.json({ error: 'Unauthorized' }, 401);

    const screenShareId = c.req.param('screenShareId');
    await resumeScreenShare(screenShareId);

    return c.json({ success: true });
  } catch (error) {
    return c.json({ error: error.message }, 400);
  }
});

// ========== SCREEN SHARE STATUS ==========

screenShareRoutes.get('/screen-share/session/:sessionId/current', async (c) => {
  try {
    const userId = c.req.header('X-User-Id');
    if (!userId) return c.json({ error: 'Unauthorized' }, 401);

    const sessionId = c.req.param('sessionId');
    const screenShare = await getCurrentScreenShare(sessionId);

    if (!screenShare) {
      return c.json({ sharing: false });
    }

    return c.json({ sharing: true, screenShare });
  } catch (error) {
    return c.json({ error: error.message }, 400);
  }
});

screenShareRoutes.get('/screen-share/session/:sessionId/active', async (c) => {
  try {
    const userId = c.req.header('X-User-Id');
    if (!userId) return c.json({ error: 'Unauthorized' }, 401);

    const sessionId = c.req.param('sessionId');
    const active = await isScreenSharingActive(sessionId);

    return c.json({ active });
  } catch (error) {
    return c.json({ error: error.message }, 400);
  }
});

screenShareRoutes.get('/screen-share/:screenShareId/stats', async (c) => {
  try {
    const userId = c.req.header('X-User-Id');
    if (!userId) return c.json({ error: 'Unauthorized' }, 401);

    const screenShareId = c.req.param('screenShareId');
    const stats = await getScreenShareStats(screenShareId);

    if (!stats) {
      return c.json({ error: 'Screen share not found' }, 404);
    }

    return c.json({ stats });
  } catch (error) {
    return c.json({ error: error.message }, 400);
  }
});

// ========== SCREEN SHARE CONFIGURATION ==========

screenShareRoutes.patch('/screen-share/:screenShareId/resolution', async (c) => {
  try {
    const userId = c.req.header('X-User-Id');
    if (!userId) return c.json({ error: 'Unauthorized' }, 401);

    const screenShareId = c.req.param('screenShareId');
    const { resolution } = await c.req.json();

    await updateScreenShareResolution(screenShareId, resolution);

    return c.json({ success: true });
  } catch (error) {
    return c.json({ error: error.message }, 400);
  }
});

screenShareRoutes.patch('/screen-share/:screenShareId/frame-rate', async (c) => {
  try {
    const userId = c.req.header('X-User-Id');
    if (!userId) return c.json({ error: 'Unauthorized' }, 401);

    const screenShareId = c.req.param('screenShareId');
    const { fps } = await c.req.json();

    await updateScreenShareFrameRate(screenShareId, fps);

    return c.json({ success: true });
  } catch (error) {
    return c.json({ error: error.message }, 400);
  }
});

// ========== OPTIMIZATION ENDPOINTS ==========

screenShareRoutes.get('/screen-share/optimal-settings', async (c) => {
  try {
    const userId = c.req.header('X-User-Id');
    if (!userId) return c.json({ error: 'Unauthorized' }, 401);

    const availableBandwidth = parseFloat(c.req.query('bandwidth') || '3');

    const optimalResolution = getOptimalResolution(availableBandwidth);
    const optimalFrameRate = getOptimalFrameRate(availableBandwidth);

    return c.json({
      availableBandwidth,
      recommendedResolution: optimalResolution,
      recommendedFrameRate: optimalFrameRate,
    });
  } catch (error) {
    return c.json({ error: error.message }, 400);
  }
});

// ========== HISTORY AND ARCHIVING ==========

screenShareRoutes.get('/screen-share/session/:sessionId/history', async (c) => {
  try {
    const userId = c.req.header('X-User-Id');
    if (!userId) return c.json({ error: 'Unauthorized' }, 401);

    const sessionId = c.req.param('sessionId');
    const history = await getScreenShareHistory(sessionId);

    return c.json({ history });
  } catch (error) {
    return c.json({ error: error.message }, 400);
  }
});
