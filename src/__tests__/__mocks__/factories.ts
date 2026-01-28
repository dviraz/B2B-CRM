/**
 * Test Data Factories
 * Generates realistic test data for integration testing
 */

import type {
  Company,
  Profile,
  Request,
  Comment,
  Notification,
  RequestAssignment,
  FileUpload,
  CompanyStatus,
  PlanTier,
  RequestStatus,
  Priority,
  UserRole,
} from '@/types/database';

// ============================================
// ID GENERATORS
// ============================================

let idCounter = 0;

export function generateId(): string {
  return `test-${++idCounter}-${Date.now()}`;
}

export function resetIdCounter() {
  idCounter = 0;
}

// ============================================
// DATE HELPERS
// ============================================

export function daysAgo(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString();
}

export function hoursAgo(hours: number): string {
  const date = new Date();
  date.setHours(date.getHours() - hours);
  return date.toISOString();
}

// ============================================
// COMPANY FACTORY
// ============================================

interface CompanyOverrides {
  id?: string;
  name?: string;
  status?: CompanyStatus;
  plan_tier?: PlanTier;
  max_active_limit?: number;
  woo_customer_id?: number | null;
  woo_subscription_id?: number | null;
  subscription_status?: string | null;
  created_at?: string;
  updated_at?: string;
}

export function createCompany(overrides: CompanyOverrides = {}): Company {
  const id = overrides.id || generateId();
  return {
    id,
    name: overrides.name || `Test Company ${id.slice(-4)}`,
    status: overrides.status || 'active',
    plan_tier: overrides.plan_tier || 'standard',
    max_active_limit: overrides.max_active_limit ?? 1,
    woo_customer_id: overrides.woo_customer_id ?? null,
    woo_subscription_id: overrides.woo_subscription_id ?? null,
    subscription_status: overrides.subscription_status ?? null,
    created_at: overrides.created_at || new Date().toISOString(),
    updated_at: overrides.updated_at || new Date().toISOString(),
  };
}

export function createActiveCompany(overrides: CompanyOverrides = {}): Company {
  return createCompany({ ...overrides, status: 'active' });
}

export function createProCompany(overrides: CompanyOverrides = {}): Company {
  return createCompany({
    ...overrides,
    plan_tier: 'pro',
    max_active_limit: 2,
  });
}

export function createPausedCompany(overrides: CompanyOverrides = {}): Company {
  return createCompany({ ...overrides, status: 'paused' });
}

export function createChurnedCompany(overrides: CompanyOverrides = {}): Company {
  return createCompany({ ...overrides, status: 'churned' });
}

// ============================================
// PROFILE FACTORY
// ============================================

interface ProfileOverrides {
  id?: string;
  email?: string;
  full_name?: string;
  role?: UserRole;
  company_id?: string | null;
  created_at?: string;
  updated_at?: string;
}

export function createProfile(overrides: ProfileOverrides = {}): Profile {
  const id = overrides.id || generateId();
  return {
    id,
    email: overrides.email || `user-${id.slice(-4)}@test.com`,
    full_name: overrides.full_name || `Test User ${id.slice(-4)}`,
    role: overrides.role || 'client',
    company_id: overrides.company_id ?? null,
    created_at: overrides.created_at || new Date().toISOString(),
    updated_at: overrides.updated_at || new Date().toISOString(),
  };
}

export function createAdminProfile(overrides: ProfileOverrides = {}): Profile {
  return createProfile({ ...overrides, role: 'admin', company_id: null });
}

export function createClientProfile(companyId: string, overrides: ProfileOverrides = {}): Profile {
  return createProfile({ ...overrides, role: 'client', company_id: companyId });
}

// ============================================
// REQUEST FACTORY
// ============================================

interface RequestOverrides {
  id?: string;
  company_id?: string;
  title?: string;
  description?: string | null;
  status?: RequestStatus;
  priority?: Priority;
  created_by?: string;
  brand_profile_id?: string | null;
  created_at?: string;
  updated_at?: string;
}

export function createRequest(companyId: string, createdBy: string, overrides: RequestOverrides = {}): Request {
  const id = overrides.id || generateId();
  return {
    id,
    company_id: overrides.company_id || companyId,
    title: overrides.title || `Test Request ${id.slice(-4)}`,
    description: overrides.description ?? 'Test request description',
    status: overrides.status || 'queue',
    priority: overrides.priority || 'medium',
    created_by: overrides.created_by || createdBy,
    brand_profile_id: overrides.brand_profile_id ?? null,
    created_at: overrides.created_at || new Date().toISOString(),
    updated_at: overrides.updated_at || new Date().toISOString(),
  };
}

