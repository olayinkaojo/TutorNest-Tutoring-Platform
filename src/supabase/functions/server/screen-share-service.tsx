import * as kv from './kv_store.tsx';

export interface ScreenShare {
  id: string;
  sessionId: string;
  userId: string;
  userName: string;
  startedAt: string;
  endedAt?: string;
  frameRate: number;
  resolution: string;
  status: 'active' | 'paused' | 'ended';
  audioIncluded: boolean;
}

export interface ScreenShareFrame {
  id: string;
  screenShareId: string;
  timestamp: string;
  frameNumber: number;
  dataUrl?: string; // Canvas data for fallback
}

/**
 * Start screen sharing
 */
export async function startScreenShare(
  sessionId: string,
  userId: string,
  userName: string,
  audioIncluded: boolean = false
): Promise<ScreenShare> {
  const screenShareId = `screen:${sessionId}:${userId}:${Date.now()}`;

  const screenShare: ScreenShare = {
    id: screenShareId,
    sessionId,
    userId,
    userName,
    startedAt: new Date().toISOString(),
    frameRate: 15, // Optimized for performance
    resolution: '1280x720',
    status: 'active',
    audioIncluded,
  };

  await kv.set(`screen-share:${screenShareId}`, screenShare);
  await kv.set(`session:${sessionId}:current-screen-share`, screenShareId);

  return screenShare;
}

/**
 * Stop screen sharing
 */
export async function stopScreenShare(screenShareId: string): Promise<void> {
  const screenShare = await kv.get(`screen-share:${screenShareId}`);
  if (!screenShare) throw new Error('Screen share not found');

  screenShare.status = 'ended';
  screenShare.endedAt = new Date().toISOString();

  await kv.set(`screen-share:${screenShareId}`, screenShare);

  // Remove current screen share reference
  await kv.set(`session:${screenShare.sessionId}:current-screen-share`, null);
}

/**
 * Pause screen sharing
 */
export async function pauseScreenShare(screenShareId: string): Promise<void> {
  const screenShare = await kv.get(`screen-share:${screenShareId}`);
  if (!screenShare) return;

  screenShare.status = 'paused';
  await kv.set(`screen-share:${screenShareId}`, screenShare);
}

/**
 * Resume screen sharing
 */
export async function resumeScreenShare(screenShareId: string): Promise<void> {
  const screenShare = await kv.get(`screen-share:${screenShareId}`);
  if (!screenShare) return;

  screenShare.status = 'active';
  await kv.set(`screen-share:${screenShareId}`, screenShare);
}

/**
 * Get current screen share for session
 */
export async function getCurrentScreenShare(sessionId: string): Promise<ScreenShare | null> {
  const screenShareId = await kv.get(`session:${sessionId}:current-screen-share`);
  if (!screenShareId) return null;

  return await kv.get(`screen-share:${screenShareId}`);
}

/**
 * Check if anyone is screen sharing in session
 */
export async function isScreenSharingActive(sessionId: string): Promise<boolean> {
  const screenShare = await getCurrentScreenShare(sessionId);
  return screenShare !== null && screenShare.status === 'active';
}

/**
 * Get screen share history for session
 */
export async function getScreenShareHistory(sessionId: string): Promise<ScreenShare[]> {
  const historyKey = `session:${sessionId}:screen-share-history`;
  return (await kv.get(historyKey)) || [];
}

/**
 * Add screen share to history
 */
export async function archiveScreenShare(screenShareId: string): Promise<void> {
  const screenShare = await kv.get(`screen-share:${screenShareId}`);
  if (!screenShare) return;

  const historyKey = `session:${screenShare.sessionId}:screen-share-history`;
  const history = (await kv.get(historyKey)) || [];

  history.push({
    id: screenShare.id,
    sessionId: screenShare.sessionId,
    userId: screenShare.userId,
    userName: screenShare.userName,
    startedAt: screenShare.startedAt,
    endedAt: screenShare.endedAt,
    frameRate: screenShare.frameRate,
    resolution: screenShare.resolution,
    status: screenShare.status,
    audioIncluded: screenShare.audioIncluded,
    duration: screenShare.endedAt
      ? Math.round(
          (new Date(screenShare.endedAt).getTime() - new Date(screenShare.startedAt).getTime()) /
            1000
        )
      : 0,
  });

  // Keep only last 50 screen shares
  if (history.length > 50) {
    history.shift();
  }

  await kv.set(historyKey, history);
}

/**
 * Update screen share resolution
 */
export async function updateScreenShareResolution(
  screenShareId: string,
  resolution: string
): Promise<void> {
  const screenShare = await kv.get(`screen-share:${screenShareId}`);
  if (!screenShare) return;

  screenShare.resolution = resolution;
  await kv.set(`screen-share:${screenShareId}`, screenShare);
}

