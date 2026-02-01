import React, { useState, useEffect } from 'react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { 
  Video,
  AlertTriangle,
  CheckCircle2,
  Wifi,
  WifiOff,
  Monitor,
  Mic,
  Camera,
  Signal,
  Clock,
  Download,
  Search,
  Filter,
  Loader2,
  TrendingDown,
  TrendingUp,
  Activity
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { projectId, publicAnonKey } from '../../utils/supabase/info';

interface SessionLog {
  id: string;
  sessionId: string;
  studentName: string;
  tutorName: string;
  startTime: string;
  endTime?: string;
  duration: number;
  status: 'completed' | 'failed' | 'disconnected' | 'poor-quality';
  qualityMetrics: QualityMetrics;
  technicalIssues: TechnicalIssue[];
  diagnostics: SessionDiagnostics;
  userReports: UserReport[];
}

interface QualityMetrics {
  videoQuality: 'excellent' | 'good' | 'fair' | 'poor';
  audioQuality: 'excellent' | 'good' | 'fair' | 'poor';
  connectionStability: number; // 0-100
  latency: number; // ms
  packetLoss: number; // percentage
  jitter: number; // ms
  bandwidth: number; // kbps
  frameRate: number; // fps
}

interface TechnicalIssue {
  timestamp: string;
  type: 'video' | 'audio' | 'network' | 'device';
  severity: 'critical' | 'warning' | 'info';
  description: string;
  resolved: boolean;
}

interface SessionDiagnostics {
  studentDevice: DeviceInfo;
  tutorDevice: DeviceInfo;
  networkConditions: NetworkConditions;
  errors: ErrorLog[];
}

interface DeviceInfo {
  browser: string;
  os: string;
  deviceType: string;
  cameraEnabled: boolean;
  micEnabled: boolean;
  screenShareEnabled: boolean;
}

interface NetworkConditions {
  studentConnection: ConnectionInfo;
  tutorConnection: ConnectionInfo;
}

interface ConnectionInfo {
  type: string; // wifi, ethernet, cellular
  speed: number; // mbps
  stability: number; // 0-100
}

interface ErrorLog {
  timestamp: string;
  code: string;
  message: string;
  stack?: string;
}

interface UserReport {
  userId: string;
  userName: string;
  userType: 'student' | 'tutor';
  reportedAt: string;
  issueType: string;
  description: string;
}

interface SessionQualityLogsProps {
  supportId: string;
  accessToken: string;
}

