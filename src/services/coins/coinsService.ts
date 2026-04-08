import { API_BASE_URL, getHeaders, handleResponse } from '../core/apiClient';

export const coinsService = {
  getCoinStatements: async (token: string, userId: number, page = 1, filters?: any) => {
    const queryParams = new URLSearchParams();
    queryParams.append('page', page.toString());
    queryParams.append('filter[user_id]', userId.toString());

    if (filters?.start_date) queryParams.append('filter[start_date]', filters.start_date);
    if (filters?.end_date) queryParams.append('filter[end_date]', filters.end_date);
    if (filters?.created_at) queryParams.append('filter[created_at]', filters.created_at);

    const response = await fetch(`${API_BASE_URL}/coin-statements?${queryParams.toString()}`, {
      headers: getHeaders(token),
    });
    return handleResponse(response);
  },
};
