import { projectId, publicAnonKey } from './supabase/info';

/** Base URL with no trailing slash: `https://<ref>.supabase.co/functions/v1/make-server-cbd74580` */
export function edgeFunctionBaseUrl(): string {
  return `https://${projectId}.supabase.co/functions/v1/make-server-cbd74580`;
}

/** Full URL for a path under the bundled Edge Function (suffix may omit leading `/`). */
export function edgeFunctionUrl(suffix: string): string {
  const s = suffix.startsWith('/') ? suffix : `/${suffix}`;
  return `${edgeFunctionBaseUrl()}${s}`;
}

/** `fetch` to the Edge function with standard Supabase headers (including `apikey` when configured). */
export async function edgeFetch(
  path: string,
  accessToken: string,
  init?: RequestInit
): Promise<Response> {
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return fetch(`${edgeFunctionBaseUrl()}${normalized}`, {
    ...init,
    headers: {
      ...edgeFunctionHeaders(accessToken),
      ...(init?.headers as Record<string, string> | undefined),
    },
  });
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
