import { useState, useEffect, useRef } from 'react';
import { projectId } from '../utils/supabase/info';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Badge } from './ui/badge';
import { Alert, AlertDescription } from './ui/alert';
import { 
  Upload, 
  File,
  FileText,
  Image as ImageIcon,
  Download,
  Trash2,
  CheckCircle,
  AlertCircle,
  Eye,
  Lock,
  Clock,
  Shield
} from 'lucide-react';

interface ResourceUploadProps {
  session: any;
  userRole: 'parent' | 'tutor';
  sessionId?: string;
  studentId?: string;
}

interface Resource {
  id: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  uploadedBy: string;
  uploadedAt: string;
  sessionId?: string;
  studentId?: string;
  url: string;
  status: 'scanning' | 'approved' | 'rejected';
  accessControl: 'private' | 'student' | 'public';
  downloadCount: number;
  deletionScheduled?: string;
}

const ALLOWED_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export function ResourceUpload({ session, userRole, sessionId, studentId }: ResourceUploadProps) {
  const [resources, setResources] = useState<Resource[]>([]);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [accessControl, setAccessControl] = useState<'private' | 'student' | 'public'>('student');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchResources();
  }, [sessionId, studentId]);

  const fetchResources = async () => {
    setLoading(true);
    try {
      let url = `https://${projectId}.supabase.co/functions/v1/make-server-cbd74580/resources`;
      const params = new URLSearchParams();
      
      if (sessionId) params.append('sessionId', sessionId);
      if (studentId) params.append('studentId', studentId);
      
      if (params.toString()) url += `?${params.toString()}`;

      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setResources(data.resources || []);
      }
    } catch (err: any) {
      console.error('Error fetching resources:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const validateFile = (file: File): string | null => {
    const name = (file.name || '').toLowerCase();
    const ext = '.' + (name.split('.').pop() || '');
    const allowedExts = ['.pdf', '.jpg', '.jpeg', '.png', '.gif', '.webp', '.heic', '.heif'];
    const isAllowedExt = allowedExts.includes(ext);
    const isAllowedMime = file.type ? (ALLOWED_TYPES.includes(file.type) || file.type.startsWith('image/')) : false;

    // Check file type
    if (!isAllowedExt && !isAllowedMime) {
      return 'File type not allowed. Please upload PDF or image files (JPEG, PNG, GIF, WebP, HEIC).';
    }

    // Check file size
    if (file.size > MAX_FILE_SIZE) {
      return `File size exceeds maximum limit of ${MAX_FILE_SIZE / (1024 * 1024)}MB.`;
    }

    // Check file name
    if (file.name.length > 255) {
      return 'File name too long. Please rename the file.';
    }

    return null;
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      setSelectedFile(null);
      return;
    }

    setSelectedFile(file);
    setError('');
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setUploading(true);
    setError('');
    setUploadProgress(0);

    try {
      // Create FormData
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('accessControl', accessControl);
      if (sessionId) formData.append('sessionId', sessionId);
      if (studentId) formData.append('studentId', studentId);

      // Simulate progress (in real implementation, use XMLHttpRequest for progress tracking)
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => Math.min(prev + 10, 90));
      }, 200);

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-cbd74580/resources/upload`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
          body: formData,
        }
      );

      clearInterval(progressInterval);
      setUploadProgress(100);

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Upload failed');
      }

      const data = await response.json();

      if (data.status === 'rejected') {
        throw new Error('File failed security scan. Please ensure the file is safe and try again.');
      }

      setSuccess('File uploaded successfully! Performing security scan...');
      setSelectedFile(null);
      setUploadProgress(0);
      
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

      // Refresh resources
      await fetchResources();
      
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      console.error('Error uploading file:', err);
      setError(err.message);
      setUploadProgress(0);
    } finally {
      setUploading(false);
    }
  };

  const handleDownload = async (resource: Resource) => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-cbd74580/resources/${resource.id}/download`,
        {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Download failed');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = resource.fileName;
      a.click();
      window.URL.revokeObjectURL(url);

      // Refresh to update download count
      await fetchResources();
    } catch (err: any) {
      console.error('Error downloading file:', err);
      setError(err.message);
    }
  };

  const handleDelete = async (resourceId: string) => {
    if (!confirm('Are you sure you want to delete this resource?')) {
      return;
    }

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-cbd74580/resources/${resourceId}`,
        {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Delete failed');
      }

      setSuccess('Resource deleted successfully');
      await fetchResources();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      console.error('Error deleting resource:', err);
      setError(err.message);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const getFileIcon = (fileType: string) => {
    if (fileType === 'application/pdf') {
      return <FileText className="w-8 h-8 text-red-500" />;
    }
    if (fileType.startsWith('image/')) {
      return <ImageIcon className="w-8 h-8 text-blue-500" />;
    }
    return <File className="w-8 h-8 text-gray-500" />;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'scanning':
        return (
          <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
            <Shield className="w-3 h-3 mr-1" />
            Scanning
          </Badge>
        );
      case 'approved':
        return (
          <Badge style={{ backgroundColor: '#5d9827', color: 'white' }}>
            <CheckCircle className="w-3 h-3 mr-1" />
            Safe
          </Badge>
        );
      case 'rejected':
        return (
          <Badge variant="destructive">
            <AlertCircle className="w-3 h-3 mr-1" />
            Rejected
          </Badge>
        );
      default:
        return null;
    }
  };

  const getAccessBadge = (access: string) => {
    switch (access) {
      case 'private':
        return <Badge variant="outline"><Lock className="w-3 h-3 mr-1" />Private</Badge>;
      case 'student':
        return <Badge variant="secondary">Student Access</Badge>;
      case 'public':
        return <Badge variant="secondary">Public</Badge>;
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Upload className="w-8 h-8 animate-pulse mx-auto mb-4" style={{ color: '#625d9c' }} />
          <p className="text-gray-600">Loading resources...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {success && (
        <Alert className="bg-green-50 border-green-200">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">{success}</AlertDescription>
        </Alert>
      )}

      {error && (
        <Alert className="bg-red-50 border-red-200">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">{error}</AlertDescription>
        </Alert>
      )}

      {/* Upload Section - Tutors Only */}
      {userRole === 'tutor' && (
        <Card>
          <CardHeader>
            <CardTitle>Upload Resource</CardTitle>
            <CardDescription>
              Share lesson materials with your students
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,.gif,.webp"
                onChange={handleFileSelect}
                className="hidden"
                id="file-upload"
              />
              <label
                htmlFor="file-upload"
                className="flex items-center justify-center gap-2 w-full p-8 border-2 border-dashed border-gray-300 rounded-lg hover:border-purple-500 cursor-pointer transition-colors"
              >
                <Upload className="w-6 h-6 text-gray-400" />
                <div className="text-center">
                  <p className="text-sm font-medium">
                    {selectedFile ? selectedFile.name : 'Click to upload or drag and drop'}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    PDF or Images (JPEG, PNG, GIF, WebP) up to 10MB
                  </p>
                </div>
              </label>
            </div>

            {selectedFile && (
              <>
                <div>
                  <label className="text-sm font-medium mb-2 block">Access Control</label>
                  <select
                    value={accessControl}
                    onChange={(e) => setAccessControl(e.target.value as any)}
                    className="w-full p-2 border rounded-lg"
                  >
                    <option value="private">Private (Only me)</option>
                    <option value="student">Student Access (Linked students only)</option>
                    <option value="public">Public (All students)</option>
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    {accessControl === 'student' && sessionId && 'This resource will be tied to the current session'}
                    {accessControl === 'student' && studentId && 'This resource will be accessible to the selected student'}
                  </p>
                </div>

                {uploading && (
                  <div>
                    <div className="flex items-center justify-between mb-2 text-sm">
                      <span>Uploading...</span>
                      <span>{uploadProgress}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="h-2 rounded-full transition-all duration-300"
                        style={{
                          width: `${uploadProgress}%`,
                          backgroundColor: '#625d9c',
                        }}
                      />
                    </div>
                  </div>
                )}

                <Button
                  onClick={handleUpload}
                  disabled={uploading}
                  className="w-full text-white"
                  style={{ backgroundColor: '#5d9827' }}
                >
                  {uploading ? 'Uploading...' : (
                    <>
                      <Upload className="w-4 h-4 mr-2" />
                      Upload File
                    </>
                  )}
                </Button>
              </>
            )}

            {/* File Requirements */}
            <Alert className="bg-blue-50 border-blue-200">
              <Shield className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-blue-800 text-sm">
                <strong>Security:</strong> All files are automatically scanned for malware before being made
                available. Files that fail the scan will be rejected.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      )}

      {/* Resources List */}
      <Card>
        <CardHeader>
          <CardTitle>Resources</CardTitle>
          <CardDescription>
            {sessionId ? 'Session resources' : studentId ? 'Student resources' : 'All resources'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {resources.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <File className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>No resources available</p>
            </div>
          ) : (
            <div className="space-y-3">
              {resources.map((resource) => (
                <Card key={resource.id} className="bg-gray-50">
                  <CardContent className="pt-4">
                    <div className="flex items-start gap-4">
                      <div className="flex-shrink-0">
                        {getFileIcon(resource.fileType)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1 min-w-0">
                            <h4 className="text-sm truncate">{resource.fileName}</h4>
                            <p className="text-xs text-gray-500 mt-1">
                              {formatFileSize(resource.fileSize)} • 
                              Uploaded {new Date(resource.uploadedAt).toLocaleDateString()} • 
                              {resource.downloadCount} download{resource.downloadCount !== 1 ? 's' : ''}
                            </p>
                          </div>
                          <div className="flex gap-1 ml-2 flex-shrink-0">
                            {getStatusBadge(resource.status)}
                            {getAccessBadge(resource.accessControl)}
                          </div>
                        </div>

                        {resource.deletionScheduled && (
                          <Alert className="bg-amber-50 border-amber-200 mb-3">
                            <Clock className="h-3 w-3 text-amber-600" />
                            <AlertDescription className="text-amber-800 text-xs">
                              Scheduled for deletion on {new Date(resource.deletionScheduled).toLocaleDateString()}
                            </AlertDescription>
                          </Alert>
                        )}

                        {resource.status === 'approved' && (
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleDownload(resource)}
                            >
                              <Download className="w-3 h-3 mr-1" />
                              Download
                            </Button>
                            {userRole === 'tutor' && resource.uploadedBy === session.user.id && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-red-600 border-red-200 hover:bg-red-50"
                                onClick={() => handleDelete(resource.id)}
                              >
                                <Trash2 className="w-3 h-3 mr-1" />
                                Delete
                              </Button>
                            )}
                          </div>
                        )}

                        {resource.status === 'scanning' && (
                          <p className="text-xs text-amber-600">
                            Security scan in progress...
                          </p>
                        )}

                        {resource.status === 'rejected' && (
                          <Alert className="bg-red-50 border-red-200">
                            <AlertCircle className="h-3 w-3 text-red-600" />
                            <AlertDescription className="text-red-800 text-xs">
                              This file failed the security scan and cannot be downloaded.
                            </AlertDescription>
                          </Alert>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Retention Policy Info */}
      <Alert className="bg-gray-50 border-gray-200">
        <AlertCircle className="h-4 w-4 text-gray-600" />
        <AlertDescription className="text-gray-700 text-sm">
          <strong>Retention Policy:</strong> Resources are retained for 12 months after the last session.
          Private resources can be deleted at any time. Student resources are deleted when access is revoked.
        </AlertDescription>
      </Alert>
    </div>
  );
}