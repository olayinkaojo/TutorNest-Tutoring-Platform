import { Hono } from 'npm:hono@4';
import * as kv from './kv_store.tsx';

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
      const uploadedByRole = formData.get('uploadedByRole') as string;
      // Recipient: the user (or child) this document is shared with
      const sharedWithId = formData.get('sharedWithId') as string || '';
      const sharedWithType = formData.get('sharedWithType') as string || relatedToType;

      if (!file) {
        return c.json({ error: 'No file provided' }, 400);
      }

      // Validate file size (max 25MB)
      if (file.size > 25 * 1024 * 1024) {
        return c.json({ error: 'File size exceeds 25MB limit' }, 400);
      }

      // Validate file type: ONLY images, PDF, and safe documents
      const ALLOWED_MIME_TYPES = new Set([
        'application/pdf',                                                    // PDF
        'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp',  // Images
        'application/msword',                                                 // .doc
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',  // .docx
      ]);

      if (!ALLOWED_MIME_TYPES.has(file.type)) {
        return c.json({ error: 'Invalid file type. Only PDF, images (.jpg, .png, .gif, .webp), and documents (.doc, .docx) are allowed.' }, 400);
      }

      // Validate filename to prevent malicious files
      const fileName = file.name.toLowerCase();
      const dangerousExtensions = ['.exe', '.bat', '.cmd', '.sh', '.ps1', '.vbs', '.js', '.jar', '.zip', '.rar', '.7z', '.tar', '.gz'];
      const hasDangerousExt = dangerousExtensions.some(ext => fileName.endsWith(ext));
      
      if (hasDangerousExt) {
        return c.json({ error: 'File type not allowed. Executable and archive files are prohibited.' }, 400);
      }

      // Additional validation: check that the MIME type matches the file extension
      const fileExt = '.' + file.name.split('.').pop()?.toLowerCase();
      const validExtensions: Record<string, string[]> = {
        'application/pdf': ['.pdf'],
        'image/jpeg': ['.jpg', '.jpeg'],
        'image/png': ['.png'],
        'image/gif': ['.gif'],
        'image/webp': ['.webp'],
        'application/msword': ['.doc'],
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      };

      const allowedExts = validExtensions[file.type] || [];
      if (!allowedExts.includes(fileExt)) {
        return c.json({ error: 'File extension does not match file type. Possible security risk.' }, 400);
      }

      // Create bucket if it doesn't exist
      const bucketName = 'make-cbd74580-documents';
      const { data: buckets } = await supabase.storage.listBuckets();
      const bucketExists = buckets?.some((bucket: any) => bucket.name === bucketName);
      
      if (!bucketExists) {
        await supabase.storage.createBucket(bucketName, { public: false });
      }

      // Upload file to Supabase Storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${fileExt}`;
      const filePath = `${userId}/${fileName}`;

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
          const sharedWithProfile = await kv.get(`user:${sharedWithId}`) as any;
          if (sharedWithProfile) {
            if (sharedWithProfile.full_name) sharedWithName = sharedWithProfile.full_name;
            else if (sharedWithProfile.firstName && sharedWithProfile.lastName)
              sharedWithName = `${sharedWithProfile.firstName} ${sharedWithProfile.lastName}`;
            else if (sharedWithProfile.firstName) sharedWithName = sharedWithProfile.firstName;
            else if (sharedWithProfile.email) sharedWithName = sharedWithProfile.email.split('@')[0];
          }
        } catch (e) {
          console.error('Error fetching shared with profile:', e);
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
        relatedToType,
        sharedWithId,
        sharedWithName,
        sharedWithType,
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
  const getProfileName = async (userId: string): Promise<string> => {
    try {
      const profile = await kv.get(`user:${userId}`) as any;
      if (profile) {
        // Try different name formats
        if (profile.full_name) return profile.full_name;
        if (profile.firstName && profile.lastName) return `${profile.firstName} ${profile.lastName}`;
        if (profile.firstName) return profile.firstName;
        if (profile.email) return profile.email.split('@')[0]; // fallback to email prefix
      }
    } catch (e) {
      console.error('Error getting profile name:', e);
    }
    return 'User'; // ultimate fallback
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
      const userRole = c.req.query('userRole'); // Current role (parent, tutor, student, admin)

      // Get all documents
      const allDocuments = await kv.getByPrefix('document:');

      // Filter documents accessible by this user based on their current role
      let userDocuments = allDocuments.filter((doc: any) => {
        // Case 1: Own documents uploaded in current role (role-based isolation)
        if (doc.uploadedBy === userId && doc.uploadedByRole === userRole) {
          return true;
        }

        // Case 2: Students see documents explicitly shared with them
        if (userRole === 'student' && doc.sharedWithId === userId) {
          return true;
        }

        // Case 3: Tutors see documents explicitly shared with them
        if (userRole === 'tutor' && doc.sharedWithId === userId) {
          return true;
        }

        // Case 4: Parents see documents from tutors that are shared with parent context
        // (intended for parents' children - tutors upload for parent's kids)
        if (userRole === 'parent' && doc.uploadedByRole === 'tutor' && doc.sharedWithType === 'parent') {
          return true;
        }

        return false;
      });

      // Apply filters
      if (documentType) {
        userDocuments = userDocuments.filter((doc: any) => doc.documentType === documentType);
      }

      if (relatedToId) {
        userDocuments = userDocuments.filter((doc: any) => doc.relatedToId === relatedToId);
      }

      // Enrich documents with profile names
      const enrichedDocuments = await Promise.all(userDocuments.map(async (doc: any) => {
        const enriched = { ...doc };
        
        // Add uploadedByName
        if (doc.uploadedBy) {
          enriched.uploadedByName = await getProfileName(doc.uploadedBy);
        }
        
        // Add sharedWithName
        if (doc.sharedWithId && doc.sharedWithId !== '') {
          enriched.sharedWithName = await getProfileName(doc.sharedWithId);
          enriched.sharedWithType = doc.relatedToType; // e.g., 'parent', 'tutor', 'student'
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
      const document = await kv.get(documentId) as any;

      if (!document) {
        return c.json({ error: 'Document not found' }, 404);
      }

      // Check if user has access to this document
      const hasAccess =
        document.uploadedBy === userId ||
        document.relatedToId === userId ||
        document.sharedWithId === userId;

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

      if (!document) {
        return c.json({ error: 'Document not found' }, 404);
      }

      // Only the uploader can delete
      if (document.uploadedBy !== userId) {
        return c.json({ error: 'Unauthorized to delete this document' }, 403);
      }

      // Delete from Supabase Storage
      const { error: deleteError } = await supabase.storage
        .from(document.bucketName)
        .remove([document.filePath]);

      if (deleteError) {
        console.error('Error deleting from storage:', deleteError);
        // Continue anyway to delete metadata
      }

      // Delete metadata
      await kv.del(documentId);

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
};
