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

// File upload types
export type FileType = 'image' | 'video' | 'document' | 'archive' | 'other';

export interface FileUploader {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
}

export interface FileUpload {
  id: string;
  request_id: string;
  file_name: string;
  file_size: number;
  file_type: FileType;
  mime_type: string | null;
  storage_path: string;
  storage_url: string;
  thumbnail_url: string | null;
  uploaded_by: string;
  created_at: string;
  // Populated from join
  uploader?: FileUploader;
}
