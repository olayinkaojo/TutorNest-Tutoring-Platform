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
import { Tabs, TabsList, TabsTrigger } from '../ui/tabs';
import {
  Upload,
  Link as LinkIcon,
  FileText,
  Video,
  Trash2,
  Loader2,
  CheckCircle,
  AlertCircle,
  GraduationCap,
  Eye,
} from 'lucide-react';
import { projectId } from '../../utils/supabase/info';

interface TutorTrainingUploaderProps {
  accessToken: string;
}

const CATEGORIES = [
  'Platform Demo',
  'Onboarding',
  'Teaching Tips',
  'Policy & Compliance',
  'General',
];

export function TutorTrainingUploader({ accessToken }: TutorTrainingUploaderProps) {
  const [kind, setKind] = useState<'video' | 'link' | 'file'>('video');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Platform Demo');
  const [url, setUrl] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [resources, setResources] = useState<any[]>([]);
  const [loadingResources, setLoadingResources] = useState(true);

  useEffect(() => {
    fetchAllResources();
  }, []);

  const fetchAllResources = async () => {
    setLoadingResources(true);
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-cbd74580/tutor-training/all`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      if (response.ok) {
        const data = await response.json();
        setResources(data.resources || []);
      }
    } catch (error) {
      console.error('Error fetching tutor training resources:', error);
    } finally {
      setLoadingResources(false);
    }
  };

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setCategory('Platform Demo');
    setUrl('');
    setSelectedFile(null);
    const fileInput = document.getElementById('tutor-resource-file') as HTMLInputElement;
    if (fileInput) fileInput.value = '';
  };

  const handleUpload = async () => {
    if (!title.trim()) {
      setUploadError('Please enter a title');
      return;
    }
    if ((kind === 'video' || kind === 'link') && !url.trim()) {
      setUploadError('Please enter a link');
      return;
    }
    if (kind === 'file' && !selectedFile) {
      setUploadError('Please choose a file');
      return;
    }

    setUploading(true);
    setUploadError(null);
    setUploadSuccess(false);

    try {
      const formData = new FormData();
      formData.append('kind', kind);
      formData.append('title', title);
      formData.append('description', description);
      formData.append('category', category);
      if (kind === 'video' || kind === 'link') {
        formData.append('url', url.trim());
      } else if (selectedFile) {
        formData.append('file', selectedFile);
      }

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-cbd74580/tutor-training/upload`,
        { method: 'POST', headers: { Authorization: `Bearer ${accessToken}` }, body: formData }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Upload failed');
      }

      setUploadSuccess(true);
      resetForm();
      fetchAllResources();
      setTimeout(() => setUploadSuccess(false), 3000);
    } catch (error: any) {
      console.error('Upload error:', error);
      setUploadError(error.message || 'An error occurred during upload');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (resourceId: string) => {
    if (!confirm('Delete this resource? This cannot be undone.')) return;

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-cbd74580/tutor-training/${resourceId}`,
        { method: 'DELETE', headers: { Authorization: `Bearer ${accessToken}` } }
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

  const kindIcon = (k: string) => (k === 'video' ? Video : k === 'link' ? LinkIcon : FileText);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GraduationCap className="w-5 h-5" style={{ color: '#625d9c' }} />
            Tutor Training & Resources
          </CardTitle>
          <CardDescription>
            Demo recordings, onboarding material, and reference docs shown to every tutor in their dashboard's Resources tab.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {uploadSuccess && (
            <Alert className="bg-green-50 border-green-200">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">Resource added successfully!</AlertDescription>
            </Alert>
          )}
          {uploadError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{uploadError}</AlertDescription>
            </Alert>
          )}

          <Tabs value={kind} onValueChange={(v) => { setKind(v as any); setUploadError(null); }}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="video">
                <Video className="w-4 h-4 mr-2" />
                Video link
              </TabsTrigger>
              <TabsTrigger value="link">
                <LinkIcon className="w-4 h-4 mr-2" />
                Other link
              </TabsTrigger>
              <TabsTrigger value="file">
                <FileText className="w-4 h-4 mr-2" />
                Small file
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {(kind === 'video' || kind === 'link') && (
            <div className="space-y-2">
              <Label htmlFor="resource-url">
                {kind === 'video' ? 'Video link (YouTube Unlisted, Google Drive, Vimeo…)' : 'Link'} <span className="text-red-500">*</span>
              </Label>
              <Input
                id="resource-url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder={kind === 'video' ? 'https://youtu.be/…' : 'https://…'}
                disabled={uploading}
              />
              {kind === 'video' && (
                <p className="text-xs text-gray-500">
                  Recommended: upload to YouTube as <strong>Unlisted</strong> first — it streams reliably and needs no storage on our side. A Google Drive share link ("Anyone with the link can view") also works, but opens in a new tab instead of playing inline.
                </p>
              )}
            </div>
          )}

          {kind === 'file' && (
            <div className="space-y-2">
              <Label htmlFor="tutor-resource-file">
                File <span className="text-red-500">*</span>
              </Label>
              <Input
                id="tutor-resource-file"
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,.gif,.webp,application/pdf,image/*"
                onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                disabled={uploading}
              />
              <p className="text-xs text-gray-500">PDF or image, max 10MB. For anything larger (like a long video), use a video link instead.</p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="tutor-resource-title">
                Title <span className="text-red-500">*</span>
              </Label>
              <Input
                id="tutor-resource-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Platform Demonstration — September 2026"
                disabled={uploading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tutor-resource-category">Category</Label>
              <Select value={category} onValueChange={setCategory} disabled={uploading}>
                <SelectTrigger id="tutor-resource-category">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="tutor-resource-description">Description (optional)</Label>
            <Textarea
              id="tutor-resource-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What tutors will get from this…"
              rows={3}
              disabled={uploading}
            />
          </div>

          <Button
            onClick={handleUpload}
            disabled={uploading}
            className="w-full text-white"
            style={{ backgroundColor: '#625d9c' }}
          >
            {uploading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Adding…
              </>
            ) : (
              <>
                <Upload className="w-4 h-4 mr-2" />
                Add Resource
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Tutor Resources ({resources.length})</CardTitle>
          <CardDescription>Everything currently visible to tutors, newest first.</CardDescription>
        </CardHeader>
        <CardContent>
          {loadingResources ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
            </div>
          ) : resources.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <GraduationCap className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>Nothing added yet — tutors currently see an empty Resources tab.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {resources.map((resource) => {
                const Icon = kindIcon(resource.kind);
                return (
                  <div
                    key={resource.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                  >
                    <div className="flex items-center gap-4 flex-1 min-w-0">
                      <Icon className="w-8 h-8 flex-shrink-0" style={{ color: '#625d9c' }} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="text-sm truncate">{resource.title}</h4>
                          <Badge variant="outline" className="text-xs flex-shrink-0">{resource.category}</Badge>
                        </div>
                        {resource.description && (
                          <p className="text-xs text-gray-600 line-clamp-1">{resource.description}</p>
                        )}
                        <p className="text-xs text-gray-400 mt-1">
                          Added {new Date(resource.uploadedAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {resource.viewCount !== undefined && (
                        <Badge variant="secondary" className="text-xs">
                          <Eye className="w-3 h-3 mr-1" />
                          {resource.viewCount}
                        </Badge>
                      )}
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(resource.id)}>
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
