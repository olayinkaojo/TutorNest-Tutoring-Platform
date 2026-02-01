# TutorNest Technical Setup & Integration Guide

## 📋 Executive Summary

TutorNest is a comprehensive tutoring platform built on modern web technologies with a serverless, edge-computing architecture. This document provides detailed technical information about all integrations, APIs, products, and setup requirements.

**Architecture Type:** Three-tier serverless (Frontend → Edge Functions → Database)  
**Primary Market:** Nigeria and Global  
**Technology Philosophy:** Open-source, scalable, security-first

---

## 🏗️ System Architecture

### High-Level Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                      FRONTEND LAYER                              │
│                                                                  │
│  React 18 + TypeScript + Tailwind CSS                           │
│  • Role-based dashboards (Parent, Student, Tutor, Admin)        │
│  • Real-time messaging interface                                │
│  • Payment processing UI                                        │
│  • Video calling interface                                      │
│  • Gamification system                                          │
│                                                                  │
│  Hosted on: Supabase Edge / Vercel / Netlify                   │
└─────────────────────────────────────────────────────────────────┘
                              ↕ HTTPS/WSS
┌─────────────────────────────────────────────────────────────────┐
│                   APPLICATION LAYER                              │
│                                                                  │
│  Supabase Edge Functions (Deno Runtime + Hono.js)               │
│  • User authentication & authorization                           │
│  • Business logic processing                                    │
│  • Payment processing coordination                              │
│  • External API orchestration                                   │
│  • Real-time event handling                                     │
│  • File upload management                                       │
│                                                                  │
│  Global Edge Network: Auto-scaling, Low Latency                 │
└─────────────────────────────────────────────────────────────────┘
                              ↕ 
┌─────────────────────────────────────────────────────────────────┐
│                      DATA LAYER                                  │
│                                                                  │
│  Supabase PostgreSQL 15                                         │
│  • User profiles & authentication data                          │
│  • Bookings & session records                                   │
│  • Messages & conversations                                     │
│  • Payment transactions                                         │
│  • Gamification data (XP, achievements, streaks)                │
│  • Curriculum & assessment data                                 │
│  • Key-value store for flexible data                            │
│                                                                  │
│  Features: ACID compliance, RLS, Real-time subscriptions        │
└─────────────────────────────────────────────────────────────────┘
                              ↕
┌─────────────────────────────────────────────────────────────────┐
│                     STORAGE LAYER                                │
│                                                                  │
│  Supabase Storage (S3-compatible)                               │
│  • User profile images                                          │
│  • Curriculum PDFs                                              │
│  • Assessment documents                                         │
│  • Chat attachments                                             │
│                                                                  │
│  Features: Private buckets, Signed URLs, CDN distribution       │
└─────────────────────────────────────────────────────────────────┘
                              ↕
┌─────────────────────────────────────────────────────────────────┐
│                  EXTERNAL INTEGRATIONS                           │
│                                                                  │
│  Paystack          Daily.co          Google Calendar            │
│  Payment Gateway   Video Calling     Scheduling                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🔌 Core Integrations & Products

### 1. **Supabase** (Backend Infrastructure)

**Official Website:** https://supabase.com

#### What It Provides:
- **PostgreSQL Database** - Fully managed, auto-scaling relational database
- **Authentication Service** - Built-in user authentication with JWT tokens
- **Edge Functions** - Serverless functions running on Deno runtime
- **Real-time Engine** - WebSocket-based real-time data synchronization
- **Object Storage** - S3-compatible blob storage
- **Auto-generated REST API** - Instant API from database schema
- **Row Level Security (RLS)** - Database-level authorization

#### Why Supabase:

**Technical Reasons:**
- ✅ **Open-source foundation** - Built on PostgreSQL, no vendor lock-in
- ✅ **Complete backend solution** - Database + Auth + Storage + Functions in one platform
- ✅ **Real-time capabilities** - Native WebSocket support for live updates
- ✅ **Edge computing** - Functions deploy globally for low latency
- ✅ **Developer experience** - Excellent CLI, migration tools, and local development
- ✅ **Type safety** - Auto-generated TypeScript types from database schema
- ✅ **Security** - Row Level Security provides multi-tenant isolation at database level
- ✅ **Scalability** - Connection pooling, read replicas, automatic scaling

**Alternative Considered:** Firebase  
**Why Not Firebase:** Proprietary NoSQL (Firestore) lacks relational capabilities needed for parent-student-tutor relationships; higher costs at scale; vendor lock-in

**Alternative Considered:** AWS (Lambda + RDS + S3)  
**Why Not AWS:** More complex setup requiring multiple services; steeper learning curve; longer development time

#### Supabase Components Used:

##### 1. PostgreSQL Database
- **Version:** PostgreSQL 15
- **Purpose:** Primary data store for all application data
- **Key Features Used:**
  - JSONB columns for flexible data structures
  - Foreign key relationships for data integrity
  - Triggers for automated workflows
  - Full-text search for tutor/subject search
  - Row Level Security for multi-tenant data isolation

##### 2. Supabase Auth
- **Purpose:** User authentication and session management
- **Authentication Methods:**
  - Email/Password signup and login
  - OAuth providers (Google, Facebook, GitHub) support
  - Magic links (email-based passwordless auth)
- **Features Used:**
  - JWT token-based authentication
  - Automatic token refresh
  - User metadata storage
  - Email verification
  - Password reset flows

##### 3. Supabase Edge Functions
- **Runtime:** Deno (TypeScript-native)
- **Purpose:** Backend API endpoints and business logic
- **Deployment:** Global edge network (sub-200ms response times)
- **Features Used:**
  - RESTful API endpoints
  - Payment processing orchestration
  - External API integrations
  - Webhook handling
  - File processing

##### 4. Supabase Storage
- **Purpose:** File and blob storage
- **Buckets Created:**
  - `make-cbd74580-profile-images` - User avatars
  - `make-cbd74580-curriculum-pdfs` - Learning materials
  - `make-cbd74580-assessments` - Student assessment documents
  - `make-cbd74580-chat-attachments` - Message attachments
- **Features Used:**
  - Private buckets with access control
  - Signed URLs for secure file access
  - Image transformations
  - CDN distribution

##### 5. Supabase Realtime
- **Purpose:** Live data synchronization
- **Use Cases:**
  - Real-time chat messages
  - Live booking updates
  - Online/offline presence indicators
  - Live gamification updates (XP, achievements)
- **Protocol:** WebSockets with automatic reconnection

#### API Endpoints:

```
Authentication:
https://{PROJECT_ID}.supabase.co/auth/v1/signup
https://{PROJECT_ID}.supabase.co/auth/v1/token

Database (Auto-generated REST API):
https://{PROJECT_ID}.supabase.co/rest/v1/{table_name}

Storage:
https://{PROJECT_ID}.supabase.co/storage/v1/object/{bucket_name}/{file_path}

Edge Functions:
https://{PROJECT_ID}.supabase.co/functions/v1/{function_name}

Realtime:
wss://{PROJECT_ID}.supabase.co/realtime/v1/websocket
```

#### Required Credentials:

```bash
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_ANON_KEY=eyJhbGc... (Public key - safe for frontend)
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc... (Admin key - backend only, never expose)
```

