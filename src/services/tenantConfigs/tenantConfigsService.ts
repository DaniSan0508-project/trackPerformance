import { API_BASE_URL, getHeaders, handleResponse } from '../core/apiClient';
import { TenantConfig } from '../../types';

export const tenantConfigsService = {
  getTenantConfigs: async (token: string, page = 1, search = '') => {
    const queryParams = new URLSearchParams();
    queryParams.append('page', page.toString());
    if (search) {
      queryParams.append('filter[search]', search);
    }

    const response = await fetch(`${API_BASE_URL}/tenant-configs?${queryParams.toString()}`, {
      headers: getHeaders(token),
    });
    return handleResponse(response);
  },

  updateTenantConfig: async (token: string, id: number, data: Partial<TenantConfig>) => {
    const response = await fetch(`${API_BASE_URL}/tenant-configs/${id}`, {
      method: 'PUT',
      headers: getHeaders(token),
      body: JSON.stringify(data),
    });
    return handleResponse(response);
  },

  uploadLogo: async (token: string, file: File) => {
    const formData = new FormData();
    formData.append('logo', file);
    const response = await fetch(`${API_BASE_URL}/tenant-configs/logo`, {
      method: 'POST',
      headers: getHeaders(token, true),
      body: formData,
    });
    return handleResponse(response);
  },
};
