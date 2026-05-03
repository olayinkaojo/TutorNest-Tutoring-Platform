import { Hono } from 'npm:hono@4';
import { createClient } from 'jsr:@supabase/supabase-js@2';
import * as kv from './kv_store.tsx';

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
    const minPrice = parseFloat(c.req.query('minPrice') || '0');
    const maxPrice = parseFloat(c.req.query('maxPrice') || '10000');
    const minRating = parseFloat(c.req.query('minRating') || '0');
    const dbsRequired = c.req.query('dbsRequired') === 'true';

    // Get all tutors (removed verification status filter to make all tutors live and visible)
    const allUsers = await kv.getByPrefix('user:');
    let tutors = allUsers.filter((user: any) =>
      user.role === 'tutor'
    );

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
      tutors = tutors.filter((tutor: any) =>
        tutor.yearGroups?.includes(level)
      );
    }

    if (availability) {
      tutors = tutors.filter((tutor: any) =>
        tutor.availability === availability || tutor.availability === 'flexible'
      );
    }

    tutors = tutors.filter((tutor: any) => {
      const rate = parseFloat(tutor.hourlyRate || '0');
      return rate >= minPrice && rate <= maxPrice;
    });

    if (minRating > 0) {
      tutors = tutors.filter((tutor: any) =>
        parseFloat(tutor.rating || '5') >= minRating
      );
    }

    if (dbsRequired) {
      tutors = tutors.filter((tutor: any) =>
        tutor.dbsStatus === 'verified'
      );
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

// AI-Assisted Match Recommendations
tutorSearchRoutes.post('/search/recommendations', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const userId = await getUserId(accessToken ?? null);

    if (!userId) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const { studentProfile } = await c.req.json();

    if (!studentProfile) {
      return c.json({ error: 'Student profile required' }, 400);
    }

    // Get all verified tutors
    const allUsers = await kv.getByPrefix('user:');
    const tutors = allUsers.filter((user: any) =>
      user.role === 'tutor' &&
      user.verificationStatus === 'verified'
    );

    // Calculate match scores
    const scoredTutors = tutors.map((tutor: any) => {
      let score = 0;
      const matchReasons: string[] = [];

      // Subject match (high priority)
      const studentSubjects = studentProfile.subjects || [];
      const tutorSubjects = tutor.subjects || [];
      const subjectMatches = studentSubjects.filter((s: string) =>
        tutorSubjects.includes(s)
      );
      if (subjectMatches.length > 0) {
        score += subjectMatches.length * 20;
        matchReasons.push(`Teaches ${subjectMatches.join(', ')}`);
      }

      // Level match
      const studentYearGroup = studentProfile.yearGroup;
      if (studentYearGroup) {
        // Map year groups to levels
        let studentLevel = '';
        if (['Year 1', 'Year 2', 'Year 3', 'Year 4', 'Year 5', 'Year 6'].includes(studentYearGroup)) {
          studentLevel = 'Primary (Year 1-6)';
        } else if (['Year 7', 'Year 8', 'Year 9'].includes(studentYearGroup)) {
          studentLevel = 'KS3 (Year 7-9)';
        } else if (['Year 10', 'Year 11'].includes(studentYearGroup)) {
          studentLevel = 'GCSE (Year 10-11)';
        } else if (['Year 12', 'Year 13'].includes(studentYearGroup)) {
          studentLevel = 'A-Level (Year 12-13)';
        }

        if (studentLevel && tutor.yearGroups?.includes(studentLevel)) {
          score += 15;
          matchReasons.push(`Experienced with ${studentLevel}`);
        }
      }

      // SEN match (if applicable)
      if (studentProfile.senType && studentProfile.senType !== 'None') {
        // Tutors with SEN experience in bio or qualifications get bonus
        const bioLower = (tutor.bio || '').toLowerCase();
        const qualLower = (tutor.qualifications || '').toLowerCase();
        if (bioLower.includes('sen') || bioLower.includes('special needs') ||
            qualLower.includes('sen') || qualLower.includes('special needs')) {
          score += 10;
          matchReasons.push('Has SEN experience');
        }
      }

      // DBS verified (trust factor)
      if (tutor.dbsStatus === 'verified') {
        score += 5;
        matchReasons.push('DBS verified');
      }

      // High rating
      const rating = parseFloat(tutor.rating || '5');
      if (rating >= 4.5) {
        score += 5;
        matchReasons.push(`${rating}★ rating`);
      }

      // Availability flexibility
      if (tutor.availability === 'flexible') {
        score += 3;
        matchReasons.push('Flexible availability');
      }

      return {
        ...tutor,
        matchScore: score,
        matchReasons: matchReasons.join(', '),
      };
    });

    // Sort by match score and take top 5
    scoredTutors.sort((a, b) => b.matchScore - a.matchScore);
    const recommendations = scoredTutors.slice(0, 5).filter(t => t.matchScore > 0);

    return c.json({ recommendations });
  } catch (error: any) {
    console.error('Error generating recommendations:', error);
    return c.json({ error: error.message || 'Internal server error' }, 500);
  }
});

export { tutorSearchRoutes };
