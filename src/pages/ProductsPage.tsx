import React, { useState, useEffect, useCallback } from 'react';
import {
  Search, Loader2, RefreshCw, ChevronLeft, ChevronRight,
  Package, Hash, Factory, Tag, Plus, X, Save, Settings,
  Building2, Edit2, Trash2,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../context/AuthContext';
import { Product, Manufacturer, ProductGroup } from '../types';
import { productsService, manufacturersService } from '../services';
import { useToast } from '../context/ToastContext';
import { productSchema } from '../validators/schemas';
import { ConfirmModal } from '../components/ConfirmModal';

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

  // ── List state ──────────────────────────────────────────────────────────────
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Search / filter
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'name' | 'barcode'>('name');
  const debouncedSearchTerm = useDebounce(searchTerm, 500);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [fromItem, setFromItem] = useState(0);
  const [toItem, setToItem] = useState(0);

    // ── Modal state ─────────────────────────────────────────────────────────────
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingProduct, setEditingProduct] = useState<Product | null>(null);
    const [isManagingManufacturers, setIsManagingManufacturers] = useState(false);
    const [isManagingProductGroups, setIsManagingProductGroups] = useState(false);
    const [saving, setSaving] = useState(false);
    const [deletingBarcode, setDeletingBarcode] = useState<string | null>(null);
    const [formErrors, setFormErrors] = useState<{ [key: string]: string }>({});
    const [formData, setFormData] = useState({
    name: '',
    barcode: '',
    manufacturer_id: '' as number | '',
    product_group_id: '' as number | '',
    });

  // ── Dropdown data ───────────────────────────────────────────────────────────
  const [manufacturers, setManufacturers] = useState<Manufacturer[]>([]);
  const [productGroups, setProductGroups] = useState<ProductGroup[]>([]);
  const [loadingManufacturers, setLoadingManufacturers] = useState(false);
  const [loadingGroups, setLoadingGroups] = useState(false);

  // ── Manufacturer management panel state ─────────────────────────────────────
  const [mfrPagedList, setMfrPagedList] = useState<Manufacturer[]>([]);
  const [mfrPage, setMfrPage] = useState(1);
  const [mfrTotalPages, setMfrTotalPages] = useState(1);
  const [mfrTotalItems, setMfrTotalItems] = useState(0);
  const [mfrSearch, setMfrSearch] = useState('');
  const debouncedMfrSearch = useDebounce(mfrSearch, 400);
  const [mfrLoading, setMfrLoading] = useState(false);
  const [newMfrName, setNewMfrName] = useState('');
  const [mfrSaving, setMfrSaving] = useState(false);
  const [mfrError, setMfrError] = useState<string | null>(null);
  // Inline edit state for manufacturers
  const [editingMfrId, setEditingMfrId] = useState<number | null>(null);
  const [editingMfrName, setEditingMfrName] = useState('');
  const [mfrEditSaving, setMfrEditSaving] = useState(false);
  const [deletingMfrId, setDeletingMfrId] = useState<number | null>(null);

  // ── Product-group management panel state ─────────────────────────────────────
  const [pgPagedList, setPgPagedList] = useState<ProductGroup[]>([]);
  const [pgPage, setPgPage] = useState(1);
  const [pgTotalPages, setPgTotalPages] = useState(1);
  const [pgTotalItems, setPgTotalItems] = useState(0);
  const [pgSearch, setPgSearch] = useState('');
  const debouncedPgSearch = useDebounce(pgSearch, 400);
  const [pgLoading, setPgLoading] = useState(false);
  const [newPgName, setNewPgName] = useState('');
  const [pgSaving, setPgSaving] = useState(false);
  const [pgError, setPgError] = useState<string | null>(null);
  const [editingPgId, setEditingPgId] = useState<number | null>(null);
  const [editingPgName, setEditingPgName] = useState('');
  const [pgEditSaving, setPgEditSaving] = useState(false);
  const [deletingPgId, setDeletingPgId] = useState<number | null>(null);

  // ── Confirm modal state (shared) ─────────────────────────────────────────────
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => Promise<void>;
    isLoading: boolean;
  }>({ isOpen: false, title: '', message: '', onConfirm: async () => {}, isLoading: false });

  // ─── Fetch products ──────────────────────────────────────────────────────────
  const fetchProducts = useCallback(
    async (page = 1, search = '', type: 'name' | 'barcode' = 'name') => {
      if (!token) return;
      setLoading(true);
      setError(null);
      try {
        const data = await productsService.getProductsPaginated(token, page, search, type);
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

  // ─── Fetch manufacturers ─────────────────────────────────────────────────────
  const fetchManufacturers = useCallback(async () => {
    if (!token) return;
    setLoadingManufacturers(true);
    try {
      const data = await manufacturersService.getAllManufacturers(token);
      setManufacturers(data);
    } catch (err) {
      console.error('Error fetching manufacturers:', err);
    } finally {
      setLoadingManufacturers(false);
    }
  }, [token]);

  // ─── Fetch product groups ────────────────────────────────────────────────────
  const fetchProductGroups = useCallback(async () => {
    if (!token) return;
    setLoadingGroups(true);
    try {
      const data = await productsService.getAllProductGroups(token);
      setProductGroups(data);
    } catch (err) {
      console.error('Error fetching product groups:', err);
    } finally {
      setLoadingGroups(false);
    }
  }, [token]);

  // ─── Fetch paginated manufacturers (manage panel) ─────────────────────────
  const fetchManufacturersPaged = useCallback(
    async (page = 1, search = '') => {
      if (!token) return;
      setMfrLoading(true);
      try {
        const data = await manufacturersService.getManufacturersPaginated(token, page, search);
        setMfrPagedList(data.data ?? []);
        setMfrPage(data.current_page ?? 1);
        setMfrTotalPages(data.last_page ?? 1);
        setMfrTotalItems(data.total ?? 0);
      } catch (err: any) {
        console.error('Error fetching manufacturers paged:', err);
      } finally {
        setMfrLoading(false);
      }
    },
    [token]
  );

  // ─── Fetch paginated product groups (manage panel) ────────────────────────
  const fetchProductGroupsPaged = useCallback(
    async (page = 1, search = '') => {
      if (!token) return;
      setPgLoading(true);
      try {
        const data = await productsService.getProductGroupsPaginated(token, page, search);
        setPgPagedList(data.data ?? []);
        setPgPage(data.current_page ?? 1);
        setPgTotalPages(data.last_page ?? 1);
        setPgTotalItems(data.total ?? 0);
      } catch (err: any) {
        console.error('Error fetching product groups paged:', err);
      } finally {
        setPgLoading(false);
      }
    },
    [token]
  );

  // Trigger paged fetch when panel is open and search/page changes
  useEffect(() => {
    if (isManagingManufacturers) {
      fetchManufacturersPaged(mfrPage, debouncedMfrSearch);
    }
  }, [isManagingManufacturers, mfrPage, debouncedMfrSearch, fetchManufacturersPaged]);

  // Reset to page 1 when search changes in the mfr panel
  useEffect(() => {
    setMfrPage(1);
  }, [debouncedMfrSearch]);

  // Trigger paged fetch when product-group panel is open
  useEffect(() => {
    if (isManagingProductGroups) {
      fetchProductGroupsPaged(pgPage, debouncedPgSearch);
    }
  }, [isManagingProductGroups, pgPage, debouncedPgSearch, fetchProductGroupsPaged]);

  // Reset to page 1 when search changes in pg panel
  useEffect(() => {
    setPgPage(1);
  }, [debouncedPgSearch]);

  // ─── Add manufacturer ────────────────────────────────────────────────────────
  const handleAddManufacturer = async () => {
    const trimmed = newMfrName.trim();
    if (!trimmed) {
      setMfrError('Nome do fabricante é obrigatório.');
      return;
    }
    if (!token) return;
    setMfrError(null);
    setMfrSaving(true);
    try {
      await manufacturersService.createManufacturer(token, { name: trimmed });
      setNewMfrName('');
      addToast('success', 'Fabricante cadastrado com sucesso!');
      // Refresh both the panel list and the dropdown
      await Promise.all([
        fetchManufacturersPaged(1, debouncedMfrSearch),
        fetchManufacturers(),
      ]);
      setMfrPage(1);
    } catch (err: any) {
      console.error('Error creating manufacturer:', err);
      const msg =
        err.response?.data?.errors?.name?.[0] ||
        err.response?.data?.message ||
        err.message ||
        'Erro ao cadastrar fabricante.';
      setMfrError(msg);
      addToast('error', msg);
    } finally {
      setMfrSaving(false);
    }
  };

  // ─── Add product group ───────────────────────────────────────────────────────
  const handleAddProductGroup = async () => {
    const trimmed = newPgName.trim();
    if (!trimmed) {
      setPgError('Nome do grupo é obrigatório.');
      return;
    }
    if (!token) return;
    setPgError(null);
    setPgSaving(true);
    try {
      await productsService.createProductGroup(token, { name: trimmed });
      setNewPgName('');
      addToast('success', 'Grupo cadastrado com sucesso!');
      // Refresh both the panel list and the dropdown
      await Promise.all([
        fetchProductGroupsPaged(1, debouncedPgSearch),
        fetchProductGroups(),
      ]);
      setPgPage(1);
    } catch (err: any) {
      console.error('Error creating product group:', err);
      const msg =
        err.response?.data?.errors?.name?.[0] ||
        err.response?.data?.message ||
        err.message ||
        'Erro ao cadastrar grupo.';
      setPgError(msg);
      addToast('error', msg);
    } finally {
      setPgSaving(false);
    }
  };

  // ─── Edit product group ──────────────────────────────────────────────────────
  const handleSaveEditProductGroup = async (id: number) => {
    const trimmed = editingPgName.trim();
    if (!trimmed) return;
    if (!token) return;
    setPgEditSaving(true);
    try {
      await productsService.updateProductGroup(token, id, { name: trimmed });
      addToast('success', 'Grupo atualizado com sucesso!');
      setEditingPgId(null);
      setEditingPgName('');
      await Promise.all([
        fetchProductGroupsPaged(pgPage, debouncedPgSearch),
        fetchProductGroups(),
      ]);
    } catch (err: any) {
      console.error('Error updating product group:', err);
      addToast('error', err.message || 'Erro ao atualizar grupo.');
    } finally {
      setPgEditSaving(false);
    }
  };

  // ─── Edit manufacturer ───────────────────────────────────────────────────────
  const handleSaveEditManufacturer = async (id: number) => {
    const trimmed = editingMfrName.trim();
    if (!trimmed) return;
    if (!token) return;
    setMfrEditSaving(true);
    try {
      await manufacturersService.updateManufacturer(token, id, { name: trimmed });
      addToast('success', 'Fabricante atualizado com sucesso!');
      setEditingMfrId(null);
      setEditingMfrName('');
      await Promise.all([
        fetchManufacturersPaged(mfrPage, debouncedMfrSearch),
        fetchManufacturers(),
      ]);
    } catch (err: any) {
      console.error('Error updating manufacturer:', err);
      addToast('error', err.message || 'Erro ao atualizar fabricante.');
    } finally {
      setMfrEditSaving(false);
    }
  };

  // ─── Delete product group ────────────────────────────────────────────────────
  const handleDeleteProductGroup = async (id: number) => {
    if (!token) return;
    setDeletingPgId(id);
    try {
      await productsService.deleteProductGroup(token, id);
      addToast('success', 'Grupo excluído com sucesso!');
      await Promise.all([
        fetchProductGroupsPaged(pgPage, debouncedPgSearch),
        fetchProductGroups(),
      ]);
    } catch (err: any) {
      console.error('Error deleting product group:', err);
      addToast('error', err.message || 'Erro ao excluir grupo.');
    } finally {
      setDeletingPgId(null);
    }
  };

  // ─── Delete manufacturer (with confirm) ──────────────────────────────────────
  const handleConfirmDeleteManufacturer = (manufacturer: Manufacturer) => {
    setConfirmModal({
      isOpen: true,
      title: 'Excluir Fabricante',
      message: `Tem certeza que deseja excluir o fabricante "${manufacturer.name}"? Esta ação não pode ser desfeita.`,
      isLoading: false,
      onConfirm: async () => {
        if (!token) return;
        setDeletingMfrId(manufacturer.id);
        try {
          await manufacturersService.deleteManufacturer(token, manufacturer.id);
          addToast('success', 'Fabricante excluído com sucesso!');
          await Promise.all([
            fetchManufacturersPaged(mfrPage, debouncedMfrSearch),
            fetchManufacturers(),
          ]);
        } catch (err: any) {
          console.error('Error deleting manufacturer:', err);
          addToast('error', err.message || 'Erro ao excluir fabricante.');
        } finally {
          setDeletingMfrId(null);
        }
      },
    });
  };

  // ─── Delete product group (with confirm) ─────────────────────────────────────
  const handleConfirmDeleteProductGroup = (group: ProductGroup) => {
    setConfirmModal({
      isOpen: true,
      title: 'Excluir Grupo de Produto',
      message: `Tem certeza que deseja excluir o grupo "${group.name}"? Esta ação não pode ser desfeita.`,
      isLoading: false,
      onConfirm: async () => {
        if (!token) return;
        setDeletingPgId(group.id);
        try {
          await productsService.deleteProductGroup(token, group.id);
          addToast('success', 'Grupo excluído com sucesso!');
          await Promise.all([
            fetchProductGroupsPaged(pgPage, debouncedPgSearch),
            fetchProductGroups(),
          ]);
        } catch (err: any) {
          console.error('Error deleting product group:', err);
          addToast('error', err.message || 'Erro ao excluir grupo.');
        } finally {
          setDeletingPgId(null);
        }
      },
    });
  };

  const handleConfirmModalAction = async () => {
    setConfirmModal(prev => ({ ...prev, isLoading: true }));
    try {
      await confirmModal.onConfirm();
      setConfirmModal(prev => ({ ...prev, isOpen: false, isLoading: false }));
    } catch {
      setConfirmModal(prev => ({ ...prev, isLoading: false }));
    }
  };

  // ─── Fetch products on mount ─────────────────────────────────────────────────
  useEffect(() => {
    fetchProducts(currentPage, debouncedSearchTerm, filterType);
  }, [fetchProducts, currentPage, debouncedSearchTerm, filterType]);

  // Reset to page 1 whenever search term or filter type changes
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearchTerm, filterType]);

  // Load dropdown data only when modal opens
  useEffect(() => {
    if (isModalOpen) {
      fetchManufacturers();
      fetchProductGroups();
    }
  }, [isModalOpen, fetchManufacturers, fetchProductGroups]);

    // ─── Modal Handlers ──────────────────────────────────────────────────────────
    const handleFilterTypeChange = (newType: 'name' | 'barcode') => {
    setFilterType(newType);
    setSearchTerm('');
    };

    const handleOpenModal = (product?: Product) => {
    if (product) {
      setEditingProduct(product);
      setFormData({
        name: product.name,
        barcode: product.barcode || '',
        manufacturer_id: product.manufacturer?.id ?? '',
        product_group_id: product.group?.id ?? '',
      });
    } else {
      setEditingProduct(null);
      setFormData({ name: '', barcode: '', manufacturer_id: '', product_group_id: '' });
    }
    setFormErrors({});
    setIsManagingManufacturers(false);
    setIsManagingProductGroups(false);
    setIsModalOpen(true);
    };

    const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingProduct(null);
    setIsManagingManufacturers(false);
    setIsManagingProductGroups(false);
    setFormData({ name: '', barcode: '', manufacturer_id: '', product_group_id: '' });
    setFormErrors({});
    // reset mfr panel
    setMfrSearch('');
    setMfrPage(1);
    setNewMfrName('');
    setMfrError(null);
    setEditingMfrId(null);
    setEditingMfrName('');
    // reset pg panel
    setPgSearch('');
    setPgPage(1);
    setNewPgName('');
    setPgError(null);
    setEditingPgId(null);
    setEditingPgName('');
    };

    // ─── Submit (create or update) ───────────────────────────────────────────────
    const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setFormErrors({});

    const parsed = {
      name: formData.name,
      barcode: formData.barcode,
      manufacturer_id: formData.manufacturer_id === '' ? undefined : Number(formData.manufacturer_id),
      product_group_id: formData.product_group_id === '' ? null : Number(formData.product_group_id),
    };

    const result = productSchema.safeParse(parsed);
    if (!result.success) {
      const errors = result.error.flatten().fieldErrors;
      const formattedErrors: { [key: string]: string } = {};
      Object.entries(errors).forEach(([key, messages]) => {
        if (messages?.length) formattedErrors[key] = messages[0];
      });
      setFormErrors(formattedErrors);
      addToast('error', 'Verifique os campos obrigatórios.');
      return;
    }

    setSaving(true);
    try {
      if (editingProduct) {
        await productsService.updateProduct(token, editingProduct.barcode!, {
          name: formData.name,
          barcode: formData.barcode,
          manufacturer_id: formData.manufacturer_id === '' ? null : Number(formData.manufacturer_id),
          product_group_id: formData.product_group_id === '' ? null : Number(formData.product_group_id),
        });
        addToast('success', 'Produto atualizado com sucesso!');
      } else {
        await productsService.createProduct(token, {
          name: formData.name,
          barcode: formData.barcode,
          manufacturer_id: formData.manufacturer_id === '' ? null : Number(formData.manufacturer_id),
          product_group_id: formData.product_group_id === '' ? null : Number(formData.product_group_id),
        });
        addToast('success', 'Produto criado com sucesso!');
      }
      await fetchProducts(currentPage, debouncedSearchTerm, filterType);
      handleCloseModal();
    } catch (error: any) {
      console.error('Error saving product:', error);
      if (error.response?.data?.errors) {
        const apiErrors = error.response.data.errors;
        const formattedErrors: { [key: string]: string } = {};
        Object.entries(apiErrors).forEach(([key, messages]: [string, any]) => {
          const msg = Array.isArray(messages) ? messages[0] : messages;
          if (typeof msg === 'string') formattedErrors[key] = msg;
        });
        setFormErrors(formattedErrors);
      }
      addToast('error', error.message || 'Erro ao salvar produto.');
    } finally {
      setSaving(false);
    }
    };

    // ─── Delete product (with confirm) ──────────────────────────────────────────
    const handleDeleteProduct = (product: Product) => {
    setConfirmModal({
      isOpen: true,
      title: 'Excluir Produto',
      message: `Tem certeza que deseja excluir o produto "${product.name}"? Esta ação não pode ser desfeita.`,
      isLoading: false,
      onConfirm: async () => {
        if (!token || !product.barcode) return;
        setDeletingBarcode(product.barcode);
        try {
          await productsService.deleteProduct(token, product.barcode);
          addToast('success', 'Produto excluído com sucesso!');
          await fetchProducts(currentPage, debouncedSearchTerm, filterType);
        } catch (err: any) {
          console.error('Error deleting product:', err);
          addToast('error', err.message || 'Erro ao excluir produto.');
        } finally {
          setDeletingBarcode(null);
        }
      },
    });
    };

  return (
    <div className="p-4 md:p-8 space-y-6">

      {/* Confirm Modal */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
        onConfirm={handleConfirmModalAction}
        title={confirmModal.title}
        message={confirmModal.message}
        isLoading={confirmModal.isLoading}
        confirmText="Excluir"
        type="danger"
      />

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">Produtos</h1>
          <p className="text-zinc-500 dark:text-zinc-400">
            Gerencie os produtos utilizados nas campanhas de vendas.
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
            onClick={() => handleOpenModal()}
            className="bg-primary-600 px-4 py-2 rounded-xl text-sm font-medium text-white hover:bg-primary-700 shadow-sm transition-all flex items-center gap-2"
          >
            <Plus size={18} />
            Novo Produto
          </button>
        </div>
      </div>

      {/* ── Filters ────────────────────────────────────────────────────────── */}
      <div className="bg-white dark:bg-zinc-900 p-4 rounded-2xl shadow-sm border border-zinc-100 dark:border-zinc-800 flex flex-col md:flex-row gap-3 items-center transition-colors duration-200">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={20} />
          <input
            type="text"
            placeholder={
              filterType === 'name'
                ? 'Buscar por nome do produto...'
                : 'Buscar por código de barras...'
            }
            className="w-full pl-10 pr-4 py-2 border border-zinc-200 dark:border-zinc-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-500"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <select
          value={filterType}
          onChange={(e) => handleFilterTypeChange(e.target.value as 'name' | 'barcode')}
          className="w-full md:w-52 p-2.5 border border-zinc-200 dark:border-zinc-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white transition-colors duration-200 cursor-pointer"
        >
          <option value="name">Filtrar por Nome</option>
          <option value="barcode">Filtrar por Cód. de Barras</option>
        </select>
      </div>

      {/* ── Content ────────────────────────────────────────────────────────── */}
      {loading && products.length === 0 ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 text-primary-600 animate-spin" />
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
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className="w-12 h-12 bg-primary-100 dark:bg-primary-900/30 rounded-xl flex items-center justify-center text-primary-600 dark:text-primary-400 flex-shrink-0 border border-primary-200 dark:border-primary-800">
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
                  {/* ── Action buttons ─────────────────────────────────────── */}
                  <div className="flex gap-1 flex-shrink-0 ml-2">
                    <button
                      onClick={() => handleOpenModal(product)}
                      className="p-2 text-zinc-400 hover:text-primary-600 dark:hover:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-lg transition-colors"
                      title="Editar produto"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button
                      onClick={() => handleDeleteProduct(product)}
                      disabled={deletingBarcode === product.barcode}
                      className="p-2 text-zinc-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors disabled:opacity-50"
                      title="Excluir produto"
                    >
                      {deletingBarcode === product.barcode
                        ? <Loader2 size={16} className="animate-spin" />
                        : <Trash2 size={16} />}
                    </button>
                  </div>
                </div>
                <div className="space-y-2.5 flex-1">
                  <div className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
                    <Hash size={15} className="text-zinc-400 flex-shrink-0" />
                    <span
                      className="font-mono text-xs bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded-md border border-zinc-200 dark:border-zinc-700 truncate"
                      title={product.barcode || '—'}
                    >
                      {product.barcode || '—'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
                    <Factory size={15} className="text-zinc-400 flex-shrink-0" />
                    <span className="truncate" title={product.manufacturer?.name ?? '—'}>
                      {product.manufacturer?.name ?? '—'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
                    <Tag size={15} className="text-zinc-400 flex-shrink-0" />
                    <span className="truncate" title={product.group?.name ?? '—'}>
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
              <p className="text-zinc-500 dark:text-zinc-400">Tente ajustar os filtros de busca.</p>
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

      {/* ── Create Product Modal ──────────────────────────────────────────── */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-zinc-900 rounded-2xl shadow-xl w-full max-w-lg overflow-hidden border border-zinc-200 dark:border-zinc-800"
            >
            {/* Modal Header */}
            <div className="p-6 border-b border-zinc-100 dark:border-zinc-800 flex justify-between items-center bg-zinc-50/50 dark:bg-zinc-800/50">
              <div className="flex items-center gap-2">
                {(isManagingManufacturers || isManagingProductGroups) && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsManagingManufacturers(false);
                      setIsManagingProductGroups(false);
                    }}
                    className="mr-1 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors"
                    title="Voltar ao formulário"
                  >
                    <ChevronLeft size={20} />
                  </button>
                )}
                <h2 className="text-xl font-bold text-zinc-900 dark:text-white">
                  {isManagingManufacturers
                    ? 'Fabricantes Cadastrados'
                    : isManagingProductGroups
                    ? 'Grupos de Produtos'
                    : editingProduct
                    ? 'Editar Produto'
                    : 'Novo Produto'}
                </h2>
              </div>
              <button
                type="button"
                onClick={handleCloseModal}
                className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors"
              >
                <X size={24} />
              </button>
            </div>

              {/* ── Manufacturers list panel ──────────────────────────────── */}
              {isManagingManufacturers ? (
                <div className="flex flex-col" style={{ maxHeight: '72vh' }}>

                  {/* ── Inline add form ─────────────────────────────────── */}
                  <div className="px-6 pt-5 pb-4 border-b border-zinc-100 dark:border-zinc-800 space-y-3">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newMfrName}
                        onChange={(e) => { setNewMfrName(e.target.value); setMfrError(null); }}
                        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddManufacturer(); } }}
                        placeholder="Nome do novo fabricante..."
                        className={`flex-1 p-2.5 border rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white placeholder-zinc-400 text-sm ${
                          mfrError ? 'border-red-400 focus:ring-red-400' : 'border-zinc-300 dark:border-zinc-600'
                        }`}
                      />
                      <button
                        type="button"
                        onClick={handleAddManufacturer}
                        disabled={mfrSaving}
                        className="px-3.5 py-2.5 bg-primary-600 hover:bg-primary-700 disabled:opacity-60 text-white rounded-xl transition-colors flex items-center gap-1.5 text-sm font-medium flex-shrink-0"
                        title="Adicionar fabricante"
                      >
                        {mfrSaving
                          ? <Loader2 size={16} className="animate-spin" />
                          : <Plus size={16} />}
                        {mfrSaving ? 'Salvando...' : 'Adicionar'}
                      </button>
                    </div>
                    {mfrError && (
                      <p className="text-xs text-red-600 dark:text-red-400">{mfrError}</p>
                    )}

                    {/* Search */}
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={16} />
                      <input
                        type="text"
                        value={mfrSearch}
                        onChange={(e) => setMfrSearch(e.target.value)}
                        placeholder="Pesquisar fabricante..."
                        className="w-full pl-9 pr-4 py-2 border border-zinc-200 dark:border-zinc-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-500 text-sm"
                      />
                    </div>
                  </div>

                  {/* ── Paginated list (manufacturers) ───────────────────── */}
                  <div className="flex-1 overflow-y-auto px-6 py-4 space-y-2 min-h-0">
                    {mfrLoading ? (
                      <div className="flex justify-center py-8">
                        <Loader2 className="w-6 h-6 text-primary-600 animate-spin" />
                      </div>
                    ) : mfrPagedList.length === 0 ? (
                      <div className="text-center py-8">
                        <Building2 className="w-10 h-10 text-zinc-300 dark:text-zinc-600 mx-auto mb-2" />
                        <p className="text-sm text-zinc-500 dark:text-zinc-400">
                          {mfrSearch ? 'Nenhum fabricante encontrado.' : 'Nenhum fabricante cadastrado.'}
                        </p>
                      </div>
                    ) : (
                      mfrPagedList.map((m) => (
                        <motion.div
                          key={m.id}
                          initial={{ opacity: 0, y: 6 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="flex items-center gap-3 p-3 bg-zinc-50 dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 hover:border-primary-300 dark:hover:border-primary-700 transition-colors"
                        >
                          <div className="w-9 h-9 bg-gradient-to-br from-primary-100 to-primary-200 dark:from-primary-900/30 dark:to-primary-800/30 rounded-lg flex items-center justify-center flex-shrink-0">
                            <Building2 size={15} className="text-primary-600 dark:text-primary-400" />
                          </div>
                          {editingMfrId === m.id ? (
                            /* ── Inline edit ──────────────────────────────── */
                            <div className="flex-1 flex gap-2 items-center">
                              <input
                                type="text"
                                value={editingMfrName}
                                onChange={(e) => setEditingMfrName(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') { e.preventDefault(); handleSaveEditManufacturer(m.id); }
                                  if (e.key === 'Escape') { setEditingMfrId(null); setEditingMfrName(''); }
                                }}
                                autoFocus
                                className="flex-1 p-1.5 text-sm border border-primary-400 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white"
                              />
                              <button
                                type="button"
                                onClick={() => handleSaveEditManufacturer(m.id)}
                                disabled={mfrEditSaving}
                                className="p-1.5 bg-primary-600 hover:bg-primary-700 disabled:opacity-60 text-white rounded-lg transition-colors"
                                title="Salvar"
                              >
                                {mfrEditSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                              </button>
                              <button
                                type="button"
                                onClick={() => { setEditingMfrId(null); setEditingMfrName(''); }}
                                className="p-1.5 border border-zinc-300 dark:border-zinc-600 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-700 text-zinc-500 transition-colors"
                                title="Cancelar"
                              >
                                <X size={14} />
                              </button>
                            </div>
                          ) : (
                            /* ── Display row ──────────────────────────────── */
                            <>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-200 truncate">
                                  {m.name}
                                </p>
                                {m.tax_id && (
                                  <p className="text-xs text-zinc-500 dark:text-zinc-400 font-mono truncate">
                                    {m.tax_id}
                                  </p>
                                )}
                              </div>
                              <div className="flex items-center gap-1 flex-shrink-0">
                                <button
                                  type="button"
                                  onClick={() => { setEditingMfrId(m.id); setEditingMfrName(m.name); }}
                                  className="p-1.5 rounded-lg text-zinc-400 hover:text-primary-600 dark:hover:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-colors"
                                  title="Editar fabricante"
                                >
                                  <Edit2 size={15} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleConfirmDeleteManufacturer(m)}
                                  disabled={deletingMfrId === m.id}
                                  className="p-1.5 rounded-lg text-zinc-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-50 transition-colors"
                                  title="Excluir fabricante"
                                >
                                  {deletingMfrId === m.id
                                    ? <Loader2 size={15} className="animate-spin" />
                                    : <Trash2 size={15} />}
                                </button>
                              </div>
                            </>
                          )}
                        </motion.div>
                      ))
                    )}
                  </div>

                  {/* ── Pagination ───────────────────────────────────────── */}
                  {mfrTotalItems > 0 && (
                    <div className="flex items-center justify-between px-6 py-3 border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/30">
                      <span className="text-xs text-zinc-500 dark:text-zinc-400">
                        {mfrTotalItems} fabricante{mfrTotalItems !== 1 ? 's' : ''}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => setMfrPage((p) => Math.max(p - 1, 1))}
                          disabled={mfrPage === 1 || mfrLoading}
                          className="p-1.5 border border-zinc-200 dark:border-zinc-700 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-700 disabled:opacity-40 disabled:cursor-not-allowed text-zinc-600 dark:text-zinc-400 transition-colors"
                        >
                          <ChevronLeft size={16} />
                        </button>
                        <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300 px-1 whitespace-nowrap">
                          {mfrPage} / {mfrTotalPages}
                        </span>
                        <button
                          onClick={() => setMfrPage((p) => Math.min(p + 1, mfrTotalPages))}
                          disabled={mfrPage === mfrTotalPages || mfrLoading}
                          className="p-1.5 border border-zinc-200 dark:border-zinc-700 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-700 disabled:opacity-40 disabled:cursor-not-allowed text-zinc-600 dark:text-zinc-400 transition-colors"
                        >
                          <ChevronRight size={16} />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : isManagingProductGroups ? (
                /* ── Product-groups management panel ──────────────────────── */
                <div className="flex flex-col" style={{ maxHeight: '72vh' }}>

                  {/* ── Inline add form ──────────────────────────────────── */}
                  <div className="px-6 pt-5 pb-4 border-b border-zinc-100 dark:border-zinc-800 space-y-3">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newPgName}
                        onChange={(e) => { setNewPgName(e.target.value); setPgError(null); }}
                        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddProductGroup(); } }}
                        placeholder="Nome do novo grupo..."
                        className={`flex-1 p-2.5 border rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white placeholder-zinc-400 text-sm ${
                          pgError ? 'border-red-400 focus:ring-red-400' : 'border-zinc-300 dark:border-zinc-600'
                        }`}
                      />
                      <button
                        type="button"
                        onClick={handleAddProductGroup}
                        disabled={pgSaving}
                        className="px-3.5 py-2.5 bg-primary-600 hover:bg-primary-700 disabled:opacity-60 text-white rounded-xl transition-colors flex items-center gap-1.5 text-sm font-medium flex-shrink-0"
                        title="Adicionar grupo"
                      >
                        {pgSaving ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                        {pgSaving ? 'Salvando...' : 'Adicionar'}
                      </button>
                    </div>
                    {pgError && (
                      <p className="text-xs text-red-600 dark:text-red-400">{pgError}</p>
                    )}

                    {/* Search */}
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={16} />
                      <input
                        type="text"
                        value={pgSearch}
                        onChange={(e) => setPgSearch(e.target.value)}
                        placeholder="Pesquisar grupo..."
                        className="w-full pl-9 pr-4 py-2 border border-zinc-200 dark:border-zinc-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-500 text-sm"
                      />
                    </div>
                  </div>

                  {/* ── Paginated list (product groups) ───────────────────── */}
                  <div className="flex-1 overflow-y-auto px-6 py-4 space-y-2 min-h-0">
                    {pgLoading ? (
                      <div className="flex justify-center py-8">
                        <Loader2 className="w-6 h-6 text-primary-600 animate-spin" />
                      </div>
                    ) : pgPagedList.length === 0 ? (
                      <div className="text-center py-8">
                        <Tag className="w-10 h-10 text-zinc-300 dark:text-zinc-600 mx-auto mb-2" />
                        <p className="text-sm text-zinc-500 dark:text-zinc-400">
                          {pgSearch ? 'Nenhum grupo encontrado.' : 'Nenhum grupo cadastrado.'}
                        </p>
                      </div>
                    ) : (
                      pgPagedList.map((g) => (
                        <motion.div
                          key={g.id}
                          initial={{ opacity: 0, y: 6 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="flex items-center gap-3 p-3 bg-zinc-50 dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 hover:border-primary-300 dark:hover:border-primary-700 transition-colors"
                        >
                          <div className="w-9 h-9 bg-gradient-to-br from-primary-100 to-primary-200 dark:from-primary-900/30 dark:to-primary-800/30 rounded-lg flex items-center justify-center flex-shrink-0">
                            <Tag size={15} className="text-primary-600 dark:text-primary-400" />
                          </div>
                          {editingPgId === g.id ? (
                            /* ── Inline edit ────────────────────────────── */
                            <div className="flex-1 flex gap-2 items-center">
                              <input
                                type="text"
                                value={editingPgName}
                                onChange={(e) => setEditingPgName(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') { e.preventDefault(); handleSaveEditProductGroup(g.id); }
                                  if (e.key === 'Escape') { setEditingPgId(null); setEditingPgName(''); }
                                }}
                                autoFocus
                                className="flex-1 p-1.5 text-sm border border-primary-400 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white"
                              />
                              <button
                                type="button"
                                onClick={() => handleSaveEditProductGroup(g.id)}
                                disabled={pgEditSaving}
                                className="p-1.5 bg-primary-600 hover:bg-primary-700 disabled:opacity-60 text-white rounded-lg transition-colors"
                                title="Salvar"
                              >
                                {pgEditSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                              </button>
                              <button
                                type="button"
                                onClick={() => { setEditingPgId(null); setEditingPgName(''); }}
                                className="p-1.5 border border-zinc-300 dark:border-zinc-600 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-700 text-zinc-500 transition-colors"
                                title="Cancelar"
                              >
                                <X size={14} />
                              </button>
                            </div>
                          ) : (
                            <>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-200 truncate">
                                  {g.name}
                                </p>
                              </div>
                              <div className="flex items-center gap-1 flex-shrink-0">
                                <button
                                  type="button"
                                  onClick={() => { setEditingPgId(g.id); setEditingPgName(g.name); }}
                                  className="p-1.5 rounded-lg text-zinc-400 hover:text-primary-600 dark:hover:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-colors"
                                  title="Editar grupo"
                                >
                                  <Edit2 size={15} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleConfirmDeleteProductGroup(g)}
                                  disabled={deletingPgId === g.id}
                                  className="p-1.5 rounded-lg text-zinc-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-50 transition-colors"
                                  title="Excluir grupo"
                                >
                                  {deletingPgId === g.id
                                    ? <Loader2 size={15} className="animate-spin" />
                                    : <Trash2 size={15} />}
                                </button>
                              </div>
                            </>
                          )}
                        </motion.div>
                      ))
                    )}
                  </div>

                  {/* ── Pagination ───────────────────────────────────────── */}
                  {pgTotalItems > 0 && (
                    <div className="flex items-center justify-between px-6 py-3 border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/30">
                      <span className="text-xs text-zinc-500 dark:text-zinc-400">
                        {pgTotalItems} grupo{pgTotalItems !== 1 ? 's' : ''}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => setPgPage((p) => Math.max(p - 1, 1))}
                          disabled={pgPage === 1 || pgLoading}
                          className="p-1.5 border border-zinc-200 dark:border-zinc-700 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-700 disabled:opacity-40 disabled:cursor-not-allowed text-zinc-600 dark:text-zinc-400 transition-colors"
                        >
                          <ChevronLeft size={16} />
                        </button>
                        <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300 px-1 whitespace-nowrap">
                          {pgPage} / {pgTotalPages}
                        </span>
                        <button
                          onClick={() => setPgPage((p) => Math.min(p + 1, pgTotalPages))}
                          disabled={pgPage === pgTotalPages || pgLoading}
                          className="p-1.5 border border-zinc-200 dark:border-zinc-700 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-700 disabled:opacity-40 disabled:cursor-not-allowed text-zinc-600 dark:text-zinc-400 transition-colors"
                        >
                          <ChevronRight size={16} />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                /* ── Product form ─────────────────────────────────────────── */
                <form onSubmit={handleSubmit} className="p-6 space-y-4">

                  {/* Nome */}
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                      Nome *
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Ex: Dipirona Sódica 1g 10 Comprimidos"
                      className={`w-full p-2.5 border rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white placeholder-zinc-400 ${
                        formErrors.name
                          ? 'border-red-500 focus:ring-red-500'
                          : 'border-zinc-300 dark:border-zinc-600'
                      }`}
                    />
                    {formErrors.name && (
                      <p className="mt-1 text-sm text-red-600 dark:text-red-400">{formErrors.name}</p>
                    )}
                  </div>

                  {/* Código de Barras */}
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                      Código de Barras *
                    </label>
                    <input
                      type="text"
                      value={formData.barcode}
                      onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                      placeholder="Ex: 7896004710011"
                      className={`w-full p-2.5 border rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white placeholder-zinc-400 font-mono ${
                        formErrors.barcode
                          ? 'border-red-500 focus:ring-red-500'
                          : 'border-zinc-300 dark:border-zinc-600'
                      }`}
                    />
                    {formErrors.barcode && (
                      <p className="mt-1 text-sm text-red-600 dark:text-red-400">{formErrors.barcode}</p>
                    )}
                  </div>

                  {/* Fabricante (Opcional) */}
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                      Fabricante{' '}
                      <span className="text-zinc-400 font-normal">(Opcional)</span>
                    </label>
                    <div className="flex gap-2">
                      <select
                        value={formData.manufacturer_id}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            manufacturer_id: e.target.value ? Number(e.target.value) : '',
                          })
                        }
                        className="flex-1 p-2.5 border border-zinc-300 dark:border-zinc-600 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white"
                      >
                        <option value="">
                          {loadingManufacturers ? 'Carregando...' : 'Selecione um fabricante (opcional)'}
                        </option>
                        {manufacturers.map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.name}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => {
                          setMfrSearch('');
                          setMfrPage(1);
                          setNewMfrName('');
                          setMfrError(null);
                          setIsManagingManufacturers(true);
                        }}
                        className="p-2.5 border border-zinc-300 dark:border-zinc-600 rounded-xl hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-400 transition-colors flex-shrink-0"
                        title="Gerenciar fabricantes"
                      >
                        <Settings size={20} />
                      </button>
                    </div>
                  </div>

                  {/* Grupo de Produtos (Opcional) */}
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                      Grupo de Produtos{' '}
                      <span className="text-zinc-400 font-normal">(Opcional)</span>
                    </label>
                    <div className="flex gap-2">
                      <select
                        value={formData.product_group_id}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            product_group_id: e.target.value ? Number(e.target.value) : '',
                          })
                        }
                        className="flex-1 p-2.5 border border-zinc-300 dark:border-zinc-600 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white"
                      >
                        <option value="">
                          {loadingGroups ? 'Carregando...' : 'Selecione um grupo (opcional)'}
                        </option>
                        {productGroups.map((g) => (
                          <option key={g.id} value={g.id}>
                            {g.name}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => setIsManagingProductGroups(true)}
                        className="p-2.5 border border-zinc-300 dark:border-zinc-600 rounded-xl hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-400 transition-colors flex-shrink-0"
                        title="Ver grupos de produtos"
                      >
                        <Settings size={20} />
                      </button>
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div className="pt-2 flex gap-3">
                    <button
                      type="button"
                      onClick={handleCloseModal}
                      className="flex-1 px-4 py-2.5 border border-zinc-300 dark:border-zinc-600 text-zinc-700 dark:text-zinc-300 font-medium rounded-xl hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={saving}
                      className="flex-1 px-4 py-2.5 bg-primary-600 text-white font-medium rounded-xl hover:bg-primary-700 transition-colors disabled:opacity-70 flex items-center justify-center gap-2"
                    >
                      {saving ? <Loader2 size={20} className="animate-spin" /> : <Save size={20} />}
                      {saving ? 'Salvando...' : 'Salvar'}
                    </button>
                  </div>

                </form>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};

