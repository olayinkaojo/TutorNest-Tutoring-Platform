import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Badge } from './ui/badge';
import {
  BookOpen,
  Gamepad2,
  FileText,
  Download,
  Sparkles,
  Award,
  Target,
  Zap,
  Globe,
  Lock,
  Loader2,
} from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { projectId } from '../utils/supabase/info';
import { toast } from 'sonner@2.0.3';

interface ResourcesHubProps {
  session: any;
  userId: string;
  userRole: 'parent' | 'student' | 'tutor';
  gradeLevel?: string;
}

interface Resource {
  id: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  gradeLevel: string;
  subject: string;
  resourceType: string;
  title: string;
  description: string;
  accessControl: 'public' | 'private';
  uploadedAt: string;
  downloadCount: number;
}

function formatFileSize(bytes: number) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

export function ResourcesHub({ session, userId, userRole, gradeLevel }: ResourcesHubProps) {
  const [activeTab, setActiveTab] = useState('workbook');
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const edgeBase = `https://${projectId}.supabase.co/functions/v1/make-server-cbd74580`;

  // Previously this tab was a hardcoded "Coming Soon" placeholder that
  // never called any endpoint — admins could upload workbooks/worksheets
  // indefinitely via ResourcesUploader.tsx and they were structurally
  // unreachable by the parents/students/tutors they were uploaded for.
  // The admin-prefixed listing/download endpoints also have real
  // subscription-tier access control built in, but live under /admin/*
  // and are blocked for non-admins by that path's global auth middleware
  // — GET /resources and /resources/:id/download (admin-routes.tsx) are
  // the same data, reachable by the actual audience.
  useEffect(() => {
    if (!session?.access_token) return;
    loadResources();
  }, [session, gradeLevel]);

  const loadResources = async () => {
    setLoading(true);
    setError('');
    try {
      const url = new URL(`${edgeBase}/resources`);
      if (gradeLevel) url.searchParams.set('gradeLevel', gradeLevel);

      const response = await fetch(url.toString(), {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to load resources');
      setResources(data.resources || []);
    } catch (err: any) {
      console.error('Error loading resources:', err);
      setError(err.message || 'Failed to load resources. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (resource: Resource) => {
    if (!session?.access_token || downloadingId) return;
    setDownloadingId(resource.id);
    try {
      const response = await fetch(`${edgeBase}/resources/${resource.id}/download`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || 'Download failed');
      }
      // A plain <a href> can't carry the Authorization header this edge
      // function requires, so the file is fetched here and handed to the
      // browser as a blob instead.
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = resource.fileName;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(blobUrl);
      setResources((prev) => prev.map((r) => (r.id === resource.id ? { ...r, downloadCount: r.downloadCount + 1 } : r)));
    } catch (err: any) {
      console.error('Error downloading resource:', err);
      toast.error(err.message || 'Failed to download this resource. Please try again.');
    } finally {
      setDownloadingId(null);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="w-6 h-6" style={{ color: '#625d9c' }} />
              Learning Resources Hub
            </CardTitle>
            <CardDescription>
              Access workbooks and interactive gamification features
            </CardDescription>
          </div>
          <Badge className="text-white" style={{ backgroundColor: '#5d9827' }}>
            {gradeLevel ? `Grade: ${gradeLevel.replace('year_', 'Year ')}` : 'All Grades'}
          </Badge>
        </div>
      </CardHeader>

      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="workbook" className="flex items-center gap-2">
              <BookOpen className="w-4 h-4" />
              Workbook
            </TabsTrigger>
            <TabsTrigger value="gamification" className="flex items-center gap-2">
              <Gamepad2 className="w-4 h-4" />
              Gamification
            </TabsTrigger>
          </TabsList>

          {/* Workbook Tab */}
          <TabsContent value="workbook">
            <div className="space-y-6">
              {/* Header Section */}
              <div className="text-center py-8 px-4 rounded-lg" style={{ backgroundColor: '#625d9c15' }}>
                <div className="w-20 h-20 mx-auto mb-4 rounded-full flex items-center justify-center" style={{ backgroundColor: '#625d9c' }}>
                  <BookOpen className="w-10 h-10 text-white" />
                </div>
                <h3 className="text-xl mb-2">Knowledge Fons Academy Workbook</h3>
                <p className="text-gray-600 max-w-2xl mx-auto">
                  Comprehensive workbooks tailored to each grade level with exercises,
                  practice problems, and learning materials aligned with the curriculum
                </p>
              </div>

              {error && (
                <Alert className="border-red-200 bg-red-50">
                  <AlertDescription className="text-red-800">{error}</AlertDescription>
                </Alert>
              )}

              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin" style={{ color: '#625d9c' }} />
                </div>
              ) : resources.length === 0 ? (
                <div className="text-center py-12 text-gray-500 border-2 border-dashed rounded-lg">
                  <FileText className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p>
                    No workbooks uploaded yet{gradeLevel ? ` for ${gradeLevel.replace('year_', 'Year ')}` : ''}.
                  </p>
                  <p className="text-sm mt-1">Check back soon — new materials are added regularly.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {resources.map((resource) => (
                    <div
                      key={resource.id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                    >
                      <div className="flex items-center gap-4 flex-1 min-w-0">
                        <FileText className="w-10 h-10 flex-shrink-0" style={{ color: '#625d9c' }} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="text-sm truncate">{resource.title}</h4>
                            {resource.accessControl === 'public' ? (
                              <Badge variant="outline" className="text-xs flex-shrink-0">
                                <Globe className="w-3 h-3 mr-1" />
                                Free
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-xs flex-shrink-0">
                                <Lock className="w-3 h-3 mr-1" />
                                Subscribers
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-3 text-xs text-gray-500 flex-wrap">
                            <span>{resource.subject}</span>
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
                            <p className="text-xs text-gray-600 mt-1 line-clamp-1">{resource.description}</p>
                          )}
                        </div>
                      </div>
                      <Button
                        size="sm"
                        className="flex-shrink-0 text-white ml-3"
                        style={{ backgroundColor: '#625d9c' }}
                        disabled={downloadingId === resource.id}
                        onClick={() => handleDownload(resource)}
                      >
                        {downloadingId === resource.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <>
                            <Download className="w-4 h-4 mr-1.5" />
                            Download
                          </>
                        )}
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          {/* Gamification Tab */}
          <TabsContent value="gamification">
            <div className="space-y-6">
              {/* Header Section */}
              <div className="text-center py-8 px-4 rounded-lg" style={{ backgroundColor: '#5d982715' }}>
                <div className="w-20 h-20 mx-auto mb-4 rounded-full flex items-center justify-center" style={{ backgroundColor: '#5d9827' }}>
                  <Gamepad2 className="w-10 h-10 text-white" />
                </div>
                <h3 className="text-xl mb-2">Interactive Learning Games</h3>
                <p className="text-gray-600 max-w-2xl mx-auto">
                  Engaging educational games and challenges that make learning fun
                  while reinforcing key concepts across all subjects
                </p>
              </div>

              {/* Coming Soon Alert */}
              <Alert className="border-2" style={{ borderColor: '#5d9827', backgroundColor: '#5d982710' }}>
                <Sparkles className="h-4 w-4" style={{ color: '#5d9827' }} />
                <AlertTitle style={{ color: '#5d9827' }}>Under Development</AlertTitle>
                <AlertDescription>
                  Interactive gamification features are currently being developed. Upcoming features include:
                  <ul className="mt-3 ml-4 space-y-1 list-disc">
                    <li>Subject-based educational games and challenges</li>
                    <li>Multiplayer quizzes and competitions</li>
                    <li>Achievement badges and rewards system</li>
                    <li>Leaderboards and progress milestones</li>
                    <li>Adaptive difficulty based on performance</li>
                    <li>Daily challenges and bonus rounds</li>
                  </ul>
                </AlertDescription>
              </Alert>

              {/* Placeholder Features Grid */}
              <div className="grid md:grid-cols-2 gap-4">
                <Card className="border-2 border-dashed">
                  <CardContent className="pt-6">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#5d982720' }}>
                        <Gamepad2 className="w-6 h-6" style={{ color: '#5d9827' }} />
                      </div>
                      <div>
                        <h4 className="mb-2">Educational Games</h4>
                        <p className="text-sm text-gray-600">
                          Fun and engaging games covering Math, Science, English, and more
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-2 border-dashed">
                  <CardContent className="pt-6">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#625d9c20' }}>
                        <Award className="w-6 h-6" style={{ color: '#625d9c' }} />
                      </div>
                      <div>
                        <h4 className="mb-2">Achievements System</h4>
                        <p className="text-sm text-gray-600">
                          Earn badges and unlock rewards as you progress
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-2 border-dashed">
                  <CardContent className="pt-6">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#5d982720' }}>
                        <Zap className="w-6 h-6" style={{ color: '#5d9827' }} />
                      </div>
                      <div>
                        <h4 className="mb-2">Power-ups & Bonuses</h4>
                        <p className="text-sm text-gray-600">
                          Special power-ups and bonus points for consistent learning
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-2 border-dashed">
                  <CardContent className="pt-6">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#625d9c20' }}>
                        <Target className="w-6 h-6" style={{ color: '#625d9c' }} />
                      </div>
                      <div>
                        <h4 className="mb-2">Challenge Mode</h4>
                        <p className="text-sm text-gray-600">
                          Compete with peers in timed challenges and tournaments
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Note for Current Trivia */}
              <Alert>
                <Sparkles className="h-4 w-4" />
                <AlertTitle>Current Trivia Feature</AlertTitle>
                <AlertDescription>
                  The existing Trivia & Rewards feature is available in the Student Dashboard.
                  This new gamification section will expand on that with more interactive games and features.
                </AlertDescription>
              </Alert>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
