import React, { useState, useEffect } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Switch } from './ui/switch';
import { Label } from './ui/label';
import { Separator } from './ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { 
  Eye, 
  Ear, 
  Keyboard, 
  Type, 
  Contrast, 
  Volume2,
  Captions,
  Loader2,
  Check
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { projectId, publicAnonKey } from '../utils/supabase/info';

interface AccessibilitySettings {
  highContrast: boolean;
  largeText: boolean;
  screenReaderOptimized: boolean;
  keyboardNavigationHints: boolean;
  reduceMotion: boolean;
  captionsEnabled: boolean;
  textToSpeech: boolean;
  fontSize: 'small' | 'medium' | 'large' | 'x-large';
  colorBlindMode: 'none' | 'protanopia' | 'deuteranopia' | 'tritanopia';
}

interface AccessibilitySettingsProps {
  userId: string;
  accessToken: string;
}

export function AccessibilitySettings({ userId, accessToken }: AccessibilitySettingsProps) {
  const [settings, setSettings] = useState<AccessibilitySettings>({
    highContrast: false,
    largeText: false,
    screenReaderOptimized: false,
    keyboardNavigationHints: true,
    reduceMotion: false,
    captionsEnabled: true,
    textToSpeech: false,
    fontSize: 'medium',
    colorBlindMode: 'none'
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadSettings();
  }, [userId]);

  useEffect(() => {
    applySettings();
  }, [settings]);

  const loadSettings = async () => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-cbd74580/accessibility-settings/${userId}`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`
          }
        }
      );

      if (response.ok) {
        const data = await response.json();
        if (data.settings) {
          setSettings(data.settings);
        }
      }
    } catch (error) {
      console.error('Error loading accessibility settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    setSaving(true);
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-cbd74580/accessibility-settings/${userId}`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ settings })
        }
      );

      if (response.ok) {
        toast.success('Accessibility settings saved');
      } else {
        toast.error('Failed to save settings');
      }
    } catch (error) {
      console.error('Error saving accessibility settings:', error);
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const applySettings = () => {
    const root = document.documentElement;

    // Apply high contrast
    if (settings.highContrast) {
      root.classList.add('high-contrast');
    } else {
      root.classList.remove('high-contrast');
    }

    // Apply font size
    root.style.fontSize = {
      small: '14px',
      medium: '16px',
      large: '18px',
      'x-large': '20px'
    }[settings.fontSize];

    // Apply reduce motion
    if (settings.reduceMotion) {
      root.classList.add('reduce-motion');
    } else {
      root.classList.remove('reduce-motion');
    }

    // Apply color blind mode
    root.setAttribute('data-colorblind-mode', settings.colorBlindMode);

    // Set ARIA live region for screen readers
    if (settings.screenReaderOptimized) {
      root.setAttribute('data-screen-reader-optimized', 'true');
    } else {
      root.removeAttribute('data-screen-reader-optimized');
    }
  };

  const updateSetting = <K extends keyof AccessibilitySettings>(
    key: K,
    value: AccessibilitySettings[K]
  ) => {
    setSettings(prev => ({ ...prev, [key]: value }));
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
      <Card className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <Eye className="w-6 h-6 text-[#625d9c]" />
          <div>
            <h3 className="text-xl">Visual Accessibility</h3>
            <p className="text-sm text-gray-600">Adjust visual settings for better readability</p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="high-contrast" className="flex items-center gap-2">
                <Contrast className="w-4 h-4" />
                High Contrast Mode
              </Label>
              <p className="text-sm text-gray-600">
                Increases color contrast for better visibility
              </p>
            </div>
            <Switch
              id="high-contrast"
              checked={settings.highContrast}
              onCheckedChange={(checked) => updateSetting('highContrast', checked)}
            />
          </div>

          <Separator />

          <div className="space-y-2">
            <Label htmlFor="font-size" className="flex items-center gap-2">
              <Type className="w-4 h-4" />
              Text Size
            </Label>
            <Select
              value={settings.fontSize}
              onValueChange={(value: any) => updateSetting('fontSize', value)}
            >
              <SelectTrigger id="font-size">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="small">Small</SelectItem>
                <SelectItem value="medium">Medium (Default)</SelectItem>
                <SelectItem value="large">Large</SelectItem>
                <SelectItem value="x-large">Extra Large</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Separator />

          <div className="space-y-2">
            <Label htmlFor="colorblind-mode" className="flex items-center gap-2">
              <Eye className="w-4 h-4" />
              Color Blind Mode
            </Label>
            <Select
              value={settings.colorBlindMode}
              onValueChange={(value: any) => updateSetting('colorBlindMode', value)}
            >
              <SelectTrigger id="colorblind-mode">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                <SelectItem value="protanopia">Protanopia (Red-Blind)</SelectItem>
                <SelectItem value="deuteranopia">Deuteranopia (Green-Blind)</SelectItem>
                <SelectItem value="tritanopia">Tritanopia (Blue-Blind)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <Ear className="w-6 h-6 text-[#625d9c]" />
          <div>
            <h3 className="text-xl">Audio & Captions</h3>
            <p className="text-sm text-gray-600">Configure audio and caption preferences</p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="captions" className="flex items-center gap-2">
                <Captions className="w-4 h-4" />
                Enable Captions
              </Label>
              <p className="text-sm text-gray-600">
                Show captions in video sessions when available
              </p>
            </div>
            <Switch
              id="captions"
              checked={settings.captionsEnabled}
              onCheckedChange={(checked) => updateSetting('captionsEnabled', checked)}
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="text-to-speech" className="flex items-center gap-2">
                <Volume2 className="w-4 h-4" />
                Text-to-Speech
              </Label>
              <p className="text-sm text-gray-600">
                Read text content aloud
              </p>
            </div>
            <Switch
              id="text-to-speech"
              checked={settings.textToSpeech}
              onCheckedChange={(checked) => updateSetting('textToSpeech', checked)}
            />
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <Keyboard className="w-6 h-6 text-[#625d9c]" />
          <div>
            <h3 className="text-xl">Navigation & Interaction</h3>
            <p className="text-sm text-gray-600">Customize how you navigate the platform</p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="screen-reader" className="flex items-center gap-2">
                <Eye className="w-4 h-4" />
                Screen Reader Optimized
              </Label>
              <p className="text-sm text-gray-600">
                Enhanced support for screen readers (WCAG 2.1 AA)
              </p>
            </div>
            <Switch
              id="screen-reader"
              checked={settings.screenReaderOptimized}
              onCheckedChange={(checked) => updateSetting('screenReaderOptimized', checked)}
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="keyboard-hints" className="flex items-center gap-2">
                <Keyboard className="w-4 h-4" />
                Keyboard Navigation Hints
              </Label>
              <p className="text-sm text-gray-600">
                Show keyboard shortcuts and navigation hints
              </p>
            </div>
            <Switch
              id="keyboard-hints"
              checked={settings.keyboardNavigationHints}
              onCheckedChange={(checked) => updateSetting('keyboardNavigationHints', checked)}
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="reduce-motion">Reduce Motion</Label>
              <p className="text-sm text-gray-600">
                Minimize animations and transitions
              </p>
            </div>
            <Switch
              id="reduce-motion"
              checked={settings.reduceMotion}
              onCheckedChange={(checked) => updateSetting('reduceMotion', checked)}
            />
          </div>
        </div>
      </Card>

      <div className="flex justify-end gap-3">
        <Button
          onClick={saveSettings}
          disabled={saving}
          className="bg-[#5d9827] hover:bg-[#4a7a1f]"
        >
          {saving ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Check className="w-4 h-4 mr-2" />
              Save Settings
            </>
          )}
        </Button>
      </div>

      <Card className="p-4 bg-blue-50 border-blue-200">
        <p className="text-sm text-blue-900">
          <strong>WCAG 2.1 AA Compliance:</strong> Knowledge Fons Academy meets Web Content Accessibility Guidelines 2.1 Level AA standards on core flows including sign-up, search, booking, and sessions.{' '}
          <a href="/accessibility-statement" className="underline hover:text-blue-700">
            Read our full accessibility statement
          </a>
        </p>
      </Card>
    </div>
  );
}
