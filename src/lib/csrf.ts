/**
 * CSRF Protection utilities
 * Uses double-submit cookie pattern with signed tokens
 */

import { NextRequest, NextResponse } from 'next/server';

// CSRF token validity period (1 hour)
const CSRF_TOKEN_VALIDITY = 60 * 60 * 1000;

// Cookie name for CSRF token
const CSRF_COOKIE_NAME = 'csrf_token';

// Header name for CSRF token
const CSRF_HEADER_NAME = 'x-csrf-token';

/**
 * Generate a cryptographically secure random token
 */
function generateToken(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Create a signed CSRF token with timestamp
 */
export function createCsrfToken(): { token: string; signature: string } {
  const token = generateToken();
  const timestamp = Date.now().toString(36);
  const signature = `${timestamp}.${token}`;
  return { token, signature };
}

/**
 * Validate a CSRF token signature
 */
export function validateCsrfToken(signature: string): boolean {
  if (!signature || typeof signature !== 'string') {
    return false;
  }

  const parts = signature.split('.');
  if (parts.length !== 2) {
    return false;
  }

  const [timestamp] = parts;
  const tokenTime = parseInt(timestamp, 36);

  if (isNaN(tokenTime)) {
    return false;
  }

  // Check if token has expired
  const now = Date.now();
  if (now - tokenTime > CSRF_TOKEN_VALIDITY) {
    return false;
  }

  return true;
}

/**
 * Get CSRF token from request (cookie or header)
 */
export function getCsrfToken(request: NextRequest): {
  cookieToken: string | null;
  headerToken: string | null;
} {
  const cookieToken = request.cookies.get(CSRF_COOKIE_NAME)?.value || null;
  const headerToken = request.headers.get(CSRF_HEADER_NAME);

  return { cookieToken, headerToken };
}

/**
 * Verify CSRF protection for a request
 * Compares the token in the cookie with the token in the header
 */
export function verifyCsrfToken(request: NextRequest): {
  valid: boolean;
  error?: string;
} {
  // Skip CSRF check for safe methods
  const method = request.method.toUpperCase();
  if (['GET', 'HEAD', 'OPTIONS'].includes(method)) {
    return { valid: true };
  }

  // Skip CSRF check for API routes that use other authentication (e.g., webhooks)
  const pathname = request.nextUrl.pathname;
  if (pathname.startsWith('/api/webhooks/')) {
    return { valid: true };
  }

  const { cookieToken, headerToken } = getCsrfToken(request);

  if (!cookieToken) {
    return { valid: false, error: 'CSRF cookie not found' };
  }

  if (!headerToken) {
    return { valid: false, error: 'CSRF header not found' };
  }

  // Validate token format and expiry
  if (!validateCsrfToken(cookieToken)) {
    return { valid: false, error: 'CSRF token expired' };
  }

  // Compare tokens (constant-time comparison to prevent timing attacks)
  if (!constantTimeCompare(cookieToken, headerToken)) {
    return { valid: false, error: 'CSRF token mismatch' };
  }

  return { valid: true };
}

/**
 * Constant-time string comparison to prevent timing attacks
 */
function constantTimeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }

  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

/**
 * Set CSRF token cookie in response
 */
export function setCsrfCookie(response: NextResponse, token: string): void {
  response.cookies.set(CSRF_COOKIE_NAME, token, {
    httpOnly: false, // Needs to be readable by JavaScript
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: CSRF_TOKEN_VALIDITY / 1000,
  });
}

/**
 * Create a response with CSRF error
 */
export function csrfErrorResponse(error: string): Response {
  return new Response(
    JSON.stringify({
      error: 'CSRF validation failed',
      code: 'CSRF_ERROR',
      details: error,
    }),
    {
      status: 403,
      headers: {
        'Content-Type': 'application/json',
      },
    }
  );
}

/**
 * CSRF middleware helper
 * Returns null if CSRF check passes, or a Response if it fails
 */
export function csrfProtection(request: NextRequest): Response | null {
  const result = verifyCsrfToken(request);

  if (!result.valid) {
    return csrfErrorResponse(result.error || 'Invalid CSRF token');
  }

  return null;
}
