import React, { useState, useEffect, useCallback } from 'react';
import { Search, Loader2, RefreshCw, ChevronLeft, ChevronRight, ShoppingBag, Package, Coins, Images as ImagesIcon, X, Plus, Camera, Trash2, Edit2, Save, Gift, ClipboardList, CheckCircle, XCircle, Clock, AlertCircle, Ticket, Trophy } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../context/AuthContext';
import { Reward, RewardImage, Redemption, RedemptionStatus, RedemptionStatusHistory } from '../types';
import { rewardsService, redemptionsService } from '../services';
import { useToast } from '../context/ToastContext';
import { ConfirmModal } from '../components/ConfirmModal';
import { rewardSchema } from '../validators/schemas';
import { VouchersTab } from '../components/Rewards/VouchersTab';
import { formatDateTime } from '../utils/formatters';

const MAX_IMAGES = 3;

const LocalImagePreview: React.FC<{ file: File }> = ({ file }) => {
  const [url, setUrl] = React.useState<string>('');

  React.useEffect(() => {
    const objectUrl = URL.createObjectURL(file);
    setUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [file]);

  if (!url) return null;

  return (
    <img
      src={url}
      alt="Preview"
      className="w-full h-full object-cover"
    />
  );
};

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
  const { token, user: currentUser, coinName } = useAuth();
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

  const [redemptionModal, setRedemptionModal] = useState<{
    isOpen: boolean;
    reward: Reward | null;
    isProcessing: boolean;
  }>({
    isOpen: false,
    reward: null,
    isProcessing: false,
  });

  // Redemptions states
  const [activeTab, setActiveTab] = useState<'rewards' | 'redemptions' | 'vouchers'>('rewards');
  const [redemptions, setRedemptions] = useState<Redemption[]>([]);
  const [redemptionsLoading, setRedemptionsLoading] = useState(false);
  const [redemptionsPage, setRedemptionsPage] = useState(1);
  const [redemptionsTotalPages, setRedemptionsTotalPages] = useState(1);
  const [redemptionsTotal, setRedemptionsTotal] = useState(0);
  const [redemptionsFrom, setRedemptionsFrom] = useState(0);
  const [redemptionsTo, setRedemptionsTo] = useState(0);
  const [redemptionFilterStatus, setRedemptionFilterStatus] = useState<RedemptionStatus | ''>('');
  const [updatingRedemptionId, setUpdatingRedemptionId] = useState<number | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price_coins: '',
    stock: '',
    reward_type: 'standard' as 'standard' | 'campaign',
    fulfillment_type: 'physical' as 'physical' | 'voucher',
    valid_until: '',
    voucher_instructions: '',
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
      const data = await rewardsService.getRewards(token, page, search);
      
      // Usuários não-admin não veem rewards de campanha
      let allRewards = data.data || [];
      if (!isAdmin) {
        allRewards = allRewards.filter((r: Reward) => r.reward_type !== 'campaign');
      }
      
      setRewards(allRewards);
      setCurrentPage(data.meta.current_page);
      setTotalPages(data.meta.last_page);
      setTotalItems(data.meta.total);
      setFromItem(data.meta.from);
      setToItem(data.meta.to);
    } catch (err: any) {
      console.error('Error fetching rewards:', err);
      setError(err.message || 'Não foi possível carregar a loja de recompensas.');
    } finally {
      setLoading(false);
    }
  }, [token, isAdmin]);

  const fetchRedemptions = useCallback(async (page = 1) => {
    if (!token) return;
    setRedemptionsLoading(true);
    try {
      const filters: any = {
        per_page: 10,
      };

      // Admin vê todos, usuário comum vê apenas os seus
      if (!isAdmin && currentUser?.id) {
        filters.user_id = currentUser.id;
      }

      if (redemptionFilterStatus) {
        filters.status = redemptionFilterStatus;
      }

      const data = await redemptionsService.getRedemptions(token, page, filters);
      setRedemptions(data.data);
      setRedemptionsPage(data.current_page);
      setRedemptionsTotalPages(data.last_page);
      setRedemptionsTotal(data.total);
      setRedemptionsFrom(data.from);
      setRedemptionsTo(data.to);
    } catch (err: any) {
      console.error('Error fetching redemptions:', err);
      addToast('error', err.message || 'Não foi possível carregar os resgates.');
    } finally {
      setRedemptionsLoading(false);
    }
  }, [token, isAdmin, currentUser?.id, redemptionFilterStatus, addToast]);

  const handleApproveRedemption = async (id: number) => {
    if (!token) return;
    setUpdatingRedemptionId(id);
    try {
      await redemptionsService.approveRedemption(token, id);
      addToast('success', 'Resgate aprovado com sucesso!');
      await fetchRedemptions(redemptionsPage, redemptionFilterStatus);
    } catch (err: any) {
      console.error('Error approving redemption:', err);
      addToast('error', err.message || 'Não foi possível aprovar o resgate.');
    } finally {
      setUpdatingRedemptionId(null);
    }
  };

  const handleRejectRedemption = async (id: number) => {
    if (!token) return;
    setUpdatingRedemptionId(id);
    try {
      await redemptionsService.rejectRedemption(token, id);
      addToast('success', 'Resgate rejeitado com sucesso!');
      await fetchRedemptions(redemptionsPage, redemptionFilterStatus);
    } catch (err: any) {
      console.error('Error rejecting redemption:', err);
      addToast('error', err.message || 'Não foi possível rejeitar o resgate.');
    } finally {
      setUpdatingRedemptionId(null);
    }
  };

  const handleCompleteRedemption = async (id: number) => {
    if (!token) return;
    setUpdatingRedemptionId(id);
    try {
      await redemptionsService.completeRedemption(token, id);
      addToast('success', 'Resgate concluído com sucesso!');
      await fetchRedemptions(redemptionsPage, redemptionFilterStatus);
    } catch (err: any) {
      console.error('Error completing redemption:', err);
      addToast('error', err.message || 'Não foi possível concluir o resgate.');
    } finally {
      setUpdatingRedemptionId(null);
    }
  };

  useEffect(() => {
    fetchRewards(currentPage, debouncedSearchTerm);
  }, [fetchRewards, currentPage, debouncedSearchTerm]);

  useEffect(() => {
    if (activeTab === 'redemptions') {
      fetchRedemptions(redemptionsPage);
    }
  }, [activeTab, redemptionsPage, redemptionFilterStatus, fetchRedemptions]);

  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearchTerm]);

  const handleOpenModal = async (reward?: Reward) => {
    setFormErrors({});
    if (reward) {
      setEditingReward(reward);
      setLoading(true); // Reutilizando o estado de loading para a busca do detalhe
      try {
        const fullRewardRes = await rewardsService.getRewardById(token!, reward.id);
        const fullReward = fullRewardRes.data;

        setFormData({
          name: fullReward.name,
          description: fullReward.description,
          price_coins: String(fullReward.price_coins),
          stock: String(fullReward.stock),
          reward_type: fullReward.reward_type || 'standard',
          fulfillment_type: fullReward.fulfillment_type || 'physical',
          valid_until: fullReward.valid_until ? fullReward.valid_until.slice(0, 16) : '',
          voucher_instructions: fullReward.voucher_instructions || '',
          is_active: fullReward.is_active ? '1' : '0',
          images: [],
          primary_image_index: '0',
          existingImages: fullReward.images || (fullReward.primary_image ? [fullReward.primary_image] : []),
        });
      } catch (err: any) {
        console.error('Error fetching reward details:', err);
        addToast('error', 'Não foi possível carregar os detalhes da recompensa.');
        // Fallback para os dados da listagem se a busca do detalhe falhar
        setFormData({
          name: reward.name,
          description: reward.description,
          price_coins: String(reward.price_coins),
          stock: String(reward.stock),
          reward_type: reward.reward_type || 'standard',
          fulfillment_type: reward.fulfillment_type || 'physical',
          valid_until: reward.valid_until ? reward.valid_until.slice(0, 16) : '',
          voucher_instructions: reward.voucher_instructions || '',
          is_active: reward.is_active ? '1' : '0',
          images: [],
          primary_image_index: '0',
          existingImages: reward.images || (reward.primary_image ? [reward.primary_image] : []),
        });
      } finally {
        setLoading(false);
      }
    } else {
      setEditingReward(null);
      setFormData({
        name: '',
        description: '',
        price_coins: '',
        stock: '',
        reward_type: 'standard',
        fulfillment_type: 'physical',
        valid_until: '',
        voucher_instructions: '',
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
      price_coins: formData.reward_type === 'campaign' ? '0' : formData.price_coins,
      stock: formData.reward_type === 'campaign' ? '1' : formData.stock,
      is_active: formData.is_active,
      fulfillment_type: formData.fulfillment_type,
      voucher_validity_days: formData.fulfillment_type === 'voucher' ? (formData.voucher_validity_days || undefined) : undefined,
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
      data.append('price_coins', formData.reward_type === 'campaign' ? '0' : formData.price_coins);
      data.append('stock', formData.reward_type === 'campaign' ? '1' : formData.stock);
      data.append('reward_type', formData.reward_type);
      data.append('fulfillment_type', formData.fulfillment_type);
      if (formData.valid_until) {
        data.append('valid_until', formData.valid_until);
      }
      if (formData.voucher_instructions) {
        data.append('voucher_instructions', formData.voucher_instructions);
      }
      if (formData.fulfillment_type === 'voucher' && formData.voucher_validity_days) {
        data.append('voucher_validity_days', formData.voucher_validity_days);
      }
      data.append('is_active', formData.is_active);

      if (editingReward) {
        // Envia apenas os campos de texto na rota de atualização
        await rewardsService.updateReward(token, editingReward.id, data);

        // Se houver NOVAS imagens, envia na rota específica para não apagar as antigas
        if (formData.images.length > 0) {
          const imageFormData = new FormData();
          formData.images.forEach((image) => {
            imageFormData.append('images[]', image);
          });

          // Envia o índice da principal apenas se estiver setado para alguma das novas imagens
          if (formData.primary_image_index) {
            imageFormData.append('primary_image_index', formData.primary_image_index);
          }

          await rewardsService.addRewardImages(token, editingReward.id, imageFormData);
        }

        addToast('success', 'Recompensa atualizada com sucesso!');
      } else {
        // When creating, we still send initial images
        formData.images.forEach((image) => {
          data.append('images[]', image);
        });

        if (formData.images.length > 0) {
          data.append('primary_image_index', formData.primary_image_index);
        }

        await rewardsService.createReward(token, data);
        addToast('success', 'Recompensa criada com sucesso!');
      }

      await fetchRewards(currentPage, searchTerm);
      handleCloseModal();
    } catch (error: any) {
      console.error('Error saving reward:', error);

      // Usa erros de campo se disponíveis (API 422)
      if (error.fieldErrors) {
        const apiErrors: { [key: string]: string } = {};
        Object.entries(error.fieldErrors).forEach(([key, messages]) => {
          if (Array.isArray(messages) && messages.length > 0) {
            apiErrors[key] = messages[0];
          } else if (typeof messages === 'string') {
            apiErrors[key] = messages;
          }
        });
        setFormErrors(apiErrors);
      }

      addToast('error', error.message || 'Erro ao salvar recompensa.');
    } finally {
      setSaving(false);
    }
  };

  const executeDeleteReward = async (reward: Reward) => {
    if (!token) return;
    setDeletingId(reward.id);
    try {
      await rewardsService.deleteReward(token, reward.id);
      await fetchRewards(currentPage, searchTerm);
      addToast('success', 'Recompensa excluída com sucesso!');
    } catch (error: any) {
      console.error('Error deleting reward:', error);
      addToast('error', error.message || 'Erro ao excluir recompensa.');
    } finally {
      setDeletingId(null);
    }
  };

  const handleDelete = (reward: Reward) => {
    setConfirmModal({
      isOpen: true,
      title: 'Excluir Recompensa',
      message: `Tem certeza que deseja excluir a recompensa "${reward.name}"? Esta ação não pode ser desfeita.`,
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

  const handleOpenRedemption = (reward: Reward) => {
    setRedemptionModal({ isOpen: true, reward, isProcessing: false });
  };

  const handleCloseRedemption = () => {
    setRedemptionModal({ isOpen: false, reward: null, isProcessing: false });
  };

  const executeRedemption = async () => {
    if (!token || !redemptionModal.reward) return;
    
    setRedemptionModal(prev => ({ ...prev, isProcessing: true }));
    try {
      await redemptionsService.createRedemption(token, {
        items: [
          {
            reward_id: redemptionModal.reward.id,
            quantity: 1,
          },
        ],
      });
      
      addToast('success', 'Recompensa resgatada com sucesso!');
      handleCloseRedemption();
      // Recarrega a lista de recompensas para atualizar o estoque
      await fetchRewards(currentPage, searchTerm);
    } catch (error: any) {
      console.error('Error creating redemption:', error);
      
      // Tenta extrair dados do erro da API
      let errorMessage = error.message || 'Erro ao resgatar recompensa.';

      if (error.response?.data) {
        const data = error.response.data;

        // Trata erro de saldo insuficiente
        if (data.error === 'Saldo de coins insuficiente') {
          const required = data.required || 0;
          const available = data.available || 0;
          const missing = required - available;

          const coinNameCapitalized = coinName.charAt(0).toUpperCase() + coinName.slice(1);
          errorMessage = `Saldo insuficiente. Você tem ${available.toLocaleString('pt-BR')} ${coinName}, mas precisa de ${required.toLocaleString('pt-BR')} ${coinName}. Faltam ${missing.toLocaleString('pt-BR')} ${coinName}.`;
        } else if (data.message) {
          errorMessage = data.message;
        }
      }

      addToast('error', errorMessage);
      setRedemptionModal(prev => ({ ...prev, isProcessing: false }));
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const newFiles = Array.from(e.target.files);
      const currentTotalImages = formData.images.length + formData.existingImages.length;
      const remainingSlots = MAX_IMAGES - currentTotalImages;
      
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
    }));
  };

  const handleRemoveExistingImage = async (imageId: number) => {
    if (!token || !editingReward) return;
    
    try {
      await rewardsService.deleteRewardImage(token, editingReward.id, imageId);
      setFormData(prev => ({
        ...prev,
        existingImages: prev.existingImages.filter(img => img.id !== imageId)
      }));
      addToast('success', 'Imagem excluída com sucesso!');
      // Atualiza a lista para garantir que se a primária foi excluída, a próxima apareça como tal
      fetchRewards(currentPage, searchTerm);
    } catch (error: any) {
      console.error('Error removing image:', error);
      addToast('error', error.message || 'Erro ao excluir imagem.');
    }
  };

  const [replacingImageId, setReplacingImageId] = useState<number | null>(null);
  const replaceInputRef = React.useRef<HTMLInputElement>(null);

  const handleUpdateExistingImage = async (imageId: number, file?: File, isPrimary?: number) => {
    if (!token || !editingReward) return;

    try {
      const data = new FormData();
      if (file) data.append('image', file);
      if (isPrimary !== undefined) data.append('is_primary', String(isPrimary));
      
      const response = await rewardsService.updateRewardImage(token, editingReward.id, imageId, data);
      
      // Obtém a nova URL da resposta ou usa o arquivo local como fallback
      const apiImageData = response.data || response;
      const serverUrl = apiImageData?.image_full_url;
      const localPreview = file ? URL.createObjectURL(file) : '';
      
      // Só adiciona o timestamp se for uma URL real (http), não se for um blob local
      const finalUrl = serverUrl 
        ? `${serverUrl}${serverUrl.includes('?') ? '&' : '?'}t=${Date.now()}`
        : localPreview;

      // Atualiza o estado local
      setFormData(prev => ({
        ...prev,
        existingImages: prev.existingImages.map(img => {
          if (img.id === imageId) {
            return {
              ...img,
              ...apiImageData,
              image_full_url: finalUrl || img.image_full_url,
              is_primary: isPrimary === 1 || (isPrimary === undefined && img.is_primary),
            };
          }
          if (isPrimary === 1) return { ...img, is_primary: false };
          return img;
        })
      }));
      
      addToast('success', 'Imagem atualizada com sucesso!');
      fetchRewards(currentPage, searchTerm);
      setReplacingImageId(null);
    } catch (error: any) {
      console.error('Error updating image:', error);
      addToast('error', error.message || 'Erro ao atualizar imagem.');
    }
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
    <>
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
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">Recompensas</h1>
            <p className="text-zinc-500 dark:text-zinc-400">Gerencie recompensas, acompanhe resgates e visualize o histórico de vouchers.</p>
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
                className="bg-primary-600 px-4 py-2 rounded-xl text-sm font-medium text-white hover:bg-primary-700 shadow-sm transition-all flex items-center gap-2"
              >
                <Plus size={18} />
                Nova Recompensa
              </button>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 border-b border-zinc-200 dark:border-zinc-700">
          <button
            onClick={() => setActiveTab('rewards')}
            className={`px-4 py-2 font-medium text-sm rounded-t-lg transition-colors ${
              activeTab === 'rewards'
                ? 'bg-primary-600 text-white'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
            }`}
          >
            <div className="flex items-center gap-2">
              <ShoppingBag size={18} />
              Recompensas
            </div>
          </button>
          <button
            onClick={() => setActiveTab('redemptions')}
            className={`px-4 py-2 font-medium text-sm rounded-t-lg transition-colors ${
              activeTab === 'redemptions'
                ? 'bg-primary-600 text-white'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
            }`}
          >
            <div className="flex items-center gap-2">
              <ClipboardList size={18} />
              Resgates
            </div>
          </button>
          {isAdmin && (
            <button
              onClick={() => setActiveTab('vouchers')}
              className={`px-4 py-2 font-medium text-sm rounded-t-lg transition-colors ${
                activeTab === 'vouchers'
                  ? 'bg-primary-600 text-white'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
              }`}
            >
              <div className="flex items-center gap-2">
                <Ticket size={18} />
                Histórico (Vouchers)
              </div>
            </button>
          )}
        </div>

        {/* Filters */}
        {activeTab === 'rewards' && (
          <>
        <div className="bg-white dark:bg-zinc-900 p-4 rounded-2xl shadow-sm border border-zinc-100 dark:border-zinc-800 flex flex-col md:flex-row gap-4 items-center transition-colors duration-200">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-zinc-400" size={20} />
            <input
              type="text"
              placeholder="Buscar recompensas..."
              className="w-full pl-10 pr-4 py-2 border border-zinc-200 dark:border-zinc-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-500"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {loading && rewards.length === 0 ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 text-primary-600 animate-spin" />
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
                    className={`bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border hover:shadow-md transition-all duration-200 flex flex-col overflow-hidden group cursor-pointer relative ${
                      reward.reward_type === 'campaign'
                        ? 'border-purple-200 dark:border-purple-800 bg-purple-50/30 dark:bg-purple-900/10'
                        : 'border-zinc-100 dark:border-zinc-800'
                    }`}
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

                      {/* Admin Actions - posicionados no canto direito */}
                      {isAdmin && (
                        <div className={`absolute right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-20 ${
                          reward.is_active ? 'top-2' : 'top-10'
                        }`}>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenModal(reward);
                            }}
                            className="p-1.5 bg-white/90 dark:bg-zinc-800/90 text-primary-600 dark:text-primary-400 rounded-lg shadow-md hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-colors"
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

                      {/* Badge de Tipo de Uso (Campaign/Standard) */}
                      {reward.reward_type === 'campaign' && (
                        <div className={`absolute z-10 flex flex-col gap-1 ${
                          reward.fulfillment_type === 'voucher' ? 'top-2 left-2' : 'top-2 left-2'
                        }`}>
                          <span className="bg-purple-600/90 text-white text-xs font-bold px-2 py-1 rounded-lg backdrop-blur-sm flex items-center gap-1">
                            🏆 Campanha
                          </span>
                        </div>
                      )}

                      {reward.fulfillment_type === 'voucher' && (
                        <div className={`absolute bg-blue-500/90 text-white text-xs font-bold px-2 py-1 rounded-lg backdrop-blur-sm z-10 flex items-center gap-1 ${
                          reward.reward_type === 'campaign' ? 'top-9 left-2' : 'top-2 left-2'
                        }`}>
                          🎫 Voucher
                        </div>
                      )}

                      {reward.fulfillment_type === 'physical' && (
                        <div className={`absolute bg-green-500/90 text-white text-xs font-bold px-2 py-1 rounded-lg backdrop-blur-sm z-10 flex items-center gap-1 ${
                          reward.reward_type === 'campaign' ? 'top-9 left-2' : 'top-2 left-2'
                        }`}>
                          📦 Físico
                        </div>
                      )}

                      {reward.is_expired && (
                        <div className="absolute bottom-2 left-2 bg-red-500/90 text-white text-xs font-bold px-2 py-1 rounded-lg backdrop-blur-sm z-10 flex items-center gap-1">
                          ⚠️ Expirado
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
                        {reward.reward_type !== 'campaign' ? (
                          <div className="flex items-center gap-1.5 text-amber-500 font-bold">
                            <Coins size={18} className="fill-current" />
                            <span>{parseFloat(reward.price_coins as string).toLocaleString('pt-BR', { minimumFractionDigits: 0 })}</span>
                          </div>
                        ) : (
                          <div />
                        )}
                        <div className="text-xs text-zinc-400 dark:text-zinc-500">
                          {reward.reward_type !== 'campaign' && (
                            reward.stock > 0 ? `${reward.stock} em estoque` : 'Esgotado'
                          )}
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
                <h3 className="text-lg font-medium text-zinc-900 dark:text-white">Nenhuma recompensa encontrada</h3>
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
        </>
        )}

        {/* Redemptions Tab */}
        {activeTab === 'redemptions' && (
          <div className="space-y-4">
            {/* Redemptions Filters */}
            <div className="bg-white dark:bg-zinc-900 p-4 rounded-2xl shadow-sm border border-zinc-100 dark:border-zinc-800 flex flex-col md:flex-row gap-4 items-center transition-colors duration-200">
              <div className="flex items-center gap-2 w-full">
                <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300 whitespace-nowrap">
                  Situação:
                </label>
                <select
                  value={redemptionFilterStatus}
                  onChange={(e) => {
                    setRedemptionFilterStatus(e.target.value as RedemptionStatus | '');
                    setRedemptionsPage(1);
                  }}
                  className="flex-1 md:flex-none md:w-48 p-2 border border-zinc-200 dark:border-zinc-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white"
                >
                  <option value="">Todos</option>
                  <option value="pending">Pendente</option>
                  <option value="approved">Disponível para Retirada</option>
                  <option value="rejected">Cancelado</option>
                  <option value="completed">Entregue</option>
                </select>
              </div>
              <div className="flex gap-2 ml-auto">
                <button
                  onClick={() => fetchRedemptions(redemptionsPage)}
                  className="bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 p-2 rounded-xl text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-all"
                  title="Atualizar"
                >
                  <RefreshCw size={20} className={redemptionsLoading ? "animate-spin" : ""} />
                </button>
              </div>
            </div>

            {/* Redemptions List */}
            {redemptionsLoading && redemptions.length === 0 ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-8 h-8 text-primary-600 animate-spin" />
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-1 gap-4">
                  {redemptions.map((redemption) => {
                    const user = redemption.user;
                    const items = redemption.items || [];
                    const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);

                    return (
                      <motion.div
                        key={redemption.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-zinc-100 dark:border-zinc-800 p-4 md:p-6 transition-colors duration-200"
                      >
                        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                          {/* Info Section */}
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-3">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
                                  #{redemption.id}
                                </span>
                                <span className="text-zinc-300 dark:text-zinc-600">•</span>
                                <span className="text-sm text-zinc-500 dark:text-zinc-400">
                                  {formatDateTime(redemption.created_at)}
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                {redemption.status === 'pending' && (
                                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400">
                                    <Clock size={14} className="text-amber-600 dark:text-amber-400" />
                                    Pendente
                                  </span>
                                )}
                                {redemption.status === 'approved' && (
                                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400">
                                    <CheckCircle size={14} />
                                    Disponível para Retirada
                                  </span>
                                )}
                                {redemption.status === 'rejected' && (
                                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400">
                                    <XCircle size={14} />
                                    Cancelado
                                  </span>
                                )}
                                {redemption.status === 'completed' && (
                                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400">
                                    <CheckCircle size={14} />
                                    Entregue
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* User Info (admin only) */}
                            {isAdmin && user && (
                              <div className="mb-3 flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
                                <span className="font-medium">Usuário:</span>
                                <span>{user.name}</span>
                                <span className="text-zinc-400">({user.email})</span>
                              </div>
                            )}

                            {/* Items */}
                            <div className="space-y-2">
                              <div className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                                {totalItems} {totalItems === 1 ? 'item resgatado' : 'itens resgatados'}:
                              </div>
                              <div className="flex flex-wrap gap-2">
                                {items.map((item) => (
                                  <div
                                    key={item.id}
                                    className="flex items-center gap-2 bg-zinc-50 dark:bg-zinc-800 px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700"
                                  >
                                    {(() => {
                                      // Get image URL supporting both object and direct string from API
                                      const primaryImage = item.reward?.primary_image;
                                      let imageUrl = '';
                                      
                                      if (typeof primaryImage === 'string') {
                                        imageUrl = primaryImage;
                                      } else if (primaryImage && typeof primaryImage === 'object' && 'image_full_url' in primaryImage) {
                                        imageUrl = (primaryImage as any).image_full_url;
                                      }

                                      return imageUrl ? (
                                        <img
                                          src={imageUrl}
                                          alt={item.reward?.name}
                                          className="w-8 h-8 object-cover rounded shadow-sm border border-zinc-200 dark:border-zinc-700"
                                        />
                                      ) : (
                                        <div className="w-8 h-8 bg-zinc-200 dark:bg-zinc-700 rounded flex items-center justify-center">
                                          <Package size={16} className="text-zinc-400" />
                                        </div>
                                      );
                                    })()}
                                    <div>
                                      <div className="text-sm font-medium text-zinc-900 dark:text-white">
                                        {item.reward?.name || 'Recompensa removida'}
                                      </div>
                                      <div className="text-xs text-zinc-500 dark:text-zinc-400">
                                        Qtd: {item.quantity}
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>

                            {/* Total */}
                            <div className="mt-3 flex items-center gap-2 text-amber-500 font-bold">
                              <Coins size={18} className="fill-current" />
                              <span>{redemption.total_coins_spent.toLocaleString('pt-BR')} {coinName} gastos</span>
                            </div>

                            {/* Status History Timeline */}
                            {redemption.status_histories && redemption.status_histories.length > 0 && (
                              <div className="mt-4">
                                <div className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide mb-2">
                                  Histórico
                                </div>
                                <div className="flex flex-col">
                                  {redemption.status_histories.map((history: RedemptionStatusHistory, index: number) => {
                                    const isLast = index === redemption.status_histories!.length - 1;
                                    const statusConfig: Record<string, { label: string; color: string; dot: string }> = {
                                      pending:   { label: 'Pendente',  color: 'text-amber-600 dark:text-amber-400',      dot: 'bg-amber-400' },
                                      approved:  { label: 'Aprovado',  color: 'text-primary-600 dark:text-primary-400',  dot: 'bg-primary-500' },
                                      completed: { label: 'Concluído', color: 'text-blue-600 dark:text-blue-400',         dot: 'bg-blue-500' },
                                      rejected:  { label: 'Cancelado', color: 'text-red-600 dark:text-red-400',           dot: 'bg-red-500' },
                                    };
                                    const meta = statusConfig[history.status] ?? { label: history.status, color: 'text-zinc-500', dot: 'bg-zinc-400' };
                                    const formatted = formatDateTime(history.occurred_at);
                                    return (
                                      <div key={index} className="flex items-start gap-3">
                                        <div className="flex flex-col items-center">
                                          <span className={`mt-1 w-2.5 h-2.5 rounded-full flex-shrink-0 ring-2 ring-white dark:ring-zinc-900 ${meta.dot}`} />
                                          {!isLast && (
                                            <span className="w-px flex-1 min-h-[18px] bg-zinc-200 dark:bg-zinc-700 my-0.5" />
                                          )}
                                        </div>
                                        <div className="pb-2.5">
                                          <span className={`text-xs font-semibold ${meta.color}`}>{meta.label}</span>
                                          <span className="text-xs text-zinc-400 dark:text-zinc-500 ml-2">{formatted}</span>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            )}

                            {/* Notes */}
                            {redemption.notes && (
                              <div className="mt-3 flex items-start gap-2 text-sm text-zinc-600 dark:text-zinc-400 bg-zinc-50 dark:bg-zinc-800 p-3 rounded-lg">
                                <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
                                <span>{redemption.notes}</span>
                              </div>
                            )}
                          </div>

                          {/* Admin Actions */}
                          {isAdmin && redemption.status !== 'completed' && redemption.status !== 'rejected' && (
                            <div className="flex flex-col gap-2 lg:w-auto">
                              <div className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                                Ações:
                              </div>
                              {redemption.status === 'pending' && (
                                <div className="flex gap-2">
                                  <button
                                    onClick={() => handleApproveRedemption(redemption.id)}
                                    disabled={updatingRedemptionId === redemption.id}
                                    className="flex-1 lg:flex-none px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
                                    title="Aprovar resgate"
                                  >
                                    {updatingRedemptionId === redemption.id ? (
                                      <Loader2 size={16} className="animate-spin" />
                                    ) : (
                                      <CheckCircle size={16} />
                                    )}
                                    Aprovar
                                  </button>
                                  <button
                                    onClick={() => handleRejectRedemption(redemption.id)}
                                    disabled={updatingRedemptionId === redemption.id}
                                    className="flex-1 lg:flex-none px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
                                    title="Rejeitar resgate"
                                  >
                                    {updatingRedemptionId === redemption.id ? (
                                      <Loader2 size={16} className="animate-spin" />
                                    ) : (
                                      <XCircle size={16} />
                                    )}
                                    Rejeitar
                                  </button>
                                </div>
                              )}
                              {redemption.status === 'approved' && (
                                <div className="flex gap-2">
                                  <button
                                    onClick={() => handleCompleteRedemption(redemption.id)}
                                    disabled={updatingRedemptionId === redemption.id}
                                    className="flex-1 lg:flex-none px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5 w-full"
                                    title="Marcar como concluído"
                                  >
                                    {updatingRedemptionId === redemption.id ? (
                                      <Loader2 size={16} className="animate-spin" />
                                    ) : (
                                      <CheckCircle size={16} />
                                    )}
                                    Concluir
                                  </button>
                                </div>
                              )}
                            </div>
                          )}

                          {/* User View - Status Info */}
                          {!isAdmin && (
                            <div className="lg:w-auto text-sm text-zinc-500 dark:text-zinc-400">
                              {redemption.status === 'pending' && 'Aguardando aprovação'}
                              {redemption.status === 'approved' && 'Disponível para retirada'}
                              {redemption.status === 'rejected' && 'Resgate cancelado'}
                              {redemption.status === 'completed' && 'Resgate entregue'}
                            </div>
                          )}
                        </div>
                      </motion.div>
                    );
                  })}
                </div>

                {redemptions.length === 0 && (
                  <div className="text-center py-12 bg-white dark:bg-zinc-900 rounded-2xl border border-dashed border-zinc-200 dark:border-zinc-800 transition-colors duration-200">
                    <ClipboardList className="w-12 h-12 text-zinc-300 dark:text-zinc-600 mx-auto mb-3" />
                    <h3 className="text-lg font-medium text-zinc-900 dark:text-white">Nenhum resgate encontrado</h3>
                    <p className="text-zinc-500 dark:text-zinc-400">
                      {redemptionFilterStatus
                        ? 'Tente ajustar o filtro de status.'
                        : isAdmin
                          ? 'Não há resgates no momento.'
                          : 'Você ainda não fez nenhum resgate.'}
                    </p>
                  </div>
                )}

                {/* Pagination Controls */}
                {redemptionsTotal > 0 && (
                  <div className="flex items-center justify-between bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-zinc-100 dark:border-zinc-800 transition-colors duration-200">
                    <div className="text-sm text-zinc-500 dark:text-zinc-400">
                      Mostrando <span className="font-medium">{redemptionsFrom}</span> até <span className="font-medium">{redemptionsTo}</span> de <span className="font-medium">{redemptionsTotal}</span> resultados
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setRedemptionsPage(prev => Math.max(prev - 1, 1))}
                        disabled={redemptionsPage === 1}
                        className="p-2 border border-zinc-200 dark:border-zinc-700 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed text-zinc-600 dark:text-zinc-400"
                      >
                        <ChevronLeft size={20} />
                      </button>
                      <span className="text-sm font-medium px-2 text-zinc-700 dark:text-zinc-300">
                        Página {redemptionsPage} de {redemptionsTotalPages}
                      </span>
                      <button
                        onClick={() => setRedemptionsPage(prev => Math.min(prev + 1, redemptionsTotalPages))}
                        disabled={redemptionsPage === redemptionsTotalPages}
                        className="p-2 border border-zinc-200 dark:border-zinc-700 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed text-zinc-600 dark:text-zinc-400"
                      >
                        <ChevronRight size={20} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Vouchers Tab */}
        {activeTab === 'vouchers' && isAdmin && (
          <VouchersTab />
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
                              currentImageIndex === idx ? 'border-primary-500 ring-2 ring-primary-100 dark:ring-primary-900/30' : 'border-transparent opacity-60 hover:opacity-100'
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
                    {selectedReward.reward_type !== 'campaign' && (
                      <div className="flex items-center gap-2 text-amber-500 font-bold text-2xl mb-6">
                        <Coins size={28} className="fill-current" />
                        <span>{parseFloat(selectedReward.price_coins as string).toLocaleString('pt-BR', { minimumFractionDigits: 0 })}</span>
                      </div>
                    )}

                    <div className="space-y-4">
                      {/* Tipo de Uso (Campaign/Standard) */}
                      <div className="flex items-center gap-2 flex-wrap">
                        {selectedReward.reward_type === 'campaign' && (
                          <span className="inline-flex items-center gap-1 px-3 py-1.5 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 text-sm font-bold rounded-lg">
                            🏆 Prêmio de Campanha/Jornada
                          </span>
                        )}
                        {selectedReward.fulfillment_type === 'voucher' ? (
                          <span className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 text-sm font-bold rounded-lg">
                            🎫 Voucher Digital
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-3 py-1.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-sm font-bold rounded-lg">
                            📦 Produto Físico
                          </span>
                        )}
                        {selectedReward.is_expired && (
                          <span className="inline-flex items-center gap-1 px-3 py-1.5 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 text-sm font-bold rounded-lg">
                            ⚠️ Expirado
                          </span>
                        )}
                      </div>

                      {/* Data de Validade */}
                      {selectedReward.valid_until && selectedReward.reward_type !== 'campaign' && (
                        <div className={`p-3 rounded-lg border ${
                          selectedReward.is_expired
                            ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
                            : 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800'
                        }`}>
                          <p className={`text-sm font-medium ${
                            selectedReward.is_expired
                              ? 'text-red-700 dark:text-red-400'
                              : 'text-amber-700 dark:text-amber-400'
                          }`}>
                            {selectedReward.is_expired ? '⚠️ Expirado em' : '📅 Resgate até'} {new Date(selectedReward.valid_until).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}
                          </p>
                        </div>
                      )}

                      <div>
                        <h3 className="text-sm font-medium text-zinc-900 dark:text-white mb-2">Descrição</h3>
                        <p className="text-zinc-600 dark:text-zinc-400 leading-relaxed whitespace-pre-wrap">
                          {selectedReward.description}
                        </p>
                      </div>

                      {/* Instruções do Voucher */}
                      {selectedReward.fulfillment_type === 'voucher' && selectedReward.voucher_instructions && (
                        <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                          <h3 className="text-sm font-medium text-blue-900 dark:text-blue-300 mb-1">📋 Instruções de Uso</h3>
                          <p className="text-sm text-blue-700 dark:text-blue-400 whitespace-pre-wrap">
                            {selectedReward.voucher_instructions}
                          </p>
                        </div>
                      )}

                      {selectedReward.reward_type !== 'campaign' && (
                        <div className="pt-4 border-t border-zinc-100 dark:border-zinc-800">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-zinc-500 dark:text-zinc-400">Estoque disponível:</span>
                            <span className={`font-medium ${selectedReward.stock > 0 ? 'text-primary-600 dark:text-primary-400' : 'text-red-600 dark:text-red-400'}`}>
                              {selectedReward.stock} unidades
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Reward footer removed as redemption is disabled */}
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
                    {editingReward ? 'Editar Recompensa' : 'Nova Recompensa'}
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
                      {/* Existing Images */}
                      {formData.existingImages.map((image, index) => (
                        <div key={`existing-${image.id}`} className="relative aspect-square rounded-xl overflow-hidden border-2 border-zinc-200 dark:border-zinc-700 group">
                          <img
                            src={image.image_full_url}
                            alt={`Existing ${index + 1}`}
                            className="w-full h-full object-cover cursor-pointer"
                            onClick={() => {
                              setReplacingImageId(image.id);
                              replaceInputRef.current?.click();
                            }}
                            title="Clique para substituir esta imagem"
                          />
                          <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              type="button"
                              onClick={() => handleRemoveExistingImage(image.id)}
                              className="p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
                              title="Remover"
                            >
                              <X size={14} />
                            </button>
                          </div>
                        </div>
                      ))}

                      {/* Input oculto para substituir imagem */}
                      <input
                        type="file"
                        className="hidden"
                        ref={replaceInputRef}
                        accept="image/*"
                        onChange={(e) => {
                          if (e.target.files && e.target.files[0] && replacingImageId) {
                            handleUpdateExistingImage(replacingImageId, e.target.files[0]);
                          }
                        }}
                      />

                      {/* New Images */}
                      {formData.images.map((image, index) => (
                        <div key={`new-${index}`} className="relative aspect-square rounded-xl overflow-hidden border-2 border-zinc-200 dark:border-zinc-700 group">
                          <LocalImagePreview file={image} />
                          <button
                            type="button"
                            onClick={() => handleRemoveImage(index)}
                            className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      ))}

                      <label className={`aspect-square rounded-xl border-2 border-dashed flex flex-col items-center justify-center transition-colors bg-zinc-50 dark:bg-zinc-800/50 ${
                        (formData.images.length + formData.existingImages.length) >= MAX_IMAGES 
                          ? 'border-zinc-200 dark:border-zinc-800 cursor-not-allowed opacity-50' 
                          : 'border-zinc-300 dark:border-zinc-700 cursor-pointer hover:border-primary-500 dark:hover:border-primary-500'
                      }`}>
                        <Camera size={24} className="text-zinc-400 mb-1" />
                        <span className="text-xs text-zinc-500 dark:text-zinc-400">
                          {formData.images.length + formData.existingImages.length}/{MAX_IMAGES}
                        </span>
                        <input
                          type="file"
                          accept="image/*"
                          multiple
                          className="hidden"
                          onChange={handleImageChange}
                          disabled={(formData.images.length + formData.existingImages.length) >= MAX_IMAGES}
                        />
                      </label>
                    </div>
                    {formData.images.length > 0 && (
                      <p className="text-xs text-zinc-500 dark:text-zinc-400">
                        Novas imagens serão adicionadas à galeria.
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
                      className={`w-full p-2.5 border rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white placeholder-zinc-400 ${
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
                      className={`w-full p-2.5 border rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white placeholder-zinc-400 resize-none ${
                        formErrors.description ? 'border-red-500 focus:ring-red-500' : 'border-zinc-300 dark:border-zinc-600'
                      }`}
                      placeholder="Ex: Camiseta personalizada da empresa"
                      rows={3}
                    />
                    {formErrors.description && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{formErrors.description}</p>}
                  </div>

                  {formData.reward_type !== 'campaign' && (
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Preço (moedas) *</label>
                        <input
                          type="number"
                          value={formData.price_coins}
                          onKeyDown={(e) => {
                            if (['-', '+', 'e', 'E', ',', '.'].includes(e.key)) {
                              e.preventDefault();
                            }
                          }}
                          onChange={(e) => {
                            const val = e.target.value;
                            if (val === '') {
                              setFormData({ ...formData, price_coins: '' });
                              return;
                            }
                            const numVal = parseInt(val) || 0;
                            setFormData({ ...formData, price_coins: String(Math.min(999, Math.max(0, numVal))) });
                          }}
                          className={`w-full p-2.5 border rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white placeholder-zinc-400 ${
                            formErrors.price_coins ? 'border-red-500 focus:ring-red-500' : 'border-zinc-300 dark:border-zinc-600'
                          }`}
                          placeholder="100"
                          min="0"
                          max="999"
                        />
                        {formErrors.price_coins && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{formErrors.price_coins}</p>}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Estoque *</label>
                        <input
                          type="number"
                          value={formData.stock}
                          onKeyDown={(e) => {
                            if (['-', '+', 'e', 'E', ',', '.'].includes(e.key)) {
                              e.preventDefault();
                            }
                          }}
                          onChange={(e) => {
                            const val = e.target.value;
                            if (val === '') {
                              setFormData({ ...formData, stock: '' });
                              return;
                            }
                            const numVal = parseInt(val) || 0;
                            setFormData({ ...formData, stock: String(Math.max(0, numVal)) });
                          }}
                          className={`w-full p-2.5 border rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white placeholder-zinc-400 ${
                            formErrors.stock ? 'border-red-500 focus:ring-red-500' : 'border-zinc-300 dark:border-zinc-600'
                          }`}
                          placeholder="50"
                          min="0"
                        />
                        {formErrors.stock && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{formErrors.stock}</p>}
                      </div>
                    </div>
                  )}

                  {/* Tipo de Reward (Standard ou Campaign) */}
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                      Tipo de Uso *
                    </label>
                    <select
                      value={formData.reward_type}
                      onChange={(e) => {
                        const newType = e.target.value as 'standard' | 'campaign';
                        setFormData({ 
                          ...formData, 
                          reward_type: newType,
                          // Limpar valid_until se for campanha
                          valid_until: newType === 'campaign' ? '' : formData.valid_until
                        });
                      }}
                      className="w-full p-2.5 border border-zinc-300 dark:border-zinc-600 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white"
                    >
                      <option value="standard">🛒 Catálogo</option>
                      <option value="campaign">🏆 Prêmio de Campanha/Jornada</option>
                    </select>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                      {formData.reward_type === 'standard'
                        ? 'Recompensa aparece no catálogo para todos os usuários resgatarem'
                        : 'Recompensa vinculada a uma campanha ou jornada'}
                    </p>
                  </div>

                  {/* Tipo de Recompensa */}
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Tipo de Recompensa *</label>
                    <select
                      value={formData.fulfillment_type}
                      onChange={(e) => setFormData({ ...formData, fulfillment_type: e.target.value as 'physical' | 'voucher' })}
                      className="w-full p-2.5 border border-zinc-300 dark:border-zinc-600 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white"
                    >
                      <option value="physical">📦 Produto Físico</option>
                      <option value="voucher">🎫 Voucher Digital</option>
                    </select>
                  </div>

                  {/* Data de Validade */}
                  {formData.reward_type !== 'campaign' && (
                    <div>
                      <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                        Data e hora limite para resgate
                      </label>
                      <input
                        type="datetime-local"
                        value={formData.valid_until}
                        min={new Date().toISOString().slice(0, 16)}
                        onChange={(e) => setFormData({ ...formData, valid_until: e.target.value })}
                        className="w-full p-2.5 border border-zinc-300 dark:border-zinc-600 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white"
                      />
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 italic">
                        Define até quando a recompensa estará disponível no catálogo para resgate.
                      </p>
                    </div>
                  )}

                  {/* Instruções do Voucher (apenas se voucher) */}
                  {formData.fulfillment_type === 'voucher' && (
                    <div>
                      <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                        Instruções de Uso do Voucher
                      </label>
                      <textarea
                        value={formData.voucher_instructions}
                        onChange={(e) => setFormData({ ...formData, voucher_instructions: e.target.value })}
                        className="w-full p-2.5 border border-zinc-300 dark:border-zinc-600 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white placeholder-zinc-400 resize-none"
                        placeholder="Ex: Use o código gerado no checkout da Amazon. Válido até a data de expiração."
                        rows={3}
                      />
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Situação</label>
                    <select
                      value={formData.is_active}
                      onChange={(e) => setFormData({ ...formData, is_active: e.target.value })}
                      className="w-full p-2.5 border border-zinc-300 dark:border-zinc-600 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white"
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
                      className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-xl shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
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
    </>
  );
};
