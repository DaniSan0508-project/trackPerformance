import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Camera, User, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { usersService } from '../services/users/usersService';
import { userUpdateSchema } from '../validators/schemas';
import { getFullImageUrl } from '../utils';

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const UserProfileModal: React.FC<UserProfileModalProps> = ({ isOpen, onClose }) => {
  const { user, token, updateCurrentUser } = useAuth();
  const { addToast } = useToast();
  const [saving, setSaving] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formErrors, setFormErrors] = useState<{ [key: string]: string }>({});
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    description: '',
    photo: null as File | null,
  });

  useEffect(() => {
    if (!isOpen || !user) return;
    setFormData({
      name: user.name || '',
      email: user.email || '',
      phone: user.phone || '',
      password: '',
      description: user.description || '',
      photo: null,
    });
    setFormErrors({});
    setShowPassword(false);
  }, [isOpen, user]);

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, '');
    if (value.length > 11) value = value.slice(0, 11);

    let maskedValue = '';
    if (value.length > 0) {
      maskedValue = `(${value.slice(0, 2)}`;
      if (value.length > 2) {
        maskedValue += ') ';
        if (value.length <= 10) {
          maskedValue += value.slice(2, 6);
          if (value.length > 6) {
            maskedValue += `-${value.slice(6, 10)}`;
          }
        } else {
          maskedValue += value.slice(2, 7);
          if (value.length > 7) {
            maskedValue += `-${value.slice(7, 11)}`;
          }
        }
      }
    }

    setFormData(prev => ({ ...prev, phone: maskedValue }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !user) return;
    setFormErrors({});

    const result = userUpdateSchema.safeParse({
      name: formData.name,
      email: formData.email,
      phone: formData.phone || undefined,
      password: formData.password || undefined,
      user_type_id: String(user.user_type_id),
      description: formData.description || undefined,
    });

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
      const data = new FormData();
      data.append('name', formData.name);
      data.append('email', formData.email);
      data.append('user_type_id', String(user.user_type_id));
      if (formData.phone) data.append('phone', formData.phone);
      if (formData.password) data.append('password', formData.password);
      if (formData.description) data.append('description', formData.description);
      if (formData.photo) data.append('photo', formData.photo);

      const response = await usersService.updateUser(token, user.id, data);
      const apiUser = response?.data || response;

      const updatedUser = {
        ...user,
        ...apiUser,
        name: formData.name,
        email: formData.email,
        phone: formData.phone || user.phone,
        description: formData.description || user.description,
      };

      updateCurrentUser(updatedUser);
      addToast('success', 'Perfil atualizado com sucesso!');
      onClose();
    } catch (error: any) {
      console.error('Error updating profile:', error);
      if (error.response?.data?.errors) {
        const apiErrors = error.response.data.errors;
        const formattedErrors: { [key: string]: string } = {};
        const translations: { [key: string]: string } = {
          'The email has already been taken.': 'Este e-mail já está em uso.',
          'The password must be at least 8 characters.': 'A senha deve ter pelo menos 8 caracteres.',
          'The name field is required.': 'O campo nome é obrigatório.',
        };

        Object.entries(apiErrors).forEach(([key, messages]: [string, any]) => {
          const message = Array.isArray(messages) ? messages[0] : messages;
          if (typeof message === 'string') {
            formattedErrors[key] = translations[message] || message;
          }
        });

        setFormErrors(formattedErrors);
        addToast('error', 'Erro de validação nos campos abaixo.');
      } else {
        addToast('error', error.message || 'Erro ao atualizar perfil.');
      }
    } finally {
      setSaving(false);
    }
  };

  if (!user) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-white dark:bg-zinc-900 rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh] border border-zinc-200 dark:border-zinc-800"
          >
            <div className="p-6 border-b border-zinc-100 dark:border-zinc-800 flex justify-between items-center bg-zinc-50/50 dark:bg-zinc-800/50">
              <h2 className="text-xl font-bold text-zinc-900 dark:text-white">Meu Perfil</h2>
              <button onClick={onClose} className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors">
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
              <div className="flex justify-center mb-6">
                <div className="relative group cursor-pointer">
                  <div className="w-24 h-24 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center overflow-hidden border-2 border-zinc-200 dark:border-zinc-700">
                    {formData.photo ? (
                      <img src={URL.createObjectURL(formData.photo)} alt="Preview" className="w-full h-full object-cover" />
                    ) : user.profile_image_url ? (
                      <img src={getFullImageUrl(user.profile_image_url) || ''} alt={user.name || 'Usuário'} className="w-full h-full object-cover" />
                    ) : (
                      <User size={40} className="text-zinc-400" />
                    )}
                  </div>
                  <label htmlFor="profile-photo-upload" className="absolute bottom-0 right-0 bg-primary-600 text-white p-1.5 rounded-full shadow-md cursor-pointer hover:bg-primary-700 transition-colors">
                    <Camera size={16} />
                    <input
                      id="profile-photo-upload"
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          setFormData(prev => ({ ...prev, photo: e.target.files![0] }));
                        }
                      }}
                    />
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Nome *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  className={`w-full p-2.5 border rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white placeholder-zinc-400 ${
                    formErrors.name ? 'border-red-500 focus:ring-red-500' : 'border-zinc-300 dark:border-zinc-600'
                  }`}
                  placeholder="Nome completo"
                />
                {formErrors.name && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{formErrors.name}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Email *</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  className={`w-full p-2.5 border rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white placeholder-zinc-400 ${
                    formErrors.email ? 'border-red-500 focus:ring-red-500' : 'border-zinc-300 dark:border-zinc-600'
                  }`}
                  placeholder="email@exemplo.com"
                />
                {formErrors.email && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{formErrors.email}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Telefone (Opcional)</label>
                <input
                  type="text"
                  value={formData.phone}
                  onChange={handlePhoneChange}
                  className={`w-full p-2.5 border rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white placeholder-zinc-400 ${
                    formErrors.phone ? 'border-red-500 focus:ring-red-500' : 'border-zinc-300 dark:border-zinc-600'
                  }`}
                  placeholder="(00) 00000-0000"
                />
                {formErrors.phone && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{formErrors.phone}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Senha (deixe em branco para manter)</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={formData.password}
                    onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                    className={`w-full p-2.5 pr-10 border rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white placeholder-zinc-400 ${
                      formErrors.password ? 'border-red-500 focus:ring-red-500' : 'border-zinc-300 dark:border-zinc-600'
                    }`}
                    placeholder="******"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
                    title={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                {formErrors.password && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{formErrors.password}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Descrição (Opcional)</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Ex: Gerente da unidade centro..."
                  rows={3}
                  className="w-full p-2.5 border border-zinc-300 dark:border-zinc-600 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white resize-none"
                />
              </div>

              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 px-4 py-2.5 border border-zinc-300 dark:border-zinc-600 text-zinc-700 dark:text-zinc-300 font-medium rounded-xl hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 px-4 py-2.5 bg-primary-600 text-white font-medium rounded-xl hover:bg-primary-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
                >
                  {saving ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
