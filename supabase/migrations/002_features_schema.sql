-- AgencyOS Feature Enhancement Migration
-- Adds: Notifications, Teams, Assignments, Files, Audit Logs, Templates, Workflows

-- ============================================
-- NEW ENUMS
-- ============================================

CREATE TYPE notification_type AS ENUM ('comment', 'status_change', 'assignment', 'mention', 'due_date', 'sla_breach');
CREATE TYPE sla_status AS ENUM ('on_track', 'at_risk', 'breached');
CREATE TYPE assignment_status AS ENUM ('assigned', 'in_progress', 'completed');
CREATE TYPE file_type AS ENUM ('image', 'video', 'document', 'archive', 'other');
CREATE TYPE audit_action AS ENUM ('create', 'update', 'delete', 'status_change', 'assign', 'comment');
CREATE TYPE trigger_type AS ENUM ('status_change', 'due_date_approaching', 'comment_added', 'assignment_change', 'sla_breach');
CREATE TYPE action_type AS ENUM ('notify', 'assign', 'change_status', 'change_priority', 'send_email', 'webhook');

-- ============================================
-- ALTER EXISTING TABLES
-- ============================================

-- Add due date and SLA fields to requests
ALTER TABLE requests ADD COLUMN IF NOT EXISTS due_date TIMESTAMPTZ;
ALTER TABLE requests ADD COLUMN IF NOT EXISTS sla_hours INTEGER;
ALTER TABLE requests ADD COLUMN IF NOT EXISTS sla_status sla_status DEFAULT 'on_track';
ALTER TABLE requests ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;
ALTER TABLE requests ADD COLUMN IF NOT EXISTS assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Add indexes for new columns
CREATE INDEX IF NOT EXISTS idx_requests_due_date ON requests(due_date);
CREATE INDEX IF NOT EXISTS idx_requests_sla_status ON requests(sla_status);
CREATE INDEX IF NOT EXISTS idx_requests_assigned_to ON requests(assigned_to);

-- ============================================
-- NOTIFICATIONS
-- ============================================

CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type notification_type NOT NULL,
  title TEXT NOT NULL,
  message TEXT,
  link TEXT,
  related_request_id UUID REFERENCES requests(id) ON DELETE CASCADE,
  related_company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  is_read BOOLEAN NOT NULL DEFAULT false,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_user_unread ON notifications(user_id, is_read) WHERE is_read = false;
CREATE INDEX idx_notifications_created_at ON notifications(created_at DESC);

CREATE TABLE IF NOT EXISTS notification_preferences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  email_on_comment BOOLEAN DEFAULT true,
  email_on_status_change BOOLEAN DEFAULT true,
  email_on_assignment BOOLEAN DEFAULT true,
  email_on_mention BOOLEAN DEFAULT true,
  email_on_due_date BOOLEAN DEFAULT true,
  email_digest_enabled BOOLEAN DEFAULT false,
  email_digest_frequency TEXT DEFAULT 'daily' CHECK (email_digest_frequency IN ('daily', 'weekly')),
  push_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- TEAM ASSIGNMENTS
-- ============================================

CREATE TABLE IF NOT EXISTS request_assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  request_id UUID NOT NULL REFERENCES requests(id) ON DELETE CASCADE,
  assigned_to UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  assigned_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  status assignment_status NOT NULL DEFAULT 'assigned',
  notes TEXT,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  UNIQUE(request_id, assigned_to)
);

CREATE INDEX idx_assignments_request_id ON request_assignments(request_id);
CREATE INDEX idx_assignments_assigned_to ON request_assignments(assigned_to);
CREATE INDEX idx_assignments_status ON request_assignments(status);

-- ============================================
-- FILE UPLOADS
-- ============================================

CREATE TABLE IF NOT EXISTS files (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  request_id UUID NOT NULL REFERENCES requests(id) ON DELETE CASCADE,
  uploaded_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  file_name TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  file_type file_type NOT NULL DEFAULT 'other',
  mime_type TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  storage_url TEXT NOT NULL,
  thumbnail_url TEXT,
  is_approved BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_files_request_id ON files(request_id);
CREATE INDEX idx_files_uploaded_by ON files(uploaded_by);

-- ============================================
-- AUDIT LOGS
-- ============================================

CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action audit_action NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  old_values JSONB,
  new_values JSONB,
  change_summary TEXT,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_company_id ON audit_logs(company_id);
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);

-- ============================================
-- REQUEST TEMPLATES
-- ============================================

CREATE TABLE IF NOT EXISTS request_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  title_template TEXT NOT NULL,
  description_template TEXT,
  default_priority priority NOT NULL DEFAULT 'normal',
  default_sla_hours INTEGER,
  category TEXT,
  is_active BOOLEAN DEFAULT true,
  is_global BOOLEAN DEFAULT false,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_templates_company_id ON request_templates(company_id);
