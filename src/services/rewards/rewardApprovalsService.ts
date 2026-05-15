import { API_BASE_URL, getHeaders, handleResponse } from '../core/apiClient';

export interface RewardApprovalsFilters {
  status?: 'pending' | 'approved' | 'rejected';
  approval_type?: 'hashtag' | 'post_share';
  user_id?: number;
  campaign_id?: number;
}

export const rewardApprovalsService = {
  getApprovals: async (token: string, page = 1, filters: RewardApprovalsFilters = {}) => {
    const queryParams = new URLSearchParams({
      page: page.toString(),
      ...Object.fromEntries(
        Object.entries(filters).filter(([_, v]) => v !== undefined).map(([k, v]) => [k, String(v)])
      ),
    });

    const response = await fetch(`${API_BASE_URL}/reward-approvals?${queryParams.toString()}`, {
      headers: getHeaders(token),
    });
    return handleResponse(response);
  },

  approveHashtag: async (token: string, id: number) => {
    const response = await fetch(`${API_BASE_URL}/hashtag-reward-approvals/${id}/approve`, {
      method: 'POST',
      headers: getHeaders(token),
    });
    return handleResponse(response);
  },

  approvePostShare: async (token: string, id: number) => {
    const response = await fetch(`${API_BASE_URL}/post-share-reward-approvals/${id}/approve`, {
      method: 'POST',
      headers: getHeaders(token),
    });
    return handleResponse(response);
  },

  rejectHashtag: async (token: string, id: number) => {
    const response = await fetch(`${API_BASE_URL}/hashtag-reward-approvals/${id}/reject`, {
      method: 'POST',
      headers: getHeaders(token),
    });
    return handleResponse(response);
  },

  rejectPostShare: async (token: string, id: number) => {
    const response = await fetch(`${API_BASE_URL}/post-share-reward-approvals/${id}/reject`, {
      method: 'POST',
      headers: getHeaders(token),
    });
    return handleResponse(response);
  },
};
