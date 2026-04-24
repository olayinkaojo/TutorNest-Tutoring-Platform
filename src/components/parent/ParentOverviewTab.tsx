import { Users, Plus, Pencil } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Button } from '../ui/button';
import { StudentLoginManager } from '../StudentLoginManager';
import { PendingLinkRequests } from '../PendingLinkRequests';
import { UpcomingLessonsCard } from '../UpcomingLessonsCard';

const GRADE_MAP: Record<string, string> = {
  nursery_1: 'Nursery 1 (Pre-Primary)',   nursery_2: 'Nursery 2 (Pre-Primary)',
  nursery_3: 'Nursery 3 / Reception',     primary_1: 'Primary 1 (P1) – Year 1',
  primary_2: 'Primary 2 (P2) – Year 2',  primary_3: 'Primary 3 (P3) – Year 3',
  primary_4: 'Primary 4 (P4) – Year 4',  primary_5: 'Primary 5 (P5) – Year 5',
  primary_6: 'Primary 6 (P6) – Year 6',  secondary_7: 'JSS 1 (Junior Secondary 1) – Year 7',
  secondary_8: 'JSS 2 – Year 8',         secondary_9: 'JSS 3 – Year 9',
  secondary_10: 'SS 1 (Senior Secondary 1) – Year 10', secondary_11: 'SS 2 – Year 11',
  sixth_form_12: 'SS 3 – Year 12 / College', sixth_form_13: 'Post-Secondary',
};

function formatGradeLevel(gradeLevel: string): string {
  if (!gradeLevel) return '';
  return GRADE_MAP[gradeLevel] ?? gradeLevel.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
}

interface Child {
  id: string;
  firstName: string;
  lastName: string;
  gradeLevel: string;
  subjects?: string[];
  learningGoals?: string;
  completedLessons?: number;
  achievements?: unknown[];
}

interface Session {
  access_token: string;
}

interface ParentOverviewTabProps {
  children: Child[];
  loadingChildren: boolean;
  session: Session | null;
  activeChildId: string | null;
  setShowAddChildDialog: (show: boolean) => void;
  handleEditChild: (id: string) => void;
  loadChildren: () => void;
  onViewBookings: () => void;
}

export function ParentOverviewTab({
  children, loadingChildren, session, activeChildId,
  setShowAddChildDialog, handleEditChild, loadChildren, onViewBookings,
}: ParentOverviewTabProps) {
  return (
    <>
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Your Children</CardTitle>
          <CardDescription>Manage student profiles</CardDescription>
        </CardHeader>
        <CardContent>
          {loadingChildren ? (
            <div className="text-center py-12 text-gray-500">
              <Users className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p className="mb-4">Loading children...</p>
            </div>
          ) : children.length > 0 ? (
            <div className="space-y-4">
              <div className="flex justify-end mb-4">
                <Button
                  className="text-white"
                  style={{ backgroundColor: '#625d9c' }}
                  onClick={() => setShowAddChildDialog(true)}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Another Child
                </Button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {children.map((child) => (
                  <Card key={child.id} className="hover:shadow-lg transition-shadow">
                    <CardContent className="pt-6">
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <h3 className="mb-1">{child.firstName} {child.lastName}</h3>
                          <p className="text-sm text-gray-600">{formatGradeLevel(child.gradeLevel)}</p>
                        </div>
                        <Button variant="ghost" size="sm" onClick={() => handleEditChild(child.id)}>
                          <Pencil className="w-4 h-4 text-gray-500" />
                        </Button>
                      </div>
                      <div className="space-y-2">
                        <div>
                          <p className="text-xs text-gray-500">Subjects</p>
                          <p className="text-sm">{child.subjects?.join(', ') || 'None'}</p>
                        </div>
                        {child.learningGoals && (
                          <div>
                            <p className="text-xs text-gray-500">Learning Goals</p>
                            <p className="text-sm line-clamp-2">{child.learningGoals}</p>
                          </div>
                        )}
                        <div className="flex items-center justify-between mt-4 pt-4 border-t">
                          <div className="text-center">
                            <p className="text-lg">{child.completedLessons ?? 0}</p>
                            <p className="text-xs text-gray-500">Lessons</p>
                          </div>
                          <div className="text-center">
                            <p className="text-lg">{child.achievements?.length ?? 0}</p>
                            <p className="text-xs text-gray-500">Achievements</p>
                          </div>
                        </div>
                        {session && (
                          <div className="mt-4 pt-4 border-t">
                            <StudentLoginManager
                              child={child}
                              accessToken={session.access_token}
                              onUpdate={loadChildren}
                            />
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
              {session && (
                <div className="mt-6">
                  <PendingLinkRequests accessToken={session.access_token} onAccept={loadChildren} />
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500">
              <Users className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p className="mb-4">No children added yet</p>
              <Button
                className="text-white"
                style={{ backgroundColor: '#625d9c' }}
                onClick={() => setShowAddChildDialog(true)}
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Your First Child
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {session && (
        <UpcomingLessonsCard
          session={session}
          activeChildId={activeChildId}
          userRole="parent"
          onViewBookings={onViewBookings}
        />
      )}
    </>
  );
}
