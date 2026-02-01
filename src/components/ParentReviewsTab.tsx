import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Star, MessageSquare, AlertTriangle } from 'lucide-react';
import { ReviewsList } from './ReviewsList';
import { DisputeManager } from './DisputeManager';
import { RateSessionDialog } from './RateSessionDialog';

interface ParentReviewsTabProps {
  accessToken: string;
  parentId: string;
}

export function ParentReviewsTab({ accessToken, parentId }: ParentReviewsTabProps) {
  const [showRateDialog, setShowRateDialog] = useState(false);
  const [selectedSession, setSelectedSession] = useState<any>(null);

  // Mock sessions for demonstration - in production, fetch from backend
  const completedSessions = [
    {
      id: 'session_1',
      tutorId: 'tutor_123',
      tutorName: 'Sarah Johnson',
      parentId: parentId,
      studentId: 'student_456',
      subject: 'Mathematics',
      date: '2024-11-10',
      canReview: true,
    },
  ];

  const handleRateSession = (session: any) => {
    setSelectedSession(session);
    setShowRateDialog(true);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Reviews & Ratings</CardTitle>
          <CardDescription>
            Rate tutors and manage your feedback
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="my-reviews">
            <TabsList className="mb-4">
              <TabsTrigger value="my-reviews">
                <Star className="w-4 h-4 mr-2" />
                My Reviews
              </TabsTrigger>
              <TabsTrigger value="pending">
                <MessageSquare className="w-4 h-4 mr-2" />
                Pending Reviews
              </TabsTrigger>
              <TabsTrigger value="disputes">
                <AlertTriangle className="w-4 h-4 mr-2" />
                Disputes
              </TabsTrigger>
            </TabsList>

            <TabsContent value="my-reviews">
              <ReviewsList
                parentId={parentId}
                accessToken={accessToken}
                userRole="parent"
                currentUserId={parentId}
              />
            </TabsContent>

            <TabsContent value="pending">
              <Card>
                <CardHeader>
                  <CardTitle>Sessions to Review</CardTitle>
                  <CardDescription>
                    Rate your recent tutoring sessions within 7 days
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {completedSessions.length === 0 ? (
                    <div className="text-center py-12 text-gray-500">
                      <MessageSquare className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                      <p>No pending reviews</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {completedSessions.map((session) => (
                        <Card key={session.id}>
                          <CardContent className="pt-6">
                            <div className="flex items-center justify-between">
                              <div>
                                <h4 className="mb-1">{session.subject}</h4>
                                <p className="text-sm text-gray-600">with {session.tutorName}</p>
                                <p className="text-xs text-gray-500">
                                  {new Date(session.date).toLocaleDateString('en-GB', {
                                    day: 'numeric',
                                    month: 'long',
                                    year: 'numeric',
                                  })}
                                </p>
                              </div>
                              <Button
                                onClick={() => handleRateSession(session)}
                                className="text-white"
                                style={{ backgroundColor: '#625d9c' }}
                              >
                                <Star className="w-4 h-4 mr-2" />
                                Rate Session
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="disputes">
              <DisputeManager
                accessToken={accessToken}
                userId={parentId}
                userRole="parent"
              />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Rate Session Dialog */}
      {selectedSession && (
        <RateSessionDialog
          session={selectedSession}
          open={showRateDialog}
          onClose={() => {
            setShowRateDialog(false);
            setSelectedSession(null);
          }}
          onSuccess={() => {
            // Reload sessions or reviews
            console.log('Review submitted successfully');
          }}
          accessToken={accessToken}
        />
      )}
    </div>
  );
}
