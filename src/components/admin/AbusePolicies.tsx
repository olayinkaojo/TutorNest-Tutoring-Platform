import React, { useState, useEffect } from 'react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Textarea } from '../ui/textarea';
import { 
  Shield,
  AlertTriangle,
  Clock,
  Ban,
  CheckCircle2,
  XCircle,
  Flag,
  UserX,
  CalendarX,
  MessageCircle,
  FileText,
  Loader2,
  Eye
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { projectId, publicAnonKey } from '../../utils/supabase/info';

interface Policy {
  id: string;
  type: 'no-show' | 'late-cancellation' | 'inappropriate-behavior' | 'platform-misuse' | 'payment-dispute';
  title: string;
  description: string;
  userImpact: string;
  consequences: string[];
  thresholds: {
    warning: number;
    suspension: number;
    ban: number;
  };
  graceperiode?: number; // hours
  appealable: boolean;
  enabled: boolean;
}

interface Violation {
  id: string;
  userId: string;
  userName: string;
  userRole: string;
  policyType: string;
  description: string;
  timestamp: string;
  reportedBy?: string;
  status: 'pending' | 'confirmed' | 'dismissed' | 'appealed';
  evidence?: string[];
  outcome?: 'warning' | 'fine' | 'suspension' | 'no-action';
  notes?: string;
}

interface UserViolationHistory {
  userId: string;
  userName: string;
  userRole: string;
  totalViolations: number;
  warningCount: number;
  suspensionCount: number;
  activeWarnings: number;
  lastViolation?: string;
  violations: Violation[];
}

interface AbusePoliciesProps {
  adminId: string;
  accessToken: string;
}

const DEFAULT_POLICIES: Omit<Policy, 'id'>[] = [
  {
    type: 'no-show',
    title: 'No-Show Policy',
    description: 'Student or tutor fails to attend a scheduled lesson without prior notice',
    userImpact: 'Wastes time and creates scheduling gaps for the other party',
    consequences: [
      '1st offense: Warning and educational notice',
      '2nd offense: ₦10 fine and final warning',
      '3rd offense: 7-day suspension',
      '4th offense: Permanent account ban'
    ],
    thresholds: { warning: 1, suspension: 3, ban: 4 },
    graceperiod: 2,
    appealable: true,
    enabled: true
  },
  {
    type: 'late-cancellation',
    title: 'Late Cancellation Policy',
    description: 'Cancelling a lesson less than 24 hours before scheduled start time',
    userImpact: 'Insufficient time to reschedule or find replacement',
    consequences: [
      '1st offense: Warning',
      '2nd-3rd offense: Charged 50% of lesson fee',
      '4th+ offense: Charged 100% of lesson fee',
      'Repeated violations may result in suspension'
    ],
    thresholds: { warning: 1, suspension: 10, ban: 20 },
    graceperiod: 24,
    appealable: true,
    enabled: true
  },
  {
    type: 'inappropriate-behavior',
    title: 'Inappropriate Behavior Policy',
    description: 'Harassment, bullying, discrimination, or unprofessional conduct',
    userImpact: 'Creates unsafe or hostile environment',
    consequences: [
      '1st offense: Immediate 14-day suspension and warning',
      '2nd offense: 30-day suspension',
      '3rd offense: Permanent account termination',
      'Severe cases may result in immediate permanent ban'
    ],
    thresholds: { warning: 1, suspension: 1, ban: 3 },
    appealable: true,
    enabled: true
  },
  {
    type: 'platform-misuse',
    title: 'Platform Misuse Policy',
    description: 'Attempting to circumvent platform, share contact details, or arrange off-platform payments',
    userImpact: 'Violates terms of service and undermines platform safety',
    consequences: [
      '1st offense: Written warning and educational notice',
      '2nd offense: 7-day suspension',
      '3rd offense: Permanent account ban',
      'Loss of Knowledge Fons Academy protection and payment guarantees'
    ],
    thresholds: { warning: 1, suspension: 2, ban: 3 },
    appealable: true,
    enabled: true
  },
  {
    type: 'payment-dispute',
    title: 'Payment Dispute Policy',
    description: 'Disputed charges, refund requests, or payment-related conflicts',
    userImpact: 'Financial impact and loss of trust',
    consequences: [
      'Case-by-case review by support team',
      'Mediation offered for resolution',
      'Refunds processed per policy guidelines',
      'Repeated frivolous disputes may result in account restrictions'
    ],
    thresholds: { warning: 3, suspension: 5, ban: 10 },
    appealable: true,
    enabled: true
  }
];

export function AbusePolicies({ adminId, accessToken }: AbusePoliciesProps) {
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [violations, setViolations] = useState<Violation[]>([]);
  const [userHistories, setUserHistories] = useState<UserViolationHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedViolation, setSelectedViolation] = useState<Violation | null>(null);
  const [selectedUserHistory, setSelectedUserHistory] = useState<UserViolationHistory | null>(null);

  useEffect(() => {
    loadPolicyData();
  }, []);

  const loadPolicyData = async () => {
    setLoading(true);
    try {
      const [policiesRes, violationsRes, historiesRes] = await Promise.all([
        fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-cbd74580/admin/policies`,
          { headers: { 'Authorization': `Bearer ${accessToken}` } }
        ),
        fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-cbd74580/admin/violations?status=pending`,
          { headers: { 'Authorization': `Bearer ${accessToken}` } }
        ),
        fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-cbd74580/admin/violations/histories?limit=20`,
          { headers: { 'Authorization': `Bearer ${accessToken}` } }
        )
      ]);

      if (policiesRes.ok) {
        const data = await policiesRes.json();
        setPolicies(data.policies || []);
      }

      if (violationsRes.ok) {
        const data = await violationsRes.json();
        setViolations(data.violations || []);
      }

      if (historiesRes.ok) {
        const data = await historiesRes.json();
        setUserHistories(data.histories || []);
      }
    } catch (error) {
      console.error('Error loading policy data:', error);
      toast.error('Failed to load policy data');
    } finally {
      setLoading(false);
    }
  };

  const reviewViolation = async (
    violationId: string,
    outcome: 'warning' | 'fine' | 'suspension' | 'no-action',
    notes: string
  ) => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-cbd74580/admin/violations/${violationId}/review`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            outcome,
            notes,
            reviewedBy: adminId
          })
        }
      );

      if (response.ok) {
        toast.success('Violation reviewed');
        setSelectedViolation(null);
        loadPolicyData();
      } else {
        toast.error('Failed to review violation');
      }
    } catch (error) {
      console.error('Error reviewing violation:', error);
      toast.error('Failed to review violation');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'confirmed':
        return 'bg-red-100 text-red-800';
      case 'dismissed':
        return 'bg-gray-100 text-gray-800';
      case 'appealed':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getOutcomeColor = (outcome?: string) => {
    switch (outcome) {
      case 'warning':
        return 'bg-yellow-100 text-yellow-800';
      case 'fine':
        return 'bg-orange-100 text-orange-800';
      case 'suspension':
        return 'bg-red-100 text-red-800';
      case 'no-action':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getPolicyIcon = (type: string) => {
    switch (type) {
      case 'no-show':
        return UserX;
      case 'late-cancellation':
        return CalendarX;
      case 'inappropriate-behavior':
        return Ban;
      case 'platform-misuse':
        return AlertTriangle;
      case 'payment-dispute':
        return FileText;
      default:
        return Shield;
    }
  };

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
          <h2 className="text-3xl">Abuse Policies</h2>
          <p className="text-gray-600 mt-1">
            Clear policies and fair outcomes for all users
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center justify-between mb-2">
            <Flag className="w-5 h-5 text-[#625d9c]" />
            <Badge variant="outline">Pending</Badge>
          </div>
          <div className="text-2xl font-bold">{violations.length}</div>
          <div className="text-sm text-gray-600">Violations to Review</div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between mb-2">
            <AlertTriangle className="w-5 h-5 text-yellow-600" />
            <Badge variant="outline" className="text-yellow-600">Active</Badge>
          </div>
          <div className="text-2xl font-bold">
            {userHistories.reduce((sum, h) => sum + h.activeWarnings, 0)}
          </div>
          <div className="text-sm text-gray-600">Active Warnings</div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between mb-2">
            <UserX className="w-5 h-5 text-red-600" />
            <Badge variant="outline" className="text-red-600">Suspended</Badge>
          </div>
          <div className="text-2xl font-bold">
            {userHistories.reduce((sum, h) => sum + h.suspensionCount, 0)}
          </div>
          <div className="text-sm text-gray-600">Total Suspensions</div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between mb-2">
            <Shield className="w-5 h-5 text-blue-600" />
            <Badge variant="outline">Active</Badge>
          </div>
          <div className="text-2xl font-bold">{policies.filter(p => p.enabled).length}</div>
          <div className="text-sm text-gray-600">Policies Enabled</div>
        </Card>
      </div>

      {/* Policies */}
      <Card className="p-6">
        <h3 className="text-xl mb-4">Platform Policies</h3>
        <div className="space-y-4">
          {policies.map((policy) => {
            const Icon = getPolicyIcon(policy.type);
            
            return (
              <Card key={policy.id} className="p-6">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-full bg-[#625d9c] bg-opacity-10 flex items-center justify-center flex-shrink-0">
                    <Icon className="w-6 h-6 text-[#625d9c]" />
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h4 className="text-lg font-medium">{policy.title}</h4>
                      {policy.enabled ? (
                        <Badge className="bg-green-100 text-green-800">
                          <CheckCircle2 className="w-3 h-3 mr-1" />
                          Active
                        </Badge>
                      ) : (
                        <Badge className="bg-gray-100 text-gray-600">
                          Disabled
                        </Badge>
                      )}
                      {policy.appealable && (
                        <Badge variant="outline">
                          Appealable
                        </Badge>
                      )}
                    </div>

                    <p className="text-gray-700 mb-3">{policy.description}</p>

                    <Card className="p-3 bg-amber-50 border-amber-200 mb-3">
                      <p className="text-sm text-amber-900">
                        <strong>User Impact:</strong> {policy.userImpact}
                      </p>
                    </Card>

                    <div className="mb-3">
                      <p className="text-sm font-medium mb-2">Consequences:</p>
                      <ul className="space-y-1">
                        {policy.consequences.map((consequence, idx) => (
                          <li key={idx} className="text-sm text-gray-700">• {consequence}</li>
                        ))}
                      </ul>
                    </div>

                    {policy.graceperiod && (
                      <Card className="p-2 bg-blue-50 border-blue-200">
                        <p className="text-xs text-blue-900">
                          <Clock className="w-3 h-3 inline mr-1" />
                          Grace period: {policy.graceperiod} hours notice required
                        </p>
                      </Card>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      </Card>

      {/* Recent Violations & User Histories */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Pending Violations */}
        <Card className="p-6">
          <h3 className="text-xl mb-4">Pending Violations</h3>
          <div className="space-y-2 max-h-[600px] overflow-y-auto">
            {violations.map((violation) => {
              const policy = policies.find(p => p.type === violation.policyType);
              const Icon = getPolicyIcon(violation.policyType);
              
              return (
                <Card
                  key={violation.id}
                  className={`p-4 cursor-pointer hover:border-[#625d9c] transition-colors ${
                    selectedViolation?.id === violation.id ? 'border-[#625d9c] border-2' : ''
                  }`}
                  onClick={() => setSelectedViolation(violation)}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Icon className="w-4 h-4 text-gray-600" />
                      <span className="font-medium text-sm">{violation.userName}</span>
                      <Badge variant="outline" className="capitalize text-xs">
                        {violation.userRole}
                      </Badge>
                    </div>
                    <Badge className={getStatusColor(violation.status)}>
                      {violation.status}
                    </Badge>
                  </div>
                  
                  <p className="text-sm text-gray-700 mb-2">{violation.description}</p>
                  
                  <div className="flex items-center justify-between text-xs text-gray-600">
                    <span>{policy?.title || violation.policyType}</span>
                    <span>{new Date(violation.timestamp).toLocaleDateString()}</span>
                  </div>
                </Card>
              );
            })}

            {violations.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <CheckCircle2 className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                <p>No pending violations</p>
              </div>
            )}
          </div>
        </Card>

        {/* Violation Details / User History */}
        <Card className="p-6">
          {selectedViolation ? (
            <div className="space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-xl mb-2">Violation Review</h3>
                  <Badge className={getStatusColor(selectedViolation.status)}>
                    {selectedViolation.status}
                  </Badge>
                </div>
              </div>

              <Card className="p-4 bg-gray-50">
                <p className="text-sm font-medium mb-1">Description:</p>
                <p className="text-sm">{selectedViolation.description}</p>
              </Card>

              <div>
                <h4 className="font-medium mb-2">User Information</h4>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Name:</span>
                    <span className="font-medium">{selectedViolation.userName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Role:</span>
                    <span className="font-medium capitalize">{selectedViolation.userRole}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Policy:</span>
                    <span className="font-medium">
                      {policies.find(p => p.type === selectedViolation.policyType)?.title}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Date:</span>
                    <span className="font-medium">
                      {new Date(selectedViolation.timestamp).toLocaleString()}
                    </span>
                  </div>
                  {selectedViolation.reportedBy && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Reported by:</span>
                      <span className="font-medium">{selectedViolation.reportedBy}</span>
                    </div>
                  )}
                </div>
              </div>

              {selectedViolation.evidence && selectedViolation.evidence.length > 0 && (
                <div>
                  <h4 className="font-medium mb-2">Evidence</h4>
                  <div className="space-y-1">
                    {selectedViolation.evidence.map((evidence, idx) => (
                      <Card key={idx} className="p-2 text-xs bg-gray-50">
                        {evidence}
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              {/* User's Violation History */}
              <Card className="p-4 bg-blue-50 border-blue-200">
                <p className="text-sm font-medium text-blue-900 mb-2">User Violation History</p>
                {userHistories.find(h => h.userId === selectedViolation.userId) ? (
                  <div className="grid grid-cols-2 gap-2 text-sm text-blue-900">
                    <div>Total Violations: <strong>{userHistories.find(h => h.userId === selectedViolation.userId)?.totalViolations}</strong></div>
                    <div>Warnings: <strong>{userHistories.find(h => h.userId === selectedViolation.userId)?.warningCount}</strong></div>
                    <div>Active Warnings: <strong>{userHistories.find(h => h.userId === selectedViolation.userId)?.activeWarnings}</strong></div>
                    <div>Suspensions: <strong>{userHistories.find(h => h.userId === selectedViolation.userId)?.suspensionCount}</strong></div>
                  </div>
                ) : (
                  <p className="text-sm text-blue-800">First violation for this user</p>
                )}
              </Card>

              {selectedViolation.status === 'pending' && (
                <div className="space-y-3">
                  <Textarea
                    placeholder="Review notes and reasoning..."
                    id="review-notes-violation"
                    rows={3}
                  />
                  
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      variant="outline"
                      onClick={() => {
                        const notes = (document.getElementById('review-notes-violation') as HTMLTextAreaElement)?.value || '';
                        reviewViolation(selectedViolation.id, 'no-action', notes);
                      }}
                    >
                      <CheckCircle2 className="w-4 h-4 mr-2" />
                      No Action
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        const notes = (document.getElementById('review-notes-violation') as HTMLTextAreaElement)?.value || '';
                        reviewViolation(selectedViolation.id, 'warning', notes);
                      }}
                      className="text-yellow-600"
                    >
                      <AlertTriangle className="w-4 h-4 mr-2" />
                      Warning
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        const notes = (document.getElementById('review-notes-violation') as HTMLTextAreaElement)?.value || '';
                        reviewViolation(selectedViolation.id, 'fine', notes);
                      }}
                      className="text-orange-600"
                    >
                      <FileText className="w-4 h-4 mr-2" />
                      Apply Fine
                    </Button>
                    <Button
                      onClick={() => {
                        const notes = (document.getElementById('review-notes-violation') as HTMLTextAreaElement)?.value || '';
                        reviewViolation(selectedViolation.id, 'suspension', notes);
                      }}
                      className="bg-red-600 hover:bg-red-700"
                    >
                      <Ban className="w-4 h-4 mr-2" />
                      Suspend
                    </Button>
                  </div>
                </div>
              )}

              {selectedViolation.outcome && (
                <Card className="p-4 bg-green-50 border-green-200">
                  <p className="text-sm font-medium text-green-900 mb-1">Resolution:</p>
                  <Badge className={getOutcomeColor(selectedViolation.outcome)}>
                    {selectedViolation.outcome.replace('-', ' ')}
                  </Badge>
                  {selectedViolation.notes && (
                    <p className="text-sm text-green-800 mt-2">{selectedViolation.notes}</p>
                  )}
                </Card>
              )}
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500">
              <Flag className="w-16 h-16 mx-auto mb-4 text-gray-400" />
              <p>Select a violation to review</p>
            </div>
          )}
        </Card>
      </div>

      {/* User Violation Histories */}
      <Card className="p-6">
        <h3 className="text-xl mb-4">Users with Multiple Violations</h3>
        <div className="space-y-2">
          {userHistories
            .filter(h => h.totalViolations > 1)
            .sort((a, b) => b.totalViolations - a.totalViolations)
            .map((history) => (
              <Card
                key={history.userId}
                className={`p-4 cursor-pointer hover:border-[#625d9c] transition-colors ${
                  selectedUserHistory?.userId === history.userId ? 'border-[#625d9c] border-2' : ''
                }`}
                onClick={() => setSelectedUserHistory(history)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                      <span className="font-bold text-red-600">{history.totalViolations}</span>
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{history.userName}</span>
                        <Badge variant="outline" className="capitalize text-xs">
                          {history.userRole}
                        </Badge>
                      </div>
                      <p className="text-xs text-gray-600">
                        Last violation: {history.lastViolation ? new Date(history.lastViolation).toLocaleDateString() : 'N/A'}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    {history.activeWarnings > 0 && (
                      <Badge className="bg-yellow-100 text-yellow-800">
                        {history.activeWarnings} Active Warning{history.activeWarnings !== 1 ? 's' : ''}
                      </Badge>
                    )}
                    {history.suspensionCount > 0 && (
                      <Badge className="bg-red-100 text-red-800">
                        {history.suspensionCount} Suspension{history.suspensionCount !== 1 ? 's' : ''}
                      </Badge>
                    )}
                  </div>
                </div>
              </Card>
            ))}

          {userHistories.filter(h => h.totalViolations > 1).length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <CheckCircle2 className="w-12 h-12 mx-auto mb-2 text-gray-400" />
              <p>No repeat offenders</p>
            </div>
          )}
        </div>
      </Card>

      {/* Fair Outcomes Notice */}
      <Card className="p-6 bg-green-50 border-green-200">
        <h3 className="text-xl mb-4 text-green-900">Fair Outcomes Framework</h3>
        <div className="grid md:grid-cols-2 gap-4 text-sm text-green-900">
          <div>
            <p className="font-medium mb-2">Our Commitments:</p>
            <ul className="space-y-1 text-green-800">
              <li>• Clear, published policies accessible to all users</li>
              <li>• Graduated enforcement with warnings before sanctions</li>
              <li>• Right to appeal for all appealable decisions</li>
              <li>• Evidence-based decision making</li>
              <li>• Consistent application of policies across all users</li>
              <li>• Grace periods for unintentional violations</li>
            </ul>
          </div>
          <div>
            <p className="font-medium mb-2">User Rights:</p>
            <ul className="space-y-1 text-green-800">
              <li>• Notification of all violations and outcomes</li>
              <li>• Explanation of reasoning for each decision</li>
              <li>• Opportunity to provide context or evidence</li>
              <li>• Appeal process for disputed outcomes</li>
              <li>• Clear escalation path for repeat violations</li>
              <li>• Data privacy and confidentiality maintained</li>
            </ul>
          </div>
        </div>
      </Card>
    </div>
  );
}
