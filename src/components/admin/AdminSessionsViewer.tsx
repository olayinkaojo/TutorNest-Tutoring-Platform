import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent } from '../ui/card';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { Tabs, TabsList, TabsTrigger } from '../ui/tabs';
import { Loader2, Search, Calendar } from 'lucide-react';
import { projectId } from '../../utils/supabase/info';

interface AdminSession {
  id: string;
  tutorId: string;
  studentId: string;
  parentId: string;
  tutorName: string;
  studentName: string;
  parentName: string;
  subject: string;
  date: string;
  startTime: string;
  endTime: string;
  status: string;
  paymentStatus: string | null;
  planType: string | null;
  sessionNumber: number | null;
  totalSessions: number | null;
  createdAt: string;
}

interface AdminSessionsViewerProps {
  accessToken: string;
}

const STATUS_STYLES: Record<string, { bg: string; text: string }> = {
  confirmed: { bg: '#eff6ff', text: '#2563eb' },
  completed: { bg: '#f0fdf4', text: '#16a34a' },
  cancelled: { bg: '#fef2f2', text: '#dc2626' },
  no_show: { bg: '#fff7ed', text: '#ea580c' },
  pending: { bg: '#fefce8', text: '#ca8a04' },
};

function statusStyle(status: string) {
  return STATUS_STYLES[status?.toLowerCase()] || { bg: '#f3f4f6', text: '#4b5563' };
}

function formatDate(dateStr: string) {
  try {
    return new Date(`${dateStr}T12:00:00`).toLocaleDateString('en-GB', {
      weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

function formatTime(time: string) {
  if (!time) return '';
  const [h, m] = time.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${ampm}`;
}

export function AdminSessionsViewer({ accessToken }: AdminSessionsViewerProps) {
  const [sessions, setSessions] = useState<AdminSession[]>([]);
  const [upcomingCount, setUpcomingCount] = useState(0);
  const [pastCount, setPastCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [view, setView] = useState<'upcoming' | 'past' | 'all'>('upcoming');
  const [search, setSearch] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    fetch(
      `https://${projectId}.supabase.co/functions/v1/make-server-cbd74580/admin/sessions`,
      { headers: { Authorization: `Bearer ${accessToken}` } },
    )
      .then((res) => {
        if (!res.ok) throw new Error('Failed to load sessions');
        return res.json();
      })
      .then((data) => {
        if (cancelled) return;
        setSessions(data.sessions || []);
        setUpcomingCount(data.upcomingCount || 0);
        setPastCount(data.pastCount || 0);
      })
      .catch((err) => !cancelled && setError(err.message || 'Failed to load sessions'))
      .finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
  }, [accessToken]);

  const todayStr = useMemo(() => new Date().toISOString().slice(0, 10), []);

  const filtered = useMemo(() => {
    let list = sessions;
    if (view === 'upcoming') list = list.filter((s) => s.date >= todayStr);
    else if (view === 'past') list = list.filter((s) => s.date < todayStr);

    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter((s) =>
        s.parentName?.toLowerCase().includes(q) ||
        s.studentName?.toLowerCase().includes(q) ||
        s.tutorName?.toLowerCase().includes(q) ||
        s.subject?.toLowerCase().includes(q)
      );
    }
    return list;
  }, [sessions, view, search, todayStr]);

  if (loading) {
    return (
      <Card>
        <CardContent className="py-16 text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3" style={{ color: '#625d9c' }} />
          <p className="text-gray-500 text-sm">Loading sessions…</p>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-red-600 text-sm">{error}</CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <Card className="border-gray-100">
          <CardContent className="pt-5 pb-4">
            <p className="text-xs text-gray-500 mb-1">Upcoming sessions</p>
            <p className="text-2xl font-semibold" style={{ color: '#625d9c' }}>{upcomingCount}</p>
          </CardContent>
        </Card>
        <Card className="border-gray-100">
          <CardContent className="pt-5 pb-4">
            <p className="text-xs text-gray-500 mb-1">Past sessions</p>
            <p className="text-2xl font-semibold text-gray-700">{pastCount}</p>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
        <Tabs value={view} onValueChange={(v) => setView(v as typeof view)}>
          <TabsList>
            <TabsTrigger value="upcoming">Upcoming ({upcomingCount})</TabsTrigger>
            <TabsTrigger value="past">Past ({pastCount})</TabsTrigger>
            <TabsTrigger value="all">All ({sessions.length})</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search parent, student, tutor…"
            className="pl-9 h-9"
          />
        </div>
      </div>

      <Card className="border-gray-100">
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <div className="py-14 text-center text-gray-400">
              <Calendar className="w-10 h-10 mx-auto mb-3 text-gray-300" />
              <p className="text-sm">No {view === 'all' ? '' : view} sessions{search ? ' match your search' : ''}.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-gray-500 bg-gray-50">
                    <th className="py-2.5 px-4 font-medium">Parent</th>
                    <th className="py-2.5 px-4 font-medium">Student</th>
                    <th className="py-2.5 px-4 font-medium">Tutor</th>
                    <th className="py-2.5 px-4 font-medium">Subject</th>
                    <th className="py-2.5 px-4 font-medium">Date &amp; Time</th>
                    <th className="py-2.5 px-4 font-medium">Plan</th>
                    <th className="py-2.5 px-4 font-medium">Status</th>
                    <th className="py-2.5 px-4 font-medium">Payment</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((s) => {
                    const st = statusStyle(s.status);
                    return (
                      <tr key={s.id} className="border-b hover:bg-gray-50">
                        <td className="py-2.5 px-4 text-gray-900 whitespace-nowrap">{s.parentName}</td>
                        <td className="py-2.5 px-4 text-gray-700 whitespace-nowrap">{s.studentName}</td>
                        <td className="py-2.5 px-4 text-gray-700 whitespace-nowrap">{s.tutorName}</td>
                        <td className="py-2.5 px-4 text-gray-600">{s.subject}</td>
                        <td className="py-2.5 px-4 text-gray-600 whitespace-nowrap">
                          {formatDate(s.date)}{s.startTime ? `, ${formatTime(s.startTime)}` : ''}
                        </td>
                        <td className="py-2.5 px-4 text-gray-500 whitespace-nowrap">
                          {s.totalSessions ? `${s.sessionNumber ?? 1}/${s.totalSessions}${s.planType ? ` · ${s.planType}` : ''}` : '—'}
                        </td>
                        <td className="py-2.5 px-4">
                          <Badge style={{ backgroundColor: st.bg, color: st.text, border: 'none' }}>
                            {(s.status || 'unknown').replace(/_/g, ' ')}
                          </Badge>
                        </td>
                        <td className="py-2.5 px-4 text-gray-500">{s.paymentStatus || '—'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
