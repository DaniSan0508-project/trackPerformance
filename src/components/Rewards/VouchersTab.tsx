import React, { useState, useEffect, useCallback } from 'react';
import { Search, Loader2, RefreshCw, ChevronLeft, ChevronRight, Ticket, User as UserIcon, Gift, Calendar, ExternalLink, MapPin, Filter, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../../context/AuthContext';
import { Voucher, VoucherStatus, User, Reward } from '../../types';
import { vouchersService, usersService, rewardsService } from '../../services';
import { useToast } from '../../context/ToastContext';

export const VouchersTab: React.FC = () => {
  const { token } = useAuth();
  const { addToast } = useToast();
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [fromItem, setFromItem] = useState(0);
  const [toItem, setToItem] = useState(0);

  // Filters state
  const [filters, setFilters] = useState({
    reward_id: '',
    user_id: '',
    status: '' as VoucherStatus | '',
    used_at_from: '',
    used_at_until: '',
    sort: '-used_at',
    per_page: 20,
  });

  const [users, setUsers] = useState<User[]>([]);
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [showFilters, setShowFilters] = useState(false);

  const fetchVouchers = useCallback(async (page = 1) => {
    if (!token) return;
    setLoading(true);
    try {
      const data = await vouchersService.getVouchers(token, page, filters);
      setVouchers(data.data);
      setCurrentPage(data.meta.current_page);
      setTotalPages(data.meta.last_page);
      setTotalItems(data.meta.total);
      setFromItem(data.meta.from);
      setToItem(data.meta.to);
    } catch (err: any) {
      console.error('Error fetching vouchers:', err);
      addToast('error', err.message || 'Não foi possível carregar os vouchers.');
    } finally {
      setLoading(false);
    }
  }, [token, filters, addToast]);

  const fetchInitialData = useCallback(async () => {
    if (!token) return;
    try {
      // Fetch users and rewards for dropdowns
      const [usersData, rewardsData] = await Promise.all([
        usersService.getAllUsersComplete(token),
        rewardsService.getRewards(token, 1, '') // Note: this might not get all if there are many, but it's a start
      ]);
      setUsers(usersData);
      setRewards(rewardsData.data || []);
    } catch (err) {
      console.error('Error fetching initial filter data:', err);
    }
  }, [token]);

  useEffect(() => {
    fetchVouchers(currentPage);
  }, [fetchVouchers, currentPage]);

  useEffect(() => {
    fetchInitialData();
  }, [fetchInitialData]);

  const handleFilterChange = (e: React.ChangeEvent<HTMLSelectElement | HTMLInputElement>) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
    setCurrentPage(1);
  };

  const clearFilters = () => {
    setFilters({
      reward_id: '',
      user_id: '',
      status: '',
      used_at_from: '',
      used_at_until: '',
      sort: '-used_at',
      per_page: 20,
    });
    setCurrentPage(1);
  };

  const getStatusBadge = (status: VoucherStatus) => {
    const styles: Record<VoucherStatus, string> = {
      generated: 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300',
      available: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
      redeemed: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
      validated: 'bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400',
      activated: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
      used: 'bg-zinc-800 text-white dark:bg-white dark:text-zinc-900',
      expired: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    };

    const labels: Record<VoucherStatus, string> = {
      generated: 'Gerado',
      available: 'Disponível',
      redeemed: 'Resgatado',
      validated: 'Validado',
      activated: 'Ativado',
      used: 'Utilizado',
      expired: 'Expirado',
    };

    return (
      <span className={`px-2 py-0.5 rounded-full text-xs font-bold uppercase ${styles[status]}`}>
        {labels[status]}
      </span>
    );
  };

  return (
    <div className="space-y-4">
      {/* Filters Toggle and Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-white flex items-center gap-2">
          <Ticket size={20} className="text-primary-600" />
          Histórico de Vouchers
        </h2>
        <div className="flex gap-2">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-sm font-medium transition-all ${
              showFilters 
                ? 'bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400' 
                : 'bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-700'
            }`}
          >
            <Filter size={18} />
            Filtros
          </button>
          <button
            onClick={() => fetchVouchers(currentPage)}
            className="bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 p-1.5 rounded-xl text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-all"
            title="Atualizar"
          >
            <RefreshCw size={20} className={loading ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {/* Filters Area */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-white dark:bg-zinc-900 p-4 rounded-2xl shadow-sm border border-zinc-100 dark:border-zinc-800 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* User Filter */}
                <div>
                  <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1 uppercase tracking-wider">
                    Usuário
                  </label>
                  <select
                    name="user_id"
                    value={filters.user_id}
                    onChange={handleFilterChange}
                    className="w-full p-2 border border-zinc-200 dark:border-zinc-700 rounded-xl bg-zinc-50 dark:bg-zinc-800 text-sm focus:ring-2 focus:ring-primary-500 outline-none text-zinc-900 dark:text-white"
                  >
                    <option value="">Todos</option>
                    {users.map(user => (
                      <option key={user.id} value={user.id}>{user.name}</option>
                    ))}
                  </select>
                </div>

                {/* Status Filter */}
                <div>
                  <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1 uppercase tracking-wider">
                    Situação
                  </label>
                  <select
                    name="status"
                    value={filters.status}
                    onChange={handleFilterChange}
                    className="w-full p-2 border border-zinc-200 dark:border-zinc-700 rounded-xl bg-zinc-50 dark:bg-zinc-800 text-sm focus:ring-2 focus:ring-primary-500 outline-none text-zinc-900 dark:text-white"
                  >
                    <option value="">Todos</option>
                    <option value="generated">Gerado</option>
                    <option value="available">Disponível</option>
                    <option value="redeemed">Resgatado</option>
                    <option value="validated">Validado</option>
                    <option value="activated">Ativado</option>
                    <option value="used">Utilizado</option>
                    <option value="expired">Expirado</option>
                  </select>
                </div>

                {/* Sort Filter */}
                <div>
                  <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1 uppercase tracking-wider">
                    Ordenação
                  </label>
                  <select
                    name="sort"
                    value={filters.sort}
                    onChange={handleFilterChange}
                    className="w-full p-2 border border-zinc-200 dark:border-zinc-700 rounded-xl bg-zinc-50 dark:bg-zinc-800 text-sm focus:ring-2 focus:ring-primary-500 outline-none text-zinc-900 dark:text-white"
                  >
                    <option value="-used_at">Uso (mais recente)</option>
                    <option value="used_at">Uso (mais antigo)</option>
                    <option value="-created_at">Criação (mais recente)</option>
                    <option value="created_at">Criação (mais antigo)</option>
                  </select>
                </div>

                {/* Date From */}
                <div>
                  <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1 uppercase tracking-wider">
                    Usado De
                  </label>
                  <input
                    type="date"
                    name="used_at_from"
                    value={filters.used_at_from}
                    onChange={handleFilterChange}
                    className="w-full p-2 border border-zinc-200 dark:border-zinc-700 rounded-xl bg-zinc-50 dark:bg-zinc-800 text-sm focus:ring-2 focus:ring-primary-500 outline-none text-zinc-900 dark:text-white"
                  />
                </div>

                {/* Date Until */}
                <div>
                  <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1 uppercase tracking-wider">
                    Usado Até
                  </label>
                  <input
                    type="date"
                    name="used_at_until"
                    value={filters.used_at_until}
                    onChange={handleFilterChange}
                    className="w-full p-2 border border-zinc-200 dark:border-zinc-700 rounded-xl bg-zinc-50 dark:bg-zinc-800 text-sm focus:ring-2 focus:ring-primary-500 outline-none text-zinc-900 dark:text-white"
                  />
                </div>

                {/* Clear Button */}
                <div className="lg:col-start-4 flex items-end">
                  <button
                    onClick={clearFilters}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 rounded-xl text-sm font-medium hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
                  >
                    <X size={16} />
                    Limpar Filtros
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Vouchers List */}
      {loading && vouchers.length === 0 ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 text-primary-600 animate-spin" />
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {vouchers.map((voucher) => (
              <motion.div
                key={voucher.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white dark:bg-zinc-900 p-4 rounded-2xl shadow-sm border border-zinc-100 dark:border-zinc-800 flex flex-col gap-4 group"
              >
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-3">
                    <div className="bg-primary-100 dark:bg-primary-900/30 p-2.5 rounded-xl text-primary-600 dark:text-primary-400">
                      <Ticket size={24} />
                    </div>
                    <div>
                      <h3 className="font-mono font-bold text-zinc-900 dark:text-white text-sm">
                        {voucher.code}
                      </h3>
                      <div className="mt-1">
                        {getStatusBadge(voucher.status)}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 py-2 border-y border-zinc-100 dark:border-zinc-800">
                  <div className="space-y-1">
                    <p className="text-[10px] uppercase tracking-wider text-zinc-400 dark:text-zinc-500 font-bold flex items-center gap-1">
                      <UserIcon size={10} /> Usuário
                    </p>
                    <p className="text-sm font-medium text-zinc-700 dark:text-zinc-200 truncate" title={voucher.user.name}>
                      {voucher.user.name}
                    </p>
                  </div>
                  <div className="space-y-1 text-right">
                    <p className="text-[10px] uppercase tracking-wider text-zinc-400 dark:text-zinc-500 font-bold flex items-center gap-1 justify-end">
                      <Gift size={10} /> Recompensa
                    </p>
                    <p className="text-sm font-medium text-zinc-700 dark:text-zinc-200 truncate" title={voucher.reward.name}>
                      {voucher.reward.name}
                    </p>
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  {voucher.used_at && (
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5 text-zinc-500 dark:text-zinc-400">
                        <Calendar size={14} />
                        <span>Utilizado em: {new Date(voucher.used_at).toLocaleDateString('pt-BR')} às {new Date(voucher.used_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                      
                      {voucher.used_location && (
                        <a
                          href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${voucher.used_location.latitude},${voucher.used_location.longitude}`)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-primary-600 dark:text-primary-400 hover:underline font-medium"
                          title={`Lat: ${voucher.used_location.latitude}, Long: ${voucher.used_location.longitude}`}
                        >
                          <MapPin size={14} />
                          Ver Local
                          <ExternalLink size={10} />
                        </a>
                      )}
                    </div>
                  )}

                  {!voucher.used_at && voucher.expires_at && (
                    <div className="flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400">
                      <Calendar size={14} />
                      <span>Expira em: {new Date(voucher.expires_at).toLocaleDateString('pt-BR')}</span>
                    </div>
                  )}
                </div>
              </motion.div>
            ))}

            {vouchers.length === 0 && (
              <div className="col-span-full text-center py-12 bg-white dark:bg-zinc-900 rounded-2xl border border-dashed border-zinc-200 dark:border-zinc-800 transition-colors duration-200">
                <Ticket className="w-12 h-12 text-zinc-300 dark:text-zinc-600 mx-auto mb-3" />
                <h3 className="text-lg font-medium text-zinc-900 dark:text-white">Nenhum voucher encontrado</h3>
                <p className="text-zinc-500 dark:text-zinc-400">Tente ajustar seus filtros de busca.</p>
              </div>
            )}
          </div>

          {/* Pagination */}
          {totalItems > 0 && (
            <div className="flex items-center justify-between bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-zinc-100 dark:border-zinc-800 transition-colors duration-200">
              <div className="text-sm text-zinc-500 dark:text-zinc-400">
                <span className="font-medium">{fromItem}</span>-{toItem} de <span className="font-medium">{totalItems}</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="p-1.5 border border-zinc-200 dark:border-zinc-700 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed text-zinc-600 dark:text-zinc-400"
                >
                  <ChevronLeft size={18} />
                </button>
                <span className="text-xs font-medium px-2 text-zinc-700 dark:text-zinc-300 whitespace-nowrap">
                  Pág {currentPage} / {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="p-1.5 border border-zinc-200 dark:border-zinc-700 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed text-zinc-600 dark:text-zinc-400"
                >
                  <ChevronRight size={18} />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
