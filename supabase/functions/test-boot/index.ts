import { Hono } from 'npm:hono@4';
import { cors } from 'npm:hono@4/cors';
import { createClient } from 'jsr:@supabase/supabase-js@2';
import * as kv from '../make-server-cbd74580/kv_store.tsx';
import { sendEmail, emailTemplates } from '../make-server-cbd74580/email-service.tsx';
import { contentLibraryRoutes } from '../make-server-cbd74580/content-library-routes.tsx';
import { progressAnalyticsRoutes } from '../make-server-cbd74580/progress-analytics-routes.tsx';
import { messagingRoutes } from '../make-server-cbd74580/messaging-routes.tsx';
import { conversationsRoutes } from '../make-server-cbd74580/conversations-routes.tsx';
import { documentsRoutes } from '../make-server-cbd74580/documents-routes.tsx';
import { systemAlertsRoutes } from '../make-server-cbd74580/system-alerts-routes.tsx';
import parentChildrenRoutes from '../make-server-cbd74580/parent-children-routes.tsx';
import { adminRoutes } from '../make-server-cbd74580/admin-routes.tsx';
import reviewsDisputesRoutes from '../make-server-cbd74580/reviews-disputes-routes.tsx';
import bookingRoutes from '../make-server-cbd74580/booking-routes.tsx';
import paymentRoutes from '../make-server-cbd74580/payment-routes.tsx';
import { upsertProfile, getProfile } from '../make-server-cbd74580/db.tsx';
import subscriptionsRoutes from '../make-server-cbd74580/subscriptions-routes.tsx';
import couponsCreditsRoutes from '../make-server-cbd74580/coupons-credits-routes.tsx';
import taxInvoicingRoutes from '../make-server-cbd74580/tax-invoicing-routes.tsx';
import smartMatchingRoutes from '../make-server-cbd74580/smart-matching-routes.tsx';
import reportsNotificationsRoutes from '../make-server-cbd74580/reports-notifications-routes.tsx';
import contentModerationRoutes from '../make-server-cbd74580/content-moderation-routes.tsx';
import sanctionsRoutes from '../make-server-cbd74580/sanctions-routes.tsx';
import policiesRoutes from '../make-server-cbd74580/policies-routes.tsx';
import { studentAuthRoutes } from '../make-server-cbd74580/student-auth-routes.tsx';
import bookshopRoutes from '../make-server-cbd74580/bookshop-routes.tsx';
import roleManagementRoutes from '../make-server-cbd74580/role-management-routes.tsx';
import assessmentsRoutes from '../make-server-cbd74580/assessments-routes.tsx';
import curriculumRoutes from '../make-server-cbd74580/curriculum-routes.tsx';
import triviaRoutes from '../make-server-cbd74580/trivia-routes.tsx';
import tutorSessionReportsRoutes from '../make-server-cbd74580/tutor-session-reports-routes.tsx';
import liveSessionRoutes from '../make-server-cbd74580/live-session-routes.tsx';
import payoutsComplete from '../make-server-cbd74580/payouts-complete.tsx';
import { tutorProfileRoutes } from '../make-server-cbd74580/tutor-profile-routes.tsx';
import invoiceRoutes from '../make-server-cbd74580/invoice-routes.tsx';
import paymentPlansRoutes from '../make-server-cbd74580/payment-plans-routes.tsx';

const getSupabaseClient = () => {
  return createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );
};

const getUserId = async () => null;

const app = new Hono();
app.use('*', cors());

console.log('Starting route registration...');

try {
  console.log('1. contentLibraryRoutes');
  contentLibraryRoutes(app, getUserId);
  
  console.log('2. progressAnalyticsRoutes');
  progressAnalyticsRoutes(app, getUserId);
  
  console.log('3. messagingRoutes');
  messagingRoutes(app, getUserId);
  
  console.log('4. conversationsRoutes');
  conversationsRoutes(app, getUserId);
  
  console.log('5. systemAlertsRoutes');
  systemAlertsRoutes(app, getUserId);
  
  console.log('6. tutorProfileRoutes');
  tutorProfileRoutes(app, getUserId);
  
  console.log('7. documentsRoutes');
  const supabase = getSupabaseClient();
  documentsRoutes(app, getUserId, supabase);
  
  console.log('8. adminRoutes');
  adminRoutes(app, getUserId);
  
  console.log('9. studentAuthRoutes');
  studentAuthRoutes(app, getUserId);
  
  console.log('All routes registered successfully');
} catch (e) {
  console.error('ERROR during route registration:', e);
  console.error('Stack:', (e as any).stack);
}

app.get('/*', (c) => c.json({ ok: true }));
Deno.serve(app.fetch);
