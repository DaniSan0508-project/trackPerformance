import React, { useState, useEffect, useCallback } from 'react';
import { Search, Loader2, RefreshCw, ChevronLeft, ChevronRight, Plus, Edit2, Trash2, Target, Calendar, TrendingUp, X, Users, ShoppingBag, Trophy, Check, Coins, Shield, Save, Store as StoreIcon, Gift, Upload, FileSpreadsheet, Download, Hash, AlertCircle, Package, User, Clock, Info, Mail, Phone, FileText, CheckCircle2, AlertTriangle, ChevronDown, Globe, Lock } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import * as XLSX from 'xlsx';
import { useAuth } from '../context/AuthContext';
import { Campaign, User as UserType, Product, CampaignRanking, CampaignType, CampaignStatus, Role, EngagementAction, Reward, CampaignHashtag } from '../types';
import { authService, dashboardService, usersService, campaignsService, productsService, manufacturersService, rolesService, rewardsService, feedbacksService, postsService, redemptionsService, tenantConfigsService, surveysService, storesService, coinsService } from '../services';
import { useToast } from '../context/ToastContext';
import { ConfirmModal } from '../components/ConfirmModal';
import { PendingHashtagApprovals } from '../components/Campaigns/PendingHashtagApprovals';
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
  sales: 'bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400',
  engagement: 'bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400',
};

const campaignStatusLabels: Record<CampaignStatus, string> = {
  ativa: 'Ativa',
  pausada: 'Pausada',
  finalizada: 'Finalizada',
  inativa: 'Inativa',
};

