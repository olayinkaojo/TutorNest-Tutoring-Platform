import { useState, useEffect, useCallback } from 'react';
import { projectId } from '../utils/supabase/info';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Alert, AlertDescription } from './ui/alert';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Input } from './ui/input';
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  Eye, 
  FileText, 
  AlertTriangle,
  User,
  Shield,
  Calendar,
  TrendingUp,
  Filter,
  Search,
  ChevronDown,
  Download,
  Flag,
  CheckSquare,
  Square,
  BarChart3,
  RefreshCw,
  AlertCircle
} from 'lucide-react';

interface AdminVerificationDashboardProps {
  session: any;
}

interface VerificationMetrics {
  total_pending: number;
  total_approved: number;
  total_rejected: number;
  approval_rate: number;
  avg_review_time_hours: number;
  document_issues: number;
}

interface VerificationRecord {
  userId: string;
  profile: any;
  submittedAt: string;
  status?: string;
  reviewer?: string;
  reviewedAt?: string;
  rejectionReason?: string;
  riskFlags?: string[];
  documentStatus?: Record<string, string>;
}

export function EnhancedAdminVerificationDashboard({ session }: AdminVerificationDashboardProps) {
  const [verifications, setVerifications] = useState<VerificationRecord[]>([]);
  const [selectedVerification, setSelectedVerification] = useState<VerificationRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [reviewing, setReviewing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [metrics, setMetrics] = useState<VerificationMetrics>({
    total_pending: 0,
    total_approved: 0,
    total_rejected: 0,
    approval_rate: 0,
    avg_review_time_hours: 0,
    document_issues: 0,
  });

  // Filter and search states
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('newest');
  const [selectedForBulk, setSelectedForBulk] = useState<Set<string>>(new Set());
  const [showHistory, setShowHistory] = useState(false);

  const [reviewData, setReviewData] = useState({
    action: 'approve',
    rejectionReason: '',
    kycStatus: 'verified',
    dbsStatus: 'verified',
  });

  // Fetch verifications with metrics
  const fetchVerifications = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-cbd74580/admin/verifications${
          showHistory ? '/history' : '/pending'
        }`,
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

      // Fetch metrics
      const metricsResponse = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-cbd74580/admin/verifications/metrics`,
        {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        }
      );

      if (metricsResponse.ok) {
        const metricsData = await metricsResponse.json();
        setMetrics(metricsData.metrics);
      }

      setError('');
    } catch (err: any) {
      console.error('Error fetching verifications:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [session.access_token, showHistory]);

  useEffect(() => {
    fetchVerifications();
    const interval = setInterval(fetchVerifications, 30000);
    return () => clearInterval(interval);
  }, [fetchVerifications]);

  // Filter and search logic
  const filteredVerifications = verifications.filter((v) => {
    const matchesSearch =
      !searchQuery ||
      v.profile?.fullName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      v.profile?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      v.profile?.email?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus =
      filterStatus === 'all' || 
      (filterStatus === 'with_issues' && v.riskFlags && v.riskFlags.length > 0) ||
      (filterStatus === 'doc_issues' && v.documentStatus && 
        Object.values(v.documentStatus).some(s => s !== 'verified'));

    return matchesSearch && matchesStatus;
  });

  const sortedVerifications = [...filteredVerifications].sort((a, b) => {
    const getDate = (v: VerificationRecord) => new Date(v.reviewedAt || v.submittedAt).getTime();
    
    if (sortBy === 'newest') {
      return getDate(b) - getDate(a);
    } else if (sortBy === 'oldest') {
      return getDate(a) - getDate(b);
    } else if (sortBy === 'name') {
      const nameA = a.profile?.fullName || a.profile?.full_name || '';
      const nameB = b.profile?.fullName || b.profile?.full_name || '';
      return nameA.localeCompare(nameB);
    }
    return 0;
  });

  // Data validation check
  const validateTutorData = (profile: any): string[] => {
    const issues: string[] = [];

    if (!profile?.fullName && !profile?.full_name) issues.push('Missing full name');
    if (!profile?.email) issues.push('Missing email');
    if (!profile?.phone) issues.push('Missing phone');
    if (!profile?.qualifications) issues.push('Missing qualifications');
    if (!profile?.subjects || profile.subjects.length === 0) issues.push('No subjects specified');
    if (!profile?.teaching_format && !profile?.teachingFormat) issues.push('Teaching format not specified');
    if (!profile?.hourly_rate && !profile?.hourlyRate) issues.push('Rate not specified');

    // Document verification issues
    if (!profile?.documents?.photo) issues.push('Profile photo missing');
    if (!profile?.documents?.idDocument) issues.push('ID document missing');
    if (profile?.hasDbsCheck && !profile?.documents?.dbsDocument) issues.push('DBS certificate missing');

    // DBS expiry check
    if (profile?.dbsExpiryDate) {
      const expiryDate = new Date(profile.dbsExpiryDate);
      const today = new Date();
      const daysUntilExpiry = Math.floor((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      if (daysUntilExpiry < 30) issues.push(`DBS expires in ${daysUntilExpiry} days`);
    }

    return issues;
  };

  // Risk flag detection
  const detectRiskFlags = (profile: any): string[] => {
    const flags: string[] = [];

    // Check for inconsistencies
    if (profile?.hourly_rate && profile.hourly_rate > 50000) {
      flags.push('Unusually high rate');
    }
    if (profile?.experience_years > 50) {
      flags.push('Implausible experience');
    }

    // Check for missing documents
    const hasKyc = profile?.documents?.idDocument;
    const hasPhoto = profile?.documents?.photo;
    if (!hasKyc || !hasPhoto) {
      flags.push('Essential documents missing');
    }

    // Check profile completeness
    if (!profile?.bio || profile.bio.length < 20) {
      flags.push('Incomplete bio');
    }

    return flags;
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
          body: JSON.stringify({
            ...reviewData,
            reviewer_id: session.user?.id,
            reviewed_at: new Date().toISOString(),
          }),
        }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to review verification');
      }

      setSuccess(
        reviewData.action === 'approve'
          ? 'Tutor verified successfully!'
          : 'Application rejected.'
      );

      await fetchVerifications();
      setSelectedVerification(null);
      setReviewData({
        action: 'approve',
        rejectionReason: '',
        kycStatus: 'verified',
        dbsStatus: 'verified',
      });
    } catch (err: any) {
      console.error('Error reviewing:', err);
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

  const toggleBulkSelect = (userId: string) => {
    const newSelected = new Set(selectedForBulk);
    if (newSelected.has(userId)) {
      newSelected.delete(userId);
    } else {
      newSelected.add(userId);
    }
    setSelectedForBulk(newSelected);
  };

  const toggleAllSelect = () => {
    if (selectedForBulk.size === sortedVerifications.length) {
      setSelectedForBulk(new Set());
    } else {
      setSelectedForBulk(new Set(sortedVerifications.map(v => v.userId)));
    }
  };

  const exportData = () => {
    const csv = [
      ['Name', 'Email', 'Phone', 'Subjects', 'Rate', 'Status', 'Submitted Date', 'Risk Flags'],
      ...sortedVerifications.map(v => [
        v.profile?.fullName || v.profile?.full_name || '',
        v.profile?.email || '',
        v.profile?.phone || '',
        (v.profile?.subjects || []).join('; '),
        v.profile?.hourly_rate || '',
        v.status || 'pending',
        new Date(v.submittedAt).toLocaleDateString(),
        (v.riskFlags || []).join('; '),
      ]),
    ]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `verifications-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-green-50 flex items-center justify-center">
        <Clock className="w-8 h-8 animate-spin" style={{ color: '#625d9c' }} />
      </div>
    );
  }

  const riskFlagsForSelected = selectedVerification ? detectRiskFlags(selectedVerification.profile) : [];
  const validationIssues = selectedVerification ? validateTutorData(selectedVerification.profile) : [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-green-50 p-4 sm:p-6 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold" style={{ color: '#625d9c' }}>
            Tutor Verification Management
          </h1>
          <p className="text-gray-600 mt-2">
            Review and approve tutor applications with advanced filtering and batch operations
          </p>
        </div>

        {/* Metrics Dashboard */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4 mb-8">
          <Card className="bg-white">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">Pending</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" style={{ color: '#625d9c' }}>
                {metrics.total_pending}
              </div>
              <p className="text-xs text-gray-500 mt-1">Awaiting review</p>
            </CardContent>
          </Card>

          <Card className="bg-white">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">Approved</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {metrics.total_approved}
              </div>
              <p className="text-xs text-gray-500 mt-1">Total verified</p>
            </CardContent>
          </Card>

          <Card className="bg-white">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">Rejected</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {metrics.total_rejected}
              </div>
              <p className="text-xs text-gray-500 mt-1">Not approved</p>
            </CardContent>
          </Card>

          <Card className="bg-white">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">Approval Rate</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {metrics.approval_rate.toFixed(1)}%
              </div>
              <p className="text-xs text-gray-500 mt-1">Approved of total</p>
            </CardContent>
          </Card>

          <Card className="bg-white">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">Avg Review Time</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">
                {metrics.avg_review_time_hours.toFixed(1)}h
              </div>
              <p className="text-xs text-gray-500 mt-1">Hours to review</p>
            </CardContent>
          </Card>

          <Card className="bg-white">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">Doc Issues</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {metrics.document_issues}
              </div>
              <p className="text-xs text-gray-500 mt-1">Need attention</p>
            </CardContent>
          </Card>
        </div>

        {/* Alerts */}
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

        {/* Controls */}
        <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6 space-y-4">
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={() => setShowHistory(!showHistory)}
              variant={showHistory ? 'default' : 'outline'}
              className="gap-2"
            >
              <Clock className="w-4 h-4" />
              {showHistory ? 'Hide History' : 'Show History'}
            </Button>
            <Button
              onClick={fetchVerifications}
              variant="outline"
              className="gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </Button>
            <Button
              onClick={exportData}
              variant="outline"
              className="gap-2"
            >
              <Download className="w-4 h-4" />
              Export CSV
            </Button>
          </div>

          {/* Search and Filters */}
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search by name, email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-sm mb-2 block">Filter By</Label>
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Records</SelectItem>
                    <SelectItem value="with_issues">With Risk Flags</SelectItem>
                    <SelectItem value="doc_issues">Document Issues</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-sm mb-2 block">Sort By</Label>
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="newest">Newest First</SelectItem>
                    <SelectItem value="oldest">Oldest First</SelectItem>
                    <SelectItem value="name">Name (A-Z)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Verifications List */}
          <div className="lg:col-span-1">
            <Card className="p-6 max-h-[800px] overflow-hidden flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <h2 style={{ color: '#625d9c' }} className="font-semibold">
                  Verifications ({sortedVerifications.length})
                </h2>
                {sortedVerifications.length > 0 && (
                  <button
                    onClick={toggleAllSelect}
                    className="p-1 hover:bg-gray-100 rounded"
                    title={selectedForBulk.size === sortedVerifications.length ? 'Deselect all' : 'Select all'}
                  >
                    {selectedForBulk.size === sortedVerifications.length ? (
                      <CheckSquare className="w-5 h-5 text-blue-600" />
                    ) : (
                      <Square className="w-5 h-5 text-gray-400" />
                    )}
                  </button>
                )}
              </div>

              <div className="overflow-y-auto flex-1 space-y-2">
                {sortedVerifications.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">
                    No verifications found
                  </p>
                ) : (
                  sortedVerifications.map((verification) => {
                    const risks = detectRiskFlags(verification.profile);
                    const isSelected = selectedForBulk.has(verification.userId);

                    return (
                      <div
                        key={verification.userId}
                        onClick={() => setSelectedVerification(verification)}
                        className={`p-3 rounded-lg border-2 cursor-pointer transition-all flex gap-2 ${
                          selectedVerification?.userId === verification.userId
                            ? 'border-purple-500 bg-purple-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleBulkSelect(verification.userId);
                          }}
                          className="mt-1 flex-shrink-0"
                        >
                          {isSelected ? (
                            <CheckSquare className="w-4 h-4 text-blue-600" />
                          ) : (
                            <Square className="w-4 h-4 text-gray-300" />
                          )}
                        </button>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-1">
                            <p className="font-medium text-sm truncate">
                              {verification.profile?.fullName ||
                                verification.profile?.full_name ||
                                'Unknown'}
                            </p>
                            {risks.length > 0 && (
                              <Flag className="w-4 h-4 text-red-500 flex-shrink-0" />
                            )}
                          </div>
                          <p className="text-xs text-gray-600 truncate">
                            {verification.profile?.email}
                          </p>
                          <div className="flex gap-1 mt-1">
                            {verification.profile?.subjects && verification.profile.subjects.length > 0 && (
                              <Badge variant="outline" className="text-xs">
                                {verification.profile.subjects[0]}
                              </Badge>
                            )}
                            {verification.riskFlags && verification.riskFlags.length > 0 && (
                              <Badge variant="destructive" className="text-xs">
                                {verification.riskFlags.length} flags
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </Card>
          </div>

          {/* Details Panel */}
          <div className="lg:col-span-2">
            {selectedVerification ? (
              <Card className="p-6 max-h-[800px] overflow-hidden flex flex-col">
                <Tabs defaultValue="details" className="flex flex-col h-full">
                  <TabsList className="grid w-full grid-cols-4">
                    <TabsTrigger value="details">Details</TabsTrigger>
                    <TabsTrigger value="documents">Documents</TabsTrigger>
                    <TabsTrigger value="review">Review</TabsTrigger>
                    <TabsTrigger value="audit" className="text-xs">Audit</TabsTrigger>
                  </TabsList>

                  {/* Details Tab */}
                  <TabsContent value="details" className="overflow-y-auto flex-1 space-y-4 mt-4">
                    {/* Risk Flags */}
                    {riskFlagsForSelected.length > 0 && (
                      <Alert className="bg-orange-50 border-orange-200">
                        <AlertTriangle className="h-4 w-4 text-orange-600" />
                        <AlertDescription className="text-orange-800 text-sm">
                          <strong>Risk Flags ({riskFlagsForSelected.length}):</strong><br />
                          {riskFlagsForSelected.map((flag, i) => (
                            <div key={i}>• {flag}</div>
                          ))}
                        </AlertDescription>
                      </Alert>
                    )}

                    {/* Validation Issues */}
                    {validationIssues.length > 0 && (
                      <Alert className="bg-yellow-50 border-yellow-200">
                        <AlertCircle className="h-4 w-4 text-yellow-600" />
                        <AlertDescription className="text-yellow-800 text-sm">
                          <strong>Data Issues ({validationIssues.length}):</strong><br />
                          {validationIssues.map((issue, i) => (
                            <div key={i}>• {issue}</div>
                          ))}
                        </AlertDescription>
                      </Alert>
                    )}

                    {/* Tutor Profile */}
                    <div className="flex items-start gap-4 border-b pb-4">
                      {selectedVerification.profile?.photo_url || selectedVerification.profile?.photoUrl ? (
                        <img
                          src={selectedVerification.profile.photo_url || selectedVerification.profile.photoUrl}
                          alt="Profile"
                          className="w-20 h-20 rounded-full object-cover border-2 border-purple-200 flex-shrink-0"
                        />
                      ) : (
                        <div className="w-20 h-20 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
                          <User className="w-10 h-10 text-purple-400" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <h2 style={{ color: '#625d9c' }} className="font-semibold">
                          {selectedVerification.profile?.fullName || selectedVerification.profile?.full_name}
                        </h2>
                        <p className="text-sm text-gray-600">{selectedVerification.profile?.email}</p>
                        <p className="text-sm text-gray-600">{selectedVerification.profile?.phone}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          Submitted: {new Date(selectedVerification.submittedAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>

                    {/* Professional Info */}
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <Label className="text-xs text-gray-600">Subjects</Label>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {selectedVerification.profile?.subjects?.map((s: string) => (
                            <Badge key={s} variant="secondary" className="text-xs">
                              {s}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      <div>
                        <Label className="text-xs text-gray-600">Rate</Label>
                        <p className="text-sm">
                          ₦{Number(
                            selectedVerification.profile?.hourly_rate ||
                            selectedVerification.profile?.hourlyRate ||
                            0
                          ).toLocaleString()}/session
                        </p>
                      </div>
                    </div>

                    <div>
                      <Label className="text-xs text-gray-600">Professional Bio</Label>
                      <p className="text-sm text-gray-700 mt-1 whitespace-pre-wrap line-clamp-4">
                        {selectedVerification.profile?.bio || 'Not provided'}
                      </p>
                    </div>

                    <div className="grid md:grid-cols-2 gap-4 pt-4 border-t">
                      <div>
                        <Label className="text-xs text-gray-600">Experience</Label>
                        <p className="text-sm">
                          {selectedVerification.profile?.experience_years ||
                            selectedVerification.profile?.experienceYears ||
                            0} years
                        </p>
                      </div>
                      <div>
                        <Label className="text-xs text-gray-600">Location</Label>
                        <p className="text-sm">
                          {selectedVerification.profile?.location || 'Not specified'}
                        </p>
                      </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <Label className="text-xs text-gray-600">DBS Checked</Label>
                        <Badge
                          variant={selectedVerification.profile?.dbsChecked || selectedVerification.profile?.dbs_checked ? 'default' : 'outline'}
                          className={selectedVerification.profile?.dbsChecked || selectedVerification.profile?.dbs_checked ? 'bg-green-600' : ''}
                        >
                          {selectedVerification.profile?.dbsChecked || selectedVerification.profile?.dbs_checked ? 'Yes' : 'No'}
                        </Badge>
                      </div>
                      <div>
                        <Label className="text-xs text-gray-600">Insurance</Label>
                        <Badge
                          variant={selectedVerification.profile?.hasInsurance || selectedVerification.profile?.has_insurance ? 'default' : 'outline'}
                          className={selectedVerification.profile?.hasInsurance || selectedVerification.profile?.has_insurance ? 'bg-green-600' : ''}
                        >
                          {selectedVerification.profile?.hasInsurance || selectedVerification.profile?.has_insurance ? 'Yes' : 'No'}
                        </Badge>
                      </div>
                    </div>
                  </TabsContent>

                  {/* Documents Tab */}
                  <TabsContent value="documents" className="overflow-y-auto flex-1 space-y-3 mt-4">
                    <div className="space-y-2">
                      {selectedVerification.profile?.documents?.photo && (
                        <Button
                          variant="outline"
                          className="w-full justify-start"
                          onClick={() => viewDocument(selectedVerification.userId, 'photo')}
                        >
                          <Eye className="w-4 h-4 mr-2" />
                          Profile Photo
                          {selectedVerification.documentStatus?.photo === 'verified' && (
                            <CheckCircle className="w-4 h-4 ml-auto text-green-600" />
                          )}
                        </Button>
                      )}

                      {selectedVerification.profile?.documents?.idDocument && (
                        <Button
                          variant="outline"
                          className="w-full justify-start"
                          onClick={() => viewDocument(selectedVerification.userId, 'id')}
                        >
                          <FileText className="w-4 h-4 mr-2" />
                          ID Document (KYC)
                          {selectedVerification.documentStatus?.id === 'verified' && (
                            <CheckCircle className="w-4 h-4 ml-auto text-green-600" />
                          )}
                        </Button>
                      )}

                      {selectedVerification.profile?.documents?.dbsDocument && (
                        <Button
                          variant="outline"
                          className="w-full justify-start"
                          onClick={() => viewDocument(selectedVerification.userId, 'dbs')}
                        >
                          <Shield className="w-4 h-4 mr-2" />
                          DBS Certificate
                          {selectedVerification.documentStatus?.dbs === 'verified' && (
                            <CheckCircle className="w-4 h-4 ml-auto text-green-600" />
                          )}
                        </Button>
                      )}

                      {!selectedVerification.profile?.documents?.photo &&
                        !selectedVerification.profile?.documents?.idDocument &&
                        !selectedVerification.profile?.documents?.dbsDocument && (
                        <p className="text-sm text-gray-500 text-center py-4">
                          No documents uploaded
                        </p>
                      )}
                    </div>
                  </TabsContent>

                  {/* Review Tab */}
                  <TabsContent value="review" className="overflow-y-auto flex-1 space-y-4 mt-4">
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
                            setReviewData({
                              ...reviewData,
                              rejectionReason: e.target.value,
                            })
                          }
                          placeholder="Provide detailed reason. Tutor will see this and can appeal."
                          className="mt-2"
                          rows={5}
                        />
                      </div>
                    )}

                    <Alert className="bg-blue-50 border-blue-200">
                      <AlertTriangle className="h-4 w-4 text-blue-600" />
                      <AlertDescription className="text-blue-800 text-sm">
                        {reviewData.action === 'approve'
                          ? 'This tutor will be activated after approval.'
                          : 'This tutor will receive the rejection reason.'}
                      </AlertDescription>
                    </Alert>

                    <Button
                      onClick={handleReview}
                      disabled={reviewing}
                      className="w-full h-11 text-white font-semibold"
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

                  {/* Audit Tab */}
                  <TabsContent value="audit" className="overflow-y-auto flex-1 space-y-3 mt-4">
                    {selectedVerification.status && (
                      <div className="border rounded p-3 bg-gray-50">
                        <p className="text-sm font-medium">Current Status</p>
                        <p className="text-lg font-semibold capitalize">
                          {selectedVerification.status}
                        </p>
                      </div>
                    )}

                    {selectedVerification.reviewer && (
                      <div className="border rounded p-3 bg-gray-50">
                        <p className="text-sm font-medium">Reviewed By</p>
                        <p className="text-sm">{selectedVerification.reviewer}</p>
                      </div>
                    )}

                    {selectedVerification.reviewedAt && (
                      <div className="border rounded p-3 bg-gray-50">
                        <p className="text-sm font-medium">Review Date</p>
                        <p className="text-sm">
                          {new Date(selectedVerification.reviewedAt).toLocaleString()}
                        </p>
                      </div>
                    )}

                    {selectedVerification.rejectionReason && (
                      <div className="border rounded p-3 bg-red-50 border-red-200">
                        <p className="text-sm font-medium text-red-800">Rejection Reason</p>
                        <p className="text-sm text-red-700 mt-1 whitespace-pre-wrap">
                          {selectedVerification.rejectionReason}
                        </p>
                      </div>
                    )}

                    {!selectedVerification.status && (
                      <p className="text-sm text-gray-500 text-center py-4">
                        No audit history yet
                      </p>
                    )}
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
