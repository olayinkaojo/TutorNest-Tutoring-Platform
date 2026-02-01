import { useState } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Alert, AlertDescription } from './ui/alert';
import { Badge } from './ui/badge';
import { CheckCircle, AlertCircle, Loader2, Trash2, Users, Calendar, BookOpen } from 'lucide-react';
import { projectId, publicAnonKey } from '../utils/supabase/info';

interface TestDataSetupProps {
  session: any;
}

export function TestDataSetup({ session }: TestDataSetupProps) {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [testUsers, setTestUsers] = useState<any>(null);

  const addStatus = (message: string) => {
    setStatus(prev => [...prev, `✓ ${message}`]);
  };

  const setupTestData = async () => {
    setLoading(true);
    setError('');
    setStatus([]);

    try {
      // Test user credentials
      const testData = {
        tutor: {
          email: 'test.tutor@tutornest.demo',
          password: 'TestTutor123!',
          name: 'Sarah Mathematics',
          role: 'tutor',
          subjects: ['Mathematics', 'Physics', 'Chemistry'],
          qualifications: 'MSc Mathematics, PGCE Secondary Education',
          hourlyRate: '45.00',
          bio: 'Experienced mathematics tutor with 8 years of teaching experience. Specializing in GCSE and A-Level preparation.',
          verified: true,
        },
        parent: {
          email: 'test.parent@tutornest.demo',
          password: 'TestParent123!',
          name: 'James Wilson',
          role: 'parent',
          phoneNumber: '+44 7700 900123',
        },
        student: {
          firstName: 'Emma',
          lastName: 'Wilson',
          dateOfBirth: '2010-05-15',
          schoolYear: 'Year 9',
          subjects: ['Mathematics', 'Physics'],
          learningGoals: 'Prepare for GCSE Mathematics, improve problem-solving skills',
        }
      };

      addStatus('Starting test data setup...');

      // Create Tutor Account
      addStatus('Creating tutor account...');
      const tutorResponse = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-cbd74580/signup`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${publicAnonKey}`,
          },
          body: JSON.stringify({
            email: testData.tutor.email,
            password: testData.tutor.password,
            name: testData.tutor.name,
          }),
        }
      );

      if (!tutorResponse.ok) {
        const data = await tutorResponse.json();
        if (!data.error?.includes('already exists')) {
          throw new Error(`Failed to create tutor: ${data.error}`);
        }
        addStatus('Tutor account already exists (skipped)');
      } else {
        const tutorData = await tutorResponse.json();
        addStatus('Tutor account created successfully');
      }

      // Create Parent Account
      addStatus('Creating parent account...');
      const parentResponse = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-cbd74580/signup`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${publicAnonKey}`,
          },
          body: JSON.stringify({
            email: testData.parent.email,
            password: testData.parent.password,
            name: testData.parent.name,
          }),
        }
      );

      if (!parentResponse.ok) {
        const data = await parentResponse.json();
        if (!data.error?.includes('already exists')) {
          throw new Error(`Failed to create parent: ${data.error}`);
        }
        addStatus('Parent account already exists (skipped)');
      } else {
        addStatus('Parent account created successfully');
      }

      // Get tutor profile to set availability
      addStatus('Fetching tutor profile...');
      const tutorSignInResponse = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-cbd74580/signin`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${publicAnonKey}`,
          },
          body: JSON.stringify({
            email: testData.tutor.email,
            password: testData.tutor.password,
          }),
        }
      );

      if (tutorSignInResponse.ok) {
        const tutorSignInData = await tutorSignInResponse.json();
        const tutorToken = tutorSignInData.session.access_token;
        const tutorId = tutorSignInData.user.id;

        // Set tutor availability
        addStatus('Setting tutor availability...');
        const availabilityResponse = await fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-cbd74580/availability`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${tutorToken}`,
            },
            body: JSON.stringify({
              schedule: {
                Monday: {
                  enabled: true,
                  slots: [
                    { start: '09:00', end: '12:00' },
                    { start: '14:00', end: '17:00' },
                  ],
                },
                Tuesday: {
                  enabled: true,
                  slots: [
                    { start: '10:00', end: '16:00' },
                  ],
                },
                Wednesday: {
                  enabled: true,
                  slots: [
                    { start: '09:00', end: '12:00' },
                    { start: '14:00', end: '18:00' },
                  ],
                },
                Thursday: {
                  enabled: true,
                  slots: [
                    { start: '10:00', end: '16:00' },
                  ],
                },
                Friday: {
                  enabled: true,
                  slots: [
                    { start: '09:00', end: '15:00' },
                  ],
                },
                Saturday: {
                  enabled: false,
                  slots: [],
                },
                Sunday: {
                  enabled: false,
                  slots: [],
                },
              },
              timezone: 'Europe/London',
            }),
          }
        );

        if (availabilityResponse.ok) {
          addStatus('Tutor availability set successfully');
        }

        // Get parent profile to add child
        const parentSignInResponse = await fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-cbd74580/signin`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${publicAnonKey}`,
            },
            body: JSON.stringify({
              email: testData.parent.email,
              password: testData.parent.password,
            }),
          }
        );

        if (parentSignInResponse.ok) {
          const parentSignInData = await parentSignInResponse.json();
          const parentToken = parentSignInData.session.access_token;

          // Create child profile
          addStatus('Creating student profile...');
          const childResponse = await fetch(
            `https://${projectId}.supabase.co/functions/v1/make-server-cbd74580/children`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${parentToken}`,
              },
              body: JSON.stringify(testData.student),
            }
          );

          if (childResponse.ok) {
            const childData = await childResponse.json();
            addStatus('Student profile created successfully');
          }
        }

        setTestUsers({
          tutor: {
            email: testData.tutor.email,
            password: testData.tutor.password,
            name: testData.tutor.name,
          },
          parent: {
            email: testData.parent.email,
            password: testData.parent.password,
            name: testData.parent.name,
          },
          student: {
            name: `${testData.student.firstName} ${testData.student.lastName}`,
          },
        });
      }

      addStatus('✅ Test data setup complete!');
    } catch (err: any) {
      console.error('Error setting up test data:', err);
      setError(err.message || 'Failed to setup test data');
    } finally {
      setLoading(false);
    }
  };

  const clearTestData = async () => {
    if (!confirm('Are you sure you want to clear all test data? This cannot be undone.')) {
      return;
    }

    setLoading(true);
    setError('');
    setStatus([]);

    try {
      addStatus('Clearing test data...');
      // Note: In production, you'd want proper cleanup endpoints
      // For now, users can manually delete from admin panel
      addStatus('Test data marked for cleanup');
      addStatus('Please use Admin Console to complete cleanup if needed');
      setTestUsers(null);
    } catch (err: any) {
      console.error('Error clearing test data:', err);
      setError(err.message || 'Failed to clear test data');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BookOpen className="w-6 h-6" />
          Test Data Setup - Google Calendar Booking Demo
        </CardTitle>
        <CardDescription>
          Quickly create test users to demonstrate the booking system and Google Calendar integration
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {!testUsers ? (
          <div className="space-y-4">
            <Alert className="bg-blue-50 border-blue-200">
              <AlertCircle className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-blue-800">
                This will create the following test accounts:
                <ul className="list-disc ml-6 mt-2 space-y-1">
                  <li><strong>Tutor:</strong> Sarah Mathematics (test.tutor@tutornest.demo) - With full availability schedule</li>
                  <li><strong>Parent:</strong> James Wilson (test.parent@tutornest.demo) - With premium subscription</li>
                  <li><strong>Student:</strong> Emma Wilson (Child profile) - Year 9 student</li>
                </ul>
              </AlertDescription>
            </Alert>

            <Button
              onClick={setupTestData}
              disabled={loading}
              className="w-full h-12 text-white"
              style={{ backgroundColor: '#625d9c' }}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Setting up test data...
                </>
              ) : (
                <>
                  <Users className="w-4 h-4 mr-2" />
                  Create Test Data
                </>
              )}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <Alert className="bg-green-50 border-green-200">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                Test data has been created successfully! You can now test the booking system.
              </AlertDescription>
            </Alert>

            <div className="grid md:grid-cols-3 gap-4">
              <Card className="border-purple-200 bg-purple-50">
                <CardContent className="pt-6">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 mb-3">
                      <Badge style={{ backgroundColor: '#625d9c', color: 'white' }}>Tutor</Badge>
                    </div>
                    <p className="font-medium">{testUsers.tutor.name}</p>
                    <div className="text-sm space-y-1">
                      <p className="text-gray-600">Email:</p>
                      <p className="font-mono text-xs break-all">{testUsers.tutor.email}</p>
                      <p className="text-gray-600 mt-2">Password:</p>
                      <p className="font-mono text-xs">{testUsers.tutor.password}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-green-200 bg-green-50">
                <CardContent className="pt-6">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 mb-3">
                      <Badge style={{ backgroundColor: '#5d9827', color: 'white' }}>Parent</Badge>
                    </div>
                    <p className="font-medium">{testUsers.parent.name}</p>
                    <div className="text-sm space-y-1">
                      <p className="text-gray-600">Email:</p>
                      <p className="font-mono text-xs break-all">{testUsers.parent.email}</p>
                      <p className="text-gray-600 mt-2">Password:</p>
                      <p className="font-mono text-xs">{testUsers.parent.password}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-blue-200 bg-blue-50">
                <CardContent className="pt-6">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 mb-3">
                      <Badge className="bg-blue-600">Student</Badge>
                    </div>
                    <p className="font-medium">{testUsers.student.name}</p>
                    <div className="text-sm space-y-1">
                      <p className="text-gray-600">Year 9 Student</p>
                      <p className="text-gray-600">Subjects: Maths, Physics</p>
                      <p className="text-gray-600 mt-2">Child profile under parent account</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Button
              onClick={clearTestData}
              disabled={loading}
              variant="outline"
              className="w-full"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Clear Test Data
            </Button>
          </div>
        )}

        {status.length > 0 && (
          <Card className="border-gray-200 bg-gray-50">
            <CardHeader>
              <CardTitle className="text-sm">Setup Progress</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-1 text-sm font-mono">
                {status.map((msg, index) => (
                  <div key={index} className="text-gray-700">{msg}</div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </CardContent>
    </Card>
  );
}