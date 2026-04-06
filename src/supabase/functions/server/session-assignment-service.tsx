import * as kv from './kv_store.tsx';

export type AssignmentType = 'pre-work' | 'session' | 'homework' | 'normal';

export interface SessionAssignment {
  assignmentId: string;
  sessionId: string;
  type: AssignmentType;
  linkedAt: string;
  linkedBy: string; // tutor userId
  workflowOrder: number; // 1=pre-work, 2=session, 3=homework
}

export interface WorkflowStatus {
  sessionId: string;
  preWorkAssignmentId?: string;
  preWorkCompleted: boolean;
  preWorkSubmittedAt?: string;
  sessionWorkAssignmentId?: string;
  sessionInProgress: boolean;
  sessionStartedAt?: string;
  sessionEndedAt?: string;
  homeworkAssignmentId?: string;
  homeworkCompleted: boolean;
  homeworkSubmittedAt?: string;
  completionPercentage: number; // 0-100
}

export interface StudentWorkflowProgress {
  sessionId: string;
  studentId: string;
  preWorkStatus: 'pending' | 'submitted' | 'reviewed';
  sessionStatus: 'pending' | 'attended' | 'completed';
  homeworkStatus: 'pending' | 'submitted' | 'graded';
  overallProgress: number; // 0-100
}

// Link an assignment to a specific session workflow stage
export async function linkAssignmentToSession(
  assignmentId: string,
  sessionId: string,
  type: AssignmentType,
  tutorId: string
): Promise<SessionAssignment> {
  // Validate session exists
  const session = await kv.get(`session:${sessionId}`);
  if (!session) {
    throw new Error('Session not found');
  }

  // Validate assignment exists
  const assignment = await kv.get(`assignment:${assignmentId}`);
  if (!assignment) {
    throw new Error('Assignment not found');
  }

  // Prevent duplicate links for same type
  const existingLinks = (await kv.get(`session:${sessionId}:assignments`)) || [];
  const alreadyLinked = existingLinks.find(
    (link: any) => link.type === type && link.linkedAt
  );

  if (alreadyLinked && type !== 'normal') {
    throw new Error(`${type} already linked to this session`);
  }

  const workflowOrder = type === 'pre-work' ? 1 : type === 'session' ? 2 : type === 'homework' ? 3 : 0;

  const link: SessionAssignment = {
    assignmentId,
    sessionId,
    type,
    linkedAt: new Date().toISOString(),
    linkedBy: tutorId,
    workflowOrder,
  };

  // Add to session's assignment links
  existingLinks.push(link);
  await kv.set(`session:${sessionId}:assignments`, existingLinks);

  // Track in assignment as well
  const assignmentSessions = (await kv.get(`assignment:${assignmentId}:sessions`)) || [];
  assignmentSessions.push({ sessionId, type, linkedAt: link.linkedAt });
  await kv.set(`assignment:${assignmentId}:sessions`, assignmentSessions);

  // Create workflow status if first link
  const workflowKey = `session:${sessionId}:workflow-status`;
  let workflow = await kv.get(workflowKey);
  if (!workflow) {
    workflow = {
      sessionId,
      preWorkCompleted: false,
      sessionInProgress: false,
      homeworkCompleted: false,
      completionPercentage: 0,
    };
  }

  if (type === 'pre-work') workflow.preWorkAssignmentId = assignmentId;
  if (type === 'session') workflow.sessionWorkAssignmentId = assignmentId;
  if (type === 'homework') workflow.homeworkAssignmentId = assignmentId;

  await kv.set(workflowKey, workflow);

  return link;
}

// Remove assignment link from session
export async function unlinkAssignmentFromSession(
  assignmentId: string,
  sessionId: string
): Promise<void> {
  const links = (await kv.get(`session:${sessionId}:assignments`)) || [];
  const filtered = links.filter((link: any) => link.assignmentId !== assignmentId);

  await kv.set(`session:${sessionId}:assignments`, filtered);

  // Remove from assignment tracking
  const assignmentSessions = (await kv.get(`assignment:${assignmentId}:sessions`)) || [];
  const filteredSessions = assignmentSessions.filter((s: any) => s.sessionId !== sessionId);
  await kv.set(`assignment:${assignmentId}:sessions`, filteredSessions);
}

