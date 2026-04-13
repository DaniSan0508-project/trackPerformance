import { API_BASE_URL, getHeaders, handleResponse } from '../core/apiClient';
import { Product } from '../../types';

export const productsService = {
  getProductsPaginated: async (token: string, page = 1, search = '', filterType: 'name' | 'barcode' = 'name', manufacturerId?: number) => {
    const queryParams = new URLSearchParams();
    queryParams.append('page', page.toString());
    queryParams.append('per_page', '10');
    if (search) {
      queryParams.append(`filter[${filterType}]`, search);
    }
    if (manufacturerId) {
      queryParams.append('filter[manufacturer_id]', manufacturerId.toString());
    }

    const response = await fetch(`${API_BASE_URL}/products?${queryParams.toString()}`, {
      headers: getHeaders(token),
    });
    return handleResponse(response);
  },

  getProducts: async (token: string, page = 1, perPage = 10) => {
    const queryParams = new URLSearchParams();
    queryParams.append('page', page.toString());
    queryParams.append('per_page', perPage.toString());

    const response = await fetch(`${API_BASE_URL}/products?${queryParams.toString()}`, {
      headers: getHeaders(token),
    });
    return handleResponse(response);
  },

  getAllProductsComplete: async (token: string, search = '', filterType: 'name' | 'barcode' = 'name') => {
    const queryParams = new URLSearchParams();
    queryParams.append('page', '1');
    queryParams.append('per_page', '9999');
    if (search) {
      queryParams.append(`filter[${filterType}]`, search);
    }

    const response = await fetch(`${API_BASE_URL}/products?${queryParams.toString()}`, {
      headers: getHeaders(token),
    });
    const data = await handleResponse(response);

    return data.data || [];
  },

  createProduct: async (token: string, data: {
    barcode: string;
    name: string;
    manufacturer_id: number;
    product_group_id?: number | null;
  }) => {
    const response = await fetch(`${API_BASE_URL}/products`, {
      method: 'POST',
      headers: getHeaders(token),
      body: JSON.stringify(data),
    });
    return handleResponse(response);
  },

  getAllProductGroups: async (token: string) => {
    const queryParams = new URLSearchParams();
    queryParams.append('page', '1');
    queryParams.append('per_page', '9999');

    const response = await fetch(`${API_BASE_URL}/product-groups?${queryParams.toString()}`, {
      headers: getHeaders(token),
    });
    const data = await handleResponse(response);

    return data.data || [];
  },
};
