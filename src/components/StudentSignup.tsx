import { useState, useEffect, useCallback, useRef } from 'react';
import { AuthBackground } from './AuthBackground';
import { getSupabaseClient } from '../utils/supabase/client';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Alert, AlertDescription } from './ui/alert';
import { Progress } from './ui/progress';
import {
  STUDENT_ONBOARDING_DRAFT_KEY,
  passwordStrength,
  MIN_PASSWORD_STRENGTH_SCORE,
} from '../utils/onboarding-helpers';
import { CheckCircle, AlertCircle, ArrowLeft, UserPlus, Mail, Clock, RotateCcw } from 'lucide-react';
import KFALogo from './KFALogo';
import { projectId, publicAnonKey } from '../utils/supabase/info';

const supabase = getSupabaseClient();

interface StudentSignupProps {
  onBackToSignIn: () => void;
  initialData?: { email: string; password: string; name: string; phone?: string } | null;
  onSignupSuccess?: () => void;
}

type FormShape = {
  email: string;
  password: string;
  confirmPassword: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  parentEmail: string;
  subjects: string;
  learningGoals: string;
};

type StudentDraft = {
  v: 1;
  savedAt: number;
  step: number;
  signupType: 'independent' | 'dependent' | null;
  formData: Omit<FormShape, 'password' | 'confirmPassword'> & { password?: ''; confirmPassword?: '' };
};

const TOTAL_STEPS = 2;
const STEP_LABELS = ['About you', 'Account & learning'];

function studentDraftHasProgress(d: Partial<StudentDraft>): boolean {
  if ((d.step ?? 1) > 1) return true;
  const f = d.formData;
  if (!f) return false;
  if (String(f.firstName || '').trim().length > 0) return true;
  if (String(f.email || '').trim().length > 3) return true;
  if (String(f.dateOfBirth || '').length > 4) return true;
  return false;
}

