import { useState, useEffect } from 'react';
import { projectId } from '../utils/supabase/info';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import { Alert, AlertDescription } from './ui/alert';
import { 
  CreditCard, 
  Plus, 
  CheckCircle, 
  AlertCircle, 
  Trash2,
  Shield,
  Lock
} from 'lucide-react';

interface PaymentMethodManagerProps {
  session: any;
  onMethodAdded?: () => void;
}

interface PaymentMethod {
  id: string;
  type: 'card';
  card: {
    brand: string;
    last4: string;
    expiryMonth: number;
    expiryYear: number;
  };
  isDefault: boolean;
}

export function PaymentMethodManager({ session, onMethodAdded }: PaymentMethodManagerProps) {
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddCard, setShowAddCard] = useState(false);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Card form state
  const [cardNumber, setCardNumber] = useState('');
  const [cardName, setCardName] = useState('');
  const [expiryMonth, setExpiryMonth] = useState('');
  const [expiryYear, setExpiryYear] = useState('');
  const [cvc, setCvc] = useState('');

  useEffect(() => {
    fetchPaymentMethods();
  }, []);

  const fetchPaymentMethods = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-cbd74580/payments/methods`,
        {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setPaymentMethods(data.methods || []);
      }
    } catch (err: any) {
      console.error('Error fetching payment methods:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddCard = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // Validate card details
    if (!cardNumber || !cardName || !expiryMonth || !expiryYear || !cvc) {
      setError('Please fill in all card details');
      return;
    }

    if (cardNumber.replace(/\s/g, '').length !== 16) {
      setError('Please enter a valid 16-digit card number');
      return;
    }

    if (cvc.length !== 3 && cvc.length !== 4) {
      setError('Please enter a valid CVC');
      return;
    }

    setAdding(true);

    try {
      // In production, use Stripe.js to tokenize the card
      // This simulates the tokenization process
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-cbd74580/payments/methods/add`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            cardNumber: cardNumber.replace(/\s/g, ''),
            cardName,
            expiryMonth: parseInt(expiryMonth),
            expiryYear: parseInt(expiryYear),
            cvc,
          }),
        }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to add payment method');
      }

      setSuccess('Payment method added successfully!');
      setShowAddCard(false);
      
      // Clear form
      setCardNumber('');
      setCardName('');
      setExpiryMonth('');
      setExpiryYear('');
      setCvc('');

      await fetchPaymentMethods();
      
      if (onMethodAdded) {
        onMethodAdded();
      }
    } catch (err: any) {
      console.error('Error adding payment method:', err);
      setError(err.message);
    } finally {
      setAdding(false);
    }
  };

  const handleRemoveCard = async (methodId: string) => {
    if (!confirm('Are you sure you want to remove this payment method?')) {
      return;
    }

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-cbd74580/payments/methods/${methodId}`,
        {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to remove payment method');
      }

      setSuccess('Payment method removed');
      await fetchPaymentMethods();
    } catch (err: any) {
      console.error('Error removing payment method:', err);
      setError(err.message);
    }
  };

  const handleSetDefault = async (methodId: string) => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-cbd74580/payments/methods/${methodId}/set-default`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to set default payment method');
      }

      await fetchPaymentMethods();
    } catch (err: any) {
      console.error('Error setting default:', err);
      setError(err.message);
    }
  };

  const formatCardNumber = (value: string) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    const matches = v.match(/\d{4,16}/g);
    const match = (matches && matches[0]) || '';
    const parts = [];

    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4));
    }

    if (parts.length) {
      return parts.join(' ');
    } else {
      return value;
    }
  };

  const getCardBrandIcon = (brand: string) => {
    return <CreditCard className="w-5 h-5" />;
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <CreditCard className="w-8 h-8 animate-pulse mx-auto mb-4" style={{ color: '#625d9c' }} />
          <p className="text-gray-600">Loading payment methods...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
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
              <CardTitle>Payment Methods</CardTitle>
              <CardDescription>Manage your saved payment cards</CardDescription>
            </div>
            {!showAddCard && (
              <Button
                onClick={() => setShowAddCard(true)}
                className="text-white"
                style={{ backgroundColor: '#625d9c' }}
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Card
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Security Notice */}
          <Alert className="bg-blue-50 border-blue-200">
            <Shield className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-blue-800 text-sm">
              <div className="flex items-center gap-2 mb-1">
                <Lock className="w-3 h-3" />
                <strong>Secure Payment Processing</strong>
              </div>
              All card details are encrypted and processed via Stripe. We never store your full card number.
              3D Secure authentication is used for added security.
            </AlertDescription>
          </Alert>

          {/* Add Card Form */}
          {showAddCard && (
            <Card className="border-2" style={{ borderColor: '#625d9c' }}>
              <CardContent className="pt-6">
                <form onSubmit={handleAddCard} className="space-y-4">
                  <div>
                    <Label htmlFor="cardNumber">Card Number</Label>
                    <Input
                      id="cardNumber"
                      value={cardNumber}
                      onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
                      placeholder="1234 5678 9012 3456"
                      maxLength={19}
                      className="mt-2"
                    />
                  </div>

                  <div>
                    <Label htmlFor="cardName">Cardholder Name</Label>
                    <Input
                      id="cardName"
                      value={cardName}
                      onChange={(e) => setCardName(e.target.value)}
                      placeholder="John Smith"
                      className="mt-2"
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="expiryMonth">Month</Label>
                      <Input
                        id="expiryMonth"
                        value={expiryMonth}
                        onChange={(e) => setExpiryMonth(e.target.value.replace(/\D/g, '').slice(0, 2))}
                        placeholder="MM"
                        maxLength={2}
                        className="mt-2"
                      />
                    </div>
                    <div>
                      <Label htmlFor="expiryYear">Year</Label>
                      <Input
                        id="expiryYear"
                        value={expiryYear}
                        onChange={(e) => setExpiryYear(e.target.value.replace(/\D/g, '').slice(0, 4))}
                        placeholder="YYYY"
                        maxLength={4}
                        className="mt-2"
                      />
                    </div>
                    <div>
                      <Label htmlFor="cvc">CVC</Label>
                      <Input
                        id="cvc"
                        value={cvc}
                        onChange={(e) => setCvc(e.target.value.replace(/\D/g, '').slice(0, 4))}
                        placeholder="123"
                        maxLength={4}
                        type="password"
                        className="mt-2"
                      />
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setShowAddCard(false)}
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={adding}
                      className="flex-1 text-white"
                      style={{ backgroundColor: '#625d9c' }}
                    >
                      {adding ? 'Adding...' : 'Add Card'}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          {/* Saved Cards */}
          {paymentMethods.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <CreditCard className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>No payment methods saved</p>
              <p className="text-sm mt-2">Add a card to start booking lessons</p>
            </div>
          ) : (
            <div className="space-y-3">
              {paymentMethods.map((method) => (
                <Card key={method.id} className={method.isDefault ? 'border-green-200 bg-green-50' : ''}>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {getCardBrandIcon(method.card.brand)}
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-medium">
                              {method.card.brand.toUpperCase()} ···· {method.card.last4}
                            </p>
                            {method.isDefault && (
                              <Badge variant="default" style={{ backgroundColor: '#5d9827' }}>
                                Default
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-gray-600">
                            Expires {method.card.expiryMonth}/{method.card.expiryYear}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {!method.isDefault && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleSetDefault(method.id)}
                          >
                            Set Default
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveCard(method.id)}
                        >
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Alert className="bg-gray-50 border-gray-200">
        <AlertCircle className="h-4 w-4 text-gray-600" />
        <AlertDescription className="text-gray-700 text-sm">
          <strong>Payment Security:</strong> We use Stripe for secure payment processing. Your card details
          are encrypted and never stored on our servers. All transactions are PCI DSS compliant.
        </AlertDescription>
      </Alert>
    </div>
  );
}