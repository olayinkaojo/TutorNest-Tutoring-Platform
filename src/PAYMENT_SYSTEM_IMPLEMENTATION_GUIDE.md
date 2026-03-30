# 🎓 TutorNest Payment System - Complete Implementation Guide

## 📋 Overview

This is a **production-ready payment system** for TutorNest with:
- ✅ 3 payment plans (Trial, Once Weekly, Twice Weekly)
- ✅ Paystack integration with webhook support
- ✅ Automatic booking generation
- ✅ Backend payment verification
- ✅ Tutor availability blocking
- ✅ Complete audit trail

---

## 🗄️ Part 1: Database Setup

### Step 1: Run the SQL Schema

1. Go to your **Supabase Dashboard** → Your Project
2. Click **SQL Editor** in the left sidebar
3. Click **New Query**
4. Copy the entire contents of `/DATABASE_SCHEMA_PAYMENTS.sql`
5. Paste and click **Run**

This creates:
- `payment_plans` - Stores the 3 plan types
- `payments` - Tracks all payments
- `bookings` - Individual tutoring sessions
- `tutor_availability` - Tutor schedule
- `tutor_blocked_dates` - Specific unavailable dates
- `webhook_logs` - Paystack webhook events

### Step 2: Verify Tables Created

Run this query to verify:

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('payment_plans', 'payments', 'bookings', 'tutor_availability', 'tutor_blocked_dates', 'webhook_logs');
```

You should see all 6 tables.

---

## 🔧 Part 2: Backend Setup

### Step 1: Backend Routes Already Integrated

The payment system routes are already added to your server:
- ✅ `/supabase/functions/server/payment-plans-routes.tsx` created
- ✅ Registered in `/supabase/functions/server/index.tsx`

### Step 2: Environment Variables

Ensure these are set in your **Supabase Dashboard** → Settings → Edge Functions → Environment Variables:

```bash
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
PAYSTACK_SECRET_KEY=sk_test_your_paystack_secret_key
FRONTEND_URL=https://your-vercel-app.vercel.app
```

**IMPORTANT:** Replace `FRONTEND_URL` with your actual Vercel deployment URL.

### Step 3: Deploy to Supabase

Since your backend is Supabase Edge Functions, you need to deploy them:

```bash
# Install Supabase CLI if you haven't
npm install -g supabase

# Login to Supabase
supabase login

# Link to your project
supabase link --project-ref your-project-ref

# Deploy the functions
supabase functions deploy make-server-cbd74580
```

---

## 🎨 Part 3: Frontend Setup

### Step 1: Add Routes to Your App

In your `/routes.ts` or routing file, add these routes:

```typescript
import PaymentPlansPage from './components/PaymentPlansPage';
import PaymentVerificationPage from './components/PaymentVerificationPage';

// Add these routes:
{
  path: '/payment/plans/:tutorId',
  element: <PaymentPlansPage />,
},
{
  path: '/payment/verify',
  element: <PaymentVerificationPage />,
}
```

### Step 2: Integrate into Tutor Profile

In your tutor profile/search page, add a "Book Sessions" button:

```tsx
import { useNavigate } from 'react-router';

const navigate = useNavigate();

// In your component:
<Button 
  onClick={() => navigate(`/payment/plans/${tutor.id}`, {
    state: { 
      tutorName: tutor.name,
      subject: selectedSubject 
    }
  })}
>
  Book Sessions
</Button>
```

### Step 3: Update PaymentPlansPage Props

Modify `/components/PaymentPlansPage.tsx` to accept route params:

```tsx
import { useParams, useLocation } from 'react-router';

export function PaymentPlansPage() {
  const { tutorId } = useParams();
  const location = useLocation();
  const tutorName = location.state?.tutorName || 'Tutor';
  const subject = location.state?.subject;

  // Rest of component...
}
```

---

## 🔐 Part 4: Paystack Configuration

### Step 1: Get Paystack Keys

1. Go to https://dashboard.paystack.com
2. Sign up / Log in
3. Go to **Settings** → **API Keys & Webhooks**
4. Copy your **Secret Key** (starts with `sk_test_` for testing)

### Step 2: Set Up Webhook

1. In Paystack Dashboard → **Settings** → **API Keys & Webhooks**
2. Scroll to **Webhook URL**
3. Enter: `https://your-project-id.supabase.co/functions/v1/make-server-cbd74580/webhooks/paystack`
4. Click **Save**

