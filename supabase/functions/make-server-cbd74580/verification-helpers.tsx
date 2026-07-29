/**
 * Whether a tutor profile update touches verification-material fields — name,
 * qualifications, professional certifications, or subjects (incl. their free-text
 * "other_" companions). Cosmetic edits (bio, rate, availability, teaching style,
 * languages, payout details, …) return false so they don't trigger re-review.
 *
 * Only fields present on the incoming update are compared, so a partial update
 * can't spuriously look "changed" because it omitted a field.
 */
export function tutorMaterialFieldsChanged(existing: any, incoming: any): boolean {
  if (!existing) return true;

  const norm = (v: any) => String(v ?? '').trim().toLowerCase();
  const normList = (v: any) => {
    const arr = Array.isArray(v) ? v : (typeof v === 'string' ? v.split(',') : []);
    return arr.map((x: any) => String(x).trim().toLowerCase()).filter(Boolean).sort().join('|');
  };
  const nameOf = (p: any) => norm(p?.full_name || p?.fullName || `${p?.firstName ?? ''} ${p?.lastName ?? ''}`);

  // Name (only if the update carries any name info)
  if ((incoming?.full_name !== undefined || incoming?.firstName !== undefined || incoming?.lastName !== undefined)
      && nameOf(incoming) !== nameOf(existing)) return true;

  // Scalar credential field
  if (incoming?.qualifications !== undefined && norm(incoming.qualifications) !== norm(existing.qualifications)) return true;

  // List credential/subject fields (+ their free-text extras)
  if (incoming?.subjects !== undefined && normList(incoming.subjects) !== normList(existing.subjects)) return true;
  if (incoming?.other_subjects !== undefined && norm(incoming.other_subjects) !== norm(existing.other_subjects)) return true;
  if (incoming?.professional_certifications !== undefined
      && normList(incoming.professional_certifications) !== normList(existing.professional_certifications)) return true;
  if (incoming?.other_professional_certifications !== undefined
      && norm(incoming.other_professional_certifications) !== norm(existing.other_professional_certifications)) return true;

  return false;
}
