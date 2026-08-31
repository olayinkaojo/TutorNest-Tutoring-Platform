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
  if (!photo) return c.json({ error: 'No photo provided' }, 400);

  const ext = photo.name.split('.').pop()?.toLowerCase() || 'jpg';
  const isImageExt = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'heic', 'heif'].includes(ext);
  const isImageMime = photo.type && (photo.type.startsWith('image/') || photo.type.includes('heic') || photo.type.includes('heif'));
  if (!isImageExt && !isImageMime) return c.json({ error: 'File must be an image' }, 400);

  // Every profile-photo prompt in the app advertises "up to 5MB" — enforce that
  // here with a clear error instead of letting an oversized upload fail opaquely
  // against the storage bucket's own limit below.
  const MAX_AVATAR_SIZE = 5 * 1024 * 1024;
  if (photo.size > MAX_AVATAR_SIZE) {
    return c.json({ error: 'Photo must be under 5MB' }, 400);
  }

  const supabase = getSupabaseClient();
  const bucketName = 'tutornest-avatars';

  // fileSizeLimit is set (or corrected) on every request, not just bucket creation —
  // an earlier version created this bucket with a 2MB limit while every client screen
  // advertised 5MB, so photos between 2-5MB were silently rejected by storage with no
  // error surfaced to the user. Give a little headroom above the app's own 5MB check.
  const bucketOpts = { public: true, fileSizeLimit: 6 * 1024 * 1024 };
  const { data: buckets } = await supabase.storage.listBuckets();
  if (!buckets?.some((b) => b.name === bucketName)) {
    await supabase.storage.createBucket(bucketName, bucketOpts);
  } else {
    await supabase.storage.updateBucket(bucketName, bucketOpts).catch((err) => {
      console.error('avatar: failed to normalize bucket limits:', err);
    });
  }

  const filePath = `${userId}/${Date.now()}.${ext}`;
  const buffer = await photo.arrayBuffer();

  const { error: uploadError } = await supabase.storage
    .from(bucketName)
    .upload(filePath, buffer, { contentType: photo.type, upsert: true });

  if (uploadError) {
    console.error('avatar: storage upload failed:', uploadError);
    return c.json({ error: uploadError.message || 'Failed to upload photo' }, 500);
  }

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
