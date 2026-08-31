import { Hono } from 'npm:hono@4';
import { createClient } from 'npm:@supabase/supabase-js@2';

const app = new Hono();

import { requireAdmin } from './route-auth.tsx';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

/**
 * Curriculum documents are always stored keyed by the admin uploader's
 * 'year_1'..'year_13' values (CurriculumUploader.tsx). But a student/child's own
 * gradeLevel field is written by several different forms that never agreed on a
 * format — 'primary_5', 'secondary_8', 'sixth_form_12', or literal 'Year 5' all
 * mean the same thing as 'year_5' but none of them match the KV key prefix used
 * on upload. Without this, /grade/:gradeLevel silently returns nothing for any
 * caller using one of those other formats, even though matching curricula exist.
 */
function normalizeGradeLevel(input: string): string {
  const raw = (input || '').trim().toLowerCase().replace(/\s+/g, '_');
  if (/^year_\d{1,2}$/.test(raw)) return raw;

  // primary_1..primary_6 -> year_1..year_6
  let m = raw.match(/^primary_(\d{1,2})$/);
  if (m) return `year_${m[1]}`;

  // secondary_7..secondary_11 -> year_7..year_11
  m = raw.match(/^secondary_(\d{1,2})$/);
  if (m) return `year_${m[1]}`;

  // sixth_form_12 / sixth_form_13 -> year_12 / year_13
  m = raw.match(/^sixth_form_(\d{1,2})$/);
  if (m) return `year_${m[1]}`;

  // bare number, e.g. '5' -> year_5
  if (/^\d{1,2}$/.test(raw)) return `year_${raw}`;

  // nursery_1/2/3 and anything else have no curriculum equivalent — return as-is
  // so the lookup below simply (and correctly) finds nothing.
  return raw;
}

