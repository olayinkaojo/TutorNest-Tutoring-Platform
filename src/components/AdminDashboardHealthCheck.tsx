import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Badge } from './ui/badge';
import { CheckCircle, XCircle, Loader2, Activity, AlertTriangle } from 'lucide-react';
import { projectId } from '../utils/supabase/info';

interface HealthCheckProps {
  session: any;
}

interface EndpointCheck {
  name: string;
  endpoint: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  status: 'pending' | 'success' | 'error';
  message?: string;
  responseTime?: number;
}

export function AdminDashboardHealthCheck({ session }: HealthCheckProps) {
  const [checking, setChecking] = useState(false);
  const [endpoints, setEndpoints] = useState<EndpointCheck[]>([
    { name: 'Dashboard Stats', endpoint: '/admin/dashboard-stats', method: 'GET', status: 'pending' },
    { name: 'Platform Overview', endpoint: '/admin/platform-overview', method: 'GET', status: 'pending' },
    { name: 'Recent Activity', endpoint: '/admin/recent-activity?limit=5', method: 'GET', status: 'pending' },
    { name: 'System Alerts', endpoint: '/admin/system-alerts', method: 'GET', status: 'pending' },
    { name: 'Users List', endpoint: '/admin/users', method: 'GET', status: 'pending' },
    { name: 'Analytics', endpoint: '/admin/analytics', method: 'GET', status: 'pending' },
    { name: 'Activity Feed', endpoint: '/admin/activity', method: 'GET', status: 'pending' },
    { name: 'Pending Verifications', endpoint: '/admin/verifications/pending', method: 'GET', status: 'pending' },
    { name: 'Child Profiles', endpoint: '/admin/child-profiles', method: 'GET', status: 'pending' },
    { name: 'Parent-Child Summaries', endpoint: '/admin/parent-child-summaries', method: 'GET', status: 'pending' },
    { name: 'Moderation Keywords', endpoint: '/admin/moderation/keywords', method: 'GET', status: 'pending' },
    { name: 'Moderation Flags', endpoint: '/admin/moderation/flags', method: 'GET', status: 'pending' },
    { name: 'Moderation Stats', endpoint: '/admin/moderation/stats', method: 'GET', status: 'pending' },
    { name: 'Policy Config', endpoint: '/admin/policy-config', method: 'GET', status: 'pending' },
  ]);

  const checkEndpoint = async (endpoint: EndpointCheck): Promise<EndpointCheck> => {
    const startTime = Date.now();
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-cbd74580${endpoint.endpoint}`,
        {
          method: endpoint.method,
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const responseTime = Date.now() - startTime;

      if (response.ok) {
        return {
          ...endpoint,
          status: 'success',
          message: `${response.status} OK`,
          responseTime,
        };
      } else {
        const errorText = await response.text();
        return {
          ...endpoint,
          status: 'error',
          message: `${response.status} - ${errorText.substring(0, 50)}`,
          responseTime,
        };
      }
    } catch (error: any) {
      return {
        ...endpoint,
        status: 'error',
        message: error.message,
        responseTime: Date.now() - startTime,
      };
    }
  };

  const runHealthCheck = async () => {
    setChecking(true);
    
    // Check endpoints sequentially to avoid overwhelming the server
    const results: EndpointCheck[] = [];
    for (const endpoint of endpoints) {
      const result = await checkEndpoint(endpoint);
      results.push(result);
      setEndpoints([...results, ...endpoints.slice(results.length)]);
    }
    
    setChecking(false);
  };

  const successCount = endpoints.filter(e => e.status === 'success').length;
  const errorCount = endpoints.filter(e => e.status === 'error').length;
  const pendingCount = endpoints.filter(e => e.status === 'pending').length;
  const avgResponseTime = endpoints
    .filter(e => e.responseTime)
    .reduce((sum, e) => sum + (e.responseTime || 0), 0) / (endpoints.length - pendingCount || 1);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="w-5 h-5 text-purple-600" />
          Admin Dashboard Health Check
        </CardTitle>
        <CardDescription>
          Test all admin dashboard endpoints to ensure they're working correctly
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Summary Stats */}
          <div className="grid grid-cols-4 gap-4 p-4 bg-gray-50 rounded-lg">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{successCount}</div>
              <div className="text-xs text-gray-600">Passing</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">{errorCount}</div>
              <div className="text-xs text-gray-600">Failing</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-600">{pendingCount}</div>
              <div className="text-xs text-gray-600">Pending</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{avgResponseTime.toFixed(0)}ms</div>
              <div className="text-xs text-gray-600">Avg Response</div>
            </div>
          </div>

          {/* Test Button */}
          <Button 
            onClick={runHealthCheck} 
            disabled={checking}
            className="w-full"
            style={{ backgroundColor: '#625d9c' }}
          >
            {checking ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Running Health Check...
              </>
            ) : (
              'Run Health Check'
            )}
          </Button>

          {/* Endpoint Results */}
          {(successCount > 0 || errorCount > 0) && (
            <div className="space-y-2">
              {endpoints.map((endpoint, index) => (
                <div
                  key={index}
                  className={`flex items-center justify-between p-3 rounded-lg border ${
                    endpoint.status === 'success'
                      ? 'bg-green-50 border-green-200'
                      : endpoint.status === 'error'
                      ? 'bg-red-50 border-red-200'
                      : 'bg-gray-50 border-gray-200'
                  }`}
                >
                  <div className="flex items-center gap-3 flex-1">
                    {endpoint.status === 'success' ? (
                      <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                    ) : endpoint.status === 'error' ? (
                      <XCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
                    ) : (
                      <Loader2 className="w-5 h-5 text-gray-400 animate-spin flex-shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm">{endpoint.name}</div>
                      <div className="text-xs text-gray-600 truncate">
                        {endpoint.method} {endpoint.endpoint}
                      </div>
                      {endpoint.message && (
                        <div className="text-xs text-gray-500 mt-1">{endpoint.message}</div>
                      )}
                    </div>
                  </div>
                  {endpoint.responseTime && (
                    <Badge variant="outline" className="text-xs">
                      {endpoint.responseTime}ms
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Overall Status */}
          {!checking && (successCount > 0 || errorCount > 0) && (
            <div className={`p-4 rounded-lg ${errorCount === 0 ? 'bg-green-50 border-green-200' : 'bg-yellow-50 border-yellow-200'} border`}>
              <div className="flex items-start gap-3">
                {errorCount === 0 ? (
                  <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                ) : (
                  <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                )}
                <div>
                  <div className={`font-medium ${errorCount === 0 ? 'text-green-800' : 'text-yellow-800'}`}>
                    {errorCount === 0 ? 'All Systems Operational' : `${errorCount} Endpoint(s) Need Attention`}
                  </div>
                  <div className={`text-sm ${errorCount === 0 ? 'text-green-700' : 'text-yellow-700'}`}>
                    {errorCount === 0
                      ? 'All admin dashboard endpoints are responding correctly.'
                      : 'Some endpoints are experiencing issues. Check the details above.'}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
