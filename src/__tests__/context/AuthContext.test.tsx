import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act, waitFor } from '@testing-library/react';
import { AuthProvider, useAuth } from '../../context/AuthContext';
import type { AuthResponse } from '../../types';

// Mocks de serviços externos chamados pelo AuthProvider
vi.mock('../../services/tenantConfigs/tenantConfigsService', () => ({
  tenantConfigsService: {
    getTenantConfigs: vi.fn().mockResolvedValue({ data: [] }),
  },
}));

vi.mock('../../services/users/usersService', () => ({
  usersService: {
    getUser: vi.fn().mockResolvedValue({ data: null }),
  },
}));

vi.mock('../../services/auth/authService', () => ({
  authService: {
    refreshToken: vi.fn().mockResolvedValue({ access_token: 'new-token', expires_in: 3600 }),
  },
}));

const mockAuthData: AuthResponse = {
  access_token: 'token-abc-123',
  user: {
    id: 1,
    name: 'Admin Teste',
    email: 'admin@teste.com',
    user_type_id: 1,
    active: true,
    store_id: null,
    tenant_id: 1,
  } as any,
  tenant: { id: 1, name: 'Empresa Teste' } as any,
};

// Componente auxiliar para expor o contexto em testes
const TestConsumer = () => {
  const { user, isAuthenticated, token } = useAuth();
  return (
    <div>
      <span data-testid="authenticated">{String(isAuthenticated)}</span>
      <span data-testid="user-name">{user?.name ?? 'none'}</span>
      <span data-testid="token">{token ?? 'none'}</span>
    </div>
  );
};

const renderWithAuth = () =>
  render(
    <AuthProvider>
      <TestConsumer />
    </AuthProvider>
  );

describe('AuthContext', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  it('inicia sem autenticação', async () => {
    renderWithAuth();
    await waitFor(() => {
      expect(screen.getByTestId('authenticated').textContent).toBe('false');
      expect(screen.getByTestId('user-name').textContent).toBe('none');
    });
  });

  it('lança erro se useAuth for usado fora do AuthProvider', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => render(<TestConsumer />)).toThrow(
      'useAuth must be used within an AuthProvider'
    );
    spy.mockRestore();
  });

  it('restaura sessão do sessionStorage ao montar', async () => {
    sessionStorage.setItem('track_performance_auth', JSON.stringify(mockAuthData));
    renderWithAuth();
    await waitFor(() => {
      expect(screen.getByTestId('authenticated').textContent).toBe('true');
      expect(screen.getByTestId('user-name').textContent).toBe('Admin Teste');
    });
  });

  it('restaura sessão do localStorage ao montar', async () => {
    localStorage.setItem('track_performance_auth', JSON.stringify(mockAuthData));
    renderWithAuth();
    await waitFor(() => {
      expect(screen.getByTestId('authenticated').textContent).toBe('true');
      expect(screen.getByTestId('token').textContent).toBe('token-abc-123');
    });
  });

  it('login sem rememberMe salva em sessionStorage', async () => {
    const LoginConsumer = () => {
      const { login, isAuthenticated } = useAuth();
      return (
        <div>
          <span data-testid="authenticated">{String(isAuthenticated)}</span>
          <button onClick={() => login(mockAuthData, false)}>Entrar</button>
        </div>
      );
    };

    render(
      <AuthProvider>
        <LoginConsumer />
      </AuthProvider>
    );

    await waitFor(() => screen.getByText('Entrar'));
    act(() => screen.getByText('Entrar').click());

    await waitFor(() => {
      expect(screen.getByTestId('authenticated').textContent).toBe('true');
      expect(sessionStorage.getItem('track_performance_auth')).not.toBeNull();
      expect(localStorage.getItem('track_performance_auth')).toBeNull();
    });
  });

  it('login com rememberMe salva em localStorage', async () => {
    const LoginConsumer = () => {
      const { login, isAuthenticated } = useAuth();
      return (
        <div>
          <span data-testid="authenticated">{String(isAuthenticated)}</span>
          <button onClick={() => login(mockAuthData, true)}>Entrar</button>
        </div>
      );
    };

    render(
      <AuthProvider>
        <LoginConsumer />
      </AuthProvider>
    );

    await waitFor(() => screen.getByText('Entrar'));
    act(() => screen.getByText('Entrar').click());

    await waitFor(() => {
      expect(screen.getByTestId('authenticated').textContent).toBe('true');
      expect(localStorage.getItem('track_performance_auth')).not.toBeNull();
      expect(sessionStorage.getItem('track_performance_auth')).toBeNull();
    });
  });

  it('updateCurrentUser atualiza o nome do usuário', async () => {
    sessionStorage.setItem('track_performance_auth', JSON.stringify(mockAuthData));

    const UpdateConsumer = () => {
      const { user, updateCurrentUser } = useAuth();
      return (
        <div>
          <span data-testid="user-name">{user?.name ?? 'none'}</span>
          <button
            onClick={() =>
              updateCurrentUser({ ...mockAuthData.user, name: 'Novo Nome' } as any)
            }
          >
            Atualizar
          </button>
        </div>
      );
    };

    render(
      <AuthProvider>
        <UpdateConsumer />
      </AuthProvider>
    );

    await waitFor(() => expect(screen.getByTestId('user-name').textContent).toBe('Admin Teste'));
    act(() => screen.getByText('Atualizar').click());
    await waitFor(() => expect(screen.getByTestId('user-name').textContent).toBe('Novo Nome'));
  });
});
