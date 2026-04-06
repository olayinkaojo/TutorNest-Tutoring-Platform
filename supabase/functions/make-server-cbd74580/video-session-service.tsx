import * as kv from './kv_store.tsx';

export type VideoQuality = 'high' | 'medium' | 'low';

export interface MediaStream {
  streamId: string;
  userId: string;
  type: 'camera' | 'screen' | 'audio';
  enabled: boolean;
  quality: VideoQuality;
  codec: string;
  resolution?: string;
  fps?: number;
  bitrate?: number;
}

export interface WebRTCPeer {
  peerId: string;
  sessionId: string;
  userId: string;
  peerConnection?: RTCPeerConnection;
  localStreams: MediaStream[];
  remoteStreams: MediaStream[];
  createdAt: string;
}

export interface VideoSession {
  id: string;
  sessionId: string;
  tutorId: string;
  studentIds: string[];
  status: 'created' | 'active' | 'paused' | 'completed';
  startedAt?: string;
  endedAt?: string;
  recordingEnabled: boolean;
  recordingUrl?: string;
  stats: {
    totalDuration: number;
    participantDurations: { [userId: string]: number };
    averageBitrate: number;
    packetsLost: number;
  };
}

export interface ICECandidate {
  candidate: string;
  sdpMLineIndex: number;
  sdpMid: string;
}

export interface SDPOffer {
  type: 'offer';
  sdp: string;
}

export interface SDPAnswer {
  type: 'answer';
  sdp: string;
}

/**
 * Create a new video session
 */
export async function createVideoSession(
  sessionId: string,
  tutorId: string,
  studentIds: string[],
  recordingEnabled: boolean = false
): Promise<VideoSession> {
  const videoSessionId = `video:${sessionId}:${Date.now()}`;

  const videoSession: VideoSession = {
    id: videoSessionId,
    sessionId,
    tutorId,
    studentIds,
    status: 'created',
    recordingEnabled,
    stats: {
      totalDuration: 0,
      participantDurations: {},
      averageBitrate: 0,
      packetsLost: 0,
    },
  };

  await kv.set(`video-session:${videoSessionId}`, videoSession);
  await kv.set(`session:${sessionId}:video-session-id`, videoSessionId);

  // Initialize peer tracking
  for (const studentId of studentIds) {
    const peerId = `peer:${videoSessionId}:${tutorId}:${studentId}`;
    const peer: WebRTCPeer = {
      peerId,
      sessionId,
      userId: studentId,
      localStreams: [],
      remoteStreams: [],
      createdAt: new Date().toISOString(),
    };
    await kv.set(peerId, peer);
  }

  return videoSession;
}

/**
 * Start video session
 */
export async function startVideoSession(videoSessionId: string): Promise<void> {
  const videoSession = await kv.get(`video-session:${videoSessionId}`);
  if (!videoSession) throw new Error('Video session not found');

  videoSession.status = 'active';
  videoSession.startedAt = new Date().toISOString();

  // Initialize participant durations
  videoSession.stats.participantDurations[videoSession.tutorId] = 0;
  for (const studentId of videoSession.studentIds) {
    videoSession.stats.participantDurations[studentId] = 0;
  }

  await kv.set(`video-session:${videoSessionId}`, videoSession);
}

/**
 * Add media stream to peer
 */
export async function addMediaStream(
  peerId: string,
  userId: string,
  streamType: 'camera' | 'screen' | 'audio',
  quality: VideoQuality = 'medium',
  codec: string = 'vp8'
): Promise<MediaStream> {
  const peer = await kv.get(peerId);
  if (!peer) throw new Error('Peer not found');

  const streamId = `stream:${peerId}:${streamType}:${Date.now()}`;

  const stream: MediaStream = {
    streamId,
    userId,
    type: streamType,
    enabled: true,
    quality,
    codec,
    resolution: getResolutionForQuality(quality, streamType),
    fps: getFrameRateForQuality(quality),
    bitrate: getBitrateForQuality(quality),
  };

  peer.localStreams.push(stream);
  await kv.set(peerId, peer);

  return stream;
}

/**
 * Remove media stream from peer
 */
export async function removeMediaStream(peerId: string, streamId: string): Promise<void> {
  const peer = await kv.get(peerId);
  if (!peer) return;

  peer.localStreams = peer.localStreams.filter((s) => s.streamId !== streamId);
  await kv.set(peerId, peer);
}

/**
 * Update stream quality based on network conditions
 */
export async function updateStreamQuality(
  peerId: string,
  streamId: string,
  newQuality: VideoQuality
): Promise<void> {
  const peer = await kv.get(peerId);
  if (!peer) return;

  const stream = peer.localStreams.find((s) => s.streamId === streamId);
  if (stream) {
    stream.quality = newQuality;
    stream.resolution = getResolutionForQuality(newQuality, stream.type);
    stream.fps = getFrameRateForQuality(newQuality);
    stream.bitrate = getBitrateForQuality(newQuality);

    await kv.set(peerId, peer);
  }
}

/**
 * Add ICE candidate
 */
