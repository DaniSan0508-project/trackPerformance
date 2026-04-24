import { API_BASE_URL, getHeaders, handleResponse } from '../core/apiClient';
import { Campaign } from '../../types';

export const campaignsService = {
  getCampaigns: async (token: string, page = 1, search = '') => {
    const queryParams = new URLSearchParams();
    queryParams.append('page', page.toString());
    queryParams.append('sort', '-created_at');
    queryParams.append('include', 'reward,winner');
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

  getCampaignById: async (token: string, id: number) => {
    // Incluímos os parâmetros de include para garantir que o backend retorne as relações necessárias
    const response = await fetch(`${API_BASE_URL}/campaigns/${id}?include=users,products,actions,hashtags`, {
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

  importCampaignSales: async (token: string, campaignId: number, file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await fetch(`${API_BASE_URL}/campaigns/${campaignId}/sales/import`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: formData,
    });
    return handleResponse(response);
  },

  getCampaignRanking: async (token: string, campaignId: number) => {
    const response = await fetch(`${API_BASE_URL}/campaigns/${campaignId}/ranking`, {
      headers: getHeaders(token),
    });
    return handleResponse(response);
  },

  getCampaignPodium: async (token: string, campaignId: number) => {
    const response = await fetch(`${API_BASE_URL}/campaigns/${campaignId}/users?sort=-sales_amount&per_page=3`, {
      headers: getHeaders(token),
    });
    return handleResponse(response);
  },

  getHashtags: async (token: string) => {
    const response = await fetch(`${API_BASE_URL}/campaigns/hashtags?per_page=9999`, {
      headers: getHeaders(token),
    });
    return handleResponse(response);
  },

  approvePrize: async (token: string, campaignId: number) => {
    const response = await fetch(`${API_BASE_URL}/campaigns/${campaignId}/approve-prize`, {
      method: 'POST',
      headers: getHeaders(token),
    });
    return handleResponse(response);
  },
};
