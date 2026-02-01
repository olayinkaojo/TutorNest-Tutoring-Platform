import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Alert, AlertDescription } from './ui/alert';
import { SubscriptionsPage } from './SubscriptionsPage';
import { 
  BookOpen, 
  FileText, 
  Upload, 
  Lock, 
  Download,
  Eye,
  CreditCard,
  CheckCircle,
  Globe,
  AlertCircle
} from 'lucide-react';
import { projectId } from '../utils/supabase/info';

interface ParentContentLibraryProps {
  session: any;
  parentId: string;
  subscriptionTier?: string;
}

export function ParentContentLibrary({ session, parentId, subscriptionTier = 'basic' }: ParentContentLibraryProps) {
  const [resources, setResources] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [freeResourcesUsed, setFreeResourcesUsed] = useState(0);
  const [showSubscription, setShowSubscription] = useState(false);
  const FREE_RESOURCE_LIMIT = 5;

  useEffect(() => {
    fetchResources();
    fetchUsageStats();
  }, []);

  const fetchResources = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-cbd74580/admin/resources/all`,
        {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setResources(data.resources || []);
      }
    } catch (error) {
      console.error('Error fetching resources:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUsageStats = async () => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-cbd74580/resources/usage-stats`,
        {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setFreeResourcesUsed(data.freeResourcesUsed || 0);
      }
    } catch (error) {
      console.error('Error fetching usage stats:', error);
    }
  };

  const handleDownload = async (resourceId: string, accessControl: string) => {
    // Check if resource requires subscription
    if (accessControl === 'private') {
      // Check if user has subscription
      if (subscriptionTier === 'basic') {
        // No subscription - check free limit
        if (freeResourcesUsed >= FREE_RESOURCE_LIMIT) {
          setShowSubscription(true);
          return;
        }
      }
    }

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-cbd74580/admin/resources/${resourceId}/download`,
        {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        }
      );

      if (!response.ok) {
        const error = await response.json();
        if (response.status === 403) {
          setShowSubscription(true);
          return;
        }
        throw new Error(error.error || 'Download failed');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = resources.find(r => r.id === resourceId)?.fileName || 'resource';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      // Update usage stats
      fetchUsageStats();
    } catch (error: any) {
      console.error('Download error:', error);
      alert(error.message);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (!bytes) return 'N/A';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const canAccessResource = (accessControl: string) => {
    if (accessControl === 'public') return true;
    if (subscriptionTier !== 'basic') return true;
    return freeResourcesUsed < FREE_RESOURCE_LIMIT;
  };

  const GRADE_LEVELS = [
    { value: 'all', label: 'All Grades' },
    { value: 'nursery_1', label: 'Reception (Nursery 1)' },
    { value: 'nursery_2', label: 'Year 1 (Nursery 2)' },
    { value: 'nursery_3', label: 'Year 2 (Nursery 3)' },
    { value: 'primary_1', label: 'Year 3 (Primary 1)' },
    { value: 'primary_2', label: 'Year 4 (Primary 2)' },
    { value: 'primary_3', label: 'Year 5 (Primary 3)' },
    { value: 'primary_4', label: 'Year 6 (Primary 4)' },
    { value: 'primary_5', label: 'Year 7 (Primary 5)' },
    { value: 'primary_6', label: 'Year 8 (Primary 6)' },
    { value: 'secondary_7', label: 'Year 9 (JSS 1)' },
    { value: 'secondary_8', label: 'Year 10 (JSS 2)' },
    { value: 'secondary_9', label: 'Year 11 (JSS 3)' },
    { value: 'secondary_10', label: 'Year 12 (SS 1)' },
    { value: 'secondary_11', label: 'Year 13 (SS 2)' },
    { value: 'sixth_form_12', label: 'A-Level Year 1 (SS 3)' },
    { value: 'sixth_form_13', label: 'A-Level Year 2 (Post-Secondary)' },
  ];

  const [selectedGrade, setSelectedGrade] = useState('all');
  const [selectedSubject, setSelectedSubject] = useState('all');

  const filteredResources = resources.filter(r => {
    if (selectedGrade !== 'all' && r.gradeLevel !== selectedGrade) return false;
    if (selectedSubject !== 'all' && r.subject !== selectedSubject) return false;
    return true;
  });

  const subjects = ['all', ...Array.from(new Set(resources.map(r => r.subject)))];

  if (showSubscription) {
    return (
      <div className="space-y-6">
        <Alert className="bg-yellow-50 border-yellow-200">
          <AlertCircle className="h-4 w-4 text-yellow-600" />
          <AlertDescription className="text-yellow-800">
            <strong>Free Resource Limit Reached!</strong> You've accessed {FREE_RESOURCE_LIMIT} free resources. Subscribe to get unlimited access to all learning materials.
          </AlertDescription>
        </Alert>

        <div className="flex justify-between items-center">
          <Button
            variant="outline"
            onClick={() => setShowSubscription(false)}
          >
            ← Back to Resources
          </Button>
        </div>

        <SubscriptionsPage 
          accessToken={session.access_token}
          parentId={parentId}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Subscription Status Banner */}
      <Card className={subscriptionTier === 'basic' ? 'border-2 border-yellow-200 bg-yellow-50' : 'border-2 border-green-200 bg-green-50'}>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              {subscriptionTier === 'basic' ? (
                <>
                  <h3 className="text-lg mb-2" style={{ color: '#625d9c' }}>
                    Free Access: {freeResourcesUsed} / {FREE_RESOURCE_LIMIT} Resources Used
                  </h3>
                  <p className="text-sm text-gray-700">
                    You can access {FREE_RESOURCE_LIMIT - freeResourcesUsed} more free resources. Subscribe for unlimited access to all learning materials!
                  </p>
                </>
              ) : (
                <>
                  <h3 className="text-lg mb-2 flex items-center gap-2" style={{ color: '#5d9827' }}>
                    <CheckCircle className="w-5 h-5" />
                    Premium Subscription Active
                  </h3>
                  <p className="text-sm text-gray-700">
                    You have unlimited access to all resources and learning materials.
                  </p>
                </>
              )}
            </div>
            {subscriptionTier === 'basic' && (
              <Button
                onClick={() => setShowSubscription(true)}
                className="text-white"
                style={{ backgroundColor: '#625d9c' }}
              >
                <CreditCard className="w-4 h-4 mr-2" />
                Subscribe Now
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Resources Library */}
      <Card>
        <CardHeader>
          <CardTitle>Learning Resources Library</CardTitle>
          <CardDescription>
            Access educational materials, worksheets, and study guides for your children
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex flex-wrap gap-3 mb-6">
            <div>
              <label className="text-sm text-gray-600 mb-1 block">Grade</label>
              <select
                value={selectedGrade}
                onChange={(e) => setSelectedGrade(e.target.value)}
                className="px-3 py-2 border rounded-lg text-sm"
              >
                {GRADE_LEVELS.map(grade => (
                  <option key={grade.value} value={grade.value}>{grade.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm text-gray-600 mb-1 block">Subject</label>
              <select
                value={selectedSubject}
                onChange={(e) => setSelectedSubject(e.target.value)}
                className="px-3 py-2 border rounded-lg text-sm capitalize"
              >
                {subjects.map(subject => (
                  <option key={subject} value={subject} className="capitalize">
                    {subject === 'all' ? 'All Subjects' : subject}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Resources List */}
          {loading ? (
            <div className="text-center py-12 text-gray-500">
              <BookOpen className="w-12 h-12 mx-auto mb-4 text-gray-300 animate-pulse" />
              <p>Loading resources...</p>
            </div>
          ) : filteredResources.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <BookOpen className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>No resources found matching your filters</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredResources.map((resource) => {
                const isAccessible = canAccessResource(resource.accessControl);
                const isLocked = !isAccessible && resource.accessControl === 'private';

                return (
                  <div
                    key={resource.id}
                    className={`flex items-center justify-between p-4 border rounded-lg ${isLocked ? 'bg-gray-50 opacity-75' : 'hover:bg-gray-50'}`}
                  >
                    <div className="flex items-center gap-4 flex-1">
                      <FileText className={`w-10 h-10 ${isLocked ? 'text-gray-400' : 'text-blue-600'}`} />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="text-sm">{resource.title}</h4>
                          {resource.accessControl === 'public' ? (
                            <Badge variant="outline" className="text-xs">
                              <Globe className="w-3 h-3 mr-1" />
                              Free
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-xs bg-yellow-50">
                              <Lock className="w-3 h-3 mr-1" />
                              Premium
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-xs text-gray-500">
                          <span>{GRADE_LEVELS.find(g => g.value === resource.gradeLevel)?.label || resource.gradeLevel}</span>
                          <span>•</span>
                          <span className="capitalize">{resource.subject}</span>
                          <span>•</span>
                          <span>{resource.resourceType}</span>
                          {resource.fileSize && (
                            <>
                              <span>•</span>
                              <span>{formatFileSize(resource.fileSize)}</span>
                            </>
                          )}
                        </div>
                        {resource.description && (
                          <p className="text-xs text-gray-600 mt-1 line-clamp-1">
                            {resource.description}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {resource.downloadCount !== undefined && (
                        <Badge variant="secondary" className="text-xs">
                          <Download className="w-3 h-3 mr-1" />
                          {resource.downloadCount}
                        </Badge>
                      )}
                      <Button
                        size="sm"
                        onClick={() => handleDownload(resource.id, resource.accessControl)}
                        disabled={isLocked}
                        className={isLocked ? '' : 'text-white'}
                        style={isLocked ? {} : { backgroundColor: '#625d9c' }}
                        variant={isLocked ? 'outline' : 'default'}
                      >
                        {isLocked ? (
                          <>
                            <Lock className="w-4 h-4 mr-2" />
                            Subscribe
                          </>
                        ) : (
                          <>
                            <Download className="w-4 h-4 mr-2" />
                            Download
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}