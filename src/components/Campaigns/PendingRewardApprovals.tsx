import React, { useState, useEffect, useCallback } from 'react';
import { Loader2, Check, RefreshCw, ChevronLeft, ChevronRight, Hash, User, Calendar, Coins, Target, Share2, Filter, X } from 'lucide-react';
import { rewardApprovalsService, RewardApprovalsFilters } from '../../services/rewards/rewardApprovalsService';
import { RewardApproval, PaginatedResponse } from '../../types';
import { getFullImageUrl } from '../../utils/formatters';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';
import { motion } from 'motion/react';

export const PendingRewardApprovals: React.FC = () => {
  const { token, coinName } = useAuth();
  const { addToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [data, setData] = useState<PaginatedResponse<RewardApproval> | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [activeFilter, setActiveFilter] = useState<'all' | 'hashtag' | 'post_share'>('all');

  const fetchApprovals = useCallback(async (page: number, type?: 'hashtag' | 'post_share') => {
    if (!token) return;
    setLoading(true);
    try {
      const filters: RewardApprovalsFilters = { status: 'pending' };
      if (type && type !== 'all' as any) filters.approval_type = type;
      
      const response = await rewardApprovalsService.getApprovals(token, page, filters);
      setData(response);
    } catch (error: any) {
      console.error('Error fetching reward approvals:', error);
      addToast('error', 'Não foi possível carregar as aprovações pendentes.');
    } finally {
      setLoading(false);
    }
  }, [token, addToast]);

  useEffect(() => {
    fetchApprovals(currentPage, activeFilter === 'all' ? undefined : activeFilter);
  }, [fetchApprovals, currentPage, activeFilter]);

  const handleApprove = async (item: RewardApproval) => {
    if (!token) return;
    const itemKey = `${item.approval_type}-${item.id}`;
    setApprovingId(itemKey);
    try {
      let response;
      if (item.approval_type === 'hashtag') {
        response = await rewardApprovalsService.approveHashtag(token, item.id);
      } else {
        response = await rewardApprovalsService.approvePostShare(token, item.id);
      }
      addToast('success', response.message || 'Recompensa aprovada com sucesso!');
      fetchApprovals(currentPage, activeFilter === 'all' ? undefined : activeFilter);
    } catch (error: any) {
      console.error('Error approving reward:', error);
      addToast('error', error.message || 'Erro ao aprovar recompensa.');
    } finally {
      setApprovingId(null);
    }
  };

  const handleReject = async (item: RewardApproval) => {
    if (!token) return;
    const itemKey = `${item.approval_type}-${item.id}`;
    setRejectingId(itemKey);
    try {
      let response;
      if (item.approval_type === 'hashtag') {
        response = await rewardApprovalsService.rejectHashtag(token, item.id);
      } else {
        response = await rewardApprovalsService.rejectPostShare(token, item.id);
      }
      addToast('success', response.message || 'Recompensa rejeitada.');
      fetchApprovals(currentPage, activeFilter === 'all' ? undefined : activeFilter);
    } catch (error: any) {
      console.error('Error rejecting reward:', error);
      addToast('error', error.message || 'Erro ao rejeitar recompensa.');
    } finally {
      setRejectingId(null);
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
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-zinc-900 dark:text-white">Aprovações de Recompensas</h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Analise e aprove os ganhos de {coinName} por engajamento.
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <div className="flex bg-zinc-100 dark:bg-zinc-800 p-1 rounded-xl border border-zinc-200 dark:border-zinc-700 shadow-sm">
            <button
              onClick={() => { setActiveFilter('all'); setCurrentPage(1); }}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                activeFilter === 'all'
                  ? 'bg-white dark:bg-zinc-700 text-primary-600 dark:text-primary-400 shadow-sm'
                  : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'
              }`}
            >
              Todos
            </button>
            <button
              onClick={() => { setActiveFilter('hashtag'); setCurrentPage(1); }}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${
                activeFilter === 'hashtag'
                  ? 'bg-white dark:bg-zinc-700 text-primary-600 dark:text-primary-400 shadow-sm'
                  : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'
              }`}
            >
              <Hash size={12} />
              Hashtags
            </button>
            <button
              onClick={() => { setActiveFilter('post_share'); setCurrentPage(1); }}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${
                activeFilter === 'post_share'
                  ? 'bg-white dark:bg-zinc-700 text-primary-600 dark:text-primary-400 shadow-sm'
                  : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'
              }`}
            >
              <Share2 size={12} />
              Compartilhamentos
            </button>
          </div>
          
          <button
            onClick={() => fetchApprovals(currentPage, activeFilter === 'all' ? undefined : activeFilter)}
            className="p-2 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-all shadow-sm"
            disabled={loading}
          >
            <RefreshCw size={20} className={loading ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-100 dark:border-zinc-800 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-zinc-50/50 dark:bg-zinc-800/50 border-b border-zinc-100 dark:border-zinc-800">
                <th className="px-6 py-4 text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Colaborador</th>
                <th className="px-6 py-4 text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Tipo / Detalhe</th>
                <th className="px-6 py-4 text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Valor</th>
                <th className="px-6 py-4 text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Data Solicitação</th>
                <th className="px-6 py-4 text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {approvals.map((item) => (
                <motion.tr
                  key={`${item.approval_type}-${item.id}`}
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
                      {item.approval_type === 'hashtag' ? (
                        <>
                          <div className="flex items-center gap-1.5 text-sm font-bold text-primary-600 dark:text-primary-400">
                            <Hash size={14} />
                            {item.hashtag}
                          </div>
                          <div className="flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400">
                            <Target size={12} />
                            {item.campaign_name}
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="flex items-center gap-1.5 text-sm font-bold text-indigo-600 dark:text-indigo-400">
                            <Share2 size={14} />
                            Compartilhamento de Post
                          </div>
                          {item.post_title && (
                            <div className="flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400 italic">
                              "{item.post_title}"
                            </div>
                          )}
                        </>
                      )}
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
                    <div className="flex items-center justify-end gap-2">
                      {item.status === 'approved' ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs font-bold rounded-lg border border-green-200 dark:border-green-800">
                          <Check size={14} />
                          Aprovado
                        </span>
                      ) : item.status === 'rejected' ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 text-xs font-bold rounded-lg border border-red-200 dark:border-red-800">
                          <X size={14} />
                          Rejeitado
                        </span>
                      ) : (
                        <>
                          <button
                            onClick={() => handleReject(item)}
                            disabled={rejectingId === `${item.approval_type}-${item.id}` || approvingId === `${item.approval_type}-${item.id}`}
                            className="inline-flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 text-xs font-bold rounded-lg transition-all shadow-sm disabled:opacity-50"
                          >
                            {rejectingId === `${item.approval_type}-${item.id}` ? (
                              <Loader2 size={14} className="animate-spin" />
                            ) : (
                              <X size={14} />
                            )}
                            Rejeitar
                          </button>
                          
                          <button
                            onClick={() => handleApprove(item)}
                            disabled={approvingId === `${item.approval_type}-${item.id}` || rejectingId === `${item.approval_type}-${item.id}`}
                            className="inline-flex items-center gap-2 px-3 py-1.5 bg-green-600 hover:bg-green-700 disabled:bg-zinc-400 text-white text-xs font-bold rounded-lg transition-all shadow-sm"
                          >
                            {approvingId === `${item.approval_type}-${item.id}` ? (
                              <Loader2 size={14} className="animate-spin" />
                            ) : (
                              <Check size={14} />
                            )}
                            Aprovar
                          </button>
                        </>
                      )}
                    </div>
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
