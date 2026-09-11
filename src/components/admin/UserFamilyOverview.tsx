import { useEffect, useState } from 'react';
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '../ui/accordion';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { AlertCircle, Baby, Calendar, CreditCard, FileText, Loader2, Eye } from 'lucide-react';
import { projectId } from '../../utils/supabase/info';
import { formatNaira } from '../../utils/currency';
import { ViewSessionReport } from '../ViewSessionReport';

interface FamilyOverview {
  children: { id: string; firstName: string; lastName: string; age: number | null; gradeLevel?: string; subjects?: string[] }[];
  bookings: {
    total: number;
    upcoming: number;
    completed: number;
    cancelled: number;
    recent: { id: string; tutorName: string; studentName: string; subject?: string; date: string; startTime?: string; endTime?: string; status: string }[];
  };
  payments: { totalSpent: number; recent: any[] };
  reports: { total: number; recent: any[] };
}

interface UserFamilyOverviewProps {
  session: any;
  userId: string;
}

const bookingStatusColor: Record<string, string> = {
  confirmed: 'bg-blue-50 text-blue-700 border-blue-200',
  completed: 'bg-green-50 text-green-700 border-green-200',
  cancelled: 'bg-gray-100 text-gray-500 border-gray-200',
  rescheduled: 'bg-amber-50 text-amber-700 border-amber-200',
};

