import React, { useState, useEffect } from 'react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Badge } from '../ui/badge';
import { 
  Shield,
  AlertTriangle,
  Ban,
  UserX,
  Clock,
  CheckCircle2,
  XCircle,
  Flag,
  Eye,
  Loader2,
  Calendar,
  FileText,
  MessageSquare
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { projectId, publicAnonKey } from '../../utils/supabase/info';

interface Sanction {
  id: string;
  userId: string;
  userName: string;
  userRole: string;
  type: 'warning' | 'temporary-suspension' | 'permanent-ban';
  reason: string;
  description: string;
  startDate: string;
  endDate?: string;
  duration?: number; // days
  issuedBy: string;
  status: 'active' | 'expired' | 'appealed' | 'overturned';
  violationIds: string[];
  appeal?: {
    submittedDate: string;
    reason: string;
    status: 'pending' | 'approved' | 'denied';
    reviewedBy?: string;
    reviewNotes?: string;
  };
}

interface SanctionTemplate {
  type: 'warning' | 'temporary-suspension' | 'permanent-ban';
  title: string;
  description: string;
  defaultDuration?: number;
  requiresApproval: boolean;
  notifyUser: boolean;
  restrictions: string[];
}

interface UserSanctionSummary {
  userId: string;
  userName: string;
  userRole: string;
  activeWarnings: number;
  activeSuspensions: number;
  totalWarnings: number;
  totalSuspensions: number;
  totalBans: number;
  currentStatus: 'good-standing' | 'warned' | 'suspended' | 'banned';
  nextEscalation: 'warning' | 'suspension' | 'ban';
  sanctions: Sanction[];
}

interface AccountSanctionsProps {
  adminId: string;
  accessToken: string;
  isAdmin: boolean;
}

const SANCTION_TEMPLATES: SanctionTemplate[] = [
  {
    type: 'warning',
    title: 'Formal Warning',
    description: 'Official warning for policy violation. No account restrictions but logged for future reference.',
    requiresApproval: false,
    notifyUser: true,
    restrictions: [
      'Warning logged on account',
      'No functional restrictions',
      'Escalation if violations continue'
    ]
  },
  {
    type: 'temporary-suspension',
    title: '7-Day Temporary Suspension',
    description: 'Temporary suspension of account access for serious or repeat violations.',
    defaultDuration: 7,
    requiresApproval: true,
    notifyUser: true,
    restrictions: [
      'Cannot log in to account',
      'Cannot schedule or attend sessions',
      'Cannot send messages',
      'Profile hidden from search',
      'Scheduled sessions cancelled with notification'
    ]
  },
  {
    type: 'temporary-suspension',
    title: '14-Day Temporary Suspension',
    description: 'Extended temporary suspension for severe violations.',
    defaultDuration: 14,
    requiresApproval: true,
    notifyUser: true,
    restrictions: [
      'Cannot log in to account',
      'Cannot schedule or attend sessions',
      'Cannot send messages',
      'Profile hidden from search',
      'Scheduled sessions cancelled with notification'
    ]
  },
  {
    type: 'temporary-suspension',
    title: '30-Day Temporary Suspension',
    description: 'Long-term suspension for very serious violations or repeat offenses.',
    defaultDuration: 30,
    requiresApproval: true,
    notifyUser: true,
    restrictions: [
      'Cannot log in to account',
      'Cannot schedule or attend sessions',
      'Cannot send messages',
      'Profile hidden from search',
      'Scheduled sessions cancelled with notification'
    ]
  },
  {
    type: 'permanent-ban',
    title: 'Permanent Account Ban',
    description: 'Permanent termination of account access. Not reversible except through successful appeal.',
    requiresApproval: true,
    notifyUser: true,
    restrictions: [
      'Account permanently disabled',
      'Cannot create new accounts with same email/identity',
      'All scheduled sessions cancelled',
      'Pending payments held pending resolution',
      'Personal data retained per GDPR minimum',
      'May appeal decision within 30 days'
    ]
  }
];

export function AccountSanctions({ adminId, accessToken, isAdmin }: AccountSanctionsProps) {
  const [sanctions, setSanctions] = useState<Sanction[]>([]);
  const [userSummaries, setUserSummaries] = useState<UserSanctionSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSanction, setSelectedSanction] = useState<Sanction | null>(null);
  const [showIssueForm, setShowIssueForm] = useState(false);
  
  const [searchUserId, setSearchUserId] = useState('');
  const [sanctionType, setSanctionType] = useState<string>('warning');
  const [sanctionReason, setSanctionReason] = useState('');
  const [sanctionDescription, setSanctionDescription] = useState('');
  const [sanctionDuration, setSanctionDuration] = useState<number>(7);

  useEffect(() => {
    loadSanctionData();
  }, []);

  const loadSanctionData = async () => {
    setLoading(true);
    try {
      const [sanctionsRes, summariesRes] = await Promise.all([
        fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-cbd74580/admin/sanctions?status=active`,
          { headers: { 'Authorization': `Bearer ${accessToken}` } }
        ),
        fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-cbd74580/admin/sanctions/summaries?limit=50`,
          { headers: { 'Authorization': `Bearer ${accessToken}` } }
        )
      ]);

      if (sanctionsRes.ok) {
        const data = await sanctionsRes.json();
        setSanctions(data.sanctions || []);
      }

      if (summariesRes.ok) {
        const data = await summariesRes.json();
        setUserSummaries(data.summaries || []);
      }
    } catch (error) {
      console.error('Error loading sanction data:', error);
      toast.error('Failed to load sanction data');
    } finally {
      setLoading(false);
    }
  };

  const issueSanction = async () => {
    if (!searchUserId || !sanctionReason || !sanctionDescription) {
      toast.error('Please fill in all required fields');
      return;
    }

    const template = SANCTION_TEMPLATES.find(t => 
      t.type === sanctionType && 
      (!t.defaultDuration || t.defaultDuration === sanctionDuration)
    );

    if (template?.requiresApproval && !isAdmin) {
      toast.error('This sanction type requires admin approval');
      return;
    }

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-cbd74580/admin/sanctions`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            userId: searchUserId,
            type: sanctionType,
            reason: sanctionReason,
            description: sanctionDescription,
            duration: sanctionType === 'temporary-suspension' ? sanctionDuration : undefined,
            issuedBy: adminId
          })
        }
      );

      if (response.ok) {
        toast.success('Sanction issued');
        setShowIssueForm(false);
        setSanctionReason('');
        setSanctionDescription('');
        setSearchUserId('');
        loadSanctionData();
      } else {
        const error = await response.json();
        toast.error(error.message || 'Failed to issue sanction');
      }
    } catch (error) {
      console.error('Error issuing sanction:', error);
      toast.error('Failed to issue sanction');
    }
  };

  const reviewAppeal = async (sanctionId: string, approved: boolean, notes: string) => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-cbd74580/admin/sanctions/${sanctionId}/appeal`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            approved,
            notes,
            reviewedBy: adminId
          })
        }
      );

      if (response.ok) {
        toast.success(`Appeal ${approved ? 'approved' : 'denied'}`);
        loadSanctionData();
        setSelectedSanction(null);
      } else {
        toast.error('Failed to review appeal');
      }
    } catch (error) {
      console.error('Error reviewing appeal:', error);
      toast.error('Failed to review appeal');
    }
  };

  const revokeSanction = async (sanctionId: string, reason: string) => {
    if (!confirm('Are you sure you want to revoke this sanction?')) return;

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-cbd74580/admin/sanctions/${sanctionId}/revoke`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            reason,
            revokedBy: adminId
          })
        }
      );

      if (response.ok) {
        toast.success('Sanction revoked');
        loadSanctionData();
        setSelectedSanction(null);
      } else {
        toast.error('Failed to revoke sanction');
      }
    } catch (error) {
      console.error('Error revoking sanction:', error);
      toast.error('Failed to revoke sanction');
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'warning':
        return 'bg-yellow-100 text-yellow-800';
      case 'temporary-suspension':
        return 'bg-orange-100 text-orange-800';
      case 'permanent-ban':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-red-100 text-red-800';
      case 'expired':
        return 'bg-gray-100 text-gray-800';
      case 'appealed':
        return 'bg-blue-100 text-blue-800';
      case 'overturned':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getUserStatusColor = (status: string) => {
    switch (status) {
      case 'good-standing':
        return 'bg-green-100 text-green-800';
      case 'warned':
        return 'bg-yellow-100 text-yellow-800';
      case 'suspended':
        return 'bg-orange-100 text-orange-800';
      case 'banned':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const activeSanctions = sanctions.filter(s => s.status === 'active');
  const pendingAppeals = sanctions.filter(s => s.appeal?.status === 'pending');
  const totalWarnings = userSummaries.reduce((sum, u) => sum + u.totalWarnings, 0);
  const totalBans = userSummaries.reduce((sum, u) => sum + u.totalBans, 0);

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="w-8 h-8 animate-spin text-[#625d9c]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl">Account Sanctions</h2>
          <p className="text-gray-600 mt-1">
            Tiered sanctions system: warn, suspend, ban
          </p>
        </div>
        {isAdmin && (
          <Button
            onClick={() => setShowIssueForm(!showIssueForm)}
            className="bg-[#5d9827] hover:bg-[#4a7a1f]"
          >
            <Flag className="w-4 h-4 mr-2" />
            Issue Sanction
          </Button>
        )}
      </div>

      {/* Stats */}
      <div className="grid md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center justify-between mb-2">
            <AlertTriangle className="w-5 h-5 text-yellow-600" />
            <Badge variant="outline" className="text-yellow-600">Active</Badge>
          </div>
          <div className="text-2xl font-bold">{totalWarnings}</div>
          <div className="text-sm text-gray-600">Total Warnings</div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between mb-2">
            <Clock className="w-5 h-5 text-orange-600" />
            <Badge variant="outline" className="text-orange-600">Active</Badge>
          </div>
          <div className="text-2xl font-bold">
            {activeSanctions.filter(s => s.type === 'temporary-suspension').length}
          </div>
          <div className="text-sm text-gray-600">Suspensions</div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between mb-2">
            <Ban className="w-5 h-5 text-red-600" />
            <Badge variant="outline" className="text-red-600">Permanent</Badge>
          </div>
          <div className="text-2xl font-bold">{totalBans}</div>
          <div className="text-sm text-gray-600">Bans</div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between mb-2">
            <Eye className="w-5 h-5 text-blue-600" />
            <Badge variant="outline" className="text-blue-600">Pending</Badge>
          </div>
          <div className="text-2xl font-bold">{pendingAppeals.length}</div>
          <div className="text-sm text-gray-600">Appeals</div>
        </Card>
      </div>

      {/* Issue Sanction Form */}
      {showIssueForm && isAdmin && (
        <Card className="p-6 bg-amber-50 border-amber-200">
          <h3 className="text-xl mb-4">Issue New Sanction</h3>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="user-id">User ID or Email</Label>
              <Input
                id="user-id"
                value={searchUserId}
                onChange={(e) => setSearchUserId(e.target.value)}
                placeholder="Enter user ID or email"
              />
            </div>

            <div>
              <Label htmlFor="sanction-type">Sanction Type</Label>
              <select
                id="sanction-type"
                value={sanctionType}
                onChange={(e) => setSanctionType(e.target.value)}
                className="w-full h-10 px-3 border rounded"
              >
                <option value="warning">Warning</option>
                <option value="temporary-suspension">Temporary Suspension</option>
                <option value="permanent-ban">Permanent Ban</option>
              </select>
            </div>

            {sanctionType === 'temporary-suspension' && (
              <div>
                <Label htmlFor="duration">Suspension Duration (days)</Label>
                <select
                  id="duration"
                  value={sanctionDuration}
                  onChange={(e) => setSanctionDuration(Number(e.target.value))}
                  className="w-full h-10 px-3 border rounded"
                >
                  <option value={7}>7 days</option>
                  <option value={14}>14 days</option>
                  <option value={30}>30 days</option>
                </select>
              </div>
            )}

            <div>
              <Label htmlFor="reason">Reason (short)</Label>
              <Input
                id="reason"
                value={sanctionReason}
                onChange={(e) => setSanctionReason(e.target.value)}
                placeholder="e.g., Repeated no-shows"
              />
            </div>

            <div>
              <Label htmlFor="description">Detailed Description</Label>
              <Textarea
                id="description"
                value={sanctionDescription}
                onChange={(e) => setSanctionDescription(e.target.value)}
                placeholder="Provide full context and justification for this sanction..."
                rows={4}
              />
            </div>

            {/* Show template info */}
            {SANCTION_TEMPLATES
              .filter(t => t.type === sanctionType && (!t.defaultDuration || t.defaultDuration === sanctionDuration))
              .map((template, idx) => (
                <Card key={idx} className="p-4 bg-blue-50 border-blue-200">
                  <p className="text-sm font-medium text-blue-900 mb-2">{template.title}</p>
                  <p className="text-sm text-blue-800 mb-2">{template.description}</p>
                  <p className="text-sm font-medium text-blue-900 mb-1">Restrictions:</p>
                  <ul className="text-sm text-blue-800 space-y-0.5">
                    {template.restrictions.map((restriction, ridx) => (
                      <li key={ridx}>• {restriction}</li>
                    ))}
                  </ul>
                  {template.requiresApproval && (
                    <Badge className="mt-2 bg-yellow-100 text-yellow-800">
                      Requires Admin Approval
                    </Badge>
                  )}
                </Card>
              ))}

            <div className="flex gap-2">
              <Button onClick={issueSanction} className="bg-red-600 hover:bg-red-700">
                Issue Sanction
              </Button>
              <Button variant="outline" onClick={() => setShowIssueForm(false)}>
                Cancel
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Active Sanctions & Details */}
      <div className="grid lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <h3 className="text-xl mb-4">Active Sanctions</h3>
          <div className="space-y-2 max-h-[600px] overflow-y-auto">
            {activeSanctions.map((sanction) => (
              <Card
                key={sanction.id}
                className={`p-4 cursor-pointer hover:border-[#625d9c] transition-colors ${
                  selectedSanction?.id === sanction.id ? 'border-[#625d9c] border-2' : ''
                }`}
                onClick={() => setSelectedSanction(sanction)}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {sanction.type === 'warning' && <AlertTriangle className="w-4 h-4 text-yellow-600" />}
                    {sanction.type === 'temporary-suspension' && <Clock className="w-4 h-4 text-orange-600" />}
                    {sanction.type === 'permanent-ban' && <Ban className="w-4 h-4 text-red-600" />}
                    <span className="font-medium text-sm">{sanction.userName}</span>
                    <Badge variant="outline" className="capitalize text-xs">
                      {sanction.userRole}
                    </Badge>
                  </div>
                  <Badge className={getTypeColor(sanction.type)}>
                    {sanction.type.replace('-', ' ')}
                  </Badge>
                </div>
                
                <p className="text-sm text-gray-700 mb-2">{sanction.reason}</p>
                
                <div className="flex items-center justify-between text-xs text-gray-600">
                  <span>Issued: {new Date(sanction.startDate).toLocaleDateString()}</span>
                  {sanction.endDate && (
                    <span>Expires: {new Date(sanction.endDate).toLocaleDateString()}</span>
                  )}
                </div>

                {sanction.appeal && (
                  <Badge className="mt-2 bg-blue-100 text-blue-800">
                    Appeal {sanction.appeal.status}
                  </Badge>
                )}
              </Card>
            ))}

            {activeSanctions.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <CheckCircle2 className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                <p>No active sanctions</p>
              </div>
            )}
          </div>
        </Card>

        {/* Sanction Details */}
        <Card className="p-6">
          {selectedSanction ? (
            <div className="space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-xl mb-2">Sanction Details</h3>
                  <Badge className={getTypeColor(selectedSanction.type)}>
                    {selectedSanction.type.replace('-', ' ')}
                  </Badge>
                </div>
                <Badge className={getStatusColor(selectedSanction.status)}>
                  {selectedSanction.status}
                </Badge>
              </div>

              <div>
                <h4 className="font-medium mb-2">User Information</h4>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Name:</span>
                    <span className="font-medium">{selectedSanction.userName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Role:</span>
                    <span className="font-medium capitalize">{selectedSanction.userRole}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">User ID:</span>
                    <span className="font-mono text-xs">{selectedSanction.userId}</span>
                  </div>
                </div>
              </div>

              <Card className="p-4 bg-gray-50">
                <p className="text-sm font-medium mb-1">Reason:</p>
                <p className="text-sm mb-3">{selectedSanction.reason}</p>
                <p className="text-sm font-medium mb-1">Description:</p>
                <p className="text-sm">{selectedSanction.description}</p>
              </Card>

              <div>
                <h4 className="font-medium mb-2">Timeline</h4>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Issued:</span>
                    <span className="font-medium">
                      {new Date(selectedSanction.startDate).toLocaleString()}
                    </span>
                  </div>
                  {selectedSanction.endDate && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Expires:</span>
                      <span className="font-medium">
                        {new Date(selectedSanction.endDate).toLocaleString()}
                      </span>
                    </div>
                  )}
                  {selectedSanction.duration && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Duration:</span>
                      <span className="font-medium">{selectedSanction.duration} days</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-gray-600">Issued by:</span>
                    <span className="font-medium">{selectedSanction.issuedBy}</span>
                  </div>
                </div>
              </div>

              {selectedSanction.violationIds.length > 0 && (
                <div>
                  <h4 className="font-medium mb-2">Related Violations</h4>
                  <div className="space-y-1">
                    {selectedSanction.violationIds.map((vid, idx) => (
                      <Badge key={idx} variant="outline" className="text-xs">
                        {vid}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Appeal Section */}
              {selectedSanction.appeal && (
                <Card className="p-4 bg-blue-50 border-blue-200">
                  <div className="flex items-center justify-between mb-2">
                    <p className="font-medium text-blue-900">Appeal Submitted</p>
                    <Badge className={
                      selectedSanction.appeal.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                      selectedSanction.appeal.status === 'approved' ? 'bg-green-100 text-green-800' :
                      'bg-red-100 text-red-800'
                    }>
                      {selectedSanction.appeal.status}
                    </Badge>
                  </div>
                  <p className="text-sm text-blue-800 mb-2">
                    {new Date(selectedSanction.appeal.submittedDate).toLocaleString()}
                  </p>
                  <p className="text-sm text-blue-900 font-medium mb-1">Appeal Reason:</p>
                  <p className="text-sm text-blue-800 mb-3">{selectedSanction.appeal.reason}</p>

                  {selectedSanction.appeal.status === 'pending' && isAdmin && (
                    <div className="space-y-2">
                      <Textarea
                        placeholder="Review notes..."
                        id="appeal-notes"
                        rows={2}
                      />
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => {
                            const notes = (document.getElementById('appeal-notes') as HTMLTextAreaElement)?.value || '';
                            reviewAppeal(selectedSanction.id, true, notes);
                          }}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          <CheckCircle2 className="w-4 h-4 mr-1" />
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            const notes = (document.getElementById('appeal-notes') as HTMLTextAreaElement)?.value || '';
                            reviewAppeal(selectedSanction.id, false, notes);
                          }}
                          className="text-red-600"
                        >
                          <XCircle className="w-4 h-4 mr-1" />
                          Deny
                        </Button>
                      </div>
                    </div>
                  )}

                  {selectedSanction.appeal.reviewNotes && (
                    <>
                      <p className="text-sm text-blue-900 font-medium mb-1 mt-3">Review Notes:</p>
                      <p className="text-sm text-blue-800">{selectedSanction.appeal.reviewNotes}</p>
                    </>
                  )}
                </Card>
              )}

              {isAdmin && selectedSanction.status === 'active' && (
                <Button
                  variant="outline"
                  onClick={() => {
                    const reason = prompt('Reason for revoking sanction:');
                    if (reason) revokeSanction(selectedSanction.id, reason);
                  }}
                  className="w-full text-green-600"
                >
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Revoke Sanction
                </Button>
              )}
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500">
              <Shield className="w-16 h-16 mx-auto mb-4 text-gray-400" />
              <p>Select a sanction to view details</p>
            </div>
          )}
        </Card>
      </div>

      {/* User Sanction Summaries */}
      <Card className="p-6">
        <h3 className="text-xl mb-4">User Sanction History</h3>
        <div className="space-y-2">
          {userSummaries.map((summary) => (
            <Card key={summary.userId} className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium">{summary.userName}</span>
                      <Badge variant="outline" className="capitalize text-xs">
                        {summary.userRole}
                      </Badge>
                      <Badge className={getUserStatusColor(summary.currentStatus)}>
                        {summary.currentStatus.replace('-', ' ')}
                      </Badge>
                    </div>
                    <div className="flex gap-3 text-xs text-gray-600">
                      <span>{summary.totalWarnings} warnings</span>
                      <span>{summary.totalSuspensions} suspensions</span>
                      <span>{summary.totalBans} bans</span>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2">
                  {summary.activeWarnings > 0 && (
                    <Badge className="bg-yellow-100 text-yellow-800">
                      {summary.activeWarnings} Active
                    </Badge>
                  )}
                  {summary.nextEscalation && (
                    <Badge variant="outline" className="text-red-600">
                      Next: {summary.nextEscalation}
                    </Badge>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      </Card>

      {/* Sanction Guidelines */}
      <Card className="p-6 bg-blue-50 border-blue-200">
        <h3 className="text-xl mb-4 text-blue-900">Tiered Sanction Framework</h3>
        <div className="space-y-4">
          {SANCTION_TEMPLATES.map((template, idx) => (
            <div key={idx} className="p-4 bg-white rounded border">
              <div className="flex items-center gap-3 mb-2">
                {template.type === 'warning' && <AlertTriangle className="w-5 h-5 text-yellow-600" />}
                {template.type === 'temporary-suspension' && <Clock className="w-5 h-5 text-orange-600" />}
                {template.type === 'permanent-ban' && <Ban className="w-5 h-5 text-red-600" />}
                <h4 className="font-medium text-blue-900">{template.title}</h4>
                {template.requiresApproval && (
                  <Badge variant="outline" className="text-xs">Admin Approval</Badge>
                )}
              </div>
              <p className="text-sm text-blue-800 mb-2">{template.description}</p>
              <div className="text-xs text-blue-700">
                <p className="font-medium mb-1">Restrictions:</p>
                <ul className="space-y-0.5 ml-4">
                  {template.restrictions.map((restriction, ridx) => (
                    <li key={ridx}>• {restriction}</li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