### Step 3: Test with Test Cards

Paystack provides test cards:

| Card Number | CVV | Expiry | PIN | Result |
|-------------|-----|--------|-----|--------|
| 408 408 408 408 408 1 | 408 | Any future | 0000 | Success |
| 507 850 785 073 076 0 | 081 | Any future | 0000 | Failure |

---

## 🚀 Part 5: Testing the Complete Flow

### Test 1: Payment Plans Display

1. Navigate to any tutor profile
2. Click "Book Sessions"
3. Verify you see 3 plans:
   - Trial Plan: ₦20,000
   - Once Weekly: ₦260,000
   - Twice Weekly: ₦520,000

### Test 2: Payment Initialization

1. Select a plan (try Trial first)
2. Click "Select Plan"
3. Should redirect to Paystack payment page
4. URL should be `https://checkout.paystack.com/...`

### Test 3: Complete Payment

1. On Paystack page, use test card: `4084084084084081`
2. Enter:
   - CVV: `408`
   - Expiry: `12/25` (any future date)
   - PIN: `0000`
3. Submit payment
4. Should redirect to `/payment/verify?reference=TNP-...`

### Test 4: Verify Bookings Created

1. After successful payment, should see booking summary
2. For Trial: 1 session scheduled
3. For Once Weekly: 13 sessions scheduled
4. For Twice Weekly: 26 sessions scheduled

### Test 5: Check Database

```sql
-- Check payment was created
SELECT * FROM payments ORDER BY created_at DESC LIMIT 5;

-- Check bookings were created
SELECT * FROM bookings ORDER BY created_at DESC LIMIT 10;

-- Check webhook was received
SELECT * FROM webhook_logs ORDER BY created_at DESC LIMIT 5;
```

---

## 📊 Part 6: API Endpoints Reference

### Frontend → Backend API Calls

#### 1. Get Payment Plans
```typescript
GET /make-server-cbd74580/payments/plans
Headers: Authorization: Bearer {publicAnonKey}
Response: { plans: PaymentPlan[] }
```

#### 2. Initialize Payment
```typescript
POST /make-server-cbd74580/payments/initiate
Headers: 
  - Authorization: Bearer {userAccessToken}
  - Content-Type: application/json
Body: {
  planType: 'trial' | 'once_weekly' | 'twice_weekly',
  tutorId: string,
  preferredStartDate?: string,
  preferredTime?: string,
  subject?: string
}
Response: {
  success: true,
  payment_id: string,
  reference: string,
  authorization_url: string,
  access_code: string
}
```

#### 3. Verify Payment
```typescript
GET /make-server-cbd74580/payments/verify/{reference}
Headers: Authorization: Bearer {userAccessToken}
Response: {
  success: boolean,
  payment: Payment,
  bookings: Booking[],
  message: string
}
```

#### 4. Get My Payments
```typescript
GET /make-server-cbd74580/payments/my-payments
Headers: Authorization: Bearer {userAccessToken}
Response: { payments: Payment[] }
```

#### 5. Get My Bookings
```typescript
GET /make-server-cbd74580/payments/my-bookings
Headers: Authorization: Bearer {userAccessToken}
Response: { bookings: Booking[] }
```

#### 6. Paystack Webhook (Automatic)
```typescript
POST /make-server-cbd74580/webhooks/paystack
Headers: x-paystack-signature: {signature}
Body: Paystack event payload
```

---

## 🔒 Part 7: Security Checklist

- ✅ Payment verification happens on backend only
- ✅ Paystack secret key never exposed to frontend
- ✅ JWT token validation for all endpoints
- ✅ Webhook signature verification
- ✅ RLS policies on all tables
- ✅ Amount validation against plan prices
- ✅ Duplicate payment prevention
- ✅ User can only access own payments/bookings

---

## 🐛 Part 8: Troubleshooting

