import React, { useState, useEffect, useCallback } from 'react';
import { Layout } from '../components/Layout';
import { Search, Loader2, RefreshCw, ChevronLeft, ChevronRight, FileText, Calendar, Eye, Users, Coins, CheckCircle, XCircle, Clock, EyeOff, Plus, Edit2, Trash2, X, Save, Check, User as UserIcon, Shield } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../context/AuthContext';
import { Survey, SurveyStatus, User, SurveyResults } from '../types';
import { api } from '../services/api';
import { useToast } from '../context/ToastContext';
import { ConfirmModal } from '../components/ConfirmModal';

const API_BASE_URL = 'http://localhost:8010/api/v1';

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

const surveyStatusLabels: Record<SurveyStatus, string> = {
  draft: 'Rascunho',
  active: 'Ativa',
  closed: 'Encerrada',
};

const surveyStatusColors: Record<SurveyStatus, string> = {
  draft: 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-400',
  active: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400',
  closed: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400',
};

interface Question {
  question: string;
  type: 'choice' | 'text';
  order: number;
  options?: Array<{ option_text: string }>;
}

export const SurveysPage: React.FC = () => {
  const { token } = useAuth();
  const { addToast } = useToast();
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 500);

  // Filtros
  const [statusFilter, setStatusFilter] = useState<SurveyStatus | 'all'>('all');
  const [publishedFilter, setPublishedFilter] = useState<'all' | 'true' | 'false'>('all');

  // Paginação
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [fromItem, setFromItem] = useState(0);
  const [toItem, setToItem] = useState(0);

  // Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSurvey, setEditingSurvey] = useState<Survey | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<'basic' | 'users' | 'questions'>('basic');

  // Form dados básicos
  const [formData, setFormData] = useState({
    title: '',
    starts_at: '',
    ends_at: '',
    is_anonymous: false,
    is_published: false,
    coins_reward: false,
  });

  // Usuários
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<number[]>([]);
  const [userSearch, setUserSearch] = useState('');
  const debouncedUserSearch = useDebounce(userSearch, 500);
  const [usersPage, setUsersPage] = useState(1);
  const [usersTotalPages, setUsersTotalPages] = useState(1);
  const [userFilterType, setUserFilterType] = useState<'name' | 'email'>('name');
  const [loadingSelectAllUsers, setLoadingSelectAllUsers] = useState(false);
  const [selectAllUsersProgress, setSelectAllUsersProgress] = useState<{ current: number; total: number } | null>(null);
  const [selectByRoleLoading, setSelectByRoleLoading] = useState<string | null>(null);
  const [fullySelectedRoles, setFullySelectedRoles] = useState<Set<string>>(new Set());

  // Questões
  const [questions, setQuestions] = useState<Question[]>([]);

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

  // Results modal
  const [resultsModal, setResultsModal] = useState<{
    isOpen: boolean;
    survey: Survey | null;
    results: SurveyResults | null;
    loading: boolean;
  }>({
    isOpen: false,
    survey: null,
    results: null,
    loading: false,
  });

  const fetchSurveys = useCallback(async (page = 1, search = '') => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const statusParam = statusFilter !== 'all' ? statusFilter : undefined;
      const publishedParam = publishedFilter !== 'all' ? publishedFilter : undefined;

      const data = await api.getSurveys(token, page, search, statusParam, publishedParam);
      setSurveys(data.data);
      setCurrentPage(data.meta?.current_page || data.current_page);
      setTotalPages(data.meta?.last_page || data.last_page);
      setTotalItems(data.meta?.total || data.total);
      setFromItem(data.meta?.from || data.from);
      setToItem(data.meta?.to || data.to);
    } catch (err: any) {
      console.error('Error fetching surveys:', err);
      setError(err.message || 'Não foi possível carregar as pesquisas.');
    } finally {
      setLoading(false);
    }
  }, [token, statusFilter, publishedFilter]);

  useEffect(() => {
    fetchSurveys(currentPage, debouncedSearchTerm);
  }, [fetchSurveys, currentPage, debouncedSearchTerm]);

  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearchTerm, statusFilter, publishedFilter]);

  // Buscar usuários
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

  useEffect(() => {
    if (isModalOpen && activeTab === 'users') {
      fetchUsers(usersPage, debouncedUserSearch, userFilterType);
    }
  }, [debouncedUserSearch, userFilterType, isModalOpen, activeTab, usersPage]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleRefresh = () => {
    fetchSurveys(currentPage, debouncedSearchTerm);
    addToast('success', 'Lista atualizada com sucesso!');
  };

  const handleOpenModal = (survey?: Survey) => {
    setActiveTab('basic');
    if (survey) {
      setEditingSurvey(survey);
      setFormData({
        title: survey.title,
        starts_at: survey.starts_at.split('T')[0],
        ends_at: survey.ends_at.split('T')[0],
        is_anonymous: survey.is_anonymous,
        is_published: survey.is_published,
        coins_reward: survey.coins_reward,
      });
      // TODO: Carregar usuários e questões da pesquisa existente
    } else {
      setEditingSurvey(null);
      setFormData({
        title: '',
        starts_at: '',
        ends_at: '',
        is_anonymous: false,
        is_published: false,
        coins_reward: false,
      });
      setSelectedUsers([]);
      setQuestions([]);
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingSurvey(null);
    setActiveTab('basic');
  };

  const handleSelectAllUsers = async () => {
    if (!token) return;

    const hasSelectedUsers = selectedUsers.length > 0;

    if (hasSelectedUsers) {
      setSelectedUsers([]);
      setFullySelectedRoles(new Set());
      addToast('success', 'Todos os usuários foram desmarcados!');
      return;
    }

    setLoadingSelectAllUsers(true);
    setSelectAllUsersProgress(null);
    try {
      const queryParams = new URLSearchParams();
      queryParams.append('page', '1');
      queryParams.append('per_page', '100');
      queryParams.append('include', 'store');
      if (userSearch) {
        queryParams.append(`filter[${userFilterType}]`, userSearch);
      }

      const firstResponse = await fetch(`${API_BASE_URL}/users?${queryParams.toString()}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
        },
      });
      if (!firstResponse.ok) throw new Error('Falha ao carregar usuários');
      const firstData = await firstResponse.json() as any;

      const totalPages = firstData.meta?.last_page || firstData.last_page || 1;
      let allUsers: User[] = [...(firstData.data || [])];

      if (totalPages > 1) {
        setSelectAllUsersProgress({ current: 1, total: totalPages });
      }

      for (let currentPage = 2; currentPage <= totalPages; currentPage++) {
        const nextPageParams = new URLSearchParams();
        nextPageParams.append('page', currentPage.toString());
        nextPageParams.append('per_page', '100');
        nextPageParams.append('include', 'store');
        if (userSearch) {
          nextPageParams.append(`filter[${userFilterType}]`, userSearch);
        }

        const response = await fetch(`${API_BASE_URL}/users?${nextPageParams.toString()}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/json',
          },
        });
        if (!response.ok) throw new Error('Falha ao carregar usuários');
        const data = await response.json() as any;

        allUsers.push(...(data.data || []));
        setSelectAllUsersProgress({ current: currentPage, total: totalPages });
      }

      const validUserIds = allUsers.map(u => u.id);
      setSelectedUsers(prev => {
        const newIds = validUserIds.filter(id => !prev.includes(id));
        return [...prev, ...newIds];
      });

      addToast('success', `Todos os ${validUserIds.length} usuários foram selecionados!`);
      setSelectAllUsersProgress(null);
    } catch (error) {
      console.error('Error fetching all users:', error);
      addToast('error', 'Erro ao carregar todos os usuários.');
      setSelectAllUsersProgress(null);
    } finally {
      setLoadingSelectAllUsers(false);
    }
  };

  // Handler para selecionar todos os usuários de um cargo específico
  const handleSelectAllByRole = async (role: string) => {
    if (!token) return;

    setSelectByRoleLoading(role);
    try {
      const queryParams = new URLSearchParams();
      queryParams.append('page', '1');
      queryParams.append('per_page', '100');
      queryParams.append('include', 'store');

      const firstResponse = await fetch(`${API_BASE_URL}/users?${queryParams.toString()}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
        },
      });
      if (!firstResponse.ok) throw new Error('Falha ao carregar usuários');
      const firstData = await firstResponse.json() as any;

      const totalPages = firstData.meta?.last_page || firstData.last_page || 1;
      let allUsers: User[] = [...(firstData.data || [])];

      for (let currentPage = 2; currentPage <= totalPages; currentPage++) {
        const nextPageParams = new URLSearchParams();
        nextPageParams.append('page', currentPage.toString());
        nextPageParams.append('per_page', '100');
        nextPageParams.append('include', 'store');

        const response = await fetch(`${API_BASE_URL}/users?${nextPageParams.toString()}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/json',
          },
        });
        if (!response.ok) throw new Error('Falha ao carregar usuários');
        const data = await response.json() as any;

        allUsers.push(...(data.data || []));
      }

      // Filtra por cargo específico
      const roleUsers = allUsers.filter(u => u.role === role);
      const validUserIds = roleUsers.map(u => u.id);

      const allRoleSelected = validUserIds.every(id => selectedUsers.includes(id));

      if (allRoleSelected) {
        setSelectedUsers(prev => prev.filter(id => !validUserIds.includes(id)));
        setFullySelectedRoles(prev => {
          const next = new Set(prev);
          next.delete(role);
          return next;
        });
        addToast('success', `${role}(s) removido(s) da seleção!`);
      } else {
        setSelectedUsers(prev => {
          const newIds = validUserIds.filter(id => !prev.includes(id));
          return [...prev, ...newIds];
        });
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

  const toggleUser = (userId: number) => {
    setSelectedUsers(prev =>
      prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
    );
  };

  const addQuestion = () => {
    const newOrder = questions.length + 1;
    setQuestions([...questions, { question: '', type: 'text', order: newOrder }]);
  };

  const removeQuestion = (index: number) => {
    const newQuestions = questions.filter((_, i) => i !== index);
    newQuestions.forEach((q, i) => q.order = i + 1);
    setQuestions(newQuestions);
  };

  const updateQuestion = (index: number, field: keyof Question, value: any) => {
    const newQuestions = [...questions];
    newQuestions[index] = { ...newQuestions[index], [field]: value };
    setQuestions(newQuestions);
  };

  const addOption = (questionIndex: number) => {
    const newQuestions = [...questions];
    if (!newQuestions[questionIndex].options) {
      newQuestions[questionIndex].options = [];
    }
    newQuestions[questionIndex].options!.push({ option_text: '' });
    setQuestions(newQuestions);
  };

  const removeOption = (questionIndex: number, optionIndex: number) => {
    const newQuestions = [...questions];
    newQuestions[questionIndex].options!.splice(optionIndex, 1);
    setQuestions(newQuestions);
  };

  const updateOption = (questionIndex: number, optionIndex: number, value: string) => {
    const newQuestions = [...questions];
    newQuestions[questionIndex].options![optionIndex].option_text = value;
    setQuestions(newQuestions);
  };

  const handleSubmit = async () => {
    if (!token) return;

    // Validações
    if (!formData.title.trim()) {
      addToast('error', 'Título é obrigatório.');
      setActiveTab('basic');
      return;
    }
    if (!formData.starts_at || !formData.ends_at) {
      addToast('error', 'Data de início e término são obrigatórias.');
      setActiveTab('basic');
      return;
    }
    if (formData.ends_at < formData.starts_at) {
      addToast('error', 'Data de término deve ser maior que data de início.');
      setActiveTab('basic');
      return;
    }
    if (selectedUsers.length === 0) {
      addToast('error', 'É obrigatório selecionar pelo menos 1 usuário.');
      setActiveTab('users');
      return;
    }
    if (questions.length === 0) {
      addToast('error', 'É obrigatório criar pelo menos 1 questão.');
      setActiveTab('questions');
      return;
    }

    // Valida questões
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      if (!q.question.trim()) {
        addToast('error', `Questão ${i + 1} está vazia.`);
        setActiveTab('questions');
        return;
      }
      if (q.type === 'choice' && (!q.options || q.options.length === 0)) {
        addToast('error', `Questão ${i + 1} é do tipo escolha e precisa de opções.`);
        setActiveTab('questions');
        return;
      }
      if (q.type === 'choice') {
        for (let j = 0; j < q.options!.length; j++) {
          if (!q.options![j].option_text.trim()) {
            addToast('error', `Opção ${j + 1} da questão ${i + 1} está vazia.`);
            setActiveTab('questions');
            return;
          }
        }
      }
    }

    setSaving(true);
    try {
      // Prepara as questões: remove 'options' das questões do tipo 'text'
      const questionsToSave = questions.map(q => {
        if (q.type === 'text') {
          const { options, ...rest } = q;
          return rest;
        }
        return q;
      });

      const dataToSave = {
        title: formData.title,
        starts_at: formData.starts_at,
        ends_at: formData.ends_at,
        is_anonymous: formData.is_anonymous,
        is_published: formData.is_published,
        coins_reward: formData.coins_reward,
        users: selectedUsers,
        questions: questionsToSave,
      };

      if (editingSurvey) {
        await api.updateSurvey(token, editingSurvey.id, dataToSave);
        addToast('success', 'Pesquisa atualizada com sucesso!');
      } else {
        await api.createSurvey(token, dataToSave);
        addToast('success', 'Pesquisa criada com sucesso!');
      }

      handleCloseModal();
      fetchSurveys(currentPage, debouncedSearchTerm);
    } catch (err: any) {
      console.error('Error saving survey:', err);
      addToast('error', err.message || 'Erro ao salvar pesquisa.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (survey: Survey) => {
    setConfirmModal({
      isOpen: true,
      title: 'Excluir Pesquisa',
      message: `Tem certeza que deseja excluir a pesquisa "${survey.title}"? Esta ação não pode ser desfeita.`,
      onConfirm: async () => {
        if (!token) return;
        setConfirmModal(prev => ({ ...prev, isLoading: true }));
        try {
          await api.deleteSurvey(token, survey.id);
          addToast('success', 'Pesquisa excluída com sucesso!');
          fetchSurveys(currentPage, debouncedSearchTerm);
        } catch (error: any) {
          console.error('Error deleting survey:', error);
          addToast('error', error.message || 'Erro ao excluir pesquisa.');
        } finally {
          setConfirmModal(prev => ({ ...prev, isLoading: false }));
        }
      },
      isLoading: false,
    });
  };

  const handleViewResults = async (survey: Survey) => {
    if (!token) return;
    setResultsModal({ isOpen: true, survey, results: null, loading: true });
    try {
      const data = await api.getSurveyResults(token, survey.id);
      setResultsModal(prev => ({ ...prev, results: data, loading: false }));
    } catch (error: any) {
      console.error('Error fetching survey results:', error);
      addToast('error', error.message || 'Erro ao carregar resultados.');
      setResultsModal(prev => ({ ...prev, loading: false }));
    }
  };

  const handleCloseResults = () => {
    setResultsModal({ isOpen: false, survey: null, results: null, loading: false });
  };

  return (
    <Layout>
      <div className="p-4 md:p-8 space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">Pesquisas</h1>
            <p className="text-zinc-500 dark:text-zinc-400">Gerencie as pesquisas e acompanhe as respostas.</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleRefresh}
              className="flex items-center gap-2 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 px-4 py-2 rounded-xl text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-all"
            >
              <RefreshCw size={16} />
              Atualizar
            </button>
            <button
              onClick={() => handleOpenModal()}
              className="flex items-center gap-2 bg-emerald-600 px-4 py-2 rounded-xl text-sm font-medium text-white hover:bg-emerald-700 shadow-sm transition-all"
            >
              <Plus size={16} />
              Nova Pesquisa
            </button>
          </div>
        </div>

        {/* Filtros */}
        <div className="bg-white dark:bg-zinc-900 p-4 rounded-2xl shadow-sm border border-zinc-100 dark:border-zinc-800 transition-colors duration-200">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Busca */}
            <div className="md:col-span-2 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-zinc-400" size={18} />
              <input
                type="text"
                placeholder="Buscar por título..."
                className="w-full pl-10 pr-4 py-2.5 border border-zinc-300 dark:border-zinc-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-500"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            {/* Filtro de Status */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as SurveyStatus | 'all')}
              className="w-full px-4 py-2.5 border border-zinc-300 dark:border-zinc-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white"
            >
              <option value="all">Todos os status</option>
              <option value="draft">Rascunho</option>
              <option value="active">Ativa</option>
              <option value="closed">Encerrada</option>
            </select>

            {/* Filtro de Publicação */}
            <select
              value={publishedFilter}
              onChange={(e) => setPublishedFilter(e.target.value as 'all' | 'true' | 'false')}
              className="w-full px-4 py-2.5 border border-zinc-300 dark:border-zinc-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white"
            >
              <option value="all">Todas publicações</option>
              <option value="true">Publicadas</option>
              <option value="false">Não publicadas</option>
            </select>
          </div>
        </div>

        {/* Lista de Pesquisas */}
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
          </div>
        ) : error ? (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 p-4 rounded-xl text-center">
            {error}
            <button
              onClick={() => fetchSurveys(currentPage, debouncedSearchTerm)}
              className="block mx-auto mt-2 text-sm font-semibold hover:underline"
            >
              Tentar novamente
            </button>
          </div>
        ) : surveys.length === 0 ? (
          <div className="bg-white dark:bg-zinc-900 p-12 rounded-2xl shadow-sm border border-zinc-100 dark:border-zinc-800 text-center">
            <FileText className="w-16 h-16 text-zinc-300 dark:text-zinc-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-white mb-2">Nenhuma pesquisa encontrada</h3>
            <p className="text-zinc-500 dark:text-zinc-400">
              {searchTerm || statusFilter !== 'all' || publishedFilter !== 'all'
                ? 'Tente ajustar os filtros para encontrar o que procura.'
                : 'Comece criando uma nova pesquisa.'}
            </p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-4">
              {surveys.map((survey) => {
                const statusLabel = surveyStatusLabels[survey.status] || survey.status;
                const statusColor = surveyStatusColors[survey.status] || 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-400';

                return (
                  <motion.div
                    key={survey.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white dark:bg-zinc-900 p-6 rounded-2xl shadow-sm border border-zinc-100 dark:border-zinc-800 hover:shadow-md transition-all duration-200"
                  >
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="flex items-start gap-4 flex-1">
                        <div className="bg-emerald-100 dark:bg-emerald-900/30 p-3 rounded-xl">
                          <FileText className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-bold text-lg text-zinc-900 dark:text-white">{survey.title}</h3>
                            <span className={`px-2 py-1 rounded-full text-xs font-bold ${statusColor}`}>
                              {statusLabel.toUpperCase()}
                            </span>
                            {survey.is_published ? (
                              <span className="px-2 py-1 rounded-full text-xs font-bold bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 flex items-center gap-1">
                                <CheckCircle size={12} />
                                Publicada
                              </span>
                            ) : (
                              <span className="px-2 py-1 rounded-full text-xs font-bold bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 flex items-center gap-1">
                                <XCircle size={12} />
                                Não Publicada
                              </span>
                            )}
                          </div>

                          <div className="flex flex-wrap gap-4 mt-3 text-sm">
                            <div className="flex items-center gap-1.5 text-zinc-600 dark:text-zinc-400">
                              <Calendar size={16} className="text-blue-500" />
                              <span className="text-zinc-500 dark:text-zinc-500">Período:</span>
                              <span className="font-medium text-zinc-900 dark:text-white">
                                {formatDate(survey.starts_at)} até {formatDate(survey.ends_at)}
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5 text-zinc-600 dark:text-zinc-400">
                              <FileText size={16} className="text-emerald-500" />
                              <span className="text-zinc-500 dark:text-zinc-500">Perguntas:</span>
                              <span className="font-medium text-zinc-900 dark:text-white">{survey.questions_count}</span>
                            </div>
                            <div className="flex items-center gap-1.5 text-zinc-600 dark:text-zinc-400">
                              <Users size={16} className="text-purple-500" />
                              <span className="text-zinc-500 dark:text-zinc-500">Respostas:</span>
                              <span className="font-medium text-zinc-900 dark:text-white">{survey.responses_count}</span>
                            </div>
                            <div className="flex items-center gap-1.5 text-zinc-600 dark:text-zinc-400">
                              <Eye size={16} className="text-amber-500" />
                              <span className="text-zinc-500 dark:text-zinc-500">Visualizações:</span>
                              <span className="font-medium text-zinc-900 dark:text-white">{survey.views_count}</span>
                            </div>
                            {survey.coins_reward && (
                              <div className="flex items-center gap-1.5 text-zinc-600 dark:text-zinc-400">
                                <Coins size={16} className="text-emerald-500" />
                                <span className="text-zinc-500 dark:text-zinc-500">Recompensa:</span>
                                <span className="font-medium text-emerald-600 dark:text-emerald-400">Sim</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Ações */}
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleViewResults(survey)}
                          className="p-2 text-zinc-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                          title="Ver Resultados"
                        >
                          <Eye size={18} />
                        </button>
                        <button
                          onClick={() => handleOpenModal(survey)}
                          className="p-2 text-zinc-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-lg transition-colors"
                        >
                          <Edit2 size={18} />
                        </button>
                        <button
                          onClick={() => handleDelete(survey)}
                          className="p-2 text-zinc-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
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
                  <span className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-sm font-medium">
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
                    <FileText className="w-6 h-6 text-emerald-500" />
                    {editingSurvey ? 'Editar Pesquisa' : 'Nova Pesquisa'}
                  </h2>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
                    {editingSurvey ? 'Atualize os dados da pesquisa' : 'Preencha os dados para criar uma nova pesquisa'}
                  </p>
                </div>
                <button onClick={handleCloseModal} className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors">
                  <X size={24} />
                </button>
              </div>

              {/* Tabs */}
              <div className="flex border-b border-zinc-200 dark:border-zinc-700 bg-zinc-50/50 dark:bg-zinc-800/50">
                <button
                  onClick={() => setActiveTab('basic')}
                  className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                    activeTab === 'basic'
                      ? 'bg-white dark:bg-zinc-900 text-emerald-600 dark:text-emerald-400 border-b-2 border-emerald-500'
                      : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                  }`}
                >
                  Dados Básicos
                </button>
                <button
                  onClick={() => setActiveTab('users')}
                  className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                    activeTab === 'users'
                      ? 'bg-white dark:bg-zinc-900 text-emerald-600 dark:text-emerald-400 border-b-2 border-emerald-500'
                      : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                  }`}
                >
                  Participantes ({selectedUsers.length})
                </button>
                <button
                  onClick={() => setActiveTab('questions')}
                  className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                    activeTab === 'questions'
                      ? 'bg-white dark:bg-zinc-900 text-emerald-600 dark:text-emerald-400 border-b-2 border-emerald-500'
                      : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                  }`}
                >
                  Questões ({questions.length})
                </button>
              </div>

              {/* Conteúdo das Tabs */}
              <div className="flex-1 overflow-y-auto p-6">
                {/* Tab Dados Básicos */}
                {activeTab === 'basic' && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                        Título da Pesquisa *
                      </label>
                      <input
                        type="text"
                        value={formData.title}
                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                        placeholder="Ex: Pesquisa de Clima Organizacional 2026"
                        className="w-full px-4 py-2.5 border border-zinc-300 dark:border-zinc-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                          Data de Início *
                        </label>
                        <input
                          type="date"
                          value={formData.starts_at}
                          onChange={(e) => setFormData({ ...formData, starts_at: e.target.value })}
                          className="w-full px-4 py-2.5 border border-zinc-300 dark:border-zinc-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                          Data de Término *
                        </label>
                        <input
                          type="date"
                          value={formData.ends_at}
                          onChange={(e) => setFormData({ ...formData, ends_at: e.target.value })}
                          className="w-full px-4 py-2.5 border border-zinc-300 dark:border-zinc-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white"
                        />
                      </div>
                    </div>

                    <div className="space-y-3">
                      <label className="flex items-center gap-3 p-3 border border-zinc-200 dark:border-zinc-700 rounded-xl cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors">
                        <input
                          type="checkbox"
                          checked={formData.is_anonymous}
                          onChange={(e) => setFormData({ ...formData, is_anonymous: e.target.checked })}
                          className="w-5 h-5 text-emerald-600 rounded focus:ring-emerald-500"
                        />
                        <div>
                          <p className="font-medium text-zinc-900 dark:text-white">Pesquisa Anônima</p>
                          <p className="text-sm text-zinc-500 dark:text-zinc-400">As respostas não serão vinculadas aos usuários</p>
                        </div>
                      </label>

                      <label className="flex items-center gap-3 p-3 border border-zinc-200 dark:border-zinc-700 rounded-xl cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors">
                        <input
                          type="checkbox"
                          checked={formData.is_published}
                          onChange={(e) => setFormData({ ...formData, is_published: e.target.checked })}
                          className="w-5 h-5 text-emerald-600 rounded focus:ring-emerald-500"
                        />
                        <div>
                          <p className="font-medium text-zinc-900 dark:text-white">Publicar Imediatamente</p>
                          <p className="text-sm text-zinc-500 dark:text-zinc-400">A pesquisa ficará visível para os participantes</p>
                        </div>
                      </label>

                      <label className="flex items-center gap-3 p-3 border border-zinc-200 dark:border-zinc-700 rounded-xl cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors">
                        <input
                          type="checkbox"
                          checked={formData.coins_reward}
                          onChange={(e) => setFormData({ ...formData, coins_reward: e.target.checked })}
                          className="w-5 h-5 text-emerald-600 rounded focus:ring-emerald-500"
                        />
                        <div>
                          <p className="font-medium text-zinc-900 dark:text-white flex items-center gap-2">
                            <Coins size={16} className="text-emerald-500" />
                            Recompensa com Moedas
                          </p>
                          <p className="text-sm text-zinc-500 dark:text-zinc-400">Participantes ganharão moedas ao responder</p>
                        </div>
                      </label>
                    </div>
                  </div>
                )}

                {/* Tab Usuários */}
                {activeTab === 'users' && (
                  <div className="space-y-4">
                    {/* Filtros */}
                    <div className="flex items-center gap-2">
                      {/* Filtro de Tipo */}
                      <select
                        value={userFilterType}
                        onChange={(e) => {
                          setUserFilterType(e.target.value as 'name' | 'email');
                          setUsersPage(1);
                        }}
                        className="px-3 py-2.5 border border-zinc-300 dark:border-zinc-600 rounded-xl bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white text-sm font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500"
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

                    {/* Seleção Rápida por Cargo */}
                    <div className="border-t border-zinc-200 dark:border-zinc-700 pt-4 mb-3">
                      <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 mb-2 uppercase tracking-wide">
                        👥 Seleção Rápida por Cargo
                      </p>
                      <p className="text-xs text-zinc-400 dark:text-zinc-500 mb-3">
                        Clique para selecionar/desmarcar todos os usuários do cargo selecionado
                      </p>
                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={handleSelectAllUsers}
                          disabled={loadingSelectAllUsers}
                          className="px-4 py-2 text-sm font-semibold bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2 shadow-sm"
                        >
                          {loadingSelectAllUsers ? (
                            <>
                              <Loader2 size={16} className="animate-spin" />
                              {selectAllUsersProgress ? `Página ${selectAllUsersProgress.current}/${selectAllUsersProgress.total}` : 'Carregando...'}
                            </>
                          ) : (
                            <>
                              <Users size={16} />
                              {selectedUsers.length > 0 ? 'Desmarcar Todos' : 'Selecionar Todos'}
                            </>
                          )}
                        </button>
                        <button
                          onClick={() => handleSelectAllByRole('Atendente')}
                          disabled={selectByRoleLoading !== null}
                          className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all flex items-center gap-1.5 shadow-sm ${
                            areAllUsersSelectedByRole('Atendente')
                              ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                              : 'bg-blue-600 text-white hover:bg-blue-700'
                          } disabled:opacity-50 disabled:cursor-not-allowed`}
                        >
                          {selectByRoleLoading === 'Atendente' ? (
                            <Loader2 size={12} className="animate-spin" />
                          ) : (
                            <>
                              <Check size={14} className={areAllUsersSelectedByRole('Atendente') ? '' : 'invisible'} />
                              {areAllUsersSelectedByRole('Atendente') ? '✓ Atendente' : '+ Atendente'}
                            </>
                          )}
                        </button>
                        <button
                          onClick={() => handleSelectAllByRole('Vendedor')}
                          disabled={selectByRoleLoading !== null}
                          className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all flex items-center gap-1.5 shadow-sm ${
                            areAllUsersSelectedByRole('Vendedor')
                              ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                              : 'bg-blue-600 text-white hover:bg-blue-700'
                          } disabled:opacity-50 disabled:cursor-not-allowed`}
                        >
                          {selectByRoleLoading === 'Vendedor' ? (
                            <Loader2 size={12} className="animate-spin" />
                          ) : (
                            <>
                              <Check size={14} className={areAllUsersSelectedByRole('Vendedor') ? '' : 'invisible'} />
                              {areAllUsersSelectedByRole('Vendedor') ? '✓ Vendedor' : '+ Vendedor'}
                            </>
                          )}
                        </button>
                        <button
                          onClick={() => handleSelectAllByRole('Representante')}
                          disabled={selectByRoleLoading !== null}
                          className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all flex items-center gap-1.5 shadow-sm ${
                            areAllUsersSelectedByRole('Representante')
                              ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                              : 'bg-blue-600 text-white hover:bg-blue-700'
                          } disabled:opacity-50 disabled:cursor-not-allowed`}
                        >
                          {selectByRoleLoading === 'Representante' ? (
                            <Loader2 size={12} className="animate-spin" />
                          ) : (
                            <>
                              <Check size={14} className={areAllUsersSelectedByRole('Representante') ? '' : 'invisible'} />
                              {areAllUsersSelectedByRole('Representante') ? '✓ Representante' : '+ Representante'}
                            </>
                          )}
                        </button>
                        <button
                          onClick={() => handleSelectAllByRole('Consultor')}
                          disabled={selectByRoleLoading !== null}
                          className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all flex items-center gap-1.5 shadow-sm ${
                            areAllUsersSelectedByRole('Consultor')
                              ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                              : 'bg-blue-600 text-white hover:bg-blue-700'
                          } disabled:opacity-50 disabled:cursor-not-allowed`}
                        >
                          {selectByRoleLoading === 'Consultor' ? (
                            <Loader2 size={12} className="animate-spin" />
                          ) : (
                            <>
                              <Check size={14} className={areAllUsersSelectedByRole('Consultor') ? '' : 'invisible'} />
                              {areAllUsersSelectedByRole('Consultor') ? '✓ Consultor' : '+ Consultor'}
                            </>
                          )}
                        </button>
                        <button
                          onClick={() => handleSelectAllByRole('Supervisor')}
                          disabled={selectByRoleLoading !== null}
                          className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all flex items-center gap-1.5 shadow-sm ${
                            areAllUsersSelectedByRole('Supervisor')
                              ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                              : 'bg-blue-600 text-white hover:bg-blue-700'
                          } disabled:opacity-50 disabled:cursor-not-allowed`}
                        >
                          {selectByRoleLoading === 'Supervisor' ? (
                            <Loader2 size={12} className="animate-spin" />
                          ) : (
                            <>
                              <Check size={14} className={areAllUsersSelectedByRole('Supervisor') ? '' : 'invisible'} />
                              {areAllUsersSelectedByRole('Supervisor') ? '✓ Supervisor' : '+ Supervisor'}
                            </>
                          )}
                        </button>
                        <button
                          onClick={() => handleSelectAllByRole('Gerente')}
                          disabled={selectByRoleLoading !== null}
                          className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all flex items-center gap-1.5 shadow-sm ${
                            areAllUsersSelectedByRole('Gerente')
                              ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                              : 'bg-blue-600 text-white hover:bg-blue-700'
                          } disabled:opacity-50 disabled:cursor-not-allowed`}
                        >
                          {selectByRoleLoading === 'Gerente' ? (
                            <Loader2 size={12} className="animate-spin" />
                          ) : (
                            <>
                              <Check size={14} className={areAllUsersSelectedByRole('Gerente') ? '' : 'invisible'} />
                              {areAllUsersSelectedByRole('Gerente') ? '✓ Gerente' : '+ Gerente'}
                            </>
                          )}
                        </button>
                        <button
                          onClick={() => handleSelectAllByRole('Coordenador')}
                          disabled={selectByRoleLoading !== null}
                          className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all flex items-center gap-1.5 shadow-sm ${
                            areAllUsersSelectedByRole('Coordenador')
                              ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                              : 'bg-blue-600 text-white hover:bg-blue-700'
                          } disabled:opacity-50 disabled:cursor-not-allowed`}
                        >
                          {selectByRoleLoading === 'Coordenador' ? (
                            <Loader2 size={12} className="animate-spin" />
                          ) : (
                            <>
                              <Check size={14} className={areAllUsersSelectedByRole('Coordenador') ? '' : 'invisible'} />
                              {areAllUsersSelectedByRole('Coordenador') ? '✓ Coordenador' : '+ Coordenador'}
                            </>
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Contador de selecionados */}
                    <div className="mb-3 p-3 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl">
                      <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">
                        👥 {selectedUsers.length} usuário(s) selecionado(s)
                      </p>
                    </div>

                    {/* Grid de Cards de Usuários */}
                    {users.length === 0 ? (
                      <div className="flex justify-center py-12">
                        <Loader2 className="w-6 h-6 text-emerald-600 animate-spin" />
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-96 overflow-y-auto pr-2">
                        {users.map((user) => {
                          const isSelected = selectedUsers.includes(user.id);
                          return (
                            <motion.button
                              key={user.id}
                              onClick={() => toggleUser(user.id)}
                              initial={{ opacity: 0, scale: 0.95 }}
                              animate={{ opacity: 1, scale: 1 }}
                              className={`p-4 rounded-xl border-2 transition-all duration-200 text-left group ${
                                isSelected
                                  ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-500 shadow-md'
                                  : 'bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 hover:border-emerald-300 dark:hover:border-emerald-700 hover:shadow-sm'
                              }`}
                            >
                              <div className="flex items-start gap-3">
                                {/* Avatar */}
                                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-emerald-100 to-teal-100 dark:from-emerald-900/30 dark:to-teal-900/30 border-2 border-emerald-200 dark:border-emerald-800 flex items-center justify-center text-emerald-600 dark:text-emerald-400 overflow-hidden flex-shrink-0">
                                  {user.profile_image_url ? (
                                    <img
                                      src={user.profile_image_url}
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
                                  <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate mt-0.5">
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
                                  isSelected
                                    ? 'bg-emerald-500 border-emerald-500'
                                    : 'border-zinc-300 dark:border-zinc-600 group-hover:border-emerald-400'
                                }`}>
                                  {isSelected && (
                                    <Check size={14} className="text-white" />
                                  )}
                                </div>
                              </div>

                              {/* Badges */}
                              <div className="mt-3 flex items-center gap-2 flex-wrap">
                                {user.role && (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800">
                                    <Shield size={10} className="mr-1" />
                                    {user.role}
                                  </span>
                                )}
                                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border ${
                                  user.user_type_id === 1
                                    ? 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800'
                                    : 'bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-900/20 dark:text-teal-400 dark:border-teal-800'
                                }`}>
                                  {user.user_type_id === 1 ? 'Administrador' : 'Colaborador'}
                                </span>
                                {user.coin_balance !== undefined && user.coin_balance > 0 && (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800">
                                    <Coins size={10} />
                                    {user.coin_balance.toLocaleString('pt-BR')}
                                  </span>
                                )}
                              </div>
                            </motion.button>
                          );
                        })}
                      </div>
                    )}

                    {/* Paginação */}
                    {usersTotalPages > 1 && (
                      <div className="flex items-center justify-between mt-4 pt-4 border-t border-zinc-200 dark:border-zinc-700">
                        <button
                          onClick={() => setUsersPage(prev => Math.max(prev - 1, 1))}
                          disabled={usersPage === 1}
                          className="px-4 py-2 border border-zinc-300 dark:border-zinc-600 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed text-zinc-600 dark:text-zinc-400 text-sm font-medium"
                        >
                          Anterior
                        </button>
                        <span className="text-sm text-zinc-600 dark:text-zinc-400">
                          Página {usersPage} de {usersTotalPages}
                        </span>
                        <button
                          onClick={() => setUsersPage(prev => Math.min(prev + 1, usersTotalPages))}
                          disabled={usersPage === usersTotalPages}
                          className="px-4 py-2 border border-zinc-300 dark:border-zinc-600 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed text-zinc-600 dark:text-zinc-400 text-sm font-medium"
                        >
                          Próxima
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* Tab Questões */}
                {activeTab === 'questions' && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-zinc-500 dark:text-zinc-400">
                        Adicione as questões da pesquisa:
                      </p>
                      <button
                        onClick={addQuestion}
                        className="text-sm font-medium text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1"
                      >
                        <Plus size={14} />
                        Adicionar Questão
                      </button>
                    </div>

                    {questions.length === 0 ? (
                      <div className="text-center py-12 border border-dashed border-zinc-300 dark:border-zinc-700 rounded-xl">
                        <FileText className="w-12 h-12 text-zinc-300 dark:text-zinc-600 mx-auto mb-3" />
                        <p className="text-zinc-500 dark:text-zinc-400">Nenhuma questão adicionada</p>
                        <button
                          onClick={addQuestion}
                          className="mt-2 text-emerald-600 dark:text-emerald-400 font-medium hover:underline"
                        >
                          Adicionar primeira questão
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {questions.map((question, qIndex) => (
                          <div key={qIndex} className="border border-zinc-200 dark:border-zinc-700 rounded-xl p-4 bg-white dark:bg-zinc-900">
                            <div className="flex items-center justify-between mb-3">
                              <span className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                                Questão {question.order}
                              </span>
                              <button
                                onClick={() => removeQuestion(qIndex)}
                                className="text-zinc-400 hover:text-red-500 transition-colors"
                              >
                                <Trash2 size={18} />
                              </button>
                            </div>

                            <div className="space-y-3">
                              <input
                                type="text"
                                value={question.question}
                                onChange={(e) => updateQuestion(qIndex, 'question', e.target.value)}
                                placeholder="Digite a pergunta..."
                                className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white"
                              />

                              <div className="flex gap-2">
                                <select
                                  value={question.type}
                                  onChange={(e) => updateQuestion(qIndex, 'type', e.target.value)}
                                  className="px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white text-sm"
                                >
                                  <option value="choice">Múltipla Escolha</option>
                                  <option value="text">Texto Aberto</option>
                                </select>
                              </div>

                              {question.type === 'choice' && (
                                <div className="space-y-2">
                                  <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Opções:</p>
                                  {question.options?.map((option, oIndex) => (
                                    <div key={oIndex} className="flex gap-2">
                                      <input
                                        type="text"
                                        value={option.option_text}
                                        onChange={(e) => updateOption(qIndex, oIndex, e.target.value)}
                                        placeholder={`Opção ${oIndex + 1}`}
                                        className="flex-1 px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white text-sm"
                                      />
                                      <button
                                        onClick={() => removeOption(qIndex, oIndex)}
                                        className="p-2 text-zinc-400 hover:text-red-500 transition-colors"
                                      >
                                        <X size={18} />
                                      </button>
                                    </div>
                                  ))}
                                  <button
                                    onClick={() => addOption(qIndex)}
                                    className="text-sm text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1"
                                  >
                                    <Plus size={14} />
                                    Adicionar Opção
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
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
                      if (prev === 'questions') return 'users';
                      return 'basic';
                    })}
                    className="px-4 py-2.5 border border-zinc-300 dark:border-zinc-600 text-zinc-700 dark:text-zinc-300 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors font-medium"
                  >
                    Voltar
                  </button>
                )}
                {activeTab !== 'questions' ? (
                  <button
                    type="button"
                    onClick={() => {
                      if (activeTab === 'basic') setActiveTab('users');
                      else if (activeTab === 'users') setActiveTab('questions');
                    }}
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

      {/* Confirm Modal */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        onConfirm={confirmModal.onConfirm}
        isLoading={confirmModal.isLoading}
        onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
      />

      {/* Results Modal */}
      <AnimatePresence>
        {resultsModal.isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={handleCloseResults}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-y-auto"
            >
              {/* Header */}
              <div className="p-6 border-b border-zinc-100 dark:border-zinc-800 flex justify-between items-start sticky top-0 bg-white dark:bg-zinc-900 rounded-t-2xl">
                <div>
                  <h2 className="text-xl font-bold text-zinc-900 dark:text-white">
                    {resultsModal.survey?.title || 'Resultados'}
                  </h2>
                  {resultsModal.results && (
                    <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
                      {resultsModal.results.total_responses} {resultsModal.results.total_responses === 1 ? 'resposta' : 'respostas'} • {resultsModal.results.is_anonymous ? 'Anônimo' : 'Não anônimo'}
                    </p>
                  )}
                </div>
                <button
                  onClick={handleCloseResults}
                  className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors"
                >
                  <X size={24} />
                </button>
              </div>

              {/* Content */}
              <div className="p-6">
                {resultsModal.loading && (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 size={32} className="animate-spin text-emerald-600" />
                  </div>
                )}

                {resultsModal.results && !resultsModal.loading && (
                  <div className="space-y-6">
                    {resultsModal.results.questions.length === 0 ? (
                      <p className="text-center text-zinc-500 dark:text-zinc-400 py-8">
                        Nenhuma questão nesta pesquisa.
                      </p>
                    ) : (
                      resultsModal.results.questions.map((question, index) => (
                        <div key={question.question_id} className="border border-zinc-200 dark:border-zinc-700 rounded-xl p-4">
                          <div className="flex items-start gap-3 mb-4">
                            <span className="flex-shrink-0 w-8 h-8 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 rounded-lg flex items-center justify-center font-bold text-sm">
                              {index + 1}
                            </span>
                            <div className="flex-1">
                              <p className="font-medium text-zinc-900 dark:text-white">
                                {question.question}
                              </p>
                              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 capitalize">
                                Tipo: {question.type === 'choice' ? 'Múltipla escolha' : 'Texto aberto'}
                              </p>
                            </div>
                          </div>

                          {question.type === 'choice' && question.results.length > 0 && (
                            <div className="space-y-3">
                              {question.results.map((result) => {
                                const percentage = resultsModal.results!.total_responses > 0
                                  ? Math.round((result.count / resultsModal.results!.total_responses) * 100)
                                  : 0;
                                return (
                                  <div key={result.option_id}>
                                    <div className="flex justify-between items-center mb-1">
                                      <span className="text-sm text-zinc-700 dark:text-zinc-300">
                                        {result.option_text}
                                      </span>
                                      <span className="text-sm font-medium text-zinc-900 dark:text-white">
                                        {result.count} ({percentage}%)
                                      </span>
                                    </div>
                                    <div className="w-full bg-zinc-200 dark:bg-zinc-700 rounded-full h-2.5 overflow-hidden">
                                      <div
                                        className="bg-emerald-600 h-2.5 rounded-full transition-all duration-500"
                                        style={{ width: `${percentage}%` }}
                                      />
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}

                          {question.type === 'text' && (
                            <p className="text-sm text-zinc-500 dark:text-zinc-400 italic">
                              Respostas de texto não são exibidas neste resumo.
                            </p>
                          )}

                          {question.type === 'choice' && question.results.length === 0 && (
                            <p className="text-sm text-zinc-500 dark:text-zinc-400 italic">
                              Nenhuma resposta ainda.
                            </p>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </Layout>
  );
};
