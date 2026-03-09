import React, { useState, useEffect, useCallback } from 'react';
import { Layout } from '../components/Layout';
import { Search, Settings, Loader2, RefreshCw, X, Check, ChevronLeft, ChevronRight } from 'lucide-react';
import { motion } from 'motion/react';
import { useAuth } from '../context/AuthContext';
import { TenantConfig, PaginatedResponse } from '../types';
import { api } from '../services/api';
import { useToast } from '../context/ToastContext';
import { tenantConfigValidations } from '../validators/schemas';

// Utility for debouncing
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);
  return debouncedValue;
}

const translateConfigKey = (key: string): string => {
  const translations: Record<string, string> = {
    cnpj: 'CNPJ',
    email: 'E-mail',
    phone: 'Telefone',
    timezone: 'Fuso Horário',
    date_format: 'Formato de Data',
    email_notifications_enabled: 'Notificações por E-mail',
    api_integration_enabled: 'Integração via API',
    webhook_url: 'URL do Webhook',
    allow_user_post: 'Permitir Posts de Usuários',
    primary_color: 'Cor Primária',
    secondary_color: 'Cor Secundária',
    path_logo: 'URL do Logo',
    path_welcome: 'Tela de Boas-vindas',
    coin_name: 'Nome da Moeda',
    privacy_policy_url: 'URL da Política de Privacidade',
    post_quantity: 'Quantidade de Posts',
    user_profile: 'Perfil do Usuário'
  };
  return translations[key] || key.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
};

// Opções para o perfil do usuário
const userProfileOptions = [
  { value: 'corporate', label: 'Corporativo' },
  { value: 'multiple_companies', label: 'Múltiplas Empresas' }
];

