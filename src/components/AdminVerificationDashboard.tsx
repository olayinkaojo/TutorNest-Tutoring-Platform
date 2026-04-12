import { useState, useEffect } from 'react';
import { projectId } from '../utils/supabase/info';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Alert, AlertDescription } from './ui/alert';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  Eye, 
  FileText, 
  AlertTriangle,
  User,
  Shield,
  Calendar
} from 'lucide-react';

interface AdminVerificationDashboardProps {
  session: any;
}

export function AdminVerificationDashboard({ session }: AdminVerificationDashboardProps) {
  const [verifications, setVerifications] = useState<any[]>([]);
  const [selectedVerification, setSelectedVerification] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [reviewing, setReviewing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  const [reviewData, setReviewData] = useState({
    action: 'approve',
    rejectionReason: '',
    kycStatus: 'verified',
    dbsStatus: 'verified',
  });

  useEffect(() => {
    fetchPendingVerifications();
    
    // Poll for new verifications every 30 seconds
    const interval = setInterval(fetchPendingVerifications, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchPendingVerifications = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-cbd74580/admin/verifications/pending`,
        {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch verifications');
      }

      const data = await response.json();
      setVerifications(data.verifications || []);
      console.log('Fetched verifications:', data.verifications);
      console.log('First verification profile:', data.verifications?.[0]?.profile);
    } catch (err: any) {
      console.error('Error fetching verifications:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleReview = async () => {
    if (!selectedVerification) return;

    if (reviewData.action === 'reject' && !reviewData.rejectionReason.trim()) {
      setError('Please provide a rejection reason');
      return;
    }

    try {
      setReviewing(true);
      setError('');

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-cbd74580/admin/verifications/${selectedVerification.userId}/review`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify(reviewData),
        }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to review verification');
      }

      setSuccess(
        reviewData.action === 'approve'
          ? 'Tutor has been verified successfully!'
          : 'Tutor verification has been rejected.'
      );

      // Refresh list
      await fetchPendingVerifications();
      setSelectedVerification(null);
      setReviewData({
        action: 'approve',
        rejectionReason: '',
        kycStatus: 'verified',
        dbsStatus: 'verified',
      });
    } catch (err: any) {
      console.error('Error reviewing verification:', err);
      setError(err.message);
    } finally {
      setReviewing(false);
    }
  };

  const viewDocument = async (userId: string, docType: string) => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-cbd74580/tutors/${userId}/documents/${docType}`,
        {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to retrieve document');
      }

      const data = await response.json();
      window.open(data.url, '_blank');
    } catch (err: any) {
      console.error('Error viewing document:', err);
      setError(err.message);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-green-50 flex items-center justify-center">
        <Clock className="w-8 h-8 animate-spin" style={{ color: '#625d9c' }} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-green-50 p-4 sm:p-6 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1>Tutor Verification Dashboard</h1>
          <p className="text-gray-600 mt-2">
            Review and approve pending tutor applications
          </p>
        </div>

        {error && (
          <Alert className="mb-6 bg-red-50 border-red-200">
            <XCircle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800">{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert className="mb-6 bg-green-50 border-green-200">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">{success}</AlertDescription>
          </Alert>
        )}

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Verifications List */}
          <div className="lg:col-span-1">
            <Card className="p-6">
              <h2 className="mb-4" style={{ color: '#625d9c' }}>
                Pending Verifications ({verifications.length})
              </h2>
              <div className="space-y-3 max-h-[600px] overflow-y-auto">
                {verifications.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">
                    No pending verifications
                  </p>
                ) : (
                  verifications.map((verification) => (
                    <div
                      key={verification.userId}
                      onClick={() => setSelectedVerification(verification)}
                      className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                        selectedVerification?.userId === verification.userId
                          ? 'border-purple-500 bg-purple-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="font-medium">
                            {verification.profile?.fullName || verification.profile?.full_name || verification.profile?.name ||
                              ((verification.profile?.firstName || verification.profile?.lastName)
                                ? `${verification.profile?.firstName ?? ''} ${verification.profile?.lastName ?? ''}`.trim()
                                : 'Unknown Tutor')}
                          </p>
                          <p className="text-sm text-gray-600">{verification.profile?.email}</p>
                          <div className="flex gap-2 mt-2">
                            <Badge variant="outline" className="text-xs">
                              <User className="w-3 h-3 mr-1" />
                              KYC
                            </Badge>
                            {verification.profile?.hasDbsCheck && (
                              <Badge variant="outline" className="text-xs">
                                <Shield className="w-3 h-3 mr-1" />
                                DBS
                              </Badge>
                            )}
                          </div>
                        </div>
                        <Clock className="w-4 h-4 text-gray-400" />
                      </div>
                      <p className="text-xs text-gray-500 mt-2">
                        {new Date(verification.submittedAt).toLocaleDateString()}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </Card>
          </div>

          {/* Verification Details */}
          <div className="lg:col-span-2">
            {selectedVerification ? (
              <Card className="p-6">
                <Tabs defaultValue="details">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="details">Details</TabsTrigger>
                    <TabsTrigger value="documents">Documents</TabsTrigger>
                    <TabsTrigger value="review">Review</TabsTrigger>
                  </TabsList>

                  <TabsContent value="details" className="space-y-6 mt-6">
                    <div>
                      <h2 style={{ color: '#625d9c' }}>
                        {selectedVerification.profile?.firstName && selectedVerification.profile?.lastName 
                          ? `${selectedVerification.profile.firstName} ${selectedVerification.profile.lastName}`
                          : selectedVerification.profile?.fullName || selectedVerification.profile?.full_name || 'Unknown Tutor'}
                      </h2>
                      <p className="text-gray-600">{selectedVerification.profile?.email}</p>
                    </div>

                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <Label>Session Rate</Label>
                        <p className="mt-1">
                          {(selectedVerification.profile?.hourly_rate || selectedVerification.profile?.hourlyRate)
                            ? `₦${Number(selectedVerification.profile?.hourly_rate || selectedVerification.profile?.hourlyRate).toLocaleString()}/session`
                            : 'Not specified'}
                        </p>
                      </div>
                      <div>
                        <Label>Teaching Format</Label>
                        <p className="mt-1">{selectedVerification.profile?.teaching_format || selectedVerification.profile?.teachingFormat || 'Not specified'}</p>
                      </div>
                    </div>

                    <div>
                      <Label>Professional Bio</Label>
                      <p className="mt-2 text-sm text-gray-700 whitespace-pre-wrap">
                        {selectedVerification.profile?.bio || 'No bio provided'}
                      </p>
                    </div>

                    <div>
                      <Label>Subjects</Label>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {selectedVerification.profile?.subjects && selectedVerification.profile.subjects.length > 0 ? (
                          selectedVerification.profile.subjects.map((subject: string) => (
                            <Badge key={subject} variant="secondary">
                              {subject}
                            </Badge>
                          ))
                        ) : (
                          <p className="text-sm text-gray-500">No subjects specified</p>
                        )}
                      </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <Label>Years of Experience</Label>
                        <p className="mt-1">
                          {selectedVerification.profile?.experience_years || selectedVerification.profile?.experienceYears
                            ? `${selectedVerification.profile?.experience_years || selectedVerification.profile?.experienceYears} year(s)`
                            : 'Not specified'}
                        </p>
                      </div>
                      <div>
                        <Label>Location</Label>
                        <p className="mt-1">{selectedVerification.profile?.location || 'Not specified'}</p>
                      </div>
                    </div>

                    <div>
                      <Label>Qualifications & Experience</Label>
                      <p className="mt-2 text-sm text-gray-700 whitespace-pre-wrap">
                        {selectedVerification.profile?.qualifications || 'No qualifications provided'}
                      </p>
                    </div>

                    {/* Additional Tutor Information */}
                    <div className="grid md:grid-cols-2 gap-4 pt-4 border-t">
                      <div>
                        <Label>Phone</Label>
                        <p className="mt-1">{selectedVerification.profile?.phone || 'Not provided'}</p>
                      </div>
                      <div>
                        <Label>Group Size Preference</Label>
                        <p className="mt-1">{selectedVerification.profile?.group_size || selectedVerification.profile?.groupSize || 'Not specified'}</p>
                      </div>
                    </div>

                    {(selectedVerification.profile?.age_groups || selectedVerification.profile?.ageGroups) && (
                      <div>
                        <Label>Age Groups</Label>
                        <div className="flex flex-wrap gap-2 mt-2">
                          {(selectedVerification.profile?.age_groups || selectedVerification.profile?.ageGroups)?.map((age: string) => (
                            <Badge key={age} variant="outline">
                              {age}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {(selectedVerification.profile?.classes) && (
                      <div>
                        <Label>Classes/Year Groups</Label>
                        <div className="flex flex-wrap gap-2 mt-2">
                          {selectedVerification.profile?.classes?.map((cls: string) => (
                            <Badge key={cls} variant="outline">
                              {cls}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {(selectedVerification.profile?.exam_boards || selectedVerification.profile?.examBoards) && (
                      <div>
                        <Label>Exam Boards</Label>
                        <div className="flex flex-wrap gap-2 mt-2">
                          {(selectedVerification.profile?.exam_boards || selectedVerification.profile?.examBoards)?.map((board: string) => (
                            <Badge key={board} variant="outline">
                              {board}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {(selectedVerification.profile?.learning_difficulties || selectedVerification.profile?.learningDifficulties) && (
                      <div>
                        <Label>Learning Difficulties Support</Label>
                        <div className="flex flex-wrap gap-2 mt-2">
                          {(selectedVerification.profile?.learning_difficulties || selectedVerification.profile?.learningDifficulties)?.map((diff: string) => (
                            <Badge key={diff} variant="outline">
                              {diff}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {(selectedVerification.profile?.methodologies) && (
                      <div>
                        <Label>Teaching Methodologies</Label>
                        <div className="flex flex-wrap gap-2 mt-2">
                          {selectedVerification.profile?.methodologies?.map((method: string) => (
                            <Badge key={method} variant="outline">
                              {method}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {(selectedVerification.profile?.languages) && (
                      <div>
                        <Label>Languages Spoken</Label>
                        <div className="flex flex-wrap gap-2 mt-2">
                          {selectedVerification.profile?.languages?.map((lang: string) => (
                            <Badge key={lang} variant="outline">
                              {lang}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {(selectedVerification.profile?.teaching_style || selectedVerification.profile?.teachingStyle) && (
                      <div>
                        <Label>Teaching Style</Label>
                        <p className="mt-2 text-sm text-gray-700 whitespace-pre-wrap">
                          {selectedVerification.profile?.teaching_style || selectedVerification.profile?.teachingStyle}
                        </p>
                      </div>
                    )}

                    <div className="grid md:grid-cols-2 gap-4 pt-4 border-t">
                      <div>
                        <Label>DBS Checked</Label>
                        <p className="mt-1">
                          {selectedVerification.profile?.dbs_checked || selectedVerification.profile?.dbsChecked ? (
                            <Badge variant="default" className="bg-green-600">Yes</Badge>
                          ) : (
                            <Badge variant="outline">No</Badge>
                          )}
                        </p>
                      </div>
                      <div>
                        <Label>Professional Insurance</Label>
                        <p className="mt-1">
                          {selectedVerification.profile?.has_insurance || selectedVerification.profile?.hasInsurance ? (
                            <Badge variant="default" className="bg-green-600">Yes</Badge>
                          ) : (
                            <Badge variant="outline">No</Badge>
                          )}
                        </p>
                      </div>
                    </div>

                    {selectedVerification.profile?.hasDbsCheck && (
                      <div className="border-t pt-4">
                        <h3 className="mb-3">DBS Information</h3>
                        <div className="grid md:grid-cols-2 gap-4">
                          <div>
                            <Label>DBS Number</Label>
                            <p className="mt-1">{selectedVerification.profile?.dbsNumber}</p>
                          </div>
                          <div>
                            <Label>Issue Date</Label>
                            <p className="mt-1">
                              <Calendar className="w-4 h-4 inline mr-1" />
                              {new Date(selectedVerification.profile?.dbsIssueDate).toLocaleDateString()}
                            </p>
                          </div>
                          {selectedVerification.profile?.dbsExpiryDate && (
                            <div>
                              <Label>Expiry Date</Label>
                              <p className="mt-1">
                                <Calendar className="w-4 h-4 inline mr-1" />
                                {new Date(selectedVerification.profile?.dbsExpiryDate).toLocaleDateString()}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="documents" className="space-y-4 mt-6">
                    <div className="space-y-3">
                      {selectedVerification.profile?.documents?.photo && (
                        <Button
                          variant="outline"
                          className="w-full justify-start"
                          onClick={() => viewDocument(selectedVerification.userId, 'photo')}
                        >
                          <Eye className="w-4 h-4 mr-2" />
                          View Profile Photo
                        </Button>
                      )}

                      {selectedVerification.profile?.documents?.idDocument && (
                        <Button
                          variant="outline"
                          className="w-full justify-start"
                          onClick={() => viewDocument(selectedVerification.userId, 'id')}
                        >
                          <FileText className="w-4 h-4 mr-2" />
                          View ID Document (KYC)
                        </Button>
                      )}

                      {selectedVerification.profile?.documents?.dbsDocument && (
                        <Button
                          variant="outline"
                          className="w-full justify-start"
                          onClick={() => viewDocument(selectedVerification.userId, 'dbs')}
                        >
                          <Shield className="w-4 h-4 mr-2" />
                          View DBS Certificate
                        </Button>
                      )}

                      {selectedVerification.profile?.documents?.certificates?.length > 0 && (
                        <div>
                          <Label className="mb-2 block">Qualification Certificates</Label>
                          {selectedVerification.profile.documents.certificates.map(
                            (cert: string, index: number) => (
                              <Alert key={index} className="mb-2">
                                <FileText className="h-4 w-4" />
                                <AlertDescription>
                                  Certificate {index + 1} uploaded
                                </AlertDescription>
                              </Alert>
                            )
                          )}
                        </div>
                      )}
                    </div>
                  </TabsContent>

                  <TabsContent value="review" className="space-y-6 mt-6">
                    <div>
                      <Label>Decision</Label>
                      <Select
                        value={reviewData.action}
                        onValueChange={(value) =>
                          setReviewData({ ...reviewData, action: value })
                        }
                      >
                        <SelectTrigger className="mt-2">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="approve">
                            <span className="flex items-center">
                              <CheckCircle className="w-4 h-4 mr-2 text-green-600" />
                              Approve
                            </span>
                          </SelectItem>
                          <SelectItem value="reject">
                            <span className="flex items-center">
                              <XCircle className="w-4 h-4 mr-2 text-red-600" />
                              Reject
                            </span>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {reviewData.action === 'approve' && (
                      <>
                        <div>
                          <Label>KYC Status</Label>
                          <Select
                            value={reviewData.kycStatus}
                            onValueChange={(value) =>
                              setReviewData({ ...reviewData, kycStatus: value })
                            }
                          >
                            <SelectTrigger className="mt-2">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="verified">Verified</SelectItem>
                              <SelectItem value="pending">Pending</SelectItem>
                              <SelectItem value="rejected">Rejected</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        {selectedVerification.profile?.hasDbsCheck && (
                          <div>
                            <Label>DBS Status</Label>
                            <Select
                              value={reviewData.dbsStatus}
                              onValueChange={(value) =>
                                setReviewData({ ...reviewData, dbsStatus: value })
                              }
                            >
                              <SelectTrigger className="mt-2">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="verified">Verified</SelectItem>
                                <SelectItem value="pending">Pending</SelectItem>
                                <SelectItem value="rejected">Rejected</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        )}
                      </>
                    )}

                    {reviewData.action === 'reject' && (
                      <div>
                        <Label>Rejection Reason</Label>
                        <Textarea
                          value={reviewData.rejectionReason}
                          onChange={(e) =>
                            setReviewData({ ...reviewData, rejectionReason: e.target.value })
                          }
                          placeholder="Provide a detailed reason for rejection. The tutor will see this message and can appeal."
                          className="mt-2"
                          rows={5}
                        />
                      </div>
                    )}

                    <Alert className="bg-blue-50 border-blue-200">
                      <AlertTriangle className="h-4 w-4 text-blue-600" />
                      <AlertDescription className="text-blue-800 text-sm">
                        {reviewData.action === 'approve'
                          ? 'This tutor will be able to accept bookings once approved.'
                          : 'This tutor will be notified of the rejection and can submit an appeal.'}
                      </AlertDescription>
                    </Alert>

                    <Button
                      onClick={handleReview}
                      disabled={reviewing}
                      className="w-full h-12 text-white"
                      style={{
                        backgroundColor:
                          reviewData.action === 'approve' ? '#5d9827' : '#dc2626',
                      }}
                    >
                      {reviewing
                        ? 'Processing...'
                        : reviewData.action === 'approve'
                        ? 'Approve Tutor'
                        : 'Reject Application'}
                    </Button>
                  </TabsContent>
                </Tabs>
              </Card>
            ) : (
              <Card className="p-12 text-center">
                <FileText className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                <p className="text-gray-500">
                  Select a verification from the list to review
                </p>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}