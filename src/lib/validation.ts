/**
 * Input validation utilities for API routes
 * Provides schema-based validation for request bodies
 */

// ============================================
// VALIDATION TYPES
// ============================================

export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

export interface ValidationResult<T> {
  success: boolean;
  data?: T;
  errors?: ValidationError[];
}

type Validator<T> = (value: unknown) => ValidationResult<T>;

// ============================================
// PRIMITIVE VALIDATORS
// ============================================

/**
 * Validate string with options
 */
export function string(options?: {
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  trim?: boolean;
  required?: boolean;
}): Validator<string> {
  return (value: unknown): ValidationResult<string> => {
    const opts = { trim: true, required: true, ...options };

    if (value === undefined || value === null || value === '') {
      if (opts.required) {
        return { success: false, errors: [{ field: '', message: 'Value is required', code: 'REQUIRED' }] };
      }
      return { success: true, data: '' };
    }

    if (typeof value !== 'string') {
      return { success: false, errors: [{ field: '', message: 'Must be a string', code: 'INVALID_TYPE' }] };
    }

    let str = opts.trim ? value.trim() : value;

    if (opts.minLength && str.length < opts.minLength) {
      return { success: false, errors: [{ field: '', message: `Must be at least ${opts.minLength} characters`, code: 'TOO_SHORT' }] };
    }

    if (opts.maxLength && str.length > opts.maxLength) {
      return { success: false, errors: [{ field: '', message: `Must be at most ${opts.maxLength} characters`, code: 'TOO_LONG' }] };
    }

    if (opts.pattern && !opts.pattern.test(str)) {
      return { success: false, errors: [{ field: '', message: 'Invalid format', code: 'INVALID_FORMAT' }] };
    }

    return { success: true, data: str };
  };
}

/**
 * Validate email
 */
export function email(options?: { required?: boolean }): Validator<string> {
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return string({ ...options, pattern: emailPattern, maxLength: 255 });
}

/**
 * Validate URL
 */
export function url(options?: { required?: boolean }): Validator<string> {
  return (value: unknown): ValidationResult<string> => {
    if (value === undefined || value === null || value === '') {
      if (options?.required !== false) {
        return { success: false, errors: [{ field: '', message: 'URL is required', code: 'REQUIRED' }] };
      }
      return { success: true, data: '' };
    }

    if (typeof value !== 'string') {
      return { success: false, errors: [{ field: '', message: 'Must be a string', code: 'INVALID_TYPE' }] };
    }

    try {
      new URL(value);
      return { success: true, data: value };
    } catch {
      return { success: false, errors: [{ field: '', message: 'Invalid URL', code: 'INVALID_URL' }] };
    }
  };
}

/**
 * Validate number
 */
export function number(options?: {
  min?: number;
  max?: number;
  integer?: boolean;
  required?: boolean;
}): Validator<number> {
  return (value: unknown): ValidationResult<number> => {
    const opts = { required: true, ...options };

    if (value === undefined || value === null || value === '') {
      if (opts.required) {
        return { success: false, errors: [{ field: '', message: 'Value is required', code: 'REQUIRED' }] };
      }
      return { success: true, data: 0 };
    }

    const num = typeof value === 'string' ? parseFloat(value) : value;

    if (typeof num !== 'number' || isNaN(num)) {
      return { success: false, errors: [{ field: '', message: 'Must be a number', code: 'INVALID_TYPE' }] };
    }

    if (opts.integer && !Number.isInteger(num)) {
      return { success: false, errors: [{ field: '', message: 'Must be an integer', code: 'NOT_INTEGER' }] };
    }

    if (opts.min !== undefined && num < opts.min) {
      return { success: false, errors: [{ field: '', message: `Must be at least ${opts.min}`, code: 'TOO_SMALL' }] };
    }

    if (opts.max !== undefined && num > opts.max) {
      return { success: false, errors: [{ field: '', message: `Must be at most ${opts.max}`, code: 'TOO_LARGE' }] };
    }

    return { success: true, data: num };
  };
}

/**
 * Validate boolean
 */
export function boolean(options?: { required?: boolean }): Validator<boolean> {
  return (value: unknown): ValidationResult<boolean> => {
    if (value === undefined || value === null) {
      if (options?.required !== false) {
        return { success: false, errors: [{ field: '', message: 'Value is required', code: 'REQUIRED' }] };
      }
      return { success: true, data: false };
    }

    if (typeof value === 'boolean') {
      return { success: true, data: value };
    }

    if (value === 'true' || value === '1') {
      return { success: true, data: true };
    }

    if (value === 'false' || value === '0') {
      return { success: true, data: false };
    }

    return { success: false, errors: [{ field: '', message: 'Must be a boolean', code: 'INVALID_TYPE' }] };
  };
}

