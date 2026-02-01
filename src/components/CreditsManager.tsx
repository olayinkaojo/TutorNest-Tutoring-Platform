import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { toast } from 'sonner@2.0.3';
import { projectId, publicAnonKey } from '../utils/supabase/info.tsx';
import { Coins, TrendingUp, TrendingDown, Clock, Gift } from 'lucide-react';
import { NairaIcon } from './icons/NairaIcon';
import { formatNaira } from '../utils/currency';

interface CreditTransaction {
  id: string;
  type: 'earned' | 'applied' | 'expired';
  amount: number;
  source: string;
  description: string;
  date: string;
  referralId?: string;
}

interface UserCredit {
  userId: string;
  totalCredits: number;
  availableCredits: number;
  usedCredits: number;
  history: CreditTransaction[];
}

interface CreditsManagerProps {
  userId: string;
}

export function CreditsManager({ userId }: CreditsManagerProps) {
  const [credits, setCredits] = useState<UserCredit | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCredits();
  }, [userId]);

  const fetchCredits = async () => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-cbd74580/credits/${userId}`,
        {
          headers: {
            Authorization: `Bearer ${publicAnonKey}`,
          },
        }
      );

      const data = await response.json();
      if (data.success) {
        setCredits(data.credits);
      }
    } catch (error) {
      console.error('Error fetching credits:', error);
      toast.error('Failed to load credits');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-center text-muted-foreground">Loading credits...</p>
        </CardContent>
      </Card>
    );
  }

  const availableCredits = credits?.availableCredits || 0;
  const totalEarned = credits?.totalCredits || 0;
  const totalUsed = credits?.usedCredits || 0;
  const history = credits?.history || [];

  return (
    <div className="space-y-6">
      {/* Credits Overview */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm">Available Credits</CardTitle>
            <Coins className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl">{formatNaira(availableCredits)}</div>
            <p className="text-xs text-muted-foreground">
              Ready to use on your subscription
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm">Total Earned</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl">{formatNaira(totalEarned)}</div>
            <p className="text-xs text-muted-foreground">
              Lifetime credits earned
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm">Total Used</CardTitle>
            <TrendingDown className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl">{formatNaira(totalUsed)}</div>
            <p className="text-xs text-muted-foreground">
              Applied to payments
            </p>
          </CardContent>
        </Card>
      </div>

      {/* How Credits Work */}
      {availableCredits > 0 && (
        <Card className="border-green-200 bg-green-50">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <Gift className="h-5 w-5 text-green-600 mt-0.5" />
              <div>
                <p className="font-medium text-green-900">
                  You have {formatNaira(availableCredits)} in credits!
                </p>
                <p className="text-sm text-green-700 mt-1">
                  Your credits will be automatically applied to your next subscription payment.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Transaction History */}
      <Card>
        <CardHeader>
          <CardTitle>Credit History</CardTitle>
          <CardDescription>
            All your credit transactions and activity
          </CardDescription>
        </CardHeader>
        <CardContent>
          {history.length === 0 ? (
            <div className="text-center py-8">
              <Coins className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">
                No credit transactions yet.
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                Earn credits through referrals, promotions, or special offers.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {history.map((transaction) => (
                <div
                  key={transaction.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="flex items-start gap-3 flex-1">
                    <div className="mt-1">
                      {transaction.type === 'earned' && (
                        <TrendingUp className="h-4 w-4 text-green-600" />
                      )}
                      {transaction.type === 'applied' && (
                        <TrendingDown className="h-4 w-4 text-blue-600" />
                      )}
                      {transaction.type === 'expired' && (
                        <Clock className="h-4 w-4 text-gray-400" />
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">{transaction.description}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="text-xs">
                          {transaction.source}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {new Date(transaction.date).toLocaleDateString('en-GB', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p
                      className={`font-medium ${
                        transaction.type === 'earned'
                          ? 'text-green-600'
                          : transaction.type === 'applied'
                          ? 'text-blue-600'
                          : 'text-gray-400'
                      }`}
                    >
                      {transaction.type === 'earned' && '+'}
                      {transaction.type === 'applied' && '-'}
                      {formatNaira(transaction.amount)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}