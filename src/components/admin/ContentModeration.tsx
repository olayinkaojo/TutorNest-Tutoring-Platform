import React, { useState, useEffect } from 'react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Badge } from '../ui/badge';
import { Switch } from '../ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { 
  Shield,
  AlertTriangle,
  Ban,
  CheckCircle2,
  XCircle,
  MessageSquare,
  User,
  Flag,
  Eye,
  Loader2,
  Plus,
  Trash2,
  Edit,
  Filter,
  FileText
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { projectId, publicAnonKey } from '../../utils/supabase/info';
import { ModerationQueue } from '../ModerationQueue';
import { SanctionsManagement } from '../SanctionsManagement';
import { PoliciesView } from '../PoliciesView';

interface ProhibitedKeyword {
  id: string;
  keyword: string;
  category: 'contact-info' | 'profanity' | 'scam' | 'inappropriate' | 'harassment' | 'violence';
  severity: 'low' | 'medium' | 'high' | 'critical';
  action: 'flag' | 'block' | 'auto-moderate';
  matchType: 'exact' | 'contains' | 'regex';
  enabled: boolean;
  hits: number;
  lastTriggered?: string;
}

interface ContentFlag {
  id: string;
  contentType: 'message' | 'bio' | 'review' | 'comment';
  content: string;
  userId: string;
  userName: string;
  userRole: string;
  triggeredKeywords: string[];
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'pending' | 'reviewed' | 'approved' | 'removed';
  timestamp: string;
  reviewedBy?: string;
  reviewNotes?: string;
  action?: 'no-action' | 'warning' | 'content-removed' | 'account-suspended';
}

interface ModerationStats {
  flaggedToday: number;
  pendingReview: number;
  blockedMessages: number;
  totalKeywords: number;
  falsePositiveRate: number;
  autoModeratedRate: number;
}

interface ContentModerationProps {
  adminId: string;
  accessToken: string;
}

const CATEGORIES = [
  { id: 'contact-info', name: 'Contact Information', icon: MessageSquare, color: 'blue' },
  { id: 'profanity', name: 'Profanity', icon: Ban, color: 'red' },
  { id: 'scam', name: 'Scams & Fraud', icon: AlertTriangle, color: 'orange' },
  { id: 'inappropriate', name: 'Inappropriate Content', icon: XCircle, color: 'purple' },
  { id: 'harassment', name: 'Harassment', icon: Flag, color: 'red' },
  { id: 'violence', name: 'Violence & Threats', icon: AlertTriangle, color: 'red' }
];

const COMMON_KEYWORDS = {
  'contact-info': ['whatsapp', 'phone number', 'email me', 'call me', 'text me', '@gmail', '@yahoo', 'skype', 'telegram'],
  'scam': ['pay outside', 'cash only', 'bitcoin', 'wire transfer', 'gift card', 'western union', 'bank details'],
  'profanity': ['[profanity]', '[explicit]'],
  'inappropriate': ['[adult content]', 'meet offline', 'private session'],
  'harassment': ['[harassing language]', '[threatening language]'],
  'violence': ['[violent content]', '[threats]']
};

