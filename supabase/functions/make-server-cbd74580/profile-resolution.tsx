import * as kv from './kv_store.tsx';
import * as db from './db.tsx';

/**
 * Resolves display profiles for a set of ids in one batch, trying DB
 * profile -> KV user -> KV child in order. A booking's participants can be
 * Postgres accounts, KV-only accounts, or a KV-only child profile, so no
 * single source covers everyone — this same three-step fallback had been
 * copy-pasted (and could easily drift) across GET /bookings,
 * GET /admin/session-reports, and GET /my-session-reports before this file
 * existed.
 */
export async function resolveProfiles(ids: (string | undefined | null)[]): Promise<Record<string, any>> {
  const uniqueIds = [...new Set(ids.filter((id): id is string => !!id))];
  const profileMap: Record<string, any> = {};
  await Promise.all(
    uniqueIds.map(async (id) => {
      const dbProfile = await db.getProfile(id).catch(() => null);
      if (dbProfile) { profileMap[id] = dbProfile; return; }
      const kvUser = await kv.get(`user:${id}`).catch(() => null);
      if (kvUser) { profileMap[id] = kvUser; return; }
      const kvChild = await kv.get(`child:${id}`).catch(() => null);
      if (kvChild) profileMap[id] = kvChild;
    }),
  );
  return profileMap;
}

/** Reads a display name off an already-resolved profile map (see resolveProfiles), falling back if nothing was found. */
export function resolveName(profileMap: Record<string, any>, id: string | undefined | null, fallback: string): string {
  const p = id ? profileMap[id] : null;
  return (
    p?.fullName || p?.full_name || p?.name ||
    (p?.firstName ? `${p.firstName} ${p.lastName ?? ''}`.trim() : null) ||
    fallback
  );
}
