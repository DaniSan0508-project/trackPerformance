import React, { useState, useEffect, useCallback } from 'react';
import { X, ChevronRight, ChevronLeft, Plus, Trash2, Check, Search, Loader2, Trophy, Star, Zap, Flag, Crown, Medal, Shield, Target, Rocket, Heart, Diamond, Gift as GiftIcon, ArrowUp, ArrowDown, Save } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { Journey, JourneyPayload, JourneyLevelPayload, User, Reward, Campaign } from '../../types';
import { journeysService, usersService, rewardsService, campaignsService } from '../../services';

// ─── Biblioteca de ícones disponíveis para os níveis ─────────────────────────

const LEVEL_ICONS = [
  { value: '🥉', label: 'Bronze' },
  { value: '🥈', label: 'Prata' },
  { value: '🥇', label: 'Ouro' },
  { value: '🏆', label: 'Troféu' },
  { value: '⭐', label: 'Estrela' },
  { value: '🌟', label: 'Estrela Brilhante' },
  { value: '⚡', label: 'Raio' },
  { value: '🚀', label: 'Foguete' },
  { value: '💎', label: 'Diamante' },
  { value: '👑', label: 'Coroa' },
  { value: '🎯', label: 'Alvo' },
  { value: '🔥', label: 'Fogo' },
  { value: '🏅', label: 'Medalha' },
  { value: '🌙', label: 'Lua' },
  { value: '☀️', label: 'Sol' },
  { value: '🦋', label: 'Borboleta' },
  { value: '🦅', label: 'Águia' },
  { value: '💪', label: 'Força' },
  { value: '🎖️', label: 'Distinção' },
  { value: '🌈', label: 'Arco-íris' },
  { value: '🔮', label: 'Cristal' },
  { value: '⚔️', label: 'Espada' },
  { value: '🛡️', label: 'Escudo' },
  { value: '🗝️', label: 'Chave' },
];

const LEVEL_COLORS = [
  { value: '#CD7F32', label: 'Bronze' },
  { value: '#C0C0C0', label: 'Prata' },
  { value: '#FFD700', label: 'Ouro' },
  { value: '#E5E4E2', label: 'Platina' },
  { value: '#50C878', label: 'Esmeralda' },
  { value: '#0077B6', label: 'Safira' },
  { value: '#9B5DE5', label: 'Ametista' },
  { value: '#EF476F', label: 'Rubi' },
  { value: '#F77F00', label: 'Laranja' },
  { value: '#06D6A0', label: 'Turquesa' },
];

const DEFAULT_LEVELS: JourneyLevelPayload[] = [
  { position: 1, name: 'Iniciante', icon: '🥉', color: '#CD7F32', xp_threshold: 0 },
  { position: 2, name: 'Destaque', icon: '🥇', color: '#FFD700', xp_threshold: 100 },
];

// ─── Tipos locais ──────────────────────────────────────────────────────────────

interface LevelPayloadWithColor extends JourneyLevelPayload {
  color?: string | null;
}

interface WizardFormData {
  name: string;
  description: string;
  start_date: string;
  end_date: string;
  coins_factor: number;
  audience_ids: number[];
  prize_reward_id: number | null;
  campaign_ids: number[];
  levels: LevelPayloadWithColor[];
}

interface JourneyWizardProps {
  isOpen: boolean;
  editingJourney: Journey | null;
  onClose: () => void;
  onSaved: () => void;
}

