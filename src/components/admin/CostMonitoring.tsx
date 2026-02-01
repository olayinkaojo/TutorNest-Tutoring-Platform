import React, { useState, useEffect } from 'react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Badge } from '../ui/badge';
import { 
  DollarSign,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle2,
  Database,
  Server,
  Zap,
  Users,
  Activity,
  Bell,
  Loader2,
  RefreshCw,
  Download
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { projectId, publicAnonKey } from '../../utils/supabase/info';

interface CostMetrics {
  currentMonthSpend: number;
  projectedMonthSpend: number;
  budget: number;
  budgetUtilization: number;
  dailyRunRate: number;
  costTrend: 'increasing' | 'decreasing' | 'stable';
  alerts: CostAlert[];
}

interface CostBreakdown {
  category: string;
  amount: number;
  percentage: number;
  trend: number; // percentage change
  subCategories?: {
    name: string;
    amount: number;
  }[];
}

interface UnitEconomics {
  metric: string;
  value: number;
  unit: string;
  target?: number;
  status: 'good' | 'warning' | 'poor';
}

interface CostAlert {
  id: string;
  severity: 'critical' | 'warning' | 'info';
  message: string;
  threshold: number;
  current: number;
  timestamp: string;
  acknowledged: boolean;
}

interface BudgetForecast {
  month: string;
  projected: number;
  budget: number;
  confidence: number; // percentage
}

interface CostOptimization {
  category: string;
  currentCost: number;
  potentialSavings: number;
  recommendation: string;
  effort: 'low' | 'medium' | 'high';
  impact: 'low' | 'medium' | 'high';
}

interface CostMonitoringProps {
  financeId: string;
  accessToken: string;
}

const COST_CATEGORIES = [
  { id: 'infrastructure', name: 'Infrastructure', icon: Server },
  { id: 'database', name: 'Database', icon: Database },
  { id: 'bandwidth', name: 'Bandwidth', icon: Zap },
  { id: 'storage', name: 'Storage', icon: Database },
  { id: 'compute', name: 'Compute', icon: Activity },
  { id: 'third-party', name: 'Third-Party APIs', icon: Zap }
];

export function CostMonitoring({ financeId, accessToken }: CostMonitoringProps) {
  const [metrics, setMetrics] = useState<CostMetrics | null>(null);
  const [breakdown, setBreakdown] = useState<CostBreakdown[]>([]);
  const [unitEconomics, setUnitEconomics] = useState<UnitEconomics[]>([]);
  const [forecast, setForecast] = useState<BudgetForecast[]>([]);
  const [optimizations, setOptimizations] = useState<CostOptimization[]>([]);
  const [loading, setLoading] = useState(true);
  const [budgetLimit, setBudgetLimit] = useState<number>(10000);
  const [alertThreshold, setAlertThreshold] = useState<number>(80);

  useEffect(() => {
    loadCostData();
  }, []);

  const loadCostData = async () => {
    setLoading(true);
    try {
      const [metricsRes, breakdownRes, economicsRes, forecastRes, optimizationsRes] = await Promise.all([
        fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-cbd74580/admin/costs/metrics`,
          { headers: { 'Authorization': `Bearer ${accessToken}` } }
        ),
        fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-cbd74580/admin/costs/breakdown`,
          { headers: { 'Authorization': `Bearer ${accessToken}` } }
        ),
        fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-cbd74580/admin/costs/unit-economics`,
          { headers: { 'Authorization': `Bearer ${accessToken}` } }
        ),
        fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-cbd74580/admin/costs/forecast`,
          { headers: { 'Authorization': `Bearer ${accessToken}` } }
        ),
        fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-cbd74580/admin/costs/optimizations`,
          { headers: { 'Authorization': `Bearer ${accessToken}` } }
        )
      ]);

      if (metricsRes.ok) {
        const data = await metricsRes.json();
        setMetrics(data.metrics);
        if (data.metrics.budget) setBudgetLimit(data.metrics.budget);
      }

      if (breakdownRes.ok) {
        const data = await breakdownRes.json();
        setBreakdown(data.breakdown || []);
      }

      if (economicsRes.ok) {
        const data = await economicsRes.json();
        setUnitEconomics(data.economics || []);
      }

      if (forecastRes.ok) {
        const data = await forecastRes.json();
        setForecast(data.forecast || []);
      }

      if (optimizationsRes.ok) {
        const data = await optimizationsRes.json();
        setOptimizations(data.optimizations || []);
      }
    } catch (error) {
      console.error('Error loading cost data:', error);
      toast.error('Failed to load cost data');
    } finally {
      setLoading(false);
    }
  };

  const updateBudget = async () => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-cbd74580/admin/costs/budget`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            budget: budgetLimit,
            alertThreshold,
            updatedBy: financeId
          })
        }
      );

      if (response.ok) {
        toast.success('Budget settings updated');
        loadCostData();
      } else {
        toast.error('Failed to update budget');
      }
    } catch (error) {
      console.error('Error updating budget:', error);
      toast.error('Failed to update budget');
    }
  };

  const acknowledgeAlert = async (alertId: string) => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-cbd74580/admin/costs/alerts/${alertId}/acknowledge`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ acknowledgedBy: financeId })
        }
      );

      if (response.ok) {
        toast.success('Alert acknowledged');
        loadCostData();
      }
    } catch (error) {
      console.error('Error acknowledging alert:', error);
    }
  };

  const exportCostReport = async () => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-cbd74580/admin/costs/export`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`
          }
        }
      );

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `cost-report-${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
        toast.success('Report exported');
      } else {
        toast.error('Failed to export report');
      }
    } catch (error) {
      console.error('Error exporting report:', error);
      toast.error('Failed to export report');
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-100 text-red-800';
      case 'warning':
        return 'bg-yellow-100 text-yellow-800';
      case 'info':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'good':
        return 'text-green-600';
      case 'warning':
        return 'text-yellow-600';
      case 'poor':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const totalPotentialSavings = optimizations.reduce((sum, opt) => sum + opt.potentialSavings, 0);

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
          <h2 className="text-3xl">Cost Monitoring</h2>
          <p className="text-gray-600 mt-1">
            Spend alerts and unit economics tracking
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportCostReport}>
            <Download className="w-4 h-4 mr-2" />
            Export Report
          </Button>
          <Button variant="outline" onClick={loadCostData}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Cost Overview */}
      {metrics && (
        <Card className="p-6 bg-gradient-to-r from-[#625d9c] to-[#5d9827] text-white">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-2xl mb-1">Monthly Spend</h3>
              <p className="opacity-90">Current and projected costs</p>
            </div>
            <DollarSign className="w-12 h-12 opacity-80" />
          </div>

          <div className="grid md:grid-cols-5 gap-6">
            <div>
              <div className="text-sm opacity-90 mb-1">Current Spend</div>
              <div className="text-4xl font-bold">{formatCurrency(metrics.currentMonthSpend)}</div>
              <div className="text-sm opacity-90">This month</div>
            </div>
            <div>
              <div className="text-sm opacity-90 mb-1">Projected</div>
              <div className="text-3xl font-bold">{formatCurrency(metrics.projectedMonthSpend)}</div>
              <div className="text-sm opacity-90">End of month</div>
            </div>
            <div>
              <div className="text-sm opacity-90 mb-1">Budget</div>
              <div className="text-3xl font-bold">{formatCurrency(metrics.budget)}</div>
              <div className="text-sm opacity-90">Monthly limit</div>
            </div>
            <div>
              <div className="text-sm opacity-90 mb-1">Utilization</div>
              <div className="text-4xl font-bold">{metrics.budgetUtilization}%</div>
              <div className="text-sm opacity-90">of budget</div>
            </div>
            <div>
              <div className="text-sm opacity-90 mb-1">Daily Rate</div>
              <div className="text-3xl font-bold">{formatCurrency(metrics.dailyRunRate)}</div>
              <div className="text-sm opacity-90 flex items-center gap-1">
                {metrics.costTrend === 'increasing' && <TrendingUp className="w-4 h-4" />}
                {metrics.costTrend === 'decreasing' && <TrendingDown className="w-4 h-4" />}
                {metrics.costTrend}
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Active Alerts */}
      {metrics && metrics.alerts.filter(a => !a.acknowledged).length > 0 && (
        <div className="space-y-2">
          {metrics.alerts.filter(a => !a.acknowledged).map((alert) => (
            <Card key={alert.id} className={`p-4 ${
              alert.severity === 'critical' ? 'bg-red-50 border-red-200' :
              alert.severity === 'warning' ? 'bg-amber-50 border-amber-200' :
              'bg-blue-50 border-blue-200'
            }`}>
              <div className="flex items-start gap-3">
                <AlertTriangle className={`w-5 h-5 flex-shrink-0 mt-0.5 ${
                  alert.severity === 'critical' ? 'text-red-600' :
                  alert.severity === 'warning' ? 'text-amber-600' :
                  'text-blue-600'
                }`} />
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <Badge className={getSeverityColor(alert.severity)}>
                      {alert.severity}
                    </Badge>
                    <span className="text-xs text-gray-600">
                      {new Date(alert.timestamp).toLocaleString()}
                    </span>
                  </div>
                  <p className="font-medium mb-1">{alert.message}</p>
                  <p className="text-sm text-gray-600">
                    Current: {formatCurrency(alert.current)} / Threshold: {formatCurrency(alert.threshold)}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => acknowledgeAlert(alert.id)}
                >
                  Acknowledge
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Budget Settings */}
      <Card className="p-6">
        <h3 className="text-xl mb-4">Budget Configuration</h3>
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <Label htmlFor="budget-limit">Monthly Budget Limit</Label>
            <div className="flex gap-2">
              <Input
                id="budget-limit"
                type="number"
                value={budgetLimit}
                onChange={(e) => setBudgetLimit(Number(e.target.value))}
                className="flex-1"
              />
              <Button onClick={updateBudget}>
                Update
              </Button>
            </div>
            <p className="text-xs text-gray-600 mt-1">
              Set maximum monthly spend limit
            </p>
          </div>

          <div>
            <Label htmlFor="alert-threshold">Alert Threshold (%)</Label>
            <div className="flex gap-2">
              <Input
                id="alert-threshold"
                type="number"
                min={0}
                max={100}
                value={alertThreshold}
                onChange={(e) => setAlertThreshold(Number(e.target.value))}
                className="flex-1"
              />
              <Button onClick={updateBudget}>
                Update
              </Button>
            </div>
            <p className="text-xs text-gray-600 mt-1">
              Receive alerts at this percentage of budget
            </p>
          </div>
        </div>
      </Card>

      {/* Cost Breakdown */}
      <Card className="p-6">
        <h3 className="text-xl mb-4">Cost Breakdown</h3>
        <div className="space-y-3">
          {breakdown.map((item) => {
            const category = COST_CATEGORIES.find(c => c.id === item.category);
            const Icon = category?.icon || DollarSign;
            
            return (
              <Card key={item.category} className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <Icon className="w-5 h-5 text-gray-600" />
                    <div>
                      <h4 className="font-medium">{category?.name || item.category}</h4>
                      <p className="text-xs text-gray-600">{item.percentage.toFixed(1)}% of total</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-[#625d9c]">
                      {formatCurrency(item.amount)}
                    </div>
                    <div className={`text-sm flex items-center gap-1 justify-end ${
                      item.trend > 0 ? 'text-red-600' : 'text-green-600'
                    }`}>
                      {item.trend > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                      {Math.abs(item.trend).toFixed(1)}%
                    </div>
                  </div>
                </div>

                {item.subCategories && item.subCategories.length > 0 && (
                  <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t">
                    {item.subCategories.map((sub, idx) => (
                      <div key={idx} className="text-sm">
                        <span className="text-gray-600">{sub.name}:</span>
                        <span className="font-medium ml-2">{formatCurrency(sub.amount)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      </Card>

      {/* Unit Economics */}
      <Card className="p-6">
        <h3 className="text-xl mb-4">Unit Economics</h3>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {unitEconomics.map((metric) => (
            <Card key={metric.metric} className="p-4">
              <h4 className="font-medium mb-3">{metric.metric}</h4>
              <div className={`text-3xl font-bold mb-2 ${getStatusColor(metric.status)}`}>
                {formatCurrency(metric.value)}
              </div>
              <div className="text-sm text-gray-600">per {metric.unit}</div>
              {metric.target && (
                <div className="mt-2 pt-2 border-t text-xs">
                  <span className="text-gray-600">Target: </span>
                  <span className="font-medium">{formatCurrency(metric.target)}</span>
                </div>
              )}
            </Card>
          ))}
        </div>
      </Card>

      {/* Budget Forecast */}
      <Card className="p-6">
        <h3 className="text-xl mb-4">Budget Forecast (Next 6 Months)</h3>
        <div className="space-y-2">
          {forecast.map((month) => (
            <div key={month.month} className="flex items-center gap-4 p-3 border rounded">
              <div className="flex-1">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium">{month.month}</span>
                  <Badge variant="outline">
                    {month.confidence}% confidence
                  </Badge>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full ${
                      month.projected <= month.budget ? 'bg-green-600' : 'bg-red-600'
                    }`}
                    style={{ width: `${Math.min(100, (month.projected / month.budget) * 100)}%` }}
                  />
                </div>
              </div>
              <div className="text-right min-w-[200px]">
                <div className="text-lg font-bold">{formatCurrency(month.projected)}</div>
                <div className="text-xs text-gray-600">Budget: {formatCurrency(month.budget)}</div>
              </div>
              {month.projected > month.budget && (
                <AlertTriangle className="w-5 h-5 text-red-600" />
              )}
            </div>
          ))}
        </div>
      </Card>

      {/* Cost Optimizations */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl">Cost Optimization Opportunities</h3>
          <Badge className="bg-[#5d9827] text-white text-lg">
            Potential Savings: {formatCurrency(totalPotentialSavings)}/mo
          </Badge>
        </div>
        <div className="space-y-3">
          {optimizations.map((opt, idx) => (
            <Card key={idx} className="p-4 bg-green-50 border-green-200">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h4 className="font-medium">{opt.category}</h4>
                    <Badge variant="outline" className="capitalize">{opt.effort} effort</Badge>
                    <Badge variant="outline" className="capitalize">{opt.impact} impact</Badge>
                  </div>
                  <p className="text-sm text-gray-700 mb-2">{opt.recommendation}</p>
                  <div className="flex items-center gap-3 text-sm">
                    <span className="text-gray-600">
                      Current: {formatCurrency(opt.currentCost)}/mo
                    </span>
                    <span className="font-medium text-green-600">
                      Save: {formatCurrency(opt.potentialSavings)}/mo
                    </span>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </Card>

      {/* Cost Guardrails Info */}
      <Card className="p-6 bg-blue-50 border-blue-200">
        <h3 className="text-xl mb-4 text-blue-900">Cost Guardrails Active</h3>
        <div className="space-y-3 text-sm text-blue-900">
          <div className="flex items-start gap-2">
            <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium">Automated Budget Alerts</p>
              <p className="text-blue-800">
                Receive email/SMS notifications at {alertThreshold}% of budget
              </p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium">Daily Cost Tracking</p>
              <p className="text-blue-800">
                Monitor daily run rate and project month-end spend
              </p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium">Unit Economics Monitoring</p>
              <p className="text-blue-800">
                Track cost per user, per session, and other key metrics
              </p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium">Anomaly Detection</p>
              <p className="text-blue-800">
                Automatically detect unusual spending patterns
              </p>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
