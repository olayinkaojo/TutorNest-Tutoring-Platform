import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Badge } from './ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Textarea } from './ui/textarea';
import { Switch } from './ui/switch';
import { toast } from 'sonner@2.0.3';
import { projectId, publicAnonKey } from '../utils/supabase/info.tsx';
import { Plus, Percent, PoundSterling, Calendar, Users, Edit, Trash2, XCircle } from 'lucide-react';

interface Coupon {
  id: string;
  code: string;
  type: 'percentage' | 'fixed';
  value: number;
  description: string;
  expiryDate: string;
  usageLimit: number;
  usageCount: number;
  eligibleTiers: string[];
  isActive: boolean;
  createdAt: string;
}

interface CouponManagerProps {
  adminId: string;
}

export function CouponManager({ adminId }: CouponManagerProps) {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null);

  // Form state
  const [code, setCode] = useState('');
  const [type, setType] = useState<'percentage' | 'fixed'>('percentage');
  const [value, setValue] = useState('');
  const [description, setDescription] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [usageLimit, setUsageLimit] = useState('');
  const [eligibleTiers, setEligibleTiers] = useState<string[]>(['all']);

  useEffect(() => {
    fetchCoupons();
  }, []);

  const fetchCoupons = async () => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-cbd74580/coupons/all`,
        {
          headers: {
            Authorization: `Bearer ${publicAnonKey}`,
          },
        }
      );

      const data = await response.json();
      if (data.success) {
        setCoupons(data.coupons);
      }
    } catch (error) {
      console.error('Error fetching coupons:', error);
      toast.error('Failed to load coupons');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setCode('');
    setType('percentage');
    setValue('');
    setDescription('');
    setExpiryDate('');
    setUsageLimit('');
    setEligibleTiers(['all']);
    setEditingCoupon(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!code || !value || !expiryDate || !usageLimit) {
      toast.error('Please fill in all required fields');
      return;
    }

    const numericValue = parseFloat(value);
    if (isNaN(numericValue) || numericValue <= 0) {
      toast.error('Please enter a valid discount value');
      return;
    }

    if (type === 'percentage' && numericValue > 100) {
      toast.error('Percentage discount cannot exceed 100%');
      return;
    }

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-cbd74580/coupons/create`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${publicAnonKey}`,
          },
          body: JSON.stringify({
            code: code.toUpperCase().trim(),
            type,
            value: numericValue,
            description,
            expiryDate,
            usageLimit: parseInt(usageLimit),
            eligibleTiers,
            createdBy: adminId,
          }),
        }
      );

      const data = await response.json();

      if (data.success) {
        toast.success('Coupon created successfully!');
        fetchCoupons();
        setIsDialogOpen(false);
        resetForm();
      } else {
        toast.error(data.error || 'Failed to create coupon');
      }
    } catch (error) {
      console.error('Error creating coupon:', error);
      toast.error('Failed to create coupon');
    }
  };

  const handleDeactivate = async (couponId: string) => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-cbd74580/coupons/${couponId}/deactivate`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${publicAnonKey}`,
          },
        }
      );

      const data = await response.json();

      if (data.success) {
        toast.success('Coupon deactivated');
        fetchCoupons();
      } else {
        toast.error(data.error || 'Failed to deactivate coupon');
      }
    } catch (error) {
      console.error('Error deactivating coupon:', error);
      toast.error('Failed to deactivate coupon');
    }
  };

  const handleToggleTier = (tier: string) => {
    if (tier === 'all') {
      setEligibleTiers(['all']);
    } else {
      setEligibleTiers((prev) => {
        const filtered = prev.filter(t => t !== 'all');
        if (filtered.includes(tier)) {
          return filtered.filter(t => t !== tier);
        } else {
          return [...filtered, tier];
        }
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2>Coupon Management</h2>
          <p className="text-muted-foreground">Create and manage promotional discount codes</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="mr-2 h-4 w-4" />
              Create Coupon
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <form onSubmit={handleSubmit}>
              <DialogHeader>
                <DialogTitle>Create New Coupon</DialogTitle>
                <DialogDescription>
                  Set up a promotional discount code for TutorNest subscriptions
                </DialogDescription>
              </DialogHeader>

              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="code">Coupon Code *</Label>
                  <Input
                    id="code"
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    placeholder="e.g., SUMMER2024"
                    required
                  />
                  <p className="text-sm text-muted-foreground">
                    Code will be automatically converted to uppercase
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="type">Discount Type *</Label>
                    <Select value={type} onValueChange={(val: any) => setType(val)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="percentage">
                          <div className="flex items-center">
                            <Percent className="mr-2 h-4 w-4" />
                            Percentage (%)
                          </div>
                        </SelectItem>
                        <SelectItem value="fixed">
                          <div className="flex items-center">
                            <PoundSterling className="mr-2 h-4 w-4" />
                            Fixed Amount (£)
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="value">Discount Value *</Label>
                    <Input
                      id="value"
                      type="number"
                      step="0.01"
                      value={value}
                      onChange={(e) => setValue(e.target.value)}
                      placeholder={type === 'percentage' ? '0-100' : '0.00'}
                      required
                    />
                  </div>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Optional description for marketing purposes"
                    rows={2}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="expiryDate">Expiry Date *</Label>
                    <Input
                      id="expiryDate"
                      type="date"
                      value={expiryDate}
                      onChange={(e) => setExpiryDate(e.target.value)}
                      required
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="usageLimit">Usage Limit *</Label>
                    <Input
                      id="usageLimit"
                      type="number"
                      value={usageLimit}
                      onChange={(e) => setUsageLimit(e.target.value)}
                      placeholder="Max total uses"
                      required
                    />
                  </div>
                </div>

                <div className="grid gap-2">
                  <Label>Eligible Tiers</Label>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant={eligibleTiers.includes('all') ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => handleToggleTier('all')}
                    >
                      All Tiers
                    </Button>
                    <Button
                      type="button"
                      variant={eligibleTiers.includes('starter') ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => handleToggleTier('starter')}
                    >
                      Starter
                    </Button>
                    <Button
                      type="button"
                      variant={eligibleTiers.includes('plus') ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => handleToggleTier('plus')}
                    >
                      Plus
                    </Button>
                    <Button
                      type="button"
                      variant={eligibleTiers.includes('premium') ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => handleToggleTier('premium')}
                    >
                      Premium
                    </Button>
                  </div>
                </div>
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">Create Coupon</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <Card>
          <CardContent className="p-6">
            <p className="text-center text-muted-foreground">Loading coupons...</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Active Coupons</CardTitle>
            <CardDescription>
              {coupons.length} total coupon{coupons.length !== 1 ? 's' : ''} created
            </CardDescription>
          </CardHeader>
          <CardContent>
            {coupons.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                No coupons created yet. Click "Create Coupon" to get started.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Code</TableHead>
                    <TableHead>Discount</TableHead>
                    <TableHead>Expiry</TableHead>
                    <TableHead>Usage</TableHead>
                    <TableHead>Tiers</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {coupons.map((coupon) => (
                    <TableRow key={coupon.id}>
                      <TableCell>
                        <code className="px-2 py-1 bg-muted rounded">{coupon.code}</code>
                      </TableCell>
                      <TableCell>
                        {coupon.type === 'percentage' ? (
                          <span>{coupon.value}% off</span>
                        ) : (
                          <span>£{coupon.value.toFixed(2)} off</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3 text-muted-foreground" />
                          {new Date(coupon.expiryDate).toLocaleDateString()}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Users className="h-3 w-3 text-muted-foreground" />
                          {coupon.usageCount} / {coupon.usageLimit}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {coupon.eligibleTiers.includes('all') ? (
                            <Badge variant="secondary">All</Badge>
                          ) : (
                            coupon.eligibleTiers.map((tier) => (
                              <Badge key={tier} variant="outline">
                                {tier}
                              </Badge>
                            ))
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {coupon.isActive ? (
                          <Badge variant="default">Active</Badge>
                        ) : (
                          <Badge variant="secondary">Inactive</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {coupon.isActive && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeactivate(coupon.id)}
                          >
                            <XCircle className="h-4 w-4" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
