import React, { useState, useEffect } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Switch } from './ui/switch';
import { Label } from './ui/label';
import { Separator } from './ui/separator';
import { Cookie, Settings, X, Shield, Check } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';

interface ConsentPreferences {
  essential: boolean;
  functional: boolean;
  analytics: boolean;
  marketing: boolean;
  timestamp: string;
  version: string;
}

const COOKIE_CONSENT_VERSION = '1.0.0';
const CONSENT_STORAGE_KEY = 'kfa_cookie_consent';

export function CookieConsent() {
  const [showBanner, setShowBanner] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [preferences, setPreferences] = useState<ConsentPreferences>({
    essential: true,
    functional: false,
    analytics: false,
    marketing: false,
    timestamp: new Date().toISOString(),
    version: COOKIE_CONSENT_VERSION
  });

  useEffect(() => {
    checkConsentStatus();
  }, []);

  const checkConsentStatus = () => {
    const stored = localStorage.getItem(CONSENT_STORAGE_KEY);
    if (!stored) {
      setShowBanner(true);
      return;
    }

    try {
      const consent = JSON.parse(stored);
      // Check if consent version matches
      if (consent.version !== COOKIE_CONSENT_VERSION) {
        setShowBanner(true);
        return;
      }
      setPreferences(consent);
      applyConsent(consent);
    } catch (error) {
      console.error('Error parsing consent:', error);
      setShowBanner(true);
    }
  };

  const applyConsent = (consent: ConsentPreferences) => {
    // Apply consent preferences to actual cookie/tracking systems
    if (consent.analytics) {
      // Enable analytics
      console.log('Analytics enabled');
    }
    if (consent.marketing) {
      // Enable marketing cookies
      console.log('Marketing enabled');
    }
    if (consent.functional) {
      // Enable functional cookies
      console.log('Functional cookies enabled');
    }
  };

  const saveConsent = async (prefs: ConsentPreferences) => {
    const consentData = {
      ...prefs,
      timestamp: new Date().toISOString(),
      version: COOKIE_CONSENT_VERSION
    };

    // Save to localStorage
    localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(consentData));
    
    // Log to backend audit trail
    try {
      await fetch('/api/consent-audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...consentData,
          userAgent: navigator.userAgent,
          ipAddress: 'captured-server-side'
        })
      });
    } catch (error) {
      console.error('Failed to log consent:', error);
    }

    applyConsent(consentData);
    setPreferences(consentData);
    setShowBanner(false);
    setShowSettings(false);
  };

  const acceptAll = () => {
    saveConsent({
      essential: true,
      functional: true,
      analytics: true,
      marketing: true,
      timestamp: new Date().toISOString(),
      version: COOKIE_CONSENT_VERSION
    });
  };

  const acceptEssential = () => {
    saveConsent({
      essential: true,
      functional: false,
      analytics: false,
      marketing: false,
      timestamp: new Date().toISOString(),
      version: COOKIE_CONSENT_VERSION
    });
  };

  const saveCustomPreferences = () => {
    saveConsent(preferences);
  };

  const updatePreference = (key: keyof ConsentPreferences, value: boolean) => {
    setPreferences(prev => ({ ...prev, [key]: value }));
  };

  if (!showBanner) {
    return null;
  }

  return (
    <>
      {/* Cookie Banner */}
      <div 
        className="fixed bottom-0 left-0 right-0 z-50 p-4 bg-white border-t-2 border-gray-200 shadow-2xl"
        role="region"
        aria-label="Cookie consent banner"
      >
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
            <div className="flex items-start gap-3 flex-1">
              <Cookie className="w-6 h-6 text-[#625d9c] flex-shrink-0 mt-1" />
              <div>
                <h3 className="font-semibold mb-1">We value your privacy</h3>
                <p className="text-sm text-gray-600">
                  We use cookies to enhance your experience, analyze site usage, and assist in our marketing efforts.
                  Essential cookies are always enabled. You can customize your preferences or accept all cookies.
                </p>
                <button
                  onClick={() => window.open('/privacy-policy', '_blank')}
                  className="text-sm text-[#625d9c] underline hover:text-[#4a4573] mt-1"
                >
                  Read our Privacy Policy
                </button>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
              <Button
                variant="outline"
                onClick={() => setShowSettings(true)}
                className="flex items-center gap-2"
              >
                <Settings className="w-4 h-4" />
                Customize
              </Button>
              <Button
                variant="outline"
                onClick={acceptEssential}
              >
                Essential Only
              </Button>
              <Button
                onClick={acceptAll}
                className="bg-[#5d9827] hover:bg-[#4a7a1f]"
              >
                <Check className="w-4 h-4 mr-2" />
                Accept All
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Cookie Settings Dialog */}
      <Dialog open={showSettings} onOpenChange={setShowSettings}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Cookie className="w-6 h-6 text-[#625d9c]" />
              Cookie Preferences
            </DialogTitle>
            <DialogDescription>
              Manage your cookie and tracking preferences. You can change these settings at any time.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 mt-4">
            {/* Essential Cookies */}
            <Card className="p-4 bg-gray-50">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Shield className="w-5 h-5 text-[#625d9c]" />
                    <Label className="text-base">Essential Cookies</Label>
                    <span className="text-xs bg-gray-200 px-2 py-0.5 rounded">Always Active</span>
                  </div>
                  <p className="text-sm text-gray-600">
                    These cookies are necessary for the website to function and cannot be disabled.
                    They include authentication, security, and core functionality cookies.
                  </p>
                  <details className="mt-2">
                    <summary className="text-xs text-[#625d9c] cursor-pointer hover:underline">
                      View cookies (3)
                    </summary>
                    <ul className="text-xs text-gray-600 mt-2 space-y-1 ml-4">
                      <li>• kfa_session - Authentication session (30 days)</li>
                      <li>• kfa_csrf - Security token (Session)</li>
                      <li>• kfa_consent - Consent preferences (1 year)</li>
                    </ul>
                  </details>
                </div>
                <Switch
                  checked={true}
                  disabled
                  aria-label="Essential cookies always enabled"
                />
              </div>
            </Card>

            {/* Functional Cookies */}
            <Card className="p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <Label htmlFor="functional" className="text-base mb-2 block">
                    Functional Cookies
                  </Label>
                  <p className="text-sm text-gray-600">
                    These cookies enable enhanced functionality and personalization, such as video playback,
                    live chat, and remembering your preferences (language, region).
                  </p>
                  <details className="mt-2">
                    <summary className="text-xs text-[#625d9c] cursor-pointer hover:underline">
                      View cookies (2)
                    </summary>
                    <ul className="text-xs text-gray-600 mt-2 space-y-1 ml-4">
                      <li>• kfa_lang - Language preference (1 year)</li>
                      <li>• kfa_video_prefs - Video player settings (6 months)</li>
                    </ul>
                  </details>
                </div>
                <Switch
                  id="functional"
                  checked={preferences.functional}
                  onCheckedChange={(checked) => updatePreference('functional', checked)}
                />
              </div>
            </Card>

            {/* Analytics Cookies */}
            <Card className="p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <Label htmlFor="analytics" className="text-base mb-2 block">
                    Analytics Cookies
                  </Label>
                  <p className="text-sm text-gray-600">
                    These cookies help us understand how visitors interact with our website by collecting
                    and reporting information anonymously. We use this data to improve our services.
                  </p>
                  <details className="mt-2">
                    <summary className="text-xs text-[#625d9c] cursor-pointer hover:underline">
                      View cookies (4)
                    </summary>
                    <ul className="text-xs text-gray-600 mt-2 space-y-1 ml-4">
                      <li>• _ga - Google Analytics (2 years)</li>
                      <li>• _gid - Google Analytics (24 hours)</li>
                      <li>• kfa_analytics - Internal analytics (1 year)</li>
                      <li>• kfa_session_replay - Session recording (30 days)</li>
                    </ul>
                  </details>
                </div>
                <Switch
                  id="analytics"
                  checked={preferences.analytics}
                  onCheckedChange={(checked) => updatePreference('analytics', checked)}
                />
              </div>
            </Card>

            {/* Marketing Cookies */}
            <Card className="p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <Label htmlFor="marketing" className="text-base mb-2 block">
                    Marketing & Advertising Cookies
                  </Label>
                  <p className="text-sm text-gray-600">
                    These cookies are used to track visitors across websites to display relevant
                    advertisements and measure campaign effectiveness. They may be set by third-party
                    advertising partners.
                  </p>
                  <details className="mt-2">
                    <summary className="text-xs text-[#625d9c] cursor-pointer hover:underline">
                      View cookies (5)
                    </summary>
                    <ul className="text-xs text-gray-600 mt-2 space-y-1 ml-4">
                      <li>• _fbp - Facebook Pixel (3 months)</li>
                      <li>• fr - Facebook (3 months)</li>
                      <li>• IDE - Google Ads (2 years)</li>
                      <li>• kfa_marketing - Marketing preferences (1 year)</li>
                      <li>• kfa_referral - Referral tracking (30 days)</li>
                    </ul>
                  </details>
                </div>
                <Switch
                  id="marketing"
                  checked={preferences.marketing}
                  onCheckedChange={(checked) => updatePreference('marketing', checked)}
                />
              </div>
            </Card>

            <Separator />

            {/* GDPR Information */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-900">
                <strong>Your Privacy Rights:</strong> Under GDPR and UK data protection law, you have the right to
                access, rectify, or delete your personal data. You can also withdraw consent at any time by
                changing these settings.{' '}
                <button
                  onClick={() => window.open('/data-subject-rights', '_blank')}
                  className="underline hover:text-blue-700"
                >
                  Learn more about your rights
                </button>
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 pt-4">
              <Button
                variant="outline"
                onClick={() => setShowSettings(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                variant="outline"
                onClick={acceptEssential}
                className="flex-1"
              >
                Essential Only
              </Button>
              <Button
                onClick={saveCustomPreferences}
                className="flex-1 bg-[#5d9827] hover:bg-[#4a7a1f]"
              >
                <Check className="w-4 h-4 mr-2" />
                Save Preferences
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
