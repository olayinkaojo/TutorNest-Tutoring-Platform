import { useState } from 'react';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { UserCircle, GraduationCap, ChevronDown, Shield, BookOpen } from 'lucide-react';

interface RoleSwitcherProps {
  currentRole: string;
  availableRoles: string[];
  onRoleSwitch: (role: string) => void;
  userName?: string;
}

export function RoleSwitcher({ currentRole, availableRoles, onRoleSwitch, userName }: RoleSwitcherProps) {
  const [isOpen, setIsOpen] = useState(false);

  const roleIcons = {
    parent: UserCircle,
    tutor: GraduationCap,
    admin: Shield,
    student: BookOpen,
  };

  const roleLabels = {
    parent: 'Parent Mode',
    tutor: 'Tutor Mode',
    admin: 'Admin Mode',
    student: 'Student Mode',
  };

  const roleColors = {
    parent: '#625d9c',
    tutor: '#5d9827',
    admin: '#dc2626',
    student: '#2563eb',
  };

  // Filter available roles to only include supported roles
  const supportedRoles = availableRoles.filter(role => 
    roleIcons.hasOwnProperty(role)
  );

  // If current role is tutor, only allow switching to parent (not student)
  // If current role is parent, only allow switching to tutor (not student)
  const filteredRoles = currentRole === 'tutor' || currentRole === 'parent'
    ? supportedRoles.filter(role => role !== 'student')
    : supportedRoles;

  const CurrentIcon = roleIcons[currentRole as keyof typeof roleIcons] || UserCircle;

  if (filteredRoles.length <= 1) {
    return null; // Don't show switcher if user has only one role
  }

  return (
    <div className="relative">
      <Button
        variant="ghost"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors"
      >
        <CurrentIcon className="w-5 h-5" style={{ color: roleColors[currentRole as keyof typeof roleColors] || '#625d9c' }} />
        <div className="text-left">
          <div className="text-sm opacity-60">Viewing as</div>
          <div style={{ color: roleColors[currentRole as keyof typeof roleColors] || '#625d9c' }}>
            {roleLabels[currentRole as keyof typeof roleLabels] || currentRole}
          </div>
        </div>
        <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </Button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <Card className="absolute right-0 top-full mt-2 w-64 z-50 shadow-xl border-2">
            <CardContent className="p-2">
              <div className="mb-2 px-3 py-2 border-b">
                <div className="text-sm opacity-60">Switch role</div>
                {userName && <div className="mt-1">{userName}</div>}
              </div>
              {filteredRoles.map((role) => {
                const Icon = roleIcons[role as keyof typeof roleIcons] || UserCircle;
                const isActive = role === currentRole;
                
                return (
                  <button
                    key={role}
                    onClick={() => {
                      onRoleSwitch(role);
                      setIsOpen(false);
                    }}
                    className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg transition-all ${
                      isActive
                        ? 'bg-gray-100'
                        : 'hover:bg-gray-50'
                    }`}
                    disabled={isActive}
                  >
                    <Icon
                      className="w-6 h-6"
                      style={{ color: roleColors[role as keyof typeof roleColors] || '#625d9c' }}
                    />
                    <div className="flex-1 text-left">
                      <div style={{ color: roleColors[role as keyof typeof roleColors] || '#625d9c' }}>
                        {roleLabels[role as keyof typeof roleLabels] || role}
                      </div>
                      {isActive && (
                        <div className="text-sm text-gray-500 mt-0.5">Currently active</div>
                      )}
                    </div>
                    {isActive && (
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: roleColors[role as keyof typeof roleColors] || '#625d9c' }} />
                    )}
                  </button>
                );
              })}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}