**Where to get these:**
1. Create account at https://supabase.com
2. Create new project
3. Go to Project Settings → API
4. Copy URL and keys

#### Setup Steps:

```bash
# 1. Install Supabase CLI
npm install -g supabase

# 2. Login to Supabase
supabase login

# 3. Initialize project (if starting fresh)
supabase init

# 4. Link to remote project
supabase link --project-ref your-project-id

# 5. Start local development (optional)
supabase start
# This runs local PostgreSQL, API, and Studio on:
# - Database: localhost:54322
# - API: localhost:54321  
# - Studio: localhost:54323

# 6. Deploy edge functions
supabase functions deploy make-server-cbd74580

# 7. Set environment secrets for edge functions
supabase secrets set PAYSTACK_SECRET_KEY=sk_test_xxx
supabase secrets set DAILY_API_KEY=xxx
supabase secrets set GOOGLE_CLIENT_ID=xxx
supabase secrets set GOOGLE_CLIENT_SECRET=xxx
```

---

### 2. **Paystack** (Payment Gateway)

**Official Website:** https://paystack.com  
**Documentation:** https://paystack.com/docs

#### What It Provides:
- Payment processing for Nigerian and African markets
- Multiple payment methods (cards, bank transfers, USSD, mobile money)
- Foreign card support with automatic Naira conversion
- Split payments for marketplace revenue sharing
- Transfer/payout API for tutor payments
- Webhook notifications for payment events
- Transaction verification and reconciliation

#### Why Paystack:

**Technical Reasons:**
- ✅ **Nigerian market leader** - Optimized infrastructure for West African payments
- ✅ **Local payment methods** - Supports Nigerian banks, USSD, Verve cards
- ✅ **Automatic currency conversion** - Handles foreign cards with NGN conversion
- ✅ **Split payment support** - Built-in support for marketplace 80/20 revenue splits
- ✅ **Robust API** - Well-documented RESTful API with webhooks
- ✅ **PCI DSS Level 1 compliant** - No need to handle card data directly
- ✅ **Fraud detection** - Built-in risk management and 3D Secure
- ✅ **Settlement automation** - Automated payouts to tutors

**Alternative Considered:** Stripe  
**Why Not Stripe:** Optimized for Western markets; higher fees for Nigerian transactions; limited local payment method support; more complex setup for Nigerian businesses

**Alternative Considered:** Flutterwave  
**Why Paystack:** Better API documentation; simpler integration; more reliable webhook delivery; better split payment handling

#### Payment Flow Architecture:

```
1. User initiates payment on TutorNest
        ↓
2. Backend calls Paystack Initialize Transaction API
        ↓
3. Returns authorization_url to frontend
        ↓
4. User redirected to Paystack hosted payment page
        ↓
5. User completes payment (card/bank/USSD)
        ↓
6. Paystack sends webhook to TutorNest backend
        ↓
7. Backend verifies transaction with Paystack API
        ↓
8. Backend updates booking status in database
        ↓
9. User redirected back to TutorNest with success
        ↓
10. Tutor payout scheduled (80% split)
```

#### API Endpoints Used:

```
Initialize Transaction:
POST https://api.paystack.co/transaction/initialize

Verify Transaction:
GET https://api.paystack.co/transaction/verify/:reference

Create Transfer Recipient:
POST https://api.paystack.co/transferrecipient

Initiate Transfer:
POST https://api.paystack.co/transfer

List Transfers:
GET https://api.paystack.co/transfer

Finalize Transfer:
POST https://api.paystack.co/transfer/finalize_transfer
```

#### Required Credentials:

```bash
PAYSTACK_SECRET_KEY=sk_live_xxxxxxxxxxxxxxxxxx (for production)
PAYSTACK_TEST_SECRET_KEY=sk_test_xxxxxxxxx (for testing)
PAYSTACK_PUBLIC_KEY=pk_live_xxxxxxxxxxxxxxxxxx (optional - for client-side)
```

**Where to get these:**
1. Create account at https://paystack.com
2. Complete business verification (KYC) for live mode
3. Go to Settings → API Keys & Webhooks
4. Copy secret keys

#### Setup Steps:

```bash
# 1. Create Paystack account
# Visit https://paystack.com and sign up

# 2. Complete KYC verification
# Submit business documents (CAC, ID, bank details)

# 3. Configure webhook URL
# Go to Settings → Webhooks
# Add: https://your-project.supabase.co/functions/v1/make-server-cbd74580/webhooks/paystack

# 4. Select webhook events:
# - charge.success (payment completed)
# - transfer.success (payout completed)
# - transfer.failed (payout failed)

# 5. Save webhook secret for verification
PAYSTACK_WEBHOOK_SECRET=whsec_xxxxxxxxx

# 6. Set up test mode first
# Use test keys (sk_test_xxx) for development

# 7. Add bank account for settlements
# Settings → Settlement Account

# 8. Configure transfer settings
# Settings → Transfers → Enable automatic transfers
```

#### Implementation in TutorNest:

```typescript
// Backend - Initialize payment
const response = await fetch('https://api.paystack.co/transaction/initialize', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${PAYSTACK_SECRET_KEY}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    email: user.email,
    amount: 2000000, // ₦20,000 in kobo (lowest denomination)
    currency: 'NGN',
    reference: uniqueReference,
    callback_url: 'https://tutornest.com/payment/callback',
    metadata: {
      bookingId: booking.id,
      studentId: student.id,
      tutorId: tutor.id,
    },
    split_code: 'SPL_xxx', // For automatic 80/20 split
  }),
});

// Webhook verification
const hash = crypto
  .createHmac('sha512', PAYSTACK_WEBHOOK_SECRET)
  .update(JSON.stringify(req.body))
  .digest('hex');
  
if (hash === req.headers['x-paystack-signature']) {
  // Webhook is authentic, process event
}
```

---

### 3. **Daily.co** (Video Calling)

**Official Website:** https://daily.co  
**Documentation:** https://docs.daily.co

#### What It Provides:
- WebRTC video conferencing infrastructure
- Room creation and management API
- Screen sharing capabilities
- In-call chat
- Recording and transcription (optional)
- Network quality monitoring
- Mobile SDK support

#### Why Daily.co:

**Technical Reasons:**
- ✅ **Simple REST API** - Create video rooms programmatically with single API call
- ✅ **No WebRTC complexity** - Handles all peer connection management
- ✅ **Embeddable** - Full iframe or React component integration
- ✅ **Global edge network** - Low latency worldwide
- ✅ **Automatic scaling** - No infrastructure management needed
- ✅ **Privacy controls** - Waiting rooms, knock to enter, recording permissions
- ✅ **Mobile support** - Native iOS/Android SDKs and mobile web
- ✅ **Call quality analytics** - Network stats and quality metrics

**Alternative Considered:** Twilio Video  
**Why Not Twilio:** More expensive; more complex API; requires more client-side code

**Alternative Considered:** Zoom SDK  
**Why Not Zoom:** Licensing costs; complex integration; less embeddable

**Alternative Considered:** Agora  
**Why Not Agora:** Steeper learning curve; requires more WebRTC knowledge

