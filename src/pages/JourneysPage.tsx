import React, { useState, useEffect, useCallback } from 'react';
import { Search, Loader2, RefreshCw, ChevronLeft, ChevronRight, Plus, Edit2, Trash2, Map, Calendar, Users, Trophy, Send, TrendingUp, BarChart3, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Journey, JourneyStatus, JourneyStats, JourneyParticipantRank } from '../types';
import { journeysService } from '../services';
import { ConfirmModal } from '../components/ConfirmModal';
import { JourneyWizard } from '../components/Journeys/JourneyWizard';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function useDebounce<T>(value: T, delay: number): T {
  const [dv, setDv] = useState<T>(value);
  useEffect(() => {
    const t = setTimeout(() => setDv(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return dv;
}

const formatDate = (dateStr: string | null | undefined): string => {
  if (!dateStr) return '—';
  const d = new Date(dateStr.includes('T') ? dateStr : dateStr + 'T00:00:00');
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

const statusLabels: Record<JourneyStatus, string> = {
  draft: 'Rascunho',
  active: 'Ativa',
  ended: 'Encerrada',
};

const statusColors: Record<JourneyStatus, string> = {
  draft: 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-400',
  active: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400',
  ended: 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-500',
};

// ─── Componente ───────────────────────────────────────────────────────────────

export const JourneysPage: React.FC = () => {
  const { token, user: currentUser } = useAuth();
  const { addToast } = useToast();
  const isAdmin = currentUser?.user_type_id === 1;

  // Lista
  const [journeys, setJourneys] = useState<Journey[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [fromItem, setFromItem] = useState(0);
  const [toItem, setToItem] = useState(0);

  // Filtros
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearch = useDebounce(searchTerm, 500);
  const [filterStatus, setFilterStatus] = useState<string>('all');

  // Wizard
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [editingJourney, setEditingJourney] = useState<Journey | null>(null);

  // Detalhe / participantes
  const [detailJourney, setDetailJourney] = useState<Journey | null>(null);
  const [detailStats, setDetailStats] = useState<JourneyStats | null>(null);
  const [detailParticipants, setDetailParticipants] = useState<JourneyParticipantRank[]>([]);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [participantsOffset, setParticipantsOffset] = useState(0);
  const [hasMoreParticipants, setHasMoreParticipants] = useState(false);

  // Confirmação
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => Promise<void>;
    isLoading: boolean;
  }>({ isOpen: false, title: '', message: '', onConfirm: async () => {}, isLoading: false });

  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [publishingId, setPublishingId] = useState<number | null>(null);

  // ── Buscar jornadas ──────────────────────────────────────────────────────────
  const fetchJourneys = useCallback(async (page = 1, search = '') => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const resp = await journeysService.getJourneys(token, page, filterStatus, search);
      const list: Journey[] = resp.data ?? [];
      setJourneys(list);
      setCurrentPage(resp.meta?.current_page ?? 1);
      setTotalPages(resp.meta?.last_page ?? 1);
      setTotalItems(resp.meta?.total ?? list.length);
      setFromItem(resp.meta?.from ?? 1);
      setToItem(resp.meta?.to ?? list.length);
    } catch (err: any) {
      console.error('Error fetching journeys:', err);
      setError(err.message || 'Não foi possível carregar as jornadas.');
    } finally {
      setLoading(false);
    }
  }, [token, filterStatus]);

  useEffect(() => {
    fetchJourneys(currentPage, debouncedSearch);
  }, [fetchJourneys, currentPage, debouncedSearch, filterStatus]);

  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch, filterStatus]);

  // ── Abrir detalhe ────────────────────────────────────────────────────────────
  const handleOpenDetail = async (journey: Journey) => {
    setDetailJourney(journey);
    setDetailStats(null);
    setDetailParticipants([]);
    setParticipantsOffset(0);
    setLoadingDetail(true);
    try {
      const [statsResp, participantsResp] = await Promise.all([
        journeysService.getJourneyStats(token!, journey.id).catch(() => null),
        journeysService.getJourneyParticipants(token!, journey.id, 20, 0).catch(() => ({ data: [] })),
      ]);
      if (statsResp?.data) setDetailStats(statsResp.data);
      const participants = participantsResp.data ?? [];
      setDetailParticipants(participants);
      setHasMoreParticipants(participants.length === 20);
      setParticipantsOffset(participants.length);
    } catch (err) {
      console.error('Error loading journey detail:', err);
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleLoadMoreParticipants = async () => {
    if (!token || !detailJourney) return;
    try {
      const resp = await journeysService.getJourneyParticipants(token, detailJourney.id, 20, participantsOffset);
      const next = resp.data ?? [];
      setDetailParticipants(prev => [...prev, ...next]);
      setParticipantsOffset(prev => prev + next.length);
      setHasMoreParticipants(next.length === 20);
    } catch (err) {
      addToast('error', 'Erro ao carregar mais participantes.');
    }
  };

  // ── Publicar ─────────────────────────────────────────────────────────────────
  const handlePublish = (journey: Journey) => {
    setConfirmModal({
      isOpen: true,
      title: 'Publicar Jornada',
      message: `Deseja publicar a jornada "${journey.name}"? Esta ação é irreversível — após publicada não será possível editar ou excluir.`,
      isLoading: false,
      onConfirm: async () => {
        if (!token) return;
        setPublishingId(journey.id);
        try {
          await journeysService.publishJourney(token, journey.id);
          addToast('success', 'Jornada publicada com sucesso!');
          fetchJourneys(currentPage, searchTerm);
        } catch (err: any) {
          addToast('error', err.message || 'Erro ao publicar jornada.');
        } finally {
          setPublishingId(null);
          setConfirmModal(prev => ({ ...prev, isLoading: false, isOpen: false }));
        }
      },
    });
  };

  // ── Excluir ──────────────────────────────────────────────────────────────────
  const handleDelete = (journey: Journey) => {
    setConfirmModal({
      isOpen: true,
      title: 'Excluir Jornada',
      message: `Tem certeza que deseja excluir a jornada "${journey.name}"? Esta ação não pode ser desfeita.`,
      isLoading: false,
      onConfirm: async () => {
        if (!token) return;
        setDeletingId(journey.id);
        try {
          await journeysService.deleteJourney(token, journey.id);
          addToast('success', 'Jornada excluída com sucesso!');
          fetchJourneys(currentPage, searchTerm);
        } catch (err: any) {
          addToast('error', err.message || 'Erro ao excluir jornada.');
        } finally {
          setDeletingId(null);
          setConfirmModal(prev => ({ ...prev, isLoading: false, isOpen: false }));
        }
      },
    });
  };

  const handleConfirmModalAction = async () => {
    setConfirmModal(prev => ({ ...prev, isLoading: true }));
    await confirmModal.onConfirm();
  };

  return (
    <>
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
        onConfirm={handleConfirmModalAction}
        title={confirmModal.title}
        message={confirmModal.message}
        isLoading={confirmModal.isLoading}
      />

      <JourneyWizard
        isOpen={isWizardOpen}
        editingJourney={editingJourney}
        onClose={() => { setIsWizardOpen(false); setEditingJourney(null); }}
        onSaved={() => { setIsWizardOpen(false); setEditingJourney(null); fetchJourneys(currentPage, searchTerm); }}
      />

      {/* Modal de detalhe */}
      <AnimatePresence>
        {detailJourney && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              className="bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200 dark:border-zinc-800">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-bold text-zinc-900 dark:text-white">{detailJourney.name}</h2>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${statusColors[detailJourney.status]}`}>
                      {statusLabels[detailJourney.status]}
                    </span>
                  </div>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">
                    {formatDate(detailJourney.start_date)} até {formatDate(detailJourney.end_date)}
                  </p>
                </div>
                <button
                  onClick={() => setDetailJourney(null)}
                  className="p-2 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
                >
                  ✕
                </button>
              </div>

              <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5">
                {loadingDetail ? (
                  <div className="flex justify-center py-8"><Loader2 size={28} className="animate-spin text-primary-600" /></div>
                ) : (
                  <>
                    {/* Stats cards */}
                    {detailStats && (
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <StatCard label="Participantes" value={detailStats.participants_count} icon={<Users size={16} />} />
                        <StatCard label="XP Médio" value={detailStats.average_xp} icon={<TrendingUp size={16} />} />
                        <StatCard label="Níveis" value={detailJourney.levels.length} icon={<BarChart3 size={16} />} />
                        <StatCard label="Fator" value={`÷ ${detailJourney.coins_factor}`} icon={<Trophy size={16} />} />
                      </div>
                    )}

                    {/* Níveis */}
                    {detailJourney.levels.length > 0 && (
                      <div>
                        <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-2">Níveis</h3>
                        <div className="flex flex-wrap gap-2">
                          {detailJourney.levels.map(level => (
                            <div
                              key={level.id}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border"
                              style={{
                                backgroundColor: level.color ? `${level.color}20` : undefined,
                                borderColor: level.color ?? '#e4e4e7',
                                color: level.color ?? '#71717a',
                              }}
                            >
                              <span>{level.icon}</span>
                              <span>{level.name}</span>
                              <span className="opacity-70">({level.xp_threshold} XP)</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Participantes */}
                    <div>
                      <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-2">
                        Participantes {detailParticipants.length > 0 && `(${detailParticipants.length})`}
                      </h3>
                      {detailParticipants.length === 0 ? (
                        <p className="text-sm text-zinc-500 dark:text-zinc-400 italic">Nenhum participante ainda.</p>
                      ) : (
                        <div className="border border-zinc-200 dark:border-zinc-700 rounded-xl overflow-hidden">
                          <table className="w-full text-sm">
                            <thead className="bg-zinc-50 dark:bg-zinc-800">
                              <tr>
                                <th className="px-3 py-2 text-left font-medium text-zinc-600 dark:text-zinc-400">#</th>
                                <th className="px-3 py-2 text-left font-medium text-zinc-600 dark:text-zinc-400">Colaborador</th>
                                <th className="px-3 py-2 text-right font-medium text-zinc-600 dark:text-zinc-400">XP</th>
                                <th className="px-3 py-2 text-left font-medium text-zinc-600 dark:text-zinc-400">Nível</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                              {detailParticipants.map(p => (
                                <tr key={p.user.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
                                  <td className="px-3 py-2 font-bold text-zinc-400">#{p.position}</td>
                                  <td className="px-3 py-2 font-medium text-zinc-900 dark:text-white">{p.user.name}</td>
                                  <td className="px-3 py-2 text-right font-semibold text-primary-600 dark:text-primary-400">{p.xp}</td>
                                  <td className="px-3 py-2">
                                    {p.level ? (
                                      <span
                                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium"
                                        style={{
                                          backgroundColor: p.level.color ? `${p.level.color}20` : '#f4f4f5',
                                          color: p.level.color ?? '#71717a',
                                        }}
                                      >
                                        {p.level.icon} {p.level.name}
                                      </span>
                                    ) : '—'}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                          {hasMoreParticipants && (
                            <div className="px-3 py-2 border-t border-zinc-100 dark:border-zinc-800 text-center">
                              <button
                                onClick={handleLoadMoreParticipants}
                                className="text-sm text-primary-600 dark:text-primary-400 hover:underline font-medium"
                              >
                                Carregar mais
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── Página principal ────────────────────────────────────────────────── */}
      <div className="p-4 md:p-8 space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">Jornadas</h1>
            <p className="text-zinc-500 dark:text-zinc-400">Gerencie as jornadas de progressão e engajamento da sua equipe.</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => fetchJourneys(currentPage, searchTerm)}
              className="bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 p-2 rounded-xl text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-all"
              title="Atualizar"
            >
              <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
            </button>
            {isAdmin && (
              <button
                onClick={() => { setEditingJourney(null); setIsWizardOpen(true); }}
                className="bg-primary-600 px-4 py-2 rounded-xl text-sm font-medium text-white hover:bg-primary-700 shadow-sm transition-all flex items-center gap-2"
              >
                <Plus size={18} />
                Nova Jornada
              </button>
            )}
          </div>
        </div>

        {/* Filtros */}
        <div className="bg-white dark:bg-zinc-900 p-4 rounded-2xl shadow-sm border border-zinc-100 dark:border-zinc-800 flex flex-col sm:flex-row gap-4 items-center transition-colors duration-200">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
            <input
              type="text"
              placeholder="Buscar por nome..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-zinc-200 dark:border-zinc-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-500"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-zinc-400 uppercase whitespace-nowrap">Status:</span>
            <select
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value)}
              className="pl-3 pr-8 py-2 border border-zinc-200 dark:border-zinc-700 rounded-xl bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white text-sm outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="all">Todos</option>
              <option value="draft">Rascunho</option>
              <option value="active">Ativas</option>
              <option value="ended">Encerradas</option>
            </select>
          </div>
        </div>

        {/* Lista */}
        {loading && journeys.length === 0 ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 text-primary-600 animate-spin" />
          </div>
        ) : error ? (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 p-4 rounded-xl text-center">
            {error}
            <button onClick={() => fetchJourneys(currentPage, searchTerm)} className="block mx-auto mt-2 text-sm font-semibold hover:underline">
              Tentar novamente
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {journeys.length === 0 ? (
              <div className="text-center py-16 bg-white dark:bg-zinc-900 rounded-2xl border border-dashed border-zinc-200 dark:border-zinc-800">
                <Map className="w-14 h-14 text-zinc-300 dark:text-zinc-600 mx-auto mb-4" />
                <p className="text-lg font-semibold text-zinc-700 dark:text-zinc-300 mb-1">Nenhuma jornada encontrada</p>
                <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-4">
                  {searchTerm || filterStatus !== 'all' ? 'Tente ajustar os filtros.' : 'Crie a primeira jornada para começar.'}
                </p>
                {isAdmin && !searchTerm && filterStatus === 'all' && (
                  <button
                    onClick={() => { setEditingJourney(null); setIsWizardOpen(true); }}
                    className="bg-primary-600 px-5 py-2 rounded-xl text-sm font-medium text-white hover:bg-primary-700 transition-all inline-flex items-center gap-2"
                  >
                    <Plus size={16} /> Criar primeira jornada
                  </button>
                )}
              </div>
            ) : (
              journeys.map(journey => (
                <JourneyCard
                  key={journey.id}
                  journey={journey}
                  isAdmin={isAdmin}
                  deletingId={deletingId}
                  publishingId={publishingId}
                  onDetail={() => handleOpenDetail(journey)}
                  onEdit={() => { setEditingJourney(journey); setIsWizardOpen(true); }}
                  onPublish={() => handlePublish(journey)}
                  onDelete={() => handleDelete(journey)}
                />
              ))
            )}

            {/* Paginação */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-zinc-100 dark:border-zinc-800 shadow-sm transition-colors">
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                  Mostrando {fromItem}–{toItem} de {totalItems} jornadas
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}
                    disabled={currentPage <= 1}
                    className="p-2 border border-zinc-200 dark:border-zinc-700 rounded-lg disabled:opacity-40 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                    {currentPage} / {totalPages}
                  </span>
                  <button
                    onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))}
                    disabled={currentPage >= totalPages}
                    className="p-2 border border-zinc-200 dark:border-zinc-700 rounded-lg disabled:opacity-40 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
};

// ─── Sub-componentes ──────────────────────────────────────────────────────────

interface JourneyCardProps {
  journey: Journey;
  isAdmin: boolean;
  deletingId: number | null;
  publishingId: number | null;
  onDetail: () => void;
  onEdit: () => void;
  onPublish: () => void;
  onDelete: () => void;
}

const JourneyCard: React.FC<JourneyCardProps> = ({
  journey, isAdmin, deletingId, publishingId, onDetail, onEdit, onPublish, onDelete,
}) => {
  const isDraft = journey.status === 'draft';
  const isActive = journey.status === 'active';
  const isEnded = journey.status === 'ended';

  const topLevel = journey.levels.length > 0
    ? journey.levels[journey.levels.length - 1]
    : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white dark:bg-zinc-900 p-6 rounded-2xl shadow-sm border border-zinc-100 dark:border-zinc-800 hover:shadow-md transition-all duration-200"
    >
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Left: Icon + Info */}
        <div className="flex items-start gap-4 flex-1 min-w-0">
          {/* Ícone do nível mais alto com a cor */}
          <div
            className="p-3 rounded-xl shrink-0 flex items-center justify-center text-2xl w-14 h-14 border-2"
            style={topLevel?.color ? {
              backgroundColor: `${topLevel.color}20`,
              borderColor: topLevel.color,
            } : {
              backgroundColor: undefined,
              borderColor: 'transparent',
            }}
          >
            {topLevel ? topLevel.icon : <Map className="w-6 h-6 text-primary-600 dark:text-primary-400" />}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={onDetail}
                className="font-bold text-lg text-zinc-900 dark:text-white hover:text-primary-600 dark:hover:text-primary-400 transition-colors text-left"
              >
                {journey.name}
              </button>
              <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${statusColors[journey.status]}`}>
                {statusLabels[journey.status].toUpperCase()}
              </span>
            </div>

            {journey.description && (
              <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5 truncate">{journey.description}</p>
            )}

            <div className="flex flex-wrap gap-4 mt-2 text-sm">
              <div className="flex items-center gap-1.5 text-zinc-600 dark:text-zinc-400">
                <Calendar size={14} className="text-primary-500" />
                <span>{formatDate(journey.start_date)} — {formatDate(journey.end_date)}</span>
              </div>

              {(journey.stats?.participants_count ?? 0) > 0 && (
                <div className="flex items-center gap-1.5 text-zinc-600 dark:text-zinc-400">
                  <Users size={14} className="text-purple-500" />
                  <span>{journey.stats!.participants_count} participantes</span>
                </div>
              )}

              {(journey.stats?.average_xp ?? 0) > 0 && (
                <div className="flex items-center gap-1.5 text-zinc-600 dark:text-zinc-400">
                  <TrendingUp size={14} className="text-green-500" />
                  <span>XP médio: {Math.round(journey.stats!.average_xp)}</span>
                </div>
              )}

              <div className="flex items-center gap-1.5 text-zinc-600 dark:text-zinc-400">
                <BarChart3 size={14} className="text-amber-500" />
                <span>{journey.levels.length} níveis</span>
              </div>
            </div>

            {/* Níveis como badges */}
            {journey.levels.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {journey.levels.map(l => (
                  <span
                    key={l.id}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border"
                    style={{
                      backgroundColor: l.color ? `${l.color}18` : '#f4f4f5',
                      borderColor: l.color ?? '#e4e4e7',
                      color: l.color ?? '#71717a',
                    }}
                  >
                    {l.icon} {l.name}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right: Actions */}
        {isAdmin && (
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={onDetail}
              className="p-2 text-zinc-400 hover:text-primary-600 dark:hover:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-lg transition-colors"
              title="Ver detalhes"
            >
              <BarChart3 size={18} />
            </button>

            {isDraft && (
              <>
                <button
                  onClick={onPublish}
                  disabled={publishingId === journey.id}
                  className="p-2 text-zinc-400 hover:text-green-600 dark:hover:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-colors disabled:opacity-50"
                  title="Publicar jornada"
                >
                  {publishingId === journey.id ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                </button>
                <button
                  onClick={onEdit}
                  className="p-2 text-zinc-400 hover:text-primary-600 dark:hover:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-lg transition-colors"
                  title="Editar"
                >
                  <Edit2 size={18} />
                </button>
                <button
                  onClick={onDelete}
                  disabled={deletingId === journey.id}
                  className="p-2 text-zinc-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors disabled:opacity-50"
                  title="Excluir"
                >
                  {deletingId === journey.id ? <Loader2 size={18} className="animate-spin" /> : <Trash2 size={18} />}
                </button>
              </>
            )}

            {(isActive || isEnded) && (
              <button
                onClick={onEdit}
                className="p-2 text-zinc-400 hover:text-zinc-600 hover:bg-zinc-50 dark:hover:bg-zinc-800 rounded-lg transition-colors"
                title="Visualizar (somente leitura)"
              >
                <Edit2 size={18} />
              </button>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
};

interface StatCardProps {
  label: string;
  value: number | string;
  icon: React.ReactNode;
}

const StatCard: React.FC<StatCardProps> = ({ label, value, icon }) => (
  <div className="bg-zinc-50 dark:bg-zinc-800 rounded-xl p-3 border border-zinc-200 dark:border-zinc-700">
    <div className="flex items-center gap-2 text-zinc-500 dark:text-zinc-400 mb-1 text-xs font-medium">
      {icon}
      <span>{label}</span>
    </div>
    <p className="text-lg font-bold text-zinc-900 dark:text-white">{value}</p>
  </div>
);
