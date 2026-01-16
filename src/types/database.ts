// ============================================
// BASE ENUMS
// ============================================

export type CompanyStatus = 'active' | 'paused' | 'churned';
export type PlanTier = 'standard' | 'pro';
export type RequestStatus = 'queue' | 'active' | 'review' | 'done';
export type Priority = 'low' | 'normal' | 'high';
export type UserRole = 'admin' | 'client';

// New enums for features
export type NotificationType = 'comment' | 'status_change' | 'assignment' | 'mention' | 'due_date' | 'sla_breach';
export type SLAStatus = 'on_track' | 'at_risk' | 'breached';
export type AssignmentStatus = 'assigned' | 'in_progress' | 'completed';
export type FileType = 'image' | 'video' | 'document' | 'archive' | 'other';
export type AuditAction = 'create' | 'update' | 'delete' | 'status_change' | 'assign' | 'comment';
export type TriggerType = 'status_change' | 'due_date_approaching' | 'comment_added' | 'assignment_change' | 'sla_breach';
export type ActionType = 'notify' | 'assign' | 'change_status' | 'change_priority' | 'send_email' | 'webhook';
export type ActivityType = 'created' | 'status_change' | 'priority_change' | 'due_date_change' | 'comment' | 'assignment' | 'file_upload';

// ============================================
// CORE ENTITIES
// ============================================

export interface Company {
  id: string;
  name: string;
  status: CompanyStatus;
  plan_tier: PlanTier;
  max_active_limit: number;
  woo_customer_id: string | null;
  stripe_customer_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  company_id: string | null;
  role: UserRole;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface Request {
  id: string;
  company_id: string;
  title: string;
  description: string | null;
  status: RequestStatus;
  priority: Priority;
  assets_link: string | null;
  video_brief: string | null;
  due_date: string | null;
  sla_hours: number | null;
  sla_status: SLAStatus | null;
  completed_at: string | null;
  assigned_to: string | null;
  created_at: string;
  updated_at: string;
  // Joined relations
  company?: Company;
  assignee?: Pick<Profile, 'id' | 'email' | 'full_name' | 'avatar_url'>;
  assignments?: RequestAssignment[];
  files?: FileUpload[];
}

export interface Comment {
  id: string;
  request_id: string;
  user_id: string;
  content: string;
  is_internal: boolean;
  created_at: string;
  // Joined relations
  user?: Pick<Profile, 'id' | 'email' | 'full_name' | 'avatar_url'>;
}

// ============================================
// NOTIFICATIONS
// ============================================

export interface Notification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  message: string | null;
  link: string | null;
  related_request_id: string | null;
  related_company_id: string | null;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
  // Joined relations
  request?: Pick<Request, 'id' | 'title'>;
}

export interface NotificationPreferences {
  id: string;
  user_id: string;
  email_on_comment: boolean;
  email_on_status_change: boolean;
  email_on_assignment: boolean;
  email_on_mention: boolean;
  email_on_due_date: boolean;
  email_digest_enabled: boolean;
  email_digest_frequency: 'daily' | 'weekly';
  push_enabled: boolean;
  created_at: string;
  updated_at: string;
}

// ============================================
// TEAM ASSIGNMENTS
// ============================================

export interface RequestAssignment {
  id: string;
  request_id: string;
  assigned_to: string;
  assigned_by: string | null;
  status: AssignmentStatus;
  notes: string | null;
  assigned_at: string;
  started_at: string | null;
  completed_at: string | null;
  // Joined relations
  assignee?: Pick<Profile, 'id' | 'email' | 'full_name' | 'avatar_url'>;
  assigner?: Pick<Profile, 'id' | 'email' | 'full_name' | 'avatar_url'>;
}

// ============================================
// FILE UPLOADS
// ============================================

export interface FileUpload {
  id: string;
  request_id: string;
  uploaded_by: string;
  file_name: string;
  file_size: number;
  file_type: FileType;
  mime_type: string;
  storage_path: string;
  storage_url: string;
  thumbnail_url: string | null;
  is_approved: boolean;
  created_at: string;
  // Joined relations
  uploader?: Pick<Profile, 'id' | 'email' | 'full_name' | 'avatar_url'>;
}

// ============================================
// AUDIT LOGS
// ============================================

export interface AuditLog {
  id: string;
  company_id: string | null;
  user_id: string | null;
  action: AuditAction;
  entity_type: string;
  entity_id: string | null;
  old_values: Record<string, unknown> | null;
  new_values: Record<string, unknown> | null;
  change_summary: string | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
  // Joined relations
  user?: Pick<Profile, 'id' | 'email' | 'full_name' | 'avatar_url'>;
}

// ============================================
// REQUEST TEMPLATES
// ============================================

export interface RequestTemplate {
  id: string;
  company_id: string | null;
  name: string;
  description: string | null;
  title_template: string;
  description_template: string | null;
  default_priority: Priority;
  default_sla_hours: number | null;
  category: string | null;
  is_active: boolean;
  is_global: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
}

// ============================================
// WORKFLOW AUTOMATION
// ============================================

