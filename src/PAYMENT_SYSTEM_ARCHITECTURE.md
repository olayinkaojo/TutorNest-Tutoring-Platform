# 🏗️ Payment System Architecture

## System Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         TUTORNEST PAYMENT SYSTEM                 │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────┐
│   1. USER       │
│   (Student/     │
│    Parent)      │
└────────┬────────┘
         │
         │ Browse tutors
         │ Select tutor
         ▼
┌─────────────────────────────────────────────────────────────────┐
│  2. PAYMENT PLANS PAGE                                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │ Trial Plan   │  │ Once Weekly  │  │ Twice Weekly │         │
│  │  ₦20,000     │  │  ₦260,000    │  │  ₦520,000    │         │
│  │  1 session   │  │  13 sessions │  │  26 sessions │         │
│  └──────────────┘  └──────────────┘  └──────────────┘         │
└────────┬────────────────────────────────────────────────────────┘
         │
         │ User clicks "Select Plan"
         ▼
┌─────────────────────────────────────────────────────────────────┐
│  3. BACKEND: Initialize Payment                                 │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│  POST /payments/initiate                                        │
│                                                                  │
│  ┌────────────────────────────────────────────┐                │
│  │ 1. Validate user authentication            │                │
│  │ 2. Verify tutor exists                     │                │
│  │ 3. Get payment plan details                │                │
│  │ 4. Generate unique payment reference       │                │
│  │ 5. Create payment record (status: pending) │                │
│  │ 6. Initialize Paystack payment             │                │
│  │ 7. Store Paystack authorization URL        │                │
│  │ 8. Return payment URL to frontend          │                │
│  └────────────────────────────────────────────┘                │
└────────┬────────────────────────────────────────────────────────┘
         │
         │ Redirect to Paystack
         ▼
┌─────────────────────────────────────────────────────────────────┐
│  4. PAYSTACK PAYMENT PAGE                                       │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│  🔒 Secure checkout hosted by Paystack                         │
│                                                                  │
│  ┌────────────────────────────────────┐                        │
│  │  Card Number: ____ ____ ____ ____  │                        │
│  │  Expiry: __ / __    CVV: ___       │                        │
│  │  PIN: ____                          │                        │
│  │                                     │                        │
│  │  [ Pay ₦260,000 ]                  │                        │
│  └────────────────────────────────────┘                        │
└────────┬────────────────────────────────────────────────────────┘
         │
         │ User completes payment
         │
         ├────────────────┬───────────────────────────┐
         ▼                ▼                           ▼
    User redirected   Webhook sent              Payment stored
    to success page   to backend                in Paystack
         │                │                           │
         ▼                ▼                           │
┌──────────────┐  ┌──────────────────┐              │
│  5. VERIFY   │  │  6. WEBHOOK      │              │
│     PAGE     │  │     HANDLER      │              │
└──────┬───────┘  └────────┬─────────┘              │
       │                   │                         │
       └───────────────────┴─────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│  7. BACKEND: Process Successful Payment                         │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│  GET /payments/verify/:reference                                │
