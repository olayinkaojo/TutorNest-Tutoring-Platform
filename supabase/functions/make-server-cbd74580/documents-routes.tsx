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
      const documentType = formData.get('documentType') as string; // 'assignment', 'review', 'resource', 'other'
      const relatedToId = formData.get('relatedToId') as string; // booking ID, student ID, etc.
      const relatedToType = formData.get('relatedToType') as string; // 'booking', 'student', 'tutor'
      const title = formData.get('title') as string;
      const description = formData.get('description') as string;
      const uploadedByRole = formData.get('uploadedByRole') as string;

      if (!file) {
        return c.json({ error: 'No file provided' }, 400);
      }

      // Validate file size (max 25MB)
      if (file.size > 25 * 1024 * 1024) {
        return c.json({ error: 'File size exceeds 25MB limit' }, 400);
      }

      // Validate file type (documents only)
      const allowedTypes = [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-powerpoint',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'text/plain',
        'image/jpeg',
        'image/png',
        'image/gif',
      ];

      if (!allowedTypes.includes(file.type)) {
        return c.json({ error: 'Invalid file type. Only documents and images are allowed.' }, 400);
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
        uploadedByRole,
        documentType,
        relatedToId,
        relatedToType,
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

      // Get all documents
      const allDocuments = await kv.getByPrefix('document:');

      // Filter documents accessible by this user
      let userDocuments = allDocuments.filter((doc: any) => {
        // User can see documents they uploaded
        if (doc.uploadedBy === userId) return true;
        
        // User can see documents related to them
        if (doc.relatedToId === userId) return true;
        
        // TODO: Add more access control logic based on relationships
        // (e.g., tutor can see student's documents if they have sessions together)
        
        return false;
      });

      // Apply filters
      if (documentType) {
        userDocuments = userDocuments.filter((doc: any) => doc.documentType === documentType);
      }

      if (relatedToId) {
        userDocuments = userDocuments.filter((doc: any) => doc.relatedToId === relatedToId);
      }

      // Sort by most recent
      userDocuments.sort((a: any, b: any) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

      return c.json({ documents: userDocuments });
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
        document.relatedToId === userId;
        // TODO: Add more access control logic

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
