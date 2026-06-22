import { useMemo, useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Progress } from '../ui/progress';
import { CheckCircle, Circle, Sparkles, X } from 'lucide-react';

interface ParentGettingStartedCardProps {
  userId: string;
  childrenCount: number;
  lessonsScheduled: number;
  completedLessons: number;
  onAddChild: () => void;
  onFindTutors: () => void;
  onBookings: () => void;
  onPayments: () => void;
}

const STORAGE_PREFIX = 'kfa_parent_getting_started_dismissed';

export function ParentGettingStartedCard({
  userId,
  childrenCount,
  lessonsScheduled,
  completedLessons,
  onAddChild,
  onFindTutors,
  onBookings,
  onPayments,
}: ParentGettingStartedCardProps) {
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
    const hasChildren = childrenCount > 0;
    const hasActivity = lessonsScheduled > 0 || completedLessons > 0;

    return [
      {
        id: 'children',
        label: 'Add learner profiles',
        description:
          'Create a profile for each child you’re supporting. You’ll need this before searching or booking tutors.',
        done: hasChildren,
        actionLabel: 'Add a child',
        onAction: onAddChild,
      },
      {
        id: 'book',
        label: 'Book or attend a session',
        description: 'Schedule a lesson or complete one — then track progress from your dashboard.',
        done: hasActivity,
        actionLabel: hasActivity ? 'View bookings' : 'Find tutors',
        onAction: hasActivity ? onBookings : onFindTutors,
      },
    ];
  }, [childrenCount, lessonsScheduled, completedLessons, onAddChild, onFindTutors, onBookings]);

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
    <Card className="mb-8 overflow-hidden border-violet-200/90 bg-gradient-to-br from-violet-50/95 via-white to-emerald-50/40 shadow-sm">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-violet-800">
              <Sparkles className="h-5 w-5" aria-hidden />
            </div>
            <div className="min-w-0">
              <CardTitle className="text-lg text-gray-900">Getting started</CardTitle>
              <CardDescription className="text-gray-600 mt-1">
                Two quick wins unlock the full parent experience — most families finish in minutes.
              </CardDescription>
            </div>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="shrink-0 text-gray-500 hover:text-gray-800"
            onClick={handleDismiss}
            aria-label="Dismiss getting started checklist"
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
                    className="mt-2 border-violet-200 text-violet-900 hover:bg-violet-50"
                    onClick={item.onAction}
                  >
                    {item.actionLabel}
                  </Button>
                )}
              </div>
            </li>
          ))}
        </ul>
        <p className="text-[11px] text-muted-foreground pt-1 border-t border-gray-100/80 mt-2">
          Before your first paid session, add a payment method under{' '}
          <button
            type="button"
            className="underline text-violet-700 hover:text-violet-900 font-medium"
            onClick={onPayments}
          >
            Payments
          </button>
          .
        </p>
      </CardContent>
    </Card>
  );
}
