import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Shield, Ban, AlertTriangle, Clock, CheckCircle, FileText } from 'lucide-react';
import { projectId } from '../utils/supabase/info';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';

interface Sanction {
  id: string;
  userId: string;
  sanctionType: string;
  reason: string;
  notes?: string;
  issuedBy: string;
  issuedAt: string;
  expiresAt?: string;
  restrictions: string[];
  status: string;
  appealStatus?: string;
  appealNotes?: string;
}

interface SanctionsManagementProps {
  session: any;
  userId?: string;
}

export function SanctionsManagement({ session, userId }: SanctionsManagementProps) {
  const [sanctions, setSanctions] = useState<Sanction[]>([]);
  const [catalogue, setCatalogue] = useState<any>({});
  const [reasons, setReasons] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [appealDialogOpen, setAppealDialogOpen] = useState(false);
  const [selectedSanction, setSelectedSanction] = useState<Sanction | null>(null);

  // Form state
  const [targetUserId, setTargetUserId] = useState(userId || '');
  const [sanctionType, setSanctionType] = useState('');
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');
  const [appealNotes, setAppealNotes] = useState('');

  useEffect(() => {
    fetchSanctions();
  }, [userId]);

  const fetchSanctions = async () => {
    try {
      setLoading(true);
      const url = userId
        ? `https://${projectId}.supabase.co/functions/v1/make-server-cbd74580/sanctions/user/${userId}`
        : `https://${projectId}.supabase.co/functions/v1/make-server-cbd74580/sanctions?status=all`;

      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (!response.ok) throw new Error('Failed to fetch sanctions');

      const data = await response.json();
      setSanctions(data.sanctions || []);
      if (data.catalogue) setCatalogue(data.catalogue);
      if (data.reasons) setReasons(data.reasons);
    } catch (err) {
      console.error('Error fetching sanctions:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSanction = async () => {
    if (!targetUserId || !sanctionType || !reason) return;

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-cbd74580/sanctions`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            userId: targetUserId,
            sanctionType,
            reason,
            notes,
            issuedBy: session.user.id,
          }),
        }
      );

      if (!response.ok) throw new Error('Failed to create sanction');

      setCreateDialogOpen(false);
      setTargetUserId('');
      setSanctionType('');
      setReason('');
      setNotes('');
      fetchSanctions();
    } catch (err) {
      console.error('Error creating sanction:', err);
    }
  };

  const handleAppeal = async () => {
    if (!selectedSanction || !appealNotes) return;

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-cbd74580/sanctions/${selectedSanction.id}/appeal`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            appealNotes,
          }),
        }
      );

      if (!response.ok) throw new Error('Failed to submit appeal');

      setAppealDialogOpen(false);
      setSelectedSanction(null);
      setAppealNotes('');
      fetchSanctions();
    } catch (err) {
      console.error('Error submitting appeal:', err);
    }
  };

  const getSanctionIcon = (type: string) => {
    if (type === 'permanent_ban') return <Ban className="w-5 h-5 text-red-600" />;
    if (type.includes('suspend')) return <AlertTriangle className="w-5 h-5 text-amber-600" />;
    return <Shield className="w-5 h-5 text-blue-600" />;
  };

  const getStatusBadge = (status: string, appealStatus?: string) => {
    if (appealStatus === 'pending') {
      return <Badge className="bg-blue-100 text-blue-800">Appeal Pending</Badge>;
    }
    if (status === 'lifted') {
      return <Badge className="bg-green-100 text-green-800">Lifted</Badge>;
    }
    if (status === 'expired') {
      return <Badge variant="secondary">Expired</Badge>;
    }
    if (status === 'active') {
      return <Badge variant="destructive">Active</Badge>;
    }
    return <Badge>{status}</Badge>;
  };

  const formatDuration = (expiresAt?: string) => {
    if (!expiresAt) return 'Permanent';
    
    const now = new Date();
    const expires = new Date(expiresAt);
    const daysLeft = Math.ceil((expires.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysLeft <= 0) return 'Expired';
    if (daysLeft === 1) return '1 day left';
    return `${daysLeft} days left`;
  };

  const activeSanction = sanctions.find(s => s.status === 'active');

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5" />
              Account Sanctions
            </CardTitle>
            {!userId && (
              <Button onClick={() => setCreateDialogOpen(true)}>
                Issue Sanction
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-gray-500">Loading...</div>
          ) : sanctions.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <CheckCircle className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>No sanctions on record</p>
            </div>
          ) : (
            <div className="space-y-4">
              {activeSanction && (
                <Card className="border-2 border-red-200 bg-red-50">
                  <CardContent className="pt-6">
                    <div className="flex items-start gap-4">
                      <div className="mt-1">
                        {getSanctionIcon(activeSanction.sanctionType)}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <h3 className="font-semibold text-red-900">
                              {catalogue[activeSanction.sanctionType]?.name || activeSanction.sanctionType}
                            </h3>
                            <p className="text-sm text-red-700">
                              {catalogue[activeSanction.sanctionType]?.description}
                            </p>
                          </div>
                          {getStatusBadge(activeSanction.status, activeSanction.appealStatus)}
                        </div>

                        <div className="space-y-2 mb-4">
                          <div className="flex items-center gap-2 text-sm text-red-800">
                            <AlertTriangle className="w-4 h-4" />
                            <span>Reason: {activeSanction.reason}</span>
                          </div>
                          {activeSanction.expiresAt && (
                            <div className="flex items-center gap-2 text-sm text-red-800">
                              <Clock className="w-4 h-4" />
                              <span>{formatDuration(activeSanction.expiresAt)}</span>
                            </div>
                          )}
                        </div>

                        {activeSanction.restrictions && activeSanction.restrictions.length > 0 && (
                          <div className="mb-4">
                            <p className="text-sm font-medium mb-2 text-red-900">Restrictions:</p>
                            <div className="flex flex-wrap gap-2">
                              {activeSanction.restrictions.map((r, idx) => (
                                <Badge key={idx} variant="destructive" className="text-xs">
                                  {r === 'all' ? 'All Platform Access' : r}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}

                        {userId && !activeSanction.appealStatus && activeSanction.status === 'active' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedSanction(activeSanction);
                              setAppealDialogOpen(true);
                            }}
                          >
                            <FileText className="w-4 h-4 mr-2" />
                            Appeal Sanction
                          </Button>
                        )}

                        {activeSanction.appealStatus === 'pending' && (
                          <div className="mt-4 p-3 bg-blue-50 rounded border border-blue-200">
                            <p className="text-sm text-blue-900 font-medium mb-1">
                              Appeal Submitted
                            </p>
                            <p className="text-sm text-blue-700">
                              Your appeal is being reviewed. You'll be notified of the outcome.
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              <div className="space-y-3">
                <h4 className="font-medium text-sm text-gray-700">Sanction History</h4>
                {sanctions.filter(s => s.status !== 'active').map((sanction) => (
                  <Card key={sanction.id} className="opacity-75">
                    <CardContent className="pt-4">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          {getSanctionIcon(sanction.sanctionType)}
                          <div>
                            <p className="font-medium text-sm">
                              {catalogue[sanction.sanctionType]?.name || sanction.sanctionType}
                            </p>
                            <p className="text-xs text-gray-600">{sanction.reason}</p>
                          </div>
                        </div>
                        {getStatusBadge(sanction.status, sanction.appealStatus)}
                      </div>

                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <span>Issued {new Date(sanction.issuedAt).toLocaleDateString()}</span>
                        {sanction.expiresAt && (
                          <span>Expires {new Date(sanction.expiresAt).toLocaleDateString()}</span>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Sanction Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Issue Sanction</DialogTitle>
            <DialogDescription>
              Issue a sanction to a user account.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>User ID</Label>
              <Input
                placeholder="Enter user ID"
                value={targetUserId}
                onChange={(e) => setTargetUserId(e.target.value)}
              />
            </div>

            <div>
              <Label>Sanction Type</Label>
              <Select value={sanctionType} onValueChange={setSanctionType}>
                <SelectTrigger>
                  <SelectValue placeholder="Select sanction type" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(catalogue).map(([key, value]: [string, any]) => (
                    <SelectItem key={key} value={key}>
                      {value.name} - {value.description}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Reason</Label>
              <Select value={reason} onValueChange={setReason}>
                <SelectTrigger>
                  <SelectValue placeholder="Select reason" />
                </SelectTrigger>
                <SelectContent>
                  {reasons.map((r) => (
                    <SelectItem key={r} value={r}>
                      {r}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Additional Notes</Label>
              <Textarea
                placeholder="Add any additional context..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateSanction} disabled={!targetUserId || !sanctionType || !reason}>
              Issue Sanction
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Appeal Dialog */}
      <Dialog open={appealDialogOpen} onOpenChange={setAppealDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Appeal Sanction</DialogTitle>
            <DialogDescription>
              Explain why you believe this sanction should be lifted.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {selectedSanction && (
              <div className="p-4 bg-gray-50 rounded border">
                <p className="font-medium mb-1">
                  {catalogue[selectedSanction.sanctionType]?.name}
                </p>
                <p className="text-sm text-gray-600">
                  Reason: {selectedSanction.reason}
                </p>
              </div>
            )}

            <div>
              <Label>Appeal Statement</Label>
              <Textarea
                placeholder="Explain your appeal..."
                value={appealNotes}
                onChange={(e) => setAppealNotes(e.target.value)}
                rows={6}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setAppealDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAppeal} disabled={!appealNotes}>
              Submit Appeal
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
