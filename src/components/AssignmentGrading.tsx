import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';

export interface StudentResponse {
  id: string;
  studentId: string;
  studentName?: string;
  attempt: number;
  score?: number;
  maxScore: number;
  submitted At: string;
  graded: boolean;
}

export interface AssignmentGradingProps {
  assignmentName?: string;
  responses?: StudentResponse[];
  onGradeResponse?: (responseId: string, score: number, notes?: string) => void;
  onBulkGrade?: (score: number) => void;
}

export default function AssignmentGrading({
  assignmentName = 'Assignment',
  responses = [],
  onGradeResponse,
  onBulkGrade,
}: AssignmentGradingProps) {
  const [sortBy, setSortBy] = useState<'name' | 'score' | 'submitted'>('name');
  const [filterGraded, setFilterGraded] = useState<'all' | 'graded' | 'ungraded'>('all');
  const [selectedResponse, setSelectedResponse] = useState<string | null>(null);
  const [manualGrade, setManualGrade] = useState('');
  const [manualNotes, setManualNotes] = useState('');
  const [bulkGradeValue, setBulkGradeValue] = useState('');
  const [showBulkModal, setShowBulkModal] = useState(false);

  const filteredResponses = responses.filter((r) => {
    if (filterGraded === 'graded') return r.graded;
    if (filterGraded === 'ungraded') return !r.graded;
    return true;
  });

  const sortedResponses = [...filteredResponses].sort((a, b) => {
    if (sortBy === 'name') {
      return (a.studentName || '').localeCompare(b.studentName || '');
    } else if (sortBy === 'score') {
      return (b.score || 0) - (a.score || 0);
    } else {
      return new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime();
    }
  });

  const selectedData = responses.find((r) => r.id === selectedResponse);

  const handleGradeSubmit = () => {
    if (!selectedResponse || !manualGrade) {
      alert('Please enter a grade');
      return;
    }

    onGradeResponse?.(selectedResponse, parseFloat(manualGrade), manualNotes);
    setSelectedResponse(null);
    setManualGrade('');
    setManualNotes('');
  };

  const handleBulkGrade = () => {
    if (!bulkGradeValue) {
      alert('Please enter a score');
      return;
    }

    onBulkGrade?.(parseFloat(bulkGradeValue));
    setBulkGradeValue('');
    setShowBulkModal(false);
  };

  const averageScore =
    responses.length > 0 && responses.some((r) => r.graded && r.score !== undefined)
      ? responses.filter((r) => r.graded).reduce((sum, r) => sum + (r.score || 0), 0) /
        responses.filter((r) => r.graded).length
      : 0;

  const submissionRate = ((responses.length / responses.length) * 100).toFixed(1);

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">{assignmentName}</h1>
        <p className="text-gray-600">Grade student responses</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-gray-600">Total Submissions</p>
            <p className="text-3xl font-bold text-gray-900">{responses.length}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-gray-600">Average Score</p>
            <p className="text-3xl font-bold text-gray-900">{averageScore.toFixed(1)}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-gray-600">Graded</p>
            <p className="text-3xl font-bold text-gray-900">
              {responses.filter((r) => r.graded).length}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-gray-600">Pending</p>
            <p className="text-3xl font-bold text-gray-900">
              {responses.filter((r) => !r.graded).length}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Controls */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-4">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex gap-2">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-4 py-2 border border-gray-300 rounded-lg"
            >
              <option value="name">Sort by Name</option>
              <option value="score">Sort by Score</option>
              <option value="submitted">Sort by Submitted</option>
            </select>

            <select
              value={filterGraded}
              onChange={(e) => setFilterGraded(e.target.value as any)}
              className="px-4 py-2 border border-gray-300 rounded-lg"
            >
              <option value="all">All Responses</option>
              <option value="graded">Graded Only</option>
              <option value="ungraded">Ungraded Only</option>
            </select>
          </div>

          <button
            onClick={() => setShowBulkModal(true)}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold"
          >
            Bulk Grade
          </button>
        </div>
      </div>

      {/* Responses Table */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-gray-100 border-b">
              <th className="text-left px-4 py-3 font-semibold">Student</th>
              <th className="text-center px-4 py-3 font-semibold">Score</th>
              <th className="text-center px-4 py-3 font-semibold">Max Score</th>
              <th className="text-center px-4 py-3 font-semibold">%</th>
              <th className="text-center px-4 py-3 font-semibold">Attempt</th>
              <th className="text-center px-4 py-3 font-semibold">Status</th>
              <th className="text-center px-4 py-3 font-semibold">Submitted</th>
              <th className="text-center px-4 py-3 font-semibold">Action</th>
            </tr>
          </thead>
          <tbody>
            {sortedResponses.map((response) => {
              const percentage =
                response.score !== undefined
                  ? ((response.score / response.maxScore) * 100).toFixed(1)
                  : '-';
              const scoreColor =
                response.score !== undefined
                  ? response.score >= response.maxScore * 0.8
                    ? 'text-green-600'
                    : response.score >= response.maxScore * 0.6
                      ? 'text-yellow-600'
                      : 'text-red-600'
                  : 'text-gray-600';

              return (
                <tr key={response.id} className="border-b hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">
                    {response.studentName || 'Student'}
                  </td>
                  <td className={`px-4 py-3 text-center font-bold ${scoreColor}`}>
                    {response.score !== undefined ? response.score : '-'}
                  </td>
                  <td className="px-4 py-3 text-center">{response.maxScore}</td>
                  <td className="px-4 py-3 text-center font-semibold">{percentage}%</td>
                  <td className="px-4 py-3 text-center">
                    <span className="text-sm bg-gray-100 px-2 py-1 rounded">
                      {response.attempt}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    {response.graded ? (
                      <span className="text-sm bg-green-100 text-green-800 px-2 py-1 rounded">
                        ✓ Graded
                      </span>
                    ) : (
                      <span className="text-sm bg-yellow-100 text-yellow-800 px-2 py-1 rounded">
                        ⏳ Pending
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center text-sm text-gray-600">
                    {new Date(response.submittedAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => setSelectedResponse(response.id)}
                      className="text-blue-600 hover:text-blue-700 font-medium"
                    >
                      {response.graded ? 'Update' : 'Grade'}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Grade Modal */}
      {selectedResponse && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-full max-w-lg">
            <CardHeader>
              <CardTitle>Grade Response</CardTitle>
              <CardDescription>
                {selectedData?.studentName || 'Student'} • Attempt {selectedData?.attempt || 1}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm text-gray-600">Current Score</p>
                <p className="text-2xl font-bold text-gray-900">
                  {selectedData?.score !== undefined ? selectedData.score : 'Not graded'}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Score (out of {selectedData?.maxScore || 0}) *
                </label>
                <input
                  type="number"
                  value={manualGrade}
                  onChange={(e) => setManualGrade(e.target.value)}
                  min="0"
                  max={selectedData?.maxScore || 100}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="0"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Feedback (optional)
                </label>
                <textarea
                  value={manualNotes}
                  onChange={(e) => setManualNotes(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={4}
                  placeholder="Provide feedback to the student..."
                />
              </div>

              <div className="flex gap-2 pt-4 border-t">
                <button
                  onClick={() => {
                    setSelectedResponse(null);
                    setManualGrade('');
                    setManualNotes('');
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleGradeSubmit}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Submit Grade
                </button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Bulk Grade Modal */}
      {showBulkModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-full max-w-sm">
            <CardHeader>
              <CardTitle>Bulk Grade Ungraded</CardTitle>
              <CardDescription>
                Apply same grade to all {responses.filter((r) => !r.graded).length} ungraded responses
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <input
                type="number"
                value={bulkGradeValue}
                onChange={(e) => setBulkGradeValue(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter score..."
              />

              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setShowBulkModal(false);
                    setBulkGradeValue('');
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleBulkGrade}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Apply
                </button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
