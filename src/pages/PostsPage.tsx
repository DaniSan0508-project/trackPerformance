import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Search, Loader2, RefreshCw, ChevronLeft, ChevronRight, MessageSquare, Heart, Share2, Bookmark, MoreHorizontal, User, X, Edit, Trash2, Plus, Image as ImageIcon, Calendar, Rocket, Shield, Coins, AlertCircle, CheckCircle, Megaphone, Eye } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../context/AuthContext';
import { Post, Like, Comment, User as UserType, QuizAlternative, QuizAnswer, CampaignHashtag } from '../types';
import { postsService, usersService, campaignsService } from '../services';
import { useToast } from '../context/ToastContext';
import { ConfirmModal } from '../components/ConfirmModal';
import ImageCropperModal from '../components/ImageCropperModal';
import { getFullImageUrl, extractYouTubeVideoId, formatRelativeDate, getYouTubeThumbnailUrl, formatDateTime } from '../utils';

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

// Utility to sanitize coin inputs
const sanitizeCoinValue = (value: string): string => {
  // Remove tudo que não for dígito
  const numericValue = value.replace(/\D/g, '');
  // Remove zeros à esquerda
  const noZeros = numericValue.replace(/^0+(?=\d)/, '') || '0';
  // Limita o valor máximo a 999
  if (parseInt(noZeros) > 999) return '999';
  return noZeros;
};

const UserListItem: React.FC<{ user?: UserType | { name: string; profile_image_url?: string | null }; subtext?: string }> = ({ user, subtext }) => (
  <div className="flex items-center gap-3 p-2 hover:bg-zinc-50 dark:hover:bg-zinc-800 rounded-lg transition-colors">
    <div className="w-10 h-10 bg-zinc-100 dark:bg-zinc-800 rounded-full flex items-center justify-center text-zinc-500 dark:text-zinc-400 flex-shrink-0 overflow-hidden">
      {user?.profile_image_url ? (
        <img src={getFullImageUrl(user.profile_image_url) || ''} alt={user.name} className="w-full h-full object-cover" />
      ) : (
        <User size={20} />
      )}
    </div>
    <div>
      <p className="font-medium text-sm text-zinc-900 dark:text-zinc-100">{user?.name || 'Usuário Desconhecido'}</p>
      {subtext && <p className="text-xs text-zinc-500 dark:text-zinc-400">{subtext}</p>}
    </div>
  </div>
);

