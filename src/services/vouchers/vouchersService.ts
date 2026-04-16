import { API_BASE_URL, getHeaders, handleResponse } from '../core/apiClient';

export const vouchersService = {
  getVouchers: async (token: string, page = 1, filters: any = {}) => {
    const queryParams = new URLSearchParams();
    queryParams.append('page', page.toString());
    
    if (filters.reward_id) queryParams.append('filter[reward_id]', filters.reward_id.toString());
    if (filters.user_id) queryParams.append('filter[user_id]', filters.user_id.toString());
    if (filters.status) queryParams.append('filter[status]', filters.status);
    if (filters.used_at_from) queryParams.append('filter[used_at_from]', filters.used_at_from);
    if (filters.used_at_until) queryParams.append('filter[used_at_until]', filters.used_at_until);
    
    if (filters.sort) queryParams.append('sort', filters.sort);
    if (filters.per_page) queryParams.append('per_page', filters.per_page.toString());

    const response = await fetch(`${API_BASE_URL}/vouchers?${queryParams.toString()}`, {
      headers: getHeaders(token),
    });
    return handleResponse(response);
  },
};
