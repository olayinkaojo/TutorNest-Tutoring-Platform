import { Plus, Calendar, TrendingUp, Users } from 'lucide-react';
import { Card, CardContent } from '../ui/card';

interface ParentQuickActionsProps {
  setActiveTab: (tab: string) => void;
}

export function ParentQuickActions({ setActiveTab }: ParentQuickActionsProps) {
  const actions = [
    { tab: 'overview',     icon: Plus,        color: 'purple', label: 'Add Child',    sub: 'Create student profile' },
    { tab: 'bookings',     icon: Calendar,    color: 'green',  label: 'Book Lesson',  sub: 'Schedule tutoring' },
    { tab: 'progress',     icon: TrendingUp,  color: 'blue',   label: 'Progress',     sub: 'Track development' },
    { tab: 'find-tutors',  icon: Users,       color: 'orange', label: 'Find Tutors',  sub: 'Browse tutors' },
  ] as const;

  return (
    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      {actions.map(({ tab, icon: Icon, color, label, sub }) => (
        <Card
          key={tab}
          className="cursor-pointer hover:shadow-lg transition-shadow"
          onClick={() => setActiveTab(tab)}
        >
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className={`w-12 h-12 bg-${color}-100 rounded-xl flex items-center justify-center`}>
                <Icon className={`w-6 h-6 text-${color}-600`} />
              </div>
              <div>
                <h3 className="text-sm">{label}</h3>
                <p className="text-xs text-gray-600">{sub}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
