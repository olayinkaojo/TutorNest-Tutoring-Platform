import { Hono } from 'npm:hono@4';
import { createClient } from 'jsr:@supabase/supabase-js@2';
import * as kv from './kv_store.tsx';
import * as db from './db.tsx';

const app = new Hono();

// Lazy-load ~1.4MB of trivia so cold start does not parse/evaluate all year modules at boot (avoids Edge BOOT_ERROR).
type TriviaBank = Record<string, Record<string, unknown[]>>;
let triviaQuestionsCache: TriviaBank | null = null;

async function getTriviaQuestions(): Promise<TriviaBank> {
  if (!triviaQuestionsCache) {
    const mod = await import('./comprehensive-trivia-data.tsx');
    triviaQuestionsCache = mod.COMPREHENSIVE_TRIVIA as TriviaBank;
  }
  return triviaQuestionsCache;
}

// Get random trivia questions
app.get('/questions', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    if (!accessToken) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    // Verify user
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );
    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
    if (authError || !user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const grade = c.req.query('grade') || 'year_5';
    const subject = c.req.query('subject') || 'Mathematics';
    const count = parseInt(c.req.query('count') || '5');

    // Map subject to lowercase ID for trivia subscription check
    const subjectId = subject.toLowerCase().replace(/\s+/g, '_');

    let accessCheck: Awaited<ReturnType<typeof db.checkTriviaAccess>> | undefined;
    // Check trivia access for this subject
    try {
      accessCheck = await db.checkTriviaAccess(user.id, subjectId);

      if (!accessCheck.hasAccess) {
        // Access denied - return paywall info
        return c.json({
          error: 'Access denied',
          errorCode: 'TRIVIA_PAYWALL',
          status: accessCheck.status,
          reason: accessCheck.reason,
          message: `${subject} trivia requires subscription. ${accessCheck.reason}`,
          pricePerMonth: 3000,
          currency: 'NGN',
        }, 403);
      }

      // First time access - create subscription with free trial
      if (accessCheck.status === 'free' && accessCheck.reason?.includes('First-time')) {
        try {
          await db.getOrCreateTriviaSubscription(user.id, subjectId, subject);
        } catch (subError) {
          console.warn('Could not create trivia subscription:', subError);
          // Continue anyway - user gets access
        }
      }
    } catch (accessError) {
      // If access check fails, allow access (fail open)
      console.warn('Trivia access check error:', accessError);
    }

    const TRIVIA_QUESTIONS = await getTriviaQuestions();

    // Get questions for the specified grade and subject
    const allQuestions = (TRIVIA_QUESTIONS[grade]?.[subject] as unknown[] | undefined) || [];

    if (allQuestions.length === 0) {
      return c.json({
        error: 'No questions available for this grade and subject',
        availableGrades: Object.keys(TRIVIA_QUESTIONS),
        message: 'Please try a different combination'
      }, 404);
    }

    // Shuffle and select random questions
    const shuffled = [...allQuestions].sort(() => Math.random() - 0.5);
    const selectedQuestions = shuffled.slice(0, Math.min(count, shuffled.length));

    return c.json({ 
      questions: selectedQuestions,
      accessStatus: accessCheck?.status || 'unknown',
      expiresAt: accessCheck?.expiresAt,
      daysRemaining: accessCheck?.daysRemaining,
    });
  } catch (error) {
    console.error('Error fetching trivia questions:', error);
    return c.json({ error: 'Failed to fetch trivia questions' }, 500);
  }
});

