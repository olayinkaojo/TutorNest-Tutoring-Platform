# TutorNest - Required External APIs & Services

## 🔑 **CRITICAL APIs (Must Have for Core Functionality)**

### 1. **Supabase** (Already Integrated ✅)
**Purpose:** Backend infrastructure, database, authentication, edge functions
- **What's Needed:**
  - Supabase Project URL
  - Anon/Public Key
  - Service Role Key (secret)
  - Database URL
  
**Already Configured:** ✅
- Environment variables set
- KV Store operational
- Auth system working
- Edge functions deployed

---

### 2. **Google Calendar API** (Partially Integrated ⚠️)
**Purpose:** Booking system integration, session scheduling
- **What's Needed:**
  - Google Cloud Project
  - OAuth 2.0 Client ID
  - OAuth 2.0 Client Secret
  - Redirect URI configured
  
**Environment Variables Required:**
```bash
GOOGLE_CLIENT_ID=your_google_client_id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_REDIRECT_URI=https://your-project.supabase.co/functions/v1/make-server-cbd74580/google-calendar/callback
```

**Setup Guide:** `/docs/GOOGLE_OAUTH_SETUP_GUIDE.md`

**Required Scopes:**
- `https://www.googleapis.com/auth/calendar`
- `https://www.googleapis.com/auth/calendar.events`

**Features Enabled:**
- ✅ Tutor calendar sync
- ✅ Automatic event creation on booking
- ✅ Google Meet link generation
- ✅ Availability management

---

## 📧 **COMMUNICATION APIs (Highly Recommended)**

### 3. **Email Service Provider** (Not Yet Integrated ❌)
**Purpose:** Transactional emails, notifications, reports

**Recommended Options:**

#### **Option A: SendGrid (Recommended)**
- **Free Tier:** 100 emails/day
- **Paid Plans:** Starting at $19.95/month for 50k emails
- **What's Needed:**
  ```bash
  SENDGRID_API_KEY=SG.xxxxxxxxxxxxxxxxx
  SENDGRID_FROM_EMAIL=noreply@tutornest.com
  SENDGRID_FROM_NAME=TutorNest
  ```
- **Website:** https://sendgrid.com
- **Integration:** Already scaffolded in `/supabase/functions/server/reports-notifications-routes.tsx`

#### **Option B: Resend**
- **Free Tier:** 100 emails/day, 3,000/month
- **Paid Plans:** $20/month for 50k emails
- **What's Needed:**
  ```bash
  RESEND_API_KEY=re_xxxxxxxxxxxxxxxxx
  ```
- **Website:** https://resend.com

#### **Option C: AWS SES**
- **Pricing:** $0.10 per 1,000 emails
- **What's Needed:**
  ```bash
  AWS_ACCESS_KEY_ID=AKIA...
  AWS_SECRET_ACCESS_KEY=...
  AWS_REGION=us-east-1
  SES_FROM_EMAIL=noreply@tutornest.com
  ```

**Email Use Cases:**
- Session booking confirmations
- Post-session reports notifications
- Rating/review requests
- Payment receipts
- Tutor verification emails
- Student login credentials
- Password reset
- Weekly progress summaries
- Promotional emails

---

### 4. **SMS Service (Optional but Recommended)** (Not Yet Integrated ❌)
**Purpose:** Session reminders, urgent notifications

#### **Option A: Twilio**
- **Pricing:** Pay-as-you-go, ~$0.0075 per SMS
- **What's Needed:**
  ```bash
  TWILIO_ACCOUNT_SID=AC...
  TWILIO_AUTH_TOKEN=...
  TWILIO_PHONE_NUMBER=+1234567890
  ```
- **Website:** https://www.twilio.com

#### **Option B: Vonage (Nexmo)**
- **Pricing:** Similar to Twilio
- **What's Needed:**
  ```bash
  VONAGE_API_KEY=...
  VONAGE_API_SECRET=...
  VONAGE_FROM_NUMBER=TutorNest
  ```

