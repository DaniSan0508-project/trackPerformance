import { API_BASE_URL, getHeaders, handleResponse } from '../core/apiClient';
import { User } from '../../types';

export const usersService = {
  getUser: async (token: string, id: number) => {
    const response = await fetch(`${API_BASE_URL}/users/${id}`, {
      headers: getHeaders(token),
    });
    return handleResponse(response);
  },

  getUsers: async (token: string, page = 1, search = '', filterType: 'name' | 'email' = 'name') => {
    const queryParams = new URLSearchParams();
    queryParams.append('page', page.toString());
    queryParams.append('per_page', '10');
    queryParams.append('include', 'store');
    queryParams.append('sort', '-id');
    if (search) {
      queryParams.append(`filter[${filterType}]`, search);
    }

    const response = await fetch(`${API_BASE_URL}/users?${queryParams.toString()}`, {
      headers: getHeaders(token),
    });
    return handleResponse(response);
  },

  createUser: async (token: string, formData: FormData) => {
    const response = await fetch(`${API_BASE_URL}/users`, {
      method: 'POST',
      headers: getHeaders(token, true),
      body: formData,
    });
    return handleResponse(response);
  },

  updateUser: async (token: string, id: number, formData: FormData) => {
    const response = await fetch(`${API_BASE_URL}/users/${id}`, {
      method: 'POST',
      headers: getHeaders(token, true),
      body: formData,
    });
    return handleResponse(response);
  },

  deleteUser: async (token: string, id: number) => {
    const response = await fetch(`${API_BASE_URL}/users/${id}`, {
      method: 'DELETE',
      headers: getHeaders(token),
    });
    return handleResponse(response);
  },

  getAllUsers: async (token: string, page = 1, perPage = 10) => {
    const queryParams = new URLSearchParams();
    queryParams.append('page', page.toString());
    queryParams.append('per_page', perPage.toString());

    const response = await fetch(`${API_BASE_URL}/users?${queryParams.toString()}`, {
      headers: getHeaders(token),
    });
    return handleResponse(response);
  },

  getAllUsersComplete: async (token: string, search = '', filterType: 'name' | 'email' = 'name') => {
    const allUsers: User[] = [];
    let currentPage = 1;
    let lastPage = 1;

    do {
      const queryParams = new URLSearchParams();
      queryParams.append('page', currentPage.toString());
      queryParams.append('per_page', '100');
      queryParams.append('include', 'store');
      if (search) {
        queryParams.append(`filter[${filterType}]`, search);
      }

      const response = await fetch(`${API_BASE_URL}/users?${queryParams.toString()}`, {
        headers: getHeaders(token),
      });
      const data = await handleResponse(response);
      
      allUsers.push(...(data.data || []));
      lastPage = data.meta?.last_page || data.last_page || 1;
      currentPage++;
    } while (currentPage <= lastPage);

    return allUsers;
  },
};
