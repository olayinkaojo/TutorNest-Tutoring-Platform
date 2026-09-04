import { useState, useEffect, type ReactNode } from 'react';
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
  DollarSign,
  Phone,
  MapPin,
  Briefcase,
  BookOpen,
  GraduationCap,
  Award,
  ShieldCheck,
  Calendar,
  FileText,
  Trash2,
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
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';

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

// Yes / No / undefined (so unset booleans are hidden rather than shown as "No").
function formatBool(value: any): string | undefined {
  if (value === true || value === 'true') return 'Yes';
  if (value === false || value === 'false') return 'No';
  return undefined;
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

// ─── Presentational helpers for the profile dialog ──────────────────────────

/** A label/value row; renders nothing when the value is empty. Label sits to the
 *  left, value fills the rest — a single-column definition-list style that reads
 *  cleanly at full width. Stacks on very small screens. */
function InfoField({ label, value }: { label: string; value: any }) {
  if (value === undefined || value === null || value === '') return null;
  return (
    <div className="flex flex-col sm:flex-row sm:items-baseline gap-0.5 sm:gap-4 py-2.5">
      <p className="text-sm text-gray-500 sm:w-52 sm:flex-shrink-0">{label}</p>
      <p className="text-sm font-medium text-gray-900 break-words whitespace-pre-wrap sm:flex-1">{formatValue(value)}</p>
    </div>
  );
}

/** A labelled row of chips; renders nothing when empty. */
function ChipRow({ label, items }: { label: string; items: string[] }) {
  if (!items || items.length === 0) return null;
  return (
    <div>
      <p className="text-[11px] uppercase tracking-wide text-gray-400 mb-1.5">{label}</p>
      <div className="flex flex-wrap gap-1.5">
        {items.map((it) => (
          <Badge key={it} variant="secondary" className="font-normal bg-[#f5f3ff] text-[#4c469b] hover:bg-[#f5f3ff]">
            {it}
          </Badge>
        ))}
      </div>
    </div>
  );
}

/** A titled card section with an icon header. */
function SectionCard({ title, icon: Icon, children }: { title: string; icon: any; children: ReactNode }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-gray-100 bg-gray-50/60">
        <Icon className="w-4 h-4 text-[#625d9c]" />
        <h4 className="text-sm font-semibold text-gray-800">{title}</h4>
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
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
  const [deleteTarget, setDeleteTarget] = useState<any>(null);
  const [deleteReason, setDeleteReason] = useState('');
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);

  // Resolve a value across profileSummary + camelCase + snake_case variants.
  const ps = selectedUser?.profileSummary || {};
  const su = selectedUser || {};
  const pick = (...vals: any[]) => vals.find((v) => v !== undefined && v !== null && v !== '');
  const toChips = (v: any): string[] =>
    Array.isArray(v)
      ? v.filter(Boolean)
      : (typeof v === 'string' && v.trim() ? v.split(',').map((s) => s.trim()).filter(Boolean) : []);

  const hourlyRate = pick(ps.hourlyRate, su.hourlyRate, su.hourly_rate);
  const experienceYears = pick(ps.experienceYears, su.experienceYears, su.experience_years);
  const travelRadius = pick(ps.travelRadius, su.travelRadius, su.travel_radius);

  // Grouped, populated-only sections for the profile dialog.
  const tutorSections = selectedUser?.role === 'tutor' ? [
    {
      title: 'Professional background',
      icon: Briefcase,
      fields: [
        { label: 'Headline', value: pick(ps.headline, su.headline) },
        { label: 'Education level', value: pick(ps.educationLevel, su.educationLevel, su.education_level) },
        { label: 'Institution', value: pick(ps.institution, su.institution) },
        { label: 'Experience', value: experienceYears !== undefined ? `${experienceYears} year${Number(experienceYears) === 1 ? '' : 's'}` : undefined },
        { label: 'Hourly rate', value: hourlyRate ? `₦${Number(hourlyRate).toLocaleString()} / session` : undefined },
        { label: 'Teaching style', value: pick(ps.teachingStyle, su.teachingStyle, su.teaching_style) },
      ],
    },
    {
      title: 'Teaching details',
      icon: BookOpen,
      fields: [
        { label: 'Teaching format', value: pick(ps.teachingFormat, su.teachingFormat, su.teaching_format) },
        { label: 'Group size', value: pick(ps.groupSize, su.groupSize, su.group_size) },
        { label: 'Max students', value: pick(ps.maxStudents, su.maxStudents, su.max_students) },
        { label: 'Travel radius', value: travelRadius !== undefined ? `${travelRadius} km` : undefined },
        { label: 'Classes', value: pick(ps.classes, su.classes) },
      ],
      chipGroups: [
        { label: 'Subjects', items: toChips(pick(ps.subjects, su.subjects)) },
        { label: 'Age groups', items: toChips(pick(ps.ageGroups, su.ageGroups, su.age_groups)) },
        { label: 'Exam boards', items: toChips(pick(ps.examBoards, su.examBoards, su.exam_boards)) },
        { label: 'Methodologies', items: toChips(pick(ps.methodologies, su.methodologies)) },
        { label: 'Languages', items: toChips(pick(ps.languages, su.languages)) },
        { label: 'Learning-difficulty support', items: toChips(pick(ps.learningDifficulties, su.learningDifficulties, su.learning_difficulties)) },
      ],
    },
    {
      title: 'Credentials & compliance',
      icon: ShieldCheck,
      fields: [
        { label: 'DBS checked', value: formatBool(pick(ps.dbsChecked, su.dbsChecked, su.dbs_checked)) },
        { label: 'Insurance', value: formatBool(pick(ps.hasInsurance, su.hasInsurance, su.has_insurance)) },
        { label: 'Onboarding complete', value: formatBool(pick(ps.onboardingComplete, su.onboardingComplete)) },
      ],
    },
  ] : [];

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

  const updateUserStatus = async (userId: string, status: 'suspended' | 'active', reason: string) => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-cbd74580/admin/users/${userId}/status`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ status, reason }),
        }
      );

      if (response.ok) {
        setSuccess(status === 'suspended' ? 'User suspended successfully' : 'User reactivated successfully');
        setTimeout(() => setSuccess(''), 3000);
        loadUsers();
      } else {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || `Failed to ${status === 'suspended' ? 'suspend' : 'reactivate'} user`);
      }
    } catch (err: any) {
      setError(err.message);
      setTimeout(() => setError(''), 3000);
    }
  };

  const handleSuspendUser = (userId: string) => {
    const reason = window.prompt('Reason for suspending this user (required):');
    if (!reason || !reason.trim()) return;
    void updateUserStatus(userId, 'suspended', reason.trim());
  };

  const handleReactivateUser = (userId: string) => {
    void updateUserStatus(userId, 'active', 'Reactivated by admin');
  };

  const closeDeleteDialog = () => {
    setDeleteTarget(null);
    setDeleteReason('');
    setDeleteConfirmText('');
  };

  const handleDeleteUser = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-cbd74580/admin/users/${deleteTarget.userId}`,
        {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ reason: deleteReason.trim() }),
        }
      );

      const data = await response.json().catch(() => ({}));
      if (response.ok) {
        setSuccess(
          data.warnings?.length
            ? `Account deleted with ${data.warnings.length} warning(s) — check console for details.`
            : 'Account permanently deleted.'
        );
        if (data.warnings?.length) console.warn('Account deletion warnings:', data.warnings);
        setTimeout(() => setSuccess(''), 5000);
        closeDeleteDialog();
        setSelectedUser(null);
        loadUsers();
      } else {
        throw new Error(data.error || 'Failed to delete account');
      }
    } catch (err: any) {
      setError(err.message);
      setTimeout(() => setError(''), 4000);
    } finally {
      setDeleting(false);
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
                {user.role !== 'admin' && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => setDeleteTarget(user)}
                      className="text-red-700 focus:text-red-700 focus:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete Account
                    </DropdownMenuItem>
                  </>
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
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0 gap-0">
          {selectedUser && (
            <>
              <DialogHeader className="sr-only">
                <DialogTitle>{getUserDisplayName(selectedUser)}</DialogTitle>
                <DialogDescription>
                  {selectedUser.role === 'tutor' ? 'Tutor profile and verification details' : 'User profile details'}
                </DialogDescription>
              </DialogHeader>

              {/* Header banner */}
              <div className="relative px-6 pt-6 pb-5 bg-gradient-to-br from-[#625d9c] to-[#4c469b] text-white">
                <div className="flex items-start gap-4">
                  <Avatar className="w-20 h-20 ring-4 ring-white/25 flex-shrink-0">
                    {(selectedUser.photo_url || selectedUser.photoUrl) && (
                      <img
                        src={selectedUser.photo_url || selectedUser.photoUrl}
                        alt={getUserDisplayName(selectedUser)}
                        className="w-full h-full object-cover rounded-full"
                      />
                    )}
                    <AvatarFallback className="text-lg font-semibold" style={{ backgroundColor: '#4c469b', color: 'white' }}>
                      {getUserInitials(selectedUser)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-xl font-semibold truncate">{getUserDisplayName(selectedUser)}</h3>
                      <Badge className="bg-white/20 text-white hover:bg-white/20 border-0">
                        {selectedUser.role ? selectedUser.role.charAt(0).toUpperCase() + selectedUser.role.slice(1) : 'Unknown'}
                      </Badge>
                      {selectedUser.role === 'tutor' && (
                        <Badge
                          className="border-0"
                          style={{
                            backgroundColor: selectedUser.verificationStatus === 'verified' ? '#dcfce7' : '#fef3c7',
                            color: selectedUser.verificationStatus === 'verified' ? '#166534' : '#92400e',
                          }}
                        >
                          {selectedUser.verificationStatus === 'verified' ? (
                            <><ShieldCheck className="w-3 h-3 mr-1" />Verified</>
                          ) : (
                            selectedUser.reReviewRequested ? 'Re-review' : 'Pending verification'
                          )}
                        </Badge>
                      )}
                    </div>
                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-white/85">
                      <span className="inline-flex items-center gap-1.5 min-w-0">
                        <Mail className="w-3.5 h-3.5 flex-shrink-0" /><span className="truncate">{selectedUser.email}</span>
                      </span>
                      {pick(ps.phone, su.phone) && (
                        <span className="inline-flex items-center gap-1.5">
                          <Phone className="w-3.5 h-3.5" />{pick(ps.phone, su.phone)}
                        </span>
                      )}
                      {pick(ps.location, su.location) && (
                        <span className="inline-flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5" />{pick(ps.location, su.location)}
                        </span>
                      )}
                    </div>
                    <p className="mt-1.5 text-xs text-white/70 inline-flex items-center gap-1.5">
                      <Calendar className="w-3 h-3" />
                      Joined {new Date(selectedUser.createdAt || Date.now()).toLocaleDateString()}
                      {selectedUser.lastLogin && ` • Last login ${new Date(selectedUser.lastLogin).toLocaleDateString()}`}
                    </p>
                  </div>
                </div>
              </div>

              {/* Body — a single column of full-width sections so each one can breathe */}
              <div className="space-y-4 p-6 bg-gray-50/40">
                {tutorSections.map((section) => {
                  const fields = (section.fields || []).filter(
                    (f) => f.value !== undefined && f.value !== null && f.value !== '',
                  );
                  const chips = (section.chipGroups || []).filter((g) => g.items.length > 0);
                  if (fields.length === 0 && chips.length === 0) return null;
                  return (
                    <SectionCard key={section.title} title={section.title} icon={section.icon}>
                      {fields.length > 0 && (
                        <div className="divide-y divide-gray-100">
                          {fields.map((f) => (
                            <InfoField key={f.label} label={f.label} value={f.value} />
                          ))}
                        </div>
                      )}
                      {chips.length > 0 && (
                        <div className={`space-y-3 ${fields.length ? 'mt-4 pt-4 border-t border-gray-100' : ''}`}>
                          {chips.map((g) => (
                            <ChipRow key={g.label} label={g.label} items={g.items} />
                          ))}
                        </div>
                      )}
                    </SectionCard>
                  );
                })}

                {selectedUser.role === 'tutor' && (pick(ps.bio, su.bio)) && (
                  <SectionCard title="Bio" icon={FileText}>
                    <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{pick(ps.bio, su.bio)}</p>
                  </SectionCard>
                )}

                {selectedUser.role === 'tutor' && (pick(ps.qualifications, su.qualifications)) && (
                  <SectionCard title="Qualifications" icon={GraduationCap}>
                    <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{pick(ps.qualifications, su.qualifications)}</p>
                  </SectionCard>
                )}

                {selectedUser.role !== 'tutor' && (
                  <SectionCard title="Contact" icon={Mail}>
                    <div className="divide-y divide-gray-100">
                      <InfoField label="Email" value={selectedUser.email} />
                      <InfoField label="Phone" value={pick(ps.phone, su.phone)} />
                      <InfoField label="Location" value={pick(ps.location, su.location)} />
                    </div>
                  </SectionCard>
                )}

                <SectionCard title="Account & activity" icon={Award}>
                  <div className="divide-y divide-gray-100">
                    <InfoField label="Role" value={selectedUser.role ? selectedUser.role.charAt(0).toUpperCase() + selectedUser.role.slice(1) : undefined} />
                    <InfoField label="Status" value={(selectedUser.status || 'active').charAt(0).toUpperCase() + (selectedUser.status || 'active').slice(1)} />
                    {selectedUser.role === 'tutor' && (
                      <InfoField label="Verification" value={(selectedUser.verificationStatus || 'pending').charAt(0).toUpperCase() + (selectedUser.verificationStatus || 'pending').slice(1)} />
                    )}
                    <InfoField label="Total sessions" value={selectedUser.totalSessions || 0} />
                    <InfoField label="Total spent" value={selectedUser.totalSpent ? `₦${Number(selectedUser.totalSpent).toLocaleString()}` : '₦0'} />
                    {selectedUser.updatedAt && (
                      <InfoField label="Last updated" value={new Date(selectedUser.updatedAt).toLocaleDateString()} />
                    )}
                  </div>
                </SectionCard>

                <SectionCard title="Admin notes" icon={FileText}>
                  <p className="text-sm text-gray-600 whitespace-pre-wrap min-h-[3rem] leading-relaxed">
                    {selectedUser.notes || 'No admin notes available.'}
                  </p>
                </SectionCard>

                <div className="flex gap-2">
                  <Button className="flex-1" variant="outline" onClick={() => setSelectedUser(null)}>
                    Close
                  </Button>
                  {selectedUser.role !== 'admin' && (
                    <Button
                      variant="outline"
                      className="text-red-700 border-red-200 hover:bg-red-50 hover:text-red-800"
                      onClick={() => setDeleteTarget(selectedUser)}
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete Account
                    </Button>
                  )}
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete confirmation — requires typing the account's email, since this is permanent */}
      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && !deleting && closeDeleteDialog()}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-red-700">Delete account permanently</DialogTitle>
            <DialogDescription>
              This removes {deleteTarget ? getUserDisplayName(deleteTarget) : 'this user'}'s profile, uploaded
              documents, verification record, and login — permanently. Bookings, payments, and reviews
              involving them are kept (required for financial and dispute records) and will show as
              "Unknown" going forward. This cannot be undone.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="delete-reason">Reason (required, kept in the audit log)</Label>
              <Textarea
                id="delete-reason"
                value={deleteReason}
                onChange={(e) => setDeleteReason(e.target.value)}
                placeholder="e.g. Duplicate test account created during development"
                rows={2}
              />
            </div>

            <div>
              <Label htmlFor="delete-confirm">
                Type <strong>{deleteTarget?.email}</strong> to confirm
              </Label>
              <Input
                id="delete-confirm"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                placeholder={deleteTarget?.email || ''}
                autoComplete="off"
              />
            </div>
          </div>

          <div className="flex gap-2 mt-2">
            <Button variant="outline" className="flex-1" onClick={closeDeleteDialog} disabled={deleting}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              className="flex-1"
              disabled={deleting || !deleteReason.trim() || deleteConfirmText !== deleteTarget?.email}
              onClick={() => void handleDeleteUser()}
            >
              {deleting ? 'Deleting…' : 'Delete Permanently'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}