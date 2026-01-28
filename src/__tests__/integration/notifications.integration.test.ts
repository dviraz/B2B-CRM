/**
 * Notification Integration Tests
 *
 * Tests notification functionality including realtime subscriptions
 */

import {
  setupTestEnvironment,
  teardownTestEnvironment,
  seedDatabase,
  authenticateAsClient,
  authenticateAsAdmin,
  getTableData,
  createCompany,
  createClientProfile,
  createAdminProfile,
  createActiveRequest,
  createNotification,
  createUnreadNotification,
  createReadNotification,
  createComment,
  createTestScenario,
  getMockClient,
  emitInsert,
  emitUpdate,
} from '../__mocks__/test-setup';
import { emitRealtimeEvent, resetRealtimeSubscriptions } from '../__mocks__/supabase';

// Mock the server Supabase client
jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(async () => getMockClient()),
  createAdminClient: jest.fn(() => getMockClient()),
}));

// Mock rate limiting
jest.mock('@/lib/rate-limit', () => ({
  applyRateLimit: jest.fn(async () => null),
  RateLimitPresets: { read: {}, mutation: {} },
}));

// Mock next/headers
jest.mock('next/headers', () => ({
  cookies: jest.fn(() => ({
    getAll: jest.fn(() => []),
    set: jest.fn(),
  })),
}));

