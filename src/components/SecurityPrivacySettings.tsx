import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { CookieConsent } from './CookieConsent';
import { DataSubjectRights } from './DataSubjectRights';
import { PrivacyPolicy } from './PrivacyPolicy';
import { RoleBasedAccessControl } from './RoleBasedAccessControl';
import { Shield, FileText, Cookie, Users, Eye } from 'lucide-react';
import { Button } from './ui/button';

interface SecurityPrivacySettingsProps {
  userId: string;
  accessToken: string;
  userEmail: string;
  userRole: 'parent' | 'tutor' | 'student' | 'admin';
}

export function SecurityPrivacySettings({ 
  userId, 
  accessToken, 
  userEmail,
  userRole
}: SecurityPrivacySettingsProps) {
  const [activeTab, setActiveTab] = useState('dsar');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl">Security & Privacy</h2>
          <p className="text-gray-600 mt-1">
            Manage your data, privacy preferences, and access rights
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 lg:grid-cols-5 gap-2">
          <TabsTrigger value="dsar" className="flex items-center gap-2">
            <Shield className="w-4 h-4" />
            <span className="hidden sm:inline">Your Rights</span>
          </TabsTrigger>
          
          <TabsTrigger value="cookies" className="flex items-center gap-2">
            <Cookie className="w-4 h-4" />
            <span className="hidden sm:inline">Cookies</span>
          </TabsTrigger>
          
          <TabsTrigger value="privacy" className="flex items-center gap-2">
            <FileText className="w-4 h-4" />
            <span className="hidden sm:inline">Privacy Policy</span>
          </TabsTrigger>

          {userRole === 'admin' && (
            <>
              <TabsTrigger value="rbac" className="flex items-center gap-2">
                <Users className="w-4 h-4" />
                <span className="hidden sm:inline">Access Control</span>
              </TabsTrigger>

              <TabsTrigger value="audit" className="flex items-center gap-2">
                <Eye className="w-4 h-4" />
                <span className="hidden sm:inline">Audit</span>
              </TabsTrigger>
            </>
          )}
        </TabsList>

        <TabsContent value="dsar" className="space-y-6">
          <DataSubjectRights 
            userId={userId} 
            accessToken={accessToken}
            userEmail={userEmail}
          />
        </TabsContent>

        <TabsContent value="cookies" className="space-y-6">
          <div className="max-w-4xl">
            <h3 className="text-2xl mb-4">Cookie Preferences</h3>
            <p className="text-gray-600 mb-6">
              Manage your cookie consent preferences. You can customize which types of cookies
              you allow TutorNest to use.
            </p>
            <Button
              onClick={() => {
                // Clear consent to show banner again
                localStorage.removeItem('tutornest_cookie_consent');
                window.location.reload();
              }}
              variant="outline"
            >
              Review Cookie Settings
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="privacy" className="space-y-6">
          <PrivacyPolicy />
        </TabsContent>

        {userRole === 'admin' && (
          <>
            <TabsContent value="rbac" className="space-y-6">
              <RoleBasedAccessControl 
                adminId={userId} 
                accessToken={accessToken}
              />
            </TabsContent>

            <TabsContent value="audit" className="space-y-6">
              <div className="text-center py-12">
                <Eye className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl mb-2">Audit Trail</h3>
                <p className="text-gray-600">
                  View detailed audit logs in the Access Control section
                </p>
              </div>
            </TabsContent>
          </>
        )}
      </Tabs>
    </div>
  );
}
