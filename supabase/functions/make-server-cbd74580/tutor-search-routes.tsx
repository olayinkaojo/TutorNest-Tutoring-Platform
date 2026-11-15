import { Hono } from 'npm:hono@4';
import { createClient } from 'jsr:@supabase/supabase-js@2';
import * as kv from './kv_store.tsx';
import { getProfilesByRole } from './db.tsx';
import { tutorTeachesLevelBucket } from './grade-levels.tsx';

const tutorSearchRoutes = new Hono();

// Duplicated from index.ts — shared helper
const getSupabaseClient = () => {
  return createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );
};

// Duplicated from index.ts — shared helper
const getUserId = async (accessToken: string | null): Promise<string | null> => {
  if (!accessToken) return null;

  try {
    const supabase = getSupabaseClient();
    const { data: { user }, error } = await supabase.auth.getUser(accessToken);
    if (error || !user) return null;
    return user.id;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('getUserId: token verification failed:', msg);
    return null;
  }
};

const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
const WEEKEND = ['Saturday', 'Sunday'];
const DAY_ABBR: Record<string, string> = {
  Monday: 'Mon', Tuesday: 'Tue', Wednesday: 'Wed', Thursday: 'Thu', Friday: 'Fri', Saturday: 'Sat', Sunday: 'Sun',
};
const EVENING_START_MINUTES = 17 * 60;

const toMinutes = (hhmm: string): number => {
  const [h, m] = String(hhmm || '').split(':').map(Number);
  return Number.isFinite(h) ? h * 60 + (Number.isFinite(m) ? m : 0) : NaN;
};

/**
 * Collapses a tutor's saved weekly schedule (`availability:<id>`, written by
 * TutorAvailabilityManager.tsx — { schedule: { Monday: { enabled, slots:
 * [{start,end}] }, ... } }) into the coarse filter tags the search UI
 * offers ('weekdays-daytime' | 'weekdays-evenings' | 'weekends') plus a
 * short human summary like "Mon–Fri 09:00–17:00 · Sat 10:00–14:00".
 * A tutor with no saved schedule gets no tags, so they're excluded by any
 * availability filter rather than assumed to be free.
 */
function summarizeSchedule(record: any): { tags: string[]; summary: string | null } {
  const schedule = record?.schedule;
  if (!schedule || typeof schedule !== 'object') return { tags: [], summary: null };

  const tags = new Set<string>();
  const activeDays: { day: string; slots: string }[] = [];

  for (const day of [...WEEKDAYS, ...WEEKEND]) {
    const entry = schedule[day];
    const slots: any[] = entry?.enabled && Array.isArray(entry.slots) ? entry.slots : [];
    const valid = slots.filter((s) => !Number.isNaN(toMinutes(s?.start)) && !Number.isNaN(toMinutes(s?.end)));
    if (valid.length === 0) continue;

    if (WEEKEND.includes(day)) {
      tags.add('weekends');
    } else {
      for (const s of valid) {
        if (toMinutes(s.start) < EVENING_START_MINUTES) tags.add('weekdays-daytime');
        if (toMinutes(s.end) > EVENING_START_MINUTES) tags.add('weekdays-evenings');
      }
    }
    activeDays.push({ day, slots: valid.map((s) => `${s.start}–${s.end}`).join(', ') });
  }

  if (activeDays.length === 0) return { tags: [], summary: null };

  // Group consecutive days that share identical slots: Mon–Fri 09:00–17:00
  const groups: { days: string[]; slots: string }[] = [];
  for (const { day, slots } of activeDays) {
    const last = groups[groups.length - 1];
    const allDays = [...WEEKDAYS, ...WEEKEND];
    const consecutive = last && allDays.indexOf(day) === allDays.indexOf(last.days[last.days.length - 1]) + 1;
    if (last && consecutive && last.slots === slots) last.days.push(day);
    else groups.push({ days: [day], slots });
  }
  const summary = groups
    .map((g) => {
      const label = g.days.length >= 3
        ? `${DAY_ABBR[g.days[0]]}–${DAY_ABBR[g.days[g.days.length - 1]]}`
        : g.days.map((d) => DAY_ABBR[d]).join(', ');
      return `${label} ${g.slots}`;
    })
    .join(' · ');

  return { tags: [...tags], summary };
}

