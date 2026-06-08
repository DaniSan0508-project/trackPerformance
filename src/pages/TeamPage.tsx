import React, { useState, useEffect, useCallback } from 'react';
import { Search, Loader2, RefreshCw, ChevronLeft, ChevronRight, User, Mail, Shield, Coins, Briefcase, Plus, Edit2, Trash2, X, Save, Camera, LogOut, Store as StoreIcon, FileText, Eye, EyeOff, Settings, Crown, Bell, BellOff, Heart } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../context/AuthContext';
import { User as UserType, Role, Store } from '../types';
import { usersService, storesService, rolesService } from '../services';
import { useToast } from '../context/ToastContext';
import { ConfirmModal } from '../components/ConfirmModal';
import { userSchema, userUpdateSchema, roleSchema } from '../validators/schemas';
import { getFullImageUrl } from '../utils';
import { CoinStatementModal, UserMoodModal } from '../components/Team';

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
  const { addToast } = useToast();
  const [users, setUsers] = useState<UserType[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
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
  const [isRolesModalOpen, setIsRolesModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserType | null>(null);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [saving, setSaving] = useState(false);
  const [savingRole, setSavingRole] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [formErrors, setFormErrors] = useState<{ [key: string]: string }>({});
  const [roleFormErrors, setRoleFormErrors] = useState<{ [key: string]: string }>({});
  const [showPassword, setShowPassword] = useState(false);

  // Roles list state
  const [rolesPage, setRolesPage] = useState(1);
  const [rolesTotalPages, setRolesTotalPages] = useState(1);
  const [loadingRoles, setLoadingRoles] = useState(false);
  const [rolesSearch, setRolesSearch] = useState('');
  const debouncedRolesSearch = useDebounce(rolesSearch, 500);

  const [roleFormData, setRoleFormData] = useState({
    description: ''
  });
  
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

  const { coinName } = useAuth();

  // Modal de Extrato
  const [coinStatementModal, setCoinStatementModal] = useState<{
    isOpen: boolean;
    user: UserType | null;
  }>({
    isOpen: false,
    user: null,
  });

  const [moodModal, setMoodModal] = useState<{
    isOpen: boolean;
    user: UserType | null;
  }>({
    isOpen: false,
    user: null,
  });

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    user_type_id: 2,
    store_id: '' as number | '',
    role_id: '' as number | '',
    description: '',
    external_id: '',
    photo: null as File | null
  });

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, '');
    if (value.length > 11) value = value.slice(0, 11);
    
    let maskedValue = '';
    if (value.length > 0) {
      maskedValue = `(${value.slice(0, 2)}`;
      if (value.length > 2) {
        maskedValue += `) `;
        if (value.length <= 10) {
          // Formato Fixo: (XX) XXXX-XXXX
          maskedValue += value.slice(2, 6);
          if (value.length > 6) {
            maskedValue += `-${value.slice(6, 10)}`;
          }
        } else {
          // Formato Celular: (XX) XXXXX-XXXX
          maskedValue += value.slice(2, 7);
          if (value.length > 7) {
            maskedValue += `-${value.slice(7, 11)}`;
          }
        }
      }
    } else {
      maskedValue = '';
    }
    setFormData({ ...formData, phone: maskedValue });
  };

  const isAdmin = currentUser?.user_type_id === 1;
  const isSuperAdmin = !!currentUser?.is_super_admin;

  const fetchUsers = useCallback(async (page = 1, search = '') => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const data = await usersService.getUsers(token, page, search);
      setUsers(data.data);
      setCurrentPage(data.meta?.current_page || data.current_page || 1);
      setTotalPages(data.meta?.last_page || data.last_page || 1);
      setTotalItems(data.meta?.total || data.total || 0);
      setFromItem(data.meta?.from || data.from || 0);
      setToItem(data.meta?.to || data.to || 0);
    } catch (err: any) {
      console.error('Error fetching users:', err);
      setError(err.message || 'Não foi possível carregar o time.');
    } finally {
      setLoading(false);
    }
  }, [token]);

  const fetchStores = useCallback(async () => {
    if (!token) return;
    try {
      const data = await storesService.getStores(token, 1, ''); 
      const activeStores = data.data.filter((store: any) => store.active);
      setStores(activeStores);
    } catch (error) {
      console.error('Error fetching stores', error);
    }
  }, [token]);

  const fetchRoles = useCallback(async () => {
    if (!token) return;
    try {
      const data = await rolesService.getRoles(token, 1, ''); 
      setRoles(data.data);
    } catch (error) {
      console.error('Error fetching roles', error);
    }
  }, [token]);

  const fetchRolesPaginated = useCallback(async (page = 1, search = '') => {
    if (!token) return;
    setLoadingRoles(true);
    try {
      const data = await rolesService.getRoles(token, page, search);
      setRoles(data.data);
      setRolesPage(data.current_page || 1);
      setRolesTotalPages(data.last_page || 1);
    } catch (error) {
      console.error('Error fetching roles paginated', error);
      addToast('error', 'Erro ao carregar lista de cargos.');
    } finally {
      setLoadingRoles(false);
    }
  }, [token]);

  useEffect(() => {
    if (isRolesModalOpen) {
      fetchRolesPaginated(1, debouncedRolesSearch);
    }
  }, [debouncedRolesSearch, isRolesModalOpen, fetchRolesPaginated]);

  useEffect(() => {
    fetchUsers(currentPage, debouncedSearchTerm);
  }, [fetchUsers, currentPage, debouncedSearchTerm]);

  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearchTerm]);

  useEffect(() => {
    if (isAdmin) {
      fetchStores();
      fetchRoles();
    }
  }, [isAdmin, fetchStores, fetchRoles]);

  const handleOpenModal = (user?: UserType) => {
    if (user) {
      // Apenas super admin pode editar outros admins
      if (user.user_type_id === 1 && !isSuperAdmin && user.id !== currentUser?.id) {
        addToast('error', 'Apenas super administradores podem editar outros administradores.');
        return;
      }
      setEditingUser(user);
      setFormData({
        name: user.name,
        email: user.email,
        phone: user.phone || '',
        password: '', 
        user_type_id: user.user_type_id,
        store_id: user.store_id || '',
        role_id: user.role_id || '',
        description: user.description || '',
        external_id: (user as any).external_id || '',
        photo: null
      });
    } else {
      setEditingUser(null);
      setFormData({
        name: '',
        email: '',
        phone: '',
        password: '',
        user_type_id: 2,
        store_id: '',
        role_id: '',
        description: '',
        external_id: '',
        photo: null
      });
    }
    setIsModalOpen(true);
  };

  const handleViewCoinStatement = (user: UserType) => {
    // Super admin pode ver de todos.
    // Admin pode ver o seu próprio e de colaboradores (user_type_id !== 1).
    const canView = isSuperAdmin || currentUser?.id === user.id || (isAdmin && user.user_type_id !== 1);
    
    if (!canView) {
      addToast('error', 'Você não tem permissão para visualizar o extrato deste usuário.');
      return;
    }
    setCoinStatementModal({ isOpen: true, user });
  };

  const handleCloseCoinStatement = () => {
    setCoinStatementModal({ isOpen: false, user: null });
  };

  const handleViewMood = (user: UserType) => {
    setMoodModal({ isOpen: true, user });
  };

  const handleCloseMood = () => {
    setMoodModal({ isOpen: false, user: null });
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingUser(null);
    setShowPassword(false);
    setFormData({
      name: '',
      email: '',
      phone: '',
      password: '',
      user_type_id: 2,
      store_id: '',
      role_id: '',
      description: '',
      photo: null
    });
  };

  const handleOpenRolesModal = () => {
    setIsRolesModalOpen(true);
    setRoleFormData({ description: '' });
    setEditingRole(null);
    setRoleFormErrors({});
  };

  const handleCloseRolesModal = () => {
    setIsRolesModalOpen(false);
    setEditingRole(null);
    setRoleFormData({ description: '' });
    setRoleFormErrors({});
    fetchRoles(); 
  };

  const handleEditRole = (role: Role) => {
    setEditingRole(role);
    setRoleFormData({ description: role.description });
    setRoleFormErrors({});
  };

  const handleSubmitRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setRoleFormErrors({});

    const result = roleSchema.safeParse(roleFormData);
    if (!result.success) {
      const errors = result.error.flatten().fieldErrors;
      const formattedErrors: { [key: string]: string } = {};
      Object.entries(errors).forEach(([key, messages]) => {
        if (messages?.length) formattedErrors[key] = messages[0];
      });
      setRoleFormErrors(formattedErrors);
      return;
    }

    setSavingRole(true);
    try {
      if (editingRole) {
        await rolesService.updateRole(token, editingRole.id, roleFormData);
        addToast('success', 'Cargo atualizado com sucesso!');
      } else {
        await rolesService.createRole(token, roleFormData);
        addToast('success', 'Cargo criado com sucesso!');
      }
      setRoleFormData({ description: '' });
      setEditingRole(null);
      fetchRolesPaginated(rolesPage, rolesSearch);
    } catch (error: any) {
      addToast('error', error.message || 'Erro ao salvar cargo.');
    } finally {
      setSavingRole(false);
    }
  };

  const executeDeleteRole = async (id: number) => {
    if (!token) return;
    try {
      await rolesService.deleteRole(token, id);
      addToast('success', 'Cargo excluído com sucesso!');
      fetchRolesPaginated(rolesPage, rolesSearch);
    } catch (error: any) {
      addToast('error', error.message || 'Erro ao excluir cargo. Verifique se existem usuários vinculados.');
    }
  };

  const handleDeleteRole = (role: Role) => {
    setConfirmModal({
      isOpen: true,
      title: 'Excluir Cargo',
      message: `Tem certeza que deseja excluir o cargo "${role.description}"?`,
      onConfirm: async () => await executeDeleteRole(role.id),
      isLoading: false,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setFormErrors({});

    const schema = editingUser ? userUpdateSchema : userSchema;
    const result = schema.safeParse({
      name: formData.name,
      email: formData.email,
      phone: formData.phone || undefined,
      password: formData.password,
      user_type_id: String(formData.user_type_id),
      store_id: formData.store_id === '' ? undefined : String(formData.store_id),
      role_id: formData.role_id === '' ? undefined : String(formData.role_id),
      description: formData.description || undefined,
      external_id: formData.external_id || undefined,
    });

    if (!result.success) {
      const errors = result.error.flatten().fieldErrors;
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

    setSaving(true);
    try {
      const data = new FormData();
      data.append('name', formData.name);
      data.append('email', formData.email);
      if (formData.phone) {
        data.append('phone', formData.phone);
      }
      if (formData.password) {
        data.append('password', formData.password);
      }
      data.append('user_type_id', String(formData.user_type_id));
      if (stores.length > 0) {
        data.append('store_id', String(formData.store_id || ''));
      }
      if (formData.role_id) {
        data.append('role_id', String(formData.role_id));
      }
      if (formData.description) {
        data.append('description', formData.description);
      }
      // Sempre envia o external_id (mesmo que vazio) para permitir a limpeza do campo
      data.append('external_id', formData.external_id || '');
      
      if (formData.photo) {
        data.append('photo', formData.photo);
      }

      if (editingUser) {
        await usersService.updateUser(token, editingUser.id, data);
        addToast('success', 'Usuário atualizado com sucesso!');
      } else {
        await usersService.createUser(token, data);
        addToast('success', 'Usuário criado com sucesso!');
      }

      await fetchUsers(currentPage, searchTerm);
      handleCloseModal();
    } catch (error: any) {
      console.error('Error saving user:', error);
      
      if (error.response?.data?.errors) {
        const apiErrors = error.response.data.errors;
        const formattedErrors: { [key: string]: string } = {};
        
        const translations: { [key: string]: string } = {
          'The email has already been taken.': 'Este e-mail já está em uso.',
          'The password field is required.': 'O campo senha é obrigatório.',
          'The name field is required.': 'O campo nome é obrigatório.',
          'The selected store id is invalid.': 'A unidade selecionada é inválida.',
          'The password must be at least 8 characters.': 'A senha deve ter pelo menos 8 caracteres.',
        };

        Object.entries(apiErrors).forEach(([key, messages]: [string, any]) => {
          let message = Array.isArray(messages) ? messages[0] : messages;
          if (typeof message === 'string') {
            formattedErrors[key] = translations[message] || message;
          }
        });
        
        setFormErrors(formattedErrors);
        
        const apiMessage = error.response.data.message === 'Validation error' 
          ? 'Erro de validação nos campos abaixo.' 
          : error.response.data.message;
          
        addToast('error', apiMessage);
      } else {
        addToast('error', error.message || 'Erro ao salvar usuário.');
      }
    } finally {
      setSaving(false);
    }
  };

  const executeDeleteUser = async (user: UserType) => {
    if (!token) return;
    setDeletingId(user.id);
    try {
      await usersService.deleteUser(token, user.id);
      await fetchUsers(currentPage, searchTerm);
      addToast('success', 'Usuário excluído com sucesso!');
    } catch (error: any) {
      console.error('Error deleting user:', error);
      addToast('error', error.message || 'Erro ao excluir usuário.');
    } finally {
      setDeletingId(null);
    }
  };

  const handleDelete = (user: UserType) => {
    // Apenas super admin pode excluir outros admins
    if (user.user_type_id === 1 && !isSuperAdmin) {
      addToast('error', 'Apenas super administradores podem excluir outros administradores.');
      return;
    }
    
    // Ninguém exclui a si mesmo por aqui
    if (user.id === currentUser?.id) {
      addToast('error', 'Você não pode excluir sua própria conta.');
      return;
    }

    setConfirmModal({
      isOpen: true,
      title: 'Excluir Usuário',
      message: `Tem certeza que deseja excluir o usuário ${user.name}? Esta ação não pode ser desfeita.`,
      onConfirm: async () => await executeDeleteUser(user),
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

  const getUserTypeLabel = (typeId: number) => {
    return typeId === 1 ? 'Administrador' : 'Colaborador';
  };

  const getUserTypeColor = (typeId: number) => {
    return typeId === 1
      ? 'bg-primary-600 text-white border-primary-600 shadow-sm'
      : 'bg-primary-50 text-primary-700 border-primary-200 dark:bg-primary-900/20 dark:text-primary-400 dark:border-primary-800';
  };

  const formatLastLogin = (lastLoginAt: string | null) => {
    if (!lastLoginAt) return 'Nunca acessou';
    const date = new Date(lastLoginAt);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    
    if (diffHours < 1) return 'Agora mesmo';
    if (diffHours < 24) return `Há ${diffHours}h`;
    if (diffHours < 48) return 'Ontem';
    if (diffHours < 168) return `Há ${Math.floor(diffHours / 24)} dias`;
    return date.toLocaleDateString('pt-BR');
  };

  return (
    <>
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
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">Meu Time</h1>
            <p className="text-zinc-500 dark:text-zinc-400">Gerencie os membros do seu time.</p>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={() => fetchUsers(currentPage, searchTerm)}
              className="bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 p-2 rounded-xl text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-all"
              title="Atualizar"
            >
              <RefreshCw size={20} className={loading ? "animate-spin" : ""} />
            </button>
            {isAdmin && (
              <button 
                onClick={() => handleOpenModal()}
                className="bg-primary-600 px-4 py-2 rounded-xl text-sm font-medium text-white hover:bg-primary-700 shadow-sm transition-all flex items-center gap-2"
              >
                <Plus size={18} />
                Novo Usuário
              </button>
            )}
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white dark:bg-zinc-900 p-4 rounded-2xl shadow-sm border border-zinc-100 dark:border-zinc-800 flex flex-col md:flex-row gap-4 items-center transition-colors duration-200">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-zinc-400" size={20} />
            <input 
              type="text" 
              placeholder="Buscar por nome..." 
              className="w-full pl-10 pr-4 py-2 border border-zinc-200 dark:border-zinc-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-500"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {/* Users List */}
        {loading && users.length === 0 ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 text-primary-600 animate-spin" />
          </div>
        ) : error ? (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 p-4 rounded-xl text-center">
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
                  className="bg-white dark:bg-zinc-900 p-4 sm:p-6 rounded-2xl shadow-sm border border-zinc-100 dark:border-zinc-800 hover:shadow-md transition-all duration-200 flex flex-col"
                >
                  <div className="flex items-start justify-between gap-2 mb-4">
                    <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                      <div className="w-12 h-12 sm:w-14 sm:h-14 bg-gradient-to-br from-primary-100 to-teal-100 dark:from-primary-900/30 dark:to-teal-900/30 rounded-full flex items-center justify-center text-primary-600 dark:text-primary-400 overflow-hidden border-2 border-primary-200 dark:border-primary-800 flex-shrink-0">
                        {user.profile_image_url ? (
                          <img src={getFullImageUrl(user.profile_image_url) || ''} alt={user.name} className="w-full h-full object-cover" />
                        ) : (
                          <User size={28} />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <h3 className="font-bold text-zinc-900 dark:text-white line-clamp-1" title={user.name}>{user.name}</h3>
                          {user.is_super_admin && (
                            <Crown size={14} className="text-amber-500 fill-amber-500 flex-shrink-0" title="Super Administrador" />
                          )}
                        </div>
                        <div className="flex items-center gap-2 flex-wrap mt-1">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${getUserTypeColor(user.user_type_id)}`}>
                            {getUserTypeLabel(user.user_type_id)}
                          </span>
                          {user.role && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-primary-100 text-primary-800 border border-primary-200 dark:bg-primary-900/40 dark:text-primary-300 dark:border-primary-800">
                              {user.role}
                            </span>
                          )}
                          {user.journey_level && (
                            <span
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold border cursor-default"
                              style={{
                                borderColor: user.journey_level.level_color ?? '#a3a3a3',
                                color: user.journey_level.level_color ?? '#a3a3a3',
                                backgroundColor: `${user.journey_level.level_color ?? '#a3a3a3'}18`,
                              }}
                              title={`Jornada: ${user.journey_level.journey_name}`}
                            >
                              <span>{user.journey_level.level_icon}</span>
                              <span>{user.journey_level.level_name}</span>
                            </span>
                          )}
                          <span 
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border cursor-default transition-colors ${
                              user.push_notifications_enabled 
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800'
                                : 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800'
                            }`}
                            title={user.push_notifications_enabled ? 'Ativo' : 'Inativo'}
                          >
                            {user.push_notifications_enabled ? <Bell size={10} /> : <BellOff size={10} />}
                            {user.push_notifications_enabled ? 'Notificação ativa' : 'Notificação inativa'}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-0.5 sm:gap-1 flex-shrink-0 ml-2">
                      {/* Ver extrato: Apenas colaboradores possuem extrato. Admin e Super Admin podem ver de colaboradores. */}
                      {user.user_type_id !== 1 && (isSuperAdmin || isAdmin) && (
                        <button
                          onClick={() => handleViewCoinStatement(user)}
                          className="p-1.5 sm:p-2 text-zinc-400 hover:text-primary-600 dark:hover:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-lg transition-colors"
                          title="Ver extrato de moedas"
                        >
                          <FileText size={16} />
                        </button>
                      )}

                      {/* Ver humor */}
                      {(isSuperAdmin || isAdmin) && (
                        <button
                          onClick={() => handleViewMood(user)}
                          className="p-1.5 sm:p-2 text-zinc-400 hover:text-pink-600 dark:hover:text-pink-400 hover:bg-pink-50 dark:hover:bg-pink-900/20 rounded-lg transition-colors"
                          title="Ver acompanhamento de humor"
                        >
                          <Heart size={16} />
                        </button>
                      )}
                      
                      {/* Editar: Super Admin edita todos. Admin edita colaboradores. Próprio usuário edita a si mesmo. */}
                      {(isSuperAdmin || currentUser?.id === user.id || (isAdmin && user.user_type_id !== 1)) && (
                        <button
                          onClick={() => handleOpenModal(user)}
                          className="p-1.5 sm:p-2 text-zinc-400 hover:text-primary-600 dark:hover:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-lg transition-colors"
                          title="Editar"
                        >
                          <Edit2 size={16} />
                        </button>
                      )}

                      {/* Excluir: Super Admin exclui todos (exceto ele mesmo). Admin exclui colaboradores. */}
                      {(isSuperAdmin || (isAdmin && user.user_type_id !== 1)) && currentUser?.id !== user.id && (
                        <button
                          onClick={() => handleDelete(user)}
                          className="p-1.5 sm:p-2 text-zinc-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                          title="Excluir"
                        >
                          {deletingId === user.id ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="space-y-3 flex-1 flex flex-col">
                    <div className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
                      <Mail size={16} className="text-zinc-400 flex-shrink-0" />
                      <span className="truncate" title={user.email}>{user.email}</span>
                    </div>

                    {user.phone && (
                      <div className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
                        <span className="text-zinc-400 flex-shrink-0">📞</span>
                        <span className="truncate">{user.phone}</span>
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-3">
                      {user.store && (
                        <div className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
                          <StoreIcon size={14} className="text-zinc-400 flex-shrink-0" />
                          <span className="truncate text-xs">{user.store.name}</span>
                        </div>
                      )}
                    </div>

                    {user.description && (
                      <div className="flex items-start gap-2 text-sm text-zinc-600 dark:text-zinc-400 pt-2 border-t border-zinc-100 dark:border-zinc-800">
                        <FileText size={14} className="text-zinc-400 flex-shrink-0 mt-0.5" />
                        <span className="text-xs italic line-clamp-2" title={user.description}>{user.description}</span>
                      </div>
                    )}

                    <div className="flex-1" />

                    <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-zinc-100 dark:border-zinc-800">
                      {user.user_type_id !== 1 && (isSuperAdmin || isAdmin) && (
                        <div className="flex items-center gap-1.5 text-sm">
                          <Coins size={14} className="text-amber-500 flex-shrink-0" />
                          <span className="font-semibold text-zinc-900 dark:text-white text-xs">
                            {user.coin_balance || 0}
                          </span>
                          <span className="text-zinc-500 dark:text-zinc-400 text-xs">{coinName}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-1.5 text-sm">
                        <LogOut size={14} className="text-zinc-400 flex-shrink-0" />
                        <span className="text-zinc-600 dark:text-zinc-400 text-xs" title={user.last_login_at || 'Nunca'}>
                          {formatLastLogin(user.last_login_at || null)}
                        </span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>

            {users.length === 0 && (
              <div className="text-center py-12 bg-white dark:bg-zinc-900 rounded-2xl border border-dashed border-zinc-200 dark:border-zinc-800 transition-colors duration-200">
                <User className="w-12 h-12 text-zinc-300 dark:text-zinc-600 mx-auto mb-3" />
                <h3 className="text-lg font-medium text-zinc-900 dark:text-white">Nenhum membro encontrado</h3>
                <p className="text-zinc-500 dark:text-zinc-400">Tente ajustar seus filtros de busca.</p>
              </div>
            )}

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

        {/* Create/Edit User Modal */}
        <AnimatePresence>
          {isModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white dark:bg-zinc-900 rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh] border border-zinc-200 dark:border-zinc-800"
              >
                <div className="p-6 border-b border-zinc-100 dark:border-zinc-800 flex justify-between items-center bg-zinc-50/50 dark:bg-zinc-800/50">
                  <h2 className="text-xl font-bold text-zinc-900 dark:text-white">
                    {editingUser ? 'Editar Usuário' : 'Novo Usuário'}
                  </h2>
                  <button onClick={handleCloseModal} className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors">
                    <X size={24} />
                  </button>
                </div>
                
                <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
                  <div className="flex justify-center mb-6">
                    <div className="relative group cursor-pointer">
                      <div className="w-24 h-24 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center overflow-hidden border-2 border-zinc-200 dark:border-zinc-700">
                        {formData.photo ? (
                          <img 
                            src={URL.createObjectURL(formData.photo)} 
                            alt="Preview"
                            className="w-full h-full object-cover"
                          />
                        ) : editingUser?.profile_image_url ? (
                          <img
                            src={getFullImageUrl(editingUser.profile_image_url) || ''}
                            alt={editingUser.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <User size={40} className="text-zinc-400" />
                        )}
                      </div>
                      <label htmlFor="photo-upload" className="absolute bottom-0 right-0 bg-primary-600 text-white p-1.5 rounded-full shadow-md cursor-pointer hover:bg-primary-700 transition-colors">
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
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Nome *</label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className={`w-full p-2.5 border rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white placeholder-zinc-400 ${
                        formErrors.name ? 'border-red-500 focus:ring-red-500' : 'border-zinc-300 dark:border-zinc-600'
                      }`}
                      placeholder="Nome completo"
                    />
                    {formErrors.name && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{formErrors.name}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Email *</label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className={`w-full p-2.5 border rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white placeholder-zinc-400 ${
                        formErrors.email ? 'border-red-500 focus:ring-red-500' : 'border-zinc-300 dark:border-zinc-600'
                      }`}
                      placeholder="email@exemplo.com"
                    />
                    {formErrors.email && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{formErrors.email}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Telefone (Opcional)</label>
                    <input
                      type="text"
                      value={formData.phone}
                      onChange={handlePhoneChange}
                      className={`w-full p-2.5 border rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white placeholder-zinc-400 ${
                        formErrors.phone ? 'border-red-500 focus:ring-red-500' : 'border-zinc-300 dark:border-zinc-600'
                      }`}
                      placeholder="(00) 00000-0000"
                    />
                    {formErrors.phone && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{formErrors.phone}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                      {editingUser ? 'Senha (deixe em branco para manter)' : 'Senha *'}
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        className={`w-full p-2.5 pr-10 border rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white placeholder-zinc-400 ${
                          formErrors.password ? 'border-red-500 focus:ring-red-500' : 'border-zinc-300 dark:border-zinc-600'
                        }`}
                        placeholder="******"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
                        title={showPassword ? "Ocultar senha" : "Mostrar senha"}
                      >
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                    {formErrors.password && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{formErrors.password}</p>}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Tipo de Usuário</label>
                      <select
                        value={formData.user_type_id}
                        onChange={(e) => setFormData({ ...formData, user_type_id: Number(e.target.value) })}
                        disabled={!isAdmin || (formData.user_type_id === 1 && !isSuperAdmin)}
                        className="w-full p-2.5 border border-zinc-300 dark:border-zinc-600 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white disabled:bg-zinc-100 dark:disabled:bg-zinc-800 disabled:text-zinc-500 dark:disabled:text-zinc-500"
                      >
                        <option value={2}>Colaborador</option>
                        {isSuperAdmin && <option value={1}>Administrador</option>}
                        {/* Se por acaso um admin comum estiver editando um admin (não deveria via UI, mas por segurança), mostra a opção desabilitada ou apenas o label */}
                        {!isSuperAdmin && formData.user_type_id === 1 && (
                          <option value={1}>Administrador</option>
                        )}
                      </select>
                    </div>

                    {stores.length > 0 && (
                      <div>
                        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Unidade</label>
                        <select
                          value={formData.store_id}
                          onChange={(e) => setFormData({ ...formData, store_id: e.target.value ? Number(e.target.value) : '' })}
                          disabled={!isAdmin}
                          className="w-full p-2.5 border border-zinc-300 dark:border-zinc-600 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white disabled:bg-zinc-100 dark:disabled:bg-zinc-800 disabled:text-zinc-500 dark:disabled:text-zinc-500"
                        >
                          <option value="">Nenhuma unidade</option>
                          {stores.map(store => (
                            <option key={store.id} value={store.id}>{store.name}</option>
                          ))}
                        </select>
                      </div>
                    )}

                    <div className={stores.length > 0 ? 'col-span-2' : ''}>
                      <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Código de integração (Referência externa)</label>
                      <input
                        type="text"
                        value={formData.external_id}
                        onChange={(e) => setFormData({ ...formData, external_id: e.target.value })}
                        className={`w-full p-2.5 border rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white placeholder-zinc-400 ${
                          formErrors.external_id ? 'border-red-500 focus:ring-red-500' : 'border-zinc-300 dark:border-zinc-600'
                        }`}
                        placeholder="Ex: 12345"
                        maxLength={255}
                      />
                      {formErrors.external_id && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{formErrors.external_id}</p>}
                    </div>

                    <div className="col-span-2">
                      <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Cargo (Opcional)</label>
                      <div className="flex gap-2">
                        <select
                          value={formData.role_id}
                          onChange={(e) => setFormData({ ...formData, role_id: e.target.value ? Number(e.target.value) : '' })}
                          className="flex-1 p-2.5 border border-zinc-300 dark:border-zinc-600 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white"
                        >
                          <option value="">Selecione um cargo</option>
                          {roles.map(role => (
                            <option key={role.id} value={role.id}>{role.description}</option>
                          ))}
                        </select>
                        {isAdmin && (
                          <button
                            type="button"
                            onClick={handleOpenRolesModal}
                            className="p-2.5 border border-zinc-300 dark:border-zinc-600 rounded-xl hover:bg-zinc-50 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-400 transition-colors flex-shrink-0"
                            title="Gerenciar Cargos"
                          >
                            <Settings size={20} />
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="col-span-2">
                      <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Descrição (Opcional)</label>
                      <textarea
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        placeholder="Ex: Gerente da unidade centro..."
                        rows={3}
                        className="w-full p-2.5 border border-zinc-300 dark:border-zinc-600 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white resize-none"
                      />
                    </div>
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
                      className="flex-1 px-4 py-2.5 bg-primary-600 text-white font-medium rounded-xl hover:bg-primary-700 transition-colors disabled:opacity-70 flex items-center justify-center gap-2"
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

      {/* Modal de Gestão de Cargos */}
      <AnimatePresence>
        {isRolesModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-zinc-900 rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh] border border-zinc-200 dark:border-zinc-800"
            >
              <div className="p-6 border-b border-zinc-100 dark:border-zinc-800 flex justify-between items-center bg-zinc-50/50 dark:bg-zinc-800/50">
                <h2 className="text-xl font-bold text-zinc-900 dark:text-white">Gerenciar Cargos</h2>
                <button onClick={handleCloseRolesModal} className="text-zinc-400 hover:text-zinc-600 transition-colors">
                  <X size={24} />
                </button>
              </div>

              <div className="p-6 space-y-6 overflow-y-auto">
                {/* Form para novo cargo */}
                <form onSubmit={handleSubmitRole} className="bg-zinc-50 dark:bg-zinc-800/50 p-4 rounded-xl border border-zinc-200 dark:border-zinc-700 space-y-4">
                  <h3 className="text-sm font-bold text-zinc-900 dark:text-white uppercase tracking-wider">
                    {editingRole ? 'Editar Cargo' : 'Novo Cargo'}
                  </h3>
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <input
                        type="text"
                        value={roleFormData.description}
                        onChange={(e) => setRoleFormData({ description: e.target.value })}
                        className={`w-full p-2.5 border rounded-xl outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white ${
                          roleFormErrors.description ? 'border-red-500' : 'border-zinc-300 dark:border-zinc-600'
                        }`}
                        placeholder="Descrição do cargo (ex: Gerente)"
                      />
                      {roleFormErrors.description && <p className="mt-1 text-xs text-red-500">{roleFormErrors.description}</p>}
                    </div>
                    <button
                      type="submit"
                      disabled={savingRole}
                      className="px-4 py-2.5 bg-primary-600 text-white rounded-xl font-medium hover:bg-primary-700 transition-colors flex items-center gap-2 shadow-sm shadow-primary-500/20 disabled:opacity-50"
                    >
                      {savingRole ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                      {editingRole ? 'Salvar' : 'Adicionar'}
                    </button>
                    {editingRole && (
                      <button
                        type="button"
                        onClick={() => { setEditingRole(null); setRoleFormData({ description: '' }); }}
                        className="px-4 py-2.5 bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-xl font-medium hover:bg-zinc-300 transition-colors"
                      >
                        Cancelar
                      </button>
                    )}
                  </div>
                </form>

                {/* Lista de cargos */}
                <div className="space-y-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
                    <input
                      type="text"
                      value={rolesSearch}
                      onChange={(e) => setRolesSearch(e.target.value)}
                      placeholder="Buscar cargos..."
                      className="w-full pl-10 pr-4 py-2 border border-zinc-200 dark:border-zinc-700 rounded-xl outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white"
                    />
                  </div>

                  {loadingRoles ? (
                    <div className="flex justify-center py-8"><Loader2 className="animate-spin text-primary-500" /></div>
                  ) : (
                    <div className="border border-zinc-100 dark:border-zinc-800 rounded-xl overflow-hidden">
                      <table className="w-full text-sm text-left">
                        <thead className="bg-zinc-50 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400">
                          <tr>
                            <th className="px-4 py-3 font-bold">Descrição</th>
                            <th className="px-4 py-3 text-right">Ações</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                          {roles.map((role) => (
                            <tr key={role.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30">
                              <td className="px-4 py-3 font-medium text-zinc-900 dark:text-white">{role.description}</td>
                              <td className="px-4 py-3 text-right flex justify-end gap-1">
                                <button
                                  onClick={() => handleEditRole(role)}
                                  className="p-1.5 text-zinc-400 hover:text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-lg transition-all"
                                >
                                  <Edit2 size={16} />
                                </button>
                                <button
                                  onClick={() => handleDeleteRole(role)}
                                  className="p-1.5 text-zinc-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all"
                                >
                                  <Trash2 size={16} />
                                </button>
                              </td>
                            </tr>
                          ))}
                          {roles.length === 0 && (
                            <tr><td colSpan={2} className="px-4 py-8 text-center text-zinc-500 italic">Nenhum cargo encontrado.</td></tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* Paginação de cargos */}
                  {rolesTotalPages > 1 && (
                    <div className="flex items-center justify-between pt-2">
                      <span className="text-xs text-zinc-500">Página {rolesPage} de {rolesTotalPages}</span>
                      <div className="flex gap-1">
                        <button
                          onClick={() => fetchRolesPaginated(rolesPage - 1, rolesSearch)}
                          disabled={rolesPage === 1}
                          className="p-1.5 border rounded-lg disabled:opacity-50"
                        ><ChevronLeft size={16} /></button>
                        <button
                          onClick={() => fetchRolesPaginated(rolesPage + 1, rolesSearch)}
                          disabled={rolesPage === rolesTotalPages}
                          className="p-1.5 border rounded-lg disabled:opacity-50"
                        ><ChevronRight size={16} /></button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal de Extrato de Moedas */}
      <CoinStatementModal
        isOpen={coinStatementModal.isOpen}
        user={coinStatementModal.user}
        token={token}
        onClose={handleCloseCoinStatement}
      />

      {/* Modal de Humor */}
      <UserMoodModal
        isOpen={moodModal.isOpen}
        user={moodModal.user}
        token={token}
        onClose={handleCloseMood}
      />
    </>
  );
};
