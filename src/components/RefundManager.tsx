import { useState, useEffect } from 'react';
import { projectId } from '../utils/supabase/info';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Badge } from './ui/badge';
import { Alert, AlertDescription } from './ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Textarea } from './ui/textarea';
import { Label } from './ui/label';
import { 
  DollarSign, 
  AlertCircle, 
  CheckCircle,
  XCircle,
  FileText,
  Download,
  Search
} from 'lucide-react';

interface RefundManagerProps {
  session: any;
}

interface RefundRequest {
  id: string;
  bookingId: string;
  parentName: string;
  tutorName: string;
  studentName: string;
  lessonDate: string;
  amount: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected' | 'processed';
  requestedAt: string;
  processedAt?: string;
  processedBy?: string;
  notes?: string;
}

interface Chargeback {
  id: string;
  bookingId: string;
  amount: string;
  reason: string;
  status: 'open' | 'won' | 'lost';
  openedAt: string;
  dueDate: string;
  evidence: string[];
}

export function RefundManager({ session }: RefundManagerProps) {
  const [refundRequests, setRefundRequests] = useState<RefundRequest[]>([]);
  const [chargebacks, setChargebacks] = useState<Chargeback[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [selectedRequest, setSelectedRequest] = useState<RefundRequest | null>(null);
  const [adminNotes, setAdminNotes] = useState('');

  useEffect(() => {
    fetchRefundData();
  }, []);

  const fetchRefundData = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-cbd74580/admin/refunds`,
        {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setRefundRequests(data.refundRequests || []);
        setChargebacks(data.chargebacks || []);
      }
    } catch (err: any) {
      console.error('Error fetching refund data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleProcessRefund = async (requestId: string, decision: 'approve' | 'reject') => {
    setProcessing(requestId);
    setError('');
    setSuccess('');

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-cbd74580/admin/refunds/${requestId}/process`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            decision,
            notes: adminNotes,
          }),
        }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to process refund');
      }

      setSuccess(`Refund ${decision === 'approve' ? 'approved' : 'rejected'} successfully`);
      setSelectedRequest(null);
      setAdminNotes('');
      await fetchRefundData();
    } catch (err: any) {
      console.error('Error processing refund:', err);
      setError(err.message);
    } finally {
      setProcessing(null);
    }
  };

  const handleExportEvidence = async (chargebackId: string) => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-cbd74580/admin/chargebacks/${chargebackId}/evidence`,
        {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to export evidence');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `chargeback-${chargebackId}-evidence.pdf`;
      a.click();
      
      setSuccess('Evidence exported successfully');
    } catch (err: any) {
      console.error('Error exporting evidence:', err);
      setError(err.message);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary">Pending Review</Badge>;
      case 'approved':
        return <Badge style={{ backgroundColor: '#5d9827', color: 'white' }}>Approved</Badge>;
      case 'rejected':
        return <Badge variant="destructive">Rejected</Badge>;
      case 'processed':
        return <Badge variant="default">Processed</Badge>;
      case 'open':
        return <Badge variant="destructive">Open</Badge>;
      case 'won':
        return <Badge style={{ backgroundColor: '#5d9827', color: 'white' }}>Won</Badge>;
      case 'lost':
        return <Badge variant="secondary">Lost</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const pendingRefunds = refundRequests.filter(r => r.status === 'pending');
  const processedRefunds = refundRequests.filter(r => r.status !== 'pending');

  if (loading) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <DollarSign className="w-8 h-8 animate-pulse mx-auto mb-4" style={{ color: '#625d9c' }} />
          <p className="text-gray-600">Loading refund data...</p>
        </CardContent>
      </Card>
    );
  }

  if (selectedRequest) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Process Refund Request</CardTitle>
          <CardDescription>Review and approve or reject this refund request</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {error && (
            <Alert className="bg-red-50 border-red-200">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-800">{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm font-medium mb-1">Parent</p>
                <p className="text-gray-700">{selectedRequest.parentName}</p>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm font-medium mb-1">Tutor</p>
                <p className="text-gray-700">{selectedRequest.tutorName}</p>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm font-medium mb-1">Student</p>
                <p className="text-gray-700">{selectedRequest.studentName}</p>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm font-medium mb-1">Lesson Date</p>
                <p className="text-gray-700">{formatDate(selectedRequest.lessonDate)}</p>
              </div>
            </div>

            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-sm font-medium mb-1">Refund Amount</p>
              <p className="text-2xl font-bold text-gray-900">£{selectedRequest.amount}</p>
            </div>

            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-sm font-medium mb-2">Reason for Refund</p>
              <p className="text-gray-700">{selectedRequest.reason}</p>
            </div>

            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-sm font-medium mb-1">Requested At</p>
              <p className="text-gray-700">{formatDate(selectedRequest.requestedAt)}</p>
            </div>
          </div>

          <div>
            <Label htmlFor="adminNotes">Admin Notes (Optional)</Label>
            <Textarea
              id="adminNotes"
              value={adminNotes}
              onChange={(e) => setAdminNotes(e.target.value)}
              placeholder="Add internal notes about this refund decision..."
              className="mt-2"
              rows={4}
            />
          </div>

          <Alert className="bg-amber-50 border-amber-200">
            <AlertCircle className="h-4 w-4 text-amber-600" />
            <AlertDescription className="text-amber-800 text-sm">
              <strong>Important:</strong> Approved refunds will be processed immediately and cannot be undone.
              Rejected refunds will notify the parent with your reasoning.
            </AlertDescription>
          </Alert>

          <div className="grid grid-cols-3 gap-4">
            <Button
              variant="outline"
              onClick={() => {
                setSelectedRequest(null);
                setAdminNotes('');
              }}
              className="h-12"
            >
              Cancel
            </Button>
            <Button
              onClick={() => handleProcessRefund(selectedRequest.id, 'reject')}
              disabled={processing === selectedRequest.id}
              variant="outline"
              className="h-12 text-red-600 border-red-200 hover:bg-red-50"
            >
              {processing === selectedRequest.id ? 'Processing...' : 'Reject'}
            </Button>
            <Button
              onClick={() => handleProcessRefund(selectedRequest.id, 'approve')}
              disabled={processing === selectedRequest.id}
              className="h-12 text-white"
              style={{ backgroundColor: '#5d9827' }}
            >
              {processing === selectedRequest.id ? 'Processing...' : 'Approve Refund'}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {success && (
        <Alert className="bg-green-50 border-green-200">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">{success}</AlertDescription>
        </Alert>
      )}

      {error && (
        <Alert className="bg-red-50 border-red-200">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">{error}</AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="pending">
        <TabsList>
          <TabsTrigger value="pending">
            Pending ({pendingRefunds.length})
          </TabsTrigger>
          <TabsTrigger value="processed">
            Processed ({processedRefunds.length})
          </TabsTrigger>
          <TabsTrigger value="chargebacks">
            Chargebacks ({chargebacks.length})
          </TabsTrigger>
        </TabsList>

        {/* Pending Refunds */}
        <TabsContent value="pending" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Pending Refund Requests</CardTitle>
              <CardDescription>Review and process refund requests from parents</CardDescription>
            </CardHeader>
            <CardContent>
              {pendingRefunds.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <CheckCircle className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p>No pending refund requests</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {pendingRefunds.map((request) => (
                    <Card key={request.id} className="bg-amber-50 border-amber-200">
                      <CardContent className="pt-6">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <p className="font-medium">{request.parentName}</p>
                            <p className="text-sm text-gray-600">
                              Lesson with {request.tutorName} • {formatDate(request.lessonDate)}
                            </p>
                          </div>
                          <div className="text-right">
                            {getStatusBadge(request.status)}
                            <p className="text-lg font-medium mt-1">£{request.amount}</p>
                          </div>
                        </div>

                        <div className="p-3 bg-white rounded-lg mb-3">
                          <p className="text-sm text-gray-700">{request.reason}</p>
                        </div>

                        <div className="flex gap-2">
                          <Button
                            onClick={() => setSelectedRequest(request)}
                            className="flex-1 text-white"
                            style={{ backgroundColor: '#625d9c' }}
                          >
                            Review Request
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Processed Refunds */}
        <TabsContent value="processed" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Processed Refunds</CardTitle>
              <CardDescription>History of approved and rejected refund requests</CardDescription>
            </CardHeader>
            <CardContent>
              {processedRefunds.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <FileText className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p>No processed refunds</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {processedRefunds.map((request) => (
                    <Card key={request.id} className="bg-gray-50">
                      <CardContent className="pt-6">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <p className="font-medium">{request.parentName}</p>
                            <p className="text-sm text-gray-600">
                              Lesson with {request.tutorName} • {formatDate(request.lessonDate)}
                            </p>
                            <p className="text-xs text-gray-500 mt-1">
                              Processed: {request.processedAt && formatDate(request.processedAt)}
                            </p>
                          </div>
                          <div className="text-right">
                            {getStatusBadge(request.status)}
                            <p className="text-lg font-medium mt-1">£{request.amount}</p>
                          </div>
                        </div>

                        {request.notes && (
                          <div className="p-3 bg-white rounded-lg">
                            <p className="text-xs text-gray-500 mb-1">Admin Notes:</p>
                            <p className="text-sm text-gray-700">{request.notes}</p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Chargebacks */}
        <TabsContent value="chargebacks" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Chargeback Management</CardTitle>
              <CardDescription>Track and respond to payment disputes</CardDescription>
            </CardHeader>
            <CardContent>
              {chargebacks.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <CheckCircle className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p>No active chargebacks</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {chargebacks.map((chargeback) => (
                    <Card key={chargeback.id} className="border-red-200 bg-red-50">
                      <CardContent className="pt-6">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <p className="font-medium">Booking ID: {chargeback.bookingId}</p>
                            <p className="text-sm text-gray-600">
                              Opened: {formatDate(chargeback.openedAt)}
                            </p>
                            <p className="text-sm text-gray-600">
                              Due: {formatDate(chargeback.dueDate)}
                            </p>
                          </div>
                          <div className="text-right">
                            {getStatusBadge(chargeback.status)}
                            <p className="text-lg font-medium mt-1">£{chargeback.amount}</p>
                          </div>
                        </div>

                        <div className="p-3 bg-white rounded-lg mb-3">
                          <p className="text-sm font-medium mb-1">Reason:</p>
                          <p className="text-sm text-gray-700">{chargeback.reason}</p>
                        </div>

                        {chargeback.evidence.length > 0 && (
                          <div className="mb-3">
                            <p className="text-sm font-medium mb-2">Evidence Files:</p>
                            <div className="flex flex-wrap gap-2">
                              {chargeback.evidence.map((file, idx) => (
                                <Badge key={idx} variant="outline">
                                  <FileText className="w-3 h-3 mr-1" />
                                  {file}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}

                        <Button
                          onClick={() => handleExportEvidence(chargeback.id)}
                          variant="outline"
                          size="sm"
                          className="w-full"
                        >
                          <Download className="w-4 h-4 mr-2" />
                          Export Evidence Package
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Info Alert */}
      <Alert className="bg-blue-50 border-blue-200">
        <AlertCircle className="h-4 w-4 text-blue-600" />
        <AlertDescription className="text-blue-800 text-sm">
          <strong>Refund Policy:</strong> Automatic refunds are issued for cancellations made 24+ hours in advance.
          Manual review is required for no-shows, disputes, and late cancellations.
        </AlertDescription>
      </Alert>
    </div>
  );
}