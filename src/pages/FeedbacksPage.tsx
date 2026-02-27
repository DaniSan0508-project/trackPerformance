import React, { useState, useEffect, useCallback } from 'react';
import { Layout } from '../components/Layout';
import { Search, Loader2, RefreshCw, ChevronLeft, ChevronRight, MessageSquarePlus, User, Send, X, Inbox, PenSquare } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../context/AuthContext';
import { User as UserType, Feedback } from '../types';
import { api } from '../services/api';

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
  const [activeTab, setActiveTab] = useState<'send' | 'received'>('send');
  
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

  // Modal state
  const [selectedUser, setSelectedUser] = useState<UserType | null>(null);
  const [feedbackContent, setFeedbackContent] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [sending, setSending] = useState(false);

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

  useEffect(() => {
    if (activeTab === 'send') {
      fetchUsers(usersPage, debouncedSearchTerm);
    } else {
      fetchFeedbacks(feedbacksPage);
    }
  }, [fetchUsers, fetchFeedbacks, activeTab, usersPage, feedbacksPage, debouncedSearchTerm]);

  // Reset page when search changes
  useEffect(() => {
    if (activeTab === 'send') {
      setUsersPage(1);
    }
  }, [debouncedSearchTerm]);

  const handleSendFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !selectedUser) return;

    setSending(true);
    try {
      await api.sendFeedback(token, {
        recipient_id: selectedUser.id,
        content: feedbackContent,
        is_anonymous: isAnonymous
      });
      alert('Feedback enviado com sucesso!');
      setSelectedUser(null);
      setFeedbackContent('');
      setIsAnonymous(false);
    } catch (err: any) {
      console.error('Error sending feedback:', err);
      alert(err.message || 'Erro ao enviar feedback');
    } finally {
      setSending(false);
    }
  };

  return (
    <Layout>
      <div className="p-4 md:p-8 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-zinc-900">Feedbacks</h1>
            <p className="text-zinc-500">Gerencie seus feedbacks enviados e recebidos.</p>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={() => activeTab === 'send' ? fetchUsers(usersPage, searchTerm) : fetchFeedbacks(feedbacksPage)}
              className="bg-white border border-zinc-200 p-2 rounded-xl text-zinc-600 hover:bg-zinc-50 transition-all"
              title="Atualizar"
            >
              <RefreshCw size={20} className={loadingUsers || loadingFeedbacks ? "animate-spin" : ""} />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex space-x-1 bg-zinc-100 p-1 rounded-xl w-fit">
          <button
            onClick={() => setActiveTab('send')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'send' 
                ? 'bg-white text-zinc-900 shadow-sm' 
                : 'text-zinc-500 hover:text-zinc-700 hover:bg-zinc-200/50'
            }`}
          >
            <PenSquare size={18} />
            Enviar Feedback
          </button>
          <button
            onClick={() => setActiveTab('received')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'received' 
                ? 'bg-white text-zinc-900 shadow-sm' 
                : 'text-zinc-500 hover:text-zinc-700 hover:bg-zinc-200/50'
            }`}
          >
            <Inbox size={18} />
            Recebidos
          </button>
        </div>

        {activeTab === 'send' ? (
          <>
            {/* Filters */}
            <div className="bg-white p-4 rounded-2xl shadow-sm border border-zinc-100 flex flex-col md:flex-row gap-4 items-center">
              <div className="relative flex-1 w-full">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-zinc-400" size={20} />
                <input 
                  type="text" 
                  placeholder="Buscar usuário por nome..." 
                  className="w-full pl-10 pr-4 py-2 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
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
              <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl text-center">
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
                      className="bg-white rounded-xl border border-zinc-200 shadow-sm p-6 flex flex-col items-center text-center hover:shadow-md transition-shadow"
                    >
                      <div className="w-20 h-20 bg-zinc-100 rounded-full flex items-center justify-center text-zinc-400 mb-4 overflow-hidden">
                        {user.profile_image_url ? (
                          <img src={user.profile_image_url} alt={user.name} className="w-full h-full object-cover" />
                        ) : (
                          <User size={32} />
                        )}
                      </div>
                      <h3 className="font-semibold text-lg text-zinc-900 mb-1">{user.name}</h3>
                      <p className="text-sm text-zinc-500 mb-4">{user.email}</p>
                      
                      <button 
                        onClick={() => setSelectedUser(user)}
                        className="mt-auto w-full bg-emerald-50 text-emerald-700 hover:bg-emerald-100 py-2 px-4 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                      >
                        <MessageSquarePlus size={18} />
                        Enviar Feedback
                      </button>
                    </motion.div>
                  ))}
                </div>

                {users.length === 0 && (
                  <div className="text-center py-12 bg-white rounded-2xl border border-dashed border-zinc-200">
                    <User className="w-12 h-12 text-zinc-300 mx-auto mb-3" />
                    <h3 className="text-lg font-medium text-zinc-900">Nenhum usuário encontrado</h3>
                    <p className="text-zinc-500">Tente buscar por outro nome.</p>
                  </div>
                )}

                {/* Pagination Controls */}
                {usersTotalItems > 0 && (
                  <div className="flex items-center justify-between bg-white p-4 rounded-2xl border border-zinc-100">
                    <div className="text-sm text-zinc-500">
                      Mostrando <span className="font-medium">{usersFromItem}</span> até <span className="font-medium">{usersToItem}</span> de <span className="font-medium">{usersTotalItems}</span> resultados
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setUsersPage(prev => Math.max(prev - 1, 1))}
                        disabled={usersPage === 1}
                        className="p-2 border border-zinc-200 rounded-lg hover:bg-zinc-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <ChevronLeft size={20} />
                      </button>
                      <span className="text-sm font-medium px-2">
                        Página {usersPage} de {usersTotalPages}
                      </span>
                      <button
                        onClick={() => setUsersPage(prev => Math.min(prev + 1, usersTotalPages))}
                        disabled={usersPage === usersTotalPages}
                        className="p-2 border border-zinc-200 rounded-lg hover:bg-zinc-50 disabled:opacity-50 disabled:cursor-not-allowed"
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
            {/* Received Feedbacks List */}
            {loadingFeedbacks && feedbacks.length === 0 ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
              </div>
            ) : feedbacksError ? (
              <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl text-center">
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
                        className="bg-white rounded-xl border border-zinc-200 shadow-sm p-6 flex gap-4"
                      >
                        <div className="w-12 h-12 bg-zinc-100 rounded-full flex items-center justify-center text-zinc-400 flex-shrink-0 overflow-hidden">
                          {!isAnonymous && sender?.profile_image_url ? (
                            <img src={sender.profile_image_url} alt={sender.name} className="w-full h-full object-cover" />
                          ) : (
                            <User size={24} />
                          )}
                        </div>
                        <div className="flex-1">
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <h3 className="font-semibold text-zinc-900">
                                {isAnonymous ? 'Anônimo' : (sender?.name || 'Usuário Desconhecido')}
                              </h3>
                              <p className="text-xs text-zinc-500">
                                {new Date(feedback.created_at).toLocaleDateString()} às {new Date(feedback.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </p>
                            </div>
                            {isAnonymous && (
                              <span className="bg-zinc-100 text-zinc-600 text-xs px-2 py-1 rounded-full font-medium">
                                Anônimo
                              </span>
                            )}
                          </div>
                          <p className="text-zinc-700 whitespace-pre-wrap">{feedback.content}</p>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>

                {feedbacks.length === 0 && (
                  <div className="text-center py-12 bg-white rounded-2xl border border-dashed border-zinc-200">
                    <Inbox className="w-12 h-12 text-zinc-300 mx-auto mb-3" />
                    <h3 className="text-lg font-medium text-zinc-900">Nenhum feedback recebido</h3>
                    <p className="text-zinc-500">Você ainda não recebeu nenhum feedback.</p>
                  </div>
                )}

                {/* Pagination Controls */}
                {feedbacksTotalItems > 0 && (
                  <div className="flex items-center justify-between bg-white p-4 rounded-2xl border border-zinc-100">
                    <div className="text-sm text-zinc-500">
                      Mostrando <span className="font-medium">{feedbacksFromItem}</span> até <span className="font-medium">{feedbacksToItem}</span> de <span className="font-medium">{feedbacksTotalItems}</span> resultados
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setFeedbacksPage(prev => Math.max(prev - 1, 1))}
                        disabled={feedbacksPage === 1}
                        className="p-2 border border-zinc-200 rounded-lg hover:bg-zinc-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <ChevronLeft size={20} />
                      </button>
                      <span className="text-sm font-medium px-2">
                        Página {feedbacksPage} de {feedbacksTotalPages}
                      </span>
                      <button
                        onClick={() => setFeedbacksPage(prev => Math.min(prev + 1, feedbacksTotalPages))}
                        disabled={feedbacksPage === feedbacksTotalPages}
                        className="p-2 border border-zinc-200 rounded-lg hover:bg-zinc-50 disabled:opacity-50 disabled:cursor-not-allowed"
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
                className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden"
              >
                <div className="p-4 border-b border-zinc-100 flex justify-between items-center bg-zinc-50/50">
                  <h2 className="text-lg font-bold text-zinc-900">Enviar Feedback</h2>
                  <button onClick={() => setSelectedUser(null)} className="text-zinc-400 hover:text-zinc-600 transition-colors">
                    <X size={24} />
                  </button>
                </div>
                
                <form onSubmit={handleSendFeedback} className="p-6 space-y-4">
                  <div className="flex items-center gap-3 mb-4 p-3 bg-zinc-50 rounded-xl">
                    <div className="w-10 h-10 bg-zinc-200 rounded-full flex items-center justify-center text-zinc-500 overflow-hidden">
                      {selectedUser.profile_image_url ? (
                        <img src={selectedUser.profile_image_url} alt={selectedUser.name} className="w-full h-full object-cover" />
                      ) : (
                        <User size={20} />
                      )}
                    </div>
                    <div>
                      <p className="text-sm text-zinc-500">Para:</p>
                      <p className="font-semibold text-zinc-900">{selectedUser.name}</p>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-zinc-700 mb-1">
                      Mensagem
                    </label>
                    <textarea
                      required
                      value={feedbackContent}
                      onChange={(e) => setFeedbackContent(e.target.value)}
                      className="w-full p-3 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent min-h-[120px] resize-none"
                      placeholder="Escreva seu feedback construtivo aqui..."
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="anonymous"
                      checked={isAnonymous}
                      onChange={(e) => setIsAnonymous(e.target.checked)}
                      className="w-4 h-4 text-emerald-600 border-zinc-300 rounded focus:ring-emerald-500"
                    />
                    <label htmlFor="anonymous" className="text-sm text-zinc-700 select-none cursor-pointer">
                      Enviar anonimamente
                    </label>
                  </div>

                  <div className="pt-2 flex gap-3">
                    <button
                      type="button"
                      onClick={() => setSelectedUser(null)}
                      className="flex-1 px-4 py-2 border border-zinc-200 text-zinc-700 rounded-xl hover:bg-zinc-50 transition-colors font-medium"
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
