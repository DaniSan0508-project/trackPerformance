import React, { useState, useEffect, useCallback } from 'react';
import { Layout } from '../components/Layout';
import { Search, Loader2, RefreshCw, ChevronLeft, ChevronRight, ShoppingBag, Package, Coins, Images as ImagesIcon, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../context/AuthContext';
import { Reward } from '../types';
import { api } from '../services/api';

// Utility for debouncing
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);
  return debouncedValue;
}

export const RewardsPage: React.FC = () => {
  const { token } = useAuth();
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 500);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [fromItem, setFromItem] = useState(0);
  const [toItem, setToItem] = useState(0);

  // Modal state
  const [selectedReward, setSelectedReward] = useState<Reward | null>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  const fetchRewards = useCallback(async (page = 1, search = '') => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const data = await api.getRewards(token, page, search);
      setRewards(data.data);
      setCurrentPage(data.meta.current_page);
      setTotalPages(data.meta.last_page);
      setTotalItems(data.meta.total);
      setFromItem(data.meta.from);
      setToItem(data.meta.to);
    } catch (err: any) {
      console.error('Error fetching rewards:', err);
      setError(err.message || 'Não foi possível carregar a loja de prêmios.');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchRewards(currentPage, debouncedSearchTerm);
  }, [fetchRewards, currentPage, debouncedSearchTerm]);

  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearchTerm]);

  const handleOpenReward = (reward: Reward) => {
    setSelectedReward(reward);
    setCurrentImageIndex(0);
  };

  const handleCloseModal = () => {
    setSelectedReward(null);
  };

  const getRewardImages = (reward: Reward) => {
    if (reward.images && reward.images.length > 0) return reward.images;
    if (reward.primary_image) return [reward.primary_image];
    return [];
  };

  const handlePrevImage = (e: React.MouseEvent, imagesLength: number) => {
    e.stopPropagation();
    setCurrentImageIndex((prev) => (prev === 0 ? imagesLength - 1 : prev - 1));
  };

  const handleNextImage = (e: React.MouseEvent, imagesLength: number) => {
    e.stopPropagation();
    setCurrentImageIndex((prev) => (prev === imagesLength - 1 ? 0 : prev + 1));
  };

  return (
    <Layout>
      <div className="p-4 md:p-8 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">Loja de Prêmios</h1>
            <p className="text-zinc-500 dark:text-zinc-400">Troque suas moedas por prêmios incríveis.</p>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={() => fetchRewards(currentPage, searchTerm)}
              className="bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 p-2 rounded-xl text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-all"
              title="Atualizar"
            >
              <RefreshCw size={20} className={loading ? "animate-spin" : ""} />
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white dark:bg-zinc-900 p-4 rounded-2xl shadow-sm border border-zinc-100 dark:border-zinc-800 flex flex-col md:flex-row gap-4 items-center transition-colors duration-200">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-zinc-400" size={20} />
            <input 
              type="text" 
              placeholder="Buscar prêmios..." 
              className="w-full pl-10 pr-4 py-2 border border-zinc-200 dark:border-zinc-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-500"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {/* Rewards List */}
        {loading && rewards.length === 0 ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
          </div>
        ) : error ? (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 p-4 rounded-xl text-center">
            {error}
            <button onClick={() => fetchRewards(currentPage, searchTerm)} className="block mx-auto mt-2 text-sm font-semibold hover:underline">
              Tentar novamente
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {rewards.map((reward) => {
                const images = getRewardImages(reward);
                const hasMultipleImages = images.length > 1;
                
                return (
                  <motion.div 
                    key={reward.id}
                    layoutId={`reward-${reward.id}`}
                    onClick={() => handleOpenReward(reward)}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-zinc-100 dark:border-zinc-800 hover:shadow-md transition-all duration-200 flex flex-col overflow-hidden group cursor-pointer"
                  >
                    {/* Image */}
                    <div className="aspect-square bg-zinc-100 dark:bg-zinc-800 relative overflow-hidden">
                      {images.length > 0 ? (
                        <img 
                          src={images[0].image_full_url} 
                          alt={reward.name} 
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-zinc-300 dark:text-zinc-600">
                          <Package size={48} />
                        </div>
                      )}
                      
                      {!reward.is_active && (
                        <div className="absolute top-2 right-2 bg-zinc-800/80 text-white text-xs font-bold px-2 py-1 rounded-lg backdrop-blur-sm z-10">
                          Indisponível
                        </div>
                      )}

                      {hasMultipleImages && (
                        <div className="absolute bottom-2 right-2 bg-black/60 text-white text-xs font-medium px-2 py-1 rounded-full flex items-center gap-1.5 backdrop-blur-sm z-10">
                          <ImagesIcon size={12} />
                          <span>{images.length}</span>
                        </div>
                      )}
                    </div>

                    {/* Content */}
                    <div className="p-4 flex flex-col flex-1">
                      <h3 className="font-bold text-zinc-900 dark:text-white line-clamp-1 mb-1" title={reward.name}>{reward.name}</h3>
                      <p className="text-sm text-zinc-500 dark:text-zinc-400 line-clamp-2 mb-4 flex-1" title={reward.description}>
                        {reward.description}
                      </p>
                      
                      <div className="flex items-center justify-between mt-auto">
                        <div className="flex items-center gap-1.5 text-amber-500 font-bold">
                          <Coins size={18} className="fill-current" />
                          <span>{parseFloat(reward.price_coins as string).toLocaleString('pt-BR', { minimumFractionDigits: 0 })}</span>
                        </div>
                        <div className="text-xs text-zinc-400 dark:text-zinc-500">
                          {reward.stock > 0 ? `${reward.stock} em estoque` : 'Esgotado'}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>

            {rewards.length === 0 && (
              <div className="text-center py-12 bg-white dark:bg-zinc-900 rounded-2xl border border-dashed border-zinc-200 dark:border-zinc-800 transition-colors duration-200">
                <ShoppingBag className="w-12 h-12 text-zinc-300 dark:text-zinc-600 mx-auto mb-3" />
                <h3 className="text-lg font-medium text-zinc-900 dark:text-white">Nenhum prêmio encontrado</h3>
                <p className="text-zinc-500 dark:text-zinc-400">Tente ajustar seus filtros de busca.</p>
              </div>
            )}

            {/* Pagination Controls */}
            {totalItems > 0 && (
              <div className="flex items-center justify-between bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-zinc-100 dark:border-zinc-800 transition-colors duration-200">
                <div className="text-sm text-zinc-500 dark:text-zinc-400">
                  Mostrando <span className="font-medium">{fromItem}</span> até <span className="font-medium">{toItem}</span> de <span className="font-medium">{totalItems}</span> resultados
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className="p-2 border border-zinc-200 dark:border-zinc-700 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed text-zinc-600 dark:text-zinc-400"
                  >
                    <ChevronLeft size={20} />
                  </button>
                  <span className="text-sm font-medium px-2 text-zinc-700 dark:text-zinc-300">
                    Página {currentPage} de {totalPages}
                  </span>
                  <button
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    className="p-2 border border-zinc-200 dark:border-zinc-700 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed text-zinc-600 dark:text-zinc-400"
                  >
                    <ChevronRight size={20} />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Reward Detail Modal */}
        <AnimatePresence>
          {selectedReward && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={handleCloseModal}>
              <motion.div 
                layoutId={`reward-${selectedReward.id}`}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col md:flex-row max-h-[90vh] border border-zinc-200 dark:border-zinc-800"
              >
                {/* Image Gallery Section */}
                <div className="w-full md:w-1/2 bg-zinc-100 dark:bg-zinc-800 flex flex-col">
                  <div className="relative flex-1 bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center overflow-hidden min-h-[300px]">
                    {getRewardImages(selectedReward).length > 0 ? (
                      <>
                        <motion.img 
                          key={currentImageIndex}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ duration: 0.3 }}
                          src={getRewardImages(selectedReward)[currentImageIndex].image_full_url} 
                          alt={selectedReward.name} 
                          className="w-full h-full object-contain"
                        />
                        
                        {getRewardImages(selectedReward).length > 1 && (
                          <>
                            <button 
                              onClick={(e) => handlePrevImage(e, getRewardImages(selectedReward).length)}
                              className="absolute left-4 top-1/2 -translate-y-1/2 p-2 bg-white/80 dark:bg-black/50 hover:bg-white dark:hover:bg-black/70 rounded-full shadow-lg text-zinc-800 dark:text-white transition-all"
                            >
                              <ChevronLeft size={24} />
                            </button>
                            <button 
                              onClick={(e) => handleNextImage(e, getRewardImages(selectedReward).length)}
                              className="absolute right-4 top-1/2 -translate-y-1/2 p-2 bg-white/80 dark:bg-black/50 hover:bg-white dark:hover:bg-black/70 rounded-full shadow-lg text-zinc-800 dark:text-white transition-all"
                            >
                              <ChevronRight size={24} />
                            </button>
                          </>
                        )}
                      </>
                    ) : (
                      <Package size={64} className="text-zinc-300 dark:text-zinc-600" />
                    )}
                  </div>

                  {/* Thumbnails */}
                  {getRewardImages(selectedReward).length > 1 && (
                    <div className="p-4 bg-white dark:bg-zinc-900 border-t border-zinc-100 dark:border-zinc-800 overflow-x-auto">
                      <div className="flex gap-2 justify-center">
                        {getRewardImages(selectedReward).map((img, idx) => (
                          <button
                            key={img.id}
                            onClick={() => setCurrentImageIndex(idx)}
                            className={`relative w-16 h-16 rounded-lg overflow-hidden border-2 transition-all flex-shrink-0 ${
                              currentImageIndex === idx ? 'border-emerald-500 ring-2 ring-emerald-100 dark:ring-emerald-900/30' : 'border-transparent opacity-60 hover:opacity-100'
                            }`}
                          >
                            <img src={img.image_full_url} alt="" className="w-full h-full object-cover" />
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Details Section */}
                <div className="w-full md:w-1/2 flex flex-col bg-white dark:bg-zinc-900">
                  <div className="p-6 border-b border-zinc-100 dark:border-zinc-800 flex justify-between items-start">
                    <div>
                      <h2 className="text-2xl font-bold text-zinc-900 dark:text-white mb-1">{selectedReward.name}</h2>
                      {!selectedReward.is_active && (
                        <span className="inline-block bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 text-xs font-bold px-2 py-1 rounded-md">
                          Indisponível
                        </span>
                      )}
                    </div>
                    <button onClick={handleCloseModal} className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 p-1 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors">
                      <X size={24} />
                    </button>
                  </div>

                  <div className="p-6 flex-1 overflow-y-auto">
                    <div className="flex items-center gap-2 text-amber-500 font-bold text-2xl mb-6">
                      <Coins size={28} className="fill-current" />
                      <span>{parseFloat(selectedReward.price_coins as string).toLocaleString('pt-BR', { minimumFractionDigits: 0 })}</span>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <h3 className="text-sm font-medium text-zinc-900 dark:text-white mb-2">Descrição</h3>
                        <p className="text-zinc-600 dark:text-zinc-400 leading-relaxed whitespace-pre-wrap">
                          {selectedReward.description}
                        </p>
                      </div>

                      <div className="pt-4 border-t border-zinc-100 dark:border-zinc-800">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-zinc-500 dark:text-zinc-400">Estoque disponível:</span>
                          <span className={`font-medium ${selectedReward.stock > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                            {selectedReward.stock} unidades
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="p-6 border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50">
                    <button 
                      disabled={!selectedReward.is_active || selectedReward.stock <= 0}
                      className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-lg shadow-emerald-200 dark:shadow-none disabled:opacity-50 disabled:shadow-none disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
                    >
                      <ShoppingBag size={20} />
                      Resgatar Prêmio
                    </button>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </Layout>
  );
};
