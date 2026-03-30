import { Filter, Users, Calendar, BookOpen } from 'lucide-react';
import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { MultiSelectFilter, SelectedFilterBadges } from '../MultiSelectFilter';
import { NairaIcon } from '../icons/NairaIcon';
import { formatNaira } from '../../utils/currency';

interface Stats {
  totalChildren: number;
  lessonsScheduled: number;
  completedLessons: number;
  totalSpent: number;
}

interface ParentStatsSectionProps {
  stats: Stats;
  selectedMonths: number[];
  selectedYears: number[];
  setSelectedMonths: (months: number[]) => void;
  setSelectedYears: (years: number[]) => void;
  setActiveTab: (tab: string) => void;
}

const MONTHS = [
  { value: 1, label: 'January' }, { value: 2, label: 'February' },
  { value: 3, label: 'March' },   { value: 4, label: 'April' },
  { value: 5, label: 'May' },     { value: 6, label: 'June' },
  { value: 7, label: 'July' },    { value: 8, label: 'August' },
  { value: 9, label: 'September' },{ value: 10, label: 'October' },
  { value: 11, label: 'November' },{ value: 12, label: 'December' },
];

const MONTH_BADGES = MONTHS.map(({ value, label }) => ({ value, label: label.slice(0, 3) }));
const ALL_MONTHS = MONTHS.map(m => m.value);

const YEARS = [2023, 2024, 2025, 2026, 2027];
const YEAR_OPTIONS = YEARS.map(y => ({ value: y, label: y.toString() }));

export function ParentStatsSection({
  stats, selectedMonths, selectedYears,
  setSelectedMonths, setSelectedYears, setActiveTab,
}: ParentStatsSectionProps) {
  return (
    <Card className="mb-8">
      <CardContent className="pt-6">
        {/* Date Filter */}
        <div className="pb-3 mb-4 border-b border-gray-200">
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <div className="flex items-center gap-1.5">
              <Filter className="w-4 h-4 text-gray-500" />
              <span className="text-sm text-gray-600">Filter by:</span>
            </div>
            <MultiSelectFilter
              options={MONTHS}
              selectedValues={selectedMonths}
              onChange={setSelectedMonths}
              placeholder="Select Months"
              allLabel="All Months"
            />
            <MultiSelectFilter
              options={YEAR_OPTIONS}
              selectedValues={selectedYears}
              onChange={setSelectedYears}
              placeholder="Select Years"
              allLabel="All Years"
            />
            <Button
              variant="outline" size="sm" className="h-8 text-sm px-3"
              onClick={() => {
                const now = new Date();
                setSelectedYears([now.getFullYear()]);
                setSelectedMonths([now.getMonth() + 1]);
              }}
            >
              Reset to Current
            </Button>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <SelectedFilterBadges
              options={MONTH_BADGES}
              selectedValues={selectedMonths}
              onRemove={(m) => setSelectedMonths(selectedMonths.filter(x => x !== m))}
              onClearAll={() => setSelectedMonths(ALL_MONTHS)}
            />
            <SelectedFilterBadges
              options={YEAR_OPTIONS}
              selectedValues={selectedYears}
              onRemove={(y) => setSelectedYears(selectedYears.filter(x => x !== y))}
              onClearAll={() => setSelectedYears(YEARS)}
            />
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <button onClick={() => setActiveTab('overview')} className="bg-purple-50 p-4 rounded-lg border border-purple-100 hover:border-purple-300 hover:shadow-md transition-all text-left w-full">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-600 mb-1">Total Children</p>
                <h2 className="text-2xl">{stats.totalChildren}</h2>
              </div>
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <Users className="w-5 h-5 text-purple-600" />
              </div>
            </div>
          </button>

          <button onClick={() => setActiveTab('bookings')} className="bg-blue-50 p-4 rounded-lg border border-blue-100 hover:border-blue-300 hover:shadow-md transition-all text-left w-full">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-600 mb-1">Lessons Scheduled</p>
                <h2 className="text-2xl">{stats.lessonsScheduled}</h2>
              </div>
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <Calendar className="w-5 h-5 text-blue-600" />
              </div>
            </div>
          </button>

          <button onClick={() => setActiveTab('progress')} className="bg-green-50 p-4 rounded-lg border border-green-100 hover:border-green-300 hover:shadow-md transition-all text-left w-full">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-600 mb-1">Completed Lessons</p>
                <h2 className="text-2xl">{stats.completedLessons}</h2>
              </div>
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <BookOpen className="w-5 h-5 text-green-600" />
              </div>
            </div>
          </button>

          <button onClick={() => setActiveTab('credits')} className="bg-yellow-50 p-4 rounded-lg border border-yellow-100 hover:border-yellow-300 hover:shadow-md transition-all text-left w-full">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-600 mb-1">Total Spent</p>
                <h2 className="text-2xl">{formatNaira(stats.totalSpent, false)}</h2>
              </div>
              <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
                <NairaIcon className="w-5 h-5 text-yellow-600" />
              </div>
            </div>
          </button>
        </div>
      </CardContent>
    </Card>
  );
}