export function ContentModeration({ adminId, accessToken }: ContentModerationProps) {
  const [keywords, setKeywords] = useState<ProhibitedKeyword[]>([]);
  const [flags, setFlags] = useState<ContentFlag[]>([]);
  const [stats, setStats] = useState<ModerationStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedFlag, setSelectedFlag] = useState<ContentFlag | null>(null);
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('pending');
  
  const [newKeyword, setNewKeyword] = useState('');
  const [newCategory, setNewCategory] = useState<string>('contact-info');
  const [newSeverity, setNewSeverity] = useState<string>('medium');
  const [newAction, setNewAction] = useState<string>('flag');
  const [newMatchType, setNewMatchType] = useState<string>('contains');

  useEffect(() => {
    loadModerationData();
  }, []);

  const loadModerationData = async () => {
    setLoading(true);
    try {
      const [keywordsRes, flagsRes, statsRes] = await Promise.all([
        fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-cbd74580/admin/moderation/keywords`,
          { headers: { 'Authorization': `Bearer ${accessToken}` } }
        ),
        fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-cbd74580/admin/moderation/flags?status=${filterStatus}`,
          { headers: { 'Authorization': `Bearer ${accessToken}` } }
        ),
        fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-cbd74580/admin/moderation/stats`,
          { headers: { 'Authorization': `Bearer ${accessToken}` } }
        )
      ]);

      if (keywordsRes.ok) {
        const data = await keywordsRes.json();
        setKeywords(data.keywords || []);
      }

      if (flagsRes.ok) {
        const data = await flagsRes.json();
        setFlags(data.flags || []);
      }

      if (statsRes.ok) {
        const data = await statsRes.json();
        setStats(data.stats);
      }
    } catch (error) {
      console.error('Error loading moderation data:', error);
      toast.error('Failed to load moderation data');
    } finally {
      setLoading(false);
    }
  };

  const addKeyword = async () => {
    if (!newKeyword.trim()) {
      toast.error('Keyword cannot be empty');
      return;
    }

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-cbd74580/admin/moderation/keywords`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            keyword: newKeyword.toLowerCase(),
            category: newCategory,
            severity: newSeverity,
            action: newAction,
            matchType: newMatchType,
            addedBy: adminId
          })
        }
      );

      if (response.ok) {
        toast.success('Keyword added');
        setNewKeyword('');
        loadModerationData();
      } else {
        toast.error('Failed to add keyword');
      }
    } catch (error) {
      console.error('Error adding keyword:', error);
      toast.error('Failed to add keyword');
    }
  };

  const toggleKeyword = async (keywordId: string, enabled: boolean) => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-cbd74580/admin/moderation/keywords/${keywordId}`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ enabled })
        }
      );

      if (response.ok) {
        toast.success(`Keyword ${enabled ? 'enabled' : 'disabled'}`);
        loadModerationData();
      } else {
        toast.error('Failed to update keyword');
      }
    } catch (error) {
      console.error('Error updating keyword:', error);
      toast.error('Failed to update keyword');
    }
  };

  const deleteKeyword = async (keywordId: string) => {
    if (!confirm('Are you sure you want to delete this keyword?')) return;

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-cbd74580/admin/moderation/keywords/${keywordId}`,
        {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${accessToken}` }
        }
      );

      if (response.ok) {
        toast.success('Keyword deleted');
        loadModerationData();
      } else {
        toast.error('Failed to delete keyword');
      }
    } catch (error) {
      console.error('Error deleting keyword:', error);
      toast.error('Failed to delete keyword');
    }
  };

  const reviewFlag = async (flagId: string, action: 'no-action' | 'warning' | 'content-removed' | 'account-suspended', notes: string) => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-cbd74580/admin/moderation/flags/${flagId}/review`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            action,
            notes,
            reviewedBy: adminId
          })
        }
      );

      if (response.ok) {
        toast.success('Flag reviewed');
        setSelectedFlag(null);
        loadModerationData();
      } else {
        toast.error('Failed to review flag');
      }
    } catch (error) {
      console.error('Error reviewing flag:', error);
      toast.error('Failed to review flag');
    }
  };

  const bulkAddKeywords = async (category: string) => {
    const keywordsToAdd = COMMON_KEYWORDS[category as keyof typeof COMMON_KEYWORDS];
    if (!keywordsToAdd) return;

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-cbd74580/admin/moderation/keywords/bulk`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            keywords: keywordsToAdd.map(k => ({
              keyword: k,
              category,
              severity: category === 'violence' || category === 'harassment' ? 'high' : 'medium',
              action: category === 'contact-info' ? 'flag' : 'block',
              matchType: 'contains'
            })),
            addedBy: adminId
          })
        }
      );

      if (response.ok) {
        toast.success(`Added ${keywordsToAdd.length} keywords`);
        loadModerationData();
      } else {
        toast.error('Failed to add keywords');
      }
    } catch (error) {
      console.error('Error adding keywords:', error);
      toast.error('Failed to add keywords');
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-100 text-red-800';
      case 'high':
        return 'bg-orange-100 text-orange-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'low':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'reviewed':
        return 'bg-blue-100 text-blue-800';
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'removed':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredFlags = flags.filter(flag => 
    filterCategory === 'all' || flag.triggeredKeywords.some(k => {
      const keyword = keywords.find(kw => kw.keyword === k);
      return keyword?.category === filterCategory;
    })
  );

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="w-8 h-8 animate-spin text-[#625d9c]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl">Trust & Safety</h2>
          <p className="text-gray-600 mt-1">
            Content moderation, sanctions, and platform policies
          </p>
        </div>
        <Button variant="outline" onClick={loadModerationData}>
          <Shield className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Tabs for different safety features */}
      <Tabs defaultValue="keywords">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="keywords">
            <Shield className="w-4 h-4 mr-2" />
            Keywords
          </TabsTrigger>
          <TabsTrigger value="queue">
            <Flag className="w-4 h-4 mr-2" />
            Queue
          </TabsTrigger>
          <TabsTrigger value="sanctions">
            <Ban className="w-4 h-4 mr-2" />
            Sanctions
          </TabsTrigger>
          <TabsTrigger value="policies">
            <FileText className="w-4 h-4 mr-2" />
            Policies
          </TabsTrigger>
        </TabsList>

        <TabsContent value="keywords" className="space-y-6 mt-6">

      {/* Stats */}
      {stats && (
        <div className="grid md:grid-cols-5 gap-4">
          <Card className="p-4">
            <div className="flex items-center justify-between mb-2">
              <Flag className="w-5 h-5 text-[#625d9c]" />
              <Badge variant="outline">Today</Badge>
            </div>
            <div className="text-2xl font-bold">{stats.flaggedToday}</div>
            <div className="text-sm text-gray-600">Flagged Items</div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center justify-between mb-2">
              <Eye className="w-5 h-5 text-yellow-600" />
              <Badge variant="outline" className="text-yellow-600">Pending</Badge>
            </div>
            <div className="text-2xl font-bold">{stats.pendingReview}</div>
            <div className="text-sm text-gray-600">Awaiting Review</div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center justify-between mb-2">
              <Ban className="w-5 h-5 text-red-600" />
              <Badge variant="outline" className="text-red-600">Blocked</Badge>
            </div>
            <div className="text-2xl font-bold">{stats.blockedMessages}</div>
            <div className="text-sm text-gray-600">Messages Blocked</div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center justify-between mb-2">
              <Shield className="w-5 h-5 text-blue-600" />
              <Badge variant="outline">Active</Badge>
            </div>
            <div className="text-2xl font-bold">{stats.totalKeywords}</div>
            <div className="text-sm text-gray-600">Keywords</div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center justify-between mb-2">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
              <Badge variant="outline" className="text-green-600">
                {(100 - stats.falsePositiveRate).toFixed(1)}%
              </Badge>
            </div>
            <div className="text-2xl font-bold">{stats.autoModeratedRate.toFixed(1)}%</div>
            <div className="text-sm text-gray-600">Auto-Moderated</div>
          </Card>
        </div>
      )}

      {/* Add Keyword */}
      <Card className="p-6">
        <h3 className="text-xl mb-4">Add Prohibited Keyword</h3>
        <div className="grid md:grid-cols-5 gap-4 mb-4">
          <div>
            <Label htmlFor="keyword">Keyword/Phrase</Label>
            <Input
              id="keyword"
              value={newKeyword}
              onChange={(e) => setNewKeyword(e.target.value)}
              placeholder="e.g., email me"
            />
          </div>

          <div>
            <Label htmlFor="category">Category</Label>
            <select
              id="category"
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              className="w-full h-10 px-3 border rounded"
            >
              {CATEGORIES.map(cat => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
          </div>

          <div>
            <Label htmlFor="severity">Severity</Label>
            <select
              id="severity"
              value={newSeverity}
              onChange={(e) => setNewSeverity(e.target.value)}
              className="w-full h-10 px-3 border rounded"
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </select>
          </div>

          <div>
            <Label htmlFor="action">Action</Label>
            <select
              id="action"
              value={newAction}
              onChange={(e) => setNewAction(e.target.value)}
              className="w-full h-10 px-3 border rounded"
            >
              <option value="flag">Flag for Review</option>
              <option value="block">Block Message</option>
              <option value="auto-moderate">Auto-Moderate</option>
            </select>
          </div>

          <div>
            <Label htmlFor="matchType">Match Type</Label>
            <select
              id="matchType"
              value={newMatchType}
              onChange={(e) => setNewMatchType(e.target.value)}
              className="w-full h-10 px-3 border rounded"
            >
              <option value="exact">Exact Match</option>
              <option value="contains">Contains</option>
              <option value="regex">Regex</option>
            </select>
          </div>
        </div>

        <div className="flex gap-2">
          <Button onClick={addKeyword} className="bg-[#5d9827] hover:bg-[#4a7a1f]">
            <Plus className="w-4 h-4 mr-2" />
            Add Keyword
          </Button>
          
          <div className="flex-1" />
          
          {CATEGORIES.map(cat => (
            <Button
              key={cat.id}
              variant="outline"
              size="sm"
              onClick={() => bulkAddKeywords(cat.id)}
            >
              + {cat.name}
            </Button>
          ))}
        </div>
      </Card>

      {/* Keywords List */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl">Prohibited Keywords</h3>
          <div className="flex gap-2">
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="h-10 px-3 border rounded text-sm"
            >
              <option value="all">All Categories</option>
              {CATEGORIES.map(cat => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="space-y-2 max-h-[400px] overflow-y-auto">
          {keywords
            .filter(k => filterCategory === 'all' || k.category === filterCategory)
            .map((keyword) => {
              const category = CATEGORIES.find(c => c.id === keyword.category);
              const Icon = category?.icon || Shield;
              
              return (
                <Card key={keyword.id} className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 flex-1">
                      <Icon className="w-5 h-5 text-gray-600" />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium font-mono">{keyword.keyword}</span>
                          <Badge variant="outline" className="capitalize">
                            {keyword.matchType}
                          </Badge>
                          <Badge className={getSeverityColor(keyword.severity)}>
                            {keyword.severity}
                          </Badge>
                          <Badge variant="outline">{category?.name}</Badge>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-gray-600">
                          <span className="capitalize">Action: {keyword.action.replace('-', ' ')}</span>
                          <span>{keyword.hits} hits</span>
                          {keyword.lastTriggered && (
                            <span>Last: {new Date(keyword.lastTriggered).toLocaleDateString()}</span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Switch
                        checked={keyword.enabled}
                        onCheckedChange={(checked) => toggleKeyword(keyword.id, checked)}
                      />
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => deleteKeyword(keyword.id)}
                      >
                        <Trash2 className="w-4 h-4 text-red-600" />
                      </Button>
                    </div>
                  </div>
                </Card>
              );
            })}
        </div>
      </Card>

      {/* Flagged Content */}
      <div className="grid lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl">Flagged Content</h3>
            <select
              value={filterStatus}
              onChange={(e) => {
                setFilterStatus(e.target.value);
                setTimeout(loadModerationData, 100);
              }}
              className="h-10 px-3 border rounded text-sm"
            >
              <option value="pending">Pending</option>
              <option value="reviewed">Reviewed</option>
              <option value="all">All</option>
            </select>
          </div>

          <div className="space-y-2 max-h-[500px] overflow-y-auto">
            {filteredFlags.map((flag) => (
              <Card
                key={flag.id}
                className={`p-4 cursor-pointer hover:border-[#625d9c] transition-colors ${
                  selectedFlag?.id === flag.id ? 'border-[#625d9c] border-2' : ''
                }`}
                onClick={() => setSelectedFlag(flag)}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="outline" className="capitalize">
                        {flag.contentType}
                      </Badge>
                      <Badge className={getSeverityColor(flag.severity)}>
                        {flag.severity}
                      </Badge>
                      <Badge className={getStatusColor(flag.status)}>
                        {flag.status}
                      </Badge>
                    </div>
                    <p className="text-sm mb-2 line-clamp-2">{flag.content}</p>
                    <div className="flex items-center gap-2 text-xs text-gray-600">
                      <User className="w-3 h-3" />
                      <span>{flag.userName} ({flag.userRole})</span>
                      <span>•</span>
                      <span>{new Date(flag.timestamp).toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                {flag.triggeredKeywords.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {flag.triggeredKeywords.slice(0, 3).map((kw, idx) => (
                      <Badge key={idx} variant="outline" className="text-xs text-red-600">
                        {kw}
                      </Badge>
                    ))}
                    {flag.triggeredKeywords.length > 3 && (
                      <Badge variant="outline" className="text-xs">
                        +{flag.triggeredKeywords.length - 3}
                      </Badge>
                    )}
                  </div>
                )}
              </Card>
            ))}

            {filteredFlags.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <CheckCircle2 className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                <p>No {filterStatus} flags</p>
              </div>
            )}
          </div>
        </Card>

        {/* Flag Details */}
        <Card className="p-6">
          {selectedFlag ? (
            <div className="space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-xl mb-2">Flag Details</h3>
                  <Badge className={getStatusColor(selectedFlag.status)}>
                    {selectedFlag.status}
                  </Badge>
                </div>
                <Badge className={getSeverityColor(selectedFlag.severity)}>
                  {selectedFlag.severity}
                </Badge>
              </div>

              <Card className="p-4 bg-gray-50">
                <p className="text-sm font-medium mb-1">Flagged Content:</p>
                <p className="text-sm">{selectedFlag.content}</p>
              </Card>

              <div>
                <h4 className="font-medium mb-2">User Information</h4>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Name:</span>
                    <span className="font-medium">{selectedFlag.userName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Role:</span>
                    <span className="font-medium capitalize">{selectedFlag.userRole}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Content Type:</span>
                    <span className="font-medium capitalize">{selectedFlag.contentType}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Timestamp:</span>
                    <span className="font-medium">
                      {new Date(selectedFlag.timestamp).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-medium mb-2">Triggered Keywords</h4>
                <div className="flex flex-wrap gap-2">
                  {selectedFlag.triggeredKeywords.map((kw, idx) => {
                    const keyword = keywords.find(k => k.keyword === kw);
                    return (
                      <Badge key={idx} className={keyword ? getSeverityColor(keyword.severity) : ''}>
                        {kw}
                      </Badge>
                    );
                  })}
                </div>
              </div>

              {selectedFlag.status === 'reviewed' && selectedFlag.reviewNotes && (
                <Card className="p-4 bg-blue-50 border-blue-200">
                  <p className="text-sm font-medium text-blue-900 mb-1">Review Notes:</p>
                  <p className="text-sm text-blue-800">{selectedFlag.reviewNotes}</p>
                  {selectedFlag.action && (
                    <p className="text-sm text-blue-800 mt-2">
                      Action: <span className="font-medium capitalize">{selectedFlag.action.replace('-', ' ')}</span>
                    </p>
                  )}
                </Card>
              )}

              {selectedFlag.status === 'pending' && (
                <div className="space-y-3">
                  <Textarea
                    placeholder="Review notes..."
                    id="review-notes"
                    rows={3}
                  />
                  
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      variant="outline"
                      onClick={() => {
                        const notes = (document.getElementById('review-notes') as HTMLTextAreaElement)?.value || '';
                        reviewFlag(selectedFlag.id, 'no-action', notes);
                      }}
                    >
                      <CheckCircle2 className="w-4 h-4 mr-2" />
                      No Action
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        const notes = (document.getElementById('review-notes') as HTMLTextAreaElement)?.value || '';
                        reviewFlag(selectedFlag.id, 'warning', notes);
                      }}
                      className="text-yellow-600"
                    >
                      <AlertTriangle className="w-4 h-4 mr-2" />
                      Warning
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        const notes = (document.getElementById('review-notes') as HTMLTextAreaElement)?.value || '';
                        reviewFlag(selectedFlag.id, 'content-removed', notes);
                      }}
                      className="text-red-600"
                    >
                      <XCircle className="w-4 h-4 mr-2" />
                      Remove Content
                    </Button>
                    <Button
                      onClick={() => {
                        const notes = (document.getElementById('review-notes') as HTMLTextAreaElement)?.value || '';
                        reviewFlag(selectedFlag.id, 'account-suspended', notes);
                      }}
                      className="bg-red-600 hover:bg-red-700"
                    >
                      <Ban className="w-4 h-4 mr-2" />
                      Suspend Account
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500">
              <Flag className="w-16 h-16 mx-auto mb-4 text-gray-400" />
              <p>Select a flag to review</p>
            </div>
          )}
        </Card>
      </div>

      {/* Safety Guidelines */}
      <Card className="p-6 bg-blue-50 border-blue-200">
        <h3 className="text-xl mb-4 text-blue-900">Content Moderation Guidelines</h3>
        <div className="grid md:grid-cols-2 gap-4 text-sm text-blue-900">
          <div>
            <p className="font-medium mb-2">Blocked Content:</p>
            <ul className="space-y-1 text-blue-800">
              <li>• Contact information (phone, email, social media)</li>
              <li>• Payment requests outside platform</li>
              <li>• Profanity and inappropriate language</li>
              <li>• Harassment and threatening behavior</li>
              <li>• Scams, fraud, and deceptive practices</li>
              <li>• Violence and illegal content</li>
            </ul>
          </div>
          <div>
            <p className="font-medium mb-2">Enforcement Actions:</p>
            <ul className="space-y-1 text-blue-800">
              <li>• <strong>Flag:</strong> Content flagged for manual review</li>
              <li>• <strong>Block:</strong> Message automatically blocked</li>
              <li>• <strong>Auto-Moderate:</strong> Content masked/removed</li>
              <li>• <strong>Warning:</strong> User notified of violation</li>
              <li>• <strong>Suspension:</strong> Account temporarily suspended</li>
              <li>• <strong>Ban:</strong> Permanent account termination</li>
            </ul>
          </div>
        </div>
      </Card>
        </TabsContent>

        <TabsContent value="queue">
          <ModerationQueue session={{ access_token: accessToken, user: { id: adminId } }} />
        </TabsContent>

        <TabsContent value="sanctions">
          <SanctionsManagement session={{ access_token: accessToken, user: { id: adminId } }} />
        </TabsContent>

        <TabsContent value="policies">
          <PoliciesView session={{ access_token: accessToken, user: { id: adminId } }} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
