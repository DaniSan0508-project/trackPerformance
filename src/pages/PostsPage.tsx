import React, { useState, useEffect, useCallback } from 'react';
import { Layout } from '../components/Layout';
import { Search, Loader2, RefreshCw, ChevronLeft, ChevronRight, MessageSquare, Heart, Share2, Bookmark, MoreHorizontal, User } from 'lucide-react';
import { motion } from 'motion/react';
import { useAuth } from '../context/AuthContext';
import { Post } from '../types';
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

export const PostsPage: React.FC = () => {
  const { token } = useAuth();
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
    } catch (err: any) {
      console.error('Error fetching posts:', err);
      setError(err.message || 'Não foi possível carregar os posts.');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchPosts(currentPage, debouncedSearchTerm);
  }, [fetchPosts, currentPage, debouncedSearchTerm]);

  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearchTerm]);

  return (
    <Layout>
      <div className="p-4 md:p-8 space-y-6 max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-zinc-900">Feed</h1>
          <button 
            onClick={() => fetchPosts(currentPage, searchTerm)}
            className="bg-white border border-zinc-200 p-2 rounded-full text-zinc-600 hover:bg-zinc-50 transition-all shadow-sm"
            title="Atualizar"
          >
            <RefreshCw size={20} className={loading ? "animate-spin" : ""} />
          </button>
        </div>

        {/* Search Bar */}
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-zinc-400" size={20} />
          <input 
            type="text" 
            placeholder="Buscar posts..." 
            className="w-full pl-10 pr-4 py-2.5 bg-zinc-100 border-none rounded-xl focus:ring-2 focus:ring-zinc-200 focus:bg-white transition-all"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Posts List */}
        {loading && posts.length === 0 ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 text-zinc-400 animate-spin" />
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
            {posts.map((post) => (
              <motion.div 
                key={post.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-xl border border-zinc-200 shadow-sm overflow-hidden"
              >
                {/* Header */}
                <div className="p-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-gradient-to-tr from-yellow-400 via-red-500 to-purple-500 p-[2px] rounded-full">
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
                    <div>
                      <h3 className="font-semibold text-sm text-zinc-900 leading-none">{post.user?.name || 'Usuário'}</h3>
                      <p className="text-xs text-zinc-500 mt-0.5">
                        {new Date(post.created_at).toLocaleDateString()}
                        {post.earns_coins && <span className="ml-2 text-amber-600 font-medium">• Ganha Moedas</span>}
                      </p>
                    </div>
                  </div>
                  <button className="text-zinc-400 hover:text-zinc-600">
                    <MoreHorizontal size={20} />
                  </button>
                </div>

                {/* Image */}
                {post.image_full_url && (
                  <div className="w-full bg-zinc-50 border-y border-zinc-100">
                    <img 
                      src={post.image_full_url} 
                      alt="Post content" 
                      className="w-full h-auto max-h-[600px] object-contain"
                      loading="lazy"
                    />
                  </div>
                )}

                {/* Actions */}
                <div className="p-3 pb-2">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-4">
                      <button className="text-zinc-800 hover:text-red-500 transition-colors">
                        <Heart size={24} />
                      </button>
                      <button className="text-zinc-800 hover:text-zinc-600 transition-colors">
                        <MessageSquare size={24} />
                      </button>
                      <button className="text-zinc-800 hover:text-zinc-600 transition-colors">
                        <Share2 size={24} />
                      </button>
                    </div>
                    <button className="text-zinc-800 hover:text-zinc-600 transition-colors">
                      <Bookmark size={24} />
                    </button>
                  </div>

                  {/* Content */}
                  <div className="space-y-1">
                    <p className="text-sm text-zinc-900">
                      <span className="font-semibold mr-2">{post.user?.name}</span>
                      {post.content}
                    </p>
                  </div>
                </div>
              </motion.div>
            ))}

            {posts.length === 0 && (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-zinc-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <MessageSquare className="w-8 h-8 text-zinc-300" />
                </div>
                <h3 className="text-lg font-medium text-zinc-900">Nenhum post ainda</h3>
                <p className="text-zinc-500">Quando houver publicações, elas aparecerão aqui.</p>
              </div>
            )}

            {/* Pagination Controls */}
            {totalItems > 0 && (
              <div className="flex items-center justify-between pt-4 border-t border-zinc-200">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="flex items-center gap-1 px-3 py-2 text-sm font-medium text-zinc-600 hover:text-zinc-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft size={16} />
                  Anterior
                </button>
                <span className="text-sm text-zinc-500">
                  Página {currentPage} de {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="flex items-center gap-1 px-3 py-2 text-sm font-medium text-zinc-600 hover:text-zinc-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Próxima
                  <ChevronRight size={16} />
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
};
