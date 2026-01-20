-- Migration: Invitations and CRM Improvements
-- This migration adds the invitations table and saved filters table

-- ============================================
-- INVITATIONS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'client')),
  company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
  token TEXT NOT NULL UNIQUE,
  invited_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired', 'cancelled')),
  expires_at TIMESTAMPTZ NOT NULL,
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for fast token lookups
CREATE INDEX IF NOT EXISTS idx_invitations_token ON invitations(token);
-- Index for email lookups
CREATE INDEX IF NOT EXISTS idx_invitations_email ON invitations(email);
-- Index for status filtering
CREATE INDEX IF NOT EXISTS idx_invitations_status ON invitations(status);

-- Enable RLS
ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;

-- Only admins can view invitations
CREATE POLICY "Admins can view all invitations" ON invitations
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Only admins can create invitations
CREATE POLICY "Admins can create invitations" ON invitations
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Only admins can update invitations
CREATE POLICY "Admins can update invitations" ON invitations
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Only admins can delete invitations
CREATE POLICY "Admins can delete invitations" ON invitations
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- ============================================
-- SAVED FILTERS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS saved_filters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  filter_type TEXT NOT NULL, -- 'requests', 'companies', 'audit_logs', etc.
  filters JSONB NOT NULL DEFAULT '{}',
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for user lookups
CREATE INDEX IF NOT EXISTS idx_saved_filters_user ON saved_filters(user_id);
-- Index for filter type
CREATE INDEX IF NOT EXISTS idx_saved_filters_type ON saved_filters(filter_type);

-- Enable RLS
ALTER TABLE saved_filters ENABLE ROW LEVEL SECURITY;

-- Users can only see their own filters
CREATE POLICY "Users can view own filters" ON saved_filters
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Users can create their own filters
CREATE POLICY "Users can create own filters" ON saved_filters
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Users can update their own filters
CREATE POLICY "Users can update own filters" ON saved_filters
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

-- Users can delete their own filters
CREATE POLICY "Users can delete own filters" ON saved_filters
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- ============================================
-- ADD MENTIONS TO COMMENTS
-- ============================================

-- Add mentions column to comments table
ALTER TABLE comments
  ADD COLUMN IF NOT EXISTS mentions UUID[] DEFAULT '{}';

-- Index for finding comments that mention a user
CREATE INDEX IF NOT EXISTS idx_comments_mentions ON comments USING GIN(mentions);

-- ============================================
-- ADD INDEXES FOR PERFORMANCE
-- ============================================

-- Index on request_assignments for workload queries
CREATE INDEX IF NOT EXISTS idx_request_assignments_assigned_to ON request_assignments(assigned_to);

-- Index on files for user file history
CREATE INDEX IF NOT EXISTS idx_files_uploaded_by ON files(uploaded_by);

-- Index on activities for request timeline
CREATE INDEX IF NOT EXISTS idx_activities_request_created ON activities(request_id, created_at DESC);

-- Index on notifications for unread count
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications(user_id, is_read) WHERE is_read = false;

-- ============================================
-- UPDATE TRIGGERS
-- ============================================

-- Updated_at trigger for invitations
CREATE TRIGGER update_invitations_updated_at
  BEFORE UPDATE ON invitations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Updated_at trigger for saved_filters
CREATE TRIGGER update_saved_filters_updated_at
  BEFORE UPDATE ON saved_filters
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- FUNCTION: Create notification for mentions
-- ============================================

CREATE OR REPLACE FUNCTION notify_mentioned_users()
RETURNS TRIGGER AS $$
DECLARE
  mentioned_user_id UUID;
  comment_user_name TEXT;
  request_title TEXT;
BEGIN
  -- Get the commenter's name
  SELECT COALESCE(full_name, email) INTO comment_user_name
  FROM profiles WHERE id = NEW.user_id;

  -- Get the request title
  SELECT title INTO request_title
  FROM requests WHERE id = NEW.request_id;

  -- Create notifications for each mentioned user
  FOREACH mentioned_user_id IN ARRAY NEW.mentions
  LOOP
    -- Don't notify the user who made the comment
    IF mentioned_user_id != NEW.user_id THEN
      INSERT INTO notifications (user_id, type, title, message, related_request_id)
      VALUES (
        mentioned_user_id,
        'mention',
        'You were mentioned in a comment',
        comment_user_name || ' mentioned you in "' || request_title || '"',
        NEW.request_id
      );
    END IF;
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to notify mentioned users
DROP TRIGGER IF EXISTS trigger_notify_mentions ON comments;
CREATE TRIGGER trigger_notify_mentions
  AFTER INSERT ON comments
  FOR EACH ROW
  WHEN (array_length(NEW.mentions, 1) > 0)
  EXECUTE FUNCTION notify_mentioned_users();

-- ============================================
-- GRANT PERMISSIONS
-- ============================================

GRANT ALL ON invitations TO authenticated;
GRANT ALL ON saved_filters TO authenticated;
