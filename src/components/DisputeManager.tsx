import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from './ui/dialog';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { AlertTriangle, FileText, Clock, CheckCircle, XCircle, Plus } from 'lucide-react';
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
}

interface DisputeManagerProps {
  accessToken: string;
  userId: string;
  userRole: 'parent' | 'tutor' | 'admin';
}

export function DisputeManager({ accessToken, userId, userRole }: DisputeManagerProps) {
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [formData, setFormData] = useState({
    type: '',
    sessionId: '',
    submittedAgainst: '',
    submittedAgainstRole: '',
    description: '',
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadDisputes();
  }, []);

  const loadDisputes = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-cbd74580/disputes?userId=${userId}&role=${userRole}`,
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

  const handleCreateDispute = async () => {
    if (!formData.type || !formData.submittedAgainst || !formData.description) {
      alert('Please fill in all required fields');
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-cbd74580/disputes`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            ...formData,
            submittedBy: userId,
            submittedByRole: userRole,
          }),
        }
      );

      if (response.ok) {
        alert('Dispute submitted successfully');
        setShowCreateDialog(false);
        setFormData({
          type: '',
          sessionId: '',
          submittedAgainst: '',
          submittedAgainstRole: '',
          description: '',
        });
        loadDisputes();
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to submit dispute');
      }
    } catch (error) {
      console.error('Error creating dispute:', error);
      alert('Failed to submit dispute');
    } finally {
      setSubmitting(false);
    }
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
      return <span className="text-xs text-red-600">⚠️ SLA Overdue</span>;
    } else if (hoursRemaining < 24) {
      return <span className="text-xs text-orange-600">⚠️ {Math.floor(hoursRemaining)}h remaining</span>;
    } else {
      return <span className="text-xs text-gray-500">{Math.floor(hoursRemaining / 24)}d remaining</span>;
    }
  };

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
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Disputes</CardTitle>
              <CardDescription>View and manage dispute resolutions</CardDescription>
            </div>
            {userRole !== 'admin' && (
              <Button
                onClick={() => setShowCreateDialog(true)}
                className="text-white"
                style={{ backgroundColor: '#625d9c' }}
              >
                <Plus className="w-4 h-4 mr-2" />
                File Dispute
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {disputes.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <AlertTriangle className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>No disputes found</p>
            </div>
          ) : (
            <div className="space-y-4">
              {disputes.map((dispute) => (
                <Card key={dispute.id} className="border-l-4" style={{ borderLeftColor: dispute.status === 'resolved' ? '#5d9827' : '#625d9c' }}>
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        {getTypeBadge(dispute.type)}
                        {getStatusBadge(dispute.status)}
                      </div>
                      {dispute.status === 'pending' && (
                        getSLAStatus(dispute.slaDeadline)
                      )}
                    </div>

                    <p className="text-sm text-gray-700 mb-3">{dispute.description}</p>

                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span>Filed {new Date(dispute.createdAt).toLocaleDateString('en-GB')}</span>
                      {dispute.resolvedAt && (
                        <span>Resolved {new Date(dispute.resolvedAt).toLocaleDateString('en-GB')}</span>
                      )}
                    </div>

                    {dispute.outcome && (
                      <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                        <p className="text-sm mb-1"><strong>Outcome:</strong> {dispute.outcome}</p>
                        {dispute.outcomeDetails && (
                          <p className="text-sm text-gray-600">{dispute.outcomeDetails}</p>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Dispute Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>File a Dispute</DialogTitle>
            <DialogDescription>
              Provide details about the issue you're experiencing
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <Label>Dispute Type *</Label>
              <Select value={formData.type} onValueChange={(value) => setFormData({ ...formData, type: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="no-show">No-Show</SelectItem>
                  <SelectItem value="quality">Quality Issue</SelectItem>
                  <SelectItem value="payment">Payment Issue</SelectItem>
                  <SelectItem value="behavior">Behavior Concern</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Session ID (Optional)</Label>
              <input
                type="text"
                className="w-full px-3 py-2 border rounded-md"
                value={formData.sessionId}
                onChange={(e) => setFormData({ ...formData, sessionId: e.target.value })}
                placeholder="Enter session ID if applicable"
              />
            </div>

            <div>
              <Label>Against (User ID) *</Label>
              <input
                type="text"
                className="w-full px-3 py-2 border rounded-md"
                value={formData.submittedAgainst}
                onChange={(e) => setFormData({ ...formData, submittedAgainst: e.target.value })}
                placeholder="User ID of person involved"
              />
            </div>

            <div>
              <Label>Their Role</Label>
              <Select value={formData.submittedAgainstRole} onValueChange={(value) => setFormData({ ...formData, submittedAgainstRole: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="parent">Parent</SelectItem>
                  <SelectItem value="tutor">Tutor</SelectItem>
                  <SelectItem value="student">Student</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Description *</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Describe the issue in detail..."
                rows={5}
              />
            </div>

            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-xs text-blue-700">
                <strong>Note:</strong> Disputes are reviewed within 7 days. You'll be notified of the outcome via email.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button
              onClick={handleCreateDispute}
              disabled={submitting}
              className="text-white"
              style={{ backgroundColor: '#625d9c' }}
            >
              {submitting ? 'Submitting...' : 'Submit Dispute'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
