import { WebSocket } from 'npm:deno-websocket';

export type MessageType =
  | 'annotation'
  | 'chat_message'
  | 'user_joined'
  | 'user_left'
  | 'media_state_changed'
  | 'screen_share_started'
  | 'screen_share_stopped'
  | 'ice_candidate'
  | 'sdp_offer'
  | 'sdp_answer'
  | 'ping'
  | 'pong';

export interface WebSocketMessage {
  type: MessageType;
  sessionId: string;
  userId: string;
  userName?: string;
  payload: any;
  timestamp: string;
}

export interface SessionConnection {
  sessionId: string;
  userId: string;
  userName: string;
  socket: WebSocket;
  connectedAt: string;
  lastHeartbeat: string;
  mediaState: {
    audioEnabled: boolean;
    videoEnabled: boolean;
    screenSharing: boolean;
  };
}

// Global session connections map
const sessionConnections = new Map<string, SessionConnection[]>();
const userConnections = new Map<string, SessionConnection>();

/**
 * Register a new WebSocket connection for a session
 */
export async function registerConnection(
  sessionId: string,
  userId: string,
  userName: string,
  socket: WebSocket
): Promise<void> {
  const connection: SessionConnection = {
    sessionId,
    userId,
    userName,
    socket,
    connectedAt: new Date().toISOString(),
    lastHeartbeat: new Date().toISOString(),
    mediaState: {
      audioEnabled: true,
      videoEnabled: true,
      screenSharing: false,
    },
  };

  // Add to session connections
  const existingConnections = sessionConnections.get(sessionId) || [];
  existingConnections.push(connection);
  sessionConnections.set(sessionId, existingConnections);

  // Track user connection
  userConnections.set(`${sessionId}:${userId}`, connection);

  // Notify others that user joined
  await broadcastToSession(sessionId, {
    type: 'user_joined',
    sessionId,
    userId,
    userName,
    payload: {
      userId,
      userName,
      mediaState: connection.mediaState,
      connectedAt: connection.connectedAt,
    },
    timestamp: new Date().toISOString(),
  });
}

/**
 * Unregister a WebSocket connection
 */
export async function unregisterConnection(sessionId: string, userId: string): Promise<void> {
  const key = `${sessionId}:${userId}`;
  const connections = sessionConnections.get(sessionId) || [];
  const filtered = connections.filter((c) => c.userId !== userId);

  if (filtered.length > 0) {
    sessionConnections.set(sessionId, filtered);
  } else {
    sessionConnections.delete(sessionId);
  }

  userConnections.delete(key);

  // Notify others that user left
  await broadcastToSession(sessionId, {
    type: 'user_left',
    sessionId,
    userId,
    payload: {
      userId,
      remainingUsers: filtered.length,
    },
    timestamp: new Date().toISOString(),
  });
}

/**
 * Broadcast message to all users in a session
 */
export async function broadcastToSession(sessionId: string, message: WebSocketMessage): Promise<void> {
  const connections = sessionConnections.get(sessionId) || [];

  for (const connection of connections) {
    try {
      if (connection.socket.readyState === WebSocket.OPEN) {
        connection.socket.send(JSON.stringify(message));
      }
    } catch (error) {
      console.error(`Error sending message to ${connection.userId}:`, error);
    }
  }
}

/**
 * Send message to specific user
 */
export async function sendToUser(
  sessionId: string,
  userId: string,
  message: WebSocketMessage
): Promise<boolean> {
  const key = `${sessionId}:${userId}`;
  const connection = userConnections.get(key);

  if (!connection) {
    return false;
  }

  try {
    if (connection.socket.readyState === WebSocket.OPEN) {
      connection.socket.send(JSON.stringify(message));
      return true;
    }
  } catch (error) {
    console.error(`Error sending to user ${userId}:`, error);
  }

  return false;
}

/**
 * Broadcast to session except sender
 */
export async function broadcastToOthers(
  sessionId: string,
  fromUserId: string,
  message: WebSocketMessage
): Promise<void> {
  const connections = sessionConnections.get(sessionId) || [];

  for (const connection of connections) {
    if (connection.userId === fromUserId) continue; // Skip sender

    try {
      if (connection.socket.readyState === WebSocket.OPEN) {
        connection.socket.send(JSON.stringify(message));
      }
    } catch (error) {
      console.error(`Error sending message to ${connection.userId}:`, error);
    }
  }
}

