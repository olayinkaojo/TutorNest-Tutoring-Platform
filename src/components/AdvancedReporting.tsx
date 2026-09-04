import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import {
  FileText,
  Download,
  Calendar,
  TrendingUp,
  TrendingDown,
  Target,
  Award,
  AlertCircle,
  CheckCircle,
  BarChart3,
  PieChart as PieChartIcon
} from 'lucide-react';
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
  AreaChart,
  ComposedChart,
  Scatter
} from 'recharts';

interface AdvancedReportingProps {
  userId: string;
  userType: 'student' | 'tutor' | 'parent' | 'admin';
}

export function AdvancedReporting({ userId, userType }: AdvancedReportingProps) {
  const [dateRange, setDateRange] = useState('last-30-days');
  const [selectedStudent, setSelectedStudent] = useState('all');
  const [reportType, setReportType] = useState('overview');

  // Mock data - replace with actual API calls
  const performanceData = [
    { date: '2024-10-15', math: 75, english: 82, science: 78, attendance: 100 },
    { date: '2024-10-22', math: 78, english: 85, science: 80, attendance: 100 },
    { date: '2024-10-29', math: 82, english: 87, science: 83, attendance: 100 },
    { date: '2024-11-05', math: 85, english: 90, science: 85, attendance: 100 },
    { date: '2024-11-12', math: 88, english: 92, science: 87, attendance: 100 }
  ];

  const subjectBreakdown = [
    { subject: 'Mathematics', sessions: 12, hours: 18, avgScore: 85, improvement: 12 },
    { subject: 'English', sessions: 10, hours: 15, avgScore: 90, improvement: 8 },
    { subject: 'Science', sessions: 8, hours: 12, avgScore: 83, improvement: 9 }
  ];

  const learningPatterns = [
    { day: 'Mon', morning: 2, afternoon: 5, evening: 1 },
    { day: 'Tue', morning: 3, afternoon: 4, evening: 2 },
    { day: 'Wed', morning: 1, afternoon: 6, evening: 1 },
    { day: 'Thu', morning: 2, afternoon: 5, evening: 3 },
    { day: 'Fri', morning: 4, afternoon: 3, evening: 2 }
  ];

  const competencyMap = [
    { skill: 'Problem Solving', current: 85, target: 90 },
    { skill: 'Critical Thinking', current: 78, target: 85 },
    { skill: 'Communication', current: 92, target: 95 },
    { skill: 'Time Management', current: 70, target: 80 },
    { skill: 'Research', current: 88, target: 90 }
  ];

  const goalTracking = [
    {
      goal: 'Master Quadratic Equations',
      progress: 75,
      target: 100,
      status: 'on-track',
      dueDate: '2024-12-01'
    },
    {
      goal: 'Improve Essay Writing',
      progress: 45,
      target: 100,
      status: 'needs-attention',
      dueDate: '2024-12-15'
    },
    {
      goal: 'Science Project Completion',
      progress: 90,
      target: 100,
      status: 'ahead',
      dueDate: '2024-11-30'
    }
  ];

  const predictiveInsights = [
    {
      type: 'success',
      title: 'Strong Progress in Mathematics',
      description: 'Based on current trajectory, expected to achieve A grade by end of term',
      confidence: 92
    },
    {
      type: 'warning',
      title: 'Time Management Needs Attention',
      description: 'Late submissions detected. Consider additional time management support',
      confidence: 78
    },
    {
      type: 'info',
      title: 'Optimal Learning Time',
      description: 'Performance peaks between 3-5 PM. Consider scheduling complex topics during this window',
      confidence: 85
    }
  ];

  const exportReport = (format: string) => {
    console.log(`Exporting report as ${format}`);
    // Implement actual export logic
  };

  return (
    <div className="space-y-6">
      {/* Report Controls */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap items-center gap-4">
            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Select date range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="last-7-days">Last 7 Days</SelectItem>
                <SelectItem value="last-30-days">Last 30 Days</SelectItem>
                <SelectItem value="last-3-months">Last 3 Months</SelectItem>
                <SelectItem value="last-6-months">Last 6 Months</SelectItem>
                <SelectItem value="last-year">Last Year</SelectItem>
                <SelectItem value="custom">Custom Range</SelectItem>
              </SelectContent>
            </Select>

            {userType === 'parent' && (
              <Select value={selectedStudent} onValueChange={setSelectedStudent}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Select student" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Students</SelectItem>
                  <SelectItem value="student1">Emma Johnson</SelectItem>
                  <SelectItem value="student2">Oliver Smith</SelectItem>
                </SelectContent>
              </Select>
            )}

            <div className="flex-1" />

            <Button variant="outline" onClick={() => exportReport('pdf')}>
              <Download className="w-4 h-4 mr-2" />
              Export PDF
            </Button>
            <Button variant="outline" onClick={() => exportReport('csv')}>
              <Download className="w-4 h-4 mr-2" />
              Export CSV
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Key Metrics Summary */}
      <div className="grid md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-gray-600">Avg Performance</p>
              <TrendingUp className="w-4 h-4 text-green-600" />
            </div>
            <h2 className="mb-1">86%</h2>
            <p className="text-xs text-green-600">+5.2% vs last period</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-gray-600">Total Sessions</p>
              <CheckCircle className="w-4 h-4" style={{ color: '#625d9c' }} />
            </div>
            <h2 className="mb-1">30</h2>
            <p className="text-xs text-gray-600">45 hours total</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-gray-600">Goals On Track</p>
              <Target className="w-4 h-4" style={{ color: '#5d9827' }} />
            </div>
            <h2 className="mb-1">2 / 3</h2>
            <p className="text-xs text-gray-600">67% completion rate</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-gray-600">Attendance</p>
              <Award className="w-4 h-4 text-blue-600" />
            </div>
            <h2 className="mb-1">100%</h2>
            <p className="text-xs text-blue-600">Perfect attendance!</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs for Different Report Views */}
      <Tabs value={reportType} onValueChange={setReportType}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="goals">Goals & Progress</TabsTrigger>
          <TabsTrigger value="insights">Insights</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {/* Performance Trends */}
          <Card>
            <CardHeader>
              <CardTitle>Performance Trends</CardTitle>
              <CardDescription>Subject scores over time</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={performanceData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" tickFormatter={(date) => new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} />
                  <YAxis domain={[0, 100]} />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="math" stroke="#625d9c" strokeWidth={2} name="Mathematics" />
                  <Line type="monotone" dataKey="english" stroke="#5d9827" strokeWidth={2} name="English" />
                  <Line type="monotone" dataKey="science" stroke="#3b82f6" strokeWidth={2} name="Science" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Subject Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle>Subject Breakdown</CardTitle>
              <CardDescription>Detailed performance by subject</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {subjectBreakdown.map((subject, index) => (
                  <div key={index} className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-3">
                      <h4>{subject.subject}</h4>
                      <Badge style={{ backgroundColor: subject.improvement > 10 ? '#5d9827' : '#625d9c', color: 'white' }}>
                        +{subject.improvement}% improvement
                      </Badge>
                    </div>
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div>
                        <p className="text-sm text-gray-600 mb-1">Sessions</p>
                        <p className="text-xl">{subject.sessions}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600 mb-1">Hours</p>
                        <p className="text-xl">{subject.hours}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600 mb-1">Avg Score</p>
                        <p className="text-xl">{subject.avgScore}%</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Learning Patterns */}
          <Card>
            <CardHeader>
              <CardTitle>Learning Patterns</CardTitle>
              <CardDescription>Optimal study times throughout the week</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={learningPatterns}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="day" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="morning" fill="#625d9c" name="Morning (9-12)" />
                  <Bar dataKey="afternoon" fill="#5d9827" name="Afternoon (12-5)" />
                  <Bar dataKey="evening" fill="#3b82f6" name="Evening (5-8)" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Performance Tab */}
        <TabsContent value="performance" className="space-y-6">
          {/* Competency Map */}
          <Card>
            <CardHeader>
              <CardTitle>Skills Competency Map</CardTitle>
              <CardDescription>Current level vs target for key skills</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {competencyMap.map((skill, index) => (
                  <div key={index}>
                    <div className="flex justify-between mb-2">
                      <span>{skill.skill}</span>
                      <span className="text-sm text-gray-600">{skill.current}% / {skill.target}%</span>
                    </div>
                    <div className="relative">
                      <div className="w-full h-8 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full flex items-center justify-end pr-2"
                          style={{
                            width: `${skill.current}%`,
                            backgroundColor: skill.current >= skill.target ? '#5d9827' : '#625d9c'
                          }}
                        >
                          <span className="text-xs text-white">{skill.current}%</span>
                        </div>
                      </div>
                      <div
                        className="absolute top-0 h-8 border-r-2 border-dashed border-gray-600"
                        style={{ left: `${skill.target}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Comparative Analysis */}
          <Card>
            <CardHeader>
              <CardTitle>Comparative Analysis</CardTitle>
              <CardDescription>Performance vs class average</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <ComposedChart data={subjectBreakdown}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="subject" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="avgScore" fill="#625d9c" name="Your Score" />
                  <Line type="monotone" dataKey="improvement" stroke="#5d9827" strokeWidth={2} name="Improvement %" />
                </ComposedChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Goals Tab */}
        <TabsContent value="goals" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Goal Tracking</CardTitle>
              <CardDescription>Monitor progress towards learning objectives</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {goalTracking.map((goal, index) => {
                  const getStatusIcon = () => {
                    if (goal.status === 'ahead') return <CheckCircle className="w-5 h-5 text-green-600" />;
                    if (goal.status === 'needs-attention') return <AlertCircle className="w-5 h-5 text-orange-600" />;
                    return <Target className="w-5 h-5 text-blue-600" />;
                  };

                  const getStatusColor = () => {
                    if (goal.status === 'ahead') return '#5d9827';
                    if (goal.status === 'needs-attention') return '#f59e0b';
                    return '#625d9c';
                  };

                  return (
                    <div key={index} className="p-4 border rounded-lg">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-start gap-3">
                          {getStatusIcon()}
                          <div>
                            <h4 className="mb-1">{goal.goal}</h4>
                            <p className="text-sm text-gray-600">Due: {new Date(goal.dueDate).toLocaleDateString()}</p>
                          </div>
                        </div>
                        <Badge style={{ backgroundColor: getStatusColor(), color: 'white' }}>
                          {goal.status.replace('-', ' ')}
                        </Badge>
                      </div>
                      <div className="relative">
                        <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${goal.progress}%`,
                              backgroundColor: getStatusColor()
                            }}
                          />
                        </div>
                        <p className="text-xs text-gray-600 mt-1">{goal.progress}% complete</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Insights Tab */}
        <TabsContent value="insights" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Predictive Insights</CardTitle>
              <CardDescription>Personalized recommendations and predictions</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {predictiveInsights.map((insight, index) => {
                  const getInsightColor = () => {
                    if (insight.type === 'success') return { bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-800' };
                    if (insight.type === 'warning') return { bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-800' };
                    return { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-800' };
                  };

                  const colors = getInsightColor();

                  return (
                    <div key={index} className={`p-4 border rounded-lg ${colors.bg} ${colors.border}`}>
                      <div className="flex items-start justify-between mb-2">
                        <h4 className={colors.text}>{insight.title}</h4>
                        <Badge variant="outline">{insight.confidence}% confidence</Badge>
                      </div>
                      <p className={`text-sm ${colors.text}`}>{insight.description}</p>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Action Recommendations */}
          <Card>
            <CardHeader>
              <CardTitle>Recommended Actions</CardTitle>
              <CardDescription>Next steps to optimize learning outcomes</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-start gap-3 p-3 border rounded-lg">
                  <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="mb-1">Schedule Additional Math Sessions</h4>
                    <p className="text-sm text-gray-600">Current momentum suggests 2 more sessions could achieve A grade target</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 border rounded-lg">
                  <AlertCircle className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="mb-1">Focus on Time Management</h4>
                    <p className="text-sm text-gray-600">Consider scheduling a time management skills session with tutor</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 border rounded-lg">
                  <Target className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="mb-1">Optimize Study Schedule</h4>
                    <p className="text-sm text-gray-600">Book complex topics during peak performance hours (3-5 PM)</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}