import { useState } from 'react';
import { getSupabaseClient } from '../utils/supabase/client';
import { Eye, EyeOff, AlertCircle, KeyRound } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Alert, AlertDescription } from './ui/alert';
import KFALogo from './KFALogo';
import { AuthBackground } from './AuthBackground';

const supabase = getSupabaseClient();

interface ResetPasswordConfirmProps {
  /** Called once the password has actually been changed — clears the recovery
   * flag in App.tsx so normal session/profile routing takes back over. */
  onComplete: () => void;
}

/**
 * Shown when a "reset your password" email link lands back in the app
 * (?/#...type=recovery — detected in App.tsx). Clicking that link alone only
 * proves the person owns the inbox and hands them a temporary signed-in
 * session; without this screen the app was silently treating that the same
 * as a normal login and dropping them onto their dashboard having never
 * actually set a new password — leaving them unable to sign in again later.
 */
export function ResetPasswordConfirm({ onComplete }: ResetPasswordConfirmProps) {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      // Relies on the recovery session supabase-js already established from
      // the email link's URL — no need to pass it explicitly.
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) throw updateError;
      onComplete();
    } catch (err: any) {
      // A used or expired recovery link fails here with no valid session to
      // update — point people back to requesting a fresh one rather than
      // leaving them stuck on a form that will never succeed.
      const message = err?.message || 'Could not update your password.';
      setError(
        /session|token|expired|jwt/i.test(message)
          ? 'This reset link has expired or was already used. Please request a new one from the sign-in page.'
          : message,
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthBackground className="flex items-center justify-center p-4 sm:p-6 md:p-8">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-3xl shadow-xl p-6 sm:p-8">
          <div className="flex justify-center mb-6 sm:mb-8">
            <KFALogo />
          </div>

          <div className="flex justify-center mb-4">
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center"
              style={{ backgroundColor: '#625d9c15' }}
            >
              <KeyRound className="w-6 h-6" style={{ color: '#625d9c' }} />
            </div>
          </div>

          <h1 className="text-center mb-2 text-gray-900">Set a new password</h1>
          <p className="text-center text-sm text-gray-500 mb-6 sm:mb-8">
            Choose a new password for your account below.
          </p>

          {error && (
            <Alert className="mb-4 bg-red-50 border-red-200">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-800">{error}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="new-password" className="block text-sm mb-2 text-gray-700">
                New password
              </label>
              <div className="relative">
                <Input
                  id="new-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  className="pr-10 h-12"
                  required
                  autoFocus
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

            <div>
              <label htmlFor="confirm-new-password" className="block text-sm mb-2 text-gray-700">
                Confirm new password
              </label>
              <Input
                id="confirm-new-password"
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter your new password"
                className="h-12"
                required
              />
            </div>

            <Button
              type="submit"
              className="w-full h-12 text-white"
              style={{ backgroundColor: '#625d9c' }}
              disabled={loading}
            >
              {loading ? 'Updating…' : 'Update password'}
            </Button>
          </form>
        </div>
      </div>
    </AuthBackground>
  );
}