// Upload curriculum PDF for a specific grade level
app.post('/upload', async (c) => {
  try {
    const auth = await requireAdmin(c);
    if (auth instanceof Response) return auth;
    const formData = await c.req.formData();
    const file = formData.get('file') as File;
    const gradeLevel = formData.get('gradeLevel') as string;
    const subject = formData.get('subject') as string;
    const title = formData.get('title') as string;
    const description = formData.get('description') as string;

    if (!file || !gradeLevel) {
      return c.json({ error: 'File and grade level are required' }, 400);
    }

    // Create bucket if it doesn't exist
    const bucketName = 'make-cbd74580-curriculum';
    const { data: buckets } = await supabase.storage.listBuckets();
    const bucketExists = buckets?.some(bucket => bucket.name === bucketName);
    
    if (!bucketExists) {
      await supabase.storage.createBucket(bucketName, {
        public: false,
        fileSizeLimit: 52428800, // 50MB
      });
    }

    // Upload file to storage
    const fileName = `${gradeLevel}/${subject || 'general'}/${Date.now()}_${file.name}`;
    const fileBuffer = await file.arrayBuffer();
    
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(bucketName)
      .upload(fileName, fileBuffer, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      return c.json({ error: `Failed to upload file: ${uploadError.message}` }, 500);
    }

    // Store metadata in KV store
    const curriculumId = `curriculum_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const curriculumData = {
      id: curriculumId,
      gradeLevel,
      subject: subject || 'General',
      title: title || file.name,
      description: description || '',
      fileName: file.name,
      filePath: fileName,
      fileSize: file.size,
      uploadedAt: new Date().toISOString(),
    };

    // Store in KV with grade-specific key
    const kvKey = `curriculum_${gradeLevel}_${curriculumId}`;
    const { error: kvError } = await supabase
      .from('kv_store_cbd74580')
      .insert({
        key: kvKey,
        value: curriculumData,
      });

    if (kvError) {
      console.error('KV store error:', kvError);
      // Try to clean up uploaded file
      await supabase.storage.from(bucketName).remove([fileName]);
      return c.json({ error: `Failed to store curriculum metadata: ${kvError.message}` }, 500);
    }

    return c.json({
      success: true,
      curriculum: curriculumData,
    });
  } catch (error) {
    console.error('Error uploading curriculum:', error);
    return c.json({ error: `Server error: ${error.message}` }, 500);
  }
});

// Get all curricula for a specific grade level
app.get('/grade/:gradeLevel', async (c) => {
  try {
    const gradeLevel = normalizeGradeLevel(c.req.param('gradeLevel'));

    // Query KV store for curricula with this grade level
    const { data, error } = await supabase
      .from('kv_store_cbd74580')
      .select('*')
      .like('key', `curriculum_${gradeLevel}_%`);

    if (error) {
      console.error('Error fetching curricula:', error);
      return c.json({ error: `Failed to fetch curricula: ${error.message}` }, 500);
    }

    const curricula = data?.map(row => row.value) || [];

    return c.json({
      curricula,
      gradeLevel,
    });
  } catch (error) {
    console.error('Error getting curricula:', error);
    return c.json({ error: `Server error: ${error.message}` }, 500);
  }
});

// Get a signed URL for viewing a curriculum PDF
app.get('/:curriculumId/view', async (c) => {
  try {
    const curriculumId = c.req.param('curriculumId');

    // Find the curriculum in KV store
    const { data, error } = await supabase
      .from('kv_store_cbd74580')
      .select('*')
      .like('key', `%${curriculumId}`);

    if (error || !data || data.length === 0) {
      return c.json({ error: 'Curriculum not found' }, 404);
    }

    const curriculum = data[0].value;
    const bucketName = 'make-cbd74580-curriculum';

    // Create signed URL (valid for 1 hour)
    const { data: signedUrlData, error: signedUrlError } = await supabase.storage
      .from(bucketName)
      .createSignedUrl(curriculum.filePath, 3600);

    if (signedUrlError) {
      console.error('Signed URL error:', signedUrlError);
      return c.json({ error: `Failed to create signed URL: ${signedUrlError.message}` }, 500);
    }

    return c.json({
      curriculum,
      signedUrl: signedUrlData.signedUrl,
    });
  } catch (error) {
    console.error('Error getting curriculum URL:', error);
    return c.json({ error: `Server error: ${error.message}` }, 500);
  }
});

// Get all curricula (for admin)
app.get('/all', async (c) => {
  try {
    const { data, error } = await supabase
      .from('kv_store_cbd74580')
      .select('*')
      .like('key', 'curriculum_%');

    if (error) {
      console.error('Error fetching all curricula:', error);
      return c.json({ error: `Failed to fetch curricula: ${error.message}` }, 500);
    }

    const curricula = data?.map(row => row.value) || [];

    // Group by grade level
    const groupedByGrade = curricula.reduce((acc: any, curr: any) => {
      if (!acc[curr.gradeLevel]) {
        acc[curr.gradeLevel] = [];
      }
      acc[curr.gradeLevel].push(curr);
      return acc;
    }, {});

    return c.json({
      curricula,
      groupedByGrade,
    });
  } catch (error) {
    console.error('Error getting all curricula:', error);
    return c.json({ error: `Server error: ${error.message}` }, 500);
  }
});

// Delete a curriculum
app.delete('/:curriculumId', async (c) => {
  try {
    const auth = await requireAdmin(c);
    if (auth instanceof Response) return auth;
    const curriculumId = c.req.param('curriculumId');

    // Find the curriculum in KV store
    const { data, error } = await supabase
      .from('kv_store_cbd74580')
      .select('*')
      .like('key', `%${curriculumId}`);

    if (error || !data || data.length === 0) {
      return c.json({ error: 'Curriculum not found' }, 404);
    }

    const curriculum = data[0].value;
    const kvKey = data[0].key;
    const bucketName = 'make-cbd74580-curriculum';

    // Delete file from storage
    const { error: storageError } = await supabase.storage
      .from(bucketName)
      .remove([curriculum.filePath]);

    if (storageError) {
      console.error('Storage deletion error:', storageError);
    }

    // Delete from KV store
    const { error: kvError } = await supabase
      .from('kv_store_cbd74580')
      .delete()
      .eq('key', kvKey);

    if (kvError) {
      console.error('KV deletion error:', kvError);
      return c.json({ error: `Failed to delete curriculum metadata: ${kvError.message}` }, 500);
    }

    return c.json({
      success: true,
      message: 'Curriculum deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting curriculum:', error);
    return c.json({ error: `Server error: ${error.message}` }, 500);
  }
});

export default app;