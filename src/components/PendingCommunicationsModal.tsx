import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Mail, CheckCircle, User, Clock, Eye } from 'lucide-react';
import { CommunicationFeed } from '../types/communication';

interface PendingCommunicationsModalProps {
  isOpen: boolean;
  communications: CommunicationFeed[];
  onClose: () => void;
  onMarkAsRead: (id: number) => void;
  onMarkAllAsRead: () => void;
  onViewCommunication: (comm: CommunicationFeed) => void;
  viewingCommunication: CommunicationFeed | null;
  loading: boolean;
}

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export const PendingCommunicationsModal: React.FC<PendingCommunicationsModalProps> = ({
  isOpen,
  communications,
  onClose,
  onMarkAsRead,
  onMarkAllAsRead,
  onViewCommunication,
  viewingCommunication,
  loading,
}) => {
  const unreadCount = communications.filter(c => !c.is_viewed).length;

  if (viewingCommunication) {
    return (
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => onViewCommunication(null as any)}
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
                      {viewingCommunication.title}
                    </h2>
                    <div className="flex items-center gap-4 mt-2 text-sm text-zinc-500 dark:text-zinc-400">
                      <div className="flex items-center gap-1">
                        <User size={14} />
                        <span>{viewingCommunication.creator.name}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock size={14} />
                        <span>{formatDate(viewingCommunication.published_at)}</span>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => onViewCommunication(null as any)}
                    className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors ml-4"
                  >
                    <X size={24} />
                  </button>
                </div>
              </div>

              {/* Content */}
              <div className="p-6">
                <div
                  className="prose prose-zinc dark:prose-invert max-w-none"
                  dangerouslySetInnerHTML={{ __html: viewingCommunication.content }}
                />
              </div>

              {/* Footer */}
              <div className="p-6 border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50">
                <button
                  onClick={() => {
                    onMarkAsRead(viewingCommunication.id);
                    onViewCommunication(null as any);
                  }}
                  className="w-full px-6 py-3 bg-primary-600 text-white rounded-xl hover:bg-primary-700 transition-all font-bold flex items-center justify-center gap-2"
                >
                  <CheckCircle size={18} />
                  Marcar como Lido
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    );
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col"
          >
            {/* Header */}
            <div className="p-6 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="bg-primary-100 dark:bg-primary-900/30 p-2 rounded-xl">
                    <Mail className="w-6 h-6 text-primary-600 dark:text-primary-400" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-zinc-900 dark:text-white">
                      Comunicados Pendentes
                    </h2>
                    {unreadCount > 0 && (
                      <p className="text-sm text-zinc-500 dark:text-zinc-400">
                        Você tem <span className="font-semibold text-primary-600 dark:text-primary-400">{unreadCount}</span> comunicado(s) não lido(s)
                      </p>
                    )}
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors"
                >
                  <X size={24} />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
                </div>
              ) : communications.length === 0 ? (
                <div className="text-center py-12">
                  <Mail className="w-16 h-16 text-zinc-300 dark:text-zinc-600 mx-auto mb-4" />
                  <p className="text-zinc-500 dark:text-zinc-400">Nenhum comunicado pendente.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {communications.map((comm) => (
                    <div
                      key={comm.id}
                      className={`p-4 rounded-xl border transition-all ${
                        comm.is_viewed
                          ? 'border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50'
                          : 'border-primary-200 dark:border-primary-800 bg-primary-50 dark:bg-primary-900/20 border-l-4 border-l-primary-500'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0">
                          {comm.is_viewed ? (
                            <CheckCircle className="w-5 h-5 text-zinc-400" />
                          ) : (
                            <div className="w-5 h-5 bg-primary-600 rounded-full animate-pulse" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className={`font-bold ${
                            comm.is_viewed
                              ? 'text-zinc-700 dark:text-zinc-400'
                              : 'text-zinc-900 dark:text-white'
                          }`}>
                            {comm.title}
                          </h3>
                          <div className="flex items-center gap-3 mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                            <div className="flex items-center gap-1">
                              <User size={12} />
                              <span>{comm.creator.name}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Clock size={12} />
                              <span>{formatDate(comm.published_at)}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => onViewCommunication(comm)}
                            className="p-2 text-zinc-400 hover:text-primary-600 dark:hover:text-primary-400 hover:bg-primary-100 dark:hover:bg-primary-900/30 rounded-lg transition-colors"
                            title="Visualizar"
                          >
                            <Eye size={16} />
                          </button>
                          {!comm.is_viewed && (
                            <button
                              onClick={() => onMarkAsRead(comm.id)}
                              className="p-2 text-zinc-400 hover:text-green-600 dark:hover:text-green-400 hover:bg-green-100 dark:hover:bg-green-900/30 rounded-lg transition-colors"
                              title="Marcar como lido"
                            >
                              <CheckCircle size={16} />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            {communications.length > 0 && (
              <div className="p-6 border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50 flex gap-3">
                <button
                  onClick={onClose}
                  className="flex-1 px-6 py-3 border border-zinc-300 dark:border-zinc-600 text-zinc-700 dark:text-zinc-300 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-all font-bold"
                >
                  Fechar
                </button>
                {unreadCount > 0 && (
                  <button
                    onClick={onMarkAllAsRead}
                    className="flex-1 px-6 py-3 bg-primary-600 text-white rounded-xl hover:bg-primary-700 transition-all font-bold flex items-center justify-center gap-2"
                  >
                    <CheckCircle size={18} />
                    Marcar Todos como Lidos
                  </button>
                )}
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
