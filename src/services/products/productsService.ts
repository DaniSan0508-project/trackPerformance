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
    const allProducts: Product[] = [];
    let currentPage = 1;
    let lastPage = 1;

    do {
      const queryParams = new URLSearchParams();
      queryParams.append('page', currentPage.toString());
      queryParams.append('per_page', '100');
      if (search) {
        queryParams.append(`filter[${filterType}]`, search);
      }

      const response = await fetch(`${API_BASE_URL}/products?${queryParams.toString()}`, {
        headers: getHeaders(token),
      });
      const data = await handleResponse(response);
      
      allProducts.push(...(data.data || []));
      lastPage = data.meta?.last_page || data.last_page || 1;
      currentPage++;
    } while (currentPage <= lastPage);

    return allProducts;
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
    const allGroups: any[] = [];
    let currentPage = 1;
    let lastPage = 1;

    do {
      const queryParams = new URLSearchParams();
      queryParams.append('page', currentPage.toString());
      queryParams.append('per_page', '100');

      const response = await fetch(`${API_BASE_URL}/product-groups?${queryParams.toString()}`, {
        headers: getHeaders(token),
      });
      const data = await handleResponse(response);

      allGroups.push(...(data.data || []));
      lastPage = data.meta?.last_page || data.last_page || 1;
      currentPage++;
    } while (currentPage <= lastPage);

    return allGroups;
  },
};
