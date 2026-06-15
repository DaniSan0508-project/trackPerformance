import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  formatCurrency,
  formatDate,
  capitalize,
  truncate,
  isValidEmail,
  cleanDocument,
  formatDocument,
  extractYouTubeVideoId,
  getYouTubeThumbnailUrl,
  formatRelativeDate,
  getFullImageUrl,
} from '../../utils/formatters';

// ─── formatCurrency ───────────────────────────────────────────────────────────

describe('formatCurrency', () => {
  it('formata número como moeda BRL', () => {
    expect(formatCurrency(1234.56)).toMatch(/1\,234\.56/);
  });

  it('aceita string numérica e oculta centavos zerados', () => {
    const res = formatCurrency('500');
    expect(res).toContain('500');
    expect(res).not.toContain(',00');
  });

  it('formata zero corretamente e oculta centavos', () => {
    const res = formatCurrency(0);
    expect(res).toContain('0');
    expect(res).not.toContain(',00');
  });
});

// ─── formatDate ───────────────────────────────────────────────────────────────

describe('formatDate', () => {
  it('converte YYYY-MM-DD para DD/MM/YYYY', () => {
    expect(formatDate('2026-06-12')).toBe('12/06/2026');
  });

  it('retorna "-" para string vazia', () => {
    expect(formatDate('')).toBe('-');
  });

  it('ignora a parte de hora em datetime ISO', () => {
    expect(formatDate('2026-01-15T10:30:00')).toBe('15/01/2026');
  });
});

// ─── capitalize ───────────────────────────────────────────────────────────────

describe('capitalize', () => {
  it('capitaliza a primeira letra e coloca o resto em minúsculo', () => {
    expect(capitalize('HELLO')).toBe('Hello');
  });

  it('funciona com string já capitalizada', () => {
    expect(capitalize('World')).toBe('World');
  });

  it('retorna string vazia para input vazio', () => {
    expect(capitalize('')).toBe('');
  });
});

// ─── truncate ─────────────────────────────────────────────────────────────────

describe('truncate', () => {
  it('não trunca strings dentro do limite', () => {
    expect(truncate('Hello', 10)).toBe('Hello');
  });

  it('trunca e adiciona "..." quando excede o limite', () => {
    expect(truncate('Hello World', 5)).toBe('Hello...');
  });

  it('retorna string vazia para input vazio', () => {
    expect(truncate('', 10)).toBe('');
  });

  it('trunca exatamente no limite', () => {
    expect(truncate('12345', 5)).toBe('12345');
  });
});

// ─── isValidEmail ─────────────────────────────────────────────────────────────

describe('isValidEmail', () => {
  it('valida email correto', () => {
    expect(isValidEmail('user@example.com')).toBe(true);
  });

  it('invalida email sem @', () => {
    expect(isValidEmail('invalido')).toBe(false);
  });

  it('invalida email sem domínio', () => {
    expect(isValidEmail('user@')).toBe(false);
  });

  it('invalida string vazia', () => {
    expect(isValidEmail('')).toBe(false);
  });
});

// ─── cleanDocument / formatDocument ──────────────────────────────────────────

describe('cleanDocument', () => {
  it('remove caracteres não numéricos', () => {
    expect(cleanDocument('12.345.678/0001-99')).toBe('12345678000199');
  });

  it('mantém string já limpa', () => {
    expect(cleanDocument('12345678000199')).toBe('12345678000199');
  });
});

describe('formatDocument', () => {
  it('formata CNPJ com 14 dígitos', () => {
    expect(formatDocument('12345678000199')).toBe('12.345.678/0001-99');
  });

  it('formata CPF com 11 dígitos', () => {
    expect(formatDocument('12345678901')).toBe('123.456.789-01');
  });

  it('retorna original para documento com comprimento inesperado', () => {
    expect(formatDocument('123')).toBe('123');
  });
});

// ─── extractYouTubeVideoId ────────────────────────────────────────────────────

describe('extractYouTubeVideoId', () => {
  it('extrai ID de URL watch', () => {
    expect(extractYouTubeVideoId('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe(
      'dQw4w9WgXcQ'
    );
  });

  it('extrai ID de URL youtu.be', () => {
    expect(extractYouTubeVideoId('https://youtu.be/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
  });

  it('extrai ID de URL embed', () => {
    expect(extractYouTubeVideoId('https://www.youtube.com/embed/dQw4w9WgXcQ')).toBe(
      'dQw4w9WgXcQ'
    );
  });

  it('retorna null para URL inválida', () => {
    expect(extractYouTubeVideoId('https://vimeo.com/123')).toBeNull();
  });

  it('retorna null para string vazia', () => {
    expect(extractYouTubeVideoId('')).toBeNull();
  });
});

// ─── getYouTubeThumbnailUrl ───────────────────────────────────────────────────

describe('getYouTubeThumbnailUrl', () => {
  it('gera URL de thumbnail correta', () => {
    expect(getYouTubeThumbnailUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe(
      'https://img.youtube.com/vi/dQw4w9WgXcQ/hqdefault.jpg'
    );
  });

  it('retorna null para URL inválida', () => {
    expect(getYouTubeThumbnailUrl('https://vimeo.com/123')).toBeNull();
  });
});

// ─── formatRelativeDate ───────────────────────────────────────────────────────

describe('formatRelativeDate', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-12T12:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('retorna "agora mesmo" para menos de 60 segundos', () => {
    expect(formatRelativeDate('2026-06-12T11:59:30Z')).toBe('agora mesmo');
  });

  it('retorna minutos para menos de 1 hora', () => {
    expect(formatRelativeDate('2026-06-12T11:30:00Z')).toBe('há 30 min');
  });

  it('retorna horas para menos de 24 horas', () => {
    expect(formatRelativeDate('2026-06-12T09:00:00Z')).toBe('há 3 h');
  });

  it('retorna dias para menos de 1 semana', () => {
    expect(formatRelativeDate('2026-06-10T12:00:00Z')).toBe('há 2 d');
  });

  it('retorna semanas para menos de 1 mês', () => {
    expect(formatRelativeDate('2026-05-29T12:00:00Z')).toBe('há 2 sem');
  });
});

// ─── getFullImageUrl ──────────────────────────────────────────────────────────

describe('getFullImageUrl', () => {
  it('retorna null para valor nulo', () => {
    expect(getFullImageUrl(null)).toBeNull();
  });

  it('retorna null para undefined', () => {
    expect(getFullImageUrl(undefined)).toBeNull();
  });

  it('retorna URL absoluta sem modificação', () => {
    expect(getFullImageUrl('https://cdn.example.com/foto.jpg')).toBe(
      'https://cdn.example.com/foto.jpg'
    );
  });

  it('prefixa URL relativa com base da API', () => {
    const result = getFullImageUrl('/uploads/foto.jpg');
    expect(result).toMatch(/\/uploads\/foto\.jpg$/);
  });
});
