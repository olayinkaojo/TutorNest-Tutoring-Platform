/**
 * Calendar invites without OAuth.
 *
 * The old approach asked every tutor to grant the platform full read/write
 * access to their entire Google Calendar (auth/calendar + auth/calendar.events)
 * just so ONE event with a Meet link could be created — a "sensitive scope"
 * that puts the app through Google's app-verification review. In practice
 * nothing here ever needed to read, edit, or delete anything on a tutor's
 * calendar; it only ever created a single recurring event.
 *
 * A standard .ics file does the same job with no OAuth at all: the
 * recipient's own calendar app (Google, Outlook, Apple — any of them, not
 * just Google) imports it locally when they click the link. No consent
 * screen, no scopes, no review process, and it works for tutors who aren't
 * on Google in the first place.
 */
import { Hono } from 'npm:hono@4';
import * as kv from './kv_store.tsx';

const app = new Hono();

const WEEKDAY_ICS: Record<number, string> = {
  0: 'SU', 1: 'MO', 2: 'TU', 3: 'WE', 4: 'TH', 5: 'FR', 6: 'SA',
};

/** Escapes TEXT-type values per RFC 5545 (commas, semicolons, newlines, backslashes). */
function escapeIcsText(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n');
}

/** YYYYMMDDTHHMMSS for a local (already WAT) date/time — used with a TZID param. */
function toIcsLocal(dateStr: string, timeStr: string): string {
  return `${dateStr.replace(/-/g, '')}T${timeStr.replace(':', '')}00`;
}

/** YYYYMMDDTHHMMSSZ in UTC — used for DTSTAMP/UID timestamps. */
function toIcsUtcNow(): string {
  return new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
}

export interface IcsSeriesOptions {
  uid: string;
  summary: string;
  description: string;
  location: string; // the join link (Jitsi today, Daily.co once wired in)
  startDate: string; // YYYY-MM-DD, first session
  startTime: string; // HH:MM, WAT
  endTime: string;   // HH:MM, WAT
  sessionsPerWeek: 1 | 2;
  totalSessions: number;
}

/**
 * RFC 5545 RRULE value (no "RRULE:" prefix) for "the same tutoring slot,
 * every week, for N sessions" — shared between the .ics invite below and
 * the optional Google Calendar sync (google-calendar-routes.tsx), so a
 * tutor who also connects Google Calendar gets one recurring event that
 * matches the .ics everyone gets, not a second, differently-shaped series.
 */
export function buildWeeklyRRule(startDate: string, sessionsPerWeek: 1 | 2, totalSessions: number): string {
  const startDateObj = new Date(startDate + 'T12:00:00+01:00');
  const startDay = WEEKDAY_ICS[startDateObj.getDay()];

  let byDay = startDay;
  if (sessionsPerWeek === 2) {
    const secondDateObj = new Date(startDateObj);
    secondDateObj.setDate(secondDateObj.getDate() + 3);
    byDay = `${startDay},${WEEKDAY_ICS[secondDateObj.getDay()]}`;
  }

  return `FREQ=WEEKLY;BYDAY=${byDay};COUNT=${totalSessions}`;
}

/**
 * Builds a single recurring VEVENT covering the whole plan (all weekly
 * sessions as one calendar entry, matching how a real calendar app should
 * represent "the same tutoring slot, every week" — not one invite per
 * session).
 */
export function buildIcsContent(opts: IcsSeriesOptions): string {
  const rrule = buildWeeklyRRule(opts.startDate, opts.sessionsPerWeek, opts.totalSessions);

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Knowledge Fons Academy//Tutoring Sessions//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VTIMEZONE',
    'TZID:Africa/Lagos',
    'BEGIN:STANDARD',
    'DTSTART:19700101T000000',
    'TZOFFSETFROM:+0100',
    'TZOFFSETTO:+0100',
    'TZNAME:WAT',
    'END:STANDARD',
    'END:VTIMEZONE',
    'BEGIN:VEVENT',
    `UID:${opts.uid}@knowledgefonsacademy.com`,
    `DTSTAMP:${toIcsUtcNow()}`,
    `DTSTART;TZID=Africa/Lagos:${toIcsLocal(opts.startDate, opts.startTime)}`,
    `DTEND;TZID=Africa/Lagos:${toIcsLocal(opts.startDate, opts.endTime)}`,
    `RRULE:${rrule}`,
    `SUMMARY:${escapeIcsText(opts.summary)}`,
    `DESCRIPTION:${escapeIcsText(opts.description)}`,
    `LOCATION:${escapeIcsText(opts.location)}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ];

  return lines.join('\r\n');
}

/**
 * Stores a pre-rendered .ics under a random, unguessable token and returns
 * the public download URL. Deliberately not auth-gated — this link goes
 * straight into an email, and a mail client's plain GET carries no login
 * session. The token itself is the access control (a random UUID, not
 * enumerable), same pattern used by any calendar-invite link.
 */
export async function createCalendarDownloadLink(icsContent: string): Promise<string> {
  const token = crypto.randomUUID();
  await kv.set(`calendar_ics:${token}`, { content: icsContent, createdAt: new Date().toISOString() });
  const base = (Deno.env.get('SUPABASE_URL') ?? '').replace(/\/$/, '');
  return `${base}/functions/v1/make-server-cbd74580/calendar/${token}.ics`;
}

app.get('/make-server-cbd74580/calendar/:tokenFile', async (c) => {
  const tokenFile = c.req.param('tokenFile');
  const token = tokenFile.replace(/\.ics$/i, '');
  const record = (await kv.get(`calendar_ics:${token}`)) as { content: string } | null;
  if (!record) {
    return c.json({ error: 'Calendar file not found or expired' }, 404);
  }
  return new Response(record.content, {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': 'attachment; filename="tutoring-sessions.ics"',
    },
  });
});

export default app;
