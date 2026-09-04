import { Hono } from 'npm:hono@4';
import * as kv from './kv_store.tsx';
import * as db from './db.tsx';
import {
  assertDocumentShareAllowed,
  parseChildIdsQuery,
  userCanAccessDocument,
} from './document-share-access.tsx';
import {
  bookingIdentityIdsForUser,
  collectBookingsForUser,
  MESSAGING_BOOKING_STATUSES,
} from './messaging-access.tsx';

function roleDisplayLabel(role: string): string {
  const r = (role || '').toLowerCase();
  if (r === 'tutor') return 'Tutor';
  if (r === 'parent') return 'Parent / guardian';
  if (r === 'student') return 'Student';
  if (r === 'child') return 'Student';
  return r ? r.charAt(0).toUpperCase() + r.slice(1) : 'User';
}

/** Best-effort display name from a booking row (KV shape often includes tutorName, etc.). */
function nameFromBookingRow(raw: Record<string, unknown>, peerId: string): string | undefined {
  const tid = (raw.tutorId ?? raw.tutor_id) as string | undefined;
  if (tid === peerId) {
    const n =
      raw.tutorFullName ||
      raw.tutorName ||
      (raw.tutorFirstName && raw.tutorLastName
        ? `${raw.tutorFirstName} ${raw.tutorLastName}`
        : raw.tutorFirstName);
    const s = n != null ? String(n).trim() : '';
    if (s) return s;
  }
  const sid = (raw.studentId ?? raw.student_id) as string | undefined;
  if (sid === peerId) {
    const n =
      raw.studentFullName ||
      raw.studentName ||
      (raw.studentFirstName && raw.studentLastName
        ? `${raw.studentFirstName} ${raw.studentLastName}`
        : raw.studentFirstName);
    const s = n != null ? String(n).trim() : '';
    if (s) return s;
  }
  const pid = (raw.parentId ?? raw.userId ?? raw.user_id) as string | undefined;
  if (pid === peerId) {
    const n =
      raw.parentFullName ||
      raw.parentName ||
      (raw.parentFirstName && raw.parentLastName
        ? `${raw.parentFirstName} ${raw.parentLastName}`
        : raw.parentFirstName);
    const s = n != null ? String(n).trim() : '';
    if (s) return s;
  }
  return undefined;
}

async function peerNameFromActiveBookings(viewerId: string, peerId: string): Promise<string> {
  const rows = await collectBookingsForUser(viewerId);
  for (const raw of rows) {
    const st = String((raw as Record<string, unknown>).status || '').toLowerCase();
    if (!MESSAGING_BOOKING_STATUSES.has(st)) continue;
    const hit = nameFromBookingRow(raw as Record<string, unknown>, peerId);
    if (hit) return hit;
  }
  return '';
}

