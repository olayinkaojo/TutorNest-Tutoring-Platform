import { useState, useEffect } from 'react';
import { projectId } from '../utils/supabase/info';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Badge } from './ui/badge';
import { Alert, AlertDescription } from './ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { 
  FileText, 
  Copy,
  Edit,
  Eye,
  Clock,
  CheckCircle,
  AlertCircle,
  Plus,
  History,
  Target,
  BookOpen,
  Home
} from 'lucide-react';

interface LessonTemplatesProps {
  session: any;
  userRole: 'parent' | 'tutor';
}

interface LessonTemplate {
  id: string;
  title: string;
  subject: string;
  level: string;
  topic: string;
  subtopic: string;
  duration: number;
  difficulty: 'foundation' | 'intermediate' | 'advanced';
  learningObjectives: string[];
  activities: Activity[];
  homework: string;
  materials: string[];
  tutorNotes: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  isPublic: boolean;
  versions: TemplateVersion[];
  clonedFrom?: string;
}

interface Activity {
  title: string;
  duration: number;
  description: string;
  type: 'warmup' | 'instruction' | 'practice' | 'assessment' | 'review';
}

interface TemplateVersion {
  version: number;
  updatedAt: string;
  changes: string;
}

export function LessonTemplates({ session, userRole }: LessonTemplatesProps) {
  const [templates, setTemplates] = useState<LessonTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<LessonTemplate | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'view' | 'edit' | 'create'>('list');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [saving, setSaving] = useState(false);
  const [showVersionHistory, setShowVersionHistory] = useState(false);

  // Form state for create/edit
  const [formData, setFormData] = useState<Partial<LessonTemplate>>({
    title: '',
    subject: '',
    level: '',
    topic: '',
    subtopic: '',
    duration: 60,
    difficulty: 'intermediate',
    learningObjectives: [''],
    activities: [{
      title: '',
      duration: 15,
      description: '',
      type: 'instruction'
    }],
    homework: '',
    materials: [''],
    tutorNotes: '',
    isPublic: false,
  });

  useEffect(() => {
    fetchTemplates();

    // Listen for navigation from SyllabusMapping
    const handleNavigate = (e: any) => {
      const { subtopicId } = e.detail;
      // Filter templates by subtopic
      const filtered = templates.filter(t => t.subtopic === subtopicId);
      setTemplates(filtered);
    };

    window.addEventListener('navigateToTemplates', handleNavigate as any);
    return () => window.removeEventListener('navigateToTemplates', handleNavigate as any);
  }, []);

  const fetchTemplates = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-cbd74580/templates`,
        {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setTemplates(data.templates || []);
      }
    } catch (err: any) {
      console.error('Error fetching templates:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCloneTemplate = async (template: LessonTemplate) => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-cbd74580/templates/${template.id}/clone`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to clone template');
      }

      const data = await response.json();
      setSuccess('Template cloned successfully!');
      setFormData(data.template);
      setViewMode('edit');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      console.error('Error cloning template:', err);
      setError(err.message);
    }
  };

  const handleSaveTemplate = async () => {
    setSaving(true);
    setError('');

    try {
      const url = selectedTemplate
        ? `https://${projectId}.supabase.co/functions/v1/make-server-cbd74580/templates/${selectedTemplate.id}`
        : `https://${projectId}.supabase.co/functions/v1/make-server-cbd74580/templates`;

      const response = await fetch(url, {
        method: selectedTemplate ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        throw new Error('Failed to save template');
      }

      setSuccess(selectedTemplate ? 'Template updated!' : 'Template created!');
      await fetchTemplates();
      setViewMode('list');
      setSelectedTemplate(null);
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      console.error('Error saving template:', err);
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const addLearningObjective = () => {
    setFormData({
      ...formData,
      learningObjectives: [...(formData.learningObjectives || []), ''],
    });
  };

  const updateLearningObjective = (index: number, value: string) => {
    const objectives = [...(formData.learningObjectives || [])];
    objectives[index] = value;
    setFormData({ ...formData, learningObjectives: objectives });
  };

  const removeLearningObjective = (index: number) => {
    const objectives = [...(formData.learningObjectives || [])];
    objectives.splice(index, 1);
    setFormData({ ...formData, learningObjectives: objectives });
  };

  const addActivity = () => {
    setFormData({
      ...formData,
      activities: [
        ...(formData.activities || []),
        { title: '', duration: 15, description: '', type: 'instruction' }
      ],
    });
  };

  const updateActivity = (index: number, field: keyof Activity, value: any) => {
    const activities = [...(formData.activities || [])];
    activities[index] = { ...activities[index], [field]: value };
    setFormData({ ...formData, activities });
  };

  const removeActivity = (index: number) => {
    const activities = [...(formData.activities || [])];
    activities.splice(index, 1);
    setFormData({ ...formData, activities });
  };

  const addMaterial = () => {
    setFormData({
      ...formData,
      materials: [...(formData.materials || []), ''],
    });
  };

  const updateMaterial = (index: number, value: string) => {
    const materials = [...(formData.materials || [])];
    materials[index] = value;
    setFormData({ ...formData, materials });
  };

  const removeMaterial = (index: number) => {
    const materials = [...(formData.materials || [])];
    materials.splice(index, 1);
    setFormData({ ...formData, materials });
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'foundation': return 'bg-blue-100 text-blue-800';
      case 'intermediate': return 'bg-purple-100 text-purple-800';
      case 'advanced': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'warmup': return '🔥';
      case 'instruction': return '📚';
      case 'practice': return '✏️';
      case 'assessment': return '✅';
      case 'review': return '🔄';
      default: return '📝';
    }
  };

  // Template List View
  if (viewMode === 'list') {
    return (
      <div className="space-y-6">
        {success && (
          <Alert className="bg-green-50 border-green-200">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">{success}</AlertDescription>
          </Alert>
        )}

        {error && (
          <Alert className="bg-red-50 border-red-200">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800">{error}</AlertDescription>
          </Alert>
        )}

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Lesson Templates</CardTitle>
                <CardDescription>
                  Browse, clone, and adapt curriculum-aligned lesson plans
                </CardDescription>
              </div>
              {userRole === 'tutor' && (
                <Button
                  onClick={() => {
                    setFormData({
                      title: '',
                      subject: '',
                      level: '',
                      topic: '',
                      subtopic: '',
                      duration: 60,
                      difficulty: 'intermediate',
                      learningObjectives: [''],
                      activities: [{
                        title: '',
                        duration: 15,
                        description: '',
                        type: 'instruction'
                      }],
                      homework: '',
                      materials: [''],
                      tutorNotes: '',
                      isPublic: false,
                    });
                    setSelectedTemplate(null);
                    setViewMode('create');
                  }}
                  className="text-white"
                  style={{ backgroundColor: '#625d9c' }}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Create Template
                </Button>
              )}
            </div>
          </CardHeader>
        </Card>

        {loading ? (
          <Card>
            <CardContent className="py-12 text-center">
              <FileText className="w-8 h-8 animate-pulse mx-auto mb-4" style={{ color: '#625d9c' }} />
              <p className="text-gray-600">Loading templates...</p>
            </CardContent>
          </Card>
        ) : (
          <Tabs defaultValue="all">
            <TabsList>
              <TabsTrigger value="all">All Templates ({templates.length})</TabsTrigger>
              <TabsTrigger value="mine">
                My Templates ({templates.filter(t => t.createdBy === session.user.id).length})
              </TabsTrigger>
              <TabsTrigger value="public">
                Community ({templates.filter(t => t.isPublic).length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="all" className="space-y-3 mt-4">
              {templates.map((template) => (
                <Card key={template.id}>
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3>{template.title}</h3>
                          <Badge className={getDifficultyColor(template.difficulty)}>
                            {template.difficulty}
                          </Badge>
                          {template.clonedFrom && (
                            <Badge variant="outline">Adapted</Badge>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 mb-2">
                          {template.subject} • {template.level} • {template.topic}
                        </p>
                        <div className="flex items-center gap-4 text-xs text-gray-500">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {template.duration} min
                          </span>
                          <span className="flex items-center gap-1">
                            <Target className="w-3 h-3" />
                            {template.learningObjectives.length} objectives
                          </span>
                          <span className="flex items-center gap-1">
                            <BookOpen className="w-3 h-3" />
                            {template.activities.length} activities
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedTemplate(template);
                          setViewMode('view');
                        }}
                      >
                        <Eye className="w-4 h-4 mr-2" />
                        View
                      </Button>
                      {userRole === 'tutor' && (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleCloneTemplate(template)}
                          >
                            <Copy className="w-4 h-4 mr-2" />
                            Clone & Adapt
                          </Button>
                          {template.createdBy === session.user.id && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedTemplate(template);
                                setFormData(template);
                                setViewMode('edit');
                              }}
                            >
                              <Edit className="w-4 h-4 mr-2" />
                              Edit
                            </Button>
                          )}
                        </>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}

              {templates.length === 0 && (
                <Card>
                  <CardContent className="py-12 text-center text-gray-500">
                    <FileText className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                    <p>No templates available</p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="mine" className="space-y-3 mt-4">
              {templates.filter(t => t.createdBy === session.user.id).map((template) => (
                <Card key={template.id}>
                  <CardContent className="pt-6">
                    {/* Same card content as "all" tab */}
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h3 className="mb-1">{template.title}</h3>
                        <p className="text-sm text-gray-600">{template.subject} • {template.level}</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedTemplate(template);
                          setFormData(template);
                          setViewMode('edit');
                        }}
                      >
                        <Edit className="w-4 h-4 mr-2" />
                        Edit
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </TabsContent>

            <TabsContent value="public" className="space-y-3 mt-4">
              {templates.filter(t => t.isPublic).map((template) => (
                <Card key={template.id}>
                  <CardContent className="pt-6">
                    <h3 className="mb-2">{template.title}</h3>
                    <p className="text-sm text-gray-600 mb-4">{template.subject}</p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleCloneTemplate(template)}
                    >
                      <Copy className="w-4 h-4 mr-2" />
                      Clone
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </TabsContent>
          </Tabs>
        )}
      </div>
    );
  }

  // Template View Mode
  if (viewMode === 'view' && selectedTemplate) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => {
              setSelectedTemplate(null);
              setViewMode('list');
            }}
          >
            ← Back
          </Button>
          {userRole === 'tutor' && (
            <Button
              onClick={() => handleCloneTemplate(selectedTemplate)}
              className="text-white ml-auto"
              style={{ backgroundColor: '#625d9c' }}
            >
              <Copy className="w-4 h-4 mr-2" />
              Clone & Adapt
            </Button>
          )}
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle>{selectedTemplate.title}</CardTitle>
                <CardDescription>
                  {selectedTemplate.subject} • {selectedTemplate.level} • {selectedTemplate.topic}
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <Badge className={getDifficultyColor(selectedTemplate.difficulty)}>
                  {selectedTemplate.difficulty}
                </Badge>
                <Badge variant="outline">
                  <Clock className="w-3 h-3 mr-1" />
                  {selectedTemplate.duration} min
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Learning Objectives - Always visible */}
            <div>
              <h3 className="mb-3 flex items-center gap-2">
                <Target className="w-5 h-5" style={{ color: '#625d9c' }} />
                Learning Objectives
              </h3>
              <ul className="space-y-2">
                {selectedTemplate.learningObjectives.map((objective, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-700">{objective}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Activities */}
            <div>
              <h3 className="mb-3">Activities</h3>
              <div className="space-y-3">
                {selectedTemplate.activities.map((activity, idx) => (
                  <Card key={idx} className="bg-gray-50">
                    <CardContent className="pt-4">
                      <div className="flex items-start gap-3">
                        <span className="text-2xl">{getActivityIcon(activity.type)}</span>
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-1">
                            <h4 className="text-sm">{activity.title}</h4>
                            <Badge variant="outline" className="text-xs">
                              {activity.duration} min
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-600">{activity.description}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            {/* Homework */}
            <div>
              <h3 className="mb-3 flex items-center gap-2">
                <Home className="w-5 h-5" style={{ color: '#625d9c' }} />
                Homework
              </h3>
              <p className="text-gray-700 bg-gray-50 p-4 rounded-lg">{selectedTemplate.homework}</p>
            </div>

            {/* Materials */}
            <div>
              <h3 className="mb-3">Required Materials</h3>
              <ul className="space-y-1">
                {selectedTemplate.materials.map((material, idx) => (
                  <li key={idx} className="flex items-center gap-2 text-gray-700">
                    <div className="w-1.5 h-1.5 rounded-full bg-gray-400" />
                    {material}
                  </li>
                ))}
              </ul>
            </div>

            {/* Tutor Notes - Only visible to tutors */}
            {userRole === 'tutor' && selectedTemplate.tutorNotes && (
              <div>
                <Alert className="bg-amber-50 border-amber-200">
                  <AlertCircle className="h-4 w-4 text-amber-600" />
                  <AlertDescription className="text-amber-800">
                    <strong>Tutor Notes (Private):</strong>
                    <p className="mt-2">{selectedTemplate.tutorNotes}</p>
                  </AlertDescription>
                </Alert>
              </div>
            )}

            {/* Version History */}
            {selectedTemplate.versions && selectedTemplate.versions.length > 1 && (
              <div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowVersionHistory(!showVersionHistory)}
                >
                  <History className="w-4 h-4 mr-2" />
                  Version History ({selectedTemplate.versions.length})
                </Button>

                {showVersionHistory && (
                  <div className="mt-3 space-y-2">
                    {selectedTemplate.versions.map((version) => (
                      <div key={version.version} className="p-3 bg-gray-50 rounded-lg text-sm">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-medium">Version {version.version}</span>
                          <span className="text-xs text-gray-500">
                            {new Date(version.updatedAt).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="text-gray-600">{version.changes}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // Create/Edit Mode
  return (
    <div className="space-y-6">
      {error && (
        <Alert className="bg-red-50 border-red-200">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">{error}</AlertDescription>
        </Alert>
      )}

      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          onClick={() => {
            setSelectedTemplate(null);
            setViewMode('list');
          }}
        >
          ← Cancel
        </Button>
        <Button
          onClick={handleSaveTemplate}
          disabled={saving || !formData.title}
          className="text-white"
          style={{ backgroundColor: '#5d9827' }}
        >
          {saving ? 'Saving...' : selectedTemplate ? 'Save Changes' : 'Create Template'}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>
            {selectedTemplate ? 'Edit Template' : 'Create New Template'}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Basic Info */}
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Title *</label>
              <input
                type="text"
                value={formData.title || ''}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full p-2 border rounded-lg"
                placeholder="e.g., Introduction to Algebra"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Duration (minutes)</label>
              <input
                type="number"
                value={formData.duration || 60}
                onChange={(e) => setFormData({ ...formData, duration: parseInt(e.target.value) })}
                className="w-full p-2 border rounded-lg"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Subject</label>
              <input
                type="text"
                value={formData.subject || ''}
                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                className="w-full p-2 border rounded-lg"
                placeholder="e.g., Mathematics"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Level</label>
              <input
                type="text"
                value={formData.level || ''}
                onChange={(e) => setFormData({ ...formData, level: e.target.value })}
                className="w-full p-2 border rounded-lg"
                placeholder="e.g., GCSE"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Difficulty</label>
              <select
                value={formData.difficulty || 'intermediate'}
                onChange={(e) => setFormData({ ...formData, difficulty: e.target.value as any })}
                className="w-full p-2 border rounded-lg"
              >
                <option value="foundation">Foundation</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
              </select>
            </div>
          </div>

          {/* Learning Objectives */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="text-sm font-medium">Learning Objectives</label>
              <Button size="sm" variant="outline" onClick={addLearningObjective}>
                <Plus className="w-4 h-4 mr-1" />
                Add
              </Button>
            </div>
            <div className="space-y-2">
              {formData.learningObjectives?.map((objective, idx) => (
                <div key={idx} className="flex gap-2">
                  <input
                    type="text"
                    value={objective}
                    onChange={(e) => updateLearningObjective(idx, e.target.value)}
                    className="flex-1 p-2 border rounded-lg"
                    placeholder="Students will be able to..."
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => removeLearningObjective(idx)}
                  >
                    ✕
                  </Button>
                </div>
              ))}
            </div>
          </div>

          {/* Activities */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="text-sm font-medium">Activities</label>
              <Button size="sm" variant="outline" onClick={addActivity}>
                <Plus className="w-4 h-4 mr-1" />
                Add Activity
              </Button>
            </div>
            <div className="space-y-3">
              {formData.activities?.map((activity, idx) => (
                <Card key={idx} className="bg-gray-50">
                  <CardContent className="pt-4 space-y-3">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={activity.title}
                        onChange={(e) => updateActivity(idx, 'title', e.target.value)}
                        className="flex-1 p-2 border rounded-lg"
                        placeholder="Activity title"
                      />
                      <input
                        type="number"
                        value={activity.duration}
                        onChange={(e) => updateActivity(idx, 'duration', parseInt(e.target.value))}
                        className="w-24 p-2 border rounded-lg"
                        placeholder="Min"
                      />
                      <select
                        value={activity.type}
                        onChange={(e) => updateActivity(idx, 'type', e.target.value)}
                        className="p-2 border rounded-lg"
                      >
                        <option value="warmup">Warm-up</option>
                        <option value="instruction">Instruction</option>
                        <option value="practice">Practice</option>
                        <option value="assessment">Assessment</option>
                        <option value="review">Review</option>
                      </select>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => removeActivity(idx)}
                      >
                        ✕
                      </Button>
                    </div>
                    <textarea
                      value={activity.description}
                      onChange={(e) => updateActivity(idx, 'description', e.target.value)}
                      className="w-full p-2 border rounded-lg resize-none"
                      rows={2}
                      placeholder="Activity description..."
                    />
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Homework */}
          <div>
            <label className="text-sm font-medium mb-2 block">Homework</label>
            <textarea
              value={formData.homework || ''}
              onChange={(e) => setFormData({ ...formData, homework: e.target.value })}
              className="w-full p-3 border rounded-lg resize-none"
              rows={3}
              placeholder="Describe homework assignment..."
            />
          </div>

          {/* Materials */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="text-sm font-medium">Required Materials</label>
              <Button size="sm" variant="outline" onClick={addMaterial}>
                <Plus className="w-4 h-4 mr-1" />
                Add
              </Button>
            </div>
            <div className="space-y-2">
              {formData.materials?.map((material, idx) => (
                <div key={idx} className="flex gap-2">
                  <input
                    type="text"
                    value={material}
                    onChange={(e) => updateMaterial(idx, e.target.value)}
                    className="flex-1 p-2 border rounded-lg"
                    placeholder="e.g., Whiteboard, Calculator"
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => removeMaterial(idx)}
                  >
                    ✕
                  </Button>
                </div>
              ))}
            </div>
          </div>

          {/* Tutor Notes */}
          <div>
            <label className="text-sm font-medium mb-2 block">
              Tutor Notes (Private - Not visible to parents)
            </label>
            <textarea
              value={formData.tutorNotes || ''}
              onChange={(e) => setFormData({ ...formData, tutorNotes: e.target.value })}
              className="w-full p-3 border rounded-lg resize-none"
              rows={3}
              placeholder="Private notes, tips, common mistakes to watch for..."
            />
          </div>

          {/* Public Toggle */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isPublic"
              checked={formData.isPublic || false}
              onChange={(e) => setFormData({ ...formData, isPublic: e.target.checked })}
              className="w-4 h-4"
            />
            <label htmlFor="isPublic" className="text-sm">
              Make this template public (share with TutorNest community)
            </label>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}