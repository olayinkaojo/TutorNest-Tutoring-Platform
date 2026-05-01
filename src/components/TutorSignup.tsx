import { useState, useEffect } from 'react';
import { AuthBackground } from './AuthBackground';
import { getSupabaseClient } from '../utils/supabase/client';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Alert, AlertDescription } from './ui/alert';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { CheckCircle, AlertCircle, User, BookOpen, Award, Shield } from 'lucide-react';
import TutorNestLogo from './TutorNestLogo';

const supabase = getSupabaseClient();

const AVAILABLE_SUBJECTS = [
  'Mathematics', 'English', 'Science', 'Physics', 'Chemistry', 'Biology',
  'Computer Science', 'Information Technology', 'Spanish', 'French', 'German',
  'Italian', 'Mandarin Chinese', 'Arabic', 'Latin', 'History', 'Geography',
  'Religious Studies', 'Philosophy', 'Psychology', 'Sociology', 'Politics',
  'Economics', 'Art & Design', 'Music', 'Drama', 'Dance', 'Media Studies',
  'Photography', 'Business Studies', 'Accounting', 'Law', 'Physical Education',
  'Design & Technology', 'Food Technology', 'Textiles', 'Bible Study',
  'Primary/Elementary (All Subjects)', 'Early Years Foundation Stage (EYFS)',
  '11+ Entrance Exams', 'GCSE Preparation', 'A-Level Preparation',
  'SAT Preparation', 'ACT Preparation', 'IELTS', 'TOEFL',
  'Special Educational Needs (SEN)', 'Dyslexia Support', 'ADHD Support',
  'Others',
];

const AGE_GROUPS = [
  'Early Years (3-5)',
  'Primary Lower (5-8)',
  'Primary Upper (8-11)',
  'Junior Secondary (11-14)',
  'Senior Secondary (14-17)',
];

// Class mapping for each age group (Nigeria 6-3-3-4 system / UK England system)
const CLASS_OPTIONS: { [key: string]: string[] } = {
  'Early Years (3-5)': [
    'Nursery 1',
    'Nursery 2',
    'Nursery 3 / Reception',
    'Kindergarten/Pre-Primary',
  ],
  'Primary Lower (5-8)': [
    'Primary 1 (P1) / Year 1',
    'Primary 2 (P2) / Year 2',
    'Primary 3 (P3) / Year 3',
  ],
  'Primary Upper (8-11)': [
    'Primary 4 (P4) / Year 4',
    'Primary 5 (P5) / Year 5',
    'Primary 6 (P6) / Year 6',
  ],
  'Junior Secondary (11-14)': [
    'JSS 1 / Year 7',
    'JSS 2 / Year 8',
    'JSS 3 / Year 9',
  ],
  'Senior Secondary (14-17)': [
    'SS 1 / Year 10',
    'SS 2 / Year 11',
    'SS 3 / Year 12',
  ],
};

const TEACHING_FORMATS = ['Online Only', 'In-Person Only', 'Both Online & In-Person'];
const GROUP_SIZES = ['One-on-One Only', 'Small Groups (2-4 students)', 'Both Individual & Groups'];

const EXAM_BOARDS = [
  // Nigerian & African Exams
  'WAEC (West African Examinations Council)',
  'NECO (National Examinations Council)',
  'JAMB (Joint Admissions and Matriculation Board)',
  'NABTEB (National Business and Technical Examinations Board)',
  'Cambridge International (IGCSE/A-Level)',
  'Common Entrance',
  // International Exams
  'IB (International Baccalaureate)',
  'SAT',
  'ACT',
  'GCE A-Level',
  'TOEFL',
  'IELTS',
  'Others',
];

const LEARNING_DIFFICULTIES = [
  'Dyslexia', 'Dyscalculia', 'ADHD', 'Autism Spectrum',
  'Dyspraxia', 'Speech & Language Difficulties',
  'Anxiety/Mental Health Support', 'Gifted & Talented', 'Others',
];

const TEACHING_METHODOLOGIES = [
  'Visual Learning', 'Kinesthetic/Hands-on', 'Auditory Learning',
  'Project-Based Learning', 'Socratic Method', 'Direct Instruction',
  'Inquiry-Based Learning', 'Differentiated Instruction', 'Others',
];

const LANGUAGES_SPOKEN = [
  'English', 'Spanish', 'French', 'German', 'Mandarin',
  'Arabic', 'Polish', 'Urdu', 'Bengali', 'Portuguese', 'Italian', 'Hindi',
  'Yoruba', 'Igbo', 'Hausa', 'Pidgin English',
  'Others',
];

const EDUCATION_LEVELS = [
  "Secondary School Certificate (SSCE/WAEC/NECO)",
  "Ordinary National Diploma (OND)",
  "Higher National Diploma (HND)",
  "Bachelor's Degree (BSc / BA / BEd / BEng)",
  "Postgraduate Certificate in Education (PGCE)",
  "Postgraduate Diploma (PGDip)",
  "Master's Degree (MSc / MA / MEd / MBA)",
  "Doctorate (PhD / EdD)",
  "Professional Certification (ICAN, ACCA, etc.)",
];

interface TutorSignupProps {
  onBackToSignIn?: () => void;
  initialData?: { email: string; password: string; name: string; phone?: string } | null;
  onSignupComplete?: () => void;
  session?: any; // Add session prop to detect logged-in users
  existingProfile?: any; // Add existing profile data
}

