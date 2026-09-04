import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Video, Search, RefreshCw, AlertCircle, ShieldAlert, Trash2, PlayCircle } from 'lucide-react';
import { projectId } from '../../utils/supabase/info';

interface RecordingRow {
  id: string;
  bookingId: string | null;
  tutorName: string;
  studentName: string;
  startTs: number | null;
  duration: number | null;
  status: 'available' | 'expired' | 'deleted';
  createdAt: string;
  deletedAt: string | null;
}

interface RecordingsViewerProps {
  accessToken: string;
}

export function RecordingsViewer({ accessToken }: RecordingsViewerProps) {
  const [recordings, setRecordings] = useState<RecordingRow[]>([]);
  const [retentionDays, setRetentionDays] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);

  const fetchRecordings = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-cbd74580/admin/recordings`,
        { headers: { Authorization: `Bearer ${accessToken}` } },
      );
      if (response.ok) {
        const data = await response.json();
        setRecordings(data.recordings || []);
        setRetentionDays(data.retentionDays ?? null);
      } else {
        const err = await response.json().catch(() => ({}));
        setError(err.error || 'Failed to load recordings');
      }
    } catch (err) {
      console.error('Error loading recordings:', err);
      setError('Failed to load recordings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchRecordings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleView = async (rec: RecordingRow) => {
    setBusyId(rec.id);
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-cbd74580/admin/recordings/${rec.id}/access-link`,
        { headers: { Authorization: `Bearer ${accessToken}` } },
      );
      const data = await response.json();
      if (response.ok && data.accessLink) {
        window.open(data.accessLink, '_blank', 'noopener,noreferrer');
      } else {
        alert(data.error || 'Failed to get a playback link');
      }
    } catch (err) {
      console.error('Error getting access link:', err);
      alert('Failed to get a playback link');
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (rec: RecordingRow) => {
    if (!confirm(`Permanently delete this recording (${rec.tutorName} / ${rec.studentName})? This cannot be undone.`)) return;
    setBusyId(rec.id);
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-cbd74580/admin/recordings/${rec.id}`,
        { method: 'DELETE', headers: { Authorization: `Bearer ${accessToken}` } },
      );
      if (response.ok) {
        setRecordings((prev) => prev.map((r) => (r.id === rec.id ? { ...r, status: 'deleted' as const } : r)));
      } else {
        const err = await response.json().catch(() => ({}));
        alert(err.error || 'Failed to delete recording');
      }
    } catch (err) {
      console.error('Error deleting recording:', err);
      alert('Failed to delete recording');
    } finally {
      setBusyId(null);
    }
  };

  const formatDate = (ts: number | string | null): string => {
    if (!ts) return '—';
    const d = typeof ts === 'number' ? new Date(ts * 1000) : new Date(ts);
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
  };

  const formatDuration = (seconds: number | null): string => {
    if (!seconds) return '—';
    const mins = Math.round(seconds / 60);
    return `${mins} min`;
  };

  const statusBadge = (status: RecordingRow['status']) => {
    if (status === 'available') return <Badge style={{ backgroundColor: '#16a34a', color: 'white' }}>Available</Badge>;
    if (status === 'expired') return <Badge variant="outline" className="text-gray-500">Expired (retention)</Badge>;
    return <Badge variant="outline" className="text-gray-500">Deleted</Badge>;
  };

  const filtered = recordings.filter((rec) => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return true;
    return rec.tutorName.toLowerCase().includes(q) || rec.studentName.toLowerCase().includes(q);
  });

  const availableCount = recordings.filter((r) => r.status === 'available').length;

  return (
    <div className="space-y-6">
      {error && (
        <div className="flex items-center gap-2 text-red-700 bg-red-50 border border-red-200 rounded-lg p-3 text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      <div className="flex items-start gap-2 text-sm text-amber-900 bg-amber-50 border border-amber-200 rounded-lg p-3">
        <ShieldAlert className="w-4 h-4 flex-shrink-0 mt-0.5" />
        <p>
          Retained for safeguarding and investigation only
          {retentionDays ? ` — kept for ${retentionDays} days unless deleted sooner, then removed automatically` : ''}.
          Opening a recording logs an access record against the tutor's and student's accounts, visible in the Audit Log.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Available Recordings</p>
                <h2 className="text-2xl font-bold mt-2">{availableCount}</h2>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <Video className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total (incl. deleted/expired)</p>
                <h2 className="text-2xl font-bold mt-2">{recordings.length}</h2>
              </div>
              <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                <Video className="w-6 h-6 text-gray-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4 flex-wrap">
            <div className="flex-1 min-w-64 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search by tutor or student name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <Button variant="outline" size="sm" className="gap-2" onClick={() => void fetchRecordings()} disabled={loading}>
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Session Recordings</CardTitle>
          <CardDescription>Cloud recordings from tutoring sessions, admin-only.</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-gray-500">Loading recordings…</div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Video className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>No recordings found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tutor</TableHead>
                    <TableHead>Student</TableHead>
                    <TableHead>Session Time</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((rec) => (
                    <TableRow key={rec.id}>
                      <TableCell className="text-sm font-medium">{rec.tutorName}</TableCell>
                      <TableCell className="text-sm">{rec.studentName}</TableCell>
                      <TableCell className="text-sm text-gray-600 whitespace-nowrap">{formatDate(rec.startTs)}</TableCell>
                      <TableCell className="text-sm">{formatDuration(rec.duration)}</TableCell>
                      <TableCell>{statusBadge(rec.status)}</TableCell>
                      <TableCell>
                        {rec.status === 'available' ? (
                          <div className="flex gap-2">
                            <Button size="sm" variant="outline" disabled={busyId === rec.id} onClick={() => handleView(rec)}>
                              <PlayCircle className="w-4 h-4 mr-1.5" />
                              View
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-red-600 border-red-200 hover:bg-red-50"
                              disabled={busyId === rec.id}
                              onClick={() => handleDelete(rec)}
                            >
                              <Trash2 className="w-4 h-4 mr-1.5" />
                              Delete
                            </Button>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400">No longer available</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
