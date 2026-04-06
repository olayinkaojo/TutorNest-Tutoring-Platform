import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';

export interface CreateAssignmentProps {
  classId?: string;
  questions?: any[];
  onCreateAssignment?: (data: any) => void;
  onCancel?: () => void;
}

export default function CreateAssignment({
  classId,
  questions = [],
  onCreateAssignment,
  onCancel,
}: CreateAssignmentProps) {
  const [step, setStep] = useState<'details' | 'questions' | 'settings' | 'preview'>('details');
  const [selectedQuestions, setSelectedQuestions] = useState<string[]>([]);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    type: 'homework' as 'homework' | 'quiz' | 'test',
    dueDate: '',
    dueTime: '23:59',
    releaseDate: '',
    releaseTime: '00:00',
    lockDate: '',
    lockTime: '23:59',
    attemptLimit: 1,
    showCorrectAnswers: 'after-due' as 'after-due' | 'never' | 'immediately',
    gradeWeight: 10,
    autoGrade: true,
  });

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target as any;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value,
    }));
  };

  const handleQuestionToggle = (questionId: string) => {
    setSelectedQuestions((prev) =>
      prev.includes(questionId) ? prev.filter((q) => q !== questionId) : [...prev, questionId]
    );
  };

  const handleNext = () => {
    if (step === 'details') {
      if (!formData.name || !formData.dueDate) {
        alert('Please fill in required fields');
        return;
      }
      setStep('questions');
    } else if (step === 'questions') {
      if (selectedQuestions.length === 0) {
        alert('Please select at least one question');
        return;
      }
      setStep('settings');
    } else if (step === 'settings') {
      setStep('preview');
    }
  };

  const handleBack = () => {
    if (step === 'questions') setStep('details');
    else if (step === 'settings') setStep('questions');
    else if (step === 'preview') setStep('settings');
  };

  const handleCreate = () => {
    const totalPoints = questions
      .filter((q) => selectedQuestions.includes(q.id))
      .reduce((sum, q) => sum + (q.points || 1), 0);

    const assignmentData = {
      ...formData,
      questionIds: selectedQuestions,
      dueDate: `${formData.dueDate}T${formData.dueTime}:00`,
      releaseDate: `${formData.releaseDate}T${formData.releaseTime}:00`,
      lockDate: formData.lockDate ? `${formData.lockDate}T${formData.lockTime}:00` : undefined,
      totalPoints,
    };

    onCreateAssignment?.(assignmentData);
  };

  const totalPoints = questions
    .filter((q) => selectedQuestions.includes(q.id))
    .reduce((sum, q) => sum + (q.points || 1), 0);

  return (
    <div className="w-full max-w-3xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>Create Assignment</CardTitle>
          <CardDescription>
            {step === 'details' && 'Basic information'}
            {step === 'questions' && 'Select questions'}
            {step === 'settings' && 'Configure settings'}
            {step === 'preview' && 'Review & publish'}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Progress Bar */}
          <div className="flex gap-2">
            {['details', 'questions', 'settings', 'preview'].map((s, idx) => (
              <div
                key={s}
                className={`flex-1 h-2 rounded-full transition-all ${
                  ['details', 'questions', 'settings', 'preview'].indexOf(step) >= idx
                    ? 'bg-blue-500'
                    : 'bg-gray-200'
                }`}
              />
            ))}
          </div>

          {/* Step 1: Details */}
          {step === 'details' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Assignment Name *
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Quiz 1: Algebra Basics"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  placeholder="Assignment instructions and guidelines..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Type</label>
                  <select
                    name="type"
                    value={formData.type}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  >
                    <option value="homework">Homework</option>
                    <option value="quiz">Quiz</option>
                    <option value="test">Test</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Grade Weight</label>
                  <input
                    type="number"
                    name="gradeWeight"
                    value={formData.gradeWeight}
                    onChange={handleInputChange}
                    min="0"
                    max="100"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Release Date *</label>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="date"
                    name="releaseDate"
                    value={formData.releaseDate}
                    onChange={handleInputChange}
                    className="px-4 py-2 border border-gray-300 rounded-lg"
                  />
                  <input
                    type="time"
                    name="releaseTime"
                    value={formData.releaseTime}
                    onChange={handleInputChange}
                    className="px-4 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Due Date *</label>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="date"
                    name="dueDate"
                    value={formData.dueDate}
                    onChange={handleInputChange}
                    className="px-4 py-2 border border-gray-300 rounded-lg"
                  />
                  <input
                    type="time"
                    name="dueTime"
                    value={formData.dueTime}
                    onChange={handleInputChange}
                    className="px-4 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Lock Date (optional)
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="date"
                    name="lockDate"
                    value={formData.lockDate}
                    onChange={handleInputChange}
                    className="px-4 py-2 border border-gray-300 rounded-lg"
                  />
                  <input
                    type="time"
                    name="lockTime"
                    value={formData.lockTime}
                    onChange={handleInputChange}
                    className="px-4 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Questions */}
          {step === 'questions' && (
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                Selected: {selectedQuestions.length} questions ({totalPoints} points)
              </p>

              <div className="space-y-2 max-h-96 overflow-y-auto border border-gray-200 rounded-lg p-4">
                {questions.length > 0 ? (
                  questions.map((q) => (
                    <label key={q.id} className="flex items-start gap-3 p-3 hover:bg-gray-50 rounded">
                      <input
                        type="checkbox"
                        checked={selectedQuestions.includes(q.id)}
                        onChange={() => handleQuestionToggle(q.id)}
                        className="w-5 h-5 mt-1"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 line-clamp-2">{q.question}</p>
                        <div className="flex gap-2 mt-1 flex-wrap">
                          <span className="text-xs bg-gray-100 px-2 py-1 rounded">
                            {q.points} pts
                          </span>
                          <span className="text-xs bg-gray-100 px-2 py-1 rounded">
                            Diff: {q.difficulty}
                          </span>
                        </div>
                      </div>
                    </label>
                  ))
                ) : (
                  <p className="text-gray-500 text-center py-8">No questions available</p>
                )}
              </div>
            </div>
          )}

          {/* Step 3: Settings */}
          {step === 'settings' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Attempt Limit
                  </label>
                  <select
                    name="attemptLimit"
                    value={formData.attemptLimit}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  >
                    <option value="1">1 Attempt</option>
                    <option value="3">3 Attempts</option>
                    <option value="999">Unlimited</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Show Correct Answers
                  </label>
                  <select
                    name="showCorrectAnswers"
                    value={formData.showCorrectAnswers}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  >
                    <option value="immediately">Immediately</option>
                    <option value="after-due">After Due Date</option>
                    <option value="never">Never</option>
                  </select>
                </div>
              </div>

              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  name="autoGrade"
                  checked={formData.autoGrade}
                  onChange={handleInputChange}
                  className="w-4 h-4"
                />
                <span className="text-sm text-gray-700">
                  Auto-grade this assignment (based on correct answers)
                </span>
              </label>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-900">
                  <strong>Auto-grading:</strong> MC and T/F questions will be automatically graded.
                  Other questions will need manual review.
                </p>
              </div>
            </div>
          )}

          {/* Step 4: Preview */}
          {step === 'preview' && (
            <div className="space-y-4">
              <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                <div>
                  <p className="text-sm text-gray-600">Assignment Name</p>
                  <p className="font-bold text-gray-900">{formData.name}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Type</p>
                  <p className="font-bold text-gray-900 capitalize">{formData.type}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Questions & Points</p>
                  <p className="font-bold text-gray-900">
                    {selectedQuestions.length} questions • {totalPoints} points
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Available Period</p>
                  <p className="font-bold text-gray-900">
                    {formData.releaseDate} to {formData.dueDate}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Settings</p>
                  <p className="font-bold text-gray-900">
                    {formData.attemptLimit === '999' ? 'Unlimited' : formData.attemptLimit} attempts •
                    Auto-grade: {formData.autoGrade ? 'Yes' : 'No'}
                  </p>
                </div>
              </div>

              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <p className="text-sm text-green-900">✓ Ready to publish!</p>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2 justify-between pt-4 border-t">
            <button
              onClick={step === 'details' ? onCancel : handleBack}
              className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
            >
              {step === 'details' ? 'Cancel' : 'Back'}
            </button>
            {step !== 'preview' ? (
              <button
                onClick={handleNext}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Next
              </button>
            ) : (
              <button
                onClick={handleCreate}
                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                Publish Assignment
              </button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
