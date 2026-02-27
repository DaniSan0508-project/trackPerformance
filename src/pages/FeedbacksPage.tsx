import React, { useState, useEffect, useCallback } from 'react';
import { Layout } from '../components/Layout';
import { Search, Loader2, RefreshCw, ChevronLeft, ChevronRight, MessageSquarePlus, User, Send, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../context/AuthContext';
import { User as UserType } from '../types';
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
  const [users, setUsers] = useState<UserType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 500);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [fromItem, setFromItem] = useState(0);
  const [toItem, setToItem] = useState(0);

  // Modal state
  const [selectedUser, setSelectedUser] = useState<UserType | null>(null);
  const [feedbackContent, setFeedbackContent] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [sending, setSending] = useState(false);

  const fetchUsers = useCallback(async (page = 1, search = '') => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const data = await api.getUsers(token, page, search);
      // Filter out current user from the list
      const filteredUsers = data.data.filter(u => u.id !== currentUser?.id);
      setUsers(filteredUsers);
      setCurrentPage(data.current_page);
      setTotalPages(data.last_page);
      setTotalItems(data.total); // Note: total might be slightly off if current user was in the page
      setFromItem(data.from);
      setToItem(data.to);
    } catch (err: any) {
      console.error('Error fetching users:', err);
      setError(err.message || 'Não foi possível carregar os usuários.');
    } finally {
      setLoading(false);
    }
  }, [token, currentUser]);

  useEffect(() => {
    fetchUsers(currentPage, debouncedSearchTerm);
  }, [fetchUsers, currentPage, debouncedSearchTerm]);

  useEffect(() => {
    setCurrentPage(1);
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
            <p className="text-zinc-500">Envie feedbacks construtivos para seus colegas.</p>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={() => fetchUsers(currentPage, searchTerm)}
              className="bg-white border border-zinc-200 p-2 rounded-xl text-zinc-600 hover:bg-zinc-50 transition-all"
              title="Atualizar"
            >
              <RefreshCw size={20} className={loading ? "animate-spin" : ""} />
            </button>
          </div>
        </div>

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
        {loading && users.length === 0 ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl text-center">
            {error}
            <button onClick={() => fetchUsers(currentPage, searchTerm)} className="block mx-auto mt-2 text-sm font-semibold hover:underline">
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
            {totalItems > 0 && (
              <div className="flex items-center justify-between bg-white p-4 rounded-2xl border border-zinc-100">
                <div className="text-sm text-zinc-500">
                  Mostrando <span className="font-medium">{fromItem}</span> até <span className="font-medium">{toItem}</span> de <span className="font-medium">{totalItems}</span> resultados
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className="p-2 border border-zinc-200 rounded-lg hover:bg-zinc-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft size={20} />
                  </button>
                  <span className="text-sm font-medium px-2">
                    Página {currentPage} de {totalPages}
                  </span>
                  <button
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    className="p-2 border border-zinc-200 rounded-lg hover:bg-zinc-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronRight size={20} />
                  </button>
                </div>
              </div>
            )}
          </div>
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
