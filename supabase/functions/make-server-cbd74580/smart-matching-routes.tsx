import { Hono } from 'npm:hono@4';
import * as kv from './kv_store.tsx';
import { getProfile, getProfilesByRole } from './db.tsx';

const app = new Hono();

import { requireSelfOrAdmin, verifyUser } from './route-auth.tsx';

// Smart Matching Algorithm
//
// Every dimension here should reflect data that's actually collected
// somewhere in the live product — a "neutral" fallback score is fine when an
// individual profile happens to be incomplete, but a dimension that is
// *always* neutral because nothing anywhere ever collects that field is just
// decoration dressed up as analysis. Three dimensions used to exist here —
// Learning Style, Teaching Style Preference, and Experience Level — that
// read fields (student.learningStyle, student.preferredTeachingStyle,
// student.tutorExperienceLevel) which no live signup or "Add Child" form
// (see AddChildDialog.tsx / parent-children-routes.tsx) has ever populated,
// so they scored the same flat neutral value for every single match,
// regardless of the two people actually being compared. They've been
// replaced below with Level Match (real: gradeLevel vs. tutor.yearGroups,
// both genuinely collected) and Trust & Safety (real: DBS verification,
// review-weighted rating, and actual session-attendance history — the one
// dimension that's always backed by real data no matter what either side
// filled in on a form).
async function calculateMatchScore(student: any, tutor: any): Promise<{score: number, breakdown: any}> {
  let totalScore = 0;
  const breakdown: any = {};

  // 1. Subject Match (25 points max)
  const subjectScore = calculateSubjectMatch(student, tutor);
  totalScore += subjectScore;
  breakdown.subject = subjectScore;

  // 2. Level/Grade Match (15 points max)
  const levelScore = calculateLevelMatch(student, tutor);
  totalScore += levelScore;
  breakdown.level = levelScore;

  // 3. SEN/Accessibility Match (15 points max)
  const senScore = calculateSENMatch(student, tutor);
  totalScore += senScore;
  breakdown.sen = senScore;

  // 4. Trust & Safety (25 points max)
  const trust = await calculateTrustScore(tutor);
  totalScore += trust.score;
  breakdown.trust = trust.score;
  breakdown.trustBreakdown = trust.breakdown;

  // 5. Budget Fit (10 points max)
  const budgetScore = calculateBudgetMatch(student, tutor);
  totalScore += budgetScore;
  breakdown.budget = budgetScore;

  // 6. Schedule Compatibility (10 points max)
  const scheduleScore = calculateScheduleMatch(student, tutor);
  totalScore += scheduleScore;
  breakdown.schedule = scheduleScore;

  return { score: totalScore, breakdown };
}

function calculateSubjectMatch(student: any, tutor: any): number {
  const studentSubjects = student.subjects || [];
  const tutorSubjects = tutor.subjects || [];
  
  if (studentSubjects.length === 0 || tutorSubjects.length === 0) return 0;

  const matchedSubjects = studentSubjects.filter((s: string) => tutorSubjects.includes(s));
  const matchPercentage = matchedSubjects.length / studentSubjects.length;
  
  // Bonus for matching target grades
  let bonusPoints = 0;
  matchedSubjects.forEach((subject: string) => {
    const studentTarget = student.targetGrades?.[subject];
    const tutorExp = tutor.subjectExperience?.[subject];
    
    if (studentTarget && tutorExp) {
      // Higher target grades need more experienced tutors
      if ((studentTarget === 'A*' || studentTarget === 'A') && 
          (tutorExp === 'specialist' || tutorExp === '5+years')) {
        bonusPoints += 2;
      }
    }
  });

  return Math.min(25, (matchPercentage * 20) + bonusPoints);
}

// Maps a child's grade level to the same broad level buckets tutors select
// from on their profile (see tutor.yearGroups, collected by
// TutorProfileForm.tsx). The real value stored at student.gradeLevel is the
// code AddChildDialog.tsx's Select writes (e.g. 'primary_3', 'secondary_8',
// 'sixth_form_12' — confirmed by reading that form directly), not a literal
// "Year N" string. An earlier version of this mapping only recognised
// "Year N" strings, which nothing in the live product ever actually sends —
// making Level Match silently neutral for every single match, exactly the
// kind of always-neutral dimension this file was just rewritten to remove.
// "Year N" is still accepted as a fallback in case some other caller (e.g. a
// DB profile) ever provides it directly.
const GRADE_LEVEL_CODE_MAP: Record<string, string> = {
  // No dedicated tutor bucket exists below Primary — nursery-age children
  // are mapped to the Primary bucket as the closest realistic fit.
  nursery_1: 'Primary (Year 1-6)',
  nursery_2: 'Primary (Year 1-6)',
  nursery_3: 'Primary (Year 1-6)',
  primary_1: 'Primary (Year 1-6)',
  primary_2: 'Primary (Year 1-6)',
  primary_3: 'Primary (Year 1-6)',
  primary_4: 'Primary (Year 1-6)',
  primary_5: 'Primary (Year 1-6)',
  primary_6: 'Primary (Year 1-6)',
  secondary_7: 'KS3 (Year 7-9)',
  secondary_8: 'KS3 (Year 7-9)',
  secondary_9: 'KS3 (Year 7-9)',
  secondary_10: 'GCSE (Year 10-11)',
  secondary_11: 'GCSE (Year 10-11)',
  // No dedicated tutor bucket above A-Level exists either — Post-Secondary
  // is mapped to A-Level as the closest fit.
  sixth_form_12: 'A-Level (Year 12-13)',
  sixth_form_13: 'A-Level (Year 12-13)',
};

