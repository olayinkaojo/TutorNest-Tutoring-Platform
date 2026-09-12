/**
 * Tutor training resources — platform-demo videos, onboarding material, and
 * anything else admin wants every tutor to have on hand, shown in the tutor
 * dashboard's Resources tab. Deliberately separate from curriculum-routes.tsx
 * (grade-level student curriculum) and the parent/student "learning
 * resources" system in admin-routes.tsx — this content is about tutors
 * doing their job, not students learning a subject.
 *
 * Video is stored as a LINK (YouTube/Vimeo/Google Drive), never as an
 * uploaded file — a training video can run well over an hour, and this
 * platform's only existing upload path proxies the whole file through the
 * Edge Function and (for admin-routes.tsx's resources) base64-encodes it
 * into a single database row, neither of which is workable past a few tens
 * of MB. Small reference files (a PDF one-pager, a slide export) still go
 * through that same small-file base64 pattern, capped well under what would
 * make a KV row unwieldy.
 */
import { Hono } from 'npm:hono@4';
import * as kv from './kv_store.tsx';
import { requireAdmin, verifyUser } from './route-auth.tsx';
import { logAuditEvent } from './activity-log.tsx';

const app = new Hono();

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB — same ceiling as admin-routes.tsx's resources
const ALLOWED_FILE_TYPES = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
const ALLOWED_FILE_EXTS = ['.pdf', '.jpg', '.jpeg', '.png', '.gif', '.webp'];

function isLikelyUrl(value: string): boolean {
  try {
    const u = new URL(value);
    return u.protocol === 'https:' || u.protocol === 'http:';
  } catch {
    return false;
  }
}

/** True if this caller currently is, or has ever been, a tutor — or is an admin. */
async function isTutorOrAdmin(userId: string): Promise<boolean> {
  const [profile, roles] = await Promise.all([
    kv.get(`user:${userId}`) as Promise<any>,
    kv.get(`user_roles:${userId}`) as Promise<string[] | null>,
  ]);
  if (profile?.role === 'admin') return true;
  if (profile?.role === 'tutor') return true;
  return Array.isArray(roles) && roles.includes('tutor');
}

// ── Admin: list everything (management view) ───────────────────────────────
app.get('/all', async (c) => {
  const auth = await requireAdmin(c);
  if (auth instanceof Response) return auth;

  const resources = await kv.getByPrefix('tutor_resource:');
  return c.json({
    resources: resources.sort((a: any, b: any) =>
      new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime()
    ),
  });
});

// ── Admin: add a resource (video link, external link, or small file) ───────
app.post('/upload', async (c) => {
  const auth = await requireAdmin(c);
  if (auth instanceof Response) return auth;
  const userId = auth;

  try {
    const formData = await c.req.formData();
    const kind = (formData.get('kind') as string) || 'video'; // 'video' | 'link' | 'file'
    const title = (formData.get('title') as string || '').trim();
    const description = (formData.get('description') as string) || '';
    const category = (formData.get('category') as string) || 'General';

    if (!title) return c.json({ error: 'Title is required' }, 400);

    const resourceId = `tutor_res_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    const base = {
      id: resourceId,
      kind,
      title,
      description,
      category,
      uploadedBy: userId,
      uploadedAt: new Date().toISOString(),
      viewCount: 0,
    };

    if (kind === 'video' || kind === 'link') {
      const url = (formData.get('url') as string || '').trim();
      if (!url || !isLikelyUrl(url)) {
        return c.json({ error: 'A valid https:// link is required' }, 400);
      }
      await kv.set(`tutor_resource:${resourceId}`, { ...base, url });
    } else if (kind === 'file') {
      const file = formData.get('file') as File;
      if (!file) return c.json({ error: 'A file is required' }, 400);

      const fileExt = '.' + (file.name.split('.').pop()?.toLowerCase() || '');
      if (!ALLOWED_FILE_EXTS.includes(fileExt) && !ALLOWED_FILE_TYPES.includes(file.type)) {
        return c.json({ error: 'Only PDF and image files are supported for direct upload' }, 400);
      }
      if (file.size > MAX_FILE_SIZE) {
        return c.json({ error: 'File size exceeds 10MB limit' }, 400);
      }

      const arrayBuffer = await file.arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer);
      let binary = '';
      const chunkSize = 8192;
      for (let i = 0; i < bytes.length; i += chunkSize) {
        binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunkSize) as unknown as number[]);
      }
      const fileData = btoa(binary);

      await kv.set(`tutor_resource:${resourceId}`, {
        ...base,
        fileName: file.name,
        fileType: file.type,
        fileSize: file.size,
        fileData,
      });
    } else {
      return c.json({ error: 'Unknown resource kind' }, 400);
    }

    await logAuditEvent({
      userId,
      action: 'tutor_resource_uploaded',
      category: 'content',
      description: `Tutor training resource added: "${title}" (${kind}, ${category})`,
      metadata: { resourceId, title, kind, category },
    });

    return c.json({ success: true, resource: { id: resourceId, title } });
  } catch (error: any) {
    console.error('Error uploading tutor resource:', error);
    return c.json({ error: error.message || 'Internal server error' }, 500);
  }
});

// ── Admin: delete a resource ────────────────────────────────────────────────
app.delete('/:resourceId', async (c) => {
  const auth = await requireAdmin(c);
  if (auth instanceof Response) return auth;
  const userId = auth;

  const resourceId = c.req.param('resourceId');
  const existing = await kv.get(`tutor_resource:${resourceId}`) as any;
  await kv.del(`tutor_resource:${resourceId}`);

  await logAuditEvent({
    userId,
    action: 'tutor_resource_deleted',
    category: 'content',
    description: `Tutor training resource deleted${existing ? `: "${existing.title}"` : ` (${resourceId})`}`,
    metadata: { resourceId, title: existing?.title },
  });

  return c.json({ success: true });
});

// ── Tutor-facing: list resources (no file bytes — those come via /download) ─
app.get('/', async (c) => {
  const userId = await verifyUser(c);
  if (!userId) return c.json({ error: 'Unauthorized' }, 401);
  if (!(await isTutorOrAdmin(userId))) return c.json({ error: 'Forbidden' }, 403);

  const resources = await kv.getByPrefix('tutor_resource:');
  const withoutFileBytes = resources.map(({ fileData, ...rest }: any) => ({
    ...rest,
    hasFile: fileData != null,
  }));

  return c.json({
    resources: withoutFileBytes.sort((a: any, b: any) =>
      new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime()
    ),
  });
});

// ── Tutor-facing: download a small uploaded file ────────────────────────────
app.get('/:resourceId/download', async (c) => {
  const userId = await verifyUser(c);
  if (!userId) return c.json({ error: 'Unauthorized' }, 401);
  if (!(await isTutorOrAdmin(userId))) return c.json({ error: 'Forbidden' }, 403);

  const resourceId = c.req.param('resourceId');
  const resource = await kv.get(`tutor_resource:${resourceId}`) as any;
  if (!resource || !resource.fileData) return c.json({ error: 'File not found' }, 404);

  resource.viewCount = (resource.viewCount || 0) + 1;
  await kv.set(`tutor_resource:${resourceId}`, resource);

  const binaryString = atob(resource.fileData);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }

  return new Response(bytes, {
    headers: {
      'Content-Type': resource.fileType || 'application/octet-stream',
      'Content-Disposition': `inline; filename="${resource.fileName || 'file'}"`,
    },
  });
});

export default app;
