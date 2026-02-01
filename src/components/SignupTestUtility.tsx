import { useState } from 'react';
import { projectId } from '../utils/supabase/info';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Alert, AlertDescription } from './ui/alert';
import { CheckCircle, XCircle, AlertCircle, Code } from 'lucide-react';

/**
 * SignupTestUtility Component
 * 
 * This component helps test and debug the signup endpoint.
 * It provides detailed logging and error information.
 * 
 * To use: Add this component to your app temporarily for testing.
 */
export function SignupTestUtility() {
  const [testEmail, setTestEmail] = useState('test@example.com');
  const [testPassword, setTestPassword] = useState('test123456');
  const [testName, setTestName] = useState('Test User');
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    status: 'success' | 'error' | 'network-error' | 'json-error' | null;
    statusCode?: number;
    message?: string;
    data?: any;
    logs: string[];
  }>({
    status: null,
    logs: [],
  });

  const addLog = (log: string) => {
    setTestResult(prev => ({
      ...prev,
      logs: [...prev.logs, `[${new Date().toISOString()}] ${log}`]
    }));
  };

  const testSignupEndpoint = async () => {
    setTesting(true);
    setTestResult({ status: null, logs: [] });
    
    addLog('Starting signup test...');
    addLog(`Email: ${testEmail}`);
    addLog(`Password: ${'*'.repeat(testPassword.length)}`);
    addLog(`Name: ${testName}`);
    
    try {
      addLog('Checking environment variables...');
      addLog(`Project ID: ${projectId}`);
      
      const url = `https://${projectId}.supabase.co/functions/v1/make-server-cbd74580/signup`;
      addLog(`Request URL: ${url}`);
      
      addLog('Sending request...');
      let response;
      try {
        response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: testEmail,
            password: testPassword,
            name: testName,
          }),
        });
        addLog(`Response received with status: ${response.status} ${response.statusText}`);
      } catch (networkError: any) {
        addLog(`❌ Network error: ${networkError.message}`);
        setTestResult(prev => ({
          ...prev,
          status: 'network-error',
          message: networkError.message,
        }));
        return;
      }
      
      addLog('Parsing response...');
      let data;
      try {
        const text = await response.text();
        addLog(`Raw response: ${text.substring(0, 500)}${text.length > 500 ? '...' : ''}`);
        data = JSON.parse(text);
        addLog('Response parsed successfully');
      } catch (jsonError: any) {
        addLog(`❌ JSON parse error: ${jsonError.message}`);
        setTestResult(prev => ({
          ...prev,
          status: 'json-error',
          statusCode: response.status,
          message: jsonError.message,
        }));
        return;
      }
      
      if (response.ok) {
        addLog('✅ Signup successful!');
        setTestResult(prev => ({
          ...prev,
          status: 'success',
          statusCode: response.status,
          message: 'User created successfully',
          data,
        }));
      } else {
        addLog(`❌ Signup failed: ${data.error || 'Unknown error'}`);
        setTestResult(prev => ({
          ...prev,
          status: 'error',
          statusCode: response.status,
          message: data.error || 'Unknown error',
          data,
        }));
      }
    } catch (error: any) {
      addLog(`❌ Unexpected error: ${error.message}`);
      setTestResult(prev => ({
        ...prev,
        status: 'error',
        message: error.message,
      }));
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Code className="w-6 h-6" />
            Signup Endpoint Test Utility
          </CardTitle>
          <CardDescription>
            Test the signup endpoint and view detailed logs for debugging
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Test Inputs */}
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium">Test Email</label>
              <Input
                type="email"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
                placeholder="test@example.com"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Test Password</label>
              <Input
                type="password"
                value={testPassword}
                onChange={(e) => setTestPassword(e.target.value)}
                placeholder="At least 6 characters"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Test Name</label>
              <Input
                type="text"
                value={testName}
                onChange={(e) => setTestName(e.target.value)}
                placeholder="Test User"
              />
            </div>
          </div>

          {/* Test Button */}
          <Button
            onClick={testSignupEndpoint}
            disabled={testing || !testEmail || !testPassword || !testName}
            className="w-full"
            style={{ backgroundColor: '#625d9c' }}
          >
            {testing ? 'Testing...' : 'Test Signup Endpoint'}
          </Button>

          {/* Result Status */}
          {testResult.status && (
            <Alert className={
              testResult.status === 'success' 
                ? 'bg-green-50 border-green-200' 
                : 'bg-red-50 border-red-200'
            }>
              {testResult.status === 'success' ? (
                <CheckCircle className="h-4 w-4 text-green-600" />
              ) : testResult.status === 'network-error' ? (
                <XCircle className="h-4 w-4 text-red-600" />
              ) : (
                <AlertCircle className="h-4 w-4 text-red-600" />
              )}
              <AlertDescription className={
                testResult.status === 'success' ? 'text-green-800' : 'text-red-800'
              }>
                <strong>
                  {testResult.status === 'success' ? 'Success' : 
                   testResult.status === 'network-error' ? 'Network Error' :
                   testResult.status === 'json-error' ? 'Invalid Response' :
                   'Error'}
                  {testResult.statusCode && ` (${testResult.statusCode})`}
                </strong>
                <br />
                {testResult.message}
              </AlertDescription>
            </Alert>
          )}

          {/* Response Data */}
          {testResult.data && (
            <div className="bg-gray-50 rounded-lg p-4 border">
              <div className="text-sm font-medium mb-2">Response Data:</div>
              <pre className="text-xs overflow-auto max-h-48 bg-white p-3 rounded border">
                {JSON.stringify(testResult.data, null, 2)}
              </pre>
            </div>
          )}

          {/* Logs */}
          {testResult.logs.length > 0 && (
            <div className="bg-gray-900 rounded-lg p-4 text-white">
              <div className="text-sm font-medium mb-2 text-gray-300">Detailed Logs:</div>
              <div className="space-y-1 text-xs font-mono max-h-64 overflow-auto">
                {testResult.logs.map((log, i) => (
                  <div 
                    key={i} 
                    className={
                      log.includes('❌') ? 'text-red-400' :
                      log.includes('✅') ? 'text-green-400' :
                      'text-gray-300'
                    }
                  >
                    {log}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Instructions */}
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-sm">
              <strong>How to use:</strong>
              <ol className="list-decimal ml-4 mt-2 space-y-1">
                <li>Enter test credentials (use a new email each time)</li>
                <li>Click "Test Signup Endpoint" to test</li>
                <li>Check the logs for detailed information</li>
                <li>If testing multiple times, change the email to avoid "already exists" errors</li>
                <li>Check the browser console (F12) for additional debugging info</li>
                <li>Check Supabase Edge Function logs for server-side errors</li>
              </ol>
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  );
}
