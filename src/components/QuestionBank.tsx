import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';

export interface Question {
  id: string;
  question: string;
  type: 'multiple-choice' | 'true-false' | 'short-answer' | 'fill-blank';
  difficulty: 1 | 2 | 3 | 4 | 5;
  topic?: string;
  points: number;
  usageCount: number;
}

export interface QuestionBankProps {
  classId?: string;
  questions?: Question[];
  onCreateQuestion?: (data: any) => void;
  onEditQuestion?: (id: string, data: any) => void;
  onDeleteQuestion?: (id: string) => void;
  onBulkImport?: (csvData: string) => void;
  onSearch?: (filters: any) => void;
}

export default function QuestionBank({
  classId,
  questions = [],
  onCreateQuestion,
  onEditQuestion,
  onDeleteQuestion,
  onBulkImport,
  onSearch,
}: QuestionBankProps) {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<string | null>(null);
  const [searchFilters, setSearchFilters] = useState({
    topic: '',
    difficulty: '',
    type: '',
  });

  const [formData, setFormData] = useState({
    question: '',
    type: 'multiple-choice' as any,
    difficulty: 3,
    topic: '',
    options: '',
    correctAnswer: '',
    points: 1,
    timeLimit: '',
  });

  const [csvContent, setCsvContent] = useState('');

  const resetForm = () => {
    setFormData({
      question: '',
      type: 'multiple-choice',
      difficulty: 3,
      topic: '',
      options: '',
      correctAnswer: '',
      points: 1,
      timeLimit: '',
    });
    setEditingQuestion(null);
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === 'difficulty' || name === 'points' ? parseInt(value) : value,
    }));
  };

  const handleSaveQuestion = () => {
    if (!formData.question || !formData.correctAnswer) {
      alert('Please fill in all required fields');
      return;
    }

    const questionData = {
      ...formData,
      options: formData.options ? formData.options.split('|') : undefined,
    };

    if (editingQuestion) {
      onEditQuestion?.(editingQuestion, questionData);
    } else {
      onCreateQuestion?.(questionData);
    }

    setShowCreateModal(false);
    resetForm();
  };

  const handleBulkImport = () => {
    if (!csvContent.trim()) {
      alert('Please paste CSV content');
      return;
    }

    onBulkImport?.(csvContent);
    setCsvContent('');
    setShowImportModal(false);
  };

  const handleSearch = () => {
    onSearch?.(searchFilters);
  };

  const getDifficultyColor = (difficulty: number) => {
    switch (difficulty) {
      case 1:
        return 'bg-green-100 text-green-800';
      case 2:
        return 'bg-blue-100 text-blue-800';
      case 3:
        return 'bg-yellow-100 text-yellow-800';
      case 4:
        return 'bg-orange-100 text-orange-800';
      case 5:
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'multiple-choice':
        return '○';
      case 'true-false':
        return '✓';
      case 'short-answer':
        return '✎';
      case 'fill-blank':
        return '_';
      default:
        return '?';
    }
  };

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Question Bank</h1>
          <p className="text-gray-600">Create and manage questions</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => {
              resetForm();
              setShowCreateModal(true);
            }}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold"
          >
            + New Question
          </button>
          <button
            onClick={() => setShowImportModal(true)}
            className="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 font-semibold"
          >
            Import CSV
          </button>
        </div>
      </div>

      {/* Search & Filter */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-4">
        <div className="grid grid-cols-3 gap-4">
          <input
            type="text"
            placeholder="Search topic..."
            value={searchFilters.topic}
            onChange={(e) => setSearchFilters((p) => ({ ...p, topic: e.target.value }))}
            className="px-4 py-2 border border-gray-300 rounded-lg"
          />
          <select
            value={searchFilters.difficulty}
            onChange={(e) => setSearchFilters((p) => ({ ...p, difficulty: e.target.value }))}
            className="px-4 py-2 border border-gray-300 rounded-lg"
          >
            <option value="">All difficulties</option>
            <option value="1">Easy (1)</option>
            <option value="2">Medium (2)</option>
            <option value="3">Normal (3)</option>
            <option value="4">Hard (4)</option>
            <option value="5">Expert (5)</option>
          </select>
          <select
            value={searchFilters.type}
            onChange={(e) => setSearchFilters((p) => ({ ...p, type: e.target.value }))}
            className="px-4 py-2 border border-gray-300 rounded-lg"
          >
            <option value="">All types</option>
            <option value="multiple-choice">Multiple Choice</option>
            <option value="true-false">True/False</option>
            <option value="short-answer">Short Answer</option>
            <option value="fill-blank">Fill in Blank</option>
          </select>
        </div>
        <button
          onClick={handleSearch}
          className="w-full px-4 py-2 bg-gray-100 text-gray-900 rounded-lg hover:bg-gray-200"
        >
          Search
        </button>
      </div>

      {/* Questions Table */}
      {questions.length > 0 ? (
        <div className="max-w-full min-w-0 overflow-x-auto overscroll-x-contain touch-pan-x [-webkit-overflow-scrolling:touch]">
          <table className="w-full min-w-max border-collapse">
            <thead>
              <tr className="bg-gray-100 border-b">
                <th className="text-left px-4 py-3 font-semibold">Question</th>
                <th className="text-center px-4 py-3 font-semibold">Type</th>
                <th className="text-center px-4 py-3 font-semibold">Difficulty</th>
                <th className="text-center px-4 py-3 font-semibold">Points</th>
                <th className="text-center px-4 py-3 font-semibold">Used</th>
                <th className="text-center px-4 py-3 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {questions.map((q) => (
                <tr key={q.id} className="border-b hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900 line-clamp-2">{q.question}</p>
                    {q.topic && <p className="text-xs text-gray-500 mt-1">📚 {q.topic}</p>}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="text-sm">{getTypeIcon(q.type)}</span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`px-3 py-1 rounded text-sm font-medium ${getDifficultyColor(q.difficulty)}`}>
                      {q.difficulty}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center font-semibold">{q.points}</td>
                  <td className="px-4 py-3 text-center text-gray-600">{q.usageCount}x</td>
                  <td className="px-4 py-3 text-center space-x-2">
                    <button
                      onClick={() => alert('Edit feature coming soon')}
                      className="text-blue-600 hover:text-blue-700 font-medium"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => onDeleteQuestion?.(q.id)}
                      className="text-red-600 hover:text-red-700 font-medium"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <Card>
          <CardContent className="text-center py-12">
            <div className="text-6xl mb-4">❓</div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No questions yet</h3>
            <p className="text-gray-600">Create your first question or import from CSV</p>
          </CardContent>
        </Card>
      )}

      {/* Create/Edit Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-full max-w-2xl">
            <CardHeader>
              <CardTitle>{editingQuestion ? 'Edit Question' : 'Create Question'}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Question *</label>
                <textarea
                  name="question"
                  value={formData.question}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  placeholder="Enter question text..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Type *</label>
                  <select
                    name="type"
                    value={formData.type}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  >
                    <option value="multiple-choice">Multiple Choice</option>
                    <option value="true-false">True/False</option>
                    <option value="short-answer">Short Answer</option>
                    <option value="fill-blank">Fill in Blank</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Difficulty</label>
                  <select
                    name="difficulty"
                    value={formData.difficulty}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  >
                    {[1, 2, 3, 4, 5].map((d) => (
                      <option key={d} value={d}>
                        {d} - {['Easy', 'Medium', 'Normal', 'Hard', 'Expert'][d - 1]}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Topic</label>
                  <input
                    type="text"
                    name="topic"
                    value={formData.topic}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    placeholder="e.g., Algebra"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Points</label>
                  <input
                    type="number"
                    name="points"
                    value={formData.points}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    min="1"
                  />
                </div>
              </div>

              {formData.type === 'multiple-choice' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Options (separated by |)
                  </label>
                  <input
                    type="text"
                    name="options"
                    value={formData.options}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    placeholder="Option A | Option B | Option C | Option D"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Correct Answer *</label>
                <input
                  type="text"
                  name="correctAnswer"
                  value={formData.correctAnswer}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  placeholder="Answer or index (0 for first option)"
                />
              </div>

              <div className="flex gap-2 pt-4 border-t">
                <button
                  onClick={() => {
                    setShowCreateModal(false);
                    resetForm();
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveQuestion}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  {editingQuestion ? 'Update' : 'Create'} Question
                </button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-full max-w-2xl">
            <CardHeader>
              <CardTitle>Import Questions from CSV</CardTitle>
              <CardDescription>
                Format: question, type, difficulty, correctAnswer, options, points, topic
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <textarea
                value={csvContent}
                onChange={(e) => setCsvContent(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={8}
                placeholder={`What is 2+2?, multiple-choice, 1, 0, 2|3|4|5, 1, Math
Is the sky blue?, true-false, 1, true, , 1, General
Capital of France?, short-answer, 1, Paris, , 1, Geography`}
              />

              <div className="flex gap-2 pt-4 border-t">
                <button
                  onClick={() => {
                    setShowImportModal(false);
                    setCsvContent('');
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleBulkImport}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Import
                </button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
