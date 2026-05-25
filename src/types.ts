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

export interface Role {
  id: number;
  tenant_id: number;
  description: string;
  created_at: string;
  updated_at: string;
}

export interface User {
  id: number;
  name: string;
  username?: string | null;
  email: string;
  phone?: string | null;
  tenant_id: number;
  user_type?: string; // Keep optional if not always present
  user_type_id: number;
  is_super_admin: boolean;
  profile_image_url: string | null;
  coin_balance?: number;
  role_id?: number | null;
  role?: string | null;
  description?: string | null;
  external_id?: string | null;
  created_at?: string;
  updated_at?: string;
  store_id?: number | null;
  store?: Store | null;
  last_login_at?: string | null;
  journey_level?: JourneyLevelBadge | null;
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

export interface QuizAlternative {
  id?: number;
  text: string;
  is_correct: boolean;
  order?: number;
}

export interface QuizAnswer {
  id: number;
  user_id: number;
  alternative_id: number;
  is_correct: boolean;
  created_at: string;
  user: {
    id: number;
    name: string;
    profile_image_url: string | null;
    journey_level?: JourneyLevelBadge | null;
  };
  id: number | null;
  post_id: number;
  image_path?: string;
  image_full_url?: string;
  url: string;
  created_at?: string;
  updated_at?: string;
}

export interface Post {
  id: number;
  user_id: number;
  survey_id: number | null;
  title: string;
  content: string;
  post_type?: 'standard' | 'quiz';
  quiz_question?: string | null;
  quiz_coins_participation?: number | null;
  quiz_coins_correct?: number | null;
  quiz_alternatives?: QuizAlternative[];
  quiz_answers?: QuizAnswer[];
  quiz_answers_count?: number;
  image_url: string | null;
  video_url: string | null;
  earns_coins: boolean;
  is_sponsored?: boolean;
  is_boosted?: boolean;
  boost_like_coins?: number;
  boost_comment_coins?: number;
  boost_share_coins?: number;
  created_at: string;
  updated_at: string;
  image_full_url: string | null;
  video_thumbnail_url?: string | null;
  user?: User;
  likes?: Like[];
  likes_count?: number;
  comments?: Comment[];
  comments_count?: number;
  images?: PostImage[];
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
  reward_type: 'standard' | 'campaign';
  fulfillment_type: 'physical' | 'voucher';
  valid_until?: string;
  voucher_instructions?: string;
  voucher_validity_days?: number | null;
  is_expired?: boolean;
  is_available?: boolean;
  created_at: string;
  updated_at: string;
  images: RewardImage[];
  primary_image?: RewardImage;
}

export type CampaignType = 'sales' | 'engagement';
export type CampaignStatus = 'ativa' | 'inativa' | 'pausada' | 'finalizada';

export interface Campaign {
  id: number;
  tenant_id: number;
  name: string;
  type: CampaignType;
  goal: string;
  goal_campaign?: string | number | null;
  start_date: string;
  end_date: string;
  status: CampaignStatus;
  is_active?: number | boolean; // Manter para compatibilidade com dados antigos
  is_public?: boolean;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  users?: User[];
  products?: CampaignProduct[];
  actions?: CampaignAction[];
  hashtags?: CampaignHashtag[];
  ranking?: CampaignRanking[];
  podium?: CampaignRanking[]; // Top 3 ranking retornado pela API
  reward_id?: number | string | null;
  reward?: Reward | null;
  winner_user_id?: number | null;
  winner?: User | null;
  prize_approved_at?: string | null;
}

export interface CampaignHashtag {
  hashtag: string;
  coins: number;
  campaign_name?: string;
}

export interface CampaignProduct {
  id: number;
  product_id: number;
  campaign_id: number;
  created_at: string;
  updated_at: string;
  product?: Product;
}

export interface ProductGroup {
  id: number;
  name: string;
}

export interface Product {
  id: number;
  tenant_id?: number;
  name: string;
  description?: string;
  price?: number;
  barcode?: string;
  created_at?: string | null;
  updated_at?: string | null;
  manufacturer_id?: number | null;
  manufacturer?: Manufacturer | null;
  group_id?: number | null;
  group?: ProductGroup | null;
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

export interface EngagementAction {
  id: number;
  name: string;
  is_enabled?: boolean;
  in_use?: boolean;
  campaign: {
    id: number;
    name: string;
  } | null;
}

export interface CampaignRanking {
  position: number;
  user_id: number;
  user_name: string;
  user_email?: string;
  value?: number; // valor vendido (sales) ou coins acumulados (engagement)
  name: string;
  profile_image_path: string | null;
  profile_image_url?: string | null;
  store: {
    id: number;
    name: string;
  } | null;
  sales_amount: number | null;
  coins_total: number | null;
}


export type RedemptionStatus = 'pending' | 'approved' | 'rejected' | 'completed';

export interface RedemptionStatusHistory {
  status: RedemptionStatus;
  occurred_at: string;
}

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
  status_histories?: RedemptionStatusHistory[];
}

export type VoucherStatus = 'generated' | 'available' | 'redeemed' | 'validated' | 'activated' | 'used' | 'expired';

export interface Voucher {
  id: number;
  code: string;
  status: VoucherStatus;
  expires_at: string | null;
  used_at: string | null;
  used_location: {
    latitude: number;
    longitude: number;
  } | null;
  user: {
    id: number;
    name: string;
    email: string;
  };
  reward: {
    id: number;
    name: string;
    description: string;
  };
  created_at: string;
  updated_at: string;
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
  participants_count?: number;
  created_at: string;
  updated_at: string;
}

export interface SurveyResultTextOption {
  text_answer: string;
  answered_at?: string;
  user_id: number;
  user: {
    id: number;
    name: string;
    profile_image_path?: string | null;
    profile_image_url?: string | null;
    answered_at?: string;
    journey_level?: JourneyLevelBadge | null;
  };
}

export interface SurveyResultChoiceOption {
  option_id: number;
  option_text: string;
  count: number;
  users: Array<{
    id: number;
    name: string;
    profile_image_path?: string | null;
    profile_image_url?: string | null;
    answered_at?: string;
    journey_level?: JourneyLevelBadge | null;
  }>;
}

export interface SurveyResultQuestion {
  question_id: number;
  question: string;
  type: 'choice' | 'text' | 'nps' | 'satisfaction' | 'satisfaction_10';
  results: SurveyResultTextOption[] | SurveyResultChoiceOption[];
}

export interface SurveySatisfactionReport {
  total_answers: number;
  promoters: number; // Notas >= 5
  detractors: number; // Notas <= 4
  nps_score: number;
  distribution: Array<{
    option_text: string;
    total: number;
  }>;
}

export interface SurveyNPSSummary {
  total_answers: number;
  promoters: number;
  detractors: number;
  neutrals: number;
  nps_score: number;
}

export interface SurveyResults {
  survey_id: number;
  title: string;
  is_anonymous: boolean;
  total_responses: number;
  questions: SurveyResultQuestion[];
  nps_summary?: SurveyNPSSummary;
}

export interface CoinStatement {
  id: number;
  tenant_id: number;
  user_id: number;
  campaign_id: number | null;
  action_id: number | null;
  value: number;
  operation: 'credit' | 'debit';
  reference_type: string;
  reference_id: number;
  reward_date?: string;
  date: string;
  description: string;
  created_at: string;
  user?: {
    id: number;
    name: string;
    email: string;
  };
}

export interface CoinStatementSummary {
  total_credits: number;
  total_debits: number;
}

export interface CoinStatementResponse {
  summary: CoinStatementSummary;
  current_page: number;
  data: CoinStatement[];
  first_page_url: string;
  from: number;
  last_page: number;
  last_page_url: string;
  links: Array<{
    url: string | null;
    label: string;
    active: boolean;
  }>;
  next_page_url: string | null;
  path: string;
  per_page: number;
  prev_page_url: string | null;
  to: number;
  total: number;
}

export interface HashtagRewardApproval {
  id: number;
  status: string;
  coins: number;
  reference_type: string;
  reference_id: number;
  created_at: string;
  approved_at: string | null;
  user: {
    id: number;
    name: string;
    profile_image_url?: string | null;
    journey_level?: JourneyLevelBadge | null;
  };
  hashtag: string;
  campaign_name: string;
  approved_by: string | null;
}

export interface RewardApproval {
  id: number;
  user_id: number;
  approval_type: 'hashtag' | 'post_share';
  coins: number;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  updated_at: string;
  hashtag?: string;
  campaign_name?: string;
  post_title?: string; // Título do post para post_share
  user: {
    id: number;
    name: string;
    profile_image_url: string | null;
    journey_level?: JourneyLevelBadge | null;
  };
}

export interface CampaignSalesImportError {
  row: number;
  reason: string;
  external_id: string;
}

export interface CampaignSalesImport {
  id: number;
  filename: string;
  total_rows: number;
  success_count: number;
  error_count: number;
  errors: CampaignSalesImportError[];
  imported_by: {
    id: number;
    name: string;
  };
  created_at: string;
}

export interface JourneyLevelBadge {
  journey_id: number;
  journey_name: string;
  level_name: string;
  level_icon: string;
  level_color: string | null;
  level_position: number;
  xp: number;
}

// ─── Journey (Jornadas) ───────────────────────────────────────────────────────

export type JourneyStatus = 'draft' | 'active' | 'ended';

export interface JourneyLevel {
  id: number;
  position: number;
  name: string;
  icon: string;
  color?: string | null;
  xp_threshold: number;
}

export interface Journey {
  id: number;
  name: string;
  description: string | null;
  status: JourneyStatus;
  start_date: string;
  end_date: string;
  coins_factor: number;
  participant_ids: number[] | null;
  prize_reward_id: number | null;
  published_at: string | null;
  created_by: { id: number; name: string } | null;
  campaigns: { id: number; name: string }[];
  levels: JourneyLevel[];
  stats?: {
    participants_count: number;
    average_xp: number;
  };
  created_at: string;
  updated_at: string;
}

export interface JourneyLevelPayload {
  position: number;
  name: string;
  icon: string;
  color?: string | null;
  xp_threshold: number;
}

export interface JourneyPayload {
  name: string;
  description?: string | null;
  start_date: string;
  end_date: string;
  coins_factor: number;
  participant_ids?: number[] | null;
  prize_reward_id?: number | null;
  campaign_ids?: number[];
  levels: JourneyLevelPayload[];
}

export interface JourneyParticipantRank {
  position: number;
  user: { id: number; name: string };
  xp: number;
  level: JourneyLevel | null;
  joined_at?: string;
}

export interface JourneyStats {
  participants_count: number;
  average_xp: number;
  top_10: JourneyParticipantRank[];
  level_distribution: {
    level: JourneyLevel;
    count: number;
  }[];
}

export interface JourneyMe {
  journey_id: number;
  user_id: number;
  xp: number;
  rank_position: number;
  joined_at: string;
  level: JourneyLevel | null;
  next_level: {
    id: number;
    name: string;
    xp_threshold: number;
    xp_remaining: number;
  } | null;
}
