-- =============================================================================
-- Migration 003: CRM Enhancements for Marketing Agency
-- =============================================================================
-- This migration adds:
-- 1. Extended company fields (industry, location, website, socials, etc.)
-- 2. Contacts table for multi-contact support per company
-- 3. Client services table for tracking purchased services/subscriptions
-- =============================================================================

-- =============================================================================
-- PART 1: Extend Companies Table with Business Intelligence Fields
-- =============================================================================

-- Industry dropdown values
CREATE TYPE industry_type AS ENUM (
  'restaurant',
  'dental',
  'medical',
  'legal',
  'real_estate',
  'home_services',
  'automotive',
  'retail',
  'fitness',
  'beauty_spa',
  'professional_services',
  'construction',
  'financial_services',
  'technology',
  'education',
  'nonprofit',
  'other'
);

-- Business type
CREATE TYPE business_type AS ENUM (
  'b2b',
  'b2c',
  'both'
);

-- Revenue range for business size indicator
CREATE TYPE revenue_range AS ENUM (
  'under_100k',
  '100k_500k',
  '500k_1m',
  '1m_5m',
  '5m_10m',
  'over_10m'
);

-- Add new columns to companies table
ALTER TABLE companies ADD COLUMN IF NOT EXISTS industry industry_type;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS business_type business_type;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS state TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS country TEXT DEFAULT 'US';
ALTER TABLE companies ADD COLUMN IF NOT EXISTS website_url TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS google_business_url TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS facebook_url TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS instagram_handle TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS linkedin_url TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS employee_count INTEGER;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS annual_revenue_range revenue_range;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS logo_url TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS onboarding_completed_at TIMESTAMPTZ;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS primary_contact_id UUID;

-- =============================================================================
-- PART 2: Contacts Table for Multi-Contact Support
-- =============================================================================

CREATE TABLE IF NOT EXISTS contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  role TEXT, -- e.g., "Owner", "Marketing Manager", "Office Manager"
  is_primary BOOLEAN DEFAULT false,
  is_billing_contact BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_contacts_company_id ON contacts(company_id);
CREATE INDEX IF NOT EXISTS idx_contacts_email ON contacts(email) WHERE email IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_contacts_is_primary ON contacts(company_id, is_primary) WHERE is_primary = true;

-- Update trigger for contacts
CREATE TRIGGER update_contacts_updated_at
  BEFORE UPDATE ON contacts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Add foreign key for primary_contact_id in companies
ALTER TABLE companies
  ADD CONSTRAINT fk_companies_primary_contact
  FOREIGN KEY (primary_contact_id)
  REFERENCES contacts(id)
  ON DELETE SET NULL;

-- =============================================================================
-- PART 3: Client Services Table for Service/Subscription Tracking
-- =============================================================================

-- Service type enum
CREATE TYPE service_type AS ENUM (
  'subscription',
  'one_time'
);

-- Service status enum
CREATE TYPE service_status AS ENUM (
  'active',
  'paused',
  'cancelled',
  'completed',
  'pending'
);

-- Billing cycle enum
CREATE TYPE billing_cycle AS ENUM (
  'monthly',
  'quarterly',
  'yearly',
  'one_time'
);

CREATE TABLE IF NOT EXISTS client_services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  service_name TEXT NOT NULL,
  service_type service_type NOT NULL,
  status service_status DEFAULT 'active',
  price DECIMAL(10,2),
  billing_cycle billing_cycle,
  start_date DATE,
  end_date DATE,
  renewal_date DATE,
  woo_product_id TEXT,
  woo_subscription_id TEXT,
  woo_order_id TEXT,
  notes TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for client_services
CREATE INDEX IF NOT EXISTS idx_client_services_company_id ON client_services(company_id);
CREATE INDEX IF NOT EXISTS idx_client_services_status ON client_services(status);
CREATE INDEX IF NOT EXISTS idx_client_services_woo_subscription ON client_services(woo_subscription_id) WHERE woo_subscription_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_client_services_woo_product ON client_services(woo_product_id) WHERE woo_product_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_client_services_renewal_date ON client_services(renewal_date) WHERE renewal_date IS NOT NULL;

-- Update trigger for client_services
CREATE TRIGGER update_client_services_updated_at
  BEFORE UPDATE ON client_services
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- PART 4: Row Level Security Policies
-- =============================================================================

-- Enable RLS on new tables
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_services ENABLE ROW LEVEL SECURITY;

-- Contacts policies
-- Admins can see all contacts
CREATE POLICY "Admins can view all contacts"
  ON contacts FOR SELECT
  TO authenticated
  USING (is_admin());

-- Clients can see contacts from their own company
CREATE POLICY "Clients can view own company contacts"
  ON contacts FOR SELECT
  TO authenticated
  USING (company_id = get_user_company_id());

-- Only admins can insert contacts
CREATE POLICY "Admins can insert contacts"
  ON contacts FOR INSERT
  TO authenticated
  WITH CHECK (is_admin());

-- Only admins can update contacts
CREATE POLICY "Admins can update contacts"
  ON contacts FOR UPDATE
  TO authenticated
  USING (is_admin());

-- Only admins can delete contacts
CREATE POLICY "Admins can delete contacts"
  ON contacts FOR DELETE
  TO authenticated
  USING (is_admin());

-- Client Services policies
-- Admins can see all client services
CREATE POLICY "Admins can view all client services"
  ON client_services FOR SELECT
  TO authenticated
  USING (is_admin());

