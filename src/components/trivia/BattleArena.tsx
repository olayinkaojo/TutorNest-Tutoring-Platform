import { useCallback, useEffect, useRef, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Sword, Trophy } from 'lucide-react';
import { toast } from 'sonner';
import { getSupabaseClient } from '../../utils/supabase/client';
import { projectId } from '../../utils/supabase/info';

const BASE = `https://${projectId}.supabase.co/functions/v1/make-server-cbd74580`;

interface BattlePlayer {
  userId: string;
  userName: string;
  score: number;
  answeredQuestions: number;
  averageSpeed: number;
}

interface BattleQuestionClient {
  questionId: string;
  question: string;
  options: string[];
}

interface BattleRoundClient {
  roundNumber: number;
  question: BattleQuestionClient | null;
  player1Answer: { answer: number; timeMs: number; isCorrect: boolean } | null;
  player2Answer: { answer: number; timeMs: number; isCorrect: boolean } | null;
  winner: string | null;
  completedAt: number | null;
}

interface BattleClient {
  id: string;
  player1: BattlePlayer;
  player2: BattlePlayer | null;
  totalRounds: number;
  currentRound: number;
  rounds: BattleRoundClient[];
  status: string;
  winner: string | null;
}

export function BattleArena() {
  const [token, setToken] = useState<string | null>(null);
  const [myUserId, setMyUserId] = useState<string | null>(null);
  const [grade, setGrade] = useState('year_5');
  const [status, setStatus] = useState<'idle' | 'searching' | 'active' | 'completed'>('idle');
  const [battle, setBattle] = useState<BattleClient | null>(null);
  const [battleId, setBattleId] = useState<string | null>(null);
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [battleMode, setBattleMode] = useState<'random' | 'friend'>('random');
  const [friendCode, setFriendCode] = useState('');
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const roundStartRef = useRef<number>(Date.now());

  useEffect(() => {
    getSupabaseClient().auth.getSession().then(({ data: { session } }) => {
      if (session?.access_token) setToken(session.access_token);
      if (session?.user?.id) setMyUserId(session.user.id);
    });
  }, []);

  const fetchBattle = useCallback(
    async (id: string): Promise<BattleClient | null> => {
      if (!token) return null;
      try {
        const res = await fetch(`${BASE}/battle/${encodeURIComponent(id)}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) return null;
        const data = await res.json();
        return (data.battle as BattleClient) ?? null;
      } catch {
        return null;
      }
    },
    [token]
  );

  useEffect(() => {
    if (status !== 'searching' || !battleId || !token) return;
    const tick = async () => {
      const b = await fetchBattle(battleId);
      if (b?.status === 'active' && b.player2) {
        setBattle(b);
        setStatus('active');
        roundStartRef.current = Date.now();
        setSelectedAnswer(null);
        toast.success('Opponent joined — battle on!');
      }
    };
    void tick();
    const id = window.setInterval(tick, 2000);
    return () => window.clearInterval(id);
  }, [status, battleId, token, fetchBattle]);

  useEffect(() => {
    if (status !== 'active' || !battle?.id || !token || battle.status === 'completed') return;
    const id = window.setInterval(async () => {
      const b = await fetchBattle(battle.id);
      if (b) {
        setBattle(b);
        if (b.status === 'completed') {
          setStatus('completed');
        }
      }
    }, 2500);
    return () => window.clearInterval(id);
  }, [status, battle?.id, battle?.status, token, fetchBattle]);

  useEffect(() => {
    if (status === 'active' && battle) {
      roundStartRef.current = Date.now();
      setSelectedAnswer(null);
    }
  }, [status, battle?.currentRound, battle?.id]);

  const startRandomBattle = async () => {
    if (!token) {
      toast.error('Not logged in');
      return;
    }
    try {
      setStatus('searching');
      setInviteCode(null);
      const response = await fetch(`${BASE}/battle/start`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ battleMode: 'random', grade }),
      });

      if (!response.ok) throw new Error('Failed to start battle');

      const data = await response.json();
      if (data.battleId) setBattleId(data.battleId);

      if (data.waitingForOpponent) {
        toast.success('Searching for opponent...');
      }
      if (data.battle) {
        setBattle(data.battle as BattleClient);
        setBattleId(data.battle.id);
        setStatus('active');
        roundStartRef.current = Date.now();
      }
    } catch (error) {
      console.error('Error starting battle:', error);
      toast.error('Failed to start battle');
      setStatus('idle');
      setBattleId(null);
    }
  };

  const startFriendBattle = async () => {
    if (!token) {
      toast.error('Not logged in');
      return;
    }
    try {
      setStatus('searching');
      const response = await fetch(`${BASE}/battle/start`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ battleMode: 'friend_challenge', grade }),
      });

      if (!response.ok) throw new Error('Failed to create challenge');

      const data = await response.json();
      setInviteCode(data.inviteCode ?? null);
      if (data.battleId) setBattleId(data.battleId);
      toast.success(`Invite code: ${data.inviteCode}`);
    } catch (error) {
      console.error('Error creating challenge:', error);
      toast.error('Failed to create challenge');
      setStatus('idle');
      setBattleId(null);
      setInviteCode(null);
    }
  };

  const acceptFriendChallenge = async () => {
    if (!friendCode) {
      toast.error('Enter an invite code');
      return;
    }
    if (!token) {
      toast.error('Not logged in');
      return;
    }
    try {
      const response = await fetch(`${BASE}/battle/accept/${encodeURIComponent(friendCode)}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error('Invalid code');

      const data = await response.json();
      setBattle(data.battle as BattleClient);
      setBattleId(data.battle?.id ?? data.battleId ?? null);
      setStatus('active');
      roundStartRef.current = Date.now();
      setSelectedAnswer(null);
      toast.success('Battle started!');
    } catch (error) {
      console.error('Error accepting challenge:', error);
      toast.error('Invalid or expired code');
    }
  };

  const submitAnswer = async () => {
    if (!token || !battle || selectedAnswer === null || myUserId == null) return;
    const round = battle.rounds[battle.currentRound];
    if (!round?.question) {
      toast.error('Question not loaded yet');
      return;
    }

    setSubmitting(true);
    try {
      const timeMs = Math.max(0, Date.now() - roundStartRef.current);
      const res = await fetch(`${BASE}/battle/${encodeURIComponent(battle.id)}/answer`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          questionIndex: battle.currentRound,
          answerIndex: selectedAnswer,
          timeMs,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.message || 'Could not submit answer');
        return;
      }

      if (data.battleComplete) {
        const b = await fetchBattle(battle.id);
        if (b) setBattle(b);
        setStatus('completed');
        return;
      }

      if (data.roundComplete) {
        const b = await fetchBattle(battle.id);
        if (b) {
          setBattle(b);
          if (b.status === 'completed') setStatus('completed');
        }
        setSelectedAnswer(null);
        return;
      }

      toast.info('Waiting for opponent…');
      const b = await fetchBattle(battle.id);
      if (b) setBattle(b);
    } catch (e) {
      console.error(e);
      toast.error('Submit failed');
    } finally {
      setSubmitting(false);
    }
  };

  const resetLobby = () => {
    setStatus('idle');
    setBattle(null);
    setBattleId(null);
    setInviteCode(null);
    setSelectedAnswer(null);
  };

  const isPlayer1 = battle && myUserId ? battle.player1.userId === myUserId : true;
  const me = battle
    ? isPlayer1
      ? battle.player1
      : battle.player2 ?? battle.player1
    : null;
  const opp = battle
    ? isPlayer1
      ? battle.player2
      : battle.player1
    : null;

  const currentRound = battle?.rounds?.[battle.currentRound];
  const myAnswer = battle && currentRound
    ? isPlayer1
      ? currentRound.player1Answer
      : currentRound.player2Answer
    : null;
  const theirAnswer = battle && currentRound
    ? isPlayer1
      ? currentRound.player2Answer
      : currentRound.player1Answer
    : null;

  if (status === 'idle') {
    return (
      <Card className="w-full bg-gradient-to-br from-purple-600 to-pink-600 text-white p-6">
        <div className="flex items-center gap-3 mb-6">
          <Sword className="w-8 h-8" />
          <h3 className="text-2xl font-bold">Battle Arena</h3>
        </div>

        <p className="text-purple-100 mb-4">Challenge a friend or find a random opponent! Five trivia rounds each.</p>

        <label className="block text-sm text-purple-100 mb-1">Question difficulty (grade)</label>
        <select
          value={grade}
          onChange={(e) => setGrade(e.target.value)}
          className="w-full mb-6 px-3 py-2 rounded bg-white/20 text-white border border-white/30"
        >
          {['year_1', 'year_2', 'year_3', 'year_4', 'year_5', 'year_6', 'year_7', 'year_8', 'year_9', 'year_10', 'year_11', 'year_12'].map((y) => (
            <option key={y} value={y} className="text-gray-900">
              {y.replace('_', ' ')}
            </option>
          ))}
        </select>

        <div className="space-y-4">
          <Button
            onClick={startRandomBattle}
            className="w-full bg-white text-purple-600 hover:bg-purple-50 font-bold text-lg py-6"
          >
            Find random opponent
          </Button>

          <Button
            onClick={() => setBattleMode(battleMode === 'random' ? 'friend' : 'random')}
            className="w-full bg-pink-500 hover:bg-pink-400 text-white font-bold text-lg py-6"
          >
            Challenge a friend
          </Button>
        </div>

        {battleMode === 'friend' && (
          <div className="mt-6 space-y-3 p-4 bg-white/10 rounded-lg">
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Enter invite code"
                value={friendCode}
                onChange={(e) => setFriendCode(e.target.value.toUpperCase())}
                maxLength={4}
                className="flex-1 px-3 py-2 rounded bg-white/20 text-white placeholder-purple-200 text-center font-bold"
              />
              <Button onClick={acceptFriendChallenge} className="bg-green-500 hover:bg-green-400 text-white">
                Join
              </Button>
            </div>
            <Button onClick={startFriendBattle} className="w-full bg-white/20 hover:bg-white/30 text-white">
              Create invite code
            </Button>
            <p className="text-sm text-purple-100">Share the code with your friend to battle</p>
          </div>
        )}
      </Card>
    );
  }

  if (status === 'searching') {
    return (
      <Card className="w-full bg-gradient-to-br from-purple-600 to-pink-600 text-white p-6">
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4" />
          {inviteCode ? (
            <div className="space-y-4">
              <p className="text-xl font-bold">Share this code with your friend:</p>
              <div className="text-4xl font-bold tracking-widest bg-white/20 p-4 rounded">{inviteCode}</div>
              <p className="text-purple-100">Waiting for opponent to join…</p>
              <Button onClick={resetLobby} className="bg-white/20 hover:bg-white/30 text-white">
                Cancel
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-lg">Searching for opponent…</p>
              <Button onClick={resetLobby} className="bg-white/20 hover:bg-white/30 text-white">
                Cancel
              </Button>
            </div>
          )}
        </div>
      </Card>
    );
  }

  if (status === 'active' && battle && me) {
    const q = currentRound?.question;
    const waitingOnThem = myAnswer !== null && theirAnswer === null;

    return (
      <Card className="w-full bg-gradient-to-br from-purple-600 to-pink-600 text-white p-6">
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="text-center p-3 bg-white/10 rounded-lg">
            <p className="text-sm text-purple-100">You</p>
            <p className="font-bold">{me.userName}</p>
            <p className="text-2xl font-bold text-yellow-300">{me.score}</p>
          </div>
          <div className="text-center p-3 bg-white/10 rounded-lg">
            <p className="text-sm text-purple-100">Opponent</p>
            <p className="font-bold">{opp?.userName ?? '…'}</p>
            <p className="text-2xl font-bold text-yellow-300">{opp?.score ?? 0}</p>
          </div>
        </div>

        <div className="mb-6 text-center">
          <p className="text-sm text-purple-100 mb-2">
            Round {battle.currentRound + 1} / {battle.totalRounds}
          </p>
          <div className="w-full bg-white/20 rounded-full h-3 overflow-hidden">
            <div
              className="bg-white h-full transition-all"
              style={{ width: `${((battle.currentRound + 1) / battle.totalRounds) * 100}%` }}
            />
          </div>
        </div>

        {waitingOnThem && (
          <p className="text-center text-purple-100 mb-4 animate-pulse">
            {"Waiting for the opponent's answer…"}
          </p>
        )}

        {q && q.options?.length > 0 && (
          <div className="p-4 bg-white/10 rounded-lg mb-4">
            <p className="font-semibold mb-3">{q.question}</p>
            <div className="space-y-2">
              {q.options.map((option, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => myAnswer === null && setSelectedAnswer(i)}
                  disabled={myAnswer !== null || submitting}
                  className={`w-full p-2 rounded text-left ${
                    selectedAnswer === i ? 'bg-white text-purple-600' : 'bg-white/10 hover:bg-white/20'
                  }`}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>
        )}

        {q && !q.options?.length && <p className="text-purple-100 text-center mb-4">Loading question…</p>}

        <Button
          onClick={() => void submitAnswer()}
          disabled={selectedAnswer === null || myAnswer !== null || submitting || !q}
          className="w-full bg-white text-purple-600 hover:bg-purple-50 font-bold"
        >
          {submitting ? 'Submitting…' : myAnswer !== null ? 'Answer locked' : 'Submit'}
        </Button>
      </Card>
    );
  }

  if (status === 'completed' && battle && battle.player2 && myUserId) {
    const won = battle.winner === myUserId;
    const lost = battle.winner != null && battle.winner !== myUserId;
    return (
      <Card className="w-full bg-gradient-to-br from-purple-50 to-pink-50 border border-purple-200 p-6">
        <div className="text-center">
          <Trophy className={`w-16 h-16 mx-auto mb-4 ${won ? 'text-yellow-500' : 'text-gray-400'}`} />
          <h3 className="text-2xl font-bold mb-2">
            {won ? 'You won!' : lost ? 'Battle over' : 'Draw'}
          </h3>
          <div className="grid grid-cols-2 gap-4 my-6">
            <div className="p-3 bg-white rounded-lg border">
              <p className="text-sm text-gray-500">{battle.player1.userName}</p>
              <p className="text-2xl font-bold text-purple-600">{battle.player1.score}</p>
            </div>
            <div className="p-3 bg-white rounded-lg border">
              <p className="text-sm text-gray-500">{battle.player2.userName}</p>
              <p className="text-2xl font-bold text-pink-600">{battle.player2.score}</p>
            </div>
          </div>
          <Button onClick={resetLobby} className="w-full bg-purple-600 hover:bg-purple-700 text-white">
            Play again
          </Button>
        </div>
      </Card>
    );
  }

  return null;
}

export default BattleArena;
