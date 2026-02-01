import React, { useState, useEffect } from 'react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Badge } from '../ui/badge';
import { Switch } from '../ui/switch';
import { 
  Trash2,
  Shield,
  Clock,
  Database,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  Loader2,
  Play,
  XCircle,
  FileText,
  Users,
  MessageSquare
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { projectId, publicAnonKey } from '../../utils/supabase/info';

interface RetentionPolicy {
  id: string;
  name: string;
  dataType: string;
  description: string;
  retentionPeriod: number; // days
  enabled: boolean;
  autoDelete: boolean;
  requiresApproval: boolean;
  lastRun?: string;
  nextRun?: string;
  itemsPurged: number;
  legalHoldExemption: boolean;
  gdprCompliant: boolean;
}

interface PurgeJob {
  id: string;
  policyId: string;
  policyName: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  startTime: string;
  endTime?: string;
  itemsIdentified: number;
  itemsPurged: number;
  errors?: string[];
  approvedBy?: string;
  cancelledBy?: string;
}

interface DataInventory {
  dataType: string;
  totalRecords: number;
  eligibleForDeletion: number;
  underLegalHold: number;
  oldestRecord: string;
  averageAge: number; // days
}

interface RetentionPoliciesProps {
  dpoId: string;
  accessToken: string;
  isDPO: boolean;
}

const DATA_TYPES = [
  { id: 'user_accounts_deleted', name: 'Deleted User Accounts', icon: Users, defaultRetention: 30 },
  { id: 'sessions_completed', name: 'Completed Sessions', icon: Database, defaultRetention: 730 },
  { id: 'messages', name: 'Messages', icon: MessageSquare, defaultRetention: 365 },
  { id: 'payment_records', name: 'Payment Records', icon: FileText, defaultRetention: 2555 }, // 7 years
  { id: 'audit_logs', name: 'Audit Logs', icon: Shield, defaultRetention: 1095 }, // 3 years
  { id: 'support_tickets', name: 'Closed Support Tickets', icon: MessageSquare, defaultRetention: 365 },
  { id: 'anonymized_analytics', name: 'Anonymized Analytics', icon: Database, defaultRetention: 1825 }, // 5 years
  { id: 'dsar_requests', name: 'Completed DSAR Requests', icon: FileText, defaultRetention: 90 }
];

export function RetentionPolicies({ dpoId, accessToken, isDPO }: RetentionPoliciesProps) {
  const [policies, setPolicies] = useState<RetentionPolicy[]>([]);
  const [purgeJobs, setPurgeJobs] = useState<PurgeJob[]>([]);
  const [inventory, setInventory] = useState<DataInventory[]>([]);
  const [loading, setLoading] = useState(true);
  const [runningPurge, setRunningPurge] = useState(false);
  const [selectedPolicy, setSelectedPolicy] = useState<RetentionPolicy | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [policiesRes, jobsRes, inventoryRes] = await Promise.all([
        fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-cbd74580/admin/retention/policies`,
          { headers: { 'Authorization': `Bearer ${accessToken}` } }
        ),
        fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-cbd74580/admin/retention/jobs`,
          { headers: { 'Authorization': `Bearer ${accessToken}` } }
        ),
        fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-cbd74580/admin/retention/inventory`,
          { headers: { 'Authorization': `Bearer ${accessToken}` } }
        )
      ]);

      if (policiesRes.ok) {
        const data = await policiesRes.json();
        setPolicies(data.policies || []);
      }

      if (jobsRes.ok) {
        const data = await jobsRes.json();
        setPurgeJobs(data.jobs || []);
      }

      if (inventoryRes.ok) {
        const data = await inventoryRes.json();
        setInventory(data.inventory || []);
      }
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load retention data');
    } finally {
      setLoading(false);
    }
  };

  const updatePolicy = async (policyId: string, updates: Partial<RetentionPolicy>) => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-cbd74580/admin/retention/policies/${policyId}`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(updates)
        }
      );

      if (response.ok) {
        toast.success('Policy updated');
        loadData();
      } else {
        toast.error('Failed to update policy');
      }
    } catch (error) {
      console.error('Error updating policy:', error);
      toast.error('Failed to update policy');
    }
  };

  const runPurgeJob = async (policyId: string) => {
    const policy = policies.find(p => p.id === policyId);
    if (!policy) return;

    if (policy.requiresApproval) {
      const confirmed = confirm(
        `This will permanently delete data older than ${policy.retentionPeriod} days for "${policy.name}". This action cannot be undone. Continue?`
      );
      if (!confirmed) return;
    }

    setRunningPurge(true);
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-cbd74580/admin/retention/purge`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            policyId,
            approvedBy: dpoId
          })
        }
      );

      if (response.ok) {
        toast.success('Purge job started');
        setTimeout(loadData, 2000);
      } else {
        toast.error('Failed to start purge job');
      }
    } catch (error) {
      console.error('Error running purge:', error);
      toast.error('Failed to start purge job');
    } finally {
      setRunningPurge(false);
    }
  };

  const cancelPurgeJob = async (jobId: string) => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-cbd74580/admin/retention/jobs/${jobId}/cancel`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ cancelledBy: dpoId })
        }
      );

      if (response.ok) {
        toast.success('Purge job cancelled');
        loadData();
      } else {
        toast.error('Failed to cancel job');
      }
    } catch (error) {
      console.error('Error cancelling job:', error);
      toast.error('Failed to cancel job');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'failed':
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      case 'running':
        return 'bg-blue-100 text-blue-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const totalEligible = inventory.reduce((sum, item) => sum + item.eligibleForDeletion, 0);
  const totalUnderHold = inventory.reduce((sum, item) => sum + item.underLegalHold, 0);
  const enabledPolicies = policies.filter(p => p.enabled).length;
  const totalPurged = policies.reduce((sum, p) => sum + p.itemsPurged, 0);

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
          <h2 className="text-3xl">Data Retention Policies</h2>
          <p className="text-gray-600 mt-1">
            Configure automated data purging per GDPR and compliance requirements
          </p>
        </div>
        {isDPO && (
          <Button variant="outline" onClick={loadData}>
            <Calendar className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        )}
      </div>

      {/* Stats */}
      <div className="grid md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center justify-between mb-2">
            <Shield className="w-5 h-5 text-[#625d9c]" />
            <Badge variant="outline">{enabledPolicies} active</Badge>
          </div>
          <div className="text-2xl font-bold">{policies.length}</div>
          <div className="text-sm text-gray-600">Policies</div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between mb-2">
            <AlertTriangle className="w-5 h-5 text-yellow-600" />
            <Badge variant="outline" className="text-yellow-600">Eligible</Badge>
          </div>
          <div className="text-2xl font-bold">{totalEligible.toLocaleString()}</div>
          <div className="text-sm text-gray-600">Records to Purge</div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between mb-2">
            <Shield className="w-5 h-5 text-red-600" />
            <Badge variant="outline" className="text-red-600">Protected</Badge>
          </div>
          <div className="text-2xl font-bold">{totalUnderHold.toLocaleString()}</div>
          <div className="text-sm text-gray-600">Legal Hold</div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between mb-2">
            <Trash2 className="w-5 h-5 text-green-600" />
            <Badge variant="outline" className="text-green-600">All Time</Badge>
          </div>
          <div className="text-2xl font-bold">{totalPurged.toLocaleString()}</div>
          <div className="text-sm text-gray-600">Records Purged</div>
        </Card>
      </div>

      {/* Warning if items eligible */}
      {totalEligible > 0 && (
        <Card className="p-4 bg-amber-50 border-amber-200">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-amber-900">
              <p className="font-medium mb-1">Data Eligible for Deletion</p>
              <p>
                {totalEligible.toLocaleString()} record{totalEligible !== 1 ? 's are' : ' is'} eligible
                for deletion according to retention policies. Review and run purge jobs to maintain
                GDPR compliance.
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Data Inventory */}
      <Card className="p-6">
        <h3 className="text-xl mb-4">Data Inventory</h3>
        <div className="space-y-2">
          {inventory.map((item) => {
            const dataType = DATA_TYPES.find(dt => dt.id === item.dataType);
            const Icon = dataType?.icon || Database;
            
            return (
              <Card key={item.dataType} className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <Icon className="w-5 h-5 text-gray-600" />
                    <div>
                      <h4 className="font-medium">{dataType?.name || item.dataType}</h4>
                      <p className="text-xs text-gray-600">
                        Average age: {item.averageAge} days
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-[#625d9c]">
                      {item.totalRecords.toLocaleString()}
                    </div>
                    <div className="text-xs text-gray-600">Total Records</div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <Card className="p-3 text-center">
                    <div className="text-lg font-bold text-yellow-600">
                      {item.eligibleForDeletion.toLocaleString()}
                    </div>
                    <div className="text-xs text-gray-600">Eligible</div>
                  </Card>
                  <Card className="p-3 text-center">
                    <div className="text-lg font-bold text-red-600">
                      {item.underLegalHold.toLocaleString()}
                    </div>
                    <div className="text-xs text-gray-600">Legal Hold</div>
                  </Card>
                  <Card className="p-3 text-center">
                    <div className="text-xs text-gray-600 mb-1">Oldest</div>
                    <div className="text-xs font-medium">
                      {new Date(item.oldestRecord).toLocaleDateString()}
                    </div>
                  </Card>
                </div>
              </Card>
            );
          })}
        </div>
      </Card>

      {/* Retention Policies */}
      <Card className="p-6">
        <h3 className="text-xl mb-4">Retention Policies</h3>
        <div className="space-y-3">
          {policies.map((policy) => {
            const dataType = DATA_TYPES.find(dt => dt.id === policy.dataType);
            const Icon = dataType?.icon || Database;
            
            return (
              <Card key={policy.id} className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <Icon className="w-5 h-5 text-gray-600" />
                      <h4 className="font-medium">{policy.name}</h4>
                      {policy.enabled ? (
                        <Badge className="bg-green-100 text-green-800">
                          <CheckCircle2 className="w-3 h-3 mr-1" />
                          Enabled
                        </Badge>
                      ) : (
                        <Badge className="bg-gray-100 text-gray-600">
                          Disabled
                        </Badge>
                      )}
                      {policy.gdprCompliant && (
                        <Badge variant="outline" className="text-blue-600">
                          GDPR Compliant
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 mb-3">{policy.description}</p>
                    
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                        <span className="text-sm">Retention Period</span>
                        <Input
                          type="number"
                          value={policy.retentionPeriod}
                          onChange={(e) => updatePolicy(policy.id, { retentionPeriod: Number(e.target.value) })}
                          disabled={!isDPO}
                          className="w-24 h-8 text-right"
                        />
                        <span className="text-sm ml-2">days</span>
                      </div>

                      <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                        <span className="text-sm">Auto-Delete</span>
                        <Switch
                          checked={policy.autoDelete}
                          onCheckedChange={(checked) => updatePolicy(policy.id, { autoDelete: checked })}
                          disabled={!isDPO}
                        />
                      </div>

                      <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                        <span className="text-sm">Requires Approval</span>
                        <Switch
                          checked={policy.requiresApproval}
                          onCheckedChange={(checked) => updatePolicy(policy.id, { requiresApproval: checked })}
                          disabled={!isDPO}
                        />
                      </div>

                      <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                        <span className="text-sm">Legal Hold Exemption</span>
                        <Switch
                          checked={policy.legalHoldExemption}
                          onCheckedChange={(checked) => updatePolicy(policy.id, { legalHoldExemption: checked })}
                          disabled={!isDPO}
                        />
                      </div>
                    </div>

                    <div className="flex items-center gap-4 text-sm text-gray-600 mt-3">
                      {policy.lastRun && (
                        <span>Last run: {new Date(policy.lastRun).toLocaleDateString()}</span>
                      )}
                      {policy.nextRun && (
                        <span>Next run: {new Date(policy.nextRun).toLocaleDateString()}</span>
                      )}
                      <span>{policy.itemsPurged.toLocaleString()} items purged</span>
                    </div>
                  </div>

                  {isDPO && (
                    <div className="flex flex-col gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => updatePolicy(policy.id, { enabled: !policy.enabled })}
                      >
                        {policy.enabled ? 'Disable' : 'Enable'}
                      </Button>
                      {policy.enabled && (
                        <Button
                          size="sm"
                          onClick={() => runPurgeJob(policy.id)}
                          disabled={runningPurge}
                          className="bg-[#5d9827] hover:bg-[#4a7a1f]"
                        >
                          {runningPurge ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <>
                              <Play className="w-4 h-4 mr-1" />
                              Run Now
                            </>
                          )}
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      </Card>

      {/* Recent Purge Jobs */}
      <Card className="p-6">
        <h3 className="text-xl mb-4">Recent Purge Jobs</h3>
        <div className="space-y-2">
          {purgeJobs.slice(0, 10).map((job) => (
            <Card key={job.id} className="p-4">
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Trash2 className="w-4 h-4 text-gray-600" />
                    <h4 className="font-medium text-sm">{job.policyName}</h4>
                    <Badge className={getStatusColor(job.status)}>
                      {job.status}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-gray-600 mb-2">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {new Date(job.startTime).toLocaleString()}
                    </span>
                    {job.endTime && (
                      <span>
                        Duration: {Math.round((new Date(job.endTime).getTime() - new Date(job.startTime).getTime()) / 1000)}s
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <Card className="p-2 text-center">
                      <div className="font-bold text-[#625d9c]">
                        {job.itemsIdentified.toLocaleString()}
                      </div>
                      <div className="text-xs text-gray-600">Identified</div>
                    </Card>
                    <Card className="p-2 text-center">
                      <div className="font-bold text-green-600">
                        {job.itemsPurged.toLocaleString()}
                      </div>
                      <div className="text-xs text-gray-600">Purged</div>
                    </Card>
                  </div>

                  {job.approvedBy && (
                    <p className="text-xs text-gray-600 mt-2">
                      Approved by: {job.approvedBy}
                    </p>
                  )}

                  {job.errors && job.errors.length > 0 && (
                    <Card className="mt-2 p-2 bg-red-50 border-red-200">
                      <p className="text-xs font-medium text-red-900 mb-1">Errors:</p>
                      {job.errors.slice(0, 3).map((error, idx) => (
                        <p key={idx} className="text-xs text-red-800">• {error}</p>
                      ))}
                    </Card>
                  )}
                </div>

                {job.status === 'running' && isDPO && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => cancelPurgeJob(job.id)}
                    className="text-red-600"
                  >
                    <XCircle className="w-4 h-4 mr-1" />
                    Cancel
                  </Button>
                )}
              </div>
            </Card>
          ))}

          {purgeJobs.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <Trash2 className="w-12 h-12 mx-auto mb-2 text-gray-400" />
              <p>No purge jobs yet</p>
            </div>
          )}
        </div>
      </Card>

      {/* GDPR Compliance Notice */}
      <Card className="p-4 bg-blue-50 border-blue-200">
        <div className="flex items-start gap-3">
          <Shield className="w-6 h-6 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-900">
            <p className="font-medium mb-2">GDPR Compliance</p>
            <ul className="space-y-1">
              <li>• Retention policies are configured per GDPR Article 5(1)(e) - storage limitation</li>
              <li>• Data under legal hold is protected from automatic deletion</li>
              <li>• All purge operations are logged and auditable</li>
              <li>• Payment records retained for 7 years per regulatory requirements</li>
              <li>• User data deleted within 30 days of account closure per GDPR Article 17</li>
            </ul>
          </div>
        </div>
      </Card>
    </div>
  );
}
