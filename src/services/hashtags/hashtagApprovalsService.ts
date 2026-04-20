import { API_BASE_URL, getHeaders, handleResponse } from '../core/apiClient';

export const hashtagApprovalsService = {
  getPendingApprovals: async (token: string, page = 1) => {
    const response = await fetch(`${API_BASE_URL}/hashtag-reward-approvals?page=${page}`, {
      headers: getHeaders(token),
    });
    return handleResponse(response);
  },

  approveReward: async (token: string, id: number) => {
    const response = await fetch(`${API_BASE_URL}/hashtag-reward-approvals/${id}/approve`, {
      method: 'POST',
      headers: getHeaders(token),
    });
    return handleResponse(response);
  },
};
