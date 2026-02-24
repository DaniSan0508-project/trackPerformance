import React, { useState, useEffect, useCallback } from 'react';
import { Layout } from '../components/Layout';
import { Search, Store, Plus, Loader2, RefreshCw, ChevronLeft, ChevronRight, Phone, Mail } from 'lucide-react';
import { motion } from 'motion/react';
import { useAuth } from '../context/AuthContext';
import { Store as StoreType, PaginatedResponse } from '../types';

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

export const StoresPage: React.FC = () => {
  const { token } = useAuth();
  const [stores, setStores] = useState<StoreType[]>([]);
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

  const fetchStores = useCallback(async (page = 1, search = '') => {
    setLoading(true);
    setError(null);
    try {
      const queryParams = new URLSearchParams();
      queryParams.append('page', page.toString());
      queryParams.append('include', 'tenant,group');
      if (search) {
        queryParams.append('filter[name]', search);
      }

      const response = await fetch(`http://localhost:8012/api/v1/stores?${queryParams.toString()}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Falha ao carregar lojas');
      }

      const data: PaginatedResponse<StoreType> = await response.json();
      setStores(data.data);
      setCurrentPage(data.current_page);
      setTotalPages(data.last_page);
      setTotalItems(data.total);
      setFromItem(data.from);
      setToItem(data.to);
    } catch (err) {
      console.error('Error fetching stores:', err);
      setError('Não foi possível carregar as lojas. Verifique sua conexão.');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchStores(currentPage, debouncedSearchTerm);
  }, [fetchStores, currentPage, debouncedSearchTerm]);

  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearchTerm]);

  return (
    <Layout>
      <div className="p-4 md:p-8 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-zinc-900">Lojas</h1>
            <p className="text-zinc-500">Gerencie as lojas da sua rede.</p>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={() => fetchStores(currentPage, searchTerm)}
              className="bg-white border border-zinc-200 p-2 rounded-xl text-zinc-600 hover:bg-zinc-50 transition-all"
              title="Atualizar"
            >
              <RefreshCw size={20} className={loading ? "animate-spin" : ""} />
            </button>
            <button className="bg-emerald-600 px-4 py-2 rounded-xl text-sm font-medium text-white hover:bg-emerald-700 shadow-sm transition-all flex items-center gap-2">
              <Plus size={18} />
              Nova Loja
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-zinc-100 flex flex-col md:flex-row gap-4 items-center">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-zinc-400" size={20} />
            <input 
              type="text" 
              placeholder="Buscar por nome..." 
              className="w-full pl-10 pr-4 py-2 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {/* Stores List */}
        {loading && stores.length === 0 ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl text-center">
            {error}
            <button onClick={() => fetchStores(currentPage, searchTerm)} className="block mx-auto mt-2 text-sm font-semibold hover:underline">
              Tentar novamente
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4">
              {stores.map((store) => (
                <motion.div 
                  key={store.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white p-6 rounded-2xl shadow-sm border border-zinc-100 hover:shadow-md transition-shadow"
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-start gap-4 flex-1">
                      <div className="bg-emerald-100 p-3 rounded-xl">
                        <Store className="w-6 h-6 text-emerald-600" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                            <h3 className="font-bold text-lg text-zinc-900">{store.name}</h3>
                            {store.active ? (
                                <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-full text-xs font-bold">ATIVO</span>
                            ) : (
                                <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded-full text-xs font-bold">INATIVO</span>
                            )}
                        </div>
                        <p className="text-sm text-zinc-500 font-mono mt-1">CNPJ: {store.cnpj}</p>
                        
                        <div className="flex flex-wrap gap-4 mt-3 text-sm text-zinc-600">
                            {store.email && (
                                <div className="flex items-center gap-1">
                                    <Mail size={14} className="text-zinc-400" />
                                    <span>{store.email}</span>
                                </div>
                            )}
                            {store.phone && (
                                <div className="flex items-center gap-1">
                                    <Phone size={14} className="text-zinc-400" />
                                    <span>{store.phone}</span>
                                </div>
                            )}
                        </div>
                      </div>
                    </div>

                    <div className="flex-1 md:text-right">
                        {store.group && (
                            <span className="inline-block bg-zinc-100 text-zinc-600 px-3 py-1 rounded-full text-xs font-medium mb-2">
                                {store.group.name}
                            </span>
                        )}
                        <p className="text-xs text-zinc-400 mt-1">
                            Atualizado em: {new Date(store.updated_at).toLocaleDateString()}
                        </p>
                    </div>
                  </div>
                </motion.div>
              ))}

              {stores.length === 0 && (
                <div className="text-center py-12 bg-white rounded-2xl border border-dashed border-zinc-200">
                  <Store className="w-12 h-12 text-zinc-300 mx-auto mb-3" />
                  <h3 className="text-lg font-medium text-zinc-900">Nenhuma loja encontrada</h3>
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
