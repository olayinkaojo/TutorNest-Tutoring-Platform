import { useEffect, useState } from 'react';
import { Loader2, AlertCircle, X, ShieldAlert } from 'lucide-react';
import { Button } from './ui/button';
import { Alert, AlertDescription } from './ui/alert';
import { projectId } from '../utils/supabase/info';

interface SessionCallModalProps {
  bookingId: string;
  accessToken: string;
  onClose: () => void;
}

/**
 * Embedded video call — stays inside the app instead of opening another
 * site in a new tab. A plain iframe pointed at a Daily Prebuilt room URL is
 * enough; no video SDK needed since recording is triggered server-side via
 * the join token, not by anything the client has to do.
 */
export function SessionCallModal({ bookingId, accessToken, onClose }: SessionCallModalProps) {
  const [roomUrl, setRoomUrl] = useState<string | null>(null);
  const [recorded, setRecorded] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const response = await fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-cbd74580/sessions/${bookingId}/join-token`,
          { method: 'POST', headers: { Authorization: `Bearer ${accessToken}` } },
        );
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Failed to join session');
        if (!cancelled) {
          setRoomUrl(data.roomUrl);
          setRecorded(data.recorded !== false);
        }
      } catch (err: any) {
        if (!cancelled) setError(err.message || 'Failed to join session');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [bookingId, accessToken]);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-6xl h-[90vh] flex flex-col overflow-hidden">
        <div className="p-3 border-b flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <ShieldAlert className="w-4 h-4 text-amber-600 flex-shrink-0" />
            {recorded
              ? 'This session is recorded for safeguarding and quality assurance.'
              : "This session isn't being recorded right now (temporary issue) — it will still take place normally."}
          </div>
          <Button size="sm" variant="ghost" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>

        <div className="flex-1 relative bg-gray-900">
          {loading ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <Loader2 className="w-10 h-10 text-white animate-spin" />
            </div>
          ) : error ? (
            <div className="absolute inset-0 flex items-center justify-center p-8">
              <Alert variant="destructive" className="max-w-md">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            </div>
          ) : roomUrl ? (
            <iframe
              src={roomUrl}
              className="w-full h-full border-0"
              allow="camera; microphone; display-capture; fullscreen; autoplay"
              title="Tutoring session"
            />
          ) : null}
        </div>
      </div>
    </div>
  );
}
