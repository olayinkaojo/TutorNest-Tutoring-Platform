import { useState } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Alert, AlertDescription } from './ui/alert';
import { UserCircle, GraduationCap, BookOpen, Plus, ArrowRight, CheckCircle } from 'lucide-react';
import { projectId } from '../utils/supabase/info';

interface AddRoleCardProps {
  currentRole: string;
  availableRoles: string[];
  userId: string;
  accessToken: string;
  onRoleAdded: () => void;
}

export function AddRoleCard({ currentRole, availableRoles, userId, accessToken, onRoleAdded }: AddRoleCardProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Determine which roles can be added
  // Tutors can only become parents, not students
  // Parents can only become tutors, not students
  const canAddParent = currentRole !== 'parent' && !availableRoles.includes('parent');
  const canAddTutor = currentRole !== 'tutor' && !availableRoles.includes('tutor');
  const canAddStudent = currentRole === 'student' && !availableRoles.includes('tutor') && !availableRoles.includes('parent');

  // However, tutors can't become students and parents can't become students
  const shouldShowParent = canAddParent && currentRole !== 'parent';
  const shouldShowTutor = canAddTutor && currentRole !== 'tutor';
  const shouldShowStudent = canAddStudent;

  // If user already has all appropriate roles, don't show anything
  if (!shouldShowParent && !shouldShowTutor && !shouldShowStudent) {
    return null;
  }

  const handleAddRole = async (roleToAdd: 'parent' | 'tutor' | 'student') => {
    setIsAdding(true);
    setError(null);
    setSuccess(false);

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-cbd74580/role-management/add-role`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userId,
            newRole: roleToAdd,
            roleData: {
              // Basic data for the new role - will need to complete profile later
              name: '',
              createdVia: 'add_role_feature',
            },
          }),
        }
      );

      const data = await response.json();

      if (response.ok) {
        setSuccess(true);
        
        // Instead of redirecting to signup pages, just refresh to show the role switcher
        // Users can complete their profiles from their respective dashboards
        setTimeout(() => {
          onRoleAdded();
        }, 1500);
      } else {
        setError(data.error || 'Failed to add role');
      }
    } catch (err) {
      console.error('Error adding role:', err);
      setError('An error occurred while adding the role');
    } finally {
      setIsAdding(false);
    }
  };

  const roleCards = [];

  // Parent Role Card
  if (shouldShowParent) {
    roleCards.push({
      role: 'parent' as const,
      icon: UserCircle,
      color: '#625d9c',
      bgColor: 'bg-purple-50',
      borderColor: 'border-purple-200',
      title: 'Become a Parent on TutorNest',
      description: 'Find and book qualified tutors for your children',
      benefits: [
        'Search and book tutors',
        'Manage multiple children profiles',
        'Track learning progress',
        'Access subscription books and resources',
      ],
    });
  }

  // Tutor Role Card
  if (shouldShowTutor) {
    roleCards.push({
      role: 'tutor' as const,
      icon: GraduationCap,
      color: '#5d9827',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200',
      title: 'Become a Tutor on TutorNest',
      description: 'Share your knowledge and earn by teaching students',
      benefits: [
        'Set your own schedule and rates',
        'Connect with students globally',
        'Track your earnings and performance',
        'Access teaching resources and tools',
      ],
    });
  }

  // Student Role Card
  if (shouldShowStudent) {
    roleCards.push({
      role: 'student' as const,
      icon: BookOpen,
      color: '#2563eb',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200',
      title: 'Create a Student Profile',
      description: 'Access your personalized learning experience',
      benefits: [
        'Personalized learning dashboard',
        'Track your progress and achievements',
        'Access study resources',
        'Gamified learning experience',
      ],
    });
  }

  return (
    <div className="space-y-6">
      {/* Show special layout for tutors who can only become parents */}
      {currentRole === 'tutor' && shouldShowParent && (
        <>
          <div>
            <h3 className="text-lg mb-2">Expand Your TutorNest Experience</h3>
            <p className="text-sm text-gray-600">
              Become a parent to access additional features and manage your children&apos;s learning
            </p>
          </div>

          {success && (
            <Alert className="bg-green-50 border-green-200">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                <strong>Role added successfully!</strong> Redirecting you to complete your profile...
              </AlertDescription>
            </Alert>
          )}

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Large Parent Role Card for Tutors */}
          <Card className="border-purple-200 border-2 bg-purple-50">
            <CardHeader>
              <div className="flex items-start gap-4">
                <div 
                  className="p-4 rounded-lg"
                  style={{ backgroundColor: '#625d9c20' }}
                >
                  <UserCircle className="w-8 h-8" style={{ color: '#625d9c' }} />
                </div>
                <div className="flex-1">
                  <CardTitle className="text-xl" style={{ color: '#625d9c' }}>
                    Become a Parent on TutorNest
                  </CardTitle>
                  <CardDescription className="mt-2">
                    Find and book qualified tutors for your children
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="space-y-3">
                  {[
                    'Search and book tutors',
                    'Manage multiple children profiles',
                    'Track learning progress',
                    'Access subscription books and resources',
                  ].map((benefit, index) => (
                    <div key={index} className="flex items-start gap-3 text-sm">
                      <CheckCircle className="w-5 h-5 mt-0.5 flex-shrink-0" style={{ color: '#625d9c' }} />
                      <span className="text-gray-700">{benefit}</span>
                    </div>
                  ))}
                </div>

                <Button
                  onClick={() => handleAddRole('parent')}
                  disabled={isAdding || success}
                  className="w-full text-white mt-4 h-12 text-base"
                  style={{ backgroundColor: '#625d9c' }}
                >
                  {isAdding ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                      Adding Parent Role...
                    </>
                  ) : success ? (
                    <>
                      <CheckCircle className="w-5 h-5 mr-2" />
                      Parent Role Added
                    </>
                  ) : (
                    <>
                      <Plus className="w-5 h-5 mr-2" />
                      Become a Parent
                      <ArrowRight className="w-5 h-5 ml-2" />
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          <div className="text-sm text-gray-600 bg-gray-50 border border-gray-200 rounded-lg p-4">
            <strong>Note:</strong> You can easily switch between your tutor and parent roles at any time using the role switcher in the header.
          </div>
        </>
      )}

      {/* Show special layout for parents who can only become tutors */}
      {currentRole === 'parent' && shouldShowTutor && (
        <>
          <div>
            <h3 className="text-lg mb-2">Expand Your TutorNest Experience</h3>
            <p className="text-sm text-gray-600">
              Become a tutor to share your knowledge and earn by teaching students
            </p>
          </div>

          {success && (
            <Alert className="bg-green-50 border-green-200">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                <strong>Role added successfully!</strong> Redirecting you to complete your profile...
              </AlertDescription>
            </Alert>
          )}

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Large Tutor Role Card for Parents */}
          <Card className="border-green-200 border-2 bg-green-50">
            <CardHeader>
              <div className="flex items-start gap-4">
                <div 
                  className="p-4 rounded-lg"
                  style={{ backgroundColor: '#5d982720' }}
                >
                  <GraduationCap className="w-8 h-8" style={{ color: '#5d9827' }} />
                </div>
                <div className="flex-1">
                  <CardTitle className="text-xl" style={{ color: '#5d9827' }}>
                    Become a Tutor on TutorNest
                  </CardTitle>
                  <CardDescription className="mt-2">
                    Share your knowledge and earn by teaching students
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="space-y-3">
                  {[
                    'Set your own schedule and rates',
                    'Connect with students globally',
                    'Track your earnings and performance',
                    'Access teaching resources and tools',
                  ].map((benefit, index) => (
                    <div key={index} className="flex items-start gap-3 text-sm">
                      <CheckCircle className="w-5 h-5 mt-0.5 flex-shrink-0" style={{ color: '#5d9827' }} />
                      <span className="text-gray-700">{benefit}</span>
                    </div>
                  ))}
                </div>

                <Button
                  onClick={() => handleAddRole('tutor')}
                  disabled={isAdding || success}
                  className="w-full text-white mt-4 h-12 text-base"
                  style={{ backgroundColor: '#5d9827' }}
                >
                  {isAdding ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                      Adding Tutor Role...
                    </>
                  ) : success ? (
                    <>
                      <CheckCircle className="w-5 h-5 mr-2" />
                      Tutor Role Added
                    </>
                  ) : (
                    <>
                      <Plus className="w-5 h-5 mr-2" />
                      Become a Tutor
                      <ArrowRight className="w-5 h-5 ml-2" />
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          <div className="text-sm text-gray-600 bg-gray-50 border border-gray-200 rounded-lg p-4">
            <strong>Note:</strong> You can easily switch between your parent and tutor roles at any time using the role switcher in the header.
          </div>
        </>
      )}

      {/* Default layout for other roles (students) */}
      {currentRole !== 'tutor' && currentRole !== 'parent' && (
        <>
          <div>
            <h3 className="text-lg mb-2">Expand Your TutorNest Experience</h3>
            <p className="text-sm text-gray-600">
              Add additional roles to access more features on TutorNest
            </p>
          </div>

          {success && (
            <Alert className="bg-green-50 border-green-200">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                <strong>Role added successfully!</strong> Redirecting you to complete your profile...
              </AlertDescription>
            </Alert>
          )}

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="grid gap-4 md:grid-cols-2">
            {roleCards.map((card) => {
              const Icon = card.icon;
              
              return (
                <Card key={card.role} className={`${card.borderColor} border-2 ${card.bgColor}`}>
                  <CardHeader>
                    <div className="flex items-start gap-3">
                      <div 
                        className="p-3 rounded-lg"
                        style={{ backgroundColor: `${card.color}20` }}
                      >
                        <Icon className="w-6 h-6" style={{ color: card.color }} />
                      </div>
                      <div className="flex-1">
                        <CardTitle className="text-lg" style={{ color: card.color }}>
                          {card.title}
                        </CardTitle>
                        <CardDescription className="mt-1">
                          {card.description}
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="space-y-2">
                        {card.benefits.map((benefit, index) => (
                          <div key={index} className="flex items-start gap-2 text-sm">
                            <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: card.color }} />
                            <span className="text-gray-700">{benefit}</span>
                          </div>
                        ))}
                      </div>

                      <Button
                        onClick={() => handleAddRole(card.role)}
                        disabled={isAdding || success}
                        className="w-full text-white mt-4"
                        style={{ backgroundColor: card.color }}
                      >
                        {isAdding ? (
                          <>
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                            Adding Role...
                          </>
                        ) : success ? (
                          <>
                            <CheckCircle className="w-4 h-4 mr-2" />
                            Role Added
                          </>
                        ) : (
                          <>
                            <Plus className="w-4 h-4 mr-2" />
                            Add {card.role.charAt(0).toUpperCase() + card.role.slice(1)} Role
                            <ArrowRight className="w-4 h-4 ml-2" />
                          </>
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <div className="text-sm text-gray-600 bg-gray-50 border border-gray-200 rounded-lg p-4">
            <strong>Note:</strong> You can easily switch between your roles at any time using the role switcher in the header. 
            Each role has its own dashboard and features tailored to your needs.
          </div>
        </>
      )}
    </div>
  );
}