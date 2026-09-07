import React, { useState, useEffect } from 'react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { 
  Users,
  User,
  Shield,
  Calendar,
  BookOpen,
  Search,
  Filter,
  Eye,
  Loader2,
  CheckCircle2,
  UserPlus
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { projectId, publicAnonKey } from '../../utils/supabase/info';

interface ChildProfile {
  id: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  age: number;
  yearGroup?: string;
  parentId: string;
  parentName: string;
  parentEmail: string;
  createdAt: string;
  learningPreferences?: {
    subjects: string[];
    learningStyle: string;
    specialNeeds?: string[];
  };
  sessionStats: {
    totalSessions: number;
    completedSessions: number;
    upcomingSessions: number;
    totalHours: number;
  };
  currentTutors: {
    id: string;
    name: string;
    subject: string;
  }[];
  status: 'active' | 'inactive';
}

interface ParentChildSummary {
  parentId: string;
  parentName: string;
  parentEmail: string;
  subscriptionTier: string;
  childrenCount: number;
  children: ChildProfile[];
}

interface ChildProfileManagementProps {
  adminId: string;
  accessToken: string;
}

export function ChildProfileManagement({ adminId, accessToken }: ChildProfileManagementProps) {
  const [childProfiles, setChildProfiles] = useState<ChildProfile[]>([]);
  const [parentSummaries, setParentSummaries] = useState<ParentChildSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [selectedChild, setSelectedChild] = useState<ChildProfile | null>(null);

  useEffect(() => {
    loadChildProfiles();
  }, []);

  const loadChildProfiles = async () => {
    setLoading(true);
    try {
      const [profilesRes, summariesRes] = await Promise.all([
        fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-cbd74580/admin/child-profiles`,
          { headers: { 'Authorization': `Bearer ${accessToken}` } }
        ),
        fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-cbd74580/admin/parent-child-summaries`,
          { headers: { 'Authorization': `Bearer ${accessToken}` } }
        )
      ]);

      if (profilesRes.ok) {
        const data = await profilesRes.json();
        setChildProfiles(data.profiles || []);
      }

      if (summariesRes.ok) {
        const data = await summariesRes.json();
        setParentSummaries(data.summaries || []);
      }
    } catch (error) {
      console.error('Error loading child profiles:', error);
      toast.error('Failed to load child profiles');
    } finally {
      setLoading(false);
    }
  };

  const filteredProfiles = childProfiles.filter(profile => {
    const matchesSearch = 
      profile.firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      profile.lastName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      profile.parentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      profile.parentEmail.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = filterStatus === 'all' || profile.status === filterStatus;
    
    return matchesSearch && matchesStatus;
  });

  const totalChildren = childProfiles.length;
  const activeChildren = childProfiles.filter(p => p.status === 'active').length;
  const totalSessions = childProfiles.reduce((sum, p) => sum + p.sessionStats.totalSessions, 0);

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
          <h2 className="text-3xl">Child Profile Management</h2>
          <p className="text-gray-600 mt-1">
            Student profiles managed by parents
          </p>
        </div>
        <Button variant="outline" onClick={loadChildProfiles}>
          <Shield className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Stats */}
      <div className="grid md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center justify-between mb-2">
            <Users className="w-5 h-5 text-[#625d9c]" />
            <Badge variant="outline">{activeChildren} active</Badge>
          </div>
          <div className="text-2xl font-bold">{totalChildren}</div>
          <div className="text-sm text-gray-600">Child Profiles</div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between mb-2">
            <User className="w-5 h-5 text-blue-600" />
            <Badge variant="outline">
              {parentSummaries.length > 0 ? (totalChildren / parentSummaries.length).toFixed(1) : 0} avg
            </Badge>
          </div>
          <div className="text-2xl font-bold">{parentSummaries.length}</div>
          <div className="text-sm text-gray-600">Parent Accounts</div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between mb-2">
            <BookOpen className="w-5 h-5 text-green-600" />
            <Badge variant="outline">Total</Badge>
          </div>
          <div className="text-2xl font-bold">{totalSessions}</div>
          <div className="text-sm text-gray-600">Sessions Booked</div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between mb-2">
            <Calendar className="w-5 h-5 text-purple-600" />
            <Badge variant="outline">Avg per child</Badge>
          </div>
          <div className="text-2xl font-bold">
            {totalChildren > 0 ? (totalSessions / totalChildren).toFixed(1) : 0}
          </div>
          <div className="text-sm text-gray-600">Sessions</div>
        </Card>
      </div>

      {/* Important Notice */}
      <Card className="p-4 bg-blue-50 border-blue-200">
        <div className="flex items-start gap-3">
          <Shield className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-900">
            <p className="font-medium mb-1">Child Profile Architecture</p>
            <ul className="space-y-1 text-blue-800">
              <li>• <strong>No Separate Logins:</strong> Children do not have login credentials for COPPA/GDPR compliance</li>
              <li>• <strong>Parent-Managed:</strong> Parents switch between child profiles in their dashboard</li>
              <li>• <strong>No Child Limit:</strong> Sessions are paid per child per booking, so parents can add as many children as they need</li>
              <li>• <strong>Admin Visibility:</strong> All child profiles visible here for support and moderation</li>
              <li>• <strong>Session Booking:</strong> Parents book sessions for specific children</li>
            </ul>
          </div>
        </div>
      </Card>

      {/* Search and Filters */}
      <Card className="p-4">
        <div className="flex gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search by child name, parent name, or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="h-10 px-3 border rounded"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
      </Card>

      {/* Child Profiles List & Details */}
      <div className="grid lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <h3 className="text-xl mb-4">Child Profiles ({filteredProfiles.length})</h3>
          <div className="space-y-2 max-h-[600px] overflow-y-auto">
            {filteredProfiles.map((profile) => (
              <Card
                key={profile.id}
                className={`p-4 cursor-pointer hover:border-[#625d9c] transition-colors ${
                  selectedChild?.id === profile.id ? 'border-[#625d9c] border-2' : ''
                }`}
                onClick={() => setSelectedChild(profile)}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-[#625d9c] bg-opacity-10 flex items-center justify-center">
                      <User className="w-5 h-5 text-[#625d9c]" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">
                          {profile.firstName} {profile.lastName}
                        </span>
                        {profile.status === 'active' ? (
                          <Badge className="bg-green-100 text-green-800 text-xs">
                            Active
                          </Badge>
                        ) : (
                          <Badge className="bg-gray-100 text-gray-600 text-xs">
                            Inactive
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-gray-600">
                        Age {profile.age} {profile.yearGroup && `• Year ${profile.yearGroup}`}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="pl-13 space-y-1">
                  <p className="text-xs text-gray-600">
                    Parent: {profile.parentName}
                  </p>
                  <div className="flex items-center gap-3 text-xs text-gray-600">
                    <span className="flex items-center gap-1">
                      <BookOpen className="w-3 h-3" />
                      {profile.sessionStats.completedSessions} completed
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {profile.sessionStats.upcomingSessions} upcoming
                    </span>
                  </div>
                </div>
              </Card>
            ))}

            {filteredProfiles.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <Users className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                <p>No child profiles found</p>
              </div>
            )}
          </div>
        </Card>

        {/* Child Details */}
        <Card className="p-6">
          {selectedChild ? (
            <div className="space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-xl mb-1">
                    {selectedChild.firstName} {selectedChild.lastName}
                  </h3>
                  <p className="text-sm text-gray-600">
                    Age {selectedChild.age} {selectedChild.yearGroup && `• Year ${selectedChild.yearGroup}`}
                  </p>
                </div>
                <Badge className={selectedChild.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}>
                  {selectedChild.status}
                </Badge>
              </div>

              <div>
                <h4 className="font-medium mb-2">Parent Information</h4>
                <Card className="p-3 bg-gray-50">
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Name:</span>
                      <span className="font-medium">{selectedChild.parentName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Email:</span>
                      <span className="font-medium text-xs">{selectedChild.parentEmail}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Profile Created:</span>
                      <span className="font-medium">
                        {new Date(selectedChild.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </Card>
              </div>

              <div>
                <h4 className="font-medium mb-3">Session Statistics</h4>
                <div className="grid grid-cols-2 gap-3">
                  <Card className="p-3 text-center">
                    <div className="text-2xl font-bold text-[#625d9c]">
                      {selectedChild.sessionStats.totalSessions}
                    </div>
                    <div className="text-xs text-gray-600">Total Sessions</div>
                  </Card>
                  <Card className="p-3 text-center">
                    <div className="text-2xl font-bold text-green-600">
                      {selectedChild.sessionStats.completedSessions}
                    </div>
                    <div className="text-xs text-gray-600">Completed</div>
                  </Card>
                  <Card className="p-3 text-center">
                    <div className="text-2xl font-bold text-blue-600">
                      {selectedChild.sessionStats.upcomingSessions}
                    </div>
                    <div className="text-xs text-gray-600">Upcoming</div>
                  </Card>
                  <Card className="p-3 text-center">
                    <div className="text-2xl font-bold text-purple-600">
                      {selectedChild.sessionStats.totalHours}h
                    </div>
                    <div className="text-xs text-gray-600">Total Hours</div>
                  </Card>
                </div>
              </div>

              {selectedChild.currentTutors.length > 0 && (
                <div>
                  <h4 className="font-medium mb-2">Current Tutors</h4>
                  <div className="space-y-2">
                    {selectedChild.currentTutors.map((tutor) => (
                      <Card key={tutor.id} className="p-3">
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-sm">{tutor.name}</span>
                          <Badge variant="outline" className="text-xs">
                            {tutor.subject}
                          </Badge>
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              {selectedChild.learningPreferences && (
                <div>
                  <h4 className="font-medium mb-2">Learning Preferences</h4>
                  <Card className="p-3 bg-blue-50 border-blue-200">
                    {selectedChild.learningPreferences.subjects.length > 0 && (
                      <div className="mb-2">
                        <p className="text-xs text-blue-900 mb-1">Subjects:</p>
                        <div className="flex flex-wrap gap-1">
                          {selectedChild.learningPreferences.subjects.map((subject, idx) => (
                            <Badge key={idx} variant="outline" className="text-xs">
                              {subject}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                    {selectedChild.learningPreferences.learningStyle && (
                      <div className="mb-2">
                        <p className="text-xs text-blue-900">
                          Learning Style: <span className="font-medium">{selectedChild.learningPreferences.learningStyle}</span>
                        </p>
                      </div>
                    )}
                    {selectedChild.learningPreferences.specialNeeds && selectedChild.learningPreferences.specialNeeds.length > 0 && (
                      <div>
                        <p className="text-xs text-blue-900 mb-1">Special Educational Needs:</p>
                        <div className="flex flex-wrap gap-1">
                          {selectedChild.learningPreferences.specialNeeds.map((need, idx) => (
                            <Badge key={idx} variant="outline" className="text-xs text-blue-600">
                              {need}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </Card>
                </div>
              )}

              <Card className="p-3 bg-amber-50 border-amber-200">
                <p className="text-xs text-amber-900">
                  <strong>Access Method:</strong> This child is accessed via parent login.
                  Parents switch between child profiles in their dashboard to book sessions
                  and view progress.
                </p>
              </Card>
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500">
              <User className="w-16 h-16 mx-auto mb-4 text-gray-400" />
              <p>Select a child profile to view details</p>
            </div>
          )}
        </Card>
      </div>

      {/* Parent-Child Summaries */}
      <Card className="p-6">
        <h3 className="text-xl mb-4">Parent Accounts with Children</h3>
        <div className="space-y-3">
          {parentSummaries.map((summary) => (
            <Card key={summary.parentId} className="p-4">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-medium">{summary.parentName}</h4>
                    <Badge variant="outline" className="capitalize text-xs">
                      {summary.subscriptionTier}
                    </Badge>
                  </div>
                  <p className="text-xs text-gray-600">{summary.parentEmail}</p>
                </div>
                <div className="text-right">
                  <Badge className="bg-gray-100 text-gray-800">
                    {summary.childrenCount} {summary.childrenCount === 1 ? 'child' : 'children'}
                  </Badge>
                </div>
              </div>

              {summary.children.length > 0 && (
                <div className="grid md:grid-cols-2 gap-2 mt-3 pt-3 border-t">
                  {summary.children.map((child) => (
                    <div key={child.id} className="flex items-center gap-2 text-sm">
                      <User className="w-4 h-4 text-gray-400" />
                      <span>{child.firstName} {child.lastName}</span>
                      <span className="text-xs text-gray-500">(Age {child.age})</span>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          ))}
        </div>
      </Card>

      {/* How It Works */}
      <Card className="p-6 bg-green-50 border-green-200">
        <h3 className="text-xl mb-4 text-green-900">How Child Profiles Work</h3>
        <div className="grid md:grid-cols-2 gap-4 text-sm text-green-900">
          <div>
            <p className="font-medium mb-2">For Parents:</p>
            <ul className="space-y-1 text-green-800">
              <li>• Parent logs in with their credentials</li>
              <li>• Can add children (up to subscription limit)</li>
              <li>• Switches between child profiles in dashboard</li>
              <li>• Books sessions for specific children</li>
              <li>• Views progress and reports for each child</li>
              <li>• All actions logged under parent account</li>
            </ul>
          </div>
          <div>
            <p className="font-medium mb-2">For Admins:</p>
            <ul className="space-y-1 text-green-800">
              <li>• View all child profiles in this dashboard</li>
              <li>• See which parent manages each child</li>
              <li>• Monitor session activity per child</li>
              <li>• Support requests reference child profiles</li>
              <li>• Safeguarding: No direct child logins</li>
              <li>• COPPA/GDPR compliant architecture</li>
            </ul>
          </div>
        </div>
      </Card>
    </div>
  );
}
