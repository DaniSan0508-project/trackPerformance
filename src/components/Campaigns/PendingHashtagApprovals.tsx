import React, { useState, useEffect, useCallback } from 'react';
import { Loader2, Check, RefreshCw, ChevronLeft, ChevronRight, Hash, User, Calendar, Coins, Target } from 'lucide-react';
import { hashtagApprovalsService } from '../../services/hashtags/hashtagApprovalsService';
import { HashtagRewardApproval, PaginatedResponse } from '../../types';
import { getFullImageUrl } from '../../utils/formatters';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';
import { motion } from 'motion/react';

export const PendingHashtagApprovals: React.FC = () => {
  const { token, coinName } = useAuth();
  const { addToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [approvingId, setApprovingId] = useState<number | null>(null);
  const [data, setData] = useState<PaginatedResponse<HashtagRewardApproval> | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  const fetchApprovals = useCallback(async (page: number) => {
    if (!token) return;
    setLoading(true);
    try {
      const response = await hashtagApprovalsService.getPendingApprovals(token, page);
      setData(response);
    } catch (error: any) {
      console.error('Error fetching hashtag approvals:', error);
      addToast('error', 'Não foi possível carregar as aprovações pendentes.');
    } finally {
      setLoading(false);
    }
  }, [token, addToast]);

  useEffect(() => {
    fetchApprovals(currentPage);
  }, [fetchApprovals, currentPage]);

  const handleApprove = async (id: number) => {
    if (!token) return;
    setApprovingId(id);
    try {
      const response = await hashtagApprovalsService.approveReward(token, id);
      addToast('success', response.message || 'Recompensa aprovada com sucesso!');
      fetchApprovals(currentPage);
    } catch (error: any) {
      console.error('Error approving hashtag reward:', error);
      addToast('error', error.message || 'Erro ao aprovar recompensa.');
    } finally {
      setApprovingId(null);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('pt-BR');
  };

  if (loading && !data) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-8 h-8 text-primary-600 animate-spin" />
      </div>
    );
  }

  const approvals = data?.data || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-zinc-900 dark:text-white">Aprovações de Hashtags</h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Analise e aprove os ganhos de {coinName} por hashtags utilizadas.
          </p>
        </div>
        <button
          onClick={() => fetchApprovals(currentPage)}
          className="p-2 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-all"
          disabled={loading}
        >
          <RefreshCw size={20} className={loading ? "animate-spin" : ""} />
        </button>
      </div>

      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-100 dark:border-zinc-800 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-zinc-50/50 dark:bg-zinc-800/50 border-b border-zinc-100 dark:border-zinc-800">
                <th className="px-6 py-4 text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Colaborador</th>
                <th className="px-6 py-4 text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Hashtag / Campanha</th>
                <th className="px-6 py-4 text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Valor</th>
                <th className="px-6 py-4 text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Data Solicitação</th>
                <th className="px-6 py-4 text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {approvals.map((item) => (
                <motion.tr
                  key={item.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30 transition-colors"
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-400 overflow-hidden flex-shrink-0 border border-zinc-200 dark:border-zinc-700 shadow-sm">
                        {item.user.profile_image_url ? (
                          <img 
                            src={getFullImageUrl(item.user.profile_image_url) || ''} 
                            alt={item.user.name} 
                            className="w-full h-full object-cover" 
                          />
                        ) : (
                          <User size={18} />
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-zinc-900 dark:text-white leading-tight">{item.user.name}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5 text-sm font-bold text-primary-600 dark:text-primary-400">
                        <Hash size={14} />
                        {item.hashtag}
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400">
                        <Target size={12} />
                        {item.campaign_name}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1.5 text-sm font-bold text-amber-600 dark:text-amber-400">
                      <Coins size={16} />
                      {item.coins} {coinName}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400">
                      <Calendar size={14} />
                      {formatDate(item.created_at)}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    {item.status === 'approved' ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs font-bold rounded-lg border border-green-200 dark:border-green-800">
                        <Check size={14} />
                        Aprovado
                      </span>
                    ) : (
                      <button
                        onClick={() => handleApprove(item.id)}
                        disabled={approvingId === item.id}
                        className="inline-flex items-center gap-2 px-3 py-1.5 bg-green-600 hover:bg-green-700 disabled:bg-zinc-400 text-white text-xs font-bold rounded-lg transition-all shadow-sm"
                      >
                        {approvingId === item.id ? (
                          <Loader2 size={14} className="animate-spin" />
                        ) : (
                          <Check size={14} />
                        )}
                        Aprovar
                      </button>
                    )}
                  </td>
                </motion.tr>
              ))}

              {approvals.length === 0 && !loading && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-full text-zinc-400">
                        <Check size={32} />
                      </div>
                      <p className="text-zinc-500 dark:text-zinc-400 font-medium">Não há aprovações pendentes no momento.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {data && data.total > data.per_page && (
          <div className="p-4 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Mostrando {data.from} até {data.to} de {data.total} resultados
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1 || loading}
                className="p-1.5 border border-zinc-200 dark:border-zinc-700 rounded-lg disabled:opacity-50 text-zinc-600 dark:text-zinc-400"
              >
                <ChevronLeft size={18} />
              </button>
              <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300">
                Página {currentPage} de {data.last_page}
              </span>
              <button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, data.last_page))}
                disabled={currentPage === data.last_page || loading}
                className="p-1.5 border border-zinc-200 dark:border-zinc-700 rounded-lg disabled:opacity-50 text-zinc-600 dark:text-zinc-400"
              >
                <ChevronRight size={18} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
