import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Mail, Lock, KeyRound, AlertCircle, CheckCircle, Loader2, ArrowLeft, Send, Eye, EyeOff } from 'lucide-react';
import { authService } from '../../services';
import { resetEmailSchema, resetPasswordSchema } from '../../validators/schemas';

interface ForgotPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// TODO: Obter tenant_id dinamicamente (ex: pelo domínio do email ou via rota dedicada)
const TENANT_ID = 1;

type Step = 'email' | 'code' | 'success';

export const ForgotPasswordModal: React.FC<ForgotPasswordModalProps> = ({ isOpen, onClose }) => {
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirmation, setPasswordConfirmation] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordConfirmation, setShowPasswordConfirmation] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);

  // Timer para reenvio de código
  React.useEffect(() => {
    if (resendTimer > 0) {
      const timer = setTimeout(() => setResendTimer(resendTimer - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendTimer]);

  const handleRequestCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationErrors({});
    setError(null);

    const result = resetEmailSchema.safeParse({ email });
    if (!result.success) {
      const errors = result.error.flatten().fieldErrors;
      setValidationErrors({ email: errors.email?.[0] });
      return;
    }

    if (!TENANT_ID) {
      setError('Não foi possível identificar o tenant. Entre em contato com o suporte.');
      return;
    }

    setIsLoading(true);
    try {
      await authService.requestResetCode(email, TENANT_ID);
      setSuccessMessage('Se existir um usuário com este e-mail, o código de redefinição foi enviado.');
      setStep('code');
      setResendTimer(60); // 60 segundos para reenviar
    } catch (err: any) {
      setError(err.message || 'Ocorreu um erro ao solicitar o código.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationErrors({});
    setError(null);

    const result = resetPasswordSchema.safeParse({ code, password, passwordConfirmation });
    if (!result.success) {
      const errors = result.error.flatten().fieldErrors;
      setValidationErrors({
        code: errors.code?.[0],
        password: errors.password?.[0],
        passwordConfirmation: errors.passwordConfirmation?.[0],
      });
      return;
    }

    if (!TENANT_ID) {
      setError('Não foi possível identificar o tenant. Entre em contato com o suporte.');
      return;
    }

    setIsLoading(true);
    try {
      await authService.resetPassword(email, TENANT_ID, code, password, passwordConfirmation);
      setStep('success');
    } catch (err: any) {
      const errorMsg = err.message || 'Ocorreu um erro ao redefinir a senha.';
      let hasCodeError = false;
      
      // Tenta extrair erros específicos de campos da resposta da API
      const apiErrors = err.response?.data?.errors;
      if (apiErrors) {
        const fieldErrors: Record<string, string> = {};
        Object.keys(apiErrors).forEach((key) => {
          const field = key === 'code' ? 'code' : key === 'password' ? 'password' : key === 'password_confirmation' ? 'passwordConfirmation' : key;
          fieldErrors[field] = Array.isArray(apiErrors[key]) ? apiErrors[key][0] : String(apiErrors[key]);
          if (key === 'code') hasCodeError = true;
        });
        setValidationErrors(fieldErrors);
      } else {
        setError(errorMsg);
      }

      // Se o erro for de código expirado ou inválido, limpa o campo
      if (hasCodeError || errorMsg.toLowerCase().includes('expirado') || errorMsg.toLowerCase().includes('inválido')) {
        setCode('');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    // Reset state
    setStep('email');
    setEmail('');
    setCode('');
    setPassword('');
    setPasswordConfirmation('');
    setShowPassword(false);
    setShowPasswordConfirmation(false);
    setValidationErrors({});
    setError(null);
    setSuccessMessage(null);
    setIsLoading(false);
    setResendTimer(0);
    onClose();
  };

  const handleResendCode = async () => {
    if (resendTimer > 0) return;
    await handleRequestCode({ preventDefault: () => {} } as React.FormEvent);
  };

  const handleBackToEmail = () => {
    setStep('email');
    setCode('');
    setPassword('');
    setPasswordConfirmation('');
    setValidationErrors({});
    setError(null);
    setSuccessMessage(null);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          transition={{ type: 'spring', duration: 0.3 }}
          className="bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 pb-4 border-b border-zinc-200 dark:border-zinc-700">
            <div className="flex items-center gap-3">
              {step === 'code' && (
                <button
                  onClick={handleBackToEmail}
                  className="p-1 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                >
                  <ArrowLeft className="w-5 h-5 text-zinc-500 dark:text-zinc-400" />
                </button>
              )}
              <div className="bg-primary-100 dark:bg-primary-900/30 p-2 rounded-xl">
                <KeyRound className="w-6 h-6 text-primary-600 dark:text-primary-400" />
              </div>
              <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
                {step === 'email' && 'Esqueci a senha'}
                {step === 'code' && 'Código de verificação'}
                {step === 'success' && 'Senha redefinida!'}
              </h2>
            </div>
            <button
              onClick={handleClose}
              className="p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            >
              <X className="w-5 h-5 text-zinc-500 dark:text-zinc-400" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6">
            {/* Step 1: Email */}
            {step === 'email' && (
              <form onSubmit={handleRequestCode} className="space-y-4">
                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                  Informe seu e-mail para receber um código de verificação.
                </p>

                <div>
                  <label htmlFor="reset-email" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                    E-mail
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Mail className="h-5 w-5 text-zinc-400 dark:text-zinc-500" />
                    </div>
                    <input
                      id="reset-email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className={`block w-full pl-10 pr-3 py-2.5 border rounded-xl bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:border-primary-500 sm:text-sm transition-all ${
                        validationErrors.email
                          ? 'border-red-500 focus:ring-red-500'
                          : 'border-zinc-300 dark:border-zinc-700 focus:ring-primary-500'
                      }`}
                      placeholder="seu@email.com"
                    />
                  </div>
                  {validationErrors.email && (
                    <p className="mt-1 text-sm text-red-600 dark:text-red-400">{validationErrors.email}</p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-4 border border-transparent rounded-xl shadow-sm text-sm font-semibold text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  {isLoading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      Enviar código
                    </>
                  )}
                </button>
              </form>
            )}

            {/* Step 2: Code + New Password */}
            {step === 'code' && (
              <form onSubmit={handleResetPassword} className="space-y-4">
                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                  Digite o código de 6 dígitos enviado para <strong className="text-zinc-900 dark:text-zinc-100">{email}</strong>.
                </p>

                <div>
                  <label htmlFor="reset-code" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                    Código de verificação
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <KeyRound className="h-5 w-5 text-zinc-400 dark:text-zinc-500" />
                    </div>
                    <input
                      id="reset-code"
                      type="text"
                      maxLength={6}
                      value={code}
                      onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                      className={`block w-full pl-10 pr-3 py-2.5 border rounded-xl bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:border-primary-500 sm:text-sm transition-all ${
                        validationErrors.code
                          ? 'border-red-500 focus:ring-red-500'
                          : 'border-zinc-300 dark:border-zinc-700 focus:ring-primary-500'
                      }`}
                      placeholder="000000"
                    />
                  </div>
                  {validationErrors.code && (
                    <p className="mt-1 text-sm text-red-600 dark:text-red-400">{validationErrors.code}</p>
                  )}
                  <div className="mt-2 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={handleResendCode}
                      disabled={resendTimer > 0}
                      className="text-xs text-primary-600 hover:text-primary-500 dark:text-primary-400 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {resendTimer > 0 ? `Reenviar em ${resendTimer}s` : 'Reenviar código'}
                    </button>
                  </div>
                </div>

                <div>
                  <label htmlFor="reset-password" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                    Nova senha
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Lock className="h-5 w-5 text-zinc-400 dark:text-zinc-500" />
                    </div>
                    <input
                      id="reset-password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className={`block w-full pl-10 pr-10 py-2.5 border rounded-xl bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:border-primary-500 sm:text-sm transition-all ${
                        validationErrors.password
                          ? 'border-red-500 focus:ring-red-500'
                          : 'border-zinc-300 dark:border-zinc-700 focus:ring-primary-500'
                      }`}
                      placeholder="Mínimo 6 caracteres"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
                    >
                      {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                  {validationErrors.password && (
                    <p className="mt-1 text-sm text-red-600 dark:text-red-400">{validationErrors.password}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="reset-password-confirmation" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                    Confirmar nova senha
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Lock className="h-5 w-5 text-zinc-400 dark:text-zinc-500" />
                    </div>
                    <input
                      id="reset-password-confirmation"
                      type={showPasswordConfirmation ? 'text' : 'password'}
                      value={passwordConfirmation}
                      onChange={(e) => setPasswordConfirmation(e.target.value)}
                      className={`block w-full pl-10 pr-10 py-2.5 border rounded-xl bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:border-primary-500 sm:text-sm transition-all ${
                        validationErrors.passwordConfirmation
                          ? 'border-red-500 focus:ring-red-500'
                          : 'border-zinc-300 dark:border-zinc-700 focus:ring-primary-500'
                      }`}
                      placeholder="Repita a nova senha"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPasswordConfirmation(!showPasswordConfirmation)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
                    >
                      {showPasswordConfirmation ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                  {validationErrors.passwordConfirmation && (
                    <p className="mt-1 text-sm text-red-600 dark:text-red-400">{validationErrors.passwordConfirmation}</p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-4 border border-transparent rounded-xl shadow-sm text-sm font-semibold text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  {isLoading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    'Redefinir senha'
                  )}
                </button>
              </form>
            )}

            {/* Step 3: Success */}
            {step === 'success' && (
              <div className="text-center space-y-4">
                <div className="flex justify-center">
                  <div className="bg-green-100 dark:bg-green-900/30 p-4 rounded-full">
                    <CheckCircle className="w-12 h-12 text-green-600 dark:text-green-400" />
                  </div>
                </div>
                <p className="text-zinc-600 dark:text-zinc-400">
                  Sua senha foi redefinida com sucesso!
                </p>
                <button
                  onClick={handleClose}
                  className="w-full py-2.5 px-4 border border-transparent rounded-xl shadow-sm text-sm font-semibold text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-all"
                >
                  Voltar ao login
                </button>
              </div>
            )}

            {/* Error Message */}
            {error && (
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="mt-4 bg-red-50 dark:bg-red-900/20 border-l-4 border-red-400 dark:border-red-500 p-3 rounded-md"
              >
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-5 w-5 text-red-400 dark:text-red-500 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
                </div>
              </motion.div>
            )}

            {/* Success Message (step code) */}
            {successMessage && step === 'code' && (
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="mt-4 bg-green-50 dark:bg-green-900/20 border-l-4 border-green-400 dark:border-green-500 p-3 rounded-md"
              >
                <div className="flex items-start gap-2">
                  <CheckCircle className="h-5 w-5 text-green-400 dark:text-green-500 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-green-700 dark:text-green-400">{successMessage}</p>
                </div>
              </motion.div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
