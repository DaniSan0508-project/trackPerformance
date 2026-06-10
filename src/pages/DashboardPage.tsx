import React, {useEffect, useState} from 'react';
import {ChartNoAxesColumn, User} from 'lucide-react';
import {useAuth} from '../context/AuthContext';
import {useTheme} from '../context/ThemeContext';
import { authService, dashboardService, usersService, campaignsService, productsService, manufacturersService, rolesService, rewardsService, feedbacksService, postsService, redemptionsService, tenantConfigsService, surveysService, storesService, coinsService } from '../services';
import {getFullImageUrl, resolvePortalDomain} from '../utils';
import { generateColorShades } from '../utils/colorUtils';
import { motion } from 'motion/react';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip as ChartTooltip,
    Legend,
} from 'chart.js';
import {Bar} from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, ChartTooltip, Legend);

type DashboardStat = { value: number | string; growth_percentage: number | null } | null;
type TopCollaborator = {
    position: number;
    user_id: number;
    name: string;
    profile_image_url?: string | null;
    total_coins: number;
};
type Campaign = {
    id: number;
    name: string;
    type: string;
    goal: number;
    goal_campaign?: number;
    current_value: number;
    progress_percentage: number;
    participants_count: number;
};
type EngagementIndexItem = {
    store_id: number;
    store_name: string;
    score: number;
    participants: number;
    breakdown: Record<string, number>;
};
type ActionsPeriod = 'current_month' | 'current_week' | 'current_day';
type ActionsSummary = {
    period: string;
    actions: Record<string, number>;
    total: number;
};
type DemoDashboardData = {
    stats: {
        active_users: DashboardStat;
        engagement: DashboardStat;
        coins_generated: DashboardStat;
        redemptions: DashboardStat;
    };
    top: TopCollaborator[];
    campaigns: Campaign[];
    engagementIndex: EngagementIndexItem[];
    actionsSummary: Record<ActionsPeriod, ActionsSummary>;
};

const DEMO_DASHBOARD_ENABLED = import.meta.env.VITE_ENABLE_DEMO_DASHBOARD === 'true';
const DEMO_DOMAIN = 'demostracao';

const randomInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
const randomGrowth = (min = -20, max = 20) => randomInt(min, max);
const pick = <T,>(items: T[]) => items[randomInt(0, items.length - 1)];

const firstNames = [
    'Ana', 'Beatriz', 'Camila', 'Carla', 'Daniela', 'Eduarda', 'Fernanda', 'Gabriela',
    'Isabela', 'Juliana', 'Larissa', 'Mariana', 'Patricia', 'Rafaela', 'Sabrina', 'Vanessa',
    'Adriana', 'Bruno', 'Carlos', 'Diego', 'Eduardo', 'Felipe', 'Gabriel', 'Gustavo',
    'Henrique', 'Joao', 'Leonardo', 'Lucas', 'Marcelo', 'Matheus', 'Rafael', 'Thiago',
];

const lastNames = [
    'Silva', 'Santos', 'Oliveira', 'Souza', 'Lima', 'Pereira', 'Costa', 'Rodrigues',
    'Almeida', 'Nascimento', 'Araujo', 'Fernandes', 'Carvalho', 'Gomes', 'Martins', 'Rocha',
];

const storeNames = [
    'Unidade Paulista',
    'Unidade Campinas',
    'Unidade Pinheiros',
    'Unidade Santo Andre',
    'Unidade Ribeirao Preto',
];

const campaignNames = [
    'Sprint de Vendas',
    'Missao Atendimento Nota 10',
    'Desafio de Engajamento',
    'Campanha Superacao de Metas',
];

const createBrazilianName = (usedNames: Set<string>) => {
    let fullName = '';

    do {
        fullName = `${pick(firstNames)} ${pick(lastNames)}`;
    } while (usedNames.has(fullName));

    usedNames.add(fullName);
    return fullName;
};

