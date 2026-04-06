import * as kv from './kv_store.tsx';

export type AssignmentType = 'homework' | 'quiz' | 'test';
export type GradeShowOption = 'after-due' | 'never' | 'immediately';

export interface Assignment {
  id: string;
  teacherId: string;
  classId: string;
  name: string;
  description?: string;
  type: AssignmentType;
  questionIds: string[];
  dueDate: string;
  releaseDate: string;
  lockDate?: string;
  attemptLimit: number; // 1, 3, or unlimited (999)
  showCorrectAnswers: GradeShowOption;
  gradeWeight: number; // 0-100, percentage toward class grade
  totalPoints: number;
  autoGrade: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface StudentResponse {
  id: string;
  assignmentId: string;
  studentId: string;
  attempt: number;
  answers: { [questionId: string]: string | number | boolean };
  score?: number;
  maxScore: number;
  graded: boolean;
  autoGraded: boolean;
  manualNotes?: string;
  submittedAt: string;
  gradedAt?: string;
}

export async function createAssignment(
  teacherId: string,
  classId: string,
  data: {
    name: string;
    description?: string;
    type: AssignmentType;
    questionIds: string[];
    dueDate: string;
    releaseDate: string;
    lockDate?: string;
    attemptLimit?: number;
    showCorrectAnswers?: GradeShowOption;
    gradeWeight?: number;
    totalPoints: number;
    autoGrade?: boolean;
  }
): Promise<Assignment> {
  const assignmentId = `assignment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  const assignment: Assignment = {
    id: assignmentId,
    teacherId,
    classId,
    name: data.name,
    description: data.description,
    type: data.type,
    questionIds: data.questionIds,
    dueDate: data.dueDate,
    releaseDate: data.releaseDate,
    lockDate: data.lockDate,
    attemptLimit: data.attemptLimit || 1,
    showCorrectAnswers: data.showCorrectAnswers || 'after-due',
    gradeWeight: data.gradeWeight || 10,
    totalPoints: data.totalPoints,
    autoGrade: data.autoGrade ?? true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  await kv.set(`assignment:${assignmentId}`, assignment);
  await addAssignmentToClass(teacherId, classId, assignmentId);

  return assignment;
}

export async function getAssignment(assignmentId: string): Promise<Assignment | null> {
  return await kv.get(`assignment:${assignmentId}`);
}

export async function updateAssignment(
  assignmentId: string,
  data: Partial<Assignment>
): Promise<Assignment> {
  const existing = await getAssignment(assignmentId);
  if (!existing) throw new Error('Assignment not found');

  const updated: Assignment = {
    ...existing,
    ...data,
    updatedAt: new Date().toISOString(),
  };

  await kv.set(`assignment:${assignmentId}`, updated);
  return updated;
}

export async function deleteAssignment(assignmentId: string): Promise<void> {
  const assignment = await getAssignment(assignmentId);
  if (!assignment) throw new Error('Assignment not found');

  await removeAssignmentFromClass(assignment.teacherId, assignment.classId, assignmentId);
  await kv.delete(`assignment:${assignmentId}`);
}

export async function addAssignmentToClass(
  teacherId: string,
  classId: string,
  assignmentId: string
): Promise<void> {
  const key = `teacher:${teacherId}:class:${classId}:assignments`;
  const assignments = (await kv.get(key)) || [];
  if (!assignments.includes(assignmentId)) {
    assignments.push(assignmentId);
    await kv.set(key, assignments);
  }
}

export async function removeAssignmentFromClass(
  teacherId: string,
  classId: string,
  assignmentId: string
): Promise<void> {
  const key = `teacher:${teacherId}:class:${classId}:assignments`;
  const assignments = (await kv.get(key)) || [];
  await kv.set(
    key,
    assignments.filter((a: string) => a !== assignmentId)
  );
}

export async function getClassAssignments(
  teacherId: string,
  classId: string
): Promise<Assignment[]> {
  const assignmentIds = (await kv.get(`teacher:${teacherId}:class:${classId}:assignments`)) || [];
  const assignments: Assignment[] = [];

  for (const assignmentId of assignmentIds) {
    const assignment = await getAssignment(assignmentId);
    if (assignment) {
      assignments.push(assignment);
    }
  }

  return assignments;
}

export async function submitResponse(
  assignmentId: string,
  studentId: string,
  answers: { [questionId: string]: string | number | boolean },
  maxScore: number
): Promise<StudentResponse> {
  const assignment = await getAssignment(assignmentId);
  if (!assignment) throw new Error('Assignment not found');

  // Check if student can attempt
  const attemptCount = await getStudentAttemptCount(assignmentId, studentId);
  if (attemptCount >= assignment.attemptLimit && assignment.attemptLimit !== 999) {
    throw new Error('Attempt limit exceeded');
  }

  // Check if assignment is open
  const now = new Date();
  const releaseDate = new Date(assignment.releaseDate);
  const dueDate = new Date(assignment.dueDate);
  const lockDate = assignment.lockDate ? new Date(assignment.lockDate) : dueDate;

  if (now < releaseDate) throw new Error('Assignment not yet available');
  if (now > lockDate) throw new Error('Assignment is locked');

  const responseId = `response_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const response: StudentResponse = {
    id: responseId,
    assignmentId,
    studentId,
    attempt: attemptCount + 1,
    answers,
    maxScore,
    graded: false,
    autoGraded: false,
    submittedAt: new Date().toISOString(),
  };

  await kv.set(`response:${responseId}`, response);
  await addResponseToStudent(assignmentId, studentId, responseId);

  // Auto-grade if enabled
  if (assignment.autoGrade) {
    await autoGradeResponse(responseId, assignment.questionIds);
  }

  return response;
}

export async function getResponse(responseId: string): Promise<StudentResponse | null> {
  return await kv.get(`response:${responseId}`);
}

export async function updateResponse(
  responseId: string,
  data: Partial<StudentResponse>
): Promise<StudentResponse> {
  const existing = await getResponse(responseId);
  if (!existing) throw new Error('Response not found');

  const updated: StudentResponse = {
    ...existing,
    ...data,
  };

  await kv.set(`response:${responseId}`, updated);
  return updated;
}

export async function gradeResponse(
  responseId: string,
  score: number,
  notes?: string
): Promise<StudentResponse> {
  return await updateResponse(responseId, {
    score,
    graded: true,
    manualNotes: notes,
    gradedAt: new Date().toISOString(),
  });
}

export async function getStudentResponses(
  assignmentId: string,
  studentId: string
): Promise<StudentResponse[]> {
  const responseIds =
    (await kv.get(`assignment:${assignmentId}:student:${studentId}:responses`)) || [];
  const responses: StudentResponse[] = [];

  for (const responseId of responseIds) {
    const response = await getResponse(responseId);
    if (response) {
      responses.push(response);
    }
  }

  return responses.sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());
}

