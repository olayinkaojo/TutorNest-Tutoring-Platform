import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Alert, AlertDescription } from './ui/alert';
import { Badge } from './ui/badge';
import { Calendar, CheckCircle, XCircle, Loader2, ExternalLink, AlertCircle } from 'lucide-react';
import { projectId } from '../utils/supabase/info';

interface GoogleCalendarSetupProps {
  session: any;
  onConnectionChange?: (connected: boolean) => void;
}

export function GoogleCalendarSetup({ session, onConnectionChange }: GoogleCalendarSetupProps) {
  const [loading, setLoading] = useState(false);
  const [connected, setConnected] = useState(false);
  const [connectedAt, setConnectedAt] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [checkingStatus, setCheckingStatus] = useState(true);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    checkConnectionStatus();
  }, []);

  useEffect(() => {
    // Handle OAuth callback — use React Router location so the preserved query params are visible
    const urlParams = new URLSearchParams(location.search);
    const code = urlParams.get('code');
    const state = urlParams.get('state');

    if (code && state) {
      handleOAuthCallback(code);
      // Do NOT navigate here — it flips isGoogleOAuthCallback to false and
      // unmounts this component before the exchange-token fetch completes.
      // URL stripping is handled inside handleOAuthCallback after success.
    }
  }, [location.search]);

  const checkConnectionStatus = async () => {
    setCheckingStatus(true);
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-cbd74580/google-calendar/status`,
        {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setConnected(data.connected);
        setConnectedAt(data.connectedAt);
        onConnectionChange?.(data.connected);
      }
    } catch (err: any) {
      console.error('Error checking connection status:', err);
    } finally {
      setCheckingStatus(false);
    }
  };

  const handleOAuthCallback = async (code: string) => {
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-cbd74580/google-calendar/exchange-token`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ code }),
        }
      );

      const data = await response.json();

      if (response.ok) {
        setSuccess('Google Calendar connected successfully!');
        setConnected(true);
        setConnectedAt(new Date().toISOString());
        if (onConnectionChange) {
          onConnectionChange(true); // caller handles navigation (e.g. AuthenticatedAppRoutes)
        } else {
          navigate(location.pathname, { replace: true }); // strip code from URL in-place
        }
      } else {
        setError(data.error || 'Failed to connect Google Calendar');
      }
    } catch (err: any) {
      console.error('Error exchanging token:', err);
      setError('An error occurred while connecting to Google Calendar');
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = async () => {
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-cbd74580/google-calendar/auth-url`,
        {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
          },
        }
      );

      const data = await response.json();

      if (response.ok) {
        // Redirect to Google OAuth
        window.location.href = data.authUrl;
      } else {
        setError(data.error || 'Failed to initiate Google Calendar connection');
        setLoading(false);
      }
    } catch (err: any) {
      console.error('Error initiating OAuth:', err);
      setError('An error occurred while initiating connection');
      setLoading(false);
    }
  };

  const handleDisconnect = async () => {
    if (!confirm('Are you sure you want to disconnect Google Calendar? Future bookings will not be synced to your calendar.')) {
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-cbd74580/google-calendar/disconnect`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
          },
        }
      );

      const data = await response.json();

      if (response.ok) {
        setSuccess('Google Calendar disconnected successfully');
        setConnected(false);
        setConnectedAt(null);
        onConnectionChange?.(false);
      } else {
        setError(data.error || 'Failed to disconnect Google Calendar');
      }
    } catch (err: any) {
      console.error('Error disconnecting:', err);
      setError('An error occurred while disconnecting');
    } finally {
      setLoading(false);
    }
  };

  if (checkingStatus) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Google Calendar Integration
          </CardTitle>
          <CardDescription>
            Checking connection status...
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="w-5 h-5" />
          Google Calendar Integration
        </CardTitle>
        <CardDescription>
          Sync your TutorNest sessions with Google Calendar automatically
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert className="border-green-200 bg-green-50">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">{success}</AlertDescription>
          </Alert>
        )}

        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center gap-3">
            {connected ? (
              <CheckCircle className="w-5 h-5 text-green-600" />
            ) : (
              <XCircle className="w-5 h-5 text-gray-400" />
            )}
            <div>
              <p className="font-medium">
                {connected ? 'Connected' : 'Not Connected'}
              </p>
              {connectedAt && (
                <p className="text-xs text-gray-500">
                  Connected on {new Date(connectedAt).toLocaleDateString()}
                </p>
              )}
            </div>
          </div>
          <Badge variant={connected ? 'default' : 'secondary'}>
            {connected ? 'Active' : 'Inactive'}
          </Badge>
        </div>

        {!connected && (
          <div className="space-y-3">
            <h4 className="font-medium">Benefits of connecting:</h4>
            <ul className="space-y-2 text-sm text-gray-600">
              <li className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                <span>Automatically add sessions to your Google Calendar</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                <span>Get reminders before sessions start</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                <span>Sync availability and prevent double bookings</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                <span>Access Google Meet links for virtual sessions</span>
              </li>
            </ul>
          </div>
        )}

        <div className="flex gap-2 pt-4">
          {connected ? (
            <Button
              variant="outline"
              onClick={handleDisconnect}
              disabled={loading}
              className="w-full"
            >
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Disconnect Google Calendar
            </Button>
          ) : (
            <Button
              onClick={handleConnect}
              disabled={loading}
              className="w-full text-white"
              style={{ backgroundColor: '#625d9c' }}
            >
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              <ExternalLink className="w-4 h-4 mr-2" />
              Connect Google Calendar
            </Button>
          )}
        </div>

        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="text-xs">
            By connecting Google Calendar, you allow TutorNest to create, read, and manage calendar events on your behalf. You can disconnect at any time.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}
