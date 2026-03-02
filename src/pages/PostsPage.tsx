import React, { useState, useEffect, useCallback } from 'react';
import { Layout } from '../components/Layout';
import { Search, Loader2, RefreshCw, ChevronLeft, ChevronRight, MessageSquare, Heart, Share2, Bookmark, MoreHorizontal, User, X, Edit, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../context/AuthContext';
import { Post, Like, Comment, User as UserType } from '../types';
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

const UserListItem: React.FC<{ user?: UserType | { name: string; profile_image_url?: string | null }; subtext?: string }> = ({ user, subtext }) => (
  <div className="flex items-center gap-3 p-2 hover:bg-zinc-50 rounded-lg transition-colors">
    <div className="w-10 h-10 bg-zinc-100 rounded-full flex items-center justify-center text-zinc-500 flex-shrink-0 overflow-hidden">
      {user?.profile_image_url ? (
        <img src={user.profile_image_url} alt={user.name} className="w-full h-full object-cover" />
      ) : (
        <User size={20} />
      )}
    </div>
    <div>
      <p className="font-medium text-sm text-zinc-900">{user?.name || 'Usuário Desconhecido'}</p>
      {subtext && <p className="text-xs text-zinc-500">{subtext}</p>}
    </div>
  </div>
);

export const PostsPage: React.FC = () => {
  const { token, user: currentUser } = useAuth();
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
  
  // Edit/Delete state
  const [activeMenuPostId, setActiveMenuPostId] = useState<number | null>(null);
  const [editPostModal, setEditPostModal] = useState<Post | null>(null);
  const [editContent, setEditContent] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState<number | null>(null);
  
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
    alert('Link copiado para a área de transferência!');
    setShareModalPost(null);
  };

  const handleDeletePost = async (post: Post) => {
    if (!token || !window.confirm('Tem certeza que deseja excluir este post?')) return;
    
    setIsDeleting(post.id);
    try {
      await api.deletePost(token, post.id);
      setPosts(prev => prev.filter(p => p.id !== post.id));
      setActiveMenuPostId(null);
    } catch (err: any) {
      console.error('Error deleting post:', err);
      alert(err.message || 'Erro ao excluir post');
    } finally {
      setIsDeleting(null);
    }
  };

  const handleUpdatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !editPostModal) return;

    setIsUpdating(true);
    try {
      await api.updatePost(token, editPostModal.id, { content: editContent });
      setPosts(prev => prev.map(p => p.id === editPostModal.id ? { ...p, content: editContent } : p));
      setEditPostModal(null);
      setEditContent('');
      alert('Post atualizado com sucesso!');
    } catch (err: any) {
      console.error('Error updating post:', err);
      alert(err.message || 'Erro ao atualizar post');
    } finally {
      setIsUpdating(false);
    }
  };

  const openEditModal = (post: Post) => {
    setEditPostModal(post);
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
      <div className="p-4 md:p-8 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-zinc-900">Posts</h1>
            <p className="text-zinc-500">Gerencie e visualize as publicações dos usuários.</p>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={() => fetchPosts(currentPage, searchTerm)}
              className="bg-white border border-zinc-200 p-2 rounded-xl text-zinc-600 hover:bg-zinc-50 transition-all"
              title="Atualizar"
            >
              <RefreshCw size={20} className={loading ? "animate-spin" : ""} />
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-zinc-100 flex flex-col md:flex-row gap-4 items-center">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-zinc-400" size={20} />
            <input 
              type="text" 
              placeholder="Buscar por conteúdo..." 
              className="w-full pl-10 pr-4 py-2 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
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
          <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl text-center">
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
                  className="bg-white rounded-xl border border-zinc-200 shadow-sm overflow-hidden flex flex-col"
                >
                  {/* Header */}
                  <div className="p-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-gradient-to-tr from-emerald-400 via-green-500 to-teal-600 p-[2px] rounded-full flex-shrink-0">
                        <div className="w-full h-full bg-white rounded-full p-[2px]">
                          {post.user?.profile_image_url ? (
                            <img src={post.user.profile_image_url} alt={post.user.name} className="w-full h-full rounded-full object-cover" />
                          ) : (
                            <div className="w-full h-full bg-zinc-100 rounded-full flex items-center justify-center text-zinc-400">
                              <User size={14} />
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-semibold text-sm text-zinc-900 leading-none truncate">{post.user?.name || 'Usuário'}</h3>
                        <p className="text-xs text-zinc-500 mt-0.5 truncate">
                          {new Date(post.created_at).toLocaleDateString()}
                          {post.earns_coins && <span className="ml-2 text-amber-600 font-medium">• Ganha Moedas</span>}
                        </p>
                      </div>
                    </div>
                    <div className="relative">
                      <button 
                        onClick={() => setActiveMenuPostId(activeMenuPostId === post.id ? null : post.id)}
                        className="text-zinc-400 hover:text-zinc-600 flex-shrink-0 p-1 rounded-full hover:bg-zinc-100 transition-colors"
                      >
                        <MoreHorizontal size={20} />
                      </button>
                      
                      {activeMenuPostId === post.id && (
                        <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-xl shadow-lg border border-zinc-100 py-1 z-10 overflow-hidden">
                          {(() => {
                            const isOwner = String(post.user_id) === String(currentUser?.id) || String(post.user?.id) === String(currentUser?.id);
                            const isAdmin = currentUser?.user_type_id === 1;
                            
                            const canEdit = isAdmin || isOwner;
                            const canDelete = isAdmin || isOwner;

                            if (!canEdit && !canDelete) {
                              return (
                                <div className="px-4 py-2 text-xs text-zinc-400 text-center">
                                  Sem ações disponíveis
                                </div>
                              );
                            }

                            return (
                              <>
                                {canEdit && (
                                  <button 
                                    onClick={() => openEditModal(post)}
                                    className="w-full text-left px-4 py-2 text-sm text-zinc-700 hover:bg-zinc-50 flex items-center gap-2"
                                  >
                                    <Edit size={16} />
                                    Editar
                                  </button>
                                )}
                                {canDelete && (
                                  <button 
                                    onClick={() => handleDeletePost(post)}
                                    className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
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
                    <div className="w-full bg-zinc-50 border-y border-zinc-100 aspect-square flex items-center justify-center overflow-hidden">
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
                        <div className="text-sm text-zinc-900 line-clamp-3 group-hover:text-zinc-700 transition-colors">
                          {post.content}
                        </div>
                        {post.content.length > 150 && (
                          <span className="text-xs text-zinc-400 mt-1 block group-hover:underline">Ver mais...</span>
                        )}
                      </button>
                    </div>

                    {/* Actions (Likes & Comments) */}
                    <div className="flex items-center gap-4 mt-auto pt-2 border-t border-zinc-50">
                      <button 
                        onClick={() => setLikesModalPost(post)}
                        className="flex items-center gap-1.5 text-zinc-500 hover:text-red-500 transition-colors group"
                        title="Curtidas"
                      >
                        <Heart size={18} className="group-hover:scale-110 transition-transform" />
                        <span className="text-xs font-medium">{post.likes_count || 0}</span>
                      </button>
                      
                      <button 
                        onClick={() => setCommentsModalPost(post)}
                        className="flex items-center gap-1.5 text-zinc-500 hover:text-emerald-600 transition-colors group"
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
              <div className="text-center py-12 bg-white rounded-2xl border border-dashed border-zinc-200">
                <MessageSquare className="w-12 h-12 text-zinc-300 mx-auto mb-3" />
                <h3 className="text-lg font-medium text-zinc-900">Nenhum post encontrado</h3>
                <p className="text-zinc-500">Tente ajustar seus filtros de busca.</p>
              </div>
            )}

            {/* Pagination Controls */}
            {totalItems > 0 && (
              <div className="flex items-center justify-between bg-white p-4 rounded-2xl border border-zinc-100">
                <div className="text-sm text-zinc-500">
                  Mostrando <span className="font-medium">{fromItem}</span> até <span className="font-medium">{toItem}</span> de <span className="font-medium">{totalItems}</span> resultados
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className="p-2 border border-zinc-200 rounded-lg hover:bg-zinc-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft size={20} />
                  </button>
                  <span className="text-sm font-medium px-2">
                    Página {currentPage} de {totalPages}
                  </span>
                  <button
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    className="p-2 border border-zinc-200 rounded-lg hover:bg-zinc-50 disabled:opacity-50 disabled:cursor-not-allowed"
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
                className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden flex flex-col max-h-[80vh]"
              >
                <div className="p-4 border-b border-zinc-100 flex justify-between items-center bg-zinc-50/50">
                  <h2 className="text-lg font-bold text-zinc-900">Curtidas</h2>
                  <button onClick={() => setLikesModalPost(null)} className="text-zinc-400 hover:text-zinc-600 transition-colors">
                    <X size={24} />
                  </button>
                </div>
                <div className="p-4 overflow-y-auto flex-1">
                  {loadingUsers ? (
                    <div className="flex justify-center py-8">
                      <Loader2 className="w-6 h-6 text-zinc-400 animate-spin" />
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
                    <div className="text-center py-8 text-zinc-500">
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
                className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden flex flex-col max-h-[80vh]"
              >
                <div className="p-4 border-b border-zinc-100 flex justify-between items-center bg-zinc-50/50">
                  <h2 className="text-lg font-bold text-zinc-900">Comentários</h2>
                  <button onClick={() => setCommentsModalPost(null)} className="text-zinc-400 hover:text-zinc-600 transition-colors">
                    <X size={24} />
                  </button>
                </div>
                <div className="p-4 overflow-y-auto flex-1">
                  {loadingUsers ? (
                    <div className="flex justify-center py-8">
                      <Loader2 className="w-6 h-6 text-zinc-400 animate-spin" />
                    </div>
                  ) : commentsModalPost.comments && commentsModalPost.comments.length > 0 ? (
                    <div className="space-y-4">
                      {commentsModalPost.comments.map((comment) => {
                        const user = usersCache[comment.user_id] || comment.user;
                        return (
                          <div key={comment.id} className="flex gap-3">
                            <div className="w-8 h-8 bg-zinc-100 rounded-full flex items-center justify-center text-zinc-500 flex-shrink-0 overflow-hidden mt-1">
                              {user?.profile_image_url ? (
                                <img src={user.profile_image_url} alt={user.name} className="w-full h-full object-cover" />
                              ) : (
                                <User size={16} />
                              )}
                            </div>
                            <div className="flex-1">
                              <div className="bg-zinc-50 p-3 rounded-2xl rounded-tl-none">
                                <p className="text-sm font-semibold text-zinc-900 mb-1">{user?.name || 'Usuário Desconhecido'}</p>
                                <p className="text-sm text-zinc-700">{comment.text}</p>
                              </div>
                              <p className="text-xs text-zinc-400 mt-1 ml-2">
                                {new Date(comment.created_at).toLocaleDateString()} às {new Date(comment.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-zinc-500">
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
                className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden"
              >
                <div className="p-4 border-b border-zinc-100 flex justify-between items-center bg-zinc-50/50">
                  <h2 className="text-lg font-bold text-zinc-900">Compartilhar</h2>
                  <button onClick={() => setShareModalPost(null)} className="text-zinc-400 hover:text-zinc-600 transition-colors">
                    <X size={24} />
                  </button>
                </div>
                <div className="p-6 grid grid-cols-2 gap-4">
                  <a 
                    href={`https://wa.me/?text=${encodeURIComponent(`Confira este post de ${shareModalPost.user?.name}: ${shareModalPost.content} ${window.location.href}`)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex flex-col items-center justify-center gap-2 p-4 rounded-xl bg-green-50 text-green-700 hover:bg-green-100 transition-colors"
                  >
                    <Share2 size={24} />
                    <span className="text-sm font-medium">WhatsApp</span>
                  </a>
                  <button 
                    onClick={() => copyToClipboard(window.location.href)}
                    className="flex flex-col items-center justify-center gap-2 p-4 rounded-xl bg-zinc-50 text-zinc-700 hover:bg-zinc-100 transition-colors"
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
                className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[80vh]"
              >
                <div className="p-4 border-b border-zinc-100 flex justify-between items-center bg-zinc-50/50">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-zinc-100 rounded-full flex items-center justify-center text-zinc-500 overflow-hidden">
                       {contentModalPost.user?.profile_image_url ? (
                        <img src={contentModalPost.user.profile_image_url} alt={contentModalPost.user.name} className="w-full h-full object-cover" />
                      ) : (
                        <User size={16} />
                      )}
                    </div>
                    <span className="font-semibold text-sm text-zinc-900">{contentModalPost.user?.name}</span>
                  </div>
                  <button onClick={() => setContentModalPost(null)} className="text-zinc-400 hover:text-zinc-600 transition-colors">
                    <X size={24} />
                  </button>
                </div>
                <div className="p-6 overflow-y-auto">
                  <p className="text-zinc-900 whitespace-pre-wrap leading-relaxed text-sm md:text-base">
                    {contentModalPost.content}
                  </p>
                  <div className="mt-6 pt-4 border-t border-zinc-100 flex justify-between items-center text-xs text-zinc-400">
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
                className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden"
              >
                <div className="p-4 border-b border-zinc-100 flex justify-between items-center bg-zinc-50/50">
                  <h2 className="text-lg font-bold text-zinc-900">Editar Post</h2>
                  <button onClick={() => setEditPostModal(null)} className="text-zinc-400 hover:text-zinc-600 transition-colors">
                    <X size={24} />
                  </button>
                </div>
                
                <form onSubmit={handleUpdatePost} className="p-6 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 mb-1">
                      Conteúdo
                    </label>
                    <textarea
                      required
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      className="w-full p-3 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent min-h-[150px] resize-none"
                      placeholder="O que você está pensando?"
                    />
                  </div>

                  <div className="pt-2 flex gap-3">
                    <button
                      type="button"
                      onClick={() => setEditPostModal(null)}
                      className="flex-1 px-4 py-2 border border-zinc-200 text-zinc-700 rounded-xl hover:bg-zinc-50 transition-colors font-medium"
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
    </Layout>
  );
};