export function createQueueRequest(companyId: string, createdBy: string, overrides: RequestOverrides = {}): Request {
  return createRequest(companyId, createdBy, { ...overrides, status: 'queue' });
}

export function createActiveRequest(companyId: string, createdBy: string, overrides: RequestOverrides = {}): Request {
  return createRequest(companyId, createdBy, { ...overrides, status: 'active' });
}

export function createReviewRequest(companyId: string, createdBy: string, overrides: RequestOverrides = {}): Request {
  return createRequest(companyId, createdBy, { ...overrides, status: 'review' });
}

export function createDoneRequest(companyId: string, createdBy: string, overrides: RequestOverrides = {}): Request {
  return createRequest(companyId, createdBy, { ...overrides, status: 'done' });
}

export function createHighPriorityRequest(companyId: string, createdBy: string, overrides: RequestOverrides = {}): Request {
  return createRequest(companyId, createdBy, { ...overrides, priority: 'high' });
}

export function createUrgentRequest(companyId: string, createdBy: string, overrides: RequestOverrides = {}): Request {
  return createRequest(companyId, createdBy, { ...overrides, priority: 'urgent' });
}

// ============================================
// COMMENT FACTORY
// ============================================

interface CommentOverrides {
  id?: string;
  request_id?: string;
  author_id?: string;
  content?: string;
  is_internal?: boolean;
  created_at?: string;
}

export function createComment(requestId: string, authorId: string, overrides: CommentOverrides = {}): Comment {
  const id = overrides.id || generateId();
  return {
    id,
    request_id: overrides.request_id || requestId,
    author_id: overrides.author_id || authorId,
    content: overrides.content || `Test comment ${id.slice(-4)}`,
    is_internal: overrides.is_internal ?? false,
    created_at: overrides.created_at || new Date().toISOString(),
  };
}

export function createInternalComment(requestId: string, authorId: string, overrides: CommentOverrides = {}): Comment {
  return createComment(requestId, authorId, { ...overrides, is_internal: true });
}

// ============================================
// NOTIFICATION FACTORY
// ============================================

interface NotificationOverrides {
  id?: string;
  user_id?: string;
  title?: string;
  message?: string;
  type?: string;
  read?: boolean;
  link?: string | null;
  created_at?: string;
}

export function createNotification(userId: string, overrides: NotificationOverrides = {}): Notification {
  const id = overrides.id || generateId();
  return {
    id,
    user_id: overrides.user_id || userId,
    title: overrides.title || `Notification ${id.slice(-4)}`,
    message: overrides.message || 'Test notification message',
    type: overrides.type || 'info',
    read: overrides.read ?? false,
    link: overrides.link ?? null,
    created_at: overrides.created_at || new Date().toISOString(),
  };
}

export function createUnreadNotification(userId: string, overrides: NotificationOverrides = {}): Notification {
  return createNotification(userId, { ...overrides, read: false });
}

export function createReadNotification(userId: string, overrides: NotificationOverrides = {}): Notification {
  return createNotification(userId, { ...overrides, read: true });
}

// ============================================
// REQUEST ASSIGNMENT FACTORY
// ============================================

interface AssignmentOverrides {
  id?: string;
  request_id?: string;
  user_id?: string;
  assigned_by?: string;
  created_at?: string;
}

export function createAssignment(
  requestId: string,
  userId: string,
  assignedBy: string,
  overrides: AssignmentOverrides = {}
): RequestAssignment {
  const id = overrides.id || generateId();
  return {
    id,
    request_id: overrides.request_id || requestId,
    user_id: overrides.user_id || userId,
    assigned_by: overrides.assigned_by || assignedBy,
    created_at: overrides.created_at || new Date().toISOString(),
  };
}

// ============================================
// FILE UPLOAD FACTORY
// ============================================

interface FileUploadOverrides {
  id?: string;
  request_id?: string;
  uploaded_by?: string;
  file_name?: string;
  file_size?: number;
  file_type?: string;
  storage_path?: string;
  created_at?: string;
}

