import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Checkbox } from './ui/checkbox';
import { Alert, AlertDescription } from './ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Badge } from './ui/badge';
import { 
  AlertCircle, 
  Loader2, 
  Crown, 
  User, 
  BookOpen, 
  Target, 
  Calendar,
  Brain,
  Heart,
  Clock,
  DollarSign,
  Sparkles
} from 'lucide-react';
import { projectId } from '../utils/supabase/info';

interface EnhancedAddChildDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  parentId: string;
  accessToken: string;
  onChildAdded: () => void;
}

const AVAILABLE_SUBJECTS = [
  'Mathematics', 'English Language', 'English Literature', 'Science',
  'Biology', 'Chemistry', 'Physics', 'History', 'Geography',
  'French', 'Spanish', 'German', 'Mandarin',
  'Computer Science', 'Information Technology',
  'Art & Design', 'Music', 'Drama', 'Physical Education',
  'Business Studies', 'Economics', 'Psychology', 'Sociology',
  'Religious Studies', 'Philosophy',
];

export function EnhancedAddChildDialog({ 
  open, 
  onOpenChange, 
  parentId, 
  accessToken, 
  onChildAdded 
}: EnhancedAddChildDialogProps) {
  const [currentTab, setCurrentTab] = useState('basic');
  
  // Basic Info
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    dateOfBirth: '',
    gradeLevel: '',
  });
  
  // Academic Info
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [subjectLevels, setSubjectLevels] = useState<Record<string, string>>({});
  const [currentGrades, setCurrentGrades] = useState<Record<string, string>>({});
  const [targetGrades, setTargetGrades] = useState<Record<string, string>>({});
  
  // Learning Profile
  const [learningStyle, setLearningStyle] = useState<string[]>([]);
  const [learningGoals, setLearningGoals] = useState('');
  const [sessionType, setSessionType] = useState<string[]>([]);
  const [learningPace, setLearningPace] = useState('');
  const [challengesAreas, setChallengesAreas] = useState('');
  
  // Special Needs & Preferences
  const [specialNeeds, setSpecialNeeds] = useState('');
  const [senSupport, setSenSupport] = useState<string[]>([]);
  const [accessibilityNeeds, setAccessibilityNeeds] = useState<string[]>([]);
  
  // Tutor Preferences
  const [preferredTeachingStyle, setPreferredTeachingStyle] = useState<string[]>([]);
  const [tutorGenderPreference, setTutorGenderPreference] = useState('');
  const [tutorExperienceLevel, setTutorExperienceLevel] = useState('');
  const [preferredLanguages, setPreferredLanguages] = useState<string[]>(['English']);
  
  // Scheduling & Budget
  const [availabilityDays, setAvailabilityDays] = useState<string[]>([]);
  const [availabilityTimes, setAvailabilityTimes] = useState<string[]>([]);
  const [sessionFrequency, setSessionFrequency] = useState('');
  const [budgetRange, setBudgetRange] = useState('');
  const [commitmentLevel, setCommitmentLevel] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [requiresUpgrade, setRequiresUpgrade] = useState(false);

  const toggleItem = (item: string, list: string[], setter: (list: string[]) => void) => {
    setter(list.includes(item) ? list.filter(i => i !== item) : [...list, item]);
  };

  const isTabComplete = (tab: string): boolean => {
    switch (tab) {
      case 'basic':
        return !!(formData.firstName && formData.lastName && formData.dateOfBirth && formData.gradeLevel);
      case 'academic':
        return selectedSubjects.length > 0;
      case 'learning':
        return learningStyle.length > 0 && sessionType.length > 0;
      case 'scheduling':
        return availabilityDays.length > 0 && availabilityTimes.length > 0;
      default:
        return true;
    }
  };

  const handleSubmit = async () => {
    setError('');
    setLoading(true);

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-cbd74580/parent/add-child-enhanced`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            parentId,
            // Basic Info
            ...formData,
            // Academic Info
            subjects: selectedSubjects,
            subjectLevels,
            currentGrades,
            targetGrades,
            // Learning Profile
            learningStyle,
            learningGoals,
            sessionType,
            learningPace,
            challengesAreas,
            // Special Needs
            specialNeeds,
            senSupport,
            accessibilityNeeds,
            // Tutor Preferences
            preferredTeachingStyle,
            tutorGenderPreference,
            tutorExperienceLevel,
            preferredLanguages,
            // Scheduling & Budget
            availabilityDays,
            availabilityTimes,
            sessionFrequency,
            budgetRange,
            commitmentLevel,
            // Matching metadata
            matchingEnabled: true,
            createdAt: new Date().toISOString(),
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        if (data.requiresUpgrade) {
          setRequiresUpgrade(true);
        }
        throw new Error(data.error || 'Failed to add child');
      }

      // Reset form
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
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5" style={{ color: '#625d9c' }} />
            Create Smart-Matched Student Profile
          </DialogTitle>
          <DialogDescription>
            Complete this profile to help us find the perfect tutor match for your child
          </DialogDescription>
        </DialogHeader>

        <Tabs value={currentTab} onValueChange={setCurrentTab} className="mt-4">
          <TabsList className="grid grid-cols-5 mb-6">
            <TabsTrigger value="basic" className="relative">
              <User className="w-4 h-4 mr-1" />
              Basic
              {isTabComplete('basic') && <CheckCircle className="w-3 h-3 absolute -top-1 -right-1 text-green-600" />}
            </TabsTrigger>
            <TabsTrigger value="academic">
              <BookOpen className="w-4 h-4 mr-1" />
              Academic
              {isTabComplete('academic') && <CheckCircle className="w-3 h-3 absolute -top-1 -right-1 text-green-600" />}
            </TabsTrigger>
            <TabsTrigger value="learning">
              <Brain className="w-4 h-4 mr-1" />
              Learning
              {isTabComplete('learning') && <CheckCircle className="w-3 h-3 absolute -top-1 -right-1 text-green-600" />}
            </TabsTrigger>
            <TabsTrigger value="preferences">
              <Heart className="w-4 h-4 mr-1" />
              Preferences
            </TabsTrigger>
            <TabsTrigger value="scheduling">
              <Calendar className="w-4 h-4 mr-1" />
              Schedule
              {isTabComplete('scheduling') && <CheckCircle className="w-3 h-3 absolute -top-1 -right-1 text-green-600" />}
            </TabsTrigger>
          </TabsList>

          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Basic Info Tab */}
          <TabsContent value="basic" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name *</Label>
                <Input
                  id="firstName"
                  value={formData.firstName}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                  placeholder="Enter first name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name *</Label>
                <Input
                  id="lastName"
                  value={formData.lastName}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
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
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="gradeLevel">Current Year Group *</Label>
              <Select value={formData.gradeLevel} onValueChange={(value) => setFormData({ ...formData, gradeLevel: value })}>
                <SelectTrigger id="gradeLevel">
                  <SelectValue placeholder="Select year group" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="primary_1">Primary 1</SelectItem>
                  <SelectItem value="primary_2">Primary 2</SelectItem>
                  <SelectItem value="primary_3">Primary 3</SelectItem>
                  <SelectItem value="primary_4">Primary 4</SelectItem>
                  <SelectItem value="primary_5">Primary 5</SelectItem>
                  <SelectItem value="primary_6">Primary 6</SelectItem>
                  <SelectItem value="secondary_7">JSS 1 (Junior Secondary 1)</SelectItem>
                  <SelectItem value="secondary_8">JSS 2 (Junior Secondary 2)</SelectItem>
                  <SelectItem value="secondary_9">JSS 3 (Junior Secondary 3)</SelectItem>
                  <SelectItem value="secondary_10">SS 1 (Senior Secondary 1)</SelectItem>
                  <SelectItem value="secondary_11">SS 2 (Senior Secondary 2)</SelectItem>
                  <SelectItem value="sixth_form_12">SS 3 (Senior Secondary 3)</SelectItem>
                  <SelectItem value="sixth_form_13">Post-Secondary</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button 
              onClick={() => setCurrentTab('academic')}
              className="w-full text-white"
              style={{ backgroundColor: '#625d9c' }}
              disabled={!isTabComplete('basic')}
            >
              Next: Academic Information →
            </Button>
          </TabsContent>

          {/* Academic Info Tab */}
          <TabsContent value="academic" className="space-y-4">
            <div className="space-y-2">
              <Label>Subjects Needing Support *</Label>
              <p className="text-xs text-gray-500 mb-3">Select subjects and optionally add current/target grades</p>
              <div className="grid grid-cols-2 gap-3 p-4 border rounded-lg bg-gray-50 max-h-96 overflow-y-auto">
                {AVAILABLE_SUBJECTS.map(subject => (
                  <div key={subject} className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id={subject}
                        checked={selectedSubjects.includes(subject)}
                        onCheckedChange={() => {
                          if (selectedSubjects.includes(subject)) {
                            setSelectedSubjects(selectedSubjects.filter(s => s !== subject));
                            const newLevels = { ...subjectLevels };
                            const newCurrent = { ...currentGrades };
                            const newTarget = { ...targetGrades };
                            delete newLevels[subject];
                            delete newCurrent[subject];
                            delete newTarget[subject];
                            setSubjectLevels(newLevels);
                            setCurrentGrades(newCurrent);
                            setTargetGrades(newTarget);
                          } else {
                            setSelectedSubjects([...selectedSubjects, subject]);
                          }
                        }}
                      />
                      <label htmlFor={subject} className="text-sm cursor-pointer font-medium">
                        {subject}
                      </label>
                    </div>
                    {selectedSubjects.includes(subject) && (
                      <div className="ml-6 space-y-1">
                        <Input
                          placeholder="Current grade (e.g., C)"
                          value={currentGrades[subject] || ''}
                          onChange={(e) => setCurrentGrades({ ...currentGrades, [subject]: e.target.value })}
                          className="h-8 text-xs"
                        />
                        <Input
                          placeholder="Target grade (e.g., A)"
                          value={targetGrades[subject] || ''}
                          onChange={(e) => setTargetGrades({ ...targetGrades, [subject]: e.target.value })}
                          className="h-8 text-xs"
                        />
                      </div>
                    )}
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
              <Label htmlFor="challengesAreas">Specific Challenges or Focus Areas</Label>
              <Textarea
                id="challengesAreas"
                value={challengesAreas}
                onChange={(e) => setChallengesAreas(e.target.value)}
                placeholder="e.g., Struggles with algebra, needs help with essay writing, exam preparation..."
                rows={3}
              />
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setCurrentTab('basic')} className="flex-1">
                ← Previous
              </Button>
              <Button 
                onClick={() => setCurrentTab('learning')}
                className="flex-1 text-white"
                style={{ backgroundColor: '#625d9c' }}
                disabled={!isTabComplete('academic')}
              >
                Next: Learning Style →
              </Button>
            </div>
          </TabsContent>

          {/* Learning Profile Tab */}
          <TabsContent value="learning" className="space-y-4">
            <div className="space-y-2">
              <Label>Learning Style *</Label>
              <p className="text-xs text-gray-500 mb-2">How does your child learn best? (Select all that apply)</p>
              <div className="grid grid-cols-2 gap-2">
                {['Visual (pictures, diagrams)', 'Auditory (listening, discussion)', 'Kinesthetic (hands-on, practical)', 'Reading/Writing'].map(style => (
                  <button
                    key={style}
                    type="button"
                    onClick={() => toggleItem(style, learningStyle, setLearningStyle)}
                    className={`p-3 rounded-lg border-2 text-left text-sm transition-all ${
                      learningStyle.includes(style) 
                        ? 'border-purple-500 bg-purple-50' 
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    {style}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Session Type Needed *</Label>
              <div className="grid grid-cols-2 gap-2">
                {['Exam Preparation', 'Homework Help', 'General Learning', 'Catch-up Support', 'Advanced Learning', 'Test Prep'].map(type => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => toggleItem(type, sessionType, setSessionType)}
                    className={`p-3 rounded-lg border-2 text-left text-sm transition-all ${
                      sessionType.includes(type) 
                        ? 'border-green-500 bg-green-50' 
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="learningPace">Learning Pace</Label>
              <Select value={learningPace} onValueChange={setLearningPace}>
                <SelectTrigger id="learningPace">
                  <SelectValue placeholder="Select pace" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="slow_steady">Slow & Steady</SelectItem>
                  <SelectItem value="moderate">Moderate</SelectItem>
                  <SelectItem value="fast_paced">Fast-Paced</SelectItem>
                  <SelectItem value="varied">Varies by Subject</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="learningGoals">Learning Goals</Label>
              <Textarea
                id="learningGoals"
                value={learningGoals}
                onChange={(e) => setLearningGoals(e.target.value)}
                placeholder="What do you want your child to achieve? Be specific..."
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label>Special Educational Needs (SEN)</Label>
              <p className="text-xs text-gray-500 mb-2">Select if applicable</p>
              <div className="grid grid-cols-2 gap-2">
                {['Dyslexia', 'Dyscalculia', 'ADHD', 'Autism Spectrum', 'Anxiety', 'Processing Difficulties', 'None'].map(need => (
                  <button
                    key={need}
                    type="button"
                    onClick={() => toggleItem(need, senSupport, setSenSupport)}
                    className={`p-2 rounded-lg border-2 text-left text-sm transition-all ${
                      senSupport.includes(need) 
                        ? 'border-blue-500 bg-blue-50' 
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    {need}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="specialNeeds">Additional SEN Details or Accommodations</Label>
              <Textarea
                id="specialNeeds"
                value={specialNeeds}
                onChange={(e) => setSpecialNeeds(e.target.value)}
                placeholder="Any additional information to help tutors provide better support..."
                rows={3}
              />
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setCurrentTab('academic')} className="flex-1">
                ← Previous
              </Button>
              <Button 
                onClick={() => setCurrentTab('preferences')}
                className="flex-1 text-white"
                style={{ backgroundColor: '#625d9c' }}
                disabled={!isTabComplete('learning')}
              >
                Next: Tutor Preferences →
              </Button>
            </div>
          </TabsContent>

          {/* Tutor Preferences Tab */}
          <TabsContent value="preferences" className="space-y-4">
            <div className="space-y-2">
              <Label>Preferred Teaching Style</Label>
              <p className="text-xs text-gray-500 mb-2">What teaching approach works best?</p>
              <div className="grid grid-cols-2 gap-2">
                {['Patient & Encouraging', 'Structured & Methodical', 'Fun & Interactive', 'Challenge-Based', 'Tech-Integrated', 'Traditional'].map(style => (
                  <button
                    key={style}
                    type="button"
                    onClick={() => toggleItem(style, preferredTeachingStyle, setPreferredTeachingStyle)}
                    className={`p-3 rounded-lg border-2 text-left text-sm transition-all ${
                      preferredTeachingStyle.includes(style) 
                        ? 'border-purple-500 bg-purple-50' 
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    {style}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="tutorGenderPreference">Tutor Gender Preference</Label>
                <Select value={tutorGenderPreference} onValueChange={setTutorGenderPreference}>
                  <SelectTrigger id="tutorGenderPreference">
                    <SelectValue placeholder="No preference" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="no_preference">No Preference</SelectItem>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                    <SelectItem value="non_binary">Non-Binary</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="tutorExperienceLevel">Tutor Experience Level</Label>
                <Select value={tutorExperienceLevel} onValueChange={setTutorExperienceLevel}>
                  <SelectTrigger id="tutorExperienceLevel">
                    <SelectValue placeholder="No preference" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="no_preference">No Preference</SelectItem>
                    <SelectItem value="beginner">New Tutors (Lower Rates)</SelectItem>
                    <SelectItem value="intermediate">Experienced (2-5 years)</SelectItem>
                    <SelectItem value="expert">Expert (5+ years)</SelectItem>
                    <SelectItem value="specialist">Subject Specialist</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Preferred Languages</Label>
              <div className="grid grid-cols-3 gap-2">
                {['English', 'Spanish', 'French', 'German', 'Mandarin', 'Other'].map(lang => (
                  <button
                    key={lang}
                    type="button"
                    onClick={() => toggleItem(lang, preferredLanguages, setPreferredLanguages)}
                    className={`p-2 rounded-lg border-2 text-sm transition-all ${
                      preferredLanguages.includes(lang) 
                        ? 'border-indigo-500 bg-indigo-50' 
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    {lang}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setCurrentTab('learning')} className="flex-1">
                ← Previous
              </Button>
              <Button 
                onClick={() => setCurrentTab('scheduling')}
                className="flex-1 text-white"
                style={{ backgroundColor: '#625d9c' }}
              >
                Next: Schedule & Budget →
              </Button>
            </div>
          </TabsContent>

          {/* Scheduling & Budget Tab */}
          <TabsContent value="scheduling" className="space-y-4">
            <div className="space-y-2">
              <Label>Available Days *</Label>
              <div className="grid grid-cols-4 gap-2">
                {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(day => (
                  <button
                    key={day}
                    type="button"
                    onClick={() => toggleItem(day, availabilityDays, setAvailabilityDays)}
                    className={`p-2 rounded-lg border-2 text-sm transition-all ${
                      availabilityDays.includes(day) 
                        ? 'border-green-500 bg-green-50' 
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    {day.slice(0, 3)}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Preferred Times *</Label>
              <div className="grid grid-cols-3 gap-2">
                {['Morning (9am-12pm)', 'Afternoon (12pm-5pm)', 'Evening (5pm-8pm)', 'Weekends'].map(time => (
                  <button
                    key={time}
                    type="button"
                    onClick={() => toggleItem(time, availabilityTimes, setAvailabilityTimes)}
                    className={`p-3 rounded-lg border-2 text-sm transition-all ${
                      availabilityTimes.includes(time) 
                        ? 'border-purple-500 bg-purple-50' 
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <Clock className="w-4 h-4 mx-auto mb-1" />
                    {time}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="sessionFrequency">Session Frequency</Label>
                <Select value={sessionFrequency} onValueChange={setSessionFrequency}>
                  <SelectTrigger id="sessionFrequency">
                    <SelectValue placeholder="Select frequency" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="once_week">Once a week</SelectItem>
                    <SelectItem value="twice_week">Twice a week</SelectItem>
                    <SelectItem value="three_week">3 times a week</SelectItem>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="flexible">Flexible</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="commitmentLevel">Commitment Level</Label>
                <Select value={commitmentLevel} onValueChange={setCommitmentLevel}>
                  <SelectTrigger id="commitmentLevel">
                    <SelectValue placeholder="Select commitment" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="short_term">Short-term (1-3 months)</SelectItem>
                    <SelectItem value="medium_term">Medium-term (3-6 months)</SelectItem>
                    <SelectItem value="long_term">Long-term (6+ months)</SelectItem>
                    <SelectItem value="ongoing">Ongoing</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="budgetRange">
                <DollarSign className="w-4 h-4 inline mr-1" />
                Budget Range (per hour)
              </Label>
              <Select value={budgetRange} onValueChange={setBudgetRange}>
                <SelectTrigger id="budgetRange">
                  <SelectValue placeholder="Select budget range" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="15-25">£15-25 (Budget-Friendly)</SelectItem>
                  <SelectItem value="25-40">£25-40 (Standard)</SelectItem>
                  <SelectItem value="40-60">£40-60 (Premium)</SelectItem>
                  <SelectItem value="60+">£60+ (Specialist)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Alert className="bg-blue-50 border-blue-200">
              <Sparkles className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-blue-800 text-sm">
                <strong>Smart Matching Enabled!</strong> Based on this profile, our AI will match your child with the most compatible tutors, considering teaching style, experience, availability, and budget.
              </AlertDescription>
            </Alert>

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setCurrentTab('preferences')} className="flex-1">
                ← Previous
              </Button>
              <Button 
                onClick={handleSubmit}
                disabled={loading || !isTabComplete('scheduling')}
                className="flex-1 text-white"
                style={{ backgroundColor: '#5d9827' }}
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Creating Profile...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Create Profile & Find Matches
                  </>
                )}
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}