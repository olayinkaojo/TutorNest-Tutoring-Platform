import React, { useState, useEffect } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import { Switch } from './ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { 
  Shield, 
  Users, 
  Eye, 
  EyeOff,
  UserPlus,
  Trash2,
  Edit,
  Lock,
  Unlock,
  Clock,
  FileText,
  Loader2,
  AlertTriangle,
  CheckCircle2
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { projectId, publicAnonKey } from '../utils/supabase/info';

interface Role {
  id: string;
  name: string;
  description: string;
  permissions: string[];
  color: string;
}

interface StaffMember {
  id: string;
  email: string;
  name: string;
  role: string;
  active: boolean;
  createdAt: string;
  lastAccess?: string;
  accessCount: number;
}

interface AccessLog {
  id: string;
  userId: string;
  userName: string;
  action: string;
  resource: string;
  timestamp: string;
  ipAddress: string;
  success: boolean;
}

const ROLES: Role[] = [
  {
    id: 'admin',
    name: 'Administrator',
    description: 'Full system access and configuration',
    permissions: [
      'user.read',
      'user.write',
      'user.delete',
      'payment.read',
      'payment.write',
      'content.read',
      'content.write',
      'content.delete',
      'report.read',
      'report.write',
      'settings.read',
      'settings.write',
      'audit.read'
    ],
    color: 'bg-red-100 text-red-800'
  },
  {
    id: 'ops',
    name: 'Operations',
    description: 'Platform operations and user management',
    permissions: [
      'user.read',
      'user.write',
      'content.read',
      'content.write',
      'report.read',
      'report.write',
      'audit.read'
    ],
    color: 'bg-blue-100 text-blue-800'
  },
  {
    id: 'support',
    name: 'Support',
    description: 'Customer support and basic user assistance',
    permissions: [
      'user.read',
      'content.read',
      'report.read'
    ],
    color: 'bg-green-100 text-green-800'
  },
  {
    id: 'moderator',
    name: 'Moderator',
    description: 'Content moderation and safety',
    permissions: [
      'user.read',
      'content.read',
      'content.write',
      'report.read',
      'report.write'
    ],
    color: 'bg-purple-100 text-purple-800'
  },
  {
    id: 'finance',
    name: 'Finance',
    description: 'Financial data and payment management',
    permissions: [
      'payment.read',
      'payment.write',
      'report.read',
      'audit.read'
    ],
    color: 'bg-yellow-100 text-yellow-800'
  }
];

const PERMISSION_CATEGORIES = {
  'user': 'User Management',
  'payment': 'Payment & Finance',
  'content': 'Content Management',
  'report': 'Reports & Analytics',
  'settings': 'System Settings',
  'audit': 'Audit Logs'
};

interface RoleBasedAccessControlProps {
  adminId: string;
  accessToken: string;
}

