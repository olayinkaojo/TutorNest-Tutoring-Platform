/**
 * Admin Payout Batch Management
 * Interface for admins to manage weekly payout batches with approval workflow
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Alert, AlertDescription } from './ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from './ui/dialog';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import {
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  Download,
  Eye,
  RefreshCw,
  Filter,
} from 'lucide-react';
import { formatNaira } from '../utils/currency';
import adminAPI from '../utils/admin-api-client';

interface PayoutBatch {
  id: string;
  batchNumber: string;
  scheduledDate: string; // ISO 8601
  status: 'scheduled' | 'processing' | 'completed' | 'failed' | 'cancelled';
  totalPayouts: number;
  totalAmount: number;
  successfulCount: number;
  failedCount: number;
  createdAt: string;
  processedAt?: string;
  notes?: string;
}

interface PayoutRequest {
  id: string;
  tutorId: string;
  tutorName: string;
  amount: number;
  state: 'pending_approval' | 'approved' | 'processing' | 'completed' | 'failed';
  reference?: string;
  requestedAt: string;
  approvedAt?: string;
  completedAt?: string;
  failureReason?: string;
  retryCount?: number;
}

export function AdminPayoutBatchManager() {
  const [batches, setBatches] = useState<PayoutBatch[]>([]);
  const [selectedBatch, setSelectedBatch] = useState<PayoutBatch | null>(null);
  const [batchPayouts, setBatchPayouts] = useState<PayoutRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [showApprovalDialog, setShowApprovalDialog] = useState(false);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [approvalNotes, setApprovalNotes] = useState('');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    fetchPayoutBatches();
    const interval = setInterval(fetchPayoutBatches, 60000); // Refresh every minute
    return () => clearInterval(interval);
  }, []);

  const fetchPayoutBatches = async () => {
    try {
      setLoading(true);
      const data = await adminAPI.getPayoutBatches();
      setBatches(data || []);
    } catch (error) {
      console.error('Error fetching payout batches:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchBatchPayouts = async (batchId: string) => {
    try {
      const data = await adminAPI.getPayoutBatchDetails(batchId);
      setBatchPayouts(data?.payouts || []);
    } catch (error) {
      console.error('Error fetching batch payouts:', error);
    }
  };

  const handleViewDetails = async (batch: PayoutBatch) => {
    setSelectedBatch(batch);
    await fetchBatchPayouts(batch.id);
    setShowDetailsDialog(true);
  };

  const handleApproveBatch = async () => {
    if (!selectedBatch) return;

    try {
      setProcessing(true);
      await adminAPI.approveBatch(selectedBatch.id, approvalNotes);
      setApprovalNotes('');
      setShowApprovalDialog(false);
      await fetchPayoutBatches();
    } catch (error) {
      console.error('Error approving batch:', error);
    } finally {
      setProcessing(false);
    }
  };

  const handleProcessBatch = async () => {
    if (!selectedBatch) return;

    try {
      setProcessing(true);
      await adminAPI.processBatch(selectedBatch.id);
      await fetchPayoutBatches();
      setShowDetailsDialog(false);
    } catch (error) {
      console.error('Error processing batch:', error);
    } finally {
      setProcessing(false);
    }
  };

  const handleRetryFailedPayouts = async (batchId: string) => {
    try {
      setProcessing(true);
      await adminAPI.retryFailedPayouts(batchId);
      await fetchPayoutBatches();
    } catch (error) {
      console.error('Error retrying failed payouts:', error);
    } finally {
      setProcessing(false);
    }
  };

  const formatISODate = (isoDate: string): string => {
    if (!isoDate) return 'N/A';
    return new Date(isoDate).toLocaleDateString('en-GB', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { color: string; icon: React.ReactNode }> = {
      scheduled: { color: '#f59e0b', icon: <Clock className="w-4 h-4" /> },
      processing: { color: '#3b82f6', icon: <RefreshCw className="w-4 h-4" /> },
      completed: { color: '#10b981', icon: <CheckCircle className="w-4 h-4" /> },
      failed: { color: '#ef4444', icon: <XCircle className="w-4 h-4" /> },
      cancelled: { color: '#6b7280', icon: <XCircle className="w-4 h-4" /> },
    };

    const config = statusMap[status] || statusMap.scheduled;
    return (
      <Badge style={{ backgroundColor: config.color, color: 'white' }} className="gap-1">
        {config.icon}
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const filteredBatches = batches.filter((batch) =>
    filterStatus === 'all' ? true : batch.status === filterStatus
  );

  if (loading) {
    return <div className="text-center py-8">Loading payout batches...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-gray-600">Active Batches</p>
            <p className="text-2xl font-bold mt-2">
              {batches.filter((b) => b.status === 'processing' || b.status === 'scheduled').length}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-gray-600">Total Pending</p>
            <p className="text-2xl font-bold mt-2">
              {formatNaira(
                batches
                  .filter((b) => b.status === 'scheduled')
                  .reduce((sum, b) => sum + b.totalAmount, 0)
                  .toString()
              )}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-gray-600">Processed This Month</p>
            <p className="text-2xl font-bold mt-2">
              {formatNaira(
                batches
                  .filter((b) => b.status === 'completed')
                  .reduce((sum, b) => sum + b.totalAmount, 0)
                  .toString()
              )}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-gray-600">Success Rate</p>
            <p className="text-2xl font-bold mt-2">
              {batches.length > 0
                ? Math.round(
                    (batches.reduce((sum, b) => sum + b.successfulCount, 0) /
                      batches.reduce((sum, b) => sum + b.totalPayouts, 0)) *
                      100
                  )
                : 0}
              %
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filter Bar */}
      <div className="flex gap-2">
        <Button
          variant={filterStatus === 'all' ? 'default' : 'outline'}
          onClick={() => setFilterStatus('all')}
          size="sm"
        >
          All
        </Button>
        <Button
          variant={filterStatus === 'scheduled' ? 'default' : 'outline'}
          onClick={() => setFilterStatus('scheduled')}
          size="sm"
        >
          Pending
        </Button>
        <Button
          variant={filterStatus === 'processing' ? 'default' : 'outline'}
          onClick={() => setFilterStatus('processing')}
          size="sm"
        >
          Processing
        </Button>
        <Button
          variant={filterStatus === 'completed' ? 'default' : 'outline'}
          onClick={() => setFilterStatus('completed')}
          size="sm"
        >
          Completed
        </Button>
        <Button
          variant={filterStatus === 'failed' ? 'default' : 'outline'}
          onClick={() => setFilterStatus('failed')}
          size="sm"
        >
          Failed
        </Button>
        <Button variant="outline" size="sm" className="ml-auto gap-2">
          <RefreshCw className="w-4 h-4" />
          Refresh
        </Button>
      </div>

      {/* Batches Table */}
      <Card>
        <CardHeader>
          <CardTitle>Payout Batches</CardTitle>
          <CardDescription>Weekly automatic payout batches with approval workflow</CardDescription>
        </CardHeader>
        <CardContent>
          {filteredBatches.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <AlertCircle className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>No batches found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Batch Number</TableHead>
                    <TableHead>Scheduled Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Total Amount</TableHead>
                    <TableHead className="text-right">Payouts</TableHead>
                    <TableHead className="text-right">Success</TableHead>
                    <TableHead className="text-right">Failed</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredBatches.map((batch) => (
                    <TableRow key={batch.id}>
                      <TableCell className="font-mono text-sm">{batch.batchNumber}</TableCell>
                      <TableCell>{formatISODate(batch.scheduledDate)}</TableCell>
                      <TableCell>{getStatusBadge(batch.status)}</TableCell>
                      <TableCell className="text-right font-bold">
                        {formatNaira(batch.totalAmount.toString())}
                      </TableCell>
                      <TableCell className="text-right">{batch.totalPayouts}</TableCell>
                      <TableCell className="text-right text-green-600">
                        {batch.successfulCount}
                      </TableCell>
                      <TableCell className="text-right text-red-600">{batch.failedCount}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-2 justify-end">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleViewDetails(batch)}
                            className="gap-1"
                          >
                            <Eye className="w-4 h-4" />
                            Details
                          </Button>
                          {batch.status === 'scheduled' && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedBatch(batch);
                                setShowApprovalDialog(true);
                              }}
                            >
                              Approve
                            </Button>
                          )}
                          {batch.status === 'approved' && (
                            <Button
                              size="sm"
                              onClick={() => {
                                setSelectedBatch(batch);
                                handleProcessBatch();
                              }}
                              disabled={processing}
                            >
                              Process
                            </Button>
                          )}
                          {batch.failedCount > 0 && batch.status !== 'processing' && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleRetryFailedPayouts(batch.id)}
                              disabled={processing}
                            >
                              Retry
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Approval Dialog */}
      <Dialog open={showApprovalDialog} onOpenChange={setShowApprovalDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve Payout Batch</DialogTitle>
            <DialogDescription>
              Review and approve the batch before processing payouts
            </DialogDescription>
          </DialogHeader>
          {selectedBatch && (
            <div className="space-y-4 py-4">
              <div>
                <Label>Batch Number</Label>
                <p className="text-sm font-mono mt-1">{selectedBatch.batchNumber}</p>
              </div>
              <div>
                <Label>Total Amount</Label>
                <p className="text-lg font-bold mt-1">{formatNaira(selectedBatch.totalAmount.toString())}</p>
              </div>
              <div>
                <Label>Number of Payouts</Label>
                <p className="text-sm mt-1">{selectedBatch.totalPayouts} tutors</p>
              </div>
              <div>
                <Label htmlFor="notes">Approval Notes</Label>
                <Textarea
                  id="notes"
                  placeholder="Add any notes about this approval..."
                  value={approvalNotes}
                  onChange={(e) => setApprovalNotes(e.target.value)}
                  className="mt-1"
                  rows={3}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowApprovalDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleApproveBatch} disabled={processing}>
              Approve Batch
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Details Dialog */}
      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent className="max-w-2xl max-h-96 overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Batch Details</DialogTitle>
            <DialogDescription>
              {selectedBatch?.batchNumber} - {selectedBatch?.totalPayouts} payouts
            </DialogDescription>
          </DialogHeader>
          {batchPayouts.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tutor</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Reference</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {batchPayouts.map((payout) => (
                  <TableRow key={payout.id}>
                    <TableCell>{payout.tutorName}</TableCell>
                    <TableCell className="text-right">{formatNaira(payout.amount.toString())}</TableCell>
                    <TableCell>{getStatusBadge(payout.state)}</TableCell>
                    <TableCell className="font-mono text-sm">{payout.reference || '-'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8 text-gray-500">Loading payouts...</div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
