import React, { useState, useEffect, useCallback } from 'react';
import { Layout } from '../components/Layout';
import { Search, Loader2, RefreshCw, ChevronLeft, ChevronRight, ShoppingBag, Package, Coins, Images as ImagesIcon, X, Plus, Camera, Trash2, Edit2, Save } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../context/AuthContext';
import { Reward, RewardImage } from '../types';
import { api } from '../services/api';
import { useToast } from '../context/ToastContext';
import { ConfirmModal } from '../components/ConfirmModal';
import { rewardSchema } from '../validators/schemas';

const MAX_IMAGES = 3;

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
  const { token, user: currentUser } = useAuth();
  const { addToast } = useToast();
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

  // Create/Edit Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingReward, setEditingReward] = useState<Reward | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [formErrors, setFormErrors] = useState<{ [key: string]: string }>({});

  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => Promise<void>;
    isLoading: boolean;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: async () => {},
    isLoading: false,
  });

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price_coins: '',
    stock: '',
    is_active: '1',
    images: [] as File[],
    primary_image_index: '0',
    existingImages: [] as RewardImage[],
  });

  const isAdmin = currentUser?.user_type_id === 1;

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

  const handleOpenModal = (reward?: Reward) => {
    if (reward) {
      setEditingReward(reward);
      setFormData({
        name: reward.name,
        description: reward.description,
        price_coins: String(reward.price_coins),
        stock: String(reward.stock),
        is_active: reward.is_active ? '1' : '0',
        images: [],
        primary_image_index: '0',
        existingImages: reward.images || (reward.primary_image ? [reward.primary_image] : []),
      });
    } else {
      setEditingReward(null);
      setFormData({
        name: '',
        description: '',
        price_coins: '',
        stock: '',
        is_active: '1',
        images: [],
        primary_image_index: '0',
        existingImages: [],
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingReward(null);
    setFormData({
      name: '',
      description: '',
      price_coins: '',
      stock: '',
      is_active: '1',
      images: [],
      primary_image_index: '0',
      existingImages: [],
    });
    setFormErrors({});
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setFormErrors({});

    const result = rewardSchema.safeParse({
      name: formData.name,
      description: formData.description,
      price_coins: formData.price_coins,
      stock: formData.stock,
      is_active: formData.is_active,
      images: formData.images,
      primary_image_index: formData.primary_image_index,
    });

    if (!result.success) {
      const errors = result.error.flatten().fieldErrors;
      const formattedErrors: { [key: string]: string } = {};
      Object.entries(errors).forEach(([key, messages]) => {
        if (messages?.length) {
          formattedErrors[key] = messages[0];
        }
      });
      setFormErrors(formattedErrors);
      addToast('error', 'Verifique os campos obrigatórios.');
      return;
    }

    setSaving(true);
    try {
      const data = new FormData();
      data.append('name', formData.name);
      data.append('description', formData.description);
      data.append('price_coins', formData.price_coins);
      data.append('stock', formData.stock);
      data.append('is_active', formData.is_active);

      // Debug: log das imagens sendo enviadas
      console.log('Imagens para enviar:', formData.images.length);
      formData.images.forEach((image, index) => {
        console.log(`Imagem ${index}:`, image.name, image.size, 'bytes');
        data.append('images[]', image);
      });

      if (formData.images.length > 0) {
        data.append('primary_image_index', formData.primary_image_index);
      }

      if (editingReward) {
        await api.updateReward(token, editingReward.id, data);
        addToast('success', 'Prêmio atualizado com sucesso!');
      } else {
        await api.createReward(token, data);
        addToast('success', 'Prêmio criado com sucesso!');
      }

      await fetchRewards(currentPage, searchTerm);
      handleCloseModal();
    } catch (error: any) {
      console.error('Error saving reward:', error);
      addToast('error', error.message || 'Erro ao salvar prêmio.');
    } finally {
      setSaving(false);
    }
  };

  const executeDeleteReward = async (reward: Reward) => {
    if (!token) return;
    setDeletingId(reward.id);
    try {
      await api.deleteReward(token, reward.id);
      await fetchRewards(currentPage, searchTerm);
      addToast('success', 'Prêmio excluído com sucesso!');
    } catch (error: any) {
      console.error('Error deleting reward:', error);
      addToast('error', error.message || 'Erro ao excluir prêmio.');
    } finally {
      setDeletingId(null);
    }
  };

  const handleDelete = (reward: Reward) => {
    setConfirmModal({
      isOpen: true,
      title: 'Excluir Prêmio',
      message: `Tem certeza que deseja excluir o prêmio "${reward.name}"? Esta ação não pode ser desfeita.`,
      onConfirm: async () => await executeDeleteReward(reward),
      isLoading: false,
    });
  };

  const handleConfirmModalAction = async () => {
    setConfirmModal(prev => ({ ...prev, isLoading: true }));
    try {
      await confirmModal.onConfirm();
      setConfirmModal(prev => ({ ...prev, isOpen: false }));
    } catch (error) {
      console.error('Error in confirm action:', error);
      setConfirmModal(prev => ({ ...prev, isLoading: false }));
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const newFiles = Array.from(e.target.files);
      const remainingSlots = MAX_IMAGES - formData.images.length;
      
      if (remainingSlots <= 0) {
        addToast('error', `Máximo de ${MAX_IMAGES} imagens atingido.`);
        return;
      }
      
      const filesToAdd = newFiles.slice(0, remainingSlots);
      setFormData(prev => ({
        ...prev,
        images: [...prev.images, ...filesToAdd],
      }));
      
      if (newFiles.length > remainingSlots) {
        addToast('warning', `Apenas ${remainingSlots} imagem(s) adicionada(s). Limite: ${MAX_IMAGES}`);
      }
    }
  };

  const handleRemoveImage = (index: number) => {
    setFormData(prev => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index),
      primary_image_index: prev.primary_image_index && parseInt(prev.primary_image_index) >= index 
        ? String(Math.max(0, parseInt(prev.primary_image_index) - 1))
        : prev.primary_image_index,
    }));
  };

  const handleOpenReward = (reward: Reward) => {
    setSelectedReward(reward);
    setCurrentImageIndex(0);
  };

  const handleCloseModalDetail = () => {
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
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
        onConfirm={handleConfirmModalAction}
        title={confirmModal.title}
        message={confirmModal.message}
        isLoading={confirmModal.isLoading}
      />
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
            {isAdmin && (
              <button
                onClick={() => handleOpenModal()}
                className="bg-emerald-600 px-4 py-2 rounded-xl text-sm font-medium text-white hover:bg-emerald-700 shadow-sm transition-all flex items-center gap-2"
              >
                <Plus size={18} />
                Novo Prêmio
              </button>
            )}
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
                    className="bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-zinc-100 dark:border-zinc-800 hover:shadow-md transition-all duration-200 flex flex-col overflow-hidden group cursor-pointer relative"
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

                    {/* Admin Actions */}
                    {isAdmin && (
                      <div className="absolute top-2 left-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenModal(reward);
                          }}
                          className="p-1.5 bg-white/90 dark:bg-zinc-800/90 text-emerald-600 dark:text-emerald-400 rounded-lg shadow-md hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-colors"
                          title="Editar"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(reward);
                          }}
                          className="p-1.5 bg-white/90 dark:bg-zinc-800/90 text-red-600 dark:text-red-400 rounded-lg shadow-md hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                          title="Excluir"
                        >
                          {deletingId === reward.id ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                        </button>
                      </div>
                    )}
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
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={handleCloseModalDetail}>
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
                    <button onClick={handleCloseModalDetail} className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 p-1 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors">
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

        {/* Create/Edit Reward Modal */}
        <AnimatePresence>
          {isModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white dark:bg-zinc-900 rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh] border border-zinc-200 dark:border-zinc-800"
              >
                <div className="p-6 border-b border-zinc-100 dark:border-zinc-800 flex justify-between items-center bg-zinc-50/50 dark:bg-zinc-800/50">
                  <h2 className="text-xl font-bold text-zinc-900 dark:text-white">
                    {editingReward ? 'Editar Prêmio' : 'Novo Prêmio'}
                  </h2>
                  <button onClick={handleCloseModal} className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors">
                    <X size={24} />
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
                  {/* Images Section */}
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                      Imagens
                    </label>
                    <div className="grid grid-cols-4 gap-3 mb-3">
                      {formData.images.map((image, index) => (
                        <div key={index} className="relative aspect-square rounded-xl overflow-hidden border-2 border-zinc-200 dark:border-zinc-700 group">
                          <img
                            src={URL.createObjectURL(image)}
                            alt={`Preview ${index + 1}`}
                            className="w-full h-full object-cover"
                          />
                          <button
                            type="button"
                            onClick={() => handleRemoveImage(index)}
                            className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                          >
                            <X size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => setFormData(prev => ({ ...prev, primary_image_index: String(index) }))}
                            className={`absolute bottom-1 left-1 p-1 rounded-full transition-all ${
                              String(index) === formData.primary_image_index
                                ? 'bg-emerald-500 text-white'
                                : 'bg-black/50 text-white opacity-0 group-hover:opacity-100'
                            }`}
                            title="Definir como principal"
                          >
                            <Camera size={14} />
                          </button>
                        </div>
                      ))}
                      <label className="aspect-square rounded-xl border-2 border-dashed border-zinc-300 dark:border-zinc-700 flex flex-col items-center justify-center cursor-pointer hover:border-emerald-500 dark:hover:border-emerald-500 transition-colors bg-zinc-50 dark:bg-zinc-800/50">
                        <Camera size={24} className="text-zinc-400 mb-1" />
                        <span className="text-xs text-zinc-500 dark:text-zinc-400">
                          {formData.images.length}/{MAX_IMAGES}
                        </span>
                        <input
                          type="file"
                          accept="image/*"
                          multiple
                          className="hidden"
                          onChange={handleImageChange}
                          disabled={formData.images.length >= MAX_IMAGES}
                        />
                      </label>
                    </div>
                    {formData.images.length > 0 && (
                      <p className="text-xs text-zinc-500 dark:text-zinc-400">
                        Clique na câmera para definir a imagem principal (atual: {parseInt(formData.primary_image_index) + 1}ª)
                      </p>
                    )}
                    {formErrors.images && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{formErrors.images}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Nome *</label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className={`w-full p-2.5 border rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white placeholder-zinc-400 ${
                        formErrors.name ? 'border-red-500 focus:ring-red-500' : 'border-zinc-300 dark:border-zinc-600'
                      }`}
                      placeholder="Ex: Camiseta"
                    />
                    {formErrors.name && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{formErrors.name}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Descrição *</label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      className={`w-full p-2.5 border rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white placeholder-zinc-400 resize-none ${
                        formErrors.description ? 'border-red-500 focus:ring-red-500' : 'border-zinc-300 dark:border-zinc-600'
                      }`}
                      placeholder="Ex: Camiseta personalizada da empresa"
                      rows={3}
                    />
                    {formErrors.description && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{formErrors.description}</p>}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Preço (moedas) *</label>
                      <input
                        type="number"
                        value={formData.price_coins}
                        onChange={(e) => setFormData({ ...formData, price_coins: e.target.value })}
                        className={`w-full p-2.5 border rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white placeholder-zinc-400 ${
                          formErrors.price_coins ? 'border-red-500 focus:ring-red-500' : 'border-zinc-300 dark:border-zinc-600'
                        }`}
                        placeholder="100"
                        min="0"
                      />
                      {formErrors.price_coins && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{formErrors.price_coins}</p>}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Estoque *</label>
                      <input
                        type="number"
                        value={formData.stock}
                        onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                        className={`w-full p-2.5 border rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white placeholder-zinc-400 ${
                          formErrors.stock ? 'border-red-500 focus:ring-red-500' : 'border-zinc-300 dark:border-zinc-600'
                        }`}
                        placeholder="50"
                        min="0"
                      />
                      {formErrors.stock && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{formErrors.stock}</p>}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Status</label>
                    <select
                      value={formData.is_active}
                      onChange={(e) => setFormData({ ...formData, is_active: e.target.value })}
                      className="w-full p-2.5 border border-zinc-300 dark:border-zinc-600 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white"
                    >
                      <option value="1">Ativo</option>
                      <option value="0">Inativo</option>
                    </select>
                  </div>

                  <div className="flex justify-end gap-3 pt-4">
                    <button
                      type="button"
                      onClick={handleCloseModal}
                      className="px-4 py-2 border border-zinc-300 dark:border-zinc-600 rounded-xl text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={saving}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-xl shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                      {saving ? 'Salvando...' : 'Salvar'}
                    </button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </Layout>
  );
};