export async function getAssignmentResponses(assignmentId: string): Promise<StudentResponse[]> {
  const responseIds = (await kv.get(`assignment:${assignmentId}:responses`)) || [];
  const responses: StudentResponse[] = [];

  for (const responseId of responseIds) {
    const response = await getResponse(responseId);
    if (response) {
      responses.push(response);
    }
  }

  return responses;
}

export async function getStudentAttemptCount(assignmentId: string, studentId: string): Promise<number> {
  const responses = await getStudentResponses(assignmentId, studentId);
  return responses.length;
}

export async function addResponseToStudent(
  assignmentId: string,
  studentId: string,
  responseId: string
): Promise<void> {
  const key = `assignment:${assignmentId}:student:${studentId}:responses`;
  const responses = (await kv.get(key)) || [];
  responses.push(responseId);
  await kv.set(key, responses);

  // Also add to global assignment responses
  const globalKey = `assignment:${assignmentId}:responses`;
  const globalResponses = (await kv.get(globalKey)) || [];
  globalResponses.push(responseId);
  await kv.set(globalKey, globalResponses);
}

export async function autoGradeResponse(
  responseId: string,
  questionIds: string[]
): Promise<StudentResponse> {
  const response = await getResponse(responseId);
  if (!response) throw new Error('Response not found');

  // Import question service (would need to pass in or restructure)
  // For now, assume questions are available
  let score = 0;
  const { getQuestion } = await import('./question-bank-service.tsx');

  for (const questionId of questionIds) {
    const question = await getQuestion(questionId);
    if (!question) continue;

    const studentAnswer = response.answers[questionId];
    if (studentAnswer === question.correctAnswer) {
      score += question.points;
    }
  }

  return await updateResponse(responseId, {
    score,
    graded: true,
    autoGraded: true,
    gradedAt: new Date().toISOString(),
  });
}

export async function getAssignmentStats(assignmentId: string): Promise<{
  totalSubmissions: number;
  averageScore: number;
  highestScore: number;
  lowestScore: number;
  submissionRate: number;
}> {
  const responses = await getAssignmentResponses(assignmentId);

  if (responses.length === 0) {
    return {
      totalSubmissions: 0,
      averageScore: 0,
      highestScore: 0,
      lowestScore: 0,
      submissionRate: 0,
    };
  }

  const scores = responses.filter((r) => r.graded && r.score !== undefined).map((r) => r.score || 0);

  return {
    totalSubmissions: responses.length,
    averageScore: scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0,
    highestScore: scores.length > 0 ? Math.max(...scores) : 0,
    lowestScore: scores.length > 0 ? Math.min(...scores) : 0,
    submissionRate: (responses.length / responses.length) * 100, // Will update with student count
  };
}