describe('Notification Integration Tests', () => {
  beforeEach(() => {
    setupTestEnvironment();
  });

  afterEach(() => {
    teardownTestEnvironment();
    jest.clearAllMocks();
  });

  describe('Notification CRUD Operations', () => {
    it('should create a notification', async () => {
      const scenario = createTestScenario();
      authenticateAsClient(scenario.company.id, scenario.client.id, scenario.client.email);

      seedDatabase({
        companies: [scenario.company],
        profiles: [scenario.admin, scenario.client],
        notifications: [],
      });

      const mockClient = getMockClient();
      await mockClient.from('notifications').insert({
        user_id: scenario.client.id,
        title: 'New Comment',
        message: 'Admin commented on your request',
        type: 'comment',
        read: false,
        link: `/requests/${scenario.requests.active.id}`,
      });

      const notifications = getTableData('notifications');
      expect(notifications).toHaveLength(1);
      expect(notifications[0].title).toBe('New Comment');
      expect(notifications[0].read).toBe(false);
    });

    it('should fetch user notifications', async () => {
      const scenario = createTestScenario();
      const notification1 = createUnreadNotification(scenario.client.id, {
        title: 'Status Update',
      });
      const notification2 = createUnreadNotification(scenario.client.id, {
        title: 'New Comment',
      });

      authenticateAsClient(scenario.company.id, scenario.client.id, scenario.client.email);

      seedDatabase({
        companies: [scenario.company],
        profiles: [scenario.admin, scenario.client],
        notifications: [notification1, notification2],
      });

      const mockClient = getMockClient();
      const result = await mockClient
        .from('notifications')
        .select('*')
        .eq('user_id', scenario.client.id);

      expect(result.data).toHaveLength(2);
    });

    it('should mark notification as read', async () => {
      const scenario = createTestScenario();
      const notification = createUnreadNotification(scenario.client.id);

      authenticateAsClient(scenario.company.id, scenario.client.id, scenario.client.email);

      seedDatabase({
        companies: [scenario.company],
        profiles: [scenario.admin, scenario.client],
        notifications: [notification],
      });

      expect(getTableData('notifications')[0].read).toBe(false);

      const mockClient = getMockClient();
      await mockClient
        .from('notifications')
        .update({ read: true })
        .eq('id', notification.id);

      const notifications = getTableData('notifications');
      expect(notifications[0].read).toBe(true);
    });

    it('should mark all notifications as read', async () => {
      const scenario = createTestScenario();
      const notification1 = createUnreadNotification(scenario.client.id);
      const notification2 = createUnreadNotification(scenario.client.id);
      const notification3 = createUnreadNotification(scenario.client.id);

      authenticateAsClient(scenario.company.id, scenario.client.id, scenario.client.email);

      seedDatabase({
        companies: [scenario.company],
        profiles: [scenario.admin, scenario.client],
        notifications: [notification1, notification2, notification3],
      });

      const mockClient = getMockClient();
      await mockClient
        .from('notifications')
        .update({ read: true })
        .eq('user_id', scenario.client.id)
        .eq('read', false);

      const notifications = getTableData('notifications');
      expect(notifications.every(n => n.read)).toBe(true);
    });

    it('should delete a notification', async () => {
      const scenario = createTestScenario();
      const notification = createNotification(scenario.client.id);

      authenticateAsClient(scenario.company.id, scenario.client.id, scenario.client.email);

      seedDatabase({
        companies: [scenario.company],
        profiles: [scenario.admin, scenario.client],
        notifications: [notification],
      });

      expect(getTableData('notifications')).toHaveLength(1);

      const mockClient = getMockClient();
      await mockClient
        .from('notifications')
        .delete()
        .eq('id', notification.id);

      expect(getTableData('notifications')).toHaveLength(0);
    });
  });

  describe('Notification Filtering', () => {
    it('should filter unread notifications', async () => {
      const scenario = createTestScenario();
      const unread1 = createUnreadNotification(scenario.client.id);
      const unread2 = createUnreadNotification(scenario.client.id);
      const read1 = createReadNotification(scenario.client.id);

      authenticateAsClient(scenario.company.id, scenario.client.id, scenario.client.email);

      seedDatabase({
        companies: [scenario.company],
        profiles: [scenario.admin, scenario.client],
        notifications: [unread1, unread2, read1],
      });

      const mockClient = getMockClient();
      const result = await mockClient
        .from('notifications')
        .select('*')
        .eq('user_id', scenario.client.id)
        .eq('read', false);

      expect(result.data).toHaveLength(2);
      expect(result.data?.every(n => !n.read)).toBe(true);
    });

    it('should filter notifications by type', async () => {
      const scenario = createTestScenario();
      const commentNotif = createNotification(scenario.client.id, { type: 'comment' });
      const statusNotif = createNotification(scenario.client.id, { type: 'status_change' });
      const assignNotif = createNotification(scenario.client.id, { type: 'assignment' });

      authenticateAsClient(scenario.company.id, scenario.client.id, scenario.client.email);

      seedDatabase({
        companies: [scenario.company],
        profiles: [scenario.admin, scenario.client],
        notifications: [commentNotif, statusNotif, assignNotif],
      });

      const mockClient = getMockClient();
      const result = await mockClient
        .from('notifications')
        .select('*')
        .eq('type', 'comment');

      expect(result.data).toHaveLength(1);
      expect(result.data![0].type).toBe('comment');
    });

    it('should order notifications by date (newest first)', async () => {
      const scenario = createTestScenario();
      const old = createNotification(scenario.client.id, {
        title: 'Old',
        created_at: new Date('2024-01-01').toISOString(),
      });
      const new_ = createNotification(scenario.client.id, {
        title: 'New',
        created_at: new Date('2024-06-01').toISOString(),
      });

      authenticateAsClient(scenario.company.id, scenario.client.id, scenario.client.email);

      seedDatabase({
        companies: [scenario.company],
        profiles: [scenario.admin, scenario.client],
        notifications: [old, new_],
      });

      const mockClient = getMockClient();
      const result = await mockClient
        .from('notifications')
        .select('*')
        .eq('user_id', scenario.client.id)
        .order('created_at', { ascending: false });

      expect(result.data![0].title).toBe('New');
      expect(result.data![1].title).toBe('Old');
    });
  });

  describe('Notification Count', () => {
    it('should count unread notifications', async () => {
      const scenario = createTestScenario();
      const unread1 = createUnreadNotification(scenario.client.id);
      const unread2 = createUnreadNotification(scenario.client.id);
      const unread3 = createUnreadNotification(scenario.client.id);
      const read1 = createReadNotification(scenario.client.id);

      authenticateAsClient(scenario.company.id, scenario.client.id, scenario.client.email);

      seedDatabase({
        companies: [scenario.company],
        profiles: [scenario.admin, scenario.client],
        notifications: [unread1, unread2, unread3, read1],
      });

      const mockClient = getMockClient();
      const result = await mockClient
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', scenario.client.id)
        .eq('read', false);

      expect(result.count).toBe(3);
    });
  });

  describe('Realtime Subscriptions', () => {
    it('should receive notification via realtime channel', async () => {
      const scenario = createTestScenario();
      const receivedNotifications: unknown[] = [];

      authenticateAsClient(scenario.company.id, scenario.client.id, scenario.client.email);

      seedDatabase({
        companies: [scenario.company],
        profiles: [scenario.admin, scenario.client],
        notifications: [],
      });

      const mockClient = getMockClient();

      // Subscribe to notifications channel
      mockClient
        .channel('notifications-channel')
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'notifications' },
          (payload: { new: unknown }) => {
            receivedNotifications.push(payload.new);
          }
        )
        .subscribe();

      // Emit a new notification event
      const newNotification = {
        id: 'realtime-notif-1',
        user_id: scenario.client.id,
        title: 'Realtime Notification',
        message: 'You received a realtime notification',
        type: 'comment',
        read: false,
        created_at: new Date().toISOString(),
      };

      emitInsert('notifications', newNotification);

      expect(receivedNotifications).toHaveLength(1);
      expect((receivedNotifications[0] as any).title).toBe('Realtime Notification');
    });

    it('should receive update event when notification is read', async () => {
      const scenario = createTestScenario();
      const notification = createUnreadNotification(scenario.client.id);
      const updates: unknown[] = [];

      authenticateAsClient(scenario.company.id, scenario.client.id, scenario.client.email);

      seedDatabase({
        companies: [scenario.company],
        profiles: [scenario.admin, scenario.client],
        notifications: [notification],
      });

      const mockClient = getMockClient();

      // Subscribe to notification updates
      mockClient
        .channel('notification-updates')
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'notifications' },
          (payload: { new: unknown; old: unknown }) => {
            updates.push(payload);
          }
        )
        .subscribe();

      // Emit an update event
      const updatedNotification = { ...notification, read: true };
      emitUpdate('notifications', updatedNotification, notification);

      expect(updates).toHaveLength(1);
      expect((updates[0] as any).new.read).toBe(true);
      expect((updates[0] as any).old.read).toBe(false);
    });
  });

  describe('Notification Types', () => {
    it('should handle comment notification', async () => {
      const scenario = createTestScenario();

      seedDatabase({
        companies: [scenario.company],
        profiles: [scenario.admin, scenario.client],
        requests: [scenario.requests.active],
        notifications: [],
      });

      const mockClient = getMockClient();
      await mockClient.from('notifications').insert({
        user_id: scenario.client.id,
        title: 'New Comment',
        message: `Admin commented on "${scenario.requests.active.title}"`,
        type: 'comment',
        read: false,
        link: `/requests/${scenario.requests.active.id}`,
      });

      const notifications = getTableData('notifications');
      expect(notifications[0].type).toBe('comment');
      expect(notifications[0].link).toContain(scenario.requests.active.id);
    });

    it('should handle status change notification', async () => {
      const scenario = createTestScenario();

      seedDatabase({
        companies: [scenario.company],
        profiles: [scenario.admin, scenario.client],
        requests: [scenario.requests.active],
        notifications: [],
      });

      const mockClient = getMockClient();
      await mockClient.from('notifications').insert({
        user_id: scenario.client.id,
        title: 'Status Updated',
        message: `Request "${scenario.requests.active.title}" moved to Review`,
        type: 'status_change',
        read: false,
        link: `/requests/${scenario.requests.active.id}`,
      });

      const notifications = getTableData('notifications');
      expect(notifications[0].type).toBe('status_change');
    });

    it('should handle assignment notification', async () => {
      const scenario = createTestScenario();

      seedDatabase({
        companies: [scenario.company],
        profiles: [scenario.admin, scenario.client],
        requests: [scenario.requests.active],
        notifications: [],
      });

      const mockClient = getMockClient();
      await mockClient.from('notifications').insert({
        user_id: scenario.admin.id,
        title: 'New Assignment',
        message: `You have been assigned to "${scenario.requests.active.title}"`,
        type: 'assignment',
        read: false,
        link: `/requests/${scenario.requests.active.id}`,
      });

      const notifications = getTableData('notifications');
      expect(notifications[0].type).toBe('assignment');
    });

    it('should handle mention notification', async () => {
      const scenario = createTestScenario();

      seedDatabase({
        companies: [scenario.company],
        profiles: [scenario.admin, scenario.client],
        requests: [scenario.requests.active],
        notifications: [],
      });

      const mockClient = getMockClient();
      await mockClient.from('notifications').insert({
        user_id: scenario.client.id,
        title: 'Mentioned You',
        message: 'Admin mentioned you in a comment',
        type: 'mention',
        read: false,
        link: `/requests/${scenario.requests.active.id}#comments`,
      });

      const notifications = getTableData('notifications');
      expect(notifications[0].type).toBe('mention');
    });
  });

  describe('Notification Preferences', () => {
    interface NotificationPreferences {
      email_on_comment: boolean;
      email_on_status_change: boolean;
      email_on_assignment: boolean;
      email_on_mention: boolean;
      push_enabled: boolean;
    }

    const defaultPreferences: NotificationPreferences = {
      email_on_comment: true,
      email_on_status_change: true,
      email_on_assignment: true,
      email_on_mention: true,
      push_enabled: false,
    };

    function shouldSendEmail(
      type: string,
      prefs: NotificationPreferences
    ): boolean {
      switch (type) {
        case 'comment':
          return prefs.email_on_comment;
        case 'status_change':
          return prefs.email_on_status_change;
        case 'assignment':
          return prefs.email_on_assignment;
        case 'mention':
          return prefs.email_on_mention;
        default:
          return false;
      }
    }

    it('should respect email preferences for comments', () => {
      const prefs = { ...defaultPreferences, email_on_comment: false };
      expect(shouldSendEmail('comment', prefs)).toBe(false);
    });

    it('should respect email preferences for status changes', () => {
      const prefs = { ...defaultPreferences, email_on_status_change: false };
      expect(shouldSendEmail('status_change', prefs)).toBe(false);
    });

    it('should respect email preferences for assignments', () => {
      const prefs = { ...defaultPreferences, email_on_assignment: false };
      expect(shouldSendEmail('assignment', prefs)).toBe(false);
    });

    it('should respect email preferences for mentions', () => {
      const prefs = { ...defaultPreferences, email_on_mention: false };
      expect(shouldSendEmail('mention', prefs)).toBe(false);
    });

    it('should send email when all preferences enabled', () => {
      expect(shouldSendEmail('comment', defaultPreferences)).toBe(true);
      expect(shouldSendEmail('status_change', defaultPreferences)).toBe(true);
      expect(shouldSendEmail('assignment', defaultPreferences)).toBe(true);
      expect(shouldSendEmail('mention', defaultPreferences)).toBe(true);
    });
  });

  describe('Batch Notification Operations', () => {
    it('should create multiple notifications at once', async () => {
      const company = createCompany();
      const admin = createAdminProfile();
      const client1 = createClientProfile(company.id);
      const client2 = createClientProfile(company.id);

      authenticateAsAdmin(admin.id, admin.email);

      seedDatabase({
        companies: [company],
        profiles: [admin, client1, client2],
        notifications: [],
      });

      const mockClient = getMockClient();

      // Batch insert notifications
      await mockClient.from('notifications').insert([
        {
          user_id: client1.id,
          title: 'Notification 1',
          message: 'Message 1',
          type: 'info',
        },
        {
          user_id: client2.id,
          title: 'Notification 2',
          message: 'Message 2',
          type: 'info',
        },
      ]);

      const notifications = getTableData('notifications');
      expect(notifications).toHaveLength(2);
    });

    it('should delete old notifications (cleanup)', async () => {
      const scenario = createTestScenario();
      const oldNotif = createNotification(scenario.client.id, {
        created_at: new Date('2023-01-01').toISOString(),
      });
      const newNotif = createNotification(scenario.client.id, {
        created_at: new Date().toISOString(),
      });

      authenticateAsAdmin(scenario.admin.id, scenario.admin.email);

      seedDatabase({
        companies: [scenario.company],
        profiles: [scenario.admin, scenario.client],
        notifications: [oldNotif, newNotif],
      });

      const mockClient = getMockClient();

      // Delete notifications older than 6 months
      const cutoffDate = new Date();
      cutoffDate.setMonth(cutoffDate.getMonth() - 6);

      await mockClient
        .from('notifications')
        .delete()
        .lt('created_at', cutoffDate.toISOString());

      const notifications = getTableData('notifications');
      expect(notifications).toHaveLength(1);
      expect(notifications[0].id).toBe(newNotif.id);
    });
  });

  describe('User-specific Notifications', () => {
    it('should isolate notifications between users', async () => {
      const company = createCompany();
      const admin = createAdminProfile();
      const client1 = createClientProfile(company.id);
      const client2 = createClientProfile(company.id);
      const client1Notif = createNotification(client1.id, { title: 'For Client 1' });
      const client2Notif = createNotification(client2.id, { title: 'For Client 2' });
      const adminNotif = createNotification(admin.id, { title: 'For Admin' });

      seedDatabase({
        companies: [company],
        profiles: [admin, client1, client2],
        notifications: [client1Notif, client2Notif, adminNotif],
      });

      // Client 1 should only see their notifications
      authenticateAsClient(company.id, client1.id, client1.email);
      const mockClient = getMockClient();

      const result = await mockClient
        .from('notifications')
        .select('*')
        .eq('user_id', client1.id);

      expect(result.data).toHaveLength(1);
      expect(result.data![0].title).toBe('For Client 1');
    });
  });
});
