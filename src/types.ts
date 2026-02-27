export interface TenantConfig {
  id: number;
  tenant_id: number;
  config_key: string;
  config_value: string;
  created_at: string;
  updated_at: string;
}

export interface PaginatedResponse<T> {
  current_page: number;
  data: T[];
  first_page_url: string;
  from: number;
  last_page: number;
  last_page_url: string;
  links: {
    url: string | null;
    label: string;
    active: boolean;
  }[];
  next_page_url: string | null;
  path: string;
  per_page: number;
  prev_page_url: string | null;
  to: number;
  total: number;
}

export interface User {
  id: number;
  name: string;
  email: string;
  tenant_id: number;
  user_type: string;
  profile_image_url: string | null;
}

export interface Tenant {
  id: number;
  trading_name: string;
  is_active: number;
}

export interface AuthResponse {
  access_token: string;
  refresh_token?: string;
  token_type: string;
  expires_in: number;
  user: User;
  tenant: Tenant;
}

export interface RefreshResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

export interface StoreGroup {
  id: number;
  name: string;
  active: boolean;
}

export interface Store {
  id: number;
  name: string;
  cnpj: string;
  email: string;
  phone: string;
  active: boolean;
  tenant_id: number;
  store_group_id: number | null;
  created_at: string;
  updated_at: string;
  tenant?: Tenant;
  group?: StoreGroup;
}

export interface Like {
  id: number;
  user_id: number;
  post_id: number;
  created_at: string;
  updated_at: string;
  user?: User;
}

export interface Comment {
  id: number;
  user_id: number;
  post_id: number;
  text: string;
  created_at: string;
  updated_at: string;
  user?: User;
}

export interface Post {
  id: number;
  user_id: number;
  survey_id: number | null;
  content: string;
  image_url: string | null;
  earns_coins: boolean;
  created_at: string;
  updated_at: string;
  image_full_url: string | null;
  user?: User;
  likes?: Like[];
  likes_count?: number;
  comments?: Comment[];
  comments_count?: number;
}

export interface Feedback {
  id: number;
  sender_id?: number;
  recipient_id: number;
  content: string;
  is_anonymous: boolean;
  created_at: string;
  updated_at: string;
  sender?: User | { anonymous: boolean };
  recipient?: User;
}
