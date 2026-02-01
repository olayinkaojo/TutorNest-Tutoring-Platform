# TutorNest Technical Architecture Document

## 📋 Executive Summary

TutorNest is a comprehensive global tutoring platform built with modern web technologies, focusing on scalability, security, and cost-effectiveness. The platform connects parents, students, and tutors through a role-based authentication system with real-time features for messaging, video calling, scheduling, and payment processing.

**Target Market:** Nigeria and Global  
**Primary Currency:** Nigerian Naira (₦)  
**Architecture Type:** Three-tier (Frontend → Backend → Database)  
**Deployment Model:** Serverless Edge Computing

---

## 🏗️ Architecture Overview

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLIENT LAYER                             │
│  React + TypeScript + Tailwind CSS (Hosted on Supabase Edge)   │
└─────────────────────────────────────────────────────────────────┘
                              ↕ HTTPS
┌─────────────────────────────────────────────────────────────────┐
│                      APPLICATION LAYER                           │
│        Supabase Edge Functions (Hono.js Server - Deno)          │
│  • Authentication & Authorization                                │
│  • Business Logic                                                │
│  • API Routing                                                   │
│  • Payment Processing                                            │
│  • External API Integration                                      │
└─────────────────────────────────────────────────────────────────┘
                              ↕ 
┌─────────────────────────────────────────────────────────────────┐
│                         DATA LAYER                               │
│                    Supabase Postgres                             │
│  • User Profiles & Authentication                                │
│  • Bookings & Sessions                                           │
│  • Messages & Chat                                               │
│  • Payments & Transactions                                       │
│  • Gamification Data                                             │
│  • Key-Value Store                                               │
└─────────────────────────────────────────────────────────────────┘
                              ↕
┌─────────────────────────────────────────────────────────────────┐
│                       STORAGE LAYER                              │
│                   Supabase Storage Buckets                       │
│  • Profile Images                                                │
│  • Curriculum PDFs                                               │
│  • Assessment Documents                                          │
│  • Chat Attachments                                              │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🔌 Integrations & APIs

### 1. **Supabase** (Primary Infrastructure Provider)

**What it provides:**
- PostgreSQL Database (Managed)
- Authentication & User Management
- Edge Functions (Serverless Backend)
- Real-time Database Subscriptions
- Object Storage
- Row Level Security (RLS)
- API Auto-generation

**Why Supabase:**
- ✅ Complete backend-as-a-service (reduces development time by 60%)
- ✅ Built-in authentication with JWT tokens
- ✅ Real-time capabilities out of the box
- ✅ PostgreSQL provides ACID compliance and complex queries
- ✅ Generous free tier for MVP/testing
- ✅ Scales automatically with usage
- ✅ Built on open-source technologies (vendor lock-in mitigation)
- ✅ Edge functions deploy globally for low latency

**Endpoints Used:**
```
Auth: https://{PROJECT_ID}.supabase.co/auth/v1
Database: https://{PROJECT_ID}.supabase.co/rest/v1
Storage: https://{PROJECT_ID}.supabase.co/storage/v1
Edge Functions: https://{PROJECT_ID}.supabase.co/functions/v1
```

**API Keys Required:**
- `SUPABASE_URL` - Project URL
- `SUPABASE_ANON_KEY` - Public anonymous key (safe for frontend)
- `SUPABASE_SERVICE_ROLE_KEY` - Admin key (backend only, full access)

---

### 2. **Paystack** (Payment Gateway)

**What it provides:**
- Payment processing for Nigerian market
- Card payments (Visa, Mastercard, Verve)
- Bank transfers
- USSD payments
- Mobile money
- Foreign card support with automatic NGN conversion
- Webhook notifications
- Transaction verification

**Why Paystack:**
- ✅ **#1 payment provider in Nigeria** - optimized for West African market
- ✅ Supports Nigerian banks and local payment methods
- ✅ Automatic currency conversion for foreign cards
- ✅ Lower transaction fees than alternatives (1.5% + ₦100)
- ✅ Built-in fraud detection
- ✅ PCI DSS Level 1 compliant
- ✅ Excellent API documentation
- ✅ Real-time webhook notifications
- ✅ Split payment support (80/20 revenue split)