export async function addICECandidate(
  peerId: string,
  candidate: ICECandidate
): Promise<void> {
  const candidatesKey = `${peerId}:ice-candidates`;
  const candidates = (await kv.get(candidatesKey)) || [];

  candidates.push({
    candidate: candidate.candidate,
    sdpMLineIndex: candidate.sdpMLineIndex,
    sdpMid: candidate.sdpMid,
    addedAt: new Date().toISOString(),
  });

  await kv.set(candidatesKey, candidates);
}

/**
 * Get ICE candidates for peer
 */
export async function getICECandidates(peerId: string): Promise<any[]> {
  const candidatesKey = `${peerId}:ice-candidates`;
  return (await kv.get(candidatesKey)) || [];
}

/**
 * Store SDP offer
 */
export async function storeSDPOffer(peerId: string, offer: SDPOffer): Promise<void> {
  await kv.set(`${peerId}:sdp-offer`, {
    ...offer,
    createdAt: new Date().toISOString(),
  });
}

/**
 * Get SDP offer
 */
export async function getSDPOffer(peerId: string): Promise<SDPOffer | null> {
  return await kv.get(`${peerId}:sdp-offer`);
}

/**
 * Store SDP answer
 */
export async function storeSDPAnswer(peerId: string, answer: SDPAnswer): Promise<void> {
  await kv.set(`${peerId}:sdp-answer`, {
    ...answer,
    createdAt: new Date().toISOString(),
  });
}

/**
 * Get SDP answer
 */
export async function getSDPAnswer(peerId: string): Promise<SDPAnswer | null> {
  return await kv.get(`${peerId}:sdp-answer`);
}

/**
 * Record video quality stats
 */
export async function recordVideoStats(
  videoSessionId: string,
  userId: string,
  stats: {
    bitrate: number;
    packetsLost: number;
    latency: number;
    jitter: number;
  }
): Promise<void> {
  const statsKey = `${videoSessionId}:stats:${userId}`;
  const history = (await kv.get(statsKey)) || [];

  history.push({
    ...stats,
    timestamp: new Date().toISOString(),
  });

  // Keep only last 1000 entries
  if (history.length > 1000) {
    history.shift();
  }

  await kv.set(statsKey, history);
}

/**
 * End video session
 */
export async function endVideoSession(videoSessionId: string): Promise<void> {
  const videoSession = await kv.get(`video-session:${videoSessionId}`);
  if (!videoSession) return;

  videoSession.status = 'completed';
  videoSession.endedAt = new Date().toISOString();

  if (videoSession.startedAt) {
    videoSession.stats.totalDuration = Math.round(
      (new Date(videoSession.endedAt).getTime() - new Date(videoSession.startedAt).getTime()) / 1000
    );
  }

  await kv.set(`video-session:${videoSessionId}`, videoSession);
}

/**
 * Get video session stats
 */
export async function getVideoSessionStats(videoSessionId: string): Promise<any> {
  const videoSession = await kv.get(`video-session:${videoSessionId}`);
  if (!videoSession) return null;

  return {
    sessionId: videoSession.sessionId,
    status: videoSession.status,
    duration: videoSession.stats.totalDuration,
    participantCount: videoSession.studentIds.length + 1,
    recordingEnabled: videoSession.recordingEnabled,
    startedAt: videoSession.startedAt,
    endedAt: videoSession.endedAt,
    stats: videoSession.stats,
  };
}

/**
 * Get resolution for quality level
 */
function getResolutionForQuality(
  quality: VideoQuality,
  streamType: 'camera' | 'screen' | 'audio'
): string {
  if (streamType === 'audio') return 'N/A';

  switch (quality) {
    case 'high':
      return streamType === 'screen' ? '1920x1080' : '1280x720';
    case 'medium':
      return streamType === 'screen' ? '1280x720' : '640x480';
    case 'low':
      return streamType === 'screen' ? '640x480' : '320x240';
  }
}

/**
 * Get frame rate for quality level
 */
function getFrameRateForQuality(quality: VideoQuality): number {
  switch (quality) {
    case 'high':
      return 30;
    case 'medium':
      return 24;
    case 'low':
      return 15;
  }
}

/**
 * Get bitrate for quality level (in kbps)
 */
function getBitrateForQuality(quality: VideoQuality): number {
  switch (quality) {
    case 'high':
      return 2500; // 2.5 Mbps
    case 'medium':
      return 1000; // 1 Mbps
    case 'low':
      return 500; // 500 kbps
  }
}

/**
 * Estimate quality based on bitrate
 */
export function estimateQualityFromBitrate(bitrate: number): VideoQuality {
  if (bitrate > 1500) return 'high';
  if (bitrate > 600) return 'medium';
  return 'low';
}

/**
 * Get all peers for a video session
 */
export async function getSessionPeers(videoSessionId: string): Promise<WebRTCPeer[]> {
  const videoSession = await kv.get(`video-session:${videoSessionId}`);
  if (!videoSession) return [];

  const peers: WebRTCPeer[] = [];

  for (const studentId of videoSession.studentIds) {
    const peerId = `peer:${videoSessionId}:${videoSession.tutorId}:${studentId}`;
    const peer = await kv.get(peerId);
    if (peer) peers.push(peer);
  }

  return peers;
}
