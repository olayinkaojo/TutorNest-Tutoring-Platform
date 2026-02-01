import React, { useState, useEffect } from 'react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { 
  Search,
  BookOpen,
  MessageSquare,
  HelpCircle,
  ChevronRight,
  ThumbsUp,
  ThumbsDown,
  ExternalLink,
  Loader2,
  Star,
  AlertCircle,
  CheckCircle2
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { projectId, publicAnonKey } from '../../utils/supabase/info';

interface HelpArticle {
  id: string;
  title: string;
  content: string;
  category: string;
  tags: string[];
  viewCount: number;
  helpfulCount: number;
  notHelpfulCount: number;
  updatedAt: string;
  relatedArticles: string[];
}

interface HelpCategory {
  id: string;
  name: string;
  icon: string;
  articleCount: number;
  description: string;
}

interface HelpCenterProps {
  userId?: string;
  accessToken?: string;
  userRole?: string;
}

const HELP_CATEGORIES: HelpCategory[] = [
  {
    id: 'getting-started',
    name: 'Getting Started',
    icon: '🚀',
    articleCount: 12,
    description: 'Learn the basics of TutorNest'
  },
  {
    id: 'booking',
    name: 'Booking & Sessions',
    icon: '📅',
    articleCount: 18,
    description: 'How to book and manage sessions'
  },
  {
    id: 'payments',
    name: 'Payments & Billing',
    icon: '💳',
    articleCount: 15,
    description: 'Payment methods, invoices, and refunds'
  },
  {
    id: 'account',
    name: 'Account Settings',
    icon: '⚙️',
    articleCount: 10,
    description: 'Manage your profile and preferences'
  },
  {
    id: 'technical',
    name: 'Technical Support',
    icon: '🔧',
    articleCount: 8,
    description: 'Troubleshoot technical issues'
  },
  {
    id: 'safety',
    name: 'Safety & Privacy',
    icon: '🛡️',
    articleCount: 14,
    description: 'Data protection and safety features'
  }
];

const POPULAR_ARTICLES = [
  'How do I book my first session?',
  'What payment methods are accepted?',
  'How do cancellations work?',
  'Setting up parental controls',
  'Troubleshooting video quality issues'
];

