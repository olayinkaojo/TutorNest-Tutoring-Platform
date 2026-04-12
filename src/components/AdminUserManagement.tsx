import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Avatar, AvatarFallback } from './ui/avatar';
import { Alert, AlertDescription } from './ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';
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

function getUserDisplayName(user: any): string {
  const displayName = user?.displayName?.trim();
  if (displayName) return displayName;

  const firstName = user?.firstName?.trim();
  const lastName = user?.lastName?.trim();
  const fullName = user?.fullName?.trim();
  const name = user?.name?.trim();

  if (firstName || lastName) {
    return `${firstName || ''} ${lastName || ''}`.trim();
  }

  if (fullName) return fullName;
  if (name) return name;

  if (user?.email) {
    return user.email.split('@')[0];
  }

  return 'Unknown Tutor';
}

function getUserInitials(user: any): string {
  const initials = user?.initials?.trim();
  if (initials) return initials;

  const firstName = user?.firstName?.trim();
  const lastName = user?.lastName?.trim();
  const fullName = user?.fullName?.trim() || user?.name?.trim();

  if (firstName || lastName) {
    return `${(firstName || '')[0] || ''}${(lastName || '')[0] || ''}`.toUpperCase();
  }

  if (fullName) {
    const parts = fullName.split(/\s+/).filter(Boolean);
    return parts.slice(0, 2).map((part) => part[0]).join('').toUpperCase();
  }

  if (user?.email) {
    return user.email.slice(0, 2).toUpperCase();
  }

  return 'UT';
}

