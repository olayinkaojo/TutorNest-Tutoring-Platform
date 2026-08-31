import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { BookOpen } from 'lucide-react';
import { CurriculumPDFViewer } from './CurriculumPDFViewer';

interface TutorCurriculumViewerProps {
  session: any;
}

// Same value/label set as the admin uploader (CurriculumUploader.tsx) — the
// server keys curriculum documents by these exact 'year_N' values, so this list
// has to stay in sync with that one for a tutor's selection to find anything.
const GRADE_LEVELS = [
  { value: 'year_1', label: 'Year 1 / Primary 1 (P1)' },
  { value: 'year_2', label: 'Year 2 / Primary 2 (P2)' },
  { value: 'year_3', label: 'Year 3 / Primary 3 (P3)' },
  { value: 'year_4', label: 'Year 4 / Primary 4 (P4)' },
  { value: 'year_5', label: 'Year 5 / Primary 5 (P5)' },
  { value: 'year_6', label: 'Year 6 / Primary 6 (P6)' },
  { value: 'year_7', label: 'Year 7 / JSS 1' },
  { value: 'year_8', label: 'Year 8 / JSS 2' },
  { value: 'year_9', label: 'Year 9 / JSS 3' },
  { value: 'year_10', label: 'Year 10 / SS 1' },
  { value: 'year_11', label: 'Year 11 / SS 2' },
  { value: 'year_12', label: 'Year 12 / SS 3' },
  { value: 'year_13', label: 'Year 13 / Post-Secondary' },
];

/** Read-only curriculum browser for tutors. Unlike a parent or student, a tutor
 *  isn't tied to one year group, so this lets them pick whichever one they want
 *  to check instead of being locked to a single gradeLevel. */
export function TutorCurriculumViewer({ session }: TutorCurriculumViewerProps) {
  const [gradeLevel, setGradeLevel] = useState('year_1');

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="w-5 h-5" style={{ color: '#625d9c' }} />
            Curriculum
          </CardTitle>
          <CardDescription>
            Browse the curriculum documents uploaded for each year group.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Label htmlFor="tutor-curriculum-grade">Year group</Label>
          <Select value={gradeLevel} onValueChange={setGradeLevel}>
            <SelectTrigger id="tutor-curriculum-grade" className="w-full sm:w-72 mt-1.5">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {GRADE_LEVELS.map((level) => (
                <SelectItem key={level.value} value={level.value}>
                  {level.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {session && <CurriculumPDFViewer gradeLevel={gradeLevel} accessToken={session.access_token} />}
    </div>
  );
}
