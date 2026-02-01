import { useState } from 'react';
import { getSupabaseClient } from '../utils/supabase/client';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Alert, AlertDescription } from './ui/alert';
import { AlertCircle, CheckCircle, XCircle } from 'lucide-react';

const supabase = getSupabaseClient();

export function AuthDebugger() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [testResults, setTestResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const addResult = (test: string, success: boolean, details: any) => {
    setTestResults(prev => [...prev, { test, success, details, timestamp: new Date().toISOString() }]);
  };

  const runDiagnostics = async () => {
    setTestResults([]);
    setLoading(true);

    try {
      // Test 1: Check Supabase connection
      addResult('Supabase Connection', true, 'Connection initialized');

      // Test 2: Check if user exists using backend
      try {
        const checkEmailResponse = await fetch(
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
        
        if (checkEmailResponse.ok) {
          const checkData = await checkEmailResponse.json();
          addResult(
            'User Exists Check', 
            checkData.exists, 
            checkData.exists 
              ? `User with email "${email}" exists in database` 
              : `No user found with email "${email}". You may need to sign up first.`
          );
        } else {
          addResult('User Exists Check', false, 'Failed to check if user exists');
        }
      } catch (err: any) {
        addResult('User Exists Check', false, err.message);
      }

      // Test 3: Test backend auth endpoint
      try {
        const testAuthResponse = await fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-cbd74580/test-auth`,
          {
            headers: {
              'Authorization': `Bearer ${publicAnonKey}`,
            },
          }
        );
        
        const testAuthData = await testAuthResponse.json();
        addResult(
          'Backend Auth Service', 
          testAuthData.success, 
          testAuthData.success 
            ? `Backend can access auth (${testAuthData.userCount} users in system)` 
            : testAuthData.error
        );
      } catch (err: any) {
        addResult('Backend Auth Service', false, err.message);
      }

      // Test 4: Try actual sign in
      if (email && password) {
        try {
          const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
          });

          if (error) {
            addResult('Sign In Attempt', false, {
              message: error.message,
              status: error.status,
              code: error.code,
              name: error.name
            });
          } else {
            addResult('Sign In Attempt', true, {
              message: 'Sign in successful!',
              userId: data.user?.id,
              email: data.user?.email,
              emailConfirmed: data.user?.email_confirmed_at ? 'Yes' : 'No'
            });
          }
        } catch (err: any) {
          addResult('Sign In Attempt', false, err.message);
        }
      } else {
        addResult('Sign In Attempt', false, 'Email or password not provided');
      }

      // Test 5: Check password length
      if (password) {
        const isValidLength = password.length >= 6;
        addResult(
          'Password Validation',
          isValidLength,
          isValidLength 
            ? `Password length (${password.length} chars) meets minimum requirement (6+ chars)`
            : `Password too short (${password.length} chars). Must be at least 6 characters.`
        );
      }

    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed bottom-4 right-4 w-96 max-h-[600px] bg-white rounded-lg shadow-2xl border-2 border-gray-300 overflow-hidden flex flex-col z-50">
      <div className="bg-purple-600 text-white p-4">
        <h3 className="font-bold">🔧 Auth Debugger</h3>
        <p className="text-xs opacity-90">Diagnose sign-in issues</p>
      </div>

      <div className="p-4 space-y-3 flex-1 overflow-y-auto">
        <div>
          <label className="block text-sm mb-1 font-medium">Email</label>
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter email to test"
            className="w-full"
          />
        </div>

        <div>
          <label className="block text-sm mb-1 font-medium">Password</label>
          <Input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter password to test"
            className="w-full"
          />
        </div>

        <Button
          onClick={runDiagnostics}
          disabled={loading || !email}
          className="w-full"
          style={{ backgroundColor: '#625d9c' }}
        >
          {loading ? 'Running Tests...' : 'Run Diagnostics'}
        </Button>

        {testResults.length > 0 && (
          <div className="space-y-2 mt-4">
            <h4 className="font-bold text-sm">Test Results:</h4>
            {testResults.map((result, index) => (
              <Alert 
                key={index} 
                className={result.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}
              >
                <div className="flex items-start gap-2">
                  {result.success ? (
                    <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0 mt-0.5" />
                  ) : (
                    <XCircle className="h-4 w-4 text-red-600 flex-shrink-0 mt-0.5" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className={`font-medium text-sm ${result.success ? 'text-green-800' : 'text-red-800'}`}>
                      {result.test}
                    </div>
                    <AlertDescription className={`text-xs mt-1 ${result.success ? 'text-green-700' : 'text-red-700'}`}>
                      {typeof result.details === 'string' 
                        ? result.details 
                        : JSON.stringify(result.details, null, 2)
                      }
                    </AlertDescription>
                  </div>
                </div>
              </Alert>
            ))}
          </div>
        )}

        {testResults.length > 0 && (
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded text-xs">
            <p className="font-medium text-blue-900 mb-2">💡 Common Issues & Solutions:</p>
            <ul className="list-disc list-inside space-y-1 text-blue-800">
              <li>If user doesn't exist: Click "Sign Up" and create an account</li>
              <li>If password is wrong: Use "Forgot password?" to reset</li>
              <li>If email not confirmed: Check email or disable confirmation in Supabase Dashboard</li>
              <li>If backend error: Check browser console for details</li>
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
