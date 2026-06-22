import React, { useState, useEffect } from 'react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { 
  UserCheck,
  UserPlus,
  Search,
  Star,
  Shield,
  CheckCircle2,
  X,
  Clock,
  AlertTriangle,
  Loader2,
  Filter,
  Download
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { projectId, publicAnonKey } from '../../utils/supabase/info';
import { ImageWithFallback } from '../figma/ImageWithFallback';

interface Tutor {
  id: string;
  name: string;
  email: string;
  profileImage?: string;
  rating: number;
  totalSessions: number;
  subjects: string[];
  qualifications: string[];
  dbsStatus: 'verified' | 'pending' | 'expired';
  approvalStatus: 'approved' | 'pending' | 'rejected';
  approvedAt?: string;
  approvedBy?: string;
  rejectionReason?: string;
  hourlyRate: number;
  availability: string;
  senExperience: boolean;
}

interface TutorPoolManagementProps {
  organisationId: string;
  accessToken: string;
  isCoordinator: boolean;
}

export function TutorPoolManagement({ organisationId, accessToken, isCoordinator }: TutorPoolManagementProps) {
  const [approvedTutors, setApprovedTutors] = useState<Tutor[]>([]);
  const [availableTutors, setAvailableTutors] = useState<Tutor[]>([]);
  const [pendingRequests, setPendingRequests] = useState<Tutor[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [subjectFilter, setSubjectFilter] = useState<string>('all');
  const [activeTab, setActiveTab] = useState<'approved' | 'available' | 'pending'>('approved');

  useEffect(() => {
    loadTutorData();
  }, [organisationId]);

  const loadTutorData = async () => {
    setLoading(true);
    try {
      const [approvedRes, availableRes, pendingRes] = await Promise.all([
        fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-cbd74580/organisations/${organisationId}/tutors/approved`,
          { headers: { 'Authorization': `Bearer ${accessToken}` } }
        ),
        fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-cbd74580/organisations/${organisationId}/tutors/available`,
          { headers: { 'Authorization': `Bearer ${accessToken}` } }
        ),
        fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-cbd74580/organisations/${organisationId}/tutors/pending`,
          { headers: { 'Authorization': `Bearer ${accessToken}` } }
        )
      ]);

      if (approvedRes.ok) {
        const data = await approvedRes.json();
        setApprovedTutors(data.tutors || []);
      }

      if (availableRes.ok) {
        const data = await availableRes.json();
        setAvailableTutors(data.tutors || []);
      }

      if (pendingRes.ok) {
        const data = await pendingRes.json();
        setPendingRequests(data.tutors || []);
      }
    } catch (error) {
      console.error('Error loading tutor data:', error);
      toast.error('Failed to load tutor data');
    } finally {
      setLoading(false);
    }
  };

  const approveTutor = async (tutorId: string) => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-cbd74580/organisations/${organisationId}/tutors/${tutorId}/approve`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.ok) {
        toast.success('Tutor approved and added to pool');
        loadTutorData();
      } else {
        toast.error('Failed to approve tutor');
      }
    } catch (error) {
      console.error('Error approving tutor:', error);
      toast.error('Failed to approve tutor');
    }
  };

  const removeTutor = async (tutorId: string, reason: string) => {
    if (!reason.trim()) {
      toast.error('Please provide a reason for removal');
      return;
    }

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-cbd74580/organisations/${organisationId}/tutors/${tutorId}/remove`,
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
        toast.success('Tutor removed from pool');
        loadTutorData();
      } else {
        toast.error('Failed to remove tutor');
      }
    } catch (error) {
      console.error('Error removing tutor:', error);
      toast.error('Failed to remove tutor');
    }
  };

  const rejectRequest = async (tutorId: string, reason: string) => {
    if (!reason.trim()) {
      toast.error('Please provide a rejection reason');
      return;
    }

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-cbd74580/organisations/${organisationId}/tutors/${tutorId}/reject`,
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
        toast.success('Request rejected');
        loadTutorData();
      } else {
        toast.error('Failed to reject request');
      }
    } catch (error) {
      console.error('Error rejecting request:', error);
      toast.error('Failed to reject request');
    }
  };

  const exportTutorList = () => {
    const csv = [
      ['Name', 'Email', 'Subjects', 'Rating', 'Sessions', 'DBS Status', 'Hourly Rate'].join(','),
      ...approvedTutors.map(t => 
        [t.name, t.email, t.subjects.join(';'), t.rating, t.totalSessions, t.dbsStatus, `£${t.hourlyRate}`].join(',')
      )
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tutor-pool-${organisationId}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    toast.success('Tutor list exported');
  };

  const renderTutorCard = (tutor: Tutor, showActions: boolean = false) => (
    <Card key={tutor.id} className="p-4">
      <div className="flex items-start gap-4">
        <div className="w-16 h-16 rounded-full overflow-hidden bg-gray-200 flex-shrink-0">
          {tutor.profileImage ? (
            <ImageWithFallback
              src={tutor.profileImage}
              alt={tutor.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-2xl text-gray-400">
              {tutor.name.charAt(0)}
            </div>
          )}
        </div>

        <div className="flex-1">
          <div className="flex items-start justify-between mb-2">
            <div>
              <h4 className="font-medium">{tutor.name}</h4>
              <p className="text-sm text-gray-600">{tutor.email}</p>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1">
                <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                <span className="text-sm font-medium">{tutor.rating.toFixed(1)}</span>
              </div>
              <Badge className={
                tutor.dbsStatus === 'verified' ? 'bg-green-100 text-green-800' :
                tutor.dbsStatus === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                'bg-red-100 text-red-800'
              }>
                <Shield className="w-3 h-3 mr-1" />
                DBS {tutor.dbsStatus}
              </Badge>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 mb-3">
            {tutor.subjects.slice(0, 3).map((subject, idx) => (
              <Badge key={idx} variant="outline" className="text-xs">
                {subject}
              </Badge>
            ))}
            {tutor.subjects.length > 3 && (
              <Badge variant="outline" className="text-xs">
                +{tutor.subjects.length - 3} more
              </Badge>
            )}
            {tutor.senExperience && (
              <Badge className="bg-purple-100 text-purple-800 text-xs">
                SEN Experience
              </Badge>
            )}
          </div>

          <div className="flex items-center gap-4 text-sm text-gray-600">
            <span>{tutor.totalSessions} sessions</span>
            <span>£{tutor.hourlyRate}/hr</span>
            <span>{tutor.availability}</span>
          </div>

          {tutor.qualifications.length > 0 && (
            <div className="mt-2 text-xs text-gray-600">
              <strong>Qualifications:</strong> {tutor.qualifications.join(', ')}
            </div>
          )}

          {tutor.approvedAt && (
            <div className="mt-2 text-xs text-gray-500">
              Approved on {new Date(tutor.approvedAt).toLocaleDateString()}
              {tutor.approvedBy && ` by ${tutor.approvedBy}`}
            </div>
          )}

          {tutor.rejectionReason && (
            <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-800">
              <strong>Rejected:</strong> {tutor.rejectionReason}
            </div>
          )}

          {showActions && isCoordinator && (
            <div className="flex gap-2 mt-3">
              {tutor.approvalStatus === 'approved' ? (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    const reason = prompt('Reason for removing this tutor from the pool:');
                    if (reason) removeTutor(tutor.id, reason);
                  }}
                  className="text-red-600"
                >
                  <X className="w-4 h-4 mr-1" />
                  Remove
                </Button>
              ) : tutor.approvalStatus === 'pending' ? (
                <>
                  <Button
                    size="sm"
                    onClick={() => approveTutor(tutor.id)}
                    className="bg-[#5d9827] hover:bg-[#4a7a1f]"
                  >
                    <CheckCircle2 className="w-4 h-4 mr-1" />
                    Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      const reason = prompt('Reason for rejecting this request:');
                      if (reason) rejectRequest(tutor.id, reason);
                    }}
                    className="text-red-600"
                  >
                    <X className="w-4 h-4 mr-1" />
                    Reject
                  </Button>
                </>
              ) : (
                <Button
                  size="sm"
                  onClick={() => approveTutor(tutor.id)}
                  className="bg-[#5d9827] hover:bg-[#4a7a1f]"
                >
                  <UserPlus className="w-4 h-4 mr-1" />
                  Add to Pool
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    </Card>
  );

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
          <h2 className="text-3xl">Tutor Pool Management</h2>
          <p className="text-gray-600 mt-1">
            Manage your organisation's approved tutor safelist
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportTutorList}>
            <Download className="w-4 h-4 mr-2" />
            Export List
          </Button>
          {isCoordinator && (
            <Button className="bg-[#5d9827] hover:bg-[#4a7a1f]">
              <UserPlus className="w-4 h-4 mr-2" />
              Invite Tutor
            </Button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="text-2xl font-bold text-[#625d9c]">
            {approvedTutors.length}
          </div>
          <div className="text-sm text-gray-600">Approved Tutors</div>
        </Card>
        <Card className="p-4">
          <div className="text-2xl font-bold text-yellow-600">
            {pendingRequests.length}
          </div>
          <div className="text-sm text-gray-600">Pending Requests</div>
        </Card>
        <Card className="p-4">
          <div className="text-2xl font-bold text-[#5d9827]">
            {approvedTutors.filter(t => t.dbsStatus === 'verified').length}
          </div>
          <div className="text-sm text-gray-600">DBS Verified</div>
        </Card>
        <Card className="p-4">
          <div className="text-2xl font-bold text-purple-600">
            {approvedTutors.filter(t => t.senExperience).length}
          </div>
          <div className="text-sm text-gray-600">SEN Experienced</div>
        </Card>
      </div>

      {/* Tabs */}
      <Card className="p-4">
        <div className="flex gap-2 mb-4">
          <Button
            variant={activeTab === 'approved' ? 'default' : 'outline'}
            onClick={() => setActiveTab('approved')}
            className={activeTab === 'approved' ? 'bg-[#625d9c]' : ''}
          >
            <UserCheck className="w-4 h-4 mr-2" />
            Approved Pool ({approvedTutors.length})
          </Button>
          <Button
            variant={activeTab === 'pending' ? 'default' : 'outline'}
            onClick={() => setActiveTab('pending')}
            className={activeTab === 'pending' ? 'bg-[#625d9c]' : ''}
          >
            <Clock className="w-4 h-4 mr-2" />
            Pending ({pendingRequests.length})
            {pendingRequests.length > 0 && (
              <Badge className="ml-2 bg-yellow-500">!</Badge>
            )}
          </Button>
          <Button
            variant={activeTab === 'available' ? 'default' : 'outline'}
            onClick={() => setActiveTab('available')}
            className={activeTab === 'available' ? 'bg-[#625d9c]' : ''}
          >
            <Search className="w-4 h-4 mr-2" />
            Browse ({availableTutors.length})
          </Button>
        </div>

        {/* Search and Filters */}
        <div className="flex gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search tutors by name, subject, or qualification..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <select
            className="p-2 border rounded-lg"
            value={subjectFilter}
            onChange={(e) => setSubjectFilter(e.target.value)}
          >
            <option value="all">All Subjects</option>
            <option value="maths">Maths</option>
            <option value="english">English</option>
            <option value="science">Science</option>
            <option value="languages">Languages</option>
          </select>
        </div>
      </Card>

      {/* Content */}
      <div className="space-y-3">
        {activeTab === 'approved' && (
          <>
            {approvedTutors.length > 0 ? (
              approvedTutors.map(tutor => renderTutorCard(tutor, true))
            ) : (
              <Card className="p-12 text-center">
                <UserCheck className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl mb-2">No Approved Tutors Yet</h3>
                <p className="text-gray-600 mb-4">
                  Start building your tutor pool by browsing available tutors or reviewing pending requests.
                </p>
                <Button onClick={() => setActiveTab('available')} className="bg-[#5d9827] hover:bg-[#4a7a1f]">
                  Browse Available Tutors
                </Button>
              </Card>
            )}
          </>
        )}

        {activeTab === 'pending' && (
          <>
            {pendingRequests.length > 0 ? (
              <>
                <Card className="p-4 bg-yellow-50 border-yellow-200">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-yellow-900">
                      <p className="font-medium">Pending Tutor Requests</p>
                      <p className="mt-1">
                        {pendingRequests.length} tutor{pendingRequests.length !== 1 ? 's have' : ' has'} requested
                        to join your organisation's tutor pool. Review their profiles and approve or reject.
                      </p>
                    </div>
                  </div>
                </Card>
                {pendingRequests.map(tutor => renderTutorCard(tutor, true))}
              </>
            ) : (
              <Card className="p-12 text-center">
                <Clock className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl mb-2">No Pending Requests</h3>
                <p className="text-gray-600">
                  You'll see tutor approval requests here when they apply to join your pool.
                </p>
              </Card>
            )}
          </>
        )}

        {activeTab === 'available' && (
          <>
            {availableTutors.length > 0 ? (
              <>
                <Card className="p-4 bg-blue-50 border-blue-200">
                  <div className="flex items-start gap-2">
                    <Search className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-blue-900">
                      <p className="font-medium">Browse Available Tutors</p>
                      <p className="mt-1">
                        These tutors are available on Knowledge Fons Academy and can be added to your organisation's
                        approved pool. All tutors are DBS checked and verified.
                      </p>
                    </div>
                  </div>
                </Card>
                {availableTutors.map(tutor => renderTutorCard(tutor, true))}
              </>
            ) : (
              <Card className="p-12 text-center">
                <Search className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl mb-2">No Tutors Found</h3>
                <p className="text-gray-600">
                  Try adjusting your search filters to find more tutors.
                </p>
              </Card>
            )}
          </>
        )}
      </div>
    </div>
  );
}
