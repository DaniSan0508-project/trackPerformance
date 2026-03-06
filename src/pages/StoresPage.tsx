import React, { useState, useEffect, useCallback } from 'react';
import { Layout } from '../components/Layout';
import { Search, Store, Plus, Loader2, RefreshCw, ChevronLeft, ChevronRight, Phone, Mail, Edit2, X, Save, CheckCircle, Trash2, Settings, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../context/AuthContext';
import { Store as StoreType, PaginatedResponse, StoreGroup } from '../types';
import { api } from '../services/api';
import { useToast } from '../context/ToastContext';
import { ConfirmModal } from '../components/ConfirmModal';
import { storeSchema } from '../validators/schemas';
import { ZodError } from 'zod';

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

const GroupListItem: React.FC<{ 
  group: StoreGroup; 
  onUpdate: (id: number, name: string) => Promise<void>;
  onDelete: (id: number) => void;
}> = ({ group, onUpdate, onDelete }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(group.name);
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    if (name.trim() === group.name) {
      setIsEditing(false);
      return;
    }
    setLoading(true);
    await onUpdate(group.id, name);
    setLoading(false);
    setIsEditing(false);
  };

  const handleDelete = () => {
    onDelete(group.id);
  };

  return (
    <div className="flex items-center justify-between p-3 bg-zinc-50 dark:bg-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-700 group hover:border-emerald-200 dark:hover:border-emerald-800 transition-colors">
      {isEditing ? (
        <div className="flex items-center gap-2 flex-1">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="flex-1 p-1.5 text-sm border border-zinc-300 dark:border-zinc-600 rounded-md focus:ring-2 focus:ring-emerald-500 outline-none bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white"
            autoFocus
          />
          <button onClick={handleSave} disabled={loading} className="p-1.5 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 rounded-md hover:bg-emerald-200 dark:hover:bg-emerald-900/50">
            {loading ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
          </button>
          <button onClick={() => { setName(group.name); setIsEditing(false); }} disabled={loading} className="p-1.5 bg-zinc-200 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300 rounded-md hover:bg-zinc-300 dark:hover:bg-zinc-600">
            <X size={14} />
          </button>
        </div>
      ) : (
        <>
          <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">{group.name}</span>
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button onClick={() => setIsEditing(true)} className="p-1.5 text-zinc-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-md transition-colors">
              <Edit2 size={14} />
            </button>
            <button onClick={handleDelete} className="p-1.5 text-zinc-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors">
              <Trash2 size={14} />
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export const StoresPage: React.FC = () => {
  const { token } = useAuth();
  const { addToast } = useToast();
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
  const [isManagingGroups, setIsManagingGroups] = useState(false);
  const [editingStore, setEditingStore] = useState<StoreType | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [newGroupName, setNewGroupName] = useState('');
  const [creatingGroup, setCreatingGroup] = useState(false);
  
  // Confirmation Modal State
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => Promise<void>;
    isLoading: boolean;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: async () => {},
    isLoading: false,
  });

  const [formData, setFormData] = useState({
    name: '',
    cnpj: '',
    email: '',
    phone: '',
    active: true,
    store_group_id: null as string | number | null
  });

  const fetchStores = useCallback(async (page = 1, search = '') => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const data = await api.getStores(token, page, search);
      setStores(data.data);
      setCurrentPage(data.meta.current_page);
      setTotalPages(data.meta.last_page);
      setTotalItems(data.meta.total);
      setFromItem(data.meta.from);
      setToItem(data.meta.to);
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
    setIsManagingGroups(false);
    if (store) {
      setEditingStore(store);
      setFormData({
        name: store.name,
        cnpj: store.cnpj || '',
        email: store.email || '',
        phone: store.phone || '',
        active: store.active,
        store_group_id: store.store_group_id || null
      });
    } else {
      setEditingStore(null);
      setFormData({
        name: '',
        cnpj: '',
        email: '',
        phone: '',
        active: true,
        store_group_id: null
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingStore(null);
    setIsManagingGroups(false);
  };

  // Máscara de CNPJ - limita a 14 dígitos
  const formatCNPJ = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 14);
    return digits.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{0,2})/, (_, p1, p2, p3, p4, p5) => {
      let result = p1;
      if (p2) result += '.' + p2;
      if (p3) result += '.' + p3;
      if (p4) result += '/' + p4;
      if (p5) result += '-' + p5;
      return result;
    });
  };

  // Máscara de Telefone - limita a 11 dígitos
  const formatPhone = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 11);
    return digits.replace(/^(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
  };

  const [formErrors, setFormErrors] = useState<{ [key: string]: string }>({});

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setFormErrors({});

    console.log('FormData:', formData);

    // Validação com Zod
    const result = storeSchema.safeParse(formData);
    if (!result.success) {
      const errors = result.error.flatten().fieldErrors;
      console.log('Validation errors:', errors);
      const formattedErrors: { [key: string]: string } = {};
      Object.entries(errors).forEach(([key, messages]) => {
        if (messages?.length) {
          formattedErrors[key] = messages[0];
        }
      });
      setFormErrors(formattedErrors);
      addToast('error', 'Verifique os campos obrigatórios.');
      return;
    }

    console.log('Validation passed!');
    setSaving(true);
    try {
      // Garante que store_group_id seja null ou um número
      const groupId = formData.store_group_id === '' ? null : 
                      typeof formData.store_group_id === 'string' ? Number(formData.store_group_id) : 
                      formData.store_group_id;

      const dataToSave: any = {
        name: formData.name,
        cnpj: formData.cnpj,
        email: formData.email,
        phone: formData.phone,
        active: formData.active,
        store_group_id: groupId
      };

      console.log('Sending data:', dataToSave);

      if (editingStore) {
        await api.updateStore(token, editingStore.id, dataToSave);
      } else {
        await api.createStore(token, dataToSave);
      }

      await fetchStores(currentPage, searchTerm);
      handleCloseModal();
      addToast('success', editingStore ? 'Loja atualizada com sucesso!' : 'Loja criada com sucesso!');
    } catch (error) {
      console.error('Error saving store:', error);
      addToast('error', 'Erro ao salvar loja. Verifique os dados e tente novamente.');
    } finally {
      setSaving(false);
    }
  };

  const executeDeleteStore = async (id: number) => {
    if (!token) return;
    setDeletingId(id);
    try {
      await api.deleteStore(token, id);
      await fetchStores(currentPage, searchTerm);
      addToast('success', 'Loja excluída com sucesso!');
    } catch (error: any) {
      console.error('Error deleting store:', error);
      if (error.message === 'STORE_HAS_LINKED_USERS') {
        addToast('error', 'Não é possível deletar uma loja que tenha usuários vinculados.');
      } else {
        addToast('error', 'Erro ao excluir loja.');
      }
    } finally {
      setDeletingId(null);
    }
  };

  const handleDelete = (id: number) => {
    setConfirmModal({
      isOpen: true,
      title: 'Excluir Loja',
      message: 'Tem certeza que deseja excluir esta loja? Esta ação não pode ser desfeita.',
      onConfirm: async () => await executeDeleteStore(id),
      isLoading: false,
    });
  };

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !newGroupName.trim()) return;
    setCreatingGroup(true);
    try {
      await api.createStoreGroup(token, { name: newGroupName, active: true });
      await fetchGroups();
      setNewGroupName('');
      addToast('success', 'Grupo criado com sucesso!');
    } catch (error) {
      console.error('Error creating group:', error);
      addToast('error', 'Erro ao criar grupo.');
    } finally {
      setCreatingGroup(false);
    }
  };

  const handleUpdateGroup = async (id: number, name: string) => {
    if (!token) return;
    try {
      await api.updateStoreGroup(token, id, { name });
      await fetchGroups();
      addToast('success', 'Grupo atualizado com sucesso!');
    } catch (error) {
      console.error('Error updating group:', error);
      addToast('error', 'Erro ao atualizar grupo.');
    }
  };

  const executeDeleteGroup = async (id: number) => {
    if (!token) return;
    try {
      await api.deleteStoreGroup(token, id);
      await fetchGroups();
      addToast('success', 'Grupo excluído com sucesso!');
    } catch (error) {
      console.error('Error deleting group:', error);
      addToast('error', 'Erro ao excluir grupo. Verifique se não há lojas vinculadas.');
    }
  };

  const handleDeleteGroup = (id: number) => {
    setConfirmModal({
      isOpen: true,
      title: 'Excluir Grupo',
      message: 'Tem certeza que deseja excluir este grupo? Lojas vinculadas podem ficar sem grupo.',
      onConfirm: async () => await executeDeleteGroup(id),
      isLoading: false,
    });
  };

  const handleConfirmModalAction = async () => {
    setConfirmModal(prev => ({ ...prev, isLoading: true }));
    try {
      await confirmModal.onConfirm();
      setConfirmModal(prev => ({ ...prev, isOpen: false }));
    } catch (error) {
      console.error('Error in confirm action:', error);
      setConfirmModal(prev => ({ ...prev, isLoading: false }));
    }
  };

  return (
    <Layout>
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
        onConfirm={handleConfirmModalAction}
        title={confirmModal.title}
        message={confirmModal.message}
        isLoading={confirmModal.isLoading}
      />
      <div className="p-4 md:p-8 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">Lojas</h1>
            <p className="text-zinc-500 dark:text-zinc-400">Gerencie as lojas da sua rede.</p>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={() => fetchStores(currentPage, searchTerm)}
              className="bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 p-2 rounded-xl text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-all"
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
        <div className="bg-white dark:bg-zinc-900 p-4 rounded-2xl shadow-sm border border-zinc-100 dark:border-zinc-800 flex flex-col md:flex-row gap-4 items-center transition-colors duration-200">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-zinc-400" size={20} />
            <input
              type="text"
              placeholder="Buscar por nome ou CNPJ..."
              className="w-full pl-10 pr-4 py-2 border border-zinc-200 dark:border-zinc-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-500"
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
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 p-4 rounded-xl text-center">
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
                  className="bg-white dark:bg-zinc-900 p-6 rounded-2xl shadow-sm border border-zinc-100 dark:border-zinc-800 hover:shadow-md transition-all duration-200"
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-start gap-4 flex-1">
                      <div className="bg-emerald-100 dark:bg-emerald-900/30 p-3 rounded-xl">
                        <Store className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                            <h3 className="font-bold text-lg text-zinc-900 dark:text-white">{store.name}</h3>
                            {store.active ? (
                                <span className="px-2 py-0.5 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 rounded-full text-xs font-bold">ATIVO</span>
                            ) : (
                                <span className="px-2 py-0.5 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-full text-xs font-bold">INATIVO</span>
                            )}
                        </div>
                        <p className="text-sm text-zinc-500 dark:text-zinc-400 font-mono mt-1">CNPJ: {store.cnpj}</p>
                        
                        <div className="flex flex-wrap gap-4 mt-3 text-sm text-zinc-600 dark:text-zinc-400">
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
                            <span className="inline-block bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 px-3 py-1 rounded-full text-xs font-medium">
                                {store.group.name}
                            </span>
                        )}
                        <p className="text-xs text-zinc-400 dark:text-zinc-500">
                            Atualizado em: {new Date(store.updated_at).toLocaleDateString()}
                        </p>
                        <div className="flex items-center gap-2 mt-2 md:mt-0">
                          <button 
                            onClick={() => handleOpenModal(store)}
                            className="flex items-center gap-1 text-sm text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 font-medium p-2 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-lg transition-colors"
                            title="Editar"
                          >
                            <Edit2 size={18} />
                          </button>
                          <button 
                            onClick={() => handleDelete(store.id)}
                            disabled={deletingId === store.id}
                            className="flex items-center gap-1 text-sm text-red-500 hover:text-red-700 dark:hover:text-red-400 font-medium p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors disabled:opacity-50"
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
                <div className="text-center py-12 bg-white dark:bg-zinc-900 rounded-2xl border border-dashed border-zinc-200 dark:border-zinc-800 transition-colors duration-200">
                  <Store className="w-12 h-12 text-zinc-300 dark:text-zinc-600 mx-auto mb-3" />
                  <h3 className="text-lg font-medium text-zinc-900 dark:text-white">Nenhuma loja encontrada</h3>
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
                    className="p-2 border border-zinc-200 dark:border-zinc-700 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed text-zinc-600 dark:text-zinc-400"
                  >
                    <ChevronLeft size={20} />
                  </button>
                  <span className="text-sm font-medium px-2 text-zinc-700 dark:text-zinc-300">
                    Página {currentPage} de {totalPages}
                  </span>
                  <button
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    className="p-2 border border-zinc-200 dark:border-zinc-700 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed text-zinc-600 dark:text-zinc-400"
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
                className="bg-white dark:bg-zinc-900 rounded-2xl shadow-xl w-full max-w-lg overflow-hidden border border-zinc-200 dark:border-zinc-800"
              >
                <div className="p-6 border-b border-zinc-100 dark:border-zinc-800 flex justify-between items-center bg-zinc-50/50 dark:bg-zinc-800/50">
                  <div className="flex items-center gap-2">
                    {isManagingGroups && (
                      <button onClick={() => setIsManagingGroups(false)} className="mr-2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300">
                        <ChevronLeft size={20} />
                      </button>
                    )}
                    <h2 className="text-xl font-bold text-zinc-900 dark:text-white">
                      {isManagingGroups ? 'Gerenciar Grupos' : (editingStore ? 'Editar Loja' : 'Nova Loja')}
                    </h2>
                  </div>
                  <button onClick={handleCloseModal} className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors">
                    <X size={24} />
                  </button>
                </div>
                
                {isManagingGroups ? (
                  <div className="p-6 space-y-4">
                    <form onSubmit={handleCreateGroup} className="flex gap-2 mb-4">
                      <input
                        type="text"
                        value={newGroupName}
                        onChange={(e) => setNewGroupName(e.target.value)}
                        placeholder="Nome do novo grupo"
                        className="flex-1 p-2.5 border border-zinc-300 dark:border-zinc-600 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white placeholder-zinc-400"
                      />
                      <button 
                        type="submit" 
                        disabled={creatingGroup || !newGroupName.trim()}
                        className="px-4 py-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 disabled:opacity-50 transition-colors"
                      >
                        {creatingGroup ? <Loader2 size={20} className="animate-spin" /> : <Plus size={20} />}
                      </button>
                    </form>
                    
                    <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                      {groups.length === 0 ? (
                        <p className="text-center text-zinc-500 dark:text-zinc-400 py-4">Nenhum grupo cadastrado.</p>
                      ) : (
                        groups.map(group => (
                          <GroupListItem 
                            key={group.id} 
                            group={group} 
                            onUpdate={handleUpdateGroup}
                            onDelete={handleDeleteGroup}
                          />
                        ))
                      )}
                    </div>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Nome da Loja *</label>
                      <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className={`w-full p-2.5 border rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white placeholder-zinc-400 ${
                          formErrors.name ? 'border-red-500 focus:ring-red-500' : 'border-zinc-300 dark:border-zinc-600'
                        }`}
                        placeholder="Ex: Loja Matriz"
                      />
                      {formErrors.name && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{formErrors.name}</p>}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">CNPJ</label>
                        <input
                          type="text"
                          value={formData.cnpj}
                          onChange={(e) => setFormData({ ...formData, cnpj: formatCNPJ(e.target.value) })}
                          className={`w-full p-2.5 border rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white placeholder-zinc-400 ${
                            formErrors.cnpj ? 'border-red-500 focus:ring-red-500' : 'border-zinc-300 dark:border-zinc-600'
                          }`}
                          placeholder="00.000.000/0000-00"
                          maxLength={18}
                        />
                        {formErrors.cnpj && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{formErrors.cnpj}</p>}
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Telefone</label>
                        <input
                          type="text"
                          value={formData.phone}
                          onChange={(e) => setFormData({ ...formData, phone: formatPhone(e.target.value) })}
                          className={`w-full p-2.5 border rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white placeholder-zinc-400 ${
                            formErrors.phone ? 'border-red-500 focus:ring-red-500' : 'border-zinc-300 dark:border-zinc-600'
                          }`}
                          placeholder="(00) 00000-0000"
                          maxLength={15}
                        />
                        {formErrors.phone && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{formErrors.phone}</p>}
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Email</label>
                      <input
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className={`w-full p-2.5 border rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white placeholder-zinc-400 ${
                          formErrors.email ? 'border-red-500 focus:ring-red-500' : 'border-zinc-300 dark:border-zinc-600'
                        }`}
                        placeholder="loja@empresa.com"
                      />
                      {formErrors.email && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{formErrors.email}</p>}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Grupo de Lojas</label>
                      <div className="flex gap-2">
                        <select
                          value={formData.store_group_id || ''}
                          onChange={(e) => setFormData({ ...formData, store_group_id: e.target.value ? Number(e.target.value) : null })}
                          className="flex-1 p-2.5 border border-zinc-300 dark:border-zinc-600 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white"
                        >
                          <option value="">Selecione um grupo (opcional)</option>
                          {groups.map(group => (
                            <option key={group.id} value={group.id}>{group.name}</option>
                          ))}
                        </select>
                        <button
                          type="button"
                          onClick={() => setIsManagingGroups(true)}
                          className="p-2.5 border border-zinc-300 dark:border-zinc-600 rounded-xl hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-400 transition-colors"
                          title="Gerenciar Grupos"
                        >
                          <Settings size={20} />
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-2">
                      <input
                        type="checkbox"
                        id="active"
                        checked={formData.active}
                        onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                        className="w-4 h-4 text-emerald-600 border-zinc-300 dark:border-zinc-600 rounded focus:ring-emerald-500 bg-white dark:bg-zinc-800"
                      />
                      <label htmlFor="active" className="text-sm font-medium text-zinc-700 dark:text-zinc-300 cursor-pointer">
                        Loja Ativa
                      </label>
                    </div>

                    <div className="pt-4 flex gap-3">
                      <button
                        type="button"
                        onClick={handleCloseModal}
                        className="flex-1 px-4 py-2.5 border border-zinc-300 dark:border-zinc-600 text-zinc-700 dark:text-zinc-300 font-medium rounded-xl hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
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
                )}
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </Layout>
  );
};
