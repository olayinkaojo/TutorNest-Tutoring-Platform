import { useState, useRef } from 'react';
import { projectId } from '../utils/supabase/info';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Textarea } from './ui/textarea';
import { Checkbox } from './ui/checkbox';
import { Alert, AlertDescription } from './ui/alert';
import { Progress } from './ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Badge } from './ui/badge';
import { 
  AlertCircle, 
  Upload, 
  X, 
  CheckCircle, 
  Clock,
  User,
  BookOpen,
  Award,
  Calendar,
  Heart,
  DollarSign,
  Brain,
  Sparkles,
  Loader2
} from 'lucide-react';

interface EnhancedTutorProfileFormProps {
  session: any;
  onComplete: () => void;
}

const SUBJECTS = [
  'Mathematics', 'English Language', 'English Literature', 'Science',
  'Biology', 'Chemistry', 'Physics', 'History', 'Geography',
  'French', 'Spanish', 'German', 'Mandarin', 'Computer Science',
  'Information Technology', 'Art & Design', 'Music', 'Drama',
  'Physical Education', 'Business Studies', 'Economics',
  'Psychology', 'Sociology', 'Religious Studies', 'Philosophy',
  'Others',
];

const YEAR_GROUPS = [
  'Primary (Primary 1-6)',
  'Junior Secondary (JSS 1-3)',
  'Senior Secondary (SS 1-3)',
  'Post-Secondary',
  'University Level',
];