/**
 * Update media state for a user
 */
export async function updateMediaState(
  sessionId: string,
  userId: string,
  audioEnabled?: boolean,
  videoEnabled?: boolean,
  screenSharing?: boolean
): Promise<void> {
  const key = `${sessionId}:${userId}`;
  const connection = userConnections.get(key);

  if (!connection) return;

  if (audioEnabled !== undefined) connection.mediaState.audioEnabled = audioEnabled;
  if (videoEnabled !== undefined) connection.mediaState.videoEnabled = videoEnabled;
  if (screenSharing !== undefined) connection.mediaState.screenSharing = screenSharing;

  // Broadcast state change
  await broadcastToSession(sessionId, {
    type: 'media_state_changed',
    sessionId,
    userId,
    payload: {
      userId,
      mediaState: connection.mediaState,
    },
    timestamp: new Date().toISOString(),
  });
}

/**
 * Get all users in a session with their media state
 */
export function getSessionUsers(sessionId: string): Array<{
  userId: string;
  userName: string;
  mediaState: any;
}> {
  const connections = sessionConnections.get(sessionId) || [];
  return connections.map((c) => ({
    userId: c.userId,
    userName: c.userName,
    mediaState: c.mediaState,
  }));
}

/**
 * Check if user is connected to session
 */
export function isUserConnected(sessionId: string, userId: string): boolean {
  const key = `${sessionId}:${userId}`;
  return userConnections.has(key);
}

/**
 * Get connection count for session
 */
export function getSessionConnectionCount(sessionId: string): number {
  return (sessionConnections.get(sessionId) || []).length;
}

/**
 * Heartbeat check - ping all connections
 */
export async function sendHeartbeat(): Promise<void> {
  const now = new Date();

  for (const [sessionId, connections] of sessionConnections.entries()) {
    for (const connection of connections) {
      try {
        if (connection.socket.readyState === WebSocket.OPEN) {
          const timeSinceLastBeat = now.getTime() - new Date(connection.lastHeartbeat).getTime();

          if (timeSinceLastBeat > 30000) {
            // 30 seconds since last heartbeat
            connection.socket.send(
              JSON.stringify({
                type: 'ping',
                sessionId,
                userId: connection.userId,
                payload: { timestamp: now.toISOString() },
                timestamp: now.toISOString(),
              })
            );
            connection.lastHeartbeat = now.toISOString();
          }
        }
      } catch (error) {
        console.error(`Heartbeat error for ${connection.userId}:`, error);
      }
    }
  }
}

/**
 * Clean up stale connections
 */
export function cleanupStaleConnections(): number {
  let cleaned = 0;
  const now = new Date().getTime();
  const timeout = 120000; // 2 minutes

  for (const [sessionId, connections] of sessionConnections.entries()) {
    const active = connections.filter((c) => {
      const timeSinceConnected = now - new Date(c.lastHeartbeat).getTime();
      if (timeSinceConnected > timeout) {
        try {
          c.socket.close();
        } catch (e) {
          // Already closed
        }
        cleaned++;
        return false;
      }
      return true;
    });

    if (active.length > 0) {
      sessionConnections.set(sessionId, active);
    } else {
      sessionConnections.delete(sessionId);
    }
  }

  return cleaned;
}

/**
 * Gracefully close all connections for a session
 */
export async function closeSessionConnections(sessionId: string): Promise<void> {
  const connections = sessionConnections.get(sessionId) || [];

  for (const connection of connections) {
    try {
      connection.socket.close(1000, 'Session ended');
    } catch (error) {
      console.error(`Error closing connection for ${connection.userId}:`, error);
    }
  }

  sessionConnections.delete(sessionId);
}

/**
 * Get session statistics
 */
export function getSessionStats(sessionId: string) {
  const connections = sessionConnections.get(sessionId) || [];

  const stats = {
    totalUsers: connections.length,
    usersWithAudio: connections.filter((c) => c.mediaState.audioEnabled).length,
    usersWithVideo: connections.filter((c) => c.mediaState.videoEnabled).length,
    screenShareActive: connections.some((c) => c.mediaState.screenSharing),
    users: connections.map((c) => ({
      userId: c.userId,
      userName: c.userName,
      connectedFor: Math.round((Date.now() - new Date(c.connectedAt).getTime()) / 1000),
      mediaState: c.mediaState,
    })),
  };

  return stats;
}
