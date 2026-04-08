import { API_BASE_URL, getHeaders, handleResponse } from '../core/apiClient';

export const rolesService = {
  getRoles: async (token: string, page = 1, search = '') => {
    const queryParams = new URLSearchParams();
    queryParams.append('page', page.toString());
    queryParams.append('per_page', '10');
    if (search) {
      queryParams.append('filter[description]', search);
    }
    queryParams.append('sort', 'description');

    const response = await fetch(`${API_BASE_URL}/roles?${queryParams.toString()}`, {
      headers: getHeaders(token),
    });
    return handleResponse(response);
  },

  getAllRoles: async (token: string) => {
    const response = await fetch(`${API_BASE_URL}/roles?per_page=9999`, {
      headers: getHeaders(token),
    });
    return handleResponse(response);
  },

  createRole: async (token: string, data: { description: string }) => {
    const response = await fetch(`${API_BASE_URL}/roles`, {
      method: 'POST',
      headers: getHeaders(token),
      body: JSON.stringify(data),
    });
    return handleResponse(response);
  },

  updateRole: async (token: string, id: number, data: { description: string }) => {
    const response = await fetch(`${API_BASE_URL}/roles/${id}`, {
      method: 'PUT',
      headers: getHeaders(token),
      body: JSON.stringify(data),
    });
    return handleResponse(response);
  },

  deleteRole: async (token: string, id: number) => {
    const response = await fetch(`${API_BASE_URL}/roles/${id}`, {
      method: 'DELETE',
      headers: getHeaders(token),
    });
    return handleResponse(response);
  },
};
