import { API_BASE_URL, getHeaders, handleResponse } from '../core/apiClient';

export const dashboardService = {
  getDashboard: async (token: string) => {
    const response = await fetch(`${API_BASE_URL}/dashboard`, {
      headers: getHeaders(token),
    });
    return handleResponse(response);
  },

  getActiveCampaigns: async (token: string) => {
    const response = await fetch(`${API_BASE_URL}/dashboard/active-campaigns`, {
      headers: getHeaders(token),
    });
    return handleResponse(response);
  },

  getEngagementIndex: async (token: string) => {
    const response = await fetch(`${API_BASE_URL}/dashboard/engagement-index`, {
      headers: getHeaders(token),
    });
    return handleResponse(response);
  },

  getTopCollaborators: async (token: string) => {
    const response = await fetch(`${API_BASE_URL}/dashboard/top-collaborators`, {
      headers: getHeaders(token),
    });
    return handleResponse(response);
  },

  getEngagementActionsSummary: async (token: string, period?: string) => {
    const query = period ? `?period=${encodeURIComponent(period)}` : '';
    const response = await fetch(`${API_BASE_URL}/dashboard/engagement-actions-summary${query}`, {
      headers: getHeaders(token),
    });
    return handleResponse(response);
  },

  getEngagementActions: async (token: string) => {
    const response = await fetch(`${API_BASE_URL}/engagement-actions`, {
      headers: getHeaders(token),
    });
    return handleResponse(response);
  },
};
