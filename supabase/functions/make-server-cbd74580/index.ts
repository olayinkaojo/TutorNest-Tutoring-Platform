import { Hono } from 'npm:hono@4';
import { logger } from 'npm:hono@4/logger';
import { createClient } from 'jsr:@supabase/supabase-js@2';
import * as kv from './kv_store.tsx';
import { sendEmail, emailTemplates } from './email-service.tsx';
import { contentLibraryRoutes } from './content-library-routes.tsx';
import { progressAnalyticsRoutes } from './progress-analytics-routes.tsx';
import { notificationsRoutes } from './notifications-routes.tsx';
import { messagingRoutes } from './messaging-routes.tsx';
import { conversationsRoutes } from './conversations-routes.tsx';
import { documentsRoutes } from './documents-routes.tsx';
import { systemAlertsRoutes } from './system-alerts-routes.tsx';
import parentChildrenRoutes from './parent-children-routes.tsx';
import { adminRoutes } from './admin-routes.tsx';
import reviewsDisputesRoutes from './reviews-disputes-routes.tsx';
import subscriptionsRoutes from './subscriptions-routes.tsx';
import googleCalendarRoutes from './google-calendar-routes.tsx';
import couponsCreditsRoutes from './coupons-credits-routes.tsx';
import taxInvoicingRoutes from './tax-invoicing-routes.tsx';
import bookingRoutes from './booking-routes.tsx';
import smartMatchingRoutes from './smart-matching-routes.tsx';
import reportsNotificationsRoutes from './reports-notifications-routes.tsx';
import contentModerationRoutes from './content-moderation-routes.tsx';
import sanctionsRoutes from './sanctions-routes.tsx';
import policiesRoutes from './policies-routes.tsx';
import { studentAuthRoutes } from './student-auth-routes.tsx';
import bookshopRoutes from './bookshop-routes.tsx';
import roleManagementRoutes from './role-management-routes.tsx';
import assessmentsRoutes from './assessments-routes.tsx';
import curriculumRoutes from './curriculum-routes.tsx';
import triviaRoutes from './trivia-routes.tsx';
import dailyExtendedRoutes from './daily-extended-routes.tsx';
import battleRoutes from './battle-routes.tsx';
import { achievementRoutes } from './achievement-routes.tsx';
import { topicRoutes } from './topic-routes.tsx';
import { teacherRoutes } from './teacher-routes.tsx';
import { teacherQuestionRoutes } from './teacher-question-routes.tsx';
import { analyticsRoutes } from './analytics-routes.tsx';
import { sessionAssignmentRoutes } from './session-assignment-routes.tsx';
import { liveCollaborationRoutes } from './live-collaboration-routes.tsx';
import tutorSessionReportsRoutes from './tutor-session-reports-routes.tsx';
import paymentRoutes from './payment-routes.tsx';
import { getProfile } from './db.tsx';
import liveSessionRoutes from './live-session-routes.tsx';
import payoutsComplete from './payouts-complete.tsx';
import { tutorProfileRoutes } from './tutor-profile-routes.tsx';
import { videoRoutes } from './video-routes.tsx';
import { screenShareRoutes } from './screen-share-routes.tsx';
import invoiceRoutes from './invoice-routes.tsx';
import paymentPlansRoutes from './payment-plans-routes.tsx';
import signupRoutes from './signup-routes.tsx';
import { tutorSearchRoutes } from './tutor-search-routes.tsx';
import { invitationRoutes } from './invitation-routes.tsx';
import migrationRoutes from './migration-routes.tsx';
import profileAvatarRoutes from './profile-avatar-routes.tsx';

const app = new Hono();

/** Comma-separated list in `ALLOWED_ORIGINS`. When unset, uses `*`. Unlisted browser origins receive the first allowlisted value so the browser CORS check fails. */
function resolveAllowOrigin(req: Request): string {
  const list =
    Deno.env.get('ALLOWED_ORIGINS')?.split(',').map((s) => s.trim()).filter(Boolean) ?? [];
  if (list.length === 0) return '*';
  const origin = req.headers.get('Origin') ?? '';
  if (!origin) return '*';
  if (list.includes(origin)) return origin;
  return list[0] ?? '*';
}

/**
 * Browsers send OPTIONS before cross-origin GET with `Authorization` + `apikey`.
 * This must return CORS headers or the real request never runs ("Failed to fetch").
 * Run before path rewrite so preflight never depends on route matching.
 */
app.use('*', async (c, next) => {
  if (c.req.method === 'OPTIONS') {
    c.header('Access-Control-Allow-Origin', resolveAllowOrigin(c.req.raw));
    c.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    c.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-client-info, apikey');
    c.header('Access-Control-Max-Age', '86400');
    return c.body(null, 204);
  }
  await next();
});

/**
 * Supabase Edge forwards request paths after `/functions/v1/<function-name>/`
 * (e.g. `/profile`, `/admin/platform-overview`). Routes in this app are registered
 * as `/make-server-cbd74580/...`. Rewrite short paths so existing handlers match.
 */
const ROUTE_PREFIX = '/make-server-cbd74580';

app.use('*', async (c, next) => {
  const url = new URL(c.req.url);
  if (!url.pathname.startsWith(ROUTE_PREFIX)) {
    url.pathname = ROUTE_PREFIX + (url.pathname === '/' ? '' : url.pathname);
    return app.fetch(new Request(url.toString(), c.req.raw));
  }
  await next();
});

// Middleware
// Add CORS headers to all non-OPTIONS responses (OPTIONS handled above)
app.use('*', async (c, next) => {
  await next();
  c.header('Access-Control-Allow-Origin', resolveAllowOrigin(c.req.raw));
  c.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  c.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-client-info, apikey');
});
app.use('*', logger());

app.use('*', async (c, next) => {
  const requestId = crypto.randomUUID();
  const started = Date.now();
  await next();
  c.header('X-Request-Id', requestId);
  const path = new URL(c.req.url).pathname;
  console.log(
    JSON.stringify({
      level: 'info',
      msg: 'request',
      requestId,
      method: c.req.method,
      path,
      status: c.res.status,
      durationMs: Date.now() - started,
    }),
  );
});

// Initialize Supabase client with service role (for admin operations)
const getSupabaseClient = () => {
  return createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );
};

// Create Supabase client with user's access token (for user verification)
const getUserClient = (accessToken: string) => {
  return createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    {
      global: {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    }
  );
};

// Helper to get user ID from access token — verifies the JWT via Supabase auth
const getUserId = async (accessToken: string | null): Promise<string | null> => {
  if (!accessToken) return null;

  try {
    const supabase = getSupabaseClient();
    const { data: { user }, error } = await supabase.auth.getUser(accessToken);
    if (error || !user) return null;
    return user.id;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('getUserId: token verification failed:', msg);
    return null;
  }
};

app.get(`${ROUTE_PREFIX}/health`, (c) =>
  c.json({
    ok: true,
    service: 'make-server-cbd74580',
    version: Deno.env.get('DEPLOY_SHA') ?? Deno.env.get('GIT_SHA') ?? 'dev',
    time: new Date().toISOString(),
  }),
);

// Helper function to get fresh Google Calendar access token
async function getGoogleAccessToken(userId: string): Promise<string | null> {
  const tokens = await kv.get(`google_calendar_tokens:${userId}`) as any;
  
  if (!tokens) {
    return null;
  }
  
  // Check if token is expired or expiring soon (within 5 minutes)
  if (tokens.expiresAt && Date.now() >= tokens.expiresAt - 300000) {
    // Refresh the token
    const clientId = Deno.env.get('GOOGLE_CLIENT_ID');
    const clientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET');
    
    if (!clientId || !clientSecret || !tokens.refreshToken) {
      return null;
    }
    
    try {
      const refreshResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          refresh_token: tokens.refreshToken,
          client_id: clientId,
          client_secret: clientSecret,
          grant_type: 'refresh_token',
        }),
      });
      
      if (!refreshResponse.ok) {
        console.error('Token refresh failed:', await refreshResponse.text());
        return null;
      }
      
      const newTokens = await refreshResponse.json();
      
      // Update stored tokens
      await kv.set(`google_calendar_tokens:${userId}`, {
        ...tokens,
        accessToken: newTokens.access_token,
        expiresAt: Date.now() + (newTokens.expires_in * 1000),
        refreshToken: newTokens.refresh_token || tokens.refreshToken,
      });
      
      return newTokens.access_token;
    } catch (error) {
      console.error('Error refreshing token:', error);
      return null;
    }
  }
  
  return tokens.accessToken;
}

// Helper function to create Google Calendar event
async function createGoogleCalendarEvent(userId: string, eventData: any) {
  const accessToken = await getGoogleAccessToken(userId);
  
  if (!accessToken) {
    return null;
  }
  
  const event = {
    summary: eventData.summary,
    description: eventData.description,
    start: {
      dateTime: eventData.startDateTime,
      timeZone: 'Africa/Lagos',
    },
    end: {
      dateTime: eventData.endDateTime,
      timeZone: 'Africa/Lagos',
    },
    location: eventData.location || 'Knowledge Fons Academy Virtual Classroom',
    reminders: {
      useDefault: false,
      overrides: [
        { method: 'email', minutes: 24 * 60 },
        { method: 'popup', minutes: 30 },
      ],
    },
  };
  
  try {
    const response = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(event),
    });
    
    if (!response.ok) {
      console.error('Failed to create calendar event:', await response.text());
      return null;
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error creating calendar event:', error);
    return null;
  }
}

// Helper function to delete Google Calendar event
async function deleteGoogleCalendarEvent(userId: string, eventId: string) {
  const accessToken = await getGoogleAccessToken(userId);
  
  if (!accessToken) {
    return null;
  }
  
  try {
    const response = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });
    
    if (!response.ok && response.status !== 204) {
      console.error('Failed to delete calendar event:', await response.text());
      return null;
    }
    
    return true;
  } catch (error) {
    console.error('Error deleting calendar event:', error);
    return null;
  }
}

// Register content library routes
contentLibraryRoutes(app, getUserId);

// Register progress analytics routes
progressAnalyticsRoutes(app, getUserId);

// Register notifications routes (includes schedule-reminders + DB-backed notifications/:userId)
notificationsRoutes(app, getUserId);

// Register messaging routes
messagingRoutes(app, getUserId);

// Register conversations routes (for non-deletable chatrooms)
conversationsRoutes(app, getUserId);

// Register tutor profile routes (reviews, stats)
tutorProfileRoutes(app, getUserId);

// Register documents routes (for file upload/download)
const supabase = getSupabaseClient();
documentsRoutes(app, getUserId, supabase);

// Register system alerts routes
systemAlertsRoutes(app, getUserId);

// Register parent-children routes
app.route('/make-server-cbd74580/parent', parentChildrenRoutes);

// Register admin routes
adminRoutes(app, getUserId);

// Register student auth routes
studentAuthRoutes(app, getUserId);

// Register reviews and disputes routes
app.route('/make-server-cbd74580', reviewsDisputesRoutes);

// Register subscriptions routes
app.route('/make-server-cbd74580', subscriptionsRoutes);

// DIRECT SUBSCRIPTION TIERS ROUTE (debugging)
// NOTE: Live tutoring is now direct payment - subscriptions are for books, resources, and platform features
app.get('/make-server-cbd74580/subscription-tiers', async (c) => {
  console.log('=== DIRECT /subscription-tiers endpoint called ===');
  
  const TIERS = [
    {
      id: 'basic',
      name: 'Basic',
      price: 19.99,
      currency: 'GBP',
      billingCycle: 'monthly',
      maxChildren: 1,
      booksIncluded: 10,
      benefits: [
        '1 child profile',
        'Access to 10 educational books',
        'Basic progress tracking',
        'Email support',
        'Standard tutor matching',
        'Session recordings (7 days retention)',
        'Access to content library',
        'Pay-as-you-go for live tutoring sessions'
      ],
      color: '#625d9c'
    },
    {
      id: 'standard',
      name: 'Standard',
      price: 39.99,
      currency: 'GBP',
      billingCycle: 'monthly',
      maxChildren: 2,
      booksIncluded: 50,
      benefits: [
        'Up to 2 child profiles',
        'Access to 50+ educational books',
        'Advanced progress tracking with analytics',
        'Priority email & chat support',
        'Priority tutor matching',
        'Session recordings (30 days retention)',
        'Full content library access',
        'Personalized learning plans',
        'Homework assignment tracking',
        '10% discount on live tutoring sessions'
      ],
      popular: true,
      color: '#5d9827'
    },
    {
      id: 'premium',
      name: 'Premium',
      price: 79.99,
      currency: 'GBP',
      billingCycle: 'monthly',
      maxChildren: 4,
      booksIncluded: 999,
      benefits: [
        'Up to 4 child profiles',
        'Unlimited access to all educational books',
        'Full analytics dashboard',
        '24/7 priority support',
        'Dedicated tutor matching specialist',
        'Unlimited session recordings',
        'Advanced personalized learning plans',
        'Homework & assignment tracking',
        'Quarterly progress reviews',
        'Early access to new features',
        '20% discount on live tutoring sessions',
        'Free monthly webinar access'
      ],
      color: '#625d9c'
    }
  ];

  return c.json({
    success: true,
    tiers: TIERS
  });
});

