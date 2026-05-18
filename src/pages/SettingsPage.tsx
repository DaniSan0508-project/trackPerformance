import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Search, Loader2, RefreshCw, X, Check, ChevronLeft, ChevronRight, Upload, ImageIcon, RefreshCcw } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../context/AuthContext';
import { TenantConfig } from '../types';
import { tenantConfigsService } from '../services';
import { useToast } from '../context/ToastContext';
import { tenantConfigValidations } from '../validators/schemas';

function useDebounce<T>(value: T, delay: number): T {
    const [debouncedValue, setDebouncedValue] = useState<T>(value);
    useEffect(() => {
        const handler = setTimeout(() => setDebouncedValue(value), delay);
        return () => clearTimeout(handler);
    }, [value, delay]);
    return debouncedValue;
}

const BOOLEAN_KEYS = [
    'allow_user_post',
    'hashtag_reward_requires_approval',
    'post_share_reward_requires_approval',
    'email_notifications_enabled',
    'api_integration_enabled',
];

const COLOR_KEYS = ['primary_color', 'secondary_color'];

const translateConfigKey = (key: string): string => {
    const translations: Record<string, string> = {
        cnpj: 'CNPJ',
        email: 'E-mail',
        engagement_reward_frequency: 'Frequência de recompensa por engajamento',
        allow_user_post: 'Permitir posts de usuários',
        primary_color: 'Cor primária',
        secondary_color: 'Cor secundária',
        path_logo: 'Logo',
        coin_name: 'Nome da Moeda',
        post_quantity: 'Quantidade de posts exibidos na tela inicial do aplicativo',
        hashtag_reward_requires_approval: 'Exigir aprovação para recompensas por hashtag',
        post_share_reward_requires_approval: 'Exigir aprovação para recompensas por compartilhamento',
    };
    return translations[key] || key.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
};

const engagementRewardFrequencyOptions = [
    { value: 'daily', label: 'Apenas uma vez ao dia' },
    { value: 'always', label: 'Sempre que realizar a ação' },
];

const userProfileOptions = [
    { value: 'corporate', label: 'Corporativo' },
    { value: 'multiple_companies', label: 'Múltiplas Empresas' },
];

const formatCnpj = (digits: string) =>
    digits
        .replace(/^(\d{2})(\d)/, '$1.$2')
        .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
        .replace(/\.(\d{3})(\d)/, '.$1/$2')
        .replace(/(\d{4})(\d)/, '$1-$2');

// Keys that trigger the "refresh page?" prompt after saving
const REFRESH_PROMPT_KEYS = ['path_logo', 'primary_color'];

const RefreshPromptModal: React.FC<{
    configLabel: string;
    onConfirm: () => void;
    onDismiss: () => void;
}> = ({ configLabel, onConfirm, onDismiss }) => (
    <AnimatePresence>
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                onClick={onDismiss}
            />
            {/* Dialog */}
            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                transition={{ duration: 0.18 }}
                className="relative bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl border border-zinc-100 dark:border-zinc-800 p-6 w-full max-w-sm flex flex-col gap-4"
            >
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-primary-100 dark:bg-primary-900/30 rounded-xl flex items-center justify-center flex-shrink-0">
                        <RefreshCcw size={20} className="text-primary-600 dark:text-primary-400" />
                    </div>
                    <div>
                        <h3 className="font-bold text-zinc-900 dark:text-zinc-100">Atualizar página?</h3>
                        <p className="text-sm text-zinc-500 dark:text-zinc-400">
                            A configuração <span className="font-semibold text-zinc-700 dark:text-zinc-300">"{configLabel}"</span> foi salva. Deseja atualizar a página agora para refletir as mudanças?
                        </p>
                    </div>
                </div>

                <div className="flex gap-3 justify-end pt-1">
                    <button
                        onClick={onDismiss}
                        className="px-4 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-sm font-medium transition-colors"
                    >
                        Não, continuar
                    </button>
                    <button
                        onClick={onConfirm}
                        className="px-4 py-2 rounded-xl bg-primary-600 text-white hover:bg-primary-700 text-sm font-medium transition-colors flex items-center gap-2"
                    >
                        <RefreshCcw size={15} />
                        Sim, atualizar
                    </button>
                </div>
            </motion.div>
        </div>
    </AnimatePresence>
);

