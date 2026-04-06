import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

/**
 * Load Test: Payment Processing & Booking
 * Tests session booking with payment processing under load
 * 
 * Run: k6 run load-tests/payment-load.js
 */

const errorRate = new Rate('errors');
const apiDuration = new Trend('api_duration');
const bookingsCreated = new Counter('bookings_created');
const paymentsProcessed = new Counter('payments_processed');
const paymentFailures = new Counter('payment_failures');

export const options = {
  stages: [
    { duration: '10s', target: 20 },  // Ramp up to 20 users
    { duration: '30s', target: 50 },  // Ramp up to 50 users
    { duration: '20s', target: 50 },  // Maintain
    { duration: '10s', target: 0 },   // Ramp down
  ],
  thresholds: {
    'http_req_duration': ['p(95)<2000', 'p(99)<5000'],
    'http_req_failed': ['rate<0.05'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:5173';
const API_URL = `${BASE_URL}/api`;

// Test payment cards (use Stripe test cards)
const testCards = [
  { number: '4242424242424242', exp: '12/25', cvc: '123', zip: '12345' }, // Success
  { number: '4000000000000002', exp: '12/25', cvc: '123', zip: '12345' }, // Decline
  { number: '4000002500003155', exp: '12/25', cvc: '123', zip: '12345' }, // Requires auth
];

export default function () {
  const studentId = `student-${__VU}`;
  const tutorId = 'tutor-123';

  group('Session Booking', () => {
    // 1. Get available sessions
    const availableRes = http.get(
      `${API_URL}/bookings/available-sessions?tutorId=${tutorId}&startDate=2024-01-01&endDate=2024-01-31`,
      {
        headers: {
          'X-User-Id': studentId,
        },
      }
    );

    check(availableRes, {
      'Available sessions retrieved': (r) => r.status === 200,
      'Response time < 1s': (r) => r.timings.duration < 1000,
    }) || errorRate.add(1);

    apiDuration.add(availableRes.timings.duration);

    if (availableRes.status === 200) {
      const sessions = availableRes.json();

      if (sessions && sessions.length > 0) {
        const selectedSession = sessions[0];
        sleep(1);

        // 2. Create booking
        const bookingRes = http.post(
          `${API_URL}/bookings`,
          JSON.stringify({
            sessionId: selectedSession.id,
            studentId: studentId,
            tier: 'standard', // Can be: basic, standard, premium
            notes: 'Load test booking',
          }),
          {
            headers: {
              'Content-Type': 'application/json',
              'X-User-Id': studentId,
            },
          }
        );

        check(bookingRes, {
          'Booking created': (r) => r.status === 200 || r.status === 201,
        }) || errorRate.add(1);

        if (bookingRes.status === 200 || bookingRes.status === 201) {
          const bookingData = bookingRes.json();
          bookingsCreated.add(1);
          apiDuration.add(bookingRes.timings.duration);

          sleep(1);

          // 3. Process payment
          const cardIndex = __ITER % testCards.length;
          const testCard = testCards[cardIndex];

          const paymentRes = http.post(
            `${API_URL}/payments/process`,
            JSON.stringify({
              bookingId: bookingData.id,
              amount: 50.00, // Tier-based pricing
              currency: 'USD',
              paymentMethod: {
                type: 'card',
                card: {
                  number: testCard.number,
                  exp_month: 12,
                  exp_year: 2025,
                  cvc: testCard.cvc,
                  zip: testCard.zip,
                },
              },
            }),
            {
              headers: {
                'Content-Type': 'application/json',
                'X-User-Id': studentId,
              },
            }
          );

          check(paymentRes, {
            'Payment processed': (r) => r.status === 200 || r.status === 201,
            'Payment response time < 3s': (r) => r.timings.duration < 3000,
          }) || errorRate.add(1);

          if (paymentRes.status === 200 || paymentRes.status === 201) {
            paymentsProcessed.add(1);
          } else {
            paymentFailures.add(1);
          }

          apiDuration.add(paymentRes.timings.duration);

          // 4. Get booking details
          const detailsRes = http.get(
            `${API_URL}/bookings/${bookingData.id}`,
            {
              headers: {
                'X-User-Id': studentId,
              },
            }
          );

          check(detailsRes, {
            'Booking details retrieved': (r) => r.status === 200,
          }) || errorRate.add(1);

          apiDuration.add(detailsRes.timings.duration);
        }
      }
    }
  });

  group('Booking Management', () => {
    // 5. List user bookings
    const listRes = http.get(
      `${API_URL}/bookings/my-bookings`,
      {
        headers: {
          'X-User-Id': studentId,
        },
      }
    );

    check(listRes, {
      'Bookings listed': (r) => r.status === 200,
    }) || errorRate.add(1);

    apiDuration.add(listRes.timings.duration);

    sleep(2);

    // 6. Cancel booking (optional)
    if (Math.random() > 0.8) {
      const cancelRes = http.post(
        `${API_URL}/bookings/cancel`,
        JSON.stringify({
          bookingId: `booking-${__VU}-${__ITER}`,
          reason: 'Schedule conflict',
        }),
        {
          headers: {
            'Content-Type': 'application/json',
            'X-User-Id': studentId,
          },
        }
      );

      check(cancelRes, {
        'Booking cancelled or not found': (r) => r.status === 200 || r.status === 404,
      });

      apiDuration.add(cancelRes.timings.duration);
    }
  });

  sleep(Math.random() * 3);
}