export function createFileUpload(
  requestId: string,
  uploadedBy: string,
  overrides: FileUploadOverrides = {}
): FileUpload {
  const id = overrides.id || generateId();
  return {
    id,
    request_id: overrides.request_id || requestId,
    uploaded_by: overrides.uploaded_by || uploadedBy,
    file_name: overrides.file_name || `test-file-${id.slice(-4)}.pdf`,
    file_size: overrides.file_size ?? 1024,
    file_type: overrides.file_type || 'application/pdf',
    storage_path: overrides.storage_path || `uploads/${requestId}/${id}.pdf`,
    created_at: overrides.created_at || new Date().toISOString(),
  };
}

export function createImageUpload(
  requestId: string,
  uploadedBy: string,
  overrides: FileUploadOverrides = {}
): FileUpload {
  const id = overrides.id || generateId();
  return createFileUpload(requestId, uploadedBy, {
    ...overrides,
    file_name: overrides.file_name || `image-${id.slice(-4)}.png`,
    file_type: 'image/png',
    storage_path: overrides.storage_path || `uploads/${requestId}/${id}.png`,
  });
}

// ============================================
// CLIENT SERVICE FACTORY
// ============================================

interface ClientServiceOverrides {
  id?: string;
  company_id?: string;
  service_name?: string;
  status?: string;
  price?: number | null;
  created_at?: string;
}

export function createClientService(companyId: string, overrides: ClientServiceOverrides = {}) {
  const id = overrides.id || generateId();
  return {
    id,
    company_id: overrides.company_id || companyId,
    service_name: overrides.service_name || `Service ${id.slice(-4)}`,
    status: overrides.status || 'active',
    price: overrides.price ?? 999,
    created_at: overrides.created_at || new Date().toISOString(),
  };
}

// ============================================
// SCENARIO BUILDERS
// ============================================

/**
 * Creates a complete test scenario with company, admin, client, and requests
 */
export function createTestScenario() {
  const company = createActiveCompany();
  const admin = createAdminProfile();
  const client = createClientProfile(company.id);

  const queueRequest = createQueueRequest(company.id, client.id);
  const activeRequest = createActiveRequest(company.id, client.id);
  const reviewRequest = createReviewRequest(company.id, client.id);
  const doneRequest = createDoneRequest(company.id, client.id);

  const comment = createComment(activeRequest.id, admin.id);
  const notification = createUnreadNotification(client.id);
  const assignment = createAssignment(activeRequest.id, admin.id, admin.id);
  const fileUpload = createFileUpload(activeRequest.id, client.id);

  return {
    company,
    admin,
    client,
    requests: {
      queue: queueRequest,
      active: activeRequest,
      review: reviewRequest,
      done: doneRequest,
    },
    comment,
    notification,
    assignment,
    fileUpload,
  };
}

/**
 * Creates multiple companies with clients for dashboard testing
 */
export function createMultiCompanyScenario(count: number = 3) {
  const admin = createAdminProfile();
  const companies = [];
  const clients = [];
  const requests = [];

  for (let i = 0; i < count; i++) {
    const company = createCompany({
      name: `Company ${i + 1}`,
      status: i === count - 1 ? 'paused' : 'active',
      plan_tier: i % 2 === 0 ? 'standard' : 'pro',
    });
    companies.push(company);

    const client = createClientProfile(company.id);
    clients.push(client);

    // Create various requests per company
    requests.push(createQueueRequest(company.id, client.id));
    if (company.status === 'active') {
      requests.push(createActiveRequest(company.id, client.id));
    }
  }

  return { admin, companies, clients, requests };
}

/**
 * Creates a scenario for testing active request limits
 */
export function createLimitTestScenario(planTier: PlanTier = 'standard') {
  const maxLimit = planTier === 'pro' ? 2 : 1;
  const company = createCompany({ plan_tier: planTier, max_active_limit: maxLimit });
  const client = createClientProfile(company.id);
  const admin = createAdminProfile();

  // Create requests up to the limit
  const activeRequests = [];
  for (let i = 0; i < maxLimit; i++) {
    activeRequests.push(createActiveRequest(company.id, client.id));
  }

  // Create a queue request that cannot be moved to active
  const queueRequest = createQueueRequest(company.id, client.id);

  return { company, client, admin, activeRequests, queueRequest, maxLimit };
}
