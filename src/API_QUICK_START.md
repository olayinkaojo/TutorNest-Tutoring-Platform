# TutorNest - API Quick Start Guide

## 🚀 **Getting Started in 4 Steps**

This guide will help you set up the essential APIs to get TutorNest running.

---

## ✅ **Step 1: Verify Supabase (Already Done)**

Your Supabase integration is already working! ✅

**Verify it's working:**
1. Check that you can sign in to the app
2. Try creating a user account
3. Check `/utils/supabase/info.tsx` for your project details

**Environment Variables (Already Set):**
- ✅ `SUPABASE_URL`
- ✅ `SUPABASE_ANON_KEY`
- ✅ `SUPABASE_SERVICE_ROLE_KEY`
- ✅ `SUPABASE_DB_URL`

---

## ⚠️ **Step 2: Complete Google Calendar Setup (30 minutes)**

### **Why You Need This:**
- Tutors can sync their availability
- Automatic calendar event creation on booking
- Google Meet links generated automatically

### **Quick Setup:**

#### **A. Google Cloud Console Setup**
1. Go to: https://console.cloud.google.com/
2. Create a new project (or select existing)
3. Name it: "TutorNest"
4. Click "CREATE"

#### **B. Enable Calendar API**
1. In sidebar: **APIs & Services** → **Library**
2. Search: "Google Calendar API"
3. Click on it
4. Click **"ENABLE"**
5. Wait 10 seconds for activation

#### **C. Configure OAuth Consent Screen**
1. Sidebar: **APIs & Services** → **OAuth consent screen**
2. Choose: **External**
3. Fill in:
   - **App name:** TutorNest
   - **User support email:** your-email@example.com
   - **Developer contact:** your-email@example.com
4. Click **"SAVE AND CONTINUE"**
5. **Scopes:** Add these two scopes:
   - `https://www.googleapis.com/auth/calendar`
   - `https://www.googleapis.com/auth/calendar.events`
6. Click **"SAVE AND CONTINUE"**
7. **Test users:** Add your email
8. Click **"SAVE AND CONTINUE"**

#### **D. Create OAuth Credentials**
1. Sidebar: **APIs & Services** → **Credentials**
2. Click **"+ CREATE CREDENTIALS"**
3. Select **"OAuth client ID"**
4. Application type: **"Web application"**
5. Name: "TutorNest Web Client"
6. **Authorized redirect URIs:** Add this URL:
   ```
   https://YOUR_PROJECT_ID.supabase.co/functions/v1/make-server-cbd74580/google-calendar/callback
   ```
   (Replace `YOUR_PROJECT_ID` with your Supabase project ID)
