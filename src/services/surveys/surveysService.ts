import { API_BASE_URL, getHeaders, handleResponse } from '../core/apiClient';
import { SurveyStatus } from '../../types';

export const surveysService = {
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
};
