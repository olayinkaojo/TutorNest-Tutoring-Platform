import { Hono } from 'npm:hono@4';
import { createClient } from 'jsr:@supabase/supabase-js@2';
import * as kv from './kv_store.tsx';
import * as db from './db.tsx';
import { getUserStats, updateUserStats, checkAndAwardAchievements } from './achievement-service.tsx';

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

// This used to look up `user_profile:${userId}` / `profile:${userId}` —
// neither key is ever written anywhere in this codebase (every other
// profile write uses `user:${userId}` for a direct account or
// `profile_${role}_${userId}` for a specific role's data — see
// role-management-routes.tsx). Both lookups always missed, so the
// leaderboard could never show a real student's name (always fell back to
// "Student") and the per-student subject filter on /subjects/:grade was
// dead code that always returned every subject regardless of what the
// student actually picked.
async function resolveStudentProfile(userId: string): Promise<any | null> {
  const direct = await kv.get(`user:${userId}`);
  if (direct) return direct;
  const asChild = await kv.get(`child:${userId}`);
  if (asChild) return asChild;
  const asStudentRole = await kv.get(`profile_student_${userId}`);
  if (asStudentRole) return asStudentRole;
  return await db.getProfile(userId).catch(() => null);
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

    // One-time quiz session: /submit must present this id and can only use
    // it once, checked against exactly the question ids issued here. This
    // is what makes the server-side scoring in /submit actually mean
    // something — without it, /submit could be called directly and
    // repeatedly with any questionId/selectedAnswer pairs to farm points
    // with no need to ever have "played" anything.
    const quizSessionId = crypto.randomUUID();
    await kv.set(`trivia_session:${quizSessionId}`, {
      userId: user.id,
      grade,
      subject,
      questionIds: (selectedQuestions as any[]).map((q: any) => q.id),
      used: false,
      createdAt: new Date().toISOString(),
    });

    return c.json({
      questions: selectedQuestions,
      quizSessionId,
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
    const { answers, grade, subject, timeSpent, quizSessionId } = body;

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

    // This used to just trust the client's own `isCorrect`/`xpEarned` on
    // each answer — GET /questions sends the full question object
    // (correctAnswer included) to the browser for immediate feedback, so
    // anyone with devtools (or just reading the network response) could
    // submit any isCorrect/xpEarned values they liked and farm unlimited
    // XP/leaderboard rank/badges without answering anything. The quiz
    // session from /questions ties this submission to a specific,
    // previously-issued, not-yet-used set of question ids, and every
    // answer is re-scored here against the real question bank using only
    // questionId + selectedAnswer — the client's isCorrect/xpEarned/
    // correctAnswer fields are never read.
    if (!quizSessionId) {
      return c.json({ error: 'Missing quizSessionId' }, 400);
    }
    const quizSession = await kv.get(`trivia_session:${quizSessionId}`) as any;
    if (!quizSession || quizSession.used || quizSession.userId !== user.id || quizSession.grade !== grade || quizSession.subject !== subject) {
      return c.json({ error: 'This quiz session is invalid or has already been submitted' }, 400);
    }
    const sessionQuestionIds = new Set(quizSession.questionIds as string[]);
    const seenQuestionIds = new Set<string>();
    for (const a of answers) {
      if (!sessionQuestionIds.has(a.questionId) || seenQuestionIds.has(a.questionId)) {
        return c.json({ error: 'Submission does not match the questions issued for this session' }, 400);
      }
      seenQuestionIds.add(a.questionId);
    }
    await kv.set(`trivia_session:${quizSessionId}`, { ...quizSession, used: true, submittedAt: new Date().toISOString() });

    const TRIVIA_QUESTIONS = await getTriviaQuestions();
    const realQuestions = (TRIVIA_QUESTIONS[grade]?.[subject] as any[] | undefined) || [];
    const realQuestionsById = new Map(realQuestions.map((q: any) => [q.id, q]));

    // Calculate score — entirely from the real answer key, never the client.
    let correctAnswers = 0;
    let totalXP = 0;
    const scoredAnswers = answers.map((answer: any) => {
      const realQuestion = realQuestionsById.get(answer.questionId);
      const isCorrect = !!realQuestion && answer.selectedAnswer === realQuestion.correctAnswer;
      const xpEarned = isCorrect ? (realQuestion.xpReward || 0) : 0;
      if (isCorrect) {
        correctAnswers++;
        totalXP += xpEarned;
      }
      return {
        questionId: answer.questionId,
        selectedAnswer: answer.selectedAnswer,
        correctAnswer: realQuestion?.correctAnswer,
        isCorrect,
        xpEarned,
      };
    });
    const answersForStorage = scoredAnswers;

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
      answers: answersForStorage
    };

    await kv.set(`trivia_result:${user.id}:${Date.now()}`, triviaResult);

    // Updates trivia_stats and trivia_leaderboard atomically in one
    // Postgres function call (see migration
    // 20261113000000_atomic_tutor_balance_and_trivia.sql) instead of the
    // old read-KV -> mutate-in-JS -> write-KV sequence for each — two
    // concurrent submissions from the same user (double-click, two tabs, a
    // retried request) used to be able to both read the same starting
    // totals and have the second write clobber the first's update,
    // silently losing XP/games/correct-answer counts.
    const displayName =
      (await resolveStudentProfile(user.id).catch(() => null))?.firstName ||
      'Student';
    const resultRow = await db.recordTriviaResult({
      userId: user.id,
      userName: displayName,
      grade,
      correct: correctAnswers,
      totalQuestions: answers.length,
      xp: totalXP,
      score,
    });

    const updatedStats = {
      totalGames: resultRow.totalGames,
      totalXP: resultRow.totalXP,
      totalCorrect: resultRow.totalCorrect,
      totalQuestions: resultRow.totalQuestions,
      averageScore: resultRow.totalQuestions > 0 ? (resultRow.totalCorrect / resultRow.totalQuestions) * 100 : 0,
      bestScore: resultRow.bestScore,
      lastPlayed: new Date().toISOString(),
    };
    const userRank = resultRow.rank;
    const totalPlayers = resultRow.totalPlayers;

    console.log('Trivia submit successful: Score:', score, '| XP:', totalXP, '| Rank:', userRank);

    // Feed the shared achievement system (see achievement-service.tsx) —
    // without this, XP earned here never reached user:<id>:stats, so
    // checkAndAwardAchievements had nothing real to check against and the
    // Achievements tab could never show a badge earned from playing trivia.
    let newBadges: string[] = [];
    try {
      const achievementStats = await getUserStats(user.id);
      await updateUserStats(user.id, { totalXP: (achievementStats.totalXP || 0) + totalXP });
      newBadges = await checkAndAwardAchievements(user.id);
    } catch (err) {
      console.warn('Trivia submit: achievement update failed (non-fatal):', err);
    }

    return c.json({
      success: true,
      result: triviaResult,
      stats: updatedStats,
      rank: userRank,
      totalPlayers,
      newBadges,
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
    const [entries, totalPlayers] = await Promise.all([
      db.getTriviaLeaderboard(grade, 50),
      db.getTriviaLeaderboardCount(grade),
    ]);

    return c.json({
      grade,
      leaderboard: entries,
      totalPlayers,
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

    const stats = await db.getTriviaStats(user.id) || {
      totalGames: 0,
      totalXP: 0,
      totalCorrect: 0,
      totalQuestions: 0,
      averageScore: 0,
      bestScore: 0,
      lastPlayed: null,
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
    const profile = await resolveStudentProfile(user.id);

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
