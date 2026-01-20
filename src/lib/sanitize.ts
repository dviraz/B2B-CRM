/**
 * HTML Sanitization utilities to prevent XSS attacks
 * Uses a whitelist-based approach for allowed HTML tags and attributes
 */

// Allowed HTML tags for rich text content
const ALLOWED_TAGS = new Set([
  'p', 'br', 'strong', 'b', 'em', 'i', 'u', 's', 'strike',
  'ul', 'ol', 'li', 'code', 'pre', 'blockquote',
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'a', 'span', 'div',
]);

// Allowed attributes per tag
const ALLOWED_ATTRIBUTES: Record<string, Set<string>> = {
  a: new Set(['href', 'title', 'target', 'rel']),
  span: new Set(['class']),
  div: new Set(['class']),
  code: new Set(['class']),
  pre: new Set(['class']),
};

// URL protocols allowed in href attributes
const ALLOWED_PROTOCOLS = new Set(['http:', 'https:', 'mailto:']);

/**
 * Escape HTML entities to prevent XSS
 */
export function escapeHtml(text: string): string {
  const htmlEscapes: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '/': '&#x2F;',
  };
  return text.replace(/[&<>"'/]/g, (char) => htmlEscapes[char]);
}

/**
 * Unescape HTML entities
 */
export function unescapeHtml(text: string): string {
  const htmlUnescapes: Record<string, string> = {
    '&amp;': '&',
    '&lt;': '<',
    '&gt;': '>',
    '&quot;': '"',
    '&#x27;': "'",
    '&#x2F;': '/',
  };
  return text.replace(/&(?:amp|lt|gt|quot|#x27|#x2F);/g, (entity) => htmlUnescapes[entity] || entity);
}

/**
 * Check if a URL is safe (allowed protocol)
 */
function isSafeUrl(url: string): boolean {
  try {
    const parsed = new URL(url, 'https://example.com');
    return ALLOWED_PROTOCOLS.has(parsed.protocol);
  } catch {
    // Relative URLs are allowed
    return !url.toLowerCase().startsWith('javascript:') &&
           !url.toLowerCase().startsWith('data:') &&
           !url.toLowerCase().startsWith('vbscript:');
  }
}

/**
 * Sanitize HTML content, removing dangerous tags and attributes
 * This is a simple implementation - for production, consider using DOMPurify
 */
export function sanitizeHtml(html: string): string {
  if (!html || typeof html !== 'string') {
    return '';
  }

  // Remove script tags and their content entirely
  let sanitized = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');

  // Remove style tags and their content
  sanitized = sanitized.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');

  // Remove on* event handlers
  sanitized = sanitized.replace(/\s*on\w+\s*=\s*["'][^"']*["']/gi, '');
  sanitized = sanitized.replace(/\s*on\w+\s*=\s*[^\s>]*/gi, '');

  // Remove javascript: URLs
  sanitized = sanitized.replace(/javascript\s*:/gi, '');

  // Remove data: URLs (can be used for XSS)
  sanitized = sanitized.replace(/data\s*:[^"'\s>]*/gi, '');

  // Remove vbscript: URLs
  sanitized = sanitized.replace(/vbscript\s*:/gi, '');

  // Process tags
  sanitized = sanitized.replace(/<\/?([a-z][a-z0-9]*)\b[^>]*>/gi, (match, tagName) => {
    const tag = tagName.toLowerCase();

    // Remove disallowed tags entirely
    if (!ALLOWED_TAGS.has(tag)) {
      return '';
    }

    // Check if it's a closing tag
    if (match.startsWith('</')) {
      return `</${tag}>`;
    }

    // Process allowed attributes
    const allowedAttrs = ALLOWED_ATTRIBUTES[tag] || new Set();
    const attrs: string[] = [];

    // Extract attributes
    const attrRegex = /([a-z][a-z0-9-]*)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]*))/gi;
    let attrMatch;

    while ((attrMatch = attrRegex.exec(match)) !== null) {
      const attrName = attrMatch[1].toLowerCase();
      const attrValue = attrMatch[2] ?? attrMatch[3] ?? attrMatch[4] ?? '';

      if (allowedAttrs.has(attrName)) {
        // Special handling for href
        if (attrName === 'href' && !isSafeUrl(attrValue)) {
          continue;
        }

        // Add rel="noopener noreferrer" for external links
        if (attrName === 'href' && attrValue.startsWith('http')) {
          attrs.push(`href="${escapeHtml(attrValue)}"`);
          attrs.push('rel="noopener noreferrer"');
          attrs.push('target="_blank"');
          continue;
        }

        attrs.push(`${attrName}="${escapeHtml(attrValue)}"`);
      }
    }

    // Check for self-closing tags
    const selfClosing = match.endsWith('/>') || ['br', 'hr', 'img'].includes(tag);

    if (attrs.length > 0) {
      return selfClosing ? `<${tag} ${attrs.join(' ')} />` : `<${tag} ${attrs.join(' ')}>`;
    }

    return selfClosing ? `<${tag} />` : `<${tag}>`;
  });

  return sanitized.trim();
}

/**
 * Strip all HTML tags, leaving only text content
 */
export function stripHtml(html: string): string {
  if (!html || typeof html !== 'string') {
    return '';
  }
  return html.replace(/<[^>]*>/g, '').trim();
}

/**
 * Sanitize a string for use in SQL LIKE queries (escape special characters)
 */
export function sanitizeLikePattern(pattern: string): string {
  return pattern.replace(/[%_\\]/g, '\\$&');
}

/**
 * Validate and sanitize an email address
 */
export function sanitizeEmail(email: string): string | null {
  if (!email || typeof email !== 'string') {
    return null;
  }

  const trimmed = email.trim().toLowerCase();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!emailRegex.test(trimmed)) {
    return null;
  }

  return trimmed;
}

/**
 * Sanitize a URL
 */
export function sanitizeUrl(url: string): string | null {
  if (!url || typeof url !== 'string') {
    return null;
  }

  const trimmed = url.trim();

  if (!isSafeUrl(trimmed)) {
    return null;
  }

  try {
    // Normalize the URL
    const parsed = new URL(trimmed);
    return parsed.toString();
  } catch {
    // Return as-is if it's a relative URL
    return trimmed;
  }
}

/**
 * Sanitize user input for general text fields
 * Removes control characters and trims whitespace
 */
export function sanitizeText(text: string, maxLength?: number): string {
  if (!text || typeof text !== 'string') {
    return '';
  }

  // Remove control characters except newlines and tabs
  let sanitized = text.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');

  // Normalize whitespace
  sanitized = sanitized.trim();

  // Limit length if specified
  if (maxLength && sanitized.length > maxLength) {
    sanitized = sanitized.slice(0, maxLength);
  }

  return sanitized;
}
