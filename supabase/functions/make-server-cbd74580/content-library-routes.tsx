import { Hono } from 'npm:hono';
import * as kv from './kv_store.tsx';

export const contentLibraryRoutes = (app: Hono, getUserId: Function) => {
  
  // Mock syllabus data structure
  const getMockSyllabusData = () => {
    return [
      {
        id: 'math',
        name: 'Mathematics',
        icon: '🔢',
        levels: [
          {
            id: 'gcse-math',
            name: 'GCSE Mathematics',
            keyStage: 'Key Stage 4',
            examBoards: ['AQA', 'Edexcel', 'OCR'],
            topics: [
              {
                id: 'algebra',
                name: 'Algebra',
                description: 'Equations, expressions, and algebraic manipulation',
                subtopics: [
                  {
                    id: 'linear-eq',
                    name: 'Linear Equations',
                    description: 'Solving equations of the form ax + b = c',
                    learningObjectives: [
                      'Solve simple linear equations',
                      'Rearrange formulas',
                      'Apply to real-world problems'
                    ],
                    resources: 5,
                    difficulty: 'foundation'
                  },
                  {
                    id: 'quadratic-eq',
                    name: 'Quadratic Equations',
                    description: 'Solving equations of the form ax² + bx + c = 0',
                    learningObjectives: [
                      'Factorize quadratic expressions',
                      'Use the quadratic formula',
                      'Complete the square'
                    ],
                    resources: 8,
                    difficulty: 'intermediate'
                  }
                ]
              }
            ]
          }
        ]
      },
      {
        id: 'english',
        name: 'English',
        icon: '📚',
        levels: [
          {
            id: 'gcse-eng',
            name: 'GCSE English Literature',
            keyStage: 'Key Stage 4',
            examBoards: ['AQA', 'Edexcel', 'OCR', 'WJEC'],
            topics: [
              {
                id: 'shakespeare',
                name: 'Shakespeare',
                description: 'Analysis of Shakespeare plays',
                subtopics: [
                  {
                    id: 'macbeth',
                    name: 'Macbeth',
                    description: 'Study of themes, characters, and context',
                    learningObjectives: [
                      'Analyze key themes',
                      'Understand character development',
                      'Explore historical context'
                    ],
                    resources: 12,
                    difficulty: 'intermediate'
                  }
                ]
              }
            ]
          }
        ]
      },
      {
        id: 'science',
        name: 'Science',
        icon: '🔬',
        levels: [
          {
            id: 'gcse-bio',
            name: 'GCSE Biology',
            keyStage: 'Key Stage 4',
            examBoards: ['AQA', 'Edexcel', 'OCR'],
            topics: [
              {
                id: 'cells',
                name: 'Cell Biology',
                description: 'Structure and function of cells',
                subtopics: [
                  {
                    id: 'cell-structure',
                    name: 'Cell Structure',
                    description: 'Animal and plant cell components',
                    learningObjectives: [
                      'Identify cell organelles',
                      'Understand cell functions',
                      'Compare prokaryotic and eukaryotic cells'
                    ],
                    resources: 6,
                    difficulty: 'foundation'
                  }
                ]
              }
            ]
          }
        ]
      }
    ];
  };

  // Get all subjects
  app.get('/make-server-cbd74580/syllabus/subjects', async (c) => {
    try {
      const accessToken = c.req.header('Authorization')?.split(' ')[1];
      const userId = await getUserId(accessToken ?? null);

      if (!userId) {
        return c.json({ error: 'Unauthorized' }, 401);
      }

      const subjects = getMockSyllabusData();
      return c.json({ subjects });
    } catch (error: any) {
      console.error('Error fetching subjects:', error);
      return c.json({ error: error.message || 'Internal server error' }, 500);
    }
  });

  // Search syllabus
  app.get('/make-server-cbd74580/syllabus/search', async (c) => {
    try {
      const accessToken = c.req.header('Authorization')?.split(' ')[1];
      const userId = await getUserId(accessToken ?? null);

      if (!userId) {
        return c.json({ error: 'Unauthorized' }, 401);
      }

      const query = c.req.query('q')?.toLowerCase() || '';
      const subjects = getMockSyllabusData();
      const results: any[] = [];

      subjects.forEach(subject => {
        subject.levels.forEach(level => {
          level.topics.forEach(topic => {
            topic.subtopics.forEach(subtopic => {
              if (
                subtopic.name.toLowerCase().includes(query) ||
                subtopic.description.toLowerCase().includes(query) ||
                topic.name.toLowerCase().includes(query)
              ) {
                results.push({
                  ...subtopic,
                  subjectId: subject.id,
                  subjectName: subject.name,
                  levelId: level.id,
                  levelName: level.name,
                  topicId: topic.id,
                  topicName: topic.name
                });
              }
            });
          });
        });
      });

      return c.json({ results });
    } catch (error: any) {
      console.error('Error searching syllabus:', error);
      return c.json({ error: error.message || 'Internal server error' }, 500);
    }
  });

  // Get lesson templates
  app.get('/make-server-cbd74580/templates', async (c) => {
    try {
      const accessToken = c.req.header('Authorization')?.split(' ')[1];
      const userId = await getUserId(accessToken ?? null);

      if (!userId) {
        return c.json({ error: 'Unauthorized' }, 401);
      }

      const templates = await kv.getByPrefix('template:');
      return c.json({ templates: templates || [] });
    } catch (error: any) {
      console.error('Error fetching templates:', error);
      return c.json({ error: error.message || 'Internal server error' }, 500);
    }
  });

  // Create lesson template
  app.post('/make-server-cbd74580/templates', async (c) => {
    try {
      const accessToken = c.req.header('Authorization')?.split(' ')[1];
      const userId = await getUserId(accessToken ?? null);

      if (!userId) {
        return c.json({ error: 'Unauthorized' }, 401);
      }

      const templateData = await c.req.json();
      const template = {
        id: `template:${Date.now()}`,
        ...templateData,
        createdBy: userId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        versions: [
          {
            version: 1,
            updatedAt: new Date().toISOString(),
            changes: 'Initial creation'
          }
        ]
      };

      await kv.set(template.id, template);
      return c.json({ template });
    } catch (error: any) {
      console.error('Error creating template:', error);
      return c.json({ error: error.message || 'Internal server error' }, 500);
    }
  });

  // Update lesson template
  app.put('/make-server-cbd74580/templates/:templateId', async (c) => {
    try {
      const accessToken = c.req.header('Authorization')?.split(' ')[1];
      const userId = await getUserId(accessToken ?? null);

      if (!userId) {
        return c.json({ error: 'Unauthorized' }, 401);
      }

      const templateId = c.req.param('templateId');
      const existing = await kv.get(templateId) as any;

      if (!existing) {
        return c.json({ error: 'Template not found' }, 404);
      }

      if (existing.createdBy !== userId) {
        return c.json({ error: 'Unauthorized to edit this template' }, 403);
      }

      const updates = await c.req.json();
      const newVersion = (existing.versions?.length || 0) + 1;

      const updatedTemplate = {
        ...existing,
        ...updates,
        updatedAt: new Date().toISOString(),
        versions: [
          ...(existing.versions || []),
          {
            version: newVersion,
            updatedAt: new Date().toISOString(),
            changes: updates.changeNote || 'Template updated'
          }
        ]
      };

      await kv.set(templateId, updatedTemplate);
      return c.json({ template: updatedTemplate });
    } catch (error: any) {
      console.error('Error updating template:', error);
      return c.json({ error: error.message || 'Internal server error' }, 500);
    }
  });

  // Clone lesson template
  app.post('/make-server-cbd74580/templates/:templateId/clone', async (c) => {
    try {
      const accessToken = c.req.header('Authorization')?.split(' ')[1];
      const userId = await getUserId(accessToken ?? null);

      if (!userId) {
        return c.json({ error: 'Unauthorized' }, 401);
      }

      const templateId = c.req.param('templateId');
      const original = await kv.get(templateId) as any;

      if (!original) {
        return c.json({ error: 'Template not found' }, 404);
      }

      const cloned = {
        ...original,
        id: `template:${Date.now()}`,
        title: `${original.title} (Copy)`,
        createdBy: userId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        clonedFrom: templateId,
        versions: [
          {
            version: 1,
            updatedAt: new Date().toISOString(),
            changes: `Cloned from: ${original.title}`
          }
        ]
      };

      await kv.set(cloned.id, cloned);
      return c.json({ template: cloned });
    } catch (error: any) {
      console.error('Error cloning template:', error);
      return c.json({ error: error.message || 'Internal server error' }, 500);
    }
  });

  // Get resources
  app.get('/make-server-cbd74580/resources', async (c) => {
    try {
      const accessToken = c.req.header('Authorization')?.split(' ')[1];
      const userId = await getUserId(accessToken ?? null);

      if (!userId) {
        return c.json({ error: 'Unauthorized' }, 401);
      }

      const sessionId = c.req.query('sessionId');
      const studentId = c.req.query('studentId');

      let resources = await kv.getByPrefix('resource:');

      if (sessionId) {
        resources = resources.filter((r: any) => r.sessionId === sessionId);
      }
      if (studentId) {
        resources = resources.filter((r: any) => r.studentId === studentId);
      }

      const userProfile = await kv.get(`user:${userId}`) as any;
      if (userProfile.role !== 'admin' && userProfile.role !== 'tutor') {
        resources = resources.filter((r: any) => 
          r.accessControl === 'public' || 
          r.studentId === userId ||
          (r.accessControl === 'student' && r.studentId === userProfile.studentId)
        );
      }

      return c.json({ resources: resources || [] });
    } catch (error: any) {
      console.error('Error fetching resources:', error);
      return c.json({ error: error.message || 'Internal server error' }, 500);
    }
  });

  // Upload resource
  app.post('/make-server-cbd74580/resources/upload', async (c) => {
    try {
      const accessToken = c.req.header('Authorization')?.split(' ')[1];
      const userId = await getUserId(accessToken ?? null);

      if (!userId) {
        return c.json({ error: 'Unauthorized' }, 401);
      }

      const formData = await c.req.formData();
      const file = formData.get('file') as File;
      const accessControl = formData.get('accessControl') as string || 'student';
      const sessionId = formData.get('sessionId') as string;
      const studentId = formData.get('studentId') as string;

      if (!file) {
        return c.json({ error: 'No file provided' }, 400);
      }

      const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/gif', 'image/webp'];
      if (!allowedTypes.includes(file.type)) {
        return c.json({ error: 'Invalid file type' }, 400);
      }

      const maxSize = 10 * 1024 * 1024;
      if (file.size > maxSize) {
        return c.json({ error: 'File too large' }, 400);
      }

      const scanResult = 'approved';
      const fileUrl = `https://storage.example.com/resources/${Date.now()}-${file.name}`;

      const resource = {
        id: `resource:${Date.now()}`,
        fileName: file.name,
        fileType: file.type,
        fileSize: file.size,
        uploadedBy: userId,
        uploadedAt: new Date().toISOString(),
        sessionId,
        studentId,
        url: fileUrl,
        status: scanResult,
        accessControl,
        downloadCount: 0
      };

      await kv.set(resource.id, resource);

      return c.json({ resource, status: scanResult });
    } catch (error: any) {
      console.error('Error uploading resource:', error);
      return c.json({ error: error.message || 'Internal server error' }, 500);
    }
  });

  // Download resource
  app.get('/make-server-cbd74580/resources/:resourceId/download', async (c) => {
    try {
      const accessToken = c.req.header('Authorization')?.split(' ')[1];
      const userId = await getUserId(accessToken ?? null);

      if (!userId) {
        return c.json({ error: 'Unauthorized' }, 401);
      }

      const resourceId = c.req.param('resourceId');
      const resource = await kv.get(resourceId) as any;

      if (!resource) {
        return c.json({ error: 'Resource not found' }, 404);
      }

      if (resource.status !== 'approved') {
        return c.json({ error: 'Resource not available' }, 403);
      }

      const userProfile = await kv.get(`user:${userId}`) as any;
      if (
        resource.accessControl === 'private' && 
        resource.uploadedBy !== userId
      ) {
        return c.json({ error: 'Access denied' }, 403);
      }

      resource.downloadCount = (resource.downloadCount || 0) + 1;
      await kv.set(resourceId, resource);

      return c.json({ url: resource.url });
    } catch (error: any) {
      console.error('Error downloading resource:', error);
      return c.json({ error: error.message || 'Internal server error' }, 500);
    }
  });

  // Delete resource
  app.delete('/make-server-cbd74580/resources/:resourceId', async (c) => {
    try {
      const accessToken = c.req.header('Authorization')?.split(' ')[1];
      const userId = await getUserId(accessToken ?? null);

      if (!userId) {
        return c.json({ error: 'Unauthorized' }, 401);
      }

      const resourceId = c.req.param('resourceId');
      const resource = await kv.get(resourceId) as any;

      if (!resource) {
        return c.json({ error: 'Resource not found' }, 404);
      }

      if (resource.uploadedBy !== userId) {
        return c.json({ error: 'Unauthorized to delete this resource' }, 403);
      }

      await kv.del(resourceId);

      return c.json({ success: true });
    } catch (error: any) {
      console.error('Error deleting resource:', error);
      return c.json({ error: error.message || 'Internal server error' }, 500);
    }
  });
};
