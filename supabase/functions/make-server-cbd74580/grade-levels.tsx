import { normalizeGradeLevel } from './curriculum-routes.tsx';

/**
 * Tutor level data exists in two incompatible shapes, and until this helper
 * nothing in the app could compare either of them to a child's grade:
 *
 *  - `classes`: the live tutor signup / profile editor (TutorSignup.tsx,
 *    TutorProfileEditor.tsx) store Nigerian class strings like
 *    'Primary 2 (P2) / Year 2', 'JSS 1 / Year 7', 'SS 3 / Year 12', plus a
 *    few legacy 'SSS 1'-style values. As of Nov 2026, 109 of 111 tutor
 *    records have this and 0 have anything else.
 *  - `yearGroups`: the older UK-style buckets ('Primary (Year 1-6)',
 *    'KS3 (Year 7-9)', ...) written by TutorProfileForm.tsx. Still a valid
 *    write path, so still honoured here.
 *
 * Every level comparison in the codebase (the /search/tutors `level` filter,
 * Smart Match's Level dimension, the Find Tutors client-side filter) only
 * ever read `yearGroups`, so against real data they either matched nobody
 * or silently sat out. Normalising both shapes to plain year numbers
 * (Reception/Nursery = 0, Year 1..13) gives one comparison that works for
 * all of them.
 */

const BUCKET_YEAR_RANGES: Record<string, [number, number]> = {
  'Primary (Year 1-6)': [1, 6],
  'KS3 (Year 7-9)': [7, 9],
  'GCSE (Year 10-11)': [10, 11],
  'A-Level (Year 12-13)': [12, 13],
  // Nigerian-named keys accepted from newer clients (see src/utils/gradeLevels.ts)
  nursery: [0, 0],
  primary: [1, 6],
  jss: [7, 9],
  sss: [10, 12],
};

/** Parses one tutor class/year-group string into the year numbers it covers. */
export function yearsFromLevelString(raw: string): number[] {
  const s = (raw || '').trim();
  if (!s) return [];

  const bucket = BUCKET_YEAR_RANGES[s] ?? BUCKET_YEAR_RANGES[s.toLowerCase()];
  if (bucket) {
    const out: number[] = [];
    for (let y = bucket[0]; y <= bucket[1]; y++) out.push(y);
    return out;
  }

  const lower = s.toLowerCase();
  let m = lower.match(/year\s*(\d{1,2})/);
  if (m) return [Number(m[1])];
  if (/reception|nursery|kindergarten|pre-?primary/.test(lower)) return [0];
  m = lower.match(/^primary\s*(\d)/);
  if (m) return [Number(m[1])];
  m = lower.match(/^jss?\s*(\d)/);
  if (m) return [6 + Number(m[1])];
  m = lower.match(/^sss?\s*(\d)/);
  if (m) return [9 + Number(m[1])];
  return [];
}

/** All year numbers a tutor has said they teach, from whichever field(s) they filled in. */
export function tutorYearsTaught(tutor: any): Set<number> {
  const years = new Set<number>();
  const sources: string[] = [
    ...(Array.isArray(tutor?.classes) ? tutor.classes : []),
    ...(Array.isArray(tutor?.yearGroups) ? tutor.yearGroups : []),
    ...(Array.isArray(tutor?.levels) ? tutor.levels : []),
  ];
  for (const src of sources) {
    for (const y of yearsFromLevelString(String(src))) years.add(y);
  }
  return years;
}

/**
 * A child's stored gradeLevel ('primary_2', 'secondary_8', 'Year 5', '5',
 * 'nursery_3', ...) as a year number, or null when it can't be read.
 */
export function studentYearFromGradeLevel(gradeLevel: string): number | null {
  const raw = (gradeLevel || '').trim().toLowerCase();
  if (!raw) return null;
  if (/^nursery/.test(raw) || /reception/.test(raw)) return 0;
  const normalized = normalizeGradeLevel(raw);
  const m = normalized.match(/^year_(\d{1,2})$/);
  return m ? Number(m[1]) : null;
}

/** Does this tutor teach the given year? False when the tutor listed no levels at all. */
export function tutorTeachesYear(tutor: any, year: number): boolean {
  return tutorYearsTaught(tutor).has(year);
}

/**
 * Does this tutor teach anything inside the given level bucket? Accepts both
 * the legacy UK bucket names and the Nigerian keys. Unknown bucket → true
 * (an unrecognised filter value should never silently hide every tutor).
 */
export function tutorTeachesLevelBucket(tutor: any, bucket: string): boolean {
  const range = BUCKET_YEAR_RANGES[bucket] ?? BUCKET_YEAR_RANGES[(bucket || '').toLowerCase()];
  if (!range) return true;
  const years = tutorYearsTaught(tutor);
  for (let y = range[0]; y <= range[1]; y++) if (years.has(y)) return true;
  return false;
}
