# Load Testing Guide - TutorNest

## Overview

This directory contains load testing scenarios for TutorNest using k6, an open-source load testing tool. These tests simulate realistic user behavior under load to identify performance bottlenecks and validate system capacity.

## Installation

### Prerequisites
- Node.js 14+
- k6 installed locally

### Install k6

**macOS (via Homebrew):**
```bash
brew install k6
```

**Linux (Debian/Ubuntu):**
```bash
sudo apt-get update
sudo apt-get install k6
```

**Windows (via Chocolatey):**
```bash
choco install k6
```

**Docker:**
```bash
docker run -i grafana/k6:latest run - <script.js
```

**From Source:**
```bash
go install github.com/grafana/k6@latest
```

## Load Test Scenarios

### 1. Gamification API Load Test (`gamification-load.js`)

**Purpose:** Tests quiz, achievements, and leaderboard endpoints

**Simulation:**
- 50-100 concurrent users
- 60-70 seconds total duration
- Quiz completion flow

**Endpoints Tested:**
- POST `/api/quizzes/start` - Start a quiz
- POST `/api/quizzes/{id}/answer` - Submit quiz answer
- GET `/api/achievements` - Get user achievements
- GET `/api/leaderboard` - Get leaderboard
- GET `/api/users/stats` - Get user statistics

**Performance Targets:**
- P95 response time: < 500ms
- P99 response time: < 1000ms
- Error rate: < 10%

**Run:**
```bash
k6 run load-tests/gamification-load.js
k6 run -e BASE_URL=https://staging.tutornest.com load-tests/gamification-load.js
```

### 2. Video Conferencing Load Test (`video-load.js`)

**Purpose:** Tests video session creation and WebSocket real-time communication

**Simulation:**
- 30-50 concurrent video sessions
- WebSocket messaging (annotations, real-time updates)
- Screen sharing

**Endpoints Tested:**
- POST `/api/video/sessions` - Create video session
- GET `/api/video/sessions/{id}` - Get session details
- POST `/api/video/ice-servers` - Get WebRTC ICE servers
- POST `/api/video/screen-share/start` - Start screen share
- POST `/api/video/screen-share/stop` - Stop screen share
- WS `/ws/video/session/{id}` - WebSocket for real-time updates

**Performance Targets:**
- P95 response time: < 1000ms
- WebSocket connection success: 100%
- Error rate: < 10%

**Run:**
```bash
k6 run load-tests/video-load.js
```

### 3. Teacher Dashboard Load Test (`teacher-load.js`)

**Purpose:** Tests teacher endpoint load (dashboard, analytics, class management)

**Simulation:**
- 20-50 concurrent teachers
- Dashboard queries, class creation, question bank operations

**Endpoints Tested:**
- GET `/api/teacher/dashboard` - Teacher dashboard
- POST `/api/teacher/classes` - Create class
- GET `/api/teacher/classes` - List classes
- POST `/api/teacher/questions` - Create question
- GET `/api/teacher/questions` - Search questions
- GET `/api/teacher/analytics/class-overview` - Class analytics
- GET `/api/teacher/analytics/student-progress` - Student progress
- GET `/api/teacher/sessions/upcoming` - Upcoming sessions

**Performance Targets:**
- P95 response time: < 1000ms
- P99 response time: < 2000ms
- Error rate: < 10%

**Run:**
```bash
k6 run load-tests/teacher-load.js
```

### 4. Payment Processing Load Test (`payment-load.js`)

**Purpose:** Tests booking and payment processing endpoints

**Simulation:**
- 20-50 concurrent users booking sessions
- Payment card processing
- Booking management

**Endpoints Tested:**
- GET `/api/bookings/available-sessions` - Get available sessions
- POST `/api/bookings` - Create booking
- POST `/api/payments/process` - Process payment
- GET `/api/bookings/{id}` - Get booking details
- GET `/api/bookings/my-bookings` - List bookings
- POST `/api/bookings/cancel` - Cancel booking

**Performance Targets:**
- P95 response time: < 2000ms (payment slower due to external API)
- P99 response time: < 5000ms
- Error rate: < 5%
- Payment success rate: > 95%

**Run:**
```bash
k6 run load-tests/payment-load.js
```

## Running All Tests

Run the complete test suite:

```bash
# On local environment
bash load-tests/run-all.sh

# On staging environment
bash load-tests/run-all.sh https://staging.tutornest.com staging

# On production (careful!)
bash load-tests/run-all.sh https://api.tutornest.com production
```

## Running Individual Tests

```bash
# Basic run
k6 run load-tests/gamification-load.js

# With custom VUs and duration
k6 run --vus 100 --duration 30s load-tests/gamification-load.js

# With custom base URL
k6 run -e BASE_URL=https://staging.tutornest.com load-tests/gamification-load.js

# With output to file
k6 run --out json=results.json load-tests/gamification-load.js

# With different reporters
k6 run --out csv=results.csv load-tests/gamification-load.js
k6 run --out influxdb=http://localhost:8086 load-tests/gamification-load.js

# In cloud (requires k6 account)
k6 cloud load-tests/gamification-load.js
```

## Test Customization

### Modifying Load Profile

Edit the `stages` in the options object:

```javascript
export const options = {
  stages: [
    { duration: '10s', target: 50 },  // Ramp up to 50 users in 10s
    { duration: '30s', target: 100 }, // Ramp up to 100 users in 30s
    { duration: '20s', target: 100 }, // Stay at 100 users for 20s
    { duration: '10s', target: 0 },   // Ramp down to 0 in 10s
  ],
};
```

