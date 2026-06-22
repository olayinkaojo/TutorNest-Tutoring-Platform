import React, { useState, useEffect } from 'react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Badge } from '../ui/badge';
import { 
  AlertTriangle,
  CheckCircle2,
  Clock,
  AlertCircle,
  Activity,
  Send,
  X,
  Loader2,
  TrendingUp,
  Globe,
  Zap
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { projectId, publicAnonKey } from '../../utils/supabase/info';

interface Incident {
  id: string;
  title: string;
  description: string;
  status: 'investigating' | 'identified' | 'monitoring' | 'resolved';
  severity: 'critical' | 'major' | 'minor' | 'maintenance';
  affectedServices: string[];
  startTime: string;
  resolvedTime?: string;
  updates: IncidentUpdate[];
  createdBy: string;
}

interface IncidentUpdate {
  id: string;
  incidentId: string;
  message: string;
  status: string;
  timestamp: string;
  author: string;
}

interface SystemStatus {
  service: string;
  status: 'operational' | 'degraded' | 'partial-outage' | 'major-outage';
  uptime: number; // percentage
  lastChecked: string;
}

interface IncidentCommunicationsProps {
  userId: string;
  accessToken: string;
  isOps?: boolean;
  userName?: string;
}

const SERVICES = [
  { id: 'platform', name: 'Platform', icon: Globe },
  { id: 'video', name: 'Video Sessions', icon: Activity },
  { id: 'messaging', name: 'Messaging', icon: Send },
  { id: 'payments', name: 'Payments', icon: Zap },
  { id: 'api', name: 'API', icon: TrendingUp }
];

export function IncidentCommunications({ 
  userId, 
  accessToken, 
  isOps = false,
  userName = 'User'
}: IncidentCommunicationsProps) {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [systemStatus, setSystemStatus] = useState<SystemStatus[]>([]);
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
  const [loading, setLoading] = useState(true);
  const [showNewIncident, setShowNewIncident] = useState(false);
  const [updateMessage, setUpdateMessage] = useState('');

  // New incident form
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [severity, setSeverity] = useState<'critical' | 'major' | 'minor' | 'maintenance'>('major');
  const [affectedServices, setAffectedServices] = useState<string[]>([]);
  const [incidentStatus, setIncidentStatus] = useState<'investigating' | 'identified' | 'monitoring' | 'resolved'>('investigating');

  useEffect(() => {
    loadData();
    // Poll for updates every 30 seconds
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [incidentsRes, statusRes] = await Promise.all([
        fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-cbd74580/status/incidents`,
          {
            headers: {
              'Authorization': `Bearer ${accessToken || publicAnonKey}`
            }
          }
        ),
        fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-cbd74580/status/system`,
          {
            headers: {
              'Authorization': `Bearer ${accessToken || publicAnonKey}`
            }
          }
        )
      ]);

      if (incidentsRes.ok) {
        const data = await incidentsRes.json();
        setIncidents(data.incidents || []);
      }

      if (statusRes.ok) {
        const data = await statusRes.json();
        setSystemStatus(data.status || []);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const createIncident = async () => {
    if (!title.trim() || !description.trim() || affectedServices.length === 0) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-cbd74580/status/incidents`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            title,
            description,
            severity,
            status: incidentStatus,
            affectedServices,
            createdBy: userId
          })
        }
      );

      if (response.ok) {
        toast.success('Incident created and published');
        setShowNewIncident(false);
        setTitle('');
        setDescription('');
        setAffectedServices([]);
        setSeverity('major');
        setIncidentStatus('investigating');
        loadData();
      } else {
        toast.error('Failed to create incident');
      }
    } catch (error) {
      console.error('Error creating incident:', error);
      toast.error('Failed to create incident');
    }
  };

  const postUpdate = async () => {
    if (!selectedIncident || !updateMessage.trim()) return;

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-cbd74580/status/incidents/${selectedIncident.id}/updates`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            message: updateMessage,
            status: selectedIncident.status,
            author: userName
          })
        }
      );

      if (response.ok) {
        toast.success('Update posted');
        setUpdateMessage('');
        loadData();
        // Reload incident details
        const updatedIncident = incidents.find(i => i.id === selectedIncident.id);
        if (updatedIncident) setSelectedIncident(updatedIncident);
      } else {
        toast.error('Failed to post update');
      }
    } catch (error) {
      console.error('Error posting update:', error);
      toast.error('Failed to post update');
    }
  };

  const updateIncidentStatus = async (incidentId: string, newStatus: string) => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-cbd74580/status/incidents/${incidentId}/status`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ status: newStatus })
        }
      );

      if (response.ok) {
        toast.success('Incident status updated');
        loadData();
      } else {
        toast.error('Failed to update status');
      }
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Failed to update status');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'operational':
        return 'bg-green-100 text-green-800';
      case 'degraded':
        return 'bg-yellow-100 text-yellow-800';
      case 'partial-outage':
        return 'bg-orange-100 text-orange-800';
      case 'major-outage':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-100 text-red-800 border-red-300';
      case 'major':
        return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'minor':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'maintenance':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getIncidentStatusIcon = (status: string) => {
    switch (status) {
      case 'investigating':
        return <AlertCircle className="w-4 h-4" />;
      case 'identified':
        return <AlertTriangle className="w-4 h-4" />;
      case 'monitoring':
        return <Clock className="w-4 h-4" />;
      case 'resolved':
        return <CheckCircle2 className="w-4 h-4" />;
      default:
        return <Activity className="w-4 h-4" />;
    }
  };

  const activeIncidents = incidents.filter(i => i.status !== 'resolved');
  const allOperational = systemStatus.every(s => s.status === 'operational');

  if (loading && incidents.length === 0) {
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
          <h2 className="text-3xl">System Status</h2>
          <p className="text-gray-600 mt-1">
            Real-time platform status and incident updates
          </p>
        </div>
        {isOps && (
          <Button
            onClick={() => setShowNewIncident(true)}
            className="bg-[#5d9827] hover:bg-[#4a7a1f]"
          >
            <AlertTriangle className="w-4 h-4 mr-2" />
            Create Incident
          </Button>
        )}
      </div>

      {/* Overall Status Banner */}
      <Card className={`p-6 ${allOperational ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
        <div className="flex items-center gap-3">
          {allOperational ? (
            <CheckCircle2 className="w-8 h-8 text-green-600" />
          ) : (
            <AlertTriangle className="w-8 h-8 text-red-600" />
          )}
          <div>
            <h3 className="text-xl font-bold">
              {allOperational ? 'All Systems Operational' : 'Service Disruption'}
            </h3>
            <p className={allOperational ? 'text-green-800' : 'text-red-800'}>
              {allOperational
                ? 'Knowledge Fons Academy is running smoothly with no reported issues'
                : `${activeIncidents.length} active incident${activeIncidents.length !== 1 ? 's' : ''} affecting platform services`
              }
            </p>
          </div>
        </div>
      </Card>

      {/* Service Status */}
      <Card className="p-6">
        <h3 className="text-xl mb-4">Service Status</h3>
        <div className="space-y-3">
          {systemStatus.map((service) => {
            const ServiceIcon = SERVICES.find(s => s.id === service.service)?.icon || Globe;
            return (
              <div
                key={service.service}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <ServiceIcon className="w-5 h-5 text-gray-600" />
                  <div>
                    <p className="font-medium capitalize">{service.service}</p>
                    <p className="text-xs text-gray-600">
                      {service.uptime.toFixed(2)}% uptime
                    </p>
                  </div>
                </div>
                <Badge className={getStatusColor(service.status)}>
                  {service.status === 'operational' ? (
                    <CheckCircle2 className="w-3 h-3 mr-1" />
                  ) : (
                    <AlertTriangle className="w-3 h-3 mr-1" />
                  )}
                  {service.status}
                </Badge>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Active Incidents */}
      {activeIncidents.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-xl">Active Incidents</h3>
          {activeIncidents.map((incident) => (
            <Card
              key={incident.id}
              className={`p-6 border-l-4 ${getSeverityColor(incident.severity)}`}
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <h4 className="text-xl font-medium">{incident.title}</h4>
                    <Badge className={getSeverityColor(incident.severity)}>
                      {incident.severity}
                    </Badge>
                    <Badge variant="outline" className="capitalize">
                      <span className="flex items-center gap-1">
                        {getIncidentStatusIcon(incident.status)}
                        {incident.status}
                      </span>
                    </Badge>
                  </div>
                  <p className="text-gray-600 mb-3">{incident.description}</p>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Clock className="w-4 h-4" />
                    <span>
                      Started {new Date(incident.startTime).toLocaleString()}
                    </span>
                  </div>
                </div>
                {isOps && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setSelectedIncident(incident)}
                  >
                    Manage
                  </Button>
                )}
              </div>

              <div className="flex flex-wrap gap-2 mb-4">
                <span className="text-sm text-gray-600">Affected services:</span>
                {incident.affectedServices.map((service, idx) => (
                  <Badge key={idx} variant="outline" className="capitalize">
                    {service}
                  </Badge>
                ))}
              </div>

              {/* Latest Update */}
              {incident.updates.length > 0 && (
                <Card className="p-4 bg-white">
                  <p className="text-sm font-medium mb-1">Latest Update</p>
                  <p className="text-sm text-gray-600 mb-2">
                    {incident.updates[0].message}
                  </p>
                  <p className="text-xs text-gray-500">
                    {new Date(incident.updates[0].timestamp).toLocaleString()} by {incident.updates[0].author}
                  </p>
                </Card>
              )}
            </Card>
          ))}
        </div>
      )}

      {/* Incident History */}
      {incidents.filter(i => i.status === 'resolved').length > 0 && (
        <Card className="p-6">
          <h3 className="text-xl mb-4">Incident History</h3>
          <div className="space-y-2">
            {incidents
              .filter(i => i.status === 'resolved')
              .slice(0, 5)
              .map((incident) => (
                <div
                  key={incident.id}
                  className="p-3 border rounded-lg flex items-center justify-between"
                >
                  <div>
                    <p className="font-medium text-sm">{incident.title}</p>
                    <div className="flex items-center gap-3 text-xs text-gray-600 mt-1">
                      <span>{new Date(incident.startTime).toLocaleDateString()}</span>
                      <Badge className={getSeverityColor(incident.severity)} variant="outline">
                        {incident.severity}
                      </Badge>
                    </div>
                  </div>
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                </div>
              ))}
          </div>
        </Card>
      )}

      {/* Subscribe to Updates */}
      {!isOps && (
        <Card className="p-6 bg-blue-50 border-blue-200">
          <div className="flex items-start gap-3">
            <Send className="w-6 h-6 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h4 className="font-medium text-blue-900 mb-2">Stay Informed</h4>
              <p className="text-sm text-blue-800 mb-3">
                Get notified about system status updates and incidents via email or SMS
              </p>
              <Button size="sm" variant="outline">
                Subscribe to Updates
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Manage Incident Dialog */}
      {selectedIncident && isOps && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="p-6 max-w-2xl w-full m-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl">Manage Incident</h3>
              <Button variant="outline" size="sm" onClick={() => setSelectedIncident(null)}>
                <X className="w-4 h-4" />
              </Button>
            </div>

            <div className="space-y-4">
              <div>
                <h4 className="text-xl mb-2">{selectedIncident.title}</h4>
                <div className="flex gap-2 mb-3">
                  <Badge className={getSeverityColor(selectedIncident.severity)}>
                    {selectedIncident.severity}
                  </Badge>
                  <Badge variant="outline" className="capitalize">
                    {selectedIncident.status}
                  </Badge>
                </div>
                <p className="text-gray-600">{selectedIncident.description}</p>
              </div>

              <div>
                <Label htmlFor="incident-status">Update Status</Label>
                <select
                  id="incident-status"
                  className="w-full p-2 border rounded-lg"
                  value={selectedIncident.status}
                  onChange={(e) => updateIncidentStatus(selectedIncident.id, e.target.value)}
                >
                  <option value="investigating">Investigating</option>
                  <option value="identified">Identified</option>
                  <option value="monitoring">Monitoring</option>
                  <option value="resolved">Resolved</option>
                </select>
              </div>

              <div>
                <Label htmlFor="update-message">Post Update</Label>
                <Textarea
                  id="update-message"
                  placeholder="Provide an update to users..."
                  value={updateMessage}
                  onChange={(e) => setUpdateMessage(e.target.value)}
                  rows={4}
                />
              </div>

              <Button
                onClick={postUpdate}
                disabled={!updateMessage.trim()}
                className="w-full bg-[#5d9827] hover:bg-[#4a7a1f]"
              >
                <Send className="w-4 h-4 mr-2" />
                Post Update
              </Button>

              {/* Update History */}
              <div>
                <h5 className="font-medium mb-3">Update History</h5>
                <div className="space-y-2">
                  {selectedIncident.updates.map((update) => (
                    <Card key={update.id} className="p-3">
                      <p className="text-sm mb-2">{update.message}</p>
                      <p className="text-xs text-gray-600">
                        {new Date(update.timestamp).toLocaleString()} by {update.author}
                      </p>
                    </Card>
                  ))}
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Create Incident Dialog */}
      {showNewIncident && isOps && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="p-6 max-w-2xl w-full m-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl">Create Incident</h3>
              <Button variant="outline" size="sm" onClick={() => setShowNewIncident(false)}>
                <X className="w-4 h-4" />
              </Button>
            </div>

            <div className="space-y-4">
              <div>
                <Label htmlFor="incident-title">Incident Title *</Label>
                <Input
                  id="incident-title"
                  placeholder="Brief description of the incident"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>

              <div>
                <Label htmlFor="incident-description">Description *</Label>
                <Textarea
                  id="incident-description"
                  placeholder="Detailed description of the incident and impact..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                />
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="severity">Severity</Label>
                  <select
                    id="severity"
                    className="w-full p-2 border rounded-lg"
                    value={severity}
                    onChange={(e) => setSeverity(e.target.value as any)}
                  >
                    <option value="critical">Critical</option>
                    <option value="major">Major</option>
                    <option value="minor">Minor</option>
                    <option value="maintenance">Maintenance</option>
                  </select>
                </div>

                <div>
                  <Label htmlFor="status">Status</Label>
                  <select
                    id="status"
                    className="w-full p-2 border rounded-lg"
                    value={incidentStatus}
                    onChange={(e) => setIncidentStatus(e.target.value as any)}
                  >
                    <option value="investigating">Investigating</option>
                    <option value="identified">Identified</option>
                    <option value="monitoring">Monitoring</option>
                    <option value="resolved">Resolved</option>
                  </select>
                </div>
              </div>

              <div>
                <Label>Affected Services *</Label>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  {SERVICES.map((service) => (
                    <label
                      key={service.id}
                      className="flex items-center gap-2 p-2 border rounded cursor-pointer hover:bg-gray-50"
                    >
                      <input
                        type="checkbox"
                        checked={affectedServices.includes(service.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setAffectedServices([...affectedServices, service.id]);
                          } else {
                            setAffectedServices(affectedServices.filter(s => s !== service.id));
                          }
                        }}
                      />
                      <span className="text-sm">{service.name}</span>
                    </label>
                  ))}
                </div>
              </div>

              <Card className="p-4 bg-amber-50 border-amber-200">
                <p className="text-sm text-amber-900">
                  <strong>Note:</strong> This incident will be immediately visible on the public
                  status page and all subscribed users will be notified.
                </p>
              </Card>

              <div className="flex gap-3 pt-4">
                <Button
                  variant="outline"
                  onClick={() => setShowNewIncident(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={createIncident}
                  className="flex-1 bg-[#5d9827] hover:bg-[#4a7a1f]"
                >
                  Create & Publish
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
