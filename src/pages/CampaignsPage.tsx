import React, { useState, useEffect, useCallback } from 'react';
import { Layout } from '../components/Layout';
import { Search, Loader2, RefreshCw, ChevronLeft, ChevronRight, Plus, Edit2, Trash2, Target, Calendar, TrendingUp, X, Users, ShoppingBag, Trophy, Check, Coins, Shield, Store as StoreIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../context/AuthContext';
import { Campaign, User as UserType, Product, CampaignRanking, CampaignType, CampaignStatus } from '../types';
import { api } from '../services/api';
import { useToast } from '../context/ToastContext';
import { ConfirmModal } from '../components/ConfirmModal';
import { campaignSchema } from '../validators/schemas';
import { getFullImageUrl } from '../utils';

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
  { id: 7, name: 'create_post' },      // 15 coins
];

const actionLabels: Record<string, string> = {
  login_daily: 'Login Diário',
  share_post: 'Compartilhar Post',
  comment_post: 'Comentar Post',
  like_post: 'Curtir Post',
  send_feedback: 'Enviar Feedback',
  answer_survey: 'Responder Pesquisa',
  create_post: 'Criar Post',
};

const defaultActionCoins: Record<string, number> = {
  login_daily: 10,
  share_post: 20,
  comment_post: 10,
  like_post: 20,
  send_feedback: 10,
  answer_survey: 5,
  create_post: 15,
};

