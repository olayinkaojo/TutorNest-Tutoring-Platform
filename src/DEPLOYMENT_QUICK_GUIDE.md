# TutorNest - Deployment Quick Guide

## 📋 Products & Accounts Required

### 1. **Supabase** (Backend Infrastructure)
- **Website:** https://supabase.com
- **What:** Database + Auth + Storage + Serverless Functions
- **Why:** Complete backend in one platform, PostgreSQL, real-time features
- **Setup:** Create account → Create project → Get API keys

**Credentials Needed:**
```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=eyJhbGc... (public key)
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc... (secret key)
```

---

### 2. **Paystack** (Payment Processing)
- **Website:** https://paystack.com
- **What:** Nigerian payment gateway (cards, bank transfer, USSD)
- **Why:** #1 in Nigeria, local payment methods, 80/20 split support
- **Setup:** Create account → Complete KYC → Get API keys → Configure webhooks

**Credentials Needed:**
```
PAYSTACK_SECRET_KEY=sk_live_xxx (production)
PAYSTACK_TEST_SECRET_KEY=sk_test_xxx (testing)
PAYSTACK_WEBHOOK_SECRET=whsec_xxx
```

---

### 3. **Daily.co** (Video Calling)
- **Website:** https://daily.co
- **What:** WebRTC video conferencing
- **Why:** Simple API, embeddable, no WebRTC complexity
- **Setup:** Create account → Get API key

**Credentials Needed:**
```
DAILY_API_KEY=xxxxxxxxxxxxxxxxxxxxxxxx
```

**Alternative:** Google Meet (free, already integrated via Calendar)

---

### 4. **Google Cloud Platform** (Calendar Integration)
- **Website:** https://console.cloud.google.com
- **What:** Google Calendar API + Google Meet links
- **Why:** Universal adoption, free, cross-platform sync
- **Setup:** Create project → Enable Calendar API → Create OAuth credentials

**Credentials Needed:**
```
GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xxx
```

---

## 🚀 Deployment Steps

### Phase 1: Supabase Setup

```bash
# 1. Create account at https://supabase.com

# 2. Create new project
#    - Name: tutornest-production
#    - Database password: [strong password]
#    - Region: Frankfurt/London (closest to Nigeria)

# 3. Get credentials
#    Project Settings → API → Copy URL and keys

# 4. Install Supabase CLI
npm install -g supabase

# 5. Login
supabase login

# 6. Link to project
supabase link --project-ref YOUR_PROJECT_REF

# 7. Deploy edge functions
supabase functions deploy make-server-cbd74580

# 8. Set environment secrets
supabase secrets set SUPABASE_URL="https://YOUR_PROJECT.supabase.co"
supabase secrets set SUPABASE_ANON_KEY="your_anon_key"
supabase secrets set SUPABASE_SERVICE_ROLE_KEY="your_service_key"
supabase secrets set PAYSTACK_SECRET_KEY="sk_live_xxx"
supabase secrets set DAILY_API_KEY="your_daily_key"
supabase secrets set GOOGLE_CLIENT_ID="your_client_id"
supabase secrets set GOOGLE_CLIENT_SECRET="your_client_secret"

# 9. Create storage buckets
#    Storage → New Bucket (private):
#    - make-cbd74580-profile-images
#    - make-cbd74580-curriculum-pdfs
#    - make-cbd74580-assessments
#    - make-cbd74580-chat-attachments

# 10. Enable Row Level Security
#     Run SQL commands in SQL Editor (see RLS section below)
```

---

### Phase 2: Paystack Setup

```bash
# 1. Create account at https://paystack.com

# 2. Complete business verification
#    Settings → Business Details
#    Upload: CAC certificate, ID, bank details

# 3. Get API keys
#    Settings → API Keys & Webhooks
#    Copy: Secret Key

# 4. Configure webhook
#    Settings → Webhooks → Add Endpoint
#    URL: https://YOUR_PROJECT.supabase.co/functions/v1/make-server-cbd74580/webhooks/paystack
#    Events: charge.success, transfer.success, transfer.failed

# 5. Save webhook secret
#    Copy and add to Supabase secrets

# 6. Set up settlement account
#    Settings → Settlement Account
#    Add your bank account

# 7. Test with test keys first (sk_test_xxx)
```