**Endpoints:**
```
Initialize Transaction: https://api.paystack.co/transaction/initialize
Verify Transaction: https://api.paystack.co/transaction/verify/{reference}
Create Transfer Recipient: https://api.paystack.co/transferrecipient
Initiate Transfer: https://api.paystack.co/transfer
```

**API Keys Required:**
- `PAYSTACK_SECRET_KEY` - Server-side API key
- `PAYSTACK_PUBLIC_KEY` - Client-side publishable key (optional)

**Transaction Fees:**
- Local cards: 1.5% + ₦100 (capped at ₦2,000)
- International cards: 3.9% + ₦100
- Bank transfers: ₦50 flat fee

**Implementation in TutorNest:**
- Session payments (₦14,000 - ₦28,000 per session)
- Subscription payments (books and resources)
- 80/20 revenue split (80% to tutor, 20% to platform)
- Automated tutor payouts

---

### 3. **Daily.co** (Video Calling)

**What it provides:**
- WebRTC video conferencing
- Screen sharing
- Recording capabilities
- Chat during calls
- Room management API
- Call quality analytics

**Why Daily.co:**
- ✅ Simple REST API for creating video rooms
- ✅ No complex WebRTC setup required
- ✅ Embeddable in iframes or React components
- ✅ Generous free tier (10,000 minutes/month)
- ✅ Global edge network for low latency
- ✅ Built-in recording and transcription
- ✅ HIPAA and GDPR compliant

**Endpoints:**
```
Create Room: https://api.daily.co/v1/rooms
Delete Room: https://api.daily.co/v1/rooms/{room_name}
Get Room Info: https://api.daily.co/v1/rooms/{room_name}
```

**API Keys Required:**
- `DAILY_API_KEY` - API key for room management

**Usage Pattern:**
- Create temporary room for each tutoring session
- Room name: `tutornest-{bookingId}`
- Auto-expire after session end time
- Recording optional (parent/tutor consent)

---

### 4. **Google Calendar API** (Calendar Integration)

**What it provides:**
- Calendar event creation
- Event updates and deletion
- Calendar sync
- Google Meet integration
- Availability checking

**Why Google Calendar:**
- ✅ Industry standard for scheduling
- ✅ Users already familiar with the interface
- ✅ Cross-platform (web, mobile, desktop)
- ✅ Automatic reminders and notifications
- ✅ Google Meet integration for backup video
- ✅ Free to use (no API costs)

**Endpoints:**
```
OAuth: https://accounts.google.com/o/oauth2/v2/auth
Token Exchange: https://oauth2.googleapis.com/token
Events: https://www.googleapis.com/calendar/v3/calendars/{calendarId}/events
```

**OAuth Scopes Required:**
- `https://www.googleapis.com/auth/calendar`
- `https://www.googleapis.com/auth/calendar.events`

**Setup Required:**
- Google Cloud Project
- OAuth 2.0 Client ID and Secret
- Authorized redirect URIs

---

### 5. **Unsplash API** (Stock Images)

**What it provides:**
- Free high-quality stock photos
- Search functionality
- Attribution tracking

**Why Unsplash:**
- ✅ Free for development
- ✅ High-quality curated images
- ✅ Simple API
- ✅ No attribution required in many cases

**Usage Pattern:**
- Development and prototyping only
- Replace with custom uploads in production

---

## 💾 Database Architecture

### Database: **PostgreSQL 15** (via Supabase)

**Why PostgreSQL:**
- ✅ ACID compliance ensures data integrity
- ✅ Advanced querying (JSON, full-text search, geospatial)
- ✅ Excellent performance for relational data
- ✅ Open-source with massive community
- ✅ Row Level Security (RLS) for multi-tenant security
- ✅ Triggers and functions for complex business logic

### Core Tables Structure:

```sql
-- User Profiles (multi-role support)
profiles (
  id, email, full_name, phone, location, 
  role, availableRoles, currentRole,
  onboardingComplete, created_at, ...
)

-- Bookings & Sessions
bookings (
  id, studentId, tutorId, parentId,
  subject, sessionDate, sessionTime, duration,
  status, paymentStatus, totalAmount, platformFee,
  tutorEarnings, ...
)

-- Messages & Chat
messages (
  id, senderId, recipientId, content,
  timestamp, read, attachments, ...
)

-- Payments & Transactions
payments (
  id, userId, bookingId, amount,
  currency, status, paystackReference,
  paymentMethod, ...
)

-- Gamification
student_gamification (
  studentId, xp, level, rank, streak,
  lastActivityDate, achievements, ...
)

trivia_questions (
  id, subject, grade, question,
  options, correctAnswer, difficulty, ...
)

-- Key-Value Store (flexible data storage)
kv_store_cbd74580 (
  key, value, created_at, updated_at
)
```

### Row Level Security (RLS)

All tables have RLS policies ensuring:
- Users can only access their own data
- Tutors can only see their assigned students
- Parents can only see their children's data
- Admins have elevated access for management

---

## 🖥️ Frontend Technology Stack

### Core Framework: **React 18 + TypeScript**

**Why React:**
- ✅ Component reusability (DRY principle)
- ✅ Large ecosystem and community
- ✅ Virtual DOM for performance
- ✅ Easy state management
- ✅ Excellent developer tools

**Why TypeScript:**
- ✅ Type safety reduces bugs by 15-30%
- ✅ Better IDE autocomplete and refactoring
- ✅ Self-documenting code
- ✅ Easier team collaboration

### Styling: **Tailwind CSS v4**

**Why Tailwind:**
- ✅ Utility-first approach = faster development
- ✅ Small bundle size (only used classes included)
- ✅ Consistent design system
- ✅ Responsive design built-in
- ✅ No CSS naming conflicts
- ✅ Easy customization with tokens

### UI Components: **shadcn/ui**

**Why shadcn/ui:**
- ✅ Copy-paste components (no dependency bloat)
- ✅ Built on Radix UI (accessibility-first)
- ✅ Fully customizable
- ✅ TypeScript native
- ✅ Tailwind compatible

### Key Libraries:

```json
{
  "react": "^18.x",
  "typescript": "^5.x",
  "tailwindcss": "^4.x",
  "lucide-react": "Icons",
  "recharts": "Charts and analytics",
  "react-hook-form@7.55.0": "Form management",
  "sonner@2.0.3": "Toast notifications",
  "motion/react": "Animations",
  "react-slick": "Carousels"
}
```

---

## 🔧 Backend Technology Stack

### Runtime: **Deno** (via Supabase Edge Functions)

**Why Deno:**
- ✅ Secure by default (no file/network access without permission)
- ✅ TypeScript native (no compilation needed)
- ✅ Modern standard library
- ✅ npm compatibility
- ✅ Fast startup time for serverless
- ✅ Built-in testing and formatting

### Web Framework: **Hono.js**

**Why Hono:**
- ✅ Ultrafast (designed for edge computing)
- ✅ Express-like API (easy learning curve)
- ✅ TypeScript first-class support
- ✅ Middleware ecosystem
- ✅ Works with Deno, Cloudflare Workers, Bun
- ✅ Small footprint (~10KB)

### Backend Structure:

```
/supabase/functions/server/
├── index.tsx                    # Main server entry
├── kv_store.tsx                 # Key-value utilities
├── profile-routes.tsx           # User profile endpoints
├── booking-routes.tsx           # Session booking endpoints
├── payment-routes.tsx           # Paystack integration
├── messaging-routes.tsx         # Chat endpoints
├── gamification-routes.tsx      # XP, levels, achievements
├── google-calendar-routes.tsx   # Calendar integration
├── parent-children-routes.tsx   # Parent-child linking
├── assessments-routes.tsx       # Student assessments
└── curriculum-routes.tsx        # PDF management
```

### API Route Pattern:

All routes prefixed with `/make-server-cbd74580/`

