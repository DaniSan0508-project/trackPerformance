export interface NotificationData {
  type?: string;
  resource?: string;
  id?: string;
  action?: string;
  coins?: string;
  [key: string]: unknown;
}

export interface NotificationItem {
  id: number;
  user_id: number;
  type: string;
  title: string;
  text: string;
  data: NotificationData | null;
  read_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface NotificationsListResponse {
  data: NotificationItem[];
  current_page?: number;
  last_page?: number;
  next_page_url?: string | null;
  total?: number;
  meta?: {
    current_page?: number;
    last_page?: number;
    per_page?: number;
    total?: number;
  };
}

export interface NotificationsListParams {
  page?: number;
  perPage?: number;
  isRead?: boolean;
  dateFrom?: string;
  dateTo?: string;
  title?: string;
  sort?: 'created_at' | 'title' | '-created_at' | '-title';
}
