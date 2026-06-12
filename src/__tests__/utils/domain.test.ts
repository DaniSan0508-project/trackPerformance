import { describe, it, expect } from 'vitest';
import { resolvePortalDomain } from '../../utils/domain';

// VITE_DEFAULT_DOMAIN=teste1 está configurado no .env do projeto.
// resolvePortalDomain retorna DEFAULT_DOMAIN (ou null se vazio) para hostnames locais.
const DEFAULT = 'teste1';

describe('resolvePortalDomain', () => {
  it('retorna o DEFAULT_DOMAIN para localhost', () => {
    expect(resolvePortalDomain('localhost')).toBe(DEFAULT);
  });

  it('retorna o DEFAULT_DOMAIN para 127.0.0.1', () => {
    expect(resolvePortalDomain('127.0.0.1')).toBe(DEFAULT);
  });

  it('retorna o DEFAULT_DOMAIN para IP de rede local', () => {
    expect(resolvePortalDomain('192.168.1.100')).toBe(DEFAULT);
  });

  it('extrai subdomínio de URL com 3 partes', () => {
    expect(resolvePortalDomain('cliente.app.com')).toBe('cliente');
  });

  it('extrai subdomínio de URL com 4 partes', () => {
    expect(resolvePortalDomain('empresa.portal.com.br')).toBe('empresa');
  });

  it('retorna DEFAULT_DOMAIN para hostname com 2 partes (sem subdomínio)', () => {
    expect(resolvePortalDomain('portal.com')).toBe(DEFAULT);
  });

  it('normaliza hostname em maiúsculas (LOCALHOST → DEFAULT_DOMAIN)', () => {
    expect(resolvePortalDomain('LOCALHOST')).toBe(DEFAULT);
  });

  it('retorna DEFAULT_DOMAIN para string vazia', () => {
    expect(resolvePortalDomain('')).toBe(DEFAULT);
  });
});
