import React, { useState, useEffect } from 'react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { 
  Users,
  Activity,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Zap,
  Server,
  Database,
  Clock,
  Loader2,
  PlayCircle,
  RefreshCw,
  BarChart3
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { projectId, publicAnonKey } from '../../utils/supabase/info';

interface CapacityMetrics {
  currentLoad: number;
  maxCapacity: number;
  utilizationPercentage: number;
  activeSessions: number;
  activeUsers: number;
  queuedRequests: number;
  responseTime: number; // ms
  errorRate: number; // percentage
}

interface LoadTestResult {
  id: string;
  testDate: string;
  testType: 'spike' | 'load' | 'stress' | 'endurance';
  duration: number; // minutes
  status: 'passed' | 'failed' | 'running';
  concurrentUsers: number;
  requestsPerSecond: number;
  avgResponseTime: number;
  p95ResponseTime: number;
  p99ResponseTime: number;
  errorRate: number;
  throughput: number;
  failurePoint?: number;
  bottlenecks: string[];
}

interface ResourceUtilization {
  resource: string;
  current: number;
  max: number;
  unit: string;
  status: 'healthy' | 'warning' | 'critical';
}

interface PeakPeriod {
  name: string;
  dayOfWeek: string;
  startHour: number;
  endHour: number;
  avgConcurrentSessions: number;
  peakConcurrentSessions: number;
  utilizationPercentage: number;
}

interface AutoScalingEvent {
  timestamp: string;
  event: 'scale-up' | 'scale-down';
  reason: string;
  previousCapacity: number;
  newCapacity: number;
  triggerMetric: string;
  duration: number; // seconds
}

interface ConcurrencyMonitoringProps {
  opsId: string;
  accessToken: string;
}

