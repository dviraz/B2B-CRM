/**
 * Standardized error handling utilities
 * Provides consistent error codes and responses across the API
 */

import { NextResponse } from 'next/server';

// ============================================
// ERROR CODES
// ============================================

export const ErrorCode = {
  // Authentication errors (401)
  UNAUTHORIZED: 'UNAUTHORIZED',
  INVALID_TOKEN: 'INVALID_TOKEN',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',

  // Authorization errors (403)
  FORBIDDEN: 'FORBIDDEN',
  INSUFFICIENT_PERMISSIONS: 'INSUFFICIENT_PERMISSIONS',
  COMPANY_INACTIVE: 'COMPANY_INACTIVE',
  LIMIT_REACHED: 'LIMIT_REACHED',

  // Validation errors (400)
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  INVALID_INPUT: 'INVALID_INPUT',
  MISSING_FIELD: 'MISSING_FIELD',
  INVALID_FORMAT: 'INVALID_FORMAT',
  INVALID_STATUS_TRANSITION: 'INVALID_STATUS_TRANSITION',

  // Not found errors (404)
  NOT_FOUND: 'NOT_FOUND',
  RESOURCE_NOT_FOUND: 'RESOURCE_NOT_FOUND',

  // Conflict errors (409)
  CONFLICT: 'CONFLICT',
  DUPLICATE_ENTRY: 'DUPLICATE_ENTRY',
  ALREADY_EXISTS: 'ALREADY_EXISTS',

  // Rate limiting (429)
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',

  // Server errors (500)
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  DATABASE_ERROR: 'DATABASE_ERROR',
  EXTERNAL_SERVICE_ERROR: 'EXTERNAL_SERVICE_ERROR',

  // CSRF errors (403)
  CSRF_ERROR: 'CSRF_ERROR',
} as const;

export type ErrorCodeType = typeof ErrorCode[keyof typeof ErrorCode];

// ============================================
// ERROR CLASS
// ============================================

export class ApiError extends Error {
  public readonly code: ErrorCodeType;
  public readonly statusCode: number;
  public readonly details?: Record<string, unknown>;

  constructor(
    message: string,
    code: ErrorCodeType,
    statusCode: number = 500,
    details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
  }

  toJSON() {
    return {
      error: this.message,
      code: this.code,
      ...(this.details && { details: this.details }),
    };
  }
}

// ============================================
// ERROR FACTORIES
// ============================================

export const Errors = {
  // 401 Unauthorized
  unauthorized: (message = 'Unauthorized') =>
    new ApiError(message, ErrorCode.UNAUTHORIZED, 401),

  invalidToken: (message = 'Invalid or expired token') =>
    new ApiError(message, ErrorCode.INVALID_TOKEN, 401),

  // 403 Forbidden
  forbidden: (message = 'Access denied') =>
    new ApiError(message, ErrorCode.FORBIDDEN, 403),

  insufficientPermissions: (message = 'Insufficient permissions') =>
    new ApiError(message, ErrorCode.INSUFFICIENT_PERMISSIONS, 403),

  companyInactive: (message = 'Your subscription is not active') =>
    new ApiError(message, ErrorCode.COMPANY_INACTIVE, 403),

  limitReached: (message: string, details?: Record<string, unknown>) =>
    new ApiError(message, ErrorCode.LIMIT_REACHED, 403, details),

  csrf: (message = 'CSRF validation failed') =>
    new ApiError(message, ErrorCode.CSRF_ERROR, 403),

  // 400 Bad Request
  validation: (message: string, details?: Record<string, unknown>) =>
    new ApiError(message, ErrorCode.VALIDATION_ERROR, 400, details),

  invalidInput: (message: string, field?: string) =>
    new ApiError(message, ErrorCode.INVALID_INPUT, 400, field ? { field } : undefined),

  missingField: (field: string) =>
    new ApiError(`${field} is required`, ErrorCode.MISSING_FIELD, 400, { field }),

  invalidStatusTransition: (from: string, to: string) =>
    new ApiError(
      `Cannot move from ${from} to ${to}`,
      ErrorCode.INVALID_STATUS_TRANSITION,
      400,
      { from, to }
    ),

  // 404 Not Found
  notFound: (resource = 'Resource') =>
    new ApiError(`${resource} not found`, ErrorCode.NOT_FOUND, 404),

  // 409 Conflict
  conflict: (message: string) =>
    new ApiError(message, ErrorCode.CONFLICT, 409),

  duplicate: (resource: string) =>
    new ApiError(`${resource} already exists`, ErrorCode.DUPLICATE_ENTRY, 409),

  // 429 Rate Limited
  rateLimited: (retryAfter: number) =>
    new ApiError('Too many requests', ErrorCode.RATE_LIMIT_EXCEEDED, 429, { retryAfter }),

  // 500 Internal Server Error
  internal: (message = 'Internal server error') =>
    new ApiError(message, ErrorCode.INTERNAL_ERROR, 500),

  database: (message = 'Database error') =>
    new ApiError(message, ErrorCode.DATABASE_ERROR, 500),

  externalService: (service: string, message?: string) =>
    new ApiError(
      message || `Error communicating with ${service}`,
      ErrorCode.EXTERNAL_SERVICE_ERROR,
      500,
      { service }
    ),
};

