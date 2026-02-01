import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { ScrollArea } from './ui/scroll-area';
import { FileText, Shield, Scale, Lock, CheckCircle2 } from 'lucide-react';
import { projectId } from '../utils/supabase/info';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';

interface Policy {
  id: string;
  title: string;
  version: string;
  lastUpdated: string;
  content: string;
  category: string;
}

interface PoliciesViewProps {
  session?: any;
  userId?: string;
  embedded?: boolean;
  policyId?: string;
}

export function PoliciesView({ session, userId, embedded = false, policyId }: PoliciesViewProps) {
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [selectedPolicy, setSelectedPolicy] = useState<Policy | null>(null);
  const [loading, setLoading] = useState(true);
  const [policyDialogOpen, setPolicyDialogOpen] = useState(false);
  const [accepted, setAccepted] = useState<Record<string, boolean>>({});

  useEffect(() => {
    fetchPolicies();
  }, []);

  useEffect(() => {
    if (policyId && policies.length > 0) {
      const policy = policies.find(p => p.id === policyId);
      if (policy) {
        setSelectedPolicy(policy);
        setPolicyDialogOpen(true);
      }
    }
  }, [policyId, policies]);

  const fetchPolicies = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-cbd74580/policies`,
        {
          headers: session ? {
            Authorization: `Bearer ${session.access_token}`,
          } : {},
        }
      );

      if (!response.ok) throw new Error('Failed to fetch policies');

      const data = await response.json();
      setPolicies(data.policies || []);

      // Check acceptance status if user is logged in
      if (userId && session) {
        for (const policy of data.policies) {
          await checkAcceptance(policy.id);
        }
      }
    } catch (err) {
      console.error('Error fetching policies:', err);
    } finally {
      setLoading(false);
    }
  };

  const checkAcceptance = async (policyId: string) => {
    if (!userId || !session) return;

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-cbd74580/policies/${policyId}/acceptance/${userId}`,
        {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        }
      );

      if (!response.ok) return;

      const data = await response.json();
      setAccepted(prev => ({ ...prev, [policyId]: data.accepted }));
    } catch (err) {
      console.error('Error checking policy acceptance:', err);
    }
  };

  const handleAcceptPolicy = async (policyId: string) => {
    if (!userId || !session) return;

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-cbd74580/policies/${policyId}/accept`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ userId }),
        }
      );

      if (!response.ok) throw new Error('Failed to accept policy');

      setAccepted(prev => ({ ...prev, [policyId]: true }));
    } catch (err) {
      console.error('Error accepting policy:', err);
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'safety':
        return <Shield className="w-5 h-5 text-blue-600" />;
      case 'conduct':
        return <Scale className="w-5 h-5 text-purple-600" />;
      case 'legal':
        return <Lock className="w-5 h-5 text-gray-600" />;
      default:
        return <FileText className="w-5 h-5 text-gray-600" />;
    }
  };

  const policiesByCategory = {
    safety: policies.filter(p => p.category === 'safety'),
    conduct: policies.filter(p => p.category === 'conduct'),
    legal: policies.filter(p => p.category === 'legal'),
  };

  const PolicyCard = ({ policy }: { policy: Policy }) => (
    <Card className="cursor-pointer hover:shadow-md transition-shadow"
      onClick={() => {
        setSelectedPolicy(policy);
        setPolicyDialogOpen(true);
      }}
    >
      <CardContent className="pt-6">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            {getCategoryIcon(policy.category)}
            <div>
              <h3 className="font-semibold">{policy.title}</h3>
              <p className="text-xs text-gray-500">
                Version {policy.version} • Updated {new Date(policy.lastUpdated).toLocaleDateString()}
              </p>
            </div>
          </div>
          {accepted[policy.id] && (
            <Badge className="bg-green-100 text-green-800">
              <CheckCircle2 className="w-3 h-3 mr-1" />
              Accepted
            </Badge>
          )}
        </div>
        <Button size="sm" variant="outline" className="w-full">
          View Policy
        </Button>
      </CardContent>
    </Card>
  );

  if (embedded && selectedPolicy) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3 pb-4 border-b">
          {getCategoryIcon(selectedPolicy.category)}
          <div>
            <h2 className="text-xl font-bold">{selectedPolicy.title}</h2>
            <p className="text-sm text-gray-500">
              Version {selectedPolicy.version} • Last updated {new Date(selectedPolicy.lastUpdated).toLocaleDateString()}
            </p>
          </div>
        </div>

        <ScrollArea className="h-96 pr-4">
          <div className="prose prose-sm max-w-none">
            <div dangerouslySetInnerHTML={{ __html: selectedPolicy.content.replace(/\n/g, '<br/>') }} />
          </div>
        </ScrollArea>

        {userId && session && !accepted[selectedPolicy.id] && (
          <div className="pt-4 border-t">
            <Button
              onClick={() => handleAcceptPolicy(selectedPolicy.id)}
              className="w-full"
              style={{ backgroundColor: '#625d9c' }}
            >
              I Accept This Policy
            </Button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Platform Policies
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-gray-500">Loading policies...</div>
          ) : (
            <Tabs defaultValue="safety">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="safety">
                  <Shield className="w-4 h-4 mr-2" />
                  Safety ({policiesByCategory.safety.length})
                </TabsTrigger>
                <TabsTrigger value="conduct">
                  <Scale className="w-4 h-4 mr-2" />
                  Conduct ({policiesByCategory.conduct.length})
                </TabsTrigger>
                <TabsTrigger value="legal">
                  <Lock className="w-4 h-4 mr-2" />
                  Legal ({policiesByCategory.legal.length})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="safety" className="space-y-4 mt-4">
                {policiesByCategory.safety.map(policy => (
                  <PolicyCard key={policy.id} policy={policy} />
                ))}
              </TabsContent>

              <TabsContent value="conduct" className="space-y-4 mt-4">
                {policiesByCategory.conduct.map(policy => (
                  <PolicyCard key={policy.id} policy={policy} />
                ))}
              </TabsContent>

              <TabsContent value="legal" className="space-y-4 mt-4">
                {policiesByCategory.legal.map(policy => (
                  <PolicyCard key={policy.id} policy={policy} />
                ))}
              </TabsContent>
            </Tabs>
          )}
        </CardContent>
      </Card>

      <Dialog open={policyDialogOpen} onOpenChange={setPolicyDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              {selectedPolicy && getCategoryIcon(selectedPolicy.category)}
              {selectedPolicy?.title}
            </DialogTitle>
            <DialogDescription>
              Version {selectedPolicy?.version} • Last updated {selectedPolicy && new Date(selectedPolicy.lastUpdated).toLocaleDateString()}
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="h-96 pr-4">
            {selectedPolicy && (
              <div className="prose prose-sm max-w-none whitespace-pre-wrap">
                {selectedPolicy.content}
              </div>
            )}
          </ScrollArea>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setPolicyDialogOpen(false)}>
              Close
            </Button>
            {userId && session && selectedPolicy && !accepted[selectedPolicy.id] && (
              <Button
                onClick={() => {
                  handleAcceptPolicy(selectedPolicy.id);
                  setPolicyDialogOpen(false);
                }}
                style={{ backgroundColor: '#625d9c' }}
              >
                I Accept This Policy
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
