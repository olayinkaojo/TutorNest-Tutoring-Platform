import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Checkbox } from './ui/checkbox';
import { Alert, AlertDescription } from './ui/alert';
import { AlertCircle, Loader2 } from 'lucide-react';
import { projectId, publicAnonKey } from '../utils/supabase/info';

interface AddChildDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  parentId: string;
  accessToken: string;
  onChildAdded: () => void;
}

const AVAILABLE_SUBJECTS = [
  'Mathematics',
  'English Language',
  'English Literature',
  'Science',
  'Biology',
  'Chemistry',
  'Physics',
  'History',
  'Geography',
  'French',
  'Spanish',
  'German',
  'Mandarin',
  'Computer Science',
  'Information Technology',
  'Art & Design',
  'Music',
  'Drama',
  'Physical Education',
  'Business Studies',
  'Economics',
  'Psychology',
  'Sociology',
  'Religious Studies',
  'Philosophy',
];

export function AddChildDialog({ open, onOpenChange, parentId, accessToken, onChildAdded }: AddChildDialogProps) {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    dateOfBirth: '',
    gradeLevel: '',
    learningGoals: '',
    specialNeeds: '',
  });
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const toggleSubject = (subject: string) => {
    setSelectedSubjects(prev => 
      prev.includes(subject)
        ? prev.filter(s => s !== subject)
        : [...prev, subject]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (selectedSubjects.length === 0) {
      setError('Please select at least one subject');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-cbd74580/parent/add-child`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            parentId,
            ...formData,
            subjects: selectedSubjects,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to add child');
      }

      // Reset form
      setFormData({
        firstName: '',
        lastName: '',
        dateOfBirth: '',
        gradeLevel: '',
        learningGoals: '',
        specialNeeds: '',
      });
      setSelectedSubjects([]);

      onChildAdded();
      onOpenChange(false);
    } catch (err: any) {
      console.error('Error adding child:', err);
      setError(err.message || 'Failed to add child. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Child Profile</DialogTitle>
          <DialogDescription>
            Create a profile for your child to start their learning journey
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="firstName">First Name *</Label>
              <Input
                id="firstName"
                value={formData.firstName}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                required
                placeholder="Enter first name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="lastName">Last Name *</Label>
              <Input
                id="lastName"
                value={formData.lastName}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                required
                placeholder="Enter last name"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="dateOfBirth">Date of Birth *</Label>
            <Input
              id="dateOfBirth"
              type="date"
              value={formData.dateOfBirth}
              onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="gradeLevel">Grade Level *</Label>
            <Select value={formData.gradeLevel} onValueChange={(value) => setFormData({ ...formData, gradeLevel: value })}>
              <SelectTrigger id="gradeLevel">
                <SelectValue placeholder="Select grade level" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="nursery_1">Nursery 1 (Pre-Primary)</SelectItem>
                <SelectItem value="nursery_2">Nursery 2 (Pre-Primary)</SelectItem>
                <SelectItem value="nursery_3">Nursery 3 / Reception</SelectItem>
                <SelectItem value="primary_1">Primary 1 (P1) – Year 1</SelectItem>
                <SelectItem value="primary_2">Primary 2 (P2) – Year 2</SelectItem>
                <SelectItem value="primary_3">Primary 3 (P3) – Year 3</SelectItem>
                <SelectItem value="primary_4">Primary 4 (P4) – Year 4</SelectItem>
                <SelectItem value="primary_5">Primary 5 (P5) – Year 5</SelectItem>
                <SelectItem value="primary_6">Primary 6 (P6) – Year 6</SelectItem>
                <SelectItem value="secondary_7">JSS 1 (Junior Secondary 1) – Year 7</SelectItem>
                <SelectItem value="secondary_8">JSS 2 – Year 8</SelectItem>
                <SelectItem value="secondary_9">JSS 3 – Year 9</SelectItem>
                <SelectItem value="secondary_10">SS 1 (Senior Secondary 1) – Year 10</SelectItem>
                <SelectItem value="secondary_11">SS 2 – Year 11</SelectItem>
                <SelectItem value="sixth_form_12">SS 3 – Year 12 / College</SelectItem>
                <SelectItem value="sixth_form_13">Post-Secondary</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Subjects Interested In *</Label>
            <p className="text-xs text-gray-500 mb-3">Select all subjects your child is interested in (minimum 1 required)</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-4 border rounded-lg bg-gray-50 max-h-64 overflow-y-auto">
              {AVAILABLE_SUBJECTS.map(subject => (
                <div key={subject} className="flex items-center space-x-2">
                  <Checkbox
                    id={subject}
                    checked={selectedSubjects.includes(subject)}
                    onCheckedChange={() => toggleSubject(subject)}
                  />
                  <label
                    htmlFor={subject}
                    className="text-sm cursor-pointer select-none"
                  >
                    {subject}
                  </label>
                </div>
              ))}
            </div>
            {selectedSubjects.length > 0 && (
              <p className="text-xs text-gray-600">
                Selected: {selectedSubjects.length} subject{selectedSubjects.length !== 1 ? 's' : ''}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="learningGoals">Learning Goals</Label>
            <Textarea
              id="learningGoals"
              value={formData.learningGoals}
              onChange={(e) => setFormData({ ...formData, learningGoals: e.target.value })}
              placeholder="What would you like your child to achieve?"
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="specialNeeds">Special Educational Needs or Learning Preferences</Label>
            <Textarea
              id="specialNeeds"
              value={formData.specialNeeds}
              onChange={(e) => setFormData({ ...formData, specialNeeds: e.target.value })}
              placeholder="Any information that will help tutors provide better support"
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="text-white"
              style={{ backgroundColor: '#625d9c' }}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Adding...
                </>
              ) : (
                'Add Child'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}