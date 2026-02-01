import React, { useState, useEffect } from 'react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { 
  BarChart3,
  Download,
  TrendingUp,
  TrendingDown,
  Calendar,
  Star,
  Users,
  Clock,
  Loader2,
  Award
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { projectId } from '../../utils/supabase/info';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface TutorUtilization {
  tutorId: string;
  tutorName: string;
  email: string;
  totalSessions: number;
  completedSessions: number;
  cancelledSessions: number;
  averageRating: number;
  totalHours: number;
  subjects: string[];
  studentCount: number;
  revenue: number;
  utilizationRate: number; // percentage
  lastSessionDate: string;
}

interface UtilizationStats {
  totalTutors: number;
  activeTutors: number;
  totalSessions: number;
  averageUtilization: number;
  topPerformers: TutorUtilization[];
  underutilized: TutorUtilization[];
}

interface TutorUtilizationReportsProps {
  organisationId: string;
  accessToken: string;
}

const COLORS = ['#625d9c', '#5d9827', '#3b82f6', '#f59e0b', '#ef4444'];

export function TutorUtilizationReports({ organisationId, accessToken }: TutorUtilizationReportsProps) {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<UtilizationStats | null>(null);
  const [tutors, setTutors] = useState<TutorUtilization[]>([]);
  const [dateRange, setDateRange] = useState<'week' | 'month' | 'quarter'>('month');
  const [sortBy, setSortBy] = useState<'sessions' | 'rating' | 'utilization'>('utilization');

  useEffect(() => {
    loadUtilizationData();
  }, [organisationId, dateRange]);

  const loadUtilizationData = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-cbd74580/organisations/${organisationId}/reports/tutor-utilization?range=${dateRange}`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`
          }
        }
      );

      if (response.ok) {
        const data = await response.json();
        setStats(data.stats);
        setTutors(data.tutors || []);
      }
    } catch (error) {
      console.error('Error loading utilization data:', error);
      toast.error('Failed to load utilization reports');
    } finally {
      setLoading(false);
    }
  };

  const exportReport = () => {
    if (!tutors.length) return;

    const csv = [
      ['Tutor Name', 'Email', 'Total Sessions', 'Completed', 'Cancelled', 'Rating', 'Hours', 'Students', 'Revenue', 'Utilization %', 'Subjects'].join(','),
      ...tutors.map(t => 
        [
          t.tutorName, 
          t.email, 
          t.totalSessions, 
          t.completedSessions, 
          t.cancelledSessions,
          t.averageRating.toFixed(1),
          t.totalHours.toFixed(1),
          t.studentCount,
          `£${t.revenue.toFixed(2)}`,
          t.utilizationRate.toFixed(1),
          t.subjects.join(';')
        ].join(',')
      )
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tutor-utilization-${dateRange}-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    toast.success('Report exported');
  };

  const sortedTutors = [...tutors].sort((a, b) => {
    switch (sortBy) {
      case 'sessions':
        return b.completedSessions - a.completedSessions;
      case 'rating':
        return b.averageRating - a.averageRating;
      case 'utilization':
        return b.utilizationRate - a.utilizationRate;
      default:
        return 0;
    }
  });

  const getUtilizationColor = (rate: number) => {
    if (rate >= 80) return 'text-green-600';
    if (rate >= 60) return 'text-blue-600';
    if (rate >= 40) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getUtilizationBadge = (rate: number) => {
    if (rate >= 80) return { text: 'Excellent', class: 'bg-green-100 text-green-800' };
    if (rate >= 60) return { text: 'Good', class: 'bg-blue-100 text-blue-800' };
    if (rate >= 40) return { text: 'Fair', class: 'bg-yellow-100 text-yellow-800' };
    return { text: 'Low', class: 'bg-red-100 text-red-800' };
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
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-2xl">Tutor Utilization & Performance</h3>
          <p className="text-gray-600 mt-1">
            Track tutor engagement and identify optimization opportunities
          </p>
        </div>
        <div className="flex gap-2">
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value as any)}
            className="p-2 border rounded-lg"
          >
            <option value="week">Last Week</option>
            <option value="month">Last Month</option>
            <option value="quarter">Last Quarter</option>
          </select>
          <Button variant="outline" onClick={exportReport}>
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Key Stats */}
      {stats && (
        <>
          <div className="grid md:grid-cols-4 gap-4">
            <Card className="p-4">
              <div className="flex items-center justify-between mb-2">
                <Users className="w-5 h-5 text-[#625d9c]" />
                <Badge variant="outline">Total</Badge>
              </div>
              <div className="text-2xl font-bold">{stats.totalTutors}</div>
              <div className="text-sm text-gray-600">Approved Tutors</div>
            </Card>

            <Card className="p-4">
              <div className="flex items-center justify-between mb-2">
                <TrendingUp className="w-5 h-5 text-green-600" />
                <Badge className="bg-green-100 text-green-800">Active</Badge>
              </div>
              <div className="text-2xl font-bold text-green-600">{stats.activeTutors}</div>
              <div className="text-sm text-gray-600">With Sessions</div>
            </Card>

            <Card className="p-4">
              <div className="flex items-center justify-between mb-2">
                <Calendar className="w-5 h-5 text-blue-600" />
                <Badge variant="outline">{dateRange}</Badge>
              </div>
              <div className="text-2xl font-bold">{stats.totalSessions}</div>
              <div className="text-sm text-gray-600">Total Sessions</div>
            </Card>

            <Card className="p-4">
              <div className="flex items-center justify-between mb-2">
                <BarChart3 className="w-5 h-5 text-purple-600" />
                <Badge 
                  className={stats.averageUtilization >= 60 ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}
                >
                  {stats.averageUtilization.toFixed(0)}%
                </Badge>
              </div>
              <div className="text-2xl font-bold">{stats.averageUtilization.toFixed(1)}%</div>
              <div className="text-sm text-gray-600">Avg Utilization</div>
            </Card>
          </div>

          {/* Top Performers */}
          {stats.topPerformers.length > 0 && (
            <Card className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <Award className="w-5 h-5 text-yellow-600" />
                <h4 className="text-xl">Top Performers</h4>
              </div>
              <div className="grid md:grid-cols-3 gap-4">
                {stats.topPerformers.map((tutor, idx) => (
                  <Card key={tutor.tutorId} className="p-4 bg-gradient-to-br from-yellow-50 to-amber-50">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="font-medium">{tutor.tutorName}</p>
                        <div className="flex items-center gap-1 mt-1">
                          <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                          <span className="text-sm">{tutor.averageRating.toFixed(1)}</span>
                        </div>
                      </div>
                      <Badge className="bg-yellow-100 text-yellow-800">
                        #{idx + 1}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm mt-3">
                      <div>
                        <span className="text-gray-600">Sessions:</span>
                        <p className="font-medium">{tutor.completedSessions}</p>
                      </div>
                      <div>
                        <span className="text-gray-600">Students:</span>
                        <p className="font-medium">{tutor.studentCount}</p>
                      </div>
                      <div className="col-span-2">
                        <span className="text-gray-600">Utilization:</span>
                        <p className="font-medium text-green-600">{tutor.utilizationRate.toFixed(0)}%</p>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </Card>
          )}

          {/* Underutilized Alert */}
          {stats.underutilized.length > 0 && (
            <Card className="p-4 bg-yellow-50 border-yellow-200">
              <div className="flex items-start gap-2">
                <TrendingDown className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="font-medium text-yellow-900">
                    {stats.underutilized.length} Underutilized Tutor{stats.underutilized.length !== 1 ? 's' : ''}
                  </p>
                  <p className="text-sm text-yellow-800 mt-1">
                    These tutors have low utilization rates. Consider marketing them to students
                    or reviewing their availability and subjects.
                  </p>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {stats.underutilized.map((tutor) => (
                      <Badge key={tutor.tutorId} variant="outline" className="text-yellow-700">
                        {tutor.tutorName} ({tutor.utilizationRate.toFixed(0)}%)
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            </Card>
          )}
        </>
      )}

      {/* Utilization Chart */}
      {tutors.length > 0 && (
        <Card className="p-6">
          <h4 className="text-xl mb-4">Utilization Distribution</h4>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={tutors.slice(0, 10)}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="tutorName" 
                tick={{ fontSize: 12 }}
                angle={-45}
                textAnchor="end"
                height={100}
              />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="utilizationRate" fill="#625d9c" name="Utilization %" />
              <Bar dataKey="completedSessions" fill="#5d9827" name="Sessions" />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      )}

      {/* Detailed List */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-xl">All Tutors ({tutors.length})</h4>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="p-2 border rounded-lg text-sm"
          >
            <option value="utilization">Sort by Utilization</option>
            <option value="sessions">Sort by Sessions</option>
            <option value="rating">Sort by Rating</option>
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr className="text-left text-sm">
                <th className="p-3">Tutor</th>
                <th className="p-3 text-center">Sessions</th>
                <th className="p-3 text-center">Hours</th>
                <th className="p-3 text-center">Students</th>
                <th className="p-3 text-center">Rating</th>
                <th className="p-3 text-center">Utilization</th>
                <th className="p-3 text-right">Revenue</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {sortedTutors.map((tutor) => {
                const badge = getUtilizationBadge(tutor.utilizationRate);
                return (
                  <tr key={tutor.tutorId} className="hover:bg-gray-50">
                    <td className="p-3">
                      <div>
                        <p className="font-medium">{tutor.tutorName}</p>
                        <p className="text-sm text-gray-600">{tutor.email}</p>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {tutor.subjects.slice(0, 2).map((subject, idx) => (
                            <Badge key={idx} variant="outline" className="text-xs">
                              {subject}
                            </Badge>
                          ))}
                          {tutor.subjects.length > 2 && (
                            <Badge variant="outline" className="text-xs">
                              +{tutor.subjects.length - 2}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="p-3 text-center">
                      <div>
                        <p className="font-medium">{tutor.completedSessions}</p>
                        <p className="text-xs text-gray-600">
                          {tutor.cancelledSessions} cancelled
                        </p>
                      </div>
                    </td>
                    <td className="p-3 text-center font-medium">
                      {tutor.totalHours.toFixed(1)}
                    </td>
                    <td className="p-3 text-center font-medium">
                      {tutor.studentCount}
                    </td>
                    <td className="p-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                        <span className="font-medium">{tutor.averageRating.toFixed(1)}</span>
                      </div>
                    </td>
                    <td className="p-3 text-center">
                      <div className="flex flex-col items-center gap-1">
                        <span className={`font-medium ${getUtilizationColor(tutor.utilizationRate)}`}>
                          {tutor.utilizationRate.toFixed(1)}%
                        </span>
                        <Badge className={badge.class} style={{ fontSize: '10px' }}>
                          {badge.text}
                        </Badge>
                      </div>
                    </td>
                    <td className="p-3 text-right font-medium">
                      £{tutor.revenue.toFixed(2)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Insights */}
      <Card className="p-6 bg-blue-50 border-blue-200">
        <h4 className="font-medium text-blue-900 mb-2">Insights & Recommendations</h4>
        <ul className="text-sm text-blue-900 space-y-2">
          <li>• <strong>Optimal Utilization:</strong> 60-80% is considered healthy for tutor satisfaction and availability</li>
          <li>• <strong>Underutilized Tutors:</strong> Review availability, marketing, and subject offerings</li>
          <li>• <strong>Over-utilized Tutors:</strong> Consider adding similar tutors to prevent burnout</li>
          <li>• <strong>Student Distribution:</strong> Balance workload across tutors for better outcomes</li>
        </ul>
      </Card>
    </div>
  );
}
