import { useState, useEffect } from 'react';
import { projectId } from '../utils/supabase/info';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Badge } from './ui/badge';
import { Alert, AlertDescription } from './ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { 
  AlertTriangle,
  DollarSign,
  Shield,
  CheckCircle,
  Clock,
  XCircle,
  PlayCircle,
  FileText,
  Bell
} from 'lucide-react';

interface SystemAlertsPanelProps {
  session: any;
}

interface SystemAlert {
  id: string;
  type: 'payment_failure' | 'compliance_expiry' | 'dbs_expiry' | 'report_overdue' | 'abuse_report' | 'high_risk';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  relatedUserId?: string;
  relatedUserName?: string;
  relatedEntityId?: string;
  status: 'new' | 'in_progress' | 'resolved';
  assignedTo?: string;
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string;
  auditTrail: AuditEntry[];
}

interface AuditEntry {
  id: string;
  action: string;
  performedBy: string;
  performedByName: string;
  timestamp: string;
  notes?: string;
}

interface DailyDigest {
  date: string;
  totalAlerts: number;
  newAlerts: number;
  resolvedAlerts: number;
  criticalAlerts: number;
  paymentFailures: number;
  complianceExpiries: number;
  abuseReports: number;
}

export function SystemAlertsPanel({ session }: SystemAlertsPanelProps) {
  const [alerts, setAlerts] = useState<SystemAlert[]>([]);
  const [dailyDigest, setDailyDigest] = useState<DailyDigest | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('active');
  const [selectedAlert, setSelectedAlert] = useState<SystemAlert | null>(null);
  const [actionNotes, setActionNotes] = useState('');

  useEffect(() => {
    fetchAlerts();
    fetchDailyDigest();
    
    // Poll for new alerts every 30 seconds
    const interval = setInterval(fetchAlerts, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchAlerts = async () => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-cbd74580/admin/system-alerts`,
        {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setAlerts(data.alerts || []);
      }
    } catch (err: any) {
      console.error('Error fetching alerts:', err);
      setError('Failed to load alerts');
    } finally {
      setLoading(false);
    }
  };

  const fetchDailyDigest = async () => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-cbd74580/admin/daily-digest`,
        {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setDailyDigest(data.digest);
      }
    } catch (err: any) {
      console.error('Error fetching daily digest:', err);
    }
  };

  const updateAlertStatus = async (alertId: string, newStatus: 'new' | 'in_progress' | 'resolved') => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-cbd74580/admin/system-alerts/${alertId}/status`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            status: newStatus,
            notes: actionNotes,
          }),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to update alert status');
      }

      setActionNotes('');
      fetchAlerts();
      setSelectedAlert(null);
    } catch (err: any) {
      console.error('Error updating alert:', err);
      setError(err.message);
    }
  };

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'payment_failure':
        return DollarSign;
      case 'compliance_expiry':
      case 'dbs_expiry':
        return Shield;
      case 'report_overdue':
        return FileText;
      case 'abuse_report':
        return AlertTriangle;
      default:
        return Bell;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-100 text-red-800 border-red-500';
      case 'high':
        return 'bg-orange-100 text-orange-800 border-orange-500';
      case 'medium':
        return 'bg-amber-100 text-amber-800 border-amber-500';
      default:
        return 'bg-blue-100 text-blue-800 border-blue-500';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'new':
        return <Badge className="bg-red-500 text-white">New</Badge>;
      case 'in_progress':
        return <Badge className="bg-amber-500 text-white">In Progress</Badge>;
      case 'resolved':
        return <Badge className="bg-green-500 text-white">Resolved</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const filteredAlerts = alerts.filter(alert => {
    if (activeTab === 'active') return alert.status !== 'resolved';
    if (activeTab === 'new') return alert.status === 'new';
    if (activeTab === 'in_progress') return alert.status === 'in_progress';
    if (activeTab === 'resolved') return alert.status === 'resolved';
    if (activeTab === 'critical') return alert.severity === 'critical' && alert.status !== 'resolved';
    return true;
  });

  if (loading) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <AlertTriangle className="w-8 h-8 animate-pulse mx-auto mb-4" style={{ color: '#625d9c' }} />
          <p className="text-gray-600">Loading system alerts...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Daily Digest */}
      {dailyDigest && (
        <Card>
          <CardHeader>
            <CardTitle>Daily Digest - {new Date(dailyDigest.date).toLocaleDateString()}</CardTitle>
            <CardDescription>Overview of system alerts and events</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-4 gap-4">
              <div className="p-4 bg-blue-50 rounded-lg">
                <p className="text-sm text-gray-600">Total Alerts</p>
                <h2 className="mt-1">{dailyDigest.totalAlerts}</h2>
              </div>
              <div className="p-4 bg-red-50 rounded-lg">
                <p className="text-sm text-gray-600">Critical Alerts</p>
                <h2 className="mt-1">{dailyDigest.criticalAlerts}</h2>
              </div>
              <div className="p-4 bg-amber-50 rounded-lg">
                <p className="text-sm text-gray-600">New Today</p>
                <h2 className="mt-1">{dailyDigest.newAlerts}</h2>
              </div>
              <div className="p-4 bg-green-50 rounded-lg">
                <p className="text-sm text-gray-600">Resolved Today</p>
                <h2 className="mt-1">{dailyDigest.resolvedAlerts}</h2>
              </div>
            </div>

            <div className="grid md:grid-cols-3 gap-4 mt-4">
              <div className="p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <DollarSign className="w-4 h-4" />
                  Payment Failures
                </div>
                <p className="text-lg font-semibold mt-1">{dailyDigest.paymentFailures}</p>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Shield className="w-4 h-4" />
                  Compliance Issues
                </div>
                <p className="text-lg font-semibold mt-1">{dailyDigest.complianceExpiries}</p>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <AlertTriangle className="w-4 h-4" />
                  Abuse Reports
                </div>
                <p className="text-lg font-semibold mt-1">{dailyDigest.abuseReports}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {error && (
        <Alert className="bg-red-50 border-red-200">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">{error}</AlertDescription>
        </Alert>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="active">
            Active
            {alerts.filter(a => a.status !== 'resolved').length > 0 && (
              <Badge className="ml-2 bg-red-500 text-white">
                {alerts.filter(a => a.status !== 'resolved').length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="new">New</TabsTrigger>
          <TabsTrigger value="in_progress">In Progress</TabsTrigger>
          <TabsTrigger value="resolved">Resolved</TabsTrigger>
          <TabsTrigger value="critical">Critical</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-6">
          <div className="space-y-4">
            {filteredAlerts.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center text-gray-500">
                  <CheckCircle className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p>No alerts in this category</p>
                </CardContent>
              </Card>
            ) : (
              filteredAlerts.map((alert) => {
                const Icon = getAlertIcon(alert.type);
                const severityClass = getSeverityColor(alert.severity);

                return (
                  <Card key={alert.id} className={`border-l-4 ${severityClass}`}>
                    <CardContent className="py-4">
                      <div className="flex items-start gap-3">
                        <div className={`w-10 h-10 rounded-full ${severityClass} flex items-center justify-center flex-shrink-0`}>
                          <Icon className="w-5 h-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <div>
                              <h4 className="text-sm font-semibold">{alert.title}</h4>
                              {alert.relatedUserName && (
                                <p className="text-xs text-gray-500 mt-1">
                                  Related to: {alert.relatedUserName}
                                </p>
                              )}
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              {getStatusBadge(alert.status)}
                              <Badge variant="outline" className="capitalize">
                                {alert.severity}
                              </Badge>
                            </div>
                          </div>
                          
                          <p className="text-sm text-gray-700 mb-3">{alert.description}</p>
                          
                          <div className="flex items-center gap-2 text-xs text-gray-500 mb-3">
                            <Clock className="w-3 h-3" />
                            Created: {new Date(alert.createdAt).toLocaleString()}
                          </div>

                          {alert.status !== 'resolved' && (
                            <div className="flex gap-2">
                              {alert.status === 'new' && (
                                <Button
                                  size="sm"
                                  onClick={() => setSelectedAlert(alert)}
                                  className="text-white"
                                  style={{ backgroundColor: '#625d9c' }}
                                >
                                  <PlayCircle className="w-4 h-4 mr-2" />
                                  Start Working
                                </Button>
                              )}
                              {alert.status === 'in_progress' && (
                                <Button
                                  size="sm"
                                  onClick={() => setSelectedAlert(alert)}
                                  className="text-white"
                                  style={{ backgroundColor: '#5d9827' }}
                                >
                                  <CheckCircle className="w-4 h-4 mr-2" />
                                  Mark Resolved
                                </Button>
                              )}
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setSelectedAlert(alert)}
                              >
                                View Details
                              </Button>
                            </div>
                          )}

                          {alert.status === 'resolved' && alert.resolvedAt && (
                            <div className="flex items-center gap-2 text-xs text-green-700 bg-green-50 p-2 rounded">
                              <CheckCircle className="w-3 h-3" />
                              Resolved on {new Date(alert.resolvedAt).toLocaleString()}
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Alert Details Modal */}
      {selectedAlert && (
        <Card className="fixed inset-0 z-50 m-4 max-w-2xl mx-auto my-auto h-fit bg-white shadow-2xl">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle>{selectedAlert.title}</CardTitle>
                <CardDescription>Alert ID: {selectedAlert.id}</CardDescription>
              </div>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setSelectedAlert(null)}
              >
                <XCircle className="w-5 h-5" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="text-sm font-medium mb-2">Description</h4>
              <p className="text-sm text-gray-700">{selectedAlert.description}</p>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-500">Type</p>
                <p className="text-sm font-medium capitalize">{selectedAlert.type.replace('_', ' ')}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Severity</p>
                <Badge variant="outline" className="capitalize">{selectedAlert.severity}</Badge>
              </div>
              <div>
                <p className="text-xs text-gray-500">Status</p>
                {getStatusBadge(selectedAlert.status)}
              </div>
              <div>
                <p className="text-xs text-gray-500">Created</p>
                <p className="text-sm">{new Date(selectedAlert.createdAt).toLocaleString()}</p>
              </div>
            </div>

            {selectedAlert.relatedUserName && (
              <div>
                <p className="text-xs text-gray-500">Related User</p>
                <p className="text-sm font-medium">{selectedAlert.relatedUserName}</p>
              </div>
            )}

            {/* Audit Trail */}
            <div>
              <h4 className="text-sm font-medium mb-2">Audit Trail</h4>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {selectedAlert.auditTrail.length === 0 ? (
                  <p className="text-sm text-gray-500">No actions taken yet</p>
                ) : (
                  selectedAlert.auditTrail.map((entry) => (
                    <div key={entry.id} className="p-2 bg-gray-50 rounded text-xs">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium">{entry.action}</span>
                        <span className="text-gray-500">{new Date(entry.timestamp).toLocaleString()}</span>
                      </div>
                      <p className="text-gray-600">By: {entry.performedByName}</p>
                      {entry.notes && <p className="mt-1 text-gray-700">{entry.notes}</p>}
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Action Section */}
            {selectedAlert.status !== 'resolved' && (
              <div className="border-t pt-4">
                <h4 className="text-sm font-medium mb-2">Take Action</h4>
                <textarea
                  value={actionNotes}
                  onChange={(e) => setActionNotes(e.target.value)}
                  placeholder="Add notes about your action..."
                  className="w-full p-2 border rounded-lg resize-none mb-3"
                  rows={3}
                />
                <div className="flex gap-2">
                  {selectedAlert.status === 'new' && (
                    <Button
                      onClick={() => updateAlertStatus(selectedAlert.id, 'in_progress')}
                      className="text-white"
                      style={{ backgroundColor: '#625d9c' }}
                    >
                      Start Working
                    </Button>
                  )}
                  {selectedAlert.status === 'in_progress' && (
                    <Button
                      onClick={() => updateAlertStatus(selectedAlert.id, 'resolved')}
                      className="text-white"
                      style={{ backgroundColor: '#5d9827' }}
                    >
                      Mark as Resolved
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    onClick={() => setSelectedAlert(null)}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}