export function RoleBasedAccessControl({ adminId, accessToken }: RoleBasedAccessControlProps) {
  const [staffMembers, setStaffMembers] = useState<StaffMember[]>([]);
  const [accessLogs, setAccessLogs] = useState<AccessLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddUser, setShowAddUser] = useState(false);
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserName, setNewUserName] = useState('');
  const [newUserRole, setNewUserRole] = useState('support');
  const [maskSensitiveData, setMaskSensitiveData] = useState(true);
  const [activeTab, setActiveTab] = useState<'members' | 'logs' | 'review'>('members');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    await Promise.all([
      loadStaffMembers(),
      loadAccessLogs()
    ]);
    setLoading(false);
  };

  const loadStaffMembers = async () => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-cbd74580/rbac/staff`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`
          }
        }
      );

      if (response.ok) {
        const data = await response.json();
        setStaffMembers(data.staff || []);
      }
    } catch (error) {
      console.error('Error loading staff members:', error);
    }
  };

  const loadAccessLogs = async () => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-cbd74580/rbac/access-logs?limit=100`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`
          }
        }
      );

      if (response.ok) {
        const data = await response.json();
        setAccessLogs(data.logs || []);
      }
    } catch (error) {
      console.error('Error loading access logs:', error);
    }
  };

  const addStaffMember = async () => {
    if (!newUserEmail || !newUserName) {
      toast.error('Please provide email and name');
      return;
    }

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-cbd74580/rbac/staff`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            email: newUserEmail,
            name: newUserName,
            role: newUserRole
          })
        }
      );

      if (response.ok) {
        toast.success('Staff member added successfully');
        setNewUserEmail('');
        setNewUserName('');
        setNewUserRole('support');
        setShowAddUser(false);
        loadStaffMembers();
      } else {
        toast.error('Failed to add staff member');
      }
    } catch (error) {
      console.error('Error adding staff member:', error);
      toast.error('Failed to add staff member');
    }
  };

  const updateStaffRole = async (staffId: string, newRole: string) => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-cbd74580/rbac/staff/${staffId}`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ role: newRole })
        }
      );

      if (response.ok) {
        toast.success('Role updated successfully');
        loadStaffMembers();
      } else {
        toast.error('Failed to update role');
      }
    } catch (error) {
      console.error('Error updating role:', error);
      toast.error('Failed to update role');
    }
  };

  const toggleStaffStatus = async (staffId: string, active: boolean) => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-cbd74580/rbac/staff/${staffId}/status`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ active })
        }
      );

      if (response.ok) {
        toast.success(`Staff member ${active ? 'activated' : 'deactivated'}`);
        loadStaffMembers();
      } else {
        toast.error('Failed to update status');
      }
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Failed to update status');
    }
  };

  const removeStaffMember = async (staffId: string) => {
    if (!confirm('Are you sure you want to remove this staff member?')) {
      return;
    }

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-cbd74580/rbac/staff/${staffId}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${accessToken}`
          }
        }
      );

      if (response.ok) {
        toast.success('Staff member removed');
        loadStaffMembers();
      } else {
        toast.error('Failed to remove staff member');
      }
    } catch (error) {
      console.error('Error removing staff member:', error);
      toast.error('Failed to remove staff member');
    }
  };

  const maskData = (data: string): string => {
    if (!maskSensitiveData) return data;
    if (data.includes('@')) {
      // Mask email
      const [local, domain] = data.split('@');
      return `${local.slice(0, 2)}***@${domain}`;
    }
    // Mask other data
    return data.slice(0, 4) + '***';
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
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl">Role-Based Access Control</h2>
          <p className="text-gray-600 mt-1">
            Manage staff access and monitor system usage
          </p>
        </div>
        <Button
          onClick={() => setShowAddUser(true)}
          className="bg-[#5d9827] hover:bg-[#4a7a1f]"
        >
          <UserPlus className="w-4 h-4 mr-2" />
          Add Staff Member
        </Button>
      </div>

      {/* Security Notice */}
      <Card className="p-4 bg-amber-50 border-amber-200">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-amber-900">
            <p className="font-medium mb-1">Least Privilege Principle</p>
            <p>
              Grant staff members only the minimum permissions necessary for their role.
              All access is logged and reviewed quarterly. Sensitive data is masked by default.
            </p>
          </div>
        </div>
      </Card>

      {/* Tabs */}
      <div className="flex gap-2 border-b">
        <button
          onClick={() => setActiveTab('members')}
          className={`px-4 py-2 ${
            activeTab === 'members'
              ? 'border-b-2 border-[#625d9c] text-[#625d9c]'
              : 'text-gray-600'
          }`}
        >
          <Users className="w-4 h-4 inline mr-2" />
          Staff Members
        </button>
        <button
          onClick={() => setActiveTab('logs')}
          className={`px-4 py-2 ${
            activeTab === 'logs'
              ? 'border-b-2 border-[#625d9c] text-[#625d9c]'
              : 'text-gray-600'
          }`}
        >
          <FileText className="w-4 h-4 inline mr-2" />
          Access Logs
        </button>
        <button
          onClick={() => setActiveTab('review')}
          className={`px-4 py-2 ${
            activeTab === 'review'
              ? 'border-b-2 border-[#625d9c] text-[#625d9c]'
              : 'text-gray-600'
          }`}
        >
          <Clock className="w-4 h-4 inline mr-2" />
          Quarterly Review
        </button>
      </div>

      {/* Staff Members Tab */}
      {activeTab === 'members' && (
        <div className="space-y-4">
          {/* Roles Overview */}
          <Card className="p-6">
            <h3 className="text-xl mb-4">Role Definitions</h3>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {ROLES.map((role) => (
                <Card key={role.id} className="p-4">
                  <Badge className={role.color}>{role.name}</Badge>
                  <p className="text-sm text-gray-600 mt-2 mb-3">
                    {role.description}
                  </p>
                  <details className="text-xs">
                    <summary className="cursor-pointer text-[#625d9c] hover:underline">
                      View permissions ({role.permissions.length})
                    </summary>
                    <ul className="mt-2 space-y-1 text-gray-600">
                      {role.permissions.map((perm) => (
                        <li key={perm}>• {perm}</li>
                      ))}
                    </ul>
                  </details>
                </Card>
              ))}
            </div>
          </Card>

          {/* Data Masking Toggle */}
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {maskSensitiveData ? (
                  <EyeOff className="w-5 h-5 text-gray-600" />
                ) : (
                  <Eye className="w-5 h-5 text-gray-600" />
                )}
                <Label>Mask Sensitive Data</Label>
              </div>
              <Switch
                checked={maskSensitiveData}
                onCheckedChange={setMaskSensitiveData}
              />
            </div>
          </Card>

          {/* Staff List */}
          <Card className="p-6">
            <h3 className="text-xl mb-4">Staff Members ({staffMembers.length})</h3>
            <div className="space-y-3">
              {staffMembers.map((staff) => {
                const role = ROLES.find(r => r.id === staff.role);
                return (
                  <Card key={staff.id} className="p-4">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h4 className="font-medium">{maskData(staff.name)}</h4>
                          <Badge className={role?.color}>
                            {role?.name}
                          </Badge>
                          {!staff.active && (
                            <Badge variant="outline" className="text-red-600">
                              Inactive
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-gray-600">
                          {maskData(staff.email)}
                        </p>
                        <div className="flex gap-4 text-xs text-gray-500 mt-2">
                          <span>Added: {new Date(staff.createdAt).toLocaleDateString()}</span>
                          {staff.lastAccess && (
                            <span>Last access: {new Date(staff.lastAccess).toLocaleDateString()}</span>
                          )}
                          <span>Access count: {staff.accessCount}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Select
                          value={staff.role}
                          onValueChange={(value) => updateStaffRole(staff.id, value)}
                        >
                          <SelectTrigger className="w-32">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {ROLES.map((role) => (
                              <SelectItem key={role.id} value={role.id}>
                                {role.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>

                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => toggleStaffStatus(staff.id, !staff.active)}
                        >
                          {staff.active ? (
                            <Lock className="w-4 h-4" />
                          ) : (
                            <Unlock className="w-4 h-4" />
                          )}
                        </Button>

                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => removeStaffMember(staff.id)}
                          className="text-red-600 hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                );
              })}

              {staffMembers.length === 0 && (
                <p className="text-center text-gray-500 py-8">
                  No staff members added yet
                </p>
              )}
            </div>
          </Card>
        </div>
      )}

      {/* Access Logs Tab */}
      {activeTab === 'logs' && (
        <Card className="p-6">
          <h3 className="text-xl mb-4">Access Audit Log</h3>
          <div className="space-y-2">
            {accessLogs.map((log) => (
              <div
                key={log.id}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg text-sm"
              >
                <div className="flex items-center gap-3 flex-1">
                  {log.success ? (
                    <CheckCircle2 className="w-4 h-4 text-green-600" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-red-600" />
                  )}
                  <div>
                    <p className="font-medium">
                      {maskData(log.userName)} - {log.action}
                    </p>
                    <p className="text-gray-600">
                      {log.resource} • {maskData(log.ipAddress)}
                    </p>
                  </div>
                </div>
                <span className="text-gray-500 text-xs">
                  {new Date(log.timestamp).toLocaleString()}
                </span>
              </div>
            ))}

            {accessLogs.length === 0 && (
              <p className="text-center text-gray-500 py-8">
                No access logs available
              </p>
            )}
          </div>
        </Card>
      )}

      {/* Quarterly Review Tab */}
      {activeTab === 'review' && (
        <Card className="p-6">
          <h3 className="text-xl mb-4">Quarterly Access Review</h3>
          <p className="text-gray-600 mb-4">
            Review staff access permissions and activity quarterly to ensure compliance
            with least privilege principles.
          </p>

          <div className="space-y-4">
            <Card className="p-4 bg-blue-50 border-blue-200">
              <h4 className="font-medium mb-2">Next Review Due</h4>
              <p className="text-sm text-gray-700">
                Q4 2025 - Due: December 31, 2025
              </p>
            </Card>

            <Card className="p-4">
              <h4 className="font-medium mb-3">Review Checklist</h4>
              <ul className="space-y-2 text-sm">
                <li className="flex items-center gap-2">
                  <input type="checkbox" className="rounded" />
                  Verify all staff members still require access
                </li>
                <li className="flex items-center gap-2">
                  <input type="checkbox" className="rounded" />
                  Confirm roles and permissions are appropriate
                </li>
                <li className="flex items-center gap-2">
                  <input type="checkbox" className="rounded" />
                  Review access patterns for anomalies
                </li>
                <li className="flex items-center gap-2">
                  <input type="checkbox" className="rounded" />
                  Remove inactive accounts (no access in 90+ days)
                </li>
                <li className="flex items-center gap-2">
                  <input type="checkbox" className="rounded" />
                  Document review findings
                </li>
              </ul>
            </Card>

            <Button className="w-full bg-[#5d9827] hover:bg-[#4a7a1f]">
              Generate Review Report
            </Button>
          </div>
        </Card>
      )}

      {/* Add User Modal */}
      {showAddUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="p-6 max-w-md w-full m-4">
            <h3 className="text-xl mb-4">Add Staff Member</h3>
            <div className="space-y-4">
              <div>
                <Label htmlFor="new-name">Full Name</Label>
                <Input
                  id="new-name"
                  value={newUserName}
                  onChange={(e) => setNewUserName(e.target.value)}
                  placeholder="John Doe"
                />
              </div>

              <div>
                <Label htmlFor="new-email">Email Address</Label>
                <Input
                  id="new-email"
                  type="email"
                  value={newUserEmail}
                  onChange={(e) => setNewUserEmail(e.target.value)}
                  placeholder="john@knowledgefonsacademy.com"
                />
              </div>

              <div>
                <Label htmlFor="new-role">Role</Label>
                <Select value={newUserRole} onValueChange={setNewUserRole}>
                  <SelectTrigger id="new-role">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ROLES.map((role) => (
                      <SelectItem key={role.id} value={role.id}>
                        {role.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-600 mt-1">
                  {ROLES.find(r => r.id === newUserRole)?.description}
                </p>
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  variant="outline"
                  onClick={() => setShowAddUser(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={addStaffMember}
                  className="flex-1 bg-[#5d9827] hover:bg-[#4a7a1f]"
                >
                  Add Member
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