### Modifying Performance Thresholds

```javascript
thresholds: {
  'http_req_duration': [
    'p(95)<500',   // 95th percentile response time < 500ms
    'p(99)<1000',  // 99th percentile response time < 1000ms
  ],
  'http_req_failed': ['rate<0.1'],  // Error rate < 10%
  'errors': ['rate<0.05'],           // Custom error metric < 5%
},
```

If a threshold fails, k6 exit code will be non-zero (useful for CI/CD).

## Performance Baselines

### Expected Performance Metrics

**Gamification Tests:**
- Response time (P50): 150-200ms
- Response time (P95): 400-500ms
- Response time (P99): 800-1000ms
- Error rate: 0-2%
- Throughput: 500-800 req/s

**Video Conferencing Tests:**
- Session creation: 500-1000ms
- WebSocket connection: < 100ms
- Message latency: < 50ms
- Error rate: 0-1%
- Throughput: 100-200 connections/s

**Teacher Dashboard Tests:**
- Dashboard query: 300-800ms
- Analytics query: 800-2000ms
- Error rate: 1-3%
- Throughput: 200-400 req/s

**Payment Tests:**
- Session booking: 300-500ms
- Payment processing: 2000-5000ms (slow due to external processor)
- Error rate: 1-3%
- Payment success rate: > 95%

## Analyzing Results

### View Results in Real-Time

```bash
# HTML report (summary)
k6 run --out json=results.json load-tests/gamification-load.js
open results.json  # View in browser
```

### JSON Output Analysis

```bash
# Get metrics summary
jq '.metrics | keys' results.json

# Get response times
jq '.metrics.http_req_duration.values | {p95, p99}' results.json

# Get error rate
jq '.metrics.http_req_failed.values | .rate' results.json
```

### Cloud Dashboard

```bash
# Upload to k6 Cloud for visualization
k6 cloud results.json

# View at: https://app.k6.io/runs/YOUR_RUN_ID
```

## Common Issues & Solutions

### Issue: Connection refused
**Solution:** Ensure the application is running on the BASE_URL
```bash
# Check if server is running
curl -I http://localhost:5173
```

### Issue: High error rate
**Solution:** Reduce VUs or check server logs
```bash
# Run with fewer VUs
k6 run --vus 10 load-tests/gamification-load.js

# Check server logs
tail -f logs/server.log
```

### Issue: Timeout errors
**Solution:** Increase timeout or reduce load
```javascript
// In test file, increase timeout
const res = http.post(url, data, {
  timeout: '30s', // Default is 60s
});
```

### Issue: Memory issues
**Solution:** Run shorter tests or fewer iterations
```bash
k6 run --duration 30s --vus 50 load-tests/gamification-load.js
```

## Integration with CI/CD

### GitHub Actions Example

```yaml
name: Load Tests
on: [push]

jobs:
  load-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: grafana/setup-k6-action@v1
      
      - name: Run load tests
        run: |
          k6 run \
            -e BASE_URL=${{ secrets.STAGING_URL }} \
            --out json=results.json \
            load-tests/gamification-load.js
      
      - name: Upload results
        uses: actions/upload-artifact@v2
        with:
          name: k6-results
          path: results.json
```

## Best Practices

1. **Start small:** Begin with low VU counts and gradually increase
2. **Baseline first:** Run tests on your local environment first
3. **Monitor resources:** Watch CPU, memory, network during tests
4. **Test realistically:** Use realistic data and scenarios
5. **Automate:** Integrate into CI/CD pipeline
6. **Document:** Keep results and findings documented
7. **Iterate:** Fix issues and re-test
8. **Environment parity:** Test staging as close to production as possible

## Security Considerations

⚠️ **Be careful when running load tests:**

- **Never test production** without explicit permission
- **Use test accounts** for all test scenarios
- **Avoid sensitive data** in test scripts
- **Rate limit externally** to prevent accidental DoS
- **Monitor third-party APIs** (payment processors, etc.)
- **Keep credentials in environment variables**, not in code

## Advanced Topics

### Custom Metrics

```javascript
import { Counter, Gauge, Histogram, Rate, Trend } from 'k6/metrics';

// Define custom metrics
const quizzes = new Counter('quizzes_completed');
const activeUsers = new Gauge('active_users');
const loadTime = new Trend('page_load_time');
const errorRate = new Rate('errors');

// Record metrics
quizzes.add(1);
activeUsers.set(__VU);
loadTime.add(responseTime);
errorRate.add(isError);
```

### Parameterized Testing

```javascript
// Test with different parameters
export const scenarios = {
  lowLoad: {
    executor: 'constant-vus',
    vus: 10,
    duration: '10s',
  },
  rampUp: {
    executor: 'ramp-vus',
    startVUs: 0,
    stages: [
      { duration: '10s', target: 100 },
    ],
  },
};
```

### Database Load

To test database performance, create fixtures:

```javascript
// Setup: Create test data
export function setup() {
  const testData = createTestUsers(100);
  return testData;
}

// Main test loop uses setup data
export default function (data) {
  // Use data from setup
}

// Teardown: Clean up
export function teardown(data) {
  deleteTestData(data);
}
```

## Resources

- **k6 Documentation:** https://k6.io/docs/
- **API Reference:** https://k6.io/docs/javascript-api/
- **Community:** https://community.k6.io/
- **Examples:** https://github.com/grafana/k6/tree/master/samples

---

**Load Testing Status:** ✅ Ready for Testing

Run your first test:
```bash
k6 run load-tests/gamification-load.js
```