// Register Google Calendar routes
googleCalendarRoutes(app, getSupabaseClient);

// Register coupons and credits routes
app.route('/make-server-cbd74580', couponsCreditsRoutes);

// Register tax and invoicing routes
app.route('/make-server-cbd74580', taxInvoicingRoutes);

// Register booking routes
app.route('/make-server-cbd74580', bookingRoutes);

// Register smart matching routes
app.route('/make-server-cbd74580', smartMatchingRoutes);

// Register reports and notifications routes
reportsNotificationsRoutes(app, getUserId);

// Register trust & safety routes
app.route('/make-server-cbd74580/moderation', contentModerationRoutes);
app.route('/make-server-cbd74580/sanctions', sanctionsRoutes);
app.route('/make-server-cbd74580/policies', policiesRoutes);

// Register bookshop routes
app.route('/make-server-cbd74580/bookshop', bookshopRoutes);

// Register role management routes
app.route('/make-server-cbd74580/role-management', roleManagementRoutes);

// Register assessments routes
app.route('/make-server-cbd74580/assessments', assessmentsRoutes);

// Register curriculum routes
app.route('/make-server-cbd74580/curriculum', curriculumRoutes);

// Register trivia routes
app.route('/make-server-cbd74580/trivia', triviaRoutes);

// Register trivia-extended (daily challenge + time attack) and /battle/* (arena)
app.route('/make-server-cbd74580/trivia-extended', dailyExtendedRoutes);
app.route('/make-server-cbd74580', battleRoutes);

// Register achievement routes (badges, leaderboards, stats)
app.route('/make-server-cbd74580/achievements', achievementRoutes);

// Register topic/learning paths routes
app.route('/make-server-cbd74580/topics', topicRoutes);

// Register teacher routes (profiles, classes, management)
app.route('/make-server-cbd74580/teacher', teacherRoutes);

// Register teacher question & assignment routes
app.route('/make-server-cbd74580/teacher', teacherQuestionRoutes);

// Register analytics routes
app.route('/make-server-cbd74580/analytics', analyticsRoutes);

// Register session assignment (workflow) routes
app.route('/make-server-cbd74580', sessionAssignmentRoutes);

// Register live collaboration (whiteboard) routes
app.route('/make-server-cbd74580', liveCollaborationRoutes);

// Register tutor session reports routes
app.route('/make-server-cbd74580/tutor-session-reports', tutorSessionReportsRoutes);

// Register payment routes
app.route('/make-server-cbd74580', paymentRoutes);

// Register NEW payment plans routes (Trial, Weekly, Twice-Weekly)
app.route('/make-server-cbd74580', paymentPlansRoutes);

// Register live session routes
app.route('/make-server-cbd74580', liveSessionRoutes);

// Register payout routes (tutor payouts dashboard)
app.route('/make-server-cbd74580/tutor/payouts', payoutsComplete);

// Register invoice routes
app.route('/make-server-cbd74580/invoices', invoiceRoutes);

// Register video conference routes
app.route('/make-server-cbd74580', videoRoutes);

// Register screen sharing routes
app.route('/make-server-cbd74580', screenShareRoutes);

// Routes extracted to separate files
app.route('/make-server-cbd74580', signupRoutes);
app.route('/make-server-cbd74580', tutorSearchRoutes);
app.route('/make-server-cbd74580', invitationRoutes);

// Register migration routes (admin-only KV → Postgres migration)
app.route('/make-server-cbd74580', migrationRoutes);

// Register profile avatar upload route
app.route('/make-server-cbd74580', profileAvatarRoutes);

// TEST ROUTE - Direct subscription tiers endpoint
app.get('/make-server-cbd74580/subscription-tiers-test', async (c) => {
  console.log('=== TEST ENDPOINT CALLED ===');
  return c.json({
    success: true,
    message: 'Test endpoint working',
    tiers: [
      {
        id: 'basic',
        name: 'Basic',
        price: 29.99,
        currency: 'GBP',
        billingCycle: 'monthly',
        maxChildren: 1,
        sessionsPerChild: 4,
        sessions: 4,
        benefits: ['Test benefit'],
        color: '#625d9c'
      }
    ]
  });
});

// ============================================
// AUTHENTICATION ROUTES
// ============================================

// Diagnostic endpoint to test service role key
app.get('/make-server-cbd74580/test-auth', async (c) => {
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    console.log('=== AUTH TEST ENDPOINT ===');
    console.log('SUPABASE_URL:', supabaseUrl);
    console.log('SERVICE_ROLE_KEY exists:', !!serviceRoleKey);
    console.log('SERVICE_ROLE_KEY length:', serviceRoleKey?.length || 0);
    
    if (!supabaseUrl || !serviceRoleKey) {
      return c.json({ 
        success: false, 
        error: 'Missing environment variables',
        details: {
          hasUrl: !!supabaseUrl,
          hasKey: !!serviceRoleKey
        }
      });
    }
    
    const supabase = createClient(supabaseUrl, serviceRoleKey);
    
    // Try to list users
    const { data, error } = await supabase.auth.admin.listUsers();
    
    if (error) {
      console.error('Auth test failed:', error);
      return c.json({ 
        success: false, 
        error: error.message,
        errorDetails: {
          status: error.status,
          code: error.code,
          name: error.name
        }
      });
    }
    
    return c.json({ 
      success: true, 
      message: 'Authentication working correctly',
      userCount: data.users.length 
    });
  } catch (err: any) {
    console.error('Auth test exception:', err);
    return c.json({ 
      success: false, 
      error: err.message,
      stack: err.stack 
    });
  }
});

// Test endpoint to verify Supabase connection
app.get('/make-server-cbd74580/test-supabase', async (c) => {
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
    
    if (!supabaseUrl || !anonKey) {
      return c.json({
        error: 'Missing environment variables',
        hasUrl: !!supabaseUrl,
        hasAnonKey: !!anonKey
      }, 500);
    }
    
    const testClient = createClient(supabaseUrl, anonKey);
    
    // Try to call a simple auth method to test the connection
    const { data, error } = await testClient.auth.getSession();
    
    return c.json({
      success: true,
      message: 'Supabase client created successfully',
      hasUrl: !!supabaseUrl,
      hasAnonKey: !!anonKey,
      anonKeyLength: anonKey.length,
      anonKeyStart: anonKey.substring(0, 20),
      urlValue: supabaseUrl,
      sessionCheckError: error ? error.message : null,
      sessionCheckSuccess: !error
    });
  } catch (err: any) {
    return c.json({
      error: 'Exception during test',
      message: err.message,
      stack: err.stack
    }, 500);
  }
});

// check-email + signup moved to signup-routes.tsx

// MOVED TO: signup-routes.tsx

// ============================================
// PROFILE ROUTES
// ============================================

// Get user profile
app.get('/make-server-cbd74580/profile', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    
    if (!accessToken) {
      console.log('GET /profile: No access token provided');
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const userId = await getUserId(accessToken);

    if (!userId) {
      console.log('GET /profile: No userId - unauthorized');
      return c.json({ error: 'Unauthorized' }, 401);
    }

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📖 GET /profile called');
    console.log('User ID:', userId);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    // Try to get profile from KV store with a quick fallback
    let profile = await kv.get(`user:${userId}`) as any;

    if (profile) {
      console.log('✅ Profile found in KV store');
      console.log('Profile role:', profile.role);

      // If profile has no role, try to recover it from auth user_metadata
      if (!profile.role) {
        console.log('⚠️ KV profile has no role — checking user_metadata for recovery');
        try {
          const supabaseForMeta = getSupabaseClient();
          const { data: { user: metaUser } } = await supabaseForMeta.auth.admin.getUserById(userId);
          if (metaUser?.user_metadata?.role) {
            profile.role = metaUser.user_metadata.role;
            profile.onboardingComplete = true;
            // Persist the recovered role back to KV
            kv.set(`user:${userId}`, profile).catch(() => {});
            console.log('✅ Role recovered from user_metadata:', profile.role);
          }
        } catch (metaErr: any) {
          console.warn('⚠️ Could not recover role from user_metadata:', metaErr.message);
        }
      }

      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      return c.json({ profile });
    }

    // Profile doesn't exist - create it quickly
    console.log('⚠️  No profile found in KV store, creating basic profile from user metadata');
    const supabase = getSupabaseClient();
    const { data: getUserData2, error: getUserError } = await supabase.auth.admin.getUserById(userId);
    const user = getUserData2?.user ?? null;

    if (getUserError || !user) {
      console.error('Error getting user by ID:', getUserError?.message);
      // Return a minimal profile even if auth lookup fails
      const minimalProfile = {
        userId,
        id: userId,
        email: '',
        role: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      return c.json({ profile: minimalProfile });
    }

    const newProfile = {
      userId,
      id: userId,
      email: user?.email || '',
      full_name: user?.user_metadata?.name || '',
      role: user?.user_metadata?.role || null,
      profileData: {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    console.log('Creating new profile:', newProfile);
    
    // Save profile asynchronously - don't wait for KV operations
    kv.set(`user:${userId}`, newProfile).catch(err => {
      console.error('Error saving profile to KV:', err);
    });
    
    // Also save to role-specific profile if role exists (async)
    if (newProfile.role) {
      const roleProfileKey = `profile_${newProfile.role}_${userId}`;
      kv.set(roleProfileKey, newProfile).catch(err => {
        console.error('Error saving role-specific profile:', err);
      });
      
      // Initialize user_roles (async)
      kv.set(`user_roles:${userId}`, [newProfile.role]).catch(err => {
        console.error('Error initializing user_roles:', err);
      });
    }
    
    // Return immediately with the profile
    return c.json({ profile: newProfile });
  } catch (error: any) {
    console.error('Error fetching profile:', error);
    return c.json({ error: error.message || 'Internal server error' }, 500);
  }
});

// Set user role
app.post('/make-server-cbd74580/profile', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const userId = await getUserId(accessToken ?? null);

    if (!userId) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const { role } = await c.req.json();

    if (!role || !['parent', 'student', 'tutor'].includes(role)) {
      return c.json({ error: 'Invalid role' }, 400);
    }

    let profile = await kv.get(`user:${userId}`) as any;

    if (!profile) {
      // Profile missing from KV (e.g. Google OAuth user who hasn't set a role yet).
      // Try to seed basic info from the admin auth API; fall back to an empty shell
      // so the role assignment never fails with a 404.
      let email = '';
      let full_name = '';
      try {
        const adminSupa = getSupabaseClient();
        const { data, error } = await adminSupa.auth.admin.getUserById(userId);
        if (!error && data?.user) {
          email = data.user.email || '';
          full_name =
            data.user.user_metadata?.name ||
            data.user.user_metadata?.full_name ||
            '';
        }
      } catch (_) {
        // Non-fatal — we can still create a minimal profile
      }
      profile = {
        userId,
        id: userId,
        email,
        full_name,
        role: null,
        profileData: {},
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    }

    // Create updated profile object
    const updatedProfile = {
      ...profile,
      userId,
      role,
      updatedAt: new Date().toISOString(),
    };

    await kv.set(`user:${userId}`, updatedProfile);

    // Initialize user_roles if not already set
    const existingRoles = await kv.get(`user_roles:${userId}`) as string[];
    if (!existingRoles || existingRoles.length === 0) {
      await kv.set(`user_roles:${userId}`, [role]);
      console.log(`Initialized user_roles for ${userId} with role: ${role}`);
    }

    return c.json({ success: true, profile: updatedProfile });
  } catch (error: any) {
    console.error('Error setting role:', error);
    return c.json({ error: error.message || 'Internal server error' }, 500);
  }
});

// Get any user's profile by ID (used by TutorDashboard to load student details)
app.get('/make-server-cbd74580/profiles/:userId', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const requesterId = await getUserId(accessToken ?? null);
    if (!requesterId) return c.json({ error: 'Unauthorized' }, 401);

    const targetUserId = c.req.param('userId');

    // Try KV first (most profiles still there), fall back to profiles table
    let profile = await kv.get(`user:${targetUserId}`) as any;
    if (!profile) {
      profile = await getProfile(targetUserId);
    }
    if (!profile) return c.json({ error: 'Profile not found' }, 404);

    // Strip sensitive fields before returning to other users
    const { password, ...safeProfile } = profile;
    return c.json({ profile: safeProfile });
  } catch (err: any) {
    console.error('GET /profiles/:userId error:', err);
    return c.json({ error: err.message || 'Internal server error' }, 500);
  }
});

