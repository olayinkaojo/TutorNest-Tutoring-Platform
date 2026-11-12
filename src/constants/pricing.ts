// Platform-wide flat rate — every tutor charges the same amount per
// session, no per-tutor negotiation. Single source of truth for the
// frontend; the backend's own source of truth is PAYMENT_PLANS in
// supabase/functions/make-server-cbd74580/payment-routes.tsx (a Deno file,
// can't import this), which already prices every plan at exactly this rate
// per session (₦195,000 / 13 sessions = ₦390,000 / 26 sessions = ₦15,000).
export const PLATFORM_HOURLY_RATE_NGN = 15000;
