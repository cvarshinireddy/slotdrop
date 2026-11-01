import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api, connectRealtime } from '@/lib/api';
import { useToast } from '@/components/ui';

const NotificationsContext = createContext(null);

export function NotificationsProvider({ children }) {
  const { toast } = useToast();
  const [items, setItems] = useState([]);
  const [status, setStatus] = useState('loading');
  const [open, setOpen] = useState(false);

  const load = useCallback(async () => {
    try {
      const d = await api.listNotifications();
      setItems(d.notifications);
      setStatus('ready');
    } catch { setStatus('error'); }
  }, []);

  useEffect(() => {
    load();
    return connectRealtime({
      'notification:new': (n) => {
        setItems((list) => (list.some((x) => x._id === n._id) ? list : [n, ...list]));
        toast({ variant: 'info', title: n.title, description: n.body });
      },
    });
  }, [load, toast]);

  const markAllRead = useCallback(async () => {
    setItems((l) => l.map((n) => ({ ...n, readAt: n.readAt || new Date().toISOString() }))); // optimistic
    await api.readAllNotifications().catch(load);
  }, [load]);

  const unread = items.filter((n) => !n.readAt).length;
  const value = useMemo(() => ({ items, status, unread, open, setOpen, reload: load, markAllRead }), [items, status, unread, open, load, markAllRead]);
  return <NotificationsContext.Provider value={value}>{children}</NotificationsContext.Provider>;
}

export const useNotifications = () => useContext(NotificationsContext);