export function UserFamilyOverview({ session, userId }: UserFamilyOverviewProps) {
  const [data, setData] = useState<FamilyOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [viewingReport, setViewingReport] = useState<any>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    fetch(
      `https://${projectId}.supabase.co/functions/v1/make-server-cbd74580/admin/users/${userId}/family-overview`,
      { headers: { Authorization: `Bearer ${session.access_token}` } },
    )
      .then(async (res) => {
        if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Failed to load');
        return res.json();
      })
      .then((d) => { if (!cancelled) setData(d); })
      .catch((e) => { if (!cancelled) setError(e.message || 'Failed to load overview'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [userId, session.access_token]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-gray-500 py-4">
        <Loader2 className="w-4 h-4 animate-spin" /> Loading family overview…
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center gap-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-3">
        <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
      </div>
    );
  }

  if (!data) return null;

  const formatDate = (value?: string) => {
    if (!value) return '—';
    const d = new Date(value);
    return isNaN(d.getTime()) ? '—' : d.toLocaleDateString(undefined, { dateStyle: 'medium' });
  };

  return (
    <div>
      <Accordion type="multiple" defaultValue={['children', 'bookings']} className="border rounded-lg px-3">
        <AccordionItem value="children">
          <AccordionTrigger>
            <span className="flex items-center gap-2">
              <Baby className="w-4 h-4" style={{ color: '#625d9c' }} />
              Children <Badge variant="outline">{data.children.length}</Badge>
            </span>
          </AccordionTrigger>
          <AccordionContent>
            {data.children.length === 0 ? (
              <p className="text-sm text-gray-500">No children on file.</p>
            ) : (
              <div className="space-y-2">
                {data.children.map((child) => (
                  <div key={child.id} className="flex items-center justify-between p-2.5 bg-gray-50 rounded-lg text-sm">
                    <div>
                      <span className="font-medium">{child.firstName} {child.lastName}</span>
                      {child.age != null && <span className="text-gray-500"> · Age {child.age}</span>}
                      {child.gradeLevel && <span className="text-gray-500"> · {child.gradeLevel}</span>}
                    </div>
                    {child.subjects && child.subjects.length > 0 && (
                      <div className="flex gap-1 flex-wrap justify-end">
                        {child.subjects.slice(0, 3).map((s) => (
                          <Badge key={s} variant="outline" className="text-xs">{s}</Badge>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="bookings">
          <AccordionTrigger>
            <span className="flex items-center gap-2">
              <Calendar className="w-4 h-4" style={{ color: '#625d9c' }} />
              Bookings <Badge variant="outline">{data.bookings.total}</Badge>
            </span>
          </AccordionTrigger>
          <AccordionContent>
            <div className="flex gap-4 text-xs text-gray-500 mb-3">
              <span>{data.bookings.upcoming} upcoming</span>
              <span>{data.bookings.completed} completed</span>
              <span>{data.bookings.cancelled} cancelled</span>
            </div>
            {data.bookings.recent.length === 0 ? (
              <p className="text-sm text-gray-500">No bookings yet.</p>
            ) : (
              <div className="space-y-2">
                {data.bookings.recent.map((b) => (
                  <div key={b.id} className="flex items-center justify-between p-2.5 bg-gray-50 rounded-lg text-sm">
                    <div className="min-w-0">
                      <span className="font-medium">{b.studentName}</span>
                      <span className="text-gray-500"> with {b.tutorName}</span>
                      {b.subject && <span className="text-gray-500"> · {b.subject}</span>}
                      <p className="text-xs text-gray-400">{formatDate(b.date)}{b.startTime ? ` at ${b.startTime}` : ''}</p>
                    </div>
                    <Badge variant="outline" className={`text-xs capitalize flex-shrink-0 ${bookingStatusColor[b.status] || ''}`}>
                      {b.status}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="payments">
          <AccordionTrigger>
            <span className="flex items-center gap-2">
              <CreditCard className="w-4 h-4" style={{ color: '#625d9c' }} />
              Payments <Badge variant="outline">{formatNaira(data.payments.totalSpent)} total</Badge>
            </span>
          </AccordionTrigger>
          <AccordionContent>
            {data.payments.recent.length === 0 ? (
              <p className="text-sm text-gray-500">No payments on file.</p>
            ) : (
              <div className="space-y-2">
                {data.payments.recent.map((p: any) => (
                  <div key={p.id} className="flex items-center justify-between p-2.5 bg-gray-50 rounded-lg text-sm">
                    <div>
                      <span className="font-medium">{formatNaira(p.amount)}</span>
                      {p.planType && <span className="text-gray-500"> · {p.planType}</span>}
                      <p className="text-xs text-gray-400">{formatDate(p.createdAt)}</p>
                    </div>
                    <Badge variant="outline" className="text-xs capitalize">{p.status}</Badge>
                  </div>
                ))}
              </div>
            )}
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="reports">
          <AccordionTrigger>
            <span className="flex items-center gap-2">
              <FileText className="w-4 h-4" style={{ color: '#625d9c' }} />
              Session Reports <Badge variant="outline">{data.reports.total}</Badge>
            </span>
          </AccordionTrigger>
          <AccordionContent>
            {data.reports.recent.length === 0 ? (
              <p className="text-sm text-gray-500">No session reports yet.</p>
            ) : (
              <div className="space-y-2">
                {data.reports.recent.map((r: any) => (
                  <div key={r.id} className="flex items-center justify-between p-2.5 bg-gray-50 rounded-lg text-sm">
                    <div>
                      <span className="font-medium">{r.studentName}</span>
                      <span className="text-gray-500"> with {r.tutorName}</span>
                      {r.subject && <span className="text-gray-500"> · {r.subject}</span>}
                      <p className="text-xs text-gray-400">{formatDate(r.submittedAt)}</p>
                    </div>
                    <Button size="sm" variant="outline" onClick={() => setViewingReport(r)}>
                      <Eye className="w-3.5 h-3.5 mr-1.5" /> View
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      {viewingReport && (
        <ViewSessionReport
          open
          onOpenChange={(isOpen) => { if (!isOpen) setViewingReport(null); }}
          session={session}
          userRole="admin"
          booking={{
            date: viewingReport.sessionDate,
            startTime: viewingReport.startTime,
            endTime: viewingReport.endTime,
            studentName: viewingReport.studentName,
          }}
          report={viewingReport}
        />
      )}
    </div>
  );
}
