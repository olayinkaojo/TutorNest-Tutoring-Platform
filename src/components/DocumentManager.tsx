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
import { edgeFunctionBaseUrl, edgeFunctionHeaders } from '../utils/supabase-edge-fetch';
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
  uploadedByName?: string;
  documentType: 'assignment' | 'review' | 'resource' | 'other';
  relatedToId: string;
  relatedToType: string;
  sharedWithId?: string;
  sharedWithName?: string;
  sharedWithType?: string;
  /** Set when the current viewer is the recipient (not the uploader). */
  shareSourceSummary?: string;
  uploadedByRole?: string;
  createdAt: string;
  updatedAt: string;
}

interface Recipient {
  id: string;
  name: string;
  type: 'child' | 'tutor' | 'self' | 'parent' | 'student';
}

interface DocumentManagerProps {
  session: any;
  userId: string;
  userRole: string;
  /** Parent dashboard: child profile IDs so the server can include tutor→child shares */
  childIds?: string[];
  children?: { id: string; name?: string; full_name?: string; firstName?: string; lastName?: string }[];
}

function parseRecipientKey(key: string): { type: Recipient['type']; id: string } | null {
  if (key === 'self') return { type: 'self', id: '' };
  const idx = key.indexOf(':');
  if (idx < 1) return null;
  const type = key.slice(0, idx) as Recipient['type'];
  const id = key.slice(idx + 1);
  if (!id) return null;
  if (!['tutor', 'parent', 'student', 'child'].includes(type)) return null;
  return { type, id };
}

