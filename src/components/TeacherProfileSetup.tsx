import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';

export interface TeacherProfileSetupProps {
  onProfileCreated?: (profile: any) => void;
  initialData?: any;
}

export default function TeacherProfileSetup({ onProfileCreated, initialData }: TeacherProfileSetupProps) {
  const [step, setStep] = useState<'info' | 'subjects' | 'credentials' | 'complete'>('info');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    name: initialData?.name || '',
    email: initialData?.email || '',
    subjects: initialData?.subjects || [],
    qualifications: initialData?.qualifications || '',
    hourlyRate: initialData?.hourlyRate || '',
    bio: initialData?.bio || '',
  });

  const [credentialFile, setCredentialFile] = useState<File | null>(null);
  const allSubjects = [
    'Mathematics',
    'Science',
    'English',
    'History',
    'Social Studies',
    'Physics',
    'Chemistry',
    'Biology',
    'Programming',
    'Art',
    'Music',
    'Foreign Languages',
  ];

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubjectToggle = (subject: string) => {
    setFormData((prev) => ({
      ...prev,
      subjects: prev.subjects.includes(subject)
        ? prev.subjects.filter((s: string) => s !== subject)
        : [...prev.subjects, subject],
    }));
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setCredentialFile(file);
    }
  };

  const handleNext = async () => {
    if (step === 'info') {
      if (!formData.name || !formData.email || !formData.qualifications) {
        setError('Please fill in all required fields');
        return;
      }
      setStep('subjects');
    } else if (step === 'subjects') {
      if (formData.subjects.length === 0) {
        setError('Please select at least one subject');
        return;
      }
      setStep('credentials');
    } else if (step === 'credentials') {
      setError('');
      setLoading(true);

      try {
        // Simulate credential upload
        await new Promise((resolve) => setTimeout(resolve, 1000));

        if (onProfileCreated) {
          onProfileCreated({
            ...formData,
            verified: false,
            verificationStatus: 'pending',
          });
        }

        setStep('complete');
      } catch (err) {
        setError('Failed to upload credentials');
      } finally {
        setLoading(false);
      }
    }
  };

  const handleBack = () => {
    if (step === 'subjects') setStep('info');
    else if (step === 'credentials') setStep('subjects');
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>Teacher Profile Setup</CardTitle>
          <CardDescription>
            {step === 'info' && 'Tell us about yourself'}
            {step === 'subjects' && 'What do you teach?'}
            {step === 'credentials' && 'Verify your credentials'}
            {step === 'complete' && 'Profile created successfully!'}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Progress Bar */}
          <div className="flex gap-2">
            {['info', 'subjects', 'credentials', 'complete'].map((s, idx) => (
              <div
                key={s}
                className={`flex-1 h-2 rounded-full transition-all ${
                  (['info', 'subjects', 'credentials', 'complete'].indexOf(step) >= idx)
                    ? 'bg-blue-500'
                    : 'bg-gray-200'
                }`}
              />
            ))}
          </div>

          {/* Step 1: Personal Info */}
          {step === 'info' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Full Name *</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Jane Smith"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Email *</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="jane@example.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Qualifications *
                </label>
                <textarea
                  name="qualifications"
                  value={formData.qualifications}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  placeholder="PhD in Mathematics, 10 years teaching experience..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Hourly Rate ($) - Optional
                </label>
                <input
                  type="number"
                  name="hourlyRate"
                  value={formData.hourlyRate}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="50"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Bio - Optional</label>
                <textarea
                  name="bio"
                  value={formData.bio}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  placeholder="Tell students a bit about your teaching style..."
                />
              </div>
            </div>
          )}

          {/* Step 2: Subjects */}
          {step === 'subjects' && (
            <div className="space-y-4">
              <p className="text-sm text-gray-600">Select all subjects you teach</p>
              <div className="grid grid-cols-2 gap-3">
                {allSubjects.map((subject) => (
                  <button
                    key={subject}
                    onClick={() => handleSubjectToggle(subject)}
                    className={`p-3 rounded-lg border-2 transition-all ${
                      formData.subjects.includes(subject)
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 bg-white hover:border-gray-300'
                    }`}
                  >
                    <div className="text-sm font-medium">{subject}</div>
                  </button>
                ))}
              </div>
              <p className="text-xs text-gray-500">Selected: {formData.subjects.length}</p>
            </div>
          )}

          {/* Step 3: Credentials */}
          {step === 'credentials' && (
            <div className="space-y-4">
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-400 transition-colors">
                <input
                  type="file"
                  onChange={handleFileUpload}
                  accept=".pdf,.jpg,.jpeg,.png"
                  className="hidden"
                  id="credential-upload"
                />
                <label htmlFor="credential-upload" className="cursor-pointer block">
                  <div className="text-4xl mb-2">📄</div>
                  <div className="text-sm font-medium text-gray-700">Upload Credentials</div>
                  <div className="text-xs text-gray-500 mt-1">
                    PDF, JPG or PNG (Max 5MB)
                  </div>
                </label>
              </div>

              {credentialFile && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-center gap-2">
                  <span className="text-green-600">✓</span>
                  <span className="text-sm text-gray-700">{credentialFile.name}</span>
                </div>
              )}

              <p className="text-sm text-gray-600">
                We'll review your credentials within 24 hours. You can start creating classes
                immediately!
              </p>
            </div>
          )}

          {/* Step 4: Complete */}
          {step === 'complete' && (
            <div className="text-center space-y-4">
              <div className="text-6xl mb-4">🎉</div>
              <h3 className="text-lg font-semibold text-gray-900">Profile Created!</h3>
              <p className="text-gray-600">
                Your profile is under review. We'll notify you once verified.
              </p>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
                <p className="text-sm text-blue-900">
                  ✓ You can start creating classes and assigning work right now!
                </p>
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2 justify-between pt-4 border-t">
            <button
              onClick={handleBack}
              disabled={step === 'info' || step === 'complete'}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Back
            </button>
            <button
              onClick={handleNext}
              disabled={loading}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Creating...' : step === 'complete' ? 'Get Started' : 'Next'}
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
