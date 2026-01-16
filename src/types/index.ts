import type { Company, RequestStatus } from './database';

export * from './database';

// API Response types
export interface ApiError {
  error: string;
  code?: string;
  details?: Record<string, unknown>;
}

export interface ApiSuccess<T> {
  data: T;
}

export type ApiResponse<T> = ApiSuccess<T> | ApiError;

// WooCommerce Webhook types
export interface WooWebhookPayload {
  id: number;
  status: 'active' | 'on-hold' | 'cancelled' | 'pending' | 'expired';
  customer_id: number;
  billing: {
    email: string;
    first_name: string;
    last_name: string;
    company?: string;
  };
  line_items: Array<{
    product_id: number;
    name: string;
  }>;
}

// Kanban types
export interface KanbanColumn {
  id: string;
  title: string;
  status: RequestStatus;
}

export interface DragEndEvent {
  requestId: string;
  newStatus: RequestStatus;
  newIndex: number;
}

// Company with computed fields
export interface CompanyWithStats extends Company {
  active_request_count: number;
}