/**
 * Validate enum/literal
 */
export function oneOf<T extends string | number>(
  values: readonly T[],
  options?: { required?: boolean }
): Validator<T> {
  return (value: unknown): ValidationResult<T> => {
    if (value === undefined || value === null || value === '') {
      if (options?.required !== false) {
        return { success: false, errors: [{ field: '', message: 'Value is required', code: 'REQUIRED' }] };
      }
      return { success: true, data: values[0] };
    }

    if (!values.includes(value as T)) {
      return {
        success: false,
        errors: [{ field: '', message: `Must be one of: ${values.join(', ')}`, code: 'INVALID_VALUE' }]
      };
    }

    return { success: true, data: value as T };
  };
}

/**
 * Validate UUID
 */
export function uuid(options?: { required?: boolean }): Validator<string> {
  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return string({ ...options, pattern: uuidPattern });
}

/**
 * Validate date/datetime string
 */
export function datetime(options?: { required?: boolean }): Validator<string> {
  return (value: unknown): ValidationResult<string> => {
    if (value === undefined || value === null || value === '') {
      if (options?.required !== false) {
        return { success: false, errors: [{ field: '', message: 'Date is required', code: 'REQUIRED' }] };
      }
      return { success: true, data: '' };
    }

    if (typeof value !== 'string') {
      return { success: false, errors: [{ field: '', message: 'Must be a string', code: 'INVALID_TYPE' }] };
    }

    const date = new Date(value);
    if (isNaN(date.getTime())) {
      return { success: false, errors: [{ field: '', message: 'Invalid date format', code: 'INVALID_DATE' }] };
    }

    return { success: true, data: value };
  };
}

/**
 * Make a validator optional
 */
export function optional<T>(validator: Validator<T>): Validator<T | undefined> {
  return (value: unknown): ValidationResult<T | undefined> => {
    if (value === undefined || value === null || value === '') {
      return { success: true, data: undefined };
    }
    return validator(value);
  };
}

// ============================================
// OBJECT VALIDATOR
// ============================================

type SchemaDefinition = Record<string, Validator<unknown>>;
type InferSchema<S extends SchemaDefinition> = {
  [K in keyof S]: S[K] extends Validator<infer T> ? T : never;
};

/**
 * Validate an object against a schema
 */
export function object<S extends SchemaDefinition>(
  schema: S
): Validator<InferSchema<S>> {
  return (value: unknown): ValidationResult<InferSchema<S>> => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return { success: false, errors: [{ field: '', message: 'Must be an object', code: 'INVALID_TYPE' }] };
    }

    const result: Record<string, unknown> = {};
    const errors: ValidationError[] = [];
    const obj = value as Record<string, unknown>;

    for (const [key, validator] of Object.entries(schema)) {
      const fieldResult = validator(obj[key]);

      if (!fieldResult.success && fieldResult.errors) {
        errors.push(...fieldResult.errors.map(e => ({
          ...e,
          field: e.field ? `${key}.${e.field}` : key,
        })));
      } else if (fieldResult.data !== undefined) {
        result[key] = fieldResult.data;
      }
    }

    if (errors.length > 0) {
      return { success: false, errors };
    }

    return { success: true, data: result as InferSchema<S> };
  };
}

/**
 * Validate an array
 */
export function array<T>(itemValidator: Validator<T>, options?: {
  minLength?: number;
  maxLength?: number;
  required?: boolean;
}): Validator<T[]> {
  return (value: unknown): ValidationResult<T[]> => {
    if (value === undefined || value === null) {
      if (options?.required !== false) {
        return { success: false, errors: [{ field: '', message: 'Value is required', code: 'REQUIRED' }] };
      }
      return { success: true, data: [] };
    }

    if (!Array.isArray(value)) {
      return { success: false, errors: [{ field: '', message: 'Must be an array', code: 'INVALID_TYPE' }] };
    }

    if (options?.minLength && value.length < options.minLength) {
      return { success: false, errors: [{ field: '', message: `Must have at least ${options.minLength} items`, code: 'TOO_FEW' }] };
    }

    if (options?.maxLength && value.length > options.maxLength) {
      return { success: false, errors: [{ field: '', message: `Must have at most ${options.maxLength} items`, code: 'TOO_MANY' }] };
    }

    const result: T[] = [];
    const errors: ValidationError[] = [];

    for (let i = 0; i < value.length; i++) {
      const itemResult = itemValidator(value[i]);
      if (!itemResult.success && itemResult.errors) {
        errors.push(...itemResult.errors.map(e => ({
          ...e,
          field: e.field ? `[${i}].${e.field}` : `[${i}]`,
        })));
      } else if (itemResult.data !== undefined) {
        result.push(itemResult.data);
      }
    }

    if (errors.length > 0) {
      return { success: false, errors };
    }

    return { success: true, data: result };
  };
}

