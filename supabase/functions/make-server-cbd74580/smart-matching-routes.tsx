import { Hono } from 'npm:hono';
import * as kv from './kv_store.tsx';

const app = new Hono();

// Smart Matching Algorithm
function calculateMatchScore(student: any, tutor: any): {score: number, breakdown: any} {
  let totalScore = 0;
  const breakdown: any = {};

  // 1. Subject Match (25 points max)
  const subjectScore = calculateSubjectMatch(student, tutor);
  totalScore += subjectScore;
  breakdown.subject = subjectScore;

  // 2. Learning Style Compatibility (15 points max)
  const learningStyleScore = calculateLearningStyleMatch(student, tutor);
  totalScore += learningStyleScore;
  breakdown.learningStyle = learningStyleScore;

  // 3. Schedule Compatibility (20 points max)
  const scheduleScore = calculateScheduleMatch(student, tutor);
  totalScore += scheduleScore;
  breakdown.schedule = scheduleScore;

  // 4. Budget Fit (10 points max)
  const budgetScore = calculateBudgetMatch(student, tutor);
  totalScore += budgetScore;
  breakdown.budget = budgetScore;

  // 5. SEN/Accessibility Match (15 points max)
  const senScore = calculateSENMatch(student, tutor);
  totalScore += senScore;
  breakdown.sen = senScore;

  // 6. Teaching Style Preference (10 points max)
  const teachingStyleScore = calculateTeachingStyleMatch(student, tutor);
  totalScore += teachingStyleScore;
  breakdown.teachingStyle = teachingStyleScore;

  // 7. Experience Level Match (5 points max)
  const experienceScore = calculateExperienceMatch(student, tutor);
  totalScore += experienceScore;
  breakdown.experience = experienceScore;

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

function calculateLearningStyleMatch(student: any, tutor: any): number {
  const studentStyles = student.learningStyle || [];
  const tutorStyles = tutor.learningStylesSupported || [];
  
  if (studentStyles.length === 0 || tutorStyles.length === 0) return 8; // neutral score

  // Map student preferences to tutor capabilities
  const styleMap: Record<string, string> = {
    'Visual (pictures, diagrams)': 'Visual Learners',
    'Auditory (listening, discussion)': 'Auditory Learners',
    'Kinesthetic (hands-on, practical)': 'Kinesthetic Learners',
    'Reading/Writing': 'Reading/Writing Learners'
  };

  const matchedStyles = studentStyles.filter((s: string) => 
    tutorStyles.includes(styleMap[s] || s)
  );

  const matchPercentage = matchedStyles.length / studentStyles.length;
  return Math.round(matchPercentage * 15);
}

function calculateScheduleMatch(student: any, tutor: any): number {
  const studentDays = student.availabilityDays || [];
  const tutorDays = tutor.availableDays || [];
  const studentTimes = student.availabilityTimes || [];
  const tutorTimes = tutor.availableTimes || [];

  if (studentDays.length === 0 || tutorDays.length === 0) return 10; // neutral

  const matchedDays = studentDays.filter((d: string) => tutorDays.includes(d));
  const dayScore = (matchedDays.length / studentDays.length) * 12;

  const matchedTimes = studentTimes.filter((t: string) => tutorTimes.includes(t));
  const timeScore = (matchedTimes.length / Math.max(studentTimes.length, 1)) * 8;

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
  const studentSEN = student.senSupport || [];
  const tutorSEN = tutor.senExperience || [];

  // If student has no SEN needs
  if (studentSEN.length === 0 || studentSEN.includes('None')) {
    return tutorSEN.includes('None') ? 15 : 10; // slight preference for tutors without SEN focus
  }

  // If student has SEN needs but tutor has none
  if (tutorSEN.includes('None') || tutorSEN.length === 0) {
    return 0; // critical mismatch
  }

  // Calculate SEN match
  const matchedSEN = studentSEN.filter((s: string) => tutorSEN.includes(s));
  const matchPercentage = matchedSEN.length / studentSEN.length;

  return Math.round(matchPercentage * 15);
}

function calculateTeachingStyleMatch(student: any, tutor: any): number {
  const studentPreferences = student.preferredTeachingStyle || [];
  const tutorStyles = tutor.teachingStyle || [];

  if (studentPreferences.length === 0 || tutorStyles.length === 0) return 5; // neutral

  const matchedStyles = studentPreferences.filter((s: string) => tutorStyles.includes(s));
  const matchPercentage = matchedStyles.length / studentPreferences.length;

  return Math.round(matchPercentage * 10);
}

function calculateExperienceMatch(student: any, tutor: any): number {
  const studentPreference = student.tutorExperienceLevel || 'no_preference';
  const tutorLevel = tutor.experienceLevel || '';

  if (studentPreference === 'no_preference') return 3; // neutral

  const levelMap: Record<string, string[]> = {
    'beginner': ['beginner'],
    'intermediate': ['intermediate'],
    'expert': ['expert', 'specialist'],
    'specialist': ['specialist']
  };

  const matchingLevels = levelMap[studentPreference] || [];
  return matchingLevels.includes(tutorLevel) ? 5 : 2;
}

// Get matched tutors for a student
app.get('/match/student/:studentId', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    if (!accessToken) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const studentId = c.req.param('studentId');
    const student = await kv.get(`child:${studentId}`) as any;

    if (!student) {
      return c.json({ error: 'Student not found' }, 404);
    }

    // Get all verified tutors
    const allUsers = await kv.getByPrefix('user:');
    const tutors = allUsers.filter((u: any) => 
      u.role === 'tutor' && 
      u.verificationStatus === 'verified' &&
      u.matchingEnabled
    );

    // Calculate match scores for each tutor
    const matches = tutors.map((tutor: any) => {
      const { score, breakdown } = calculateMatchScore(student, tutor);
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
        matchPercentage: Math.round((score / 100) * 100),
        compatibility: score >= 75 ? 'Excellent' : score >= 60 ? 'Good' : score >= 45 ? 'Fair' : 'Low'
      };
    });

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
    const matches = students.map((student: any) => {
      const { score, breakdown } = calculateMatchScore(student, tutor);
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
        matchPercentage: Math.round((score / 100) * 100),
        compatibility: score >= 75 ? 'Excellent' : score >= 60 ? 'Good' : score >= 45 ? 'Fair' : 'Low'
      };
    });

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
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    if (!accessToken) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const data = await c.req.json();
    const { parentId, ...childData } = data;

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
