import {
  string,
  number,
  boolean,
  email,
  url,
  uuid,
  datetime,
  oneOf,
  optional,
  object,
  array,
  validateFile,
  FILE_VALIDATION,
} from '@/lib/validation';

describe('Validation Utilities', () => {
  describe('string validator', () => {
    it('should validate required strings', () => {
      const validator = string();
      expect(validator('hello').success).toBe(true);
      expect(validator('').success).toBe(false);
      expect(validator(null).success).toBe(false);
    });

    it('should validate optional strings', () => {
      const validator = string({ required: false });
      expect(validator('').success).toBe(true);
      expect(validator(null).success).toBe(true);
    });

    it('should validate min length', () => {
      const validator = string({ minLength: 3 });
      expect(validator('ab').success).toBe(false);
      expect(validator('abc').success).toBe(true);
    });

    it('should validate max length', () => {
      const validator = string({ maxLength: 5 });
      expect(validator('hello').success).toBe(true);
      expect(validator('hello world').success).toBe(false);
    });

    it('should validate patterns', () => {
      const validator = string({ pattern: /^[A-Z]+$/ });
      expect(validator('ABC').success).toBe(true);
      expect(validator('abc').success).toBe(false);
    });

    it('should trim by default', () => {
      const validator = string();
      const result = validator('  hello  ');
      expect(result.success).toBe(true);
      expect(result.data).toBe('hello');
    });
  });

  describe('number validator', () => {
    it('should validate numbers', () => {
      const validator = number();
      expect(validator(42).success).toBe(true);
      expect(validator('42').success).toBe(true);
      expect(validator('not a number').success).toBe(false);
    });

    it('should validate min value', () => {
      const validator = number({ min: 10 });
      expect(validator(5).success).toBe(false);
      expect(validator(10).success).toBe(true);
    });

    it('should validate max value', () => {
      const validator = number({ max: 100 });
      expect(validator(100).success).toBe(true);
      expect(validator(101).success).toBe(false);
    });

    it('should validate integers', () => {
      const validator = number({ integer: true });
      expect(validator(42).success).toBe(true);
      expect(validator(42.5).success).toBe(false);
    });
  });

  describe('boolean validator', () => {
    it('should validate booleans', () => {
      const validator = boolean();
      expect(validator(true).success).toBe(true);
      expect(validator(false).success).toBe(true);
    });

    it('should accept string representations', () => {
      const validator = boolean();
      expect(validator('true').data).toBe(true);
      expect(validator('false').data).toBe(false);
      expect(validator('1').data).toBe(true);
      expect(validator('0').data).toBe(false);
    });
  });

  describe('email validator', () => {
    it('should validate emails', () => {
      const validator = email();
      expect(validator('test@example.com').success).toBe(true);
      expect(validator('invalid-email').success).toBe(false);
    });
  });

  describe('url validator', () => {
    it('should validate URLs', () => {
      const validator = url();
      expect(validator('https://example.com').success).toBe(true);
      expect(validator('not-a-url').success).toBe(false);
    });
  });

  describe('uuid validator', () => {
    it('should validate UUIDs', () => {
      const validator = uuid();
      expect(validator('550e8400-e29b-41d4-a716-446655440000').success).toBe(true);
      expect(validator('not-a-uuid').success).toBe(false);
    });
  });

  describe('datetime validator', () => {
    it('should validate ISO date strings', () => {
      const validator = datetime();
      expect(validator('2024-01-15T10:30:00Z').success).toBe(true);
      expect(validator('not-a-date').success).toBe(false);
    });
  });

  describe('oneOf validator', () => {
    it('should validate enum values', () => {
      const validator = oneOf(['active', 'paused', 'churned'] as const);
      expect(validator('active').success).toBe(true);
      expect(validator('invalid').success).toBe(false);
    });
  });

  describe('optional validator', () => {
    it('should make validators optional', () => {
      const validator = optional(number());
      expect(validator(undefined).success).toBe(true);
      expect(validator(null).success).toBe(true);
      expect(validator(42).success).toBe(true);
    });
  });

  describe('object validator', () => {
    it('should validate object schemas', () => {
      const validator = object({
        name: string(),
        age: number({ min: 0 }),
        email: email(),
      });

      const validResult = validator({
        name: 'John',
        age: 30,
        email: 'john@example.com',
      });

      expect(validResult.success).toBe(true);

      const invalidResult = validator({
        name: '',
        age: -5,
        email: 'invalid',
      });

      expect(invalidResult.success).toBe(false);
      expect(invalidResult.errors?.length).toBeGreaterThan(0);
    });

    it('should include field names in errors', () => {
      const validator = object({
        username: string({ minLength: 3 }),
      });

      const result = validator({ username: 'ab' });
      expect(result.success).toBe(false);
      expect(result.errors?.[0].field).toBe('username');
    });
  });

  describe('array validator', () => {
    it('should validate arrays', () => {
      const validator = array(string());
      expect(validator(['a', 'b', 'c']).success).toBe(true);
      expect(validator([1, 2, 3]).success).toBe(false);
    });

    it('should validate array length', () => {
      const validator = array(string(), { minLength: 1, maxLength: 3 });
      expect(validator([]).success).toBe(false);
      expect(validator(['a']).success).toBe(true);
      expect(validator(['a', 'b', 'c', 'd']).success).toBe(false);
    });
  });

  describe('validateFile', () => {
    it('should validate file size', () => {
      const result = validateFile(
        'large-file.jpg',
        20 * 1024 * 1024, // 20MB
        'image/jpeg',
        FILE_VALIDATION.image
      );

      expect(result.success).toBe(false);
      expect(result.errors?.some(e => e.code === 'FILE_TOO_LARGE')).toBe(true);
    });

    it('should validate file type', () => {
      const result = validateFile(
        'script.exe',
        1024,
        'application/x-executable',
        FILE_VALIDATION.image
      );

      expect(result.success).toBe(false);
      expect(result.errors?.some(e => e.code === 'INVALID_FILE_TYPE')).toBe(true);
    });

    it('should validate file extension', () => {
      const result = validateFile(
        'image.txt',
        1024,
        'image/jpeg',
        FILE_VALIDATION.image
      );

      expect(result.success).toBe(false);
      expect(result.errors?.some(e => e.code === 'INVALID_EXTENSION')).toBe(true);
    });

    it('should reject path traversal attempts', () => {
      const result = validateFile(
        '../../../etc/passwd',
        1024,
        'text/plain',
        FILE_VALIDATION.default
      );

      expect(result.success).toBe(false);
      expect(result.errors?.some(e => e.code === 'INVALID_FILENAME')).toBe(true);
    });

    it('should accept valid files', () => {
      const result = validateFile(
        'photo.jpg',
        1024 * 1024, // 1MB
        'image/jpeg',
        FILE_VALIDATION.image
      );

      expect(result.success).toBe(true);
    });
  });
});
