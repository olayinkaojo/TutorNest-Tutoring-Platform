import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Badge } from './ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { toast } from 'sonner@2.0.3';
import { projectId } from '../utils/supabase/info.tsx';
import { FileText, Download, TrendingUp, DollarSign, Calendar, Plus } from 'lucide-react';

interface TaxReport {
  id: string;
  reportType: 'monthly' | 'quarterly' | 'yearly';
  startDate: string;
  endDate: string;
  totalRevenue: number;
  totalVAT: number;
  totalDiscounts: number;
  totalRefunds: number;
  netRevenue: number;
  invoiceCount: number;
  breakdown: {
    byCountry: Record<string, { revenue: number; vat: number; count: number }>;
    byTier: Record<string, { revenue: number; count: number }>;
  };
  createdAt: string;
}

interface TaxReportsManagerProps {
  adminId: string;
  accessToken: string;
}

export function TaxReportsManager({ adminId, accessToken }: TaxReportsManagerProps) {
  const [reports, setReports] = useState<TaxReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Form state
  const [reportType, setReportType] = useState<'monthly' | 'quarterly' | 'yearly'>('monthly');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-cbd74580/tax/reports`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to load tax reports (${response.status})`);
      }

      const data = await response.json();
      if (data.success) {
        setReports(data.reports);
      } else {
        throw new Error(data.error || 'Failed to load tax reports');
      }
    } catch (error) {
      console.error('Error fetching tax reports:', error);
      toast.error('Failed to load tax reports');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateReport = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!startDate || !endDate) {
      toast.error('Please select both start and end dates');
      return;
    }

    if (new Date(startDate) > new Date(endDate)) {
      toast.error('Start date must be before end date');
      return;
    }

    setGenerating(true);

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-cbd74580/tax/reports/generate`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            reportType,
            startDate,
            endDate,
            adminId,
          }),
        }
      );

      const data = await response.json();

      if (data.success) {
        toast.success('Tax report generated successfully!');
        fetchReports();
        setIsDialogOpen(false);
        setStartDate('');
        setEndDate('');
      } else {
        toast.error(data.error || 'Failed to generate report');
      }
    } catch (error) {
      console.error('Error generating report:', error);
      toast.error('Failed to generate report');
    } finally {
      setGenerating(false);
    }
  };

  const handleExportAccounting = async () => {
    const start = startDate || new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0];
    const end = endDate || new Date().toISOString().split('T')[0];

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-cbd74580/tax/export`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            startDate: start,
            endDate: end,
            format: 'csv',
          }),
        }
      );

      const data = await response.json();

      if (data.success) {
        // Download the CSV
        const blob = new Blob([data.content], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = data.filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);

        toast.success(`Exported ${data.recordCount} records`);
      } else {
        toast.error('Failed to export data');
      }
    } catch (error) {
      console.error('Error exporting data:', error);
      toast.error('Failed to export data');
    }
  };

  // Helper to set quick date ranges
  const setQuickRange = (type: 'this_month' | 'last_month' | 'this_quarter' | 'this_year') => {
    const now = new Date();
    let start: Date, end: Date;

    switch (type) {
      case 'this_month':
        start = new Date(now.getFullYear(), now.getMonth(), 1);
        end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        setReportType('monthly');
        break;
      case 'last_month':
        start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        end = new Date(now.getFullYear(), now.getMonth(), 0);
        setReportType('monthly');
        break;
      case 'this_quarter':
        const quarter = Math.floor(now.getMonth() / 3);
        start = new Date(now.getFullYear(), quarter * 3, 1);
        end = new Date(now.getFullYear(), quarter * 3 + 3, 0);
        setReportType('quarterly');
        break;
      case 'this_year':
        start = new Date(now.getFullYear(), 0, 1);
        end = new Date(now.getFullYear(), 11, 31);
        setReportType('yearly');
        break;
    }

    setStartDate(start.toISOString().split('T')[0]);
    setEndDate(end.toISOString().split('T')[0]);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2>Tax Reports & Accounting</h2>
          <p className="text-muted-foreground">Generate VAT reports and export accounting data</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExportAccounting}>
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Generate Report
              </Button>
            </DialogTrigger>
            <DialogContent>
              <form onSubmit={handleGenerateReport}>
                <DialogHeader>
                  <DialogTitle>Generate Tax Report</DialogTitle>
                  <DialogDescription>
                    Create a VAT and revenue report for a specific period
                  </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="reportType">Report Type</Label>
                    <Select value={reportType} onValueChange={(val: any) => setReportType(val)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="monthly">Monthly</SelectItem>
                        <SelectItem value="quarterly">Quarterly</SelectItem>
                        <SelectItem value="yearly">Yearly</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid gap-2">
                    <Label>Quick Ranges</Label>
                    <div className="flex gap-2 flex-wrap">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setQuickRange('this_month')}
                      >
                        This Month
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setQuickRange('last_month')}
                      >
                        Last Month
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setQuickRange('this_quarter')}
                      >
                        This Quarter
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setQuickRange('this_year')}
                      >
                        This Year
                      </Button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="startDate">Start Date</Label>
                      <Input
                        id="startDate"
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        required
                      />
                    </div>

                    <div className="grid gap-2">
                      <Label htmlFor="endDate">End Date</Label>
                      <Input
                        id="endDate"
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        required
                      />
                    </div>
                  </div>
                </div>

                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={generating}>
                    {generating ? 'Generating...' : 'Generate Report'}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {loading ? (
        <Card>
          <CardContent className="p-6">
            <p className="text-center text-muted-foreground">Loading reports...</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Reports List */}
          <Card>
            <CardHeader>
              <CardTitle>Generated Reports</CardTitle>
              <CardDescription>
                {reports.length} report{reports.length !== 1 ? 's' : ''} available
              </CardDescription>
            </CardHeader>
            <CardContent>
              {reports.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  No reports generated yet. Click "Generate Report" to create one.
                </p>
              ) : (
                <div className="space-y-4">
                  {reports.map((report) => (
                    <Card key={report.id}>
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between mb-4">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="font-medium capitalize">{report.reportType} Report</h3>
                              <Badge variant="outline">
                                {new Date(report.startDate).toLocaleDateString()} -{' '}
                                {new Date(report.endDate).toLocaleDateString()}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              Generated {new Date(report.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                          <Button variant="outline" size="sm">
                            <Download className="h-4 w-4 mr-2" />
                            Download
                          </Button>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          <div>
                            <p className="text-sm text-muted-foreground">Total Revenue</p>
                            <p className="text-lg font-medium">£{report.totalRevenue.toFixed(2)}</p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Total VAT</p>
                            <p className="text-lg font-medium">£{report.totalVAT.toFixed(2)}</p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Net Revenue</p>
                            <p className="text-lg font-medium text-green-600">
                              £{report.netRevenue.toFixed(2)}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Invoices</p>
                            <p className="text-lg font-medium">{report.invoiceCount}</p>
                          </div>
                        </div>

                        {report.totalRefunds > 0 && (
                          <div className="mt-4 p-3 bg-orange-50 border border-orange-200 rounded">
                            <p className="text-sm">
                              <span className="font-medium">Refunds:</span> £
                              {report.totalRefunds.toFixed(2)}
                            </p>
                          </div>
                        )}

                        {report.totalDiscounts > 0 && (
                          <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded">
                            <p className="text-sm">
                              <span className="font-medium">Discounts:</span> £
                              {report.totalDiscounts.toFixed(2)}
                            </p>
                          </div>
                        )}

                        {/* Breakdown by Tier */}
                        {Object.keys(report.breakdown.byTier).length > 0 && (
                          <div className="mt-4">
                            <h4 className="text-sm font-medium mb-2">Revenue by Tier</h4>
                            <div className="grid grid-cols-3 gap-2">
                              {Object.entries(report.breakdown.byTier).map(([tier, data]) => (
                                <div key={tier} className="p-2 bg-muted rounded text-sm">
                                  <p className="font-medium capitalize">{tier}</p>
                                  <p className="text-muted-foreground">
                                    £{data.revenue.toFixed(2)} ({data.count})
                                  </p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
