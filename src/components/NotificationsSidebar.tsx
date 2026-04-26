import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowLeft, Bell, CheckCircle, Circle, Loader2, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { notificationsService } from '../services';
import { NotificationItem } from '../types/notification';

type NotificationFilter = 'all' | 'unread' | 'read';

interface NotificationsSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  onUnreadCountChange: (count: number) => void;
}

const FILTER_LABELS: Record<NotificationFilter, string> = {
  all: 'Todas',
  unread: 'Não lidas',
  read: 'Lidas',
};

const formatDate = (date?: string | null) => {
  if (!date) return '-';
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return '-';
  return parsed.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const isNotificationItem = (value: any): value is NotificationItem =>
  value &&
  typeof value === 'object' &&
  typeof value.id === 'number' &&
  typeof value.title === 'string' &&
  typeof value.text === 'string';

const extractNotification = (payload: any): NotificationItem => {
  if (isNotificationItem(payload)) return payload;
  if (isNotificationItem(payload?.data)) return payload.data;
  return payload as NotificationItem;
};

export const NotificationsSidebar: React.FC<NotificationsSidebarProps> = ({
  isOpen,
  onClose,
  onUnreadCountChange,
}) => {
  const { token } = useAuth();
  const { addToast } = useToast();
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  const [filter, setFilter] = useState<NotificationFilter>('all');
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [selectedNotification, setSelectedNotification] = useState<NotificationItem | null>(null);
  const [loadingInitial, setLoadingInitial] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [markingReadId, setMarkingReadId] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const unreadCount = useMemo(
    () => notifications.filter((item) => !item.read_at).length,
    [notifications]
  );

  const fetchUnreadCount = useCallback(async () => {
    if (!token) return;

    try {
      const response = await notificationsService.listNotifications(token, {
        page: 1,
        perPage: 1,
        isRead: false,
        sort: '-created_at',
      });

      const unreadTotal = response?.meta?.total ?? response?.total ?? 0;
      onUnreadCountChange(unreadTotal);
    } catch (error) {
      console.debug('Failed to fetch unread notifications count:', error);
    }
  }, [token, onUnreadCountChange]);

  const fetchNotificationsPage = useCallback(async (page: number, reset = false) => {
    if (!token) return;

    if (reset) {
      setLoadingInitial(true);
      setErrorMessage(null);
    } else {
      setLoadingMore(true);
    }

    try {
      const response = await notificationsService.listNotifications(token, {
        page,
        perPage: 15,
        isRead: filter === 'all' ? undefined : filter === 'read',
        sort: '-created_at',
      });

      const incoming: NotificationItem[] = response?.data || [];
      const apiCurrentPage = response?.meta?.current_page ?? response?.current_page ?? page;
      const apiLastPage = response?.meta?.last_page ?? response?.last_page ?? page;
      const apiHasMore = Boolean(response?.next_page_url) || apiCurrentPage < apiLastPage;

      setCurrentPage(apiCurrentPage);
      setLastPage(apiLastPage);
      setHasMore(apiHasMore);

      setNotifications((prev) => {
        const base = reset ? [] : prev;
        const merged = [...base, ...incoming];
        const dedupMap = new Map<number, NotificationItem>();
        merged.forEach((item) => dedupMap.set(item.id, item));
        return Array.from(dedupMap.values());
      });
    } catch (error: any) {
      console.error('Error loading notifications:', error);
      setErrorMessage(error.message || 'Não foi possível carregar as notificações.');
      if (reset) setNotifications([]);
    } finally {
      setLoadingInitial(false);
      setLoadingMore(false);
    }
  }, [filter, token]);

  const refresh = useCallback(() => {
    setSelectedNotification(null);
    setCurrentPage(1);
    setLastPage(1);
    setHasMore(true);
    fetchNotificationsPage(1, true);
    fetchUnreadCount();
  }, [fetchNotificationsPage, fetchUnreadCount]);

  const markAsRead = useCallback(async (notificationId: number, silent = false) => {
    if (!token) return;

    try {
      setMarkingReadId(notificationId);
      await notificationsService.markAsRead(token, notificationId);
      setNotifications((prev) =>
        prev
          .map((item) =>
            item.id === notificationId
              ? {
                  ...item,
                  read_at: item.read_at || new Date().toISOString(),
                }
              : item
          )
          .filter((item) => (filter === 'unread' ? item.id !== notificationId : true))
      );
      setSelectedNotification((prev) =>
        prev && prev.id === notificationId
          ? { ...prev, read_at: prev.read_at || new Date().toISOString() }
          : prev
      );
      fetchUnreadCount();
      if (!silent) addToast('success', 'Notificação marcada como lida.');
    } catch (error: any) {
      console.error('Error marking notification as read:', error);
      if (!silent) addToast('error', error.message || 'Erro ao marcar notificação como lida.');
    } finally {
      setMarkingReadId(null);
    }
  }, [token, addToast, fetchUnreadCount, filter]);

  const handleSelectNotification = useCallback(async (notification: NotificationItem) => {
    if (!token) return;

    setLoadingDetail(true);
    try {
      const response = await notificationsService.getNotification(token, notification.id);
      const detail = extractNotification(response);
      setSelectedNotification(detail);

      if (!detail.read_at) {
        await markAsRead(detail.id, true);
      }
    } catch (error: any) {
      console.error('Error loading notification detail:', error);
      addToast('error', error.message || 'Erro ao carregar detalhe da notificação.');
    } finally {
      setLoadingDetail(false);
    }
  }, [token, markAsRead, addToast]);

  useEffect(() => {
    if (!isOpen) return;
    refresh();
  }, [isOpen, filter, refresh]);

  useEffect(() => {
    if (!token) return;
    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 30000);
    return () => clearInterval(interval);
  }, [token, fetchUnreadCount]);

  useEffect(() => {
    if (!isOpen) return;
    const onEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onEsc);
    return () => document.removeEventListener('keydown', onEsc);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen || selectedNotification || !hasMore || loadingInitial || loadingMore) return;
    const sentinel = loadMoreRef.current;
    if (!sentinel) return;

    observerRef.current?.disconnect();
    observerRef.current = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry.isIntersecting && hasMore && !loadingMore && !loadingInitial) {
          fetchNotificationsPage(currentPage + 1);
        }
      },
      { rootMargin: '200px' }
    );
    observerRef.current.observe(sentinel);

    return () => observerRef.current?.disconnect();
  }, [
    isOpen,
    selectedNotification,
    hasMore,
    loadingInitial,
    loadingMore,
    currentPage,
    fetchNotificationsPage,
  ]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40"
            onClick={onClose}
          />

          <motion.aside
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 280 }}
            className="fixed right-0 top-0 h-full w-full sm:w-[420px] bg-white dark:bg-zinc-900 border-l border-zinc-200 dark:border-zinc-800 shadow-2xl z-50 flex flex-col"
            aria-label="Central de notificações"
          >
            <div className="px-5 py-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/70 dark:bg-zinc-800/50">
              <div className="flex items-center gap-3 min-w-0">
                {selectedNotification && (
                  <button
                    type="button"
                    onClick={() => setSelectedNotification(null)}
                    className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200 hover:bg-zinc-200/50 dark:hover:bg-zinc-700 transition-colors"
                    title="Voltar"
                    aria-label="Voltar para lista"
                  >
                    <ArrowLeft size={18} />
                  </button>
                )}
                <div className="bg-primary-100 dark:bg-primary-900/30 p-2 rounded-xl">
                  <Bell size={18} className="text-primary-700 dark:text-primary-400" />
                </div>
                <div className="min-w-0">
                  <h2 className="font-bold text-zinc-900 dark:text-white leading-tight">
                    {selectedNotification ? 'Detalhe da notificação' : 'Notificações'}
                  </h2>
                  {!selectedNotification && (
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                      {unreadCount} não lida(s) nesta lista
                    </p>
                  )}
                </div>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200 hover:bg-zinc-200/50 dark:hover:bg-zinc-700 transition-colors"
                title="Fechar"
                aria-label="Fechar notificações"
              >
                <X size={20} />
              </button>
            </div>

            {!selectedNotification && (
              <div className="px-4 py-3 border-b border-zinc-200 dark:border-zinc-800 flex gap-2">
                {(['all', 'unread', 'read'] as NotificationFilter[]).map((itemFilter) => (
                  <button
                    key={itemFilter}
                    type="button"
                    onClick={() => setFilter(itemFilter)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                      filter === itemFilter
                        ? 'bg-primary-600 text-white'
                        : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700'
                    }`}
                  >
                    {FILTER_LABELS[itemFilter]}
                  </button>
                ))}
              </div>
            )}

            <div className="flex-1 overflow-y-auto">
              {loadingInitial ? (
                <div className="h-full flex items-center justify-center">
                  <Loader2 className="w-7 h-7 text-primary-600 animate-spin" />
                </div>
              ) : errorMessage ? (
                <div className="p-4">
                  <div className="rounded-xl border border-red-300/70 dark:border-red-800 bg-red-50 dark:bg-red-900/20 p-4 text-sm text-red-700 dark:text-red-300">
                    <p>{errorMessage}</p>
                    <button
                      type="button"
                      onClick={refresh}
                      className="mt-2 font-semibold hover:underline"
                    >
                      Tentar novamente
                    </button>
                  </div>
                </div>
              ) : selectedNotification ? (
                <div className="p-5 space-y-4">
                  {loadingDetail ? (
                    <div className="flex items-center justify-center py-10">
                      <Loader2 className="w-7 h-7 text-primary-600 animate-spin" />
                    </div>
                  ) : (
                    <>
                      <h3 className="text-lg font-bold text-zinc-900 dark:text-white">
                        {selectedNotification.title}
                      </h3>
                      <div className="text-xs text-zinc-500 dark:text-zinc-400">
                        {formatDate(selectedNotification.created_at)}
                      </div>
                      <p className="text-sm text-zinc-700 dark:text-zinc-300 whitespace-pre-line">
                        {selectedNotification.text}
                      </p>

                      {!selectedNotification.read_at && (
                        <button
                          type="button"
                          onClick={() => markAsRead(selectedNotification.id)}
                          disabled={markingReadId === selectedNotification.id}
                          className="w-full mt-3 px-4 py-2.5 rounded-xl bg-primary-600 text-white hover:bg-primary-700 transition-colors font-semibold disabled:opacity-70"
                        >
                          {markingReadId === selectedNotification.id ? 'Marcando...' : 'Marcar como lida'}
                        </button>
                      )}
                    </>
                  )}
                </div>
              ) : notifications.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center px-6">
                  <Bell className="w-12 h-12 text-zinc-300 dark:text-zinc-700 mb-3" />
                  <p className="font-semibold text-zinc-700 dark:text-zinc-300">
                    Nenhuma notificação encontrada
                  </p>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">
                    Ajuste os filtros para ver outras notificações.
                  </p>
                </div>
              ) : (
                <div className="p-3 space-y-2">
                  {notifications.map((item) => {
                    const isUnread = !item.read_at;
                    return (
                      <div
                        key={item.id}
                        role="button"
                        tabIndex={0}
                        onClick={() => handleSelectNotification(item)}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault();
                            handleSelectNotification(item);
                          }
                        }}
                        className={`w-full text-left p-3 rounded-xl border transition-colors cursor-pointer ${
                          isUnread
                            ? 'border-primary-200 dark:border-primary-800 bg-primary-50/60 dark:bg-primary-900/20'
                            : 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800/80'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div className="mt-0.5">
                            {isUnread ? (
                              <Circle size={14} className="fill-primary-500 text-primary-500" />
                            ) : (
                              <CheckCircle size={14} className="text-zinc-400 dark:text-zinc-600" />
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="font-semibold text-sm text-zinc-900 dark:text-zinc-100 truncate">
                              {item.title}
                            </p>
                            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 line-clamp-2">
                              {item.text}
                            </p>
                            <p className="text-[11px] text-zinc-400 dark:text-zinc-500 mt-1.5">
                              {formatDate(item.created_at)}
                            </p>
                          </div>
                          {isUnread && (
                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation();
                                markAsRead(item.id);
                              }}
                              disabled={markingReadId === item.id}
                              className="px-2 py-1 text-[11px] font-semibold rounded-md bg-primary-600 text-white hover:bg-primary-700 transition-colors disabled:opacity-70"
                              title="Marcar como lida"
                            >
                              Lida
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}

                  {hasMore && <div ref={loadMoreRef} className="h-8" />}

                  {loadingMore && (
                    <div className="py-3 flex items-center justify-center">
                      <Loader2 className="w-5 h-5 text-primary-600 animate-spin" />
                    </div>
                  )}

                  {!hasMore && lastPage > 1 && (
                    <p className="text-center text-xs text-zinc-500 dark:text-zinc-400 py-2">
                      Fim da lista
                    </p>
                  )}
                </div>
              )}
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
};
