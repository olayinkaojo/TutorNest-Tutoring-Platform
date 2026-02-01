import React, { useState, useEffect } from 'react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Badge } from '../ui/badge';
import { 
  FileText,
  Download,
  Send,
  DollarSign,
  Calendar,
  CheckCircle2,
  Clock,
  AlertCircle,
  Loader2,
  Search,
  Filter,
  Eye
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { projectId, publicAnonKey } from '../../utils/supabase/info';

interface Invoice {
  id: string;
  invoiceNumber: string;
  poReference?: string;
  issueDate: string;
  dueDate: string;
  paidDate?: string;
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
  items: InvoiceItem[];
  subtotal: number;
  vatAmount: number;
  vatRate: number;
  total: number;
  currency: string;
  notes?: string;
  paymentTerms: number; // days
}

interface InvoiceItem {
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
  studentName?: string;
  tutorName?: string;
  sessionDate?: string;
}

interface OrganisationInvoicingProps {
  organisationId: string;
  accessToken: string;
  organisationData: any;
}

export function OrganisationInvoicing({ organisationId, accessToken, organisationData }: OrganisationInvoicingProps) {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showPODialog, setShowPODialog] = useState(false);
  const [poReference, setPOReference] = useState('');

  useEffect(() => {
    loadInvoices();
  }, [organisationId]);

  const loadInvoices = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-cbd74580/organisations/${organisationId}/invoices`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`
          }
        }
      );

      if (response.ok) {
        const data = await response.json();
        setInvoices(data.invoices || []);
      }
    } catch (error) {
      console.error('Error loading invoices:', error);
      toast.error('Failed to load invoices');
    } finally {
      setLoading(false);
    }
  };

  const generateInvoice = async () => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-cbd74580/organisations/${organisationId}/invoices/generate`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            poReference,
            billingCycle: organisationData?.settings?.billingCycle || 'monthly'
          })
        }
      );

      if (response.ok) {
        toast.success('Invoice generated successfully');
        setPOReference('');
        setShowPODialog(false);
        loadInvoices();
      } else {
        toast.error('Failed to generate invoice');
      }
    } catch (error) {
      console.error('Error generating invoice:', error);
      toast.error('Failed to generate invoice');
    }
  };

  const downloadInvoice = async (invoiceId: string, format: 'pdf' | 'csv' = 'pdf') => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-cbd74580/organisations/${organisationId}/invoices/${invoiceId}/download?format=${format}`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`
          }
        }
      );

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `invoice-${invoiceId}.${format}`;
        a.click();
        window.URL.revokeObjectURL(url);
        toast.success('Invoice downloaded');
      } else {
        toast.error('Failed to download invoice');
      }
    } catch (error) {
      console.error('Error downloading invoice:', error);
      toast.error('Failed to download invoice');
    }
  };

  const sendInvoiceToFinance = async (invoiceId: string) => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-cbd74580/organisations/${organisationId}/invoices/${invoiceId}/send`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`
          }
        }
      );

      if (response.ok) {
        toast.success('Invoice sent to finance team');
        loadInvoices();
      } else {
        toast.error('Failed to send invoice');
      }
    } catch (error) {
      console.error('Error sending invoice:', error);
      toast.error('Failed to send invoice');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return 'bg-green-100 text-green-800';
      case 'sent':
        return 'bg-blue-100 text-blue-800';
      case 'overdue':
        return 'bg-red-100 text-red-800';
      case 'draft':
        return 'bg-gray-100 text-gray-800';
      case 'cancelled':
        return 'bg-gray-100 text-gray-600';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'paid':
        return <CheckCircle2 className="w-4 h-4" />;
      case 'sent':
        return <Send className="w-4 h-4" />;
      case 'overdue':
        return <AlertCircle className="w-4 h-4" />;
      case 'draft':
        return <FileText className="w-4 h-4" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  const filteredInvoices = invoices.filter(invoice => {
    const matchesSearch = 
      invoice.invoiceNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      invoice.poReference?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || invoice.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const totalUnpaid = invoices
    .filter(i => i.status !== 'paid' && i.status !== 'cancelled')
    .reduce((sum, i) => sum + i.total, 0);

  const totalOverdue = invoices
    .filter(i => i.status === 'overdue')
    .reduce((sum, i) => sum + i.total, 0);

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="w-8 h-8 animate-spin text-[#625d9c]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl">Invoicing & Purchase Orders</h2>
          <p className="text-gray-600 mt-1">
            Manage invoices with PO references for your organisation
          </p>
        </div>
        <Button onClick={() => setShowPODialog(true)} className="bg-[#5d9827] hover:bg-[#4a7a1f]">
          <FileText className="w-4 h-4 mr-2" />
          Generate Invoice
        </Button>
      </div>

      {/* Stats */}
      <div className="grid md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="text-2xl font-bold text-[#625d9c]">
            {invoices.length}
          </div>
          <div className="text-sm text-gray-600">Total Invoices</div>
        </Card>
        <Card className="p-4">
          <div className="text-2xl font-bold text-yellow-600">
            £{totalUnpaid.toFixed(2)}
          </div>
          <div className="text-sm text-gray-600">Unpaid Amount</div>
        </Card>
        <Card className="p-4">
          <div className="text-2xl font-bold text-red-600">
            £{totalOverdue.toFixed(2)}
          </div>
          <div className="text-sm text-gray-600">Overdue Amount</div>
        </Card>
        <Card className="p-4">
          <div className="text-2xl font-bold text-green-600">
            {invoices.filter(i => i.status === 'paid').length}
          </div>
          <div className="text-sm text-gray-600">Paid Invoices</div>
        </Card>
      </div>

      {/* Search and Filters */}
      <Card className="p-4">
        <div className="flex gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search by invoice number or PO reference..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <select
            className="p-2 border rounded-lg"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">All Statuses</option>
            <option value="draft">Draft</option>
            <option value="sent">Sent</option>
            <option value="paid">Paid</option>
            <option value="overdue">Overdue</option>
          </select>
        </div>
      </Card>

      {/* Invoice List and Detail */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Invoice List */}
        <Card className="p-6">
          <h3 className="text-xl mb-4">Invoices ({filteredInvoices.length})</h3>
          <div className="space-y-2 max-h-[600px] overflow-y-auto">
            {filteredInvoices.map((invoice) => (
              <Card
                key={invoice.id}
                className={`p-4 cursor-pointer hover:border-[#625d9c] transition-colors ${
                  selectedInvoice?.id === invoice.id ? 'border-[#625d9c] border-2' : ''
                }`}
                onClick={() => setSelectedInvoice(invoice)}
              >
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-medium">{invoice.invoiceNumber}</h4>
                      <Badge className={getStatusColor(invoice.status)}>
                        <span className="flex items-center gap-1">
                          {getStatusIcon(invoice.status)}
                          {invoice.status}
                        </span>
                      </Badge>
                    </div>
                    {invoice.poReference && (
                      <p className="text-sm text-gray-600">
                        PO: {invoice.poReference}
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-[#625d9c]">
                      £{invoice.total.toFixed(2)}
                    </div>
                    <div className="text-xs text-gray-600">
                      {invoice.items.length} item{invoice.items.length !== 1 ? 's' : ''}
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 text-xs text-gray-500">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    Issued: {new Date(invoice.issueDate).toLocaleDateString()}
                  </span>
                  <span>
                    Due: {new Date(invoice.dueDate).toLocaleDateString()}
                  </span>
                </div>

                {invoice.status === 'overdue' && (
                  <div className="mt-2 text-xs text-red-600 font-medium">
                    Overdue by {Math.floor((Date.now() - new Date(invoice.dueDate).getTime()) / (1000 * 60 * 60 * 24))} days
                  </div>
                )}
              </Card>
            ))}

            {filteredInvoices.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <FileText className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                <p>No invoices found</p>
              </div>
            )}
          </div>
        </Card>

        {/* Invoice Detail */}
        <Card className="p-6">
          {selectedInvoice ? (
            <div className="space-y-6">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-2xl mb-1">{selectedInvoice.invoiceNumber}</h3>
                  <Badge className={getStatusColor(selectedInvoice.status)}>
                    {selectedInvoice.status}
                  </Badge>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => downloadInvoice(selectedInvoice.id, 'pdf')}
                  >
                    <Download className="w-4 h-4" />
                  </Button>
                  {selectedInvoice.status === 'draft' && (
                    <Button
                      size="sm"
                      onClick={() => sendInvoiceToFinance(selectedInvoice.id)}
                      className="bg-[#5d9827] hover:bg-[#4a7a1f]"
                    >
                      <Send className="w-4 h-4 mr-1" />
                      Send
                    </Button>
                  )}
                </div>
              </div>

              <Separator />

              {/* Invoice Details */}
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Issue Date:</span>
                    <p className="font-medium">
                      {new Date(selectedInvoice.issueDate).toLocaleDateString()}
                    </p>
                  </div>
                  <div>
                    <span className="text-gray-600">Due Date:</span>
                    <p className="font-medium">
                      {new Date(selectedInvoice.dueDate).toLocaleDateString()}
                    </p>
                  </div>
                  {selectedInvoice.poReference && (
                    <div className="col-span-2">
                      <span className="text-gray-600">PO Reference:</span>
                      <p className="font-medium font-mono">{selectedInvoice.poReference}</p>
                    </div>
                  )}
                  <div>
                    <span className="text-gray-600">Payment Terms:</span>
                    <p className="font-medium">{selectedInvoice.paymentTerms} days</p>
                  </div>
                  {selectedInvoice.paidDate && (
                    <div>
                      <span className="text-gray-600">Paid Date:</span>
                      <p className="font-medium text-green-600">
                        {new Date(selectedInvoice.paidDate).toLocaleDateString()}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <Separator />

              {/* Line Items */}
              <div>
                <h4 className="font-medium mb-3">Line Items</h4>
                <div className="space-y-2">
                  {selectedInvoice.items.map((item, idx) => (
                    <Card key={idx} className="p-3">
                      <div className="flex justify-between items-start mb-1">
                        <div className="flex-1">
                          <p className="font-medium text-sm">{item.description}</p>
                          {item.studentName && (
                            <p className="text-xs text-gray-600">Student: {item.studentName}</p>
                          )}
                          {item.tutorName && (
                            <p className="text-xs text-gray-600">Tutor: {item.tutorName}</p>
                          )}
                          {item.sessionDate && (
                            <p className="text-xs text-gray-600">
                              Date: {new Date(item.sessionDate).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                        <div className="text-right">
                          <p className="font-medium">£{item.amount.toFixed(2)}</p>
                          <p className="text-xs text-gray-600">
                            {item.quantity} × £{item.unitPrice.toFixed(2)}
                          </p>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>

              <Separator />

              {/* Totals */}
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Subtotal:</span>
                  <span className="font-medium">£{selectedInvoice.subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">VAT ({selectedInvoice.vatRate}%):</span>
                  <span className="font-medium">£{selectedInvoice.vatAmount.toFixed(2)}</span>
                </div>
                <Separator />
                <div className="flex justify-between text-lg">
                  <span className="font-bold">Total:</span>
                  <span className="font-bold text-[#625d9c]">
                    £{selectedInvoice.total.toFixed(2)}
                  </span>
                </div>
              </div>

              {selectedInvoice.notes && (
                <>
                  <Separator />
                  <div>
                    <h4 className="font-medium mb-2 text-sm">Notes</h4>
                    <p className="text-sm text-gray-600">{selectedInvoice.notes}</p>
                  </div>
                </>
              )}

              {/* Actions */}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => downloadInvoice(selectedInvoice.id, 'pdf')}
                  className="flex-1"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download PDF
                </Button>
                <Button
                  variant="outline"
                  onClick={() => downloadInvoice(selectedInvoice.id, 'csv')}
                  className="flex-1"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Export CSV
                </Button>
              </div>
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500">
              <FileText className="w-16 h-16 mx-auto mb-4 text-gray-400" />
              <p>Select an invoice to view details</p>
            </div>
          )}
        </Card>
      </div>

      {/* Generate Invoice Dialog */}
      {showPODialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="p-6 max-w-md w-full m-4">
            <h3 className="text-xl mb-4">Generate New Invoice</h3>
            <div className="space-y-4">
              <div>
                <Label htmlFor="po-reference">Purchase Order Reference (Optional)</Label>
                <Input
                  id="po-reference"
                  placeholder="e.g., PO-2024-001"
                  value={poReference}
                  onChange={(e) => setPOReference(e.target.value)}
                />
                <p className="text-xs text-gray-600 mt-1">
                  Enter your organisation's PO number for tracking
                </p>
              </div>

              <Card className="p-4 bg-blue-50 border-blue-200">
                <p className="text-sm text-blue-900">
                  This will generate an invoice for all unbilled sessions and subscription
                  fees for the current billing period ({organisationData?.settings?.billingCycle}).
                </p>
              </Card>

              <div className="flex gap-3 pt-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowPODialog(false);
                    setPOReference('');
                  }}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={generateInvoice}
                  className="flex-1 bg-[#5d9827] hover:bg-[#4a7a1f]"
                >
                  Generate Invoice
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
