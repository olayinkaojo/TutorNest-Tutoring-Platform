import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from './ui/dialog';
import { Separator } from './ui/separator';
import { toast } from 'sonner@2.0.3';
import { projectId, publicAnonKey } from '../utils/supabase/info.tsx';
import { FileText, Download, Eye, CheckCircle, Clock, XCircle } from 'lucide-react';

interface InvoiceItem {
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

interface InvoiceDiscount {
  type: 'coupon' | 'credit' | 'promotion';
  code?: string;
  description: string;
  amount: number;
}

interface Invoice {
  id: string;
  invoiceNumber: string;
  userId: string;
  userEmail: string;
  userName: string;
  userAddress?: string;
  items: InvoiceItem[];
  subtotal: number;
  vatRate: number;
  vatAmount: number;
  discounts: InvoiceDiscount[];
  totalDiscounts: number;
  total: number;
  currency: string;
  status: 'draft' | 'issued' | 'paid' | 'void';
  issueDate: string;
  dueDate: string;
  paidDate?: string;
  paymentMethod?: string;
  createdAt: string;
  companyInfo?: {
    name: string;
    address: string;
    vatNumber: string;
    email: string;
    phone: string;
  };
  formattedDates?: {
    issueDate: string;
    dueDate: string;
    paidDate?: string;
  };
  formattedAmounts?: {
    subtotal: string;
    totalDiscounts: string;
    vatAmount: string;
    total: string;
  };
}

interface InvoiceManagerProps {
  userId: string;
  isAdmin?: boolean;
}

export function InvoiceManager({ userId, isAdmin = false }: InvoiceManagerProps) {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);

  useEffect(() => {
    fetchInvoices();
  }, [userId]);

