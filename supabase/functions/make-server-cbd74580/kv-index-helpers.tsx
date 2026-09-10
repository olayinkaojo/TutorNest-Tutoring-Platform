import * as kv from './kv_store.tsx';

/**
 * Generic secondary-index helpers for kv_store.tsx, which only supports
 * get/set/getByPrefix (a real full-table-prefix scan, not an indexed
 * lookup) — no way to ask "give me just this user's records" without
 * scanning every record of that type on the whole platform. Several hot,
 * frequently-polled routes did exactly that (notifications, bookings,
 * conversations) before this file existed. The fix everywhere is the same
 * shape: maintain `<kind>-index:<ownerId>` as an array of record IDs,
 * updated at every write site, so reads become a targeted kv.mget()
 * instead of a platform-wide scan-and-filter.
 */

/** Appends `itemId` to the array stored at `indexKey` (creating it if absent). Idempotent — won't add a duplicate. */
export async function appendToIndex(indexKey: string, itemId: string): Promise<void> {
  const ids = ((await kv.get(indexKey)) as string[] | null) ?? [];
  if (!ids.includes(itemId)) {
    ids.push(itemId);
    await kv.set(indexKey, ids);
  }
}

/** Batch-fetches every item referenced by an index key, skipping any whose record no longer exists. */
export async function getIndexedItems(indexKey: string): Promise<any[]> {
  const ids = ((await kv.get(indexKey)) as string[] | null) ?? [];
  if (!ids.length) return [];
  const items = await kv.mget(ids);
  return items.filter(Boolean);
}
