import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { 
  Upload, 
  FileText, 
  Download,
  Trash2,
  File,
  FileCheck,
  FileQuestion,
  Filter,
  Search,
} from 'lucide-react';
import { projectId } from '../utils/supabase/info';
import { toast } from 'sonner@2.0.3';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Textarea } from './ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from './ui/dialog';
import { Label } from './ui/label';

interface Document {
  id: string;
  title: string;
  description: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  filePath: string;
  bucketName: string;
  uploadedBy: string;
  uploadedByRole: string;
  documentType: 'assignment' | 'review' | 'resource' | 'other';
  relatedToId: string;
  relatedToType: string;
  createdAt: string;
  updatedAt: string;
}

interface Recipient {
  id: string;
  name: string;
  type: 'child' | 'tutor' | 'self';
}

interface DocumentManagerProps {
  session: any;
  userId: string;
  userRole: string;
  children?: { id: string; name?: string; full_name?: string; firstName?: string; lastName?: string }[];
}

export function DocumentManager({ session, userId, userRole, children = [] }: DocumentManagerProps) {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [filterType, setFilterType] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [bookedTutors, setBookedTutors] = useState<Recipient[]>([]);

  // Upload form state
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadDescription, setUploadDescription] = useState('');
  const [uploadDocType, setUploadDocType] = useState<'assignment' | 'review' | 'resource' | 'other'>('assignment');
  const [uploadRecipientId, setUploadRecipientId] = useState<string>('self');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadDocuments();
    if (userRole === 'parent') loadBookedTutors();
  }, [filterType]);

  const loadBookedTutors = async () => {
    try {
      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-cbd74580/bookings`,
        { headers: { 'Authorization': `Bearer ${session.access_token}` } }
      );
      if (!res.ok) return;
      const data = await res.json();
      const seen = new Set<string>();
      const tutors: Recipient[] = [];
      for (const b of (data.bookings || [])) {
        if (b.tutorId && !seen.has(b.tutorId)) {
          seen.add(b.tutorId);
          tutors.push({ id: b.tutorId, name: b.tutorName || 'Tutor', type: 'tutor' });
        }
      }
      setBookedTutors(tutors);
    } catch (_) {}
  };

  const loadDocuments = async () => {
    setLoading(true);
    
    try {
      let url = `https://${projectId}.supabase.co/functions/v1/make-server-cbd74580/documents`;
      
      if (filterType !== 'all') {
        url += `?documentType=${filterType}`;
      }

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setDocuments(data.documents || []);
      } else {
        console.error('Failed to load documents');
        toast.error('Failed to load documents');
      }
    } catch (error) {
      console.error('Error loading documents:', error);
      toast.error('Error loading documents');
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Check file size (25MB limit)
      if (file.size > 25 * 1024 * 1024) {
        toast.error('File size must be less than 25MB');
        return;
      }
      setUploadFile(file);
      setUploadTitle(file.name);
    }
  };

  const uploadDocument = async () => {
    if (!uploadFile) {
      toast.error('Please select a file');
      return;
    }

    if (!uploadTitle.trim()) {
      toast.error('Please enter a title');
      return;
    }

    setUploading(true);

    try {
      const formData = new FormData();
      formData.append('file', uploadFile);
      formData.append('title', uploadTitle);
      formData.append('description', uploadDescription);
      formData.append('documentType', uploadDocType);
      formData.append('uploadedByRole', userRole);
      formData.append('relatedToId', userId);
      formData.append('relatedToType', userRole);
      // Recipient: empty string means "myself only"
      formData.append('sharedWithId', uploadRecipientId === 'self' ? '' : uploadRecipientId);

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-cbd74580/documents/upload`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: formData,
        }
      );

      if (response.ok) {
        toast.success('Document uploaded successfully');
        setShowUploadDialog(false);
        resetUploadForm();
        loadDocuments();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to upload document');
      }
    } catch (error) {
      console.error('Error uploading document:', error);
      toast.error('Failed to upload document');
    } finally {
      setUploading(false);
    }
  };

  const downloadDocument = async (document: Document) => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-cbd74580/documents/${document.id}/download`,
        {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        
        // Open the signed URL in a new tab to trigger download
        window.open(data.downloadUrl, '_blank');
        toast.success('Download started');
      } else {
        toast.error('Failed to generate download link');
      }
    } catch (error) {
      console.error('Error downloading document:', error);
      toast.error('Failed to download document');
    }
  };

  const deleteDocument = async (documentId: string) => {
    if (!confirm('Are you sure you want to delete this document? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-cbd74580/documents/${documentId}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
          },
        }
      );

      if (response.ok) {
        toast.success('Document deleted successfully');
        loadDocuments();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to delete document');
      }
    } catch (error) {
      console.error('Error deleting document:', error);
      toast.error('Failed to delete document');
    }
  };

  const resetUploadForm = () => {
    setUploadFile(null);
    setUploadTitle('');
    setUploadDescription('');
    setUploadDocType('assignment');
    setUploadRecipientId('self');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const getDocumentIcon = (type: string) => {
    switch (type) {
      case 'assignment':
        return <FileCheck className="w-5 h-5 text-blue-600" />;
      case 'review':
        return <FileText className="w-5 h-5 text-green-600" />;
      case 'resource':
        return <File className="w-5 h-5 text-purple-600" />;
      default:
        return <FileQuestion className="w-5 h-5 text-gray-600" />;
    }
  };

  const getDocumentTypeBadge = (type: string) => {
    const colors = {
      assignment: 'bg-blue-100 text-blue-800',
      review: 'bg-green-100 text-green-800',
      resource: 'bg-purple-100 text-purple-800',
      other: 'bg-gray-100 text-gray-800',
    };
    
    return (
      <Badge className={colors[type as keyof typeof colors] || colors.other}>
        {type.charAt(0).toUpperCase() + type.slice(1)}
      </Badge>
    );
  };

  const filteredDocuments = documents.filter(doc => {
    if (!searchQuery) return true;
    const searchLower = searchQuery.toLowerCase();
    return (
      doc.title.toLowerCase().includes(searchLower) ||
      doc.description.toLowerCase().includes(searchLower) ||
      doc.fileName.toLowerCase().includes(searchLower)
    );
  });

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" style={{ color: '#625d9c' }} />
                Document Manager
              </CardTitle>
              <CardDescription>
                Upload and manage assignments, reviews, and resources
              </CardDescription>
            </div>
            <Button
              onClick={() => setShowUploadDialog(true)}
              className="text-white"
              style={{ backgroundColor: '#5d9827' }}
            >
              <Upload className="w-4 h-4 mr-2" />
              Upload Document
            </Button>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-3 mt-4">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search documents..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-[180px]">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Documents</SelectItem>
                <SelectItem value="assignment">Assignments</SelectItem>
                <SelectItem value="review">Reviews</SelectItem>
                <SelectItem value="resource">Resources</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>

        <CardContent>
          {loading ? (
            <div className="py-12 text-center text-gray-500">
              <FileText className="w-12 h-12 mx-auto mb-4 text-gray-300 animate-pulse" />
              <p>Loading documents...</p>
            </div>
          ) : filteredDocuments.length === 0 ? (
            <div className="py-12 text-center text-gray-500">
              <FileText className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p className="mb-1">No documents found</p>
              <p className="text-sm text-gray-400">
                {searchQuery || filterType !== 'all' 
                  ? 'Try adjusting your filters'
                  : 'Upload your first document to get started'
                }
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredDocuments.map((doc) => (
                <div
                  key={doc.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className="mt-1">
                      {getDocumentIcon(doc.documentType)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="truncate">{doc.title}</h4>
                        {getDocumentTypeBadge(doc.documentType)}
                      </div>
                      {doc.description && (
                        <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                          {doc.description}
                        </p>
                      )}
                      <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500">
                        <span className="truncate max-w-[200px]">{doc.fileName}</span>
                        <span>•</span>
                        <span>{formatFileSize(doc.fileSize)}</span>
                        <span>•</span>
                        <span>{new Date(doc.createdAt + 'T12:00:00+01:00').toLocaleDateString('en-GB', { timeZone: 'Africa/Lagos', day: 'numeric', month: 'short', year: 'numeric' })}</span>
                        {(doc as any).sharedWithId && (doc as any).sharedWithId !== '' && (
                          <>
                            <span>•</span>
                            <span className="text-purple-600 font-medium">
                              Shared
                            </span>
                          </>
                        )}
                        {doc.uploadedBy !== userId && (
                          <>
                            <span>•</span>
                            <span className="text-blue-600">Received</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => downloadDocument(doc)}
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Download
                    </Button>
                    {doc.uploadedBy === userId && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteDocument(doc.id)}
                        className="text-red-600 hover:text-red-800 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Upload Dialog */}
      <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upload Document</DialogTitle>
            <DialogDescription>
              Upload assignments, reviews, resources, or other documents (max 25MB)
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="file">File *</Label>
              <Input
                id="file"
                type="file"
                ref={fileInputRef}
                onChange={handleFileSelect}
                accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.jpg,.jpeg,.png,.gif"
              />
              {uploadFile && (
                <p className="text-sm text-gray-600 mt-1">
                  Selected: {uploadFile.name} ({formatFileSize(uploadFile.size)})
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                value={uploadTitle}
                onChange={(e) => setUploadTitle(e.target.value)}
                placeholder="Document title"
              />
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={uploadDescription}
                onChange={(e) => setUploadDescription(e.target.value)}
                placeholder="Brief description of the document"
                rows={3}
              />
            </div>

            <div>
              <Label htmlFor="docType">Document Type *</Label>
              <Select value={uploadDocType} onValueChange={(value: any) => setUploadDocType(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="assignment">Assignment</SelectItem>
                  <SelectItem value="review">Review</SelectItem>
                  <SelectItem value="resource">Resource</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Recipient selector — only shown when there are people to share with */}
            {(children.length > 0 || bookedTutors.length > 0) && (
              <div>
                <Label htmlFor="recipient">Share With</Label>
                <Select value={uploadRecipientId} onValueChange={setUploadRecipientId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select recipient" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="self">Myself only (private)</SelectItem>
                    {children.length > 0 && (
                      <>
                        <div className="px-2 py-1 text-xs text-gray-400 font-semibold uppercase tracking-wide">Children</div>
                        {children.map(child => (
                          <SelectItem key={child.id} value={child.id}>
                            {child.name || child.full_name || (child.firstName ? `${child.firstName} ${child.lastName || ''}`.trim() : 'Child')}
                          </SelectItem>
                        ))}
                      </>
                    )}
                    {bookedTutors.length > 0 && (
                      <>
                        <div className="px-2 py-1 text-xs text-gray-400 font-semibold uppercase tracking-wide">Tutors</div>
                        {bookedTutors.map(tutor => (
                          <SelectItem key={tutor.id} value={tutor.id}>
                            {tutor.name}
                          </SelectItem>
                        ))}
                      </>
                    )}
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-500 mt-1">
                  {uploadRecipientId === 'self'
                    ? 'Only you can see this document.'
                    : 'The selected person will be able to view and download this document. All sharing is monitored by admins.'}
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowUploadDialog(false);
                resetUploadForm();
              }}
              disabled={uploading}
            >
              Cancel
            </Button>
            <Button
              onClick={uploadDocument}
              disabled={!uploadFile || !uploadTitle.trim() || uploading}
              className="text-white"
              style={{ backgroundColor: '#5d9827' }}
            >
              <Upload className="w-4 h-4 mr-2" />
              {uploading ? 'Uploading...' : 'Upload'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
