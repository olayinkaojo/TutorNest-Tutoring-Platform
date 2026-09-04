import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '../ui/dialog';
import { MessageSquare, Search, RefreshCw, AlertCircle, Flag, ShieldAlert } from 'lucide-react';
import { projectId } from '../../utils/supabase/info';

interface Participant {
  id: string;
  name: string;
  role: string;
}

interface ConversationRow {
  id: string;
  channel: string | null;
  participants: Participant[];
  messageCount: number;
  flaggedCount: number;
  lastMessageAt: string;
  lastMessagePreview: string | null;
  createdAt: string;
}

interface TranscriptMessage {
  id: string;
  senderId: string;
  senderName: string;
  content: string;
  createdAt: string;
  reportedByUserId?: string;
  reportReason?: string;
  reportedAt?: string;
}

interface ChatSafeguardingViewerProps {
  accessToken: string;
}

export function ChatSafeguardingViewer({ accessToken }: ChatSafeguardingViewerProps) {
  const [conversations, setConversations] = useState<ConversationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [flaggedOnly, setFlaggedOnly] = useState(false);

  const [openConversation, setOpenConversation] = useState<ConversationRow | null>(null);
  const [transcript, setTranscript] = useState<TranscriptMessage[]>([]);
  const [transcriptLoading, setTranscriptLoading] = useState(false);
  const [transcriptError, setTranscriptError] = useState('');

  const fetchConversations = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-cbd74580/admin/conversations`,
        { headers: { Authorization: `Bearer ${accessToken}` } },
      );
      if (response.ok) {
        const data = await response.json();
        setConversations(data.conversations || []);
      } else {
        const err = await response.json().catch(() => ({}));
        setError(err.error || 'Failed to load conversations');
      }
    } catch (err) {
      console.error('Error loading conversations:', err);
      setError('Failed to load conversations');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchConversations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openTranscript = async (conv: ConversationRow) => {
    setOpenConversation(conv);
    setTranscript([]);
    setTranscriptError('');
    setTranscriptLoading(true);
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-cbd74580/admin/conversations/${encodeURIComponent(conv.id)}/messages`,
        { headers: { Authorization: `Bearer ${accessToken}` } },
      );
      if (response.ok) {
        const data = await response.json();
        setTranscript(data.messages || []);
      } else {
        const err = await response.json().catch(() => ({}));
        setTranscriptError(err.error || 'Failed to load transcript');
      }
    } catch (err) {
      console.error('Error loading transcript:', err);
      setTranscriptError('Failed to load transcript');
    } finally {
      setTranscriptLoading(false);
    }
  };

  const formatDate = (dateString: string | undefined): string => {
    if (!dateString) return '—';
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
  };

  const filteredConversations = conversations.filter((conv) => {
    if (flaggedOnly && conv.flaggedCount === 0) return false;
    const q = searchTerm.trim().toLowerCase();
    if (!q) return true;
    return conv.participants.some((p) => p.name.toLowerCase().includes(q));
  });

  const totalFlagged = conversations.reduce((sum, c) => sum + c.flaggedCount, 0);

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
          Retained for safeguarding and investigation only. Opening a transcript logs an access record against
          every participant's account, visible in the Audit Log.
        </p>
      </div>

      {/* Summary */}
      <div className="grid md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Conversations</p>
                <h2 className="text-2xl font-bold mt-2">{conversations.length}</h2>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <MessageSquare className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Messages</p>
                <h2 className="text-2xl font-bold mt-2">{conversations.reduce((s, c) => s + c.messageCount, 0)}</h2>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <MessageSquare className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Flagged messages</p>
                <h2 className="text-2xl font-bold mt-2">{totalFlagged}</h2>
              </div>
              <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                <Flag className="w-6 h-6 text-red-600" />
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
                placeholder="Search by participant name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <Button
              variant={flaggedOnly ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFlaggedOnly((v) => !v)}
              className="gap-2"
            >
              <Flag className="w-4 h-4" />
              Flagged only
            </Button>
            <Button variant="outline" size="sm" className="gap-2" onClick={() => void fetchConversations()} disabled={loading}>
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Conversations Table */}
      <Card>
        <CardHeader>
          <CardTitle>Conversations</CardTitle>
          <CardDescription>
            Every in-app conversation between a parent, tutor, or student with an active booking connection.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-gray-500">Loading conversations…</div>
          ) : filteredConversations.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <MessageSquare className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>No conversations found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Participants</TableHead>
                    <TableHead>Channel</TableHead>
                    <TableHead>Messages</TableHead>
                    <TableHead>Flagged</TableHead>
                    <TableHead>Last activity</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredConversations.map((conv) => (
                    <TableRow key={conv.id} className="cursor-pointer hover:bg-gray-50" onClick={() => void openTranscript(conv)}>
                      <TableCell>
                        <div className="flex flex-col gap-0.5">
                          {conv.participants.map((p) => (
                            <span key={p.id} className="text-sm">
                              {p.name} <span className="text-xs text-gray-400 capitalize">({p.role})</span>
                            </span>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>
                        {conv.channel ? (
                          <Badge variant="outline" className="text-xs capitalize">{conv.channel.replace('-', ' ↔ ')}</Badge>
                        ) : (
                          '—'
                        )}
                      </TableCell>
                      <TableCell className="text-sm">{conv.messageCount}</TableCell>
                      <TableCell>
                        {conv.flaggedCount > 0 ? (
                          <Badge style={{ backgroundColor: '#dc2626', color: 'white' }} className="gap-1">
                            <Flag className="w-3 h-3" />
                            {conv.flaggedCount}
                          </Badge>
                        ) : (
                          <span className="text-xs text-gray-400">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-gray-600 whitespace-nowrap">
                        {formatDate(conv.lastMessageAt)}
                      </TableCell>
                      <TableCell>
                        <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); void openTranscript(conv); }}>
                          View transcript
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

      {/* Transcript Dialog */}
      <Dialog open={!!openConversation} onOpenChange={(open) => !open && setOpenConversation(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {openConversation?.participants.map((p) => p.name).join(' ↔ ')}
            </DialogTitle>
            <DialogDescription>
              Full message transcript. This access has been logged.
            </DialogDescription>
          </DialogHeader>

          {transcriptLoading ? (
            <div className="text-center py-8 text-gray-500">Loading transcript…</div>
          ) : transcriptError ? (
            <div className="flex items-center gap-2 text-red-700 bg-red-50 border border-red-200 rounded-lg p-3 text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {transcriptError}
            </div>
          ) : transcript.length === 0 ? (
            <p className="text-center py-8 text-gray-500 text-sm">No messages in this conversation.</p>
          ) : (
            <div className="space-y-3">
              {transcript.map((msg) => (
                <div key={msg.id} className={`p-3 rounded-lg border ${msg.reportedByUserId ? 'border-red-200 bg-red-50' : 'border-gray-100 bg-gray-50'}`}>
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="text-sm font-medium">{msg.senderName}</span>
                    <span className="text-xs text-gray-400 whitespace-nowrap">{formatDate(msg.createdAt)}</span>
                  </div>
                  <p className="text-sm text-gray-800 whitespace-pre-wrap break-words">{msg.content}</p>
                  {msg.reportedByUserId && (
                    <div className="mt-2 flex items-center gap-1.5 text-xs text-red-700">
                      <Flag className="w-3 h-3" />
                      Reported{msg.reportReason ? `: ${msg.reportReason}` : ''}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
