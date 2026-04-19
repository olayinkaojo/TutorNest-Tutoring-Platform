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
  AlertCircle,
  RefreshCw
} from 'lucide-react';
import { Alert, AlertDescription } from './ui/alert';
import { parentAPI } from '../utils/api-client';
import type { Curriculum } from '../types/dashboard';

interface CurriculumPDFViewerProps {
  gradeLevel: string;
  accessToken: string;
  studentName?: string;
}

export function CurriculumPDFViewer({ gradeLevel, accessToken, studentName }: CurriculumPDFViewerProps) {
  const [curricula, setCurricula] = useState<Curriculum[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewingCurriculum, setViewingCurriculum] = useState<Curriculum | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [loadingPdf, setLoadingPdf] = useState(false);

  useEffect(() => {
    fetchCurricula();
  }, [gradeLevel, accessToken]);

  const fetchCurricula = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const curricuaList = await parentAPI.getCurricula(accessToken, gradeLevel);
      setCurricula(curricuaList);
    } catch (err: any) {
      console.error('Error fetching curricula:', err);
      setError(err.message || 'Failed to load curricula');
    } finally {
      setLoading(false);
    }
  };

  const handleViewPDF = async (curriculum: Curriculum) => {
    setLoadingPdf(true);
    setViewingCurriculum(curriculum);
    setPdfUrl(null); // Clear old URL
    setError(null);
    
    try {
      // Always request fresh URL (don't cache, signed URLs expire)
      const urlData = await parentAPI.getCurriculumPDFUrl(accessToken, curriculum.id);
      setPdfUrl(urlData.signedUrl);
    } catch (err: any) {
      console.error('Error loading PDF:', err);
      setError(err.message || 'Failed to load PDF');
      setViewingCurriculum(null);
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
            <div className="flex-1 overflow-hidden flex flex-col">
              {loadingPdf ? (
                <div className="h-full flex items-center justify-center">
                  <Loader2 className="w-12 h-12 text-gray-300 animate-spin" />
                </div>
              ) : error ? (
                <div className="h-full flex flex-col items-center justify-center gap-4 p-8">
                  <AlertCircle className="w-12 h-12 text-red-500" />
                  <div className="text-center">
                    <p className="text-gray-900 font-medium mb-2">Failed to Load PDF</p>
                    <p className="text-sm text-gray-600 mb-4">{error}</p>
                  </div>
                  <Button 
                    onClick={() => handleViewPDF(viewingCurriculum!)}
                    className="flex items-center gap-2"
                    style={{ backgroundColor: '#625d9c' }}
                  >
                    <RefreshCw className="w-4 h-4" />
                    Try Again
                  </Button>
                </div>
              ) : pdfUrl ? (
                <iframe
                  src={pdfUrl}
                  className="w-full h-full border-0"
                  title={viewingCurriculum.title}
                  sandbox="allow-scripts"
                  onError={() => setError('PDF failed to load. This might be a temporary issue.')}
                />
              ) : (
                <div className="h-full flex items-center justify-center">
                  <p className="text-gray-500">No PDF URL available</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
