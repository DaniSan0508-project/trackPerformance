import React, { useState, useEffect } from 'react';
import { Layout } from '../components/Layout';
import { Search, Filter, Settings, Plus, Loader2, RefreshCw, Edit2, X, Check, ChevronLeft, ChevronRight } from 'lucide-react';
import { motion } from 'motion/react';
import { useAuth } from '../context/AuthContext';
import { TenantConfig, PaginatedResponse } from '../types';

export const SettingsPage: React.FC = () => {
  const { token } = useAuth();
  const [configs, setConfigs] = useState<TenantConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [fromItem, setFromItem] = useState(0);
  const [toItem, setToItem] = useState(0);

  // Edit state
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editValue, setEditValue] = useState('');
  const [updating, setUpdating] = useState(false);
  
  const fetchConfigs = async (page = 1) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`http://localhost:8012/api/v1/tenant-configs?page=${page}`, {
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
  };

  useEffect(() => {
    fetchConfigs(currentPage);
  }, [token, currentPage]);

  const handleEdit = (config: TenantConfig) => {
    setEditingId(config.id);
    setEditValue(config.config_value);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditValue('');
  };

  const handleUpdate = async (config: TenantConfig) => {
    setUpdating(true);
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
          config_value: editValue
        }),
      });

      if (!response.ok) {
        throw new Error('Falha ao atualizar configuração');
      }

      // Update local state
      setConfigs(configs.map(c => 
        c.id === config.id ? { ...c, config_value: editValue, updated_at: new Date().toISOString() } : c
      ));
      setEditingId(null);
    } catch (err) {
      console.error('Error updating config:', err);
      alert('Erro ao atualizar configuração. Tente novamente.');
    } finally {
      setUpdating(false);
    }
  };

  const filteredConfigs = configs.filter(config => 
    config.config_key.toLowerCase().includes(searchTerm.toLowerCase()) || 
    config.config_value.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatKey = (key: string) => {
    return key.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
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
              onClick={() => fetchConfigs(currentPage)}
              className="bg-white border border-zinc-200 p-2 rounded-xl text-zinc-600 hover:bg-zinc-50 transition-all"
              title="Atualizar"
            >
              <RefreshCw size={20} className={loading ? "animate-spin" : ""} />
            </button>
            <button className="bg-emerald-600 px-4 py-2 rounded-xl text-sm font-medium text-white hover:bg-emerald-700 shadow-sm transition-all flex items-center gap-2">
              <Plus size={18} />
              Nova Configuração
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
          
          <div className="flex items-center gap-2 w-full md:w-auto">
            <Filter size={20} className="text-zinc-400" />
            <select 
              className="flex-1 md:w-48 p-2 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
            >
              <option value="all">Todas as Categorias</option>
              <option value="system">Sistema</option>
              <option value="integration">Integrações</option>
              <option value="notifications">Notificações</option>
            </select>
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
            <button onClick={() => fetchConfigs(currentPage)} className="block mx-auto mt-2 text-sm font-semibold hover:underline">
              Tentar novamente
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4">
              {filteredConfigs.map((config) => (
                <motion.div 
                  key={config.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white p-6 rounded-2xl shadow-sm border border-zinc-100 hover:shadow-md transition-shadow"
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-start gap-4 flex-1">
                      <div className="bg-zinc-100 p-3 rounded-xl">
                        <Settings className="w-6 h-6 text-zinc-600" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-bold text-lg text-zinc-900">{formatKey(config.config_key)}</h3>
                        <p className="text-sm text-zinc-500 font-mono mt-1">{config.config_key}</p>
                      </div>
                    </div>

                    <div className="flex-1 w-full md:w-auto">
                      {editingId === config.id ? (
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            className="flex-1 p-2 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                            autoFocus
                          />
                          <button 
                            onClick={() => handleUpdate(config)}
                            disabled={updating}
                            className="p-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50"
                          >
                            {updating ? <Loader2 size={18} className="animate-spin" /> : <Check size={18} />}
                          </button>
                          <button 
                            onClick={handleCancelEdit}
                            disabled={updating}
                            className="p-2 bg-zinc-200 text-zinc-600 rounded-lg hover:bg-zinc-300 disabled:opacity-50"
                          >
                            <X size={18} />
                          </button>
                        </div>
                      ) : (
                        <div className="flex flex-col md:items-end">
                          <div className="flex items-center gap-2 justify-between md:justify-end w-full">
                            <div className="inline-block bg-zinc-50 px-4 py-2 rounded-lg border border-zinc-200 max-w-full overflow-hidden text-ellipsis">
                              <span className="font-mono text-sm text-zinc-700 break-all">
                                {config.config_value}
                              </span>
                            </div>
                            <button 
                              onClick={() => handleEdit(config)}
                              className="p-2 text-zinc-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-full transition-colors"
                            >
                              <Edit2 size={18} />
                            </button>
                          </div>
                          <p className="text-xs text-zinc-400 mt-2">
                            Atualizado em: {new Date(config.updated_at).toLocaleDateString()}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}

              {filteredConfigs.length === 0 && (
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
