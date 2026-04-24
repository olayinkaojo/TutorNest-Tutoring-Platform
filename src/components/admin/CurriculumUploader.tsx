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
  Download
} from 'lucide-react';
import { projectId } from '../../utils/supabase/info';

interface CurriculumUploaderProps {
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

export function CurriculumUploader({ accessToken }: CurriculumUploaderProps) {
  const [gradeLevel, setGradeLevel] = useState('');
  const [subject, setSubject] = useState('General');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [curricula, setCurricula] = useState<any[]>([]);
  const [loadingCurricula, setLoadingCurricula] = useState(true);
  const [selectedGradeForView, setSelectedGradeForView] = useState<string>('all');

  useEffect(() => {
    fetchAllCurricula();
  }, []);

  const fetchAllCurricula = async () => {
    setLoadingCurricula(true);
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-cbd74580/curriculum/all`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setCurricula(data.curricula || []);
      }
    } catch (error) {
      console.error('Error fetching curricula:', error);
    } finally {
      setLoadingCurricula(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type === 'application/pdf') {
        setSelectedFile(file);
        setUploadError(null);
        // Auto-fill title if empty
        if (!title) {
          setTitle(file.name.replace('.pdf', ''));
        }
      } else {
        setUploadError('Please select a PDF file');
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
      formData.append('title', title || selectedFile.name);
      formData.append('description', description);

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-cbd74580/curriculum/upload`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
          body: formData,
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Upload failed');
      }

      setUploadSuccess(true);
      // Reset form
      setSelectedFile(null);
      setTitle('');
      setDescription('');
      setGradeLevel('');
      setSubject('General');
      
      // Refresh curricula list
      fetchAllCurricula();

      // Clear success message after 3 seconds
      setTimeout(() => setUploadSuccess(false), 3000);
    } catch (err: any) {
      console.error('Upload error:', err);
      setUploadError(err.message || 'Failed to upload curriculum');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (curriculumId: string) => {
    if (!confirm('Are you sure you want to delete this curriculum? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-cbd74580/curriculum/${curriculumId}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        }
      );

      if (response.ok) {
        fetchAllCurricula();
      } else {
        const data = await response.json();
        alert(`Failed to delete: ${data.error}`);
      }
    } catch (error) {
      console.error('Delete error:', error);
      alert('Failed to delete curriculum');
    }
  };

  const formatGradeLevel = (level: string) => {
    return level.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase());
  };

  const filteredCurricula = selectedGradeForView === 'all'
    ? curricula
    : curricula.filter(c => c.gradeLevel === selectedGradeForView);

  return (
    <div className="space-y-6">
      {/* Upload Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5" style={{ color: '#625d9c' }} />
            Upload Curriculum PDF
          </CardTitle>
          <CardDescription>
            Upload curriculum documents for specific grade levels and subjects
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {uploadSuccess && (
            <Alert className="bg-green-50 border-green-200">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                Curriculum uploaded successfully!
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
            <div>
              <Label htmlFor="gradeLevel">Grade Level *</Label>
              <Select value={gradeLevel} onValueChange={setGradeLevel}>
                <SelectTrigger id="gradeLevel">
                  <SelectValue placeholder="Select grade level" />
                </SelectTrigger>
                <SelectContent>
                  {GRADE_LEVELS.map((level) => (
                    <SelectItem key={level.value} value={level.value}>
                      {level.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="subject">Subject</Label>
              <Select value={subject} onValueChange={setSubject}>
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
          </div>

          <div>
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Year 5 Mathematics Curriculum 2024"
            />
          </div>

          <div>
            <Label htmlFor="description">Description (Optional)</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of the curriculum content"
              rows={3}
            />
          </div>

          <div>
            <Label htmlFor="file">PDF File *</Label>
            <div className="mt-2">
              <input
                id="file"
                type="file"
                accept=".pdf"
                onChange={handleFileChange}
                className="hidden"
              />
              <label
                htmlFor="file"
                className="flex items-center justify-center w-full p-6 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-purple-400 transition-colors"
              >
                {selectedFile ? (
                  <div className="flex items-center gap-3">
                    <FileText className="w-8 h-8 text-green-600" />
                    <div className="text-left">
                      <p className="font-medium">{selectedFile.name}</p>
                      <p className="text-sm text-gray-500">
                        {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="text-center">
                    <Upload className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                    <p className="text-sm text-gray-600">
                      Click to select a PDF file
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      Maximum file size: 50MB
                    </p>
                  </div>
                )}
              </label>
            </div>
          </div>

          <Button
            onClick={handleUpload}
            disabled={!selectedFile || !gradeLevel || uploading}
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
                Upload Curriculum
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Curricula List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="w-5 h-5" style={{ color: '#5d9827' }} />
                Uploaded Curricula
              </CardTitle>
              <CardDescription>
                Manage curriculum documents by grade level
              </CardDescription>
            </div>
            <Select value={selectedGradeForView} onValueChange={setSelectedGradeForView}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Grades</SelectItem>
                {GRADE_LEVELS.map((level) => (
                  <SelectItem key={level.value} value={level.value}>
                    {level.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {loadingCurricula ? (
            <div className="text-center py-12">
              <Loader2 className="w-12 h-12 mx-auto mb-4 text-gray-300 animate-spin" />
              <p className="text-gray-500">Loading curricula...</p>
            </div>
          ) : filteredCurricula.length > 0 ? (
            <div className="space-y-3">
              {filteredCurricula.map((curriculum) => (
                <div
                  key={curriculum.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: '#625d9c20' }}
                    >
                      <FileText className="w-5 h-5" style={{ color: '#625d9c' }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-medium truncate">{curriculum.title}</p>
                        <Badge variant="outline" className="text-xs flex-shrink-0">
                          {formatGradeLevel(curriculum.gradeLevel)}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-3 text-sm text-gray-600">
                        <span className="truncate">{curriculum.subject}</span>
                        <span>•</span>
                        <span className="flex-shrink-0">
                          {(curriculum.fileSize / 1024 / 1024).toFixed(2)} MB
                        </span>
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(curriculum.id)}
                    className="flex-shrink-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500">
              <FileText className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>
                {selectedGradeForView === 'all'
                  ? 'No curricula uploaded yet'
                  : `No curricula for ${formatGradeLevel(selectedGradeForView)}`}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
