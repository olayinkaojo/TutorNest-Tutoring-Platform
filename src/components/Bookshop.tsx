import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { Book, ShoppingCart, Search, Star, Filter, Crown, CheckCircle2 } from 'lucide-react';
import { projectId } from '../utils/supabase/info';

interface Book {
  id: string;
  title: string;
  author: string;
  description: string;
  coverImage: string;
  price: number;
  category: string;
  ageRange: string;
  gradeLevel?: string;
  rating: number;
  reviewCount: number;
  subscriptionTier?: string; // 'basic' | 'standard' | 'premium' | 'none'
  isIncludedInSubscription?: boolean;
}

interface BookshopProps {
  session: any;
  subscriptionTier?: string | null;
}

export function Bookshop({ session, subscriptionTier }: BookshopProps) {
  const [books, setBooks] = useState<Book[]>([]);
  const [filteredBooks, setFilteredBooks] = useState<Book[]>([]);
  const [cart, setCart] = useState<Book[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedAgeRange, setSelectedAgeRange] = useState<string>('all');
  const [selectedGradeLevel, setSelectedGradeLevel] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [loading, setLoading] = useState(true);

  const categories = ['All', 'Mathematics', 'Science', 'English', 'History', 'Languages', 'Art', 'Music', 'Bible Study'];
  const ageRanges = ['All Ages', '3-5 years', '5-7 years', '7-9 years', '9-11 years', '11-14 years', '14-16 years', '16-18 years'];
  const gradeLevels = [
    'All Grades',
    'Nursery / Pre-Primary',
    'Primary 1-3 (P1-P3) – Year 1-3',
    'Primary 4-6 (P4-P6) – Year 4-6',
    'JSS 1-3 – Year 7-9',
    'SS 1-2 – Year 10-11',
    'SS 3 – Year 12 / College',
  ];

  useEffect(() => {
    if (session?.access_token) {
      loadBooks();
    }
  }, [session]);

  useEffect(() => {
    filterBooks();
  }, [searchQuery, selectedCategory, selectedAgeRange, selectedGradeLevel, books, subscriptionTier]);

  const loadBooks = async () => {
    if (!session?.access_token) return;

    setLoading(true);
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-cbd74580/bookshop/books`,
        {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setBooks(data.books || []);
      }
    } catch (error) {
      console.error('Error loading books:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterBooks = () => {
    let filtered = books;

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(
        (book) =>
          book.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          book.author.toLowerCase().includes(searchQuery.toLowerCase()) ||
          book.description.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Category filter
    if (selectedCategory !== 'all') {
      filtered = filtered.filter((book) => book.category.toLowerCase() === selectedCategory.toLowerCase());
    }

    // Age Range filter
    if (selectedAgeRange !== 'all') {
      filtered = filtered.filter((book) => book.ageRange.toLowerCase() === selectedAgeRange.toLowerCase());
    }

    // Grade Level filter
    if (selectedGradeLevel !== 'all') {
      filtered = filtered.filter((book) => book.gradeLevel?.toLowerCase() === selectedGradeLevel.toLowerCase());
    }

    // Check if books are included in subscription
    filtered = filtered.map(book => {
      const tierHierarchy = ['basic', 'standard', 'premium'];
      const userTierIndex = subscriptionTier ? tierHierarchy.indexOf(subscriptionTier) : -1;
      const bookTierIndex = book.subscriptionTier ? tierHierarchy.indexOf(book.subscriptionTier) : -1;
      
      return {
        ...book,
        isIncludedInSubscription: userTierIndex >= 0 && bookTierIndex >= 0 && userTierIndex >= bookTierIndex
      };
    });

    setFilteredBooks(filtered);
  };

  const addToCart = (book: Book) => {
    if (!cart.find(item => item.id === book.id)) {
      setCart([...cart, book]);
    }
  };

  const removeFromCart = (bookId: string) => {
    setCart(cart.filter(item => item.id !== bookId));
  };

  const handleCheckout = async () => {
    if (!session?.access_token || cart.length === 0) return;

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-cbd74580/bookshop/purchase`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            bookIds: cart.map(b => b.id),
          }),
        }
      );

      if (response.ok) {
        alert('Purchase successful! Books added to your library.');
        setCart([]);
      } else {
        const error = await response.json();
        alert(`Purchase failed: ${error.message || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error during checkout:', error);
      alert('Purchase failed. Please try again.');
    }
  };

  const getTierBadgeColor = (tier?: string) => {
    switch (tier) {
      case 'basic': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'standard': return 'bg-green-100 text-green-800 border-green-200';
      case 'premium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div 
            className="w-16 h-16 border-4 border-t-transparent rounded-full animate-spin mx-auto mb-4"
            style={{ borderColor: '#625d9c', borderTopColor: 'transparent' }}
          />
          <p className="text-gray-600">Loading bookshop...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="flex items-center gap-2 mb-2">
            <Book className="w-6 h-6" style={{ color: '#625d9c' }} />
            TutorNest Bookshop
          </h2>
          <p className="text-gray-600">
            Access educational books through your subscription or purchase individually
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            className="relative"
            onClick={() => {
              if (cart.length > 0) {
                const cartSummary = cart.map(b => `${b.title} - £${b.price}`).join('\n');
                if (confirm(`Cart (${cart.length} items):\n\n${cartSummary}\n\nProceed to checkout?`)) {
                  handleCheckout();
                }
              }
            }}
          >
            <ShoppingCart className="w-5 h-5 mr-2" />
            Cart ({cart.length})
            {cart.length > 0 && (
              <Badge className="ml-2" style={{ backgroundColor: '#5d9827' }}>
                £{cart.reduce((sum, book) => sum + book.price, 0).toFixed(2)}
              </Badge>
            )}
          </Button>
        </div>
      </div>

      {/* Subscription Info */}
      {subscriptionTier && (
        <Card className="border-2" style={{ borderColor: '#5d9827', backgroundColor: '#f0f9e8' }}>
          <CardContent className="flex items-center gap-3 p-4">
            <Crown className="w-6 h-6" style={{ color: '#5d9827' }} />
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span>Your <strong className="capitalize">{subscriptionTier}</strong> subscription includes access to select books</span>
              </div>
              <p className="text-sm text-gray-600 mt-1">Look for the "Included" badge on eligible books</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Search and Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <Input
                type="text"
                placeholder="Search books by title, author, or description..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Filter Button Toggle */}
            <Button
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
              className="w-full md:w-auto"
            >
              <Filter className="w-4 h-4 mr-2" />
              {showFilters ? 'Hide Filters' : 'Show Filters'}
            </Button>

            {/* Collapsible Filters */}
            {showFilters && (
              <div className="space-y-4 pt-4 border-t">
                {/* Category Filter */}
                <div>
                  <label className="text-sm mb-2 block text-gray-700">
                    Filter by Subject
                  </label>
                  <div className="flex gap-2 flex-wrap">
                    {categories.map((category) => (
                      <Button
                        key={category}
                        variant={selectedCategory === category.toLowerCase() ? 'default' : 'outline'}
                        onClick={() => setSelectedCategory(category.toLowerCase())}
                        size="sm"
                        style={
                          selectedCategory === category.toLowerCase()
                            ? { backgroundColor: '#625d9c', color: 'white' }
                            : {}
                        }
                      >
                        {category}
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Age Range Filter */}
                <div>
                  <label className="text-sm mb-2 block text-gray-700">
                    Filter by Age Range
                  </label>
                  <div className="flex gap-2 flex-wrap">
                    {ageRanges.map((ageRange) => (
                      <Button
                        key={ageRange}
                        variant={selectedAgeRange === ageRange.toLowerCase() ? 'default' : 'outline'}
                        onClick={() => setSelectedAgeRange(ageRange.toLowerCase())}
                        size="sm"
                        style={
                          selectedAgeRange === ageRange.toLowerCase()
                            ? { backgroundColor: '#5d9827', color: 'white' }
                            : {}
                        }
                      >
                        {ageRange}
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Grade Level Filter */}
                <div>
                  <label className="text-sm mb-2 block text-gray-700">
                    Filter by Class/Grade Level
                  </label>
                  <div className="flex gap-2 flex-wrap">
                    {gradeLevels.map((gradeLevel) => (
                      <Button
                        key={gradeLevel}
                        variant={selectedGradeLevel === gradeLevel.toLowerCase() ? 'default' : 'outline'}
                        onClick={() => setSelectedGradeLevel(gradeLevel.toLowerCase())}
                        size="sm"
                        style={
                          selectedGradeLevel === gradeLevel.toLowerCase()
                            ? { backgroundColor: '#625d9c', color: 'white' }
                            : {}
                        }
                      >
                        {gradeLevel}
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Reset Filters */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSelectedCategory('all');
                    setSelectedAgeRange('all');
                    setSelectedGradeLevel('all');
                    setSearchQuery('');
                  }}
                  className="text-gray-600"
                >
                  Reset All Filters
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Books Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filteredBooks.map((book) => (
          <Card key={book.id} className="overflow-hidden hover:shadow-lg transition-shadow">
            <div className="relative">
              <ImageWithFallback
                src={book.coverImage}
                alt={book.title}
                className="w-full h-64 object-cover"
              />
              {book.isIncludedInSubscription && (
                <Badge
                  className="absolute top-3 right-3 flex items-center gap-1"
                  style={{ backgroundColor: '#5d9827' }}
                >
                  <CheckCircle2 className="w-3 h-3" />
                  Included
                </Badge>
              )}
              {book.subscriptionTier && !book.isIncludedInSubscription && (
                <Badge
                  className={`absolute top-3 right-3 border ${getTierBadgeColor(book.subscriptionTier)}`}
                  variant="outline"
                >
                  <Crown className="w-3 h-3 mr-1" />
                  {book.subscriptionTier}
                </Badge>
              )}
            </div>
            <CardHeader>
              <CardTitle className="line-clamp-2">{book.title}</CardTitle>
              <CardDescription>by {book.author}</CardDescription>
              <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                <div className="flex items-center gap-1">
                  <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                  <span>{book.rating.toFixed(1)}</span>
                  <span className="text-gray-400">({book.reviewCount})</span>
                </div>
                <Badge variant="outline">{book.ageRange}</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 line-clamp-2 mb-4">{book.description}</p>
              <div className="flex items-center justify-between">
                {book.isIncludedInSubscription ? (
                  <Button
                    className="w-full"
                    style={{ backgroundColor: '#5d9827' }}
                  >
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    Access Now
                  </Button>
                ) : (
                  <>
                    <span className="text-gray-900">£{book.price.toFixed(2)}</span>
                    <Button
                      variant={cart.find(item => item.id === book.id) ? 'outline' : 'default'}
                      size="sm"
                      onClick={() => {
                        if (cart.find(item => item.id === book.id)) {
                          removeFromCart(book.id);
                        } else {
                          addToCart(book);
                        }
                      }}
                      style={
                        !cart.find(item => item.id === book.id)
                          ? { backgroundColor: '#625d9c' }
                          : {}
                      }
                    >
                      {cart.find(item => item.id === book.id) ? 'Remove' : 'Add to Cart'}
                    </Button>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredBooks.length === 0 && (
        <div className="text-center py-12">
          <Book className="w-16 h-16 mx-auto mb-4 text-gray-400" />
          <h3 className="text-gray-600 mb-2">No books found</h3>
          <p className="text-gray-500">Try adjusting your search or filters</p>
        </div>
      )}
    </div>
  );
}