// Submit trivia answer and get results
app.post('/submit', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    if (!accessToken) {
      console.error('Trivia submit: No access token provided');
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
    if (authError || !user) {
      console.error('Trivia submit: Auth error:', authError);
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const body = await c.req.json();
    const { answers, grade, subject, timeSpent } = body;

    console.log('Trivia submit: User:', user.id, '| Grade:', grade, '| Subject:', subject, '| Answers:', answers?.length);

    // Check trivia access before accepting submission
    const subjectId = subject.toLowerCase().replace(/\s+/g, '_');
    try {
      const accessCheck = await db.checkTriviaAccess(user.id, subjectId);
      if (!accessCheck.hasAccess) {
        return c.json({
          error: 'Access denied',
          errorCode: 'TRIVIA_PAYWALL',
          status: accessCheck.status,
          reason: accessCheck.reason,
        }, 403);
      }
    } catch (accessError) {
      console.warn('Trivia access check error on submit:', accessError);
      // Fail open - allow submission on error
    }

    // Calculate score
    let correctAnswers = 0;
    let totalXP = 0;

    answers.forEach((answer: any) => {
      if (answer.isCorrect) {
        correctAnswers++;
        totalXP += answer.xpEarned || 0;
      }
    });

    const score = (correctAnswers / answers.length) * 100;

    // Store trivia result
    const triviaResult = {
      userId: user.id,
      grade,
      subject,
      score,
      correctAnswers,
      totalQuestions: answers.length,
      xpEarned: totalXP,
      timeSpent,
      timestamp: new Date().toISOString(),
      answers
    };

    await kv.set(`trivia_result:${user.id}:${Date.now()}`, triviaResult);

    // Update user's total trivia stats
    const statsKey = `trivia_stats:${user.id}`;
    const existingStats = await kv.get(statsKey);
    
    const updatedStats = {
      totalGames: (existingStats?.totalGames || 0) + 1,
      totalXP: (existingStats?.totalXP || 0) + totalXP,
      totalCorrect: (existingStats?.totalCorrect || 0) + correctAnswers,
      totalQuestions: (existingStats?.totalQuestions || 0) + answers.length,
      averageScore: 0,
      bestScore: Math.max(existingStats?.bestScore || 0, score),
      lastPlayed: new Date().toISOString()
    };

    updatedStats.averageScore = (updatedStats.totalCorrect / updatedStats.totalQuestions) * 100;

    await kv.set(statsKey, updatedStats);

    // Update grade-specific leaderboard
    const leaderboardKey = `trivia_leaderboard:${grade}`;
    const leaderboard = await kv.get(leaderboardKey) || { entries: [] };
    
    // Find or create user entry
    let userEntry = leaderboard.entries.find((e: any) => e.userId === user.id);
    
    if (userEntry) {
      userEntry.totalXP = (userEntry.totalXP || 0) + totalXP;
      userEntry.gamesPlayed = (userEntry.gamesPlayed || 0) + 1;
      userEntry.averageScore = ((userEntry.averageScore * (userEntry.gamesPlayed - 1)) + score) / userEntry.gamesPlayed;
      userEntry.bestScore = Math.max(userEntry.bestScore || 0, score);
      userEntry.lastPlayed = new Date().toISOString();
    } else {
      // Get user profile for display
      const profileKey = `user_profile:${user.id}`;
      const profile = await kv.get(profileKey);
      
      userEntry = {
        userId: user.id,
        userName: profile?.firstName || profile?.full_name || 'Student',
        totalXP,
        gamesPlayed: 1,
        averageScore: score,
        bestScore: score,
        lastPlayed: new Date().toISOString()
      };
      leaderboard.entries.push(userEntry);
    }

    // Sort leaderboard by totalXP
    leaderboard.entries.sort((a: any, b: any) => b.totalXP - a.totalXP);
    
    // Keep top 100
    leaderboard.entries = leaderboard.entries.slice(0, 100);
    
    await kv.set(leaderboardKey, leaderboard);

    // Find user's rank
    const userRank = leaderboard.entries.findIndex((e: any) => e.userId === user.id) + 1;

    console.log('Trivia submit successful: Score:', score, '| XP:', totalXP, '| Rank:', userRank);

    return c.json({
      success: true,
      result: triviaResult,
      stats: updatedStats,
      rank: userRank,
      totalPlayers: leaderboard.entries.length
    });
  } catch (error) {
    console.error('Error submitting trivia - Full error:', error);
    console.error('Error stack:', error?.stack);
    return c.json({ error: 'Failed to submit trivia', message: error?.message }, 500);
  }
});

// Get leaderboard for a specific grade
app.get('/leaderboard/:grade', async (c) => {
  try {
    const grade = c.req.param('grade');
    const leaderboardKey = `trivia_leaderboard:${grade}`;
    const leaderboard = await kv.get(leaderboardKey) || { entries: [] };

    return c.json({
      grade,
      leaderboard: leaderboard.entries.slice(0, 50), // Top 50
      totalPlayers: leaderboard.entries.length
    });
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    return c.json({ error: 'Failed to fetch leaderboard' }, 500);
  }
});

// Get user's trivia stats
app.get('/stats', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    if (!accessToken) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
    if (authError || !user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const statsKey = `trivia_stats:${user.id}`;
    const stats = await kv.get(statsKey) || {
      totalGames: 0,
      totalXP: 0,
      totalCorrect: 0,
      totalQuestions: 0,
      averageScore: 0,
      bestScore: 0
    };

    return c.json({ stats });
  } catch (error) {
    console.error('Error fetching trivia stats:', error);
    return c.json({ error: 'Failed to fetch stats' }, 500);
  }
});

// Get available subjects for a grade - FILTERS BY STUDENT'S SELECTED SUBJECTS
app.get('/subjects/:grade', async (c) => {
  try {
    const grade = c.req.param('grade');
    const TRIVIA_QUESTIONS = await getTriviaQuestions();
    const gradeQuestions = TRIVIA_QUESTIONS[grade];

    if (!gradeQuestions) {
      return c.json({
        error: 'Grade not found',
        availableGrades: Object.keys(TRIVIA_QUESTIONS)
      }, 404);
    }

    // Get the authenticated user
    const authHeader = c.req.header('Authorization');
    if (!authHeader) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const token = authHeader.replace('Bearer ', '');
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!
    );

    // Get user from token
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) {
      return c.json({ error: 'Invalid token' }, 401);
    }

    // Get student profile with their selected subjects
    const profileKey = `profile:${user.id}`;
    const profile = await kv.get(profileKey);

    if (!profile) {
      // If no profile found, return all available subjects
      const subjects = Object.keys(gradeQuestions);
      return c.json({ grade, subjects });
    }

    // Filter subjects based on what was selected during profile creation
    const allSubjects = Object.keys(gradeQuestions);
    const studentSubjects = profile.subjects || [];

    // If student has selected subjects, filter to only show those
    // Otherwise show all available subjects for their grade
    const filteredSubjects = studentSubjects.length > 0 
      ? allSubjects.filter((subject: string) => studentSubjects.includes(subject))
      : allSubjects;

    return c.json({ 
      grade, 
      subjects: filteredSubjects,
      allSubjectsAvailable: allSubjects,
      studentSelectedSubjects: studentSubjects
    });
  } catch (error) {
    console.error('Error fetching subjects:', error);
    return c.json({ error: 'Failed to fetch subjects' }, 500);
  }
});

export default app;
