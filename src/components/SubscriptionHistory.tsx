import React, { useState, useEffect } from 'react';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import {
  ArrowUp,
  ArrowDown,
  CreditCard,
  XCircle,
  RefreshCw,
  Calendar,
  Loader2
} from 'lucide-react';
import { projectId, publicAnonKey } from '../utils/supabase/info';

interface HistoryEntry {
  type: string;
  tierId?: string;
  tierName?: string;
  fromTierId?: string;
  fromTierName?: string;
  toTierId?: string;
  toTierName?: string;
  price?: number;
  proRataCharge?: number;
  creditAmount?: number;
  reason?: string;
  effectiveDate?: string;
  date: string;
}

interface SubscriptionHistoryProps {
  parentId: string;
  accessToken: string;
}

export function SubscriptionHistory({ parentId, accessToken }: SubscriptionHistoryProps) {
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchHistory();
  }, [parentId]);

  const fetchHistory = async () => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-cbd74580/subscription/${parentId}/history`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`
          }
        }
      );

      const data = await response.json();
      if (data.success) {
        setHistory(data.history);
      } else {
        console.error('Failed to fetch subscription history:', data.error);
      }
    } catch (error) {
      console.error('Error fetching subscription history:', error);
    } finally {
      setLoading(false);
    }
  };

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'subscription':
        return <CreditCard className="w-5 h-5 text-[#5d9827]" />;
      case 'upgrade':
        return <ArrowUp className="w-5 h-5 text-[#5d9827]" />;
      case 'downgrade_scheduled':
        return <ArrowDown className="w-5 h-5 text-orange-600" />;
      case 'cancellation_scheduled':
        return <XCircle className="w-5 h-5 text-red-600" />;
      case 'reactivated':
        return <RefreshCw className="w-5 h-5 text-[#5d9827]" />;
      default:
        return <Calendar className="w-5 h-5 text-gray-600" />;
    }
  };

  const getEventTitle = (entry: HistoryEntry) => {
    switch (entry.type) {
      case 'subscription':
        return `Subscribed to ${entry.tierName}`;
      case 'upgrade':
        return `Upgraded from ${entry.fromTierName} to ${entry.toTierName}`;
      case 'downgrade_scheduled':
        return `Downgrade scheduled: ${entry.fromTierName} → ${entry.toTierName}`;
      case 'cancellation_scheduled':
        return `Cancellation scheduled`;
      case 'reactivated':
        return `Subscription reactivated`;
      default:
        return entry.type;
    }
  };

  const getEventDescription = (entry: HistoryEntry) => {
    switch (entry.type) {
      case 'subscription':
        return `Started subscription at £${entry.price?.toFixed(2)}/month`;
      case 'upgrade':
        return entry.proRataCharge
          ? `Pro-rata charge: £${entry.proRataCharge.toFixed(2)}`
          : 'Immediate upgrade';
      case 'downgrade_scheduled':
        return entry.creditAmount
          ? `£${entry.creditAmount.toFixed(2)} credit on next billing cycle. Effective ${
              entry.effectiveDate ? new Date(entry.effectiveDate).toLocaleDateString() : ''
            }`
          : `Effective ${entry.effectiveDate ? new Date(entry.effectiveDate).toLocaleDateString() : ''}`;
      case 'cancellation_scheduled':
        return entry.reason
          ? `Reason: ${entry.reason.replace(/_/g, ' ')}`
          : 'Subscription cancellation requested';
      case 'reactivated':
        return 'Subscription restored to active status';
      default:
        return '';
    }
  };

  const getEventBadge = (type: string) => {
    switch (type) {
      case 'subscription':
        return <Badge className="bg-[#5d9827]">New</Badge>;
      case 'upgrade':
        return <Badge className="bg-[#5d9827]">Upgrade</Badge>;
      case 'downgrade_scheduled':
        return <Badge className="bg-orange-500">Scheduled</Badge>;
      case 'cancellation_scheduled':
        return <Badge className="bg-red-500">Cancelled</Badge>;
      case 'reactivated':
        return <Badge className="bg-[#5d9827]">Reactivated</Badge>;
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <Card className="p-6">
        <div className="flex justify-center items-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-[#625d9c]" />
        </div>
      </Card>
    );
  }

  if (history.length === 0) {
    return (
      <Card className="p-6">
        <div className="text-center py-8 text-gray-500">
          <Calendar className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <p>No subscription history yet</p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <h3 className="mb-4">Subscription History</h3>
      
      <div className="space-y-4">
        {history.map((entry, index) => (
          <div key={index} className="flex gap-4 pb-4 border-b last:border-b-0">
            <div className="flex-shrink-0 mt-1">{getEventIcon(entry.type)}</div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2 mb-1">
                <p className="font-medium">{getEventTitle(entry)}</p>
                {getEventBadge(entry.type)}
              </div>
              
              <p className="text-sm text-gray-600 mb-1">{getEventDescription(entry)}</p>
              
              <p className="text-xs text-gray-500">
                {new Date(entry.date).toLocaleDateString('en-GB', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </p>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
