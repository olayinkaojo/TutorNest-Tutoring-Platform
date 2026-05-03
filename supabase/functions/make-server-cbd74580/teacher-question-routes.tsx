import { Hono } from 'npm:hono@4';
import {
  createQuestion,
  getQuestion,
  updateQuestion,
  deleteQuestion,
  getClassQuestions,
  searchQuestions,
  incrementQuestionUsage,
  bulkImportQuestions,
  getDifficultyDistribution,
  getTypeDistribution,
} from './question-bank-service.tsx';
import {
  createAssignment,
  getAssignment,
  updateAssignment,
  deleteAssignment,
  getClassAssignments,
  submitResponse,
  getStudentResponses,
  getAssignmentResponses,
  gradeResponse,
  getAssignmentStats,
} from './assignment-service.tsx';

export const teacherQuestionRoutes = new Hono();

// ========== QUESTION ENDPOINTS ==========

teacherQuestionRoutes.post('/questions', async (c) => {
  try {
    const userId = c.req.header('X-User-Id');
    if (!userId) return c.json({ error: 'Unauthorized' }, 401);

    const { classId, ...questionData } = await c.req.json();
    if (!classId) return c.json({ error: 'classId required' }, 400);

    const question = await createQuestion(userId, classId, questionData);
    return c.json({ success: true, question });
  } catch (error) {
    return c.json({ error: error.message }, 400);
  }
});

teacherQuestionRoutes.get('/questions/:classId', async (c) => {
  try {
    const userId = c.req.header('X-User-Id');
    if (!userId) return c.json({ error: 'Unauthorized' }, 401);

    const classId = c.req.param('classId');
    const questions = await getClassQuestions(userId, classId);

    return c.json({ questions });
  } catch (error) {
    return c.json({ error: error.message }, 400);
  }
});

teacherQuestionRoutes.get('/questions/:classId/search', async (c) => {
  try {
    const userId = c.req.header('X-User-Id');
    if (!userId) return c.json({ error: 'Unauthorized' }, 401);

    const classId = c.req.param('classId');
    const topic = c.req.query('topic');
    const difficulty = c.req.query('difficulty') ? parseInt(c.req.query('difficulty') as string) : undefined;
    const type = c.req.query('type');

    const questions = await searchQuestions(userId, classId, {
      topic,
      difficulty,
      type: type as any,
    });

    return c.json({ questions });
  } catch (error) {
    return c.json({ error: error.message }, 400);
  }
});

teacherQuestionRoutes.put('/questions/:questionId', async (c) => {
  try {
    const userId = c.req.header('X-User-Id');
    if (!userId) return c.json({ error: 'Unauthorized' }, 401);

    const questionId = c.req.param('questionId');
    const question = await getQuestion(questionId);
    if (!question) return c.json({ error: 'Question not found' }, 404);
    if (question.teacherId !== userId) return c.json({ error: 'Unauthorized' }, 403);

    const data = await c.req.json();
    const updated = await updateQuestion(questionId, data);

    return c.json({ success: true, question: updated });
  } catch (error) {
    return c.json({ error: error.message }, 400);
  }
});

teacherQuestionRoutes.delete('/questions/:questionId', async (c) => {
  try {
    const userId = c.req.header('X-User-Id');
    if (!userId) return c.json({ error: 'Unauthorized' }, 401);

    const questionId = c.req.param('questionId');
    const question = await getQuestion(questionId);
    if (!question) return c.json({ error: 'Question not found' }, 404);
    if (question.teacherId !== userId) return c.json({ error: 'Unauthorized' }, 403);

    await deleteQuestion(questionId);
    return c.json({ success: true });
  } catch (error) {
    return c.json({ error: error.message }, 400);
  }
});

teacherQuestionRoutes.post('/questions/:classId/bulk-import', async (c) => {
  try {
    const userId = c.req.header('X-User-Id');
    if (!userId) return c.json({ error: 'Unauthorized' }, 401);

    const classId = c.req.param('classId');
    const { csvData } = await c.req.json();

    const questions = await bulkImportQuestions(userId, classId, csvData);

    return c.json({ success: true, imported: questions.length, questions });
  } catch (error) {
    return c.json({ error: error.message }, 400);
  }
});

teacherQuestionRoutes.get('/questions/:classId/stats', async (c) => {
  try {
    const userId = c.req.header('X-User-Id');
    if (!userId) return c.json({ error: 'Unauthorized' }, 401);

    const classId = c.req.param('classId');

    const difficultyDist = await getDifficultyDistribution(userId, classId);
    const typeDist = await getTypeDistribution(userId, classId);

    return c.json({
      difficultyDistribution: difficultyDist,
      typeDistribution: typeDist,
    });
  } catch (error) {
    return c.json({ error: error.message }, 400);
  }
});

// ========== ASSIGNMENT ENDPOINTS ==========

