export type NotificationItem = {
  id: string;
  type: 'user' | 'content' | 'ticket' | 'robot';
  message: string;
  severity: 'info' | 'warning' | 'urgent';
  time: string;
  read?: boolean;
  data?: any;
};

const PREFIX = 'smartcow_notifications:';

function getKey(userId: string) {
  return `${PREFIX}${userId}`;
}

export function getNotifications(userId: string): NotificationItem[] {
  try {
    const saved = localStorage.getItem(getKey(userId));
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
}

export function pushNotification(userId: string, item: NotificationItem) {
  const list = getNotifications(userId);
  const next = [{ ...item, id: Date.now().toString(), time: new Date().toISOString(), read: false }, ...list];
  localStorage.setItem(getKey(userId), JSON.stringify(next));
}

export function markAllRead(userId: string) {
  const list = getNotifications(userId);
  const next = list.map(n => ({ ...n, read: true }));
  localStorage.setItem(getKey(userId), JSON.stringify(next));
}
