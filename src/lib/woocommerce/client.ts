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

export class WooCommerceClient {
  private baseUrl: string;
  private auth: string;

  constructor() {
    this.baseUrl = `${WOO_STORE_URL}/wp-json/wc/v3`;
    this.auth = Buffer.from(`${WOO_CONSUMER_KEY}:${WOO_CONSUMER_SECRET}`).toString('base64');
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
  async getAllOrders(status?: string): Promise<any[]> {
    const allOrders: any[] = [];
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

      const orders = await this.request<any[]>(`/orders?${params.toString()}`);
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
// Update these IDs to match your WooCommerce products
export const PRODUCT_PLAN_MAP: Record<number, { tier: 'standard' | 'pro'; maxActive: number }> = {
  // Example: Standard Plan product ID -> standard tier
  // 123: { tier: 'standard', maxActive: 1 },
  // Example: Pro Plan product ID -> pro tier
  // 456: { tier: 'pro', maxActive: 2 },
};

export function getPlanFromProducts(
  lineItems: Array<{ product_id: number; name: string }>
): { tier: 'standard' | 'pro'; maxActive: number } {
  // Find the first matching product
  for (const item of lineItems) {
    const plan = PRODUCT_PLAN_MAP[item.product_id];
    if (plan) return plan;
  }

  // Default to standard if no match found
  return { tier: 'standard', maxActive: 1 };
}
