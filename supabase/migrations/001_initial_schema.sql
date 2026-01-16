-- AgencyOS Initial Schema
-- This migration creates all tables, enums, functions, and RLS policies

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- ENUMS
-- ============================================

CREATE TYPE company_status AS ENUM ('active', 'paused', 'churned');
CREATE TYPE plan_tier AS ENUM ('standard', 'pro');
CREATE TYPE request_status AS ENUM ('queue', 'active', 'review', 'done');
CREATE TYPE priority AS ENUM ('low', 'normal', 'high');
CREATE TYPE user_role AS ENUM ('admin', 'client');

-- ============================================
-- TABLES
-- ============================================

-- Companies table
CREATE TABLE companies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  status company_status NOT NULL DEFAULT 'active',
  plan_tier plan_tier NOT NULL DEFAULT 'standard',
  max_active_limit INTEGER NOT NULL DEFAULT 1,
  woo_customer_id TEXT UNIQUE,
  stripe_customer_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Profiles table (extends auth.users)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
  role user_role NOT NULL DEFAULT 'client',
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Requests table
CREATE TABLE requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  status request_status NOT NULL DEFAULT 'queue',
  priority priority NOT NULL DEFAULT 'normal',
  assets_link TEXT,
  video_brief TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Comments table
CREATE TABLE comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  request_id UUID NOT NULL REFERENCES requests(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  is_internal BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX idx_profiles_company_id ON profiles(company_id);
CREATE INDEX idx_requests_company_id ON requests(company_id);
CREATE INDEX idx_requests_status ON requests(status);
CREATE INDEX idx_requests_company_status ON requests(company_id, status);
CREATE INDEX idx_comments_request_id ON comments(request_id);
CREATE INDEX idx_companies_woo_customer_id ON companies(woo_customer_id);

-- ============================================
-- FUNCTIONS
-- ============================================

-- Function to count active requests for a company
CREATE OR REPLACE FUNCTION get_active_request_count(company_uuid UUID)
RETURNS INTEGER AS $$
  SELECT COUNT(*)::INTEGER
  FROM requests
  WHERE company_id = company_uuid AND status = 'active';
$$ LANGUAGE SQL STABLE;

-- Function to check if company can add more active requests
CREATE OR REPLACE FUNCTION can_activate_request(company_uuid UUID)
RETURNS BOOLEAN AS $$
DECLARE
  current_count INTEGER;
  max_limit INTEGER;
BEGIN
  SELECT get_active_request_count(company_uuid) INTO current_count;
  SELECT max_active_limit FROM companies WHERE id = company_uuid INTO max_limit;
  RETURN current_count < max_limit;
END;
$$ LANGUAGE plpgsql STABLE;

-- Trigger function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers
CREATE TRIGGER companies_updated_at
  BEFORE UPDATE ON companies
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER requests_updated_at
  BEFORE UPDATE ON requests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Function to handle new user creation
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile on user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

-- Enable RLS on all tables
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;

-- Helper function to check if user is admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

-- Helper function to get user's company_id
CREATE OR REPLACE FUNCTION get_user_company_id()
RETURNS UUID AS $$
  SELECT company_id FROM profiles WHERE id = auth.uid();
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

-- ============================================
-- COMPANIES RLS POLICIES
-- ============================================

-- Admins can see all companies
CREATE POLICY "Admins can view all companies"
  ON companies FOR SELECT
  TO authenticated
  USING (is_admin());

-- Clients can see their own company
CREATE POLICY "Clients can view own company"
  ON companies FOR SELECT
  TO authenticated
  USING (id = get_user_company_id());

-- Only admins can insert companies
CREATE POLICY "Admins can insert companies"
  ON companies FOR INSERT
  TO authenticated
  WITH CHECK (is_admin());

-- Only admins can update companies
CREATE POLICY "Admins can update companies"
  ON companies FOR UPDATE
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- ============================================
-- PROFILES RLS POLICIES
-- ============================================

-- Users can view their own profile
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (id = auth.uid());

-- Admins can view all profiles
CREATE POLICY "Admins can view all profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (is_admin());

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- Admins can update any profile
CREATE POLICY "Admins can update any profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- ============================================
-- REQUESTS RLS POLICIES
-- ============================================

-- Clients can view requests for their company
CREATE POLICY "Clients can view company requests"
  ON requests FOR SELECT
  TO authenticated
  USING (company_id = get_user_company_id());

-- Admins can view all requests
CREATE POLICY "Admins can view all requests"
  ON requests FOR SELECT
  TO authenticated
  USING (is_admin());

-- Clients can insert requests for their company (if company is active)
CREATE POLICY "Clients can insert requests"
  ON requests FOR INSERT
  TO authenticated
  WITH CHECK (
    company_id = get_user_company_id()
    AND EXISTS (
      SELECT 1 FROM companies
      WHERE id = company_id AND status = 'active'
    )
  );

-- Admins can insert requests for any company
CREATE POLICY "Admins can insert requests"
  ON requests FOR INSERT
  TO authenticated
  WITH CHECK (is_admin());

-- Clients can update their company's requests (limited fields)
CREATE POLICY "Clients can update company requests"
  ON requests FOR UPDATE
  TO authenticated
  USING (company_id = get_user_company_id())
  WITH CHECK (company_id = get_user_company_id());

-- Admins can update any request
CREATE POLICY "Admins can update any request"
  ON requests FOR UPDATE
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- Clients can only delete requests in queue status
CREATE POLICY "Clients can delete queue requests"
  ON requests FOR DELETE
  TO authenticated
  USING (
    company_id = get_user_company_id()
    AND status = 'queue'
  );

-- Admins can delete any request
CREATE POLICY "Admins can delete any request"
  ON requests FOR DELETE
  TO authenticated
  USING (is_admin());

-- ============================================
-- COMMENTS RLS POLICIES
-- ============================================

-- Clients can view non-internal comments on their company's requests
CREATE POLICY "Clients can view public comments"
  ON comments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM requests r
      WHERE r.id = request_id
      AND r.company_id = get_user_company_id()
    )
    AND (is_internal = false OR is_admin())
  );

-- Admins can view all comments
CREATE POLICY "Admins can view all comments"
  ON comments FOR SELECT
  TO authenticated
  USING (is_admin());

-- Clients can insert comments on their company's requests
CREATE POLICY "Clients can insert comments"
  ON comments FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM requests r
      JOIN companies c ON r.company_id = c.id
      WHERE r.id = request_id
      AND r.company_id = get_user_company_id()
      AND c.status = 'active'
    )
    AND is_internal = false -- Clients cannot create internal comments
  );

-- Admins can insert comments on any request
CREATE POLICY "Admins can insert comments"
  ON comments FOR INSERT
  TO authenticated
  WITH CHECK (is_admin() AND user_id = auth.uid());

-- ============================================
-- SERVICE ROLE BYPASS
-- ============================================
-- Note: The service role key bypasses RLS by default in Supabase
-- This is needed for webhook handlers that provision users

-- ============================================
-- SEED DATA (Optional - for development)
-- ============================================

-- Uncomment to add test data
-- INSERT INTO companies (name, status, plan_tier, max_active_limit)
-- VALUES ('Demo Agency', 'active', 'pro', 2);