7. Click **"CREATE"**
8. **Copy your credentials** (you'll need these next!)

#### **E. Add to Supabase**
1. Go to your Supabase Dashboard
2. **Settings** → **Edge Functions** → **Secrets**
3. Add these three secrets:

   **Secret 1:**
   - Name: `GOOGLE_CLIENT_ID`
   - Value: `123456789.apps.googleusercontent.com` (paste yours)

   **Secret 2:**
   - Name: `GOOGLE_CLIENT_SECRET`
   - Value: `GOCSPX-xxxxxxxx` (paste yours)

   **Secret 3:**
   - Name: `GOOGLE_REDIRECT_URI`
   - Value: `https://YOUR_PROJECT_ID.supabase.co/functions/v1/make-server-cbd74580/google-calendar/callback`

4. Click **"Save"** for each

#### **F. Test the Integration**
1. Sign in to TutorNest as a tutor
2. Go to **Booking Manager**
3. Click **"Connect Google Calendar"**
4. You should see Google's permission screen
5. Click **"Allow"**
6. Success! ✅

**Detailed Guide:** `/docs/GOOGLE_OAUTH_SETUP_GUIDE.md`

---

## ❌ **Step 3: Set Up Payment Gateway (1 hour)**

### **Choose Your Payment Provider:**

#### **Option A: Stripe (International, Recommended)**
**Best for:** Global reach, robust features, excellent documentation

**Setup Steps:**
1. **Sign up:** https://dashboard.stripe.com/register
2. **Activate account** (provide business details)
3. **Get API keys:**
   - Dashboard → **Developers** → **API keys**
   - Copy your **Publishable key** (starts with `pk_`)
   - Copy your **Secret key** (starts with `sk_`)
4. **Add to Supabase:**
   ```bash
   # In Supabase: Settings → Edge Functions → Secrets
   
   STRIPE_PUBLIC_KEY=pk_live_xxxxx  # Publishable key
   STRIPE_SECRET_KEY=sk_live_xxxxx  # Secret key (keep safe!)
   ```
5. **Set up webhooks:**
   - Dashboard → **Developers** → **Webhooks**
   - Add endpoint: `https://YOUR_PROJECT_ID.supabase.co/functions/v1/make-server-cbd74580/webhooks/stripe`
   - Select events: `payment_intent.succeeded`, `subscription.created`, etc.
   - Copy **Signing secret**
   - Add to Supabase: `STRIPE_WEBHOOK_SECRET=whsec_xxxxx`

**Pricing:** 2.9% + $0.30 per transaction

#### **Option B: Paystack (Nigeria-focused, Lower Fees)**
**Best for:** Nigerian market, local payment methods

**Setup Steps:**
1. **Sign up:** https://dashboard.paystack.com/signup
2. **Activate account** (Nigerian business verification)
3. **Get API keys:**
   - Settings → **API Keys & Webhooks**
   - Copy your **Public key**
   - Copy your **Secret key**
4. **Add to Supabase:**
   ```bash
   PAYSTACK_PUBLIC_KEY=pk_live_xxxxx
   PAYSTACK_SECRET_KEY=sk_live_xxxxx
   ```
5. **Set up webhooks:**
   - Settings → **API Keys & Webhooks** → **Webhooks**
   - Add URL: `https://YOUR_PROJECT_ID.supabase.co/functions/v1/make-server-cbd74580/webhooks/paystack`

**Pricing:** 1.5% + ₦100 per transaction (Lower than Stripe!)

### **Integration Required:**
- Create payment routes in `/supabase/functions/server/payment-routes.tsx`
- Add Stripe/Paystack SDK to frontend
- Implement checkout flow
- Handle webhooks for payment confirmation

**Note:** This requires custom code development. Consider hiring a developer or using a template.

---

## ❌ **Step 4: Set Up Email Service (30 minutes)**

### **Recommended: SendGrid (Free tier available)**

#### **Setup Steps:**
1. **Sign up:** https://signup.sendgrid.com/
2. **Verify your email**
3. **Create a sender identity:**
   - Settings → **Sender Authentication**
   - **Single Sender Verification** (for testing)
   - Email: `noreply@yourdomain.com`
   - From Name: "TutorNest"
   - Click verification email sent to you
4. **Get API Key:**
   - Settings → **API Keys**
   - Click **"Create API Key"**
   - Name: "TutorNest Production"
   - Permissions: **"Full Access"**
   - **Copy the key** (you'll only see it once!)
5. **Add to Supabase:**
   ```bash
   # Settings → Edge Functions → Secrets
   
   SENDGRID_API_KEY=SG.xxxxxxxxxxxxxxxxxxxxxxxx
   SENDGRID_FROM_EMAIL=noreply@yourdomain.com
   SENDGRID_FROM_NAME=TutorNest
   ```

#### **Update Backend Code:**
In `/supabase/functions/server/reports-notifications-routes.tsx`, find the `sendEmailNotification` function and update it:

```typescript
import { createClient } from 'npm:@sendgrid/mail@7.7.0';

async function sendEmailNotification(data: any) {
  const sgMail = createClient();
  sgMail.setApiKey(Deno.env.get('SENDGRID_API_KEY') || '');
  
  try {
    await sgMail.send({
      to: data.email,
      from: {
        email: Deno.env.get('SENDGRID_FROM_EMAIL') || '',
        name: Deno.env.get('SENDGRID_FROM_NAME') || 'TutorNest'
      },
      subject: data.subject,
      html: data.html,
    });
    console.log('Email sent successfully to:', data.email);
  } catch (error) {
    console.error('Error sending email:', error);
  }
}
```

#### **Test Email Sending:**
1. Trigger a test notification (e.g., submit a session report)
2. Check SendGrid Dashboard → **Activity** to see email sent
3. Check recipient's inbox

**Free Tier:** 100 emails/day (enough for testing)  
**Paid Plans:** $19.95/month for 50,000 emails

### **Alternative: Resend (Simpler, Modern)**
- **Sign up:** https://resend.com/signup
- **Get API key:** Dashboard → API Keys
- **Add to Supabase:** `RESEND_API_KEY=re_xxxxx`
- **Free tier:** 100 emails/day, 3,000/month

---

## 🎯 **Summary: What You Have Now**

### **✅ Working:**
- User authentication (Supabase)
- Database operations (Supabase)
- File storage (Supabase)
- All UI components and dashboards

### **⚠️ Needs Setup (30 min):**
- Google Calendar OAuth credentials
  - Follow Step 2 above
  - Or see `/docs/GOOGLE_OAUTH_SETUP_GUIDE.md`

### **❌ Requires Integration (Custom Development):**
- Payment gateway (Stripe/Paystack)
  - Need to write payment routes
  - Implement checkout UI
  - Handle webhooks
- Email service (SendGrid/Resend)
  - Update notification function
  - Create email templates

---

## 🔧 **Optional Enhancements (Can Add Later)**

### **SMS Notifications (Twilio)**
- **When to add:** After 100+ active users
- **Cost:** ~$50/month for 1000 SMS
- **Setup time:** 1 hour

### **Video Platform (Daily.co)**
- **When to add:** If Google Meet isn't sufficient
- **Free tier:** 10,000 minutes/month
- **Setup time:** 2-3 hours

### **reCAPTCHA (Security)**
- **When to add:** If you notice spam/bot activity
- **Cost:** Free (unlimited)
- **Setup time:** 30 minutes

### **Monitoring (Sentry)**
- **When to add:** After launch for error tracking
- **Free tier:** 5,000 errors/month
- **Setup time:** 30 minutes

---

## 📋 **Launch Checklist**

### **Before Public Launch:**
- [ ] Google Calendar OAuth configured
- [ ] Payment gateway integrated and tested
- [ ] Email service configured
- [ ] Test complete booking flow
- [ ] Test payment flow
- [ ] Test email notifications
- [ ] Test tutor/parent/student journeys
- [ ] Verify all environment variables
- [ ] Security audit (passwords, API keys)
- [ ] Privacy policy updated
- [ ] Terms of service updated

### **Nice to Have Before Launch:**
- [ ] SMS notifications (Twilio)
- [ ] reCAPTCHA on forms
- [ ] Error monitoring (Sentry)
- [ ] Analytics setup

---

## 🆘 **Need Help?**

### **Documentation References:**
- **Google Calendar:** `/docs/GOOGLE_OAUTH_SETUP_GUIDE.md`
- **Complete API List:** `/REQUIRED_APIS.md`
- **Architecture Overview:** `/API_ARCHITECTURE.md`
- **Booking System:** `/docs/BOOKING_SYSTEM_TEST_CHECKLIST.md`

### **Common Issues:**

**Issue:** Google Calendar not connecting  
**Solution:** Check that all 3 environment variables are set correctly

**Issue:** Payments not processing  
**Solution:** Ensure webhook endpoint is reachable and secret is correct

**Issue:** Emails not sending  
**Solution:** Verify SendGrid API key and sender email is verified

**Issue:** "API key not found" errors  
**Solution:** Redeploy Edge Functions after adding environment variables

---

## 💰 **Estimated Costs (Per Month)**

### **Starting Out (0-100 users):**
- Supabase: **Free** (or $25 for Pro)
- Google Calendar: **Free**
- SendGrid: **Free** (100 emails/day)
- Stripe/Paystack: **Transaction fees only**
- **Total: $0-25/month**

### **Growing (100-1000 users):**
- Supabase: **$25** (Pro plan)
- SendGrid: **$19.95** (or stay on free tier)
- Payment processing: **Transaction fees**
- **Total: $25-45/month**

### **Established (1000+ users):**
- Supabase: **$25**
- SendGrid: **$89.95** (100k emails)
- Daily.co: **$99** (video)
- Twilio: **$50** (SMS)
- **Total: $264/month**

---

## 🚀 **Quick Start Commands**

### **Test Your Setup:**

```bash
# Check Supabase connection
curl https://YOUR_PROJECT_ID.supabase.co/functions/v1/make-server-cbd74580/health

# Test Google Calendar OAuth
# (Visit in browser)
https://YOUR_PROJECT_ID.supabase.co/functions/v1/make-server-cbd74580/google-calendar/auth

# Check environment variables are set
# (In Supabase Dashboard)
Settings → Edge Functions → Secrets
```

---

## 📞 **Support Contacts**

- **Supabase Support:** https://supabase.com/support
- **Google Cloud Support:** https://cloud.google.com/support
- **Stripe Support:** https://support.stripe.com
- **SendGrid Support:** https://support.sendgrid.com

---

**Last Updated:** December 1, 2025  
**Version:** 1.0  
**Estimated Setup Time:** 2-3 hours for essential APIs