export const documentsRoutes = (app: Hono, getUserId: Function, supabase: any) => {

  // Upload a document
  app.post('/make-server-cbd74580/documents/upload', async (c) => {
    try {
      const accessToken = c.req.header('Authorization')?.split(' ')[1];
      const userId = await getUserId(accessToken ?? null);

      if (!userId) {
        return c.json({ error: 'Unauthorized' }, 401);
      }

      const formData = await c.req.formData();
      const file = formData.get('file') as File;
      const documentType = formData.get('documentType') as string;
      const relatedToId = formData.get('relatedToId') as string;
      const relatedToType = formData.get('relatedToType') as string;
      const title = formData.get('title') as string;
      const description = formData.get('description') as string;
      const uploadedByRole = (formData.get('uploadedByRole') as string || '').toLowerCase();
      // Recipient: the user (or child profile) this document is meant for — type must be tutor|parent|student|child
      const sharedWithId = (formData.get('sharedWithId') as string)?.trim() || '';
      const sharedWithType = ((formData.get('sharedWithType') as string) || '').toLowerCase();

      if (!file) {
        return c.json({ error: 'No file provided' }, 400);
      }

      // Validate file size (max 25MB)
      if (file.size > 25 * 1024 * 1024) {
        return c.json({ error: 'File size exceeds 25MB limit' }, 400);
      }

      // Validate filename to prevent malicious files
      const lowerOriginalName = file.name.toLowerCase();
      const dangerousExtensions = ['.exe', '.bat', '.cmd', '.sh', '.ps1', '.vbs', '.js', '.jar', '.zip', '.rar', '.7z', '.tar', '.gz'];
      const hasDangerousExt = dangerousExtensions.some((ext) => lowerOriginalName.endsWith(ext));
      
      if (hasDangerousExt) {
        return c.json({ error: 'File type not allowed. Executable and archive files are prohibited.' }, 400);
      }

      // Extension-first type validation
      const ALLOWED_EXTENSIONS: Record<string, string[]> = {
        '.pdf': ['application/pdf', 'application/x-pdf'],
        '.jpg': ['image/jpeg', 'image/jpg', 'image/pjpeg'],
        '.jpeg': ['image/jpeg', 'image/jpg', 'image/pjpeg'],
        '.png': ['image/png'],
        '.gif': ['image/gif'],
        '.webp': ['image/webp'],
        '.heic': ['image/heic', 'image/heif', 'image/heic-sequence', 'application/octet-stream'],
        '.heif': ['image/heic', 'image/heif', 'image/heif-sequence', 'application/octet-stream'],
        '.doc': ['application/msword'],
        '.docx': [
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'application/msword',
        ],
      };

      const fileExt = '.' + (file.name.split('.').pop()?.toLowerCase() || '');
      const expectedMimes = ALLOWED_EXTENSIONS[fileExt];
      if (!expectedMimes) {
        return c.json({
          error: 'Invalid file type. Please upload a PDF, image (.jpg, .png, .gif, .webp, .heic), or document (.doc, .docx).',
        }, 400);
      }

      // MIME advisory check
      const mime = (file.type || '').toLowerCase();
      if (mime && !expectedMimes.includes(mime)) {
        const isImageExt = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.heic', '.heif'].includes(fileExt);
        const familyOk = isImageExt ? (mime.startsWith('image/') || mime === 'application/octet-stream') : mime.startsWith('application/');
        if (!familyOk) {
          return c.json({ error: 'File content does not match its extension.' }, 400);
        }
      }

      // Create bucket if it doesn't exist
      const bucketName = 'make-cbd74580-documents';
      const { data: buckets } = await supabase.storage.listBuckets();
      const bucketExists = buckets?.some((bucket: any) => bucket.name === bucketName);
      
      if (!bucketExists) {
        await supabase.storage.createBucket(bucketName, { public: false });
      }

      // Upload file to Supabase Storage (use a distinct name — `fileExt` above is the dotted extension for validation)
      const uploadExt = file.name.split('.').pop() || 'bin';
      const storageObjectName = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${uploadExt}`;
      const filePath = `${userId}/${storageObjectName}`;

      const fileBuffer = await file.arrayBuffer();
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from(bucketName)
        .upload(filePath, fileBuffer, {
          contentType: file.type,
          upsert: false,
        });

      if (uploadError) {
        console.error('Error uploading to Supabase Storage:', uploadError);
        return c.json({ error: 'Failed to upload file' }, 500);
      }

      // Get uploader's name
      let uploadedByName = 'User';
      try {
        const uploaderProfile = await kv.get(`user:${userId}`) as any;
        if (uploaderProfile) {
          if (uploaderProfile.full_name) uploadedByName = uploaderProfile.full_name;
          else if (uploaderProfile.firstName && uploaderProfile.lastName) 
            uploadedByName = `${uploaderProfile.firstName} ${uploaderProfile.lastName}`;
          else if (uploaderProfile.firstName) uploadedByName = uploaderProfile.firstName;
          else if (uploaderProfile.email) uploadedByName = uploaderProfile.email.split('@')[0];
        }
      } catch (e) {
        console.error('Error fetching uploader profile:', e);
      }

      // Get shared with user's name if applicable
      let sharedWithName = '';
      if (sharedWithId && sharedWithId !== '') {
        try {
          if (sharedWithType === 'child') {
            const ch = (await kv.get(`child:${sharedWithId}`)) as Record<string, unknown> | null;
            if (ch) {
              sharedWithName =
                (ch.firstName && ch.lastName
                  ? `${ch.firstName} ${ch.lastName}`
                  : String(ch.firstName || ch.name || 'Student')) as string;
            }
          } else {
            const sharedWithProfile = (await kv.get(`user:${sharedWithId}`)) as Record<string, unknown> | null;
            if (sharedWithProfile) {
              if (sharedWithProfile.full_name) sharedWithName = String(sharedWithProfile.full_name);
              else if (sharedWithProfile.firstName && sharedWithProfile.lastName)
                sharedWithName = `${sharedWithProfile.firstName} ${sharedWithProfile.lastName}`;
              else if (sharedWithProfile.firstName) sharedWithName = String(sharedWithProfile.firstName);
              else if (sharedWithProfile.email) sharedWithName = String(sharedWithProfile.email).split('@')[0];
            }
          }
        } catch (e) {
          console.error('Error fetching shared with profile:', e);
        }
        if (!sharedWithName.trim()) {
          sharedWithName = await peerNameFromActiveBookings(userId, sharedWithId);
        }
      }

      // Create document metadata
      const document = {
        id: `document:${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        title: title || file.name,
        description: description || '',
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
        filePath: uploadData.path,
        bucketName,
        uploadedBy: userId,
        uploadedByName,
        uploadedByRole,
        documentType,
        relatedToId,
        relatedToType: relatedToType || uploadedByRole,
        sharedWithId,
        sharedWithName,
        sharedWithType: sharedWithId ? sharedWithType || 'user' : '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await kv.set(document.id, document);

      // Create audit log
      const logEntry = {
        id: `document-log:${Date.now()}`,
        documentId: document.id,
        userId,
        action: 'document_uploaded',
        timestamp: new Date().toISOString(),
      };
      await kv.set(logEntry.id, logEntry);

      return c.json({ document });
    } catch (error: any) {
      console.error('Error uploading document:', error);
      return c.json({ error: error.message || 'Internal server error' }, 500);
    }
  });

  // Helper function to get profile name
  const getProfileName = async (profileUserId: string): Promise<string> => {
    try {
      const profile = await kv.get(`user:${profileUserId}`) as any;
      if (profile) {
        if (profile.full_name) return profile.full_name;
        if (profile.firstName && profile.lastName) return `${profile.firstName} ${profile.lastName}`;
        if (profile.firstName) return profile.firstName;
        if (profile.email) return profile.email.split('@')[0];
      }
    } catch (e) {
      console.error('Error getting profile name:', e);
    }
    try {
      const p = await db.getProfile(profileUserId);
      if (p) {
        if (p.full_name) return String(p.full_name);
        if (p.fullName) return String(p.fullName);
        if (p.firstName && p.lastName) return `${p.firstName} ${p.lastName}`;
        if (p.firstName) return String(p.firstName);
        if (p.email) return String(p.email).split('@')[0];
      }
    } catch {
      /* Postgres optional */
    }
    return '';
  };

  // Get documents for a user
  app.get('/make-server-cbd74580/documents', async (c) => {
    try {
      const accessToken = c.req.header('Authorization')?.split(' ')[1];
      const userId = await getUserId(accessToken ?? null);

      if (!userId) {
        return c.json({ error: 'Unauthorized' }, 401);
      }

      const documentType = c.req.query('documentType'); // Optional filter
      const relatedToId = c.req.query('relatedToId'); // Optional filter
      const userRole = (c.req.query('userRole') || 'parent').toLowerCase();
      const childIds = parseChildIdsQuery(c.req.query('childIds'));

      const allDocuments = await kv.getByPrefix('document:');

      const visibility: boolean[] = await Promise.all(
        allDocuments.map((doc: Record<string, unknown>) => userCanAccessDocument(doc, userId, userRole, childIds)),
      );
      let userDocuments = allDocuments.filter((_: unknown, i: number) => visibility[i]);
      // Soft-deleted documents stay in the audit trail but disappear from normal lists
      userDocuments = userDocuments.filter((doc: any) => doc.status !== 'deleted');

      // Apply filters
      if (documentType) {
        userDocuments = userDocuments.filter((doc: any) => doc.documentType === documentType);
      }

      if (relatedToId) {
        userDocuments = userDocuments.filter((doc: any) => doc.relatedToId === relatedToId);
      }

      // Enrich documents with profile names + recipient-facing attribution
      const enrichedDocuments = await Promise.all(userDocuments.map(async (doc: any) => {
        const enriched = { ...doc };

        if (doc.uploadedBy) {
          const rawName = await getProfileName(doc.uploadedBy);
          enriched.uploadedByName = rawName || 'User';
        }

        if (doc.sharedWithId && doc.sharedWithId !== '') {
          if (String(doc.sharedWithType || '').toLowerCase() === 'child') {
            try {
              const ch = (await kv.get(`child:${doc.sharedWithId}`)) as Record<string, unknown> | null;
              let sw = ch
                ? (ch.firstName && ch.lastName
                    ? `${ch.firstName} ${ch.lastName}`
                    : String(ch.firstName || ch.name || '').trim())
                : '';
              if (!sw) sw = await getProfileName(doc.sharedWithId);
              enriched.sharedWithName = sw || '';
            } catch {
              enriched.sharedWithName = (await getProfileName(doc.sharedWithId)) || '';
            }
          } else {
            let sw = await getProfileName(doc.sharedWithId);
            if (!sw) sw = await peerNameFromActiveBookings(userId, String(doc.sharedWithId));
            enriched.sharedWithName = sw || '';
          }
        }

        const myIds = await bookingIdentityIdsForUser(userId);
        const sharedWithStr = String(doc.sharedWithId || '').trim();
        const uploadedByStr = String(doc.uploadedBy || '');
        let imRecipient = !!sharedWithStr && myIds.some((id) => id === sharedWithStr);
        if (
          !imRecipient &&
          userRole === 'parent' &&
          childIds.length > 0 &&
          sharedWithStr &&
          childIds.includes(sharedWithStr)
        ) {
          imRecipient = true;
        }
        const imNotUploader = uploadedByStr !== userId;
        if (imRecipient && imNotUploader) {
          let src = await getProfileName(uploadedByStr);
          if (!src) src = await peerNameFromActiveBookings(userId, uploadedByStr);
          const rl = roleDisplayLabel(String(doc.uploadedByRole || ''));
          enriched.shareSourceSummary = src
            ? `Shared by ${src} (${rl})`
            : `Shared with you (${rl})`;
        }

        return enriched;
      }));

      // Sort by most recent
      enrichedDocuments.sort((a: any, b: any) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

      return c.json({ documents: enrichedDocuments });
    } catch (error: any) {
      console.error('Error fetching documents:', error);
      return c.json({ error: error.message || 'Internal server error' }, 500);
    }
  });

  // Get a signed URL to download a document
  app.get('/make-server-cbd74580/documents/:documentId/download', async (c) => {
    try {
      const accessToken = c.req.header('Authorization')?.split(' ')[1];
      const userId = await getUserId(accessToken ?? null);

      if (!userId) {
        return c.json({ error: 'Unauthorized' }, 401);
      }

      const documentId = c.req.param('documentId');
      const document = (await kv.get(documentId)) as Record<string, unknown> | null;

      if (!document) {
        return c.json({ error: 'Document not found' }, 404);
      }

      const userRole = (c.req.query('userRole') || 'parent').toLowerCase();
      if ((document as any).status === 'deleted' && userRole !== 'admin') {
        return c.json({ error: 'Document not found' }, 404);
      }
      const childIds = parseChildIdsQuery(c.req.query('childIds'));
      const hasAccess = await userCanAccessDocument(document, userId, userRole, childIds);

      if (!hasAccess) {
        return c.json({ error: 'Unauthorized to access this document' }, 403);
      }

      // Generate signed URL (valid for 1 hour)
      const { data: signedUrlData, error: signedUrlError } = await supabase.storage
        .from(document.bucketName)
        .createSignedUrl(document.filePath, 3600); // 1 hour

      if (signedUrlError) {
        console.error('Error creating signed URL:', signedUrlError);
        return c.json({ error: 'Failed to generate download URL' }, 500);
      }

      // Create audit log
      const logEntry = {
        id: `document-download-log:${Date.now()}`,
        documentId,
        userId,
        action: 'document_downloaded',
        timestamp: new Date().toISOString(),
      };
      await kv.set(logEntry.id, logEntry);

      return c.json({ 
        downloadUrl: signedUrlData.signedUrl,
        fileName: document.fileName,
      });
    } catch (error: any) {
      console.error('Error generating download URL:', error);
      return c.json({ error: error.message || 'Internal server error' }, 500);
    }
  });

  // Delete a document
  app.delete('/make-server-cbd74580/documents/:documentId', async (c) => {
    try {
      const accessToken = c.req.header('Authorization')?.split(' ')[1];
      const userId = await getUserId(accessToken ?? null);

      if (!userId) {
        return c.json({ error: 'Unauthorized' }, 401);
      }

      const documentId = c.req.param('documentId');
      const document = await kv.get(documentId) as any;

      if (!document || document.status === 'deleted') {
        return c.json({ error: 'Document not found' }, 404);
      }

      const callerProfile = await kv.get(`user:${userId}`) as any;
      const callerIsAdmin = String(callerProfile?.role || '').toLowerCase() === 'admin';

      // Only the uploader (or an admin) can delete a document.
      if (!callerIsAdmin && document.uploadedBy !== userId) {
        return c.json({ error: 'Unauthorized to delete this document' }, 403);
      }

      // Soft delete: the file and metadata are kept for the document audit
      // trail — a "deleted" document should still show up there with who
      // uploaded/shared/deleted it and when, for security and safeguarding
      // reasons. This only hides it from normal document lists and blocks
      // further downloads by non-admins; an admin can still see and download
      // it via the audit trail.
      await kv.set(documentId, {
        ...document,
        status: 'deleted',
        deletedAt: new Date().toISOString(),
        deletedBy: userId,
      });

      // Create audit log
      const logEntry = {
        id: `document-delete-log:${Date.now()}`,
        documentId,
        userId,
        action: 'document_deleted',
        timestamp: new Date().toISOString(),
      };
      await kv.set(logEntry.id, logEntry);

      return c.json({ success: true });
    } catch (error: any) {
      console.error('Error deleting document:', error);
      return c.json({ error: error.message || 'Internal server error' }, 500);
    }
  });

  // Document exchange audit trail (admin only) — every upload, download, and
  // deletion across the whole document store, with sender/recipient and
  // document details resolved so it reads as a real activity log rather than
  // raw KV rows. Soft-deleted documents are included on purpose: the point of
  // this trail is that "deleting" a document doesn't erase the record of it.
  app.get('/make-server-cbd74580/admin/documents/audit-trail', async (c) => {
    try {
      const accessToken = c.req.header('Authorization')?.split(' ')[1];
      const userId = await getUserId(accessToken ?? null);
      if (!userId) return c.json({ error: 'Unauthorized' }, 401);

      const callerProfile = await kv.get(`user:${userId}`) as any;
      if (String(callerProfile?.role || '').toLowerCase() !== 'admin') {
        return c.json({ error: 'Admin access required' }, 403);
      }

      // Upload events are built straight from the document records below (richer
      // than document-log:, which only has {documentId, userId, timestamp}).
      const [allDocuments, downloadLogs, deleteLogs] = await Promise.all([
        kv.getByPrefix('document:'),
        kv.getByPrefix('document-download-log:'),
        kv.getByPrefix('document-delete-log:'),
      ]);

      const docById = new Map<string, any>(allDocuments.map((d: any) => [d.id, d]));
      const actorNameCache = new Map<string, string>();
      const resolveActorName = async (actorId: string): Promise<string> => {
        if (!actorId) return 'Unknown';
        if (!actorNameCache.has(actorId)) {
          actorNameCache.set(actorId, (await getProfileName(actorId)) || 'Unknown');
        }
        return actorNameCache.get(actorId)!;
      };

      type AuditEvent = {
        id: string;
        documentId: string;
        documentTitle: string;
        fileName: string;
        documentType: string;
        action: 'uploaded' | 'downloaded' | 'deleted';
        actorName: string;
        actorRole: string;
        sender: string;
        senderRole: string;
        recipient: string;
        recipientType: string;
        timestamp: string;
      };

      const eventFromLog = async (
        log: any,
        action: 'uploaded' | 'downloaded' | 'deleted',
      ): Promise<AuditEvent | null> => {
        const doc = docById.get(log.documentId);
        if (!doc) return null; // referenced document no longer exists at all
        return {
          id: log.id,
          documentId: doc.id,
          documentTitle: doc.title || doc.fileName || 'Untitled document',
          fileName: doc.fileName || '',
          documentType: doc.documentType || '',
          action,
          actorName: await resolveActorName(log.userId),
          actorRole: log.userId === doc.uploadedBy ? doc.uploadedByRole : '',
          sender: doc.uploadedByName || 'Unknown',
          senderRole: doc.uploadedByRole || '',
          recipient: doc.sharedWithId ? (doc.sharedWithName || 'Unknown') : '—',
          recipientType: doc.sharedWithType || '',
          timestamp: log.timestamp,
        };
      };

      const uploadEvents: AuditEvent[] = allDocuments.map((doc: any) => ({
        id: `${doc.id}-uploaded`,
        documentId: doc.id,
        documentTitle: doc.title || doc.fileName || 'Untitled document',
        fileName: doc.fileName || '',
        documentType: doc.documentType || '',
        action: 'uploaded',
        actorName: doc.uploadedByName || 'Unknown',
        actorRole: doc.uploadedByRole || '',
        sender: doc.uploadedByName || 'Unknown',
        senderRole: doc.uploadedByRole || '',
        recipient: doc.sharedWithId ? (doc.sharedWithName || 'Unknown') : '—',
        recipientType: doc.sharedWithType || '',
        timestamp: doc.createdAt,
      }));

      const [downloadEvents, deleteEvents] = await Promise.all([
        Promise.all(downloadLogs.map((log: any) => eventFromLog(log, 'downloaded'))),
        Promise.all(deleteLogs.map((log: any) => eventFromLog(log, 'deleted'))),
      ]);

      const events = [
        ...uploadEvents,
        ...downloadEvents.filter((e): e is AuditEvent => e !== null),
        ...deleteEvents.filter((e): e is AuditEvent => e !== null),
      ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

      return c.json({ events });
    } catch (error: any) {
      console.error('Error building document audit trail:', error);
      return c.json({ error: error.message || 'Internal server error' }, 500);
    }
  });
};
