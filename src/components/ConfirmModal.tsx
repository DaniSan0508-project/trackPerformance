import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AlertTriangle, X } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'danger' | 'warning' | 'info';
  isLoading?: boolean;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  type = 'danger',
  isLoading = false,
}) => {
  if (!isOpen) return null;

  const colors = {
    danger: {
      icon: 'text-red-600',
      bg: 'bg-red-100 dark:bg-red-900/30',
      button: 'bg-red-600 hover:bg-red-700 focus:ring-red-500',
    },
    warning: {
      icon: 'text-amber-600',
      bg: 'bg-amber-100 dark:bg-amber-900/30',
      button: 'bg-amber-600 hover:bg-amber-700 focus:ring-amber-500',
    },
    info: {
      icon: 'text-blue-600',
      bg: 'bg-blue-100 dark:bg-blue-900/30',
      button: 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500',
    },
  };

  const color = colors[type];

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-white dark:bg-zinc-900 rounded-2xl shadow-xl max-w-md w-full overflow-hidden border border-zinc-200 dark:border-zinc-800"
        >
          <div className="p-6">
            <div className="flex items-start gap-4">
              <div className={`p-3 rounded-full flex-shrink-0 ${color.bg}`}>
                <AlertTriangle className={`w-6 h-6 ${color.icon}`} />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-zinc-900 dark:text-white mb-2">
                  {title}
                </h3>
                <p className="text-zinc-500 dark:text-zinc-400 text-sm leading-relaxed">
                  {message}
                </p>
              </div>
              <button
                onClick={onClose}
                className="text-zinc-400 hover:text-zinc-500 dark:hover:text-zinc-300 transition-colors"
              >
                <X size={20} />
              </button>
            </div>
          </div>

          <div className="bg-zinc-50 dark:bg-zinc-800/50 px-6 py-4 flex justify-end gap-3 border-t border-zinc-100 dark:border-zinc-800">
            <button
              onClick={onClose}
              disabled={isLoading}
              className="px-4 py-2 text-sm font-medium text-zinc-700 dark:text-zinc-300 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-xl hover:bg-zinc-50 dark:hover:bg-zinc-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-zinc-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {cancelText}
            </button>
            <button
              onClick={onConfirm}
              disabled={isLoading}
              className={`px-4 py-2 text-sm font-medium text-white rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 ${color.button}`}
            >
              {isLoading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Processando...
                </>
              ) : (
                confirmText
              )}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