Example endpoints:
```
POST   /make-server-cbd74580/signup
POST   /make-server-cbd74580/signin
GET    /make-server-cbd74580/profiles/:userId
PUT    /make-server-cbd74580/profiles/:userId
POST   /make-server-cbd74580/bookings
GET    /make-server-cbd74580/bookings/:bookingId
POST   /make-server-cbd74580/payments/initialize
POST   /make-server-cbd74580/messages
GET    /make-server-cbd74580/messages/:conversationId
```

---

## 💰 Cost Breakdown & Pricing

### 1. **Supabase Costs**

#### Free Tier (Development & MVP):
- ✅ 500 MB database space
- ✅ 1 GB file storage
- ✅ 2 GB bandwidth
- ✅ 50,000 monthly active users
- ✅ 500K Edge Function invocations
- ✅ Unlimited API requests
- ✅ 2 GB Realtime connections

**Cost: $0/month**

#### Pro Tier (Production - Recommended):
- 8 GB database space
- 100 GB file storage
- 250 GB bandwidth
- Unlimited monthly active users
- 2M Edge Function invocations
- Daily backups
- Point-in-time recovery
- Email support

**Cost: $25/month** (~₦37,500/month at ₦1,500/$)

#### Team Tier (Scale):
- Everything in Pro
- Additional compute resources
- Priority support
- Advanced security features

**Cost: $599/month** (~₦898,500/month)

**Estimated Usage for First 1000 Users:**
- Database: ~2 GB
- Storage: ~10 GB (profile pics, PDFs)
- Bandwidth: ~50 GB/month
- Edge Functions: ~500K invocations/month

**Recommended Start: Pro Tier** ($25/month)

---

### 2. **Paystack Costs**

**No Monthly Fee** - Pay per transaction only

#### Transaction Fees:
- **Local Nigerian cards:** 1.5% + ₦100 (capped at ₦2,000)
- **International cards:** 3.9% + ₦100
- **Bank transfers:** ₦50 flat fee

#### Example Calculations (₦20,000 session):

**Local card payment:**
```
Transaction Amount: ₦20,000
Paystack Fee: (₦20,000 × 1.5%) + ₦100 = ₦400
Net Amount: ₦19,600
```

**Platform receives:** ₦19,600
- Tutor gets (80%): ₦15,680
- Platform keeps (20%): ₦3,920

**Platform net after Paystack fee:**
₦3,920 - ₦400 = ₦3,520 per session

#### Monthly Estimate (100 sessions):
```
Gross: ₦2,000,000 (100 × ₦20,000)
Paystack Fees: ~₦40,000
Tutor Payouts: ₦1,568,000
Platform Revenue: ₦352,000
```

**No minimum fee** - You only pay when you earn

---

### 3. **Daily.co (Video Calling) Costs**

#### Free Tier:
- ✅ 10,000 participant minutes/month
- ✅ Unlimited rooms
- ✅ Screen sharing
- ✅ Chat
- ✅ Recording

**Cost: $0/month**

**Usage calculation:**
- 1-hour session = 60 minutes × 2 participants = 120 participant minutes
- 10,000 minutes ÷ 120 = ~83 sessions/month free

#### Developer Tier:
- 100,000 participant minutes/month
- Everything in Free
- Email support

**Cost: $99/month** (~₦148,500/month)

**Covers:** ~833 one-hour sessions/month

#### Business Tier:
- 1,000,000 participant minutes/month
- Priority support
- SLA guarantees

**Cost: $299/month** (~₦448,500/month)

**Covers:** ~8,333 one-hour sessions/month

**Recommended Start: Free Tier** (sufficient for first 80 sessions/month)

---

### 4. **Google Calendar API**

**Cost: FREE**

- No usage fees
- No quota limits for reasonable use
- 1,000,000 requests/day limit (more than sufficient)

**Only requirement:** Google Cloud Project (free)

---

### 5. **Domain & SSL**

#### Domain Registration:
- `.com` domain: ~$12/year (~₦18,000/year)
- `.ng` domain: ~₦5,000/year
- `.com.ng` domain: ~₦2,500/year

