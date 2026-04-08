import { API_BASE_URL, getHeaders, handleResponse } from '../core/apiClient';

export const feedbacksService = {
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
};
