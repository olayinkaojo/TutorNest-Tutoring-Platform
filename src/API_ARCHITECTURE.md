# TutorNest - API Architecture & Integration Map

## 🏗️ **System Architecture Overview**

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         TutorNest Platform                              │
│                     (React Frontend - Figma Make)                       │
└────────────────┬────────────────────────────────────────────────────────┘
                 │
                 ├─── Authentication & User Management
                 │    └──► Supabase Auth ✅
                 │
                 ├─── Database & Backend
                 │    └──► Supabase (PostgreSQL + Edge Functions) ✅
                 │
                 ├─── File Storage
                 │    └──► Supabase Storage ✅
                 │
                 ├─── Calendar & Scheduling
                 │    └──► Google Calendar API ⚠️ (Needs OAuth setup)
                 │
                 ├─── Payments & Billing
                 │    ├──► Stripe API ❌ (Recommended)
                 │    └──► Paystack API ❌ (Nigeria alternative)
                 │
                 ├─── Email Notifications
                 │    ├──► SendGrid ❌ (Recommended)
                 │    ├──► Resend ❌ (Alternative)
                 │    └──► AWS SES ❌ (Alternative)
                 │
                 ├─── SMS Notifications
                 │    └──► Twilio ❌ (Recommended)
                 │
                 ├─── Video Conferencing
                 │    ├──► Daily.co ❌ (Recommended)
                 │    ├──► Agora ❌ (Alternative)
                 │    └──► Google Meet ✅ (via Calendar API)
                 │
                 ├─── Security
                 │    └──► reCAPTCHA ❌ (Recommended)
                 │
                 └─── Monitoring & Analytics
                      ├──► Sentry ❌ (Optional)
                      └──► Mixpanel ❌ (Optional)
```

---

## 🔄 **Data Flow Diagrams**

### **1. Booking Flow with APIs**

```
┌──────────┐
│  Parent  │
│/Student  │
└────┬─────┘
     │
     │ 1. Browse Tutors
     ├───────────────────►┌──────────────┐
     │                    │   Supabase   │
     │◄───────────────────┤   Database   │
     │   Tutor List       └──────────────┘
     │
     │ 2. Check Availability
     ├───────────────────►┌──────────────┐
     │                    │   Google     │
     │◄───────────────────┤   Calendar   │⚠️
     │   Available Slots  └──────────────┘
     │
     │ 3. Make Booking
     ├───────────────────►┌──────────────┐
     │                    │    Stripe    │❌
     │◄───────────────────┤   Payment    │
     │   Payment Confirm  └──────────────┘
     │
     │ 4. Confirm Booking
     ├───────────────────►┌──────────────┐
     │                    │  Supabase    │✅
     │◄───────────────────┤  Save Data   │
     │   Booking Created  └──────────────┘
     │
     │ 5. Calendar Event
     ├───────────────────►┌──────────────┐
     │                    │   Google     │⚠️
     │                    │   Calendar   │
     │                    └──────────────┘
     │
     │ 6. Email Confirmation
     ├───────────────────►┌──────────────┐
     │                    │   SendGrid   │❌
     │                    └──────────────┘
     │
     │ 7. SMS Reminder
     └───────────────────►┌──────────────┐
                          │    Twilio    │❌
                          └──────────────┘
