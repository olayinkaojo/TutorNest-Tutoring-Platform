import * as kv from './kv_store.tsx';

export type AnnotationType = 'line' | 'text' | 'shape' | 'highlight' | 'arrow' | 'erase';

export interface Annotation {
  id: string;
  collaborationId: string;
  tutorId: string;
  type: AnnotationType;
  color: string;
  strokeWidth: number;
  points: { x: number; y: number }[]; // For lines and shapes
  text?: string; // For text annotations
  x?: number; // For text position
  y?: number; // For text position
  fontSize?: number;
  shapeType?: 'rectangle' | 'circle' | 'arrow'; // For shapes and arrows
  startX?: number; // For shapes/arrows
  startY?: number;
  endX?: number;
  endY?: number;
  createdAt: string;
  erasedAt?: string; // null if not erased
}

export interface CollaborationSession {
  id: string;
  sessionId: string;
  tutorId: string;
  studentIds: string[];
  documentUrl?: string; // PDF or image URL for reference
  createdAt: string;
  startedAt?: string;
  endedAt?: string;
  status: 'created' | 'active' | 'paused' | 'completed';
  annotationCount: number;
  canvasWidth?: number;
  canvasHeight?: number;
}

export interface AnnotationBatch {
  collaborationId: string;
  annotations: Annotation[];
  batchTimestamp: string;
}

// Create a new collaboration session for live tutoring
export async function createCollaborationSession(
  sessionId: string,
  tutorId: string,
  studentIds: string[],
  documentUrl?: string
): Promise<CollaborationSession> {
  const collaborationId = `collab:${sessionId}:${Date.now()}`;

  const collaboration: CollaborationSession = {
    id: collaborationId,
    sessionId,
    tutorId,
    studentIds,
    documentUrl,
    createdAt: new Date().toISOString(),
    status: 'created',
    annotationCount: 0,
    canvasWidth: 1024,
    canvasHeight: 768,
  };

  await kv.set(`collaboration:${collaborationId}`, collaboration);
  await kv.set(`session:${sessionId}:collaboration-id`, collaborationId);

  // Initialize empty annotations array
  await kv.set(`collaboration:${collaborationId}:annotations`, []);

  return collaboration;
}

// Start collaboration session (students can now see)
export async function startCollaboration(collaborationId: string): Promise<void> {
  const collaboration = await kv.get(`collaboration:${collaborationId}`);
  if (!collaboration) throw new Error('Collaboration session not found');

  collaboration.status = 'active';
  collaboration.startedAt = new Date().toISOString();

  await kv.set(`collaboration:${collaborationId}`, collaboration);
}

// Pause collaboration (tutor can pause/resume)
export async function pauseCollaboration(collaborationId: string): Promise<void> {
  const collaboration = await kv.get(`collaboration:${collaborationId}`);
  if (!collaboration) throw new Error('Collaboration session not found');

  collaboration.status = collaboration.status === 'paused' ? 'active' : 'paused';

  await kv.set(`collaboration:${collaborationId}`, collaboration);
}

// Add annotation (line, text, shape) from tutor
export async function addAnnotation(
  collaborationId: string,
  tutorId: string,
  annotation: Omit<Annotation, 'id' | 'createdAt'>
): Promise<Annotation> {
  const collaboration = await kv.get(`collaboration:${collaborationId}`);
  if (!collaboration) throw new Error('Collaboration session not found');

  if (collaboration.tutorId !== tutorId) {
    throw new Error('Only tutor can add annotations');
  }

  const annotationId = `ann:${collaborationId}:${Date.now()}:${Math.random()}`;

  const newAnnotation: Annotation = {
    ...annotation,
    id: annotationId,
    createdAt: new Date().toISOString(),
  };

  // Store individual annotation
  await kv.set(`annotation:${annotationId}`, newAnnotation);

  // Add to collaboration's annotation list
  const annotations = (await kv.get(`collaboration:${collaborationId}:annotations`)) || [];
  annotations.push(annotationId);
  await kv.set(`collaboration:${collaborationId}:annotations`, annotations);

  // Update annotation count
  collaboration.annotationCount = annotations.length;
  await kv.set(`collaboration:${collaborationId}`, collaboration);

  // Broadcast to students (queue for WebSocket delivery)
  await broadcastAnnotationToStudents(collaborationId, newAnnotation);

  return newAnnotation;
}

