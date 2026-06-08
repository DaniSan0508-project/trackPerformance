import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { LogIn, Mail, Lock, AlertCircle, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { authService, dashboardService, usersService, campaignsService, productsService, manufacturersService, rolesService, rewardsService, feedbacksService, postsService, redemptionsService, tenantConfigsService, surveysService, storesService, coinsService } from '../services';
import { resolvePortalDomain } from '../utils';
import { loginSchema } from '../validators/schemas';
import loginBackgroundImage from '../resources/img-background-login.jpeg';
import { ForgotPasswordModal } from '../components/auth/ForgotPasswordModal';

export const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<{ email?: string; password?: string }>({});
  const [isLoading, setIsLoading] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationErrors({});
    setError(null);

    // Validação com Zod
    const result = loginSchema.safeParse({ email, password });
    if (!result.success) {
      const errors = result.error.flatten().fieldErrors;
      setValidationErrors({
        email: errors.email?.[0],
        password: errors.password?.[0],
      });
      return;
    }

    setIsLoading(true);

    try {
      const domain = resolvePortalDomain();

      if (!domain) {
        setError('Não foi possível identificar o domínio do portal para autenticação.');
        return;
      }

      const data = await authService.login({ email, password, domain });
      login(data, rememberMe);
      navigate('/dashboard');
    } catch (err: any) {
      console.error('Login error:', err);
      if (err.message === 'Failed to fetch') {
        setError('Não foi possível conectar ao servidor (http://localhost:8010). Verifique se o backend está rodando.');
      } else {
        setError(err.message || 'Ocorreu um erro ao tentar fazer login.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-center py-12 sm:px-6 lg:px-8 transition-colors duration-200 relative overflow-hidden">
      {/* Background Image & Overlay */}
      <div className="absolute inset-0 z-0">
        <img
          src={loginBackgroundImage}
          alt="Background"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-zinc-900/40 backdrop-blur-[3px]"></div>
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="sm:mx-auto sm:w-full sm:max-w-md relative z-10 px-4 sm:px-0"
      >
        <div className="bg-zinc-950/80 backdrop-blur-md py-8 px-4 shadow-2xl rounded-2xl sm:px-10 border border-zinc-800/80 transition-all duration-300">
          
          {/* Logo & Subtitle inside the box */}
          <div className="flex flex-col items-center justify-center mb-8">
            <div className="transform hover:scale-105 transition-transform duration-300">
              <img 
                src="/logo.png" 
                alt="Engora Logo" 
                className="w-48 h-auto object-contain"
              />
            </div>
            <p className="mt-2 text-center text-sm text-zinc-400 font-medium">
              Suba de nível na gestão da sua empresa!
            </p>
          </div>

          <form className="space-y-6" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-zinc-300">
                E-mail
              </label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-zinc-500" />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={`block w-full pl-10 pr-3 py-2 border rounded-xl leading-5 bg-zinc-900/60 text-zinc-100 placeholder-zinc-600 focus:outline-none focus:ring-2 focus:border-orange-500 focus:ring-orange-500 sm:text-sm transition-all ${
                    validationErrors.email
                      ? 'border-red-500 focus:ring-red-500 focus:border-red-500'
                      : 'border-zinc-800 focus:ring-orange-500'
                  }`}
                  placeholder="Digite seu e-mail"
                />
              </div>
              {validationErrors.email && (
                <p className="mt-1 text-sm text-red-400">{validationErrors.email}</p>
              )}
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-zinc-300">
                Senha
              </label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-zinc-500" />
                </div>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={`block w-full pl-10 pr-3 py-2 border rounded-xl leading-5 bg-zinc-900/60 text-zinc-100 placeholder-zinc-600 focus:outline-none focus:ring-2 focus:border-orange-500 focus:ring-orange-500 sm:text-sm transition-all ${
                    validationErrors.password
                      ? 'border-red-500 focus:ring-red-500 focus:border-red-500'
                      : 'border-zinc-800 focus:ring-orange-500'
                  }`}
                  placeholder="Digite sua senha"
                />
              </div>
              {validationErrors.password && (
                <p className="mt-1 text-sm text-red-400">{validationErrors.password}</p>
              )}
            </div>

            <div>
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <input
                    id="remember-me"
                    name="remember-me"
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="h-4 w-4 text-orange-500 focus:ring-orange-500 border-zinc-700 rounded cursor-pointer bg-zinc-900 accent-orange-500"
                  />
                  <label htmlFor="remember-me" className="ml-2 block text-sm text-zinc-300 cursor-pointer select-none">
                    Manter-me conectado
                  </label>
                </div>

                <div className="text-sm">
                  <button
                    type="button"
                    onClick={() => setShowForgotPassword(true)}
                    className="font-medium text-orange-500 hover:text-orange-400 transition-colors"
                  >
                    Esqueceu a senha?
                  </button>
                </div>
              </div>
            </div>

            {error && (
              <motion.div 
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="bg-red-950/30 border-l-4 border-red-500 p-4 rounded-md"
              >
                <div className="flex">
                  <div className="flex-shrink-0">
                    <AlertCircle className="h-5 w-5 text-red-500" />
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-red-400">{error}</p>
                  </div>
                </div>
              </motion.div>
            )}

            <div>
              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-lg text-sm font-semibold text-white bg-orange-500 hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 focus:ring-offset-zinc-900 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {isLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  'Entrar'
                )}
              </button>
            </div>
          </form>
        </div>
      </motion.div>

      <ForgotPasswordModal
        isOpen={showForgotPassword}
        onClose={() => setShowForgotPassword(false)}
      />
    </div>
  );
};
