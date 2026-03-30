import { Users, Calendar, BookOpen } from 'lucide-react';
import { NairaIcon } from '../icons/NairaIcon';
import { formatNaira } from '../../utils/currency';

interface TutorStats {
  activeStudents: number;
  lessonsThisWeek: number;
  totalLessons: number;
  earnings: number;
}

interface TutorStatsSectionProps {
  stats: TutorStats;
  setActiveTab: (tab: string) => void;
}

export function TutorStatsSection({ stats, setActiveTab }: TutorStatsSectionProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <button
        onClick={() => setActiveTab('performance')}
        className="bg-purple-50 p-4 rounded-lg border border-purple-100 hover:border-purple-300 hover:shadow-md transition-all text-left w-full"
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-600 mb-1">Active Students</p>
            <h2 className="text-2xl">{stats.activeStudents}</h2>
          </div>
          <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
            <Users className="w-5 h-5 text-purple-600" />
          </div>
        </div>
      </button>

      <button
        onClick={() => setActiveTab('bookings')}
        className="bg-blue-50 p-4 rounded-lg border border-blue-100 hover:border-blue-300 hover:shadow-md transition-all text-left w-full"
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-600 mb-1">Lessons This Week</p>
            <h2 className="text-2xl">{stats.lessonsThisWeek}</h2>
          </div>
          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
            <Calendar className="w-5 h-5 text-blue-600" />
          </div>
        </div>
      </button>

      <button
        onClick={() => setActiveTab('history')}
        className="bg-green-50 p-4 rounded-lg border border-green-100 hover:border-green-300 hover:shadow-md transition-all text-left w-full"
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-600 mb-1">Total Lessons</p>
            <h2 className="text-2xl">{stats.totalLessons}</h2>
          </div>
          <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
            <BookOpen className="w-5 h-5 text-green-600" />
          </div>
        </div>
      </button>

      <button
        onClick={() => setActiveTab('payouts')}
        className="bg-yellow-50 p-4 rounded-lg border border-yellow-100 hover:border-yellow-300 hover:shadow-md transition-all text-left w-full"
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-600 mb-1">Earnings</p>
            <h2 className="text-2xl">{formatNaira(stats.earnings, false)}</h2>
          </div>
          <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
            <NairaIcon className="w-5 h-5 text-yellow-600" />
          </div>
        </div>
      </button>
    </div>
  );
}
