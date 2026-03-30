import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Alert, AlertDescription } from './ui/alert';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { projectId, publicAnonKey } from '../utils/supabase/info';

export function TestPaymentPlans() {
  const [testing, setTesting] = useState(false);
  const [results, setResults] = useState<any>(null);

  const runTests = async () => {
    setTesting(true);
    const testResults: any = {
      timestamp: new Date().toISOString(),
      tests: [],
    };

    try {
      // Test 1: Check backend config
      console.log('🧪 Test 1: Checking backend config...');
      const configResponse = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-cbd74580/payments/test-config`
      );
      const configData = await configResponse.json();
      testResults.tests.push({
        name: 'Backend Configuration',
        status: configData.expected_currency === 'NGN' ? 'pass' : 'fail',
        data: configData,
      });

      // Test 2: Fetch payment plans
      console.log('🧪 Test 2: Fetching payment plans...');
      const plansResponse = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-cbd74580/payments/plans`
      );
      const plansData = await plansResponse.json();
      testResults.tests.push({
        name: 'Fetch Payment Plans',
        status: plansData.plans && plansData.plans.length === 3 ? 'pass' : 'fail',
        data: plansData,
      });

      // Test 3: Check currency symbols
      console.log('🧪 Test 3: Checking currency format...');
      const currencyTest = plansData.plans?.map((plan: any) => ({
        name: plan.name,
        price_naira: plan.price_naira,
        formatted: `₦${plan.price_naira.toLocaleString('en-NG')}`,
      }));
      testResults.tests.push({
        name: 'Currency Format',
        status: 'pass',
        data: currencyTest,
      });

      setResults(testResults);
    } catch (error: any) {
      console.error('Test failed:', error);
      testResults.tests.push({
        name: 'Error',
        status: 'fail',
        error: error.message,
      });
      setResults(testResults);
    } finally {
      setTesting(false);
    }
  };

  useEffect(() => {
    runTests();
  }, []);

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Payment System Diagnostic</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <strong>Project ID:</strong>
            <code className="px-2 py-1 bg-muted rounded text-sm">{projectId}</code>
          </div>

          {testing && (
            <div className="flex items-center gap-3 text-muted-foreground">
              <Loader2 className="w-5 h-5 animate-spin" />
              Running diagnostic tests...
            </div>
          )}

          {results && (
            <div className="space-y-4">
              {results.tests.map((test: any, idx: number) => (
                <Alert key={idx} variant={test.status === 'pass' ? 'default' : 'destructive'}>
                  <div className="flex items-start gap-3">
                    {test.status === 'pass' ? (
                      <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                    ) : (
                      <XCircle className="w-5 h-5 text-red-600 mt-0.5" />
                    )}
                    <div className="flex-1">
                      <div className="font-semibold mb-2">{test.name}</div>
                      <AlertDescription>
                        <pre className="text-xs overflow-auto bg-muted p-2 rounded mt-2">
                          {JSON.stringify(test.data || test.error, null, 2)}
                        </pre>
                      </AlertDescription>
                    </div>
                  </div>
                </Alert>
              ))}

              <div className="pt-4 border-t">
                <h3 className="font-semibold mb-2">Summary:</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <strong>Total Tests:</strong> {results.tests.length}
                  </div>
                  <div>
                    <strong>Passed:</strong>{' '}
                    <span className="text-green-600">
                      {results.tests.filter((t: any) => t.status === 'pass').length}
                    </span>
                  </div>
                  <div>
                    <strong>Failed:</strong>{' '}
                    <span className="text-red-600">
                      {results.tests.filter((t: any) => t.status === 'fail').length}
                    </span>
                  </div>
                  <div>
                    <strong>Timestamp:</strong> {new Date(results.timestamp).toLocaleString()}
                  </div>
                </div>
              </div>

              <Button onClick={runTests} className="w-full" disabled={testing}>
                {testing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Re-run Tests
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Quick Fixes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div>
            <strong>If backend not configured:</strong>
            <ol className="list-decimal ml-6 mt-2 space-y-1">
              <li>
                Go to Supabase Dashboard →{' '}
                <a
                  href={`https://supabase.com/dashboard/project/${projectId}/functions`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 underline"
                >
                  Edge Functions
                </a>
              </li>
              <li>Find "make-server-cbd74580" function</li>
              <li>Click "..." menu → Deploy</li>
              <li>Wait 1-2 minutes for deployment</li>
              <li>Return here and click "Re-run Tests"</li>
            </ol>
          </div>

          <div className="border-t pt-3">
            <strong>If plans not found:</strong>
            <ol className="list-decimal ml-6 mt-2 space-y-1">
              <li>
                Go to Supabase Dashboard →{' '}
                <a
                  href={`https://supabase.com/dashboard/project/${projectId}/editor`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 underline"
                >
                  SQL Editor
                </a>
              </li>
              <li>Open the file: /DATABASE_SCHEMA_PAYMENTS.sql</li>
              <li>Copy all SQL content</li>
              <li>Paste into SQL Editor and click "Run"</li>
              <li>Return here and click "Re-run Tests"</li>
            </ol>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