**Recommended: tutornest.com.ng** (~₦2,500/year)

#### SSL Certificate:
**FREE via Supabase** (automatic Let's Encrypt)

---

### 6. **Email Service (Optional)**

For transactional emails (booking confirmations, password resets):

#### SendGrid Free Tier:
- 100 emails/day (3,000/month)
- Cost: $0/month

#### SendGrid Essentials:
- 50,000 emails/month
- Cost: $19.95/month (~₦30,000/month)

**Alternative: Supabase Auth Emails (FREE)**
- Built-in email sending for auth flows
- Limited customization

**Recommended Start: Supabase Auth Emails** (free)

---

### 7. **Monitoring & Analytics (Optional)**

#### Sentry (Error Tracking):
- Free tier: 5,000 errors/month
- Cost: $0/month

#### Google Analytics:
- Completely free
- No limits

**Cost: $0/month**

---

## 💵 Total Cost Summary

### Minimum Viable Product (MVP) - First 3 months:

```
Supabase (Free Tier)              ₦0/month
Paystack (Transaction-based)      ₦0 (pay only on earnings)
Daily.co (Free Tier)              ₦0/month
Google Calendar API               ₦0/month
Domain (.com.ng)                  ₦2,500/year (₦208/month)
SSL Certificate                   ₦0/month (via Supabase)
Email (Supabase Auth)             ₦0/month
─────────────────────────────────────────────
TOTAL MONTHLY:                    ~₦208/month (~$0.14/month)
TOTAL YEARLY:                     ~₦2,500/year (~$1.67/year)
```

**EFFECTIVELY FREE** until you have paying customers!

---

### Production Scale (1000+ users, 100-500 sessions/month):

```
Supabase Pro Tier                 ₦37,500/month
Paystack (500 sessions @ ₦20k)    ₦200,000 in fees (from ₦10M revenue)
Daily.co Developer Tier           ₦148,500/month
Google Calendar API               ₦0/month
Domain (.com.ng)                  ₦208/month
SSL Certificate                   ₦0/month
Email (SendGrid Essentials)       ₦30,000/month
─────────────────────────────────────────────
TOTAL MONTHLY:                    ₦216,208/month (~$144/month)
TOTAL YEARLY:                     ₦2,594,496/year (~$1,730/year)
```

**But with ₦10M/month revenue:**
- Gross Revenue: ₦10,000,000
- Payment Fees: -₦200,000
- Infrastructure: -₦216,208
- Tutor Payouts (80%): -₦7,840,000
- **Net Platform Revenue: ₦1,743,792/month** (~₦20.9M/year)

**ROI:** 805% return on infrastructure investment

---

### Enterprise Scale (10,000+ users, 5000+ sessions/month):

```
Supabase Team Tier                ₦898,500/month
Paystack (5000 sessions)          ₦2,000,000 in fees (from ₦100M revenue)
Daily.co Business Tier            ₦448,500/month
Google Calendar API               ₦0/month
Domain + CDN                      ₦50,000/month
SSL & Security                    ₦0/month
SendGrid (200K emails)            ₦100,000/month
Error Tracking (Sentry)           ₦45,000/month
─────────────────────────────────────────────
TOTAL MONTHLY:                    ₦3,542,000/month (~$2,361/month)
TOTAL YEARLY:                     ₦42,504,000/year (~$28,336/year)
```

**But with ₦100M/month revenue:**
- Gross Revenue: ₦100,000,000
- Payment Fees: -₦2,000,000
- Infrastructure: -₦3,542,000
- Tutor Payouts (80%): -₦78,400,000
- **Net Platform Revenue: ₦16,058,000/month** (~₦192.7M/year)

**ROI:** 453% return on infrastructure investment

---

## 🚀 Deployment Requirements

### Prerequisites:

1. **Supabase Account** (supabase.com)
   - Create new project
   - Note down: URL, Anon Key, Service Role Key
   - Enable email authentication

2. **Paystack Account** (paystack.com)
   - Create account (Nigerian business required for full features)
   - Complete KYC verification
   - Note down: Secret Key, Public Key
   - Set up webhook URL

3. **Daily.co Account** (daily.co)
   - Sign up for free account
   - Note down: API Key

4. **Google Cloud Project** (console.cloud.google.com)
   - Create new project
   - Enable Google Calendar API
   - Create OAuth 2.0 credentials
   - Note down: Client ID, Client Secret
   - Add authorized redirect URIs

5. **Domain Name** (optional but recommended)
   - Register via Namecheap, GoDaddy, or Nigerian registrar
   - Point to Supabase custom domain

---

### Deployment Steps:

#### 1. **Set Up Supabase Project**

```bash
# Install Supabase CLI
npm install -g supabase

# Login to Supabase
supabase login

# Link to your project
supabase link --project-ref YOUR_PROJECT_REF

# Deploy database migrations (if any)
supabase db push

# Deploy edge functions
supabase functions deploy make-server-cbd74580
```

#### 2. **Configure Environment Variables**

In Supabase Dashboard → Project Settings → Edge Functions → Secrets:

```bash
SUPABASE_URL=https://YOUR_PROJECT.supabase.co
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
PAYSTACK_SECRET_KEY=your_paystack_secret
DAILY_API_KEY=your_daily_api_key
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
```

#### 3. **Deploy Frontend**

Supabase automatically hosts your frontend when you push code:

```bash
# Build the frontend
npm run build

# Deploy to Supabase Storage (static hosting)
# OR deploy to Vercel/Netlify for better CDN
```

**Alternative: Vercel Deployment** (Recommended for better performance)

```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
vercel --prod
```

Vercel is **FREE** for frontend hosting!

#### 4. **Set Up Webhooks**

**Paystack Webhook:**
- URL: `https://YOUR_PROJECT.supabase.co/functions/v1/make-server-cbd74580/webhooks/paystack`
- Events: `charge.success`, `transfer.success`

**Set up in:** Paystack Dashboard → Settings → Webhooks

#### 5. **Configure CORS**

In your Supabase backend (`index.tsx`):

```typescript
import { cors } from 'npm:hono/cors'

app.use('*', cors({
  origin: [
    'https://your-domain.com',
    'http://localhost:5173' // Development
  ],
  credentials: true,
}))
```

#### 6. **Enable Row Level Security (RLS)**

Run these SQL commands in Supabase SQL Editor:

```sql
-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- Create policies (examples)
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);
```

---

## 🔒 Security Considerations

### 1. **Authentication & Authorization**
- JWT tokens with automatic refresh
- Row Level Security (RLS) on all database tables
- Role-based access control (RBAC)
- Session management via Supabase Auth
- Password hashing (bcrypt via Supabase)

### 2. **API Security**
- All endpoints require authentication (Bearer tokens)
- Rate limiting on Supabase Edge
- CORS configuration
- Input validation and sanitization
- SQL injection prevention (parameterized queries)

### 3. **Payment Security**
- PCI DSS compliance via Paystack
- Server-side payment verification
- Webhook signature verification
- No card details stored locally
- HTTPS only for all transactions

### 4. **Data Privacy (GDPR/NDPR Compliant)**
- User data encryption at rest
- TLS 1.3 encryption in transit
- Right to deletion (account deletion feature)
- Data export capability
- Audit logs for admin actions
- Parent consent for student accounts

### 5. **Video Call Security**
- Temporary room URLs (expire after session)
- Room names with UUIDs (non-guessable)
- Optional recording with consent
- No call data stored by default

---

## 📊 Scalability & Performance

### Database Performance:
- **Indexing:** All foreign keys and frequently queried fields indexed
- **Connection Pooling:** Supabase handles automatically
- **Query Optimization:** Use of prepared statements
- **Caching:** Supabase has built-in caching for reads

### Expected Performance:
- API Response Time: <200ms (global average)
- Database Queries: <50ms (indexed queries)
- Real-time Updates: <100ms latency
- Video Call Connection: <2 seconds

### Scaling Strategy:

**0-1,000 users:** Free/Pro tier sufficient  
**1,000-10,000 users:** Pro tier + optimizations  
**10,000-100,000 users:** Team tier + read replicas  
**100,000+ users:** Enterprise tier + custom solutions

### Auto-scaling Features:
- Supabase automatically scales database connections
- Edge functions scale horizontally
- CDN caching for static assets
- Load balancing built-in

---

## 🛠️ Development Environment Setup

### Local Development:

```bash
# Clone repository
git clone <repo-url>
cd tutornest

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env

# Required in .env file:
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_anon_key

# Start development server
npm run dev

# Server runs on http://localhost:5173
```

### Backend Development:

```bash
# Start Supabase locally (optional)
supabase start

# This starts:
# - Postgres database on localhost:54322
# - API server on localhost:54321
# - Studio on localhost:54323

# Deploy functions locally
supabase functions serve

# Test edge function
curl http://localhost:54321/functions/v1/make-server-cbd74580/health
```

### Testing:

```bash
# Run tests (if configured)
npm run test

# Type checking
npm run type-check

# Linting
npm run lint
```

---

## 📦 Technology Alternatives Considered

### Why NOT Firebase?
- ❌ Vendor lock-in (proprietary NoSQL)
- ❌ More expensive at scale
- ❌ Limited SQL querying
- ✅ Supabase: Open-source, PostgreSQL, better pricing

### Why NOT MongoDB/NoSQL?
- ❌ Complex relational data (parents-students-tutors)
- ❌ Transaction requirements (payments)
- ❌ Need for ACID compliance
- ✅ PostgreSQL: Better for structured data with relationships

### Why NOT AWS Lambda?
- ❌ More complex setup
- ❌ Requires multiple services (RDS, S3, API Gateway)
- ❌ Higher costs for small projects
- ✅ Supabase Edge: All-in-one, simpler, cheaper

### Why NOT Stripe?
- ❌ Optimized for Western markets
- ❌ Higher fees for Nigerian users
- ❌ Limited local payment methods
- ✅ Paystack: Built for Nigeria, better local support

### Why NOT Zoom/Twilio?
- ❌ More expensive
- ❌ Complex integration
- ✅ Daily.co: Simpler API, better free tier

---

## 🎯 Success Metrics & Monitoring

### Key Metrics to Track:

**Business Metrics:**
- Monthly Recurring Revenue (MRR)
- Customer Acquisition Cost (CAC)
- Lifetime Value (LTV)
- Churn rate
- Active sessions/month

**Technical Metrics:**
- API uptime (target: 99.9%)
- Average response time (target: <200ms)
- Error rate (target: <0.1%)
- Database query time (target: <50ms)
- Page load time (target: <3s)

**User Metrics:**
- Daily Active Users (DAU)
- Monthly Active Users (MAU)
- Session completion rate
- Payment success rate
- User retention (30-day, 90-day)

### Monitoring Tools:

**Built-in (Supabase):**
- Database performance metrics
- API request logs
- Edge function logs
- Authentication events

**Optional (Free):**
- Google Analytics (user behavior)
- Sentry (error tracking)
- Uptime Robot (uptime monitoring)

---

## 📋 Compliance & Legal

### Data Protection:
- **GDPR** (EU): User consent, right to deletion, data portability
- **NDPR** (Nigeria): Data protection registration, user consent
- **COPPA** (US): Parental consent for users under 13

### Payment Compliance:
- **PCI DSS**: Handled by Paystack (Level 1 compliant)
- **Anti-Money Laundering (AML)**: Paystack handles KYC
- **Tax Compliance**: VAT handling on platform fees

### Terms of Service:
- User agreements
- Tutor agreements
- Privacy policy
- Refund policy
- Code of conduct

**Recommendation:** Consult with Nigerian legal counsel for:
- Business registration (CAC)
- Tax registration (FIRS)
- Data protection registration (NITDA)

---

## 🔄 Backup & Disaster Recovery

### Automated Backups (Supabase Pro+):
- Daily automatic backups
- 7-day retention (Pro tier)
- 30-day retention (Team tier)
- Point-in-time recovery

### Manual Backups:
```bash
# Export database
supabase db dump -f backup.sql

# Export storage
supabase storage export
```

### Disaster Recovery Plan:
1. **Database Failure:** Restore from daily backup (<1 hour RTO)
2. **Edge Function Failure:** Redeploy from Git (<15 minutes)
3. **Payment Gateway Failure:** Manual payment processing fallback
4. **Video Service Failure:** Switch to Google Meet backup

**Recovery Time Objective (RTO):** <2 hours  
**Recovery Point Objective (RPO):** <24 hours

---

## 🚦 Go-Live Checklist

### Pre-Launch:
- [ ] All environment variables configured
- [ ] Database migrations applied
- [ ] RLS policies enabled on all tables
- [ ] Payment gateway webhooks configured
- [ ] Video calling tested end-to-end
- [ ] Email notifications working
- [ ] SSL certificate active
- [ ] Domain configured
- [ ] CORS properly set
- [ ] Error monitoring enabled
- [ ] Backup strategy in place
- [ ] Load testing completed
- [ ] Security audit completed
- [ ] Privacy policy published
- [ ] Terms of service published

### Post-Launch:
- [ ] Monitor error rates
- [ ] Check API response times
- [ ] Verify payment flows
- [ ] Test booking confirmations
- [ ] Monitor user signups
- [ ] Check email deliverability
- [ ] Verify video calls working
- [ ] Test on multiple devices/browsers

---

## 📞 Support & Resources

### Supabase:
- Docs: https://supabase.com/docs
- Discord: https://discord.supabase.com
- Support: support@supabase.io (Pro+ tier)

### Paystack:
- Docs: https://paystack.com/docs
- Support: support@paystack.com
- Phone: +234 (0)1 888 7278

### Daily.co:
- Docs: https://docs.daily.co
- Support: help@daily.co

### Google Calendar API:
- Docs: https://developers.google.com/calendar
- Support: Google Cloud Support

---

## 🎓 Training & Documentation

### For Developers:
- API documentation (auto-generated via Supabase)
- Code comments and JSDoc
- README files for each module
- Architecture diagrams

### For End Users:
- User guides (parents, students, tutors)
- Video tutorials
- FAQ section
- In-app help tooltips

### For Administrators:
- Admin dashboard guide
- Payment management guide
- User moderation guide
- Analytics interpretation

---

## 📈 Future Enhancements

### Phase 1 (3-6 months):
- Mobile apps (React Native)
- Advanced analytics dashboard
- AI-powered tutor matching
- Automated scheduling

### Phase 2 (6-12 months):
- Multi-currency support
- Offline mode capabilities
- Advanced gamification
- Content marketplace

### Phase 3 (12-24 months):
- White-label solutions for schools
- API for third-party integrations
- Machine learning for personalization
- Blockchain certificates (optional)

---

## 💡 Conclusion

TutorNest is built on a modern, scalable, and cost-effective technology stack that:

✅ **Minimizes upfront costs** (can start with <₦3,000/month)  
✅ **Scales automatically** with user growth  
✅ **Provides excellent user experience** with real-time features  
✅ **Ensures security and compliance** for a trust-based platform  
✅ **Optimized for Nigerian market** while being globally accessible  
✅ **Built on open-source technologies** to avoid vendor lock-in  
✅ **Generates sustainable revenue** with 80/20 split model  

**Total Cost to Launch MVP:** ~₦2,500/year  
**Total Cost at 1000 users:** ~₦216,000/month  
**Expected Revenue at 1000 users (500 sessions):** ~₦1,750,000/month  
**Net Profit Margin:** ~88%

**The architecture is production-ready and can scale from 10 to 100,000+ users without major changes.**

---

## 📄 Document Control

**Version:** 1.0  
**Last Updated:** December 31, 2024  
**Author:** TutorNest Development Team  
**Classification:** Internal/Confidential  

**Next Review:** March 31, 2025
