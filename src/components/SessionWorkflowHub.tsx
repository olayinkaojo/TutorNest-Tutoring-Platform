import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';

interface Assignment {
  id: string;
  title: string;
  description: string;
  dueDate?: string;
  pointsPossible: number;
}

interface StudentSubmission {
  studentId: string;
  studentName: string;
  submitted: boolean;
  submittedAt?: string;
  score?: number;
  graded: boolean;
}

export interface SessionWorkflowHubProps {
  sessionId: string;
  tutorName?: string;
  assignments?: {
    preWork?: Assignment;
    session?: Assignment;
    homework?: Assignment;
  };
  submissions?: StudentSubmission[];
  onLinkAssignment?: (type: 'pre-work' | 'session' | 'homework') => void;
  onUnlinkAssignment?: (type: 'pre-work' | 'session' | 'homework') => void;
}

export default function SessionWorkflowHub({
  sessionId,
  tutorName = 'Ms. Johnson',
  assignments = {
    preWork: {
      id: 'assign-1',
      title: 'Quadratic Equations Assessment',
      description: 'Solve 5 quadratic equations to assess current understanding',
      dueDate: '2024-01-15T17:00:00Z',
      pointsPossible: 25,
    },
  },
  submissions = [
    { studentId: '1', studentName: 'Alice', submitted: true, submittedAt: '2024-01-15T16:45:00Z', score: 22, graded: true },
    { studentId: '2', studentName: 'Bob', submitted: true, submittedAt: '2024-01-15T16:50:00Z', score: 18, graded: true },
    { studentId: '3', studentName: 'Charlie', submitted: false, graded: false },
  ],
  onLinkAssignment,
  onUnlinkAssignment,
}: SessionWorkflowHubProps) {
  const [selectedTab, setSelectedTab] = useState<'pre-work' | 'session' | 'homework'>('pre-work');

  const tabs = [
    { id: 'pre-work', label: '📋 Pre-Work', description: 'Assessment before session' },
    { id: 'session', label: '🎓 Live Session', description: 'Collaborative work during session' },
    { id: 'homework', label: '📚 Homework', description: 'Solo reinforcement after session' },
  ];

  const currentAssignment = assignments[selectedTab as keyof typeof assignments];

  const getCompletionStats = () => {
    const total = submissions.length;
    const submitted = submissions.filter((s) => s.submitted).length;
    const graded = submissions.filter((s) => s.graded && s.submitted).length;
    return { total, submitted, graded };
  };

  const stats = getCompletionStats();

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Tutoring Session Workflow</h1>
          <p className="text-gray-600">Manage pre-work, live session, and homework</p>
        </div>
        <div className="text-right">
          <p className="text-sm text-gray-600">Session ID</p>
          <p className="font-mono text-lg text-gray-900">{sessionId}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-3 border-b">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setSelectedTab(tab.id as any)}
            className={`px-6 py-3 font-medium border-b-2 transition ${
              selectedTab === tab.id
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            <div className="text-lg">{tab.label}</div>
            <div className="text-xs text-gray-500">{tab.description}</div>
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="grid grid-cols-3 gap-6">
        {/* Assignment Details (Left) */}
        <div className="col-span-2">
          {currentAssignment ? (
            <Card>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle>{currentAssignment.title}</CardTitle>
                    <CardDescription>{currentAssignment.description}</CardDescription>
                  </div>
                  <button
                    onClick={() => onUnlinkAssignment?.(selectedTab)}
                    className="px-3 py-1 bg-red-100 text-red-600 hover:bg-red-200 rounded text-sm transition"
                  >
                    Unlink
                  </button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Assignment Metadata */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-xs text-gray-600 mb-1">Points Possible</p>
                    <p className="text-2xl font-bold text-gray-900">{currentAssignment.pointsPossible}</p>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-xs text-gray-600 mb-1">Due Date</p>
                    <p className="font-semibold text-gray-900">
                      {currentAssignment.dueDate
                        ? new Date(currentAssignment.dueDate).toLocaleDateString()
                        : 'Not set'}
                    </p>
                  </div>
                </div>

                {/* Completion Progress */}
                <div className="space-y-2">
                  <p className="text-sm font-semibold text-gray-700">Submission Status</p>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-green-500 h-2 rounded-full transition-all"
                        style={{ width: `${(stats.submitted / stats.total) * 100}%` }}
                      />
                    </div>
                    <span className="text-sm font-semibold text-gray-600">
                      {stats.submitted}/{stats.total}
                    </span>
                  </div>
                </div>

                {/* Grading Progress (if applicable) */}
                {selectedTab === 'pre-work' && (
                  <div className="space-y-2 pt-2 border-t">
                    <p className="text-sm font-semibold text-gray-700">Grading Status</p>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-500 h-2 rounded-full transition-all"
                          style={{ width: `${(stats.graded / stats.total) * 100}%` }}
                        />
                      </div>
                      <span className="text-sm font-semibold text-gray-600">
                        {stats.graded}/{stats.total} graded
                      </span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card className="border-2 border-dashed border-gray-300">
              <CardContent className="pt-12 pb-12 text-center">
                <p className="text-gray-500 mb-4">No assignment linked to this {selectedTab.replace('-', ' ')}</p>
                <button
                  onClick={() => onLinkAssignment?.(selectedTab)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                >
                  + Link Assignment
                </button>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Quick Stats (Right) */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Completion</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-sm text-gray-600">Submitted</span>
                  <span className="text-lg font-bold text-blue-600">{stats.submitted}/{stats.total}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-500 h-2 rounded-full"
                    style={{ width: `${(stats.submitted / stats.total) * 100}%` }}
                  />
                </div>
              </div>

              {selectedTab === 'pre-work' && (
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm text-gray-600">Graded</span>
                    <span className="text-lg font-bold text-green-600">{stats.graded}/{stats.total}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-green-500 h-2 rounded-full"
                      style={{ width: `${(stats.graded / stats.total) * 100}%` }}
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Average Score (Pre-Work) */}
          {selectedTab === 'pre-work' && submissions.some((s) => s.score) && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Average Score</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center">
                  <p className="text-4xl font-bold text-purple-600">
                    {Math.round(
                      submissions
                        .filter((s) => s.score)
                        .reduce((sum, s) => sum + (s.score || 0), 0) /
                        submissions.filter((s) => s.score).length
                    )}
                  </p>
                  <p className="text-sm text-gray-600 mt-1">out of {currentAssignment?.pointsPossible || 100}</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Student Submissions Table */}
      <Card>
        <CardHeader>
          <CardTitle>Student Submissions</CardTitle>
          <CardDescription>Status of all students for this assignment</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-sm font-semibold text-gray-700">Student</th>
                  <th className="px-4 py-2 text-center text-sm font-semibold text-gray-700">Status</th>
                  <th className="px-4 py-2 text-center text-sm font-semibold text-gray-700">Submitted</th>
                  {selectedTab === 'pre-work' && (
                    <>
                      <th className="px-4 py-2 text-center text-sm font-semibold text-gray-700">Score</th>
                      <th className="px-4 py-2 text-center text-sm font-semibold text-gray-700">Graded</th>
                    </>
                  )}
                  <th className="px-4 py-2 text-center text-sm font-semibold text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {submissions.map((submission) => (
                  <tr key={submission.studentId} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-semibold text-gray-900">{submission.studentName}</td>
                    <td className="px-4 py-3 text-center">
                      {submission.submitted ? (
                        <span className="inline-block px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-semibold">
                          ✓ Submitted
                        </span>
                      ) : (
                        <span className="inline-block px-2 py-1 bg-yellow-100 text-yellow-700 rounded text-xs font-semibold">
                          ⏳ Pending
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center text-sm text-gray-600">
                      {submission.submittedAt ? new Date(submission.submittedAt).toLocaleTimeString() : '—'}
                    </td>
                    {selectedTab === 'pre-work' && (
                      <>
                        <td className="px-4 py-3 text-center">
                          {submission.score !== undefined ? (
                            <span className="text-lg font-bold text-blue-600">{submission.score}</span>
                          ) : (
                            '—'
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {submission.graded ? (
                            <span className="inline-block px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-semibold">
                              ✓ Graded
                            </span>
                          ) : (
                            <span className="inline-block px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs font-semibold">
                              Not Graded
                            </span>
                          )}
                        </td>
                      </>
                    )}
                    <td className="px-4 py-3 text-center">
                      <button className="text-blue-600 hover:underline text-sm font-semibold">View</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Workflow Progress Indicator */}
      <Card>
        <CardHeader>
          <CardTitle>Session Workflow Progress</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="text-center flex-1">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-2 ${assignments.preWork ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-600'}`}>
                ✓
              </div>
              <p className="text-sm font-semibold text-gray-700">Pre-Work</p>
              <p className="text-xs text-gray-500">Assessment</p>
            </div>

            <div className="flex-1 h-1 bg-gradient-to-r from-green-400 to-blue-400 mx-4" />

            <div className="text-center flex-1">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-2 ${assignments.session ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600'}`}>
                ◉
              </div>
              <p className="text-sm font-semibold text-gray-700">Live Session</p>
              <p className="text-xs text-gray-500">Collaborative</p>
            </div>

            <div className="flex-1 h-1 bg-gradient-to-r from-blue-400 to-purple-400 mx-4" />

            <div className="text-center flex-1">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-2 ${assignments.homework ? 'bg-purple-100 text-purple-600' : 'bg-gray-100 text-gray-600'}`}>
                ○
              </div>
              <p className="text-sm font-semibold text-gray-700">Homework</p>
              <p className="text-xs text-gray-500">Reinforcement</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