export function EnhancedTutorProfileForm({ session, onComplete }: EnhancedTutorProfileFormProps) {
  const [currentTab, setCurrentTab] = useState('basic');
  
  // Basic Info
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    gender: '',
    bio: '',
    hourlyRate: '',
  });

  // Academic Expertise
  const [subjects, setSubjects] = useState<string[]>([]);
  const [otherSubjects, setOtherSubjects] = useState<string>('');
  const [subjectExperience, setSubjectExperience] = useState<Record<string, string>>({});
  const [subjectLevels, setSubjectLevels] = useState<Record<string, string[]>>({});
  const [yearGroups, setYearGroups] = useState<string[]>([]);
  const [qualifications, setQualifications] = useState('');
  const [specializations, setSpecializations] = useState('');
  
  // Teaching Profile
  const [teachingStyle, setTeachingStyle] = useState<string[]>([]);
  const [learningStylesSupported, setLearningStylesSupported] = useState<string[]>([]);
  const [sessionTypesOffered, setSessionTypesOffered] = useState<string[]>([]);
  const [teachingMethodology, setTeachingMethodology] = useState('');
  const [yearsExperience, setYearsExperience] = useState('');
  const [experienceLevel, setExperienceLevel] = useState('');
  
  // SEN & Accessibility
  const [senExperience, setSenExperience] = useState<string[]>([]);
  const [senSpecialization, setSenSpecialization] = useState('');
  const [accessibilitySupport, setAccessibilitySupport] = useState<string[]>([]);
  
  // Student Preferences
  const [preferredAgeGroups, setPreferredAgeGroups] = useState<string[]>([]);
  const [preferredCommitment, setPreferredCommitment] = useState<string[]>([]);
  const [maxStudents, setMaxStudents] = useState('');
  const [languagesSpoken, setLanguagesSpoken] = useState<string[]>(['English']);
  
  // Availability
  const [availableDays, setAvailableDays] = useState<string[]>([]);
  const [availableTimes, setAvailableTimes] = useState<string[]>([]);
  const [responseTime, setResponseTime] = useState('');
  
  // Documents
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string>('');
  const [certificates, setCertificates] = useState<File[]>([]);
  const [dbsDocument, setDbsDocument] = useState<File | null>(null);
  const [idDocument, setIdDocument] = useState<File | null>(null);
  const [hasDbsCheck, setHasDbsCheck] = useState(false);
  const [dbsNumber, setDbsNumber] = useState('');
  const [dbsIssueDate, setDbsIssueDate] = useState('');
  const [dbsExpiryDate, setDbsExpiryDate] = useState('');
  
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  
  const photoInputRef = useRef<HTMLInputElement>(null);
  const certificateInputRef = useRef<HTMLInputElement>(null);
  const dbsInputRef = useRef<HTMLInputElement>(null);
  const idInputRef = useRef<HTMLInputElement>(null);

  const toggleItem = (item: string, list: string[], setter: (list: string[]) => void) => {
    setter(list.includes(item) ? list.filter(i => i !== item) : [...list, item]);
  };

  const isTabComplete = (tab: string): boolean => {
    switch (tab) {
      case 'basic':
        return !!(formData.firstName && formData.lastName && formData.bio && formData.hourlyRate);
      case 'expertise':
        return subjects.length > 0 && yearGroups.length > 0;
      case 'teaching':
        return teachingStyle.length > 0 && learningStylesSupported.length > 0;
      case 'availability':
        return availableDays.length > 0 && availableTimes.length > 0;
      case 'documents':
        return !!(photo && idDocument);
      default:
        return true;
    }
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setError('Photo must be less than 5MB');
        return;
      }
      const name = (file.name || '').toLowerCase();
      const ext = '.' + (name.split('.').pop() || '');
      const isImg = file.type ? (file.type.startsWith('image/') || file.type.includes('heic') || file.type.includes('heif')) : ['.jpg', '.jpeg', '.png', '.webp', '.heic', '.heif'].includes(ext);
      if (!isImg) {
        setError('Please upload an image file (JPG, PNG, WebP, HEIC)');
        return;
      }
      setPhoto(file);
      setPhotoPreview(URL.createObjectURL(file));
      setError('');
    }
  };

  const handleCertificateAdd = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setCertificates([...certificates, ...files]);
  };

  const handleSubmit = async () => {
    setError('');
    setLoading(true);
    setUploadProgress(10);

    try {
      const formDataToSend = new FormData();
      
      // Add basic info
      formDataToSend.append('formData', JSON.stringify({
        ...formData,
        subjects,
        otherSubjects,
        subjectExperience,
        subjectLevels,
        yearGroups,
        qualifications,
        specializations,
        teachingStyle,
        learningStylesSupported,
        sessionTypesOffered,
        teachingMethodology,
        yearsExperience,
        experienceLevel,
        senExperience,
        senSpecialization,
        accessibilitySupport,
        preferredAgeGroups,
        preferredCommitment,
        maxStudents,
        languagesSpoken,
        availableDays,
        availableTimes,
        responseTime,
        hasDbsCheck,
        dbsNumber,
        dbsIssueDate,
        dbsExpiryDate,
        matchingEnabled: true,
      }));

      setUploadProgress(30);

      // Add files
      if (photo) formDataToSend.append('photo', photo);
      if (idDocument) formDataToSend.append('idDocument', idDocument);
      if (dbsDocument) formDataToSend.append('dbsDocument', dbsDocument);
      
      certificates.forEach((cert, index) => {
        formDataToSend.append(`certificate_${index}`, cert);
      });

      setUploadProgress(50);

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-cbd74580/profile/complete`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
          body: formDataToSend,
        }
      );

      setUploadProgress(80);

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to save profile');
      }

      setUploadProgress(100);
      onComplete();
    } catch (err: any) {
      console.error('Error saving profile:', err);
      setError(err.message || 'Failed to save profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-3 py-4 sm:p-6 min-w-0">
      <div className="mb-6">
        <h2 className="flex items-center gap-2 mb-2">
          <Sparkles className="w-6 h-6" style={{ color: '#625d9c' }} />
          Complete Your Tutor Profile
        </h2>
        <p className="text-gray-600 text-sm">
          Help us match you with the perfect students by completing this detailed profile
        </p>
      </div>

      <Tabs value={currentTab} onValueChange={setCurrentTab}>
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-1 mb-6">
          <TabsTrigger value="basic" className="relative">
            <User className="w-4 h-4 mr-1" />
            Basic
            {isTabComplete('basic') && <CheckCircle className="w-3 h-3 absolute -top-1 -right-1 text-green-600" />}
          </TabsTrigger>
          <TabsTrigger value="expertise">
            <BookOpen className="w-4 h-4 mr-1" />
            Expertise
            {isTabComplete('expertise') && <CheckCircle className="w-3 h-3 absolute -top-1 -right-1 text-green-600" />}
          </TabsTrigger>
          <TabsTrigger value="teaching">
            <Brain className="w-4 h-4 mr-1" />
            Teaching
            {isTabComplete('teaching') && <CheckCircle className="w-3 h-3 absolute -top-1 -right-1 text-green-600" />}
          </TabsTrigger>
          <TabsTrigger value="sen">
            <Heart className="w-4 h-4 mr-1" />
            SEN
          </TabsTrigger>
          <TabsTrigger value="availability">
            <Calendar className="w-4 h-4 mr-1" />
            Schedule
            {isTabComplete('availability') && <CheckCircle className="w-3 h-3 absolute -top-1 -right-1 text-green-600" />}
          </TabsTrigger>
          <TabsTrigger value="documents">
            <Award className="w-4 h-4 mr-1" />
            Documents
            {isTabComplete('documents') && <CheckCircle className="w-3 h-3 absolute -top-1 -right-1 text-green-600" />}
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
                placeholder="Enter your first name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">Last Name *</Label>
              <Input
                id="lastName"
                value={formData.lastName}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                placeholder="Enter your last name"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="gender">Gender</Label>
            <Select value={formData.gender} onValueChange={(value) => setFormData({ ...formData, gender: value })}>
              <SelectTrigger id="gender">
                <SelectValue placeholder="Select gender" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="male">Male</SelectItem>
                <SelectItem value="female">Female</SelectItem>
                <SelectItem value="non_binary">Non-Binary</SelectItem>
                <SelectItem value="prefer_not_say">Prefer not to say</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="bio">Professional Bio *</Label>
            <Textarea
              id="bio"
              value={formData.bio}
              onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
              placeholder="Tell students and parents about your teaching experience, qualifications, and what makes you a great tutor..."
              rows={4}
            />
            <p className="text-xs text-gray-500">{formData.bio.length}/500 characters</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="hourlyRate">Hourly Rate (£) *</Label>
            <Input
              id="hourlyRate"
              type="number"
              value={formData.hourlyRate}
              onChange={(e) => setFormData({ ...formData, hourlyRate: e.target.value })}
              placeholder="e.g., 30"
              min="15"
              max="100"
            />
            <p className="text-xs text-gray-500">Typical range: £15-80 per hour</p>
          </div>

          <Button 
            onClick={() => setCurrentTab('expertise')}
            className="w-full text-white"
            style={{ backgroundColor: '#625d9c' }}
            disabled={!isTabComplete('basic')}
          >
            Next: Subject Expertise →
          </Button>
        </TabsContent>

        {/* Expertise Tab */}
        <TabsContent value="expertise" className="space-y-4">
          <div className="space-y-2">
            <Label>Subjects You Teach *</Label>
            <p className="text-xs text-gray-500 mb-3">Select subjects and specify your experience level</p>
            <div className="grid grid-cols-2 gap-3 p-4 border rounded-lg bg-gray-50 max-h-96 overflow-y-auto">
              {SUBJECTS.map(subject => (
                <div key={subject} className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id={subject}
                      checked={subjects.includes(subject)}
                      onCheckedChange={() => {
                        if (subjects.includes(subject)) {
                          setSubjects(subjects.filter(s => s !== subject));
                          const newExp = { ...subjectExperience };
                          const newLevels = { ...subjectLevels };
                          delete newExp[subject];
                          delete newLevels[subject];
                          setSubjectExperience(newExp);
                          setSubjectLevels(newLevels);
                        } else {
                          setSubjects([...subjects, subject]);
                        }
                      }}
                    />
                    <label htmlFor={subject} className="text-sm cursor-pointer font-medium">
                      {subject}
                    </label>
                  </div>
                  {subjects.includes(subject) && (
                    <div className="ml-6">
                      <Select
                        value={subjectExperience[subject] || ''}
                        onValueChange={(value) => setSubjectExperience({ ...subjectExperience, [subject]: value })}
                      >
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue placeholder="Experience" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="<1year">Less than 1 year</SelectItem>
                          <SelectItem value="1-2years">1-2 years</SelectItem>
                          <SelectItem value="3-5years">3-5 years</SelectItem>
                          <SelectItem value="5+years">5+ years</SelectItem>
                          <SelectItem value="specialist">Specialist/Expert</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Other Subjects Input Field */}
          {subjects.includes('Others') && (
            <div className="space-y-2">
              <Label htmlFor="other_subjects">Other Subjects</Label>
              <Input
                id="other_subjects"
                value={otherSubjects}
                onChange={(e) => setOtherSubjects(e.target.value)}
                placeholder="e.g., Yoruba, Igbo, Agricultural Science, etc. (comma-separated)"
                className="mt-1"
              />
              <p className="text-xs text-gray-500 mt-1">
                Type any additional subjects not listed above, separated by commas
              </p>
            </div>
          )}

          <div className="space-y-2">
            <Label>Year Groups/Levels *</Label>
            <div className="grid grid-cols-2 gap-2">
              {YEAR_GROUPS.map(group => (
                <button
                  key={group}
                  type="button"
                  onClick={() => toggleItem(group, yearGroups, setYearGroups)}
                  className={`p-3 rounded-lg border-2 text-sm transition-all ${
                    yearGroups.includes(group) 
                      ? 'border-purple-500 bg-purple-50' 
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  {group}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="qualifications">Qualifications & Certifications</Label>
            <Textarea
              id="qualifications"
              value={qualifications}
              onChange={(e) => setQualifications(e.target.value)}
              placeholder="e.g., BSc Mathematics, PGCE, QTS, Degree in Education..."
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="specializations">Subject Specializations</Label>
            <Textarea
              id="specializations"
              value={specializations}
              onChange={(e) => setSpecializations(e.target.value)}
              placeholder="e.g., GCSE exam preparation, A-Level Physics, Early years literacy..."
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="yearsExperience">Total Years Teaching</Label>
              <Select value={yearsExperience} onValueChange={setYearsExperience}>
                <SelectTrigger id="yearsExperience">
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="<1">Less than 1 year</SelectItem>
                  <SelectItem value="1-2">1-2 years</SelectItem>
                  <SelectItem value="3-5">3-5 years</SelectItem>
                  <SelectItem value="5-10">5-10 years</SelectItem>
                  <SelectItem value="10+">10+ years</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="experienceLevel">Experience Level</Label>
              <Select value={experienceLevel} onValueChange={setExperienceLevel}>
                <SelectTrigger id="experienceLevel">
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="beginner">Beginner Tutor</SelectItem>
                  <SelectItem value="intermediate">Experienced Tutor</SelectItem>
                  <SelectItem value="expert">Expert Tutor</SelectItem>
                  <SelectItem value="specialist">Subject Specialist</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setCurrentTab('basic')} className="flex-1">
              ← Previous
            </Button>
            <Button 
              onClick={() => setCurrentTab('teaching')}
              className="flex-1 text-white"
              style={{ backgroundColor: '#625d9c' }}
              disabled={!isTabComplete('expertise')}
            >
              Next: Teaching Style →
            </Button>
          </div>
        </TabsContent>

        {/* Teaching Profile Tab */}
        <TabsContent value="teaching" className="space-y-4">
          <div className="space-y-2">
            <Label>Your Teaching Style *</Label>
            <div className="grid grid-cols-2 gap-2">
              {['Patient & Encouraging', 'Structured & Methodical', 'Fun & Interactive', 'Challenge-Based', 'Tech-Integrated', 'Traditional'].map(style => (
                <button
                  key={style}
                  type="button"
                  onClick={() => toggleItem(style, teachingStyle, setTeachingStyle)}
                  className={`p-3 rounded-lg border-2 text-sm transition-all ${
                    teachingStyle.includes(style) 
                      ? 'border-green-500 bg-green-50' 
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  {style}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Learning Styles You Support *</Label>
            <div className="grid grid-cols-2 gap-2">
              {['Visual Learners', 'Auditory Learners', 'Kinesthetic Learners', 'Reading/Writing Learners'].map(style => (
                <button
                  key={style}
                  type="button"
                  onClick={() => toggleItem(style, learningStylesSupported, setLearningStylesSupported)}
                  className={`p-3 rounded-lg border-2 text-sm transition-all ${
                    learningStylesSupported.includes(style) 
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
            <Label>Session Types You Offer</Label>
            <div className="grid grid-cols-3 gap-2">
              {['Exam Prep', 'Homework Help', 'General Learning', 'Catch-up', 'Advanced Learning', 'Test Prep'].map(type => (
                <button
                  key={type}
                  type="button"
                  onClick={() => toggleItem(type, sessionTypesOffered, setSessionTypesOffered)}
                  className={`p-2 rounded-lg border-2 text-sm transition-all ${
                    sessionTypesOffered.includes(type) 
                      ? 'border-indigo-500 bg-indigo-50' 
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="teachingMethodology">Teaching Methodology & Approach</Label>
            <Textarea
              id="teachingMethodology"
              value={teachingMethodology}
              onChange={(e) => setTeachingMethodology(e.target.value)}
              placeholder="Describe your teaching approach, how you assess progress, adapt to different learning needs..."
              rows={4}
            />
          </div>

          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setCurrentTab('expertise')} className="flex-1">
              ← Previous
            </Button>
            <Button 
              onClick={() => setCurrentTab('sen')}
              className="flex-1 text-white"
              style={{ backgroundColor: '#625d9c' }}
              disabled={!isTabComplete('teaching')}
            >
              Next: SEN Experience →
            </Button>
          </div>
        </TabsContent>

        {/* SEN & Accessibility Tab */}
        <TabsContent value="sen" className="space-y-4">
          <div className="space-y-2">
            <Label>SEN Experience</Label>
            <p className="text-xs text-gray-500 mb-2">Select conditions you have experience teaching</p>
            <div className="grid grid-cols-2 gap-2">
              {['Dyslexia', 'Dyscalculia', 'ADHD', 'Autism Spectrum', 'Anxiety', 'Processing Difficulties', 'None'].map(need => (
                <button
                  key={need}
                  type="button"
                  onClick={() => toggleItem(need, senExperience, setSenExperience)}
                  className={`p-3 rounded-lg border-2 text-sm transition-all ${
                    senExperience.includes(need) 
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
            <Label htmlFor="senSpecialization">SEN Specialization Details</Label>
            <Textarea
              id="senSpecialization"
              value={senSpecialization}
              onChange={(e) => setSenSpecialization(e.target.value)}
              placeholder="Describe your SEN training, certifications, and experience..."
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label>Student Age Groups You Prefer</Label>
            <div className="grid grid-cols-3 gap-2">
              {['5-7 years', '8-11 years', '12-14 years', '15-16 years', '17-18 years'].map(age => (
                <button
                  key={age}
                  type="button"
                  onClick={() => toggleItem(age, preferredAgeGroups, setPreferredAgeGroups)}
                  className={`p-2 rounded-lg border-2 text-sm transition-all ${
                    preferredAgeGroups.includes(age) 
                      ? 'border-green-500 bg-green-50' 
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  {age}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Languages You Speak</Label>
            <div className="grid grid-cols-4 gap-2">
              {['English', 'Spanish', 'French', 'German', 'Mandarin', 'Arabic', 'Hindi', 'Other'].map(lang => (
                <button
                  key={lang}
                  type="button"
                  onClick={() => toggleItem(lang, languagesSpoken, setLanguagesSpoken)}
                  className={`p-2 rounded-lg border-2 text-sm transition-all ${
                    languagesSpoken.includes(lang) 
                      ? 'border-purple-500 bg-purple-50' 
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  {lang}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="maxStudents">Maximum Students</Label>
              <Select value={maxStudents} onValueChange={setMaxStudents}>
                <SelectTrigger id="maxStudents">
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1-5">1-5 students</SelectItem>
                  <SelectItem value="6-10">6-10 students</SelectItem>
                  <SelectItem value="11-15">11-15 students</SelectItem>
                  <SelectItem value="15+">15+ students</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="responseTime">Typical Response Time</Label>
              <Select value={responseTime} onValueChange={setResponseTime}>
                <SelectTrigger id="responseTime">
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1hour">Within 1 hour</SelectItem>
                  <SelectItem value="3hours">Within 3 hours</SelectItem>
                  <SelectItem value="24hours">Within 24 hours</SelectItem>
                  <SelectItem value="48hours">Within 48 hours</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setCurrentTab('teaching')} className="flex-1">
              ← Previous
            </Button>
            <Button 
              onClick={() => setCurrentTab('availability')}
              className="flex-1 text-white"
              style={{ backgroundColor: '#625d9c' }}
            >
              Next: Availability →
            </Button>
          </div>
        </TabsContent>

        {/* Availability Tab */}
        <TabsContent value="availability" className="space-y-4">
          <div className="space-y-2">
            <Label>Available Days *</Label>
            <div className="grid grid-cols-4 gap-2">
              {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(day => (
                <button
                  key={day}
                  type="button"
                  onClick={() => toggleItem(day, availableDays, setAvailableDays)}
                  className={`p-3 rounded-lg border-2 text-sm transition-all ${
                    availableDays.includes(day) 
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
            <Label>Available Times *</Label>
            <div className="grid grid-cols-2 gap-2">
              {['Morning (9am-12pm)', 'Afternoon (12pm-5pm)', 'Evening (5pm-8pm)', 'Late Evening (8pm+)', 'Weekends'].map(time => (
                <button
                  key={time}
                  type="button"
                  onClick={() => toggleItem(time, availableTimes, setAvailableTimes)}
                  className={`p-3 rounded-lg border-2 text-sm transition-all ${
                    availableTimes.includes(time) 
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

          <div className="space-y-2">
            <Label>Preferred Student Commitment</Label>
            <div className="grid grid-cols-2 gap-2">
              {['One-off Sessions', 'Short-term (1-3 months)', 'Long-term (6+ months)', 'Ongoing'].map(commitment => (
                <button
                  key={commitment}
                  type="button"
                  onClick={() => toggleItem(commitment, preferredCommitment, setPreferredCommitment)}
                  className={`p-3 rounded-lg border-2 text-sm transition-all ${
                    preferredCommitment.includes(commitment) 
                      ? 'border-indigo-500 bg-indigo-50' 
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  {commitment}
                </button>
              ))}
            </div>
          </div>

          <Alert className="bg-blue-50 border-blue-200">
            <Sparkles className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-blue-800 text-sm">
              <strong>Smart Matching Enabled!</strong> Your detailed availability helps us match you with students whose schedules align perfectly with yours.
            </AlertDescription>
          </Alert>

          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setCurrentTab('sen')} className="flex-1">
              ← Previous
            </Button>
            <Button 
              onClick={() => setCurrentTab('documents')}
              className="flex-1 text-white"
              style={{ backgroundColor: '#625d9c' }}
              disabled={!isTabComplete('availability')}
            >
              Next: Documents →
            </Button>
          </div>
        </TabsContent>

        {/* Documents Tab */}
        <TabsContent value="documents" className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="photo">Profile Photo *</Label>
            <div className="flex items-center gap-4">
              {photoPreview && (
                <img src={photoPreview} alt="Preview" className="w-24 h-24 rounded-full object-cover" />
              )}
              <div className="flex-1">
                <input
                  ref={photoInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoChange}
                  className="hidden"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => photoInputRef.current?.click()}
                >
                  <Upload className="w-4 h-4 mr-2" />
                  {photo ? 'Change Photo' : 'Upload Photo'}
                </Button>
                <p className="text-xs text-gray-500 mt-1">Max 5MB, JPG or PNG</p>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="idDocument">ID Document (Passport/Driver's License) *</Label>
            <input
              ref={idInputRef}
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,.webp,.heic,.heif,application/pdf,image/*"
              onChange={(e) => setIdDocument(e.target.files?.[0] || null)}
              className="hidden"
            />
            <Button
              type="button"
              variant="outline"
              onClick={() => idInputRef.current?.click()}
            >
              <Upload className="w-4 h-4 mr-2" />
              {idDocument ? idDocument.name : 'Upload ID Document'}
            </Button>
          </div>

          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="hasDbsCheck"
                checked={hasDbsCheck}
                onCheckedChange={(checked) => setHasDbsCheck(checked as boolean)}
              />
              <Label htmlFor="hasDbsCheck">I have a DBS Check</Label>
            </div>
            
            {hasDbsCheck && (
              <div className="ml-6 space-y-3 mt-3">
                <Input
                  placeholder="DBS Certificate Number"
                  value={dbsNumber}
                  onChange={(e) => setDbsNumber(e.target.value)}
                />
                <Input
                  type="date"
                  placeholder="Issue Date"
                  value={dbsIssueDate}
                  onChange={(e) => setDbsIssueDate(e.target.value)}
                />
                <Input
                  type="date"
                  placeholder="Expiry Date"
                  value={dbsExpiryDate}
                  onChange={(e) => setDbsExpiryDate(e.target.value)}
                />
                <div>
                  <input
                    ref={dbsInputRef}
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png,.webp,.heic,.heif,application/pdf,image/*"
                    onChange={(e) => setDbsDocument(e.target.files?.[0] || null)}
                    className="hidden"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => dbsInputRef.current?.click()}
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    {dbsDocument ? dbsDocument.name : 'Upload DBS Certificate'}
                  </Button>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label>Certificates & Qualifications (Optional)</Label>
            <input
              ref={certificateInputRef}
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,.webp,.heic,.heif,.doc,.docx,application/pdf,image/*,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              multiple
              onChange={handleCertificateAdd}
              className="hidden"
            />
            <Button
              type="button"
              variant="outline"
              onClick={() => certificateInputRef.current?.click()}
            >
              <Upload className="w-4 h-4 mr-2" />
              Add Certificates
            </Button>
            {certificates.length > 0 && (
              <div className="space-y-1 mt-2">
                {certificates.map((cert, index) => (
                  <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                    <span className="text-sm">{cert.name}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setCertificates(certificates.filter((_, i) => i !== index))}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <Alert className="bg-yellow-50 border-yellow-200">
            <Clock className="h-4 w-4 text-yellow-600" />
            <AlertDescription className="text-yellow-800 text-sm">
              Your profile will be reviewed by our team within 24-48 hours. You'll receive an email once approved.
            </AlertDescription>
          </Alert>

          {loading && (
            <div className="space-y-2">
              <Progress value={uploadProgress} className="h-2" />
              <p className="text-xs text-gray-500 text-center">Uploading... {uploadProgress}%</p>
            </div>
          )}

          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setCurrentTab('availability')} className="flex-1" disabled={loading}>
              ← Previous
            </Button>
            <Button 
              onClick={handleSubmit}
              disabled={loading || !isTabComplete('documents')}
              className="flex-1 text-white"
              style={{ backgroundColor: '#5d9827' }}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Submit Profile for Review
                </>
              )}
            </Button>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}