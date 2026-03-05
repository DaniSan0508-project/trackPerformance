import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { LogIn, Mail, Lock, AlertCircle, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import backgroundImage from '../assets/imagem_fundo_login_portal.png';

export const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('admin@teste.com');
  const [password, setPassword] = useState('secret123');
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const data = await api.login({ email, password });
      login(data, rememberMe);
      navigate('/dashboard');
    } catch (err: any) {
      console.error('Login error:', err);
      if (err.message === 'Failed to fetch') {
        setError('Não foi possível conectar ao servidor (http://localhost:8012). Verifique se o backend está rodando.');
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
          src={backgroundImage}
          alt="Background"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-zinc-900/20 dark:bg-zinc-950/40 backdrop-blur-[1px]"></div>
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="sm:mx-auto sm:w-full sm:max-w-md relative z-10"
      >
        <div className="flex justify-center">
          <div className="bg-emerald-600 p-3 rounded-2xl shadow-lg">
            <LogIn className="w-8 h-8 text-white" />
          </div>
        </div>
        <h2 className="mt-6 text-center text-3xl font-bold tracking-tight text-white shadow-sm">
          TrackPerformance
        </h2>
        <p className="mt-2 text-center text-sm text-zinc-200">
          Entre na sua conta para gerenciar seu desempenho
        </p>
      </motion.div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10"
      >
        <div className="bg-white/90 dark:bg-zinc-900/90 backdrop-blur-md py-8 px-4 shadow-2xl rounded-2xl sm:px-10 border border-white/20 dark:border-zinc-700/50 transition-colors duration-200">
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                E-mail
              </label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-zinc-400 dark:text-zinc-500" />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-xl leading-5 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 placeholder-zinc-500 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm transition-all"
                  placeholder="admin@teste.com"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Senha
              </label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-zinc-400 dark:text-zinc-500" />
                </div>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-xl leading-5 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 placeholder-zinc-500 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm transition-all"
                  placeholder="••••••••"
                />
              </div>
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
                    className="h-4 w-4 text-emerald-600 focus:ring-emerald-500 border-zinc-300 dark:border-zinc-700 rounded cursor-pointer bg-white dark:bg-zinc-900"
                  />
                  <label htmlFor="remember-me" className="ml-2 block text-sm text-zinc-900 dark:text-zinc-300 cursor-pointer">
                    Manter-me conectado
                  </label>
                </div>

                <div className="text-sm">
                  <a href="#" className="font-medium text-emerald-600 hover:text-emerald-500 dark:text-emerald-500 dark:hover:text-emerald-400">
                    Esqueceu a senha?
                  </a>
                </div>
              </div>
            </div>

            {error && (
              <motion.div 
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="bg-red-50 dark:bg-red-900/20 border-l-4 border-red-400 dark:border-red-500 p-4 rounded-md"
              >
                <div className="flex">
                  <div className="flex-shrink-0">
                    <AlertCircle className="h-5 w-5 text-red-400 dark:text-red-500" />
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
                  </div>
                </div>
              </motion.div>
            )}

            <div>
              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
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
    </div>
  );
};