export function HelpCenter({ userId, accessToken, userRole }: HelpCenterProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [articles, setArticles] = useState<HelpArticle[]>([]);
  const [selectedArticle, setSelectedArticle] = useState<HelpArticle | null>(null);
  const [loading, setLoading] = useState(false);
  const [showContactForm, setShowContactForm] = useState(false);

  useEffect(() => {
    if (searchQuery || selectedCategory) {
      searchArticles();
    }
  }, [searchQuery, selectedCategory]);

  const searchArticles = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.append('query', searchQuery);
      if (selectedCategory) params.append('category', selectedCategory);

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-cbd74580/help/articles?${params}`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken || publicAnonKey}`
          }
        }
      );

      if (response.ok) {
        const data = await response.json();
        setArticles(data.articles || []);
      }
    } catch (error) {
      console.error('Error searching articles:', error);
    } finally {
      setLoading(false);
    }
  };

  const viewArticle = async (articleId: string) => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-cbd74580/help/articles/${articleId}`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken || publicAnonKey}`
          }
        }
      );

      if (response.ok) {
        const data = await response.json();
        setSelectedArticle(data.article);
      }
    } catch (error) {
      console.error('Error loading article:', error);
      toast.error('Failed to load article');
    }
  };

  const rateArticle = async (articleId: string, helpful: boolean) => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-cbd74580/help/articles/${articleId}/rate`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken || publicAnonKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ helpful, userId })
        }
      );

      if (response.ok) {
        toast.success('Thank you for your feedback!');
        viewArticle(articleId); // Reload article to update counts
      }
    } catch (error) {
      console.error('Error rating article:', error);
    }
  };

  if (selectedArticle) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSelectedArticle(null)}
          >
            ← Back to Help Center
          </Button>
          <Badge variant="outline" className="capitalize">
            {selectedArticle.category}
          </Badge>
        </div>

        <Card className="p-8">
          <h1 className="text-3xl mb-4">{selectedArticle.title}</h1>

          <div className="flex items-center gap-4 text-sm text-gray-600 mb-6">
            <span>{selectedArticle.viewCount} views</span>
            <span>Updated {new Date(selectedArticle.updatedAt).toLocaleDateString()}</span>
          </div>

          <div className="prose max-w-none mb-8">
            <div dangerouslySetInnerHTML={{ __html: selectedArticle.content }} />
          </div>

          <div className="flex flex-wrap gap-2 mb-6">
            {selectedArticle.tags.map((tag, idx) => (
              <Badge key={idx} variant="outline" className="text-xs">
                {tag}
              </Badge>
            ))}
          </div>

          <Card className="p-4 bg-gray-50">
            <p className="font-medium mb-3">Was this article helpful?</p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => rateArticle(selectedArticle.id, true)}
              >
                <ThumbsUp className="w-4 h-4 mr-2" />
                Yes ({selectedArticle.helpfulCount})
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => rateArticle(selectedArticle.id, false)}
              >
                <ThumbsDown className="w-4 h-4 mr-2" />
                No ({selectedArticle.notHelpfulCount})
              </Button>
            </div>
          </Card>

          {selectedArticle.relatedArticles.length > 0 && (
            <div className="mt-6">
              <h3 className="text-xl mb-3">Related Articles</h3>
              <div className="space-y-2">
                {selectedArticle.relatedArticles.slice(0, 3).map((relatedId) => (
                  <button
                    key={relatedId}
                    onClick={() => viewArticle(relatedId)}
                    className="w-full p-3 border rounded-lg hover:border-[#625d9c] transition-colors text-left flex items-center justify-between"
                  >
                    <span className="text-sm">Related Article Title</span>
                    <ChevronRight className="w-4 h-4 text-gray-400" />
                  </button>
                ))}
              </div>
            </div>
          )}
        </Card>

        <Card className="p-4 bg-blue-50 border-blue-200">
          <div className="flex items-start gap-3">
            <HelpCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-blue-900 mb-1">Still need help?</p>
              <p className="text-sm text-blue-800 mb-3">
                Can't find what you're looking for? Contact our support team.
              </p>
              <Button
                size="sm"
                onClick={() => {
                  setSelectedArticle(null);
                  setShowContactForm(true);
                }}
                className="bg-[#5d9827] hover:bg-[#4a7a1f]"
              >
                Contact Support
              </Button>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#625d9c] to-[#5d9827] flex items-center justify-center mx-auto mb-4">
          <BookOpen className="w-8 h-8 text-white" />
        </div>
        <h1 className="text-4xl mb-2">How can we help?</h1>
        <p className="text-gray-600">
          Search our help center or browse by category
        </p>
      </div>

      {/* Search */}
      <Card className="p-4">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <Input
            placeholder="Search for help articles..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-12 text-lg h-14"
          />
        </div>
      </Card>

      {/* Popular Articles */}
      {!searchQuery && !selectedCategory && (
        <Card className="p-6">
          <h3 className="text-xl mb-4">Popular Articles</h3>
          <div className="space-y-2">
            {POPULAR_ARTICLES.map((title, idx) => (
              <button
                key={idx}
                onClick={() => setSearchQuery(title)}
                className="w-full p-3 border rounded-lg hover:border-[#625d9c] transition-colors text-left flex items-center justify-between group"
              >
                <div className="flex items-center gap-3">
                  <Star className="w-4 h-4 text-yellow-400" />
                  <span>{title}</span>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-[#625d9c] transition-colors" />
              </button>
            ))}
          </div>
        </Card>
      )}

      {/* Categories */}
      {!searchQuery && !selectedCategory && (
        <>
          <h2 className="text-2xl">Browse by Category</h2>
          <div className="grid md:grid-cols-3 gap-4">
            {HELP_CATEGORIES.map((category) => (
              <Card
                key={category.id}
                className="p-6 cursor-pointer hover:border-[#625d9c] transition-colors"
                onClick={() => setSelectedCategory(category.id)}
              >
                <div className="text-4xl mb-3">{category.icon}</div>
                <h3 className="text-xl mb-1">{category.name}</h3>
                <p className="text-sm text-gray-600 mb-3">
                  {category.description}
                </p>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">
                    {category.articleCount} articles
                  </span>
                  <ChevronRight className="w-5 h-5 text-gray-400" />
                </div>
              </Card>
            ))}
          </div>
        </>
      )}

      {/* Search Results */}
      {(searchQuery || selectedCategory) && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl">
              {selectedCategory
                ? HELP_CATEGORIES.find(c => c.id === selectedCategory)?.name
                : 'Search Results'}
            </h2>
            {selectedCategory && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSelectedCategory(null);
                  setSearchQuery('');
                }}
              >
                Clear Filter
              </Button>
            )}
          </div>

          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-[#625d9c]" />
            </div>
          ) : articles.length > 0 ? (
            <div className="space-y-2">
              {articles.map((article) => (
                <Card
                  key={article.id}
                  className="p-4 cursor-pointer hover:border-[#625d9c] transition-colors"
                  onClick={() => viewArticle(article.id)}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <h3 className="font-medium mb-1">{article.title}</h3>
                      <p className="text-sm text-gray-600 line-clamp-2 mb-2">
                        {article.content.replace(/<[^>]*>/g, '').slice(0, 150)}...
                      </p>
                      <div className="flex items-center gap-3 text-xs text-gray-500">
                        <span>{article.viewCount} views</span>
                        <span>
                          {article.helpfulCount} found helpful
                        </span>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0" />
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="p-12 text-center">
              <BookOpen className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl mb-2">No articles found</h3>
              <p className="text-gray-600 mb-4">
                Try different keywords or browse by category
              </p>
              <Button
                variant="outline"
                onClick={() => {
                  setSearchQuery('');
                  setSelectedCategory(null);
                }}
              >
                Clear Search
              </Button>
            </Card>
          )}
        </div>
      )}

      {/* Contact Support CTA */}
      <Card className="p-6 bg-gradient-to-r from-[#625d9c] to-[#5d9827] text-white">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xl mb-1">Still need help?</h3>
            <p className="opacity-90">
              Our support team is here to help you
            </p>
          </div>
          <Button
            onClick={() => setShowContactForm(true)}
            className="bg-white text-[#625d9c] hover:bg-gray-100"
          >
            <MessageSquare className="w-4 h-4 mr-2" />
            Contact Support
          </Button>
        </div>
      </Card>
    </div>
  );
}
