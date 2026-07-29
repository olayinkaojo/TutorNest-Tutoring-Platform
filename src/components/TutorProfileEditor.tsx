import { useState, useEffect, useRef } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Badge } from './ui/badge';
import { Alert, AlertDescription } from './ui/alert';
import { Progress } from './ui/progress';
import { User, Mail, Phone, MapPin, DollarSign, BookOpen, Award, CheckCircle, AlertCircle, CreditCard, Upload, FileText, X, Download, RefreshCw, Loader2, Clock } from 'lucide-react';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { getSupabaseClient } from '../utils/supabase/client';
import { toast } from 'sonner@2.0.3';

// Certificate/document upload settings
const CERTIFICATE_DOCUMENT_TYPE = 'tutor_certificate';
const MAX_CERTIFICATE_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_CERTIFICATES = 20;
const UPLOAD_CONCURRENCY = 3; // upload a few at a time; responsive without hammering the edge fn
const ACCEPTED_CERTIFICATE_TYPES = ['application/pdf', 'image/png', 'image/jpeg'];
const ACCEPTED_CERTIFICATE_EXTENSIONS = ['.pdf', '.png', '.jpg', '.jpeg'];

const formatFileSize = (bytes: number) => {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

// Some browsers report an empty MIME type (notably PDFs from certain file
// managers), so fall back to the extension before rejecting a file.
const hasAcceptedCertificateType = (file: File) => {
  if (file.type) return ACCEPTED_CERTIFICATE_TYPES.includes(file.type);
  const name = file.name.toLowerCase();
  return ACCEPTED_CERTIFICATE_EXTENSIONS.some(ext => name.endsWith(ext));
};

type CertificateUpload = {
  id: string;
  file: File;
  status: 'queued' | 'uploading' | 'success' | 'error';
  progress: number;
  error?: string;
};

const AVAILABLE_SUBJECTS = [
  // Core Subjects
  'Mathematics',
  'English',
  'Science',
  'Physics',
  'Chemistry',
  'Biology',
  'Computer Science',
  'Information Technology',
  
  // Languages
  'Spanish',
  'French',
  'German',
  'Italian',
  'Mandarin Chinese',
  'Arabic',
  'Latin',
  
  // Humanities
  'History',
  'Geography',
  'Religious Studies',
  'Philosophy',
  'Psychology',
  'Sociology',
  'Politics',
  'Economics',
  
  // Arts
  'Art & Design',
  'Music',
  'Drama',
  'Dance',
  'Media Studies',
  'Photography',
  
  // Other
  'Business Studies',
  'Accounting',
  'Law',
  'Physical Education',
  'Design & Technology',
  'Food Technology',
  'Textiles',
  
  // Primary/Elementary
  'Primary/Elementary (All Subjects)',
  'Early Years Foundation Stage (EYFS)',
  
  // Test Prep
  '11+ Entrance Exams',
  'GCSE Preparation',
  'A-Level Preparation',
  'SAT Preparation',
  'ACT Preparation',
  'IELTS',
  'TOEFL',
  
  // Special Needs
  'Special Educational Needs (SEN)',
  'Dyslexia Support',
  'ADHD Support',
  
  // Others
  'Others',
];

const AGE_GROUPS = [
  'Early Years (3-5)',
  'Primary Lower (5-8)',
  'Primary Upper (8-11)',
  'Junior Secondary (11-14)',
  'Senior Secondary (14-17)',
];

// Class mapping for each age group (Nigeria 6-3-3-4 system / UK England system)
const CLASS_OPTIONS: { [key: string]: string[] } = {
  'Early Years (3-5)': [
    'Nursery 1',
    'Nursery 2',
    'Nursery 3 / Reception',
    'Kindergarten/Pre-Primary',
  ],
  'Primary Lower (5-8)': [
    'Primary 1 (P1) / Year 1',
    'Primary 2 (P2) / Year 2',
    'Primary 3 (P3) / Year 3',
  ],
  'Primary Upper (8-11)': [
    'Primary 4 (P4) / Year 4',
    'Primary 5 (P5) / Year 5',
    'Primary 6 (P6) / Year 6',
  ],
  'Junior Secondary (11-14)': [
    'JSS 1 / Year 7',
    'JSS 2 / Year 8',
    'JSS 3 / Year 9',
  ],
  'Senior Secondary (14-17)': [
    'SS 1 / Year 10',
    'SS 2 / Year 11',
    'SS 3 / Year 12',
  ],
};

const TEACHING_FORMATS = [
  'Online Only',
  'In-Person Only',
  'Both Online & In-Person',
];

const GROUP_SIZES = [
  'One-on-One Only',
  'Small Groups (2-4 students)',
  'Both Individual & Groups',
];

const EXAM_BOARDS = [
  'AQA',
  'Edexcel',
  'OCR',
  'WJEC',
  'Cambridge International',
  'IB (International Baccalaureate)',
  'Scottish Qualifications',
  'Others',
];

// Professional Certifications & Teaching Registrations (African & International)
const PROFESSIONAL_CERTIFICATIONS = [
  // Nigerian Certifications
  'TRCN (Teachers Registration Council of Nigeria)',
  'WAEC (West African Examinations Council)',
  'NECO (National Examinations Council)',
  'NABTEB (National Business and Technical Examinations Board)',
  'JAMB (Joint Admissions and Matriculation Board)',
  'NCE (Nigeria Certificate in Education)',
  'B.Ed (Bachelor of Education)',
  'PGDE (Postgraduate Diploma in Education)',
  
  // African Certifications
  'UNEB (Uganda National Examinations Board)',
  'KNEC (Kenya National Examinations Council)',
  'ZIMSEC (Zimbabwe School Examinations Council)',
  'UACE (Uganda Advanced Certificate of Education)',
  'KCSE (Kenya Certificate of Secondary Education)',
  'South African IEB',
  'Matric (South Africa)',
  'BECE (Basic Education Certificate Examination)',
  
  // UK & International Certifications
  'QTS (Qualified Teacher Status)',
  'PGCE (Postgraduate Certificate in Education)',
  'QTLS (Qualified Teacher Learning and Skills)',
  'NQT (Newly Qualified Teacher)',
  'SEN Certification',
  'TESOL/TEFL Certification',
  'Montessori Certification',
  'Cambridge CELTA',
  'Cambridge DELTA',
  
  // Other Professional Bodies
  'Teaching Council Ireland',
  'GTCS (General Teaching Council Scotland)',
  'EWC (Education Workforce Council Wales)',
  'Others',
];

const LEARNING_DIFFICULTIES = [
  'Dyslexia',
  'Dyscalculia',
  'ADHD',
  'Autism Spectrum',
  'Dyspraxia',
  'Speech & Language Difficulties',
  'Anxiety/Mental Health Support',
  'Gifted & Talented',
  'Others',
];

const TEACHING_METHODOLOGIES = [
  'Visual Learning',
  'Kinesthetic/Hands-on',
  'Auditory Learning',
  'Project-Based Learning',
  'Socratic Method',
  'Direct Instruction',
  'Inquiry-Based Learning',
  'Differentiated Instruction',
  'Others',
];

const LANGUAGES_SPOKEN = [
  'English',
  'Spanish',
  'French',
  'German',
  'Mandarin',
  'Arabic',
  'Polish',
  'Urdu',
  'Bengali',
  'Portuguese',
  'Italian',
  'Hindi',
  'Others',
];

// Nigerian Banks
const NIGERIAN_BANKS = [
  'Access Bank',
  'Guaranty Trust Bank (GTBank)',
  'United Bank for Africa (UBA)',
  'Zenith Bank',
  'First Bank of Nigeria',
  'Fidelity Bank',
  'Union Bank',
  'Sterling Bank',
  'Stanbic IBTC Bank',
  'Ecobank Nigeria',
  'Citibank Nigeria',
  'Heritage Bank',
  'Keystone Bank',
  'Polaris Bank',
  'Providus Bank',
  'Standard Chartered Bank',
  'SunTrust Bank',
  'Titan Trust Bank',
  'Unity Bank',
  'Wema Bank',
  'Kuda Bank',
  'ALAT by Wema',
  'VFD Microfinance Bank',
  'Rubies Bank',
  'Opay',
];

const ACCOUNT_TYPES = [
  'Savings Account',
  'Current Account',
];

const MOBILE_MONEY_PROVIDERS = [
  'Opay',
  'PalmPay',
  'Kuda',
  'MTN MoMo',
  'Airtel Money',
];

interface TutorProfileEditorProps {
  session: any;
  tutorId: string;
  currentProfile: any;
  onProfileUpdated?: () => void;
}

export function TutorProfileEditor({ session, tutorId, currentProfile, onProfileUpdated }: TutorProfileEditorProps) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    phone: '',
    location: '',
    bio: '',
    hourly_rate: '',
    qualifications: '',
    experience_years: '',
    teaching_style: '',
    availability_note: '',
    teaching_format: '',
    group_size: '',
    travel_radius: '',
    max_students: '',
    dbs_checked: false,
    has_insurance: false,
    // Payout account details
    bank_name: '',
    account_number: '',
    account_name: '',
    account_type: '',
    mobile_money_provider: '',
    mobile_money_number: '',
  });
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [otherSubjects, setOtherSubjects] = useState<string>('');
  const [selectedAgeGroups, setSelectedAgeGroups] = useState<string[]>([]);
  const [selectedExamBoards, setSelectedExamBoards] = useState<string[]>([]);
  const [otherExamBoards, setOtherExamBoards] = useState<string>('');
  const [selectedLearningDifficulties, setSelectedLearningDifficulties] = useState<string[]>([]);
  const [otherLearningDifficulties, setOtherLearningDifficulties] = useState<string>('');
  const [selectedMethodologies, setSelectedMethodologies] = useState<string[]>([]);
  const [otherMethodologies, setOtherMethodologies] = useState<string>('');
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>([]);
  const [otherLanguages, setOtherLanguages] = useState<string>('');
  const [selectedProfessionalCertifications, setSelectedProfessionalCertifications] = useState<string[]>([]);
  const [otherProfessionalCertifications, setOtherProfessionalCertifications] = useState<string>('');

  // Certificates state
  const [certificates, setCertificates] = useState<Array<{ id: string; title: string; fileName: string; fileSize: number; fileType: string; createdAt: string }>>([]);
  const [uploading, setUploading] = useState(false);
  const [loadingCertificates, setLoadingCertificates] = useState(false);
  const [uploadQueue, setUploadQueue] = useState<CertificateUpload[]>([]);
  const [isDraggingFiles, setIsDraggingFiles] = useState(false);
  const certificateInputRef = useRef<HTMLInputElement>(null);
  // Nested dragenter/leave fire for children; count them so the drop zone only
  // un-highlights when the pointer truly leaves.
  const dragDepth = useRef(0);
  const supabase = getSupabaseClient();

  useEffect(() => {
    if (session?.access_token) loadCertificates();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.access_token]);

  const loadCertificates = async () => {
    setLoadingCertificates(true);
    try {
      // userRole=tutor is required: the server defaults to 'parent', under which
      // a tutor's own uploads are filtered out.
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-cbd74580/documents?documentType=${CERTIFICATE_DOCUMENT_TYPE}&userRole=tutor`,
        { headers: { 'Authorization': `Bearer ${session.access_token}` } }
      );
      if (response.ok) {
        const data = await response.json();
        setCertificates(data.documents || []);
      } else {
        console.error('Failed to load certificates');
      }
    } catch (error) {
      console.error('Error loading certificates:', error);
    } finally {
      setLoadingCertificates(false);
    }
  };

  const updateQueueItem = (id: string, patch: Partial<CertificateUpload>) => {
    setUploadQueue(prev => prev.map(e => (e.id === id ? { ...e, ...patch } : e)));
  };

  // XMLHttpRequest (not fetch) so we can report real upload progress.
  const uploadCertificate = (item: CertificateUpload): Promise<void> =>
    new Promise((resolve, reject) => {
      const payload = new FormData();
      payload.append('file', item.file);
      payload.append('title', item.file.name);
      payload.append('description', 'Tutor qualification document');
      payload.append('documentType', CERTIFICATE_DOCUMENT_TYPE);
      payload.append('uploadedByRole', 'tutor');
      payload.append('relatedToId', tutorId);
      payload.append('relatedToType', 'tutor');

      const xhr = new XMLHttpRequest();
      xhr.open('POST', `https://${projectId}.supabase.co/functions/v1/make-server-cbd74580/documents/upload`);
      xhr.setRequestHeader('Authorization', `Bearer ${session.access_token}`);
      xhr.upload.onprogress = (ev) => {
        if (!ev.lengthComputable) return;
        updateQueueItem(item.id, { progress: Math.min(99, Math.round((ev.loaded / ev.total) * 100)) });
      };
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) return resolve();
        let msg = '';
        try { msg = JSON.parse(xhr.responseText)?.error || ''; } catch { /* non-JSON */ }
        reject(new Error(msg || `Upload failed (${xhr.status})`));
      };
      xhr.onerror = () => reject(new Error('Network error — check your connection and try again'));
      xhr.ontimeout = () => reject(new Error('Upload timed out'));
      xhr.timeout = 120000;
      xhr.send(payload);
    });

  const processUploadQueue = async (items: CertificateUpload[]): Promise<number> => {
    let succeeded = 0, cursor = 0;
    const worker = async () => {
      while (cursor < items.length) {
        const item = items[cursor++];
        updateQueueItem(item.id, { status: 'uploading', progress: 0, error: undefined });
        try {
          await uploadCertificate(item);
          updateQueueItem(item.id, { status: 'success', progress: 100 });
          succeeded++;
        } catch (error) {
          const text = error instanceof Error ? error.message : 'Upload failed';
          console.error('Certificate upload failed:', item.file.name, error);
          updateQueueItem(item.id, { status: 'error', error: text });
        }
      }
    };
    await Promise.all(Array.from({ length: Math.min(UPLOAD_CONCURRENCY, items.length) }, worker));
    return succeeded;
  };

  const enqueueCertificates = async (fileList: File[]) => {
    if (fileList.length === 0) return;
    const rejected: string[] = [];
    const accepted: File[] = [];
    for (const file of fileList) {
      if (!hasAcceptedCertificateType(file)) rejected.push(`${file.name} (unsupported format)`);
      else if (file.size > MAX_CERTIFICATE_SIZE) rejected.push(`${file.name} (over 5MB)`);
      else accepted.push(file);
    }
    if (rejected.length > 0) {
      toast.error(`Skipped ${rejected.length} file${rejected.length === 1 ? '' : 's'}`, { description: rejected.join(', ') });
    }
    if (accepted.length === 0) return;

    const remaining = MAX_CERTIFICATES - certificates.length;
    if (remaining <= 0) {
      toast.error(`You can store up to ${MAX_CERTIFICATES} documents. Delete one before uploading more.`);
      return;
    }
    let toUpload = accepted;
    if (accepted.length > remaining) {
      toUpload = accepted.slice(0, remaining);
      toast.warning(`Only ${remaining} more document${remaining === 1 ? '' : 's'} can be stored — the rest were skipped.`);
    }

    const items: CertificateUpload[] = toUpload.map(file => ({
      id: `${file.name}-${file.size}-${file.lastModified}-${Math.random().toString(36).slice(2, 9)}`,
      file, status: 'queued', progress: 0,
    }));
    // Keep prior failures visible for retry.
    setUploadQueue(prev => [...prev.filter(e => e.status === 'error'), ...items]);
    setUploading(true);
    const succeeded = await processUploadQueue(items);
    const failed = items.length - succeeded;
    setUploading(false);

    if (succeeded > 0) {
      await loadCertificates();
      toast.success(`Uploaded ${succeeded} document${succeeded === 1 ? '' : 's'}`);
      setUploadQueue(prev => prev.filter(e => e.status !== 'success'));
    }
    if (failed > 0) toast.error(`${failed} document${failed === 1 ? '' : 's'} failed. Use Retry to try again.`);
  };

  const retryUpload = async (id: string) => {
    const item = uploadQueue.find(e => e.id === id);
    if (!item || uploading) return;
    setUploading(true);
    const ok = await processUploadQueue([item]);
    setUploading(false);
    if (ok > 0) {
      await loadCertificates();
      toast.success(`Uploaded ${item.file.name}`);
      setUploadQueue(prev => prev.filter(e => e.id !== id));
    }
  };

  const dismissQueueItem = (id: string) => setUploadQueue(prev => prev.filter(e => e.id !== id));

  const handleCertificateSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    e.target.value = ''; // allow re-selecting the same file
    void enqueueCertificates(files);
  };

  const handleCertificateDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    dragDepth.current = 0;
    setIsDraggingFiles(false);
    void enqueueCertificates(Array.from(e.dataTransfer.files || []));
  };
  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    dragDepth.current += 1;
    setIsDraggingFiles(true);
  };
  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    dragDepth.current = Math.max(0, dragDepth.current - 1);
    if (dragDepth.current === 0) setIsDraggingFiles(false);
  };

  const downloadCertificate = async (documentId: string) => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-cbd74580/documents/${documentId}/download?userRole=tutor`,
        { headers: { 'Authorization': `Bearer ${session.access_token}` } }
      );
      if (response.ok) {
        const data = await response.json();
        window.open(data.downloadUrl, '_blank', 'noopener,noreferrer');
      } else {
        toast.error('Failed to generate download link');
      }
    } catch (error) {
      console.error('Error downloading certificate:', error);
      toast.error('Failed to download document');
    }
  };

  const deleteCertificate = async (documentId: string, label: string) => {
    if (!confirm(`Delete "${label}"? This action cannot be undone.`)) return;
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-cbd74580/documents/${documentId}`,
        { method: 'DELETE', headers: { 'Authorization': `Bearer ${session.access_token}` } }
      );
      if (response.ok) {
        setCertificates(prev => prev.filter(d => d.id !== documentId));
        toast.success('Document deleted');
      } else {
        const err = await response.json().catch(() => ({}));
        toast.error(err.error || 'Failed to delete document');
      }
    } catch (error) {
      console.error('Error deleting certificate:', error);
      toast.error('Failed to delete document');
    }
  };

  useEffect(() => {
    if (currentProfile) {
      setFormData({
        full_name: currentProfile.full_name || '',
        email: currentProfile.email || '',
        phone: currentProfile.phone || '',
        location: currentProfile.location || '',
        bio: currentProfile.bio || '',
        hourly_rate: currentProfile.hourly_rate || '',
        qualifications: currentProfile.qualifications || '',
        experience_years: currentProfile.experience_years || '',
        teaching_style: currentProfile.teaching_style || '',
        availability_note: currentProfile.availability_note || '',
        teaching_format: currentProfile.teaching_format || '',
        group_size: currentProfile.group_size || '',
        travel_radius: currentProfile.travel_radius || '',
        max_students: currentProfile.max_students || '',
        dbs_checked: currentProfile.dbs_checked || false,
        has_insurance: currentProfile.has_insurance || false,
        // Payout account details
        bank_name: currentProfile.bank_name || '',
        account_number: currentProfile.account_number || '',
        account_name: currentProfile.account_name || '',
        account_type: currentProfile.account_type || '',
        mobile_money_provider: currentProfile.mobile_money_provider || '',
        mobile_money_number: currentProfile.mobile_money_number || '',
      });
      
      // Set selected subjects
      if (Array.isArray(currentProfile.subjects)) {
        setSelectedSubjects(currentProfile.subjects);
      } else if (typeof currentProfile.subjects === 'string') {
        setSelectedSubjects(currentProfile.subjects.split(',').map(s => s.trim()).filter(Boolean));
      }
      
      // Set other subjects
      setOtherSubjects(currentProfile.other_subjects || '');
      
      // Set selected age groups (migrate old key names to new ones)
      const AGE_GROUP_MIGRATION: Record<string, string> = {
        'Primary Lower (6-8)': 'Primary Lower (5-8)',
        'Primary Upper (9-11)': 'Primary Upper (8-11)',
        'Junior Secondary (12-14)': 'Junior Secondary (11-14)',
        'Senior Secondary (15-17)': 'Senior Secondary (14-17)',
      };
      const migrateAgeGroups = (groups: string[]) =>
        groups.map(g => AGE_GROUP_MIGRATION[g] ?? g);
      if (Array.isArray(currentProfile.age_groups)) {
        setSelectedAgeGroups(migrateAgeGroups(currentProfile.age_groups));
      } else if (typeof currentProfile.age_groups === 'string') {
        setSelectedAgeGroups(migrateAgeGroups(currentProfile.age_groups.split(',').map(s => s.trim()).filter(Boolean)));
      }
      
      // Set selected exam boards
      if (Array.isArray(currentProfile.exam_boards)) {
        setSelectedExamBoards(currentProfile.exam_boards);
      } else if (typeof currentProfile.exam_boards === 'string') {
        setSelectedExamBoards(currentProfile.exam_boards.split(',').map(s => s.trim()).filter(Boolean));
      }
      
      // Set other exam boards
      setOtherExamBoards(currentProfile.other_exam_boards || '');
      
      // Set selected learning difficulties
      if (Array.isArray(currentProfile.learning_difficulties)) {
        setSelectedLearningDifficulties(currentProfile.learning_difficulties);
      } else if (typeof currentProfile.learning_difficulties === 'string') {
        setSelectedLearningDifficulties(currentProfile.learning_difficulties.split(',').map(s => s.trim()).filter(Boolean));
      }
      
      // Set other learning difficulties
      setOtherLearningDifficulties(currentProfile.other_learning_difficulties || '');
      
      // Set selected methodologies
      if (Array.isArray(currentProfile.methodologies)) {
        setSelectedMethodologies(currentProfile.methodologies);
      } else if (typeof currentProfile.methodologies === 'string') {
        setSelectedMethodologies(currentProfile.methodologies.split(',').map(s => s.trim()).filter(Boolean));
      }
      
      // Set other methodologies
      setOtherMethodologies(currentProfile.other_methodologies || '');
      
      // Set selected languages
      if (Array.isArray(currentProfile.languages)) {
        setSelectedLanguages(currentProfile.languages);
      } else if (typeof currentProfile.languages === 'string') {
        setSelectedLanguages(currentProfile.languages.split(',').map(s => s.trim()).filter(Boolean));
      }
      
      // Set other languages
      setOtherLanguages(currentProfile.other_languages || '');
      
      // Set selected professional certifications
      if (Array.isArray(currentProfile.professional_certifications)) {
        setSelectedProfessionalCertifications(currentProfile.professional_certifications);
      } else if (typeof currentProfile.professional_certifications === 'string') {
        setSelectedProfessionalCertifications(currentProfile.professional_certifications.split(',').map(s => s.trim()).filter(Boolean));
      }
      
      // Set other professional certifications
      setOtherProfessionalCertifications(currentProfile.other_professional_certifications || '');
    }
  }, [currentProfile]);

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const toggleSubject = (subject: string) => {
    setSelectedSubjects(prev => {
      if (prev.includes(subject)) {
        return prev.filter(s => s !== subject);
      } else {
        return [...prev, subject];
      }
    });
  };

  const toggleAgeGroup = (ageGroup: string) => {
    setSelectedAgeGroups(prev => {
      if (prev.includes(ageGroup)) {
        return prev.filter(s => s !== ageGroup);
      } else {
        return [...prev, ageGroup];
      }
    });
  };

  const toggleExamBoard = (examBoard: string) => {
    setSelectedExamBoards(prev => {
      if (prev.includes(examBoard)) {
        return prev.filter(s => s !== examBoard);
      } else {
        return [...prev, examBoard];
      }
    });
  };

  const toggleLearningDifficulty = (learningDifficulty: string) => {
    setSelectedLearningDifficulties(prev => {
      if (prev.includes(learningDifficulty)) {
        return prev.filter(s => s !== learningDifficulty);
      } else {
        return [...prev, learningDifficulty];
      }
    });
  };

  const toggleMethodology = (methodology: string) => {
    setSelectedMethodologies(prev => {
      if (prev.includes(methodology)) {
        return prev.filter(s => s !== methodology);
      } else {
        return [...prev, methodology];
      }
    });
  };

  const toggleLanguage = (language: string) => {
    setSelectedLanguages(prev => {
      if (prev.includes(language)) {
        return prev.filter(s => s !== language);
      } else {
        return [...prev, language];
      }
    });
  };

  const toggleProfessionalCertification = (certification: string) => {
    setSelectedProfessionalCertifications(prev => {
      if (prev.includes(certification)) {
        return prev.filter(s => s !== certification);
      } else {
        return [...prev, certification];
      }
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate at least one subject is selected
    if (selectedSubjects.length === 0) {
      setMessage({ type: 'error', text: 'Please select at least one subject' });
      return;
    }
    
    setSaving(true);
    setMessage(null);

    try {
      const profileData = {
        ...formData,
        subjects: selectedSubjects,
        other_subjects: otherSubjects,
        age_groups: selectedAgeGroups,
        exam_boards: selectedExamBoards,
        other_exam_boards: otherExamBoards,
        learning_difficulties: selectedLearningDifficulties,
        other_learning_difficulties: otherLearningDifficulties,
        methodologies: selectedMethodologies,
        other_methodologies: otherMethodologies,
        languages: selectedLanguages,
        other_languages: otherLanguages,
        professional_certifications: selectedProfessionalCertifications,
        other_professional_certifications: otherProfessionalCertifications,
        hourly_rate: formData.hourly_rate ? parseFloat(formData.hourly_rate) : null,
        experience_years: formData.experience_years ? parseInt(formData.experience_years) : null,
      };

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-cbd74580/profiles/${tutorId}`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(profileData),
        }
      );

      if (response.ok) {
        setMessage({
          type: 'success',
          text: String(currentProfile?.verificationStatus || '').toLowerCase() === 'verified'
            ? 'Profile updated successfully! You remain verified. Changes to your name, qualifications, certifications or subjects are re-checked by our team in the background.'
            : 'Profile updated successfully! Your changes have been submitted for admin verification. You will be notified once reviewed.',
        });
        if (onProfileUpdated) {
          onProfileUpdated();
        }
      } else {
        const error = await response.json();
        setMessage({ type: 'error', text: error.error || 'Failed to update profile' });
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      setMessage({ type: 'error', text: 'An error occurred while updating your profile' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {message && (
        <Alert className={message.type === 'success' ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}>
          {message.type === 'success' ? (
            <CheckCircle className="h-4 w-4 text-green-600" />
          ) : (
            <AlertCircle className="h-4 w-4 text-red-600" />
          )}
          <AlertDescription className={message.type === 'success' ? 'text-green-800' : 'text-red-800'}>
            {message.text}
          </AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5" />
              Basic Information
            </CardTitle>
            <CardDescription>Update your personal details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="full_name">Full Name *</Label>
                <Input
                  id="full_name"
                  value={formData.full_name}
                  onChange={(e) => handleChange('full_name', e.target.value)}
                  placeholder="John Doe"
                  required
                />
              </div>
              <div>
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleChange('email', e.target.value)}
                  placeholder="john@example.com"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => handleChange('phone', e.target.value)}
                  placeholder="+44 7700 900000"
                />
              </div>
              <div>
                <Label htmlFor="location">Location</Label>
                <Input
                  id="location"
                  value={formData.location}
                  onChange={(e) => handleChange('location', e.target.value)}
                  placeholder="London, UK"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Professional Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="w-5 h-5" />
              Professional Information
            </CardTitle>
            <CardDescription>Tell students about your teaching experience</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="bio">Bio / About Me *</Label>
              <Textarea
                id="bio"
                value={formData.bio}
                onChange={(e) => handleChange('bio', e.target.value)}
                placeholder="Tell students about yourself, your teaching philosophy, and what makes you a great tutor..."
                rows={5}
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                This will be displayed on your profile to help parents and students learn about you
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="hourly_rate">Hourly Rate (₦) *</Label>
                <Input
                  id="hourly_rate"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.hourly_rate}
                  onChange={(e) => handleChange('hourly_rate', e.target.value)}
                  placeholder="25.00"
                  required
                />
              </div>
              <div>
                <Label htmlFor="experience_years">Years of Experience</Label>
                <Input
                  id="experience_years"
                  type="number"
                  min="0"
                  value={formData.experience_years}
                  onChange={(e) => handleChange('experience_years', e.target.value)}
                  placeholder="5"
                />
              </div>
            </div>

            <div>
              <Label>Subjects * ({selectedSubjects.length} selected)</Label>
              <div className="mt-2 p-4 border rounded-lg bg-gray-50 max-h-80 overflow-y-auto">
                <div className="flex flex-wrap gap-2">
                  {AVAILABLE_SUBJECTS.map(subject => {
                    const isSelected = selectedSubjects.includes(subject);
                    return (
                      <button
                        key={subject}
                        type="button"
                        onClick={() => toggleSubject(subject)}
                        className={`px-3 py-1.5 rounded-full text-sm transition-all ${
                          isSelected
                            ? 'bg-[#625d9c] text-white hover:bg-[#524d8a]'
                            : 'bg-white border border-gray-300 text-gray-700 hover:border-[#625d9c] hover:text-[#625d9c]'
                        }`}
                      >
                        {subject}
                      </button>
                    );
                  })}
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Click to select or deselect subjects. You must select at least one subject.
              </p>
            </div>

            {/* Other Subjects Input Field */}
            {selectedSubjects.includes('Others') && (
              <div>
                <Label htmlFor="other_subjects">Other Subjects</Label>
                <Input
                  id="other_subjects"
                  value={otherSubjects}
                  onChange={(e) => setOtherSubjects(e.target.value)}
                  placeholder="e.g., Yoruba, Igbo, Agricultural Science, etc. (comma-separated)"
                  className="mt-1"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Type any additional subjects not listed above, separated by commas
                </p>
              </div>
            )}

            <div>
              <Label htmlFor="teaching_style">Teaching Style</Label>
              <Textarea
                id="teaching_style"
                value={formData.teaching_style}
                onChange={(e) => handleChange('teaching_style', e.target.value)}
                placeholder="Describe your teaching approach and methodology..."
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        {/* Qualifications */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="w-5 h-5" />
              Qualifications & Certifications
            </CardTitle>
            <CardDescription>List your educational background and certifications</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="qualifications">Qualifications *</Label>
              <Textarea
                id="qualifications"
                value={formData.qualifications}
                onChange={(e) => handleChange('qualifications', e.target.value)}
                placeholder="BSc Mathematics - University of Oxford&#10;PGCE Secondary Mathematics&#10;QTS (Qualified Teacher Status)"
                rows={5}
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                List each qualification on a new line
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Professional Certifications & Registrations */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="w-5 h-5" />
              Professional Certifications & Registrations
            </CardTitle>
            <CardDescription>
              Select your professional teaching certifications, exam boards, and regulatory body registrations
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Professional Certifications ({selectedProfessionalCertifications.length} selected)</Label>
              <div className="mt-2 p-4 border rounded-lg bg-gray-50 max-h-96 overflow-y-auto">
                {/* Nigerian Certifications Section */}
                <div className="mb-4">
                  <p className="text-xs font-medium text-gray-600 mb-2 uppercase tracking-wide">🇳🇬 Nigerian Certifications</p>
                  <div className="flex flex-wrap gap-2 mb-3">
                    {PROFESSIONAL_CERTIFICATIONS.slice(0, 8).map(cert => {
                      const isSelected = selectedProfessionalCertifications.includes(cert);
                      return (
                        <button
                          key={cert}
                          type="button"
                          onClick={() => toggleProfessionalCertification(cert)}
                          className={`px-3 py-1.5 rounded-full text-sm transition-all ${
                            isSelected
                              ? 'bg-[#5d9827] text-white hover:bg-[#4d8217]'
                              : 'bg-white border border-gray-300 text-gray-700 hover:border-[#5d9827] hover:text-[#5d9827]'
                          }`}
                        >
                          {cert}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* African Certifications Section */}
                <div className="mb-4">
                  <p className="text-xs font-medium text-gray-600 mb-2 uppercase tracking-wide">🌍 African Certifications</p>
                  <div className="flex flex-wrap gap-2 mb-3">
                    {PROFESSIONAL_CERTIFICATIONS.slice(8, 16).map(cert => {
                      const isSelected = selectedProfessionalCertifications.includes(cert);
                      return (
                        <button
                          key={cert}
                          type="button"
                          onClick={() => toggleProfessionalCertification(cert)}
                          className={`px-3 py-1.5 rounded-full text-sm transition-all ${
                            isSelected
                              ? 'bg-[#625d9c] text-white hover:bg-[#524d8a]'
                              : 'bg-white border border-gray-300 text-gray-700 hover:border-[#625d9c] hover:text-[#625d9c]'
                          }`}
                        >
                          {cert}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* UK & International Certifications Section */}
                <div className="mb-4">
                  <p className="text-xs font-medium text-gray-600 mb-2 uppercase tracking-wide">🇬🇧 UK & International Certifications</p>
                  <div className="flex flex-wrap gap-2 mb-3">
                    {PROFESSIONAL_CERTIFICATIONS.slice(16, 25).map(cert => {
                      const isSelected = selectedProfessionalCertifications.includes(cert);
                      return (
                        <button
                          key={cert}
                          type="button"
                          onClick={() => toggleProfessionalCertification(cert)}
                          className={`px-3 py-1.5 rounded-full text-sm transition-all ${
                            isSelected
                              ? 'bg-[#625d9c] text-white hover:bg-[#524d8a]'
                              : 'bg-white border border-gray-300 text-gray-700 hover:border-[#625d9c] hover:text-[#625d9c]'
                          }`}
                        >
                          {cert}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Other Professional Bodies Section */}
                <div>
                  <p className="text-xs font-medium text-gray-600 mb-2 uppercase tracking-wide">🏛️ Other Professional Bodies</p>
                  <div className="flex flex-wrap gap-2">
                    {PROFESSIONAL_CERTIFICATIONS.slice(25).map(cert => {
                      const isSelected = selectedProfessionalCertifications.includes(cert);
                      return (
                        <button
                          key={cert}
                          type="button"
                          onClick={() => toggleProfessionalCertification(cert)}
                          className={`px-3 py-1.5 rounded-full text-sm transition-all ${
                            isSelected
                              ? 'bg-[#5d9827] text-white hover:bg-[#4d8217]'
                              : 'bg-white border border-gray-300 text-gray-700 hover:border-[#5d9827] hover:text-[#5d9827]'
                          }`}
                        >
                          {cert}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Select all professional certifications and regulatory registrations you hold. These help build trust with parents.
              </p>
              
              {/* Other Professional Certifications Input Field */}
              {selectedProfessionalCertifications.includes('Others') && (
                <div className="mt-4">
                  <Label htmlFor="other_professional_certifications">Other Professional Certifications</Label>
                  <Input
                    id="other_professional_certifications"
                    value={otherProfessionalCertifications}
                    onChange={(e) => setOtherProfessionalCertifications(e.target.value)}
                    placeholder="e.g., State Teaching License, National Board Certification, etc. (comma-separated)"
                    className="mt-1"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Type any additional professional certifications not listed above, separated by commas
                  </p>
                </div>
              )}
            </div>

            {/* Important Notice */}
            <div className="bg-purple-50 border border-purple-200 p-4 rounded-lg">
              <div className="flex items-start gap-3">
                <Award className="w-5 h-5 text-[#625d9c] mt-0.5 flex-shrink-0" />
                <div className="text-sm text-purple-900">
                  <p className="font-medium mb-1">Why Professional Certifications Matter</p>
                  <ul className="text-xs space-y-1 list-disc list-inside">
                    <li><strong>TRCN</strong>: Required for registered teachers in Nigeria</li>
                    <li><strong>WAEC/NECO</strong>: Shows familiarity with Nigerian examination standards</li>
                    <li><strong>QTS/PGCE</strong>: UK teaching qualifications recognized globally</li>
                    <li><strong>Cambridge CELTA/DELTA</strong>: For English language teaching specialists</li>
                  </ul>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Certificates & Documents */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Certificates & Documents
            </CardTitle>
            <CardDescription>
              Upload certificates, degrees, and supporting documents to verify your qualifications
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Upload Area — click or drag & drop, multiple files at a time */}
            <div
              onDragEnter={handleDragEnter}
              onDragOver={(e) => e.preventDefault()}
              onDragLeave={handleDragLeave}
              onDrop={handleCertificateDrop}
              className={`border-2 border-dashed rounded-lg p-6 transition-colors ${
                isDraggingFiles ? 'border-[#625d9c] bg-purple-50/60' : 'border-gray-300 hover:border-[#625d9c]'
              }`}
            >
              <div className="flex flex-col items-center gap-3">
                <div className="p-3 bg-purple-50 rounded-full">
                  <Upload className="w-6 h-6 text-[#625d9c]" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium text-gray-700 mb-1">
                    {isDraggingFiles ? 'Drop your files here' : 'Upload Certificates & Documents'}
                  </p>
                  <p className="text-xs text-gray-500 mb-3">
                    Drag and drop or browse — PDF, PNG, JPG up to 5MB each. You can select several at once.
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  disabled={uploading}
                  className="border-[#625d9c] text-[#625d9c] hover:bg-[#625d9c] hover:text-white"
                  onClick={() => certificateInputRef.current?.click()}
                >
                  {uploading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
                  {uploading ? 'Uploading...' : 'Choose Files'}
                </Button>
                <input
                  ref={certificateInputRef}
                  id="certificate-upload"
                  type="file"
                  accept=".pdf,.png,.jpg,.jpeg,application/pdf,image/png,image/jpeg"
                  multiple
                  className="hidden"
                  onChange={handleCertificateSelect}
                />
              </div>
            </div>

            {/* Per-file upload progress; failed rows stay until retried or dismissed */}
            {uploadQueue.length > 0 && (
              <div className="space-y-2">
                {uploadQueue.map((item) => (
                  <div key={item.id} className={`p-3 rounded-lg border ${item.status === 'error' ? 'bg-red-50 border-red-200' : 'bg-white border-gray-200'}`}>
                    <div className="flex items-center gap-3">
                      {item.status === 'uploading' && <Loader2 className="w-4 h-4 text-[#625d9c] animate-spin flex-shrink-0" />}
                      {item.status === 'queued' && <Clock className="w-4 h-4 text-gray-400 flex-shrink-0" />}
                      {item.status === 'success' && <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />}
                      {item.status === 'error' && <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />}
                      <div className="min-w-0 flex-1">
                        <p className="text-sm text-gray-800 truncate">{item.file.name}</p>
                        <p className="text-xs text-gray-500">
                          {item.status === 'error' ? item.error
                            : item.status === 'queued' ? `Queued • ${formatFileSize(item.file.size)}`
                            : `${item.progress}% • ${formatFileSize(item.file.size)}`}
                        </p>
                      </div>
                      {item.status === 'error' && (
                        <>
                          <Button type="button" variant="ghost" size="sm" disabled={uploading} onClick={() => retryUpload(item.id)}>
                            <RefreshCw className="w-4 h-4 mr-1" />Retry
                          </Button>
                          <Button type="button" variant="ghost" size="sm" onClick={() => dismissQueueItem(item.id)} aria-label={`Dismiss ${item.file.name}`}>
                            <X className="w-4 h-4" />
                          </Button>
                        </>
                      )}
                    </div>
                    {(item.status === 'uploading' || item.status === 'queued') && (
                      <Progress value={item.progress} className="h-1.5 mt-2" />
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Info Notice */}
            <div className="bg-amber-50 border border-amber-200 p-4 rounded-lg">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-amber-900">
                  <p className="font-medium mb-1">Upload Instructions</p>
                  <ul className="text-xs space-y-1 list-disc list-inside">
                    <li>Upload clear, legible copies of your certificates</li>
                    <li>Accepted formats: PDF, PNG, JPG (max 5MB per file)</li>
                    <li>Recommended: Degree certificates, teaching qualifications, DBS certificate</li>
                    <li>Documents help parents verify your credentials and increase bookings</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Uploaded documents */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Uploaded Documents ({certificates.length})</Label>
                {certificates.length > 0 && (
                  <span className="text-xs text-gray-500">{certificates.length} of {MAX_CERTIFICATES} slots used</span>
                )}
              </div>
              {loadingCertificates ? (
                <div className="text-sm text-gray-500 text-center py-6 bg-gray-50 rounded-lg border border-gray-200">
                  Loading documents...
                </div>
              ) : certificates.length === 0 ? (
                <div className="text-sm text-gray-500 text-center py-6 bg-gray-50 rounded-lg border border-gray-200">
                  No documents uploaded yet. Upload your certificates to speed up verification.
                </div>
              ) : (
                <div className="space-y-2">
                  {certificates.map((doc) => (
                    <div key={doc.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                      <FileText className="w-5 h-5 text-[#625d9c] flex-shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-gray-800 truncate">{doc.title || doc.fileName}</p>
                        <p className="text-xs text-gray-500">
                          {formatFileSize(doc.fileSize)}
                          {doc.createdAt ? ` • Uploaded ${new Date(doc.createdAt).toLocaleDateString()}` : ''}
                        </p>
                      </div>
                      <Button type="button" variant="ghost" size="sm" onClick={() => downloadCertificate(doc.id)} aria-label={`Download ${doc.title || doc.fileName}`}>
                        <Download className="w-4 h-4" />
                      </Button>
                      <Button type="button" variant="ghost" size="sm" className="text-red-600 hover:text-red-700 hover:bg-red-50" onClick={() => deleteCertificate(doc.id, doc.title || doc.fileName)} aria-label={`Delete ${doc.title || doc.fileName}`}>
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Benefits Notice */}
            <div className="bg-green-50 border border-green-200 p-4 rounded-lg">
              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-green-900">
                  <p className="font-medium mb-1">Why Upload Certificates?</p>
                  <ul className="text-xs space-y-1 list-disc list-inside">
                    <li>Verified profiles get 3x more bookings</li>
                    <li>Parents prefer tutors with documented qualifications</li>
                    <li>Increases your profile visibility in search results</li>
                    <li>Builds trust and credibility with potential students</li>
                  </ul>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Teaching Preferences - For Smart Matching */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="w-5 h-5" />
              Teaching Preferences
            </CardTitle>
            <CardDescription>Help us match you with the right students</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Age Groups ({selectedAgeGroups.length} selected)</Label>
              <div className="mt-2 p-4 border rounded-lg bg-gray-50">
                <div className="flex flex-wrap gap-2">
                  {AGE_GROUPS.map(ageGroup => {
                    const isSelected = selectedAgeGroups.includes(ageGroup);
                    return (
                      <button
                        key={ageGroup}
                        type="button"
                        onClick={() => toggleAgeGroup(ageGroup)}
                        className={`px-3 py-1.5 rounded-full text-sm transition-all ${
                          isSelected
                            ? 'bg-[#5d9827] text-white hover:bg-[#4d8217]'
                            : 'bg-white border border-gray-300 text-gray-700 hover:border-[#5d9827] hover:text-[#5d9827]'
                        }`}
                      >
                        {ageGroup}
                      </button>
                    );
                  })}
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Select the age groups you prefer to teach
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="group_size">Group Size Preference *</Label>
                <select
                  id="group_size"
                  value={formData.group_size}
                  onChange={(e) => handleChange('group_size', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#625d9c]"
                  required
                >
                  <option value="">Select preference...</option>
                  {GROUP_SIZES.map(size => (
                    <option key={size} value={size}>{size}</option>
                  ))}
                </select>
              </div>
              <div>
                <Label htmlFor="max_students">Maximum Students</Label>
                <Input
                  id="max_students"
                  type="number"
                  min="1"
                  value={formData.max_students}
                  onChange={(e) => handleChange('max_students', e.target.value)}
                  placeholder="15"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Total students you can take
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Exam Boards & Specializations */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="w-5 h-5" />
              Exam Boards & Specializations
            </CardTitle>
            <CardDescription>Specify your areas of expertise</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Exam Boards ({selectedExamBoards.length} selected)</Label>
              <div className="mt-2 p-4 border rounded-lg bg-gray-50">
                <div className="flex flex-wrap gap-2">
                  {EXAM_BOARDS.map(board => {
                    const isSelected = selectedExamBoards.includes(board);
                    return (
                      <button
                        key={board}
                        type="button"
                        onClick={() => toggleExamBoard(board)}
                        className={`px-3 py-1.5 rounded-full text-sm transition-all ${
                          isSelected
                            ? 'bg-[#625d9c] text-white hover:bg-[#524d8a]'
                            : 'bg-white border border-gray-300 text-gray-700 hover:border-[#625d9c] hover:text-[#625d9c]'
                        }`}
                      >
                        {board}
                      </button>
                    );
                  })}
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Select the exam boards you're familiar with
              </p>
              
              {/* Other Exam Boards Input Field */}
              {selectedExamBoards.includes('Others') && (
                <div className="mt-4">
                  <Label htmlFor="other_exam_boards">Other Exam Boards</Label>
                  <Input
                    id="other_exam_boards"
                    value={otherExamBoards}
                    onChange={(e) => setOtherExamBoards(e.target.value)}
                    placeholder="e.g., WAEC, NECO, NABTEB, etc. (comma-separated)"
                    className="mt-1"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Type any additional exam boards not listed above, separated by commas
                  </p>
                </div>
              )}
            </div>

            <div>
              <Label>Learning Difficulties Support ({selectedLearningDifficulties.length} selected)</Label>
              <div className="mt-2 p-4 border rounded-lg bg-gray-50">
                <div className="flex flex-wrap gap-2">
                  {LEARNING_DIFFICULTIES.map(difficulty => {
                    const isSelected = selectedLearningDifficulties.includes(difficulty);
                    return (
                      <button
                        key={difficulty}
                        type="button"
                        onClick={() => toggleLearningDifficulty(difficulty)}
                        className={`px-3 py-1.5 rounded-full text-sm transition-all ${
                          isSelected
                            ? 'bg-[#5d9827] text-white hover:bg-[#4d8217]'
                            : 'bg-white border border-gray-300 text-gray-700 hover:border-[#5d9827] hover:text-[#5d9827]'
                        }`}
                      >
                        {difficulty}
                      </button>
                    );
                  })}
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Select any learning difficulties you have experience supporting
              </p>
              
              {/* Other Learning Difficulties Input Field */}
              {selectedLearningDifficulties.includes('Others') && (
                <div className="mt-4">
                  <Label htmlFor="other_learning_difficulties">Other Learning Difficulties</Label>
                  <Input
                    id="other_learning_difficulties"
                    value={otherLearningDifficulties}
                    onChange={(e) => setOtherLearningDifficulties(e.target.value)}
                    placeholder="e.g., Sensory Processing Disorder, Down Syndrome, etc. (comma-separated)"
                    className="mt-1"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Type any additional learning difficulties you support, separated by commas
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Teaching Methodologies & Languages */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="w-5 h-5" />
              Teaching Methods & Languages
            </CardTitle>
            <CardDescription>Share your teaching approach and language skills</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Teaching Methodologies ({selectedMethodologies.length} selected)</Label>
              <div className="mt-2 p-4 border rounded-lg bg-gray-50">
                <div className="flex flex-wrap gap-2">
                  {TEACHING_METHODOLOGIES.map(methodology => {
                    const isSelected = selectedMethodologies.includes(methodology);
                    return (
                      <button
                        key={methodology}
                        type="button"
                        onClick={() => toggleMethodology(methodology)}
                        className={`px-3 py-1.5 rounded-full text-sm transition-all ${
                          isSelected
                            ? 'bg-[#625d9c] text-white hover:bg-[#524d8a]'
                            : 'bg-white border border-gray-300 text-gray-700 hover:border-[#625d9c] hover:text-[#625d9c]'
                        }`}
                      >
                        {methodology}
                      </button>
                    );
                  })}
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Select your preferred teaching methods and learning styles
              </p>
              
              {/* Other Methodologies Input Field */}
              {selectedMethodologies.includes('Others') && (
                <div className="mt-4">
                  <Label htmlFor="other_methodologies">Other Teaching Methodologies</Label>
                  <Input
                    id="other_methodologies"
                    value={otherMethodologies}
                    onChange={(e) => setOtherMethodologies(e.target.value)}
                    placeholder="e.g., Montessori Method, Waldorf Education, etc. (comma-separated)"
                    className="mt-1"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Type any additional teaching methodologies not listed above, separated by commas
                  </p>
                </div>
              )}
            </div>

            <div>
              <Label>Languages Spoken ({selectedLanguages.length} selected)</Label>
              <div className="mt-2 p-4 border rounded-lg bg-gray-50">
                <div className="flex flex-wrap gap-2">
                  {LANGUAGES_SPOKEN.map(language => {
                    const isSelected = selectedLanguages.includes(language);
                    return (
                      <button
                        key={language}
                        type="button"
                        onClick={() => toggleLanguage(language)}
                        className={`px-3 py-1.5 rounded-full text-sm transition-all ${
                          isSelected
                            ? 'bg-[#5d9827] text-white hover:bg-[#4d8217]'
                            : 'bg-white border border-gray-300 text-gray-700 hover:border-[#5d9827] hover:text-[#5d9827]'
                        }`}
                      >
                        {language}
                      </button>
                    );
                  })}
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Select all languages you can speak fluently
              </p>
              
              {/* Other Languages Input Field */}
              <div className="mt-4">
                <Label htmlFor="other_languages">Other Languages</Label>
                <Input
                  id="other_languages"
                  value={otherLanguages}
                  onChange={(e) => setOtherLanguages(e.target.value)}
                  placeholder="e.g., Yoruba, Igbo, Swahili, etc. (comma-separated)"
                  className="mt-1"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Type any additional languages not listed above, separated by commas
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Payout Account Details */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="w-5 h-5" />
              Payout Account Details
            </CardTitle>
            <CardDescription>
              Add your bank account information to receive payments for completed sessions
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Bank Account Section */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b">
                <CreditCard className="w-4 h-4 text-[#625d9c]" />
                <h4 className="font-medium">Bank Account (Primary)</h4>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="bank_name">Bank Name</Label>
                  <select
                    id="bank_name"
                    value={formData.bank_name}
                    onChange={(e) => handleChange('bank_name', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#625d9c]"
                  >
                    <option value="">Select your bank...</option>
                    {NIGERIAN_BANKS.map(bank => (
                      <option key={bank} value={bank}>{bank}</option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    Select the bank where you hold your account
                  </p>
                </div>

                <div>
                  <Label htmlFor="account_type">Account Type</Label>
                  <select
                    id="account_type"
                    value={formData.account_type}
                    onChange={(e) => handleChange('account_type', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#625d9c]"
                  >
                    <option value="">Select account type...</option>
                    {ACCOUNT_TYPES.map(type => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="account_number">Account Number</Label>
                  <Input
                    id="account_number"
                    type="text"
                    value={formData.account_number}
                    onChange={(e) => handleChange('account_number', e.target.value)}
                    placeholder="0123456789"
                    maxLength={10}
                    pattern="[0-9]*"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    10-digit bank account number
                  </p>
                </div>

                <div>
                  <Label htmlFor="account_name">Account Holder Name</Label>
                  <Input
                    id="account_name"
                    type="text"
                    value={formData.account_name}
                    onChange={(e) => handleChange('account_name', e.target.value)}
                    placeholder="Full name as shown on account"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Must match your bank account name
                  </p>
                </div>
              </div>
            </div>

            {/* Mobile Money Section (Alternative) */}
            <div className="space-y-4 pt-4 border-t">
              <div className="flex items-center gap-2 pb-2">
                <Phone className="w-4 h-4 text-[#5d9827]" />
                <h4 className="font-medium">Mobile Money (Alternative)</h4>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="mobile_money_provider">Mobile Money Provider</Label>
                  <select
                    id="mobile_money_provider"
                    value={formData.mobile_money_provider}
                    onChange={(e) => handleChange('mobile_money_provider', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#5d9827]"
                  >
                    <option value="">Select provider (optional)...</option>
                    {MOBILE_MONEY_PROVIDERS.map(provider => (
                      <option key={provider} value={provider}>{provider}</option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    Optional: For mobile money payments
                  </p>
                </div>

                <div>
                  <Label htmlFor="mobile_money_number">Mobile Money Number</Label>
                  <Input
                    id="mobile_money_number"
                    type="tel"
                    value={formData.mobile_money_number}
                    onChange={(e) => handleChange('mobile_money_number', e.target.value)}
                    placeholder="+234 800 000 0000"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Your registered mobile money number
                  </p>
                </div>
              </div>
            </div>

            {/* Security Notice */}
            <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-blue-900">
                  <p className="font-medium mb-1">Secure & Confidential</p>
                  <p className="text-xs">
                    Your payout information is encrypted and securely stored. We use industry-standard security protocols to protect your financial data. Account details are only used for processing your earnings from completed tutoring sessions.
                  </p>
                </div>
              </div>
            </div>

            {/* Payout Information */}
            <div className="bg-green-50 border border-green-200 p-4 rounded-lg">
              <div className="flex items-start gap-3">
                <DollarSign className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-green-900">
                  <p className="font-medium mb-1">Payout Information</p>
                  <ul className="text-xs space-y-1 list-disc list-inside">
                    <li>Tutors receive 80% of session fees (Knowledge Fons Academy takes 20%)</li>
                    <li>Payouts are processed weekly for completed sessions</li>
                    <li>Subject-based rates: ₦14,000 - ₦28,000 per session</li>
                    <li>Minimum payout threshold: ₦5,000</li>
                  </ul>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Submit Button */}
        <div className="flex justify-end gap-4">
          <Button
            type="submit"
            disabled={saving}
            className="text-white"
            style={{ backgroundColor: '#625d9c' }}
          >
            {saving ? 'Saving...' : 'Save Profile'}
          </Button>
        </div>
      </form>
    </div>
  );
}