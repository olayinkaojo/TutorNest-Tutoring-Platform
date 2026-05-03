import { useState } from 'react';
import { AuthBackground } from './AuthBackground';
import { getSupabaseClient } from '../utils/supabase/client';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Alert, AlertDescription } from './ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { CheckCircle, AlertCircle, ArrowLeft, UserPlus, Mail, Clock } from 'lucide-react';
import TutorNestLogo from './TutorNestLogo';
import { projectId, publicAnonKey } from '../utils/supabase/info';

const supabase = getSupabaseClient();

interface StudentSignupProps {
  onBackToSignIn: () => void;
  initialData?: { email: string; password: string; name: string; phone?: string } | null;
  onSignupSuccess?: () => void;
}

export function StudentSignup({ onBackToSignIn, initialData, onSignupSuccess }: StudentSignupProps) {
  const [signupType, setSignupType] = useState<'independent' | 'dependent' | null>(null);
  const [formData, setFormData] = useState({
    email: initialData?.email || '',
    password: initialData?.password || '',
    confirmPassword: '',
    firstName: initialData?.name || '',
    lastName: '',
    dateOfBirth: '',
    parentEmail: '',
    subjects: '',
    learningGoals: ''
  });
  const [age, setAge] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [awaitingParentLink, setAwaitingParentLink] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  const calculateAge = (dob: string) => {
    const birthDate = new Date(dob);
    const today = new Date();
    let calculatedAge = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      calculatedAge--;
    }
    return calculatedAge;
  };

  const handleDateOfBirthChange = (dob: string) => {
    setFormData({ ...formData, dateOfBirth: dob });
    if (dob) {
      const calculatedAge = calculateAge(dob);
      setAge(calculatedAge);
      
      // Auto-select signup type based on age
      if (calculatedAge >= 18) {
        setSignupType('independent');
      } else if (calculatedAge >= 13) {
        setSignupType('dependent');
      } else {
        setSignupType(null);
      }
    } else {
      setAge(null);
      setSignupType(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Validation
      if (!formData.email || !formData.password || !formData.firstName || !formData.lastName || !formData.dateOfBirth) {
        throw new Error('Please fill in all required fields');
      }

      if (formData.password !== formData.confirmPassword) {
        throw new Error('Passwords do not match');
      }

      if (formData.password.length < 6) {
        throw new Error('Password must be at least 6 characters');
      }

      if (age === null) {
        throw new Error('Invalid date of birth');
      }

      // Prepare subjects array
      const subjectsArray = formData.subjects 
        ? formData.subjects.split(',').map(s => s.trim()).filter(Boolean)
        : [];

      if (signupType === 'independent') {
        // Independent student signup (18+)
        if (age < 18) {
          throw new Error('Independent signup requires age 18 or older');
        }

        const response = await fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-cbd74580/student-auth/independent-signup`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${publicAnonKey}`,
            },
            body: JSON.stringify({
              email: formData.email,
              password: formData.password,
              firstName: formData.firstName,
              lastName: formData.lastName,
              dateOfBirth: formData.dateOfBirth,
              subjects: subjectsArray,
              learningGoals: formData.learningGoals
            })
          }
        );

        const data = await response.json();
        console.log('Independent signup response status:', response.status);
        console.log('Independent signup response data:', data);

        if (!response.ok) {
          console.error('Independent signup failed with status:', response.status);
          console.error('Error from server:', data.error);
          console.error('Debug info:', data.debug);
          
          const errorMsg = data.debug 
            ? `${data.error}\n\nDebug: ${JSON.stringify(data.debug, null, 2)}`
            : data.error || 'Failed to create account';
          throw new Error(errorMsg);
        }

        // Account created successfully - user can log in immediately
        // Show "check your email" screen, but user CAN log in now
        setSuccess(true);
        
        // Trigger callback to show dashboard or navigate
        setTimeout(() => {
          if (onSignupSuccess) {
            onSignupSuccess();
          }
        }, 1500);

      } else if (signupType === 'dependent') {
        // Dependent student signup (13-17)
        if (age < 13 || age >= 18) {
          throw new Error('Dependent signup is for students aged 13-17');
        }

        if (!formData.parentEmail) {
          throw new Error('Parent email is required for students under 18');
        }

        const response = await fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-cbd74580/student-auth/dependent-signup`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${publicAnonKey}`,
            },
            body: JSON.stringify({
              email: formData.email,
              password: formData.password,
              firstName: formData.firstName,
              lastName: formData.lastName,
              dateOfBirth: formData.dateOfBirth,
              parentEmail: formData.parentEmail,
              subjects: subjectsArray,
              learningGoals: formData.learningGoals
            })
          }
        );

        const data = await response.json();
        console.log('Dependent signup response status:', response.status);
        console.log('Dependent signup response data:', data);

        if (!response.ok) {
          console.error('Dependent signup failed with status:', response.status);
          console.error('Error from server:', data.error);
          console.error('Debug info:', data.debug);
          
          const errorMsg = data.debug 
            ? `${data.error}\\n\\nDebug: ${JSON.stringify(data.debug, null, 2)}`
            : data.error || 'Failed to create account';
          throw new Error(errorMsg);
        }

        // Set the session in Supabase client if returned
        if (data.session) {
          console.log('Setting session in Supabase client for dependent student...');
          const { error: sessionError } = await supabase.auth.setSession({
            access_token: data.session.access_token,
            refresh_token: data.session.refresh_token,
          });
          
          if (sessionError) {
            console.error('Error setting session:', sessionError);
            throw new Error('Failed to establish session: ' + sessionError.message);
          }
        }

        setSuccess(true);
        setAwaitingParentLink(true);
        
        // Trigger callback to refresh session and show dashboard
        setTimeout(() => {
          if (onSignupSuccess) {
            onSignupSuccess();
          } else {
            // Fallback to reload if no callback provided
            window.location.reload();
          }
        }, 1000);
      }

    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (success && signupType === 'independent') {
    return (
      <AuthBackground className="flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle className="w-10 h-10 text-green-600" />
            </div>
            <CardTitle className="text-2xl">Account Created! ✅</CardTitle>
            <CardDescription>
              A verification email has been sent to <strong>{formData.email}</strong>
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-sm text-gray-600 mb-4">
              You can log in and start using TutorNest right now! The email is for your reference.
            </p>
            <Button
              onClick={onBackToSignIn}
              className="text-white w-full"
              style={{ backgroundColor: '#625d9c' }}
            >
              Go to Login
            </Button>
          </CardContent>
        </Card>
      </AuthBackground>
    );
  }

  if (success && signupType === 'dependent' && awaitingParentLink) {
    return (
      <AuthBackground className="flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
              <Mail className="w-10 h-10 text-blue-600" />
            </div>
            <CardTitle className="text-2xl">Almost There! 📧</CardTitle>
            <CardDescription>
              We've sent an invitation to your parent/guardian
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Alert className="mb-4">
              <Clock className="size-4" />
              <AlertDescription>
                <strong>Next Steps:</strong><br />
                <ol className="list-decimal ml-4 mt-2 space-y-1 text-sm">
                  <li>Your parent will receive an email at <strong>{formData.parentEmail}</strong></li>
                  <li>They'll click the acceptance link</li>
                  <li>Your account will be linked and activated</li>
                  <li>You'll receive a notification when approved</li>
                </ol>
              </AlertDescription>
            </Alert>
            
            <div className="space-y-3">
              <p className="text-sm text-gray-600">
                You can log in now, but you'll need parent approval before booking sessions.
              </p>
              
              <Button
                onClick={onBackToSignIn}
                className="text-white w-full"
                style={{ backgroundColor: '#625d9c' }}
              >
                Go to Login
              </Button>
              
              <Button
                onClick={onBackToSignIn}
                variant="outline"
                className="w-full"
              >
                Back to Home
              </Button>
            </div>
          </CardContent>
        </Card>
      </AuthBackground>
    );
  }

  return (
    <AuthBackground className="py-8 px-4">
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <TutorNestLogo />
          <Button variant="ghost" onClick={onBackToSignIn}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
        </div>

        <div className="max-w-2xl mx-auto">
          <Card>
            <CardHeader className="text-center">
              <CardTitle className="text-3xl mb-2">Student Signup</CardTitle>
              <CardDescription>
                Create your account and start your learning journey
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Personal Information */}
                <div className="space-y-4">
                  <h3 className="font-medium text-lg">Personal Information</h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="firstName">First Name *</Label>
                      <Input
                        id="firstName"
                        value={formData.firstName}
                        onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                        placeholder="Emma"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="lastName">Last Name *</Label>
                      <Input
                        id="lastName"
                        value={formData.lastName}
                        onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                        placeholder="Smith"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="dateOfBirth">Date of Birth *</Label>
                    <Input
                      id="dateOfBirth"
                      type="date"
                      value={formData.dateOfBirth}
                      onChange={(e) => handleDateOfBirthChange(e.target.value)}
                      max={new Date().toISOString().split('T')[0]}
                      required
                    />
                    {age !== null && (
                      <p className="text-sm text-gray-600">Age: {age} years old</p>
                    )}
                  </div>

                  {age !== null && age < 13 && (
                    <Alert variant="destructive">
                      <AlertCircle className="size-4" />
                      <AlertDescription>
                        <strong>Account creation requires age 13+.</strong><br />
                        Please ask your parent to create an account and add you as a child profile.
                      </AlertDescription>
                    </Alert>
                  )}

                  {age !== null && age >= 13 && age < 18 && (
                    <Alert className="bg-blue-50 border-blue-200">
                      <UserPlus className="size-4 text-blue-600" />
                      <AlertDescription className="text-blue-900">
                        <strong>Parent Approval Required</strong><br />
                        As you're under 18, we'll send an invitation to your parent/guardian for approval.
                      </AlertDescription>
                    </Alert>
                  )}

                  {age !== null && age >= 18 && (
                    <Alert className="bg-green-50 border-green-200">
                      <CheckCircle className="size-4 text-green-600" />
                      <AlertDescription className="text-green-900">
                        <strong>Independent Account</strong><br />
                        You can create a fully independent account with your own billing.
                      </AlertDescription>
                    </Alert>
                  )}
                </div>

                {age !== null && age >= 13 && (
                  <>
                    <div className="space-y-4">
                      <h3 className="font-medium text-lg">Account Information</h3>

                      <div className="space-y-2">
                        <Label htmlFor="email">Email *</Label>
                        <Input
                          id="email"
                          type="email"
                          value={formData.email}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                          placeholder="your.email@example.com"
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="password">Password *</Label>
                        <Input
                          id="password"
                          type="password"
                          value={formData.password}
                          onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                          placeholder="Minimum 6 characters"
                          required
                          minLength={6}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="confirmPassword">Confirm Password *</Label>
                        <Input
                          id="confirmPassword"
                          type="password"
                          value={formData.confirmPassword}
                          onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                          placeholder="Re-enter your password"
                          required
                        />
                      </div>

                      {signupType === 'dependent' && (
                        <div className="space-y-2">
                          <Label htmlFor="parentEmail">Parent/Guardian Email *</Label>
                          <Input
                            id="parentEmail"
                            type="email"
                            value={formData.parentEmail}
                            onChange={(e) => setFormData({ ...formData, parentEmail: e.target.value })}
                            placeholder="parent@example.com"
                            required
                          />
                          <p className="text-xs text-gray-600">
                            We'll send an invitation to this email address
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="space-y-4">
                      <h3 className="font-medium text-lg">Learning Information (Optional)</h3>

                      <div className="space-y-2">
                        <Label htmlFor="subjects">Subjects</Label>
                        <Input
                          id="subjects"
                          value={formData.subjects}
                          onChange={(e) => setFormData({ ...formData, subjects: e.target.value })}
                          placeholder="Mathematics, English, Science"
                        />
                        <p className="text-xs text-gray-600">
                          Separate multiple subjects with commas
                        </p>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="learningGoals">Learning Goals</Label>
                        <textarea
                          id="learningGoals"
                          value={formData.learningGoals}
                          onChange={(e) => setFormData({ ...formData, learningGoals: e.target.value })}
                          placeholder="What would you like to achieve?"
                          className="w-full min-h-[100px] px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                        />
                      </div>
                    </div>

                    {error && (
                      <Alert variant="destructive">
                        <AlertCircle className="size-4" />
                        <AlertDescription>{error}</AlertDescription>
                      </Alert>
                    )}

                    <div className="flex items-start gap-2 mb-4">
                      <input
                        type="checkbox"
                        id="student-terms"
                        checked={agreedToTerms}
                        onChange={(e) => setAgreedToTerms(e.target.checked)}
                        className="mt-0.5 h-4 w-4 rounded border-gray-300 accent-purple-600"
                      />
                      <label htmlFor="student-terms" className="text-xs text-gray-600">
                        I agree to the{' '}
                        <a href="/terms" target="_blank" className="text-purple-600 underline hover:text-purple-800">Terms of Service</a>
                        {' '}and{' '}
                        <a href="/privacy" target="_blank" className="text-purple-600 underline hover:text-purple-800">Privacy Policy</a>
                        .
                      </label>
                    </div>

                    <Button
                      type="submit"
                      disabled={!agreedToTerms || loading || !signupType}
                      className="w-full text-white"
                      style={{ backgroundColor: '#625d9c' }}
                    >
                      {loading ? 'Creating Account...' : 'Create Student Account'}
                    </Button>
                  </>
                )}
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </AuthBackground>
  );
}