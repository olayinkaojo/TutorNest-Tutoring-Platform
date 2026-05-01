import { User, Plus, Calendar, CheckCircle2 } from 'lucide-react';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';

interface ChildProfile {
  id: string;
  firstName: string;
  lastName: string;
  age: number;
  yearGroup?: string;
  avatar?: string;
  upcomingSessions: number;
  completedSessions: number;
  currentProgress: number;
}

interface ChildProfileSwitcherProps {
  children: ChildProfile[];
  activeChildId: string | null;
  onSwitchChild: (childId: string) => void;
  onAddChild: () => void;
  subscriptionTier?: string;
}

export function ChildProfileSwitcher({
  children,
  activeChildId,
  onSwitchChild,
  onAddChild,
}: ChildProfileSwitcherProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {children.map((child) => {
        const isActive = child.id === activeChildId;
        return (
          <Card
            key={child.id}
            className={`p-4 cursor-pointer transition-all select-none ${
              isActive
                ? 'border-2 border-[#625d9c] shadow-md bg-[#625d9c]/5'
                : 'border hover:border-[#625d9c]/60 hover:shadow-sm'
            }`}
            onClick={() => onSwitchChild(child.id)}
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                    isActive ? 'bg-[#625d9c] text-white' : 'bg-[#625d9c]/10'
                  }`}
                >
                  {child.avatar ? (
                    <img
                      src={child.avatar}
                      alt={child.firstName}
                      className="w-10 h-10 rounded-full object-cover"
                    />
                  ) : (
                    <User className={`w-5 h-5 ${isActive ? 'text-white' : 'text-[#625d9c]'}`} />
                  )}
                </div>
                <div>
                  <p className="font-medium leading-tight">
                    {child.firstName} {child.lastName}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Age {child.age}
                    {child.yearGroup ? ` • ${child.yearGroup}` : ''}
                  </p>
                </div>
              </div>
              {isActive && (
                <Badge className="bg-[#625d9c] text-white text-xs flex-shrink-0">Active</Badge>
              )}
            </div>
            <div className="flex gap-4 pt-3 border-t text-sm">
              <div className="flex items-center gap-1.5 text-blue-600">
                <Calendar className="w-3.5 h-3.5" />
                <span>{child.upcomingSessions} upcoming</span>
              </div>
              <div className="flex items-center gap-1.5 text-green-600">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>{child.completedSessions} done</span>
              </div>
            </div>
          </Card>
        );
      })}

      {/* Add Child card */}
      <Card
        className="p-4 cursor-pointer border-dashed border-2 hover:border-[#5d9827] hover:bg-green-50/40 transition-all flex flex-col items-center justify-center gap-2 min-h-[108px]"
        onClick={onAddChild}
      >
        <div className="w-10 h-10 rounded-full bg-[#5d9827]/10 flex items-center justify-center">
          <Plus className="w-5 h-5 text-[#5d9827]" />
        </div>
        <div className="text-center">
          <p className="font-medium text-[#5d9827] text-sm">Add Another Child</p>
          <p className="text-xs text-gray-500">
            {children.length} {children.length === 1 ? 'child' : 'children'} added
          </p>
        </div>
      </Card>
    </div>
  );
}
