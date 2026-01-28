/**
 * Comprehensive Supabase Mock for Integration Testing
 * Provides in-memory data store with full query builder support
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
// IN-MEMORY DATA STORE
// ============================================

export interface MockDataStore {
  companies: Company[];
  profiles: Profile[];
  requests: Request[];
  comments: Comment[];
  notifications: Notification[];
  assignments: RequestAssignment[];
  files: FileUpload[];
  client_services: Array<{
    id: string;
    company_id: string;
    service_name: string;
    status: string;
    price: number | null;
    created_at: string;
  }>;
}

let dataStore: MockDataStore = {
  companies: [],
  profiles: [],
  requests: [],
  comments: [],
  notifications: [],
  assignments: [],
  files: [],
  client_services: [],
};

// Reset data store between tests
export function resetMockDataStore() {
  dataStore = {
    companies: [],
    profiles: [],
    requests: [],
    comments: [],
    notifications: [],
    assignments: [],
    files: [],
    client_services: [],
  };
}

export function getMockDataStore(): MockDataStore {
  return dataStore;
}

export function setMockData<K extends keyof MockDataStore>(
  table: K,
  data: MockDataStore[K]
) {
  dataStore[table] = data;
}

// ============================================
// MOCK AUTH USER
// ============================================

interface MockUser {
  id: string;
  email: string;
  role: UserRole;
  company_id: string | null;
}

let currentMockUser: MockUser | null = null;

export function setMockUser(user: MockUser | null) {
  currentMockUser = user;
}

export function getMockUser(): MockUser | null {
  return currentMockUser;
}

// ============================================
// QUERY BUILDER MOCK
// ============================================

type FilterOperator = 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'like' | 'ilike' | 'in' | 'is';

interface QueryFilter {
  column: string;
  operator: FilterOperator;
  value: unknown;
}

interface QueryOptions {
  filters: QueryFilter[];
  selectColumns: string | null;
  orderColumn: string | null;
  orderAscending: boolean;
  limitCount: number | null;
  rangeStart: number | null;
  rangeEnd: number | null;
}

function createQueryBuilder<T extends Record<string, unknown>>(
  tableName: keyof MockDataStore
) {
  const options: QueryOptions = {
    filters: [],
    selectColumns: null,
    orderColumn: null,
    orderAscending: true,
    limitCount: null,
    rangeStart: null,
    rangeEnd: null,
  };

  let pendingInsertData: Partial<T> | Partial<T>[] | null = null;
  let pendingUpdateData: Partial<T> | null = null;
  let isDelete = false;
  let isCount = false;
  let isHead = false;

  const applyFilters = (data: T[]): T[] => {
    return data.filter((item) => {
      return options.filters.every((filter) => {
        const value = item[filter.column];
        switch (filter.operator) {
          case 'eq':
            return value === filter.value;
          case 'neq':
            return value !== filter.value;
          case 'gt':
            return (value as number) > (filter.value as number);
          case 'gte':
            return (value as number) >= (filter.value as number);
          case 'lt':
            return (value as number) < (filter.value as number);
          case 'lte':
            return (value as number) <= (filter.value as number);
          case 'like':
            return String(value).includes(String(filter.value).replace(/%/g, ''));
          case 'ilike':
            return String(value)
              .toLowerCase()
              .includes(String(filter.value).replace(/%/g, '').toLowerCase());
          case 'in':
            return (filter.value as unknown[]).includes(value);
          case 'is':
            if (filter.value === null) return value === null;
            return value === filter.value;
          default:
            return true;
        }
      });
    });
  };

  const builder = {
    select(columns?: string, opts?: { count?: 'exact'; head?: boolean }) {
      options.selectColumns = columns || '*';
      if (opts?.count === 'exact') isCount = true;
      if (opts?.head) isHead = true;
      return builder;
    },

    insert(data: Partial<T> | Partial<T>[]) {
      pendingInsertData = data;
      return builder;
    },

    update(data: Partial<T>) {
      pendingUpdateData = data;
      return builder;
    },

    delete() {
      isDelete = true;
      return builder;
    },

    eq(column: string, value: unknown) {
      options.filters.push({ column, operator: 'eq', value });
      return builder;
    },

    neq(column: string, value: unknown) {
      options.filters.push({ column, operator: 'neq', value });
      return builder;
    },

    gt(column: string, value: unknown) {
      options.filters.push({ column, operator: 'gt', value });
      return builder;
    },

    gte(column: string, value: unknown) {
      options.filters.push({ column, operator: 'gte', value });
      return builder;
    },

    lt(column: string, value: unknown) {
      options.filters.push({ column, operator: 'lt', value });
      return builder;
    },

    lte(column: string, value: unknown) {
      options.filters.push({ column, operator: 'lte', value });
      return builder;
    },

    like(column: string, value: string) {
      options.filters.push({ column, operator: 'like', value });
      return builder;
    },

    ilike(column: string, value: string) {
      options.filters.push({ column, operator: 'ilike', value });
      return builder;
    },

    in(column: string, values: unknown[]) {
      options.filters.push({ column, operator: 'in', value: values });
      return builder;
    },

    is(column: string, value: unknown) {
      options.filters.push({ column, operator: 'is', value });
      return builder;
    },

    order(column: string, opts?: { ascending?: boolean }) {
      options.orderColumn = column;
      options.orderAscending = opts?.ascending ?? true;
      return builder;
    },

    limit(count: number) {
      options.limitCount = count;
      return builder;
    },

    range(start: number, end: number) {
      options.rangeStart = start;
      options.rangeEnd = end;
      return builder;
    },

    single() {
      return builder.then((result) => {
        if (result.error) return result;
        const data = Array.isArray(result.data) ? result.data[0] || null : result.data;
        return { data, error: null };
      });
    },

    maybeSingle() {
      return builder.single();
    },

    then(resolve: (result: { data: T | T[] | null; error: Error | null; count?: number }) => unknown) {
      // Get table data
      let tableData = [...(dataStore[tableName] as unknown as T[])];

      // Handle INSERT
      if (pendingInsertData) {
        const items = Array.isArray(pendingInsertData) ? pendingInsertData : [pendingInsertData];
        const inserted: T[] = [];

        for (const item of items) {
          const newItem = {
            id: crypto.randomUUID(),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            ...item,
          } as T;
          (dataStore[tableName] as unknown as T[]).push(newItem);
          inserted.push(newItem);
        }

        return resolve({ data: inserted.length === 1 ? inserted[0] : inserted, error: null });
      }

      // Handle UPDATE
      if (pendingUpdateData) {
        const filtered = applyFilters(tableData);
        const updated: T[] = [];

        for (const item of filtered) {
          const index = (dataStore[tableName] as unknown as T[]).findIndex(
            (d) => (d as Record<string, unknown>).id === (item as Record<string, unknown>).id
          );
          if (index !== -1) {
            const updatedItem = {
              ...item,
              ...pendingUpdateData,
              updated_at: new Date().toISOString(),
            } as T;
            (dataStore[tableName] as unknown as T[])[index] = updatedItem;
            updated.push(updatedItem);
          }
        }

        return resolve({ data: updated.length === 1 ? updated[0] : updated, error: null });
      }

      // Handle DELETE
      if (isDelete) {
        const filtered = applyFilters(tableData);
        const deletedIds = filtered.map((item) => (item as Record<string, unknown>).id);

        dataStore[tableName] = (dataStore[tableName] as unknown as T[]).filter(
          (item) => !deletedIds.includes((item as Record<string, unknown>).id)
        ) as MockDataStore[typeof tableName];

        return resolve({ data: filtered, error: null });
      }

      // Handle SELECT
      let result = applyFilters(tableData);

      // Apply ordering
      if (options.orderColumn) {
        result.sort((a, b) => {
          const aVal = a[options.orderColumn!];
          const bVal = b[options.orderColumn!];
          if (aVal < bVal) return options.orderAscending ? -1 : 1;
          if (aVal > bVal) return options.orderAscending ? 1 : -1;
          return 0;
        });
      }

      // Apply range
      if (options.rangeStart !== null && options.rangeEnd !== null) {
        result = result.slice(options.rangeStart, options.rangeEnd + 1);
      }

      // Apply limit
      if (options.limitCount !== null) {
        result = result.slice(0, options.limitCount);
      }

      // Handle count
      if (isCount && isHead) {
        return resolve({ data: null, error: null, count: result.length });
      }

      return resolve({ data: result, error: null });
    },
  };

  return builder;
}

// ============================================
// STORAGE MOCK
// ============================================

interface StoredFile {
  bucket: string;
  path: string;
  data: Buffer | string;
  contentType: string;
}

const storageFiles: StoredFile[] = [];

export function resetStorageFiles() {
  storageFiles.length = 0;
}

export function getStorageFiles() {
  return [...storageFiles];
}

function createStorageMock() {
  return {
    from(bucket: string) {
      return {
        upload(path: string, data: Buffer | string, opts?: { contentType?: string }) {
          const file: StoredFile = {
            bucket,
            path,
            data,
            contentType: opts?.contentType || 'application/octet-stream',
          };
          storageFiles.push(file);
          return Promise.resolve({
            data: { path: `${bucket}/${path}` },
            error: null,
          });
        },

        download(path: string) {
          const file = storageFiles.find((f) => f.bucket === bucket && f.path === path);
          if (!file) {
            return Promise.resolve({
              data: null,
              error: { message: 'File not found' },
            });
          }
          return Promise.resolve({
            data: new Blob([file.data]),
            error: null,
          });
        },

        remove(paths: string[]) {
          paths.forEach((path) => {
            const index = storageFiles.findIndex((f) => f.bucket === bucket && f.path === path);
            if (index !== -1) storageFiles.splice(index, 1);
          });
          return Promise.resolve({ data: paths, error: null });
        },

        getPublicUrl(path: string) {
          return {
            data: {
              publicUrl: `https://storage.test.supabase.co/${bucket}/${path}`,
            },
          };
        },

        createSignedUrl(path: string, expiresIn: number) {
          return Promise.resolve({
            data: {
              signedUrl: `https://storage.test.supabase.co/${bucket}/${path}?token=test&expires=${expiresIn}`,
            },
            error: null,
          });
        },
      };
    },
  };
}

// ============================================
// REALTIME MOCK
// ============================================

type RealtimeCallback = (payload: { new: unknown; old: unknown; eventType: string }) => void;

const realtimeSubscriptions: Map<string, RealtimeCallback[]> = new Map();

export function resetRealtimeSubscriptions() {
  realtimeSubscriptions.clear();
}

export function emitRealtimeEvent(
  table: string,
  eventType: 'INSERT' | 'UPDATE' | 'DELETE',
  newRecord: unknown,
  oldRecord?: unknown
) {
  const callbacks = realtimeSubscriptions.get(table) || [];
  callbacks.forEach((cb) =>
    cb({
      new: newRecord,
      old: oldRecord || null,
      eventType,
    })
  );
}

function createRealtimeMock() {
  return {
    channel(name: string) {
      return {
        on(
          event: string,
          filter: { event: string; schema: string; table: string },
          callback: RealtimeCallback
        ) {
          const key = filter.table;
          if (!realtimeSubscriptions.has(key)) {
            realtimeSubscriptions.set(key, []);
          }
          realtimeSubscriptions.get(key)!.push(callback);
          return this;
        },
        subscribe() {
          return this;
        },
        unsubscribe() {
          return Promise.resolve();
        },
      };
    },
    removeChannel() {
      return Promise.resolve();
    },
  };
}

// ============================================
// AUTH MOCK
// ============================================

function createAuthMock() {
  return {
    getUser() {
      if (!currentMockUser) {
        return Promise.resolve({
          data: { user: null },
          error: { message: 'Not authenticated' },
        });
      }
      return Promise.resolve({
        data: {
          user: {
            id: currentMockUser.id,
            email: currentMockUser.email,
            user_metadata: {
              company_id: currentMockUser.company_id,
            },
          },
        },
        error: null,
      });
    },

    signInWithPassword(credentials: { email: string; password: string }) {
      const profile = dataStore.profiles.find((p) => p.email === credentials.email);
      if (profile) {
        currentMockUser = {
          id: profile.id,
          email: profile.email,
          role: profile.role,
          company_id: profile.company_id,
        };
        return Promise.resolve({
          data: { user: { id: profile.id, email: profile.email } },
          error: null,
        });
      }
      return Promise.resolve({
        data: { user: null },
        error: { message: 'Invalid credentials' },
      });
    },

    signOut() {
      currentMockUser = null;
      return Promise.resolve({ error: null });
    },

    admin: {
      createUser(opts: { email: string; email_confirm?: boolean; user_metadata?: Record<string, unknown> }) {
        const newUser = {
          id: crypto.randomUUID(),
          email: opts.email,
          user_metadata: opts.user_metadata || {},
        };
        return Promise.resolve({ data: { user: newUser }, error: null });
      },
      generateLink(opts: { type: string; email: string }) {
        return Promise.resolve({
          data: { link: `https://test.supabase.co/auth/${opts.type}?email=${opts.email}` },
          error: null,
        });
      },
    },
  };
}

// ============================================
// MAIN MOCK CLIENT
// ============================================

export function createMockSupabaseClient() {
  return {
    from: <T extends Record<string, unknown>>(tableName: string) =>
      createQueryBuilder<T>(tableName as keyof MockDataStore),
    storage: createStorageMock(),
    channel: createRealtimeMock().channel,
    removeChannel: createRealtimeMock().removeChannel,
    auth: createAuthMock(),
  };
}

// Export type for use in tests
export type MockSupabaseClient = ReturnType<typeof createMockSupabaseClient>;
