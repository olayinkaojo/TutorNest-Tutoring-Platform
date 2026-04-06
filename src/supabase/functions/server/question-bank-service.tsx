import * as kv from './kv_store.tsx';

export type QuestionType = 'multiple-choice' | 'true-false' | 'short-answer' | 'fill-blank';

export interface Question {
  id: string;
  teacherId: string;
  classId: string;
  question: string;
  type: QuestionType;
  difficulty: 1 | 2 | 3 | 4 | 5;
  topic?: string;
  options?: string[]; // For MC and T/F
  correctAnswer: string | number; // Index for MC, boolean for T/F, string for short answer
  timeLimit?: number; // In seconds
  points: number;
  usageCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface QuestionBank {
  id: string;
  teacherId: string;
  classId?: string;
  name: string;
  description?: string;
  questionCount: number;
  createdAt: string;
  updatedAt: string;
}

export async function createQuestion(
  teacherId: string,
  classId: string,
  data: {
    question: string;
    type: QuestionType;
    difficulty: 1 | 2 | 3 | 4 | 5;
    topic?: string;
    options?: string[];
    correctAnswer: string | number;
    timeLimit?: number;
    points: number;
  }
): Promise<Question> {
  const questionId = `question_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  const question: Question = {
    id: questionId,
    teacherId,
    classId,
    question: data.question,
    type: data.type,
    difficulty: data.difficulty,
    topic: data.topic,
    options: data.options,
    correctAnswer: data.correctAnswer,
    timeLimit: data.timeLimit,
    points: data.points || 1,
    usageCount: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  await kv.set(`question:${questionId}`, question);
  await addQuestionToBank(teacherId, classId, questionId);

  return question;
}

export async function getQuestion(questionId: string): Promise<Question | null> {
  return await kv.get(`question:${questionId}`);
}

export async function updateQuestion(questionId: string, data: Partial<Question>): Promise<Question> {
  const existing = await getQuestion(questionId);
  if (!existing) throw new Error('Question not found');

  const updated: Question = {
    ...existing,
    ...data,
    updatedAt: new Date().toISOString(),
  };

  await kv.set(`question:${questionId}`, updated);
  return updated;
}

export async function deleteQuestion(questionId: string): Promise<void> {
  const question = await getQuestion(questionId);
  if (!question) throw new Error('Question not found');

  await removeQuestionFromBank(question.teacherId, question.classId, questionId);
  await kv.delete(`question:${questionId}`);
}

export async function addQuestionToBank(
  teacherId: string,
  classId: string,
  questionId: string
): Promise<void> {
  const key = `teacher:${teacherId}:class:${classId}:questions`;
  const questions = (await kv.get(key)) || [];
  if (!questions.includes(questionId)) {
    questions.push(questionId);
    await kv.set(key, questions);
  }
}

export async function removeQuestionFromBank(
  teacherId: string,
  classId: string,
  questionId: string
): Promise<void> {
  const key = `teacher:${teacherId}:class:${classId}:questions`;
  const questions = (await kv.get(key)) || [];
  await kv.set(
    key,
    questions.filter((q: string) => q !== questionId)
  );
}

export async function getClassQuestions(
  teacherId: string,
  classId: string
): Promise<Question[]> {
  const questionIds = (await kv.get(`teacher:${teacherId}:class:${classId}:questions`)) || [];
  const questions: Question[] = [];

  for (const questionId of questionIds) {
    const question = await getQuestion(questionId);
    if (question) {
      questions.push(question);
    }
  }

  return questions;
}

export async function searchQuestions(
  teacherId: string,
  classId: string,
  filters?: {
    topic?: string;
    difficulty?: number;
    type?: QuestionType;
  }
): Promise<Question[]> {
  let questions = await getClassQuestions(teacherId, classId);

  if (filters?.topic) {
    questions = questions.filter((q) => q.topic === filters.topic);
  }
  if (filters?.difficulty) {
    questions = questions.filter((q) => q.difficulty === filters.difficulty);
  }
  if (filters?.type) {
    questions = questions.filter((q) => q.type === filters.type);
  }

  return questions;
}

export async function incrementQuestionUsage(questionId: string): Promise<void> {
  const question = await getQuestion(questionId);
  if (!question) throw new Error('Question not found');

  await updateQuestion(questionId, {
    usageCount: question.usageCount + 1,
  });
}

export async function bulkImportQuestions(
  teacherId: string,
  classId: string,
  csvData: string
): Promise<Question[]> {
  const lines = csvData.split('\n').filter((line) => line.trim());
  const questions: Question[] = [];

  // Expected CSV format: question,type,difficulty,correctAnswer,options,points,topic
  for (const line of lines) {
    const parts = line.split(',').map((p) => p.trim());
    if (parts.length < 5) continue;

    try {
      const question = await createQuestion(teacherId, classId, {
        question: parts[0],
        type: parts[1] as QuestionType,
        difficulty: parseInt(parts[2]) as 1 | 2 | 3 | 4 | 5,
        correctAnswer: parts[3],
        options: parts[4] ? parts[4].split('|') : undefined,
        points: parseInt(parts[5]) || 1,
        topic: parts[6] || undefined,
      });
      questions.push(question);
    } catch (error) {
      console.error('Error importing question:', error);
    }
  }

  return questions;
}

export async function getDifficultyDistribution(
  teacherId: string,
  classId: string
): Promise<{ [key: number]: number }> {
  const questions = await getClassQuestions(teacherId, classId);
  const distribution: { [key: number]: number } = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };

  for (const question of questions) {
    distribution[question.difficulty]++;
  }

  return distribution;
}

export async function getTypeDistribution(
  teacherId: string,
  classId: string
): Promise<{ [key in QuestionType]: number }> {
  const questions = await getClassQuestions(teacherId, classId);
  const distribution: { [key in QuestionType]: number } = {
    'multiple-choice': 0,
    'true-false': 0,
    'short-answer': 0,
    'fill-blank': 0,
  };

  for (const question of questions) {
    distribution[question.type]++;
  }

  return distribution;
}
