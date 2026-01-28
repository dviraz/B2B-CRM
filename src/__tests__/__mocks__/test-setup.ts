/**
 * Integration Test Setup
 * Configures mocks and provides test utilities
 */

import {
  createMockSupabaseClient,
  resetMockDataStore,
  setMockData,
  setMockUser,
  getMockDataStore,
  resetStorageFiles,
  resetRealtimeSubscriptions,
  emitRealtimeEvent,
  type MockSupabaseClient,
} from './supabase';
import { resetIdCounter } from './factories';
import type { UserRole } from '@/types/database';

// ============================================
// MOCK CLIENT SINGLETON
// ============================================

let mockSupabaseClient: MockSupabaseClient | null = null;

export function getMockClient(): MockSupabaseClient {
  if (!mockSupabaseClient) {
    mockSupabaseClient = createMockSupabaseClient();
  }
  return mockSupabaseClient;
}

// ============================================
// SETUP AND TEARDOWN
// ============================================

/**
 * Reset all mocks before each test
 */
export function setupTestEnvironment() {
  resetMockDataStore();
  resetStorageFiles();
  resetRealtimeSubscriptions();
  resetIdCounter();
  setMockUser(null);
  mockSupabaseClient = createMockSupabaseClient();
}

/**
 * Clean up after tests
 */
export function teardownTestEnvironment() {
  resetMockDataStore();
  resetStorageFiles();
  resetRealtimeSubscriptions();
  setMockUser(null);
}

// ============================================
// AUTH HELPERS
// ============================================

interface TestUser {
  id: string;
  email: string;
  role: UserRole;
  company_id: string | null;
}

/**
 * Set the current authenticated user for tests
 */
export function authenticateAs(user: TestUser) {
  setMockUser(user);
  return user;
}

/**
 * Authenticate as an admin user
 */
export function authenticateAsAdmin(id: string = 'admin-1', email: string = 'admin@test.com') {
  return authenticateAs({ id, email, role: 'admin', company_id: null });
}

/**
 * Authenticate as a client user
 */
export function authenticateAsClient(companyId: string, id: string = 'client-1', email: string = 'client@test.com') {
  return authenticateAs({ id, email, role: 'client', company_id: companyId });
}

/**
 * Clear authentication (simulate logged out)
 */
export function clearAuth() {
  setMockUser(null);
}

// ============================================
// DATA HELPERS
// ============================================

/**
 * Seed the mock database with test data
 */
export function seedDatabase(data: Partial<ReturnType<typeof getMockDataStore>>) {
  const store = getMockDataStore();

  if (data.companies) setMockData('companies', data.companies);
  if (data.profiles) setMockData('profiles', data.profiles);
  if (data.requests) setMockData('requests', data.requests);
  if (data.comments) setMockData('comments', data.comments);
  if (data.notifications) setMockData('notifications', data.notifications);
  if (data.assignments) setMockData('assignments', data.assignments);
  if (data.files) setMockData('files', data.files);
  if (data.client_services) setMockData('client_services', data.client_services);

  return store;
}

/**
 * Get all data from a specific table
 */
export function getTableData<K extends keyof ReturnType<typeof getMockDataStore>>(
  table: K
): ReturnType<typeof getMockDataStore>[K] {
  return getMockDataStore()[table];
}

/**
 * Find a record by ID in a table
 */
export function findById<T extends { id: string }>(table: T[], id: string): T | undefined {
  return table.find(item => item.id === id);
}

// ============================================
// REQUEST/RESPONSE HELPERS
// ============================================

/**
 * Create a mock NextRequest for API route testing
 */
export function createMockRequest(
  method: string,
  url: string,
  options: {
    body?: unknown;
    headers?: Record<string, string>;
    searchParams?: Record<string, string>;
  } = {}
): Request {
  const fullUrl = new URL(url, 'http://localhost:3000');

  if (options.searchParams) {
    Object.entries(options.searchParams).forEach(([key, value]) => {
      fullUrl.searchParams.set(key, value);
    });
  }

  const headers = new Headers(options.headers || {});
  if (options.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  return new Request(fullUrl.toString(), {
    method,
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
}

/**
 * Parse JSON response from API route
 */
export async function parseJsonResponse<T>(response: Response): Promise<T> {
  const text = await response.text();
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`Failed to parse JSON response: ${text}`);
  }
}

// ============================================
// ASSERTION HELPERS
// ============================================

/**
 * Assert that a response has a specific status code
 */
export function assertStatus(response: Response, expectedStatus: number) {
  if (response.status !== expectedStatus) {
    throw new Error(
      `Expected status ${expectedStatus} but got ${response.status}`
    );
  }
}

/**
 * Assert that data contains a specific record
 */
export function assertContains<T extends { id: string }>(
  data: T[],
  id: string,
  message?: string
) {
  const found = data.some(item => item.id === id);
  if (!found) {
    throw new Error(message || `Expected data to contain record with id ${id}`);
  }
}

/**
 * Assert that data does not contain a specific record
 */
export function assertNotContains<T extends { id: string }>(
  data: T[],
  id: string,
  message?: string
) {
  const found = data.some(item => item.id === id);
  if (found) {
    throw new Error(message || `Expected data not to contain record with id ${id}`);
  }
}

// ============================================
// REALTIME HELPERS
// ============================================

/**
 * Emit a realtime INSERT event for testing
 */
export function emitInsert(table: string, record: unknown) {
  emitRealtimeEvent(table, 'INSERT', record);
}

/**
 * Emit a realtime UPDATE event for testing
 */
export function emitUpdate(table: string, newRecord: unknown, oldRecord: unknown) {
  emitRealtimeEvent(table, 'UPDATE', newRecord, oldRecord);
}

/**
 * Emit a realtime DELETE event for testing
 */
export function emitDelete(table: string, record: unknown) {
  emitRealtimeEvent(table, 'DELETE', null, record);
}

// ============================================
// WAIT HELPERS
// ============================================

/**
 * Wait for a condition to be true
 */
export async function waitFor(
  condition: () => boolean | Promise<boolean>,
  timeout: number = 1000,
  interval: number = 50
): Promise<void> {
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    if (await condition()) {
      return;
    }
    await new Promise(resolve => setTimeout(resolve, interval));
  }

  throw new Error(`waitFor timed out after ${timeout}ms`);
}

/**
 * Wait for a specific number of milliseconds
 */
export function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Re-export for convenience
export {
  createMockSupabaseClient,
  getMockDataStore,
  emitRealtimeEvent,
  getStorageFiles,
} from './supabase';

export * from './factories';
