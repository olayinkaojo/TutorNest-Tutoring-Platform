import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Upload, Download, Trash2, RefreshCw, AlertCircle, Search } from 'lucide-react';
import { projectId } from '../../utils/supabase/info';

interface AuditEvent {
  id: string;
  documentId: string;
  documentTitle: string;
  fileName: string;
  documentType: string;
  action: 'uploaded' | 'downloaded' | 'deleted';
  actorName: string;
  actorRole: string;
  sender: string;
  senderRole: string;
  recipient: string;
  recipientType: string;
  timestamp: string;
}

interface DocumentAuditTrailProps {
  accessToken: string;
}

const ACTION_CONFIG: Record<AuditEvent['action'], { label: string; color: string; icon: React.ReactNode }> = {
  uploaded: { label: 'Uploaded', color: '#2563eb', icon: <Upload className="w-3 h-3" /> },
  downloaded: { label: 'Downloaded', color: '#16a34a', icon: <Download className="w-3 h-3" /> },
  deleted: { label: 'Deleted', color: '#dc2626', icon: <Trash2 className="w-3 h-3" /> },
};

export function DocumentAuditTrail({ accessToken }: DocumentAuditTrailProps) {
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [actionFilter, setActionFilter] = useState<'all' | AuditEvent['action']>('all');

  const fetchEvents = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-cbd74580/admin/documents/audit-trail`,
        { headers: { Authorization: `Bearer ${accessToken}` } },
      );
      if (response.ok) {
        const data = await response.json();
        setEvents(data.events || []);
      } else {
        const err = await response.json().catch(() => ({}));
        setError(err.error || 'Failed to load document audit trail');
      }
    } catch (err) {
      console.error('Error loading document audit trail:', err);
      setError('Failed to load document audit trail');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchEvents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const formatDate = (dateString: string): string => {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
  };

  const filteredEvents = events.filter((event) => {
    const matchesAction = actionFilter === 'all' || event.action === actionFilter;
    const q = searchTerm.trim().toLowerCase();
    const matchesSearch =
      !q ||
      event.documentTitle.toLowerCase().includes(q) ||
      event.fileName.toLowerCase().includes(q) ||
      event.sender.toLowerCase().includes(q) ||
      event.recipient.toLowerCase().includes(q) ||
      event.actorName.toLowerCase().includes(q);
    return matchesAction && matchesSearch;
  });

  const counts = {
    uploaded: events.filter((e) => e.action === 'uploaded').length,
    downloaded: events.filter((e) => e.action === 'downloaded').length,
    deleted: events.filter((e) => e.action === 'deleted').length,
  };

  return (
    <div className="space-y-6">
      {error && (
        <div className="flex items-center gap-2 text-red-700 bg-red-50 border border-red-200 rounded-lg p-3 text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Summary */}
      <div className="grid md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Uploads</p>
                <h2 className="text-2xl font-bold mt-2">{counts.uploaded}</h2>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <Upload className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Downloads</p>
                <h2 className="text-2xl font-bold mt-2">{counts.downloaded}</h2>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <Download className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Deletions</p>
                <h2 className="text-2xl font-bold mt-2">{counts.deleted}</h2>
                <p className="text-xs text-gray-500 mt-1">File kept, hidden from lists</p>
              </div>
              <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                <Trash2 className="w-6 h-6 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search & Filter */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4 flex-wrap">
            <div className="flex-1 min-w-64 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search by document, sender, or recipient..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex gap-2 flex-wrap">
              {(['all', 'uploaded', 'downloaded', 'deleted'] as const).map((action) => (
                <Button
                  key={action}
                  variant={actionFilter === action ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setActionFilter(action)}
                >
                  {action === 'all' ? 'All' : ACTION_CONFIG[action].label}
                </Button>
              ))}
              <Button variant="outline" size="sm" className="gap-2" onClick={() => void fetchEvents()} disabled={loading}>
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Events Table */}
      <Card>
        <CardHeader>
          <CardTitle>Document Exchange Log</CardTitle>
          <CardDescription>
            Every upload, download, and deletion across the platform. Deleting a document hides it from the
            uploader's list but keeps the file and this record — nothing here is ever removed.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-gray-500">Loading activity…</div>
          ) : filteredEvents.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <AlertCircle className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>No activity found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Action</TableHead>
                    <TableHead>Document</TableHead>
                    <TableHead>Sender</TableHead>
                    <TableHead>Recipient</TableHead>
                    <TableHead>By</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEvents.map((event) => {
                    const config = ACTION_CONFIG[event.action];
                    return (
                      <TableRow key={event.id}>
                        <TableCell>
                          <Badge style={{ backgroundColor: config.color, color: 'white' }} className="gap-1">
                            {config.icon}
                            {config.label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <p className="font-medium text-sm truncate max-w-56">{event.documentTitle}</p>
                          <p className="text-xs text-gray-500">
                            {event.documentType || '—'}{event.fileName ? ` · ${event.fileName}` : ''}
                          </p>
                        </TableCell>
                        <TableCell className="text-sm">
                          {event.sender}
                          {event.senderRole && (
                            <Badge variant="outline" className="ml-2 text-xs">{event.senderRole}</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-sm">
                          {event.recipient}
                          {event.recipientType && event.recipient !== '—' && (
                            <Badge variant="outline" className="ml-2 text-xs">{event.recipientType}</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-gray-600">{event.actorName}</TableCell>
                        <TableCell className="text-sm text-gray-600 whitespace-nowrap">
                          {formatDate(event.timestamp)}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
