import { z } from 'zod';

// ID Validation
export const idSchema = z.string().uuid('Invalid ID format');
export const optionalIdSchema = idSchema.optional();

// Common Fields
export const emailSchema = z.string().email('Invalid email address');
export const nameSchema = z.string().min(1, 'Name cannot be empty').max(255, 'Name too long');
export const urlSchema = z.string().url('Invalid URL');
export const dateSchema = z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/));

// Dashboard Validation

// Child Profile
export const childSchema = z.object({
  id: idSchema,
  firstName: nameSchema,
  lastName: nameSchema,
  gradeLevel: z.string().min(1, 'Grade level required'),
  subjects: z.array(z.string()).optional(),
  learningGoals: z.string().max(1000).optional(),
});

export type Child = z.infer<typeof childSchema>;

// Filter State
export const filterStateSchema = z.object({
  subject: z.string().optional(),
  level: z.string().optional(),
  availability: z.string().optional(),
  minPrice: z.number().min(0).optional(),
  maxPrice: z.number().min(0).optional(),
  minRating: z.number().min(0).max(5).optional(),
  dbsVerified: z.boolean().optional(),
  sortBy: z.enum(['rating', 'price', 'experience', 'new']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
});

export type FilterState = z.infer<typeof filterStateSchema>;

// Booking Data
export const bookingSchema = z.object({
  id: idSchema,
  studentId: idSchema,
  tutorId: idSchema,
  subject: z.string().min(1),
  date: dateSchema,
  time: z.string().regex(/^\d{2}:\d{2}$/, 'Invalid time format (HH:MM)'),
  duration: z.number().min(15).max(480), // 15 min to 8 hours
  price: z.number().min(0),
  status: z.enum(['confirmed', 'completed', 'cancelled', 'pending']),
});

export type Booking = z.infer<typeof bookingSchema>;

// Session Report
export const sessionReportSchema = z.object({
  id: idSchema,
  bookingId: idSchema,
  tutorId: idSchema,
  studentId: idSchema,
  subject: z.string(),
  topicsCovered: z.string(),
  studentPerformance: z.string(),
  strengths: z.string(),
  areasForImprovement: z.string(),
  overallRating: z.number().min(1).max(5),
  progressStatus: z.enum(['excellent', 'good', 'satisfactory', 'needs-attention']),
  attendance: z.enum(['present', 'late', 'absent']),
  engagement: z.number().min(1).max(5),
  comprehension: z.number().min(1).max(5),
  participation: z.number().min(1).max(5),
});

export type SessionReport = z.infer<typeof sessionReportSchema>;

// API Request/Response Validation

export const apiErrorSchema = z.object({
  code: z.string(),
  message: z.string(),
  status: z.number(),
  details: z.any().optional(),
});

export type APIError = z.infer<typeof apiErrorSchema>;

export const paginatedResponseSchema = z.object({
  data: z.array(z.any()),
  page: z.number().min(1),
  pageSize: z.number().min(1),
  total: z.number().min(0),
  totalPages: z.number().min(0),
});

// Validation Functions

export function validateChildId(id: unknown): string {
  return idSchema.parse(id);
}

export function validateTutorId(id: unknown): string {
  return idSchema.parse(id);
}

export function validateStudentId(id: unknown): string {
  return idSchema.parse(id);
}

export function validateFilter(filter: unknown): FilterState {
  return filterStateSchema.parse(filter ?? {});
}

export function validateBooking(booking: unknown): Booking {
  return bookingSchema.parse(booking);
}

export function validateSessionReport(report: unknown): SessionReport {
  return sessionReportSchema.parse(report);
}

export function validateEmail(email: unknown): string {
  return emailSchema.parse(email);
}

export function validateGradeLevel(level: unknown): string {
  const validLevels = [
    'nursery_1', 'nursery_2', 'nursery_3',
    'primary_1', 'primary_2', 'primary_3', 'primary_4', 'primary_5', 'primary_6',
    'secondary_7', 'secondary_8', 'secondary_9', 'secondary_10', 'secondary_11',
    'sixth_form_12', 'sixth_form_13',
  ];

  const schema = z.enum(validLevels as [string, ...string[]]);
  return schema.parse(level);
}

// Safe parsing functions that return null on error

export function safeValidateChildId(id: unknown): string | null {
  try {
    return validateChildId(id);
  } catch {
    return null;
  }
}

export function safeValidateFilter(filter: unknown): FilterState | null {
  try {
    return validateFilter(filter);
  } catch {
    return null;
  }
}

export function safeValidateSessionReport(report: unknown): SessionReport | null {
  try {
    return validateSessionReport(report);
  } catch {
    return null;
  }
}
