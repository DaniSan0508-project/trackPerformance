import { API_BASE_URL, getHeaders, handleResponse } from '../core/apiClient';

export const rewardsService = {
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

  deleteRewardImage: async (token: string, rewardId: number, imageId: number) => {
    const response = await fetch(`${API_BASE_URL}/rewards/${rewardId}/images/${imageId}`, {
      method: 'DELETE',
      headers: getHeaders(token),
    });
    return handleResponse(response);
  },

  updateRewardImage: async (token: string, rewardId: number, imageId: number, formData: FormData) => {
    const response = await fetch(`${API_BASE_URL}/rewards/${rewardId}/images/${imageId}`, {
      method: 'POST',
      headers: getHeaders(token, true),
      body: formData,
    });
    return handleResponse(response);
  },

  addRewardImages: async (token: string, rewardId: number, formData: FormData) => {
    const response = await fetch(`${API_BASE_URL}/rewards/${rewardId}/images`, {
      method: 'POST',
      headers: getHeaders(token, true),
      body: formData,
    });
    return handleResponse(response);
  },
};
