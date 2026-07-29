import { Hono } from 'npm:hono@4';
import * as kv from './kv_store.tsx';

/**
 * Extra admin verification endpoints.
 *
 * The existing /admin/verifications/pending only surfaces tutors whose
 * verificationStatus is exactly 'pending', so already-verified, rejected, or
 * legacy tutors (no status set) can never be reviewed. These endpoints let an
 * admin browse EVERY tutor and see the certificates a tutor uploaded from the
 * profile tab (documentType 'tutor_certificate'), which live in the generic
 * document store rather than on the profile record.
 *
 * The existing POST /admin/verifications/:userId/review already works for any
 * tutor (it creates the verification record if absent), so no change is needed
 * there — this only fills the discovery gap.
 *
 * Self-contained admin check so it is safe whether or not the /admin/* guard
 * middleware is present on the deployment.
 */
export const adminVerificationExtraRoutes = (app: Hono, getUserId: Function) => {
  const requireAdmin = async (c: any): Promise<string | Response> => {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const userId = await getUserId(accessToken ?? null);
    if (!userId) return c.json({ error: 'Unauthorized' }, 401);
    const profile = (await kv.get(`user:${userId}`)) as { role?: string } | null;
    if (String(profile?.role || '').toLowerCase() !== 'admin') {
      return c.json({ error: 'Admin access required' }, 403);
    }
    return userId;
  };

  const resolveName = (t: any): string =>
    t.full_name || t.fullName || t.name ||
    `${t.firstName || ''} ${t.lastName || ''}`.trim() || t.email || 'Unknown Tutor';

  // List every tutor with their current verification status so an admin can
  // verify new OR existing tutors. Optional ?status= filter.
  app.get('/make-server-cbd74580/admin/tutors', async (c) => {
    try {
      const auth = await requireAdmin(c);
      if (auth instanceof Response) return auth;

      const statusFilter = (c.req.query('status') || '').toLowerCase(); // pending|verified|rejected|unverified

      const allUsers = await kv.getByPrefix('user:');
      const tutors = allUsers.filter((u: any) => u.role === 'tutor');

      // Shaped like /admin/verifications/pending so the dashboard reuses the same
      // detail + review panel. Legacy tutors may have no verificationStatus.
      const rows = tutors.map((t: any) => {
        const status = String(t.verificationStatus || 'unverified').toLowerCase();
        const resolvedName = resolveName(t);
        return {
          userId: t.id || t.userId,
          submittedAt: t.profileSubmittedAt || t.createdAt || null,
          status,
          verificationStatus: status,
          // A verified tutor who edited their profile stays verified but is flagged.
          reReviewRequested: t.reReviewRequested === true,
          verifiedAt: t.verifiedAt || null,
          reviewedAt: t.verifiedAt || t.rejectedAt || null,
          rejectionReason: t.rejectionReason || null,
          profile: { ...t, fullName: resolvedName, full_name: resolvedName, name: resolvedName },
        };
      });

      const filtered = statusFilter
        ? rows.filter((r) => r.verificationStatus === statusFilter)
        : rows;

      filtered.sort((a, b) => {
        // Pending first, then unverified, then the rest; newest submission within a group.
        const rank = (s: string) => (s === 'pending' ? 0 : s === 'unverified' ? 1 : 2);
        const d = rank(a.verificationStatus) - rank(b.verificationStatus);
        if (d !== 0) return d;
        return new Date(b.submittedAt || 0).getTime() - new Date(a.submittedAt || 0).getTime();
      });

      const counts = rows.reduce((acc: Record<string, number>, r) => {
        acc[r.verificationStatus] = (acc[r.verificationStatus] || 0) + 1;
        acc.total = (acc.total || 0) + 1;
        return acc;
      }, {});

      return c.json({ verifications: filtered, counts });
    } catch (error: any) {
      console.error('Error listing tutors for verification:', error);
      return c.json({ error: error.message || 'Internal server error' }, 500);
    }
  });

  // Certificates a specific tutor uploaded from their profile tab. Metadata only;
  // the client downloads each via the existing
  // GET /documents/:documentId/download?userRole=admin (admins are authorised there).
  app.get('/make-server-cbd74580/admin/tutors/:userId/documents', async (c) => {
    try {
      const auth = await requireAdmin(c);
      if (auth instanceof Response) return auth;

      const targetUserId = c.req.param('userId');
      const allDocs = await kv.getByPrefix('document:');

      const documents = allDocs
        .filter((d: any) =>
          d.uploadedBy === targetUserId &&
          (d.documentType === 'tutor_certificate' || d.relatedToType === 'tutor')
        )
        .map((d: any) => ({
          id: d.id,
          title: d.title || d.fileName,
          fileName: d.fileName,
          fileSize: d.fileSize,
          fileType: d.fileType,
          documentType: d.documentType,
          createdAt: d.createdAt,
        }))
        .sort((a: any, b: any) =>
          new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
        );

      return c.json({ documents });
    } catch (error: any) {
      console.error('Error listing tutor documents:', error);
      return c.json({ error: error.message || 'Internal server error' }, 500);
    }
  });
};
