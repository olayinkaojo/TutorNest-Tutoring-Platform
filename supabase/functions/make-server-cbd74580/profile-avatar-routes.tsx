import { Hono } from 'npm:hono@4';
import { createClient } from 'jsr:@supabase/supabase-js@2';
import * as db from './db.tsx';

const profileAvatarRoutes = new Hono();

const getSupabaseClient = () =>
  createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  );

const getUserId = async (token: string | null): Promise<string | null> => {
  if (!token) return null;
  try {
    const { data: { user }, error } = await getSupabaseClient().auth.getUser(token);
    if (error || !user) return null;
    return user.id;
  } catch {
    return null;
  }
};

profileAvatarRoutes.post('/profile/avatar', async (c) => {
  const token = c.req.header('Authorization')?.replace('Bearer ', '') ?? null;
  const userId = await getUserId(token);
  if (!userId) return c.json({ error: 'Unauthorized' }, 401);

  let formData: FormData;
  try {
    formData = await c.req.formData();
  } catch {
    return c.json({ error: 'Invalid form data' }, 400);
  }

  const photo = formData.get('photo') as File | null;
  if (!photo || !(photo instanceof File)) return c.json({ error: 'Photo file required' }, 400);
  if (photo.size > 2 * 1024 * 1024) return c.json({ error: 'Photo must be under 2MB' }, 400);
  if (!photo.type.startsWith('image/')) return c.json({ error: 'File must be an image' }, 400);

  const supabase = getSupabaseClient();
  const bucketName = 'tutornest-avatars';

  const { data: buckets } = await supabase.storage.listBuckets();
  if (!buckets?.some((b) => b.name === bucketName)) {
    await supabase.storage.createBucket(bucketName, {
      public: true,
      fileSizeLimit: 2097152,
    });
  }

  const ext = photo.name.split('.').pop()?.toLowerCase() || 'jpg';
  const filePath = `${userId}/${Date.now()}.${ext}`;
  const buffer = await photo.arrayBuffer();

  const { error: uploadError } = await supabase.storage
    .from(bucketName)
    .upload(filePath, buffer, { contentType: photo.type, upsert: true });

  if (uploadError) return c.json({ error: uploadError.message }, 500);

  const { data: urlData } = supabase.storage.from(bucketName).getPublicUrl(filePath);
  const photoUrl = urlData.publicUrl;

  const existingProfile = await db.getProfile(userId);
  await db.upsertProfile(userId, { ...(existingProfile ?? {}), photoUrl });

  return c.json({ photoUrl });
});

export default profileAvatarRoutes;