```

### **2. Payment Processing Flow**

```
┌──────────────────┐
│  Session Booking │
│   ₦20,000        │
└────────┬─────────┘
         │
         ├──► Stripe/Paystack Checkout ❌
         │    (Parent pays ₦20,000)
         │
         ├──► Payment Success
         │
         ├──► Supabase: Record Transaction ✅
         │
         ├──► Platform Fee Split:
         │    ├─► TutorNest: 20% of session fee
         │    └─► Tutor: 80% of session fee
         │
         ├──► Stripe/Paystack: Schedule Payout ❌
         │    (Automatic to tutor's bank account)
         │
         ├──► SendGrid: Email Receipt ❌
         │    ├─► To Parent
         │    └─► To Tutor
         │
         └──► Supabase: Update Booking Status ✅
```

### **3. Subscription Management Flow**

```
┌──────────────────┐
│  User Subscribes │
│  to Book Access  │
└────────┬─────────┘
         │
         ├──► Stripe Subscription ❌
         │    (Monthly/Annual billing)
         │
         ├──► Webhook: subscription.created
         │
         ├──► Supabase: Create Subscription ✅
         │    (tier, status, valid_until)
         │
         ├──► SendGrid: Welcome Email ❌
         │
         ├──► Monthly Renewal:
         │    ├─► Stripe: Automatic Charge ❌
         │    ├─► Webhook: invoice.paid
         │    └─► Supabase: Extend Subscription ✅
         │
         └──► Access Control:
              └─► Supabase: Verify Subscription ✅
                  (Before serving content)
```

### **4. Live Session Flow**

```
┌──────────────────┐
│  Session Starts  │
└────────┬─────────┘
         │
         ├──► Option 1: Google Meet ✅
         │    ├─► Google Calendar API
         │    └─► Auto-generated Meet link
         │
         ├──► Option 2: Daily.co ❌
         │    ├─► Create video room
         │    ├─► Generate room URL
         │    └─► Send to participants
         │
         ├──► During Session:
         │    ├─► Video/Audio streaming
         │    ├─► Screen sharing
         │    ├─► Whiteboard (if Daily.co)
         │    └─► Chat
         │
         ├──► Session Recording (Optional)
         │    └─► Store in Supabase Storage ✅
         │
         └──► Post-Session:
              ├─► Tutor submits report (Supabase) ✅
              ├─► Parent receives notification (SendGrid) ❌
              └─► Parent rates session (Supabase) ✅
```

### **5. Notification System**

```
┌──────────────────┐
│  Event Trigger   │
│  (booking, msg,  │
│   report, etc)   │
└────────┬─────────┘
         │
         ├──► Supabase: Store Notification ✅
         │    (in-app notification)
         │
         ├──► SendGrid: Email Notification ❌
         │    ├─► Template selection
         │    ├─► Personalization
         │    └─► Send email
         │
         ├──► Twilio: SMS (if urgent) ❌
         │    └─► "Session starts in 15 min"
         │
         └──► Push Notification (Future) ❌
              └─► OneSignal/FCM
```

---

## 🔐 **Security & Authentication Flow**

```
┌─────────────┐
│  User Login │
└──────┬──────┘
       │
       ├──► reCAPTCHA Verification ❌
       │    (Prevent bot attacks)
       │
       ├──► Supabase Auth ✅
       │    ├─► Email/Password
       │    ├─► Google OAuth
       │    └─► Magic Link
       │
       ├──► Generate JWT Token ✅
       │
       ├──► Fetch User Profile ✅
       │    (from Supabase)
       │
       ├──► Role-Based Access ✅
       │    ├─► Parent Dashboard
       │    ├─► Student Dashboard
       │    ├─► Tutor Dashboard
       │    └─► Admin Dashboard
       │
       └──► Session Management ✅
            └─► Auto-refresh tokens
```

---

## 📊 **Current Integration Status**

### **✅ Fully Integrated (Working)**
1. **Supabase**
   - Database (PostgreSQL + KV Store)
   - Authentication (Email/Password, OAuth)
   - Storage (Profile pics, documents)
   - Edge Functions (Backend API)
   
2. **Google Meet** (via Calendar API)
   - Basic integration complete
   - Meet links generated automatically

### **⚠️ Partially Integrated (Needs Setup)**
3. **Google Calendar API**
   - Code is ready ✅
   - OAuth credentials needed ⚠️
   - Documentation available: `/docs/GOOGLE_OAUTH_SETUP_GUIDE.md`
   - Required env vars:
     ```bash
     GOOGLE_CLIENT_ID=...
     GOOGLE_CLIENT_SECRET=...
     GOOGLE_REDIRECT_URI=...
     ```

### **❌ Not Yet Integrated (Required)**

4. **Payment Gateway** (Critical Priority)
   - No code written yet
   - Decision needed: Stripe vs Paystack
   - Required for:
     - Session payments (₦20,000)
     - Subscription billing
     - Tutor payouts
     - Refunds

5. **Email Service** (Critical Priority)
   - Scaffolding exists in code
   - No API key configured
   - Required for:
     - Booking confirmations
     - Session reports
     - Password resets
     - Weekly summaries

6. **Video Platform** (High Priority)
   - Google Meet works as temporary solution ✅
   - For better experience, need Daily.co or Agora
   - Features: Recording, whiteboard, screen share

7. **SMS Service** (Medium Priority)
   - No integration yet
   - Needed for:
     - Urgent notifications
     - Session reminders
     - Verification codes

8. **Security Tools** (Medium Priority)
   - reCAPTCHA not integrated
   - Needed on:
     - Signup forms
     - Login pages
     - Review submissions

---

## 🎯 **API Implementation Checklist**

### **Phase 1: MVP Launch (Weeks 1-2)**
- [x] Supabase setup
- [ ] Complete Google Calendar OAuth
- [ ] Integrate payment gateway (Stripe/Paystack)
- [ ] Set up email service (SendGrid)
- [ ] Add reCAPTCHA to forms

### **Phase 2: Enhanced Features (Weeks 3-4)**
- [ ] Integrate video platform (Daily.co)
- [ ] Add SMS notifications (Twilio)
- [ ] Set up error monitoring (Sentry)
- [ ] Payment webhook handling
- [ ] Email templates creation

### **Phase 3: Optimization (Month 2)**
- [ ] Push notifications
- [ ] Advanced analytics
- [ ] Search optimization (Algolia)
- [ ] Performance monitoring
- [ ] Load testing

---

## 💾 **Environment Variables Checklist**

### **Already Configured ✅**
```bash
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=eyJxxx...
SUPABASE_SERVICE_ROLE_KEY=eyJxxx...
SUPABASE_DB_URL=postgresql://xxx
```

### **Needs Configuration ❌**

#### **Google Calendar**
```bash
GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xxx
GOOGLE_REDIRECT_URI=https://xxx.supabase.co/functions/v1/make-server-cbd74580/google-calendar/callback
```

#### **Payment (Choose One)**
```bash
# Option A: Stripe
STRIPE_PUBLIC_KEY=pk_live_xxx
STRIPE_SECRET_KEY=sk_live_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx

# Option B: Paystack (Nigeria)
PAYSTACK_PUBLIC_KEY=pk_live_xxx
PAYSTACK_SECRET_KEY=sk_live_xxx
```

#### **Email (Choose One)**
```bash
# Option A: SendGrid
SENDGRID_API_KEY=SG.xxx
SENDGRID_FROM_EMAIL=noreply@tutornest.com
SENDGRID_FROM_NAME=TutorNest

# Option B: Resend
RESEND_API_KEY=re_xxx
```

#### **SMS (Optional)**
```bash
TWILIO_ACCOUNT_SID=ACxxx
TWILIO_AUTH_TOKEN=xxx
TWILIO_PHONE_NUMBER=+1234567890
```

#### **Video (Optional)**
```bash
DAILY_API_KEY=xxx
DAILY_DOMAIN=tutornest.daily.co
```

#### **Security (Recommended)**
```bash
RECAPTCHA_SITE_KEY=6Lcxxx  # Public
RECAPTCHA_SECRET_KEY=6Lcxxx  # Secret
```

---

## 📈 **Scalability Considerations**

### **Current Capacity (Supabase Free Tier)**
- Database: 500 MB
- Storage: 1 GB
- Edge Functions: 500k invocations/month
- Auth: Unlimited users

### **When to Upgrade**
- **100+ active users:** Move to Supabase Pro ($25/month)
- **1000+ bookings/month:** Consider CDN for assets
- **10k+ users:** Database optimization, read replicas
- **100k+ users:** Multi-region deployment

### **API Rate Limits to Watch**
- **Google Calendar:** 1,000,000 queries/day (free)
- **SendGrid Free:** 100 emails/day
- **Stripe:** No rate limit (pay per transaction)
- **Daily.co Free:** 10,000 minutes/month

---

## 🚨 **Critical Dependencies**

### **Cannot Launch Without:**
1. ✅ Supabase (working)
2. ⚠️ Google Calendar OAuth (needs setup)
3. ❌ Payment Gateway (must choose and integrate)
4. ❌ Email Service (critical for notifications)

### **Can Launch Without (But Needed Soon):**
5. SMS Service (can use email initially)
6. Video Platform (Google Meet works temporarily)
7. Monitoring (can add post-launch)
8. reCAPTCHA (manual moderation initially)

---

## 📞 **Support & Resources**

### **API Documentation Links**
- Supabase: https://supabase.com/docs
- Google Calendar: https://developers.google.com/calendar
- Stripe: https://stripe.com/docs/api
- SendGrid: https://docs.sendgrid.com
- Daily.co: https://docs.daily.co
- Twilio: https://www.twilio.com/docs

### **Internal Documentation**
- `/docs/GOOGLE_OAUTH_SETUP_GUIDE.md` - Complete OAuth setup
- `/REQUIRED_APIS.md` - Detailed API requirements
- `/IMPLEMENTATION_SUMMARY.md` - Current implementation status
- `/SUBSCRIPTIONS_FEATURE.md` - Subscription system details

---

**Last Updated:** December 1, 2025  
**Status:** Phase 1 - MVP Preparation  
**Next Steps:** Complete Google OAuth + Choose Payment Gateway