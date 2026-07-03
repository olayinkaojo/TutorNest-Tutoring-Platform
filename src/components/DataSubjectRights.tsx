import React, { useState, useEffect } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Badge } from './ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { 
  Shield, 
  Download, 
  Edit, 
  Trash2, 
  FileText,
  Clock,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Info
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { projectId, publicAnonKey } from '../utils/supabase/info';

interface DSARRequest {
  id: string;
  type: 'access' | 'rectify' | 'delete' | 'portability' | 'restrict' | 'object';
  status: 'pending' | 'processing' | 'completed' | 'rejected';
  requestDate: string;
  completionDate?: string;
  slaDeadline: string;
  description: string;
  exportFormat?: 'json' | 'csv' | 'pdf';
  downloadUrl?: string;
}

interface DataSubjectRightsProps {
  userId: string;
  accessToken: string;
  userEmail: string;
}

const REQUEST_TYPES = [
  {
    id: 'access',
    label: 'Access My Data',
    description: 'Request a copy of all personal data we hold about you',
    icon: Download,
    sla: 30
  },
  {
    id: 'rectify',
    label: 'Rectify My Data',
    description: 'Request correction of inaccurate or incomplete data',
    icon: Edit,
    sla: 30
  },
  {
    id: 'delete',
    label: 'Delete My Data',
    description: 'Request deletion of your personal data (right to be forgotten)',
    icon: Trash2,
    sla: 30
  },
  {
    id: 'portability',
    label: 'Data Portability',
    description: 'Receive your data in a machine-readable format to transfer to another service',
    icon: FileText,
    sla: 30
  },
  {
    id: 'restrict',
    label: 'Restrict Processing',
    description: 'Limit how we process your data',
    icon: Shield,
    sla: 30
  },
  {
    id: 'object',
    label: 'Object to Processing',
    description: 'Object to certain types of data processing',
    icon: AlertCircle,
    sla: 30
  }
];

