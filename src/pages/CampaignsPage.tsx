import React, { useState, useEffect, useCallback } from 'react';
import { Layout } from '../components/Layout';
import { Search, Loader2, RefreshCw, ChevronLeft, ChevronRight, Plus, Edit2, Trash2, Target, Calendar, TrendingUp, X, Users, ShoppingBag, Trophy, Check, Coins } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../context/AuthContext';
import { Campaign, User as UserType, Product, CampaignRanking, CampaignType, CampaignStatus } from '../types';
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

const campaignTypeLabels: Record<CampaignType, string> = {
  sales: 'Vendas',
  engagement: 'Engajamento',
};

const campaignTypeColors: Record<CampaignType, string> = {
  sales: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  engagement: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
};

const campaignStatusLabels: Record<CampaignStatus, string> = {
  ativa: 'Ativa',
  pausada: 'Pausada',
  finalizada: 'Finalizada',
};

const campaignStatusColors: Record<CampaignStatus, string> = {
  ativa: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400',
  pausada: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400',
  finalizada: 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-400',
};

// Ações de engajamento com valores de coins conforme especificação
const ENGAGEMENT_ACTIONS = [
  { id: 1, name: 'login_daily' },      // 10 coins
  { id: 2, name: 'share_post' },       // 20 coins
  { id: 3, name: 'comment_post' },     // 10 coins
  { id: 4, name: 'like_post' },        // 20 coins
  { id: 5, name: 'send_feedback' },    // 10 coins
  { id: 6, name: 'answer_survey' },    // 5 coins
];

const actionLabels: Record<string, string> = {
  login_daily: 'Login Diário',
  share_post: 'Compartilhar Post',
  comment_post: 'Comentar Post',
  like_post: 'Curtir Post',
  send_feedback: 'Enviar Feedback',
  answer_survey: 'Responder Pesquisa',
};

