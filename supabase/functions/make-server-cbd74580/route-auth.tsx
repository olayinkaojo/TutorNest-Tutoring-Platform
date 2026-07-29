/**
 * Shared authentication/authorization helpers for the standalone route modules
 * (coupons-credits, subscriptions, tax-invoicing, sanctions, moderation,
 * curriculum, role-management, disputes, …). Those modules are mounted with
 * `app.route(prefix, module)` and never received `getUserId`, so many of them
 * shipped with no auth at all — trusting a client-supplied userId/parentId.
 *
 * Identity is verified against Supabase (real signature/expiry check via
 * auth.getUser), never by decoding the JWT payload unverified.
 *
 * Usage in a handler:
 *   const userId = await verifyUser(c);
 *   if (!userId) return c.json({ error: 'Unauthorized' }, 401);
 *   if (!(await isAdmin(userId))) return c.json({ error: 'Admin access required' }, 403);
 */
import { createClient } from 'jsr:@supabase/supabase-js@2';
import * as kv from './kv_store.tsx';

let cachedClient: ReturnType<typeof createClient> | null = null;
function authClient() {
  if (!cachedClient) {
    cachedClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      // Service role is only used here to call auth.getUser(token); the token
      // itself is what is validated, so the caller's own rights still bound them.
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    );
  }
  return cachedClient;
}

/** Verified auth user id, or null if the bearer token is missing/invalid/expired. */
export async function verifyUser(c: any): Promise<string | null> {
  const accessToken = c.req.header('Authorization')?.split(' ')[1];
  if (!accessToken) return null;
  try {
    const { data: { user }, error } = await authClient().auth.getUser(accessToken);
    if (error || !user) return null;
    return user.id;
  } catch (err) {
    console.error('verifyUser: token verification failed:', err);
    return null;
  }
}

/** True when the profile for `userId` has the admin role. */
export async function isAdmin(userId: string): Promise<boolean> {
  try {
    const profile = (await kv.get(`user:${userId}`)) as { role?: string } | null;
    return String(profile?.role || '').toLowerCase() === 'admin';
  } catch (err) {
    console.error('isAdmin: lookup failed:', err);
    return false;
  }
}

/**
 * Resolve the caller and require the admin role in one step.
 * Returns the userId on success, or a ready-to-return JSON Response on failure.
 * Callers do: `const r = await requireAdmin(c); if (r instanceof Response) return r;`
 */
export async function requireAdmin(c: any): Promise<string | Response> {
  const userId = await verifyUser(c);
  if (!userId) return c.json({ error: 'Unauthorized' }, 401);
  if (!(await isAdmin(userId))) return c.json({ error: 'Admin access required' }, 403);
  return userId;
}

/**
 * Require that the caller is `targetId` (owns the resource) or an admin.
 * Returns the caller's userId, or a JSON Response on failure.
 */
export async function requireSelfOrAdmin(c: any, targetId: string): Promise<string | Response> {
  const userId = await verifyUser(c);
  if (!userId) return c.json({ error: 'Unauthorized' }, 401);
  if (userId === targetId) return userId;
  if (await isAdmin(userId)) return userId;
  return c.json({ error: 'Forbidden' }, 403);
}
