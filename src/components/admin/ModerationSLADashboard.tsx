import React, { useState, useEffect } from 'react';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { 
  Clock,
  CheckCircle2,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Loader2,
  Download,
  BarChart3
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { projectId } from '../../utils/supabase/info';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface SLAMetrics {
  averageReviewTime: string;
  slaComplianceRate: string;
  totalReviewed: number;
  withinSLA: number;
  breachedSLA: number;
}

interface Trends {
  daily: Array<{
    date: string;
    totalFlags: number;
    pending: number;
    reviewed: number;
    removed: number;
    falsePositives: number;
  }>;
  byCategory: Record<string, { count: number; hits: number }>;
  total30Days: number;
}

interface ModerationSLADashboardProps {
  accessToken: string;
}

export function ModerationSLADashboard({ accessToken }: ModerationSLADashboardProps) {
  const [sla, setSLA] = useState<SLAMetrics | null>(null);
  const [trends, setTrends] = useState<Trends | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSLAMetrics();
    loadTrends();
  }, []);

  const loadSLAMetrics = async () => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-cbd74580/admin/moderation/sla`,
        {
          headers: { 'Authorization': `Bearer ${accessToken}` }
        }
      );

      if (response.ok) {
        const data = await response.json();
        setSLA(data.sla);
      }
    } catch (error) {
      console.error('Error loading SLA metrics:', error);
      toast.error('Failed to load SLA metrics');
    }
  };

  const loadTrends = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-cbd74580/admin/moderation/trends`,
        {
          headers: { 'Authorization': `Bearer ${accessToken}` }
        }
      );

      if (response.ok) {
        const data = await response.json();
        setTrends(data.trends);
      }
    } catch (error) {
      console.error('Error loading trends:', error);
      toast.error('Failed to load trends');
    } finally {
      setLoading(false);
    }
  };

  const exportReport = () => {
    if (!sla || !trends) return;

    const report = {
      sla,
      trends,
      generatedAt: new Date().toISOString()
    };

    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `moderation-report-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    window.URL.revokeObjectURL(url);
    toast.success('Report exported');
  };

  if (loading) {
    return (
      <div className=\"flex justify-center py-8\">
        <Loader2 className=\"w-8 h-8 animate-spin text-[#625d9c]\" />
      </div>
    );
  }

  return (
    <div className=\"space-y-6\">
      <div className=\"flex items-center justify-between\">
        <div>
          <h3 className=\"text-2xl\">SLA & Performance</h3>
          <p className=\"text-gray-600 mt-1\">
            Review times and compliance metrics
          </p>
        </div>
        <Button variant=\"outline\" onClick={exportReport}>
          <Download className=\"w-4 h-4 mr-2\" />
          Export Report
        </Button>
      </div>

      {/* SLA Metrics */}
      {sla && (
        <div className=\"grid md:grid-cols-5 gap-4\">
          <Card className=\"p-4\">
            <div className=\"flex items-center justify-between mb-2\">
              <Clock className=\"w-5 h-5 text-[#625d9c]\" />
              <Badge variant=\"outline\">Average</Badge>
            </div>
            <div className=\"text-2xl font-bold\">{sla.averageReviewTime}h</div>
            <div className=\"text-sm text-gray-600\">Review Time</div>
          </Card>

          <Card className=\"p-4\">
            <div className=\"flex items-center justify-between mb-2\">
              <CheckCircle2 className=\"w-5 h-5 text-green-600\" />
              <Badge className=\"bg-green-100 text-green-800\">
                {sla.slaComplianceRate}%
              </Badge>
            </div>
            <div className=\"text-2xl font-bold\">{sla.withinSLA}</div>
            <div className=\"text-sm text-gray-600\">Within SLA</div>
          </Card>

          <Card className=\"p-4\">
            <div className=\"flex items-center justify-between mb-2\">
              <AlertTriangle className=\"w-5 h-5 text-red-600\" />
              <Badge className=\"bg-red-100 text-red-800\">Breached</Badge>
            </div>
            <div className=\"text-2xl font-bold text-red-600\">{sla.breachedSLA}</div>
            <div className=\"text-sm text-gray-600\">SLA Breaches</div>
          </Card>

          <Card className=\"p-4\">
            <div className=\"flex items-center justify-between mb-2\">
              <BarChart3 className=\"w-5 h-5 text-blue-600\" />
              <Badge variant=\"outline\">Total</Badge>
            </div>
            <div className=\"text-2xl font-bold\">{sla.totalReviewed}</div>
            <div className=\"text-sm text-gray-600\">Reviewed</div>
          </Card>

          <Card className=\"p-4\">
            <div className=\"flex items-center justify-between mb-2\">
              {parseFloat(sla.slaComplianceRate) >= 90 ? (
                <TrendingUp className=\"w-5 h-5 text-green-600\" />
              ) : (
                <TrendingDown className=\"w-5 h-5 text-red-600\" />
              )}
              <Badge 
                className={
                  parseFloat(sla.slaComplianceRate) >= 90 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-yellow-100 text-yellow-800'
                }
              >
                {parseFloat(sla.slaComplianceRate) >= 90 ? 'Good' : 'Needs Improvement'}
              </Badge>
            </div>
            <div className=\"text-2xl font-bold\">24h</div>
            <div className=\"text-sm text-gray-600\">SLA Target</div>
          </Card>
        </div>
      )}

      {/* Trend Charts */}
      {trends && (
        <>
          {/* Daily Flags Trend */}
          <Card className=\"p-6\">
            <h4 className=\"text-xl mb-4\">30-Day Moderation Trend</h4>
            <ResponsiveContainer width=\"100%\" height={300}>
              <LineChart data={trends.daily}>
                <CartesianGrid strokeDasharray=\"3 3\" />
                <XAxis 
                  dataKey=\"date\" 
                  tick={{ fontSize: 12 }}
                  tickFormatter={(value) => new Date(value).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit' })}
                />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type=\"monotone\" dataKey=\"totalFlags\" stroke=\"#625d9c\" name=\"Total Flags\" />
                <Line type=\"monotone\" dataKey=\"pending\" stroke=\"#f59e0b\" name=\"Pending\" />
                <Line type=\"monotone\" dataKey=\"reviewed\" stroke=\"#10b981\" name=\"Reviewed\" />
                <Line type=\"monotone\" dataKey=\"removed\" stroke=\"#ef4444\" name=\"Removed\" />
              </LineChart>
            </ResponsiveContainer>
            <div className=\"mt-4 text-sm text-gray-600 text-center\">
              Total flags in last 30 days: <strong>{trends.total30Days}</strong>
            </div>
          </Card>

          {/* Category Breakdown */}
          <Card className=\"p-6\">
            <h4 className=\"text-xl mb-4\">Keywords by Category</h4>
            <ResponsiveContainer width=\"100%\" height={300}>
              <BarChart data={Object.entries(trends.byCategory).map(([category, data]) => ({
                category: category.replace('-', ' ').toUpperCase(),
                keywords: data.count,
                hits: data.hits
              }))}>
                <CartesianGrid strokeDasharray=\"3 3\" />
                <XAxis dataKey=\"category\" tick={{ fontSize: 12 }} />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey=\"keywords\" fill=\"#625d9c\" name=\"Keywords\" />
                <Bar dataKey=\"hits\" fill=\"#5d9827\" name=\"Hits\" />
              </BarChart>
            </ResponsiveContainer>
          </Card>

          {/* Performance Summary */}
          <Card className=\"p-6 bg-blue-50 border-blue-200\">
            <h4 className=\"text-xl mb-4 text-blue-900\">Performance Summary</h4>
            <div className=\"grid md:grid-cols-3 gap-4 text-sm text-blue-900\">
              <div>
                <p className=\"font-medium mb-2\">SLA Compliance:</p>
                <ul className=\"space-y-1 text-blue-800\">
                  <li>• Target: Review within 24 hours</li>
                  <li>• Current: {sla && sla.averageReviewTime}h average</li>
                  <li>• Compliance: {sla && sla.slaComplianceRate}%</li>
                </ul>
              </div>
              <div>
                <p className=\"font-medium mb-2\">Volume Trends:</p>
                <ul className=\"space-y-1 text-blue-800\">
                  <li>• 30-day total: {trends.total30Days} flags</li>
                  <li>• Daily average: {(trends.total30Days / 30).toFixed(1)} flags</li>
                  <li>• Reviewed: {sla && sla.totalReviewed}</li>
                </ul>
              </div>
              <div>
                <p className=\"font-medium mb-2\">Action Items:</p>
                <ul className=\"space-y-1 text-blue-800\">
                  <li>• {sla && sla.breachedSLA > 0 ? `Review ${sla.breachedSLA} SLA breaches` : '✓ No SLA breaches'}</li>
                  <li>• {trends.daily[trends.daily.length - 1]?.pending || 0} pending reviews</li>
                  <li>• Monitor false positive rate</li>
                </ul>
              </div>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
