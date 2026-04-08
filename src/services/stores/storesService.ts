import { API_BASE_URL, getHeaders, handleResponse } from '../core/apiClient';
import { Store, StoreGroup } from '../../types';

export const storesService = {
  getStores: async (token: string, page = 1, search = '') => {
    const queryParams = new URLSearchParams();
    queryParams.append('page', page.toString());
    queryParams.append('include', 'tenant,group');
    if (search) {
      const isNumeric = /^\d/.test(search.trim());
      if (isNumeric) {
        queryParams.append('filter[cnpj]', search);
      } else {
        queryParams.append('filter[name]', search);
      }
    }

    const response = await fetch(`${API_BASE_URL}/stores?${queryParams.toString()}`, {
      headers: getHeaders(token),
    });
    return handleResponse(response);
  },

  createStore: async (token: string, data: Partial<Store>) => {
    const response = await fetch(`${API_BASE_URL}/stores`, {
      method: 'POST',
      headers: getHeaders(token),
      body: JSON.stringify(data),
    });
    return handleResponse(response);
  },

  updateStore: async (token: string, id: number, data: Partial<Store>) => {
    const response = await fetch(`${API_BASE_URL}/stores/${id}`, {
      method: 'PUT',
      headers: getHeaders(token),
      body: JSON.stringify(data),
    });
    return handleResponse(response);
  },

  deleteStore: async (token: string, id: number) => {
    const response = await fetch(`${API_BASE_URL}/stores/${id}`, {
      method: 'DELETE',
      headers: getHeaders(token),
    });
    return handleResponse(response);
  },

  getStoreGroups: async (token: string) => {
    const response = await fetch(`${API_BASE_URL}/store-groups?per_page=100`, {
      headers: getHeaders(token),
    });
    return handleResponse(response);
  },

  createStoreGroup: async (token: string, data: Partial<StoreGroup>) => {
    const response = await fetch(`${API_BASE_URL}/store-groups`, {
      method: 'POST',
      headers: getHeaders(token),
      body: JSON.stringify(data),
    });
    return handleResponse(response);
  },

  updateStoreGroup: async (token: string, id: number, data: Partial<StoreGroup>) => {
    const response = await fetch(`${API_BASE_URL}/store-groups/${id}`, {
      method: 'PUT',
      headers: getHeaders(token),
      body: JSON.stringify(data),
    });
    return handleResponse(response);
  },

  deleteStoreGroup: async (token: string, id: number) => {
    const response = await fetch(`${API_BASE_URL}/store-groups/${id}`, {
      method: 'DELETE',
      headers: getHeaders(token),
    });
    return handleResponse(response);
  },
};