### Problem: "Failed to initialize payment"
**Solution:**
1. Check `PAYSTACK_SECRET_KEY` is set in Supabase Edge Functions
2. Verify user is authenticated (access token exists)
3. Check tutor ID is valid

### Problem: Payment successful but bookings not created
**Solution:**
1. Check webhook is configured in Paystack
2. View webhook logs: `SELECT * FROM webhook_logs`
3. Check for errors in Supabase logs

### Problem: "Unauthorized" error
**Solution:**
1. Ensure user is logged in
2. Check access token is being sent in Authorization header
3. Verify token hasn't expired

### Problem: Double bookings on same date/time
**Solution:**
1. Check `unique_tutor_datetime` constraint exists
2. Verify tutor availability before booking
3. Use `is_tutor_available()` function

---

## 📈 Part 9: Monitoring & Analytics

### Key Metrics to Track

```sql
-- Total revenue
SELECT SUM(amount_naira) as total_revenue
FROM payments
WHERE payment_status = 'paid';

-- Most popular plan
SELECT 
  pp.name,
  COUNT(*) as bookings
FROM payments p
JOIN payment_plans pp ON p.plan_id = pp.id
WHERE p.payment_status = 'paid'
GROUP BY pp.name
ORDER BY bookings DESC;

-- Completed sessions
SELECT COUNT(*) as completed_sessions
FROM bookings
WHERE booking_status = 'completed';

-- Conversion rate
SELECT 
  COUNT(CASE WHEN payment_status = 'paid' THEN 1 END) * 100.0 / COUNT(*) as conversion_rate
FROM payments;
```

---

## 🎯 Part 10: Next Steps

### Enhancements You Can Add

1. **Promo Codes**
   - Add `coupon_code` to payment initialization
   - Validate and apply discounts

2. **Refund System**
   - Create refund endpoint
   - Update payment status to 'refunded'
   - Cancel associated bookings

3. **Rescheduling**
   - Allow students to reschedule bookings
   - Check tutor availability
   - Update `scheduled_date` and `scheduled_time`

4. **Recurring Plans**
   - Auto-renew subscriptions after 13 weeks
   - Send renewal reminders

5. **Session Reminders**
   - Send email/SMS 24 hours before
   - Send 1-hour before reminder

6. **Tutor Payouts**
   - Track sessions completed
   - Calculate tutor earnings (80% split)
   - Process bulk payouts

---

## 📞 Part 11: Support & Resources

### Paystack Documentation
- API Docs: https://paystack.com/docs/api/
- Test Cards: https://paystack.com/docs/payments/test-payments/
- Webhooks: https://paystack.com/docs/payments/webhooks/

### Supabase Documentation
- Edge Functions: https://supabase.com/docs/guides/functions
- Database: https://supabase.com/docs/guides/database
- Auth: https://supabase.com/docs/guides/auth

### Common Questions

**Q: Can I use this in production?**
A: Yes! Just replace test Paystack keys with live keys.

**Q: How do I handle failed payments?**
A: Failed payments are logged. Webhooks mark them as 'failed'. You can retry or contact user.

**Q: What if webhook fails?**
A: Users can manually verify on `/payment/verify` page. Webhook is backup.

**Q: Can I customize session times?**
A: Yes! Modify `calculateBookingDates()` function in payment-plans-routes.tsx.

---

## ✅ Final Checklist

Before going live:

- [ ] Database schema deployed
- [ ] Backend routes deployed to Supabase
- [ ] Environment variables configured
- [ ] Frontend components integrated
- [ ] Paystack webhook configured
- [ ] Test payment flow completed
- [ ] Bookings verified in database
- [ ] Webhook events logged
- [ ] Error handling tested
- [ ] Security audit passed
- [ ] Live Paystack keys configured
- [ ] Production URL set in Paystack webhook
- [ ] User journey documented
- [ ] Support team trained

---

## 🎉 Congratulations!

You now have a complete, production-ready payment system with:
- ✅ Secure payment processing
- ✅ Automatic booking generation
- ✅ Webhook event handling
- ✅ Complete audit trail
- ✅ User-friendly UI

**Your tutoring platform is ready to accept payments!** 🚀

---

**Need Help?** Check the troubleshooting section or review the code comments in the implementation files.
