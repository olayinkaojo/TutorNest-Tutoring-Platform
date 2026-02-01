import { useState, useEffect } from 'react';
import { projectId } from '../utils/supabase/info';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Badge } from './ui/badge';
import { Alert, AlertDescription } from './ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { 
  BookOpen, 
  ChevronRight,
  Search,
  Filter,
  Clock,
  GraduationCap,
  FileText,
  CheckCircle,
  AlertCircle
} from 'lucide-react';

interface SyllabusMappingProps {
  session: any;
}

interface Subject {
  id: string;
  name: string;
  icon: string;
  levels: Level[];
}

interface Level {
  id: string;
  name: string;
  keyStage: string;
  examBoards: string[];
  topics: Topic[];
}

interface Topic {
  id: string;
  name: string;
  description: string;
  subtopics: Subtopic[];
}

interface Subtopic {
  id: string;
  name: string;
  description: string;
  learningObjectives: string[];
  resources: number;
  difficulty: 'foundation' | 'intermediate' | 'advanced';
}

export function SyllabusMapping({ session }: SyllabusMappingProps) {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
  const [selectedLevel, setSelectedLevel] = useState<Level | null>(null);
  const [selectedTopic, setSelectedTopic] = useState<Topic | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedExamBoard, setSelectedExamBoard] = useState<string>('all');

  useEffect(() => {
    fetchSyllabus();
  }, []);

  useEffect(() => {
    if (searchQuery.trim()) {
      const timer = setTimeout(() => {
        handleSearch();
      }, 300);
      return () => clearTimeout(timer);
    } else {
      setSearchResults([]);
    }
  }, [searchQuery]);

  const fetchSyllabus = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-cbd74580/syllabus/subjects`,
        {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setSubjects(data.subjects || []);
      }
    } catch (err: any) {
      console.error('Error fetching syllabus:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    setSearching(true);
    const startTime = Date.now();

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-cbd74580/syllabus/search?q=${encodeURIComponent(searchQuery)}`,
        {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setSearchResults(data.results || []);
        
        const duration = Date.now() - startTime;
        console.log(`Search completed in ${duration}ms`);
      }
    } catch (err: any) {
      console.error('Error searching:', err);
      setError(err.message);
    } finally {
      setSearching(false);
    }
  };

  const getDifficultyBadge = (difficulty: string) => {
    switch (difficulty) {
      case 'foundation':
        return <Badge variant="secondary">Foundation</Badge>;
      case 'intermediate':
        return <Badge style={{ backgroundColor: '#625d9c', color: 'white' }}>Intermediate</Badge>;
      case 'advanced':
        return <Badge style={{ backgroundColor: '#5d9827', color: 'white' }}>Advanced</Badge>;
      default:
        return <Badge variant="outline">{difficulty}</Badge>;
    }
  };

  const Breadcrumb = () => (
    <div className="flex items-center gap-2 text-sm text-gray-600 mb-4">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => {
          setSelectedSubject(null);
          setSelectedLevel(null);
          setSelectedTopic(null);
        }}
      >
        All Subjects
      </Button>
      {selectedSubject && (
        <>
          <ChevronRight className="w-4 h-4" />
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSelectedLevel(null);
              setSelectedTopic(null);
            }}
          >
            {selectedSubject.name}
          </Button>
        </>
      )}
      {selectedLevel && (
        <>
          <ChevronRight className="w-4 h-4" />
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSelectedTopic(null);
            }}
          >
            {selectedLevel.name}
          </Button>
        </>
      )}
      {selectedTopic && (
        <>
          <ChevronRight className="w-4 h-4" />
          <span className="font-medium text-gray-900">{selectedTopic.name}</span>
        </>
      )}
    </div>
  );

  if (loading) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <BookOpen className="w-8 h-8 animate-pulse mx-auto mb-4" style={{ color: '#625d9c' }} />
          <p className="text-gray-600">Loading syllabus...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {error && (
        <Alert className="bg-red-50 border-red-200">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">{error}</AlertDescription>
        </Alert>
      )}

      {/* Search Bar */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search topics across all subjects..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>
            <Button
              onClick={handleSearch}
              disabled={!searchQuery.trim() || searching}
              className="text-white"
              style={{ backgroundColor: '#625d9c' }}
            >
              {searching ? 'Searching...' : 'Search'}
            </Button>
          </div>

          {searchResults.length > 0 && (
            <div className="mt-4 space-y-2">
              <p className="text-sm text-gray-600">
                Found {searchResults.length} result{searchResults.length !== 1 ? 's' : ''}
              </p>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {searchResults.map((result, idx) => (
                  <div
                    key={idx}
                    onClick={() => {
                      const subject = subjects.find(s => s.id === result.subjectId);
                      const level = subject?.levels.find(l => l.id === result.levelId);
                      const topic = level?.topics.find(t => t.id === result.topicId);
                      if (subject && level && topic) {
                        setSelectedSubject(subject);
                        setSelectedLevel(level);
                        setSelectedTopic(topic);
                        setSearchQuery('');
                        setSearchResults([]);
                      }
                    }}
                    className="p-4 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-medium">{result.name}</p>
                        <p className="text-sm text-gray-600 mt-1">{result.description}</p>
                        <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
                          <span>{result.subjectName}</span>
                          <span>•</span>
                          <span>{result.levelName}</span>
                          <span>•</span>
                          <span>{result.topicName}</span>
                        </div>
                      </div>
                      {getDifficultyBadge(result.difficulty)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Breadcrumb />

      {/* Subject Selection */}
      {!selectedSubject && (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {subjects.map((subject) => (
            <Card
              key={subject.id}
              className="cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => setSelectedSubject(subject)}
            >
              <CardContent className="pt-6">
                <div className="text-4xl mb-4">{subject.icon}</div>
                <h3 className="mb-2">{subject.name}</h3>
                <p className="text-sm text-gray-600">
                  {subject.levels.length} level{subject.levels.length !== 1 ? 's' : ''} available
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Level Selection */}
      {selectedSubject && !selectedLevel && (
        <Card>
          <CardHeader>
            <CardTitle>{selectedSubject.name}</CardTitle>
            <CardDescription>Select a level to browse topics</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {selectedSubject.levels.map((level) => (
              <div
                key={level.id}
                onClick={() => setSelectedLevel(level)}
                className="p-4 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer transition-colors"
              >
                <div className="flex items-center justify-between mb-2">
                  <h3>{level.name}</h3>
                  <Badge variant="outline">{level.keyStage}</Badge>
                </div>
                <p className="text-sm text-gray-600 mb-3">
                  {level.topics.length} topic{level.topics.length !== 1 ? 's' : ''}
                </p>
                <div className="flex flex-wrap gap-2">
                  {level.examBoards.map((board, idx) => (
                    <Badge key={idx} variant="secondary">{board}</Badge>
                  ))}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Topic Selection with Exam Board Filter */}
      {selectedLevel && !selectedTopic && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>{selectedLevel.name}</CardTitle>
                <CardDescription>{selectedLevel.keyStage}</CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-gray-600" />
                <select
                  value={selectedExamBoard}
                  onChange={(e) => setSelectedExamBoard(e.target.value)}
                  className="px-3 py-1 border rounded-lg text-sm"
                >
                  <option value="all">All Exam Boards</option>
                  {selectedLevel.examBoards.map((board) => (
                    <option key={board} value={board}>{board}</option>
                  ))}
                </select>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {selectedLevel.topics.map((topic) => (
              <div
                key={topic.id}
                onClick={() => setSelectedTopic(topic)}
                className="p-4 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer transition-colors"
              >
                <h3 className="mb-2">{topic.name}</h3>
                <p className="text-sm text-gray-600 mb-3">{topic.description}</p>
                <p className="text-xs text-gray-500">
                  {topic.subtopics.length} subtopic{topic.subtopics.length !== 1 ? 's' : ''}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Subtopic Details */}
      {selectedTopic && (
        <Card>
          <CardHeader>
            <CardTitle>{selectedTopic.name}</CardTitle>
            <CardDescription>{selectedTopic.description}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {selectedTopic.subtopics.map((subtopic) => (
              <Card key={subtopic.id} className="bg-gray-50">
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="mb-1">{subtopic.name}</h3>
                      <p className="text-sm text-gray-600">{subtopic.description}</p>
                    </div>
                    {getDifficultyBadge(subtopic.difficulty)}
                  </div>

                  <div className="space-y-3">
                    <div>
                      <p className="text-sm font-medium mb-2">Learning Objectives</p>
                      <ul className="space-y-1">
                        {subtopic.learningObjectives.map((objective, idx) => (
                          <li key={idx} className="flex items-start gap-2 text-sm text-gray-700">
                            <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                            <span>{objective}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t">
                      <p className="text-sm text-gray-600">
                        {subtopic.resources} resource{subtopic.resources !== 1 ? 's' : ''} available
                      </p>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          // Navigate to lesson templates with this subtopic
                          window.dispatchEvent(
                            new CustomEvent('navigateToTemplates', {
                              detail: { subtopicId: subtopic.id }
                            })
                          );
                        }}
                      >
                        <FileText className="w-4 h-4 mr-2" />
                        View Templates
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Info Alert */}
      <Alert className="bg-blue-50 border-blue-200">
        <GraduationCap className="h-4 w-4 text-blue-600" />
        <AlertDescription className="text-blue-800 text-sm">
          <strong>UK National Curriculum aligned.</strong> Content is mapped to Key Stages 1-5 with GCSE and A-Level
          exam board specifications (AQA, Edexcel, OCR, WJEC).
        </AlertDescription>
      </Alert>
    </div>
  );
}