import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { AlertTriangle, CheckCircle, XCircle, Eye, Flag } from 'lucide-react';
import { projectId } from '../utils/supabase/info';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';

interface ModerationItem {
  id: string;
  userId: string;
  content: string;
  type: string;
  contextId?: string;
  violations: string[];
  severity: 'low' | 'medium' | 'high';
  status: string;
  timestamp: string;
  reviewedBy?: string;
  reviewedAt?: string;
  outcome?: string;
}

interface ModerationQueueProps {
  session: any;
}

export function ModerationQueue({ session }: ModerationQueueProps) {
  const [items, setItems] = useState<ModerationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<ModerationItem | null>(null);
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [reviewNotes, setReviewNotes] = useState('');
  const [reviewOutcome, setReviewOutcome] = useState('');
  const [actionTaken, setActionTaken] = useState('');

  useEffect(() => {
    fetchItems();
  }, []);

  const fetchItems = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-cbd74580/moderation/queue?status=all`,
        {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        }
      );

      if (!response.ok) throw new Error('Failed to fetch moderation queue');

      const data = await response.json();
      setItems(data.items || []);
    } catch (err) {
      console.error('Error fetching moderation queue:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleReview = async () => {
    if (!selectedItem || !reviewOutcome || !actionTaken) return;

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-cbd74580/moderation/queue/${selectedItem.id}/review`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            outcome: reviewOutcome,
            reviewerId: session.user.id,
            notes: reviewNotes,
            actionTaken,
          }),
        }
      );

      if (!response.ok) throw new Error('Failed to review item');

      setReviewDialogOpen(false);
      setSelectedItem(null);
      setReviewNotes('');
      setReviewOutcome('');
      setActionTaken('');
      fetchItems();
    } catch (err) {
      console.error('Error reviewing item:', err);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'medium':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'blocked':
        return <Badge variant="destructive">Blocked</Badge>;
      case 'flagged':
        return <Badge variant="secondary" className="bg-amber-100 text-amber-800">Flagged</Badge>;
      case 'reviewed':
        return <Badge variant="secondary">Reviewed</Badge>;
      default:
        return <Badge>Unknown</Badge>;
    }
  };

  const pendingItems = items.filter(i => i.status !== 'reviewed');
  const reviewedItems = items.filter(i => i.status === 'reviewed');

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Flag className="w-5 h-5" />
            Content Moderation Queue
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="pending">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="pending">
                Pending ({pendingItems.length})
              </TabsTrigger>
              <TabsTrigger value="reviewed">
                Reviewed ({reviewedItems.length})
              </TabsTrigger>
              <TabsTrigger value="all">
                All ({items.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="pending" className="space-y-4">
              {loading ? (
                <div className="text-center py-8 text-gray-500">Loading...</div>
              ) : pendingItems.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <CheckCircle className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p>No pending items</p>
                </div>
              ) : (
                pendingItems.map((item) => (
                  <Card key={item.id} className={`border-2 ${getSeverityColor(item.severity)}`}>
                    <CardContent className="pt-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">{item.type}</Badge>
                          {getStatusBadge(item.status)}
                          <Badge className={getSeverityColor(item.severity)}>
                            {item.severity} severity
                          </Badge>
                        </div>
                        <Button
                          size="sm"
                          onClick={() => {
                            setSelectedItem(item);
                            setReviewDialogOpen(true);
                          }}
                        >
                          <Eye className="w-4 h-4 mr-2" />
                          Review
                        </Button>
                      </div>

                      <div className="mb-4">
                        <p className="text-sm text-gray-600 mb-2">Content:</p>
                        <div className="bg-white p-3 rounded border">
                          <p className="text-sm">{item.content}</p>
                        </div>
                      </div>

                      <div className="mb-4">
                        <p className="text-sm text-gray-600 mb-2">Violations:</p>
                        <div className="flex flex-wrap gap-2">
                          {item.violations.map((violation, idx) => (
                            <Badge key={idx} variant="destructive" className="text-xs">
                              <AlertTriangle className="w-3 h-3 mr-1" />
                              {violation}
                            </Badge>
                          ))}
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <span>User ID: {item.userId}</span>
                        <span>{new Date(item.timestamp).toLocaleString()}</span>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </TabsContent>

            <TabsContent value="reviewed" className="space-y-4">
              {reviewedItems.length === 0 ? (
                <div className="text-center py-8 text-gray-500">No reviewed items</div>
              ) : (
                reviewedItems.map((item) => (
                  <Card key={item.id} className="opacity-75">
                    <CardContent className="pt-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">{item.type}</Badge>
                          {getStatusBadge(item.status)}
                          <Badge className="bg-green-100 text-green-800">
                            {item.outcome || 'Resolved'}
                          </Badge>
                        </div>
                      </div>

                      <div className="mb-4">
                        <p className="text-sm font-medium mb-1">Content:</p>
                        <p className="text-sm text-gray-600 line-clamp-2">{item.content}</p>
                      </div>

                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <span>Reviewed {new Date(item.reviewedAt!).toLocaleString()}</span>
                        <span>By: {item.reviewedBy}</span>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </TabsContent>

            <TabsContent value="all" className="space-y-4">
              {items.map((item) => (
                <Card key={item.id} className={item.status === 'reviewed' ? 'opacity-75' : ''}>
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{item.type}</Badge>
                        {getStatusBadge(item.status)}
                        <Badge className={getSeverityColor(item.severity)}>
                          {item.severity}
                        </Badge>
                      </div>
                      {item.status !== 'reviewed' && (
                        <Button
                          size="sm"
                          onClick={() => {
                            setSelectedItem(item);
                            setReviewDialogOpen(true);
                          }}
                        >
                          Review
                        </Button>
                      )}
                    </div>

                    <p className="text-sm text-gray-600 line-clamp-2 mb-2">{item.content}</p>

                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span>{new Date(item.timestamp).toLocaleString()}</span>
                      <span>User: {item.userId}</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <Dialog open={reviewDialogOpen} onOpenChange={setReviewDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Review Content</DialogTitle>
            <DialogDescription>
              Review this content and decide on appropriate action.
            </DialogDescription>
          </DialogHeader>

          {selectedItem && (
            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium mb-2">Content:</p>
                <div className="bg-gray-50 p-4 rounded border">
                  <p className="text-sm">{selectedItem.content}</p>
                </div>
              </div>

              <div>
                <p className="text-sm font-medium mb-2">Violations Detected:</p>
                <div className="flex flex-wrap gap-2">
                  {selectedItem.violations.map((violation, idx) => (
                    <Badge key={idx} variant="destructive">
                      {violation}
                    </Badge>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-sm font-medium mb-2">Review Outcome:</p>
                <Select value={reviewOutcome} onValueChange={setReviewOutcome}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select outcome" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="violation-confirmed">Violation Confirmed</SelectItem>
                    <SelectItem value="false-positive">False Positive</SelectItem>
                    <SelectItem value="needs-context">Needs Context</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <p className="text-sm font-medium mb-2">Action Taken:</p>
                <Select value={actionTaken} onValueChange={setActionTaken}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select action" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="no-action">No Action</SelectItem>
                    <SelectItem value="warning">Warning Issued</SelectItem>
                    <SelectItem value="content-removed">Content Removed</SelectItem>
                    <SelectItem value="strike-issued">Strike Issued</SelectItem>
                    <SelectItem value="suspension">Account Suspended</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <p className="text-sm font-medium mb-2">Review Notes:</p>
                <Textarea
                  placeholder="Add any additional notes..."
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  rows={4}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setReviewDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleReview} disabled={!reviewOutcome || !actionTaken}>
              Submit Review
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
