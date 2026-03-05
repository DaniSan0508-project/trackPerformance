import React, { useState, useEffect, useCallback } from 'react';
import { Layout } from '../components/Layout';
import { Search, Loader2, RefreshCw, ChevronLeft, ChevronRight, MessageSquare, Heart, Share2, Bookmark, MoreHorizontal, User, X, Edit, Trash2, Plus, Image as ImageIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../context/AuthContext';
import { Post, Like, Comment, User as UserType } from '../types';
import { api } from '../services/api';
import { useToast } from '../context/ToastContext';
import { ConfirmModal } from '../components/ConfirmModal';

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
        <img src={user.profile_image_url} alt={user.name} className="w-full h-full object-cover" />
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
  const { token, user: currentUser } = useAuth();
  const { addToast } = useToast();
  const [posts, setPosts] = useState<Post[]>([]);
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
  const [likesModalPost, setLikesModalPost] = useState<Post | null>(null);
  const [commentsModalPost, setCommentsModalPost] = useState<Post | null>(null);
  const [shareModalPost, setShareModalPost] = useState<Post | null>(null);
  const [contentModalPost, setContentModalPost] = useState<Post | null>(null);
  
  // Create Post state
  const [createPostModal, setCreatePostModal] = useState(false);
  const [newPostTitle, setNewPostTitle] = useState('');
  const [newPostContent, setNewPostContent] = useState('');
  const [newPostImage, setNewPostImage] = useState<File | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  // Edit/Delete state
  const [activeMenuPostId, setActiveMenuPostId] = useState<number | null>(null);
  const [editPostModal, setEditPostModal] = useState<Post | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState<number | null>(null);

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
  const [loadingUsers, setLoadingUsers] = useState(false);

  const fetchPosts = useCallback(async (page = 1, search = '') => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const data = await api.getPosts(token, page, search);
      setPosts(data.data);
      setCurrentPage(data.current_page);
      setTotalPages(data.last_page);
      setTotalItems(data.total);
      setFromItem(data.from);
      setToItem(data.to);
      
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
      const promises = missingIds.map(id => api.getUser(token, id).catch(() => null));
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
      formData.append('survey_id', '1');

      await api.createPost(token, formData);
      
      // Reset and close
      setCreatePostModal(false);
      setNewPostTitle('');
      setNewPostContent('');
      setNewPostImage(null);
      
      // Refresh posts
      fetchPosts(1, searchTerm);
      addToast('success', 'Post criado com sucesso!');
    } catch (err: any) {
      console.error('Error creating post:', err);
      addToast('error', err.message || 'Erro ao criar post');
    } finally {
      setIsCreating(false);
    }
  };

  const executeDeletePost = async (post: Post) => {
    if (!token) return;
    
    setIsDeleting(post.id);
    try {
      await api.deletePost(token, post.id);
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

  const handleUpdatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !editPostModal) return;

    setIsUpdating(true);
    try {
      await api.updatePost(token, editPostModal.id, { title: editTitle, content: editContent });
      setPosts(prev => prev.map(p => p.id === editPostModal.id ? { ...p, title: editTitle, content: editContent } : p));
      setEditPostModal(null);
      setEditTitle('');
      setEditContent('');
      addToast('success', 'Post atualizado com sucesso!');
    } catch (err: any) {
      console.error('Error updating post:', err);
      addToast('error', err.message || 'Erro ao atualizar post');
    } finally {
      setIsUpdating(false);
    }
  };

  const openEditModal = (post: Post) => {
    setEditPostModal(post);
    setEditTitle(post.title || '');
    setEditContent(post.content);
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
    fetchPosts(currentPage, debouncedSearchTerm);
  }, [fetchPosts, currentPage, debouncedSearchTerm]);

  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearchTerm]);

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
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">Posts</h1>
            <p className="text-zinc-500 dark:text-zinc-400">Gerencie e visualize as publicações dos usuários.</p>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={() => setCreatePostModal(true)}
              className="bg-emerald-600 px-4 py-2 rounded-xl text-sm font-medium text-white hover:bg-emerald-700 shadow-sm transition-all flex items-center gap-2"
            >
              <Plus size={18} />
              Novo Post
            </button>
            <button 
              onClick={() => fetchPosts(currentPage, searchTerm)}
              className="bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 p-2 rounded-xl text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-all"
              title="Atualizar"
            >
              <RefreshCw size={20} className={loading ? "animate-spin" : ""} />
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white dark:bg-zinc-800 p-4 rounded-2xl shadow-sm border border-zinc-100 dark:border-zinc-700 flex flex-col md:flex-row gap-4 items-center">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-zinc-400 dark:text-zinc-500" size={20} />
            <input 
              type="text" 
              placeholder="Buscar por conteúdo..." 
              className="w-full pl-10 pr-4 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-500"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {/* Posts List */}
        {loading && posts.length === 0 ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
          </div>
        ) : error ? (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 p-4 rounded-xl text-center">
            {error}
            <button onClick={() => fetchPosts(currentPage, searchTerm)} className="block mx-auto mt-2 text-sm font-semibold hover:underline">
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
                  className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden flex flex-col"
                >
                  {/* Header */}
                  <div className="p-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-gradient-to-tr from-emerald-400 via-green-500 to-teal-600 p-[2px] rounded-full flex-shrink-0">
                        <div className="w-full h-full bg-white dark:bg-zinc-900 rounded-full p-[2px]">
                          {post.user?.profile_image_url ? (
                            <img src={post.user.profile_image_url} alt={post.user.name} className="w-full h-full rounded-full object-cover" />
                          ) : (
                            <div className="w-full h-full bg-zinc-100 dark:bg-zinc-800 rounded-full flex items-center justify-center text-zinc-400 dark:text-zinc-500">
                              <User size={14} />
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-semibold text-sm text-zinc-900 dark:text-zinc-100 leading-none truncate">{post.user?.name || 'Usuário'}</h3>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 truncate">
                          {new Date(post.created_at).toLocaleDateString()}
                          {post.earns_coins && <span className="ml-2 text-amber-600 font-medium">• Ganha Moedas</span>}
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

                  {/* Image */}
                  {post.image_full_url && (
                    <div className="w-full bg-zinc-50 dark:bg-zinc-900 border-y border-zinc-100 dark:border-zinc-800 aspect-square flex items-center justify-center overflow-hidden">
                      <img 
                        src={post.image_full_url} 
                        alt="Post content" 
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    </div>
                  )}

                  {/* Actions & Content */}
                  <div className="p-3 pb-3 flex-1 flex flex-col">
                    
                    {/* Content */}
                    <div className="space-y-1 mb-3">
                      <button 
                        type="button"
                        onClick={() => setContentModalPost(post)}
                        className="text-left w-full group block"
                      >
                        {post.title && (
                          <h4 className="text-base font-bold text-zinc-900 dark:text-zinc-100 mb-1 group-hover:text-emerald-700 dark:group-hover:text-emerald-500 transition-colors">
                            {post.title}
                          </h4>
                        )}
                        <div className="text-sm text-zinc-900 dark:text-zinc-300 line-clamp-3 group-hover:text-zinc-700 dark:group-hover:text-zinc-200 transition-colors">
                          {post.content}
                        </div>
                        {post.content.length > 150 && (
                          <span className="text-xs text-zinc-400 dark:text-zinc-500 mt-1 block group-hover:underline">Ver mais...</span>
                        )}
                      </button>
                    </div>

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
                        className="flex items-center gap-1.5 text-zinc-500 dark:text-zinc-400 hover:text-emerald-600 dark:hover:text-emerald-500 transition-colors group"
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
                className="bg-white dark:bg-zinc-900 rounded-2xl shadow-xl w-full max-w-md overflow-hidden flex flex-col max-h-[80vh]"
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
                className="bg-white dark:bg-zinc-900 rounded-2xl shadow-xl w-full max-w-md overflow-hidden flex flex-col max-h-[80vh]"
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
                        return (
                          <div key={comment.id} className="flex gap-3">
                            <div className="w-8 h-8 bg-zinc-100 dark:bg-zinc-800 rounded-full flex items-center justify-center text-zinc-500 dark:text-zinc-400 flex-shrink-0 overflow-hidden mt-1">
                              {user?.profile_image_url ? (
                                <img src={user.profile_image_url} alt={user.name} className="w-full h-full object-cover" />
                              ) : (
                                <User size={16} />
                              )}
                            </div>
                            <div className="flex-1">
                              <div className="bg-zinc-50 dark:bg-zinc-800 p-3 rounded-2xl rounded-tl-none">
                                <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-1">{user?.name || 'Usuário Desconhecido'}</p>
                                <p className="text-sm text-zinc-700 dark:text-zinc-300">{comment.text}</p>
                              </div>
                              <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-1 ml-2">
                                {new Date(comment.created_at).toLocaleDateString()} às {new Date(comment.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
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
                className="bg-white dark:bg-zinc-900 rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[80vh]"
              >
                <div className="p-4 border-b border-zinc-100 dark:border-zinc-800 flex justify-between items-center bg-zinc-50/50 dark:bg-zinc-800/50">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-zinc-100 dark:bg-zinc-800 rounded-full flex items-center justify-center text-zinc-500 dark:text-zinc-400 overflow-hidden">
                       {contentModalPost.user?.profile_image_url ? (
                        <img src={contentModalPost.user.profile_image_url} alt={contentModalPost.user.name} className="w-full h-full object-cover" />
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
                <div className="p-6 overflow-y-auto">
                  {contentModalPost.title && (
                    <h3 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 mb-4">
                      {contentModalPost.title}
                    </h3>
                  )}
                  <p className="text-zinc-900 dark:text-zinc-300 whitespace-pre-wrap leading-relaxed text-sm md:text-base">
                    {contentModalPost.content}
                  </p>
                  <div className="mt-6 pt-4 border-t border-zinc-100 dark:border-zinc-800 flex justify-between items-center text-xs text-zinc-400 dark:text-zinc-500">
                    <span>Postado em {new Date(contentModalPost.created_at).toLocaleDateString()} às {new Date(contentModalPost.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    {contentModalPost.earns_coins && (
                      <span className="text-amber-600 font-medium flex items-center gap-1">
                        💰 Ganha Moedas
                      </span>
                    )}
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
        {/* Edit Post Modal */}
        <AnimatePresence>
          {editPostModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white dark:bg-zinc-900 rounded-2xl shadow-xl w-full max-w-lg overflow-hidden"
              >
                <div className="p-4 border-b border-zinc-100 dark:border-zinc-800 flex justify-between items-center bg-zinc-50/50 dark:bg-zinc-800/50">
                  <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">Editar Post</h2>
                  <button onClick={() => setEditPostModal(null)} className="text-zinc-400 dark:text-zinc-500 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors">
                    <X size={24} />
                  </button>
                </div>
                
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
                      className="w-full p-3 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-500"
                      placeholder="Título do post"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                      Conteúdo
                    </label>
                    <textarea
                      required
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      className="w-full p-3 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent min-h-[150px] resize-none text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-500"
                      placeholder="O que você está pensando?"
                    />
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
                      disabled={isUpdating || !editContent.trim()}
                      className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-colors font-medium flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isUpdating ? <Loader2 size={18} className="animate-spin" /> : <Edit size={18} />}
                      Salvar Alterações
                    </button>
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
                className="bg-white dark:bg-zinc-900 rounded-2xl shadow-xl w-full max-w-lg overflow-hidden"
              >
                <div className="p-4 border-b border-zinc-100 dark:border-zinc-800 flex justify-between items-center bg-zinc-50/50 dark:bg-zinc-800/50">
                  <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">Criar Novo Post</h2>
                  <button onClick={() => setCreatePostModal(false)} className="text-zinc-400 dark:text-zinc-500 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors">
                    <X size={24} />
                  </button>
                </div>
                
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
                      className="w-full p-3 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-500"
                      placeholder="Título do post"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                      Conteúdo
                    </label>
                    <textarea
                      required
                      value={newPostContent}
                      onChange={(e) => setNewPostContent(e.target.value)}
                      className="w-full p-3 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent min-h-[150px] resize-none text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-500"
                      placeholder="O que você está pensando?"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                      Imagem (Opcional)
                    </label>
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
                                className="relative cursor-pointer bg-white dark:bg-zinc-900 rounded-md font-medium text-emerald-600 hover:text-emerald-500 focus-within:outline-none"
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
                  </div>

                  <div className="pt-2 flex gap-3">
                    <button
                      type="button"
                      onClick={() => setCreatePostModal(false)}
                      className="flex-1 px-4 py-2 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-xl hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors font-medium"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={isCreating || !newPostContent.trim()}
                      className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-colors font-medium flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isCreating ? <Loader2 size={18} className="animate-spin" /> : <Plus size={18} />}
                      Publicar
                    </button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
    </Layout>
  );
};
