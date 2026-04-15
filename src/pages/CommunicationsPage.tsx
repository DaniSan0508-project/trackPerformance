import React, { useState, useEffect, useCallback } from 'react';
import { Search, Loader2, RefreshCw, ChevronLeft, ChevronRight, Mail, Plus, Edit2, Trash2, X, Save, Eye, Clock, CheckCircle, Archive, BarChart3, Users, User, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../context/AuthContext';
import { Communication, CommunicationStatus, CommunicationView } from '../types/communication';
import { communicationsService, usersService, rolesService } from '../services';
import { getFullImageUrl } from '../utils/formatters';
import { useToast } from '../context/ToastContext';
import { ConfirmModal } from '../components/ConfirmModal';
import { RichTextEditor } from '../components/RichTextEditor';
import type { Role } from '../types';

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

export const CommunicationsPage: React.FC = () => {
  const { token, user: currentUser } = useAuth();
  const { addToast } = useToast();
  const [communications, setCommunications] = useState<Communication[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 500);
  const [statusFilter, setStatusFilter] = useState<'all' | CommunicationStatus>('all');

  // Paginação
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [fromItem, setFromItem] = useState(0);
  const [toItem, setToItem] = useState(0);

  // Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCommunication, setEditingCommunication] = useState<Communication | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  // Form
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    target_all: true,
    scheduled_at: '',
  });

  // Usuários para seleção
  const [selectedUsers, setSelectedUsers] = useState<number[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [userSearch, setUserSearch] = useState('');
  const debouncedUserSearch = useDebounce(userSearch, 500);

  // Abas do modal
  const [activeTab, setActiveTab] = useState<'basic' | 'recipients'>('basic');

  // Cargos para seleção em massa
  const [roles, setRoles] = useState<Role[]>([]);
  const [fullySelectedRoles, setFullySelectedRoles] = useState<Set<string>>(new Set());
  const [selectByRoleLoading, setSelectByRoleLoading] = useState<string | null>(null);

  // Stats modal
  const [statsModal, setStatsModal] = useState<{
    isOpen: boolean;
    communication: Communication | null;
    views: CommunicationView[];
    loading: boolean;
  }>({
    isOpen: false,
    communication: null,
    views: [],
    loading: false,
  });

  // Confirm modal
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

  const fetchCommunications = useCallback(async (page = 1, search = '') => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const data = await communicationsService.getCommunications(token, page, search, statusFilter !== 'all' ? statusFilter : undefined);
      setCommunications(data.data);
      setCurrentPage(data.meta?.current_page || data.current_page);
      setTotalPages(data.meta?.last_page || data.last_page);
      setTotalItems(data.meta?.total || data.total);
      setFromItem(data.meta?.from || data.from);
      setToItem(data.meta?.to || data.to);
    } catch (err: any) {
      console.error('Error fetching communications:', err);
      setError(err.message || 'Não foi possível carregar os comunicados.');
    } finally {
      setLoading(false);
    }
  }, [token, statusFilter]);

  useEffect(() => {
    fetchCommunications(currentPage, debouncedSearchTerm);
  }, [fetchCommunications, currentPage, debouncedSearchTerm]);

  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearchTerm, statusFilter]);

  // Buscar usuários e cargos quando modal abrir
  useEffect(() => {
    const fetchData = async () => {
      if (isModalOpen && token) {
        // Buscar usuários
        if (!formData.target_all) {
          try {
            const response = await usersService.getUsers(token, 1, debouncedUserSearch, 'name');
            setUsers(response.data || []);
          } catch (error) {
            console.error('Error fetching users:', error);
          }
        }
        
        // Buscar cargos
        try {
          const rolesData = await rolesService.getAllRoles(token);
          if (rolesData?.data) {
            setRoles(rolesData.data);
          }
        } catch (error) {
          console.error('Error fetching roles:', error);
        }
      }
    };
    fetchData();
  }, [isModalOpen, token, formData.target_all, debouncedUserSearch]);

  const handleRefresh = () => {
    fetchCommunications(currentPage, debouncedSearchTerm);
  };

  const handleOpenModal = (communication?: Communication) => {
    if (communication) {
      setEditingCommunication(communication);
      setFormData({
        title: communication.title,
        content: communication.content,
        target_all: communication.target_all,
        scheduled_at: communication.scheduled_at?.split('T')[0] || '',
      });
      setSelectedUsers(communication.target_users?.map(u => u.id) || []);
    } else {
      setEditingCommunication(null);
      setFormData({
        title: '',
        content: '',
        target_all: true,
        scheduled_at: '',
      });
      setSelectedUsers([]);
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingCommunication(null);
    setActiveTab('basic');
    setFullySelectedRoles(new Set());
  };

  // Verifica se todos os usuários de um cargo estão selecionados
  const areAllUsersSelectedByRole = (role: string): boolean => {
    const roleUsers = users.filter(u => u.role === role);
    if (roleUsers.length === 0) return false;
    return roleUsers.every(u => selectedUsers.includes(u.id));
  };

  // Seleciona/desseleciona todos os usuários de um cargo
  const handleSelectAllByRole = async (role: string) => {
    setSelectByRoleLoading(role);
    
    try {
      // Buscar todos os usuários se necessário
      let allUsers = users;
      if (users.length === 0) {
        const response = await usersService.getUsers(token!, 1, '', 'name');
        allUsers = response.data || [];
        setUsers(allUsers);
      }

      // Filtra usuários do cargo selecionado
      const roleUsers = allUsers.filter(u => u.role === role);
      const validUserIds = roleUsers.map(u => u.id);

      // Toggle: se já estão todos selecionados, desseleciona; senão, adiciona
      const allRoleSelected = validUserIds.length > 0 && validUserIds.every(id => selectedUsers.includes(id));
      
      if (allRoleSelected) {
        setSelectedUsers(prev => prev.filter(id => !validUserIds.includes(id)));
        setFullySelectedRoles(prev => {
          const next = new Set(prev);
          next.delete(role);
          return next;
        });
      } else {
        setSelectedUsers(prev => {
          const newIds = validUserIds.filter(id => !prev.includes(id));
          return [...prev, ...newIds];
        });
        setFullySelectedRoles(prev => new Set(prev).add(role));
      }
    } catch (error) {
      console.error('Error selecting users by role:', error);
      addToast('error', 'Erro ao selecionar usuários por cargo.');
    } finally {
      setSelectByRoleLoading(null);
    }
  };

  const handleSubmit = async () => {
    if (!token) return;

    if (!formData.title.trim()) {
      addToast('error', 'Título é obrigatório.');
      return;
    }
    if (!formData.content.trim()) {
      addToast('error', 'Conteúdo é obrigatório.');
      return;
    }
    if (!formData.target_all && selectedUsers.length === 0) {
      addToast('error', 'Selecione pelo menos 1 usuário ou marque "Enviar para todos".');
      return;
    }

    setSaving(true);
    try {
      const dataToSave = {
        title: formData.title,
        content: formData.content,
        target_all: formData.target_all,
        target_user_ids: formData.target_all ? undefined : selectedUsers,
        is_draft: false, // Publica diretamente
        scheduled_at: formData.scheduled_at || undefined,
      };

      if (editingCommunication) {
        await communicationsService.updateCommunication(token, editingCommunication.id, dataToSave);
        addToast('success', 'Comunicado atualizado com sucesso!');
      } else {
        await communicationsService.createCommunication(token, dataToSave);
        addToast('success', 'Comunicado criado com sucesso!');
      }

      handleCloseModal();
      fetchCommunications(currentPage, debouncedSearchTerm);
    } catch (err: any) {
      console.error('Error saving communication:', err);
      addToast('error', err.message || 'Erro ao salvar comunicado.');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveDraft = async () => {
    if (!token) return;

    if (!formData.title.trim()) {
      addToast('error', 'Título é obrigatório.');
      return;
    }

    setSaving(true);
    try {
      const dataToSave = {
        title: formData.title,
        content: formData.content || '<p></p>',
        target_all: formData.target_all,
        target_user_ids: formData.target_all ? undefined : selectedUsers,
        is_draft: true,
        scheduled_at: formData.scheduled_at || undefined,
      };

      if (editingCommunication) {
        await communicationsService.updateCommunication(token, editingCommunication.id, dataToSave);
        addToast('success', 'Rascunho salvo com sucesso!');
      } else {
        await communicationsService.createCommunication(token, dataToSave);
        addToast('success', 'Rascunho criado com sucesso!');
      }

      handleCloseModal();
      fetchCommunications(currentPage, debouncedSearchTerm);
    } catch (err: any) {
      console.error('Error saving draft:', err);
      addToast('error', err.message || 'Erro ao salvar rascunho.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (communication: Communication) => {
    setConfirmModal({
      isOpen: true,
      title: 'Excluir Comunicado',
      message: `Tem certeza que deseja excluir o comunicado "${communication.title}"? Esta ação não pode ser desfeita.`,
      onConfirm: async () => {
        if (!token) return;
        setConfirmModal(prev => ({ ...prev, isLoading: true }));
        try {
          await communicationsService.deleteCommunication(token, communication.id);
          addToast('success', 'Comunicado excluído com sucesso!');
          fetchCommunications(currentPage, debouncedSearchTerm);
          setConfirmModal(prev => ({ ...prev, isOpen: false }));
        } catch (error: any) {
          console.error('Error deleting communication:', error);
          addToast('error', error.message || 'Erro ao excluir comunicado.');
          setConfirmModal(prev => ({ ...prev, isOpen: false }));
        } finally {
          setConfirmModal(prev => ({ ...prev, isLoading: false }));
        }
      },
      isLoading: false,
    });
  };

  const handlePublish = async (communication: Communication) => {
    if (!token) return;
    try {
      await communicationsService.publishCommunication(token, communication.id);
      addToast('success', 'Comunicado publicado com sucesso!');
      fetchCommunications(currentPage, debouncedSearchTerm);
    } catch (error: any) {
      console.error('Error publishing communication:', error);
      addToast('error', error.message || 'Erro ao publicar comunicado.');
    }
  };

  const handleArchive = async (communication: Communication) => {
    if (!token) return;
    try {
      await communicationsService.archiveCommunication(token, communication.id);
      addToast('success', 'Comunicado arquivado com sucesso!');
      fetchCommunications(currentPage, debouncedSearchTerm);
    } catch (error: any) {
      console.error('Error archiving communication:', error);
      addToast('error', error.message || 'Erro ao arquivar comunicado.');
    }
  };

  const handleViewStats = async (communication: Communication) => {
    if (!token) return;
    setStatsModal({ isOpen: true, communication, views: [], loading: true });
    try {
      const data = await communicationsService.getCommunicationViews(token, communication.id);
      setStatsModal(prev => ({ ...prev, views: data.data || [], loading: false }));
    } catch (error: any) {
      console.error('Error fetching views:', error);
      addToast('error', error.message || 'Erro ao carregar estatísticas.');
      setStatsModal(prev => ({ ...prev, loading: false }));
    }
  };

  const handleCloseStats = () => {
    setStatsModal({ isOpen: false, communication: null, views: [], loading: false });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusBadge = (status: CommunicationStatus) => {
    const config = {
      draft: { label: 'Rascunho', color: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400', icon: <Clock size={12} /> },
      published: { label: 'Publicado', color: 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400', icon: <CheckCircle size={12} /> },
      archived: { label: 'Arquivado', color: 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400', icon: <Archive size={12} /> },
    };
    const { label, color, icon } = config[status];
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-bold flex items-center gap-1 ${color}`}>
        {icon}
        {label}
      </span>
    );
  };

  return (
    <>
      <div className="p-4 md:p-8 space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">Comunicados</h1>
            <p className="text-zinc-500 dark:text-zinc-400">Gerencie os comunicados e acompanhe as visualizações.</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleRefresh}
              className="bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 p-2 rounded-xl text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-all"
              title="Atualizar"
            >
              <RefreshCw size={20} />
            </button>
            <button
              onClick={() => handleOpenModal()}
              className="flex items-center gap-2 bg-primary-600 px-4 py-2 rounded-xl text-sm font-medium text-white hover:bg-primary-700 shadow-sm transition-all"
            >
              <Plus size={16} />
              Novo Comunicado
            </button>
          </div>
        </div>

        {/* Filtros */}
        <div className="bg-white dark:bg-zinc-900 p-4 rounded-2xl shadow-sm border border-zinc-100 dark:border-zinc-800 transition-colors duration-200">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Busca */}
            <div className="md:col-span-3 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-zinc-400" size={18} />
              <input
                type="text"
                placeholder="Buscar por título..."
                className="w-full pl-10 pr-4 py-2.5 border border-zinc-300 dark:border-zinc-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-500"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            {/* Filtro de Status */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as 'all' | CommunicationStatus)}
              className="w-full px-4 py-2.5 border border-zinc-300 dark:border-zinc-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white"
            >
              <option value="all">Todos os status</option>
              <option value="draft">Rascunho</option>
              <option value="published">Publicado</option>
              <option value="archived">Arquivado</option>
            </select>
          </div>
        </div>

        {/* Lista de Comunicados */}
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 text-primary-600 animate-spin" />
          </div>
        ) : error ? (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 p-4 rounded-xl text-center">
            {error}
            <button
              onClick={() => fetchCommunications(currentPage, debouncedSearchTerm)}
              className="block mx-auto mt-2 text-sm font-semibold hover:underline"
            >
              Tentar novamente
            </button>
          </div>
        ) : communications.length === 0 ? (
          <div className="bg-white dark:bg-zinc-900 p-12 rounded-2xl shadow-sm border border-zinc-100 dark:border-zinc-800 text-center">
            <Mail className="w-16 h-16 text-zinc-300 dark:text-zinc-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-white mb-2">Nenhum comunicado encontrado</h3>
            <p className="text-zinc-500 dark:text-zinc-400">
              {searchTerm || statusFilter !== 'all'
                ? 'Tente ajustar os filtros para encontrar o que procura.'
                : 'Comece criando um novo comunicado.'}
            </p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-4">
              {communications.map((communication) => (
                <motion.div
                  key={communication.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white dark:bg-zinc-900 p-6 rounded-2xl shadow-sm border border-zinc-100 dark:border-zinc-800 hover:shadow-md transition-all duration-200"
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-start gap-4 flex-1">
                      <div className="bg-primary-100 dark:bg-primary-900/30 p-3 rounded-xl">
                        <Mail className="w-6 h-6 text-primary-600 dark:text-primary-400" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap mb-2">
                          <h3 className="font-bold text-lg text-zinc-900 dark:text-white">{communication.title}</h3>
                          {getStatusBadge(communication.status)}
                        </div>

                        <div className="flex flex-wrap gap-4 text-sm text-zinc-600 dark:text-zinc-400">
                          <div className="flex items-center gap-1.5">
                            <Clock size={16} className="text-primary-500" />
                            <span className="text-zinc-500 dark:text-zinc-500">Publicado em:</span>
                            <span className="font-medium text-zinc-900 dark:text-white">
                              {communication.published_at ? formatDate(communication.published_at) : 'Não publicado'}
                            </span>
                          </div>
                          {communication.stats && (
                            <>
                              <div className="flex items-center gap-1.5">
                                <Users size={16} className="text-purple-500" />
                                <span className="text-zinc-500 dark:text-zinc-500">Destinatários:</span>
                                <span className="font-medium text-zinc-900 dark:text-white">{communication.stats.total_recipients}</span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <Eye size={16} className="text-green-500" />
                                <span className="text-zinc-500 dark:text-zinc-500">Visualizações:</span>
                                <span className="font-medium text-zinc-900 dark:text-white">{communication.stats.viewed_count}</span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <BarChart3 size={16} className="text-amber-500" />
                                <span className="text-zinc-500 dark:text-zinc-500">Taxa:</span>
                                <span className="font-medium text-zinc-900 dark:text-white">{communication.stats.view_rate}%</span>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Ações */}
                    <div className="flex items-center gap-2">
                      {communication.status === 'published' && (
                        <button
                          onClick={() => handleViewStats(communication)}
                          className="p-2 text-zinc-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                          title="Ver Estatísticas"
                        >
                          <BarChart3 size={18} />
                        </button>
                      )}
                      {communication.status === 'draft' && (
                        <>
                          <button
                            onClick={() => handleOpenModal(communication)}
                            className="p-2 text-zinc-400 hover:text-primary-600 dark:hover:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-lg transition-colors"
                            title="Editar"
                          >
                            <Edit2 size={18} />
                          </button>
                          <button
                            onClick={() => handlePublish(communication)}
                            className="p-2 text-zinc-400 hover:text-green-600 dark:hover:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-colors"
                            title="Publicar"
                          >
                            <CheckCircle size={18} />
                          </button>
                        </>
                      )}
                      {communication.status === 'published' && (
                        <button
                          onClick={() => handleArchive(communication)}
                          className="p-2 text-zinc-400 hover:text-gray-600 dark:hover:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-900/20 rounded-lg transition-colors"
                          title="Arquivar"
                        >
                          <Archive size={18} />
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(communication)}
                        className="p-2 text-zinc-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                        title="Excluir"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Paginação */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between pt-4">
                <div className="text-sm text-zinc-600 dark:text-zinc-400">
                  Mostrando <span className="font-semibold text-zinc-900 dark:text-white">{fromItem}</span> até{' '}
                  <span className="font-semibold text-zinc-900 dark:text-white">{toItem}</span> de{' '}
                  <span className="font-semibold text-zinc-900 dark:text-white">{totalItems}</span> resultados
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className="flex items-center gap-1 px-4 py-2 border border-zinc-300 dark:border-zinc-600 rounded-xl text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    <ChevronLeft size={16} />
                    Anterior
                  </button>
                  <span className="px-4 py-2 bg-primary-600 text-white rounded-xl text-sm font-medium">
                    {currentPage} de {totalPages}
                  </span>
                  <button
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    className="flex items-center gap-1 px-4 py-2 border border-zinc-300 dark:border-zinc-600 rounded-xl text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    Próxima
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Modal de Criação/Edição */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-zinc-900 rounded-2xl shadow-xl w-full max-w-4xl overflow-hidden border border-zinc-200 dark:border-zinc-800 max-h-[90vh] flex flex-col"
            >
              {/* Header */}
              <div className="p-6 border-b border-zinc-100 dark:border-zinc-800 flex justify-between items-center bg-zinc-50/50 dark:bg-zinc-800/50">
                <div>
                  <h2 className="text-xl font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                    <Mail className="w-6 h-6 text-primary-500" />
                    {editingCommunication ? 'Editar Comunicado' : 'Novo Comunicado'}
                  </h2>
                </div>
                <button onClick={handleCloseModal} className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors">
                  <X size={24} />
                </button>
              </div>

              {/* Tabs */}
              <div className="flex border-b border-zinc-200 dark:border-zinc-700 bg-zinc-50/50 dark:bg-zinc-800/30">
                <button
                  onClick={() => setActiveTab('basic')}
                  className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                    activeTab === 'basic'
                      ? 'bg-white dark:bg-zinc-800 text-primary-600 dark:text-primary-400 border-b-2 border-primary-500'
                      : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200'
                  }`}
                >
                  Dados Básicos
                </button>
                <button
                  onClick={() => setActiveTab('recipients')}
                  className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                    activeTab === 'recipients'
                      ? 'bg-white dark:bg-zinc-800 text-primary-600 dark:text-primary-400 border-b-2 border-primary-500'
                      : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200'
                  }`}
                >
                  Destinatários {!formData.target_all && selectedUsers.length > 0 && `(${selectedUsers.length})`}
                </button>
              </div>

              {/* Tab Content */}
              <div className="flex-1 overflow-y-auto p-6 min-h-0">
                {/* Aba Dados Básicos */}
                {activeTab === 'basic' && (
                  <div className="space-y-4">
                    {/* Título */}
                    <div>
                      <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                        Título *
                      </label>
                      <input
                        type="text"
                        value={formData.title}
                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                        placeholder="Ex: Comunicado Importante"
                        className="w-full px-4 py-2.5 border border-zinc-300 dark:border-zinc-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white"
                      />
                    </div>

                    {/* Conteúdo */}
                    <div>
                      <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                        Conteúdo *
                      </label>
                      <RichTextEditor
                        value={formData.content}
                        onChange={(value) => setFormData({ ...formData, content: value })}
                        placeholder="Digite o conteúdo do comunicado..."
                      />
                    </div>

                    {/* Agendamento */}
                    <div>
                      <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                        Agendar publicação (opcional)
                      </label>
                      <input
                        type="datetime-local"
                        value={formData.scheduled_at}
                        onChange={(e) => setFormData({ ...formData, scheduled_at: e.target.value })}
                        className="w-full px-4 py-2.5 border border-zinc-300 dark:border-zinc-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white"
                      />
                    </div>
                  </div>
                )}

                {/* Aba Destinatários */}
                {activeTab === 'recipients' && (
                  <div className="space-y-4">
                    {/* Opção enviar para todos */}
                    <label className="flex items-center gap-3 p-3 border border-zinc-200 dark:border-zinc-700 rounded-xl cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors">
                      <input
                        type="checkbox"
                        checked={formData.target_all}
                        onChange={(e) => setFormData({ ...formData, target_all: e.target.checked })}
                        className="w-5 h-5 text-primary-600 rounded focus:ring-primary-500"
                      />
                      <div>
                        <p className="font-medium text-zinc-900 dark:text-white">Enviar para todos os usuários</p>
                        <p className="text-sm text-zinc-500 dark:text-zinc-400">O comunicado será enviado para todos os usuários do sistema</p>
                      </div>
                    </label>

                    {!formData.target_all && (
                      <>
                        {/* Filtrar por Cargo */}
                        {roles.length > 0 && (
                          <div className="bg-zinc-50 dark:bg-zinc-800/50 p-3 rounded-2xl border border-zinc-100 dark:border-zinc-800">
                            <p className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 mb-3 uppercase">
                              Filtrar por Cargo
                            </p>
                            <div className="flex flex-wrap gap-2">
                              {roles.map((roleObj) => {
                                const role = roleObj.description;
                                const hasUsersFromRole = users.some(u => u.role === role);
                                const isSelected = fullySelectedRoles.has(role);
                                
                                return (
                                  <button
                                    key={role}
                                    onClick={() => handleSelectAllByRole(role)}
                                    disabled={selectByRoleLoading !== null}
                                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                                      isSelected
                                        ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400 border-primary-200 dark:border-primary-800'
                                        : 'bg-white dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-700 hover:border-primary-300 dark:hover:border-primary-700'
                                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                                  >
                                    {selectByRoleLoading === role ? (
                                      <Loader2 size={12} className="animate-spin" />
                                    ) : isSelected ? (
                                      <Check size={12} />
                                    ) : (
                                      <Plus size={12} />
                                    )}
                                    {role}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {/* Busca de usuários */}
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-zinc-400" size={18} />
                          <input
                            type="text"
                            placeholder="Buscar por nome..."
                            value={userSearch}
                            onChange={(e) => setUserSearch(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 border border-zinc-300 dark:border-zinc-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white"
                          />
                        </div>

                        {/* Lista de usuários */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-60 overflow-y-auto">
                          {users.map(user => (
                            <motion.button
                              key={user.id}
                              onClick={() => {
                                setSelectedUsers(prev =>
                                  prev.includes(user.id) ? prev.filter(id => id !== user.id) : [...prev, user.id]
                                );
                              }}
                              className={`flex items-start gap-3 p-3 border rounded-xl text-left transition-all ${
                                selectedUsers.includes(user.id)
                                  ? 'border-primary-300 dark:border-primary-700 bg-primary-50/50 dark:bg-primary-900/20'
                                  : 'border-zinc-200 dark:border-zinc-700 hover:border-zinc-300 dark:hover:border-zinc-600'
                              }`}
                            >
                              {/* Avatar */}
                              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary-100 to-teal-100 border-2 border-primary-200 flex items-center justify-center text-primary-600 overflow-hidden flex-shrink-0">
                                {user.profile_image_url ? (
                                  <img
                                    src={getFullImageUrl(user.profile_image_url) || ''}
                                    alt={user.name}
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <span className="text-lg font-bold">
                                    {user.name.charAt(0).toUpperCase()}
                                  </span>
                                )}
                              </div>

                              {/* Informações */}
                              <div className="flex-1 min-w-0">
                                <p className="font-bold text-sm text-zinc-900 dark:text-white truncate">{user.name}</p>
                                {user.role && (
                                  <p className="text-[10px] font-semibold text-primary-600 dark:text-primary-400 uppercase tracking-wider">
                                    {user.role}
                                  </p>
                                )}
                                <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate">{user.email}</p>
                                {user.store && (
                                  <p className="text-[10px] text-zinc-400 dark:text-zinc-500 truncate mt-1">
                                    {user.store.name}
                                  </p>
                                )}
                              </div>

                              {/* Checkbox indicator */}
                              <div className={`w-5 h-5 rounded border flex items-center justify-center flex-shrink-0 ${
                                selectedUsers.includes(user.id)
                                  ? 'bg-primary-600 border-primary-600'
                                  : 'border-zinc-300 dark:border-zinc-600'
                              }`}>
                                {selectedUsers.includes(user.id) && (
                                  <Check size={12} className="text-white" />
                                )}
                              </div>
                            </motion.button>
                          ))}
                        </div>

                        {selectedUsers.length > 0 && (
                          <p className="text-sm text-primary-600 dark:text-primary-400 font-medium">
                            {selectedUsers.length} usuário(s) selecionado(s)
                          </p>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="p-6 border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/50 flex justify-between items-center gap-3">
                <button
                  onClick={handleCloseModal}
                  className="px-6 py-2.5 border border-zinc-300 dark:border-zinc-600 text-zinc-700 dark:text-zinc-300 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-all font-bold"
                >
                  Cancelar
                </button>
                
                <div className="flex items-center gap-3">
                  {activeTab === 'recipients' && (
                    <button
                      onClick={handleSaveDraft}
                      disabled={saving || !formData.title.trim()}
                      className="px-6 py-2.5 border border-amber-500 text-amber-600 dark:text-amber-400 rounded-xl hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-all font-bold disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                      {' '}Salvar Rascunho
                    </button>
                  )}
                  
                  {activeTab === 'basic' && (
                    <button
                      onClick={() => setActiveTab('recipients')}
                      className="px-6 py-2.5 bg-primary-600 text-white rounded-xl hover:bg-primary-700 transition-all font-bold flex items-center gap-2 shadow-lg shadow-primary-500/20"
                    >
                      Próximo
                      <ChevronRight size={16} />
                    </button>
                  )}
                  
                  {activeTab === 'recipients' && (
                    <button
                      onClick={handleSubmit}
                      disabled={saving || !formData.title.trim() || !formData.content.trim() || (!formData.target_all && selectedUsers.length === 0)}
                      className="px-6 py-2.5 bg-primary-600 text-white rounded-xl hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-bold flex items-center gap-2 shadow-lg shadow-primary-500/20"
                    >
                      {saving ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle size={18} />}
                      {' '}{editingCommunication ? 'Atualizar' : 'Publicar'}
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Stats Modal */}
      <AnimatePresence>
        {statsModal.isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={handleCloseStats}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-y-auto"
            >
              {/* Header */}
              <div className="p-6 border-b border-zinc-100 dark:border-zinc-800 flex justify-between items-start sticky top-0 bg-white dark:bg-zinc-900 rounded-t-2xl z-10">
                <div className="flex-1">
                  <h2 className="text-xl font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                    <BarChart3 className="w-6 h-6 text-primary-500" />
                    Estatísticas: {statsModal.communication?.title}
                  </h2>
                  {statsModal.communication?.stats && (
                    <div className="flex gap-4 mt-2 text-sm text-zinc-600 dark:text-zinc-400">
                      <span>📊 Total: {statsModal.communication.stats.total_recipients}</span>
                      <span>👁️ Visualizações: {statsModal.communication.stats.viewed_count}</span>
                      <span>📈 Taxa: {statsModal.communication.stats.view_rate}%</span>
                    </div>
                  )}
                </div>
                <button
                  onClick={handleCloseStats}
                  className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors ml-4"
                >
                  <X size={24} />
                </button>
              </div>

              {/* Content */}
              <div className="p-6">
                {statsModal.loading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 size={32} className="animate-spin text-primary-600" />
                  </div>
                ) : statsModal.views.length === 0 ? (
                  <p className="text-center text-zinc-500 dark:text-zinc-400 py-8">
                    Nenhuma visualização registrada ainda.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {statsModal.views.map((view) => (
                      <div
                        key={view.id}
                        className="flex items-center gap-3 p-3 border border-zinc-200 dark:border-zinc-700 rounded-xl"
                      >
                        {view.user.profile_image_url ? (
                          <img src={view.user.profile_image_url} alt={view.user.name} className="w-10 h-10 rounded-full object-cover" />
                        ) : (
                          <div className="w-10 h-10 bg-primary-100 dark:bg-primary-900/30 rounded-full flex items-center justify-center">
                            <User size={20} className="text-primary-600 dark:text-primary-400" />
                          </div>
                        )}
                        <div className="flex-1">
                          <p className="font-medium text-zinc-900 dark:text-white">{view.user.name}</p>
                          <p className="text-sm text-zinc-500 dark:text-zinc-400">{view.user.email}</p>
                        </div>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400">
                          {formatDate(view.viewed_at)}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Confirm Modal */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        onConfirm={confirmModal.onConfirm}
        isLoading={confirmModal.isLoading}
        onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
      />
    </>
  );
};