**SMS Use Cases:**
- Session starting in 15 minutes
- Tutor running late notifications
- Session cancellation alerts
- Verification codes

---

## 💳 **PAYMENT APIs (Required for Production)**

### 5. **Payment Gateway** (Not Yet Integrated ❌)
**Purpose:** Process payments, manage subscriptions, handle payouts

#### **Option A: Stripe (Highly Recommended)**
- **Pricing:** 2.9% + 30¢ per transaction
- **What's Needed:**
  ```bash
  STRIPE_PUBLIC_KEY=pk_live_...  # Frontend
  STRIPE_SECRET_KEY=sk_live_...  # Backend (secret)
  STRIPE_WEBHOOK_SECRET=whsec_...  # Webhook verification
  ```
- **Website:** https://stripe.com
- **Features:**
  - Payment processing for ₦20,000 sessions
  - Subscription management for books/content
  - Automatic tutor payouts (80% of session fee)
  - Refund handling
  - Invoice generation
  - Tax/VAT calculation
  - Multi-currency support

#### **Option B: Paystack (Nigeria-focused)**
- **Pricing:** 1.5% + ₦100 per transaction
- **What's Needed:**
  ```bash
  PAYSTACK_PUBLIC_KEY=pk_live_...
  PAYSTACK_SECRET_KEY=sk_live_...
  ```
- **Website:** https://paystack.com
- **Benefits:**
  - Optimized for Nigerian payments
  - Lower fees
  - Local bank transfers
  - USSD payments

#### **Option C: Flutterwave**
- **Pricing:** 1.4% per transaction
- **What's Needed:**
  ```bash
  FLUTTERWAVE_PUBLIC_KEY=FLWPUBK-...
  FLUTTERWAVE_SECRET_KEY=FLWSECK-...
  ```
- **Website:** https://flutterwave.com

**Payment Features Required:**
- Session payments (₦20,000 flat rate)
- Platform fee deduction (20%)
- Tutor payouts (80%)
- Subscription billing (books/resources)
- Coupon/promo code redemption
- VAT handling
- Refund processing
- Dispute management
- Payment history
- Invoice generation

---

## 🎥 **VIDEO CONFERENCING APIs (Required for Virtual Classroom)**

### 6. **Video Platform** (Not Yet Integrated ❌)
**Purpose:** Live tutoring sessions, screen sharing, recording

#### **Option A: Daily.co (Recommended)**
- **Free Tier:** 10,000 minutes/month
- **Paid Plans:** Starting at $99/month
- **What's Needed:**
  ```bash
  DAILY_API_KEY=...
  DAILY_DOMAIN=tutornest.daily.co
  ```
- **Website:** https://www.daily.co
- **Features:**
  - HD video/audio
  - Screen sharing
  - Recording
  - Whiteboard
  - Chat
  - Up to 100 participants

#### **Option B: Agora**
- **Free Tier:** 10,000 minutes/month
- **What's Needed:**
  ```bash
  AGORA_APP_ID=...
  AGORA_APP_CERTIFICATE=...
  ```
- **Website:** https://www.agora.io

#### **Option C: Twilio Video**
- **Pricing:** Pay-as-you-go
- **What's Needed:**
  ```bash
  TWILIO_ACCOUNT_SID=AC...
  TWILIO_API_KEY=SK...
  TWILIO_API_SECRET=...
  ```

#### **Option D: Zoom API** (Alternative)
- **Pricing:** Requires Zoom Pro account + API plan
- **What's Needed:**
  ```bash
  ZOOM_API_KEY=...
  ZOOM_API_SECRET=...
  ```

**Note:** Google Meet links are already integrated via Google Calendar API ✅

---

## 📊 **ANALYTICS & MONITORING (Recommended)**

### 7. **Application Monitoring** (Optional) ❌
**Purpose:** Error tracking, performance monitoring, user analytics