**Alternative Considered:** Google Meet  
**Why Not as Primary:** Cannot embed in iframe; less control; requires Google account; users leave your platform

#### Video Room Architecture:

```
1. User books tutoring session
        ↓
2. Backend creates Daily.co room via API
   Room name: tutornest-{bookingId}
   Privacy: private (requires token)
   Expires: session end time + 30 minutes
        ↓
3. Room URL stored in booking record
        ↓
4. At session time, generate meeting tokens for tutor & student
        ↓
5. Frontend embeds Daily.co iframe with token
        ↓
6. Users join video call within TutorNest
        ↓
7. After session, room auto-expires and is deleted
```

#### API Endpoints Used:

```
Create Room:
POST https://api.daily.co/v1/rooms

Delete Room:
DELETE https://api.daily.co/v1/rooms/{room_name}

Get Room Info:
GET https://api.daily.co/v1/rooms/{room_name}

Create Meeting Token:
POST https://api.daily.co/v1/meeting-tokens
```

#### Required Credentials:

```bash
DAILY_API_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

**Where to get this:**
1. Create account at https://daily.co
2. Go to Developers → API Keys
3. Copy API key

#### Setup Steps:

```bash
# 1. Create Daily.co account
# Visit https://daily.co and sign up

# 2. Get API key
# Dashboard → Developers → API Keys

# 3. Configure domain (optional)
# For custom branding: yourdomain.daily.co

# 4. Set up room defaults
# Dashboard → Rooms → Default Settings:
# - Enable screen sharing
# - Enable chat
# - Set max participants (2 for 1-on-1)
# - Enable network quality indicator

# 5. Configure recording (if needed)
# Dashboard → Recording Settings
# - Choose cloud recording or local
# - Set retention period

# 6. Test with demo room
curl -X POST https://api.daily.co/v1/rooms \
  -H "Authorization: Bearer $DAILY_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"name":"test-room","privacy":"public"}'
```

#### Implementation in TutorNest:

```typescript
// Backend - Create video room
const createRoom = async (bookingId: string, sessionEndTime: string) => {
  const response = await fetch('https://api.daily.co/v1/rooms', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${DAILY_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: `tutornest-${bookingId}`,
      privacy: 'private', // Requires token to join
      properties: {
        enable_screenshare: true,
        enable_chat: true,
        enable_knocking: true,
        exp: Math.floor(new Date(sessionEndTime).getTime() / 1000) + 1800, // Expires 30 min after session
        max_participants: 2,
      },
    }),
  });
  
  const room = await response.json();
  return room.url; // https://tutornest.daily.co/tutornest-{bookingId}
};

// Frontend - Embed video call
<iframe
  src={`${roomUrl}?t=${meetingToken}`}
  allow="camera; microphone; fullscreen; display-capture"
  style={{ width: '100%', height: '100%' }}
/>

// Or use React component
import DailyIframe from '@daily-co/daily-js';

const callFrame = DailyIframe.createFrame({
  iframeStyle: {
    width: '100%',
    height: '600px',
  },
});

callFrame.join({ url: roomUrl, token: meetingToken });
```

---

### 4. **Google Calendar API** (Scheduling Integration)

**Official Website:** https://developers.google.com/calendar  
**Documentation:** https://developers.google.com/calendar/api/guides/overview

#### What It Provides:
- Calendar event creation and management
- Event reminders and notifications
- Google Meet link generation (automatic video conferencing)
- Calendar synchronization across devices
- Availability checking
- Recurring event support
- Attendee management

#### Why Google Calendar:

**Technical Reasons:**
- ✅ **Universal adoption** - Most users already have Google accounts
- ✅ **Cross-platform sync** - Web, iOS, Android, desktop automatic sync
- ✅ **Built-in notifications** - Email and push notifications handled by Google
- ✅ **Google Meet integration** - Auto-generates video call links
- ✅ **OAuth 2.0 standard** - Industry-standard secure authorization
- ✅ **Rich API** - Full CRUD operations on events
- ✅ **Timezone handling** - Automatic timezone conversion
- ✅ **No cost** - Free API with generous quotas (1M requests/day)

**Alternative Considered:** Microsoft Outlook Calendar  
**Why Google:** Higher adoption in target market; simpler OAuth flow; better mobile integration

**Alternative Considered:** Custom calendar system  
**Why Not:** Reinventing the wheel; users prefer familiar calendar apps; notification infrastructure complex

#### Calendar Integration Architecture:

```
1. User clicks "Connect Google Calendar" in TutorNest
        ↓
2. Redirect to Google OAuth consent screen
        ↓
3. User authorizes calendar access
        ↓
4. Google redirects back with authorization code
        ↓
5. Backend exchanges code for access + refresh tokens
        ↓
6. Tokens stored securely in database (encrypted)
        ↓
7. When booking created:
   - Backend uses stored token to create calendar event
   - Event includes: time, description, Google Meet link
   - Event sent to both tutor and student calendars
        ↓
8. Google sends notifications automatically
        ↓
9. Changes to booking update calendar event
        ↓
10. Cancellation deletes calendar event
```

#### API Endpoints Used:

```
OAuth Authorization:
https://accounts.google.com/o/oauth2/v2/auth

Token Exchange:
POST https://oauth2.googleapis.com/token

Refresh Token:
POST https://oauth2.googleapis.com/token

Create Event:
POST https://www.googleapis.com/calendar/v3/calendars/{calendarId}/events

Update Event:
PUT https://www.googleapis.com/calendar/v3/calendars/{calendarId}/events/{eventId}

Delete Event:
DELETE https://www.googleapis.com/calendar/v3/calendars/{calendarId}/events/{eventId}

List Events:
GET https://www.googleapis.com/calendar/v3/calendars/{calendarId}/events
```

#### Required Credentials:

```bash
GOOGLE_CLIENT_ID=xxxxxxxxx-yyyyyyy.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xxxxxxxxxxxxxxxxxxxxx
GOOGLE_REDIRECT_URI=https://your-domain.com/auth/google/callback
```

#### OAuth Scopes Required:

```
https://www.googleapis.com/auth/calendar
https://www.googleapis.com/auth/calendar.events
```

#### Setup Steps:

```bash
# 1. Create Google Cloud Project
# Visit https://console.cloud.google.com
# Click "New Project"

# 2. Enable Google Calendar API
# APIs & Services → Library
# Search "Google Calendar API"
# Click "Enable"

# 3. Create OAuth 2.0 Credentials
# APIs & Services → Credentials
# Click "Create Credentials" → "OAuth client ID"
# Application type: Web application
# Name: TutorNest

# 4. Configure Authorized Redirect URIs
# Add these URLs:
https://your-domain.com/auth/google/callback
https://your-project.supabase.co/functions/v1/make-server-cbd74580/google/callback
http://localhost:5173/auth/google/callback (for development)

# 5. Configure OAuth Consent Screen
# APIs & Services → OAuth consent screen
# User Type: External
# App name: TutorNest
# Support email: your-email@domain.com
# Add scopes: calendar, calendar.events
# Add test users (for development)

# 6. Copy Client ID and Secret
# Save to environment variables