CREATE INDEX idx_templates_is_active ON request_templates(is_active);
CREATE INDEX idx_templates_category ON request_templates(category);

-- ============================================
-- WORKFLOW AUTOMATION
-- ============================================

CREATE TABLE IF NOT EXISTS workflow_rules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  trigger_type trigger_type NOT NULL,
  trigger_conditions JSONB NOT NULL DEFAULT '{}',
  action_type action_type NOT NULL,
  action_config JSONB NOT NULL DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  execution_count INTEGER DEFAULT 0,
  last_executed_at TIMESTAMPTZ,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_workflow_rules_company_id ON workflow_rules(company_id);
CREATE INDEX idx_workflow_rules_is_active ON workflow_rules(is_active);
CREATE INDEX idx_workflow_rules_trigger_type ON workflow_rules(trigger_type);

CREATE TABLE IF NOT EXISTS workflow_executions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workflow_rule_id UUID NOT NULL REFERENCES workflow_rules(id) ON DELETE CASCADE,
  request_id UUID REFERENCES requests(id) ON DELETE SET NULL,
  status TEXT NOT NULL CHECK (status IN ('success', 'failed', 'skipped')),
  error_message TEXT,
  execution_data JSONB,
  executed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_workflow_executions_rule_id ON workflow_executions(workflow_rule_id);
CREATE INDEX idx_workflow_executions_request_id ON workflow_executions(request_id);
CREATE INDEX idx_workflow_executions_executed_at ON workflow_executions(executed_at DESC);

-- ============================================
-- WEBHOOKS
-- ============================================

CREATE TABLE IF NOT EXISTS webhooks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  secret TEXT NOT NULL,
  events TEXT[] NOT NULL DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  last_triggered_at TIMESTAMPTZ,
  failure_count INTEGER DEFAULT 0,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_webhooks_company_id ON webhooks(company_id);
CREATE INDEX idx_webhooks_is_active ON webhooks(is_active);

CREATE TABLE IF NOT EXISTS webhook_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  webhook_id UUID NOT NULL REFERENCES webhooks(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL,
  response_status INTEGER,
  response_body TEXT,
  error_message TEXT,
  executed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_webhook_logs_webhook_id ON webhook_logs(webhook_id);
CREATE INDEX idx_webhook_logs_executed_at ON webhook_logs(executed_at DESC);

-- ============================================
-- ACTIVITIES (for timeline)
-- ============================================

CREATE TABLE IF NOT EXISTS activities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  request_id UUID NOT NULL REFERENCES requests(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  activity_type TEXT NOT NULL,
  description TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_activities_request_id ON activities(request_id);
CREATE INDEX idx_activities_created_at ON activities(created_at DESC);

-- ============================================
-- ROW LEVEL SECURITY POLICIES
-- ============================================

-- Enable RLS on new tables
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE request_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE files ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE request_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;

-- Notifications: Users can only see their own
CREATE POLICY "Users can view own notifications"
  ON notifications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "System can create notifications"
  ON notifications FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can update own notifications"
  ON notifications FOR UPDATE
  USING (auth.uid() = user_id);

-- Notification Preferences: Users can manage their own
CREATE POLICY "Users can manage own notification preferences"
  ON notification_preferences FOR ALL
  USING (auth.uid() = user_id);

-- Request Assignments: Based on request access
CREATE POLICY "Users can view assignments for accessible requests"
  ON request_assignments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM requests r
      JOIN profiles p ON p.id = auth.uid()
      WHERE r.id = request_assignments.request_id
      AND (p.role = 'admin' OR r.company_id = p.company_id)
    )
  );

CREATE POLICY "Admins can manage assignments"
  ON request_assignments FOR ALL
  USING (is_admin(auth.uid()));

-- Files: Based on request access
CREATE POLICY "Users can view files for accessible requests"
  ON files FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM requests r
      JOIN profiles p ON p.id = auth.uid()
      WHERE r.id = files.request_id
      AND (p.role = 'admin' OR r.company_id = p.company_id)
    )
  );

CREATE POLICY "Users can upload files to accessible requests"
  ON files FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM requests r
      JOIN profiles p ON p.id = auth.uid()
      WHERE r.id = files.request_id
      AND (p.role = 'admin' OR r.company_id = p.company_id)
    )
  );

CREATE POLICY "Admins can delete files"
  ON files FOR DELETE
  USING (is_admin(auth.uid()) OR uploaded_by = auth.uid());

-- Audit Logs: Admins only
CREATE POLICY "Admins can view audit logs"
  ON audit_logs FOR SELECT
  USING (is_admin(auth.uid()));

CREATE POLICY "System can create audit logs"
  ON audit_logs FOR INSERT
  WITH CHECK (true);

-- Request Templates: Company-scoped or global
CREATE POLICY "Users can view templates"
  ON request_templates FOR SELECT
  USING (
    is_global = true OR
    is_admin(auth.uid()) OR
    company_id = get_user_company_id(auth.uid())
  );

