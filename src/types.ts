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
  user_type?: string; // Keep optional if not always present
  user_type_id: number;
  profile_image_url: string | null;
  coin_balance?: number;
  role?: string | null;
  description?: string | null;
  external_id?: string | null;
  created_at?: string;
  updated_at?: string;
  store_id?: number | null;
  store?: Store | null;
  last_login_at?: string | null;
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
  title: string;
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

export interface RewardImage {
  id: number;
  reward_id: number;
  image_path: string;
  is_primary: boolean;
  display_order: number;
  image_full_url: string;
}

export interface Reward {
  id: number;
  tenant_id: number;
  name: string;
  description: string;
  price_coins: string | number;
  stock: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  images: RewardImage[];
  primary_image?: RewardImage;
}

export type CampaignType = 'sales' | 'engagement';
export type CampaignStatus = 'ativa' | 'pausada' | 'finalizada';

export interface Campaign {
  id: number;
  tenant_id: number;
  name: string;
  type: CampaignType;
  goal: string;
  start_date: string;
  end_date: string;
  status: CampaignStatus;
  is_active?: number; // Manter para compatibilidade com dados antigos
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  users?: User[];
  products?: CampaignProduct[];
  actions?: CampaignAction[];
  ranking?: CampaignRanking[];
}

export interface CampaignProduct {
  id: number;
  product_id: number;
  campaign_id: number;
  created_at: string;
  updated_at: string;
  product?: Product;
}

export interface Product {
  id: number;
  name: string;
  description?: string;
  price?: number;
  barcode?: string;
  created_at?: string;
  updated_at?: string;
  manufacturer_id?: number | null;
  manufacturer?: Manufacturer | null;
}

export interface Manufacturer {
  id: number;
  tenant_id: number;
  name: string;
  tax_id?: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface CampaignAction {
  id: number;
  action_id: number;
  campaign_id: number;
  coins: number;
  created_at: string;
  updated_at: string;
  action?: ActionEngagement;
}

export interface ActionEngagement {
  id: number;
  name: string;
  created_at: string;
  updated_at: string;
}

export interface CampaignRanking {
  position: number;
  user_id: number;
  user_name: string;
  user_email?: string;
  value?: number; // valor vendido (sales) ou coins acumulados (engagement)
  name: string;
  profile_image_path: string | null;
  store: {
    id: number;
    name: string;
  } | null;
  sales_amount: number | null;
  coins_total: number | null;
}

export interface Campaign {
  id: number;
  tenant_id: number;
  name: string;
  type: CampaignType;
  goal: string;
  start_date: string;
  end_date: string;
  status: CampaignStatus;
  is_active?: number; // Manter para compatibilidade com dados antigos
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  users?: User[];
  products?: CampaignProduct[];
  actions?: CampaignAction[];
  ranking?: CampaignRanking[];
  podium?: CampaignRanking[]; // Top 3 ranking retornado pela API
}

export type RedemptionStatus = 'pending' | 'approved' | 'rejected' | 'completed';

export interface Redemption {
  id: number;
  tenant_id: number;
  user_id: number;
  status: RedemptionStatus;
  total_coins_spent: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
  user?: User;
  items?: RedemptionItem[];
}

export interface RedemptionItem {
  id: number;
  redemption_id: number;
  reward_id: number;
  quantity: number;
  created_at: string;
  updated_at: string;
  reward?: Reward;
}

export type SurveyStatus = 'draft' | 'active' | 'closed';

export interface Survey {
  id: number;
  title: string;
  status: SurveyStatus;
  starts_at: string;
  ends_at: string;
  is_anonymous: boolean;
  is_published: boolean;
  coins_reward: boolean;
  views_count: number;
  questions_count: number;
  responses_count: number;
  created_at: string;
  updated_at: string;
}

export interface SurveyResultOption {
  option_id: number;
  option_text: string;
  count: number;
}

export interface SurveyResultQuestion {
  question_id: number;
  question: string;
  type: 'choice' | 'text';
  results: SurveyResultOption[];
}

export interface SurveyResults {
  survey_id: number;
  title: string;
  is_anonymous: boolean;
  total_responses: number;
  questions: SurveyResultQuestion[];
}