export function SessionQualityLogs({ supportId, accessToken }: SessionQualityLogsProps) {
  const [logs, setLogs] = useState<SessionLog[]>([]);
  const [selectedLog, setSelectedLog] = useState<SessionLog | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showDiagnostics, setShowDiagnostics] = useState(false);

  useEffect(() => {
    loadSessionLogs();
  }, []);

  const loadSessionLogs = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-cbd74580/support/session-logs`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`
          }
        }
      );

      if (response.ok) {
        const data = await response.json();
        setLogs(data.logs || []);
      }
    } catch (error) {
      console.error('Error loading session logs:', error);
      toast.error('Failed to load session logs');
    } finally {
      setLoading(false);
    }
  };

  const exportLog = async (logId: string) => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-cbd74580/support/session-logs/${logId}/export`,
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
        a.download = `session-log-${logId}.json`;
        a.click();
        window.URL.revokeObjectURL(url);
        toast.success('Log exported');
      } else {
        toast.error('Failed to export log');
      }
    } catch (error) {
      console.error('Error exporting log:', error);
      toast.error('Failed to export log');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      case 'disconnected':
        return 'bg-yellow-100 text-yellow-800';
      case 'poor-quality':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getQualityColor = (quality: string) => {
    switch (quality) {
      case 'excellent':
        return 'text-green-600';
      case 'good':
        return 'text-blue-600';
      case 'fair':
        return 'text-yellow-600';
      case 'poor':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical':
        return <AlertTriangle className="w-4 h-4 text-red-600" />;
      case 'warning':
        return <AlertTriangle className="w-4 h-4 text-yellow-600" />;
      case 'info':
        return <Activity className="w-4 h-4 text-blue-600" />;
      default:
        return <Activity className="w-4 h-4 text-gray-600" />;
    }
  };

  const filteredLogs = logs.filter(log => {
    const matchesSearch = 
      log.studentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.tutorName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.sessionId.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || log.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const criticalIssues = logs.filter(l => l.status === 'failed' || l.status === 'poor-quality').length;
  const avgConnectionStability = logs.length > 0
    ? logs.reduce((sum, l) => sum + l.qualityMetrics.connectionStability, 0) / logs.length
    : 0;

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
          <h2 className="text-3xl">Session Quality Logs</h2>
          <p className="text-gray-600 mt-1">
            Diagnostics and troubleshooting for video sessions
          </p>
        </div>
        <Button variant="outline" onClick={loadSessionLogs}>
          <Activity className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Stats */}
      <div className="grid md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="text-2xl font-bold text-[#625d9c]">
            {logs.length}
          </div>
          <div className="text-sm text-gray-600">Total Sessions</div>
        </Card>
        <Card className="p-4">
          <div className="text-2xl font-bold text-red-600">
            {criticalIssues}
          </div>
          <div className="text-sm text-gray-600">Critical Issues</div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2">
            <div className="text-2xl font-bold text-green-600">
              {avgConnectionStability.toFixed(0)}%
            </div>
            {avgConnectionStability > 80 ? (
              <TrendingUp className="w-5 h-5 text-green-600" />
            ) : (
              <TrendingDown className="w-5 h-5 text-red-600" />
            )}
          </div>
          <div className="text-sm text-gray-600">Avg Stability</div>
        </Card>
        <Card className="p-4">
          <div className="text-2xl font-bold text-blue-600">
            {logs.filter(l => l.userReports.length > 0).length}
          </div>
          <div className="text-sm text-gray-600">User Reports</div>
        </Card>
      </div>

      {/* Search and Filters */}
      <Card className="p-4">
        <div className="flex gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search by session ID, student, or tutor..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <select
            className="p-2 border rounded-lg"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">All Statuses</option>
            <option value="completed">Completed</option>
            <option value="failed">Failed</option>
            <option value="disconnected">Disconnected</option>
            <option value="poor-quality">Poor Quality</option>
          </select>
        </div>
      </Card>

      {/* Logs List and Detail */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Logs List */}
        <Card className="p-6">
          <h3 className="text-xl mb-4">Session Logs ({filteredLogs.length})</h3>
          <div className="space-y-2 max-h-[600px] overflow-y-auto">
            {filteredLogs.map((log) => (
              <Card
                key={log.id}
                className={`p-4 cursor-pointer hover:border-[#625d9c] transition-colors ${
                  selectedLog?.id === log.id ? 'border-[#625d9c] border-2' : ''
                } ${log.status === 'failed' ? 'border-l-4 border-l-red-500' : ''}`}
                onClick={() => setSelectedLog(log)}
              >
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <Video className="w-4 h-4 text-gray-600" />
                      <span className="font-medium text-sm">
                        {log.studentName} ↔ {log.tutorName}
                      </span>
                    </div>
                    <p className="text-xs text-gray-600 font-mono">
                      {log.sessionId.slice(0, 16)}...
                    </p>
                  </div>
                  <Badge className={getStatusColor(log.status)}>
                    {log.status}
                  </Badge>
                </div>

                <div className="flex items-center gap-3 text-xs text-gray-600 mb-2">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {log.duration}min
                  </span>
                  <span className="flex items-center gap-1">
                    <Signal className="w-3 h-3" />
                    {log.qualityMetrics.connectionStability}%
                  </span>
                  <span>{log.qualityMetrics.latency}ms</span>
                </div>

                {log.technicalIssues.length > 0 && (
                  <div className="flex items-center gap-1 text-xs text-red-600">
                    <AlertTriangle className="w-3 h-3" />
                    {log.technicalIssues.length} issue{log.technicalIssues.length !== 1 ? 's' : ''}
                  </div>
                )}

                {log.userReports.length > 0 && (
                  <div className="flex items-center gap-1 text-xs text-orange-600 mt-1">
                    <AlertTriangle className="w-3 h-3" />
                    {log.userReports.length} user report{log.userReports.length !== 1 ? 's' : ''}
                  </div>
                )}
              </Card>
            ))}

            {filteredLogs.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <Video className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                <p>No session logs found</p>
              </div>
            )}
          </div>
        </Card>

        {/* Log Detail */}
        <Card className="p-6">
          {selectedLog ? (
            <div className="space-y-6">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-xl mb-1">Session Details</h3>
                  <p className="text-sm text-gray-600 font-mono">
                    {selectedLog.sessionId}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => exportLog(selectedLog.id)}
                  >
                    <Download className="w-4 h-4" />
                  </Button>
                  <Badge className={getStatusColor(selectedLog.status)}>
                    {selectedLog.status}
                  </Badge>
                </div>
              </div>

              {/* Participants */}
              <div>
                <h4 className="font-medium mb-2">Participants</h4>
                <div className="grid grid-cols-2 gap-3">
                  <Card className="p-3">
                    <p className="text-xs text-gray-600 mb-1">Student</p>
                    <p className="font-medium text-sm">{selectedLog.studentName}</p>
                  </Card>
                  <Card className="p-3">
                    <p className="text-xs text-gray-600 mb-1">Tutor</p>
                    <p className="font-medium text-sm">{selectedLog.tutorName}</p>
                  </Card>
                </div>
              </div>

              {/* Quality Metrics */}
              <div>
                <h4 className="font-medium mb-3">Quality Metrics</h4>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Video className="w-4 h-4 text-gray-600" />
                      <span className="text-sm">Video Quality</span>
                    </div>
                    <span className={`text-sm font-medium ${getQualityColor(selectedLog.qualityMetrics.videoQuality)}`}>
                      {selectedLog.qualityMetrics.videoQuality}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Mic className="w-4 h-4 text-gray-600" />
                      <span className="text-sm">Audio Quality</span>
                    </div>
                    <span className={`text-sm font-medium ${getQualityColor(selectedLog.qualityMetrics.audioQuality)}`}>
                      {selectedLog.qualityMetrics.audioQuality}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Wifi className="w-4 h-4 text-gray-600" />
                      <span className="text-sm">Connection Stability</span>
                    </div>
                    <span className="text-sm font-medium">
                      {selectedLog.qualityMetrics.connectionStability}%
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-3 text-center">
                    <Card className="p-2">
                      <div className="text-lg font-bold text-[#625d9c]">
                        {selectedLog.qualityMetrics.latency}ms
                      </div>
                      <div className="text-xs text-gray-600">Latency</div>
                    </Card>
                    <Card className="p-2">
                      <div className="text-lg font-bold text-[#625d9c]">
                        {selectedLog.qualityMetrics.packetLoss.toFixed(1)}%
                      </div>
                      <div className="text-xs text-gray-600">Packet Loss</div>
                    </Card>
                    <Card className="p-2">
                      <div className="text-lg font-bold text-[#625d9c]">
                        {selectedLog.qualityMetrics.frameRate}fps
                      </div>
                      <div className="text-xs text-gray-600">Frame Rate</div>
                    </Card>
                  </div>
                </div>
              </div>

              {/* Technical Issues */}
              {selectedLog.technicalIssues.length > 0 && (
                <div>
                  <h4 className="font-medium mb-3">Technical Issues</h4>
                  <div className="space-y-2">
                    {selectedLog.technicalIssues.map((issue, idx) => (
                      <Card key={idx} className="p-3">
                        <div className="flex items-start gap-2">
                          {getSeverityIcon(issue.severity)}
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-sm font-medium capitalize">{issue.type}</span>
                              <Badge variant="outline" className="text-xs capitalize">
                                {issue.severity}
                              </Badge>
                              {issue.resolved && (
                                <CheckCircle2 className="w-3 h-3 text-green-600" />
                              )}
                            </div>
                            <p className="text-xs text-gray-600">{issue.description}</p>
                            <p className="text-xs text-gray-500 mt-1">
                              {new Date(issue.timestamp).toLocaleTimeString()}
                            </p>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              {/* User Reports */}
              {selectedLog.userReports.length > 0 && (
                <div>
                  <h4 className="font-medium mb-3">User Reports</h4>
                  <div className="space-y-2">
                    {selectedLog.userReports.map((report, idx) => (
                      <Card key={idx} className="p-3 bg-orange-50">
                        <div className="flex items-start justify-between mb-2">
                          <span className="text-sm font-medium">{report.userName}</span>
                          <Badge variant="outline" className="text-xs capitalize">
                            {report.userType}
                          </Badge>
                        </div>
                        <p className="text-sm mb-1"><strong>{report.issueType}</strong></p>
                        <p className="text-xs text-gray-600">{report.description}</p>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              {/* Device Diagnostics */}
              <div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowDiagnostics(!showDiagnostics)}
                  className="w-full"
                >
                  {showDiagnostics ? 'Hide' : 'Show'} Full Diagnostics
                </Button>

                {showDiagnostics && (
                  <Card className="p-4 mt-3 bg-gray-50">
                    <h5 className="font-medium mb-3 text-sm">Device Information</h5>
                    
                    <div className="space-y-3 text-xs">
                      <div>
                        <p className="text-gray-600 mb-1">Student Device</p>
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant="outline">{selectedLog.diagnostics.studentDevice.browser}</Badge>
                          <Badge variant="outline">{selectedLog.diagnostics.studentDevice.os}</Badge>
                          <Badge variant="outline">{selectedLog.diagnostics.studentDevice.deviceType}</Badge>
                          {selectedLog.diagnostics.studentDevice.cameraEnabled && (
                            <Camera className="w-4 h-4 text-green-600" />
                          )}
                          {selectedLog.diagnostics.studentDevice.micEnabled && (
                            <Mic className="w-4 h-4 text-green-600" />
                          )}
                        </div>
                      </div>

                      <div>
                        <p className="text-gray-600 mb-1">Tutor Device</p>
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant="outline">{selectedLog.diagnostics.tutorDevice.browser}</Badge>
                          <Badge variant="outline">{selectedLog.diagnostics.tutorDevice.os}</Badge>
                          <Badge variant="outline">{selectedLog.diagnostics.tutorDevice.deviceType}</Badge>
                          {selectedLog.diagnostics.tutorDevice.cameraEnabled && (
                            <Camera className="w-4 h-4 text-green-600" />
                          )}
                          {selectedLog.diagnostics.tutorDevice.micEnabled && (
                            <Mic className="w-4 h-4 text-green-600" />
                          )}
                        </div>
                      </div>

                      {selectedLog.diagnostics.errors.length > 0 && (
                        <div>
                          <p className="text-gray-600 mb-2">Error Logs</p>
                          <div className="space-y-1">
                            {selectedLog.diagnostics.errors.slice(0, 3).map((error, idx) => (
                              <div key={idx} className="p-2 bg-red-50 rounded text-xs">
                                <p className="font-mono text-red-800">[{error.code}] {error.message}</p>
                                <p className="text-gray-600 mt-1">
                                  {new Date(error.timestamp).toLocaleTimeString()}
                                </p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </Card>
                )}
              </div>
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500">
              <Video className="w-16 h-16 mx-auto mb-4 text-gray-400" />
              <p>Select a session log to view diagnostics</p>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
