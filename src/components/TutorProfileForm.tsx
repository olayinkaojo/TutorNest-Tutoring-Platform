import { useState, useRef } from 'react';
import { projectId } from '../utils/supabase/info';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Textarea } from './ui/textarea';
import { Checkbox } from './ui/checkbox';
import { Alert, AlertDescription } from './ui/alert';
import { Progress } from './ui/progress';
import { AlertCircle, Upload, X, CheckCircle, Clock } from 'lucide-react';

interface TutorProfileFormProps {
  session: any;
  onComplete: () => void;
}

export function TutorProfileForm({ session, onComplete }: TutorProfileFormProps) {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    bio: '',
    subjects: [] as string[],
    yearGroups: [] as string[],
    hourlyRate: '',
    availability: '',
    qualifications: '',
    hasDbsCheck: false,
    dbsNumber: '',
    dbsIssueDate: '',
    dbsExpiryDate: '',
  });
  
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string>('');
  const [certificates, setCertificates] = useState<File[]>([]);
  const [dbsDocument, setDbsDocument] = useState<File | null>(null);
  const [idDocument, setIdDocument] = useState<File | null>(null);
  
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  
  const photoInputRef = useRef<HTMLInputElement>(null);
  const certificateInputRef = useRef<HTMLInputElement>(null);
  const dbsInputRef = useRef<HTMLInputElement>(null);
  const idInputRef = useRef<HTMLInputElement>(null);

  const availableSubjects = [
    'Mathematics',
    'English',
    'Science',
    'Physics',
    'Chemistry',
    'Biology',
    'History',
    'Geography',
    'Computer Science',
    'Languages',
    'Art & Design',
    'Music',
    'Business Studies',
    'Economics',
    'Psychology',
  ];

  const yearGroupOptions = [
    'Primary (Year 1-6)',
    'KS3 (Year 7-9)',
    'GCSE (Year 10-11)',
    'A-Level (Year 12-13)',
    'University Level',
  ];

  const handleSubjectToggle = (subject: string) => {
    setFormData((prev) => ({
      ...prev,
      subjects: prev.subjects.includes(subject)
        ? prev.subjects.filter((s) => s !== subject)
        : [...prev.subjects, subject],
    }));
  };

  const handleYearGroupToggle = (yearGroup: string) => {
    setFormData((prev) => ({
      ...prev,
      yearGroups: prev.yearGroups.includes(yearGroup)
        ? prev.yearGroups.filter((y) => y !== yearGroup)
        : [...prev.yearGroups, yearGroup],
    }));
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setError('Photo must be less than 5MB');
        return;
      }
      const name = (file.name || '').toLowerCase();
      const ext = '.' + (name.split('.').pop() || '');
      const isImg = file.type ? (file.type.startsWith('image/') || file.type.includes('heic') || file.type.includes('heif')) : ['.jpg', '.jpeg', '.png', '.webp', '.heic', '.heif'].includes(ext);
      if (!isImg) {
        setError('Please upload an image file (JPG, PNG, WebP, HEIC)');
        return;
      }
      setPhoto(file);
      setPhotoPreview(URL.createObjectURL(file));
      setError('');
    }
  };

  const handleCertificateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const validFiles = files.filter((file) => {
      if (file.size > 10 * 1024 * 1024) {
        setError('Each certificate must be less than 10MB');
        return false;
      }
      return true;
    });
    setCertificates((prev) => [...prev, ...validFiles]);
    setError('');
  };

  const handleDbsDocumentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        setError('DBS document must be less than 10MB');
        return;
      }
      setDbsDocument(file);
      setError('');
    }
  };

  const handleIdDocumentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        setError('ID document must be less than 10MB');
        return;
      }
      setIdDocument(file);
      setError('');
    }
  };

  const removeCertificate = (index: number) => {
    setCertificates((prev) => prev.filter((_, i) => i !== index));
  };

  const calculateCompleteness = () => {
    let completed = 0;
    const total = 13;

    if (formData.firstName) completed++;
    if (formData.lastName) completed++;
    if (formData.bio && formData.bio.length >= 100) completed++;
    if (formData.subjects.length > 0) completed++;
    if (formData.yearGroups.length > 0) completed++;
    if (formData.hourlyRate) completed++;
    if (formData.availability) completed++;
    if (formData.qualifications) completed++;
    if (photo) completed++;
    if (certificates.length > 0) completed++;
    if (idDocument) completed++;
    if (formData.hasDbsCheck && dbsDocument) completed++;
    if (formData.hasDbsCheck && formData.dbsNumber && formData.dbsIssueDate && formData.dbsExpiryDate) completed++;

    return Math.round((completed / total) * 100);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validation
    if (formData.subjects.length === 0) {
      setError('Please select at least one subject.');
      return;
    }
    if (formData.yearGroups.length === 0) {
      setError('Please select at least one year group/level.');
      return;
    }
    if (!idDocument) {
      setError('ID document is required for identity verification.');
      return;
    }
    if (formData.bio.length < 100) {
      setError('Bio must be at least 100 characters.');
      return;
    }

    const completeness = calculateCompleteness();
    if (completeness < 80) {
      setError('Profile must be at least 80% complete to submit. Please fill in more details.');
      return;
    }

    setLoading(true);
    setUploadProgress(0);

    try {
      // Create FormData for file uploads
      const uploadData = new FormData();
      uploadData.append('formData', JSON.stringify(formData));
      
      if (photo) uploadData.append('photo', photo);
      if (idDocument) uploadData.append('idDocument', idDocument);
      if (dbsDocument) uploadData.append('dbsDocument', dbsDocument);
      
      certificates.forEach((cert, index) => {
        uploadData.append(`certificate_${index}`, cert);
      });

      setUploadProgress(30);

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-cbd74580/profile/complete`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
          body: uploadData,
        }
      );

      setUploadProgress(80);

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to save profile');
      }

      setUploadProgress(100);
      onComplete();
    } catch (err: any) {
      console.error('Error saving tutor profile:', err);
      setError(err.message || 'An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const profileCompleteness = calculateCompleteness();

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-green-50 flex items-center justify-center p-4 sm:p-6 md:p-8">
      <div className="w-full max-w-4xl">
        <div className="bg-white rounded-3xl shadow-xl p-6 sm:p-8">
          <h1 className="mb-2">Complete Your Tutor Profile</h1>
          <p className="text-gray-600 mb-4">
            Build your professional profile to connect with students and parents
          </p>

          {/* Profile Completeness */}
          <div className="mb-6 p-4 bg-purple-50 rounded-xl border border-purple-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm">Profile Completeness</span>
              <span className="text-sm" style={{ color: '#625d9c' }}>{profileCompleteness}%</span>
            </div>
            <Progress value={profileCompleteness} className="h-2" />
            <p className="text-xs text-gray-600 mt-2">
              {profileCompleteness >= 80 
                ? '✓ Profile ready to submit for verification' 
                : 'Complete at least 80% to submit your profile'}
            </p>
          </div>

          {error && (
            <Alert className="mb-6 bg-red-50 border-red-200">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-800">{error}</AlertDescription>
            </Alert>
          )}

          {loading && (
            <Alert className="mb-6 bg-blue-50 border-blue-200">
              <Clock className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-blue-800">
                Uploading documents... {uploadProgress}%
              </AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Personal Information */}
            <div>
              <h2 className="mb-4" style={{ color: '#625d9c' }}>Personal Information</h2>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="firstName">First Name</Label>
                  <Input
                    id="firstName"
                    type="text"
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    placeholder="Enter your first name"
                    className="mt-2 h-12"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input
                    id="lastName"
                    type="text"
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    placeholder="Enter your last name"
                    className="mt-2 h-12"
                    required
                  />
                </div>
              </div>

              <div className="mt-4">
                <Label htmlFor="photo">Profile Photo</Label>
                <div className="mt-2">
                  <input
                    ref={photoInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoChange}
                    className="hidden"
                  />
                  {photoPreview ? (
                    <div className="flex items-start gap-4">
                      <img
                        src={photoPreview}
                        alt="Profile preview"
                        className="w-24 h-24 rounded-full object-cover border-2 border-gray-200"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setPhoto(null);
                          setPhotoPreview('');
                        }}
                        className="h-10"
                      >
                        <X className="w-4 h-4 mr-2" />
                        Remove
                      </Button>
                    </div>
                  ) : (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => photoInputRef.current?.click()}
                      className="h-12 w-full"
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      Upload Photo (Max 5MB)
                    </Button>
                  )}
                </div>
              </div>
            </div>

            {/* Professional Bio */}
            <div>
              <h2 className="mb-4" style={{ color: '#625d9c' }}>Professional Information</h2>
              <div>
                <Label htmlFor="bio">
                  Professional Bio <span className="text-gray-500">(min 100 characters)</span>
                </Label>
                <Textarea
                  id="bio"
                  value={formData.bio}
                  onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                  placeholder="Tell parents about your teaching experience, approach, and what makes you a great tutor..."
                  className="mt-2"
                  rows={5}
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  {formData.bio.length}/100 characters {formData.bio.length >= 100 && '✓'}
                </p>
              </div>
            </div>

            {/* Subjects & Levels */}
            <div>
              <Label>Subjects I Can Teach</Label>
              <div className="grid md:grid-cols-3 gap-3 mt-2">
                {availableSubjects.map((subject) => (
                  <div key={subject} className="flex items-center space-x-2">
                    <Checkbox
                      id={subject}
                      checked={formData.subjects.includes(subject)}
                      onCheckedChange={() => handleSubjectToggle(subject)}
                    />
                    <label htmlFor={subject} className="text-sm cursor-pointer">
                      {subject}
                    </label>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <Label>Year Groups / Levels I Can Teach</Label>
              <div className="grid md:grid-cols-2 gap-3 mt-2">
                {yearGroupOptions.map((yearGroup) => (
                  <div key={yearGroup} className="flex items-center space-x-2">
                    <Checkbox
                      id={yearGroup}
                      checked={formData.yearGroups.includes(yearGroup)}
                      onCheckedChange={() => handleYearGroupToggle(yearGroup)}
                    />
                    <label htmlFor={yearGroup} className="text-sm cursor-pointer">
                      {yearGroup}
                    </label>
                  </div>
                ))}
              </div>
            </div>

            {/* Rates & Availability */}
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="hourlyRate">Hourly Rate (£)</Label>
                <Input
                  id="hourlyRate"
                  type="number"
                  min="10"
                  max="200"
                  step="5"
                  value={formData.hourlyRate}
                  onChange={(e) => setFormData({ ...formData, hourlyRate: e.target.value })}
                  placeholder="e.g., 35"
                  className="mt-2 h-12"
                  required
                />
              </div>
              <div>
                <Label htmlFor="availability">General Availability</Label>
                <Select
                  value={formData.availability}
                  onValueChange={(value) => setFormData({ ...formData, availability: value })}
                >
                  <SelectTrigger className="mt-2 h-12">
                    <SelectValue placeholder="Select availability" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="weekdays-daytime">Weekdays (Daytime)</SelectItem>
                    <SelectItem value="weekdays-evenings">Weekdays (Evenings)</SelectItem>
                    <SelectItem value="weekends">Weekends</SelectItem>
                    <SelectItem value="flexible">Flexible / Any Time</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Qualifications */}
            <div>
              <Label htmlFor="qualifications">Qualifications & Experience</Label>
              <Textarea
                id="qualifications"
                value={formData.qualifications}
                onChange={(e) => setFormData({ ...formData, qualifications: e.target.value })}
                placeholder="List your degrees, certifications, teaching qualifications (e.g., PGCE, QTS), years of experience..."
                className="mt-2"
                rows={4}
                required
              />
            </div>

            {/* Certificates Upload */}
            <div>
              <Label>Qualification Certificates</Label>
              <input
                ref={certificateInputRef}
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,.webp,.heic,.heif,.doc,.docx,application/pdf,image/*,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                multiple
                onChange={handleCertificateChange}
                className="hidden"
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => certificateInputRef.current?.click()}
                className="mt-2 h-12 w-full"
              >
                <Upload className="w-4 h-4 mr-2" />
                Upload Certificates (PDF, JPG, PNG, WebP, HEIC, DOC - Max 10MB each)
              </Button>
              {certificates.length > 0 && (
                <div className="mt-3 space-y-2">
                  {certificates.map((cert, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                    >
                      <span className="text-sm truncate flex-1">{cert.name}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeCertificate(index)}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Identity Verification (KYC) */}
            <div className="border-t pt-6">
              <h2 className="mb-4" style={{ color: '#625d9c' }}>Identity Verification (Required)</h2>
              <div>
                <Label>ID Document (Passport, Driver's License, or National ID)</Label>
                <input
                  ref={idInputRef}
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png,.webp,.heic,.heif,application/pdf,image/*"
                  onChange={handleIdDocumentChange}
                  className="hidden"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => idInputRef.current?.click()}
                  className="mt-2 h-12 w-full"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  {idDocument ? `✓ ${idDocument.name}` : 'Upload ID Document (Required)'}
                </Button>
                <p className="text-xs text-gray-500 mt-2">
                  Your ID will be verified by our team to ensure platform safety. This information is kept confidential.
                </p>
              </div>
            </div>

            {/* DBS Check */}
            <div className="border-t pt-6">
              <h2 className="mb-4" style={{ color: '#625d9c' }}>DBS Check (Highly Recommended)</h2>
              <div className="flex items-center space-x-2 mb-4">
                <Checkbox
                  id="hasDbsCheck"
                  checked={formData.hasDbsCheck}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, hasDbsCheck: checked as boolean })
                  }
                />
                <label htmlFor="hasDbsCheck" className="text-sm cursor-pointer">
                  I have a valid DBS check
                </label>
              </div>

              {formData.hasDbsCheck && (
                <div className="space-y-4 pl-6">
                  <div>
                    <Label htmlFor="dbsNumber">DBS Certificate Number</Label>
                    <Input
                      id="dbsNumber"
                      type="text"
                      value={formData.dbsNumber}
                      onChange={(e) => setFormData({ ...formData, dbsNumber: e.target.value })}
                      placeholder="e.g., 001234567890"
                      className="mt-2 h-12"
                    />
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="dbsIssueDate">DBS Issue Date</Label>
                      <Input
                        id="dbsIssueDate"
                        type="date"
                        value={formData.dbsIssueDate}
                        onChange={(e) => setFormData({ ...formData, dbsIssueDate: e.target.value })}
                        className="mt-2 h-12"
                      />
                    </div>
                    <div>
                      <Label htmlFor="dbsExpiryDate">DBS Expiry Date (if applicable)</Label>
                      <Input
                        id="dbsExpiryDate"
                        type="date"
                        value={formData.dbsExpiryDate}
                        onChange={(e) => setFormData({ ...formData, dbsExpiryDate: e.target.value })}
                        className="mt-2 h-12"
                      />
                    </div>
                  </div>

                  <div>
                    <Label>DBS Certificate Document</Label>
                    <input
                      ref={dbsInputRef}
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png,.webp,.heic,.heif,application/pdf,image/*"
                      onChange={handleDbsDocumentChange}
                      className="hidden"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => dbsInputRef.current?.click()}
                      className="mt-2 h-12 w-full"
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      {dbsDocument ? `✓ ${dbsDocument.name}` : 'Upload DBS Certificate'}
                    </Button>
                  </div>
                </div>
              )}

              <Alert className="mt-4 bg-blue-50 border-blue-200">
                <AlertCircle className="h-4 w-4 text-blue-600" />
                <AlertDescription className="text-blue-800 text-sm">
                  Tutors with verified DBS checks are prioritized in search results and trusted more by parents.
                </AlertDescription>
              </Alert>
            </div>

            <Button
              type="submit"
              disabled={loading || profileCompleteness < 80}
              className="w-full h-12 text-white"
              style={{ backgroundColor: '#625d9c' }}
            >
              {loading ? 'Submitting for Review...' : 'Submit Profile for Verification'}
            </Button>

            <p className="text-xs text-center text-gray-500">
              Your profile will be reviewed by our team within 2-3 business days. You'll be notified once verified.
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}