import { API_BASE_URL, getHeaders, handleResponse } from '../core/apiClient';

export const manufacturersService = {
  getManufacturersPaginated: async (token: string, page = 1, search = '') => {
    const queryParams = new URLSearchParams();
    queryParams.append('page', page.toString());
    queryParams.append('per_page', '10');
    if (search) {
      queryParams.append('filter[name]', search);
    }
    const response = await fetch(`${API_BASE_URL}/manufacturers?${queryParams.toString()}`, {
      headers: getHeaders(token),
    });
    return handleResponse(response);
  },

  createManufacturer: async (token: string, data: { name: string }) => {
    const response = await fetch(`${API_BASE_URL}/manufacturers`, {
      method: 'POST',
      headers: getHeaders(token),
      body: JSON.stringify(data),
    });
    return handleResponse(response);
  },

  getAllManufacturers: async (token: string) => {
    const queryParams = new URLSearchParams();
    queryParams.append('page', '1');
    queryParams.append('per_page', '9999');

    const response = await fetch(`${API_BASE_URL}/manufacturers?${queryParams.toString()}`, {
      headers: getHeaders(token),
    });
    const data = await handleResponse(response);

    return data.data || [];
  },

  updateManufacturer: async (token: string, id: number, data: { name: string }) => {
    const response = await fetch(`${API_BASE_URL}/manufacturers/${id}`, {
      method: 'PUT',
      headers: getHeaders(token),
      body: JSON.stringify(data),
    });
    return handleResponse(response);
  },

  deleteManufacturer: async (token: string, id: number) => {
    const response = await fetch(`${API_BASE_URL}/manufacturers/${id}`, {
      method: 'DELETE',
      headers: getHeaders(token),
    });
    return handleResponse(response);
  },
};
