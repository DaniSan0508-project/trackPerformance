import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LoginPage } from '../../pages/LoginPage';

// ─── Hoisted mocks (necessário pois vi.mock é hoisted pelo Vitest) ────────────

const { mockAuthServiceLogin, mockLogin, mockNavigate } = vi.hoisted(() => ({
  mockAuthServiceLogin: vi.fn(),
  mockLogin: vi.fn(),
  mockNavigate: vi.fn(),
}));

// ─── Mocks de módulos ─────────────────────────────────────────────────────────

vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
}));

vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({ login: mockLogin }),
}));

vi.mock('../../services', () => ({
  authService: { login: mockAuthServiceLogin },
  dashboardService: {},
  usersService: {},
  campaignsService: {},
  productsService: {},
  manufacturersService: {},
  rolesService: {},
  rewardsService: {},
  feedbacksService: {},
  postsService: {},
  redemptionsService: {},
  tenantConfigsService: {},
  surveysService: {},
  storesService: {},
  coinsService: {},
}));

vi.mock('../../utils', () => ({
  resolvePortalDomain: () => 'empresa',
}));

vi.mock('../../resources/img-background-login.jpeg', () => ({
  default: 'bg.jpg',
}));

vi.mock('../../components/auth/ForgotPasswordModal', () => ({
  ForgotPasswordModal: ({ isOpen }: { isOpen: boolean }) =>
    isOpen ? <div data-testid="forgot-modal">Modal Esqueceu Senha</div> : null,
}));

// ─── Helper ───────────────────────────────────────────────────────────────────

const renderLoginPage = () => render(<LoginPage />);

// ─── Testes ───────────────────────────────────────────────────────────────────

describe('LoginPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renderiza os campos de e-mail e senha', () => {
    renderLoginPage();
    expect(screen.getByPlaceholderText('Digite seu e-mail')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Digite sua senha')).toBeInTheDocument();
  });

  it('renderiza o botão Entrar', () => {
    renderLoginPage();
    expect(screen.getByRole('button', { name: 'Entrar' })).toBeInTheDocument();
  });

  it('renderiza o checkbox "Manter-me conectado"', () => {
    renderLoginPage();
    expect(screen.getByRole('checkbox', { name: 'Manter-me conectado' })).toBeInTheDocument();
  });

  it('renderiza o botão "Esqueceu a senha?"', () => {
    renderLoginPage();
    expect(screen.getByRole('button', { name: 'Esqueceu a senha?' })).toBeInTheDocument();
  });

  it('exibe erro de validação para senha curta', async () => {
    const user = userEvent.setup();
    renderLoginPage();

    await user.type(screen.getByPlaceholderText('Digite seu e-mail'), 'user@test.com');
    await user.type(screen.getByPlaceholderText('Digite sua senha'), 'abc');
    await user.click(screen.getByRole('button', { name: 'Entrar' }));

    await waitFor(() => {
      expect(
        screen.getByText('A senha deve ter no mínimo 6 caracteres')
      ).toBeInTheDocument();
    });
  });

  it('não chama authService se validação falhar', async () => {
    const user = userEvent.setup();
    renderLoginPage();

    await user.type(screen.getByPlaceholderText('Digite seu e-mail'), 'user@test.com');
    await user.type(screen.getByPlaceholderText('Digite sua senha'), 'curta');
    await user.click(screen.getByRole('button', { name: 'Entrar' }));

    await waitFor(() => {
      expect(mockAuthServiceLogin).not.toHaveBeenCalled();
    });
  });

  it('chama authService.login com credenciais corretas', async () => {
    mockAuthServiceLogin.mockResolvedValueOnce({ access_token: 'tok', user: {}, tenant: {} });
    const user = userEvent.setup();
    renderLoginPage();

    await user.type(screen.getByPlaceholderText('Digite seu e-mail'), 'admin@teste.com');
    await user.type(screen.getByPlaceholderText('Digite sua senha'), 'secret123');
    await user.click(screen.getByRole('button', { name: 'Entrar' }));

    await waitFor(() => {
      expect(mockAuthServiceLogin).toHaveBeenCalledWith({
        email: 'admin@teste.com',
        password: 'secret123',
        domain: 'empresa',
      });
    });
  });

  it('redireciona para /dashboard após login bem-sucedido', async () => {
    mockAuthServiceLogin.mockResolvedValueOnce({ access_token: 'tok', user: {}, tenant: {} });
    const user = userEvent.setup();
    renderLoginPage();

    await user.type(screen.getByPlaceholderText('Digite seu e-mail'), 'admin@teste.com');
    await user.type(screen.getByPlaceholderText('Digite sua senha'), 'secret123');
    await user.click(screen.getByRole('button', { name: 'Entrar' }));

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
    });
  });

  it('exibe mensagem de erro quando authService.login falha', async () => {
    mockAuthServiceLogin.mockRejectedValueOnce(new Error('Não autorizado'));
    const user = userEvent.setup();
    renderLoginPage();

    await user.type(screen.getByPlaceholderText('Digite seu e-mail'), 'admin@teste.com');
    await user.type(screen.getByPlaceholderText('Digite sua senha'), 'wrongpass');
    await user.click(screen.getByRole('button', { name: 'Entrar' }));

    await waitFor(() => {
      expect(screen.getByText('Não autorizado')).toBeInTheDocument();
    });
  });

  it('exibe mensagem genérica quando servidor está indisponível', async () => {
    mockAuthServiceLogin.mockRejectedValueOnce(new Error('Failed to fetch'));
    const user = userEvent.setup();
    renderLoginPage();

    await user.type(screen.getByPlaceholderText('Digite seu e-mail'), 'admin@teste.com');
    await user.type(screen.getByPlaceholderText('Digite sua senha'), 'secret123');
    await user.click(screen.getByRole('button', { name: 'Entrar' }));

    await waitFor(() => {
      expect(
        screen.getByText(/Não foi possível conectar ao servidor/)
      ).toBeInTheDocument();
    });
  });

  it('abre o modal de esqueceu a senha ao clicar no botão', () => {
    renderLoginPage();
    expect(screen.queryByTestId('forgot-modal')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Esqueceu a senha?' }));
    expect(screen.getByTestId('forgot-modal')).toBeInTheDocument();
  });

  it('passa rememberMe=true para login quando checkbox está marcado', async () => {
    mockAuthServiceLogin.mockResolvedValueOnce({ access_token: 'tok', user: {}, tenant: {} });
    const user = userEvent.setup();
    renderLoginPage();

    await user.click(screen.getByRole('checkbox', { name: 'Manter-me conectado' }));
    await user.type(screen.getByPlaceholderText('Digite seu e-mail'), 'admin@teste.com');
    await user.type(screen.getByPlaceholderText('Digite sua senha'), 'secret123');
    await user.click(screen.getByRole('button', { name: 'Entrar' }));

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith(expect.anything(), true);
    });
  });
});
