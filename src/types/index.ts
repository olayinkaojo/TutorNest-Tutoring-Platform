// Shared type definitions for TutorNest application

export type UserRole = 'parent' | 'student' | 'tutor' | null;

export interface ParentProfile {
  contactPhone?: string;
  address?: string;
  emergencyContact?: string;
  paymentMethod?: string;
  numberOfChildren?: number;
}

export interface StudentProfile {
  dateOfBirth?: string;
  gradeLevel?: string;
  schoolName?: string;
  learningGoals?: string;
  subjects?: string[]
  hasSEN?: boolean;
  senDetails?: string;
  learningPreferences?: string;
}

export interface TutorProfile {
  qualifications?: string;
  subjects?: string[];
  experience?: string;
  hourlyRate?: string;
  availability?: string;
  bio?: string;
  certifications?: string[];
}

export interface UserProfile {
  userId: string;
  email: string;
  name: string;
  role: UserRole;
  profileData?: ParentProfile | StudentProfile | TutorProfile;
  createdAt: string;
  updatedAt: string;
}

// Coupons & Credits Types
export interface Coupon {
  id: string;
  code: string;
  type: 'percentage' | 'fixed';
  value: number;
  description: string;
  expiryDate: string;
  usageLimit: number;
  usageCount: number;
  eligibleTiers: string[];
  isActive: boolean;
  createdAt: string;
  createdBy: string;
}

export interface CouponUsage {
  couponId: string;
  couponCode: string;
  userId: string;
  usedAt: string;
  discountAmount: number;
  tierId: string;
}

export interface ReferralCredit {
  id: string;
  inviterId: string;
  inviterEmail: string;
  inviteeId?: string;
  inviteeEmail: string;
  status: 'pending' | 'completed' | 'expired';
  creditAmount: number;
  appliedAt?: string;
  expiryDate: string;
  createdAt: string;
}

export interface UserCredit {
  userId: string;
  totalCredits: number;
  availableCredits: number;
  usedCredits: number;
  history: CreditTransaction[];
}

export interface CreditTransaction {
  id: string;
  type: 'earned' | 'applied' | 'expired';
  amount: number;
  source: string;
  description: string;
  date: string;
  referralId?: string;
}

// Tax & Invoicing Types
export interface VATRate {
  country: string;
  countryCode: string;
  rate: number;
  type: 'standard' | 'reduced' | 'zero';
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  userId: string;
  userEmail: string;
  userName: string;
  userAddress?: string;
  subscriptionId?: string;
  tierId?: string;
  tierName?: string;
  items: InvoiceItem[];
  subtotal: number;
  vatRate: number;
  vatAmount: number;
  discounts: InvoiceDiscount[];
  totalDiscounts: number;
  creditsApplied: number;
  total: number;
  currency: string;
  status: 'draft' | 'issued' | 'paid' | 'void';
  issueDate: string;
  dueDate: string;
  paidDate?: string;
  paymentMethod?: string;
  notes?: string;
  createdAt: string;
}

export interface InvoiceItem {
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface InvoiceDiscount {
  type: 'coupon' | 'credit' | 'promotion';
  code?: string;
  description: string;
  amount: number;
}

export interface TaxReport {
  id: string;
  reportType: 'monthly' | 'quarterly' | 'yearly';
  startDate: string;
  endDate: string;
  totalRevenue: number;
  totalVAT: number;
  totalDiscounts: number;
  totalRefunds: number;
  netRevenue: number;
  invoiceCount: number;
  breakdown: {
    byCountry: Record<string, { revenue: number; vat: number; count: number }>;
    byTier: Record<string, { revenue: number; count: number }>;
  };
  createdAt: string;
  createdBy: string;
}