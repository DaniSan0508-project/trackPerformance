export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8010/api/v1';

export const handleResponse = async (response: Response) => {
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

export const getHeaders = (token?: string, isMultipart = false) => {
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