const createDemoActions = (scale: number) => {
    const actions = {
        login_daily: randomInt(40, 70) * scale,
        create_post: randomInt(14, 30) * scale,
        comment_post: randomInt(25, 55) * scale,
        like_post: randomInt(60, 120) * scale,
        share_post: randomInt(8, 22) * scale,
        send_feedback: randomInt(10, 24) * scale,
        answer_survey: randomInt(12, 28) * scale,
        record_mood: randomInt(18, 45) * scale,
    };

    const total = Object.values(actions).reduce((sum, value) => sum + value, 0);

    return { actions, total };
};

const createDemoDashboardData = (): DemoDashboardData => {
    const usedNames = new Set<string>();
    const top = Array.from({ length: 3 }, (_, index) => ({
        position: index + 1,
        user_id: index + 1,
        name: createBrazilianName(usedNames),
        profile_image_url: null,
        total_coins: randomInt(1800 - index * 250, 2400 - index * 180),
    })).sort((a, b) => b.total_coins - a.total_coins).map((item, index) => ({
        ...item,
        position: index + 1,
    }));

    const campaigns: Campaign[] = campaignNames.slice(0, 3).map((name, index) => {
        const type = index % 2 === 0 ? 'engagement' : 'sales';
        const goal = type === 'engagement' ? randomInt(3000, 7000) : randomInt(120000, 280000);
        const progress = randomInt(38, 92);
        return {
            id: index + 1,
            name,
            type,
            goal,
            goal_campaign: goal,
            current_value: Math.round(goal * (progress / 100)),
            progress_percentage: progress,
            participants_count: randomInt(18, 95),
        };
    });

    const engagementIndex: EngagementIndexItem[] = storeNames.slice(0, 4).map((storeName, index) => {
        const breakdown = {
            logins: randomInt(80, 160),
            posts: randomInt(10, 28),
            comments: randomInt(18, 44),
            likes: randomInt(50, 130),
            feedbacks: randomInt(8, 20),
            surveys: randomInt(12, 26),
        };
        const score = Object.values(breakdown).reduce((sum, value) => sum + value, 0);
        return {
            store_id: index + 1,
            store_name: storeName,
            score,
            participants: randomInt(16, 48),
            breakdown,
        };
    });

    const monthlyActions = createDemoActions(1);
    const weeklyActions = createDemoActions(1);
    const dailyActions = createDemoActions(1);

    return {
        stats: {
            active_users: { value: randomInt(95, 180), growth_percentage: randomGrowth(4, 22) },
            engagement: { value: `${randomInt(72, 96)}%`, growth_percentage: randomGrowth(3, 18) },
            coins_generated: { value: randomInt(18000, 52000), growth_percentage: randomGrowth(5, 28) },
            redemptions: { value: randomInt(24, 95), growth_percentage: randomGrowth(-8, 16) },
        },
        top,
        campaigns,
        engagementIndex,
        actionsSummary: {
            current_month: { period: 'current_month', ...monthlyActions },
            current_week: { period: 'current_week', ...weeklyActions },
            current_day: { period: 'current_day', ...dailyActions },
        },
    };
};

