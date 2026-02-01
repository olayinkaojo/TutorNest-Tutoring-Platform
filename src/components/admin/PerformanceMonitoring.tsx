import React, { useState, useEffect } from 'react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { 
  Zap,
  TrendingUp,
  TrendingDown,
  Clock,
  Activity,
  AlertTriangle,
  CheckCircle2,
  Gauge,
  Monitor,
  Smartphone,
  Globe,
  Loader2,
  RefreshCw
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { projectId, publicAnonKey } from '../../utils/supabase/info';

interface PageMetrics {
  pageName: string;
  url: string;
  loadTime: number; // ms
  fcp: number; // First Contentful Paint
  lcp: number; // Largest Contentful Paint
  fid: number; // First Input Delay
  cls: number; // Cumulative Layout Shift
  ttfb: number; // Time to First Byte
  views: number;
  bounceRate: number;
  deviceBreakdown: {
    desktop: number;
    mobile: number;
    tablet: number;
  };
}

interface CoreWebVital {
  metric: string;
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  threshold: {
    good: number;
    poor: number;
  };
  p50: number;
  p75: number;
  p90: number;
}

interface PerformanceTrend {
  date: string;
  avgLoadTime: number;
  p95LoadTime: number;
  errorRate: number;
}

interface ResourceTiming {
  resourceType: string;
  count: number;
  totalSize: number; // bytes
  avgLoadTime: number;
  slowest: {
    url: string;
    duration: number;
  };
}

interface PerformanceMonitoringProps {
  userId: string;
  accessToken: string;
}

const PERFORMANCE_TARGETS = {
  loadTime: 3000, // 3 seconds
  fcp: 1800, // 1.8 seconds
  lcp: 2500, // 2.5 seconds
  fid: 100, // 100ms
  cls: 0.1,
  ttfb: 600 // 600ms
};

