import React, { useState, useEffect, useCallback } from 'react';
import { Layout } from '../components/Layout';
import { Search, Settings, Loader2, RefreshCw, X, Check, ChevronLeft, ChevronRight, Mail, Phone, Calendar, Globe, Bell, CreditCard, Box, Link as LinkIcon, Shield } from 'lucide-react';
import { motion } from 'motion/react';
import { useAuth } from '../context/AuthContext';
import { TenantConfig, PaginatedResponse } from '../types';

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

// Icon mapping helper
const getIconForConfig = (key: string) => {
  const lowerKey = key.toLowerCase();
  if (lowerKey.includes('email')) return <Mail className="w-6 h-6 text-zinc-600" />;
  if (lowerKey.includes('phone') || lowerKey.includes('celular') || lowerKey.includes('whatsapp')) return <Phone className="w-6 h-6 text-zinc-600" />;
  if (lowerKey.includes('date') || lowerKey.includes('time')) return <Calendar className="w-6 h-6 text-zinc-600" />;
  if (lowerKey.includes('url') || lowerKey.includes('site') || lowerKey.includes('domain')) return <Globe className="w-6 h-6 text-zinc-600" />;
  if (lowerKey.includes('notification') || lowerKey.includes('alert')) return <Bell className="w-6 h-6 text-zinc-600" />;
  if (lowerKey.includes('payment') || lowerKey.includes('card') || lowerKey.includes('pagamento')) return <CreditCard className="w-6 h-6 text-zinc-600" />;
  if (lowerKey.includes('stock') || lowerKey.includes('estoque')) return <Box className="w-6 h-6 text-zinc-600" />;
  if (lowerKey.includes('api') || lowerKey.includes('token') || lowerKey.includes('key')) return <LinkIcon className="w-6 h-6 text-zinc-600" />;
  if (lowerKey.includes('security') || lowerKey.includes('auth') || lowerKey.includes('password')) return <Shield className="w-6 h-6 text-zinc-600" />;
  
  return <Settings className="w-6 h-6 text-zinc-600" />;
};

