import React, { useState, useEffect, useCallback } from 'react';
import { Layout } from '../components/Layout';
import { Search, Store, Plus, Loader2, RefreshCw, ChevronLeft, ChevronRight, Phone, Mail, Edit2, X, Save, CheckCircle, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../context/AuthContext';
import { Store as StoreType, PaginatedResponse, StoreGroup } from '../types';
import { api } from '../services/api';

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
  const [groups, setGroups] = useState<StoreGroup[]>([]);
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

  // Modal & Form state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStore, setEditingStore] = useState<StoreType | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    cnpj: '',
    email: '',
    phone: '',
    active: true,
    store_group_id: '' as number | ''
  });

  const fetchStores = useCallback(async (page = 1, search = '') => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const data = await api.getStores(token, page, search);
      setStores(data.data);
      setCurrentPage(data.current_page);
      setTotalPages(data.last_page);
      setTotalItems(data.total);
      setFromItem(data.from);
      setToItem(data.to);
    } catch (err: any) {
      console.error('Error fetching stores:', err);
      setError(err.message || 'Não foi possível carregar as lojas.');
    } finally {
      setLoading(false);
    }
  }, [token]);

  const fetchGroups = useCallback(async () => {
    if (!token) return;
    try {
      const data = await api.getStoreGroups(token);
      setGroups(data.data);
    } catch (error) {
      console.error('Error fetching groups', error);
    }
  }, [token]);

  useEffect(() => {
    fetchStores(currentPage, debouncedSearchTerm);
  }, [fetchStores, currentPage, debouncedSearchTerm]);

  useEffect(() => {
    fetchGroups();
  }, [fetchGroups]);

  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearchTerm]);

  const handleOpenModal = (store?: StoreType) => {
    if (store) {
      setEditingStore(store);
      setFormData({
        name: store.name,
        cnpj: store.cnpj || '',
        email: store.email || '',
        phone: store.phone || '',
        active: store.active,
        store_group_id: store.store_group_id || ''
      });
    } else {
      setEditingStore(null);
      setFormData({
        name: '',
        cnpj: '',
        email: '',
        phone: '',
        active: true,
        store_group_id: ''
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingStore(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setSaving(true);
    try {
      const dataToSave: any = { ...formData };
      if (dataToSave.store_group_id === '') {
        dataToSave.store_group_id = null;
      }

      if (editingStore) {
        await api.updateStore(token, editingStore.id, dataToSave);
      } else {
        await api.createStore(token, dataToSave);
      }

      await fetchStores(currentPage, searchTerm);
      handleCloseModal();
    } catch (error) {
      console.error('Error saving store:', error);
      alert('Erro ao salvar loja. Verifique os dados e tente novamente.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!token || !window.confirm('Tem certeza que deseja excluir esta loja?')) return;
    setDeletingId(id);
    try {
      await api.deleteStore(token, id);
      await fetchStores(currentPage, searchTerm);
    } catch (error) {
      console.error('Error deleting store:', error);
      alert('Erro ao excluir loja.');
    } finally {
      setDeletingId(null);
    }
  };

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
            <button 
              onClick={() => handleOpenModal()}
              className="bg-emerald-600 px-4 py-2 rounded-xl text-sm font-medium text-white hover:bg-emerald-700 shadow-sm transition-all flex items-center gap-2"
            >
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

                    <div className="flex flex-col md:items-end gap-2">
                        {store.group && (
                            <span className="inline-block bg-zinc-100 text-zinc-600 px-3 py-1 rounded-full text-xs font-medium">
                                {store.group.name}
                            </span>
                        )}
                        <p className="text-xs text-zinc-400">
                            Atualizado em: {new Date(store.updated_at).toLocaleDateString()}
                        </p>
                        <div className="flex items-center gap-2 mt-2 md:mt-0">
                          <button 
                            onClick={() => handleOpenModal(store)}
                            className="flex items-center gap-1 text-sm text-emerald-600 hover:text-emerald-700 font-medium p-2 hover:bg-emerald-50 rounded-lg transition-colors"
                            title="Editar"
                          >
                            <Edit2 size={18} />
                          </button>
                          <button 
                            onClick={() => handleDelete(store.id)}
                            disabled={deletingId === store.id}
                            className="flex items-center gap-1 text-sm text-red-500 hover:text-red-700 font-medium p-2 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                            title="Excluir"
                          >
                            {deletingId === store.id ? <Loader2 size={18} className="animate-spin" /> : <Trash2 size={18} />}
                          </button>
                        </div>
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

        {/* Create/Edit Modal */}
        <AnimatePresence>
          {isModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden"
              >
                <div className="p-6 border-b border-zinc-100 flex justify-between items-center bg-zinc-50/50">
                  <h2 className="text-xl font-bold text-zinc-900">
                    {editingStore ? 'Editar Loja' : 'Nova Loja'}
                  </h2>
                  <button onClick={handleCloseModal} className="text-zinc-400 hover:text-zinc-600 transition-colors">
                    <X size={24} />
                  </button>
                </div>
                
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 mb-1">Nome da Loja *</label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full p-2.5 border border-zinc-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
                      placeholder="Ex: Loja Matriz"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-zinc-700 mb-1">CNPJ</label>
                      <input
                        type="text"
                        value={formData.cnpj}
                        onChange={(e) => setFormData({ ...formData, cnpj: e.target.value })}
                        className="w-full p-2.5 border border-zinc-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
                        placeholder="00.000.000/0000-00"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-zinc-700 mb-1">Telefone</label>
                      <input
                        type="text"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        className="w-full p-2.5 border border-zinc-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
                        placeholder="(00) 00000-0000"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-zinc-700 mb-1">Email</label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full p-2.5 border border-zinc-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
                      placeholder="loja@empresa.com"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-zinc-700 mb-1">Grupo de Lojas</label>
                    <select
                      value={formData.store_group_id}
                      onChange={(e) => setFormData({ ...formData, store_group_id: e.target.value ? Number(e.target.value) : '' })}
                      className="w-full p-2.5 border border-zinc-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all bg-white"
                    >
                      <option value="">Selecione um grupo (opcional)</option>
                      {groups.map(group => (
                        <option key={group.id} value={group.id}>{group.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="flex items-center gap-2 pt-2">
                    <input
                      type="checkbox"
                      id="active"
                      checked={formData.active}
                      onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                      className="w-4 h-4 text-emerald-600 border-zinc-300 rounded focus:ring-emerald-500"
                    />
                    <label htmlFor="active" className="text-sm font-medium text-zinc-700 cursor-pointer">
                      Loja Ativa
                    </label>
                  </div>

                  <div className="pt-4 flex gap-3">
                    <button
                      type="button"
                      onClick={handleCloseModal}
                      className="flex-1 px-4 py-2.5 border border-zinc-300 text-zinc-700 font-medium rounded-xl hover:bg-zinc-50 transition-colors"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={saving}
                      className="flex-1 px-4 py-2.5 bg-emerald-600 text-white font-medium rounded-xl hover:bg-emerald-700 transition-colors disabled:opacity-70 flex items-center justify-center gap-2"
                    >
                      {saving ? <Loader2 size={20} className="animate-spin" /> : <Save size={20} />}
                      {saving ? 'Salvando...' : 'Salvar'}
                    </button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </Layout>
  );
};
