import React, { useState, useEffect } from 'react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Badge } from '../ui/badge';
import { Separator } from '../ui/separator';
import { 
  Building2,
  Users,
  Mail,
  Phone,
  MapPin,
  FileText,
  CreditCard,
  Shield,
  CheckCircle2,
  Loader2,
  Edit,
  Save,
  X
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { projectId, publicAnonKey } from '../../utils/supabase/info';

interface OrganisationData {
  id: string;
  name: string;
  type: 'school' | 'academy' | 'trust' | 'college' | 'university' | 'other';
  registrationNumber?: string;
  vatNumber?: string;
  address: {
    line1: string;
    line2?: string;
    city: string;
    postcode: string;
    country: string;
  };
  contactDetails: {
    primaryEmail: string;
    secondaryEmail?: string;
    phone: string;
    website?: string;
  };
  billingContact: {
    name: string;
    email: string;
    phone: string;
    department?: string;
  };
  coordinators: {
    id: string;
    name: string;
    email: string;
    role: string;
  }[];
  settings: {
    requireApproval: boolean;
    allowDirectBooking: boolean;
    restrictToApprovedTutors: boolean;
    maxStudents: number;
    billingCycle: 'monthly' | 'quarterly' | 'annual';
    paymentTerms: number; // days
  };
  subscription: {
    tier: 'starter' | 'professional' | 'enterprise';
    maxStudents: number;
    maxTutors: number;
    monthlyFee: number;
    activeStudents: number;
    activeTutors: number;
  };
  status: 'active' | 'suspended' | 'pending';
  createdAt: string;
  verificationStatus: 'verified' | 'pending' | 'rejected';
}

interface OrganisationProfileProps {
  organisationId: string;
  accessToken: string;
  isCoordinator: boolean;
}

const ORG_TYPES = [
  { value: 'school', label: 'Primary/Secondary School' },
  { value: 'academy', label: 'Academy' },
  { value: 'trust', label: 'Multi-Academy Trust' },
  { value: 'college', label: 'College' },
  { value: 'university', label: 'University' },
  { value: 'other', label: 'Other Educational Institution' }
];

const SUBSCRIPTION_TIERS = [
  {
    id: 'starter',
    name: 'Starter',
    maxStudents: 50,
    maxTutors: 10,
    monthlyFee: 249,
    features: [
      'Up to 50 students',
      'Up to 10 approved tutors',
      'Basic analytics',
      'Email support',
      'Monthly invoicing'
    ]
  },
  {
    id: 'professional',
    name: 'Professional',
    maxStudents: 200,
    maxTutors: 30,
    monthlyFee: 799,
    features: [
      'Up to 200 students',
      'Up to 30 approved tutors',
      'Advanced analytics & reporting',
      'Priority support',
      'Custom billing cycles',
      'Dedicated account manager',
      'API access'
    ]
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    maxStudents: 999999,
    maxTutors: 999999,
    monthlyFee: 0, // Custom pricing
    features: [
      'Unlimited students',
      'Unlimited tutors',
      'Custom analytics',
      '24/7 priority support',
      'Custom contracts',
      'Dedicated success team',
      'API access',
      'SSO integration',
      'Custom pricing'
    ]
  }
];

export function OrganisationProfile({ organisationId, accessToken, isCoordinator }: OrganisationProfileProps) {
  const [organisation, setOrganisation] = useState<OrganisationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editedOrg, setEditedOrg] = useState<OrganisationData | null>(null);

  useEffect(() => {
    loadOrganisation();
  }, [organisationId]);

  const loadOrganisation = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-cbd74580/organisations/${organisationId}`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`
          }
        }
      );

      if (response.ok) {
        const data = await response.json();
        setOrganisation(data.organisation);
        setEditedOrg(data.organisation);
      }
    } catch (error) {
      console.error('Error loading organisation:', error);
      toast.error('Failed to load organisation details');
    } finally {
      setLoading(false);
    }
  };

  const saveChanges = async () => {
    if (!editedOrg) return;

    setSaving(true);
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-cbd74580/organisations/${organisationId}`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(editedOrg)
        }
      );

      if (response.ok) {
        toast.success('Organisation details updated');
        setOrganisation(editedOrg);
        setEditing(false);
      } else {
        toast.error('Failed to update organisation');
      }
    } catch (error) {
      console.error('Error saving organisation:', error);
      toast.error('Failed to update organisation');
    } finally {
      setSaving(false);
    }
  };

  const cancelEditing = () => {
    setEditedOrg(organisation);
    setEditing(false);
  };

  const updateField = (path: string, value: any) => {
    if (!editedOrg) return;

    const keys = path.split('.');
    const newOrg = { ...editedOrg };
    let current: any = newOrg;

    for (let i = 0; i < keys.length - 1; i++) {
      current = current[keys[i]];
    }

    current[keys[keys.length - 1]] = value;
    setEditedOrg(newOrg);
  };

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="w-8 h-8 animate-spin text-[#625d9c]" />
      </div>
    );
  }

  if (!organisation || !editedOrg) {
    return (
      <Card className="p-8 text-center">
        <p className="text-gray-600">Organisation not found</p>
      </Card>
    );
  }

  const currentTier = SUBSCRIPTION_TIERS.find(t => t.id === organisation.subscription.tier);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <Building2 className="w-8 h-8 text-[#625d9c]" />
            <div>
              <h2 className="text-3xl">{organisation.name}</h2>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="outline">{ORG_TYPES.find(t => t.value === organisation.type)?.label}</Badge>
                <Badge className={
                  organisation.status === 'active' ? 'bg-green-100 text-green-800' :
                  organisation.status === 'suspended' ? 'bg-red-100 text-red-800' :
                  'bg-yellow-100 text-yellow-800'
                }>
                  {organisation.status}
                </Badge>
                {organisation.verificationStatus === 'verified' && (
                  <Badge className="bg-blue-100 text-blue-800">
                    <CheckCircle2 className="w-3 h-3 mr-1" />
                    Verified
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </div>
        {isCoordinator && (
          <div className="flex gap-2">
            {editing ? (
              <>
                <Button variant="outline" onClick={cancelEditing}>
                  <X className="w-4 h-4 mr-2" />
                  Cancel
                </Button>
                <Button onClick={saveChanges} disabled={saving} className="bg-[#5d9827] hover:bg-[#4a7a1f]">
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Save Changes
                    </>
                  )}
                </Button>
              </>
            ) : (
              <Button onClick={() => setEditing(true)} variant="outline">
                <Edit className="w-4 h-4 mr-2" />
                Edit Profile
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Subscription Overview */}
      <Card className="p-6 bg-gradient-to-r from-[#625d9c] to-[#5d9827] text-white">
        <div className="grid md:grid-cols-4 gap-6">
          <div>
            <div className="text-sm opacity-90 mb-1">Subscription Tier</div>
            <div className="text-2xl font-bold">{currentTier?.name}</div>
            <div className="text-sm opacity-90 mt-1">
              £{currentTier?.monthlyFee}/month
            </div>
          </div>
          <div>
            <div className="text-sm opacity-90 mb-1">Active Students</div>
            <div className="text-2xl font-bold">
              {organisation.subscription.activeStudents} / {organisation.subscription.maxStudents === 999999 ? '∞' : organisation.subscription.maxStudents}
            </div>
          </div>
          <div>
            <div className="text-sm opacity-90 mb-1">Approved Tutors</div>
            <div className="text-2xl font-bold">
              {organisation.subscription.activeTutors} / {organisation.subscription.maxTutors === 999999 ? '∞' : organisation.subscription.maxTutors}
            </div>
          </div>
          <div>
            <div className="text-sm opacity-90 mb-1">Monthly Spend</div>
            <div className="text-2xl font-bold">
              £{organisation.subscription.monthlyFee.toFixed(2)}
            </div>
          </div>
        </div>
      </Card>

      {/* Organisation Details */}
      <Card className="p-6">
        <h3 className="text-xl mb-4">Organisation Details</h3>
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <Label htmlFor="org-name">Organisation Name</Label>
            <Input
              id="org-name"
              value={editedOrg.name}
              onChange={(e) => updateField('name', e.target.value)}
              disabled={!editing}
            />
          </div>

          <div>
            <Label htmlFor="org-type">Organisation Type</Label>
            <select
              id="org-type"
              className="w-full p-2 border rounded-lg"
              value={editedOrg.type}
              onChange={(e) => updateField('type', e.target.value)}
              disabled={!editing}
            >
              {ORG_TYPES.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <Label htmlFor="reg-number">Registration Number</Label>
            <Input
              id="reg-number"
              placeholder="e.g., 12345678"
              value={editedOrg.registrationNumber || ''}
              onChange={(e) => updateField('registrationNumber', e.target.value)}
              disabled={!editing}
            />
          </div>

          <div>
            <Label htmlFor="vat-number">VAT Number</Label>
            <Input
              id="vat-number"
              placeholder="e.g., GB123456789"
              value={editedOrg.vatNumber || ''}
              onChange={(e) => updateField('vatNumber', e.target.value)}
              disabled={!editing}
            />
          </div>
        </div>
      </Card>

      {/* Address */}
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <MapPin className="w-5 h-5 text-[#625d9c]" />
          <h3 className="text-xl">Address</h3>
        </div>
        <div className="space-y-4">
          <div>
            <Label htmlFor="address-line1">Address Line 1</Label>
            <Input
              id="address-line1"
              value={editedOrg.address.line1}
              onChange={(e) => updateField('address.line1', e.target.value)}
              disabled={!editing}
            />
          </div>

          <div>
            <Label htmlFor="address-line2">Address Line 2 (Optional)</Label>
            <Input
              id="address-line2"
              value={editedOrg.address.line2 || ''}
              onChange={(e) => updateField('address.line2', e.target.value)}
              disabled={!editing}
            />
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="city">City</Label>
              <Input
                id="city"
                value={editedOrg.address.city}
                onChange={(e) => updateField('address.city', e.target.value)}
                disabled={!editing}
              />
            </div>

            <div>
              <Label htmlFor="postcode">Postcode</Label>
              <Input
                id="postcode"
                value={editedOrg.address.postcode}
                onChange={(e) => updateField('address.postcode', e.target.value)}
                disabled={!editing}
              />
            </div>

            <div>
              <Label htmlFor="country">Country</Label>
              <Input
                id="country"
                value={editedOrg.address.country}
                onChange={(e) => updateField('address.country', e.target.value)}
                disabled={!editing}
              />
            </div>
          </div>
        </div>
      </Card>

      {/* Contact Details */}
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <Mail className="w-5 h-5 text-[#625d9c]" />
          <h3 className="text-xl">Contact Details</h3>
        </div>
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <Label htmlFor="primary-email">Primary Email</Label>
            <Input
              id="primary-email"
              type="email"
              value={editedOrg.contactDetails.primaryEmail}
              onChange={(e) => updateField('contactDetails.primaryEmail', e.target.value)}
              disabled={!editing}
            />
          </div>

          <div>
            <Label htmlFor="secondary-email">Secondary Email (Optional)</Label>
            <Input
              id="secondary-email"
              type="email"
              value={editedOrg.contactDetails.secondaryEmail || ''}
              onChange={(e) => updateField('contactDetails.secondaryEmail', e.target.value)}
              disabled={!editing}
            />
          </div>

          <div>
            <Label htmlFor="phone">Phone</Label>
            <Input
              id="phone"
              type="tel"
              value={editedOrg.contactDetails.phone}
              onChange={(e) => updateField('contactDetails.phone', e.target.value)}
              disabled={!editing}
            />
          </div>

          <div>
            <Label htmlFor="website">Website (Optional)</Label>
            <Input
              id="website"
              type="url"
              placeholder="https://"
              value={editedOrg.contactDetails.website || ''}
              onChange={(e) => updateField('contactDetails.website', e.target.value)}
              disabled={!editing}
            />
          </div>
        </div>
      </Card>

      {/* Billing Contact */}
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <CreditCard className="w-5 h-5 text-[#625d9c]" />
          <h3 className="text-xl">Billing Contact</h3>
        </div>
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <Label htmlFor="billing-name">Contact Name</Label>
            <Input
              id="billing-name"
              value={editedOrg.billingContact.name}
              onChange={(e) => updateField('billingContact.name', e.target.value)}
              disabled={!editing}
            />
          </div>

          <div>
            <Label htmlFor="billing-email">Email</Label>
            <Input
              id="billing-email"
              type="email"
              value={editedOrg.billingContact.email}
              onChange={(e) => updateField('billingContact.email', e.target.value)}
              disabled={!editing}
            />
          </div>

          <div>
            <Label htmlFor="billing-phone">Phone</Label>
            <Input
              id="billing-phone"
              type="tel"
              value={editedOrg.billingContact.phone}
              onChange={(e) => updateField('billingContact.phone', e.target.value)}
              disabled={!editing}
            />
          </div>

          <div>
            <Label htmlFor="billing-dept">Department (Optional)</Label>
            <Input
              id="billing-dept"
              placeholder="e.g., Finance"
              value={editedOrg.billingContact.department || ''}
              onChange={(e) => updateField('billingContact.department', e.target.value)}
              disabled={!editing}
            />
          </div>
        </div>
      </Card>

      {/* Coordinators */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-[#625d9c]" />
            <h3 className="text-xl">Coordinators</h3>
          </div>
          {isCoordinator && (
            <Button size="sm" variant="outline">
              Add Coordinator
            </Button>
          )}
        </div>
        <div className="space-y-2">
          {organisation.coordinators.map((coordinator) => (
            <Card key={coordinator.id} className="p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">{coordinator.name}</p>
                  <p className="text-sm text-gray-600">{coordinator.email}</p>
                  <Badge variant="outline" className="mt-1 text-xs">
                    {coordinator.role}
                  </Badge>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </Card>

      {/* Settings */}
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <Shield className="w-5 h-5 text-[#625d9c]" />
          <h3 className="text-xl">Organisation Settings</h3>
        </div>
        <div className="space-y-4">
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div>
              <Label>Restrict to Approved Tutors Only</Label>
              <p className="text-xs text-gray-600">
                Students can only book with tutors from your approved pool
              </p>
            </div>
            <input
              type="checkbox"
              checked={editedOrg.settings.restrictToApprovedTutors}
              onChange={(e) => updateField('settings.restrictToApprovedTutors', e.target.checked)}
              disabled={!editing}
              className="h-5 w-5"
            />
          </div>

          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div>
              <Label>Require Coordinator Approval</Label>
              <p className="text-xs text-gray-600">
                All bookings require coordinator approval
              </p>
            </div>
            <input
              type="checkbox"
              checked={editedOrg.settings.requireApproval}
              onChange={(e) => updateField('settings.requireApproval', e.target.checked)}
              disabled={!editing}
              className="h-5 w-5"
            />
          </div>

          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div>
              <Label>Allow Direct Booking</Label>
              <p className="text-xs text-gray-600">
                Students can book directly without coordinator
              </p>
            </div>
            <input
              type="checkbox"
              checked={editedOrg.settings.allowDirectBooking}
              onChange={(e) => updateField('settings.allowDirectBooking', e.target.checked)}
              disabled={!editing}
              className="h-5 w-5"
            />
          </div>

          <Separator />

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="billing-cycle">Billing Cycle</Label>
              <select
                id="billing-cycle"
                className="w-full p-2 border rounded-lg"
                value={editedOrg.settings.billingCycle}
                onChange={(e) => updateField('settings.billingCycle', e.target.value)}
                disabled={!editing}
              >
                <option value="monthly">Monthly</option>
                <option value="quarterly">Quarterly</option>
                <option value="annual">Annual</option>
              </select>
            </div>

            <div>
              <Label htmlFor="payment-terms">Payment Terms (days)</Label>
              <Input
                id="payment-terms"
                type="number"
                min={0}
                value={editedOrg.settings.paymentTerms}
                onChange={(e) => updateField('settings.paymentTerms', Number(e.target.value))}
                disabled={!editing}
              />
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