function formatValue(value: any): string {
  if (Array.isArray(value)) {
    return value.length ? value.join(', ') : 'Not specified';
  }

  if (typeof value === 'boolean') {
    return value ? 'Yes' : 'No';
  }

  if (value === null || value === undefined || value === '') {
    return 'Not specified';
  }

  if (typeof value === 'number') {
    return Number.isFinite(value) ? String(value) : 'Not specified';
  }

  return String(value);
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
  const [selectedUser, setSelectedUser] = useState<any>(null);

  const tutorFields = selectedUser?.role === 'tutor'
    ? [
        { label: 'Full Name', value: selectedUser.displayName || getUserDisplayName(selectedUser) },
        { label: 'Email', value: selectedUser.email },
        { label: 'Phone Number', value: selectedUser.profileSummary?.phone || selectedUser.phone },
        { label: 'Location', value: selectedUser.profileSummary?.location || selectedUser.location },
        { label: 'Bio', value: selectedUser.profileSummary?.bio || selectedUser.bio },
        { label: 'Hourly Rate', value: selectedUser.profileSummary?.hourlyRate ?? selectedUser.hourlyRate ?? selectedUser.hourly_rate ? `₦${Number(selectedUser.profileSummary?.hourlyRate ?? selectedUser.hourlyRate ?? selectedUser.hourly_rate).toLocaleString()} / session` : '' },
        { label: 'Experience Years', value: selectedUser.profileSummary?.experienceYears ?? selectedUser.experienceYears ?? selectedUser.experience_years },
        { label: 'Qualifications', value: selectedUser.profileSummary?.qualifications || selectedUser.qualifications },
        { label: 'Teaching Style', value: selectedUser.profileSummary?.teachingStyle || selectedUser.teachingStyle || selectedUser.teaching_style },
        { label: 'Subjects', value: selectedUser.profileSummary?.subjects || selectedUser.subjects },
        { label: 'Age Groups', value: selectedUser.profileSummary?.ageGroups || selectedUser.ageGroups || selectedUser.age_groups },
        { label: 'Classes', value: selectedUser.profileSummary?.classes || selectedUser.classes },
        { label: 'Teaching Format', value: selectedUser.profileSummary?.teachingFormat || selectedUser.teachingFormat || selectedUser.teaching_format },
        { label: 'Group Size Preference', value: selectedUser.profileSummary?.groupSize || selectedUser.groupSize || selectedUser.group_size },
        { label: 'Travel Radius', value: selectedUser.profileSummary?.travelRadius ?? selectedUser.travelRadius ?? selectedUser.travel_radius ? `${selectedUser.profileSummary?.travelRadius ?? selectedUser.travelRadius ?? selectedUser.travel_radius} km` : '' },
        { label: 'Maximum Students', value: selectedUser.profileSummary?.maxStudents ?? selectedUser.maxStudents ?? selectedUser.max_students },
        { label: 'Exam Boards', value: selectedUser.profileSummary?.examBoards || selectedUser.examBoards || selectedUser.exam_boards },
        { label: 'Learning Difficulties Support', value: selectedUser.profileSummary?.learningDifficulties || selectedUser.learningDifficulties || selectedUser.learning_difficulties },
        { label: 'Teaching Methodologies', value: selectedUser.profileSummary?.methodologies || selectedUser.methodologies },
        { label: 'Languages Spoken', value: selectedUser.profileSummary?.languages || selectedUser.languages },
        { label: 'DBS Checked', value: selectedUser.profileSummary?.dbsChecked ?? selectedUser.dbsChecked ?? selectedUser.dbs_checked },
        { label: 'Insurance', value: selectedUser.profileSummary?.hasInsurance ?? selectedUser.hasInsurance ?? selectedUser.has_insurance },
        { label: 'Verification Status', value: selectedUser.profileSummary?.verificationStatus || selectedUser.verificationStatus },
        { label: 'Onboarding Complete', value: selectedUser.profileSummary?.onboardingComplete ?? selectedUser.onboardingComplete },
        { label: 'Status', value: selectedUser.status },
        { label: 'Created At', value: selectedUser.createdAt },
        { label: 'Updated At', value: selectedUser.updatedAt },
      ]
    : [];

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
        user.fullName?.toLowerCase().includes(query) ||
        user.name?.toLowerCase().includes(query) ||
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
                  {getUserInitials(user)}
                </AvatarFallback>
              </Avatar>

              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h4>{getUserDisplayName(user)}</h4>
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
                <DropdownMenuItem onClick={() => setSelectedUser(user)}>
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

      {/* Tutor Browser */}
      <Card>
        <CardHeader>
          <CardTitle>Tutor Profiles</CardTitle>
          <CardDescription>
            Quick browser for all tutors on the platform. Open any profile to review verification, subjects, and details.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {users.filter(user => user.role === 'tutor').length === 0 ? (
            <div className="py-10 text-center text-gray-500">
              <Users className="w-10 h-10 mx-auto mb-3 text-gray-300" />
              <p>No tutor profiles found</p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {users
                .filter(user => user.role === 'tutor')
                .map((user) => (
                  <div key={`tutor-browser-${user.userId}`} className="rounded-xl border bg-white p-4 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-start gap-3">
                      <Avatar className="w-12 h-12">
                        <AvatarFallback style={{ backgroundColor: '#625d9c', color: 'white' }}>
                          {getUserInitials(user)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <h4 className="truncate">{getUserDisplayName(user)}</h4>
                            <p className="text-xs text-gray-500 truncate">{user.email}</p>
                          </div>
                          {user.verificationStatus === 'verified' ? (
                            <Badge style={{ backgroundColor: '#dcfce7', color: '#166534' }}>Verified</Badge>
                          ) : (
                            <Badge variant="secondary" style={{ backgroundColor: '#fef3c7', color: '#92400e' }}>Pending</Badge>
                          )}
                        </div>

                        <div className="mt-3 flex flex-wrap gap-1.5">
                          {Array.isArray(user.subjects) && user.subjects.slice(0, 3).map((subject: string) => (
                            <Badge key={`${user.userId}-${subject}`} variant="secondary" className="text-[11px]">
                              {subject}
                            </Badge>
                          ))}
                          {Array.isArray(user.subjects) && user.subjects.length === 0 && (
                            <span className="text-xs text-gray-500">No subjects listed</span>
                          )}
                        </div>

                        <div className="mt-4 flex items-center justify-between text-xs text-gray-500">
                          <span>{user.hourlyRate ? `₦${user.hourlyRate}/hr` : 'Rate not set'}</span>
                          <span>{user.dbsStatus === 'verified' ? 'DBS verified' : 'DBS pending'}</span>
                        </div>

                        <Button
                          className="mt-4 w-full"
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedUser(user)}
                        >
                          <Eye className="w-4 h-4 mr-2" />
                          View Profile
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </CardContent>
      </Card>

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

      <Dialog open={!!selectedUser} onOpenChange={(open) => !open && setSelectedUser(null)}>
        <DialogContent className="max-w-3xl max-h-[88vh] overflow-y-auto">
          {selectedUser && (
            <>
              <DialogHeader>
                <DialogTitle>
                  {getUserDisplayName(selectedUser)}
                </DialogTitle>
                <DialogDescription>
                  {selectedUser.role === 'tutor' ? 'Tutor profile and verification details' : 'User profile details'}
                </DialogDescription>
              </DialogHeader>

              <div className="grid gap-6 md:grid-cols-[1.2fr_0.8fr]">
                <div className="space-y-4">
                  <Card>
                    <CardContent className="pt-6 space-y-4">
                      <div className="flex items-start gap-4">
                        <Avatar className="w-16 h-16">
                          <AvatarFallback style={{ backgroundColor: '#625d9c', color: 'white' }}>
                            {getUserInitials(selectedUser)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-xl font-semibold">{getUserDisplayName(selectedUser)}</h3>
                            <Badge variant="outline" style={{ backgroundColor: '#f5f3ff', color: '#625d9c' }}>
                              {selectedUser.role ? selectedUser.role.charAt(0).toUpperCase() + selectedUser.role.slice(1) : 'Unknown'}
                            </Badge>
                            {selectedUser.role === 'tutor' && (
                              <Badge
                                variant="secondary"
                                style={{
                                  backgroundColor: selectedUser.verificationStatus === 'verified' ? '#dcfce7' : '#fef3c7',
                                  color: selectedUser.verificationStatus === 'verified' ? '#166534' : '#92400e',
                                }}
                              >
                                {selectedUser.verificationStatus === 'verified' ? 'Verified Tutor' : 'Verification Pending'}
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-gray-600 mt-1">{selectedUser.email}</p>
                          <p className="text-sm text-gray-500 mt-1">
                            Joined {new Date(selectedUser.createdAt || Date.now()).toLocaleDateString()}
                            {selectedUser.lastLogin && ` • Last login ${new Date(selectedUser.lastLogin).toLocaleDateString()}`}
                          </p>
                        </div>
                      </div>

                      <div>
                        <p className="text-sm font-medium mb-2">Tutor Profile Fields</p>
                        <div className="grid gap-3 sm:grid-cols-2">
                          {tutorFields.map((field) => (
                            <div key={field.label} className="rounded-lg border p-3">
                              <p className="text-gray-500 text-xs mb-1">{field.label}</p>
                              <p className="font-medium whitespace-pre-wrap break-words">{formatValue(field.value)}</p>
                            </div>
                          ))}
                        </div>
                      </div>

                      {selectedUser.role === 'tutor' && (
                        <div>
                          <p className="text-sm font-medium mb-2">Raw Tutor Bio</p>
                          <div className="rounded-lg border bg-gray-50 p-4 text-sm text-gray-700 whitespace-pre-wrap">
                            {selectedUser.bio || 'No bio provided'}
                          </div>
                        </div>
                      )}

                      {selectedUser.role === 'tutor' && (
                        <div>
                          <p className="text-sm font-medium mb-2">Raw Qualifications</p>
                          <div className="rounded-lg border bg-gray-50 p-4 text-sm text-gray-700 whitespace-pre-wrap">
                            {selectedUser.qualifications || 'No qualifications provided'}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>

                <div className="space-y-4">
                  <Card>
                    <CardContent className="pt-6 space-y-4">
                      <div>
                        <p className="text-sm font-medium mb-2">Subjects</p>
                        <div className="flex flex-wrap gap-2">
                          {Array.isArray(selectedUser.subjects) && selectedUser.subjects.length > 0 ? (
                            selectedUser.subjects.map((subject: string) => (
                              <Badge key={subject} variant="secondary">{subject}</Badge>
                            ))
                          ) : (
                            <span className="text-sm text-gray-500">No subjects listed</span>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div className="rounded-lg border p-3">
                          <p className="text-gray-500 text-xs mb-1">Total Sessions</p>
                          <p className="font-medium">{selectedUser.totalSessions || 0}</p>
                        </div>
                        <div className="rounded-lg border p-3">
                          <p className="text-gray-500 text-xs mb-1">Total Spent</p>
                          <p className="font-medium">{selectedUser.totalSpent ? `₦${Number(selectedUser.totalSpent).toLocaleString()}` : '₦0'}</p>
                        </div>
                        <div className="rounded-lg border p-3">
                          <p className="text-gray-500 text-xs mb-1">Verification</p>
                          <p className="font-medium">{selectedUser.verificationStatus || 'N/A'}</p>
                        </div>
                        <div className="rounded-lg border p-3">
                          <p className="text-gray-500 text-xs mb-1">Status</p>
                          <p className="font-medium">{selectedUser.status || 'active'}</p>
                        </div>
                      </div>

                      <div>
                        <p className="text-sm font-medium mb-2">Profile Notes</p>
                        <div className="rounded-lg border bg-gray-50 p-4 text-sm text-gray-700 whitespace-pre-wrap min-h-24">
                          {selectedUser.notes || 'No admin notes available'}
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Button className="w-full" variant="outline" onClick={() => setSelectedUser(null)}>
                    Close Profile
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}