const YEAR_GROUP_LEVELS: [string[], string][] = [
  [['Year 1', 'Year 2', 'Year 3', 'Year 4', 'Year 5', 'Year 6'], 'Primary (Year 1-6)'],
  [['Year 7', 'Year 8', 'Year 9'], 'KS3 (Year 7-9)'],
  [['Year 10', 'Year 11'], 'GCSE (Year 10-11)'],
  [['Year 12', 'Year 13'], 'A-Level (Year 12-13)'],
];

function mapGradeLevelToBucket(gradeLevel: string): string {
  if (GRADE_LEVEL_CODE_MAP[gradeLevel]) return GRADE_LEVEL_CODE_MAP[gradeLevel];
  for (const [years, level] of YEAR_GROUP_LEVELS) {
    if (years.includes(gradeLevel)) return level;
  }
  return '';
}

function calculateLevelMatch(student: any, tutor: any): number {
  const studentLevel = mapGradeLevelToBucket(student.gradeLevel || student.yearGroup || '');
  const tutorLevels: string[] = tutor.yearGroups || [];

  if (!studentLevel || tutorLevels.length === 0) return 8; // neutral — one side hasn't filled this in

  return tutorLevels.includes(studentLevel) ? 15 : 0;
}

function calculateScheduleMatch(student: any, tutor: any): number {
  const studentDays = student.availabilityDays || [];
  const tutorDays = tutor.availableDays || [];
  const studentTimes = student.availabilityTimes || [];
  const tutorTimes = tutor.availableTimes || [];

  // Neither the live "Add Child" form nor the live tutor signup form
  // collects availability today (only an abandoned enhanced profile form
  // does — see EnhancedTutorProfileForm.tsx, which nothing renders), so this
  // is neutral for virtually every match right now. Kept at a modest weight
  // rather than removed outright, since either side filling it in later
  // (via a profile edit) should start counting immediately with no further
  // changes needed here.
  if (studentDays.length === 0 || tutorDays.length === 0) return 5; // neutral (half of 10)

  const matchedDays = studentDays.filter((d: string) => tutorDays.includes(d));
  const dayScore = (matchedDays.length / studentDays.length) * 6;

  const matchedTimes = studentTimes.filter((t: string) => tutorTimes.includes(t));
  const timeScore = (matchedTimes.length / Math.max(studentTimes.length, 1)) * 4;

  return Math.round(dayScore + timeScore);
}

function calculateBudgetMatch(student: any, tutor: any): number {
  const studentBudget = student.budgetRange || '';
  const tutorRate = parseFloat(tutor.hourlyRate || '0');

  if (!studentBudget || tutorRate === 0) return 5; // neutral

  const budgetRanges: Record<string, [number, number]> = {
    '15-25': [15, 25],
    '25-40': [25, 40],
    '40-60': [40, 60],
    '60+': [60, 1000]
  };

  const [min, max] = budgetRanges[studentBudget] || [0, 1000];

  if (tutorRate >= min && tutorRate <= max) {
    // Perfect fit
    return 10;
  } else if (tutorRate < min) {
    // Under budget - still good
    return 8;
  } else if (tutorRate <= max * 1.2) {
    // Slightly over budget
    return 5;
  } else {
    // Too expensive
    return 0;
  }
}