// Search tutors with filters
tutorSearchRoutes.get('/search/tutors', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const userId = await getUserId(accessToken ?? null);

    if (!userId) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const keyword = c.req.query('keyword') || '';
    const subject = c.req.query('subject') || '';
    const level = c.req.query('level') || '';
    const availability = c.req.query('availability') || '';
    const minRating = parseFloat(c.req.query('minRating') || '0');
    const dbsRequired = c.req.query('dbsRequired') === 'true';

    // Only show tutors a parent has actually been cleared to see. An
    // unverified tutor (no background check reviewed, or still pending) must
    // never appear in a parent-facing list — a prior version of this route
    // intentionally dropped that filter "to make all tutors live and
    // visible," which meant rejected and pending applicants were booking-
    // visible to every parent on the platform.
    const isVerified = (u: any) =>
      u.verificationStatus === 'verified' || u.verificationStatus === 'approved';

    const allUsers = await kv.getByPrefix('user:');
    const kvTutors = allUsers.filter((user: any) => user.role === 'tutor' && isVerified(user));

    // Mirrors the KV+DB merge in smart-matching-routes.tsx — without this, a
    // tutor who exists in the profiles table but was never (or no longer)
    // mirrored into KV silently never appeared in search results, even
    // though the same tutor shows up correctly in Smart Match.
    const dbTutors = await getProfilesByRole('tutor').catch(() => [] as any[]);
    const dbVerifiedTutors = dbTutors.filter((u: any) => isVerified(u));
    const kvIds = new Set(kvTutors.map((u: any) => u.userId || u.id));
    const extraDbTutors = dbVerifiedTutors.filter((u: any) => !kvIds.has(u.id));

    let tutors: any[] = [...kvTutors, ...extraDbTutors];

    // tutor.rating on the raw KV profile is never written by anything — real
    // reviews update a separate cache (tutor:rating:<id>, see
    // updateTutorRating in reviews-disputes-routes.tsx) that this endpoint
    // never read. Every tutor showed whatever rating.rating happened to be
    // seeded at signup (usually nothing, falling back to a flat "5.0"),
    // completely disconnected from actual submitted reviews — overwrite it
    // with the real number before anything below filters or sorts by it.
    tutors = await Promise.all(tutors.map(async (tutor: any) => {
      const tutorId = tutor.id ?? tutor.userId;
      const [stats, schedule] = tutorId
        ? await Promise.all([
            kv.get(`tutor:rating:${tutorId}`) as Promise<any>,
            kv.get(`availability:${tutorId}`) as Promise<any>,
          ])
        : [null, null];
      const { tags: availabilityTags, summary: availabilitySummary } = summarizeSchedule(schedule);
      return {
        ...tutor,
        rating: stats ? stats.averageRating : null,
        reviewCount: stats ? stats.totalReviews : 0,
        // The signup form writes `dbs_checked` (snake_case); every filter and
        // badge downstream read `dbsChecked`/`dbsStatus`, so no tutor ever
        // showed as DBS-cleared and the "DBS only" filter returned nobody.
        // This is the tutor's own declaration at signup, reviewed by admin
        // as part of verification — not an independent check by us.
        dbsChecked: tutor.dbs_checked === true || tutor.dbsChecked === true || tutor.dbsStatus === 'verified',
        // Real weekly schedule from TutorAvailabilityManager (availability:<id>),
        // which told tutors "your availability will be visible to parents when
        // they search" — nothing ever surfaced it until now. The old filter
        // compared a `tutor.availability` string that no tutor record has.
        availabilityTags,
        availabilitySummary,
        // Platform flat rate (see PAYMENT_PLANS in payment-routes.tsx) —
        // overridden here rather than trusted from whatever's on the raw
        // profile, since tutors no longer set this themselves and older
        // records may still carry a pre-flat-rate value.
        hourlyRate: 15000,
      };
    }));

    // Apply filters
    if (keyword) {
      const keywordLower = keyword.toLowerCase();
      tutors = tutors.filter((tutor: any) =>
        tutor.firstName?.toLowerCase().includes(keywordLower) ||
        tutor.lastName?.toLowerCase().includes(keywordLower) ||
        tutor.bio?.toLowerCase().includes(keywordLower) ||
        tutor.subjects?.some((s: string) => s.toLowerCase().includes(keywordLower))
      );
    }

    if (subject) {
      tutors = tutors.filter((tutor: any) =>
        tutor.subjects?.includes(subject)
      );
    }

    if (level) {
      // Was `tutor.yearGroups?.includes(level)` — a field no live tutor
      // record has (they store `classes`), so any level filter returned
      // nobody. See grade-levels.tsx.
      tutors = tutors.filter((tutor: any) => tutorTeachesLevelBucket(tutor, level));
    }

    if (availability) {
      tutors = tutors.filter((tutor: any) => tutor.availabilityTags.includes(availability));
    }

    // A min/max price filter used to live here — removed along with the
    // tutor-settable rate itself; every tutor now charges the same
    // platform flat rate (overridden above), so a price range has nothing
    // left to filter on.

    if (minRating > 0) {
      // tutor.rating was overwritten above with the real cached average (or
      // null when a tutor has no reviews yet) — defaulting a missing rating
      // to '5' here meant an unrated, unproven tutor passed every minimum-
      // rating filter as if verified excellent. Default to 0 instead: no
      // reviews yet genuinely doesn't meet a stated minimum.
      tutors = tutors.filter((tutor: any) =>
        parseFloat(tutor.rating ?? '0') >= minRating
      );
    }

    if (dbsRequired) {
      tutors = tutors.filter((tutor: any) => tutor.dbsChecked === true);
    }

    // Sort by rating (descending) and response rate
    tutors.sort((a: any, b: any) => {
      const ratingA = parseFloat(a.rating || '0');
      const ratingB = parseFloat(b.rating || '0');
      return ratingB - ratingA;
    });

    return c.json({ tutors, count: tutors.length });
  } catch (error: any) {
    console.error('Error searching tutors:', error);
    return c.json({ error: error.message || 'Internal server error' }, 500);
  }
});

// A second, simpler match-scoring implementation used to live here at
// POST /search/recommendations — a separate, disconnected scoring engine
// from the real one in smart-matching-routes.tsx (GET /match/student/:id),
// which the same screen (ParentDashboard.tsx's "Try Smart Match" toggle)
// already offers side by side with this one. Two engines meant a parent
// could see two different match scores for the same tutor depending which
// toggle they clicked. It's removed rather than fixed in place: nothing
// live ever called it (ParentDashboard.tsx never actually passed the
// studentProfile prop TutorSearch.tsx needed to trigger the request, so the
// "Recommended Match" badge it powered was permanently inert), and
// consolidating onto the one real engine is better than maintaining two.
// See smart-matching-routes.tsx for the current Smart Match implementation.

export { tutorSearchRoutes };