export function ConcurrencyMonitoring({ opsId, accessToken }: ConcurrencyMonitoringProps) {
  const [capacity, setCapacity] = useState<CapacityMetrics | null>(null);
  const [loadTests, setLoadTests] = useState<LoadTestResult[]>([]);
  const [resources, setResources] = useState<ResourceUtilization[]>([]);
  const [peakPeriods, setPeakPeriods] = useState<PeakPeriod[]>([]);
  const [scalingEvents, setScalingEvents] = useState<AutoScalingEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [runningTest, setRunningTest] = useState(false);
  const [selectedTest, setSelectedTest] = useState<LoadTestResult | null>(null);

  useEffect(() => {
    loadConcurrencyData();
    const interval = setInterval(loadConcurrencyData, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, []);

  const loadConcurrencyData = async () => {
    setLoading(true);
    try {
      const [capacityRes, testsRes, resourcesRes, peaksRes, scalingRes] = await Promise.all([
        fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-cbd74580/admin/concurrency/capacity`,
          { headers: { 'Authorization': `Bearer ${accessToken}` } }
        ),
        fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-cbd74580/admin/concurrency/load-tests`,
          { headers: { 'Authorization': `Bearer ${accessToken}` } }
        ),
        fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-cbd74580/admin/concurrency/resources`,
          { headers: { 'Authorization': `Bearer ${accessToken}` } }
        ),
        fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-cbd74580/admin/concurrency/peak-periods`,
          { headers: { 'Authorization': `Bearer ${accessToken}` } }
        ),
        fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-cbd74580/admin/concurrency/scaling-events`,
          { headers: { 'Authorization': `Bearer ${accessToken}` } }
        )
      ]);

      if (capacityRes.ok) {
        const data = await capacityRes.json();
        setCapacity(data.capacity);
      }

      if (testsRes.ok) {
        const data = await testsRes.json();
        setLoadTests(data.tests || []);
      }

      if (resourcesRes.ok) {
        const data = await resourcesRes.json();
        setResources(data.resources || []);
      }

      if (peaksRes.ok) {
        const data = await peaksRes.json();
        setPeakPeriods(data.peaks || []);
      }

      if (scalingRes.ok) {
        const data = await scalingRes.json();
        setScalingEvents(data.events || []);
      }
    } catch (error) {
      console.error('Error loading concurrency data:', error);
      toast.error('Failed to load concurrency data');
    } finally {
      setLoading(false);
    }
  };

  const runLoadTest = async (testType: 'spike' | 'load' | 'stress' | 'endurance') => {
    setRunningTest(true);
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-cbd74580/admin/concurrency/load-tests`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            testType,
            initiatedBy: opsId
          })
        }
      );

      if (response.ok) {
        toast.success(`${testType} test started`);
        setTimeout(loadConcurrencyData, 2000);
      } else {
        toast.error('Failed to start load test');
      }
    } catch (error) {
      console.error('Error starting load test:', error);
      toast.error('Failed to start load test');
    } finally {
      setRunningTest(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
      case 'passed':
        return 'bg-green-100 text-green-800';
      case 'warning':
        return 'bg-yellow-100 text-yellow-800';
      case 'critical':
      case 'failed':
        return 'bg-red-100 text-red-800';
      case 'running':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getUtilizationColor = (percentage: number) => {
    if (percentage < 70) return 'text-green-600';
    if (percentage < 85) return 'text-yellow-600';
    return 'text-red-600';
  };

  if (loading && !capacity) {
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
          <h2 className="text-3xl">Concurrency & Stability</h2>
          <p className="text-gray-600 mt-1">
            Load capacity and peak handling monitoring
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={loadConcurrencyData}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Button
            onClick={() => runLoadTest('load')}
            disabled={runningTest}
            className="bg-[#5d9827] hover:bg-[#4a7a1f]"
          >
            {runningTest ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <PlayCircle className="w-4 h-4 mr-2" />
            )}
            Run Load Test
          </Button>
        </div>
      </div>

      {/* Current Capacity */}
      {capacity && (
        <Card className="p-6 bg-gradient-to-r from-[#625d9c] to-[#5d9827] text-white">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-2xl mb-1">System Capacity</h3>
              <p className="opacity-90">Real-time load and utilization</p>
            </div>
            <Activity className="w-12 h-12 opacity-80" />
          </div>

          <div className="grid md:grid-cols-5 gap-6">
            <div>
              <div className="text-sm opacity-90 mb-1">Utilization</div>
              <div className="text-4xl font-bold">{capacity.utilizationPercentage}%</div>
              <div className="text-sm opacity-90">
                {capacity.currentLoad.toLocaleString()} / {capacity.maxCapacity.toLocaleString()}
              </div>
            </div>
            <div>
              <div className="text-sm opacity-90 mb-1">Active Sessions</div>
              <div className="text-3xl font-bold">{capacity.activeSessions}</div>
              <div className="text-sm opacity-90">Live lessons</div>
            </div>
            <div>
              <div className="text-sm opacity-90 mb-1">Active Users</div>
              <div className="text-3xl font-bold">{capacity.activeUsers.toLocaleString()}</div>
              <div className="text-sm opacity-90">Online now</div>
            </div>
            <div>
              <div className="text-sm opacity-90 mb-1">Response Time</div>
              <div className="text-3xl font-bold">{capacity.responseTime}ms</div>
              <div className="text-sm opacity-90">Avg P95</div>
            </div>
            <div>
              <div className="text-sm opacity-90 mb-1">Error Rate</div>
              <div className="text-3xl font-bold">{capacity.errorRate.toFixed(2)}%</div>
              <div className="text-sm opacity-90">
                {capacity.queuedRequests > 0 ? `${capacity.queuedRequests} queued` : 'No queue'}
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Capacity Warnings */}
      {capacity && capacity.utilizationPercentage > 80 && (
        <Card className="p-4 bg-red-50 border-red-200">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-red-900">
              <p className="font-medium mb-1">High Capacity Utilization</p>
              <p>
                System is running at {capacity.utilizationPercentage}% capacity. Consider scaling up
                resources or implementing rate limiting to prevent service degradation.
              </p>
            </div>
          </div>
        </Card>
      )}

      {capacity && capacity.queuedRequests > 10 && (
        <Card className="p-4 bg-amber-50 border-amber-200">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-amber-900">
              <p className="font-medium mb-1">Request Queue Building Up</p>
              <p>
                {capacity.queuedRequests} requests currently queued. System may be experiencing load
                issues or slow processing.
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Resource Utilization */}
      <Card className="p-6">
        <h3 className="text-xl mb-4">Resource Utilization</h3>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
          {resources.map((resource) => (
            <Card key={resource.resource} className="p-4">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h4 className="font-medium mb-1">{resource.resource}</h4>
                  <Badge className={getStatusColor(resource.status)}>
                    {resource.status}
                  </Badge>
                </div>
                {resource.resource.includes('CPU') && <Server className="w-5 h-5 text-gray-600" />}
                {resource.resource.includes('Database') && <Database className="w-5 h-5 text-gray-600" />}
                {resource.resource.includes('Memory') && <Activity className="w-5 h-5 text-gray-600" />}
              </div>

              <div className={`text-3xl font-bold mb-2 ${getUtilizationColor((resource.current / resource.max) * 100)}`}>
                {((resource.current / resource.max) * 100).toFixed(1)}%
              </div>

              <div className="text-sm text-gray-600">
                {resource.current.toLocaleString()} / {resource.max.toLocaleString()} {resource.unit}
              </div>

              <div className="mt-3 w-full bg-gray-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full ${
                    (resource.current / resource.max) * 100 < 70 ? 'bg-green-600' :
                    (resource.current / resource.max) * 100 < 85 ? 'bg-yellow-600' :
                    'bg-red-600'
                  }`}
                  style={{ width: `${Math.min(100, (resource.current / resource.max) * 100)}%` }}
                />
              </div>
            </Card>
          ))}
        </div>
      </Card>

      {/* Peak Periods */}
      <Card className="p-6">
        <h3 className="text-xl mb-4">Peak Usage Periods</h3>
        <div className="space-y-3">
          {peakPeriods.map((period, idx) => (
            <Card key={idx} className="p-4">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h4 className="font-medium mb-1">{period.name}</h4>
                  <p className="text-sm text-gray-600">
                    {period.dayOfWeek} • {period.startHour}:00 - {period.endHour}:00
                  </p>
                </div>
                <Badge className={getStatusColor(
                  period.utilizationPercentage < 70 ? 'healthy' :
                  period.utilizationPercentage < 85 ? 'warning' :
                  'critical'
                )}>
                  {period.utilizationPercentage}% capacity
                </Badge>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="text-center p-2 bg-gray-50 rounded">
                  <div className="text-lg font-bold text-[#625d9c]">
                    {period.avgConcurrentSessions}
                  </div>
                  <div className="text-xs text-gray-600">Avg Sessions</div>
                </div>
                <div className="text-center p-2 bg-gray-50 rounded">
                  <div className="text-lg font-bold text-[#5d9827]">
                    {period.peakConcurrentSessions}
                  </div>
                  <div className="text-xs text-gray-600">Peak Sessions</div>
                </div>
                <div className="text-center p-2 bg-gray-50 rounded">
                  <div className={`text-lg font-bold ${getUtilizationColor(period.utilizationPercentage)}`}>
                    {period.utilizationPercentage}%
                  </div>
                  <div className="text-xs text-gray-600">Utilization</div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </Card>

      {/* Load Test Results */}
      <div className="grid lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <h3 className="text-xl mb-4">Load Test History</h3>
          <div className="space-y-2 max-h-[500px] overflow-y-auto">
            {loadTests.map((test) => (
              <Card
                key={test.id}
                className={`p-4 cursor-pointer hover:border-[#625d9c] transition-colors ${
                  selectedTest?.id === test.id ? 'border-[#625d9c] border-2' : ''
                }`}
                onClick={() => setSelectedTest(test)}
              >
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <BarChart3 className="w-4 h-4 text-gray-600" />
                      <span className="font-medium text-sm">
                        {new Date(test.testDate).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={getStatusColor(test.status)}>
                        {test.status}
                      </Badge>
                      <Badge variant="outline" className="capitalize">
                        {test.testType}
                      </Badge>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs text-gray-600 mt-3">
                  <span>Users: {test.concurrentUsers.toLocaleString()}</span>
                  <span>RPS: {test.requestsPerSecond}</span>
                  <span>Avg RT: {test.avgResponseTime}ms</span>
                  <span>Errors: {test.errorRate.toFixed(2)}%</span>
                </div>

                {test.bottlenecks.length > 0 && (
                  <div className="flex items-center gap-1 text-xs text-red-600 mt-2">
                    <AlertTriangle className="w-3 h-3" />
                    {test.bottlenecks.length} bottleneck{test.bottlenecks.length !== 1 ? 's' : ''}
                  </div>
                )}
              </Card>
            ))}

            {loadTests.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <BarChart3 className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                <p>No load tests yet</p>
              </div>
            )}
          </div>
        </Card>

        {/* Test Details */}
        <Card className="p-6">
          {selectedTest ? (
            <div className="space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-xl mb-2 capitalize">{selectedTest.testType} Test</h3>
                  <p className="text-sm text-gray-600">
                    {new Date(selectedTest.testDate).toLocaleString()}
                  </p>
                </div>
                <Badge className={getStatusColor(selectedTest.status)}>
                  {selectedTest.status}
                </Badge>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Card className="p-3">
                  <div className="text-xs text-gray-600 mb-1">Concurrent Users</div>
                  <div className="text-2xl font-bold text-[#625d9c]">
                    {selectedTest.concurrentUsers.toLocaleString()}
                  </div>
                </Card>
                <Card className="p-3">
                  <div className="text-xs text-gray-600 mb-1">Duration</div>
                  <div className="text-2xl font-bold text-[#625d9c]">
                    {selectedTest.duration}m
                  </div>
                </Card>
                <Card className="p-3">
                  <div className="text-xs text-gray-600 mb-1">Requests/sec</div>
                  <div className="text-2xl font-bold text-[#5d9827]">
                    {selectedTest.requestsPerSecond}
                  </div>
                </Card>
                <Card className="p-3">
                  <div className="text-xs text-gray-600 mb-1">Throughput</div>
                  <div className="text-2xl font-bold text-[#5d9827]">
                    {selectedTest.throughput}
                  </div>
                </Card>
              </div>

              <div>
                <h4 className="font-medium mb-3">Response Times</h4>
                <div className="space-y-2">
                  <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                    <span className="text-sm">Average</span>
                    <span className="font-medium">{selectedTest.avgResponseTime}ms</span>
                  </div>
                  <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                    <span className="text-sm">95th Percentile</span>
                    <span className="font-medium">{selectedTest.p95ResponseTime}ms</span>
                  </div>
                  <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                    <span className="text-sm">99th Percentile</span>
                    <span className="font-medium">{selectedTest.p99ResponseTime}ms</span>
                  </div>
                  <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                    <span className="text-sm">Error Rate</span>
                    <span className={`font-medium ${selectedTest.errorRate > 1 ? 'text-red-600' : 'text-green-600'}`}>
                      {selectedTest.errorRate.toFixed(2)}%
                    </span>
                  </div>
                </div>
              </div>

              {selectedTest.failurePoint && (
                <Card className="p-4 bg-red-50 border-red-200">
                  <p className="text-sm font-medium text-red-900 mb-1">Failure Point</p>
                  <p className="text-sm text-red-800">
                    System failed at {selectedTest.failurePoint} concurrent users
                  </p>
                </Card>
              )}

              {selectedTest.bottlenecks.length > 0 && (
                <div>
                  <h4 className="font-medium mb-2 text-red-900">Bottlenecks Identified</h4>
                  <Card className="p-3 bg-red-50 border-red-200">
                    {selectedTest.bottlenecks.map((bottleneck, idx) => (
                      <p key={idx} className="text-sm text-red-800 mb-1">• {bottleneck}</p>
                    ))}
                  </Card>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500">
              <BarChart3 className="w-16 h-16 mx-auto mb-4 text-gray-400" />
              <p>Select a test to view details</p>
            </div>
          )}
        </Card>
      </div>

      {/* Auto-Scaling Events */}
      <Card className="p-6">
        <h3 className="text-xl mb-4">Recent Auto-Scaling Events</h3>
        <div className="space-y-2">
          {scalingEvents.slice(0, 10).map((event, idx) => (
            <Card key={idx} className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    {event.event === 'scale-up' ? (
                      <TrendingUp className="w-4 h-4 text-green-600" />
                    ) : (
                      <TrendingUp className="w-4 h-4 text-blue-600 transform rotate-180" />
                    )}
                    <span className="font-medium text-sm">
                      {event.event === 'scale-up' ? 'Scaled Up' : 'Scaled Down'}
                    </span>
                    <Badge variant="outline" className="text-xs">
                      {event.triggerMetric}
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-600 mb-2">{event.reason}</p>
                  <div className="flex items-center gap-4 text-xs text-gray-600">
                    <span>
                      {new Date(event.timestamp).toLocaleString()}
                    </span>
                    <span>
                      {event.previousCapacity} → {event.newCapacity}
                    </span>
                    <span>Duration: {event.duration}s</span>
                  </div>
                </div>
              </div>
            </Card>
          ))}

          {scalingEvents.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <Activity className="w-12 h-12 mx-auto mb-2 text-gray-400" />
              <p>No recent scaling events</p>
            </div>
          )}
        </div>
      </Card>

      {/* Capacity Planning */}
      <Card className="p-6 bg-blue-50 border-blue-200">
        <h3 className="text-xl mb-4 text-blue-900">Capacity Planning Recommendations</h3>
        <div className="space-y-3 text-sm text-blue-900">
          {capacity && capacity.utilizationPercentage > 70 && (
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5 text-amber-600" />
              <div>
                <p className="font-medium">Consider Additional Capacity</p>
                <p className="text-blue-800">
                  Current utilization at {capacity.utilizationPercentage}%. Plan for {Math.ceil(capacity.utilizationPercentage * 1.5)}% capacity
                  to handle growth and peak periods.
                </p>
              </div>
            </div>
          )}
          <div className="flex items-start gap-2">
            <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium">Enable Auto-Scaling</p>
              <p className="text-blue-800">
                Configure auto-scaling rules to handle traffic spikes automatically
              </p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium">Implement Rate Limiting</p>
              <p className="text-blue-800">
                Protect system stability with per-user and per-IP rate limits
              </p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium">Regular Load Testing</p>
              <p className="text-blue-800">
                Schedule monthly load tests to validate capacity and identify bottlenecks
              </p>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
