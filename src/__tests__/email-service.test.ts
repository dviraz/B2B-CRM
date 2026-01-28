/**
 * Email Service Tests
 *
 * Tests for email template generation and formatting
 */

describe('Email Service', () => {
  describe('Email Template Variables', () => {
    function replaceTemplateVariables(
      template: string,
      variables: Record<string, string>
    ): string {
      let result = template;
      for (const [key, value] of Object.entries(variables)) {
        result = result.replace(new RegExp(`{{${key}}}`, 'g'), value);
      }
      return result;
    }

    it('should replace single variable', () => {
      const template = 'Hello {{name}}!';
      const result = replaceTemplateVariables(template, { name: 'John' });
      expect(result).toBe('Hello John!');
    });

    it('should replace multiple variables', () => {
      const template = 'Hello {{name}}, your request "{{requestTitle}}" has been updated.';
      const result = replaceTemplateVariables(template, {
        name: 'John',
        requestTitle: 'Website Redesign',
      });
      expect(result).toBe('Hello John, your request "Website Redesign" has been updated.');
    });

    it('should replace repeated variables', () => {
      const template = '{{name}} is great! Everyone loves {{name}}.';
      const result = replaceTemplateVariables(template, { name: 'AgencyOS' });
      expect(result).toBe('AgencyOS is great! Everyone loves AgencyOS.');
    });

    it('should leave unreplaced variables as-is', () => {
      const template = 'Hello {{name}}, your {{thing}} is ready.';
      const result = replaceTemplateVariables(template, { name: 'John' });
      expect(result).toBe('Hello John, your {{thing}} is ready.');
    });
  });

  describe('Email Address Validation', () => {
    function isValidEmail(email: string): boolean {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return emailRegex.test(email);
    }

    it('should accept valid email addresses', () => {
      const validEmails = [
        'test@example.com',
        'user.name@domain.com',
        'user+tag@domain.co.uk',
        'name@subdomain.domain.org',
      ];

      validEmails.forEach((email) => {
        expect(isValidEmail(email)).toBe(true);
      });
    });

    it('should reject invalid email addresses', () => {
      const invalidEmails = [
        'notanemail',
        '@domain.com',
        'user@',
        'user@domain',
        'user name@domain.com',
        '',
      ];

      invalidEmails.forEach((email) => {
        expect(isValidEmail(email)).toBe(false);
      });
    });
  });

  describe('Status Change Email Content', () => {
    type RequestStatus = 'queue' | 'active' | 'review' | 'done';

    const STATUS_LABELS: Record<RequestStatus, string> = {
      queue: 'In Queue',
      active: 'Active',
      review: 'In Review',
      done: 'Completed',
    };

    const STATUS_COLORS: Record<RequestStatus, string> = {
      queue: '#6B7280', // Gray
      active: '#F59E0B', // Amber
      review: '#3B82F6', // Blue
      done: '#10B981', // Green
    };

    function getStatusEmailContent(
      fromStatus: RequestStatus,
      toStatus: RequestStatus,
      requestTitle: string
    ): { subject: string; heading: string; color: string } {
      const subject = `Request "${requestTitle}" moved to ${STATUS_LABELS[toStatus]}`;
      const heading = `Your request has been moved from ${STATUS_LABELS[fromStatus]} to ${STATUS_LABELS[toStatus]}`;
      const color = STATUS_COLORS[toStatus];

      return { subject, heading, color };
    }

    it('should generate correct content for queue to active', () => {
      const content = getStatusEmailContent('queue', 'active', 'Website Design');
      expect(content.subject).toBe('Request "Website Design" moved to Active');
      expect(content.heading).toContain('In Queue');
      expect(content.heading).toContain('Active');
      expect(content.color).toBe('#F59E0B');
    });

    it('should generate correct content for active to review', () => {
      const content = getStatusEmailContent('active', 'review', 'Logo Redesign');
      expect(content.subject).toBe('Request "Logo Redesign" moved to In Review');
      expect(content.color).toBe('#3B82F6');
    });

    it('should generate correct content for review to done', () => {
      const content = getStatusEmailContent('review', 'done', 'Banner Ad');
      expect(content.subject).toBe('Request "Banner Ad" moved to Completed');
      expect(content.color).toBe('#10B981');
    });
  });

  describe('Comment Notification Email', () => {
    interface CommentEmailData {
      commenterName: string;
      requestTitle: string;
      commentContent: string;
      isInternal: boolean;
    }

    function generateCommentEmailSubject(data: CommentEmailData): string {
      const internalPrefix = data.isInternal ? '[Internal] ' : '';
      return `${internalPrefix}New comment on "${data.requestTitle}"`;
    }

    function truncateComment(content: string, maxLength: number = 200): string {
      if (content.length <= maxLength) {
        return content;
      }
      return content.slice(0, maxLength - 3) + '...';
    }

    it('should generate correct subject for regular comment', () => {
      const subject = generateCommentEmailSubject({
        commenterName: 'John',
        requestTitle: 'Logo Design',
        commentContent: 'Looking good!',
        isInternal: false,
      });
      expect(subject).toBe('New comment on "Logo Design"');
    });

    it('should add internal prefix for internal comments', () => {
      const subject = generateCommentEmailSubject({
        commenterName: 'Admin',
        requestTitle: 'Logo Design',
        commentContent: 'Client is difficult',
        isInternal: true,
      });
      expect(subject).toBe('[Internal] New comment on "Logo Design"');
    });

    it('should truncate long comments', () => {
      const longComment = 'a'.repeat(300);
      const truncated = truncateComment(longComment);
      expect(truncated.length).toBe(200);
      expect(truncated.endsWith('...')).toBe(true);
    });

    it('should not truncate short comments', () => {
      const shortComment = 'Great work!';
      const result = truncateComment(shortComment);
      expect(result).toBe(shortComment);
    });

    it('should respect custom max length', () => {
      const comment = 'This is a medium length comment';
      const truncated = truncateComment(comment, 15);
      expect(truncated.length).toBe(15);
      expect(truncated).toBe('This is a me...');
    });
  });

  describe('Welcome Email Content', () => {
    interface WelcomeEmailData {
      companyName: string;
      contactName?: string;
      planTier: 'standard' | 'pro';
    }

    function generateWelcomeEmailContent(data: WelcomeEmailData): {
      subject: string;
      greeting: string;
      planDescription: string;
    } {
      const name = data.contactName || data.companyName;
      const subject = `Welcome to AgencyOS, ${data.companyName}!`;
      const greeting = `Hi ${name},`;

      const planDescriptions = {
        standard: 'You can have 1 active request at a time.',
        pro: 'You can have up to 2 active requests at a time.',
      };

      return {
        subject,
        greeting,
        planDescription: planDescriptions[data.planTier],
      };
    }

    it('should use contact name in greeting if provided', () => {
      const content = generateWelcomeEmailContent({
        companyName: 'Acme Corp',
        contactName: 'John Smith',
        planTier: 'standard',
      });
      expect(content.greeting).toBe('Hi John Smith,');
    });

    it('should fall back to company name if no contact name', () => {
      const content = generateWelcomeEmailContent({
        companyName: 'Acme Corp',
        planTier: 'standard',
      });
      expect(content.greeting).toBe('Hi Acme Corp,');
    });

    it('should include company name in subject', () => {
      const content = generateWelcomeEmailContent({
        companyName: 'Tech Startup',
        planTier: 'pro',
      });
      expect(content.subject).toContain('Tech Startup');
    });

    it('should describe standard plan correctly', () => {
      const content = generateWelcomeEmailContent({
        companyName: 'Test Co',
        planTier: 'standard',
      });
      expect(content.planDescription).toContain('1 active request');
    });

    it('should describe pro plan correctly', () => {
      const content = generateWelcomeEmailContent({
        companyName: 'Test Co',
        planTier: 'pro',
      });
      expect(content.planDescription).toContain('2 active requests');
    });
  });

  describe('Password Reset Email', () => {
    function generatePasswordResetUrl(baseUrl: string, token: string): string {
      return `${baseUrl}/auth/set-password?token=${encodeURIComponent(token)}`;
    }

    function isValidResetUrl(url: string): boolean {
      try {
        const parsed = new URL(url);
        return (
          parsed.pathname === '/auth/set-password' &&
          parsed.searchParams.has('token')
        );
      } catch {
        return false;
      }
    }

    it('should generate valid password reset URL', () => {
      const url = generatePasswordResetUrl('https://app.example.com', 'abc123token');
      expect(url).toBe('https://app.example.com/auth/set-password?token=abc123token');
    });

    it('should encode special characters in token', () => {
      const url = generatePasswordResetUrl('https://app.example.com', 'token+with=special&chars');
      expect(url).toContain('token%2Bwith%3Dspecial%26chars');
    });

    it('should validate correct reset URL', () => {
      const url = 'https://app.example.com/auth/set-password?token=abc123';
      expect(isValidResetUrl(url)).toBe(true);
    });

    it('should reject URL without token', () => {
      const url = 'https://app.example.com/auth/set-password';
      expect(isValidResetUrl(url)).toBe(false);
    });

    it('should reject URL with wrong path', () => {
      const url = 'https://app.example.com/reset?token=abc123';
      expect(isValidResetUrl(url)).toBe(false);
    });
  });

  describe('Due Date Reminder Email', () => {
    function getDueStatus(
      dueDate: Date,
      currentDate: Date = new Date()
    ): 'overdue' | 'due_today' | 'due_soon' | 'on_schedule' {
      const diffMs = dueDate.getTime() - currentDate.getTime();
      const diffDays = diffMs / (1000 * 60 * 60 * 24);

      if (diffDays < 0) {
        return 'overdue';
      } else if (diffDays < 1) {
        return 'due_today';
      } else if (diffDays <= 2) {
        return 'due_soon';
      }
      return 'on_schedule';
    }

    function shouldSendReminder(status: string): boolean {
      return ['overdue', 'due_today', 'due_soon'].includes(status);
    }

    it('should identify overdue requests', () => {
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
      expect(getDueStatus(yesterday)).toBe('overdue');
    });

    it('should identify requests due today', () => {
      const laterToday = new Date(Date.now() + 6 * 60 * 60 * 1000); // 6 hours from now
      expect(getDueStatus(laterToday)).toBe('due_today');
    });

    it('should identify requests due soon (within 2 days)', () => {
      const tomorrow = new Date(Date.now() + 36 * 60 * 60 * 1000); // 36 hours from now
      expect(getDueStatus(tomorrow)).toBe('due_soon');
    });

    it('should identify on-schedule requests', () => {
      const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      expect(getDueStatus(nextWeek)).toBe('on_schedule');
    });

    it('should send reminder for overdue', () => {
      expect(shouldSendReminder('overdue')).toBe(true);
    });

    it('should send reminder for due_today', () => {
      expect(shouldSendReminder('due_today')).toBe(true);
    });

    it('should send reminder for due_soon', () => {
      expect(shouldSendReminder('due_soon')).toBe(true);
    });

    it('should not send reminder for on_schedule', () => {
      expect(shouldSendReminder('on_schedule')).toBe(false);
    });
  });
});