---

### Phase 3: Daily.co Setup

```bash
# 1. Create account at https://daily.co

# 2. Get API key
#    Dashboard → Developers → API Keys

# 3. Configure room defaults (optional)
#    Settings → Room Defaults:
#    - Max participants: 2
#    - Enable screen sharing: Yes
#    - Enable chat: Yes

# 4. Test room creation
curl -X POST https://api.daily.co/v1/rooms \
  -H "Authorization: Bearer $DAILY_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"name":"test-room","privacy":"public"}'
```

---

### Phase 4: Google Calendar Setup

```bash
# 1. Go to https://console.cloud.google.com
#    Create New Project → Name: TutorNest

# 2. Enable Google Calendar API
#    APIs & Services → Library
#    Search "Google Calendar API" → Enable

# 3. Create OAuth credentials
#    APIs & Services → Credentials
#    Create Credentials → OAuth 2.0 Client ID
#    Type: Web application

# 4. Configure redirect URIs
#    Add these URLs:
https://YOUR_PROJECT.supabase.co/functions/v1/make-server-cbd74580/google/callback
https://your-domain.com/auth/google/callback
http://localhost:5173/auth/google/callback

# 5. Configure OAuth consent screen
#    OAuth consent screen → External
#    App name: TutorNest
#    Scopes: calendar, calendar.events

# 6. Copy Client ID and Secret
#    Save to Supabase secrets
```

---

### Phase 5: Frontend Deployment

**Option A: Vercel (Recommended)**

```bash
# 1. Install Vercel CLI
npm install -g vercel

# 2. Login
vercel login

# 3. Set environment variables in .env.production
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key

# 4. Deploy
vercel --prod

# 5. Configure custom domain (optional)
#    Vercel Dashboard → Domains → Add domain
```

**Option B: Netlify**

```bash
# 1. Install Netlify CLI
npm install -g netlify-cli

# 2. Login
netlify login

# 3. Initialize
netlify init

# 4. Set environment variables
#    Netlify Dashboard → Site Settings → Environment Variables

# 5. Deploy
netlify deploy --prod
```

---

### Phase 6: Database Security (Row Level Security)

Run these SQL commands in Supabase SQL Editor:

```sql
-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_gamification ENABLE ROW LEVEL SECURITY;

-- Users can view own profile
CREATE POLICY "Users view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

-- Users can update own profile
CREATE POLICY "Users update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- Public can view verified tutors
CREATE POLICY "Public view tutors" ON profiles
  FOR SELECT USING (role = 'tutor' AND verificationStatus = 'verified');

-- Users view their bookings
CREATE POLICY "Users view bookings" ON bookings
  FOR SELECT USING (
    auth.uid() = studentId OR 
    auth.uid() = tutorId OR 
    auth.uid() = parentId
  );

-- Users view their messages
CREATE POLICY "Users view messages" ON messages
  FOR SELECT USING (
    auth.uid() = senderId OR 
    auth.uid() = recipientId
  );

-- Users view their payments
CREATE POLICY "Users view payments" ON payments
  FOR SELECT USING (auth.uid() = userId);
```

---

## ✅ Testing Checklist

### Authentication
- [ ] User signup works
- [ ] User login works
- [ ] Email verification sent
- [ ] Password reset works
- [ ] Session persists

### Payments
- [ ] Payment initialization
- [ ] Paystack redirect
- [ ] Payment verification
- [ ] Webhook received
- [ ] Database updated
- [ ] 80/20 split calculated

### Video Calling
- [ ] Room creation
- [ ] Join URL works
- [ ] Video/audio works
- [ ] Screen sharing
- [ ] Room deletion

### Calendar
- [ ] OAuth flow works
- [ ] Event creation
- [ ] Google Meet link generated
- [ ] Event updates
- [ ] Event deletion

### Real-time
- [ ] Messages appear instantly
- [ ] Booking updates reflect
- [ ] Gamification updates

### Devices
- [ ] Desktop (Chrome, Firefox, Safari)
- [ ] Mobile (iOS Safari, Android Chrome)
- [ ] Tablet

---

## 🔧 Technology Stack Summary

### Frontend
- **React 18** - UI framework
- **TypeScript** - Type safety
- **Tailwind CSS v4** - Styling
- **Vite** - Build tool

