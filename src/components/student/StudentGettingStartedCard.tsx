import { useMemo, useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Progress } from '../ui/progress';
import { CheckCircle, Circle, GraduationCap, X } from 'lucide-react';

type StudentProfile = {
  subjects?: string[];
  learningGoals?: string | string[];
  full_name?: string;
};

interface StudentGettingStartedCardProps {
  userId: string;
  profile: StudentProfile;
  completedSessions: number;
  upcomingSessions: number;
  onOpenSessions: () => void;
  onOpenCurriculum: () => void;
  onOpenReports: () => void;
}

const STORAGE_PREFIX = 'tutornest_student_getting_started_dismissed';

function hasLearningFocus(p: StudentProfile): boolean {
  if ((p.subjects?.length ?? 0) > 0) return true;
  if (typeof p.learningGoals === 'string' && p.learningGoals.trim().length > 8) return true;
  if (Array.isArray(p.learningGoals) && p.learningGoals.length > 0) return true;
  return false;
}

export function StudentGettingStartedCard({
  userId,
  profile,
  completedSessions,
  upcomingSessions,
  onOpenSessions,
  onOpenCurriculum,
  onOpenReports,
}: StudentGettingStartedCardProps) {
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!userId || typeof window === 'undefined') return;
    try {
      setDismissed(localStorage.getItem(`${STORAGE_PREFIX}_${userId}`) === '1');
    } catch {
      /* ignore */
    }
  }, [userId]);

  const items = useMemo(() => {
    const focusOk = hasLearningFocus(profile);
    const sessionActivity = completedSessions > 0 || upcomingSessions > 0;

    return [
      {
        id: 'focus',
        label: 'Share what you’re learning',
        description: 'Subjects and goals help tutors and recommendations match you faster.',
        done: focusOk,
        actionLabel: focusOk ? 'Explore curriculum' : 'Browse curriculum',
        onAction: focusOk ? onOpenCurriculum : onOpenCurriculum,
      },
      {
        id: 'sessions',
        label: 'Join your learning rhythm',
        description: 'Book or attend a session — your progress charts light up after your first lessons.',
        done: sessionActivity,
        actionLabel: sessionActivity ? 'View sessions' : 'Go to sessions',
        onAction: onOpenSessions,
      },
    ];
  }, [profile, completedSessions, upcomingSessions, onOpenSessions, onOpenCurriculum]);

  const doneCount = items.filter((i) => i.done).length;
  const allDone = doneCount === items.length;

  const handleDismiss = () => {
    if (!userId) return;
    try {
      localStorage.setItem(`${STORAGE_PREFIX}_${userId}`, '1');
    } catch {
      /* ignore */
    }
    setDismissed(true);
  };

  if (!userId || dismissed || allDone) return null;

  return (
    <Card className="mb-6 overflow-hidden border-sky-200/90 bg-gradient-to-br from-sky-50/90 via-white to-violet-50/40 shadow-sm">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-100 text-sky-900">
              <GraduationCap className="h-5 w-5" aria-hidden />
            </div>
            <div className="min-w-0">
              <CardTitle className="text-lg text-gray-900">Your learning checklist</CardTitle>
              <CardDescription className="text-gray-600 mt-1">
                Finish these to get personalised sessions, insights, and reports.
              </CardDescription>
            </div>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="shrink-0 text-gray-500 hover:text-gray-800"
            onClick={handleDismiss}
            aria-label="Dismiss checklist"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="mt-4 space-y-1">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Progress</span>
            <span className="tabular-nums">
              {doneCount}/{items.length}
            </span>
          </div>
          <Progress value={(doneCount / items.length) * 100} className="h-2 bg-white/80" />
        </div>
      </CardHeader>
      <CardContent className="space-y-3 pt-0">
        <ul className="space-y-3">
          {items.map((item) => (
            <li
              key={item.id}
              className={`flex gap-3 rounded-xl border p-3 transition-colors ${
                item.done ? 'border-emerald-200 bg-emerald-50/50' : 'border-gray-100 bg-white/70'
              }`}
            >
              <div className="mt-0.5 shrink-0">
                {item.done ? (
                  <CheckCircle className="h-5 w-5 text-emerald-600" aria-hidden />
                ) : (
                  <Circle className="h-5 w-5 text-gray-300" aria-hidden />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p
                  className={`text-sm font-medium ${
                    item.done ? 'text-emerald-900 line-through decoration-emerald-700/50' : 'text-gray-900'
                  }`}
                >
                  {item.label}
                </p>
                <p className="text-xs text-gray-600 mt-0.5">{item.description}</p>
                {!item.done && (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="mt-2 border-sky-200 text-sky-950 hover:bg-sky-50"
                    onClick={item.onAction}
                  >
                    {item.actionLabel}
                  </Button>
                )}
              </div>
            </li>
          ))}
        </ul>
        <p className="text-[11px] text-muted-foreground pt-2 border-t border-gray-100/80">
          After your first sessions, open{' '}
          <button
            type="button"
            className="underline text-sky-800 hover:text-sky-950 font-medium"
            onClick={onOpenReports}
          >
            Session Reports
          </button>{' '}
          for tutor feedback.
        </p>
      </CardContent>
    </Card>
  );
}
