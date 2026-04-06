import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';

export interface ClassAnalyticsDashboardProps {
  classId?: string;
  className?: string;
  analytics?: {
    totalStudents: number;
    averageMastery: number;
    completionRate: number;
    engagementScore: number;
  };
  strugglingStudents?: any[];
  recentActivity?: any[];
}

export default function ClassAnalyticsDashboard({
  classId,
  className = 'Class',
  analytics = {
    totalStudents: 24,
    averageMastery: 78.5,
    completionRate: 85,
    engagementScore: 82,
  },
  strugglingStudents = [],
  recentActivity = [],
}: ClassAnalyticsDashboardProps) {
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('30d');

  const getMasteryColor = (score: number) => {
    if (score >= 85) return 'text-green-600';
    if (score >= 70) return 'text-blue-600';
    if (score >= 50) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getMasteryBgColor = (score: number) => {
    if (score >= 85) return 'bg-green-50';
    if (score >= 70) return 'bg-blue-50';
    if (score >= 50) return 'bg-yellow-50';
    return 'bg-red-50';
  };

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{className} Analytics</h1>
          <p className="text-gray-600">Real-time class performance and engagement metrics</p>
        </div>
        <select
          value={timeRange}
          onChange={(e) => setTimeRange(e.target.value as any)}
          className="px-4 py-2 border border-gray-300 rounded-lg"
        >
          <option value="7d">Last 7 days</option>
          <option value="30d">Last 30 days</option>
          <option value="90d">Last 90 days</option>
        </select>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Total Students */}
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-sm text-gray-600 mb-2">Total Students</p>
              <p className="text-4xl font-bold text-blue-600">{analytics.totalStudents}</p>
              <p className="text-xs text-gray-500 mt-2">👥 Members</p>
            </div>
          </CardContent>
        </Card>

        {/* Average Mastery */}
        <Card className={getMasteryBgColor(analytics.averageMastery)}>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-sm text-gray-600 mb-2">Average Mastery</p>
              <p className={`text-4xl font-bold ${getMasteryColor(analytics.averageMastery)}`}>
                {analytics.averageMastery.toFixed(1)}%
              </p>
              <p className="text-xs text-gray-500 mt-2">🎯 Class Level</p>
            </div>
          </CardContent>
        </Card>

        {/* Completion Rate */}
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-sm text-gray-600 mb-2">Completion Rate</p>
              <p className="text-4xl font-bold text-green-600">{analytics.completionRate.toFixed(0)}%</p>
              <p className="text-xs text-gray-500 mt-2">✓ On Track</p>
            </div>
          </CardContent>
        </Card>

        {/* Engagement Score */}
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-sm text-gray-600 mb-2">Engagement</p>
              <p className="text-4xl font-bold text-purple-600">{analytics.engagementScore.toFixed(0)}/100</p>
              <p className="text-xs text-gray-500 mt-2">⚡ Score</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Class Performance Chart */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Performance Over Time</CardTitle>
              <CardDescription>Class average scores by assignment</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-64 bg-gradient-to-b from-blue-50 to-transparent rounded-lg flex items-end justify-around px-4 py-8">
                {/* Mock chart bars */}
                {[65, 72, 68, 75, 78, 81, 79, 83].map((value, i) => (
                  <div key={i} className="flex flex-col items-center gap-1">
                    <div
                      className="w-6 rounded-t bg-blue-500 transition-all hover:bg-blue-600"
                      style={{ height: `${(value / 100) * 150}px` }}
                    />
                    <span className="text-xs text-gray-600">{value}%</span>
                  </div>
                ))}
              </div>
              <p className="text-xs text-gray-500 mt-4 text-center">Weekly average trend</p>
            </CardContent>
          </Card>
        </div>

        {/* Quick Stats */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Class Health</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Passing Grade</span>
                <span className="font-bold text-green-600">18/24</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Needs Help</span>
                <span className="font-bold text-red-600">6/24</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">At Risk</span>
                <span className="font-bold text-yellow-600">2/24</span>
              </div>
              <div className="border-t pt-3 mt-3">
                <div className="text-xs text-gray-500 mb-2">Overall Health</div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-green-500 h-2 rounded-full" style={{ width: '75%' }} />
                </div>
                <p className="text-xs text-gray-600 mt-1">Good: 75%</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Struggling Students & Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Struggling Students */}
        <Card>
          <CardHeader>
            <CardTitle>Students Needing Support</CardTitle>
            <CardDescription>Students below 70% average</CardDescription>
          </CardHeader>
          <CardContent>
            {strugglingStudents.length > 0 ? (
              <div className="space-y-3">
                {strugglingStudents.slice(0, 5).map((student, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900">{student.studentName}</p>
                      <p className="text-xs text-gray-500">{student.learningVelocity > 0 ? '📈 Improving' : '📉 Declining'}</p>
                    </div>
                    <div className="text-right">
                      <p className={`font-bold ${student.averageScore >= 60 ? 'text-yellow-600' : 'text-red-600'}`}>
                        {student.averageScore.toFixed(1)}%
                      </p>
                      <button className="text-xs text-blue-600 hover:underline mt-1">View</button>
                    </div>
                  </div>
                ))}
                {strugglingStudents.length === 0 && (
                  <p className="text-center text-gray-500 py-8">✓ All students on track!</p>
                )}
              </div>
            ) : (
              <p className="text-center text-gray-500 py-8">✓ All students on track!</p>
            )}
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Last 10 class events</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {recentActivity.length > 0 ? (
                recentActivity.map((activity, idx) => (
                  <div key={idx} className="flex gap-3 pb-3 border-b last:border-0">
                    <div className="flex-shrink-0 w-2 h-2 rounded-full bg-blue-500 mt-2" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-900">
                        <span className="font-semibold">{activity.studentName}</span> {activity.action}
                      </p>
                      <p className="text-xs text-gray-500">{activity.details}</p>
                      <p className="text-xs text-gray-400 mt-1">
                        {new Date(activity.timestamp).toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-center text-gray-500 py-8">No recent activity</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Grade Distribution */}
      <Card>
        <CardHeader>
          <CardTitle>Grade Distribution</CardTitle>
          <CardDescription>Class grade breakdown across all assignments</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-5 gap-4">
            {[
              { grade: 'A', range: '90-100', count: 8, color: 'bg-green-500' },
              { grade: 'B', range: '80-89', count: 10, color: 'bg-blue-500' },
              { grade: 'C', range: '70-79', count: 4, color: 'bg-yellow-500' },
              { grade: 'D', range: '60-69', count: 2, color: 'bg-orange-500' },
              { grade: 'F', range: '<60', count: 0, color: 'bg-red-500' },
            ].map((item) => (
              <div key={item.grade} className="text-center">
                <div className={`${item.color} text-white font-bold text-2xl rounded-lg p-4 mb-2`}>
                  {item.count}
                </div>
                <p className="font-semibold text-gray-900">{item.grade}</p>
                <p className="text-xs text-gray-500">{item.range}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
