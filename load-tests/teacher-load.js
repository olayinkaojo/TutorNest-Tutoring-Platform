import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

/**
 * Load Test: Teacher Dashboard & Classroom Operations
 * Tests teacher endpoints for dashboard, analytics, and classroom management
 * 
 * Run: k6 run load-tests/teacher-load.js
 */

const errorRate = new Rate('errors');
const apiDuration = new Trend('api_duration');
const classCreations = new Counter('class_creations');
const questionsCreated = new Counter('questions_created');
const analyticsQueries = new Counter('analytics_queries');

export const options = {
  stages: [
    { duration: '10s', target: 20 },  // Ramp up to 20 teachers
    { duration: '30s', target: 50 },  // Ramp up to 50 teachers
    { duration: '20s', target: 50 },  // Maintain
    { duration: '10s', target: 0 },   // Ramp down
  ],
  thresholds: {
    'http_req_duration': ['p(95)<1000', 'p(99)<2000'],
    'http_req_failed': ['rate<0.1'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:5173';
const API_URL = `${BASE_URL}/api`;

const teacherIds = [
  'teacher-1', 'teacher-2', 'teacher-3', 'teacher-4', 'teacher-5',
  'teacher-6', 'teacher-7', 'teacher-8', 'teacher-9', 'teacher-10',
];

export default function () {
  const teacherId = teacherIds[__VU % teacherIds.length];

  group('Teacher Dashboard', () => {
    // 1. Get dashboard overview
    const dashboardRes = http.get(
      `${API_URL}/teacher/dashboard`,
      {
        headers: {
          'X-User-Id': teacherId,
        },
      }
    );

    check(dashboardRes, {
      'Dashboard retrieved': (r) => r.status === 200,
      'Dashboard response time < 1s': (r) => r.timings.duration < 1000,
    }) || errorRate.add(1);

    apiDuration.add(dashboardRes.timings.duration);
  });

  group('Class Management', () => {
    // 2. Create class
    const classRes = http.post(
      `${API_URL}/teacher/classes`,
      JSON.stringify({
        name: `Load Test Class ${__VU}-${__ITER}`,
        subject: 'Mathematics',
        level: 'High School',
        description: 'Load test class',
      }),
      {
        headers: {
          'Content-Type': 'application/json',
          'X-User-Id': teacherId,
        },
      }
    );

    check(classRes, {
      'Class created': (r) => r.status === 200 || r.status === 201,
    }) || errorRate.add(1);

    if (classRes.status === 200 || classRes.status === 201) {
      const classData = classRes.json();
      classCreations.add(1);
      apiDuration.add(classRes.timings.duration);

      sleep(1);

      // 3. List classes
      const listRes = http.get(
        `${API_URL}/teacher/classes`,
        {
          headers: {
            'X-User-Id': teacherId,
          },
        }
      );

      check(listRes, {
        'Classes listed': (r) => r.status === 200,
      }) || errorRate.add(1);

      apiDuration.add(listRes.timings.duration);
    }
  });

  group('Question Bank', () => {
    // 4. Create question
    const questionRes = http.post(
      `${API_URL}/teacher/questions`,
      JSON.stringify({
        text: 'What is 2 + 2?',
        type: 'multiple-choice',
        options: [
          { text: '3', isCorrect: false },
          { text: '4', isCorrect: true },
          { text: '5', isCorrect: false },
        ],
        subject: 'Mathematics',
        difficulty: 'easy',
        tags: ['algebra', 'basic'],
      }),
      {
        headers: {
          'Content-Type': 'application/json',
          'X-User-Id': teacherId,
        },
      }
    );

    check(questionRes, {
      'Question created': (r) => r.status === 200 || r.status === 201,
      'Question response time < 500ms': (r) => r.timings.duration < 500,
    }) || errorRate.add(1);

    if (questionRes.status === 200 || questionRes.status === 201) {
      questionsCreated.add(1);
      apiDuration.add(questionRes.timings.duration);
    }

    sleep(0.5);

    // 5. Search questions
    const searchRes = http.get(
      `${API_URL}/teacher/questions?subject=Mathematics&difficulty=easy`,
      {
        headers: {
          'X-User-Id': teacherId,
        },
      }
    );

    check(searchRes, {
      'Questions searched': (r) => r.status === 200,
    }) || errorRate.add(1);

    apiDuration.add(searchRes.timings.duration);
  });

  group('Analytics & Reporting', () => {
    // 6. Get class analytics
    const analyticsRes = http.get(
      `${API_URL}/teacher/analytics/class-overview`,
      {
        headers: {
          'X-User-Id': teacherId,
        },
      }
    );

    check(analyticsRes, {
      'Analytics retrieved': (r) => r.status === 200,
      'Analytics response time < 2s': (r) => r.timings.duration < 2000,
    }) || errorRate.add(1);

    if (analyticsRes.status === 200) {
      analyticsQueries.add(1);
    }

    apiDuration.add(analyticsRes.timings.duration);

    sleep(1);

    // 7. Get student progress
    const progressRes = http.get(
      `${API_URL}/teacher/analytics/student-progress`,
      {
        headers: {
          'X-User-Id': teacherId,
        },
      }
    );

    check(progressRes, {
      'Progress data retrieved': (r) => r.status === 200,
    }) || errorRate.add(1);

    apiDuration.add(progressRes.timings.duration);
  });

  group('Session Management', () => {
    // 8. Get upcoming sessions
    const sessionsRes = http.get(
      `${API_URL}/teacher/sessions/upcoming?limit=10`,
      {
        headers: {
          'X-User-Id': teacherId,
        },
      }
    );

    check(sessionsRes, {
      'Sessions retrieved': (r) => r.status === 200,
    }) || errorRate.add(1);

    apiDuration.add(sessionsRes.timings.duration);
  });

  sleep(Math.random() * 3);
}