const ConfigItem = ({ config, onUpdate }: { config: TenantConfig, onUpdate: (config: TenantConfig, newValue: string) => Promise<void> }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [value, setValue] = useState(config.config_value);
  const [updating, setUpdating] = useState(false);

  const isBoolean = config.config_value === 'true' || config.config_value === 'false';
  const hasChanged = value !== config.config_value;

  const handleSave = async () => {
    if (!hasChanged) {
      setIsEditing(false);
      return;
    }
    setUpdating(true);
    await onUpdate(config, value);
    setUpdating(false);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setValue(config.config_value);
    setIsEditing(false);
  };

  const formatKey = (key: string) => {
    return key.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };

  const formatDisplayValue = (key: string, val: string) => {
    if (val === 'true') return <span className="px-2 py-1 bg-emerald-100 text-emerald-700 rounded-md text-xs font-bold">ATIVO</span>;
    if (val === 'false') return <span className="px-2 py-1 bg-red-100 text-red-700 rounded-md text-xs font-bold">INATIVO</span>;
    
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
      className="bg-white p-6 rounded-2xl shadow-sm border border-zinc-100 hover:shadow-md transition-shadow"
    >
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-4 flex-1">
          <div className="bg-zinc-100 p-3 rounded-xl">
            {getIconForConfig(config.config_key)}
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-lg text-zinc-900">{formatKey(config.config_key)}</h3>
            <p className="text-sm text-zinc-500 font-mono mt-1">{config.config_key}</p>
          </div>
        </div>

        <div className="flex-1 w-full md:w-auto flex justify-end">
          {isEditing || isBoolean ? (
            <div className="flex items-center gap-2 w-full md:w-auto justify-end">
              {isBoolean ? (
                <button
                  onClick={() => setValue(value === 'true' ? 'false' : 'true')}
                  className={`px-3 py-1.5 rounded-lg text-sm font-bold transition-colors ${
                    value === 'true' 
                      ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200' 
                      : 'bg-red-100 text-red-700 hover:bg-red-200'
                  }`}
                >
                  {value === 'true' ? 'ATIVO' : 'INATIVO'}
                </button>
              ) : (
                <input
                  type="text"
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  className="flex-1 md:w-64 p-2 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-right"
                  autoFocus
                />
              )}
              
              {hasChanged && (
                <>
                  <button 
                    onClick={handleSave}
                    disabled={updating}
                    className="p-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition-colors"
                    title="Salvar"
                  >
                    {updating ? <Loader2 size={18} className="animate-spin" /> : <Check size={18} />}
                  </button>
                  <button 
                    onClick={handleCancel}
                    disabled={updating}
                    className="p-2 bg-zinc-200 text-zinc-600 rounded-lg hover:bg-zinc-300 disabled:opacity-50 transition-colors"
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
              <div className="inline-block bg-zinc-50 px-4 py-2 rounded-lg border border-zinc-200 max-w-full overflow-hidden text-ellipsis group-hover:border-emerald-300 group-hover:bg-emerald-50 transition-colors">
                <span className="font-mono text-sm text-zinc-700 break-all">
                  {formatDisplayValue(config.config_key, config.config_value)}
                </span>
              </div>
              <p className="text-xs text-zinc-400 mt-2 group-hover:text-emerald-600 transition-colors">
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
    setLoading(true);
    setError(null);
    try {
      const queryParams = new URLSearchParams();
      queryParams.append('page', page.toString());
      if (search) {
        queryParams.append('filter[search]', search);
      }

      const response = await fetch(`http://localhost:8012/api/v1/tenant-configs?${queryParams.toString()}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Falha ao carregar configurações');
      }

      const data: PaginatedResponse<TenantConfig> = await response.json();
      setConfigs(data.data);
      setCurrentPage(data.current_page);
      setTotalPages(data.last_page);
      setTotalItems(data.total);
      setFromItem(data.from);
      setToItem(data.to);
    } catch (err) {
      console.error('Error fetching configs:', err);
      setError('Não foi possível carregar as configurações. Verifique sua conexão.');
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
    try {
      const response = await fetch(`http://localhost:8012/api/v1/tenant-configs/${config.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          tenant_id: config.tenant_id,
          config_key: config.config_key,
          config_value: newValue
        }),
      });

      if (!response.ok) {
        throw new Error('Falha ao atualizar configuração');
      }

      // Update local state
      setConfigs(prevConfigs => prevConfigs.map(c => 
        c.id === config.id ? { ...c, config_value: newValue, updated_at: new Date().toISOString() } : c
      ));
    } catch (err) {
      console.error('Error updating config:', err);
      alert('Erro ao atualizar configuração. Tente novamente.');
    }
  };

  return (
    <Layout>
      <div className="p-4 md:p-8 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-zinc-900">Configurações do Sistema</h1>
            <p className="text-zinc-500">Gerencie as variáveis e parâmetros do seu ambiente.</p>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={() => fetchConfigs(currentPage, searchTerm)}
              className="bg-white border border-zinc-200 p-2 rounded-xl text-zinc-600 hover:bg-zinc-50 transition-all"
              title="Atualizar"
            >
              <RefreshCw size={20} className={loading ? "animate-spin" : ""} />
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-zinc-100 flex flex-col md:flex-row gap-4 items-center">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-zinc-400" size={20} />
            <input 
              type="text" 
              placeholder="Buscar por chave ou valor..." 
              className="w-full pl-10 pr-4 py-2 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
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
          <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl text-center">
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
                <div className="text-center py-12 bg-white rounded-2xl border border-dashed border-zinc-200">
                  <Settings className="w-12 h-12 text-zinc-300 mx-auto mb-3" />
                  <h3 className="text-lg font-medium text-zinc-900">Nenhuma configuração encontrada</h3>
                  <p className="text-zinc-500">Tente ajustar seus filtros de busca.</p>
                </div>
              )}
            </div>

            {/* Pagination Controls */}
            {totalItems > 0 && (
              <div className="flex items-center justify-between bg-white p-4 rounded-2xl border border-zinc-100">
                <div className="text-sm text-zinc-500">
                  Mostrando <span className="font-medium">{fromItem}</span> até <span className="font-medium">{toItem}</span> de <span className="font-medium">{totalItems}</span> resultados
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className="p-2 border border-zinc-200 rounded-lg hover:bg-zinc-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft size={20} />
                  </button>
                  <span className="text-sm font-medium px-2">
                    Página {currentPage} de {totalPages}
                  </span>
                  <button
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    className="p-2 border border-zinc-200 rounded-lg hover:bg-zinc-50 disabled:opacity-50 disabled:cursor-not-allowed"
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