export function DocumentManager({ session, userId, userRole, childIds = [], children = [] }: DocumentManagerProps) {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [filterType, setFilterType] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [bookedTutors, setBookedTutors] = useState<Recipient[]>([]);
  const [bookedStudents, setBookedStudents] = useState<Recipient[]>([]);
  const [bookedParents, setBookedParents] = useState<Recipient[]>([]);
  const [bookedParentsForTutor, setBookedParentsForTutor] = useState<Recipient[]>([]);

  // Upload form state
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadDescription, setUploadDescription] = useState('');
  const [uploadDocType, setUploadDocType] = useState<'assignment' | 'review' | 'resource' | 'other'>('assignment');
  const [uploadRecipientId, setUploadRecipientId] = useState<string>('self');
  const [selectedRecipientName, setSelectedRecipientName] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const childIdsKey = childIds.join(',');

  useEffect(() => {
    loadDocuments();
    if (userRole === 'parent' || userRole === 'student') {
      void loadBookedTutors();
      if (userRole === 'student') void loadBookedParentsForStudent();
    } else if (userRole === 'tutor') {
      void loadBookedStudents();
      void loadBookedParentsForTutorFromBookings();
    }
  }, [filterType, userRole, childIdsKey, session?.access_token]);

  useEffect(() => {
    if (uploadRecipientId === 'self') {
      setSelectedRecipientName('');
      return;
    }
    const parsed = parseRecipientKey(uploadRecipientId);
    if (!parsed || parsed.type === 'self') {
      setSelectedRecipientName('');
      return;
    }
    if (parsed.type === 'child') {
      const c = children.find((x) => x.id === parsed.id);
      setSelectedRecipientName(
        c
          ? c.name || c.full_name || (c.firstName ? `${c.firstName} ${c.lastName || ''}`.trim() : 'Child')
          : '',
      );
      return;
    }
    const pool =
      parsed.type === 'tutor'
        ? bookedTutors
        : parsed.type === 'student'
          ? bookedStudents
          : [...bookedParents, ...bookedParentsForTutor];
    const hit = pool.find((r) => r.id === parsed.id);
    setSelectedRecipientName(hit?.name || '');
  }, [uploadRecipientId, children, bookedTutors, bookedStudents, bookedParents, bookedParentsForTutor]);

  /** Align with student dashboard: pending/upcoming sessions count as “active” for sharing & contacts */
  const ACTIVE = new Set(['confirmed', 'completed', 'scheduled', 'pending']);

  const loadBookedTutors = async () => {
    try {
      const res = await fetch(
        `${edgeFunctionBaseUrl()}/bookings?persona=${encodeURIComponent(userRole)}`,
        { headers: edgeFunctionHeaders(session.access_token) },
      );
      if (!res.ok) return;
      const data = await res.json();
      const seen = new Set<string>();
      const tutors: Recipient[] = [];
      for (const b of data.bookings || []) {
        if (!ACTIVE.has(String(b.status || '').toLowerCase())) continue;
        if (b.tutorId && b.tutorId !== userId && !seen.has(b.tutorId)) {
          seen.add(b.tutorId);
          const tutorName =
            b.tutorFullName ||
            b.tutorName ||
            (b.tutorFirstName ? `${b.tutorFirstName} ${b.tutorLastName || ''}`.trim() : 'Tutor');
          tutors.push({ id: b.tutorId, name: tutorName, type: 'tutor' });
        }
      }
      setBookedTutors(tutors);
    } catch (_) {}
  };

  const loadBookedParentsForStudent = async () => {
    try {
      const res = await fetch(
        `${edgeFunctionBaseUrl()}/bookings?persona=student`,
        { headers: edgeFunctionHeaders(session.access_token) },
      );
      if (!res.ok) return;
      const data = await res.json();
      const seen = new Set<string>();
      const parents: Recipient[] = [];
      for (const b of data.bookings || []) {
        if (!ACTIVE.has(String(b.status || '').toLowerCase())) continue;
        const pid = b.parentId ?? b.userId;
        if (pid && pid !== userId && !seen.has(pid)) {
          seen.add(pid);
          const name =
            b.parentName ||
            b.parentFullName ||
            (b.parentFirstName ? `${b.parentFirstName} ${b.parentLastName || ''}`.trim() : 'Parent / guardian');
          parents.push({ id: pid, name, type: 'parent' });
        }
      }
      setBookedParents(parents);
    } catch (_) {}
  };

  const loadBookedStudents = async () => {
    try {
      const res = await fetch(
        `${edgeFunctionBaseUrl()}/bookings?persona=tutor`,
        { headers: edgeFunctionHeaders(session.access_token) },
      );
      if (!res.ok) return;
      const data = await res.json();
      const seen = new Set<string>();
      const students: Recipient[] = [];
      for (const b of data.bookings || []) {
        if (!ACTIVE.has(String(b.status || '').toLowerCase())) continue;
        if (b.studentId && b.studentId !== userId && !seen.has(b.studentId)) {
          seen.add(b.studentId);
          const studentName =
            b.studentFullName ||
            b.studentName ||
            (b.studentFirstName ? `${b.studentFirstName} ${b.studentLastName || ''}`.trim() : 'Student');
          students.push({ id: b.studentId, name: studentName, type: 'student' });
        }
      }
      setBookedStudents(students);
    } catch (_) {}
  };

  const loadBookedParentsForTutorFromBookings = async () => {
    try {
      const res = await fetch(
        `${edgeFunctionBaseUrl()}/bookings?persona=tutor`,
        { headers: edgeFunctionHeaders(session.access_token) },
      );
      if (!res.ok) return;
      const data = await res.json();
      const seen = new Set<string>();
      const parents: Recipient[] = [];
      for (const b of data.bookings || []) {
        if (!ACTIVE.has(String(b.status || '').toLowerCase())) continue;
        const pid = b.parentId ?? b.userId;
        if (pid && pid !== userId && !seen.has(pid)) {
          seen.add(pid);
          const name =
            b.parentName ||
            b.parentFullName ||
            (b.parentFirstName ? `${b.parentFirstName} ${b.parentLastName || ''}`.trim() : 'Parent');
          parents.push({ id: pid, name, type: 'parent' });
        }
      }
      setBookedParentsForTutor(parents);
    } catch (_) {}
  };

  const loadDocuments = async () => {
    setLoading(true);

    try {
      const params = new URLSearchParams();
      if (filterType !== 'all') params.append('documentType', filterType);
      params.append('userRole', userRole);
      if (userRole === 'parent' && childIds.length > 0) {
        params.append('childIds', childIds.join(','));
      }
      const qs = params.toString();
      const url = `${edgeFunctionBaseUrl()}/documents${qs ? `?${qs}` : ''}`;

      const response = await fetch(url, {
        headers: edgeFunctionHeaders(session.access_token),
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

      // Validate file type: ONLY images, PDF, and safe documents
      const ALLOWED_MIME_TYPES = new Set([
        'application/pdf',                                                    // PDF
        'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp',  // Images
        'application/msword',                                                 // .doc
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',  // .docx
      ]);

      if (!ALLOWED_MIME_TYPES.has(file.type)) {
        toast.error('Only PDF, images (.jpg, .png, .gif, .webp), and documents (.doc, .docx) are allowed');
        return;
      }

      // Validate filename to prevent malicious files
      const fileName = file.name.toLowerCase();
      const dangerousExtensions = ['.exe', '.bat', '.cmd', '.sh', '.ps1', '.vbs', '.js', '.jar', '.zip', '.rar', '.7z', '.tar', '.gz'];
      const hasDangerousExt = dangerousExtensions.some(ext => fileName.endsWith(ext));
      
      if (hasDangerousExt) {
        toast.error('Executable and archive files are not allowed');
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

      const parsed = parseRecipientKey(uploadRecipientId);
      const sharedWithId = parsed && parsed.type !== 'self' ? parsed.id : '';
      const sharedWithType = parsed && parsed.type !== 'self' ? parsed.type : '';
      formData.append('sharedWithId', sharedWithId);
      formData.append('sharedWithType', sharedWithType);

      const response = await fetch(`${edgeFunctionBaseUrl()}/documents/upload`, {
        method: 'POST',
        headers: edgeFunctionHeaders(session.access_token),
        body: formData,
      });

      if (response.ok) {
        toast.success('Document uploaded successfully');
        setShowUploadDialog(false);
        resetUploadForm();
        loadDocuments();
      } else {
        let message = 'Failed to upload document';
        try {
          const err = await response.json();
          message = err.error || message;
        } catch {
          /* non-JSON body */
        }
        toast.error(message);
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
      const q = new URLSearchParams({ userRole });
      if (userRole === 'parent' && childIds.length) q.set('childIds', childIds.join(','));
      const response = await fetch(
        `${edgeFunctionBaseUrl()}/documents/${encodeURIComponent(document.id)}/download?${q.toString()}`,
        { headers: edgeFunctionHeaders(session.access_token) },
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
      const response = await fetch(`${edgeFunctionBaseUrl()}/documents/${encodeURIComponent(documentId)}`, {
        method: 'DELETE',
        headers: edgeFunctionHeaders(session.access_token),
      });

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
                Upload and manage learning materials. Files are stored securely; sharing is limited to people on your
                active sessions. Dates and sizes follow your device locale.
              </CardDescription>
            </div>
            <Button
              type="button"
              onClick={() => setShowUploadDialog(true)}
              className="text-white shrink-0"
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
                        <span>
                          {(() => {
                            if (!doc.createdAt) return '—';
                            const d = new Date(doc.createdAt.includes('T') ? doc.createdAt : `${doc.createdAt}T12:00:00Z`);
                            return isNaN(d.getTime()) ? '—' : d.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
                          })()}
                        </span>
                        {doc.sharedWithId && doc.sharedWithId !== '' && !!doc.sharedWithName?.trim() && (
                          <>
                            <span>•</span>
                            <span className="text-purple-600 font-medium">
                              Shared with {doc.sharedWithName.trim()}
                            </span>
                          </>
                        )}
                        {doc.shareSourceSummary && (
                          <>
                            <span>•</span>
                            <span className="text-blue-700 font-medium">{doc.shareSourceSummary}</span>
                          </>
                        )}
                        {doc.uploadedBy !== userId && doc.uploadedByName && !doc.shareSourceSummary && (
                          <>
                            <span>•</span>
                            <span className="text-blue-600">
                              Received from {doc.uploadedByName}
                              {doc.uploadedByRole
                                ? ` (${doc.uploadedByRole.charAt(0).toUpperCase()}${doc.uploadedByRole.slice(1).toLowerCase()})`
                                : ''}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => downloadDocument(doc)}
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Download
                    </Button>
                    {doc.uploadedBy === userId &&
                      String(doc.uploadedByRole || userRole).toLowerCase() === userRole && (
                        <Button
                          type="button"
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
              PDF, images, or Word documents up to 25&nbsp;MB. Choose who this file is for — only people linked through
              your sessions can receive shares.
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
                accept=".pdf,.jpg,.jpeg,.png,.gif,.webp,.doc,.docx"
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

            <div>
              <Label htmlFor="recipient">Who is this for?</Label>
              <Select value={uploadRecipientId} onValueChange={setUploadRecipientId}>
                <SelectTrigger id="recipient">
                  <SelectValue placeholder="Select recipient" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="self">Myself only (private)</SelectItem>
                  {userRole === 'parent' && children.length > 0 && (
                    <>
                      <div className="px-2 py-1 text-xs text-gray-400 font-semibold uppercase tracking-wide">
                        Children
                      </div>
                      {children.map((child) => (
                        <SelectItem key={child.id} value={`child:${child.id}`}>
                          {child.name ||
                            child.full_name ||
                            (child.firstName ? `${child.firstName} ${child.lastName || ''}`.trim() : 'Child')}
                        </SelectItem>
                      ))}
                    </>
                  )}
                  {(userRole === 'parent' || userRole === 'student') && bookedTutors.length > 0 && (
                    <>
                      <div className="px-2 py-1 text-xs text-gray-400 font-semibold uppercase tracking-wide">
                        Tutors
                      </div>
                      {bookedTutors.map((t) => (
                        <SelectItem key={t.id} value={`tutor:${t.id}`}>
                          {t.name}
                        </SelectItem>
                      ))}
                    </>
                  )}
                  {userRole === 'student' && bookedTutors.length === 0 && (
                    <div className="px-2 py-2 text-xs text-amber-800 bg-amber-50 rounded-md mx-1 my-1">
                      No tutors found from active sessions. After you or your parent books a session with you listed as
                      the student, tutors appear here for sharing.
                    </div>
                  )}
                  {userRole === 'student' && bookedParents.length > 0 && (
                    <>
                      <div className="px-2 py-1 text-xs text-gray-400 font-semibold uppercase tracking-wide">
                        Parent / guardian
                      </div>
                      {bookedParents.map((p) => (
                        <SelectItem key={p.id} value={`parent:${p.id}`}>
                          {p.name}
                        </SelectItem>
                      ))}
                    </>
                  )}
                  {userRole === 'tutor' && bookedStudents.length > 0 && (
                    <>
                      <div className="px-2 py-1 text-xs text-gray-400 font-semibold uppercase tracking-wide">
                        Students
                      </div>
                      {bookedStudents.map((s) => (
                        <SelectItem key={s.id} value={`student:${s.id}`}>
                          {s.name}
                        </SelectItem>
                      ))}
                    </>
                  )}
                  {userRole === 'tutor' && bookedParentsForTutor.length > 0 && (
                    <>
                      <div className="px-2 py-1 text-xs text-gray-400 font-semibold uppercase tracking-wide">
                        Parents
                      </div>
                      {bookedParentsForTutor.map((p) => (
                        <SelectItem key={p.id} value={`parent:${p.id}`}>
                          {p.name}
                        </SelectItem>
                      ))}
                    </>
                  )}
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-500 mt-1">
                {uploadRecipientId === 'self'
                  ? 'Only you can see this document in this role.'
                  : selectedRecipientName
                    ? `${selectedRecipientName} can view and download it. Shares are audit-logged.`
                    : 'Pick who should receive this file.'}
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
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
              type="button"
              onClick={() => void uploadDocument()}
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
