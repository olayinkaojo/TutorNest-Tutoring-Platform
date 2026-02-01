import { useState } from 'react';
import { Button } from './ui/button';
import { Alert, AlertDescription } from './ui/alert';
import { Bell, Loader2, CheckCircle } from 'lucide-react';
import { projectId } from '../utils/supabase/info';

interface TestNotificationButtonProps {
  session: any;
  userId: string;
}

export function TestNotificationButton({ session, userId }: TestNotificationButtonProps) {
  const [creating, setCreating] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const createTestNotifications = async () => {
    setCreating(true);
    setError('');
    setSuccess(false);

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-cbd74580/notifications/${userId}/create-test`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
        }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create test notifications');
      }

      const data = await response.json();
      console.log('Created test notifications:', data);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      console.error('Error creating test notifications:', err);
      setError(err.message || 'Failed to create test notifications');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-2">
      <Button
        onClick={createTestNotifications}
        disabled={creating}
        variant="outline"
        size="sm"
      >
        {creating ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Creating...
          </>
        ) : (
          <>
            <Bell className="w-4 h-4 mr-2" />
            Create Test Notifications
          </>
        )}
      </Button>

      {success && (
        <Alert className="bg-green-50 border-green-200">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800 text-sm">
            4 test notifications created! Check the notification bell.
          </AlertDescription>
        </Alert>
      )}

      {error && (
        <Alert className="bg-red-50 border-red-200">
          <AlertDescription className="text-red-800 text-sm">{error}</AlertDescription>
        </Alert>
      )}
    </div>
  );
}
