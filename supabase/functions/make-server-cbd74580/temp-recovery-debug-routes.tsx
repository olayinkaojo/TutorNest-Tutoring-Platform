// TEMPORARY — verifies the exact URL shape Supabase generates for a
// password-recovery link (hash vs query, presence of type=recovery) before
// trusting App.tsx's hash-based detection against it. To be reverted
// immediately after one confirmed call.
import { Hono } from 'npm:hono@4';
import { createClient } from 'npm:@supabase/supabase-js@2';
import { requireAdmin } from './route-auth.tsx';

const app = new Hono();

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
);

app.get('/', async (c) => {
  const auth = await requireAdmin(c);
  if (auth instanceof Response) return auth;

  const email = c.req.query('email');
  if (!email) return c.json({ error: 'email query param required' }, 400);

  const { data, error } = await supabase.auth.admin.generateLink({
    type: 'recovery',
    email,
    options: { redirectTo: 'https://app.knowledgefonsacademy.com' },
  });

  if (error) return c.json({ error: error.message }, 500);
  return c.json({ action_link: data?.properties?.action_link ?? null });
});

export default app;