const defaultActionCoins: Record<string, number> = {
  login_daily: 10,
  share_post: 20,
  comment_post: 10,
  like_post: 20,
  send_feedback: 10,
  answer_survey: 5,
};

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
    type: 'sales' as CampaignType,
    goal: '',
    start_date: '',
    end_date: '',
    status: 'ativa' as CampaignStatus,
  });

  // Seleções
  const [selectedUsers, setSelectedUsers] = useState<number[]>([]);
  const [selectedActions, setSelectedActions] = useState<{ id: number; coins: number }[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<number[]>([]);

  // Paginação e filtros para usuários
  const [usersPage, setUsersPage] = useState(1);
  const [usersTotalPages, setUsersTotalPages] = useState(1);
  const [userSearch, setUserSearch] = useState('');
  const [userFilterType, setUserFilterType] = useState<'name' | 'email'>('name');

  // Paginação e filtros para produtos
  const [productsPage, setProductsPage] = useState(1);
  const [productsTotalPages, setProductsTotalPages] = useState(1);
  const [productSearch, setProductSearch] = useState('');
  const [productFilterType, setProductFilterType] = useState<'name' | 'barcode'>('name');

  // Ranking
  const [rankingModal, setRankingModal] = useState<{
    isOpen: boolean;
    campaign: Campaign | null;
    ranking: CampaignRanking[];
    loading: boolean;
  }>({
    isOpen: false,
    campaign: null,
    ranking: [],
    loading: false,
  });

  const isAdmin = currentUser?.user_type_id === 1;

  // Limpa usuários inválidos quando muda o tipo de campanha para engagement
  useEffect(() => {
    if (formData.type === 'engagement' && selectedUsers.length > 0) {
      const validUsers = selectedUsers.filter(userId => {
        const user = users.find(u => u.id === userId);
        return user?.user_type_id === 2;
      });
      if (validUsers.length !== selectedUsers.length) {
        setSelectedUsers(validUsers);
        addToast('warning', 'Usuários incompatíveis foram removidos automaticamente.');
      }
    }
  }, [formData.type]);

  const fetchAuxiliaryData = useCallback(async () => {
    if (!token) return;
    setLoadingAux(true);
    try {
      // Carregar primeira página de usuários e produtos (10 itens cada)
      const [usersData, productsData] = await Promise.all([
        api.getAllUsers(token, 1, 10).catch(() => null),
        api.getProducts(token, 1, 10).catch(() => null),
      ]);

      if (usersData?.data) {
        setUsers(usersData.data);
        setUsersTotalPages(usersData.meta?.last_page || usersData.last_page || 1);
        setUsersPage(usersData.meta?.current_page || usersData.current_page || 1);
      }
      if (productsData?.data) {
        setProducts(productsData.data);
        setProductsTotalPages(productsData.meta?.last_page || productsData.last_page || 1);
        setProductsPage(productsData.meta?.current_page || productsData.current_page || 1);
      }
    } catch (error) {
      console.error('Error fetching auxiliary data:', error);
    } finally {
      setLoadingAux(false);
    }
  }, [token]);

  // Buscar usuários com paginação e filtro
  const fetchUsers = useCallback(async (page = 1, search = '', filterType: 'name' | 'email' = 'name') => {
    if (!token) return;
    try {
      const response = await api.getUsers(token, page, search, filterType);
      setUsers(response.data || []);
      setUsersTotalPages(response.meta?.last_page || response.last_page || 1);
      setUsersPage(response.meta?.current_page || response.current_page || 1);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  }, [token]);

  // Buscar produtos com paginação e filtro
  const fetchProducts = useCallback(async (page = 1, search = '', filterType: 'name' | 'barcode' = 'name') => {
    if (!token) return;
    try {
      const response = await api.getProductsPaginated(token, page, search, filterType);
      setProducts(response.data || []);
      setProductsTotalPages(response.meta?.last_page || response.last_page || 1);
      setProductsPage(response.meta?.current_page || response.current_page || 1);
    } catch (error) {
      console.error('Error fetching products:', error);
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
      // Fallback para campanhas antigas que usam is_active
      const status = campaign.status || (campaign.is_active ? 'ativa' : 'pausada');
      setFormData({
        name: campaign.name,
        type: campaign.type,
        goal: campaign.type === 'sales' ? campaign.goal : '',
        start_date: campaign.start_date,
        end_date: campaign.end_date,
        status: status,
      });
      // Carregar seleções existentes - filtrar usuários inválidos para engagement
      const validUsers = campaign.type === 'engagement'
        ? (campaign.users?.filter(u => u.user_type_id === 2).map(u => u.id) || [])
        : (campaign.users?.map(u => u.id) || []);
      setSelectedUsers(validUsers);
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
        status: 'ativa',
      });
      setSelectedUsers([]);
      setSelectedProducts([]);
      setSelectedActions([]);
    }
    setIsModalOpen(true);
    fetchAuxiliaryData();
    // Inicializar paginação
    setUsersPage(1);
    setProductsPage(1);
    setUserSearch('');
    setProductSearch('');
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
      status: 'ativa',
    });
    setSelectedUsers([]);
    setSelectedProducts([]);
    setSelectedActions([]);
    setFormErrors({});
  };

  const handleSubmit = async () => {
    if (!token) return;
    setFormErrors({});

    // Validações específicas para edição (apenas o essencial)
    if (editingCampaign) {
      // Validações apenas para campanhas de engajamento
      if (editingCampaign.type === 'engagement') {
        // Não pode ter products (regra de negócio)
        if (selectedProducts.length > 0) {
          addToast('error', 'Campanhas de engajamento não podem ter produtos. Remova os produtos selecionados.');
          setActiveTab('products');
          return;
        }
        // Valida user_type_id = 2 para engagement
        const usersWithInvalidType = users.filter(
          u => selectedUsers.includes(u.id) && u.user_type_id !== 2
        );
        if (usersWithInvalidType.length > 0) {
          addToast('error', `Existem ${usersWithInvalidType.length} usuário(s) incompatível(eis) selecionados. Apenas usuários comuns (user_type_id = 2) podem participar de campanhas de engajamento.`);
          setActiveTab('users');
          return;
        }
      }
      // Para sales e engagement na edição: permite atualizar qualquer campo sem validações obrigatórias de quantidade
    } else {
      // Validações para CRIAÇÃO (mantém todas as regras)
      // Obrigatório ao menos 1 usuário
      if (selectedUsers.length === 0) {
        addToast('error', 'É obrigatório selecionar pelo menos 1 usuário.');
        setActiveTab('users');
        return;
      }

      // Regras por tipo de campanha
      if (formData.type === 'sales') {
        if (selectedProducts.length === 0) {
          addToast('error', 'Campanhas de vendas exigem pelo menos 1 produto vinculado.');
          setActiveTab('products');
          return;
        }
      }

      if (formData.type === 'engagement') {
        if (selectedActions.length === 0) {
          addToast('error', 'Campanhas de engajamento exigem pelo menos 1 ação vinculada.');
          setActiveTab('actions');
          return;
        }
        if (selectedProducts.length > 0) {
          addToast('error', 'Campanhas de engajamento não podem ter produtos.');
          setActiveTab('products');
          return;
        }
        const usersWithInvalidType = users.filter(
          u => selectedUsers.includes(u.id) && u.user_type_id !== 2
        );
        if (usersWithInvalidType.length > 0) {
          addToast('error', `Existem ${usersWithInvalidType.length} usuário(s) incompatível(eis). Apenas usuários comuns podem participar de campanhas de engajamento.`);
          setActiveTab('users');
          return;
        }
      }
    }

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

    // Validação adicional: end_date deve ser maior que start_date (somente criação)
    if (!editingCampaign && formData.end_date < formData.start_date) {
      setFormErrors({ end_date: 'Data de término deve ser maior que data de início' });
      addToast('error', 'Data de término deve ser maior que data de início.');
      return;
    }

    setSaving(true);
    try {
      const dataToSave: any = {};

      // Na edição, envia apenas campos alterados
      if (editingCampaign) {
        // Envia apenas se houver valor (não vazio)
        if (formData.name?.trim()) {
          dataToSave.name = formData.name.trim();
        }
        
        // Sempre envia is_active na edição (status pode ser alterado)
        dataToSave.is_active = formData.status === 'ativa';
        
        // Envia users apenas se houver selecionados
        if (selectedUsers.length > 0) {
          dataToSave.users = selectedUsers;
        }
        
        // Envia conforme o tipo da campanha
        if (editingCampaign.type === 'sales') {
          // Envia products apenas se houver selecionados
          if (selectedProducts.length > 0) {
            dataToSave.products = selectedProducts;
          }
        } else if (editingCampaign.type === 'engagement') {
          // Envia actions apenas se houver selecionadas
          if (selectedActions.length > 0) {
            dataToSave.actions = selectedActions.map(a => ({ id: a.id, coins: a.coins }));
          }
        }
      } else {
        // Na criação, envia todos os campos obrigatórios
        dataToSave.name = formData.name;
        dataToSave.type = formData.type;
        dataToSave.is_active = formData.status === 'ativa';
        dataToSave.users = selectedUsers;
        
        // Goal apenas para vendas
        if (formData.type === 'sales') {
          dataToSave.goal = parseFloat(formData.goal);
          dataToSave.start_date = formData.start_date;
          dataToSave.end_date = formData.end_date;
          dataToSave.products = selectedProducts;
        } else if (formData.type === 'engagement') {
          dataToSave.start_date = formData.start_date;
          dataToSave.end_date = formData.end_date;
          dataToSave.actions = selectedActions.map(a => ({ id: a.id, coins: a.coins }));
        }
      }

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
      
      // Tenta extrair a mensagem de erro da resposta
      let errorMessage = 'Erro ao excluir campanha.';
      
      // Verifica diferentes formatos de erro
      if (error.response?.data) {
        const data = error.response.data;
        // Formato: { errors: { campaign: [...] } }
        if (data.errors?.campaign?.[0]?.includes('Active campaigns cannot be deleted')) {
          errorMessage = 'Não é possível excluir uma campanha ativa. Desative a campanha primeiro.';
        }
        // Formato: { message: '...' }
        else if (data.message?.includes('Active campaigns')) {
          errorMessage = 'Não é possível excluir uma campanha ativa. Desative a campanha primeiro.';
        }
        // Usa mensagem da API se disponível
        else if (data.message) {
          errorMessage = data.message;
        }
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      addToast('error', errorMessage);
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

  const handleOpenRanking = async (campaign: Campaign) => {
    if (!token) return;
    setRankingModal({ isOpen: true, campaign, ranking: [], loading: true });
    try {
      // Se a campanha já tem podium, usa ele diretamente
      if (campaign.podium && campaign.podium.length > 0) {
        setRankingModal(prev => ({ ...prev, ranking: campaign.podium, loading: false }));
      } else {
        // Busca todas as campanhas com podium e filtra pela ID
        const response = await api.getCampaignsWithPodium(token);
        const campaignWithData = response.data.find(c => c.id === campaign.id);
        setRankingModal(prev => ({ 
          ...prev, 
          ranking: campaignWithData?.podium || [], 
          loading: false 
        }));
      }
    } catch (error: any) {
      console.error('Error fetching ranking:', error);
      addToast('error', error.message || 'Erro ao carregar ranking.');
      setRankingModal(prev => ({ ...prev, loading: false }));
    }
  };

  const handleCloseRanking = () => {
    setRankingModal({ isOpen: false, campaign: null, ranking: [], loading: false });
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
      const action = ENGAGEMENT_ACTIONS.find(a => a.id === actionId);
      const defaultCoins = action ? defaultActionCoins[action.name] || 10 : 10;
      return [...prev, { id: actionId, coins: defaultCoins }];
    });
  };

  const updateActionCoins = (actionId: number, coins: number) => {
    setSelectedActions(prev =>
      prev.map(a => a.id === actionId ? { ...a, coins } : a)
    );
  };

  // Formata valor para moeda brasileira (BRL)
  const formatCurrencyInput = (value: string) => {
    // Remove tudo que não é dígito
    const digits = value.replace(/\D/g, '');
    // Converte para número e divide por 100 para ter os centavos
    const numberValue = parseInt(digits) / 100;
    // Formata como moeda brasileira
    return numberValue.toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const handleGoalChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const formatted = formatCurrencyInput(value);
    // Converte de volta para formato numérico com ponto decimal
    const numericValue = formatted.replace(/\./g, '').replace(',', '.');
    setFormData({ ...formData, goal: numericValue });
  };

  // Obtém data mínima (hoje) no formato YYYY-MM-DD
  const getMinDate = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
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
                // Fallback para campanhas antigas que usam is_active
                const statusFromCampaign = campaign.status || (campaign.is_active ? 'ativa' : 'pausada');
                const statusLabel = campaignStatusLabels[statusFromCampaign] || statusFromCampaign;
                const statusColor = campaignStatusColors[statusFromCampaign] || 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-400';

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
                            <span className={`px-2 py-1 rounded-full text-xs font-bold ${statusColor}`}>
                              {statusLabel.toUpperCase()}
                            </span>
                          </div>

                          <div className="flex flex-wrap gap-4 mt-3 text-sm">
                            {/* Meta apenas para campanhas de vendas */}
                            {campaign.type === 'sales' && (
                              <div className="flex items-center gap-1.5 text-zinc-600 dark:text-zinc-400">
                                <TrendingUp size={16} className="text-emerald-500" />
                                <span className="text-zinc-500 dark:text-zinc-500">Meta:</span>
                                <span className="font-semibold text-zinc-900 dark:text-white">{formatCurrency(campaign.goal)}</span>
                              </div>
                            )}
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

                      {/* Podium / Ranking Section */}
                      {campaign.podium && campaign.podium.length > 0 && (
                        <div className="w-full md:w-auto mt-4 md:mt-0">
                          <div className="flex items-center gap-2 mb-2">
                            <Trophy className="w-4 h-4 text-amber-500" />
                            <span className="text-xs font-semibold text-zinc-600 dark:text-zinc-400">
                              Top {campaign.podium.length}
                            </span>
                          </div>
                          <div className="space-y-1">
                            {campaign.podium.slice(0, 3).map((member, index) => {
                              const medalColors = [
                                'text-amber-500',  // 1º
                                'text-zinc-400',   // 2º
                                'text-amber-600',  // 3º
                              ];
                              const bgColors = [
                                'bg-amber-50 dark:bg-amber-900/20',
                                'bg-zinc-50 dark:bg-zinc-800/50',
                                'bg-amber-50 dark:bg-amber-900/20',
                              ];
                              
                              return (
                                <div
                                  key={member.user_id}
                                  className={`flex items-center gap-2 p-2 rounded-lg ${bgColors[index]}`}
                                >
                                  <div className={`w-5 h-5 flex items-center justify-center font-bold text-xs ${medalColors[index]}`}>
                                    {index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉'}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-xs font-medium text-zinc-900 dark:text-white truncate">
                                      {member.name}
                                    </p>
                                    {member.store && (
                                      <p className="text-[10px] text-zinc-500 dark:text-zinc-400 truncate">
                                        {member.store.name}
                                      </p>
                                    )}
                                  </div>
                                  {campaign.type === 'sales' && member.sales_amount !== null && (
                                    <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                                      {formatCurrency(String(member.sales_amount))}
                                    </span>
                                  )}
                                  {campaign.type === 'engagement' && member.coins_total !== null && (
                                    <span className="text-xs font-semibold text-amber-600 dark:text-amber-400">
                                      {member.coins_total} 🪙
                                    </span>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      <div className="flex items-center gap-2">
                        {/* Botão de ranking: apenas para campanhas ativas */}
                        {statusFromCampaign === 'ativa' && (
                          <button
                            onClick={() => handleOpenRanking(campaign)}
                            className="p-2 text-zinc-400 hover:text-amber-600 dark:hover:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20 rounded-lg transition-colors"
                            title="Ver Ranking Completo"
                          >
                            <Trophy size={18} />
                          </button>
                        )}
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
                  <div>
                    <h2 className="text-xl font-bold text-zinc-900 dark:text-white">
                      {editingCampaign ? 'Editar Campanha' : 'Nova Campanha'}
                    </h2>
                    {editingCampaign && (
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                        Altere nome, status e vínculos
                      </p>
                    )}
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
                  {/* Aba de ações: apenas para engajamento (criação e update) */}
                  {(!editingCampaign && formData.type === 'engagement') || (editingCampaign?.type === 'engagement') ? (
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
                  ) : null}
                  {/* Aba de produtos: apenas para vendas (criação e update) */}
                  {(!editingCampaign && formData.type === 'sales') || (editingCampaign?.type === 'sales') ? (
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
                  ) : null}
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

                      {/* Campos somente leitura na edição */}
                      {editingCampaign && (
                        <div className="bg-zinc-50 dark:bg-zinc-800/50 p-4 rounded-xl border border-zinc-200 dark:border-zinc-700">
                          <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-3">
                            ℹ️ Os campos abaixo não podem ser alterados na edição
                          </p>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="block text-xs text-zinc-500 dark:text-zinc-400 mb-1">Tipo</label>
                              <p className="text-sm font-medium text-zinc-900 dark:text-white capitalize">
                                {campaignTypeLabels[editingCampaign.type] || editingCampaign.type}
                              </p>
                            </div>
                            <div>
                              <label className="block text-xs text-zinc-500 dark:text-zinc-400 mb-1">Meta</label>
                              <p className="text-sm font-medium text-zinc-900 dark:text-white">
                                {formatCurrency(editingCampaign.goal)}
                              </p>
                            </div>
                            <div>
                              <label className="block text-xs text-zinc-500 dark:text-zinc-400 mb-1">Início</label>
                              <p className="text-sm font-medium text-zinc-900 dark:text-white">
                                {formatDate(editingCampaign.start_date)}
                              </p>
                            </div>
                            <div>
                              <label className="block text-xs text-zinc-500 dark:text-zinc-400 mb-1">Término</label>
                              <p className="text-sm font-medium text-zinc-900 dark:text-white">
                                {formatDate(editingCampaign.end_date)}
                              </p>
                            </div>
                          </div>
                        </div>
                      )}

                      {!editingCampaign && (
                        <>
                          <div>
                            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Tipo *</label>
                            <select
                              value={formData.type}
                              onChange={(e) => setFormData({ ...formData, type: e.target.value as CampaignType })}
                              className="w-full p-2.5 border border-zinc-300 dark:border-zinc-600 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white"
                            >
                              <option value="sales">Vendas</option>
                              <option value="engagement">Engajamento</option>
                            </select>
                            {formErrors.type && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{formErrors.type}</p>}
                          </div>

                          {/* Meta apenas para campanhas de vendas */}
                          {formData.type === 'sales' && (
                            <div>
                              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Meta (R$) *</label>
                              <input
                                type="text"
                                value={formData.goal ? formatCurrencyInput(formData.goal.replace(/\./g, '').replace(',', '.')) : ''}
                                onChange={handleGoalChange}
                                className={`w-full p-2.5 border rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white placeholder-zinc-400 ${
                                  formErrors.goal ? 'border-red-500 focus:ring-red-500' : 'border-zinc-300 dark:border-zinc-600'
                                }`}
                                placeholder="R$ 0,00"
                              />
                              {formErrors.goal && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{formErrors.goal}</p>}
                            </div>
                          )}

                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Data de Início *</label>
                              <input
                                type="date"
                                value={formData.start_date}
                                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                                min={getMinDate()}
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
                                min={formData.start_date || getMinDate()}
                                className={`w-full p-2.5 border rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white ${
                                  formErrors.end_date ? 'border-red-500 focus:ring-red-500' : 'border-zinc-300 dark:border-zinc-600'
                                }`}
                              />
                              {formErrors.end_date && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{formErrors.end_date}</p>}
                            </div>
                          </div>
                        </>
                      )}

                      <div>
                        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Status</label>
                        <select
                          value={formData.status}
                          onChange={(e) => setFormData({ ...formData, status: e.target.value as CampaignStatus })}
                          className="w-full p-2.5 border border-zinc-300 dark:border-zinc-600 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white"
                        >
                          <option value="ativa">Ativa</option>
                          <option value="pausada">Pausada</option>
                          <option value="finalizada">Finalizada</option>
                        </select>
                      </div>
                    </div>
                  )}

                  {activeTab === 'users' && (
                    <div className="space-y-3">
                      {/* Verifica se é campanha de engajamento (edição ou criação) */}
                      {(editingCampaign?.type === 'engagement' || (!editingCampaign && formData.type === 'engagement')) && (
                        <>
                          {/* Aviso de usuários incompatíveis selecionados */}
                          {(() => {
                            const invalidUsers = users.filter(u => selectedUsers.includes(u.id) && u.user_type_id !== 2);
                            if (invalidUsers.length > 0) {
                              return (
                                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 mb-4">
                                  <p className="text-sm text-red-700 dark:text-red-400 font-semibold">
                                    ⚠️ {invalidUsers.length} usuário(s) incompatível(eis) selecionado(s):
                                  </p>
                                  <ul className="text-xs text-red-600 dark:text-red-400 mt-2 list-disc list-inside">
                                    {invalidUsers.map(u => (
                                      <li key={u.id}>{u.name} ({u.user_type})</li>
                                    ))}
                                  </ul>
                                  <button
                                    onClick={() => setSelectedUsers(prev => prev.filter(id => !invalidUsers.find(u => u.id === id)))}
                                    className="mt-3 text-xs font-medium text-red-700 dark:text-red-400 underline hover:no-underline"
                                  >
                                    Remover usuários incompatíveis
                                  </button>
                                </div>
                              );
                            }
                            return null;
                          })()}
                        </>
                      )}
                      <p className="text-sm text-zinc-500 dark:text-zinc-400">
                        Selecione os usuários que participarão da campanha:
                      </p>

                      {/* Filtros e busca de usuários */}
                      <div className="flex gap-2 mb-4">
                        <select
                          value={userFilterType}
                          onChange={(e) => setUserFilterType(e.target.value as 'name' | 'email')}
                          className="p-2.5 border border-zinc-300 dark:border-zinc-600 rounded-xl bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white text-sm"
                        >
                          <option value="name">Nome</option>
                          <option value="email">E-mail</option>
                        </select>
                        <input
                          type="text"
                          placeholder={`Buscar por ${userFilterType === 'name' ? 'nome' : 'e-mail'}...`}
                          value={userSearch}
                          onChange={(e) => setUserSearch(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && fetchUsers(usersPage, userSearch, userFilterType)}
                          className="flex-1 p-2.5 border border-zinc-300 dark:border-zinc-600 rounded-xl bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white text-sm"
                        />
                        <button
                          onClick={() => fetchUsers(usersPage, userSearch, userFilterType)}
                          className="p-2.5 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-colors"
                        >
                          <Search size={20} />
                        </button>
                      </div>

                      {loadingAux ? (
                        <div className="flex justify-center py-8">
                          <Loader2 className="w-6 h-6 text-emerald-600 animate-spin" />
                        </div>
                      ) : users.length === 0 ? (
                        <p className="text-center text-zinc-500 dark:text-zinc-400 py-8">Nenhum usuário encontrado.</p>
                      ) : (
                        <>
                          <div className="grid gap-2 max-h-60 overflow-y-auto">
                            {/* Filtra usuários: apenas user_type_id = 2 para engajamento */}
                            {(editingCampaign?.type === 'engagement' || (!editingCampaign && formData.type === 'engagement')
                              ? users.filter(u => u.user_type_id === 2)
                              : users
                            ).map((user) => (
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

                          {/* Paginação de usuários */}
                          {usersTotalPages > 1 && (
                            <div className="flex items-center justify-between mt-4 pt-4 border-t border-zinc-200 dark:border-zinc-700">
                              <button
                                onClick={() => fetchUsers(usersPage - 1, userSearch, userFilterType)}
                                disabled={usersPage === 1}
                                className="p-2 border border-zinc-300 dark:border-zinc-600 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed text-zinc-600 dark:text-zinc-400 text-sm"
                              >
                                Anterior
                              </button>
                              <span className="text-sm text-zinc-600 dark:text-zinc-400">
                                Página {usersPage} de {usersTotalPages}
                              </span>
                              <button
                                onClick={() => fetchUsers(usersPage + 1, userSearch, userFilterType)}
                                disabled={usersPage === usersTotalPages}
                                className="p-2 border border-zinc-300 dark:border-zinc-600 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed text-zinc-600 dark:text-zinc-400 text-sm"
                              >
                                Próxima
                              </button>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  )}

                  {activeTab === 'actions' && (
                    <div className="space-y-3">
                      <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-4">
                        {editingCampaign?.type === 'engagement'
                          ? 'Selecione as ações e defina quantas moedas serão ganhas (obrigatório para campanhas de engajamento):'
                          : 'Selecione as ações e defina quantas moedas serão ganhas:'}
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
                                    {actionLabels[action.name]} ({defaultActionCoins[action.name]} coins)
                                  </p>
                                </div>
                              </button>
                              {isSelected && (
                                <div className="flex items-center gap-2">
                                  <span className="text-xs text-zinc-500 dark:text-zinc-400">Coins:</span>
                                  <input
                                    type="number"
                                    min="0"
                                    value={selectedActions.find(a => a.id === action.id)?.coins || defaultActionCoins[action.name] || 10}
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
                        {editingCampaign?.type === 'sales'
                          ? 'Selecione os produtos relacionados à campanha (obrigatório para campanhas de vendas):'
                          : 'Selecione os produtos relacionados à campanha:'}
                      </p>

                      {/* Filtros e busca de produtos */}
                      <div className="flex gap-2 mb-4">
                        <select
                          value={productFilterType}
                          onChange={(e) => setProductFilterType(e.target.value as 'name' | 'barcode')}
                          className="p-2.5 border border-zinc-300 dark:border-zinc-600 rounded-xl bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white text-sm"
                        >
                          <option value="name">Nome</option>
                          <option value="barcode">Código de Barras</option>
                        </select>
                        <input
                          type="text"
                          placeholder={`Buscar por ${productFilterType === 'name' ? 'nome' : 'código de barras'}...`}
                          value={productSearch}
                          onChange={(e) => setProductSearch(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && fetchProducts(productsPage, productSearch, productFilterType)}
                          className="flex-1 p-2.5 border border-zinc-300 dark:border-zinc-600 rounded-xl bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white text-sm"
                        />
                        <button
                          onClick={() => fetchProducts(productsPage, productSearch, productFilterType)}
                          className="p-2.5 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-colors"
                        >
                          <Search size={20} />
                        </button>
                      </div>

                      {loadingAux ? (
                        <div className="flex justify-center py-8">
                          <Loader2 className="w-6 h-6 text-emerald-600 animate-spin" />
                        </div>
                      ) : products.length === 0 ? (
                        <p className="text-center text-zinc-500 dark:text-zinc-400 py-8">Nenhum produto encontrado.</p>
                      ) : (
                        <>
                          <div className="grid gap-2 max-h-60 overflow-y-auto">
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
                                    {product.barcode && (
                                      <p className="text-xs text-zinc-500 dark:text-zinc-400">Cód: {product.barcode}</p>
                                    )}
                                    {product.description && !product.barcode && (
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

                          {/* Paginação de produtos */}
                          {productsTotalPages > 1 && (
                            <div className="flex items-center justify-between mt-4 pt-4 border-t border-zinc-200 dark:border-zinc-700">
                              <button
                                onClick={() => fetchProducts(productsPage - 1, productSearch, productFilterType)}
                                disabled={productsPage === 1}
                                className="p-2 border border-zinc-300 dark:border-zinc-600 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed text-zinc-600 dark:text-zinc-400 text-sm"
                              >
                                Anterior
                              </button>
                              <span className="text-sm text-zinc-600 dark:text-zinc-400">
                                Página {productsPage} de {productsTotalPages}
                              </span>
                              <button
                                onClick={() => fetchProducts(productsPage + 1, productSearch, productFilterType)}
                                disabled={productsPage === productsTotalPages}
                                className="p-2 border border-zinc-300 dark:border-zinc-600 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed text-zinc-600 dark:text-zinc-400 text-sm"
                              >
                                Próxima
                              </button>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  )}
                </div>

                {/* Footer Actions */}
                <div className="p-6 border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/50 flex gap-3">
                  {/* Botão Voltar */}
                  {activeTab !== 'basic' && (
                    <button
                      type="button"
                      onClick={() => setActiveTab(prev => {
                        const isEngagement = editingCampaign?.type === 'engagement' || (!editingCampaign && formData.type === 'engagement');

                        if (prev === 'users') return 'basic';

                        // Para engajamento: actions → users
                        if (prev === 'actions') {
                          return 'users';
                        }

                        // Para vendas: products → users
                        if (prev === 'products') {
                          return 'users';
                        }

                        return 'basic';
                      })}
                      className="px-4 py-2.5 border border-zinc-300 dark:border-zinc-600 text-zinc-700 dark:text-zinc-300 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors font-medium"
                    >
                      Voltar
                    </button>
                  )}
                  {/* Botão Próximo/Salvar */}
                  {(() => {
                    const isEngagement = editingCampaign?.type === 'engagement' || (!editingCampaign && formData.type === 'engagement');
                    const isSales = editingCampaign?.type === 'sales' || (!editingCampaign && formData.type === 'sales');

                    // Para engajamento: basic → users → actions → salvar
                    if (isEngagement) {
                      if (activeTab === 'basic') {
                        return (
                          <button
                            type="button"
                            onClick={() => setActiveTab('users')}
                            className="flex-1 px-4 py-2.5 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-colors font-medium"
                          >
                            Próximo
                          </button>
                        );
                      }
                      if (activeTab === 'users') {
                        return (
                          <button
                            type="button"
                            onClick={() => setActiveTab('actions')}
                            className="flex-1 px-4 py-2.5 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-colors font-medium"
                          >
                            Próximo
                          </button>
                        );
                      }
                      // activeTab === 'actions' (última aba)
                      return (
                        <button
                          type="button"
                          onClick={handleSubmit}
                          disabled={saving}
                          className="flex-1 px-4 py-2.5 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
                        >
                          {saving ? 'Salvando...' : 'Salvar'}
                        </button>
                      );
                    }

                    // Para vendas: basic → users → products → salvar
                    if (isSales) {
                      if (activeTab === 'basic') {
                        return (
                          <button
                            type="button"
                            onClick={() => setActiveTab('users')}
                            className="flex-1 px-4 py-2.5 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-colors font-medium"
                          >
                            Próximo
                          </button>
                        );
                      }
                      if (activeTab === 'users') {
                        return (
                          <button
                            type="button"
                            onClick={() => setActiveTab('products')}
                            className="flex-1 px-4 py-2.5 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-colors font-medium"
                          >
                            Próximo
                          </button>
                        );
                      }
                      // activeTab === 'products' (última aba)
                      return (
                        <button
                          type="button"
                          onClick={handleSubmit}
                          disabled={saving}
                          className="flex-1 px-4 py-2.5 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
                        >
                          {saving ? 'Salvando...' : 'Salvar'}
                        </button>
                      );
                    }

                    return null;
                  })()}
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Ranking Modal */}
        <AnimatePresence>
          {rankingModal.isOpen && rankingModal.campaign && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white dark:bg-zinc-900 rounded-2xl shadow-xl w-full max-w-lg overflow-hidden border border-zinc-200 dark:border-zinc-800 max-h-[80vh] flex flex-col"
              >
                <div className="p-6 border-b border-zinc-100 dark:border-zinc-800 flex justify-between items-center bg-zinc-50/50 dark:bg-zinc-800/50">
                  <div>
                    <h2 className="text-xl font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                      <Trophy className="w-6 h-6 text-amber-500" />
                      Ranking da Campanha
                    </h2>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
                      {rankingModal.campaign.name}
                    </p>
                  </div>
                  <button onClick={handleCloseRanking} className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors">
                    <X size={24} />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6">
                  {rankingModal.loading ? (
                    <div className="flex justify-center py-12">
                      <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
                    </div>
                  ) : rankingModal.ranking.length === 0 ? (
                    <div className="text-center py-8">
                      <Trophy className="w-12 h-12 text-zinc-300 dark:text-zinc-600 mx-auto mb-3" />
                      <p className="text-zinc-500 dark:text-zinc-400">Nenhum dado de ranking disponível.</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {rankingModal.ranking.map((item, index) => {
                        const isTop3 = index < 3;
                        const medalColors = [
                          'bg-amber-400 text-amber-900',  // 1º
                          'bg-zinc-400 text-zinc-900',    // 2º
                          'bg-amber-600 text-amber-100',  // 3º
                        ];
                        
                        // Usa o nome do campo correto (user_name ou name)
                        const userName = item.user_name || item.name;
                        const userEmail = item.user_email;
                        const store = (item as any).store;
                        const salesAmount = (item as any).sales_amount;
                        const coinsTotal = (item as any).coins_total;

                        return (
                          <div
                            key={item.user_id}
                            className={`flex items-center gap-4 p-4 rounded-xl border transition-all ${
                              isTop3
                                ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800'
                                : 'bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700'
                            }`}
                          >
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${
                              isTop3 ? medalColors[index] : 'bg-zinc-100 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-400'
                            }`}>
                              {isTop3 ? (
                                <Trophy size={20} />
                              ) : (
                                item.position
                              )}
                            </div>
                            <div className="flex-1">
                              <p className="font-semibold text-zinc-900 dark:text-white">{userName}</p>
                              {store && (
                                <p className="text-xs text-zinc-500 dark:text-zinc-400">{store.name}</p>
                              )}
                              {userEmail && !store && (
                                <p className="text-xs text-zinc-500 dark:text-zinc-400">{userEmail}</p>
                              )}
                            </div>
                            <div className="text-right">
                              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                                {rankingModal.campaign?.type === 'sales' ? 'Valor Vendido' : 'Total de Coin(s)'}
                              </p>
                              <p className="font-bold text-lg text-zinc-900 dark:text-white">
                                {rankingModal.campaign?.type === 'sales'
                                  ? formatCurrency(String(salesAmount !== null ? salesAmount : item.value || 0))
                                  : `${coinsTotal !== null ? coinsTotal : item.value || 0} coins`
                                }
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
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
