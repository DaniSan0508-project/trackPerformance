import React, { useState, useEffect, useCallback } from 'react';
import { Search, Loader2, RefreshCw, ChevronLeft, ChevronRight, Mail, Eye, CheckCircle, User, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../context/AuthContext';
import { CommunicationFeed } from '../types/communication';
import { communicationsService } from '../services';
import { useToast } from '../context/ToastContext';

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

export const CommunicationsFeedPage: React.FC = () => {
  const { token, user: currentUser } = useAuth();
  const { addToast } = useToast();
  const [communications, setCommunications] = useState<CommunicationFeed[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 500);

  // Paginação
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  // Modal de visualização
  const [viewModal, setViewModal] = useState<{
    isOpen: boolean;
    communication: CommunicationFeed | null;
    loading: boolean;
  }>({
    isOpen: false,
    communication: null,
    loading: false,
  });

  const fetchFeed = useCallback(async (page = 1, search = '') => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const data = await communicationsService.getCommunicationFeed(token, page, search, 10);
      
      // Filtra comunicados destinados ao usuário
      const filteredComms = (data.data || []).filter((c: CommunicationFeed) => {
        return c.target_all || c.target_users?.some(u => u.id === currentUser?.id);
      });

      setCommunications(filteredComms);
      setCurrentPage(data.meta?.current_page || data.current_page);
      setTotalPages(data.meta?.last_page || data.last_page);
      setTotalItems(data.meta?.total || data.total);
    } catch (err: any) {
      console.error('Error fetching communications feed:', err);
      setError(err.message || 'Não foi possível carregar os comunicados.');
    } finally {
      setLoading(false);
    }
  }, [token, currentUser?.id]);

  useEffect(() => {
    fetchFeed(currentPage, debouncedSearchTerm);
  }, [fetchFeed, currentPage, debouncedSearchTerm]);

  const handleRefresh = () => {
    fetchFeed(currentPage, debouncedSearchTerm);
  };

  const handleViewCommunication = async (comm: CommunicationFeed) => {
    if (!token) return;
    setViewModal({ isOpen: true, communication: comm, loading: true });
    
    // Marca como lido
    try {
      await communicationsService.markAsRead(token, comm.id);
    } catch (error) {
      console.error('Error marking as read:', error);
    }
    
    // Atualiza lista para refletir o status
    fetchFeed(currentPage, debouncedSearchTerm);
    setViewModal(prev => ({ ...prev, loading: false }));
  };

  const handleCloseView = () => {
    setViewModal({ isOpen: false, communication: null, loading: false });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <>
      <div className="p-4 md:p-8 space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">Meus Comunicados</h1>
            <p className="text-zinc-500 dark:text-zinc-400">Acompanhe os comunicados recebidos.</p>
          </div>
          <button
            onClick={handleRefresh}
            className="bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 p-2 rounded-xl text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-all"
            title="Atualizar"
          >
            <RefreshCw size={20} />
          </button>
        </div>

        {/* Busca */}
        <div className="bg-white dark:bg-zinc-900 p-4 rounded-2xl shadow-sm border border-zinc-100 dark:border-zinc-800">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-zinc-400" size={18} />
            <input
              type="text"
              placeholder="Buscar por título..."
              className="w-full pl-10 pr-4 py-2.5 border border-zinc-300 dark:border-zinc-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-500"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {/* Lista de Comunicados */}
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 text-primary-600 animate-spin" />
          </div>
        ) : error ? (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 p-4 rounded-xl text-center">
            {error}
            <button
              onClick={() => fetchFeed(currentPage, debouncedSearchTerm)}
              className="block mx-auto mt-2 text-sm font-semibold hover:underline"
            >
              Tentar novamente
            </button>
          </div>
        ) : communications.length === 0 ? (
          <div className="bg-white dark:bg-zinc-900 p-12 rounded-2xl shadow-sm border border-zinc-100 dark:border-zinc-800 text-center">
            <Mail className="w-16 h-16 text-zinc-300 dark:text-zinc-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-white mb-2">Nenhum comunicado disponível</h3>
            <p className="text-zinc-500 dark:text-zinc-400">
              {searchTerm ? 'Tente ajustar sua busca.' : 'Você ainda não recebeu comunicados.'}
            </p>
          </div>
        ) : (
          <>
            <div className="space-y-4">
              {communications.map((comm) => (
                <motion.div
                  key={comm.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`bg-white dark:bg-zinc-900 p-6 rounded-2xl shadow-sm border transition-all duration-200 cursor-pointer hover:shadow-md ${
                    comm.is_viewed
                      ? 'border-zinc-100 dark:border-zinc-800 opacity-80'
                      : 'border-primary-200 dark:border-primary-800 border-l-4 border-l-primary-500'
                  }`}
                  onClick={() => handleViewCommunication(comm)}
                >
                  <div className="flex items-start gap-4">
                    <div className={`p-3 rounded-xl ${
                      comm.is_viewed
                        ? 'bg-zinc-100 dark:bg-zinc-800'
                        : 'bg-primary-100 dark:bg-primary-900/30'
                    }`}>
                      {comm.is_viewed ? (
                        <CheckCircle className="w-6 h-6 text-zinc-400 dark:text-zinc-500" />
                      ) : (
                        <Mail className="w-6 h-6 text-primary-600 dark:text-primary-400" />
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        {!comm.is_viewed && (
                          <span className="w-2 h-2 bg-primary-600 rounded-full animate-pulse" />
                        )}
                        <h3 className={`font-bold text-lg ${
                          comm.is_viewed
                            ? 'text-zinc-700 dark:text-zinc-400'
                            : 'text-zinc-900 dark:text-white'
                        }`}>
                          {comm.title}
                        </h3>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-zinc-500 dark:text-zinc-400">
                        <div className="flex items-center gap-1">
                          <User size={14} />
                          <span>{comm.creator.name}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock size={14} />
                          <span>{formatDate(comm.published_at)}</span>
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleViewCommunication(comm);
                      }}
                      className="p-2 text-zinc-400 hover:text-primary-600 dark:hover:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-lg transition-colors"
                      title="Visualizar"
                    >
                      <Eye size={18} />
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Paginação */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between pt-4">
                <div className="text-sm text-zinc-600 dark:text-zinc-400">
                  Mostrando{' '}
                  <span className="font-semibold text-zinc-900 dark:text-white">{totalItems}</span> comunicado(s)
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
                  <span className="px-4 py-2 bg-primary-600 text-white rounded-xl text-sm font-medium">
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

      {/* View Modal */}
      <AnimatePresence>
        {viewModal.isOpen && viewModal.communication && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={handleCloseView}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[85vh] overflow-y-auto"
            >
              {/* Header */}
              <div className="p-6 border-b border-zinc-100 dark:border-zinc-800 sticky top-0 bg-white dark:bg-zinc-900 rounded-t-2xl z-10">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h2 className="text-xl font-bold text-zinc-900 dark:text-white">
                      {viewModal.communication.title}
                    </h2>
                    <div className="flex items-center gap-4 mt-2 text-sm text-zinc-500 dark:text-zinc-400">
                      <div className="flex items-center gap-1">
                        <User size={14} />
                        <span>{viewModal.communication.creator.name}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock size={14} />
                        <span>{formatDate(viewModal.communication.published_at)}</span>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={handleCloseView}
                    className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors ml-4"
                  >
                    <span className="text-2xl">&times;</span>
                  </button>
                </div>
              </div>

              {/* Content */}
              <div className="p-6">
                {viewModal.loading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 size={32} className="animate-spin text-primary-600" />
                  </div>
                ) : (
                  <div
                    className="prose prose-zinc dark:prose-invert max-w-none"
                    dangerouslySetInnerHTML={{ __html: viewModal.communication.content }}
                  />
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
