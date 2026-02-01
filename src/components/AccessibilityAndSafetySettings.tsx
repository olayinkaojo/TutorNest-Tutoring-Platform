import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { AccessibilitySettings } from './AccessibilitySettings';
import { LearningPreferences } from './LearningPreferences';
import { ParentSafetyControls } from './ParentSafetyControls';
import { Eye, Heart, Shield, FileText } from 'lucide-react';
import { Button } from './ui/button';

interface AccessibilityAndSafetySettingsProps {
  userId: string;
  accessToken: string;
  userRole: string;
  children?: Array<{ id: string; name: string }>;
}

export function AccessibilityAndSafetySettings({ 
  userId, 
  accessToken, 
  userRole,
  children = []
}: AccessibilityAndSafetySettingsProps) {
  const [activeTab, setActiveTab] = useState('accessibility');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl">Accessibility & Safety</h2>
          <p className="text-gray-600 mt-1">
            Customize your experience and manage safety controls
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => window.open('/accessibility-statement', '_blank')}
          className="hidden md:flex"
        >
          <FileText className="w-4 h-4 mr-2" />
          View Full Statement
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 lg:grid-cols-4 gap-2">
          <TabsTrigger value="accessibility" className="flex items-center gap-2">
            <Eye className="w-4 h-4" />
            <span className="hidden sm:inline">Accessibility</span>
          </TabsTrigger>
          
          {userRole === 'parent' && (
            <>
              <TabsTrigger value="learning" className="flex items-center gap-2">
                <Heart className="w-4 h-4" />
                <span className="hidden sm:inline">Learning Preferences</span>
              </TabsTrigger>
              <TabsTrigger value="safety" className="flex items-center gap-2">
                <Shield className="w-4 h-4" />
                <span className="hidden sm:inline">Safety Controls</span>
              </TabsTrigger>
            </>
          )}
          
          <TabsTrigger value="statement" className="flex items-center gap-2">
            <FileText className="w-4 h-4" />
            <span className="hidden sm:inline">Statement</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="accessibility" className="space-y-6">
          <AccessibilitySettings userId={userId} accessToken={accessToken} />
        </TabsContent>

        {userRole === 'parent' && (
          <>
            <TabsContent value="learning" className="space-y-6">
              <LearningPreferences 
                userId={userId} 
                accessToken={accessToken}
                children={children}
              />
            </TabsContent>

            <TabsContent value="safety" className="space-y-6">
              <ParentSafetyControls userId={userId} accessToken={accessToken} />
            </TabsContent>
          </>
        )}

        <TabsContent value="statement" className="space-y-6">
          <iframe
            src="/accessibility-statement"
            className="w-full h-[600px] border rounded-lg"
            title="Accessibility Statement"
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
