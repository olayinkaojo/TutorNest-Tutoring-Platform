import React, { useState, useEffect } from 'react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Badge } from '../ui/badge';
import { 
  AlertTriangle,
  Shield,
  Clock,
  CheckCircle2,
  XCircle,
  Play,
  FileText,
  Activity,
  Target,
  Zap,
  Loader2,
  Download,
  Users,
  Phone,
  MapPin,
  AlertCircle
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { projectId, publicAnonKey } from '../../utils/supabase/info';

interface DRPlan {
  id: string;
  version: string;
  lastUpdated: string;
  lastReviewed: string;
  nextReview: string;
  approvedBy: string[];
  status: 'active' | 'draft' | 'testing';
  rpo: number; // minutes
  rto: number; // minutes
}

interface DRTest {
  id: string;
  testDate: string;
  testType: 'full' | 'partial' | 'tabletop';
  status: 'planned' | 'in-progress' | 'passed' | 'failed';
  objectives: string[];
  participants: string[];
  results: TestResult[];
  issues: string[];
  actualRTO?: number;
  actualRPO?: number;
  nextActions: string[];
}

interface TestResult {
  objective: string;
  status: 'passed' | 'failed' | 'partial';
  notes: string;
  duration?: number;
}

interface DRObjective {
  id: string;
  name: string;
  category: 'data' | 'infrastructure' | 'application' | 'communication';
  priority: 'critical' | 'high' | 'medium' | 'low';
  rto: number; // minutes
  rpo: number; // minutes
  responsible: string;
  lastTested?: string;
  testStatus?: 'passed' | 'failed';
}

interface EmergencyContact {
  id: string;
  role: string;
  name: string;
  primaryPhone: string;
  secondaryPhone?: string;
  email: string;
  alternateEmail?: string;
  availableHours: string;
}

interface RunbookStep {
  id: string;
  order: number;
  category: string;
  title: string;
  description: string;
  responsible: string;
  estimatedTime: number; // minutes
  prerequisites: string[];
  commands?: string[];
  verificationSteps: string[];
  rollbackProcedure?: string;
}

interface DisasterRecoveryPlanProps {
  userId: string;
  accessToken: string;
  userRole: string;
}

export function DisasterRecoveryPlan({ userId, accessToken, userRole }: DisasterRecoveryPlanProps) {
  const [plan, setPlan] = useState<DRPlan | null>(null);
  const [tests, setTests] = useState<DRTest[]>([]);
  const [objectives, setObjectives] = useState<DRObjective[]>([]);
  const [contacts, setContacts] = useState<EmergencyContact[]>([]);
  const [runbook, setRunbook] = useState<RunbookStep[]>([]);
  const [loading, setLoading] = useState(true);
  const [runningTest, setRunningTest] = useState(false);
  const [selectedTest, setSelectedTest] = useState<DRTest | null>(null);

  useEffect(() => {
    loadDRData();
  }, []);

  const loadDRData = async () => {
    setLoading(true);
    try {
      const [planRes, testsRes, objectivesRes, contactsRes, runbookRes] = await Promise.all([
        fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-cbd74580/admin/dr/plan`,
          { headers: { 'Authorization': `Bearer ${accessToken}` } }
        ),
        fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-cbd74580/admin/dr/tests`,
          { headers: { 'Authorization': `Bearer ${accessToken}` } }
        ),
        fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-cbd74580/admin/dr/objectives`,
          { headers: { 'Authorization': `Bearer ${accessToken}` } }
        ),
        fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-cbd74580/admin/dr/contacts`,
          { headers: { 'Authorization': `Bearer ${accessToken}` } }
        ),
        fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-cbd74580/admin/dr/runbook`,
          { headers: { 'Authorization': `Bearer ${accessToken}` } }
        )
      ]);

      if (planRes.ok) {
        const data = await planRes.json();
        setPlan(data.plan);
      }

      if (testsRes.ok) {
        const data = await testsRes.json();
        setTests(data.tests || []);
      }

      if (objectivesRes.ok) {
        const data = await objectivesRes.json();
        setObjectives(data.objectives || []);
      }

      if (contactsRes.ok) {
        const data = await contactsRes.json();
        setContacts(data.contacts || []);
      }

      if (runbookRes.ok) {
        const data = await runbookRes.json();
        setRunbook(data.runbook || []);
      }
    } catch (error) {
      console.error('Error loading DR data:', error);
      toast.error('Failed to load DR plan');
    } finally {
      setLoading(false);
    }
  };

  const scheduleDRTest = async (testType: 'full' | 'partial' | 'tabletop') => {
    setRunningTest(true);
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-cbd74580/admin/dr/tests`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            testType,
            scheduledBy: userId,
            objectives: objectives.filter(o => o.priority === 'critical').map(o => o.id)
          })
        }
      );

      if (response.ok) {
        toast.success(`${testType} DR test scheduled`);
        loadDRData();
      } else {
        toast.error('Failed to schedule test');
      }
    } catch (error) {
      console.error('Error scheduling test:', error);
      toast.error('Failed to schedule test');
    } finally {
      setRunningTest(false);
    }
  };

  const downloadRunbook = async () => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-cbd74580/admin/dr/runbook/download`,
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
        a.download = 'disaster-recovery-runbook.pdf';
        a.click();
        window.URL.revokeObjectURL(url);
        toast.success('Runbook downloaded');
      } else {
        toast.error('Failed to download runbook');
      }
    } catch (error) {
      console.error('Error downloading runbook:', error);
      toast.error('Failed to download runbook');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
      case 'passed':
        return 'bg-green-100 text-green-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      case 'in-progress':
        return 'bg-blue-100 text-blue-800';
      case 'planned':
      case 'testing':
      case 'draft':
        return 'bg-yellow-100 text-yellow-800';
      case 'partial':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical':
        return 'bg-red-100 text-red-800';
      case 'high':
        return 'bg-orange-100 text-orange-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'low':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatTime = (minutes: number): string => {
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  const criticalObjectives = objectives.filter(o => o.priority === 'critical');
  const testedObjectives = objectives.filter(o => o.lastTested && o.testStatus === 'passed');
  const passedTests = tests.filter(t => t.status === 'passed').length;
  const averageRTO = tests.length > 0 && tests.some(t => t.actualRTO)
    ? tests.filter(t => t.actualRTO).reduce((sum, t) => sum + (t.actualRTO || 0), 0) / tests.filter(t => t.actualRTO).length
    : plan?.rto || 0;

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
          <h2 className="text-3xl">Disaster Recovery Plan</h2>
          <p className="text-gray-600 mt-1">
            RPO/RTO targets and tested recovery procedures
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={downloadRunbook}>
            <Download className="w-4 h-4 mr-2" />
            Download Runbook
          </Button>
          <Button
            onClick={() => scheduleDRTest('tabletop')}
            disabled={runningTest}
            className="bg-[#5d9827] hover:bg-[#4a7a1f]"
          >
            {runningTest ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Play className="w-4 h-4 mr-2" />
            )}
            Schedule Test
          </Button>
        </div>
      </div>

      {/* Plan Overview */}
      {plan && (
        <Card className="p-6 bg-gradient-to-r from-[#625d9c] to-[#5d9827] text-white">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="text-2xl mb-1">DR Plan v{plan.version}</h3>
              <Badge className={getStatusColor(plan.status)}>
                {plan.status}
              </Badge>
            </div>
            <Shield className="w-12 h-12 opacity-80" />
          </div>

          <div className="grid md:grid-cols-4 gap-6">
            <div>
              <div className="text-sm opacity-90 mb-1">Target RPO</div>
              <div className="text-3xl font-bold">{formatTime(plan.rpo)}</div>
              <div className="text-sm opacity-90">Recovery Point</div>
            </div>
            <div>
              <div className="text-sm opacity-90 mb-1">Target RTO</div>
              <div className="text-3xl font-bold">{formatTime(plan.rto)}</div>
              <div className="text-sm opacity-90">Recovery Time</div>
            </div>
            <div>
              <div className="text-sm opacity-90 mb-1">Last Tested</div>
              <div className="text-xl font-bold">
                {tests.length > 0 ? new Date(tests[0].testDate).toLocaleDateString() : 'Never'}
              </div>
              <div className="text-sm opacity-90">
                {passedTests}/{tests.length} passed
              </div>
            </div>
            <div>
              <div className="text-sm opacity-90 mb-1">Next Review</div>
              <div className="text-xl font-bold">
                {new Date(plan.nextReview).toLocaleDateString()}
              </div>
              <div className="text-sm opacity-90">Quarterly reviews</div>
            </div>
          </div>
        </Card>
      )}

      {/* Alert if not tested recently */}
      {tests.length === 0 || (tests[0] && new Date(tests[0].testDate) < new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)) && (
        <Card className="p-4 bg-red-50 border-red-200">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-red-900">
              <p className="font-medium mb-1">DR Plan Not Recently Tested</p>
              <p>
                The disaster recovery plan has not been tested in the last 90 days. Schedule a DR test
                immediately to ensure procedures are up-to-date and team members are trained.
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Stats */}
      <div className="grid md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center justify-between mb-2">
            <Target className="w-5 h-5 text-[#625d9c]" />
            <Badge variant="outline">Critical</Badge>
          </div>
          <div className="text-2xl font-bold">{criticalObjectives.length}</div>
          <div className="text-sm text-gray-600">Critical Objectives</div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between mb-2">
            <CheckCircle2 className="w-5 h-5 text-green-600" />
            <Badge variant="outline" className="text-green-600">
              {testedObjectives.length > 0 ? Math.round((testedObjectives.length / objectives.length) * 100) : 0}%
            </Badge>
          </div>
          <div className="text-2xl font-bold">{testedObjectives.length}</div>
          <div className="text-sm text-gray-600">Tested & Verified</div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between mb-2">
            <Clock className="w-5 h-5 text-blue-600" />
            <Badge variant="outline">Actual</Badge>
          </div>
          <div className="text-2xl font-bold">{formatTime(Math.round(averageRTO))}</div>
          <div className="text-sm text-gray-600">Avg RTO Achieved</div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between mb-2">
            <Activity className="w-5 h-5 text-purple-600" />
            <Badge variant="outline">All Time</Badge>
          </div>
          <div className="text-2xl font-bold">{tests.length}</div>
          <div className="text-sm text-gray-600">DR Tests Run</div>
        </Card>
      </div>

      {/* Recovery Objectives */}
      <Card className="p-6">
        <h3 className="text-xl mb-4">Recovery Objectives</h3>
        <div className="space-y-2">
          {objectives.map((objective) => {
            const Icon = 
              objective.category === 'data' ? Shield :
              objective.category === 'infrastructure' ? Activity :
              objective.category === 'application' ? Zap :
              AlertCircle;

            return (
              <Card key={objective.id} className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <Icon className="w-5 h-5 text-gray-600" />
                    <div>
                      <h4 className="font-medium">{objective.name}</h4>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge className={getPriorityColor(objective.priority)}>
                          {objective.priority}
                        </Badge>
                        <Badge variant="outline" className="capitalize">
                          {objective.category}
                        </Badge>
                        {objective.lastTested && (
                          <Badge
                            variant="outline"
                            className={objective.testStatus === 'passed' ? 'text-green-600' : 'text-red-600'}
                          >
                            {objective.testStatus}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid md:grid-cols-3 gap-4 mt-3">
                  <Card className="p-3">
                    <div className="text-xs text-gray-600 mb-1">Target RTO</div>
                    <div className="font-bold text-[#625d9c]">{formatTime(objective.rto)}</div>
                  </Card>
                  <Card className="p-3">
                    <div className="text-xs text-gray-600 mb-1">Target RPO</div>
                    <div className="font-bold text-[#5d9827]">{formatTime(objective.rpo)}</div>
                  </Card>
                  <Card className="p-3">
                    <div className="text-xs text-gray-600 mb-1">Responsible</div>
                    <div className="font-medium text-sm">{objective.responsible}</div>
                  </Card>
                </div>

                {objective.lastTested && (
                  <p className="text-xs text-gray-600 mt-2">
                    Last tested: {new Date(objective.lastTested).toLocaleDateString()}
                  </p>
                )}
              </Card>
            );
          })}
        </div>
      </Card>

      {/* Emergency Contacts */}
      <Card className="p-6">
        <h3 className="text-xl mb-4">Emergency Contacts</h3>
        <div className="grid md:grid-cols-2 gap-3">
          {contacts.map((contact) => (
            <Card key={contact.id} className="p-4">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <Badge variant="outline" className="mb-2">{contact.role}</Badge>
                  <h4 className="font-medium">{contact.name}</h4>
                </div>
                <Users className="w-5 h-5 text-gray-600" />
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-gray-600" />
                  <span>{contact.primaryPhone}</span>
                  {contact.secondaryPhone && (
                    <span className="text-gray-500">• {contact.secondaryPhone}</span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-gray-600" />
                  <span className="text-gray-600">{contact.email}</span>
                </div>
                <p className="text-xs text-gray-500">Available: {contact.availableHours}</p>
              </div>
            </Card>
          ))}
        </div>
      </Card>

      {/* DR Tests */}
      <div className="grid lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <h3 className="text-xl mb-4">DR Test History</h3>
          <div className="space-y-2 max-h-[500px] overflow-y-auto">
            {tests.map((test) => (
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
                      <Activity className="w-4 h-4 text-gray-600" />
                      <span className="font-medium text-sm">
                        {new Date(test.testDate).toLocaleDateString()}
                      </span>
                    </div>
                    <Badge className={getStatusColor(test.status)}>
                      {test.status}
                    </Badge>
                    <Badge variant="outline" className="ml-2 capitalize">
                      {test.testType}
                    </Badge>
                  </div>
                </div>

                <div className="flex gap-3 text-sm text-gray-600 mt-2">
                  {test.actualRTO && (
                    <span>RTO: {formatTime(test.actualRTO)}</span>
                  )}
                  {test.actualRPO && (
                    <span>RPO: {formatTime(test.actualRPO)}</span>
                  )}
                  <span>{test.participants.length} participants</span>
                </div>

                {test.issues.length > 0 && (
                  <div className="flex items-center gap-1 text-xs text-red-600 mt-2">
                    <AlertTriangle className="w-3 h-3" />
                    {test.issues.length} issue{test.issues.length !== 1 ? 's' : ''}
                  </div>
                )}
              </Card>
            ))}

            {tests.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <Activity className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                <p>No DR tests yet</p>
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
                  <h3 className="text-xl mb-2">Test Details</h3>
                  <p className="text-sm text-gray-600">
                    {new Date(selectedTest.testDate).toLocaleString()}
                  </p>
                </div>
                <Badge className={getStatusColor(selectedTest.status)}>
                  {selectedTest.status}
                </Badge>
              </div>

              {selectedTest.actualRTO && selectedTest.actualRPO && (
                <div className="grid grid-cols-2 gap-4">
                  <Card className={`p-4 ${selectedTest.actualRTO <= (plan?.rto || 0) ? 'bg-green-50' : 'bg-red-50'}`}>
                    <div className="text-xs text-gray-600 mb-1">Actual RTO</div>
                    <div className="text-2xl font-bold">{formatTime(selectedTest.actualRTO)}</div>
                    <div className="text-xs text-gray-600">
                      Target: {plan ? formatTime(plan.rto) : 'N/A'}
                    </div>
                  </Card>
                  <Card className={`p-4 ${selectedTest.actualRPO <= (plan?.rpo || 0) ? 'bg-green-50' : 'bg-red-50'}`}>
                    <div className="text-xs text-gray-600 mb-1">Actual RPO</div>
                    <div className="text-2xl font-bold">{formatTime(selectedTest.actualRPO)}</div>
                    <div className="text-xs text-gray-600">
                      Target: {plan ? formatTime(plan.rpo) : 'N/A'}
                    </div>
                  </Card>
                </div>
              )}

              <div>
                <h4 className="font-medium mb-2">Test Results</h4>
                <div className="space-y-2">
                  {selectedTest.results.map((result, idx) => (
                    <div key={idx} className="flex items-start gap-2 p-2 bg-gray-50 rounded">
                      {result.status === 'passed' && <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5" />}
                      {result.status === 'failed' && <XCircle className="w-4 h-4 text-red-600 mt-0.5" />}
                      {result.status === 'partial' && <AlertCircle className="w-4 h-4 text-orange-600 mt-0.5" />}
                      <div className="flex-1">
                        <p className="text-sm font-medium">{result.objective}</p>
                        {result.notes && (
                          <p className="text-xs text-gray-600 mt-1">{result.notes}</p>
                        )}
                        {result.duration && (
                          <p className="text-xs text-gray-500 mt-1">
                            Duration: {formatTime(result.duration)}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {selectedTest.issues.length > 0 && (
                <div>
                  <h4 className="font-medium mb-2 text-red-900">Issues Identified</h4>
                  <Card className="p-3 bg-red-50 border-red-200">
                    {selectedTest.issues.map((issue, idx) => (
                      <p key={idx} className="text-sm text-red-800 mb-1">• {issue}</p>
                    ))}
                  </Card>
                </div>
              )}

              {selectedTest.nextActions.length > 0 && (
                <div>
                  <h4 className="font-medium mb-2">Next Actions</h4>
                  <div className="space-y-1">
                    {selectedTest.nextActions.map((action, idx) => (
                      <div key={idx} className="flex items-start gap-2 text-sm">
                        <CheckCircle2 className="w-4 h-4 text-gray-400 mt-0.5" />
                        <span>{action}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <h4 className="font-medium mb-2">Participants</h4>
                <div className="flex flex-wrap gap-2">
                  {selectedTest.participants.map((participant, idx) => (
                    <Badge key={idx} variant="outline">
                      {participant}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500">
              <FileText className="w-16 h-16 mx-auto mb-4 text-gray-400" />
              <p>Select a test to view details</p>
            </div>
          )}
        </Card>
      </div>

      {/* Runbook Overview */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl">Recovery Runbook</h3>
          <Badge variant="outline">{runbook.length} steps</Badge>
        </div>
        
        <div className="space-y-2">
          {runbook.slice(0, 5).map((step) => (
            <Card key={step.id} className="p-3">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-[#625d9c] text-white flex items-center justify-center flex-shrink-0 font-bold">
                  {step.order}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-medium text-sm">{step.title}</h4>
                    <Badge variant="outline" className="text-xs capitalize">
                      {step.category}
                    </Badge>
                  </div>
                  <p className="text-xs text-gray-600 mb-2">{step.description}</p>
                  <div className="flex items-center gap-3 text-xs text-gray-600">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {formatTime(step.estimatedTime)}
                    </span>
                    <span>By: {step.responsible}</span>
                  </div>
                </div>
              </div>
            </Card>
          ))}
          
          {runbook.length > 5 && (
            <p className="text-center text-sm text-gray-600 pt-2">
              + {runbook.length - 5} more steps. Download full runbook for complete procedures.
            </p>
          )}
        </div>
      </Card>
    </div>
  );
}