CREATE POLICY "Admins can manage templates"
  ON request_templates FOR ALL
  USING (is_admin(auth.uid()));

-- Workflow Rules: Admins only
CREATE POLICY "Admins can manage workflow rules"
  ON workflow_rules FOR ALL
  USING (is_admin(auth.uid()));

CREATE POLICY "Admins can view workflow executions"
  ON workflow_executions FOR SELECT
  USING (is_admin(auth.uid()));

-- Webhooks: Admins only
CREATE POLICY "Admins can manage webhooks"
  ON webhooks FOR ALL
  USING (is_admin(auth.uid()));

CREATE POLICY "Admins can view webhook logs"
  ON webhook_logs FOR SELECT
  USING (is_admin(auth.uid()));

-- Activities: Based on request access
CREATE POLICY "Users can view activities for accessible requests"
  ON activities FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM requests r
      JOIN profiles p ON p.id = auth.uid()
      WHERE r.id = activities.request_id
      AND (p.role = 'admin' OR r.company_id = p.company_id)
    )
  );

CREATE POLICY "System can create activities"
  ON activities FOR INSERT
  WITH CHECK (true);

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Function to create activity on request changes
CREATE OR REPLACE FUNCTION log_request_activity()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO activities (request_id, user_id, activity_type, description, metadata)
    VALUES (NEW.id, auth.uid(), 'created', 'Request created', jsonb_build_object('title', NEW.title));
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.status != NEW.status THEN
      INSERT INTO activities (request_id, user_id, activity_type, description, metadata)
      VALUES (NEW.id, auth.uid(), 'status_change',
        format('Status changed from %s to %s', OLD.status, NEW.status),
        jsonb_build_object('old_status', OLD.status, 'new_status', NEW.status));
    END IF;
    IF OLD.priority != NEW.priority THEN
      INSERT INTO activities (request_id, user_id, activity_type, description, metadata)
      VALUES (NEW.id, auth.uid(), 'priority_change',
        format('Priority changed from %s to %s', OLD.priority, NEW.priority),
        jsonb_build_object('old_priority', OLD.priority, 'new_priority', NEW.priority));
    END IF;
    IF OLD.due_date IS DISTINCT FROM NEW.due_date THEN
      INSERT INTO activities (request_id, user_id, activity_type, description, metadata)
      VALUES (NEW.id, auth.uid(), 'due_date_change',
        CASE WHEN NEW.due_date IS NULL THEN 'Due date removed' ELSE format('Due date set to %s', NEW.due_date) END,
        jsonb_build_object('old_due_date', OLD.due_date, 'new_due_date', NEW.due_date));
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for request activity logging
DROP TRIGGER IF EXISTS request_activity_trigger ON requests;
CREATE TRIGGER request_activity_trigger
  AFTER INSERT OR UPDATE ON requests
  FOR EACH ROW
  EXECUTE FUNCTION log_request_activity();

-- Function to create activity on comment
CREATE OR REPLACE FUNCTION log_comment_activity()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO activities (request_id, user_id, activity_type, description, metadata)
  VALUES (NEW.request_id, NEW.user_id, 'comment',
    CASE WHEN NEW.is_internal THEN 'Added internal note' ELSE 'Added comment' END,
    jsonb_build_object('comment_id', NEW.id, 'is_internal', NEW.is_internal));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for comment activity logging
DROP TRIGGER IF EXISTS comment_activity_trigger ON comments;
CREATE TRIGGER comment_activity_trigger
  AFTER INSERT ON comments
  FOR EACH ROW
  EXECUTE FUNCTION log_comment_activity();

-- Function to update SLA status based on due date
CREATE OR REPLACE FUNCTION update_sla_status()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.due_date IS NOT NULL AND NEW.status NOT IN ('done') THEN
    IF NEW.due_date < NOW() THEN
      NEW.sla_status := 'breached';
    ELSIF NEW.due_date < NOW() + INTERVAL '24 hours' THEN
      NEW.sla_status := 'at_risk';
    ELSE
      NEW.sla_status := 'on_track';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for SLA status updates
DROP TRIGGER IF EXISTS sla_status_trigger ON requests;
CREATE TRIGGER sla_status_trigger
  BEFORE INSERT OR UPDATE ON requests
  FOR EACH ROW
  EXECUTE FUNCTION update_sla_status();

-- Function to set completed_at when status changes to done
CREATE OR REPLACE FUNCTION set_completed_at()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'done' AND OLD.status != 'done' THEN
    NEW.completed_at := NOW();
  ELSIF NEW.status != 'done' AND OLD.status = 'done' THEN
    NEW.completed_at := NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for completed_at
DROP TRIGGER IF EXISTS completed_at_trigger ON requests;
CREATE TRIGGER completed_at_trigger
  BEFORE UPDATE ON requests
  FOR EACH ROW
  EXECUTE FUNCTION set_completed_at();