// Update/Create user profile (PUT)
app.put('/make-server-cbd74580/profiles/:userId', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const requesterId = await getUserId(accessToken ?? null);

    if (!requesterId) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const targetUserId = c.req.param('userId');
    
    // Users can only update their own profile
    if (requesterId !== targetUserId) {
      return c.json({ error: 'Forbidden: Can only update your own profile' }, 403);
    }

    const profileData = await c.req.json();
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🔄 PUT /profiles/:userId - Profile Update Request');
    console.log('Target User ID:', targetUserId);
    console.log('Requester ID:', requesterId);
    console.log('Profile data received:', JSON.stringify(profileData, null, 2));
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    // Get existing profile or create new one
    const existingProfile = await kv.get(`user:${targetUserId}`) as any;
    console.log('📋 Existing profile:', existingProfile ? JSON.stringify(existingProfile, null, 2) : 'NONE');
    
    // Get user info from Supabase auth
    const supabase = getSupabaseClient();
    const { data: getUserData, error: getUserError } = await supabase.auth.admin.getUserById(targetUserId);
    const user = getUserData?.user ?? null;

    if (getUserError || !user) {
      console.error('❌ Error getting user:', getUserError);
      return c.json({ error: 'User not found' }, 404);
    }

    // Determine role from profile data or existing profile
    // DO NOT default to 'tutor' - role should be explicitly provided
    console.log('🎭 Role determination:');
    console.log('  - profileData.role:', profileData.role);
    console.log('  - existingProfile?.role:', existingProfile?.role);
    const role = profileData.role || existingProfile?.role;
    console.log('  - FINAL ROLE:', role);
    
    if (!role) {
      console.error('❌ NO ROLE PROVIDED - Rejecting profile creation/update');
      console.error('Profile data:', JSON.stringify(profileData, null, 2));
      console.error('Existing profile:', JSON.stringify(existingProfile, null, 2));
      return c.json({ error: 'Role is required for profile creation' }, 400);
    }
    
    console.log('✅ Role assigned:', role);

    // Split full_name into firstName and lastName if provided
    let firstName = profileData.firstName || existingProfile?.firstName;
    let lastName = profileData.lastName || existingProfile?.lastName;
    
    if (profileData.full_name && !firstName && !lastName) {
      const nameParts = profileData.full_name.trim().split(' ');
      firstName = nameParts[0] || '';
      lastName = nameParts.slice(1).join(' ') || '';
    }

    // Create the main profile
    const updatedProfile = {
      ...existingProfile,
      ...profileData,
      id: targetUserId,
      userId: targetUserId,
      email: user.email,
      firstName,
      lastName,
      fullName: profileData.full_name || `${firstName} ${lastName}`.trim(),
      role,
      updatedAt: new Date().toISOString(),
      createdAt: existingProfile?.createdAt || new Date().toISOString(),
    };

    // Handle tutor verification records
    if (role === 'tutor') {
      // For new tutors or profile updates, create/update verification record
      const existingVerification = await kv.get(`verification:${targetUserId}`) as any;
      
      if (!existingProfile || !existingProfile.onboardingComplete) {
        // New tutor - create initial verification record
        console.log('New tutor signup - creating verification record');
        await kv.set(`verification:${targetUserId}`, {
          userId: targetUserId,
          status: 'pending',
          submittedAt: new Date().toISOString(),
          reviewedAt: null,
          reviewedBy: null,
          rejectionReason: null,
          previousStatus: null,
          isUpdate: false,
          appeals: [],
        });
        console.log('Verification record created for new tutor');
      } else if (existingProfile?.onboardingComplete) {
        // Existing tutor updating profile - reset to pending
        console.log('Tutor profile updated - resetting verification status to pending');
        updatedProfile.verificationStatus = 'pending';
        updatedProfile.profileUpdatedAt = new Date().toISOString();
        
        await kv.set(`verification:${targetUserId}`, {
          userId: targetUserId,
          status: 'pending',
          submittedAt: new Date().toISOString(),
          reviewedAt: null,
          reviewedBy: null,
          rejectionReason: null,
          previousStatus: existingVerification?.status || null,
          isUpdate: true,
          appeals: existingVerification?.appeals || [],
        });
        console.log('Verification record updated for tutor profile update');
      }
    }

    // Save the main profile
    await kv.set(`user:${targetUserId}`, updatedProfile);
    console.log('💾 Main profile saved to user:' + targetUserId);
    console.log('Profile summary:', {
      userId: updatedProfile.userId,
      email: updatedProfile.email,
      role: updatedProfile.role,
      fullName: updatedProfile.fullName
    });

    // Save role-specific profile for role management system
    const roleProfileKey = `profile_${role}_${targetUserId}`;
    await kv.set(roleProfileKey, updatedProfile);
    console.log('💾 Role-specific profile saved to:', roleProfileKey);

    // Initialize or update user_roles array
    let userRoles = await kv.get(`user_roles:${targetUserId}`) as string[];
    console.log('📋 Current user_roles:', userRoles);
    if (!userRoles || userRoles.length === 0) {
      userRoles = [role];
      await kv.set(`user_roles:${targetUserId}`, userRoles);
      console.log(`✅ Initialized user_roles for ${targetUserId} with role: [${role}]`);
    } else if (!userRoles.includes(role)) {
      userRoles.push(role);
      await kv.set(`user_roles:${targetUserId}`, userRoles);
      console.log(`✅ Added ${role} to user_roles for ${targetUserId}, now: [${userRoles.join(', ')}]`);
    } else {
      console.log(`ℹ️  Role ${role} already in user_roles: [${userRoles.join(', ')}]`);
    }
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ Profile update complete for user:', targetUserId);
    console.log('Final role:', role);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    return c.json({ success: true, profile: updatedProfile });
  } catch (error: any) {
    console.error('Error updating profile:', error);
    return c.json({ error: error.message || 'Internal server error' }, 500);
  }
});

// Admin: Fix user role (for correcting signup issues)
app.post('/make-server-cbd74580/admin/fix-user-role', async (c) => {
  try {
    const { userEmail, correctRole } = await c.req.json();
    
    if (!userEmail || !correctRole) {
      return c.json({ error: 'userEmail and correctRole are required' }, 400);
    }
    
    if (!['parent', 'student', 'tutor', 'admin'].includes(correctRole)) {
      return c.json({ error: 'Invalid role' }, 400);
    }
    
    // Get user by email
    const supabase = getSupabaseClient();
    const { data, error } = await supabase.auth.admin.listUsers();
    
    if (error || !data) {
      console.error('Error listing users:', error);
      return c.json({ error: 'Failed to find user' }, 500);
    }
    
    const user = data.users.find(u => u.email?.toLowerCase() === userEmail.toLowerCase());
    
    if (!user) {
      return c.json({ error: 'User not found' }, 404);
    }
    
    const userId = user.id;
    
    // Get current profile
    const profile = await kv.get(`user:${userId}`) as any;
    
    if (!profile) {
      return c.json({ error: 'Profile not found' }, 404);
    }
    
    console.log(`Fixing role for user ${userEmail} (${userId})`);
    console.log(`Old role: ${profile.role}, New role: ${correctRole}`);
    
    // Update profile with correct role
    const updatedProfile = {
      ...profile,
      role: correctRole,
      updatedAt: new Date().toISOString(),
    };
    
    await kv.set(`user:${userId}`, updatedProfile);
    
    // Update role-specific profile
    const roleProfileKey = `profile_${correctRole}_${userId}`;
    await kv.set(roleProfileKey, updatedProfile);
    
    // Delete old role profile if different
    if (profile.role && profile.role !== correctRole) {
      await kv.del(`profile_${profile.role}_${userId}`);
    }
    
    // Update user_roles array
    await kv.set(`user_roles:${userId}`, [correctRole]);
    
    console.log(`Successfully fixed role for user ${userEmail} to ${correctRole}`);
    
    return c.json({ 
      success: true, 
      message: `Successfully updated role from '${profile.role}' to '${correctRole}'`,
      profile: updatedProfile 
    });
  } catch (error: any) {
    console.error('Error fixing user role:', error);
    return c.json({ error: error.message || 'Internal server error' }, 500);
  }
});

// Complete profile onboarding
app.post('/make-server-cbd74580/profile/complete', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const userId = await getUserId(accessToken ?? null);

    if (!userId) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const profile = await kv.get(`user:${userId}`) as any;

    if (!profile) {
      return c.json({ error: 'Profile not found' }, 404);
    }

    // Check if this is a tutor profile with file uploads
    const contentType = c.req.header('Content-Type') || '';
    
    if (contentType.includes('multipart/form-data')) {
      // Handle tutor profile with file uploads
      const formData = await c.req.formData();
      const formDataJson = formData.get('formData') as string;
      const profileData = JSON.parse(formDataJson);

      const supabase = getSupabaseClient();
      const bucketName = 'make-cbd74580-tutor-documents';

      // Ensure bucket exists
      const { data: buckets } = await supabase.storage.listBuckets();
      const bucketExists = buckets?.some(bucket => bucket.name === bucketName);
      if (!bucketExists) {
        await supabase.storage.createBucket(bucketName, { public: false });
      }

      const uploadedFiles: any = {
        photo: null,
        idDocument: null,
        dbsDocument: null,
        certificates: [],
      };

      // Upload photo
      const photo = formData.get('photo') as File;
      if (photo) {
        const photoPath = `${userId}/photo_${Date.now()}_${photo.name}`;
        const photoBuffer = await photo.arrayBuffer();
        const { error: photoError } = await supabase.storage
          .from(bucketName)
          .upload(photoPath, photoBuffer, { contentType: photo.type });
        
        if (!photoError) {
          uploadedFiles.photo = photoPath;
        }
      }

      // Upload ID document
      const idDocument = formData.get('idDocument') as File;
      if (idDocument) {
        const idPath = `${userId}/id_${Date.now()}_${idDocument.name}`;
        const idBuffer = await idDocument.arrayBuffer();
        const { error: idError } = await supabase.storage
          .from(bucketName)
          .upload(idPath, idBuffer, { contentType: idDocument.type });
        
        if (!idError) {
          uploadedFiles.idDocument = idPath;
        }
      }

      // Upload DBS document
      const dbsDocument = formData.get('dbsDocument') as File;
      if (dbsDocument) {
        const dbsPath = `${userId}/dbs_${Date.now()}_${dbsDocument.name}`;
        const dbsBuffer = await dbsDocument.arrayBuffer();
        const { error: dbsError } = await supabase.storage
          .from(bucketName)
          .upload(dbsPath, dbsBuffer, { contentType: dbsDocument.type });
        
        if (!dbsError) {
          uploadedFiles.dbsDocument = dbsPath;
        }
      }

      // Upload certificates
      let certIndex = 0;
      while (formData.has(`certificate_${certIndex}`)) {
        const cert = formData.get(`certificate_${certIndex}`) as File;
        if (cert) {
          const certPath = `${userId}/cert_${certIndex}_${Date.now()}_${cert.name}`;
          const certBuffer = await cert.arrayBuffer();
          const { error: certError } = await supabase.storage
            .from(bucketName)
            .upload(certPath, certBuffer, { contentType: cert.type });
          
          if (!certError) {
            uploadedFiles.certificates.push(certPath);
          }
        }
        certIndex++;
      }

      // Update profile with tutor data and verification status
      const updatedProfile = {
        ...profile,
        userId, // Explicitly set userId for consistency
        ...profileData,
        documents: uploadedFiles,
        verificationStatus: 'pending', // pending, verified, rejected
        kycStatus: 'pending',
        dbsStatus: profileData.hasDbsCheck ? 'pending' : 'not_applicable',
        onboardingComplete: true,
        profileSubmittedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await kv.set(`user:${userId}`, updatedProfile);

      // Create verification record for admin review
      await kv.set(`verification:${userId}`, {
        userId,
        status: 'pending',
        submittedAt: new Date().toISOString(),
        reviewedAt: null,
        reviewedBy: null,
        rejectionReason: null,
        appeals: [],
      });

      // Send profile-submitted confirmation to tutor + admin notification (non-fatal)
      try {
        const profileEmail = profile.email || updatedProfile.email;
        const profileName = updatedProfile.fullName || updatedProfile.name || profile.name || 'Tutor';
        const appBase = Deno.env.get('VITE_APP_URL') || 'https://app.tutornest.org';
        if (profileEmail) {
          const submittedTpl = emailTemplates.tutorProfileSubmitted(profileName, `${appBase}/dashboard`);
          await sendEmail({ to: profileEmail, subject: submittedTpl.subject, html: submittedTpl.html }).catch(() => {});
        }
        const adminEmail = Deno.env.get('ADMIN_EMAIL') || 'admin@tutornest.org';
        const adminTpl = emailTemplates.adminTutorApplicationAlert(profileName, profileEmail || 'unknown', `${appBase}/admin/verifications`);
        await sendEmail({ to: adminEmail, subject: adminTpl.subject, html: adminTpl.html }).catch(() => {});
      } catch (_e) {}

      return c.json({ success: true, profile: updatedProfile });
    } else {
      // Handle parent/student profile (JSON only)
      const profileData = await c.req.json();

      const updatedProfile = {
        ...profile,
        userId, // Explicitly set userId for consistency
        ...profileData,
        onboardingComplete: true,
        updatedAt: new Date().toISOString(),
      };

      await kv.set(`user:${userId}`, updatedProfile);

      return c.json({ success: true, profile: updatedProfile });
    }
  } catch (error: any) {
    console.error('Error completing profile:', error);
    return c.json({ error: error.message || 'Internal server error' }, 500);
  }
});

