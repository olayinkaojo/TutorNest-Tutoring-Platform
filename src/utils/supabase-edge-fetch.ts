import { projectId, publicAnonKey } from './supabase/info';

/** Base URL for the bundled Edge Function (path after hostname is `/functions/v1/<name>/…`). */
export function edgeFunctionUrl(suffix: string): string {
  const s = suffix.startsWith('/') ? suffix : `/${suffix}`;
  return `https://${projectId}.supabase.co/functions/v1/make-server-cbd74580${s}`;
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
