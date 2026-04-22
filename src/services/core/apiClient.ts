export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8010/api/v1';

export const handleResponse = async (response: Response) => {
  if (response.status === 401) {
    window.dispatchEvent(new CustomEvent('auth-unauthorized'));
    throw new Error('Não autorizado');
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));

    // Erro de validação 422: propaga erros por campo
    if (response.status === 422 && errorData.errors) {
      const error = new Error(errorData.message || 'Erro de validação');
      (error as any).response = { data: errorData, status: response.status };
      (error as any).fieldErrors = errorData.errors;
      throw error;
    }

    const error = new Error(errorData.error || errorData.message || 'Falha na requisição');
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
