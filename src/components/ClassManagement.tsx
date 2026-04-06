import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';

export interface TeacherClass {
  id: string;
  name: string;
  subject: string;
  level: string;
  schedule?: string;
  description?: string;
  studentCount: number;
  inviteCode: string;
  enrollmentOpen: boolean;
}

export interface ClassManagementProps {
  classes?: TeacherClass[];
  onCreateClass?: (classData: any) => void;
  onEditClass?: (classId: string, data: any) => void;
  onDeleteClass?: (classId: string) => void;
  onCopyInviteCode?: (code: string) => void;
}

export default function ClassManagement({
  classes = [],
  onCreateClass,
  onEditClass,
  onDeleteClass,
  onCopyInviteCode,
}: ClassManagementProps) {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingClass, setEditingClass] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    subject: '',
    level: '',
    schedule: '',
    description: '',
    maxStudents: '',
    enrollmentOpen: true,
  });

  const [showRoster, setShowRoster] = useState<string | null>(null);
  const [mockMembers] = useState([
    { id: 'student1', name: 'John Doe', email: 'john@example.com' },
    { id: 'student2', name: 'Jane Smith', email: 'jane@example.com' },
    { id: 'student3', name: 'Bob Johnson', email: 'bob@example.com' },
  ]);

  const resetForm = () => {
    setFormData({
      name: '',
      subject: '',
      level: '',
      schedule: '',
      description: '',
      maxStudents: '',
      enrollmentOpen: true,
    });
    setEditingClass(null);
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target as any;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value,
    }));
  };

  const handleSaveClass = () => {
    if (!formData.name || !formData.subject || !formData.level) {
      alert('Please fill in all required fields');
      return;
    }

    if (editingClass) {
      onEditClass?.(editingClass, formData);
    } else {
      onCreateClass?.(formData);
    }

    setShowCreateModal(false);
    resetForm();
  };

  const handleDeleteClick = (classId: string) => {
    if (confirm('Are you sure you want to delete this class?')) {
      onDeleteClass?.(classId);
    }
  };

  const subjectOptions = [
    'Mathematics',
    'Science',
    'English',
    'History',
    'Social Studies',
    'Physics',
    'Chemistry',
    'Biology',
  ];

  const levelOptions = ['Beginner', 'Intermediate', 'Advanced', 'Expert'];

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">My Classes</h1>
          <p className="text-gray-600">Manage your classes and students</p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setShowCreateModal(true);
          }}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold"
        >
          + Create Class
        </button>
      </div>

      {/* Create/Edit Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-full max-w-lg">
            <CardHeader>
              <CardTitle>{editingClass ? 'Edit Class' : 'Create New Class'}</CardTitle>
              <CardDescription>Fill in the details to {editingClass ? 'update' : 'create'} your class</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Class Name *</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="AP Calculus 2026"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Subject *</label>
                  <select
                    name="subject"
                    value={formData.subject}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select subject</option>
                    {subjectOptions.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Level *</label>
                  <select
                    name="level"
                    value={formData.level}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select level</option>
                    {levelOptions.map((l) => (
                      <option key={l} value={l}>
                        {l}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Schedule</label>
                <input
                  type="text"
                  name="schedule"
                  value={formData.schedule}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="MWF 3:00-4:00 PM"
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
                  placeholder="Course description..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Max Students</label>
                <input
                  type="number"
                  name="maxStudents"
                  value={formData.maxStudents}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="30"
                />
              </div>

              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  name="enrollmentOpen"
                  checked={formData.enrollmentOpen}
                  onChange={handleInputChange}
                  className="w-4 h-4"
                />
                <span className="text-sm text-gray-700">Allow student enrollment</span>
              </label>

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
                  onClick={handleSaveClass}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  {editingClass ? 'Update' : 'Create'} Class
                </button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Classes Grid */}
      {classes.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {classes.map((classItem) => (
            <Card key={classItem.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg">{classItem.name}</CardTitle>
                    <CardDescription>
                      {classItem.subject} • {classItem.level}
                    </CardDescription>
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => setShowRoster(showRoster === classItem.id ? null : classItem.id)}
                      className="p-2 hover:bg-gray-100 rounded"
                      title="View roster"
                    >
                      👥
                    </button>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                {/* Class Info */}
                <div className="space-y-2 text-sm">
                  {classItem.schedule && (
                    <div className="flex items-center gap-2 text-gray-600">
                      <span>🕒</span> {classItem.schedule}
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-gray-600">
                    <span>👥</span> {classItem.studentCount} students
                  </div>
                  <div className="flex items-center gap-2 text-gray-600">
                    <span>📝</span> {classItem.enrollmentOpen ? 'Open enrollment' : 'Closed'}
                  </div>
                </div>

                {/* Invite Code */}
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-600 mb-1">Invite Code</p>
                  <div className="flex items-center gap-2">
                    <code className="text-sm font-mono font-bold">{classItem.inviteCode}</code>
                    <button
                      onClick={() => {
                        onCopyInviteCode?.(classItem.inviteCode);
                        alert('Invite code copied!');
                      }}
                      className="text-blue-600 hover:text-blue-700"
                      title="Copy code"
                    >
                      📋
                    </button>
                  </div>
                </div>

                {/* Student Roster - Expandable */}
                {showRoster === classItem.id && (
                  <div className="border-t pt-3 space-y-2">
                    <p className="text-xs font-medium text-gray-600 uppercase">Students</p>
                    {mockMembers.length > 0 ? (
                      <div className="space-y-1">
                        {mockMembers.map((member) => (
                          <div key={member.id} className="flex items-center justify-between text-sm">
                            <div>
                              <p className="font-medium">{member.name}</p>
                              <p className="text-gray-500">{member.email}</p>
                            </div>
                            <button
                              onClick={() => alert('Remove student')}
                              className="text-red-600 hover:text-red-700"
                              title="Remove student"
                            >
                              ✕
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500">No students yet</p>
                    )}
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-2 pt-3 border-t">
                  <button
                    onClick={() => {
                      setFormData({
                        name: classItem.name,
                        subject: classItem.subject,
                        level: classItem.level,
                        schedule: classItem.schedule || '',
                        description: classItem.description || '',
                        maxStudents: '',
                        enrollmentOpen: classItem.enrollmentOpen,
                      });
                      setEditingClass(classItem.id);
                      setShowCreateModal(true);
                    }}
                    className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded hover:bg-gray-50"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDeleteClick(classItem.id)}
                    className="flex-1 px-3 py-2 text-sm border border-red-300 text-red-600 rounded hover:bg-red-50"
                  >
                    Delete
                  </button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="text-center py-12">
            <div className="text-6xl mb-4">📚</div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No classes yet</h3>
            <p className="text-gray-600 mb-4">Create your first class to get started</p>
            <button
              onClick={() => {
                resetForm();
                setShowCreateModal(true);
              }}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Create Class
            </button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