// Get all assignments linked to a session
export async function getSessionAssignments(
  sessionId: string,
  type?: AssignmentType
): Promise<SessionAssignment[]> {
  const links = (await kv.get(`session:${sessionId}:assignments`)) || [];

  if (type) {
    return links.filter((link: any) => link.type === type);
  }

  return links;
}

// Get full workflow for a session (pre → session → homework)
export async function getSessionWorkflow(sessionId: string): Promise<WorkflowStatus> {
  const workflowKey = `session:${sessionId}:workflow-status`;
  let workflow = await kv.get(workflowKey);

  if (!workflow) {
    workflow = {
      sessionId,
      preWorkCompleted: false,
      sessionInProgress: false,
      homeworkCompleted: false,
      completionPercentage: 0,
    };
  }

  // Calculate completion percentage
  let completed = 0;
  if (workflow.preWorkCompleted) completed++;
  if (workflow.sessionInProgress || workflow.sessionEndedAt) completed++;
  if (workflow.homeworkCompleted) completed++;

  workflow.completionPercentage = Math.floor((completed / 3) * 100);

  await kv.set(workflowKey, workflow);
  return workflow;
}

// Record student submission for assignment in session context
export async function recordWorkflowSubmission(
  sessionId: string,
  studentId: string,
  assignmentId: string,
  type: AssignmentType,
  responseData: any
): Promise<void> {
  // Get the link to confirm it's part of this session
  const links = await getSessionAssignments(sessionId, type);
  const link = links.find((l: any) => l.assignmentId === assignmentId);

  if (!link) {
    throw new Error('Assignment not linked to this session');
  }

  // Store submission with session context
  const submissionKey = `session:${sessionId}:student:${studentId}:submission:${type}`;
  const submission = {
    assignmentId,
    studentId,
    sessionId,
    type,
    submittedAt: new Date().toISOString(),
    responseId: responseData.id || `response:${assignmentId}:${studentId}:${Date.now()}`,
    status: 'submitted',
  };

  await kv.set(submissionKey, submission);

  // Update student's workflow progress
  await updateStudentWorkflowProgress(sessionId, studentId, type, 'submitted');

  // Update session workflow if this is first pre-work submission
  if (type === 'pre-work') {
    const workflow = await getSessionWorkflow(sessionId);
    workflow.preWorkSubmittedAt = new Date().toISOString();
    await kv.set(`session:${sessionId}:workflow-status`, workflow);
  }
}

// Get all students' progress through workflow for a session
export async function getSessionStudentProgress(
  sessionId: string
): Promise<StudentWorkflowProgress[]> {
  const session = await kv.get(`session:${sessionId}`);
  if (!session) return [];

  const studentIds = session.studentIds || [];
  const results: StudentWorkflowProgress[] = [];

  for (const studentId of studentIds) {
    const preWorkKey = `session:${sessionId}:student:${studentId}:submission:pre-work`;
    const homeworkKey = `session:${sessionId}:student:${studentId}:submission:homework`;

    const preWorkSubmission = await kv.get(preWorkKey);
    const homeworkSubmission = await kv.get(homeworkKey);

    let preWorkStatus: 'pending' | 'submitted' | 'reviewed' = 'pending';
    let homeworkStatus: 'pending' | 'submitted' | 'graded' = 'pending';

    if (preWorkSubmission) {
      preWorkStatus = preWorkSubmission.graded ? 'reviewed' : 'submitted';
    }

    if (homeworkSubmission) {
      homeworkStatus = homeworkSubmission.graded ? 'graded' : 'submitted';
    }

    const sessionStatus = session.endedAt ? 'completed' : session.startedAt ? 'attended' : 'pending';

    let overallProgress = 0;
    if (preWorkStatus !== 'pending') overallProgress += 33;
    if (sessionStatus === 'attended' || sessionStatus === 'completed') overallProgress += 33;
    if (homeworkStatus !== 'pending') overallProgress += 34;

    results.push({
      sessionId,
      studentId,
      preWorkStatus,
      sessionStatus: sessionStatus as any,
      homeworkStatus,
      overallProgress: Math.min(100, overallProgress),
    });
  }

  return results;
}

