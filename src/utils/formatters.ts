// API Base URL - Usa variável de ambiente do Vite ou valor padrão
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8010/api/v1';

/**
 * Converte URL relativa de imagem para URL absoluta da API
 * @param imageUrl - URL da imagem (pode ser relativa ou absoluta)
 * @returns URL completa da imagem
 */
export const getFullImageUrl = (imageUrl: string | null | undefined): string | null => {
  if (!imageUrl) return null;
  
  // Se já é URL absoluta (http:// ou https://), retorna como está
  if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
    return imageUrl;
  }
  
  // Se é URL relativa, adiciona a base da API
  return `${API_BASE_URL}${imageUrl}`;
};

/**
 * Formata um valor numérico para moeda brasileira (BRL)
 */
export const formatCurrency = (value: number | string): string => {
  const numericValue = typeof value === 'string' ? parseFloat(value) : value;
  return numericValue.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
};

/**
 * Formata uma string de data para o formato brasileiro
 */
export const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString('pt-BR');
};

/**
 * Formata uma string de data/hora para o formato brasileiro
 */
export const formatDateTime = (dateString: string): string => {
  return new Date(dateString).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

/**
 * Capitaliza a primeira letra de uma string
 */
export const capitalize = (str: string): string => {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
};

/**
 * Trunca uma string se for maior que o tamanho máximo
 */
export const truncate = (str: string, maxLength: number): string => {
  if (!str) return '';
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength) + '...';
};

/**
 * Verifica se uma string é um email válido
 */
export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Remove caracteres especiais de um CNPJ/CPF
 */
export const cleanDocument = (document: string): string => {
  return document.replace(/\D/g, '');
};

/**
 * Formata CPF/CNPJ com máscara
 */
export const formatDocument = (document: string): string => {
  const clean = cleanDocument(document);
  if (clean.length === 11) {
    // CPF
    return clean.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  } else if (clean.length === 14) {
    // CNPJ
    return clean.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
  }
  return document;
};

/**
 * Debounce para funções assíncronas
 */
export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  delay: number
): ((...args: Parameters<T>) => void) => {
  let timeoutId: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  };
};
