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

export interface RefreshResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}
