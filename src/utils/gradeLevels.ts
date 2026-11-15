/**
 * Frontend twin of supabase/functions/make-server-cbd74580/grade-levels.tsx —
 * keep the two in step.
 *
 * Tutors' teaching levels live in two shapes: `classes` (the live signup /
 * profile editor — 'Primary 2 (P2) / Year 2', 'JSS 1 / Year 7', 'SS 3 /
 * Year 12', legacy 'SSS 1') and the older `yearGroups` UK buckets
 * ('Primary (Year 1-6)', ...). A child's gradeLevel is a code like
 * 'primary_2' or 'secondary_8'. Everything here normalises to plain year
 * numbers (Reception/Nursery = 0, Year 1..13) so they can be compared.
 */

export interface LevelBucket {
  key: string;
  label: string;
  years: [number, number];
}

/** Filter buckets shown to parents, in the platform's own (Nigerian) terms. */
export const LEVEL_BUCKETS: LevelBucket[] = [
  { key: 'nursery', label: 'Nursery / Reception', years: [0, 0] },
  { key: 'primary', label: 'Primary (P1–P6 · Yr 1–6)', years: [1, 6] },
  { key: 'jss', label: 'Junior Secondary (JSS 1–3 · Yr 7–9)', years: [7, 9] },
  { key: 'sss', label: 'Senior Secondary (SS 1–3 · Yr 10–12)', years: [10, 12] },
];

const LEGACY_BUCKET_RANGES: Record<string, [number, number]> = {
  'Primary (Year 1-6)': [1, 6],
  'KS3 (Year 7-9)': [7, 9],
  'GCSE (Year 10-11)': [10, 11],
  'A-Level (Year 12-13)': [12, 13],
};

function range(lo: number, hi: number): number[] {
  const out: number[] = [];
  for (let y = lo; y <= hi; y++) out.push(y);
  return out;
}

/** Parses one tutor class / year-group string into the year numbers it covers. */
export function yearsFromLevelString(raw: string): number[] {
  const s = (raw || '').trim();
  if (!s) return [];
  const legacy = LEGACY_BUCKET_RANGES[s];
  if (legacy) return range(legacy[0], legacy[1]);
  const bucket = LEVEL_BUCKETS.find((b) => b.key === s.toLowerCase());
  if (bucket) return range(bucket.years[0], bucket.years[1]);

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
  const sources: unknown[] = [
    ...(Array.isArray(tutor?.classes) ? tutor.classes : []),
    ...(Array.isArray(tutor?.yearGroups) ? tutor.yearGroups : []),
    ...(Array.isArray(tutor?.levels) ? tutor.levels : []),
  ];
  for (const src of sources) for (const y of yearsFromLevelString(String(src))) years.add(y);
  return years;
}

/**
 * A child's stored gradeLevel ('primary_2', 'secondary_8', 'sixth_form_12',
 * 'Year 5', '5', 'nursery_3', ...) as a year number, or null if unreadable.
 */
export function studentYearFromGradeLevel(gradeLevel: string | undefined | null): number | null {
  const raw = (gradeLevel || '').trim().toLowerCase().replace(/\s+/g, '_');
  if (!raw) return null;
  if (/^nursery/.test(raw) || /reception/.test(raw)) return 0;
  let m = raw.match(/^(?:year|primary|secondary|sixth_form)_(\d{1,2})$/);
  if (m) return Number(m[1]);
  m = raw.match(/^(\d{1,2})$/);
  if (m) return Number(m[1]);
  return null;
}

export function tutorTeachesYear(tutor: any, year: number): boolean {
  return tutorYearsTaught(tutor).has(year);
}

export function tutorTeachesBucket(tutor: any, bucketKey: string): boolean {
  const bucket = LEVEL_BUCKETS.find((b) => b.key === bucketKey);
  if (!bucket) return true;
  const years = tutorYearsTaught(tutor);
  for (let y = bucket.years[0]; y <= bucket.years[1]; y++) if (years.has(y)) return true;
  return false;
}

/** 'Year 2' / 'Reception' for labels. */
export function formatYear(year: number): string {
  return year === 0 ? 'Reception' : `Year ${year}`;
}
