'use client';

import { useState } from 'react';
import {
  Building2,
  Globe,
  Phone,
  MapPin,
  ExternalLink,
  Save,
  Facebook,
  Instagram,
  Linkedin,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { toast } from 'sonner';
import type { Company, IndustryType, BusinessType, RevenueRange, CompanyStatus, PlanTier } from '@/types/database';

interface CompanyDetailsFormProps {
  company: Company;
  isAdmin?: boolean;
  onUpdate?: (company: Company) => void;
}

const INDUSTRY_LABELS: Record<IndustryType, string> = {
  restaurant: 'Restaurant / Food Service',
  dental: 'Dental Practice',
  medical: 'Medical / Healthcare',
  legal: 'Legal Services',
  real_estate: 'Real Estate',
  home_services: 'Home Services (Plumbing, HVAC, etc.)',
  automotive: 'Automotive',
  retail: 'Retail',
  fitness: 'Fitness / Gym',
  beauty_spa: 'Beauty / Spa',
  professional_services: 'Professional Services',
  construction: 'Construction',
  financial_services: 'Financial Services',
  technology: 'Technology',
  education: 'Education',
  nonprofit: 'Nonprofit',
  other: 'Other',
};

const BUSINESS_TYPE_LABELS: Record<BusinessType, string> = {
  b2b: 'B2B (Business to Business)',
  b2c: 'B2C (Business to Consumer)',
  both: 'Both B2B and B2C',
};

const REVENUE_RANGE_LABELS: Record<RevenueRange, string> = {
  under_100k: 'Under $100K',
  '100k_500k': '$100K - $500K',
  '500k_1m': '$500K - $1M',
  '1m_5m': '$1M - $5M',
  '5m_10m': '$5M - $10M',
  over_10m: 'Over $10M',
};

const STATUS_COLORS: Record<CompanyStatus, string> = {
  active: 'bg-green-100 text-green-800',
  paused: 'bg-yellow-100 text-yellow-800',
  churned: 'bg-red-100 text-red-800',
};

const PLAN_COLORS: Record<PlanTier, string> = {
  standard: 'bg-gray-100 text-gray-800',
  pro: 'bg-purple-100 text-purple-800',
};

const US_STATES = [
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
  'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
  'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
  'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
  'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY',
];

interface FormData {
  industry: IndustryType | '';
  business_type: BusinessType | '';
  city: string;
  state: string;
  country: string;
  website_url: string;
  google_business_url: string;
  facebook_url: string;
  instagram_handle: string;
  linkedin_url: string;
  phone: string;
  employee_count: string;
  annual_revenue_range: RevenueRange | '';
  notes: string;
}

export function CompanyDetailsForm({ company, isAdmin = false, onUpdate }: CompanyDetailsFormProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isSocialOpen, setIsSocialOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    industry: company.industry || '',
    business_type: company.business_type || '',
    city: company.city || '',
    state: company.state || '',
    country: company.country || 'US',
    website_url: company.website_url || '',
    google_business_url: company.google_business_url || '',
    facebook_url: company.facebook_url || '',
    instagram_handle: company.instagram_handle || '',
    linkedin_url: company.linkedin_url || '',
    phone: company.phone || '',
    employee_count: company.employee_count?.toString() || '',
    annual_revenue_range: company.annual_revenue_range || '',
    notes: company.notes || '',
  });

  const handleSave = async () => {
    setSaving(true);
    try {
      const response = await fetch(`/api/companies/${company.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          industry: formData.industry || null,
          business_type: formData.business_type || null,
          city: formData.city || null,
          state: formData.state || null,
          country: formData.country || 'US',
          website_url: formData.website_url || null,
          google_business_url: formData.google_business_url || null,
          facebook_url: formData.facebook_url || null,
          instagram_handle: formData.instagram_handle || null,
          linkedin_url: formData.linkedin_url || null,
          phone: formData.phone || null,
          employee_count: formData.employee_count ? parseInt(formData.employee_count) : null,
          annual_revenue_range: formData.annual_revenue_range || null,
          notes: formData.notes || null,
        }),
      });

      if (response.ok) {
        const updatedCompany = await response.json();
        toast.success('Company updated successfully');
        setIsEditing(false);
        onUpdate?.(updatedCompany);
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to update company');
      }
    } catch (error) {
      toast.error('An error occurred');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setFormData({
      industry: company.industry || '',
      business_type: company.business_type || '',
      city: company.city || '',
      state: company.state || '',
      country: company.country || 'US',
      website_url: company.website_url || '',
      google_business_url: company.google_business_url || '',
      facebook_url: company.facebook_url || '',
      instagram_handle: company.instagram_handle || '',
      linkedin_url: company.linkedin_url || '',
      phone: company.phone || '',
      employee_count: company.employee_count?.toString() || '',
      annual_revenue_range: company.annual_revenue_range || '',
      notes: company.notes || '',
    });
    setIsEditing(false);
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <CardTitle className="text-2xl">{company.name}</CardTitle>
            <Badge variant="outline" className={STATUS_COLORS[company.status]}>
              {company.status.charAt(0).toUpperCase() + company.status.slice(1)}
            </Badge>
            <Badge variant="outline" className={PLAN_COLORS[company.plan_tier]}>
              {company.plan_tier.charAt(0).toUpperCase() + company.plan_tier.slice(1)}
            </Badge>
          </div>
          <CardDescription>
            Client since {new Date(company.created_at).toLocaleDateString()}
            {company.industry && ` | ${INDUSTRY_LABELS[company.industry]}`}
          </CardDescription>
        </div>
        {isAdmin && (
          <div className="flex items-center gap-2">
            {isEditing ? (
              <>
                <Button variant="outline" onClick={handleCancel}>
                  Cancel
                </Button>
                <Button onClick={handleSave} disabled={saving}>
                  <Save className="h-4 w-4 mr-2" />
                  {saving ? 'Saving...' : 'Save'}
                </Button>
              </>
            ) : (
              <Button variant="outline" onClick={() => setIsEditing(true)}>
                Edit Details
              </Button>
            )}
          </div>
        )}
      </CardHeader>

      <CardContent>
        {isEditing ? (
          <div className="space-y-6">
            {/* Basic Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="industry">Industry</Label>
                <Select
                  value={formData.industry}
                  onValueChange={(value: IndustryType | '') =>
                    setFormData({ ...formData, industry: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select industry" />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(INDUSTRY_LABELS) as IndustryType[]).map((industry) => (
                      <SelectItem key={industry} value={industry}>
                        {INDUSTRY_LABELS[industry]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="business_type">Business Type</Label>
                <Select
                  value={formData.business_type}
                  onValueChange={(value: BusinessType | '') =>
                    setFormData({ ...formData, business_type: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(BUSINESS_TYPE_LABELS) as BusinessType[]).map((type) => (
                      <SelectItem key={type} value={type}>
                        {BUSINESS_TYPE_LABELS[type]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Contact Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="(555) 123-4567"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="website_url">Website</Label>
                <Input
                  id="website_url"
                  type="url"
                  value={formData.website_url}
                  onChange={(e) => setFormData({ ...formData, website_url: e.target.value })}
                  placeholder="https://example.com"
                />
              </div>
            </div>

            {/* Location */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="city">City</Label>
                <Input
                  id="city"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  placeholder="City"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="state">State</Label>
                <Select
                  value={formData.state}
                  onValueChange={(value) => setFormData({ ...formData, state: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="State" />
                  </SelectTrigger>
                  <SelectContent>
                    {US_STATES.map((state) => (
                      <SelectItem key={state} value={state}>
                        {state}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="country">Country</Label>
                <Input
                  id="country"
                  value={formData.country}
                  onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                  placeholder="Country"
                />
              </div>
            </div>

            {/* Business Size */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="employee_count">Employees</Label>
                <Input
                  id="employee_count"
                  type="number"
                  min="1"
                  value={formData.employee_count}
                  onChange={(e) => setFormData({ ...formData, employee_count: e.target.value })}
                  placeholder="Number of employees"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="annual_revenue_range">Annual Revenue</Label>
                <Select
                  value={formData.annual_revenue_range}
                  onValueChange={(value: RevenueRange | '') =>
                    setFormData({ ...formData, annual_revenue_range: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select range" />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(REVENUE_RANGE_LABELS) as RevenueRange[]).map((range) => (
                      <SelectItem key={range} value={range}>
                        {REVENUE_RANGE_LABELS[range]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Social Media */}
            <Collapsible open={isSocialOpen} onOpenChange={setIsSocialOpen}>
              <CollapsibleTrigger asChild>
                <Button variant="outline" className="w-full justify-between">
                  Social Media & Online Presence
                  <span>{isSocialOpen ? '−' : '+'}</span>
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-4 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="google_business_url">Google Business Profile</Label>
                  <Input
                    id="google_business_url"
                    type="url"
                    value={formData.google_business_url}
                    onChange={(e) => setFormData({ ...formData, google_business_url: e.target.value })}
                    placeholder="https://business.google.com/..."
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="facebook_url">Facebook Page</Label>
                  <Input
                    id="facebook_url"
                    type="url"
                    value={formData.facebook_url}
                    onChange={(e) => setFormData({ ...formData, facebook_url: e.target.value })}
                    placeholder="https://facebook.com/..."
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="instagram_handle">Instagram Handle</Label>
                  <Input
                    id="instagram_handle"
                    value={formData.instagram_handle}
                    onChange={(e) => setFormData({ ...formData, instagram_handle: e.target.value })}
                    placeholder="@username"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="linkedin_url">LinkedIn</Label>
                  <Input
                    id="linkedin_url"
                    type="url"
                    value={formData.linkedin_url}
                    onChange={(e) => setFormData({ ...formData, linkedin_url: e.target.value })}
                    placeholder="https://linkedin.com/company/..."
                  />
                </div>
              </CollapsibleContent>
            </Collapsible>

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Add any additional notes about this client..."
                rows={4}
              />
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Quick Info Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {company.phone && (
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <a href={`tel:${company.phone}`} className="hover:underline">
                    {company.phone}
                  </a>
                </div>
              )}

              {company.website_url && (
                <div className="flex items-center gap-2 text-sm">
                  <Globe className="h-4 w-4 text-muted-foreground" />
                  <a
                    href={company.website_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:underline flex items-center gap-1"
                  >
                    Website
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              )}

              {(company.city || company.state) && (
                <div className="flex items-center gap-2 text-sm">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span>
                    {[company.city, company.state].filter(Boolean).join(', ')}
                  </span>
                </div>
              )}

              {company.business_type && (
                <div className="flex items-center gap-2 text-sm">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  <span>{BUSINESS_TYPE_LABELS[company.business_type]}</span>
                </div>
              )}
            </div>

            {/* Social Links */}
            {(company.google_business_url || company.facebook_url || company.instagram_handle || company.linkedin_url) && (
              <div className="flex items-center gap-3">
                {company.google_business_url && (
                  <a
                    href={company.google_business_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-muted-foreground hover:text-primary"
                    title="Google Business Profile"
                  >
                    <Globe className="h-5 w-5" />
                  </a>
                )}
                {company.facebook_url && (
                  <a
                    href={company.facebook_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-muted-foreground hover:text-primary"
                    title="Facebook"
                  >
                    <Facebook className="h-5 w-5" />
                  </a>
                )}
                {company.instagram_handle && (
                  <a
                    href={`https://instagram.com/${company.instagram_handle.replace('@', '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-muted-foreground hover:text-primary"
                    title="Instagram"
                  >
                    <Instagram className="h-5 w-5" />
                  </a>
                )}
                {company.linkedin_url && (
                  <a
                    href={company.linkedin_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-muted-foreground hover:text-primary"
                    title="LinkedIn"
                  >
                    <Linkedin className="h-5 w-5" />
                  </a>
                )}
              </div>
            )}

            {/* Business Details */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
              {company.employee_count && (
                <div>
                  <span className="text-muted-foreground">Employees:</span>{' '}
                  <span className="font-medium">{company.employee_count}</span>
                </div>
              )}

              {company.annual_revenue_range && (
                <div>
                  <span className="text-muted-foreground">Revenue:</span>{' '}
                  <span className="font-medium">
                    {REVENUE_RANGE_LABELS[company.annual_revenue_range]}
                  </span>
                </div>
              )}

              <div>
                <span className="text-muted-foreground">Active Limit:</span>{' '}
                <span className="font-medium">{company.max_active_limit} request(s)</span>
              </div>
            </div>

            {/* Notes */}
            {company.notes && (
              <div className="mt-4 p-4 bg-muted rounded-lg">
                <h4 className="text-sm font-medium mb-2">Notes</h4>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {company.notes}
                </p>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