export const PostsPage: React.FC = () => {
  const { token, user: currentUser, coinName } = useAuth();
  const { addToast } = useToast();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterUserName, setFilterUserName] = useState('');
  const [filterContent, setFilterContent] = useState('');
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');
  const [filterEarnsCoins, setFilterEarnsCoins] = useState<boolean | 'all'>('all');
  const [filterIsSponsored, setFilterIsSponsored] = useState<boolean | 'all'>('all');
  const [filterIsBoosted, setFilterIsBoosted] = useState<boolean | 'all'>('all');
  const [filterPostType, setFilterPostType] = useState<'all' | 'standard' | 'quiz'>('all');
  const [sortOrder, setSortOrder] = useState('-created_at');

  const debouncedUserName = useDebounce(filterUserName, 500);
  const debouncedContent = useDebounce(filterContent, 500);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [fromItem, setFromItem] = useState(0);
  const [toItem, setToItem] = useState(0);

  // Modal state
  const [likesModalPost, setLikesModalPost] = useState<Post | null>(null);
  const [commentsModalPost, setCommentsModalPost] = useState<Post | null>(null);
  const [shareModalPost, setShareModalPost] = useState<Post | null>(null);
  const [contentModalPost, setContentModalPost] = useState<Post | null>(null);
  const [carouselIndex, setCarouselIndex] = useState(0);
  const [videoModalPost, setVideoModalPost] = useState<Post | null>(null);
  const [quizAnswersModal, setQuizAnswersModal] = useState<{
    alternative: QuizAlternative;
    answers: QuizAnswer[];
  } | null>(null);
  const [quizAnswersSearch, setQuizAnswersSearch] = useState('');

  // Create Post state
  const [createPostModal, setCreatePostModal] = useState(false);
  const [newPostTitle, setNewPostTitle] = useState('');
  const [newPostContent, setNewPostContent] = useState('');
  const [newPostImages, setNewPostImages] = useState<File[]>([]);
  const [newPostVideoUrl, setNewPostVideoUrl] = useState('');
  const [mediaType, setMediaType] = useState<'none' | 'image' | 'video'>('none');
  const [isCreating, setIsCreating] = useState(false);
  const [newPostIsSponsored, setNewPostIsSponsored] = useState(false);
  const [newPostEarnsCoins, setNewPostEarnsCoins] = useState(false);
  const [newPostBoostLikeCoins, setNewPostBoostLikeCoins] = useState<string>('0');
  const [newPostBoostCommentCoins, setNewPostBoostCommentCoins] = useState<string>('0');
  const [newPostBoostShareCoins, setNewPostBoostShareCoins] = useState<string>('0');

  // Quiz Create state
  const [newPostType, setNewPostType] = useState<'standard' | 'quiz'>('standard');
  const [newQuizQuestion, setNewQuizQuestion] = useState('');
  const [newQuizCoinsParticipation, setNewQuizCoinsParticipation] = useState<string>('0');
  const [newQuizCoinsCorrect, setNewQuizCoinsCorrect] = useState<string>('0');
  const [newQuizAlternatives, setNewQuizAlternatives] = useState<QuizAlternative[]>([
    { text: '', is_correct: true },
    { text: '', is_correct: false }
  ]);

  // Edit/Delete state
  const [activeMenuPostId, setActiveMenuPostId] = useState<number | null>(null);
  const [editPostModal, setEditPostModal] = useState<Post | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [editMediaType, setEditMediaType] = useState<'none' | 'image' | 'video'>('none');
  const [editImages, setEditImages] = useState<File[]>([]);
  const [editVideoUrl, setEditVideoUrl] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState<number | null>(null);
  const [editIsSponsored, setEditIsSponsored] = useState(false);
  const [editEarnsCoins, setEditEarnsCoins] = useState(false);
  const [editBoostLikeCoins, setEditBoostLikeCoins] = useState<string>('0');
  const [editBoostCommentCoins, setEditBoostCommentCoins] = useState<string>('0');
  const [editBoostShareCoins, setEditBoostShareCoins] = useState<string>('0');

  // Quiz Edit state
  const [editPostType, setEditPostType] = useState<'standard' | 'quiz'>('standard');
  const [editQuizQuestion, setEditQuizQuestion] = useState('');
  const [editQuizCoinsParticipation, setEditQuizCoinsParticipation] = useState<string>('0');
  const [editQuizCoinsCorrect, setEditQuizCoinsCorrect] = useState<string>('0');
  const [editQuizAlternatives, setEditQuizAlternatives] = useState<QuizAlternative[]>([]);

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

  const [cropperModal, setCropperModal] = useState<{
    isOpen: boolean;
    image: string;
    index: number;
    type: 'new' | 'edit';
  }>({
    isOpen: false,
    image: '',
    index: -1,
    type: 'new'
  });

  const handleCropComplete = (croppedBlob: Blob) => {
    const croppedFile = new File([croppedBlob], `cropped-image-${Date.now()}.jpg`, { type: 'image/jpeg' });
    
    if (cropperModal.type === 'new') {
      setNewPostImages(prev => {
        const newImages = [...prev];
        newImages[cropperModal.index] = croppedFile;
        return newImages;
      });
    } else {
      setEditImages(prev => {
        const newImages = [...prev];
        newImages[cropperModal.index] = croppedFile;
        return newImages;
      });
    }
  };
  
  // Users cache
  const [usersCache, setUsersCache] = useState<Record<number, UserType>>({});
  const [allMentionUsers, setAllMentionUsers] = useState<UserType[]>([]);
  const [allHashtags, setAllHashtags] = useState<CampaignHashtag[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);

  const fetchHashtags = useCallback(async () => {
    if (!token) return;
    try {
      const response = await campaignsService.getHashtags(token);
      setAllHashtags(response.data || []);
    } catch (error) {
      console.error('Error fetching hashtags:', error);
    }
  }, [token]);

  useEffect(() => {
    fetchHashtags();
  }, [fetchHashtags]);

  const fetchPosts = useCallback(async (page = 1, filters: { 
    userName?: string; 
    search?: string;
    createdAt?: string;
    earnsCoins?: boolean;
    isSponsored?: boolean;
    isBoosted?: boolean;
    postType?: string;
    sort?: string;
  } = {}) => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const data = await postsService.getPosts(token, page, filters);
      setPosts(data.data);
      setCurrentPage(data.meta.current_page);
      setTotalPages(data.meta.last_page);
      setTotalItems(data.meta.total);
      setFromItem(data.meta.from);
      setToItem(data.meta.to);
      
      // Cache post authors
      const newUsers: Record<number, UserType> = {};
      data.data.forEach(post => {
        if (post.user) {
          newUsers[post.user.id] = post.user;
        }
      });
      setUsersCache(prev => ({ ...prev, ...newUsers }));
      
    } catch (err: any) {
      console.error('Error fetching posts:', err);
      setError(err.message || 'Não foi possível carregar os posts.');
    } finally {
      setLoading(false);
    }
  }, [token]);

  // Fetch missing users for modals
  const fetchMissingUsers = async (userIds: number[]) => {
    if (!token) return;
    const missingIds = userIds.filter(id => !usersCache[id]);
    if (missingIds.length === 0) return;

    setLoadingUsers(true);
    try {
      // Fetch users in parallel
      const promises = missingIds.map(id => usersService.getUser(token, id).catch(() => null));
      const results = await Promise.all(promises);
      
      const newUsers: Record<number, UserType> = {};
      results.forEach((user, index) => {
        if (user) {
          // Handle if wrapped in data or direct object
          const userData = user.data || user;
          if (userData.id) {
            newUsers[userData.id] = userData;
          }
        }
      });
      
      setUsersCache(prev => ({ ...prev, ...newUsers }));
    } catch (err) {
      console.error('Error fetching users:', err);
    } finally {
      setLoadingUsers(false);
    }
  };

  const handleShare = async (post: Post) => {
    const shareData = {
      title: `Post de ${post.user?.name}`,
      text: post.content,
      url: window.location.href // Or specific post URL if available
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
        await registerShareIntent(post.id);
      } catch (err) {
        console.error('Error sharing:', err);
      }
    } else {
      setShareModalPost(post);
    }
  };

  const registerShareIntent = async (postId: number) => {
    if (!token) return;
    try {
      await postsService.registerShare(token, postId);
      // Atualiza o contador localmente ou recarrega para mostrar a recompensa se houver
      setPosts(prev => prev.map(p => p.id === postId ? { ...p, shares_count: (p.shares_count || 0) + 1 } : p));
    } catch (err) {
      console.error('Error registering share:', err);
    }
  };

  const copyToClipboard = (text: string, postId?: number) => {
    navigator.clipboard.writeText(text);
    addToast('success', 'Link copiado para a área de transferência!');
    if (postId) registerShareIntent(postId);
    setShareModalPost(null);
  };

  const resetCreatePostState = () => {
    setNewPostTitle('');
    setNewPostContent('');
    setNewPostImages([]);
    setNewPostVideoUrl('');
    setMediaType('none');
    setNewPostIsSponsored(false);
    setNewPostEarnsCoins(false);
    setNewPostBoostLikeCoins('0');
    setNewPostBoostCommentCoins('0');
    setNewPostBoostShareCoins('0');
    setNewPostType('standard');
    setNewQuizQuestion('');
    setNewQuizCoinsParticipation('0');
    setNewQuizCoinsCorrect('0');
    setNewQuizAlternatives([
      { text: '', is_correct: true },
      { text: '', is_correct: false }
    ]);
    
    // Limpar o editor contentEditable
    const editor = document.querySelector('[data-field="create"]') as HTMLDivElement;
    if (editor) {
      editor.innerText = '';
    }
    
    setCreatePostModal(false);
  };

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    // Validação específica para Quiz
    if (newPostType === 'quiz') {
      if (!newQuizQuestion.trim()) {
        addToast('error', 'A pergunta do quiz é obrigatória.');
        return;
      }
      
      if (newQuizAlternatives.some(alt => !alt.text.trim())) {
        addToast('error', 'Todas as alternativas do quiz precisam ser preenchidas.');
        return;
      }

      const filledAlts = newQuizAlternatives.filter(a => a.text.trim());
      if (filledAlts.length < 2) {
        addToast('error', 'O quiz deve ter pelo menos 2 alternativas.');
        return;
      }
      if (!newQuizAlternatives.some(a => a.is_correct)) {
        addToast('error', 'Selecione uma alternativa correta.');
        return;
      }
    }

    setIsCreating(true);
    try {
      const processedContent = getProcessedContent('create');
      const formData = new FormData();
      formData.append('title', newPostTitle);
      formData.append('content', processedContent);
      formData.append('post_type', newPostType);

      if (newPostType === 'quiz') {
        formData.append('quiz_question', newQuizQuestion);
        formData.append('quiz_coins_participation', newQuizCoinsParticipation || '0');
        formData.append('quiz_coins_correct', newQuizCoinsCorrect || '0');
        
        newQuizAlternatives.forEach((alt, index) => {
          formData.append(`quiz_alternatives[${index}][text]`, alt.text);
          formData.append(`quiz_alternatives[${index}][is_correct]`, alt.is_correct ? '1' : '0');
        });
      } else {
        if (newPostImages && newPostImages.length > 0) {
          newPostImages.forEach((img) => formData.append('images[]', img));
        }
        if (newPostVideoUrl) {
          formData.append('video_url', newPostVideoUrl);
        }

        if (currentUser?.user_type_id === 1) {
          formData.append('is_sponsored', newPostIsSponsored ? '1' : '0');
          if (newPostEarnsCoins) {
            const like = parseInt(newPostBoostLikeCoins || '0');
            const comment = parseInt(newPostBoostCommentCoins || '0');
            const share = parseInt(newPostBoostShareCoins || '0');

            if (like === 0 && comment === 0 && share === 0) {
              addToast('error', 'Ao habilitar Post Turbinado, preencha pelo menos um dos valores de recompensa (Curtir, Comentar ou Compartilhar).');
              setIsCreating(false);
              return;
            }

            formData.append('boost_like_coins', newPostBoostLikeCoins.toString());
            formData.append('boost_comment_coins', newPostBoostCommentCoins.toString());
            formData.append('boost_share_coins', newPostBoostShareCoins.toString());
          } else {
            formData.append('boost_like_coins', '0');
            formData.append('boost_comment_coins', '0');
            formData.append('boost_share_coins', '0');
          }
        }
      }

      formData.append('survey_id', '1');

      await postsService.createPost(token, formData);

      // Reset and close
      setCreatePostModal(false);
      setNewPostTitle('');
      setNewPostContent('');
      setNewPostImages([]);
      setNewPostVideoUrl('');
      setMediaType('none');
      setNewPostIsSponsored(false);
      setNewPostEarnsCoins(false);
      setNewPostBoostLikeCoins('0');
      setNewPostBoostCommentCoins('0');
      setNewPostBoostShareCoins('0');

      // Reset Quiz
      setNewPostType('standard');
      setNewQuizQuestion('');
      setNewQuizCoinsParticipation('0');
      setNewQuizCoinsCorrect('0');
      setNewQuizAlternatives([
        { text: '', is_correct: true },
        { text: '', is_correct: false }
      ]);

      // Limpar o DOM do editor de criação
      const editor = document.querySelector('[data-field="create"]') as HTMLDivElement;
      if (editor) {
        editor.innerText = '';
      }

      // Refresh posts
      const dateFilter = filterStartDate && filterEndDate 
        ? `${filterStartDate},${filterEndDate}` 
        : filterStartDate || filterEndDate || '';
      fetchPosts(1, { 
        userName: filterUserName, 
        search: filterContent,
        createdAt: dateFilter,
        earnsCoins: filterEarnsCoins === 'all' ? undefined : filterEarnsCoins,
        isSponsored: filterIsSponsored === 'all' ? undefined : filterIsSponsored,
        isBoosted: filterIsBoosted === 'all' ? undefined : filterIsBoosted,
        postType: filterPostType === 'all' ? undefined : filterPostType,
        sort: sortOrder
      });
      addToast('success', 'Post criado com sucesso!');
    } catch (err: any) {
      console.error('Error creating post:', err);
      const errorMessage = err.response?.data?.message || err.message || 'Erro ao criar post';
      addToast('error', errorMessage);
    } finally {
      setIsCreating(false);
    }
  };

  const executeDeletePost = async (post: Post) => {
    if (!token) return;
    
    setIsDeleting(post.id);
    try {
      await postsService.deletePost(token, post.id);
      setPosts(prev => prev.filter(p => p.id !== post.id));
      setActiveMenuPostId(null);
      addToast('success', 'Post excluído com sucesso!');
    } catch (err: any) {
      console.error('Error deleting post:', err);
      
      // Tratar erro de "Não encontrado" (post já foi excluído)
      if (err.response?.status === 404) {
        addToast('info', 'Este post já foi removido anteriormente.');
        setPosts(prev => prev.filter(p => p.id !== post.id));
        setActiveMenuPostId(null);
        return;
      }

      addToast('error', err.message || 'Erro ao excluir post');
    } finally {
      setIsDeleting(null);
    }
  };

  const handleDeletePost = (post: Post) => {
    setConfirmModal({
      isOpen: true,
      title: 'Excluir Post',
      message: 'Tem certeza que deseja excluir essa postagem? Esta ação não pode ser desfeita.',
      onConfirm: async () => await executeDeletePost(post),
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

  const handleDeleteComment = async (commentId: number, postId: number) => {
    if (!token) return;

    try {
      await postsService.deletePostComment(token, commentId);
      // Atualiza o post na lista principal
      setPosts(prev => prev.map(p => {
        if (p.id === postId && p.comments) {
          return {
            ...p,
            comments: p.comments.filter(c => c.id !== commentId),
            comments_count: (p.comments_count || 1) - 1
          };
        }
        return p;
      }));

      // Atualiza o modal de comentários se estiver aberto
      setCommentsModalPost(prev => {
        if (!prev) return null;
        return {
          ...prev,
          comments: prev.comments.filter(c => c.id !== commentId)
        };
      });

      addToast('success', 'Comentário excluído com sucesso!');
    } catch (err: any) {
      console.error('Error deleting comment:', err);

      // Tratar erro de "Não encontrado" (comentário ou post já foi excluído)
      if (err.response?.status === 404) {
        addToast('info', 'Este comentário ou post já foi removido.');

        // Remove o comentário da UI mesmo que a API diga que não existe mais
        setPosts(prev => prev.map(p => {
          if (p.id === postId && p.comments) {
            return {
              ...p,
              comments: p.comments.filter(c => c.id !== commentId)
            };
          }
          return p;
        }));

        setCommentsModalPost(prev => {
          if (!prev) return null;
          return {
            ...prev,
            comments: prev.comments.filter(c => c.id !== commentId)
          };
        });
        return;
      }

      const errorMessage = err.response?.data?.message || err.message || 'Erro ao excluir comentário';
      addToast('error', errorMessage);
    }  };

  const [confirmCommentModal, setConfirmCommentModal] = useState<{
    isOpen: boolean;
    commentId: number | null;
    postId: number | null;
  }>({
    isOpen: false,
    commentId: null,
    postId: null,
  });

  // Mention state
  const [mentionQuery, setMentionQuery] = useState('');
  const [mentionUsers, setMentionUsers] = useState<any[]>([]);
  const [showMentionDropdown, setShowMentionDropdown] = useState(false);
  const [mentionLoading, setMentionLoading] = useState(false);
  const [mentionTargetField, setMentionTargetField] = useState<'create' | 'edit'>('create');
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0 });
  const [selectedMentionIndex, setSelectedMentionIndex] = useState(0);
  const editorRef = useRef<HTMLDivElement>(null);
  const debouncedMentionQuery = useDebounce(mentionQuery, 300);

  useEffect(() => {
    if (!showMentionDropdown) {
      setSelectedMentionIndex(0);
    }
  }, [showMentionDropdown]);

  const handleDeleteCommentConfirm = async () => {
    if (confirmCommentModal.commentId && confirmCommentModal.postId) {
      await handleDeleteComment(confirmCommentModal.commentId, confirmCommentModal.postId);
    }
    setConfirmCommentModal({ isOpen: false, commentId: null, postId: null });
  };

  const handleDeleteCommentClick = (commentId: number, postId: number) => {
    setConfirmCommentModal({ isOpen: true, commentId, postId });
  };

  const resetEditPostState = () => {
    setEditPostModal(null);
    setEditTitle('');
    setEditContent('');
    setEditMediaType('none');
    setEditImages([]);
    setEditVideoUrl('');
    setEditIsSponsored(false);
    setEditEarnsCoins(false);
    setEditBoostLikeCoins('0');
    setEditBoostCommentCoins('0');
    setEditBoostShareCoins('0');
    setEditPostType('standard');
    setEditQuizQuestion('');
    setEditQuizCoinsParticipation('0');
    setEditQuizCoinsCorrect('0');
    setEditQuizAlternatives([]);
    
    // Limpar o editor contentEditable
    const editor = document.querySelector('[data-field="edit"]') as HTMLDivElement;
    if (editor) {
      editor.innerText = '';
    }
  };

  const handleUpdatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !editPostModal) return;

    // Validação específica para Quiz
    if (editPostType === 'quiz') {
      if (!editQuizQuestion.trim()) {
        addToast('error', 'A pergunta do quiz é obrigatória.');
        return;
      }

      if (editQuizAlternatives.some(alt => !alt.text.trim())) {
        addToast('error', 'Todas as alternativas do quiz precisam ser preenchidas.');
        return;
      }

      const filledAlts = editQuizAlternatives.filter(a => a.text.trim());
      if (filledAlts.length < 2) {
        addToast('error', 'O quiz deve ter pelo menos 2 alternativas.');
        return;
      }
      if (!editQuizAlternatives.some(a => a.is_correct)) {
        addToast('error', 'Selecione uma alternativa correta.');
        return;
      }
    }

    setIsUpdating(true);
    console.log('=== Update Post ===');
    console.log('editPostType:', editPostType);
    
    try {
      const processedContent = getProcessedContent('edit');
      const formData = new FormData();
      formData.append('title', editTitle);
      formData.append('content', processedContent);
      formData.append('post_type', editPostType);

      if (editPostType === 'quiz') {
        formData.append('quiz_question', editQuizQuestion);
        formData.append('quiz_coins_participation', editQuizCoinsParticipation || '0');
        formData.append('quiz_coins_correct', editQuizCoinsCorrect || '0');
        
        editQuizAlternatives.forEach((alt, index) => {
          if (alt.id) formData.append(`quiz_alternatives[${index}][id]`, alt.id.toString());
          formData.append(`quiz_alternatives[${index}][text]`, alt.text);
          formData.append(`quiz_alternatives[${index}][is_correct]`, alt.is_correct ? '1' : '0');
        });
        
        // Limpar mídia se for quiz
        formData.append('image', '');
        formData.append('video_url', '');
      } else {
        // Lógica de mídia: sempre envia os dois campos
        if (editMediaType === 'image') {
          // Envia imagens (novas ou sinaliza manter as atuais) e limpa vídeo
          if (editImages && editImages.length > 0) {
            editImages.forEach((img) => formData.append('images[]', img));
            console.log('Enviando novas imagens:', editImages.length);
          } else if ((editPostModal.images && editPostModal.images.length > 0) || editPostModal.image_url) {
            formData.append('keep_existing_media', 'true');
            console.log('Mantendo imagens atuais');
          }
          formData.append('video_url', '');
        } else if (editMediaType === 'video') {
          // Envia vídeo e limpa imagem
          formData.append('video_url', editVideoUrl);
          formData.append('image', '');
          console.log('Enviando vídeo e limpando imagem');
        } else {
          // Sem mídia: limpa ambos
          formData.append('image', '');
          formData.append('video_url', '');
          console.log('Limpando toda mídia');
        }

        if (currentUser?.user_type_id === 1) {
          formData.append('is_sponsored', editIsSponsored ? '1' : '0');
          if (editEarnsCoins) {
            const like = parseInt(editBoostLikeCoins || '0');
            const comment = parseInt(editBoostCommentCoins || '0');
            const share = parseInt(editBoostShareCoins || '0');

            if (like === 0 && comment === 0 && share === 0) {
              addToast('error', 'Ao habilitar Post Turbinado, preencha pelo menos um dos valores de recompensa (Curtir, Comentar ou Compartilhar).');
              setIsUpdating(false);
              return;
            }

            formData.append('boost_like_coins', editBoostLikeCoins.toString());
            formData.append('boost_comment_coins', editBoostCommentCoins.toString());
            formData.append('boost_share_coins', editBoostShareCoins.toString());
          } else {
            formData.append('boost_like_coins', '0');
            formData.append('boost_comment_coins', '0');
            formData.append('boost_share_coins', '0');
          }
        }
      }

      console.log('FormData enviado para atualização:');
      for (let pair of formData.entries()) {
        console.log(pair[0] + ': ' + (pair[1] instanceof File ? `[File: ${pair[1].name}]` : pair[1]));
      }

      // Usar API específica para FormData
      await postsService.updatePostWithMedia(token, editPostModal.id, formData);

      // Atualizar lista de posts (refresh completo)
      const dateFilter = filterStartDate && filterEndDate 
        ? `${filterStartDate},${filterEndDate}` 
        : filterStartDate || filterEndDate || '';
      await fetchPosts(currentPage, { 
        userName: filterUserName, 
        search: filterContent,
        createdAt: dateFilter,
        earnsCoins: filterEarnsCoins === 'all' ? undefined : filterEarnsCoins,
        isSponsored: filterIsSponsored === 'all' ? undefined : filterIsSponsored,
        isBoosted: filterIsBoosted === 'all' ? undefined : filterIsBoosted,
        postType: filterPostType === 'all' ? undefined : filterPostType,
        sort: sortOrder
      });

      setEditPostModal(null);
      setEditTitle('');
      setEditContent('');
      setEditMediaType('none');
      setEditImages([]);
      setEditVideoUrl('');
      addToast('success', 'Post atualizado com sucesso!');
    } catch (err: any) {
      console.error('Error updating post:', err);
      const errorMessage = err.response?.data?.message || err.message || 'Erro ao atualizar post';
      addToast('error', errorMessage);
    } finally {
      setIsUpdating(false);
    }
  };

  const openEditModal = (post: Post) => {
    setEditPostModal(post);
    setEditTitle(post.title || '');

    // Quiz fields
    setEditPostType(post.post_type || 'standard');
    setEditQuizQuestion(post.quiz_question || '');
    setEditQuizCoinsParticipation(String(post.quiz_coins_participation || 0));
    setEditQuizCoinsCorrect(String(post.quiz_coins_correct || 0));
    setEditQuizAlternatives(post.quiz_alternatives && post.quiz_alternatives.length > 0 ? post.quiz_alternatives : [
      { text: '', is_correct: true },
      { text: '', is_correct: false }
    ]);

    // Limpar tags HTML do conteúdo antes de editar e transformar menções em pills
    const cleanContent = (post.content || '').replace(/<[^>]*>?/gm, '');
    setEditContent(cleanContent);

    const mentionRegex = /(@[A-Za-z0-9_.-]+)/g;
    const htmlWithPills = cleanContent.replace(mentionRegex, (match) => {
      const username = match.substring(1).toLowerCase();
      const user = allMentionUsers.find(u => u.username?.toLowerCase() === username) || 
                   (Object.values(usersCache) as UserType[]).find(u => u.username?.toLowerCase() === username);
      
      const displayName = user ? (user.username || user.name) : username;
      return `<span class="inline-flex items-center px-2 py-0.5 rounded-md bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-[13px] font-bold italic select-none mx-1" contenteditable="false" data-username="${username}">@${displayName}</span>`;
      });
    // Sincronizar o DOM do editor de edição
    setTimeout(() => {
      const editor = document.querySelector('[data-field="edit"]') as HTMLDivElement;
      if (editor) {
        editor.innerHTML = htmlWithPills;
      }
    }, 0);    
    setEditIsSponsored(post.is_sponsored || false);
    const hasBoosts = (Number(post.boost_like_coins) > 0 || 
                      Number(post.boost_comment_coins) > 0 || 
                      Number(post.boost_share_coins) > 0);
    setEditEarnsCoins(hasBoosts);
    setEditBoostLikeCoins(String(post.boost_like_coins || 0));
    setEditBoostCommentCoins(String(post.boost_comment_coins || 0));
    setEditBoostShareCoins(String(post.boost_share_coins || 0));
    
    // Inicializar mídia atual do post
    if (post.video_url) {
      setEditMediaType('video');
      setEditVideoUrl(post.video_url);
      setEditImages([]);
    } else if (post.image_url || (post.images && post.images.length > 0)) {
      setEditMediaType('image');
      setEditVideoUrl('');
      setEditImages([]);
    } else {
      setEditMediaType('none');
      setEditImages([]);
      setEditVideoUrl('');
    }
    
    setActiveMenuPostId(null);
  };

  useEffect(() => {
    if (contentModalPost) {
      setCarouselIndex(0);
    }
  }, [contentModalPost]);

  useEffect(() => {
    if (likesModalPost?.likes) {
      const userIds = likesModalPost.likes.map(l => l.user_id);
      fetchMissingUsers(userIds);
    }
  }, [likesModalPost]);

  useEffect(() => {
    if (commentsModalPost?.comments) {
      const userIds = commentsModalPost.comments.map(c => c.user_id);
      fetchMissingUsers(userIds);
    }
  }, [commentsModalPost]);

  useEffect(() => {
    if (showMentionDropdown && token) {
      const fetchMentions = async () => {
        setMentionLoading(true);
        try {
          const response = await usersService.getMentions(token, debouncedMentionQuery);
          setMentionUsers(response.data || []);
        } catch (error) {
          console.error('Error fetching mentions:', error);
        } finally {
          setMentionLoading(false);
        }
      };
      fetchMentions();
    }
  }, [debouncedMentionQuery, showMentionDropdown, token]);

  const getProcessedContent = (field: 'create' | 'edit') => {
    const editor = document.querySelector(`[data-field="${field}"]`) as HTMLDivElement;
    if (!editor) return '';

    // Clonamos o editor para manipular sem mexer na UI
    const clone = editor.cloneNode(true) as HTMLDivElement;
    const pills = clone.querySelectorAll('span[data-username]');
    
    // Substitui cada pill pelo seu respectivo @username
    pills.forEach(pill => {
      const username = (pill as HTMLElement).dataset.username;
      const textNode = document.createTextNode(`@${username}`);
      pill.parentNode?.replaceChild(textNode, pill);
    });

    return clone.innerText.trim();
  };

  const getCaretCharacterOffsetWithin = (element: HTMLElement) => {
    let caretOffset = 0;
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      const preCaretRange = range.cloneRange();
      preCaretRange.selectNodeContents(element);
      preCaretRange.setEnd(range.endContainer, range.endOffset);
      caretOffset = preCaretRange.toString().length;
    }
    return caretOffset;
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>, field: 'create' | 'edit') => {
    if (showMentionDropdown && mentionTargetField === field) {
      if (e.key === 'Enter') {
        // Só permite selecionar com Enter se houver exatamente 1 usuário disponível
        const availableUsers = mentionUsers.filter(u => u.username);
        if (availableUsers.length === 1) {
          e.preventDefault();
          handleSelectMention(availableUsers[0]);
          return;
        }
        // Se houver mais de um, o Enter segue o comportamento padrão (pode ser nova linha se permitido)
        // ou simplesmente não seleciona a menção.
      }
      if (e.key === 'Escape') {
        setShowMentionDropdown(false);
        return;
      }
    }

    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;
    const range = selection.getRangeAt(0);

    if (e.key === 'Backspace') {
      if (range.collapsed && range.startOffset === 0) {
        // Se o cursor está no início de um text node, verifica o elemento anterior
        const container = range.startContainer;
        const previousSibling = container.previousSibling;
        
        if (previousSibling instanceof HTMLSpanElement && previousSibling.dataset.username) {
          // Se o elemento anterior é um pill de menção, remove ele
          e.preventDefault();
          previousSibling.remove();
          
          // Atualiza o estado
          const editor = e.currentTarget;
          if (field === 'create') {
            setNewPostContent(editor.innerText);
          } else {
            setEditContent(editor.innerText);
          }
        }
      }
    } else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && e.key !== ' ') {
      // Bloquear digitação de caracteres normais (exceto espaço) colados após uma menção
      if (range.collapsed && range.startOffset === 0) {
        const previousSibling = range.startContainer.previousSibling;
        if (previousSibling instanceof HTMLSpanElement && previousSibling.dataset.username) {
          // Impedir se estiver tentando digitar grudado no pill
          e.preventDefault();
        }
      }
    }
  };

  const handleMentionChange = (text: string, element: HTMLDivElement, field: 'create' | 'edit') => {
    const cursorPosition = getCaretCharacterOffsetWithin(element);
    const textBeforeCursor = text.slice(0, cursorPosition);
    const words = textBeforeCursor.split(/\s/);
    const lastWord = words[words.length - 1];

    // Regex para validar o início de uma menção: @ seguido de caracteres válidos
    const mentionMatch = lastWord.match(/^@([A-Za-z0-9_.-]*)$/);

    if (mentionMatch) {
      const query = mentionMatch[1];
      
      // Get cursor coordinates for dropdown positioning
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0).cloneRange();
        let rect = range.getBoundingClientRect();
        
        // Se o rect estiver zerado (comum em ranges colapsados ou em certas condições do DOM)
        // tentamos obter o primeiro cliente rect disponível que costuma ser mais preciso para o caret
        if (rect.top === 0 && rect.left === 0) {
          const rects = range.getClientRects();
          if (rects.length > 0) {
            rect = rects[0];
          }
        }

        if (rect && (rect.top !== 0 || rect.left !== 0)) {
          const editorRect = element.getBoundingClientRect();
          setMentionQuery(query);
          setShowMentionDropdown(true);
          setMentionTargetField(field);
          setDropdownPos({
            top: rect.bottom - editorRect.top,
            left: rect.left - editorRect.left
          });
        } else {
          // Se não conseguiu coordenadas válidas, melhor não mostrar a modal
          setShowMentionDropdown(false);
        }
      } else {
        setShowMentionDropdown(false);
      }
    } else {
      setShowMentionDropdown(false);
    }

    if (field === 'create') {
      setNewPostContent(text);
    } else {
      setEditContent(text);
    }
  };

  const handleSelectMention = (user: UserType) => {
    const selection = window.getSelection();
    if (!selection || !selection.rangeCount) return;

    const range = selection.getRangeAt(0);
    // Expand selection to include the '@' and current query
    const textNode = range.startContainer;
    const offset = range.startOffset;
    const content = textNode.textContent || '';
    
    // Find the '@' before the cursor
    const lastAtIndex = content.lastIndexOf('@', offset - 1);
    if (lastAtIndex !== -1) {
      range.setStart(textNode, lastAtIndex);
      range.setEnd(textNode, offset);
      range.deleteContents();

      // Criar a menção como um 'pill' (span inline-block)
      const mentionSpan = document.createElement('span');
      mentionSpan.className = 'inline-flex items-center px-2 py-0.5 rounded-md bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-[13px] font-bold italic select-none mx-1';
      mentionSpan.contentEditable = 'false';
      mentionSpan.dataset.username = user.username || '';
      mentionSpan.textContent = `@${user.username || user.name}`;
      
      range.insertNode(mentionSpan);
      
      // Adicionar um space após a menção para facilitar a digitação contínua
      // Usamos um espaço inquebrável (\u00A0) seguido de um espaço normal para garantir visibilidade no contentEditable
      const space = document.createTextNode('\u00A0');
      mentionSpan.after(space);
      
      // Mover o cursor após o espaço
      const newRange = document.createRange();
      newRange.setStartAfter(space);
      newRange.setEndAfter(space);
      selection.removeAllRanges();
      selection.addRange(newRange);

      // Trigger update to React state
      const editorElement = document.querySelector(`[data-field="${mentionTargetField}"]`) as HTMLDivElement;
      if (editorElement) {
        // Garantimos que o innerText pegue o novo espaço
        const updatedText = editorElement.innerText;
        if (mentionTargetField === 'create') {
          setNewPostContent(updatedText);
        } else {
          setEditContent(updatedText);
        }
      }
    }

    setShowMentionDropdown(false);
    setMentionQuery('');
  };

  const renderPostContent = (text: string, isCompact = false) => {
    if (!text) return null;

    // Regex para capturar tags <a> de menção ou texto que pareça menção/hashtag
    // Prioriza tags <a> vindas da API que contêm metadados (username, pic, campaignname)
    const regex = /(<a\s+[^>]*mention="true"[^>]*>.*?<\/a>|@[A-Za-z0-9_.-]+|#[A-Za-zÀ-ÖØ-öø-ÿ0-9_.-]+)/g;
    
    // Divide o texto em partes, mantendo os delimitadores (capturados pelos parênteses no regex)
    const parts = text.split(regex);

    return parts.map((part, index) => {
      if (!part) return null;

      // Trata tags <a> de menção ou hashtag (vinda da API)
      if (part.startsWith('<a') && part.includes('mention="true"')) {
        const usernameMatch = part.match(/username="([^"]*)"/);
        const picMatch = part.match(/pic="([^"]*)"/);
        const campaignMatch = part.match(/campaignname="([^"]*)"/);
        const contentMatch = part.match(/>(.*?)<\/a>/);
        
        const username = usernameMatch ? usernameMatch[1] : '';
        const pic = picMatch ? picMatch[1] : null;
        const campaignName = campaignMatch ? campaignMatch[1] : '';
        const rawContent = contentMatch ? contentMatch[1] : '';

        // Se o conteúdo começar com #, é uma hashtag
        if (rawContent.startsWith('#')) {
          return (
            <span 
              key={index} 
              title={campaignName || 'Hashtag de Campanha'}
              className="inline-flex items-center px-1.5 py-0.5 rounded-md bg-primary-100/50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400 text-[13px] font-bold select-none mx-0.5 hover:underline cursor-pointer transition-colors"
            >
              {rawContent}
            </span>
          );
        }

        // Caso contrário, trata como menção de usuário
        const displayName = username || rawContent.replace(/^@/, '');

        return (
          <span 
            key={index} 
            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-blue-100/50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-[13px] font-bold italic select-none mx-0.5 hover:underline cursor-pointer transition-colors relative group/mention hover:z-50"
          >
            {pic && (
              <img 
                src={pic} 
                alt={username} 
                className="w-4 h-4 rounded-full object-cover border border-blue-200 dark:border-blue-800"
              />
            )}
            @{displayName}
            {pic && (
              <div className="absolute top-full left-1/2 -translate-x-1/2 z-[100] mt-2 opacity-0 invisible group-hover/mention:opacity-100 group-hover/mention:visible transition-all duration-300 pointer-events-none drop-shadow-lg">
                <div className={`bg-white dark:bg-zinc-800 p-1 rounded-xl border border-zinc-200 dark:border-zinc-700 ${isCompact ? 'w-10 h-10' : 'w-24 h-24'} overflow-hidden`}>
                  <img 
                    src={pic} 
                    alt={username} 
                    className="w-full h-full rounded-lg object-cover bg-zinc-100 dark:bg-zinc-900"
                  />
                </div>
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 -mb-1 border-8 border-transparent border-b-white dark:border-t-transparent dark:border-b-zinc-800"></div>
              </div>
            )}
          </span>
        );
      }

      // Trata Menções (@) em texto puro (ex: durante criação ou se a API não formatar)
      if (part.startsWith('@')) {
        const username = part.substring(1).trim().toLowerCase();
        
        const mentionedUser = allMentionUsers.find(
          u => u.username?.toLowerCase() === username
        ) || (Object.values(usersCache) as UserType[]).find(
          u => u.username?.toLowerCase() === username
        );

        return (
          <span 
            key={index} 
            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-blue-100/50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-[13px] font-bold italic select-none mx-0.5 hover:underline cursor-pointer transition-colors relative group/mention hover:z-50"
          >
            {mentionedUser?.profile_image_url && (
              <img 
                src={getFullImageUrl(mentionedUser.profile_image_url) || ''} 
                alt={mentionedUser.name} 
                className="w-4 h-4 rounded-full object-cover border border-blue-200 dark:border-blue-800"
              />
            )}
            @{mentionedUser ? (mentionedUser.username || mentionedUser.name) : username}
            {mentionedUser?.profile_image_url && (
              <div className="absolute top-full left-1/2 -translate-x-1/2 z-[100] mt-2 opacity-0 invisible group-hover/mention:opacity-100 group-hover/mention:visible transition-all duration-300 pointer-events-none drop-shadow-lg">
                <div className={`bg-white dark:bg-zinc-800 p-1 rounded-xl border border-zinc-200 dark:border-zinc-700 ${isCompact ? 'w-10 h-10' : 'w-24 h-24'} overflow-hidden`}>
                  <img 
                    src={getFullImageUrl(mentionedUser.profile_image_url) || ''} 
                    alt={mentionedUser.name} 
                    className="w-full h-full rounded-lg object-cover bg-zinc-100 dark:bg-zinc-900"
                  />
                </div>
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 -mb-1 border-8 border-transparent border-b-white dark:border-t-transparent dark:border-b-zinc-800"></div>
              </div>
            )}
          </span>
        );
      }

      // Trata Hashtags (#)
      if (part.startsWith('#')) {
        const hashtagLower = part.toLowerCase();
        const isValidHashtag = allHashtags.some(h => h.hashtag.toLowerCase() === hashtagLower);

        // Só estiliza se a hashtag for válida no sistema
        if (isValidHashtag) {
          const hashtagData = allHashtags.find(h => h.hashtag.toLowerCase() === hashtagLower);
          return (
            <span 
              key={index}
              title={hashtagData?.campaign_name || 'Hashtag de Campanha'}
              className="inline-flex items-center px-1.5 py-0.5 rounded-md bg-primary-100/50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400 text-[13px] font-bold select-none mx-0.5 hover:underline cursor-pointer transition-colors"
            >
              {part}
            </span>
          );
        }
        
        // Se não for válida, renderiza como texto comum
        return <span key={index}>{part}</span>;
      }

      // Texto normal (remove quaisquer tags HTML residuais para segurança e evitar quebras)
      const cleanText = part.replace(/<[^>]*>?/gm, '');
      return <span key={index}>{cleanText}</span>;
    });
  };

  useEffect(() => {
    const dateFilter = filterStartDate && filterEndDate
      ? `${filterStartDate},${filterEndDate}`
      : filterStartDate || filterEndDate || '';

    fetchPosts(currentPage, { 
      userName: debouncedUserName, 
      search: debouncedContent,
      createdAt: dateFilter,
      earnsCoins: filterEarnsCoins === 'all' ? undefined : filterEarnsCoins,
      isSponsored: filterIsSponsored === 'all' ? undefined : filterIsSponsored,
      isBoosted: filterIsBoosted === 'all' ? undefined : filterIsBoosted,
      postType: filterPostType === 'all' ? undefined : filterPostType,
      sort: sortOrder
    });
  }, [fetchPosts, currentPage, debouncedUserName, debouncedContent, filterStartDate, filterEndDate, filterEarnsCoins, filterIsSponsored, filterIsBoosted, filterPostType, sortOrder]);

  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedUserName, debouncedContent, filterStartDate, filterEndDate, filterEarnsCoins, filterIsSponsored, filterIsBoosted, filterPostType, sortOrder]);

  return (
    <>
      <style>
        {`
          [contenteditable]:empty:before {
            content: "O que você está pensando?";
            color: #a1a1aa;
            pointer-events: none;
            display: block;
          }
          .dark [contenteditable]:empty:before {
            color: #71717a;
          }
        `}
      </style>
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
        onConfirm={handleConfirmModalAction}
        title={confirmModal.title}
        message={confirmModal.message}
        isLoading={confirmModal.isLoading}
      />
      <ConfirmModal
        isOpen={confirmCommentModal.isOpen}
        onClose={() => setConfirmCommentModal({ isOpen: false, commentId: null, postId: null })}
        onConfirm={handleDeleteCommentConfirm}
        title="Excluir Comentário"
        message="Tem certeza que deseja excluir este comentário? Esta ação não pode ser desfeita."
        isLoading={false}
      />
      <div className="p-4 md:p-8 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">Postagens</h1>
            <p className="text-zinc-500 dark:text-zinc-400">Gerencie e visualize as publicações do seu time.</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => {
                const dateFilter = filterStartDate && filterEndDate ? `${filterStartDate},${filterEndDate}` : filterStartDate || filterEndDate || '';
                fetchPosts(currentPage, { userName: filterUserName, search: filterContent, createdAt: dateFilter });
              }}
              className="bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 p-2 rounded-xl text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-all"
              title="Atualizar"
            >
              <RefreshCw size={20} className={loading ? "animate-spin" : ""} />
            </button>
            <button
              onClick={() => setCreatePostModal(true)}
              className="bg-primary-600 px-4 py-2 rounded-xl text-sm font-medium text-white hover:bg-primary-700 shadow-sm transition-all flex items-center gap-2"
            >
              <Plus size={18} />
              Novo Post
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white dark:bg-zinc-800 p-4 md:p-6 rounded-2xl shadow-sm border border-zinc-100 dark:border-zinc-700 space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            <div className="lg:col-span-3 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-zinc-400 dark:text-zinc-500" size={18} />
              <input 
                type="text" 
                placeholder="Nome do usuário..." 
                className="w-full pl-10 pr-4 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-500 text-sm"
                value={filterUserName}
                onChange={(e) => setFilterUserName(e.target.value)}
              />
            </div>
            <div className="lg:col-span-4 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-zinc-400 dark:text-zinc-500" size={18} />
              <input 
                type="text" 
                placeholder="Título ou conteúdo..." 
                className="w-full pl-10 pr-4 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-500 text-sm"
                value={filterContent}
                onChange={(e) => setFilterContent(e.target.value)}
              />
            </div>
            <div className="lg:col-span-5 grid grid-cols-2 gap-2">
              <div className="relative group cursor-pointer" onClick={(e) => {
                const input = e.currentTarget.querySelector('input');
                if (input && 'showPicker' in input) {
                  try { input.showPicker(); } catch (err) { console.error(err); }
                }
              }}>
                <Calendar size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-primary-500 pointer-events-none group-hover:text-primary-600 transition-colors" />
                <input
                  type="date"
                  className="w-full pl-9 pr-2 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 text-zinc-900 dark:text-zinc-100 text-sm cursor-pointer [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:inset-0 [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:cursor-pointer"
                  value={filterStartDate}
                  onChange={(e) => setFilterStartDate(e.target.value)}
                  title="Início"
                />
              </div>
              <div className="relative group cursor-pointer" onClick={(e) => {
                const input = e.currentTarget.querySelector('input');
                if (input && 'showPicker' in input) {
                  try { input.showPicker(); } catch (err) { console.error(err); }
                }
              }}>
                <Calendar size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-primary-500 pointer-events-none group-hover:text-primary-600 transition-colors" />
                <input
                  type="date"
                  className="w-full pl-9 pr-2 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 text-zinc-900 dark:text-zinc-100 text-sm cursor-pointer [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:inset-0 [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:cursor-pointer"
                  value={filterEndDate}
                  onChange={(e) => setFilterEndDate(e.target.value)}
                  title="Fim"
                />
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-y-4 gap-x-6 pt-2 border-t border-zinc-50 dark:border-zinc-700/50">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2">
              <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Ordenação:</span>
              <select
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value)}
                className="px-4 py-1.5 bg-zinc-100 dark:bg-zinc-900 border-none rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-zinc-900 dark:text-zinc-100 text-xs font-medium cursor-pointer shadow-sm"
              >
                <option value="-created_at">Mais recentes</option>
                <option value="created_at">Mais antigos</option>
              </select>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center gap-2">              <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Patrocinado:</span>
              <div className="flex bg-zinc-100 dark:bg-zinc-900 p-1 rounded-lg w-fit">
                {[
                  { label: 'Todos', value: 'all' },
                  { label: 'Sim', value: true },
                  { label: 'Não', value: false }
                ].map((opt) => (
                  <button
                    key={opt.label}
                    onClick={() => setFilterIsSponsored(opt.value as any)}
                    className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${
                      filterIsSponsored === opt.value
                        ? 'bg-white dark:bg-zinc-800 text-primary-600 dark:text-primary-400 shadow-sm'
                        : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center gap-2">
              <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Turbinado:</span>
              <div className="flex bg-zinc-100 dark:bg-zinc-900 p-1 rounded-lg w-fit">
                {[
                  { label: 'Todos', value: 'all' },
                  { label: 'Sim', value: true },
                  { label: 'Não', value: false }
                ].map((opt) => (
                  <button
                    key={opt.label}
                    onClick={() => setFilterIsBoosted(opt.value as any)}
                    className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${
                      filterIsBoosted === opt.value
                        ? 'bg-white dark:bg-zinc-800 text-primary-600 dark:text-primary-400 shadow-sm'
                        : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center gap-2">
              <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Tipo:</span>
              <div className="flex bg-zinc-100 dark:bg-zinc-900 p-1 rounded-lg w-fit">
                {[
                  { label: 'Todos', value: 'all' },
                  { label: 'Padrão', value: 'standard' },
                  { label: 'Quiz', value: 'quiz' }
                ].map((opt) => (
                  <button
                    key={opt.label}
                    onClick={() => setFilterPostType(opt.value as any)}
                    className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${
                      filterPostType === opt.value
                        ? 'bg-white dark:bg-zinc-800 text-primary-600 dark:text-primary-400 shadow-sm'
                        : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {(filterUserName || filterContent || filterStartDate || filterEndDate || filterEarnsCoins !== 'all' || filterIsSponsored !== 'all' || filterIsBoosted !== 'all' || filterPostType !== 'all') && (
              <button
                onClick={() => {
                  setFilterUserName('');
                  setFilterContent('');
                  setFilterStartDate('');
                  setFilterEndDate('');
                  setFilterEarnsCoins('all');
                  setFilterIsSponsored('all');
                  setFilterIsBoosted('all');
                  setFilterPostType('all');
                  setSortOrder('-created_at');
                }}
                className="ml-auto text-xs text-red-500 hover:text-red-600 font-bold uppercase tracking-wider flex items-center gap-1.5 px-3 py-1.5 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-lg transition-all"
              >
                <Trash2 size={14} />
                Limpar Filtros
              </button>
            )}
          </div>
        </div>

        {/* Posts List */}
        {loading && posts.length === 0 ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 text-primary-600 animate-spin" />
          </div>
        ) : error ? (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 p-4 rounded-xl text-center">
            {error}
            <button
              onClick={() => {
                const dateFilter = filterStartDate && filterEndDate ? `${filterStartDate},${filterEndDate}` : filterStartDate || filterEndDate || '';
                fetchPosts(currentPage, { userName: filterUserName, search: filterContent, createdAt: dateFilter });
              }}
              className="block mx-auto mt-2 text-sm font-semibold hover:underline"
            >
              Tentar novamente
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {posts.map((post) => (
                <motion.div 
                  key={post.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm flex flex-col relative w-full max-w-[450px] mx-auto"
                >
                  {/* Header */}
                  <div className="p-3 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 bg-gradient-to-tr from-primary-400 via-primary-500 to-primary-600 p-[2px] rounded-full flex-shrink-0">
                        <div className="w-full h-full bg-white dark:bg-zinc-900 rounded-full p-[2px]">
                          {post.user?.profile_image_url ? (
                            <img src={getFullImageUrl(post.user.profile_image_url) || ''} alt={post.user.name} className="w-full h-full rounded-full object-cover" />
                          ) : (
                            <div className="w-full h-full bg-zinc-100 dark:bg-zinc-800 rounded-full flex items-center justify-center text-zinc-400 dark:text-zinc-500">
                              <User size={14} />
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <h3 className="font-semibold text-sm text-zinc-900 dark:text-zinc-100 leading-none truncate">{post.user?.name || 'Usuário'}</h3>
                          <div className="flex items-center gap-1 flex-shrink-0">
                            {post.post_type === 'quiz' && (
                              <div className="bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider">
                                Quiz
                              </div>
                            )}
                            {post.is_sponsored && (
                              <div className="text-amber-500" title="Patrocinado">
                                <Coins size={14} className="fill-amber-500/10" />
                              </div>
                            )}
                            {post.is_boosted && (
                              <div className="text-primary-600 dark:text-primary-400" title="Turbinado">
                                <Rocket size={14} className="fill-primary-600/10" />
                              </div>
                            )}
                          </div>
                        </div>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 truncate">
                          {formatRelativeDate(post.created_at)}
                        </p>
                      </div>
                    </div>
                    <div className="relative flex-shrink-0">
                      <button
                        onClick={() => setActiveMenuPostId(activeMenuPostId === post.id ? null : post.id)}
                        className="text-zinc-400 dark:text-zinc-500 hover:text-zinc-600 dark:hover:text-zinc-300 flex-shrink-0 p-1 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                      >
                        <MoreHorizontal size={20} />
                      </button>

                      {activeMenuPostId === post.id && (
                        <div className="absolute right-0 top-full mt-1 w-48 bg-white dark:bg-zinc-800 rounded-xl shadow-lg border border-zinc-100 dark:border-zinc-700 py-1 z-[60] overflow-hidden">
                          {(() => {
                            const isOwner = String(post.user_id) === String(currentUser?.id) || String(post.user?.id) === String(currentUser?.id);
                            const isAdmin = currentUser?.user_type_id === 1;
                            
                            const canEdit = isAdmin || isOwner;
                            const canDelete = isAdmin || isOwner;

                            if (!canEdit && !canDelete) {
                              return (
                                <div className="px-4 py-2 text-xs text-zinc-400 dark:text-zinc-500 text-center">
                                  Sem ações disponíveis
                                </div>
                              );
                            }

                            return (
                              <>
                                {canEdit && (
                                  <button 
                                    onClick={() => openEditModal(post)}
                                    className="w-full text-left px-4 py-2 text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-700 flex items-center gap-2"
                                  >
                                    <Edit size={16} />
                                    Editar
                                  </button>
                                )}
                                {canDelete && (
                                  <button 
                                    onClick={() => handleDeletePost(post)}
                                    className="w-full text-left px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2"
                                  >
                                    {isDeleting === post.id ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                                    Excluir
                                  </button>
                                )}
                              </>
                            );
                          })()}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Standard Post Indicator */}
                  {post.post_type !== 'quiz' && (
                    <div className={`px-6 py-3 border-y transition-colors ${
                      post.is_boosted 
                        ? 'bg-primary-50/50 dark:bg-primary-900/10 border-primary-100/50 dark:border-primary-900/20' 
                        : post.is_sponsored
                          ? 'bg-amber-50/50 dark:bg-amber-900/10 border-amber-100/50 dark:border-amber-900/20'
                          : 'bg-zinc-50/50 dark:bg-zinc-800/30 border-zinc-100 dark:border-zinc-800/50'
                    }`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center shadow-sm border transition-all ${
                            post.is_boosted
                              ? 'bg-primary-600 text-white border-primary-700'
                              : post.is_sponsored
                                ? 'bg-amber-500 text-white border-amber-600'
                                : 'bg-white dark:bg-zinc-900 text-zinc-500 dark:text-zinc-400 border-zinc-200 dark:border-zinc-700'
                          }`}>
                            {post.is_boosted ? <Rocket size={16} /> : post.is_sponsored ? <Coins size={16} /> : <Megaphone size={16} />}
                          </div>
                          <div>
                            <h4 className={`text-[11px] font-bold leading-tight ${
                              post.is_boosted ? 'text-primary-700 dark:text-primary-400' : post.is_sponsored ? 'text-amber-700 dark:text-amber-400' : 'text-zinc-900 dark:text-zinc-100'
                            }`}>
                              {post.is_boosted ? 'Post Turbinado' : post.is_sponsored ? 'Post Patrocinado' : 'Conteúdo'}
                            </h4>
                            <p className="text-[9px] text-zinc-500 dark:text-zinc-400 uppercase font-bold tracking-widest">
                              {post.is_boosted ? 'Ganha moedas por interação' : post.is_sponsored ? 'Destaque prioritário' : 'Postagem Padrão'}
                            </p>
                          </div>
                        </div>

                        {/* If it's both, show Sponsored as a small tag since Boosted is the main visual */}
                        {post.is_boosted && post.is_sponsored && (
                          <div className="flex items-center gap-1 bg-amber-100 dark:bg-amber-900/40 px-2 py-0.5 rounded-md border border-amber-200/50 dark:border-amber-800/50">
                            <Coins size={10} className="text-amber-600 dark:text-amber-400" />
                            <span className="text-[9px] font-bold text-amber-700 dark:text-amber-300 uppercase tracking-tighter">Patrocinado</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Quiz Content */}
                  {post.post_type === 'quiz' && (
                    <div className="p-6 bg-primary-50/30 dark:bg-primary-900/10 border-y border-primary-100/50 dark:border-primary-900/20">
                      <div className="flex items-center gap-2 mb-4">
                        <div className="w-10 h-10 rounded-xl bg-primary-600 flex items-center justify-center text-white shadow-lg shadow-primary-600/20">
                          <AlertCircle size={24} />
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 leading-tight">Desafio Quiz</h4>
                          <p className="text-[10px] text-zinc-500 dark:text-zinc-400 uppercase font-bold tracking-widest">Responda e ganhe</p>
                        </div>
                      </div>
                      
                      <p className="text-base font-bold text-zinc-900 dark:text-zinc-100 mb-6 leading-snug">
                        {post.quiz_question}
                      </p>

                      <div className="space-y-3">
                        {post.quiz_alternatives?.map((alt, idx) => {
                          const answers = post.quiz_answers?.filter(a => a.alternative_id === alt.id) || [];
                          return (
                            <button 
                              key={alt.id || idx}
                              onClick={() => setQuizAnswersModal({ alternative: alt, answers })}
                              className={`w-full p-3 rounded-xl border flex items-center gap-3 transition-all group/alt cursor-pointer ${
                                alt.is_correct 
                                  ? 'border-emerald-200 dark:border-emerald-900/30 bg-emerald-50/50 dark:bg-emerald-900/10 text-emerald-900 dark:text-emerald-100 hover:bg-emerald-100/30 dark:hover:bg-emerald-900/20'
                                  : 'border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100/50 dark:hover:bg-zinc-700/40'                              } text-sm font-medium relative overflow-hidden`}
                            >
                              <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center text-[10px] font-bold flex-shrink-0 ${
                                alt.is_correct 
                                  ? 'border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400' 
                                  : 'border-zinc-200 dark:border-zinc-700 text-zinc-400'
                              }`}>
                                {String.fromCharCode(65 + idx)}
                              </div>
                              <span className="flex-1 text-left truncate">{alt.text}</span>
                              
                              <div className="flex items-center gap-2">
                                {answers.length > 0 && (
                                  <div className="flex -space-x-1.5 overflow-hidden group-hover/alt:mr-1 transition-all">
                                    {answers.slice(0, 3).map((ans, i) => (
                                      <div key={ans.id} className="w-5 h-5 rounded-full border-2 border-white dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-700 overflow-hidden">
                                        {ans.user.profile_image_url ? (
                                          <img src={getFullImageUrl(ans.user.profile_image_url) || ''} alt="" className="w-full h-full object-cover" />
                                        ) : (
                                          <User size={10} className="w-full h-full p-1" />
                                        )}
                                      </div>
                                    ))}
                                    {answers.length > 3 && (
                                      <div className="w-5 h-5 rounded-full border-2 border-white dark:border-zinc-800 bg-primary-600 flex items-center justify-center text-[8px] text-white font-bold">
                                        +{answers.length - 3}
                                      </div>
                                    )}
                                  </div>
                                )}
                                
                                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${
                                  alt.is_correct ? 'bg-emerald-200 dark:bg-emerald-800 text-emerald-700 dark:text-emerald-300' : 'bg-zinc-100 dark:bg-zinc-700 text-zinc-500 dark:text-zinc-400'
                                }`}>
                                  {answers.length}
                                </span>

                                {alt.is_correct && (
                                  <CheckCircle size={14} className="text-emerald-500" />
                                )}
                              </div>
                            </button>
                          );
                        })}
                      </div>

                      {(Number(post.quiz_coins_participation) > 0 || Number(post.quiz_coins_correct) > 0) && (
                        <div className="mt-6 flex flex-wrap gap-3 pt-4 border-t border-primary-100/50 dark:border-primary-900/20">
                          {Number(post.quiz_coins_participation) > 0 && (
                            <div className="flex items-center gap-1.5 bg-white dark:bg-zinc-800 px-3 py-1.5 rounded-lg border border-zinc-100 dark:border-zinc-700 shadow-sm">
                              <Coins size={14} className="text-amber-500" />
                              <span className="text-[11px] font-bold text-zinc-700 dark:text-zinc-300">+{post.quiz_coins_participation} por participar</span>
                            </div>
                          )}
                          {Number(post.quiz_coins_correct) > 0 && (
                            <div className="flex items-center gap-1.5 bg-primary-600 px-3 py-1.5 rounded-lg shadow-sm">
                              <Coins size={14} className="text-white" />
                              <span className="text-[11px] font-bold text-white">+{post.quiz_coins_correct} por acerto</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Image / Video Thumbnail */}
                  {(post.image_full_url || (post.images && post.images.length > 0) || post.video_url) && (
                    <div className="w-full relative overflow-hidden aspect-[16/9] flex items-center justify-center bg-zinc-50 dark:bg-zinc-800/30">
                      {post.video_url ? (
                        <div
                          className="w-full relative aspect-video cursor-pointer group bg-black"
                          onClick={() => setVideoModalPost(post)}
                        >
                          <img
                            src={post.video_thumbnail_url || getYouTubeThumbnailUrl(post.video_url) || ''}
                            alt="YouTube video thumbnail"
                            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                            loading="lazy"
                          />
                          <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/40 transition-colors">
                            <div className="w-16 h-16 bg-red-600 rounded-full flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                              <div className="w-0 h-0 border-t-10 border-t-transparent border-l-16 border-l-white border-b-10 border-b-transparent ml-1"></div>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <img
                          src={post.images && post.images.length > 0 && post.images[0]?.url ? post.images[0].url : (post.image_full_url || '')}
                          alt="Post content"
                          className="w-full h-full object-contain transition-transform duration-500 hover:scale-105"
                          loading="lazy"
                        />
                      )}
                    </div>
                  )}

                  {/* Actions & Content */}
                  <div className="p-6 flex-1 flex flex-col">
                    
                    {/* Content Wrapper */}
                    <button 
                      type="button"
                      onClick={() => {
                        if (post.post_type !== 'quiz') {
                          setContentModalPost(post);
                        }
                      }}
                      className={`flex-1 w-full group mb-3 pt-4 flex flex-col items-start text-left ${post.post_type !== 'quiz' ? 'cursor-pointer' : 'cursor-default'}`}
                    >
                      {post.title && (
                        <h4 className="text-base font-bold text-zinc-900 dark:text-zinc-100 mb-2 group-hover:text-primary-700 dark:group-hover:text-primary-500 transition-colors text-left w-full">
                          {post.title}
                        </h4>
                      )}
                      
                      <div className="flex-1 w-full min-h-[80px] max-h-[160px] overflow-hidden relative">
                        <div className="text-sm text-zinc-900 dark:text-zinc-300 group-hover:text-zinc-700 dark:group-hover:text-zinc-200 transition-colors text-left pb-6">
                          {renderPostContent(post.content, true)}
                        </div>
                        {post.content.length > 300 && (
                          <>
                            <div className="absolute bottom-0 right-0 left-0 h-12 bg-gradient-to-t from-white dark:from-zinc-900 via-white/80 dark:via-zinc-900/80 to-transparent pointer-events-none" />
                            <span className="absolute bottom-0 right-0 text-xs text-zinc-400 dark:text-zinc-500 font-bold group-hover:underline bg-white dark:bg-zinc-900 pl-2 pb-0.5 z-10">
                              Ver mais...
                            </span>
                          </>
                        )}
                      </div>
                    </button>

                    {/* Actions (Likes & Comments) */}
                    <div className="flex items-center gap-4 mt-auto pt-2 border-t border-zinc-50 dark:border-zinc-800">
                      <button 
                        onClick={() => setLikesModalPost(post)}
                        className="flex items-center gap-1.5 text-zinc-500 dark:text-zinc-400 hover:text-red-500 dark:hover:text-red-400 transition-colors group"
                        title="Curtidas"
                      >
                        <Heart size={18} className="group-hover:scale-110 transition-transform" />
                        <span className="text-xs font-medium">{post.likes_count || 0}</span>
                      </button>
                      
                      <button 
                        onClick={() => setCommentsModalPost(post)}
                        className="flex items-center gap-1.5 text-zinc-500 dark:text-zinc-400 hover:text-primary-600 dark:hover:text-primary-500 transition-colors group"
                        title="Comentários"
                      >
                        <MessageSquare size={18} className="group-hover:scale-110 transition-transform" />
                        <span className="text-xs font-medium">{post.comments_count || 0}</span>
                      </button>

                      <button 
                        onClick={() => handleShare(post)}
                        className="flex items-center gap-1.5 text-zinc-500 dark:text-zinc-400 hover:text-green-600 dark:hover:text-green-500 transition-colors group"
                        title="Compartilhar"
                      >
                        <Share2 size={18} className="group-hover:scale-110 transition-transform" />
                        <span className="text-xs font-medium">{post.shares_count || 0}</span>
                      </button>

                      <div 
                        className="flex items-center gap-1.5 text-zinc-500 dark:text-zinc-400 ml-auto"
                        title="Visualizações"
                      >
                        <Eye size={18} />
                        <span className="text-xs font-medium">{post.views_count || 0}</span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>

            {posts.length === 0 && (
              <div className="text-center py-12 bg-white dark:bg-zinc-800 rounded-2xl border border-dashed border-zinc-200 dark:border-zinc-700">
                <MessageSquare className="w-12 h-12 text-zinc-300 dark:text-zinc-600 mx-auto mb-3" />
                <h3 className="text-lg font-medium text-zinc-900 dark:text-zinc-100">Nenhum post encontrado</h3>
                <p className="text-zinc-500 dark:text-zinc-400">Tente ajustar seus filtros de busca.</p>
              </div>
            )}

            {/* Pagination Controls */}
            {totalItems > 0 && (
              <div className="flex items-center justify-between bg-white dark:bg-zinc-800 p-4 rounded-2xl border border-zinc-100 dark:border-zinc-700">
                <div className="text-sm text-zinc-500 dark:text-zinc-400">
                  Mostrando <span className="font-medium">{fromItem}</span> até <span className="font-medium">{toItem}</span> de <span className="font-medium">{totalItems}</span> resultados
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className="p-2 border border-zinc-200 dark:border-zinc-700 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-400 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft size={20} />
                  </button>
                  <span className="text-sm font-medium px-2 text-zinc-700 dark:text-zinc-300">
                    Página {currentPage} de {totalPages}
                  </span>
                  <button
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    className="p-2 border border-zinc-200 dark:border-zinc-700 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-400 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronRight size={20} />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

      </div>

        {/* Likes Modal */}
        <AnimatePresence>
          {likesModalPost && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white dark:bg-zinc-900 rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[80vh]"
              >
                <div className="p-4 border-b border-zinc-100 dark:border-zinc-800 flex justify-between items-center bg-zinc-50/50 dark:bg-zinc-800/50">
                  <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">Curtidas</h2>
                  <button onClick={() => setLikesModalPost(null)} className="text-zinc-400 dark:text-zinc-500 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors">
                    <X size={24} />
                  </button>
                </div>
                <div className="p-4 overflow-y-auto flex-1">
                  {loadingUsers ? (
                    <div className="flex justify-center py-8">
                      <Loader2 className="w-6 h-6 text-zinc-400 dark:text-zinc-500 animate-spin" />
                    </div>
                  ) : likesModalPost.likes && likesModalPost.likes.length > 0 ? (
                    <div className="space-y-2">
                      {likesModalPost.likes.map((like) => (
                        <UserListItem 
                          key={like.id} 
                          user={usersCache[like.user_id] || like.user} 
                          subtext={formatDateTime(like.created_at)}
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-zinc-500 dark:text-zinc-400">
                      Nenhuma curtida ainda.
                    </div>
                  )}
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Comments Modal */}
        <AnimatePresence>
          {commentsModalPost && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white dark:bg-zinc-900 rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[80vh]"
              >
                <div className="p-4 border-b border-zinc-100 dark:border-zinc-800 flex justify-between items-center bg-zinc-50/50 dark:bg-zinc-800/50">
                  <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">Comentar</h2>
                  <button onClick={() => setCommentsModalPost(null)} className="text-zinc-400 dark:text-zinc-500 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors">
                    <X size={24} />
                  </button>
                </div>
                <div className="p-4 overflow-y-auto flex-1">
                  {loadingUsers ? (
                    <div className="flex justify-center py-8">
                      <Loader2 className="w-6 h-6 text-zinc-400 dark:text-zinc-500 animate-spin" />
                    </div>
                  ) : commentsModalPost.comments && commentsModalPost.comments.length > 0 ? (
                    <div className="space-y-4">
                      {commentsModalPost.comments.map((comment) => {
                        const user = usersCache[comment.user_id] || comment.user;
                        const isAdmin = currentUser?.user_type_id === 1;
                        
                        return (
                          <div key={comment.id} className="flex gap-3 group">
                            <div className="w-8 h-8 bg-zinc-100 dark:bg-zinc-800 rounded-full flex items-center justify-center text-zinc-500 dark:text-zinc-400 flex-shrink-0 overflow-hidden mt-1">
                              {user?.profile_image_url ? (
                                <img src={getFullImageUrl(user.profile_image_url) || ''} alt={user.name} className="w-full h-full object-cover" />
                              ) : (
                                <User size={16} />
                              )}
                            </div>
                            <div className="flex-1">
                              <div className="bg-zinc-50 dark:bg-zinc-800 p-3 rounded-2xl rounded-tl-none">
                                <div className="flex items-start justify-between gap-2">
                                  <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-1">{user?.name || 'Usuário Desconhecido'}</p>
                                  {isAdmin && (
                                    <button
                                      onClick={() => handleDeleteCommentClick(comment.id, commentsModalPost.id)}
                                      className="text-red-400 hover:text-red-600 dark:text-red-500 dark:hover:text-red-400 transition-colors"
                                      title="Excluir comentário"
                                    >
                                      <Trash2 size={14} />
                                    </button>
                                  )}
                                </div>
                                <p className="text-sm text-zinc-700 dark:text-zinc-300">
                                  {renderPostContent(comment.text)}
                                </p>
                              </div>
                              <p className="text-[10px] text-zinc-400 dark:text-zinc-500 mt-1 ml-2">
                                {formatRelativeDate(comment.created_at)} • {formatDateTime(comment.created_at)}
                              </p>                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-zinc-500 dark:text-zinc-400">
                      Nenhum comentário ainda.
                    </div>
                  )}
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
        {/* Share Modal */}
        <AnimatePresence>
          {shareModalPost && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white dark:bg-zinc-900 rounded-2xl shadow-xl w-full max-w-sm overflow-hidden"
              >
                <div className="p-4 border-b border-zinc-100 dark:border-zinc-800 flex justify-between items-center bg-zinc-50/50 dark:bg-zinc-800/50">
                  <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">Compartilhar</h2>
                  <button onClick={() => setShareModalPost(null)} className="text-zinc-400 dark:text-zinc-500 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors">
                    <X size={24} />
                  </button>
                </div>
                <div className="p-6 grid grid-cols-2 gap-4">
                  <a 
                    href={`https://wa.me/?text=${encodeURIComponent(`Confira este post de ${shareModalPost.user?.name}: ${shareModalPost.content} ${window.location.href}`)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => {
                      registerShareIntent(shareModalPost.id);
                      setShareModalPost(null);
                    }}
                    className="flex flex-col items-center justify-center gap-2 p-4 rounded-xl bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors"
                  >
                    <Share2 size={24} />
                    <span className="text-sm font-medium">WhatsApp</span>
                  </a>
                  <button 
                    onClick={() => copyToClipboard(window.location.href, shareModalPost.id)}
                    className="flex flex-col items-center justify-center gap-2 p-4 rounded-xl bg-zinc-50 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors"
                  >
                    <Share2 size={24} />
                    <span className="text-sm font-medium">Copiar Link</span>
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Quiz Answers Modal */}
        <AnimatePresence>
          {quizAnswersModal && (
            <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
              <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[70vh]"
              >
                <div className="p-4 border-b border-zinc-100 dark:border-zinc-800 flex justify-between items-center bg-zinc-50/50 dark:bg-zinc-800/50">
                  <div className="min-w-0 pr-4">
                    <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">Respostas</h2>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate">Opção: <span className="font-bold text-primary-600">"{quizAnswersModal.alternative.text}"</span></p>
                  </div>
                  <button 
                    onClick={() => {
                      setQuizAnswersModal(null);
                      setQuizAnswersSearch('');
                    }} 
                    className="text-zinc-400 dark:text-zinc-500 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors flex-shrink-0"
                  >
                    <X size={24} />
                  </button>
                </div>

                <div className="p-4 bg-white dark:bg-zinc-900 border-b border-zinc-100 dark:border-zinc-800">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-zinc-400" size={16} />
                    <input 
                      type="text" 
                      placeholder="Filtrar por nome..." 
                      className="w-full pl-10 pr-4 py-2 bg-zinc-100 dark:bg-zinc-800 border-none rounded-xl focus:ring-2 focus:ring-primary-500 text-zinc-900 dark:text-zinc-100 text-sm"
                      value={quizAnswersSearch}
                      onChange={(e) => setQuizAnswersSearch(e.target.value)}
                    />
                  </div>
                </div>

                <div className="p-4 overflow-y-auto flex-1 custom-scrollbar">
                  {(() => {
                    const filteredAnswers = quizAnswersModal.answers.filter(a => 
                      a.user.name.toLowerCase().includes(quizAnswersSearch.toLowerCase())
                    );

                    if (filteredAnswers.length > 0) {
                      return (
                        <div className="space-y-2">
                          {filteredAnswers.map((answer) => (
                            <div key={answer.id} className="flex items-center gap-3 p-2 hover:bg-zinc-50 dark:hover:bg-zinc-800 rounded-xl transition-colors">
                              <div className="w-10 h-10 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden flex-shrink-0">
                                {answer.user.profile_image_url ? (
                                  <img src={getFullImageUrl(answer.user.profile_image_url) || ''} alt={answer.user.name} className="w-full h-full object-cover" />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center text-zinc-400">
                                    <User size={20} />
                                  </div>
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-bold text-zinc-900 dark:text-zinc-100 truncate">{answer.user.name}</p>
                                <p className="text-[10px] text-zinc-500 dark:text-zinc-400">{formatDateTime(answer.created_at)}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      );
                    }

                    return (
                      <div className="text-center py-12 text-zinc-500 dark:text-zinc-400">
                        {quizAnswersSearch ? 'Nenhum usuário encontrado com este nome.' : 'Ninguém escolheu esta opção ainda.'}
                      </div>
                    );
                  })()}
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
        {/* Content Modal */}
        <AnimatePresence>
          {contentModalPost && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
              <motion.div 
                key="content-modal"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white dark:bg-zinc-900 rounded-2xl shadow-xl w-full max-w-2xl flex flex-col max-h-[90vh] relative"
              >
                <div className="p-4 border-b border-zinc-100 dark:border-zinc-800 flex justify-between items-center bg-zinc-50/50 dark:bg-zinc-800/50 rounded-t-2xl">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-zinc-100 dark:bg-zinc-800 rounded-full flex items-center justify-center text-zinc-500 dark:text-zinc-400 overflow-hidden">
                       {contentModalPost.user?.profile_image_url ? (
                        <img src={getFullImageUrl(contentModalPost.user.profile_image_url) || ''} alt={contentModalPost.user.name} className="w-full h-full object-cover" />
                      ) : (
                        <User size={16} />
                      )}
                    </div>
                    <span className="font-semibold text-sm text-zinc-900 dark:text-zinc-100">{contentModalPost.user?.name}</span>
                  </div>
                  <button onClick={() => setContentModalPost(null)} className="text-zinc-400 dark:text-zinc-500 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors">
                    <X size={24} />
                  </button>
                </div>
                <div className="p-6 pt-16 overflow-y-auto custom-scrollbar">
                  {/* Quiz Content in Modal */}
                  {contentModalPost.post_type === 'quiz' && (
                    <div className="mb-8 p-6 bg-primary-50/30 dark:bg-primary-900/10 rounded-2xl border border-primary-100/50 dark:border-primary-900/20">
                      <div className="flex items-center gap-3 mb-6">
                        <div className="w-12 h-12 rounded-2xl bg-primary-600 flex items-center justify-center text-white shadow-lg shadow-primary-600/20">
                          <AlertCircle size={28} />
                        </div>
                        <div>
                          <h4 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">Questão do Quiz</h4>
                          <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">Responda corretamente para ganhar recompensas</p>
                        </div>
                      </div>
                      
                      <div className="text-xl font-bold text-zinc-900 dark:text-zinc-100 mb-8 leading-relaxed">
                        {contentModalPost.quiz_question}
                      </div>

                      <div className="space-y-4">
                        {contentModalPost.quiz_alternatives?.map((alt, idx) => {
                          const answers = contentModalPost.quiz_answers?.filter(a => a.alternative_id === alt.id) || [];
                          return (
                            <button 
                              key={alt.id || idx}
                              onClick={() => setQuizAnswersModal({ alternative: alt, answers })}
                              className={`w-full p-4 rounded-xl border flex items-center gap-4 transition-all group/alt cursor-pointer ${
                                alt.is_correct 
                                  ? 'border-emerald-200 dark:border-emerald-900/30 bg-emerald-50/50 dark:bg-emerald-900/10 text-emerald-900 dark:text-emerald-100 hover:bg-emerald-100/30 dark:hover:bg-emerald-900/20'
                                  : 'border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100/50 dark:hover:bg-zinc-700/40'                              } text-sm font-semibold relative overflow-hidden`}
                            >
                              <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                                alt.is_correct 
                                  ? 'border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400 bg-emerald-100/50 dark:bg-emerald-900/20' 
                                  : 'border-zinc-100 dark:border-zinc-700 text-zinc-400 bg-zinc-50 dark:bg-zinc-900/50'
                              }`}>
                                {String.fromCharCode(65 + idx)}
                              </div>
                              
                              <span className="flex-1 text-left">{alt.text}</span>

                              <div className="flex items-center gap-3">
                                {answers.length > 0 && (
                                  <div className="flex -space-x-2 overflow-hidden group-hover/alt:mr-2 transition-all">
                                    {answers.slice(0, 4).map((ans, i) => (
                                      <div key={ans.id} className="w-7 h-7 rounded-full border-2 border-white dark:border-zinc-900 bg-zinc-100 dark:bg-zinc-700 overflow-hidden shadow-sm">
                                        {ans.user.profile_image_url ? (
                                          <img src={getFullImageUrl(ans.user.profile_image_url) || ''} alt="" className="w-full h-full object-cover" />
                                        ) : (
                                          <User size={12} className="w-full h-full p-1.5" />
                                        )}
                                      </div>
                                    ))}
                                    {answers.length > 4 && (
                                      <div className="w-7 h-7 rounded-full border-2 border-white dark:border-zinc-900 bg-primary-600 flex items-center justify-center text-[10px] text-white font-bold shadow-sm">
                                        +{answers.length - 4}
                                      </div>
                                    )}
                                  </div>
                                )}

                                <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg ${
                                  alt.is_correct ? 'bg-emerald-200 dark:bg-emerald-800 text-emerald-700 dark:text-emerald-300' : 'bg-zinc-100 dark:bg-zinc-700 text-zinc-500 dark:text-zinc-400'
                                }`}>
                                  <span className="text-xs font-bold">{answers.length}</span>
                                  <span className="text-[10px] uppercase tracking-wider font-black opacity-60">votos</span>
                                </div>

                                {alt.is_correct && (
                                  <CheckCircle size={20} className="text-emerald-500" />
                                )}
                              </div>
                            </button>
                          );
                        })}
                      </div>

                      {(Number(contentModalPost.quiz_coins_participation) > 0 || Number(contentModalPost.quiz_coins_correct) > 0) && (
                        <div className="mt-8 flex flex-wrap gap-4 pt-6 border-t border-primary-100/50 dark:border-primary-900/20">
                          {Number(contentModalPost.quiz_coins_participation) > 0 && (
                            <div className="flex items-center gap-2 bg-white dark:bg-zinc-800 px-4 py-2 rounded-xl border border-zinc-100 dark:border-zinc-700 shadow-sm">
                              <Coins size={18} className="text-amber-500" />
                              <div className="flex flex-col">
                                <span className="text-[10px] text-zinc-500 dark:text-zinc-400 font-bold uppercase tracking-wider">Participação</span>
                                <span className="text-sm font-bold text-zinc-900 dark:text-zinc-100">+{contentModalPost.quiz_coins_participation} coins</span>
                              </div>
                            </div>
                          )}
                          {Number(contentModalPost.quiz_coins_correct) > 0 && (
                            <div className="flex items-center gap-2 bg-primary-600 px-4 py-2 rounded-xl shadow-lg shadow-primary-600/20">
                              <Coins size={18} className="text-white" />
                              <div className="flex flex-col">
                                <span className="text-[10px] text-primary-200 font-bold uppercase tracking-wider">Acerto Correto</span>
                                <span className="text-sm font-bold text-white">+{contentModalPost.quiz_coins_correct} coins</span>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Carrossel de Imagens */}
                  {((contentModalPost.images && contentModalPost.images.length > 0) || contentModalPost.image_full_url) && (
                    <div className="mb-6 relative group bg-zinc-100 dark:bg-zinc-800 rounded-xl overflow-hidden w-full aspect-[16/9] flex items-center justify-center">
                      {contentModalPost.images && contentModalPost.images.length > 0 ? (
                        <>
                          <img
                            src={contentModalPost.images[carouselIndex]?.url || ''}
                            alt={`Post image ${carouselIndex + 1}`}
                            className="w-full h-full object-contain"
                          />
                          
                          {contentModalPost.images.length > 1 && (
                            <>
                              <button
                                onClick={() => setCarouselIndex(prev => (prev === 0 ? contentModalPost.images!.length - 1 : prev - 1))}
                                className="absolute left-2 top-1/2 -translate-y-1/2 p-2 bg-black/50 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <ChevronLeft size={24} />
                              </button>
                              <button
                                onClick={() => setCarouselIndex(prev => (prev === contentModalPost.images!.length - 1 ? 0 : prev + 1))}
                                className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-black/50 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <ChevronRight size={24} />
                              </button>
                              
                              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5">
                                {contentModalPost.images.map((_, idx) => (
                                  <div
                                    key={idx}
                                    className={`w-2 h-2 rounded-full transition-all ${idx === carouselIndex ? 'bg-white w-4' : 'bg-white/50'}`}
                                  />
                                ))}
                              </div>
                            </>
                          )}
                        </>
                      ) : (
                        <img
                          src={contentModalPost.image_full_url!}
                          alt="Post content"
                          className="w-full h-full object-contain"
                        />
                      )}
                    </div>
                  )}

                  {contentModalPost.title && (
                    <h3 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 mb-4 break-words">
                      {contentModalPost.title}
                    </h3>
                  )}
                  <div className="text-zinc-900 dark:text-zinc-300 whitespace-pre-wrap leading-relaxed text-sm md:text-base break-words">
                    {renderPostContent(contentModalPost.content)}
                  </div>
                  <div className="mt-6 pt-4 border-t border-zinc-100 dark:border-zinc-800 flex flex-wrap gap-4 items-center text-xs text-zinc-400 dark:text-zinc-500">
                    <span>Postado em {new Date(contentModalPost.created_at).toLocaleDateString()} às {new Date(contentModalPost.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    <div className="flex gap-3 ml-auto">
                      {contentModalPost.is_sponsored && (
                        <span className="text-primary-600 font-medium flex items-center gap-1">
                          <Shield size={14} /> Patrocinado
                        </span>
                      )}
                      {contentModalPost.is_boosted && (
                        <span className="text-primary-600 font-medium flex items-center gap-1">
                          <Rocket size={14} /> Turbinado
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
        {/* Video Modal */}
        <AnimatePresence>
          {videoModalPost && (
            <div 
              className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm"
              onClick={() => setVideoModalPost(null)}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="relative w-full max-w-4xl aspect-video"
                onClick={(e) => e.stopPropagation()}
              >
                <button 
                  onClick={() => setVideoModalPost(null)}
                  className="absolute -top-10 right-0 text-white hover:text-zinc-300 transition-colors z-10"
                >
                  <X size={32} />
                </button>
                <div className="w-full h-full bg-black rounded-lg overflow-hidden">
                  <iframe
                    src={`https://www.youtube.com/embed/${extractYouTubeVideoId(videoModalPost.video_url || '')}?autoplay=1&rel=0`}
                    title="YouTube video player"
                    className="w-full h-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                </div>
                <div className="mt-4 text-white">
                  <h3 className="text-lg font-bold mb-1">{videoModalPost.title}</h3>
                  <p className="text-sm text-zinc-400">Por {videoModalPost.user?.name || 'Usuário'}</p>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
        {/* Edit Post Modal */}
        <AnimatePresence>
          {editPostModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm overflow-y-auto">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white dark:bg-zinc-900 rounded-2xl shadow-xl w-full max-w-lg overflow-hidden my-8 flex flex-col"
                style={{maxHeight: 'calc(100vh - 4rem)'}}
              >
                <div className="p-4 border-b border-zinc-100 dark:border-zinc-800 flex justify-between items-center bg-zinc-50/50 dark:bg-zinc-800/50 flex-shrink-0">
                  <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">Editar Postagem</h2>
                  <button onClick={resetEditPostState} className="text-zinc-400 dark:text-zinc-500 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors">
                    <X size={24} />
                  </button>
                </div>

                <form onSubmit={handleUpdatePost} className="flex flex-col flex-1 overflow-hidden">
                  <div className="overflow-y-auto flex-1 custom-scrollbar p-6 space-y-4">
                  {/* Post Type Toggle - Removido conforme solicitado para manter a interface limpa */}

                  <div>
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                      Título *
                    </label>
                    <input
                      type="text"
                      required
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      className="w-full p-3 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-500"
                      placeholder="Título do post"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                      Conteúdo
                    </label>
                    <div className="relative">
                      <div
                        contentEditable
                        data-field="edit"
                        onInput={(e) => handleMentionChange(e.currentTarget.innerText, e.currentTarget, 'edit')}
                        onKeyDown={(e) => handleKeyDown(e, 'edit')}
                        className="w-full p-3 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent min-h-[150px] text-zinc-900 dark:text-zinc-100"
                      >                    </div>

                      {/* Floating Mentions Dropdown */}
                      {showMentionDropdown && mentionTargetField === 'edit' && (
                        <div
                          className="absolute z-[100] bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl shadow-lg max-h-48 overflow-y-auto w-64"
                          style={{
                            top: dropdownPos.top + 5,
                            left: Math.min(dropdownPos.left, 240) // Constrain left a bit more safely
                          }}
                        >
                        {mentionLoading ? (
                          <div className="p-3 flex items-center justify-center">
                            <Loader2 className="animate-spin text-primary-500" size={18} />
                          </div>
                        ) : mentionUsers.filter(u => u.username).length > 0 ? (
                          mentionUsers
                            .filter(u => u.username)
                            .map((u, index, array) => (
                              <button
                                key={u.id}
                                type="button"
                                onClick={() => handleSelectMention(u)}
                                className={`w-full flex items-center gap-2 p-2 transition-colors text-left ${
                                  array.length === 1
                                    ? 'bg-zinc-100 dark:bg-zinc-700'
                                    : 'hover:bg-zinc-50 dark:hover:bg-zinc-700'
                                }`}
                              >
                                <div className="w-6 h-6 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden flex-shrink-0">
                                  {u.profile_image_url ? (
                                    <img src={getFullImageUrl(u.profile_image_url) || ''} alt={u.name} className="w-full h-full object-cover" />
                                  ) : (
                                    <User size={12} className="text-zinc-400 m-auto" />
                                  )}
                                </div>
                                <div>
                                  <p className="text-xs font-bold text-primary-600 dark:text-primary-400 leading-tight">@{u.username}</p>
                                  <p className="text-[10px] text-zinc-500 dark:text-zinc-400 leading-tight">{u.name}</p>
                                </div>
                              </button>
                            ))
                        ) : (
                          <div className="p-3 text-xs text-zinc-500 dark:text-zinc-400 text-center flex flex-col items-center gap-2">
                            <User size={16} className="opacity-50" />
                            <span>Nenhum usuário localizado</span>
                          </div>
                        )}
                      </div>
                      )}
                      </div>
                      </div>

                      {editPostType === 'quiz' ? (
                        <div className="space-y-4 p-4 bg-primary-50/30 dark:bg-primary-900/10 rounded-xl border border-primary-100 dark:border-primary-900/30">
                          <div>
                            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                              Pergunta do Quiz *
                            </label>
                            <input
                              type="text"
                              required
                              value={editQuizQuestion}
                              onChange={(e) => setEditQuizQuestion(e.target.value)}
                              className="w-full p-3 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-500"
                              placeholder="Qual a pergunta?"
                            />
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="block text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1">
                                Coins Participação
                              </label>
                              <input
                                type="number"
                                min="0"
                                value={editQuizCoinsParticipation}
                                onKeyDown={(e) => {
                                  if (e.key === "-" || e.key === "+" || e.key === "e" || e.key === "E") {
                                    e.preventDefault();
                                  }
                                }}
                                onChange={(e) => setEditQuizCoinsParticipation(sanitizeCoinValue(e.target.value))}
                                className="w-full p-3 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 text-zinc-900 dark:text-zinc-100"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1">
                                Coins Acerto
                              </label>
                              <input
                                type="number"
                                min="0"
                                value={editQuizCoinsCorrect}
                                onKeyDown={(e) => {
                                  if (e.key === "-" || e.key === "+" || e.key === "e" || e.key === "E") {
                                    e.preventDefault();
                                  }
                                }}
                                onChange={(e) => setEditQuizCoinsCorrect(sanitizeCoinValue(e.target.value))}
                                className="w-full p-3 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 text-zinc-900 dark:text-zinc-100"
                              />
                            </div>
                          </div>

                          <div className="space-y-3">
                            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                              Alternativas (Selecione a correta)
                            </label>
                            {editQuizAlternatives.map((alt, idx) => (
                              <div key={idx} className="flex items-center gap-3">
                                <input
                                  type="radio"
                                  name="editQuizCorrect"
                                  checked={alt.is_correct}
                                  onChange={() => {
                                    const newAlts = editQuizAlternatives.map((a, i) => ({ ...a, is_correct: i === idx }));
                                    setEditQuizAlternatives(newAlts);
                                  }}
                                  className="w-4 h-4 text-primary-600 border-zinc-300 focus:ring-primary-500 bg-white dark:bg-zinc-900"
                                />
                                <input
                                  type="text"
                                  value={alt.text}
                                  onChange={(e) => {
                                    const newAlts = [...editQuizAlternatives];
                                    newAlts[idx].text = e.target.value;
                                    setEditQuizAlternatives(newAlts);
                                  }}
                                  className="flex-1 p-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm text-zinc-900 dark:text-zinc-100"
                                  placeholder={`Alternativa ${idx + 1}`}
                                />
                                {editQuizAlternatives.length > 2 && (
                                  <button
                                    type="button"
                                    onClick={() => setEditQuizAlternatives(editQuizAlternatives.filter((_, i) => i !== idx))}
                                    className="text-red-500 hover:text-red-600 p-1 transition-colors"
                                  >
                                    <Trash2 size={18} />
                                  </button>
                                )}
                              </div>
                            ))}
                            {editQuizAlternatives.length < 5 && (
                              <button
                                type="button"
                                onClick={() => setEditQuizAlternatives([...editQuizAlternatives, { text: '', is_correct: false }])}
                                className="text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 text-sm font-bold flex items-center gap-1 mt-2 transition-colors"
                              >
                                <Plus size={16} /> Adicionar Alternativa
                              </button>
                            )}
                          </div>
                        </div>
                      ) : (
                        <>
                          {currentUser?.user_type_id === 1 && (                    <div className="space-y-4 p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl border border-zinc-100 dark:border-zinc-800">

                      <div className="flex items-center justify-between">
                        <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                          Post Patrocinado
                        </label>
                        <button
                          type="button"
                          onClick={() => setEditIsSponsored(!editIsSponsored)}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                            editIsSponsored ? "bg-primary-600" : "bg-zinc-300 dark:bg-zinc-600"
                          }`}
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                              editIsSponsored ? "translate-x-6" : "translate-x-1"
                            }`}
                          />
                        </button>
                      </div>

                      <div className="flex items-center justify-between">
                        <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                          Post Turbinado
                        </label>
                        <button
                          type="button"
                          onClick={() => {
                            const nextValue = !editEarnsCoins;
                            setEditEarnsCoins(nextValue);
                            if (nextValue) {
                              setEditBoostLikeCoins('0');
                              setEditBoostCommentCoins('0');
                              setEditBoostShareCoins('0');
                            }
                          }}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                            editEarnsCoins ? "bg-primary-600" : "bg-zinc-300 dark:bg-zinc-600"
                          }`}
                        >                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                              editEarnsCoins ? "translate-x-6" : "translate-x-1"
                            }`}
                          />
                        </button>
                      </div>

                      {editEarnsCoins && (
                        <div className="grid grid-cols-3 gap-3 pt-2 border-t border-zinc-200 dark:border-zinc-700">
                          <div>
                            <label className="block text-[10px] uppercase font-bold text-zinc-500 dark:text-zinc-400 mb-1">
                              Curtir
                            </label>
                            <input
                              type="number"
                              min="0"
                              value={editBoostLikeCoins}
                              onKeyDown={(e) => {
                                if (e.key === "-" || e.key === "+" || e.key === "e" || e.key === "E") {
                                  e.preventDefault();
                                }
                              }}
                              onChange={(e) => setEditBoostLikeCoins(sanitizeCoinValue(e.target.value))}
                              className="w-full p-2 text-sm bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-zinc-900 dark:text-zinc-100"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] uppercase font-bold text-zinc-500 dark:text-zinc-400 mb-1">
                              Comentar
                            </label>
                            <input
                              type="number"
                              min="0"
                              value={editBoostCommentCoins}
                              onKeyDown={(e) => {
                                if (e.key === "-" || e.key === "+" || e.key === "e" || e.key === "E") {
                                  e.preventDefault();
                                }
                              }}
                              onChange={(e) => setEditBoostCommentCoins(sanitizeCoinValue(e.target.value))}
                              className="w-full p-2 text-sm bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-zinc-900 dark:text-zinc-100"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] uppercase font-bold text-zinc-500 dark:text-zinc-400 mb-1">
                              Compartilhar
                            </label>
                            <input
                              type="number"
                              min="0"
                              value={editBoostShareCoins}
                              onKeyDown={(e) => {
                                if (e.key === "-" || e.key === "+" || e.key === "e" || e.key === "E") {
                                  e.preventDefault();
                                }
                              }}
                              onChange={(e) => setEditBoostShareCoins(sanitizeCoinValue(e.target.value))}
                              className="w-full p-2 text-sm bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-zinc-900 dark:text-zinc-100"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                      Mídia (Opcional)
                    </label>
                    
                    {/* Mostrar mídia atual se existir */}
                    {((editPostModal.images && editPostModal.images.length > 0) || editPostModal.image_url || editPostModal.video_url) && (
                      <div className="mb-3 p-3 bg-zinc-50 dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700">
                        <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-2">Mídia atual:</p>
                        {editPostModal.video_url ? (
                          <div className="relative rounded-lg overflow-hidden bg-zinc-100 dark:bg-zinc-900">
                            <img
                              src={editPostModal.video_thumbnail_url || getYouTubeThumbnailUrl(editPostModal.video_url) || ''}
                              alt="Current video"
                              className="w-full h-40 object-contain bg-black"
                            />
                            <div className="absolute top-2 right-2 bg-red-600 text-white text-[10px] font-bold px-2 py-1 rounded-md shadow-sm">
                              YOUTUBE
                            </div>
                          </div>
                        ) : (
                          <div className="grid grid-cols-4 gap-2">
                            {editPostModal.images && editPostModal.images.length > 0 ? (
                              editPostModal.images.map((img, idx) => (
                                <div key={img.id || idx} className="relative aspect-square rounded-lg overflow-hidden bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700">
                                  <img
                                    src={img.url}
                                    alt={`Current ${idx}`}
                                    className="w-full h-full object-cover"
                                  />
                                  {idx === 0 && (
                                    <div className="absolute bottom-0 left-0 right-0 bg-primary-600 text-white text-[8px] py-0.5 text-center font-bold">
                                      Principal
                                    </div>
                                  )}
                                </div>
                              ))
                            ) : (
                              <div className="relative aspect-square rounded-lg overflow-hidden bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700">
                                <img
                                  src={editPostModal.image_full_url || ''}
                                  alt="Current"
                                  className="w-full h-full object-cover"
                                />
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Campo de Imagem */}
                    {editMediaType === 'image' && (
                      <div className="space-y-4">
                        <label
                          htmlFor="edit-file-upload"
                          className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-zinc-300 dark:border-zinc-700 border-dashed rounded-xl hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors cursor-pointer relative"
                        >
                          <div className="space-y-1 text-center">
                            <ImageIcon className="mx-auto h-12 w-12 text-zinc-400 dark:text-zinc-500" />
                            <div className="flex text-sm text-zinc-600 dark:text-zinc-400 justify-center">
                              <span className="relative font-medium text-primary-600 hover:text-primary-500">
                                Substituir por novas imagens (máx. 10)
                              </span>
                              <input
                                id="edit-file-upload"
                                name="edit-file-upload"
                                type="file"
                                multiple
                                className="sr-only"
                                accept="image/*"
                                onChange={(e) => {
                                  if (e.target.files) {
                                    const filesArray = Array.from(e.target.files);
                                    setEditImages(prev => {
                                      const combined = [...prev, ...filesArray].slice(0, 10);
                                      return combined;
                                    });
                                  }
                                }}
                              />
                            </div>
                            <p className="text-xs text-zinc-500 dark:text-zinc-400">
                              PNG, JPG, GIF até 5MB cada
                            </p>
                          </div>
                        </label>
                        {editImages.length > 0 && (
                          <div className="grid grid-cols-3 gap-2">
                            {editImages.map((file, idx) => (
                              <div key={idx} className="relative aspect-square bg-zinc-100 dark:bg-zinc-800 rounded-lg overflow-hidden border border-zinc-200 dark:border-zinc-700">
                                <img
                                  src={URL.createObjectURL(file)}
                                  alt={`Preview ${idx}`}
                                  className="w-full h-full object-cover"
                                />
                                <button
                                  type="button"
                                  onClick={() => setEditImages(prev => prev.filter((_, i) => i !== idx))}
                                  className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 shadow-sm hover:bg-red-600 transition-colors z-10"
                                >
                                  <X size={12} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const reader = new FileReader();
                                    reader.onload = () => {
                                      setCropperModal({
                                        isOpen: true,
                                        image: reader.result as string,
                                        index: idx,
                                        type: 'edit'
                                      });
                                    };
                                    reader.readAsDataURL(file);
                                  }}
                                  className="absolute top-1 right-8 bg-zinc-800/80 text-white rounded-full p-1 shadow-sm hover:bg-zinc-700 transition-colors z-10"
                                  title="Recortar imagem"
                                >
                                  <Edit size={12} />
                                </button>
                                {idx === 0 && (
                                  <div className="absolute bottom-0 left-0 right-0 bg-primary-600 text-white text-[10px] py-0.5 text-center font-bold">
                                    Principal
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Campo de Vídeo */}
                    {editMediaType === 'video' && (
                      <div>
                        <input
                          type="text"
                          value={editVideoUrl}
                          onChange={(e) => setEditVideoUrl(e.target.value)}
                          className="w-full p-3 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-500"
                          placeholder="https://www.youtube.com/watch?v=..."
                        />
                        {editVideoUrl && (
                          <div className="mt-2">
                            {(() => {
                              const videoId = extractYouTubeVideoId(editVideoUrl);
                              if (videoId) {
                                return (
                                  <div className="relative rounded-lg overflow-hidden bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700">
                                    <img
                                      src={`https://img.youtube.com/vi/${videoId}/hqdefault.jpg`}
                                      alt="YouTube thumbnail"
                                      className="w-full h-48 object-contain opacity-90"
                                    />
                                    <div className="absolute top-2 right-2 bg-red-600 text-white text-[10px] font-bold px-2 py-1 rounded-md shadow-sm">
                                      YOUTUBE
                                    </div>
                                  </div>
                                );
                              }
                              return (
                                <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-center gap-2 text-red-600 dark:text-red-400 text-xs">
                                  <AlertCircle size={14} />
                                  <span>URL inválida</span>
                                </div>
                              );
                            })()}
                          </div>
                        )}
                      </div>
                    )}
                    </div>
                  </>
                )}
              </div>

                  <div className="p-4 border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/50 flex-shrink-0">
                    <div className="flex gap-3">
                      <button
                        type="button"
                        onClick={resetEditPostState}
                        className="flex-1 px-4 py-2 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-xl hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors font-medium"
                      >
                        Cancelar
                      </button>
                      <button
                        type="submit"
                        disabled={
                          isUpdating || 
                          !editTitle.trim() || 
                          (editPostType === 'standard' && editMediaType === 'none') ||
                          (editPostType === 'quiz' && (!editQuizQuestion.trim() || editQuizAlternatives.some(alt => !alt.text.trim())))
                        }
                        className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-xl hover:bg-primary-700 transition-colors font-medium flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        title={
                          editPostType === 'standard' && editMediaType === 'none' 
                            ? 'Selecione uma imagem ou vídeo do YouTube' 
                            : editPostType === 'quiz' && editQuizAlternatives.some(alt => !alt.text.trim())
                            ? 'Preencha todas as alternativas do quiz'
                            : ''
                        }
                      >
                        {isUpdating ? <Loader2 size={18} className="animate-spin" /> : <Edit size={18} />}
                        Salvar Alterações
                      </button>
                    </div>
                  </div>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
        {/* Create Post Modal */}
        <AnimatePresence>
          {createPostModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white dark:bg-zinc-900 rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col"
                style={{ maxHeight: 'calc(100vh - 4rem)' }}
              >
                <div className="p-4 border-b border-zinc-100 dark:border-zinc-800 flex justify-between items-center bg-zinc-50/50 dark:bg-zinc-800/50 flex-shrink-0">
                  <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">Criar Novo Post</h2>
                  <button onClick={resetCreatePostState} className="text-zinc-400 dark:text-zinc-500 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors">
                    <X size={24} />
                  </button>
                </div>
                
                <div className="overflow-y-auto flex-1 custom-scrollbar">
                  <form onSubmit={handleCreatePost} className="p-6 space-y-4">
                    {/* Post Type Toggle */}
                    <div className="flex bg-zinc-100 dark:bg-zinc-800 p-1 rounded-xl mb-6">
                      <button
                        type="button"
                        onClick={() => setNewPostType('standard')}
                        className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${
                          newPostType === 'standard'
                            ? 'bg-white dark:bg-zinc-700 text-primary-600 dark:text-primary-400 shadow-sm'
                            : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'
                        }`}
                      >
                        Post Padrão
                      </button>
                      <button
                        type="button"
                        onClick={() => setNewPostType('quiz')}
                        className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${
                          newPostType === 'quiz'
                            ? 'bg-white dark:bg-zinc-700 text-primary-600 dark:text-primary-400 shadow-sm'
                            : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'
                        }`}
                      >
                        Quiz
                      </button>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                        Título *
                      </label>
                      <input
                        type="text"
                        required
                        value={newPostTitle}
                        onChange={(e) => setNewPostTitle(e.target.value)}
                        className="w-full p-3 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-500"
                        placeholder="Título do post"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                        Conteúdo
                      </label>
                      <div className="relative">
                        <div
                          contentEditable
                          data-field="create"
                          onInput={(e) => handleMentionChange(e.currentTarget.innerText, e.currentTarget, 'create')}
                          onKeyDown={(e) => handleKeyDown(e, 'create')}
                          className="w-full p-3 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent min-h-[150px] text-zinc-900 dark:text-zinc-100"
                        >                      </div>

                        {/* Floating Mentions Dropdown */}
                        {showMentionDropdown && mentionTargetField === 'create' && (
                          <div
                            className="absolute z-[100] bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl shadow-lg max-h-48 overflow-y-auto w-64"
                            style={{
                              top: dropdownPos.top + 5,
                              left: Math.min(dropdownPos.left, 240)
                            }}
                          >
                          {mentionLoading ? (
                            <div className="p-3 flex items-center justify-center">
                              <Loader2 className="animate-spin text-primary-500" size={18} />
                            </div>
                          ) : mentionUsers.filter(u => u.username).length > 0 ? (
                            mentionUsers
                              .filter(u => u.username)
                              .map((u, index, array) => (
                                <button
                                  key={u.id}
                                  type="button"
                                  onClick={() => handleSelectMention(u)}
                                  className={`w-full flex items-center gap-2 p-2 transition-colors text-left ${
                                    array.length === 1
                                      ? 'bg-zinc-100 dark:bg-zinc-700'
                                      : 'hover:bg-zinc-50 dark:hover:bg-zinc-700'
                                  }`}
                                >
                                  <div className="w-6 h-6 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden flex-shrink-0">
                                    {u.profile_image_url ? (
                                      <img src={getFullImageUrl(u.profile_image_url) || ''} alt={u.name} className="w-full h-full object-cover" />
                                    ) : (
                                      <User size={12} className="text-zinc-400 m-auto" />
                                    )}
                                  </div>
                                  <div>
                                    <p className="text-xs font-bold text-primary-600 dark:text-primary-400 leading-tight">@{u.username}</p>
                                    <p className="text-[10px] text-zinc-500 dark:text-zinc-400 leading-tight">{u.name}</p>
                                  </div>
                                </button>
                              ))
                          ) : (
                            <div className="p-3 text-xs text-zinc-500 dark:text-zinc-400 text-center flex flex-col items-center gap-2">
                              <User size={16} className="opacity-50" />
                              <span>Nenhum usuário localizado</span>
                            </div>
                          )}                        </div>
                        )}
                      </div>
                    </div>

                    {newPostType === 'quiz' ? (
                      <div className="space-y-4 p-4 bg-primary-50/30 dark:bg-primary-900/10 rounded-xl border border-primary-100 dark:border-primary-900/30">
                        <div>
                          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                            Pergunta do Quiz *
                          </label>
                          <input
                            type="text"
                            required
                            value={newQuizQuestion}
                            onChange={(e) => setNewQuizQuestion(e.target.value)}
                            className="w-full p-3 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-500"
                            placeholder="Qual a pergunta?"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1">
                              Coins Participação
                            </label>
                            <input
                              type="number"
                              min="0"
                              value={newQuizCoinsParticipation}
                              onKeyDown={(e) => {
                                if (e.key === "-" || e.key === "+" || e.key === "e" || e.key === "E") {
                                  e.preventDefault();
                                }
                              }}
                              onChange={(e) => setNewQuizCoinsParticipation(sanitizeCoinValue(e.target.value))}
                              className="w-full p-3 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 text-zinc-900 dark:text-zinc-100"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1">
                              Coins Acerto
                            </label>
                            <input
                              type="number"
                              min="0"
                              value={newQuizCoinsCorrect}
                              onKeyDown={(e) => {
                                if (e.key === "-" || e.key === "+" || e.key === "e" || e.key === "E") {
                                  e.preventDefault();
                                }
                              }}
                              onChange={(e) => setNewQuizCoinsCorrect(sanitizeCoinValue(e.target.value))}
                              className="w-full p-3 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 text-zinc-900 dark:text-zinc-100"
                            />
                          </div>
                        </div>

                        <div className="space-y-3">
                          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                            Alternativas (Selecione a correta)
                          </label>
                          {newQuizAlternatives.map((alt, idx) => (
                            <div key={idx} className="flex items-center gap-3">
                              <input
                                type="radio"
                                name="newQuizCorrect"
                                checked={alt.is_correct}
                                onChange={() => {
                                  const newAlts = newQuizAlternatives.map((a, i) => ({ ...a, is_correct: i === idx }));
                                  setNewQuizAlternatives(newAlts);
                                }}
                                className="w-4 h-4 text-primary-600 border-zinc-300 focus:ring-primary-500 bg-white dark:bg-zinc-900"
                              />
                              <input
                                type="text"
                                value={alt.text}
                                onChange={(e) => {
                                  const newAlts = [...newQuizAlternatives];
                                  newAlts[idx].text = e.target.value;
                                  setNewQuizAlternatives(newAlts);
                                }}
                                className="flex-1 p-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm text-zinc-900 dark:text-zinc-100"
                                placeholder={`Alternativa ${idx + 1}`}
                              />
                              {newQuizAlternatives.length > 2 && (
                                <button
                                  type="button"
                                  onClick={() => setNewQuizAlternatives(newQuizAlternatives.filter((_, i) => i !== idx))}
                                  className="text-red-500 hover:text-red-600 p-1 transition-colors"
                                >
                                  <Trash2 size={18} />
                                </button>
                              )}
                            </div>
                          ))}
                          {newQuizAlternatives.length < 5 && (
                            <button
                              type="button"
                              onClick={() => setNewQuizAlternatives([...newQuizAlternatives, { text: '', is_correct: false }])}
                              className="text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 text-sm font-bold flex items-center gap-1 mt-2 transition-colors"
                            >
                              <Plus size={16} /> Adicionar Alternativa
                            </button>
                          )}
                        </div>
                      </div>
                    ) : (
                      <>
                        {currentUser?.user_type_id === 1 && (
                          <div className="space-y-4 p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl border border-zinc-100 dark:border-zinc-800">
                        <div className="flex items-center justify-between">
                          <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                            Post Patrocinado
                          </label>
                          <button
                            type="button"
                            onClick={() => setNewPostIsSponsored(!newPostIsSponsored)}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                              newPostIsSponsored ? "bg-primary-600" : "bg-zinc-300 dark:bg-zinc-600"
                            }`}
                          >
                            <span
                              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                newPostIsSponsored ? "translate-x-6" : "translate-x-1"
                              }`}
                            />
                          </button>
                        </div>

                        <div className="flex items-center justify-between">
                          <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                            Post Turbinado
                          </label>
                          <button
                            type="button"
                            onClick={() => {
                              const nextValue = !newPostEarnsCoins;
                              setNewPostEarnsCoins(nextValue);
                              if (nextValue) {
                                setNewPostBoostLikeCoins('0');
                                setNewPostBoostCommentCoins('0');
                                setNewPostBoostShareCoins('0');
                              }
                            }}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                              newPostEarnsCoins ? "bg-primary-600" : "bg-zinc-300 dark:bg-zinc-600"
                            }`}
                          >
                            <span
                              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                newPostEarnsCoins ? "translate-x-6" : "translate-x-1"
                              }`}
                            />
                          </button>
                        </div>

                        {newPostEarnsCoins && (
                          <div className="grid grid-cols-3 gap-3 pt-2 border-t border-zinc-200 dark:border-zinc-700">
                            <div>
                              <label className="block text-[10px] uppercase font-bold text-zinc-500 dark:text-zinc-400 mb-1">
                                Curtir
                              </label>
                              <input
                                type="number"
                                min="0"
                                value={newPostBoostLikeCoins}
                                onKeyDown={(e) => {
                                  if (e.key === "-" || e.key === "+" || e.key === "e" || e.key === "E") {
                                    e.preventDefault();
                                  }
                                }}
                                onChange={(e) => setNewPostBoostLikeCoins(sanitizeCoinValue(e.target.value))}
                                className="w-full p-2 text-sm bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-zinc-900 dark:text-zinc-100"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] uppercase font-bold text-zinc-500 dark:text-zinc-400 mb-1">
                                Comentar
                              </label>
                              <input
                                type="number"
                                min="0"
                                value={newPostBoostCommentCoins}
                                onKeyDown={(e) => {
                                  if (e.key === "-" || e.key === "+" || e.key === "e" || e.key === "E") {
                                    e.preventDefault();
                                  }
                                }}
                                onChange={(e) => setNewPostBoostCommentCoins(sanitizeCoinValue(e.target.value))}
                                className="w-full p-2 text-sm bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-zinc-900 dark:text-zinc-100"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] uppercase font-bold text-zinc-500 dark:text-zinc-400 mb-1">
                                Compartilhar
                              </label>
                              <input
                                type="number"
                                min="0"
                                value={newPostBoostShareCoins}
                                onKeyDown={(e) => {
                                  if (e.key === "-" || e.key === "+" || e.key === "e" || e.key === "E") {
                                    e.preventDefault();
                                  }
                                }}
                                onChange={(e) => setNewPostBoostShareCoins(sanitizeCoinValue(e.target.value))}
                                className="w-full p-2 text-sm bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-zinc-900 dark:text-zinc-100"
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    <div>
                      <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                        Mídia (Opcional)
                      </label>
                      <div className="flex gap-3 mb-3">
                        <button
                          type="button"
                          onClick={() => {
                            if (mediaType === 'image') {
                              setMediaType('none');
                              setNewPostImages([]);
                            } else {
                              setMediaType('image');
                              setNewPostVideoUrl('');
                            }
                          }}
                          className={`flex-1 py-2.5 rounded-xl font-medium transition-all flex items-center justify-center gap-2 ${
                            mediaType === 'image'
                              ? 'bg-primary-600 text-white'
                              : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700'
                          }`}
                        >
                          <ImageIcon size={18} />
                          Imagem
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (mediaType === 'video') {
                              setMediaType('none');
                              setNewPostVideoUrl('');
                            } else {
                              setMediaType('video');
                              setNewPostImages([]);
                            }
                          }}
                          className={`flex-1 py-2.5 rounded-xl font-medium transition-all flex items-center justify-center gap-2 ${
                            mediaType === 'video'
                              ? 'bg-red-600 text-white'
                              : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700'
                          }`}
                        >
                          <svg className="w-4.5 h-4.5" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0-3.897.266-4.356 2.62-4.385 8.816.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0 3.897-.266 4.356-2.62 4.385-8.816-.029-6.185-.484-8.549-4.385-8.816zm-10.615 12.816v-8l8 3.993-8 4.007z"/>
                          </svg>
                          YouTube
                        </button>
                      </div>

                      {/* Campo de Imagem */}
                      {mediaType === 'image' && (
                        <div className="space-y-4">
                          <label
                            htmlFor="file-upload"
                            className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-zinc-300 dark:border-zinc-700 border-dashed rounded-xl hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors cursor-pointer relative"
                          >
                            <div className="space-y-1 text-center">
                              <ImageIcon className="mx-auto h-12 w-12 text-zinc-400 dark:text-zinc-500" />
                              <div className="flex text-sm text-zinc-600 dark:text-zinc-400 justify-center">
                                <span className="relative font-medium text-primary-600 hover:text-primary-500">
                                  Upload de imagens (máx. 10)
                                </span>
                                <input
                                  id="file-upload"
                                  name="file-upload"
                                  type="file"
                                  multiple
                                  className="sr-only"
                                  accept="image/*"
                                  onChange={(e) => {
                                    if (e.target.files) {
                                      const filesArray = Array.from(e.target.files);
                                      setNewPostImages(prev => {
                                        const combined = [...prev, ...filesArray].slice(0, 10);
                                        return combined;
                                      });
                                    }
                                  }}
                                />
                              </div>
                              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                                PNG, JPG, GIF até 5MB cada
                              </p>
                            </div>
                          </label>
                          {newPostImages.length > 0 && (
                            <div className="grid grid-cols-3 gap-2">
                              {newPostImages.map((file, idx) => (
                                <div key={idx} className="relative aspect-square bg-zinc-100 dark:bg-zinc-800 rounded-lg overflow-hidden border border-zinc-200 dark:border-zinc-700">
                                  <img
                                    src={URL.createObjectURL(file)}
                                    alt={`Preview ${idx}`}
                                    className="w-full h-full object-cover"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => setNewPostImages(prev => prev.filter((_, i) => i !== idx))}
                                    className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 shadow-sm hover:bg-red-600 transition-colors z-10"
                                  >
                                    <X size={12} />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const reader = new FileReader();
                                      reader.onload = () => {
                                        setCropperModal({
                                          isOpen: true,
                                          image: reader.result as string,
                                          index: idx,
                                          type: 'new'
                                        });
                                      };
                                      reader.readAsDataURL(file);
                                    }}
                                    className="absolute top-1 right-8 bg-zinc-800/80 text-white rounded-full p-1 shadow-sm hover:bg-zinc-700 transition-colors z-10"
                                    title="Recortar imagem"
                                  >
                                    <Edit size={12} />
                                  </button>
                                  {idx === 0 && (
                                    <div className="absolute bottom-0 left-0 right-0 bg-primary-600 text-white text-[10px] py-0.5 text-center font-bold">
                                      Principal
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Campo de Vídeo */}
                      {mediaType === 'video' && (
                        <div>
                          <input
                            type="text"
                            value={newPostVideoUrl}
                            onChange={(e) => setNewPostVideoUrl(e.target.value)}
                            className="w-full p-3 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-500"
                            placeholder="https://www.youtube.com/watch?v=..."
                          />
                          {newPostVideoUrl && (
                            <div className="mt-2">
                              {(() => {
                                const videoId = extractYouTubeVideoId(newPostVideoUrl);
                                if (videoId) {
                                  return (
                                    <div className="relative rounded-lg overflow-hidden bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700">
                                      <img
                                        src={`https://img.youtube.com/vi/${videoId}/hqdefault.jpg`}
                                        alt="YouTube thumbnail"
                                        className="w-full h-48 object-contain opacity-90"
                                      />
                                      <div className="absolute top-2 right-2 bg-red-600 text-white text-[10px] font-bold px-2 py-1 rounded-md shadow-sm">
                                        YOUTUBE
                                      </div>
                                    </div>
                                  );
                                }
                                return (
                                  <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-center gap-2 text-red-600 dark:text-red-400 text-xs">
                                    <AlertCircle size={14} />
                                    <span>URL inválida</span>
                                  </div>
                                );
                              })()}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    </>
                    )}
                  </form>
                </div>

                <div className="p-4 border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/50 flex-shrink-0">
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={resetCreatePostState}
                      className="flex-1 px-4 py-2 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-xl hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors font-medium"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={(e) => {
                        const form = document.querySelector('form');
                        if (form) form.requestSubmit();
                      }}
                      disabled={
                        isCreating || 
                        !newPostTitle.trim() || 
                        (newPostType === 'standard' && mediaType === 'none') ||
                        (newPostType === 'quiz' && (!newQuizQuestion.trim() || newQuizAlternatives.some(alt => !alt.text.trim())))
                      }
                      className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-xl hover:bg-primary-700 transition-colors font-medium flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                      title={
                        newPostType === 'standard' && mediaType === 'none' 
                          ? 'Selecione uma imagem ou vídeo do YouTube' 
                          : newPostType === 'quiz' && newQuizAlternatives.some(alt => !alt.text.trim())
                          ? 'Preencha todas as alternativas do quiz'
                          : ''
                      }
                    >
                      {isCreating ? <Loader2 size={18} className="animate-spin" /> : <Plus size={18} />}
                      Publicar Post
                    </button>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        <ImageCropperModal
          isOpen={cropperModal.isOpen}
          image={cropperModal.image}
          onClose={() => setCropperModal(prev => ({ ...prev, isOpen: false }))}
          onCropComplete={handleCropComplete}
        />
    </>
  );
};
