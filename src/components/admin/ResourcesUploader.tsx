import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Badge } from '../ui/badge';
import { Alert, AlertDescription } from '../ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import {
  Upload,
  FileText,
  Trash2,
  Loader2,
  CheckCircle,
  AlertCircle,
  BookOpen,
  Download,
  Lock,
  Globe,
  Eye
} from 'lucide-react';
import { projectId } from '../../utils/supabase/info';

interface ResourcesUploaderProps {
  accessToken: string;
}

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
  { value: 'all', label: 'All Year Groups' },
];

const SUBJECTS = [
  'General',
  'Mathematics',
  'English',
  'Science',
  'Physics',
  'Chemistry',
  'Biology',
  'History',
  'Geography',
  'Art',
  'Music',
  'Physical Education',
  'Computer Science',
  'Foreign Languages',
];

const RESOURCE_TYPES = [
  'Worksheet',
  'Practice Questions',
  'Study Guide',
  'Video Tutorial',
  'Interactive Activity',
  'Assessment',
  'Reference Material',
  'Other'
];

export function ResourcesUploader({ accessToken }: ResourcesUploaderProps) {
  const [gradeLevel, setGradeLevel] = useState('');
  const [subject, setSubject] = useState('General');
  const [resourceType, setResourceType] = useState('Worksheet');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [accessControl, setAccessControl] = useState<'public' | 'private'>('public');
  const [uploading, setUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [resources, setResources] = useState<any[]>([]);
  const [loadingResources, setLoadingResources] = useState(true);
  const [selectedGradeForView, setSelectedGradeForView] = useState<string>('all');

  useEffect(() => {
    fetchAllResources();
  }, []);

  const fetchAllResources = async () => {
    setLoadingResources(true);
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-cbd74580/admin/resources/all`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setResources(data.resources || []);
      }
    } catch (error) {
      console.error('Error fetching resources:', error);
    } finally {
      setLoadingResources(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/gif', 'image/webp'];
      if (allowedTypes.includes(file.type)) {
        setSelectedFile(file);
        setUploadError(null);
        // Auto-fill title if empty
        if (!title) {
          const fileNameWithoutExt = file.name.replace(/\.[^/.]+$/, '');
          setTitle(fileNameWithoutExt);
        }
      } else {
        setUploadError('Please select a PDF or image file (JPEG, PNG, GIF, WebP)');
        setSelectedFile(null);
      }
    }
  };

  const handleUpload = async () => {
    if (!selectedFile || !gradeLevel) {
      setUploadError('Please select a file and grade level');
      return;
    }

    setUploading(true);
    setUploadError(null);
    setUploadSuccess(false);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('gradeLevel', gradeLevel);
      formData.append('subject', subject);
      formData.append('resourceType', resourceType);
      formData.append('title', title || selectedFile.name);
      formData.append('description', description);
      formData.append('accessControl', accessControl);

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-cbd74580/admin/resources/upload`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
          body: formData,
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Upload failed');
      }

      const data = await response.json();
      setUploadSuccess(true);
      
      // Reset form
      setSelectedFile(null);
      setTitle('');
      setDescription('');
      setGradeLevel('');
      setSubject('General');
      setResourceType('Worksheet');
      
      // Reset file input
      const fileInput = document.getElementById('resource-file-upload') as HTMLInputElement;
      if (fileInput) {
        fileInput.value = '';
      }

      // Refresh resources list
      fetchAllResources();

      // Clear success message after 3 seconds
      setTimeout(() => {
        setUploadSuccess(false);
      }, 3000);
    } catch (error: any) {
      console.error('Upload error:', error);
      setUploadError(error.message || 'An error occurred during upload');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (resourceId: string) => {
    if (!confirm('Are you sure you want to delete this resource? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-cbd74580/admin/resources/${resourceId}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        }
      );

      if (response.ok) {
        fetchAllResources();
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to delete resource');
      }
    } catch (error) {
      console.error('Delete error:', error);
      alert('An error occurred while deleting the resource');
    }
  };

  const filteredResources = selectedGradeForView === 'all' 
    ? resources 
    : resources.filter(r => r.gradeLevel === selectedGradeForView);

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Upload Learning Resources</CardTitle>
          <CardDescription>
            Upload educational resources (PDFs, worksheets, study materials) that will be available to parents and students
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {uploadSuccess && (
            <Alert className="bg-green-50 border-green-200">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                Resource uploaded successfully!
              </AlertDescription>
            </Alert>
          )}

          {uploadError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{uploadError}</AlertDescription>
            </Alert>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="resource-file-upload">
                Select File <span className="text-red-500">*</span>
              </Label>
              <Input
                id="resource-file-upload"
                type="file"
                accept=".pdf,image/jpeg,image/png,image/gif,image/webp"
                onChange={handleFileChange}
                disabled={uploading}
              />
              <p className="text-xs text-gray-500">
                Accepted formats: PDF, JPEG, PNG, GIF, WebP (Max 10MB)
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="grade-level">
                Year Group <span className="text-red-500">*</span>
              </Label>
              <Select value={gradeLevel} onValueChange={setGradeLevel} disabled={uploading}>
                <SelectTrigger id="grade-level">
                  <SelectValue placeholder="Select year group" />
                </SelectTrigger>
                <SelectContent>
                  {GRADE_LEVELS.map((grade) => (
                    <SelectItem key={grade.value} value={grade.value}>
                      {grade.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="subject">Subject</Label>
              <Select value={subject} onValueChange={setSubject} disabled={uploading}>
                <SelectTrigger id="subject">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SUBJECTS.map((subj) => (
                    <SelectItem key={subj} value={subj}>
                      {subj}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="resource-type">Resource Type</Label>
              <Select value={resourceType} onValueChange={setResourceType} disabled={uploading}>
                <SelectTrigger id="resource-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {RESOURCE_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="access-control">Access Level</Label>
              <Select 
                value={accessControl} 
                onValueChange={(value) => setAccessControl(value as 'public' | 'private')} 
                disabled={uploading}
              >
                <SelectTrigger id="access-control">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="public">
                    <div className="flex items-center gap-2">
                      <Globe className="w-4 h-4" />
                      Public (All Users)
                    </div>
                  </SelectItem>
                  <SelectItem value="private">
                    <div className="flex items-center gap-2">
                      <Lock className="w-4 h-4" />
                      Subscribers Only
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="title">Resource Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Year 7 Algebra Worksheet"
              disabled={uploading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description (Optional)</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the resource content and learning objectives..."
              rows={3}
              disabled={uploading}
            />
          </div>

          {selectedFile && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <FileText className="w-8 h-8 text-blue-600" />
                <div className="flex-1">
                  <p className="text-sm">{selectedFile.name}</p>
                  <p className="text-xs text-gray-500">
                    {formatFileSize(selectedFile.size)}
                  </p>
                </div>
              </div>
            </div>
          )}

          <Button
            onClick={handleUpload}
            disabled={uploading || !selectedFile || !gradeLevel}
            className="w-full text-white"
            style={{ backgroundColor: '#625d9c' }}
          >
            {uploading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4 mr-2" />
                Upload Resource
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Existing Resources */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Uploaded Resources</CardTitle>
              <CardDescription>
                Manage all learning resources available on the platform
              </CardDescription>
            </div>
            <div className="w-48">
              <Select value={selectedGradeForView} onValueChange={setSelectedGradeForView}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {GRADE_LEVELS.map((grade) => (
                    <SelectItem key={grade.value} value={grade.value}>
                      {grade.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loadingResources ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
            </div>
          ) : filteredResources.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <BookOpen className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>No resources uploaded yet for this year group</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredResources.map((resource) => (
                <div
                  key={resource.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                >
                  <div className="flex items-center gap-4 flex-1">
                    <FileText className="w-10 h-10 text-blue-600" />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="text-sm">{resource.title}</h4>
                        {resource.accessControl === 'public' ? (
                          <Badge variant="outline" className="text-xs">
                            <Globe className="w-3 h-3 mr-1" />
                            Public
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-xs">
                            <Lock className="w-3 h-3 mr-1" />
                            Subscribers
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-gray-500">
                        <span>{GRADE_LEVELS.find(g => g.value === resource.gradeLevel)?.label}</span>
                        <span>•</span>
                        <span>{resource.subject}</span>
                        <span>•</span>
                        <span>{resource.resourceType}</span>
                        {resource.fileSize && (
                          <>
                            <span>•</span>
                            <span>{formatFileSize(resource.fileSize)}</span>
                          </>
                        )}
                      </div>
                      {resource.description && (
                        <p className="text-xs text-gray-600 mt-1 line-clamp-1">
                          {resource.description}
                        </p>
                      )}
                      <p className="text-xs text-gray-400 mt-1">
                        Uploaded: {new Date(resource.uploadedAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {resource.downloadCount !== undefined && (
                      <Badge variant="secondary" className="text-xs">
                        <Download className="w-3 h-3 mr-1" />
                        {resource.downloadCount}
                      </Badge>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(resource.id)}
                    >
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
