import React, { useState, useEffect, useCallback, useRef } from 'react';
import { X, ChevronRight, ChevronLeft, Plus, Trash2, Check, Search, Loader2, Trophy, Star, Zap, Flag, Crown, Medal, Shield, Target, Rocket, Heart, Diamond, Gift as GiftIcon, ArrowUp, ArrowDown, Save, Calendar } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { Journey, JourneyPayload, JourneyLevelPayload, User, Reward, Campaign, Role } from '../../types';
import { journeysService, usersService, rewardsService, campaignsService, rolesService } from '../../services';
import { getFullImageUrl } from '../../utils';

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

function formatDateBR(isoDate: string): string {
  if (!isoDate) return '—';
  const [y, m, d] = isoDate.split('-');
  return `${d}/${m}/${y}`;
}

function countDays(start: string, end: string): number | null {
  if (!start || !end) return null;
  const diff = new Date(end).getTime() - new Date(start).getTime();
  return Math.round(diff / (1000 * 60 * 60 * 24)) + 1;
}

function getTodayISO(): string {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// ─── Componente principal ─────────────────────────────────────────────────────

// Utility to sanitize coin inputs
const sanitizeCoinValue = (value: string): number => {
  // Remove tudo que não for dígito
  const numericValue = value.replace(/\D/g, '');
  // Remove zeros à esquerda
  const noZeros = numericValue.replace(/^0+(?=\d)/, '') || '0';
  // Limita o valor máximo a 999
  const finalValue = parseInt(noZeros);
  return finalValue > 999 ? 999 : (finalValue || 1);
};

export const JourneyWizard: React.FC<JourneyWizardProps> = ({ isOpen, editingJourney, onClose, onSaved }) => {
  const { token, coinName } = useAuth();
  const { addToast } = useToast();

  // Jornadas ativas e draft permitem editar participantes
  const isReadOnly = !!editingJourney && editingJourney.status !== 'draft';
  const isParticipantsEditable = !editingJourney || editingJourney.status === 'draft' || editingJourney.status === 'active';

  const [currentStep, setCurrentStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const wizardBodyRef = useRef<HTMLDivElement>(null);

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
  const [allUsersCache, setAllUsersCache] = useState<User[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [userSearch, setUserSearch] = useState('');
  const debouncedUserSearch = useDebounce(userSearch, 500);
  const [usersPage, setUsersPage] = useState(1);
  const [usersTotalPages, setUsersTotalPages] = useState(1);
  const [loadingUsers, setLoadingUsers] = useState(false);

  // ── Filtro por cargo ─────────────────────────────────────────────────────────
  const [roles, setRoles] = useState<Role[]>([]);
  const [fullySelectedRoles, setFullySelectedRoles] = useState<Set<string>>(new Set());
  const [roleFilterLoading, setRoleFilterLoading] = useState<string | null>(null);

  // ── Usuários já em outras jornadas ──────────────────────────────────────────
  const [enrolledUserIds, setEnrolledUserIds] = useState<Set<number>>(new Set());

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
    setAllUsersCache([]);
    setRoles([]);
    setFullySelectedRoles(new Set());
    setEnrolledUserIds(new Set());

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

  // ── Buscar usuários e roles ─────────────────────────────────────────────────
  const fetchUsers = useCallback(async (page = 1, search = '', cache?: User[]) => {
    const source = cache ?? allUsersCache;
    const filtered = source
      .filter((u: User) => u.user_type_id !== 1)
      .filter((u: User) => !search || u.name.toLowerCase().includes(search.toLowerCase()));
    const perPage = 10;
    const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
    const safePage = Math.min(page, totalPages);
    setUsers(filtered.slice((safePage - 1) * perPage, safePage * perPage));
    setUsersTotalPages(totalPages);
    setUsersPage(safePage);
  }, [allUsersCache]);

  const loadUsersAndRoles = useCallback(async () => {
    if (!token) return;
    setLoadingUsers(true);
    try {
      const [rolesRes, allList, enrolledRes] = await Promise.all([
        rolesService.getAllRoles(token).catch(() => ({ data: [] })),
        usersService.getAllUsersComplete(token).catch(() => []),
        journeysService.getJourneyUsers(token).catch(() => ({ data: [] })),
      ]);
      if (rolesRes.data) setRoles(rolesRes.data);
      const collaborators: User[] = (allList as User[]).filter((u: User) => u.user_type_id !== 1);
      setAllUsersCache(collaborators);

      // Construir set de IDs de usuários já em outras jornadas
      const enrolledItems: any[] = enrolledRes.data ?? [];
      const ownIds = new Set<number>(editingJourney?.audience_ids ?? []);
      const enrolled = new Set<number>(
        enrolledItems
          .map((item: any) => item.id ?? item.user_id ?? item.user?.id)
          .filter((id: any): id is number => typeof id === 'number' && !ownIds.has(id))
      );
      setEnrolledUserIds(enrolled);

      // Calcular quais cargos já estão todos selecionados
      setFullySelectedRoles(() => {
        const next = new Set<string>();
        rolesRes.data?.forEach((r: Role) => {
          const inRole = collaborators.filter(u => u.role === r.description);
          if (inRole.length > 0 && inRole.every(u => formData.audience_ids.includes(u.id))) {
            next.add(r.description);
          }
        });
        return next;
      });
      // paginar localmente
      const perPage = 10;
      const totalPages = Math.max(1, Math.ceil(collaborators.length / perPage));
      setUsers(collaborators.slice(0, perPage));
      setUsersTotalPages(totalPages);
      setUsersPage(1);
    } catch (err) {
      console.error('Error fetching users/roles', err);
    } finally {
      setLoadingUsers(false);
    }
  }, [token, formData.audience_ids, editingJourney]);

  useEffect(() => {
    if (isOpen && currentStep === 1) {
      if (allUsersCache.length === 0) {
        loadUsersAndRoles();
      } else {
        fetchUsers(1, debouncedUserSearch);
      }
    }
  }, [isOpen, currentStep]);

  useEffect(() => {
    if (isOpen && currentStep === 1 && allUsersCache.length > 0) {
      fetchUsers(1, debouncedUserSearch);
    }
  }, [debouncedUserSearch]);

  // ── Selecionar / desselecionar todos de um cargo ─────────────────────────────
  const handleSelectAllByRole = (role: string) => {
    // Apenas usuários disponíveis (não enrolled em outra jornada)
    const roleUsers = allUsersCache.filter(u => u.role === role && !enrolledUserIds.has(u.id));
    if (roleUsers.length === 0) return;
    const allSelected = fullySelectedRoles.has(role);
    setFormData(f => {
      const roleIds = roleUsers.map(u => u.id);
      const newIds = allSelected
        ? f.audience_ids.filter(id => !roleIds.includes(id))
        : [...new Set([...f.audience_ids, ...roleIds])];
      return { ...f, audience_ids: newIds };
    });
    setFullySelectedRoles(prev => {
      const next = new Set(prev);
      if (allSelected) next.delete(role);
      else next.add(role);
      return next;
    });
  };

  // ── Selecionar / desselecionar todos os colaboradores ────────────────────────
  const availableIds = allUsersCache
    .filter(u => !enrolledUserIds.has(u.id))
    .map(u => u.id);
  const allSelected = availableIds.length > 0 && availableIds.every(id => formData.audience_ids.includes(id));

  const handleSelectAll = () => {
    if (allSelected) {
      // Desmarcar todos
      setFormData(f => ({ ...f, audience_ids: f.audience_ids.filter(id => !availableIds.includes(id)) }));
      setFullySelectedRoles(new Set());
    } else {
      // Selecionar todos disponíveis
      setFormData(f => ({ ...f, audience_ids: [...new Set([...f.audience_ids, ...availableIds])] }));
      setFullySelectedRoles(new Set(roles.map(r => r.description)));
    }
  };

  // ── Buscar recompensas e campanhas na etapa 3 ────────────────────────────────
  const fetchRewards = useCallback(async (search = '') => {
    if (!token) return;
    setLoadingRewards(true);
    try {
      if (isReadOnly && formData.prize_reward_id && !search) {
        const resp = await rewardsService.getRewardById(token, formData.prize_reward_id);
        if (resp.data) {
          setRewards([resp.data]);
        } else {
          setRewards([]);
        }
      } else {
        const resp = await rewardsService.getCampaignRewards(token, 1, search);
        setRewards(resp.data || []);
      }
    } catch (err) {
      console.error('Error fetching rewards', err);
    } finally {
      setLoadingRewards(false);
    }
  }, [token, isReadOnly, formData.prize_reward_id]);

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
      // Jornada ativa: apenas sincroniza participantes via rota dedicada
      if (editingJourney && editingJourney.status === 'active') {
        await journeysService.addParticipants(token, editingJourney.id, formData.audience_ids);
        addToast('success', 'Participantes atualizados com sucesso!');
        onSaved();
        return;
      }

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

    // UX: Rolar para o final e focar no input de nome do novo nível
    setTimeout(() => {
      if (wizardBodyRef.current) {
        wizardBodyRef.current.scrollTo({
          top: wizardBodyRef.current.scrollHeight,
          behavior: 'smooth'
        });
      }
      // Pequeno delay para esperar a animação de scroll e renderização
      const inputs = document.querySelectorAll('input[placeholder="Ex: Bronze"]');
      const lastInput = inputs[inputs.length - 1] as HTMLInputElement;
      if (lastInput) lastInput.focus();
    }, 100);
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
                {editingJourney?.status === 'active'
                  ? 'Jornada ativa — apenas participantes podem ser editados'
                  : 'Jornada publicada — somente leitura'}
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
        <div ref={wizardBodyRef} className="flex-1 overflow-y-auto px-6 py-4">
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
                    <div className="relative group cursor-pointer" onClick={(e) => {
                      const input = e.currentTarget.querySelector('input');
                      if (input && 'showPicker' in input) {
                        try { input.showPicker(); } catch (err) { console.error(err); }
                      }
                    }}>
                      <Calendar size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-primary-500 pointer-events-none group-hover:text-primary-600 transition-colors z-10" />
                      <input
                        type="date"
                        min={editingJourney ? undefined : getTodayISO()}
                        disabled={isReadOnly}
                        value={formData.start_date}
                        onChange={e => setFormData(f => ({ ...f, start_date: e.target.value }))}
                        className="w-full pl-9 pr-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:opacity-60 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:inset-0 [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:cursor-pointer"
                      />
                    </div>
                    {errors.start_date && <p className="text-xs text-red-500 mt-1">{errors.start_date}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                      Data de Fim <span className="text-red-500">*</span>
                    </label>
                    <div className="relative group cursor-pointer" onClick={(e) => {
                      const input = e.currentTarget.querySelector('input');
                      if (input && 'showPicker' in input) {
                        try { input.showPicker(); } catch (err) { console.error(err); }
                      }
                    }}>
                      <Calendar size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-primary-500 pointer-events-none group-hover:text-primary-600 transition-colors z-10" />
                      <input
                        type="date"
                        min={formData.start_date || getTodayISO()}
                        disabled={isReadOnly}
                        value={formData.end_date}
                        onChange={e => setFormData(f => ({ ...f, end_date: e.target.value }))}
                        className="w-full pl-9 pr-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:opacity-60 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:inset-0 [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:cursor-pointer"
                      />
                    </div>
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
                      max={100}
                      disabled={isReadOnly}
                      value={formData.coins_factor}
                      onChange={e => setFormData(f => ({ ...f, coins_factor: parseInt(e.target.value) }))}
                      className="flex-1 accent-primary-600 disabled:opacity-60"
                    />
                    <input
                      type="text"
                      inputMode="numeric"
                      disabled={isReadOnly}
                      value={formData.coins_factor}
                      onChange={e => {
                        const val = e.target.value.replace(/\D/g, '');
                        const numericVal = parseInt(val, 10);
                        if (!val) {
                          setFormData(f => ({ ...f, coins_factor: 1 }));
                          return;
                        }
                        const finalValue = numericVal > 999 ? 999 : (numericVal || 1);
                        setFormData(f => ({ ...f, coins_factor: finalValue }));
                      }}
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
                  </div>
                  <div className="flex items-center gap-2">
                    {formData.audience_ids.length > 0 && (
                      <span className="text-xs font-semibold bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400 px-2.5 py-1 rounded-full">
                        {formData.audience_ids.length} selecionados
                      </span>
                    )}
                    {isParticipantsEditable && availableIds.length > 0 && (
                      <button
                        type="button"
                        onClick={handleSelectAll}
                        className={`text-xs font-semibold px-3 py-1.5 rounded-lg border transition-colors ${
                          allSelected
                            ? 'bg-primary-50 dark:bg-primary-900/20 border-primary-300 dark:border-primary-700 text-primary-700 dark:text-primary-400 hover:bg-primary-100 dark:hover:bg-primary-900/30'
                            : 'bg-white dark:bg-zinc-800 border-zinc-300 dark:border-zinc-600 text-zinc-700 dark:text-zinc-300 hover:border-primary-400 dark:hover:border-primary-600 hover:text-primary-700 dark:hover:text-primary-400'
                        }`}
                      >
                        {allSelected ? 'Desmarcar todos' : 'Selecionar todos'}
                      </button>
                    )}
                  </div>
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

                {/* Filtro por Cargo */}
                {roles.length > 0 && (
                  <div className="bg-zinc-50 dark:bg-zinc-800/50 p-3 rounded-2xl border border-zinc-100 dark:border-zinc-800">
                    <p className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 mb-3 uppercase">
                      Filtrar por Cargo
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {roles.map(roleObj => {
                        const role = roleObj.description;
                        const isAll = fullySelectedRoles.has(role);
                        return (
                          <button
                            key={role}
                            onClick={() => handleSelectAllByRole(role)}
                            disabled={!isParticipantsEditable}
                            className={`px-3 py-1.5 text-xs font-semibold rounded-full transition-all flex items-center gap-1.5 border ${
                              isAll
                                ? 'bg-primary-100 text-primary-700 border-primary-300 dark:bg-primary-900/40 dark:text-primary-300 dark:border-primary-700'
                                : 'bg-white text-zinc-600 border-zinc-200 hover:border-primary-300 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700'
                            } disabled:opacity-50 disabled:cursor-not-allowed`}
                          >
                            {isAll ? <Check size={12} /> : <Plus size={12} />}
                            {role}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {loadingUsers ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 size={24} className="animate-spin text-primary-600" />
                  </div>
                ) : (
                  <>
                    {users.length === 0 ? (
                      <p className="text-sm text-zinc-500 dark:text-zinc-400 p-4 text-center">Nenhum colaborador encontrado.</p>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {users.map(user => {
                          const selected = formData.audience_ids.includes(user.id);
                          const isEnrolled = enrolledUserIds.has(user.id);
                          const isDisabled = !isParticipantsEditable || isEnrolled;
                          return (
                            <motion.button
                              key={user.id}
                              onClick={() => !isDisabled && toggleUser(user.id)}
                              initial={{ opacity: 0, scale: 0.95 }}
                              animate={{ opacity: 1, scale: 1 }}
                              disabled={isDisabled}
                              title={isEnrolled ? 'Usuário já participa de outra jornada' : undefined}
                              className={`p-3 rounded-xl border-2 transition-all duration-200 text-left group ${
                                isEnrolled
                                  ? 'bg-amber-50 dark:bg-amber-900/10 border-amber-300 dark:border-amber-800 opacity-70 cursor-not-allowed'
                                  : selected
                                  ? 'bg-primary-50 dark:bg-primary-900/20 border-primary-500 shadow-md'
                                  : 'bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 hover:border-primary-300 dark:hover:border-primary-700 hover:shadow-sm'
                              } disabled:cursor-not-allowed`}
                            >
                              <div className="flex items-start gap-2.5">
                                {/* Avatar */}
                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-100 to-teal-100 dark:from-primary-900/30 dark:to-teal-900/30 border-2 border-primary-200 dark:border-primary-800 flex items-center justify-center text-primary-600 dark:text-primary-400 overflow-hidden flex-shrink-0">
                                  {user.profile_image_url ? (
                                    <img
                                      src={getFullImageUrl(user.profile_image_url) || ''}
                                      alt={user.name}
                                      className="w-full h-full object-cover"
                                    />
                                  ) : (
                                    <span className="text-base font-bold">
                                      {user.name.charAt(0).toUpperCase()}
                                    </span>
                                  )}
                                </div>

                                {/* Info */}
                                <div className="flex-1 min-w-0">
                                  <p className="font-bold text-sm text-zinc-900 dark:text-white truncate">{user.name}</p>
                                  {/* Badge de enrolled logo abaixo do nome */}
                                  {isEnrolled && (
                                    <span className="inline-block mt-0.5 mb-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400 border border-amber-300 dark:border-amber-700 leading-tight">
                                      Participa de outra jornada
                                    </span>
                                  )}
                                  {user.role && (
                                    <p className="text-[10px] font-semibold text-primary-600 dark:text-primary-400 uppercase tracking-wider">
                                      {user.role}
                                    </p>
                                  )}
                                  {user.store && (
                                    <p className="text-[10px] text-zinc-400 dark:text-zinc-500 truncate">
                                      🏪 {user.store.name}
                                    </p>
                                  )}
                                  {user.coin_balance !== undefined && user.coin_balance > 0 && (
                                    <p className="text-[10px] text-amber-600 dark:text-amber-400 font-medium">
                                      🪙 {user.coin_balance.toLocaleString('pt-BR')} {coinName || 'coins'}
                                    </p>
                                  )}
                                </div>

                                {/* Checkbox (só quando não enrolled) */}
                                {!isEnrolled && (
                                  <div className={`flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                                    selected
                                      ? 'bg-primary-500 border-primary-500'
                                      : 'border-zinc-300 dark:border-zinc-600 group-hover:border-primary-400'
                                  }`}>
                                    {selected && <Check size={12} className="text-white" />}
                                  </div>
                                )}
                              </div>
                            </motion.button>
                          );
                        })}
                      </div>
                    )}

                    {/* Paginação */}
                    {usersTotalPages > 1 && (
                      <div className="flex items-center justify-between text-sm">
                        <button
                          onClick={() => fetchUsers(usersPage - 1, debouncedUserSearch)}
                          disabled={usersPage <= 1}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-600 text-zinc-700 dark:text-zinc-200 bg-white dark:bg-zinc-800 disabled:opacity-40 hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors font-medium"
                        >
                          <ChevronLeft size={14} /> Anterior
                        </button>
                        <span className="text-zinc-600 dark:text-zinc-300 font-medium">
                          Página {usersPage} de {usersTotalPages}
                        </span>
                        <button
                          onClick={() => fetchUsers(usersPage + 1, debouncedUserSearch)}
                          disabled={usersPage >= usersTotalPages}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-600 text-zinc-700 dark:text-zinc-200 bg-white dark:bg-zinc-800 disabled:opacity-40 hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors font-medium"
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
                            type="text"
                            inputMode="numeric"
                            disabled={isReadOnly || index === 0}
                            value={level.xp_threshold}
                            onChange={e => {
                              const val = e.target.value.replace(/\D/g, '');
                              if (val === '') {
                                updateLevel(index, 'xp_threshold', 0);
                                return;
                              }
                              const noZeros = val.replace(/^0+(?=\d)/, '');
                              const numVal = parseInt(noZeros, 10) || 0;
                              const finalVal = Math.min(999, Math.max(0, numVal));
                              updateLevel(index, 'xp_threshold', finalVal);
                            }}
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
                  {!isReadOnly && (
                    <div className="relative mb-2">
                      <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                      <input
                        type="text"
                        placeholder="Buscar recompensa..."
                        value={rewardSearch}
                        onChange={e => setRewardSearch(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white text-sm focus:ring-2 focus:ring-primary-500"
                      />
                    </div>
                  )}
                  {loadingRewards ? (
                    <div className="flex justify-center py-4"><Loader2 size={20} className="animate-spin text-primary-600" /></div>
                  ) : isReadOnly ? (
                    <div className="flex justify-center">
                      {formData.prize_reward_id ? (
                        (() => {
                          const r = rewards.find(r => r.id === formData.prize_reward_id);
                          if (!r) return <p className="text-sm text-zinc-500 p-4 italic">Carregando prêmio selecionado...</p>;
                          return (
                            <div className="w-full p-4 bg-white dark:bg-zinc-800 border-2 border-primary-500 rounded-2xl shadow-md flex items-center gap-4">
                              <div className="w-20 h-20 rounded-xl overflow-hidden border border-zinc-100 dark:border-zinc-700 bg-white dark:bg-zinc-900 flex-shrink-0">
                                {r.images?.[0]?.image_full_url ? (
                                  <img src={r.images[0].image_full_url} alt={r.name} className="w-full h-full object-cover" />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center text-zinc-200 dark:text-zinc-700">
                                    <GiftIcon size={32} />
                                  </div>
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="mb-1">
                                  {r.fulfillment_type === 'voucher' ? (
                                    <span className="bg-blue-500 text-white text-[8px] font-black px-1.5 py-0.5 rounded shadow-sm uppercase">Voucher</span>
                                  ) : (
                                    <span className="bg-green-500 text-white text-[8px] font-black px-1.5 py-0.5 rounded shadow-sm uppercase">Físico</span>
                                  )}
                                </div>
                                <p className="font-bold text-zinc-900 dark:text-white truncate text-base">{r.name}</p>
                                <p className="text-xs text-zinc-500 dark:text-zinc-400 line-clamp-2">{r.description}</p>
                              </div>
                            </div>
                          );
                        })()
                      ) : (
                        <div className="w-full p-6 bg-zinc-50 dark:bg-zinc-800/50 border-2 border-dashed border-zinc-200 dark:border-zinc-700 rounded-2xl flex flex-col items-center justify-center text-zinc-400">
                          <X size={32} className="mb-2" />
                          <span className="text-sm font-bold uppercase tracking-tight">Sem prêmio definido</span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 border border-zinc-200 dark:border-zinc-700 rounded-xl p-3 bg-zinc-50/50 dark:bg-zinc-900/30">
                      <label 
                        className={`flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all cursor-pointer text-center min-h-[120px] ${
                          formData.prize_reward_id === null 
                            ? 'bg-primary-50 dark:bg-primary-900/20 border-primary-500 shadow-sm' 
                            : 'bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 hover:border-primary-300'
                        }`}
                      >
                        <input
                          type="radio"
                          name="reward"
                          checked={formData.prize_reward_id === null}
                          onChange={() => setFormData(f => ({ ...f, prize_reward_id: null }))}
                          disabled={isReadOnly}
                          className="sr-only"
                        />
                        <div className="w-10 h-10 bg-zinc-100 dark:bg-zinc-700 rounded-full flex items-center justify-center mb-2 text-zinc-400">
                          <X size={20} />
                        </div>
                        <span className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-tight">Sem prêmio</span>
                      </label>

                      {rewards.map(r => (
                        <label 
                          key={r.id} 
                          className={`group relative flex flex-col p-2 rounded-xl border-2 transition-all cursor-pointer ${
                            formData.prize_reward_id === r.id 
                              ? 'bg-primary-50 dark:bg-primary-900/20 border-primary-500 shadow-sm' 
                              : 'bg-white dark:bg-zinc-800 border-zinc-100 dark:border-zinc-800 hover:border-primary-300'
                          }`}
                        >
                          <input
                            type="radio"
                            name="reward"
                            checked={formData.prize_reward_id === r.id}
                            onChange={() => setFormData(f => ({ ...f, prize_reward_id: r.id }))}
                            disabled={isReadOnly}
                            className="sr-only"
                          />
                          
                          {/* Badge de Tipo */}
                          <div className="absolute top-1 right-1 z-10">
                            {r.fulfillment_type === 'voucher' ? (
                              <span className="bg-blue-500 text-white text-[8px] font-black px-1 py-0.5 rounded shadow-sm">VOUCHER</span>
                            ) : (
                              <span className="bg-green-500 text-white text-[8px] font-black px-1 py-0.5 rounded shadow-sm">FÍSICO</span>
                            )}
                          </div>

                          <div className="aspect-square rounded-lg overflow-hidden border border-zinc-100 dark:border-zinc-700 bg-white dark:bg-zinc-900 mb-2">
                            {r.images?.[0]?.image_full_url ? (
                              <img src={r.images[0].image_full_url} alt={r.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-zinc-200 dark:text-zinc-700">
                                <GiftIcon size={24} />
                              </div>
                            )}
                          </div>
                          
                          <p className="text-[10px] font-bold text-zinc-900 dark:text-white line-clamp-2 text-center leading-tight min-h-[2.5em] flex items-center justify-center">
                            {r.name}
                          </p>
                        </label>
                      ))}
                    </div>
                  )}
                </div>

                {/* Campanhas vinculadas */}
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                      Campanhas Vinculadas (opcional)
                    </label>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                      Apenas ganhos nestas campanhas serão convertidos em XP para esta jornada.
                    </p>
                  </div>

                  {loadingCampaigns ? (
                    <div className="flex justify-center py-4">
                      <Loader2 size={20} className="animate-spin text-primary-600" />
                    </div>
                  ) : isReadOnly ? (
                    <div className="flex flex-wrap gap-2 p-3 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-xl min-h-[50px]">
                      {formData.campaign_ids.length === 0 ? (
                        <p className="text-xs text-zinc-400 italic">Nenhuma campanha específica vinculada. Todas as campanhas pontuam.</p>
                      ) : (
                        formData.campaign_ids.map(id => {
                          const c = campaigns.find(item => item.id === id);
                          return (
                            <div 
                              key={id}
                              className="inline-flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-zinc-800 border border-primary-200 dark:border-primary-900 text-primary-700 dark:text-primary-400 rounded-lg text-xs font-bold shadow-sm"
                            >
                              <div className="w-1.5 h-1.5 rounded-full bg-primary-500 animate-pulse" />
                              {c?.name || `Campanha #${id}`}
                            </div>
                          );
                        })
                      )}
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 border border-zinc-200 dark:border-zinc-700 rounded-xl p-2 bg-zinc-50/30 dark:bg-zinc-900/20">
                      {campaigns.length === 0 ? (
                        <p className="text-sm text-zinc-500 p-4 text-center italic col-span-full">Nenhuma campanha ativa disponível.</p>
                      ) : (
                        campaigns.map(c => {
                          const isSelected = formData.campaign_ids.includes(c.id);
                          return (
                            <label 
                              key={c.id} 
                              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border-2 transition-all cursor-pointer ${
                                isSelected 
                                  ? 'bg-primary-50 dark:bg-primary-900/20 border-primary-500 shadow-sm' 
                                  : 'bg-white dark:bg-zinc-800 border-zinc-100 dark:border-zinc-800 hover:border-primary-200 dark:hover:border-primary-900'
                              }`}
                            >
                              <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${
                                isSelected ? 'bg-primary-500 border-primary-500' : 'border-zinc-300 dark:border-zinc-600'
                              }`}>
                                {isSelected && <Check size={12} className="text-white" />}
                              </div>
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => toggleCampaign(c.id)}
                                className="sr-only"
                              />
                              <div className="flex-1 min-w-0">
                                <p className={`text-xs font-bold truncate ${isSelected ? 'text-primary-700 dark:text-primary-400' : 'text-zinc-700 dark:text-zinc-300'}`}>
                                  {c.name}
                                </p>
                                <p className="text-[10px] text-zinc-500 dark:text-zinc-500 uppercase tracking-wider font-medium">
                                  {c.type === 'sales' ? '🎯 Vendas' : '🔥 Engajamento'}
                                </p>
                              </div>
                            </label>
                          );
                        })
                      )}
                    </div>
                  )}
                </div>

                {/* Resumo */}
                <div className="bg-zinc-50 dark:bg-zinc-800 rounded-xl p-4 space-y-3 border border-zinc-200 dark:border-zinc-700">
                  <h4 className="text-sm font-semibold text-zinc-900 dark:text-white">📋 Resumo da Jornada</h4>
                  <div className="space-y-1.5 text-sm text-zinc-600 dark:text-zinc-400">
                    <div><span className="font-medium text-zinc-900 dark:text-white">Nome:</span> {formData.name || '—'}</div>
                    <div><span className="font-medium text-zinc-900 dark:text-white">Período:</span>{' '}
                      {formData.start_date && formData.end_date
                        ? `${formatDateBR(formData.start_date)} até ${formatDateBR(formData.end_date)} (${countDays(formData.start_date, formData.end_date)} dias)`
                        : '—'}</div>
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
                      <div className="flex items-center gap-3 mt-1 p-2 bg-white dark:bg-zinc-900 rounded-lg border border-zinc-100 dark:border-zinc-700">
                        <div className="w-10 h-10 rounded-md overflow-hidden flex-shrink-0 border border-zinc-100 dark:border-zinc-800">
                          {(() => {
                            const r = rewards.find(r => r.id === formData.prize_reward_id);
                            return r?.images?.[0]?.image_full_url ? (
                              <img src={r.images[0].image_full_url} alt={r.name} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-zinc-300">
                                <GiftIcon size={16} />
                              </div>
                            );
                          })()}
                        </div>
                        <div>
                          <p className="text-[10px] text-zinc-500 uppercase font-bold leading-none mb-1">Prêmio da Jornada</p>
                          <p className="font-medium text-zinc-900 dark:text-white leading-tight">
                            {rewards.find(r => r.id === formData.prize_reward_id)?.name ?? `ID ${formData.prize_reward_id}`}
                          </p>
                        </div>
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
                {editingJourney?.status === 'active' ? 'Salvar Participantes' : 'Salvar rascunho'}
              </button>
            )}

            {/* Jornada ativa na etapa de participantes: botão de salvar participantes */}
            {editingJourney?.status === 'active' && currentStep === 1 && isReadOnly && (
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 px-5 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors text-sm font-medium disabled:opacity-60"
              >
                {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                Salvar Participantes
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
