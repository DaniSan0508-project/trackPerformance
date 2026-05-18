import { API_BASE_URL, getHeaders, handleResponse } from '../core/apiClient';
import { Post } from '../../types';

export const postsService = {
  getPosts: async (token: string, page = 1, filters: { 
    userName?: string; 
    createdAt?: string; 
    search?: string;
    earnsCoins?: boolean;
    isSponsored?: boolean;
    isBoosted?: boolean;
    postType?: string;
    sort?: string;
  } = {}) => {
    const queryParams = new URLSearchParams();
    queryParams.append('page', page.toString());
    queryParams.append('include', 'user,likes,comments');
    
    if (filters.userName) queryParams.append('filter[user.name]', filters.userName);
    if (filters.createdAt) queryParams.append('filter[created_at]', filters.createdAt);
    if (filters.search) queryParams.append('filter[search]', filters.search);
    if (filters.earnsCoins !== undefined) queryParams.append('filter[earns_coins]', filters.earnsCoins.toString());
    if (filters.isSponsored !== undefined) queryParams.append('filter[is_sponsored]', filters.isSponsored.toString());
    if (filters.isBoosted !== undefined) queryParams.append('filter[is_boosted]', filters.isBoosted.toString());
    if (filters.postType) queryParams.append('filter[post_type]', filters.postType);
    if (filters.sort) queryParams.append('sort', filters.sort);

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
};
