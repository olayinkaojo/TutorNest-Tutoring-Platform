import React, { useState } from 'react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { 
  Upload,
  FileText,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Download,
  Loader2,
  Users,
  FileWarning
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { projectId } from '../../utils/supabase/info';

interface ValidationError {
  row: number;
  field: string;
  value: string;
  error: string;
}

interface StudentRow {
  firstName: string;
  lastName: string;
  email: string;
  dateOfBirth: string;
  yearGroup: string;
  subjects?: string;
  specialNeeds?: string;
  parentEmail?: string;
}

interface BulkStudentImportProps {
  organisationId: string;
  accessToken: string;
  onComplete: () => void;
}

export function BulkStudentImport({ organisationId, accessToken, onComplete }: BulkStudentImportProps) {
  const [file, setFile] = useState<File | null>(null);
  const [validating, setValidating] = useState(false);
  const [importing, setImporting] = useState(false);
  const [validationResults, setValidationResults] = useState<{
    valid: StudentRow[];
    errors: ValidationError[];
    totalRows: number;
  } | null>(null);

  const downloadTemplate = () => {
    const template = [
      ['firstName', 'lastName', 'email', 'dateOfBirth (YYYY-MM-DD)', 'yearGroup', 'subjects (semicolon separated)', 'specialNeeds', 'parentEmail'].join(','),
      ['John', 'Doe', 'john.doe@school.ac.uk', '2010-05-15', '8', 'Maths;English', 'Dyslexia', 'parent@email.com'].join(','),
      ['Jane', 'Smith', 'jane.smith@school.ac.uk', '2009-11-20', '9', 'Science;French', '', 'parent2@email.com'].join(',')
    ].join('\n');

    const blob = new Blob([template], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'student-import-template.csv';
    a.click();
    window.URL.revokeObjectURL(url);
    toast.success('Template downloaded');
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (!selectedFile.name.endsWith('.csv')) {
        toast.error('Please upload a CSV file');
        return;
      }
      setFile(selectedFile);
      setValidationResults(null);
    }
  };

  const validateFile = async () => {
    if (!file) return;

    setValidating(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-cbd74580/organisations/${organisationId}/students/validate-import`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`
          },
          body: formData
        }
      );

      if (response.ok) {
        const data = await response.json();
        setValidationResults(data.results);
        
        if (data.results.errors.length === 0) {
          toast.success(`All ${data.results.valid.length} students validated successfully!`);
        } else {
          toast.warning(`Found ${data.results.errors.length} validation errors`);
        }
      } else {
        const error = await response.json();
        toast.error(error.message || 'Failed to validate file');
      }
    } catch (error) {
      console.error('Error validating file:', error);
      toast.error('Failed to validate file');
    } finally {
      setValidating(false);
    }
  };

  const importStudents = async () => {
    if (!file || !validationResults) return;

    if (validationResults.errors.length > 0) {
      if (!confirm(`There are ${validationResults.errors.length} validation errors. Do you want to import only the valid students?`)) {
        return;
      }
    }

    setImporting(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-cbd74580/organisations/${organisationId}/students/bulk-import`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`
          },
          body: formData
        }
      );

      if (response.ok) {
        const data = await response.json();
        toast.success(`Successfully imported ${data.imported} students!`);
        setFile(null);
        setValidationResults(null);
        onComplete();
      } else {
        const error = await response.json();
        toast.error(error.message || 'Failed to import students');
      }
    } catch (error) {
      console.error('Error importing students:', error);
      toast.error('Failed to import students');
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-xl">Bulk Student Import</h3>
            <p className="text-sm text-gray-600 mt-1">
              Import multiple students at once using a CSV file
            </p>
          </div>
          <Button variant="outline" onClick={downloadTemplate}>
            <Download className="w-4 h-4 mr-2" />
            Download Template
          </Button>
        </div>

        {/* Upload Section */}
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
          <input
            type="file"
            accept=".csv"
            onChange={handleFileChange}
            className="hidden"
            id="csv-upload"
          />
          <label
            htmlFor="csv-upload"
            className="cursor-pointer flex flex-col items-center"
          >
            <Upload className="w-12 h-12 text-gray-400 mb-3" />
            {file ? (
              <>
                <p className="font-medium text-[#625d9c] mb-1">{file.name}</p>
                <p className="text-sm text-gray-600">
                  {(file.size / 1024).toFixed(2)} KB
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-3"
                  onClick={(e) => {
                    e.preventDefault();
                    setFile(null);
                    setValidationResults(null);
                  }}
                >
                  Remove File
                </Button>
              </>
            ) : (
              <>
                <p className="font-medium mb-1">Click to upload CSV file</p>
                <p className="text-sm text-gray-600">
                  or drag and drop
                </p>
              </>
            )}
          </label>
        </div>

        {file && !validationResults && (
          <Button
            onClick={validateFile}
            disabled={validating}
            className="w-full mt-4 bg-[#625d9c] hover:bg-[#524d82]"
          >
            {validating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Validating...
              </>
            ) : (
              <>
                <FileText className="w-4 h-4 mr-2" />
                Validate File
              </>
            )}
          </Button>
        )}
      </Card>

      {/* Validation Results */}
      {validationResults && (
        <>
          {/* Summary */}
          <div className="grid md:grid-cols-3 gap-4">
            <Card className="p-4">
              <div className="flex items-center justify-between mb-2">
                <FileText className="w-5 h-5 text-[#625d9c]" />
                <Badge variant="outline">Total</Badge>
              </div>
              <div className="text-2xl font-bold">{validationResults.totalRows}</div>
              <div className="text-sm text-gray-600">Rows in File</div>
            </Card>

            <Card className="p-4">
              <div className="flex items-center justify-between mb-2">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
                <Badge className="bg-green-100 text-green-800">Valid</Badge>
              </div>
              <div className="text-2xl font-bold text-green-600">
                {validationResults.valid.length}
              </div>
              <div className="text-sm text-gray-600">Ready to Import</div>
            </Card>

            <Card className="p-4">
              <div className="flex items-center justify-between mb-2">
                <XCircle className="w-5 h-5 text-red-600" />
                <Badge className="bg-red-100 text-red-800">Errors</Badge>
              </div>
              <div className="text-2xl font-bold text-red-600">
                {validationResults.errors.length}
              </div>
              <div className="text-sm text-gray-600">Need Fixing</div>
            </Card>
          </div>

          {/* Errors */}
          {validationResults.errors.length > 0 && (
            <Card className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <AlertTriangle className="w-5 h-5 text-red-600" />
                <h3 className="text-xl">Validation Errors</h3>
              </div>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {validationResults.errors.map((error, idx) => (
                  <Card key={idx} className="p-3 bg-red-50 border-red-200">
                    <div className="flex items-start gap-3">
                      <FileWarning className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
                      <div className="flex-1 text-sm">
                        <p className="font-medium text-red-900">
                          Row {error.row}: {error.field}
                        </p>
                        <p className="text-red-700 mt-1">
                          {error.error}
                        </p>
                        {error.value && (
                          <p className="text-xs text-red-600 mt-1 font-mono">
                            Value: "{error.value}"
                          </p>
                        )}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </Card>
          )}

          {/* Valid Students Preview */}
          {validationResults.valid.length > 0 && (
            <Card className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <Users className="w-5 h-5 text-green-600" />
                <h3 className="text-xl">Valid Students ({validationResults.valid.length})</h3>
              </div>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {validationResults.valid.slice(0, 10).map((student, idx) => (
                  <Card key={idx} className="p-3 bg-green-50 border-green-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">
                          {student.firstName} {student.lastName}
                        </p>
                        <p className="text-sm text-gray-600">
                          {student.email} • Year {student.yearGroup}
                        </p>
                        {student.subjects && (
                          <p className="text-xs text-gray-600 mt-1">
                            Subjects: {student.subjects}
                          </p>
                        )}
                      </div>
                      <CheckCircle2 className="w-5 h-5 text-green-600" />
                    </div>
                  </Card>
                ))}
                {validationResults.valid.length > 10 && (
                  <p className="text-sm text-gray-600 text-center pt-2">
                    ... and {validationResults.valid.length - 10} more
                  </p>
                )}
              </div>
            </Card>
          )}

          {/* Import Action */}
          {validationResults.valid.length > 0 && (
            <Card className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium">Ready to Import</h4>
                  <p className="text-sm text-gray-600 mt-1">
                    {validationResults.valid.length} student{validationResults.valid.length !== 1 ? 's' : ''} will be imported
                    {validationResults.errors.length > 0 && (
                      <span className="text-red-600">
                        {' '}({validationResults.errors.length} row{validationResults.errors.length !== 1 ? 's' : ''} will be skipped due to errors)
                      </span>
                    )}
                  </p>
                </div>
                <Button
                  onClick={importStudents}
                  disabled={importing}
                  className="bg-[#5d9827] hover:bg-[#4a7a1f]"
                >
                  {importing ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Importing...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4 mr-2" />
                      Import Students
                    </>
                  )}
                </Button>
              </div>
            </Card>
          )}
        </>
      )}

      {/* Instructions */}
      <Card className="p-6 bg-blue-50 border-blue-200">
        <h4 className="font-medium text-blue-900 mb-2">CSV File Requirements</h4>
        <ul className="text-sm text-blue-900 space-y-1">
          <li>• <strong>firstName:</strong> Required - Student's first name</li>
          <li>• <strong>lastName:</strong> Required - Student's last name</li>
          <li>• <strong>email:</strong> Required - Valid email address</li>
          <li>• <strong>dateOfBirth:</strong> Required - Format: YYYY-MM-DD</li>
          <li>• <strong>yearGroup:</strong> Required - Number (e.g., 7, 8, 9)</li>
          <li>• <strong>subjects:</strong> Optional - Semicolon-separated (e.g., "Maths;English;Science")</li>
          <li>• <strong>specialNeeds:</strong> Optional - Any special educational needs</li>
          <li>• <strong>parentEmail:</strong> Optional - Parent/guardian email for notifications</li>
        </ul>
      </Card>
    </div>
  );
}