export function StudentSignup({ onBackToSignIn, initialData, onSignupSuccess }: StudentSignupProps) {
  const [step, setStep] = useState(1);
  const [signupType, setSignupType] = useState<'independent' | 'dependent' | null>(null);
  const [formData, setFormData] = useState<FormShape>({
    email: initialData?.email || '',
    password: initialData?.password || '',
    confirmPassword: '',
    firstName: initialData?.name?.split?.(' ')?.[0] || initialData?.name || '',
    lastName: initialData?.name?.split?.(' ')?.slice(1)?.join(' ') || '',
    dateOfBirth: '',
    parentEmail: '',
    subjects: '',
    learningGoals: '',
  });
  const [age, setAge] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [awaitingParentLink, setAwaitingParentLink] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [recordingAcknowledged, setRecordingAcknowledged] = useState(false);

  const [draftBanner, setDraftBanner] = useState<{ show: boolean; savedAt: number | null }>({
    show: false,
    savedAt: null,
  });
  const draftBannerDismissed = useRef(false);

  const clearDraft = useCallback(() => {
    try {
      localStorage.removeItem(STUDENT_ONBOARDING_DRAFT_KEY);
    } catch {
      /* ignore */
    }
    setDraftBanner({ show: false, savedAt: null });
  }, []);

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

  const syncAgeAndSignupType = (dob: string) => {
    if (!dob) {
      setAge(null);
      setSignupType(null);
      return;
    }
    const calculatedAge = calculateAge(dob);
    setAge(calculatedAge);
    if (calculatedAge >= 18) setSignupType('independent');
    else if (calculatedAge >= 13) setSignupType('dependent');
    else setSignupType(null);
  };

  const handleDateOfBirthChange = (dob: string) => {
    setFormData({ ...formData, dateOfBirth: dob });
    syncAgeAndSignupType(dob);
  };

  const buildDraft = useCallback((): StudentDraft => {
    const { password: _p, confirmPassword: _c, ...rest } = formData;
    return {
      v: 1,
      savedAt: Date.now(),
      step,
      signupType,
      formData: rest,
    };
  }, [step, signupType, formData]);

  const applyDraft = useCallback((d: StudentDraft) => {
    setStep(Math.min(TOTAL_STEPS, Math.max(1, d.step)));
    setSignupType(d.signupType ?? null);
    setFormData((prev) => ({
      ...prev,
      ...d.formData,
      password: '',
      confirmPassword: '',
    }));
    if (d.formData?.dateOfBirth) {
      syncAgeAndSignupType(d.formData.dateOfBirth);
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (draftBannerDismissed.current) return;
    try {
      const raw = localStorage.getItem(STUDENT_ONBOARDING_DRAFT_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as StudentDraft;
      if (parsed.v !== 1 || !parsed.savedAt) return;
      if (!studentDraftHasProgress(parsed)) {
        localStorage.removeItem(STUDENT_ONBOARDING_DRAFT_KEY);
        return;
      }
      setDraftBanner({ show: true, savedAt: parsed.savedAt });
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    if (success) return;
    const t = window.setTimeout(() => {
      try {
        const draft = buildDraft();
        if (!studentDraftHasProgress(draft)) {
          localStorage.removeItem(STUDENT_ONBOARDING_DRAFT_KEY);
          return;
        }
        localStorage.setItem(STUDENT_ONBOARDING_DRAFT_KEY, JSON.stringify(draft));
      } catch {
        /* quota */
      }
    }, 900);
    return () => window.clearTimeout(t);
  }, [buildDraft, success]);

  const resumeDraft = useCallback(() => {
    try {
      const raw = localStorage.getItem(STUDENT_ONBOARDING_DRAFT_KEY);
      if (!raw) return;
      applyDraft(JSON.parse(raw) as StudentDraft);
      draftBannerDismissed.current = true;
      setDraftBanner({ show: false, savedAt: null });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch {
      /* ignore */
    }
  }, [applyDraft]);

  const discardDraft = useCallback(() => {
    draftBannerDismissed.current = true;
    clearDraft();
  }, [clearDraft]);

  const validatePassword = () => {
    if (formData.password.length < 8) {
      setError('Use at least 8 characters for your password.');
      return false;
    }
    if (passwordStrength(formData.password).score < MIN_PASSWORD_STRENGTH_SCORE) {
      setError('Please choose a stronger password: add upper & lower case, a number, or a symbol.');
      return false;
    }
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return false;
    }
    return true;
  };

  const handleContinueStep1 = () => {
    setError('');
    if (!formData.firstName?.trim() || !formData.lastName?.trim() || !formData.dateOfBirth) {
      setError('Please enter your first name, last name, and date of birth.');
      return;
    }
    if (age === null) {
      setError('Invalid date of birth.');
      return;
    }
    if (age < 13) {
      setError('Students under 13 cannot create their own account. Ask a parent to sign up and add you as a child.');
      return;
    }
    setStep(2);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleBack = () => {
    setError('');
    setStep(1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (step !== 2) return;

    if (!formData.email || !formData.password || !formData.firstName || !formData.lastName || !formData.dateOfBirth) {
      setError('Please fill in all required fields');
      return;
    }
    if (!validatePassword()) return;
    if (age === null) {
      setError('Invalid date of birth');
      return;
    }
    if (!agreedToTerms) {
      setError('Please accept the Terms of Service and Privacy Policy.');
      return;
    }
    if (!recordingAcknowledged) {
      setError('Please confirm you understand that sessions are recorded.');
      return;
    }

    const subjectsArray = formData.subjects
      ? formData.subjects.split(',').map((s) => s.trim()).filter(Boolean)
      : [];

    setLoading(true);

    try {
      if (signupType === 'independent') {
        if (age < 18) {
          throw new Error('Independent signup requires age 18 or older');
        }

        const response = await fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-cbd74580/student-auth/independent-signup`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${publicAnonKey}`,
            },
            body: JSON.stringify({
              email: formData.email,
              password: formData.password,
              firstName: formData.firstName,
              lastName: formData.lastName,
              dateOfBirth: formData.dateOfBirth,
              subjects: subjectsArray,
              learningGoals: formData.learningGoals,
              recordingAcknowledged: true,
              recordingAcknowledgedAt: new Date().toISOString(),
            }),
          }
        );

        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
          console.error('Independent signup failed', response.status, data);
          const msg =
            typeof data.error === 'string'
              ? data.error
              : 'Could not create your account. Try again or use a different email.';
          throw new Error(msg);
        }

        clearDraft();
        setSuccess(true);
        setTimeout(() => {
          onSignupSuccess?.();
        }, 1500);
      } else if (signupType === 'dependent') {
        if (age < 13 || age >= 18) {
          throw new Error('Dependent signup is for students aged 13–17');
        }
        if (!formData.parentEmail?.trim()) {
          throw new Error('Parent or guardian email is required');
        }

        const response = await fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-cbd74580/student-auth/dependent-signup`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${publicAnonKey}`,
            },
            body: JSON.stringify({
              email: formData.email,
              password: formData.password,
              firstName: formData.firstName,
              lastName: formData.lastName,
              dateOfBirth: formData.dateOfBirth,
              parentEmail: formData.parentEmail,
              subjects: subjectsArray,
              learningGoals: formData.learningGoals,
              recordingAcknowledged: true,
              recordingAcknowledgedAt: new Date().toISOString(),
            }),
          }
        );

        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
          console.error('Dependent signup failed', response.status, data);
          const msg =
            typeof data.error === 'string'
              ? data.error
              : 'Could not create your account. Try again or contact support.';
          throw new Error(msg);
        }

        if (data.session) {
          const { error: sessionError } = await supabase.auth.setSession({
            access_token: data.session.access_token,
            refresh_token: data.session.refresh_token,
          });
          if (sessionError) {
            console.error('Session error:', sessionError);
            throw new Error('Account created but sign-in failed. Try logging in manually.');
          }
        }

        clearDraft();
        setSuccess(true);
        setAwaitingParentLink(true);
        setTimeout(() => {
          onSignupSuccess?.();
        }, 1000);
      } else {
        setError('Unable to determine account type. Please check your date of birth.');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Something went wrong';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const stepIndicator = (
    <div className="mb-6" aria-label="Signup progress">
      <div className="flex items-center justify-between gap-2 mb-2">
        <p className="text-sm font-medium text-gray-900">
          Step {step} of {TOTAL_STEPS} — {STEP_LABELS[step - 1]}
        </p>
        <span className="text-xs text-muted-foreground tabular-nums">
          {Math.round((step / TOTAL_STEPS) * 100)}%
        </span>
      </div>
      <Progress value={(step / TOTAL_STEPS) * 100} className="h-2 bg-gray-100" />
    </div>
  );

  if (success && signupType === 'independent') {
    return (
      <AuthBackground className="flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
              <CheckCircle className="h-10 w-10 text-green-600" aria-hidden />
            </div>
            <CardTitle className="text-2xl">Account created</CardTitle>
            <CardDescription>
              Verification email sent to <strong>{formData.email}</strong>
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <ul className="text-left text-sm text-gray-700 space-y-2 list-none border rounded-xl p-4 bg-gray-50/80">
              <li className="flex gap-2">
                <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" aria-hidden />
                <span>
                  <strong>Confirm your email</strong> when you&apos;re ready — you can still sign in now if your project allows it.
                </span>
              </li>
              <li className="flex gap-2">
                <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" aria-hidden />
                <span>
                  <strong>Complete your profile</strong> after login so tutors can find you.
                </span>
              </li>
            </ul>
            <Button
              type="button"
              onClick={onBackToSignIn}
              className="w-full text-white"
              style={{ backgroundColor: '#625d9c' }}
            >
              Go to sign in
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
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-100">
              <Mail className="h-10 w-10 text-blue-600" aria-hidden />
            </div>
            <CardTitle className="text-2xl">Parent approval needed</CardTitle>
            <CardDescription>We&apos;ve sent an invitation to your parent or guardian.</CardDescription>
          </CardHeader>
          <CardContent>
            <Alert className="mb-4">
              <Clock className="size-4" aria-hidden />
              <AlertDescription>
                <strong>Next steps</strong>
                <ol className="mt-2 list-decimal space-y-1 pl-4 text-sm">
                  <li>Your parent gets an email at <strong>{formData.parentEmail}</strong></li>
                  <li>They accept and link your account</li>
                  <li>You can sign in; booking may wait until approval</li>
                </ol>
              </AlertDescription>
            </Alert>
            <p className="text-sm text-gray-600 mb-4">
              You may be able to sign in now; some actions stay locked until your parent completes linking.
            </p>
            <Button
              type="button"
              onClick={onBackToSignIn}
              className="w-full text-white"
              style={{ backgroundColor: '#625d9c' }}
            >
              Go to sign in
            </Button>
          </CardContent>
        </Card>
      </AuthBackground>
    );
  }

  const showAccountSections = age !== null && age >= 13;

  return (
    <AuthBackground className="py-8 px-4">
      <div className="container mx-auto px-4 py-6">
        <div className="mb-6 flex items-center justify-between">
          <KFALogo />
          <Button type="button" variant="ghost" onClick={onBackToSignIn}>
            <ArrowLeft className="mr-2 h-4 w-4" aria-hidden />
            Back
          </Button>
        </div>

        <div className="mx-auto max-w-2xl">
          {draftBanner.show && !success && (
            <Alert className="mb-6 border-violet-200 bg-violet-50">
              <RotateCcw className="h-4 w-4 text-violet-700" aria-hidden />
              <AlertDescription className="text-violet-950">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm">
                    <strong>Saved student signup</strong>
                    {draftBanner.savedAt ? <> from {new Date(draftBanner.savedAt).toLocaleString()}</> : null}. Passwords are
                    never stored.
                  </p>
                  <div className="flex flex-wrap gap-2 shrink-0">
                    <Button type="button" size="sm" className="bg-[#625d9c]" onClick={resumeDraft}>
                      Resume
                    </Button>
                    <Button type="button" size="sm" variant="outline" onClick={discardDraft}>
                      Start fresh
                    </Button>
                  </div>
                </div>
              </AlertDescription>
            </Alert>
          )}

          <Card>
            <CardHeader className="text-center">
              <CardTitle className="mb-2 text-3xl">Student signup</CardTitle>
              <CardDescription>Create your account and start learning on Knowledge Fons Academy</CardDescription>
            </CardHeader>
            <CardContent>
              {stepIndicator}

              <form onSubmit={handleSubmit} className="space-y-6" noValidate>
                {step === 1 && (
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">About you</h3>
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="firstName">First name *</Label>
                        <Input
                          id="firstName"
                          value={formData.firstName}
                          onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                          placeholder="Emma"
                          required
                          autoComplete="given-name"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="lastName">Last name *</Label>
                        <Input
                          id="lastName"
                          value={formData.lastName}
                          onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                          placeholder="Smith"
                          required
                          autoComplete="family-name"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="dateOfBirth">Date of birth *</Label>
                      <Input
                        id="dateOfBirth"
                        type="date"
                        value={formData.dateOfBirth}
                        onChange={(e) => handleDateOfBirthChange(e.target.value)}
                        max={new Date().toISOString().split('T')[0]}
                        required
                        autoComplete="bday"
                      />
                      {age !== null && <p className="text-sm text-gray-600">Age: {age} years</p>}
                    </div>

                    {age !== null && age < 13 && (
                      <Alert className="border-red-200 bg-red-50">
                        <AlertCircle className="size-4" aria-hidden />
                        <AlertDescription>
                          <strong>Accounts start at age 13.</strong> Ask a parent to create an account and add you as a child
                          learner.
                        </AlertDescription>
                      </Alert>
                    )}

                    {age !== null && age >= 13 && age < 18 && (
                      <Alert className="border-blue-200 bg-blue-50">
                        <UserPlus className="size-4 text-blue-600" aria-hidden />
                        <AlertDescription className="text-blue-900">
                          <strong>Parent approval</strong> — ages 13–17 need a guardian to confirm on the next step.
                        </AlertDescription>
                      </Alert>
                    )}

                    {age !== null && age >= 18 && (
                      <Alert className="border-emerald-200 bg-emerald-50">
                        <CheckCircle className="size-4 text-emerald-600" aria-hidden />
                        <AlertDescription className="text-emerald-900">
                          <strong>Independent account</strong> — you can manage your own profile and billing.
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>
                )}

                {step === 2 && showAccountSections && (
                  <>
                    <div className="space-y-4">
                      <h3 className="text-lg font-medium">Account</h3>
                      <div className="space-y-2">
                        <Label htmlFor="email">Email *</Label>
                        <Input
                          id="email"
                          type="email"
                          value={formData.email}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                          placeholder="your.email@example.com"
                          required
                          autoComplete="email"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="password">Password *</Label>
                        <Input
                          id="password"
                          type="password"
                          value={formData.password}
                          onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                          placeholder="At least 8 characters"
                          required
                          autoComplete="new-password"
                          aria-describedby="student-pw-hint"
                          aria-invalid={
                            formData.password.length > 0 &&
                            passwordStrength(formData.password).score < MIN_PASSWORD_STRENGTH_SCORE
                          }
                        />
                        <p id="student-pw-hint" className="text-xs text-muted-foreground">
                          8+ characters; mix upper, lower, numbers, or symbols. Never saved in drafts.
                        </p>
                        {formData.password.length > 0 && (
                          <div className="space-y-1 pt-1">
                            <div className="flex justify-between text-xs">
                              <span className="text-muted-foreground">Strength</span>
                              <span
                                className={
                                  passwordStrength(formData.password).score <= 1
                                    ? 'text-red-600'
                                    : passwordStrength(formData.password).score < MIN_PASSWORD_STRENGTH_SCORE
                                      ? 'text-amber-600'
                                      : 'text-emerald-700'
                                }
                              >
                                {passwordStrength(formData.password).label}
                              </span>
                            </div>
                            <Progress value={passwordStrength(formData.password).bar} className="h-1.5" />
                          </div>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="confirmPassword">Confirm password *</Label>
                        <Input
                          id="confirmPassword"
                          type="password"
                          value={formData.confirmPassword}
                          onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                          required
                          autoComplete="new-password"
                        />
                      </div>

                      {signupType === 'dependent' && (
                        <div className="space-y-2">
                          <Label htmlFor="parentEmail">Parent / guardian email *</Label>
                          <Input
                            id="parentEmail"
                            type="email"
                            value={formData.parentEmail}
                            onChange={(e) => setFormData({ ...formData, parentEmail: e.target.value })}
                            placeholder="parent@example.com"
                            required
                            autoComplete="email"
                          />
                          <p className="text-xs text-gray-600">We&apos;ll send them a secure link to approve your account.</p>
                        </div>
                      )}
                    </div>

                    <div className="space-y-4">
                      <h3 className="text-lg font-medium">Learning (optional)</h3>
                      <div className="space-y-2">
                        <Label htmlFor="subjects">Subjects</Label>
                        <Input
                          id="subjects"
                          value={formData.subjects}
                          onChange={(e) => setFormData({ ...formData, subjects: e.target.value })}
                          placeholder="Mathematics, English, Science"
                        />
                        <p className="text-xs text-gray-600">Separate with commas</p>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="learningGoals">Learning goals</Label>
                        <Textarea
                          id="learningGoals"
                          value={formData.learningGoals}
                          onChange={(e) => setFormData({ ...formData, learningGoals: e.target.value })}
                          placeholder="What would you like to achieve?"
                          rows={4}
                          className="resize-y min-h-[100px]"
                        />
                      </div>
                    </div>
                  </>
                )}

                {error && (
                  <Alert className="border-red-200 bg-red-50">
                    <AlertCircle className="size-4" aria-hidden />
                    <AlertDescription className="text-red-900">{error}</AlertDescription>
                  </Alert>
                )}

                <div className="sticky bottom-0 z-30 -mx-2 border-t border-gray-200/80 bg-white/95 px-2 py-4 backdrop-blur-md supports-[padding:max(0px)]:pb-[max(1rem,env(safe-area-inset-bottom))] sm:static sm:z-0 sm:mx-0 sm:border-0 sm:bg-transparent sm:px-0 sm:py-0 sm:backdrop-blur-none">
                  <div className="flex flex-col gap-4 sm:flex-row sm:justify-between sm:items-center">
                    {step === 2 ? (
                      <Button type="button" variant="outline" onClick={handleBack} disabled={loading}>
                        Back
                      </Button>
                    ) : (
                      <span />
                    )}
                    <div className="ml-auto flex w-full flex-col gap-3 sm:w-auto">
                      {step === 2 && showAccountSections && (
                        <div className="flex items-start gap-2">
                          <input
                            type="checkbox"
                            id="student-terms"
                            checked={agreedToTerms}
                            onChange={(e) => setAgreedToTerms(e.target.checked)}
                            className="mt-1 h-4 w-4 rounded border-gray-300 accent-purple-600"
                          />
                          <label htmlFor="student-terms" className="text-xs text-gray-600 leading-relaxed">
                            I agree to the{' '}
                            <a
                              href="/terms"
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-purple-600 underline hover:text-purple-800"
                            >
                              Terms of Service
                            </a>{' '}
                            and{' '}
                            <a
                              href="/privacy"
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-purple-600 underline hover:text-purple-800"
                            >
                              Privacy Policy
                            </a>
                            .
                          </label>
                        </div>
                      )}
                      {step === 2 && showAccountSections && (
                        <div className="flex items-start gap-2">
                          <input
                            type="checkbox"
                            id="student-recording-ack"
                            checked={recordingAcknowledged}
                            onChange={(e) => setRecordingAcknowledged(e.target.checked)}
                            className="mt-1 h-4 w-4 rounded border-gray-300 accent-purple-600"
                          />
                          <label htmlFor="student-recording-ack" className="text-xs text-gray-600 leading-relaxed">
                            I understand that tutoring sessions are recorded (video and audio) by default, for
                            safeguarding and quality-assurance purposes.
                          </label>
                        </div>
                      )}
                      {step === 1 ? (
                        <Button
                          type="button"
                          onClick={handleContinueStep1}
                          className="min-h-[44px] w-full text-white sm:w-auto"
                          style={{ backgroundColor: '#625d9c' }}
                          disabled={age !== null && age < 13}
                        >
                          Continue
                        </Button>
                      ) : (
                        <Button
                          type="submit"
                          disabled={!agreedToTerms || !recordingAcknowledged || loading || !signupType || !showAccountSections}
                          className="min-h-[48px] w-full text-white sm:w-auto"
                          style={{ backgroundColor: '#5d9827' }}
                        >
                          {loading ? 'Creating account…' : 'Create student account'}
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </AuthBackground>
  );
}
