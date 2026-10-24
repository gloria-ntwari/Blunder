import { createContext, useContext, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { useAuthStore } from '../store/authStore.js';
import { useNotificationStore } from '../store/notificationStore.js';
import toast from 'react-hot-toast';

const SocketContext = createContext(null);

export const SocketProvider = ({ children }) => {
  const socketRef = useRef(null);
  const { user } = useAuthStore();
  const { addNotification } = useNotificationStore();

  useEffect(() => {
    if (!user) return;

    socketRef.current = io('/', { withCredentials: true });
    const socket = socketRef.current;

    // Join rooms
    socket.emit('join', {
      userId: user.id,
      track: user.academic_track,
      mentorGroupId: user.mentor_group_id,
    });

    // Snack alert → orange banner toast
    socket.on('snack_alert', (alert) => {
      toast(alert.message, {
        icon: '🍰',
        style: {
          background: '#fff7ed',
          color: '#c2410c',
          border: '1px solid #fed7aa',
          fontFamily: 'Poppins, sans-serif',
          fontWeight: 500,
        },
        duration: 8000,
      });
      addNotification({
        id: alert.id,
        type: 'snack',
        title: 'Snack Alert',
        body: alert.message,
        is_read: false,
        created_at: new Date().toISOString(),
      });
    });

    // New announcement
    socket.on('new_announcement', (ann) => {
      toast.success(`New announcement: ${ann.title}`, {
        duration: 5000,
        icon: '',
      });
      addNotification({
        id: ann.id,
        type: 'announcement',
        title: ann.title,
        body: ann.body?.substring(0, 80),
        entity_type: 'announcement',
        entity_id: ann.id,
        is_read: false,
        created_at: new Date().toISOString(),
      });
    });

    // Private notification
    socket.on('notification', (notif) => {
      addNotification(notif);
    });

    return () => {
      socket.disconnect();
    };
  }, [user?.id]);

  return (
    <SocketContext.Provider value={socketRef.current}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => useContext(SocketContext);