export function DataSubjectRights({ userId, accessToken, userEmail }: DataSubjectRightsProps) {
  const [requests, setRequests] = useState<DSARRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [selectedType, setSelectedType] = useState<string>('');
  const [description, setDescription] = useState('');
  const [exportFormat, setExportFormat] = useState<'json' | 'csv' | 'pdf'>('json');

  useEffect(() => {
    loadRequests();
  }, [userId]);

  const loadRequests = async () => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-cbd74580/dsar-requests/${userId}`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`
          }
        }
      );

      if (response.ok) {
        const data = await response.json();
        setRequests(data.requests || []);
      }
    } catch (error) {
      console.error('Error loading DSAR requests:', error);
    } finally {
      setLoading(false);
    }
  };

  const submitRequest = async () => {
    if (!selectedType) {
      toast.error('Please select a request type');
      return;
    }

    setSubmitting(true);
    try {
      const requestType = REQUEST_TYPES.find(t => t.id === selectedType);
      const slaDeadline = new Date();
      slaDeadline.setDate(slaDeadline.getDate() + (requestType?.sla || 30));

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-cbd74580/dsar-requests`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            userId,
            userEmail,
            type: selectedType,
            description,
            exportFormat: ['access', 'portability'].includes(selectedType) ? exportFormat : undefined,
            slaDeadline: slaDeadline.toISOString()
          })
        }
      );

      if (response.ok) {
        toast.success('Request submitted successfully. We will respond within 30 days.');
        setSelectedType('');
        setDescription('');
        loadRequests();
      } else {
        toast.error('Failed to submit request');
      }
    } catch (error) {
      console.error('Error submitting DSAR request:', error);
      toast.error('Failed to submit request');
    } finally {
      setSubmitting(false);
    }
  };

  const downloadData = async (requestId: string) => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-cbd74580/dsar-requests/${requestId}/download`,
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
        a.download = `kfa-data-export-${requestId}.zip`;
        a.click();
        window.URL.revokeObjectURL(url);
        toast.success('Download started');
      } else {
        toast.error('Failed to download data');
      }
    } catch (error) {
      console.error('Error downloading data:', error);
      toast.error('Failed to download data');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'processing':
        return 'bg-blue-100 text-blue-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-yellow-100 text-yellow-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="w-4 h-4" />;
      case 'processing':
        return <Loader2 className="w-4 h-4 animate-spin" />;
      case 'rejected':
        return <AlertCircle className="w-4 h-4" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  const getDaysRemaining = (slaDeadline: string) => {
    const deadline = new Date(slaDeadline);
    const now = new Date();
    const diff = deadline.getTime() - now.getTime();
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    return days;
  };

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="w-8 h-8 animate-spin text-[#625d9c]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl mb-2">Data Subject Access Rights</h2>
        <p className="text-gray-600">
          Exercise your rights under GDPR and UK data protection law
        </p>
      </div>

      {/* Information Card */}
      <Card className="p-6 bg-blue-50 border-blue-200">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-900">
            <p className="font-medium mb-2">Your Rights Under GDPR</p>
            <ul className="space-y-1">
              <li>• <strong>Right to Access:</strong> Obtain a copy of your personal data</li>
              <li>• <strong>Right to Rectification:</strong> Correct inaccurate or incomplete data</li>
              <li>• <strong>Right to Erasure:</strong> Request deletion of your data ("right to be forgotten")</li>
              <li>• <strong>Right to Data Portability:</strong> Receive your data in a portable format</li>
              <li>• <strong>Right to Restrict Processing:</strong> Limit how we use your data</li>
              <li>• <strong>Right to Object:</strong> Object to certain data processing activities</li>
            </ul>
            <p className="mt-2">
              We will respond to your request within <strong>30 days</strong> as required by law.
            </p>
          </div>
        </div>
      </Card>

      {/* New Request Form */}
      <Card className="p-6">
        <h3 className="text-xl mb-4">Submit a New Request</h3>
        
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Request Type</Label>
            <Select value={selectedType} onValueChange={setSelectedType}>
              <SelectTrigger>
                <SelectValue placeholder="Select a request type" />
              </SelectTrigger>
              <SelectContent>
                {REQUEST_TYPES.map((type) => {
                  const Icon = type.icon;
                  return (
                    <SelectItem key={type.id} value={type.id}>
                      <div className="flex items-center gap-2">
                        <Icon className="w-4 h-4" />
                        {type.label}
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
            {selectedType && (
              <p className="text-sm text-gray-600">
                {REQUEST_TYPES.find(t => t.id === selectedType)?.description}
              </p>
            )}
          </div>

          {['access', 'portability'].includes(selectedType) && (
            <div className="space-y-2">
              <Label>Export Format</Label>
              <Select value={exportFormat} onValueChange={(value: any) => setExportFormat(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="json">JSON (Machine-readable)</SelectItem>
                  <SelectItem value="csv">CSV (Spreadsheet)</SelectItem>
                  <SelectItem value="pdf">PDF (Human-readable)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="description">
              Additional Details {selectedType === 'rectify' && '(Required)'}
            </Label>
            <Textarea
              id="description"
              placeholder={
                selectedType === 'rectify'
                  ? 'Please describe what data is incorrect and what it should be...'
                  : selectedType === 'delete'
                  ? 'Please note that some data may be retained for legal compliance (e.g., payment records, dispute history)...'
                  : 'Provide any additional context for your request (optional)...'
              }
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
            />
          </div>

          {selectedType === 'delete' && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-amber-900">
                  <p className="font-medium mb-1">Important: Legal Retention Requirements</p>
                  <p>
                    While we will honor your deletion request, we may be legally required to retain certain data:
                  </p>
                  <ul className="mt-2 space-y-1">
                    <li>• Payment and transaction records (7 years for tax purposes)</li>
                    <li>• Dispute resolution records (6 years under UK contract law)</li>
                    <li>• Safeguarding records (indefinite retention for child protection)</li>
                  </ul>
                  <p className="mt-2">
                    Retained data will be isolated and only accessible for legal compliance purposes.
                  </p>
                </div>
              </div>
            </div>
          )}

          <Button
            onClick={submitRequest}
            disabled={!selectedType || submitting}
            className="w-full bg-[#5d9827] hover:bg-[#4a7a1f]"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Submitting...
              </>
            ) : (
              'Submit Request'
            )}
          </Button>
        </div>
      </Card>

      {/* Previous Requests */}
      {requests.length > 0 && (
        <Card className="p-6">
          <h3 className="text-xl mb-4">Your Requests</h3>
          <div className="space-y-4">
            {requests.map((request) => {
              const requestType = REQUEST_TYPES.find(t => t.id === request.type);
              const Icon = requestType?.icon || FileText;
              const daysRemaining = getDaysRemaining(request.slaDeadline);

              return (
                <Card key={request.id} className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 flex-1">
                      <Icon className="w-5 h-5 text-[#625d9c] flex-shrink-0 mt-1" />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h4 className="font-medium">{requestType?.label}</h4>
                          <Badge className={getStatusColor(request.status)}>
                            <span className="flex items-center gap-1">
                              {getStatusIcon(request.status)}
                              {request.status}
                            </span>
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600 mb-2">
                          {request.description || requestType?.description}
                        </p>
                        <div className="flex flex-wrap gap-4 text-xs text-gray-500">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            Submitted: {new Date(request.requestDate).toLocaleDateString()}
                          </span>
                          {request.status === 'pending' && daysRemaining > 0 && (
                            <span className="text-blue-600">
                              {daysRemaining} days remaining to respond
                            </span>
                          )}
                          {request.status === 'completed' && request.completionDate && (
                            <span className="text-green-600">
                              Completed: {new Date(request.completionDate).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {request.status === 'completed' && request.downloadUrl && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => downloadData(request.id)}
                      >
                        <Download className="w-4 h-4 mr-2" />
                        Download
                      </Button>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        </Card>
      )}

      {/* Contact Support */}
      <Card className="p-6 bg-gray-50">
        <h3 className="text-lg mb-2">Need Help?</h3>
        <p className="text-sm text-gray-600 mb-4">
          If you have questions about your data rights or need assistance with a request,
          our Data Protection Officer is here to help.
        </p>
        <div className="space-y-2 text-sm">
          <p>
            <strong>Email:</strong>{' '}
            <a href="mailto:dpo@knowledgefonsacademy.com" className="text-[#625d9c] hover:underline">
              dpo@knowledgefonsacademy.com
            </a>
          </p>
          <p>
            <strong>Phone:</strong>{' '}
            <a href="tel:+442012345678" className="text-[#625d9c] hover:underline">
              +44 (0)20 1234 5678
            </a>
          </p>
        </div>
      </Card>
    </div>
  );
}
