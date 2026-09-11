import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Badge } from '../ui/badge';
import { projectId } from '../../utils/supabase/info';

// Mirrors ActivityCategory / ACTIVITY_CATEGORY_LABELS in
// supabase/functions/make-server-cbd74580/activity-log.tsx — kept in sync by
// hand rather than imported, since that file is Deno backend code (npm:
// specifiers, Deno.env) and can't be pulled into the Vite frontend bundle.
type ActivityCategory =
  | 'account'
  | 'payments'
  | 'bookings'
  | 'disputes'
  | 'coupons'
  | 'subscriptions'
  | 'moderation'
  | 'content'
  | 'tax'
  | 'verification';

const ACTIVITY_CATEGORY_LABELS: Record<ActivityCategory, string> = {
  account: 'Account & Access',
  payments: 'Payments & Payouts',
  bookings: 'Bookings',
  disputes: 'Disputes',
  coupons: 'Coupons & Credits',
  subscriptions: 'Subscriptions',
  moderation: 'Moderation',
  content: 'Content',
  tax: 'Tax & Invoicing',
  verification: 'Verification',
};

interface AuditEntry {
  id: string;
  actorId: string;
  actorEmail: string | null;
  action: string;
  category: ActivityCategory;
  targetType: string | null;
  targetId: string | null;
  details: Record<string, unknown>;
  createdAt: string;
}

interface AuditLogViewerProps {
  accessToken: string;
}

const ACTION_COLORS: Record<string, string> = {
  tutor_verified: 'bg-green-100 text-green-800',
  tutor_rejected: 'bg-red-100 text-red-800',
  user_status_changed_to_suspended: 'bg-orange-100 text-orange-800',
  user_status_changed_to_banned: 'bg-red-100 text-red-800',
  user_status_changed_to_active: 'bg-green-100 text-green-800',
  user_status_changed_to_deleted: 'bg-gray-100 text-gray-800',
  account_deleted: 'bg-red-100 text-red-800',
  payout_processed: 'bg-green-100 text-green-800',
  refund_requested: 'bg-orange-100 text-orange-800',
  dispute_created: 'bg-orange-100 text-orange-800',
  dispute_resolved: 'bg-green-100 text-green-800',
};

// 'all' is a synthetic tab, not a real ActivityCategory.
const CATEGORY_TABS: Array<{ value: 'all' | ActivityCategory; label: string }> = [
  { value: 'all', label: 'All' },
  ...(Object.entries(ACTIVITY_CATEGORY_LABELS) as [ActivityCategory, string][]).map(([value, label]) => ({
    value,
    label,
  })),
];

function AuditLogTable({ logs }: { logs: AuditEntry[] }) {
  if (logs.length === 0) {
    return <p className="text-gray-500 text-center py-8">No activity recorded in this category yet.</p>;
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left text-gray-600">
            <th className="pb-2 pr-4 font-medium">Time</th>
            <th className="pb-2 pr-4 font-medium">Actor</th>
            <th className="pb-2 pr-4 font-medium">Action</th>
            <th className="pb-2 pr-4 font-medium">Target</th>
            <th className="pb-2 font-medium">Details</th>
          </tr>
        </thead>
        <tbody>
          {logs.map((log) => (
            <tr key={log.id} className="border-b hover:bg-gray-50">
              <td className="py-2 pr-4 text-gray-500 whitespace-nowrap">
                {new Date(log.createdAt).toLocaleString('en-GB', {
                  day: '2-digit',
                  month: 'short',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </td>
              <td className="py-2 pr-4 truncate max-w-[140px]">
                {log.actorEmail || log.actorId.slice(0, 8) + '…'}
              </td>
              <td className="py-2 pr-4">
                <span
                  className={`px-2 py-0.5 rounded-full text-xs font-medium ${ACTION_COLORS[log.action] || 'bg-gray-100 text-gray-700'}`}
                >
                  {log.action.replace(/_/g, ' ')}
                </span>
              </td>
              <td className="py-2 pr-4 text-gray-600">
                {log.targetType && <span className="font-medium">{log.targetType}</span>}
                {log.targetId && (
                  <span className="text-gray-400 ml-1 text-xs">
                    ({log.targetId.slice(0, 8)}…)
                  </span>
                )}
              </td>
              <td className="py-2 text-gray-500 text-xs">
                {Object.keys(log.details).length > 0
                  ? JSON.stringify(log.details).slice(0, 80)
                  : '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function AuditLogViewer({ accessToken }: AuditLogViewerProps) {
  const [logs, setLogs] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | ActivityCategory>('all');

  useEffect(() => {
    fetch(
      `https://${projectId}.supabase.co/functions/v1/make-server-cbd74580/admin/audit-log`,
      { headers: { Authorization: `Bearer ${accessToken}` } },
    )
      .then((r) => r.json())
      .then((data) => {
        if (data.logs) setLogs(data.logs);
        else setError(data.error || 'Failed to load audit log');
      })
      .catch(() => setError('Failed to load audit log'))
      .finally(() => setLoading(false));
  }, [accessToken]);

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6 text-center text-gray-500">Loading audit log…</CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="pt-6 text-center text-red-500">{error}</CardContent>
      </Card>
    );
  }

  const countFor = (category: 'all' | ActivityCategory) =>
    category === 'all' ? logs.length : logs.filter((l) => l.category === category).length;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Admin Audit Log</CardTitle>
        <CardDescription>Record of admin and account activity across the platform (most recent first)</CardDescription>
      </CardHeader>
      <CardContent>
        <Select value={activeTab} onValueChange={(v) => setActiveTab(v as 'all' | ActivityCategory)}>
          <SelectTrigger className="w-full sm:w-72">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {CATEGORY_TABS.map(({ value, label }) => (
              <SelectItem key={value} value={value}>
                <span className="flex items-center justify-between gap-2 w-full">
                  {label}
                  <Badge variant="secondary" className="px-1.5 text-xs">
                    {countFor(value)}
                  </Badge>
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="mt-4">
          <AuditLogTable logs={activeTab === 'all' ? logs : logs.filter((l) => l.category === activeTab)} />
        </div>
      </CardContent>
    </Card>
  );
}
