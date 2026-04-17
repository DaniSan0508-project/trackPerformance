import React, { useState, useEffect, useCallback } from 'react';
import { Search, Loader2, RefreshCw, ChevronLeft, ChevronRight, MessageSquarePlus, User, Send, X, PenSquare, Filter, RotateCcw, Trash2, Inbox } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../context/AuthContext';
import { User as UserType, Feedback } from '../types';
import { feedbacksService, usersService } from '../services';
import { useToast } from '../context/ToastContext';
import { feedbackSchema } from '../validators/schemas';
import { getFullImageUrl } from '../utils';
import { ConfirmModal } from '../components/ConfirmModal';

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

export const FeedbacksPage: React.FC = () => {
  const { token, user: currentUser } = useAuth();
  const { addToast } = useToast();
  const [activeTab, setActiveTab] = useState<'send' | 'received' | 'sent' | 'all'>('send');
  const isAdmin = currentUser?.user_type_id === 1;

  // Send Feedback State
  const [users, setUsers] = useState<UserType[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [usersError, setUsersError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 500);
  const [usersPage, setUsersPage] = useState(1);
  const [usersTotalPages, setUsersTotalPages] = useState(1);
  const [usersTotalItems, setUsersTotalItems] = useState(0);
  const [usersFromItem, setUsersFromItem] = useState(0);
  const [usersToItem, setUsersToItem] = useState(0);

  // Received Feedbacks State
  const [receivedFeedbacks, setReceivedFeedbacks] = useState<Feedback[]>([]);
  const [loadingReceived, setLoadingReceived] = useState(false);
  const [receivedError, setReceivedError] = useState<string | null>(null);
  const [receivedPage, setReceivedPage] = useState(1);
  const [receivedTotalPages, setReceivedTotalPages] = useState(1);
  const [receivedTotalItems, setReceivedTotalItems] = useState(0);
  const [receivedFromItem, setReceivedFromItem] = useState(0);
  const [receivedToItem, setReceivedToItem] = useState(0);
  const [receivedFilters, setReceivedFilters] = useState({
    sender_name: '',
    is_anonymous: 'all' as 'all' | 'true' | 'false',
    is_read: 'all' as 'all' | 'true' | 'false',
    date_from: '',
    date_to: ''
  });
  const debouncedReceivedSender = useDebounce(receivedFilters.sender_name, 500);

  // Sent Feedbacks State
  const [sentFeedbacks, setSentFeedbacks] = useState<Feedback[]>([]);
  const [loadingSent, setLoadingSent] = useState(false);
  const [sentError, setSentError] = useState<string | null>(null);
  const [sentPage, setSentPage] = useState(1);
  const [sentTotalPages, setSentTotalPages] = useState(1);
  const [sentTotalItems, setSentTotalItems] = useState(0);
  const [sentFromItem, setSentFromItem] = useState(0);
  const [sentToItem, setSentToItem] = useState(0);
  const [sentFilters, setSentFilters] = useState({
    recipient_name: '',
    date_from: '',
    date_to: ''
  });
  const debouncedSentRecipient = useDebounce(sentFilters.recipient_name, 500);

  // All Tenant Feedbacks State (Admin)
  const [allFeedbacks, setAllFeedbacks] = useState<Feedback[]>([]);
  const [loadingAllFeedbacks, setLoadingAllFeedbacks] = useState(false);
  const [allFeedbacksError, setAllFeedbacksError] = useState<string | null>(null);
  const [allFeedbacksPage, setAllFeedbacksPage] = useState(1);
  const [allFeedbacksTotalPages, setAllFeedbacksTotalPages] = useState(1);
  const [allFeedbacksTotalItems, setAllFeedbacksTotalItems] = useState(0);
  const [allFeedbacksFromItem, setAllFeedbacksFromItem] = useState(0);
  const [allFeedbacksToItem, setAllFeedbacksToItem] = useState(0);
  
  // Admin Filter States
  const [adminFilters, setAdminFilters] = useState({
    sender_name: '',
    recipient_name: '',
    is_anonymous: 'all' as 'all' | 'true' | 'false',
    date_from: '',
    date_to: ''
  });
  
  const debouncedAdminSender = useDebounce(adminFilters.sender_name, 500);
  const debouncedAdminRecipient = useDebounce(adminFilters.recipient_name, 500);

  // Delete State
  const [feedbackToDelete, setFeedbackToDelete] = useState<Feedback | null>(null);
  const [isDeletingFeedback, setIsDeletingFeedback] = useState(false);

  // Modal state
  const [selectedUser, setSelectedUser] = useState<UserType | null>(null);
  const [feedbackContent, setFeedbackContent] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [sending, setSending] = useState(false);
  const [feedbackError, setFeedbackError] = useState<string | null>(null);

  const fetchUsers = useCallback(async (page = 1, search = '') => {
    if (!token) return;
    setLoadingUsers(true);
    setUsersError(null);
    try {
      const data = await usersService.getUsers(token, page, search);
      // Filter out current user from the list
      const filteredUsers = data.data.filter(u => u.id !== currentUser?.id);
      setUsers(filteredUsers);
      setUsersPage(data.meta.current_page);
      setUsersTotalPages(data.meta.last_page);
      setUsersTotalItems(data.meta.total);
      setUsersFromItem(data.meta.from);
      setUsersToItem(data.meta.to);
    } catch (err: any) {
      console.error('Error fetching users:', err);
      setUsersError(err.message || 'Não foi possível carregar os usuários.');
    } finally {
      setLoadingUsers(false);
    }
  }, [token, currentUser]);

  const fetchReceivedFeedbacks = useCallback(async (page = 1) => {
    if (!token) return;
    setLoadingReceived(true);
    setReceivedError(null);
    try {
      let dateRange = '';
      if (receivedFilters.date_from && receivedFilters.date_to) {
        dateRange = `${receivedFilters.date_from},${receivedFilters.date_to}`;
      } else if (receivedFilters.date_from) {
        dateRange = `${receivedFilters.date_from},${new Date().toISOString().split('T')[0]}`;
      } else if (receivedFilters.date_to) {
        dateRange = `2000-01-01,${receivedFilters.date_to}`;
      }

      const data = await feedbacksService.getFeedbacks(token, page, {
        sender_name: receivedFilters.sender_name,
        is_anonymous: receivedFilters.is_anonymous === 'all' ? null : receivedFilters.is_anonymous === 'true',
        is_read: receivedFilters.is_read === 'all' ? null : receivedFilters.is_read === 'true',
        created_at: dateRange || undefined
      });
      setReceivedFeedbacks(data.data);
      setReceivedPage(data.meta.current_page);
      setReceivedTotalPages(data.meta.last_page);
      setReceivedTotalItems(data.meta.total);
      setReceivedFromItem(data.meta.from);
      setReceivedToItem(data.meta.to);
    } catch (err: any) {
      console.error('Error fetching received feedbacks:', err);
      setReceivedError(err.message || 'Não foi possível carregar os feedbacks recebidos.');
    } finally {
      setLoadingReceived(false);
    }
  }, [token, receivedFilters]);

  const fetchSentFeedbacks = useCallback(async (page = 1) => {
    if (!token) return;
    setLoadingSent(true);
    setSentError(null);
    try {
      let dateRange = '';
      if (sentFilters.date_from && sentFilters.date_to) {
        dateRange = `${sentFilters.date_from},${sentFilters.date_to}`;
      } else if (sentFilters.date_from) {
        dateRange = `${sentFilters.date_from},${new Date().toISOString().split('T')[0]}`;
      } else if (sentFilters.date_to) {
        dateRange = `2000-01-01,${sentFilters.date_to}`;
      }

      const data = await feedbacksService.getSentFeedbacks(token, page, {
        recipient_name: sentFilters.recipient_name,
        created_at: dateRange || undefined
      });
      setSentFeedbacks(data.data);
      setSentPage(data.meta.current_page);
      setSentTotalPages(data.meta.last_page);
      setSentTotalItems(data.meta.total);
      setSentFromItem(data.meta.from);
      setSentToItem(data.meta.to);
    } catch (err: any) {
      console.error('Error fetching sent feedbacks:', err);
      setSentError(err.message || 'Não foi possível carregar os feedbacks enviados.');
    } finally {
      setLoadingSent(false);
    }
  }, [token, sentFilters]);

  const fetchAllFeedbacks = useCallback(async (page = 1) => {
    if (!token) return;
    setLoadingAllFeedbacks(true);
    setAllFeedbacksError(null);
    try {
      const filters = {
        sender_name: adminFilters.sender_name,
        recipient_name: adminFilters.recipient_name,
        is_anonymous: adminFilters.is_anonymous === 'all' ? null : adminFilters.is_anonymous === 'true',
        date_from: adminFilters.date_from,
        date_to: adminFilters.date_to
      };

      const data = await feedbacksService.getAllTenantFeedbacks(token, page, filters);
      setAllFeedbacks(data.data);
      setAllFeedbacksPage(data.meta.current_page);
      setAllFeedbacksTotalPages(data.meta.last_page);
      setAllFeedbacksTotalItems(data.meta.total);
      setAllFeedbacksFromItem(data.meta.from);
      setAllFeedbacksToItem(data.meta.to);
    } catch (err: any) {
      console.error('Error fetching all feedbacks:', err);
      setAllFeedbacksError(err.message || 'Não foi possível carregar os feedbacks do tenant.');
    } finally {
      setLoadingAllFeedbacks(false);
    }
  }, [token, adminFilters]);

  useEffect(() => {
    if (activeTab === 'send') {
      fetchUsers(usersPage, debouncedSearchTerm);
    } else if (activeTab === 'received') {
      fetchReceivedFeedbacks(receivedPage);
    } else if (activeTab === 'sent') {
      fetchSentFeedbacks(sentPage);
    } else if (activeTab === 'all') {
      fetchAllFeedbacks(allFeedbacksPage);
    }
  }, [fetchUsers, fetchReceivedFeedbacks, fetchSentFeedbacks, fetchAllFeedbacks, activeTab, usersPage, receivedPage, sentPage, allFeedbacksPage, debouncedSearchTerm, debouncedReceivedSender, debouncedSentRecipient, debouncedAdminSender, debouncedAdminRecipient, adminFilters.is_anonymous, adminFilters.date_from, adminFilters.date_to, receivedFilters.is_anonymous, receivedFilters.is_read, receivedFilters.date_from, receivedFilters.date_to, sentFilters.date_from, sentFilters.date_to]);

  // Reset page when search changes
  useEffect(() => {
    if (activeTab === 'send') {
      setUsersPage(1);
    } else if (activeTab === 'received') {
      setReceivedPage(1);
    } else if (activeTab === 'sent') {
      setSentPage(1);
    } else if (activeTab === 'all') {
      setAllFeedbacksPage(1);
    }
  }, [debouncedSearchTerm, debouncedReceivedSender, debouncedSentRecipient, debouncedAdminSender, debouncedAdminRecipient, adminFilters.is_anonymous, adminFilters.date_from, adminFilters.date_to, receivedFilters.is_anonymous, receivedFilters.is_read, receivedFilters.date_from, receivedFilters.date_to, sentFilters.date_from, sentFilters.date_to]);

  const handleSendFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !selectedUser) return;

    setFeedbackError(null);

    // Validação com Zod
    const result = feedbackSchema.safeParse({
      recipient_id: selectedUser.id,
      content: feedbackContent,
      is_anonymous: isAnonymous
    });

    if (!result.success) {
      const errorMessage = result.error.issues[0]?.message || 'Erro na validação';
      setFeedbackError(errorMessage);
      addToast('error', errorMessage);
      return;
    }

    setSending(true);
    try {
      await feedbacksService.sendFeedback(token, {
        recipient_id: selectedUser.id,
        content: feedbackContent,
        is_anonymous: isAnonymous
      });
      addToast('success', 'Feedback enviado com sucesso!');
      setSelectedUser(null);
      setFeedbackContent('');
      setIsAnonymous(false);
      setFeedbackError(null);
    } catch (err: any) {
      console.error('Error sending feedback:', err);
      addToast('error', err.message || 'Erro ao enviar feedback');
    } finally {
      setSending(false);
    }
  };

  const handleClearFilters = () => {
    if (activeTab === 'received') {
      setReceivedFilters({
        sender_name: '',
        is_anonymous: 'all',
        is_read: 'all',
        date_from: '',
        date_to: ''
      });
    } else if (activeTab === 'sent') {
      setSentFilters({
        recipient_name: '',
        date_from: '',
        date_to: ''
      });
    } else if (activeTab === 'all') {
      setAdminFilters({
        sender_name: '',
        recipient_name: '',
        is_anonymous: 'all',
        date_from: '',
        date_to: ''
      });
    }
  };

  const handleDeleteFeedback = async () => {
    if (!token || !feedbackToDelete) return;

    setIsDeletingFeedback(true);
    try {
      await feedbacksService.deleteFeedback(token, feedbackToDelete.id);
      addToast('success', 'Feedback excluído com sucesso!');
      setFeedbackToDelete(null);
      fetchAllFeedbacks(allFeedbacksPage);
    } catch (err: any) {
      console.error('Error deleting feedback:', err);
      addToast('error', err.message || 'Erro ao excluir feedback');
    } finally {
      setIsDeletingFeedback(false);
    }
  };

  return (
    <div className="p-4 md:p-8 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">Feedbacks</h1>
            <p className="text-zinc-500 dark:text-zinc-400">Gerencie e envie feedbacks para o seu time.</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => {
                if (activeTab === 'send') fetchUsers(usersPage, searchTerm);
                else if (activeTab === 'received') fetchReceivedFeedbacks(receivedPage);
                else if (activeTab === 'sent') fetchSentFeedbacks(sentPage);
                else if (activeTab === 'all') fetchAllFeedbacks(allFeedbacksPage);
              }}
              className="bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 p-2 rounded-xl text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-all"
              title="Atualizar"
            >
              <RefreshCw size={20} className={loadingUsers || loadingReceived || loadingSent || loadingAllFeedbacks ? "animate-spin" : ""} />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex space-x-1 bg-zinc-100 dark:bg-zinc-800 p-1 rounded-xl w-fit transition-colors duration-200">
          <button
            onClick={() => setActiveTab('send')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'send'
                ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-sm'
                : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-200/50 dark:hover:bg-zinc-700/50'
            }`}
          >
            <PenSquare size={18} />
            Enviar Feedback
          </button>
          {!isAdmin && (
            <>
              <button
                onClick={() => setActiveTab('received')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  activeTab === 'received'
                    ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-sm'
                    : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-200/50 dark:hover:bg-zinc-700/50'
                }`}
              >
                <Inbox size={18} />
                Recebidos
              </button>
              <button
                onClick={() => setActiveTab('sent')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  activeTab === 'sent'
                    ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-sm'
                    : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-200/50 dark:hover:bg-zinc-700/50'
                }`}
              >
                <Send size={18} />
                Enviados
              </button>
            </>
          )}
          {isAdmin && (
            <button
              onClick={() => setActiveTab('all')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'all'
                  ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-sm'
                  : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-200/50 dark:hover:bg-zinc-700/50'
              }`}
            >
              <MessageSquarePlus size={18} />
              Geral
            </button>
          )}
        </div>

        {activeTab === 'send' && (
          <>
            {/* Filters */}
            <div className="bg-white dark:bg-zinc-900 p-4 rounded-2xl shadow-sm border border-zinc-100 dark:border-zinc-800 flex flex-col md:flex-row gap-4 items-center transition-colors duration-200">
              <div className="relative flex-1 w-full">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-zinc-400" size={20} />
                <input
                  type="text"
                  placeholder="Buscar usuário por nome..."
                  className="w-full pl-10 pr-4 py-2 border border-zinc-200 dark:border-zinc-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-500"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>

            {/* Users List */}
            {loadingUsers && users.length === 0 ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-8 h-8 text-primary-600 animate-spin" />
              </div>
            ) : usersError ? (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 p-4 rounded-xl text-center">
                {usersError}
                <button onClick={() => fetchUsers(usersPage, searchTerm)} className="block mx-auto mt-2 text-sm font-semibold hover:underline">
                  Tentar novamente
                </button>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {users.map((user) => (
                    <motion.div
                      key={user.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm p-6 flex flex-col items-center text-center hover:shadow-md transition-all duration-200"
                    >
                      <div className="w-14 h-14 bg-primary-100 dark:bg-primary-900/30 rounded-full flex items-center justify-center text-primary-600 dark:text-primary-400 mb-4 overflow-hidden border border-primary-200 dark:border-primary-800">
                        {user.profile_image_url ? (
                          <img src={getFullImageUrl(user.profile_image_url) || ''} alt={user.name} className="w-full h-full object-cover" />
                        ) : (
                          <User size={28} />
                        )}
                      </div>
                      <h3 className="font-semibold text-lg text-zinc-900 dark:text-white mb-1">{user.name}</h3>
                      <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-4">{user.email}</p>

                      <button
                        onClick={() => setSelectedUser(user)}
                        className="mt-auto w-full bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-400 hover:bg-primary-100 dark:hover:bg-primary-900/30 py-2 px-4 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                      >
                        <MessageSquarePlus size={18} />
                        Enviar Feedback
                      </button>
                    </motion.div>
                  ))}
                </div>

                {users.length === 0 && (
                  <div className="text-center py-12 bg-white dark:bg-zinc-900 rounded-2xl border border-dashed border-zinc-200 dark:border-zinc-800 transition-colors duration-200">
                    <User className="w-12 h-12 text-zinc-300 dark:text-zinc-600 mx-auto mb-3" />
                    <h3 className="text-lg font-medium text-zinc-900 dark:text-white">Nenhum usuário encontrado</h3>
                    <p className="text-zinc-500 dark:text-zinc-400">Tente buscar por outro nome.</p>
                  </div>
                )}

                {/* Pagination Controls */}
                {usersTotalItems > 0 && (
                  <div className="flex items-center justify-between bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-zinc-100 dark:border-zinc-800 transition-colors duration-200">
                    <div className="text-sm text-zinc-500 dark:text-zinc-400">
                      Mostrando <span className="font-medium">{usersFromItem}</span> até <span className="font-medium">{usersToItem}</span> de <span className="font-medium">{usersTotalItems}</span> resultados
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setUsersPage(prev => Math.max(prev - 1, 1))}
                        disabled={usersPage === 1}
                        className="p-2 border border-zinc-200 dark:border-zinc-700 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed text-zinc-600 dark:text-zinc-400"
                      >
                        <ChevronLeft size={20} />
                      </button>
                      <span className="text-sm font-medium px-2 text-zinc-700 dark:text-zinc-300">
                        Página {usersPage} de {usersTotalPages}
                      </span>
                      <button
                        onClick={() => setUsersPage(prev => Math.min(prev + 1, usersTotalPages))}
                        disabled={usersPage === usersTotalPages}
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
        )}

        {activeTab === 'received' && (
          <>
            {/* Received Filters */}
            <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl shadow-sm border border-zinc-100 dark:border-zinc-800 transition-colors duration-200">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-zinc-500 dark:text-zinc-400 ml-1">Remetente</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-zinc-400" size={16} />
                    <input
                      type="text"
                      placeholder="Nome..."
                      className="w-full pl-9 pr-4 py-2 border border-zinc-200 dark:border-zinc-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white placeholder-zinc-400"
                      value={receivedFilters.sender_name}
                      onChange={(e) => setReceivedFilters(prev => ({ ...prev, sender_name: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-zinc-500 dark:text-zinc-400 ml-1">Tipo</label>
                  <select
                    className="w-full px-4 py-2 border border-zinc-200 dark:border-zinc-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white"
                    value={receivedFilters.is_anonymous}
                    onChange={(e) => setReceivedFilters(prev => ({ ...prev, is_anonymous: e.target.value as any }))}
                  >
                    <option value="all">Todos os tipos</option>
                    <option value="true">Anônimo</option>
                    <option value="false">Identificado</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-zinc-500 dark:text-zinc-400 ml-1">Status</label>
                  <select
                    className="w-full px-4 py-2 border border-zinc-200 dark:border-zinc-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white"
                    value={receivedFilters.is_read}
                    onChange={(e) => setReceivedFilters(prev => ({ ...prev, is_read: e.target.value as any }))}
                  >
                    <option value="all">Lidos e não lidos</option>
                    <option value="true">Lidos</option>
                    <option value="false">Não lidos</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-zinc-500 dark:text-zinc-400 ml-1">De</label>
                  <input
                    type="date"
                    className="w-full px-4 py-2 border border-zinc-200 dark:border-zinc-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white"
                    value={receivedFilters.date_from}
                    onChange={(e) => setReceivedFilters(prev => ({ ...prev, date_from: e.target.value }))}
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-zinc-500 dark:text-zinc-400 ml-1">Até</label>
                  <div className="flex gap-2">
                    <input
                      type="date"
                      className="w-full px-4 py-2 border border-zinc-200 dark:border-zinc-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white"
                      value={receivedFilters.date_to}
                      onChange={(e) => setReceivedFilters(prev => ({ ...prev, date_to: e.target.value }))}
                    />
                    <button
                      onClick={handleClearFilters}
                      className="p-2 border border-zinc-200 dark:border-zinc-700 rounded-xl text-zinc-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors"
                      title="Limpar filtros"
                    >
                      <RotateCcw size={20} />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {loadingReceived && receivedFeedbacks.length === 0 ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-8 h-8 text-primary-600 animate-spin" />
              </div>
            ) : receivedError ? (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 p-4 rounded-xl text-center">
                {receivedError}
                <button onClick={() => fetchReceivedFeedbacks(receivedPage)} className="block mx-auto mt-2 text-sm font-semibold hover:underline">
                  Tentar novamente
                </button>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="grid grid-cols-1 gap-4">
                  {receivedFeedbacks.map((feedback) => {
                    const isAnonymous = feedback.is_anonymous;
                    const sender = feedback.sender as UserType | undefined;

                    return (
                      <motion.div
                        key={feedback.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm p-6 flex gap-4 transition-colors duration-200 relative"
                      >
                        <div className="w-14 h-14 bg-primary-100 dark:bg-primary-900/30 rounded-full flex items-center justify-center text-primary-600 dark:text-primary-400 flex-shrink-0 overflow-hidden border border-primary-200 dark:border-primary-800">
                          {!isAnonymous && sender?.profile_image_url ? (
                            <img src={getFullImageUrl(sender.profile_image_url) || ''} alt={sender.name} className="w-full h-full object-cover" />
                          ) : (
                            <User size={28} />
                          )}
                        </div>
                        <div className="flex-1">
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <div className="flex items-center gap-2">
                                <h3 className="font-semibold text-zinc-900 dark:text-white">
                                  {isAnonymous ? 'Remetente Anônimo' : (sender?.name || 'Usuário Desconhecido')}
                                </h3>
                                {isAnonymous && (
                                  <span className="bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                                    Anônimo
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                                {new Date(feedback.created_at).toLocaleDateString()} às {new Date(feedback.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </p>
                            </div>
                          </div>
                          <p className="text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap mt-2">{feedback.content}</p>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>

                {receivedFeedbacks.length === 0 && (
                  <div className="text-center py-12 bg-white dark:bg-zinc-900 rounded-2xl border border-dashed border-zinc-200 dark:border-zinc-800 transition-colors duration-200">
                    <Inbox className="w-12 h-12 text-zinc-300 dark:text-zinc-600 mx-auto mb-3" />
                    <h3 className="text-lg font-medium text-zinc-900 dark:text-white">Nenhum feedback recebido</h3>
                    <p className="text-zinc-500 dark:text-zinc-400">Você ainda não recebeu feedbacks com esses filtros.</p>
                  </div>
                )}

                {/* Pagination Controls */}
                {receivedTotalItems > 0 && (
                  <div className="flex items-center justify-between bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-zinc-100 dark:border-zinc-800 transition-colors duration-200">
                    <div className="text-sm text-zinc-500 dark:text-zinc-400">
                      Mostrando <span className="font-medium">{receivedFromItem}</span> até <span className="font-medium">{receivedToItem}</span> de <span className="font-medium">{receivedTotalItems}</span> resultados
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setReceivedPage(prev => Math.max(prev - 1, 1))}
                        disabled={receivedPage === 1}
                        className="p-2 border border-zinc-200 dark:border-zinc-700 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed text-zinc-600 dark:text-zinc-400"
                      >
                        <ChevronLeft size={20} />
                      </button>
                      <span className="text-sm font-medium px-2 text-zinc-700 dark:text-zinc-300">
                        Página {receivedPage} de {receivedTotalPages}
                      </span>
                      <button
                        onClick={() => setReceivedPage(prev => Math.min(prev + 1, receivedTotalPages))}
                        disabled={receivedPage === receivedTotalPages}
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
        )}

        {activeTab === 'sent' && (
          <>
            {/* Sent Filters */}
            <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl shadow-sm border border-zinc-100 dark:border-zinc-800 transition-colors duration-200">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-zinc-500 dark:text-zinc-400 ml-1">Destinatário</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-zinc-400" size={16} />
                    <input
                      type="text"
                      placeholder="Nome..."
                      className="w-full pl-9 pr-4 py-2 border border-zinc-200 dark:border-zinc-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white placeholder-zinc-400"
                      value={sentFilters.recipient_name}
                      onChange={(e) => setSentFilters(prev => ({ ...prev, recipient_name: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-zinc-500 dark:text-zinc-400 ml-1">De</label>
                  <input
                    type="date"
                    className="w-full px-4 py-2 border border-zinc-200 dark:border-zinc-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white"
                    value={sentFilters.date_from}
                    onChange={(e) => setSentFilters(prev => ({ ...prev, date_from: e.target.value }))}
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-zinc-500 dark:text-zinc-400 ml-1">Até</label>
                  <div className="flex gap-2">
                    <input
                      type="date"
                      className="w-full px-4 py-2 border border-zinc-200 dark:border-zinc-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white"
                      value={sentFilters.date_to}
                      onChange={(e) => setSentFilters(prev => ({ ...prev, date_to: e.target.value }))}
                    />
                    <button
                      onClick={handleClearFilters}
                      className="p-2 border border-zinc-200 dark:border-zinc-700 rounded-xl text-zinc-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors"
                      title="Limpar filtros"
                    >
                      <RotateCcw size={20} />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {loadingSent && sentFeedbacks.length === 0 ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-8 h-8 text-primary-600 animate-spin" />
              </div>
            ) : sentError ? (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 p-4 rounded-xl text-center">
                {sentError}
                <button onClick={() => fetchSentFeedbacks(sentPage)} className="block mx-auto mt-2 text-sm font-semibold hover:underline">
                  Tentar novamente
                </button>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="grid grid-cols-1 gap-4">
                  {sentFeedbacks.map((feedback) => {
                    const recipient = feedback.recipient as UserType | undefined;
                    const isAnonymous = feedback.is_anonymous;

                    return (
                      <motion.div
                        key={feedback.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm p-6 flex gap-4 transition-colors duration-200 relative"
                      >
                        <div className="w-14 h-14 bg-primary-100 dark:bg-primary-900/30 rounded-full flex items-center justify-center text-primary-600 dark:text-primary-400 flex-shrink-0 overflow-hidden border border-primary-200 dark:border-primary-800">
                          {recipient?.profile_image_url ? (
                            <img src={getFullImageUrl(recipient.profile_image_url) || ''} alt={recipient.name} className="w-full h-full object-cover" />
                          ) : (
                            <User size={28} />
                          )}
                        </div>
                        <div className="flex-1">
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <div className="flex items-center gap-2">
                                <h3 className="font-semibold text-zinc-900 dark:text-white">
                                  Para: {recipient?.name || 'Usuário Desconhecido'}
                                </h3>
                                {isAnonymous && (
                                  <span className="bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                                    Enviado de forma Anônima
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                                {new Date(feedback.created_at).toLocaleDateString()} às {new Date(feedback.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </p>
                            </div>
                          </div>
                          <p className="text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap mt-2">{feedback.content}</p>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>

                {sentFeedbacks.length === 0 && (
                  <div className="text-center py-12 bg-white dark:bg-zinc-900 rounded-2xl border border-dashed border-zinc-200 dark:border-zinc-800 transition-colors duration-200">
                    <Send className="w-12 h-12 text-zinc-300 dark:text-zinc-600 mx-auto mb-3" />
                    <h3 className="text-lg font-medium text-zinc-900 dark:text-white">Nenhum feedback enviado</h3>
                    <p className="text-zinc-500 dark:text-zinc-400">Você ainda não enviou feedbacks com esses filtros.</p>
                  </div>
                )}

                {/* Pagination Controls */}
                {sentTotalItems > 0 && (
                  <div className="flex items-center justify-between bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-zinc-100 dark:border-zinc-800 transition-colors duration-200">
                    <div className="text-sm text-zinc-500 dark:text-zinc-400">
                      Mostrando <span className="font-medium">{sentFromItem}</span> até <span className="font-medium">{sentToItem}</span> de <span className="font-medium">{sentTotalItems}</span> resultados
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setSentPage(prev => Math.max(prev - 1, 1))}
                        disabled={sentPage === 1}
                        className="p-2 border border-zinc-200 dark:border-zinc-700 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed text-zinc-600 dark:text-zinc-400"
                      >
                        <ChevronLeft size={20} />
                      </button>
                      <span className="text-sm font-medium px-2 text-zinc-700 dark:text-zinc-300">
                        Página {sentPage} de {sentTotalPages}
                      </span>
                      <button
                        onClick={() => setSentPage(prev => Math.min(prev + 1, sentTotalPages))}
                        disabled={sentPage === sentTotalPages}
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
        )}

        {activeTab === 'all' && (
          <>
            {/* All Tenant Feedbacks (Admin) */}
            <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl shadow-sm border border-zinc-100 dark:border-zinc-800 transition-colors duration-200">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-zinc-500 dark:text-zinc-400 ml-1">Remetente</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-zinc-400" size={16} />
                    <input
                      type="text"
                      placeholder="Nome..."
                      className="w-full pl-9 pr-4 py-2 border border-zinc-200 dark:border-zinc-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white placeholder-zinc-400"
                      value={adminFilters.sender_name}
                      onChange={(e) => setAdminFilters(prev => ({ ...prev, sender_name: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-zinc-500 dark:text-zinc-400 ml-1">Destinatário</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-zinc-400" size={16} />
                    <input
                      type="text"
                      placeholder="Nome..."
                      className="w-full pl-9 pr-4 py-2 border border-zinc-200 dark:border-zinc-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white placeholder-zinc-400"
                      value={adminFilters.recipient_name}
                      onChange={(e) => setAdminFilters(prev => ({ ...prev, recipient_name: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-zinc-500 dark:text-zinc-400 ml-1">Tipo</label>
                  <select
                    className="w-full px-4 py-2 border border-zinc-200 dark:border-zinc-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white"
                    value={adminFilters.is_anonymous}
                    onChange={(e) => setAdminFilters(prev => ({ ...prev, is_anonymous: e.target.value as any }))}
                  >
                    <option value="all">Todos</option>
                    <option value="true">Anônimo</option>
                    <option value="false">Identificado</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-zinc-500 dark:text-zinc-400 ml-1">De</label>
                  <input
                    type="date"
                    className="w-full px-4 py-2 border border-zinc-200 dark:border-zinc-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white"
                    value={adminFilters.date_from}
                    onChange={(e) => setAdminFilters(prev => ({ ...prev, date_from: e.target.value }))}
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-zinc-500 dark:text-zinc-400 ml-1">Até</label>
                  <div className="flex gap-2">
                    <input
                      type="date"
                      className="w-full px-4 py-2 border border-zinc-200 dark:border-zinc-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white"
                      value={adminFilters.date_to}
                      onChange={(e) => setAdminFilters(prev => ({ ...prev, date_to: e.target.value }))}
                    />
                    <button
                      onClick={handleClearFilters}
                      className="p-2 border border-zinc-200 dark:border-zinc-700 rounded-xl text-zinc-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors"
                      title="Limpar filtros"
                    >
                      <RotateCcw size={20} />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {loadingAllFeedbacks && allFeedbacks.length === 0 ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-8 h-8 text-primary-600 animate-spin" />
              </div>
            ) : allFeedbacksError ? (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 p-4 rounded-xl text-center">
                {allFeedbacksError}
                <button onClick={() => fetchAllFeedbacks(allFeedbacksPage)} className="block mx-auto mt-2 text-sm font-semibold hover:underline">
                  Tentar novamente
                </button>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="grid grid-cols-1 gap-4">
                  {allFeedbacks.map((feedback) => {
                    const isAnonymous = feedback.is_anonymous;
                    const sender = feedback.sender as UserType | undefined;
                    const recipient = feedback.recipient as UserType | undefined;

                    return (
                      <motion.div
                        key={feedback.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm p-6 flex gap-4 transition-colors duration-200 relative group"
                      >
                        <div className="w-14 h-14 bg-primary-100 dark:bg-primary-900/30 rounded-full flex items-center justify-center text-primary-600 dark:text-primary-400 flex-shrink-0 overflow-hidden border border-primary-200 dark:border-primary-800">
                          {!isAnonymous && sender?.profile_image_url ? (
                            <img src={getFullImageUrl(sender.profile_image_url) || ''} alt={sender.name} className="w-full h-full object-cover" />
                          ) : (
                            <User size={28} />
                          )}
                        </div>
                        <div className="flex-1">
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <div className="flex items-center gap-2">
                                <h3 className="font-semibold text-zinc-900 dark:text-white">
                                  {isAnonymous ? 'Anônimo' : (sender?.name || 'Usuário Desconhecido')}
                                </h3>
                                <span className="text-xs text-zinc-500 dark:text-zinc-400">→</span>
                                <span className="font-medium text-sm text-zinc-700 dark:text-zinc-300">
                                  {recipient?.name || 'Destinatário Desconhecido'}
                                </span>
                              </div>
                              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                                {new Date(feedback.created_at).toLocaleDateString()} às {new Date(feedback.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              {isAnonymous && (
                                <span className="bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 text-xs px-2 py-1 rounded-full font-medium">
                                  Anônimo
                                </span>
                              )}
                              <button
                                onClick={() => setFeedbackToDelete(feedback)}
                                className="p-2 text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all opacity-0 group-hover:opacity-100 focus:opacity-100"
                                title="Excluir feedback"
                              >
                                <Trash2 size={18} />
                              </button>
                            </div>
                          </div>
                          <p className="text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap mt-2">{feedback.content}</p>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>

                {allFeedbacks.length === 0 && (
                  <div className="text-center py-12 bg-white dark:bg-zinc-900 rounded-2xl border border-dashed border-zinc-200 dark:border-zinc-800 transition-colors duration-200">
                    <MessageSquarePlus className="w-12 h-12 text-zinc-300 dark:text-zinc-600 mx-auto mb-3" />
                    <h3 className="text-lg font-medium text-zinc-900 dark:text-white">Nenhum feedback encontrado</h3>
                    <p className="text-zinc-500 dark:text-zinc-400">Tente buscar por outro nome ou ajuste os filtros.</p>
                  </div>
                )}

                {/* Pagination Controls */}
                {allFeedbacksTotalItems > 0 && (
                  <div className="flex items-center justify-between bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-zinc-100 dark:border-zinc-800 transition-colors duration-200">
                    <div className="text-sm text-zinc-500 dark:text-zinc-400">
                      Mostrando <span className="font-medium">{allFeedbacksFromItem}</span> até <span className="font-medium">{allFeedbacksToItem}</span> de <span className="font-medium">{allFeedbacksTotalItems}</span> resultados
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setAllFeedbacksPage(prev => Math.max(prev - 1, 1))}
                        disabled={allFeedbacksPage === 1}
                        className="p-2 border border-zinc-200 dark:border-zinc-700 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed text-zinc-600 dark:text-zinc-400"
                      >
                        <ChevronLeft size={20} />
                      </button>
                      <span className="text-sm font-medium px-2 text-zinc-700 dark:text-zinc-300">
                        Página {allFeedbacksPage} de {allFeedbacksTotalPages}
                      </span>
                      <button
                        onClick={() => setAllFeedbacksPage(prev => Math.min(prev + 1, allFeedbacksTotalPages))}
                        disabled={allFeedbacksPage === allFeedbacksTotalPages}
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
        )}

        {/* Feedback Modal */}
        <AnimatePresence>
          {selectedUser && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white dark:bg-zinc-900 rounded-2xl shadow-xl w-full max-w-md overflow-hidden border border-zinc-200 dark:border-zinc-800"
              >
                <div className="p-4 border-b border-zinc-100 dark:border-zinc-800 flex justify-between items-center bg-zinc-50/50 dark:bg-zinc-800/50">
                  <h2 className="text-lg font-bold text-zinc-900 dark:text-white">Enviar Feedback</h2>
                  <button onClick={() => setSelectedUser(null)} className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors">
                    <X size={24} />
                  </button>
                </div>
                
                <form onSubmit={handleSendFeedback} className="p-6 space-y-4">
                  <div className="flex items-center gap-3 mb-4 p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl">
                    <div className="w-14 h-14 bg-primary-100 dark:bg-primary-900/30 rounded-full flex items-center justify-center text-primary-600 dark:text-primary-400 overflow-hidden border border-primary-200 dark:border-primary-800">
                      {selectedUser.profile_image_url ? (
                        <img src={getFullImageUrl(selectedUser.profile_image_url) || ''} alt={selectedUser.name} className="w-full h-full object-cover" />
                      ) : (
                        <User size={28} />
                      )}
                    </div>
                    <div>
                      <p className="text-sm text-zinc-500 dark:text-zinc-400">Para:</p>
                      <p className="font-semibold text-zinc-900 dark:text-white">{selectedUser.name}</p>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                      Mensagem
                    </label>
                    <textarea
                      required
                      value={feedbackContent}
                      onChange={(e) => setFeedbackContent(e.target.value)}
                      className={`w-full p-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent min-h-[120px] resize-none bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-500 ${
                        feedbackError ? 'border-red-500 focus:ring-red-500' : 'border-zinc-200 dark:border-zinc-700'
                      }`}
                      placeholder="Escreva seu feedback construtivo aqui..."
                    />
                    {feedbackError && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{feedbackError}</p>}
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="anonymous"
                      checked={isAnonymous}
                      onChange={(e) => setIsAnonymous(e.target.checked)}
                      className="w-4 h-4 text-primary-600 border-zinc-300 dark:border-zinc-600 rounded focus:ring-primary-500 bg-white dark:bg-zinc-700"
                    />
                    <label htmlFor="anonymous" className="text-sm text-zinc-700 dark:text-zinc-300 select-none cursor-pointer">
                      Enviar anonimamente
                    </label>
                  </div>

                  <div className="pt-2 flex gap-3">
                    <button
                      type="button"
                      onClick={() => setSelectedUser(null)}
                      className="flex-1 px-4 py-2 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-xl hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors font-medium"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={sending || !feedbackContent.trim()}
                      className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-xl hover:bg-primary-700 transition-colors font-medium flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {sending ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                      Enviar
                    </button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Confirm Delete Modal */}
        <ConfirmModal
          isOpen={!!feedbackToDelete}
          onClose={() => setFeedbackToDelete(null)}
          onConfirm={handleDeleteFeedback}
          title="Excluir Feedback"
          message="Tem certeza que deseja excluir este feedback? Esta ação não pode ser desfeita."
          confirmText="Excluir"
          cancelText="Cancelar"
          type="danger"
          isLoading={isDeletingFeedback}
        />
      </div>
  );
};