export const CampaignsPage: React.FC = () => {
  const { token, user: currentUser } = useAuth();
  const { addToast } = useToast();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 500);

  // Estados para busca no modal
  const [userSearch, setUserSearch] = useState('');
  const debouncedUserSearch = useDebounce(userSearch, 500);
  const [productSearch, setProductSearch] = useState('');
  const debouncedProductSearch = useDebounce(productSearch, 500);

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
    type: '' as CampaignType | '',
    goal: '',
    start_date: '',
    end_date: '',
    status: 'ativa' as CampaignStatus,
  });

  // Seleções
  const [selectedUsers, setSelectedUsers] = useState<number[]>([]);
  const [selectedActions, setSelectedActions] = useState<{ id: number; coins: number }[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<number[]>([]);

  // Estado para controlar os inputs de coins das ações (permite edição livre)
  const [actionCoinsInputs, setActionCoinsInputs] = useState<{ [key: number]: string }>({});

  // Paginação e filtros para usuários
  const [usersPage, setUsersPage] = useState(1);
  const [usersTotalPages, setUsersTotalPages] = useState(1);
  const [userFilterType, setUserFilterType] = useState<'name' | 'email'>('name');

  // Paginação e filtros para produtos
  const [productsPage, setProductsPage] = useState(1);
  const [productsTotalPages, setProductsTotalPages] = useState(1);
  const [productFilterType, setProductFilterType] = useState<'name' | 'barcode'>('name');
  const [productManufacturerFilter, setProductManufacturerFilter] = useState<number | 'all'>('all');

  // Filtro para ações
  const [actionSearch, setActionSearch] = useState('');

  // Loading para "Selecionar Todos"
  const [loadingSelectAllUsers, setLoadingSelectAllUsers] = useState(false);
  const [loadingSelectAllProducts, setLoadingSelectAllProducts] = useState(false);
  const [selectAllUsersProgress, setSelectAllUsersProgress] = useState<{ current: number; total: number } | null>(null);
  const [selectAllProductsProgress, setSelectAllProductsProgress] = useState<{ current: number; total: number } | null>(null);
  const [selectByRoleLoading, setSelectByRoleLoading] = useState<string | null>(null);
  const [selectByManufacturerLoading, setSelectByManufacturerLoading] = useState<string | null>(null);
  const [manufacturers, setManufacturers] = useState<Array<{ id: number; name: string }>>([]);
  
  // Controle de seleção por cargo/fabricante (independente da página)
  const [fullySelectedRoles, setFullySelectedRoles] = useState<Set<string>>(new Set());
  const [fullySelectedManufacturers, setFullySelectedManufacturers] = useState<Set<number>>(new Set());

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
      // Carregar primeira página de usuários, produtos e fabricantes
      const [usersData, productsData, manufacturersData] = await Promise.all([
        api.getAllUsers(token, 1, 10).catch(() => null),
        api.getProducts(token, 1, 10).catch(() => null),
        api.getAllManufacturers(token).catch(() => null),
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
      if (manufacturersData) {
        setManufacturers(manufacturersData.map(m => ({ id: m.id, name: m.name })));
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
  const fetchProducts = useCallback(async (page = 1, search = '', filterType: 'name' | 'barcode' = 'name', manufacturerId: number | 'all' = 'all') => {
    if (!token) return;
    try {
      const manufacturerIdParam = manufacturerId === 'all' ? undefined : manufacturerId;
      const response = await api.getProductsPaginated(token, page, search, filterType, manufacturerIdParam);
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

  // Buscar usuários automaticamente quando a busca debounced mudar
  useEffect(() => {
    if (isModalOpen) {
      setUsersPage(1); // Reseta para a primeira página ao buscar
      fetchUsers(1, debouncedUserSearch, userFilterType);
    }
  }, [debouncedUserSearch, userFilterType, isModalOpen]);

  // Buscar produtos automaticamente quando a busca debounced mudar
  useEffect(() => {
    if (isModalOpen) {
      setProductsPage(1); // Reseta para a primeira página ao buscar
      fetchProducts(1, debouncedProductSearch, productFilterType, productManufacturerFilter);
    }
  }, [debouncedProductSearch, productFilterType, productManufacturerFilter, isModalOpen]);

  const handleOpenModal = async (campaign?: Campaign) => {
    setActiveTab('basic');
    if (campaign) {
      setEditingCampaign(campaign);
      // Fallback para campanhas antigas que usam is_active
      const status = campaign.status || (campaign.is_active ? 'ativa' : 'pausada');
      setFormData({
        name: campaign.name,
        type: campaign.type,
        goal: campaign.goal ? String(campaign.goal) : '',
        start_date: campaign.start_date,
        end_date: campaign.end_date,
        status: status,
      });

      // Buscar usuários e produtos vinculados à campanha
      if (token) {
        try {
          // Buscar usuários da campanha
          const usersResponse = await api.getCampaignUsers(token, campaign.id);
          const campaignUsers = usersResponse.data || [];
          
          // Para engagement: filtrar apenas user_type_id = 2 (se o campo existir)
          // Para sales: todos os usuários
          let validUsers;
          if (campaign.type === 'engagement') {
            // Tenta filtrar por user_type_id, se não existir usa todos
            const filtered = campaignUsers.filter(u => u.user_type_id === 2);
            validUsers = filtered.length > 0 
              ? filtered.map(u => u.id)
              : campaignUsers.map(u => u.id); // Fallback: usa todos se não tiver user_type_id
          } else {
            validUsers = campaignUsers.map(u => u.id);
          }
          setSelectedUsers(validUsers);

          // Buscar dados específicos por tipo de campanha
          if (campaign.type === 'sales') {
            // Buscar produtos da campanha
            const productsResponse = await api.getCampaignProducts(token, campaign.id);
            const campaignProducts = productsResponse.data || [];
            setSelectedProducts(campaignProducts.map(p => p.id));
            setSelectedActions([]);
            
            // Carregar todos os usuários para a lista auxiliar (sales pode ter qualquer usuário)
            const allUsersResponse = await api.getAllUsersComplete(token);
            setUsers(allUsersResponse);
          } else if (campaign.type === 'engagement') {
            // Buscar ações da campanha
            const actionsResponse = await api.getCampaignActions(token, campaign.id);
            const campaignActions = actionsResponse.data || [];
            const actionsWithCoins = campaignActions.map(a => ({ id: a.id, coins: parseInt(a.coins) || 0 }));
            setSelectedActions(actionsWithCoins);
            setSelectedProducts([]);

            // Popular o estado local dos inputs com os valores das ações
            const coinsInputsMap: { [key: number]: string } = {};
            actionsWithCoins.forEach(a => {
              coinsInputsMap[a.id] = a.coins.toString();
            });
            setActionCoinsInputs(coinsInputsMap);

            // Carregar TODOS os usuários para a lista auxiliar (engagement precisa de user_type_id = 2)
            const allUsersResponse = await api.getAllUsersComplete(token);
            setUsers(allUsersResponse);
          }
        } catch (error) {
          console.error('Error fetching campaign data:', error);
          addToast('error', 'Erro ao carregar dados da campanha.');
          // Fallback para os dados locais se a API falhar
          const validUsers = campaign.type === 'engagement'
            ? (campaign.users?.filter(u => u.user_type_id === 2).map(u => u.id) || [])
            : (campaign.users?.map(u => u.id) || []);
          setSelectedUsers(validUsers);
          setSelectedProducts(campaign.products?.map(p => p.product_id) || []);
          const fallbackActions = campaign.actions?.map(a => ({ id: a.action_id, coins: a.coins })) || [];
          setSelectedActions(fallbackActions);
          
          // Popular estado local no fallback
          const fallbackCoinsInputs: { [key: number]: string } = {};
          fallbackActions.forEach(a => {
            fallbackCoinsInputs[a.id] = a.coins.toString();
          });
          setActionCoinsInputs(fallbackCoinsInputs);
        }
      } else {
        // Fallback sem token
        const validUsers = campaign.type === 'engagement'
          ? (campaign.users?.filter(u => u.user_type_id === 2).map(u => u.id) || [])
          : (campaign.users?.map(u => u.id) || []);
        setSelectedUsers(validUsers);
        setSelectedProducts(campaign.products?.map(p => p.product_id) || []);
        const fallbackActions = campaign.actions?.map(a => ({ id: a.action_id, coins: a.coins })) || [];
        setSelectedActions(fallbackActions);
        
        // Popular estado local no fallback
        const fallbackCoinsInputs: { [key: number]: string } = {};
        fallbackActions.forEach(a => {
          fallbackCoinsInputs[a.id] = a.coins.toString();
        });
        setActionCoinsInputs(fallbackCoinsInputs);
      }
    } else {
      setEditingCampaign(null);
      setFormData({
        name: '',
        type: '',
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
    // Inicializar paginação e filtros
    setUsersPage(1);
    setProductsPage(1);
    setUserSearch('');
    setProductSearch('');
    setProductManufacturerFilter('all');
    setActionSearch('');
    setFullySelectedRoles(new Set());
    setFullySelectedManufacturers(new Set());
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingCampaign(null);
    setActiveTab('basic');
    setFormData({
      name: '',
      type: '',
      goal: '',
      start_date: '',
      end_date: '',
      status: 'ativa',
    });
    setSelectedUsers([]);
    setSelectedProducts([]);
    setSelectedActions([]);
    setActionCoinsInputs({});
    setFullySelectedRoles(new Set());
    setFullySelectedManufacturers(new Set());
    setFormErrors({});
    setActionSearch('');
  };

  const handleSubmit = async () => {
    if (!token) return;
    setFormErrors({});

    // Validação do tipo de campanha (obrigatório)
    if (!formData.type) {
      addToast('error', 'Selecione o tipo de campanha.');
      setActiveTab('basic');
      return;
    }

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
        // Validação da meta apenas na criação (não na edição)
        if (!editingCampaign) {
          if (!formData.goal || parseFloat(formData.goal) <= 0) {
            addToast('error', 'Campanhas de engajamento exigem uma meta válida.');
            setActiveTab('basic');
            return;
          }
        }
        if (selectedActions.length === 0) {
          addToast('error', 'Campanhas de engajamento exigem pelo menos 1 ação vinculada.');
          setActiveTab('actions');
          return;
        }
        
        // Valida se todas as ações têm coins válidos (não negativos)
        const invalidActions = selectedActions.filter(a => !a.coins || a.coins < 0);
        if (invalidActions.length > 0) {
          addToast('error', 'Existem ações com valores inválidos. Verifique os coins de cada ação.');
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

    // Validação do schema apenas na criação (não na edição)
    if (!editingCampaign) {
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
        
        // Mostra mensagem específica do erro
        const errorMessages = Object.values(formattedErrors).join(', ');
        addToast('error', errorMessages || 'Verifique os campos obrigatórios.');
        return;
      }
    }

    // Validação adicional: end_date deve ser maior que start_date (somente criação)
    if (!editingCampaign && formData.end_date < formData.start_date) {
      setFormErrors({ end_date: 'Data de término deve ser maior que data de início' });
      addToast('error', 'Data de término deve ser maior que data de início.');
      return;
    }

    setSaving(true);
    let dataToSave: any = {};
    try {
      // Na edição, envia apenas campos alterados (NÃO envia goal)
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

        // NÃO envia goal na edição (somente na criação)

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

        // Goal para vendas e engajamento
        if (formData.type === 'sales') {
          dataToSave.goal = parseFloat(formData.goal);
          dataToSave.start_date = formData.start_date;
          dataToSave.end_date = formData.end_date;
          dataToSave.products = selectedProducts;
        } else if (formData.type === 'engagement') {
          dataToSave.goal = parseFloat(formData.goal);
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
      
      // Handle API validation errors
      if (error.response?.data?.errors) {
        const apiErrors = error.response.data.errors;
        const formattedErrors: { [key: string]: string } = {};
        
        const translations: { [key: string]: string } = {
          'The name field is required.': 'O campo nome é obrigatório.',
          'The type field is required.': 'O campo tipo é obrigatório.',
          'The start date field is required.': 'A data de início é obrigatória.',
          'The end date field is required.': 'A data de término é obrigatória.',
          'The goal field is required.': 'O campo meta é obrigatório.',
          'The end date must be a date after or equal to start date.': 'A data de término deve ser posterior ou igual à data de início.',
          'One or more actions are already active in another engagement campaign.': 'Uma ou mais ações já estão em uso em outra campanha ativa.',
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
        addToast('error', error.message || 'Erro ao salvar campanha.');
      }
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
      
      let errorMessage = 'Erro ao excluir campanha.';
      
      if (error.response?.data) {
        const data = error.response.data;
        if (data.message?.includes('Active campaigns cannot be deleted')) {
          errorMessage = 'Não é possível excluir uma campanha ativa. Desative-a primeiro.';
        } else if (data.errors?.campaign?.[0]?.includes('Active campaigns')) {
          errorMessage = 'Não é possível excluir uma campanha ativa. Desative-a primeiro.';
        } else {
          errorMessage = data.message || errorMessage;
        }
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
        // Remove o estado local do input quando desmarcar
        setActionCoinsInputs(prevInputs => {
          const newInputs = { ...prevInputs };
          delete newInputs[actionId];
          return newInputs;
        });
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

  const handleActionCoinsChange = (actionId: number, value: string) => {
    // Permite string vazia para o usuário poder apagar
    if (value === '') {
      updateActionCoins(actionId, 0);
      return;
    }
    const numValue = parseInt(value);
    if (!isNaN(numValue) && numValue >= 0) {
      updateActionCoins(actionId, numValue);
    }
  };

  // Handlers para "Selecionar Todos"
  const handleSelectAllUsers = async () => {
    if (!token) return;

    // Verifica se já existem usuários selecionados
    const hasSelectedUsers = selectedUsers.length > 0;

    if (hasSelectedUsers) {
      // Desmarcar TODOS os usuários selecionados
      setSelectedUsers([]);
      setFullySelectedRoles(new Set());
      addToast('success', 'Todos os usuários foram desmarcados!');
      return;
    }

    setLoadingSelectAllUsers(true);
    try {
      // Verifica se é campanha de engajamento
      const isCampaignEngagement = editingCampaign?.type === 'engagement' || (!editingCampaign && formData.type === 'engagement');
      
      // Usa o método otimizado do serviço de API
      const allUsers = await api.getAllUsersComplete(token, userSearch, userFilterType);

      // Filtra apenas usuários válidos para campanha de engajamento
      const validUserIds = isCampaignEngagement
        ? allUsers.filter(u => u.user_type_id === 2).map(u => u.id)
        : allUsers.map(u => u.id);

      // Adiciona todos os usuários válidos à seleção
      setSelectedUsers(validUserIds);

      // Marca todos os cargos principais como totalmente selecionados
      const roles = ['Atendente', 'Vendedor', 'Representante', 'Consultor', 'Supervisor'];
      setFullySelectedRoles(new Set(roles));

      addToast('success', `Todos os ${validUserIds.length} usuários foram selecionados!`);
    } catch (error) {
      console.error('Error fetching all users:', error);
      addToast('error', 'Erro ao carregar todos os usuários.');
    } finally {
      setLoadingSelectAllUsers(false);
    }
  };

  // Handler para selecionar todos os usuários de um cargo específico
  const handleSelectAllByRole = async (role: string) => {
    if (!token) return;
    
    setSelectByRoleLoading(role);
    try {
      // Usa o método otimizado do serviço de API
      const allUsers = await api.getAllUsersComplete(token);

      // Filtra apenas usuários do cargo selecionado
      const roleUsers = allUsers.filter(u => u.role === role);
      
      if (roleUsers.length === 0) {
        addToast('warning', `Nenhum usuário encontrado com o cargo "${role}".`);
        setFullySelectedRoles(prev => {
          const next = new Set(prev);
          next.delete(role);
          return next;
        });
        return;
      }
      
      // Filtra apenas usuários válidos para campanha de engajamento se necessário
      const isCampaignEngagement = editingCampaign?.type === 'engagement' || (!editingCampaign && formData.type === 'engagement');
      const validUserIds = isCampaignEngagement
        ? roleUsers.filter(u => u.user_type_id === 2).map(u => u.id)
        : roleUsers.map(u => u.id);

      if (validUserIds.length === 0) {
        addToast('warning', `Nenhum colaborador comum encontrado com o cargo "${role}".`);
        return;
      }

      // Verifica se já estão todos selecionados para este cargo
      const allRoleSelected = validUserIds.every(id => selectedUsers.includes(id));

      if (allRoleSelected) {
        // Desmarcar todos deste cargo
        setSelectedUsers(prev => prev.filter(id => !validUserIds.includes(id)));
        setFullySelectedRoles(prev => {
          const next = new Set(prev);
          next.delete(role);
          return next;
        });
        addToast('success', `${role}(s) removido(s) da seleção!`);
      } else {
        // Adiciona os usuários à seleção
        setSelectedUsers(prev => {
          const newIds = validUserIds.filter(id => !prev.includes(id));
          return [...prev, ...newIds];
        });
        // Marca o cargo como completamente selecionado
        setFullySelectedRoles(prev => new Set(prev).add(role));
        addToast('success', `${validUserIds.length} ${role}(s) adicionado(s) à seleção!`);
      }
    } catch (error) {
      console.error('Error fetching users by role:', error);
      addToast('error', `Erro ao carregar usuários com cargo ${role}.`);
    } finally {
      setSelectByRoleLoading(null);
    }
  };

  // Verifica se todos os usuários de um cargo estão selecionados
  const areAllUsersSelectedByRole = (role: string): boolean => {
    return fullySelectedRoles.has(role);
  };

  const handleSelectAllByManufacturer = async (manufacturerId: number, manufacturerName: string) => {
    if (!token) return;
    
    setSelectByManufacturerLoading(manufacturerName);
    try {
      // Busca todos os produtos do fabricante usando o filtro da API
      const allProducts = await api.getAllProductsComplete(token, manufacturerId.toString(), 'manufacturer_id' as any);

      const validProductIds = allProducts.map(p => p.id);

      // Verifica se já estão todos selecionados para este fabricante
      const allManufacturerSelected = validProductIds.length > 0 && validProductIds.every(id => selectedProducts.includes(id));

      if (allManufacturerSelected) {
        // Desmarcar todos deste fabricante
        setSelectedProducts(prev => prev.filter(id => !validProductIds.includes(id)));
        setFullySelectedManufacturers(prev => {
          const next = new Set(prev);
          next.delete(manufacturerId);
          return next;
        });
        addToast('success', `Produtos de ${manufacturerName} removido(s) da seleção!`);
      } else {
        // Adiciona os produtos à seleção
        setSelectedProducts(prev => {
          const newIds = validProductIds.filter(id => !prev.includes(id));
          return [...prev, ...newIds];
        });
        // Marca o fabricante como completamente selecionado
        setFullySelectedManufacturers(prev => new Set(prev).add(manufacturerId));
        addToast('success', `${validProductIds.length} produto(s) de ${manufacturerName} adicionado(s)!`);
      }
    } catch (error) {
      console.error('Error fetching products by manufacturer:', error);
      addToast('error', `Erro ao carregar produtos do fabricante ${manufacturerName}.`);
    } finally {
      setSelectByManufacturerLoading(null);
    }
  };

  // Verifica se todos os produtos de um fabricante estão selecionados
  const areAllProductsSelectedByManufacturer = (manufacturerId: number): boolean => {
    return fullySelectedManufacturers.has(manufacturerId);
  };

  const handleSelectAllProducts = async () => {
    if (!token) return;

    // Verifica se já existem produtos selecionados
    const hasSelectedProducts = selectedProducts.length > 0;

    if (hasSelectedProducts) {
      // Desmarcar TODOS os produtos selecionados
      setSelectedProducts([]);
      setFullySelectedManufacturers(new Set());
      addToast('success', 'Todos os produtos foram desmarcados!');
      return;
    }

    setLoadingSelectAllProducts(true);
    try {
      // Usa o método otimizado do serviço de API
      const allProducts = await api.getAllProductsComplete(token, productSearch, productFilterType);
      const allProductIds = allProducts.map(p => p.id);

      // Adiciona todos os produtos à seleção
      setSelectedProducts(allProductIds);

      addToast('success', `Todos os ${allProductIds.length} produtos foram selecionados!`);
    } catch (error) {
      console.error('Error fetching all products:', error);
      addToast('error', 'Erro ao carregar todos os produtos.');
    } finally {
      setLoadingSelectAllProducts(false);
    }
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
                            {campaign.type === 'engagement' && (
                              <div className="flex items-center gap-1.5 text-zinc-600 dark:text-zinc-400">
                                <Coins size={16} className="text-amber-500" />
                                <span className="text-zinc-500 dark:text-zinc-500">Meta:</span>
                                <span className="font-semibold text-zinc-900 dark:text-white">
                                  {Math.floor(campaign.goal || 0)} coins
                                </span>
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
                className="bg-white dark:bg-zinc-900 rounded-2xl shadow-xl w-full max-w-7xl overflow-hidden border border-zinc-200 dark:border-zinc-800 max-h-[95vh] flex flex-col"
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
                    Meu Time ({selectedUsers.length})
                  </button>
                  {/* Aba de ações: apenas para engajamento (criação e update) */}
                  {formData.type === 'engagement' || editingCampaign?.type === 'engagement' ? (
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
                  {formData.type === 'sales' || editingCampaign?.type === 'sales' ? (
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
                <div className="flex-1 overflow-y-auto p-6 min-h-0">
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
                                {editingCampaign.type === 'engagement'
                                  ? `${Math.floor(editingCampaign.goal || 0)} coins`
                                  : formatCurrency(formData.goal)
                                }
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
                              <option value="">Selecione o tipo de campanha</option>
                              <option value="sales">Vendas</option>
                              <option value="engagement">Engajamento</option>
                            </select>
                            {formErrors.type && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{formErrors.type}</p>}
                          </div>

                          {/* Meta para campanhas de vendas (editável) */}
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

                          {/* Meta para campanhas de engajamento (editável) */}
                          {formData.type === 'engagement' && (
                            <div>
                              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Meta (Coins) *</label>
                              <input
                                type="number"
                                value={formData.goal}
                                onChange={(e) => setFormData({ ...formData, goal: e.target.value })}
                                className={`w-full p-2.5 border rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition-all bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white placeholder-zinc-400 ${
                                  formErrors.goal ? 'border-red-500 focus:ring-red-500' : 'border-zinc-300 dark:border-zinc-600'
                                }`}
                                placeholder="Ex: 100"
                                min="0"
                              />
                              {formErrors.goal && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{formErrors.goal}</p>}
                              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                                Defina a meta de coins que os participantes devem alcançar
                              </p>
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
                        {/* Tipo de busca */}
                        <select
                          value={userFilterType}
                          onChange={(e) => setUserFilterType(e.target.value as 'name' | 'email')}
                          className="p-2.5 border border-zinc-300 dark:border-zinc-600 rounded-xl bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white text-sm whitespace-nowrap"
                        >
                          <option value="name">Nome</option>
                          <option value="email">E-mail</option>
                        </select>

                        {/* Busca */}
                        <div className="relative flex-1">
                          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-zinc-400" size={20} />
                          <input
                            type="text"
                            placeholder={`Buscar por ${userFilterType === 'name' ? 'nome' : 'e-mail'}...`}
                            value={userSearch}
                            onChange={(e) => setUserSearch(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 border border-zinc-300 dark:border-zinc-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-500"
                          />
                        </div>
                      </div>

                      {/* Seleção Rápida */}
                      <div className="border-t border-zinc-200 dark:border-zinc-700 pt-5 mb-4 space-y-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <p className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-widest">
                            👥 Seleção Rápida
                          </p>
                          <button
                            onClick={handleSelectAllUsers}
                            disabled={loadingSelectAllUsers}
                            className={`px-4 py-2 text-sm font-bold rounded-xl transition-all flex items-center justify-center gap-2 shadow-sm border ${
                              selectedUsers.length > 0
                                ? 'bg-red-50 text-red-600 border-red-200 hover:bg-red-100 dark:bg-red-900/20 dark:border-red-800 dark:text-red-400'
                                : 'bg-emerald-600 text-white border-emerald-500 hover:bg-emerald-700 shadow-emerald-500/20'
                            } disabled:opacity-50 disabled:cursor-not-allowed`}
                          >
                            {loadingSelectAllUsers ? (
                              <>
                                <Loader2 size={16} className="animate-spin" />
                                <span>Processando...</span>
                              </>
                            ) : (
                              <>
                                {selectedUsers.length > 0 ? <X size={18} /> : <Users size={18} />}
                                {selectedUsers.length > 0 ? 'Desmarcar Todos' : 'Selecionar Todos'}
                              </>
                            )}
                          </button>
                        </div>

                        <div className="bg-zinc-50 dark:bg-zinc-800/50 p-3 rounded-2xl border border-zinc-100 dark:border-zinc-800">
                          <p className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 mb-3 uppercase">
                            Filtrar por Cargo
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {['Atendente', 'Vendedor', 'Representante', 'Consultor', 'Supervisor'].map((role) => (
                              <button
                                key={role}
                                onClick={() => handleSelectAllByRole(role)}
                                disabled={selectByRoleLoading !== null}
                                className={`px-3 py-1.5 text-xs font-semibold rounded-full transition-all flex items-center gap-1.5 border ${
                                  areAllUsersSelectedByRole(role)
                                    ? 'bg-emerald-100 text-emerald-700 border-emerald-300 dark:bg-emerald-900/40 dark:text-emerald-300 dark:border-emerald-700'
                                    : 'bg-white text-zinc-600 border-zinc-200 hover:border-emerald-300 dark:bg-zinc-800 dark:text-zinc-400 dark:border-zinc-700'
                                } disabled:opacity-50 disabled:cursor-not-allowed`}
                              >
                                {selectByRoleLoading === role ? (
                                  <Loader2 size={12} className="animate-spin" />
                                ) : (
                                  <>
                                    {areAllUsersSelectedByRole(role) ? <Check size={12} /> : <Plus size={12} />}
                                    {role}
                                  </>
                                )}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>

                      {loadingAux ? (
                        <div className="flex justify-center py-8">
                          <Loader2 className="w-6 h-6 text-emerald-600 animate-spin" />
                        </div>
                      ) : users.length === 0 ? (
                        <p className="text-center text-zinc-500 dark:text-zinc-400 py-8">Nenhum usuário encontrado.</p>
                      ) : (
                        <>
                          {/* Contador de selecionados */}
                          <div className="mb-3 p-3 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl">
                            <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">
                              👥 {selectedUsers.length} usuário(s) selecionado(s)
                            </p>
                          </div>

                          {/* Grid de Cards de Usuários */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pr-2">
                            {/* Filtra usuários: apenas user_type_id = 2 para engajamento */}
                            {(editingCampaign?.type === 'engagement' || (!editingCampaign && formData.type === 'engagement')
                              ? users.filter(u => u.user_type_id === 2)
                              : users
                            ).map((user) => (
                              <motion.button
                                key={user.id}
                                onClick={() => toggleUser(user.id)}
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className={`p-4 rounded-xl border-2 transition-all duration-200 text-left group ${
                                  selectedUsers.includes(user.id)
                                    ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-500 shadow-md'
                                    : 'bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 hover:border-emerald-300 dark:hover:border-emerald-700 hover:shadow-sm'
                                }`}
                              >
                                <div className="flex items-start gap-3">
                                  {/* Avatar */}
                                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-emerald-100 to-teal-100 dark:from-emerald-900/30 dark:to-teal-900/30 border-2 border-emerald-200 dark:border-emerald-800 flex items-center justify-center text-emerald-600 dark:text-emerald-400 overflow-hidden flex-shrink-0">
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
                                    <p className="font-bold text-sm text-zinc-900 dark:text-white truncate">
                                      {user.name}
                                    </p>
                                    {user.role && (
                                      <p className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider mb-0.5">
                                        {user.role}
                                      </p>
                                    )}
                                    <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate">
                                      {user.email}
                                    </p>
                                    {user.store && (
                                      <p className="text-[10px] text-zinc-400 dark:text-zinc-500 truncate mt-1">
                                        🏪 {user.store.name}
                                      </p>
                                    )}
                                  </div>

                                  {/* Check de selecionado */}
                                  <div className={`flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                                    selectedUsers.includes(user.id)
                                      ? 'bg-emerald-500 border-emerald-500'
                                      : 'border-zinc-300 dark:border-zinc-600 group-hover:border-emerald-400'
                                  }`}>
                                    {selectedUsers.includes(user.id) && (
                                      <Check size={14} className="text-white" />
                                    )}
                                  </div>
                                </div>

                                {/* Badges */}
                                <div className="mt-3 flex items-center gap-2 flex-wrap">
                                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border ${
                                    user.user_type_id === 1
                                      ? 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800'
                                      : 'bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-900/20 dark:text-teal-400 dark:border-teal-800'
                                  }`}>
                                    <Shield size={10} className="mr-1" />
                                    {user.user_type_id === 1 ? 'Administrador' : 'Colaborador'}
                                  </span>
                                  {user.coin_balance !== undefined && user.coin_balance > 0 && (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800">
                                      <Coins size={10} />
                                      {user.coin_balance.toLocaleString('pt-BR')}
                                    </span>
                                  )}
                                  {/* Badge de aviso para Admin em campanha de engajamento */}
                                  {(editingCampaign?.type === 'engagement' || (!editingCampaign && formData.type === 'engagement')) && user.user_type_id === 1 && (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-red-50 text-red-700 border border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800">
                                      ⚠️ Não elegível
                                    </span>
                                  )}
                                </div>
                              </motion.button>
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
                          ? 'Selecione as ações e defina quantos coins serão ganhos (obrigatório para campanhas de engajamento):'
                          : 'Selecione as ações e defina quantos coins serão ganhos:'}
                      </p>

                      {/* Filtro de busca de ações */}
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-zinc-400" size={20} />
                        <input
                          type="text"
                          placeholder="Buscar por nome da ação..."
                          className="w-full pl-10 pr-4 py-2.5 border border-zinc-300 dark:border-zinc-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-500"
                          value={actionSearch}
                          onChange={(e) => setActionSearch(e.target.value)}
                        />
                      </div>

                      {/* Contador de selecionados */}
                      <div className="mb-3 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl">
                        <p className="text-sm font-semibold text-amber-700 dark:text-amber-400">
                          ⚡ {selectedActions.length} ação(ões) selecionada(s)
                        </p>
                      </div>

                      <div className="grid gap-3 max-h-80 overflow-y-auto">
                        {ENGAGEMENT_ACTIONS.filter(action =>
                          actionLabels[action.name].toLowerCase().includes(actionSearch.toLowerCase())
                        ).map((action) => {
                          const isSelected = selectedActions.find(a => a.id === action.id);
                          return (
                            <div
                              key={action.id}
                              className={`flex items-center justify-between p-3 rounded-lg border transition-all ${
                                isSelected
                                  ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-500'
                                  : 'bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 hover:border-amber-300 dark:hover:border-amber-700'
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
                                    {actionLabels[action.name]}
                                  </p>
                                </div>
                              </button>
                              {isSelected && (
                                <div className="flex items-center gap-2">
                                  <span className="text-xs text-zinc-500 dark:text-zinc-400">Coins:</span>
                                  <input
                                    type="number"
                                    min="0"
                                    value={actionCoinsInputs[action.id] ?? (selectedActions.find(a => a.id === action.id)?.coins ?? defaultActionCoins[action.name] ?? 10)}
                                    onChange={(e) => {
                                      const val = e.target.value;
                                      // Permite digitar temporariamente
                                      if (val === '' || val === '-' || /^-?\d*$/.test(val)) {
                                        setActionCoinsInputs(prev => ({ ...prev, [action.id]: val }));
                                      }
                                    }}
                                    onBlur={(e) => {
                                      // Valida e atualiza o estado real apenas quando perde o foco
                                      const val = e.target.value.trim();
                                      
                                      // Não permite vazio ou apenas "-"
                                      if (val === '' || val === '-') {
                                        setActionCoinsInputs(prev => ({ ...prev, [action.id]: '0' }));
                                        updateActionCoins(action.id, 0);
                                        addToast('warning', 'Valor inválido. Definido como 0.');
                                        return;
                                      }
                                      
                                      const numVal = parseInt(val);
                                      
                                      // Não permite negativos
                                      if (isNaN(numVal) || numVal < 0) {
                                        setActionCoinsInputs(prev => ({ ...prev, [action.id]: '0' }));
                                        updateActionCoins(action.id, 0);
                                        addToast('warning', 'Valores negativos não são permitidos. Definido como 0.');
                                        return;
                                      }
                                      
                                      // Valor válido
                                      setActionCoinsInputs(prev => ({ ...prev, [action.id]: String(numVal) }));
                                      updateActionCoins(action.id, numVal);
                                    }}
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
                        {/* Filtro de Fabricante */}
                        <select
                          value={productManufacturerFilter}
                          onChange={(e) => {
                            const value = e.target.value === 'all' ? 'all' : parseInt(e.target.value);
                            setProductManufacturerFilter(value);
                            setProductsPage(1);
                          }}
                          className="p-2.5 border border-zinc-300 dark:border-zinc-600 rounded-xl bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white text-sm whitespace-nowrap max-w-[200px]"
                        >
                          <option value="all">Todos fabricantes</option>
                          {manufacturers.map((m) => (
                            <option key={m.id} value={m.id}>
                              {m.name}
                            </option>
                          ))}
                        </select>

                        {/* Tipo de busca */}
                        <select
                          value={productFilterType}
                          onChange={(e) => setProductFilterType(e.target.value as 'name' | 'barcode')}
                          className="p-2.5 border border-zinc-300 dark:border-zinc-600 rounded-xl bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white text-sm whitespace-nowrap"
                        >
                          <option value="name">Nome</option>
                          <option value="barcode">Código de Barras</option>
                        </select>

                        {/* Busca */}
                        <div className="relative flex-1">
                          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-zinc-400" size={20} />
                          <input
                            type="text"
                            placeholder={`Buscar por ${productFilterType === 'name' ? 'nome' : 'código de barras'}...`}
                            value={productSearch}
                            onChange={(e) => setProductSearch(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 border border-zinc-300 dark:border-zinc-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-500"
                          />
                        </div>
                      </div>

                      {loadingAux ? (
                        <div className="flex justify-center py-8">
                          <Loader2 className="w-6 h-6 text-emerald-600 animate-spin" />
                        </div>
                      ) : products.length === 0 ? (
                        <p className="text-center text-zinc-500 dark:text-zinc-400 py-8">Nenhum produto encontrado.</p>
                      ) : (
                        <>
                          {/* Barra de progresso */}
                          {loadingSelectAllProducts && selectAllProductsProgress && (
                            <div className="mb-3">
                              <div className="flex justify-between text-xs text-zinc-500 dark:text-zinc-400 mb-1">
                                <span>Carregando produtos...</span>
                                <span>{Math.round((selectAllProductsProgress.current / selectAllProductsProgress.total) * 100)}%</span>
                              </div>
                              <div className="w-full h-2 bg-zinc-200 dark:bg-zinc-700 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-blue-500 transition-all duration-300"
                                  style={{ width: `${(selectAllProductsProgress.current / selectAllProductsProgress.total) * 100}%` }}
                                />
                              </div>
                            </div>
                          )}

                          {/* Seleção Rápida por Fabricante */}
                          {manufacturers.length > 0 && (
                            <div className="border-t border-zinc-200 dark:border-zinc-700 pt-4 mb-3">
                              <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 mb-2 uppercase tracking-wide">
                                🏭 Seleção Rápida por Fabricante
                              </p>
                              <p className="text-xs text-zinc-400 dark:text-zinc-500 mb-3">
                                Clique para selecionar/desmarcar todos os produtos do fabricante selecionado
                              </p>
                              <div className="flex flex-wrap gap-2">
                                <button
                                  onClick={handleSelectAllProducts}
                                  disabled={loadingSelectAllProducts}
                                  className="px-4 py-2 text-sm font-semibold bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2 shadow-sm"
                                >
                                  {loadingSelectAllProducts ? (
                                    <>
                                      <Loader2 size={16} className="animate-spin" />
                                      {selectAllProductsProgress ? `Página ${selectAllProductsProgress.current}/${selectAllProductsProgress.total}` : 'Carregando...'}
                                    </>
                                  ) : (
                                    <>
                                      <ShoppingBag size={16} />
                                      {selectedProducts.length > 0 ? 'Desmarcar Todos' : 'Selecionar Todos'}
                                    </>
                                  )}
                                </button>
                                {manufacturers.map((manufacturer) => (
                                  <button
                                    key={manufacturer.id}
                                    onClick={() => handleSelectAllByManufacturer(manufacturer.id, manufacturer.name)}
                                    disabled={selectByManufacturerLoading !== null}
                                    className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all flex items-center gap-1.5 shadow-sm ${
                                      areAllProductsSelectedByManufacturer(manufacturer.id)
                                        ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                                        : 'bg-purple-600 text-white hover:bg-purple-700'
                                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                                  >
                                    {selectByManufacturerLoading === manufacturer.name ? (
                                      <Loader2 size={12} className="animate-spin" />
                                    ) : (
                                      <>
                                        <Check size={14} className={areAllProductsSelectedByManufacturer(manufacturer.id) ? '' : 'invisible'} />
                                        {areAllProductsSelectedByManufacturer(manufacturer.id)
                                          ? `✓ ${manufacturer.name}`
                                          : `+ ${manufacturer.name}`}
                                      </>
                                    )}
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Contador de selecionados */}
                          <div className="mb-3 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl">
                            <p className="text-sm font-semibold text-blue-700 dark:text-blue-400">
                              🛒 {selectedProducts.length} produto(s) selecionado(s)
                            </p>
                          </div>

                          {/* Grid de Cards de Produtos */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-96 overflow-y-auto pr-2">
                            {products.map((product) => (
                              <motion.button
                                key={product.id}
                                onClick={() => toggleProduct(product.id)}
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className={`p-4 rounded-xl border-2 transition-all duration-200 text-left group ${
                                  selectedProducts.includes(product.id)
                                    ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-500 shadow-md'
                                    : 'bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 hover:border-blue-300 dark:hover:border-blue-700 hover:shadow-sm'
                                }`}
                              >
                                <div className="flex items-start gap-3">
                                  {/* Ícone do Produto */}
                                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-900/30 dark:to-indigo-900/30 border-2 border-blue-200 dark:border-blue-800 flex items-center justify-center text-blue-600 dark:text-blue-400 flex-shrink-0">
                                    <ShoppingBag size={24} />
                                  </div>

                                  {/* Informações */}
                                  <div className="flex-1 min-w-0">
                                    <p className="font-bold text-sm text-zinc-900 dark:text-white truncate">
                                      {product.name}
                                    </p>
                                    {product.barcode && (
                                      <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                                        📦 {product.barcode}
                                      </p>
                                    )}
                                    {product.description && (
                                      <p className="text-[10px] text-zinc-400 dark:text-zinc-500 truncate mt-1">
                                        {product.description}
                                      </p>
                                    )}
                                    {product.manufacturer && (
                                      <p className="text-[10px] text-zinc-400 dark:text-zinc-500 mt-1">
                                        🏭 {product.manufacturer.name}
                                      </p>
                                    )}
                                  </div>

                                  {/* Check de selecionado */}
                                  <div className={`flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                                    selectedProducts.includes(product.id)
                                      ? 'bg-blue-500 border-blue-500'
                                      : 'border-zinc-300 dark:border-zinc-600 group-hover:border-blue-400'
                                  }`}>
                                    {selectedProducts.includes(product.id) && (
                                      <Check size={14} className="text-white" />
                                    )}
                                  </div>
                                </div>
                              </motion.button>
                            ))}
                          </div>

                          {/* Paginação de produtos */}
                          {productsTotalPages > 1 && (
                            <div className="flex items-center justify-between mt-4 pt-4 border-t border-zinc-200 dark:border-zinc-700">
                              <button
                                onClick={() => fetchProducts(productsPage - 1, productSearch, productFilterType, productManufacturerFilter)}
                                disabled={productsPage === 1}
                                className="p-2 border border-zinc-300 dark:border-zinc-600 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed text-zinc-600 dark:text-zinc-400 text-sm"
                              >
                                Anterior
                              </button>
                              <span className="text-sm text-zinc-600 dark:text-zinc-400">
                                Página {productsPage} de {productsTotalPages}
                              </span>
                              <button
                                onClick={() => fetchProducts(productsPage + 1, productSearch, productFilterType, productManufacturerFilter)}
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
                <div className="p-6 border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/50 flex gap-3 flex-shrink-0">
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
                    <div className="space-y-3">
                      {rankingModal.ranking.map((item, index) => {
                        const isTop3 = index < 3;
                        const medalEmojis = ['🥇', '🥈', '🥉'];
                        const bgStyles = [
                          'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800 shadow-sm',
                          'bg-zinc-50 dark:bg-zinc-800/50 border-zinc-200 dark:border-zinc-700 shadow-sm',
                          'bg-orange-50/50 dark:bg-orange-900/10 border-orange-100 dark:border-orange-900/30 shadow-sm',
                        ];
                        
                        const userName = item.user_name || item.name;
                        const store = (item as any).store;
                        const salesAmount = (item as any).sales_amount;
                        const coinsTotal = (item as any).coins_total;

                        return (
                          <motion.div
                            key={item.user_id}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.05 }}
                            className={`flex items-center gap-4 p-4 rounded-2xl border transition-all ${
                              isTop3 ? bgStyles[index] : 'bg-white dark:bg-zinc-900 border-zinc-100 dark:border-zinc-800'
                            }`}
                          >
                            <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-xl ${
                              isTop3 ? '' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-500 border border-zinc-200 dark:border-zinc-700'
                            }`}>
                              {isTop3 ? (
                                <span className="filter drop-shadow-sm">{medalEmojis[index]}</span>
                              ) : (
                                <span className="text-sm">{index + 1}º</span>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-bold text-zinc-900 dark:text-white truncate">{userName}</p>
                              <div className="flex items-center gap-2 mt-0.5">
                                {store && (
                                  <span className="flex items-center gap-1 text-xs text-zinc-500 dark:text-zinc-400">
                                    <StoreIcon size={12} />
                                    {store.name}
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="text-right flex-shrink-0">
                              <p className="text-[10px] uppercase tracking-wider font-bold text-zinc-400 dark:text-zinc-500 mb-0.5">
                                {rankingModal.campaign?.type === 'sales' ? 'Vendas' : 'Pontuação'}
                              </p>
                              <p className={`font-black text-lg ${
                                isTop3 ? 'text-emerald-600 dark:text-emerald-400' : 'text-zinc-700 dark:text-zinc-300'
                              }`}>
                                {rankingModal.campaign?.type === 'sales'
                                  ? formatCurrency(String(salesAmount !== null ? salesAmount : item.value || 0))
                                  : `${coinsTotal !== null ? coinsTotal : item.value || 0} 🪙`
                                }
                              </p>
                            </div>
                          </motion.div>
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