// Get all annotations for a collaboration
export async function getAnnotations(collaborationId: string): Promise<Annotation[]> {
  const annotationIds = (await kv.get(`collaboration:${collaborationId}:annotations`)) || [];
  const annotations: Annotation[] = [];

  for (const annotationId of annotationIds) {
    const annotation = await kv.get(`annotation:${annotationId}`);
    if (annotation && !annotation.erasedAt) {
      annotations.push(annotation);
    }
  }

  // Sort by creation time
  annotations.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  return annotations;
}

// Delete/erase an annotation
export async function eraseAnnotation(
  collaborationId: string,
  annotationId: string,
  tutorId: string
): Promise<void> {
  const collaboration = await kv.get(`collaboration:${collaborationId}`);
  if (!collaboration) throw new Error('Collaboration session not found');

  if (collaboration.tutorId !== tutorId) {
    throw new Error('Only tutor can erase annotations');
  }

  const annotation = await kv.get(`annotation:${annotationId}`);
  if (!annotation) throw new Error('Annotation not found');

  // Soft delete (keep record but mark as erased)
  annotation.erasedAt = new Date().toISOString();
  await kv.set(`annotation:${annotationId}`, annotation);

  // Broadcast erasure to students
  await broadcastAnnotationToStudents(collaborationId, {
    id: annotationId,
    erasedAt: annotation.erasedAt,
  } as any);
}

// Undo last annotation (erase it)
export async function undoLastAnnotation(
  collaborationId: string,
  tutorId: string
): Promise<Annotation | null> {
  const collaboration = await kv.get(`collaboration:${collaborationId}`);
  if (!collaboration) throw new Error('Collaboration session not found');

  if (collaboration.tutorId !== tutorId) {
    throw new Error('Only tutor can undo');
  }

  const annotationIds = (await kv.get(`collaboration:${collaborationId}:annotations`)) || [];

  // Find last non-erased annotation
  for (let i = annotationIds.length - 1; i >= 0; i--) {
    const annotation = await kv.get(`annotation:${annotationIds[i]}`);
    if (annotation && !annotation.erasedAt) {
      await eraseAnnotation(collaborationId, annotationIds[i], tutorId);
      return annotation;
    }
  }

  return null;
}

// Clear all annotations (fresh start)
export async function clearAllAnnotations(
  collaborationId: string,
  tutorId: string
): Promise<number> {
  const collaboration = await kv.get(`collaboration:${collaborationId}`);
  if (!collaboration) throw new Error('Collaboration session not found');

  if (collaboration.tutorId !== tutorId) {
    throw new Error('Only tutor can clear annotations');
  }

  const annotationIds = (await kv.get(`collaboration:${collaborationId}:annotations`)) || [];
  let clearedCount = 0;

  for (const annotationId of annotationIds) {
    const annotation = await kv.get(`annotation:${annotationId}`);
    if (annotation && !annotation.erasedAt) {
      annotation.erasedAt = new Date().toISOString();
      await kv.set(`annotation:${annotationId}`, annotation);
      clearedCount++;
    }
  }

  // Broadcast clear event
  await broadcastAnnotationToStudents(collaborationId, {
    id: 'CLEAR_ALL',
    type: 'clear',
  } as any);

  return clearedCount;
}

// Export annotations as JSON (for storage/review)
export async function exportAnnotations(
  collaborationId: string
): Promise<{ collaboration: CollaborationSession; annotations: Annotation[] }> {
  const collaboration = await kv.get(`collaboration:${collaborationId}`);
  if (!collaboration) throw new Error('Collaboration session not found');

  const annotations = await getAnnotations(collaborationId);

  // Mark as exported for audit trail
  const exportKey = `collaboration:${collaborationId}:export-history`;
  const exports = (await kv.get(exportKey)) || [];
  exports.push({
    exportedAt: new Date().toISOString(),
    annotationCount: annotations.length,
  });
  await kv.set(exportKey, exports);

  return { collaboration, annotations };
}

// Save exported annotations for persistent storage/reference
export async function saveAnnotationsForReview(
  collaborationId: string,
  sessionId: string
): Promise<string> {
  const exported = await exportAnnotations(collaborationId);

  // Store as review document linked to session
  const reviewKey = `session:${sessionId}:annotation-review`;
  const review = {
    id: `review:${sessionId}:${Date.now()}`,
    collaborationId,
    sessionId,
    tutorAnnotations: exported.annotations,
    savedAt: new Date().toISOString(),
    accessibleBy: exported.collaboration.studentIds,
  };

  await kv.set(reviewKey, review);

  return review.id;
}

