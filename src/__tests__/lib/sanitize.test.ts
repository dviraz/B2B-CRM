import {
  escapeHtml,
  sanitizeHtml,
  stripHtml,
  sanitizeEmail,
  sanitizeUrl,
  sanitizeText,
} from '@/lib/sanitize';

describe('Sanitization Utilities', () => {
  describe('escapeHtml', () => {
    it('should escape HTML special characters', () => {
      expect(escapeHtml('<script>alert("xss")</script>')).toBe(
        '&lt;script&gt;alert(&quot;xss&quot;)&lt;&#x2F;script&gt;'
      );
    });

    it('should escape ampersands', () => {
      expect(escapeHtml('Tom & Jerry')).toBe('Tom &amp; Jerry');
    });

    it('should escape quotes', () => {
      expect(escapeHtml("it's a \"test\"")).toBe("it&#x27;s a &quot;test&quot;");
    });
  });

  describe('sanitizeHtml', () => {
    it('should remove script tags', () => {
      const input = '<p>Hello</p><script>alert("xss")</script><p>World</p>';
      const result = sanitizeHtml(input);
      expect(result).not.toContain('<script>');
      expect(result).not.toContain('alert');
    });

    it('should remove style tags', () => {
      const input = '<p>Hello</p><style>body { display: none; }</style>';
      const result = sanitizeHtml(input);
      expect(result).not.toContain('<style>');
      expect(result).not.toContain('display');
    });

    it('should remove event handlers', () => {
      const input = '<img src="x" onerror="alert(1)">';
      const result = sanitizeHtml(input);
      expect(result).not.toContain('onerror');
    });

    it('should remove javascript: URLs', () => {
      const input = '<a href="javascript:alert(1)">Click</a>';
      const result = sanitizeHtml(input);
      expect(result).not.toContain('javascript:');
    });

    it('should allow safe tags', () => {
      const input = '<p><strong>Bold</strong> and <em>italic</em></p>';
      const result = sanitizeHtml(input);
      expect(result).toContain('<p>');
      expect(result).toContain('<strong>');
      expect(result).toContain('<em>');
    });

    it('should remove disallowed tags', () => {
      const input = '<iframe src="evil.com"></iframe><p>Safe content</p>';
      const result = sanitizeHtml(input);
      expect(result).not.toContain('<iframe');
      expect(result).toContain('<p>');
    });

    it('should add rel attribute to external links', () => {
      const input = '<a href="https://example.com">Link</a>';
      const result = sanitizeHtml(input);
      expect(result).toContain('rel="noopener noreferrer"');
    });

    it('should handle empty input', () => {
      expect(sanitizeHtml('')).toBe('');
      expect(sanitizeHtml(null as unknown as string)).toBe('');
      expect(sanitizeHtml(undefined as unknown as string)).toBe('');
    });
  });

  describe('stripHtml', () => {
    it('should remove all HTML tags', () => {
      const input = '<p>Hello <strong>World</strong>!</p>';
      expect(stripHtml(input)).toBe('Hello World!');
    });

    it('should handle nested tags', () => {
      const input = '<div><p><span>Nested</span> content</p></div>';
      expect(stripHtml(input)).toBe('Nested content');
    });

    it('should handle empty input', () => {
      expect(stripHtml('')).toBe('');
    });
  });

  describe('sanitizeEmail', () => {
    it('should accept valid emails', () => {
      expect(sanitizeEmail('test@example.com')).toBe('test@example.com');
      expect(sanitizeEmail('user.name@domain.co.uk')).toBe('user.name@domain.co.uk');
    });

    it('should lowercase emails', () => {
      expect(sanitizeEmail('Test@EXAMPLE.COM')).toBe('test@example.com');
    });

    it('should trim whitespace', () => {
      expect(sanitizeEmail('  test@example.com  ')).toBe('test@example.com');
    });

    it('should reject invalid emails', () => {
      expect(sanitizeEmail('not-an-email')).toBeNull();
      expect(sanitizeEmail('missing@domain')).toBeNull();
      expect(sanitizeEmail('@no-local.com')).toBeNull();
    });

    it('should handle empty input', () => {
      expect(sanitizeEmail('')).toBeNull();
      expect(sanitizeEmail(null as unknown as string)).toBeNull();
    });
  });

  describe('sanitizeUrl', () => {
    it('should accept valid HTTP URLs', () => {
      expect(sanitizeUrl('https://example.com')).toBe('https://example.com/');
      expect(sanitizeUrl('http://example.com/path')).toBe('http://example.com/path');
    });

    it('should accept mailto URLs', () => {
      expect(sanitizeUrl('mailto:test@example.com')).toBe('mailto:test@example.com');
    });

    it('should reject javascript URLs', () => {
      expect(sanitizeUrl('javascript:alert(1)')).toBeNull();
    });

    it('should reject data URLs', () => {
      expect(sanitizeUrl('data:text/html,<script>alert(1)</script>')).toBeNull();
    });

    it('should handle empty input', () => {
      expect(sanitizeUrl('')).toBeNull();
    });
  });

  describe('sanitizeText', () => {
    it('should remove control characters', () => {
      const input = 'Hello\x00World\x1F';
      expect(sanitizeText(input)).toBe('HelloWorld');
    });

    it('should preserve newlines and tabs', () => {
      const input = 'Line1\nLine2\tTabbed';
      expect(sanitizeText(input)).toBe('Line1\nLine2\tTabbed');
    });

    it('should trim whitespace', () => {
      expect(sanitizeText('  hello world  ')).toBe('hello world');
    });

    it('should limit length if specified', () => {
      const input = 'This is a very long string that needs to be truncated';
      expect(sanitizeText(input, 10)).toBe('This is a ');
    });

    it('should handle empty input', () => {
      expect(sanitizeText('')).toBe('');
    });
  });
});
