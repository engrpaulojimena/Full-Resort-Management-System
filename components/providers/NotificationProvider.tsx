'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from 'react';
import { AppNotification, NotificationType, Reservation } from '@/types';

/* ─── Toast types ─────────────────────────────────────────────────────────── */
export interface Toast {
  id: string;
  title: string;
  description?: string;
  variant?: 'success' | 'error' | 'info' | 'warning';
}

/* ─── Notification meta (icon + colour per type) ──────────────────────────── */
export const notificationTypeMeta: Record<
  NotificationType,
  { label: string; color: string; emoji: string }
> = {
  new_reservation:   { label: 'New Reservation',      color: '#6FA39A', emoji: '📋' },
  payment_pending:   { label: 'Payment Pending',       color: '#FFB74D', emoji: '💳' },
  payment_verified:  { label: 'Payment Verified',      color: '#81C784', emoji: '✅' },
  payment_rejected:  { label: 'Payment Rejected',      color: '#E57373', emoji: '❌' },
  check_in_today:    { label: 'Check-in Today',        color: '#64B5F6', emoji: '🔑' },
  check_out_today:   { label: 'Check-out Today',       color: '#BA68C8', emoji: '🚪' },
  cancellation:      { label: 'Cancellation',          color: '#E57373', emoji: '🚫' },
  low_availability:  { label: 'Low Availability',      color: '#FF8A65', emoji: '⚠️' },
  system:            { label: 'System',                color: '#90A4AE', emoji: '⚙️' },
  overstay:         { label: 'Overstay',              color: '#EF5350', emoji: '🚨' },
};

/* ─── Context ─────────────────────────────────────────────────────────────── */
interface NotificationContextValue {
  notifications: AppNotification[];
  unreadCount: number;
  toasts: Toast[];
  showToast: (toast: Omit<Toast, 'id'>) => void;
  dismissToast: (id: string) => void;
  markAllAsRead: () => void;
  markAsRead: (id: number) => void;
  addNotification: (n: Omit<AppNotification, 'id' | 'createdAt' | 'isRead'>) => void;
}

const NotificationContext = createContext<NotificationContextValue | null>(null);

/* ─── Provider ────────────────────────────────────────────────────────────── */
export function NotificationProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [toasts, setToasts] = useState<Toast[]>([]);

  // Load persisted notifications from the DB on first mount. Falls back to
  // the bundled mock set if the API/DB isn't reachable (e.g. no DATABASE_URL
  // configured yet), so the bell still has something to show in dev.
  useEffect(() => {
    fetch('/api/notifications')
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setNotifications(data);
      })
      .catch(() => {});
  }, []);

  // ── Overstay checker ────────────────────────────────────────────────────────
  // Runs once on mount (and every 15 min) to find checked-in reservations whose
  // check-out date has already passed. Fires one in-app notification per
  // overstaying guest; duplicate-guards by checking existing notification titles.
  useEffect(() => {
    async function checkOverstays() {
      try {
        const res = await fetch('/api/reservations');
        if (!res.ok) return;
        const allReservations: Reservation[] = await res.json();
        const now = new Date();

        const overstaying = allReservations.filter((r) => {
          if (r.status !== 'checked_in') return false;
          const checkOut = new Date(r.checkOut);
          return checkOut < now;
        });

        setNotifications((prev) => {
          let updated = [...prev];
          overstaying.forEach((r) => {
            const alreadyNotified = updated.some(
              (n) => n.type === 'overstay' && n.entityId === r.id
            );
            if (alreadyNotified) return;

            const checkOut = new Date(r.checkOut);
            const hoursLate = Math.floor((now.getTime() - checkOut.getTime()) / (1000 * 60 * 60));
            const daysLate = Math.floor(hoursLate / 24);
            const lateSummary = daysLate >= 1 ? `${daysLate} day${daysLate > 1 ? 's' : ''}` : `${hoursLate} hour${hoursLate > 1 ? 's' : ''}`;

            const newNotif: AppNotification = {
              id: Date.now() + r.id,
              type: 'overstay',
              title: 'Guest Overstaying',
              message: `${r.guest?.firstName ?? 'Guest'} ${r.guest?.lastName ?? ''} (Room ${r.room?.roomNumber ?? r.roomId}) was supposed to check out ${lateSummary} ago.`,
              entity: 'reservation',
              entityId: r.id,
              isRead: false,
              createdAt: new Date(),
            };
            updated = [newNotif, ...updated];

            // Also persist to DB (best-effort)
            fetch('/api/notifications', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                type: 'overstay',
                title: newNotif.title,
                message: newNotif.message,
                entity: 'reservation',
                entityId: r.id,
              }),
            }).catch(() => {});
          });
          return updated;
        });
      } catch {
        // Silently ignore — don't break the app if this check fails
      }
    }

    checkOverstays();
    const interval = setInterval(checkOverstays, 15 * 60 * 1000); // every 15 min
    return () => clearInterval(interval);
  }, []);
  // ────────────────────────────────────────────────────────────────────────────

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const showToast = useCallback((toast: Omit<Toast, 'id'>) => {
    const id = `toast-${Date.now()}-${Math.random()}`;
    setToasts((prev) => [...prev, { ...toast, id }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const markAllAsRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    fetch('/api/notifications', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ all: true }),
    }).catch(() => {});
  }, []);

  const markAsRead = useCallback((id: number) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
    );
    fetch('/api/notifications', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    }).catch(() => {});
  }, []);

  const addNotification = useCallback(
    (n: Omit<AppNotification, 'id' | 'createdAt' | 'isRead'>) => {
      // Optimistic local entry so the bell updates instantly...
      const tempId = Date.now();
      const optimistic: AppNotification = { ...n, id: tempId, isRead: false, createdAt: new Date() };
      setNotifications((prev) => [optimistic, ...prev]);

      // ...then persist to the DB and swap in the real record (real id).
      fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(n),
      })
        .then((r) => (r.ok ? r.json() : null))
        .then((saved) => {
          if (saved) {
            setNotifications((prev) => prev.map((item) => (item.id === tempId ? saved : item)));
          }
        })
        .catch(() => {});
    },
    []
  );

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        toasts,
        showToast,
        dismissToast,
        markAllAsRead,
        markAsRead,
        addNotification,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

/* ─── Hook ────────────────────────────────────────────────────────────────── */
export function useNotifications() {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error('useNotifications must be used within NotificationProvider');
  return ctx;
}