// ============================================
// HEALTH CHECK
// ============================================

// ============================================
// ADMIN VERIFICATION ROUTES
// ============================================

// Get all pending verifications (admin only)
app.get('/make-server-cbd74580/admin/verifications/pending', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const userId = await getUserId(accessToken ?? null);

    if (!userId) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    // TODO: Add admin role check
    // For now, any authenticated user can access (you should add role-based access control)

    // Verify admin role
    const requestingUser = await kv.get(`user:${userId}`) as any;
    if (!requestingUser || requestingUser.role !== 'admin') {
      return c.json({ error: 'Admin access required' }, 403);
    }

    const verifications = await kv.getByPrefix('verification:');
    const pending = verifications.filter((v: any) => v.status === 'pending');

    console.log(`Found ${pending.length} pending verifications`);

    const adminSupabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    // Fetch user profiles for each verification
    const pendingWithProfiles = await Promise.all(
      pending.map(async (verification: any) => {
        let userProfile = await kv.get(`user:${verification.userId}`) as any;

        // If no KV profile exists, fall back to Supabase auth user metadata
        // so the admin always sees at least the name and email
        if (!userProfile) {
          try {
            const { data: { user: authUser } } = await adminSupabase.auth.admin.getUserById(verification.userId);
            if (authUser) {
              const metaName = authUser.user_metadata?.name || authUser.user_metadata?.full_name || '';
              userProfile = {
                id: authUser.id,
                userId: authUser.id,
                email: authUser.email,
                name: metaName,
                full_name: metaName,
                fullName: metaName,
                role: 'tutor',
                _fromAuthFallback: true,
              };
            }
          } catch (authErr: any) {
            console.warn(`Could not fetch auth user for ${verification.userId}:`, authErr.message);
          }
        }

        return {
          ...verification,
          profile: userProfile,
        };
      })
    );

    return c.json({ verifications: pendingWithProfiles });
  } catch (error: any) {
    console.error('Error fetching pending verifications:', error);
    return c.json({ error: error.message || 'Internal server error' }, 500);
  }
});

// Review tutor verification (admin only)
app.post('/make-server-cbd74580/admin/verifications/:userId/review', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const adminId = await getUserId(accessToken ?? null);

    if (!adminId) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const targetUserId = c.req.param('userId');
    const { action, rejectionReason, kycStatus, dbsStatus } = await c.req.json();

    if (!['approve', 'reject'].includes(action)) {
      return c.json({ error: 'Invalid action. Must be approve or reject' }, 400);
    }

    const verification = await kv.get(`verification:${targetUserId}`) as any;
    if (!verification) {
      return c.json({ error: 'Verification record not found' }, 404);
    }

    const userProfile = await kv.get(`user:${targetUserId}`) as any;
    if (!userProfile) {
      return c.json({ error: 'User profile not found' }, 404);
    }

    // Update verification record
    const updatedVerification = {
      ...verification,
      status: action === 'approve' ? 'verified' : 'rejected',
      reviewedAt: new Date().toISOString(),
      reviewedBy: adminId,
      rejectionReason: action === 'reject' ? rejectionReason : null,
    };

    await kv.set(`verification:${targetUserId}`, updatedVerification);

    // Update user profile
    const updatedProfile = {
      ...userProfile,
      verificationStatus: action === 'approve' ? 'verified' : 'rejected',
      kycStatus: kycStatus || userProfile.kycStatus,
      dbsStatus: dbsStatus || userProfile.dbsStatus,
      verifiedAt: action === 'approve' ? new Date().toISOString() : null,
      rejectionReason: action === 'reject' ? rejectionReason : null,
      updatedAt: new Date().toISOString(),
    };

    await kv.set(`user:${targetUserId}`, updatedProfile);

    // Send outcome email to the tutor
    const tutorEmail = userProfile.email;
    const tutorName = userProfile.fullName || userProfile.full_name || userProfile.name || 'Tutor';
    const _appUrl = Deno.env.get('VITE_APP_URL') || 'https://app.tutornest.org';
    if (tutorEmail) {
      try {
        if (action === 'approve') {
          const approveTpl = emailTemplates.tutorVerificationApproved(tutorName, `${_appUrl}/dashboard`);
          await sendEmail({ to: tutorEmail, subject: approveTpl.subject, html: approveTpl.html, replyTo: 'support@tutornest.org' });
          console.log('✅ Approval email sent to tutor:', tutorEmail);
        } else if (action === 'reject') {
          const rejectTpl = emailTemplates.tutorVerificationRejected(tutorName, rejectionReason || 'Please see the notes in your dashboard.', `${_appUrl}/dashboard`);
          await sendEmail({ to: tutorEmail, subject: rejectTpl.subject, html: rejectTpl.html, replyTo: 'support@tutornest.org' });
          console.log('✅ Rejection email sent to tutor:', tutorEmail);
        }
      } catch (emailErr: any) {
        console.warn('⚠️ Could not send outcome email to tutor:', emailErr.message);
      }
    }

    return c.json({
      success: true,
      verification: updatedVerification,
      profile: updatedProfile
    });
  } catch (error: any) {
    console.error('Error reviewing verification:', error);
    return c.json({ error: error.message || 'Internal server error' }, 500);
  }
});

// Submit appeal for rejected verification
app.post('/make-server-cbd74580/verifications/appeal', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const userId = await getUserId(accessToken ?? null);

    if (!userId) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const { appealReason, additionalDocuments } = await c.req.json();

    const verification = await kv.get(`verification:${userId}`) as any;
    if (!verification) {
      return c.json({ error: 'Verification record not found' }, 404);
    }

    if (verification.status !== 'rejected') {
      return c.json({ error: 'Can only appeal rejected verifications' }, 400);
    }

    // Add appeal to verification record
    const appeal = {
      submittedAt: new Date().toISOString(),
      reason: appealReason,
      additionalDocuments: additionalDocuments || [],
      status: 'pending', // pending, accepted, denied
    };

    const updatedVerification = {
      ...verification,
      status: 'under_appeal',
      appeals: [...(verification.appeals || []), appeal],
    };

    await kv.set(`verification:${userId}`, updatedVerification);

    // Update user profile status
    const userProfile = await kv.get(`user:${userId}`) as any;
    if (userProfile) {
      await kv.set(`user:${userId}`, {
        ...userProfile,
        verificationStatus: 'under_appeal',
        updatedAt: new Date().toISOString(),
      });
    }

    return c.json({ success: true, verification: updatedVerification });
  } catch (error: any) {
    console.error('Error submitting appeal:', error);
    return c.json({ error: error.message || 'Internal server error' }, 500);
  }
});

// Get tutor documents (admin or tutor themselves)
app.get('/make-server-cbd74580/tutors/:userId/documents/:documentType', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const requesterId = await getUserId(accessToken ?? null);

    if (!requesterId) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const targetUserId = c.req.param('userId');
    const documentType = c.req.param('documentType');

    // Check if requester is viewing their own documents or is admin
    // TODO: Add proper admin role check
    if (requesterId !== targetUserId) {
      // For now, allow any authenticated user (should be restricted to admins)
    }

    const userProfile = await kv.get(`user:${targetUserId}`) as any;
    if (!userProfile || !userProfile.documents) {
      return c.json({ error: 'Documents not found' }, 404);
    }

    const supabase = getSupabaseClient();
    const bucketName = 'make-cbd74580-tutor-documents';

    let documentPath = null;

    switch (documentType) {
      case 'photo':
        documentPath = userProfile.documents.photo;
        break;
      case 'id':
        documentPath = userProfile.documents.idDocument;
        break;
      case 'dbs':
        documentPath = userProfile.documents.dbsDocument;
        break;
      default:
        return c.json({ error: 'Invalid document type' }, 400);
    }

    if (!documentPath) {
      return c.json({ error: 'Document not found' }, 404);
    }

    // Generate signed URL (valid for 1 hour)
    const { data, error } = await supabase.storage
      .from(bucketName)
      .createSignedUrl(documentPath, 3600);

    if (error) {
      console.error('Error creating signed URL:', error);
      return c.json({ error: 'Failed to retrieve document' }, 500);
    }

    return c.json({ url: data.signedUrl });
  } catch (error: any) {
    console.error('Error fetching document:', error);
    return c.json({ error: error.message || 'Internal server error' }, 500);
  }
});

// Check DBS expiry (background job or manual trigger)
app.post('/make-server-cbd74580/admin/check-dbs-expiry', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const adminId = await getUserId(accessToken ?? null);

    if (!adminId) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const users = await kv.getByPrefix('user:');
    const tutors = users.filter((u: any) => u.role === 'tutor' && u.hasDbsCheck);

    const expiringOrExpired = [];

    for (const tutor of tutors) {
      if (tutor.dbsExpiryDate) {
        const expiryDate = new Date(tutor.dbsExpiryDate);
        const now = new Date();
        const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

        if (expiryDate < now) {
          // Expired
          expiringOrExpired.push({
            userId: tutor.id,
            name: `${tutor.firstName} ${tutor.lastName}`,
            status: 'expired',
            expiryDate: tutor.dbsExpiryDate,
          });

          // Update user profile to mark DBS as expired
          await kv.set(`user:${tutor.id}`, {
            ...tutor,
            dbsStatus: 'expired',
            canAcceptBookings: false,
            updatedAt: new Date().toISOString(),
          });
        } else if (expiryDate < thirtyDaysFromNow) {
          // Expiring soon
          expiringOrExpired.push({
            userId: tutor.id,
            name: `${tutor.firstName} ${tutor.lastName}`,
            status: 'expiring_soon',
            expiryDate: tutor.dbsExpiryDate,
          });
        }
      }
    }

    return c.json({ 
      success: true, 
      count: expiringOrExpired.length,
      tutors: expiringOrExpired 
    });
  } catch (error: any) {
    console.error('Error checking DBS expiry:', error);
    return c.json({ error: error.message || 'Internal server error' }, 500);
  }
});

// ============================================
// HEALTH CHECK
// ============================================

// ============================================
// SEARCH & MATCH ROUTES
// ============================================