const ConfigItem: React.FC<{ config: TenantConfig, onUpdate: (config: TenantConfig, newValue: string) => Promise<boolean> }> = ({ config, onUpdate }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [value, setValue] = useState(config.config_value);
  const [updating, setUpdating] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const isBoolean = config.config_value === 'true' || config.config_value === 'false';
  const isUserProfile = config.config_key === 'user_profile';
  const hasChanged = value !== config.config_value;

  // Validação em tempo real
  const validateValue = (val: string) => {
    const validation = tenantConfigValidations[config.config_key as keyof typeof tenantConfigValidations];
    if (validation) {
      const result = validation.safeParse(val);
      if (!result.success) {
        return result.error.errors[0]?.message || 'Valor inválido';
      }
    }
    return null;
  };

  // Verifica se há erro de validação
  const hasError = validationError !== null;

  const handleSave = async () => {
    if (!hasChanged) {
      setIsEditing(false);
      return;
    }

    // Valida antes de salvar
    const error = validateValue(value);
    if (error) {
      setValidationError(error);
      return;
    }

    setUpdating(true);
    const success = await onUpdate(config, value);
    setUpdating(false);
    if (success) {
      setIsEditing(false);
      setValidationError(null);
    }
  };

  const handleCancel = () => {
    setValue(config.config_value);
    setIsEditing(false);
    setValidationError(null);
  };

  const formatDisplayValue = (key: string, val: string) => {
    if (val === 'true') return <span className="px-2 py-1 bg-emerald-100 text-emerald-700 rounded-md text-xs font-bold">ATIVO</span>;
    if (val === 'false') return <span className="px-2 py-1 bg-red-100 text-red-700 rounded-md text-xs font-bold">INATIVO</span>;

    // Mostra o label traduzido para user_profile
    if (key === 'user_profile') {
      const option = userProfileOptions.find(o => o.value === val);
      return option?.label || val;
    }

    // CNPJ Mask
    if (key.includes('cnpj') || key.includes('document')) {
      return val.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5");
    }

    // Phone Mask
    if (key.includes('phone') || key.includes('celular') || key.includes('whatsapp')) {
       const digits = val.replace(/\D/g, '');
       if (digits.length === 11) return digits.replace(/^(\d{2})(\d{5})(\d{4})/, "($1) $2-$3");
       if (digits.length === 10) return digits.replace(/^(\d{2})(\d{4})(\d{4})/, "($1) $2-$3");
    }

    return val;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white dark:bg-zinc-900 p-6 rounded-2xl shadow-sm border border-zinc-100 dark:border-zinc-800 hover:shadow-md transition-all duration-200"
    >
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex-1">
          <h3 className="font-bold text-lg text-zinc-900 dark:text-zinc-100">{translateConfigKey(config.config_key)}</h3>
        </div>

        <div className="flex-1 w-full md:w-auto flex justify-end">
          {isEditing || isBoolean || isUserProfile ? (
            <div className="flex items-center gap-2 w-full md:w-auto justify-end">
              {isBoolean ? (
                <button
                  onClick={() => setValue(value === 'true' ? 'false' : 'true')}
                  className={`px-3 py-1.5 rounded-lg text-sm font-bold transition-colors ${
                    value === 'true'
                      ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-200 dark:hover:bg-emerald-900/50'
                      : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/50'
                  }`}
                >
                  {value === 'true' ? 'ATIVO' : 'INATIVO'}
                </button>
              ) : isUserProfile ? (
                <select
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  className="px-3 py-1.5 border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
                  autoFocus
                >
                  {userProfileOptions.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              ) : (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={value}
                    onChange={(e) => {
                      setValue(e.target.value);
                      setValidationError(null);
                    }}
                    className={`flex-1 md:w-64 p-2 border bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 rounded-lg focus:ring-2 focus:border-emerald-500 text-right transition-colors ${
                      validationError
                        ? 'border-red-500 focus:ring-red-500'
                        : 'border-zinc-300 dark:border-zinc-700 focus:ring-emerald-500'
                    }`}
                    autoFocus
                  />
                </div>
              )}

              {validationError && (
                <p className="text-xs text-red-600 dark:text-red-400 w-full text-right">{validationError}</p>
              )}

              {(hasChanged || validationError) && (
                <>
                  <button
                    onClick={handleSave}
                    disabled={updating || hasError}
                    className="p-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    title={hasError ? 'Corrija o erro antes de salvar' : 'Salvar'}
                  >
                    {updating ? <Loader2 size={18} className="animate-spin" /> : <Check size={18} />}
                  </button>
                  <button
                    onClick={handleCancel}
                    disabled={updating}
                    className="p-2 bg-zinc-200 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300 rounded-lg hover:bg-zinc-300 dark:hover:bg-zinc-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    title="Cancelar"
                  >
                    <X size={18} />
                  </button>
                </>
              )}
            </div>
          ) : (
            <div
              className="flex flex-col md:items-end cursor-pointer group"
              onClick={() => setIsEditing(true)}
            >
              <div className="inline-block bg-zinc-50 dark:bg-zinc-800 px-4 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 max-w-full overflow-hidden text-ellipsis group-hover:border-emerald-300 dark:group-hover:border-emerald-700 group-hover:bg-emerald-50 dark:group-hover:bg-emerald-900/20 transition-colors duration-200">
                <span className="font-mono text-sm text-zinc-700 dark:text-zinc-300 break-all">
                  {formatDisplayValue(config.config_key, config.config_value)}
                </span>
              </div>
              <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-2 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                Clique para editar
              </p>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export const SettingsPage: React.FC = () => {
  const { token } = useAuth();
  const { addToast } = useToast();
  const [configs, setConfigs] = useState<TenantConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 500);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [fromItem, setFromItem] = useState(0);
  const [toItem, setToItem] = useState(0);

  const fetchConfigs = useCallback(async (page = 1, search = '') => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const data = await api.getTenantConfigs(token, page, search);
      console.log('Configs API Response:', data);
      setConfigs(data.data);
      setCurrentPage(data.current_page);
      setTotalPages(data.last_page);
      setTotalItems(data.total);
      setFromItem(data.from);
      setToItem(data.to);
    } catch (err: any) {
      setError(err.message || 'Não foi possível carregar as configurações. Verifique sua conexão.');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchConfigs(currentPage, debouncedSearchTerm);
  }, [fetchConfigs, currentPage, debouncedSearchTerm]);

  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearchTerm]);

  const handleUpdateConfig = async (config: TenantConfig, newValue: string) => {
    if (!token) return;

    // Validação específica por tipo de configuração
    const validation = tenantConfigValidations[config.config_key as keyof typeof tenantConfigValidations];
    if (validation) {
      const result = validation.safeParse(newValue);
      if (!result.success) {
        const errorMessage = result.error.errors[0]?.message || 'Valor inválido';
        addToast('error', errorMessage);
        return false; // Retorna false para indicar falha
      }
    }

    try {
      await api.updateTenantConfig(token, config.id, {
        tenant_id: config.tenant_id,
        config_key: config.config_key,
        config_value: newValue
      });

      // Update local state
      setConfigs(prevConfigs => prevConfigs.map(c =>
        c.id === config.id ? { ...c, config_value: newValue, updated_at: new Date().toISOString() } : c
      ));
      addToast('success', 'Configuração atualizada com sucesso!');
      return true;
    } catch (err) {
      console.error('Error updating config:', err);
      addToast('error', 'Erro ao atualizar configuração. Tente novamente.');
      return false;
    }
  };

  return (
    <Layout>
      <div className="p-4 md:p-8 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Configurações do Sistema</h1>
            <p className="text-zinc-500 dark:text-zinc-400">Gerencie as variáveis e parâmetros do seu ambiente.</p>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={() => fetchConfigs(currentPage, searchTerm)}
              className="bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 p-2 rounded-xl text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-all"
              title="Atualizar"
            >
              <RefreshCw size={20} className={loading ? "animate-spin" : ""} />
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white dark:bg-zinc-900 p-4 rounded-2xl shadow-sm border border-zinc-100 dark:border-zinc-800 flex flex-col md:flex-row gap-4 items-center transition-colors duration-200">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-zinc-400 dark:text-zinc-500" size={20} />
            <input 
              type="text" 
              placeholder="Buscar por chave ou valor..." 
              className="w-full pl-10 pr-4 py-2 border border-zinc-200 dark:border-zinc-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-500 transition-colors"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {/* Config List */}
        {loading && configs.length === 0 ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
          </div>
        ) : error ? (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 p-4 rounded-xl text-center">
            {error}
            <button onClick={() => fetchConfigs(currentPage, searchTerm)} className="block mx-auto mt-2 text-sm font-semibold hover:underline">
              Tentar novamente
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4">
              {configs.map((config) => (
                <ConfigItem 
                  key={config.id} 
                  config={config} 
                  onUpdate={handleUpdateConfig} 
                />
              ))}

              {configs.length === 0 && (
                <div className="text-center py-12 bg-white dark:bg-zinc-900 rounded-2xl border border-dashed border-zinc-200 dark:border-zinc-700 transition-colors duration-200">
                  <h3 className="text-lg font-medium text-zinc-900 dark:text-zinc-100">Nenhuma configuração encontrada</h3>
                  <p className="text-zinc-500 dark:text-zinc-400">Tente ajustar seus filtros de busca.</p>
                </div>
              )}
            </div>

            {/* Pagination Controls */}
            {totalItems > 0 && (
              <div className="flex items-center justify-between bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-zinc-100 dark:border-zinc-800 transition-colors duration-200">
                <div className="text-sm text-zinc-500 dark:text-zinc-400">
                  Mostrando <span className="font-medium">{fromItem}</span> até <span className="font-medium">{toItem}</span> de <span className="font-medium">{totalItems}</span> resultados
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className="p-2 border border-zinc-200 dark:border-zinc-700 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed text-zinc-600 dark:text-zinc-300 transition-colors"
                  >
                    <ChevronLeft size={20} />
                  </button>
                  <span className="text-sm font-medium px-2 text-zinc-700 dark:text-zinc-300">
                    Página {currentPage} de {totalPages}
                  </span>
                  <button
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    className="p-2 border border-zinc-200 dark:border-zinc-700 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed text-zinc-600 dark:text-zinc-300 transition-colors"
                  >
                    <ChevronRight size={20} />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
};
