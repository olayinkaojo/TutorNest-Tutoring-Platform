# ✅ Payment System Fixes Applied

## 🔧 What Was Fixed

### 1. Currency Symbol (£ → ₦)
**Files Updated:**
- `/components/BookingCalendar.tsx` - All instances changed to ₦ (Naira)

### 2. Payment Plans Selection
**Files Updated:**
- `/components/BookSessionWithPayment.tsx` - Complete rewrite to show 3 payment plan options
  - ✅ Trial Plan (₦20,000)
  - ✅ Once Weekly Plan (₦260,000)
  - ✅ Twice Weekly Plan (₦520,000)

### 3. Backend Configuration
**Files Already Configured (No changes needed):**
- `/supabase/functions/server/payment-plans-routes.tsx`
  - ✅ Currency set to `'NGN'`
  - ✅ All payment channels enabled (card, bank, USSD, etc.)
  - ✅ Integrated into main server at line 409 of `/supabase/functions/server/index.tsx`

---

## 🚀 How To Deploy Changes

### Step 1: Verify Backend is Running
1. Open your terminal
2. Navigate to your project directory
3. Run:
   ```bash
   supabase functions deploy make-server-cbd74580
   ```
4. Wait for deployment to complete (~1-2 minutes)

### Step 2: Verify Database Schema
1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Go to SQL Editor
4. Run this test query:
   ```sql
   SELECT * FROM payment_plans;
   ```
5. **If table doesn't exist:**
   - Open `/DATABASE_SCHEMA_PAYMENTS.sql`
   - Copy all content
   - Paste into SQL Editor
   - Click "Run"

### Step 3: Clear Browser Cache
**Chrome/Edge:**
- Press `Ctrl + Shift + Delete` (Windows) or `Cmd + Shift + Delete` (Mac)
- Select "Cached images and files"
- Click "Clear data"

**Or Simply:**
- Press `Ctrl + Shift + R` (Windows) or `Cmd + Shift + R` (Mac) to hard refresh

### Step 4: Test the Changes
1. Go to your app
2. Login as a parent or student
3. Search for a tutor
4. Click "Book Session" or similar button
5. **You should now see:**
   - ✅ 3 payment plan cards (Trial, Once Weekly, Twice Weekly)
   - ✅ Prices displayed in ₦ (Naira)
   - ✅ Per-session pricing breakdown
6. Click any plan
7. Should redirect to Paystack
8. **On Paystack page:**
   - ✅ Currency should be NGN (₦)
   - ✅ Card payment option should be visible
   - ✅ Amount should match selected plan

---

## 🧪 Testing Tool

I've created a diagnostic component to help you verify everything is working.

### To Use the Test Tool:

1. **Option A: Add to your routing**
   ```tsx
   // In your main App.tsx or routes file
   import { TestPaymentPlans } from './components/TestPaymentPlans';
   
   // Add a route
   {urlParams.get('test') === 'payments' && <TestPaymentPlans />}
   ```
   Then visit: `https://your-app.com/?test=payments`

2. **Option B: Temporarily replace a dashboard component**
   ```tsx
   // In any dashboard file
   import { TestPaymentPlans } from './components/TestPaymentPlans';
   
   // Temporarily show instead of dashboard
   return <TestPaymentPlans />;
   ```

The test tool will:
- ✅ Check backend configuration
- ✅ Verify currency is set to NGN
- ✅ Fetch all payment plans
- ✅ Display formatted prices in ₦
- ✅ Show any errors with detailed info

---

## 🐛 Troubleshooting

### Issue: Still seeing £ symbol
**Possible Causes:**
1. Browser cache not cleared
2. Old component still being used
3. Different file is rendering the payment UI

**Solutions:**
```bash
# 1. Hard refresh browser
Ctrl + Shift + R (or Cmd + Shift + R on Mac)

# 2. Check which component is being used
# Search your codebase for where payments are initiated
# Make sure it's using the updated BookSessionWithPayment component

# 3. Clear all caches
# In browser: DevTools (F12) → Application → Clear storage → Clear site data
```

### Issue: No payment plan options showing
**Possible Causes:**
1. Database schema not installed
2. Backend not deployed
3. API route not accessible

**Solutions:**
1. **Check database:**
   ```sql
   SELECT * FROM payment_plans;
   ```
   If empty or error, run `/DATABASE_SCHEMA_PAYMENTS.sql`