│  POST /webhooks/paystack (backup)                               │
│                                                                  │
│  ┌────────────────────────────────────────────┐                │
│  │ 1. Verify with Paystack API                │                │
│  │ 2. Update payment status → 'paid'          │                │
│  │ 3. Calculate booking dates                 │                │
│  │    • Trial: 1 session                      │                │
│  │    • Once Weekly: 13 sessions (weekly)     │                │
│  │    • Twice Weekly: 26 sessions (Mon/Thu)   │                │
│  │ 4. Check tutor availability                │                │
│  │ 5. Create all booking records              │                │
│  │ 6. Block tutor time slots                  │                │
│  │ 7. Send confirmation email (optional)      │                │
│  │ 8. Return bookings to user                 │                │
│  └────────────────────────────────────────────┘                │
└────────┬────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────┐
│  8. SUCCESS PAGE                                                │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│  ✅ Payment Successful!                                         │
│                                                                  │
│  Your 13 Sessions:                                              │
│  ┌────────────────────────────────────┐                        │
│  │ 1. Mon, Jan 8, 2024  - 10:00 AM   │                        │
│  │ 2. Mon, Jan 15, 2024 - 10:00 AM   │                        │
│  │ 3. Mon, Jan 22, 2024 - 10:00 AM   │                        │
│  │ ...                                 │                        │
│  └────────────────────────────────────┘                        │
│                                                                  │
│  [ Go to Dashboard ]  [ View Bookings ]                        │
└─────────────────────────────────────────────────────────────────┘
```

---

## Database Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                        DATABASE SCHEMA                        │
└──────────────────────────────────────────────────────────────┘

┌─────────────────────┐
│  payment_plans      │
├─────────────────────┤
│ • id (PK)           │
│ • plan_type         │◄──────┐
│ • name              │       │
│ • price_naira       │       │
│ • sessions_count    │       │
│ • duration_weeks    │       │
│ • sessions_per_week │       │
└─────────────────────┘       │
                              │
                              │ FK: plan_id
                              │
┌─────────────────────┐       │
│  payments           │       │
├─────────────────────┤       │
│ • id (PK)           │───────┘
│ • user_id (FK)      │◄──────┐
│ • tutor_id (FK)     │       │
│ • plan_id (FK)      │       │
│ • amount_naira      │       │
│ • payment_reference │       │ FK: payment_id
│ • payment_status    │       │
│ • paystack_ref      │       │
│ • paid_at           │       │
└─────────────────────┘       │
                              │
                              │
┌─────────────────────┐       │
│  bookings           │       │
├─────────────────────┤       │
│ • id (PK)           │       │
│ • payment_id (FK)   │───────┘
│ • user_id (FK)      │
│ • tutor_id (FK)     │◄──────┐
│ • plan_id (FK)      │       │
│ • session_number    │       │
│ • scheduled_date    │       │
│ • scheduled_time    │       │
│ • booking_status    │       │
│ • subject           │       │
│ • duration_minutes  │       │
└─────────────────────┘       │
                              │
                              │ FK: tutor_id
                              │
┌─────────────────────┐       │
│ tutor_availability  │       │
├─────────────────────┤       │
│ • id (PK)           │       │
│ • tutor_id (FK)     │───────┘
│ • day_of_week       │
│ • start_time        │
│ • end_time          │
│ • is_available      │
└─────────────────────┘

┌─────────────────────┐
│ tutor_blocked_dates │
├─────────────────────┤
│ • id (PK)           │
│ • tutor_id (FK)     │───────┐
│ • blocked_date      │       │ Same tutor
│ • reason            │       │
└─────────────────────┘       │
                              │
┌─────────────────────┐       │
│  webhook_logs       │       │
├─────────────────────┤       │
│ • id (PK)           │       │
│ • event_type        │       │
│ • payment_reference │       │
│ • payload (JSONB)   │       │
│ • processed         │       │
└─────────────────────┘       │
```

---

## API Flow

### 1. Payment Initialization Flow

```
Frontend                          Backend                        Paystack
   │                                 │                              │
   │ POST /payments/initiate         │                              │
   │ {planType, tutorId}             │                              │
   ├────────────────────────────────►│                              │
   │                                 │                              │
   │                                 │ Validate user                │
   │                                 │ Validate tutor               │
   │                                 │ Get plan details             │
   │                                 │ Generate reference           │
   │                                 │ Create payment record        │
   │                                 │                              │
   │                                 │ POST /transaction/initialize │
   │                                 ├─────────────────────────────►│
   │                                 │                              │
   │                                 │ ◄────────────────────────────┤
   │                                 │ {authorization_url}          │
   │                                 │                              │
   │ ◄───────────────────────────────┤                              │
   │ {authorization_url, reference}  │                              │
   │                                 │                              │
   │ window.location.href = url      │                              │
   ├────────────────────────────────────────────────────────────────►
   │                                                                 │
   │                     User pays on Paystack                       │
   │                                                                 │
```

### 2. Payment Verification Flow

```
Paystack                          Backend                        Frontend
   │                                 │                              │
   │ POST /webhooks/paystack         │                              │
   │ {event: charge.success}         │                              │
   ├────────────────────────────────►│                              │
   │                                 │                              │
   │                                 │ Verify signature             │
   │                                 │ Log webhook event            │
   │                                 │ Update payment status        │
   │                                 │ Calculate booking dates      │
   │                                 │ Create bookings              │
   │                                 │                              │
   │ ◄───────────────────────────────┤                              │
   │ {status: 200}                   │                              │
   │                                 │                              │
   │                                 │                              │
   │                                 │ GET /payments/verify/:ref    │
   │                                 │ ◄────────────────────────────┤
   │                                 │                              │
   │                                 │ Verify with Paystack API     │
   │ GET /transaction/verify/:ref    │                              │
   │ ◄───────────────────────────────┤                              │
   │                                 │                              │
   ├────────────────────────────────►│                              │
   │ {status: success}               │                              │
   │                                 │                              │
   │                                 │ Return payment + bookings    │
   │                                 ├─────────────────────────────►│
   │                                 │                              │
   │                                 │         Show success page     │
```

---

## Security Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         SECURITY LAYERS                          │
└─────────────────────────────────────────────────────────────────┘

