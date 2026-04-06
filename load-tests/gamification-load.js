import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

/**
 * Load Test: Gamification API Endpoints
 * Tests trivia, achievements, and leaderboard endpoints under load
 * 
 * Run: k6 run load-tests/gamification-load.js
 * 
 * Options:
 *   --vus 100         (100 virtual users)
 *   --duration 30s    (30 second test)
 *   --rps 1000        (rate limit to 1000 requests/sec)
 */

// Custom metrics
const errorRate = new Rate('errors');
const apiDuration = new Trend('api_duration');
const quizCompletions = new Counter('quiz_completions');
const achievementUnlocks = new Counter('achievement_unlocks');

// Test configuration
export const options = {
  stages: [
    { duration: '10s', target: 50 },  // Ramp up to 50 users
    { duration: '30s', target: 100 }, // Ramp up to 100 users
    { duration: '20s', target: 100 }, // Stay at 100 users
    { duration: '10s', target: 0 },   // Ramp down to 0 users
  ],
  thresholds: {
    'http_req_duration': ['p(95)<500', 'p(99)<1000'], // 95th percentile < 500ms, 99th < 1s
    'http_req_failed': ['rate<0.1'],                    // Error rate < 10%
    'errors': ['rate<0.05'],                             // Custom error rate < 5%
  },
};

// Base URL - change to staging URL
const BASE_URL = __ENV.BASE_URL || 'http://localhost:5173';
const API_URL = `${BASE_URL}/api`;

export default function () {
  group('Gamification - Trivia Flow', () => {
    // 1. Start Quiz
    const quizRes = http.post(`${API_URL}/quizzes/start`, JSON.stringify({
      topicId: 'math-101',
      difficulty: 'medium',
      questionCount: 10,
    }), {
      headers: {
        'Content-Type': 'application/json',
        'X-User-Id': `user-${__VU}-${__ITER}`,
      },
    });

    check(quizRes, {
      'Quiz started': (r) => r.status === 200,
      'Quiz response time < 500ms': (r) => r.timings.duration < 500,
    }) || errorRate.add(1);

    if (quizRes.status === 200) {
      const quizData = quizRes.json();
      quizCompletions.add(1);

      sleep(1); // Simulate user thinking time

      // 2. Submit Quiz Answer
      const answerRes = http.post(
        `${API_URL}/quizzes/${quizData.id}/answer`,
        JSON.stringify({
          questionId: quizData.questions[0].id,
          answer: 'A',
          timeSpent: 5000,
        }),
        {
          headers: {
            'Content-Type': 'application/json',
            'X-User-Id': `user-${__VU}-${__ITER}`,
          },
        }
      );

      check(answerRes, {
        'Answer submitted': (r) => r.status === 200,
      }) || errorRate.add(1);

      apiDuration.add(answerRes.timings.duration);
    }
  });

  group('Achievements & Leaderboard', () => {
    // 3. Get Achievements
    const achievementsRes = http.get(
      `${API_URL}/achievements`,
      {
        headers: {
          'X-User-Id': `user-${__VU}-${__ITER}`,
        },
      }
    );

    check(achievementsRes, {
      'Achievements retrieved': (r) => r.status === 200,
      'Achievements response time < 200ms': (r) => r.timings.duration < 200,
    }) || errorRate.add(1);

    if (achievementsRes.status === 200) {
      const achievements = achievementsRes.json();
      achievementUnlocks.add(achievements.unlockedCount || 0);
    }

    apiDuration.add(achievementsRes.timings.duration);

    // 4. Get Leaderboard
    const leaderboardRes = http.get(
      `${API_URL}/leaderboard?limit=100`,
      {
        headers: {
          'X-User-Id': `user-${__VU}-${__ITER}`,
        },
      }
    );

    check(leaderboardRes, {
      'Leaderboard retrieved': (r) => r.status === 200,
      'Leaderboard response time < 1s': (r) => r.timings.duration < 1000,
    }) || errorRate.add(1);

    apiDuration.add(leaderboardRes.timings.duration);
  });

  group('User Progress', () => {
    // 5. Get User Stats
    const statsRes = http.get(
      `${API_URL}/users/stats`,
      {
        headers: {
          'X-User-Id': `user-${__VU}-${__ITER}`,
        },
      }
    );

    check(statsRes, {
      'User stats retrieved': (r) => r.status === 200,
    }) || errorRate.add(1);

    apiDuration.add(statsRes.timings.duration);
  });

  sleep(Math.random() * 3); // Random sleep between iterations
}
