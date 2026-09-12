import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Alert, AlertDescription } from './ui/alert';
import { Loader2, GraduationCap, PlayCircle, FileText, Link as LinkIcon, ExternalLink, AlertCircle, Download } from 'lucide-react';
import tutorAPI from '../utils/tutor-api-client';
import { projectId } from '../utils/supabase/info';

interface TutorTrainingResourcesProps {
  session: any;
}

/** Returns a YouTube embeddable URL if `url` is a recognizable YouTube link, else null. */
function youtubeEmbedUrl(url: string): string | null {
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\./, '');
    let videoId: string | null = null;

    if (host === 'youtu.be') {
      videoId = u.pathname.slice(1);
    } else if (host === 'youtube.com' || host === 'm.youtube.com') {
      if (u.pathname === '/watch') videoId = u.searchParams.get('v');
      else if (u.pathname.startsWith('/embed/')) videoId = u.pathname.split('/')[2];
      else if (u.pathname.startsWith('/shorts/')) videoId = u.pathname.split('/')[2];
    }

    return videoId ? `https://www.youtube.com/embed/${videoId}` : null;
  } catch {
    return null;
  }
}

export function TutorTrainingResources({ session }: TutorTrainingResourcesProps) {
  const [resources, setResources] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await tutorAPI.getTrainingResources(session.access_token);
        if (!cancelled) setResources(data);
      } catch (err: any) {
        console.error('Error loading tutor training resources:', err);
        if (!cancelled) setError('Could not load resources right now. Please try again shortly.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [session.access_token]);

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <GraduationCap className="w-6 h-6" style={{ color: '#625d9c' }} />
          Training Videos &amp; Resources
        </CardTitle>
        <CardDescription>
          Platform walkthroughs, onboarding material, and reference docs — added here as they become available.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {!error && resources.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <GraduationCap className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p>Nothing here yet — check back soon.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {resources.map((resource) => (
              <ResourceCard key={resource.id} resource={resource} accessToken={session.access_token} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

async function downloadFile(resourceId: string, fileName: string, accessToken: string) {
  try {
    const response = await fetch(
      `https://${projectId}.supabase.co/functions/v1/make-server-cbd74580/tutor-training/${resourceId}/download`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error || 'Download failed');
    }
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName || 'resource';
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  } catch (error: any) {
    console.error('Download error:', error);
    alert(error.message || 'Could not open this file right now.');
  }
}

function ResourceCard({ resource, accessToken }: { resource: any; accessToken: string }) {
  if (resource.kind === 'video') {
    const embedUrl = youtubeEmbedUrl(resource.url);
    return (
      <div className="border rounded-lg overflow-hidden flex flex-col">
        {embedUrl ? (
          <div className="aspect-video bg-black">
            <iframe
              src={embedUrl}
              title={resource.title}
              className="w-full h-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        ) : (
          <a
            href={resource.url}
            target="_blank"
            rel="noopener noreferrer"
            className="aspect-video flex flex-col items-center justify-center gap-2 text-white hover:opacity-90 transition-opacity"
            style={{ backgroundColor: '#625d9c' }}
          >
            <PlayCircle className="w-12 h-12" />
            <span className="text-sm">Watch video</span>
          </a>
        )}
        <div className="p-3">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="text-sm">{resource.title}</h4>
            <Badge variant="outline" className="text-xs flex-shrink-0">{resource.category}</Badge>
          </div>
          {resource.description && <p className="text-xs text-gray-600">{resource.description}</p>}
        </div>
      </div>
    );
  }

  const isFile = resource.kind === 'file';

  return (
    <div className="border rounded-lg p-4 flex items-start gap-3">
      <div
        className="w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0"
        style={{ backgroundColor: '#625d9c20' }}
      >
        {isFile ? <FileText className="w-6 h-6" style={{ color: '#625d9c' }} /> : <LinkIcon className="w-6 h-6" style={{ color: '#625d9c' }} />}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <h4 className="text-sm truncate">{resource.title}</h4>
          <Badge variant="outline" className="text-xs flex-shrink-0">{resource.category}</Badge>
        </div>
        {resource.description && <p className="text-xs text-gray-600 mb-2">{resource.description}</p>}
        {isFile ? (
          <Button
            variant="outline"
            size="sm"
            onClick={() => downloadFile(resource.id, resource.fileName, accessToken)}
          >
            <Download className="w-3.5 h-3.5 mr-1.5" />
            Open
          </Button>
        ) : (
          <Button variant="outline" size="sm" asChild>
            <a href={resource.url} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="w-3.5 h-3.5 mr-1.5" />
              Open link
            </a>
          </Button>
        )}
      </div>
    </div>
  );
}
