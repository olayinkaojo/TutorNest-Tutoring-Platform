/** Shared signup/onboarding utilities (parent, student, tutor flows). */

export const TUTOR_ONBOARDING_DRAFT_KEY = 'tutornest_tutor_onboarding_v1';
export const PARENT_ONBOARDING_DRAFT_KEY = 'tutornest_parent_onboarding_v1';
export const STUDENT_ONBOARDING_DRAFT_KEY = 'tutornest_student_onboarding_v1';

export function passwordStrength(password: string): { score: number; label: string; bar: number } {
  if (!password) return { score: 0, label: '', bar: 0 };
  let pts = 0;
  if (password.length >= 8) pts++;
  if (password.length >= 12) pts++;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) pts++;
  if (/\d/.test(password)) pts++;
  if (/[^A-Za-z0-9]/.test(password)) pts++;
  const bar = Math.min(100, Math.round((pts / 5) * 100));
  const label =
    pts <= 1 ? 'Weak' : pts === 2 ? 'Fair' : pts === 3 ? 'Good' : pts >= 4 ? 'Strong' : 'Fair';
  return { score: pts, label: password ? label : '', bar };
}

/** Minimum score (0–5) we accept before allowing signup to proceed — matches tutor onboarding. */
export const MIN_PASSWORD_STRENGTH_SCORE = 2;

export function isPasswordStrongEnough(password: string): boolean {
  return passwordStrength(password).score >= MIN_PASSWORD_STRENGTH_SCORE;
}
