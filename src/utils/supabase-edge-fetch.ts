import { projectId, publicAnonKey } from './supabase/info';

const RETRYABLE_STATUS = new Set([429, 502, 503, 504]);

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Base URL with no trailing slash: `https://<ref>.supabase.co/functions/v1/make-server-cbd74580` */
export function edgeFunctionBaseUrl(): string {
  return `https://${projectId}.supabase.co/functions/v1/make-server-cbd74580`;
}

/** Full URL for a path under the bundled Edge Function (suffix may omit leading `/`). */
export function edgeFunctionUrl(suffix: string): string {
  const s = suffix.startsWith('/') ? suffix : `/${suffix}`;
  return `${edgeFunctionBaseUrl()}${s}`;
}

export type EdgeFetchOptions = {
  /** Extra fetch attempts after the first (default 2 → up to 3 total tries). */
  retries?: number;
};

/** `fetch` to the Edge function with standard Supabase headers (including `apikey` when configured). Retries on 429/502/503/504 and on network errors with exponential backoff. */
export async function edgeFetch(
  path: string,
  accessToken: string,
  init?: RequestInit,
  options?: EdgeFetchOptions,
): Promise<Response> {
  const retries = options?.retries ?? 2;
  const normalized = path.startsWith('/') ? path : `/${path}`;
  const url = `${edgeFunctionBaseUrl()}${normalized}`;
  const baseHeaders = {
    ...edgeFunctionHeaders(accessToken),
    ...(init?.headers as Record<string, string> | undefined),
  };

  let last: Response | undefined;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      last = await fetch(url, {
        ...init,
        headers: baseHeaders,
      });
    } catch (err) {
      if (attempt >= retries) throw err;
      await sleep(200 * 2 ** attempt);
      continue;
    }
    if (!RETRYABLE_STATUS.has(last.status) || attempt >= retries) return last;
    await sleep(200 * 2 ** attempt);
  }
  return last!;
}

/**
 * Headers Supabase expects when invoking Edge Functions from the browser.
 * Without `apikey`, some gateways or CORS paths return odd responses; the JS client always sends both.
 */
export function edgeFunctionHeaders(accessToken: string): Record<string, string> {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${accessToken}`,
  };
  if (publicAnonKey?.trim()) {
    headers.apikey = publicAnonKey;
  }
  return headers;
}
