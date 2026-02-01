import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Label } from './ui/label';
import { Switch } from './ui/switch';
import { Alert, AlertDescription } from './ui/alert';
import { Separator } from './ui/separator';
import { 
  Bell, 
  Mail, 
  MessageSquare, 
  Calendar,
  FileText,
  DollarSign,
  CheckCircle,
  Loader2
} from 'lucide-react';
import { projectId } from '../utils/supabase/info';

interface NotificationPreferencesProps {
  session: any;
  userId: string;
}

export function NotificationPreferences({ session, userId }: NotificationPreferencesProps) {
  const [preferences, setPreferences] = useState({
    // Email notifications
    emailBookingConfirmation: true,
    emailBookingReminder24h: true,
    emailBookingReminder1h: true,
    emailSessionReport: true,
    emailNewMessage: true,
    emailPaymentReceipt: true,
    emailMarketingUpdates: false,
    
    // In-app notifications
    inAppBookingConfirmation: true,
    inAppBookingReminder: true,
    inAppSessionReport: true,
    inAppNewMessage: true,
    inAppPaymentUpdates: true,
    inAppSystemAlerts: true,
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    fetchPreferences();
  }, [userId]);

  const fetchPreferences = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-cbd74580/users/${userId}/notification-preferences`,
        {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        if (data.preferences) {
          setPreferences({ ...preferences, ...data.preferences });
        }
      }
    } catch (err) {
      console.error('Error fetching preferences:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setSuccess(false);

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-cbd74580/users/${userId}/notification-preferences`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ preferences }),
        }
      );

      if (response.ok) {
        setSuccess(true);
        setTimeout(() => setSuccess(false), 3000);
      }
    } catch (err) {
      console.error('Error saving preferences:', err);
    } finally {
      setSaving(false);
    }
  };

  const updatePreference = (key: string, value: boolean) => {
    setPreferences(prev => ({ ...prev, [key]: value }));
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-gray-300" />
          <p className="text-gray-600">Loading preferences...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="w-5 h-5" style={{ color: '#625d9c' }} />
          Notification Preferences
        </CardTitle>
        <CardDescription>
          Choose how you want to receive notifications
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {success && (
          <Alert className="bg-green-50 border-green-200">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              Preferences saved successfully!
            </AlertDescription>
          </Alert>
        )}

        {/* Email Notifications */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Mail className="w-5 h-5" style={{ color: '#625d9c' }} />
            <h3 className="font-semibold">Email Notifications</h3>
          </div>

          <div className="space-y-3 ml-7">
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="emailBookingConfirmation" className="font-medium">
                  Booking Confirmations
                </Label>
                <p className="text-sm text-gray-500">Receive confirmation emails when bookings are made</p>
              </div>
              <Switch
                id="emailBookingConfirmation"
                checked={preferences.emailBookingConfirmation}
                onCheckedChange={(checked) => updatePreference('emailBookingConfirmation', checked)}
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="emailBookingReminder24h" className="font-medium">
                  24-Hour Reminders
                </Label>
                <p className="text-sm text-gray-500">Get reminded 24 hours before each session</p>
              </div>
              <Switch
                id="emailBookingReminder24h"
                checked={preferences.emailBookingReminder24h}
                onCheckedChange={(checked) => updatePreference('emailBookingReminder24h', checked)}
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="emailBookingReminder1h" className="font-medium">
                  1-Hour Reminders
                </Label>
                <p className="text-sm text-gray-500">Get reminded 1 hour before each session</p>
              </div>
              <Switch
                id="emailBookingReminder1h"
                checked={preferences.emailBookingReminder1h}
                onCheckedChange={(checked) => updatePreference('emailBookingReminder1h', checked)}
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="emailSessionReport" className="font-medium">
                  Session Reports
                </Label>
                <p className="text-sm text-gray-500">Receive emails when tutors submit session reports</p>
              </div>
              <Switch
                id="emailSessionReport"
                checked={preferences.emailSessionReport}
                onCheckedChange={(checked) => updatePreference('emailSessionReport', checked)}
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="emailNewMessage" className="font-medium">
                  New Messages
                </Label>
                <p className="text-sm text-gray-500">Get notified about new messages</p>
              </div>
              <Switch
                id="emailNewMessage"
                checked={preferences.emailNewMessage}
                onCheckedChange={(checked) => updatePreference('emailNewMessage', checked)}
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="emailPaymentReceipt" className="font-medium">
                  Payment Receipts
                </Label>
                <p className="text-sm text-gray-500">Receive receipts for all payments</p>
              </div>
              <Switch
                id="emailPaymentReceipt"
                checked={preferences.emailPaymentReceipt}
                onCheckedChange={(checked) => updatePreference('emailPaymentReceipt', checked)}
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="emailMarketingUpdates" className="font-medium">
                  Marketing & Updates
                </Label>
                <p className="text-sm text-gray-500">Platform updates, tips, and promotional offers</p>
              </div>
              <Switch
                id="emailMarketingUpdates"
                checked={preferences.emailMarketingUpdates}
                onCheckedChange={(checked) => updatePreference('emailMarketingUpdates', checked)}
              />
            </div>
          </div>
        </div>

        <Separator className="my-6" />

        {/* In-App Notifications */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5" style={{ color: '#625d9c' }} />
            <h3 className="font-semibold">In-App Notifications</h3>
          </div>

          <div className="space-y-3 ml-7">
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="inAppBookingConfirmation" className="font-medium">
                  Booking Confirmations
                </Label>
                <p className="text-sm text-gray-500">Show notifications for new bookings</p>
              </div>
              <Switch
                id="inAppBookingConfirmation"
                checked={preferences.inAppBookingConfirmation}
                onCheckedChange={(checked) => updatePreference('inAppBookingConfirmation', checked)}
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="inAppBookingReminder" className="font-medium">
                  Session Reminders
                </Label>
                <p className="text-sm text-gray-500">Upcoming session notifications</p>
              </div>
              <Switch
                id="inAppBookingReminder"
                checked={preferences.inAppBookingReminder}
                onCheckedChange={(checked) => updatePreference('inAppBookingReminder', checked)}
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="inAppSessionReport" className="font-medium">
                  Session Reports
                </Label>
                <p className="text-sm text-gray-500">Notifications when reports are submitted</p>
              </div>
              <Switch
                id="inAppSessionReport"
                checked={preferences.inAppSessionReport}
                onCheckedChange={(checked) => updatePreference('inAppSessionReport', checked)}
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="inAppNewMessage" className="font-medium">
                  New Messages
                </Label>
                <p className="text-sm text-gray-500">Chat message notifications</p>
              </div>
              <Switch
                id="inAppNewMessage"
                checked={preferences.inAppNewMessage}
                onCheckedChange={(checked) => updatePreference('inAppNewMessage', checked)}
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="inAppPaymentUpdates" className="font-medium">
                  Payment Updates
                </Label>
                <p className="text-sm text-gray-500">Payment and billing notifications</p>
              </div>
              <Switch
                id="inAppPaymentUpdates"
                checked={preferences.inAppPaymentUpdates}
                onCheckedChange={(checked) => updatePreference('inAppPaymentUpdates', checked)}
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="inAppSystemAlerts" className="font-medium">
                  System Alerts
                </Label>
                <p className="text-sm text-gray-500">Important platform announcements</p>
              </div>
              <Switch
                id="inAppSystemAlerts"
                checked={preferences.inAppSystemAlerts}
                onCheckedChange={(checked) => updatePreference('inAppSystemAlerts', checked)}
              />
            </div>
          </div>
        </div>

        <div className="pt-4">
          <Button
            onClick={handleSave}
            disabled={saving}
            className="w-full text-white"
            style={{ backgroundColor: '#625d9c' }}
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <CheckCircle className="w-4 h-4 mr-2" />
                Save Preferences
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