function useDebounce<T>(value: T, delay: number): T {
  const [dv, setDv] = useState<T>(value);
  useEffect(() => {
    const t = setTimeout(() => setDv(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return dv;
}

// ─── Componente principal ─────────────────────────────────────────────────────

export const JourneyWizard: React.FC<JourneyWizardProps> = ({ isOpen, editingJourney, onClose, onSaved }) => {
  const { token, coinName } = useAuth();
  const { addToast } = useToast();

  const isReadOnly = !!editingJourney && editingJourney.status !== 'draft';

  const [currentStep, setCurrentStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // ── Dados do formulário ──────────────────────────────────────────────────────
  const [formData, setFormData] = useState<WizardFormData>({
    name: '',
    description: '',
    start_date: '',
    end_date: '',
    coins_factor: 10,
    audience_ids: [],
    prize_reward_id: null,
    campaign_ids: [],
    levels: DEFAULT_LEVELS,
  });

  // ── Dados auxiliares ─────────────────────────────────────────────────────────
  const [users, setUsers] = useState<User[]>([]);
  const [userSearch, setUserSearch] = useState('');
  const debouncedUserSearch = useDebounce(userSearch, 500);
  const [usersPage, setUsersPage] = useState(1);
  const [usersTotalPages, setUsersTotalPages] = useState(1);
  const [loadingUsers, setLoadingUsers] = useState(false);

  const [rewards, setRewards] = useState<Reward[]>([]);
  const [rewardSearch, setRewardSearch] = useState('');
  const debouncedRewardSearch = useDebounce(rewardSearch, 500);
  const [loadingRewards, setLoadingRewards] = useState(false);

  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loadingCampaigns, setLoadingCampaigns] = useState(false);

  // ── Estado de nível em edição ─────────────────────────────────────────────
  const [editingLevelIndex, setEditingLevelIndex] = useState<number | null>(null);
  const [showIconPicker, setShowIconPicker] = useState(false);

  // ── Inicializar formulário ───────────────────────────────────────────────────
  useEffect(() => {
    if (!isOpen) return;
    setCurrentStep(0);
    setErrors({});
    setUserSearch('');
    setRewardSearch('');

    if (editingJourney) {
      const levels: LevelPayloadWithColor[] = editingJourney.levels.map(l => ({
        position: l.position,
        name: l.name,
        icon: l.icon,
        color: l.color ?? null,
        xp_threshold: l.xp_threshold,
      }));
      setFormData({
        name: editingJourney.name,
        description: editingJourney.description ?? '',
        start_date: editingJourney.start_date?.split('T')[0] ?? '',
        end_date: editingJourney.end_date?.split('T')[0] ?? '',
        coins_factor: editingJourney.coins_factor,
        audience_ids: editingJourney.audience_ids ?? [],
        prize_reward_id: editingJourney.prize_reward_id ?? null,
        campaign_ids: editingJourney.campaigns.map(c => c.id),
        levels,
      });
    } else {
      setFormData({
        name: '',
        description: '',
        start_date: '',
        end_date: '',
        coins_factor: 10,
        audience_ids: [],
        prize_reward_id: null,
        campaign_ids: [],
        levels: DEFAULT_LEVELS,
      });
    }
  }, [isOpen, editingJourney]);

  // ── Buscar usuários ──────────────────────────────────────────────────────────
  const fetchUsers = useCallback(async (page = 1, search = '') => {
    if (!token) return;
    setLoadingUsers(true);
    try {
      // Filtra apenas colaboradores (user_type_id !== 1 = não admin)
      const params = new URLSearchParams();
      params.append('page', page.toString());
      params.append('per_page', '10');
      params.append('filter[user_type_id]', '2');
      if (search) params.append('filter[name]', search);
      const resp = await usersService.getUsers(token, page, search);
      // Filtra admins no client-side também
      const filtered = (resp.data || []).filter((u: User) => u.user_type_id !== 1);
      setUsers(filtered);
      setUsersTotalPages(resp.meta?.last_page || resp.last_page || 1);
      setUsersPage(resp.meta?.current_page || resp.current_page || 1);
    } catch (err) {
      console.error('Error fetching users', err);
    } finally {
      setLoadingUsers(false);
    }
  }, [token]);

  useEffect(() => {
    if (isOpen && currentStep === 1) {
      fetchUsers(1, debouncedUserSearch);
    }
  }, [isOpen, currentStep, debouncedUserSearch, fetchUsers]);

  // ── Buscar recompensas e campanhas na etapa 3 ────────────────────────────────
  const fetchRewards = useCallback(async (search = '') => {
    if (!token) return;
    setLoadingRewards(true);
    try {
      const resp = await rewardsService.getCampaignRewards(token, 1, search);
      setRewards(resp.data || []);
    } catch (err) {
      console.error('Error fetching rewards', err);
    } finally {
      setLoadingRewards(false);
    }
  }, [token]);

  const fetchCampaigns = useCallback(async () => {
    if (!token) return;
    setLoadingCampaigns(true);
    try {
      const resp = await campaignsService.getCampaigns(token, 1, '', { is_active: 'active' });
      setCampaigns(resp.data || []);
    } catch (err) {
      console.error('Error fetching campaigns', err);
    } finally {
      setLoadingCampaigns(false);
    }
  }, [token]);

  useEffect(() => {
    if (isOpen && currentStep === 3) {
      fetchRewards(debouncedRewardSearch);
      if (campaigns.length === 0) fetchCampaigns();
    }
  }, [isOpen, currentStep, debouncedRewardSearch]);

  // ── Validações por etapa ─────────────────────────────────────────────────────
  const validateStep = (step: number): boolean => {
    const errs: Record<string, string> = {};

    if (step === 0) {
      if (!formData.name.trim()) errs.name = 'Nome é obrigatório.';
      if (formData.name.trim().length > 100) errs.name = 'Nome deve ter no máximo 100 caracteres.';
      if (!formData.start_date) errs.start_date = 'Data de início é obrigatória.';
      if (!formData.end_date) errs.end_date = 'Data de fim é obrigatória.';
      if (formData.start_date && formData.end_date && formData.end_date <= formData.start_date) {
        errs.end_date = 'Data de fim deve ser posterior à data de início.';
      }
      if (formData.coins_factor < 1) errs.coins_factor = 'Fator de conversão deve ser >= 1.';
    }

    if (step === 2) {
      if (formData.levels.length < 2) errs.levels = 'Adicione pelo menos 2 níveis.';
      if (formData.levels[0]?.xp_threshold !== 0) errs.levels = 'O primeiro nível deve ter limiar de XP = 0.';
      for (let i = 1; i < formData.levels.length; i++) {
        if (formData.levels[i].xp_threshold <= formData.levels[i - 1].xp_threshold) {
          errs.levels = 'Os limiares de XP devem ser estritamente crescentes.';
          break;
        }
      }
      formData.levels.forEach((l, i) => {
        if (!l.name.trim()) errs[`level_${i}_name`] = `Nome do nível ${i + 1} é obrigatório.`;
        if (!l.icon) errs[`level_${i}_icon`] = `Ícone do nível ${i + 1} é obrigatório.`;
      });
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(s => Math.min(s + 1, 3));
    }
  };

  const handleBack = () => setCurrentStep(s => Math.max(s - 1, 0));

  // ── Salvar ───────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!validateStep(currentStep) || !token) return;
    setSaving(true);
    try {
      const payload: JourneyPayload = {
        name: formData.name.trim(),
        description: formData.description.trim() || null,
        start_date: formData.start_date,
        end_date: formData.end_date,
        coins_factor: formData.coins_factor,
        audience_ids: formData.audience_ids.length > 0 ? formData.audience_ids : null,
        prize_reward_id: formData.prize_reward_id,
        campaign_ids: formData.campaign_ids,
        levels: formData.levels.map((l, i) => ({
          position: i + 1,
          name: l.name.trim(),
          icon: l.icon,
          color: l.color ?? null,
          xp_threshold: l.xp_threshold,
        })),
      };

      if (editingJourney) {
        await journeysService.updateJourney(token, editingJourney.id, payload);
        addToast('success', 'Jornada atualizada com sucesso!');
      } else {
        await journeysService.createJourney(token, payload);
        addToast('success', 'Jornada criada com sucesso!');
      }
      onSaved();
    } catch (err: any) {
      if (err.fieldErrors) {
        const mapped: Record<string, string> = {};
        Object.entries(err.fieldErrors).forEach(([k, v]) => {
          mapped[k] = Array.isArray(v) ? (v as string[])[0] : String(v);
        });
        setErrors(mapped);
        addToast('error', 'Corrija os erros antes de salvar.');
      } else {
        addToast('error', err.message || 'Erro ao salvar jornada.');
      }
    } finally {
      setSaving(false);
    }
  };

  // ── Helpers de nível ─────────────────────────────────────────────────────────
  const addLevel = () => {
    const lastXp = formData.levels[formData.levels.length - 1]?.xp_threshold ?? 0;
    const newLevel: LevelPayloadWithColor = {
      position: formData.levels.length + 1,
      name: '',
      icon: '⭐',
      color: '#C0C0C0',
      xp_threshold: lastXp + 100,
    };
    setFormData(f => ({ ...f, levels: [...f.levels, newLevel] }));
  };

  const removeLevel = (index: number) => {
    if (formData.levels.length <= 2) {
      addToast('warning', 'A jornada precisa de pelo menos 2 níveis.');
      return;
    }
    setFormData(f => ({
      ...f,
      levels: f.levels.filter((_, i) => i !== index).map((l, i) => ({ ...l, position: i + 1 })),
    }));
  };

  const moveLevelUp = (index: number) => {
    if (index === 0) return;
    setFormData(f => {
      const levels = [...f.levels];
      [levels[index - 1], levels[index]] = [levels[index], levels[index - 1]];
      return { ...f, levels: levels.map((l, i) => ({ ...l, position: i + 1 })) };
    });
  };

  const moveLevelDown = (index: number) => {
    if (index === formData.levels.length - 1) return;
    setFormData(f => {
      const levels = [...f.levels];
      [levels[index], levels[index + 1]] = [levels[index + 1], levels[index]];
      return { ...f, levels: levels.map((l, i) => ({ ...l, position: i + 1 })) };
    });
  };

  const updateLevel = (index: number, field: keyof LevelPayloadWithColor, value: any) => {
    setFormData(f => {
      const levels = [...f.levels];
      levels[index] = { ...levels[index], [field]: value };
      if (index === 0 && field === 'xp_threshold') levels[0].xp_threshold = 0;
      return { ...f, levels };
    });
  };

  const toggleUser = (userId: number) => {
    setFormData(f => ({
      ...f,
      audience_ids: f.audience_ids.includes(userId)
        ? f.audience_ids.filter(id => id !== userId)
        : [...f.audience_ids, userId],
    }));
  };

  const toggleCampaign = (campaignId: number) => {
    setFormData(f => ({
      ...f,
      campaign_ids: f.campaign_ids.includes(campaignId)
        ? f.campaign_ids.filter(id => id !== campaignId)
        : [...f.campaign_ids, campaignId],
    }));
  };

  // ── Previsão de XP ────────────────────────────────────────────────────────────
  const xpPreview = (coins: number) => Math.floor(coins / formData.coins_factor);

  if (!isOpen) return null;

  const steps = ['Informações', 'Participantes', 'Níveis', 'Prêmio & Revisão'];

  return (
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
            <h2 className="text-xl font-bold text-zinc-900 dark:text-white">
              {editingJourney ? 'Editar Jornada' : 'Nova Jornada'}
            </h2>
            {isReadOnly && (
              <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5">
                Jornada publicada — somente leitura
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-2 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Step indicators */}
        <div className="px-6 pt-4 pb-2">
          <div className="flex items-center gap-1">
            {steps.map((step, i) => (
              <React.Fragment key={i}>
                <button
                  onClick={() => i < currentStep && setCurrentStep(i)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                    i === currentStep
                      ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400'
                      : i < currentStep
                      ? 'text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/20 cursor-pointer'
                      : 'text-zinc-400 dark:text-zinc-600 cursor-default'
                  }`}
                >
                  <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${
                    i < currentStep ? 'bg-primary-600 text-white' : i === currentStep ? 'bg-primary-600 text-white' : 'bg-zinc-200 dark:bg-zinc-700 text-zinc-500'
                  }`}>
                    {i < currentStep ? <Check size={10} /> : i + 1}
                  </span>
                  <span className="hidden sm:inline">{step}</span>
                </button>
                {i < steps.length - 1 && (
                  <div className={`flex-1 h-0.5 ${i < currentStep ? 'bg-primary-500' : 'bg-zinc-200 dark:bg-zinc-700'}`} />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          <AnimatePresence mode="wait">
            {/* ── Etapa 1: Informações básicas ─────────────────────────────── */}
            {currentStep === 0 && (
              <motion.div key="step0" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                    Nome da Jornada <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    maxLength={100}
                    disabled={isReadOnly}
                    value={formData.name}
                    onChange={e => setFormData(f => ({ ...f, name: e.target.value }))}
                    className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:opacity-60"
                    placeholder="Ex: Jornada de Vendas Q2"
                  />
                  {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Descrição</label>
                  <textarea
                    maxLength={500}
                    rows={3}
                    disabled={isReadOnly}
                    value={formData.description}
                    onChange={e => setFormData(f => ({ ...f, description: e.target.value }))}
                    className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none disabled:opacity-60"
                    placeholder="Descrição opcional da jornada..."
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                      Data de Início <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      disabled={isReadOnly}
                      value={formData.start_date}
                      onChange={e => setFormData(f => ({ ...f, start_date: e.target.value }))}
                      className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:opacity-60"
                    />
                    {errors.start_date && <p className="text-xs text-red-500 mt-1">{errors.start_date}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                      Data de Fim <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      disabled={isReadOnly}
                      value={formData.end_date}
                      onChange={e => setFormData(f => ({ ...f, end_date: e.target.value }))}
                      className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:opacity-60"
                    />
                    {errors.end_date && <p className="text-xs text-red-500 mt-1">{errors.end_date}</p>}
                  </div>
                </div>

                {/* Fator de conversão */}
                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                    Fator de Conversão ({coinName || 'coins'} → XP) <span className="text-red-500">*</span>
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="range"
                      min={1}
                      max={50}
                      disabled={isReadOnly}
                      value={formData.coins_factor}
                      onChange={e => setFormData(f => ({ ...f, coins_factor: parseInt(e.target.value) }))}
                      className="flex-1 accent-primary-600 disabled:opacity-60"
                    />
                    <input
                      type="number"
                      min={1}
                      max={9999}
                      disabled={isReadOnly}
                      value={formData.coins_factor}
                      onChange={e => setFormData(f => ({ ...f, coins_factor: Math.max(1, parseInt(e.target.value) || 1) }))}
                      className="w-20 px-2 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white text-center focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:opacity-60"
                    />
                  </div>
                  {errors.coins_factor && <p className="text-xs text-red-500 mt-1">{errors.coins_factor}</p>}
                  <div className="mt-2 p-3 bg-primary-50 dark:bg-primary-900/20 rounded-lg text-sm text-primary-700 dark:text-primary-400">
                    <span className="font-semibold">Preview:</span>{' '}
                    100 {coinName || 'coins'} = {xpPreview(100)} XP &nbsp;|&nbsp;
                    500 {coinName || 'coins'} = {xpPreview(500)} XP &nbsp;|&nbsp;
                    1.000 {coinName || 'coins'} = {xpPreview(1000)} XP
                  </div>
                </div>
              </motion.div>
            )}

            {/* ── Etapa 2: Participantes ────────────────────────────────────── */}
            {currentStep === 1 && (
              <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-semibold text-zinc-900 dark:text-white">Selecionar Participantes</h3>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400">
                      Deixe em branco para incluir todos os colaboradores.
                    </p>
                  </div>
                  {formData.audience_ids.length > 0 && (
                    <span className="text-xs font-semibold bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400 px-2.5 py-1 rounded-full">
                      {formData.audience_ids.length} selecionados
                    </span>
                  )}
                </div>

                <div className="relative">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                  <input
                    type="text"
                    placeholder="Buscar por nome..."
                    value={userSearch}
                    onChange={e => { setUserSearch(e.target.value); setUsersPage(1); }}
                    className="w-full pl-9 pr-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>

                {loadingUsers ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 size={24} className="animate-spin text-primary-600" />
                  </div>
                ) : (
                  <>
                    <div className="space-y-1 max-h-64 overflow-y-auto border border-zinc-200 dark:border-zinc-700 rounded-lg divide-y divide-zinc-100 dark:divide-zinc-800">
                      {users.length === 0 ? (
                        <p className="text-sm text-zinc-500 p-4 text-center">Nenhum colaborador encontrado.</p>
                      ) : (
                        users.map(user => (
                          <label
                            key={user.id}
                            className="flex items-center gap-3 px-3 py-2.5 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 cursor-pointer"
                          >
                            <input
                              type="checkbox"
                              checked={formData.audience_ids.includes(user.id)}
                              onChange={() => toggleUser(user.id)}
                              disabled={isReadOnly}
                              className="rounded accent-primary-600"
                            />
                            <div className="w-8 h-8 bg-primary-100 dark:bg-primary-900/30 rounded-full flex items-center justify-center text-primary-700 dark:text-primary-400 font-bold text-sm shrink-0">
                              {user.profile_image_url ? (
                                <img src={user.profile_image_url} className="w-full h-full rounded-full object-cover" alt={user.name} />
                              ) : user.name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p className="text-sm font-medium text-zinc-900 dark:text-white">{user.name}</p>
                              <p className="text-xs text-zinc-500 dark:text-zinc-400">{user.email}</p>
                            </div>
                          </label>
                        ))
                      )}
                    </div>

                    {/* Paginação */}
                    {usersTotalPages > 1 && (
                      <div className="flex items-center justify-between text-sm">
                        <button
                          onClick={() => fetchUsers(usersPage - 1, debouncedUserSearch)}
                          disabled={usersPage <= 1}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 disabled:opacity-40 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
                        >
                          <ChevronLeft size={14} /> Anterior
                        </button>
                        <span className="text-zinc-500 dark:text-zinc-400">
                          Página {usersPage} de {usersTotalPages}
                        </span>
                        <button
                          onClick={() => fetchUsers(usersPage + 1, debouncedUserSearch)}
                          disabled={usersPage >= usersTotalPages}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 disabled:opacity-40 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
                        >
                          Próxima <ChevronRight size={14} />
                        </button>
                      </div>
                    )}
                  </>
                )}
              </motion.div>
            )}

            {/* ── Etapa 3: Níveis ──────────────────────────────────────────── */}
            {currentStep === 2 && (
              <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-semibold text-zinc-900 dark:text-white">Configurar Níveis</h3>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400">Mínimo 2 níveis. O primeiro nível sempre começa com 0 XP.</p>
                  </div>
                  {!isReadOnly && (
                    <button
                      onClick={addLevel}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 transition-colors"
                    >
                      <Plus size={14} /> Adicionar
                    </button>
                  )}
                </div>

                {errors.levels && (
                  <p className="text-sm text-red-500 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-lg">{errors.levels}</p>
                )}

                <div className="space-y-3">
                  {formData.levels.map((level, index) => (
                    <div key={index} className="border border-zinc-200 dark:border-zinc-700 rounded-xl p-4 space-y-3">
                      {/* Header do nível */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {/* Preview do ícone com cor */}
                          <div
                            className="w-10 h-10 rounded-full flex items-center justify-center text-xl shadow-sm border-2"
                            style={{
                              backgroundColor: level.color ? `${level.color}20` : '#f4f4f5',
                              borderColor: level.color ?? '#e4e4e7',
                            }}
                          >
                            {level.icon || '⭐'}
                          </div>
                          <span className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                            Nível {index + 1}{level.name ? ` — ${level.name}` : ''}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          {!isReadOnly && (
                            <>
                              <button onClick={() => moveLevelUp(index)} disabled={index === 0} className="p-1 text-zinc-400 hover:text-zinc-600 disabled:opacity-30">
                                <ArrowUp size={14} />
                              </button>
                              <button onClick={() => moveLevelDown(index)} disabled={index === formData.levels.length - 1} className="p-1 text-zinc-400 hover:text-zinc-600 disabled:opacity-30">
                                <ArrowDown size={14} />
                              </button>
                              <button onClick={() => removeLevel(index)} className="p-1 text-red-400 hover:text-red-600">
                                <Trash2 size={14} />
                              </button>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Campos */}
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">
                            Nome <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            maxLength={80}
                            disabled={isReadOnly}
                            value={level.name}
                            onChange={e => updateLevel(index, 'name', e.target.value)}
                            className="w-full px-2.5 py-1.5 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:opacity-60"
                            placeholder="Ex: Bronze"
                          />
                          {errors[`level_${index}_name`] && <p className="text-xs text-red-500 mt-0.5">{errors[`level_${index}_name`]}</p>}
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">
                            Limiar de XP {index === 0 && <span className="text-zinc-400">(fixo: 0)</span>}
                          </label>
                          <input
                            type="number"
                            min={index === 0 ? 0 : 1}
                            disabled={isReadOnly || index === 0}
                            value={level.xp_threshold}
                            onChange={e => updateLevel(index, 'xp_threshold', parseInt(e.target.value) || 0)}
                            className="w-full px-2.5 py-1.5 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:opacity-60"
                          />
                        </div>
                      </div>

                      {/* Ícone e cor */}
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">
                            Ícone <span className="text-red-500">*</span>
                          </label>
                          <div className="flex flex-wrap gap-1.5 border border-zinc-200 dark:border-zinc-700 rounded-lg p-2 bg-zinc-50 dark:bg-zinc-800/50">
                            {LEVEL_ICONS.map(ic => (
                              <button
                                key={ic.value}
                                type="button"
                                disabled={isReadOnly}
                                onClick={() => updateLevel(index, 'icon', ic.value)}
                                title={ic.label}
                                className={`text-lg w-8 h-8 flex items-center justify-center rounded-lg transition-all ${
                                  level.icon === ic.value
                                    ? 'bg-primary-100 dark:bg-primary-900/40 ring-2 ring-primary-500'
                                    : 'hover:bg-zinc-200 dark:hover:bg-zinc-700'
                                } disabled:opacity-60`}
                              >
                                {ic.value}
                              </button>
                            ))}
                          </div>
                          {errors[`level_${index}_icon`] && <p className="text-xs text-red-500 mt-0.5">{errors[`level_${index}_icon`]}</p>}
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">Cor do Badge</label>
                          <div className="flex flex-wrap gap-2 border border-zinc-200 dark:border-zinc-700 rounded-lg p-2 bg-zinc-50 dark:bg-zinc-800/50">
                            {LEVEL_COLORS.map(c => (
                              <button
                                key={c.value}
                                type="button"
                                disabled={isReadOnly}
                                onClick={() => updateLevel(index, 'color', c.value)}
                                title={c.label}
                                className={`w-7 h-7 rounded-full transition-all border-2 ${
                                  level.color === c.value ? 'border-zinc-900 dark:border-white scale-110' : 'border-transparent hover:scale-105'
                                } disabled:opacity-60`}
                                style={{ backgroundColor: c.value }}
                              />
                            ))}
                          </div>
                          {/* Preview com cor */}
                          <div className="mt-2 flex items-center gap-2 text-xs text-zinc-500">
                            <span>Preview:</span>
                            <div
                              className="w-8 h-8 rounded-full flex items-center justify-center text-base border-2 shadow-sm"
                              style={{
                                backgroundColor: level.color ? `${level.color}25` : '#f4f4f5',
                                borderColor: level.color ?? '#e4e4e7',
                              }}
                            >
                              {level.icon || '⭐'}
                            </div>
                            {level.name && (
                              <span
                                className="px-2 py-0.5 rounded-full text-xs font-semibold"
                                style={{
                                  backgroundColor: level.color ? `${level.color}20` : '#f4f4f5',
                                  color: level.color ?? '#71717a',
                                }}
                              >
                                {level.name}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* ── Etapa 4: Prêmio & Revisão ─────────────────────────────────── */}
            {currentStep === 3 && (
              <motion.div key="step3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-5">
                {/* Seleção de recompensa */}
                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                    Prêmio do Conquistador (opcional)
                  </label>
                  <div className="relative mb-2">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                    <input
                      type="text"
                      placeholder="Buscar recompensa..."
                      value={rewardSearch}
                      onChange={e => setRewardSearch(e.target.value)}
                      disabled={isReadOnly}
                      className="w-full pl-9 pr-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white text-sm focus:ring-2 focus:ring-primary-500 disabled:opacity-60"
                    />
                  </div>
                  {loadingRewards ? (
                    <div className="flex justify-center py-4"><Loader2 size={20} className="animate-spin text-primary-600" /></div>
                  ) : (
                    <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto border border-zinc-200 dark:border-zinc-700 rounded-lg p-2">
                      <label className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800 cursor-pointer col-span-2">
                        <input
                          type="radio"
                          name="reward"
                          checked={formData.prize_reward_id === null}
                          onChange={() => setFormData(f => ({ ...f, prize_reward_id: null }))}
                          disabled={isReadOnly}
                          className="accent-primary-600"
                        />
                        <span className="text-sm text-zinc-500 italic">Sem prêmio vinculado</span>
                      </label>
                      {rewards.map(r => (
                        <label key={r.id} className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800 cursor-pointer">
                          <input
                            type="radio"
                            name="reward"
                            checked={formData.prize_reward_id === r.id}
                            onChange={() => setFormData(f => ({ ...f, prize_reward_id: r.id }))}
                            disabled={isReadOnly}
                            className="accent-primary-600"
                          />
                          <span className="text-sm text-zinc-900 dark:text-white">{r.name}</span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>

                {/* Campanhas vinculadas */}
                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                    Campanhas Vinculadas (opcional)
                  </label>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-2">
                    Se vinculadas, apenas coins dessas campanhas contam para XP.
                  </p>
                  {loadingCampaigns ? (
                    <div className="flex justify-center py-4"><Loader2 size={20} className="animate-spin text-primary-600" /></div>
                  ) : (
                    <div className="space-y-1 max-h-36 overflow-y-auto border border-zinc-200 dark:border-zinc-700 rounded-lg p-2">
                      {campaigns.length === 0 ? (
                        <p className="text-sm text-zinc-500 p-2 text-center">Nenhuma campanha ativa.</p>
                      ) : (
                        campaigns.map(c => (
                          <label key={c.id} className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={formData.campaign_ids.includes(c.id)}
                              onChange={() => toggleCampaign(c.id)}
                              disabled={isReadOnly}
                              className="rounded accent-primary-600"
                            />
                            <span className="text-sm text-zinc-900 dark:text-white">{c.name}</span>
                          </label>
                        ))
                      )}
                    </div>
                  )}
                </div>

                {/* Resumo */}
                <div className="bg-zinc-50 dark:bg-zinc-800 rounded-xl p-4 space-y-3 border border-zinc-200 dark:border-zinc-700">
                  <h4 className="text-sm font-semibold text-zinc-900 dark:text-white">📋 Resumo da Jornada</h4>
                  <div className="space-y-1.5 text-sm text-zinc-600 dark:text-zinc-400">
                    <div><span className="font-medium text-zinc-900 dark:text-white">Nome:</span> {formData.name || '—'}</div>
                    <div><span className="font-medium text-zinc-900 dark:text-white">Período:</span> {formData.start_date || '—'} até {formData.end_date || '—'}</div>
                    <div><span className="font-medium text-zinc-900 dark:text-white">Fator de conversão:</span> {formData.coins_factor} coins = 1 XP</div>
                    <div><span className="font-medium text-zinc-900 dark:text-white">Participantes:</span> {formData.audience_ids.length > 0 ? `${formData.audience_ids.length} selecionados` : 'Todos os colaboradores'}</div>
                    <div><span className="font-medium text-zinc-900 dark:text-white">Níveis:</span> {formData.levels.length} níveis configurados</div>
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      {formData.levels.map((l, i) => (
                        <span
                          key={i}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium"
                          style={{
                            backgroundColor: l.color ? `${l.color}20` : '#f4f4f5',
                            color: l.color ?? '#71717a',
                          }}
                        >
                          {l.icon} {l.name || `Nível ${i + 1}`} ({l.xp_threshold} XP)
                        </span>
                      ))}
                    </div>
                    {formData.prize_reward_id && (
                      <div>
                        <span className="font-medium text-zinc-900 dark:text-white">Prêmio:</span>{' '}
                        {rewards.find(r => r.id === formData.prize_reward_id)?.name ?? `ID ${formData.prize_reward_id}`}
                      </div>
                    )}
                    {formData.campaign_ids.length > 0 && (
                      <div>
                        <span className="font-medium text-zinc-900 dark:text-white">Campanhas:</span>{' '}
                        {formData.campaign_ids.map(id => campaigns.find(c => c.id === id)?.name ?? id).join(', ')}
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-zinc-200 dark:border-zinc-800">
          <button
            onClick={handleBack}
            disabled={currentStep === 0}
            className="flex items-center gap-2 px-4 py-2 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors disabled:opacity-40 text-sm font-medium"
          >
            <ChevronLeft size={16} /> Voltar
          </button>

          <div className="flex items-center gap-2">
            {!isReadOnly && (
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 px-4 py-2 border border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 rounded-lg transition-colors text-sm font-medium disabled:opacity-60"
              >
                {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                Salvar rascunho
              </button>
            )}

            {currentStep < 3 ? (
              <button
                onClick={handleNext}
                className="flex items-center gap-2 px-5 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors text-sm font-medium"
              >
                Próximo <ChevronRight size={16} />
              </button>
            ) : (
              !isReadOnly && (
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex items-center gap-2 px-5 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors text-sm font-medium disabled:opacity-60"
                >
                  {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                  {editingJourney ? 'Atualizar' : 'Criar Jornada'}
                </button>
              )
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
};
