import { Router } from 'npm:hono';
import {
  createVideoSession,
  startVideoSession,
  endVideoSession,
  addMediaStream,
  removeMediaStream,
  updateStreamQuality,
  addICECandidate,
  getICECandidates,
  storeSDPOffer,
  getSDPOffer,
  storeSDPAnswer,
  getSDPAnswer,
  getVideoSessionStats,
  recordVideoStats,
  getSessionPeers,
  estimateQualityFromBitrate,
} from './video-session-service.tsx';

export const videoRoutes = new Router();

// ========== VIDEO SESSION MANAGEMENT ==========

videoRoutes.post('/video/session/create', async (c) => {
  try {
    const userId = c.req.header('X-User-Id');
    if (!userId) return c.json({ error: 'Unauthorized' }, 401);

    const { sessionId, studentIds, recordingEnabled } = await c.req.json();

    const videoSession = await createVideoSession(sessionId, userId, studentIds, recordingEnabled);

    return c.json({ videoSession });
  } catch (error) {
    return c.json({ error: error.message }, 400);
  }
});

videoRoutes.post('/video/session/:videoSessionId/start', async (c) => {
  try {
    const userId = c.req.header('X-User-Id');
    if (!userId) return c.json({ error: 'Unauthorized' }, 401);

    const videoSessionId = c.req.param('videoSessionId');
    await startVideoSession(videoSessionId);

    return c.json({ success: true });
  } catch (error) {
    return c.json({ error: error.message }, 400);
  }
});

videoRoutes.post('/video/session/:videoSessionId/end', async (c) => {
  try {
    const userId = c.req.header('X-User-Id');
    if (!userId) return c.json({ error: 'Unauthorized' }, 401);

    const videoSessionId = c.req.param('videoSessionId');
    await endVideoSession(videoSessionId);

    return c.json({ success: true });
  } catch (error) {
    return c.json({ error: error.message }, 400);
  }
});

videoRoutes.get('/video/session/:videoSessionId/stats', async (c) => {
  try {
    const userId = c.req.header('X-User-Id');
    if (!userId) return c.json({ error: 'Unauthorized' }, 401);

    const videoSessionId = c.req.param('videoSessionId');
    const stats = await getVideoSessionStats(videoSessionId);

    if (!stats) {
      return c.json({ error: 'Video session not found' }, 404);
    }

    return c.json({ stats });
  } catch (error) {
    return c.json({ error: error.message }, 400);
  }
});

// ========== MEDIA STREAM MANAGEMENT ==========

videoRoutes.post('/video/peer/:peerId/stream/add', async (c) => {
  try {
    const userId = c.req.header('X-User-Id');
    if (!userId) return c.json({ error: 'Unauthorized' }, 401);

    const peerId = c.req.param('peerId');
    const { streamType, quality, codec } = await c.req.json();

    const stream = await addMediaStream(peerId, userId, streamType, quality || 'medium', codec);

    return c.json({ stream });
  } catch (error) {
    return c.json({ error: error.message }, 400);
  }
});

videoRoutes.delete('/video/peer/:peerId/stream/:streamId', async (c) => {
  try {
    const userId = c.req.header('X-User-Id');
    if (!userId) return c.json({ error: 'Unauthorized' }, 401);

    const peerId = c.req.param('peerId');
    const streamId = c.req.param('streamId');

    await removeMediaStream(peerId, streamId);

    return c.json({ success: true });
  } catch (error) {
    return c.json({ error: error.message }, 400);
  }
});

videoRoutes.patch('/video/peer/:peerId/stream/:streamId/quality', async (c) => {
  try {
    const userId = c.req.header('X-User-Id');
    if (!userId) return c.json({ error: 'Unauthorized' }, 401);

    const peerId = c.req.param('peerId');
    const streamId = c.req.param('streamId');
    const { quality } = await c.req.json();

    await updateStreamQuality(peerId, streamId, quality);

    return c.json({ success: true });
  } catch (error) {
    return c.json({ error: error.message }, 400);
  }
});

