import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Alert, AlertDescription } from './ui/alert';
import { AlertTriangle, FileText, Clock, CheckCircle, XCircle, Plus, Loader2, Calendar, User } from 'lucide-react';
import { projectId } from '../utils/supabase/info';

interface Dispute {
  id: string;
  type: string;
  sessionId: string | null;
  submittedBy: string;
  submittedByRole: string;
  submittedAgainst: string;
  submittedAgainstRole: string;
  description: string;
  status: string;
  outcome: string | null;
  outcomeDetails: string | null;
  createdAt: string;
  resolvedAt: string | null;
  slaDeadline: string;
  notes?: { text: string; addedBy: string; addedAt: string }[];
}

interface Booking {
  id: string;
  tutorId: string;
  tutorName?: string;
  studentName?: string;
  date?: string;
  notes?: string;
  subject?: string;
  status: string;
}

interface DisputeManagerProps {
  accessToken: string;
  userId: string;
  userRole: 'parent' | 'tutor' | 'admin';
}

const DISPUTE_TYPES = [
  { value: 'no-show', label: 'No-Show', desc: 'Tutor/student did not attend the session' },
  { value: 'quality', label: 'Quality Issue', desc: 'Session quality did not meet expectations' },
  { value: 'payment', label: 'Payment Issue', desc: 'Problem with payment or refund' },
  { value: 'behavior', label: 'Behaviour Concern', desc: 'Inappropriate conduct during a session' },
  { value: 'other', label: 'Other', desc: 'Any other issue not listed above' },
];

const BASE = `https://${projectId}.supabase.co/functions/v1/make-server-cbd74580`;

