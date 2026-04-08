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
    const allManufacturers: any[] = [];
    let currentPage = 1;
    let lastPage = 1;

    do {
      const queryParams = new URLSearchParams();
      queryParams.append('page', currentPage.toString());
      queryParams.append('per_page', '100');

      const response = await fetch(`${API_BASE_URL}/manufacturers?${queryParams.toString()}`, {
        headers: getHeaders(token),
      });
      const data = await handleResponse(response);
      
      allManufacturers.push(...(data.data || []));
      lastPage = data.meta?.last_page || data.last_page || 1;
      currentPage++;
    } while (currentPage <= lastPage);

    return allManufacturers;
  },
};
