import { API_BASE_URL, getHeaders, handleResponse } from '../core/apiClient';
import { RedemptionStatus } from '../../types';

export const redemptionsService = {
  createRedemption: async (token: string, data: { items: { reward_id: number; quantity: number }[] }) => {
    const response = await fetch(`${API_BASE_URL}/redemptions`, {
      method: 'POST',
      headers: getHeaders(token),
      body: JSON.stringify(data),
    });
    return handleResponse(response);
  },

  getRedemptions: async (token: string, page = 1, filters: any = {}) => {
    const queryParams = new URLSearchParams();
    queryParams.append('page', page.toString());
    if (filters.status) queryParams.append('filter[status]', filters.status);
    if (filters.user_id) queryParams.append('filter[user_id]', filters.user_id.toString());
    if (filters.per_page) queryParams.append('per_page', filters.per_page.toString());
    queryParams.append('include', 'user,items,items.reward,reward.hist');

    const response = await fetch(`${API_BASE_URL}/redemptions?${queryParams.toString()}`, {
      headers: getHeaders(token),
    });
    return handleResponse(response);
  },

  updateRedemptionStatus: async (token: string, id: number, status: RedemptionStatus, notes?: string) => {
    const response = await fetch(`${API_BASE_URL}/redemptions/${id}`, {
      method: 'PUT',
      headers: getHeaders(token),
      body: JSON.stringify({ status, notes }),
    });
    return handleResponse(response);
  },

  approveRedemption: async (token: string, id: number) => {
    const response = await fetch(`${API_BASE_URL}/redemptions/${id}/approve`, {
      method: 'PUT',
      headers: getHeaders(token),
    });
    return handleResponse(response);
  },

  rejectRedemption: async (token: string, id: number) => {
    const response = await fetch(`${API_BASE_URL}/redemptions/${id}/reject`, {
      method: 'PUT',
      headers: getHeaders(token),
    });
    return handleResponse(response);
  },

  completeRedemption: async (token: string, id: number) => {
    const response = await fetch(`${API_BASE_URL}/redemptions/${id}/complete`, {
      method: 'PUT',
      headers: getHeaders(token),
    });
    return handleResponse(response);
  },
};
