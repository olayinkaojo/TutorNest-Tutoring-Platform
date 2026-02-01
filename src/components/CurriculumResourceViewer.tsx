import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import {
  FileText,
  Video,
  Download,
  BookOpen,
  ClipboardCheck,
  Presentation,
  FileSpreadsheet,
  Eye,
  Star,
  Clock,
  Users,
  CheckCircle2
} from 'lucide-react';

interface Resource {
  id: string;
  title: string;
  type: 'worksheet' | 'lesson_plan' | 'video' | 'quiz' | 'presentation' | 'reading';
  description: string;
  duration?: string;
  difficulty: 'easy' | 'medium' | 'hard';
  downloads: number;
  rating: number;
  fileSize?: string;
  format?: string;
  preview?: string;
  content?: string;
}

interface CurriculumResourceViewerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  topicTitle: string;
  topicDescription: string;
  resources: Resource[];
}

export function CurriculumResourceViewer({
  open,
  onOpenChange,
  topicTitle,
  topicDescription,
  resources
}: CurriculumResourceViewerProps) {
  const [selectedResource, setSelectedResource] = useState<Resource | null>(null);
  const [filterType, setFilterType] = useState<string>('all');

  const getResourceIcon = (type: Resource['type']) => {
    switch (type) {
      case 'worksheet':
        return <FileText className="w-5 h-5" />;
      case 'lesson_plan':
        return <BookOpen className="w-5 h-5" />;
      case 'video':
        return <Video className="w-5 h-5" />;
      case 'quiz':
        return <ClipboardCheck className="w-5 h-5" />;
      case 'presentation':
        return <Presentation className="w-5 h-5" />;
      case 'reading':
        return <FileSpreadsheet className="w-5 h-5" />;
      default:
        return <FileText className="w-5 h-5" />;
    }
  };

  const getResourceTypeLabel = (type: Resource['type']) => {
    const labels = {
      worksheet: 'Worksheet',
      lesson_plan: 'Lesson Plan',
      video: 'Video',
      quiz: 'Quiz',
      presentation: 'Presentation',
      reading: 'Reading Material'
    };
    return labels[type];
  };

  const getDifficultyColor = (difficulty: Resource['difficulty']) => {
    switch (difficulty) {
      case 'easy':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'hard':
        return 'bg-red-100 text-red-800 border-red-200';
    }
  };

  const filteredResources = filterType === 'all' 
    ? resources 
    : resources.filter(r => r.type === filterType);

  const handleDownload = (resource: Resource) => {
    // In a real implementation, this would download the actual file
    alert(`Downloading: ${resource.title}\nFormat: ${resource.format || 'PDF'}\nSize: ${resource.fileSize || '2.5 MB'}`);
  };

  const resourceTypes = [
    { value: 'all', label: 'All Resources', count: resources.length },
    { value: 'worksheet', label: 'Worksheets', count: resources.filter(r => r.type === 'worksheet').length },
    { value: 'lesson_plan', label: 'Lesson Plans', count: resources.filter(r => r.type === 'lesson_plan').length },
    { value: 'video', label: 'Videos', count: resources.filter(r => r.type === 'video').length },
    { value: 'quiz', label: 'Quizzes', count: resources.filter(r => r.type === 'quiz').length },
    { value: 'presentation', label: 'Presentations', count: resources.filter(r => r.type === 'presentation').length },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BookOpen className="w-6 h-6" style={{ color: '#625d9c' }} />
            {topicTitle}
          </DialogTitle>
          <DialogDescription>{topicDescription}</DialogDescription>
        </DialogHeader>

        <Tabs value={filterType} onValueChange={setFilterType} className="mt-4">
          <TabsList className="grid grid-cols-3 lg:grid-cols-6">
            {resourceTypes.map(type => type.count > 0 && (
              <TabsTrigger key={type.value} value={type.value} className="text-xs">
                {type.label} ({type.count})
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value={filterType} className="mt-6">
            {selectedResource ? (
              // Resource Detail View
              <div className="space-y-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedResource(null)}
                  className="mb-4"
                >
                  ← Back to Resources
                </Button>

                <Card>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          {getResourceIcon(selectedResource.type)}
                          <CardTitle>{selectedResource.title}</CardTitle>
                        </div>
                        <CardDescription>{selectedResource.description}</CardDescription>
                      </div>
                      <Badge
                        variant="outline"
                        className={getDifficultyColor(selectedResource.difficulty)}
                      >
                        {selectedResource.difficulty}
                      </Badge>
                    </div>

                    <div className="flex flex-wrap gap-4 mt-4 text-sm text-gray-600">
                      {selectedResource.duration && (
                        <div className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          {selectedResource.duration}
                        </div>
                      )}
                      <div className="flex items-center gap-1">
                        <Download className="w-4 h-4" />
                        {selectedResource.downloads} downloads
                      </div>
                      <div className="flex items-center gap-1">
                        <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                        {selectedResource.rating}/5
                      </div>
                      {selectedResource.fileSize && (
                        <div className="flex items-center gap-1">
                          <FileText className="w-4 h-4" />
                          {selectedResource.fileSize}
                        </div>
                      )}
                    </div>
                  </CardHeader>

                  <CardContent>
                    {/* Preview/Content */}
                    {selectedResource.type === 'video' && (
                      <div className="mb-6">
                        <div className="aspect-video bg-gray-100 rounded-lg flex items-center justify-center">
                          <div className="text-center">
                            <Video className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                            <p className="text-gray-600">Video Player</p>
                            <p className="text-sm text-gray-500">Duration: {selectedResource.duration}</p>
                          </div>
                        </div>
                      </div>
                    )}

                    {selectedResource.content && (
                      <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                        <h4 className="mb-3" style={{ color: '#625d9c' }}>Preview:</h4>
                        <div className="prose max-w-none text-sm whitespace-pre-line">
                          {selectedResource.content}
                        </div>
                      </div>
                    )}

                    {selectedResource.type === 'quiz' && (
                      <div className="mb-6">
                        <h4 className="mb-3" style={{ color: '#625d9c' }}>Quiz Overview:</h4>
                        <div className="space-y-2 text-sm">
                          <div className="flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4 text-green-600" />
                            <span>10 multiple choice questions</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4 text-green-600" />
                            <span>Automatic grading</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4 text-green-600" />
                            <span>Detailed explanations for each answer</span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-3">
                      <Button
                        onClick={() => handleDownload(selectedResource)}
                        className="flex-1"
                        style={{ backgroundColor: '#625d9c' }}
                      >
                        <Download className="w-4 h-4 mr-2" />
                        Download {selectedResource.format || 'PDF'}
                      </Button>
                      {selectedResource.type === 'quiz' && (
                        <Button
                          variant="outline"
                          className="flex-1"
                          style={{ borderColor: '#5d9827', color: '#5d9827' }}
                        >
                          <ClipboardCheck className="w-4 h-4 mr-2" />
                          Start Quiz
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            ) : (
              // Resource List View
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredResources.map(resource => (
                  <Card
                    key={resource.id}
                    className="hover:shadow-lg transition-shadow cursor-pointer"
                    onClick={() => setSelectedResource(resource)}
                  >
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3 flex-1">
                          <div
                            className="p-2 rounded-lg"
                            style={{ backgroundColor: '#f8f7fc' }}
                          >
                            {getResourceIcon(resource.type)}
                          </div>
                          <div className="flex-1">
                            <CardTitle className="text-base mb-1">
                              {resource.title}
                            </CardTitle>
                            <Badge variant="outline" className="text-xs mb-2">
                              {getResourceTypeLabel(resource.type)}
                            </Badge>
                            <CardDescription className="text-sm line-clamp-2">
                              {resource.description}
                            </CardDescription>
                          </div>
                        </div>
                      </div>
                    </CardHeader>

                    <CardContent>
                      <div className="flex items-center justify-between text-xs text-gray-600">
                        <div className="flex items-center gap-3">
                          {resource.duration && (
                            <div className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {resource.duration}
                            </div>
                          )}
                          <div className="flex items-center gap-1">
                            <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                            {resource.rating}
                          </div>
                        </div>
                        <Badge
                          variant="outline"
                          className={`text-xs ${getDifficultyColor(resource.difficulty)}`}
                        >
                          {resource.difficulty}
                        </Badge>
                      </div>

                      <div className="flex gap-2 mt-4">
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedResource(resource);
                          }}
                        >
                          <Eye className="w-3 h-3 mr-1" />
                          View
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDownload(resource);
                          }}
                          style={{ borderColor: '#5d9827', color: '#5d9827' }}
                        >
                          <Download className="w-3 h-3 mr-1" />
                          Download
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {filteredResources.length === 0 && (
              <div className="text-center py-12">
                <FileText className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                <h3 className="text-gray-600 mb-2">No resources found</h3>
                <p className="text-gray-500">Try selecting a different resource type</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
