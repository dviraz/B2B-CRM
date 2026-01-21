import crypto from 'crypto';

const WOO_STORE_URL = process.env.WOO_STORE_URL!;
const WOO_CONSUMER_KEY = process.env.WOO_CONSUMER_KEY!;
const WOO_CONSUMER_SECRET = process.env.WOO_CONSUMER_SECRET!;

export interface WooLineItem {
  product_id: number;
  name: string;
  quantity: number;
  subtotal: string;
  total: string;
}

export interface WooBilling {
  first_name: string;
  last_name: string;
  company: string;
  email: string;
  phone: string;
  address_1: string;
  city: string;
  state: string;
  country: string;
}

export interface WooSubscription {
  id: number;
  status: string;
  customer_id: number;
  billing_period: string;
  billing_interval: number;
  next_payment_date: string;
  start_date: string;
  end_date: string | null;
  total: string;
  billing: WooBilling;
  line_items: WooLineItem[];
}

export interface WooCustomer {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  billing: WooBilling;
}

export interface WooOrder {
  id: number;
  status: string;
  customer_id: number;
  total: string;
  date_created: string;
  date_modified: string;
  billing: WooBilling;
  line_items: WooLineItem[];
}

export class WooCommerceClient {
  private baseUrl: string;
  private auth: string;

  constructor() {
    if (!WOO_STORE_URL || !WOO_CONSUMER_KEY || !WOO_CONSUMER_SECRET) {
      throw new Error('WooCommerce credentials not configured. Set WOO_STORE_URL, WOO_CONSUMER_KEY, and WOO_CONSUMER_SECRET environment variables.');
    }
    this.baseUrl = `${WOO_STORE_URL}/wp-json/wc/v3`;
    this.auth = Buffer.from(`${WOO_CONSUMER_KEY}:${WOO_CONSUMER_SECRET}`).toString('base64');
  }

  static isConfigured(): boolean {
    return !!(WOO_STORE_URL && WOO_CONSUMER_KEY && WOO_CONSUMER_SECRET);
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const response = await fetch(url, {
      ...options,
      headers: {
        'Authorization': `Basic ${this.auth}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`WooCommerce API error: ${response.status} - ${error}`);
    }

    return response.json();
  }

  async getSubscription(subscriptionId: number): Promise<WooSubscription> {
    return this.request<WooSubscription>(`/subscriptions/${subscriptionId}`);
  }

  async suspendSubscription(subscriptionId: number): Promise<WooSubscription> {
    return this.request<WooSubscription>(`/subscriptions/${subscriptionId}`, {
      method: 'PUT',
      body: JSON.stringify({ status: 'on-hold' }),
    });
  }

  async reactivateSubscription(subscriptionId: number): Promise<WooSubscription> {
    return this.request<WooSubscription>(`/subscriptions/${subscriptionId}`, {
      method: 'PUT',
      body: JSON.stringify({ status: 'active' }),
    });
  }

  async cancelSubscription(subscriptionId: number): Promise<WooSubscription> {
    return this.request<WooSubscription>(`/subscriptions/${subscriptionId}`, {
      method: 'PUT',
      body: JSON.stringify({ status: 'cancelled' }),
    });
  }

  async getCustomer(customerId: number): Promise<WooCustomer> {
    return this.request<WooCustomer>(`/customers/${customerId}`);
  }

  /**
   * Fetch all subscriptions with pagination
   * WooCommerce API returns max 100 per page
   */
  async getAllSubscriptions(status?: string): Promise<WooSubscription[]> {
    const allSubscriptions: WooSubscription[] = [];
    let page = 1;
    const perPage = 100;
    let hasMore = true;

    while (hasMore) {
      const params = new URLSearchParams({
        page: String(page),
        per_page: String(perPage),
      });

      if (status) {
        params.set('status', status);
      }

      const subscriptions = await this.request<WooSubscription[]>(
        `/subscriptions?${params.toString()}`
      );

      allSubscriptions.push(...subscriptions);

      if (subscriptions.length < perPage) {
        hasMore = false;
      } else {
        page++;
      }
    }

    return allSubscriptions;
  }

  /**
   * Fetch subscriptions for a specific customer
   */
  async getCustomerSubscriptions(customerId: number): Promise<WooSubscription[]> {
    return this.request<WooSubscription[]>(`/subscriptions?customer=${customerId}`);
  }

  /**
   * Get all orders (for one-time purchases)
   */
  async getAllOrders(status?: string): Promise<WooOrder[]> {
    const allOrders: WooOrder[] = [];
    let page = 1;
    const perPage = 100;
    let hasMore = true;

    while (hasMore) {
      const params = new URLSearchParams({
        page: String(page),
        per_page: String(perPage),
      });

      if (status) {
        params.set('status', status);
      }

      const orders = await this.request<WooOrder[]>(`/orders?${params.toString()}`);
      allOrders.push(...orders);

      if (orders.length < perPage) {
        hasMore = false;
      } else {
        page++;
      }
    }

    return allOrders;
  }
}

export function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(payload, 'utf8')
    .digest('base64');

  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}

// Product ID to plan tier mapping
// Configure these in .env.local or hardcode your WooCommerce product IDs here
// Format: WOO_STANDARD_PRODUCT_IDS=123,456,789
// Format: WOO_PRO_PRODUCT_IDS=111,222,333
function buildProductPlanMap(): Record<number, { tier: 'standard' | 'pro'; maxActive: number }> {
  const map: Record<number, { tier: 'standard' | 'pro'; maxActive: number }> = {};

  // Get product IDs from environment variables
  const standardIds = process.env.WOO_STANDARD_PRODUCT_IDS?.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id)) || [];
  const proIds = process.env.WOO_PRO_PRODUCT_IDS?.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id)) || [];

  // Map standard plan products
  standardIds.forEach(id => {
    map[id] = { tier: 'standard', maxActive: 1 };
  });

  // Map pro plan products
  proIds.forEach(id => {
    map[id] = { tier: 'pro', maxActive: 2 };
  });

  // Fallback to hardcoded values if environment variables not set
  // TODO: Replace these example IDs with your actual WooCommerce product IDs
  if (Object.keys(map).length === 0) {
    console.warn('⚠️  WARNING: No WooCommerce product plan mapping configured!');
    console.warn('⚠️  All subscriptions will default to Standard plan.');
    console.warn('⚠️  Configure WOO_STANDARD_PRODUCT_IDS and WOO_PRO_PRODUCT_IDS in .env.local');

    // Example hardcoded mapping (replace with your actual product IDs):
    // map[123] = { tier: 'standard', maxActive: 1 };
    // map[456] = { tier: 'pro', maxActive: 2 };
  }

  return map;
}

export const PRODUCT_PLAN_MAP = buildProductPlanMap();

export function getPlanFromProducts(
  lineItems: Array<{ product_id: number; name: string }>
): { tier: 'standard' | 'pro'; maxActive: number } {
  // Find the first matching product
  for (const item of lineItems) {
    const plan = PRODUCT_PLAN_MAP[item.product_id];
    if (plan) {
      console.log(`✓ Mapped product ${item.product_id} (${item.name}) to ${plan.tier} plan`);
      return plan;
    }
  }

  // Log warning for unmapped products
  const productInfo = lineItems.map(item => `${item.product_id} (${item.name})`).join(', ');
  console.warn(`⚠️  WARNING: No plan mapping found for products: ${productInfo}`);
  console.warn(`⚠️  Defaulting to standard plan. Configure product IDs in PRODUCT_PLAN_MAP or environment variables.`);

  // Default to standard if no match found
  return { tier: 'standard', maxActive: 1 };
}