export interface WorkflowRule {
  id: string;
  company_id: string | null;
  name: string;
  description: string | null;
  trigger_type: TriggerType;
  trigger_conditions: Record<string, unknown>;
  action_type: ActionType;
  action_config: Record<string, unknown>;
  is_active: boolean;
  execution_count: number;
  last_executed_at: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface WorkflowExecution {
  id: string;
  workflow_rule_id: string;
  request_id: string | null;
  status: 'success' | 'failed' | 'skipped';
  error_message: string | null;
  execution_data: Record<string, unknown> | null;
  executed_at: string;
  // Joined relations
  rule?: WorkflowRule;
}

// ============================================
// WEBHOOKS
// ============================================

export interface Webhook {
  id: string;
  company_id: string;
  name: string;
  url: string;
  secret: string;
  events: string[];
  is_active: boolean;
  last_triggered_at: string | null;
  failure_count: number;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface WebhookLog {
  id: string;
  webhook_id: string;
  event_type: string;
  payload: Record<string, unknown>;
  response_status: number | null;
  response_body: string | null;
  error_message: string | null;
  executed_at: string;
}

// ============================================
// ACTIVITIES (Timeline)
// ============================================

export interface Activity {
  id: string;
  request_id: string;
  user_id: string | null;
  activity_type: ActivityType;
  description: string;
  metadata: Record<string, unknown>;
  created_at: string;
  // Joined relations
  user?: Pick<Profile, 'id' | 'email' | 'full_name' | 'avatar_url'>;
}

// Supabase Database types
export interface Database {
  public: {
    Tables: {
      companies: {
        Row: Company;
        Insert: Omit<Company, 'id' | 'created_at' | 'updated_at'> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<Company, 'id' | 'created_at'>>;
      };
      profiles: {
        Row: Profile;
        Insert: Omit<Profile, 'created_at' | 'updated_at'> & {
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<Profile, 'id' | 'created_at'>>;
      };
      requests: {
        Row: Request;
        Insert: Omit<Request, 'id' | 'created_at' | 'updated_at' | 'company' | 'assignee' | 'assignments' | 'files'> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<Request, 'id' | 'created_at' | 'company' | 'assignee' | 'assignments' | 'files'>>;
      };
      comments: {
        Row: Comment;
        Insert: Omit<Comment, 'id' | 'created_at' | 'user'> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<Omit<Comment, 'id' | 'created_at' | 'user'>>;
      };
      notifications: {
        Row: Notification;
        Insert: Omit<Notification, 'id' | 'created_at' | 'request'> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<Omit<Notification, 'id' | 'created_at' | 'request'>>;
      };
      notification_preferences: {
        Row: NotificationPreferences;
        Insert: Omit<NotificationPreferences, 'id' | 'created_at' | 'updated_at'> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<NotificationPreferences, 'id' | 'created_at'>>;
      };
      request_assignments: {
        Row: RequestAssignment;
        Insert: Omit<RequestAssignment, 'id' | 'assigned_at' | 'assignee' | 'assigner'> & {
          id?: string;
          assigned_at?: string;
        };
        Update: Partial<Omit<RequestAssignment, 'id' | 'assigned_at' | 'assignee' | 'assigner'>>;
      };
      files: {
        Row: FileUpload;
        Insert: Omit<FileUpload, 'id' | 'created_at' | 'uploader'> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<Omit<FileUpload, 'id' | 'created_at' | 'uploader'>>;
      };
      audit_logs: {
        Row: AuditLog;
        Insert: Omit<AuditLog, 'id' | 'created_at' | 'user'> & {
          id?: string;
          created_at?: string;
        };
        Update: never;
      };
      request_templates: {
        Row: RequestTemplate;
        Insert: Omit<RequestTemplate, 'id' | 'created_at' | 'updated_at'> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<RequestTemplate, 'id' | 'created_at'>>;
      };
      workflow_rules: {
        Row: WorkflowRule;
        Insert: Omit<WorkflowRule, 'id' | 'created_at' | 'updated_at' | 'execution_count' | 'last_executed_at'> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<WorkflowRule, 'id' | 'created_at'>>;
      };
      workflow_executions: {
        Row: WorkflowExecution;
        Insert: Omit<WorkflowExecution, 'id' | 'executed_at' | 'rule'> & {
          id?: string;
          executed_at?: string;
        };
        Update: never;
      };
      webhooks: {
        Row: Webhook;
        Insert: Omit<Webhook, 'id' | 'created_at' | 'updated_at' | 'last_triggered_at' | 'failure_count'> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<Webhook, 'id' | 'created_at'>>;
      };
      webhook_logs: {
        Row: WebhookLog;
        Insert: Omit<WebhookLog, 'id' | 'executed_at'> & {
          id?: string;
          executed_at?: string;
        };
        Update: never;
      };
      activities: {
        Row: Activity;
        Insert: Omit<Activity, 'id' | 'created_at' | 'user'> & {
          id?: string;
          created_at?: string;
        };
        Update: never;
      };
    };
    Views: Record<string, never>;
    Functions: {
      get_active_request_count: {
        Args: { company_uuid: string };
        Returns: number;
      };
    };
    Enums: {
      company_status: CompanyStatus;
      plan_tier: PlanTier;
      request_status: RequestStatus;
      priority: Priority;
      user_role: UserRole;
      notification_type: NotificationType;
      sla_status: SLAStatus;
      assignment_status: AssignmentStatus;
      file_type: FileType;
      audit_action: AuditAction;
      trigger_type: TriggerType;
      action_type: ActionType;
    };
  };
}
