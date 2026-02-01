import { useState } from 'react';
import { Button } from './ui/button';
import { Sheet, SheetContent, SheetTrigger } from './ui/sheet';
import { Badge } from './ui/badge';
import {
  Menu,
  Home,
  Calendar,
  Users,
  BookOpen,
  MessageSquare,
  Bell,
  Settings,
  BarChart3,
  Trophy,
  FileText,
  Video,
  Search,
  CreditCard,
  Shield,
  Star,
  X
} from 'lucide-react';
import TutorNestLogo from './TutorNestLogo';

interface MobileNavigationProps {
  userType: 'student' | 'tutor' | 'parent' | 'admin';
  activeTab: string;
  onTabChange: (tab: string) => void;
  notificationCount?: number;
  messageCount?: number;
}

export function MobileNavigation({
  userType,
  activeTab,
  onTabChange,
  notificationCount = 0,
  messageCount = 0
}: MobileNavigationProps) {
  const [isOpen, setIsOpen] = useState(false);

  const getNavigationItems = () => {
    const commonItems = [
      { id: 'home', label: 'Home', icon: Home },
      { id: 'sessions', label: 'Sessions', icon: Video },
      { id: 'messages', label: 'Messages', icon: MessageSquare, badge: messageCount },
      { id: 'notifications', label: 'Notifications', icon: Bell, badge: notificationCount }
    ];

    const typeSpecificItems: Record<string, any[]> = {
      student: [
        { id: 'performance', label: 'Performance', icon: BarChart3 },
        { id: 'achievements', label: 'Achievements', icon: Trophy },
        { id: 'goals', label: 'Goals', icon: Star },
        { id: 'tutors', label: 'Find Tutors', icon: Search }
      ],
      tutor: [
        { id: 'students', label: 'My Students', icon: Users },
        { id: 'earnings', label: 'Earnings', icon: CreditCard },
        { id: 'schedule', label: 'Schedule', icon: Calendar },
        { id: 'resources', label: 'Resources', icon: BookOpen }
      ],
      parent: [
        { id: 'children', label: 'My Children', icon: Users },
        { id: 'tutors', label: 'Find Tutors', icon: Search },
        { id: 'bookings', label: 'Bookings', icon: Calendar },
        { id: 'reports', label: 'Reports', icon: FileText }
      ],
      admin: [
        { id: 'users', label: 'Users', icon: Users },
        { id: 'verification', label: 'Verification', icon: Shield },
        { id: 'analytics', label: 'Analytics', icon: BarChart3 },
        { id: 'activity', label: 'Activity', icon: Bell }
      ]
    };

    return [...commonItems, ...typeSpecificItems[userType]];
  };

  const navigationItems = getNavigationItems();

  const handleItemClick = (itemId: string) => {
    onTabChange(itemId);
    setIsOpen(false);
  };

  return (
    <>
      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 bg-white border-b z-50">
        <div className="flex items-center justify-between px-4 py-3">
          <TutorNestLogo />
          
          <div className="flex items-center gap-2">
            {/* Quick action badges */}
            {messageCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="relative"
                onClick={() => handleItemClick('messages')}
              >
                <MessageSquare className="w-5 h-5" />
                <Badge className="absolute -top-1 -right-1 w-5 h-5 flex items-center justify-center p-0 text-xs" style={{ backgroundColor: '#ef4444' }}>
                  {messageCount}
                </Badge>
              </Button>
            )}
            
            {notificationCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="relative"
                onClick={() => handleItemClick('notifications')}
              >
                <Bell className="w-5 h-5" />
                <Badge className="absolute -top-1 -right-1 w-5 h-5 flex items-center justify-center p-0 text-xs" style={{ backgroundColor: '#ef4444' }}>
                  {notificationCount}
                </Badge>
              </Button>
            )}

            {/* Menu trigger */}
            <Sheet open={isOpen} onOpenChange={setIsOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="sm">
                  <Menu className="w-5 h-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-80">
                <div className="flex flex-col h-full">
                  <div className="flex items-center justify-between mb-6">
                    <h3>Navigation</h3>
                    <Button variant="ghost" size="sm" onClick={() => setIsOpen(false)}>
                      <X className="w-5 h-5" />
                    </Button>
                  </div>

                  <nav className="flex-1 space-y-1">
                    {navigationItems.map((item) => {
                      const Icon = item.icon;
                      const isActive = activeTab === item.id;

                      return (
                        <button
                          key={item.id}
                          onClick={() => handleItemClick(item.id)}
                          className={`w-full flex items-center justify-between px-4 py-3 rounded-lg transition-colors ${
                            isActive
                              ? 'bg-purple-100 text-purple-900'
                              : 'hover:bg-gray-100'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <Icon className="w-5 h-5" style={{ color: isActive ? '#625d9c' : undefined }} />
                            <span>{item.label}</span>
                          </div>
                          {item.badge > 0 && (
                            <Badge style={{ backgroundColor: '#ef4444', color: 'white' }}>
                              {item.badge}
                            </Badge>
                          )}
                        </button>
                      );
                    })}
                  </nav>

                  <div className="pt-4 border-t">
                    <button
                      onClick={() => handleItemClick('settings')}
                      className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-gray-100"
                    >
                      <Settings className="w-5 h-5" />
                      <span>Settings</span>
                    </button>
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>

      {/* Bottom Navigation Bar - Fixed at bottom */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t z-50">
        <div className="grid grid-cols-5 gap-1 p-2">
          {navigationItems.slice(0, 5).map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;

            return (
              <button
                key={item.id}
                onClick={() => handleItemClick(item.id)}
                className={`flex flex-col items-center gap-1 py-2 px-1 rounded-lg transition-colors ${
                  isActive ? 'text-purple-900' : 'text-gray-600'
                }`}
                style={isActive ? { backgroundColor: '#625d9c20' } : {}}
              >
                <div className="relative">
                  <Icon className="w-5 h-5" style={{ color: isActive ? '#625d9c' : undefined }} />
                  {item.badge > 0 && (
                    <Badge className="absolute -top-2 -right-2 w-4 h-4 flex items-center justify-center p-0 text-xs" style={{ backgroundColor: '#ef4444' }}>
                      {item.badge}
                    </Badge>
                  )}
                </div>
                <span className="text-xs truncate w-full text-center">{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Spacer for fixed positioning */}
      <div className="lg:hidden h-16" /> {/* Top spacer */}
      <div className="lg:hidden h-16" /> {/* Bottom spacer */}
    </>
  );
}