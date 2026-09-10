import { useState, useEffect, useCallback, useRef } from 'react';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import { getSupabaseClient } from '../utils/supabase/client';
import {
  PARENT_ONBOARDING_DRAFT_KEY,
  passwordStrength,
  MIN_PASSWORD_STRENGTH_SCORE,
} from '../utils/onboarding-helpers';
import { AuthBackground } from './AuthBackground';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Alert, AlertDescription } from './ui/alert';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Progress } from './ui/progress';
import { Users, AlertCircle, CheckCircle, RotateCcw } from 'lucide-react';
import KFALogo from './KFALogo';

interface ParentSignupProps {
  onBackToSignIn?: () => void;
  initialData?: { email: string; password: string; name: string; phone?: string } | null;
  onSignupSuccess?: () => void;
}

type ParentDraft = {
  v: 1;
  savedAt: number;
  step: number;
  email: string;
  fullName: string;
  phone: string;
  address: string;
  numberOfChildren: string;
  childrenAges: string;
  agreeTerms: boolean;
  agreedToTerms: boolean;
};

function parentDraftHasProgress(d: Partial<ParentDraft>): boolean {
  if ((d.step ?? 1) > 1) return true;
  if (String(d.fullName || '').trim().length > 1) return true;
  if (String(d.email || '').trim().length > 3) return true;
  if (String(d.address || '').trim().length > 5) return true;
  return false;
}

const TOTAL_STEPS = 2;
const STEP_LABELS = ['Account', 'Family'];