// search/tutors + search/recommendations moved to tutor-search-routes.tsx

// ============================================
// INVITATION & SLA ROUTES
// ============================================

// invitations/send + invitations/tutor + invitations/:invitationId/respond + invitations/check-sla moved to invitation-routes.tsx

// ============================================
// HEALTH CHECK
// ============================================

// ============================================
// AVAILABILITY ROUTES
// ============================================

// Get tutor availability
app.get('/make-server-cbd74580/availability/:tutorId', async (c) => {
  try {
    const tutorId = c.req.param('tutorId');
    
    const availability = await kv.get(`availability:${tutorId}`) as any;
    
    if (!availability) {
      // Return default empty schedule
      return c.json({
        schedule: {
          Monday: { enabled: false, slots: [] },
          Tuesday: { enabled: false, slots: [] },
          Wednesday: { enabled: false, slots: [] },
          Thursday: { enabled: false, slots: [] },
          Friday: { enabled: false, slots: [] },
          Saturday: { enabled: false, slots: [] },
          Sunday: { enabled: false, slots: [] },
        },
        timezone: 'Africa/Lagos',
      });
    }

    return c.json(availability);
  } catch (error: any) {
    console.error('Error fetching availability:', error);
    return c.json({ error: error.message || 'Internal server error' }, 500);
  }
});

// Save tutor availability
app.post('/make-server-cbd74580/availability', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const userId = await getUserId(accessToken ?? null);

    if (!userId) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const { schedule, timezone } = await c.req.json();

    const availability = {
      userId,
      schedule,
      timezone,
      updatedAt: new Date().toISOString(),
    };

    await kv.set(`availability:${userId}`, availability);

    return c.json({ success: true, availability });
  } catch (error: any) {
    console.error('Error saving availability:', error);
    return c.json({ error: error.message || 'Internal server error' }, 500);
  }
});

// Get available slots for a specific date
app.get('/make-server-cbd74580/availability/:tutorId/slots', async (c) => {
  try {
    const tutorId = c.req.param('tutorId');
    const dateParam = c.req.query('date');

    if (!dateParam) {
      return c.json({ error: 'Date parameter required' }, 400);
    }

    const date = new Date(dateParam);
    const dayOfWeek = date.toLocaleDateString('en-US', { weekday: 'long' }) as 
      'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday' | 'Sunday';

    // Get tutor's availability
    const availability = await kv.get(`availability:${tutorId}`) as any;
    
    if (!availability || !availability.schedule[dayOfWeek]?.enabled) {
      return c.json({ slots: [] });
    }

    const daySchedule = availability.schedule[dayOfWeek];
    
    // Get all Knowledge Fons Academy bookings for this tutor on this date
    const allBookings = await kv.getByPrefix('booking:');
    const dateBookings = allBookings.filter((b: any) => 
      b.tutorId === tutorId && 
      b.date === dateParam && 
      b.status === 'confirmed'
    );

    // Get Google Calendar busy times if tutor has Google Calendar connected
    let googleBusyTimes: Array<{start: string, end: string}> = [];
    const tutorTokens = await kv.get(`google_calendar_tokens:${tutorId}`) as any;
    
    if (tutorTokens) {
      try {
        const googleAccessToken = await getGoogleAccessToken(tutorId);
        if (googleAccessToken) {
          // Fetch events for this specific date
          const dayStart = `${dateParam}T00:00:00Z`;
          const dayEnd = `${dateParam}T23:59:59Z`;
          
          const response = await fetch(
            `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${encodeURIComponent(dayStart)}&timeMax=${encodeURIComponent(dayEnd)}&singleEvents=true`,
            {
              headers: {
                'Authorization': `Bearer ${googleAccessToken}`,
              },
            }
          );
          
          if (response.ok) {
            const data = await response.json();
            googleBusyTimes = (data.items || [])
              .filter((event: any) => event.start?.dateTime && event.end?.dateTime)
              .map((event: any) => {
                // Extract time portion from ISO datetime
                const startTime = new Date(event.start.dateTime).toTimeString().substring(0, 5);
                const endTime = new Date(event.end.dateTime).toTimeString().substring(0, 5);
                return { start: startTime, end: endTime };
              });
            console.log(`Tutor ${tutorId} Google Calendar busy times for ${dateParam}:`, googleBusyTimes);
          }
        }
      } catch (error) {
        console.error('Error fetching Google Calendar events for availability:', error);
        // Continue without Google Calendar blocking
      }
    }

    // Generate slots from tutor's schedule
    const slots = [];
    for (const slot of daySchedule.slots) {
      // Split into 1-hour slots
      const startParts = slot.start.split(':');
      const endParts = slot.end.split(':');
      const startMinutes = parseInt(startParts[0]) * 60 + parseInt(startParts[1]);
      const endMinutes = parseInt(endParts[0]) * 60 + parseInt(endParts[1]);

      for (let minutes = startMinutes; minutes < endMinutes; minutes += 60) {
        const slotStart = `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
        const slotEnd = `${String(Math.floor((minutes + 60) / 60)).padStart(2, '0')}:${String((minutes + 60) % 60).padStart(2, '0')}`;

        // Check if slot is booked in Knowledge Fons Academy
        const isKnowledge Fons AcademyBooked = dateBookings.some((b: any) => {
          const bookingStart = b.startTime;
          const bookingEnd = b.endTime;
          return !(slotEnd <= bookingStart || slotStart >= bookingEnd);
        });

        // Check if slot conflicts with Google Calendar events
        const isGoogleCalendarBusy = googleBusyTimes.some((busyTime) => {
          return !(slotEnd <= busyTime.start || slotStart >= busyTime.end);
        });

        slots.push({
          date: dateParam,
          startTime: slotStart,
          endTime: slotEnd,
          available: !isKnowledge Fons AcademyBooked && !isGoogleCalendarBusy,
        });
      }
    }

    return c.json({ slots });
  } catch (error: any) {
    console.error('Error fetching slots:', error);
    return c.json({ error: error.message || 'Internal server error' }, 500);
  }
});

// ============================================
// BOOKING ROUTES
// ============================================

// Create booking (with atomic lock to prevent double-booking)
app.post('/make-server-cbd74580/bookings/create', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const parentId = await getUserId(accessToken ?? null);

    if (!parentId) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const { tutorId, studentId, date, startTime, endTime, price } = await c.req.json();

    if (!tutorId || !studentId || !date || !startTime || !endTime) {
      return c.json({ error: 'Missing required fields' }, 400);
    }

    // Atomic check: Verify slot is still available
    const allBookings = await kv.getByPrefix('booking:');
    const conflictingBooking = allBookings.find((b: any) => 
      b.tutorId === tutorId && 
      b.date === date && 
      b.status === 'confirmed' &&
      !(endTime <= b.startTime || startTime >= b.endTime)
    );

    if (conflictingBooking) {
      return c.json({ error: 'This slot has just been booked. Please select another time.' }, 409);
    }

    // Get tutor, student (child or user), and parent profiles
    const tutorProfile = await kv.get(`user:${tutorId}`) as any;
    let studentRecord: any = await kv.get(`child:${studentId}`);
    if (!studentRecord) studentRecord = await kv.get(`user:${studentId}`) as any;
    const parentProfile = await kv.get(`user:${parentId}`) as any;

    const resolveDisplayName = (p: any, fallback: string) =>
      p?.full_name ||
      p?.fullName ||
      p?.name ||
      (p?.firstName ? `${p.firstName} ${p.lastName ?? ''}`.trim() : null) ||
      fallback;

    const bookingId = `booking:${tutorId}:${studentId}:${Date.now()}`;
    const booking = {
      id: bookingId,
      tutorId,
      studentId,
      parentId,
      date,
      startTime,
      endTime,
      price,
      status: 'confirmed',
      tutorName: resolveDisplayName(tutorProfile, 'Tutor'),
      studentName: resolveDisplayName(studentRecord, 'Student'),
      tutorEmail: tutorProfile?.email,
      parentEmail: parentProfile?.email,
      createdAt: new Date().toISOString(),
      paymentStatus: 'paid', // In production, integrate with payment gateway
    };

    // Save to KV store
    await kv.set(bookingId, booking);

    // ALSO save to Postgres database for reschedule and other operations
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const supabase = createClient(supabaseUrl, serviceRoleKey);
    
    const { error: dbError } = await supabase
      .from('bookings')
      .insert({
        id: bookingId,
        user_id: parentId,
        tutor_id: tutorId,
        student_id: studentId,
        date,
        start_time: startTime,
        end_time: endTime,
        duration: 60, // default 1 hour
        subject: tutorProfile?.subjects?.[0] || 'General',
        status: 'confirmed',
        payment_status: 'paid',
        created_at: new Date().toISOString(),
      });
    
    if (dbError) {
      console.error('Warning: Failed to save booking to database:', dbError);
      // Continue anyway - KV store has the booking
    }

    // Create Google Calendar events for both parent and tutor if connected
    const calendarEventPromises = [];
    const attendeeEmails = [];
    
    // Build attendee list
    if (tutorProfile?.email) attendeeEmails.push(tutorProfile.email);
    if (parentProfile?.email && parentProfile.email !== tutorProfile?.email) {
      attendeeEmails.push(parentProfile.email);
    }
    
    // Get parent's Google Calendar tokens
    const parentTokens = await kv.get(`google_calendar_tokens:${parentId}`) as any;
    if (parentTokens) {
      const parentAccessToken = await getGoogleAccessToken(parentId);
      if (parentAccessToken) {
        calendarEventPromises.push({
          userId: parentId,
          accessToken: parentAccessToken,
          event: {
            summary: `Tutoring Session with ${booking.tutorName}`,
            description: `Knowledge Fons Academy tutoring session for ${booking.studentName}\n\nSubject: ${tutorProfile?.subjects?.[0] || 'General'}\nPrice: £${price}`,
            startDateTime: `${date}T${startTime}:00`,
            endDateTime: `${date}T${endTime}:00`,
            location: 'Knowledge Fons Academy Virtual Classroom',
            attendees: attendeeEmails,
          }
        });
      }
    }
    
    // Get tutor's Google Calendar tokens
    const tutorTokens = await kv.get(`google_calendar_tokens:${tutorId}`) as any;
    if (tutorTokens) {
      const tutorAccessToken = await getGoogleAccessToken(tutorId);
      if (tutorAccessToken) {
        calendarEventPromises.push({
          userId: tutorId,
          accessToken: tutorAccessToken,
          event: {
            summary: `Tutoring Session with ${booking.studentName}`,
            description: `Knowledge Fons Academy tutoring session\n\nStudent: ${booking.studentName}\nParent: ${parentProfile?.firstName || 'Parent'}\nPrice: £${price}`,
            startDateTime: `${date}T${startTime}:00`,
            endDateTime: `${date}T${endTime}:00`,
            location: 'Knowledge Fons Academy Virtual Classroom',
            attendees: attendeeEmails,
          }
        });
      }
    }
    
    // Execute calendar event creation (non-blocking)
    if (calendarEventPromises.length > 0) {
      Promise.all(calendarEventPromises.map(async (eventData) => {
        const googleEvent = {
          summary: eventData.event.summary,
          description: eventData.event.description,
          start: {
            dateTime: eventData.event.startDateTime,
            timeZone: 'Africa/Lagos',
          },
          end: {
            dateTime: eventData.event.endDateTime,
            timeZone: 'Africa/Lagos',
          },
          attendees: eventData.event.attendees.map((email: string) => ({ email })),
          location: eventData.event.location,
          reminders: {
            useDefault: false,
            overrides: [
              { method: 'email', minutes: 24 * 60 },
              { method: 'popup', minutes: 30 },
            ],
          },
          conferenceData: {
            createRequest: {
              requestId: crypto.randomUUID(),
              conferenceSolutionKey: {
                type: 'hangoutsMeet'
              }
            }
          }
        };
        
        const response = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events?conferenceDataVersion=1', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${eventData.accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(googleEvent),
        });
        
        if (!response.ok) {
          const error = await response.text();
          console.error(`Failed to create calendar event for user ${eventData.userId}:`, error);
          return null;
        }
        
        const createdEvent = await response.json();
        console.log(`Created Google Calendar event for user ${eventData.userId}:`, createdEvent.id, createdEvent.hangoutLink);
        
        return {
          userId: eventData.userId,
          eventId: createdEvent.id,
          meetLink: createdEvent.hangoutLink,
        };
      }))
        .then(results => {
          console.log('Google Calendar events created:', results.filter(r => r !== null).length);
          // Store Google Calendar event IDs and Meet links for future updates/deletions
          const eventIds: any = {};
          let meetLink = null;
          
          results.forEach((result) => {
            if (result) {
              if (result.userId === parentId) {
                eventIds.parentEventId = result.eventId;
              } else if (result.userId === tutorId) {
                eventIds.tutorEventId = result.eventId;
              }
              // Store the first Meet link we get
              if (!meetLink && result.meetLink) {
                meetLink = result.meetLink;
              }
            }
          });
          
          kv.set(bookingId, { ...booking, googleCalendarEventIds: eventIds, meetLink });
        })
        .catch(err => console.error('Error creating calendar events:', err));
    }

    try {
      const dashboardBase =
        Deno.env.get('FRONTEND_URL') || Deno.env.get('VITE_APP_URL') || 'https://app.tutornest.org';
      const parentName = resolveDisplayName(parentProfile, 'Parent');
      const studentName = resolveDisplayName(studentRecord, 'Student');
      const tutorName = resolveDisplayName(tutorProfile, 'Tutor');
      const subjectLine =
        (Array.isArray(tutorProfile?.subjects) && tutorProfile.subjects[0]) ||
        tutorProfile?.subject ||
        'Tutoring session';
      const parentEmailAddr = parentProfile?.email;
      const tutorEmailAddr = tutorProfile?.email;
      const studentEmailAddr =
        typeof studentRecord?.email === 'string' && studentRecord.email.includes('@')
          ? studentRecord.email.trim()
          : undefined;
      const formattedDate = new Date(`${date}T12:00:00+01:00`).toLocaleDateString('en-GB', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        timeZone: 'Africa/Lagos',
      });
      const timeOnly = String(startTime).replace(/\s*WAT\s*$/i, '').trim();
      const roomSafe = encodeURIComponent(bookingId.replace(/[^a-zA-Z0-9]/g, '').slice(-24));
      const meetLink = `https://meet.jit.si/tutornest-${roomSafe}`;
      const dashboardLink = `${dashboardBase}/dashboard`;

      if (parentEmailAddr) {
        const parentEmailData = emailTemplates.bookingConfirmation(
          parentName,
          studentName,
          tutorName,
          formattedDate,
          timeOnly,
          subjectLine,
          meetLink,
        );
        await sendEmail({
          to: parentEmailAddr,
          ...parentEmailData,
        }).catch((err) => console.error('Error sending parent confirmation email:', err));
      }

      if (tutorEmailAddr) {
        const tutorEmailData = emailTemplates.tutorBookingNotification(
          tutorName,
          parentName,
          studentName,
          formattedDate,
          timeOnly,
          subjectLine,
          `${dashboardBase}/dashboard?tab=bookings`,
        );
        await sendEmail({
          to: tutorEmailAddr,
          ...tutorEmailData,
        }).catch((err) => console.error('Error sending tutor confirmation email:', err));
      }

      if (studentEmailAddr) {
        const whenLabel = `${formattedDate} · ${timeOnly} WAT`;
        const stuTpl = emailTemplates.studentSessionUpdate(
          studentName,
          tutorName,
          subjectLine,
          whenLabel,
          meetLink,
          dashboardLink,
          false,
        );
        await sendEmail({
          to: studentEmailAddr,
          ...stuTpl,
        }).catch((err) => console.error('Error sending student confirmation email:', err));
      }
    } catch (emailError) {
      console.error('Error sending confirmation emails:', emailError);
    }

    return c.json({ success: true, booking });
  } catch (error: any) {
    console.error('Error creating booking:', error);
    return c.json({ error: error.message || 'Internal server error' }, 500);
  }
});

// Get user's bookings
app.get('/make-server-cbd74580/bookings', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const userId = await getUserId(accessToken ?? null);

    if (!userId) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const userProfile = await kv.get(`user:${userId}`) as any;
    const allBookings = await kv.getByPrefix('booking:');

    /** Prefer explicit `?persona=` from the client (current dashboard) over cached KV profile — fixes role-switch edge cases. */
    const persona = (c.req.query('persona') || userProfile?.role || 'parent').toLowerCase();

    const activeStatuses = new Set(['confirmed', 'completed', 'scheduled', 'paid']);

    let bookings = [];
    if (persona === 'parent') {
      bookings = allBookings.filter((b: any) =>
        (b.parentId === userId || b.userId === userId) && b.tutorId && b.tutorId !== userId,
      );
    } else if (persona === 'tutor') {
      bookings = allBookings.filter((b: any) => b.tutorId === userId);
    } else if (persona === 'student') {
      const linkedChildId = userProfile?.linkedChildId as string | undefined;
      bookings = allBookings.filter(
        (b: any) => b.studentId === userId || (!!linkedChildId && b.studentId === linkedChildId),
      );
    } else {
      bookings = allBookings.filter(
        (b: any) => b.parentId === userId || b.tutorId === userId || b.studentId === userId || b.userId === userId,
      );
    }

    bookings = bookings.filter((b: any) => !b.status || activeStatuses.has(String(b.status).toLowerCase()));

    // Sort by date (most recent first)
    bookings.sort((a: any, b: any) => {
      const dateA = new Date(`${a.date}T${a.startTime}`);
      const dateB = new Date(`${b.date}T${b.startTime}`);
      return dateB.getTime() - dateA.getTime();
    });

    return c.json({ bookings });
  } catch (error: any) {
    console.error('Error fetching bookings:', error);
    return c.json({ error: error.message || 'Internal server error' }, 500);
  }
});

