import React, { useState, useEffect } from 'react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Switch } from '../ui/switch';
import { Separator } from '../ui/separator';
import { 
  Settings,
  Clock,
  DollarSign,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Save,
  RotateCcw,
  History
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { projectId, publicAnonKey } from '../../utils/supabase/info';

interface PolicyConfig {
  // Cancellation Policies
  cancellationWindow: number; // hours before session
  cancellationFeePercentage: number; // 0-100
  lateCancellationFeePercentage: number; // 0-100
  noShowFeePercentage: number; // 0-100
  allowRescheduling: boolean;
  rescheduleWindow: number; // hours before session
  maxReschedulesPerBooking: number;
  
  // Payment Policies
  paymentDueDate: number; // days from invoice
  latePaymentFeePercentage: number;
  refundProcessingDays: number;
  
  // Payout Policies
  payoutCadence: 'daily' | 'weekly' | 'biweekly' | 'monthly';
  payoutDay?: number; // day of week (1-7) or month (1-31)
  payoutHoldPeriod: number; // days after session
  minimumPayoutAmount: number; // GBP
  
  // Tutor Commission
  tutorCommissionPercentage: number; // platform fee
  
  // Session Policies
  minimumSessionDuration: number; // minutes
  maximumSessionDuration: number; // minutes
  sessionBufferTime: number; // minutes between sessions
  
  // Booking Policies
  advanceBookingDays: number; // max days in advance
  minimumAdvanceHours: number; // min hours before session
  
  // Dispute Resolution
  disputeWindow: number; // days after session
  disputeResponseTime: number; // hours to respond
  
  // Review Policies
  reviewWindow: number; // days after session
  minimumReviewLength: number; // characters
  
  lastUpdated: string;
  updatedBy: string;
}

interface PolicyConfigurationProps {
  opsId: string;
  accessToken: string;
}

export function PolicyConfiguration({ opsId, accessToken }: PolicyConfigurationProps) {
  const [config, setConfig] = useState<PolicyConfig>({
    cancellationWindow: 24,
    cancellationFeePercentage: 0,
    lateCancellationFeePercentage: 50,
    noShowFeePercentage: 100,
    allowRescheduling: true,
    rescheduleWindow: 12,
    maxReschedulesPerBooking: 2,
    paymentDueDate: 7,
    latePaymentFeePercentage: 5,
    refundProcessingDays: 5,
    payoutCadence: 'weekly',
    payoutDay: 5,
    payoutHoldPeriod: 2,
    minimumPayoutAmount: 20,
    tutorCommissionPercentage: 20,
    minimumSessionDuration: 30,
    maximumSessionDuration: 180,
    sessionBufferTime: 15,
    advanceBookingDays: 90,
    minimumAdvanceHours: 6,
    disputeWindow: 14,
    disputeResponseTime: 48,
    reviewWindow: 30,
    minimumReviewLength: 20,
    lastUpdated: new Date().toISOString(),
    updatedBy: ''
  });

  const [originalConfig, setOriginalConfig] = useState<PolicyConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [history, setHistory] = useState<any[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    loadConfiguration();
    loadHistory();
  }, []);

  useEffect(() => {
    if (originalConfig) {
      setHasChanges(JSON.stringify(config) !== JSON.stringify(originalConfig));
    }
  }, [config, originalConfig]);

  const loadConfiguration = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-cbd74580/admin/policy-config`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`
          }
        }
      );

      if (response.ok) {
        const data = await response.json();
        if (data.config) {
          setConfig(data.config);
          setOriginalConfig(data.config);
        }
      }
    } catch (error) {
      console.error('Error loading configuration:', error);
      toast.error('Failed to load configuration');
    } finally {
      setLoading(false);
    }
  };

  const loadHistory = async () => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-cbd74580/admin/policy-config/history`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`
          }
        }
      );

      if (response.ok) {
        const data = await response.json();
        setHistory(data.history || []);
      }
    } catch (error) {
      console.error('Error loading history:', error);
    }
  };

  const saveConfiguration = async () => {
    setSaving(true);
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-cbd74580/admin/policy-config`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            config,
            updatedBy: opsId
          })
        }
      );

      if (response.ok) {
        toast.success('Configuration saved successfully');
        setOriginalConfig(config);
        setHasChanges(false);
        loadHistory();
      } else {
        toast.error('Failed to save configuration');
      }
    } catch (error) {
      console.error('Error saving configuration:', error);
      toast.error('Failed to save configuration');
    } finally {
      setSaving(false);
    }
  };

  const resetChanges = () => {
    if (originalConfig) {
      setConfig(originalConfig);
      setHasChanges(false);
    }
  };

  const updateConfig = <K extends keyof PolicyConfig>(
    key: K,
    value: PolicyConfig[K]
  ) => {
    setConfig(prev => ({ ...prev, [key]: value }));
  };

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="w-8 h-8 animate-spin text-[#625d9c]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl">Policy Configuration</h2>
          <p className="text-gray-600 mt-1">
            Configure cancellation windows, fees, and payout settings
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => setShowHistory(!showHistory)}
          >
            <History className="w-4 h-4 mr-2" />
            History
          </Button>
          {hasChanges && (
            <Button
              variant="outline"
              onClick={resetChanges}
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              Reset
            </Button>
          )}
          <Button
            onClick={saveConfiguration}
            disabled={!hasChanges || saving}
            className="bg-[#5d9827] hover:bg-[#4a7a1f]"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Save Changes
              </>
            )}
          </Button>
        </div>
      </div>

      {hasChanges && (
        <Card className="p-4 bg-amber-50 border-amber-200">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-600" />
            <p className="text-sm text-amber-900">
              You have unsaved changes. Changes will take effect immediately upon saving.
            </p>
          </div>
        </Card>
      )}

      {/* Change History */}
      {showHistory && (
        <Card className="p-6">
          <h3 className="text-xl mb-4">Change History</h3>
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {history.map((entry, index) => (
              <Card key={index} className="p-3">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium">{entry.description}</p>
                    <p className="text-xs text-gray-600 mt-1">
                      By {entry.updatedBy} on {new Date(entry.timestamp).toLocaleString()}
                    </p>
                  </div>
                </div>
              </Card>
            ))}
            {history.length === 0 && (
              <p className="text-center text-gray-500 text-sm py-4">No history available</p>
            )}
          </div>
        </Card>
      )}

      {/* Cancellation Policies */}
      <Card className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <Clock className="w-6 h-6 text-[#625d9c]" />
          <div>
            <h3 className="text-xl">Cancellation Policies</h3>
            <p className="text-sm text-gray-600">Set cancellation windows and fee structures</p>
          </div>
        </div>

        <div className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <Label htmlFor="cancellation-window">
                Free Cancellation Window (hours)
              </Label>
              <Input
                id="cancellation-window"
                type="number"
                min={0}
                value={config.cancellationWindow}
                onChange={(e) => updateConfig('cancellationWindow', Number(e.target.value))}
              />
              <p className="text-xs text-gray-600 mt-1">
                Users can cancel without fee if done this many hours before session
              </p>
            </div>

            <div>
              <Label htmlFor="cancellation-fee">
                Standard Cancellation Fee (%)
              </Label>
              <Input
                id="cancellation-fee"
                type="number"
                min={0}
                max={100}
                value={config.cancellationFeePercentage}
                onChange={(e) => updateConfig('cancellationFeePercentage', Number(e.target.value))}
              />
              <p className="text-xs text-gray-600 mt-1">
                Within free window
              </p>
            </div>

            <div>
              <Label htmlFor="late-cancellation-fee">
                Late Cancellation Fee (%)
              </Label>
              <Input
                id="late-cancellation-fee"
                type="number"
                min={0}
                max={100}
                value={config.lateCancellationFeePercentage}
                onChange={(e) => updateConfig('lateCancellationFeePercentage', Number(e.target.value))}
              />
              <p className="text-xs text-gray-600 mt-1">
                Less than cancellation window
              </p>
            </div>

            <div>
              <Label htmlFor="no-show-fee">
                No-Show Fee (%)
              </Label>
              <Input
                id="no-show-fee"
                type="number"
                min={0}
                max={100}
                value={config.noShowFeePercentage}
                onChange={(e) => updateConfig('noShowFeePercentage', Number(e.target.value))}
              />
              <p className="text-xs text-gray-600 mt-1">
                User doesn't attend session
              </p>
            </div>
          </div>

          <Separator />

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="allow-rescheduling">Allow Rescheduling</Label>
                <p className="text-xs text-gray-600">
                  Allow users to reschedule sessions instead of cancelling
                </p>
              </div>
              <Switch
                id="allow-rescheduling"
                checked={config.allowRescheduling}
                onCheckedChange={(checked) => updateConfig('allowRescheduling', checked)}
              />
            </div>

            {config.allowRescheduling && (
              <div className="grid md:grid-cols-2 gap-6 ml-6">
                <div>
                  <Label htmlFor="reschedule-window">
                    Reschedule Window (hours)
                  </Label>
                  <Input
                    id="reschedule-window"
                    type="number"
                    min={0}
                    value={config.rescheduleWindow}
                    onChange={(e) => updateConfig('rescheduleWindow', Number(e.target.value))}
                  />
                </div>

                <div>
                  <Label htmlFor="max-reschedules">
                    Max Reschedules Per Booking
                  </Label>
                  <Input
                    id="max-reschedules"
                    type="number"
                    min={1}
                    value={config.maxReschedulesPerBooking}
                    onChange={(e) => updateConfig('maxReschedulesPerBooking', Number(e.target.value))}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* Payment Policies */}
      <Card className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <DollarSign className="w-6 h-6 text-[#625d9c]" />
          <div>
            <h3 className="text-xl">Payment Policies</h3>
            <p className="text-sm text-gray-600">Configure payment terms and processing</p>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          <div>
            <Label htmlFor="payment-due">Payment Due Date (days)</Label>
            <Input
              id="payment-due"
              type="number"
              min={0}
              value={config.paymentDueDate}
              onChange={(e) => updateConfig('paymentDueDate', Number(e.target.value))}
            />
          </div>

          <div>
            <Label htmlFor="late-payment-fee">Late Payment Fee (%)</Label>
            <Input
              id="late-payment-fee"
              type="number"
              min={0}
              max={100}
              value={config.latePaymentFeePercentage}
              onChange={(e) => updateConfig('latePaymentFeePercentage', Number(e.target.value))}
            />
          </div>

          <div>
            <Label htmlFor="refund-processing">Refund Processing (days)</Label>
            <Input
              id="refund-processing"
              type="number"
              min={1}
              value={config.refundProcessingDays}
              onChange={(e) => updateConfig('refundProcessingDays', Number(e.target.value))}
            />
          </div>
        </div>
      </Card>

      {/* Payout Policies */}
      <Card className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <Calendar className="w-6 h-6 text-[#625d9c]" />
          <div>
            <h3 className="text-xl">Payout Policies</h3>
            <p className="text-sm text-gray-600">Configure tutor payout schedule and terms</p>
          </div>
        </div>

        <div className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <Label htmlFor="payout-cadence">Payout Cadence</Label>
              <select
                id="payout-cadence"
                className="w-full p-2 border rounded-lg"
                value={config.payoutCadence}
                onChange={(e) => updateConfig('payoutCadence', e.target.value as any)}
              >
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="biweekly">Bi-weekly</option>
                <option value="monthly">Monthly</option>
              </select>
            </div>

            {(config.payoutCadence === 'weekly' || config.payoutCadence === 'biweekly') && (
              <div>
                <Label htmlFor="payout-day">Payout Day (1-7, Mon-Sun)</Label>
                <Input
                  id="payout-day"
                  type="number"
                  min={1}
                  max={7}
                  value={config.payoutDay || 1}
                  onChange={(e) => updateConfig('payoutDay', Number(e.target.value))}
                />
              </div>
            )}

            {config.payoutCadence === 'monthly' && (
              <div>
                <Label htmlFor="payout-day">Payout Day of Month (1-31)</Label>
                <Input
                  id="payout-day"
                  type="number"
                  min={1}
                  max={31}
                  value={config.payoutDay || 1}
                  onChange={(e) => updateConfig('payoutDay', Number(e.target.value))}
                />
              </div>
            )}

            <div>
              <Label htmlFor="payout-hold">Payout Hold Period (days)</Label>
              <Input
                id="payout-hold"
                type="number"
                min={0}
                value={config.payoutHoldPeriod}
                onChange={(e) => updateConfig('payoutHoldPeriod', Number(e.target.value))}
              />
              <p className="text-xs text-gray-600 mt-1">
                Days to wait after session before including in payout
              </p>
            </div>

            <div>
              <Label htmlFor="min-payout">Minimum Payout Amount (₦)</Label>
              <Input
                id="min-payout"
                type="number"
                min={0}
                step={0.01}
                value={config.minimumPayoutAmount}
                onChange={(e) => updateConfig('minimumPayoutAmount', Number(e.target.value))}
              />
            </div>

            <div>
              <Label htmlFor="commission">Platform Commission (%)</Label>
              <Input
                id="commission"
                type="number"
                min={0}
                max={100}
                value={config.tutorCommissionPercentage}
                onChange={(e) => updateConfig('tutorCommissionPercentage', Number(e.target.value))}
              />
              <p className="text-xs text-gray-600 mt-1">
                Tutor receives {100 - config.tutorCommissionPercentage}%
              </p>
            </div>
          </div>
        </div>
      </Card>

      {/* Session & Booking Policies */}
      <Card className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <Settings className="w-6 h-6 text-[#625d9c]" />
          <div>
            <h3 className="text-xl">Session & Booking Policies</h3>
            <p className="text-sm text-gray-600">Configure session and booking constraints</p>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          <div>
            <Label htmlFor="min-duration">Min Session (minutes)</Label>
            <Input
              id="min-duration"
              type="number"
              min={15}
              value={config.minimumSessionDuration}
              onChange={(e) => updateConfig('minimumSessionDuration', Number(e.target.value))}
            />
          </div>

          <div>
            <Label htmlFor="max-duration">Max Session (minutes)</Label>
            <Input
              id="max-duration"
              type="number"
              min={30}
              value={config.maximumSessionDuration}
              onChange={(e) => updateConfig('maximumSessionDuration', Number(e.target.value))}
            />
          </div>

          <div>
            <Label htmlFor="buffer-time">Buffer Time (minutes)</Label>
            <Input
              id="buffer-time"
              type="number"
              min={0}
              value={config.sessionBufferTime}
              onChange={(e) => updateConfig('sessionBufferTime', Number(e.target.value))}
            />
          </div>

          <div>
            <Label htmlFor="advance-booking">Max Advance Booking (days)</Label>
            <Input
              id="advance-booking"
              type="number"
              min={1}
              value={config.advanceBookingDays}
              onChange={(e) => updateConfig('advanceBookingDays', Number(e.target.value))}
            />
          </div>

          <div>
            <Label htmlFor="min-advance">Min Advance Notice (hours)</Label>
            <Input
              id="min-advance"
              type="number"
              min={0}
              value={config.minimumAdvanceHours}
              onChange={(e) => updateConfig('minimumAdvanceHours', Number(e.target.value))}
            />
          </div>
        </div>
      </Card>

      {/* Other Policies */}
      <Card className="p-6">
        <h3 className="text-xl mb-6">Other Policies</h3>

        <div className="space-y-6">
          <div>
            <h4 className="font-medium mb-3">Dispute Resolution</h4>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <Label htmlFor="dispute-window">Dispute Window (days)</Label>
                <Input
                  id="dispute-window"
                  type="number"
                  min={1}
                  value={config.disputeWindow}
                  onChange={(e) => updateConfig('disputeWindow', Number(e.target.value))}
                />
              </div>

              <div>
                <Label htmlFor="dispute-response">Response Time (hours)</Label>
                <Input
                  id="dispute-response"
                  type="number"
                  min={1}
                  value={config.disputeResponseTime}
                  onChange={(e) => updateConfig('disputeResponseTime', Number(e.target.value))}
                />
              </div>
            </div>
          </div>

          <Separator />

          <div>
            <h4 className="font-medium mb-3">Reviews</h4>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <Label htmlFor="review-window">Review Window (days)</Label>
                <Input
                  id="review-window"
                  type="number"
                  min={1}
                  value={config.reviewWindow}
                  onChange={(e) => updateConfig('reviewWindow', Number(e.target.value))}
                />
              </div>

              <div>
                <Label htmlFor="min-review-length">Min Review Length (chars)</Label>
                <Input
                  id="min-review-length"
                  type="number"
                  min={0}
                  value={config.minimumReviewLength}
                  onChange={(e) => updateConfig('minimumReviewLength', Number(e.target.value))}
                />
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Summary */}
      {config.lastUpdated && (
        <Card className="p-4 bg-gray-50">
          <p className="text-sm text-gray-600">
            <strong>Last updated:</strong> {new Date(config.lastUpdated).toLocaleString()}
            {config.updatedBy && ` by ${config.updatedBy}`}
          </p>
        </Card>
      )}
    </div>
  );
}