export const DashboardPage = () => {
    const {user, token, coinName} = useAuth();
    const {theme, primaryColor} = useTheme();
    const [demoData] = useState<DemoDashboardData>(() => createDemoDashboardData());
    const isDemoDashboardEnabled = DEMO_DASHBOARD_ENABLED && resolvePortalDomain() === DEMO_DOMAIN;

    const [loadingStats, setLoadingStats] = useState(true);
    const [stats, setStats] = useState<{
        active_users: DashboardStat;
        engagement: DashboardStat;
        coins_generated: DashboardStat;
        redemptions: DashboardStat;
    }>({active_users: null, engagement: null, coins_generated: null, redemptions: null});

    const [top, setTop] = useState<TopCollaborator[]>([]);
    const [loadingTop, setLoadingTop] = useState(true);
    const [campaigns, setCampaigns] = useState<Campaign[]>([]);
    const [loadingCampaigns, setLoadingCampaigns] = useState(true);
    const [engagementIndex, setEngagementIndex] = useState<EngagementIndexItem[]>([]);
    const [loadingEngagementIndex, setLoadingEngagementIndex] = useState(true);

    const [actionsPeriod, setActionsPeriod] = useState<ActionsPeriod>('current_month');
    const [actionsSummary, setActionsSummary] = useState<ActionsSummary | null>(null);
    const [loadingActions, setLoadingActions] = useState(true);

    useEffect(() => {
        if (isDemoDashboardEnabled) {
            setLoadingStats(false);
            setStats(demoData.stats);
            setLoadingTop(false);
            setTop(demoData.top);
            setLoadingCampaigns(false);
            setCampaigns(demoData.campaigns);
            setLoadingEngagementIndex(false);
            setEngagementIndex(demoData.engagementIndex);
            return;
        }

        const fetchStats = async () => {
            if (!token) return;
            setLoadingStats(true);
            try {
                const data = await dashboardService.getDashboard(token);
                setStats({
                    active_users: data.active_users || null,
                    engagement: data.engagement || null,
                    coins_generated: data.coins_generated || null,
                    redemptions: data.redemptions || null,
                });
            } catch (err) {
                console.error('Failed to load dashboard stats', err);
            } finally {
                setLoadingStats(false);
            }
        };

        fetchStats();
        const fetchTop = async () => {
            if (!token) return;
            setLoadingTop(true);
            try {
                const data = await dashboardService.getTopCollaborators(token);
                // Expecting an array
                setTop(Array.isArray(data) ? data : (data.data || []));
            } catch (err) {
                console.error('Failed to load top collaborators', err);
            } finally {
                setLoadingTop(false);
            }
        };
        fetchTop();
        const fetchCampaigns = async () => {
            if (!token) return;
            setLoadingCampaigns(true);
            try {
                const data = await dashboardService.getActiveCampaigns(token);
                setCampaigns(Array.isArray(data) ? data : (data.data || []));
            } catch (err) {
                console.error('Failed to load active campaigns', err);
            } finally {
                setLoadingCampaigns(false);
            }
        };
        fetchCampaigns();
        const fetchEngagementIndex = async () => {
            if (!token) return;
            setLoadingEngagementIndex(true);
            try {
                const data = await dashboardService.getEngagementIndex(token);
                setEngagementIndex(Array.isArray(data) ? data : (data.data || []));
            } catch (err) {
                console.error('Failed to load engagement index', err);
            } finally {
                setLoadingEngagementIndex(false);
            }
        };
        fetchEngagementIndex();
    }, [token, demoData, isDemoDashboardEnabled]);

    useEffect(() => {
        if (isDemoDashboardEnabled) {
            setLoadingActions(false);
            setActionsSummary(demoData.actionsSummary[actionsPeriod]);
            return;
        }

        const fetchActionsSummary = async () => {
            if (!token) return;
            setLoadingActions(true);
            try {
                const data = await dashboardService.getEngagementActionsSummary(token, actionsPeriod);
                setActionsSummary(data);
            } catch (err) {
                console.error('Failed to load engagement actions summary', err);
            } finally {
                setLoadingActions(false);
            }
        };
        fetchActionsSummary();
    }, [token, actionsPeriod, demoData, isDemoDashboardEnabled]);

    if (!user) return null;

    return (
        <div className="p-4 md:p-8 space-y-6">
                <motion.div
                    initial={{opacity: 0, y: -10}}
                    animate={{opacity: 1, y: 0}}
                    transition={{duration: 0.4, ease: 'easeOut'}}
                    className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">Bem-vindo, {user.name.split(' ')[0]}!</h1>
                        <p className="text-zinc-500 dark:text-zinc-400">Veja como o seu time está se saindo hoje</p>
                    </div>
                </motion.div>

                {/* Stats Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <StatCard
                        label="Usuários Ativos"
                        value={stats.active_users ? String(stats.active_users.value) : loadingStats ? 'Carregando...' : '-'}
                        change={stats.active_users && stats.active_users.growth_percentage !== null && stats.active_users.growth_percentage !== undefined ? `${stats.active_users.growth_percentage > 0 ? '+' : ''}${stats.active_users.growth_percentage}%` : '--'}
                        positive={!!(stats.active_users && typeof stats.active_users.growth_percentage === 'number' && stats.active_users.growth_percentage > 0)}
                        delay={0}
                    />
                    <StatCard
                        label="Engajamento Geral"
                        value={stats.engagement ? String(stats.engagement.value) : loadingStats ? 'Carregando...' : '-'}
                        change={stats.engagement && stats.engagement.growth_percentage !== null && stats.engagement.growth_percentage !== undefined ? `${stats.engagement.growth_percentage > 0 ? '+' : ''}${stats.engagement.growth_percentage}%` : '--'}
                        positive={!!(stats.engagement && typeof stats.engagement.growth_percentage === 'number' && stats.engagement.growth_percentage > 0)}
                        delay={0.08}
                    />
                    <StatCard
                        label={`${(coinName || 'coins').charAt(0).toUpperCase() + (coinName || 'coins').slice(1)} Geradas`}
                        value={stats.coins_generated ? String(stats.coins_generated.value) : loadingStats ? 'Carregando...' : '-'}
                        change={stats.coins_generated && stats.coins_generated.growth_percentage !== null && stats.coins_generated.growth_percentage !== undefined ? `${stats.coins_generated.growth_percentage > 0 ? '+' : ''}${stats.coins_generated.growth_percentage}%` : '--'}
                        positive={!!(stats.coins_generated && typeof stats.coins_generated.growth_percentage === 'number' && stats.coins_generated.growth_percentage > 0)}
                        delay={0.16}
                    />
                    <StatCard
                        label="Resgates Realizados"
                        value={stats.redemptions ? String(stats.redemptions.value) : loadingStats ? 'Carregando...' : '-'}
                        change={stats.redemptions && stats.redemptions.growth_percentage !== null && stats.redemptions.growth_percentage !== undefined ? `${stats.redemptions.growth_percentage > 0 ? '+' : ''}${stats.redemptions.growth_percentage}%` : '--'}
                        positive={!!(stats.redemptions && typeof stats.redemptions.growth_percentage === 'number' && stats.redemptions.growth_percentage > 0)}
                        delay={0.24}
                    />
                </div>

                <motion.div
                    initial={{opacity: 0, y: 16}}
                    animate={{opacity: 1, y: 0}}
                    transition={{duration: 0.5, delay: 0.3, ease: 'easeOut'}}
                    className="bg-white dark:bg-zinc-900 p-6 rounded-2xl shadow-sm border border-zinc-100 dark:border-zinc-800 transition-colors duration-200">
                    {/* Header: title + period selector */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
                        <h3 className="font-bold text-lg flex items-center gap-2 text-zinc-900 dark:text-white">
                            <ChartNoAxesColumn size={20} className="text-primary-600"/>
                            Índice de Engajamento por Ação
                        </h3>
                        <div className="flex items-center gap-1 bg-zinc-100 dark:bg-zinc-800 rounded-lg p-1 text-sm">
                            {(
                                [
                                    {label: 'Mensal', value: 'current_month'},
                                    {label: 'Semanal', value: 'current_week'},
                                    {label: 'Diário', value: 'current_day'},
                                ] as { label: string; value: ActionsPeriod }[]
                            ).map(opt => (
                                <button
                                    key={opt.value}
                                    onClick={() => setActionsPeriod(opt.value)}
                                    className={`px-3 py-1 rounded-md font-medium transition-colors duration-150 ${
                                        actionsPeriod === opt.value
                                            ? 'bg-primary-500 text-white shadow-sm'
                                            : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
                                    }`}
                                >
                                    {opt.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {loadingActions ? (
                        <div className="h-64 flex items-center justify-center text-zinc-400">Carregando...</div>
                    ) : !actionsSummary ? (
                        <div className="h-64 flex items-center justify-center text-zinc-500">Sem dados disponíveis</div>
                    ) : (() => {
                        const actionLabelMap: Record<string, string> = {
                            login_daily: 'Acesso Diário',
                            create_post: 'Criar Post',
                            comment_post: 'Comentários',
                            like_post: 'Curtidas',
                            share_post: 'Compartilhamentos',
                            send_feedback: 'Feedbacks',
                            answer_survey: 'Pesquisas',
                            record_mood: 'Humor',
                        };

                        const isDark = theme === 'dark';
                        const tickColor = isDark ? '#a1a1aa' : '#71717a';
                        const gridColor = isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)';

                        const labels = Object.keys(actionsSummary.actions).map(k => actionLabelMap[k] ?? k);
                        const values = Object.values(actionsSummary.actions);

                        const shades = generateColorShades(primaryColor);
                        const primaryColorVal = shades[500];
                        const primaryDark = shades[600];
                        const primaryLight = shades[400];

                        const chartData = {
                            labels,
                            datasets: [
                                {
                                    label: 'Ações',
                                    data: values,
                                    backgroundColor: primaryColorVal,
                                    hoverBackgroundColor: isDark ? primaryLight : primaryDark,
                                    borderRadius: 6,
                                    borderSkipped: false,
                                },
                            ],
                        };

                        const chartOptions = {
                            responsive: true,
                            maintainAspectRatio: false,
                            plugins: {
                                legend: {display: false},
                                tooltip: {
                                    backgroundColor: isDark ? '#18181b' : '#ffffff',
                                    titleColor: isDark ? '#f4f4f5' : '#18181b',
                                    bodyColor: isDark ? '#a1a1aa' : '#52525b',
                                    borderColor: isDark ? '#3f3f46' : '#e4e4e7',
                                    borderWidth: 1,
                                    padding: 10,
                                    callbacks: {
                                        label: (ctx: any) => ` ${ctx.parsed.y} ações`,
                                    },
                                },
                            },
                            scales: {
                                x: {
                                    ticks: {color: tickColor, font: {size: 12}},
                                    grid: {color: gridColor},
                                },
                                y: {
                                    beginAtZero: true,
                                    ticks: {color: tickColor, font: {size: 12}, precision: 0},
                                    grid: {color: gridColor},
                                },
                            },
                        };

                        return (
                            <div className="relative h-72">
                                <Bar data={chartData} options={chartOptions}/>
                            </div>
                        );
                    })()}
                </motion.div>

                {/* Top Colaboradores - lista com barras de progresso */}
                <motion.div
                    initial={{opacity: 0, y: 16}}
                    animate={{opacity: 1, y: 0}}
                    transition={{duration: 0.5, delay: 0.38, ease: 'easeOut'}}
                    className="bg-white dark:bg-zinc-900 p-6 rounded-2xl shadow-sm border border-zinc-100 dark:border-zinc-800 transition-colors duration-200">
                    <h3 className="font-bold text-lg mb-6 flex items-center gap-2 text-zinc-900 dark:text-white">
                        <User size={20} className="text-primary-600"/>
                        Top Jogadores
                    </h3>
                    {loadingTop ? (
                        <div className="text-zinc-400">Carregando...</div>
                    ) : (
                        (() => {
                            const podium = [...top].sort((a, b) => a.position - b.position).slice(0, 3);
                            const maxCoins = podium.length ? Math.max(...podium.map(p => p.total_coins)) : 1;
                            const fmt = (n: number) => new Intl.NumberFormat('pt-BR').format(n);

                            return (
                                <div className="space-y-6">
                                    {podium.map((p, i) => {
                                        const percent = Math.round((p.total_coins / (maxCoins || 1)) * 100);
                                        const medal = p.position === 1 ? '🥇' : p.position === 2 ? '🥈' : '🥉';
                                        return (
                                            <motion.div
                                                key={p.user_id}
                                                initial={{opacity: 0, x: -12}}
                                                animate={{opacity: 1, x: 0}}
                                                transition={{duration: 0.4, delay: 0.45 + i * 0.1, ease: 'easeOut'}}
                                            >
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-3">
                                                        <span className="text-xl">{medal}</span>
                                                        <div className="flex items-center gap-3">
                                                            <div
                                                                className="w-14 h-14 bg-gradient-to-br from-primary-100 to-teal-100 dark:from-primary-900/30 dark:to-teal-900/30 rounded-full flex items-center justify-center text-primary-600 dark:text-primary-400 overflow-hidden border-2 border-primary-200 dark:border-primary-800 flex-shrink-0">
                                                                {p.profile_image_url ? (
                                                                    <img
                                                                        src={getFullImageUrl(p.profile_image_url) || ''}
                                                                        alt={p.name}
                                                                        className="w-full h-full object-cover"/>
                                                                ) : (
                                                                    <User size={28}/>
                                                                )}
                                                            </div>
                                                            <span
                                                                className="text-sm font-medium text-zinc-900 dark:text-white">{p.name}</span>
                                                        </div>
                                                    </div>
                                                    <div
                                                        className="text-sm font-semibold text-zinc-900 dark:text-white">{fmt(p.total_coins)} {coinName || 'coins'}</div>
                                                </div>
                                                <div className="mt-2 h-3 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                                                    <motion.div
                                                        className="h-full bg-primary-500 dark:bg-primary-600"
                                                        initial={{width: 0}}
                                                        animate={{width: `${percent}%`}}
                                                        transition={{duration: 0.9, delay: 0.55 + i * 0.1, ease: 'easeOut'}}
                                                    />
                                                </div>
                                            </motion.div>
                                        );
                                    })}
                                </div>
                            );
                        })()
                    )}
                </motion.div>

                {/* Active Campaigns Section */}
                <motion.div
                    initial={{opacity: 0, y: 16}}
                    animate={{opacity: 1, y: 0}}
                    transition={{duration: 0.5, delay: 0.46, ease: 'easeOut'}}
                    className="bg-white dark:bg-zinc-900 p-6 rounded-2xl shadow-sm border border-zinc-100 dark:border-zinc-800 transition-colors duration-200">
                    <h3 className="font-bold text-lg mb-6 flex items-center gap-2 text-zinc-900 dark:text-white">
                        <ChartNoAxesColumn size={20} className="text-primary-600"/>
                        Campanhas
                    </h3>
                    {loadingCampaigns ? (
                        <div className="text-zinc-400">Carregando...</div>
                    ) : (
                        <div className="space-y-4">
                            {campaigns.map((c, i) => {
                                const fmt = (n: number) => new Intl.NumberFormat('pt-BR').format(n);
                                const participantLabel = c.type === 'sales' ? 'vendedores' : 'colaboradores';
                                const goalValue = c.goal_campaign || c.goal || 0;
                                const goalLabel = c.type === 'engagement' ? `${fmt(Number(goalValue))} ${coinName || 'coins'}` : fmt(Number(goalValue));
                                return (
                                    <motion.div
                                        key={c.id}
                                        initial={{opacity: 0, x: -12}}
                                        animate={{opacity: 1, x: 0}}
                                        transition={{duration: 0.4, delay: 0.52 + i * 0.08, ease: 'easeOut'}}
                                        className="p-3 bg-zinc-50 dark:bg-zinc-800 rounded-lg"
                                    >
                                        <div className="font-semibold dark:text-white">{c.name}</div>
                                        <div className="text-sm text-zinc-600 dark:text-zinc-400">Meta: {goalLabel}</div>
                                        <div className="text-sm text-zinc-600 dark:text-zinc-400">
                                            <div className="flex items-center gap-3">
                                                <span>Progresso:</span>
                                                <div className="flex-1">
                                                    <div
                                                        className="w-full h-3 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                                                        <div className="h-full bg-primary-500 dark:bg-primary-600"
                                                             style={{width: `${c.progress_percentage}%`}}/>                                                    </div>
                                                </div>
                                                <span className="w-12 text-right">{c.progress_percentage}%</span>
                                            </div>
                                        </div>
                                        <div className="text-sm text-zinc-600 dark:text-zinc-400">Participantes: {fmt(c.participants_count)} {participantLabel}</div>
                                    </motion.div>
                                );
                            })}
                        </div>
                    )}
                </motion.div>
                {/* Engagement Index per store */}
                <motion.div
                    initial={{opacity: 0, y: 16}}
                    animate={{opacity: 1, y: 0}}
                    transition={{duration: 0.5, delay: 0.54, ease: 'easeOut'}}
                    className="bg-white dark:bg-zinc-900 p-6 rounded-2xl shadow-sm border border-zinc-100 dark:border-zinc-800 transition-colors duration-200">
                    <h3 className="font-bold text-lg mb-6 flex items-center gap-2 text-zinc-900 dark:text-white">
                        <ChartNoAxesColumn size={20} className="text-primary-600"/>
                        Índice de Engajamento por Unidade
                    </h3>
                    {loadingEngagementIndex ? (
                        <div className="text-zinc-400">Carregando...</div>
                    ) : (
                        (() => {
                            if (!engagementIndex.length) return <div className="text-zinc-500">Nenhuma unidade encontrada</div>;
                            const maxScore = Math.max(...engagementIndex.map(e => e.score));
                            const fmt = (n: number) => new Intl.NumberFormat('pt-BR').format(n);
                            return (
                                <div className="space-y-3">
                                    {engagementIndex.map((store, i) => (
                                        <motion.div
                                            key={store.store_id}
                                            initial={{opacity: 0, x: -12}}
                                            animate={{opacity: 1, x: 0}}
                                            transition={{duration: 0.4, delay: 0.6 + i * 0.07, ease: 'easeOut'}}
                                            className="p-3 bg-zinc-50 dark:bg-zinc-800 rounded-lg"
                                        >
                                            <div className="flex items-center justify-between mb-2">
                                                <div className="font-semibold text-sm text-zinc-900 dark:text-white">{store.store_name}</div>
                                                <div className="text-xs text-zinc-600 dark:text-zinc-400">Pontuação: {fmt(store.score)} • {fmt(store.participants)} participantes</div>
                                            </div>
                                            <div className="relative">
                                                <div className="w-full h-4 bg-zinc-100 dark:bg-zinc-700 rounded-full overflow-hidden">
                                                    <motion.div
                                                        className="h-full bg-primary-500 dark:bg-primary-600"
                                                        initial={{width: 0}}
                                                        animate={{width: `${(store.score / (maxScore || 1)) * 100}%`}}
                                                        transition={{duration: 0.9, delay: 0.7 + i * 0.07, ease: 'easeOut'}}
                                                    />
                                                </div>
                                            </div>
                                            <details className="mt-2 text-xs text-zinc-700 dark:text-zinc-300">
                                                <summary className="cursor-pointer">Visualizar Detalhes</summary>
                                                <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                                                    {(() => {
                                                        const labelMap: Record<string, string> = {
                                                            logins: 'Usuários ativos',
                                                            posts: 'Posts',
                                                            comments: 'Comentários em posts',
                                                            likes: 'Curtidas em posts',
                                                            feedbacks: 'Feedbacks enviados',
                                                            surveys: 'Pesquisas respondidas',
                                                        };
                                                        return Object.entries(store.breakdown).map(([k, v]) => (
                                                            <div key={k} className="flex justify-between">
                                                                <span>{labelMap[k] ?? k.replace('_', ' ')}:</span>
                                                                <span>{fmt(v as number)}</span>
                                                            </div>
                                                        ));
                                                    })()}
                                                </div>
                                            </details>
                                        </motion.div>
                                    ))}
                                </div>
                            );
                        })()
                    )}
                </motion.div>
            </div>
    );
};

const StatCard = ({label, value, change, positive, delay = 0}: {
    label: string;
    value: string;
    change: string;
    positive?: boolean;
    delay?: number;
}) => (
    <motion.div
        initial={{opacity: 0, y: 20}}
        animate={{opacity: 1, y: 0}}
        whileHover={{y: -4, boxShadow: '0 8px 24px -4px rgba(0,0,0,0.10)'}}
        transition={{duration: 0.45, delay, ease: 'easeOut'}}
        className="bg-white dark:bg-zinc-900 p-6 rounded-2xl shadow-sm border border-zinc-100 dark:border-zinc-800 transition-colors duration-200 cursor-default">
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-1">{label}</p>
        <div className="flex items-end justify-between">
            <h4 className="text-2xl font-bold text-zinc-900 dark:text-white">{value}</h4>
            <motion.span
                initial={{scale: 0.8, opacity: 0}}
                animate={{scale: 1, opacity: 1}}
                transition={{duration: 0.3, delay: delay + 0.2}}
                className={`text-xs font-bold px-2 py-1 rounded-lg ${positive ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400' : 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400'}`}>
                {change}
            </motion.span>
        </div>
    </motion.div>
);
