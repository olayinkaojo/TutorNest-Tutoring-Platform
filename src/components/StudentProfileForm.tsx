import { useState } from 'react';
import { projectId } from '../utils/supabase/info';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Textarea } from './ui/textarea';
import { Checkbox } from './ui/checkbox';
import { Alert, AlertDescription } from './ui/alert';
import { AlertCircle } from 'lucide-react';

interface StudentProfileFormProps {
  session: any;
  onComplete: () => void;
}

export function StudentProfileForm({ session, onComplete }: StudentProfileFormProps) {
  const [formData, setFormData] = useState({
    firstName: '',
    age: '',
    yearGroup: '',
    subjects: [] as string[],
    goals: '',
    senType: '',
    senOtherDetails: '',
    learningPreferences: '',
    examBoard: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const yearGroups = [
    'Year 1',
    'Year 2',
    'Year 3',
    'Year 4',
    'Year 5',
    'Year 6',
    'Year 7',
    'Year 8',
    'Year 9',
    'Year 10',
    'Year 11',
    'Year 12',
    'Year 13',
  ];

  const availableSubjects = [
    'Mathematics',
    'English',
    'Science',
    'Physics',
    'Chemistry',
    'Biology',
    'History',
    'Geography',
    'Computer Science',
    'Languages',
  ];

  const senTypes = [
    'None',
    'Dyslexia',
    'Dyscalculia',
    'Dysgraphia',
    'ADHD (Attention Deficit Hyperactivity Disorder)',
    'ASD (Autism Spectrum Disorder)',
    'Dyspraxia',
    'Speech and Language Difficulties',
    'Hearing Impairment',
    'Visual Impairment',
    'Physical Disability',
    'Other',
  ];

  const handleSubjectToggle = (subject: string) => {
    setFormData((prev) => ({
      ...prev,
      subjects: prev.subjects.includes(subject)
        ? prev.subjects.filter((s) => s !== subject)
        : [...prev.subjects, subject],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (formData.subjects.length === 0) {
      setError('Please select at least one subject.');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-cbd74580/profile/complete`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify(formData),
        }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to save profile');
      }

      onComplete();
    } catch (err: any) {
      console.error('Error saving student profile:', err);
      setError(err.message || 'An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-green-50 flex items-center justify-center p-4 sm:p-6 md:p-8">
      <div className="w-full max-w-2xl">
        <div className="bg-white rounded-3xl shadow-xl p-6 sm:p-8">
          <h1 className="mb-2">Complete Your Student Profile</h1>
          <p className="text-gray-600 mb-6 sm:mb-8">
            Tell us about your academic journey and learning goals
          </p>

          {error && (
            <Alert className="mb-6 bg-red-50 border-red-200">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-800">{error}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="firstName">First Name / Nickname</Label>
                <Input
                  id="firstName"
                  type="text"
                  value={formData.firstName}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                  placeholder="Enter your name"
                  className="mt-2 h-12"
                  required
                />
              </div>

              <div>
                <Label htmlFor="age">Age</Label>
                <Input
                  id="age"
                  type="number"
                  min="5"
                  max="25"
                  value={formData.age}
                  onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                  placeholder="Your age"
                  className="mt-2 h-12"
                  required
                />
              </div>
            </div>

            <div>
              <Label htmlFor="yearGroup">School Year</Label>
              <Select
                value={formData.yearGroup}
                onValueChange={(value) => setFormData({ ...formData, yearGroup: value })}
              >
                <SelectTrigger className="mt-2 h-12">
                  <SelectValue placeholder="Select your year group" />
                </SelectTrigger>
                <SelectContent>
                  {yearGroups.map((year) => (
                    <SelectItem key={year} value={year}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Subjects (select all that apply)</Label>
              <div className="grid md:grid-cols-2 gap-3 mt-2">
                {availableSubjects.map((subject) => (
                  <div key={subject} className="flex items-center space-x-2">
                    <Checkbox
                      id={subject}
                      checked={formData.subjects.includes(subject)}
                      onCheckedChange={() => handleSubjectToggle(subject)}
                    />
                    <label htmlFor={subject} className="text-sm cursor-pointer">
                      {subject}
                    </label>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <Label htmlFor="goals">Learning Goals</Label>
              <Textarea
                id="goals"
                value={formData.goals}
                onChange={(e) => setFormData({ ...formData, goals: e.target.value })}
                placeholder="What do you want to achieve? (e.g., improve grades, prepare for exams)"
                className="mt-2"
                rows={3}
                required
              />
            </div>

            <div>
              <Label htmlFor="examBoard">Exam Board (optional)</Label>
              <Input
                id="examBoard"
                type="text"
                value={formData.examBoard}
                onChange={(e) => setFormData({ ...formData, examBoard: e.target.value })}
                placeholder="e.g., AQA, Edexcel, OCR"
                className="mt-2"
              />
            </div>

            <div>
              <Label htmlFor="learningPreferences">Learning Preferences (optional)</Label>
              <Textarea
                id="learningPreferences"
                value={formData.learningPreferences}
                onChange={(e) => setFormData({ ...formData, learningPreferences: e.target.value })}
                placeholder="How do you learn best? Any specific needs or preferences?"
                className="mt-2"
                rows={2}
              />
            </div>

            <div>
              <Label htmlFor="senType">Special Educational Needs (SEN) Type (optional)</Label>
              <Select
                value={formData.senType}
                onValueChange={(value) => setFormData({ ...formData, senType: value, senOtherDetails: value !== 'Other' ? '' : formData.senOtherDetails })}
              >
                <SelectTrigger className="mt-2 h-12">
                  <SelectValue placeholder="Select your SEN type" />
                </SelectTrigger>
                <SelectContent>
                  {senTypes.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {formData.senType === 'Other' && (
              <div>
                <Label htmlFor="senOtherDetails">Please specify your SEN type</Label>
                <Textarea
                  id="senOtherDetails"
                  value={formData.senOtherDetails}
                  onChange={(e) => setFormData({ ...formData, senOtherDetails: e.target.value })}
                  placeholder="Describe your specific SEN or learning support requirements"
                  className="mt-2"
                  rows={2}
                />
              </div>
            )}

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-12 text-white"
              style={{ backgroundColor: '#625d9c' }}
            >
              {loading ? 'Saving...' : 'Complete Profile'}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}