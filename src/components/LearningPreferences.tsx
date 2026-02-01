import React, { useState, useEffect } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Checkbox } from './ui/checkbox';
import { Badge } from './ui/badge';
import { 
  Brain, 
  Clock, 
  Target, 
  Heart,
  Book,
  Users,
  Zap,
  Loader2,
  Check,
  Info
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { projectId, publicAnonKey } from '../utils/supabase/info';

interface LearningPreference {
  childId: string;
  childName: string;
  learningPace: 'slow' | 'moderate' | 'fast';
  learningStyle: string[];
  senNeeds: string[];
  senDescription: string;
  specialRequirements: string;
  preferredSessionDuration: number;
  attentionSpan: string;
  motivationStyle: string[];
}

interface LearningPreferencesProps {
  userId: string;
  accessToken: string;
  children: Array<{ id: string; name: string }>;
  onUpdate?: () => void;
}

const LEARNING_STYLES = [
  { id: 'visual', label: 'Visual (pictures, diagrams, videos)', icon: '👁️' },
  { id: 'auditory', label: 'Auditory (listening, discussion)', icon: '👂' },
  { id: 'kinesthetic', label: 'Kinesthetic (hands-on, movement)', icon: '✋' },
  { id: 'reading', label: 'Reading/Writing', icon: '📖' },
  { id: 'social', label: 'Social (group activities)', icon: '👥' },
  { id: 'solitary', label: 'Solitary (independent work)', icon: '🧘' }
];

const SEN_CATEGORIES = [
  { id: 'adhd', label: 'ADHD/ADD' },
  { id: 'autism', label: 'Autism Spectrum' },
  { id: 'dyslexia', label: 'Dyslexia' },
  { id: 'dyscalculia', label: 'Dyscalculia' },
  { id: 'dyspraxia', label: 'Dyspraxia' },
  { id: 'speech', label: 'Speech & Language' },
  { id: 'hearing', label: 'Hearing Impairment' },
  { id: 'visual', label: 'Visual Impairment' },
  { id: 'anxiety', label: 'Anxiety/Mental Health' },
  { id: 'other', label: 'Other SEN' }
];

const MOTIVATION_STYLES = [
  { id: 'praise', label: 'Verbal Praise' },
  { id: 'rewards', label: 'Reward Systems' },
  { id: 'gamification', label: 'Gamification' },
  { id: 'competition', label: 'Friendly Competition' },
  { id: 'progress', label: 'Progress Tracking' },
  { id: 'autonomy', label: 'Self-Direction' }
];

export function LearningPreferences({ userId, accessToken, children, onUpdate }: LearningPreferencesProps) {
  const [preferences, setPreferences] = useState<Record<string, LearningPreference>>({});
  const [selectedChild, setSelectedChild] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (children.length > 0) {
      setSelectedChild(children[0].id);
      loadPreferences();
    }
  }, [children]);

  const loadPreferences = async () => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-cbd74580/learning-preferences/${userId}`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`
          }
        }
      );

      if (response.ok) {
        const data = await response.json();
        if (data.preferences) {
          setPreferences(data.preferences);
        }
      }
    } catch (error) {
      console.error('Error loading learning preferences:', error);
    } finally {
      setLoading(false);
    }
  };

  const savePreferences = async () => {
    setSaving(true);
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-cbd74580/learning-preferences/${userId}`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ preferences })
        }
      );

      if (response.ok) {
        toast.success('Learning preferences saved');
        onUpdate?.();
      } else {
        toast.error('Failed to save preferences');
      }
    } catch (error) {
      console.error('Error saving learning preferences:', error);
      toast.error('Failed to save preferences');
    } finally {
      setSaving(false);
    }
  };

  const getCurrentPreference = (): LearningPreference => {
    const child = children.find(c => c.id === selectedChild);
    return preferences[selectedChild] || {
      childId: selectedChild,
      childName: child?.name || '',
      learningPace: 'moderate',
      learningStyle: [],
      senNeeds: [],
      senDescription: '',
      specialRequirements: '',
      preferredSessionDuration: 60,
      attentionSpan: '',
      motivationStyle: []
    };
  };

  const updatePreference = <K extends keyof LearningPreference>(
    key: K,
    value: LearningPreference[K]
  ) => {
    setPreferences(prev => ({
      ...prev,
      [selectedChild]: {
        ...getCurrentPreference(),
        [key]: value
      }
    }));
  };

  const toggleArrayValue = <K extends keyof LearningPreference>(
    key: K,
    value: string
  ) => {
    const current = getCurrentPreference()[key] as string[];
    const updated = current.includes(value)
      ? current.filter(v => v !== value)
      : [...current, value];
    updatePreference(key, updated as LearningPreference[K]);
  };

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="w-8 h-8 animate-spin text-[#625d9c]" />
      </div>
    );
  }

  if (children.length === 0) {
    return (
      <Card className="p-6">
        <p className="text-center text-gray-600">
          Add children to your profile to set learning preferences
        </p>
      </Card>
    );
  }

  const currentPref = getCurrentPreference();

  return (
    <div className="space-y-6">
      {/* Child Selector */}
      <Card className="p-4">
        <Label className="mb-2">Select Child</Label>
        <div className="flex flex-wrap gap-2">
          {children.map((child) => (
            <Button
              key={child.id}
              variant={selectedChild === child.id ? 'default' : 'outline'}
              onClick={() => setSelectedChild(child.id)}
              className={selectedChild === child.id ? 'bg-[#625d9c]' : ''}
            >
              {child.name}
            </Button>
          ))}
        </div>
      </Card>

      {/* Learning Pace */}
      <Card className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <Clock className="w-6 h-6 text-[#625d9c]" />
          <div>
            <h3 className="text-xl">Learning Pace</h3>
            <p className="text-sm text-gray-600">How quickly does your child learn new concepts?</p>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-4">
          {(['slow', 'moderate', 'fast'] as const).map((pace) => (
            <Card
              key={pace}
              className={`p-4 cursor-pointer transition-colors ${
                currentPref.learningPace === pace
                  ? 'border-[#625d9c] border-2 bg-purple-50'
                  : 'hover:border-gray-400'
              }`}
              onClick={() => updatePreference('learningPace', pace)}
            >
              <div className="text-center">
                <div className="text-3xl mb-2">
                  {pace === 'slow' && '🐢'}
                  {pace === 'moderate' && '🚶'}
                  {pace === 'fast' && '🏃'}
                </div>
                <h4 className="capitalize mb-1">{pace}</h4>
                <p className="text-xs text-gray-600">
                  {pace === 'slow' && 'Needs extra time and repetition'}
                  {pace === 'moderate' && 'Average learning pace'}
                  {pace === 'fast' && 'Grasps concepts quickly'}
                </p>
              </div>
            </Card>
          ))}
        </div>
      </Card>

      {/* Learning Styles */}
      <Card className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <Brain className="w-6 h-6 text-[#625d9c]" />
          <div>
            <h3 className="text-xl">Learning Styles</h3>
            <p className="text-sm text-gray-600">Select all that apply</p>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          {LEARNING_STYLES.map((style) => (
            <div
              key={style.id}
              className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-gray-50"
            >
              <Checkbox
                id={`style-${style.id}`}
                checked={currentPref.learningStyle.includes(style.id)}
                onCheckedChange={() => toggleArrayValue('learningStyle', style.id)}
              />
              <Label
                htmlFor={`style-${style.id}`}
                className="flex-1 cursor-pointer"
              >
                <span className="mr-2">{style.icon}</span>
                {style.label}
              </Label>
            </div>
          ))}
        </div>
      </Card>

      {/* SEN Needs */}
      <Card className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <Heart className="w-6 h-6 text-[#625d9c]" />
          <div>
            <h3 className="text-xl">Special Educational Needs (SEN)</h3>
            <p className="text-sm text-gray-600">
              Help us match you with tutors experienced in supporting specific needs
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            {SEN_CATEGORIES.map((category) => (
              <div
                key={category.id}
                className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-gray-50"
              >
                <Checkbox
                  id={`sen-${category.id}`}
                  checked={currentPref.senNeeds.includes(category.id)}
                  onCheckedChange={() => toggleArrayValue('senNeeds', category.id)}
                />
                <Label
                  htmlFor={`sen-${category.id}`}
                  className="flex-1 cursor-pointer"
                >
                  {category.label}
                </Label>
              </div>
            ))}
          </div>

          {currentPref.senNeeds.length > 0 && (
            <>
              <div className="space-y-2">
                <Label htmlFor="sen-description">
                  Additional Details (Optional)
                </Label>
                <Textarea
                  id="sen-description"
                  placeholder="Describe specific needs, strategies that work well, or anything tutors should know..."
                  value={currentPref.senDescription}
                  onChange={(e) => updatePreference('senDescription', e.target.value)}
                  rows={4}
                />
              </div>

              <div className="flex items-start gap-2 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-blue-900">
                  This information will only be shared with tutors who have indicated SEN experience
                  and will be used to provide better personalized support during sessions.
                </p>
              </div>
            </>
          )}
        </div>
      </Card>

      {/* Motivation Styles */}
      <Card className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <Target className="w-6 h-6 text-[#625d9c]" />
          <div>
            <h3 className="text-xl">Motivation & Engagement</h3>
            <p className="text-sm text-gray-600">What helps keep your child motivated?</p>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          {MOTIVATION_STYLES.map((style) => (
            <div
              key={style.id}
              className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-gray-50"
            >
              <Checkbox
                id={`motivation-${style.id}`}
                checked={currentPref.motivationStyle.includes(style.id)}
                onCheckedChange={() => toggleArrayValue('motivationStyle', style.id)}
              />
              <Label
                htmlFor={`motivation-${style.id}`}
                className="flex-1 cursor-pointer"
              >
                {style.label}
              </Label>
            </div>
          ))}
        </div>
      </Card>

      {/* Additional Requirements */}
      <Card className="p-6">
        <div className="space-y-4">
          <div>
            <Label htmlFor="session-duration">
              Preferred Session Duration (minutes)
            </Label>
            <select
              id="session-duration"
              className="w-full mt-2 p-2 border rounded-lg"
              value={currentPref.preferredSessionDuration}
              onChange={(e) => updatePreference('preferredSessionDuration', Number(e.target.value))}
            >
              <option value={30}>30 minutes</option>
              <option value={45}>45 minutes</option>
              <option value={60}>60 minutes</option>
              <option value={90}>90 minutes</option>
            </select>
          </div>

          <div>
            <Label htmlFor="attention-span">
              Attention Span Notes (Optional)
            </Label>
            <Textarea
              id="attention-span"
              placeholder="E.g., 'Needs breaks every 20 minutes' or 'Can focus for extended periods'"
              value={currentPref.attentionSpan}
              onChange={(e) => updatePreference('attentionSpan', e.target.value)}
              rows={2}
            />
          </div>

          <div>
            <Label htmlFor="special-requirements">
              Other Special Requirements (Optional)
            </Label>
            <Textarea
              id="special-requirements"
              placeholder="Any other accommodations, preferences, or information that would help tutors provide better support..."
              value={currentPref.specialRequirements}
              onChange={(e) => updatePreference('specialRequirements', e.target.value)}
              rows={4}
            />
          </div>
        </div>
      </Card>

      <div className="flex justify-end gap-3">
        <Button
          onClick={savePreferences}
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
              Save Preferences
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
