import { API_BASE_URL, getHeaders, handleResponse } from '../core/apiClient';
import { Communication, CommunicationFeed, CommunicationView } from '../../types/communication';

export const communicationsService = {
  // Admin endpoints
  getCommunications: async (token: string, page = 1, search = '', status?: string) => {
    const queryParams = new URLSearchParams();
    queryParams.append('page', page.toString());
    if (search) queryParams.append('filter[title]', search);
    if (status && status !== 'all') queryParams.append('filter[status]', status);

    const response = await fetch(`${API_BASE_URL}/communications?${queryParams.toString()}`, {
      headers: getHeaders(token),
    });
    return handleResponse(response);
  },

  getCommunication: async (token: string, id: number) => {
    const response = await fetch(`${API_BASE_URL}/communications/${id}`, {
      headers: getHeaders(token),
    });
    return handleResponse(response);
  },

  createCommunication: async (token: string, data: {
    title: string;
    content: string;
    target_all: boolean;
    target_user_ids?: number[];
    is_draft: boolean;
    scheduled_at?: string;
  }) => {
    const response = await fetch(`${API_BASE_URL}/communications`, {
      method: 'POST',
      headers: getHeaders(token),
      body: JSON.stringify(data),
    });
    return handleResponse(response);
  },

  updateCommunication: async (token: string, id: number, data: {
    title?: string;
    content?: string;
    target_all?: boolean;
    target_user_ids?: number[];
    scheduled_at?: string;
  }) => {
    const response = await fetch(`${API_BASE_URL}/communications/${id}`, {
      method: 'POST',
      headers: getHeaders(token),
      body: JSON.stringify(data),
    });
    return handleResponse(response);
  },

  deleteCommunication: async (token: string, id: number) => {
    const response = await fetch(`${API_BASE_URL}/communications/${id}`, {
      method: 'DELETE',
      headers: getHeaders(token),
    });
    return handleResponse(response);
  },

  publishCommunication: async (token: string, id: number) => {
    const response = await fetch(`${API_BASE_URL}/communications/${id}/publish`, {
      method: 'POST',
      headers: getHeaders(token),
    });
    return handleResponse(response);
  },

  archiveCommunication: async (token: string, id: number) => {
    const response = await fetch(`${API_BASE_URL}/communications/${id}/archive`, {
      method: 'POST',
      headers: getHeaders(token),
    });
    return handleResponse(response);
  },

  getCommunicationViews: async (token: string, id: number) => {
    const response = await fetch(`${API_BASE_URL}/communications/admin/${id}/views`, {
      headers: getHeaders(token),
    });
    return handleResponse(response);
  },

  getCommunicationStats: async (token: string, id: number) => {
    const response = await fetch(`${API_BASE_URL}/communications/admin/${id}/stats`, {
      headers: getHeaders(token),
    });
    return handleResponse(response);
  },

  // User feed endpoints
  getCommunicationFeed: async (token: string, page = 1, search = '') => {
    const queryParams = new URLSearchParams();
    queryParams.append('page', page.toString());
    if (search) queryParams.append('filter[title]', search);

    const response = await fetch(`${API_BASE_URL}/app/communications/feed?${queryParams.toString()}`, {
      headers: getHeaders(token),
    });
    return handleResponse(response);
  },

  markAsRead: async (token: string, id: number) => {
    const response = await fetch(`${API_BASE_URL}/communications/${id}/mark-read`, {
      method: 'POST',
      headers: getHeaders(token),
    });
    return handleResponse(response);
  },
};
