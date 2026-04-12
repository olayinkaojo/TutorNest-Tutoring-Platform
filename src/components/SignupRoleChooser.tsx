import { Users, GraduationCap, BookOpen } from 'lucide-react';
import TutorNestLogo from './TutorNestLogo';
import { Button } from './ui/button';
import { AuthBackground } from './AuthBackground';

interface SignupRoleChooserProps {
  onParentSelected: () => void;
  onStudentSelected: () => void;
  onTutorSelected: () => void;
  onBackToSignIn: () => void;
}

export function SignupRoleChooser({ 
  onParentSelected, 
  onStudentSelected, 
  onTutorSelected,
  onBackToSignIn 
}: SignupRoleChooserProps) {
  const roles = [
    {
      icon: Users,
      title: 'Parent',
      description: 'Manage your children\'s learning journey and track their progress',
      color: '#625d9c',
      onClick: onParentSelected,
    },
    {
      icon: GraduationCap,
      title: 'Student',
      description: 'Access personalized lessons and track your academic achievements',
      color: '#5d9827',
      onClick: onStudentSelected,
    },
    {
      icon: BookOpen,
      title: 'Tutor',
      description: 'Teach students, manage schedules, and earn income',
      color: '#625d9c',
      onClick: onTutorSelected,
    },
  ];

  return (
    <AuthBackground className="flex items-center justify-center p-4">
      <div className="w-full max-w-4xl">
        <div className="bg-white rounded-3xl shadow-xl p-6 sm:p-8">
          {/* Logo */}
          <div className="flex justify-center mb-6">
            <TutorNestLogo />
          </div>

          {/* Title */}
          <h1 className="text-center mb-2 text-gray-900">Join TutorNest</h1>
          <p className="text-center text-gray-600 mb-8">
            Choose how you want to get started
          </p>

          {/* Role Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {roles.map((role) => {
              const Icon = role.icon;
              return (
                <button
                  key={role.title}
                  onClick={role.onClick}
                  className="p-6 border-2 border-gray-200 rounded-2xl hover:border-[#625d9c] hover:shadow-lg transition-all text-left group"
                >
                  <div
                    className="w-12 h-12 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform"
                    style={{ backgroundColor: `${role.color}20` }}
                  >
                    <Icon className="w-6 h-6" style={{ color: role.color }} />
                  </div>
                  <h3 className="mb-2 text-gray-900">{role.title}</h3>
                  <p className="text-sm text-gray-600">{role.description}</p>
                </button>
              );
            })}
          </div>

          {/* Back to Sign In */}
          <div className="text-center text-sm">
            <span className="text-gray-600">Already have an account? </span>
            <button
              onClick={onBackToSignIn}
              className="hover:underline"
              style={{ color: '#625d9c' }}
            >
              Sign in
            </button>
          </div>
        </div>
      </div>
    </AuthBackground>
  );
}
