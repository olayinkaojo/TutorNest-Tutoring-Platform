import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { FileText, Search, RefreshCw, AlertCircle, Eye, CheckCircle, XCircle } from 'lucide-react';
import { projectId } from '../../utils/supabase/info';
import { ViewSessionReport } from '../ViewSessionReport';

interface AdminSessionReport {
  id: string;
  bookingId: string;
  tutorId?: string;
  studentId?: string;
  parentId?: string;
  tutorName: string;
  studentName: string;
  parentName?: string;
  subject?: string;
  sessionDate?: string;
  startTime?: string;
  endTime?: string;
  studentAttended?: boolean;
  submittedAt: string;
  [key: string]: unknown;
}

interface SessionReportsAdminProps {
  session: any;
  accessToken: string;
}

export function SessionReportsAdmin({ session, accessToken }: SessionReportsAdminProps) {
  const [reports, setReports] = useState<AdminSessionReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [viewing, setViewing] = useState<AdminSessionReport | null>(null);

  const fetchReports = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-cbd74580/admin/session-reports`,
        { headers: { Authorization: `Bearer ${accessToken}` } },
      );
      if (response.ok) {
        const data = await response.json();
        setReports(data.reports || []);
      } else {
        const err = await response.json().catch(() => ({}));
        setError(err.error || 'Failed to load session reports');
      }
    } catch (err) {
      console.error('Error loading session reports:', err);
      setError('Failed to load session reports');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchReports();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const formatDate = (value?: string): string => {
    if (!value) return '—';
    const d = new Date(value);
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
  };

  const filtered = reports.filter((r) => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return true;
    return (
      r.tutorName?.toLowerCase().includes(q) ||
      r.studentName?.toLowerCase().includes(q) ||
      r.subject?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {error && (
        <div className="flex items-center gap-2 text-red-700 bg-red-50 border border-red-200 rounded-lg p-3 text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Reports Submitted</p>
                <h2 className="text-2xl font-bold mt-2">{reports.length}</h2>
              </div>
              <div className="w-12 h-12 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#f0edfb' }}>
                <FileText className="w-6 h-6" style={{ color: '#625d9c' }} />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Reported as Absent</p>
                <h2 className="text-2xl font-bold mt-2">{reports.filter((r) => r.studentAttended === false).length}</h2>
              </div>
              <div className="w-12 h-12 bg-amber-100 rounded-lg flex items-center justify-center">
                <XCircle className="w-6 h-6 text-amber-600" />
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
                placeholder="Search by tutor, student, or subject..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <Button variant="outline" size="sm" className="gap-2" onClick={() => void fetchReports()} disabled={loading}>
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Session Reports</CardTitle>
          <CardDescription>Every post-session report a tutor has submitted, across all bookings.</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-gray-500">Loading session reports…</div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <FileText className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>{reports.length === 0 ? 'No session reports submitted yet' : 'No reports match your search'}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tutor</TableHead>
                    <TableHead>Student</TableHead>
                    <TableHead>Subject</TableHead>
                    <TableHead>Session</TableHead>
                    <TableHead>Attendance</TableHead>
                    <TableHead>Submitted</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="text-sm font-medium">{r.tutorName}</TableCell>
                      <TableCell className="text-sm">{r.studentName}</TableCell>
                      <TableCell className="text-sm text-gray-600">{r.subject || '—'}</TableCell>
                      <TableCell className="text-sm text-gray-600 whitespace-nowrap">
                        {r.sessionDate ? formatDate(r.sessionDate) : '—'}
                      </TableCell>
                      <TableCell>
                        {r.studentAttended === false ? (
                          <Badge variant="outline" className="text-amber-700 border-amber-300 bg-amber-50">
                            <XCircle className="w-3 h-3 mr-1" /> Absent
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-green-700 border-green-300 bg-green-50">
                            <CheckCircle className="w-3 h-3 mr-1" /> Present
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-gray-600 whitespace-nowrap">{formatDate(r.submittedAt)}</TableCell>
                      <TableCell>
                        <Button size="sm" variant="outline" onClick={() => setViewing(r)}>
                          <Eye className="w-4 h-4 mr-1.5" />
                          View
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {viewing && (
        <ViewSessionReport
          open
          onOpenChange={(isOpen) => { if (!isOpen) setViewing(null); }}
          session={session}
          userRole="admin"
          booking={{
            date: viewing.sessionDate,
            startTime: viewing.startTime,
            endTime: viewing.endTime,
            studentName: viewing.studentName,
          }}
          report={viewing}
        />
      )}
    </div>
  );
}