  const fetchInvoices = async () => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-cbd74580/invoices/user/${userId}`,
        {
          headers: {
            Authorization: `Bearer ${publicAnonKey}`,
          },
        }
      );

      const data = await response.json();
      if (data.success) {
        setInvoices(data.invoices);
      }
    } catch (error) {
      console.error('Error fetching invoices:', error);
      toast.error('Failed to load invoices');
    } finally {
      setLoading(false);
    }
  };

  const handleViewInvoice = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setViewDialogOpen(true);
  };

  const handleDownloadInvoice = async (invoiceId: string) => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-cbd74580/invoices/${invoiceId}/download`,
        {
          headers: {
            Authorization: `Bearer ${publicAnonKey}`,
          },
        }
      );

      const data = await response.json();
      if (data.success) {
        // In a real app, you'd generate a PDF here. For now, we'll just show the data
        const invoice = data.invoice;
        
        // Create a simple text representation for download
        const textContent = `
TutorNest Invoice
Invoice #: ${invoice.invoiceNumber}
Date: ${invoice.formattedDates.issueDate}

Bill To:
${invoice.userName}
${invoice.userEmail}
${invoice.userAddress || ''}

Items:
${invoice.items.map(item => `${item.description} - £${item.total.toFixed(2)}`).join('\n')}

Subtotal: ${invoice.formattedAmounts.subtotal}
Discounts: ${invoice.formattedAmounts.totalDiscounts}
VAT (${invoice.vatRate}%): ${invoice.formattedAmounts.vatAmount}
Total: ${invoice.formattedAmounts.total}

Status: ${invoice.status.toUpperCase()}
        `.trim();

        const blob = new Blob([textContent], { type: 'text/plain' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `invoice_${invoice.invoiceNumber}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);

        toast.success('Invoice downloaded successfully!');
      } else {
        toast.error('Failed to download invoice');
      }
    } catch (error) {
      console.error('Error downloading invoice:', error);
      toast.error('Failed to download invoice');
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'paid':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'issued':
        return <Clock className="h-4 w-4 text-blue-600" />;
      case 'void':
        return <XCircle className="h-4 w-4 text-gray-400" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return <Badge variant="default">Paid</Badge>;
      case 'issued':
        return <Badge variant="secondary">Issued</Badge>;
      case 'void':
        return <Badge variant="outline">Void</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Invoices & Receipts
          </CardTitle>
          <CardDescription>
            View and download your billing invoices
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-center text-muted-foreground py-8">Loading invoices...</p>
          ) : invoices.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No invoices found</p>
              <p className="text-sm text-muted-foreground mt-2">
                Invoices will appear here after subscription payments
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice #</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.map((invoice) => (
                  <TableRow key={invoice.id}>
                    <TableCell>
                      <code className="text-sm">{invoice.invoiceNumber}</code>
                    </TableCell>
                    <TableCell>
                      {new Date(invoice.issueDate).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      {invoice.items[0]?.description || 'Subscription Payment'}
                    </TableCell>
                    <TableCell>
                      £{invoice.total.toFixed(2)}
                    </TableCell>
                    <TableCell>{getStatusBadge(invoice.status)}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewInvoice(invoice)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDownloadInvoice(invoice.id)}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Invoice Details Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          {selectedInvoice && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  {getStatusIcon(selectedInvoice.status)}
                  Invoice {selectedInvoice.invoiceNumber}
                </DialogTitle>
                <DialogDescription>
                  Issued on {new Date(selectedInvoice.issueDate).toLocaleDateString()}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-6">
                {/* Company & Customer Info */}
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-medium mb-2">From</h4>
                    <p className="text-sm">TutorNest Ltd</p>
                    <p className="text-sm text-muted-foreground">
                      123 Education Street<br />
                      London, UK<br />
                      VAT: GB123456789
                    </p>
                  </div>
                  <div>
                    <h4 className="font-medium mb-2">Bill To</h4>
                    <p className="text-sm">{selectedInvoice.userName}</p>
                    <p className="text-sm text-muted-foreground">
                      {selectedInvoice.userEmail}
                      {selectedInvoice.userAddress && (
                        <>
                          <br />
                          {selectedInvoice.userAddress}
                        </>
                      )}
                    </p>
                  </div>
                </div>

                <Separator />

                {/* Invoice Details */}
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Invoice Date:</span>
                    <p className="font-medium">
                      {new Date(selectedInvoice.issueDate).toLocaleDateString()}
                    </p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Due Date:</span>
                    <p className="font-medium">
                      {new Date(selectedInvoice.dueDate).toLocaleDateString()}
                    </p>
                  </div>
                  {selectedInvoice.paidDate && (
                    <div>
                      <span className="text-muted-foreground">Paid Date:</span>
                      <p className="font-medium">
                        {new Date(selectedInvoice.paidDate).toLocaleDateString()}
                      </p>
                    </div>
                  )}
                  {selectedInvoice.paymentMethod && (
                    <div>
                      <span className="text-muted-foreground">Payment Method:</span>
                      <p className="font-medium">{selectedInvoice.paymentMethod}</p>
                    </div>
                  )}
                </div>

                <Separator />

                {/* Line Items */}
                <div>
                  <h4 className="font-medium mb-3">Items</h4>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Description</TableHead>
                        <TableHead className="text-right">Qty</TableHead>
                        <TableHead className="text-right">Unit Price</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedInvoice.items.map((item, index) => (
                        <TableRow key={index}>
                          <TableCell>{item.description}</TableCell>
                          <TableCell className="text-right">{item.quantity}</TableCell>
                          <TableCell className="text-right">
                            £{item.unitPrice.toFixed(2)}
                          </TableCell>
                          <TableCell className="text-right">
                            £{item.total.toFixed(2)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Totals */}
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Subtotal:</span>
                    <span>£{selectedInvoice.subtotal.toFixed(2)}</span>
                  </div>

                  {selectedInvoice.discounts.length > 0 && (
                    <>
                      {selectedInvoice.discounts.map((discount, index) => (
                        <div key={index} className="flex justify-between text-sm text-green-600">
                          <span>{discount.description}:</span>
                          <span>-£{discount.amount.toFixed(2)}</span>
                        </div>
                      ))}
                    </>
                  )}

                  <div className="flex justify-between text-sm">
                    <span>VAT ({selectedInvoice.vatRate}%):</span>
                    <span>£{selectedInvoice.vatAmount.toFixed(2)}</span>
                  </div>

                  <Separator />

                  <div className="flex justify-between font-bold text-lg">
                    <span>Total:</span>
                    <span>£{selectedInvoice.total.toFixed(2)}</span>
                  </div>
                </div>

                {/* Status */}
                <div className="flex items-center justify-center gap-2 p-3 bg-muted rounded">
                  {getStatusIcon(selectedInvoice.status)}
                  <span className="font-medium">
                    Invoice Status: {selectedInvoice.status.toUpperCase()}
                  </span>
                </div>
              </div>

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setViewDialogOpen(false)}
                >
                  Close
                </Button>
                <Button onClick={() => handleDownloadInvoice(selectedInvoice.id)}>
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