// Cancel booking
app.post('/make-server-cbd74580/bookings/:bookingId/cancel', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const userId = await getUserId(accessToken ?? null);

    if (!userId) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const bookingId = c.req.param('bookingId');
    const booking = await kv.get(bookingId) as any;

    if (!booking) {
      return c.json({ error: 'Booking not found' }, 404);
    }

    // Check authorization
    if (booking.parentId !== userId && booking.tutorId !== userId) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    if (booking.status !== 'confirmed') {
      return c.json({ error: 'Booking cannot be cancelled' }, 400);
    }

    // Calculate refund based on cancellation policy
    const bookingDateTime = new Date(`${booking.date}T${booking.startTime}`);
    const now = new Date();
    const hoursUntilBooking = (bookingDateTime.getTime() - now.getTime()) / (1000 * 60 * 60);

    let refundAmount = 0;
    let refundPercentage = 0;

    if (hoursUntilBooking > 24) {
      refundAmount = parseFloat(booking.price);
      refundPercentage = 100;
    } else if (hoursUntilBooking > 0) {
      refundAmount = parseFloat(booking.price) * 0.5;
      refundPercentage = 50;
    }

    const updatedBooking = {
      ...booking,
      status: 'cancelled',
      cancelledAt: new Date().toISOString(),
      cancelledBy: userId,
      refundAmount: refundAmount.toFixed(2),
      refundPercentage,
    };

    await kv.set(bookingId, updatedBooking);

    // Delete Google Calendar events if they exist
    if (booking.googleCalendarEventIds) {
      const deletePromises = [];
      
      if (booking.googleCalendarEventIds.parentEventId) {
        deletePromises.push(
          deleteGoogleCalendarEvent(booking.parentId, booking.googleCalendarEventIds.parentEventId)
        );
      }
      
      if (booking.googleCalendarEventIds.tutorEventId) {
        deletePromises.push(
          deleteGoogleCalendarEvent(booking.tutorId, booking.googleCalendarEventIds.tutorEventId)
        );
      }
      
      if (deletePromises.length > 0) {
        Promise.all(deletePromises)
          .then(() => console.log('Google Calendar events deleted'))
          .catch(err => console.error('Error deleting calendar events:', err));
      }
    }

    // TODO: Process refund via payment gateway
    
    // Send cancellation emails
    try {
      const parentData = await kv.get(`user:${booking.parentId}`) as any;
      const tutorData = await kv.get(`user:${booking.tutorId}`) as any;
      
      const cancelledByName = userId === booking.parentId ? 'Parent' : 'Tutor';
      
      if (parentData?.email) {
        const parentEmailData = emailTemplates.bookingCancellation(
          parentData.full_name || 'Parent',
          tutorData?.full_name || 'Your Tutor',
          booking.date,
          booking.startTime,
          `Cancelled by ${cancelledByName}`
        );
        
        await sendEmail({
          to: parentData.email,
          ...parentEmailData,
        }).catch(err => console.error('Error sending parent cancellation email:', err));
      }
      
      if (tutorData?.email) {
        const tutorEmailData = emailTemplates.bookingCancellation(
          tutorData.full_name || 'Tutor',
          parentData?.full_name || 'A parent',
          booking.date,
          booking.startTime,
          `Cancelled by ${cancelledByName}`
        );
        
        await sendEmail({
          to: tutorData.email,
          ...tutorEmailData,
        }).catch(err => console.error('Error sending tutor cancellation email:', err));
      }
    } catch (emailError) {
      console.error('Error sending cancellation emails:', emailError);
      // Don't fail the request if email fails
    }

    return c.json({ success: true, booking: updatedBooking });
  } catch (error: any) {
    console.error('Error cancelling booking:', error);
    return c.json({ error: error.message || 'Internal server error' }, 500);
  }
});

// ============================================
// PAYMENT ROUTES
// ============================================

// Get user's payment methods
app.get('/make-server-cbd74580/payments/methods', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const userId = await getUserId(accessToken ?? null);

    if (!userId) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const paymentData = await kv.get(`payment_methods:${userId}`) as any;
    
    return c.json({ methods: paymentData?.methods || [] });
  } catch (error: any) {
    console.error('Error fetching payment methods:', error);
    return c.json({ error: error.message || 'Internal server error' }, 500);
  }
});

// Add payment method (tokenized)
app.post('/make-server-cbd74580/payments/methods/add', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const userId = await getUserId(accessToken ?? null);

    if (!userId) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const { cardNumber, cardName, expiryMonth, expiryYear, cvc } = await c.req.json();

    if (cardNumber.length !== 16) {
      return c.json({ error: 'Invalid card number' }, 400);
    }

    const paymentData = await kv.get(`payment_methods:${userId}`) as any || { methods: [] };

    const method = {
      id: `pm_${Date.now()}`,
      type: 'card',
      card: {
        brand: cardNumber.startsWith('4') ? 'visa' : cardNumber.startsWith('5') ? 'mastercard' : 'card',
        last4: cardNumber.slice(-4),
        expiryMonth,
        expiryYear,
      },
      isDefault: paymentData.methods.length === 0,
      createdAt: new Date().toISOString(),
      stripePaymentMethodId: `pm_stripe_${Date.now()}`,
    };

    paymentData.methods.push(method);
    await kv.set(`payment_methods:${userId}`, paymentData);

    return c.json({ success: true, method });
  } catch (error: any) {
    console.error('Error adding payment method:', error);
    return c.json({ error: error.message || 'Internal server error' }, 500);
  }
});

// Remove payment method
app.delete('/make-server-cbd74580/payments/methods/:methodId', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const userId = await getUserId(accessToken ?? null);

    if (!userId) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const methodId = c.req.param('methodId');
    const paymentData = await kv.get(`payment_methods:${userId}`) as any;

    if (!paymentData) {
      return c.json({ error: 'No payment methods found' }, 404);
    }

    paymentData.methods = paymentData.methods.filter((m: any) => m.id !== methodId);
    await kv.set(`payment_methods:${userId}`, paymentData);

    return c.json({ success: true });
  } catch (error: any) {
    console.error('Error removing payment method:', error);
    return c.json({ error: error.message || 'Internal server error' }, 500);
  }
});

// Set default payment method
app.post('/make-server-cbd74580/payments/methods/:methodId/set-default', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const userId = await getUserId(accessToken ?? null);

    if (!userId) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const methodId = c.req.param('methodId');
    const paymentData = await kv.get(`payment_methods:${userId}`) as any;

    if (!paymentData) {
      return c.json({ error: 'No payment methods found' }, 404);
    }

    paymentData.methods = paymentData.methods.map((m: any) => ({
      ...m,
      isDefault: m.id === methodId,
    }));

    await kv.set(`payment_methods:${userId}`, paymentData);

    return c.json({ success: true });
  } catch (error: any) {
    console.error('Error setting default payment method:', error);
    return c.json({ error: error.message || 'Internal server error' }, 500);
  }
});