2. **Check backend:**
   ```bash
   # Test endpoint
   curl https://YOUR_PROJECT.supabase.co/functions/v1/make-server-cbd74580/payments/test-config
   ```
   Should return:
   ```json
   {
     "expected_currency": "NGN",
     "enabled_channels": ["card", "bank", "ussd", "qr", "mobile_money", "bank_transfer"]
   }
   ```

3. **Redeploy backend:**
   ```bash
   supabase functions deploy make-server-cbd74580
   ```

### Issue: Card option not available on Paystack
**Possible Causes:**
1. Paystack account settings
2. Using test mode incorrectly
3. Backend not updated

**Solutions:**
1. **Check Paystack Dashboard:**
   - Go to https://dashboard.paystack.com
   - Settings → Preferences
   - Ensure "Card Payments" is enabled

2. **Verify API key:**
   - Settings → API Keys & Webhooks
   - Make sure you're using Nigerian Paystack (not UK)
   - Test keys should start with `sk_test_`

3. **Redeploy backend** (see above)

---

## 📊 What Changed in Code

### BookSessionWithPayment.tsx
**Before:** Single payment form with PaymentProcessor
**After:** 3-card layout with plan selection

```tsx
// NEW: Shows 3 plans
plans.map((plan) => (
  <Card key={plan.id}>
    <CardTitle>{plan.name}</CardTitle>
    <div>{formatNaira(plan.price_naira)}</div>
    <Button onClick={() => handleSelectPlan(plan)}>
      Select {plan.name}
    </Button>
  </Card>
))
```

### BookingCalendar.tsx
**Before:** £ symbol
**After:** ₦ symbol

```tsx
// CHANGED:
<p>₦{calculatePrice()}</p>  // Was: £{calculatePrice()}
<p>₦{tutorProfile.hourlyRate}/hour</p>  // Was: £{...}
```

### payment-plans-routes.tsx
**Already Correct** (no changes needed):
```tsx
body: JSON.stringify({
  // ... existing code ...
  currency: 'NGN',  // ✅ Correct
  channels: ['card', 'bank', 'ussd', ...],  // ✅ Correct
})
```

---

## ✅ Verification Checklist

After deployment, verify:

- [ ] Backend deployed successfully
- [ ] Database has `payment_plans` table with 3 rows
- [ ] Test config endpoint returns `"expected_currency": "NGN"`
- [ ] Browser cache cleared (hard refresh)
- [ ] Booking flow shows 3 payment plan cards
- [ ] All prices show ₦ symbol (not £)
- [ ] Clicking a plan redirects to Paystack
- [ ] Paystack shows NGN currency
- [ ] Paystack shows card payment option
- [ ] Amount on Paystack matches selected plan

---

## 📞 Quick Links

**Supabase Dashboard:**
https://supabase.com/dashboard/project/YOUR_PROJECT_ID

**Edge Functions:**
https://supabase.com/dashboard/project/YOUR_PROJECT_ID/functions

**SQL Editor:**
https://supabase.com/dashboard/project/YOUR_PROJECT_ID/sql

**Paystack Dashboard:**
https://dashboard.paystack.com

---

## 🎉 Success Criteria

Your payment system is working correctly when:

1. ✅ You see **3 distinct payment plan cards** when booking
2. ✅ All prices display in **₦** (Naira symbol)
3. ✅ Per-session price breakdown shows correct math
4. ✅ Clicking any plan **redirects to Paystack**
5. ✅ Paystack page shows **NGN** currency
6. ✅ **Card payment option** is visible and clickable
7. ✅ Test payment completes successfully
8. ✅ Bookings are created in database after payment

---

## 🔄 Deployment Commands Reference

```bash
# Deploy backend
supabase functions deploy make-server-cbd74580

# Check function logs
supabase functions logs make-server-cbd74580

# Test API endpoint
curl https://YOUR_PROJECT.supabase.co/functions/v1/make-server-cbd74580/payments/test-config

# Run SQL migrations
# (Copy content from /DATABASE_SCHEMA_PAYMENTS.sql and run in Supabase SQL Editor)
```

---

**Last Updated:** Just now  
**Status:** ✅ All fixes applied, ready for deployment

---

Need help? Check the troubleshooting section or review the test tool output for specific error messages.
