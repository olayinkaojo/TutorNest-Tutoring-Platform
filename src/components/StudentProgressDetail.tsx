import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';

export interface StudentProgressDetailProps {
  studentId?: string;
  studentName?: string;
  stats?: {
    averageScore: number;
    masteryScore: number;
    assignmentsCompleted: number;
    topicsProgress: { [key: string]: number };
    weakAreas: string[];
    learningVelocity: number;
    recommendations: string[];
  };
  workflowProgress?: {
    preWorkStatus: 'pending' | 'submitted' | 'reviewed';
    sessionStatus: 'pending' | 'attended' | 'completed';
    homeworkStatus: 'pending' | 'submitted' | 'graded';
    overallProgress: number;
  };
}

export default function StudentProgressDetail({
  studentId,
  studentName = 'John Doe',
  stats = {
    averageScore: 78.5,
    masteryScore: 0.82,
    assignmentsCompleted: 12,
    topicsProgress: {
      algebra: 85,
      geometry: 72,
      'reading-comprehension': 90,
      vocabulary: 65,
    },
    weakAreas: ['Geometry basics', 'Complex fractions'],
    learningVelocity: 0.15,
    recommendations: [
      '📈 Great progress! Keep reinforcing key concepts',
      '🎯 Focus on: Geometry basics',
      '✓ Student is on track - Encourage them to continue!',
    ],
  },
  workflowProgress = {
    preWorkStatus: 'reviewed',
    sessionStatus: 'attended',
    homeworkStatus: 'submitted',
    overallProgress: 89,
  },
}: StudentProgressDetailProps) {
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);

  const getMasteryLevel = (score: number) => {
    if (score >= 90) return { level: 'Expert', color: 'text-purple-600' };
    if (score >= 80) return { level: 'Advanced', color: 'text-blue-600' };
    if (score >= 70) return { level: 'Intermediate', color: 'text-green-600' };
    if (score >= 60) return { level: 'Beginner', color: 'text-yellow-600' };
    return { level: 'Novice', color: 'text-red-600' };
  };

  const getVelocityIcon = (velocity: number) => {
    if (velocity > 0.2) return '📈';
    if (velocity > 0) return '↗️';
    if (velocity > -0.2) return '→';
    return '📉';
  };

  const topicsArray = Object.entries(stats.topicsProgress).sort((a, b) => b[1] - a[1]);

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{studentName}</h1>
          <p className="text-gray-600">Student ID: {studentId || 'N/A'}</p>
        </div>
        <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition">
          Send Message
        </button>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Average Score */}
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-sm text-gray-600 mb-2">Average Score</p>
              <p className="text-4xl font-bold text-blue-600">{stats.averageScore.toFixed(1)}%</p>
              <p className="text-xs text-gray-500 mt-2">📊 Performance</p>
            </div>
          </CardContent>
        </Card>

        {/* Mastery Score */}
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-sm text-gray-600 mb-2">Mastery Level</p>
              <p className={`text-4xl font-bold ${getMasteryLevel(stats.masteryScore * 100).color}`}>
                {(stats.masteryScore * 100).toFixed(0)}%
              </p>
              <p className="text-xs text-gray-500 mt-2">{getMasteryLevel(stats.masteryScore * 100).level}</p>
            </div>
          </CardContent>
        </Card>

        {/* Assignments Completed */}
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-sm text-gray-600 mb-2">Assignments</p>
              <p className="text-4xl font-bold text-green-600">{stats.assignmentsCompleted}</p>
              <p className="text-xs text-gray-500 mt-2">✓ Completed</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Learning Velocity & Trend */}
      <Card>
        <CardHeader>
          <CardTitle>Learning Progress</CardTitle>
          <CardDescription>Performance trend and learning velocity</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Velocity Indicator */}
          <div className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-transparent rounded-lg border-l-4 border-blue-500">
            <div>
              <p className="text-sm text-gray-600">Learning Velocity</p>
              <p className="text-2xl font-bold text-gray-900">
                {getVelocityIcon(stats.learningVelocity)} {(stats.learningVelocity * 100).toFixed(0)}%
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {stats.learningVelocity > 0.2
                  ? 'Rapidly improving'
                  : stats.learningVelocity > 0
                    ? 'Gradually improving'
                    : 'Needs support'}
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-600">Change</p>
              <p className={`text-xl font-bold ${stats.learningVelocity >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {stats.learningVelocity >= 0 ? '+' : ''}{(stats.learningVelocity * 10).toFixed(1)}
              </p>
            </div>
          </div>

          {/* Performance Graph */}
          <div className="h-48 bg-gradient-to-b from-gray-50 to-transparent rounded-lg flex items-end justify-around px-4 py-8">
            {[62, 65, 70, 72, 75, 76, 78, 79, 81, 82, 83, 84].map((value, i) => (
              <div key={i} className="flex flex-col items-center gap-1">
                <div
                  className="w-4 rounded-t bg-gradient-to-t from-blue-500 to-blue-400 transition-all hover:opacity-75"
                  style={{ height: `${(value / 100) * 150}px` }}
                />
                {i % 3 === 0 && <span className="text-xs text-gray-500">{value}%</span>}
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-500 text-center">Last 12 assignments - Upward trend 📈</p>
        </CardContent>
      </Card>

      {/* Session Workflow Progress (if applicable) */}
      <Card className="border-l-4 border-l-indigo-500">
        <CardHeader>
          <CardTitle className="text-lg">📚 Tutoring Session Progress</CardTitle>
          <CardDescription>Tracking through pre-work, session, and homework phases</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            {/* Pre-Work */}
            <div className="flex-1 text-center">
              <div
                className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-2 ${
                  workflowProgress.preWorkStatus !== 'pending'
                    ? 'bg-blue-100 text-blue-600'
                    : 'bg-gray-100 text-gray-400'
                }`}
              >
                {workflowProgress.preWorkStatus === 'reviewed' ? '✓' : workflowProgress.preWorkStatus === 'submitted' ? '◐' : '○'}
              </div>
              <p className="text-sm font-semibold text-gray-900">Pre-Work</p>
              <p className="text-xs text-gray-600 capitalize">{workflowProgress.preWorkStatus}</p>
            </div>

            {/* Arrow */}
            <div className="text-2xl text-gray-400">→</div>

            {/* Session */}
            <div className="flex-1 text-center">
              <div
                className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-2 ${
                  workflowProgress.sessionStatus === 'completed'
                    ? 'bg-green-100 text-green-600'
                    : workflowProgress.sessionStatus === 'attended'
                      ? 'bg-blue-100 text-blue-600'
                      : 'bg-gray-100 text-gray-400'
                }`}
              >
                {workflowProgress.sessionStatus === 'completed' ? '✓' : workflowProgress.sessionStatus === 'attended' ? '●' : '○'}
              </div>
              <p className="text-sm font-semibold text-gray-900">Live Session</p>
              <p className="text-xs text-gray-600 capitalize">{workflowProgress.sessionStatus}</p>
            </div>

            {/* Arrow */}
            <div className="text-2xl text-gray-400">→</div>

            {/* Homework */}
            <div className="flex-1 text-center">
              <div
                className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-2 ${
                  workflowProgress.homeworkStatus === 'graded'
                    ? 'bg-purple-100 text-purple-600'
                    : workflowProgress.homeworkStatus === 'submitted'
                      ? 'bg-indigo-100 text-indigo-600'
                      : 'bg-gray-100 text-gray-400'
                }`}
              >
                {workflowProgress.homeworkStatus === 'graded' ? '✓' : workflowProgress.homeworkStatus === 'submitted' ? '◐' : '○'}
              </div>
              <p className="text-sm font-semibold text-gray-900">Homework</p>
              <p className="text-xs text-gray-600 capitalize">{workflowProgress.homeworkStatus}</p>
            </div>
          </div>

          {/* Overall Progress Bar */}
          <div className="pt-4 border-t">
            <div className="flex justify-between items-center mb-2">
              <p className="text-sm font-semibold text-gray-700">Overall Workflow Progress</p>
              <p className="text-lg font-bold text-indigo-600">{workflowProgress.overallProgress}%</p>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div
                className="bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 h-3 rounded-full transition-all"
                style={{ width: `${workflowProgress.overallProgress}%` }}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Topics Progress */}
      <Card>
        <CardHeader>
          <CardTitle>Topics Progress</CardTitle>
          <CardDescription>Mastery by subject area</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {topicsArray.map(([topic, progress], idx) => {
              const isStruggling = progress < 60;
              const isAdvanced = progress >= 85;

              return (
                <div
                  key={idx}
                  className="p-4 rounded-lg border cursor-pointer transition-colors hover:bg-gray-50"
                  onClick={() => setSelectedTopic(topic)}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <span className="text-lg font-semibold text-gray-900 capitalize">{topic.replace('-', ' ')}</span>
                      {isStruggling && <span className="text-xs px-2 py-1 bg-red-100 text-red-700 rounded">Needs Help</span>}
                      {isAdvanced && <span className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded">Advanced</span>}
                    </div>
                    <span className={`text-lg font-bold ${isStruggling ? 'text-red-600' : isAdvanced ? 'text-green-600' : 'text-blue-600'}`}>
                      {progress}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all ${
                        isStruggling ? 'bg-red-500' : isAdvanced ? 'bg-green-500' : 'bg-blue-500'
                      }`}
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Weak Areas & Recommendations */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Weak Areas */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Weak Areas</CardTitle>
            <CardDescription>Topics needing additional support</CardDescription>
          </CardHeader>
          <CardContent>
            {stats.weakAreas.length > 0 ? (
              <div className="space-y-2">
                {stats.weakAreas.map((area, idx) => (
                  <div key={idx} className="flex items-start gap-3 p-3 bg-red-50 rounded-lg">
                    <span className="text-lg mt-0.5">⚠️</span>
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{area}</p>
                      <button className="text-xs text-red-600 hover:underline mt-1">Assign Review Materials</button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-gray-500 py-4">✓ No significant weak areas</p>
            )}
          </CardContent>
        </Card>

        {/* Teacher Recommendations */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Recommendations</CardTitle>
            <CardDescription>Suggested actions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {stats.recommendations.map((rec, idx) => (
                <div
                  key={idx}
                  className={`flex items-start gap-3 p-3 rounded-lg ${
                    rec.includes('Great') || rec.includes('✓')
                      ? 'bg-green-50'
                      : rec.includes('📈')
                        ? 'bg-blue-50'
                        : 'bg-yellow-50'
                  }`}
                >
                  <span className="text-lg mt-0.5">{rec.split(' ')[0]}</span>
                  <p className="font-medium text-gray-900 flex-1">{rec.substring(rec.indexOf(' ') + 1)}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Intervention Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Intervention Actions</CardTitle>
          <CardDescription>Support options for this student</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button className="p-4 border rounded-lg hover:bg-gray-50 transition-colors text-left">
              <p className="font-semibold text-gray-900">📧 Send Message</p>
              <p className="text-sm text-gray-600 mt-1">Direct communication</p>
            </button>
            <button className="p-4 border rounded-lg hover:bg-gray-50 transition-colors text-left">
              <p className="font-semibold text-gray-900">📚 Assign Resources</p>
              <p className="text-sm text-gray-600 mt-1">Review materials & tutoring</p>
            </button>
            <button className="p-4 border rounded-lg hover:bg-gray-50 transition-colors text-left">
              <p className="font-semibold text-gray-900">📅 Schedule 1-on-1</p>
              <p className="text-sm text-gray-600 mt-1">Extra help session</p>
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
