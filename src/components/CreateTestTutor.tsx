import { useState } from 'react';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Alert, AlertDescription } from './ui/alert';
import { CheckCircle, AlertCircle, Users } from 'lucide-react';

export function CreateTestTutor() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [createdTutors, setCreatedTutors] = useState<any[]>([]);

  const createTestTutors = async () => {
    setLoading(true);
    setError('');
    setMessage('');
    setCreatedTutors([]);

    try {
      console.log('Sending request to create test tutors...');
      
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-cbd74580/test/create-tutors`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${publicAnonKey}`,
          },
        }
      );

      console.log('Response status:', response.status);
      
      let data;
      try {
        const responseText = await response.text();
        console.log('Response text:', responseText);
        
        if (!responseText) {
          throw new Error(`Server returned empty response. Status: ${response.status}`);
        }
        
        data = JSON.parse(responseText);
        console.log('Response data:', data);
      } catch (parseError) {
        console.error('Failed to parse response:', parseError);
        throw new Error(`Server returned invalid response. Status: ${response.status}. Check console for details.`);
      }

      if (!response.ok) {
        const errorMsg = data.error || 'Failed to create test tutors';
        const details = data.details ? `\n\nDetails: ${data.details}` : '';
        throw new Error(errorMsg + details);
      }

      setCreatedTutors(data.tutors || []);
      
      let successMessage = data.message || 'Test tutors created successfully!';
      if (data.errors && data.errors.length > 0) {
        successMessage += '\n\nSome tutors failed to create:';
        data.errors.forEach((err: any) => {
          successMessage += `\n- ${err.email}: ${err.error}`;
        });
      }
      
      setMessage(successMessage);
    } catch (err: any) {
      console.error('Error creating test tutors:', err);
      setError(err.message || 'Failed to create test tutors');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="p-6">
      <div className="flex items-center gap-2 mb-4">
        <Users className="w-5 h-5" style={{ color: '#625d9c' }} />
        <h3>Create Test Tutors</h3>
      </div>
      
      {message && (
        <Alert className="mb-4 bg-green-50 border-green-200">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800 whitespace-pre-line">{message}</AlertDescription>
        </Alert>
      )}

      {error && (
        <Alert className="mb-4 bg-red-50 border-red-200">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800 whitespace-pre-line">{error}</AlertDescription>
        </Alert>
      )}

      {createdTutors.length > 0 && (
        <div className="mb-4 p-4 bg-gray-50 rounded-lg">
          <p className="text-sm mb-2">Created tutors:</p>
          <ul className="text-sm space-y-1">
            {createdTutors.map((tutor, index) => (
              <li key={index} className="flex items-center gap-2">
                <CheckCircle className="w-3 h-3 text-green-600" />
                {tutor.name} ({tutor.email})
              </li>
            ))}
          </ul>
          <p className="text-xs text-gray-600 mt-3">
            Password for all test tutors: <code className="bg-white px-2 py-1 rounded">test1234</code>
          </p>
        </div>
      )}

      <p className="text-sm text-gray-600 mb-4">
        Click the button below to create 5 verified test tutors with different subjects and specializations. 
        These tutors will immediately appear in parent searches.
      </p>

      <div className="space-y-2 text-xs text-gray-600 mb-4 p-3 bg-blue-50 rounded">
        <p>Test tutors include:</p>
        <ul className="list-disc list-inside space-y-1 ml-2">
          <li>Sarah Thompson - Mathematics & Statistics (GCSE/A-Level)</li>
          <li>James Chen - Physics, Maths & Chemistry (GCSE/A-Level/University)</li>
          <li>Emily Parker - English Language & Literature (KS3/GCSE/A-Level)</li>
          <li>David Williams - Science (Primary/KS3)</li>
          <li>Maria Rodriguez - Spanish & French (KS3/GCSE/A-Level)</li>
        </ul>
      </div>

      <Button
        onClick={createTestTutors}
        disabled={loading}
        className="w-full text-white"
        style={{ backgroundColor: '#625d9c' }}
      >
        {loading ? 'Creating Test Tutors...' : 'Create 5 Test Tutors'}
      </Button>
    </Card>
  );
}