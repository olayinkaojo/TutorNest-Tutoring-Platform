import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Badge } from './ui/badge';
import { 
  BookOpen, 
  Gamepad2,
  FileText,
  Download,
  Upload,
  Sparkles,
  Award,
  Target,
  Zap,
  LockKeyhole,
  Calendar,
} from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';

interface ResourcesHubProps {
  session: any;
  userId: string;
  userRole: 'parent' | 'student' | 'tutor';
  gradeLevel?: string;
}

export function ResourcesHub({ session, userId, userRole, gradeLevel }: ResourcesHubProps) {
  const [activeTab, setActiveTab] = useState('workbook');

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
                <h3 className="text-xl mb-2">TutorNest Workbook</h3>
                <p className="text-gray-600 max-w-2xl mx-auto">
                  Comprehensive workbooks tailored to each grade level with exercises, 
                  practice problems, and learning materials aligned with the curriculum
                </p>
              </div>

              {/* Coming Soon Alert */}
              <Alert className="border-2" style={{ borderColor: '#625d9c', backgroundColor: '#625d9c10' }}>
                <LockKeyhole className="h-4 w-4" style={{ color: '#625d9c' }} />
                <AlertTitle style={{ color: '#625d9c' }}>Coming Soon</AlertTitle>
                <AlertDescription>
                  Grade-specific workbooks will be uploaded here soon. Stay tuned for comprehensive 
                  learning materials including:
                  <ul className="mt-3 ml-4 space-y-1 list-disc">
                    <li>Subject-specific exercises and practice questions</li>
                    <li>Step-by-step solutions and explanations</li>
                    <li>Progressive difficulty levels</li>
                    <li>Printable worksheets and activities</li>
                    <li>Revision guides and study notes</li>
                  </ul>
                </AlertDescription>
              </Alert>

              {/* Placeholder Features Grid */}
              <div className="grid md:grid-cols-2 gap-4">
                <Card className="border-2 border-dashed">
                  <CardContent className="pt-6">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#625d9c20' }}>
                        <FileText className="w-6 h-6" style={{ color: '#625d9c' }} />
                      </div>
                      <div>
                        <h4 className="mb-2">Digital Workbooks</h4>
                        <p className="text-sm text-gray-600">
                          Interactive PDF workbooks for all subjects and grade levels
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-2 border-dashed">
                  <CardContent className="pt-6">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#5d982720' }}>
                        <Download className="w-6 h-6" style={{ color: '#5d9827' }} />
                      </div>
                      <div>
                        <h4 className="mb-2">Download & Print</h4>
                        <p className="text-sm text-gray-600">
                          Download workbooks for offline use and printing
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
                        <h4 className="mb-2">Progress Tracking</h4>
                        <p className="text-sm text-gray-600">
                          Track completion and mastery of workbook exercises
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-2 border-dashed">
                  <CardContent className="pt-6">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#5d982720' }}>
                        <Calendar className="w-6 h-6" style={{ color: '#5d9827' }} />
                      </div>
                      <div>
                        <h4 className="mb-2">Regular Updates</h4>
                        <p className="text-sm text-gray-600">
                          New content and exercises added regularly
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Admin Upload Section (For Tutors/Admin) */}
              {(userRole === 'tutor' || userRole === 'admin') && (
                <Card className="border-2" style={{ borderColor: '#5d9827' }}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Upload className="w-5 h-5" style={{ color: '#5d9827' }} />
                      Upload Workbook (Admin Only)
                    </CardTitle>
                    <CardDescription>
                      Upload grade-specific workbooks for students
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Alert>
                      <AlertDescription>
                        Workbook upload functionality will be available soon. 
                        This will allow administrators to upload PDF workbooks organized by grade level and subject.
                      </AlertDescription>
                    </Alert>
                  </CardContent>
                </Card>
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
