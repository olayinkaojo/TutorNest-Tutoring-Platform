import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from './ui/dialog';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { AlertTriangle, Clock, CheckCircle, XCircle, FileText, Users } from 'lucide-react';
import { projectId } from '../utils/supabase/info';

interface Dispute {
  id: string;
  type: string;
  sessionId: string | null;
  submittedBy: string;
  submittedByRole: string;
  submittedAgainst: string;
  submittedAgainstRole: string;
  description: string;
  status: string;
  outcome: string | null;
  outcomeDetails: string | null;
  createdAt: string;
  resolvedAt: string | null;
  slaDeadline: string;
  notes: Array<{ text: string; addedBy: string; addedAt: string }>;
}

interface AdminDisputeHandlerProps {
  accessToken: string;
  adminId: string;
}

export function AdminDisputeHandler({ accessToken, adminId }: AdminDisputeHandlerProps) {
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDispute, setSelectedDispute] = useState<Dispute | null>(null);
  const [showResolveDialog, setShowResolveDialog] = useState(false);
  const [resolveForm, setResolveForm] = useState({
    status: '',
    outcome: '',
    outcomeDetails: '',
    note: '',
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadDisputes();
  }, []);

  const loadDisputes = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-cbd74580/disputes?userId=${adminId}&role=admin`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      const data = await response.json();
      if (response.ok) {
        setDisputes(data.disputes || []);
      }
    } catch (error) {
      console.error('Error loading disputes:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleResolveDispute = async () => {
    if (!resolveForm.status || !resolveForm.outcome) {
      alert('Please select status and outcome');
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-cbd74580/disputes/${selectedDispute?.id}`,
        {
          method: 'PATCH',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            ...resolveForm,
            addedBy: adminId,
          }),
        }
      );

      if (response.ok) {
        alert('Dispute updated successfully');
        setShowResolveDialog(false);
        setSelectedDispute(null);
        setResolveForm({
          status: '',
          outcome: '',
          outcomeDetails: '',
          note: '',
        });
        loadDisputes();
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to update dispute');
      }
    } catch (error) {
      console.error('Error updating dispute:', error);
      alert('Failed to update dispute');
    } finally {
      setSubmitting(false);
    }
  };

  const openResolveDialog = (dispute: Dispute) => {
    setSelectedDispute(dispute);
    setResolveForm({
      status: dispute.status,
      outcome: dispute.outcome || '',
      outcomeDetails: dispute.outcomeDetails || '',
      note: '',
    });
    setShowResolveDialog(true);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-300"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
      case 'in-review':
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-300"><FileText className="w-3 h-3 mr-1" />In Review</Badge>;
      case 'resolved':
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300"><CheckCircle className="w-3 h-3 mr-1" />Resolved</Badge>;
      case 'closed':
        return <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-300"><XCircle className="w-3 h-3 mr-1" />Closed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getTypeBadge = (type: string) => {
    const colors: any = {
      'no-show': 'bg-red-100 text-red-700',
      'quality': 'bg-orange-100 text-orange-700',
      'payment': 'bg-purple-100 text-purple-700',
      'behavior': 'bg-pink-100 text-pink-700',
      'other': 'bg-gray-100 text-gray-700',
    };
    return <Badge className={colors[type] || colors.other}>{type}</Badge>;
  };

  const getSLAStatus = (deadline: string) => {
    const now = new Date();
    const slaDate = new Date(deadline);
    const hoursRemaining = (slaDate.getTime() - now.getTime()) / (1000 * 60 * 60);

    if (hoursRemaining < 0) {
      return <span className="text-xs text-red-600 font-medium">⚠️ SLA Overdue</span>;
    } else if (hoursRemaining < 24) {
      return <span className="text-xs text-orange-600 font-medium">⚠️ {Math.floor(hoursRemaining)}h remaining</span>;
    } else {
      return <span className="text-xs text-gray-500">{Math.floor(hoursRemaining / 24)}d remaining</span>;
    }
  };

  const filterDisputesByStatus = (status: string) => {
    if (status === 'all') return disputes;
    return disputes.filter(d => d.status === status);
  };

  const DisputeCard = ({ dispute }: { dispute: Dispute }) => (
    <Card className="border-l-4" style={{ borderLeftColor: dispute.status === 'resolved' ? '#5d9827' : '#625d9c' }}>
      <CardContent className="pt-6">
        <div className="flex items-start justify-between mb-3">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              {getTypeBadge(dispute.type)}
              {getStatusBadge(dispute.status)}
            </div>
            <div className="text-xs text-gray-500">
              <Users className="w-3 h-3 inline mr-1" />
              <strong>{dispute.submittedByRole}</strong> vs <strong>{dispute.submittedAgainstRole}</strong>
            </div>
          </div>
          <div className="text-right space-y-1">
            {dispute.status !== 'resolved' && dispute.status !== 'closed' && (
              <div>{getSLAStatus(dispute.slaDeadline)}</div>
            )}
            <div className="text-xs text-gray-500">
              Filed {new Date(dispute.createdAt).toLocaleDateString('en-GB')}
            </div>
          </div>
        </div>

        <p className="text-sm text-gray-700 mb-3">{dispute.description}</p>

        {dispute.sessionId && (
          <div className="text-xs text-gray-500 mb-3">
            Session ID: <code className="bg-gray-100 px-2 py-1 rounded">{dispute.sessionId}</code>
          </div>
        )}

        {dispute.notes && dispute.notes.length > 0 && (
          <div className="mb-3 p-3 bg-gray-50 rounded-lg">
            <p className="text-xs text-gray-600 mb-2"><strong>Notes:</strong></p>
            {dispute.notes.map((note, idx) => (
              <div key={idx} className="text-xs text-gray-600 mb-1">
                • {note.text} <span className="text-gray-400">({new Date(note.addedAt).toLocaleDateString('en-GB')})</span>
              </div>
            ))}
          </div>
        )}

        {dispute.outcome && (
          <div className="mb-3 p-3 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-sm mb-1"><strong>Outcome:</strong> {dispute.outcome}</p>
            {dispute.outcomeDetails && (
              <p className="text-sm text-gray-600">{dispute.outcomeDetails}</p>
            )}
            {dispute.resolvedAt && (
              <p className="text-xs text-gray-500 mt-2">
                Resolved on {new Date(dispute.resolvedAt).toLocaleDateString('en-GB')}
              </p>
            )}
          </div>
        )}

        <div className="flex justify-end">
          <Button
            size="sm"
            onClick={() => openResolveDialog(dispute)}
            style={{ backgroundColor: '#625d9c', color: 'white' }}
          >
            {dispute.status === 'resolved' ? 'View Details' : 'Resolve'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  if (loading) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <div className="w-8 h-8 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-500">Loading disputes...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Dispute Management</CardTitle>
          <CardDescription>Review and resolve user disputes</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="pending">
            <TabsList className="mb-4">
              <TabsTrigger value="pending">Pending ({filterDisputesByStatus('pending').length})</TabsTrigger>
              <TabsTrigger value="in-review">In Review ({filterDisputesByStatus('in-review').length})</TabsTrigger>
              <TabsTrigger value="resolved">Resolved ({filterDisputesByStatus('resolved').length})</TabsTrigger>
              <TabsTrigger value="all">All ({disputes.length})</TabsTrigger>
            </TabsList>

            <TabsContent value="pending">
              {filterDisputesByStatus('pending').length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <CheckCircle className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p>No pending disputes</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {filterDisputesByStatus('pending').map(dispute => (
                    <DisputeCard key={dispute.id} dispute={dispute} />
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="in-review">
              {filterDisputesByStatus('in-review').length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <FileText className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p>No disputes in review</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {filterDisputesByStatus('in-review').map(dispute => (
                    <DisputeCard key={dispute.id} dispute={dispute} />
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="resolved">
              {filterDisputesByStatus('resolved').length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <XCircle className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p>No resolved disputes</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {filterDisputesByStatus('resolved').map(dispute => (
                    <DisputeCard key={dispute.id} dispute={dispute} />
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="all">
              {disputes.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <AlertTriangle className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p>No disputes found</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {disputes.map(dispute => (
                    <DisputeCard key={dispute.id} dispute={dispute} />
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Resolve Dialog */}
      <Dialog open={showResolveDialog} onOpenChange={setShowResolveDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Resolve Dispute</DialogTitle>
            <DialogDescription>
              Update the status and provide resolution details
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {selectedDispute && (
              <div className="p-4 bg-gray-50 rounded-lg space-y-2">
                <div className="flex items-center gap-2">
                  {getTypeBadge(selectedDispute.type)}
                  {getStatusBadge(selectedDispute.status)}
                </div>
                <p className="text-sm text-gray-700">{selectedDispute.description}</p>
              </div>
            )}

            <div>
              <Label>Status</Label>
              <Select value={resolveForm.status} onValueChange={(value) => setResolveForm({ ...resolveForm, status: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="in-review">In Review</SelectItem>
                  <SelectItem value="resolved">Resolved</SelectItem>
                  <SelectItem value="closed">Closed</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Outcome</Label>
              <Select value={resolveForm.outcome} onValueChange={(value) => setResolveForm({ ...resolveForm, outcome: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select outcome" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="refund-100">Full Refund (100%)</SelectItem>
                  <SelectItem value="refund-50">Partial Refund (50%)</SelectItem>
                  <SelectItem value="credit">Credit Applied</SelectItem>
                  <SelectItem value="warning-issued">Warning Issued</SelectItem>
                  <SelectItem value="no-action">No Action Required</SelectItem>
                  <SelectItem value="escalated">Escalated</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Outcome Details</Label>
              <Textarea
                value={resolveForm.outcomeDetails}
                onChange={(e) => setResolveForm({ ...resolveForm, outcomeDetails: e.target.value })}
                placeholder="Provide detailed explanation of the resolution..."
                rows={4}
              />
            </div>

            <div>
              <Label>Add Internal Note (Optional)</Label>
              <Textarea
                value={resolveForm.note}
                onChange={(e) => setResolveForm({ ...resolveForm, note: e.target.value })}
                placeholder="Add notes for internal tracking..."
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowResolveDialog(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button
              onClick={handleResolveDispute}
              disabled={submitting}
              className="text-white"
              style={{ backgroundColor: '#625d9c' }}
            >
              {submitting ? 'Updating...' : 'Update Dispute'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
