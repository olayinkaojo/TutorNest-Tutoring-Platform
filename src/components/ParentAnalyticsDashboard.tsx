import React, { useState, useEffect } from 'react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Alert, AlertDescription } from './ui/alert';
import { TrendingUp, TrendingDown, Calendar, Download, MoreVertical, Info } from 'lucide-react';
import { formatNaira } from '../utils/currency';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { toast } from 'sonner';

interface SpendingData {
  month: string;
  spent: number;
  sessions: number;
  avgPerSession: number;
}

interface SubjectAnalytics {
  subject: string;
  spent: number;
  sessions: number;
  percentage: number;
  color: string;
}

interface TutorSpending {
  tutorName: string;
  spent: number;
  sessions: number;
  rating: number;
}

export function ParentAnalyticsDashboard({ accessToken }: { accessToken: string }) {
  const [spendingData, setSpendingData] = useState<SpendingData[]>([]);
  const [subjectAnalytics, setSubjectAnalytics] = useState<SubjectAnalytics[]>([]);
  const [tutorSpending, setTutorSpending] = useState<TutorSpending[]>([]);
  const [timeframe, setTimeframe] = useState<'3m' | '6m' | '1y' | 'all'>('6m');
  const [loading, setLoading] = useState(true);

  const COLORS = ['#625d9c', '#5d9827', '#ec4899', '#f59e0b', '#10b981', '#06b6d4', '#8b5cf6', '#f97316'];

  useEffect(() => {
    loadAnalytics();
  }, [timeframe, accessToken]);

  const loadAnalytics = async () => {
    setLoading(true);
    try {
      // For now, mock data. In production, call your analytics endpoint
      // GET /analytics/parent/{parentId}?timeframe={timeframe}
      
      // Mock spending trend data
      const mockSpendingData: SpendingData[] = [
        { month: 'Oct', spent: 260000, sessions: 5, avgPerSession: 52000 },
        { month: 'Nov', spent: 520000, sessions: 10, avgPerSession: 52000 },
        { month: 'Dec', spent: 390000, sessions: 7, avgPerSession: 55714 },
        { month: 'Jan', spent: 580000, sessions: 11, avgPerSession: 52727 },
        { month: 'Feb', spent: 450000, sessions: 8, avgPerSession: 56250 },
        { month: 'Mar', spent: 620000, sessions: 12, avgPerSession: 51667 },
      ];

      const mockSubjectAnalytics: SubjectAnalytics[] = [
        { subject: 'Mathematics', spent: 850000, sessions: 16, percentage: 35, color: '#625d9c' },
        { subject: 'English', spent: 650000, sessions: 12, percentage: 27, color: '#5d9827' },
        { subject: 'Science', spent: 520000, sessions: 10, percentage: 21, color: '#ec4899' },
        { subject: 'Mandarin', spent: 320000, sessions: 6, percentage: 13, color: '#f59e0b' },
        { subject: 'Others', spent: 90000, sessions: 1, percentage: 4, color: '#06b6d4' },
      ];

      const mockTutorSpending: TutorSpending[] = [
        { tutorName: 'Sarah Johnson', spent: 650000, sessions: 12, rating: 4.9 },
        { tutorName: 'Chioma Adeyemi', spent: 580000, sessions: 11, rating: 4.8 },
        { tutorName: 'James Chen', spent: 520000, sessions: 10, rating: 4.7 },
        { tutorName: 'Aisha Muhammad', spent: 390000, sessions: 7, rating: 4.6 },
      ];

      setSpendingData(mockSpendingData);
      setSubjectAnalytics(mockSubjectAnalytics);
      setTutorSpending(mockTutorSpending);
    } catch (error) {
      console.error('Error loading analytics:', error);
      toast.error('Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  };

  const totalSpent = spendingData.reduce((sum, d) => sum + d.spent, 0);
  const totalSessions = spendingData.reduce((sum, d) => sum + d.sessions, 0);
  const avgPerSession = totalSessions > 0 ? totalSpent / totalSessions : 0;

  const downloadReport = async () => {
    try {
      // Generate CSV
      const headers = ['Month', 'Spent (₦)', 'Sessions', 'Avg/Session'];
      const rows = spendingData.map(d => [
        d.month,
        d.spent.toLocaleString(),
        d.sessions,
        d.avgPerSession.toLocaleString()
      ]);

      let csv = headers.join(',') + '\n';
      rows.forEach(row => csv += row.join(',') + '\n');

      // Add summary
      csv += '\n\nSummary\n';
      csv += `Total Spent,${totalSpent.toLocaleString()}\n`;
      csv += `Total Sessions,${totalSessions}\n`;
      csv += `Average per Session,${avgPerSession.toLocaleString()}\n`;

      // Download
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `parent-analytics-${new Date().toISOString().split('T')[0]}.csv`;
      link.click();

      toast.success('Report downloaded successfully');
    } catch (error) {
      console.error('Error downloading report:', error);
      toast.error('Failed to download report');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Analytics & Insights</h2>
          <p className="text-gray-600 text-sm mt-1">Comprehensive spending and learning analytics</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={timeframe} onValueChange={(value: any) => setTimeframe(value)}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="3m">Last 3 months</SelectItem>
              <SelectItem value="6m">Last 6 months</SelectItem>
              <SelectItem value="1y">Last year</SelectItem>
              <SelectItem value="all">All time</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={downloadReport} variant="outline" size="sm">
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Spent</p>
                <p className="text-2xl font-bold mt-1">{formatNaira(totalSpent)}</p>
                <p className="text-xs text-gray-500 mt-2">Average: {formatNaira(avgPerSession)}/session</p>
              </div>
              <TrendingUp className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Sessions</p>
                <p className="text-2xl font-bold mt-1">{totalSessions}</p>
                <p className="text-xs text-gray-500 mt-2">Across {subjectAnalytics.length} subjects</p>
              </div>
              <Calendar className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-gray-600">Monthly Average</p>
                <p className="text-2xl font-bold mt-1">{formatNaira(totalSpent / spendingData.length)}</p>
                <p className="text-xs text-gray-500 mt-2">Trending stable</p>
              </div>
              <Badge className="bg-green-100 text-green-800 border-green-300">
                <TrendingDown className="w-3 h-3 mr-1" />
                Normal
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Spending Trend */}
      <Card>
        <CardHeader>
          <CardTitle>Spending Trend</CardTitle>
          <CardDescription>Monthly spending pattern over time</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={spendingData} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip formatter={(value) => formatNaira(value as number)} />
              <Legend />
              <Line
                type="monotone"
                dataKey="spent"
                stroke="#625d9c"
                strokeWidth={2}
                name="Amount Spent"
                dot={{ fill: '#625d9c' }}
              />
              <Line
                type="monotone"
                dataKey="avgPerSession"
                stroke="#5d9827"
                strokeWidth={2}
                name="Avg per Session"
                dot={{ fill: '#5d9827' }}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Subject Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Spending by Subject</CardTitle>
            <CardDescription>Distribution of investment across subjects</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={subjectAnalytics}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ subject, percentage }) => `${subject} (${percentage}%)`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="spent"
                >
                  {subjectAnalytics.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => formatNaira(value as number)} />
              </PieChart>
            </ResponsiveContainer>

            {/* Subject List */}
            <div className="mt-6 space-y-3">
              {subjectAnalytics.map((subject) => (
                <div key={subject.subject} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: subject.color }}
                    />
                    <span className="text-sm">{subject.subject}</span>
                  </div>
                  <div className="text-sm font-medium">{formatNaira(subject.spent)}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Top Tutors */}
        <Card>
          <CardHeader>
            <CardTitle>Top Tutors by Engagement</CardTitle>
            <CardDescription>Based on spending and ratings</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {tutorSpending.map((tutor, index) => (
                <div key={tutor.tutorName} className="border-b pb-4 last:border-b-0">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="font-medium">{tutor.tutorName}</p>
                      <p className="text-xs text-gray-500">{tutor.sessions} sessions</p>
                    </div>
                    <Badge variant="outline">{tutor.rating} ⭐</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="w-full mr-3 bg-gray-100 rounded-full h-2">
                      <div
                        className="h-2 rounded-full"
                        style={{
                          width: `${(tutor.spent / Math.max(...tutorSpending.map(t => t.spent))) * 100}%`,
                          backgroundColor: COLORS[index % COLORS.length],
                        }}
                      />
                    </div>
                    <p className="text-sm font-medium text-right whitespace-nowrap">
                      {formatNaira(tutor.spent)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Insights & Recommendations */}
      <Card className="border-blue-200 bg-blue-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="w-5 h-5 text-blue-600" />
            Insights & Recommendations
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Alert className="bg-white border-blue-200">
            <AlertDescription>
              📊 <strong>Spending Trend:</strong> Your spending is stable at ~₦{(totalSpent / spendingData.length).toLocaleString()}/month, 
              with an average of {avgPerSession.toLocaleString()} per session.
            </AlertDescription>
          </Alert>
          <Alert className="bg-white border-blue-200">
            <AlertDescription>
              🎯 <strong>Top Subject:</strong> Mathematics has received {subjectAnalytics[0]?.percentage || 0}% of your investment. 
              Consider this focus area for your child's academic strength.
            </AlertDescription>
          </Alert>
          <Alert className="bg-white border-blue-200">
            <AlertDescription>
              ⭐ <strong>Quality Metrics:</strong> Your top tutors average {(tutorSpending.reduce((s, t) => s + t.rating, 0) / tutorSpending.length).toFixed(1)} rating. 
              Excellent engagement quality!
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  );
}
