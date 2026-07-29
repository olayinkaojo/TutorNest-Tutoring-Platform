/**
 * The /admin/* guard is the whole fix, so what matters is that its path pattern
 * covers every admin route and nothing else. Lives outside the function
 * directory so it is not uploaded by `supabase functions deploy`.
 *
 * Run: deno test --no-lock --node-modules-dir=none supabase/functions/tests/
 */
import { Hono } from 'npm:hono@4';
import { assertEquals } from 'jsr:@std/assert@1';

const ROUTE_PREFIX = '/make-server-cbd74580';

/** Mirrors the guard registered in index.ts, with the role lookup stubbed. */
function buildApp(role: string | null) {
  const app = new Hono();

  app.use(`${ROUTE_PREFIX}/admin/*`, async (c, next) => {
    if (role === null) return c.json({ error: 'Unauthorized' }, 401);
    if (role !== 'admin') return c.json({ error: 'Admin access required' }, 403);
    await next();
  });

  const ok = (c: any) => c.json({ reached: true });
  app.get(`${ROUTE_PREFIX}/admin/users`, ok);
  app.post(`${ROUTE_PREFIX}/admin/fix-user-role`, ok);
  app.post(`${ROUTE_PREFIX}/admin/users/:userId/impersonate`, ok);
  app.get(`${ROUTE_PREFIX}/admin/moderation/keywords`, ok);
  app.get(`${ROUTE_PREFIX}/documents`, ok);
  app.get(`${ROUTE_PREFIX}/bookings`, ok);

  return app;
}

const ADMIN_PATHS: [string, string][] = [
  ['GET', `${ROUTE_PREFIX}/admin/users`],
  ['POST', `${ROUTE_PREFIX}/admin/fix-user-role`],
  ['POST', `${ROUTE_PREFIX}/admin/users/abc-123/impersonate`],
  ['GET', `${ROUTE_PREFIX}/admin/moderation/keywords`],
];

Deno.test('unauthenticated callers are rejected from every admin route', async () => {
  const app = buildApp(null);
  for (const [method, path] of ADMIN_PATHS) {
    const res = await app.request(path, { method });
    assertEquals(res.status, 401, `${method} ${path}`);
  }
});

Deno.test('authenticated non-admins are rejected from every admin route', async () => {
  const app = buildApp('parent');
  for (const [method, path] of ADMIN_PATHS) {
    const res = await app.request(path, { method });
    assertEquals(res.status, 403, `${method} ${path}`);
  }
});

Deno.test('admins still reach admin routes', async () => {
  const app = buildApp('admin');
  for (const [method, path] of ADMIN_PATHS) {
    const res = await app.request(path, { method });
    assertEquals(res.status, 200, `${method} ${path}`);
    assertEquals((await res.json()).reached, true);
  }
});

Deno.test('non-admin routes are untouched by the guard', async () => {
  // A parent must still reach ordinary routes — the guard must not over-match.
  const app = buildApp('parent');
  for (const path of [`${ROUTE_PREFIX}/documents`, `${ROUTE_PREFIX}/bookings`]) {
    const res = await app.request(path);
    assertEquals(res.status, 200, path);
  }
});
