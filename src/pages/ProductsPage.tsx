import React, { useState, useEffect, useCallback } from 'react';
import { Layout } from '../components/Layout';
import {
  Search,
  Loader2,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Package,
  Hash,
  Factory,
  Tag,
  Plus,
} from 'lucide-react';
import { motion } from 'motion/react';
import { useAuth } from '../context/AuthContext';
import { Product } from '../types';
import { api } from '../services/api';
import { useToast } from '../context/ToastContext';

// ─── Debounce hook (same pattern as TeamPage) ────────────────────────────────
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
}

// ─── Page Component ───────────────────────────────────────────────────────────
export const ProductsPage: React.FC = () => {
  const { token } = useAuth();
  const { addToast } = useToast();

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Search / filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'name' | 'barcode'>('name');
  const debouncedSearchTerm = useDebounce(searchTerm, 500);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [fromItem, setFromItem] = useState(0);
  const [toItem, setToItem] = useState(0);

  // ─── Fetch ──────────────────────────────────────────────────────────────────
  const fetchProducts = useCallback(
    async (page = 1, search = '', type: 'name' | 'barcode' = 'name') => {
      if (!token) return;
      setLoading(true);
      setError(null);
      try {
        const data = await api.getProductsPaginated(token, page, search, type);
        setProducts(data.data);
        setCurrentPage(data.meta?.current_page ?? data.current_page ?? 1);
        setTotalPages(data.meta?.last_page ?? data.last_page ?? 1);
        setTotalItems(data.meta?.total ?? data.total ?? 0);
        setFromItem(data.meta?.from ?? data.from ?? 0);
        setToItem(data.meta?.to ?? data.to ?? 0);
      } catch (err: any) {
        console.error('Error fetching products:', err);
        setError(err.message || 'Não foi possível carregar os produtos.');
        addToast('error', err.message || 'Não foi possível carregar os produtos.');
      } finally {
        setLoading(false);
      }
    },
    [token]
  );

  // Trigger fetch on page / search / filterType change
  useEffect(() => {
    fetchProducts(currentPage, debouncedSearchTerm, filterType);
  }, [fetchProducts, currentPage, debouncedSearchTerm, filterType]);

  // Reset to page 1 whenever search term or filter type changes
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearchTerm, filterType]);

  // ─── Handlers ───────────────────────────────────────────────────────────────
  const handleFilterTypeChange = (newType: 'name' | 'barcode') => {
    setFilterType(newType);
    setSearchTerm('');
  };

  // ─── Render ─────────────────────────────────────────────────────────────────
  return (
    <Layout>
      <div className="p-4 md:p-8 space-y-6">

        {/* ── Header ─────────────────────────────────────────────────────────── */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">Produtos</h1>
            <p className="text-zinc-500 dark:text-zinc-400">
              Gerencie os produtos utilizados nas campanhas.
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => fetchProducts(currentPage, debouncedSearchTerm, filterType)}
              className="bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 p-2 rounded-xl text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-all"
              title="Atualizar conteúdo"
            >
              <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
            </button>
            <button
              className="bg-emerald-600 px-4 py-2 rounded-xl text-sm font-medium text-white hover:bg-emerald-700 shadow-sm transition-all flex items-center gap-2"
            >
              <Plus size={18} />
              Novo Produto
            </button>
          </div>
        </div>

        {/* ── Filters ────────────────────────────────────────────────────────── */}
        <div className="bg-white dark:bg-zinc-900 p-4 rounded-2xl shadow-sm border border-zinc-100 dark:border-zinc-800 flex flex-col md:flex-row gap-3 items-center transition-colors duration-200">
          {/* Search input */}
          <div className="relative flex-1 w-full">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400"
              size={20}
            />
            <input
              type="text"
              placeholder={
                filterType === 'name'
                  ? 'Buscar por nome do produto...'
                  : 'Buscar por código de barras...'
              }
              className="w-full pl-10 pr-4 py-2 border border-zinc-200 dark:border-zinc-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-500"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Filter type selector */}
          <select
            value={filterType}
            onChange={(e) => handleFilterTypeChange(e.target.value as 'name' | 'barcode')}
            className="w-full md:w-52 p-2.5 border border-zinc-200 dark:border-zinc-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white transition-colors duration-200 cursor-pointer"
          >
            <option value="name">Filtrar por Nome</option>
            <option value="barcode">Filtrar por Cód. de Barras</option>
          </select>
        </div>

        {/* ── Content ────────────────────────────────────────────────────────── */}
        {loading && products.length === 0 ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
          </div>
        ) : error ? (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 p-4 rounded-xl text-center">
            {error}
            <button
              onClick={() => fetchProducts(currentPage, debouncedSearchTerm, filterType)}
              className="block mx-auto mt-2 text-sm font-semibold hover:underline"
            >
              Tentar novamente
            </button>
          </div>
        ) : (
          <div className="space-y-4">

            {/* ── Product Cards Grid ─────────────────────────────────────────── */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {products.map((product) => (
                <motion.div
                  key={product.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white dark:bg-zinc-900 p-6 rounded-2xl shadow-sm border border-zinc-100 dark:border-zinc-800 hover:shadow-md transition-all duration-200 flex flex-col"
                >
                  {/* Card header — icon + product name */}
                  <div className="flex items-start gap-3 mb-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-emerald-100 to-teal-100 dark:from-emerald-900/30 dark:to-teal-900/30 rounded-xl flex items-center justify-center text-emerald-600 dark:text-emerald-400 flex-shrink-0 border border-emerald-200 dark:border-emerald-800">
                      <Package size={22} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3
                        className="font-bold text-zinc-900 dark:text-white line-clamp-2 leading-snug"
                        title={product.name}
                      >
                        {product.name}
                      </h3>
                    </div>
                  </div>

                  {/* Card details */}
                  <div className="space-y-2.5 flex-1">

                    {/* Barcode */}
                    <div className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
                      <Hash size={15} className="text-zinc-400 flex-shrink-0" />
                      <span
                        className="font-mono text-xs bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded-md border border-zinc-200 dark:border-zinc-700 truncate"
                        title={product.barcode || '—'}
                      >
                        {product.barcode || '—'}
                      </span>
                    </div>

                    {/* Manufacturer */}
                    <div className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
                      <Factory size={15} className="text-zinc-400 flex-shrink-0" />
                      <span
                        className="truncate"
                        title={product.manufacturer?.name ?? '—'}
                      >
                        {product.manufacturer?.name ?? '—'}
                      </span>
                    </div>

                    {/* Group */}
                    <div className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
                      <Tag size={15} className="text-zinc-400 flex-shrink-0" />
                      <span
                        className="truncate"
                        title={product.group?.name ?? '—'}
                      >
                        {product.group?.name ?? '—'}
                      </span>
                    </div>

                  </div>
                </motion.div>
              ))}
            </div>

            {/* ── Empty State ───────────────────────────────────────────────── */}
            {products.length === 0 && (
              <div className="text-center py-12 bg-white dark:bg-zinc-900 rounded-2xl border border-dashed border-zinc-200 dark:border-zinc-800 transition-colors duration-200">
                <Package className="w-12 h-12 text-zinc-300 dark:text-zinc-600 mx-auto mb-3" />
                <h3 className="text-lg font-medium text-zinc-900 dark:text-white">
                  Nenhum produto encontrado
                </h3>
                <p className="text-zinc-500 dark:text-zinc-400">
                  Tente ajustar os filtros de busca.
                </p>
              </div>
            )}

            {/* ── Pagination ────────────────────────────────────────────────── */}
            {totalItems > 0 && (
              <div className="flex flex-col sm:flex-row items-center justify-between bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-zinc-100 dark:border-zinc-800 gap-3 transition-colors duration-200">
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                  Mostrando{' '}
                  <span className="font-medium text-zinc-700 dark:text-zinc-300">{fromItem}</span>
                  {' '}até{' '}
                  <span className="font-medium text-zinc-700 dark:text-zinc-300">{toItem}</span>
                  {' '}de{' '}
                  <span className="font-medium text-zinc-700 dark:text-zinc-300">{totalItems}</span>
                  {' '}resultados
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className="p-2 border border-zinc-200 dark:border-zinc-700 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed text-zinc-600 dark:text-zinc-400 transition-colors"
                  >
                    <ChevronLeft size={20} />
                  </button>
                  <span className="text-sm font-medium px-2 text-zinc-700 dark:text-zinc-300 whitespace-nowrap">
                    Página {currentPage} de {totalPages}
                  </span>
                  <button
                    onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    className="p-2 border border-zinc-200 dark:border-zinc-700 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed text-zinc-600 dark:text-zinc-400 transition-colors"
                  >
                    <ChevronRight size={20} />
                  </button>
                </div>
              </div>
            )}

          </div>
        )}

      </div>
    </Layout>
  );
};

