import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { Alert, AlertDescription } from './ui/alert';
import { toast } from 'sonner@2.0.3';
import {
  Brain,
  Trophy,
  Zap,
  Clock,
  CheckCircle,
  XCircle,
  Star,
  Flame,
  Target,
  Award,
  TrendingUp,
  Loader2,
  Play,
  RotateCcw
} from 'lucide-react';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import { getSupabaseClient } from '../utils/supabase/client';

interface TriviaQuestion {
  id: string;
  question: string;
  options: string[];
  correctAnswer: number;
  difficulty: 'easy' | 'medium' | 'hard';
  xpReward: number;
}

interface TriviaGameProps {
  userId: string;
  grade: string;
  onXPEarned?: (xp: number) => void;
}

export function TriviaGame({ userId, grade, onXPEarned }: TriviaGameProps) {
  const supabase = getSupabaseClient();
  const [session, setSession] = useState<any>(null);
  const [gameState, setGameState] = useState<'idle' | 'subject-select' | 'playing' | 'finished'>('idle');
  const [selectedSubject, setSelectedSubject] = useState<string>('');
  const [availableSubjects, setAvailableSubjects] = useState<string[]>([]);
  const [questions, setQuestions] = useState<TriviaQuestion[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [answers, setAnswers] = useState<any[]>([]);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(30);
  const [totalXP, setTotalXP] = useState(0);
  const [loading, setLoading] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [isAnswered, setIsAnswered] = useState(false);
  const [gameStartTime, setGameStartTime] = useState<number>(0);

  // Convert grade format from profile format to trivia format
  const convertGradeFormat = (gradeValue: string): string => {
    // If already in year_X format, return as is
    if (gradeValue.startsWith('year_')) {
      return gradeValue;
    }
    
    // Nursery maps to Year 1 questions (pre-primary, age 3-5)
    if (gradeValue.startsWith('nursery_')) {
      return 'year_1';
    }

    // Nigeria primary maps directly: Primary 1 (P1) = Year 1, Primary 2 (P2) = Year 2, etc.
    if (gradeValue.startsWith('primary_')) {
      const num = parseInt(gradeValue.replace('primary_', ''));
      return `year_${num}`; // primary_1 -> year_1, primary_6 -> year_6
    }

    // Nigeria secondary maps directly: JSS 1 = Year 7, JSS 2 = Year 8, JSS 3 = Year 9,
    // SS 1 = Year 10, SS 2 = Year 11
    if (gradeValue.startsWith('secondary_')) {
      const num = parseInt(gradeValue.replace('secondary_', ''));
      return `year_${num}`; // secondary_7 -> year_7, secondary_11 -> year_11
    }

    // SS 3 = Year 12
    if (gradeValue === 'sixth_form_12') return 'year_12';
    if (gradeValue === 'sixth_form_13') return 'year_12'; // Post-secondary uses year_12 max

    // Default fallback
    return 'year_1';
  };

  const normalizedGrade = convertGradeFormat(grade);

  useEffect(() => {
    console.log('TriviaGame - Original grade:', grade, '| Normalized grade:', normalizedGrade);
    console.log('TriviaGame - Full grade debug:', { original: grade, normalized: normalizedGrade, userId });
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });
  }, []);

  // Timer countdown
  useEffect(() => {
    if (gameState === 'playing' && !isAnswered && timeLeft > 0) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    } else if (timeLeft === 0 && !isAnswered) {
      handleTimeout();
    }
  }, [gameState, timeLeft, isAnswered]);

  const loadAvailableSubjects = async () => {
    if (!session?.access_token) return;

    setLoading(true);
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-cbd74580/trivia/subjects/${normalizedGrade}`,
        {
          headers: {
            'Authorization': `Bearer ${session.access_token}`
          }
        }
      );

      if (response.ok) {
        const data = await response.json();
        setAvailableSubjects(data.subjects || []);
        setGameState('subject-select');
      } else {
        toast.error('Failed to load subjects');
      }
    } catch (error) {
      console.error('Error loading subjects:', error);
      toast.error('Failed to load trivia subjects');
    } finally {
      setLoading(false);
    }
  };

  const startGame = async (subject: string) => {
    if (!session?.access_token) return;

    setLoading(true);
    setSelectedSubject(subject);

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-cbd74580/trivia/questions?grade=${normalizedGrade}&subject=${encodeURIComponent(subject)}&count=5`,
        {
          headers: {
            'Authorization': `Bearer ${session.access_token}`
          }
        }
      );

      if (response.ok) {
        const data = await response.json();
        setQuestions(data.questions || []);
        setGameState('playing');
        setCurrentQuestionIndex(0);
        setAnswers([]);
        setScore(0);
        setTotalXP(0);
        setTimeLeft(30);
        setIsAnswered(false);
        setSelectedAnswer(null);
        setGameStartTime(Date.now());
      } else {
        const errorData = await response.json();
        toast.error(errorData.message || 'Failed to load trivia questions');
        setGameState('subject-select');
      }
    } catch (error) {
      console.error('Error loading trivia:', error);
      toast.error('Failed to start trivia game');
      setGameState('subject-select');
    } finally {
      setLoading(false);
    }
  };

  const handleAnswer = (answerIndex: number) => {
    if (isAnswered) return;

    const currentQuestion = questions[currentQuestionIndex];
    const isCorrect = answerIndex === currentQuestion.correctAnswer;
    const xpEarned = isCorrect ? currentQuestion.xpReward : 0;

    setSelectedAnswer(answerIndex);
    setIsAnswered(true);

    const answerRecord = {
      questionId: currentQuestion.id,
      question: currentQuestion.question,
      selectedAnswer: answerIndex,
      correctAnswer: currentQuestion.correctAnswer,
      isCorrect,
      xpEarned,
      timeSpent: 30 - timeLeft
    };

    setAnswers([...answers, answerRecord]);

    if (isCorrect) {
      setScore(score + 1);
      setTotalXP(totalXP + xpEarned);
    }

    setShowResult(true);

    // Auto-advance to next question after 2 seconds
    setTimeout(() => {
      moveToNextQuestion();
    }, 2000);
  };

  const handleTimeout = () => {
    if (isAnswered) return;

    const currentQuestion = questions[currentQuestionIndex];
    const answerRecord = {
      questionId: currentQuestion.id,
      question: currentQuestion.question,
      selectedAnswer: -1,
      correctAnswer: currentQuestion.correctAnswer,
      isCorrect: false,
      xpEarned: 0,
      timeSpent: 30
    };

    setAnswers([...answers, answerRecord]);
    setIsAnswered(true);
    setShowResult(true);

    setTimeout(() => {
      moveToNextQuestion();
    }, 2000);
  };

  const moveToNextQuestion = () => {
    setShowResult(false);
    setIsAnswered(false);
    setSelectedAnswer(null);

    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
      setTimeLeft(30);
    } else {
      finishGame();
    }
  };

  const finishGame = async () => {
    if (!session?.access_token) return;

    setGameState('finished');

    try {
      const timeSpent = Math.floor((Date.now() - gameStartTime) / 1000);

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-cbd74580/trivia/submit`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            answers,
            grade: normalizedGrade,
            subject: selectedSubject,
            timeSpent
          })
        }
      );

      if (response.ok) {
        const data = await response.json();
        toast.success(`🎉 Game complete! +${totalXP} XP earned!`);
        
        if (onXPEarned && totalXP > 0) {
          onXPEarned(totalXP);
        }
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        console.error('Failed to save trivia results:', response.status, errorData);
        toast.error('Failed to save results');
      }
    } catch (error) {
      console.error('Error submitting trivia:', error);
      toast.error('Failed to save trivia results');
    }
  };

  const restartGame = () => {
    setGameState('subject-select');
    setQuestions([]);
    setCurrentQuestionIndex(0);
    setAnswers([]);
    setScore(0);
    setTotalXP(0);
    setTimeLeft(30);
    setIsAnswered(false);
    setSelectedAnswer(null);
    setShowResult(false);
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'bg-green-500';
      case 'medium': return 'bg-yellow-500';
      case 'hard': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getTimerColor = () => {
    if (timeLeft > 20) return 'text-green-600';
    if (timeLeft > 10) return 'text-yellow-600';
    return 'text-red-600';
  };

  if (gameState === 'idle') {
    return (
      <Card className="border-2 border-purple-200 bg-gradient-to-br from-purple-50 to-green-50">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-full bg-purple-100">
              <Brain className="w-8 h-8 text-purple-600" />
            </div>
            <div>
              <CardTitle className="text-2xl">Trivia Challenge</CardTitle>
              <CardDescription>Test your knowledge and earn XP!</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-white rounded-lg border border-purple-100">
              <Zap className="w-8 h-8 text-yellow-500 mx-auto mb-2" />
              <p className="text-sm text-gray-600">Earn 10-50 XP</p>
              <p className="text-xs text-gray-500 mt-1">Per question</p>
            </div>
            <div className="text-center p-4 bg-white rounded-lg border border-purple-100">
              <Clock className="w-8 h-8 text-blue-500 mx-auto mb-2" />
              <p className="text-sm text-gray-600">30 Seconds</p>
              <p className="text-xs text-gray-500 mt-1">Per question</p>
            </div>
            <div className="text-center p-4 bg-white rounded-lg border border-purple-100">
              <Target className="w-8 h-8 text-green-600 mx-auto mb-2" />
              <p className="text-sm text-gray-600">5 Questions</p>
              <p className="text-xs text-gray-500 mt-1">Per game</p>
            </div>
          </div>

          <Alert className="bg-blue-50 border-blue-200">
            <AlertDescription className="text-sm text-blue-800">
              💡 Answer quickly and correctly to maximize XP! Compete with classmates in your grade on the leaderboard.
            </AlertDescription>
          </Alert>

          {!session ? (
            <Alert className="bg-yellow-50 border-yellow-200">
              <AlertDescription className="text-sm text-yellow-800">
                Loading session... Please wait.
              </AlertDescription>
            </Alert>
          ) : null}

          <Button 
            onClick={loadAvailableSubjects}
            disabled={loading || !session}
            className="w-full h-14 text-lg bg-gradient-to-r from-purple-600 to-green-600 hover:from-purple-700 hover:to-green-700"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Loading...
              </>
            ) : !session ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Loading Session...
              </>
            ) : (
              <>
                <Play className="w-5 h-5 mr-2" />
                Start Trivia Challenge
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (gameState === 'subject-select') {
    return (
      <Card className="border-2 border-purple-200">
        <CardHeader>
          <CardTitle>Choose Your Subject</CardTitle>
          <CardDescription>Select a subject to test your knowledge</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {availableSubjects.map((subject) => (
              <Button
                key={subject}
                onClick={() => startGame(subject)}
                disabled={loading}
                variant="outline"
                className="h-20 text-lg hover:bg-purple-50 hover:border-purple-300"
              >
                {subject}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (gameState === 'playing') {
    const currentQuestion = questions[currentQuestionIndex];

    return (
      <Card className="border-2 border-purple-200">
        <CardHeader>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-sm">
                Question {currentQuestionIndex + 1}/{questions.length}
              </Badge>
              <Badge className={getDifficultyColor(currentQuestion.difficulty)}>
                {currentQuestion.difficulty}
              </Badge>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Star className="w-5 h-5 text-yellow-500" />
                <span>{totalXP} XP</span>
              </div>
              <div className={`flex items-center gap-2 ${getTimerColor()}`}>
                <Clock className="w-5 h-5" />
                <span className="text-xl font-mono font-bold">{timeLeft}s</span>
              </div>
            </div>
          </div>
          <Progress value={(currentQuestionIndex / questions.length) * 100} className="h-2" />
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="bg-gradient-to-r from-purple-100 to-green-100 p-6 rounded-lg">
            <h3 className="text-xl mb-2">{currentQuestion.question}</h3>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Zap className="w-4 h-4 text-yellow-500" />
              <span>+{currentQuestion.xpReward} XP for correct answer</span>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3">
            {currentQuestion.options.map((option, index) => {
              const isSelected = selectedAnswer === index;
              const isCorrect = index === currentQuestion.correctAnswer;
              const showFeedback = isAnswered && showResult;

              let buttonClass = 'h-auto min-h-[60px] text-left justify-start border-2';
              
              if (!showFeedback) {
                buttonClass += isSelected 
                  ? ' bg-purple-100 border-purple-400' 
                  : ' hover:bg-gray-50 hover:border-purple-200';
              } else {
                if (isCorrect) {
                  buttonClass += ' bg-green-100 border-green-500';
                } else if (isSelected && !isCorrect) {
                  buttonClass += ' bg-red-100 border-red-500';
                } else {
                  buttonClass += ' opacity-50';
                }
              }

              return (
                <Button
                  key={index}
                  onClick={() => handleAnswer(index)}
                  disabled={isAnswered}
                  variant="outline"
                  className={buttonClass}
                >
                  <div className="flex items-center justify-between w-full">
                    <span className="flex-1 text-base">{option}</span>
                    {showFeedback && isCorrect && (
                      <CheckCircle className="w-5 h-5 text-green-600 ml-2 flex-shrink-0" />
                    )}
                    {showFeedback && isSelected && !isCorrect && (
                      <XCircle className="w-5 h-5 text-red-600 ml-2 flex-shrink-0" />
                    )}
                  </div>
                </Button>
              );
            })}
          </div>

          {showResult && (
            <Alert className={selectedAnswer === currentQuestion.correctAnswer ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}>
              <AlertDescription className="text-sm">
                {selectedAnswer === currentQuestion.correctAnswer ? (
                  <>
                    <CheckCircle className="w-4 h-4 inline mr-2 text-green-600" />
                    Correct! +{currentQuestion.xpReward} XP
                  </>
                ) : selectedAnswer === -1 ? (
                  <>
                    <Clock className="w-4 h-4 inline mr-2 text-orange-600" />
                    Time's up! The correct answer was: {currentQuestion.options[currentQuestion.correctAnswer]}
                  </>
                ) : (
                  <>
                    <XCircle className="w-4 h-4 inline mr-2 text-red-600" />
                    Incorrect. The correct answer was: {currentQuestion.options[currentQuestion.correctAnswer]}
                  </>
                )}
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    );
  }

  if (gameState === 'finished') {
    const percentage = Math.round((score / questions.length) * 100);
    const totalPossibleXP = questions.reduce((sum, q) => sum + q.xpReward, 0);

    return (
      <Card className="border-2 border-purple-200 bg-gradient-to-br from-purple-50 to-green-50">
        <CardHeader>
          <div className="text-center">
            <Trophy className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
            <CardTitle className="text-3xl mb-2">Game Complete!</CardTitle>
            <CardDescription>Here's how you did</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-white rounded-lg border border-purple-100">
              <Trophy className="w-8 h-8 text-yellow-500 mx-auto mb-2" />
              <p className="text-2xl font-bold text-purple-600">{score}/{questions.length}</p>
              <p className="text-xs text-gray-500">Correct</p>
            </div>
            <div className="text-center p-4 bg-white rounded-lg border border-purple-100">
              <Target className="w-8 h-8 text-blue-500 mx-auto mb-2" />
              <p className="text-2xl font-bold text-blue-600">{percentage}%</p>
              <p className="text-xs text-gray-500">Accuracy</p>
            </div>
            <div className="text-center p-4 bg-white rounded-lg border border-green-100">
              <Zap className="w-8 h-8 text-yellow-500 mx-auto mb-2" />
              <p className="text-2xl font-bold text-green-600">+{totalXP}</p>
              <p className="text-xs text-gray-500">XP Earned</p>
            </div>
            <div className="text-center p-4 bg-white rounded-lg border border-purple-100">
              <Award className="w-8 h-8 text-purple-500 mx-auto mb-2" />
              <p className="text-2xl font-bold text-purple-600">{Math.round((totalXP/totalPossibleXP)*100)}%</p>
              <p className="text-xs text-gray-500">Max XP</p>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg border border-purple-100">
            <h4 className="font-semibold mb-3 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-purple-600" />
              Performance Breakdown
            </h4>
            <div className="space-y-2">
              {answers.map((answer, index) => (
                <div key={index} className="flex items-center justify-between p-2 rounded hover:bg-gray-50">
                  <span className="text-sm flex-1">Q{index + 1}: {answer.question.substring(0, 50)}...</span>
                  <div className="flex items-center gap-2">
                    {answer.isCorrect ? (
                      <>
                        <CheckCircle className="w-4 h-4 text-green-600" />
                        <span className="text-sm text-green-600">+{answer.xpEarned} XP</span>
                      </>
                    ) : (
                      <XCircle className="w-4 h-4 text-red-600" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-3">
            <Button 
              onClick={restartGame}
              className="flex-1 h-12 bg-gradient-to-r from-purple-600 to-green-600 hover:from-purple-700 hover:to-green-700"
            >
              <RotateCcw className="w-5 h-5 mr-2" />
              Play Again
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return null;
}