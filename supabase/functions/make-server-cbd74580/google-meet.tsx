/**
 * Google Meet as the BACKUP video provider (Daily.co stays primary — see
 * daily-video-routes.tsx). Meet spaces are created on the platform's own
 * Google Workspace account, never a tutor's personal account, so:
 *   - it works for every tutor, connected calendar or not;
 *   - the platform owns every link (a departing/suspended tutor doesn't keep
 *     a calendar full of families' lesson links);
 *   - there's one place to audit sessions from.
 *
 * Auth: a Google Cloud service account with domain-wide delegation,
 * impersonating one dedicated Workspace user (GOOGLE_MEET_HOST_EMAIL, e.g.
 * sessions@knowledgefonsacademy.com). Scope:
 *   https://www.googleapis.com/auth/meetings.space.created
 *
 * Access type is OPEN: anyone holding the link joins without waiting to be
 * admitted. That's deliberate for a backup — the host account is never in
 * the call to admit anyone, and children often join from a device not
 * signed in to a Google account. The link is never emailed or put on a
 * calendar; it's only handed out by the authenticated join-token endpoint
 * to the booking's own tutor/parent/student.
 *
 * Required secrets (supabase secrets set ...):
 *   GOOGLE_MEET_SERVICE_ACCOUNT_JSON  the service account's JSON key file contents
 *   GOOGLE_MEET_HOST_EMAIL            the Workspace user to create meetings as
 * When either is missing, isGoogleMeetConfigured() is false and callers
 * fall back to Jitsi.
 */

const MEET_SCOPE = 'https://www.googleapis.com/auth/meetings.space.created';
const TOKEN_URL = 'https://oauth2.googleapis.com/token';

interface ServiceAccountKey {
  client_email: string;
  private_key: string;
}

function readServiceAccount(): ServiceAccountKey | null {
  const raw = Deno.env.get('GOOGLE_MEET_SERVICE_ACCOUNT_JSON');
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (!parsed.client_email || !parsed.private_key) return null;
    return { client_email: parsed.client_email, private_key: parsed.private_key };
  } catch {
    console.error('GOOGLE_MEET_SERVICE_ACCOUNT_JSON is not valid JSON');
    return null;
  }
}

export function isGoogleMeetConfigured(): boolean {
  return !!readServiceAccount() && !!Deno.env.get('GOOGLE_MEET_HOST_EMAIL');
}

const b64url = (bytes: Uint8Array | string): string => {
  const bin = typeof bytes === 'string'
    ? bytes
    : String.fromCharCode(...bytes);
  return btoa(bin).replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');
};

async function importPrivateKey(pem: string): Promise<CryptoKey> {
  const body = pem
    .replace(/-----BEGIN PRIVATE KEY-----/, '')
    .replace(/-----END PRIVATE KEY-----/, '')
    .replace(/\\n/g, '')
    .replace(/\s+/g, '');
  const der = Uint8Array.from(atob(body), (ch) => ch.charCodeAt(0));
  return crypto.subtle.importKey(
    'pkcs8',
    der,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign'],
  );
}

// Access tokens last an hour; cache per isolate so a burst of joins doesn't
// mint one each.
let cachedToken: { token: string; expiresAt: number } | null = null;

async function getAccessToken(): Promise<string | null> {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) return cachedToken.token;

  const sa = readServiceAccount();
  const subject = Deno.env.get('GOOGLE_MEET_HOST_EMAIL');
  if (!sa || !subject) return null;

  const now = Math.floor(Date.now() / 1000);
  const header = b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claims = b64url(JSON.stringify({
    iss: sa.client_email,
    sub: subject,
    scope: MEET_SCOPE,
    aud: TOKEN_URL,
    iat: now,
    exp: now + 3600,
  }));
  const key = await importPrivateKey(sa.private_key);
  const sig = new Uint8Array(
    await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, new TextEncoder().encode(`${header}.${claims}`)),
  );
  const assertion = `${header}.${claims}.${b64url(sig)}`;

  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion,
    }),
  });
  if (!res.ok) {
    console.error('Google Meet: service-account token exchange failed:', await res.text());
    return null;
  }
  const data = await res.json() as { access_token: string; expires_in: number };
  cachedToken = { token: data.access_token, expiresAt: Date.now() + data.expires_in * 1000 };
  return data.access_token;
}

/** Creates a Google Meet space and returns its join URL, or null on any failure. */
export async function createGoogleMeetSpace(): Promise<string | null> {
  try {
    const token = await getAccessToken();
    if (!token) return null;
    const res = await fetch('https://meet.googleapis.com/v2/spaces', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ config: { accessType: 'OPEN', entryPointAccess: 'ALL' } }),
    });
    if (!res.ok) {
      console.error('Google Meet: space creation failed:', await res.text());
      return null;
    }
    const data = await res.json() as { meetingUri?: string };
    return data.meetingUri ?? null;
  } catch (e: any) {
    console.error('Google Meet: space creation threw:', e?.message);
    return null;
  }
}

/** Unrecorded, account-free last resort. Slug must be URL-safe. */
export function jitsiFallbackLink(seed: string): string {
  const slug = seed.replace(/[^a-z0-9]/gi, '').slice(0, 20).toLowerCase();
  return `https://meet.jit.si/KnowledgeFonsAcademy-${slug}`;
}
