import { API_BASE_URL, getHeaders, handleResponse } from '../core/apiClient';
import { JourneyPayload } from '../../types';

export const journeysService = {
  getJourneys: async (token: string, page = 1, status?: string, search?: string) => {
    const params = new URLSearchParams();
    params.append('page', page.toString());
    if (status && status !== 'all') params.append('status', status);
    if (search) params.append('search', search);

    const response = await fetch(`${API_BASE_URL}/journeys?${params.toString()}`, {
      headers: getHeaders(token),
    });
    return handleResponse(response);
  },

  getJourneyById: async (token: string, id: number) => {
    const response = await fetch(`${API_BASE_URL}/journeys/${id}`, {
      headers: getHeaders(token),
    });
    return handleResponse(response);
  },

  createJourney: async (token: string, data: JourneyPayload) => {
    const response = await fetch(`${API_BASE_URL}/journeys`, {
      method: 'POST',
      headers: getHeaders(token),
      body: JSON.stringify(data),
    });
    return handleResponse(response);
  },

  updateJourney: async (token: string, id: number, data: Partial<JourneyPayload>) => {
    const response = await fetch(`${API_BASE_URL}/journeys/${id}`, {
      method: 'PUT',
      headers: getHeaders(token),
      body: JSON.stringify(data),
    });
    return handleResponse(response);
  },

  publishJourney: async (token: string, id: number) => {
    const response = await fetch(`${API_BASE_URL}/journeys/${id}/publish`, {
      method: 'POST',
      headers: getHeaders(token),
    });
    return handleResponse(response);
  },

  deleteJourney: async (token: string, id: number) => {
    const response = await fetch(`${API_BASE_URL}/journeys/${id}`, {
      method: 'DELETE',
      headers: getHeaders(token),
    });
    return handleResponse(response);
  },

  getJourneyParticipants: async (token: string, id: number, perPage = 20, offset = 0) => {
    const params = new URLSearchParams();
    params.append('per_page', perPage.toString());
    params.append('offset', offset.toString());

    const response = await fetch(`${API_BASE_URL}/journeys/${id}/participants?${params.toString()}`, {
      headers: getHeaders(token),
    });
    return handleResponse(response);
  },

  getJourneyStats: async (token: string, id: number) => {
    const response = await fetch(`${API_BASE_URL}/journeys/${id}/stats`, {
      headers: getHeaders(token),
    });
    return handleResponse(response);
  },

  getJourneyUsers: async (token: string, page = 1, perPage = 15) => {
    const params = new URLSearchParams();
    params.append('page', page.toString());
    params.append('per_page', perPage.toString());

    const response = await fetch(`${API_BASE_URL}/journeys/users?${params.toString()}`, {
      headers: getHeaders(token),
    });
    return handleResponse(response);
  },
};
