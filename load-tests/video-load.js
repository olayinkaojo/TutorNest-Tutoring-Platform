import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';
import ws from 'k6/ws';

/**
 * Load Test: Video Conferencing & WebSocket
 * Tests video session creation and WebSocket real-time communication
 * 
 * Run: k6 run load-tests/video-load.js
 * 
 * Note: WebSocket tests simulate real-time messaging load
 */

const errorRate = new Rate('errors');
const apiDuration = new Trend('api_duration');
const videoSessions = new Counter('video_sessions');
const wsMessages = new Counter('ws_messages');

export const options = {
  stages: [
    { duration: '10s', target: 30 },  // Ramp up to 30 users (simulates 30 video sessions)
    { duration: '30s', target: 50 },  // Ramp up to 50 concurrent video sessions
    { duration: '20s', target: 50 },  // Maintain 50 concurrent
    { duration: '10s', target: 0 },   // Ramp down
  ],
  thresholds: {
    'http_req_duration': ['p(95)<1000', 'p(99)<2000'],
    'http_req_failed': ['rate<0.1'],
    'errors': ['rate<0.05'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:5173';
const API_URL = `${BASE_URL}/api`;
const WS_URL = `${BASE_URL}/ws`.replace('http', 'ws');

export default function () {
  group('Video Session Setup', () => {
    // 1. Create video session
    const sessionRes = http.post(
      `${API_URL}/video/sessions`,
      JSON.stringify({
        tutorId: 'tutor-123',
        studentIds: ['student-1', 'student-2'],
        duration: 3600, // 1 hour
        tier: 'premium',
      }),
      {
        headers: {
          'Content-Type': 'application/json',
          'X-User-Id': `tutor-${__VU}`,
        },
      }
    );

    check(sessionRes, {
      'Video session created': (r) => r.status === 200 || r.status === 201,
      'Session response time < 1s': (r) => r.timings.duration < 1000,
    }) || errorRate.add(1);

    if (sessionRes.status === 200 || sessionRes.status === 201) {
      const sessionData = sessionRes.json();
      videoSessions.add(1);

      apiDuration.add(sessionRes.timings.duration);

      sleep(1);

      // 2. Get session details
      const detailsRes = http.get(
        `${API_URL}/video/sessions/${sessionData.id}`,
        {
          headers: {
            'X-User-Id': `tutor-${__VU}`,
          },
        }
      );

      check(detailsRes, {
        'Session details retrieved': (r) => r.status === 200,
      }) || errorRate.add(1);

      apiDuration.add(detailsRes.timings.duration);
    }
  });

  group('WebRTC Signaling', () => {
    // 3. Get STUN/TURN servers
    const iceRes = http.post(
      `${API_URL}/video/ice-servers`,
      JSON.stringify({ sessionId: 'session-load-test' }),
      {
        headers: {
          'Content-Type': 'application/json',
          'X-User-Id': `user-${__VU}`,
        },
      }
    );

    check(iceRes, {
      'ICE servers retrieved': (r) => r.status === 200,
      'ICE response time < 500ms': (r) => r.timings.duration < 500,
    }) || errorRate.add(1);

    apiDuration.add(iceRes.timings.duration);
  });

  group('Screen Share', () => {
    // 4. Start screen share
    const screenRes = http.post(
      `${API_URL}/video/screen-share/start`,
      JSON.stringify({
        sessionId: 'session-load-test',
        resolution: '1280x720',
      }),
      {
        headers: {
          'Content-Type': 'application/json',
          'X-User-Id': `user-${__VU}`,
        },
      }
    );

    check(screenRes, {
      'Screen share started': (r) => r.status === 200,
    }) || errorRate.add(1);

    apiDuration.add(screenRes.timings.duration);

    sleep(2);

    // 5. Stop screen share
    const stopRes = http.post(
      `${API_URL}/video/screen-share/stop`,
      JSON.stringify({ sessionId: 'session-load-test' }),
      {
        headers: {
          'Content-Type': 'application/json',
          'X-User-Id': `user-${__VU}`,
        },
      }
    );

    check(stopRes, {
      'Screen share stopped': (r) => r.status === 200,
    }) || errorRate.add(1);
  });

  group('WebSocket Real-Time Communication', () => {
    // 6. WebSocket connection for real-time updates
    const url = `${WS_URL}/video/session/session-${__VU}`;

    const res = ws.connect(url, null, function (socket) {
      socket.on('open', () => {
        // Send annotation data
        for (let i = 0; i < 10; i++) {
          socket.send(JSON.stringify({
            type: 'annotation',
            x: Math.random() * 1920,
            y: Math.random() * 1080,
            color: '#000000',
          }));
          wsMessages.add(1);
          sleep(0.1);
        }
      });

      socket.on('message', () => {
        // Receive real-time updates
        wsMessages.add(1);
      });

      socket.on('close', () => {
        // Connection closed
      });

      // Keep connection open for 5 seconds
      socket.setTimeout(() => {
        socket.close();
      }, 5000);
    });

    check(res, {
      'WebSocket connection successful': (r) => r.status === 101, // WebSocket upgrade
    }) || errorRate.add(1);
  });

  sleep(Math.random() * 2);
}
