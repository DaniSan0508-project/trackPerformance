import { API_BASE_URL, getHeaders, handleResponse } from '../core/apiClient';

export const authService = {
  login: async (credentials: any) => {
    const response = await fetch(`${API_BASE_URL}/login`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(credentials),
    });
    return handleResponse(response);
  },

  refreshToken: async (token: string) => {
    const response = await fetch(`${API_BASE_URL}/refresh`, {
      method: 'POST',
      headers: getHeaders(token),
    });
    return handleResponse(response);
  },
};
