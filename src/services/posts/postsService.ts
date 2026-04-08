import { API_BASE_URL, getHeaders, handleResponse } from '../core/apiClient';
import { Post } from '../../types';

export const postsService = {
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
};
