import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';

interface Assignment {
  id: string;
  title: string;
  description: string;
  dueDate?: string;
  pointsPossible: number;
}

interface TutorAnnotation {
  id: string;
  type: string;
  timestamp: string;
  description: string;
}

export interface StudentSessionViewProps {
  sessionId: string;
  studentName?: string;
  studentId?: string;
  preWorkAssignment?: Assignment;
  sessionPhaseAssignment?: Assignment;
  homeworkAssignment?: Assignment;
  tutorName?: string;
  tutorAnnotations?: TutorAnnotation[];
  preWorkSubmitted?: boolean;
  preWorkScore?: number;
  homeworkSubmitted?: boolean;
  onSubmitPreWork?: (responses: any) => void;
  onSubmitHomework?: (responses: any) => void;
}

export default function StudentSessionView({
  sessionId,
  studentName = 'Alice Johnson',
  studentId = 'student-1',
  preWorkAssignment = {
    id: 'pw-1',
    title: 'Quadratic Equations Pre-Assessment',
    description: 'Solve 5 basic quadratic equations to show your current understanding',
    dueDate: '2024-01-15T17:00:00Z',
    pointsPossible: 25,
  },
  sessionPhaseAssignment = {
    id: 'sess-1',
    title: 'Solving Complex Quadratic Equations',
    description: 'We will work together to solve real-world problems involving quadratic equations',
    pointsPossible: 50,
  },
  homeworkAssignment = {
    id: 'hw-1',
    title: 'Quadratic Equations Practice Set',
    description: 'Solve 10 problems using the techniques we learned in the session',
    dueDate: '2024-01-16T23:59:00Z',
    pointsPossible: 30,
  },
  tutorName = 'Ms. Johnson',
  tutorAnnotations = [
    {
      id: 'ann-1',
      type: 'highlight',
      timestamp: '2024-01-15T18:15:00Z',
      description: 'Great approach to factoring!',
    },
    {
      id: 'ann-2',
      type: 'correction',
      timestamp: '2024-01-15T18:20:00Z',
      description: 'Remember: always check both solutions',
    },
  ],
  preWorkSubmitted = true,
  preWorkScore = 22,
  homeworkSubmitted = false,
  onSubmitPreWork,
  onSubmitHomework,
}: StudentSessionViewProps) {
  const [currentPhase, setCurrentPhase] = useState<'pre-work' | 'live-session' | 'homework'>('pre-work');
  const [showAnnotations, setShowAnnotations] = useState(false);
  const [responses, setResponses] = useState('');

  const phases = [
    { id: 'pre-work', label: '📋 Pre-Work', icon: '1', description: 'Assessment' },
    { id: 'live-session', label: '🎓 Live Session', icon: '2', description: 'Collaboration' },
    { id: 'homework', label: '📚 Homework', icon: '3', description: 'Practice' },
  ];

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6 py-6">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Tutoring Session</h1>
        <p className="text-gray-600 mt-2">Hello {studentName}! Let's make the most of this session.</p>
      </div>

      {/* Workflow Progress */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-6 border border-blue-200">
        <p className="text-sm font-semibold text-gray-700 mb-4">Your Learning Journey</p>
        <div className="flex items-center justify-between">
          {phases.map((phase, idx) => {
            const isActive = currentPhase === phase.id;
            const isPassed =
              (phase.id === 'pre-work' && preWorkSubmitted) ||
              (phase.id === 'live-session' && true) ||
              (phase.id === 'homework' && false);

            return (
              <React.Fragment key={phase.id}>
                <div
                  className={`flex flex-col items-center cursor-pointer transition ${
                    isActive ? 'opacity-100' : 'opacity-60 hover:opacity-80'
                  }`}
                  onClick={() => setCurrentPhase(phase.id as any)}
                >
                  <div
                    className={`w-12 h-12 rounded-full flex items-center justify-center mb-2 font-bold text-lg transition ${
                      isActive
                        ? 'bg-blue-600 text-white shadow-lg scale-110'
                        : isPassed
                          ? 'bg-green-100 text-green-600'
                          : 'bg-gray-200 text-gray-600'
                    }`}
                  >
                    {isPassed ? '✓' : phase.icon}
                  </div>
                  <p className="text-sm font-semibold text-gray-900">{phase.label}</p>
                  <p className="text-xs text-gray-600">{phase.description}</p>
                </div>

                {idx < phases.length - 1 && (
                  <div className="flex-1 h-1 bg-gradient-to-r from-blue-300 to-blue-200 mx-3" />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Main Content */}
      {currentPhase === 'pre-work' && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle>{preWorkAssignment.title}</CardTitle>
                  <CardDescription>{preWorkAssignment.description}</CardDescription>
                </div>
                {preWorkSubmitted && (
                  <div className="text-right">
                    <p className="text-xs text-gray-600 mb-1">Your Score</p>
                    <p className="text-3xl font-bold text-green-600">{preWorkScore}</p>
                    <p className="text-xs text-gray-600">/ {preWorkAssignment.pointsPossible}</p>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {!preWorkSubmitted ? (
                <>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Your Responses</label>
                    <textarea
                      value={responses}
                      onChange={(e) => setResponses(e.target.value)}
                      placeholder="Type or paste your responses here..."
                      className="w-full h-40 p-3 border rounded-lg focus:outline-none focus:border-blue-500 resize-none"
                    />
                  </div>
                  <button
                    onClick={() => onSubmitPreWork?.({ responses })}
                    className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-semibold"
                  >
                    Submit Pre-Work
                  </button>
                </>
              ) : (
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-green-700 font-semibold">✓ Submitted on {preWorkAssignment.dueDate ? new Date(preWorkAssignment.dueDate).toLocaleDateString() : 'Submitted'}</p>
                  <p className="text-sm text-green-600 mt-1">Great job completing the pre-work! Your tutor reviewed it and is ready to dive deeper in the live session.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {currentPhase === 'live-session' && (
        <div className="space-y-4">
          {/* Session Instructions */}
          <Card className="border-blue-300 bg-blue-50">
            <CardContent className="pt-6">
              <div className="flex gap-3">
                <span className="text-2xl">👥</span>
                <div>
                  <p className="font-semibold text-gray-900">Live Session Starting Soon</p>
                  <p className="text-sm text-gray-700 mt-1">
                    {tutorName} will be using a shared whiteboard to teach and mark up problems. You'll see all their annotations in real-time.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Session Assignment */}
          <Card>
            <CardHeader>
              <CardTitle>{sessionPhaseAssignment.title}</CardTitle>
              <CardDescription>{sessionPhaseAssignment.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="p-4 bg-gray-50 rounded-lg text-center">
                <p className="text-sm text-gray-600">Session will begin at the scheduled time.</p>
                <p className="text-lg font-semibold text-gray-900 mt-2">Your tutor will guide you through solving problems together</p>
              </div>
            </CardContent>
          </Card>

          {/* Tutor's Annotations from Session */}
          {showAnnotations && tutorAnnotations.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Tutor's Annotations & Marks</CardTitle>
                <CardDescription>Tutor feedback from the live session</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {tutorAnnotations.map((annotation) => (
                  <div key={annotation.id} className="flex gap-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <div className="text-2xl">
                      {annotation.type === 'highlight' ? '⭐' : annotation.type === 'correction' ? '✏️' : '💡'}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">{annotation.description}</p>
                      <p className="text-xs text-gray-600 mt-1">
                        {new Date(annotation.timestamp).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {currentPhase === 'homework' && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle>{homeworkAssignment.title}</CardTitle>
                  <CardDescription>{homeworkAssignment.description}</CardDescription>
                </div>
                {homeworkAssignment.dueDate && (
                  <div className="text-right">
                    <p className="text-xs text-gray-600">Due</p>
                    <p className="font-semibold text-gray-900">{new Date(homeworkAssignment.dueDate).toLocaleDateString()}</p>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Tips from Session */}
              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="font-semibold text-gray-900 mb-2">💡 Tips from Today's Session</p>
                <ul className="text-sm text-gray-700 space-y-1">
                  <li>✓ Remember to factor first before solving</li>
                  <li>✓ Always check both solutions in the original equation</li>
                  <li>✓ Use the quadratic formula when factoring doesn't work</li>
                </ul>
              </div>

              {!homeworkSubmitted ? (
                <>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Your Solutions</label>
                    <textarea
                      placeholder="Type your homework solutions here..."
                      className="w-full h-40 p-3 border rounded-lg focus:outline-none focus:border-blue-500 resize-none"
                    />
                  </div>
                  <button
                    onClick={() => onSubmitHomework?.({ responses: 'homework' })}
                    className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition font-semibold"
                  >
                    Submit Homework
                  </button>
                </>
              ) : (
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-green-700 font-semibold">✓ Submitted!</p>
                  <p className="text-sm text-green-600 mt-1">Your tutor will review and provide feedback.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Session Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Session Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <p className="text-sm text-gray-600 mb-1">Pre-Work</p>
              <p className={`text-2xl font-bold ${preWorkSubmitted ? 'text-green-600' : 'text-yellow-600'}`}>
                {preWorkSubmitted ? '✓' : '⏳'}
              </p>
              {preWorkSubmitted && <p className="text-xs text-gray-600 mt-1">Score: {preWorkScore}/{preWorkAssignment.pointsPossible}</p>}
            </div>

            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <p className="text-sm text-gray-600 mb-1">Live Session</p>
              <p className="text-2xl font-bold text-blue-600">◉</p>
              <p className="text-xs text-gray-600 mt-1">In Progress</p>
            </div>

            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <p className="text-sm text-gray-600 mb-1">Homework</p>
              <p className={`text-2xl font-bold ${homeworkSubmitted ? 'text-green-600' : 'text-gray-400'}`}>
                {homeworkSubmitted ? '✓' : '○'}
              </p>
              <p className="text-xs text-gray-600 mt-1">Next Step</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Toggle Annotations Button */}
      {currentPhase === 'live-session' && (
        <button
          onClick={() => setShowAnnotations(!showAnnotations)}
          className="w-full px-4 py-3 bg-blue-100 text-blue-700 hover:bg-blue-200 rounded-lg font-semibold transition"
        >
          {showAnnotations ? '👁️ Hide' : '👁️ View'} Tutor's Annotations
        </button>
      )}
    </div>
  );
}
