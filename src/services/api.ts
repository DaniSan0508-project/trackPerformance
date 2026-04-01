import { PaginatedResponse, Store, StoreGroup, TenantConfig, Post, User, Feedback, Reward, Campaign, CampaignAction, Product, CampaignRanking, Redemption, RedemptionStatus, Survey } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8010/api/v1';

const handleResponse = async (response: Response) => {
  if (response.status === 401) {
    window.dispatchEvent(new CustomEvent('auth-unauthorized'));
    throw new Error('Não autorizado');
  }
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const error = new Error(errorData.message || 'Falha na requisição');
    (error as any).response = { data: errorData, status: response.status };
    throw error;
  }

  if (response.status === 204) return null;
  return response.json();
};

const getHeaders = (token?: string, isMultipart = false) => {
  const headers: any = {
    'Accept': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  if (!isMultipart) {
    headers['Content-Type'] = 'application/json';
  }
  return headers;
};

export const api = {
  login: async (credentials: any) => {
    const response = await fetch(`${API_BASE_URL}/login`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(credentials),
    });
    return handleResponse(response);
  },

  refreshToken: async (token: string) => {
    const response = await fetch(`${API_BASE_URL}/refresh`, {
      method: 'POST',
      headers: getHeaders(token),
    });
    return handleResponse(response);
  },

  getUser: async (token: string, id: number) => {
    const response = await fetch(`${API_BASE_URL}/users/${id}`, {
      headers: getHeaders(token),
    });
    return handleResponse(response);
  },

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

  sendFeedback: async (token: string, data: { recipient_id: number; content: string; is_anonymous: boolean }) => {
    const response = await fetch(`${API_BASE_URL}/feedbacks`, {
      method: 'POST',
      headers: getHeaders(token),
      body: JSON.stringify(data),
    });
    return handleResponse(response);
  },

  getFeedbacks: async (token: string, page = 1) => {
    const queryParams = new URLSearchParams();
    queryParams.append('page', page.toString());
    queryParams.append('include', 'sender,recipient');

    const response = await fetch(`${API_BASE_URL}/feedbacks?${queryParams.toString()}`, {
      headers: getHeaders(token),
    });
    return handleResponse(response);
  },

  getAllTenantFeedbacks: async (token: string, page = 1, searchName = '', filterType: 'sender_name' | 'recipient_name' = 'recipient_name') => {
    const queryParams = new URLSearchParams();
    queryParams.append('page', page.toString());
    queryParams.append('include', 'sender,recipient');
    if (searchName) {
      queryParams.append(`filter[${filterType}]`, searchName);
    }

    const response = await fetch(`${API_BASE_URL}/feedbacks/tenant?${queryParams.toString()}`, {
      headers: getHeaders(token),
    });
    return handleResponse(response);
  },

  getPosts: async (token: string, page = 1, filters: { userName?: string; createdAt?: string } = {}) => {
    const queryParams = new URLSearchParams();
    queryParams.append('page', page.toString());
    queryParams.append('include', 'user,likes,comments');
    
    if (filters.userName) {
      queryParams.append('filter[user.name]', filters.userName);
    }
    
    if (filters.createdAt) {
      queryParams.append('filter[created_at]', filters.createdAt);
    }

    const response = await fetch(`${API_BASE_URL}/posts?${queryParams.toString()}`, {
      headers: getHeaders(token),
    });
    return handleResponse(response);
  },

  createPost: async (token: string, formData: FormData) => {
    const response = await fetch(`${API_BASE_URL}/posts`, {
      method: 'POST',
      headers: getHeaders(token, true),
      body: formData,
    });
    return handleResponse(response);
  },

  updatePost: async (token: string, id: number, data: Partial<Post>) => {
    const response = await fetch(`${API_BASE_URL}/posts/${id}`, {
      method: 'POST',
      headers: getHeaders(token),
      body: JSON.stringify(data),
    });
    return handleResponse(response);
  },

  updatePostWithMedia: async (token: string, id: number, formData: FormData) => {
    const response = await fetch(`${API_BASE_URL}/posts/${id}`, {
      method: 'POST',
      headers: getHeaders(token, true),
      body: formData,
    });
    return handleResponse(response);
  },

  deletePost: async (token: string, id: number) => {
    const response = await fetch(`${API_BASE_URL}/posts/${id}`, {
      method: 'DELETE',
      headers: getHeaders(token),
    });
    return handleResponse(response);
  },

  deletePostComment: async (token: string, commentId: number) => {
    const response = await fetch(`${API_BASE_URL}/post-comments/${commentId}`, {
      method: 'DELETE',
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
      method: 'PUT',
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

  getStoreGroups: async (token: string) => {
    const response = await fetch(`${API_BASE_URL}/store-groups?per_page=100`, {
      headers: getHeaders(token),
    });
    return handleResponse(response);
  },

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

  getRewards: async (token: string, page = 1, search = '') => {
    const queryParams = new URLSearchParams();
    queryParams.append('page', page.toString());
    queryParams.append('include', 'images');
    if (search) {
      queryParams.append('filter[name]', search);
    }

    const response = await fetch(`${API_BASE_URL}/rewards?${queryParams.toString()}`, {
      headers: getHeaders(token),
    });
    return handleResponse(response);
  },

  createReward: async (token: string, formData: FormData) => {
    const response = await fetch(`${API_BASE_URL}/rewards`, {
      method: 'POST',
      headers: getHeaders(token, true),
      body: formData,
    });
    return handleResponse(response);
  },

  updateReward: async (token: string, id: number, formData: FormData) => {
    const response = await fetch(`${API_BASE_URL}/rewards/${id}`, {
      method: 'POST',
      headers: getHeaders(token, true),
      body: formData,
    });
    return handleResponse(response);
  },

  deleteReward: async (token: string, id: number) => {
    const response = await fetch(`${API_BASE_URL}/rewards/${id}`, {
      method: 'DELETE',
      headers: getHeaders(token),
    });
    return handleResponse(response);
  },

  getCampaigns: async (token: string, page = 1, search = '') => {
    const queryParams = new URLSearchParams();
    queryParams.append('page', page.toString());
    queryParams.append('sort', '-created_at');
    if (search) {
      queryParams.append('filter[name]', search);
    }

    const response = await fetch(`${API_BASE_URL}/campaigns?${queryParams.toString()}`, {
      headers: getHeaders(token),
    });
    return handleResponse(response);
  },

  getCampaignsWithPodium: async (token: string) => {
    const response = await fetch(`${API_BASE_URL}/app/campaigns`, {
      headers: getHeaders(token),
    });
    return handleResponse(response);
  },

  createCampaign: async (token: string, data: Partial<Campaign>) => {
    const response = await fetch(`${API_BASE_URL}/campaigns`, {
      method: 'POST',
      headers: getHeaders(token),
      body: JSON.stringify(data),
    });
    return handleResponse(response);
  },

  updateCampaign: async (token: string, id: number, data: Partial<Campaign>) => {
    const response = await fetch(`${API_BASE_URL}/campaigns/${id}`, {
      method: 'PUT',
      headers: getHeaders(token),
      body: JSON.stringify(data),
    });
    return handleResponse(response);
  },

  deleteCampaign: async (token: string, id: number) => {
    const response = await fetch(`${API_BASE_URL}/campaigns/${id}`, {
      method: 'DELETE',
      headers: getHeaders(token),
    });
    return handleResponse(response);
  },

  getCampaignUsers: async (token: string, campaignId: number) => {
    const response = await fetch(`${API_BASE_URL}/campaigns/${campaignId}/users?per_page=99999999`, {
      headers: getHeaders(token),
    });
    return handleResponse(response);
  },

  getCampaignProducts: async (token: string, campaignId: number) => {
    const response = await fetch(`${API_BASE_URL}/campaigns/${campaignId}/products?per_page=9999`, {
      headers: getHeaders(token),
    });
    return handleResponse(response);
  },

  getCampaignActions: async (token: string, campaignId: number) => {
    const response = await fetch(`${API_BASE_URL}/campaigns/${campaignId}/actions?per_page=9999`, {
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

  getCoinStatements: async (token: string, userId: number, page = 1, filters?: any) => {
    const queryParams = new URLSearchParams();
    queryParams.append('page', page.toString());
    queryParams.append('filter[user_id]', userId.toString());

    if (filters?.start_date) queryParams.append('filter[start_date]', filters.start_date);
    if (filters?.end_date) queryParams.append('filter[end_date]', filters.end_date);
    if (filters?.created_at) queryParams.append('filter[created_at]', filters.created_at);

    const response = await fetch(`${API_BASE_URL}/coin-statements?${queryParams.toString()}`, {
      headers: getHeaders(token),
    });
    return handleResponse(response);
  },

  getCampaignRanking: async (token: string, campaignId: number) => {
    const response = await fetch(`${API_BASE_URL}/campaigns/${campaignId}/ranking`, {
      headers: getHeaders(token),
    });
    return handleResponse(response);
  },

  createRedemption: async (token: string, data: { items: { reward_id: number; quantity: number }[] }) => {
    const response = await fetch(`${API_BASE_URL}/redemptions`, {
      method: 'POST',
      headers: getHeaders(token),
      body: JSON.stringify(data),
    });
    return handleResponse(response);
  },

  getRedemptions: async (token: string, page = 1, filters: any = {}) => {
    const queryParams = new URLSearchParams();
    queryParams.append('page', page.toString());
    if (filters.status) queryParams.append('filter[status]', filters.status);
    if (filters.user_id) queryParams.append('filter[user_id]', filters.user_id.toString());
    if (filters.per_page) queryParams.append('per_page', filters.per_page.toString());
    queryParams.append('include', 'user,items,items.reward');

    const response = await fetch(`${API_BASE_URL}/redemptions?${queryParams.toString()}`, {
      headers: getHeaders(token),
    });
    return handleResponse(response);
  },

  updateRedemptionStatus: async (token: string, id: number, status: RedemptionStatus, notes?: string) => {
    const response = await fetch(`${API_BASE_URL}/redemptions/${id}`, {
      method: 'PUT',
      headers: getHeaders(token),
      body: JSON.stringify({ status, notes }),
    });
    return handleResponse(response);
  },

  approveRedemption: async (token: string, id: number) => {
    const response = await fetch(`${API_BASE_URL}/redemptions/${id}/approve`, {
      method: 'PUT',
      headers: getHeaders(token),
    });
    return handleResponse(response);
  },

  rejectRedemption: async (token: string, id: number) => {
    const response = await fetch(`${API_BASE_URL}/redemptions/${id}/reject`, {
      method: 'PUT',
      headers: getHeaders(token),
    });
    return handleResponse(response);
  },

  completeRedemption: async (token: string, id: number) => {
    const response = await fetch(`${API_BASE_URL}/redemptions/${id}/complete`, {
      method: 'PUT',
      headers: getHeaders(token),
    });
    return handleResponse(response);
  },

  getSurveys: async (token: string, page = 1, search = '', status?: SurveyStatus | 'all', published?: 'all' | 'true' | 'false') => {
    const queryParams = new URLSearchParams();
    queryParams.append('page', page.toString());
    if (search) queryParams.append('filter[title]', search);
    if (status && status !== 'all') queryParams.append('filter[status]', status);
    if (published && published !== 'all') queryParams.append('filter[is_published]', published);

    const response = await fetch(`${API_BASE_URL}/surveys?${queryParams.toString()}`, {
      headers: getHeaders(token),
    });
    return handleResponse(response);
  },

  getSurvey: async (token: string, id: number) => {
    const response = await fetch(`${API_BASE_URL}/surveys/${id}?include=questions`, {
      headers: getHeaders(token),
    });
    return handleResponse(response);
  },

  createSurvey: async (token: string, data: any) => {
    const response = await fetch(`${API_BASE_URL}/surveys`, {
      method: 'POST',
      headers: getHeaders(token),
      body: JSON.stringify(data),
    });
    return handleResponse(response);
  },

  updateSurvey: async (token: string, id: number, data: any) => {
    const response = await fetch(`${API_BASE_URL}/surveys/${id}`, {
      method: 'POST',
      headers: getHeaders(token),
      body: JSON.stringify(data),
    });
    return handleResponse(response);
  },

  deleteSurvey: async (token: string, id: number) => {
    const response = await fetch(`${API_BASE_URL}/surveys/${id}`, {
      method: 'DELETE',
      headers: getHeaders(token),
    });
    return handleResponse(response);
  },

  getSurveyResults: async (token: string, surveyId: number) => {
    const response = await fetch(`${API_BASE_URL}/surveys/${surveyId}/results`, {
      headers: getHeaders(token),
    });
    return handleResponse(response);
  },

  getSurveyUsers: async (token: string, surveyId: number) => {
    const response = await fetch(`${API_BASE_URL}/app/surveys/${surveyId}/users?per_page=9999`, {
      headers: getHeaders(token),
    });
    return handleResponse(response);
  },

  getDashboard: async (token: string) => {
    const response = await fetch(`${API_BASE_URL}/dashboard`, {
      headers: getHeaders(token),
    });
    return handleResponse(response);
  },

  getActiveCampaigns: async (token: string) => {
    const response = await fetch(`${API_BASE_URL}/dashboard/active-campaigns`, {
      headers: getHeaders(token),
    });
    return handleResponse(response);
  },

  getEngagementIndex: async (token: string) => {
    const response = await fetch(`${API_BASE_URL}/dashboard/engagement-index`, {
      headers: getHeaders(token),
    });
    return handleResponse(response);
  },

  getTopCollaborators: async (token: string) => {
    const response = await fetch(`${API_BASE_URL}/dashboard/top-collaborators`, {
      headers: getHeaders(token),
    });
    return handleResponse(response);
  },

  getEngagementActionsSummary: async (token: string, period?: string) => {
    const query = period ? `?period=${encodeURIComponent(period)}` : '';
    const response = await fetch(`${API_BASE_URL}/dashboard/engagement-actions-summary${query}`, {
      headers: getHeaders(token),
    });
    return handleResponse(response);
  },
};
