import React, { useState, useEffect } from 'react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Badge } from '../ui/badge';
import { 
  Database,
  Download,
  Upload,
  Shield,
  CheckCircle2,
  XCircle,
  Clock,
  HardDrive,
  Lock,
  AlertTriangle,
  Play,
  Loader2,
  Calendar,
  Activity,
  FileCheck,
  RefreshCw
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { projectId, publicAnonKey } from '../../utils/supabase/info';

interface Backup {
  id: string;
  timestamp: string;
  type: 'full' | 'incremental' | 'differential';
  status: 'completed' | 'failed' | 'in-progress' | 'restoring';
  size: number; // bytes
  encrypted: boolean;
  encryptionAlgorithm?: string;
  location: string;
  retentionUntil: string;
  checksumVerified: boolean;
  restoreTested: boolean;
  lastRestoreTest?: string;
  restoreTestStatus?: 'passed' | 'failed';
  databases: string[];
  duration: number; // seconds
}

interface RestoreTest {
  id: string;
  backupId: string;
  startTime: string;
  endTime?: string;
  status: 'running' | 'passed' | 'failed';
  verificationSteps: VerificationStep[];
  errors?: string[];
}

interface VerificationStep {
  name: string;
  status: 'pending' | 'running' | 'passed' | 'failed';
  message?: string;
}

interface BackupSchedule {
  id: string;
  name: string;
  type: 'full' | 'incremental' | 'differential';
  frequency: 'hourly' | 'daily' | 'weekly' | 'monthly';
  time: string; // HH:mm
  dayOfWeek?: number; // 0-6
  dayOfMonth?: number; // 1-31
  enabled: boolean;
  retentionDays: number;
  databases: string[];
  lastRun?: string;
  nextRun?: string;
}

interface BackupManagementProps {
  opsId: string;
  accessToken: string;
}

const DATABASES = ['users', 'sessions', 'payments', 'messages', 'reviews'];

export function BackupManagement({ opsId, accessToken }: BackupManagementProps) {
  const [backups, setBackups] = useState<Backup[]>([]);
  const [schedules, setSchedules] = useState<BackupSchedule[]>([]);
  const [selectedBackup, setSelectedBackup] = useState<Backup | null>(null);
  const [restoreTests, setRestoreTests] = useState<RestoreTest[]>([]);
  const [loading, setLoading] = useState(true);
  const [runningBackup, setRunningBackup] = useState(false);
  const [runningRestore, setRunningRestore] = useState(false);

  useEffect(() => {
    loadBackupData();
  }, []);

  const loadBackupData = async () => {
    setLoading(true);
    try {
      const [backupsRes, schedulesRes, testsRes] = await Promise.all([
        fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-cbd74580/admin/backups`,
          { headers: { 'Authorization': `Bearer ${accessToken}` } }
        ),
        fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-cbd74580/admin/backups/schedules`,
          { headers: { 'Authorization': `Bearer ${accessToken}` } }
        ),
        fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-cbd74580/admin/backups/restore-tests`,
          { headers: { 'Authorization': `Bearer ${accessToken}` } }
        )
      ]);

      if (backupsRes.ok) {
        const data = await backupsRes.json();
        setBackups(data.backups || []);
      }

      if (schedulesRes.ok) {
        const data = await schedulesRes.json();
        setSchedules(data.schedules || []);
      }

      if (testsRes.ok) {
        const data = await testsRes.json();
        setRestoreTests(data.tests || []);
      }
    } catch (error) {
      console.error('Error loading backup data:', error);
      toast.error('Failed to load backup data');
    } finally {
      setLoading(false);
    }
  };

  const triggerBackup = async (type: 'full' | 'incremental' | 'differential') => {
    setRunningBackup(true);
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-cbd74580/admin/backups/trigger`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            type,
            databases: DATABASES,
            initiatedBy: opsId
          })
        }
      );

      if (response.ok) {
        toast.success(`${type} backup started`);
        setTimeout(loadBackupData, 2000);
      } else {
        toast.error('Failed to start backup');
      }
    } catch (error) {
      console.error('Error triggering backup:', error);
      toast.error('Failed to start backup');
    } finally {
      setRunningBackup(false);
    }
  };

  const runRestoreTest = async (backupId: string) => {
    setRunningRestore(true);
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-cbd74580/admin/backups/${backupId}/restore-test`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ initiatedBy: opsId })
        }
      );

      if (response.ok) {
        toast.success('Restore test started');
        setTimeout(loadBackupData, 2000);
      } else {
        toast.error('Failed to start restore test');
      }
    } catch (error) {
      console.error('Error running restore test:', error);
      toast.error('Failed to start restore test');
    } finally {
      setRunningRestore(false);
    }
  };

  const downloadBackup = async (backupId: string) => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-cbd74580/admin/backups/${backupId}/download`,
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
        a.download = `backup-${backupId}.enc`;
        a.click();
        window.URL.revokeObjectURL(url);
        toast.success('Backup downloaded');
      } else {
        toast.error('Failed to download backup');
      }
    } catch (error) {
      console.error('Error downloading backup:', error);
      toast.error('Failed to download backup');
    }
  };

  const toggleSchedule = async (scheduleId: string, enabled: boolean) => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-cbd74580/admin/backups/schedules/${scheduleId}`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ enabled })
        }
      );

      if (response.ok) {
        toast.success(`Schedule ${enabled ? 'enabled' : 'disabled'}`);
        loadBackupData();
      } else {
        toast.error('Failed to update schedule');
      }
    } catch (error) {
      console.error('Error updating schedule:', error);
      toast.error('Failed to update schedule');
    }
  };

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hours > 0) return `${hours}h ${minutes}m`;
    if (minutes > 0) return `${minutes}m ${secs}s`;
    return `${secs}s`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
      case 'passed':
        return 'bg-green-100 text-green-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      case 'in-progress':
      case 'running':
      case 'restoring':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'full':
        return 'bg-purple-100 text-purple-800';
      case 'incremental':
        return 'bg-blue-100 text-blue-800';
      case 'differential':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const totalBackupSize = backups.reduce((sum, b) => sum + b.size, 0);
  const successfulBackups = backups.filter(b => b.status === 'completed').length;
  const testedBackups = backups.filter(b => b.restoreTested && b.restoreTestStatus === 'passed').length;
  const encryptedBackups = backups.filter(b => b.encrypted).length;

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
          <h2 className="text-3xl">Backup Management</h2>
          <p className="text-gray-600 mt-1">
            Daily encrypted backups with restore testing
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={loadBackupData}
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Button
            onClick={() => triggerBackup('full')}
            disabled={runningBackup}
            className="bg-[#5d9827] hover:bg-[#4a7a1f]"
          >
            {runningBackup ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Running...
              </>
            ) : (
              <>
                <Database className="w-4 h-4 mr-2" />
                Run Backup Now
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center justify-between mb-2">
            <Database className="w-5 h-5 text-[#625d9c]" />
            <Badge variant="outline">Total</Badge>
          </div>
          <div className="text-2xl font-bold">{backups.length}</div>
          <div className="text-sm text-gray-600">Backups</div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between mb-2">
            <HardDrive className="w-5 h-5 text-blue-600" />
            <Badge variant="outline">{formatBytes(totalBackupSize)}</Badge>
          </div>
          <div className="text-2xl font-bold">{successfulBackups}</div>
          <div className="text-sm text-gray-600">Successful</div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between mb-2">
            <Lock className="w-5 h-5 text-green-600" />
            <Badge variant="outline" className="text-green-600">
              {((encryptedBackups / backups.length) * 100).toFixed(0)}%
            </Badge>
          </div>
          <div className="text-2xl font-bold">{encryptedBackups}</div>
          <div className="text-sm text-gray-600">Encrypted</div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between mb-2">
            <FileCheck className="w-5 h-5 text-purple-600" />
            <Badge variant="outline" className={testedBackups > 0 ? 'text-green-600' : 'text-red-600'}>
              {testedBackups > 0 ? 'Tested' : 'Not Tested'}
            </Badge>
          </div>
          <div className="text-2xl font-bold">{testedBackups}</div>
          <div className="text-sm text-gray-600">Restore Tested</div>
        </Card>
      </div>

      {/* Warning if no tested backups */}
      {testedBackups === 0 && backups.length > 0 && (
        <Card className="p-4 bg-red-50 border-red-200">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-red-900">
              <p className="font-medium mb-1">Critical: No Restore Tests Performed</p>
              <p>
                You have {backups.length} backup{backups.length !== 1 ? 's' : ''} but none have been
                restore tested. Untested backups may be corrupted or incomplete. Run restore tests
                immediately to verify backup integrity.
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Backup Schedules */}
      <Card className="p-6">
        <h3 className="text-xl mb-4">Backup Schedules</h3>
        <div className="space-y-3">
          {schedules.map((schedule) => (
            <Card key={schedule.id} className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h4 className="font-medium">{schedule.name}</h4>
                    <Badge className={getTypeColor(schedule.type)}>
                      {schedule.type}
                    </Badge>
                    <Badge variant="outline" className="capitalize">
                      {schedule.frequency}
                    </Badge>
                    {schedule.enabled ? (
                      <Badge className="bg-green-100 text-green-800">
                        <CheckCircle2 className="w-3 h-3 mr-1" />
                        Enabled
                      </Badge>
                    ) : (
                      <Badge className="bg-gray-100 text-gray-600">
                        Disabled
                      </Badge>
                    )}
                  </div>
                  <div className="flex gap-4 text-sm text-gray-600">
                    <span>Time: {schedule.time}</span>
                    <span>Retention: {schedule.retentionDays} days</span>
                    <span>DBs: {schedule.databases.join(', ')}</span>
                  </div>
                  {schedule.nextRun && (
                    <p className="text-xs text-gray-500 mt-2">
                      Next run: {new Date(schedule.nextRun).toLocaleString()}
                    </p>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => toggleSchedule(schedule.id, !schedule.enabled)}
                  >
                    {schedule.enabled ? 'Disable' : 'Enable'}
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </Card>

      {/* Backup List */}
      <div className="grid lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <h3 className="text-xl mb-4">Recent Backups</h3>
          <div className="space-y-2 max-h-[600px] overflow-y-auto">
            {backups.slice(0, 20).map((backup) => (
              <Card
                key={backup.id}
                className={`p-4 cursor-pointer hover:border-[#625d9c] transition-colors ${
                  selectedBackup?.id === backup.id ? 'border-[#625d9c] border-2' : ''
                }`}
                onClick={() => setSelectedBackup(backup)}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Database className="w-4 h-4 text-gray-600" />
                      <span className="text-sm font-medium">
                        {new Date(backup.timestamp).toLocaleString()}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-2 mb-2">
                      <Badge className={getTypeColor(backup.type)}>
                        {backup.type}
                      </Badge>
                      <Badge className={getStatusColor(backup.status)}>
                        {backup.status}
                      </Badge>
                      {backup.encrypted && (
                        <Badge variant="outline" className="text-green-600">
                          <Lock className="w-3 h-3 mr-1" />
                          Encrypted
                        </Badge>
                      )}
                      {backup.restoreTested && (
                        <Badge
                          variant="outline"
                          className={backup.restoreTestStatus === 'passed' ? 'text-green-600' : 'text-red-600'}
                        >
                          <FileCheck className="w-3 h-3 mr-1" />
                          Tested
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4 text-xs text-gray-600">
                  <span className="flex items-center gap-1">
                    <HardDrive className="w-3 h-3" />
                    {formatBytes(backup.size)}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {formatDuration(backup.duration)}
                  </span>
                  {backup.checksumVerified && (
                    <span className="flex items-center gap-1 text-green-600">
                      <CheckCircle2 className="w-3 h-3" />
                      Verified
                    </span>
                  )}
                </div>
              </Card>
            ))}

            {backups.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <Database className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                <p>No backups yet</p>
              </div>
            )}
          </div>
        </Card>

        {/* Backup Details */}
        <Card className="p-6">
          {selectedBackup ? (
            <div className="space-y-6">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-xl mb-2">Backup Details</h3>
                  <p className="text-sm text-gray-600">
                    {new Date(selectedBackup.timestamp).toLocaleString()}
                  </p>
                </div>
                <Badge className={getStatusColor(selectedBackup.status)}>
                  {selectedBackup.status}
                </Badge>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Card className="p-3">
                  <p className="text-xs text-gray-600 mb-1">Type</p>
                  <Badge className={getTypeColor(selectedBackup.type)}>
                    {selectedBackup.type}
                  </Badge>
                </Card>
                <Card className="p-3">
                  <p className="text-xs text-gray-600 mb-1">Size</p>
                  <p className="font-medium">{formatBytes(selectedBackup.size)}</p>
                </Card>
                <Card className="p-3">
                  <p className="text-xs text-gray-600 mb-1">Duration</p>
                  <p className="font-medium">{formatDuration(selectedBackup.duration)}</p>
                </Card>
                <Card className="p-3">
                  <p className="text-xs text-gray-600 mb-1">Retention</p>
                  <p className="font-medium">
                    {new Date(selectedBackup.retentionUntil).toLocaleDateString()}
                  </p>
                </Card>
              </div>

              {/* Security */}
              <div>
                <h4 className="font-medium mb-3">Security</h4>
                <div className="space-y-2">
                  <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                    <div className="flex items-center gap-2">
                      <Lock className="w-4 h-4 text-gray-600" />
                      <span className="text-sm">Encrypted</span>
                    </div>
                    {selectedBackup.encrypted ? (
                      <CheckCircle2 className="w-4 h-4 text-green-600" />
                    ) : (
                      <XCircle className="w-4 h-4 text-red-600" />
                    )}
                  </div>
                  {selectedBackup.encryptionAlgorithm && (
                    <p className="text-xs text-gray-600 ml-6">
                      Algorithm: {selectedBackup.encryptionAlgorithm}
                    </p>
                  )}
                  <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                    <div className="flex items-center gap-2">
                      <Shield className="w-4 h-4 text-gray-600" />
                      <span className="text-sm">Checksum Verified</span>
                    </div>
                    {selectedBackup.checksumVerified ? (
                      <CheckCircle2 className="w-4 h-4 text-green-600" />
                    ) : (
                      <XCircle className="w-4 h-4 text-red-600" />
                    )}
                  </div>
                </div>
              </div>

              {/* Databases */}
              <div>
                <h4 className="font-medium mb-2">Databases Included</h4>
                <div className="flex flex-wrap gap-2">
                  {selectedBackup.databases.map((db, idx) => (
                    <Badge key={idx} variant="outline">
                      {db}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Restore Test Status */}
              <div>
                <h4 className="font-medium mb-3">Restore Testing</h4>
                {selectedBackup.restoreTested ? (
                  <Card className={`p-4 ${
                    selectedBackup.restoreTestStatus === 'passed'
                      ? 'bg-green-50 border-green-200'
                      : 'bg-red-50 border-red-200'
                  }`}>
                    <div className="flex items-start gap-2">
                      {selectedBackup.restoreTestStatus === 'passed' ? (
                        <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                      ) : (
                        <XCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                      )}
                      <div>
                        <p className="font-medium">
                          Restore test {selectedBackup.restoreTestStatus}
                        </p>
                        {selectedBackup.lastRestoreTest && (
                          <p className="text-sm text-gray-600 mt-1">
                            Last tested: {new Date(selectedBackup.lastRestoreTest).toLocaleString()}
                          </p>
                        )}
                      </div>
                    </div>
                  </Card>
                ) : (
                  <Card className="p-4 bg-amber-50 border-amber-200">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-medium text-amber-900">Not tested</p>
                        <p className="text-sm text-amber-800 mt-1">
                          This backup has not been restore tested. Run a test to verify integrity.
                        </p>
                      </div>
                    </div>
                  </Card>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => downloadBackup(selectedBackup.id)}
                  className="flex-1"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download
                </Button>
                <Button
                  onClick={() => runRestoreTest(selectedBackup.id)}
                  disabled={runningRestore || selectedBackup.status !== 'completed'}
                  className="flex-1 bg-[#625d9c] hover:bg-[#5a5490]"
                >
                  {runningRestore ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Testing...
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4 mr-2" />
                      Test Restore
                    </>
                  )}
                </Button>
              </div>

              <Card className="p-4 bg-blue-50 border-blue-200">
                <p className="text-sm text-blue-900">
                  <strong>Location:</strong> {selectedBackup.location}
                </p>
              </Card>
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500">
              <Database className="w-16 h-16 mx-auto mb-4 text-gray-400" />
              <p>Select a backup to view details</p>
            </div>
          )}
        </Card>
      </div>

      {/* Recent Restore Tests */}
      {restoreTests.length > 0 && (
        <Card className="p-6">
          <h3 className="text-xl mb-4">Recent Restore Tests</h3>
          <div className="space-y-2">
            {restoreTests.slice(0, 5).map((test) => (
              <Card key={test.id} className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <Activity className="w-4 h-4 text-gray-600" />
                      <span className="font-medium text-sm">
                        {new Date(test.startTime).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-xs text-gray-600">
                      Backup ID: {test.backupId.slice(0, 16)}...
                    </p>
                  </div>
                  <Badge className={getStatusColor(test.status)}>
                    {test.status}
                  </Badge>
                </div>

                <div className="space-y-2">
                  {test.verificationSteps.map((step, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-sm">
                      {step.status === 'passed' && <CheckCircle2 className="w-4 h-4 text-green-600" />}
                      {step.status === 'failed' && <XCircle className="w-4 h-4 text-red-600" />}
                      {step.status === 'running' && <Loader2 className="w-4 h-4 animate-spin text-blue-600" />}
                      {step.status === 'pending' && <Clock className="w-4 h-4 text-gray-400" />}
                      <span className="flex-1">{step.name}</span>
                      {step.message && (
                        <span className="text-xs text-gray-600">{step.message}</span>
                      )}
                    </div>
                  ))}
                </div>

                {test.errors && test.errors.length > 0 && (
                  <Card className="mt-3 p-3 bg-red-50 border-red-200">
                    <p className="text-sm font-medium text-red-900 mb-1">Errors:</p>
                    {test.errors.map((error, idx) => (
                      <p key={idx} className="text-xs text-red-800">• {error}</p>
                    ))}
                  </Card>
                )}
              </Card>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