// ============================================
// FILE VALIDATION
// ============================================

export interface FileValidationOptions {
  maxSize?: number; // In bytes
  allowedTypes?: string[]; // MIME types
  allowedExtensions?: string[];
}

export const FILE_VALIDATION = {
  // Default: 10MB max
  default: {
    maxSize: 10 * 1024 * 1024,
    allowedTypes: ['image/*', 'application/pdf', 'video/*', 'application/zip'],
  },
  // Images: 5MB max
  image: {
    maxSize: 5 * 1024 * 1024,
    allowedTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'],
    allowedExtensions: ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'],
  },
  // Documents: 20MB max
  document: {
    maxSize: 20 * 1024 * 1024,
    allowedTypes: [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/plain',
      'text/csv',
    ],
    allowedExtensions: ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.txt', '.csv'],
  },
  // Videos: 100MB max
  video: {
    maxSize: 100 * 1024 * 1024,
    allowedTypes: ['video/mp4', 'video/webm', 'video/quicktime'],
    allowedExtensions: ['.mp4', '.webm', '.mov'],
  },
} as const;

/**
 * Validate file metadata
 */
export function validateFile(
  fileName: string,
  fileSize: number,
  mimeType: string,
  options: FileValidationOptions = FILE_VALIDATION.default
): ValidationResult<{ fileName: string; fileSize: number; mimeType: string }> {
  const errors: ValidationError[] = [];

  // Validate file size
  if (options.maxSize && fileSize > options.maxSize) {
    const maxMB = Math.round(options.maxSize / 1024 / 1024);
    errors.push({
      field: 'fileSize',
      message: `File size exceeds maximum of ${maxMB}MB`,
      code: 'FILE_TOO_LARGE',
    });
  }

  // Validate MIME type
  if (options.allowedTypes && options.allowedTypes.length > 0) {
    const isTypeAllowed = options.allowedTypes.some(allowed => {
      if (allowed.endsWith('/*')) {
        const prefix = allowed.slice(0, -1);
        return mimeType.startsWith(prefix);
      }
      return mimeType === allowed;
    });

    if (!isTypeAllowed) {
      errors.push({
        field: 'mimeType',
        message: `File type ${mimeType} is not allowed`,
        code: 'INVALID_FILE_TYPE',
      });
    }
  }

  // Validate extension
  if (options.allowedExtensions && options.allowedExtensions.length > 0) {
    const ext = '.' + fileName.split('.').pop()?.toLowerCase();
    if (!options.allowedExtensions.includes(ext)) {
      errors.push({
        field: 'fileName',
        message: `File extension ${ext} is not allowed`,
        code: 'INVALID_EXTENSION',
      });
    }
  }

  // Validate filename for path traversal
  if (fileName.includes('..') || fileName.includes('/') || fileName.includes('\\')) {
    errors.push({
      field: 'fileName',
      message: 'Invalid file name',
      code: 'INVALID_FILENAME',
    });
  }

  if (errors.length > 0) {
    return { success: false, errors };
  }

  return { success: true, data: { fileName, fileSize, mimeType } };
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Create a validation error response
 */
export function validationErrorResponse(errors: ValidationError[]): Response {
  return new Response(
    JSON.stringify({
      error: 'Validation failed',
      code: 'VALIDATION_ERROR',
      details: errors,
    }),
    {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    }
  );
}

/**
 * Validate request body against a schema
 */
export async function validateBody<S extends SchemaDefinition>(
  request: Request,
  schema: S
): Promise<ValidationResult<InferSchema<S>>> {
  try {
    const body = await request.json();
    return object(schema)(body);
  } catch {
    return {
      success: false,
      errors: [{ field: '', message: 'Invalid JSON body', code: 'INVALID_JSON' }],
    };
  }
}
