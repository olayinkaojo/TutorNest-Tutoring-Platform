import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Loader2, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { projectId } from '../utils/supabase/info';
import { toast } from 'sonner@2.0.3';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from './ui/alert-dialog';

interface Payout {
  id: string;
  tutorId: string;
  amount: number;
  bankDetails: {
    accountNumber: string;
    bankCode: string;
    accountName?: string;
  };
  status: string;
  requestedAt: string;
  processedAt?: string;
  reference?: string;
  processedBy?: string;
}

export function AdminPayoutsManager() {
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);

  useEffect(() => {
    fetchPayouts();
  }, []);

  const fetchPayouts = async () => {
    try {
      const { getSupabaseClient } = await import('../utils/supabase/client');
      const supabase = getSupabaseClient();
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        throw new Error('Please sign in');
      }

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-cbd74580/admin/payouts`,
        {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
          },
        }
      );

      const data = await response.json();

      if (response.ok) {
        setPayouts(data.payouts || []);
      } else {
        throw new Error(data.error || 'Failed to fetch payouts');
      }
    } catch (error: any) {
      console.error('Error fetching payouts:', error);
      toast.error(error.message || 'Failed to load payouts');
    } finally {
      setLoading(false);
    }
  };

  const processPayout = async (payoutId: string) => {
    setProcessing(payoutId);

    try {
      const { getSupabaseClient } = await import('../utils/supabase/client');
      const supabase = getSupabaseClient();
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        throw new Error('Please sign in');
      }

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-cbd74580/admin/payouts/${payoutId}/process`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
          },
        }
      );

      const data = await response.json();

      if (data.success) {
        toast.success('Payout processed successfully');
        fetchPayouts(); // Refresh the list
      } else {
        throw new Error(data.error || 'Failed to process payout');
      }
    } catch (error: any) {
      console.error('Error processing payout:', error);
      toast.error(error.message || 'Failed to process payout');
    } finally {
      setProcessing(null);
    }
  };

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-800',
      processing: 'bg-blue-100 text-blue-800',
      completed: 'bg-green-100 text-green-800',
      failed: 'bg-red-100 text-red-800',
    };

    const icons: Record<string, any> = {
      pending: AlertCircle,
      processing: Loader2,
      completed: CheckCircle,
      failed: XCircle,
    };

    const Icon = icons[status] || AlertCircle;

    return (
      <Badge className={`${colors[status] || 'bg-gray-100 text-gray-800'} flex items-center gap-1`}>
        <Icon className={`h-3 w-3 ${status === 'processing' ? 'animate-spin' : ''}`} />
        {status}
      </Badge>
    );
  };

  const pendingPayouts = payouts.filter(p => p.status === 'pending');
  const processingPayouts = payouts.filter(p => p.status === 'processing');
  const completedPayouts = payouts.filter(p => p.status === 'completed' || p.status === 'failed');

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm">Pending Payouts</CardTitle>
            <AlertCircle className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl">{pendingPayouts.length}</div>
            <p className="text-xs text-muted-foreground mt-1">
              ₦{pendingPayouts.reduce((sum, p) => sum + p.amount, 0).toLocaleString()}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm">Processing</CardTitle>
            <Loader2 className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl">{processingPayouts.length}</div>
            <p className="text-xs text-muted-foreground mt-1">
              ₦{processingPayouts.reduce((sum, p) => sum + p.amount, 0).toLocaleString()}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm">Completed</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl">{completedPayouts.length}</div>
            <p className="text-xs text-muted-foreground mt-1">
              ₦{completedPayouts.reduce((sum, p) => sum + p.amount, 0).toLocaleString()}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Payouts Table */}
      <Card>
        <CardHeader>
          <CardTitle>Payout Requests</CardTitle>
          <CardDescription>
            Process tutor withdrawal requests
          </CardDescription>
        </CardHeader>
        <CardContent>
          {payouts.length === 0 ? (
            <div className="text-center py-12">
              <CheckCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No payout requests</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Requested Date</TableHead>
                    <TableHead>Tutor ID</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Bank Details</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payouts.map((payout) => (
                    <TableRow key={payout.id}>
                      <TableCell>
                        {new Date(payout.requestedAt).toLocaleDateString()}
                        <br />
                        <span className="text-xs text-muted-foreground">
                          {new Date(payout.requestedAt).toLocaleTimeString()}
                        </span>
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {payout.tutorId.substring(0, 8)}...
                      </TableCell>
                      <TableCell>
                        <span className="text-lg">₦{payout.amount.toLocaleString()}</span>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <div>{payout.bankDetails.accountName || 'N/A'}</div>
                          <div className="text-muted-foreground">
                            {payout.bankDetails.accountNumber}
                          </div>
                          <div className="text-muted-foreground text-xs">
                            Bank Code: {payout.bankDetails.bankCode}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(payout.status)}</TableCell>
                      <TableCell>
                        {payout.status === 'pending' && (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button 
                                size="sm" 
                                disabled={processing === payout.id}
                              >
                                {processing === payout.id && (
                                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                )}
                                Process
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Process Payout</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This will initiate a transfer of ₦{payout.amount.toLocaleString()} to account {payout.bankDetails.accountNumber}.
                                  This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => processPayout(payout.id)}>
                                  Confirm & Process
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}
                        {payout.status === 'processing' && (
                          <span className="text-sm text-muted-foreground">In progress...</span>
                        )}
                        {payout.status === 'completed' && (
                          <div className="text-sm">
                            <div className="text-green-600">Completed</div>
                            {payout.reference && (
                              <div className="text-xs text-muted-foreground font-mono">
                                {payout.reference.substring(0, 15)}...
                              </div>
                            )}
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
