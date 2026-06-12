import React, { useEffect, useState, useMemo } from 'react';
import { X, Loader2, Calendar, TrendingUp, Smile, Meh, Frown, Angry, Heart, ChevronLeft, ChevronRight, Filter } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { moodsService, MoodRecord } from '../../services/moods/moodsService';
import { User } from '../../types';
import { Chart, registerables } from 'chart.js';
import { Line } from 'react-chartjs-2';
import { format, subMonths, parse } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useTheme } from '../../context/ThemeContext';
import { hexToRgb } from '../../utils/colorUtils';

Chart.register(...registerables);

interface UserMoodModalProps {
  isOpen: boolean;
  user: User | null;
  token: string | null;
  onClose: () => void;
}

const moodValues = {
  very_good: 5,
  good: 4,
  neutral: 3,
  bad: 2,
  very_bad: 1,
};

const moodLabels = {
  very_good: 'Muito Bem',
  good: 'Bem',
  neutral: 'Neutro',
  bad: 'Mal',
  very_bad: 'Muito Mal',
};

const moodIcons = {
  very_good: <Heart className="text-pink-500" size={18} />,
  good: <Smile className="text-emerald-500" size={18} />,
  neutral: <Meh className="text-amber-500" size={18} />,
  bad: <Frown className="text-orange-500" size={18} />,
  very_bad: <Angry className="text-red-500" size={18} />,
};

const ITEMS_PER_PAGE = 5;

