import React, { useState, useEffect, useCallback } from 'react';
import { Layout } from '../components/Layout';
import { Search, Loader2, RefreshCw, ChevronLeft, ChevronRight, Plus, Edit2, Trash2, Target, Calendar, TrendingUp, X, Users, ShoppingBag, Coins, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../context/AuthContext';
import { Campaign, User as UserType, ActionEngagement, Product, CampaignAction } from '../types';
import { api } from '../services/api';
import { useToast } from '../context/ToastContext';
import { ConfirmModal } from '../components/ConfirmModal';
import { campaignSchema } from '../validators/schemas';

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

const campaignTypeLabels: Record<string, string> = {
  sales: 'Vendas',
  engagement: 'Engajamento',
  retention: 'Retenção',
  acquisition: 'Aquisição',
  loyalty: 'Fidelização',
};

const campaignTypeColors: Record<string, string> = {
  sales: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  engagement: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  retention: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  acquisition: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  loyalty: 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400',
};

// Ações de engajamento hardcoded (já existem no banco)
const ENGAGEMENT_ACTIONS: ActionEngagement[] = [
  { id: 1, name: 'login_daily', created_at: '', updated_at: '' },
  { id: 2, name: 'share_post', created_at: '', updated_at: '' },
  { id: 3, name: 'comment_post', created_at: '', updated_at: '' },
  { id: 4, name: 'like_post', created_at: '', updated_at: '' },
  { id: 5, name: 'send_feedback', created_at: '', updated_at: '' },
  { id: 6, name: 'answer_survey', created_at: '', updated_at: '' },
];

const actionLabels: Record<string, string> = {
  login_daily: 'Login Diário',
  share_post: 'Compartilhar Post',
  comment_post: 'Comentar Post',
  like_post: 'Curtir Post',
  send_feedback: 'Enviar Feedback',
  answer_survey: 'Responder Pesquisa',
};

interface SelectedAction {
  id: number;
  coins: number;
}

export const CampaignsPage: React.FC = () => {
  const { token, user: currentUser } = useAuth();
  const { addToast } = useToast();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 500);

  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [fromItem, setFromItem] = useState(0);
  const [toItem, setToItem] = useState(0);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<Campaign | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [formErrors, setFormErrors] = useState<{ [key: string]: string }>({});

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

  // Dados auxiliares
  const [users, setUsers] = useState<UserType[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingAux, setLoadingAux] = useState(false);

  // Abas do modal
  const [activeTab, setActiveTab] = useState<'basic' | 'users' | 'actions' | 'products'>('basic');

  const [formData, setFormData] = useState({
    name: '',
    type: 'sales',
    goal: '',
    start_date: '',
    end_date: '',
    is_active: '1',
  });

  // Seleções
  const [selectedUsers, setSelectedUsers] = useState<number[]>([]);
  const [selectedActions, setSelectedActions] = useState<SelectedAction[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<number[]>([]);

  const isAdmin = currentUser?.user_type_id === 1;

  const fetchAuxiliaryData = useCallback(async () => {
    if (!token) return;
    setLoadingAux(true);
    try {
      const [usersData, productsData] = await Promise.all([
        api.getAllUsers(token).catch(() => null),
        api.getProducts(token).catch(() => null),
      ]);

      if (usersData?.data) setUsers(usersData.data);
      if (productsData?.data) setProducts(productsData.data);
    } catch (error) {
      console.error('Error fetching auxiliary data:', error);
    } finally {
      setLoadingAux(false);
    }
  }, [token]);

  const fetchCampaigns = useCallback(async (page = 1, search = '') => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const data = await api.getCampaigns(token, page, search);
      setCampaigns(data.data);
      setCurrentPage(data.current_page);
      setTotalPages(data.last_page);
      setTotalItems(data.total);
      setFromItem(data.from);
      setToItem(data.to);
    } catch (err: any) {
      console.error('Error fetching campaigns:', err);
      setError(err.message || 'Não foi possível carregar as campanhas.');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchCampaigns(currentPage, debouncedSearchTerm);
  }, [fetchCampaigns, currentPage, debouncedSearchTerm]);

  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearchTerm]);

  const handleOpenModal = (campaign?: Campaign) => {
    setActiveTab('basic');
    if (campaign) {
      setEditingCampaign(campaign);
      setFormData({
        name: campaign.name,
        type: campaign.type,
        goal: campaign.goal,
        start_date: campaign.start_date,
        end_date: campaign.end_date,
        is_active: campaign.is_active ? '1' : '0',
      });
      // Carregar seleções existentes
      setSelectedUsers(campaign.users?.map(u => u.id) || []);
      setSelectedProducts(campaign.products?.map(p => p.product_id) || []);
      setSelectedActions(campaign.actions?.map(a => ({ id: a.action_id, coins: a.coins })) || []);
    } else {
      setEditingCampaign(null);
      setFormData({
        name: '',
        type: 'sales',
        goal: '',
        start_date: '',
        end_date: '',
        is_active: '1',
      });
      setSelectedUsers([]);
      setSelectedProducts([]);
      setSelectedActions([]);
    }
    setIsModalOpen(true);
    fetchAuxiliaryData();
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingCampaign(null);
    setActiveTab('basic');
    setFormData({
      name: '',
      type: 'sales',
      goal: '',
      start_date: '',
      end_date: '',
      is_active: '1',
    });
    setSelectedUsers([]);
    setSelectedProducts([]);
    setSelectedActions([]);
    setFormErrors({});
  };

  const handleSubmit = async () => {
    if (!token) return;
    setFormErrors({});

    const result = campaignSchema.safeParse(formData);
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

    // Validação adicional: end_date deve ser maior que start_date
    if (formData.end_date < formData.start_date) {
      setFormErrors({ end_date: 'Data de término deve ser maior que data de início' });
      addToast('error', 'Data de término deve ser maior que data de início.');
      return;
    }

    setSaving(true);
    try {
      const dataToSave: any = {
        name: formData.name,
        type: formData.type,
        goal: parseFloat(formData.goal),
        start_date: formData.start_date,
        end_date: formData.end_date,
        is_active: formData.is_active === '1',
        users: selectedUsers,
        products: selectedProducts,
        actions: selectedActions.map(a => ({ id: a.id, coins: a.coins })),
      };

      if (editingCampaign) {
        await api.updateCampaign(token, editingCampaign.id, dataToSave);
        addToast('success', 'Campanha atualizada com sucesso!');
      } else {
        await api.createCampaign(token, dataToSave);
        addToast('success', 'Campanha criada com sucesso!');
      }

      await fetchCampaigns(currentPage, searchTerm);
      handleCloseModal();
    } catch (error: any) {
      console.error('Error saving campaign:', error);
      addToast('error', error.message || 'Erro ao salvar campanha.');
    } finally {
      setSaving(false);
    }
  };

  const executeDeleteCampaign = async (campaign: Campaign) => {
    if (!token) return;
    setDeletingId(campaign.id);
    try {
      await api.deleteCampaign(token, campaign.id);
      await fetchCampaigns(currentPage, searchTerm);
      addToast('success', 'Campanha excluída com sucesso!');
    } catch (error: any) {
      console.error('Error deleting campaign:', error);
      addToast('error', error.message || 'Erro ao excluir campanha.');
    } finally {
      setDeletingId(null);
    }
  };

  const handleDelete = (campaign: Campaign) => {
    setConfirmModal({
      isOpen: true,
      title: 'Excluir Campanha',
      message: `Tem certeza que deseja excluir a campanha "${campaign.name}"? Esta ação não pode ser desfeita.`,
      onConfirm: async () => await executeDeleteCampaign(campaign),
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

  const formatCurrency = (value: string) => {
    return parseFloat(value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  // Handlers para seleção
  const toggleUser = (userId: number) => {
    setSelectedUsers(prev => 
      prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
    );
  };

  const toggleProduct = (productId: number) => {
    setSelectedProducts(prev => 
      prev.includes(productId) ? prev.filter(id => id !== productId) : [...prev, productId]
    );
  };

  const toggleAction = (actionId: number) => {
    setSelectedActions(prev => {
      const exists = prev.find(a => a.id === actionId);
      if (exists) {
        return prev.filter(a => a.id !== actionId);
      }
      return [...prev, { id: actionId, coins: 10 }];
    });
  };

  const updateActionCoins = (actionId: number, coins: number) => {
    setSelectedActions(prev => 
      prev.map(a => a.id === actionId ? { ...a, coins } : a)
    );
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
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">Campanhas</h1>
            <p className="text-zinc-500 dark:text-zinc-400">Gerencie as campanhas e suas metas.</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => fetchCampaigns(currentPage, searchTerm)}
              className="bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 p-2 rounded-xl text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-all"
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
                Nova Campanha
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
              className="w-full pl-10 pr-4 py-2 border border-zinc-200 dark:border-zinc-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-500"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {/* Campaigns List */}
        {loading && campaigns.length === 0 ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
          </div>
        ) : error ? (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 p-4 rounded-xl text-center">
            {error}
            <button onClick={() => fetchCampaigns(currentPage, searchTerm)} className="block mx-auto mt-2 text-sm font-semibold hover:underline">
              Tentar novamente
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4">
              {campaigns.map((campaign) => {
                const typeLabel = campaignTypeLabels[campaign.type] || campaign.type;
                const typeColor = campaignTypeColors[campaign.type] || 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300';

                return (
                  <motion.div
                    key={campaign.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white dark:bg-zinc-900 p-6 rounded-2xl shadow-sm border border-zinc-100 dark:border-zinc-800 hover:shadow-md transition-all duration-200"
                  >
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="flex items-start gap-4 flex-1">
                        <div className="bg-emerald-100 dark:bg-emerald-900/30 p-3 rounded-xl">
                          <Target className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-bold text-lg text-zinc-900 dark:text-white">{campaign.name}</h3>
                            <span className={`px-2 py-1 rounded-full text-xs font-bold ${typeColor}`}>
                              {typeLabel}
                            </span>
                            {campaign.is_active ? (
                              <span className="px-2 py-1 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 rounded-full text-xs font-bold">
                                ATIVA
                              </span>
                            ) : (
                              <span className="px-2 py-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-full text-xs font-bold">
                                INATIVA
                              </span>
                            )}
                          </div>
                          
                          <div className="flex flex-wrap gap-4 mt-3 text-sm">
                            <div className="flex items-center gap-1.5 text-zinc-600 dark:text-zinc-400">
                              <TrendingUp size={16} className="text-emerald-500" />
                              <span className="text-zinc-500 dark:text-zinc-500">Meta:</span>
                              <span className="font-semibold text-zinc-900 dark:text-white">{formatCurrency(campaign.goal)}</span>
                            </div>
                            <div className="flex items-center gap-1.5 text-zinc-600 dark:text-zinc-400">
                              <Calendar size={16} className="text-blue-500" />
                              <span className="text-zinc-500 dark:text-zinc-500">Período:</span>
                              <span className="font-medium text-zinc-900 dark:text-white">
                                {formatDate(campaign.start_date)} até {formatDate(campaign.end_date)}
                              </span>
                            </div>
                            {campaign.users && campaign.users.length > 0 && (
                              <div className="flex items-center gap-1.5 text-zinc-600 dark:text-zinc-400">
                                <Users size={16} className="text-purple-500" />
                                <span className="text-zinc-500 dark:text-zinc-500">Participantes:</span>
                                <span className="font-medium text-zinc-900 dark:text-white">{campaign.users.length}</span>
                              </div>
                            )}
                            {campaign.actions && campaign.actions.length > 0 && (
                              <div className="flex items-center gap-1.5 text-zinc-600 dark:text-zinc-400">
                                <Coins size={16} className="text-amber-500" />
                                <span className="text-zinc-500 dark:text-zinc-500">Ações:</span>
                                <span className="font-medium text-zinc-900 dark:text-white">{campaign.actions.length}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {isAdmin && (
                          <>
                            <button
                              onClick={() => handleOpenModal(campaign)}
                              className="p-2 text-zinc-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-lg transition-colors"
                              title="Editar"
                            >
                              <Edit2 size={18} />
                            </button>
                            <button
                              onClick={() => handleDelete(campaign)}
                              disabled={deletingId === campaign.id}
                              className="p-2 text-zinc-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors disabled:opacity-50"
                              title="Excluir"
                            >
                              {deletingId === campaign.id ? <Loader2 size={18} className="animate-spin" /> : <Trash2 size={18} />}
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })}

              {campaigns.length === 0 && (
                <div className="text-center py-12 bg-white dark:bg-zinc-900 rounded-2xl border border-dashed border-zinc-200 dark:border-zinc-800 transition-colors duration-200">
                  <Target className="w-12 h-12 text-zinc-300 dark:text-zinc-600 mx-auto mb-3" />
                  <h3 className="text-lg font-medium text-zinc-900 dark:text-white">Nenhuma campanha encontrada</h3>
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
                className="bg-white dark:bg-zinc-900 rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden border border-zinc-200 dark:border-zinc-800 max-h-[90vh] flex flex-col"
              >
                <div className="p-6 border-b border-zinc-100 dark:border-zinc-800 flex justify-between items-center bg-zinc-50/50 dark:bg-zinc-800/50">
                  <h2 className="text-xl font-bold text-zinc-900 dark:text-white">
                    {editingCampaign ? 'Editar Campanha' : 'Nova Campanha'}
                  </h2>
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
                        ? 'bg-white dark:bg-zinc-800 text-emerald-600 dark:text-emerald-400 border-b-2 border-emerald-500'
                        : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200'
                    }`}
                  >
                    Dados Básicos
                  </button>
                  <button
                    onClick={() => setActiveTab('users')}
                    className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                      activeTab === 'users'
                        ? 'bg-white dark:bg-zinc-800 text-emerald-600 dark:text-emerald-400 border-b-2 border-emerald-500'
                        : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200'
                    }`}
                  >
                    Usuários ({selectedUsers.length})
                  </button>
                  <button
                    onClick={() => setActiveTab('actions')}
                    className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                      activeTab === 'actions'
                        ? 'bg-white dark:bg-zinc-800 text-emerald-600 dark:text-emerald-400 border-b-2 border-emerald-500'
                        : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200'
                    }`}
                  >
                    Ações ({selectedActions.length})
                  </button>
                  <button
                    onClick={() => setActiveTab('products')}
                    className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                      activeTab === 'products'
                        ? 'bg-white dark:bg-zinc-800 text-emerald-600 dark:text-emerald-400 border-b-2 border-emerald-500'
                        : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200'
                    }`}
                  >
                    Produtos ({selectedProducts.length})
                  </button>
                </div>

                {/* Tab Content */}
                <div className="flex-1 overflow-y-auto p-6">
                  {activeTab === 'basic' && (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Nome *</label>
                        <input
                          type="text"
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          className={`w-full p-2.5 border rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white placeholder-zinc-400 ${
                            formErrors.name ? 'border-red-500 focus:ring-red-500' : 'border-zinc-300 dark:border-zinc-600'
                          }`}
                          placeholder="Ex: Black Friday"
                        />
                        {formErrors.name && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{formErrors.name}</p>}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Tipo *</label>
                        <select
                          value={formData.type}
                          onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                          className="w-full p-2.5 border border-zinc-300 dark:border-zinc-600 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white"
                        >
                          <option value="sales">Vendas</option>
                          <option value="engagement">Engajamento</option>
                          <option value="retention">Retenção</option>
                          <option value="acquisition">Aquisição</option>
                          <option value="loyalty">Fidelização</option>
                        </select>
                        {formErrors.type && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{formErrors.type}</p>}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Meta (R$) *</label>
                        <input
                          type="text"
                          value={formData.goal}
                          onChange={(e) => setFormData({ ...formData, goal: e.target.value })}
                          className={`w-full p-2.5 border rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white placeholder-zinc-400 ${
                            formErrors.goal ? 'border-red-500 focus:ring-red-500' : 'border-zinc-300 dark:border-zinc-600'
                          }`}
                          placeholder="Ex: 50000.00"
                        />
                        {formErrors.goal && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{formErrors.goal}</p>}
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Data de Início *</label>
                          <input
                            type="date"
                            value={formData.start_date}
                            onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                            className={`w-full p-2.5 border rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white ${
                              formErrors.start_date ? 'border-red-500 focus:ring-red-500' : 'border-zinc-300 dark:border-zinc-600'
                            }`}
                          />
                          {formErrors.start_date && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{formErrors.start_date}</p>}
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Data de Término *</label>
                          <input
                            type="date"
                            value={formData.end_date}
                            onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                            className={`w-full p-2.5 border rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white ${
                              formErrors.end_date ? 'border-red-500 focus:ring-red-500' : 'border-zinc-300 dark:border-zinc-600'
                            }`}
                          />
                          {formErrors.end_date && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{formErrors.end_date}</p>}
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Status</label>
                        <div className="flex gap-4">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="radio"
                              name="is_active"
                              value="1"
                              checked={formData.is_active === '1'}
                              onChange={(e) => setFormData({ ...formData, is_active: e.target.value })}
                              className="w-4 h-4 text-emerald-600 focus:ring-emerald-500"
                            />
                            <span className="text-sm text-zinc-700 dark:text-zinc-300">Ativa</span>
                          </label>
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="radio"
                              name="is_active"
                              value="0"
                              checked={formData.is_active === '0'}
                              onChange={(e) => setFormData({ ...formData, is_active: e.target.value })}
                              className="w-4 h-4 text-red-600 focus:ring-red-500"
                            />
                            <span className="text-sm text-zinc-700 dark:text-zinc-300">Inativa</span>
                          </label>
                        </div>
                      </div>
                    </div>
                  )}

                  {activeTab === 'users' && (
                    <div className="space-y-3">
                      <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-4">
                        Selecione os usuários que participarão da campanha:
                      </p>
                      {loadingAux ? (
                        <div className="flex justify-center py-8">
                          <Loader2 className="w-6 h-6 text-emerald-600 animate-spin" />
                        </div>
                      ) : users.length === 0 ? (
                        <p className="text-center text-zinc-500 dark:text-zinc-400 py-8">Nenhum usuário encontrado.</p>
                      ) : (
                        <div className="grid gap-2 max-h-80 overflow-y-auto">
                          {users.map((user) => (
                            <button
                              key={user.id}
                              onClick={() => toggleUser(user.id)}
                              className={`flex items-center justify-between p-3 rounded-lg border transition-all ${
                                selectedUsers.includes(user.id)
                                  ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-500'
                                  : 'bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 hover:border-emerald-300'
                              }`}
                            >
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-zinc-100 dark:bg-zinc-700 rounded-full flex items-center justify-center text-zinc-500 dark:text-zinc-400">
                                  {user.name.charAt(0).toUpperCase()}
                                </div>
                                <div className="text-left">
                                  <p className="font-medium text-sm text-zinc-900 dark:text-white">{user.name}</p>
                                  <p className="text-xs text-zinc-500 dark:text-zinc-400">{user.email}</p>
                                </div>
                              </div>
                              {selectedUsers.includes(user.id) && (
                                <Check size={20} className="text-emerald-600" />
                              )}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {activeTab === 'actions' && (
                    <div className="space-y-3">
                      <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-4">
                        Selecione as ações e defina quantas moedas serão ganhas:
                      </p>
                      <div className="grid gap-3 max-h-80 overflow-y-auto">
                        {ENGAGEMENT_ACTIONS.map((action) => {
                          const isSelected = selectedActions.find(a => a.id === action.id);
                          return (
                            <div
                              key={action.id}
                              className={`flex items-center justify-between p-3 rounded-lg border transition-all ${
                                isSelected
                                  ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-500'
                                  : 'bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700'
                              }`}
                            >
                              <button
                                onClick={() => toggleAction(action.id)}
                                className="flex items-center gap-3 flex-1 text-left"
                              >
                                <div className={`w-5 h-5 rounded border flex items-center justify-center ${
                                  isSelected
                                    ? 'bg-amber-500 border-amber-500'
                                    : 'border-zinc-300 dark:border-zinc-600'
                                }`}>
                                  {isSelected && <Check size={14} className="text-white" />}
                                </div>
                                <div>
                                  <p className="font-medium text-sm text-zinc-900 dark:text-white">
                                    {actionLabels[action.name] || action.name.replace(/_/g, ' ')}
                                  </p>
                                </div>
                              </button>
                              {isSelected && (
                                <div className="flex items-center gap-2">
                                  <Coins size={16} className="text-amber-500" />
                                  <input
                                    type="number"
                                    min="0"
                                    value={selectedActions.find(a => a.id === action.id)?.coins || 10}
                                    onChange={(e) => updateActionCoins(action.id, parseInt(e.target.value) || 0)}
                                    onClick={(e) => e.stopPropagation()}
                                    className="w-20 p-1.5 border border-zinc-300 dark:border-zinc-600 rounded-lg text-sm bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white"
                                  />
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {activeTab === 'products' && (
                    <div className="space-y-3">
                      <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-4">
                        Selecione os produtos relacionados à campanha:
                      </p>
                      {loadingAux ? (
                        <div className="flex justify-center py-8">
                          <Loader2 className="w-6 h-6 text-emerald-600 animate-spin" />
                        </div>
                      ) : products.length === 0 ? (
                        <p className="text-center text-zinc-500 dark:text-zinc-400 py-8">Nenhum produto encontrado.</p>
                      ) : (
                        <div className="grid gap-2 max-h-80 overflow-y-auto">
                          {products.map((product) => (
                            <button
                              key={product.id}
                              onClick={() => toggleProduct(product.id)}
                              className={`flex items-center justify-between p-3 rounded-lg border transition-all ${
                                selectedProducts.includes(product.id)
                                  ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-500'
                                  : 'bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 hover:border-blue-300'
                              }`}
                            >
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center text-blue-600 dark:text-blue-400">
                                  <ShoppingBag size={20} />
                                </div>
                                <div className="text-left">
                                  <p className="font-medium text-sm text-zinc-900 dark:text-white">{product.name}</p>
                                  {product.description && (
                                    <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate max-w-xs">{product.description}</p>
                                  )}
                                </div>
                              </div>
                              {selectedProducts.includes(product.id) && (
                                <Check size={20} className="text-blue-600" />
                              )}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Footer Actions */}
                <div className="p-6 border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/50 flex gap-3">
                  {activeTab !== 'basic' && (
                    <button
                      type="button"
                      onClick={() => setActiveTab(prev => {
                        if (prev === 'users') return 'basic';
                        if (prev === 'actions') return 'users';
                        if (prev === 'products') return 'actions';
                        return 'basic';
                      })}
                      className="px-4 py-2.5 border border-zinc-300 dark:border-zinc-600 text-zinc-700 dark:text-zinc-300 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors font-medium"
                    >
                      Voltar
                    </button>
                  )}
                  {activeTab !== 'products' ? (
                    <button
                      type="button"
                      onClick={() => setActiveTab(prev => {
                        if (prev === 'basic') return 'users';
                        if (prev === 'users') return 'actions';
                        if (prev === 'actions') return 'products';
                        return 'products';
                      })}
                      className="flex-1 px-4 py-2.5 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-colors font-medium"
                    >
                      Próximo
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleSubmit}
                      disabled={saving}
                      className="flex-1 px-4 py-2.5 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
                    >
                      {saving ? 'Salvando...' : 'Salvar'}
                    </button>
                  )}
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </Layout>
  );
};