// Get saved annotations for student review after session
export async function getSessionAnnotationReview(sessionId: string): Promise<any> {
  const reviewKey = `session:${sessionId}:annotation-review`;
  return await kv.get(reviewKey);
}

// Broadcast annotation to all students in real-time queue
export async function broadcastAnnotationToStudents(
  collaborationId: string,
  annotation: any
): Promise<void> {
  const collaboration = await kv.get(`collaboration:${collaborationId}`);
  if (!collaboration) return;

  // Store in broadcast queue for WebSocket delivery
  const broadcastKey = `collaboration:${collaborationId}:broadcast-queue`;
  const queue = (await kv.get(broadcastKey)) || [];

  queue.push({
    annotation,
    timestamp: new Date().toISOString(),
  });

  // Keep only last 1000 broadcast events
  if (queue.length > 1000) {
    queue.shift();
  }

  await kv.set(broadcastKey, queue);
}

// Get pending broadcasts for a student (for polling fallback)
export async function getPendingBroadcasts(
  collaborationId: string,
  studentId: string,
  lastSeenTimestamp?: string
): Promise<any[]> {
  const broadcastKey = `collaboration:${collaborationId}:broadcast-queue`;
  const queue = (await kv.get(broadcastKey)) || [];

  if (!lastSeenTimestamp) {
    return queue; // Return all for initial fetch
  }

  // Return only new broadcasts since last seen
  return queue.filter((item: any) => {
    const itemTime = new Date(item.timestamp).getTime();
    const lastSeenTime = new Date(lastSeenTimestamp).getTime();
    return itemTime > lastSeenTime;
  });
}

// End collaboration session and prepare for review
export async function endCollaboration(collaborationId: string): Promise<void> {
  const collaboration = await kv.get(`collaboration:${collaborationId}`);
  if (!collaboration) throw new Error('Collaboration session not found');

  collaboration.status = 'completed';
  collaboration.endedAt = new Date().toISOString();

  await kv.set(`collaboration:${collaborationId}`, collaboration);

  // Save annotations for student review
  await saveAnnotationsForReview(collaborationId, collaboration.sessionId);
}

// Get collaboration session details
export async function getCollaboration(collaborationId: string): Promise<CollaborationSession | null> {
  return await kv.get(`collaboration:${collaborationId}`);
}

// Get collaboration for a session
export async function getSessionCollaboration(sessionId: string): Promise<CollaborationSession | null> {
  const collaborationId = await kv.get(`session:${sessionId}:collaboration-id`);
  if (!collaborationId) return null;

  return await getCollaboration(collaborationId);
}

// Get annotation stats for session
export async function getAnnotationStats(collaborationId: string): Promise<{
  totalAnnotations: number;
  byType: { [key: string]: number };
  createdTime: string;
  duration: string;
  averageAnnotationsPerMinute: number;
}> {
  const annotations = await getAnnotations(collaborationId);
  const collaboration = await kv.get(`collaboration:${collaborationId}`);

  if (!collaboration) {
    return {
      totalAnnotations: 0,
      byType: {},
      createdTime: '',
      duration: '',
      averageAnnotationsPerMinute: 0,
    };
  }

  // Count by type
  const byType: { [key: string]: number } = {};
  for (const ann of annotations) {
    byType[ann.type] = (byType[ann.type] || 0) + 1;
  }

  // Calculate duration
  let duration = 'In Progress';
  let durationMs = 0;

  if (collaboration.startedAt && collaboration.endedAt) {
    const start = new Date(collaboration.startedAt).getTime();
    const end = new Date(collaboration.endedAt).getTime();
    durationMs = end - start;
    const minutes = Math.round(durationMs / 60000);
    duration = `${minutes} minutes`;
  }

  const avgPerMinute = durationMs > 0 ? (annotations.length / (durationMs / 60000)) : 0;

  return {
    totalAnnotations: annotations.length,
    byType,
    createdTime: collaboration.createdAt,
    duration,
    averageAnnotationsPerMinute: Math.round(avgPerMinute * 10) / 10,
  };
}
