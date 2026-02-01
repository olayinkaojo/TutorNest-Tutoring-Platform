import React, { useState, useEffect } from 'react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Badge } from '../ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { 
  Search,
  User,
  Mail,
  Phone,
  Calendar,
  Eye,
  EyeOff,
  Lock,
  Unlock,
  Ban,
  CheckCircle2,
  AlertTriangle,
  MessageSquare,
  CreditCard,
  History,
  Shield,
  Loader2,
  Download,
  Filter
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { projectId, publicAnonKey } from '../../utils/supabase/info';

interface UserRecord {
  id: string;
  email: string;
  name: string;
  role: 'parent' | 'tutor' | 'student';
  status: 'active' | 'suspended' | 'banned' | 'deleted';
  verificationStatus: 'verified' | 'pending' | 'rejected';
  createdAt: string;
  lastLogin?: string;
  subscriptionTier?: string;
  totalSessions: number;
  totalSpent: number;
  flagCount: number;
  notes: string;
}

interface UserActivity {
  id: string;
  type: string;
  description: string;
  timestamp: string;
  severity: 'info' | 'warning' | 'error';
}

interface UserManagementProps {
  adminId: string;
  accessToken: string;
  adminRole: string;
}

export function UserManagement({ adminId, accessToken, adminRole }: UserManagementProps) {
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<UserRecord[]>([]);
  const [selectedUser, setSelectedUser] = useState<UserRecord | null>(null);
  const [userActivity, setUserActivity] = useState<UserActivity[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [maskData, setMaskData] = useState(true);
  const [actionNote, setActionNote] = useState('');

  useEffect(() => {
    loadUsers();
  }, []);

  useEffect(() => {
    filterUsers();
  }, [users, searchQuery, roleFilter, statusFilter]);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-cbd74580/admin/users`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`
          }
        }
      );

      if (response.ok) {
        const data = await response.json();
        setUsers(data.users || []);
      }
    } catch (error) {
      console.error('Error loading users:', error);
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const loadUserActivity = async (userId: string) => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-cbd74580/admin/users/${userId}/activity`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`
          }
        }
      );

      if (response.ok) {
        const data = await response.json();
        setUserActivity(data.activity || []);
      }
    } catch (error) {
      console.error('Error loading user activity:', error);
    }
  };

  const filterUsers = () => {
    let filtered = [...users];

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(user => 
        user.email.toLowerCase().includes(query) ||
        user.name.toLowerCase().includes(query) ||
        user.id.toLowerCase().includes(query)
      );
    }

    // Role filter
    if (roleFilter !== 'all') {
      filtered = filtered.filter(user => user.role === roleFilter);
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(user => user.status === statusFilter);
    }

    setFilteredUsers(filtered);
  };

  const viewUserDetails = (user: UserRecord) => {
    setSelectedUser(user);
    loadUserActivity(user.id);
  };

  const updateUserStatus = async (userId: string, status: string, reason: string) => {
    if (!reason.trim()) {
      toast.error('Please provide a reason for this action');
      return;
    }

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-cbd74580/admin/users/${userId}/status`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            status,
            reason,
            adminId
          })
        }
      );

      if (response.ok) {
        toast.success(`User ${status}`);
        setActionNote('');
        loadUsers();
        if (selectedUser) {
          loadUserActivity(selectedUser.id);
        }
      } else {
        toast.error('Failed to update user status');
      }
    } catch (error) {
      console.error('Error updating user status:', error);
      toast.error('Failed to update user status');
    }
  };

  const impersonateUser = async (userId: string) => {
    if (!confirm('Are you sure you want to impersonate this user? All actions will be logged.')) {
      return;
    }

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-cbd74580/admin/users/${userId}/impersonate`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ adminId })
        }
      );

      if (response.ok) {
        const data = await response.json();
        toast.success('Impersonation session created');
        // Redirect to user view with impersonation token
        window.open(`/impersonate?token=${data.token}`, '_blank');
      } else {
        toast.error('Failed to create impersonation session');
      }
    } catch (error) {
      console.error('Error impersonating user:', error);
      toast.error('Failed to impersonate user');
    }
  };

  const exportUserData = async (userId: string) => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-cbd74580/admin/users/${userId}/export`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`
          }
        }
      );

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `user-${userId}-export.json`;
        a.click();
        window.URL.revokeObjectURL(url);
        toast.success('User data exported');
      } else {
        toast.error('Failed to export user data');
      }
    } catch (error) {
      console.error('Error exporting user data:', error);
      toast.error('Failed to export user data');
    }
  };

  const reset2FA = async (userId: string, reason: string) => {
    if (!reason.trim()) {
      toast.error('Please provide a reason for resetting 2FA');
      return;
    }

    if (!confirm('Are you sure you want to reset 2FA for this user?')) {
      return;
    }

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-cbd74580/admin/users/${userId}/reset-2fa`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ reason })
        }
      );

      if (response.ok) {
        toast.success('2FA reset successfully');
        setActionNote('');
        loadUserActivity(userId);
      } else {
        toast.error('Failed to reset 2FA');
      }
    } catch (error) {
      console.error('Error resetting 2FA:', error);
      toast.error('Failed to reset 2FA');
    }
  };

  const forceLogout = async (userId: string, reason: string) => {
    if (!reason.trim()) {
      toast.error('Please provide a reason for forcing logout');
      return;
    }

    if (!confirm('Are you sure you want to force logout this user?')) {
      return;
    }

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-cbd74580/admin/users/${userId}/force-logout`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ reason })
        }
      );

      if (response.ok) {
        toast.success('User logged out successfully');
        setActionNote('');
        loadUserActivity(userId);
      } else {
        toast.error('Failed to force logout');
      }
    } catch (error) {
      console.error('Error forcing logout:', error);
      toast.error('Failed to force logout');
    }
  };

  const maskValue = (value: string, type: 'email' | 'phone' | 'name' = 'email'): string => {
    if (!maskData) return value;
    
    if (type === 'email') {
      const [local, domain] = value.split('@');
      return `${local.slice(0, 2)}***@${domain}`;
    } else if (type === 'phone') {
      return `***${value.slice(-4)}`;
    } else {
      return `${value.slice(0, 2)}***`;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'suspended':
        return 'bg-yellow-100 text-yellow-800';
      case 'banned':
        return 'bg-red-100 text-red-800';
      case 'deleted':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'parent':
        return 'bg-blue-100 text-blue-800';
      case 'tutor':
        return 'bg-purple-100 text-purple-800';
      case 'student':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
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
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl">User Management</h2>
          <p className="text-gray-600 mt-1">
            Search, view, and manage users safely
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setMaskData(!maskData)}
          >
            {maskData ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </Button>
          <Button variant="outline" size="sm" onClick={loadUsers}>
            <Download className="w-4 h-4 mr-2" />
            Export All
          </Button>
        </div>
      </div>

      {/* Search and Filters */}
      <Card className="p-4">
        <div className="grid md:grid-cols-4 gap-4">
          <div className="md:col-span-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search by name, email, or ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger>
              <SelectValue placeholder="All Roles" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Roles</SelectItem>
              <SelectItem value="parent">Parents</SelectItem>
              <SelectItem value="tutor">Tutors</SelectItem>
              <SelectItem value="student">Students</SelectItem>
            </SelectContent>
          </Select>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger>
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="suspended">Suspended</SelectItem>
              <SelectItem value="banned">Banned</SelectItem>
              <SelectItem value="deleted">Deleted</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-4 mt-4 text-sm text-gray-600">
          <span>Total: {users.length}</span>
          <span>Filtered: {filteredUsers.length}</span>
          <span>Active: {users.filter(u => u.status === 'active').length}</span>
          <span>Flagged: {users.filter(u => u.flagCount > 0).length}</span>
        </div>
      </Card>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* User List */}
        <Card className="p-6">
          <h3 className="text-xl mb-4">Users</h3>
          <div className="space-y-2 max-h-[600px] overflow-y-auto">
            {filteredUsers.map((user) => (
              <Card
                key={user.id}
                className={`p-4 cursor-pointer hover:border-[#625d9c] transition-colors ${
                  selectedUser?.id === user.id ? 'border-[#625d9c] border-2' : ''
                }`}
                onClick={() => viewUserDetails(user)}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h4 className="font-medium">{maskValue(user.name, 'name')}</h4>
                      <Badge className={getRoleColor(user.role)}>
                        {user.role}
                      </Badge>
                      <Badge className={getStatusColor(user.status)}>
                        {user.status}
                      </Badge>
                      {user.flagCount > 0 && (
                        <Badge variant="outline" className="text-red-600">
                          {user.flagCount} flags
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-gray-600">{maskValue(user.email)}</p>
                    <div className="flex gap-3 text-xs text-gray-500 mt-2">
                      <span>ID: {user.id.slice(0, 8)}...</span>
                      <span>Sessions: {user.totalSessions}</span>
                      {user.role === 'parent' && (
                        <span>Spent: £{user.totalSpent.toFixed(2)}</span>
                      )}
                    </div>
                  </div>
                  {user.verificationStatus === 'verified' && (
                    <CheckCircle2 className="w-5 h-5 text-green-600" />
                  )}
                  {user.verificationStatus === 'pending' && (
                    <AlertTriangle className="w-5 h-5 text-yellow-600" />
                  )}
                </div>
              </Card>
            ))}

            {filteredUsers.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                No users found
              </div>
            )}
          </div>
        </Card>

        {/* User Details */}
        <Card className="p-6">
          {selectedUser ? (
            <Tabs defaultValue="overview" className="space-y-4">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="activity">Activity</TabsTrigger>
                <TabsTrigger value="actions">Actions</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-4">
                <div>
                  <h3 className="text-xl mb-4">{maskValue(selectedUser.name, 'name')}</h3>
                  
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm">
                      <Mail className="w-4 h-4 text-gray-400" />
                      <span>{maskValue(selectedUser.email)}</span>
                    </div>

                    <div className="flex items-center gap-2 text-sm">
                      <User className="w-4 h-4 text-gray-400" />
                      <Badge className={getRoleColor(selectedUser.role)}>
                        {selectedUser.role}
                      </Badge>
                      <Badge className={getStatusColor(selectedUser.status)}>
                        {selectedUser.status}
                      </Badge>
                    </div>

                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="w-4 h-4 text-gray-400" />
                      <span>Joined: {new Date(selectedUser.createdAt).toLocaleDateString()}</span>
                    </div>

                    {selectedUser.lastLogin && (
                      <div className="flex items-center gap-2 text-sm">
                        <History className="w-4 h-4 text-gray-400" />
                        <span>Last login: {new Date(selectedUser.lastLogin).toLocaleString()}</span>
                      </div>
                    )}

                    {selectedUser.subscriptionTier && (
                      <div className="flex items-center gap-2 text-sm">
                        <CreditCard className="w-4 h-4 text-gray-400" />
                        <span>Subscription: {selectedUser.subscriptionTier}</span>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-3 gap-4 mt-6">
                    <Card className="p-3 text-center">
                      <div className="text-2xl font-bold text-[#625d9c]">
                        {selectedUser.totalSessions}
                      </div>
                      <div className="text-xs text-gray-600">Sessions</div>
                    </Card>
                    <Card className="p-3 text-center">
                      <div className="text-2xl font-bold text-[#5d9827]">
                        £{selectedUser.totalSpent.toFixed(0)}
                      </div>
                      <div className="text-xs text-gray-600">Spent</div>
                    </Card>
                    <Card className="p-3 text-center">
                      <div className="text-2xl font-bold text-red-600">
                        {selectedUser.flagCount}
                      </div>
                      <div className="text-xs text-gray-600">Flags</div>
                    </Card>
                  </div>

                  {selectedUser.notes && (
                    <Card className="p-4 mt-4 bg-amber-50">
                      <p className="text-sm"><strong>Admin Notes:</strong></p>
                      <p className="text-sm mt-1">{selectedUser.notes}</p>
                    </Card>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="activity" className="space-y-2">
                <h4 className="font-medium mb-3">Recent Activity</h4>
                <div className="space-y-2 max-h-[400px] overflow-y-auto">
                  {userActivity.map((activity) => (
                    <Card key={activity.id} className="p-3">
                      <div className="flex items-start gap-3">
                        {activity.severity === 'error' && (
                          <AlertTriangle className="w-4 h-4 text-red-600 mt-0.5" />
                        )}
                        {activity.severity === 'warning' && (
                          <AlertTriangle className="w-4 h-4 text-yellow-600 mt-0.5" />
                        )}
                        {activity.severity === 'info' && (
                          <CheckCircle2 className="w-4 h-4 text-blue-600 mt-0.5" />
                        )}
                        <div className="flex-1">
                          <p className="text-sm font-medium">{activity.type}</p>
                          <p className="text-xs text-gray-600">{activity.description}</p>
                          <p className="text-xs text-gray-500 mt-1">
                            {new Date(activity.timestamp).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    </Card>
                  ))}

                  {userActivity.length === 0 && (
                    <p className="text-center text-gray-500 py-8 text-sm">
                      No recent activity
                    </p>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="actions" className="space-y-4">
                <h4 className="font-medium mb-3">Admin Actions</h4>

                <div className="space-y-4">
                  <div>
                    <Label htmlFor="action-note">Action Note (Required)</Label>
                    <Input
                      id="action-note"
                      placeholder="Reason for this action..."
                      value={actionNote}
                      onChange={(e) => setActionNote(e.target.value)}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    {selectedUser.status === 'active' && (
                      <>
                        <Button
                          variant="outline"
                          onClick={() => updateUserStatus(selectedUser.id, 'suspended', actionNote)}
                          className="w-full"
                        >
                          <Lock className="w-4 h-4 mr-2" />
                          Suspend
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => updateUserStatus(selectedUser.id, 'banned', actionNote)}
                          className="w-full text-red-600"
                        >
                          <Ban className="w-4 h-4 mr-2" />
                          Ban
                        </Button>
                      </>
                    )}

                    {selectedUser.status === 'suspended' && (
                      <Button
                        variant="outline"
                        onClick={() => updateUserStatus(selectedUser.id, 'active', actionNote)}
                        className="w-full col-span-2"
                      >
                        <Unlock className="w-4 h-4 mr-2" />
                        Reactivate
                      </Button>
                    )}

                    {selectedUser.status === 'banned' && (
                      <Button
                        variant="outline"
                        onClick={() => updateUserStatus(selectedUser.id, 'active', actionNote)}
                        className="w-full col-span-2"
                      >
                        <Unlock className="w-4 h-4 mr-2" />
                        Unban
                      </Button>
                    )}
                  </div>

                  <div className="border-t pt-4 space-y-2">
                    <Button
                      variant="outline"
                      onClick={() => reset2FA(selectedUser.id, actionNote)}
                      className="w-full"
                    >
                      <Shield className="w-4 h-4 mr-2" />
                      Reset 2FA
                    </Button>

                    <Button
                      variant="outline"
                      onClick={() => forceLogout(selectedUser.id, actionNote)}
                      className="w-full"
                    >
                      <Lock className="w-4 h-4 mr-2" />
                      Force Logout
                    </Button>

                    <Button
                      variant="outline"
                      onClick={() => impersonateUser(selectedUser.id)}
                      className="w-full"
                    >
                      <Eye className="w-4 h-4 mr-2" />
                      Impersonate User
                    </Button>

                    <Button
                      variant="outline"
                      onClick={() => exportUserData(selectedUser.id)}
                      className="w-full"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Export Data
                    </Button>

                    <Button
                      variant="outline"
                      onClick={() => window.open(`/messages?userId=${selectedUser.id}`, '_blank')}
                      className="w-full"
                    >
                      <MessageSquare className="w-4 h-4 mr-2" />
                      View Messages
                    </Button>
                  </div>

                  <Card className="p-4 bg-amber-50 border-amber-200">
                    <div className="flex items-start gap-2">
                      <Shield className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                      <div className="text-sm text-amber-900">
                        <p className="font-medium">All actions are logged</p>
                        <p className="mt-1">
                          User actions are audited and stored for compliance. Provide detailed
                          notes for all status changes.
                        </p>
                      </div>
                    </div>
                  </Card>
                </div>
              </TabsContent>
            </Tabs>
          ) : (
            <div className="text-center py-12 text-gray-500">
              <User className="w-16 h-16 mx-auto mb-4 text-gray-400" />
              <p>Select a user to view details</p>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}