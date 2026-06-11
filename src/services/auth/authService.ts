import { API_BASE_URL, getHeaders, handleResponse } from '../core/apiClient';

const API_SECRET = import.meta.env.VITE_API_SECRET || '';

interface LoginCredentials {
  email: string;
  password: string;
  domain: string;
}

export const authService = {
  login: async (credentials: LoginCredentials) => {
    const response = await fetch(`${API_BASE_URL}/portal/login`, {
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

  requestResetCode: async (email: string, domain: string) => {
    const response = await fetch(`${API_BASE_URL}/portal/password/reset-code`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ email: email.toLowerCase().trim(), domain }),
    });
    return handleResponse(response);
  },

  resetPassword: async (email: string, domain: string, code: string, password: string, passwordConfirmation: string) => {
    const response = await fetch(`${API_BASE_URL}/portal/password/reset`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({
        email: email.toLowerCase().trim(),
        domain,
        code,
        password,
        password_confirmation: passwordConfirmation,
      }),
    });
    return handleResponse(response);
  },
};
