import React, { useState, useEffect } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Check, Loader2 } from 'lucide-react';
import { projectId, publicAnonKey } from '../utils/supabase/info';

interface Tier {
  id: string;
  name: string;
  price: number;
  currency: string;
  billingCycle: string;
  sessions: number;
  sessionsPerChild?: number;
  maxChildren?: number;
  benefits: string[];
  popular?: boolean;
  color: string;
}

interface SubscriptionTiersProps {
  onSelectTier: (tierId: string) => void;
  currentTierId?: string;
  isLoading?: boolean;
}

export function SubscriptionTiers({ onSelectTier, currentTierId, isLoading = false }: SubscriptionTiersProps) {
  const [tiers, setTiers] = useState<Tier[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchTiers();
  }, []);

  const fetchTiers = async () => {
    try {
      console.log('Fetching subscription tiers...');
      
      // TEMPORARY: Use hardcoded tiers until server issue is resolved
      // TODO: Fix server routing issue and re-enable API fetch
      const hardcodedTiers = [
        {
          id: 'basic',
          name: 'Starter',
          price: 9.99,
          currency: 'NGN',
          billingCycle: 'monthly',
          maxChildren: 1,
          sessionsPerChild: 0,
          sessions: 0,
          benefits: [
            '1 child profile',
            'Access to 50+ educational books',
            '100 downloadable worksheets per month',
            'Basic curriculum resources',
            'Progress tracking dashboard',
            'Email support',
            'Platform access & messaging'
          ],
          color: '#625d9c'
        },
        {
          id: 'standard',
          name: 'Plus',
          price: 19.99,
          currency: 'NGN',
          billingCycle: 'monthly',
          maxChildren: 2,
          sessionsPerChild: 0,
          sessions: 0,
          benefits: [
            'Up to 2 child profiles',
            'Access to 200+ educational books',
            'Unlimited downloadable worksheets',
            'Full curriculum library access',
            'Advanced progress tracking with analytics',
            'Priority email & chat support',
            'Homework assignment templates',
            'Study planners & schedules',
            'Interactive practice quizzes',
            'Bookshop discounts (10% off purchases)'
          ],
          popular: true,
          color: '#5d9827'
        },
        {
          id: 'premium',
          name: 'Premium',
          price: 29.99,
          currency: 'NGN',
          billingCycle: 'monthly',
          maxChildren: 4,
          sessionsPerChild: 0,
          sessions: 0,
          benefits: [
            'Up to 4 child profiles',
            'Access to entire book library (500+ books)',
            'Unlimited downloadable worksheets',
            'Complete curriculum & syllabus access',
            'Real-time analytics & insights',
            '24/7 priority support',
            'Personalized learning plans',
            'Advanced homework & project tracking',
            'Monthly progress reports',
            'Exclusive webinars & masterclasses',
            'Early access to new resources',
            'Bookshop discounts (20% off purchases)',
            'Exam board-specific materials (GCSE, A-Level)',
            'Bible Study resources & materials'
          ],
          color: '#625d9c'
        }
      ];
      
      console.log('Using hardcoded tiers (server routing issue)');
      setTiers(hardcodedTiers);
      setLoading(false);
      return;
      
      // Original API fetch code (disabled until server is fixed)
      /*
      // First, test if server is reachable at all
      const healthUrl = `https://${projectId}.supabase.co/functions/v1/make-server-cbd74580/subscription-tiers-test`;
      console.log('Testing health URL:', healthUrl);
      
      try {
        const healthResponse = await fetch(healthUrl, {
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`
          }
        });
        console.log('Health check status:', healthResponse.status);
        const healthText = await healthResponse.text();
        console.log('Health check response:', healthText);
      } catch (healthError) {
        console.error('Health check failed:', healthError);
      }
      
      // Now try the actual endpoint
      const url = `https://${projectId}.supabase.co/functions/v1/make-server-cbd74580/subscription-tiers`;
      console.log('URL:', url);
      console.log('Authorization:', `Bearer ${publicAnonKey.substring(0, 20)}...`);
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`
        }
      });

      console.log('Tiers response status:', response.status);
      console.log('Tiers response ok:', response.ok);
      
      const responseText = await response.text();
      console.log('Raw response text:', responseText);
      
      let data;
      try {
        data = JSON.parse(responseText);
        console.log('Parsed tiers data:', data);
      } catch (parseError) {
        console.error('Failed to parse JSON:', parseError);
        console.error('Response was:', responseText);
        throw new Error('Server returned invalid JSON');
      }

      if (data.success && data.tiers) {
        console.log('Setting tiers:', data.tiers);
        console.log('Number of tiers:', data.tiers.length);
        setTiers(data.tiers);
      } else {
        console.error('Failed to fetch subscription tiers:', data.error || 'Unknown error');
        setError(data.error || 'Unknown error');
      }
      */
    } catch (error) {
      console.error('Error fetching subscription tiers:', error);
      setError('An error occurred while fetching subscription tiers');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-[#625d9c]" />
      </div>
    );
  }

  if (tiers.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <p className="text-gray-600 mb-2">No subscription tiers available</p>
        {error && (
          <p className="text-red-600 text-sm mb-4">Error: {error}</p>
        )}
        <p className="text-xs text-gray-500 mb-4">
          Check the browser console (F12) for detailed logs
        </p>
        <Button onClick={fetchTiers} variant="outline">
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="grid md:grid-cols-3 gap-6">
      {tiers.map((tier) => (
        <Card
          key={tier.id}
          className={`relative p-6 ${
            tier.popular ? 'border-[#5d9827] border-2 shadow-lg' : 'border-gray-200'
          } ${
            currentTierId === tier.id ? 'bg-gray-50 border-[#625d9c] border-2' : ''
          }`}
        >
          {tier.popular && (
            <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#5d9827]">
              Most Popular
            </Badge>
          )}
          
          {currentTierId === tier.id && (
            <Badge className="absolute -top-3 right-4 bg-[#625d9c]">
              Current Plan
            </Badge>
          )}

          <div className="text-center mb-6">
            <h3 className="mb-2" style={{ color: tier.color }}>{tier.name}</h3>
            <div className="flex items-baseline justify-center gap-1">
              <span className="text-4xl">£{tier.price}</span>
              <span className="text-gray-500">/{tier.billingCycle}</span>
            </div>
            <p className="text-sm text-gray-600 mt-2">
              {tier.sessionsPerChild || tier.sessions} sessions per child/month
            </p>
            <p className="text-xs mt-1" style={{ color: tier.color }}>
              {tier.maxChildren === 1 ? '1 child' : `Up to ${tier.maxChildren} children`}
            </p>
          </div>

          <ul className="space-y-3 mb-6">
            {tier.benefits.map((benefit, index) => (
              <li key={index} className="flex items-start gap-2">
                <Check className="w-5 h-5 text-[#5d9827] flex-shrink-0 mt-0.5" />
                <span className="text-sm">{benefit}</span>
              </li>
            ))}
          </ul>

          <Button
            onClick={() => onSelectTier(tier.id)}
            disabled={isLoading || currentTierId === tier.id}
            className={`w-full ${
              tier.popular
                ? 'bg-[#5d9827] hover:bg-[#4a7a1f]'
                : 'bg-[#625d9c] hover:bg-[#4f4a7d]'
            }`}
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Processing...
              </>
            ) : currentTierId === tier.id ? (
              'Current Plan'
            ) : currentTierId ? (
              currentTierId === 'basic' && tier.id !== 'basic' ? 'Upgrade' :
              currentTierId === 'standard' && tier.id === 'premium' ? 'Upgrade' :
              currentTierId === 'standard' && tier.id === 'basic' ? 'Downgrade' :
              currentTierId === 'premium' && tier.id !== 'premium' ? 'Downgrade' :
              'Select Plan'
            ) : (
              'Select Plan'
            )}
          </Button>
        </Card>
      ))}
    </div>
  );
}