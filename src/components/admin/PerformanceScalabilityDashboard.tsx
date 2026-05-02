import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { PerformanceMonitoring } from './PerformanceMonitoring';
import { ConcurrencyMonitoring } from './ConcurrencyMonitoring';
import { CostMonitoring } from './CostMonitoring';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';
import { 
  Zap,
  Activity,
  DollarSign,
  CheckCircle2,
  AlertTriangle,
  TrendingUp,
  BarChart3,
  Globe,
  Gauge
} from 'lucide-react';

interface PerformanceScalabilityDashboardProps {
  userId: string;
  accessToken: string;
  userRole: 'admin' | 'ops' | 'finance';
}

export function PerformanceScalabilityDashboard({ 
  userId, 
  accessToken, 
  userRole 
}: PerformanceScalabilityDashboardProps) {
  const [activeTab, setActiveTab] = useState(() => {
    // Set default tab based on role
    if (userRole === 'finance') return 'costs';
    if (userRole === 'ops') return 'concurrency';
    return 'performance';
  });

  // Determine access permissions
  const hasPerformanceAccess = userRole === 'admin' || userRole === 'ops';
  const hasConcurrencyAccess = userRole === 'admin' || userRole === 'ops';
  const hasCostAccess = userRole === 'admin' || userRole === 'finance';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl">Performance & Scalability</h1>
          <p className="text-gray-600 mt-1">
            System performance, capacity, and cost monitoring
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge className="bg-[#625d9c] text-white capitalize">
            {userRole}
          </Badge>
          <Badge variant="outline" className="text-green-600">
            <CheckCircle2 className="w-3 h-3 mr-1" />
            Monitoring Active
          </Badge>
        </div>
      </div>

      {/* NFR Compliance Status */}
      <Card className="p-6 bg-gradient-to-r from-[#625d9c] to-[#5d9827] text-white">
        <h2 className="text-2xl mb-4">Non-Functional Requirements (NFRs) Status</h2>
        <div className="grid md:grid-cols-3 gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Zap className="w-5 h-5" />
              <h3 className="text-lg">Page Load Performance</h3>
            </div>
            <div className="space-y-1 text-sm opacity-90">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                <span>FCP < 2.5s on 3G-fast ✓</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                <span>Search results < 2s ✓</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                <span>Classroom join < 5s (P95) ✓</span>
              </div>
            </div>
          </div>

          <div>
            <div className="flex items-center gap-2 mb-2">
              <Activity className="w-5 h-5" />
              <h3 className="text-lg">Concurrency & Stability</h3>
            </div>
            <div className="space-y-1 text-sm opacity-90">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                <span>500 concurrent sessions ✓</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                <span>Error rate < 1% ✓</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                <span>3 regions monitored ✓</span>
              </div>
            </div>
          </div>

          <div>
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="w-5 h-5" />
              <h3 className="text-lg">Cost Guardrails</h3>
            </div>
            <div className="space-y-1 text-sm opacity-90">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                <span>Budget alerts at 70/90/100% ✓</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                <span>Unit economics tracked ✓</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                <span>Monthly cost reports ✓</span>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Quick Stats Overview */}
      <div className="grid md:grid-cols-4 gap-4">
        {hasPerformanceAccess && (
          <Card className="p-4">
            <div className="flex items-center justify-between mb-2">
              <Gauge className="w-5 h-5 text-[#625d9c]" />
              <Badge variant="outline">Performance</Badge>
            </div>
            <div className="text-2xl font-bold">92</div>
            <div className="text-sm text-gray-600">Performance Score</div>
          </Card>
        )}

        {hasConcurrencyAccess && (
          <Card className="p-4">
            <div className="flex items-center justify-between mb-2">
              <Activity className="w-5 h-5 text-[#5d9827]" />
              <Badge variant="outline">Live</Badge>
            </div>
            <div className="text-2xl font-bold">247</div>
            <div className="text-sm text-gray-600">Concurrent Sessions</div>
          </Card>
        )}

        {hasConcurrencyAccess && (
          <Card className="p-4">
            <div className="flex items-center justify-between mb-2">
              <BarChart3 className="w-5 h-5 text-blue-600" />
              <Badge className="bg-green-100 text-green-800">Healthy</Badge>
            </div>
            <div className="text-2xl font-bold">0.03%</div>
            <div className="text-sm text-gray-600">Error Rate</div>
          </Card>
        )}

        {hasCostAccess && (
          <Card className="p-4">
            <div className="flex items-center justify-between mb-2">
              <DollarSign className="w-5 h-5 text-purple-600" />
              <Badge variant="outline">MTD</Badge>
            </div>
            <div className="text-2xl font-bold">₦8.2K</div>
            <div className="text-sm text-gray-600">Current Spend</div>
          </Card>
        )}
      </div>

      {/* Main Monitoring Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 lg:grid-cols-4 gap-2">
          {hasPerformanceAccess && (
            <TabsTrigger value="performance" className="flex items-center gap-2">
              <Zap className="w-4 h-4" />
              <span className="hidden sm:inline">Performance</span>
            </TabsTrigger>
          )}

          {hasConcurrencyAccess && (
            <TabsTrigger value="concurrency" className="flex items-center gap-2">
              <Activity className="w-4 h-4" />
              <span className="hidden sm:inline">Concurrency</span>
            </TabsTrigger>
          )}

          {hasCostAccess && (
            <TabsTrigger value="costs" className="flex items-center gap-2">
              <DollarSign className="w-4 h-4" />
              <span className="hidden sm:inline">Costs</span>
            </TabsTrigger>
          )}

          <TabsTrigger value="overview" className="flex items-center gap-2">
            <Globe className="w-4 h-4" />
            <span className="hidden sm:inline">Overview</span>
          </TabsTrigger>
        </TabsList>

        {/* Performance Tab */}
        {hasPerformanceAccess && (
          <TabsContent value="performance">
            <PerformanceMonitoring userId={userId} accessToken={accessToken} />
          </TabsContent>
        )}

        {/* Concurrency Tab */}
        {hasConcurrencyAccess && (
          <TabsContent value="concurrency">
            <ConcurrencyMonitoring opsId={userId} accessToken={accessToken} />
          </TabsContent>
        )}

        {/* Cost Monitoring Tab */}
        {hasCostAccess && (
          <TabsContent value="costs">
            <CostMonitoring financeId={userId} accessToken={accessToken} />
          </TabsContent>
        )}

        {/* Overview Tab */}
        <TabsContent value="overview">
          <div className="space-y-6">
            <Card className="p-6">
              <h3 className="text-xl mb-4">System Health Overview</h3>
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium mb-3 flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-green-600" />
                    Currently Healthy
                  </h4>
                  <ul className="space-y-2 text-sm text-gray-700">
                    <li>• All pages loading within performance targets</li>
                    <li>• Capacity utilization at 49% - well within limits</li>
                    <li>• Error rate 0.03% - well below 1% threshold</li>
                    <li>• Current spend at 82% of monthly budget</li>
                    <li>• Auto-scaling configured and tested</li>
                    <li>• Synthetic monitoring active in 3 regions</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-medium mb-3 flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-amber-600" />
                    Recommendations
                  </h4>
                  <ul className="space-y-2 text-sm text-gray-700">
                    <li>• Consider CDN for static assets to improve FCP</li>
                    <li>• Schedule monthly load testing for capacity validation</li>
                    <li>• Review cost optimizations - potential ₦2.3K/mo savings</li>
                    <li>• Monitor resource allocation during peak hours (4-7pm)</li>
                    <li>• Enable rate limiting for API endpoints</li>
                  </ul>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <h3 className="text-xl mb-4">Regional Performance</h3>
              <div className="grid md:grid-cols-3 gap-4">
                <Card className="p-4 bg-green-50 border-green-200">
                  <div className="flex items-center gap-2 mb-2">
                    <Globe className="w-5 h-5 text-green-600" />
                    <h4 className="font-medium">UK (London)</h4>
                  </div>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Avg Load Time:</span>
                      <span className="font-medium text-green-600">1.8s</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Uptime:</span>
                      <span className="font-medium text-green-600">99.98%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Active Users:</span>
                      <span className="font-medium">2,847</span>
                    </div>
                  </div>
                </Card>

                <Card className="p-4 bg-green-50 border-green-200">
                  <div className="flex items-center gap-2 mb-2">
                    <Globe className="w-5 h-5 text-green-600" />
                    <h4 className="font-medium">EU (Frankfurt)</h4>
                  </div>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Avg Load Time:</span>
                      <span className="font-medium text-green-600">2.1s</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Uptime:</span>
                      <span className="font-medium text-green-600">99.96%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Active Users:</span>
                      <span className="font-medium">1,523</span>
                    </div>
                  </div>
                </Card>

                <Card className="p-4 bg-green-50 border-green-200">
                  <div className="flex items-center gap-2 mb-2">
                    <Globe className="w-5 h-5 text-green-600" />
                    <h4 className="font-medium">US (N. Virginia)</h4>
                  </div>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Avg Load Time:</span>
                      <span className="font-medium text-green-600">2.3s</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Uptime:</span>
                      <span className="font-medium text-green-600">99.97%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Active Users:</span>
                      <span className="font-medium">892</span>
                    </div>
                  </div>
                </Card>
              </div>
            </Card>

            <Card className="p-6 bg-blue-50 border-blue-200">
              <h3 className="text-xl mb-4 text-blue-900">Platform NFR Targets & Status</h3>
              <div className="space-y-4 text-sm">
                <div>
                  <h4 className="font-medium text-blue-900 mb-2">19.1 Page Load Performance</h4>
                  <div className="space-y-1 text-blue-800">
                    <div className="flex items-center justify-between p-2 bg-white rounded">
                      <span>First Contentful Paint (3G-fast baseline)</span>
                      <Badge className="bg-green-100 text-green-800">
                        <CheckCircle2 className="w-3 h-3 mr-1" />
                        1.9s / 2.5s target
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between p-2 bg-white rounded">
                      <span>Search Results</span>
                      <Badge className="bg-green-100 text-green-800">
                        <CheckCircle2 className="w-3 h-3 mr-1" />
                        1.4s / 2s target
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between p-2 bg-white rounded">
                      <span>Classroom Join (P95)</span>
                      <Badge className="bg-green-100 text-green-800">
                        <CheckCircle2 className="w-3 h-3 mr-1" />
                        4.2s / 5s target
                      </Badge>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium text-blue-900 mb-2">19.2 Concurrency & Stability</h4>
                  <div className="space-y-1 text-blue-800">
                    <div className="flex items-center justify-between p-2 bg-white rounded">
                      <span>Concurrent Sessions Capacity</span>
                      <Badge className="bg-green-100 text-green-800">
                        <CheckCircle2 className="w-3 h-3 mr-1" />
                        247 / 500 (49% utilization)
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between p-2 bg-white rounded">
                      <span>Error Rate at Peak</span>
                      <Badge className="bg-green-100 text-green-800">
                        <CheckCircle2 className="w-3 h-3 mr-1" />
                        0.03% / 1% threshold
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between p-2 bg-white rounded">
                      <span>Synthetic Monitoring</span>
                      <Badge className="bg-green-100 text-green-800">
                        <CheckCircle2 className="w-3 h-3 mr-1" />
                        3 regions active
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between p-2 bg-white rounded">
                      <span>Auto-Scaling</span>
                      <Badge className="bg-green-100 text-green-800">
                        <CheckCircle2 className="w-3 h-3 mr-1" />
                        Configured & tested
                      </Badge>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium text-blue-900 mb-2">19.3 Cost Guardrails</h4>
                  <div className="space-y-1 text-blue-800">
                    <div className="flex items-center justify-between p-2 bg-white rounded">
                      <span>Budget Alerts</span>
                      <Badge className="bg-green-100 text-green-800">
                        <CheckCircle2 className="w-3 h-3 mr-1" />
                        70/90/100% thresholds set
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between p-2 bg-white rounded">
                      <span>Cost per Booked Hour</span>
                      <Badge className="bg-green-100 text-green-800">
                        <CheckCircle2 className="w-3 h-3 mr-1" />
                        ₦2.34 tracked
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between p-2 bg-white rounded">
                      <span>Cost per Active User</span>
                      <Badge className="bg-green-100 text-green-800">
                        <CheckCircle2 className="w-3 h-3 mr-1" />
                        ₦1.62 tracked
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between p-2 bg-white rounded">
                      <span>Monthly Cost Report</span>
                      <Badge className="bg-green-100 text-green-800">
                        <CheckCircle2 className="w-3 h-3 mr-1" />
                        Auto-generated & distributed
                      </Badge>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Role-specific guidance */}
      <Card className="p-4 bg-gray-50">
        <h4 className="font-medium mb-2">Your Role: {userRole.charAt(0).toUpperCase() + userRole.slice(1)}</h4>
        <ul className="text-sm text-gray-700 space-y-1">
          {userRole === 'admin' && (
            <>
              <li>• Full access to all performance, concurrency, and cost monitoring</li>
              <li>• Can configure alerts, budgets, and thresholds</li>
              <li>• Receives all critical alerts and reports</li>
            </>
          )}
          {userRole === 'ops' && (
            <>
              <li>• Monitor performance metrics and load capacity</li>
              <li>• Run load tests and review concurrency data</li>
              <li>• Ensure platform stability and scalability</li>
            </>
          )}
          {userRole === 'finance' && (
            <>
              <li>• Track infrastructure and service costs</li>
              <li>• Monitor unit economics and ROI</li>
              <li>• Review monthly cost reports and budgets</li>
            </>
          )}
        </ul>
      </Card>
    </div>
  );
}
