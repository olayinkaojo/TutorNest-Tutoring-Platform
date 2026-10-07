import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Badge } from '../ui/badge';
import { Switch } from '../ui/switch';
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
  Crown,
  Image as ImageIcon,
} from 'lucide-react';
import { projectId } from '../../utils/supabase/info';

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

export function WorksheetsUploader({ accessToken }: WorksheetsUploaderProps) {
  const [subject, setSubject] = useState('Maths');
  const [yearGroup, setYearGroup] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isPremium, setIsPremium] = useState(false);
  const [premiumPrice, setPremiumPrice] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [thumbnail, setThumbnail] = useState<File | null>(null);

  const [uploading, setUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const [worksheets, setWorksheets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterYearGroup, setFilterYearGroup] = useState('all');

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-cbd74580/worksheets/admin/all`,
        { headers: { Authorization: `Bearer ${accessToken}` } },
      );
      if (response.ok) {
        const data = await response.json();
        setWorksheets(data.worksheets || []);
      }
    } catch (error) {
      console.error('Error fetching worksheets:', error);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setYearGroup('');
    setIsPremium(false);
    setPremiumPrice('');
    setFile(null);
    setThumbnail(null);
    (document.getElementById('worksheet-file') as HTMLInputElement | null)?.value && ((document.getElementById('worksheet-file') as HTMLInputElement).value = '');
    (document.getElementById('worksheet-thumbnail') as HTMLInputElement | null)?.value && ((document.getElementById('worksheet-thumbnail') as HTMLInputElement).value = '');
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
      if (thumbnail) formData.append('thumbnail', thumbnail);
      formData.append('subject', subject);
      formData.append('yearGroup', yearGroup);
      formData.append('title', title);
      formData.append('description', description);
      formData.append('isPremium', String(isPremium));
      if (isPremium) formData.append('premiumPrice', premiumPrice);

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-cbd74580/worksheets/admin/upload`,
        { method: 'POST', headers: { Authorization: `Bearer ${accessToken}` }, body: formData },
      );
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Upload failed');
      }

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
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-cbd74580/worksheets/admin/${id}`,
        { method: 'DELETE', headers: { Authorization: `Bearer ${accessToken}` } },
      );
      if (response.ok) fetchAll();
      else alert((await response.json()).error || 'Failed to delete');
    } catch (error) {
      console.error('Delete error:', error);
    }
  };

  const filtered = filterYearGroup === 'all' ? worksheets : worksheets.filter((w) => w.yearGroup === filterYearGroup);
  const yearLabel = (value: string) => YEAR_GROUPS.find((g) => g.value === value)?.label ?? value;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="w-5 h-5" style={{ color: '#625d9c' }} />
            Upload a Worksheet
          </CardTitle>
          <CardDescription>
            Add it to the Worksheets library — same place parents and visitors browse from, free or paid.
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="worksheet-file">Worksheet file (PDF) <span className="text-red-500">*</span></Label>
              <Input id="worksheet-file" type="file" accept=".pdf,application/pdf" onChange={(e) => setFile(e.target.files?.[0] || null)} disabled={uploading} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="worksheet-thumbnail">Thumbnail image (optional)</Label>
              <Input id="worksheet-thumbnail" type="file" accept="image/*" onChange={(e) => setThumbnail(e.target.files?.[0] || null)} disabled={uploading} />
              <p className="text-xs text-gray-500 flex items-center gap-1"><ImageIcon className="w-3 h-3" /> Shown in the thumbnail grid — falls back to a plain icon if omitted.</p>
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

          <Button onClick={handleUpload} disabled={uploading} className="w-full text-white" style={{ backgroundColor: '#625d9c' }}>
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
                <div key={w.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    <FileText className="w-8 h-8 flex-shrink-0" style={{ color: '#625d9c' }} />
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
                  <Button variant="ghost" size="sm" onClick={() => handleDelete(w.id)}>
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
