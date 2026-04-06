import React, { useEffect, useState, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Clock, Zap, Target } from 'lucide-react';
import { toast } from 'sonner';

interface TimeAttackQuestion {
  id: string;
  question: string;
  options: string[];
}

export function TimeAttackMode() {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [questions, setQuestions] = useState<TimeAttackQuestion[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [timeLeftMs, setTimeLeftMs] = useState(300000); // 5 minutes
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [status, setStatus] = useState<'idle' | 'loading' | 'playing' | 'completed'>('idle');
  const [results, setResults] = useState<any>(null);
  const questionTimeStart = useCallback(() => Date.now(), []);

  // Start new session
  const handleStartTimeAttack = async () => {
    try {
      setStatus('loading');
      const token = localStorage.getItem('access_token');
      const grade = localStorage.getItem('user_grade') || 'year_5';

      const response = await fetch(
        `/make-server-cbd74580/trivia-extended/time-attack/start?grade=${grade}`,
        {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` }
        }
      );

      if (!response.ok) throw new Error('Failed to start session');

      const data = await response.json();
      setSessionId(data.sessionId);
      setQuestions(data.questions);
      setStatus('playing');
      setCurrentQuestionIndex(0);
      setScore(0);
      setTimeLeftMs(300000);
    } catch (error) {
      console.error('Error starting time attack:', error);
      toast.error('Failed to start time attack');
      setStatus('idle');
    }
  };

  // Timer countdown
  useEffect(() => {
    if (status !== 'playing') return;

    const interval = setInterval(() => {
      setTimeLeftMs(prev => {
        if (prev <= 0) {
          completeSession();
          return 0;
        }
        return prev - 100;
      });
    }, 100);

    return () => clearInterval(interval);
  }, [status]);

  const completeSession = async () => {
    if (!sessionId) return;

    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch(
        `/make-server-cbd74580/trivia-extended/time-attack/${sessionId}/complete`,
        {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` }
        }
      );

      if (!response.ok) throw new Error('Failed to complete session');

      const data = await response.json();
      setResults(data.results);
      setStatus('completed');
      toast.success(`Session Complete! Score: ${data.results.score}/10`);
    } catch (error) {
      console.error('Error completing session:', error);
      toast.error('Failed to complete session');
    }
  };

  const handleSelectAnswer = async (answerIndex: number) => {
    setSelectedAnswer(answerIndex);

    // Auto-submit after selection
    try {
      const token = localStorage.getItem('access_token');
      const question = questions[currentQuestionIndex];
      const timeSpentMs = Date.now() - questionTimeStart();

      const response = await fetch(
        `/make-server-cbd74580/trivia-extended/time-attack/${sessionId}/answer`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            questionId: question.id,
            answerIndex,
            timeSpentMs,
            isCorrect: answerIndex === 0 // Placeholder
          })
        }
      );

      if (!response.ok) throw new Error('Failed to record answer');

      // Move to next question
      if (currentQuestionIndex < questions.length - 1) {
        setCurrentQuestionIndex(prev => prev + 1);
        setSelectedAnswer(null);
      } else {
        completeSession();
      }
    } catch (error) {
      console.error('Error recording answer:', error);
    }
  };

  const formatTime = (ms: number) => {
    const totalSeconds = Math.ceil(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  if (status === 'idle') {
    return (
      <Card className="w-full bg-gradient-to-br from-red-600 to-orange-600 text-white p-6">
        <div className="flex items-center gap-3 mb-4">
          <Zap className="w-8 h-8" />
          <h3 className="text-2xl font-bold">Time Attack</h3>
        </div>
        <p className="text-red-100 mb-6">10 questions in 5 minutes. Speed wins!</p>
        <Button
          onClick={handleStartTimeAttack}
          className="w-full bg-white text-red-600 hover:bg-red-50 font-bold text-lg py-6"
        >
          Start Challenge
        </Button>
      </Card>
    );
  }

  if (status === 'completed' && results) {
    return (
      <Card className="w-full bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 p-6">
        <h3 className="text-2xl font-bold text-green-700 mb-4">Challenge Complete!</h3>
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="p-4 bg-white rounded-lg border border-green-200">
            <p className="text-sm text-gray-600">Score</p>
            <p className="text-3xl font-bold text-green-600">{results.score}/10</p>
          </div>
          <div className="p-4 bg-white rounded-lg border border-green-200">
            <p className="text-sm text-gray-600">Accuracy</p>
            <p className="text-3xl font-bold text-green-600">{results.accuracy}%</p>
          </div>
          <div className="p-4 bg-white rounded-lg border border-green-200">
            <p className="text-sm text-gray-600">Total XP</p>
            <p className="text-3xl font-bold text-blue-600">+{results.totalXp}</p>
          </div>
          <div className="p-4 bg-white rounded-lg border border-green-200">
            <p className="text-sm text-gray-600">Avg Speed</p>
            <p className="text-3xl font-bold text-orange-600">{(results.averageTimePerQuestion / 1000).toFixed(1)}s</p>
          </div>
        </div>
        <Button
          onClick={() => {
            setStatus('idle');
            setSelectedAnswer(null);
          }}
          className="w-full bg-green-600 hover:bg-green-700 text-white"
        >
          Try Again
        </Button>
      </Card>
    );
  }

  return (
    <Card className="w-full bg-gradient-to-br from-red-600 to-orange-600 text-white p-6">
      <div className="flex justify-between items-center mb-6">
        <span className="text-lg font-bold">Q{currentQuestionIndex + 1}/10</span>
        <div className={`flex items-center gap-2 px-3 py-1 rounded-full ${
          timeLeftMs < 60000 ? 'bg-red-500/50' : 'bg-white/20'
        }`}>
          <Clock className="w-4 h-4" />
          <span className="font-bold">{formatTime(timeLeftMs)}</span>
        </div>
      </div>

      <div className="mb-6">
        <div className="w-full bg-white/20 rounded-full h-2 overflow-hidden">
          <div
            className="bg-white h-full transition-all"
            style={{ width: `${((currentQuestionIndex + 1) / 10) * 100}%` }}
          ></div>
        </div>
      </div>

      <p className="text-lg font-semibold mb-6">{questions[currentQuestionIndex]?.question}</p>

      <div className="space-y-2">
        {questions[currentQuestionIndex]?.options.map((option, index) => (
          <button
            key={index}
            onClick={() => handleSelectAnswer(index)}
            disabled={selectedAnswer !== null}
            className={`w-full p-3 rounded-lg text-left font-medium transition ${
              selectedAnswer === index
                ? 'bg-white text-red-600'
                : 'bg-white/10 hover:bg-white/20 text-white border border-white/20'
            }`}
          >
            {option}
          </button>
        ))}
      </div>
    </Card>
  );
}

export default TimeAttackMode;
