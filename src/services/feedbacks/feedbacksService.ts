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

  getFeedbacks: async (
    token: string, 
    page = 1, 
    filters: {
      is_anonymous?: boolean | null;
      is_read?: boolean | null;
      sender_name?: string;
      recipient_name?: string;
      created_at?: string; // Range: YYYY-MM-DD,YYYY-MM-DD
    } = {},
    perPage = 15
  ) => {
    const queryParams = new URLSearchParams();
    queryParams.append('page', page.toString());
    queryParams.append('per_page', perPage.toString());
    queryParams.append('include', 'sender,recipient');
    queryParams.append('sort', '-id');

    if (filters.is_anonymous !== undefined && filters.is_anonymous !== null) {
      queryParams.append('filter[is_anonymous]', filters.is_anonymous ? '1' : '0');
    }
    if (filters.is_read !== undefined && filters.is_read !== null) {
      queryParams.append('filter[is_read]', filters.is_read ? '1' : '0');
    }
    if (filters.sender_name) queryParams.append('filter[sender_name]', filters.sender_name);
    if (filters.recipient_name) queryParams.append('filter[recipient_name]', filters.recipient_name);
    if (filters.created_at) queryParams.append('filter[created_at]', filters.created_at);

    const response = await fetch(`${API_BASE_URL}/feedbacks?${queryParams.toString()}`, {
      headers: getHeaders(token),
    });
    return handleResponse(response);
  },

  getSentFeedbacks: async (
    token: string, 
    page = 1, 
    filters: {
      sender_name?: string;
      recipient_name?: string;
      created_at?: string; // Range: YYYY-MM-DD,YYYY-MM-DD
    } = {},
    perPage = 12
  ) => {
    const queryParams = new URLSearchParams();
    queryParams.append('page', page.toString());
    queryParams.append('per_page', perPage.toString());
    queryParams.append('include', 'sender,recipient');
    queryParams.append('sort', '-id');

    if (filters.sender_name) queryParams.append('filter[sender_name]', filters.sender_name);
    if (filters.recipient_name) queryParams.append('filter[recipient_name]', filters.recipient_name);
    if (filters.created_at) queryParams.append('filter[created_at]', filters.created_at);

    const response = await fetch(`${API_BASE_URL}/feedbacks/sent?${queryParams.toString()}`, {
      headers: getHeaders(token),
    });
    return handleResponse(response);
  },

  deleteFeedback: async (token: string, id: number) => {
    const response = await fetch(`${API_BASE_URL}/feedbacks/${id}`, {
      method: 'DELETE',
      headers: getHeaders(token),
    });
    return handleResponse(response);
  },

  getAllTenantFeedbacks: async (
    token: string, 
    page = 1, 
    filters: {
      sender_name?: string;
      recipient_name?: string;
      is_anonymous?: boolean | null;
      date_from?: string;
      date_to?: string;
    } = {},
    perPage = 15
  ) => {
    const queryParams = new URLSearchParams();
    queryParams.append('page', page.toString());
    queryParams.append('per_page', perPage.toString());
    queryParams.append('include', 'sender,recipient');
    queryParams.append('sort', '-id');
    
    if (filters.sender_name) queryParams.append('filter[sender_name]', filters.sender_name);
    if (filters.recipient_name) queryParams.append('filter[recipient_name]', filters.recipient_name);
    if (filters.is_anonymous !== undefined && filters.is_anonymous !== null) {
      queryParams.append('filter[is_anonymous]', filters.is_anonymous ? '1' : '0');
    }
    if (filters.date_from) queryParams.append('filter[date_from]', filters.date_from);
    if (filters.date_to) queryParams.append('filter[date_to]', filters.date_to);

    const response = await fetch(`${API_BASE_URL}/feedbacks/tenant?${queryParams.toString()}`, {
      headers: getHeaders(token),
    });
    return handleResponse(response);
  },
};
