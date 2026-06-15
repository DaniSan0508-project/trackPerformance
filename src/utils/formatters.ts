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
  if (isNaN(numericValue)) return 'R$ 0';
  
  if (numericValue % 1 === 0) {
    return numericValue.toLocaleString('en-US', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });
  }
  
  return numericValue.toLocaleString('en-US', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

/**
 * Formata uma string de data para o formato brasileiro
 */
export const formatDate = (dateString: string): string => {
  if (!dateString) return '-';
  // Para evitar problemas de fuso horário que mostram um dia a menos,
  // extraímos os componentes da data manualmente se estiver no formato YYYY-MM-DD
  const datePart = dateString.split('T')[0];
  const parts = datePart.split('-');
  
  if (parts.length === 3) {
    const [year, month, day] = parts;
    return `${day}/${month}/${year}`;
  }

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

/**
 * Formata data para formato relativo estilo Instagram
 * Ex: "há 1 hora", "há 2 dias", "agora mesmo"
 */
export const formatRelativeDate = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  
  if (diffInSeconds < 0) return 'agora mesmo';
  if (diffInSeconds < 60) return 'agora mesmo';
  if (diffInSeconds < 3600) {
    const minutes = Math.floor(diffInSeconds / 60);
    return `há ${minutes} min`;
  }
  if (diffInSeconds < 86400) {
    const hours = Math.floor(diffInSeconds / 3600);
    return `há ${hours} h`;
  }
  if (diffInSeconds < 604800) {
    const days = Math.floor(diffInSeconds / 86400);
    return `há ${days} d`;
  }
  if (diffInSeconds < 2592000) {
    const weeks = Math.floor(diffInSeconds / 604800);
    return `há ${weeks} sem`;
  }
  if (diffInSeconds < 31536000) {
    const months = Math.floor(diffInSeconds / 2592000);
    return `há ${months} meses`;
  }
  const years = Math.floor(diffInSeconds / 31536000);
  return `há ${years} anos`;
};

/**
 * Extrai o ID de um vídeo do YouTube a partir da URL
 */
export const extractYouTubeVideoId = (url: string): string | null => {
  if (!url) return null;
  
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
    /^([a-zA-Z0-9_-]{11})$/ 
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }
  
  return null;
};

/**
 * Retorna a URL da thumbnail de um vídeo do YouTube
 */
export const getYouTubeThumbnailUrl = (videoUrl: string): string | null => {
  const videoId = extractYouTubeVideoId(videoUrl);
  if (!videoId) return null;
  return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
};
