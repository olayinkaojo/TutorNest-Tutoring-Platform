/**
 * Currency utility functions for TutorNest
 * All amounts are handled in Naira (NGN / ₦)
 */

export const CURRENCY_CODE = 'NGN';
export const CURRENCY_SYMBOL = '₦';

/**
 * Format amount in Naira with proper symbol and thousands separator
 * @param amount - Amount in Naira
 * @param includeDecimals - Whether to include decimal places (default: true)
 * @returns Formatted string e.g., "₦20,000.00"
 */
export function formatNaira(amount: number, includeDecimals: boolean = true): string {
  const formatted = new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: CURRENCY_CODE,
    minimumFractionDigits: includeDecimals ? 2 : 0,
    maximumFractionDigits: includeDecimals ? 2 : 0,
  }).format(amount);
  
  // Replace NGN with ₦ symbol
  return formatted.replace('NGN', '₦').replace(/NGN\s*/, '₦');
}

/**
 * Convert Naira to kobo (for legacy Paystack API reference)
 * Flutterwave uses direct Naira amounts
 * Paystack expected amounts in kobo (₦1 = 100 kobo)
 */
export function nairaToKobo(amount: number): number {
  return Math.round(amount * 100);
}

/**
 * Convert kobo to Naira (from legacy Paystack API reference)
 */
export function koboToNaira(kobo: number): number {
  return kobo / 100;
}

/**
 * Get subject-based session rate
 * Returns the standard rate in Naira based on subject complexity
 */
export function getSubjectRate(subject: string): number {
  const subjectLower = subject.toLowerCase();
  
  // Complex subjects (₦28,000 per session)
  const complexSubjects = [
    'further mathematics',
    'further maths',
    'physics',
    'chemistry',
    'advanced mathematics',
    'calculus',
    'statistics',
    'computer science',
    'programming',
  ];
  
  // Medium complexity (₦21,000 per session)
  const mediumSubjects = [
    'mathematics',
    'maths',
    'biology',
    'economics',
    'accounting',
    'geography',
    'literature',
  ];
  
  // Check for complex subjects
  if (complexSubjects.some(s => subjectLower.includes(s))) {
    return 28000;
  }
  
  // Check for medium subjects
  if (mediumSubjects.some(s => subjectLower.includes(s))) {
    return 21000;
  }
  
  // Basic subjects (₦14,000 per session)
  return 14000;
}

/**
 * Calculate revenue split for tutoring session
 * Platform takes 20%, tutor receives 80%
 */
export function calculateRevenueSplit(totalAmount: number): {
  tutorAmount: number;
  platformAmount: number;
  tutorPercentage: number;
  platformPercentage: number;
} {
  const tutorAmount = Math.round(totalAmount * 0.8);
  const platformAmount = Math.round(totalAmount * 0.2);
  
  return {
    tutorAmount,
    platformAmount,
    tutorPercentage: 80,
    platformPercentage: 20,
  };
}

/**
 * Parse Naira amount from string (handles various formats)
 */
export function parseNairaAmount(amountStr: string): number {
  // Remove currency symbols and whitespace
  const cleaned = amountStr
    .replace(/₦/g, '')
    .replace(/NGN/gi, '')
    .replace(/,/g, '')
    .trim();
  
  const amount = parseFloat(cleaned);
  return isNaN(amount) ? 0 : amount;
}

/**
 * Validate Naira amount
 */
export function isValidNairaAmount(amount: number): boolean {
  return typeof amount === 'number' && 
         !isNaN(amount) && 
         isFinite(amount) && 
         amount >= 0;
}