#### **Option A: Sentry**
- **Free Tier:** 5,000 errors/month
- **What's Needed:**
  ```bash
  SENTRY_DSN=https://...@sentry.io/...
  ```
- **Website:** https://sentry.io
- **Features:**
  - Error tracking
  - Performance monitoring
  - Release tracking

#### **Option B: LogRocket**
- **Free Tier:** 1,000 sessions/month
- **Features:**
  - Session replay
  - Error tracking
  - Performance monitoring

#### **Option C: Mixpanel/Amplitude**
- **Purpose:** User analytics, feature usage
- **Free Tier:** Available

---

## 🗺️ **LOCATION & MAP SERVICES (Optional)**

### 8. **Google Maps API** (Optional) ❌
**Purpose:** Tutor location display, distance calculations
- **What's Needed:**
  ```bash
  GOOGLE_MAPS_API_KEY=AIza...
  ```
- **Pricing:** $200 free credit/month
- **Use Cases:**
  - Show tutors on map
  - Calculate distance to student
  - Auto-complete addresses
  - Timezone detection

---

## 📁 **FILE STORAGE & CDN (Already Covered)**

### 9. **Supabase Storage** (Already Available ✅)
**Purpose:** Store profile pictures, documents, resources
- **What's Needed:** Already configured
- **Features:**
  - Profile pictures
  - Session reports (PDFs)
  - Educational resources
  - Tutor verification documents

**Alternative:** Cloudinary, AWS S3, UploadThing

---

## 🔒 **SECURITY & COMPLIANCE (Recommended)**

### 10. **reCAPTCHA** (Recommended) ❌
**Purpose:** Bot prevention, form protection
- **Free Tier:** Unlimited
- **What's Needed:**
  ```bash
  RECAPTCHA_SITE_KEY=6Lc...  # Frontend
  RECAPTCHA_SECRET_KEY=6Lc...  # Backend (secret)
  ```
- **Website:** https://www.google.com/recaptcha
- **Use Cases:**
  - Signup forms
  - Login attempts
  - Review submissions
  - Contact forms

---

## 🔍 **SEARCH & DISCOVERY (Future Enhancement)**

### 11. **Algolia Search** (Optional) ❌
**Purpose:** Fast tutor search, filtering, recommendations
- **Free Tier:** 10,000 searches/month
- **What's Needed:**
  ```bash
  ALGOLIA_APP_ID=...
  ALGOLIA_API_KEY=...  # Search-only key
  ALGOLIA_ADMIN_KEY=...  # Admin key (secret)
  ```
- **Features:**
  - Instant search
  - Typo tolerance
  - Faceted filters
  - Geo-search

---

## 📱 **PUSH NOTIFICATIONS (Future Enhancement)**

### 12. **Push Notification Service** (Optional) ❌

#### **Option A: OneSignal**
- **Free Tier:** Unlimited
- **What's Needed:**
  ```bash
  ONESIGNAL_APP_ID=...
  ONESIGNAL_API_KEY=...
  ```

#### **Option B: Firebase Cloud Messaging**
- **Free Tier:** Unlimited
- **What's Needed:**
  ```bash
  FCM_SERVER_KEY=...
  ```

---

## 🤖 **AI/ML SERVICES (Future Enhancement)**

### 13. **AI-Powered Features** (Optional) ❌

#### **OpenAI API**
**Purpose:** Smart matching, content moderation, chatbot
- **What's Needed:**
  ```bash
  OPENAI_API_KEY=sk-...
  ```
- **Use Cases:**
  - Smart tutor-student matching
  - Automated content moderation
  - Chatbot support
  - Learning recommendations

---

## 📝 **SUMMARY OF IMMEDIATE NEEDS**

