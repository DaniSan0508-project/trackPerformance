import { PaginatedResponse, Store, StoreGroup, TenantConfig, Post, User, Feedback, Reward, Campaign, CampaignAction, Product, CampaignRanking, Redemption, RedemptionStatus } from '../types';

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

  getUser: async (token: string, id: number) => {
    const response = await fetch(`${API_BASE_URL}/users/${id}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
      },
    });
    if (!response.ok) throw new Error('Falha ao carregar usuário');
    return response.json();
  },

  getUsers: async (token: string, page = 1, search = '', filterType: 'name' | 'email' = 'name') => {
    const queryParams = new URLSearchParams();
    queryParams.append('page', page.toString());
    queryParams.append('per_page', '10');
    queryParams.append('include', 'store');
    if (search) {
      queryParams.append(`filter[${filterType}]`, search);
    }

    const response = await fetch(`${API_BASE_URL}/users?${queryParams.toString()}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
      },
    });
    if (!response.ok) throw new Error('Falha ao carregar usuários');
    return response.json() as Promise<PaginatedResponse<User>>;
  },

  getProductsPaginated: async (token: string, page = 1, search = '', filterType: 'name' | 'barcode' = 'name') => {
    const queryParams = new URLSearchParams();
    queryParams.append('page', page.toString());
    queryParams.append('per_page', '10');
    if (search) {
      queryParams.append(`filter[${filterType}]`, search);
    }

    const response = await fetch(`${API_BASE_URL}/products?${queryParams.toString()}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
      },
    });
    if (!response.ok) throw new Error('Falha ao carregar produtos');
    return response.json() as Promise<PaginatedResponse<Product>>;
  },

  sendFeedback: async (token: string, data: { recipient_id: number; content: string; is_anonymous: boolean }) => {
    const response = await fetch(`${API_BASE_URL}/feedbacks`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Falha ao enviar feedback');
    return response.json();
  },

  getFeedbacks: async (token: string, page = 1) => {
    const queryParams = new URLSearchParams();
    queryParams.append('page', page.toString());
    queryParams.append('include', 'sender,recipient');

    const response = await fetch(`${API_BASE_URL}/feedbacks?${queryParams.toString()}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
      },
    });
    if (!response.ok) throw new Error('Falha ao carregar feedbacks');
    return response.json() as Promise<PaginatedResponse<Feedback>>;
  },

  getAllTenantFeedbacks: async (token: string, page = 1, searchName = '') => {
    const queryParams = new URLSearchParams();
    queryParams.append('page', page.toString());
    queryParams.append('include', 'sender,recipient');
    if (searchName) {
      queryParams.append('filter[sender_name]', searchName);
    }

    const response = await fetch(`${API_BASE_URL}/feedbacks/tenant?${queryParams.toString()}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
      },
    });
    if (!response.ok) throw new Error('Falha ao carregar feedbacks do tenant');
    return response.json() as Promise<PaginatedResponse<Feedback>>;
  },

  getPosts: async (token: string, page = 1, search = '') => {
    const queryParams = new URLSearchParams();
    queryParams.append('page', page.toString());
    queryParams.append('include', 'user');
    if (search) {
      queryParams.append('filter[content]', search);
    }

    const response = await fetch(`${API_BASE_URL}/posts?${queryParams.toString()}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
      },
    });
    if (!response.ok) throw new Error('Falha ao carregar posts');
    return response.json() as Promise<PaginatedResponse<Post>>;
  },

  createPost: async (token: string, formData: FormData) => {
    const response = await fetch(`${API_BASE_URL}/posts`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
      },
      body: formData,
    });
    if (!response.ok) throw new Error('Falha ao criar post');
    return response.json();
  },

  updatePost: async (token: string, id: number, data: Partial<Post>) => {
    const response = await fetch(`${API_BASE_URL}/posts/${id}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Falha ao atualizar post');
    return response.json();
  },

  deletePost: async (token: string, id: number) => {
    const response = await fetch(`${API_BASE_URL}/posts/${id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
      },
    });
    if (!response.ok) throw new Error('Falha ao excluir post');
    if (response.status === 204) return;
    return response.json();
  },

  createUser: async (token: string, formData: FormData) => {
    const response = await fetch(`${API_BASE_URL}/users`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
      },
      body: formData,
    });
    if (!response.ok) throw new Error('Falha ao criar usuário');
    return response.json();
  },

  updateUser: async (token: string, id: number, formData: FormData) => {
    const response = await fetch(`${API_BASE_URL}/users/update/${id}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
      },
      body: formData,
    });
    if (!response.ok) throw new Error('Falha ao atualizar usuário');
    return response.json();
  },

  deleteUser: async (token: string, id: number) => {
    const response = await fetch(`${API_BASE_URL}/users/${id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
      },
    });
    if (!response.ok) throw new Error('Falha ao excluir usuário');
    if (response.status === 204) return;
    return response.json();
  },

  getStores: async (token: string, page = 1, search = '') => {
    const queryParams = new URLSearchParams();
    queryParams.append('page', page.toString());
    queryParams.append('include', 'tenant,group');
    if (search) {
      // Se começar com número, busca por CNPJ; caso contrário, busca por nome
      const isNumeric = /^\d/.test(search.trim());
      if (isNumeric) {
        queryParams.append('filter[cnpj]', search);
      } else {
        queryParams.append('filter[name]', search);
      }
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
    if (!response.ok) {
      if (response.status === 400) {
        throw new Error('STORE_HAS_LINKED_USERS');
      }
      throw new Error('Falha ao excluir loja');
    }
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
  },

  getRewards: async (token: string, page = 1, search = '') => {
    const queryParams = new URLSearchParams();
    queryParams.append('page', page.toString());
    queryParams.append('include', 'images,primaryImage');
    if (search) {
      queryParams.append('filter[name]', search);
    }

    const response = await fetch(`${API_BASE_URL}/rewards?${queryParams.toString()}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
      },
    });
    if (!response.ok) throw new Error('Falha ao carregar prêmios');
    return response.json() as Promise<PaginatedResponse<Reward>>;
  },

  createReward: async (token: string, formData: FormData) => {
    const response = await fetch(`${API_BASE_URL}/rewards`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
      },
      body: formData,
    });
    if (!response.ok) throw new Error('Falha ao criar prêmio');
    return response.json();
  },

  updateReward: async (token: string, id: number, formData: FormData) => {
    const response = await fetch(`${API_BASE_URL}/rewards/${id}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
      },
      body: formData,
    });
    if (!response.ok) throw new Error('Falha ao atualizar prêmio');
    return response.json();
  },

  deleteReward: async (token: string, id: number) => {
    const response = await fetch(`${API_BASE_URL}/rewards/${id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
      },
    });
    if (!response.ok) throw new Error('Falha ao excluir prêmio');
    if (response.status === 204) return;
    return response.json();
  },

  getCampaigns: async (token: string, page = 1, search = '') => {
    const queryParams = new URLSearchParams();
    queryParams.append('page', page.toString());
    if (search) {
      queryParams.append('filter[name]', search);
    }

    const response = await fetch(`${API_BASE_URL}/campaigns?${queryParams.toString()}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
      },
    });
    if (!response.ok) throw new Error('Falha ao carregar campanhas');
    return response.json() as Promise<PaginatedResponse<Campaign>>;
  },

  getCampaignsWithPodium: async (token: string) => {
    const response = await fetch(`${API_BASE_URL}/app/campaigns`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
      },
    });
    if (!response.ok) throw new Error('Falha ao carregar campanhas com podium');
    return response.json() as Promise<{ data: Campaign[] }>;
  },

  createCampaign: async (token: string, data: Partial<Campaign>) => {
    const response = await fetch(`${API_BASE_URL}/campaigns`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Falha ao criar campanha');
    return response.json();
  },

  updateCampaign: async (token: string, id: number, data: Partial<Campaign>) => {
    const response = await fetch(`${API_BASE_URL}/campaigns/${id}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Falha ao atualizar campanha');
    return response.json();
  },

  deleteCampaign: async (token: string, id: number) => {
    const response = await fetch(`${API_BASE_URL}/campaigns/${id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
      },
    });
    
    if (!response.ok) {
      // Tenta obter os dados de erro da resposta
      const errorData = await response.json().catch(() => ({}));
      const error = new Error(errorData.message || 'Falha ao excluir campanha');
      error.response = { data: errorData, status: response.status };
      throw error;
    }
    
    if (response.status === 204) return;
    return response.json();
  },

  getAllUsers: async (token: string, page = 1, perPage = 10) => {
    const queryParams = new URLSearchParams();
    queryParams.append('page', page.toString());
    queryParams.append('per_page', perPage.toString());

    const response = await fetch(`${API_BASE_URL}/users?${queryParams.toString()}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
      },
    });
    if (!response.ok) throw new Error('Falha ao carregar usuários');
    return response.json() as Promise<PaginatedResponse<User>>;
  },

  getAllUsersComplete: async (token: string, search = '', filterType: 'name' | 'email' = 'name') => {
    const allUsers: User[] = [];
    let currentPage = 1;
    const perPage = 100; // Busca 100 por página para ser mais eficiente

    while (true) {
      const queryParams = new URLSearchParams();
      queryParams.append('page', currentPage.toString());
      queryParams.append('per_page', perPage.toString());
      queryParams.append('include', 'store');
      if (search) {
        queryParams.append(`filter[${filterType}]`, search);
      }

      const response = await fetch(`${API_BASE_URL}/users?${queryParams.toString()}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
        },
      });
      if (!response.ok) throw new Error('Falha ao carregar usuários');
      const data = await response.json() as PaginatedResponse<User>;
      
      allUsers.push(...(data.data || []));
      
      // Se não houver mais páginas, interrompe
      if (currentPage >= (data.meta?.last_page || data.last_page || 1)) {
        break;
      }
      currentPage++;
    }

    return allUsers;
  },

  getProducts: async (token: string, page = 1, perPage = 10) => {
    const queryParams = new URLSearchParams();
    queryParams.append('page', page.toString());
    queryParams.append('per_page', perPage.toString());

    const response = await fetch(`${API_BASE_URL}/products?${queryParams.toString()}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
      },
    });
    if (!response.ok) throw new Error('Falha ao carregar produtos');
    return response.json() as Promise<PaginatedResponse<Product>>;
  },

  getAllProductsComplete: async (token: string, search = '', filterType: 'name' | 'barcode' = 'name') => {
    const allProducts: Product[] = [];
    let currentPage = 1;
    const perPage = 100; // Busca 100 por página para ser mais eficiente

    while (true) {
      const queryParams = new URLSearchParams();
      queryParams.append('page', currentPage.toString());
      queryParams.append('per_page', perPage.toString());
      if (search) {
        queryParams.append(`filter[${filterType}]`, search);
      }

      const response = await fetch(`${API_BASE_URL}/products?${queryParams.toString()}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
        },
      });
      if (!response.ok) throw new Error('Falha ao carregar produtos');
      const data = await response.json() as PaginatedResponse<Product>;
      
      allProducts.push(...(data.data || []));
      
      // Se não houver mais páginas, interrompe
      if (currentPage >= (data.meta?.last_page || data.last_page || 1)) {
        break;
      }
      currentPage++;
    }

    return allProducts;
  },

  getCampaignRanking: async (token: string, campaignId: number) => {
    const response = await fetch(`${API_BASE_URL}/campaigns/${campaignId}/ranking`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
      },
    });
    if (!response.ok) throw new Error('Falha ao carregar ranking');
    return response.json() as Promise<{ data: CampaignRanking[] }>;
  },

  createRedemption: async (token: string, data: { items: { reward_id: number; quantity: number }[] }) => {
    const response = await fetch(`${API_BASE_URL}/redemptions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || 'Falha ao criar redenção');
    }
    return response.json();
  },

  getRedemptions: async (
    token: string,
    page = 1,
    filters: {
      status?: RedemptionStatus;
      user_id?: number;
      per_page?: number;
    } = {}
  ) => {
    const queryParams = new URLSearchParams();
    queryParams.append('page', page.toString());
    
    if (filters.status) {
      queryParams.append('filter[status]', filters.status);
    }
    if (filters.user_id) {
      queryParams.append('filter[user_id]', filters.user_id.toString());
    }
    if (filters.per_page) {
      queryParams.append('per_page', filters.per_page.toString());
    }
    
    queryParams.append('include', 'user,items,items.reward');

    const response = await fetch(`${API_BASE_URL}/redemptions?${queryParams.toString()}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
      },
    });
    if (!response.ok) throw new Error('Falha ao carregar resgates');
    return response.json() as Promise<PaginatedResponse<Redemption>>;
  },

  updateRedemptionStatus: async (token: string, id: number, status: RedemptionStatus, notes?: string) => {
    const response = await fetch(`${API_BASE_URL}/redemptions/${id}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({ status, notes }),
    });
    if (!response.ok) throw new Error('Falha ao atualizar resgate');
    return response.json();
  },

  approveRedemption: async (token: string, id: number) => {
    const response = await fetch(`${API_BASE_URL}/redemptions/${id}/approve`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
      },
    });
    if (!response.ok) throw new Error('Falha ao aprovar resgate');
    return response.json();
  },

  rejectRedemption: async (token: string, id: number) => {
    const response = await fetch(`${API_BASE_URL}/redemptions/${id}/reject`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
      },
    });
    if (!response.ok) throw new Error('Falha ao rejeitar resgate');
    return response.json();
  },

  completeRedemption: async (token: string, id: number) => {
    const response = await fetch(`${API_BASE_URL}/redemptions/${id}/complete`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
      },
    });
    if (!response.ok) throw new Error('Falha ao concluir resgate');
    return response.json();
  },
};
