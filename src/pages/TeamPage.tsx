import React, { useState, useEffect, useCallback } from 'react';
import { Layout } from '../components/Layout';
import { Search, Loader2, RefreshCw, ChevronLeft, ChevronRight, User, Mail, Shield, Coins, Briefcase, Plus, Edit2, Trash2, X, Save, Camera } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../context/AuthContext';
import { User as UserType, Store } from '../types';
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

export const TeamPage: React.FC = () => {
  const { token, user: currentUser } = useAuth();
  const [users, setUsers] = useState<UserType[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
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
  const [editingUser, setEditingUser] = useState<UserType | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    user_type_id: 2,
    store_id: '' as number | '',
    photo: null as File | null
  });

  const isAdmin = currentUser?.user_type_id === 1;

  const fetchUsers = useCallback(async (page = 1, search = '') => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const data = await api.getUsers(token, page, search);
      setUsers(data.data);
      setCurrentPage(data.current_page);
      setTotalPages(data.last_page);
      setTotalItems(data.total);
      setFromItem(data.from);
      setToItem(data.to);
    } catch (err: any) {
      console.error('Error fetching users:', err);
      setError(err.message || 'Não foi possível carregar a equipe.');
    } finally {
      setLoading(false);
    }
  }, [token]);

  const fetchStores = useCallback(async () => {
    if (!token) return;
    try {
      // Fetch all stores (or enough to populate dropdown)
      const data = await api.getStores(token, 1, ''); 
      // Ideally fetch all, but pagination might limit. For now, fetching first page.
      // If needed, we can implement a "load more" or fetch all logic.
      setStores(data.data);
    } catch (error) {
      console.error('Error fetching stores', error);
    }
  }, [token]);

  useEffect(() => {
    fetchUsers(currentPage, debouncedSearchTerm);
  }, [fetchUsers, currentPage, debouncedSearchTerm]);

  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearchTerm]);

  useEffect(() => {
    if (isAdmin) {
      fetchStores();
    }
  }, [isAdmin, fetchStores]);

  const handleOpenModal = (user?: UserType) => {
    if (user) {
      setEditingUser(user);
      setFormData({
        name: user.name,
        email: user.email,
        password: '', // Password not populated on edit
        user_type_id: user.user_type_id,
        store_id: user.store_id || '',
        photo: null
      });
    } else {
      setEditingUser(null);
      setFormData({
        name: '',
        email: '',
        password: '',
        user_type_id: 2,
        store_id: '',
        photo: null
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingUser(null);
    setFormData({
      name: '',
      email: '',
      password: '',
      user_type_id: 2,
      store_id: '',
      photo: null
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setSaving(true);
    try {
      const data = new FormData();
      data.append('name', formData.name);
      data.append('email', formData.email);
      if (formData.password) {
        data.append('password', formData.password);
      }
      data.append('user_type_id', String(formData.user_type_id));
      if (formData.store_id) {
        data.append('store_id', String(formData.store_id));
      }
      if (formData.photo) {
        data.append('photo', formData.photo);
      }

      if (editingUser) {
        await api.updateUser(token, editingUser.id, data);
        alert('Usuário atualizado com sucesso!');
      } else {
        await api.createUser(token, data);
        alert('Usuário criado com sucesso!');
      }

      await fetchUsers(currentPage, searchTerm);
      handleCloseModal();
    } catch (error: any) {
      console.error('Error saving user:', error);
      alert(error.message || 'Erro ao salvar usuário.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (user: UserType) => {
    if (!token || !window.confirm(`Tem certeza que deseja excluir o usuário ${user.name}?`)) return;
    setDeletingId(user.id);
    try {
      await api.deleteUser(token, user.id);
      await fetchUsers(currentPage, searchTerm);
    } catch (error: any) {
      console.error('Error deleting user:', error);
      alert(error.message || 'Erro ao excluir usuário.');
    } finally {
      setDeletingId(null);
    }
  };

  const getUserTypeLabel = (typeId: number) => {
    return typeId === 1 ? 'Administrador' : 'Usuário';
  };

  const getUserTypeColor = (typeId: number) => {
    return typeId === 1 
      ? 'bg-emerald-100 text-emerald-800 border-emerald-200' 
      : 'bg-teal-50 text-teal-700 border-teal-200';
  };

  return (
    <Layout>
      <div className="p-4 md:p-8 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-zinc-900">Equipe</h1>
            <p className="text-zinc-500">Gerencie os membros da sua equipe.</p>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={() => fetchUsers(currentPage, searchTerm)}
              className="bg-white border border-zinc-200 p-2 rounded-xl text-zinc-600 hover:bg-zinc-50 transition-all"
              title="Atualizar"
            >
              <RefreshCw size={20} className={loading ? "animate-spin" : ""} />
            </button>
            {isAdmin && (
              <button 
                onClick={() => handleOpenModal()}
                className="bg-emerald-600 px-4 py-2 rounded-xl text-sm font-medium text-white hover:bg-emerald-700 shadow-sm transition-all flex items-center gap-2"
              >
                <Plus size={18} />
                Novo Usuário
              </button>
            )}
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

        {/* Users List */}
        {loading && users.length === 0 ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl text-center">
            {error}
            <button onClick={() => fetchUsers(currentPage, searchTerm)} className="block mx-auto mt-2 text-sm font-semibold hover:underline">
              Tentar novamente
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {users.map((user) => (
                <motion.div 
                  key={user.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white p-6 rounded-2xl shadow-sm border border-zinc-100 hover:shadow-md transition-shadow flex flex-col"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-zinc-100 rounded-full flex items-center justify-center text-zinc-500 overflow-hidden border border-zinc-200">
                        {user.profile_image_url ? (
                          <img src={user.profile_image_url} alt={user.name} className="w-full h-full object-cover" />
                        ) : (
                          <User size={24} />
                        )}
                      </div>
                      <div>
                        <h3 className="font-bold text-zinc-900 line-clamp-1" title={user.name}>{user.name}</h3>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${getUserTypeColor(user.user_type_id)}`}>
                          {getUserTypeLabel(user.user_type_id)}
                        </span>
                      </div>
                    </div>
                    {isAdmin && (
                      <div className="flex gap-1">
                        <button 
                          onClick={() => handleOpenModal(user)}
                          className="p-1.5 text-zinc-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                          title="Editar"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button 
                          onClick={() => handleDelete(user)}
                          className="p-1.5 text-zinc-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Excluir"
                        >
                          {deletingId === user.id ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="space-y-3 flex-1">
                    <div className="flex items-center gap-2 text-sm text-zinc-600">
                      <Mail size={16} className="text-zinc-400 flex-shrink-0" />
                      <span className="truncate" title={user.email}>{user.email}</span>
                    </div>
                    
                    {user.role && (
                      <div className="flex items-center gap-2 text-sm text-zinc-600">
                        <Briefcase size={16} className="text-zinc-400 flex-shrink-0" />
                        <span className="truncate">{user.role}</span>
                      </div>
                    )}

                    <div className="flex items-center gap-2 text-sm text-zinc-600">
                      <Coins size={16} className="text-amber-500 flex-shrink-0" />
                      <span className="font-medium text-zinc-900">{user.coin_balance || 0} moedas</span>
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t border-zinc-50 flex justify-between items-center text-xs text-zinc-400">
                    <span>ID: {user.id}</span>
                    {user.created_at && (
                      <span>Desde {new Date(user.created_at).toLocaleDateString()}</span>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>

            {users.length === 0 && (
              <div className="text-center py-12 bg-white rounded-2xl border border-dashed border-zinc-200">
                <User className="w-12 h-12 text-zinc-300 mx-auto mb-3" />
                <h3 className="text-lg font-medium text-zinc-900">Nenhum membro encontrado</h3>
                <p className="text-zinc-500">Tente ajustar seus filtros de busca.</p>
              </div>
            )}

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

        {/* Create/Edit User Modal */}
        <AnimatePresence>
          {isModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]"
              >
                <div className="p-6 border-b border-zinc-100 flex justify-between items-center bg-zinc-50/50">
                  <h2 className="text-xl font-bold text-zinc-900">
                    {editingUser ? 'Editar Usuário' : 'Novo Usuário'}
                  </h2>
                  <button onClick={handleCloseModal} className="text-zinc-400 hover:text-zinc-600 transition-colors">
                    <X size={24} />
                  </button>
                </div>
                
                <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
                  <div className="flex justify-center mb-6">
                    <div className="relative group cursor-pointer">
                      <div className="w-24 h-24 rounded-full bg-zinc-100 flex items-center justify-center overflow-hidden border-2 border-zinc-200">
                        {formData.photo ? (
                          <img 
                            src={URL.createObjectURL(formData.photo)} 
                            alt="Preview" 
                            className="w-full h-full object-cover"
                          />
                        ) : editingUser?.profile_image_url ? (
                          <img 
                            src={editingUser.profile_image_url} 
                            alt={editingUser.name} 
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <User size={40} className="text-zinc-400" />
                        )}
                      </div>
                      <label htmlFor="photo-upload" className="absolute bottom-0 right-0 bg-emerald-600 text-white p-1.5 rounded-full shadow-md cursor-pointer hover:bg-emerald-700 transition-colors">
                        <Camera size={16} />
                        <input 
                          id="photo-upload" 
                          type="file" 
                          accept="image/*" 
                          className="hidden"
                          onChange={(e) => {
                            if (e.target.files && e.target.files[0]) {
                              setFormData({ ...formData, photo: e.target.files[0] });
                            }
                          }}
                        />
                      </label>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-zinc-700 mb-1">Nome *</label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full p-2.5 border border-zinc-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
                      placeholder="Nome completo"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-zinc-700 mb-1">Email *</label>
                    <input
                      type="email"
                      required
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full p-2.5 border border-zinc-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
                      placeholder="email@exemplo.com"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-zinc-700 mb-1">
                      {editingUser ? 'Senha (deixe em branco para manter)' : 'Senha *'}
                    </label>
                    <input
                      type="password"
                      required={!editingUser}
                      minLength={6}
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      className="w-full p-2.5 border border-zinc-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
                      placeholder="******"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-zinc-700 mb-1">Tipo de Usuário</label>
                      <select
                        value={formData.user_type_id}
                        onChange={(e) => setFormData({ ...formData, user_type_id: Number(e.target.value) })}
                        className="w-full p-2.5 border border-zinc-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all bg-white"
                      >
                        <option value={2}>Usuário</option>
                        <option value={1}>Administrador</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-zinc-700 mb-1">Loja</label>
                      <select
                        value={formData.store_id}
                        onChange={(e) => setFormData({ ...formData, store_id: e.target.value ? Number(e.target.value) : '' })}
                        className="w-full p-2.5 border border-zinc-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all bg-white"
                      >
                        <option value="">Selecione uma loja</option>
                        {stores.map(store => (
                          <option key={store.id} value={store.id}>{store.name}</option>
                        ))}
                      </select>
                    </div>
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