function calculateSENMatch(student: any, tutor: any): number {
  // Real child profiles (see AddChildDialog.tsx / parent-children-routes.tsx)
  // store special needs as free text at `specialNeeds` — the structured
  // `senSupport` array this function used to require exclusively is never
  // populated by any live form, so a child with real, described special
  // needs was always scored as if they had none. Prefer structured data when
  // it exists (a future form could add it without any change here), fall
  // back to the free-text field that's actually live today.
  const structuredSEN: string[] = student.senSupport || [];
  const hasStructuredSEN = structuredSEN.length > 0 && !structuredSEN.includes('None');
  const senText = (student.specialNeeds || '').trim();
  const hasSEN = hasStructuredSEN || senText.length > 0;

  const tutorSENList: string[] = tutor.senExperience || [];
  const bioLower = (tutor.bio || '').toLowerCase();
  const qualLower = (tutor.qualifications || '').toLowerCase();
  const tutorHasSENExperience =
    (tutorSENList.length > 0 && !tutorSENList.includes('None')) ||
    bioLower.includes('sen') || bioLower.includes('special needs') ||
    qualLower.includes('sen') || qualLower.includes('special needs');

  if (!hasSEN) {
    // No special needs described for this child — being an SEN specialist
    // shouldn't count against a tutor, so this is full marks either way.
    return 15;
  }

  if (!tutorHasSENExperience) return 0; // real, safety-relevant mismatch

  if (hasStructuredSEN) {
    const matchedSEN = structuredSEN.filter((s: string) => tutorSENList.includes(s));
    return Math.round((matchedSEN.length / structuredSEN.length) * 15);
  }

  return 15; // matched via the free-text/keyword signal — all-or-nothing
}

/**
 * Trust & Safety (25 points max) — the one dimension that's always backed by
 * real data no matter what either side filled in on a form: DBS
 * verification (5), a review-weighted rating (12), and actual
 * session-attendance history (8).
 */
async function calculateTrustScore(tutor: any): Promise<{score: number, breakdown: any}> {
  const tutorId = tutor.userId || tutor.id;

  const dbsScore = tutor.dbsStatus === 'verified' ? 5 : 0;

  // Confidence-weighted rating: a tutor with one 5-star review shouldn't
  // outrank one with 80 reviews averaging 4.7. Shrink toward a neutral prior
  // in proportion to how few reviews exist, so a brand-new, unreviewed tutor
  // gets a fair starting point — not falsely perfect (the old bug: search
  // code elsewhere defaulted a missing rating to '5'), and not falsely zero.
  const ratingStats = tutorId ? await kv.get(`tutor:rating:${tutorId}`) as any : null;
  const reviewCount = ratingStats?.totalReviews || 0;
  const avgRating = ratingStats?.averageRating || 0;
  const PRIOR_RATING = 4.0;
  const PRIOR_WEIGHT = 3;
  const confidenceRating = reviewCount > 0
    ? ((avgRating * reviewCount) + (PRIOR_RATING * PRIOR_WEIGHT)) / (reviewCount + PRIOR_WEIGHT)
    : PRIOR_RATING;
  const ratingScore = Math.round((confidenceRating / 5) * 12);

  // Real no-show history (see updateTutorReliability in payment-routes.tsx),
  // not a self-reported field. No history yet = benefit of the doubt.
  const reliability = tutorId ? await kv.get(`tutor:reliability:${tutorId}`) as any : null;
  const noShowRate = reliability?.noShowRate ?? 0;
  const reliabilityScore = Math.max(0, Math.round(8 * (1 - noShowRate)));

  return {
    score: dbsScore + ratingScore + reliabilityScore,
    breakdown: { dbs: dbsScore, rating: ratingScore, reliability: reliabilityScore },
  };
}

