import { API_BASE_URL, getHeaders, handleResponse } from '../core/apiClient';
import { NotificationsListParams } from '../../types/notification';

export const notificationsService = {
  listNotifications: async (token: string, params: NotificationsListParams = {}) => {
    const queryParams = new URLSearchParams();
    queryParams.append('page', String(params.page || 1));
    queryParams.append('per_page', String(params.perPage || 20));

    if (params.isRead !== undefined) {
      queryParams.append('filter[is_read]', String(params.isRead));
    }
    if (params.dateFrom) queryParams.append('filter[date_from]', params.dateFrom);
    if (params.dateTo) queryParams.append('filter[date_to]', params.dateTo);
    if (params.title) queryParams.append('filter[title]', params.title);
    if (params.sort) queryParams.append('sort', params.sort);

    const response = await fetch(`${API_BASE_URL}/notifications?${queryParams.toString()}`, {
      headers: getHeaders(token),
    });
    return handleResponse(response);
  },

  getNotification: async (token: string, id: number) => {
    const response = await fetch(`${API_BASE_URL}/notifications/${id}`, {
      headers: getHeaders(token),
    });
    return handleResponse(response);
  },

  markAsRead: async (token: string, id: number) => {
    const response = await fetch(`${API_BASE_URL}/notifications/${id}/read`, {
      method: 'PUT',
      headers: getHeaders(token),
    });
    return handleResponse(response);
  },

  markAsUnread: async (token: string, id: number) => {
    const response = await fetch(`${API_BASE_URL}/notifications/${id}/unread`, {
      method: 'PUT',
      headers: getHeaders(token),
    });
    return handleResponse(response);
  },
};