const ConfigItem: React.FC<{
    config: TenantConfig;
    onUpdate: (config: TenantConfig, newValue: string) => Promise<boolean>;
    onUploadLogo?: (file: File) => Promise<string | null>;
}> = ({ config, onUpdate, onUploadLogo }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [value, setValue] = useState(config.config_value);
    const [updating, setUpdating] = useState(false);
    const [validationError, setValidationError] = useState<string | null>(null);
    const colorInputRef = useRef<HTMLInputElement>(null);
    const logoFileInputRef = useRef<HTMLInputElement>(null);
    const [logoPreview, setLogoPreview] = useState<string | null>(null);
    const [logoUploading, setLogoUploading] = useState(false);

    const isBoolean = BOOLEAN_KEYS.includes(config.config_key);
    const isUserProfile = config.config_key === 'user_profile';
    const isEngagementFrequency = config.config_key === 'engagement_reward_frequency';
    const isColor = COLOR_KEYS.includes(config.config_key);
    const isCnpj = config.config_key === 'cnpj';
    const isEmail = config.config_key === 'email';
    const isPostQuantity = config.config_key === 'post_quantity';
    const isLogo = config.config_key === 'path_logo';
    const hasChanged = value !== config.config_value;

    const showInlineEditor = isBoolean || isUserProfile || isEngagementFrequency || isEmail || isLogo || isEditing;

    const validateValue = (val: string) => {
        const validation = tenantConfigValidations[config.config_key as keyof typeof tenantConfigValidations];
        if (validation) {
            const result = validation.safeParse(val);
            if (!result.success) return result.error.issues[0]?.message || 'Valor inválido';
        }
        return null;
    };

    const handleSave = async () => {
        if (!isEmail && !hasChanged) { setIsEditing(false); return; }
        const rawValue = isCnpj ? value.replace(/\D/g, '') : value;
        const error = validateValue(rawValue);
        if (error) { setValidationError(error); return; }
        setUpdating(true);
        const success = await onUpdate(config, rawValue);
        setUpdating(false);
        if (success) { setIsEditing(false); setValidationError(null); }
    };

    const handleCancel = () => {
        setValue(config.config_value);
        setIsEditing(false);
        setValidationError(null);
    };

    const handleCnpjChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const digits = e.target.value.replace(/\D/g, '').slice(0, 14);
        setValue(formatCnpj(digits));
        setValidationError(null);
    };

    const handleLogoFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !onUploadLogo) return;

        // Validate type
        const allowed = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
        if (!allowed.includes(file.type)) {
            setValidationError('Formato inválido. Use jpeg, png, gif ou webp.');
            return;
        }
        // Validate size (5 MB)
        if (file.size > 5 * 1024 * 1024) {
            setValidationError('A imagem deve ter no máximo 5 MB.');
            return;
        }

        setValidationError(null);
        // Show local preview while uploading
        const reader = new FileReader();
        reader.onload = (ev) => setLogoPreview(ev.target?.result as string);
        reader.readAsDataURL(file);

        setLogoUploading(true);
        const newUrl = await onUploadLogo(file);
        setLogoUploading(false);
        if (newUrl) {
            setValue(newUrl);
            setLogoPreview(null); // will use the real URL from config_value now
        } else {
            setLogoPreview(null);
        }
        // Reset file input
        if (logoFileInputRef.current) logoFileInputRef.current.value = '';
    };

    const formatDisplayValue = (key: string, val: string) => {
        if (BOOLEAN_KEYS.includes(key)) {
            return val === 'true'
                ? <span className="px-2 py-1 bg-primary-100 text-primary-700 rounded-md text-xs font-bold">SIM</span>
                : <span className="px-2 py-1 bg-red-100 text-red-700 rounded-md text-xs font-bold">NÃO</span>;
        }
        if (key === 'user_profile') return userProfileOptions.find(o => o.value === val)?.label || val;
        if (key === 'cnpj') return val.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
        if (key.includes('phone') || key.includes('celular') || key.includes('whatsapp')) {
            const d = val.replace(/\D/g, '');
            if (d.length === 11) return d.replace(/^(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
            if (d.length === 10) return d.replace(/^(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
        }
        if (key === 'engagement_reward_frequency') return engagementRewardFrequencyOptions.find(o => o.value === val)?.label || val;
        if (COLOR_KEYS.includes(key) && /^#[0-9A-Fa-f]{6}$/.test(val)) {
            return (
                <span className="flex items-center gap-2">
                    <span className="inline-block w-5 h-5 rounded border border-zinc-300 dark:border-zinc-600 flex-shrink-0" style={{ backgroundColor: val }} />
                    <span className="font-mono">{val}</span>
                </span>
            );
        }
        return val;
    };

    const SaveCancel = ({ alwaysShow = false }: { alwaysShow?: boolean }) => (
        <>
            {(alwaysShow || hasChanged || !!validationError) && (
                <>
                    <button onClick={handleSave} disabled={updating || !!validationError}
                        className="p-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        title={validationError ? 'Corrija o erro antes de salvar' : 'Salvar'}>
                        {updating ? <Loader2 size={18} className="animate-spin" /> : <Check size={18} />}
                    </button>
                    <button onClick={handleCancel} disabled={updating}
                        className="p-2 bg-zinc-200 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300 rounded-lg hover:bg-zinc-300 dark:hover:bg-zinc-600 disabled:opacity-50 transition-colors"
                        title="Cancelar">
                        <X size={18} />
                    </button>
                </>
            )}
        </>
    );

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white dark:bg-zinc-900 p-6 rounded-2xl shadow-sm border border-zinc-100 dark:border-zinc-800 hover:shadow-md transition-all duration-200"
        >
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex-1">
                    <h3 className="font-bold text-lg text-zinc-900 dark:text-zinc-100">{translateConfigKey(config.config_key)}</h3>
                </div>

                <div className="flex-1 w-full md:w-auto flex justify-end">
                    {showInlineEditor ? (
                        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-end">

                            {isBoolean && (
                                <>
                                    <button
                                        onClick={() => setValue(value === 'true' ? 'false' : 'true')}
                                        className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-colors ${
                                            value === 'true'
                                                ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400 hover:bg-primary-200 dark:hover:bg-primary-900/50'
                                                : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/50'
                                        }`}
                                    >
                                        {value === 'true' ? 'SIM' : 'NÃO'}
                                    </button>
                                    <SaveCancel />
                                </>
                            )}

                            {isUserProfile && (
                                <>
                                    <select value={value} onChange={(e) => setValue(e.target.value)} autoFocus
                                        className="px-3 py-1.5 border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors">
                                        {userProfileOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                                    </select>
                                    <SaveCancel />
                                </>
                            )}

                            {isEngagementFrequency && (
                                <>
                                    <select value={value} onChange={(e) => setValue(e.target.value)} autoFocus
                                        className="px-3 py-1.5 border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors">
                                        {engagementRewardFrequencyOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                                    </select>
                                    <SaveCancel />
                                </>
                            )}

                            {isEmail && (
                                <>
                                    <input type="email" value={value}
                                        onChange={(e) => { setValue(e.target.value); setValidationError(null); }}
                                        className={`flex-1 md:w-64 p-2 border bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 rounded-lg focus:ring-2 focus:border-primary-500 transition-colors ${validationError ? 'border-red-500 focus:ring-red-500' : 'border-zinc-300 dark:border-zinc-700 focus:ring-primary-500'}`}
                                    />
                                    {validationError && <p className="text-xs text-red-600 dark:text-red-400 w-full text-right">{validationError}</p>}
                                    {/* Always show save for email */}
                                    <button onClick={handleSave} disabled={updating || !!validationError}
                                        className="p-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                        title="Salvar">
                                        {updating ? <Loader2 size={18} className="animate-spin" /> : <Check size={18} />}
                                    </button>
                                </>
                            )}

                            {isLogo && (
                                <div className="flex items-center gap-3 w-full md:w-auto justify-end flex-wrap">
                                    {/* Current / preview logo thumbnail */}
                                    <div className="flex-shrink-0 w-16 h-16 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 overflow-hidden flex items-center justify-center">
                                        {logoPreview || config.config_value ? (
                                            <img
                                                src={logoPreview ?? config.config_value}
                                                alt="Logo"
                                                className="w-full h-full object-contain p-1"
                                            />
                                        ) : (
                                            <ImageIcon size={24} className="text-zinc-400 dark:text-zinc-500" />
                                        )}
                                    </div>

                                    {/* Hidden file input */}
                                    <input
                                        ref={logoFileInputRef}
                                        type="file"
                                        accept="image/jpeg,image/png,image/gif,image/webp"
                                        className="hidden"
                                        onChange={handleLogoFileChange}
                                    />

                                    {/* Upload button */}
                                    <button
                                        onClick={() => logoFileInputRef.current?.click()}
                                        disabled={logoUploading}
                                        className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
                                    >
                                        {logoUploading
                                            ? <><Loader2 size={16} className="animate-spin" /> Enviando...</>
                                            : <><Upload size={16} /> Alterar Logo</>
                                        }
                                    </button>

                                    {validationError && (
                                        <p className="text-xs text-red-600 dark:text-red-400 w-full text-right">{validationError}</p>
                                    )}
                                </div>
                            )}

                            {/* Non-boolean, non-select editors (only shown when isEditing) */}
                            {isEditing && isColor && (
                                <>
                                    <div className="flex items-center gap-2">
                                        <div
                                            className="relative w-10 h-10 rounded-lg border border-zinc-300 dark:border-zinc-600 overflow-hidden cursor-pointer shadow-sm flex-shrink-0"
                                            onClick={() => colorInputRef.current?.click()}
                                            style={{ backgroundColor: /^#[0-9A-Fa-f]{6}$/.test(value) ? value : '#ffffff' }}
                                            title="Clique para abrir o seletor de cor"
                                        >
                                            <input ref={colorInputRef} type="color"
                                                value={/^#[0-9A-Fa-f]{6}$/.test(value) ? value : '#ffffff'}
                                                onChange={(e) => { setValue(e.target.value); setValidationError(null); }}
                                                className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
                                            />
                                        </div>
                                        <input type="text" value={value} placeholder="#RRGGBB" maxLength={7}
                                            onChange={(e) => { setValue(e.target.value); setValidationError(null); }}
                                            className={`w-28 p-2 border bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 rounded-lg focus:ring-2 focus:border-primary-500 font-mono text-sm transition-colors ${validationError ? 'border-red-500 focus:ring-red-500' : 'border-zinc-300 dark:border-zinc-700 focus:ring-primary-500'}`}
                                        />
                                    </div>
                                    {validationError && <p className="text-xs text-red-600 dark:text-red-400 w-full text-right">{validationError}</p>}
                                    <SaveCancel />
                                </>
                            )}

                            {isEditing && isCnpj && (
                                <>
                                    <input type="text" value={value} onChange={handleCnpjChange}
                                        placeholder="00.000.000/0000-00" autoFocus
                                        className={`w-44 p-2 border bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 rounded-lg focus:ring-2 focus:border-primary-500 font-mono text-sm transition-colors ${validationError ? 'border-red-500 focus:ring-red-500' : 'border-zinc-300 dark:border-zinc-700 focus:ring-primary-500'}`}
                                    />
                                    {validationError && <p className="text-xs text-red-600 dark:text-red-400 w-full text-right">{validationError}</p>}
                                    <SaveCancel />
                                </>
                            )}

                            {isEditing && isPostQuantity && (
                                <>
                                    <input type="number" value={value} min={3} max={10} autoFocus
                                        onChange={(e) => { setValue(e.target.value); setValidationError(null); }}
                                        className={`w-24 p-2 border bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 rounded-lg focus:ring-2 focus:border-primary-500 text-center transition-colors ${validationError ? 'border-red-500 focus:ring-red-500' : 'border-zinc-300 dark:border-zinc-700 focus:ring-primary-500'}`}
                                    />
                                    {validationError && <p className="text-xs text-red-600 dark:text-red-400 w-full text-right">{validationError}</p>}
                                    <SaveCancel />
                                </>
                            )}

                            {isEditing && !isColor && !isCnpj && !isPostQuantity && !isEmail && !isBoolean && !isUserProfile && !isEngagementFrequency && (
                                <>
                                    <input type="text" value={value} autoFocus
                                        onChange={(e) => { setValue(e.target.value); setValidationError(null); }}
                                        className={`flex-1 md:w-64 p-2 border bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 rounded-lg focus:ring-2 focus:border-primary-500 text-right transition-colors ${validationError ? 'border-red-500 focus:ring-red-500' : 'border-zinc-300 dark:border-zinc-700 focus:ring-primary-500'}`}
                                    />
                                    {validationError && <p className="text-xs text-red-600 dark:text-red-400 w-full text-right">{validationError}</p>}
                                    <SaveCancel />
                                </>
                            )}
                        </div>
                    ) : (
                        <div className="flex flex-col md:items-end cursor-pointer group" onClick={() => setIsEditing(true)}>
                            <div className="inline-block bg-zinc-50 dark:bg-zinc-800 px-4 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 max-w-full overflow-hidden text-ellipsis group-hover:border-primary-300 dark:group-hover:border-primary-700 group-hover:bg-primary-50 dark:group-hover:bg-primary-900/20 transition-colors duration-200">
                                <span className="font-mono text-sm text-zinc-700 dark:text-zinc-300 break-all">
                                    {formatDisplayValue(config.config_key, config.config_value)}
                                </span>
                            </div>
                            <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-2 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
                                Clique para editar
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </motion.div>
    );
};

export const SettingsPage: React.FC = () => {
    const { token } = useAuth();
    const { addToast } = useToast();
    const [configs, setConfigs] = useState<TenantConfig[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const debouncedSearchTerm = useDebounce(searchTerm, 500);

    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalItems, setTotalItems] = useState(0);
    const [fromItem, setFromItem] = useState(0);
    const [toItem, setToItem] = useState(0);

    // Refresh prompt modal state
    const [refreshPrompt, setRefreshPrompt] = useState<{ label: string } | null>(null);

    const fetchConfigs = useCallback(async (page = 1, search = '') => {
        if (!token) return;
        setLoading(true);
        setError(null);
        try {
            const data = await tenantConfigsService.getTenantConfigs(token, page, search);
            setConfigs(data.data);
            setCurrentPage(data.current_page);
            setTotalPages(data.last_page);
            setTotalItems(data.total);
            setFromItem(data.from);
            setToItem(data.to);
        } catch (err: any) {
            setError(err.message || 'Não foi possível carregar as configurações. Verifique sua conexão.');
        } finally {
            setLoading(false);
        }
    }, [token]);

    useEffect(() => {
        fetchConfigs(currentPage, debouncedSearchTerm);
    }, [fetchConfigs, currentPage, debouncedSearchTerm]);

    useEffect(() => {
        setCurrentPage(1);
    }, [debouncedSearchTerm]);

    const handleUpdateConfig = async (config: TenantConfig, newValue: string): Promise<boolean> => {
        if (!token) return false;
        const validation = tenantConfigValidations[config.config_key as keyof typeof tenantConfigValidations];
        if (validation) {
            const result = validation.safeParse(newValue);
            if (!result.success) {
                addToast('error', result.error.issues[0]?.message || 'Valor inválido');
                return false;
            }
        }
        try {
            await tenantConfigsService.updateTenantConfig(token, config.id, {
                tenant_id: config.tenant_id,
                config_key: config.config_key,
                config_value: newValue,
            });
            setConfigs(prev => prev.map(c =>
                c.id === config.id ? { ...c, config_value: newValue, updated_at: new Date().toISOString() } : c
            ));
            addToast('success', 'Configuração atualizada com sucesso!');
            // Prompt refresh for visual-impact configs
            if (REFRESH_PROMPT_KEYS.includes(config.config_key)) {
                setRefreshPrompt({ label: translateConfigKey(config.config_key) });
            }
            return true;
        } catch (err) {
            addToast('error', 'Erro ao atualizar configuração. Tente novamente.');
            return false;
        }
    };

    const handleUploadLogo = async (file: File): Promise<string | null> => {
        if (!token) return null;
        try {
            const data = await tenantConfigsService.uploadLogo(token, file);
            setConfigs(prev => prev.map(c =>
                c.config_key === 'path_logo'
                    ? { ...c, config_value: data.logo_full_url ?? data.config_value, updated_at: data.updated_at }
                    : c
            ));
            addToast('success', 'Logo atualizado com sucesso!');
            // Prompt refresh after logo upload
            setRefreshPrompt({ label: translateConfigKey('path_logo') });
            return data.logo_full_url ?? data.config_value;
        } catch (err: any) {
            addToast('error', err.message || 'Erro ao enviar logo. Tente novamente.');
            return null;
        }
    };

    // Sort alphabetically by translated label (pt-BR)
    const sortedConfigs = [...configs].sort((a, b) =>
        translateConfigKey(a.config_key).localeCompare(translateConfigKey(b.config_key), 'pt-BR')
    );

    return (
        <div className="p-4 md:p-8 space-y-6">
            {/* Refresh-prompt modal */}
            {refreshPrompt && (
                <RefreshPromptModal
                    configLabel={refreshPrompt.label}
                    onConfirm={() => window.location.reload()}
                    onDismiss={() => setRefreshPrompt(null)}
                />
            )}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Configurações do Sistema</h1>
                    <p className="text-zinc-500 dark:text-zinc-400">Administre as configurações e os parâmetros do ambiente.</p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => fetchConfigs(currentPage, searchTerm)}
                        className="bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 p-2 rounded-xl text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-all"
                        title="Atualizar"
                    >
                        <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
                    </button>
                </div>
            </div>

            <div className="bg-white dark:bg-zinc-900 p-4 rounded-2xl shadow-sm border border-zinc-100 dark:border-zinc-800 flex flex-col md:flex-row gap-4 items-center transition-colors duration-200">
                <div className="relative flex-1 w-full">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-zinc-400 dark:text-zinc-500" size={20} />
                    <input
                        type="text"
                        placeholder="Buscar por chave ou valor..."
                        className="w-full pl-10 pr-4 py-2 border border-zinc-200 dark:border-zinc-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-500 transition-colors"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            {loading && configs.length === 0 ? (
                <div className="flex justify-center py-12">
                    <Loader2 className="w-8 h-8 text-primary-600 animate-spin" />
                </div>
            ) : error ? (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 p-4 rounded-xl text-center">
                    {error}
                    <button onClick={() => fetchConfigs(currentPage, searchTerm)} className="block mx-auto mt-2 text-sm font-semibold hover:underline">
                        Tentar novamente
                    </button>
                </div>
            ) : (
                <div className="space-y-4">
                    <div className="grid grid-cols-1 gap-4">
                        {sortedConfigs.map((config) => (
                            <ConfigItem key={config.id} config={config} onUpdate={handleUpdateConfig} onUploadLogo={handleUploadLogo} />
                        ))}

                        {sortedConfigs.length === 0 && (
                            <div className="text-center py-12 bg-white dark:bg-zinc-900 rounded-2xl border border-dashed border-zinc-200 dark:border-zinc-700 transition-colors duration-200">
                                <h3 className="text-lg font-medium text-zinc-900 dark:text-zinc-100">Nenhuma configuração encontrada</h3>
                                <p className="text-zinc-500 dark:text-zinc-400">Tente ajustar seus filtros de busca.</p>
                            </div>
                        )}
                    </div>

                    {totalItems > 0 && (
                        <div className="flex items-center justify-between bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-zinc-100 dark:border-zinc-800 transition-colors duration-200">
                            <div className="text-sm text-zinc-500 dark:text-zinc-400">
                                Mostrando <span className="font-medium">{fromItem}</span> até <span className="font-medium">{toItem}</span> de <span className="font-medium">{totalItems}</span> resultados
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                    disabled={currentPage === 1}
                                    className="p-2 border border-zinc-200 dark:border-zinc-700 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed text-zinc-600 dark:text-zinc-300 transition-colors"
                                >
                                    <ChevronLeft size={20} />
                                </button>
                                <span className="text-sm font-medium px-2 text-zinc-700 dark:text-zinc-300">
                                    Página {currentPage} de {totalPages}
                                </span>
                                <button
                                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                    disabled={currentPage === totalPages}
                                    className="p-2 border border-zinc-200 dark:border-zinc-700 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed text-zinc-600 dark:text-zinc-300 transition-colors"
                                >
                                    <ChevronRight size={20} />
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};
