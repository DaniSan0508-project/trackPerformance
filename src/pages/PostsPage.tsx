import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Search, Loader2, RefreshCw, ChevronLeft, ChevronRight, MessageSquare, Heart, Share2, Bookmark, MoreHorizontal, User, X, Edit, Trash2, Plus, Image as ImageIcon, Calendar, Rocket } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../context/AuthContext';
import { Post, Like, Comment, User as UserType } from '../types';
import { postsService, usersService } from '../services';
import { useToast } from '../context/ToastContext';
import { ConfirmModal } from '../components/ConfirmModal';
import { getFullImageUrl, extractYouTubeVideoId, formatRelativeDate, getYouTubeThumbnailUrl } from '../utils';

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
  const [videoModalPost, setVideoModalPost] = useState<Post | null>(null);
  
  // Create Post state
  const [createPostModal, setCreatePostModal] = useState(false);
  const [newPostTitle, setNewPostTitle] = useState('');
  const [newPostContent, setNewPostContent] = useState('');
  const [newPostImage, setNewPostImage] = useState<File | null>(null);
  const [newPostVideoUrl, setNewPostVideoUrl] = useState('');
  const [mediaType, setMediaType] = useState<'none' | 'image' | 'video'>('none');
  const [isCreating, setIsCreating] = useState(false);
  const [newPostIsSponsored, setNewPostIsSponsored] = useState(false);
  const [newPostEarnsCoins, setNewPostEarnsCoins] = useState(false);
  const [newPostBoostLikeCoins, setNewPostBoostLikeCoins] = useState<string>('10');
  const [newPostBoostCommentCoins, setNewPostBoostCommentCoins] = useState<string>('5');
  const [newPostBoostShareCoins, setNewPostBoostShareCoins] = useState<string>('8');

  // Edit/Delete state
  const [activeMenuPostId, setActiveMenuPostId] = useState<number | null>(null);
  const [editPostModal, setEditPostModal] = useState<Post | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [editMediaType, setEditMediaType] = useState<'none' | 'image' | 'video'>('none');
  const [editImage, setEditImage] = useState<File | null>(null);
  const [editVideoUrl, setEditVideoUrl] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState<number | null>(null);
  const [editIsSponsored, setEditIsSponsored] = useState(false);
  const [editEarnsCoins, setEditEarnsCoins] = useState(false);
  const [editBoostLikeCoins, setEditBoostLikeCoins] = useState<string>('10');
  const [editBoostCommentCoins, setEditBoostCommentCoins] = useState<string>('5');
  const [editBoostShareCoins, setEditBoostShareCoins] = useState<string>('8');

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
  
  // Users cache
  const [usersCache, setUsersCache] = useState<Record<number, UserType>>({});
  const [allMentionUsers, setAllMentionUsers] = useState<UserType[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);

  const fetchAllMentionUsers = useCallback(async () => {
    if (!token) return;
    try {
      // Passa search='', page=1, perPage=9999
      const response = await usersService.getMentions(token, '', 1, 9999);
      const users = response.data || [];
      setAllMentionUsers(users);
      
      // Também alimenta o cache geral para evitar buscas repetidas
      const newCache: Record<number, UserType> = {};
      users.forEach((u: UserType) => {
        newCache[u.id] = u;
      });
      setUsersCache(prev => ({ ...prev, ...newCache }));
    } catch (error) {
      console.error('Error fetching all mention users:', error);
    }
  }, [token]);

  useEffect(() => {
    fetchAllMentionUsers();
  }, [fetchAllMentionUsers]);

  const fetchPosts = useCallback(async (page = 1, filters: { 
    userName?: string; 
    content?: string;
    createdAt?: string;
    earnsCoins?: boolean;
    isSponsored?: boolean;
    isBoosted?: boolean;
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
      } catch (err) {
        console.error('Error sharing:', err);
      }
    } else {
      setShareModalPost(post);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    addToast('success', 'Link copiado para a área de transferência!');
    setShareModalPost(null);
  };

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    setIsCreating(true);
    try {
      const formData = new FormData();
      formData.append('title', newPostTitle);
      formData.append('content', newPostContent);
      if (newPostImage) {
        formData.append('image', newPostImage);
      }
      if (newPostVideoUrl) {
        formData.append('video_url', newPostVideoUrl);
      }
      formData.append('survey_id', '1');

      if (currentUser?.user_type_id === 1) {
        formData.append('is_sponsored', newPostIsSponsored ? '1' : '0');
        formData.append('earns_coins', newPostEarnsCoins ? '1' : '0');
        if (newPostEarnsCoins) {
          formData.append('boost_like_coins', newPostBoostLikeCoins.toString());
          formData.append('boost_comment_coins', newPostBoostCommentCoins.toString());
          formData.append('boost_share_coins', newPostBoostShareCoins.toString());
        }
      }

      await postsService.createPost(token, formData);

      // Reset and close
      setCreatePostModal(false);
      setNewPostTitle('');
      setNewPostContent('');
      setNewPostImage(null);
      setNewPostVideoUrl('');
      setMediaType('none');
      setNewPostIsSponsored(false);
      setNewPostEarnsCoins(false);
      setNewPostBoostLikeCoins('10');
      setNewPostBoostCommentCoins('5');
      setNewPostBoostShareCoins('8');

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
        content: filterContent,
        createdAt: dateFilter,
        earnsCoins: filterEarnsCoins === 'all' ? undefined : filterEarnsCoins,
        isSponsored: filterIsSponsored === 'all' ? undefined : filterIsSponsored,
        isBoosted: filterIsBoosted === 'all' ? undefined : filterIsBoosted,
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
      addToast('error', err.message || 'Erro ao excluir post');
    } finally {
      setIsDeleting(null);
    }
  };

  const handleDeletePost = (post: Post) => {
    setConfirmModal({
      isOpen: true,
      title: 'Excluir Post',
      message: 'Tem certeza que deseja excluir este post? Esta ação não pode ser desfeita.',
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
      const errorMessage = err.response?.data?.message || err.message || 'Erro ao excluir comentário';
      addToast('error', errorMessage);
    }
  };

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
  const editorRef = useRef<HTMLDivElement>(null);
  const debouncedMentionQuery = useDebounce(mentionQuery, 300);

  const handleDeleteCommentConfirm = async () => {
    if (confirmCommentModal.commentId && confirmCommentModal.postId) {
      await handleDeleteComment(confirmCommentModal.commentId, confirmCommentModal.postId);
    }
    setConfirmCommentModal({ isOpen: false, commentId: null, postId: null });
  };

  const handleDeleteCommentClick = (commentId: number, postId: number) => {
    setConfirmCommentModal({ isOpen: true, commentId, postId });
  };

  const handleUpdatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !editPostModal) return;

    setIsUpdating(true);
    console.log('=== Update Post ===');
    console.log('editMediaType:', editMediaType);
    console.log('editImage:', editImage);
    console.log('editVideoUrl:', editVideoUrl);
    console.log('Post original:', {
      image_url: editPostModal.image_url,
      video_url: editPostModal.video_url
    });
    
    try {
      const formData = new FormData();
      formData.append('title', editTitle);
      formData.append('content', editContent);

      // Lógica de mídia: sempre envia os dois campos
      if (editMediaType === 'image') {
        // Envia imagem (nova ou sinaliza manter a atual) e limpa vídeo
        if (editImage) {
          formData.append('image', editImage);
          console.log('Enviando nova imagem:', editImage.name);
        } else if (editPostModal.image_url) {
          formData.append('keep_existing_media', 'true');
          console.log('Mantendo imagem atual');
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
        formData.append('earns_coins', editEarnsCoins ? '1' : '0');
        if (editEarnsCoins) {
          formData.append('boost_like_coins', editBoostLikeCoins.toString());
          formData.append('boost_comment_coins', editBoostCommentCoins.toString());
          formData.append('boost_share_coins', editBoostShareCoins.toString());
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
        content: filterContent,
        createdAt: dateFilter,
        earnsCoins: filterEarnsCoins === 'all' ? undefined : filterEarnsCoins,
        isSponsored: filterIsSponsored === 'all' ? undefined : filterIsSponsored,
        isBoosted: filterIsBoosted === 'all' ? undefined : filterIsBoosted,
        sort: sortOrder
      });

      setEditPostModal(null);
      setEditTitle('');
      setEditContent('');
      setEditMediaType('none');
      setEditImage(null);
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
    setEditContent(post.content);

    // Sincronizar o DOM do editor de edição
    setTimeout(() => {
      const editor = document.querySelector('[data-field="edit"]') as HTMLDivElement;
      if (editor) {
        editor.innerText = post.content;
      }
    }, 0);
    
    setEditIsSponsored(post.is_sponsored || false);
    setEditEarnsCoins(post.earns_coins || false);
    setEditBoostLikeCoins(String(post.boost_like_coins || 10));
    setEditBoostCommentCoins(String(post.boost_comment_coins || 5));
    setEditBoostShareCoins(String(post.boost_share_coins || 8));
    
    // Inicializar mídia atual do post
    if (post.video_url) {
      setEditMediaType('video');
      setEditVideoUrl(post.video_url);
      setEditImage(null);
    } else if (post.image_url) {
      setEditMediaType('image');
      setEditVideoUrl('');
    } else {
      setEditMediaType('none');
      setEditImage(null);
      setEditVideoUrl('');
    }
    
    setActiveMenuPostId(null);
  };

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

  const handleMentionChange = (text: string, element: HTMLDivElement, field: 'create' | 'edit') => {
    const cursorPosition = getCaretCharacterOffsetWithin(element);
    const textBeforeCursor = text.slice(0, cursorPosition);
    const words = textBeforeCursor.split(/\s/);
    const lastWord = words[words.length - 1];

    if (lastWord.startsWith('@')) {
      const query = lastWord.slice(1);
      setMentionQuery(query);
      setShowMentionDropdown(true);
      setMentionTargetField(field);

      // Get cursor coordinates for dropdown positioning
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0).cloneRange();
        const rect = range.getBoundingClientRect();
        if (rect) {
          setDropdownPos({
            top: rect.bottom + window.scrollY,
            left: rect.left + window.scrollX
          });
        }
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

  const handleSelectMention = (userName: string) => {
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
      mentionSpan.className = 'inline-flex items-center px-1.5 py-0.5 rounded-md bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-[13px] font-bold italic select-none mx-0.5';
      mentionSpan.contentEditable = 'false';
      mentionSpan.textContent = `@${userName}`;
      
      range.insertNode(mentionSpan);
      
      // Adicionar um espaço após a menção para facilitar a digitação contínua
      const space = document.createTextNode(' ');
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
        if (mentionTargetField === 'create') {
          setNewPostContent(editorElement.innerText);
        } else {
          setEditContent(editorElement.innerText);
        }
      }
    }

    setShowMentionDropdown(false);
    setMentionQuery('');
  };

  const renderPostContent = (text: string, isCompact = false) => {
    if (!text) return null;

    // Primeiro, limpamos tags HTML que possam vir da API (como os <a> das hashtags/menções)
    // para processarmos apenas o texto puro e aplicarmos nossa própria estilização.
    const cleanText = text.replace(/<[^>]*>?/gm, '');

    // Regex robusta para capturar menções (@usuario) e hashtags (#campanha)
    const regex = /(@[A-Za-zÀ-ÖØ-öø-ÿ0-9_.-]+(?:\s[A-Za-zÀ-ÖØ-öø-ÿ0-9_.-]+)*|#[A-Za-zÀ-ÖØ-öø-ÿ0-9_.-]+)/g;
    const parts = cleanText.split(regex);

    return parts.map((part, index) => {
      if (!part) return null;

      // Trata Menções (@)
      if (part.startsWith('@')) {
        const username = part.substring(1).trim().toLowerCase();
        
        const mentionedUser = allMentionUsers.find(
          u => (u.username?.toLowerCase() === username || (u.name && u.name.toLowerCase() === username))
        ) || Object.values(usersCache).find(
          u => (u.username?.toLowerCase() === username || (u.name && u.name.toLowerCase() === username))
        );

        return (
          <span 
            key={index} 
            contentEditable={false} 
            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-blue-100/50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-[13px] font-bold italic select-none mx-0.5 hover:underline cursor-pointer transition-colors relative group/mention"
          >
            {mentionedUser?.profile_image_url && (
              <img 
                src={getFullImageUrl(mentionedUser.profile_image_url) || ''} 
                alt={mentionedUser.name} 
                className="w-4 h-4 rounded-full object-cover border border-blue-200 dark:border-blue-800"
              />
            )}
            {part}
            {mentionedUser?.profile_image_url && (
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 z-[100] mb-2 opacity-0 invisible group-hover/mention:opacity-100 group-hover/mention:visible transition-all duration-300 pointer-events-none drop-shadow-lg">
                <div className={`bg-white dark:bg-zinc-800 p-1 rounded-xl border border-zinc-200 dark:border-zinc-700 ${isCompact ? 'w-10 h-10' : 'w-24 h-24'} overflow-hidden`}>
                  <img 
                    src={getFullImageUrl(mentionedUser.profile_image_url) || ''} 
                    alt={mentionedUser.name} 
                    className="w-full h-full rounded-lg object-cover bg-zinc-100 dark:bg-zinc-900"
                  />
                </div>
                <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-8 border-transparent border-t-white dark:border-t-zinc-800"></div>
              </div>
            )}
          </span>
        );
      }

      // Trata Hashtags (#)
      if (part.startsWith('#')) {
        return (
          <span 
            key={index}
            className="inline-flex items-center px-1.5 py-0.5 rounded-md bg-primary-100/50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400 text-[13px] font-bold select-none mx-0.5 hover:underline cursor-pointer transition-colors"
          >
            {part}
          </span>
        );
      }

      return <span key={index}>{part}</span>;
    });
  };

  useEffect(() => {
    const dateFilter = filterStartDate && filterEndDate
      ? `${filterStartDate},${filterEndDate}`
      : filterStartDate || filterEndDate || '';

    fetchPosts(currentPage, { 
      userName: debouncedUserName, 
      content: debouncedContent,
      createdAt: dateFilter,
      earnsCoins: filterEarnsCoins === 'all' ? undefined : filterEarnsCoins,
      isSponsored: filterIsSponsored === 'all' ? undefined : filterIsSponsored,
      isBoosted: filterIsBoosted === 'all' ? undefined : filterIsBoosted,
      sort: sortOrder
    });
  }, [fetchPosts, currentPage, debouncedUserName, debouncedContent, filterStartDate, filterEndDate, filterEarnsCoins, filterIsSponsored, filterIsBoosted, sortOrder]);

  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedUserName, debouncedContent, filterStartDate, filterEndDate, filterEarnsCoins, filterIsSponsored, filterIsBoosted, sortOrder]);

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
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">Posts</h1>
            <p className="text-zinc-500 dark:text-zinc-400">Gerencie e visualize as publicações do seu time.</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => {
                const dateFilter = filterStartDate && filterEndDate ? `${filterStartDate},${filterEndDate}` : filterStartDate || filterEndDate || '';
                fetchPosts(currentPage, { userName: filterUserName, createdAt: dateFilter });
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-zinc-400 dark:text-zinc-500" size={18} />
              <input 
                type="text" 
                placeholder="Nome do usuário..." 
                className="w-full pl-10 pr-4 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-500 text-sm"
                value={filterUserName}
                onChange={(e) => setFilterUserName(e.target.value)}
              />
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-zinc-400 dark:text-zinc-500" size={18} />
              <input 
                type="text" 
                placeholder="Conteúdo do post..." 
                className="w-full pl-10 pr-4 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-500 text-sm"
                value={filterContent}
                onChange={(e) => setFilterContent(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="relative">
                <Calendar size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-primary-500 pointer-events-none" />
                <input
                  type="date"
                  className="w-full pl-9 pr-2 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 text-zinc-900 dark:text-zinc-100 text-sm [&::-webkit-calendar-picker-indicator]:opacity-0"
                  value={filterStartDate}
                  onChange={(e) => setFilterStartDate(e.target.value)}
                  title="Início"
                />
              </div>
              <div className="relative">
                <Calendar size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-primary-500 pointer-events-none" />
                <input
                  type="date"
                  className="w-full pl-9 pr-2 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 text-zinc-900 dark:text-zinc-100 text-sm [&::-webkit-calendar-picker-indicator]:opacity-0"
                  value={filterEndDate}
                  onChange={(e) => setFilterEndDate(e.target.value)}
                  title="Fim"
                />
              </div>
            </div>
            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
              className="w-full px-4 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 text-zinc-900 dark:text-zinc-100 text-sm"
            >
              <option value="-created_at">Mais recentes</option>
              <option value="created_at">Mais antigos</option>
            </select>
          </div>

          <div className="flex flex-wrap items-center gap-y-4 gap-x-6 pt-2 border-t border-zinc-50 dark:border-zinc-700/50">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2">
              <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Moedas:</span>
              <div className="flex bg-zinc-100 dark:bg-zinc-900 p-1 rounded-lg w-fit">
                {[
                  { label: 'Todos', value: 'all' },
                  { label: 'Sim', value: true },
                  { label: 'Não', value: false }
                ].map((opt) => (
                  <button
                    key={opt.label}
                    onClick={() => setFilterEarnsCoins(opt.value as any)}
                    className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${
                      filterEarnsCoins === opt.value
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
              <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Patrocinado:</span>
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

            {(filterUserName || filterContent || filterStartDate || filterEndDate || filterEarnsCoins !== 'all' || filterIsSponsored !== 'all' || filterIsBoosted !== 'all') && (
              <button
                onClick={() => {
                  setFilterUserName('');
                  setFilterContent('');
                  setFilterStartDate('');
                  setFilterEndDate('');
                  setFilterEarnsCoins('all');
                  setFilterIsSponsored('all');
                  setFilterIsBoosted('all');
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
                fetchPosts(currentPage, { userName: filterUserName, createdAt: dateFilter });
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
                  className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm flex flex-col relative"
                >
                  {/* Header */}
                  <div className="p-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
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
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <h3 className="font-semibold text-sm text-zinc-900 dark:text-zinc-100 leading-none truncate">{post.user?.name || 'Usuário'}</h3>
                          {post.is_boosted && (
                            <div className="flex-shrink-0 text-primary-600 dark:text-primary-400" title="Turbinado">
                              <Rocket size={14} className="fill-primary-600/10" />
                            </div>
                          )}
                        </div>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 truncate">
                          {formatRelativeDate(post.created_at)}
                          {post.earns_coins && <span className="ml-2 text-amber-600 font-medium">• Ganha {coinName}</span>}
                        </p>
                      </div>
                    </div>
                    <div className="relative">
                      <button
                        onClick={() => setActiveMenuPostId(activeMenuPostId === post.id ? null : post.id)}
                        className="text-zinc-400 dark:text-zinc-500 hover:text-zinc-600 dark:hover:text-zinc-300 flex-shrink-0 p-1 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                      >
                        <MoreHorizontal size={20} />
                      </button>

                      {activeMenuPostId === post.id && (
                        <div className="absolute right-0 top-full mt-1 w-48 bg-white dark:bg-zinc-800 rounded-xl shadow-lg border border-zinc-100 dark:border-zinc-700 py-1 z-10 overflow-hidden">
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

                  {/* Image / Video Thumbnail */}
                  {(post.image_full_url || post.video_url) && (
                    <div className="w-full bg-zinc-50 dark:bg-zinc-900 border-y border-zinc-100 dark:border-zinc-800 aspect-square flex items-center justify-center overflow-hidden">
                      {post.video_url ? (
                        <div 
                          className="relative w-full h-full cursor-pointer group"
                          onClick={() => setVideoModalPost(post)}
                        >
                          <img
                            src={post.video_thumbnail_url || getYouTubeThumbnailUrl(post.video_url) || ''}
                            alt="YouTube video thumbnail"
                            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                            loading="lazy"
                          />
                          <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/40 transition-colors">
                            <div className="w-20 h-20 bg-red-600 rounded-full flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                              <div className="w-0 h-0 border-t-12 border-t-transparent border-l-20 border-l-white border-b-12 border-b-transparent ml-1"></div>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <img
                          src={post.image_full_url}
                          alt="Post content"
                          className="w-full h-full object-cover"
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
                      onClick={() => setContentModalPost(post)}
                      className="flex-1 flex flex-col w-full group mb-3"
                    >
                      {post.title && (
                        <h4 className="text-base font-bold text-zinc-900 dark:text-zinc-100 mb-2 group-hover:text-primary-700 dark:group-hover:text-primary-500 transition-colors text-left w-full">
                          {post.title}
                        </h4>
                      )}
                      
                      <div className="flex-1 flex flex-col justify-center w-full">
                        <div className="text-sm text-zinc-900 dark:text-zinc-300 line-clamp-6 group-hover:text-zinc-700 dark:group-hover:text-zinc-200 transition-colors text-left">
                          {renderPostContent(post.content, true)}
                        </div>
                        {post.content.length > 300 && (
                          <span className="text-xs text-zinc-400 dark:text-zinc-500 mt-2 block group-hover:underline text-left">Ver mais...</span>
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
                          subtext={new Date(like.created_at).toLocaleDateString()}
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
                  <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">Comentários</h2>
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
                              <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-1 ml-2">
                                {formatRelativeDate(comment.created_at)}
                              </p>
                            </div>
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
                    className="flex flex-col items-center justify-center gap-2 p-4 rounded-xl bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors"
                  >
                    <Share2 size={24} />
                    <span className="text-sm font-medium">WhatsApp</span>
                  </a>
                  <button 
                    onClick={() => copyToClipboard(window.location.href)}
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
                  {contentModalPost.title && (
                    <h3 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 mb-4 break-words">
                      {contentModalPost.title}
                    </h3>
                  )}
                  <div className="text-zinc-900 dark:text-zinc-300 whitespace-pre-wrap leading-relaxed text-sm md:text-base break-words">
                    {renderPostContent(contentModalPost.content)}
                  </div>
                  <div className="mt-6 pt-4 border-t border-zinc-100 dark:border-zinc-800 flex justify-between items-center text-xs text-zinc-400 dark:text-zinc-500">
                    <span>Postado em {new Date(contentModalPost.created_at).toLocaleDateString()} às {new Date(contentModalPost.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    {contentModalPost.earns_coins && (
                      <span className="text-amber-600 font-medium flex items-center gap-1">
                        💰 Ganha {coinName}
                      </span>
                    )}
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
                  <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">Editar Post</h2>
                  <button onClick={() => setEditPostModal(null)} className="text-zinc-400 dark:text-zinc-500 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors">
                    <X size={24} />
                  </button>
                </div>

                <div className="overflow-y-auto flex-1">
                  <form onSubmit={handleUpdatePost} className="p-6 space-y-4">
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
                    <div
                      contentEditable
                      data-field="edit"
                      onInput={(e) => handleMentionChange(e.currentTarget.innerText, e.currentTarget, 'edit')}
                      className="w-full p-3 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent min-h-[150px] text-zinc-900 dark:text-zinc-100"
                    >
                    </div>

                    {/* Floating Mentions Dropdown */}
                    {showMentionDropdown && mentionTargetField === 'edit' && (
                      <div 
                        className="fixed z-[100] bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl shadow-lg max-h-48 overflow-y-auto w-64"
                        style={{ 
                          top: dropdownPos.top + 5, 
                          left: Math.min(dropdownPos.left, window.innerWidth - 280) 
                        }}
                      >
                        {mentionLoading ? (
                          <div className="p-3 flex items-center justify-center">
                            <Loader2 className="animate-spin text-primary-500" size={18} />
                          </div>
                        ) : mentionUsers.length > 0 ? (
                          mentionUsers.map((u) => (
                            <button
                              key={u.id}
                              type="button"
                              onClick={() => handleSelectMention(u.username || u.name)}
                              className="w-full flex items-center gap-2 p-2 hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors text-left"
                            >
                              <div className="w-6 h-6 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden flex-shrink-0">
                                {u.profile_image_url ? (
                                  <img src={getFullImageUrl(u.profile_image_url) || ''} alt={u.name} className="w-full h-full object-cover" />
                                ) : (
                                  <User size={12} className="text-zinc-400 m-auto" />
                                )}
                              </div>
                              <div>
                                <p className="text-xs font-medium text-zinc-900 dark:text-zinc-100 leading-tight">{u.name}</p>
                                {u.username && <p className="text-[10px] text-zinc-500 dark:text-zinc-400 leading-tight">@{u.username}</p>}
                              </div>
                            </button>
                          ))
                        ) : (
                          <div className="p-2 text-xs text-zinc-500 dark:text-zinc-400 text-center">
                            Nenhum usuário encontrado.
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {currentUser?.user_type_id === 1 && (
                    <div className="space-y-4 p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl border border-zinc-100 dark:border-zinc-800">
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
                          Post vale moedas
                        </label>
                        <button
                          type="button"
                          onClick={() => setEditEarnsCoins(!editEarnsCoins)}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                            editEarnsCoins ? "bg-primary-600" : "bg-zinc-300 dark:bg-zinc-600"
                          }`}
                        >
                          <span
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
                              Like
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
                              onChange={(e) => {
                                const val = e.target.value;
                                if (val === "" || /^\d+$/.test(val)) {
                                  setEditBoostLikeCoins(val);
                                }
                              }}
                              className="w-full p-2 text-sm bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-zinc-900 dark:text-zinc-100"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] uppercase font-bold text-zinc-500 dark:text-zinc-400 mb-1">
                              Coment.
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
                              onChange={(e) => {
                                const val = e.target.value;
                                if (val === "" || /^\d+$/.test(val)) {
                                  setEditBoostCommentCoins(val);
                                }
                              }}
                              className="w-full p-2 text-sm bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-zinc-900 dark:text-zinc-100"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] uppercase font-bold text-zinc-500 dark:text-zinc-400 mb-1">
                              Compart.
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
                              onChange={(e) => {
                                const val = e.target.value;
                                if (val === "" || /^\d+$/.test(val)) {
                                  setEditBoostShareCoins(val);
                                }
                              }}
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
                    {(editPostModal.image_url || editPostModal.video_url) && (
                      <div className="mb-3 p-3 bg-zinc-50 dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700">
                        <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-2">Mídia atual:</p>
                        {editPostModal.video_url ? (
                          <div className="relative rounded-lg overflow-hidden bg-zinc-100 dark:bg-zinc-900">
                            <img
                              src={editPostModal.video_thumbnail_url || getYouTubeThumbnailUrl(editPostModal.video_url) || ''}
                              alt="Current video"
                              className="w-full h-40 object-contain bg-black"
                            />
                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                              <div className="w-12 h-12 bg-red-600 rounded-full flex items-center justify-center">
                                <div className="w-0 h-0 border-t-6 border-t-transparent border-l-10 border-l-white border-b-6 border-b-transparent ml-1"></div>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="relative rounded-lg overflow-hidden bg-zinc-100 dark:bg-zinc-900 flex items-center justify-center" style={{minHeight: '160px', maxHeight: '240px'}}>
                            <img
                              src={editPostModal.image_full_url || ''}
                              alt="Current image"
                              className="max-w-full max-h-60 object-contain"
                            />
                          </div>
                        )}
                      </div>
                    )}

                    {/* Campo de Imagem */}
                    {editMediaType === 'image' && (
                      <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-zinc-300 dark:border-zinc-700 border-dashed rounded-xl hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors cursor-pointer relative">
                        <div className="space-y-1 text-center">
                          {editImage ? (
                            <div className="relative">
                              <img
                                src={URL.createObjectURL(editImage)}
                                alt="Preview"
                                className="mx-auto h-48 object-contain rounded-lg"
                              />
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  e.preventDefault();
                                  setEditImage(null);
                                  setEditMediaType('none');
                                }}
                                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                              >
                                <X size={16} />
                              </button>
                              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-2">{editImage.name}</p>
                            </div>
                          ) : (
                            <>
                              <ImageIcon className="mx-auto h-12 w-12 text-zinc-400 dark:text-zinc-500" />
                              <div className="flex text-sm text-zinc-600 dark:text-zinc-400 justify-center">
                                <label
                                  htmlFor="edit-file-upload"
                                  className="relative cursor-pointer bg-white dark:bg-zinc-900 rounded-md font-medium text-primary-600 hover:text-primary-500 focus-within:outline-none"
                                >
                                  <span>Upload um arquivo</span>
                                  <input
                                    id="edit-file-upload"
                                    name="edit-file-upload"
                                    type="file"
                                    className="sr-only"
                                    accept="image/*"
                                    onChange={(e) => {
                                      if (e.target.files && e.target.files[0]) {
                                        setEditImage(e.target.files[0]);
                                      }
                                    }}
                                  />
                                </label>
                              </div>
                              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                                PNG, JPG, GIF até 5MB
                              </p>
                            </>
                          )}
                        </div>
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
                                  <div className="relative rounded-lg overflow-hidden bg-zinc-100 dark:bg-zinc-800">
                                    <img
                                      src={`https://img.youtube.com/vi/${videoId}/hqdefault.jpg`}
                                      alt="YouTube thumbnail"
                                      className="w-full h-48 object-cover"
                                    />
                                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                      <div className="w-16 h-16 bg-red-600 rounded-full flex items-center justify-center">
                                        <div className="w-0 h-0 border-t-8 border-t-transparent border-l-12 border-l-white border-b-8 border-b-transparent ml-1"></div>
                                      </div>
                                    </div>
                                  </div>
                                );
                              }
                              return null;
                            })()}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="pt-2 flex gap-3">
                    <button
                      type="button"
                      onClick={() => setEditPostModal(null)}
                      className="flex-1 px-4 py-2 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-xl hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors font-medium"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={isUpdating || !editContent.trim() || editMediaType === 'none'}
                      className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-xl hover:bg-primary-700 transition-colors font-medium flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                      title={editMediaType === 'none' ? 'Selecione uma imagem ou vídeo do YouTube' : ''}
                    >
                      {isUpdating ? <Loader2 size={18} className="animate-spin" /> : <Edit size={18} />}
                      Salvar Alterações
                    </button>
                  </div>
                </form>
                </div>
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
                  <button onClick={() => setCreatePostModal(false)} className="text-zinc-400 dark:text-zinc-500 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors">
                    <X size={24} />
                  </button>
                </div>
                
                <div className="overflow-y-auto flex-1 custom-scrollbar">
                  <form onSubmit={handleCreatePost} className="p-6 space-y-4">
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
                      <div
                        contentEditable
                        data-field="create"
                        onInput={(e) => handleMentionChange(e.currentTarget.innerText, e.currentTarget, 'create')}
                        className="w-full p-3 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent min-h-[150px] text-zinc-900 dark:text-zinc-100"
                      >
                      </div>
                      
                      {/* Floating Mentions Dropdown */}
                      {showMentionDropdown && mentionTargetField === 'create' && (
                        <div 
                          className="fixed z-[100] bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl shadow-lg max-h-48 overflow-y-auto w-64"
                          style={{ 
                            top: dropdownPos.top + 5, 
                            left: Math.min(dropdownPos.left, window.innerWidth - 280) 
                          }}
                        >
                          {mentionLoading ? (
                            <div className="p-3 flex items-center justify-center">
                              <Loader2 className="animate-spin text-primary-500" size={18} />
                            </div>
                          ) : mentionUsers.length > 0 ? (
                            mentionUsers.map((u) => (
                              <button
                                key={u.id}
                                type="button"
                                onClick={() => handleSelectMention(u.username || u.name)}
                                className="w-full flex items-center gap-2 p-2 hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors text-left"
                              >
                                <div className="w-6 h-6 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden flex-shrink-0">
                                  {u.profile_image_url ? (
                                    <img src={getFullImageUrl(u.profile_image_url) || ''} alt={u.name} className="w-full h-full object-cover" />
                                  ) : (
                                    <User size={12} className="text-zinc-400 m-auto" />
                                  )}
                                </div>
                                <div>
                                  <p className="text-xs font-medium text-zinc-900 dark:text-zinc-100 leading-tight">{u.name}</p>
                                  {u.username && <p className="text-[10px] text-zinc-500 dark:text-zinc-400 leading-tight">@{u.username}</p>}
                                </div>
                              </button>
                            ))
                          ) : (
                            <div className="p-2 text-xs text-zinc-500 dark:text-zinc-400 text-center">
                              Nenhum usuário encontrado.
                            </div>
                          )}
                        </div>
                      )}
                    </div>

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
                            Post vale moedas
                          </label>
                          <button
                            type="button"
                            onClick={() => setNewPostEarnsCoins(!newPostEarnsCoins)}
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
                                Like
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
                                onChange={(e) => {
                                  const val = e.target.value;
                                  if (val === "" || /^\d+$/.test(val)) {
                                    setNewPostBoostLikeCoins(val);
                                  }
                                }}
                                className="w-full p-2 text-sm bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-zinc-900 dark:text-zinc-100"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] uppercase font-bold text-zinc-500 dark:text-zinc-400 mb-1">
                                Coment.
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
                                onChange={(e) => {
                                  const val = e.target.value;
                                  if (val === "" || /^\d+$/.test(val)) {
                                    setNewPostBoostCommentCoins(val);
                                  }
                                }}
                                className="w-full p-2 text-sm bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-zinc-900 dark:text-zinc-100"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] uppercase font-bold text-zinc-500 dark:text-zinc-400 mb-1">
                                Compart.
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
                                onChange={(e) => {
                                  const val = e.target.value;
                                  if (val === "" || /^\d+$/.test(val)) {
                                    setNewPostBoostShareCoins(val);
                                  }
                                }}
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
                              setNewPostImage(null);
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
                              setNewPostImage(null);
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
                        <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-zinc-300 dark:border-zinc-700 border-dashed rounded-xl hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors cursor-pointer relative">
                          <div className="space-y-1 text-center">
                            {newPostImage ? (
                              <div className="relative">
                                <img
                                  src={URL.createObjectURL(newPostImage)}
                                  alt="Preview"
                                  className="mx-auto h-48 object-contain rounded-lg"
                                />
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    e.preventDefault();
                                    setNewPostImage(null);
                                    setMediaType('none');
                                  }}
                                  className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                                >
                                  <X size={16} />
                                </button>
                                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-2">{newPostImage.name}</p>
                              </div>
                            ) : (
                              <>
                                <ImageIcon className="mx-auto h-12 w-12 text-zinc-400 dark:text-zinc-500" />
                                <div className="flex text-sm text-zinc-600 dark:text-zinc-400 justify-center">
                                  <label
                                    htmlFor="file-upload"
                                    className="relative cursor-pointer bg-white dark:bg-zinc-900 rounded-md font-medium text-primary-600 hover:text-primary-500 focus-within:outline-none"
                                  >
                                    <span>Upload um arquivo</span>
                                    <input
                                      id="file-upload"
                                      name="file-upload"
                                      type="file"
                                      className="sr-only"
                                      accept="image/*"
                                      onChange={(e) => {
                                        if (e.target.files && e.target.files[0]) {
                                          setNewPostImage(e.target.files[0]);
                                        }
                                      }}
                                    />
                                  </label>
                                </div>
                                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                                  PNG, JPG, GIF até 5MB
                                </p>
                              </>
                            )}
                          </div>
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
                                    <div className="relative rounded-lg overflow-hidden bg-zinc-100 dark:bg-zinc-800">
                                      <img
                                        src={`https://img.youtube.com/vi/${videoId}/hqdefault.jpg`}
                                        alt="YouTube thumbnail"
                                        className="w-full h-48 object-cover"
                                      />
                                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                        <div className="w-16 h-16 bg-red-600 rounded-full flex items-center justify-center">
                                          <div className="w-0 h-0 border-t-8 border-t-transparent border-l-12 border-l-white border-b-8 border-b-transparent ml-1"></div>
                                        </div>
                                      </div>
                                    </div>
                                  );
                                }
                                return null;
                              })()}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </form>
                </div>

                <div className="p-4 border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/50 flex-shrink-0">
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => setCreatePostModal(false)}
                      className="flex-1 px-4 py-2 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-xl hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors font-medium"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={(e) => {
                        const form = document.querySelector('form');
                        if (form) form.requestSubmit();
                      }}
                      disabled={isCreating || !newPostContent.trim() || (mediaType === 'none')}
                      className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-xl hover:bg-primary-700 transition-colors font-medium flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                      title={mediaType === 'none' ? 'Selecione uma imagem ou vídeo do YouTube' : ''}
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
    </>
  );
};
