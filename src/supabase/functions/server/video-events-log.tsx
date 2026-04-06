import * as kv from './kv_store.tsx';

export interface VideoEvent {
  id: string;
  videoSessionId: string;
  userId: string;
  eventType:
    | 'session_started'
    | 'session_ended'
    | 'video_enabled'
    | 'video_disabled'
    | 'audio_enabled'
    | 'audio_disabled'
    | 'screen_share_started'
    | 'screen_share_stopped'
    | 'participant_joined'
    | 'participant_left'
    | 'connection_quality_changed'
    | 'error_occurred';
  timestamp: string;
  data: any; // Event-specific data
}

export interface VideoSessionSummary {
  videoSessionId: string;
  tutorId: string;
  studentIds: string[];
  startTime: string;
  endTime?: string;
  duration: number; // in seconds
  participants: string[];
  totalEvents: number;
  screenShareCount: number;
  audioDropouts: number;
  videoDropouts: number;
  errorCount: number;
  peakBitrate: number; // Mbps
  averageBitrate: number; // Mbps
  connectionQuality: 'excellent' | 'good' | 'fair' | 'poor';
}

/**
 * Log a video event
 */
export async function logVideoEvent(
  videoSessionId: string,
  userId: string,
  eventType: string,
  data: any = {}
): Promise<void> {
  const eventId = `event:${videoSessionId}:${userId}:${Date.now()}:${Math.random().toString(36).slice(2, 9)}`;

  const event: VideoEvent = {
    id: eventId,
    videoSessionId,
    userId,
    eventType: eventType as any,
    timestamp: new Date().toISOString(),
    data,
  };

  // Store individual event
  await kv.set(eventId, event);

  // Add to session event log
  const logKey = `video:${videoSessionId}:events`;
  const events = ((await kv.get(logKey)) || []) as string[];
  events.push(eventId);

  // Keep only last 10,000 events per session
  if (events.length > 10000) {
    const oldEventId = events.shift();
    if (oldEventId) {
      await kv.set(oldEventId, null); // Delete old event
    }
  }

  await kv.set(logKey, events);

  // Update session summary
  await updateSessionSummary(videoSessionId);
}

/**
 * Get all events for a video session
 */
export async function getVideoSessionEvents(
  videoSessionId: string,
  limit: number = 100,
  offset: number = 0
): Promise<VideoEvent[]> {
  const logKey = `video:${videoSessionId}:events`;
  const eventIds = ((await kv.get(logKey)) || []) as string[];

  // Get from end (most recent) going backwards
  const slicedIds = eventIds.slice(Math.max(0, eventIds.length - offset - limit), eventIds.length - offset);
  const events: VideoEvent[] = [];

  for (const eventId of slicedIds) {
    const event = await kv.get(eventId);
    if (event) events.push(event);
  }

  return events.reverse(); // Return oldest to newest
}

/**
 * Get events of specific type
 */
export async function getVideoSessionEventsByType(
  videoSessionId: string,
  eventType: string
): Promise<VideoEvent[]> {
  const allEvents = await getVideoSessionEvents(videoSessionId, 10000);
  return allEvents.filter((e) => e.eventType === eventType);
}

/**
 * Get events by user
 */
export async function getVideoSessionEventsByUser(
  videoSessionId: string,
  userId: string
): Promise<VideoEvent[]> {
  const allEvents = await getVideoSessionEvents(videoSessionId, 10000);
  return allEvents.filter((e) => e.userId === userId);
}

/**
 * Update video session summary
 */
export async function updateSessionSummary(videoSessionId: string): Promise<void> {
  const videoSession = await kv.get(`video-session:${videoSessionId}`);
  if (!videoSession) return;

  const events = await getVideoSessionEvents(videoSessionId, 10000);

  // Calculate summary metrics
  const screenShareEvents = events.filter((e) => e.eventType === 'screen_share_started');
  const audioDisabledEvents = events.filter((e) => e.eventType === 'audio_disabled');
  const videoDisabledEvents = events.filter((e) => e.eventType === 'video_disabled');
  const errorEvents = events.filter((e) => e.eventType === 'error_occurred');

  const bitrates = events
    .filter((e) => e.eventType === 'connection_quality_changed' && e.data?.bitrate)
    .map((e) => e.data.bitrate);

  const peakBitrate = bitrates.length > 0 ? Math.max(...bitrates) : 0;
  const averageBitrate = bitrates.length > 0 ? bitrates.reduce((a, b) => a + b) / bitrates.length : 0;

  const endEvent = events.find((e) => e.eventType === 'session_ended');
  const startEvent = events.find((e) => e.eventType === 'session_started');

  const duration = endEvent && startEvent
    ? Math.round(
        (new Date(endEvent.timestamp).getTime() - new Date(startEvent.timestamp).getTime()) / 1000
      )
    : 0;

  // Determine connection quality
  let connectionQuality: 'excellent' | 'good' | 'fair' | 'poor' = 'good';
  if (averageBitrate > 4) connectionQuality = 'excellent';
  else if (averageBitrate > 2) connectionQuality = 'good';
  else if (averageBitrate > 1) connectionQuality = 'fair';
  else connectionQuality = 'poor';

  const summary: VideoSessionSummary = {
    videoSessionId,
    tutorId: videoSession.tutorId,
    studentIds: videoSession.studentIds,
    startTime: videoSession.startedAt,
    endTime: videoSession.endedAt,
    duration,
    participants: videoSession.participants || [],
    totalEvents: events.length,
    screenShareCount: screenShareEvents.length,
    audioDropouts: audioDisabledEvents.length,
    videoDropouts: videoDisabledEvents.length,
    errorCount: errorEvents.length,
    peakBitrate,
    averageBitrate,
    connectionQuality,
  };

  await kv.set(`video:${videoSessionId}:summary`, summary);
}

