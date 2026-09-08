import { useState, useEffect, useCallback } from 'react';
import { projectId } from '../utils/supabase/info';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
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
  Download,
  Flag,
  RefreshCw,
  AlertCircle,
  History,
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
  kycStatus?: string;
  dbsStatus?: string;
  /** Verified tutor edited their profile — awaiting a re-check, still verified. */
  reReviewRequested?: boolean;
}

const BASE = `https://${projectId}.supabase.co/functions/v1/make-server-cbd74580`;

function resolveName(profile: any) {
  return (
    profile?.fullName ||
    profile?.full_name ||
    profile?.name ||
    (profile?.firstName ? `${profile.firstName} ${profile.lastName ?? ''}`.trim() : null) ||
    'Unknown'
  );
}

function daysSince(dateStr: string) {
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24));
}

function getDataIssues(profile: any): string[] {
  const issues: string[] = [];
  if (!profile?.qualifications) issues.push('No qualifications listed');
  if (!profile?.subjects?.length) issues.push('No subjects specified');
  if (!profile?.bio || profile.bio.length < 20) issues.push('Bio too short or missing');
  if (!profile?.phone) issues.push('Phone number missing');
  return issues;
}

function getRiskFlags(profile: any): string[] {
  const flags: string[] = [];
  const expYears = profile?.experience_years ?? profile?.experienceYears;
  if (expYears && expYears > 50) flags.push('Implausible experience years');
  if (!profile?.bio || profile.bio.length < 20) flags.push('Incomplete bio');
  if (!profile?.photoUrl && !profile?.photo_url) flags.push('No profile photo');
  return flags;
}

