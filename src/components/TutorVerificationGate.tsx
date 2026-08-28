import { useState, useEffect, useRef } from 'react';
import { projectId } from '../utils/supabase/info';
import { AvatarUpload } from './AvatarUpload';
import { Button } from './ui/button';
import { toast } from 'sonner';
import {
  CheckCircle2,
  Circle,
  Upload,
  FileText,
  Loader2,
  X,
  ShieldCheck,
  LogOut,
} from 'lucide-react';

const CERTIFICATE_DOCUMENT_TYPE = 'tutor_certificate';
const MAX_SIZE = 10 * 1024 * 1024; // 10MB
const ACCEPTED_EXTS = ['.pdf', '.png', '.jpg', '.jpeg', '.webp', '.heic', '.heif', '.doc', '.docx'];
const ACCEPTED_TYPES = [
  'application/pdf',
  'application/x-pdf',
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/pjpeg',
  'image/webp',
  'image/heic',
  'image/heif',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

const BASE = `https://${projectId}.supabase.co/functions/v1/make-server-cbd74580`;

interface TutorVerificationGateProps {
  session: any;
  profile: any;
  onComplete: () => void;
  onSignOut?: () => void;
}

type UploadedDoc = { id: string; title?: string; fileName: string; fileSize?: number };

const accepts = (file: File) => {
  const name = (file.name || '').toLowerCase();
  const ext = '.' + (name.split('.').pop() || '');
  if (ACCEPTED_EXTS.includes(ext)) return true;

  if (file.type) {
    const mime = file.type.toLowerCase();
    if (ACCEPTED_TYPES.includes(mime)) return true;
    if (mime.startsWith('image/') || mime === 'application/pdf' || mime.includes('word')) return true;
  }
  return false;
};

const formatSize = (bytes?: number) => {
  if (!bytes) return '';
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

export function TutorVerificationGate({ session, profile, onComplete, onSignOut }: TutorVerificationGateProps) {
  const tutorId = profile.id || profile.userId;
  const [photoUrl, setPhotoUrl] = useState<string>(profile.photoUrl || profile.photo_url || '');
  const [documents, setDocuments] = useState<UploadedDoc[]>([]);
  const [checking, setChecking] = useState(true);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const settledRef = useRef(false);

  // Older onboarding stored docs on the profile record rather than the document store.
  const onboardingDocs = profile.documents || {};
  const hasOnboardingDoc =
    !!onboardingDocs.idDocument ||
    !!onboardingDocs.dbsDocument ||
    (Array.isArray(onboardingDocs.certificates) && onboardingDocs.certificates.length > 0);

  const hasPhoto = !!photoUrl;
  const hasDocs = documents.length > 0 || hasOnboardingDoc;
  const complete = hasPhoto && hasDocs;

  const authHeaders = { Authorization: `Bearer ${session?.access_token}` };

  const loadDocuments = async () => {
    try {
      const res = await fetch(
        `${BASE}/documents?documentType=${CERTIFICATE_DOCUMENT_TYPE}&userRole=tutor`,
        { headers: authHeaders },
      );
      if (res.ok) {
        const data = await res.json();
        return (data.documents || []) as UploadedDoc[];
      }
    } catch (err) {
      console.error('Gate: failed to load documents', err);
    }
    return [];
  };

  // On mount, check completeness. If the tutor already has a photo + a document,
  // let them straight through so complete tutors never see the gate.
  useEffect(() => {
    if (!session?.access_token) return;

    // Already-verified tutors are never gated — they've been vetted already.
    const alreadyVerified = ['verified', 'approved'].includes(
      String(profile.verificationStatus || '').toLowerCase(),
    );
    if (alreadyVerified && !settledRef.current) {
      settledRef.current = true;
      onComplete();
      return;
    }

    let cancelled = false;
    (async () => {
      const docs = await loadDocuments();
      if (cancelled) return;
      setDocuments(docs);
      const photo = profile.photoUrl || profile.photo_url || '';
      if (photo && (docs.length > 0 || hasOnboardingDoc) && !settledRef.current) {
        settledRef.current = true;
        onComplete();
        return;
      }
      setChecking(false);
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.access_token]);

  const uploadDocuments = async (files: File[]) => {
    const valid = files.filter((f) => accepts(f) && f.size <= MAX_SIZE);
    const rejected = files.filter((f) => !accepts(f) || f.size > MAX_SIZE);
    if (rejected.length > 0) {
      toast.error(`Skipped ${rejected.length} file(s)`, {
        description: 'Only PDF, images (JPG, PNG, WebP, HEIC) or documents (DOC, DOCX) up to 10MB each are accepted.',
      });
    }
    if (valid.length === 0) return;

    setUploading(true);
    let ok = 0;
    for (const file of valid) {
      try {
        const form = new FormData();
        form.append('file', file);
        form.append('title', file.name);
        form.append('description', 'Tutor verification document');
        form.append('documentType', CERTIFICATE_DOCUMENT_TYPE);
        form.append('uploadedByRole', 'tutor');
        form.append('relatedToId', tutorId);
        form.append('relatedToType', 'tutor');
        const res = await fetch(`${BASE}/documents/upload`, {
          method: 'POST',
          headers: authHeaders,
          body: form,
        });
        if (res.ok) ok++;
        else {
          const e = await res.json().catch(() => ({}));
          console.error('Gate upload failed', e);
        }
      } catch (err) {
        console.error('Gate upload error', err);
      }
    }
    setUploading(false);
    setDocuments(await loadDocuments());
    if (ok > 0) toast.success(`Uploaded ${ok} document${ok === 1 ? '' : 's'}`);
    else toast.error('Upload failed. Please try again.');
  };

  const deleteDocument = async (id: string) => {
    try {
      const res = await fetch(`${BASE}/documents/${id}`, { method: 'DELETE', headers: authHeaders });
      if (res.ok) setDocuments((prev) => prev.filter((d) => d.id !== id));
    } catch (err) {
      console.error('Gate delete error', err);
    }
  };

  const displayName = profile.full_name || profile.firstName || profile.name || 'there';

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-[#625d9c] animate-spin mx-auto mb-3" />
          <p className="text-sm text-gray-500">Checking your registration…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-8 sm:py-12">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-[#f0edfb] mb-3">
            <ShieldCheck className="w-7 h-7 text-[#625d9c]" />
          </div>
          <h1 className="text-2xl font-semibold text-gray-900">Complete your registration</h1>
          <p className="text-sm text-gray-600 mt-2 max-w-md mx-auto">
            Welcome, {displayName}! Before you can access your dashboard, please add your profile
            photo and at least one document (an ID or a qualification certificate). This is required
            for verification.
          </p>
        </div>

        {/* Checklist */}
        <div className="flex items-center justify-center gap-6 mb-6 text-sm">
          <span className={`inline-flex items-center gap-1.5 ${hasPhoto ? 'text-green-600' : 'text-gray-400'}`}>
            {hasPhoto ? <CheckCircle2 className="w-4 h-4" /> : <Circle className="w-4 h-4" />}
            Profile photo
          </span>
          <span className={`inline-flex items-center gap-1.5 ${hasDocs ? 'text-green-600' : 'text-gray-400'}`}>
            {hasDocs ? <CheckCircle2 className="w-4 h-4" /> : <Circle className="w-4 h-4" />}
            At least one document
          </span>
        </div>

        {/* Photo */}
        <div className="rounded-xl border border-gray-200 bg-white p-5 mb-4">
          <div className="flex items-center gap-2 mb-3">
            {hasPhoto ? <CheckCircle2 className="w-5 h-5 text-green-600" /> : <Circle className="w-5 h-5 text-gray-300" />}
            <h2 className="font-medium text-gray-900">Profile photo</h2>
          </div>
          <div className="flex items-center gap-4">
            <AvatarUpload
              session={session}
              photoUrl={photoUrl}
              name={displayName}
              size="lg"
              onUploaded={(url) => setPhotoUrl(url)}
            />
            <div className="text-sm text-gray-600">
              <p>{hasPhoto ? 'Photo added.' : 'Click the avatar to upload a clear headshot.'}</p>
              <p className="text-xs text-gray-400 mt-0.5">JPG, PNG or WebP, up to 5MB.</p>
            </div>
          </div>
        </div>

        {/* Documents */}
        <div className="rounded-xl border border-gray-200 bg-white p-5 mb-6">
          <div className="flex items-center gap-2 mb-3">
            {hasDocs ? <CheckCircle2 className="w-5 h-5 text-green-600" /> : <Circle className="w-5 h-5 text-gray-300" />}
            <h2 className="font-medium text-gray-900">Documents &amp; certificates</h2>
          </div>

          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="w-full border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-[#625d9c] transition-colors disabled:opacity-60"
          >
            {uploading ? (
              <Loader2 className="w-6 h-6 text-[#625d9c] animate-spin mx-auto" />
            ) : (
              <Upload className="w-6 h-6 text-[#625d9c] mx-auto" />
            )}
            <p className="text-sm font-medium text-gray-700 mt-2">
              {uploading ? 'Uploading…' : 'Upload documents'}
            </p>
            <p className="text-xs text-gray-500 mt-1">PDF, JPG, PNG, WebP, HEIC or DOC up to 10MB each. You can add several.</p>
          </button>
          <input
            ref={fileRef}
            type="file"
            accept=".pdf,.png,.jpg,.jpeg,.webp,.heic,.heif,.doc,.docx,application/pdf,image/*,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            multiple
            className="hidden"
            onChange={(e) => {
              const files = Array.from(e.target.files || []);
              e.target.value = '';
              void uploadDocuments(files);
            }}
          />

          {documents.length > 0 && (
            <div className="mt-3 space-y-2">
              {documents.map((doc) => (
                <div key={doc.id} className="flex items-center gap-3 p-2.5 bg-gray-50 rounded-lg border border-gray-200">
                  <FileText className="w-4 h-4 text-[#625d9c] flex-shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-gray-800 truncate">{doc.title || doc.fileName}</p>
                    {doc.fileSize ? <p className="text-xs text-gray-400">{formatSize(doc.fileSize)}</p> : null}
                  </div>
                  <button
                    type="button"
                    onClick={() => deleteDocument(doc.id)}
                    className="text-gray-400 hover:text-red-500"
                    aria-label="Remove document"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Actions */}
        <Button
          className="w-full"
          disabled={!complete}
          onClick={onComplete}
          style={{ backgroundColor: complete ? '#625d9c' : undefined }}
        >
          {complete ? 'Enter dashboard' : 'Add a photo and a document to continue'}
        </Button>

        {onSignOut && (
          <button
            type="button"
            onClick={onSignOut}
            className="mt-4 mx-auto flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700"
          >
            <LogOut className="w-4 h-4" /> Sign out
          </button>
        )}
      </div>
    </div>
  );
}