export function ParentSignup({ onBackToSignIn, initialData, onSignupSuccess }: ParentSignupProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [emailConfirmationSent, setEmailConfirmationSent] = useState(false);
  const [resendState, setResendState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [step, setStep] = useState(1);

  const [email, setEmail] = useState(initialData?.email || '');
  const [password, setPassword] = useState(initialData?.password || '');
  const [confirmPassword, setConfirmPassword] = useState(initialData?.password || '');
  const [fullName, setFullName] = useState(initialData?.name || '');
  const [phone, setPhone] = useState(initialData?.phone || '');
  const [address, setAddress] = useState('');
  const [numberOfChildren, setNumberOfChildren] = useState('');
  const [childrenAges, setChildrenAges] = useState('');
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [recordingAcknowledged, setRecordingAcknowledged] = useState(false);

  const [draftBanner, setDraftBanner] = useState<{ show: boolean; savedAt: number | null }>({
    show: false,
    savedAt: null,
  });
  const draftBannerDismissed = useRef(false);

  const clearDraft = useCallback(() => {
    try {
      localStorage.removeItem(PARENT_ONBOARDING_DRAFT_KEY);
    } catch {
      /* ignore */
    }
    setDraftBanner({ show: false, savedAt: null });
  }, []);

  const buildDraft = useCallback((): ParentDraft => {
    return {
      v: 1,
      savedAt: Date.now(),
      step,
      email,
      fullName,
      phone,
      address,
      numberOfChildren,
      childrenAges,
      agreeTerms,
      agreedToTerms,
    };
  }, [
    step,
    email,
    fullName,
    phone,
    address,
    numberOfChildren,
    childrenAges,
    agreeTerms,
    agreedToTerms,
  ]);

  const applyDraft = useCallback((d: ParentDraft) => {
    setStep(Math.min(TOTAL_STEPS, Math.max(1, d.step)));
    setEmail(d.email ?? '');
    setFullName(d.fullName ?? '');
    setPhone(d.phone ?? '');
    setAddress(d.address ?? '');
    setNumberOfChildren(d.numberOfChildren ?? '');
    setChildrenAges(d.childrenAges ?? '');
    setAgreeTerms(!!d.agreeTerms);
    setAgreedToTerms(!!d.agreedToTerms);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (draftBannerDismissed.current) return;
    try {
      const raw = localStorage.getItem(PARENT_ONBOARDING_DRAFT_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as ParentDraft;
      if (parsed.v !== 1 || !parsed.savedAt) return;
      if (!parentDraftHasProgress(parsed)) {
        localStorage.removeItem(PARENT_ONBOARDING_DRAFT_KEY);
        return;
      }
      setDraftBanner({ show: true, savedAt: parsed.savedAt });
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    if (emailConfirmationSent) return;
    const t = window.setTimeout(() => {
      try {
        const draft = buildDraft();
        if (!parentDraftHasProgress(draft)) {
          localStorage.removeItem(PARENT_ONBOARDING_DRAFT_KEY);
          return;
        }
        localStorage.setItem(PARENT_ONBOARDING_DRAFT_KEY, JSON.stringify(draft));
      } catch {
        /* quota */
      }
    }, 900);
    return () => window.clearTimeout(t);
  }, [buildDraft, emailConfirmationSent]);

  const resumeDraft = useCallback(() => {
    try {
      const raw = localStorage.getItem(PARENT_ONBOARDING_DRAFT_KEY);
      if (!raw) return;
      applyDraft(JSON.parse(raw) as ParentDraft);
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

  const validateStep1 = () => {
    if (!email || !password || !fullName) {
      setError('Please fill in all required fields');
      return false;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Please enter a valid email address');
      return false;
    }
    if (password.length < 8) {
      setError('Use at least 8 characters for your password.');
      return false;
    }
    if (passwordStrength(password).score < MIN_PASSWORD_STRENGTH_SCORE) {
      setError('Please choose a stronger password: add upper & lower case, a number, or a symbol.');
      return false;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return false;
    }
    return true;
  };

  const validateStep2 = () => {
    if (!agreeTerms) {
      setError('Please confirm you agree to the Terms of Service and Privacy Policy (checkbox above).');
      return false;
    }
    return true;
  };

  const handleContinue = () => {
    setError('');
    if (!validateStep1()) return;
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
    setSuccess('');

    if (step !== TOTAL_STEPS) {
      handleContinue();
      return;
    }

    if (!validateStep1()) {
      setStep(1);
      return;
    }
    if (!validateStep2()) return;
    if (!agreedToTerms) {
      setError('Please confirm the final Terms & Privacy acceptance below to create your account.');
      return;
    }
    if (!recordingAcknowledged) {
      setError('Please confirm you understand that sessions are recorded, below.');
      return;
    }

    setLoading(true);

    try {
      let signupResponse;
      try {
        signupResponse = await fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-cbd74580/signup`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${publicAnonKey}`,
            },
            body: JSON.stringify({
              email,
              password,
              name: fullName,
              role: 'parent',
              profileData: {
                full_name: fullName,
                email,
                phone,
                address,
                number_of_children: numberOfChildren ? parseInt(numberOfChildren, 10) : null,
                children_ages: childrenAges,
                role: 'parent',
                onboardingComplete: true,
                recordingAcknowledged: true,
                recordingAcknowledgedAt: new Date().toISOString(),
              },
            }),
          }
        );
      } catch {
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

      clearDraft();
      setEmailConfirmationSent(true);
    } catch (err: unknown) {
      console.error('Signup error:', err);
      const msg = err instanceof Error ? err.message : 'An error occurred during signup';
      let errorMessage = msg;
      if (msg.includes('string did not match')) {
        errorMessage =
          'Invalid email or password format. Check your email and use a password with at least 8 characters.';
      }
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleResendConfirmation = async () => {
    setResendState('sending');
    try {
      const { error: resendError } = await getSupabaseClient().auth.resend({ type: 'signup', email });
      setResendState(resendError ? 'error' : 'sent');
    } catch {
      setResendState('error');
    }
  };

  const stepIndicator = (
    <div className="mb-8" aria-label="Signup progress">
      <div className="flex items-center justify-between gap-2 mb-3">
        <p className="text-sm font-medium text-gray-900">
          Step {step} of {TOTAL_STEPS} — {STEP_LABELS[step - 1]}
        </p>
        <span className="text-xs text-muted-foreground tabular-nums">{Math.round((step / TOTAL_STEPS) * 100)}%</span>
      </div>
      <Progress value={(step / TOTAL_STEPS) * 100} className="h-2 mb-4 bg-gray-100" />
      <div className="flex justify-between text-[10px] sm:text-xs text-gray-600 gap-2">
        {STEP_LABELS.map((label) => (
          <span key={label} className="truncate">
            {label}
          </span>
        ))}
      </div>
    </div>
  );

  return (
    <AuthBackground className="py-8 px-4">
      <div className="max-w-2xl mx-auto">
        {draftBanner.show && !emailConfirmationSent && (
          <Alert className="mb-6 border-violet-200 bg-violet-50">
            <RotateCcw className="h-4 w-4 text-violet-700" aria-hidden />
            <AlertDescription className="text-violet-950">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm">
                  You have a <strong>saved parent signup</strong>
                  {draftBanner.savedAt ? <> from {new Date(draftBanner.savedAt).toLocaleString()}</> : null}. Continue?
                  Passwords are never saved in your browser.
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

        <div className="flex justify-center mb-6">
          <KFALogo />
        </div>

        {emailConfirmationSent ? (
          <div className="bg-white rounded-3xl shadow-xl p-8 text-center">
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle className="w-8 h-8 text-green-600" aria-hidden />
              </div>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Account created</h2>
            <p className="text-gray-600 mb-4">
              We&apos;ve set up your parent account for <strong>{email}</strong>. Next steps:
            </p>
            <ul className="text-left text-sm text-gray-700 mb-6 space-y-2 list-none border rounded-xl p-4 bg-gray-50/80">
              <li className="flex gap-2">
                <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" aria-hidden />
                <span>
                  <strong>Confirm your email</strong> — use the link from Supabase so we can reach you about bookings.
                </span>
              </li>
              <li className="flex gap-2">
                <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" aria-hidden />
                <span>
                  <strong>Sign in</strong> — open your parent dashboard and add your children&apos;s profiles.
                </span>
              </li>
              <li className="flex gap-2">
                <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" aria-hidden />
                <span>
                  <strong>Book tutors</strong> — browse verified educators once your account is active.
                </span>
              </li>
            </ul>
            <button
              type="button"
              onClick={onBackToSignIn}
              className="w-full py-3 px-6 rounded-xl text-white font-semibold"
              style={{ backgroundColor: '#625d9c' }}
            >
              Continue to sign in
            </button>
            <p className="text-center text-sm text-gray-500 mt-4">
              Didn&apos;t get the email?{' '}
              {resendState === 'sent' ? (
                <span className="text-emerald-700 font-medium">Sent again — check your inbox and spam folder.</span>
              ) : (
                <button
                  type="button"
                  onClick={handleResendConfirmation}
                  disabled={resendState === 'sending'}
                  className="font-medium underline disabled:opacity-50"
                  style={{ color: '#625d9c' }}
                >
                  {resendState === 'sending' ? 'Sending…' : 'Resend confirmation email'}
                </button>
              )}
              {resendState === 'error' && (
                <span className="block text-red-600 mt-1">Couldn&apos;t resend right now — please try again in a moment.</span>
              )}
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-3xl shadow-xl p-6 sm:p-8">
            <h1 className="text-center mb-2 text-gray-900">Create parent account</h1>
            <p className="text-center text-gray-600 mb-6">
              Join Knowledge Fons Academy to manage your children&apos;s learning — takes about two minutes.
            </p>

            {stepIndicator}

            {error && (
              <Alert className="mb-6 bg-red-50 border-red-200 text-red-900">
                <AlertCircle className="h-4 w-4 text-red-600" aria-hidden />
                <AlertDescription className="text-red-800">{error}</AlertDescription>
              </Alert>
            )}

            {success && (
              <Alert className="mb-6 bg-green-50 border-green-200">
                <CheckCircle className="h-4 w-4 text-green-600" aria-hidden />
                <AlertDescription className="text-green-800">{success}</AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleSubmit} noValidate>
              {step === 1 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Users className="w-5 h-5" aria-hidden />
                      Account & sign-in
                    </CardTitle>
                    <CardDescription>Your email and password — never stored in browser drafts.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label htmlFor="fullName">Full name *</Label>
                      <Input
                        id="fullName"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="Jane Doe"
                        required
                        autoComplete="name"
                      />
                    </div>

                    <div>
                      <Label htmlFor="email">Email *</Label>
                      <Input
                        id="email"
                        type="email"
                        value={email}
                        onChange={(e) => {
                          setEmail(e.target.value);
                          if (error.includes('already')) setError('');
                        }}
                        placeholder="you@example.com"
                        required
                        autoComplete="email"
                      />
                    </div>

                    <div>
                      <Label htmlFor="phone">Phone (with country code)</Label>
                      <Input
                        id="phone"
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="e.g. +234 …"
                        autoComplete="tel"
                      />
                      <p className="text-xs text-gray-500 mt-1">Include country code for SMS or WhatsApp if needed.</p>
                    </div>

                    <div>
                      <Label htmlFor="password">Password *</Label>
                      <Input
                        id="password"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="At least 8 characters"
                        required
                        autoComplete="new-password"
                        aria-describedby="parent-password-hint"
                        aria-invalid={
                          password.length > 0 &&
                          passwordStrength(password).score < MIN_PASSWORD_STRENGTH_SCORE
                        }
                      />
                      <p id="parent-password-hint" className="text-xs text-muted-foreground mt-1">
                        Use 8+ characters with mixed case, numbers, or symbols.
                      </p>
                      {password.length > 0 && (
                        <div className="mt-2 space-y-1">
                          <div className="flex justify-between text-xs">
                            <span className="text-muted-foreground">Strength</span>
                            <span
                              className={
                                passwordStrength(password).score <= 1
                                  ? 'text-red-600'
                                  : passwordStrength(password).score < MIN_PASSWORD_STRENGTH_SCORE
                                    ? 'text-amber-600'
                                    : 'text-emerald-700'
                              }
                            >
                              {passwordStrength(password).label}
                            </span>
                          </div>
                          <Progress value={passwordStrength(password).bar} className="h-1.5" />
                        </div>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="confirmPassword">Confirm password *</Label>
                      <Input
                        id="confirmPassword"
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                        autoComplete="new-password"
                      />
                    </div>
                  </CardContent>
                </Card>
              )}

              {step === 2 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Users className="w-5 h-5" aria-hidden />
                      Family details
                    </CardTitle>
                    <CardDescription>Optional context helps us recommend the right tutors.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label htmlFor="address">Home address</Label>
                      <Textarea
                        id="address"
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        placeholder="City / area is fine"
                        rows={2}
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="numberOfChildren">Number of children</Label>
                        <Input
                          id="numberOfChildren"
                          type="number"
                          min="0"
                          value={numberOfChildren}
                          onChange={(e) => setNumberOfChildren(e.target.value)}
                          placeholder="2"
                        />
                      </div>
                      <div>
                        <Label htmlFor="childrenAges">Children&apos;s ages</Label>
                        <Input
                          id="childrenAges"
                          value={childrenAges}
                          onChange={(e) => setChildrenAges(e.target.value)}
                          placeholder="e.g. 8, 12, 15"
                        />
                      </div>
                    </div>

                    <div className="flex items-start gap-3 p-4 border-2 border-[#625d9c] rounded-lg bg-purple-50">
                      <input
                        type="checkbox"
                        id="agreeTerms"
                        checked={agreeTerms}
                        onChange={(e) => setAgreeTerms(e.target.checked)}
                        className="mt-1 h-4 w-4 text-[#625d9c] border-gray-300 rounded focus:ring-[#625d9c]"
                      />
                      <Label htmlFor="agreeTerms" className="cursor-pointer">
                        <strong className="text-[#625d9c]">Terms & privacy *</strong>
                        <p className="text-sm text-gray-600 mt-1">
                          I agree to Knowledge Fons Academy&apos;s Terms of Service and Privacy Policy.
                        </p>
                      </Label>
                    </div>

                    <Alert className="bg-blue-50 border-blue-200">
                      <AlertCircle className="h-4 w-4 text-blue-600" aria-hidden />
                      <AlertDescription className="text-blue-800">
                        <strong>After you join:</strong> parent dashboard, child profiles, browse tutors, and track progress.
                      </AlertDescription>
                    </Alert>
                  </CardContent>
                </Card>
              )}

              <div className="sticky bottom-0 z-30 mt-8 -mx-2 border-t border-gray-200/80 bg-white/95 px-2 py-4 backdrop-blur-md supports-[padding:max(0px)]:pb-[max(1rem,env(safe-area-inset-bottom))] sm:static sm:z-0 sm:mx-0 sm:border-0 sm:bg-transparent sm:px-0 sm:py-0 sm:backdrop-blur-none">
                <div className="flex flex-col gap-4 sm:flex-row sm:justify-between sm:items-center">
                  {step > 1 ? (
                    <Button type="button" variant="outline" onClick={handleBack} disabled={loading}>
                      Back
                    </Button>
                  ) : (
                    <span />
                  )}
                  <div className="flex flex-col gap-3 w-full sm:w-auto sm:ml-auto sm:items-end">
                    {step === TOTAL_STEPS && (
                      <div className="flex items-start gap-2 w-full sm:max-w-md">
                        <input
                          type="checkbox"
                          id="parent-final-terms"
                          checked={agreedToTerms}
                          onChange={(e) => setAgreedToTerms(e.target.checked)}
                          className="mt-1 h-4 w-4 rounded border-gray-300 accent-purple-600"
                        />
                        <label htmlFor="parent-final-terms" className="text-xs text-gray-600 leading-relaxed">
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
                    {step === TOTAL_STEPS && (
                      <div className="flex items-start gap-2 w-full sm:max-w-md">
                        <input
                          type="checkbox"
                          id="parent-recording-ack"
                          checked={recordingAcknowledged}
                          onChange={(e) => setRecordingAcknowledged(e.target.checked)}
                          className="mt-1 h-4 w-4 rounded border-gray-300 accent-purple-600"
                        />
                        <label htmlFor="parent-recording-ack" className="text-xs text-gray-600 leading-relaxed">
                          I understand that tutoring sessions are recorded (video and audio) by default, for
                          safeguarding and quality-assurance purposes.
                        </label>
                      </div>
                    )}
                    {step < TOTAL_STEPS ? (
                      <Button
                        type="button"
                        onClick={handleContinue}
                        className="w-full sm:w-auto min-h-[44px] text-white"
                        style={{ backgroundColor: '#625d9c' }}
                      >
                        Continue
                      </Button>
                    ) : (
                      <Button
                        type="submit"
                        className="w-full sm:w-auto min-h-[48px] text-white"
                        style={{ backgroundColor: '#5d9827' }}
                        disabled={!agreedToTerms || !recordingAcknowledged || loading}
                      >
                        {loading ? 'Creating account…' : 'Create parent account'}
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </form>

            <div className="mt-6 text-center text-sm">
              <span className="text-gray-600">Already have an account? </span>
              <button
                type="button"
                onClick={onBackToSignIn}
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