# 7. Test OAuth flow
# Use OAuth Playground: https://developers.google.com/oauthplayground
```

#### Implementation in TutorNest:

```typescript
// Backend - Initiate OAuth
const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
  `client_id=${GOOGLE_CLIENT_ID}&` +
  `redirect_uri=${encodeURIComponent(GOOGLE_REDIRECT_URI)}&` +
  `response_type=code&` +
  `scope=${encodeURIComponent('https://www.googleapis.com/auth/calendar')}&` +
  `access_type=offline&` + // Get refresh token
  `prompt=consent&` + // Force consent screen to get refresh token
  `state=${userId}`; // Pass user ID for callback

// Exchange code for tokens
const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    code: authorizationCode,
    client_id: GOOGLE_CLIENT_ID,
    client_secret: GOOGLE_CLIENT_SECRET,
    redirect_uri: GOOGLE_REDIRECT_URI,
    grant_type: 'authorization_code',
  }),
});

// Create calendar event with Google Meet
const event = {
  summary: `TutorNest: ${subject} Session`,
  description: `Tutoring session with ${tutorName}`,
  start: {
    dateTime: '2024-12-31T14:00:00',
    timeZone: 'Africa/Lagos',
  },
  end: {
    dateTime: '2024-12-31T15:00:00',
    timeZone: 'Africa/Lagos',
  },
  attendees: [
    { email: tutorEmail },
    { email: studentEmail },
  ],
  conferenceData: {
    createRequest: {
      requestId: crypto.randomUUID(),
      conferenceSolutionKey: { type: 'hangoutsMeet' }, // Auto-creates Google Meet link
    },
  },
  reminders: {
    useDefault: false,
    overrides: [
      { method: 'email', minutes: 24 * 60 }, // 1 day before
      { method: 'popup', minutes: 30 }, // 30 min before
    ],
  },
};

const eventResponse = await fetch(
  `https://www.googleapis.com/calendar/v3/calendars/primary/events?conferenceDataVersion=1`,
  {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(event),
  }
);
```

---

## 💾 Database Architecture

### PostgreSQL 15 (via Supabase)

#### Why PostgreSQL:

**Technical Reasons:**
- ✅ **ACID compliance** - Guarantees data integrity for financial transactions
- ✅ **Relational model** - Perfect for complex relationships (parent-student-tutor-booking)
- ✅ **Advanced features** - JSONB, full-text search, geospatial queries, triggers
- ✅ **Performance** - Excellent query optimization, indexing, connection pooling
- ✅ **Open source** - No licensing costs, huge community, no vendor lock-in
- ✅ **Mature ecosystem** - 30+ years of development, battle-tested
- ✅ **Row Level Security** - Database-level multi-tenant security
- ✅ **Extension support** - PostGIS, pg_cron, full-text search, etc.

**Alternative Considered:** MongoDB  
**Why Not:** NoSQL not ideal for complex relational data; no ACID guarantees; harder to maintain data integrity

**Alternative Considered:** MySQL  
**Why PostgreSQL:** Better JSON support; more advanced features; superior indexing; better for complex queries

### Database Schema Overview:

```sql
-- Core Tables