// ========== WEBRTC SIGNALING ==========

videoRoutes.post('/video/peer/:peerId/offer', async (c) => {
  try {
    const userId = c.req.header('X-User-Id');
    if (!userId) return c.json({ error: 'Unauthorized' }, 401);

    const peerId = c.req.param('peerId');
    const offer = await c.req.json();

    await storeSDPOffer(peerId, offer);

    return c.json({ success: true });
  } catch (error) {
    return c.json({ error: error.message }, 400);
  }
});

videoRoutes.get('/video/peer/:peerId/offer', async (c) => {
  try {
    const userId = c.req.header('X-User-Id');
    if (!userId) return c.json({ error: 'Unauthorized' }, 401);

    const peerId = c.req.param('peerId');
    const offer = await getSDPOffer(peerId);

    if (!offer) {
      return c.json({ error: 'Offer not found' }, 404);
    }

    return c.json({ offer });
  } catch (error) {
    return c.json({ error: error.message }, 400);
  }
});

videoRoutes.post('/video/peer/:peerId/answer', async (c) => {
  try {
    const userId = c.req.header('X-User-Id');
    if (!userId) return c.json({ error: 'Unauthorized' }, 401);

    const peerId = c.req.param('peerId');
    const answer = await c.req.json();

    await storeSDPAnswer(peerId, answer);

    return c.json({ success: true });
  } catch (error) {
    return c.json({ error: error.message }, 400);
  }
});

videoRoutes.get('/video/peer/:peerId/answer', async (c) => {
  try {
    const userId = c.req.header('X-User-Id');
    if (!userId) return c.json({ error: 'Unauthorized' }, 401);

    const peerId = c.req.param('peerId');
    const answer = await getSDPAnswer(peerId);

    if (!answer) {
      return c.json({ error: 'Answer not found' }, 404);
    }

    return c.json({ answer });
  } catch (error) {
    return c.json({ error: error.message }, 400);
  }
});

// ========== ICE CANDIDATE HANDLING ==========

videoRoutes.post('/video/peer/:peerId/ice-candidate', async (c) => {
  try {
    const userId = c.req.header('X-User-Id');
    if (!userId) return c.json({ error: 'Unauthorized' }, 401);

    const peerId = c.req.param('peerId');
    const candidate = await c.req.json();

    await addICECandidate(peerId, candidate);

    return c.json({ success: true });
  } catch (error) {
    return c.json({ error: error.message }, 400);
  }
});

videoRoutes.get('/video/peer/:peerId/ice-candidates', async (c) => {
  try {
    const userId = c.req.header('X-User-Id');
    if (!userId) return c.json({ error: 'Unauthorized' }, 401);

    const peerId = c.req.param('peerId');
    const candidates = await getICECandidates(peerId);

    return c.json({ candidates });
  } catch (error) {
    return c.json({ error: error.message }, 400);
  }
});

// ========== QUALITY AND STATS ==========

videoRoutes.post('/video/stats', async (c) => {
  try {
    const userId = c.req.header('X-User-Id');
    if (!userId) return c.json({ error: 'Unauthorized' }, 401);

    const { videoSessionId, stats } = await c.req.json();

    await recordVideoStats(videoSessionId, userId, stats);

    // Auto-adjust quality based on bitrate
    const estimatedQuality = estimateQualityFromBitrate(stats.bitrate);
    // Quality adjustment would be returned to client for adjustment

    return c.json({ success: true, suggestedQuality: estimatedQuality });
  } catch (error) {
    return c.json({ error: error.message }, 400);
  }
});

videoRoutes.get('/video/session/:videoSessionId/peers', async (c) => {
  try {
    const userId = c.req.header('X-User-Id');
    if (!userId) return c.json({ error: 'Unauthorized' }, 401);

    const videoSessionId = c.req.param('videoSessionId');
    const peers = await getSessionPeers(videoSessionId);

    return c.json({ peers });
  } catch (error) {
    return c.json({ error: error.message }, 400);
  }
});
