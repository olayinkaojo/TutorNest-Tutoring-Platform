import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Flame, Gift, AlertCircle, Trophy } from 'lucide-react';
import { toast } from 'sonner';
import { getSupabaseClient } from '../../utils/supabase/client';
import { projectId } from '../../utils/supabase/info';

const BASE = `https://${projectId}.supabase.co/functions/v1/make-server-cbd74580`;

interface DailyChallenge {
  id: string;
  date: string;
  topic: string;
  question: string;
  options: string[];
  difficulty: string;
  baseXpReward: number;
}

interface StreakInfo {
  userId: string;
  currentStreak: number;
  bestStreak: number;
  lastCompletedDate: string | null;
  streakFreezeCount: number;
  freezeUsedDates: string[];
}

export function DailyChallenge() {
  const [token, setToken] = useState<string | null>(null);
  const [challenge, setChallenge] = useState<DailyChallenge | null>(null);
  const [streakInfo, setStreakInfo] = useState<StreakInfo | null>(null);
  const [hasCompleted, setHasCompleted] = useState(false);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showUseFreeze, setShowUseFreeze] = useState(false);

  useEffect(() => {
    getSupabaseClient().auth.getSession().then(({ data: { session } }) => {
      if (session?.access_token) {
        setToken(session.access_token);
      }
    });
  }, []);

  useEffect(() => {
    if (token) fetchDailyChallenge();
  }, [token]);

  const fetchDailyChallenge = async () => {
    if (!token) return;
    try {
      setLoading(true);
      const response = await fetch(`${BASE}/trivia-extended/daily-challenge`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) throw new Error('Failed to fetch daily challenge');

      const data = await response.json();
      setChallenge(data.challenge);
      setStreakInfo(data.streakInfo);
      setHasCompleted(data.hasCompleted);
    } catch (error) {
      console.error('Error fetching daily challenge:', error);
      toast.error('Failed to load daily challenge');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitAnswer = async () => {
    if (selectedAnswer === null) { toast.error('Please select an answer'); return; }
    if (!token) return;

    try {
      setIsSubmitting(true);
      const response = await fetch(`${BASE}/trivia-extended/daily-challenge/submit`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ isCorrect: selectedAnswer === (challenge?.options.length ?? 0) - 1 })
      });

      if (!response.ok) throw new Error('Failed to submit answer');

      const data = await response.json();
      setIsCorrect(data.xpReward?.totalXp > 0);
      setShowFeedback(true);
      setStreakInfo(data.streakInfo);
      toast.success(data.message);

      setTimeout(() => { setHasCompleted(true); setShowFeedback(false); }, 2000);
    } catch (error) {
      console.error('Error submitting answer:', error);
      toast.error('Failed to submit answer');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUseFreeze = async () => {
    if (!token) return;
    try {
      const response = await fetch(`${BASE}/trivia-extended/daily-challenge/use-freeze`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) throw new Error('Failed to use freeze');

      const data = await response.json();
      if (data.success) {
        setStreakInfo(prev => prev ? { ...prev, streakFreezeCount: data.freezesRemaining } : prev);
        toast.success(data.message);
        setShowUseFreeze(false);
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      console.error('Error using freeze:', error);
      toast.error('Failed to use freeze');
    }
  };

  if (loading) {
    return (
      <Card className="w-full bg-gradient-to-br from-purple-50 to-blue-50 p-6">
        <div className="flex justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
        </div>
      </Card>
    );
  }

  if (hasCompleted) {
    return (
      <Card className="w-full bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 p-6">
        <div className="flex items-center gap-3 mb-4">
          <Trophy className="w-6 h-6 text-green-600" />
          <h3 className="text-xl font-bold text-green-700">Daily Challenge Complete!</h3>
        </div>
        <p className="text-green-700 mb-4">Great job! Come back tomorrow for a new challenge.</p>
        {streakInfo && (
          <div className="flex items-center gap-2 p-3 bg-white rounded-lg border border-green-200">
            <Flame className="w-5 h-5 text-orange-500" />
            <span className="font-semibold text-green-700">{streakInfo.currentStreak} Day Streak 🔥</span>
          </div>
        )}
      </Card>
    );
  }

  if (!challenge) {
    return (
      <Card className="w-full bg-gradient-to-br from-purple-50 to-blue-50 p-6">
        <p className="text-center text-gray-500">No daily challenge available. Check back later!</p>
      </Card>
    );
  }

  return (
    <Card className="w-full bg-gradient-to-br from-purple-600 to-blue-600 text-white p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-2xl font-bold">Daily Challenge</h3>
        {streakInfo && (
          <div className="flex items-center gap-1 bg-white/20 px-3 py-1 rounded-full text-sm font-semibold">
            <Flame className="w-4 h-4" />
            {streakInfo.currentStreak} Day
          </div>
        )}
      </div>

      <div className="space-y-6">
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-purple-100">Topic: {challenge.topic}</span>
            <span className="px-2 py-1 bg-white/20 rounded text-xs font-semibold">
              {challenge.difficulty.toUpperCase()}
            </span>
          </div>
          <p className="text-lg font-semibold">{challenge.question}</p>
        </div>

        <div className="flex gap-4 text-sm">
          <div className="flex items-center gap-1">
            <Gift className="w-4 h-4" />
            Base XP: {challenge.baseXpReward}
          </div>
          {streakInfo && streakInfo.currentStreak > 0 && (
            <div className="flex items-center gap-1">
              <Flame className="w-4 h-4" />
              Multiplier: {(1 + streakInfo.currentStreak * 0.1).toFixed(1)}x
            </div>
          )}
        </div>

        {!showFeedback && (
          <div className="space-y-2">
            {challenge.options.map((option, index) => (
              <button
                key={index}
                onClick={() => setSelectedAnswer(index)}
                disabled={isSubmitting}
                className={`w-full p-3 rounded-lg text-left font-medium transition ${
                  selectedAnswer === index
                    ? 'bg-white text-purple-600 ring-2 ring-white'
                    : 'bg-white/10 hover:bg-white/20 text-white border border-white/20'
                }`}
              >
                {option}
              </button>
            ))}
          </div>
        )}

        {showFeedback && (
          <div className={`p-4 rounded-lg font-semibold text-center ${
            isCorrect ? 'bg-green-500/30 text-green-100' : 'bg-red-500/30 text-red-100'
          }`}>
            {isCorrect ? '✓ Correct!' : '✗ Incorrect'}
          </div>
        )}

        <div className="flex gap-2 pt-2">
          <Button
            onClick={handleSubmitAnswer}
            disabled={selectedAnswer === null || showFeedback || isSubmitting}
            className="flex-1 bg-white text-purple-600 hover:bg-purple-50"
            size="lg"
          >
            {isSubmitting ? 'Submitting...' : 'Submit Answer'}
          </Button>

          {streakInfo && streakInfo.streakFreezeCount > 0 && (
            <Button
              onClick={() => setShowUseFreeze(!showUseFreeze)}
              className="bg-blue-400 hover:bg-blue-300 text-white"
              title="Use freeze to skip a day"
            >
              Freeze ({streakInfo.streakFreezeCount})
            </Button>
          )}
        </div>

        {showUseFreeze && (
          <div className="p-3 bg-blue-500/20 rounded-lg space-y-2 border border-blue-300/50">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <p className="text-sm">Use freeze to skip today and keep your streak?</p>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleUseFreeze} size="sm" className="bg-blue-400 hover:bg-blue-300 text-white flex-1">
                Use Freeze
              </Button>
              <Button onClick={() => setShowUseFreeze(false)} size="sm" className="bg-white/10 hover:bg-white/20 text-white flex-1">
                Cancel
              </Button>
            </div>
          </div>
        )}

        <div className="text-xs text-purple-100 space-y-1 border-t border-white/20 pt-3">
          <p className="font-semibold">💡 Streak Tips:</p>
          <p>• Earn more XP with longer streaks</p>
          <p>• Use freezes to skip 1 day (3 per month)</p>
          <p>• 30-day streak = 800 XP!</p>
        </div>
      </div>
    </Card>
  );
}

export default DailyChallenge;