// Get matched tutors for a student
app.get('/match/student/:studentId', async (c) => {
  try {
    const callerId = await verifyUser(c);
    if (!callerId) return c.json({ error: 'Unauthorized' }, 401);
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    if (!accessToken) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const studentId = c.req.param('studentId');

    // Try KV first (enhanced child profiles), then fall back to DB profile
    let student: any = await kv.get(`child:${studentId}`);
    if (!student) {
      const dbProfile = await getProfile(studentId).catch(() => null);
      if (dbProfile) {
        student = {
          id: studentId,
          firstName: dbProfile.firstName || dbProfile.fullName?.split(' ')[0] || '',
          lastName: dbProfile.lastName || dbProfile.fullName?.split(' ').slice(1).join(' ') || '',
          subjects: dbProfile.subjects || [],
          gradeLevel: dbProfile.gradeLevel || dbProfile.grade || '',
          ...dbProfile,
        };
      }
    }

    if (!student) {
      return c.json({ error: 'Student not found' }, 404);
    }

    // Get all verified tutors from KV; supplement with DB profiles
    const allKvUsers = await kv.getByPrefix('user:');
    const kvTutors = allKvUsers.filter((u: any) =>
      u.role === 'tutor' && u.verificationStatus === 'verified'
    );

    // Also pull from DB in case tutors are stored there but not in KV
    const dbTutors = await getProfilesByRole('tutor').catch(() => [] as any[]);
    const dbVerifiedTutors = dbTutors.filter((u: any) =>
      u.verificationStatus === 'verified' || u.verificationStatus === 'approved'
    );

    // Merge: DB tutors not already in KV set
    const kvIds = new Set(kvTutors.map((u: any) => u.userId || u.id));
    const extraDbTutors = dbVerifiedTutors.filter((u: any) => !kvIds.has(u.id));
    const tutors = [...kvTutors, ...extraDbTutors];

    // Calculate match scores for each tutor
    const matches = await Promise.all(tutors.map(async (tutor: any) => {
      const { score, breakdown } = await calculateMatchScore(student, tutor);
      return {
        tutorId: tutor.userId || tutor.id,
        tutor: {
          id: tutor.userId || tutor.id,
          name: tutor.fullName || tutor.name || 'Unknown Tutor',
          bio: tutor.bio,
          subjects: tutor.subjects || [],
          hourlyRate: tutor.hourlyRate,
          experienceLevel: tutor.experienceLevel,
          yearsExperience: tutor.yearsExperience,
          teachingStyle: tutor.teachingStyle || [],
          senExperience: tutor.senExperience || [],
          languagesSpoken: tutor.languagesSpoken || [],
          photo: tutor.documents?.photo || null,
        },
        matchScore: score,
        matchBreakdown: breakdown,
        matchPercentage: Math.round(score),
        compatibility: score >= 75 ? 'Excellent' : score >= 60 ? 'Good' : score >= 45 ? 'Fair' : 'Low'
      };
    }));

    // Sort by match score (highest first)
    matches.sort((a, b) => b.matchScore - a.matchScore);

    // Return top matches
    const topMatches = matches.slice(0, 20);

    return c.json({
      success: true,
      student: {
        id: student.id,
        name: `${student.firstName} ${student.lastName}`,
        subjects: student.subjects || []
      },
      totalTutors: tutors.length,
      matches: topMatches,
      matchingCriteria: {
        subjects: student.subjects || [],
        learningStyle: student.learningStyle || [],
        budget: student.budgetRange || 'any',
        availability: {
          days: student.availabilityDays || [],
          times: student.availabilityTimes || []
        },
        specialNeeds: student.senSupport || []
      }
    });
  } catch (error: any) {
    console.error('Error matching tutors:', error);
    return c.json({ error: error.message || 'Failed to find matches' }, 500);
  }
});

// Get matched students for a tutor
app.get('/match/tutor/:tutorId', async (c) => {
  try {
    const callerId = await verifyUser(c);
    if (!callerId) return c.json({ error: 'Unauthorized' }, 401);
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    if (!accessToken) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const tutorId = c.req.param('tutorId');
    const tutor = await kv.get(`user:${tutorId}`) as any;

    if (!tutor || tutor.role !== 'tutor') {
      return c.json({ error: 'Tutor not found' }, 404);
    }

    // Get all students
    const allChildren = await kv.getByPrefix('child:');
    const students = allChildren.filter((s: any) => s.matchingEnabled);

    // Calculate match scores for each student
    const matches = await Promise.all(students.map(async (student: any) => {
      const { score, breakdown } = await calculateMatchScore(student, tutor);
      return {
        studentId: student.id,
        student: {
          id: student.id,
          name: `${student.firstName} ${student.lastName}`,
          gradeLevel: student.gradeLevel,
          subjects: student.subjects || [],
          learningGoals: student.learningGoals,
        },
        matchScore: score,
        matchBreakdown: breakdown,
        matchPercentage: Math.round(score),
        compatibility: score >= 75 ? 'Excellent' : score >= 60 ? 'Good' : score >= 45 ? 'Fair' : 'Low'
      };
    }));

    // Sort by match score (highest first)
    matches.sort((a, b) => b.matchScore - a.matchScore);

    // Return top matches
    const topMatches = matches.slice(0, 20);

    return c.json({
      success: true,
      tutor: {
        id: tutor.userId || tutor.id,
        name: tutor.fullName || tutor.name,
        subjects: tutor.subjects || []
      },
      totalStudents: students.length,
      matches: topMatches
    });
  } catch (error: any) {
    console.error('Error matching students:', error);
    return c.json({ error: error.message || 'Failed to find matches' }, 500);
  }
});

// Add enhanced child profile endpoint
app.post('/parent/add-child-enhanced', async (c) => {
  try {
    const data = await c.req.json();
    const { parentId, ...childData } = data;
    const auth = await requireSelfOrAdmin(c, parentId);
    if (auth instanceof Response) return auth;

    // Check subscription limits (simplified)
    const existingChildren = await kv.getByPrefix(`child:${parentId}:`);
    // This would normally check subscription tier limits

    // Create child profile with all matching data
    const childId = `${parentId}:${Date.now()}`;
    const childProfile = {
      id: childId,
      parentId,
      ...childData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await kv.set(`child:${childId}`, childProfile);

    return c.json({
      success: true,
      child: childProfile,
      message: 'Student profile created successfully. Finding perfect tutor matches...'
    });
  } catch (error: any) {
    console.error('Error creating enhanced child profile:', error);
    return c.json({ error: error.message || 'Failed to create profile' }, 500);
  }
});

export default app;