export const UserMoodModal: React.FC<UserMoodModalProps> = ({ isOpen, user, token, onClose }) => {
  const [loading, setLoading] = useState(false);
  const [moods, setMoods] = useState<MoodRecord[]>([]);
  const [activeRange, setActiveRange] = useState<'30' | '180' | 'custom'>('180');
  const [dateRange, setDateRange] = useState({
    start: format(subMonths(new Date(), 6), 'yyyy-MM-dd'),
    end: format(new Date(), 'yyyy-MM-dd'),
  });

  // Mood List States
  const [moodTypeFilter, setMoodTypeFilter] = useState<string | null>(null);
  const [listPage, setListPage] = useState(1);

  const fetchMoods = async () => {
    if (!token || !user) return;
    setLoading(true);
    try {
      const response = await moodsService.getMoods(token, {
        user_id: user.id,
        start_date: dateRange.start,
        end_date: dateRange.end,
        sort: 'recorded_at',
        per_page: 100, // We fetch up to 100 for the chart and local pagination
      });
      setMoods(response.data);
      setListPage(1);
    } catch (error) {
      console.error('Error fetching moods:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && user) {
      fetchMoods();
    }
  }, [isOpen, user, dateRange]);

  const handleRangeChange = (range: '30' | '180') => {
    setActiveRange(range);
    const months = range === '30' ? 1 : 6;
    setDateRange({
      start: format(subMonths(new Date(), months), 'yyyy-MM-dd'),
      end: format(new Date(), 'yyyy-MM-dd'),
    });
  };

  const handleCustomDateChange = (field: 'start' | 'end', value: string) => {
    setActiveRange('custom');
    setDateRange(prev => ({ ...prev, [field]: value }));
  };

  // Filtered and Paginated List Logic
  const filteredMoods = useMemo(() => {
    let result = [...moods].reverse(); // Most recent first
    if (moodTypeFilter) {
      result = result.filter(m => m.mood === moodTypeFilter);
    }
    return result;
  }, [moods, moodTypeFilter]);

  const paginatedMoods = useMemo(() => {
    const startIndex = (listPage - 1) * ITEMS_PER_PAGE;
    return filteredMoods.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredMoods, listPage]);

  const totalListPages = Math.ceil(filteredMoods.length / ITEMS_PER_PAGE);

  const { primaryColor } = useTheme();
  const primaryHex = primaryColor || '#10b981';
  const rgb = hexToRgb(primaryHex);
  const chartBgColor = rgb ? `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.1)` : 'rgba(16, 185, 129, 0.1)';

  const chartData = {
    labels: moods.map(m => {
        try {
            const date = parse(m.recorded_at, 'dd/MM/yyyy HH:mm', new Date());
            return format(date, 'dd/MM', { locale: ptBR });
        } catch {
            return m.recorded_at;
        }
    }),
    datasets: [
      {
        label: 'Nível de Humor',
        data: moods.map(m => moodValues[m.mood]),
        fill: true,
        backgroundColor: chartBgColor,
        borderColor: primaryHex,
        tension: 0.4,
        pointRadius: 6,
        pointBackgroundColor: moods.map(m => {
            if (m.mood === 'very_good') return '#ec4899';
            if (m.mood === 'good') return '#10b981';
            if (m.mood === 'neutral') return '#f59e0b';
            if (m.mood === 'bad') return '#f97316';
            return '#ef4444';
        }),
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: 'rgba(24, 24, 27, 0.9)',
        padding: 12,
        titleFont: { size: 14, weight: 'bold' },
        bodyFont: { size: 13 },
        callbacks: {
          label: (context: any) => {
            const moodKey = Object.keys(moodValues).find(
              key => moodValues[key as keyof typeof moodValues] === context.parsed.y
            );
            const record = moods[context.dataIndex];
            return [
                ` Humor: ${moodLabels[moodKey as keyof typeof moodLabels]}`,
                record.reason ? ` Motivo: ${record.reason}` : ''
            ];
          },
        },
      },
    },
    scales: {
      y: {
        min: 0.5,
        max: 5.5,
        grid: { color: 'rgba(161, 161, 170, 0.1)' },
        ticks: {
          stepSize: 1,
          color: '#a1a1aa',
          callback: (value: any) => {
            const moodKey = Object.keys(moodValues).find(
              key => moodValues[key as keyof typeof moodValues] === value
            );
            return moodKey ? moodLabels[moodKey as keyof typeof moodLabels] : '';
          },
        },
      },
      x: {
        grid: { display: false },
        ticks: { color: '#a1a1aa' }
      }
    },
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="bg-white dark:bg-zinc-900 rounded-3xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh] border border-zinc-200 dark:border-zinc-800"
        >
          {/* Header */}
          <div className="p-6 border-b border-zinc-100 dark:border-zinc-800 flex justify-between items-center bg-zinc-50/50 dark:bg-zinc-800/50">
            <div className="flex items-center gap-4">
              <div className="bg-primary-50 dark:bg-primary-900/30 p-3 rounded-2xl transition-colors">
                <TrendingUp className="text-primary-600 dark:text-primary-400" size={24} />
              </div>
              <div>
                <h2 className="text-xl font-bold text-zinc-900 dark:text-white">Acompanhamento de Humor</h2>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">{user?.name}</p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition-colors">
              <X size={24} className="text-zinc-400" />
            </button>
          </div>

          <div className="p-6 overflow-y-auto space-y-6 custom-scrollbar">
            {/* Range Filters */}
            <div className="flex flex-wrap items-center gap-4 bg-zinc-50 dark:bg-zinc-800/50 p-4 rounded-2xl border border-zinc-100 dark:border-zinc-800 transition-colors">
              <div className="flex items-center gap-2">
                <Calendar size={18} className="text-zinc-400" />
                <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Período:</span>
              </div>
              
              <div className="flex items-center gap-2 bg-white dark:bg-zinc-800 p-1 rounded-xl border border-zinc-200 dark:border-zinc-700 shadow-sm transition-colors">
                <input
                  type="date"
                  value={dateRange.start}
                  onChange={(e) => handleCustomDateChange('start', e.target.value)}
                  className="bg-transparent text-zinc-900 dark:text-zinc-100 px-2 py-1 text-sm outline-none focus:ring-1 focus:ring-primary-500 rounded-lg transition-colors"
                />
                <span className="text-zinc-400 text-xs font-bold uppercase">até</span>
                <input
                  type="date"
                  value={dateRange.end}
                  onChange={(e) => handleCustomDateChange('end', e.target.value)}
                  className="bg-transparent text-zinc-900 dark:text-zinc-100 px-2 py-1 text-sm outline-none focus:ring-1 focus:ring-primary-500 rounded-lg transition-colors"
                />
              </div>
              
              <div className="flex-1" />
              
              <div className="flex gap-2">
                <button 
                  onClick={() => handleRangeChange('30')}
                  className={`px-4 py-2 text-xs font-bold rounded-xl border transition-all duration-200 ${
                    activeRange === '30'
                      ? 'bg-primary-600 text-white border-primary-600 shadow-lg shadow-primary-500/30'
                      : 'bg-white dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-700'
                  }`}
                >
                  30 dias
                </button>
                <button 
                  onClick={() => handleRangeChange('180')}
                  className={`px-4 py-2 text-xs font-bold rounded-xl border transition-all duration-200 ${
                    activeRange === '180'
                      ? 'bg-primary-600 text-white border-primary-600 shadow-lg shadow-primary-500/30'
                      : 'bg-white dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-700'
                  }`}
                >
                  6 meses
                </button>
              </div>
            </div>

            {loading ? (
              <div className="h-80 flex flex-col items-center justify-center gap-4">
                <Loader2 className="animate-spin text-primary-500" size={48} />
                <p className="text-zinc-500 font-medium animate-pulse">Carregando...</p>
              </div>
            ) : moods.length > 0 ? (
              <>
                {/* Chart Area */}
                <div className="h-80 bg-white dark:bg-zinc-900/50 p-6 rounded-[2rem] border border-zinc-100 dark:border-zinc-800 shadow-inner transition-colors">
                  <Line data={chartData} options={chartOptions as any} />
                </div>

                {/* History Section */}
                <div className="space-y-4 pt-4 border-t border-zinc-100 dark:border-zinc-800">
                  <div className="flex flex-wrap items-center justify-between gap-4 px-2">
                    <div className="flex items-center gap-2">
                        <h3 className="text-xs font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-[0.2em]">Histórico</h3>
                        <div className="h-4 w-[1px] bg-zinc-200 dark:border-zinc-800" />
                        <span className="text-[10px] bg-zinc-100 dark:bg-zinc-800 text-zinc-500 px-2 py-0.5 rounded-full font-bold">
                            {filteredMoods.length} itens
                        </span>
                    </div>

                    {/* Mood Filter Pills */}
                    <div className="flex items-center gap-1.5 bg-zinc-50 dark:bg-zinc-800/50 p-1 rounded-xl border border-zinc-100 dark:border-zinc-800">
                        <button 
                            onClick={() => { setMoodTypeFilter(null); setListPage(1); }}
                            className={`p-1.5 rounded-lg transition-all ${!moodTypeFilter ? 'bg-white dark:bg-zinc-700 shadow-sm ring-1 ring-zinc-200 dark:ring-zinc-600' : 'text-zinc-400 hover:text-zinc-600'}`}
                            title="Todos"
                        >
                            <Filter size={14} />
                        </button>
                        {Object.entries(moodIcons).map(([key, icon]) => (
                            <button
                                key={key}
                                onClick={() => { setMoodTypeFilter(key); setListPage(1); }}
                                className={`p-1.5 rounded-lg transition-all ${moodTypeFilter === key ? 'bg-white dark:bg-zinc-700 shadow-sm ring-1 ring-zinc-200 dark:ring-zinc-600' : 'opacity-40 hover:opacity-100'}`}
                                title={moodLabels[key as keyof typeof moodLabels]}
                            >
                                {icon}
                            </button>
                        ))}
                    </div>
                  </div>
                  
                  {/* List */}
                  <div className="min-h-[300px] space-y-3">
                    {paginatedMoods.length > 0 ? (
                      paginatedMoods.map((mood) => (
                        <motion.div 
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          key={mood.id} 
                          className="bg-zinc-50/50 dark:bg-zinc-800/30 p-4 rounded-2xl border border-zinc-100/50 dark:border-zinc-800/50 flex items-center gap-4 hover:border-primary-500/30 transition-colors group"
                        >
                          <div className="bg-white dark:bg-zinc-800 p-3 rounded-xl shadow-sm">
                            {moodIcons[mood.mood]}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-center mb-1">
                              <span className="font-bold text-zinc-900 dark:text-white text-sm">{moodLabels[mood.mood]}</span>
                              <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-bold bg-white dark:bg-zinc-900 px-2 py-0.5 rounded-full shadow-sm">
                                  {mood.recorded_at}
                              </span>
                            </div>
                            <p className="text-xs text-zinc-600 dark:text-zinc-400 italic line-clamp-1 group-hover:line-clamp-none transition-all">
                              {mood.reason ? `"${mood.reason}"` : 'Sem motivo registrado'}
                            </p>
                          </div>
                        </motion.div>
                      ))
                    ) : (
                      <div className="py-12 text-center">
                        <p className="text-zinc-400 text-sm">Nenhum registro encontrado para este filtro.</p>
                      </div>
                    )}
                  </div>

                  {/* Pagination Controls */}
                  {totalListPages > 1 && (
                    <div className="flex items-center justify-between px-2 pt-2">
                        <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
                            Página {listPage} de {totalListPages}
                        </span>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setListPage(p => Math.max(1, p - 1))}
                                disabled={listPage === 1}
                                className="p-2 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl disabled:opacity-30 hover:bg-zinc-50 transition-colors"
                            >
                                <ChevronLeft size={16} />
                            </button>
                            <button
                                onClick={() => setListPage(p => Math.min(totalListPages, p + 1))}
                                disabled={listPage === totalListPages}
                                className="p-2 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl disabled:opacity-30 hover:bg-zinc-50 transition-colors"
                            >
                                <ChevronRight size={16} />
                            </button>
                        </div>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="h-80 flex flex-col items-center justify-center text-center p-8 bg-zinc-50/50 dark:bg-zinc-800/30 rounded-[2.5rem] border-2 border-dashed border-zinc-200 dark:border-zinc-800">
                <Meh size={48} className="text-zinc-300 dark:text-zinc-500 mb-4" />
                <h3 className="text-xl font-bold text-zinc-900 dark:text-white">Sem dados no radar</h3>
                <p className="text-zinc-500 dark:text-zinc-400 max-w-xs mx-auto mt-2">
                  Não encontramos nenhum registro de humor para este colaborador no período selecionado.
                </p>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
