# 🚀 Payment System - Quick Reference Card

## 📋 15-Minute Setup Checklist

### ✅ Step 1: Database (2 min)
```bash
1. Open Supabase Dashboard → SQL Editor
2. Copy contents of /DATABASE_SCHEMA_PAYMENTS.sql
3. Paste and click "Run"
4. Verify: SELECT * FROM payment_plans;
```

### ✅ Step 2: Environment Variables (2 min)
```bash
Supabase Dashboard → Settings → Edge Functions → Environment Variables

Add:
- PAYSTACK_SECRET_KEY = sk_test_your_key
- FRONTEND_URL = https://your-app.vercel.app
```

### ✅ Step 3: Paystack Webhook (2 min)
```bash
1. Login to dashboard.paystack.com
2. Settings → API Keys & Webhooks
3. Webhook URL = https://YOUR_PROJECT.supabase.co/functions/v1/make-server-cbd74580/webhooks/paystack
4. Save
```

### ✅ Step 4: Frontend Routes (4 min)
```typescript
// Add to your routes.ts or App.tsx

import PaymentPlansPage from './components/PaymentPlansPage';
import PaymentVerificationPage from './components/PaymentVerificationPage';

{
  path: '/payment/plans/:tutorId',
  element: <PaymentPlansPage />
},
{
  path: '/payment/verify',
  element: <PaymentVerificationPage />
}
```

### ✅ Step 5: Add Book Button (3 min)
```tsx
// In your TutorProfile or TutorSearch component

import { useNavigate } from 'react-router';

const navigate = useNavigate();

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

### ✅ Step 6: Test (2 min)
```bash
1. Go to any tutor profile
2. Click "Book Sessions"
3. Select "Trial Plan"
4. Card: 4084 0840 8408 4081
5. CVV: 408, PIN: 0000
6. Verify booking created
```

---

## 🎯 Payment Plans

| Plan | Price | Sessions | Duration | Per Session |
|------|-------|----------|----------|-------------|
| **Trial** | ₦20,000 | 1 | 1 week | ₦20,000 |
| **Once Weekly** | ₦260,000 | 13 | 13 weeks | ₦20,000 |
| **Twice Weekly** | ₦520,000 | 26 | 13 weeks | ₦20,000 |

---

## 🔗 API Endpoints (Quick Reference)

```typescript
// Get all plans
GET /make-server-cbd74580/payments/plans
Headers: Authorization: Bearer {publicAnonKey}

// Initialize payment
POST /make-server-cbd74580/payments/initiate
Headers: Authorization: Bearer {userAccessToken}
Body: { planType, tutorId, preferredStartDate, preferredTime, subject }

// Verify payment
GET /make-server-cbd74580/payments/verify/:reference
Headers: Authorization: Bearer {userAccessToken}

// Get my payments
GET /make-server-cbd74580/payments/my-payments
Headers: Authorization: Bearer {userAccessToken}

// Get my bookings
GET /make-server-cbd74580/payments/my-bookings
Headers: Authorization: Bearer {userAccessToken}

// Webhook (automatic)
POST /make-server-cbd74580/webhooks/paystack
Headers: x-paystack-signature: {signature}
```

---

## 🧪 Test Cards

### ✅ Success Card
```
Card:   4084 0840 8408 4081
CVV:    408
Expiry: 12/25 (any future date)
PIN:    0000
OTP:    123456
```

### ❌ Failure Card
```
Card:   5078 5078 5073 0760
CVV:    081
Expiry: 12/25
PIN:    0000
```

---

## 🔍 Verification Queries

```sql
-- Check if tables exist
SELECT table_name FROM information_schema.tables 
WHERE table_name IN ('payment_plans', 'payments', 'bookings');

-- View payment plans
SELECT * FROM payment_plans;

-- Check recent payments
SELECT * FROM payments ORDER BY created_at DESC LIMIT 5;

-- Check recent bookings
SELECT * FROM bookings ORDER BY created_at DESC LIMIT 10;

-- Check webhook logs
SELECT * FROM webhook_logs ORDER BY created_at DESC LIMIT 10;
```

---

## 🐛 Troubleshooting

| Problem | Solution |
|---------|----------|
| **"Failed to initialize payment"** | Check PAYSTACK_SECRET_KEY in env vars |
| **"Unauthorized"** | User not logged in, check access token |
| **Bookings not created** | Check webhook_logs table for errors |
| **Webhook not received** | Verify webhook URL in Paystack |
| **Payment stuck in processing** | User may have closed window, can verify manually |

---

## 📊 Monitoring

```sql
-- Today's revenue
SELECT SUM(amount_naira) as revenue
FROM payments 
WHERE payment_status = 'paid' 
AND DATE(paid_at) = CURRENT_DATE;

