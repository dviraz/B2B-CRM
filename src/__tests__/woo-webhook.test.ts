import crypto from 'crypto';
import {
  verifyWebhookSignature,
  getPlanFromProducts,
  PRODUCT_PLAN_MAP,
} from '@/lib/woocommerce/client';

// Mock product IDs for testing
const MOCK_PRO_PRODUCT_ID = 999;
const MOCK_STANDARD_PRODUCT_ID = 998;

describe('WooCommerce Webhook Utilities', () => {
  describe('verifyWebhookSignature', () => {
    it('should return true for valid signature', () => {
      const secret = 'test-secret';
      const body = '{"test": "data"}';

      // Create a valid HMAC signature
      const expectedSignature = crypto
        .createHmac('sha256', secret)
        .update(body, 'utf8')
        .digest('base64');

      expect(verifyWebhookSignature(body, expectedSignature, secret)).toBe(true);
    });

    it('should return false for invalid signature', () => {
      const secret = 'test-secret';
      const body = '{"test": "data"}';

      // Create a signature with a different secret
      const invalidSignature = crypto
        .createHmac('sha256', 'wrong-secret')
        .update(body, 'utf8')
        .digest('base64');

      expect(verifyWebhookSignature(body, invalidSignature, secret)).toBe(false);
    });
  });

  describe('getPlanFromProducts', () => {
    beforeAll(() => {
      // Set up test product mappings
      PRODUCT_PLAN_MAP[MOCK_PRO_PRODUCT_ID] = { tier: 'pro', maxActive: 2 };
      PRODUCT_PLAN_MAP[MOCK_STANDARD_PRODUCT_ID] = { tier: 'standard', maxActive: 1 };
    });

    afterAll(() => {
      // Clean up test mappings
      delete PRODUCT_PLAN_MAP[MOCK_PRO_PRODUCT_ID];
      delete PRODUCT_PLAN_MAP[MOCK_STANDARD_PRODUCT_ID];
    });

    it('should return pro tier for mapped Pro plan products', () => {
      const lineItems = [
        { product_id: MOCK_PRO_PRODUCT_ID, name: 'Pro Plan Monthly' },
      ];

      const plan = getPlanFromProducts(lineItems);
      expect(plan.tier).toBe('pro');
      expect(plan.maxActive).toBe(2);
    });

    it('should return standard tier for mapped Standard plan products', () => {
      const lineItems = [
        { product_id: MOCK_STANDARD_PRODUCT_ID, name: 'Standard Plan Monthly' },
      ];

      const plan = getPlanFromProducts(lineItems);
      expect(plan.tier).toBe('standard');
      expect(plan.maxActive).toBe(1);
    });

    it('should return standard tier for unmapped products', () => {
      const lineItems = [
        { product_id: 12345, name: 'Unknown Plan' },
      ];

      const plan = getPlanFromProducts(lineItems);
      expect(plan.tier).toBe('standard');
      expect(plan.maxActive).toBe(1);
    });

    it('should return standard tier for empty line items', () => {
      const lineItems: { product_id: number; name: string }[] = [];

      const plan = getPlanFromProducts(lineItems);
      expect(plan.tier).toBe('standard');
      expect(plan.maxActive).toBe(1);
    });

    it('should use the first matched product when multiple items exist', () => {
      const lineItems = [
        { product_id: 12345, name: 'Unknown Product' },
        { product_id: MOCK_PRO_PRODUCT_ID, name: 'Pro Plan' },
        { product_id: MOCK_STANDARD_PRODUCT_ID, name: 'Standard Plan' },
      ];

      const plan = getPlanFromProducts(lineItems);
      expect(plan.tier).toBe('pro');
      expect(plan.maxActive).toBe(2);
    });
  });
});
