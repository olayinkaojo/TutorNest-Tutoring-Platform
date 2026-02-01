import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Loader2, Download, Receipt, CreditCard } from 'lucide-react';
import { projectId } from './utils/supabase/info';
import { toast } from 'sonner@2.0.3';

interface Payment {
  id: string;
  bookingId: string;
  tutorId: string;
  studentId: string;
  userId: string;
  amount: number;
  subject: string;
  status: string;
  reference: string;
  createdAt: string;
  verifiedAt?: string;
  metadata?: any;
}

export function PaymentHistory() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPayments();
  }, []);

  const fetchPayments = async () => {
    try {
      const { getSupabaseClient } = await import('../utils/supabase/client');
      const supabase = getSupabaseClient();
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        throw new Error('Please sign in to view payment history');
      }

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-cbd74580/payments/history`,
        {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
          },
        }
      );

      const data = await response.json();

      if (response.ok) {
        setPayments(data.payments || []);
      } else {
        throw new Error(data.error || 'Failed to fetch payment history');
      }
    } catch (error: any) {
      console.error('Error fetching payments:', error);
      toast.error(error.message || 'Failed to load payment history');
    } finally {
      setLoading(false);
    }
  };

  const downloadInvoice = async (paymentId: string) => {
    try {
      const { getSupabaseClient } = await import('../utils/supabase/client');
      const supabase = getSupabaseClient();
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        throw new Error('Please sign in');
      }

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-cbd74580/payments/${paymentId}/invoice`,
        {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
          },
        }
      );

      const data = await response.json();

      if (response.ok && data.invoice) {
        // Create a printable invoice view
        const invoiceWindow = window.open('', '_blank');
        if (invoiceWindow) {
          invoiceWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
              <title>Invoice ${data.invoice.id}</title>
              <style>
                body { font-family: Arial, sans-serif; padding: 40px; }
                .header { text-align: center; margin-bottom: 30px; }
                .invoice-details { margin-bottom: 30px; }
                .items { width: 100%; border-collapse: collapse; margin: 30px 0; }
                .items th, .items td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
                .total { text-align: right; font-size: 20px; font-weight: bold; }
                .badge { display: inline-block; padding: 4px 12px; border-radius: 12px; font-size: 12px; }
                .badge-success { background: #d4edda; color: #155724; }
                .badge-warning { background: #fff3cd; color: #856404; }
              </style>
            </head>
            <body>
              <div class="header">
                <h1>TutorNest</h1>
                <p>Invoice ${data.invoice.id}</p>
                <span class="badge ${data.invoice.status === 'successful' ? 'badge-success' : 'badge-warning'}">
                  ${data.invoice.status.toUpperCase()}
                </span>
              </div>
              
              <div class="invoice-details">
                <div><strong>Date:</strong> ${new Date(data.invoice.date).toLocaleDateString()}</div>
                <div><strong>Reference:</strong> ${data.invoice.reference}</div>
                <div><strong>Customer:</strong> ${data.invoice.to.name}</div>
                <div><strong>Email:</strong> ${data.invoice.to.email}</div>
              </div>
              
              <table class="items">
                <thead>
                  <tr>
                    <th>Description</th>
                    <th>Tutor</th>
                    <th>Date & Time</th>
                    <th>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  ${data.invoice.items.map((item: any) => `
                    <tr>
                      <td>${item.description}</td>
                      <td>${item.tutor}</td>
                      <td>${item.date} at ${item.time}</td>
                      <td>₦${item.amount.toLocaleString()}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
              
              <div class="total">
                Total: ₦${data.invoice.total.toLocaleString()}
              </div>
              
              <p style="margin-top: 30px; font-size: 12px; color: #666;">
                ${data.invoice.notes}
              </p>
              
              <script>
                window.print();
              </script>
            </body>
            </html>
          `);
        }
        
        toast.success('Invoice opened in new window');
      } else {
        throw new Error(data.error || 'Failed to generate invoice');
      }
    } catch (error: any) {
      console.error('Error downloading invoice:', error);
      toast.error(error.message || 'Failed to download invoice');
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      successful: 'default',
      pending: 'secondary',
      failed: 'destructive',
    };

    const colors: Record<string, string> = {
      successful: 'bg-green-100 text-green-800',
      pending: 'bg-yellow-100 text-yellow-800',
      failed: 'bg-red-100 text-red-800',
    };

    return (
      <Badge variant={variants[status] || 'outline'} className={colors[status] || ''}>
        {status}
      </Badge>
    );
  };

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
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="h-5 w-5" />
          Payment History
        </CardTitle>
        <CardDescription>
          View all your payment transactions
        </CardDescription>
      </CardHeader>
      <CardContent>
        {payments.length === 0 ? (
          <div className="text-center py-12">
            <Receipt className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No payments yet</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead>Reference</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments.map((payment) => (
                  <TableRow key={payment.id}>
                    <TableCell>
                      {new Date(payment.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell>{payment.subject}</TableCell>
                    <TableCell className="font-mono text-sm">
                      {payment.reference.substring(0, 20)}...
                    </TableCell>
                    <TableCell>₦{payment.amount.toLocaleString()}</TableCell>
                    <TableCell>{getStatusBadge(payment.status)}</TableCell>
                    <TableCell>
                      {payment.status === 'successful' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => downloadInvoice(payment.id)}
                        >
                          <Download className="h-4 w-4 mr-1" />
                          Invoice
                        </Button>
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
  );
}