// ============================================
// RESPONSE HELPERS
// ============================================

/**
 * Create an error response from an ApiError
 */
export function errorResponse(error: ApiError): NextResponse {
  return NextResponse.json(error.toJSON(), { status: error.statusCode });
}

/**
 * Create a success response
 */
export function successResponse<T>(data: T, status = 200): NextResponse {
  return NextResponse.json(data, { status });
}

/**
 * Handle errors in API routes
 */
export function handleError(error: unknown): NextResponse {
  // Log the error for debugging
  console.error('API Error:', error);

  // Known API errors
  if (error instanceof ApiError) {
    return errorResponse(error);
  }

  // Supabase errors
  if (error && typeof error === 'object' && 'code' in error) {
    const supabaseError = error as { code: string; message?: string };

    // Map common Supabase error codes
    switch (supabaseError.code) {
      case '23505': // Unique violation
        return errorResponse(Errors.duplicate('Resource'));
      case '23503': // Foreign key violation
        return errorResponse(Errors.validation('Referenced resource does not exist'));
      case '42501': // Insufficient privilege
        return errorResponse(Errors.forbidden('Database access denied'));
      case 'PGRST116': // Not found
        return errorResponse(Errors.notFound());
      default:
        return errorResponse(Errors.database(supabaseError.message));
    }
  }

  // Generic errors
  if (error instanceof Error) {
    return errorResponse(Errors.internal(error.message));
  }

  // Unknown errors
  return errorResponse(Errors.internal());
}

// ============================================
// LOGGER
// ============================================

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  context?: Record<string, unknown>;
}

/**
 * Structured logger for consistent logging
 */
export const logger = {
  _log(level: LogLevel, message: string, context?: Record<string, unknown>) {
    const entry: LogEntry = {
      level,
      message,
      timestamp: new Date().toISOString(),
      ...(context && { context }),
    };

    // In production, you might send this to a logging service
    if (level === 'error') {
      console.error(JSON.stringify(entry));
    } else if (level === 'warn') {
      console.warn(JSON.stringify(entry));
    } else if (level === 'debug' && process.env.NODE_ENV === 'development') {
      console.debug(JSON.stringify(entry));
    } else {
      console.log(JSON.stringify(entry));
    }
  },

  debug(message: string, context?: Record<string, unknown>) {
    this._log('debug', message, context);
  },

  info(message: string, context?: Record<string, unknown>) {
    this._log('info', message, context);
  },

  warn(message: string, context?: Record<string, unknown>) {
    this._log('warn', message, context);
  },

  error(message: string, error?: unknown, context?: Record<string, unknown>) {
    const errorContext = {
      ...context,
      ...(error instanceof Error && {
        errorMessage: error.message,
        errorStack: error.stack,
      }),
    };
    this._log('error', message, errorContext);
  },
};
