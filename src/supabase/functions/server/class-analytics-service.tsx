import * as kv from './kv_store.tsx';
import { getAssignmentResponses, getAssignment } from './assignment-service.tsx';
import { getClassMembers } from './teacher-profile-service.tsx';

export interface ClassStats {
  classId: string;
  className: string;
  totalStudents: number;
  averageMastery: number;
  completionRate: number;
  engagementScore: number;
  topicsProgress: { [topicId: string]: number };
  recentActivity: ActivityLog[];
}

export interface StudentStats {
  studentId: string;
  studentName: string;
  averageScore: number;
  masteryScore: number;
  assignmentsCompleted: number;
  topicsProgress: { [topicId: string]: number };
  weakAreas: string[];
  learningVelocity: number; // -1 to 1 (declining to improving)
  recommendations: string[];
}

export interface ActivityLog {
  timestamp: string;
  studentId: string;
  studentName: string;
  action: string; // 'submitted', 'graded', 'started', etc.
  details: string;
}

export interface GradeDistribution {
  A: number; // 90-100
  B: number; // 80-89
  C: number; // 70-79
  D: number; // 60-69
  F: number; // <60
}

export async function getClassAnalytics(classId: string): Promise<ClassStats> {
  // Get class members
  const members = (await kv.get(`class:${classId}:members`)) || [];
  const studentCount = members.filter((m: any) => m.role === 'student').length;

  // Get all assignments for class
  const assignmentIds = (await kv.get(`class:${classId}:assignments`)) || [];
  let totalScore = 0;
  let totalResponses = 0;
  const studentScores: { [studentId: string]: number[] } = {};

  for (const assignmentId of assignmentIds) {
    const responses = (await kv.get(`assignment:${assignmentId}:responses`)) || [];
    for (const responseId of responses) {
      const response = await kv.get(`response:${responseId}`);
      if (response && response.graded && response.score !== undefined) {
        totalScore += response.score;
        totalResponses++;

        if (!studentScores[response.studentId]) {
          studentScores[response.studentId] = [];
        }
        studentScores[response.studentId].push(response.score);
      }
    }
  }

  const averageMastery = totalResponses > 0 ? totalScore / totalResponses : 0;
  const completionRate = studentCount > 0 ? (totalResponses / (assignmentIds.length * studentCount)) * 100 : 0;

  // Calculate engagement score (0-100)
  const engagementScore = Math.min(100, completionRate * 1.2 + (totalResponses > 0 ? 20 : 0));

  // Get recent activity
  const recentActivity = await getRecentActivity(classId);

  return {
    classId,
    className: 'Class',
    totalStudents: studentCount,
    averageMastery,
    completionRate,
    engagementScore,
    topicsProgress: {},
    recentActivity,
  };
}

export async function getStudentAnalytics(classId: string, studentId: string): Promise<StudentStats> {
  // Get all responses for this student in this class
  const assignmentIds = (await kv.get(`class:${classId}:assignments`)) || [];
  let scores: number[] = [];
  let completedAssignments = 0;

  for (const assignmentId of assignmentIds) {
    const responses = await kv.get(`assignment:${assignmentId}:student:${studentId}:responses`);
    if (responses && responses.length > 0) {
      completedAssignments++;
      const lastResponse = responses[responses.length - 1];
      const response = await kv.get(`response:${lastResponse}`);
      if (response && response.score !== undefined) {
        scores.push(response.score);
      }
    }
  }

  const averageScore = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;

  // Calculate mastery (weighted toward recent scores)
  const masteryScore = calculateMasteryScore(scores);

  // Determine weak areas (assignments with low scores)
  const weakAreas: string[] = [];
  if (averageScore < 70) {
    weakAreas.push('Fundamentals - Focus on basic concepts');
  }
  if (averageScore < 60) {
    weakAreas.push('Critical areas need attention');
  }

  // Calculate learning velocity
  const learningVelocity = calculateLearningVelocity(scores);

  // Get recommendations
  const recommendations = getRecommendations(averageScore, learningVelocity, weakAreas);

  return {
    studentId,
    studentName: 'Student',
    averageScore,
    masteryScore,
    assignmentsCompleted: completedAssignments,
    topicsProgress: {},
    weakAreas,
    learningVelocity,
    recommendations,
  };
}