### Backend
- **Deno** - Runtime
- **Hono.js** - Web framework
- **Supabase Edge Functions** - Serverless

### Database
- **PostgreSQL 15** - Primary database
- **Row Level Security** - Multi-tenant security

### Infrastructure
- **Supabase** - Backend platform
- **Vercel/Netlify** - Frontend hosting
- **Paystack** - Payments
- **Daily.co** - Video
- **Google Calendar** - Scheduling

---

## 🔌 API Endpoints

All backend routes are prefixed with: `/make-server-cbd74580/`

### Authentication
```
POST /make-server-cbd74580/signup
POST /make-server-cbd74580/signin
POST /make-server-cbd74580/signout
```

### Profiles
```
GET  /make-server-cbd74580/profiles/:userId
PUT  /make-server-cbd74580/profiles/:userId
```

### Bookings
```
POST /make-server-cbd74580/bookings
GET  /make-server-cbd74580/bookings/:bookingId
PUT  /make-server-cbd74580/bookings/:bookingId
```

### Payments
```
POST /make-server-cbd74580/payments/initialize
POST /make-server-cbd74580/payments/verify
POST /make-server-cbd74580/webhooks/paystack
```

### Messages
```
POST /make-server-cbd74580/messages
GET  /make-server-cbd74580/messages/conversation/:id
```

### Google Calendar
```
GET  /make-server-cbd74580/google/auth
GET  /make-server-cbd74580/google/callback
POST /make-server-cbd74580/google/create-event
```

---

## 📞 Support Resources

**Supabase:**
- Docs: https://supabase.com/docs
- Discord: https://discord.supabase.com
- Status: https://status.supabase.com

**Paystack:**
- Docs: https://paystack.com/docs
- Support: support@paystack.com
- Phone: +234 (0)1 888 7278

**Daily.co:**
- Docs: https://docs.daily.co
- Support: help@daily.co

**Google Calendar:**
- Docs: https://developers.google.com/calendar
- OAuth Playground: https://developers.google.com/oauthplayground

---

## 🎯 Architecture Diagram

```
Frontend (React + TypeScript + Tailwind)
         ↓ HTTPS
Backend (Supabase Edge Functions - Deno + Hono.js)
         ↓
Database (PostgreSQL 15 with RLS)
         ↓
Storage (Supabase Storage - Profile images, PDFs, Attachments)
         ↓
External APIs (Paystack, Daily.co, Google Calendar)
```

---

## 💡 Key Technical Decisions

### Why Supabase?
✅ Open-source (PostgreSQL)  
✅ Complete backend solution  
✅ Real-time features built-in  
✅ Global edge network  
✅ Excellent developer experience  

### Why Paystack?
✅ Nigerian market leader  
✅ Local payment methods (USSD, bank transfer, Verve)  
✅ Built-in 80/20 split payments  
✅ PCI DSS compliant  
✅ Automatic currency conversion  

### Why Daily.co?
✅ Simple REST API  
✅ Fully embeddable in iframe  
✅ No WebRTC complexity  
✅ Global edge network  
✅ Call quality analytics  

### Why PostgreSQL?
✅ ACID compliance (data integrity)  
✅ Perfect for relational data (parent-student-tutor)  
✅ Row Level Security (multi-tenant)  
✅ Advanced features (JSONB, full-text search)  
✅ 30+ years of maturity  

---

## 📝 Environment Variables Summary

**Frontend (.env.production):**
```bash
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGc...
```

**Backend (Supabase Secrets):**
```bash
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...
PAYSTACK_SECRET_KEY=sk_live_...
PAYSTACK_WEBHOOK_SECRET=whsec_...
DAILY_API_KEY=...
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
```

---

## 🚀 Quick Start Commands

```bash
# Clone and install
git clone <repo-url>
cd tutornest
npm install

# Set up environment
cp .env.example .env.local
# Edit .env.local with your Supabase credentials

# Start development
npm run dev

# Build for production
npm run build

# Deploy to Vercel
vercel --prod

# Deploy Supabase functions
supabase functions deploy make-server-cbd74580
```

---

**Document Version:** 1.0  
**Last Updated:** December 31, 2024  
**For:** TutorNest Platform Deployment
