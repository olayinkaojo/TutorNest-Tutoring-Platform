// Dashboard-specific types for Parent, Tutor, and Admin views

export interface Child {
  id: string;
  firstName: string;
  lastName: string;
  gradeLevel: string;
  subjects?: string[];
  learningGoals?: string;
  completedLessons?: number;
  achievements?: unknown[];
  dateOfBirth?: string;
}

export interface Tutor {
  id: string;
  userId?: string;
  name: string;
  headline?: string;
  location?: string;
  rating: number;
  dbsVerified: boolean;
  experienceYears?: number;
  bio?: string;
  avatar?: string;
  responseRate?: number;
  subjects: string[];
  teachingStyle?: string;
  ageGroups?: string[];
  classes?: string[];
  examBoards?: string[];
  insuranceStatus?: string;
  hourlyRate?: number;
  languages?: string[];
}

export interface BookingData {
  id: string;
  studentId: string;
  studentName: string;
  tutorId: string;
  tutorName?: string;
  subject: string;
  date: string;
  time: string;
  duration: number; // minutes
  price: number;
  status: 'confirmed' | 'completed' | 'cancelled' | 'pending';
  googleMeetLink?: string;
  createdAt: string;
  updatedAt: string;
  cancelledAt?: string;
  cancellationReason?: string;
}

export interface SessionReport {
  id: string;
  sessionId: string;
  bookingId: string;
  tutorId: string;
  tutorName?: string;
  studentId: string;
  studentName: string;
  subject: string;
  date: string;
  duration: number;
  topicsCovered: string;
  studentPerformance: string;
  strengths: string;
  areasForImprovement: string;
  homeworkAssigned: string;
  nextSessionPlan: string;
  behaviorNotes?: string;
  overallRating: number;
  progressStatus: 'excellent' | 'good' | 'satisfactory' | 'needs-attention';
  attendance: 'present' | 'late' | 'absent';
  engagement: number; // 1-5
  comprehension: number; // 1-5
  participation: number; // 1-5
  videoRecordingUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProgressMetrics {
  studentId: string;
  studentName: string;
  timeframe: '7days' | '30days' | '90days' | 'alltime';
  overallScore: number;
  scoresbySubject: Record<string, number>;
  sessionsCompleted: number;
  lessonsBooked: number;
  avgEngagement: number;
  avgComprehension: number;
  avgParticipation: number;
  strengths: string[];
  areasForImprovement: string[];
  progressTrend: 'improving' | 'stable' | 'declining';
  lastUpdated: string;
}

export interface Curriculum {
  id: string;
  gradeLevel: string;
  subject: string;
  title: string;
  description?: string;
  pdfUrl?: string;
  fileSize?: number;
  pages?: number;
  topics?: string[];
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
  timeToComplete?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Payment {
  id: string;
  bookingId: string;
  parentId: string;
  tutorId: string;
  amount: number;
  currency: string;
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  paymentMethod: string;
  transactionId?: string;
  refundAmount?: number;
  refundStatus?: 'pending' | 'completed' | 'failed';
  createdAt: string;
  updatedAt: string;
}

export interface APIResponse<T> {
  data?: T;
  error?: string;
  message?: string;
  success: boolean;
}

export interface APIError {
  code: string;
  message: string;
  status: number;
  details?: unknown;
}

export interface PaginatedResponse<T> {
  data: T[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface FilterState {
  subject?: string;
  level?: string;
  availability?: string;
  minPrice?: number;
  maxPrice?: number;
  minRating?: number;
  dbsVerified?: boolean;
  sortBy?: 'rating' | 'price' | 'experience' | 'new';
  sortOrder?: 'asc' | 'desc';
}

export interface SessionState {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  user?: {
    id: string;
    email: string;
  };
}