export async function getAssignmentAnalytics(assignmentId: string): Promise<{
  totalSubmissions: number;
  averageScore: number;
  medianScore: number;
  standardDeviation: number;
  gradeDistribution: GradeDistribution;
  submissionRate: number;
  topPerformers: { studentId: string; score: number }[];
  strugglingStudents: { studentId: string; score: number }[];
}> {
  const responses = await getAssignmentResponses(assignmentId);
  const assignment = await getAssignment(assignmentId);

  if (!assignment || !responses) {
    return {
      totalSubmissions: 0,
      averageScore: 0,
      medianScore: 0,
      standardDeviation: 0,
      gradeDistribution: { A: 0, B: 0, C: 0, D: 0, F: 0 },
      submissionRate: 0,
      topPerformers: [],
      strugglingStudents: [],
    };
  }

  const gradedResponses = responses.filter((r: any) => r.graded && r.score !== undefined);
  const scores = gradedResponses.map((r: any) => r.score);

  if (scores.length === 0) {
    return {
      totalSubmissions: responses.length,
      averageScore: 0,
      medianScore: 0,
      standardDeviation: 0,
      gradeDistribution: { A: 0, B: 0, C: 0, D: 0, F: 0 },
      submissionRate: 0,
      topPerformers: [],
      strugglingStudents: [],
    };
  }

  const average = scores.reduce((a, b) => a + b, 0) / scores.length;
  const sorted = scores.sort((a, b) => a - b);
  const median = sorted.length % 2 === 0 ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2 : sorted[Math.floor(sorted.length / 2)];

  const variance = scores.reduce((sum, score) => sum + Math.pow(score - average, 2), 0) / scores.length;
  const stdDev = Math.sqrt(variance);

  // Grade distribution
  const maxScore = assignment.totalPoints || 100;
  const distribution: GradeDistribution = { A: 0, B: 0, C: 0, D: 0, F: 0 };

  for (const score of scores) {
    const percentage = (score / maxScore) * 100;
    if (percentage >= 90) distribution.A++;
    else if (percentage >= 80) distribution.B++;
    else if (percentage >= 70) distribution.C++;
    else if (percentage >= 60) distribution.D++;
    else distribution.F++;
  }

  // Top and struggling performers
  const sortedResponses = gradedResponses.sort((a: any, b: any) => b.score - a.score);
  const topPerformers = sortedResponses.slice(0, 3).map((r: any) => ({ studentId: r.studentId, score: r.score }));
  const strugglingStudents = sortedResponses.slice(-3).reverse().map((r: any) => ({ studentId: r.studentId, score: r.score }));

  return {
    totalSubmissions: responses.length,
    averageScore: average,
    medianScore: median,
    standardDeviation: stdDev,
    gradeDistribution: distribution,
    submissionRate: ((responses.length / responses.length) * 100).toFixed(1) as any,
    topPerformers,
    strugglingStudents,
  };
}

export async function getRecentActivity(classId: string): Promise<ActivityLog[]> {
  const activityKey = `class:${classId}:activity-log`;
  const activities = (await kv.get(activityKey)) || [];
  return activities.slice(-10).reverse(); // Last 10 activities
}

export async function logActivity(classId: string, studentId: string, studentName: string, action: string, details: string): Promise<void> {
  const activityKey = `class:${classId}:activity-log`;
  const activities = (await kv.get(activityKey)) || [];

  activities.push({
    timestamp: new Date().toISOString(),
    studentId,
    studentName,
    action,
    details,
  });

  // Keep only last 100 activities
  if (activities.length > 100) {
    activities.shift();
  }

  await kv.set(activityKey, activities);
}

export async function getClassTrendData(classId: string, days: number = 30): Promise<{ date: string; averageScore: number }[]> {
  const trendKey = `class:${classId}:daily-trend`;
  const trends = (await kv.get(trendKey)) || [];
  return trends.slice(-days);
}

export function calculateMasteryScore(scores: number[]): number {
  if (scores.length === 0) return 0;

  // Weight recent scores more heavily
  let weightedSum = 0;
  let weightSum = 0;

  for (let i = 0; i < scores.length; i++) {
    const weight = Math.pow(1.1, i); // Exponential weight favoring recent scores
    weightedSum += scores[i] * weight;
    weightSum += weight;
  }

  return weightedSum / weightSum;
}

export function calculateLearningVelocity(scores: number[]): number {
  if (scores.length < 2) return 0;

  // Compare first half to second half
  const mid = Math.floor(scores.length / 2);
  const firstHalf = scores.slice(0, mid);
  const secondHalf = scores.slice(mid);

  const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
  const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;

  // Normalize to -1 to 1 range
  return Math.max(-1, Math.min(1, (secondAvg - firstAvg) / 100));
}

export function getRecommendations(averageScore: number, velocity: number, weakAreas: string[]): string[] {
  const recommendations: string[] = [];

  if (averageScore < 60) {
    recommendations.push('⚠️ Student needs immediate intervention - Schedule tutoring session');
  } else if (averageScore < 70) {
    recommendations.push('📚 Consider assigning review materials');
  }

  if (velocity < -0.2) {
    recommendations.push('📉 Student performance is declining - Check in with them');
  } else if (velocity > 0.2) {
    recommendations.push('📈 Great progress! Keep reinforcing key concepts');
  }

  if (weakAreas.length > 0) {
    recommendations.push(`🎯 Focus on: ${weakAreas[0]}`);
  }

  if (recommendations.length === 0) {
    recommendations.push('✓ Student is on track - Encourage them to continue!');
  }

  return recommendations;
}

export async function getStrugglingSudents(classId: string, threshold: number = 70): Promise<StudentStats[]> {
  const members = (await kv.get(`class:${classId}:members`)) || [];
  const students = members.filter((m: any) => m.role === 'student');

  const strugglingStudents: StudentStats[] = [];

  for (const member of students) {
    const stats = await getStudentAnalytics(classId, member.userId);
    if (stats.averageScore < threshold) {
      strugglingStudents.push(stats);
    }
  }

  return strugglingStudents.sort((a, b) => a.averageScore - b.averageScore);
}