1. AUTHENTICATION
   ┌──────────────────────────────────┐
   │ JWT Token Validation             │
   │ • Every request requires token   │
   │ • Token verified on backend      │
   │ • Expired tokens rejected        │
   └──────────────────────────────────┘

2. AUTHORIZATION
   ┌──────────────────────────────────┐
   │ Row Level Security (RLS)         │
   │ • Users can only access own data │
   │ • Tutors can only see own slots  │
   │ • Admin has elevated access      │
   └──────────────────────────────────┘

3. PAYMENT VERIFICATION
   ┌──────────────────────────────────┐
   │ Backend-Only Verification        │
   │ • No client-side verification    │
   │ • Paystack API double-check      │
   │ • Amount validation              │
   └──────────────────────────────────┘

4. WEBHOOK SECURITY
   ┌──────────────────────────────────┐
   │ Signature Verification           │
   │ • HMAC SHA-512 signature         │
   │ • Secret key validation          │
   │ • Replay attack prevention       │
   └──────────────────────────────────┘

5. DATA PROTECTION
   ┌──────────────────────────────────┐
   │ Environment Variables            │
   │ • Keys stored in env vars        │
   │ • Never exposed to frontend      │
   │ • Encrypted at rest              │
   └──────────────────────────────────┘
```

---

## Booking Generation Logic

```
┌──────────────────────────────────────────────────────────────┐
│              BOOKING DATE CALCULATION                         │
└──────────────────────────────────────────────────────────────┘

TRIAL PLAN (1 session):
━━━━━━━━━━━━━━━━━━━━━━━━
Start Date: User's preferred date
Session 1: Start Date @ 10:00 AM


ONCE WEEKLY PLAN (13 sessions):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Start Date: User's preferred date (default: 7 days from now)
Increment: +7 days

Session 1:  Start Date       @ 10:00 AM
Session 2:  Start Date + 7d  @ 10:00 AM
Session 3:  Start Date + 14d @ 10:00 AM
...
Session 13: Start Date + 84d @ 10:00 AM


TWICE WEEKLY PLAN (26 sessions):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Start Date: User's preferred date (must be Monday)
Pattern: Monday → Thursday → Monday → Thursday

Session 1:  Monday @ 10:00 AM
Session 2:  Thursday (+3 days) @ 10:00 AM
Session 3:  Monday (+4 days) @ 10:00 AM
Session 4:  Thursday (+3 days) @ 10:00 AM
...
Session 26: Thursday @ 10:00 AM

Total Duration: 13 weeks
```

---

## Error Handling Strategy

```
┌──────────────────────────────────────────────────────────────┐
│                    ERROR HANDLING FLOW                        │
└──────────────────────────────────────────────────────────────┘

1. PAYMENT INITIALIZATION ERRORS
   ├─ Invalid plan type → 400 Bad Request
   ├─ Invalid tutor ID → 400 Bad Request
   ├─ User not authenticated → 401 Unauthorized
   ├─ Paystack API failure → 500 Internal Server Error
   └─ Database error → 500 Internal Server Error

2. PAYMENT VERIFICATION ERRORS
   ├─ Payment not found → 404 Not Found
   ├─ Already verified → 200 OK (idempotent)
   ├─ Paystack verification failed → 400 Bad Request
   ├─ Booking creation failed → 500 (payment still marked paid)
   └─ Webhook signature invalid → 401 Unauthorized

3. BOOKING CONFLICTS
   ├─ Tutor not available → Booking skipped, admin notified
   ├─ Date already booked → Unique constraint prevents
   └─ Tutor blocked date → Skip that date, use next available

4. FRONTEND ERROR HANDLING
   ├─ Network error → Toast error, retry button
   ├─ Payment failed → Redirect to failure page, contact support
   ├─ Timeout → Show "Still processing..." message
   └─ Unknown error → Generic error message, log to console
```

---

## Deployment Checklist

```
✅ BACKEND
   ├─ Database schema deployed
   ├─ Edge functions deployed
   ├─ Environment variables set
   ├─ RLS policies enabled
   └─ Webhook endpoint configured

✅ FRONTEND  
   ├─ Payment components integrated
   ├─ Routes configured
   ├─ API endpoints updated
   └─ Error handling tested

✅ PAYSTACK
   ├─ Account created
   ├─ Webhook URL configured
   ├─ Test payments successful
   └─ Live keys ready for production

✅ TESTING
   ├─ All 3 plans tested
   ├─ Payment flow verified
   ├─ Bookings created correctly
   ├─ Webhook events logged
   └─ Error scenarios handled
```

This architecture provides a **production-ready, secure, and scalable payment system** for your tutoring platform! 🚀
