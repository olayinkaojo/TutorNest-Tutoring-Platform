import React, { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Sword, Trophy, Clock, RotateCw } from 'lucide-react';
import { toast } from 'sonner';

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
  const [status, setStatus] = useState<'idle' | 'searching' | 'active' | 'completed'>('idle');
  const [battle, setBattle] = useState<Battle | null>(null);
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [battleMode, setBattleMode] = useState<'random' | 'friend'>('random');
  const [friendCode, setFriendCode] = useState('');
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [results, setResults] = useState<any>(null);

  const startRandomBattle = async () => {
    try {
      setStatus('searching');
      const token = localStorage.getItem('access_token');

      const response = await fetch('/make-server-cbd74580/battle/start', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ battleMode: 'random' })
      });

      if (!response.ok) throw new Error('Failed to start battle');

      const data = await response.json();
      if (data.waitingForOpponent) {
        toast.success('Searching for opponent...');
        // Poll for opponent
        pollBattleStatus();
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
    try {
      setStatus('searching');
      const token = localStorage.getItem('access_token');

      const response = await fetch('/make-server-cbd74580/battle/start', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ battleMode: 'friend_challenge' })
      });

      if (!response.ok) throw new Error('Failed to create challenge');

      const data = await response.json();
      setInviteCode(data.inviteCode);
      setStatus('searching');
      toast.success(`Invite code: ${data.inviteCode}`);
    } catch (error) {
      console.error('Error creating challenge:', error);
      toast.error('Failed to create challenge');
      setStatus('idle');
    }
  };

  const acceptFriendChallenge = async () => {
    if (!friendCode) {
      toast.error('Enter an invite code');
      return;
    }

    try {
      const token = localStorage.getItem('access_token');

      const response = await fetch(
        `/make-server-cbd74580/battle/accept/${friendCode}`,
        {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` }
        }
      );

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

  const pollBattleStatus = () => {
    const interval = setInterval(async () => {
      if (battle) clearInterval(interval);
    }, 1000);

    setTimeout(() => clearInterval(interval), 30000);
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
              <Button
                onClick={acceptFriendChallenge}
                className="bg-green-500 hover:bg-green-400 text-white"
              >
                Join
              </Button>
            </div>
            <p className="text-sm text-purple-100">or create one with the button above</p>
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
              <div className="text-4xl font-bold tracking-widest bg-white/20 p-4 rounded">
                {inviteCode}
              </div>
              <p className="text-purple-100">Waiting for opponent...</p>
            </div>
          ) : (
            <p className="text-lg">Searching for opponent...</p>
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
            <p className="text-sm text-purple-100">Player 1</p>
            <p className="font-bold">{battle.player1.userName}</p>
            <p className="text-2xl font-bold text-yellow-300">{battle.player1.score}</p>
          </div>
          <div className="text-center p-3 bg-white/10 rounded-lg">
            <p className="text-sm text-purple-100">Player 2</p>
            <p className="font-bold">{battle.player2?.userName || 'Waiting...'}</p>
            <p className="text-2xl font-bold text-yellow-300">{battle.player2?.score || 0}</p>
          </div>
        </div>

        <div className="mb-6 text-center">
          <p className="text-sm text-purple-100 mb-2">Round {battle.currentRound + 1} / {battle.totalRounds}</p>
          <div className="w-full bg-white/20 rounded-full h-3 overflow-hidden">
            <div
              className="bg-white h-full transition-all"
              style={{ width: `${((battle.currentRound + 1) / battle.totalRounds) * 100}%` }}
            ></div>
          </div>
        </div>

        <div className="p-4 bg-white/10 rounded-lg mb-4">
          <p className="font-semibold mb-3">What is the capital of France?</p>
          <div className="space-y-2">
            {['London', 'Paris', 'Berlin', 'Madrid'].map((option, i) => (
              <button
                key={i}
                onClick={() => setSelectedAnswer(i)}
                className={`w-full p-2 rounded text-left ${
                  selectedAnswer === i
                    ? 'bg-white text-purple-600'
                    : 'bg-white/10 hover:bg-white/20'
                }`}
              >
                {option}
              </button>
            ))}
          </div>
        </div>

        <Button
          disabled={selectedAnswer === null}
          className="w-full bg-white text-purple-600 hover:bg-purple-50 font-bold"
        >
          Submit
        </Button>
      </Card>
    );
  }

  return null;
}

export default BattleArena;