const campaignStatusColors: Record<CampaignStatus, string> = {
  ativa: 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400',
  pausada: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400',
  finalizada: 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-400',
  inativa: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400',
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
  change_profile_photo: 'Alterar Foto do Perfil',
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
  const { token, user: currentUser, coinName } = useAuth();
  const { addToast } = useToast();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 500);

  // Novos filtros de listagem
  const [filterType, setFilterType] = useState<string>('all');
  const [filterIsActive, setFilterIsActive] = useState<string>('all');
  const [filterIsPublic, setFilterIsPublic] = useState<string>('all');

  // Estados para Aprovações de Hashtags
  const [requiresApproval, setRequiresApproval] = useState(false);
  const [activeMainTab, setActiveMainTab] = useState<'campaigns' | 'approvals'>('campaigns');

  useEffect(() => {
    const fetchConfig = async () => {
      if (!token) return;
      try {
        const response = await tenantConfigsService.getTenantConfigs(token);
        const configs = response.data || [];
        const config = configs.find((c: any) => c.config_key === 'hashtag_reward_requires_approval');
        if (config && config.config_value === 'true') {
          setRequiresApproval(true);
        }
      } catch (err) {
        console.error('Error fetching tenant configs:', err);
      }
    };
    fetchConfig();
  }, [token]);

  // Estados para busca no modal
  const [userSearch, setUserSearch] = useState('');
  const debouncedUserSearch = useDebounce(userSearch, 500);
  const [userFilterType, setUserFilterType] = useState<'name' | 'email'>('name');
  const [users, setUsers] = useState<UserType[]>([]);
  const [usersPage, setUsersPage] = useState(1);
  const [usersTotalPages, setUsersTotalPages] = useState(1);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [loadingSelectAllUsers, setLoadingSelectAllUsers] = useState(false);
  const [selectByRoleLoading, setSelectByRoleLoading] = useState<string | null>(null);

  const [productSearch, setProductSearch] = useState('');
  const debouncedProductSearch = useDebounce(productSearch, 500);
  const [productFilterType, setProductFilterType] = useState<'name' | 'barcode'>('name');
  const [productManufacturerFilter, setProductManufacturerFilter] = useState<number | 'all'>('all');
  const [products, setProducts] = useState<Product[]>([]);
  const [productsPage, setProductsPage] = useState(1);
  const [productsTotalPages, setProductsTotalPages] = useState(1);

  const [rewardSearch, setRewardSearch] = useState('');
  const debouncedRewardSearch = useDebounce(rewardSearch, 500);
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [isRewardModalOpen, setIsRewardModalOpen] = useState(false);
  const [rewardsPage, setRewardsPage] = useState(1);
  const [rewardsTotalPages, setRewardsTotalPages] = useState(1);
  const [loadingRewards, setLoadingRewards] = useState(false);
  
  // Estados para controle de carregamento sob demanda
  const [hasLoadedUsersAux, setHasLoadedUsersAux] = useState(false);
  const [hasLoadedProductsAux, setHasLoadedProductsAux] = useState(false);
  const [hasLoadedRewardsAux, setHasLoadedRewardsAux] = useState(false);
  const [allUsersCache, setAllUsersCache] = useState<UserType[]>([]);
  const [allProductsCache, setAllProductsCache] = useState<Product[]>([]);
  
  // Refs para evitar chamadas duplicadas simultâneas
  const loadingUsersAuxRef = React.useRef(false);
  const loadingProductsAuxRef = React.useRef(false);

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
  const [loadingAux, setLoadingAux] = useState(false);

  // Abas do modal
  const [activeTab, setActiveTab] = useState<'basic' | 'users' | 'actions' | 'hashtags' | 'products'>('basic');

  const [formData, setFormData] = useState({
    name: '',
    type: '' as CampaignType | '',
    goal: '',
    goal_campaign: '',
    start_date: '',
    end_date: '',
    status: 'ativa' as CampaignStatus,
    reward_id: '' as number | '',
    is_public: true,
  });

  // Seleções
  const [selectedUsers, setSelectedUsers] = useState<number[]>([]);
  const [selectedActions, setSelectedActions] = useState<{ id: number; coins: number }[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<number[]>([]);

  // Ações de engajamento (buscadas da API)
  const [engagementActions, setEngagementActions] = useState<EngagementAction[]>([]);
  const [loadingEngagementActions, setLoadingEngagementActions] = useState(false);
  const [manuallyUnselectedActions, setManuallyUnselectedActions] = useState<number[]>([]);

  // Importação de vendas
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importingCampaign, setImportingCampaign] = useState<Campaign | null>(null);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{
    total_rows: number;
    success_count: number;
    error_count: number;
    errors: Array<{ row: number; external_id: string; reason: string }>;
  } | null>(null);

  // Novos estados para Importação Avançada
  const [importStep, setImportStep] = useState<'upload' | 'review' | 'importing' | 'summary'>('upload');
  const [parsedImportRows, setParsedImportRows] = useState<any[]>([]);
  const [importProgress, setImportProgress] = useState({ current: 0, total: 0 });
  const [importErrorDetails, setImportErrorDetails] = useState<any[]>([]);
  const [isReviewExpanded, setIsReviewExpanded] = useState(false);
  const [importBatchLogs, setImportBatchLogs] = useState<string[]>([]);
  const [isDragging, setIsDragging] = useState(false);

  // Histórico de Importações
  const [isImportHistoryModalOpen, setIsImportHistoryModalOpen] = useState(false);
  const [historyCampaign, setHistoryCampaign] = useState<Campaign | null>(null);
  const [importHistory, setImportHistory] = useState<any[]>([]);
  const [loadingImportHistory, setLoadingImportHistory] = useState(false);
  const [importHistoryPage, setImportHistoryPage] = useState(1);
  const [importHistoryTotalPages, setImportHistoryTotalPages] = useState(1);
  const [importHistoryTotal, setImportHistoryTotal] = useState(0);
  const [expandedImportIds, setExpandedImportIds] = useState<Set<number>>(new Set());

  // Estado para controlar os inputs de coins das ações (permite edição livre)
  const [actionCoinsInputs, setActionCoinsInputs] = useState<{ [key: number]: string }>({});

  // Hashtags
  const [selectedHashtags, setSelectedHashtags] = useState<CampaignHashtag[]>([]);
  const [allExistingHashtags, setAllExistingHashtags] = useState<any[]>([]);
  const [hasFetchedHashtags, setHasFetchedHashtags] = useState(false);
  const [newHashtag, setNewHashtag] = useState('');
  const [newHashtagCoins, setNewHashtagCoins] = useState('');
  const [checkingHashtag, setCheckingHashtag] = useState(false);

  const fetchAllExistingHashtags = useCallback(async () => {
    if (!token) return;
    try {
      const response = await campaignsService.getHashtags(token);
      const data = Array.isArray(response) ? response : (response?.data || []);
      setAllExistingHashtags(data);
      setHasFetchedHashtags(true);
    } catch (error) {
      console.error('Error fetching all hashtags:', error);
    }
  }, [token]);

  const handleAddHashtag = async () => {
    
    if (!token) {
      console.error('ERRO: Token ausente');
      addToast('error', 'Sessão expirada.');
      return;
    }

    const hashtag = newHashtag.trim();
    const coins = parseInt(newHashtagCoins);

    console.log('Valores do Form:', { hashtag, coins });

    if (!hashtag || isNaN(coins)) {
      addToast('warning', 'Preencha a hashtag e o valor de coins.');
      return;
    }

    const alreadySelected = selectedHashtags.find(
      h => h.hashtag.toLowerCase() === hashtag.toLowerCase()
    );
    if (alreadySelected) {
      addToast('error', `A hashtag "${hashtag}" já foi adicionada a esta campanha.`);
      return;
    }

    const hashtagRegex = /^#[A-Za-z0-9_]+$/;
    if (!hashtagRegex.test(hashtag)) {
      addToast('error', 'A hashtag deve conter apenas letras, números e sublinhados (_), começando com #.');
      return;
    }

    setCheckingHashtag(true);
    try {
      console.log('Chamando API: /campaigns/hashtags');
      const response = await campaignsService.getHashtags(token);
      console.log('API RESPONSE RAW:', response);
      
      const existingHashtags = Array.isArray(response) ? response : (response?.data || []);
      console.log('Hashtags para comparar:', existingHashtags);
      
      const duplicate = existingHashtags.find((h: any) => {
        const isSameHashtag = h.hashtag && h.hashtag.toLowerCase() === hashtag.toLowerCase();
        if (!isSameHashtag) return false;

        // Se estiver editando, ignora se a hashtag pertencer à própria campanha
        if (editingCampaign) {
          const hashtagCampaignId = h.campaign?.id || h.campaign_id;
          if (Number(hashtagCampaignId) === Number(editingCampaign.id)) {
            return false;
          }
        }
        return true;
      });      
      if (duplicate) {
        const campaignName = duplicate.campaign?.name || duplicate.campaign_name || 'outra campanha';
        console.warn('DUPLICATA DETECTADA:', campaignName);
        addToast('error', `A hashtag "${hashtag}" já está sendo usada na campanha "${campaignName}".`);
        return;
      }

      console.log('Nenhuma duplicata. Adicionando localmente...');
      setSelectedHashtags(prev => [...prev, { hashtag, coins }]);
      setNewHashtag('');
      setNewHashtagCoins('');
      addToast('success', 'Hashtag pronta para ser salva!');
    } catch (error) {
      console.error('ERRO NA API DE HASHTAGS:', error);
      // Fallback: adiciona mesmo com erro na checagem
      setSelectedHashtags(prev => [...prev, { hashtag, coins }]);
      setNewHashtag('');
      setNewHashtagCoins('');
      addToast('warning', 'Hashtag adicionada (não foi possível validar duplicidade).');
    } finally {
      setCheckingHashtag(false);
    }
  };

  const handleRemoveHashtag = (hashtagToRemove: string) => {
    setSelectedHashtags(prev => prev.filter(h => h.hashtag !== hashtagToRemove));
  };

  // Filtro para ações
  const [actionSearch, setActionSearch] = useState('');

  const [loadingSelectAllProducts, setLoadingSelectAllProducts] = useState(false);
  const [selectAllUsersProgress, setSelectAllUsersProgress] = useState<{ current: number; total: number } | null>(null);
  const [selectAllProductsProgress, setSelectAllProductsProgress] = useState<{ current: number; total: number } | null>(null);
  const [selectByManufacturerLoading, setSelectByManufacturerLoading] = useState<string | null>(null);
  const [manufacturers, setManufacturers] = useState<Array<{ id: number; name: string }>>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  
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
    isLoading: false,
    });

    // Prize approval state
    const [approvingPrizeId, setApprovingPrizeId] = useState<number | null>(null);
    const [prizeConfirmModal, setPrizeConfirmModal] = useState<{
    isOpen: boolean;
    campaign: Campaign | null;
    }>({
    isOpen: false,
    campaign: null,
    });

    // Winner details modal state
    const [selectedWinner, setSelectedWinner] = useState<UserType | null>(null);
    const [selectedCampaignForWinner, setSelectedCampaignForWinner] = useState<Campaign | null>(null);
    const [loadingWinnerDetails, setLoadingWinnerDetails] = useState(false);

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

  const fetchImportHistory = useCallback(async (campaignId: number, page = 1) => {
    if (!token) return;
    setLoadingImportHistory(true);
    try {
      const response = await campaignsService.getCampaignSalesImports(token, campaignId, page);
      setImportHistory(response.data || []);
      setImportHistoryPage(response.meta?.current_page || 1);
      setImportHistoryTotalPages(response.meta?.last_page || 1);
      setImportHistoryTotal(response.meta?.total || 0);
    } catch (error) {
      console.error('Error fetching import history:', error);
      addToast('error', 'Erro ao carregar histórico de importações.');
    } finally {
      setLoadingImportHistory(false);
    }
  }, [token]);

  const toggleExpandImport = (id: number) => {
    setExpandedImportIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleOpenImportHistory = (campaign: Campaign) => {
    setHistoryCampaign(campaign);
    setIsImportHistoryModalOpen(true);
    setExpandedImportIds(new Set());
    fetchImportHistory(campaign.id, 1);
  };

  // Buscar usuários com paginação e filtro
  const fetchUsers = useCallback(async (page = 1, search = '', filterType: 'name' | 'email' = 'name') => {
    if (!token) return;
    try {
      const response = await usersService.getUsers(token, page, search, filterType);
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
      const response = await productsService.getProductsPaginated(token, page, search, filterType, manufacturerIdParam);
      setProducts(response.data || []);
      setProductsTotalPages(response.meta?.last_page || response.last_page || 1);
      setProductsPage(response.meta?.current_page || response.current_page || 1);
    } catch (error) {
      console.error('Error fetching products:', error);
    }
  }, [token]);

  const fetchRewardsPaginated = useCallback(async (page = 1, search = '') => {
    if (!token) return;
    setLoadingRewards(true);
    try {
      const response = await rewardsService.getCampaignRewards(token, page, search);
      setRewards(response.data || []);
      setRewardsTotalPages(response.meta?.last_page || response.last_page || 1);
      setRewardsPage(response.meta?.current_page || response.current_page || 1);
    } catch (error) {
      console.error('Error fetching rewards:', error);
    } finally {
      setLoadingRewards(false);
    }
  }, [token]);

  const fetchCampaigns = useCallback(async (page = 1, search = '') => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const filters = {
        type: filterType,
        is_active: filterIsActive,
        is_public: filterIsPublic
      };
      const data = await campaignsService.getCampaigns(token, page, search, filters);
      const campaignsList: Campaign[] = data.data;
      
      setCampaigns(campaignsList);
      setCurrentPage(data.current_page);
      setTotalPages(data.last_page);
      setTotalItems(data.total);
      setFromItem(data.from);
      setToItem(data.to);

      // Buscar pódio para campanhas finalizadas que não possuem pódio carregado
      const finishedCampaigns = campaignsList.filter(c => 
        (c.status === 'finalizada' || c.is_active === false || c.is_active === 0) && 
        (!c.podium || c.podium.length === 0)
      );

      if (finishedCampaigns.length > 0) {
        // Busca pódios em paralelo (limitado para não sobrecarregar)
        Promise.all(finishedCampaigns.slice(0, 5).map(async (c) => {
          try {
            const podiumData = await campaignsService.getCampaignPodium(token, c.id);
            if (podiumData && (podiumData.data || Array.isArray(podiumData))) {
              const members = Array.isArray(podiumData) ? podiumData : podiumData.data;
              setCampaigns(prev => prev.map(cap => 
                cap.id === c.id ? { ...cap, podium: members } : cap
              ));
            }
          } catch (err) {
            console.error(`Error fetching podium for campaign ${c.id}:`, err);
          }
        }));
      }
    } catch (err: any) {
      console.error('Error fetching campaigns:', err);
      setError(err.message || 'Não foi possível carregar as campanhas.');
    } finally {
      setLoading(false);
    }
  }, [token, filterType, filterIsActive, filterIsPublic]);

  const handleApprovePrize = async () => {
    if (!token || !prizeConfirmModal.campaign) return;
    
    const campaignId = prizeConfirmModal.campaign.id;
    setApprovingPrizeId(campaignId);
    setPrizeConfirmModal({ isOpen: false, campaign: null });
    
    try {
      await campaignsService.approvePrize(token, campaignId);
      addToast('success', 'Entrega do prêmio aprovada com sucesso!');
      await fetchCampaigns(currentPage, searchTerm);
    } catch (error: any) {
      console.error('Error approving prize:', error);
      addToast('error', error.message || 'Erro ao aprovar entrega do prêmio.');
    } finally {
      setApprovingPrizeId(null);
    }
  };

  const handleOpenWinnerDetails = async (winnerId: number, campaign: Campaign) => {
    if (!token) return;
    setLoadingWinnerDetails(true);
    setSelectedCampaignForWinner(campaign);
    try {
      const response = await usersService.getUser(token, winnerId);
      setSelectedWinner(response.data || response);
    } catch (error) {
      console.error('Error fetching winner details:', error);
      addToast('error', 'Erro ao carregar detalhes do ganhador.');
      setSelectedCampaignForWinner(null);
    } finally {
      setLoadingWinnerDetails(false);
    }
  };

  useEffect(() => {
    fetchCampaigns(currentPage, debouncedSearchTerm);
  }, [fetchCampaigns, currentPage, debouncedSearchTerm, filterType, filterIsActive, filterIsPublic]);

  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearchTerm, filterType, filterIsActive, filterIsPublic]);

  // Buscar usuários automaticamente quando a busca debounced mudar
  useEffect(() => {
    if (isModalOpen && activeTab === 'users') {
      // Se estamos carregando os dados auxiliares e a busca está vazia, 
      // pulamos esta chamada para evitar duplicidade com o loadUsersTabAux
      if (!hasLoadedUsersAux && debouncedUserSearch === '') return;

      setUsersPage(1); // Reseta para a primeira página ao buscar
      fetchUsers(1, debouncedUserSearch, userFilterType);
    }
  }, [debouncedUserSearch, userFilterType, isModalOpen, activeTab]);

  // Buscar produtos automaticamente quando a busca debounced mudar
  useEffect(() => {
    if (isModalOpen && activeTab === 'products') {
      // Se estamos carregando os dados auxiliares e a busca está vazia, 
      // pulamos esta chamada para evitar duplicidade com o loadProductsTabAux
      if (!hasLoadedProductsAux && debouncedProductSearch === '') return;

      setProductsPage(1); // Reseta para a primeira página ao buscar
      fetchProducts(1, debouncedProductSearch, productFilterType, productManufacturerFilter);
    }
  }, [debouncedProductSearch, productFilterType, productManufacturerFilter, isModalOpen, activeTab]);

  useEffect(() => {
    if (isRewardModalOpen) {
      setRewardsPage(1);
      fetchRewardsPaginated(1, debouncedRewardSearch);
    }
  }, [debouncedRewardSearch, isRewardModalOpen]);

  const updateSelectionBadges = (currentSelectedUsers: number[], currentSelectedProducts: number[], allUsersList: UserType[], allProductsList: Product[]) => {
    // Calcular cargos totalmente selecionados
    const newFullySelectedRoles = new Set<string>();
    
    const isEngagement = editingCampaign?.type === 'engagement' || formData.type === 'engagement';

    roles.forEach(roleObj => {
      const role = roleObj.description;
      const usersInRole = allUsersList.filter(u => u.role === role);
      // Para engajamento, consideramos apenas user_type_id === 2
      const validUsersInRole = isEngagement 
        ? usersInRole.filter(u => u.user_type_id === 2)
        : usersInRole;

      if (validUsersInRole.length > 0 && validUsersInRole.every(u => currentSelectedUsers.includes(u.id))) {
        newFullySelectedRoles.add(role);
      }
    });
    setFullySelectedRoles(newFullySelectedRoles);

    // Calcular fabricantes totalmente selecionados
    const newFullySelectedManufacturers = new Set<number>();
    manufacturers.forEach(m => {
      const productsInManufacturer = allProductsList.filter(p => p.manufacturer_id === m.id);
      if (productsInManufacturer.length > 0 && productsInManufacturer.every(p => currentSelectedProducts.includes(p.id))) {
        newFullySelectedManufacturers.add(m.id);
      }
    });
    setFullySelectedManufacturers(newFullySelectedManufacturers);
  };

  const handleOpenModal = async (campaign?: Campaign) => {
    setActiveTab('basic');
    setIsModalOpen(true);
    
    // Resetar estados de busca e paginação
    setUsersPage(1);
    setProductsPage(1);
    setUserSearch('');
    setProductSearch('');
    setProductManufacturerFilter('all');
    setActionSearch('');
    setFullySelectedRoles(new Set());
    setFullySelectedManufacturers(new Set());
    setFormErrors({});

    // Resetar flags de carregamento sob demanda
    setHasLoadedUsersAux(false);
    setHasLoadedProductsAux(false);
    setHasLoadedRewardsAux(false);

    if (campaign) {
      setEditingCampaign(campaign);
      
      // Mapeia status
      let currentStatus: CampaignStatus = 'inativa';
      if (campaign.status === 'ativa' || (campaign.status as any) === 'active' || campaign.is_active === 1 || campaign.is_active === true) {
        currentStatus = 'ativa';
      }

      // Converter data do banco (YYYY-MM-DD HH:MM:SS) para datetime-local (YYYY-MM-DDTHH:MM)
      const formatToDatetimeLocal = (dateStr: string) => {
        if (!dateStr) return '';
        const [date, time] = dateStr.includes(' ') ? dateStr.split(' ') : dateStr.split('T');
        return `${date}T${time ? time.substring(0, 5) : '00:00'}`;
      };

      setFormData({
        name: campaign.name,
        type: campaign.type,
        goal: campaign.goal ? String(campaign.goal) : '',
        goal_campaign: campaign.goal_campaign ? String(campaign.goal_campaign) : '',
        start_date: formatToDatetimeLocal(campaign.start_date),
        end_date: formatToDatetimeLocal(campaign.end_date),
        status: currentStatus,
        reward_id: campaign.reward_id || '',
        is_public: campaign.is_public !== undefined ? !!campaign.is_public : true,
      });

      if (token) {
        setLoadingAux(true);
        try {
          // Busca APENAS os detalhes essenciais da campanha (incluindo hashtags e ações com coins)
          const [campaignDetailsRes, usersRes, productsRes] = await Promise.all([
            campaignsService.getCampaignById(token, campaign.id),
            campaignsService.getCampaignUsers(token, campaign.id).catch(() => ({ data: [] })),
            campaign.type === 'sales' ? campaignsService.getCampaignProducts(token, campaign.id).catch(() => ({ data: [] })) : Promise.resolve({ data: [] }),
          ]);

          const campaignDetails = campaignDetailsRes.data;

          // Processar Usuários (IDs completos selecionados)
          const campaignUserIds = (usersRes.data || []).map((u: any) => u.id);
          setSelectedUsers(campaignUserIds);

          // Processar Produtos (IDs completos selecionados)
          const campaignProductIds = (productsRes.data || []).map((p: any) => p.id);
          setSelectedProducts(campaignProductIds);

          // Processar Hashtags do novo endpoint
          const hashtags = campaignDetails.hashtags || [];
          setSelectedHashtags(hashtags);

          if (campaign.type === 'engagement') {
            // Mapeia ações do previews.actions (que contém os coins configurados)
            const campaignActions = (campaignDetails.previews?.actions || []).map((a: any) => ({
              id: a.action_id || a.id,
              coins: parseInt(a.coins) || 0
            }));
            setSelectedActions(campaignActions);

            // Popula os inputs de moedas para a UI
            const coinsInputsMap: { [key: number]: string } = {};
            campaignActions.forEach((a: any) => { 
              coinsInputsMap[a.id] = a.coins.toString(); 
            });
            setActionCoinsInputs(coinsInputsMap);
          }

        } catch (error) {
          console.error('Error initializing campaign modal:', error);
          addToast('error', 'Erro ao carregar dados básicos da campanha.');
        } finally {
          setLoadingAux(false);
        }
      }
    } else {
      // Criação de nova campanha
      setEditingCampaign(null);
      setFormData({
        name: '',
        type: '',
        goal: '',
        goal_campaign: '',
        start_date: '',
        end_date: '',
        status: 'ativa',
        reward_id: '',
        is_public: true,
      });
      setSelectedUsers([]);
      setSelectedProducts([]);
      setSelectedActions([]);
      setSelectedHashtags([]);
      // Dados auxiliares serão carregados sob demanda ao trocar de aba
    }
  };

  // Função para buscar ações de engajamento (chamada ao clicar na aba Actions)
  const loadEngagementActions = useCallback(async () => {
    if (!token || loadingEngagementActions) return;

    setLoadingEngagementActions(true);
    try {
      const response = await dashboardService.getEngagementActions(token);
      // A API retorna array direto, não dentro de { data: ... }
      const actionsData = Array.isArray(response) ? response : (response?.data || []);
      setEngagementActions(actionsData);
    } catch (error) {
      console.error('Error loading engagement actions:', error);
      addToast('error', 'Erro ao carregar ações de engajamento.');
    } finally {
      setLoadingEngagementActions(false);
    }
  }, [token, loadingEngagementActions, addToast]);

  // Carregamento sob demanda de dados auxiliares baseado na aba ativa
  useEffect(() => {
    if (!isModalOpen || !token) return;

    const loadUsersTabAux = async () => {
      if (activeTab === 'users' && !hasLoadedUsersAux && !loadingUsersAuxRef.current) {
        loadingUsersAuxRef.current = true;
        setLoadingAux(true);
        try {
          const [rolesRes, allUsersList] = await Promise.all([
            rolesService.getRoles(token).catch(() => ({ data: [] })),
            usersService.getAllUsersComplete(token).catch(() => []),
          ]);

          if (rolesRes.data) setRoles(rolesRes.data);
          setAllUsersCache(allUsersList);
          
          // Se não tiver usuários carregados ainda (pela busca), pega os primeiros 10 do cache
          if (users.length === 0 && debouncedUserSearch === '') {
            setUsers(allUsersList.slice(0, 10));
            setUsersTotalPages(Math.ceil(allUsersList.length / 10));
          }
          
          setHasLoadedUsersAux(true);
        } catch (err) {
          console.error('Error loading users auxiliary data:', err);
        } finally {
          setLoadingAux(false);
          loadingUsersAuxRef.current = false;
        }
      }
    };

    const loadProductsTabAux = async () => {
      if (activeTab === 'products' && !hasLoadedProductsAux && !loadingProductsAuxRef.current) {
        loadingProductsAuxRef.current = true;
        setLoadingAux(true);
        try {
          const [manufacturersRes, allProductsList] = await Promise.all([
            manufacturersService.getAllManufacturers(token).catch(() => []),
            productsService.getAllProductsComplete(token).catch(() => []),
          ]);

          if (manufacturersRes) setManufacturers(manufacturersRes);
          setAllProductsCache(allProductsList);

          // Se não tiver produtos carregados ainda, pega os primeiros 10
          if (products.length === 0 && debouncedProductSearch === '') {
            setProducts(allProductsList.slice(0, 10));
            setProductsTotalPages(Math.ceil(allProductsList.length / 10));
          }

          setHasLoadedProductsAux(true);
        } catch (err) {
          console.error('Error loading products auxiliary data:', err);
        } finally {
          setLoadingAux(false);
          loadingProductsAuxRef.current = false;
        }
      }
    };

    loadUsersTabAux();
    loadProductsTabAux();
  }, [activeTab, isModalOpen, token, hasLoadedUsersAux, hasLoadedProductsAux, users.length, products.length, debouncedUserSearch, debouncedProductSearch]);

  // Atualizar badges de seleção quando os dados ou seleções mudarem
  useEffect(() => {
    if (isModalOpen && (allUsersCache.length > 0 || allProductsCache.length > 0)) {
      updateSelectionBadges(selectedUsers, selectedProducts, allUsersCache, allProductsCache);
    }
  }, [selectedUsers, selectedProducts, allUsersCache, allProductsCache, isModalOpen]);

  // Buscar prêmios sob demanda
  useEffect(() => {
    if (isRewardModalOpen && !hasLoadedRewardsAux && token) {
      fetchRewardsPaginated(1);
      setHasLoadedRewardsAux(true);
    }
  }, [isRewardModalOpen, hasLoadedRewardsAux, fetchRewardsPaginated, token]);

  // Buscar ações automaticamente quando mudar para a aba Actions
  useEffect(() => {
    if (activeTab === 'actions' && 
        (formData.type === 'engagement' || editingCampaign?.type === 'engagement') &&
        !loadingEngagementActions && 
        engagementActions.length === 0) {
      loadEngagementActions();
    }
    
    // Buscar todas as hashtags quando entrar na aba de hashtags
    if (activeTab === 'hashtags' && (formData.type === 'engagement' || editingCampaign?.type === 'engagement') && !hasFetchedHashtags) {
      fetchAllExistingHashtags();
    }
  }, [activeTab, formData.type, editingCampaign?.type, loadEngagementActions, engagementActions.length, loadingEngagementActions, fetchAllExistingHashtags, hasFetchedHashtags]);

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingCampaign(null);
    setActiveTab('basic');
    setFormData({
      name: '',
      type: '',
      goal: '',
      goal_campaign: '',
      start_date: '',
      end_date: '',
      status: 'ativa',
      reward_id: '',
      is_public: true,
    });
    setSelectedUsers([]);
    setSelectedProducts([]);
    setSelectedActions([]);
    setSelectedHashtags([]);
    setManuallyUnselectedActions([]);
    setActionCoinsInputs({});
    setFullySelectedRoles(new Set());
    setFullySelectedManufacturers(new Set());
    setFormErrors({});
    setActionSearch('');
    setHasFetchedHashtags(false);
    setUserSearch('');
    setProductSearch('');
    setRewardSearch('');
    setUsersPage(1);
    setProductsPage(1);
    setRewardsPage(1);
    setHasLoadedUsersAux(false);
    setHasLoadedProductsAux(false);
    setHasLoadedRewardsAux(false);
    setAllUsersCache([]);
    setAllProductsCache([]);
  };

  const handleCloseImportModal = () => {
    setIsImportModalOpen(false);
    setImportingCampaign(null);
    setImportFile(null);
    setImporting(false);
    setImportResult(null);
    setImportStep('upload');
    setParsedImportRows([]);
    setImportProgress({ current: 0, total: 0 });
    setImportErrorDetails([]);
    setImportBatchLogs([]);
  };

  const handleDownloadTemplate = () => {
    const headers = ['id_externo', 'cod_barras', 'data_venda', 'valor', 'id_transacao'];
    const exampleRow = ['ABC123', '7896004710011', '2026-03-15', '10.00', 'TXN789456'];
    const csvContent = "\uFEFF" + [headers.join(','), exampleRow.join(',')].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", "modelo_importacao_vendas.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const processImportFile = async (file: File) => {
    // Validar tamanho (10MB)
    const MAX_SIZE = 10 * 1024 * 1024; // 10MB em bytes
    if (file.size > MAX_SIZE) {
      addToast('error', 'O arquivo é muito grande. O limite máximo é 10MB.');
      return;
    }

    // Validar extensão
    const allowedExtensions = ['.xlsx', '.xls'];
    const fileName = file.name.toLowerCase();
    const isValidExtension = allowedExtensions.some(ext => fileName.endsWith(ext));
    
    if (!isValidExtension) {
      addToast('error', 'Formato de arquivo não suportado. Use apenas .xlsx ou .xls');
      return;
    }

    setImportFile(file);
    setImporting(true);
    setImportStep('upload');

    try {
      const reader = new FileReader();
      reader.onload = (evt) => {
        try {
          const bstr = evt.target?.result;
          const wb = XLSX.read(bstr, { type: 'binary', cellDates: true });
          const wsname = wb.SheetNames[0];
          const ws = wb.Sheets[wsname];
          
          // Pegar as linhas como array de arrays para ter controle total
          const rows = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[][];

          if (rows.length === 0) {
            addToast('error', 'O arquivo está vazio.');
            setImporting(false);
            return;
          }

          const firstRow = rows[0];
          const isHeader = firstRow.some(cell => {
            const val = String(cell || '').toLowerCase();
            return (
              val.includes('id') || 
              val.includes('barcode') || 
              val.includes('cod_barras') || 
              val.includes('vendedor') || 
              val.includes('ean') || 
              val.includes('data') || 
              val.includes('valor') || 
              val.includes('transaction') ||
              val.includes('transacao') ||
              val.includes('externo')
            );
          });

          const dataRows = isHeader ? rows.slice(1) : rows;
          
          const formattedData = dataRows
            .filter(row => row.length >= 2 && (row[0] || row[1]))
            .map(row => {
              // Nova estrutura: [external_id, barcode, sale_date, amount, id_transaction]
              let barcode = row[1];
              let saleDate = row[2];
              let amount = row[3];
              let idTransaction = row[4];

              // Fallback para arquivos antigos (4 colunas) caso o usuário não use o novo modelo
              if (row.length === 4) {
                idTransaction = '';
                barcode = row[1];
                saleDate = row[2];
                amount = row[3];
              }

              if (saleDate instanceof Date) {
                saleDate = saleDate.toISOString().split('T')[0];
              }

              if (typeof amount === 'string') {
                amount = amount.replace(',', '.').trim();
              }

              return {
                external_id: String(row[0] || '').trim(),
                barcode: String(barcode || '').trim(),
                sale_date: saleDate || '',
                amount: amount || '0',
                id_transaction: String(idTransaction || '').trim()
              };
            });

          if (formattedData.length === 0) {
            addToast('error', 'Não foi possível encontrar dados válidos no arquivo.');
            setImporting(false);
            return;
          }

          setParsedImportRows(formattedData);
          setImportStep('review');
          setImporting(false);
        } catch (err) {
          console.error('Error parsing file content:', err);
          addToast('error', 'Erro ao processar o conteúdo do arquivo.');
          setImporting(false);
        }
      };
      reader.readAsBinaryString(file);
    } catch (error) {
      console.error('Error reading file:', error);
      addToast('error', 'Erro ao carregar o arquivo.');
      setImporting(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processImportFile(file);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processImportFile(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleImportFile = async () => {
    if (parsedImportRows.length === 0 || !importingCampaign || !token) return;

    setImporting(true);
    setImportStep('importing');
    setImportProgress({ current: 0, total: parsedImportRows.length });
    
    const batchSize = 100;
    const totalRows = parsedImportRows.length;
    let successCount = 0;
    let errorCount = 0;
    const detailedHistory: Array<{ row: number; external_id: string; status: 'success' | 'error'; reason?: string }> = [];
    const logs: string[] = [];

    try {
      for (let i = 0; i < totalRows; i += batchSize) {
        const batch = parsedImportRows.slice(i, i + batchSize);
        
        const ws = XLSX.utils.json_to_sheet(batch);
        const csv = XLSX.utils.sheet_to_csv(ws);
        const blob = new Blob([csv], { type: 'text/csv' });
        const batchFile = new File([blob], `lote_${Math.floor(i/batchSize) + 1}.csv`, { type: 'text/csv' });

        const result = await campaignsService.importCampaignSales(token, importingCampaign.id, batchFile);
        
        // Mapear erros deste lote para busca rápida
        const batchErrorsMap: Record<number, string> = {};
        if (result.errors && Array.isArray(result.errors)) {
          result.errors.forEach((e: any) => {
            batchErrorsMap[e.row] = e.reason || 'Erro desconhecido';
          });
        }

        // Processar cada linha do lote para o histórico detalhado
        batch.forEach((rowData: any, index: number) => {
          const apiRowNumber = index + 2; // +2 porque o CSV enviado tem cabeçalho (linha 1) e o dado começa na 2
          const globalRowNumber = i + (index + 1);
          const errorReason = batchErrorsMap[apiRowNumber];

          detailedHistory.push({
            row: globalRowNumber,
            external_id: rowData.external_id || 'N/A',
            status: errorReason ? 'error' : 'success',
            reason: errorReason
          });
        });

        successCount += result.success_count || 0;
        errorCount += result.error_count || 0;

        const currentProgress = Math.min(i + batchSize, totalRows);
        setImportProgress({ current: currentProgress, total: totalRows });
        
        const logMsg = `Lote ${Math.floor(i/batchSize) + 1}: ${result.success_count} sucessos, ${result.error_count} falhas.`;
        logs.push(logMsg);
        setImportBatchLogs([...logs]);
      }

      setImportResult({
        total_rows: totalRows,
        success_count: successCount,
        error_count: errorCount,
        errors: detailedHistory as any // Usaremos o histórico completo aqui
      });
      
      setImportStep('summary');
      if (successCount > 0) {
        addToast('success', `Importação finalizada com ${successCount} sucessos.`);
      }
      
      await fetchCampaigns();
    } catch (error: any) {
      console.error('Error during batch import:', error);
      addToast('error', 'Ocorreu um erro ao enviar um dos lotes.');
    } finally {
      setImporting(false);
    }
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
        
        // Deve existir pelo menos 1 ação OU 1 hashtag
        if (selectedActions.length === 0 && selectedHashtags.length === 0) {
          addToast('error', 'Campanhas de engajamento exigem pelo menos 1 ação ou 1 hashtag vinculada.');
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
        
        const errorMessages = Object.values(formattedErrors).join(', ');
        addToast('error', errorMessages || 'Verifique os campos obrigatórios.');
        return;
      }
    }

    if (!editingCampaign && formData.end_date < formData.start_date) {
      setFormErrors({ end_date: 'Data de término deve ser maior que data de início' });
      addToast('error', 'Data de término deve ser maior que data de início.');
      return;
    }

    setSaving(true);
    let dataToSave: any = {};
    try {
      const formatFromDatetimeLocal = (datetime: string) => {
        if (!datetime) return '';
        return datetime.replace('T', ' ') + ':00';
      };

      const formattedStartDate = formatFromDatetimeLocal(formData.start_date);
      const formattedEndDate = formatFromDatetimeLocal(formData.end_date);

      // Na edição, envia apenas campos alterados (NÃO envia goal)
      if (editingCampaign) {
        // Envia apenas se houver valor (não vazio)
        if (formData.name?.trim()) {
          dataToSave.name = formData.name.trim();
        }

        // Sempre envia is_active na edição (status pode ser alterado)
        dataToSave.is_active = formData.status === 'ativa';
        dataToSave.is_public = formData.is_public;

        // Sempre envia datas na edição
        dataToSave.start_date = formattedStartDate;
        dataToSave.end_date = formattedEndDate;

        // Envia users apenas se houver selecionados
        if (selectedUsers.length > 0) {
          dataToSave.users = selectedUsers;
        }

        dataToSave.reward_id = formData.reward_id || null;

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
          // Envia hashtags
          dataToSave.hashtags = selectedHashtags;
        }
      } else {
        // Na criação, envia todos os campos obrigatórios
        dataToSave.name = formData.name;
        dataToSave.type = formData.type;
        dataToSave.is_active = formData.status === 'ativa';
        dataToSave.is_public = formData.is_public;
        dataToSave.users = selectedUsers;
        dataToSave.start_date = formattedStartDate;
        dataToSave.end_date = formattedEndDate;

        // Goal para vendas e engajamento
        if (formData.type === 'sales') {
          dataToSave.goal = parseFloat(formData.goal);
          if (formData.goal_campaign) {
            dataToSave.goal_campaign = parseFloat(formData.goal_campaign);
          }
          dataToSave.reward_id = formData.reward_id || null;
          dataToSave.products = selectedProducts;
        } else if (formData.type === 'engagement') {
          dataToSave.goal = parseFloat(formData.goal);
          if (formData.goal_campaign) {
            dataToSave.goal_campaign = parseFloat(formData.goal_campaign);
          }
          dataToSave.reward_id = formData.reward_id || null;
          dataToSave.actions = selectedActions.map(a => ({ id: a.id, coins: a.coins }));
          dataToSave.hashtags = selectedHashtags;
        }
      }

      if (editingCampaign) {
        await campaignsService.updateCampaign(token, editingCampaign.id, dataToSave);
        addToast('success', 'Campanha atualizada com sucesso!');
      } else {
        await campaignsService.createCampaign(token, dataToSave);
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
          'One or more actions are already active in another engagement campaign.': 'Uma ou mais ações selecionadas já estão em uso em outra campanha ativa.',
        };

        Object.entries(apiErrors).forEach(([key, messages]: [string, any]) => {
          let message = Array.isArray(messages) ? messages[0] : messages;
          if (typeof message === 'string') {
            formattedErrors[key] = translations[message] || message;
          }
        });
        
        setFormErrors(formattedErrors);
        
        // Se houver erro nas ações, exibe um Toast bem específico
        if (apiErrors.actions) {
          addToast('error', translations[apiErrors.actions[0]] || apiErrors.actions[0]);
        } else {
          const apiMessage = error.response.data.message === 'Validation error' 
            ? 'Erro de validação nos campos abaixo.' 
            : error.response.data.message;
          addToast('error', apiMessage);
        }
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
      await campaignsService.deleteCampaign(token, campaign.id);
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
        const response = await campaignsService.getCampaignsWithPodium(token);
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

  const formatDateTime = (dateString: string) => {
    if (!dateString) return '-';

    // Tratar formatos YYYY-MM-DD HH:MM:SS ou ISO
    const [datePart, timePart] = dateString.includes(' ') ? dateString.split(' ') : dateString.split('T');
    const dateParts = datePart.split('-');

    if (dateParts.length === 3) {
      const [year, month, day] = dateParts;
      const formattedTime = timePart ? timePart.substring(0, 5) : '00:00';
      return `${day}/${month}/${year} às ${formattedTime}`;
    }

    return new Date(dateString).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '-';
    const datePart = dateString.split(' ')[0] || dateString.split('T')[0];
    const parts = datePart.split('-');

    if (parts.length === 3) {
      const [year, month, day] = parts;
      return `${day}/${month}/${year}`;
    }

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
        // Rastreia que esta ação foi desmarcada manualmente
        setManuallyUnselectedActions(prev => [...prev, actionId]);
        return prev.filter(a => a.id !== actionId);
      } else {
        // Ao marcar, remove da lista de desmarcadas manualmente
        setManuallyUnselectedActions(prev => prev.filter(id => id !== actionId));
        const action = engagementActions.find(a => a.id === actionId);
        const defaultCoins = 0;
        return [...prev, { id: actionId, coins: defaultCoins }];
      }
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
      const allUsers = await usersService.getAllUsersComplete(token, userSearch, userFilterType);

      // Filtra apenas usuários válidos para campanha de engajamento
      const validUserIds = isCampaignEngagement
        ? allUsers.filter(u => u.user_type_id === 2).map(u => u.id)
        : allUsers.map(u => u.id);

      // Adiciona todos os usuários válidos à seleção
      setSelectedUsers(validUserIds);

      // Marca todos os cargos principais como totalmente selecionados
      setFullySelectedRoles(new Set(roles.map(r => r.description)));

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
      const allUsers = await usersService.getAllUsersComplete(token);

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
      const allProducts = await productsService.getAllProductsComplete(token, manufacturerId.toString(), 'manufacturer_id' as any);

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
      const allProducts = await productsService.getAllProductsComplete(token, productSearch, productFilterType);
      const allProductIds = allProducts.map(p => p.id);

      // Adiciona todos os produtos à seleção
      setSelectedProducts(allProductIds);

      // Marca todos os fabricantes como totalmente selecionados
      const manufacturerIds = manufacturers.map(m => m.id);
      setFullySelectedManufacturers(new Set(manufacturerIds));

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

  const handleGoalCampaignChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (formData.type === 'sales') {
      const formatted = formatCurrencyInput(value);
      const numericValue = formatted.replace(/\./g, '').replace(',', '.');
      setFormData({ ...formData, goal_campaign: numericValue });
    } else {
      setFormData({ ...formData, goal_campaign: value });
    }
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
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">Campanhas</h1>
            <p className="text-zinc-500 dark:text-zinc-400">Gerencie suas campanhas e impulsione o engajamento da sua equipe.</p>
          </div>
          <div className="flex gap-2">
            {activeMainTab === 'campaigns' && (
              <>
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
                    className="bg-primary-600 px-4 py-2 rounded-xl text-sm font-medium text-white hover:bg-primary-700 shadow-sm transition-all flex items-center gap-2"
                  >
                    <Plus size={18} />
                    Nova Campanha
                  </button>
                )}
              </>
            )}
          </div>
        </div>

        {/* Top level Tabs if approval is required */}
        {requiresApproval && (
          <div className="flex border-b border-zinc-200 dark:border-zinc-800">
            <button
              onClick={() => setActiveMainTab('campaigns')}
              className={`px-6 py-3 text-sm font-bold transition-all border-b-2 ${
                activeMainTab === 'campaigns'
                  ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                  : 'border-transparent text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200'
              }`}
            >
              Listagem de Campanhas
            </button>
            <button
              onClick={() => setActiveMainTab('approvals')}
              className={`px-6 py-3 text-sm font-bold transition-all border-b-2 flex items-center gap-2 ${
                activeMainTab === 'approvals'
                  ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                  : 'border-transparent text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200'
              }`}
            >
              Aprovações Pendentes
              <Hash size={16} />
            </button>
          </div>
        )}

        {activeMainTab === 'campaigns' ? (
          <>
            {/* Filters */}
            <div className="bg-white dark:bg-zinc-900 p-4 rounded-2xl shadow-sm border border-zinc-100 dark:border-zinc-800 flex flex-col lg:flex-row gap-4 items-center transition-colors duration-200">
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

              <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-zinc-400 uppercase whitespace-nowrap">Tipo:</span>
                  <select
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value)}
                    className="pl-3 pr-8 py-2 border border-zinc-200 dark:border-zinc-700 rounded-xl bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white text-sm outline-none focus:ring-2 focus:ring-primary-500 appearance-none bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%2371717a%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.4-12.8z%22%2F%3E%3C%2Fsvg%3E')] bg-[length:12px_12px] bg-[right_10px_center] bg-no-repeat"
                  >
                    <option value="all">Todos</option>
                    <option value="sales">Vendas</option>
                    <option value="engagement">Engajamento</option>
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-zinc-400 uppercase whitespace-nowrap">Situação:</span>
                  <select
                    value={filterIsActive}
                    onChange={(e) => setFilterIsActive(e.target.value)}
                    className="pl-3 pr-8 py-2 border border-zinc-200 dark:border-zinc-700 rounded-xl bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white text-sm outline-none focus:ring-2 focus:ring-primary-500 appearance-none bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%2371717a%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.4-12.8z%22%2F%3E%3C%2Fsvg%3E')] bg-[length:12px_12px] bg-[right_10px_center] bg-no-repeat"
                  >
                    <option value="all">Todos</option>
                    <option value="active">Ativas</option>
                    <option value="inactive">Inativas</option>
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-zinc-400 uppercase whitespace-nowrap">Visibilidade:</span>
                  <select
                    value={filterIsPublic}
                    onChange={(e) => setFilterIsPublic(e.target.value)}
                    className="pl-3 pr-8 py-2 border border-zinc-200 dark:border-zinc-700 rounded-xl bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white text-sm outline-none focus:ring-2 focus:ring-primary-500 appearance-none bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%2371717a%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.4-12.8z%22%2F%3E%3C%2Fsvg%3E')] bg-[length:12px_12px] bg-[right_10px_center] bg-no-repeat"
                  >
                    <option value="all">Todas</option>
                    <option value="public">Públicas</option>
                    <option value="private">Privadas</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Campaigns List */}
            {loading && campaigns.length === 0 ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-8 h-8 text-primary-600 animate-spin" />
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
                    const isAtiva = campaign.status === 'ativa' || (campaign.status as any) === 'active' || campaign.is_active === 1 || campaign.is_active === true;
                    const statusLabel = isAtiva ? 'Ativa' : 'Inativa';
                    const statusColor = isAtiva 
                      ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400' 
                      : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-400';

                    return (
                      <motion.div
                        key={campaign.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-white dark:bg-zinc-900 p-6 rounded-2xl shadow-sm border border-zinc-100 dark:border-zinc-800 hover:shadow-md transition-all duration-200"
                      >
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                          <div className="flex items-start gap-4 flex-1">
                            <div className="bg-primary-100 dark:bg-primary-900/30 p-3 rounded-xl">
                              <Target className="w-6 h-6 text-primary-600 dark:text-primary-400" />
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
                                <span className={`px-2 py-1 rounded-full text-xs font-bold flex items-center gap-1 ${
                                  campaign.is_public !== false
                                    ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
                                    : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-400'
                                }`}>
                                  {campaign.is_public !== false ? (
                                    <>
                                      <Globe size={12} />
                                      PÚBLICA
                                    </>
                                  ) : (
                                    <>
                                      <Lock size={12} />
                                      PRIVADA
                                    </>
                                  )}
                                </span>
                              </div>

                              <div className="flex flex-wrap gap-4 mt-3 text-sm">
                                {/* Meta apenas para campanhas de vendas */}
                                {campaign.type === 'sales' && (
                                  <div className="flex items-center gap-1.5 text-zinc-600 dark:text-zinc-400">
                                    <TrendingUp size={16} className="text-primary-500" />
                                    <span className="text-zinc-500 dark:text-zinc-500">Meta:</span>
                                    <span className="font-semibold text-zinc-900 dark:text-white">{formatCurrency(campaign.goal)}</span>
                                  </div>
                                )}
                                {campaign.type === 'engagement' && (
                                  <div className="flex items-center gap-1.5 text-zinc-600 dark:text-zinc-400">
                                    <Coins size={16} className="text-amber-500" />
                                    <span className="text-zinc-500 dark:text-zinc-500">Meta:</span>
                                    <span className="font-semibold text-zinc-900 dark:text-white">
                                      {Math.floor(campaign.goal || 0)} {coinName}
                                    </span>
                                  </div>
                                )}
                                <div className="flex items-center gap-1.5 text-zinc-600 dark:text-zinc-400">
                                  <Calendar size={16} className="text-[var(--color-primary-500)]" />
                                  <span className="text-zinc-500 dark:text-zinc-500">Período:</span>
                                  <span className="font-medium text-zinc-900 dark:text-white">
                                    {formatDateTime(campaign.start_date)} até {formatDateTime(campaign.end_date)}
                                  </span>
                                </div>                                {campaign.users && campaign.users.length > 0 && (
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
                            {/* Exibição de Ganhador para campanhas inativas */}
                            {!isAtiva && campaign.winner_user_id && (
                              <div 
                                className="flex-1 p-2 px-3 rounded-xl bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800/50 flex items-center justify-between gap-2 cursor-pointer hover:border-amber-400 transition-all group"
                                onClick={() => handleOpenWinnerDetails(campaign.winner_user_id!, campaign)}
                                title={isAdmin && !campaign.prize_approved_at ? "Entregar Prêmio" : "Ver Ganhador"}
                              >
                                <div className="flex items-center gap-2 min-w-0">
                                  <div className="w-6 h-6 rounded-full bg-white dark:bg-zinc-800 border border-amber-200 dark:border-amber-800 flex items-center justify-center text-amber-500 flex-shrink-0 overflow-hidden shadow-sm">
                                    {campaign.winner?.profile_image_url ? (
                                      <img src={getFullImageUrl(campaign.winner.profile_image_url) || ''} alt={campaign.winner.name} className="w-full h-full object-cover" />
                                    ) : <Trophy size={14} />}
                                  </div>
                                  <span className="text-xs font-bold text-zinc-900 dark:text-white truncate">
                                    {campaign.winner?.name || 'Ganhador'}
                                  </span>
                                  {campaign.prize_approved_at && (
                                    <Check size={14} className="text-green-600" />
                                  )}
                                </div>
                                
                                {!campaign.prize_approved_at && (
                                  <div className={`p-1.5 rounded-lg transition-all ${
                                    isAdmin 
                                      ? 'bg-amber-500 text-white shadow-sm group-hover:scale-110' 
                                      : 'text-amber-500'
                                  }`}>
                                    {isAdmin ? <Gift size={14} /> : <Info size={14} />}
                                  </div>
                                )}
                              </div>
                            )}

                            {/* Botão de ranking: para campanhas ativas ou inativas (ranking final) */}
                            <button
                              onClick={() => handleOpenRanking(campaign)}
                              className="p-2 text-zinc-400 hover:text-amber-600 dark:hover:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20 rounded-lg transition-colors"
                              title="Ver Ranking Completo"
                            >
                              <Trophy size={18} />
                            </button>
                            {isAdmin && campaign.type === 'sales' && (
                              <>
                                <button
                                  onClick={() => handleOpenImportHistory(campaign)}
                                  className="p-2 text-zinc-400 hover:text-primary-600 dark:hover:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-lg transition-colors"
                                  title="Ver Histórico de Importações"
                                >
                                  <Clock size={18} />
                                </button>
                                <button
                                  onClick={() => {
                                    setImportingCampaign(campaign);
                                    setIsImportModalOpen(true);
                                  }}
                                  className="p-2 text-zinc-400 hover:text-green-600 dark:hover:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-colors"
                                  title="Importar Vendas"
                                >
                                  <Upload size={18} />
                                </button>
                              </>
                            )}
                            {isAdmin && (
                              <>
                                <button
                                  onClick={() => handleOpenModal(campaign)}
                                  className="p-2 text-zinc-400 hover:text-primary-600 dark:hover:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-lg transition-colors"
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
          </>
        ) : (
          <PendingHashtagApprovals />
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
                  <div className="flex items-center gap-3">
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
                    onClick={() => setActiveTab('users')}
                    className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                      activeTab === 'users'
                        ? 'bg-white dark:bg-zinc-800 text-primary-600 dark:text-primary-400 border-b-2 border-primary-500'
                        : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200'
                    }`}
                  >
                    Meu Time ({selectedUsers.length})
                  </button>
                  {/* Aba de ações: apenas para engajamento (criação e update) */}
                  {formData.type === 'engagement' || editingCampaign?.type === 'engagement' ? (
                    <button
                      onClick={() => {
                        setActiveTab('actions');
                        loadEngagementActions();
                      }}
                      className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                        activeTab === 'actions'
                          ? 'bg-white dark:bg-zinc-800 text-primary-600 dark:text-primary-400 border-b-2 border-primary-500'
                          : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200'
                      }`}
                    >
                      Ações
                    </button>
                  ) : null}
                  {/* Aba de hashtags: apenas para engajamento (criação e update) */}
                  {formData.type === 'engagement' || editingCampaign?.type === 'engagement' ? (
                    <button
                      onClick={() => setActiveTab('hashtags')}
                      className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                        activeTab === 'hashtags'
                          ? 'bg-white dark:bg-zinc-800 text-primary-600 dark:text-primary-400 border-b-2 border-primary-500'
                          : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200'
                      }`}
                    >
                      Hashtags
                    </button>
                  ) : null}
                  {/* Aba de produtos: apenas para vendas (criação e update) */}
                  {formData.type === 'sales' || editingCampaign?.type === 'sales' ? (
                    <button
                      onClick={() => setActiveTab('products')}
                      className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                        activeTab === 'products'
                          ? 'bg-white dark:bg-zinc-800 text-primary-600 dark:text-primary-400 border-b-2 border-primary-500'
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
                          className={`w-full p-2.5 border rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white placeholder-zinc-400 ${
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
                              <label className="block text-xs text-zinc-500 dark:text-zinc-400 mb-1">Meta Individual</label>
                              <p className="text-sm font-medium text-zinc-900 dark:text-white">
                                {editingCampaign.type === 'engagement'
                                  ? `${Math.floor(Number(editingCampaign.goal) || 0)} ${coinName}`
                                  : formatCurrency(String(editingCampaign.goal))
                                }
                              </p>
                            </div>
                            {editingCampaign.goal_campaign && (
                              <div>
                                <label className="block text-xs text-zinc-500 dark:text-zinc-400 mb-1">Meta Campanha</label>
                                <p className="text-sm font-medium text-zinc-900 dark:text-white">
                                  {editingCampaign.type === 'engagement'
                                    ? `${Math.floor(Number(editingCampaign.goal_campaign) || 0)} ${coinName}`
                                    : formatCurrency(String(editingCampaign.goal_campaign))
                                  }
                                </p>
                              </div>
                            )}
                            <div>
                              <label className="block text-xs text-zinc-500 dark:text-zinc-400 mb-1">Início</label>
                              <p className="text-sm font-medium text-zinc-900 dark:text-white">
                                {formatDateTime(editingCampaign.start_date)}
                              </p>
                            </div>
                            <div>
                              <label className="block text-xs text-zinc-500 dark:text-zinc-400 mb-1">Término</label>
                              <p className="text-sm font-medium text-zinc-900 dark:text-white">
                                {formatDateTime(editingCampaign.end_date)}
                              </p>
                            </div>                          </div>
                        </div>
                      )}

                      {!editingCampaign && (
                        <>
                          <div>
                            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Tipo *</label>
                            <select
                              value={formData.type}
                              onChange={(e) => setFormData({ ...formData, type: e.target.value as CampaignType })}
                              className="w-full p-2.5 border border-zinc-300 dark:border-zinc-600 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white"
                            >
                              <option value="">Selecione o tipo de campanha</option>
                              <option value="sales">Vendas</option>
                              <option value="engagement">Engajamento</option>
                            </select>
                            {formErrors.type && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{formErrors.type}</p>}
                          </div>

                          {/* Meta para campanhas de vendas (editável) */}
                          {formData.type === 'sales' && (
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Meta Individual (R$) *</label>
                                <input
                                  type="text"
                                  value={formData.goal ? formatCurrencyInput(formData.goal.replace(/\./g, '').replace(',', '.')) : ''}
                                  onChange={handleGoalChange}
                                  className={`w-full p-2.5 border rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white placeholder-zinc-400 ${
                                    formErrors.goal ? 'border-red-500 focus:ring-red-500' : 'border-zinc-300 dark:border-zinc-600'
                                  }`}
                                  placeholder="R$ 0,00"
                                />
                                {formErrors.goal && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{formErrors.goal}</p>}
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Meta Campanha (R$) (Opcional)</label>
                                <input
                                  type="text"
                                  value={formData.goal_campaign ? formatCurrencyInput(formData.goal_campaign.replace(/\./g, '').replace(',', '.')) : ''}
                                  onChange={handleGoalCampaignChange}
                                  className={`w-full p-2.5 border rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white placeholder-zinc-400 ${
                                    formErrors.goal_campaign ? 'border-red-500 focus:ring-red-500' : 'border-zinc-300 dark:border-zinc-600'
                                  }`}
                                  placeholder="R$ 0,00"
                                />
                                {formErrors.goal_campaign && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{formErrors.goal_campaign}</p>}
                              </div>
                            </div>
                          )}

                          {/* Meta para campanhas de engajamento (editável) */}
                          {formData.type === 'engagement' && (
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Meta Individual ({coinName.charAt(0).toUpperCase() + coinName.slice(1)}) *</label>
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
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Meta Campanha ({coinName.charAt(0).toUpperCase() + coinName.slice(1)}) (Opcional)</label>
                                <input
                                  type="number"
                                  value={formData.goal_campaign}
                                  onChange={handleGoalCampaignChange}
                                  className={`w-full p-2.5 border rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition-all bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white placeholder-zinc-400 ${
                                    formErrors.goal_campaign ? 'border-red-500 focus:ring-red-500' : 'border-zinc-300 dark:border-zinc-600'
                                  }`}
                                  placeholder="Ex: 500"
                                  min="0"
                                />
                                {formErrors.goal_campaign && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{formErrors.goal_campaign}</p>}
                              </div>
                            </div>
                          )}

                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Data de Início *</label>
                              <div className="relative">
                                <Calendar size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-primary-500)] dark:text-[var(--color-primary-400)] pointer-events-none z-10" />
                                <input
                                  type="datetime-local"
                                  value={formData.start_date}
                                  onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                                  className={`w-full pl-9 pr-2.5 py-2.5 border rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white [&::-webkit-calendar-picker-indicator]:cursor-pointer ${
                                    formErrors.start_date ? 'border-red-500 focus:ring-red-500' : 'border-zinc-300 dark:border-zinc-600'
                                  }`}
                                />
                              </div>
                              {formErrors.start_date && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{formErrors.start_date}</p>}
                            </div>

                            <div>
                              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Data de Término *</label>
                              <div className="relative">
                                <Calendar size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-primary-500)] dark:text-[var(--color-primary-400)] pointer-events-none z-10" />
                                <input
                                  type="datetime-local"
                                  value={formData.end_date}
                                  onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                                  className={`w-full pl-9 pr-2.5 py-2.5 border rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white [&::-webkit-calendar-picker-indicator]:cursor-pointer ${
                                    formErrors.end_date ? 'border-red-500 focus:ring-red-500' : 'border-zinc-300 dark:border-zinc-600'
                                  }`}
                                />
                              </div>
                              {formErrors.end_date && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{formErrors.end_date}</p>}
                            </div>
                          </div>                        </>
                      )}

                      <div>
                        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Situação</label>
                        <select
                          value={formData.status}
                          onChange={(e) => setFormData({ ...formData, status: e.target.value as CampaignStatus })}
                          className="w-full p-2.5 border border-zinc-300 dark:border-zinc-600 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white"
                        >
                          <option value="ativa">Ativa</option>
                          <option value="inativa">Inativa</option>
                        </select>
                      </div>

                      <div className="pt-2">
                        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">Visibilidade</label>
                        <label className="flex items-center gap-3 p-3 border border-zinc-200 dark:border-zinc-700 rounded-xl cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors">
                          <input
                            type="checkbox"
                            checked={formData.is_public}
                            onChange={(e) => setFormData({ ...formData, is_public: e.target.checked })}
                            className="w-5 h-5 text-primary-600 rounded focus:ring-primary-500 bg-white dark:bg-zinc-800 border-zinc-300 dark:border-zinc-600"
                          />
                          <div className="flex flex-col">
                            <span className="text-sm font-semibold text-zinc-900 dark:text-white">Campanha Pública</span>
                            <span className="text-xs text-zinc-500 dark:text-zinc-400">
                              {formData.is_public 
                                ? 'Visível para todos os colaboradores do app' 
                                : 'Visível apenas para os participantes selecionados'}
                            </span>
                          </div>
                        </label>
                      </div>

                      {/* Card de Prêmio da Campanha */}
                      <div className="pt-2">
                        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">Prêmio da Campanha (Opcional)</label>
                        <div className={`p-4 rounded-2xl border-2 border-dashed transition-all flex flex-col items-center justify-center min-h-[140px] ${formData.reward_id ? 'border-primary-500 bg-primary-50/30 dark:bg-primary-900/10' : 'border-zinc-200 dark:border-zinc-700'}`}>
                          {(() => {
                            const selectedReward = rewards.find(r => r.id === formData.reward_id);
                            if (selectedReward) {
                              return (
                                <div className="flex flex-col items-center text-center space-y-2 w-full">
                                  <div className="w-16 h-16 rounded-xl overflow-hidden border border-primary-200 dark:border-primary-800 shadow-sm bg-white dark:bg-zinc-800">
                                    {selectedReward.images?.[0]?.image_full_url ? (
                                      <img src={selectedReward.images[0].image_full_url} alt={selectedReward.name} className="w-full h-full object-cover" />
                                    ) : <div className="w-full h-full flex items-center justify-center text-zinc-300"><ShoppingBag /></div>}
                                  </div>
                                  <div>
                                    <p className="text-sm font-bold text-zinc-900 dark:text-white">{selectedReward.name}</p>
                                    <div className="flex gap-3 justify-center mt-1">
                                      <button type="button" onClick={() => setIsRewardModalOpen(true)} className="text-[10px] font-bold text-primary-600 dark:text-primary-400 hover:underline uppercase">Trocar</button>
                                      <button type="button" onClick={() => setFormData({ ...formData, reward_id: '' })} className="text-[10px] font-bold text-red-500 hover:underline uppercase">Remover</button>
                                    </div>
                                  </div>
                                </div>
                              );
                            }
                            return (
                              <div className="text-center space-y-2">
                                <div className="w-10 h-10 bg-zinc-100 dark:bg-zinc-800 rounded-full flex items-center justify-center mx-auto text-zinc-400"><Gift size={20} /></div>
                                <p className="text-xs text-zinc-500 dark:text-zinc-400">Nenhum prêmio vinculado</p>
                                <button type="button" onClick={() => setIsRewardModalOpen(true)} className="px-4 py-1.5 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-lg text-[10px] font-bold hover:opacity-90 transition-all">Vincular Prêmio</button>
                              </div>
                            );
                          })()}
                        </div>
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
                            className="w-full pl-10 pr-4 py-2.5 border border-zinc-300 dark:border-zinc-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-500"
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
                                : 'bg-primary-600 text-white border-primary-500 hover:bg-primary-700 shadow-primary-500/20'
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
                            {roles.map((roleObj) => {
                              const role = roleObj.description;
                              return (
                                <button
                                  key={role}
                                  onClick={() => handleSelectAllByRole(role)}
                                  disabled={selectByRoleLoading !== null}
                                  className={`px-3 py-1.5 text-xs font-semibold rounded-full transition-all flex items-center gap-1.5 border ${
                                    areAllUsersSelectedByRole(role)
                                      ? 'bg-primary-100 text-primary-700 border-primary-300 dark:bg-primary-900/40 dark:text-primary-300 dark:border-primary-700'
                                      : 'bg-white text-zinc-600 border-zinc-200 hover:border-primary-300 dark:bg-zinc-800 dark:text-zinc-400 dark:border-zinc-700'
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
                              );
                            })}
                          </div>
                        </div>
                      </div>

                      {loadingAux ? (
                        <div className="flex justify-center py-8">
                          <Loader2 className="w-6 h-6 text-primary-600 animate-spin" />
                        </div>
                      ) : users.length === 0 ? (
                        <p className="text-center text-zinc-500 dark:text-zinc-400 py-8">Nenhum usuário encontrado.</p>
                      ) : (
                        <>
                          {/* Contador de selecionados */}
                          <div className="mb-3 p-3 bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-800 rounded-xl">
                            <p className="text-sm font-semibold text-primary-700 dark:text-primary-400">
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
                                    ? 'bg-primary-50 dark:bg-primary-900/20 border-primary-500 shadow-md'
                                    : 'bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 hover:border-primary-300 dark:hover:border-primary-700 hover:shadow-sm'
                                }`}
                              >
                                <div className="flex items-start gap-3">
                                  {/* Avatar */}
                                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary-100 to-teal-100 dark:from-primary-900/30 dark:to-teal-900/30 border-2 border-primary-200 dark:border-primary-800 flex items-center justify-center text-primary-600 dark:text-primary-400 overflow-hidden flex-shrink-0">
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
                                      <p className="text-[10px] font-semibold text-primary-600 dark:text-primary-400 uppercase tracking-wider mb-0.5">
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
                                      ? 'bg-primary-500 border-primary-500'
                                      : 'border-zinc-300 dark:border-zinc-600 group-hover:border-primary-400'
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
                                      ? 'bg-primary-100 text-primary-800 border-primary-200 dark:bg-primary-900/30 dark:text-primary-400 dark:border-primary-800'
                                      : 'bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-900/20 dark:text-teal-400 dark:border-teal-800'
                                  }`}>
                                    <Shield size={10} className="mr-1" />
                                    {user.user_type_id === 1 ? 'Administrador' : 'Colaborador'}
                                  </span>
                                  {user.coin_balance !== undefined && user.coin_balance > 0 && (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800">
                                      <Coins size={10} />
                                      {user.coin_balance.toLocaleString('pt-BR')} {coinName}
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
                          ? `Selecione as ações e defina quantos ${coinName} serão ganhos (obrigatório para campanhas de engajamento):`
                          : `Selecione as ações e defina quantos ${coinName} serão ganhos:`}
                      </p>

                      {/* Mensagem de Erro de Validação de Ações */}
                      {formErrors.actions && (
                        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 mb-4">
                          <p className="text-sm text-red-700 dark:text-red-400 font-semibold flex items-center gap-2">
                            ⚠️ {formErrors.actions}
                          </p>
                        </div>
                      )}

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

                      <div className="grid gap-3 max-h-80 overflow-y-auto mt-4">
                        {loadingEngagementActions ? (
                          <div className="flex flex-col items-center justify-center py-8">
                            <Loader2 className="w-6 h-6 text-primary-600 animate-spin mb-2" />
                            <p className="text-sm text-zinc-500 dark:text-zinc-400">Carregando ações...</p>
                          </div>
                        ) : engagementActions.length === 0 ? (
                          <div className="text-center py-8 text-zinc-500 dark:text-zinc-400">
                            <p className="text-sm">Clique aqui para carregar as ações de engajamento.</p>
                          </div>
                        ) : (
                          engagementActions
                            .filter(action => {
                              const actionLabel = actionLabels[action.name] || action.name;
                              return actionLabel.toLowerCase().includes(actionSearch.toLowerCase());
                            })
                            .map((action) => {
                              const actionCampaignId = action.campaign?.id || (action as any).campaign_id;
                              // Uma ação está "em uso em outra" se in_use for true E o ID da campanha vinculada for diferente da que estamos editando
                              const isUsedInAnotherCampaign = action.in_use && (!!actionCampaignId && Number(actionCampaignId) !== Number(editingCampaign?.id));
                              const isDisabled = isUsedInAnotherCampaign && !manuallyUnselectedActions.includes(action.id);
                              const campaignName = action.campaign?.name || (action as any).campaign_name;
                              const isSelected = selectedActions.find(a => a.id === action.id);
                              const actionLabel = actionLabels[action.name] || action.name;
                              
                              // Permite desmarcar ações já selecionadas, mesmo que estejam em uso em outra campanha
                              const canToggle = isSelected || !isDisabled;

                              return (
                                <div
                                  key={action.id}
                                  className={`flex items-center justify-between p-3 rounded-lg border transition-all ${
                                    isSelected
                                      ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-500'
                                      : isDisabled
                                        ? 'bg-zinc-50 dark:bg-zinc-800/50 border-zinc-200 dark:border-zinc-700 opacity-60'
                                        : 'bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 hover:border-amber-300 dark:hover:border-amber-700'
                                  }`}
                                >
                                  <button
                                    onClick={() => canToggle && toggleAction(action.id)}
                                    disabled={!canToggle}
                                    className="flex items-center gap-3 flex-1 text-left disabled:cursor-not-allowed"
                                  >
                                    <div className={`w-5 h-5 rounded border flex items-center justify-center ${
                                      isSelected
                                        ? 'bg-amber-500 border-amber-500'
                                        : 'border-zinc-300 dark:border-zinc-600'
                                    }`}>
                                      {isSelected && <Check size={14} className="text-white" />}
                                    </div>
                                    <div className="flex-1">
                                      <p className={`font-medium text-sm ${
                                        isDisabled && !isSelected ? 'text-zinc-500 dark:text-zinc-400' : 'text-zinc-900 dark:text-white'
                                      }`}>
                                        {actionLabel}
                                      </p>
                                      {isDisabled && campaignName && !isSelected && Number(actionCampaignId) !== Number(editingCampaign?.id) && (
                                        <p className="text-xs text-red-500 dark:text-red-400 mt-0.5 flex items-center gap-1">
                                          <span>🚫</span> Em uso em: {campaignName}
                                        </p>
                                      )}
                                    </div>
                                  </button>
                                  {isSelected && (
                                    <div className="flex items-center gap-2">
                                      <span className="text-xs text-zinc-500 dark:text-zinc-400">
                                        {coinName.charAt(0).toUpperCase() + coinName.slice(1)}:
                                      </span>
                                      <input
                                        type="number"
                                        min="0"
                                        max="999"
                                        inputMode="numeric"
                                        value={actionCoinsInputs[action.id] ?? (selectedActions.find(a => a.id === action.id)?.coins ?? 0)}
                                        onKeyDown={(e) => {
                                          if (e.key === '-' || e.key === '+' || e.key === 'e' || e.key === 'E' || e.key === ',' || e.key === '.') {
                                            e.preventDefault();
                                          }
                                        }}
                                        onChange={(e) => {
                                          const val = e.target.value;
                                          if (val === '') {
                                            setActionCoinsInputs(prev => ({ ...prev, [action.id]: val }));
                                            return;
                                          }
                                          if (/^\d*$/.test(val)) {
                                            const numVal = parseInt(val);
                                            if (numVal <= 999) {
                                              setActionCoinsInputs(prev => ({ ...prev, [action.id]: val }));
                                            }
                                          }
                                        }}
                                        onBlur={(e) => {
                                          const val = e.target.value.trim();
                                          if (val === '') {
                                            setActionCoinsInputs(prev => ({ ...prev, [action.id]: '0' }));
                                            updateActionCoins(action.id, 0);
                                            return;
                                          }
                                          let numVal = parseInt(val);
                                          if (isNaN(numVal) || numVal < 0) {
                                            numVal = 0;
                                            addToast('warning', 'Apenas valores positivos são permitidos.');
                                          } else if (numVal > 999) {
                                            numVal = 999;
                                            addToast('warning', 'O valor máximo permitido é 999.');
                                          }
                                          
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
                            })
                        )}
                      </div>
                    </div>
                  )}

                  {activeTab === 'hashtags' && (
                    <div className="space-y-6">
                      <div className="flex items-center gap-2 mb-4">
                        <Hash className="text-primary-600 dark:text-primary-400" size={20} />
                        <h3 className="text-lg font-bold text-zinc-900 dark:text-white">Hashtags da Campanha</h3>
                      </div>
                      
                      <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-4">
                        Adicione hashtags para que os usuários ganhem {coinName} ao usá-las em seus posts:
                      </p>

                      <div className="flex flex-col sm:flex-row gap-3 mb-6">
                        <div className="flex-1 relative">
                          <input
                            type="text"
                            placeholder="Ex: #vendas"
                            value={newHashtag}
                            onChange={(e) => {
                              let val = e.target.value;
                              if (val && !val.startsWith('#')) val = '#' + val;
                              // Remove espaços e caracteres especiais (permite apenas #, letras, números e _)
                              setNewHashtag(val.replace(/\s/g, '').replace(/[^\w#]/g, ''));
                            }}
                            className="w-full px-4 py-2.5 border border-zinc-300 dark:border-zinc-600 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white"
                          />                        </div>
                        <div className="w-full sm:w-32 relative">
                          <Coins className="absolute left-3 top-1/2 -translate-y-1/2 text-amber-500" size={18} />
                          <input
                            type="number"
                            placeholder="Coins"
                            value={newHashtagCoins}
                            onKeyDown={(e) => {
                              if (e.key === '-' || e.key === '+' || e.key === 'e' || e.key === 'E' || e.key === ',' || e.key === '.') {
                                e.preventDefault();
                              }
                            }}
                            onChange={(e) => {
                              const val = e.target.value;
                              if (val === '') {
                                setNewHashtagCoins(val);
                                return;
                              }
                              if (/^\d*$/.test(val)) {
                                const numVal = parseInt(val);
                                if (numVal <= 999) {
                                  setNewHashtagCoins(val);
                                }
                              }
                            }}
                            onBlur={() => {
                              if (newHashtagCoins !== '') {
                                const numVal = parseInt(newHashtagCoins);
                                if (numVal > 999) {
                                  setNewHashtagCoins('999');
                                  addToast('warning', 'O valor máximo permitido é 999.');
                                }
                              }
                            }}
                            className="w-full pl-10 pr-4 py-2.5 border border-zinc-300 dark:border-zinc-600 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white"
                            min="0"
                            max="999"
                            inputMode="numeric"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={handleAddHashtag}
                          className="px-6 py-2.5 bg-primary-600 text-white rounded-xl font-bold hover:bg-primary-700 transition-all flex items-center justify-center gap-2 whitespace-nowrap shadow-lg shadow-primary-500/20"
                        >
                          {checkingHashtag ? <Loader2 size={18} className="animate-spin" /> : <Plus size={18} />}
                          Adicionar
                        </button>
                      </div>

                      {/* Listagem de Hashtags em uso (Informacional) */}
                      {allExistingHashtags.length > 0 && (
                        <div className="mb-6 p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-2xl border border-zinc-200 dark:border-zinc-700">
                          <h4 className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                            <AlertCircle size={14} className="text-amber-500" />
                            Hashtags já cadastradas:
                          </h4>
                          <div className="flex flex-wrap gap-2">
                            {allExistingHashtags.map((h, i) => {
                              const hashtagCampaignId = h.campaign?.id || h.campaign_id;
                              const isCurrentCampaign = editingCampaign && Number(hashtagCampaignId) === Number(editingCampaign.id);
                              
                              return (
                                <div key={i} className={`px-3 py-1.5 rounded-lg text-xs border transition-all ${
                                  isCurrentCampaign 
                                  ? 'bg-primary-50 dark:bg-primary-900/20 border-primary-200 dark:border-primary-800 text-primary-700 dark:text-primary-300'
                                  : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-400 dark:text-zinc-500'
                                }`}>
                                  <span className="font-bold mr-2">{h.hashtag}</span>
                                  <span className={`${isCurrentCampaign ? 'text-primary-500' : 'text-zinc-400 dark:text-zinc-600'} text-[10px] italic`}>
                                    {isCurrentCampaign ? 'Utilizado nessa campanha' : (h.campaign?.name || 'Campanha Ativa')}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {selectedHashtags.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                          {selectedHashtags.map((h, index) => (
                            <motion.div
                              key={index}
                              initial={{ opacity: 0, scale: 0.9 }}
                              animate={{ opacity: 1, scale: 1 }}
                              className="flex items-center justify-between p-3 bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-800 rounded-xl group"
                            >
                              <div className="flex flex-col">
                                <span className="font-bold text-primary-700 dark:text-primary-300">{h.hashtag}</span>
                                <span className="text-xs text-amber-600 dark:text-amber-500 flex items-center gap-1">
                                  <Coins size={12} />
                                  {h.coins} {coinName}
                                </span>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleRemoveHashtag(h.hashtag)}
                                className="p-1.5 text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-all"
                              >
                                <Trash2 size={16} />
                              </button>
                            </motion.div>
                          ))}
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center py-8 px-4 border-2 border-dashed border-zinc-200 dark:border-zinc-700 rounded-2xl bg-zinc-50/50 dark:bg-zinc-800/30">
                          <AlertCircle className="text-zinc-300 dark:text-zinc-600 mb-2" size={32} />
                          <p className="text-sm text-zinc-500 dark:text-zinc-400 text-center">
                            Nenhuma hashtag adicionada para esta campanha.
                          </p>
                        </div>
                      )}
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
                          <Loader2 className="w-6 h-6 text-primary-600 animate-spin" />
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

                          {/* Seleção Rápida */}
                          <div className="border-t border-zinc-200 dark:border-zinc-700 pt-5 mb-4 space-y-4">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                              <p className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-widest">
                                🛒 Seleção Rápida
                              </p>
                              <button
                                onClick={handleSelectAllProducts}
                                disabled={loadingSelectAllProducts}
                                className={`px-4 py-2 text-sm font-bold rounded-xl transition-all flex items-center justify-center gap-2 shadow-sm border ${
                                  selectedProducts.length > 0
                                    ? 'bg-red-50 text-red-600 border-red-200 hover:bg-red-100 dark:bg-red-900/20 dark:border-red-800 dark:text-red-400'
                                    : 'bg-blue-600 text-white border-blue-500 hover:bg-blue-700 shadow-blue-500/20'
                                } disabled:opacity-50 disabled:cursor-not-allowed`}
                              >
                                {loadingSelectAllProducts ? (
                                  <>
                                    <Loader2 size={16} className="animate-spin" />
                                    <span>Processando...</span>
                                  </>
                                ) : (
                                  <>
                                    {selectedProducts.length > 0 ? <X size={18} /> : <ShoppingBag size={18} />}
                                    {selectedProducts.length > 0 ? 'Desmarcar Todos' : 'Selecionar Todos'}
                                  </>
                                )}
                              </button>
                            </div>

                            {manufacturers.length > 0 && (
                              <div className="bg-zinc-50 dark:bg-zinc-800/50 p-3 rounded-2xl border border-zinc-100 dark:border-zinc-800">
                                <p className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 mb-3 uppercase">
                                  Filtrar por Fabricante
                                </p>
                                <div className="flex flex-wrap gap-2">
                                  {manufacturers.map((manufacturer) => (
                                    <button
                                      key={manufacturer.id}
                                      onClick={() => handleSelectAllByManufacturer(manufacturer.id, manufacturer.name)}
                                      disabled={selectByManufacturerLoading !== null}
                                      className={`px-3 py-1.5 text-xs font-semibold rounded-full transition-all flex items-center gap-1.5 border ${
                                        areAllProductsSelectedByManufacturer(manufacturer.id)
                                          ? 'bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-900/40 dark:text-blue-300 dark:border-blue-700'
                                          : 'bg-white text-zinc-600 border-zinc-200 hover:border-blue-300 dark:bg-zinc-800 dark:text-zinc-400 dark:border-zinc-700'
                                      } disabled:opacity-50 disabled:cursor-not-allowed`}
                                    >
                                      {selectByManufacturerLoading === manufacturer.name ? (
                                        <Loader2 size={12} className="animate-spin" />
                                      ) : (
                                        <>
                                          {areAllProductsSelectedByManufacturer(manufacturer.id) ? <Check size={12} /> : <Plus size={12} />}
                                          {manufacturer.name}
                                        </>
                                      )}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>

                          {loadingAux ? (
                            <div className="flex justify-center py-8">
                              <Loader2 className="w-6 h-6 text-primary-600 animate-spin" />
                            </div>
                          ) : products.length === 0 ? (
                            <p className="text-center text-zinc-500 dark:text-zinc-400 py-8">Nenhum produto encontrado.</p>
                          ) : (
                            <>
                              {/* Contador de selecionados */}
                              <div className="mb-3 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl">
                                <p className="text-sm font-semibold text-blue-700 dark:text-blue-400">
                                  🛒 {selectedProducts.length} produto(s) selecionado(s)
                                </p>
                              </div>

                              {/* Grid de Cards de Produtos */}
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pr-2">
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
                                      <div className={`w-12 h-12 rounded-xl border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                                        selectedProducts.includes(product.id)
                                          ? 'bg-blue-500 border-blue-400 text-white'
                                          : 'bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-900/30 dark:to-indigo-900/30 border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400'
                                      }`}>
                                        <ShoppingBag size={24} />
                                      </div>

                                      {/* Informações */}
                                      <div className="flex-1 min-w-0">
                                        <p className="font-bold text-sm text-zinc-900 dark:text-white truncate">
                                          {product.name}
                                        </p>
                                        <div className="flex flex-wrap gap-x-2 gap-y-0.5 mt-1">
                                          {product.barcode && (
                                            <span className="text-[10px] font-medium text-zinc-500 dark:text-zinc-400 flex items-center gap-1">
                                              <div className="w-1 h-1 rounded-full bg-zinc-400" />
                                              EAN: {product.barcode}
                                            </span>
                                          )}
                                          {product.manufacturer && (
                                            <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 flex items-center gap-1">
                                              <div className="w-1 h-1 rounded-full bg-blue-500" />
                                              {product.manufacturer.name}
                                            </span>
                                          )}
                                        </div>
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
                                      type="button"
                                      onClick={() => fetchProducts(productsPage - 1, productSearch, productFilterType, productManufacturerFilter)}
                                      disabled={productsPage === 1}
                                      className="p-2 border border-zinc-300 dark:border-zinc-600 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed text-zinc-600 dark:text-zinc-400 text-sm"
                                    >
                                      Anterior
                                    </button>
                                    <span className="text-sm text-zinc-600 dark:text-zinc-400 font-medium">
                                      Página {productsPage} de {productsTotalPages}
                                    </span>
                                    <button
                                      type="button"
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
                          </>
                        )}
                      </div>
                    )}
                  </div>

                {/* Footer Actions */}
                <div className="p-6 border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/50 flex flex-wrap gap-3 flex-shrink-0">
                  {/* Botão Voltar */}
                  {activeTab !== 'basic' ? (
                    <button
                      type="button"
                      onClick={() => setActiveTab(prev => {
                        if (prev === 'users') return 'basic';
                        if (prev === 'actions' || prev === 'products') return 'users';
                        return 'basic';
                      })}
                      className="px-4 py-2.5 border border-zinc-300 dark:border-zinc-600 text-zinc-700 dark:text-zinc-300 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors font-medium"
                    >
                      Voltar
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleCloseModal}
                      className="px-4 py-2.5 border border-zinc-300 dark:border-zinc-600 text-zinc-700 dark:text-zinc-300 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors font-medium"
                    >
                      Cancelar
                    </button>
                  )}

                  {/* Botão Importar Vendas - visível apenas para Admin em campanhas de Vendas no modo edição */}
                  {editingCampaign && editingCampaign.type === 'sales' && currentUser?.user_type_id === 1 && (
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => handleOpenImportHistory(editingCampaign)}
                        className="px-4 py-2.5 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-xl hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors font-medium flex items-center gap-2 shadow-sm"
                        title="Ver histórico de importações de vendas"
                      >
                        <Clock size={20} />
                        Histórico
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setImportingCampaign(editingCampaign);
                          setIsImportModalOpen(true);
                        }}
                        className="px-4 py-2.5 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors font-medium flex items-center gap-2 shadow-sm"
                        title="Importar vendas por arquivo XLSX ou CSV"
                      >
                        <FileSpreadsheet size={20} />
                        Importar Vendas
                      </button>
                    </div>
                  )}
                  <div className="flex-1 flex gap-3 justify-end">
                    {/* Botão Próximo (apenas se não for a última aba) */}
                    {((activeTab === 'basic' || activeTab === 'users')) && (
                      <button
                        type="button"
                        onClick={() => {
                          if (activeTab === 'basic') setActiveTab('users');
                          else if (activeTab === 'users') {
                            const isEngagement = editingCampaign?.type === 'engagement' || (!editingCampaign && formData.type === 'engagement');
                            setActiveTab(isEngagement ? 'actions' : 'products');
                          }
                        }}
                        className="px-6 py-2.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-white border border-zinc-200 dark:border-zinc-700 rounded-xl hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors font-bold flex items-center gap-2"
                      >
                        Próximo
                        <ChevronRight size={18} />
                      </button>
                    )}

                    {/* Botão Salvar (Sempre visível) */}
                    <button
                      type="button"
                      onClick={handleSubmit}
                      disabled={saving}
                      className="px-8 py-2.5 bg-primary-600 text-white rounded-xl hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-bold flex items-center gap-2 shadow-lg shadow-primary-500/20"
                    >
                      {saving ? (
                        <>
                          <Loader2 size={20} className="animate-spin" />
                          <span>Salvando...</span>
                        </>
                      ) : (
                        <>
                          <Save size={20} />
                          <span>{editingCampaign ? 'Salvar Alterações' : 'Criar Campanha'}</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Modal de Seleção de Recompensa */}
        <AnimatePresence>
          {isRewardModalOpen && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white dark:bg-zinc-900 rounded-3xl shadow-2xl w-full max-w-4xl overflow-hidden border border-zinc-200 dark:border-zinc-800 flex flex-col max-h-[90vh]"
              >
                <div className="p-6 border-b border-zinc-100 dark:border-zinc-800 flex justify-between items-center bg-zinc-50/50 dark:bg-zinc-800/50">
                  <h3 className="text-xl font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                    <Gift className="text-primary-500" />
                    Selecionar Prêmio
                  </h3>
                  <button onClick={() => setIsRewardModalOpen(false)} className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300">
                    <X size={24} />
                  </button>
                </div>

                <div className="p-6 flex-1 overflow-y-auto space-y-6">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={20} />
                    <input
                      type="text"
                      placeholder="Buscar prêmio por nome..."
                      className="w-full pl-10 pr-4 py-3 border border-zinc-200 dark:border-zinc-700 rounded-2xl bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white outline-none focus:ring-2 focus:ring-primary-500"
                      value={rewardSearch}
                      onChange={(e) => setRewardSearch(e.target.value)}
                    />
                  </div>

                  {loadingRewards ? (
                    <div className="flex justify-center py-12"><Loader2 className="animate-spin text-primary-500" size={40} /></div>
                  ) : rewards.length === 0 ? (
                    <div className="text-center py-12 text-zinc-500">Nenhum prêmio encontrado.</div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                      {rewards.map(reward => (
                        <button
                          key={reward.id}
                          type="button"
                          onClick={() => {
                            setFormData({ ...formData, reward_id: reward.id });
                            setIsRewardModalOpen(false);
                          }}
                          className={`group relative flex flex-col p-3 rounded-2xl border-2 transition-all ${
                            formData.reward_id === reward.id
                              ? 'bg-primary-50 dark:bg-primary-900/20 border-primary-500 shadow-md'
                              : 'bg-white dark:bg-zinc-800 border-zinc-100 dark:border-zinc-800 hover:border-primary-300'
                          }`}
                        >
                          {/* Badge de Tipo */}
                          <div className="absolute top-2 left-2 z-10 flex flex-col gap-1">
                            {reward.fulfillment_type === 'voucher' && (
                              <span className="bg-blue-500/90 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-md backdrop-blur-sm">
                                🎫 Voucher
                              </span>
                            )}
                            {reward.fulfillment_type === 'physical' && (
                              <span className="bg-green-500/90 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-md backdrop-blur-sm">
                                📦 Físico
                              </span>
                            )}
                            {reward.is_expired && (
                              <span className="bg-red-500/90 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-md backdrop-blur-sm">
                                ⚠️ Expirado
                              </span>
                            )}
                          </div>

                          <div className="aspect-square rounded-xl bg-zinc-100 dark:bg-zinc-900 mb-2 overflow-hidden border border-zinc-200 dark:border-zinc-700">
                            {reward.images?.[0]?.image_full_url ? (
                              <img src={reward.images[0].image_full_url} alt={reward.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform" />
                            ) : <div className="w-full h-full flex items-center justify-center text-zinc-400"><ShoppingBag size={24} /></div>}
                          </div>
                          <p className="text-xs font-bold text-zinc-900 dark:text-white line-clamp-2 text-center mb-1">{reward.name}</p>
                          
                          {/* Validade */}
                          {reward.valid_until && (
                            <p className={`text-[10px] text-center mb-1 ${reward.is_expired ? 'text-red-500 dark:text-red-400' : 'text-amber-600 dark:text-amber-400'}`}>
                              {reward.is_expired ? '⚠️ Expirado' : '📅'} {new Date(reward.valid_until).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}
                            </p>
                          )}

                          <p className="text-[10px] text-zinc-500 dark:text-zinc-400 text-center">
                            {reward.stock > 0 ? `${reward.stock} disp.` : 'Esgotado'}
                          </p>

                          {formData.reward_id === reward.id && (
                            <div className="absolute top-2 right-2 bg-primary-500 text-white p-1 rounded-full shadow-lg"><Check size={12} /></div>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {rewardsTotalPages > 1 && (
                  <div className="p-4 border-t border-zinc-100 dark:border-zinc-800 flex justify-center gap-4">
                    <button type="button" onClick={() => fetchRewardsPaginated(rewardsPage - 1, rewardSearch)} disabled={rewardsPage === 1} className="p-2 border rounded-lg disabled:opacity-50"><ChevronLeft /></button>
                    <span className="flex items-center text-sm font-medium">Página {rewardsPage} de {rewardsTotalPages}</span>
                    <button type="button" onClick={() => fetchRewardsPaginated(rewardsPage + 1, rewardSearch)} disabled={rewardsPage === rewardsTotalPages} className="p-2 border rounded-lg disabled:opacity-50"><ChevronRight /></button>
                  </div>
                )}
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
                      <Loader2 className="w-8 h-8 text-primary-600 animate-spin" />
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
                                isTop3 ? 'text-primary-600 dark:text-primary-400' : 'text-zinc-700 dark:text-zinc-300'
                              }`}>
                                {rankingModal.campaign?.type === 'sales'
                                  ? formatCurrency(String(salesAmount !== null ? salesAmount : item.value || 0))
                                  : `${coinsTotal !== null ? coinsTotal : item.value || 0} ${coinName}`
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

      {/* Modal de Importação de Vendas */}
      <AnimatePresence>
        {isImportModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onClick={handleCloseImportModal}
              className="absolute inset-0"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden border border-zinc-200 dark:border-zinc-800 z-10"
            >
              {/* Header */}
              <div className="p-6 border-b border-zinc-100 dark:border-zinc-800 flex justify-between items-center">
                <div>
                  <h2 className="text-xl font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                    <FileSpreadsheet className="text-primary-600" size={24} />
                    Importar Vendas
                  </h2>
                  {importingCampaign && (
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                      Campanha: {importingCampaign.name}
                    </p>
                  )}
                </div>
                <button
                  onClick={handleCloseImportModal}
                  disabled={importing}
                  className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors disabled:opacity-50"
                >
                  <X size={24} />
                </button>
              </div>

              {/* Content */}
              <div className="p-6">
                {importStep === 'upload' && (
                  <div className="space-y-6">
                    {/* Guia de Formato */}
                    <div className="bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-xl p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider flex items-center gap-2">
                          <Info size={16} className="text-primary-600 dark:text-primary-400" />
                          Formato do Arquivo
                        </h4>
                        <button
                          onClick={handleDownloadTemplate}
                          className="text-xs font-bold text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200 flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-zinc-800 rounded-lg shadow-sm border border-zinc-200 dark:border-zinc-700 transition-all"
                        >
                          <Download size={14} />
                          Baixar Modelo
                        </button>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-[11px] text-left border-collapse">
                          <thead>
                            <tr className="border-b border-zinc-200 dark:border-zinc-700 text-zinc-500 dark:text-zinc-400">
                              <th className="pb-2 pr-4 font-bold uppercase">Coluna</th>
                              <th className="pb-2 pr-4 font-bold uppercase">Exemplo</th>
                              <th className="pb-2 font-bold uppercase">Descrição</th>
                            </tr>
                          </thead>
                          <tbody className="text-zinc-700 dark:text-zinc-300">
                            <tr className="border-b border-zinc-100 dark:border-zinc-800">
                              <td className="py-2 pr-4 font-mono font-bold">id_externo</td>
                              <td className="py-2 pr-4 italic">ABC123</td>
                              <td className="py-2">Código externo da loja/vendedor (Mapeia para external_id).</td>
                            </tr>
                            <tr className="border-b border-zinc-100 dark:border-zinc-800">
                              <td className="py-2 pr-4 font-mono font-bold">cod_barras</td>
                              <td className="py-2 pr-4 italic">7896004710011</td>
                              <td className="py-2">EAN/Código de barras do produto (Mapeia para barcode).</td>
                            </tr>
                            <tr className="border-b border-zinc-100 dark:border-zinc-800">
                              <td className="py-2 pr-4 font-mono font-bold">data_venda</td>
                              <td className="py-2 pr-4 italic">2026-03-15</td>
                              <td className="py-2">Data da venda (AAAA-MM-DD) (Mapeia para sale_date).</td>
                            </tr>
                            <tr className="border-b border-zinc-100 dark:border-zinc-800">
                              <td className="py-2 pr-4 font-mono font-bold">valor</td>
                              <td className="py-2 pr-4 italic">10.00</td>
                              <td className="py-2 text-red-600 dark:text-red-400 font-medium">Valor com ponto (ex: 10.00). Não use vírgula.</td>
                            </tr>
                            <tr>
                              <td className="py-2 pr-4 font-mono font-bold">id_transacao</td>
                              <td className="py-2 pr-4 italic">TXN789456</td>
                              <td className="py-2">ID único da transação (Mapeia para id_transaction).</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                      

                      {/* Exemplo Prático */}
                      <div className="mt-4">
                        <h5 className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase mb-2">Exemplo no Bloco de Notas:</h5>
                        <div className="bg-zinc-900 dark:bg-black p-3 rounded-lg border border-zinc-800 font-mono text-[10px] text-zinc-300 overflow-x-auto whitespace-pre">
{`id_externo,cod_barras,data_venda,valor,id_transacao
ABC123,7896004710011,2026-03-15,10.00,TXN001
ABC123,7896004710011,2026-03-05,15.00,TXN002
ABC124,7891058001023,2026-03-27,10.10,TXN003
ABC124,7891058001023,2026-04-01,1.50,TXN004
ABC125,7896004710011,2026-03-04,120.72,TXN005
ABC125,7891058001023,2026-03-22,35.08,TXN006`}
                        </div>
                      </div>
                    </div>

                    <div 
                      className={`border-2 border-dashed rounded-2xl p-10 flex flex-col items-center justify-center transition-all cursor-pointer relative ${
                        isDragging 
                          ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 scale-[1.02]' 
                          : 'border-zinc-300 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800/50'
                      }`}
                      onClick={() => document.getElementById('file-upload-input')?.click()}
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                    >
                      <input
                        id="file-upload-input"
                        type="file"
                        className="hidden"
                        accept=".xlsx, .xls"
                        onChange={handleFileChange}
                      />
                      {importing ? (
                        <div className="flex flex-col items-center">
                          <Loader2 className="text-primary-600 animate-spin mb-3" size={48} />
                          <p className="text-zinc-600 dark:text-zinc-400 font-medium">Lendo arquivo...</p>
                        </div>
                      ) : (
                        <>
                          <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 transition-colors ${
                            isDragging 
                              ? 'bg-primary-200 dark:bg-primary-800 text-primary-700' 
                              : 'bg-primary-100 dark:bg-primary-900/30 text-primary-600'
                          }`}>
                            <Upload size={32} />
                          </div>
                          <h3 className="text-lg font-bold text-zinc-900 dark:text-white mb-1">
                            {isDragging ? 'Solte o arquivo para importar' : 'Clique ou arraste o arquivo'}
                          </h3>
                          <p className="text-sm text-zinc-500 dark:text-zinc-400 text-center">Formatos suportados: Excel (.xlsx, .xls) - Máx: 10MB</p>
                        </>
                      )}
                    </div>
                  </div>
                )}

                {importStep === 'review' && (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 text-green-600 rounded-xl flex items-center justify-center">
                          <FileText size={24} />
                        </div>
                        <div>
                          <h3 className="font-bold text-zinc-900 dark:text-white">Arquivo pronto</h3>
                          <p className="text-sm text-zinc-500 dark:text-zinc-400">{parsedImportRows.length} registros encontrados</p>
                        </div>
                      </div>
                      <button 
                        onClick={() => setImportStep('upload')}
                        className="text-sm font-medium text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
                      >
                        Alterar arquivo
                      </button>
                    </div>

                    <div className="bg-amber-50 dark:bg-amber-900/10 p-4 rounded-xl border border-amber-100 dark:border-amber-900/30">
                      <p className="text-sm text-amber-700 dark:text-amber-400 leading-relaxed">
                        <strong>Confirmação necessária:</strong> Ao clicar em "Iniciar Processamento", as vendas serão vinculadas à campanha <strong>{importingCampaign?.name}</strong>. O envio será feito em lotes automáticos para garantir a segurança dos dados.
                      </p>
                    </div>

                    <div className="border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden">
                      <div className="max-h-64 overflow-y-auto">
                        <table className="w-full text-left text-sm border-collapse">
                          <thead className="bg-zinc-50 dark:bg-zinc-800/50 sticky top-0">
                            <tr>
                              <th className="px-4 py-2 font-bold text-zinc-900 dark:text-white border-b border-zinc-200 dark:border-zinc-800">External ID</th>
                              <th className="px-4 py-2 font-bold text-zinc-900 dark:text-white border-b border-zinc-200 dark:border-zinc-800">Barcode</th>
                              <th className="px-4 py-2 font-bold text-zinc-900 dark:text-white border-b border-zinc-200 dark:border-zinc-800">Data</th>
                              <th className="px-4 py-2 font-bold text-zinc-900 dark:text-white border-b border-zinc-200 dark:border-zinc-800">Valor</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                            {parsedImportRows.slice(0, 10).map((row, idx) => (
                              <tr key={idx} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/30">
                                <td className="px-4 py-2 text-zinc-600 dark:text-zinc-400">{row.external_id}</td>
                                <td className="px-4 py-2 text-zinc-600 dark:text-zinc-400">{row.barcode}</td>
                                <td className="px-4 py-2 text-zinc-600 dark:text-zinc-400">{row.sale_date}</td>
                                <td className="px-4 py-2 text-zinc-600 dark:text-zinc-400">{row.amount}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      {parsedImportRows.length > 10 && (
                        <div className="px-4 py-2 bg-zinc-50 dark:bg-zinc-800/50 text-xs text-zinc-500 dark:text-zinc-400 text-center border-t border-zinc-200 dark:border-zinc-800">
                          Exibindo as primeiras 10 de {parsedImportRows.length} linhas
                        </div>
                      )}
                    </div>

                    <div className="flex gap-3">
                      <button
                        onClick={handleCloseImportModal}
                        className="flex-1 px-4 py-3 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-xl hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors font-bold"
                      >
                        Cancelar
                      </button>
                      <button
                        onClick={handleImportFile}
                        className="flex-[2] px-4 py-3 bg-primary-600 text-white rounded-xl hover:bg-primary-700 transition-all font-bold shadow-lg shadow-primary-600/20 flex items-center justify-center gap-2"
                      >
                        <CheckCircle2 size={20} />
                        Iniciar Processamento
                      </button>
                    </div>
                  </div>
                )}

                {importStep === 'importing' && (
                  <div className="py-8 space-y-6 text-center">
                    <div className="relative w-32 h-32 mx-auto">
                      <svg className="w-full h-full transform -rotate-90">
                        <circle
                          cx="64"
                          cy="64"
                          r="58"
                          stroke="currentColor"
                          strokeWidth="8"
                          fill="transparent"
                          className="text-zinc-100 dark:text-zinc-800"
                        />
                        <circle
                          cx="64"
                          cy="64"
                          r="58"
                          stroke="currentColor"
                          strokeWidth="8"
                          fill="transparent"
                          strokeDasharray={364}
                          strokeDashoffset={364 - (364 * (importProgress.current / (importProgress.total || 1)))}
                          className="text-primary-600 transition-all duration-500 ease-out"
                        />
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-2xl font-bold text-zinc-900 dark:text-white">
                          {Math.round((importProgress.current / (importProgress.total || 1)) * 100)}%
                        </span>
                      </div>
                    </div>

                    <div>
                      <h3 className="text-lg font-bold text-zinc-900 dark:text-white">Processando Lotes...</h3>
                      <p className="text-sm text-zinc-500 dark:text-zinc-400">
                        Enviando {importProgress.current} de {importProgress.total} registros
                      </p>
                    </div>

                    <div className="max-h-32 overflow-y-auto bg-zinc-50 dark:bg-zinc-800/50 rounded-xl p-3 border border-zinc-100 dark:border-zinc-700 text-left space-y-1">
                      {importBatchLogs.map((log, idx) => (
                        <p key={idx} className="text-[10px] font-mono text-zinc-500 dark:text-zinc-400 flex items-center gap-2">
                          <Check size={10} className="text-green-500" />
                          {log}
                        </p>
                      ))}
                      {importing && (
                        <div className="flex items-center gap-2 text-[10px] font-mono text-primary-600 animate-pulse">
                          <Loader2 size={10} className="animate-spin" />
                          Processando próximo lote...
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {importStep === 'summary' && importResult && (
                  <div className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 bg-green-50 dark:bg-green-900/10 border border-green-100 dark:border-green-900/30 rounded-2xl text-center">
                        <p className="text-[10px] font-bold text-green-600 uppercase tracking-wider mb-1">Sucessos</p>
                        <p className="text-3xl font-black text-green-700 dark:text-green-400">{importResult.success_count}</p>
                      </div>
                      <div className="p-4 bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/30 rounded-2xl text-center">
                        <p className="text-[10px] font-bold text-red-600 uppercase tracking-wider mb-1">Falhas</p>
                        <p className="text-3xl font-black text-red-700 dark:text-red-400">{importResult.error_count}</p>
                      </div>
                    </div>

                    {importResult.total_rows > 0 && (
                      <div className="border border-zinc-200 dark:border-zinc-700 rounded-2xl overflow-hidden">
                        <button 
                          onClick={() => setIsReviewExpanded(!isReviewExpanded)}
                          className="w-full p-4 flex items-center justify-between bg-zinc-50 dark:bg-zinc-800/50 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                        >
                          <div className="flex items-center gap-2 text-sm font-bold text-zinc-700 dark:text-zinc-300">
                            <FileText className="text-primary-500" size={18} />
                            Ver relatório detalhado do processamento
                          </div>
                          <ChevronDown size={20} className={`text-zinc-400 transition-transform ${isReviewExpanded ? 'rotate-180' : ''}`} />
                        </button>
                        
                        <AnimatePresence>
                          {isReviewExpanded && (
                            <motion.div
                              initial={{ height: 0 }}
                              animate={{ height: 'auto' }}
                              exit={{ height: 0 }}
                              className="overflow-hidden"
                            >
                              <div className="max-h-64 overflow-y-auto p-4 space-y-2 bg-white dark:bg-zinc-900 border-t border-zinc-200 dark:border-zinc-700">
                                {importResult.errors.map((item: any, idx) => {
                                  return (
                                    <div key={idx} className={`flex items-center gap-3 p-3 rounded-xl border ${
                                      item.status === 'success' 
                                        ? 'bg-green-50/30 dark:bg-green-900/5 border-green-100/50 dark:border-green-900/10' 
                                        : 'bg-red-50/50 dark:bg-red-900/5 border-red-100/50 dark:border-red-900/10'
                                    }`}>
                                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 ${
                                        item.status === 'success' ? 'bg-green-100 dark:bg-green-900/30 text-green-600' : 'bg-red-100 dark:bg-red-900/30 text-red-600'
                                      }`}>
                                        {item.row}
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <p className="text-xs font-bold text-zinc-900 dark:text-white truncate">
                                          Vendedor: {item.external_id || 'N/A'}
                                        </p>
                                        {item.status === 'error' ? (
                                          <p className="text-[10px] text-red-600 dark:text-red-400 mt-0.5">
                                            {item.reason || 'Erro desconhecido'}
                                          </p>
                                        ) : (
                                          <p className="text-[10px] text-green-600 dark:text-green-400 mt-0.5 flex items-center gap-1">
                                            <Check size={10} /> Registrado com sucesso
                                          </p>
                                        )}
                                      </div>
                                      <div className="flex-shrink-0">
                                        {item.status === 'success' ? (
                                          <CheckCircle2 size={16} className="text-green-500" />
                                        ) : (
                                          <AlertTriangle size={16} className="text-red-500" />
                                        )}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    )}

                    <button
                      onClick={handleCloseImportModal}
                      className="w-full px-4 py-4 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-2xl hover:bg-zinc-800 dark:hover:bg-zinc-100 transition-all font-bold shadow-xl"
                    >
                      Fechar Relatório
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <ConfirmModal
        isOpen={prizeConfirmModal.isOpen}
        onClose={() => setPrizeConfirmModal({ isOpen: false, campaign: null })}
        onConfirm={handleApprovePrize}
        title="Confirmar Entrega de Prêmio"
        message={`Deseja confirmar a entrega do prêmio para ${prizeConfirmModal.campaign?.winner?.name || 'o ganhador'}?`}
      />

      {/* Winner Details Modal */}
      <AnimatePresence>
        {selectedWinner && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => { setSelectedWinner(null); setSelectedCampaignForWinner(null); }}>
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-zinc-200 dark:border-zinc-800"
            >
              <div className="relative h-32 bg-gradient-to-br from-primary-500 to-primary-700">
                <button 
                  onClick={() => { setSelectedWinner(null); setSelectedCampaignForWinner(null); }}
                  className="absolute top-4 right-4 p-2 bg-black/20 hover:bg-black/40 text-white rounded-full transition-colors backdrop-blur-sm"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="px-6 pb-6">
                <div className="relative -mt-16 mb-4 flex justify-center">
                  <div className="w-32 h-32 rounded-3xl bg-white dark:bg-zinc-900 p-1 shadow-xl border-4 border-white dark:border-zinc-900 overflow-hidden">
                    {selectedWinner.profile_image_url ? (
                      <img src={getFullImageUrl(selectedWinner.profile_image_url) || ''} alt={selectedWinner.name} className="w-full h-full object-cover rounded-2xl" />
                    ) : (
                      <div className="w-full h-full bg-zinc-100 dark:bg-zinc-800 rounded-2xl flex items-center justify-center text-zinc-400">
                        <User size={48} />
                      </div>
                    )}
                  </div>
                </div>

                <div className="text-center mb-6">
                  <h3 className="text-2xl font-bold text-zinc-900 dark:text-white">{selectedWinner.name}</h3>
                  <div className="inline-flex items-center px-3 py-1 bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400 rounded-full text-xs font-bold mt-2 uppercase tracking-wider">
                    {selectedWinner.role || 'Ganhador'}
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center gap-3 p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl border border-zinc-100 dark:border-zinc-800">
                    <div className="w-10 h-10 rounded-lg bg-white dark:bg-zinc-800 flex items-center justify-center text-primary-500 shadow-sm">
                      <Mail size={18} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] text-zinc-500 uppercase font-bold">E-mail</p>
                      <p className="text-sm text-zinc-900 dark:text-zinc-100 truncate">{selectedWinner.email}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl border border-zinc-100 dark:border-zinc-800">
                    <div className="w-10 h-10 rounded-lg bg-white dark:bg-zinc-800 flex items-center justify-center text-primary-500 shadow-sm">
                      <Phone size={18} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] text-zinc-500 uppercase font-bold">Telefone</p>
                      <p className="text-sm text-zinc-900 dark:text-zinc-100">{selectedWinner.phone || 'Não informado'}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl border border-zinc-100 dark:border-zinc-800">
                    <div className="w-10 h-10 rounded-lg bg-white dark:bg-zinc-800 flex items-center justify-center text-primary-500 shadow-sm">
                      <StoreIcon size={18} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] text-zinc-500 uppercase font-bold">Unidade</p>
                      <p className="text-sm text-zinc-900 dark:text-zinc-100 truncate">{selectedWinner.store?.name || 'Não informada'}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl border border-zinc-100 dark:border-zinc-800">
                    <div className="w-10 h-10 rounded-lg bg-white dark:bg-zinc-800 flex items-center justify-center text-primary-500 shadow-sm">
                      <Coins size={18} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] text-zinc-500 uppercase font-bold">Saldo Atual</p>
                      <p className="text-sm font-bold text-amber-600">{selectedWinner.coin_balance || 0} {coinName}</p>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 mt-6">
                  <button 
                    onClick={() => { setSelectedWinner(null); setSelectedCampaignForWinner(null); }}
                    className="flex-1 py-3 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-bold rounded-xl hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
                  >
                    Fechar
                  </button>
                  {isAdmin && selectedCampaignForWinner && !selectedCampaignForWinner.prize_approved_at && (
                    <button 
                      onClick={() => {
                        setPrizeConfirmModal({ isOpen: true, campaign: selectedCampaignForWinner });
                        setSelectedWinner(null);
                        setSelectedCampaignForWinner(null);
                      }}
                      className="flex-[2] py-3 bg-primary-600 text-white font-bold rounded-xl hover:bg-primary-700 transition-colors flex items-center justify-center gap-2"
                    >
                      <Trophy size={18} />
                      Entregar Prêmio
                    </button>
                  )}
                </div>
                {selectedCampaignForWinner?.prize_approved_at && (
                  <div className="mt-4 flex items-center justify-center gap-2 text-green-600 dark:text-green-400 font-bold text-sm bg-green-50 dark:bg-green-900/20 py-2 rounded-lg">
                    <Check size={18} /> Prêmio entregue em {new Date(selectedCampaignForWinner.prize_approved_at).toLocaleDateString()}
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal de Histórico de Importações */}
      <AnimatePresence>
        {isImportHistoryModalOpen && historyCampaign && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onClick={() => setIsImportHistoryModalOpen(false)}
              className="absolute inset-0"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden border border-zinc-200 dark:border-zinc-800 z-10 flex flex-col max-h-[90vh]"
            >
              {/* Header */}
              <div className="p-6 border-b border-zinc-100 dark:border-zinc-800 flex justify-between items-center bg-zinc-50/50 dark:bg-zinc-800/50 flex-shrink-0">
                <div>
                  <h2 className="text-xl font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                    <Clock className="text-primary-600" size={24} />
                    Histórico de Importações
                  </h2>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                    Campanha: {historyCampaign.name}
                  </p>
                </div>
                <button
                  onClick={() => setIsImportHistoryModalOpen(false)}
                  className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors"
                >
                  <X size={24} />
                </button>
              </div>

              {/* Content */}
              <div className="p-6 overflow-y-auto flex-1 custom-scrollbar">
                {loadingImportHistory && importHistory.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 text-primary-600 animate-spin mb-3" />
                    <p className="text-zinc-500">Carregando histórico...</p>
                  </div>
                ) : importHistory.length === 0 ? (
                  <div className="text-center py-12 bg-zinc-50 dark:bg-zinc-800/50 rounded-2xl border border-dashed border-zinc-200 dark:border-zinc-700">
                    <Clock className="w-12 h-12 text-zinc-300 dark:text-zinc-600 mx-auto mb-3" />
                    <p className="text-zinc-500">Nenhuma importação realizada para esta campanha.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {importHistory.map((item) => (
                      <div key={item.id} className="border border-zinc-100 dark:border-zinc-800 rounded-xl overflow-hidden transition-all duration-200 hover:border-zinc-200 dark:hover:border-zinc-700 bg-white dark:bg-zinc-800/30">
                        <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                          <div className="flex items-center gap-4">
                            <div className={`p-2 rounded-lg ${item.error_count > 0 ? 'bg-amber-100 dark:bg-amber-900/20 text-amber-600' : 'bg-green-100 dark:bg-green-900/20 text-green-600'}`}>
                              <FileSpreadsheet size={20} />
                            </div>
                            <div>
                              <div className="font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                                {item.filename}
                              </div>
                              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-xs text-zinc-500">
                                <span className="flex items-center gap-1">
                                  <Clock size={12} />
                                  {new Date(item.created_at).toLocaleString('pt-BR')}
                                </span>
                                <span className="flex items-center gap-1">
                                  <User size={12} />
                                  {item.imported_by?.name || 'Sistema'}
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-3">
                            <div className="flex flex-col items-end">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-green-600 bg-green-50 dark:bg-green-900/20 px-2 py-0.5 rounded-full">
                                  {item.success_count} sucessos
                                </span>
                                {item.error_count > 0 && (
                                  <span className="text-xs font-bold text-red-600 bg-red-50 dark:bg-red-900/20 px-2 py-0.5 rounded-full">
                                    {item.error_count} erros
                                  </span>
                                )}
                              </div>
                              <span className="text-[10px] text-zinc-400 mt-1">Total: {item.total_rows} linhas</span>
                            </div>
                            
                            {item.error_count > 0 && (
                              <button
                                onClick={() => toggleExpandImport(item.id)}
                                className={`p-1.5 rounded-lg transition-all ${
                                  expandedImportIds.has(item.id)
                                    ? 'bg-primary-600 text-white'
                                    : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 hover:text-primary-600'
                                }`}
                              >
                                <ChevronDown 
                                  size={18} 
                                  className={`transition-transform duration-300 ${expandedImportIds.has(item.id) ? 'rotate-180' : ''}`} 
                                />
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Error Details */}
                        <AnimatePresence>
                          {expandedImportIds.has(item.id) && item.errors && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              className="border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/30"
                            >
                              <div className="p-4 overflow-x-auto">
                                <table className="w-full text-xs text-left">
                                  <thead>
                                    <tr className="text-zinc-500 uppercase tracking-wider">
                                      <th className="px-3 py-2 font-bold">ID Externo</th>
                                      <th className="px-3 py-2 font-bold text-red-600">Erro</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                                    {item.errors.map((error, idx) => (
                                      <tr key={idx} className="text-zinc-700 dark:text-zinc-300">
                                        <td className="px-3 py-2 font-medium">{error.external_id}</td>
                                        <td className="px-3 py-2 text-red-500">{error.reason}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Footer / Pagination */}
              {importHistoryTotalPages > 1 && (
                <div className="p-4 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/50 dark:bg-zinc-800/50 flex-shrink-0">
                  <span className="text-xs text-zinc-500">
                    Mostrando <span className="font-bold">{importHistory.length}</span> de <span className="font-bold">{importHistoryTotal}</span> importações
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => fetchImportHistory(historyCampaign.id, importHistoryPage - 1)}
                      disabled={importHistoryPage === 1 || loadingImportHistory}
                      className="p-1.5 border border-zinc-200 dark:border-zinc-700 rounded-lg hover:bg-white dark:hover:bg-zinc-800 disabled:opacity-50 text-zinc-600 dark:text-zinc-400"
                    >
                      <ChevronLeft size={18} />
                    </button>
                    <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300">
                      {importHistoryPage} / {importHistoryTotalPages}
                    </span>
                    <button
                      onClick={() => fetchImportHistory(historyCampaign.id, importHistoryPage + 1)}
                      disabled={importHistoryPage === importHistoryTotalPages || loadingImportHistory}
                      className="p-1.5 border border-zinc-200 dark:border-zinc-700 rounded-lg hover:bg-white dark:hover:bg-zinc-800 disabled:opacity-50 text-zinc-600 dark:text-zinc-400"
                    >
                      <ChevronRight size={18} />
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Loading Winner Details Overlay */}
      {loadingWinnerDetails && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/20 backdrop-blur-[2px]">
          <div className="bg-white dark:bg-zinc-900 p-4 rounded-2xl shadow-xl flex items-center gap-3">
            <Loader2 className="animate-spin text-primary-600" size={24} />
            <span className="font-bold text-zinc-900 dark:text-white">Carregando detalhes...</span>
          </div>
        </div>
      )}
    </>
  );
};
