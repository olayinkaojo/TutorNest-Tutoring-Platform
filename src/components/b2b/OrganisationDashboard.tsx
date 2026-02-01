import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { OrganisationProfile } from './OrganisationProfile';
import { TutorPoolManagement } from './TutorPoolManagement';
import { OrganisationInvoicing } from './OrganisationInvoicing';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';
import { 
  Building2,
  Users,
  UserCheck,
  FileText,
  BarChart3,
  Settings,
  GraduationCap,
  TrendingUp
} from 'lucide-react';

interface OrganisationDashboardProps {
  userId: string;
  accessToken: string;
  organisationId: string;
  userRole: 'coordinator' | 'finance' | 'admin';
  organisationData: any;
}

export function OrganisationDashboard({ 
  userId, 
  accessToken, 
  organisationId, 
  userRole,
  organisationData 
}: OrganisationDashboardProps) {
  const [activeTab, setActiveTab] = useState('overview');

  const isCoordinator = userRole === 'coordinator' || userRole === 'admin';
  const isFinance = userRole === 'finance' || userRole === 'admin';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-lg bg-gradient-to-br from-[#625d9c] to-[#5d9827] flex items-center justify-center">
            <Building2 className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="text-4xl">{organisationData?.name || 'Organisation Dashboard'}</h1>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="outline" className="capitalize">
                {userRole}
              </Badge>
              <Badge className="bg-green-100 text-green-800">
                {organisationData?.status || 'Active'}
              </Badge>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center justify-between mb-2">
            <Users className="w-5 h-5 text-[#625d9c]" />
            <Badge variant="outline">Active</Badge>
          </div>
          <div className="text-2xl font-bold">
            {organisationData?.subscription?.activeStudents || 0}
          </div>
          <div className="text-sm text-gray-600">Students</div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between mb-2">
            <UserCheck className="w-5 h-5 text-[#5d9827]" />
            <Badge variant="outline">Approved</Badge>
          </div>
          <div className="text-2xl font-bold">
            {organisationData?.subscription?.activeTutors || 0}
          </div>
          <div className="text-sm text-gray-600">Tutors</div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between mb-2">
            <GraduationCap className="w-5 h-5 text-purple-600" />
            <Badge variant="outline" className="text-green-600">+12%</Badge>
          </div>
          <div className="text-2xl font-bold">156</div>
          <div className="text-sm text-gray-600">Sessions (Month)</div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between mb-2">
            <TrendingUp className="w-5 h-5 text-blue-600" />
            <Badge variant="outline">This Month</Badge>
          </div>
          <div className="text-2xl font-bold">
            £{(organisationData?.subscription?.monthlyFee || 0).toFixed(0)}
          </div>
          <div className="text-sm text-gray-600">Spend</div>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 lg:grid-cols-5 gap-2">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            <span className="hidden sm:inline">Overview</span>
          </TabsTrigger>

          {isCoordinator && (
            <>
              <TabsTrigger value="students" className="flex items-center gap-2">
                <Users className="w-4 h-4" />
                <span className="hidden sm:inline">Students</span>
              </TabsTrigger>

              <TabsTrigger value="tutors" className="flex items-center gap-2">
                <UserCheck className="w-4 h-4" />
                <span className="hidden sm:inline">Tutor Pool</span>
              </TabsTrigger>
            </>
          )}

          {isFinance && (
            <TabsTrigger value="invoicing" className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              <span className="hidden sm:inline">Invoicing</span>
            </TabsTrigger>
          )}

          <TabsTrigger value="profile" className="flex items-center gap-2">
            <Settings className="w-4 h-4" />
            <span className="hidden sm:inline">Profile</span>
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview">
          <div className="grid md:grid-cols-2 gap-6">
            <Card className="p-6">
              <h3 className="text-xl mb-4">Recent Activity</h3>
              <div className="space-y-3">
                <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                  <div className="w-2 h-2 bg-[#5d9827] rounded-full mt-2"></div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">New tutor approved</p>
                    <p className="text-xs text-gray-600">Sarah Johnson added to tutor pool • 2 hours ago</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                  <div className="w-2 h-2 bg-blue-600 rounded-full mt-2"></div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">15 sessions completed</p>
                    <p className="text-xs text-gray-600">Total this week • Today</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                  <div className="w-2 h-2 bg-purple-600 rounded-full mt-2"></div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">Invoice generated</p>
                    <p className="text-xs text-gray-600">INV-2024-11-001 • Yesterday</p>
                  </div>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <h3 className="text-xl mb-4">Quick Actions</h3>
              <div className="grid grid-cols-2 gap-3">
                {isCoordinator && (
                  <>
                    <button
                      onClick={() => setActiveTab('students')}
                      className="p-4 border rounded-lg hover:border-[#625d9c] transition-colors text-left"
                    >
                      <Users className="w-6 h-6 text-[#625d9c] mb-2" />
                      <p className="font-medium text-sm">Add Students</p>
                    </button>
                    <button
                      onClick={() => setActiveTab('tutors')}
                      className="p-4 border rounded-lg hover:border-[#625d9c] transition-colors text-left"
                    >
                      <UserCheck className="w-6 h-6 text-[#5d9827] mb-2" />
                      <p className="font-medium text-sm">Review Tutors</p>
                    </button>
                  </>
                )}
                {isFinance && (
                  <button
                    onClick={() => setActiveTab('invoicing')}
                    className="p-4 border rounded-lg hover:border-[#625d9c] transition-colors text-left"
                  >
                    <FileText className="w-6 h-6 text-blue-600 mb-2" />
                    <p className="font-medium text-sm">View Invoices</p>
                  </button>
                )}
                <button
                  onClick={() => setActiveTab('profile')}
                  className="p-4 border rounded-lg hover:border-[#625d9c] transition-colors text-left"
                >
                  <Settings className="w-6 h-6 text-gray-600 mb-2" />
                  <p className="font-medium text-sm">Settings</p>
                </button>
              </div>
            </Card>

            <Card className="p-6 md:col-span-2">
              <h3 className="text-xl mb-4">Usage Overview</h3>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-gray-600">Students</span>
                    <span className="font-medium">
                      {organisationData?.subscription?.activeStudents || 0} / {organisationData?.subscription?.maxStudents || 0}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-[#625d9c] h-2 rounded-full"
                      style={{
                        width: `${Math.min(100, ((organisationData?.subscription?.activeStudents || 0) / (organisationData?.subscription?.maxStudents || 1)) * 100)}%`
                      }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-gray-600">Approved Tutors</span>
                    <span className="font-medium">
                      {organisationData?.subscription?.activeTutors || 0} / {organisationData?.subscription?.maxTutors || 0}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-[#5d9827] h-2 rounded-full"
                      style={{
                        width: `${Math.min(100, ((organisationData?.subscription?.activeTutors || 0) / (organisationData?.subscription?.maxTutors || 1)) * 100)}%`
                      }}
                    />
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </TabsContent>

        {/* Students Tab */}
        {isCoordinator && (
          <TabsContent value="students">
            <Card className="p-6">
              <h3 className="text-xl mb-4">Student Management</h3>
              <p className="text-gray-600">
                Bulk student management and enrollment features coming soon.
                For now, students can be added individually through the main platform.
              </p>
            </Card>
          </TabsContent>
        )}

        {/* Tutor Pool Tab */}
        {isCoordinator && (
          <TabsContent value="tutors">
            <TutorPoolManagement
              organisationId={organisationId}
              accessToken={accessToken}
              isCoordinator={isCoordinator}
            />
          </TabsContent>
        )}

        {/* Invoicing Tab */}
        {isFinance && (
          <TabsContent value="invoicing">
            <OrganisationInvoicing
              organisationId={organisationId}
              accessToken={accessToken}
              organisationData={organisationData}
            />
          </TabsContent>
        )}

        {/* Profile Tab */}
        <TabsContent value="profile">
          <OrganisationProfile
            organisationId={organisationId}
            accessToken={accessToken}
            isCoordinator={isCoordinator}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