### **Tier 1 - Essential (Must Have for Launch)**
1. ✅ **Supabase** - Already configured
2. ⚠️ **Google Calendar API** - Partially configured, needs OAuth setup
3. ❌ **Payment Gateway** (Stripe/Paystack) - Required for transactions
4. ❌ **Email Service** (SendGrid/Resend) - Required for notifications

### **Tier 2 - Highly Recommended (Within First Month)**
5. ❌ **Video Platform** (Daily.co/Agora) - For live sessions
6. ❌ **SMS Service** (Twilio) - For urgent notifications
7. ❌ **reCAPTCHA** - For security

### **Tier 3 - Nice to Have (Future Enhancements)**
8. ❌ Application Monitoring (Sentry)
9. ❌ Google Maps API
10. ❌ Push Notifications
11. ❌ Search Service (Algolia)
12. ❌ AI Services (OpenAI)

---

## 💰 **ESTIMATED MONTHLY COSTS (Starting Small)**

### **Minimum Viable Platform:**
- **Supabase:** $25/month (Pro plan)
- **SendGrid:** Free tier (100 emails/day) or $19.95/month
- **Google Calendar API:** Free
- **Stripe/Paystack:** Transaction fees only (no monthly fee)
- **Total:** $25-45/month

### **Growing Platform (1000+ users):**
- **Supabase:** $25/month
- **SendGrid:** $89.95/month (100k emails)
- **Daily.co:** $99/month (video)
- **Twilio:** ~$50/month (SMS)
- **Stripe:** Transaction fees
- **Total:** $264-300/month

---

## 🚀 **SETUP PRIORITY ORDER**

### **Week 1:**
1. ✅ Complete Google Calendar OAuth setup
2. ✅ Choose and integrate payment gateway (Stripe recommended)
3. ✅ Set up email service (SendGrid recommended)

### **Week 2:**
4. ✅ Integrate video platform (Daily.co recommended)
5. ✅ Add reCAPTCHA to forms
6. ✅ Test end-to-end payment flow

### **Week 3:**
7. ✅ Add SMS notifications (Twilio)
8. ✅ Set up monitoring (Sentry)
9. ✅ Load testing

### **Week 4:**
10. ✅ Final testing
11. ✅ Production deployment
12. ✅ Monitoring setup

---

## 📚 **DOCUMENTATION REFERENCES**

- **Google Calendar Setup:** `/docs/GOOGLE_OAUTH_SETUP_GUIDE.md`
- **Booking System:** `/docs/BOOKING_SYSTEM_TEST_CHECKLIST.md`
- **Email Integration:** `/IMPLEMENTATION_SUMMARY.md` (Step 6)
- **Student Auth Flow:** `/STUDENT_AUTH_FLOW.md`
- **Subscriptions:** `/SUBSCRIPTIONS_FEATURE.md`

---

## ⚠️ **IMPORTANT NOTES**

### **For Nigeria-Specific Implementation:**
- Consider **Paystack** over Stripe for lower fees and local payment methods
- Ensure VAT compliance (7.5% in Nigeria)
- Support local bank transfers, USSD payments
- Currency: NGN (₦)

### **GDPR/Data Privacy:**
- Email service must support unsubscribe
- User data export functionality
- Right to be forgotten implementation
- Cookie consent management

### **Scalability:**
- Start with free tiers
- Monitor usage closely
- Scale up as user base grows
- Consider multi-region deployment later

---

## 🔗 **QUICK LINKS TO SIGN UP**

- **Stripe:** https://dashboard.stripe.com/register
- **Paystack:** https://dashboard.paystack.com/signup
- **SendGrid:** https://signup.sendgrid.com/
- **Resend:** https://resend.com/signup
- **Daily.co:** https://dashboard.daily.co/signup
- **Twilio:** https://www.twilio.com/try-twilio
- **Google Cloud Console:** https://console.cloud.google.com/
- **Sentry:** https://sentry.io/signup/

---

**Last Updated:** December 1, 2025
**Version:** 1.0
**Maintained By:** TutorNest Development Team