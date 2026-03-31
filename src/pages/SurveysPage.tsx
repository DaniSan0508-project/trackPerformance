import React, { useState, useEffect, useCallback } from 'react';
import { Layout } from '../components/Layout';
import { Search, Loader2, RefreshCw, ChevronLeft, ChevronRight, FileText, Calendar, Eye, Users, CheckCircle, XCircle, Clock, EyeOff, Plus, Edit2, Trash2, X, Save, Check, User as UserIcon, Shield, User, BarChart3, PlusCircle, GripVertical, Copy, DollarSign } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../context/AuthContext';
import { Survey, SurveyStatus, User as UserType, SurveyResults, SurveyResultTextOption, SurveyResultChoiceOption } from '../types';
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

interface Question {
  id?: number;
  question: string;
  type: 'choice' | 'text';
  order: number;
  options?: Array<{ id?: number; option_text: string }>;
  required?: boolean;
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
    survey_type: '' as 'choice' | 'text' | '',
    status: 'draft' as SurveyStatus,
    coins_reward: false,
  });

  const isReadOnly = !!editingSurvey && (editingSurvey.status === 'active' || editingSurvey.status === 'closed');
  const canPublish = formData.status !== 'draft';

  // Valida se Dados Básicos estão completos
  const isBasicDataComplete = () => {
    const hasTitle = formData.title.trim();
    const hasType = formData.survey_type;
    const hasStartDate = formData.starts_at;
    const hasEndDate = formData.ends_at;
    const hasStatus = formData.status;
    
    return hasTitle && hasType && hasStartDate && hasEndDate && hasStatus;
  };

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

  // Filtros e paginação para respostas
  const [textResponseFilter, setTextResponseFilter] = useState('');
  const [textResponsePage, setTextResponsePage] = useState(1);
  const [choiceResponseFilter, setChoiceResponseFilter] = useState('');
  const [choiceResponsePage, setChoiceResponsePage] = useState(1);
  const TEXT_RESPONSES_PER_PAGE = 10;
  const CHOICE_USERS_PER_PAGE = 10;

  const fetchSurveys = useCallback(async (page = 1, search = '') => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const publishedParam = publishedFilter !== 'all' ? publishedFilter : undefined;

      const data = await api.getSurveys(token, page, search, undefined, publishedParam);
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
  }, [token, publishedFilter]);

  useEffect(() => {
    fetchSurveys(currentPage, debouncedSearchTerm);
  }, [fetchSurveys, currentPage, debouncedSearchTerm]);

  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearchTerm, publishedFilter]);

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

  // Resetar página quando a busca ou tipo de filtro mudarem
  useEffect(() => {
    if (isModalOpen && activeTab === 'users') {
      setUsersPage(1);
    }
  }, [debouncedUserSearch, userFilterType]);

  // Buscar usuários quando a página, busca ou filtro mudarem
  useEffect(() => {
    if (isModalOpen && activeTab === 'users') {
      fetchUsers(usersPage, debouncedUserSearch, userFilterType);
    }
  }, [usersPage, debouncedUserSearch, userFilterType, isModalOpen, activeTab]);

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
  };

  const [loadingDetail, setLoadingDetail] = useState(false);

  const handleOpenModal = async (survey?: Survey) => {
    setActiveTab('basic');
    if (survey) {
      setEditingSurvey(survey);
      setLoadingDetail(true);
      setIsModalOpen(true);
      try {
        // Busca detalhes completos com questões
        const response = await fetch(`${API_BASE_URL}/surveys/${survey.id}?include=questions`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/json',
          },
        });
        
        if (!response.ok) throw new Error('Falha ao carregar detalhes da pesquisa');
        const { data: detail } = await response.json();

        // Busca usuários separadamente da nova rota
        const usersResponse = await api.getSurveyUsers(token, survey.id);
        const surveyUsers = usersResponse.data || [];

        setFormData({
          title: detail.title,
          starts_at: detail.starts_at.split('T')[0],
          ends_at: detail.ends_at.split('T')[0],
          is_anonymous: detail.is_anonymous,
          is_published: detail.is_published,
          survey_type: detail.questions?.[0]?.type || 'text',
          status: detail.status,
          coins_reward: detail.coins_reward || false,
        });

        // Mapeia as questões
        if (detail.questions) {
          const mappedQuestions: Question[] = detail.questions.map((q: any) => ({
            id: q.id,
            question: q.question,
            type: q.type,
            order: q.order,
            options: q.options?.map((o: any) => ({ id: o.id, option_text: o.option_text })) || []
          }));
          setQuestions(mappedQuestions);
        }

        // Mapeia os usuários selecionados da nova rota
        setSelectedUsers(surveyUsers.map((u: any) => u.id));

      } catch (error: any) {
        console.error('Error loading survey details:', error);
        addToast('error', 'Não foi possível carregar todos os dados da pesquisa.');
        handleCloseModal();
      } finally {
        setLoadingDetail(false);
      }
    } else {
      setEditingSurvey(null);
      setFormData({
        title: '',
        starts_at: '',
        ends_at: '',
        is_anonymous: false,
        is_published: false,
        survey_type: '',
        status: 'draft',
        coins_reward: false,
      });
      setSelectedUsers([]);
      setQuestions([]);
      setIsModalOpen(true);
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingSurvey(null);
    setActiveTab('basic');
    setFormData(prev => ({ ...prev, survey_type: '' }));
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

  // Atualiza as tags de cargos selecionados automaticamente
  useEffect(() => {
    if (!isModalOpen || users.length === 0) return;

    const roles = ['Atendente', 'Vendedor', 'Representante', 'Consultor', 'Supervisor', 'Gerente', 'Coordenador'];
    const newFullySelectedRoles = new Set<string>();

    roles.forEach(role => {
      const usersInRole = users.filter(u => u.role === role);
      if (usersInRole.length > 0 && usersInRole.every(u => selectedUsers.includes(u.id))) {
        newFullySelectedRoles.add(role);
      }
    });

    setFullySelectedRoles(newFullySelectedRoles);
  }, [selectedUsers, users, isModalOpen]);

  const addQuestion = () => {
    const newOrder = questions.length + 1;
    // Usa o tipo definido no survey_type
    const questionType = formData.survey_type || 'text';
    setQuestions([...questions, { 
      question: '', 
      type: questionType, 
      order: newOrder,
      options: questionType === 'choice' ? [{ option_text: '' }, { option_text: '' }] : []
    }]);
  };

  const removeQuestion = (index: number) => {
    const newQuestions = questions.filter((_, i) => i !== index);
    newQuestions.forEach((q, i) => q.order = i + 1);
    setQuestions(newQuestions);
  };

  const updateQuestion = (index: number, field: keyof Question, value: any) => {
    const newQuestions = [...questions];
    newQuestions[index][field] = value;
    setQuestions(newQuestions);
  };

  const addOption = (questionIndex: number) => {
    const newQuestions = [...questions];
    const question = newQuestions[questionIndex];
    
    if (!question.options) {
      question.options = [];
    }
    
    // Só adiciona nova opção se a última não estiver vazia
    const lastOption = question.options[question.options.length - 1];
    if (lastOption && !lastOption.option_text.trim()) {
      addToast('warning', 'Preencha a opção anterior antes de adicionar outra.');
      return;
    }
    
    question.options.push({ option_text: '' });
    setQuestions(newQuestions);
  };

  const removeOption = (questionIndex: number, optionIndex: number) => {
    const newQuestions = [...questions];
    const question = newQuestions[questionIndex];
    
    // Não permite excluir se tiver apenas 2 opções
    if (question.options && question.options.length <= 2) {
      addToast('warning', 'Mínimo de 2 opções necessárias.');
      return;
    }

    question.options!.splice(optionIndex, 1);
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
    if (!formData.survey_type) {
      addToast('error', 'Selecione o tipo de pesquisa (múltipla escolha ou texto aberto).');
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
      // Valida baseado no survey_type
      if (formData.survey_type === 'choice') {
        if (!q.options || q.options.length === 0) {
          addToast('error', `Questão ${i + 1} precisa de pelo menos 2 opções.`);
          setActiveTab('questions');
          return;
        }
        if (q.options.length < 2) {
          addToast('error', `Questão ${i + 1} precisa de pelo menos 2 opções.`);
          setActiveTab('questions');
          return;
        }
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
      // Prepara as questões: remove 'options' para texto e remove campos desnecessários
      const questionsToSave = questions.map(q => {
        const { required, ...rest } = q; // Remove campo required
        if (formData.survey_type === 'text') {
          const { options, ...restWithoutOptions } = rest;
          return restWithoutOptions;
        }
        return rest;
      });

      const dataToSave = {
        title: formData.title,
        starts_at: formData.starts_at,
        ends_at: formData.ends_at,
        is_anonymous: formData.is_anonymous,
        is_published: formData.is_published,
        status: formData.status,
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
          setConfirmModal(prev => ({ ...prev, isOpen: false }));
        } catch (error: any) {
          console.error('Error deleting survey:', error);
          addToast('error', error.message || 'Erro ao excluir pesquisa.');
          setConfirmModal(prev => ({ ...prev, isOpen: false }));
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
    // Resetar filtros e paginação
    setTextResponseFilter('');
    setTextResponsePage(1);
    setChoiceResponseFilter('');
    setChoiceResponsePage(1);
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
              className="bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 p-2 rounded-xl text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-all"
              title="Atualizar"
            >
              <RefreshCw size={20} />
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
            <div className="md:col-span-3 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-zinc-400" size={18} />
              <input
                type="text"
                placeholder="Buscar por título..."
                className="w-full pl-10 pr-4 py-2.5 border border-zinc-300 dark:border-zinc-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-500"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

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
              {searchTerm || publishedFilter !== 'all'
                ? 'Tente ajustar os filtros para encontrar o que procura.'
                : 'Comece criando uma nova pesquisa.'}
            </p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-4">
              {surveys.map((survey) => {
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

                            {/* Badge de Status */}
                            {survey.status === 'draft' && (
                              <span className="px-2 py-1 rounded-full text-xs font-bold bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 flex items-center gap-1">
                                <Clock size={12} />
                                Rascunho
                              </span>
                            )}
                            {survey.status === 'active' && (
                              <span className="px-2 py-1 rounded-full text-xs font-bold bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
                                <Check size={12} />
                                Ativa
                              </span>
                            )}
                            {survey.status === 'closed' && (
                              <span className="px-2 py-1 rounded-full text-xs font-bold bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 flex items-center gap-1">
                                <X size={12} />
                                Encerrada
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
              <div className="flex-1 overflow-y-auto p-6 relative min-h-0">
                {loadingDetail && (
                  <div className="absolute inset-0 bg-white/50 dark:bg-zinc-900/50 backdrop-blur-sm z-10 flex items-center justify-center">
                    <Loader2 className="w-10 h-10 text-emerald-600 animate-spin" />
                  </div>
                )}

                {isReadOnly && (
                  <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl flex items-center gap-2">
                    <Shield size={16} className="text-blue-600 dark:text-blue-400" />
                    <p className="text-xs font-medium text-blue-700 dark:text-blue-300">
                      Esta pesquisa está {formData.status === 'active' ? 'Ativa' : 'Encerrada'} e não pode ser editada, apenas visualizada.
                    </p>
                  </div>
                )}
                
                {/* Tab Dados Básicos */}
                {activeTab === 'basic' && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                          Título da Pesquisa *
                        </label>
                        <input
                          type="text"
                          disabled={isReadOnly}
                          value={formData.title}
                          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                          placeholder="Ex: Pesquisa de Clima Organizacional"
                          className="w-full px-4 py-2.5 border border-zinc-300 dark:border-zinc-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white disabled:opacity-60"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                          Status da Pesquisa *
                        </label>
                        <select
                          value={formData.status}
                          disabled={isReadOnly}
                          onChange={(e) => setFormData({ ...formData, status: e.target.value as SurveyStatus })}
                          className="w-full px-4 py-2.5 border border-zinc-300 dark:border-zinc-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white disabled:opacity-60"
                        >
                          <option value="draft">Rascunho</option>
                          <option value="active">Ativa</option>
                          <option value="closed">Encerrada</option>
                        </select>
                      </div>
                    </div>

                    {/* Tipo de Pesquisa */}
                    <div>
                      <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                        Tipo de Pesquisa *
                      </label>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-3">
                        Escolha o formato das questões. Todas as questões seguirão este padrão.
                      </p>
                      <div className="grid grid-cols-2 gap-3">
                        <button
                          type="button"
                          disabled={isReadOnly}
                          onClick={() => {
                            if (isReadOnly) return;
                            setFormData({ ...formData, survey_type: 'choice' });
                            // Limpa questões existentes se mudar o tipo
                            setQuestions([]);
                          }}
                          className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-3 ${
                            formData.survey_type === 'choice'
                              ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 shadow-md'
                              : 'border-zinc-200 dark:border-zinc-700 hover:border-zinc-300 dark:hover:border-zinc-600'
                          } ${isReadOnly ? 'cursor-not-allowed' : ''} ${isReadOnly && formData.survey_type !== 'choice' ? 'opacity-40' : ''}`}
                        >
                          <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                            formData.survey_type === 'choice'
                              ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                              : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500'
                          }`}>
                            <BarChart3 size={24} />
                          </div>
                          <div className="text-center">
                            <p className="font-semibold text-sm text-zinc-900 dark:text-white">Múltipla Escolha</p>
                            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">Opções de resposta</p>
                          </div>
                        </button>
                        <button
                          type="button"
                          disabled={isReadOnly}
                          onClick={() => {
                            if (isReadOnly) return;
                            setFormData({ ...formData, survey_type: 'text' });
                            // Limpa questões existentes se mudar o tipo
                            setQuestions([]);
                          }}
                          className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-3 ${
                            formData.survey_type === 'text'
                              ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 shadow-md'
                              : 'border-zinc-200 dark:border-zinc-700 hover:border-zinc-300 dark:hover:border-zinc-600'
                          } ${isReadOnly ? 'cursor-not-allowed' : ''} ${isReadOnly && formData.survey_type !== 'text' ? 'opacity-40' : ''}`}
                        >
                          <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                            formData.survey_type === 'text'
                              ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400'
                              : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500'
                          }`}>
                            <FileText size={24} />
                          </div>
                          <div className="text-center">
                            <p className="font-semibold text-sm text-zinc-900 dark:text-white">Texto Aberto</p>
                            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">Respostas livres</p>
                          </div>
                        </button>
                      </div>
                      {formData.survey_type ? (
                        <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-2 flex items-center gap-1">
                          <CheckCircle size={12} />
                          Tipo selecionado: {formData.survey_type === 'choice' ? 'Múltipla Escolha' : 'Texto Aberto'}
                        </p>
                      ) : (
                        <p className="text-xs text-amber-600 dark:text-amber-400 mt-2 flex items-center gap-1">
                          <Shield size={12} />
                          Selecione um tipo para continuar
                        </p>
                      )}
                      
                      {/* Checklist do que falta preencher */}
                      {!isBasicDataComplete() && (
                        <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl">
                          <p className="text-xs font-semibold text-amber-800 dark:text-amber-400 mb-2">
                            📋 Preencha os campos obrigatórios:
                          </p>
                          <div className="space-y-1">
                            {!formData.title.trim() && (
                              <p className="text-xs text-amber-700 dark:text-amber-500 flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                                Título da pesquisa
                              </p>
                            )}
                            {!formData.survey_type && (
                              <p className="text-xs text-amber-700 dark:text-amber-500 flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                                Tipo de pesquisa
                              </p>
                            )}
                            {!formData.starts_at && (
                              <p className="text-xs text-amber-700 dark:text-amber-500 flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                                Data de início
                              </p>
                            )}
                            {!formData.ends_at && (
                              <p className="text-xs text-amber-700 dark:text-amber-500 flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                                Data de término
                              </p>
                            )}
                          </div>
                        </div>
                      )}
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
                      <label className={`flex items-center gap-3 p-3 border border-zinc-200 dark:border-zinc-700 rounded-xl cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors ${isReadOnly ? 'opacity-60 cursor-not-allowed' : ''}`}>
                        <input
                          type="checkbox"
                          disabled={isReadOnly}
                          checked={formData.is_anonymous}
                          onChange={(e) => setFormData({ ...formData, is_anonymous: e.target.checked })}
                          className="w-5 h-5 text-emerald-600 rounded focus:ring-emerald-500 disabled:opacity-50"
                        />
                        <div>
                          <p className="font-medium text-zinc-900 dark:text-white">Pesquisa Anônima</p>
                          <p className="text-sm text-zinc-500 dark:text-zinc-400">As respostas não serão vinculadas aos usuários</p>
                        </div>
                      </label>

                      <label className={`flex items-center gap-3 p-3 border border-zinc-200 dark:border-zinc-700 rounded-xl cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors ${(!canPublish || isReadOnly) ? 'opacity-60 cursor-not-allowed' : ''}`}>
                        <input
                          type="checkbox"
                          disabled={!canPublish || isReadOnly}
                          checked={formData.is_published}
                          onChange={(e) => setFormData({ ...formData, is_published: e.target.checked })}
                          className="w-5 h-5 text-emerald-600 rounded focus:ring-emerald-500 disabled:opacity-50"
                        />
                        <div>
                          <p className="font-medium text-zinc-900 dark:text-white">Publicar Imediatamente</p>
                          <p className="text-sm text-zinc-500 dark:text-zinc-400">
                            {!canPublish ? 'Pesquisas rascunho não podem ser publicadas diretamente' : 'A pesquisa ficará visível para os participantes'}
                          </p>
                        </div>
                      </label>

                      <label className={`flex items-center gap-3 p-3 border border-zinc-200 dark:border-zinc-700 rounded-xl cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors ${isReadOnly ? 'opacity-60 cursor-not-allowed' : ''}`}>
                        <input
                          type="checkbox"
                          disabled={isReadOnly}
                          checked={formData.coins_reward}
                          onChange={(e) => setFormData({ ...formData, coins_reward: e.target.checked })}
                          className="w-5 h-5 text-emerald-600 rounded focus:ring-emerald-500 disabled:opacity-50"
                        />
                        <div>
                          <p className="font-medium text-zinc-900 dark:text-white">Recompensar com Moedas</p>
                          <p className="text-sm text-zinc-500 dark:text-zinc-400">Os participantes ganharão moedas ao responder</p>
                        </div>
                      </label>
                    </div>
                  </div>
                )}

                {/* Tab Usuários */}
                {activeTab === 'users' && (
                  <div className="space-y-4">
                    <p className="text-sm text-zinc-500 dark:text-zinc-400">
                      Selecione os usuários que participarão desta pesquisa:
                    </p>

                    {/* Filtros e busca de usuários */}
                    <div className="flex gap-2 mb-4">
                      {/* Tipo de busca */}
                      <select
                        value={userFilterType}
                        onChange={(e) => {
                          setUserFilterType(e.target.value as 'name' | 'email');
                          setUsersPage(1);
                        }}
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
                          disabled={loadingSelectAllUsers || isReadOnly}
                          className={`px-4 py-2 text-sm font-bold rounded-xl transition-all flex items-center justify-center gap-2 shadow-sm border ${
                            selectedUsers.length > 0
                              ? 'bg-red-50 text-red-600 border-red-200 hover:bg-red-100 dark:bg-red-900/20 dark:border-red-800 dark:text-red-400'
                              : 'bg-emerald-600 text-white border-emerald-500 hover:bg-emerald-700 shadow-emerald-500/20'
                          } disabled:opacity-50 disabled:cursor-not-allowed`}
                        >
                          {loadingSelectAllUsers ? (
                            <>
                              <Loader2 size={16} className="animate-spin" />
                              <span>{selectAllUsersProgress ? `Pág ${selectAllUsersProgress.current}/${selectAllUsersProgress.total}` : 'Processando...'}</span>
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
                          {['Atendente', 'Vendedor', 'Representante', 'Consultor', 'Supervisor', 'Gerente', 'Coordenador'].map((role) => (
                            <button
                              key={role}
                              onClick={() => handleSelectAllByRole(role)}
                              disabled={selectByRoleLoading !== null || isReadOnly}
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
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pr-2">
                        {users.map((user) => {
                          const isSelected = selectedUsers.includes(user.id);
                          return (
                            <motion.button
                              key={user.id}
                              onClick={() => !isReadOnly && toggleUser(user.id)}
                              initial={{ opacity: 0, scale: 0.95 }}
                              animate={{ opacity: 1, scale: 1 }}
                              className={`p-4 rounded-xl border-2 transition-all duration-200 text-left group ${
                                isSelected
                                  ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-500 shadow-md'
                                  : 'bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 hover:border-emerald-300 dark:hover:border-emerald-700 hover:shadow-sm'
                              } ${isReadOnly ? 'cursor-default' : ''}`}
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
                                    <DollarSign size={10} />
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
                    {/* Header com instruções */}
                    <div className={`rounded-xl p-4 border ${
                      formData.survey_type === 'choice'
                        ? 'bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-blue-200 dark:border-blue-800'
                        : 'bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 border-emerald-200 dark:border-emerald-800'
                    }`}>
                      <div className="flex items-start gap-3">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                          formData.survey_type === 'choice'
                            ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                            : 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400'
                        }`}>
                          {formData.survey_type === 'choice' ? <BarChart3 size={20} /> : <FileText size={20} />}
                        </div>
                        <div className="flex-1">
                          <h3 className="font-semibold text-zinc-900 dark:text-white">
                            {formData.survey_type === 'choice' ? 'Questões de Múltipla Escolha' : 'Questões de Texto Aberto'}
                          </h3>
                          <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
                            {formData.survey_type === 'choice'
                              ? 'Adicione questões com opções de resposta. Os participantes selecionarão uma alternativa.'
                              : 'Adicione questões com respostas livres. Os participantes digitarão suas respostas.'}
                          </p>
                        </div>
                      </div>
                    </div>

                    {questions.length === 0 ? (
                      <div className="text-center py-12 border border-dashed border-zinc-300 dark:border-zinc-700 rounded-xl bg-zinc-50 dark:bg-zinc-800/30">
                        <FileText className="w-16 h-16 text-zinc-300 dark:text-zinc-600 mx-auto mb-4" />
                        <p className="text-zinc-500 dark:text-zinc-400 font-medium">Nenhuma questão adicionada</p>
                        {!isReadOnly && (
                          <>
                            <p className="text-sm text-zinc-400 dark:text-zinc-500 mt-1">
                              Clique em "Adicionar Nova Questão" para começar
                            </p>
                            <button
                              type="button"
                              onClick={addQuestion}
                              className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-all font-medium"
                            >
                              <PlusCircle size={18} />
                              Adicionar Primeira Questão
                            </button>
                          </>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {questions.map((question, qIndex) => (
                          <motion.div
                            key={qIndex}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="border border-zinc-200 dark:border-zinc-700 rounded-xl p-5 bg-white dark:bg-zinc-900 shadow-sm hover:shadow-md transition-all"
                          >
                            {/* Header da questão */}
                            <div className="flex items-center justify-between mb-4">
                              <div className="flex items-center gap-3">
                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                                  formData.survey_type === 'choice'
                                    ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
                                    : 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400'
                                }`}>
                                  {formData.survey_type === 'choice' ? <BarChart3 size={16} /> : <FileText size={16} />}
                                </div>
                                <span className="font-semibold text-zinc-700 dark:text-zinc-300">
                                  Questão {question.order}
                                </span>
                              </div>
                              {!isReadOnly && (
                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={() => {
                                      // Deep clone para evitar que mudanças na cópia afetem a original (especialmente options)
                                      // Remove o id para que o backend trate como uma nova questão
                                      const { id, ...rest } = question;
                                      const newQuestion: Question = { 
                                        ...JSON.parse(JSON.stringify(rest)), 
                                        order: questions.length + 1 
                                      };
                                      setQuestions([...questions, newQuestion]);
                                      addToast('success', 'Questão duplicada!');
                                    }}
                                    className="p-2 text-zinc-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-all"
                                    title="Duplicar questão"
                                  >
                                    <Copy size={16} />
                                  </button>
                                  <button
                                    onClick={() => removeQuestion(qIndex)}
                                    className="p-2 text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all"
                                    title="Excluir questão"
                                  >
                                    <Trash2 size={18} />
                                  </button>
                                </div>
                              )}
                            </div>

                            <div className="space-y-4">
                              {/* Input da pergunta */}
                              <div>
                                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                                  Pergunta <span className="text-red-500">*</span>
                                </label>
                                <textarea
                                  disabled={isReadOnly}
                                  value={question.question}
                                  onChange={(e) => updateQuestion(qIndex, 'question', e.target.value)}
                                  placeholder="Digite sua pergunta aqui..."
                                  rows={2}
                                  className="w-full px-4 py-3 border border-zinc-300 dark:border-zinc-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white resize-none disabled:opacity-60"
                                />
                              </div>

                              {/* Opções para múltipla escolha */}
                              {formData.survey_type === 'choice' && (
                                <div className="bg-zinc-50 dark:bg-zinc-800/50 rounded-xl p-4 space-y-3">
                                  <div className="flex items-center justify-between">
                                    <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                                      Opções de Resposta
                                    </label>
                                    <span className="text-xs text-zinc-500 dark:text-zinc-400">
                                      {question.options?.length || 0} opção(ões)
                                    </span>
                                  </div>

                                  {question.options?.map((option, oIndex) => (
                                    <div key={oIndex} className="flex gap-2 items-center">
                                      <div className="w-6 h-6 rounded-full border-2 border-zinc-300 dark:border-zinc-600 flex items-center justify-center flex-shrink-0">
                                        <div className="w-3 h-3 rounded-full bg-zinc-300 dark:bg-zinc-600" />
                                      </div>
                                      <input
                                        type="text"
                                        disabled={isReadOnly}
                                        value={option.option_text}
                                        onChange={(e) => updateOption(qIndex, oIndex, e.target.value)}
                                        placeholder={`Opção ${oIndex + 1}`}
                                        className="flex-1 px-3 py-2.5 border border-zinc-300 dark:border-zinc-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white text-sm disabled:opacity-60"
                                      />
                                      {!isReadOnly && (
                                        <button
                                          onClick={() => removeOption(qIndex, oIndex)}
                                          className="p-2 text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all"
                                          title="Remover opção"
                                        >
                                          <X size={18} />
                                        </button>
                                      )}
                                    </div>
                                  ))}

                                  {!isReadOnly && (
                                    <button
                                      onClick={() => addOption(qIndex)}
                                      className="w-full py-2.5 border-2 border-dashed border-zinc-300 dark:border-zinc-600 rounded-lg text-zinc-500 dark:text-zinc-400 hover:border-emerald-500 hover:text-emerald-600 dark:hover:text-emerald-400 transition-all flex items-center justify-center gap-2 text-sm font-medium"
                                    >
                                      <Plus size={16} />
                                      Adicionar Opção
                                    </button>
                                  )}
                                </div>
                              )}

                              {/* Info para texto aberto */}
                              {formData.survey_type === 'text' && (
                                <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl p-3">
                                  <p className="text-sm text-emerald-700 dark:text-emerald-400 flex items-center gap-2">
                                    <CheckCircle size={16} />
                                    Os participantes poderão digitar uma resposta livre para esta questão
                                  </p>
                                </div>
                              )}
                            </div>
                          </motion.div>
                        ))}

                        {/* Botão adicionar questão ao final da lista - ESCONDIDO se ReadOnly */}
                        {!isReadOnly && (
                          <button
                            type="button"
                            onClick={addQuestion}
                            className="w-full border-2 border-dashed border-zinc-300 dark:border-zinc-600 rounded-xl p-4 text-zinc-500 dark:text-zinc-400 hover:border-emerald-500 hover:text-emerald-600 dark:hover:text-emerald-400 transition-all flex items-center justify-center gap-2 font-medium bg-zinc-50/30 dark:bg-zinc-800/10"
                          >
                            <PlusCircle size={20} />
                            Adicionar Nova Questão
                          </button>
                        )}
                      </div>
                    )}

                    {/* Resumo */}
                    {questions.length > 0 && (
                      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                            <CheckCircle className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                          </div>
                          <div>
                            <p className="font-semibold text-blue-900 dark:text-blue-300">
                              {questions.length} {questions.length === 1 ? 'questão adicionada' : 'questões adicionadas'}
                            </p>
                            <p className="text-sm text-blue-700 dark:text-blue-400">
                              Tipo: {formData.survey_type === 'choice' ? 'Múltipla Escolha' : 'Texto Aberto'}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Footer Actions */}
              <div className="p-6 border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/50 flex flex-col sm:flex-row gap-3 items-center justify-between">
                <div className="flex gap-3 w-full sm:w-auto">
                  {activeTab !== 'basic' && (
                    <button
                      type="button"
                      onClick={() => {
                        if (activeTab === 'users') setActiveTab('basic');
                        if (activeTab === 'questions') setActiveTab('users');
                      }}
                      className="px-6 py-2.5 border border-zinc-300 dark:border-zinc-600 text-zinc-700 dark:text-zinc-300 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-all font-bold flex items-center gap-2"
                    >
                      <ChevronLeft size={18} />
                      Voltar
                    </button>
                  )}
                  {activeTab === 'questions' && !isReadOnly && (
                    <button
                      type="button"
                      onClick={addQuestion}
                      className="px-6 py-2.5 border border-emerald-500 text-emerald-600 dark:text-emerald-400 rounded-xl hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-all font-bold flex items-center gap-2"
                    >
                      <PlusCircle size={18} />
                      Nova Questão
                    </button>
                  )}
                </div>

                <div className="flex gap-3 w-full sm:w-auto justify-end">
                  <button
                    type="button"
                    onClick={handleCloseModal}
                    className="px-6 py-2.5 border border-zinc-300 dark:border-zinc-600 text-zinc-700 dark:text-zinc-300 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-all font-bold"
                  >
                    Cancelar
                  </button>

                  {activeTab !== 'questions' && (
                    <button
                      type="button"
                      onClick={() => {
                        if (activeTab === 'basic') {
                          if (!isBasicDataComplete()) {
                            addToast('warning', 'Preencha os dados básicos antes de prosseguir.');
                            return;
                          }
                          setActiveTab('users');
                        } else if (activeTab === 'users') {
                          setActiveTab('questions');
                        }
                      }}
                      className="px-6 py-2.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-white border border-zinc-200 dark:border-zinc-700 rounded-xl hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-all font-bold flex items-center gap-2"
                    >
                      Próximo
                      <ChevronRight size={18} />
                    </button>
                  )}

                  {/* Botão Salvar (Visível em Questions ou sempre em edição - ESCONDIDO se ReadOnly) */}
                  {(activeTab === 'questions' || editingSurvey) && !isReadOnly && (
                    <button
                      type="button"
                      onClick={handleSubmit}
                      disabled={saving || (activeTab === 'questions' && questions.length === 0)}
                      className="px-8 py-2.5 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-bold flex items-center gap-2 shadow-lg shadow-emerald-500/20"
                    >
                      {saving ? (
                        <>
                          <Loader2 size={20} className="animate-spin" />
                          <span>Salvando...</span>
                        </>
                      ) : (
                        <>
                          <Save size={18} />
                          <span>{editingSurvey ? 'Salvar Alterações' : 'Criar Pesquisa'}</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
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
              <div className="p-6 border-b border-zinc-100 dark:border-zinc-800 flex justify-between items-start sticky top-0 bg-white dark:bg-zinc-900 rounded-t-2xl z-10">
                <div className="flex-1">
                  <h2 className="text-xl font-bold text-zinc-900 dark:text-white">
                    {resultsModal.survey?.title || 'Resultados'}
                  </h2>
                  {resultsModal.results && (
                    <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
                      {resultsModal.results.is_anonymous ? '🔒 Anônimo' : '👤 Não anônimo'}
                    </p>
                  )}
                </div>
                <button
                  onClick={handleCloseResults}
                  className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors ml-4"
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
                              <div className="flex items-center gap-3 mt-1">
                                <span className="text-xs text-zinc-500 dark:text-zinc-400 capitalize flex items-center gap-1">
                                  {question.type === 'choice' ? (
                                    <>
                                      <BarChart3 size={12} />
                                      Múltipla escolha
                                    </>
                                  ) : (
                                    <>
                                      <FileText size={12} />
                                      Texto aberto
                                    </>
                                  )}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Múltipla Escolha */}
                          {question.type === 'choice' && (
                            <div className="space-y-4">
                              {(question.results as SurveyResultChoiceOption[]).map((result) => {
                                const percentage = resultsModal.results!.total_responses > 0
                                  ? Math.round((result.count / resultsModal.results!.total_responses) * 100)
                                  : 0;
                                const hasUsers = result.users && result.users.length > 0;
                                
                                // Filtra usuários pela busca
                                const filteredUsers = result.users?.filter(u => 
                                  u.name.toLowerCase().includes(choiceResponseFilter.toLowerCase())
                                ) || [];
                                const totalPages = Math.ceil(filteredUsers.length / CHOICE_USERS_PER_PAGE);
                                const currentPage = Math.min(choiceResponsePage, totalPages || 1);
                                const startIndex = (currentPage - 1) * CHOICE_USERS_PER_PAGE;
                                const displayedUsers = filteredUsers.slice(startIndex, startIndex + CHOICE_USERS_PER_PAGE);

                                return (
                                  <div key={result.option_id} className="space-y-2">
                                    <div className="flex justify-between items-center">
                                      <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                                        {result.option_text}
                                      </span>
                                      <span className="text-sm font-semibold text-zinc-900 dark:text-white">
                                        {result.count} ({percentage}%)
                                      </span>
                                    </div>
                                    <div className="w-full bg-zinc-200 dark:bg-zinc-700 rounded-full h-3 overflow-hidden">
                                      <div
                                        className={`h-3 rounded-full transition-all duration-500 ${
                                          percentage > 0 ? 'bg-emerald-600' : 'bg-zinc-400 dark:bg-zinc-600'
                                        }`}
                                        style={{ width: `${percentage}%` }}
                                      />
                                    </div>
                                    {hasUsers && !resultsModal.results?.is_anonymous && (
                                      <div className="mt-3 pt-3 border-t border-zinc-100 dark:border-zinc-700">
                                        <div className="flex items-center justify-between mb-2">
                                          <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 flex items-center gap-1">
                                            <User size={12} />
                                            Quem respondeu:
                                          </p>
                                          <span className="text-xs text-zinc-400 dark:text-zinc-500">
                                            {filteredUsers.length} {filteredUsers.length === 1 ? 'pessoa' : 'pessoas'}
                                          </span>
                                        </div>
                                        
                                        {/* Input de filtro */}
                                        {filteredUsers.length > 5 && (
                                          <div className="mb-3">
                                            <div className="relative">
                                              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400" />
                                              <input
                                                type="text"
                                                placeholder="Filtrar por nome..."
                                                value={choiceResponseFilter}
                                                onChange={(e) => {
                                                  setChoiceResponseFilter(e.target.value);
                                                  setChoiceResponsePage(1);
                                                }}
                                                className="w-full pl-8 pr-8 py-1.5 text-xs border border-zinc-200 dark:border-zinc-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white"
                                              />
                                              {choiceResponseFilter && (
                                                <button
                                                  onClick={() => {
                                                    setChoiceResponseFilter('');
                                                    setChoiceResponsePage(1);
                                                  }}
                                                  className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
                                                >
                                                  <X size={12} />
                                                </button>
                                              )}
                                            </div>
                                          </div>
                                        )}
                                        
                                        {/* Lista de usuários */}
                                        {filteredUsers.length === 0 ? (
                                          <p className="text-xs text-zinc-400 dark:text-zinc-500 italic">
                                            {choiceResponseFilter ? 'Nenhum usuário encontrado com este filtro.' : 'Nenhuma resposta.'}
                                          </p>
                                        ) : (
                                          <>
                                            <div className="flex flex-wrap gap-2">
                                              {displayedUsers.map((user) => {
                                                const hasProfileImage = user.profile_image_path && user.profile_image_path.trim() !== '';
                                                
                                                return (
                                                  <div
                                                    key={user.id}
                                                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg hover:border-emerald-300 dark:hover:border-emerald-600 transition-colors"
                                                    title={user.name}
                                                  >
                                                    {hasProfileImage ? (
                                                      <img
                                                        src={user.profile_image_path}
                                                        alt={user.name}
                                                        className="w-5 h-5 rounded-full object-cover border border-emerald-200 dark:border-emerald-800"
                                                      />
                                                    ) : (
                                                      <div className="w-5 h-5 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center flex-shrink-0">
                                                        <User size={12} className="text-emerald-600 dark:text-emerald-400" />
                                                      </div>
                                                    )}
                                                    <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300 max-w-[120px] truncate">
                                                      {user.name}
                                                    </span>
                                                  </div>
                                                );
                                              })}
                                            </div>
                                            
                                            {/* Paginação */}
                                            {totalPages > 1 && (
                                              <div className="flex items-center justify-center gap-2 mt-3 pt-3 border-t border-zinc-100 dark:border-zinc-700">
                                                <button
                                                  onClick={() => setChoiceResponsePage(prev => Math.max(prev - 1, 1))}
                                                  disabled={currentPage === 1}
                                                  className="p-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                                >
                                                  <ChevronLeft size={14} />
                                                </button>
                                                <span className="text-xs text-zinc-600 dark:text-zinc-400 font-medium">
                                                  Página {currentPage} de {totalPages}
                                                </span>
                                                <button
                                                  onClick={() => setChoiceResponsePage(prev => Math.min(prev + 1, totalPages))}
                                                  disabled={currentPage === totalPages}
                                                  className="p-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                                >
                                                  <ChevronRight size={14} />
                                                </button>
                                              </div>
                                            )}
                                          </>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}

                          {/* Texto Aberto */}
                          {question.type === 'text' && (
                            <div className="space-y-3">
                              {Array.isArray(question.results) && question.results.length > 0 ? (
                                (() => {
                                  // Filtra respostas pela busca (nome do usuário ou texto)
                                  const filteredResponses = (question.results as SurveyResultTextOption[]).filter(answer => {
                                    const searchLower = textResponseFilter.toLowerCase();
                                    const userName = answer.user?.name?.toLowerCase() || '';
                                    const textAnswer = answer.text_answer?.toLowerCase() || '';
                                    return userName.includes(searchLower) || textAnswer.includes(searchLower);
                                  });
                                  
                                  const totalPages = Math.ceil(filteredResponses.length / TEXT_RESPONSES_PER_PAGE);
                                  const currentPage = Math.min(textResponsePage, totalPages || 1);
                                  const startIndex = (currentPage - 1) * TEXT_RESPONSES_PER_PAGE;
                                  const displayedResponses = filteredResponses.slice(startIndex, startIndex + TEXT_RESPONSES_PER_PAGE);
                                  
                                  return (
                                    <>
                                      {/* Filtro */}
                                      {filteredResponses.length > 5 && (
                                        <div className="mb-3">
                                          <div className="relative">
                                            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400" />
                                            <input
                                              type="text"
                                              placeholder="Filtrar por nome ou texto..."
                                              value={textResponseFilter}
                                              onChange={(e) => {
                                                setTextResponseFilter(e.target.value);
                                                setTextResponsePage(1);
                                              }}
                                              className="w-full pl-8 pr-8 py-1.5 text-xs border border-zinc-200 dark:border-zinc-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white"
                                            />
                                            {textResponseFilter && (
                                              <button
                                                onClick={() => {
                                                  setTextResponseFilter('');
                                                  setTextResponsePage(1);
                                                }}
                                                className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
                                              >
                                                <X size={12} />
                                              </button>
                                            )}
                                          </div>
                                        </div>
                                      )}
                                      
                                      {/* Lista de respostas */}
                                      {filteredResponses.length === 0 ? (
                                        <p className="text-sm text-zinc-500 dark:text-zinc-400 italic text-center py-4">
                                          {textResponseFilter ? 'Nenhuma resposta encontrada com este filtro.' : 'Nenhuma resposta ainda.'}
                                        </p>
                                      ) : (
                                        <>
                                          <div className="space-y-3">
                                            {displayedResponses.map((answer, idx) => {
                                              const hasProfileImage = answer.user?.profile_image_path && answer.user.profile_image_path.trim() !== '';
                                              
                                              return (
                                                <div
                                                  key={idx}
                                                  className="bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-xl p-4"
                                                >
                                                  <div className="flex items-start gap-3">
                                                    <div className="flex-shrink-0">
                                                      {!resultsModal.results?.is_anonymous ? (
                                                        hasProfileImage ? (
                                                          <img
                                                            src={answer.user.profile_image_path}
                                                            alt={answer.user.name}
                                                            className="w-10 h-10 rounded-full object-cover border-2 border-emerald-200 dark:border-emerald-800"
                                                          />
                                                        ) : (
                                                          <div className="w-10 h-10 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center">
                                                            <User size={20} className="text-emerald-600 dark:text-emerald-400" />
                                                          </div>
                                                        )
                                                      ) : (
                                                        <div className="w-10 h-10 bg-zinc-200 dark:bg-zinc-700 rounded-full flex items-center justify-center">
                                                          <User size={20} className="text-zinc-400 dark:text-zinc-500" />
                                                        </div>
                                                      )}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                      {!resultsModal.results?.is_anonymous ? (
                                                        <p className="text-sm font-semibold text-zinc-900 dark:text-white mb-1">
                                                          {answer.user?.name || 'Usuário'}
                                                        </p>
                                                      ) : null}
                                                      <p className="text-sm text-zinc-700 dark:text-zinc-300 italic leading-relaxed break-words">
                                                        "{answer.text_answer}"
                                                      </p>
                                                    </div>
                                                  </div>
                                                </div>
                                              );
                                            })}
                                          </div>
                                          
                                          {/* Paginação */}
                                          {totalPages > 1 && (
                                            <div className="flex items-center justify-center gap-2 mt-4 pt-4 border-t border-zinc-200 dark:border-zinc-700">
                                              <button
                                                onClick={() => setTextResponsePage(prev => Math.max(prev - 1, 1))}
                                                disabled={currentPage === 1}
                                                className="p-2 rounded-lg border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                              >
                                                <ChevronLeft size={16} />
                                              </button>
                                              <span className="text-sm text-zinc-600 dark:text-zinc-400 font-medium">
                                                Página {currentPage} de {totalPages} ({filteredResponses.length} {filteredResponses.length === 1 ? 'resposta' : 'respostas'})
                                              </span>
                                              <button
                                                onClick={() => setTextResponsePage(prev => Math.min(prev + 1, totalPages))}
                                                disabled={currentPage === totalPages}
                                                className="p-2 rounded-lg border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                              >
                                                <ChevronRight size={16} />
                                              </button>
                                            </div>
                                          )}
                                        </>
                                      )}
                                    </>
                                  );
                                })()
                              ) : (
                                <p className="text-sm text-zinc-500 dark:text-zinc-400 italic text-center py-4">
                                  Nenhuma resposta ainda.
                                </p>
                              )}
                            </div>
                          )}

                          {question.type === 'choice' && (!Array.isArray(question.results) || question.results.length === 0) && (
                            <p className="text-sm text-zinc-500 dark:text-zinc-400 italic text-center py-4">
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