export function PerformanceMonitoring({ userId, accessToken }: PerformanceMonitoringProps) {
  const [pageMetrics, setPageMetrics] = useState<PageMetrics[]>([]);
  const [coreWebVitals, setCoreWebVitals] = useState<CoreWebVital[]>([]);
  const [trends, setTrends] = useState<PerformanceTrend[]>([]);
  const [resources, setResources] = useState<ResourceTiming[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPage, setSelectedPage] = useState<PageMetrics | null>(null);

  useEffect(() => {
    loadPerformanceData();
  }, []);

  const loadPerformanceData = async () => {
    setLoading(true);
    try {
      const [metricsRes, vitalsRes, trendsRes, resourcesRes] = await Promise.all([
        fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-cbd74580/admin/performance/pages`,
          { headers: { 'Authorization': `Bearer ${accessToken}` } }
        ),
        fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-cbd74580/admin/performance/web-vitals`,
          { headers: { 'Authorization': `Bearer ${accessToken}` } }
        ),
        fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-cbd74580/admin/performance/trends`,
          { headers: { 'Authorization': `Bearer ${accessToken}` } }
        ),
        fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-cbd74580/admin/performance/resources`,
          { headers: { 'Authorization': `Bearer ${accessToken}` } }
        )
      ]);

      if (metricsRes.ok) {
        const data = await metricsRes.json();
        setPageMetrics(data.metrics || []);
      }

      if (vitalsRes.ok) {
        const data = await vitalsRes.json();
        setCoreWebVitals(data.vitals || []);
      }

      if (trendsRes.ok) {
        const data = await trendsRes.json();
        setTrends(data.trends || []);
      }

      if (resourcesRes.ok) {
        const data = await resourcesRes.json();
        setResources(data.resources || []);
      }
    } catch (error) {
      console.error('Error loading performance data:', error);
      toast.error('Failed to load performance data');
    } finally {
      setLoading(false);
    }
  };

  const getRatingColor = (rating: string) => {
    switch (rating) {
      case 'good':
        return 'bg-green-100 text-green-800';
      case 'needs-improvement':
        return 'bg-yellow-100 text-yellow-800';
      case 'poor':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getRatingIcon = (rating: string) => {
    switch (rating) {
      case 'good':
        return <CheckCircle2 className="w-4 h-4" />;
      case 'needs-improvement':
        return <AlertTriangle className="w-4 h-4" />;
      case 'poor':
        return <AlertTriangle className="w-4 h-4" />;
      default:
        return <Activity className="w-4 h-4" />;
    }
  };

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  const formatTime = (ms: number): string => {
    if (ms < 1000) return `${Math.round(ms)}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  const avgLoadTime = pageMetrics.length > 0
    ? pageMetrics.reduce((sum, p) => sum + p.loadTime, 0) / pageMetrics.length
    : 0;

  const slowPages = pageMetrics.filter(p => p.loadTime > PERFORMANCE_TARGETS.loadTime).length;
  const avgBounceRate = pageMetrics.length > 0
    ? pageMetrics.reduce((sum, p) => sum + p.bounceRate, 0) / pageMetrics.length
    : 0;

  const totalResourceSize = resources.reduce((sum, r) => sum + r.totalSize, 0);

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
          <h2 className="text-3xl">Performance Monitoring</h2>
          <p className="text-gray-600 mt-1">
            Core Web Vitals and page load optimization
          </p>
        </div>
        <Button variant="outline" onClick={loadPerformanceData}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Overall Performance Score */}
      <Card className="p-6 bg-gradient-to-r from-[#625d9c] to-[#5d9827] text-white">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-2xl mb-1">Performance Score</h3>
            <p className="opacity-90">Based on Core Web Vitals and load times</p>
          </div>
          <div className="text-right">
            <div className="text-5xl font-bold">
              {Math.round((coreWebVitals.filter(v => v.rating === 'good').length / coreWebVitals.length) * 100) || 0}
            </div>
            <div className="text-sm opacity-90">out of 100</div>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-4">
          <div>
            <div className="text-sm opacity-90 mb-1">Avg Load Time</div>
            <div className="text-2xl font-bold">{formatTime(avgLoadTime)}</div>
            <div className="text-sm opacity-90">Target: {formatTime(PERFORMANCE_TARGETS.loadTime)}</div>
          </div>
          <div>
            <div className="text-sm opacity-90 mb-1">Slow Pages</div>
            <div className="text-2xl font-bold">{slowPages}</div>
            <div className="text-sm opacity-90">of {pageMetrics.length}</div>
          </div>
          <div>
            <div className="text-sm opacity-90 mb-1">Bounce Rate</div>
            <div className="text-2xl font-bold">{avgBounceRate.toFixed(1)}%</div>
            <div className="text-sm opacity-90">Platform average</div>
          </div>
          <div>
            <div className="text-sm opacity-90 mb-1">Total Assets</div>
            <div className="text-2xl font-bold">{formatBytes(totalResourceSize)}</div>
            <div className="text-sm opacity-90">All resources</div>
          </div>
        </div>
      </Card>

      {/* Performance Alerts */}
      {slowPages > 0 && (
        <Card className="p-4 bg-amber-50 border-amber-200">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-amber-900">
              <p className="font-medium mb-1">Performance Issues Detected</p>
              <p>
                {slowPages} page{slowPages !== 1 ? 's are' : ' is'} loading slower than the {formatTime(PERFORMANCE_TARGETS.loadTime)} target.
                Review and optimize these pages to improve user experience.
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Core Web Vitals */}
      <Card className="p-6">
        <h3 className="text-xl mb-4">Core Web Vitals</h3>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {coreWebVitals.map((vital) => (
            <Card key={vital.metric} className="p-4">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h4 className="font-medium mb-1">{vital.metric}</h4>
                  <Badge className={getRatingColor(vital.rating)}>
                    <span className="flex items-center gap-1">
                      {getRatingIcon(vital.rating)}
                      {vital.rating}
                    </span>
                  </Badge>
                </div>
                <Gauge className="w-6 h-6 text-gray-600" />
              </div>

              <div className="text-3xl font-bold text-[#625d9c] mb-3">
                {vital.metric === 'CLS' ? vital.value.toFixed(3) : formatTime(vital.value)}
              </div>

              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">P50:</span>
                  <span className="font-medium">
                    {vital.metric === 'CLS' ? vital.p50.toFixed(3) : formatTime(vital.p50)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">P75:</span>
                  <span className="font-medium">
                    {vital.metric === 'CLS' ? vital.p75.toFixed(3) : formatTime(vital.p75)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">P90:</span>
                  <span className="font-medium">
                    {vital.metric === 'CLS' ? vital.p90.toFixed(3) : formatTime(vital.p90)}
                  </span>
                </div>
              </div>

              <div className="mt-3 pt-3 border-t text-xs text-gray-600">
                Good: < {vital.metric === 'CLS' ? vital.threshold.good : formatTime(vital.threshold.good)}
              </div>
            </Card>
          ))}
        </div>
      </Card>

      {/* Page Performance */}
      <div className="grid lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <h3 className="text-xl mb-4">Page Performance</h3>
          <div className="space-y-2 max-h-[500px] overflow-y-auto">
            {pageMetrics.map((page) => (
              <Card
                key={page.url}
                className={`p-4 cursor-pointer hover:border-[#625d9c] transition-colors ${
                  selectedPage?.url === page.url ? 'border-[#625d9c] border-2' : ''
                } ${page.loadTime > PERFORMANCE_TARGETS.loadTime ? 'border-l-4 border-l-red-500' : ''}`}
                onClick={() => setSelectedPage(page)}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <h4 className="font-medium text-sm mb-1">{page.pageName}</h4>
                    <p className="text-xs text-gray-600 mb-2">{page.url}</p>
                    <div className="flex items-center gap-2">
                      <Badge className={page.loadTime <= PERFORMANCE_TARGETS.loadTime ? getRatingColor('good') : getRatingColor('poor')}>
                        {formatTime(page.loadTime)}
                      </Badge>
                      <span className="text-xs text-gray-600">{page.views.toLocaleString()} views</span>
                    </div>
                  </div>
                  {page.loadTime > PERFORMANCE_TARGETS.loadTime && (
                    <AlertTriangle className="w-5 h-5 text-red-600" />
                  )}
                  {page.loadTime <= PERFORMANCE_TARGETS.loadTime && (
                    <CheckCircle2 className="w-5 h-5 text-green-600" />
                  )}
                </div>

                <div className="flex gap-4 text-xs text-gray-600">
                  <span>FCP: {formatTime(page.fcp)}</span>
                  <span>LCP: {formatTime(page.lcp)}</span>
                  <span>Bounce: {page.bounceRate.toFixed(1)}%</span>
                </div>
              </Card>
            ))}
          </div>
        </Card>

        {/* Page Details */}
        <Card className="p-6">
          {selectedPage ? (
            <div className="space-y-4">
              <div>
                <h3 className="text-xl mb-1">{selectedPage.pageName}</h3>
                <p className="text-sm text-gray-600">{selectedPage.url}</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Card className="p-3">
                  <div className="text-xs text-gray-600 mb-1">Load Time</div>
                  <div className={`text-2xl font-bold ${
                    selectedPage.loadTime <= PERFORMANCE_TARGETS.loadTime ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {formatTime(selectedPage.loadTime)}
                  </div>
                  <div className="text-xs text-gray-600">Target: {formatTime(PERFORMANCE_TARGETS.loadTime)}</div>
                </Card>

                <Card className="p-3">
                  <div className="text-xs text-gray-600 mb-1">TTFB</div>
                  <div className={`text-2xl font-bold ${
                    selectedPage.ttfb <= PERFORMANCE_TARGETS.ttfb ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {formatTime(selectedPage.ttfb)}
                  </div>
                  <div className="text-xs text-gray-600">Target: {formatTime(PERFORMANCE_TARGETS.ttfb)}</div>
                </Card>

                <Card className="p-3">
                  <div className="text-xs text-gray-600 mb-1">FCP</div>
                  <div className={`text-lg font-bold ${
                    selectedPage.fcp <= PERFORMANCE_TARGETS.fcp ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {formatTime(selectedPage.fcp)}
                  </div>
                </Card>

                <Card className="p-3">
                  <div className="text-xs text-gray-600 mb-1">LCP</div>
                  <div className={`text-lg font-bold ${
                    selectedPage.lcp <= PERFORMANCE_TARGETS.lcp ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {formatTime(selectedPage.lcp)}
                  </div>
                </Card>

                <Card className="p-3">
                  <div className="text-xs text-gray-600 mb-1">FID</div>
                  <div className={`text-lg font-bold ${
                    selectedPage.fid <= PERFORMANCE_TARGETS.fid ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {formatTime(selectedPage.fid)}
                  </div>
                </Card>

                <Card className="p-3">
                  <div className="text-xs text-gray-600 mb-1">CLS</div>
                  <div className={`text-lg font-bold ${
                    selectedPage.cls <= PERFORMANCE_TARGETS.cls ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {selectedPage.cls.toFixed(3)}
                  </div>
                </Card>
              </div>

              <div>
                <h4 className="font-medium mb-3">Device Breakdown</h4>
                <div className="space-y-2">
                  <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                    <div className="flex items-center gap-2">
                      <Monitor className="w-4 h-4 text-gray-600" />
                      <span className="text-sm">Desktop</span>
                    </div>
                    <span className="font-medium">{selectedPage.deviceBreakdown.desktop}%</span>
                  </div>
                  <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                    <div className="flex items-center gap-2">
                      <Smartphone className="w-4 h-4 text-gray-600" />
                      <span className="text-sm">Mobile</span>
                    </div>
                    <span className="font-medium">{selectedPage.deviceBreakdown.mobile}%</span>
                  </div>
                  <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                    <div className="flex items-center gap-2">
                      <Globe className="w-4 h-4 text-gray-600" />
                      <span className="text-sm">Tablet</span>
                    </div>
                    <span className="font-medium">{selectedPage.deviceBreakdown.tablet}%</span>
                  </div>
                </div>
              </div>

              <Card className="p-4 bg-blue-50 border-blue-200">
                <div className="text-sm text-blue-900">
                  <p className="font-medium mb-1">Performance Insights</p>
                  <ul className="space-y-1 text-xs">
                    {selectedPage.loadTime > PERFORMANCE_TARGETS.loadTime && (
                      <li>• Page load time exceeds target by {formatTime(selectedPage.loadTime - PERFORMANCE_TARGETS.loadTime)}</li>
                    )}
                    {selectedPage.lcp > PERFORMANCE_TARGETS.lcp && (
                      <li>• LCP needs improvement - optimize largest content element</li>
                    )}
                    {selectedPage.bounceRate > 50 && (
                      <li>• High bounce rate ({selectedPage.bounceRate.toFixed(1)}%) - review content and UX</li>
                    )}
                    {selectedPage.ttfb > PERFORMANCE_TARGETS.ttfb && (
                      <li>• Slow TTFB - optimize server response time</li>
                    )}
                  </ul>
                </div>
              </Card>
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500">
              <Zap className="w-16 h-16 mx-auto mb-4 text-gray-400" />
              <p>Select a page to view detailed metrics</p>
            </div>
          )}
        </Card>
      </div>

      {/* Resource Timing */}
      <Card className="p-6">
        <h3 className="text-xl mb-4">Resource Loading</h3>
        <div className="space-y-3">
          {resources.map((resource) => (
            <Card key={resource.resourceType} className="p-4">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h4 className="font-medium capitalize mb-1">{resource.resourceType}</h4>
                  <div className="flex items-center gap-3 text-sm text-gray-600">
                    <span>{resource.count} files</span>
                    <span>{formatBytes(resource.totalSize)}</span>
                    <span>Avg: {formatTime(resource.avgLoadTime)}</span>
                  </div>
                </div>
              </div>

              {resource.slowest && (
                <Card className="p-2 bg-gray-50 text-xs">
                  <p className="text-gray-600 mb-1">Slowest resource:</p>
                  <p className="font-mono truncate">{resource.slowest.url}</p>
                  <p className="text-red-600 font-medium mt-1">
                    {formatTime(resource.slowest.duration)}
                  </p>
                </Card>
              )}
            </Card>
          ))}
        </div>
      </Card>

      {/* Performance Trends */}
      <Card className="p-6">
        <h3 className="text-xl mb-4">Performance Trends (Last 7 Days)</h3>
        <div className="space-y-2">
          {trends.map((trend, idx) => (
            <div key={idx} className="flex items-center gap-4 p-3 border rounded">
              <div className="flex-1">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium">
                    {new Date(trend.date).toLocaleDateString()}
                  </span>
                  <Badge variant="outline">
                    Avg: {formatTime(trend.avgLoadTime)}
                  </Badge>
                  <Badge variant="outline">
                    P95: {formatTime(trend.p95LoadTime)}
                  </Badge>
                  <Badge variant="outline" className={trend.errorRate > 1 ? 'text-red-600' : ''}>
                    Errors: {trend.errorRate.toFixed(2)}%
                  </Badge>
                </div>
              </div>
              {idx > 0 && (
                <div>
                  {trend.avgLoadTime < trends[idx - 1].avgLoadTime ? (
                    <TrendingDown className="w-5 h-5 text-green-600" />
                  ) : (
                    <TrendingUp className="w-5 h-5 text-red-600" />
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </Card>

      {/* Optimization Recommendations */}
      <Card className="p-6 bg-blue-50 border-blue-200">
        <h3 className="text-xl mb-4 text-blue-900">Optimization Recommendations</h3>
        <div className="space-y-3 text-sm text-blue-900">
          <div className="flex items-start gap-2">
            <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium">Enable CDN for Static Assets</p>
              <p className="text-blue-800">Reduce load times by serving assets from edge locations</p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium">Implement Code Splitting</p>
              <p className="text-blue-800">Load only necessary JavaScript for each page</p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium">Optimize Images</p>
              <p className="text-blue-800">Use next-gen formats (WebP) and lazy loading</p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium">Enable Server-Side Caching</p>
              <p className="text-blue-800">Cache API responses to reduce database queries</p>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
