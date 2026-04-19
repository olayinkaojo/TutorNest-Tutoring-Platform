import { useEffect, useRef, useCallback } from 'react';

interface WebSocketMessage {
  type: string;
  data: unknown;
  timestamp: string;
}

interface UseWebSocketOptions {
  url: string;
  onMessage?: (message: WebSocketMessage) => void;
  onError?: (error: Event) => void;
  onOpen?: () => void;
  onClose?: () => void;
  reconnectAttempts?: number;
  reconnectDelay?: number;
  autoConnect?: boolean;
}

/**
 * Custom hook for WebSocket connections with automatic reconnection
 */
export function useWebSocket({
  url,
  onMessage,
  onError,
  onOpen,
  onClose,
  reconnectAttempts = 5,
  reconnectDelay = 1000,
  autoConnect = true,
}: UseWebSocketOptions) {
  const ws = useRef<WebSocket | null>(null);
  const reconnectCount = useRef(0);
  const reconnectTimeoutId = useRef<NodeJS.Timeout | null>(null);
  const isIntentionallyClosed = useRef(false);

  const connect = useCallback(() => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      return; // Already connected
    }

    try {
      ws.current = new WebSocket(url);

      ws.current.onopen = () => {
        console.log('WebSocket connected:', url);
        reconnectCount.current = 0;
        onOpen?.();
      };

      ws.current.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          onMessage?.(message);
        } catch (err) {
          console.error('Failed to parse WebSocket message:', err);
        }
      };

      ws.current.onerror = (error) => {
        console.error('WebSocket error:', error);
        onError?.(error);
      };

      ws.current.onclose = () => {
        console.log('WebSocket closed');
        onClose?.();

        // Attempt to reconnect if not intentionally closed
        if (!isIntentionallyClosed.current && reconnectCount.current < reconnectAttempts) {
          reconnectCount.current++;
          const delay = reconnectDelay * reconnectCount.current;
          console.log(`Attempting to reconnect in ${delay}ms (attempt ${reconnectCount.current}/${reconnectAttempts})`);

          reconnectTimeoutId.current = setTimeout(() => {
            connect();
          }, delay);
        }
      };
    } catch (err) {
      console.error('Failed to create WebSocket:', err);
      onError?.(new Event('connection-error'));
    }
  }, [url, onMessage, onError, onOpen, onClose, reconnectAttempts, reconnectDelay]);

  const disconnect = useCallback(() => {
    isIntentionallyClosed.current = true;
    if (reconnectTimeoutId.current) {
      clearTimeout(reconnectTimeoutId.current);
    }
    if (ws.current) {
      ws.current.close();
      ws.current = null;
    }
  }, []);

  const send = useCallback((type: string, data: unknown) => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      const message: WebSocketMessage = {
        type,
        data,
        timestamp: new Date().toISOString(),
      };
      ws.current.send(JSON.stringify(message));
    } else {
      console.warn('WebSocket is not connected. Cannot send message:', type);
    }
  }, []);

  const isConnected = ws.current?.readyState === WebSocket.OPEN;

  useEffect(() => {
    if (autoConnect) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [autoConnect, connect, disconnect, url]);

  return {
    connect,
    disconnect,
    send,
    isConnected,
    ws: ws.current,
  };
}

/**
 * WebSocket event types for real-time updates
 */
export const WebSocketEvents = {
  // Booking events
  BOOKING_CREATED: 'booking:created',
  BOOKING_CONFIRMED: 'booking:confirmed',
  BOOKING_CANCELLED: 'booking:cancelled',
  BOOKING_UPDATED: 'booking:updated',

  // Report events
  REPORT_SUBMITTED: 'report:submitted',
  REPORT_UPDATED: 'report:updated',

  // Payment events
  PAYMENT_COMPLETED: 'payment:completed',
  PAYMENT_FAILED: 'payment:failed',

  // Session events
  SESSION_STARTED: 'session:started',
  SESSION_ENDED: 'session:ended',

  // Notification events
  NOTIFICATION: 'notification',
};

/**
 * Hook for real-time bookings updates
 */
export function useRealtimeBookings(
  studentId: string,
  accessToken: string,
  onUpdate: (type: string, data: unknown) => void
) {
  const wsUrl = `wss://api.tutornest.local/bookings/${studentId}?token=${accessToken}`;

  const { isConnected } = useWebSocket({
    url: wsUrl,
    onMessage: (message) => {
      if (message.type.startsWith('booking:')) {
        onUpdate(message.type, message.data);
      }
    },
    autoConnect: !!studentId && !!accessToken,
  });

  return { isConnected };
}

/**
 * Hook for real-time report updates
 */
export function useRealtimeReports(
  parentId: string,
  accessToken: string,
  onUpdate: (type: string, data: unknown) => void
) {
  const wsUrl = `wss://api.tutornest.local/reports/${parentId}?token=${accessToken}`;

  const { isConnected } = useWebSocket({
    url: wsUrl,
    onMessage: (message) => {
      if (message.type.startsWith('report:')) {
        onUpdate(message.type, message.data);
      }
    },
    autoConnect: !!parentId && !!accessToken,
  });

  return { isConnected };
}
