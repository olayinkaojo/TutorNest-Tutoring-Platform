import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { 
  BookOpen, 
  Download, 
  ExternalLink, 
  FileText, 
  Loader2,
  AlertCircle 
} from 'lucide-react';
import { Alert, AlertDescription } from './ui/alert';
import { projectId } from '../utils/supabase/info';

interface CurriculumPDFViewerProps {
  gradeLevel: string;
  accessToken: string;
  studentName?: string;
}

export function CurriculumPDFViewer({ gradeLevel, accessToken, studentName }: CurriculumPDFViewerProps) {
  const [curricula, setCurricula] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewingCurriculum, setViewingCurriculum] = useState<any | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [loadingPdf, setLoadingPdf] = useState(false);

  useEffect(() => {
    fetchCurricula();
  }, [gradeLevel]);

  const fetchCurricula = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-cbd74580/curriculum/grade/${gradeLevel}`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch curricula');
      }

      const data = await response.json();
      setCurricula(data.curricula || []);
    } catch (err: any) {
      console.error('Error fetching curricula:', err);
      setError(err.message || 'Failed to load curricula');
    } finally {
      setLoading(false);
    }
  };

  const handleViewPDF = async (curriculum: any) => {
    setLoadingPdf(true);
    setViewingCurriculum(curriculum);
    
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-cbd74580/curriculum/${curriculum.id}/view`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to get PDF URL');
      }

      const data = await response.json();
      setPdfUrl(data.signedUrl);
    } catch (err: any) {
      console.error('Error loading PDF:', err);
      setError(err.message || 'Failed to load PDF');
    } finally {
      setLoadingPdf(false);
    }
  };

  const handleClosePDF = () => {
    setViewingCurriculum(null);
    setPdfUrl(null);
  };

  const formatGradeLevel = (level: string) => {
    return level.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase());
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-12">
            <Loader2 className="w-12 h-12 mx-auto mb-4 text-gray-300 animate-spin" />
            <p className="text-gray-500">Loading curriculum...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error && curricula.length === 0) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="w-5 h-5" style={{ color: '#625d9c' }} />
                Curriculum Resources
              </CardTitle>
              <CardDescription>
                {studentName ? `Curriculum for ${studentName}` : 'View your curriculum materials'} - {formatGradeLevel(gradeLevel)}
              </CardDescription>
            </div>
            <Badge className="text-white" style={{ backgroundColor: '#625d9c' }}>
              {formatGradeLevel(gradeLevel)}
            </Badge>
          </div>
        </CardHeader>
      </Card>

      {/* Curricula List */}
      {curricula.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {curricula.map((curriculum) => (
            <Card key={curriculum.id} className="hover:shadow-lg transition-shadow">
              <CardContent className="pt-6">
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <div 
                      className="w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: '#625d9c20' }}
                    >
                      <FileText className="w-6 h-6" style={{ color: '#625d9c' }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="mb-1 line-clamp-2">{curriculum.title}</h3>
                      <Badge variant="outline" className="text-xs">
                        {curriculum.subject}
                      </Badge>
                    </div>
                  </div>

                  {curriculum.description && (
                    <p className="text-sm text-gray-600 line-clamp-2">
                      {curriculum.description}
                    </p>
                  )}

                  <div className="flex items-center justify-between pt-2 border-t">
                    <div className="text-xs text-gray-500">
                      {(curriculum.fileSize / 1024 / 1024).toFixed(2)} MB
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => handleViewPDF(curriculum)}
                        className="text-white"
                        style={{ backgroundColor: '#625d9c' }}
                      >
                        <ExternalLink className="w-4 h-4 mr-1" />
                        View
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <FileText className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p className="text-gray-500 mb-2">No curriculum materials available</p>
            <p className="text-sm text-gray-400">
              Curriculum PDFs for {formatGradeLevel(gradeLevel)} will appear here once uploaded by administrators
            </p>
          </CardContent>
        </Card>
      )}

      {/* PDF Viewer Modal */}
      {viewingCurriculum && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-6xl h-[90vh] flex flex-col">
            {/* Header */}
            <div className="p-4 border-b flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <h3 className="text-lg mb-1 truncate">{viewingCurriculum.title}</h3>
                <p className="text-sm text-gray-600">{viewingCurriculum.subject}</p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0 ml-4">
                {pdfUrl && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => window.open(pdfUrl, '_blank')}
                  >
                    <Download className="w-4 h-4 mr-1" />
                    Download
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleClosePDF}
                >
                  Close
                </Button>
              </div>
            </div>

            {/* PDF Viewer */}
            <div className="flex-1 overflow-hidden">
              {loadingPdf ? (
                <div className="h-full flex items-center justify-center">
                  <Loader2 className="w-12 h-12 text-gray-300 animate-spin" />
                </div>
              ) : pdfUrl ? (
                <iframe
                  src={pdfUrl}
                  className="w-full h-full border-0"
                  title={viewingCurriculum.title}
                />
              ) : (
                <div className="h-full flex items-center justify-center">
                  <p className="text-gray-500">Failed to load PDF</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
