import React, { useState, useEffect } from 'react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { 
  AlertTriangle,
  Clock,
  Mail,
  FileText,
  CheckCircle2,
  XCircle,
  Calendar,
  DollarSign,
  Send,
  Loader2,
  Bell
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { projectId } from '../../utils/supabase/info';

interface OverdueInvoice {
  id: string;
  invoiceNumber: string;
  poReference?: string;
  amount: number;
  dueDate: string;
  daysOverdue: number;
  remindersSent: number;
  lastReminderDate?: string;
  status: 'overdue' | 'escalated' | 'disputed';
}

interface DunningConfig {
  enabled: boolean;
  firstReminderDays: number; // days after due date
  secondReminderDays: number;
  thirdReminderDays: number;
  escalationDays: number;
  autoSendReminders: boolean;
  ccFinanceTeam: boolean;
}

interface DunningSystemProps {
  organisationId: string;
  accessToken: string;
  organisationData: any;
}

export function DunningSystem({ organisationId, accessToken, organisationData }: DunningSystemProps) {
  const [overdueInvoices, setOverdueInvoices] = useState<OverdueInvoice[]>([]);
  const [config, setConfig] = useState<DunningConfig>({
    enabled: true,
    firstReminderDays: 7,
    secondReminderDays: 14,
    thirdReminderDays: 21,
    escalationDays: 30,
    autoSendReminders: true,
    ccFinanceTeam: true
  });
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState<string | null>(null);
  const [savingConfig, setSavingConfig] = useState(false);

  useEffect(() => {
    loadDunningData();
  }, [organisationId]);

  const loadDunningData = async () => {
    setLoading(true);
    try {
      const [invoicesRes, configRes] = await Promise.all([
        fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-cbd74580/organisations/${organisationId}/dunning/overdue`,
          { headers: { 'Authorization': `Bearer ${accessToken}` } }
        ),
        fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-cbd74580/organisations/${organisationId}/dunning/config`,
          { headers: { 'Authorization': `Bearer ${accessToken}` } }
        )
      ]);

      if (invoicesRes.ok) {
        const data = await invoicesRes.json();
        setOverdueInvoices(data.invoices || []);
      }

      if (configRes.ok) {
        const data = await configRes.json();
        if (data.config) {
          setConfig(data.config);
        }
      }
    } catch (error) {
      console.error('Error loading dunning data:', error);
      toast.error('Failed to load dunning data');
    } finally {
      setLoading(false);
    }
  };

  const sendReminder = async (invoiceId: string) => {
    setSending(invoiceId);
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-cbd74580/organisations/${organisationId}/dunning/${invoiceId}/send-reminder`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.ok) {
        toast.success('Payment reminder sent');
        loadDunningData();
      } else {
        toast.error('Failed to send reminder');
      }
    } catch (error) {
      console.error('Error sending reminder:', error);
      toast.error('Failed to send reminder');
    } finally {
      setSending(null);
    }
  };

  const saveConfig = async () => {
    setSavingConfig(true);
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-cbd74580/organisations/${organisationId}/dunning/config`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ config })
        }
      );

      if (response.ok) {
        toast.success('Dunning configuration saved');
      } else {
        toast.error('Failed to save configuration');
      }
    } catch (error) {
      console.error('Error saving config:', error);
      toast.error('Failed to save configuration');
    } finally {
      setSavingConfig(false);
    }
  };

  const getSeverityColor = (daysOverdue: number) => {
    if (daysOverdue >= 30) return 'bg-red-100 text-red-800 border-red-300';
    if (daysOverdue >= 14) return 'bg-orange-100 text-orange-800 border-orange-300';
    return 'bg-yellow-100 text-yellow-800 border-yellow-300';
  };

  const getSeverityIcon = (daysOverdue: number) => {
    if (daysOverdue >= 30) return <AlertTriangle className="w-5 h-5 text-red-600" />;
    if (daysOverdue >= 14) return <Clock className="w-5 h-5 text-orange-600" />;
    return <Clock className="w-5 h-5 text-yellow-600" />;
  };

  const totalOverdue = overdueInvoices.reduce((sum, inv) => sum + inv.amount, 0);
  const criticalCount = overdueInvoices.filter(inv => inv.daysOverdue >= 30).length;

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
      <div>
        <h3 className="text-2xl">Payment Dunning & Reminders</h3>
        <p className="text-gray-600 mt-1">
          Automated late payment reminders and escalation
        </p>
      </div>

      {/* Alert Summary */}
      {overdueInvoices.length > 0 ? (
        <Card className="p-4 bg-red-50 border-red-200">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-medium text-red-900">
                {overdueInvoices.length} Overdue Invoice{overdueInvoices.length !== 1 ? 's' : ''}
              </p>
              <p className="text-sm text-red-800 mt-1">
                Total overdue amount: <strong>£{totalOverdue.toFixed(2)}</strong>
                {criticalCount > 0 && (
                  <span className="ml-2">• {criticalCount} critical (30+ days overdue)</span>
                )}
              </p>
            </div>
          </div>
        </Card>
      ) : (
        <Card className="p-4 bg-green-50 border-green-200">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-6 h-6 text-green-600" />
            <p className="text-green-900">
              All invoices are up to date. No overdue payments.
            </p>
          </div>
        </Card>
      )}

      {/* Stats */}
      <div className="grid md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center justify-between mb-2">
            <FileText className="w-5 h-5 text-red-600" />
            <Badge className="bg-red-100 text-red-800">Overdue</Badge>
          </div>
          <div className="text-2xl font-bold text-red-600">
            {overdueInvoices.length}
          </div>
          <div className="text-sm text-gray-600">Invoices</div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between mb-2">
            <DollarSign className="w-5 h-5 text-orange-600" />
            <Badge variant="outline">Total</Badge>
          </div>
          <div className="text-2xl font-bold text-orange-600">
            £{totalOverdue.toFixed(0)}
          </div>
          <div className="text-sm text-gray-600">Amount Due</div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between mb-2">
            <AlertTriangle className="w-5 h-5 text-red-600" />
            <Badge className="bg-red-100 text-red-800">Critical</Badge>
          </div>
          <div className="text-2xl font-bold text-red-600">
            {criticalCount}
          </div>
          <div className="text-sm text-gray-600">30+ Days</div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between mb-2">
            <Mail className="w-5 h-5 text-blue-600" />
            <Badge variant="outline">Sent</Badge>
          </div>
          <div className="text-2xl font-bold text-blue-600">
            {overdueInvoices.reduce((sum, inv) => sum + inv.remindersSent, 0)}
          </div>
          <div className="text-sm text-gray-600">Reminders</div>
        </Card>
      </div>

      {/* Overdue Invoices List */}
      {overdueInvoices.length > 0 && (
        <Card className="p-6">
          <h4 className="text-xl mb-4">Overdue Invoices</h4>
          <div className="space-y-3">
            {overdueInvoices.map((invoice) => (
              <Card
                key={invoice.id}
                className={`p-4 border-2 ${getSeverityColor(invoice.daysOverdue)}`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 flex-1">
                    {getSeverityIcon(invoice.daysOverdue)}
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h5 className="font-medium">{invoice.invoiceNumber}</h5>
                        <Badge className={invoice.status === 'escalated' ? 'bg-red-600 text-white' : ''}>
                          {invoice.status}
                        </Badge>
                      </div>
                      {invoice.poReference && (
                        <p className="text-sm text-gray-700 mb-1">
                          PO: {invoice.poReference}
                        </p>
                      )}
                      <div className="flex flex-wrap gap-3 text-sm text-gray-700">
                        <span>Amount: <strong>£{invoice.amount.toFixed(2)}</strong></span>
                        <span>Due: {new Date(invoice.dueDate).toLocaleDateString()}</span>
                        <span className="font-medium">
                          {invoice.daysOverdue} days overdue
                        </span>
                      </div>
                      <div className="flex gap-2 mt-2 text-xs text-gray-600">
                        <span>Reminders sent: {invoice.remindersSent}</span>
                        {invoice.lastReminderDate && (
                          <span>
                            Last: {new Date(invoice.lastReminderDate).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <Button
                    size="sm"
                    onClick={() => sendReminder(invoice.id)}
                    disabled={sending === invoice.id}
                    className="bg-[#5d9827] hover:bg-[#4a7a1f] flex-shrink-0"
                  >
                    {sending === invoice.id ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4 mr-2" />
                        Send Reminder
                      </>
                    )}
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </Card>
      )}

      {/* Dunning Configuration */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-xl">Dunning Configuration</h4>
          <Button
            onClick={saveConfig}
            disabled={savingConfig}
            className="bg-[#625d9c] hover:bg-[#524d82]"
          >
            {savingConfig ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              'Save Configuration'
            )}
          </Button>
        </div>

        <div className="space-y-4">
          {/* Enable/Disable */}
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div>
              <p className="font-medium">Enable Dunning System</p>
              <p className="text-sm text-gray-600">
                Automatically track and send payment reminders
              </p>
            </div>
            <input
              type="checkbox"
              checked={config.enabled}
              onChange={(e) => setConfig({ ...config, enabled: e.target.checked })}
              className="h-5 w-5"
            />
          </div>

          {config.enabled && (
            <>
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium">Auto-send Reminders</p>
                  <p className="text-sm text-gray-600">
                    Automatically send reminders at configured intervals
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={config.autoSendReminders}
                  onChange={(e) => setConfig({ ...config, autoSendReminders: e.target.checked })}
                  className="h-5 w-5"
                />
              </div>

              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium">CC Finance Team</p>
                  <p className="text-sm text-gray-600">
                    Copy billing contact on all reminders
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={config.ccFinanceTeam}
                  onChange={(e) => setConfig({ ...config, ccFinanceTeam: e.target.checked })}
                  className="h-5 w-5"
                />
              </div>

              {/* Reminder Schedule */}
              <div className="border-t pt-4">
                <h5 className="font-medium mb-3">Reminder Schedule (days after due date)</h5>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      1st Reminder
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={config.firstReminderDays}
                      onChange={(e) => setConfig({ ...config, firstReminderDays: Number(e.target.value) })}
                      className="w-full p-2 border rounded-lg"
                    />
                    <p className="text-xs text-gray-600 mt-1">Gentle reminder</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">
                      2nd Reminder
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={config.secondReminderDays}
                      onChange={(e) => setConfig({ ...config, secondReminderDays: Number(e.target.value) })}
                      className="w-full p-2 border rounded-lg"
                    />
                    <p className="text-xs text-gray-600 mt-1">Follow-up notice</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">
                      3rd Reminder
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={config.thirdReminderDays}
                      onChange={(e) => setConfig({ ...config, thirdReminderDays: Number(e.target.value) })}
                      className="w-full p-2 border rounded-lg"
                    />
                    <p className="text-xs text-gray-600 mt-1">Urgent notice</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Escalation
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={config.escalationDays}
                      onChange={(e) => setConfig({ ...config, escalationDays: Number(e.target.value) })}
                      className="w-full p-2 border rounded-lg"
                    />
                    <p className="text-xs text-gray-600 mt-1">Account review</p>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </Card>

      {/* Info */}
      <Card className="p-6 bg-blue-50 border-blue-200">
        <div className="flex items-start gap-3">
          <Bell className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-900">
            <p className="font-medium mb-2">How Payment Reminders Work</p>
            <ul className="space-y-1">
              <li>• Reminders are sent to the billing contact email: <strong>{organisationData?.billingContact?.email}</strong></li>
              <li>• Each reminder includes the invoice number, PO reference, amount due, and payment link</li>
              <li>• After the escalation period, accounts may be suspended pending payment</li>
              <li>• All reminder activity is logged and available in your invoicing dashboard</li>
            </ul>
          </div>
        </div>
      </Card>
    </div>
  );
}