export function TutorSignup({ onBackToSignIn, initialData, onSignupComplete, session, existingProfile }: TutorSignupProps) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [emailCheckLoading, setEmailCheckLoading] = useState(false);
  const [emailExists, setEmailExists] = useState(false);
  const [isExistingUser, setIsExistingUser] = useState(false);
  const [emailConfirmationSent, setEmailConfirmationSent] = useState(false);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoUploading, setPhotoUploading] = useState(false);

  // Step 1: Account Info - Pre-fill if initial data, session, or existing profile is provided
  const [email, setEmail] = useState(
    session?.user?.email || existingProfile?.email || initialData?.email || ''
  );
  const [password, setPassword] = useState(initialData?.password || '');
  const [confirmPassword, setConfirmPassword] = useState(initialData?.password || '');
  const [fullName, setFullName] = useState(
    existingProfile?.full_name || initialData?.name || ''
  );
  const [phone, setPhone] = useState(
    existingProfile?.phone || initialData?.phone || ''
  );
  const [location, setLocation] = useState(existingProfile?.location || '');

  // Detect if user is already logged in
  useEffect(() => {
    if (session?.user) {
      setIsExistingUser(true);
      setEmail(session.user.email || '');
      setEmailExists(false); // Don't show email exists error for logged-in users
      
      // Load existing profile data if available
      if (existingProfile) {
        setFullName(existingProfile.full_name || '');
        setPhone(existingProfile.phone || '');
        setLocation(existingProfile.location || '');
      }
    }
  }, [session, existingProfile]);

  // Step 2: Professional Info
  const [bio, setBio] = useState('');
  const hourlyRate = '20000'; // Platform-fixed rate — tutors cannot change this
  const [experienceYears, setExperienceYears] = useState('');
  const [qualifications, setQualifications] = useState('');
  const [teachingStyle, setTeachingStyle] = useState('');
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [otherSubject, setOtherSubject] = useState('');

  // Step 3: Teaching Preferences
  const [selectedAgeGroups, setSelectedAgeGroups] = useState<string[]>([]);
  const [selectedClasses, setSelectedClasses] = useState<string[]>([]);
  const [teachingFormat, setTeachingFormat] = useState('Both Online & In-Person'); // Default value
  const [groupSize, setGroupSize] = useState('Both Individual & Groups'); // Default value
  const [travelRadius, setTravelRadius] = useState('');
  const [maxStudents, setMaxStudents] = useState('');

  // Step 4: Specializations
  const [selectedExamBoards, setSelectedExamBoards] = useState<string[]>([]);
  const [selectedLearningDifficulties, setSelectedLearningDifficulties] = useState<string[]>([]);
  const [otherLearningDifficulty, setOtherLearningDifficulty] = useState('');
  const [selectedMethodologies, setSelectedMethodologies] = useState<string[]>([]);
  const [otherMethodology, setOtherMethodology] = useState('');
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>([]);
  const [otherLanguage, setOtherLanguage] = useState('');

  // Step 2: Education credentials
  const [headline, setHeadline] = useState('');
  const [educationLevel, setEducationLevel] = useState('');
  const [institution, setInstitution] = useState('');

  // Step 5: Verification
  const [dbsChecked, setDbsChecked] = useState(false);
  const [hasInsurance, setHasInsurance] = useState(false);
  const [agreeBackgroundCheck, setAgreeBackgroundCheck] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(false);

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setError('Please upload a JPG, PNG, or WebP image.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('Photo must be under 5 MB.');
      return;
    }
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
    setError('');
  };

  const uploadPhoto = async (userId: string): Promise<string | null> => {
    if (!photoFile) return null;
    setPhotoUploading(true);
    try {
      const ext = photoFile.name.split('.').pop();
      const path = `${userId}/passport.${ext}`;
      const bucketName = 'tutor-photos';
      const { data: buckets } = await supabase.storage.listBuckets();
      const exists = buckets?.some((b: any) => b.name === bucketName);
      if (!exists) {
        await supabase.storage.createBucket(bucketName, { public: true });
      }
      const { error: upErr } = await supabase.storage
        .from(bucketName)
        .upload(path, photoFile, { upsert: true, contentType: photoFile.type });
      if (upErr) throw upErr;
      const { data: urlData } = supabase.storage.from(bucketName).getPublicUrl(path);
      return urlData.publicUrl ?? null;
    } catch (err: any) {
      console.warn('Photo upload failed:', err.message);
      return null;
    } finally {
      setPhotoUploading(false);
    }
  };

  const toggleItem = (item: string, list: string[], setList: (items: string[]) => void) => {
    if (list.includes(item)) {
      setList(list.filter(i => i !== item));
    } else {
      setList([...list, item]);
    }
  };

  const toggleSubject = (subject: string) => {
    if (selectedSubjects.includes(subject)) {
      setSelectedSubjects(selectedSubjects.filter(s => s !== subject));
    } else {
      // Limit to 3 subjects
      if (selectedSubjects.length >= 3) {
        setError('You can only select up to 3 subjects');
        return;
      }
      setSelectedSubjects([...selectedSubjects, subject]);
    }
  };

  // Function to check if email exists
  const checkEmailAvailability = async (emailToCheck: string) => {
    if (!emailToCheck || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailToCheck)) {
      return;
    }

    // If user is logged in and email matches their account, skip the check
    if (isExistingUser && session?.user?.email === emailToCheck) {
      setEmailExists(false);
      setError('');
      return;
    }

    setEmailCheckLoading(true);
    setEmailExists(false);

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-cbd74580/check-email`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${publicAnonKey}`,
          },
          body: JSON.stringify({ email: emailToCheck }),
        }
      );

      if (response.ok) {
        const data = await response.json();
        if (data.exists) {
          setEmailExists(true);
          setError('This email is already registered. Please sign in or use a different email.');
        } else {
          setEmailExists(false);
          // Clear any previous errors about email existence
          if (error.includes('already registered')) {
            setError('');
          }
        }
      }
    } catch (err) {
      console.error('Error checking email:', err);
    } finally {
      setEmailCheckLoading(false);
    }
  };

  const validateStep1 = () => {
    // If user is already logged in, skip account creation fields validation
    if (isExistingUser) {
      if (!fullName || !location) {
        setError('Please fill in all required fields');
        return false;
      }
      return true;
    }
    
    // For new users, validate all account creation fields
    if (!email || !password || !fullName) {
      setError('Please fill in all required fields');
      return false;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Please enter a valid email address');
      return false;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters long');
      return false;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return false;
    }
    return true;
  };

  const validateStep2 = () => {
    if (!bio || !qualifications || selectedSubjects.length === 0 || !experienceYears) {
      setError('Please fill in all required fields and select at least one subject');
      return false;
    }
    return true;
  };

  const validateStep3 = () => {
    if (selectedAgeGroups.length === 0) {
      setError('Please select at least one age group you can teach');
      return false;
    }
    return true;
  };

  const validateStep5 = () => {
    if (!agreeBackgroundCheck || !agreeTerms) {
      setError('Please agree to the background check and terms of service');
      return false;
    }
    return true;
  };

  const handleNextStep = () => {
    setError('');
    
    if (step === 1 && !validateStep1()) return;
    if (step === 2 && !validateStep2()) return;
    if (step === 3 && !validateStep3()) return;
    
    setStep(step + 1);
    window.scrollTo(0, 0);
  };

  const handlePreviousStep = () => {
    setError('');
    setStep(step - 1);
    window.scrollTo(0, 0);
  };

  const handleSubmit = async () => {
    setError('');
    setSuccess('');

    if (!validateStep5()) return;

    setLoading(true);

    try {
      let tutorSession = session; // Use existing session if user is logged in
      let userId = session?.user?.id;

      // Merge "Others" free-text values into their respective arrays (used in both paths)
      const finalSubjects = selectedSubjects.includes('Others') && otherSubject.trim()
        ? [...selectedSubjects.filter(s => s !== 'Others'), otherSubject.trim()]
        : selectedSubjects;
      const finalLearningDifficulties = selectedLearningDifficulties.includes('Others') && otherLearningDifficulty.trim()
        ? [...selectedLearningDifficulties.filter(s => s !== 'Others'), otherLearningDifficulty.trim()]
        : selectedLearningDifficulties;
      const finalMethodologies = selectedMethodologies.includes('Others') && otherMethodology.trim()
        ? [...selectedMethodologies.filter(s => s !== 'Others'), otherMethodology.trim()]
        : selectedMethodologies;
      const finalLanguages = selectedLanguages.includes('Others') && otherLanguage.trim()
        ? [...selectedLanguages.filter(s => s !== 'Others'), otherLanguage.trim()]
        : selectedLanguages;

      // If user is NOT already logged in, create a new account with full profile in one call
      if (!isExistingUser) {
        console.log('Creating new tutor account for:', email);

        // For new users: sign up first to get userId, then upload photo
        // We'll include photo_url as a placeholder and update after signup if needed.
        // For simplicity: create account, get userId from response, then upload photo and patch profile.
        const tutorProfileData: any = {
          full_name: fullName,
          email,
          phone,
          location,
          headline,
          education_level: educationLevel,
          institution,
          bio,
          hourly_rate: parseFloat(hourlyRate),
          experience_years: experienceYears ? parseInt(experienceYears) : null,
          qualifications,
          teaching_style: teachingStyle,
          subjects: finalSubjects,
          age_groups: selectedAgeGroups,
          classes: selectedClasses,
          teaching_format: teachingFormat,
          group_size: groupSize,
          travel_radius: travelRadius ? parseFloat(travelRadius) : null,
          max_students: maxStudents ? parseInt(maxStudents) : null,
          exam_boards: selectedExamBoards,
          learning_difficulties: finalLearningDifficulties,
          methodologies: finalMethodologies,
          languages: finalLanguages,
          dbs_checked: dbsChecked,
          has_insurance: hasInsurance,
          verificationStatus: 'pending',
          role: 'tutor',
          onboardingComplete: true,
        };

        let signupResponse;
        // Note: photo upload happens after signup using the returned userId
        try {
          signupResponse = await fetch(
            `https://${projectId}.supabase.co/functions/v1/make-server-cbd74580/signup`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${publicAnonKey}`,
              },
              body: JSON.stringify({
                email,
                password,
                name: fullName,
                role: 'tutor',
                profileData: tutorProfileData,
              }),
            }
          );
        } catch (networkError: any) {
          throw new Error('Network error: Unable to connect to server. Please check your internet connection and try again.');
        }

        let signupData;
        try {
          signupData = await signupResponse.json();
        } catch {
          throw new Error('Invalid server response. Please try again or contact support.');
        }

        if (!signupResponse.ok) {
          if (signupData.error?.includes('already exists') || signupData.error?.includes('already registered')) {
            throw new Error('A user with this email already exists. Please sign in instead.');
          }
          throw new Error(signupData.error || 'Failed to create account');
        }

        if (!signupData.success) {
          throw new Error('Failed to create account');
        }

        // If a photo was selected, upload it now using the new userId
        if (photoFile && signupData.userId) {
          const photoUrl = await uploadPhoto(signupData.userId);
          if (photoUrl && signupData.accessToken) {
            // Patch the profile with the photo URL
            await fetch(
              `https://${projectId}.supabase.co/functions/v1/make-server-cbd74580/profiles/${signupData.userId}`,
              {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${signupData.accessToken}` },
                body: JSON.stringify({ photo_url: photoUrl }),
              }
            ).catch(() => {});
          }
        }

        // Email confirmation required — show the "check your email" screen
        setEmailConfirmationSent(true);
        return;
      } else {
        // Existing user updating their tutor profile
        console.log('User is already logged in, updating tutor profile for userId:', userId);
      }

      if (!userId) {
        throw new Error('No user ID available to create profile');
      }

      if (!tutorSession?.access_token) {
        throw new Error('No access token available to create profile');
      }

      // Upload photo for existing users (userId is already known)
      let existingUserPhotoUrl: string | null = null;
      if (photoFile && userId) {
        existingUserPhotoUrl = await uploadPhoto(userId);
      }

      // Existing user: update profile via backend
      const profileData: any = {
        full_name: fullName,
        email,
        phone,
        location,
        headline,
        education_level: educationLevel,
        institution,
        bio,
        hourly_rate: parseFloat(hourlyRate),
        experience_years: experienceYears ? parseInt(experienceYears) : null,
        qualifications,
        teaching_style: teachingStyle,
        subjects: finalSubjects,
        age_groups: selectedAgeGroups,
        classes: selectedClasses,
        teaching_format: teachingFormat,
        group_size: groupSize,
        travel_radius: travelRadius ? parseFloat(travelRadius) : null,
        max_students: maxStudents ? parseInt(maxStudents) : null,
        exam_boards: selectedExamBoards,
        learning_difficulties: finalLearningDifficulties,
        methodologies: finalMethodologies,
        languages: finalLanguages,
        dbs_checked: dbsChecked,
        has_insurance: hasInsurance,
        verificationStatus: 'pending',
        role: 'tutor',
        onboardingComplete: true,
        ...(existingUserPhotoUrl ? { photo_url: existingUserPhotoUrl } : {}),
      };

      let profileSaved = false;
      try {
        const profileResponse = await fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-cbd74580/profiles/${userId}`,
          {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${tutorSession.access_token}`,
            },
            body: JSON.stringify(profileData),
            signal: AbortSignal.timeout(15000),
          }
        );
        if (profileResponse.ok) {
          profileSaved = true;
        } else {
          const errorData = await profileResponse.json().catch(() => ({}));
          throw new Error('Failed to create profile: ' + (errorData.error || 'Unknown error'));
        }
      } catch (fetchErr: any) {
        // Network / timeout failure — fall back to writing just the role via POST /profile
        // so the user lands on the dashboard. They can complete profile details later.
        const isNetworkErr =
          fetchErr instanceof TypeError ||
          fetchErr.name === 'TimeoutError' ||
          fetchErr.name === 'AbortError';
        if (!isNetworkErr) throw fetchErr; // re-throw server-side errors

        console.warn('PUT /profiles failed with network error, falling back to role-only save:', fetchErr.message);
        try {
          await fetch(
            `https://${projectId}.supabase.co/functions/v1/make-server-cbd74580/profile`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tutorSession.access_token}` },
              body: JSON.stringify({ role: 'tutor' }),
              signal: AbortSignal.timeout(10000),
            }
          );
        } catch (_) {
          // Last resort: write role to auth metadata directly
          await getSupabaseClient().auth.updateUser({ data: { role: 'tutor' } });
        }
      }

      console.log('✅ Tutor profile updated successfully!');

      if (!isExistingUser) {
        setSuccess('Account created successfully! Welcome to TutorNest!');
        setTimeout(() => {
          if (onSignupComplete) {
            onSignupComplete();
          } else {
            window.location.reload();
          }
        }, 1000);
      } else {
        // For existing users, show success and trigger callback
        setSuccess('Tutor profile created successfully! Welcome to TutorNest!');
        
        setTimeout(() => {
          if (onSignupComplete) {
            onSignupComplete();
          } else {
            // Reload the page to refresh the profile
            window.location.reload();
          }
        }, 1000);
      }

    } catch (err: any) {
      console.error('Signup error:', err);
      setError(err.message || 'An error occurred during signup');
    } finally {
      setLoading(false);
    }
  };

  const renderStepIndicator = () => (
    <div className="mb-8">
      <div className="flex items-center justify-between">
        {[1, 2, 3, 4, 5].map((s) => (
          <div key={s} className="flex items-center">
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                s === step
                  ? 'bg-[#625d9c] text-white'
                  : s < step
                  ? 'bg-[#5d9827] text-white'
                  : 'bg-gray-200 text-gray-400'
              }`}
            >
              {s < step ? <CheckCircle className="w-5 h-5" /> : s}
            </div>
            {s < 5 && (
              <div
                className={`h-1 w-12 sm:w-20 mx-1 ${
                  s < step ? 'bg-[#5d9827]' : 'bg-gray-200'
                }`}
              />
            )}
          </div>
        ))}
      </div>
      <div className="flex justify-between mt-2 text-xs text-gray-600">
        <span>Account</span>
        <span>Professional</span>
        <span>Preferences</span>
        <span>Expertise</span>
        <span>Verify</span>
      </div>
    </div>
  );

  return (
    <AuthBackground className="py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Logo */}
        <div className="flex justify-center mb-6">
          <TutorNestLogo />
        </div>

        {emailConfirmationSent ? (
          <div className="bg-white rounded-3xl shadow-xl p-8 text-center">
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Application Submitted!</h2>
            <p className="text-gray-600 mb-6">
              Your tutor application for <strong>{email}</strong> has been received.
              You can sign in now — your account will be reviewed within 24–48 hours.
            </p>
            <button
              onClick={onBackToSignIn}
              className="w-full py-3 px-6 rounded-xl text-white font-semibold"
              style={{ backgroundColor: '#625d9c' }}
            >
              Sign In Now
            </button>
          </div>
        ) : (

        <div className="bg-white rounded-3xl shadow-xl p-6 sm:p-8">
          <h1 className="text-center mb-2 text-gray-900">Become a TutorNest Tutor</h1>
          <p className="text-center text-gray-600 mb-8">
            Complete your profile to start connecting with students
          </p>

          {renderStepIndicator()}

          {/* Messages */}
          {error && (
            <Alert className="mb-6 bg-red-50 border-red-200">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-800">{error}</AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert className="mb-6 bg-green-50 border-green-200">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">{success}</AlertDescription>
            </Alert>
          )}

          {/* Step 1: Account Information */}
          {step === 1 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="w-5 h-5" />
                  Account Information
                </CardTitle>
                <CardDescription>
                  {isExistingUser 
                    ? 'Complete your profile information' 
                    : 'Create your tutor account'}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {isExistingUser && (
                  <Alert className="bg-blue-50 border-blue-200">
                    <CheckCircle className="h-4 w-4 text-blue-600" />
                    <AlertDescription className="text-blue-800">
                      <strong>Welcome back!</strong> We've pre-filled your account information. Please complete your tutor profile below.
                    </AlertDescription>
                  </Alert>
                )}
                
                <div>
                  <Label htmlFor="fullName">Full Name *</Label>
                  <Input
                    id="fullName"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="John Doe"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="email">Email *</Label>
                  <div className="relative">
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => {
                        if (!isExistingUser) {
                          setEmail(e.target.value);
                          setEmailExists(false); // Reset on change
                          if (error.includes('already registered')) {
                            setError(''); // Clear error when user starts typing
                          }
                        }
                      }}
                      onBlur={(e) => !isExistingUser && checkEmailAvailability(e.target.value)}
                      placeholder="john@example.com"
                      className={emailExists ? 'border-red-500 pr-10' : emailCheckLoading ? 'pr-10' : ''}
                      required
                      disabled={isExistingUser}
                    />
                    {!isExistingUser && emailCheckLoading && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        <div className="animate-spin h-5 w-5 border-2 border-gray-300 border-t-[#625d9c] rounded-full" />
                      </div>
                    )}
                    {!isExistingUser && !emailCheckLoading && emailExists && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        <AlertCircle className="h-5 w-5 text-red-500" />
                      </div>
                    )}
                    {!isExistingUser && !emailCheckLoading && email && !emailExists && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        <CheckCircle className="h-5 w-5 text-green-500" />
                      </div>
                    )}
                  </div>
                  {!isExistingUser && emailExists && (
                    <p className="text-sm text-red-600 mt-1 flex items-center gap-1">
                      <AlertCircle className="h-4 w-4" />
                      This email is already registered.{' '}
                      <button
                        type="button"
                        onClick={() => onBackToSignIn?.()}
                        className="underline hover:no-underline"
                        style={{ color: '#625d9c' }}
                      >
                        Sign in instead?
                      </button>
                    </p>
                  )}
                  {isExistingUser && (
                    <p className="text-xs text-gray-500 mt-1">This email is linked to your account</p>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="phone">Phone Number (with country code)</Label>
                    <Input
                      id="phone"
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="e.g., +1 555-123-4567, +44 20 7123 4567"
                    />
                    <p className="text-xs text-gray-500 mt-1">Include your country code (e.g., +1, +44, +91)</p>
                  </div>
                  <div>
                    <Label htmlFor="location">Location (City, Country) *</Label>
                    <Input
                      id="location"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      placeholder="e.g., London, UK or New York, USA"
                      required
                    />
                    <p className="text-xs text-gray-500 mt-1">Where are you based?</p>
                  </div>
                </div>

                {/* Only show password fields for new users */}
                {!isExistingUser && (
                  <>
                    <div>
                      <Label htmlFor="password">Password *</Label>
                      <Input
                        id="password"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="At least 6 characters"
                        required
                      />
                    </div>

                    <div>
                      <Label htmlFor="confirmPassword">Confirm Password *</Label>
                      <Input
                        id="confirmPassword"
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Confirm your password"
                        required
                      />
                    </div>
                  </>
                )}

                {/* Passport Photo */}
                <div>
                  <Label>Passport Photo</Label>
                  <p className="text-xs text-gray-500 mb-2">
                    Upload a clear headshot (JPG, PNG or WebP, max 5 MB). Displayed to parents when booking and to admins during verification.
                  </p>
                  <div className="flex items-center gap-4">
                    {photoPreview ? (
                      <img
                        src={photoPreview}
                        alt="Preview"
                        className="w-20 h-20 rounded-full object-cover border-2 border-[#625d9c]"
                      />
                    ) : (
                      <div
                        className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center border-2 border-dashed border-gray-300"
                      >
                        <User className="w-8 h-8 text-gray-400" />
                      </div>
                    )}
                    <div>
                      <label
                        htmlFor="photoUpload"
                        className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium border border-[#625d9c] text-[#625d9c] hover:bg-[#f0edfb] transition-colors"
                      >
                        {photoPreview ? 'Change Photo' : 'Upload Photo'}
                        <input
                          id="photoUpload"
                          type="file"
                          accept="image/jpeg,image/png,image/webp"
                          className="hidden"
                          onChange={handlePhotoChange}
                        />
                      </label>
                      {photoPreview && (
                        <button
                          type="button"
                          onClick={() => { setPhotoFile(null); setPhotoPreview(null); }}
                          className="block mt-1 text-xs text-gray-500 hover:text-red-500"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 2: Professional Information */}
          {step === 2 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="w-5 h-5" />
                  Professional Information
                </CardTitle>
                <CardDescription>Tell us about your teaching experience</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="headline">Professional Headline</Label>
                  <Input
                    id="headline"
                    value={headline}
                    onChange={(e) => setHeadline(e.target.value)}
                    placeholder="e.g. Experienced Maths Tutor | GCSE & A-Level | 8 years | University of Lagos graduate"
                    maxLength={120}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    A short tagline parents see first when browsing tutors (max 120 characters)
                  </p>
                </div>

                <div>
                  <Label htmlFor="bio">About Me / Bio *</Label>
                  <Textarea
                    id="bio"
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder="Tell parents and students about yourself, your teaching philosophy, your track record, and what makes you a great tutor..."
                    rows={5}
                    required
                  />
                </div>

                {/* Session Rate Information */}
                <div className="p-4 bg-green-50 border-2 border-green-200 rounded-lg">
                  <h3 className="font-semibold text-green-900 mb-2">💰 Session Payment Structure</h3>
                  <div className="space-y-2 text-sm text-green-800">
                    <p><strong>Flat Rate per Session:</strong> ₦20,000</p>
                    <div className="pl-4 space-y-1">
                      <p>• You receive: <strong>80%</strong> of session fee</p>
                      <p>• TutorNest Platform Fee: <strong>20%</strong></p>
                    </div>
                    <p className="text-xs mt-2 text-green-700">
                      All tutors on TutorNest receive the same competitive rate. This ensures fair compensation and transparent pricing for parents.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="experienceYears">Years of Teaching Experience *</Label>
                    <Input
                      id="experienceYears"
                      type="number"
                      min="0"
                      max="50"
                      value={experienceYears}
                      onChange={(e) => setExperienceYears(e.target.value)}
                      placeholder="5"
                      required
                    />
                  </div>
                  <div>
                    <Label>Highest Education Level</Label>
                    <Select value={educationLevel} onValueChange={setEducationLevel}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select level" />
                      </SelectTrigger>
                      <SelectContent>
                        {EDUCATION_LEVELS.map(level => (
                          <SelectItem key={level} value={level}>{level}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="institution">University / Institution</Label>
                    <Input
                      id="institution"
                      value={institution}
                      onChange={(e) => setInstitution(e.target.value)}
                      placeholder="e.g. University of Lagos"
                    />
                  </div>
                </div>

                <div>
                  <Label>Subjects You Teach * (Maximum 3 - {selectedSubjects.length}/3 selected)</Label>
                  <p className="text-xs text-gray-500 mt-1 mb-2">Select up to 3 subjects you can teach effectively</p>
                  <div className="mt-2 p-4 border rounded-lg bg-gray-50 max-h-60 overflow-y-auto">
                    <div className="flex flex-wrap gap-2">
                      {AVAILABLE_SUBJECTS.map(subject => (
                        <button
                          key={subject}
                          type="button"
                          onClick={() => toggleSubject(subject)}
                          disabled={!selectedSubjects.includes(subject) && selectedSubjects.length >= 3}
                          className={`px-3 py-1.5 rounded-full text-sm transition-all ${
                            selectedSubjects.includes(subject)
                              ? 'bg-[#625d9c] text-white hover:bg-[#524d8a]'
                              : selectedSubjects.length >= 3
                              ? 'bg-gray-100 border border-gray-200 text-gray-400 cursor-not-allowed'
                              : 'bg-white border border-gray-300 text-gray-700 hover:border-[#625d9c]'
                          }`}
                        >
                          {subject}
                        </button>
                      ))}
                      {selectedSubjects.includes('Others') && (
                        <Input
                          type="text"
                          value={otherSubject}
                          onChange={(e) => setOtherSubject(e.target.value)}
                          placeholder="Specify other subject"
                          className="px-3 py-1.5 rounded-full text-sm transition-all bg-gray-50 border border-gray-300 text-gray-700 hover:border-[#5d9827]"
                        />
                      )}
                    </div>
                  </div>
                </div>

                <div>
                  <Label htmlFor="qualifications">Qualifications & Certifications *</Label>
                  <Textarea
                    id="qualifications"
                    value={qualifications}
                    onChange={(e) => setQualifications(e.target.value)}
                    placeholder="BSc Mathematics - University of Oxford&#10;PGCE Secondary Mathematics&#10;QTS (Qualified Teacher Status)"
                    rows={4}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="teachingStyle">Teaching Style</Label>
                  <Textarea
                    id="teachingStyle"
                    value={teachingStyle}
                    onChange={(e) => setTeachingStyle(e.target.value)}
                    placeholder="Describe your teaching approach and methodology..."
                    rows={3}
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 3: Teaching Preferences */}
          {step === 3 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="w-5 h-5" />
                  Teaching Preferences
                </CardTitle>
                <CardDescription>Help us match you with the right students</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Age Groups You Teach ({selectedAgeGroups.length} selected)</Label>
                  <p className="text-xs text-gray-500 mt-1 mb-2">Select the age groups you're comfortable teaching</p>
                  <div className="mt-2 p-4 border rounded-lg bg-gray-50">
                    <div className="flex flex-wrap gap-2">
                      {AGE_GROUPS.map(ageGroup => (
                        <button
                          key={ageGroup}
                          type="button"
                          onClick={() => {
                            const isRemoving = selectedAgeGroups.includes(ageGroup);
                            toggleItem(ageGroup, selectedAgeGroups, setSelectedAgeGroups);
                            // Remove classes that belong to this age group when it's deselected
                            if (isRemoving) {
                              const removedClasses = CLASS_OPTIONS[ageGroup] || [];
                              setSelectedClasses(prev => prev.filter(c => !removedClasses.includes(c)));
                            }
                          }}
                          className={`px-3 py-1.5 rounded-full text-sm transition-all ${
                            selectedAgeGroups.includes(ageGroup)
                              ? 'bg-[#5d9827] text-white hover:bg-[#4d8217]'
                              : 'bg-white border border-gray-300 text-gray-700 hover:border-[#5d9827]'
                          }`}
                        >
                          {ageGroup}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div>
                  <Label>Classes You Teach ({selectedClasses.length} selected)</Label>
                  <p className="text-xs text-gray-500 mt-1 mb-2">Select the specific classes you're comfortable teaching</p>
                  <div className="mt-2 p-4 border rounded-lg bg-gray-50">
                    <div className="flex flex-wrap gap-2">
                      {selectedAgeGroups.map(ageGroup => (
                        CLASS_OPTIONS[ageGroup]?.map(cls => (
                          <button
                            key={cls}
                            type="button"
                            onClick={() => toggleItem(cls, selectedClasses, setSelectedClasses)}
                            className={`px-3 py-1.5 rounded-full text-sm transition-all ${
                              selectedClasses.includes(cls)
                                ? 'bg-[#5d9827] text-white hover:bg-[#4d8217]'
                                : 'bg-white border border-gray-300 text-gray-700 hover:border-[#5d9827]'
                            }`}
                          >
                            {cls}
                          </button>
                        ))
                      ))}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Teaching Format *</Label>
                    <p className="text-xs text-gray-500 mt-1 mb-2">How do you prefer to deliver sessions?</p>
                    <Select value={teachingFormat} onValueChange={setTeachingFormat}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select format" />
                      </SelectTrigger>
                      <SelectContent>
                        {TEACHING_FORMATS.map(format => (
                          <SelectItem key={format} value={format}>{format}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Group Size Preference *</Label>
                    <p className="text-xs text-gray-500 mt-1 mb-2">What session types do you offer?</p>
                    <Select value={groupSize} onValueChange={setGroupSize}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select group size" />
                      </SelectTrigger>
                      <SelectContent>
                        {GROUP_SIZES.map(size => (
                          <SelectItem key={size} value={size}>{size}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 4: Specializations & Expertise */}
          {step === 4 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Award className="w-5 h-5" />
                  Specializations & Expertise
                </CardTitle>
                <CardDescription>Share your areas of expertise (optional but recommended)</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Exam Boards ({selectedExamBoards.length} selected)</Label>
                  <div className="mt-2 p-4 border rounded-lg bg-gray-50">
                    <div className="flex flex-wrap gap-2">
                      {EXAM_BOARDS.map(board => (
                        <button
                          key={board}
                          type="button"
                          onClick={() => toggleItem(board, selectedExamBoards, setSelectedExamBoards)}
                          className={`px-3 py-1.5 rounded-full text-sm transition-all ${
                            selectedExamBoards.includes(board)
                              ? 'bg-[#625d9c] text-white hover:bg-[#524d8a]'
                              : 'bg-white border border-gray-300 text-gray-700 hover:border-[#625d9c]'
                          }`}
                        >
                          {board}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div>
                  <Label>Learning Difficulties Support ({selectedLearningDifficulties.length} selected)</Label>
                  <div className="mt-2 p-4 border rounded-lg bg-gray-50">
                    <div className="flex flex-wrap gap-2">
                      {LEARNING_DIFFICULTIES.map(difficulty => (
                        <button
                          key={difficulty}
                          type="button"
                          onClick={() => toggleItem(difficulty, selectedLearningDifficulties, setSelectedLearningDifficulties)}
                          className={`px-3 py-1.5 rounded-full text-sm transition-all ${
                            selectedLearningDifficulties.includes(difficulty)
                              ? 'bg-[#5d9827] text-white hover:bg-[#4d8217]'
                              : 'bg-white border border-gray-300 text-gray-700 hover:border-[#5d9827]'
                          }`}
                        >
                          {difficulty}
                        </button>
                      ))}
                      {selectedLearningDifficulties.includes('Others') && (
                        <Input
                          type="text"
                          value={otherLearningDifficulty}
                          onChange={(e) => setOtherLearningDifficulty(e.target.value)}
                          placeholder="Specify other learning difficulty"
                          className="px-3 py-1.5 rounded-full text-sm transition-all bg-gray-50 border border-gray-300 text-gray-700 hover:border-[#5d9827]"
                        />
                      )}
                    </div>
                  </div>
                </div>

                <div>
                  <Label>Teaching Methodologies ({selectedMethodologies.length} selected)</Label>
                  <div className="mt-2 p-4 border rounded-lg bg-gray-50">
                    <div className="flex flex-wrap gap-2">
                      {TEACHING_METHODOLOGIES.map(methodology => (
                        <button
                          key={methodology}
                          type="button"
                          onClick={() => toggleItem(methodology, selectedMethodologies, setSelectedMethodologies)}
                          className={`px-3 py-1.5 rounded-full text-sm transition-all ${
                            selectedMethodologies.includes(methodology)
                              ? 'bg-[#625d9c] text-white hover:bg-[#524d8a]'
                              : 'bg-white border border-gray-300 text-gray-700 hover:border-[#625d9c]'
                          }`}
                        >
                          {methodology}
                        </button>
                      ))}
                      {selectedMethodologies.includes('Others') && (
                        <Input
                          type="text"
                          value={otherMethodology}
                          onChange={(e) => setOtherMethodology(e.target.value)}
                          placeholder="Specify other methodology"
                          className="px-3 py-1.5 rounded-full text-sm transition-all bg-gray-50 border border-gray-300 text-gray-700 hover:border-[#5d9827]"
                        />
                      )}
                    </div>
                  </div>
                </div>

                <div>
                  <Label>Languages Spoken ({selectedLanguages.length} selected)</Label>
                  <div className="mt-2 p-4 border rounded-lg bg-gray-50">
                    <div className="flex flex-wrap gap-2">
                      {LANGUAGES_SPOKEN.map(language => (
                        <button
                          key={language}
                          type="button"
                          onClick={() => toggleItem(language, selectedLanguages, setSelectedLanguages)}
                          className={`px-3 py-1.5 rounded-full text-sm transition-all ${
                            selectedLanguages.includes(language)
                              ? 'bg-[#5d9827] text-white hover:bg-[#4d8217]'
                              : 'bg-white border border-gray-300 text-gray-700 hover:border-[#5d9827]'
                          }`}
                        >
                          {language}
                        </button>
                      ))}
                      {selectedLanguages.includes('Others') && (
                        <Input
                          type="text"
                          value={otherLanguage}
                          onChange={(e) => setOtherLanguage(e.target.value)}
                          placeholder="Specify other language"
                          className="px-3 py-1.5 rounded-full text-sm transition-all bg-gray-50 border border-gray-300 text-gray-700 hover:border-[#5d9827]"
                        />
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 5: Verification & Agreement */}
          {step === 5 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="w-5 h-5" />
                  Verification & Agreement
                </CardTitle>
                <CardDescription>Complete your registration</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Optional declarations */}
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-3">Optional declarations (helps your profile stand out)</p>
                  <div className="space-y-3">
                    <div className="flex items-start gap-3 p-4 border rounded-lg bg-gray-50">
                      <input
                        type="checkbox"
                        id="dbsChecked"
                        checked={dbsChecked}
                        onChange={(e) => setDbsChecked(e.target.checked)}
                        className="mt-1 w-4 h-4 text-[#625d9c] border-gray-300 rounded focus:ring-[#625d9c]"
                      />
                      <Label htmlFor="dbsChecked" className="cursor-pointer">
                        <strong>I hold a valid DBS / Police Clearance certificate</strong>
                        <p className="text-sm text-gray-600 mt-1">
                          Tick this if you have a current Disclosure and Barring Service (DBS) check or equivalent police clearance. You may be asked to upload evidence during verification.
                        </p>
                      </Label>
                    </div>

                    <div className="flex items-start gap-3 p-4 border rounded-lg bg-gray-50">
                      <input
                        type="checkbox"
                        id="hasInsurance"
                        checked={hasInsurance}
                        onChange={(e) => setHasInsurance(e.target.checked)}
                        className="mt-1 w-4 h-4 text-[#625d9c] border-gray-300 rounded focus:ring-[#625d9c]"
                      />
                      <Label htmlFor="hasInsurance" className="cursor-pointer">
                        <strong>I have professional indemnity / tutor insurance</strong>
                        <p className="text-sm text-gray-600 mt-1">
                          Tick this if you carry your own professional liability insurance as a tutor.
                        </p>
                      </Label>
                    </div>
                  </div>
                </div>

                {/* Required agreements */}
                <div className="space-y-4">
                  <div className="flex items-start gap-3 p-4 border-2 border-[#625d9c] rounded-lg bg-purple-50">
                    <input
                      type="checkbox"
                      id="agreeBackgroundCheck"
                      checked={agreeBackgroundCheck}
                      onChange={(e) => setAgreeBackgroundCheck(e.target.checked)}
                      className="mt-1 w-4 h-4 text-[#625d9c] border-gray-300 rounded focus:ring-[#625d9c]"
                      required
                    />
                    <Label htmlFor="agreeBackgroundCheck" className="cursor-pointer">
                      <strong className="text-[#625d9c]">I agree to undergo a background check *</strong>
                      <p className="text-sm text-gray-600 mt-1">
                        TutorNest is committed to student safety. All tutors are subject to background verification including identity verification, qualification verification, and safeguarding checks. This process helps build trust with parents and students.
                      </p>
                    </Label>
                  </div>

                  <div className="flex items-start gap-3 p-4 border-2 border-[#625d9c] rounded-lg bg-purple-50">
                    <input
                      type="checkbox"
                      id="agreeTerms"
                      checked={agreeTerms}
                      onChange={(e) => setAgreeTerms(e.target.checked)}
                      className="mt-1 w-4 h-4 text-[#625d9c] border-gray-300 rounded focus:ring-[#625d9c]"
                      required
                    />
                    <Label htmlFor="agreeTerms" className="cursor-pointer">
                      <strong className="text-[#625d9c]">I agree to the Terms of Service and Privacy Policy *</strong>
                      <p className="text-sm text-gray-600 mt-1">
                        By checking this box, you agree to TutorNest's Terms of Service, Privacy Policy, and Tutor Code of Conduct.
                      </p>
                    </Label>
                  </div>
                </div>

                <Alert className="bg-blue-50 border-blue-200">
                  <Shield className="h-4 w-4 text-blue-600" />
                  <AlertDescription className="text-blue-800">
                    <strong>What happens next?</strong>
                    <ul className="text-sm mt-2 space-y-1 list-disc list-inside">
                      <li>Your profile will be reviewed by our team (usually within 24-48 hours)</li>
                      <li>You'll receive an email with next steps for background verification</li>
                      <li>Once verified, you can start receiving student invitations</li>
                      <li>You'll have access to your tutor dashboard immediately</li>
                    </ul>
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          )}

          {/* Navigation Buttons */}
          <div className="flex justify-between mt-8">
            {step > 1 && (
              <Button
                type="button"
                variant="outline"
                onClick={handlePreviousStep}
                disabled={loading}
              >
                Previous
              </Button>
            )}
            
            <div className="ml-auto">
              {step < 5 ? (
                <Button
                  type="button"
                  onClick={handleNextStep}
                  className="text-white"
                  style={{ backgroundColor: '#625d9c' }}
                >
                  Next Step
                </Button>
              ) : (
                <Button
                  type="button"
                  onClick={handleSubmit}
                  disabled={loading}
                  className="text-white"
                  style={{ backgroundColor: '#5d9827' }}
                >
                  {photoUploading ? 'Uploading Photo...' : loading ? 'Creating Account...' : 'Complete Registration'}
                </Button>
              )}
            </div>
          </div>

          {/* Already have account */}
          <div className="mt-6 text-center text-sm">
            <span className="text-gray-600">Already have an account? </span>
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                onBackToSignIn?.();
              }}
              className="hover:underline"
              style={{ color: '#625d9c' }}
            >
              Sign in
            </button>
          </div>
        </div>
        )}
      </div>
    </AuthBackground>
  );
}