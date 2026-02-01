import { useState } from 'react';
import { projectId } from '../utils/supabase/info';
import { Button } from './ui/button';
import { Alert, AlertDescription } from './ui/alert';

export function AuthTestButton() {
  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState<any>(null);

  const testAuth = async () => {
    setTesting(true);
    setResult(null);

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-cbd74580/test-auth`
      );
      
      const data = await response.json();
      setResult({
        status: response.status,
        data
      });
    } catch (error: any) {
      setResult({
        status: 'error',
        data: { error: error.message }
      });
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="p-4 border rounded">
      <h3 className="mb-2">Auth Diagnostics</h3>
      <Button onClick={testAuth} disabled={testing}>
        {testing ? 'Testing...' : 'Test Server Auth'}
      </Button>
      
      {result && (
        <Alert className="mt-4">
          <AlertDescription>
            <pre className="text-xs overflow-auto">
              {JSON.stringify(result, null, 2)}
            </pre>
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
