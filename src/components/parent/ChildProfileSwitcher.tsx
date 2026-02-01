import React, { useState, useEffect } from 'react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { 
  User,
  Users,
  ChevronDown,
  Plus,
  Calendar,
  BookOpen,
  TrendingUp,
  CheckCircle2
} from 'lucide-react';

interface ChildProfile {
  id: string;
  firstName: string;
  lastName: string;
  age: number;
  yearGroup?: string;
  avatar?: string;
  upcomingSessions: number;
  completedSessions: number;
  currentProgress: number; // percentage
}

interface ChildProfileSwitcherProps {
  children: ChildProfile[];
  activeChildId: string | null;
  onSwitchChild: (childId: string) => void;
  onAddChild: () => void;
  subscriptionTier?: string; // Optional now, not used for limits
}

export function ChildProfileSwitcher({
  children,
  activeChildId,
  onSwitchChild,
  onAddChild,
  subscriptionTier
}: ChildProfileSwitcherProps) {
  const [isOpen, setIsOpen] = useState(false);
  const activeChild = children.find(c => c.id === activeChildId);

  return (
    <div className="relative">
      {/* Active Child Display */}
      <Card 
        className="p-4 cursor-pointer hover:border-[#625d9c] transition-colors"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-[#625d9c] bg-opacity-10 flex items-center justify-center">
              {activeChild ? (
                activeChild.avatar ? (
                  <img 
                    src={activeChild.avatar} 
                    alt={activeChild.firstName}
                    className="w-12 h-12 rounded-full object-cover"
                  />
                ) : (
                  <User className="w-6 h-6 text-[#625d9c]" />
                )
              ) : (
                <Users className="w-6 h-6 text-gray-400" />
              )}
            </div>
            <div>
              <p className="text-sm text-gray-600">Active Profile</p>
              <p className="font-medium">
                {activeChild ? `${activeChild.firstName} ${activeChild.lastName}` : 'Select a child'}
              </p>
              {activeChild && (
                <p className="text-xs text-gray-500">
                  Age {activeChild.age} {activeChild.yearGroup && `• Year ${activeChild.yearGroup}`}
                </p>
              )}
            </div>
          </div>
          <ChevronDown className={`w-5 h-5 text-gray-600 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </div>

        {activeChild && (
          <div className="flex gap-3 mt-3 pt-3 border-t">
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="w-4 h-4 text-blue-600" />
              <span className="text-gray-600">{activeChild.upcomingSessions} upcoming</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <CheckCircle2 className="w-4 h-4 text-green-600" />
              <span className="text-gray-600">{activeChild.completedSessions} completed</span>
            </div>
          </div>
        )}
      </Card>

      {/* Dropdown */}
      {isOpen && (
        <Card className="absolute top-full left-0 right-0 mt-2 p-2 z-50 shadow-lg max-h-96 overflow-y-auto">
          <div className="space-y-1">
            {children.map((child) => (
              <div
                key={child.id}
                className={`p-3 rounded cursor-pointer hover:bg-gray-50 transition-colors ${
                  child.id === activeChildId ? 'bg-[#625d9c] bg-opacity-10' : ''
                }`}
                onClick={() => {
                  onSwitchChild(child.id);
                  setIsOpen(false);
                }}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#625d9c] bg-opacity-10 flex items-center justify-center flex-shrink-0">
                    {child.avatar ? (
                      <img 
                        src={child.avatar} 
                        alt={child.firstName}
                        className="w-10 h-10 rounded-full object-cover"
                      />
                    ) : (
                      <User className="w-5 h-5 text-[#625d9c]" />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">
                        {child.firstName} {child.lastName}
                      </p>
                      {child.id === activeChildId && (
                        <Badge className="bg-[#625d9c] text-white text-xs">
                          Active
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-gray-600">
                      Age {child.age} {child.yearGroup && `• Year ${child.yearGroup}`}
                    </p>
                    <div className="flex gap-3 mt-1">
                      <span className="text-xs text-gray-500">
                        {child.upcomingSessions} upcoming
                      </span>
                      <span className="text-xs text-gray-500">
                        {child.currentProgress}% progress
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}

            <div className="border-t my-2" />
            <div
              className="p-3 rounded cursor-pointer hover:bg-gray-50 transition-colors flex items-center gap-2 text-[#5d9827]"
              onClick={() => {
                onAddChild();
                setIsOpen(false);
              }}
            >
              <Plus className="w-5 h-5" />
              <div>
                <p className="font-medium">Add Another Child</p>
                <p className="text-xs text-gray-600">
                  {children.length} child{children.length !== 1 ? 'ren' : ''} added
                </p>
              </div>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}