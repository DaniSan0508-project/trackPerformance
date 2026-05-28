import { API_BASE_URL, handleResponse, getHeaders } from '../core/apiClient';

export interface MoodRecord {
  id: number;
  user_id: number;
  mood: 'very_bad' | 'bad' | 'neutral' | 'good' | 'very_good';
  reason: string;
  recorded_at: string;
}

export interface MoodsResponse {
  data: MoodRecord[];
  links: {
    first: string;
    last: string;
    prev: string | null;
    next: string | null;
  };
  meta: {
    current_page: number;
    from: number;
    last_page: number;
    per_page: number;
    to: number;
    total: number;
  };
}

export interface MoodFilters {
  user_id?: number;
  mood?: 'very_bad' | 'bad' | 'neutral' | 'good' | 'very_good';
  start_date?: string;
  end_date?: string;
  include?: string;
  sort?: string;
  per_page?: number;
  page?: number;
}

export const moodsService = {
  getMoods: async (token: string, filters: MoodFilters = {}): Promise<MoodsResponse> => {
    const params = new URLSearchParams();
    
    if (filters.user_id) params.append('filter[user_id]', String(filters.user_id));
    if (filters.mood) params.append('filter[mood]', filters.mood);
    if (filters.start_date) params.append('filter[start_date]', filters.start_date);
    if (filters.end_date) params.append('filter[end_date]', filters.end_date);
    if (filters.include) params.append('include', filters.include);
    if (filters.sort) params.append('sort', filters.sort);
    if (filters.per_page) params.append('per_page', String(filters.per_page));
    if (filters.page) params.append('page', String(filters.page));

    const response = await fetch(`${API_BASE_URL}/moods?${params.toString()}`, {
      method: 'GET',
      headers: getHeaders(token),
    });
    
    return handleResponse(response);
  }
};
