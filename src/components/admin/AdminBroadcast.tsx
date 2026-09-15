import { useState, useEffect, useCallback, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Badge } from '../ui/badge';
import { Checkbox } from '../ui/checkbox';
import { Alert, AlertDescription } from '../ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../ui/alert-dialog';
import {
  Send,
  Users,
  Loader2,
  CheckCircle,
  AlertCircle,
  Mail,
  History,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { projectId } from '../../utils/supabase/info';

interface AdminBroadcastProps {
  accessToken: string;
}

const ROLES = [
  { value: 'tutor', label: 'Tutors' },
  { value: 'parent', label: 'Parents' },
  { value: 'student', label: 'Students' },
  { value: 'admin', label: 'Admins' },
];

async function api(path: string, accessToken: string, options: RequestInit = {}) {
  const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-cbd74580${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
      ...options.headers,
    },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || `Request failed (${response.status})`);
  return data;
}

export function AdminBroadcast({ accessToken }: AdminBroadcastProps) {
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [verificationStatus, setVerificationStatus] = useState('any');
  const [includeSuspended, setIncludeSuspended] = useState(false);

  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');

  const [previewCount, setPreviewCount] = useState<number | null>(null);
  const [previewSample, setPreviewSample] = useState<{ name: string; email: string }[]>([]);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);

  const [testSending, setTestSending] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState<{ sentCount: number; failedCount: number; totalRecipients: number } | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const [history, setHistory] = useState<any[]>([]);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);

  const filters = { roles: selectedRoles, verificationStatus, excludeSuspended: !includeSuspended };
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchPreview = useCallback(async () => {
    setPreviewLoading(true);
    setPreviewError(null);
    try {
      const data = await api('/admin/broadcast/preview', accessToken, {
        method: 'POST',
        body: JSON.stringify(filters),
      });
      setPreviewCount(data.count);
      setPreviewSample(data.sample || []);
    } catch (err: any) {
      setPreviewError(err.message || 'Could not load audience preview');
    } finally {
      setPreviewLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken, JSON.stringify(filters)]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(fetchPreview, 350);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [fetchPreview]);

  const toggleRole = (role: string) => {
    setSelectedRoles((prev) => (prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]));
  };

  const handleTestSend = async () => {
    setTestSending(true);
    setTestResult(null);
    setSendError(null);
    try {
      const data = await api('/admin/broadcast/test-send', accessToken, {
        method: 'POST',
        body: JSON.stringify({ subject, body }),
      });
      setTestResult(`Test email sent to ${data.sentTo} — check your inbox before sending to everyone.`);
    } catch (err: any) {
      setSendError(err.message || 'Test send failed');
    } finally {
      setTestSending(false);
    }
  };

  const handleSend = async () => {
    setConfirmOpen(false);
    setSending(true);
    setSendError(null);
    setSendResult(null);
    try {
      const data = await api('/admin/broadcast/send', accessToken, {
        method: 'POST',
        body: JSON.stringify({ ...filters, subject, body }),
      });
      setSendResult(data);
      setSubject('');
      setBody('');
      setTestResult(null);
      fetchPreview();
      if (historyOpen) fetchHistory();
    } catch (err: any) {
      setSendError(err.message || 'Send failed');
    } finally {
      setSending(false);
    }
  };

  const fetchHistory = async () => {
    setHistoryLoading(true);
    try {
      const data = await api('/admin/broadcast/history', accessToken);
      setHistory(data.broadcasts || []);
    } catch (err) {
      console.error('Error fetching broadcast history:', err);
    } finally {
      setHistoryLoading(false);
    }
  };

  const toggleHistory = () => {
    const next = !historyOpen;
    setHistoryOpen(next);
    if (next && history.length === 0) fetchHistory();
  };

  const canSend = selectedRoles.length > 0 && subject.trim() && body.trim() && (previewCount ?? 0) > 0;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="w-5 h-5" style={{ color: '#625d9c' }} />
            Announcements
          </CardTitle>
          <CardDescription>
            Send an email to a segment of users — each person gets their own message, never one email BCC'd to everyone.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Audience */}
          <div className="space-y-3">
            <Label>Audience</Label>
            <div className="flex flex-wrap gap-4">
              {ROLES.map((role) => (
                <label key={role.value} className="flex items-center gap-2 text-sm cursor-pointer">
                  <Checkbox
                    checked={selectedRoles.includes(role.value)}
                    onCheckedChange={() => toggleRole(role.value)}
                  />
                  {role.label}
                </label>
              ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              {selectedRoles.includes('tutor') && (
                <div className="space-y-2">
                  <Label htmlFor="verification-filter" className="text-xs text-gray-500">Tutor verification status</Label>
                  <Select value={verificationStatus} onValueChange={setVerificationStatus}>
                    <SelectTrigger id="verification-filter">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="any">Any status</SelectItem>
                      <SelectItem value="verified">Verified only</SelectItem>
                      <SelectItem value="pending">Pending only</SelectItem>
                      <SelectItem value="rejected">Rejected only</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
              <label className="flex items-center gap-2 text-sm cursor-pointer self-end pb-2">
                <Checkbox checked={includeSuspended} onCheckedChange={(v) => setIncludeSuspended(!!v)} />
                Include suspended accounts
              </label>
            </div>

            {/* Live audience preview */}
            <div className="bg-gray-50 border rounded-lg p-3 flex items-start gap-3">
              <Users className="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                {selectedRoles.length === 0 ? (
                  <p className="text-sm text-gray-500">Select at least one role to see who this would reach.</p>
                ) : previewLoading ? (
                  <p className="text-sm text-gray-500 flex items-center gap-2">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" /> Checking audience…
                  </p>
                ) : previewError ? (
                  <p className="text-sm text-red-600">{previewError}</p>
                ) : (
                  <>
                    <p className="text-sm">
                      This will reach <strong>{previewCount ?? 0}</strong> {previewCount === 1 ? 'person' : 'people'}.
                    </p>
                    {previewSample.length > 0 && (
                      <p className="text-xs text-gray-500 mt-1 truncate">
                        e.g. {previewSample.map((s) => s.name).join(', ')}
                        {(previewCount ?? 0) > previewSample.length ? '…' : ''}
                      </p>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Compose */}
          <div className="space-y-2">
            <Label htmlFor="broadcast-subject">Subject</Label>
            <Input
              id="broadcast-subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="e.g., Platform update: new Training Videos section"
              disabled={sending}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="broadcast-body">Message</Label>
            <Textarea
              id="broadcast-body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder={"Hi {{firstName}},\n\nWrite your message here — it'll be dropped into our normal email design automatically."}
              rows={8}
              disabled={sending}
            />
            <p className="text-xs text-gray-500">
              Use <code className="bg-gray-100 px-1 rounded">{'{{firstName}}'}</code> anywhere to personalize with each recipient's first name. Line breaks and blank lines are preserved.
            </p>
          </div>

          {testResult && (
            <Alert className="bg-green-50 border-green-200">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">{testResult}</AlertDescription>
            </Alert>
          )}
          {sendError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{sendError}</AlertDescription>
            </Alert>
          )}
          {sendResult && (
            <Alert className={sendResult.failedCount > 0 ? 'bg-amber-50 border-amber-200' : 'bg-green-50 border-green-200'}>
              <CheckCircle className={`h-4 w-4 ${sendResult.failedCount > 0 ? 'text-amber-600' : 'text-green-600'}`} />
              <AlertDescription className={sendResult.failedCount > 0 ? 'text-amber-800' : 'text-green-800'}>
                Sent to {sendResult.sentCount} of {sendResult.totalRecipients} recipients.
                {sendResult.failedCount > 0 && ` ${sendResult.failedCount} failed — see History below for details.`}
              </AlertDescription>
            </Alert>
          )}

          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              variant="outline"
              onClick={handleTestSend}
              disabled={testSending || sending || !subject.trim() || !body.trim()}
              className="flex-1"
            >
              {testSending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Mail className="w-4 h-4 mr-2" />}
              Send test to myself
            </Button>
            <Button
              onClick={() => setConfirmOpen(true)}
              disabled={!canSend || sending}
              className="flex-1 text-white"
              style={{ backgroundColor: '#625d9c' }}
            >
              {sending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
              Send to {previewCount ?? 0} {previewCount === 1 ? 'person' : 'people'}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="cursor-pointer" onClick={toggleHistory}>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <History className="w-4 h-4" style={{ color: '#625d9c' }} />
              Broadcast History
            </CardTitle>
            {historyOpen ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
          </div>
        </CardHeader>
        {historyOpen && (
          <CardContent>
            {historyLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
              </div>
            ) : history.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-6">No broadcasts sent yet.</p>
            ) : (
              <div className="space-y-3">
                {history.map((b) => (
                  <div key={b.id} className="border rounded-lg p-3">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <h4 className="text-sm truncate">{b.subject}</h4>
                      <Badge variant="outline" className="text-xs flex-shrink-0">
                        {(b.filters?.roles ?? []).join(', ') || 'all roles'}
                      </Badge>
                    </div>
                    <p className="text-xs text-gray-500">
                      {new Date(b.sentAt).toLocaleString()} · sent to {b.sentCount}/{b.totalRecipients}
                      {b.failedCount > 0 && <span className="text-amber-600"> · {b.failedCount} failed</span>}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        )}
      </Card>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Send this to {previewCount ?? 0} {previewCount === 1 ? 'person' : 'people'}?</AlertDialogTitle>
            <AlertDialogDescription>
              This sends "{subject}" to everyone currently matching your selected audience. This can't be undone once sent — consider using "Send test to myself" first if you haven't already.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleSend} style={{ backgroundColor: '#625d9c' }}>
              Yes, send it
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
