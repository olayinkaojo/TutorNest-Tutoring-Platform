import KFALogo from './KFALogo';
import { Chatroom } from './Chatroom';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import { getSupabaseClient } from '../utils/supabase/client';
import { NotificationCenter } from './NotificationCenter';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Area,
  AreaChart
} from 'recharts';

interface UserProfile {
  id?: string;
  userId: string;
  role: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  subjects?: string[];
  hourlyRate?: number;
  bio?: string;
  verificationStatus?: string;
}

interface EnhancedTutorDashboardProps {
  profile: UserProfile;
  onSignOut: () => void;
}

export function EnhancedTutorDashboard({ profile, onSignOut }: EnhancedTutorDashboardProps) {
  const supabase = getSupabaseClient();
  const [session, setSession] = useState<any>(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [earnings, setEarnings] = useState({
    thisMonth: 1250,
    lastMonth: 980,
    pending: 320,
    total: 8540
  });
  const [students, setStudents] = useState<any[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [stats, setStats] = useState({
    totalStudents: 12,
    avgRating: 4.8,
    completionRate: 94,
    responseRate: 98
  });

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });
  }, []);

  useEffect(() => {
    loadTutorData();
  }, []);

  const loadTutorData = () => {
    // Mock data - replace with actual API calls
    setStudents([
      {
        id: 1,
        name: 'Emma Johnson',
        subject: 'Mathematics',
        sessions: 8,
        progress: 78,
        nextSession: '2024-11-18 14:00',
        recentScore: 85
      },
      {
        id: 2,
        name: 'Oliver Smith',
        subject: 'Mathematics',
        sessions: 12,
        progress: 92,
        nextSession: '2024-11-19 15:00',
        recentScore: 92
      },
      {
        id: 3,
        name: 'Sophia Brown',
        subject: 'Mathematics',
        sessions: 5,
        progress: 65,
        nextSession: '2024-11-20 16:00',
        recentScore: 76
      }
    ]);

    setSessions([
      {
        id: 1,
        student: 'Emma Johnson',
        subject: 'Mathematics',
        date: '2024-11-18',
        time: '14:00',
        status: 'upcoming',
        topic: 'Quadratic Equations'
      },
      {
        id: 2,
        student: 'Oliver Smith',
        subject: 'Mathematics',
        date: '2024-11-19',
        time: '15:00',
        status: 'upcoming',
        topic: 'Trigonometry'
      }
    ]);
  };

  const earningsData = [
    { month: 'Jun', earnings: 850, sessions: 12 },
    { month: 'Jul', earnings: 1120, sessions: 16 },
    { month: 'Aug', earnings: 980, sessions: 14 },
    { month: 'Sep', earnings: 1340, sessions: 19 },
    { month: 'Oct', earnings: 980, sessions: 14 },
    { month: 'Nov', earnings: 1250, sessions: 18 }
  ];

  const subjectDistribution = [
    { name: 'Algebra', value: 35, color: '#625d9c' },
    { name: 'Geometry', value: 25, color: '#5d9827' },
    { name: 'Calculus', value: 20, color: '#3b82f6' },
    { name: 'Statistics', value: 20, color: '#f59e0b' }
  ];

  const studentPerformance = [
    { student: 'Emma', week1: 65, week2: 72, week3: 78, week4: 85 },
    { student: 'Oliver', week1: 80, week2: 85, week3: 88, week4: 92 },
    { student: 'Sophia', week1: 60, week2: 65, week3: 70, week4: 76 }
  ];

  const timeSlots = [
    { time: '09:00', Mon: true, Tue: false, Wed: true, Thu: false, Fri: true },
    { time: '10:00', Mon: true, Tue: true, Wed: false, Thu: true, Fri: false },
    { time: '14:00', Mon: false, Tue: true, Wed: true, Thu: true, Fri: true },
    { time: '15:00', Mon: true, Tue: false, Wed: true, Thu: false, Fri: true },
    { time: '16:00', Mon: false, Tue: true, Wed: false, Thu: true, Fri: false }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <KFALogo />
            <div className="flex items-center gap-4">
              {/* Notification Center */}
              {session && (
                <NotificationCenter session={session} userId={profile.id || profile.userId} />
              )}
              <div className="flex items-center gap-2 px-3 py-1.5 bg-yellow-50 rounded-full">
                <Star className="w-4 h-4 text-yellow-600 fill-yellow-600" />
                <span className="text-sm">{stats.avgRating} Rating</span>
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full" style={{ backgroundColor: '#5d982720' }}>
                <CheckCircle className="w-4 h-4" style={{ color: '#5d9827' }} />
                <span className="text-sm">{stats.completionRate}% Complete Rate</span>
              </div>
              <Button variant="ghost" size="sm" onClick={onSignOut}>
                <LogOut className="w-4 h-4 mr-2" />
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="mb-2">Welcome back, {profile.firstName}! 👋</h1>
          <p className="text-gray-600">Here's your teaching overview</p>
        </div>

        {/* Stats */}
        <div className="grid md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">This Month</p>
                  <h2 className="mt-1">£{earnings.thisMonth}</h2>
                  <p className="text-xs text-green-600 flex items-center gap-1 mt-1">
                    <TrendingUp className="w-3 h-3" />
                    +27.5% vs last month
                  </p>
                </div>
                <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                  <DollarSign className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Active Students</p>
                  <h2 className="mt-1">{stats.totalStudents}</h2>
                </div>
                <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ backgroundColor: '#625d9c20' }}>
                  <Users className="w-6 h-6" style={{ color: '#625d9c' }} />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Avg Rating</p>
                  <h2 className="mt-1">{stats.avgRating}</h2>
                </div>
                <div className="w-12 h-12 bg-yellow-100 rounded-xl flex items-center justify-center">
                  <Star className="w-6 h-6 text-yellow-600 fill-yellow-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Pending</p>
                  <h2 className="mt-1">£{earnings.pending}</h2>
                </div>
                <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
                  <Clock className="w-6 h-6 text-orange-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="students">My Students</TabsTrigger>
            <TabsTrigger value="earnings">Earnings</TabsTrigger>
            <TabsTrigger value="schedule">Schedule</TabsTrigger>
            <TabsTrigger value="insights">Teaching Insights</TabsTrigger>
            <TabsTrigger value="resources">Resources</TabsTrigger>
            <TabsTrigger value="messages">Messages</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview">
            <div className="grid lg:grid-cols-2 gap-6">
              {/* Upcoming Sessions */}
              <Card>
                <CardHeader>
                  <CardTitle>Upcoming Sessions</CardTitle>
                  <CardDescription>Your scheduled lessons</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {sessions.map(session => (
                      <div key={session.id} className="flex items-start gap-4 p-4 border rounded-lg hover:bg-gray-50">
                        <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ backgroundColor: '#625d9c20' }}>
                          <BookOpen className="w-6 h-6" style={{ color: '#625d9c' }} />
                        </div>
                        <div className="flex-1">
                          <h4 className="mb-1">{session.subject} - {session.topic}</h4>
                          <p className="text-sm text-gray-600 mb-1">with {session.student}</p>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs">
                              <Calendar className="w-3 h-3 mr-1" />
                              {new Date(session.date).toLocaleDateString()}
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              <Clock className="w-3 h-3 mr-1" />
                              {session.time}
                            </Badge>
                          </div>
                        </div>
                        <Button size="sm" style={{ backgroundColor: '#625d9c' }}>
                          <Video className="w-4 h-4 mr-2" />
                          Start
                        </Button>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Quick Actions */}
              <Card>
                <CardHeader>
                  <CardTitle>Quick Actions</CardTitle>
                  <CardDescription>Common tasks and tools</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <Button variant="outline" className="h-20 flex-col">
                      <Calendar className="w-5 h-5 mb-2" />
                      <span className="text-sm">Manage Schedule</span>
                    </Button>
                    <Button variant="outline" className="h-20 flex-col">
                      <FileText className="w-5 h-5 mb-2" />
                      <span className="text-sm">Create Lesson</span>
                    </Button>
                    <Button variant="outline" className="h-20 flex-col">
                      <MessageSquare className="w-5 h-5 mb-2" />
                      <span className="text-sm">Messages</span>
                    </Button>
                    <Button variant="outline" className="h-20 flex-col">
                      <BarChart3 className="w-5 h-5 mb-2" />
                      <span className="text-sm">View Reports</span>
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Earnings Chart */}
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle>Earnings Overview</CardTitle>
                  <CardDescription>Monthly earnings and session count</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={earningsData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis yAxisId="left" />
                      <YAxis yAxisId="right" orientation="right" />
                      <Tooltip />
                      <Legend />
                      <Area yAxisId="left" type="monotone" dataKey="earnings" stroke="#5d9827" fill="#5d9827" fillOpacity={0.6} name="Earnings (£)" />
                      <Area yAxisId="right" type="monotone" dataKey="sessions" stroke="#625d9c" fill="#625d9c" fillOpacity={0.3} name="Sessions" />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Students Tab */}
          <TabsContent value="students">
            <div className="space-y-4">
              {students.map(student => (
                <Card key={student.id}>
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-4 flex-1">
                        <Avatar className="w-12 h-12">
                          <AvatarFallback style={{ backgroundColor: '#625d9c', color: 'white' }}>
                            {student.name.split(' ').map((n: string) => n[0]).join('')}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h4>{student.name}</h4>
                            <Badge variant="outline">{student.subject}</Badge>
                          </div>
                          <p className="text-sm text-gray-600 mb-3">
                            {student.sessions} sessions completed
                          </p>
                          
                          {/* Progress */}
                          <div className="mb-3">
                            <div className="flex justify-between text-sm mb-1">
                              <span>Overall Progress</span>
                              <span>{student.progress}%</span>
                            </div>
                            <Progress value={student.progress} className="h-2" />
                          </div>

                          <div className="flex items-center gap-4 text-sm text-gray-600">
                            <span className="flex items-center gap-1">
                              <Clock className="w-4 h-4" />
                              Next: {new Date(student.nextSession).toLocaleDateString()}
                            </span>
                            <span className="flex items-center gap-1">
                              <Star className="w-4 h-4 text-yellow-600" />
                              Recent: {student.recentScore}%
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm">
                          <MessageSquare className="w-4 h-4 mr-2" />
                          Message
                        </Button>
                        <Button variant="outline" size="sm">
                          <FileText className="w-4 h-4 mr-2" />
                          Report
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Earnings Tab */}
          <TabsContent value="earnings">
            <div className="grid lg:grid-cols-3 gap-6 mb-6">
              <Card>
                <CardContent className="pt-6">
                  <p className="text-sm text-gray-600 mb-1">Total Earned</p>
                  <h2 className="mb-1">£{earnings.total}</h2>
                  <p className="text-xs text-gray-500">All time</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <p className="text-sm text-gray-600 mb-1">This Month</p>
                  <h2 className="mb-1">£{earnings.thisMonth}</h2>
                  <p className="text-xs text-green-600">+27.5% vs last month</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <p className="text-sm text-gray-600 mb-1">Pending Payout</p>
                  <h2 className="mb-1">£{earnings.pending}</h2>
                  <p className="text-xs text-gray-500">Available in 3 days</p>
                </CardContent>
              </Card>
            </div>

            <div className="grid lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Earnings Breakdown</CardTitle>
                  <CardDescription>Last 6 months</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={earningsData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="earnings" fill="#5d9827" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Subject Distribution</CardTitle>
                  <CardDescription>Earnings by topic</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={subjectDistribution}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {subjectDistribution.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Schedule Tab */}
          <TabsContent value="schedule">
            <Card>
              <CardHeader>
                <CardTitle>Weekly Availability</CardTitle>
                <CardDescription>Manage your teaching schedule</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr>
                        <th className="text-left p-2">Time</th>
                        <th className="text-center p-2">Mon</th>
                        <th className="text-center p-2">Tue</th>
                        <th className="text-center p-2">Wed</th>
                        <th className="text-center p-2">Thu</th>
                        <th className="text-center p-2">Fri</th>
                      </tr>
                    </thead>
                    <tbody>
                      {timeSlots.map((slot, index) => (
                        <tr key={index} className="border-t">
                          <td className="p-2">{slot.time}</td>
                          <td className="text-center p-2">
                            <div className={`w-8 h-8 rounded-full mx-auto ${slot.Mon ? 'bg-green-500' : 'bg-gray-200'}`} />
                          </td>
                          <td className="text-center p-2">
                            <div className={`w-8 h-8 rounded-full mx-auto ${slot.Tue ? 'bg-green-500' : 'bg-gray-200'}`} />
                          </td>
                          <td className="text-center p-2">
                            <div className={`w-8 h-8 rounded-full mx-auto ${slot.Wed ? 'bg-green-500' : 'bg-gray-200'}`} />
                          </td>
                          <td className="text-center p-2">
                            <div className={`w-8 h-8 rounded-full mx-auto ${slot.Thu ? 'bg-green-500' : 'bg-gray-200'}`} />
                          </td>
                          <td className="text-center p-2">
                            <div className={`w-8 h-8 rounded-full mx-auto ${slot.Fri ? 'bg-green-500' : 'bg-gray-200'}`} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Teaching Insights Tab */}
          <TabsContent value="insights">
            <div className="grid lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Student Progress Trends</CardTitle>
                  <CardDescription>Weekly score improvements</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={studentPerformance}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="student" />
                      <YAxis domain={[0, 100]} />
                      <Tooltip />
                      <Legend />
                      <Line type="monotone" dataKey="week1" stroke="#625d9c" name="Week 1" />
                      <Line type="monotone" dataKey="week2" stroke="#5d9827" name="Week 2" />
                      <Line type="monotone" dataKey="week3" stroke="#3b82f6" name="Week 3" />
                      <Line type="monotone" dataKey="week4" stroke="#f59e0b" name="Week 4" />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Teaching Tips</CardTitle>
                  <CardDescription>AI-powered recommendations</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <Alert className="bg-blue-50 border-blue-200">
                      <Lightbulb className="h-4 w-4 text-blue-600" />
                      <AlertDescription className="text-blue-800">
                        <strong>Engagement Tip:</strong> Emma shows higher retention with visual aids. Consider using more diagrams in your next session.
                      </AlertDescription>
                    </Alert>
                    <Alert className="bg-green-50 border-green-200">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <AlertDescription className="text-green-800">
                        <strong>Great Work!</strong> Oliver's progress is 15% above average. Your teaching approach is very effective!
                      </AlertDescription>
                    </Alert>
                    <Alert className="bg-orange-50 border-orange-200">
                      <AlertCircle className="h-4 w-4 text-orange-600" />
                      <AlertDescription className="text-orange-800">
                        <strong>Action Needed:</strong> Sophia may benefit from additional practice exercises. Consider assigning homework.
                      </AlertDescription>
                    </Alert>
                  </div>
                </CardContent>
              </Card>

              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle>Professional Development</CardTitle>
                  <CardDescription>Track your teaching certifications and training</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-3 gap-4">
                    <div className="p-4 border rounded-lg text-center">
                      <Award className="w-8 h-8 mx-auto mb-2" style={{ color: '#625d9c' }} />
                      <h4 className="mb-1">Active Certifications</h4>
                      <p className="text-2xl">3</p>
                    </div>
                    <div className="p-4 border rounded-lg text-center">
                      <BookOpen className="w-8 h-8 mx-auto mb-2 text-blue-600" />
                      <h4 className="mb-1">Courses Completed</h4>
                      <p className="text-2xl">7</p>
                    </div>
                    <div className="p-4 border rounded-lg text-center">
                      <Target className="w-8 h-8 mx-auto mb-2" style={{ color: '#5d9827' }} />
                      <h4 className="mb-1">In Progress</h4>
                      <p className="text-2xl">2</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Resources Tab */}
          <TabsContent value="resources">
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              <Card>
                <CardContent className="pt-6 text-center">
                  <FileText className="w-12 h-12 mx-auto mb-4" style={{ color: '#625d9c' }} />
                  <h4 className="mb-2">Lesson Plans</h4>
                  <p className="text-sm text-gray-600 mb-4">Access pre-built lesson templates</p>
                  <Button variant="outline" className="w-full">Browse Templates</Button>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6 text-center">
                  <BookOpen className="w-12 h-12 mx-auto mb-4 text-blue-600" />
                  <h4 className="mb-2">Practice Materials</h4>
                  <p className="text-sm text-gray-600 mb-4">Worksheets and exercises</p>
                  <Button variant="outline" className="w-full">View Resources</Button>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6 text-center">
                  <Brain className="w-12 h-12 mx-auto mb-4" style={{ color: '#5d9827' }} />
                  <h4 className="mb-2">Training Center</h4>
                  <p className="text-sm text-gray-600 mb-4">Improve your teaching skills</p>
                  <Button variant="outline" className="w-full">Start Learning</Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Messages Tab */}
          <TabsContent value="messages">
            {session ? (
              <Chatroom
                session={session}
                userId={profile.userId || profile.id || ''}
                userName={`${profile.firstName || ''} ${profile.lastName || ''}`.trim() || 'Tutor'}
                userRole="tutor"
              />
            ) : (
              <div className="text-center py-12 text-gray-500">Loading messages...</div>
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}