import { PaginatedResponse, Store, StoreGroup, TenantConfig } from '../types';

const API_BASE_URL = 'http://localhost:8012/api/v1';

export const api = {
  login: async (credentials: any) => {
    const response = await fetch(`${API_BASE_URL}/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(credentials),
    });
    if (!response.ok) throw new Error('Falha na autenticação');
    return response.json();
  },

  refreshToken: async (token: string) => {
    const response = await fetch(`${API_BASE_URL}/refresh`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
      },
    });
    if (!response.ok) throw new Error('Falha ao atualizar token');
    return response.json();
  },

  getStores: async (token: string, page = 1, search = '') => {
    const queryParams = new URLSearchParams();
    queryParams.append('page', page.toString());
    queryParams.append('include', 'tenant,group');
    if (search) {
      queryParams.append('filter[name]', search);
    }

    const response = await fetch(`${API_BASE_URL}/stores?${queryParams.toString()}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
      },
    });
    if (!response.ok) throw new Error('Falha ao carregar lojas');
    return response.json() as Promise<PaginatedResponse<Store>>;
  },

  getStoreGroups: async (token: string) => {
    const response = await fetch(`${API_BASE_URL}/store-groups?per_page=100`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
      },
    });
    if (!response.ok) throw new Error('Falha ao carregar grupos');
    return response.json();
  },

  getTenantConfigs: async (token: string, page = 1, search = '') => {
    const queryParams = new URLSearchParams();
    queryParams.append('page', page.toString());
    if (search) {
      queryParams.append('filter[search]', search);
    }

    const response = await fetch(`${API_BASE_URL}/tenant-configs?${queryParams.toString()}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
      },
    });
    if (!response.ok) throw new Error('Falha ao carregar configurações');
    return response.json() as Promise<PaginatedResponse<TenantConfig>>;
  },

  updateTenantConfig: async (token: string, id: number, data: Partial<TenantConfig>) => {
    const response = await fetch(`${API_BASE_URL}/tenant-configs/${id}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Falha ao atualizar configuração');
    return response.json();
  },

  createStore: async (token: string, data: Partial<Store>) => {
    const response = await fetch(`${API_BASE_URL}/stores`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Falha ao criar loja');
    return response.json();
  },

  updateStore: async (token: string, id: number, data: Partial<Store>) => {
    const response = await fetch(`${API_BASE_URL}/stores/${id}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Falha ao atualizar loja');
    return response.json();
  },

  deleteStore: async (token: string, id: number) => {
    const response = await fetch(`${API_BASE_URL}/stores/${id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
      },
    });
    if (!response.ok) throw new Error('Falha ao excluir loja');
    if (response.status === 204) {
      return;
    }
    return response.json();
  },

  createStoreGroup: async (token: string, data: Partial<StoreGroup>) => {
    const response = await fetch(`${API_BASE_URL}/store-groups`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Falha ao criar grupo');
    return response.json();
  },

  updateStoreGroup: async (token: string, id: number, data: Partial<StoreGroup>) => {
    const response = await fetch(`${API_BASE_URL}/store-groups/${id}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Falha ao atualizar grupo');
    return response.json();
  },

  deleteStoreGroup: async (token: string, id: number) => {
    const response = await fetch(`${API_BASE_URL}/store-groups/${id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
      },
    });
    if (!response.ok) throw new Error('Falha ao excluir grupo');
    if (response.status === 204) return;
    return response.json();
  }
};