// ============================================
// PAYOUT ROUTES
// ============================================

// Get tutor payout dashboard data
app.get('/make-server-cbd74580/payouts/dashboard', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const userId = await getUserId(accessToken ?? null);

    if (!userId) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const allBookings = await kv.getByPrefix('booking:');
    const tutorBookings = allBookings.filter((b: any) => 
      b.tutorId === userId && b.status === 'completed'
    );

    // Helper function to get payout rate based on subject
    const getSubjectRate = (subject: string): number => {
      // Subject-based pricing tiers (in NGN per session)
      const subjectRates: Record<string, number> = {
        // High-demand STEM subjects
        'Mathematics': 20000,
        'Physics': 20000,
        'Chemistry': 20000,
        'Biology': 18000,
        'Computer Science': 22000,
        'Information Technology': 20000,
        
        // Languages (higher for specialized ones)
        'English': 16000,
        'Mandarin Chinese': 25000,
        'Arabic': 22000,
        'Spanish': 18000,
        'French': 18000,
        'German': 18000,
        'Italian': 16000,
        'Latin': 20000,
        
        // Advanced/Test Prep
        'A-Level Preparation': 22000,
        'GCSE Preparation': 18000,
        '11+ Entrance Exams': 20000,
        'SAT Preparation': 25000,
        'ACT Preparation': 25000,
        'IELTS': 20000,
        'TOEFL': 20000,
        
        // Special Needs (premium rates)
        'Special Educational Needs (SEN)': 25000,
        'Dyslexia Support': 25000,
        'ADHD Support': 25000,
        'Autism Spectrum': 28000,
        
        // Other subjects
        'Science': 16000,
        'History': 15000,
        'Geography': 15000,
        'Economics': 18000,
        'Business Studies': 16000,
        'Accounting': 18000,
        'Psychology': 16000,
        'Sociology': 15000,
        'Philosophy': 16000,
        'Politics': 16000,
        'Religious Studies': 14000,
        'Art & Design': 15000,
        'Music': 16000,
        'Drama': 14000,
        'Law': 22000,
      };
      
      // Default rate for subjects not specifically listed
      return subjectRates[subject] || 16000;
    };

    const earnings = tutorBookings.map((booking: any) => {
      // Use the actual booking price if available, otherwise fall back to subject rate
      const grossAmount = booking.price ? parseFloat(booking.price) : getSubjectRate(booking.subject || '');

      // Tutor receives 80%, Knowledge Fons Academy takes 20%
      const platformFee = (grossAmount * 0.20).toFixed(2);
      const netAmount = (grossAmount * 0.80).toFixed(2);

      return {
        id: `earn_${booking.id}`,
        bookingId: booking.id,
        date: booking.date,
        studentName: booking.studentName,
        subject: booking.subject || 'Not specified',
        lessonDuration: booking.duration || '1 hour',
        grossAmount: grossAmount.toFixed(2),
        platformFee,
        netAmount,
        status: booking.payoutStatus === 'paid' ? 'paid' : 'pending',
        payoutDate: booking.paidOutAt || null,
      };
    });

    const settings = await kv.get(`payout_settings:${userId}`) as any || {
      schedule: 'weekly',
      minimumAmount: '50',
    };

    const totalEarnings = earnings.reduce((sum, e) => sum + parseFloat(e.netAmount), 0).toFixed(2);

    // Pending payout = net earnings from sessions not yet paid out
    const pendingPayout = earnings
      .filter((e) => e.status !== 'paid')
      .reduce((sum, e) => sum + parseFloat(e.netAmount), 0)
      .toFixed(2);

    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    const paidThisMonth = earnings
      .filter((e) => {
        const d = new Date(e.date);
        return e.status === 'paid' && d.getMonth() === currentMonth && d.getFullYear() === currentYear;
      })
      .reduce((sum, e) => sum + parseFloat(e.netAmount), 0)
      .toFixed(2);

    const nextPayoutDate = new Date();
    nextPayoutDate.setDate(nextPayoutDate.getDate() + 7);

    const stats = {
      totalEarnings,
      pendingPayout,
      paidThisMonth,
      nextPayoutDate: nextPayoutDate.toISOString(),
    };

    // Fetch real payout history from KV store
    const rawPayouts = await kv.get(`tutor_payouts:${userId}`) as any[] || [];
    const payouts = rawPayouts.map((p: any) => ({
      id: p.id,
      period: p.paidAt ? new Date(p.paidAt).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' }) : 'Unknown',
      amount: p.amount?.toFixed(2) || '0.00',
      status: 'paid',
      scheduledDate: p.paidAt || new Date().toISOString(),
      paidDate: p.paidAt || null,
      earningsCount: p.bookingsCount || 0,
    }));

    return c.json({ earnings, payouts, stats, settings });
  } catch (error: any) {
    console.error('Error fetching payout dashboard:', error);
    return c.json({ error: error.message || 'Internal server error' }, 500);
  }
});

// ============================================
// REFUND & CHARGEBACK ROUTES
// ============================================

// Get refund requests (admin)
app.get('/make-server-cbd74580/admin/refunds', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const userId = await getUserId(accessToken ?? null);

    if (!userId) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const userProfile = await kv.get(`user:${userId}`) as any;
    if (userProfile.role !== 'admin') {
      return c.json({ error: 'Unauthorized - Admin access required' }, 403);
    }

    const refundRequests = await kv.getByPrefix('refund_request:');
    const chargebacks = await kv.getByPrefix('chargeback:');

    return c.json({ refundRequests, chargebacks });
  } catch (error: any) {
    console.error('Error fetching refunds:', error);
    return c.json({ error: error.message || 'Internal server error' }, 500);
  }
});

// Process refund request (admin)
app.post('/make-server-cbd74580/admin/refunds/:requestId/process', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const userId = await getUserId(accessToken ?? null);

    if (!userId) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const userProfile = await kv.get(`user:${userId}`) as any;
    if (userProfile.role !== 'admin') {
      return c.json({ error: 'Unauthorized - Admin access required' }, 403);
    }

    const requestId = c.req.param('requestId');
    const { decision, notes } = await c.req.json();

    const refundRequest = await kv.get(requestId) as any;
    if (!refundRequest) {
      return c.json({ error: 'Refund request not found' }, 404);
    }

    if (decision === 'approve') {
      await kv.set(requestId, {
        ...refundRequest,
        status: 'processed',
        decision: 'approved',
        processedAt: new Date().toISOString(),
        processedBy: userId,
        notes,
      });
    } else {
      await kv.set(requestId, {
        ...refundRequest,
        status: 'rejected',
        processedAt: new Date().toISOString(),
        processedBy: userId,
        notes,
      });
    }

    return c.json({ success: true });
  } catch (error: any) {
    console.error('Error processing refund:', error);
    return c.json({ error: error.message || 'Internal server error' }, 500);
  }
});

// Export chargeback evidence (admin)
app.get('/make-server-cbd74580/admin/chargebacks/:chargebackId/evidence', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const userId = await getUserId(accessToken ?? null);

    if (!userId) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const chargebackId = c.req.param('chargebackId');
    const chargeback = await kv.get(chargebackId) as any;

    if (!chargeback) {
      return c.json({ error: 'Chargeback not found' }, 404);
    }

    const evidence = {
      chargebackId,
      bookingDetails: 'Booking information...',
      communication: 'Communication logs...',
      serviceFulfillment: 'Service delivery proof...',
    };

    return c.json(evidence);
  } catch (error: any) {
    console.error('Error exporting evidence:', error);
    return c.json({ error: error.message || 'Internal server error' }, 500);
  }
});

// ============================================
// VIRTUAL CLASSROOM ROUTES
// ============================================

// Helper function to generate Google Meet code
function generateMeetCode(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz';
  let code = '';
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 4; j++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    if (i < 2) code += '-';
  }
  return code;
}

// Get session data for a booking
app.get('/make-server-cbd74580/classroom/session/:bookingId', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const userId = await getUserId(accessToken ?? null);

    if (!userId) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const bookingId = c.req.param('bookingId');
    const booking = await kv.get(bookingId) as any;

    if (!booking) {
      return c.json({ error: 'Booking not found' }, 404);
    }

    if (booking.parentId !== userId && booking.tutorId !== userId) {
      return c.json({ error: 'Access denied' }, 403);
    }

    let session = await kv.get(`session:${bookingId}`) as any;

    if (!session) {
      const meetLink = `https://meet.google.com/${generateMeetCode()}`;

      session = {
        id: `session:${bookingId}`,
        bookingId,
        meetLink,
        status: 'scheduled',
        attendees: [],
        createdAt: new Date().toISOString(),
      };

      await kv.set(`session:${bookingId}`, session);
    }

    return c.json({ session });
  } catch (error: any) {
    console.error('Error fetching session:', error);
    return c.json({ error: error.message || 'Internal server error' }, 500);
  }
});

// Join session
app.post('/make-server-cbd74580/classroom/session/:bookingId/join', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const userId = await getUserId(accessToken ?? null);

    if (!userId) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const bookingId = c.req.param('bookingId');
    const { userName, role } = await c.req.json();

    const session = await kv.get(`session:${bookingId}`) as any;

    if (!session) {
      return c.json({ error: 'Session not found' }, 404);
    }

    const existingAttendee = session.attendees.find((a: any) => a.userId === userId && !a.leftAt);

    if (!existingAttendee) {
      session.attendees.push({
        userId,
        userName,
        role,
        joinedAt: new Date().toISOString(),
      });

      if (session.status === 'scheduled') {
        session.status = 'active';
        session.startedAt = new Date().toISOString();
      }

      await kv.set(`session:${bookingId}`, session);
    }

    return c.json({ success: true, meetLink: session.meetLink });
  } catch (error: any) {
    console.error('Error joining session:', error);
    return c.json({ error: error.message || 'Internal server error' }, 500);
  }
});

// Ping session
app.post('/make-server-cbd74580/classroom/session/:bookingId/ping', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const userId = await getUserId(accessToken ?? null);

    if (!userId) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const bookingId = c.req.param('bookingId');
    const session = await kv.get(`session:${bookingId}`) as any;

    if (!session) {
      return c.json({ error: 'Session not found' }, 404);
    }

    const attendee = session.attendees.find((a: any) => a.userId === userId && !a.leftAt);
    if (attendee) {
      attendee.lastPing = new Date().toISOString();
      await kv.set(`session:${bookingId}`, session);
    }

    return c.json({ success: true });
  } catch (error: any) {
    console.error('Error pinging session:', error);
    return c.json({ error: error.message || 'Internal server error' }, 500);
  }
});

// End session
app.post('/make-server-cbd74580/classroom/session/:bookingId/end', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const userId = await getUserId(accessToken ?? null);

    if (!userId) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const bookingId = c.req.param('bookingId');
    const session = await kv.get(`session:${bookingId}`) as any;

    if (!session) {
      return c.json({ error: 'Session not found' }, 404);
    }

    const booking = await kv.get(bookingId) as any;

    if (booking.tutorId !== userId) {
      return c.json({ error: 'Only tutor can end session' }, 403);
    }

    const now = new Date();
    session.attendees = session.attendees.map((a: any) => {
      if (!a.leftAt) {
        const joinTime = new Date(a.joinedAt);
        const duration = Math.floor((now.getTime() - joinTime.getTime()) / 60000);
        return {
          ...a,
          leftAt: now.toISOString(),
          duration,
        };
      }
      return a;
    });

    session.status = 'ended';
    session.endedAt = now.toISOString();

    await kv.set(`session:${bookingId}`, session);

    return c.json({ success: true });
  } catch (error: any) {
    console.error('Error ending session:', error);
    return c.json({ error: error.message || 'Internal server error' }, 500);
  }
});

