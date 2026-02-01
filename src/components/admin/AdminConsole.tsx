import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { UserManagement } from './UserManagement';
import { ContentModeration } from './ContentModeration';
import { PolicyConfiguration } from './PolicyConfiguration';
import { RoleBasedAccessControl } from '../RoleBasedAccessControl';
import { 
  Users, 
  Shield, 
  Settings, 
  Eye,
  BarChart3,
  AlertTriangle,
  CheckCircle2
} from 'lucide-react';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';

interface AdminConsoleProps {
  userId: string;
  accessToken: string;
  userRole: 'admin' | 'ops' | 'support' | 'moderator' | 'finance';
  userName: string;
}

// Role permission mapping
const ROLE_PERMISSIONS = {
  admin: ['user-management', 'moderation', 'policy-config', 'rbac', 'analytics'],
  ops: ['user-management', 'policy-config', 'analytics'],
  support: ['user-management'],
  moderator: ['moderation'],
  finance: ['analytics']
};

export function AdminConsole({ userId, accessToken, userRole, userName }: AdminConsoleProps) {
  const [activeTab, setActiveTab] = useState(() => {
    // Set default tab based on role
    if (userRole === 'moderator') return 'moderation';
    if (userRole === 'ops') return 'policy-config';
    return 'user-management';
  });

  const hasPermission = (permission: string) => {
    return ROLE_PERMISSIONS[userRole]?.includes(permission) || false;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl">Admin Console</h1>
          <p className="text-gray-600 mt-1">
            Welcome back, {userName}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge className="bg-[#625d9c] text-white capitalize">
            {userRole}
          </Badge>
          <Badge variant="outline" className="text-green-600">
            <CheckCircle2 className="w-3 h-3 mr-1" />
            Authorized
          </Badge>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid md:grid-cols-4 gap-4">
        {hasPermission('user-management') && (
          <Card className="p-4">
            <div className="flex items-center justify-between mb-2">
              <Users className="w-5 h-5 text-[#625d9c]" />
              <Badge variant="outline">Today</Badge>
            </div>
            <div className="text-2xl font-bold">1,234</div>
            <div className="text-sm text-gray-600">Active Users</div>
          </Card>
        )}

        {hasPermission('moderation') && (
          <Card className="p-4">
            <div className="flex items-center justify-between mb-2">
              <AlertTriangle className="w-5 h-5 text-yellow-600" />
              <Badge variant="outline" className="text-yellow-600">Pending</Badge>
            </div>
            <div className="text-2xl font-bold">23</div>
            <div className="text-sm text-gray-600">Awaiting Review</div>
          </Card>
        )}

        {hasPermission('analytics') && (
          <>
            <Card className="p-4">
              <div className="flex items-center justify-between mb-2">
                <BarChart3 className="w-5 h-5 text-[#5d9827]" />
                <Badge variant="outline" className="text-green-600">+12%</Badge>
              </div>
              <div className="text-2xl font-bold">£15.2K</div>
              <div className="text-sm text-gray-600">Revenue (Week)</div>
            </Card>

            <Card className="p-4">
              <div className="flex items-center justify-between mb-2">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
                <Badge variant="outline">Today</Badge>
              </div>
              <div className="text-2xl font-bold">89</div>
              <div className="text-sm text-gray-600">Sessions Complete</div>
            </Card>
          </>
        )}
      </div>

      {/* Security Notice */}
      <Card className="p-4 bg-blue-50 border-blue-200">
        <div className="flex items-start gap-3">
          <Shield className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-900">
            <p className="font-medium mb-1">Security Notice</p>
            <p>
              All actions in the admin console are logged and audited. Sensitive data is masked by default.
              Access is granted based on role-based permissions ({userRole} role).
            </p>
          </div>
        </div>
      </Card>

      {/* Main Console Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 lg:grid-cols-5 gap-2">
          {hasPermission('user-management') && (
            <TabsTrigger value="user-management" className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              <span className="hidden sm:inline">Users</span>
            </TabsTrigger>
          )}

          {hasPermission('moderation') && (
            <TabsTrigger value="moderation" className="flex items-center gap-2">
              <Eye className="w-4 h-4" />
              <span className="hidden sm:inline">Moderation</span>
            </TabsTrigger>
          )}

          {hasPermission('policy-config') && (
            <TabsTrigger value="policy-config" className="flex items-center gap-2">
              <Settings className="w-4 h-4" />
              <span className="hidden sm:inline">Policies</span>
            </TabsTrigger>
          )}

          {hasPermission('rbac') && (
            <TabsTrigger value="rbac" className="flex items-center gap-2">
              <Shield className="w-4 h-4" />
              <span className="hidden sm:inline">Access Control</span>
            </TabsTrigger>
          )}

          {hasPermission('analytics') && (
            <TabsTrigger value="analytics" className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              <span className="hidden sm:inline">Analytics</span>
            </TabsTrigger>
          )}
        </TabsList>

        {/* User Management Tab */}
        {hasPermission('user-management') && (
          <TabsContent value="user-management">
            <UserManagement 
              adminId={userId}
              accessToken={accessToken}
              adminRole={userRole}
            />
          </TabsContent>
        )}

        {/* Content Moderation Tab */}
        {hasPermission('moderation') && (
          <TabsContent value="moderation">
            <ContentModeration 
              moderatorId={userId}
              accessToken={accessToken}
            />
          </TabsContent>
        )}

        {/* Policy Configuration Tab */}
        {hasPermission('policy-config') && (
          <TabsContent value="policy-config">
            <PolicyConfiguration 
              opsId={userId}
              accessToken={accessToken}
            />
          </TabsContent>
        )}

        {/* Role-Based Access Control Tab */}
        {hasPermission('rbac') && (
          <TabsContent value="rbac">
            <RoleBasedAccessControl 
              adminId={userId}
              accessToken={accessToken}
            />
          </TabsContent>
        )}

        {/* Analytics Tab */}
        {hasPermission('analytics') && (
          <TabsContent value="analytics">
            <div className="text-center py-12">
              <BarChart3 className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl mb-2">Analytics Dashboard</h3>
              <p className="text-gray-600">
                Comprehensive analytics and reporting coming soon
              </p>
            </div>
          </TabsContent>
        )}
      </Tabs>

      {/* Role-specific guidance */}
      <Card className="p-4 bg-gray-50">
        <h4 className="font-medium mb-2">Role Capabilities ({userRole})</h4>
        <ul className="text-sm text-gray-700 space-y-1">
          {userRole === 'admin' && (
            <>
              <li>• Full system access and configuration</li>
              <li>• User management and moderation</li>
              <li>• Policy configuration and RBAC management</li>
              <li>• Complete analytics and audit access</li>
            </>
          )}
          {userRole === 'ops' && (
            <>
              <li>• User management and basic support</li>
              <li>• Policy and operational configuration</li>
              <li>• Platform analytics and reporting</li>
            </>
          )}
          {userRole === 'support' && (
            <>
              <li>• View and assist users</li>
              <li>• Limited user management capabilities</li>
              <li>• Access to support tools and history</li>
            </>
          )}
          {userRole === 'moderator' && (
            <>
              <li>• Content review and moderation</li>
              <li>• Approve, reject, or flag content</li>
              <li>• Handle user reports and disputes</li>
            </>
          )}
          {userRole === 'finance' && (
            <>
              <li>• Financial data and payment management</li>
              <li>• Revenue and payout analytics</li>
              <li>• Transaction and dispute reports</li>
            </>
          )}
        </ul>
      </Card>
    </div>
  );
}
