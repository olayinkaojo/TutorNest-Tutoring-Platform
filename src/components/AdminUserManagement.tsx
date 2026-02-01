import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Avatar, AvatarFallback } from './ui/avatar';
import { Alert, AlertDescription } from './ui/alert';
import { 
  Search, 
  Filter,
  UserCheck,
  UserX,
  Mail,
  Shield,
  Eye,
  Ban,
  CheckCircle,
  AlertCircle,
  Users,
  MoreVertical,
  DollarSign
} from 'lucide-react';
import { projectId } from '../utils/supabase/info';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';

interface AdminUserManagementProps {
  session: any;
}

export function AdminUserManagement({ session }: AdminUserManagementProps) {
  const [users, setUsers] = useState<any[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    loadUsers();
  }, []);

  useEffect(() => {
    filterUsers();
  }, [searchQuery, roleFilter, statusFilter, users]);

  const loadUsers = async () => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-cbd74580/admin/users`,
        {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setUsers(data.users || []);
      }
    } catch (err) {
      console.error('Error loading users:', err);
    } finally {
      setLoading(false);
    }
  };

  const filterUsers = () => {
    let filtered = [...users];

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(user => 
        user.firstName?.toLowerCase().includes(query) ||
        user.lastName?.toLowerCase().includes(query) ||
        user.email?.toLowerCase().includes(query)
      );
    }

    // Role filter
    if (roleFilter !== 'all') {
      filtered = filtered.filter(user => user.role === roleFilter);
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(user => {
        if (statusFilter === 'verified') return user.verificationStatus === 'verified';
        if (statusFilter === 'pending') return user.verificationStatus === 'pending';
        if (statusFilter === 'suspended') return user.suspended === true;
        return true;
      });
    }

    setFilteredUsers(filtered);
  };

  const handleSuspendUser = async (userId: string) => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-cbd74580/admin/users/${userId}/suspend`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
        }
      );

      if (response.ok) {
        setSuccess('User suspended successfully');
        setTimeout(() => setSuccess(''), 3000);
        loadUsers();
      } else {
        throw new Error('Failed to suspend user');
      }
    } catch (err: any) {
      setError(err.message);
      setTimeout(() => setError(''), 3000);
    }
  };

  const handleReactivateUser = async (userId: string) => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-cbd74580/admin/users/${userId}/reactivate`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
        }
      );

      if (response.ok) {
        setSuccess('User reactivated successfully');
        setTimeout(() => setSuccess(''), 3000);
        loadUsers();
      } else {
        throw new Error('Failed to reactivate user');
      }
    } catch (err: any) {
      setError(err.message);
      setTimeout(() => setError(''), 3000);
    }
  };

  const UserCard = ({ user }: { user: any }) => {
    const getRoleColor = (role: string) => {
      switch (role) {
        case 'tutor': return '#625d9c';
        case 'parent': return '#5d9827';
        case 'student': return '#3b82f6';
        case 'admin': return '#ef4444';
        default: return '#6b7280';
      }
    };

    const getStatusBadge = () => {
      if (user.suspended) {
        return <Badge variant="destructive">Suspended</Badge>;
      }
      if (user.role === 'tutor') {
        switch (user.verificationStatus) {
          case 'verified':
            return <Badge variant="default" style={{ backgroundColor: '#5d9827' }}>Verified</Badge>;
          case 'pending':
            return <Badge variant="secondary" style={{ backgroundColor: '#fef3c7', color: '#92400e' }}>Pending</Badge>;
          case 'rejected':
            return <Badge variant="destructive">Rejected</Badge>;
          default:
            return <Badge variant="outline">Not Submitted</Badge>;
        }
      }
      return <Badge variant="outline">Active</Badge>;
    };

    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-4 flex-1">
              <Avatar className="w-12 h-12">
                <AvatarFallback style={{ backgroundColor: getRoleColor(user.role), color: 'white' }}>
                  {user.firstName?.[0]}{user.lastName?.[0]}
                </AvatarFallback>
              </Avatar>

              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h4>{user.firstName} {user.lastName}</h4>
                  <span>{getStatusBadge()}</span>
                </div>

                <p className="text-sm text-gray-600 mb-2">{user.email}</p>

                <div className="flex items-center gap-3 text-sm text-gray-600">
                  <Badge 
                    key="role-badge"
                    variant="outline" 
                    style={{ backgroundColor: `${getRoleColor(user.role || 'none')}15`, color: getRoleColor(user.role || 'none') }}
                  >
                    {user.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : 'No Role'}
                  </Badge>
                  
                  {user.role === 'tutor' && user.dbsStatus === 'verified' && (
                    <span key="dbs-badge" className="flex items-center gap-1 text-green-600">
                      <Shield className="w-3 h-3" />
                      DBS Verified
                    </span>
                  )}
                  
                  {user.role === 'tutor' && (
                    <span key="rate-badge" className="flex items-center gap-1">
                      <DollarSign className="w-3 h-3" />
                      £{user.hourlyRate || 'N/A'}/hr
                    </span>
                  )}

                  <span key="joined-date" className="text-xs text-gray-500">
                    Joined {new Date(user.createdAt || Date.now()).toLocaleDateString()}
                  </span>
                </div>

                {user.role === 'tutor' && user.subjects && Array.isArray(user.subjects) && (
                  <div className="flex gap-1 mt-2 flex-wrap">
                    {user.subjects.slice(0, 3).map((subject: string, index: number) => (
                      <Badge key={`subject-${user.userId}-${index}`} variant="secondary" className="text-xs">
                        {subject}
                      </Badge>
                    ))}
                    {user.subjects.length > 3 && (
                      <Badge variant="secondary" className="text-xs">
                        +{user.subjects.length - 3}
                      </Badge>
                    )}
                  </div>
                )}
              </div>
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm">
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem>
                  <Eye className="w-4 h-4 mr-2" />
                  View Profile
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Mail className="w-4 h-4 mr-2" />
                  Send Email
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {user.suspended ? (
                  <DropdownMenuItem onClick={() => handleReactivateUser(user.userId)}>
                    <UserCheck className="w-4 h-4 mr-2 text-green-600" />
                    Reactivate User
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem onClick={() => handleSuspendUser(user.userId)}>
                    <Ban className="w-4 h-4 mr-2 text-red-600" />
                    Suspend User
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardContent>
      </Card>
    );
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <div 
          className="w-8 h-8 border-4 border-t-transparent rounded-full animate-spin mx-auto"
          style={{ borderColor: '#625d9c', borderTopColor: 'transparent' }}
        />
        <p className="text-gray-600 mt-4">Loading users...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Success/Error Messages */}
      {success && (
        <Alert className="bg-green-50 border-green-200">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">{success}</AlertDescription>
        </Alert>
      )}

      {error && (
        <Alert className="bg-red-50 border-red-200">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">{error}</AlertDescription>
        </Alert>
      )}

      {/* Stats Summary */}
      <div className="grid md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-gray-600 mb-1">Total Users</p>
            <h3>{users.length}</h3>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-gray-600 mb-1">Tutors</p>
            <h3>{users.filter(u => u.role === 'tutor').length}</h3>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-gray-600 mb-1">Parents</p>
            <h3>{users.filter(u => u.role === 'parent').length}</h3>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-gray-600 mb-1">Students</p>
            <h3>{users.filter(u => u.role === 'student').length}</h3>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search users by name or email..."
                className="pl-10"
              />
            </div>

            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-full md:w-40">
                <SelectValue placeholder="All Roles" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                <SelectItem value="tutor">Tutors</SelectItem>
                <SelectItem value="parent">Parents</SelectItem>
                <SelectItem value="student">Students</SelectItem>
                <SelectItem value="admin">Admins</SelectItem>
              </SelectContent>
            </Select>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-40">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="verified">Verified</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="suspended">Suspended</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="mt-4 flex items-center justify-between text-sm text-gray-600">
            <span>Showing {filteredUsers.length} of {users.length} users</span>
            {(searchQuery || roleFilter !== 'all' || statusFilter !== 'all') && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearchQuery('');
                  setRoleFilter('all');
                  setStatusFilter('all');
                }}
              >
                Clear Filters
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* User List */}
      <div className="space-y-4">
        {filteredUsers.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Users className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p className="text-gray-600">No users found matching your criteria</p>
            </CardContent>
          </Card>
        ) : (
          filteredUsers.map(user => (
            <UserCard key={user.userId} user={user} />
          ))
        )}
      </div>
    </div>
  );
}