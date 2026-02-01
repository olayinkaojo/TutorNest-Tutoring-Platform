import { useState } from 'react';
import { projectId } from '../utils/supabase/info';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Alert, AlertDescription } from './ui/alert';
import { AlertCircle, CheckCircle, XCircle } from 'lucide-react';

interface TutorRejectionAppealProps {
  session: any;
  rejectionReason: string;
  onAppealSubmitted: () => void;
}

export function TutorRejectionAppeal({
  session,
  rejectionReason,
  onAppealSubmitted,
}: TutorRejectionAppealProps) {
  const [appealReason, setAppealReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmitAppeal = async () => {
    if (!appealReason.trim()) {
      setError('Please provide a reason for your appeal');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-cbd74580/verifications/appeal`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            appealReason,
            additionalDocuments: [],
          }),
        }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to submit appeal');
      }

      setSuccess(true);
      setTimeout(() => {
        onAppealSubmitted();
      }, 2000);
    } catch (err: any) {
      console.error('Error submitting appeal:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-green-50 flex items-center justify-center p-4 sm:p-6 md:p-8">
      <div className="w-full max-w-2xl">
        <Card className="p-6 sm:p-8">
          <div className="text-center mb-6">
            <div
              className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center"
              style={{ backgroundColor: '#fef2f2' }}
            >
              <XCircle className="w-8 h-8" style={{ color: '#dc2626' }} />
            </div>
            <h1 className="mb-2">Application Under Review</h1>
            <p className="text-gray-600">
              Your tutor application requires additional review
            </p>
          </div>

          {error && (
            <Alert className="mb-6 bg-red-50 border-red-200">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-800">{error}</AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert className="mb-6 bg-green-50 border-green-200">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                Appeal submitted successfully! Our team will review it shortly.
              </AlertDescription>
            </Alert>
          )}

          <Alert className="mb-6 bg-amber-50 border-amber-200">
            <AlertCircle className="h-4 w-4 text-amber-600" />
            <AlertDescription className="text-amber-800">
              <strong>Rejection Reason:</strong>
              <p className="mt-2">{rejectionReason}</p>
            </AlertDescription>
          </Alert>

          <div className="mb-6">
            <Label htmlFor="appealReason">Appeal Your Application</Label>
            <Textarea
              id="appealReason"
              value={appealReason}
              onChange={(e) => setAppealReason(e.target.value)}
              placeholder="Explain why you believe this decision should be reconsidered. Include any additional information or corrections..."
              className="mt-2"
              rows={6}
            />
            <p className="text-xs text-gray-500 mt-2">
              Our team will review your appeal within 2-3 business days.
            </p>
          </div>

          <Button
            onClick={handleSubmitAppeal}
            disabled={loading || success}
            className="w-full h-12 text-white"
            style={{ backgroundColor: '#625d9c' }}
          >
            {loading ? 'Submitting Appeal...' : success ? 'Appeal Submitted' : 'Submit Appeal'}
          </Button>
        </Card>
      </div>
    </div>
  );
}