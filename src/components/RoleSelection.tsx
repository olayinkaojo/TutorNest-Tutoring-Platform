import { useState } from 'react';
import { UserRole, UserProfile } from '../types';
import { projectId } from '../utils/supabase/info';
import { getSupabaseClient } from '../utils/supabase/client';
import { Button } from './ui/button';
import { Users, GraduationCap, BookOpen, AlertCircle, CheckCircle2, ArrowRight, LogOut } from 'lucide-react';
import { Alert, AlertDescription } from './ui/alert';
import KFALogo from './KFALogo';
import { ParentProfileForm } from './ParentProfileForm';
import { StudentProfileForm } from './StudentProfileForm';
import { TutorProfileForm } from './TutorProfileForm';

const supabase = getSupabaseClient();

interface RoleSelectionProps {
  session: any;
  currentProfile: UserProfile | null;
  onComplete: () => void;
  onTutorSelected?: () => void;
}

export function RoleSelection({ session, currentProfile, onComplete, onTutorSelected }: RoleSelectionProps) {
  const [selectedRole, setSelectedRole] = useState<UserRole>(currentProfile?.role || null);
  const [showProfileForm, setShowProfileForm] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const roles = [
    {
      value: 'parent' as UserRole,
      icon: Users,
      title: 'Parent',
      description: 'Manage your children\'s learning journey and track their progress',
      features: ['Track Progress', 'Book Tutors', 'Manage Subscriptions']
    },
    {
      value: 'student' as UserRole,
      icon: GraduationCap,
      title: 'Student',
      description: 'Access personalized lessons and track your academic achievements',
      features: ['Live Sessions', 'Performance Reports', 'Earn Rewards']
    },
    {
      value: 'tutor' as UserRole,
      icon: BookOpen,
      title: 'Tutor',
      description: 'Teach students, manage schedules, and track teaching outcomes',
      features: ['Accept Bookings', 'Earn Income', 'Build Reputation']
    },
  ];

  const handleRoleSelect = async () => {
    if (!selectedRole) {
      setError('Please select a role to continue.');
      return;
    }

    setError('');
    
    // For tutors, redirect to comprehensive tutor signup
    if (selectedRole === 'tutor' && onTutorSelected) {
      onTutorSelected();
      return;
    }
    
    setLoading(true);

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-cbd74580/profile`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ role: selectedRole }),
          signal: AbortSignal.timeout(15000),
        }
      );

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to set role');
      }

      // Show profile form
      setShowProfileForm(true);
    } catch (err: any) {
      console.error('Error setting role via edge function:', err);
      // Edge function unreachable or profile missing — update auth metadata directly
      // TypeError covers all browser-level fetch failures:
      //   Chrome → "Failed to fetch", Safari → "Load failed", Firefox → "NetworkError when attempting to fetch resource."
      const isNetworkError =
        err instanceof TypeError ||
        err.name === 'TimeoutError' ||
        err.name === 'AbortError' ||
        err.message === 'Profile not found';
      if (isNetworkError) {
        try {
          await supabase.auth.updateUser({ data: { role: selectedRole } });
          setShowProfileForm(true);
          return;
        } catch (fallbackErr: any) {
          console.error('Fallback role update failed:', fallbackErr);
        }
      }
      setError(err.message || 'An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (showProfileForm) {
    switch (selectedRole) {
      case 'parent':
        return <ParentProfileForm session={session} onComplete={onComplete} />;
      case 'student':
        return <StudentProfileForm session={session} onComplete={onComplete} />;
      case 'tutor':
        return <TutorProfileForm session={session} onComplete={onComplete} />;
      default:
        return null;
    }
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-green-50 flex items-center justify-center p-4 sm:p-6 md:p-8">
      <div className="w-full max-w-5xl">
        {/* Sign Out Button */}
        <div className="flex justify-end mb-4">
          <Button 
            variant="ghost" 
            onClick={handleSignOut}
            className="text-gray-600 hover:text-gray-800"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Sign Out
          </Button>
        </div>

        <div className="bg-white rounded-3xl shadow-2xl p-8 sm:p-10 border-4 border-purple-100">
          {/* Logo */}
          <div className="flex justify-center mb-8">
            <KFALogo />
          </div>

          {/* Important Notice Banner */}
          <div className="mb-8 p-6 bg-gradient-to-r from-purple-100 to-green-100 rounded-2xl border-2 border-purple-200">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#625d9c' }}>
                <AlertCircle className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="mb-2 text-purple-900">Action Required: Choose Your Account Type</h3>
                <p className="text-gray-700 text-sm leading-relaxed">
                  To access Knowledge Fons Academy, you need to define your role. Please select how you'll be using the platform below. 
                  This determines your dashboard features and available functionality.
                </p>
              </div>
            </div>
          </div>

          {/* Title */}
          <div className="text-center mb-8">
            <h1 className="mb-3">Choose Your Role</h1>
            <p className="text-gray-600 text-lg">Select the option that best describes you</p>
          </div>

          {/* Error Message */}
          {error && (
            <Alert className="mb-6 bg-red-50 border-red-300 border-2">
              <AlertCircle className="h-5 w-5 text-red-600" />
              <AlertDescription className="text-red-800">{error}</AlertDescription>
            </Alert>
          )}

          {/* Role Cards */}
          <div className="grid sm:grid-cols-3 gap-5 mb-8">
            {roles.map((role) => {
              const Icon = role.icon;
              const isSelected = selectedRole === role.value;
              return (
                <button
                  key={role.value}
                  onClick={() => setSelectedRole(role.value)}
                  className={`p-6 rounded-2xl border-3 transition-all text-left relative ${
                    isSelected
                      ? 'border-[#625d9c] bg-gradient-to-br from-purple-50 to-purple-100 shadow-xl scale-105'
                      : 'border-gray-300 hover:border-purple-400 hover:shadow-lg hover:scale-102 bg-white'
                  }`}
                  style={{
                    borderWidth: isSelected ? '3px' : '2px'
                  }}
                >
                  {/* Selection Indicator */}
                  {isSelected && (
                    <div className="absolute -top-3 -right-3 w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: '#5d9827' }}>
                      <CheckCircle2 className="w-5 h-5 text-white" />
                    </div>
                  )}

                  <div
                    className={`w-14 h-14 rounded-xl flex items-center justify-center mb-4 transition-all`}
                    style={{
                      backgroundColor: isSelected ? '#625d9c' : '#f3f4f6',
                      color: isSelected ? 'white' : '#4b5563'
                    }}
                  >
                    <Icon className="w-7 h-7" />
                  </div>
                  <h3 className="mb-2 text-xl">{role.title}</h3>
                  <p className="text-sm text-gray-600 mb-4 leading-relaxed">{role.description}</p>
                  
                  {/* Features List */}
                  <div className="space-y-2">
                    {role.features.map((feature, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-xs text-gray-600">
                        <CheckCircle2 className="w-3 h-3" style={{ color: isSelected ? '#5d9827' : '#9ca3af' }} />
                        <span>{feature}</span>
                      </div>
                    ))}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Helper Text */}
          <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4 mb-6">
            <p className="text-sm text-blue-900 text-center">
              💡 <strong>Note:</strong> You can add additional roles later. For example, parents can also become tutors.
            </p>
          </div>

          {/* Continue Button */}
          <Button
            onClick={handleRoleSelect}
            disabled={!selectedRole || loading}
            className="w-full h-14 text-white text-lg shadow-lg hover:shadow-xl transition-shadow"
            style={{ backgroundColor: selectedRole ? '#625d9c' : '#9ca3af' }}
          >
            {loading ? (
              'Please wait...'
            ) : selectedRole ? (
              <>
                Continue as {roles.find(r => r.value === selectedRole)?.title}
                <ArrowRight className="w-5 h-5 ml-2" />
              </>
            ) : (
              'Select a role to continue'
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}