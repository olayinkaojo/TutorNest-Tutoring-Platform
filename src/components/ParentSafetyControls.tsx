import React, { useState, useEffect } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Switch } from './ui/switch';
import { Label } from './ui/label';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Separator } from './ui/separator';
import { Badge } from './ui/badge';
import { 
  Shield, 
  Ban, 
  FileWarning,
  MessageSquareOff,
  AlertTriangle,
  Loader2,
  Check,
  X,
  Plus,
  Info
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { projectId, publicAnonKey } from '../utils/supabase/info';

interface SafetyControls {
  restrictMessaging: boolean;
  sessionOnlyMessaging: boolean;
  allowedFileTypes: string[];
  maxFileSize: number;
  requireApprovalForFiles: boolean;
  blockList: string[];
  restrictVideoRecordings: boolean;
  requireParentPresence: boolean;
  autoReportInappropriate: boolean;
}

interface ParentSafetyControlsProps {
  userId: string;
  accessToken: string;
}

const COMMON_FILE_TYPES = [
  { id: 'pdf', label: 'PDF Documents', extension: '.pdf' },
  { id: 'doc', label: 'Word Documents', extension: '.doc,.docx' },
  { id: 'xls', label: 'Excel Spreadsheets', extension: '.xls,.xlsx' },
  { id: 'ppt', label: 'PowerPoint', extension: '.ppt,.pptx' },
  { id: 'txt', label: 'Text Files', extension: '.txt' },
  { id: 'images', label: 'Images (JPG, PNG)', extension: '.jpg,.jpeg,.png,.gif' },
  { id: 'audio', label: 'Audio Files', extension: '.mp3,.wav,.m4a' },
  { id: 'video', label: 'Video Files', extension: '.mp4,.mov,.avi' }
];

export function ParentSafetyControls({ userId, accessToken }: ParentSafetyControlsProps) {
  const [controls, setControls] = useState<SafetyControls>({
    restrictMessaging: false,
    sessionOnlyMessaging: false,
    allowedFileTypes: ['pdf', 'doc', 'images'],
    maxFileSize: 10,
    requireApprovalForFiles: true,
    blockList: [],
    restrictVideoRecordings: false,
    requireParentPresence: false,
    autoReportInappropriate: true
  });
  const [newBlockEmail, setNewBlockEmail] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [reportHistory, setReportHistory] = useState<any[]>([]);

  useEffect(() => {
    loadControls();
    loadReportHistory();
  }, [userId]);

  const loadControls = async () => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-cbd74580/safety-controls/${userId}`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`
          }
        }
      );

      if (response.ok) {
        const data = await response.json();
        if (data.controls) {
          setControls(data.controls);
        }
      }
    } catch (error) {
      console.error('Error loading safety controls:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadReportHistory = async () => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-cbd74580/reports?userId=${userId}`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`
          }
        }
      );

      if (response.ok) {
        const data = await response.json();
        setReportHistory(data.reports || []);
      }
    } catch (error) {
      console.error('Error loading report history:', error);
    }
  };

  const saveControls = async () => {
    setSaving(true);
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-cbd74580/safety-controls/${userId}`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ controls })
        }
      );

      if (response.ok) {
        toast.success('Safety controls saved');
      } else {
        toast.error('Failed to save controls');
      }
    } catch (error) {
      console.error('Error saving safety controls:', error);
      toast.error('Failed to save controls');
    } finally {
      setSaving(false);
    }
  };

  const updateControl = <K extends keyof SafetyControls>(
    key: K,
    value: SafetyControls[K]
  ) => {
    setControls(prev => ({ ...prev, [key]: value }));
  };

  const toggleFileType = (fileType: string) => {
    const updated = controls.allowedFileTypes.includes(fileType)
      ? controls.allowedFileTypes.filter(t => t !== fileType)
      : [...controls.allowedFileTypes, fileType];
    updateControl('allowedFileTypes', updated);
  };

  const addToBlockList = () => {
    if (!newBlockEmail.trim()) return;
    
    const email = newBlockEmail.trim().toLowerCase();
    if (controls.blockList.includes(email)) {
      toast.error('Email already in block list');
      return;
    }

    updateControl('blockList', [...controls.blockList, email]);
    setNewBlockEmail('');
    toast.success('Added to block list');
  };

  const removeFromBlockList = (email: string) => {
    updateControl('blockList', controls.blockList.filter(e => e !== email));
    toast.success('Removed from block list');
  };

  const submitReport = async (type: string, details: string) => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-cbd74580/reports`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            reportType: type,
            details,
            reportedBy: userId,
            timestamp: new Date().toISOString()
          })
        }
      );

      if (response.ok) {
        toast.success('Report submitted successfully');
        loadReportHistory();
      } else {
        toast.error('Failed to submit report');
      }
    } catch (error) {
      console.error('Error submitting report:', error);
      toast.error('Failed to submit report');
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
      {/* Messaging Controls */}
      <Card className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <MessageSquareOff className="w-6 h-6 text-[#625d9c]" />
          <div>
            <h3 className="text-xl">Messaging Controls</h3>
            <p className="text-sm text-gray-600">Restrict when and how messaging is allowed</p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="restrict-messaging">Restrict Messaging</Label>
              <p className="text-sm text-gray-600">
                Disable all messaging features
              </p>
            </div>
            <Switch
              id="restrict-messaging"
              checked={controls.restrictMessaging}
              onCheckedChange={(checked) => updateControl('restrictMessaging', checked)}
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="session-only">Session-Only Messaging</Label>
              <p className="text-sm text-gray-600">
                Only allow messaging during active sessions
              </p>
            </div>
            <Switch
              id="session-only"
              checked={controls.sessionOnlyMessaging}
              onCheckedChange={(checked) => updateControl('sessionOnlyMessaging', checked)}
              disabled={controls.restrictMessaging}
            />
          </div>
        </div>
      </Card>

      {/* File Sharing Controls */}
      <Card className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <FileWarning className="w-6 h-6 text-[#625d9c]" />
          <div>
            <h3 className="text-xl">File Sharing Controls</h3>
            <p className="text-sm text-gray-600">Control what files can be shared</p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <Label className="mb-3 block">Allowed File Types</Label>
            <div className="grid md:grid-cols-2 gap-3">
              {COMMON_FILE_TYPES.map((type) => (
                <div
                  key={type.id}
                  className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-gray-50"
                >
                  <input
                    type="checkbox"
                    id={`file-${type.id}`}
                    checked={controls.allowedFileTypes.includes(type.id)}
                    onChange={() => toggleFileType(type.id)}
                    className="h-4 w-4 rounded border-gray-300"
                  />
                  <Label
                    htmlFor={`file-${type.id}`}
                    className="flex-1 cursor-pointer text-sm"
                  >
                    {type.label}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          <Separator />

          <div className="space-y-2">
            <Label htmlFor="max-file-size">
              Maximum File Size (MB)
            </Label>
            <Input
              id="max-file-size"
              type="number"
              min={1}
              max={100}
              value={controls.maxFileSize}
              onChange={(e) => updateControl('maxFileSize', Number(e.target.value))}
              className="max-w-xs"
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="require-approval">Require Approval for Files</Label>
              <p className="text-sm text-gray-600">
                Files must be approved before students can access them
              </p>
            </div>
            <Switch
              id="require-approval"
              checked={controls.requireApprovalForFiles}
              onCheckedChange={(checked) => updateControl('requireApprovalForFiles', checked)}
            />
          </div>
        </div>
      </Card>

      {/* Block List */}
      <Card className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <Ban className="w-6 h-6 text-[#625d9c]" />
          <div>
            <h3 className="text-xl">Block List</h3>
            <p className="text-sm text-gray-600">Prevent specific tutors from contacting you</p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="Enter tutor email address"
              value={newBlockEmail}
              onChange={(e) => setNewBlockEmail(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && addToBlockList()}
            />
            <Button onClick={addToBlockList} variant="outline">
              <Plus className="w-4 h-4 mr-2" />
              Add
            </Button>
          </div>

          {controls.blockList.length > 0 ? (
            <div className="space-y-2">
              {controls.blockList.map((email) => (
                <div
                  key={email}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <span className="text-sm">{email}</span>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => removeFromBlockList(email)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500 text-center py-4">
              No blocked users
            </p>
          )}
        </div>
      </Card>

      {/* Session Safety */}
      <Card className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <Shield className="w-6 h-6 text-[#625d9c]" />
          <div>
            <h3 className="text-xl">Session Safety</h3>
            <p className="text-sm text-gray-600">Additional safety measures for live sessions</p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="restrict-recordings">Restrict Video Recordings</Label>
              <p className="text-sm text-gray-600">
                Prevent session recordings from being saved
              </p>
            </div>
            <Switch
              id="restrict-recordings"
              checked={controls.restrictVideoRecordings}
              onCheckedChange={(checked) => updateControl('restrictVideoRecordings', checked)}
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="parent-presence">Require Parent Presence</Label>
              <p className="text-sm text-gray-600">
                Parent must be present during all sessions
              </p>
            </div>
            <Switch
              id="parent-presence"
              checked={controls.requireParentPresence}
              onCheckedChange={(checked) => updateControl('requireParentPresence', checked)}
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="auto-report">Auto-Report Inappropriate Content</Label>
              <p className="text-sm text-gray-600">
                Automatically flag potentially inappropriate content
              </p>
            </div>
            <Switch
              id="auto-report"
              checked={controls.autoReportInappropriate}
              onCheckedChange={(checked) => updateControl('autoReportInappropriate', checked)}
            />
          </div>
        </div>
      </Card>

      {/* Report Options */}
      <Card className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <AlertTriangle className="w-6 h-6 text-[#625d9c]" />
          <div>
            <h3 className="text-xl">Report & Safety</h3>
            <p className="text-sm text-gray-600">Report concerns or inappropriate behavior</p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-start gap-2 p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <Info className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-amber-900">
              <p className="font-medium mb-1">Need to report something?</p>
              <p>
                If you have concerns about a tutor's behavior, inappropriate content, or safety issues,
                please use the report button on their profile or contact our safety team directly.
              </p>
            </div>
          </div>

          <Button
            variant="outline"
            className="w-full border-red-300 text-red-700 hover:bg-red-50"
            onClick={() => {
              // This would open a report dialog
              toast.info('Report dialog would open here');
            }}
          >
            <AlertTriangle className="w-4 h-4 mr-2" />
            Submit Safety Report
          </Button>

          {reportHistory.length > 0 && (
            <>
              <Separator />
              <div>
                <h4 className="font-medium mb-3">Your Reports</h4>
                <div className="space-y-2">
                  {reportHistory.slice(0, 3).map((report, index) => (
                    <div key={index} className="p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center justify-between mb-1">
                        <Badge variant="outline">{report.status}</Badge>
                        <span className="text-xs text-gray-500">
                          {new Date(report.timestamp).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-sm text-gray-700">{report.type}</p>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </Card>

      <div className="flex justify-end gap-3">
        <Button
          onClick={saveControls}
          disabled={saving}
          className="bg-[#5d9827] hover:bg-[#4a7a1f]"
        >
          {saving ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Check className="w-4 h-4 mr-2" />
              Save Controls
            </>
          )}
        </Button>
      </div>

      <Card className="p-4 bg-blue-50 border-blue-200">
        <div className="flex items-start gap-2">
          <Shield className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-900">
            <p className="font-medium mb-1">Your child's safety is our priority</p>
            <p>
              All tutors are verified and background-checked. Sessions are monitored, and our safety
              team is available 24/7 to respond to concerns.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
