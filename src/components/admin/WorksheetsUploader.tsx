import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Badge } from '../ui/badge';
import { Switch } from '../ui/switch';
import { Alert, AlertDescription } from '../ui/alert';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
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
  Pencil,
  ImagePlus,
  Image as ImageIcon,
  Loader2,
  CheckCircle,
  AlertCircle,
  BookOpen,
  Crown,
} from 'lucide-react';
import { projectId } from '../../utils/supabase/info';
import { renderPdfFirstPageThumbnail, renderPdfPagesPreview } from '../../utils/pdf-thumbnail';

// Mirrors PREVIEW_PAGES_FREE / PREVIEW_PAGES_PREMIUM in worksheets-routes.tsx
// — the server re-caps on every read regardless, this just avoids rendering
// and uploading pages that would be thrown away anyway.
const PREVIEW_PAGES_FREE = 5;
const PREVIEW_PAGES_PREMIUM = 2;

interface WorksheetsUploaderProps {
  accessToken: string;
}

const SUBJECTS = ['Maths', 'English'];

const YEAR_GROUPS = [
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

const BASE_URL = `https://${projectId}.supabase.co/functions/v1/make-server-cbd74580/worksheets`;

export function WorksheetsUploader({ accessToken }: WorksheetsUploaderProps) {
  const [subject, setSubject] = useState('Maths');
  const [yearGroup, setYearGroup] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isPremium, setIsPremium] = useState(false);
  const [premiumPrice, setPremiumPrice] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null);
  const [generatingThumbnail, setGeneratingThumbnail] = useState(false);

  const [uploading, setUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const [worksheets, setWorksheets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterYearGroup, setFilterYearGroup] = useState('all');
  const [regeneratingId, setRegeneratingId] = useState<string | null>(null);
  const [uploadingCoverId, setUploadingCoverId] = useState<string | null>(null);
  const [listError, setListError] = useState<string | null>(null);
  const [editing, setEditing] = useState<any | null>(null);
  const manualCoverTargetId = useRef<string | null>(null);
  const manualCoverInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchAll();
    return () => {
      if (thumbnailPreview) URL.revokeObjectURL(thumbnailPreview);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${BASE_URL}/admin/all`, { headers: { Authorization: `Bearer ${accessToken}` } });
      if (response.ok) setWorksheets((await response.json()).worksheets || []);
    } catch (error) {
      console.error('Error fetching worksheets:', error);
    } finally {
      setLoading(false);
    }
  };

  const [generatedThumbnail, setGeneratedThumbnail] = useState<Blob | null>(null);
  const [generatedPreviewPages, setGeneratedPreviewPages] = useState<Blob[]>([]);
  const manualThumbInputRef = useRef<HTMLInputElement>(null);

  const handleManualThumbnail = (selected: File | null) => {
    if (!selected) return;
    if (thumbnailPreview) URL.revokeObjectURL(thumbnailPreview);
    setGeneratedThumbnail(selected);
    setThumbnailPreview(URL.createObjectURL(selected));
    setUploadError(null);
  };

  const handleFileChange = async (selected: File | null) => {
    setFile(selected);
    if (thumbnailPreview) URL.revokeObjectURL(thumbnailPreview);
    setThumbnailPreview(null);
    setGeneratedThumbnail(null);
    setGeneratedPreviewPages([]);
    if (!selected) return;

    setGeneratingThumbnail(true);
    setUploadError(null);
    try {
      // Render the max either tier could need once; handleUpload slices to
      // whatever the current Premium toggle actually entitles at submit time.
      const pages = await renderPdfPagesPreview(selected, PREVIEW_PAGES_FREE);
      if (!pages.length) throw new Error('Could not read any pages from this PDF');
      setGeneratedThumbnail(pages[0]);
      setThumbnailPreview(URL.createObjectURL(pages[0]));
      setGeneratedPreviewPages(pages);
    } catch (err: any) {
      console.error('Preview generation failed:', err);
      setUploadError('Could not read a preview from this PDF — it will upload without one. You can add a cover image afterward.');
    } finally {
      setGeneratingThumbnail(false);
    }
  };

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setYearGroup('');
    setIsPremium(false);
    setPremiumPrice('');
    setFile(null);
    if (thumbnailPreview) URL.revokeObjectURL(thumbnailPreview);
    setThumbnailPreview(null);
    setGeneratedThumbnail(null);
    setGeneratedPreviewPages([]);
    const fileInput = document.getElementById('worksheet-file') as HTMLInputElement | null;
    if (fileInput) fileInput.value = '';
    if (manualThumbInputRef.current) manualThumbInputRef.current.value = '';
  };

  const handleUpload = async () => {
    setUploadError(null);
    if (!file || !yearGroup || !title.trim()) {
      setUploadError('File, year group and title are required');
      return;
    }
    if (isPremium && (!premiumPrice || Number(premiumPrice) <= 0)) {
      setUploadError('Enter a price greater than ₦0 for a premium worksheet');
      return;
    }

    setUploading(true);
    setUploadSuccess(false);
    try {
      const formData = new FormData();
      formData.append('file', file);
      if (generatedThumbnail) {
        // A manually-picked cover keeps its real name/extension (it might be
        // a .png); only the auto-rendered PDF-page Blob has no name of its
        // own and falls back to .jpg, which is what it actually is.
        const name = generatedThumbnail instanceof File ? generatedThumbnail.name : 'cover.jpg';
        formData.append('thumbnail', generatedThumbnail, name);
      }
      const previewLimit = isPremium ? PREVIEW_PAGES_PREMIUM : PREVIEW_PAGES_FREE;
      generatedPreviewPages.slice(0, previewLimit).forEach((blob, i) => {
        formData.append('previewPages', blob, `page-${i + 1}.jpg`);
      });
      formData.append('subject', subject);
      formData.append('yearGroup', yearGroup);
      formData.append('title', title);
      formData.append('description', description);
      formData.append('isPremium', String(isPremium));
      if (isPremium) formData.append('premiumPrice', premiumPrice);

      const response = await fetch(`${BASE_URL}/admin/upload`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}` },
        body: formData,
      });
      if (!response.ok) throw new Error((await response.json()).error || 'Upload failed');

      setUploadSuccess(true);
      resetForm();
      fetchAll();
      setTimeout(() => setUploadSuccess(false), 3000);
    } catch (error: any) {
      setUploadError(error.message || 'An error occurred during upload');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this worksheet? This cannot be undone.')) return;
    try {
      const response = await fetch(`${BASE_URL}/admin/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${accessToken}` } });
      if (response.ok) fetchAll();
      else alert((await response.json()).error || 'Failed to delete');
    } catch (error) {
      console.error('Delete error:', error);
    }
  };

  const handleRegenerateThumbnail = async (w: any) => {
    setRegeneratingId(w.id);
    setListError(null);
    try {
      const linkRes = await fetch(`${BASE_URL}/admin/${w.id}/raw-file`, { headers: { Authorization: `Bearer ${accessToken}` } });
      if (!linkRes.ok) throw new Error((await linkRes.json()).error || 'Could not access the file');
      const { url } = await linkRes.json();

      const fileRes = await fetch(url);
      const pdfBlob = await fileRes.blob();
      const previewLimit = w.isPremium ? PREVIEW_PAGES_PREMIUM : PREVIEW_PAGES_FREE;
      const pages = await renderPdfPagesPreview(pdfBlob, previewLimit);
      if (!pages.length) throw new Error('Could not read any pages from this PDF');

      if (!w.thumbnailPath) {
        const thumbForm = new FormData();
        thumbForm.append('thumbnail', pages[0], 'cover.jpg');
        const thumbRes = await fetch(`${BASE_URL}/admin/${w.id}/thumbnail`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${accessToken}` },
          body: thumbForm,
        });
        if (!thumbRes.ok) throw new Error((await thumbRes.json()).error || 'Could not save the thumbnail');
      }

      const previewForm = new FormData();
      pages.forEach((blob, i) => previewForm.append('previewPages', blob, `page-${i + 1}.jpg`));
      const previewRes = await fetch(`${BASE_URL}/admin/${w.id}/preview-pages`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}` },
        body: previewForm,
      });
      if (!previewRes.ok) throw new Error((await previewRes.json()).error || 'Could not save the preview pages');

      fetchAll();
    } catch (error: any) {
      console.error('Preview generation failed:', error);
      setListError(
        `This browser couldn't generate a preview for "${w.title}" — use the image icon next to it to upload a cover photo instead.`,
      );
    } finally {
      setRegeneratingId(null);
    }
  };

  const handleManualCoverUpload = async (worksheetId: string, file: File | null) => {
    if (!file) return;
    setUploadingCoverId(worksheetId);
    setListError(null);
    try {
      const formData = new FormData();
      formData.append('thumbnail', file);
      const saveRes = await fetch(`${BASE_URL}/admin/${worksheetId}/thumbnail`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}` },
        body: formData,
      });
      if (!saveRes.ok) throw new Error((await saveRes.json()).error || 'Could not save the thumbnail');
      fetchAll();
    } catch (error: any) {
      setListError(error.message || 'Could not upload a cover image for this worksheet');
    } finally {
      setUploadingCoverId(null);
    }
  };

  const filtered = filterYearGroup === 'all' ? worksheets : worksheets.filter((w) => w.yearGroup === filterYearGroup);
  const yearLabel = (value: string) => YEAR_GROUPS.find((g) => g.value === value)?.label ?? value;
  const thumbUrl = (w: any) => (w.thumbnailPath ? `${BASE_URL}/${w.id}/thumbnail` : null);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="w-5 h-5" style={{ color: '#625d9c' }} />
            Upload a Worksheet
          </CardTitle>
          <CardDescription>
            Its first {PREVIEW_PAGES_FREE} pages (first {PREVIEW_PAGES_PREMIUM} if marked Premium below) become the cover and preview automatically — just upload the PDF.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {uploadSuccess && (
            <Alert className="bg-green-50 border-green-200">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">Worksheet uploaded successfully!</AlertDescription>
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
              <Label>Subject</Label>
              <Select value={subject} onValueChange={setSubject} disabled={uploading}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SUBJECTS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Year Group <span className="text-red-500">*</span></Label>
              <Select value={yearGroup} onValueChange={setYearGroup} disabled={uploading}>
                <SelectTrigger><SelectValue placeholder="Select year group" /></SelectTrigger>
                <SelectContent>
                  {YEAR_GROUPS.map((g) => <SelectItem key={g.value} value={g.value}>{g.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Title <span className="text-red-500">*</span></Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g., Fractions Practice Sheet 1" disabled={uploading} />
          </div>

          <div className="space-y-2">
            <Label>Description (optional)</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} disabled={uploading} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-4 items-start">
            <div className="space-y-2">
              <Label htmlFor="worksheet-file">Worksheet file (PDF) <span className="text-red-500">*</span></Label>
              <Input
                id="worksheet-file"
                type="file"
                accept=".pdf,application/pdf"
                onChange={(e) => handleFileChange(e.target.files?.[0] || null)}
                disabled={uploading}
              />
              <p className="text-xs text-gray-500">The first page is used as the thumbnail automatically.</p>
            </div>
            <div className="flex flex-col items-center gap-1.5 flex-shrink-0">
              <div className="w-24 h-32 rounded-lg border bg-gray-50 flex items-center justify-center overflow-hidden">
                {generatingThumbnail ? (
                  <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
                ) : thumbnailPreview ? (
                  <img src={thumbnailPreview} alt="Cover preview" className="w-full h-full object-cover" />
                ) : (
                  <FileText className="w-6 h-6 text-gray-300" />
                )}
              </div>
              <input
                ref={manualThumbInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => handleManualThumbnail(e.target.files?.[0] || null)}
              />
              <button
                type="button"
                className="text-xs underline whitespace-nowrap"
                style={{ color: '#625d9c' }}
                onClick={() => manualThumbInputRef.current?.click()}
                disabled={uploading}
              >
                <ImageIcon className="w-3 h-3 inline mr-0.5 -mt-0.5" />
                {thumbnailPreview ? 'Replace cover' : 'Upload cover image'}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between border rounded-lg p-4 bg-amber-50 border-amber-200">
            <div>
              <Label className="flex items-center gap-1.5"><Crown className="w-4 h-4 text-amber-600" /> Premium — pay to own</Label>
              <p className="text-xs text-gray-600 mt-1">Always needs its own purchase, even for subscribers. Leave off for a regular (free-tier/subscription) worksheet.</p>
            </div>
            <Switch checked={isPremium} onCheckedChange={setIsPremium} disabled={uploading} />
          </div>

          {isPremium && (
            <div className="space-y-2">
              <Label>Price (₦) <span className="text-red-500">*</span></Label>
              <Input type="number" min="1" value={premiumPrice} onChange={(e) => setPremiumPrice(e.target.value)} placeholder="e.g., 2000" disabled={uploading} />
            </div>
          )}

          <Button onClick={handleUpload} disabled={uploading || generatingThumbnail} className="w-full text-white" style={{ backgroundColor: '#625d9c' }}>
            {uploading ? (<><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Uploading…</>) : (<><Upload className="w-4 h-4 mr-2" /> Upload Worksheet</>)}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <CardTitle>Worksheets ({worksheets.length})</CardTitle>
              <CardDescription>Everything currently in the library.</CardDescription>
            </div>
            <div className="w-56">
              <Select value={filterYearGroup} onValueChange={setFilterYearGroup}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All year groups</SelectItem>
                  {YEAR_GROUPS.map((g) => <SelectItem key={g.value} value={g.value}>{g.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {listError && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{listError}</AlertDescription>
            </Alert>
          )}
          {loading ? (
            <div className="flex items-center justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-gray-400" /></div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <BookOpen className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>No worksheets uploaded yet{filterYearGroup !== 'all' ? ' for this year group' : ''}.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map((w) => (
                <div key={w.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 gap-3">
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    <div className="w-12 h-16 rounded border bg-gray-50 flex items-center justify-center overflow-hidden flex-shrink-0">
                      {thumbUrl(w) ? (
                        <img src={thumbUrl(w)!} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <FileText className="w-5 h-5 text-gray-300" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <h4 className="text-sm truncate">{w.title}</h4>
                        <Badge variant="outline" className="text-xs">{w.subject}</Badge>
                        <Badge variant="outline" className="text-xs">{yearLabel(w.yearGroup)}</Badge>
                        {w.isPremium && (
                          <Badge className="text-xs bg-amber-100 text-amber-800 border-amber-300">
                            <Crown className="w-3 h-3 mr-1" /> ₦{Number(w.premiumPrice).toLocaleString()}
                          </Badge>
                        )}
                      </div>
                      {w.description && <p className="text-xs text-gray-600 line-clamp-1">{w.description}</p>}
                      <p className="text-xs text-gray-400 mt-1">Uploaded {new Date(w.uploadedAt).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {(!w.thumbnailPath || !w.previewPaths?.length) && (
                      <Button
                        variant="ghost"
                        size="sm"
                        title="Generate cover + preview pages from the PDF"
                        disabled={regeneratingId === w.id}
                        onClick={() => handleRegenerateThumbnail(w)}
                      >
                        {regeneratingId === w.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImagePlus className="w-4 h-4" style={{ color: '#625d9c' }} />}
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      title="Upload a cover image manually"
                      disabled={uploadingCoverId === w.id}
                      onClick={() => {
                        manualCoverTargetId.current = w.id;
                        manualCoverInputRef.current?.click();
                      }}
                    >
                      {uploadingCoverId === w.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImageIcon className="w-4 h-4" style={{ color: '#625d9c' }} />}
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setEditing(w)}>
                      <Pencil className="w-4 h-4" style={{ color: '#625d9c' }} />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDelete(w.id)}>
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <input
        ref={manualCoverInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0] || null;
          const targetId = manualCoverTargetId.current;
          e.target.value = '';
          if (targetId && file) handleManualCoverUpload(targetId, file);
        }}
      />

      {editing && (
        <EditWorksheetDialog
          worksheet={editing}
          accessToken={accessToken}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            fetchAll();
          }}
        />
      )}
    </div>
  );
}

function EditWorksheetDialog({
  worksheet,
  accessToken,
  onClose,
  onSaved,
}: {
  worksheet: any;
  accessToken: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [subject, setSubject] = useState(worksheet.subject);
  const [yearGroup, setYearGroup] = useState(worksheet.yearGroup);
  const [title, setTitle] = useState(worksheet.title);
  const [description, setDescription] = useState(worksheet.description || '');
  const [isPremium, setIsPremium] = useState(!!worksheet.isPremium);
  const [premiumPrice, setPremiumPrice] = useState(String(worksheet.premiumPrice || ''));
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const save = async () => {
    setErr(null);
    if (!title.trim()) {
      setErr('Title cannot be empty');
      return;
    }
    if (isPremium && (!premiumPrice || Number(premiumPrice) <= 0)) {
      setErr('Enter a price greater than ₦0 for a premium worksheet');
      return;
    }
    setSaving(true);
    try {
      const response = await fetch(`${BASE_URL}/admin/${worksheet.id}`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject,
          yearGroup,
          title,
          description,
          isPremium,
          premiumPrice: isPremium ? Number(premiumPrice) : undefined,
        }),
      });
      if (!response.ok) throw new Error((await response.json()).error || 'Could not save changes');
      onSaved();
    } catch (e: any) {
      setErr(e.message || 'Could not save changes');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Worksheet</DialogTitle>
          <DialogDescription>Change its details — the file itself isn't replaced here, only the listing.</DialogDescription>
        </DialogHeader>

        {err && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{err}</AlertDescription>
          </Alert>
        )}

        <div className="space-y-4 py-2">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Subject</Label>
              <Select value={subject} onValueChange={setSubject} disabled={saving}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SUBJECTS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Year Group</Label>
              <Select value={yearGroup} onValueChange={setYearGroup} disabled={saving}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {YEAR_GROUPS.map((g) => <SelectItem key={g.value} value={g.value}>{g.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Title</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} disabled={saving} />
          </div>

          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} disabled={saving} />
          </div>

          <div className="flex items-center justify-between border rounded-lg p-4 bg-amber-50 border-amber-200">
            <Label className="flex items-center gap-1.5"><Crown className="w-4 h-4 text-amber-600" /> Premium — pay to own</Label>
            <Switch checked={isPremium} onCheckedChange={setIsPremium} disabled={saving} />
          </div>

          {isPremium && (
            <div className="space-y-2">
              <Label>Price (₦)</Label>
              <Input type="number" min="1" value={premiumPrice} onChange={(e) => setPremiumPrice(e.target.value)} disabled={saving} />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button onClick={save} disabled={saving} className="text-white" style={{ backgroundColor: '#625d9c' }}>
            {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
            Save changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