// Report session
app.post('/make-server-cbd74580/classroom/session/:bookingId/report', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const userId = await getUserId(accessToken ?? null);

    if (!userId) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const bookingId = c.req.param('bookingId');
    const { reason, reportedBy } = await c.req.json();

    const session = await kv.get(`session:${bookingId}`) as any;
    const booking = await kv.get(bookingId) as any;

    if (!session || !booking) {
      return c.json({ error: 'Session not found' }, 404);
    }

    const report = {
      id: `report:${Date.now()}`,
      bookingId,
      reportedBy,
      reportedAt: new Date().toISOString(),
      reason,
      status: 'pending',
      sessionData: {
        tutorName: booking.tutorName,
        studentName: booking.studentName,
        startTime: booking.date,
        endTime: booking.endTime,
        attendees: session.attendees,
      },
    };

    await kv.set(report.id, report);

    session.flagged = true;
    session.flaggedAt = new Date().toISOString();
    await kv.set(`session:${bookingId}`, session);

    return c.json({ success: true });
  } catch (error: any) {
    console.error('Error reporting session:', error);
    return c.json({ error: error.message || 'Internal server error' }, 500);
  }
});

// Admin: Monitor sessions
app.get('/make-server-cbd74580/admin/sessions/monitor', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const userId = await getUserId(accessToken ?? null);

    if (!userId) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const userProfile = await kv.get(`user:${userId}`) as any;
    if (userProfile.role !== 'admin') {
      return c.json({ error: 'Unauthorized - Admin access required' }, 403);
    }

    const reports = await kv.getByPrefix('report:');
    const sessions = await kv.getByPrefix('session:');

    const activeSessions = sessions.filter((s: any) => s.status === 'active').length;
    const today = new Date().toISOString().split('T')[0];
    const completedToday = sessions.filter((s: any) => 
      s.status === 'ended' && s.endedAt?.startsWith(today)
    ).length;

    const totalDuration = sessions
      .filter((s: any) => s.status === 'ended')
      .reduce((sum: number, s: any) => {
        const duration = s.attendees.reduce((d: number, a: any) => d + (a.duration || 0), 0);
        return sum + duration;
      }, 0);

    const averageDuration = sessions.length > 0 
      ? Math.round(totalDuration / sessions.length) 
      : 0;

    const stats = {
      totalSessions: sessions.length,
      activeSessions,
      completedToday,
      averageDuration,
      reportedSessions: reports.length,
    };

    return c.json({ reports, stats });
  } catch (error: any) {
    console.error('Error fetching monitoring data:', error);
    return c.json({ error: error.message || 'Internal server error' }, 500);
  }
});

// Admin: Resolve report
app.post('/make-server-cbd74580/admin/sessions/reports/:reportId/resolve', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const userId = await getUserId(accessToken ?? null);

    if (!userId) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const userProfile = await kv.get(`user:${userId}`) as any;
    if (userProfile.role !== 'admin') {
      return c.json({ error: 'Unauthorized - Admin access required' }, 403);
    }

    const reportId = c.req.param('reportId');
    const { status, resolution } = await c.req.json();

    const report = await kv.get(reportId) as any;

    if (!report) {
      return c.json({ error: 'Report not found' }, 404);
    }

    await kv.set(reportId, {
      ...report,
      status,
      resolution,
      resolvedAt: new Date().toISOString(),
      resolvedBy: userId,
    });

    return c.json({ success: true });
  } catch (error: any) {
    console.error('Error resolving report:', error);
    return c.json({ error: error.message || 'Internal server error' }, 500);
  }
});

// Admin: Export session logs
app.get('/make-server-cbd74580/admin/sessions/reports/:reportId/export', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const userId = await getUserId(accessToken ?? null);

    if (!userId) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const reportId = c.req.param('reportId');
    const report = await kv.get(reportId) as any;

    if (!report) {
      return c.json({ error: 'Report not found' }, 404);
    }

    return c.json(report);
  } catch (error: any) {
    console.error('Error exporting logs:', error);
    return c.json({ error: error.message || 'Internal server error' }, 500);
  }
});

// Test email endpoint — sends a verification email to the authenticated user
app.post('/make-server-cbd74580/test-email', async (c: any) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    if (!accessToken) return c.json({ error: 'Unauthorized' }, 401);

    const supabase = getSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
    if (authError || !user) return c.json({ error: 'Unauthorized' }, 401);

    const body = await c.req.json().catch(() => ({}));
    const toEmail = body.email || user.email;
    if (!toEmail) return c.json({ error: 'No email address available' }, 400);

    const result = await sendEmail({
      to: toEmail,
      subject: 'Knowledge Fons Academy — Email Delivery Test',
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px">
          <h2 style="color:#625d9c">Email is working!</h2>
          <p>This is a test email from Knowledge Fons Academy to confirm that email delivery is functioning correctly.</p>
          <p style="color:#888;font-size:12px">Sent at ${new Date().toISOString()}</p>
        </div>
      `,
    });

    if (!result.success) {
      return c.json({ success: false, error: result.error, to: toEmail }, 500);
    }
    return c.json({ success: true, to: toEmail });
  } catch (error: any) {
    return c.json({ error: error.message || 'Failed to send test email' }, 500);
  }
});

// Create test tutors for demo purposes (no auth required for development)
app.post('/make-server-cbd74580/test/create-tutors', async (c) => {
  try {
    console.log('Starting test tutor creation...');
    const supabase = getSupabaseClient();
    const testTutors = [
      {
        email: 'sarah.mathematics@tutornest.org',
        password: 'test1234',
        firstName: 'Sarah',
        lastName: 'Thompson',
        bio: 'Experienced mathematics tutor with 8+ years teaching GCSE and A-Level students. Specializing in exam preparation and building confidence in mathematical problem-solving.',
        subjects: ['Mathematics', 'Statistics'],
        yearGroups: ['GCSE (Year 10-11)', 'A-Level (Year 12-13)'],
        hourlyRate: '45',
        availability: 'weekdays-evenings',
        dbsStatus: 'verified',
        rating: '4.9',
        responseRate: '98',
        totalLessons: 245
      },
      {
        email: 'james.physics@tutornest.org',
        password: 'test1234',
        firstName: 'James',
        lastName: 'Chen',
        bio: 'Physics PhD with a passion for making complex concepts accessible. Former university lecturer now focusing on A-Level and university admissions preparation.',
        subjects: ['Physics', 'Mathematics', 'Chemistry'],
        yearGroups: ['GCSE (Year 10-11)', 'A-Level (Year 12-13)', 'University Level'],
        hourlyRate: '55',
        availability: 'flexible',
        dbsStatus: 'verified',
        rating: '5.0',
        responseRate: '100',
        totalLessons: 189
      },
      {
        email: 'emily.english@tutornest.org',
        password: 'test1234',
        firstName: 'Emily',
        lastName: 'Parker',
        bio: 'English Literature graduate with a love for creative writing and literary analysis. Helping students achieve top grades in GCSE and A-Level English.',
        subjects: ['English Language', 'English Literature'],
        yearGroups: ['KS3 (Year 7-9)', 'GCSE (Year 10-11)', 'A-Level (Year 12-13)'],
        hourlyRate: '40',
        availability: 'weekdays-daytime',
        dbsStatus: 'verified',
        rating: '4.8',
        responseRate: '95',
        totalLessons: 312
      },
      {
        email: 'david.science@tutornest.org',
        password: 'test1234',
        firstName: 'David',
        lastName: 'Williams',
        bio: 'Primary and KS3 science specialist. Making science fun and engaging for younger learners through hands-on experiments and real-world examples.',
        subjects: ['Science', 'Biology', 'Chemistry'],
        yearGroups: ['Primary (Year 1-6)', 'KS3 (Year 7-9)'],
        hourlyRate: '35',
        availability: 'weekends',
        dbsStatus: 'verified',
        rating: '4.7',
        responseRate: '92',
        totalLessons: 156
      },
      {
        email: 'maria.languages@tutornest.org',
        password: 'test1234',
        firstName: 'Maria',
        lastName: 'Rodriguez',
        bio: 'Native Spanish speaker and certified language teacher. Specializing in conversational fluency and exam preparation for GCSE and A-Level Spanish.',
        subjects: ['Spanish', 'French'],
        yearGroups: ['KS3 (Year 7-9)', 'GCSE (Year 10-11)', 'A-Level (Year 12-13)'],
        hourlyRate: '42',
        availability: 'flexible',
        dbsStatus: 'verified',
        rating: '4.9',
        responseRate: '97',
        totalLessons: 203
      }
    ];

    const createdTutors = [];
    const errors = [];

    for (const tutorData of testTutors) {
      try {
        console.log(`Processing tutor: ${tutorData.email}`);
        console.log(`Creating auth user for ${tutorData.email}...`);
        
        // Create user in Supabase Auth
        const { data: authData, error: authError } = await supabase.auth.admin.createUser({
          email: tutorData.email,
          password: tutorData.password,
          email_confirm: false,
          user_metadata: {
            firstName: tutorData.firstName,
            lastName: tutorData.lastName,
            role: 'tutor'
          }
        });

        if (authError) {
          // If user already exists, that's okay - skip this tutor
          if (authError.message?.includes('already') || authError.message?.includes('exists')) {
            console.log(`Tutor ${tutorData.email} already exists, skipping...`);
            continue;
          }
          console.error(`Error creating auth user for ${tutorData.email}:`, authError);
          errors.push({ email: tutorData.email, error: authError.message });
          continue;
        }

        if (!authData?.user?.id) {
          console.error(`No user ID returned for ${tutorData.email}`);
          errors.push({ email: tutorData.email, error: 'No user ID returned' });
          continue;
        }

        const userId = authData.user.id;
        console.log(`Created auth user with ID: ${userId}`);

      // Create tutor profile in KV store
      const tutorProfile = {
        userId,
        email: tutorData.email,
        role: 'tutor',
        firstName: tutorData.firstName,
        lastName: tutorData.lastName,
        bio: tutorData.bio,
        subjects: tutorData.subjects,
        yearGroups: tutorData.yearGroups,
        hourlyRate: tutorData.hourlyRate,
        availability: tutorData.availability,
        dbsStatus: tutorData.dbsStatus,
        rating: tutorData.rating,
        responseRate: tutorData.responseRate,
        totalLessons: tutorData.totalLessons,
        verificationStatus: 'verified',
        profileCompleted: true,
        createdAt: new Date().toISOString()
      };

      console.log(`Saving profile to KV store for ${tutorData.email}...`);
      await kv.set(`user:${userId}`, tutorProfile);
      
      createdTutors.push({
        email: tutorData.email,
        name: `${tutorData.firstName} ${tutorData.lastName}`
      });

      console.log(`Successfully created test tutor: ${tutorData.firstName} ${tutorData.lastName}`);
      } catch (tutorError: any) {
        console.error(`Error processing tutor ${tutorData.email}:`, tutorError);
        errors.push({ email: tutorData.email, error: tutorError.message });
      }
    }

    console.log(`Test tutor creation complete. Created: ${createdTutors.length}, Errors: ${errors.length}`);

    return c.json({ 
      success: true, 
      message: `Created ${createdTutors.length} test tutor(s)${errors.length > 0 ? ` (${errors.length} failed)` : ''}`,
      tutors: createdTutors,
      errors: errors.length > 0 ? errors : undefined
    });
  } catch (error: any) {
    console.error('Error creating test tutors (outer catch):', error);
    return c.json({ error: error.message || 'Internal server error', details: error.toString() }, 500);
  }
});

// Debug endpoint to check if user exists
app.get('/make-server-cbd74580/debug/check-user/:email', async (c) => {
  try {
    const email = c.req.param('email');
    console.log('Checking if user exists with email:', email);

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const adminSupabase = createClient(supabaseUrl, serviceRoleKey);

    // List all users and find by email
    const { data: { users }, error } = await adminSupabase.auth.admin.listUsers();

    if (error) {
      console.error('Error listing users:', error);
      return c.json({ error: error.message }, 500);
    }

    const user = users?.find(u => u.email?.toLowerCase() === email.toLowerCase());

    if (user) {
      console.log('User found:', {
        id: user.id,
        email: user.email,
        emailConfirmedAt: user.email_confirmed_at,
        lastSignInAt: user.last_sign_in_at,
        createdAt: user.created_at
      });
      
      return c.json({
        exists: true,
        user: {
          id: user.id,
          email: user.email,
          emailConfirmed: !!user.email_confirmed_at,
          lastSignIn: user.last_sign_in_at,
          createdAt: user.created_at,
          metadata: user.user_metadata
        }
      });
    } else {
      console.log('User not found with email:', email);
      return c.json({ exists: false, email });
    }
  } catch (error: any) {
    console.error('Error in debug endpoint:', error);
    return c.json({ error: error.message }, 500);
  }
});

Deno.serve(app.fetch);