import { Users } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Button } from '../ui/button';
import { UpcomingLessonsCard } from '../UpcomingLessonsCard';
import { StudentProgressWidget } from '../StudentProgressWidget';

interface Student {
  id: string;
  full_name: string;
  totalLessons: number;
  upcomingLessons: number;
}

interface Session {
  access_token: string;
  user?: { id: string };
}

interface TutorOverviewTabProps {
  session: Session | null;
  students: Student[];
  loading: boolean;
  onViewBookings: () => void;
  onUpdateAvailability: () => void;
}

export function TutorOverviewTab({
  session, students, loading, onViewBookings, onUpdateAvailability,
}: TutorOverviewTabProps) {
  return (
    <>
      {session && (
        <div className="mb-8">
          <UpcomingLessonsCard
            session={session}
            activeChildId={null}
            userRole="tutor"
            onViewBookings={onViewBookings}
          />
        </div>
      )}

      <Card className="mb-8">
        <CardHeader>
          <CardTitle>My Students</CardTitle>
          <CardDescription>Manage your students and track their progress</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-12 text-gray-500">
              <Users className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p className="mb-4">Loading students...</p>
            </div>
          ) : students.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {students.map((student) => (
                <div key={student.id}>
                  {session && session.user?.id ? (
                    <StudentProgressWidget
                      tutorId={session.user.id}
                      studentId={student.id}
                      accessToken={session.access_token}
                      studentName={student.full_name}
                    />
                  ) : (
                    <div className="bg-white p-4 rounded-lg shadow-md">
                      <div className="flex items-center">
                        <Users className="w-8 h-8 mr-2 text-gray-500" />
                        <div>
                          <p className="text-sm font-bold">{student.full_name}</p>
                          <p className="text-xs text-gray-500">Lessons: {student.totalLessons}</p>
                          <p className="text-xs text-gray-500">Upcoming: {student.upcomingLessons}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500">
              <Users className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p className="mb-4">No students yet</p>
              <Button
                className="text-white"
                style={{ backgroundColor: '#625d9c' }}
                onClick={onUpdateAvailability}
              >
                Update Your Availability
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}