/**
 * Update screen share frame rate
 */
export async function updateScreenShareFrameRate(screenShareId: string, fps: number): Promise<void> {
  const screenShare = await kv.get(`screen-share:${screenShareId}`);
  if (!screenShare) return;

  // Clamp between 5 and 30 FPS
  screenShare.frameRate = Math.max(5, Math.min(30, fps));
  await kv.set(`screen-share:${screenShareId}`, screenShare);
}

/**
 * Record screen share frame (for recording/replay)
 */
export async function recordScreenFrame(
  screenShareId: string,
  frameNumber: number,
  dataUrl?: string
): Promise<void> {
  const frameId = `frame:${screenShareId}:${frameNumber}`;

  const frame: ScreenShareFrame = {
    id: frameId,
    screenShareId,
    timestamp: new Date().toISOString(),
    frameNumber,
    dataUrl,
  };

  // Store frame
  await kv.set(frameId, frame);

  // Add to frame list
  const framesKey = `${screenShareId}:frames`;
  const frames = (await kv.get(framesKey)) || [];
  frames.push(frameId);

  // Keep only last 500 frames (for memory management)
  if (frames.length > 500) {
    const oldFrameId = frames.shift();
    await kv.set(oldFrameId, null); // Delete old frame
  }

  await kv.set(framesKey, frames);
}

/**
 * Get screen share frames (for replay)
 */
export async function getScreenShareFrames(
  screenShareId: string,
  startFrame?: number,
  endFrame?: number
): Promise<ScreenShareFrame[]> {
  const framesKey = `${screenShareId}:frames`;
  const frameIds = ((await kv.get(framesKey)) || []).slice(startFrame, endFrame);

  const frames: ScreenShareFrame[] = [];
  for (const frameId of frameIds) {
    const frame = await kv.get(frameId);
    if (frame) frames.push(frame);
  }

  return frames;
}

/**
 * Get optimal resolution based on network
 */
export function getOptimalResolution(availableBandwidth: number): string {
  // Bandwidth in Mbps
  if (availableBandwidth > 5) return '1920x1080'; // 1080p
  if (availableBandwidth > 2) return '1280x720'; // 720p
  if (availableBandwidth > 1) return '640x480'; // 480p
  return '320x240'; // 240p
}

/**
 * Get optimal frame rate based on network
 */
export function getOptimalFrameRate(availableBandwidth: number): number {
  // Bandwidth in Mbps
  if (availableBandwidth > 5) return 30;
  if (availableBandwidth > 2) return 24;
  if (availableBandwidth > 1) return 15;
  return 10;
}

/**
 * Calculate screen share duration
 */
export function getScreenShareDuration(screenShare: ScreenShare): number {
  if (!screenShare.endedAt) {
    return Math.round((Date.now() - new Date(screenShare.startedAt).getTime()) / 1000);
  }

  return Math.round(
    (new Date(screenShare.endedAt).getTime() - new Date(screenShare.startedAt).getTime()) / 1000
  );
}

/**
 * Calculate bandwidth used by screen share
 */
export function calculateScreenShareBandwidth(
  resolution: string,
  frameRate: number,
  duration: number
): number {
  // Rough estimate in MB
  let pixelCount = 0;

  switch (resolution) {
    case '1920x1080':
      pixelCount = 2073600;
      break;
    case '1280x720':
      pixelCount = 921600;
      break;
    case '640x480':
      pixelCount = 307200;
      break;
    case '320x240':
      pixelCount = 76800;
      break;
  }

  // Estimate: pixelCount * frameRate * duration / (8 bits/byte * 1024*1024 bytes/MB)
  // Assuming H.264 codec with ~30:1 compression
  const bandwidth = (pixelCount * frameRate * duration) / (30 * 8 * 1024 * 1024);
  return bandwidth;
}

/**
 * Get screen share statistics
 */
export async function getScreenShareStats(screenShareId: string): Promise<any> {
  const screenShare = await kv.get(`screen-share:${screenShareId}`);
  if (!screenShare) return null;

  const duration = getScreenShareDuration(screenShare);
  const bandwidth = calculateScreenShareBandwidth(screenShare.resolution, screenShare.frameRate, duration);
  const framesKey = `${screenShareId}:frames`;
  const frameCount = ((await kv.get(framesKey)) || []).length;

  return {
    id: screenShare.id,
    userId: screenShare.userId,
    userName: screenShare.userName,
    status: screenShare.status,
    startedAt: screenShare.startedAt,
    endedAt: screenShare.endedAt,
    duration,
    resolution: screenShare.resolution,
    frameRate: screenShare.frameRate,
    frameCount,
    estimatedBandwidth: Math.round(bandwidth),
    audioIncluded: screenShare.audioIncluded,
  };
}