export function EnhancedAdminVerificationDashboard({ session }: AdminVerificationDashboardProps) {
  const [verifications, setVerifications] = useState<VerificationRecord[]>([]);
  const [selected, setSelected] = useState<VerificationRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
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

  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('newest');
  // 'pending' = new tutors awaiting review, 'all' = every tutor (verify existing/legacy),
  // 'history' = already reviewed.
  const [viewMode, setViewMode] = useState<'pending' | 'all' | 'history'>('pending');
  const showHistory = viewMode === 'history';

  // Certificates the selected tutor uploaded from their profile tab.
  const [uploadedDocs, setUploadedDocs] = useState<Array<{ id: string; title?: string; fileName: string; fileSize?: number; createdAt?: string }>>([]);
  const [loadingUploadedDocs, setLoadingUploadedDocs] = useState(false);

  const [reviewData, setReviewData] = useState({
    action: 'approve',
    rejectionReason: '',
    kycStatus: 'verified',
    dbsStatus: 'verified',
  });

  // Auto-clear success / error banners
  useEffect(() => {
    if (!success) return;
    const t = setTimeout(() => setSuccess(''), 6000);
    return () => clearTimeout(t);
  }, [success]);

  useEffect(() => {
    if (!error) return;
    const t = setTimeout(() => setError(''), 8000);
    return () => clearTimeout(t);
  }, [error]);

  const fetchAll = useCallback(
    async (quiet = false) => {
      try {
        if (!quiet) setLoading(true);
        else setRefreshing(true);

        const headers = { Authorization: `Bearer ${session.access_token}` };

        const listPath =
          viewMode === 'all' ? '/admin/tutors'
          : viewMode === 'history' ? '/admin/verifications/history'
          : '/admin/verifications/pending';

        const [listRes, metricsRes] = await Promise.all([
          fetch(`${BASE}${listPath}`, { headers }),
          fetch(`${BASE}/admin/verifications/metrics`, { headers }),
        ]);

        if (!listRes.ok) throw new Error('Failed to fetch verifications');
        const listData = await listRes.json();
        setVerifications(listData.verifications || []);

        if (metricsRes.ok) {
          const m = await metricsRes.json();
          setMetrics(m.metrics);
        }

        setError('');
      } catch (err: any) {
        setError(err.message || 'Failed to load verifications');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [session.access_token, viewMode]
  );

  useEffect(() => {
    fetchAll();
    const interval = setInterval(() => fetchAll(true), 30000);
    return () => clearInterval(interval);
  }, [fetchAll]);

  const displayed = [...verifications]
    .filter((v) => {
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      const name = resolveName(v.profile).toLowerCase();
      return name.includes(q) || (v.profile?.email || '').toLowerCase().includes(q);
    })
    .sort((a, b) => {
      if (sortBy === 'oldest')
        return new Date(a.submittedAt).getTime() - new Date(b.submittedAt).getTime();
      if (sortBy === 'name')
        return resolveName(a.profile).localeCompare(resolveName(b.profile));
      return new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime();
    });

  const handleReview = async () => {
    if (!selected) return;
    if (reviewData.action === 'reject' && !reviewData.rejectionReason.trim()) {
      setError('Please provide a rejection reason before submitting.');
      return;
    }

    try {
      setReviewing(true);
      setError('');

      const res = await fetch(`${BASE}/admin/verifications/${selected.userId}/review`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(reviewData),
      });

      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || 'Review failed');
      }

      setSuccess(
        reviewData.action === 'approve'
          ? '✅ Tutor approved — a congratulatory email has been sent.'
          : '❌ Application rejected — the tutor has been notified by email.'
      );
      setSelected(null);
      setReviewData({ action: 'approve', rejectionReason: '', kycStatus: 'verified', dbsStatus: 'verified' });
      await fetchAll(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setReviewing(false);
    }
  };

  // Load the selected tutor's profile-tab certificate uploads.
  useEffect(() => {
    const userId = selected?.userId;
    if (!userId) { setUploadedDocs([]); return; }
    let cancelled = false;
    (async () => {
      setLoadingUploadedDocs(true);
      try {
        const res = await fetch(`${BASE}/admin/tutors/${userId}/documents`, {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        if (res.ok && !cancelled) {
          const data = await res.json();
          setUploadedDocs(data.documents || []);
        } else if (!cancelled) {
          setUploadedDocs([]);
        }
      } catch {
        if (!cancelled) setUploadedDocs([]);
      } finally {
        if (!cancelled) setLoadingUploadedDocs(false);
      }
    })();
    return () => { cancelled = true; };
  }, [selected?.userId, session.access_token]);

  // Admins are authorised on the document download route via userRole=admin.
  const openUploadedDoc = async (documentId: string) => {
    try {
      const res = await fetch(`${BASE}/documents/${documentId}/download?userRole=admin`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (!res.ok) throw new Error('Could not retrieve document');
      const data = await res.json();
      window.open(data.downloadUrl, '_blank', 'noopener,noreferrer');
    } catch (err: any) {
      setError(err.message);
    }
  };

  const formatDocSize = (bytes?: number) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const exportCSV = () => {
    const rows = [
      ['Name', 'Email', 'Phone', 'Subjects', 'Status', 'Submitted', 'Risk Flags'],
      ...displayed.map((v) => [
        resolveName(v.profile),
        v.profile?.email || '',
        v.profile?.phone || '',
        (v.profile?.subjects || []).join('; '),
        v.status || 'pending',
        new Date(v.submittedAt).toLocaleDateString(),
        getRiskFlags(v.profile).join('; '),
      ]),
    ]
      .map((row) => row.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(','))
      .join('\n');

    const url = URL.createObjectURL(new Blob([rows], { type: 'text/csv' }));
    const a = Object.assign(document.createElement('a'), {
      href: url,
      download: `verifications-${new Date().toISOString().split('T')[0]}.csv`,
    });
    document.body.appendChild(a);
    a.click();
    URL.revokeObjectURL(url);
    a.remove();
  };

  // ─── Derived values for the selected record ───────────────────────────────
  const p = selected?.profile;
  const dataIssues = p ? getDataIssues(p) : [];
  const riskFlags = p ? getRiskFlags(p) : [];
  const hasPhoto = !!(p?.photoUrl || p?.photo_url);

  // ─── Loading skeleton ─────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <Clock className="w-8 h-8 animate-spin" style={{ color: '#625d9c' }} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: '#625d9c' }}>
            Tutor Verification
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {viewMode === 'history' ? 'Showing reviewed applications'
              : viewMode === 'all' ? 'All tutors — verify new or existing profiles'
              : `${metrics.total_pending} application${metrics.total_pending !== 1 ? 's' : ''} awaiting review`}
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {/* New tutors, every tutor (verify existing), or already-reviewed */}
          <div className="inline-flex rounded-md border border-gray-200 overflow-hidden">
            {([
              { key: 'pending', label: 'Pending' },
              { key: 'all', label: 'All Tutors' },
              { key: 'history', label: 'History' },
            ] as const).map(({ key, label }) => (
              <button
                key={key}
                type="button"
                onClick={() => { setViewMode(key); setSelected(null); }}
                className={`px-3 py-1.5 text-sm transition-colors ${
                  viewMode === key ? 'text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
                }`}
                style={viewMode === key ? { backgroundColor: '#625d9c' } : {}}
              >
                {label}
              </button>
            ))}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchAll(true)}
            disabled={refreshing}
            className="gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={exportCSV} className="gap-2">
            <Download className="w-4 h-4" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: 'Pending', value: metrics.total_pending, color: 'text-amber-600' },
          { label: 'Approved', value: metrics.total_approved, color: 'text-green-600' },
          { label: 'Rejected', value: metrics.total_rejected, color: 'text-red-600' },
          { label: 'Approval Rate', value: `${metrics.approval_rate.toFixed(1)}%`, color: 'text-blue-600' },
          { label: 'Avg Review', value: `${metrics.avg_review_time_hours.toFixed(1)}h`, color: 'text-purple-600' },
          { label: 'Doc Issues', value: metrics.document_issues, color: 'text-orange-600' },
        ].map(({ label, value, color }) => (
          <Card key={label} className="bg-white">
            <CardContent className="pt-4 pb-3 px-4">
              <p className="text-xs text-gray-500 font-medium">{label}</p>
              <p className={`text-2xl font-bold mt-1 ${color}`}>{value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Alerts */}
      {error && (
        <Alert className="bg-red-50 border-red-200">
          <XCircle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">{error}</AlertDescription>
        </Alert>
      )}
      {success && (
        <Alert className="bg-green-50 border-green-200">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">{success}</AlertDescription>
        </Alert>
      )}

      {/* Search + Sort */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Eye className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Search by name or email…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">Newest first</SelectItem>
            <SelectItem value="oldest">Oldest first</SelectItem>
            <SelectItem value="name">Name A–Z</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Main Panel */}
      <div className="grid lg:grid-cols-5 gap-6">
        {/* List */}
        <Card className="lg:col-span-2 flex flex-col overflow-hidden" style={{ maxHeight: 720 }}>
          <CardHeader className="pb-3 border-b">
            <CardTitle className="text-base" style={{ color: '#625d9c' }}>
              {viewMode === 'history' ? 'Reviewed' : viewMode === 'all' ? 'All Tutors' : 'Pending'} ({displayed.length})
            </CardTitle>
          </CardHeader>
          <div className="overflow-y-auto flex-1 p-3 space-y-2">
            {displayed.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="w-10 h-10 mx-auto text-gray-300 mb-3" />
                <p className="text-sm text-gray-500">
                  {viewMode === 'history' ? 'No reviewed applications yet' : viewMode === 'all' ? 'No tutors found' : 'No pending applications'}
                </p>
              </div>
            ) : (
              displayed.map((v) => {
                const flags = getRiskFlags(v.profile);
                const isActive = selected?.userId === v.userId;
                const days = daysSince(v.submittedAt);

                return (
                  <button
                    key={v.userId}
                    onClick={() => {
                      setSelected(v);
                      setReviewData({ action: 'approve', rejectionReason: '', kycStatus: 'verified', dbsStatus: 'verified' });
                    }}
                    className={`w-full text-left p-3 rounded-lg border-2 transition-all ${
                      isActive
                        ? 'border-purple-500 bg-purple-50'
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-medium text-sm truncate">{resolveName(v.profile)}</p>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        {flags.length > 0 && <Flag className="w-3.5 h-3.5 text-red-500" />}
                        {/* Verified tutor who edited their profile — awaiting re-check, still verified */}
                        {v.reReviewRequested && (
                          <Badge className="bg-blue-600 text-white text-xs">Re-review</Badge>
                        )}
                        {/* Status badge in History and All Tutors views */}
                        {viewMode !== 'pending' && (v.status === 'verified' || v.status === 'approved') && (
                          <Badge className="bg-green-600 text-white text-xs">Verified</Badge>
                        )}
                        {viewMode !== 'pending' && v.status === 'rejected' && (
                          <Badge variant="destructive" className="text-xs">Rejected</Badge>
                        )}
                        {viewMode === 'all' && (v.status === 'pending') && (
                          <Badge className="bg-amber-500 text-white text-xs">Pending</Badge>
                        )}
                        {viewMode === 'all' && v.status === 'unverified' && (
                          <Badge variant="outline" className="text-xs">Unverified</Badge>
                        )}
                      </div>
                    </div>
                    <p className="text-xs text-gray-500 truncate mt-0.5">{v.profile?.email}</p>
                    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                      {v.profile?.subjects?.[0] && (
                        <Badge variant="outline" className="text-xs">
                          {v.profile.subjects[0]}
                        </Badge>
                      )}
                      {viewMode === 'pending' && (
                        <span className="text-xs text-gray-400">
                          {days === 0 ? 'Today' : `${days}d waiting`}
                        </span>
                      )}
                      {showHistory && v.reviewedAt && (
                        <span className="text-xs text-gray-400">
                          Reviewed {new Date(v.reviewedAt).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </Card>

        {/* Detail Panel */}
        <div className="lg:col-span-3">
          {selected ? (
            <Card className="overflow-hidden" style={{ maxHeight: 720 }}>
              <Tabs defaultValue="details" className="flex flex-col h-full">
                <div className="px-6 pt-4 border-b">
                  <TabsList className="grid w-full grid-cols-4">
                    <TabsTrigger value="details">Details</TabsTrigger>
                    <TabsTrigger value="documents">Documents</TabsTrigger>
                    <TabsTrigger value="review">Review</TabsTrigger>
                    <TabsTrigger value="audit">Audit</TabsTrigger>
                  </TabsList>
                </div>

                {/* ── Details ─────────────────────────────────────────────── */}
                <TabsContent value="details" className="overflow-y-auto flex-1 px-6 py-4 space-y-4 mt-0">
                  {riskFlags.length > 0 && (
                    <Alert className="bg-orange-50 border-orange-200">
                      <AlertTriangle className="h-4 w-4 text-orange-600" />
                      <AlertDescription className="text-orange-800 text-sm">
                        <strong>Risk flags ({riskFlags.length}):</strong>
                        {riskFlags.map((f, i) => <div key={i} className="ml-1">• {f}</div>)}
                      </AlertDescription>
                    </Alert>
                  )}

                  {dataIssues.length > 0 && (
                    <Alert className="bg-yellow-50 border-yellow-200">
                      <AlertCircle className="h-4 w-4 text-yellow-600" />
                      <AlertDescription className="text-yellow-800 text-sm">
                        <strong>Profile gaps ({dataIssues.length}):</strong>
                        {dataIssues.map((iss, i) => <div key={i} className="ml-1">• {iss}</div>)}
                      </AlertDescription>
                    </Alert>
                  )}

                  {/* Identity */}
                  <div className="flex items-start gap-4 pb-4 border-b">
                    {hasPhoto ? (
                      <img
                        src={p?.photoUrl || p?.photo_url}
                        alt="Profile"
                        className="w-20 h-20 rounded-full object-cover border-2 border-purple-200 flex-shrink-0"
                      />
                    ) : (
                      <div className="w-20 h-20 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
                        <User className="w-10 h-10 text-purple-400" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <h2 className="font-semibold text-lg" style={{ color: '#625d9c' }}>
                        {resolveName(p)}
                      </h2>
                      <p className="text-sm text-gray-600">{p?.email}</p>
                      {p?.phone && <p className="text-sm text-gray-600">{p.phone}</p>}
                      {p?.location && <p className="text-sm text-gray-500">{p.location}</p>}
                      <p className="text-xs text-gray-400 mt-1">
                        Applied {new Date(selected.submittedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
                      </p>
                    </div>
                  </div>

                  {/* Subjects */}
                  {p?.subjects?.length > 0 && (
                    <div>
                      <Label className="text-xs text-gray-500">Subjects</Label>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {p.subjects.map((s: string) => (
                          <Badge key={s} variant="secondary" className="text-xs">{s}</Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Bio */}
                  <div>
                    <Label className="text-xs text-gray-500">Professional Bio</Label>
                    <p className="text-sm text-gray-700 mt-1 whitespace-pre-wrap">
                      {p?.bio || <span className="italic text-gray-400">Not provided</span>}
                    </p>
                  </div>

                  {/* Qualifications */}
                  {p?.qualifications && (
                    <div>
                      <Label className="text-xs text-gray-500">Qualifications</Label>
                      <p className="text-sm text-gray-700 mt-1">{p.qualifications}</p>
                    </div>
                  )}

                  {/* Stats row */}
                  <div className="grid grid-cols-2 gap-3 pt-3 border-t">
                    <div>
                      <Label className="text-xs text-gray-500">Experience</Label>
                      <p className="text-sm mt-0.5">
                        {p?.experience_years ?? p?.experienceYears ?? '—'} yrs
                      </p>
                    </div>
                    <div>
                      <Label className="text-xs text-gray-500">Teaching Format</Label>
                      <p className="text-sm mt-0.5">
                        {p?.teaching_format || p?.teachingFormat || '—'}
                      </p>
                    </div>
                    <div>
                      <Label className="text-xs text-gray-500">DBS Checked</Label>
                      <Badge
                        className={`mt-0.5 ${p?.dbsChecked || p?.dbs_checked ? 'bg-green-600 text-white' : ''}`}
                        variant={p?.dbsChecked || p?.dbs_checked ? 'default' : 'outline'}
                      >
                        {p?.dbsChecked || p?.dbs_checked ? 'Yes' : 'No'}
                      </Badge>
                    </div>
                    <div>
                      <Label className="text-xs text-gray-500">Insurance</Label>
                      <Badge
                        className={`mt-0.5 ${p?.hasInsurance || p?.has_insurance ? 'bg-green-600 text-white' : ''}`}
                        variant={p?.hasInsurance || p?.has_insurance ? 'default' : 'outline'}
                      >
                        {p?.hasInsurance || p?.has_insurance ? 'Yes' : 'No'}
                      </Badge>
                    </div>
                  </div>
                </TabsContent>

                {/* ── Documents ───────────────────────────────────────────── */}
                <TabsContent value="documents" className="overflow-y-auto flex-1 px-6 py-4 space-y-3 mt-0">
                  <p className="text-xs text-gray-500 mb-3">
                    Click a document to open it in a new tab. Documents expire after 1 hour.
                  </p>

                  {/* Certificates the tutor uploaded from their dashboard profile tab */}
                  <div className="pt-3 border-t">
                    <p className="text-xs font-medium text-gray-600 mb-2">
                      Uploaded Certificates &amp; Documents ({uploadedDocs.length})
                    </p>
                    {loadingUploadedDocs ? (
                      <p className="text-sm text-gray-400">Loading…</p>
                    ) : uploadedDocs.length === 0 ? (
                      <p className="text-sm text-gray-400">None uploaded from the tutor's profile</p>
                    ) : (
                      <div className="space-y-2">
                        {uploadedDocs.map((doc) => (
                          <Button
                            key={doc.id}
                            variant="outline"
                            className="w-full justify-start gap-3 h-auto py-2"
                            onClick={() => openUploadedDoc(doc.id)}
                          >
                            <FileText className="w-4 h-4 text-[#625d9c] flex-shrink-0" />
                            <span className="flex flex-col items-start min-w-0">
                              <span className="text-sm truncate max-w-full">{doc.title || doc.fileName}</span>
                              <span className="text-xs text-gray-500 font-normal">
                                {[formatDocSize(doc.fileSize), doc.createdAt ? new Date(doc.createdAt).toLocaleDateString() : '']
                                  .filter(Boolean).join(' • ')}
                              </span>
                            </span>
                            <Eye className="w-4 h-4 ml-auto flex-shrink-0" />
                          </Button>
                        ))}
                      </div>
                    )}
                  </div>

                  {!hasPhoto && uploadedDocs.length === 0 && !loadingUploadedDocs && (
                    <div className="text-center py-10">
                      <FileText className="w-10 h-10 mx-auto text-gray-300 mb-3" />
                      <p className="text-sm text-gray-500">No documents uploaded by this tutor</p>
                    </div>
                  )}
                </TabsContent>

                {/* ── Review ──────────────────────────────────────────────── */}
                <TabsContent value="review" className="overflow-y-auto flex-1 px-6 py-4 space-y-4 mt-0">
                  {showHistory && selected.status !== 'pending' ? (
                    <Alert className="bg-blue-50 border-blue-200">
                      <AlertCircle className="h-4 w-4 text-blue-600" />
                      <AlertDescription className="text-blue-800">
                        This application has already been{' '}
                        <strong>{selected.status === 'verified' ? 'approved' : 'rejected'}</strong>. Switch to
                        Pending view to review new applications.
                      </AlertDescription>
                    </Alert>
                  ) : (
                    <>
                      <div>
                        <Label className="text-sm font-medium">Decision</Label>
                        <Select
                          value={reviewData.action}
                          onValueChange={(v) => setReviewData((d) => ({ ...d, action: v }))}
                        >
                          <SelectTrigger className="mt-2">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="approve">
                              <span className="flex items-center gap-2">
                                <CheckCircle className="w-4 h-4 text-green-600" /> Approve
                              </span>
                            </SelectItem>
                            <SelectItem value="reject">
                              <span className="flex items-center gap-2">
                                <XCircle className="w-4 h-4 text-red-600" /> Reject
                              </span>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {reviewData.action === 'approve' && (
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <Label className="text-sm font-medium">KYC Status</Label>
                            <Select
                              value={reviewData.kycStatus}
                              onValueChange={(v) => setReviewData((d) => ({ ...d, kycStatus: v }))}
                            >
                              <SelectTrigger className="mt-2">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="verified">Verified</SelectItem>
                                <SelectItem value="pending">Pending</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          {(p?.dbsChecked || p?.dbs_checked) && (
                            <div>
                              <Label className="text-sm font-medium">DBS Status</Label>
                              <Select
                                value={reviewData.dbsStatus}
                                onValueChange={(v) => setReviewData((d) => ({ ...d, dbsStatus: v }))}
                              >
                                <SelectTrigger className="mt-2">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="verified">Verified</SelectItem>
                                  <SelectItem value="pending">Pending</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          )}
                        </div>
                      )}

                      {reviewData.action === 'reject' && (
                        <div>
                          <Label className="text-sm font-medium">Rejection Reason</Label>
                          <Textarea
                            value={reviewData.rejectionReason}
                            onChange={(e) => setReviewData((d) => ({ ...d, rejectionReason: e.target.value }))}
                            placeholder="Provide a clear, detailed reason. The tutor will receive this in an email and can use it to improve their application."
                            className="mt-2"
                            rows={5}
                          />
                        </div>
                      )}

                      <Alert className={reviewData.action === 'approve' ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}>
                        <AlertDescription className={`text-sm ${reviewData.action === 'approve' ? 'text-green-800' : 'text-red-800'}`}>
                          {reviewData.action === 'approve'
                            ? 'The tutor will be activated immediately and receive a congratulatory email.'
                            : 'The tutor will receive a rejection email with the reason you provide above.'}
                        </AlertDescription>
                      </Alert>

                      <Button
                        onClick={handleReview}
                        disabled={reviewing}
                        className="w-full h-11 text-white font-semibold"
                        style={{ backgroundColor: reviewData.action === 'approve' ? '#5d9827' : '#dc2626' }}
                      >
                        {reviewing
                          ? 'Processing…'
                          : reviewData.action === 'approve'
                          ? '✓ Approve Tutor'
                          : '✗ Reject Application'}
                      </Button>
                    </>
                  )}
                </TabsContent>

                {/* ── Audit ───────────────────────────────────────────────── */}
                <TabsContent value="audit" className="overflow-y-auto flex-1 px-6 py-4 space-y-3 mt-0">
                  <div className="space-y-3">
                    <div className="rounded-lg border p-3 bg-gray-50">
                      <p className="text-xs text-gray-500 font-medium">Current Status</p>
                      <div className="flex items-center gap-2 mt-1">
                        {selected.status === 'verified' && (
                          <Badge className="bg-green-600 text-white">Approved</Badge>
                        )}
                        {selected.status === 'rejected' && (
                          <Badge variant="destructive">Rejected</Badge>
                        )}
                        {(!selected.status || selected.status === 'pending') && (
                          <Badge variant="secondary">Pending Review</Badge>
                        )}
                      </div>
                    </div>

                    {selected.reviewedAt && (
                      <div className="rounded-lg border p-3 bg-gray-50">
                        <p className="text-xs text-gray-500 font-medium">Reviewed At</p>
                        <p className="text-sm mt-1">
                          {new Date(selected.reviewedAt).toLocaleString('en-GB', {
                            day: 'numeric', month: 'long', year: 'numeric',
                            hour: '2-digit', minute: '2-digit',
                          })}
                        </p>
                      </div>
                    )}

                    {selected.reviewer && (
                      <div className="rounded-lg border p-3 bg-gray-50">
                        <p className="text-xs text-gray-500 font-medium">Reviewed By</p>
                        <p className="text-sm mt-1 font-mono text-gray-700">{selected.reviewer}</p>
                      </div>
                    )}

                    <div className="rounded-lg border p-3 bg-gray-50">
                      <p className="text-xs text-gray-500 font-medium">Submitted At</p>
                      <p className="text-sm mt-1">
                        {new Date(selected.submittedAt).toLocaleString('en-GB', {
                          day: 'numeric', month: 'long', year: 'numeric',
                          hour: '2-digit', minute: '2-digit',
                        })}
                      </p>
                    </div>

                    {selected.kycStatus && (
                      <div className="rounded-lg border p-3 bg-gray-50">
                        <p className="text-xs text-gray-500 font-medium">KYC / DBS</p>
                        <div className="flex gap-2 mt-1">
                          <Badge variant={selected.kycStatus === 'verified' ? 'default' : 'secondary'}
                            className={selected.kycStatus === 'verified' ? 'bg-green-600 text-white' : ''}>
                            KYC: {selected.kycStatus}
                          </Badge>
                          {selected.dbsStatus && (
                            <Badge variant={selected.dbsStatus === 'verified' ? 'default' : 'secondary'}
                              className={selected.dbsStatus === 'verified' ? 'bg-green-600 text-white' : ''}>
                              DBS: {selected.dbsStatus}
                            </Badge>
                          )}
                        </div>
                      </div>
                    )}

                    {selected.rejectionReason && (
                      <div className="rounded-lg border border-red-200 p-3 bg-red-50">
                        <p className="text-xs text-red-700 font-medium">Rejection Reason</p>
                        <p className="text-sm text-red-800 mt-1 whitespace-pre-wrap">{selected.rejectionReason}</p>
                      </div>
                    )}

                    {!selected.status && !selected.reviewedAt && (
                      <p className="text-sm text-gray-400 text-center py-6">
                        No audit history yet — this application is still pending.
                      </p>
                    )}
                  </div>
                </TabsContent>
              </Tabs>
            </Card>
          ) : (
            <Card className="flex items-center justify-center" style={{ minHeight: 400 }}>
              <div className="text-center p-12">
                <FileText className="w-14 h-14 mx-auto text-gray-300 mb-4" />
                <p className="text-gray-500 font-medium">Select an application to review</p>
                <p className="text-sm text-gray-400 mt-1">
                  Choose a tutor from the list on the left
                </p>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
