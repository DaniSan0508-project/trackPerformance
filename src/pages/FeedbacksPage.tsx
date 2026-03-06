import React, { useState, useEffect, useCallback } from 'react';
import { Layout } from '../components/Layout';
import { Search, Loader2, RefreshCw, ChevronLeft, ChevronRight, MessageSquarePlus, User, Send, X, Inbox, PenSquare } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../context/AuthContext';
import { User as UserType, Feedback } from '../types';
import { api } from '../services/api';
import { useToast } from '../context/ToastContext';
import { feedbackSchema } from '../validators/schemas';

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
  const [activeTab, setActiveTab] = useState<'send' | 'received' | 'all'>('send');
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

  // Received Feedback State
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [loadingFeedbacks, setLoadingFeedbacks] = useState(false);
  const [feedbacksError, setFeedbacksError] = useState<string | null>(null);
  const [feedbacksPage, setFeedbacksPage] = useState(1);
  const [feedbacksTotalPages, setFeedbacksTotalPages] = useState(1);
  const [feedbacksTotalItems, setFeedbacksTotalItems] = useState(0);
  const [feedbacksFromItem, setFeedbacksFromItem] = useState(0);
  const [feedbacksToItem, setFeedbacksToItem] = useState(0);

  // All Tenant Feedbacks State (Admin)
  const [allFeedbacks, setAllFeedbacks] = useState<Feedback[]>([]);
  const [loadingAllFeedbacks, setLoadingAllFeedbacks] = useState(false);
  const [allFeedbacksError, setAllFeedbacksError] = useState<string | null>(null);
  const [allFeedbacksPage, setAllFeedbacksPage] = useState(1);
  const [allFeedbacksTotalPages, setAllFeedbacksTotalPages] = useState(1);
  const [allFeedbacksTotalItems, setAllFeedbacksTotalItems] = useState(0);
  const [allFeedbacksFromItem, setAllFeedbacksFromItem] = useState(0);
  const [allFeedbacksToItem, setAllFeedbacksToItem] = useState(0);
  const [allFeedbacksSearch, setAllFeedbacksSearch] = useState('');
  const debouncedAllFeedbacksSearch = useDebounce(allFeedbacksSearch, 500);

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
      const data = await api.getUsers(token, page, search);
      // Filter out current user from the list
      const filteredUsers = data.data.filter(u => u.id !== currentUser?.id);
      setUsers(filteredUsers);
      setUsersPage(data.current_page);
      setUsersTotalPages(data.last_page);
      setUsersTotalItems(data.total);
      setUsersFromItem(data.from);
      setUsersToItem(data.to);
    } catch (err: any) {
      console.error('Error fetching users:', err);
      setUsersError(err.message || 'Não foi possível carregar os usuários.');
    } finally {
      setLoadingUsers(false);
    }
  }, [token, currentUser]);

  const fetchFeedbacks = useCallback(async (page = 1) => {
    if (!token) return;
    setLoadingFeedbacks(true);
    setFeedbacksError(null);
    try {
      const data = await api.getFeedbacks(token, page);
      setFeedbacks(data.data);
      setFeedbacksPage(data.current_page);
      setFeedbacksTotalPages(data.last_page);
      setFeedbacksTotalItems(data.total);
      setFeedbacksFromItem(data.from);
      setFeedbacksToItem(data.to);
    } catch (err: any) {
      console.error('Error fetching feedbacks:', err);
      setFeedbacksError(err.message || 'Não foi possível carregar os feedbacks.');
    } finally {
      setLoadingFeedbacks(false);
    }
  }, [token]);

  const fetchAllFeedbacks = useCallback(async (page = 1, search = '') => {
    if (!token) return;
    setLoadingAllFeedbacks(true);
    setAllFeedbacksError(null);
    try {
      const data = await api.getAllTenantFeedbacks(token, page, search);
      setAllFeedbacks(data.data);
      setAllFeedbacksPage(data.current_page);
      setAllFeedbacksTotalPages(data.last_page);
      setAllFeedbacksTotalItems(data.total);
      setAllFeedbacksFromItem(data.from);
      setAllFeedbacksToItem(data.to);
    } catch (err: any) {
      console.error('Error fetching all feedbacks:', err);
      setAllFeedbacksError(err.message || 'Não foi possível carregar os feedbacks do tenant.');
    } finally {
      setLoadingAllFeedbacks(false);
    }
  }, [token]);

  useEffect(() => {
    if (activeTab === 'send') {
      fetchUsers(usersPage, debouncedSearchTerm);
    } else if (activeTab === 'received') {
      fetchFeedbacks(feedbacksPage);
    } else if (activeTab === 'all') {
      fetchAllFeedbacks(allFeedbacksPage, debouncedAllFeedbacksSearch);
    }
  }, [fetchUsers, fetchFeedbacks, fetchAllFeedbacks, activeTab, usersPage, feedbacksPage, allFeedbacksPage, debouncedSearchTerm, debouncedAllFeedbacksSearch]);

  // Reset page when search changes
  useEffect(() => {
    if (activeTab === 'send') {
      setUsersPage(1);
    } else if (activeTab === 'all') {
      setAllFeedbacksPage(1);
    }
  }, [debouncedSearchTerm, debouncedAllFeedbacksSearch]);

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
      const errorMessage = result.error.errors[0]?.message || 'Erro na validação';
      setFeedbackError(errorMessage);
      addToast('error', errorMessage);
      return;
    }

    setSending(true);
    try {
      await api.sendFeedback(token, {
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

  return (
    <Layout>
      <div className="p-4 md:p-8 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">Feedbacks</h1>
            <p className="text-zinc-500 dark:text-zinc-400">Gerencie seus feedbacks enviados e recebidos.</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => {
                if (activeTab === 'send') fetchUsers(usersPage, searchTerm);
                else if (activeTab === 'received') fetchFeedbacks(feedbacksPage);
                else if (activeTab === 'all') fetchAllFeedbacks(allFeedbacksPage, allFeedbacksSearch);
              }}
              className="bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 p-2 rounded-xl text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-all"
              title="Atualizar"
            >
              <RefreshCw size={20} className={loadingUsers || loadingFeedbacks || loadingAllFeedbacks ? "animate-spin" : ""} />
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

        {activeTab === 'send' ? (
          <>
            {/* Filters */}
            <div className="bg-white dark:bg-zinc-900 p-4 rounded-2xl shadow-sm border border-zinc-100 dark:border-zinc-800 flex flex-col md:flex-row gap-4 items-center transition-colors duration-200">
              <div className="relative flex-1 w-full">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-zinc-400" size={20} />
                <input
                  type="text"
                  placeholder="Buscar usuário por nome..."
                  className="w-full pl-10 pr-4 py-2 border border-zinc-200 dark:border-zinc-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-500"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>

            {/* Users List */}
            {loadingUsers && users.length === 0 ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
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
                      <div className="w-20 h-20 bg-zinc-100 dark:bg-zinc-800 rounded-full flex items-center justify-center text-zinc-400 dark:text-zinc-500 mb-4 overflow-hidden border border-zinc-100 dark:border-zinc-700">
                        {user.profile_image_url ? (
                          <img src={user.profile_image_url} alt={user.name} className="w-full h-full object-cover" />
                        ) : (
                          <User size={32} />
                        )}
                      </div>
                      <h3 className="font-semibold text-lg text-zinc-900 dark:text-white mb-1">{user.name}</h3>
                      <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-4">{user.email}</p>

                      <button
                        onClick={() => setSelectedUser(user)}
                        className="mt-auto w-full bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 py-2 px-4 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
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
        ) : activeTab === 'received' ? (
          <>
            {/* Received Feedbacks List */}
            {loadingFeedbacks && feedbacks.length === 0 ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
              </div>
            ) : feedbacksError ? (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 p-4 rounded-xl text-center">
                {feedbacksError}
                <button onClick={() => fetchFeedbacks(feedbacksPage)} className="block mx-auto mt-2 text-sm font-semibold hover:underline">
                  Tentar novamente
                </button>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="grid grid-cols-1 gap-4">
                  {feedbacks.map((feedback) => {
                    const isAnonymous = feedback.is_anonymous;
                    const sender = feedback.sender as UserType | undefined;

                    return (
                      <motion.div
                        key={feedback.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm p-6 flex gap-4 transition-colors duration-200"
                      >
                        <div className="w-12 h-12 bg-zinc-100 dark:bg-zinc-800 rounded-full flex items-center justify-center text-zinc-400 dark:text-zinc-500 flex-shrink-0 overflow-hidden border border-zinc-100 dark:border-zinc-700">
                          {!isAnonymous && sender?.profile_image_url ? (
                            <img src={sender.profile_image_url} alt={sender.name} className="w-full h-full object-cover" />
                          ) : (
                            <User size={24} />
                          )}
                        </div>
                        <div className="flex-1">
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <h3 className="font-semibold text-zinc-900 dark:text-white">
                                {isAnonymous ? 'Anônimo' : (sender?.name || 'Usuário Desconhecido')}
                              </h3>
                              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                                {new Date(feedback.created_at).toLocaleDateString()} às {new Date(feedback.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </p>
                            </div>
                            {isAnonymous && (
                              <span className="bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 text-xs px-2 py-1 rounded-full font-medium">
                                Anônimo
                              </span>
                            )}
                          </div>
                          <p className="text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap">{feedback.content}</p>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>

                {feedbacks.length === 0 && (
                  <div className="text-center py-12 bg-white dark:bg-zinc-900 rounded-2xl border border-dashed border-zinc-200 dark:border-zinc-800 transition-colors duration-200">
                    <Inbox className="w-12 h-12 text-zinc-300 dark:text-zinc-600 mx-auto mb-3" />
                    <h3 className="text-lg font-medium text-zinc-900 dark:text-white">Nenhum feedback recebido</h3>
                    <p className="text-zinc-500 dark:text-zinc-400">Você ainda não recebeu nenhum feedback.</p>
                  </div>
                )}

                {/* Pagination Controls */}
                {feedbacksTotalItems > 0 && (
                  <div className="flex items-center justify-between bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-zinc-100 dark:border-zinc-800 transition-colors duration-200">
                    <div className="text-sm text-zinc-500 dark:text-zinc-400">
                      Mostrando <span className="font-medium">{feedbacksFromItem}</span> até <span className="font-medium">{feedbacksToItem}</span> de <span className="font-medium">{feedbacksTotalItems}</span> resultados
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setFeedbacksPage(prev => Math.max(prev - 1, 1))}
                        disabled={feedbacksPage === 1}
                        className="p-2 border border-zinc-200 dark:border-zinc-700 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed text-zinc-600 dark:text-zinc-400"
                      >
                        <ChevronLeft size={20} />
                      </button>
                      <span className="text-sm font-medium px-2 text-zinc-700 dark:text-zinc-300">
                        Página {feedbacksPage} de {feedbacksTotalPages}
                      </span>
                      <button
                        onClick={() => setFeedbacksPage(prev => Math.min(prev + 1, feedbacksTotalPages))}
                        disabled={feedbacksPage === feedbacksTotalPages}
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
          <>
            {/* All Tenant Feedbacks (Admin) */}
            <div className="bg-white dark:bg-zinc-900 p-4 rounded-2xl shadow-sm border border-zinc-100 dark:border-zinc-800 flex flex-col md:flex-row gap-4 items-center transition-colors duration-200">
              <div className="relative flex-1 w-full">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-zinc-400" size={20} />
                <input
                  type="text"
                  placeholder="Buscar por nome do remetente..."
                  className="w-full pl-10 pr-4 py-2 border border-zinc-200 dark:border-zinc-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-500"
                  value={allFeedbacksSearch}
                  onChange={(e) => setAllFeedbacksSearch(e.target.value)}
                />
              </div>
            </div>

            {loadingAllFeedbacks && allFeedbacks.length === 0 ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
              </div>
            ) : allFeedbacksError ? (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 p-4 rounded-xl text-center">
                {allFeedbacksError}
                <button onClick={() => fetchAllFeedbacks(allFeedbacksPage, allFeedbacksSearch)} className="block mx-auto mt-2 text-sm font-semibold hover:underline">
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
                        className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm p-6 flex gap-4 transition-colors duration-200"
                      >
                        <div className="w-12 h-12 bg-zinc-100 dark:bg-zinc-800 rounded-full flex items-center justify-center text-zinc-400 dark:text-zinc-500 flex-shrink-0 overflow-hidden border border-zinc-100 dark:border-zinc-700">
                          {!isAnonymous && sender?.profile_image_url ? (
                            <img src={sender.profile_image_url} alt={sender.name} className="w-full h-full object-cover" />
                          ) : (
                            <User size={24} />
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
                            {isAnonymous && (
                              <span className="bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 text-xs px-2 py-1 rounded-full font-medium">
                                Anônimo
                              </span>
                            )}
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
                    <div className="w-10 h-10 bg-zinc-200 dark:bg-zinc-700 rounded-full flex items-center justify-center text-zinc-500 dark:text-zinc-400 overflow-hidden">
                      {selectedUser.profile_image_url ? (
                        <img src={selectedUser.profile_image_url} alt={selectedUser.name} className="w-full h-full object-cover" />
                      ) : (
                        <User size={20} />
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
                      className={`w-full p-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent min-h-[120px] resize-none bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-500 ${
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
                      className="w-4 h-4 text-emerald-600 border-zinc-300 dark:border-zinc-600 rounded focus:ring-emerald-500 bg-white dark:bg-zinc-700"
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
                      className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-colors font-medium flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
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
      </div>
    </Layout>
  );
};