export function DisputeManager({ accessToken, userId, userRole }: DisputeManagerProps) {
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loadingBookings, setLoadingBookings] = useState(false);
  const [formData, setFormData] = useState({
    type: '',
    sessionId: '',
    submittedAgainst: '',
    submittedAgainstRole: '',
    description: '',
  });
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  const headers = { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' };

  useEffect(() => {
    loadDisputes();
  }, []);

  const loadDisputes = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${BASE}/disputes?userId=${userId}&role=${userRole}`, { headers });
      const data = await res.json();
      if (res.ok) setDisputes(data.disputes || []);
    } catch (err) {
      console.error('Error loading disputes:', err);
    } finally {
      setLoading(false);
    }
  };

  const openCreateDialog = async () => {
    setShowCreate(true);
    setFormData({ type: '', sessionId: '', submittedAgainst: '', submittedAgainstRole: '', description: '' });
    setFormError('');
    setSuccessMsg('');

    if (userRole !== 'admin' && bookings.length === 0) {
      setLoadingBookings(true);
      try {
        const res = await fetch(`${BASE}/bookings`, { headers });
        const data = await res.json();
        if (res.ok) {
          const completed = (data.bookings || []).filter(
            (b: Booking) => b.status === 'completed' || b.status === 'confirmed',
          );
          setBookings(completed);
        }
      } catch { /* non-fatal */ }
      finally { setLoadingBookings(false); }
    }
  };

  const handleSessionSelect = (sessionId: string) => {
    const booking = bookings.find((b) => b.id === sessionId);
    if (booking) {
      setFormData((p) => ({
        ...p,
        sessionId,
        submittedAgainst: booking.tutorId,
        submittedAgainstRole: 'tutor',
      }));
    } else {
      setFormData((p) => ({ ...p, sessionId, submittedAgainst: '', submittedAgainstRole: '' }));
    }
  };

  const handleSubmit = async () => {
    if (!formData.type) { setFormError('Please select a dispute type'); return; }
    if (!formData.description.trim()) { setFormError('Please describe the issue'); return; }
    if (formData.description.trim().length < 20) { setFormError('Please provide more detail (at least 20 characters)'); return; }
    if (!formData.submittedAgainst) { setFormError('Please select a session or identify the other party'); return; }

    setSubmitting(true);
    setFormError('');
    try {
      const res = await fetch(`${BASE}/disputes`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          ...formData,
          description: formData.description.trim(),
          submittedBy: userId,
          submittedByRole: userRole,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to submit dispute');

      setSuccessMsg('Your dispute has been submitted. Our team will review it within 7 business days.');
      setFormData({ type: '', sessionId: '', submittedAgainst: '', submittedAgainstRole: '', description: '' });
      loadDisputes();
    } catch (err: any) {
      setFormError(err.message || 'Failed to submit dispute');
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const map: Record<string, { cls: string; Icon: any; label: string }> = {
      pending: { cls: 'bg-yellow-50 text-yellow-700 border-yellow-300', Icon: Clock, label: 'Pending' },
      'in-review': { cls: 'bg-blue-50 text-blue-700 border-blue-300', Icon: FileText, label: 'In Review' },
      resolved: { cls: 'bg-green-50 text-green-700 border-green-300', Icon: CheckCircle, label: 'Resolved' },
      closed: { cls: 'bg-gray-50 text-gray-600 border-gray-300', Icon: XCircle, label: 'Closed' },
    };
    const s = map[status] || map.closed;
    return (
      <Badge variant="outline" className={`text-xs ${s.cls}`}>
        <s.Icon className="w-3 h-3 mr-1" />
        {s.label}
      </Badge>
    );
  };

  const getTypeBadge = (type: string) => {
    const colors: Record<string, string> = {
      'no-show': 'bg-red-100 text-red-700 border-red-200',
      quality: 'bg-orange-100 text-orange-700 border-orange-200',
      payment: 'bg-purple-100 text-purple-700 border-purple-200',
      behavior: 'bg-pink-100 text-pink-700 border-pink-200',
      other: 'bg-gray-100 text-gray-700 border-gray-200',
    };
    const label = DISPUTE_TYPES.find((t) => t.value === type)?.label || type;
    return <Badge variant="outline" className={`text-xs ${colors[type] || colors.other}`}>{label}</Badge>;
  };

  const getSLAChip = (deadline: string, status: string) => {
    if (status === 'resolved' || status === 'closed') return null;
    const hoursRemaining = (new Date(deadline).getTime() - Date.now()) / 3_600_000;
    if (hoursRemaining < 0) return <span className="text-xs font-medium text-red-600">⚠ SLA Overdue</span>;
    if (hoursRemaining < 24) return <span className="text-xs text-orange-600">⚠ {Math.floor(hoursRemaining)}h left</span>;
    return <span className="text-xs text-gray-400">{Math.floor(hoursRemaining / 24)}d remaining</span>;
  };

  const selectedBooking = bookings.find((b) => b.id === formData.sessionId);

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Disputes</CardTitle>
              <CardDescription>File and track dispute resolutions with our support team</CardDescription>
            </div>
            {userRole !== 'admin' && (
              <Button
                onClick={openCreateDialog}
                className="text-white"
                style={{ backgroundColor: '#625d9c' }}
              >
                <Plus className="w-4 h-4 mr-2" />
                File Dispute
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex flex-col items-center py-12 text-gray-400">
              <Loader2 className="w-8 h-8 animate-spin mb-3" />
              <p className="text-sm">Loading disputes…</p>
            </div>
          ) : disputes.length === 0 ? (
            <div className="flex flex-col items-center py-12 text-gray-400">
              <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                <AlertTriangle className="w-7 h-7 text-gray-300" />
              </div>
              <p className="font-medium text-gray-500 mb-1">No disputes filed</p>
              <p className="text-sm text-center max-w-xs">
                If you experience an issue with a session, you can file a dispute and our team will help resolve it.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {disputes.map((dispute) => (
                <Card
                  key={dispute.id}
                  className="border-l-4"
                  style={{ borderLeftColor: dispute.status === 'resolved' ? '#5d9827' : dispute.status === 'closed' ? '#9ca3af' : '#625d9c' }}
                >
                  <CardContent className="pt-4 pb-4">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        {getTypeBadge(dispute.type)}
                        {getStatusBadge(dispute.status)}
                      </div>
                      {getSLAChip(dispute.slaDeadline, dispute.status)}
                    </div>

                    <p className="text-sm text-gray-700 mb-3 line-clamp-3">{dispute.description}</p>

                    <div className="flex items-center justify-between text-xs text-gray-400">
                      <span>Filed {new Date(dispute.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                      {dispute.resolvedAt && (
                        <span>Resolved {new Date(dispute.resolvedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                      )}
                    </div>

                    {dispute.outcome && (
                      <div className="mt-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                        <p className="text-xs font-semibold text-gray-700 mb-1">Outcome: {dispute.outcome}</p>
                        {dispute.outcomeDetails && (
                          <p className="text-xs text-gray-600">{dispute.outcomeDetails}</p>
                        )}
                      </div>
                    )}

                    {dispute.notes && dispute.notes.length > 0 && (
                      <div className="mt-3 space-y-1">
                        {dispute.notes.map((note, i) => (
                          <div key={i} className="text-xs text-gray-600 bg-blue-50 rounded px-2 py-1.5">
                            <span className="font-medium text-blue-700">Admin note: </span>{note.text}
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Dispute Dialog */}
      <Dialog open={showCreate} onOpenChange={(o) => { if (!o && !submitting) { setShowCreate(false); setSuccessMsg(''); } }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>File a Dispute</DialogTitle>
            <DialogDescription>
              Describe the issue and our team will review it within 7 business days.
            </DialogDescription>
          </DialogHeader>

          {successMsg ? (
            <div className="py-6 text-center">
              <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
              <p className="font-semibold text-gray-900 mb-2">Dispute Submitted</p>
              <p className="text-sm text-gray-500 mb-6">{successMsg}</p>
              <Button onClick={() => { setShowCreate(false); setSuccessMsg(''); }}>
                Close
              </Button>
            </div>
          ) : (
            <>
              <div className="space-y-4 py-2">
                {/* Session picker */}
                {userRole !== 'admin' && (
                  <div>
                    <Label className="mb-1.5 block">Related Session <span className="text-gray-400 font-normal">(recommended)</span></Label>
                    {loadingBookings ? (
                      <div className="flex items-center gap-2 text-sm text-gray-400 py-2">
                        <Loader2 className="w-4 h-4 animate-spin" /> Loading your sessions…
                      </div>
                    ) : bookings.length === 0 ? (
                      <p className="text-sm text-gray-400 italic">No sessions found</p>
                    ) : (
                      <Select value={formData.sessionId} onValueChange={handleSessionSelect}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a session (optional)" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none-selected">Not related to a specific session</SelectItem>
                          {bookings.map((b) => (
                            <SelectItem key={b.id} value={b.id}>
                              <div className="flex items-center gap-2">
                                <span className="font-medium">{b.tutorName || 'Tutor'}</span>
                                {b.notes && <span className="text-gray-500">· {b.notes}</span>}
                                {b.date && (
                                  <span className="text-gray-400 text-xs">
                                    {new Date(`${b.date}T12:00:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                                  </span>
                                )}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}

                    {/* Show selected booking context */}
                    {selectedBooking && (
                      <div className="mt-2 p-3 bg-purple-50 border border-purple-200 rounded-lg text-sm">
                        <div className="flex items-center gap-2 text-gray-700 mb-1">
                          <User className="w-3.5 h-3.5 text-purple-500" />
                          <span className="font-medium">{selectedBooking.tutorName || 'Tutor'}</span>
                          {selectedBooking.studentName && (
                            <span className="text-gray-500">· {selectedBooking.studentName}</span>
                          )}
                        </div>
                        {selectedBooking.date && (
                          <div className="flex items-center gap-2 text-gray-600">
                            <Calendar className="w-3.5 h-3.5 text-purple-400" />
                            <span>{new Date(`${selectedBooking.date}T12:00:00`).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Dispute type */}
                <div>
                  <Label className="mb-1.5 block">Issue Type <span className="text-red-500">*</span></Label>
                  <Select value={formData.type} onValueChange={(v) => setFormData((p) => ({ ...p, type: v }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="What kind of issue is this?" />
                    </SelectTrigger>
                    <SelectContent>
                      {DISPUTE_TYPES.map((t) => (
                        <SelectItem key={t.value} value={t.value}>
                          <div>
                            <span className="font-medium">{t.label}</span>
                            <span className="text-gray-400 ml-2 text-xs">{t.desc}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {formData.type === 'no-show' && selectedBooking && (
                    <p className="text-xs text-amber-600 mt-1.5">
                      Filing this holds the tutor's earnings for this session until an admin reviews it — you don't
                      need to do anything else in the meantime.
                    </p>
                  )}
                </div>

                {/* If no session selected, manual party entry */}
                {!selectedBooking && (
                  <div>
                    <Label className="mb-1.5 block">Who is this dispute against? <span className="text-red-500">*</span></Label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        className="flex-1 px-3 py-2 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-purple-300"
                        value={formData.submittedAgainst}
                        onChange={(e) => setFormData((p) => ({ ...p, submittedAgainst: e.target.value }))}
                        placeholder="Tutor's name or ID"
                      />
                      <Select
                        value={formData.submittedAgainstRole}
                        onValueChange={(v) => setFormData((p) => ({ ...p, submittedAgainstRole: v }))}
                      >
                        <SelectTrigger className="w-32">
                          <SelectValue placeholder="Role" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="tutor">Tutor</SelectItem>
                          <SelectItem value="parent">Parent</SelectItem>
                          <SelectItem value="student">Student</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}

                {/* Description */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <Label>Description <span className="text-red-500">*</span></Label>
                    <span className="text-xs text-gray-400">{formData.description.length}/1000</span>
                  </div>
                  <Textarea
                    value={formData.description}
                    onChange={(e) => setFormData((p) => ({ ...p, description: e.target.value }))}
                    placeholder="Please describe what happened in detail. Include dates, times, and any relevant context…"
                    rows={5}
                    maxLength={1000}
                  />
                </div>

                {/* Info */}
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-xs text-blue-700">
                    <strong>What happens next?</strong> Our team reviews disputes within 7 business days.
                    Both parties may be contacted. You'll be notified of the outcome by email.
                  </p>
                </div>

                {/* Error */}
                {formError && (
                  <Alert className="bg-red-50 border-red-200">
                    <AlertDescription className="text-red-700 text-sm">{formError}</AlertDescription>
                  </Alert>
                )}
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setShowCreate(false)} disabled={submitting}>
                  Cancel
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="text-white"
                  style={{ backgroundColor: '#625d9c' }}
                >
                  {submitting ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Submitting…</>
                  ) : (
                    'Submit Dispute'
                  )}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
