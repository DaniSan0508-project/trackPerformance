import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { communicationsService } from '../services';
import { CommunicationFeed } from '../types/communication';
import { PendingCommunicationsModal } from './PendingCommunicationsModal';

interface CommunicationsPollerProps {
  onUnreadCountChange: (count: number) => void;
}

export const CommunicationsPoller: React.FC<CommunicationsPollerProps> = ({ onUnreadCountChange }) => {
  const { token, user } = useAuth();
  const { addToast } = useToast();
  const [pendingCommunications, setPendingCommunications] = useState<CommunicationFeed[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [viewingCommunication, setViewingCommunication] = useState<CommunicationFeed | null>(null);
  const [loading, setLoading] = useState(false);
  const [hasShownInitialModal, setHasShownInitialModal] = useState(false);

  // Função para buscar comunicados pendentes
  const fetchPendingCommunications = useCallback(async () => {
    if (!token) return;

    try {
      const data = await communicationsService.getCommunicationFeed(token, 1, '', 50);
      const communications: CommunicationFeed[] = data.data || [];
      
      // Filtra APENAS comunicados não lidos e destinados ao usuário
      const unreadCommunications = communications.filter(c => {
        const isTargeted = c.target_all || c.target_users?.some(u => u.id === user?.id);
        return !c.is_viewed && isTargeted;
      });

      // Atualiza contador
      onUnreadCountChange(unreadCommunications.length);

      // Atualiza lista (apenas não lidos)
      setPendingCommunications(unreadCommunications);

      // Abre modal automaticamente na primeira carga se houver pendentes
      if (!hasShownInitialModal && unreadCommunications.length > 0) {
        setIsModalOpen(true);
        setHasShownInitialModal(true);
      }
    } catch (error) {
      // Silenciar erros de polling para não poluir o console
      console.debug('Polling error:', error);
    }
  }, [token, user, onUnreadCountChange, hasShownInitialModal]);

  // Polling a cada 30 segundos
  useEffect(() => {
    if (!token) return;

    // Primeira carga imediata
    fetchPendingCommunications();

    // Configura polling
    const interval = setInterval(fetchPendingCommunications, 30000);

    return () => clearInterval(interval);
  }, [token, fetchPendingCommunications]);

  // Listener para abrir modal manualmente
  useEffect(() => {
    const handleOpenModal = () => {
      setIsModalOpen(true);
      setViewingCommunication(null);
    };

    window.addEventListener('openCommunicationsModal', handleOpenModal);
    return () => window.removeEventListener('openCommunicationsModal', handleOpenModal);
  }, []);

  // Marcar como lido
  const handleMarkAsRead = async (id: number) => {
    if (!token) return;

    try {
      await communicationsService.markAsRead(token, id);
      
      // Remove da lista local
      setPendingCommunications(prev => prev.filter(comm => comm.id !== id));
      
      // Atualiza contador
      setPendingCommunications(current => {
        onUnreadCountChange(current.length - 1);
        return current;
      });
    } catch (error) {
      console.error('Error marking as read:', error);
      addToast('error', 'Erro ao marcar comunicado como lido.');
    }
  };

  // Marcar todos como lidos
  const handleMarkAllAsRead = async () => {
    if (!token) return;

    const unreadComms = pendingCommunications;

    try {
      // Marca cada um como lido
      await Promise.all(
        unreadComms.map(comm => communicationsService.markAsRead(token, comm.id))
      );

      // Limpa lista local
      setPendingCommunications([]);
      onUnreadCountChange(0);

      addToast('success', 'Todos os comunicados marcados como lidos.');
    } catch (error) {
      console.error('Error marking all as read:', error);
      addToast('error', 'Erro ao marcar todos os comunicados como lidos.');
    }
  };

  // Visualizar comunicado (NÃO marca como lido)
  const handleViewCommunication = (comm: CommunicationFeed) => {
    // Apenas abre modal de visualização, sem marcar como lido
    setViewingCommunication(comm);
  };

  return (
    <PendingCommunicationsModal
      isOpen={isModalOpen}
      communications={pendingCommunications}
      onClose={() => {
        setIsModalOpen(false);
        setViewingCommunication(null);
      }}
      onMarkAsRead={handleMarkAsRead}
      onMarkAllAsRead={handleMarkAllAsRead}
      onViewCommunication={handleViewCommunication}
      viewingCommunication={viewingCommunication}
      loading={loading}
    />
  );
};