teacherQuestionRoutes.post('/assignments', async (c) => {
  try {
    const userId = c.req.header('X-User-Id');
    if (!userId) return c.json({ error: 'Unauthorized' }, 401);

    const { classId, ...assignmentData } = await c.req.json();
    if (!classId) return c.json({ error: 'classId required' }, 400);

    const assignment = await createAssignment(userId, classId, assignmentData);
    return c.json({ success: true, assignment });
  } catch (error) {
    return c.json({ error: error.message }, 400);
  }
});

teacherQuestionRoutes.get('/assignments/:classId', async (c) => {
  try {
    const userId = c.req.header('X-User-Id');
    if (!userId) return c.json({ error: 'Unauthorized' }, 401);

    const classId = c.req.param('classId');
    const assignments = await getClassAssignments(userId, classId);

    return c.json({ assignments });
  } catch (error) {
    return c.json({ error: error.message }, 400);
  }
});

teacherQuestionRoutes.put('/assignments/:assignmentId', async (c) => {
  try {
    const userId = c.req.header('X-User-Id');
    if (!userId) return c.json({ error: 'Unauthorized' }, 401);

    const assignmentId = c.req.param('assignmentId');
    const assignment = await getAssignment(assignmentId);
    if (!assignment) return c.json({ error: 'Assignment not found' }, 404);
    if (assignment.teacherId !== userId) return c.json({ error: 'Unauthorized' }, 403);

    const data = await c.req.json();
    const updated = await updateAssignment(assignmentId, data);

    return c.json({ success: true, assignment: updated });
  } catch (error) {
    return c.json({ error: error.message }, 400);
  }
});

teacherQuestionRoutes.delete('/assignments/:assignmentId', async (c) => {
  try {
    const userId = c.req.header('X-User-Id');
    if (!userId) return c.json({ error: 'Unauthorized' }, 401);

    const assignmentId = c.req.param('assignmentId');
    const assignment = await getAssignment(assignmentId);
    if (!assignment) return c.json({ error: 'Assignment not found' }, 404);
    if (assignment.teacherId !== userId) return c.json({ error: 'Unauthorized' }, 403);

    await deleteAssignment(assignmentId);
    return c.json({ success: true });
  } catch (error) {
    return c.json({ error: error.message }, 400);
  }
});

teacherQuestionRoutes.get('/assignments/:assignmentId/responses', async (c) => {
  try {
    const userId = c.req.header('X-User-Id');
    if (!userId) return c.json({ error: 'Unauthorized' }, 401);

    const assignmentId = c.req.param('assignmentId');
    const assignment = await getAssignment(assignmentId);
    if (!assignment) return c.json({ error: 'Assignment not found' }, 404);
    if (assignment.teacherId !== userId) return c.json({ error: 'Unauthorized' }, 403);

    const responses = await getAssignmentResponses(assignmentId);
    return c.json({ responses });
  } catch (error) {
    return c.json({ error: error.message }, 400);
  }
});

teacherQuestionRoutes.post('/assignments/:assignmentId/grade', async (c) => {
  try {
    const userId = c.req.header('X-User-Id');
    if (!userId) return c.json({ error: 'Unauthorized' }, 401);

    const assignmentId = c.req.param('assignmentId');
    const assignment = await getAssignment(assignmentId);
    if (!assignment) return c.json({ error: 'Assignment not found' }, 404);
    if (assignment.teacherId !== userId) return c.json({ error: 'Unauthorized' }, 403);

    const { responseId, score, notes } = await c.req.json();
    const graded = await gradeResponse(responseId, score, notes);

    return c.json({ success: true, response: graded });
  } catch (error) {
    return c.json({ error: error.message }, 400);
  }
});

teacherQuestionRoutes.get('/assignments/:assignmentId/stats', async (c) => {
  try {
    const userId = c.req.header('X-User-Id');
    if (!userId) return c.json({ error: 'Unauthorized' }, 401);

    const assignmentId = c.req.param('assignmentId');
    const assignment = await getAssignment(assignmentId);
    if (!assignment) return c.json({ error: 'Assignment not found' }, 404);
    if (assignment.teacherId !== userId) return c.json({ error: 'Unauthorized' }, 403);

    const stats = await getAssignmentStats(assignmentId);
    return c.json({ stats });
  } catch (error) {
    return c.json({ error: error.message }, 400);
  }
});

// ========== STUDENT ENDPOINTS (PUBLIC) ==========

teacherQuestionRoutes.post('/student/submit-response', async (c) => {
  try {
    const userId = c.req.header('X-User-Id');
    if (!userId) return c.json({ error: 'Unauthorized' }, 401);

    const { assignmentId, answers, maxScore } = await c.req.json();
    const response = await submitResponse(assignmentId, userId, answers, maxScore);

    return c.json({ success: true, response });
  } catch (error) {
    return c.json({ error: error.message }, 400);
  }
});

teacherQuestionRoutes.get('/student/responses/:assignmentId', async (c) => {
  try {
    const userId = c.req.header('X-User-Id');
    if (!userId) return c.json({ error: 'Unauthorized' }, 401);

    const assignmentId = c.req.param('assignmentId');
    const responses = await getStudentResponses(assignmentId, userId);

    return c.json({ responses });
  } catch (error) {
    return c.json({ error: error.message }, 400);
  }
});
