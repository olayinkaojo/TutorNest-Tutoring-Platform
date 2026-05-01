import { useEffect, useState } from 'react';
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

interface Battle {
  id: string;
  player1: BattlePlayer;
  player2: BattlePlayer;
  totalRounds: number;
  currentRound: number;
  status: string;
  winner: string | null;
}

export function BattleArena() {
  const [token, setToken] = useState<string | null>(null);
  const [status, setStatus] = useState<'idle' | 'searching' | 'active' | 'completed'>('idle');
  const [battle, setBattle] = useState<Battle | null>(null);
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [battleMode, setBattleMode] = useState<'random' | 'friend'>('random');
  const [friendCode, setFriendCode] = useState('');
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);

  useEffect(() => {
    getSupabaseClient().auth.getSession().then(({ data: { session } }) => {
      if (session?.access_token) setToken(session.access_token);
    });
  }, []);

  const startRandomBattle = async () => {
    if (!token) { toast.error('Not logged in'); return; }
    try {
      setStatus('searching');
      const response = await fetch(`${BASE}/battle/start`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ battleMode: 'random' })
      });

      if (!response.ok) throw new Error('Failed to start battle');

      const data = await response.json();
      if (data.waitingForOpponent) {
        toast.success('Searching for opponent...');
      } else {
        setBattle(data.battle);
        setStatus('active');
      }
    } catch (error) {
      console.error('Error starting battle:', error);
      toast.error('Failed to start battle');
      setStatus('idle');
    }
  };

  const startFriendBattle = async () => {
    if (!token) { toast.error('Not logged in'); return; }
    try {
      setStatus('searching');
      const response = await fetch(`${BASE}/battle/start`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ battleMode: 'friend_challenge' })
      });

      if (!response.ok) throw new Error('Failed to create challenge');

      const data = await response.json();
      setInviteCode(data.inviteCode);
      toast.success(`Invite code: ${data.inviteCode}`);
    } catch (error) {
      console.error('Error creating challenge:', error);
      toast.error('Failed to create challenge');
      setStatus('idle');
    }
  };

  const acceptFriendChallenge = async () => {
    if (!friendCode) { toast.error('Enter an invite code'); return; }
    if (!token) { toast.error('Not logged in'); return; }
    try {
      const response = await fetch(`${BASE}/battle/accept/${friendCode}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) throw new Error('Invalid code');

      const data = await response.json();
      setBattle(data.battle);
      setStatus('active');
      toast.success('Battle started!');
    } catch (error) {
      console.error('Error accepting challenge:', error);
      toast.error('Invalid or expired code');
    }
  };

  if (status === 'idle') {
    return (
      <Card className="w-full bg-gradient-to-br from-purple-600 to-pink-600 text-white p-6">
        <div className="flex items-center gap-3 mb-6">
          <Sword className="w-8 h-8" />
          <h3 className="text-2xl font-bold">Battle Arena</h3>
        </div>

        <p className="text-purple-100 mb-6">Challenge a friend or find a random opponent!</p>

        <div className="space-y-4">
          <Button
            onClick={startRandomBattle}
            className="w-full bg-white text-purple-600 hover:bg-purple-50 font-bold text-lg py-6"
          >
            🎯 Find Random Opponent
          </Button>

          <Button
            onClick={() => setBattleMode(battleMode === 'random' ? 'friend' : 'random')}
            className="w-full bg-pink-500 hover:bg-pink-400 text-white font-bold text-lg py-6"
          >
            👥 Challenge a Friend
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
              Create Invite Code
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
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          {inviteCode ? (
            <div className="space-y-4">
              <p className="text-xl font-bold">Share this code with your friend:</p>
              <div className="text-4xl font-bold tracking-widest bg-white/20 p-4 rounded">{inviteCode}</div>
              <p className="text-purple-100">Waiting for opponent...</p>
              <Button onClick={() => { setStatus('idle'); setInviteCode(null); }} className="bg-white/20 hover:bg-white/30 text-white">
                Cancel
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-lg">Searching for opponent...</p>
              <Button onClick={() => setStatus('idle')} className="bg-white/20 hover:bg-white/30 text-white">
                Cancel
              </Button>
            </div>
          )}
        </div>
      </Card>
    );
  }

  if (status === 'active' && battle) {
    return (
      <Card className="w-full bg-gradient-to-br from-purple-600 to-pink-600 text-white p-6">
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="text-center p-3 bg-white/10 rounded-lg">
            <p className="text-sm text-purple-100">You</p>
            <p className="font-bold">{battle.player1.userName}</p>
            <p className="text-2xl font-bold text-yellow-300">{battle.player1.score}</p>
          </div>
          <div className="text-center p-3 bg-white/10 rounded-lg">
            <p className="text-sm text-purple-100">Opponent</p>
            <p className="font-bold">{battle.player2?.userName || 'Waiting...'}</p>
            <p className="text-2xl font-bold text-yellow-300">{battle.player2?.score ?? 0}</p>
          </div>
        </div>

        <div className="mb-6 text-center">
          <p className="text-sm text-purple-100 mb-2">Round {battle.currentRound + 1} / {battle.totalRounds}</p>
          <div className="w-full bg-white/20 rounded-full h-3 overflow-hidden">
            <div
              className="bg-white h-full transition-all"
              style={{ width: `${((battle.currentRound + 1) / battle.totalRounds) * 100}%` }}
            />
          </div>
        </div>

        <div className="p-4 bg-white/10 rounded-lg mb-4">
          <p className="font-semibold mb-3">Answer the question to advance!</p>
          <div className="space-y-2">
            {['Option A', 'Option B', 'Option C', 'Option D'].map((option, i) => (
              <button
                key={i}
                onClick={() => setSelectedAnswer(i)}
                className={`w-full p-2 rounded text-left ${
                  selectedAnswer === i ? 'bg-white text-purple-600' : 'bg-white/10 hover:bg-white/20'
                }`}
              >
                {option}
              </button>
            ))}
          </div>
        </div>

        <Button disabled={selectedAnswer === null} className="w-full bg-white text-purple-600 hover:bg-purple-50 font-bold">
          Submit
        </Button>
      </Card>
    );
  }

  if (status === 'completed' && battle) {
    const isWinner = battle.winner === battle.player1.userId;
    return (
      <Card className="w-full bg-gradient-to-br from-purple-50 to-pink-50 border border-purple-200 p-6">
        <div className="text-center">
          <Trophy className={`w-16 h-16 mx-auto mb-4 ${isWinner ? 'text-yellow-500' : 'text-gray-400'}`} />
          <h3 className="text-2xl font-bold mb-2">{isWinner ? 'You Won! 🎉' : 'Battle Over'}</h3>
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
          <Button onClick={() => { setStatus('idle'); setBattle(null); }} className="w-full bg-purple-600 hover:bg-purple-700 text-white">
            Play Again
          </Button>
        </div>
      </Card>
    );
  }

  return null;
}

export default BattleArena;