/**
 * Get video session summary
 */
export async function getVideoSessionSummary(videoSessionId: string): Promise<VideoSessionSummary | null> {
  return await kv.get(`video:${videoSessionId}:summary`);
}

/**
 * Get all sessions for a user
 */
export async function getUserVideoSessions(userId: string, limit: number = 50): Promise<VideoSessionSummary[]> {
  const sessionsKey = `user:${userId}:video-sessions`;
  const sessionIds = ((await kv.get(sessionsKey)) || []) as string[];

  const sessions: VideoSessionSummary[] = [];
  for (const sessionId of sessionIds.slice(-limit)) {
    const summary = await getVideoSessionSummary(sessionId);
    if (summary) sessions.push(summary);
  }

  return sessions.reverse();
}

/**
 * Generate video session report
 */
export async function generateVideoSessionReport(videoSessionId: string): Promise<any> {
  const summary = await getVideoSessionSummary(videoSessionId);
  if (!summary) return null;

  const events = await getVideoSessionEvents(videoSessionId, 10000);

  // Analyze events by type
  const eventsByType = {} as Record<string, number>;
  events.forEach((e) => {
    eventsByType[e.eventType] = (eventsByType[e.eventType] || 0) + 1;
  });

  // Analyze participant engagement
  const participantStats = {} as Record<string, any>;
  summary.participants.forEach((userId) => {
    const userEvents = events.filter((e) => e.userId === userId);
    participantStats[userId] = {
      eventCount: userEvents.length,
      videoDisabled: userEvents.filter((e) => e.eventType === 'video_disabled').length,
      audioDisabled: userEvents.filter((e) => e.eventType === 'audio_disabled').length,
      screenShares: userEvents.filter((e) => e.eventType === 'screen_share_started').length,
    };
  });

  // Calculate quality timeline (5-minute buckets)
  const qualityTimeline = [] as Array<{ time: string; bitrate: number; quality: string }>;
  const timelineMap = {} as Record<string, number[]>;

  events
    .filter((e) => e.eventType === 'connection_quality_changed' && e.data?.bitrate)
    .forEach((e) => {
      const bucketTime = new Date(e.timestamp).getTime();
      const bucketKey = Math.floor(bucketTime / 300000) * 300000; // 5 minute buckets
      if (!timelineMap[bucketKey.toString()]) timelineMap[bucketKey.toString()] = [];
      timelineMap[bucketKey.toString()].push(e.data.bitrate);
    });

  Object.entries(timelineMap).forEach(([time, bitrates]) => {
    const avgBitrate = bitrates.reduce((a, b) => a + b) / bitrates.length;
    let quality = 'good';
    if (avgBitrate > 4) quality = 'excellent';
    else if (avgBitrate > 2) quality = 'good';
    else if (avgBitrate > 1) quality = 'fair';
    else quality = 'poor';

    qualityTimeline.push({
      time: new Date(parseInt(time)).toISOString(),
      bitrate: Math.round(avgBitrate * 100) / 100,
      quality,
    });
  });

  return {
    summary,
    eventsByType,
    participantStats,
    qualityTimeline,
    report: {
      sessionDuration: `${Math.floor(summary.duration / 60)}m ${summary.duration % 60}s`,
      averageBitrate: `${Math.round(summary.averageBitrate * 100) / 100} Mbps`,
      peakBitrate: `${Math.round(summary.peakBitrate * 100) / 100} Mbps`,
      connectionQuality: summary.connectionQuality.toUpperCase(),
      participantCount: summary.participants.length,
      screenShares: summary.screenShareCount,
      audioIssues: summary.audioDropouts,
      videoIssues: summary.videoDropouts,
      errors: summary.errorCount,
    },
  };
}

/**
 * Clean up old events (keep only last 30 days)
 */
export async function cleanupOldVideoEvents(): Promise<void> {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  // This would need to be called periodically
  // In a real system, you'd want to batch delete old events
  // For now, this is a placeholder for the cleanup logic
}

/**
 * Get video quality metrics for a time period
 */
export async function getVideoQualityMetrics(
  userId: string,
  startDate: Date,
  endDate: Date
): Promise<any> {
  const sessions = await getUserVideoSessions(userId, 100);

  const relevantSessions = sessions.filter((s) => {
    const startTime = new Date(s.startTime);
    return startTime >= startDate && startTime <= endDate;
  });

  const metrics = {
    totalSessions: relevantSessions.length,
    totalMinutes: relevantSessions.reduce((sum, s) => sum + s.duration / 60, 0),
    averageBitrate: 0,
    averageConnectionQuality: {} as Record<string, number>,
    totalErrors: 0,
  };

  let totalBitrate = 0;
  const qualityCounts = {} as Record<string, number>;

  relevantSessions.forEach((s) => {
    totalBitrate += s.averageBitrate;
    qualityCounts[s.connectionQuality] = (qualityCounts[s.connectionQuality] || 0) + 1;
    metrics.totalErrors += s.errorCount;
  });

  if (relevantSessions.length > 0) {
    metrics.averageBitrate = Math.round((totalBitrate / relevantSessions.length) * 100) / 100;

    Object.entries(qualityCounts).forEach(([quality, count]) => {
      metrics.averageConnectionQuality[quality] = Math.round((count / relevantSessions.length) * 100);
    });
  }

  return metrics;
}