profiles (
  id UUID PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  phone TEXT,
  location TEXT,
  role TEXT, -- 'parent' | 'student' | 'tutor' | 'admin'
  availableRoles TEXT[], -- Array of roles user can switch between
  currentRole TEXT, -- Active role
  onboardingComplete BOOLEAN DEFAULT FALSE,
  
  -- Tutor-specific fields
  bio TEXT,
  hourly_rate NUMERIC,
  experience_years INTEGER,
  qualifications TEXT,
  subjects TEXT[],
  age_groups TEXT[],
  exam_boards TEXT[],
  verificationStatus TEXT, -- 'pending' | 'verified' | 'rejected'
  
  -- Parent-specific fields
  children UUID[], -- Array of child profile IDs
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

bookings (
  id UUID PRIMARY KEY,
  studentId UUID REFERENCES profiles(id),
  tutorId UUID REFERENCES profiles(id),
  parentId UUID REFERENCES profiles(id),
  
  subject TEXT NOT NULL,
  sessionDate DATE NOT NULL,
  sessionTime TIME NOT NULL,
  duration INTEGER NOT NULL, -- in minutes
  
  status TEXT, -- 'pending' | 'confirmed' | 'completed' | 'cancelled'
  paymentStatus TEXT, -- 'pending' | 'paid' | 'refunded'
  
  totalAmount NUMERIC NOT NULL,
  platformFee NUMERIC, -- 20% of total
  tutorEarnings NUMERIC, -- 80% of total
  
  videoRoomUrl TEXT, -- Daily.co room URL
  googleCalendarEventId TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

messages (
  id UUID PRIMARY KEY,
  senderId UUID REFERENCES profiles(id),
  recipientId UUID REFERENCES profiles(id),
  conversationId TEXT, -- "{userId1}-{userId2}" sorted
  
  content TEXT NOT NULL,
  attachments JSONB, -- Array of file URLs
  read BOOLEAN DEFAULT FALSE,
  
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

payments (
  id UUID PRIMARY KEY,
  userId UUID REFERENCES profiles(id),
  bookingId UUID REFERENCES bookings(id),
  
  amount NUMERIC NOT NULL,
  currency TEXT DEFAULT 'NGN',
  status TEXT, -- 'pending' | 'success' | 'failed'
  
  paystackReference TEXT UNIQUE,
  paystackAccessCode TEXT,
  paymentMethod TEXT, -- 'card' | 'bank_transfer' | 'ussd'
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  verified_at TIMESTAMPTZ
);

student_gamification (
  studentId UUID PRIMARY KEY REFERENCES profiles(id),
  
  xp INTEGER DEFAULT 0,
  level INTEGER DEFAULT 1,
  rank TEXT DEFAULT 'Beginner',
  streak INTEGER DEFAULT 0,
  lastActivityDate DATE,
  
  achievements JSONB DEFAULT '[]', -- Array of achievement IDs
  badges JSONB DEFAULT '[]',
  
  totalSessions INTEGER DEFAULT 0,
  totalHoursLearned NUMERIC DEFAULT 0,
  totalTriviaPlayed INTEGER DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

trivia_questions (
  id UUID PRIMARY KEY,
  subject TEXT NOT NULL,
  grade TEXT NOT NULL,
  question TEXT NOT NULL,
  options JSONB NOT NULL, -- Array of 4 options
  correctAnswer INTEGER NOT NULL, -- Index 0-3
  difficulty TEXT, -- 'easy' | 'medium' | 'hard'
  xpReward INTEGER DEFAULT 10,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

assessments (
  id UUID PRIMARY KEY,
  bookingId UUID REFERENCES bookings(id),
  studentId UUID REFERENCES profiles(id),
  tutorId UUID REFERENCES profiles(id),
  
  strengths TEXT,
  areasForImprovement TEXT,
  homeworkAssigned TEXT,
  nextSessionFocus TEXT,
  overallRating INTEGER, -- 1-5
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

curriculum_pdfs (
  id UUID PRIMARY KEY,
  subject TEXT NOT NULL,
  grade TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  fileUrl TEXT NOT NULL,
  fileSize INTEGER, -- in bytes
  uploadedBy UUID REFERENCES profiles(id),
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Key-Value Store for flexible data
kv_store_cbd74580 (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Indexes for Performance:

```sql
-- Frequently queried columns
CREATE INDEX idx_profiles_email ON profiles(email);
CREATE INDEX idx_profiles_role ON profiles(role);
CREATE INDEX idx_bookings_student ON bookings(studentId);
CREATE INDEX idx_bookings_tutor ON bookings(tutorId);
CREATE INDEX idx_bookings_date ON bookings(sessionDate);
CREATE INDEX idx_bookings_status ON bookings(status);
CREATE INDEX idx_messages_conversation ON messages(conversationId);
CREATE INDEX idx_messages_timestamp ON messages(timestamp DESC);
CREATE INDEX idx_payments_reference ON payments(paystackReference);
CREATE INDEX idx_trivia_subject_grade ON trivia_questions(subject, grade);

-- Full-text search for tutors
CREATE INDEX idx_profiles_search ON profiles 
  USING GIN (to_tsvector('english', full_name || ' ' || COALESCE(bio, '')));
```

### Row Level Security (RLS) Policies:

```sql
-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- Example policies
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can view bookings they're part of"
  ON bookings FOR SELECT
  USING (
    auth.uid() = studentId OR 
    auth.uid() = tutorId OR 
    auth.uid() = parentId
  );

CREATE POLICY "Users can view their messages"
  ON messages FOR SELECT
  USING (
    auth.uid() = senderId OR 
    auth.uid() = recipientId
  );
```

---

## 🖥️ Frontend Technology Stack

### React 18 + TypeScript

#### Why React:

**Technical Reasons:**
- ✅ **Component-based architecture** - Reusable UI components reduce code duplication
- ✅ **Virtual DOM** - Efficient re-rendering for performance
- ✅ **Large ecosystem** - Extensive library support (routing, state, forms, etc.)
- ✅ **Developer tools** - Excellent browser extensions for debugging
- ✅ **Hooks API** - Modern, functional approach to state management
- ✅ **Server-side rendering** support (Next.js if needed later)
- ✅ **Strong community** - Easy to find solutions and developers

#### Why TypeScript:

**Technical Reasons:**
- ✅ **Type safety** - Catch errors at compile-time instead of runtime
- ✅ **Better IDE support** - Autocomplete, refactoring, inline documentation
- ✅ **Self-documenting code** - Types serve as inline documentation
- ✅ **Easier refactoring** - Confidence when making changes
- ✅ **Better collaboration** - Team members understand interfaces clearly

### Tailwind CSS v4

#### Why Tailwind:

**Technical Reasons:**
- ✅ **Utility-first** - Rapid UI development without writing CSS
- ✅ **Small bundle size** - Tree-shaking removes unused styles
- ✅ **Consistent design system** - Predefined spacing, colors, typography
- ✅ **Responsive design** - Mobile-first breakpoints built-in
- ✅ **No CSS conflicts** - No class name collisions
- ✅ **Easy customization** - Design tokens in CSS variables
- ✅ **JIT compilation** - Generate styles on-demand

**Alternative Considered:** Material-UI  
**Why Not:** Heavy bundle size; opinionated design; harder to customize

**Alternative Considered:** Bootstrap  
**Why Not:** jQuery dependency; less modern; more rigid

### Key Frontend Libraries:

```json
{
  "react": "^18.x",
  "typescript": "^5.x",
  "tailwindcss": "^4.x",
  "lucide-react": "Icons library",
  "recharts": "Charts for analytics dashboards",
  "react-hook-form@7.55.0": "Form validation and management",
  "sonner@2.0.3": "Toast notifications",
  "motion/react": "Animation library (formerly Framer Motion)",
  "react-slick": "Carousels and sliders",
  "react-responsive-masonry": "Masonry grid layouts",
  "@daily-co/daily-js": "Daily.co video integration",
  "@daily-co/daily-react": "Daily.co React components"
}
```

---

## 🔧 Backend Technology Stack

### Deno Runtime

#### Why Deno:

**Technical Reasons:**
- ✅ **TypeScript native** - No compilation step needed
- ✅ **Secure by default** - No file/network access without explicit permissions
- ✅ **Modern standard library** - Built-in utilities for common tasks
- ✅ **npm compatibility** - Can use npm packages with `npm:` specifier
- ✅ **Fast startup** - Ideal for serverless/edge functions
- ✅ **Built-in tooling** - Testing, formatting, linting included
- ✅ **Web standards** - Uses Fetch API, Web Crypto, etc.

**Alternative Considered:** Node.js  
**Why Deno:** Better security model; native TypeScript; modern APIs; faster cold starts

### Hono.js Web Framework

#### Why Hono:

**Technical Reasons:**
- ✅ **Ultrafast** - Optimized for edge computing
- ✅ **Express-like API** - Easy learning curve for Node.js developers
- ✅ **TypeScript-first** - Full type inference
- ✅ **Middleware support** - CORS, logging, authentication, etc.
- ✅ **Small footprint** - ~10KB, minimal overhead
- ✅ **Multi-runtime** - Works with Deno, Cloudflare Workers, Bun, Node.js
- ✅ **Built-in helpers** - JSON parsing, cookie handling, etc.

**Alternative Considered:** Express.js  
**Why Hono:** Built for modern runtimes; better TypeScript support; faster; smaller

### Backend File Structure:

```
/supabase/functions/server/
├── index.tsx                    # Main server entry point
├── kv_store.tsx                 # Key-value store utilities (READ-ONLY)
│
├── profile-routes.tsx           # User profile CRUD
├── booking-routes.tsx           # Session booking management
├── payment-routes.tsx           # Paystack payment integration
├── messaging-routes.tsx         # Real-time messaging
├── gamification-routes.tsx      # XP, levels, achievements
├── google-calendar-routes.tsx   # Calendar integration
├── parent-children-routes.tsx   # Parent-child linking
├── assessments-routes.tsx       # Student assessments
└── curriculum-routes.tsx        # PDF upload/download
```

### API Route Structure:

All routes prefixed with: `/make-server-cbd74580/`

```
Authentication:
POST   /make-server-cbd74580/signup
POST   /make-server-cbd74580/signin
POST   /make-server-cbd74580/signout
POST   /make-server-cbd74580/check-email

Profiles:
GET    /make-server-cbd74580/profiles/:userId
PUT    /make-server-cbd74580/profiles/:userId
GET    /make-server-cbd74580/profiles/:userId/available-roles

Bookings:
POST   /make-server-cbd74580/bookings
GET    /make-server-cbd74580/bookings/:bookingId
PUT    /make-server-cbd74580/bookings/:bookingId
DELETE /make-server-cbd74580/bookings/:bookingId
GET    /make-server-cbd74580/bookings/user/:userId

Payments:
POST   /make-server-cbd74580/payments/initialize
POST   /make-server-cbd74580/payments/verify
POST   /make-server-cbd74580/webhooks/paystack
GET    /make-server-cbd74580/payments/user/:userId

Messages:
POST   /make-server-cbd74580/messages
GET    /make-server-cbd74580/messages/conversation/:conversationId
PUT    /make-server-cbd74580/messages/:messageId/read

Gamification:
GET    /make-server-cbd74580/gamification/student/:studentId
POST   /make-server-cbd74580/gamification/award-xp
POST   /make-server-cbd74580/trivia/play
GET    /make-server-cbd74580/trivia/questions

Google Calendar:
GET    /make-server-cbd74580/google/auth
GET    /make-server-cbd74580/google/callback
POST   /make-server-cbd74580/google/create-event
DELETE /make-server-cbd74580/google/delete-event

Parent-Children:
POST   /make-server-cbd74580/parent/add-child
GET    /make-server-cbd74580/parent/:parentId/children
DELETE /make-server-cbd74580/parent/remove-child/:childId
```

---

## 🚀 Deployment Guide

### Prerequisites Checklist:

- [ ] Supabase account created
- [ ] Paystack account created and verified
- [ ] Daily.co account created
- [ ] Google Cloud project created
- [ ] Domain name registered (optional but recommended)
- [ ] Code repository ready (Git)

### Step-by-Step Deployment:

#### Phase 1: Supabase Setup

```bash
# 1. Create Supabase project
# Go to https://supabase.com → New Project
# Fill in:
#   - Project name: tutornest-production
#   - Database password: (strong password)
#   - Region: closest to Nigeria (e.g., Frankfurt, London)

# 2. Install Supabase CLI
npm install -g supabase

# 3. Login
supabase login

# 4. Link project
supabase link --project-ref YOUR_PROJECT_REF
# Project ref found in: Project Settings → General → Reference ID

# 5. Deploy database schema (if you have migrations)
supabase db push

# 6. Deploy edge functions
supabase functions deploy make-server-cbd74580

# 7. Set environment secrets
supabase secrets set SUPABASE_URL="https://YOUR_PROJECT.supabase.co"
supabase secrets set SUPABASE_ANON_KEY="your_anon_key"
supabase secrets set SUPABASE_SERVICE_ROLE_KEY="your_service_role_key"
supabase secrets set PAYSTACK_SECRET_KEY="sk_live_xxx"
supabase secrets set DAILY_API_KEY="your_daily_key"
supabase secrets set GOOGLE_CLIENT_ID="your_client_id"
supabase secrets set GOOGLE_CLIENT_SECRET="your_client_secret"

# 8. Enable email authentication
# Supabase Dashboard → Authentication → Providers
# Enable: Email
# Optional: Enable Google, Facebook OAuth

# 9. Configure email templates (optional)
# Authentication → Email Templates
# Customize: Signup confirmation, Password reset, etc.

# 10. Set up storage buckets
# Storage → Create new bucket:
# - make-cbd74580-profile-images (private)
# - make-cbd74580-curriculum-pdfs (private)
# - make-cbd74580-assessments (private)
# - make-cbd74580-chat-attachments (private)

# 11. Configure storage policies
# For each bucket → Policies → New Policy
# Allow authenticated users to upload/download their files
```

#### Phase 2: Paystack Setup

```bash
# 1. Complete business verification
# Paystack Dashboard → Settings → Business Details
# Upload: CAC certificate, ID, bank account details

# 2. Get API keys
# Settings → API Keys & Webhooks
# Copy: Secret Key (sk_live_xxx)

# 3. Configure webhook
# Settings → Webhooks → Add Endpoint
# URL: https://YOUR_PROJECT.supabase.co/functions/v1/make-server-cbd74580/webhooks/paystack
# Events: charge.success, transfer.success, transfer.failed

# 4. Save webhook secret
# Copy webhook secret and add to Supabase secrets:
supabase secrets set PAYSTACK_WEBHOOK_SECRET="whsec_xxx"

# 5. Set up settlement account
# Settings → Settlement Account
# Add bank account for receiving platform fees

# 6. Configure transfer settings
# Settings → Transfers → Enable

# 7. Test webhook
# Use Paystack test mode first (sk_test_xxx)
# Make test payment and verify webhook received
```

#### Phase 3: Daily.co Setup

```bash
# 1. Get API key
# Daily.co Dashboard → Developers → API Keys

# 2. Configure domain (optional)
# Settings → Domains → Add custom domain
# Example: tutornest.daily.co

# 3. Set room defaults
# Settings → Room Defaults:
# - Max participants: 2
# - Enable screen sharing: Yes
# - Enable chat: Yes
# - Auto-delete after: 1 day

# 4. Test room creation
curl -X POST https://api.daily.co/v1/rooms \
  -H "Authorization: Bearer $DAILY_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "test-room",
    "privacy": "private",
    "properties": {
      "max_participants": 2,
      "enable_screenshare": true
    }
  }'
```

#### Phase 4: Google Calendar API Setup

```bash
# 1. Create Google Cloud Project
# Go to: https://console.cloud.google.com
# Create New Project → Name: TutorNest

# 2. Enable Google Calendar API
# APIs & Services → Library
# Search: Google Calendar API → Enable

# 3. Create OAuth credentials
# APIs & Services → Credentials
# Create Credentials → OAuth 2.0 Client ID
# Application type: Web application

# 4. Configure authorized redirect URIs
# Add:
https://YOUR_PROJECT.supabase.co/functions/v1/make-server-cbd74580/google/callback
https://your-custom-domain.com/auth/google/callback
http://localhost:5173/auth/google/callback (for local dev)

# 5. Configure OAuth consent screen
# OAuth consent screen → External
# App name: TutorNest
# Scopes: calendar, calendar.events
# Test users: your-email@gmail.com (for testing)

# 6. Copy credentials
# Copy Client ID and Client Secret
# Add to Supabase secrets (already done in Phase 1)
```

#### Phase 5: Frontend Deployment

**Option A: Deploy to Vercel (Recommended)**

```bash
# 1. Install Vercel CLI
npm install -g vercel

# 2. Login
vercel login

# 3. Configure environment variables
# Create .env.production file:
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key

# 4. Deploy
vercel --prod

# 5. Configure custom domain (optional)
# Vercel Dashboard → Project → Settings → Domains
# Add: www.tutornest.com

# 6. Configure build settings
# Framework Preset: Vite
# Build Command: npm run build
# Output Directory: dist
```

**Option B: Deploy to Netlify**

```bash
# 1. Install Netlify CLI
npm install -g netlify-cli

# 2. Login
netlify login

# 3. Initialize
netlify init

# 4. Configure environment variables
# Netlify Dashboard → Site Settings → Environment Variables
# Add: VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY

# 5. Deploy
netlify deploy --prod
```

**Option C: Deploy to Supabase Storage (Static Hosting)**

```bash
# 1. Build frontend
npm run build

# 2. Upload to Supabase Storage
# Storage → Create bucket: website (public)
# Upload all files from dist/ folder

# 3. Enable website hosting
# Storage → website → Configuration → Make public
```

#### Phase 6: Enable Row Level Security

```sql
-- Run these commands in Supabase SQL Editor

-- 1. Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_gamification ENABLE ROW LEVEL SECURITY;
ALTER TABLE assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE curriculum_pdfs ENABLE ROW LEVEL SECURITY;

-- 2. Create policies for profiles
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Public can view tutor profiles" ON profiles
  FOR SELECT USING (role = 'tutor' AND verificationStatus = 'verified');

-- 3. Create policies for bookings
CREATE POLICY "Users can view bookings they're part of" ON bookings
  FOR SELECT USING (
    auth.uid() = studentId OR 
    auth.uid() = tutorId OR 
    auth.uid() = parentId
  );

CREATE POLICY "Students and parents can create bookings" ON bookings
  FOR INSERT WITH CHECK (
    auth.uid() = studentId OR 
    auth.uid() = parentId
  );

-- 4. Create policies for messages
CREATE POLICY "Users can view their messages" ON messages
  FOR SELECT USING (
    auth.uid() = senderId OR 
    auth.uid() = recipientId
  );

CREATE POLICY "Users can send messages" ON messages
  FOR INSERT WITH CHECK (auth.uid() = senderId);

-- 5. Create policies for payments
CREATE POLICY "Users can view their payments" ON payments
  FOR SELECT USING (auth.uid() = userId);

-- 6. Create policies for gamification
CREATE POLICY "Students can view own gamification" ON student_gamification
  FOR SELECT USING (auth.uid() = studentId);

-- 7. Create policies for assessments
CREATE POLICY "Students can view their assessments" ON assessments
  FOR SELECT USING (auth.uid() = studentId);

CREATE POLICY "Tutors can create assessments" ON assessments
  FOR INSERT WITH CHECK (auth.uid() = tutorId);

-- 8. Create policies for curriculum
CREATE POLICY "Authenticated users can view curriculum" ON curriculum_pdfs
  FOR SELECT USING (auth.role() = 'authenticated');
```

#### Phase 7: Configure CORS

```typescript
// In /supabase/functions/server/index.tsx

import { Hono } from 'npm:hono'
import { cors } from 'npm:hono/cors'

const app = new Hono()

// Configure CORS
app.use('*', cors({
  origin: [
    'https://your-production-domain.com',
    'https://www.your-production-domain.com',
    'http://localhost:5173', // Development
  ],
  credentials: true,
  allowHeaders: ['Content-Type', 'Authorization'],
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
}))
```

#### Phase 8: Testing Checklist

```bash
# Test authentication
□ User signup works
□ User login works
□ Email verification sent
□ Password reset works
□ Session persists across page refresh

# Test payment flow
□ Payment initialization succeeds
□ Paystack redirect works
□ Payment verification works
□ Webhook received and processed
□ Database updated correctly
□ 80/20 split calculated correctly

# Test video calling
□ Room creation succeeds
□ Join URL works
□ Video/audio works
□ Screen sharing works
□ Room deletion works

# Test calendar integration
□ OAuth flow works
□ Event creation succeeds
□ Google Meet link generated
□ Event updates work
□ Event deletion works
□ Notifications sent

# Test real-time features
□ Messages appear instantly
□ Booking updates reflect immediately
□ Gamification updates in real-time

# Test on devices
□ Desktop browser (Chrome, Firefox, Safari)
□ Mobile browser (iOS Safari, Android Chrome)
□ Tablet
```

#### Phase 9: Go Live

```bash
# 1. Switch Paystack to live mode
# Use sk_live_xxx instead of sk_test_xxx

# 2. Update environment variables
supabase secrets set PAYSTACK_SECRET_KEY="sk_live_xxx"

# 3. Test live payment (small amount)
# Make actual payment to verify flow

# 4. Monitor logs
# Supabase Dashboard → Edge Functions → Logs
# Watch for errors

# 5. Set up monitoring
# Use Sentry for error tracking (optional)
# Use Google Analytics for user tracking (optional)

# 6. Announce launch
# Send email to test users
# Post on social media
# Contact early adopters
```

---

## 🔒 Security Implementation

### Authentication & Authorization

```typescript
// JWT Token Verification (automatic via Supabase)
const { data: { user }, error } = await supabase.auth.getUser(accessToken)

// Role-based access control
const checkRole = (user, requiredRole) => {
  const profile = await supabase
    .from('profiles')
    .select('role, currentRole')
    .eq('id', user.id)
    .single()
    
  return profile.currentRole === requiredRole
}

// Middleware for protected routes
const requireAuth = async (c, next) => {
  const token = c.req.header('Authorization')?.replace('Bearer ', '')
  if (!token) return c.json({ error: 'Unauthorized' }, 401)
  
  const { data: { user }, error } = await supabase.auth.getUser(token)
  if (error || !user) return c.json({ error: 'Invalid token' }, 401)
  
  c.set('user', user)
  await next()
}
```

### Payment Security

```typescript
// Webhook signature verification
const verifyPaystackWebhook = (req) => {
  const hash = crypto
    .createHmac('sha512', PAYSTACK_WEBHOOK_SECRET)
    .update(JSON.stringify(req.body))
    .digest('hex')
    
  return hash === req.headers['x-paystack-signature']
}

// Server-side payment verification (never trust client)
const verifyPayment = async (reference) => {
  const response = await fetch(
    `https://api.paystack.co/transaction/verify/${reference}`,
    {
      headers: {
        'Authorization': `Bearer ${PAYSTACK_SECRET_KEY}`,
      },
    }
  )
  
  const data = await response.json()
  return data.data.status === 'success'
}
```

### Data Encryption

```typescript
// Sensitive data encryption (for tokens, etc.)
import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto'

const encrypt = (text: string, key: string) => {
  const iv = randomBytes(16)
  const cipher = createCipheriv('aes-256-gcm', Buffer.from(key, 'hex'), iv)
  let encrypted = cipher.update(text, 'utf8', 'hex')
  encrypted += cipher.final('hex')
  return iv.toString('hex') + ':' + encrypted
}

const decrypt = (encrypted: string, key: string) => {
  const parts = encrypted.split(':')
  const iv = Buffer.from(parts[0], 'hex')
  const encryptedText = parts[1]
  const decipher = createDecipheriv('aes-256-gcm', Buffer.from(key, 'hex'), iv)
  let decrypted = decipher.update(encryptedText, 'hex', 'utf8')
  decrypted += decipher.final('utf8')
  return decrypted
}
```

---

## 📊 Monitoring & Observability

### Built-in Monitoring (Supabase)

```
Supabase Dashboard provides:
- Database query performance metrics
- Edge function invocation logs
- API request logs with response times
- Authentication events
- Error stack traces
- Real-time connection metrics
```

### Optional External Monitoring

#### Sentry (Error Tracking)

```typescript
// Install Sentry SDK
import * as Sentry from "@sentry/react"

Sentry.init({
  dsn: "https://xxx@xxx.ingest.sentry.io/xxx",
  environment: "production",
  tracesSampleRate: 0.1,
})

// Sentry automatically captures:
// - JavaScript errors
// - Unhandled promise rejections
// - API errors
// - Performance metrics
```

#### Google Analytics

```html
<!-- Add to index.html -->
<script async src="https://www.googletagmanager.com/gtag/js?id=G-XXXXXXXXXX"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'G-XXXXXXXXXX');
</script>
```

---

## 🔄 Backup & Recovery

### Automated Backups (Supabase)

- **Frequency:** Daily automatic backups
- **Retention:** 7 days (Pro tier), 30 days (Team tier)
- **Point-in-time recovery:** Available on Pro+ tiers
- **Location:** Encrypted backups stored in same region

### Manual Backup Process

```bash
# Backup database
supabase db dump -f backup-$(date +%Y%m%d).sql

# Backup storage
supabase storage export

# Store backups securely
# Upload to Google Drive / S3 / Dropbox
```

### Disaster Recovery Plan

| Scenario | Recovery Procedure | RTO* | RPO** |
|----------|-------------------|------|-------|
| Database corruption | Restore from daily backup | 1 hour | 24 hours |
| Edge function failure | Redeploy from Git | 15 minutes | 0 |
| Payment gateway outage | Switch to manual processing | 30 minutes | 0 |
| Video service failure | Use Google Meet backup | 5 minutes | 0 |
| Complete data loss | Restore from off-site backup | 4 hours | 24 hours |

*RTO = Recovery Time Objective  
**RPO = Recovery Point Objective

---

## 📋 Production Checklist

### Pre-Launch

**Infrastructure:**
- [ ] Supabase project created and configured
- [ ] All environment variables set
- [ ] Database schema deployed
- [ ] Edge functions deployed and tested
- [ ] Storage buckets created
- [ ] RLS policies enabled

**Integrations:**
- [ ] Paystack live mode activated
- [ ] Paystack webhooks configured
- [ ] Daily.co account set up
- [ ] Google Calendar OAuth configured
- [ ] All API keys verified

**Security:**
- [ ] HTTPS enforced
- [ ] CORS properly configured
- [ ] JWT tokens validated on backend
- [ ] Webhook signatures verified
- [ ] Sensitive data encrypted
- [ ] Rate limiting enabled

**Frontend:**
- [ ] Production build optimized
- [ ] Environment variables set
- [ ] Error boundaries implemented
- [ ] Loading states added
- [ ] Offline handling implemented

**Testing:**
- [ ] All user flows tested
- [ ] Payment flow end-to-end tested
- [ ] Video calls tested
- [ ] Mobile responsive verified
- [ ] Cross-browser compatibility checked

**Documentation:**
- [ ] API documentation completed
- [ ] User guides created
- [ ] Terms of service published
- [ ] Privacy policy published

### Post-Launch Monitoring

**First 24 Hours:**
- [ ] Monitor error rates every hour
- [ ] Check payment success rate
- [ ] Verify webhook delivery
- [ ] Test video call quality
- [ ] Monitor database performance

**First Week:**
- [ ] Daily error log review
- [ ] Performance metrics tracking
- [ ] User feedback collection
- [ ] Database optimization
- [ ] Cost monitoring

**First Month:**
- [ ] Weekly analytics review
- [ ] User retention analysis
- [ ] Feature usage tracking
- [ ] Infrastructure scaling if needed
- [ ] Bug fix prioritization

---

## 📞 Support Resources

### Supabase
- **Documentation:** https://supabase.com/docs
- **Discord Community:** https://discord.supabase.com
- **GitHub:** https://github.com/supabase/supabase
- **Support:** support@supabase.io (Pro+ tiers)
- **Status Page:** https://status.supabase.com

### Paystack
- **Documentation:** https://paystack.com/docs
- **API Reference:** https://paystack.com/docs/api
- **Support Email:** support@paystack.com
- **Phone:** +234 (0)1 888 7278
- **Status Page:** https://status.paystack.com

### Daily.co
- **Documentation:** https://docs.daily.co
- **API Reference:** https://docs.daily.co/reference/rest-api
- **Support:** help@daily.co
- **Community:** https://community.daily.co
- **Status Page:** https://status.daily.co

### Google Calendar API
- **Documentation:** https://developers.google.com/calendar
- **API Reference:** https://developers.google.com/calendar/api/v3/reference
- **Stack Overflow:** Tagged `google-calendar-api`
- **Issue Tracker:** https://issuetracker.google.com
- **OAuth Playground:** https://developers.google.com/oauthplayground

---

## 🎓 Developer Documentation

### Local Development Setup

```bash
# 1. Clone repository
git clone <repository-url>
cd tutornest

# 2. Install dependencies
npm install

# 3. Set up environment variables
cp .env.example .env.local

# Edit .env.local with your values:
VITE_SUPABASE_URL=http://localhost:54321
VITE_SUPABASE_ANON_KEY=your_local_anon_key

# 4. Start Supabase locally (optional)
supabase start

# 5. Start development server
npm run dev

# Application runs on http://localhost:5173
```

### Code Structure

```
tutornest/
├── src/
│   ├── App.tsx                  # Main application component
│   ├── components/              # React components
│   │   ├── ParentDashboard.tsx
│   │   ├── StudentDashboard.tsx
│   │   ├── TutorDashboard.tsx
│   │   ├── AdminDashboard.tsx
│   │   ├── MessagingInterface.tsx
│   │   ├── BookingInterface.tsx
│   │   ├── PaymentInterface.tsx
│   │   ├── GamificationSystem.tsx
│   │   └── ui/                  # Reusable UI components
│   ├── utils/
│   │   └── supabase/
│   │       ├── client.tsx       # Supabase client singleton
│   │       └── info.tsx         # Supabase config
│   └── styles/
│       └── globals.css          # Global styles & Tailwind
├── supabase/
│   └── functions/
│       └── server/
│           ├── index.tsx        # Main server file
│           └── [route-files].tsx
├── public/                      # Static assets
├── package.json
├── tsconfig.json
├── tailwind.config.js
└── vite.config.ts
```

### Environment Variables

**Frontend (.env.local):**
```bash
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGc...
```

**Backend (Supabase Secrets):**
```bash
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...
SUPABASE_DB_URL=postgresql://...
PAYSTACK_SECRET_KEY=sk_live_...
PAYSTACK_WEBHOOK_SECRET=whsec_...
DAILY_API_KEY=...
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
```

---

## 📄 Document Control

**Version:** 2.0  
**Last Updated:** December 31, 2024  
**Document Type:** Technical Setup & Integration Guide  
**Maintained By:** TutorNest Development Team  
**Next Review:** March 31, 2025  

---

## ✅ Summary

TutorNest is built on a modern, production-ready technology stack:

**Core Infrastructure:**
- ✅ Supabase - Complete backend solution (database, auth, storage, functions)
- ✅ PostgreSQL 15 - Reliable, ACID-compliant relational database
- ✅ Deno + Hono.js - Fast, secure edge computing

**Integrations:**
- ✅ Paystack - Nigerian payment processing
- ✅ Daily.co - WebRTC video calling
- ✅ Google Calendar - Scheduling and reminders

**Frontend:**
- ✅ React 18 + TypeScript - Type-safe, component-based UI
- ✅ Tailwind CSS v4 - Utility-first styling

**Key Features:**
- ✅ Real-time messaging and updates
- ✅ Secure payment processing with 80/20 split
- ✅ Embedded video calling
- ✅ Calendar synchronization
- ✅ Role-based dashboards
- ✅ Gamification system
- ✅ Multi-tenant security with RLS

**Architecture Benefits:**
- ✅ Serverless - Auto-scaling, no server management
- ✅ Open-source - No vendor lock-in
- ✅ Secure - Multiple layers of security
- ✅ Fast - Edge computing for low latency
- ✅ Maintainable - Clean separation of concerns

**All systems are production-ready and deployed globally.**
