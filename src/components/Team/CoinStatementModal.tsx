import React, { useState, useEffect } from 'react';
import { User, CoinStatementResponse, CoinStatement } from '../../types';
import { coinsService } from '../../services/coins/coinsService';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';
import { Calendar, TrendingUp, TrendingDown, ChevronLeft, ChevronRight, Search, X, Filter } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { formatDate } from '../../utils';

interface CoinStatementModalProps {
  isOpen: boolean;
  user: User | null;
  token: string | null;
  onClose: () => void;
}

/**
 * Modal de Extrato de Moedas do Usuário
 */
export const CoinStatementModal: React.FC<CoinStatementModalProps> = ({
  isOpen,
  user,
  token,
  onClose,
}) => {
  const { addToast } = useToast();
  const { coinName } = useAuth();
  
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<CoinStatementResponse | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [filters, setFilters] = useState({
    start_date: '',
    end_date: '',
  });

  // Busca extrato quando modal abre ou muda página/filtros
  useEffect(() => {
    if (isOpen && user && token) {
      fetchStatements();
    }
  }, [isOpen, currentPage, filters]);

  const fetchStatements = async () => {
    if (!user || !token) return;
    
    setLoading(true);
    try {
      const response = await coinsService.getCoinStatements(token, user.id, currentPage, filters);
      setData(response);
    } catch (error: any) {
      console.error('Error fetching coin statements:', error);
      addToast('error', error.message || 'Erro ao carregar extrato.');
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (field: string, value: string) => {
    setFilters(prev => ({ ...prev, [field]: value }));
    setCurrentPage(1); // Reset para página 1 ao mudar filtro
  };

  const clearFilters = () => {
    setFilters({ start_date: '', end_date: '' });
    setCurrentPage(1);
  };

  const formatOperation = (operation: 'credit' | 'debit') => {
    return operation === 'credit' ? 'Crédito' : 'Débito';
  };

  const getOperationColor = (operation: 'credit' | 'debit') => {
    return operation === 'credit' 
      ? 'text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-900/20' 
      : 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20';
  };

  const getOperationIcon = (operation: 'credit' | 'debit') => {
    return operation === 'credit' ? <TrendingUp size={16} /> : <TrendingDown size={16} />;
  };

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
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col border border-zinc-200 dark:border-zinc-800"
          >
            {/* Header */}
            <div className="p-6 border-b border-zinc-100 dark:border-zinc-800 flex justify-between items-start flex-shrink-0 bg-white dark:bg-zinc-900 rounded-t-2xl z-10">
              <div className="flex-1">
                <h2 className="text-xl font-bold text-zinc-900 dark:text-white">
                  Extrato de {coinName.charAt(0).toUpperCase() + coinName.slice(1)} - {user?.name || ''}
                </h2>
              </div>
              <button
                onClick={onClose}
                className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors ml-4"
              >
                <X size={24} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1 min-h-0">
              <div className="space-y-6">
        {/* Resumo */}
        {data?.summary && (
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-800 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp size={20} className="text-primary-600 dark:text-primary-400" />
                <span className="text-sm font-medium text-primary-700 dark:text-primary-400">Total Créditos</span>
              </div>
              <p className="text-2xl font-bold text-primary-700 dark:text-primary-400">
                {data.summary.total_credits.toLocaleString('pt-BR')} 🪙
              </p>
            </div>
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <TrendingDown size={20} className="text-red-600 dark:text-red-400" />
                <span className="text-sm font-medium text-red-700 dark:text-red-400">Total Débitos</span>
              </div>
              <p className="text-2xl font-bold text-red-700 dark:text-red-400">
                {data.summary.total_debits.toLocaleString('pt-BR')} 🪙
              </p>
            </div>
          </div>
        )}

        {/* Filtros */}
        <div className="bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Filter size={18} className="text-zinc-500 dark:text-zinc-400" />
              <span className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">Filtros</span>
            </div>
            {(filters.start_date || filters.end_date) && (
              <button
                onClick={clearFilters}
                className="text-xs text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300 flex items-center gap-1"
              >
                <X size={12} />
                Limpar filtros
              </button>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">
                Data inicial
              </label>
              <div className="relative">
                <Calendar size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--color-primary-500)] dark:text-[var(--color-primary-400)] pointer-events-none z-10" />
                <input
                  type="date"
                  value={filters.start_date}
                  onChange={(e) => handleFilterChange('start_date', e.target.value)}
                  className="w-full pl-8 pr-2.5 py-2 border border-zinc-300 dark:border-zinc-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white text-sm [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:inset-0 [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:cursor-pointer"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">
                Data final
              </label>
              <div className="relative">
                <Calendar size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--color-primary-500)] dark:text-[var(--color-primary-400)] pointer-events-none z-10" />
                <input
                  type="date"
                  value={filters.end_date}
                  onChange={(e) => handleFilterChange('end_date', e.target.value)}
                  className="w-full pl-8 pr-2.5 py-2 border border-zinc-300 dark:border-zinc-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white text-sm [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:inset-0 [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:cursor-pointer"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Lista de Movimentações */}
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 text-primary-600 animate-spin rounded-full border-4 border-primary-200 border-t-primary-600" />
          </div>
        ) : data?.data && data.data.length > 0 ? (
          <>
            <div className="space-y-2">
              {data.data.map((statement) => (
                <div
                  key={statement.id}
                  className="bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl p-4 hover:shadow-md transition-all"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 flex-1">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${getOperationColor(statement.operation)}`}>
                        {getOperationIcon(statement.operation)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-zinc-900 dark:text-white text-sm">
                          {statement.description}
                        </p>
                        <div className="flex items-center gap-3 mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                          <span className="flex items-center gap-1 text-[var(--color-primary-600)] dark:text-[var(--color-primary-400)]">
                            <Calendar size={12} />
                            {statement.date}
                          </span>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getOperationColor(statement.operation)}`}>
                            {formatOperation(statement.operation)}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className={`text-lg font-bold ${statement.operation === 'credit' ? 'text-primary-600 dark:text-primary-400' : 'text-red-600 dark:text-red-400'}`}>
                        {statement.operation === 'credit' ? '+' : '-'}{statement.value.toLocaleString('pt-BR')} 🪙
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Paginação */}
            {data.last_page > 1 && (
              <div className="flex items-center justify-center gap-2 pt-4 border-t border-zinc-200 dark:border-zinc-700 sticky bottom-0 bg-white dark:bg-zinc-900 py-2">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="p-2 rounded-lg border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft size={16} />
                </button>
                <span className="text-sm text-zinc-600 dark:text-zinc-400 font-medium px-4">
                  Página {currentPage} de {data.last_page}
                </span>
                <button
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, data.last_page))}
                  disabled={currentPage === data.last_page}
                  className="p-2 rounded-lg border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-12 text-zinc-500 dark:text-zinc-400">
            <Calendar size={48} className="mx-auto mb-3 opacity-50" />
            <p className="font-medium">Nenhuma movimentação encontrada</p>
            <p className="text-sm mt-1">
              {filters.start_date || filters.end_date
                ? 'Tente ajustar os filtros de data.'
                : `Este usuário ainda não tem movimentações de ${coinName}.`}
            </p>
          </div>
        )}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
