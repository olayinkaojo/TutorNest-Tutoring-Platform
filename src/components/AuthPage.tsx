import { useState, useRef } from 'react';
import { getSupabaseClient } from '../utils/supabase/client';
import { Mail, Eye, EyeOff, AlertCircle, Shield } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Alert, AlertDescription } from './ui/alert';
import TutorNestLogo from './TutorNestLogo';
import { AuthBackground } from './AuthBackground';

const supabase = getSupabaseClient();

interface AuthPageProps {
  onBecomeTutor?: () => void;
  onBecomeStudent?: () => void;
  onTutorSignupWithData?: (data: { email: string; password: string; name: string; phone?: string }) => void;
  onStudentSignupWithData?: (data: { email: string; password: string; name: string; phone?: string }) => void;
  onParentSignupWithData?: (data: { email: string; password: string; name: string; phone?: string }) => void;
  onSignupClicked?: () => void;
}

export function AuthPage({ onBecomeTutor, onBecomeStudent, onTutorSignupWithData, onStudentSignupWithData, onParentSignupWithData, onSignupClicked, staffMode }: AuthPageProps & { staffMode?: boolean } = {}) {
  const [mode, setMode] = useState<'signin' | 'reset'>('signin');
  const [email, setEmail] = useState(staffMode ? 'admin@tutornest.com' : '');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [isStaffMode, setIsStaffMode] = useState(!!staffMode);

  // Secret: click the logo 5 times within 2 seconds to reveal staff login
  const logoClickCount = useRef(0);
  const logoClickTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleLogoClick = () => {
    logoClickCount.current += 1;
    if (logoClickTimer.current) clearTimeout(logoClickTimer.current);

    if (logoClickCount.current >= 5) {
      logoClickCount.current = 0;
      setIsStaffMode(true);
      setEmail('admin@tutornest.com');
      setTimeout(() => document.getElementById('password')?.focus(), 100);
      return;
    }

    logoClickTimer.current = setTimeout(() => {
      logoClickCount.current = 0;
    }, 2000);
  };

  const validateEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const validatePassword = (password: string) => {
    return password.length >= 6; // Match Supabase and signup forms minimum
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // Validation
    if (!validateEmail(email)) {
      setError('Please enter a valid email address.');
      return;
    }

    if (mode === 'reset') {
      setLoading(true);
      try {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}`,
        });

        if (error) throw error;

        setSuccess('Password reset link sent! Please check your email.');
        setEmail('');
      } catch (err: any) {
        setError(err.message || 'Failed to send reset email. Please try again.');
      } finally {
        setLoading(false);
      }
      return;
    }

    if (!validatePassword(password)) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    setLoading(true);

    try {
      // Sign in
      console.log('Attempting sign in with email:', email);
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      console.log('Sign in response:', { 
        hasSession: !!data?.session, 
        hasUser: !!data?.user,
        errorMessage: error?.message,
        errorStatus: error?.status
      });

      if (error) {
        // Handle email not confirmed error
        if (error.message.includes('Email not confirmed')) {
          throw new Error('⚠️ Email Not Confirmed: Please check your email for a confirmation link, OR disable email confirmation in your Supabase Dashboard (Authentication → Email → Turn OFF "Confirm email"). See EMAIL_CONFIRMATION_FIX.md for detailed instructions.');
        }
        if (error.message.includes('Invalid login credentials')) {
          throw new Error('Invalid email or password. Please double-check your credentials. If you just signed up, your account may need a moment — try again or use "Forgot Password" to reset it.');
        }
        throw error;
      }
      
      // If sign in successful, the auth state change will trigger App.tsx to reload
      console.log('Sign in successful for user:', data?.user?.email);
      setSuccess('Sign in successful! Redirecting...');
    } catch (err: any) {
      console.error('Authentication error:', err.message);
      setError(err.message || 'An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSocialAuth = async (provider: 'google' | 'apple' | 'facebook') => {
    setError('');
    setLoading(true);

    try {
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID || 'wevmvbskunhnhuxzaqoz';
      const { error } = await supabase.auth.signInWithOAuth({
        provider: provider === 'apple' ? 'apple' : provider,
        options: {
          redirectTo: `https://${projectId}.supabase.co/auth/v1/callback`,
        },
      });

      if (error) throw error;
    } catch (err: any) {
      console.error(`${provider} authentication error:`, err);
      
      // Check if it's a provider not enabled error
      if (err.message?.includes('provider is not enabled') || err.error_code === 'validation_failed') {
        const providerName = provider.charAt(0).toUpperCase() + provider.slice(1);
        setError(
          `${providerName} login is not yet configured. To enable ${providerName} authentication, please follow the setup instructions at: https://supabase.com/docs/guides/auth/social-login/auth-${provider}`
        );
      } else {
        setError(
          err.message || `Failed to authenticate with ${provider}. Please try again.`
        );
      }
      setLoading(false);
    }
  };

  return (
    <AuthBackground className="flex items-center justify-center p-4 sm:p-6 md:p-8">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-3xl shadow-xl p-6 sm:p-8">
          {/* Logo — 5 rapid clicks activates staff login */}
          <div className="flex justify-center mb-6 sm:mb-8">
            <button type="button" onClick={handleLogoClick} className="focus:outline-none select-none">
              <TutorNestLogo />
            </button>
          </div>

          {/* Title */}
          <h1 className="text-center mb-6 sm:mb-8 text-gray-900">
            {isStaffMode
              ? 'Staff Login'
              : mode === 'reset'
              ? 'Reset Password'
              : 'Login or Create Account'}
          </h1>

          {/* Staff mode indicator */}
          {isStaffMode && (
            <Alert className="mb-4 bg-amber-50 border-amber-200">
              <Shield className="h-4 w-4 text-amber-600" />
              <AlertDescription className="text-amber-800 text-sm">
                <strong>Staff access.</strong> Enter your admin credentials below.
              </AlertDescription>
            </Alert>
          )}

          {/* Demo Credentials Info */}
          {mode === 'signin' && !error && !success && (
            <Alert className="mb-4 bg-blue-50 border-blue-200">
              <AlertCircle className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-blue-800 text-sm">
                <strong>New User?</strong> Create an account using the "Sign Up" button below. 
                {' '}Or sign in if you already have an account.
              </AlertDescription>
            </Alert>
          )}

          {/* Error/Success Messages */}
          {error && (
            <Alert className="mb-4 bg-red-50 border-red-200">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-800">{error}</AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert className="mb-4 bg-green-50 border-green-200">
              <AlertDescription className="text-green-800">{success}</AlertDescription>
            </Alert>
          )}

          {/* Form */}
          <form onSubmit={handleEmailAuth} className="space-y-4">
            {mode === 'signup' && (
              <div>
                <label htmlFor="name" className="block text-sm mb-2 text-gray-700">
                  Full Name
                </label>
                <Input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter your name"
                  className="h-12"
                  required
                />
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-sm mb-2 text-gray-700">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  className="pl-10 h-12"
                  required
                />
              </div>
            </div>

            {mode !== 'reset' && (
              <div>
                <label htmlFor="password" className="block text-sm mb-2 text-gray-700">
                  Password
                </label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    className="pr-10 h-12"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>
            )}

            {mode === 'signup' && (
              <div>
                <label htmlFor="confirmPassword" className="block text-sm mb-2 text-gray-700">
                  Confirm Password
                </label>
                <Input
                  id="confirmPassword"
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm your password"
                  className="h-12"
                  required
                />
              </div>
            )}

            <Button
              type="submit"
              className="w-full h-12 text-white"
              style={{ backgroundColor: '#625d9c' }}
              disabled={loading}
            >
              {loading
                ? 'Please wait...'
                : mode === 'reset'
                ? 'Send Reset Link'
                : mode === 'signup'
                ? 'Create Account'
                : 'Proceed'}
            </Button>
          </form>

          {/* Mode Toggle */}
          <div className="mt-4 text-center text-sm">
            {mode === 'signin' && !isStaffMode && (
              <>
                <button
                  onClick={() => onSignupClicked?.()}
                  className="hover:underline"
                  style={{ color: '#625d9c' }}
                >
                  Don't have an account? Sign up
                </button>
                <span className="mx-2 text-gray-400">|</span>
                <button
                  onClick={() => setMode('reset')}
                  className="hover:underline"
                  style={{ color: '#625d9c' }}
                >
                  Forgot password?
                </button>
              </>
            )}
            {mode === 'signin' && isStaffMode && (
              <button
                onClick={() => setMode('reset')}
                className="hover:underline"
                style={{ color: '#625d9c' }}
              >
                Forgot password?
              </button>
            )}
            {mode === 'reset' && (
              <button
                onClick={() => setMode('signin')}
                className="hover:underline"
                style={{ color: '#625d9c' }}
              >
                Back to sign in
              </button>
            )}
          </div>

          {/* Social Auth — hidden in staff mode */}
          {mode !== 'reset' && !isStaffMode && (
            <>
              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-200"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-4 bg-white text-gray-500">Or continue with</span>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handleSocialAuth('google')}
                  disabled={loading}
                  className="h-12"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path
                      fill="currentColor"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="currentColor"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handleSocialAuth('apple')}
                  disabled={loading}
                  className="h-12"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
                  </svg>
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handleSocialAuth('facebook')}
                  disabled={loading}
                  className="h-12"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="#1877F2">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                  </svg>
                </Button>
              </div>
            </>
          )}
          
          {/* Become a Tutor CTA */}
          {mode === 'signin' && (
            <div className="mt-6 p-4 border-2 rounded-lg text-center" style={{ borderColor: '#5d9827', backgroundColor: '#f0f9e8' }}>
              <h3 className="mb-2" style={{ color: '#5d9827' }}>Want to teach?</h3>
              <p className="text-sm text-gray-700 mb-3">
                Join TutorNest and start earning by sharing your knowledge
              </p>
              <Button
                type="button"
                onClick={() => onBecomeTutor?.()}
                className="w-full text-white"
                style={{ backgroundColor: '#5d9827' }}
              >
                Become a Tutor
              </Button>
            </div>
          )}
          
          {/* Become a Student CTA */}
          {mode === 'signin' && (
            <div className="mt-6 p-4 border-2 rounded-lg text-center" style={{ borderColor: '#5d9827', backgroundColor: '#f0f9e8' }}>
              <h3 className="mb-2" style={{ color: '#5d9827' }}>Want to learn?</h3>
              <p className="text-sm text-gray-700 mb-3">
                Join TutorNest and find the best tutors for you
              </p>
              <Button
                type="button"
                onClick={() => onBecomeStudent?.()}
                className="w-full text-white"
                style={{ backgroundColor: '#5d9827' }}
              >
                Become a Student
              </Button>
            </div>
          )}
        </div>

        <p className="text-center mt-6 text-sm text-gray-600">
          By continuing, you agree to TutorNest's Terms of Service and Privacy Policy
        </p>
        
      </div>
    </AuthBackground>
  );
}