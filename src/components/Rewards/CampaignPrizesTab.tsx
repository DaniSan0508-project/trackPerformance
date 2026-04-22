import React, { useState, useEffect, useCallback } from 'react';
import { Loader2, RefreshCw, Trophy, User, Calendar, CheckCircle, Package, Clock } from 'lucide-react';
import { motion } from 'motion/react';
import { useAuth } from '../../context/AuthContext';
import { Campaign, PaginatedResponse } from '../../types';
import { campaignsService } from '../../services/campaigns/campaignsService';
import { useToast } from '../../context/ToastContext';
import { ConfirmModal } from '../ConfirmModal';

export const CampaignPrizesTab: React.FC = () => {
  const { token } = useAuth();
  const { addToast } = useToast();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [approvingId, setApprovingId] = useState<number | null>(null);
  
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    campaign: Campaign | null;
  }>({
    isOpen: false,
    campaign: null,
  });

  const fetchCampaigns = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      // Busca todas as campanhas e filtra no front para simplificar 
      // (ajustar para filtros de API se disponível)
      const response = await campaignsService.getCampaigns(token, 1);
      const allCampaigns = response.data || [];
      
      // Filtra por campanhas que:
      // 1. Tem prêmio (reward !== null)
      // 2. Tem ganhador (winner_user_id !== null)
      // 3. Estão encerradas (!is_active ou status === 'finalizada')
      const prizeCampaigns = allCampaigns.filter((c: Campaign) => 
        c.reward !== null && 
        c.winner_user_id !== null && 
        (c.status === 'finalizada' || c.is_active === 0)
      );
      
      setCampaigns(prizeCampaigns);
    } catch (error) {
      console.error('Error fetching prize campaigns:', error);
      addToast('error', 'Erro ao carregar prêmios de campanhas.');
    } finally {
      setLoading(false);
    }
  }, [token, addToast]);

  useEffect(() => {
    fetchCampaigns();
  }, [fetchCampaigns]);

  const handleApprovePrize = async () => {
    if (!token || !confirmModal.campaign) return;
    
    const campaignId = confirmModal.campaign.id;
    setApprovingId(campaignId);
    setConfirmModal({ isOpen: false, campaign: null });
    
    try {
      await campaignsService.approvePrize(token, campaignId);
      addToast('success', 'Entrega do prêmio aprovada com sucesso!');
      await fetchCampaigns();
    } catch (error: any) {
      console.error('Error approving prize:', error);
      addToast('error', error.message || 'Erro ao aprovar entrega do prêmio.');
    } finally {
      setApprovingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-bold text-zinc-900 dark:text-white flex items-center gap-2">
          <Trophy className="text-amber-500" size={20} />
          Prêmios de Campanhas Encerradas
        </h2>
        <button
          onClick={fetchCampaigns}
          className="p-2 text-zinc-500 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
          title="Atualizar"
        >
          <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 text-primary-600 animate-spin" />
        </div>
      ) : campaigns.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-zinc-900 rounded-2xl border border-dashed border-zinc-200 dark:border-zinc-800">
          <Trophy className="w-12 h-12 text-zinc-300 dark:text-zinc-600 mx-auto mb-3" />
          <h3 className="text-lg font-medium text-zinc-900 dark:text-white">Nenhum prêmio pendente</h3>
          <p className="text-zinc-500 dark:text-zinc-400">
            Não há campanhas encerradas com ganhadores aguardando aprovação de prêmio.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {campaigns.map((campaign) => (
            <motion.div
              key={campaign.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white dark:bg-zinc-900 rounded-2xl p-6 border border-zinc-100 dark:border-zinc-800 shadow-sm"
            >
              <div className="flex flex-col lg:flex-row gap-6">
                {/* Campaign & Prize Info */}
                <div className="flex-1 flex gap-4">
                  <div className="w-20 h-20 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex-shrink-0 overflow-hidden border border-zinc-200 dark:border-zinc-700">
                    {campaign.reward?.primary_image ? (
                      <img 
                        src={campaign.reward.primary_image.image_full_url} 
                        alt={campaign.reward.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-zinc-400">
                        <Package size={32} />
                      </div>
                    )}
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-zinc-900 dark:text-white mb-1">
                      {campaign.name}
                    </h3>
                    <div className="flex items-center gap-2 text-sm text-zinc-500 dark:text-zinc-400 mb-2">
                      <Calendar size={14} />
                      <span>Encerrada em: {new Date(campaign.end_date).toLocaleDateString('pt-BR')}</span>
                    </div>
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 rounded-lg text-sm font-semibold">
                      <Package size={16} />
                      Prêmio: {campaign.reward?.name}
                    </div>
                  </div>
                </div>

                {/* Winner Info */}
                <div className="flex-1 lg:border-l lg:border-r border-zinc-100 dark:border-zinc-800 lg:px-6">
                  <div className="text-sm font-medium text-zinc-500 dark:text-zinc-400 mb-2 uppercase tracking-wider">
                    Ganhador
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center text-primary-600 dark:text-primary-400">
                      <User size={20} />
                    </div>
                    <div>
                      <div className="font-bold text-zinc-900 dark:text-white">
                        {campaign.winner?.name || `Usuário #${campaign.winner_user_id}`}
                      </div>
                      <div className="text-sm text-zinc-500 dark:text-zinc-400">
                        {campaign.winner?.email}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Status & Actions */}
                <div className="lg:w-64 flex flex-col justify-center gap-3">
                  {campaign.prize_approved_at ? (
                    <div className="flex flex-col items-center justify-center p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl text-green-700 dark:text-green-400">
                      <div className="flex items-center gap-2 font-bold mb-1">
                        <CheckCircle size={18} />
                        Prêmio Entregue
                      </div>
                      <div className="text-xs">
                        Aprovado em {new Date(campaign.prize_approved_at).toLocaleDateString('pt-BR')}
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center justify-center gap-2 text-amber-600 dark:text-amber-400 text-sm font-medium mb-1">
                        <Clock size={16} />
                        Aguardando aprovação
                      </div>
                      <button
                        onClick={() => setConfirmModal({ isOpen: true, campaign })}
                        disabled={approvingId === campaign.id}
                        className="w-full py-2.5 bg-primary-600 hover:bg-primary-700 text-white font-bold rounded-xl shadow-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                      >
                        {approvingId === campaign.id ? (
                          <Loader2 size={18} className="animate-spin" />
                        ) : (
                          <CheckCircle size={18} />
                        )}
                        Aprovar Entrega
                      </button>
                    </>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal({ isOpen: false, campaign: null })}
        onConfirm={handleApprovePrize}
        title="Aprovar Entrega de Prêmio"
        message={`Deseja confirmar a entrega do prêmio "${confirmModal.campaign?.reward?.name}" para ${confirmModal.campaign?.winner?.name || 'o ganhador'}? O usuário será notificado e o resgate será registrado.`}
      />
    </div>
  );
};
