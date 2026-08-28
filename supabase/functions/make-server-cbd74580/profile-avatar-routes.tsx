import { Hono } from 'npm:hono@4';
import { createClient } from 'jsr:@supabase/supabase-js@2';
import * as db from './db.tsx';
import * as kv from './kv_store.tsx';

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
  const ext = photo.name.split('.').pop()?.toLowerCase() || 'jpg';
  const isImageExt = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'heic', 'heif'].includes(ext);
  const isImageMime = photo.type && (photo.type.startsWith('image/') || photo.type.includes('heic') || photo.type.includes('heif'));
  if (!isImageExt && !isImageMime) return c.json({ error: 'File must be an image' }, 400);

  const supabase = getSupabaseClient();
  const bucketName = 'tutornest-avatars';

  const { data: buckets } = await supabase.storage.listBuckets();
  if (!buckets?.some((b) => b.name === bucketName)) {
    await supabase.storage.createBucket(bucketName, {
      public: true,
      fileSizeLimit: 2097152,
    });
  }

  const filePath = `${userId}/${Date.now()}.${ext}`;
  const buffer = await photo.arrayBuffer();

  const { error: uploadError } = await supabase.storage
    .from(bucketName)
    .upload(filePath, buffer, { contentType: photo.type, upsert: true });

  if (uploadError) return c.json({ error: uploadError.message }, 500);

  const { data: urlData } = supabase.storage.from(bucketName).getPublicUrl(filePath);
  const photoUrl = urlData.publicUrl;

  // Persist to Postgres (kept for consistency)…
  const existingProfile = await db.getProfile(userId);
  await db.upsertProfile(userId, { ...(existingProfile ?? {}), photoUrl, photo_url: photoUrl });

  // …AND to the KV store, which is what GET /profile actually returns. Without
  // this the photo vanished on the next profile fetch. Written under both
  // field-name conventions the app reads (photoUrl and photo_url), on the main
  // profile and any role-specific profile so a role switch keeps it.
  const patchPhoto = async (key: string) => {
    try {
      const p = (await kv.get(key)) as Record<string, unknown> | null;
      if (p) await kv.set(key, { ...p, photoUrl, photo_url: photoUrl });
    } catch (err) {
      console.error(`avatar: failed to update ${key}:`, err);
    }
  };
  await patchPhoto(`user:${userId}`);
  await Promise.all([
    patchPhoto(`profile_tutor_${userId}`),
    patchPhoto(`profile_parent_${userId}`),
    patchPhoto(`profile_student_${userId}`),
  ]);

  return c.json({ photoUrl });
});

export default profileAvatarRoutes;
