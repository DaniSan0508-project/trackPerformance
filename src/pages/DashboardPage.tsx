import React, { useEffect, useState } from 'react';
import { Layout } from '../components/Layout';
import { TrendingUp, Building2, User } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { getFullImageUrl } from '../utils/formatters';

export const DashboardPage = () => {
  const { user, tenant, token, coinName } = useAuth();

  // DEV flag: when true, inject temporary random growth_percentage values for presentation.
  // Toggle to false or remove before production.
  const DEV_RANDOM_STATS = true;

  const randomGrowth = (min = -20, max = 20) => Math.round(Math.random() * (max - min) + min);

  const [loadingStats, setLoadingStats] = useState(true);
  const [stats, setStats] = useState<{
    active_users: { value: number | string; growth_percentage: number | null } | null;
    engagement: { value: number | string; growth_percentage: number | null } | null;
    coins_generated: { value: number | string; growth_percentage: number | null } | null;
    redemptions: { value: number | string; growth_percentage: number | null } | null;
  }>({ active_users: null, engagement: null, coins_generated: null, redemptions: null });

  const [top, setTop] = useState<Array<{ position: number; user_id: number; name: string; profile_image_url?: string | null; total_coins: number }>>([]);
  const [loadingTop, setLoadingTop] = useState(true);
  const [campaigns, setCampaigns] = useState<Array<{ id: number; name: string; type: string; goal: number; current_value: number; progress_percentage: number; participants_count: number }>>([]);
  const [loadingCampaigns, setLoadingCampaigns] = useState(true);
  const [engagementIndex, setEngagementIndex] = useState<Array<{ store_id: number; store_name: string; score: number; participants: number; breakdown: Record<string, number> }>>([]);
  const [loadingEngagementIndex, setLoadingEngagementIndex] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      if (!token) return;
      setLoadingStats(true);
      try {
        const data = await api.getDashboard(token);

        // API returns keys as in example: active_users, engagement, coins_generated, redemptions
        // Optionally inject random growth percentages for presentation (DEV flag)
        const injectGrowth = (item: any) => {
          if (!item) return null;
          const existing = typeof item.growth_percentage === 'number' ? item.growth_percentage : null;
          const gp = DEV_RANDOM_STATS ? randomGrowth() : existing;
          return { ...item, growth_percentage: gp };
        };

        setStats({
          active_users: injectGrowth(data.active_users) || null,
          engagement: injectGrowth(data.engagement) || null,
          coins_generated: injectGrowth(data.coins_generated) || null,
          redemptions: injectGrowth(data.redemptions) || null,
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
        const data = await api.getTopCollaborators(token);
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
        const data = await api.getActiveCampaigns(token);
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
        const data = await api.getEngagementIndex(token);
        setEngagementIndex(Array.isArray(data) ? data : (data.data || []));
      } catch (err) {
        console.error('Failed to load engagement index', err);
      } finally {
        setLoadingEngagementIndex(false);
      }
    };
    fetchEngagementIndex();
  }, [token]);

  if (!user) return null;

  return (
    <Layout>
      <div className="p-4 md:p-8 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">Bem-vindo, {user.name.split(' ')[0]}!</h1>
            <p className="text-zinc-500 dark:text-zinc-400">Veja como o seu time está se saindo hoje</p>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="Usuários Ativos"
            value={stats.active_users ? String(stats.active_users.value) : loadingStats ? 'Carregando...' : '-'}
            change={stats.active_users && stats.active_users.growth_percentage !== null && stats.active_users.growth_percentage !== undefined ? `${stats.active_users.growth_percentage > 0 ? '+' : ''}${stats.active_users.growth_percentage}%` : '--'}
            positive={!!(stats.active_users && typeof stats.active_users.growth_percentage === 'number' && stats.active_users.growth_percentage > 0)}
          />

          <StatCard
            label="Engajamento Geral"
            value={stats.engagement ? String(stats.engagement.value) : loadingStats ? 'Carregando...' : '-'}
            change={stats.engagement && stats.engagement.growth_percentage !== null && stats.engagement.growth_percentage !== undefined ? `${stats.engagement.growth_percentage > 0 ? '+' : ''}${stats.engagement.growth_percentage}%` : '--'}
            positive={!!(stats.engagement && typeof stats.engagement.growth_percentage === 'number' && stats.engagement.growth_percentage > 0)}
          />

          <StatCard
            label={`${(coinName || 'coins').charAt(0).toUpperCase() + (coinName || 'coins').slice(1)} Geradas`}
            value={stats.coins_generated ? String(stats.coins_generated.value) : loadingStats ? 'Carregando...' : '-'}
            change={stats.coins_generated && stats.coins_generated.growth_percentage !== null && stats.coins_generated.growth_percentage !== undefined ? `${stats.coins_generated.growth_percentage > 0 ? '+' : ''}${stats.coins_generated.growth_percentage}%` : '--'}
            positive={!!(stats.coins_generated && typeof stats.coins_generated.growth_percentage === 'number' && stats.coins_generated.growth_percentage > 0)}
          />

          <StatCard
            label="Resgates Realizados"
            value={stats.redemptions ? String(stats.redemptions.value) : loadingStats ? 'Carregando...' : '-'}
            change={stats.redemptions && stats.redemptions.growth_percentage !== null && stats.redemptions.growth_percentage !== undefined ? `${stats.redemptions.growth_percentage > 0 ? '+' : ''}${stats.redemptions.growth_percentage}%` : '--'}
            positive={!!(stats.redemptions && typeof stats.redemptions.growth_percentage === 'number' && stats.redemptions.growth_percentage > 0)}
          />
        </div>

        {/* Top Colaboradores - lista com barras de progresso */}
        <div className="mt-6">

          <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl shadow-sm border border-zinc-100 dark:border-zinc-800 transition-colors duration-200">
              <h3 className="font-bold text-lg mb-6 flex items-center gap-2 text-zinc-900 dark:text-white">Top Jogadores</h3>
            {loadingTop ? (
              <div className="text-zinc-400">Carregando...</div>
            ) : (
              (() => {
                // Prepare top 3 ordered by position
                const podium = [...top].sort((a, b) => a.position - b.position).slice(0, 3);
                const maxCoins = podium.length ? Math.max(...podium.map(p => p.total_coins)) : 1;
                const fmt = (n: number) => new Intl.NumberFormat('pt-BR').format(n);

                return (
                  <div className="space-y-6">
                    {podium.map((p) => {
                      const percent = Math.round((p.total_coins / (maxCoins || 1)) * 100);
                      const medal = p.position === 1 ? '🥇' : p.position === 2 ? '🥈' : '🥉';
                      return (
                        <div key={p.user_id}>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <span className="text-xl">{medal}</span>
                              <div className="flex items-center gap-3">
                                <div className="w-14 h-14 bg-gradient-to-br from-emerald-100 to-teal-100 dark:from-emerald-900/30 dark:to-teal-900/30 rounded-full flex items-center justify-center text-emerald-600 dark:text-emerald-400 overflow-hidden border-2 border-emerald-200 dark:border-emerald-800 flex-shrink-0">
                                  {p.profile_image_url ? (
                                    <img src={getFullImageUrl(p.profile_image_url) || ''} alt={p.name} className="w-full h-full object-cover" />
                                  ) : (
                                    <User size={28} />
                                  )}
                                </div>
                                <span className="text-sm font-medium text-zinc-900 dark:text-white">{p.name}</span>
                              </div>
                            </div>
                            <div className="text-sm font-semibold text-zinc-900 dark:text-white">{fmt(p.total_coins)} {coinName || 'coins'}</div>
                          </div>
                          <div className="mt-2 h-3 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                            <div className="h-full bg-emerald-500 dark:bg-emerald-600" style={{ width: `${percent}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()
            )}
          </div>
        </div>

        {/* Info Section */}
        {/* Active Campaigns Section */}
        <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl shadow-sm border border-zinc-100 dark:border-zinc-800 transition-colors duration-200">
          <h3 className="font-bold text-lg mb-4 flex items-center gap-2 text-zinc-900 dark:text-white">Campanhas</h3>
          {loadingCampaigns ? (
            <div className="text-zinc-400">Carregando...</div>
          ) : (
            <div className="space-y-4">
              {campaigns.map(c => {
                const fmt = (n: number) => new Intl.NumberFormat('pt-BR').format(n);
                const participantLabel = c.type === 'sales' ? 'vendedores' : 'colaboradores';
                const goalLabel = c.type === 'engagement' ? `${fmt(c.goal)} ${coinName || 'coins'}` : fmt(c.goal);
                return (
                  <div key={c.id} className="p-3 bg-zinc-50 dark:bg-zinc-800 rounded-lg">
                    <div className="font-semibold dark:text-white">{c.name}</div>
                    <div className="text-sm text-zinc-600 dark:text-zinc-400">Meta: {goalLabel}</div>
                    <div className="text-sm text-zinc-600 dark:text-zinc-400">
                      <div className="flex items-center gap-3">
                        <span>Progresso:</span>
                        <div className="flex-1">
                          <div className="w-full h-3 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                            <div className="h-full bg-emerald-500 dark:bg-emerald-600" style={{ width: `${c.progress_percentage}%` }} />
                          </div>
                        </div>
                        <span className="w-12 text-right">{c.progress_percentage}%</span>
                      </div>
                    </div>
                    <div className="text-sm text-zinc-600 dark:text-zinc-400">Participantes: {fmt(c.participants_count)} {participantLabel}</div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
        {/* Engagement Index per store */}
        <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl shadow-sm border border-zinc-100 dark:border-zinc-800 transition-colors duration-200">
          <h3 className="font-bold text-lg mb-4 text-zinc-900 dark:text-white">Índice de Engajamento por Loja</h3>
          {loadingEngagementIndex ? (
            <div className="text-zinc-400">Carregando...</div>
          ) : (
            (() => {
              if (!engagementIndex.length) return <div className="text-zinc-500">Nenhuma loja encontrada</div>;
              const maxScore = Math.max(...engagementIndex.map(e => e.score));
              const fmt = (n: number) => new Intl.NumberFormat('pt-BR').format(n);
              return (
                <div className="space-y-3">
                  {engagementIndex.map(store => (
                    <div key={store.store_id} className="p-3 bg-zinc-50 dark:bg-zinc-800 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <div className="font-semibold text-sm text-zinc-900 dark:text-white">{store.store_name}</div>
                        <div className="text-xs text-zinc-600 dark:text-zinc-400">Pontuação: {fmt(store.score)} • {fmt(store.participants)} participantes</div>
                      </div>
                      <div className="relative">
                        <div className="w-full h-4 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                          <div className="h-full bg-emerald-500 dark:bg-emerald-600 transition-all" style={{ width: `${(store.score / (maxScore || 1)) * 100}%` }} />
                        </div>
                        {/* Tooltip on hover - show breakdown */}
                        <div className="absolute left-0 top-0 w-full h-full">
                          <div className="w-full h-full" title={JSON.stringify(store.breakdown)}>
                            {/* Invisible overlay to enable hover */}
                          </div>
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
                                <span>{fmt(v)}</span>
                              </div>
                            ));
                          })()}
                        </div>
                      </details>
                    </div>
                  ))}
                </div>
              );
            })()
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white dark:bg-zinc-900 p-6 rounded-2xl shadow-sm border border-zinc-100 dark:border-zinc-800 transition-colors duration-200">
            <h3 className="font-bold text-lg mb-4 flex items-center gap-2 text-zinc-900 dark:text-white">
              <TrendingUp size={20} className="text-emerald-600" />
              Gráfico de engajamento por ação
            </h3>
          </div>
        </div>
      </div>
    </Layout>
  );
};

const StatCard = ({ label, value, change, positive }: { label: string; value: string; change: string; positive?: boolean }) => (
  <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl shadow-sm border border-zinc-100 dark:border-zinc-800 transition-colors duration-200">
    <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-1">{label}</p>
    <div className="flex items-end justify-between">
      <h4 className="text-2xl font-bold text-zinc-900 dark:text-white">{value}</h4>
      <span className={`text-xs font-bold px-2 py-1 rounded-lg ${positive ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400' : 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400'}`}>
        {change}
      </span>
    </div>
  </div>
);