-- Clients can see services from their own company
CREATE POLICY "Clients can view own company services"
  ON client_services FOR SELECT
  TO authenticated
  USING (company_id = get_user_company_id());

-- Only admins can insert client services
CREATE POLICY "Admins can insert client services"
  ON client_services FOR INSERT
  TO authenticated
  WITH CHECK (is_admin());

-- Only admins can update client services
CREATE POLICY "Admins can update client services"
  ON client_services FOR UPDATE
  TO authenticated
  USING (is_admin());

-- Only admins can delete client services
CREATE POLICY "Admins can delete client services"
  ON client_services FOR DELETE
  TO authenticated
  USING (is_admin());

-- =============================================================================
-- PART 5: Helper Functions
-- =============================================================================

-- Function to get company MRR (Monthly Recurring Revenue)
CREATE OR REPLACE FUNCTION get_company_mrr(company_uuid UUID)
RETURNS DECIMAL AS $$
DECLARE
  total_mrr DECIMAL;
BEGIN
  SELECT COALESCE(SUM(
    CASE
      WHEN billing_cycle = 'monthly' THEN price
      WHEN billing_cycle = 'quarterly' THEN price / 3
      WHEN billing_cycle = 'yearly' THEN price / 12
      ELSE 0
    END
  ), 0) INTO total_mrr
  FROM client_services
  WHERE company_id = company_uuid
    AND status = 'active'
    AND service_type = 'subscription';

  RETURN total_mrr;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get total MRR across all active companies
CREATE OR REPLACE FUNCTION get_total_mrr()
RETURNS DECIMAL AS $$
DECLARE
  total DECIMAL;
BEGIN
  SELECT COALESCE(SUM(
    CASE
      WHEN billing_cycle = 'monthly' THEN price
      WHEN billing_cycle = 'quarterly' THEN price / 3
      WHEN billing_cycle = 'yearly' THEN price / 12
      ELSE 0
    END
  ), 0) INTO total
  FROM client_services cs
  JOIN companies c ON cs.company_id = c.id
  WHERE cs.status = 'active'
    AND cs.service_type = 'subscription'
    AND c.status = 'active';

  RETURN total;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to ensure only one primary contact per company
CREATE OR REPLACE FUNCTION ensure_single_primary_contact()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_primary = true THEN
    UPDATE contacts
    SET is_primary = false
    WHERE company_id = NEW.company_id
      AND id != NEW.id
      AND is_primary = true;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER ensure_single_primary_contact_trigger
  AFTER INSERT OR UPDATE OF is_primary ON contacts
  FOR EACH ROW
  WHEN (NEW.is_primary = true)
  EXECUTE FUNCTION ensure_single_primary_contact();

-- Function to auto-update company primary_contact_id when primary contact changes
CREATE OR REPLACE FUNCTION sync_primary_contact_to_company()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_primary = true THEN
    UPDATE companies
    SET primary_contact_id = NEW.id
    WHERE id = NEW.company_id;
  ELSIF OLD.is_primary = true AND NEW.is_primary = false THEN
    -- Find another primary contact or set to null
    UPDATE companies
    SET primary_contact_id = (
      SELECT id FROM contacts
      WHERE company_id = NEW.company_id
        AND is_primary = true
        AND id != NEW.id
      LIMIT 1
    )
    WHERE id = NEW.company_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER sync_primary_contact_trigger
  AFTER INSERT OR UPDATE OF is_primary ON contacts
  FOR EACH ROW
  EXECUTE FUNCTION sync_primary_contact_to_company();

-- =============================================================================
-- PART 6: Views for Reporting
-- =============================================================================

-- Company overview with aggregated data
CREATE OR REPLACE VIEW company_overview AS
SELECT
  c.id,
  c.name,
  c.status,
  c.plan_tier,
  c.industry,
  c.business_type,
  c.city,
  c.state,
  c.country,
  c.phone,
  c.website_url,
  c.created_at,
  c.onboarding_completed_at,
  -- Contact info
  (SELECT name FROM contacts WHERE id = c.primary_contact_id) AS primary_contact_name,
  (SELECT email FROM contacts WHERE id = c.primary_contact_id) AS primary_contact_email,
  (SELECT phone FROM contacts WHERE id = c.primary_contact_id) AS primary_contact_phone,
  -- Service metrics
  (SELECT COUNT(*) FROM client_services WHERE company_id = c.id AND status = 'active') AS active_services_count,
  get_company_mrr(c.id) AS mrr,
  -- Request metrics
  (SELECT COUNT(*) FROM requests WHERE company_id = c.id) AS total_requests,
  (SELECT COUNT(*) FROM requests WHERE company_id = c.id AND status = 'active') AS active_requests
FROM companies c;

-- Services summary by status
CREATE OR REPLACE VIEW services_summary AS
SELECT
  service_name,
  service_type,
  status,
  COUNT(*) AS count,
  SUM(price) AS total_revenue,
  SUM(CASE WHEN billing_cycle = 'monthly' THEN price ELSE 0 END) AS monthly_revenue
FROM client_services
GROUP BY service_name, service_type, status;

-- =============================================================================
-- GRANTS
-- =============================================================================

-- Grant access to views
GRANT SELECT ON company_overview TO authenticated;
GRANT SELECT ON services_summary TO authenticated;

-- Grant execute on functions
GRANT EXECUTE ON FUNCTION get_company_mrr(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_total_mrr() TO authenticated;