-- Most popular plan
SELECT pp.name, COUNT(*) as bookings
FROM payments p
JOIN payment_plans pp ON p.plan_id = pp.id
WHERE p.payment_status = 'paid'
GROUP BY pp.name;

-- Failed payments today
SELECT COUNT(*) FROM payments 
WHERE payment_status = 'failed' 
AND DATE(created_at) = CURRENT_DATE;
```

---

## 🎨 UI Integration Example

```tsx
// Example: Tutor Profile Card with Book Button

export function TutorCard({ tutor }) {
  const navigate = useNavigate();
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>{tutor.name}</CardTitle>
        <CardDescription>{tutor.subject}</CardDescription>
      </CardHeader>
      <CardContent>
        <div>Rate: ₦{tutor.rate}/hour</div>
        <div>Rating: {tutor.rating}/5</div>
      </CardContent>
      <CardFooter>
        <Button 
          onClick={() => navigate(`/payment/plans/${tutor.id}`, {
            state: { 
              tutorName: tutor.name,
              subject: tutor.subject 
            }
          })}
          className="w-full"
        >
          Book Sessions
        </Button>
      </CardFooter>
    </Card>
  );
}
```

---

## 🔒 Security Checklist

- ✅ Payment verification on backend only
- ✅ JWT authentication on all endpoints
- ✅ Webhook signature verification
- ✅ RLS policies enabled
- ✅ Environment variables secured
- ✅ No secrets in frontend code
- ✅ Amount validation against plan prices
- ✅ User can only access own payments

---

## 📱 User Flow

```
Student browses tutors
    ↓
Clicks "Book Sessions"
    ↓
Sees 3 payment plans
    ↓
Selects a plan
    ↓
Redirected to Paystack
    ↓
Enters card details
    ↓
Payment processed
    ↓
Redirected to success page
    ↓
Sees all booked sessions
    ↓
Receives confirmation email
```

---

## 💰 Revenue Model

- **Trial:** ₦20,000 × 1 session = ₦20,000
- **Once Weekly:** ₦20,000 × 13 sessions = ₦260,000
- **Twice Weekly:** ₦20,000 × 26 sessions = ₦520,000

**Platform Commission:** 20% (₦4,000 per session)
**Tutor Earnings:** 80% (₦16,000 per session)

---

## 📞 Quick Support Commands

```bash
# Check if payment exists
SELECT * FROM payments WHERE payment_reference = 'TNP-...';

# Check if bookings were created
SELECT * FROM bookings WHERE payment_id = 'uuid...';

# Check webhook received
SELECT * FROM webhook_logs WHERE payment_reference = 'TNP-...';

# Manually mark payment as paid (emergency only)
UPDATE payments SET payment_status = 'paid', paid_at = NOW() 
WHERE payment_reference = 'TNP-...';
```

---

## ✨ Files Created

1. **`/DATABASE_SCHEMA_PAYMENTS.sql`** - Complete database schema
2. **`/supabase/functions/server/payment-plans-routes.tsx`** - Backend API
3. **`/components/PaymentPlansPage.tsx`** - Plan selection UI
4. **`/components/PaymentVerificationPage.tsx`** - Success page
5. **`/PAYMENT_SYSTEM_IMPLEMENTATION_GUIDE.md`** - Full guide
6. **`/PAYMENT_SYSTEM_ARCHITECTURE.md`** - Architecture docs
7. **`/PAYMENT_SYSTEM_SUMMARY.md`** - Complete summary
8. **`/PAYMENT_SYSTEM_QUICK_REFERENCE.md`** - This file

---

## 🎯 Success Criteria

✅ Plans display correctly
✅ Payment initializes successfully  
✅ Paystack page loads
✅ Payment completes
✅ Webhook received
✅ Bookings created automatically
✅ Success page shows schedule
✅ User can view bookings in dashboard

---

## 🚀 Production Deployment

```bash
# Before going live:
1. Replace test Paystack key with live key (sk_live_...)
2. Update FRONTEND_URL to production domain
3. Test with real ₦100 payment
4. Monitor webhook_logs for first few payments
5. Set up email notifications (optional)
```

---

**That's it! Your payment system is ready! 🎉**

**Questions?** See `/PAYMENT_SYSTEM_IMPLEMENTATION_GUIDE.md`

**Issues?** Check the Troubleshooting section above

**Good luck! 🚀**