// Update individual student's progress in workflow
export async function updateStudentWorkflowProgress(
  sessionId: string,
  studentId: string,
  type: AssignmentType,
  status: 'pending' | 'submitted' | 'reviewed' | 'attended' | 'graded'
): Promise<void> {
  const progressKey = `session:${sessionId}:student:${studentId}:workflow-progress`;
  let progress = await kv.get(progressKey);

  if (!progress) {
    progress = {
      sessionId,
      studentId,
      preWorkStatus: 'pending',
      sessionStatus: 'pending',
      homeworkStatus: 'pending',
      overallProgress: 0,
    };
  }

  if (type === 'pre-work') {
    progress.preWorkStatus = status === 'reviewed' || status === 'graded' ? 'reviewed' : 'submitted';
  } else if (type === 'session') {
    progress.sessionStatus = status === 'attended' ? 'attended' : 'pending';
  } else if (type === 'homework') {
    progress.homeworkStatus = status === 'graded' ? 'graded' : 'submitted';
  }

  // Recalculate overall progress
  let total = 0;
  if (progress.preWorkStatus !== 'pending') total += 33;
  if (progress.sessionStatus !== 'pending') total += 33;
  if (progress.homeworkStatus !== 'pending') total += 34;
  progress.overallProgress = Math.min(100, total);

  await kv.set(progressKey, progress);
}

// Mark session as started (students joining)
export async function markSessionStarted(sessionId: string): Promise<void> {
  const workflow = await getSessionWorkflow(sessionId);
  workflow.sessionInProgress = true;
  workflow.sessionStartedAt = new Date().toISOString();
  await kv.set(`session:${sessionId}:workflow-status`, workflow);

  // Update all student statuses
  const session = await kv.get(`session:${sessionId}`);
  if (session && session.studentIds) {
    for (const studentId of session.studentIds) {
      await updateStudentWorkflowProgress(sessionId, studentId, 'session', 'attended');
    }
  }
}

// Mark session as ended (with timestamp)
export async function markSessionEnded(sessionId: string): Promise<void> {
  const workflow = await getSessionWorkflow(sessionId);
  workflow.sessionInProgress = false;
  workflow.sessionEndedAt = new Date().toISOString();
  await kv.set(`session:${sessionId}:workflow-status`, workflow);

  // Mark session record as ended
  const session = await kv.get(`session:${sessionId}`);
  if (session) {
    session.endedAt = workflow.sessionEndedAt;
    session.status = 'completed';
    await kv.set(`session:${sessionId}`, session);
  }
}

// Get workflow completion summary for a session
export async function getSessionWorkflowSummary(sessionId: string): Promise<{
  sessionId: string;
  totalStudents: number;
  preWorkCompletionRate: number;
  sessionAttendanceRate: number;
  homeworkCompletionRate: number;
  averageWorkflowProgress: number;
}> {
  const progress = await getSessionStudentProgress(sessionId);

  if (progress.length === 0) {
    return {
      sessionId,
      totalStudents: 0,
      preWorkCompletionRate: 0,
      sessionAttendanceRate: 0,
      homeworkCompletionRate: 0,
      averageWorkflowProgress: 0,
    };
  }

  const preWorkComplete = progress.filter((p) => p.preWorkStatus !== 'pending').length;
  const sessionAttended = progress.filter((p) => p.sessionStatus !== 'pending').length;
  const homeworkComplete = progress.filter((p) => p.homeworkStatus !== 'pending').length;
  const avgProgress = progress.reduce((sum, p) => sum + p.overallProgress, 0) / progress.length;

  return {
    sessionId,
    totalStudents: progress.length,
    preWorkCompletionRate: (preWorkComplete / progress.length) * 100,
    sessionAttendanceRate: (sessionAttended / progress.length) * 100,
    homeworkCompletionRate: (homeworkComplete / progress.length) * 100,
    averageWorkflowProgress: avgProgress,
  };
}
