import { useState } from 'react';
import { getSupabaseClient } from '../utils/supabase/client';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import { AuthBackground } from './AuthBackground';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Alert, AlertDescription } from './ui/alert';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { CheckCircle, AlertCircle, User, Users } from 'lucide-react';
import TutorNestLogo from './TutorNestLogo';

const supabase = getSupabaseClient();

interface ParentSignupProps {
  onBackToSignIn?: () => void;
  initialData?: { email: string; password: string; name: string; phone?: string } | null;
  onSignupSuccess?: () => void;
}

export function ParentSignup({ onBackToSignIn, initialData, onSignupSuccess }: ParentSignupProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [emailCheckLoading, setEmailCheckLoading] = useState(false);
  const [emailExists, setEmailExists] = useState(false);
  const [emailConfirmationSent, setEmailConfirmationSent] = useState(false);

  // Form data
  const [email, setEmail] = useState(initialData?.email || '');
  const [password, setPassword] = useState(initialData?.password || '');
  const [confirmPassword, setConfirmPassword] = useState(initialData?.password || '');
  const [fullName, setFullName] = useState(initialData?.name || '');
  const [phone, setPhone] = useState(initialData?.phone || '');
  const [address, setAddress] = useState('');
  const [numberOfChildren, setNumberOfChildren] = useState('');
  const [childrenAges, setChildrenAges] = useState('');
  const [agreeTerms, setAgreeTerms] = useState(false);

  // Function to check if email exists
  const checkEmailAvailability = async () => {
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
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
          body: JSON.stringify({ email }),
        }
      );

      if (response.ok) {
        const data = await response.json();
        if (data.exists) {
          setEmailExists(true);
          setError('This email is already registered. Please sign in or use a different email.');
        } else {
          setEmailExists(false);
          if (error.includes('already registered') || error.includes('already exists')) {
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

  const validateForm = () => {
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
    if (!agreeTerms) {
      setError('Please agree to the terms of service');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!validateForm()) return;

    setLoading(true);

    try {
      console.log('Attempting signup for:', email);
      let signupResponse;
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
              role: 'parent',
              profileData: {
                full_name: fullName,
                email,
                phone,
                address,
                number_of_children: numberOfChildren ? parseInt(numberOfChildren) : null,
                children_ages: childrenAges,
                role: 'parent',
                onboardingComplete: true,
              },
            }),
          }
        );
      } catch (networkError: any) {
        console.error('Network error during signup:', networkError);
        throw new Error('Network error: Unable to connect to server. Please check your internet connection and try again.');
      }

      let signupData;
      try {
        signupData = await signupResponse.json();
      } catch (jsonError: any) {
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

      // Email confirmation required — show the "check your email" screen
      setEmailConfirmationSent(true);

    } catch (err: any) {
      console.error('Signup error:', err);
      let errorMessage = err.message || 'An error occurred during signup';
      if (err.message?.includes('string did not match')) {
        errorMessage = 'Invalid email or password format. Please check your email and ensure your password is at least 6 characters.';
      }
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthBackground className="py-8 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Logo */}
        <div className="flex justify-center mb-6">
          <TutorNestLogo />
        </div>

        {emailConfirmationSent ? (
          <div className="bg-white rounded-3xl shadow-xl p-8 text-center">
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center">
                <CheckCircle className="w-8 h-8 text-purple-600" />
              </div>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Check your email</h2>
            <p className="text-gray-600 mb-4">
              We sent a confirmation link to <strong>{email}</strong>.
              Click the link in the email to activate your account.
            </p>
            <p className="text-sm text-gray-500">
              Already confirmed?{' '}
              <button onClick={onBackToSignIn} className="text-purple-600 hover:underline font-medium">
                Sign in
              </button>
            </p>
          </div>
        ) : (

        <div className="bg-white rounded-3xl shadow-xl p-6 sm:p-8">
          <h1 className="text-center mb-2 text-gray-900">Create Parent Account</h1>
          <p className="text-center text-gray-600 mb-8">
            Join TutorNest to manage your children's learning journey
          </p>

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

          <form onSubmit={handleSubmit}>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Account Information
                </CardTitle>
                <CardDescription>Create your parent account</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
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
                        setEmail(e.target.value);
                        setEmailExists(false);
                        if (error.includes('already registered') || error.includes('already exists')) {
                          setError('');
                        }
                      }}
                      onBlur={checkEmailAvailability}
                      placeholder="john@example.com"
                      className={emailExists ? 'border-red-500 pr-10' : emailCheckLoading ? 'pr-10' : ''}
                      required
                    />
                    {emailCheckLoading && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        <div className="animate-spin h-5 w-5 border-2 border-gray-300 border-t-[#625d9c] rounded-full" />
                      </div>
                    )}
                    {!emailCheckLoading && emailExists && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        <AlertCircle className="h-5 w-5 text-red-500" />
                      </div>
                    )}
                    {!emailCheckLoading && email && !emailExists && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        <CheckCircle className="h-5 w-5 text-green-500" />
                      </div>
                    )}
                  </div>
                  {emailExists && (
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
                </div>

                <div>
                  <Label htmlFor="phone">Phone Number (with country code)</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="e.g., +234 801 234 5678"
                  />
                  <p className="text-xs text-gray-500 mt-1">Include your country code (e.g., +234 for Nigeria, +1 for USA)</p>
                </div>

                <div>
                  <Label htmlFor="address">Address</Label>
                  <Textarea
                    id="address"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Your home address"
                    rows={2}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="numberOfChildren">Number of Children</Label>
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
                    <Label htmlFor="childrenAges">Children's Ages</Label>
                    <Input
                      id="childrenAges"
                      value={childrenAges}
                      onChange={(e) => setChildrenAges(e.target.value)}
                      placeholder="e.g., 8, 12, 15"
                    />
                  </div>
                </div>

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
                  <p className="text-xs text-gray-500 mt-1">Must be at least 6 characters long</p>
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
                      By checking this box, you agree to TutorNest's Terms of Service and Privacy Policy.
                    </p>
                  </Label>
                </div>

                <Alert className="bg-blue-50 border-blue-200">
                  <AlertCircle className="h-4 w-4 text-blue-600" />
                  <AlertDescription className="text-blue-800">
                    <strong>What's next?</strong>
                    <ul className="text-sm mt-2 space-y-1 list-disc list-inside">
                      <li>Access your parent dashboard immediately</li>
                      <li>Add your children's profiles</li>
                      <li>Browse and connect with qualified tutors</li>
                      <li>Track your children's learning progress</li>
                    </ul>
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>

            <div className="mt-6">
              <Button
                type="submit"
                className="w-full text-white"
                style={{ backgroundColor: '#625d9c' }}
                disabled={loading}
              >
                {loading ? 'Creating Account...' : 'Create Parent Account'}
              </Button>
            </div>
          </form>

          {/* Already have account */}
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