import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Video, CheckCircle2, AlertTriangle, Loader2, RefreshCw } from 'lucide-react';
import { projectId } from '../../utils/supabase/info';

interface Status {
  provider: 'daily' | 'meet';
  googleMeetConfigured: boolean;
  cloudRecordingEnabledInApp: boolean;
  dailyReachable: boolean;
  dailyDomainRecording: string | null;
}

/**
 * Admin control for which video service lessons use. Daily.co is the main
 * service; Google Meet (on the platform's Workspace account) is the backup,
 * switched to here during a Daily outage. Also confirms recording — the only
 * Daily feature that costs money — is off both in our app and on the Daily
 * account itself.
 */
export function VideoProviderPanel({ accessToken }: { accessToken: string }) {
  const base = `https://${projectId}.supabase.co/functions/v1/make-server-cbd74580/admin/video-provider`;
  const [status, setStatus] = useState<Status | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch(base, { headers: { Authorization: `Bearer ${accessToken}` } });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not load video settings');
      setStatus(data);
    } catch (e: any) {
      setMessage({ kind: 'error', text: e.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [accessToken]);

  const switchTo = async (provider: 'daily' | 'meet') => {
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch(base, {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not switch');
      setMessage({
        kind: 'ok',
        text: provider === 'meet'
          ? data.googleMeetConfigured
            ? 'Switched to Google Meet. Lessons joined from now on open in Google Meet.'
            : 'Switched to backup. Google Meet isn’t set up yet, so lessons will open in Jitsi.'
          : 'Switched back to Daily.co. Lessons open inside the app again.',
      });
      await load();
    } catch (e: any) {
      setMessage({ kind: 'error', text: e.message });
    } finally {
      setBusy(false);
    }
  };

  const testMeet = async () => {
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch(`${base}/test-meet`, { method: 'POST', headers: { Authorization: `Bearer ${accessToken}` } });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Google Meet test failed');
      setMessage({ kind: 'ok', text: `Google Meet works. Test link: ${data.meetingUri}` });
    } catch (e: any) {
      setMessage({ kind: 'error', text: e.message });
    } finally {
      setBusy(false);
    }
  };

  const recordingOff = status && !status.cloudRecordingEnabledInApp && !status.dailyDomainRecording;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Video className="w-5 h-5" style={{ color: '#625d9c' }} />
              Video provider
            </CardTitle>
            <CardDescription>Which service lessons use, and whether anything is set to record.</CardDescription>
          </div>
          <Button size="sm" variant="ghost" onClick={load} disabled={loading}>
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading && !status ? (
          <div className="flex justify-center py-6"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>
        ) : status ? (
          <>
            <div className="grid sm:grid-cols-3 gap-3 text-sm">
              <div className="border rounded-lg p-3">
                <p className="text-xs text-gray-500 mb-1">In use now</p>
                <Badge className="text-white" style={{ backgroundColor: status.provider === 'daily' ? '#5d9827' : '#d97706' }}>
                  {status.provider === 'daily' ? 'Daily.co (main)' : 'Backup'}
                </Badge>
              </div>
              <div className="border rounded-lg p-3">
                <p className="text-xs text-gray-500 mb-1">Cloud recording</p>
                {recordingOff ? (
                  <span className="flex items-center gap-1 text-green-700"><CheckCircle2 className="w-4 h-4" /> Off — no recording charges</span>
                ) : (
                  <span className="flex items-center gap-1 text-amber-700"><AlertTriangle className="w-4 h-4" />
                    {status.cloudRecordingEnabledInApp ? 'On in the app' : `On in Daily account (${status.dailyDomainRecording})`}
                  </span>
                )}
                {!status.dailyReachable && (
                  <p className="text-xs text-gray-500 mt-1">Couldn’t reach Daily to check its account setting.</p>
                )}
              </div>
              <div className="border rounded-lg p-3">
                <p className="text-xs text-gray-500 mb-1">Google Meet backup</p>
                {status.googleMeetConfigured ? (
                  <span className="flex items-center gap-1 text-green-700"><CheckCircle2 className="w-4 h-4" /> Set up</span>
                ) : (
                  <span className="flex items-center gap-1 text-amber-700"><AlertTriangle className="w-4 h-4" /> Not set up — backup uses Jitsi</span>
                )}
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {status.provider === 'daily' ? (
                <Button variant="outline" disabled={busy} onClick={() => switchTo('meet')}>
                  Switch lessons to backup
                </Button>
              ) : (
                <Button className="text-white" style={{ backgroundColor: '#5d9827' }} disabled={busy} onClick={() => switchTo('daily')}>
                  Switch back to Daily.co
                </Button>
              )}
              {status.googleMeetConfigured && (
                <Button variant="ghost" disabled={busy} onClick={testMeet}>Test Google Meet</Button>
              )}
            </div>
            <p className="text-xs text-gray-500">
              Use the backup only when Daily calls won’t start. It takes effect the next time someone presses Join;
              backup lessons open in a new tab and aren’t recorded.
            </p>
          </>
        ) : null}

        {message && (
          <p className={`text-sm break-all ${message.kind === 'ok' ? 'text-green-700' : 'text-red-700'}`}>{message.text}</p>
        )}
      </CardContent>
    </Card>
  );
}
