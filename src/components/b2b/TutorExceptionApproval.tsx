import React, { useState, useEffect } from 'react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Textarea } from '../ui/textarea';
import { 
  AlertCircle,
  CheckCircle2,
  XCircle,
  Clock,
  User,
  FileText,
  Loader2
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { projectId } from '../../utils/supabase/info';

interface ExceptionRequest {
  id: string;
  requestedBy: string;
  requestedByEmail: string;
  studentName: string;
  studentId: string;
  tutorName: string;
  tutorId: string;
  tutorEmail: string;
  reason: string;
  sessionDetails: {
    subject: string;
    date: string;
    duration: number;
  };
  status: 'pending' | 'approved' | 'rejected';
  requestedAt: string;
  reviewedAt?: string;
  reviewedBy?: string;
  reviewNotes?: string;
}

interface TutorExceptionApprovalProps {
  organisationId: string;
  accessToken: string;
  isCoordinator: boolean;
}

export function TutorExceptionApproval({ 
  organisationId, 
  accessToken, 
  isCoordinator 
}: TutorExceptionApprovalProps) {
  const [requests, setRequests] = useState<ExceptionRequest[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<ExceptionRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [reviewing, setReviewing] = useState(false);
  const [reviewNotes, setReviewNotes] = useState('');
  const [filter, setFilter] = useState<'pending' | 'all'>('pending');

  useEffect(() => {
    loadRequests();
  }, [organisationId, filter]);

  const loadRequests = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-cbd74580/organisations/${organisationId}/tutor-exceptions?status=${filter}`,
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
      console.error('Error loading exception requests:', error);
      toast.error('Failed to load exception requests');
    } finally {
      setLoading(false);
    }
  };

  const handleApproveReject = async (requestId: string, action: 'approve' | 'reject') => {
    if (!reviewNotes.trim() && action === 'reject') {
      toast.error('Please provide a reason for rejection');
      return;
    }

    setReviewing(true);
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-cbd74580/organisations/${organisationId}/tutor-exceptions/${requestId}/${action}`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            notes: reviewNotes
          })
        }
      );

      if (response.ok) {
        toast.success(`Exception ${action}d successfully`);
        setReviewNotes('');
        setSelectedRequest(null);
        loadRequests();
      } else {
        toast.error(`Failed to ${action} exception`);
      }
    } catch (error) {
      console.error(`Error ${action}ing exception:`, error);
      toast.error(`Failed to ${action} exception`);
    } finally {
      setReviewing(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const pendingCount = requests.filter(r => r.status === 'pending').length;

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="w-8 h-8 animate-spin text-[#625d9c]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-2xl">Tutor Exception Requests</h3>
          <p className="text-gray-600 mt-1">
            Review requests to book tutors outside the approved pool
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant={filter === 'pending' ? 'default' : 'outline'}
            onClick={() => setFilter('pending')}
            className={filter === 'pending' ? 'bg-[#625d9c]' : ''}
          >
            <Clock className="w-4 h-4 mr-2" />
            Pending ({pendingCount})
          </Button>
          <Button
            variant={filter === 'all' ? 'default' : 'outline'}
            onClick={() => setFilter('all')}
            className={filter === 'all' ? 'bg-[#625d9c]' : ''}
          >
            All Requests
          </Button>
        </div>
      </div>

      {pendingCount > 0 && filter === 'pending' && (
        <Card className="p-4 bg-yellow-50 border-yellow-200">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-yellow-900">
              <p className="font-medium">Action Required</p>
              <p className="mt-1">
                {pendingCount} exception request{pendingCount !== 1 ? 's' : ''} pending your review
              </p>
            </div>
          </div>
        </Card>
      )}

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Request List */}
        <Card className="p-6">
          <h4 className="font-medium mb-4">
            Requests ({requests.length})
          </h4>
          <div className="space-y-2 max-h-[600px] overflow-y-auto">
            {requests.map((request) => (
              <Card
                key={request.id}
                className={`p-4 cursor-pointer hover:border-[#625d9c] transition-colors ${
                  selectedRequest?.id === request.id ? 'border-[#625d9c] border-2' : ''
                }`}
                onClick={() => setSelectedRequest(request)}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h5 className="font-medium">{request.studentName}</h5>
                      <Badge className={getStatusColor(request.status)}>
                        {request.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-600">
                      Tutor: {request.tutorName}
                    </p>
                    <p className="text-sm text-gray-600">
                      {request.sessionDetails.subject} • {new Date(request.sessionDetails.date).toLocaleDateString()}
                    </p>
                  </div>
                  {request.status === 'pending' && (
                    <Clock className="w-5 h-5 text-yellow-600" />
                  )}
                </div>

                <div className="text-xs text-gray-500 mt-2">
                  Requested by {request.requestedBy} • {new Date(request.requestedAt).toLocaleDateString()}
                </div>
              </Card>
            ))}

            {requests.length === 0 && (
              <div className="text-center py-12 text-gray-500">
                <FileText className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                <p>No {filter === 'pending' ? 'pending ' : ''}requests found</p>
              </div>
            )}
          </div>
        </Card>

        {/* Request Details */}
        <Card className="p-6">
          {selectedRequest ? (
            <div className="space-y-6">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-xl">Exception Details</h4>
                  <Badge className={getStatusColor(selectedRequest.status)}>
                    {selectedRequest.status}
                  </Badge>
                </div>

                <div className="space-y-4">
                  {/* Student Info */}
                  <div>
                    <h5 className="font-medium mb-2">Student</h5>
                    <Card className="p-3 bg-gray-50">
                      <p className="font-medium">{selectedRequest.studentName}</p>
                      <p className="text-sm text-gray-600">ID: {selectedRequest.studentId}</p>
                    </Card>
                  </div>

                  {/* Tutor Info */}
                  <div>
                    <h5 className="font-medium mb-2">Requested Tutor (Not in Approved Pool)</h5>
                    <Card className="p-3 bg-red-50 border-red-200">
                      <div className="flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
                        <div className="flex-1">
                          <p className="font-medium text-red-900">{selectedRequest.tutorName}</p>
                          <p className="text-sm text-red-700">{selectedRequest.tutorEmail}</p>
                          <p className="text-xs text-red-600 mt-1">
                            This tutor is not in your organisation's approved pool
                          </p>
                        </div>
                      </div>
                    </Card>
                  </div>

                  {/* Session Details */}
                  <div>
                    <h5 className="font-medium mb-2">Session Details</h5>
                    <Card className="p-3 bg-gray-50">
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <span className="text-gray-600">Subject:</span>
                          <p className="font-medium">{selectedRequest.sessionDetails.subject}</p>
                        </div>
                        <div>
                          <span className="text-gray-600">Duration:</span>
                          <p className="font-medium">{selectedRequest.sessionDetails.duration} min</p>
                        </div>
                        <div className="col-span-2">
                          <span className="text-gray-600">Date:</span>
                          <p className="font-medium">
                            {new Date(selectedRequest.sessionDetails.date).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    </Card>
                  </div>

                  {/* Request Details */}
                  <div>
                    <h5 className="font-medium mb-2">Reason for Exception</h5>
                    <Card className="p-3 bg-blue-50 border-blue-200">
                      <p className="text-sm text-blue-900">{selectedRequest.reason}</p>
                    </Card>
                  </div>

                  {/* Requester */}
                  <div className="text-sm text-gray-600">
                    <p>Requested by: <strong>{selectedRequest.requestedBy}</strong></p>
                    <p>Email: {selectedRequest.requestedByEmail}</p>
                    <p>Date: {new Date(selectedRequest.requestedAt).toLocaleString()}</p>
                  </div>

                  {/* Review Info (if reviewed) */}
                  {selectedRequest.status !== 'pending' && selectedRequest.reviewedBy && (
                    <div>
                      <h5 className="font-medium mb-2">Review</h5>
                      <Card className={`p-3 ${
                        selectedRequest.status === 'approved' 
                          ? 'bg-green-50 border-green-200' 
                          : 'bg-red-50 border-red-200'
                      }`}>
                        <p className="text-sm mb-2">
                          <strong>Reviewed by:</strong> {selectedRequest.reviewedBy}
                        </p>
                        <p className="text-sm mb-2">
                          <strong>Date:</strong> {new Date(selectedRequest.reviewedAt!).toLocaleString()}
                        </p>
                        {selectedRequest.reviewNotes && (
                          <p className="text-sm">
                            <strong>Notes:</strong> {selectedRequest.reviewNotes}
                          </p>
                        )}
                      </Card>
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              {selectedRequest.status === 'pending' && isCoordinator && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Review Notes {selectedRequest.status === 'pending' && '(Required for rejection)'}
                    </label>
                    <Textarea
                      placeholder="Add your notes here..."
                      value={reviewNotes}
                      onChange={(e) => setReviewNotes(e.target.value)}
                      rows={3}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <Button
                      variant="outline"
                      onClick={() => handleApproveReject(selectedRequest.id, 'reject')}
                      disabled={reviewing}
                      className="text-red-600"
                    >
                      <XCircle className="w-4 h-4 mr-2" />
                      Reject
                    </Button>
                    <Button
                      onClick={() => handleApproveReject(selectedRequest.id, 'approve')}
                      disabled={reviewing}
                      className="bg-[#5d9827] hover:bg-[#4a7a1f]"
                    >
                      {reviewing ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-4 h-4 mr-2" />
                          Approve
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500">
              <User className="w-16 h-16 mx-auto mb-4 text-gray-400" />
              <p>Select a request to view details</p>
            </div>
          )}
        </Card>
      </div>

      {/* Info Card */}
      <Card className="p-6 bg-gray-50">
        <h5 className="font-medium mb-2">About Exception Requests</h5>
        <div className="text-sm text-gray-700 space-y-2">
          <p>
            When your organisation has "Restrict to Approved Tutors" enabled, students and parents
            can request exceptions to book with tutors outside your approved pool.
          </p>
          <p>
            As a coordinator, you can review these requests and approve or reject them based on:
          </p>
          <ul className="list-disc list-inside ml-4 space-y-1">
            <li>The reason provided for the exception</li>
            <li>The tutor's qualifications and experience</li>
            <li>The specific needs of the student</li>
            <li>Your organisation's policies</li>
          </ul>
        </div>
      </Card>
    </div>
  );
}
