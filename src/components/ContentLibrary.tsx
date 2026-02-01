import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Card, CardHeader, CardTitle, CardDescription } from './ui/card';
import { SyllabusMapping } from './SyllabusMapping';
import { LessonTemplates } from './LessonTemplates';
import { ResourceUpload } from './ResourceUpload';
import { BookOpen, FileText, Upload } from 'lucide-react';

interface ContentLibraryProps {
  session: any;
  userRole: 'parent' | 'tutor';
}

export function ContentLibrary({ session, userRole }: ContentLibraryProps) {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Content Library & Lesson Planning</CardTitle>
          <CardDescription>
            Access curriculum-aligned content, create lesson plans, and manage resources
          </CardDescription>
        </CardHeader>
      </Card>

      <Tabs defaultValue="syllabus">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="syllabus" className="flex items-center gap-2">
            <BookOpen className="w-4 h-4" />
            Syllabus
          </TabsTrigger>
          <TabsTrigger value="templates" className="flex items-center gap-2">
            <FileText className="w-4 h-4" />
            Lesson Templates
          </TabsTrigger>
          <TabsTrigger value="resources" className="flex items-center gap-2">
            <Upload className="w-4 h-4" />
            Resources
          </TabsTrigger>
        </TabsList>

        <TabsContent value="syllabus" className="mt-6">
          <SyllabusMapping session={session} />
        </TabsContent>

        <TabsContent value="templates" className="mt-6">
          <LessonTemplates session={session} userRole={userRole} />
        </TabsContent>

        <TabsContent value="resources" className="mt-6">
          <ResourceUpload session={session} userRole={userRole} />
        </TabsContent>
      </Tabs>
    </div>
  );
}