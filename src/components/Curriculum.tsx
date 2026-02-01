import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { CurriculumResourceViewer } from './CurriculumResourceViewer';
import { CURRICULUM_DATA, type CurriculumTopic } from './CurriculumData';
import { 
  BookOpen, 
  GraduationCap, 
  Search, 
  ChevronDown, 
  ChevronRight,
  Download,
  Eye,
  Filter
} from 'lucide-react';

export function Curriculum() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedClass, setSelectedClass] = useState<string>('all');
  const [selectedSubject, setSelectedSubject] = useState<string>('all');
  const [expandedTopics, setExpandedTopics] = useState<Set<string>>(new Set());
  const [selectedTopic, setSelectedTopic] = useState<CurriculumTopic | null>(null);
  const [showResourceViewer, setShowResourceViewer] = useState(false);

  const toggleTopic = (topicId: string) => {
    const newExpanded = new Set(expandedTopics);
    if (newExpanded.has(topicId)) {
      newExpanded.delete(topicId);
    } else {
      newExpanded.add(topicId);
    }
    setExpandedTopics(newExpanded);
  };

  const handleViewResources = (topic: CurriculumTopic) => {
    setSelectedTopic(topic);
    setShowResourceViewer(true);
  };

  const handleDownloadAll = (topic: CurriculumTopic) => {
    alert(`Downloading all ${topic.resources.length} resources for: ${topic.title}\n\nThis will download:\n${topic.resources.map((r, i) => `${i + 1}. ${r.title} (${r.format || 'PDF'})`).join('\n')}`);
  };

  const filteredCurriculum = CURRICULUM_DATA.filter(currClass => {
    if (selectedClass !== 'all' && currClass.id !== selectedClass) return false;
    return true;
  }).map(currClass => {
    const filteredSubjects = currClass.subjects.filter(subject => {
      if (selectedSubject !== 'all' && subject.id !== selectedSubject) return false;
      return true;
    }).map(subject => {
      const filteredTopics = subject.topics.filter(topic => {
        if (!searchQuery) return true;
        const query = searchQuery.toLowerCase();
        return (
          topic.title.toLowerCase().includes(query) ||
          topic.description.toLowerCase().includes(query) ||
          topic.learningOutcomes.some(outcome => outcome.toLowerCase().includes(query))
        );
      });
      return { ...subject, topics: filteredTopics };
    }).filter(subject => subject.topics.length > 0);

    return { ...currClass, subjects: filteredSubjects };
  }).filter(currClass => currClass.subjects.length > 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="flex items-center gap-2 mb-2">
          <GraduationCap className="w-6 h-6" style={{ color: '#625d9c' }} />
          Curriculum Library
        </h2>
        <p className="text-gray-600">
          Browse detailed curriculum organized by class levels with learning outcomes and resources
        </p>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <Input
                type="text"
                placeholder="Search topics, learning outcomes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Filters */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm mb-2 block text-gray-700">
                  <Filter className="w-4 h-4 inline mr-1" />
                  Filter by Class/Level
                </label>
                <select
                  value={selectedClass}
                  onChange={(e) => setSelectedClass(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#625d9c]"
                >
                  <option value="all">All Levels</option>
                  {CURRICULUM_DATA.map(currClass => (
                    <option key={currClass.id} value={currClass.id}>
                      {currClass.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-sm mb-2 block text-gray-700">
                  <Filter className="w-4 h-4 inline mr-1" />
                  Filter by Subject
                </label>
                <select
                  value={selectedSubject}
                  onChange={(e) => setSelectedSubject(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#625d9c]"
                >
                  <option value="all">All Subjects</option>
                  <option value="mathematics">Mathematics</option>
                  <option value="english">English</option>
                  <option value="science">Science</option>
                  <option value="sciences">Sciences (Separate)</option>
                  <option value="biology">Biology</option>
                  <option value="chemistry">Chemistry</option>
                  <option value="physics">Physics</option>
                  <option value="literacy">Literacy</option>
                  <option value="literature">Literature</option>
                </select>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Curriculum Content */}
      <div className="space-y-6">
        {filteredCurriculum.map(currClass => (
          <Card key={currClass.id} className="overflow-hidden">
            <CardHeader style={{ backgroundColor: '#f8f7fc' }}>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    {currClass.name}
                    <Badge variant="outline" style={{ borderColor: '#625d9c', color: '#625d9c' }}>
                      {currClass.ageRange}
                    </Badge>
                  </CardTitle>
                  <CardDescription className="mt-2">{currClass.description}</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="space-y-6">
                {currClass.subjects.map(subject => (
                  <div key={subject.id} className="border-l-4 pl-4" style={{ borderColor: '#5d9827' }}>
                    <h3 className="mb-4 flex items-center gap-2">
                      <BookOpen className="w-5 h-5" style={{ color: '#5d9827' }} />
                      {subject.name}
                    </h3>

                    <div className="space-y-3">
                      {subject.topics.map(topic => (
                        <div key={topic.id} className="border rounded-lg overflow-hidden">
                          <button
                            onClick={() => toggleTopic(topic.id)}
                            className="w-full px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors flex items-center justify-between"
                          >
                            <div className="flex items-center gap-3 flex-1 text-left">
                              {expandedTopics.has(topic.id) ? (
                                <ChevronDown className="w-5 h-5 text-gray-500" />
                              ) : (
                                <ChevronRight className="w-5 h-5 text-gray-500" />
                              )}
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="font-medium">{topic.title}</span>
                                  <Badge variant="outline" className="text-xs">
                                    {topic.resources.length} resources
                                  </Badge>
                                </div>
                                <p className="text-sm text-gray-600">{topic.description}</p>
                              </div>
                            </div>
                            <Badge variant="outline" className="ml-2">
                              {topic.duration}
                            </Badge>
                          </button>

                          {expandedTopics.has(topic.id) && (
                            <div className="px-4 py-4 bg-white border-t">
                              <div className="mb-4">
                                <h4 className="text-sm mb-3" style={{ color: '#625d9c' }}>
                                  Learning Outcomes:
                                </h4>
                                <ul className="space-y-2">
                                  {topic.learningOutcomes.map((outcome, index) => (
                                    <li key={index} className="flex items-start gap-2 text-sm">
                                      <span className="text-[#5d9827] mt-1">✓</span>
                                      <span>{outcome}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>

                              <div className="flex gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="flex items-center gap-2"
                                  style={{ borderColor: '#625d9c', color: '#625d9c' }}
                                  onClick={() => handleViewResources(topic)}
                                >
                                  <Eye className="w-4 h-4" />
                                  View Resources
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="flex items-center gap-2"
                                  style={{ borderColor: '#5d9827', color: '#5d9827' }}
                                  onClick={() => handleDownloadAll(topic)}
                                >
                                  <Download className="w-4 h-4" />
                                  Download Materials
                                </Button>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredCurriculum.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <BookOpen className="w-16 h-16 mx-auto mb-4 text-gray-400" />
            <h3 className="text-gray-600 mb-2">No curriculum found</h3>
            <p className="text-gray-500">Try adjusting your search or filters</p>
          </CardContent>
        </Card>
      )}

      {showResourceViewer && selectedTopic && (
        <CurriculumResourceViewer
          open={showResourceViewer}
          onOpenChange={setShowResourceViewer}
          topicTitle={selectedTopic.title}
          topicDescription={selectedTopic.description}
          resources={selectedTopic.resources}
        />
      )}
    </div>
  );
}