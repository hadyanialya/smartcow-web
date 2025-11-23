import { UserRole } from '../App';

export type NotificationPrefs = {
  chat: boolean;
  forumReplies: boolean;
  articles: boolean;
  marketplace: boolean;
  system: boolean;
};

export type PrivacyPrefs = {
  allowMessages: boolean;
  publicProfile: boolean;
  showLastSeen: boolean;
  allowTagging: boolean;
};

export type RoleSpecific = {
  farmer?: {
    farmInfo?: string;
    cropPreferences?: string[];
  };
  buyer?: {
    deliveryPreferences?: string;
    autoFillAddress?: boolean;
  };
  compost_processor?: {
    facilityInfo?: string;
    materialAcceptance?: string;
  };
  admin?: {
    enableUserManagementShortcuts?: boolean;
    analyticsAccess?: boolean;
    permissionManagement?: boolean;
  };
};

export type SecuritySettings = {
  twoFactorEnabled: boolean;
  twoFactorMethod?: 'sms' | 'email' | 'app' | null;
  activeSessions: { id: string; device: string; lastActive: string }[];
};

export type ProfileSettings = {
  fullName: string;
  username: string;
  email: string;
  phone?: string;
  address?: string;
  profilePicture?: string | null; // base64 or url
  showRoleLabel?: boolean;
};

export type UserSettings = {
  profile: ProfileSettings;
  security: SecuritySettings;
  notifications: NotificationPrefs;
  privacy: PrivacyPrefs;
  roleSpecific: RoleSpecific;
  darkMode: boolean;
  activityLog: { id: string; type: string; description: string; time: string }[];
  lastUpdated: string;
};

const SETTINGS_PREFIX = 'smartcow_settings:';

export function loadSettings(userId: string, role: UserRole, defaults?: Partial<UserSettings>): UserSettings {
  const key = `${SETTINGS_PREFIX}${userId}`;
  const saved = localStorage.getItem(key);
  const base: UserSettings = {
    profile: {
      fullName: userId.split(':')[1] || 'User',
      username: userId.split(':')[1] || 'user',
      email: '',
      phone: '',
      address: '',
      profilePicture: null,
      showRoleLabel: role !== 'admin',
    },
    security: {
      twoFactorEnabled: false,
      twoFactorMethod: null,
      activeSessions: [],
    },
    notifications: {
      chat: true,
      forumReplies: true,
      articles: true,
      marketplace: true,
      system: true,
    },
    privacy: {
      allowMessages: true,
      publicProfile: true,
      showLastSeen: true,
      allowTagging: true,
    },
    roleSpecific: {},
    darkMode: false,
    activityLog: [],
    lastUpdated: new Date().toISOString(),
  };
  if (!saved) {
    const merged = { ...base, ...(defaults || {}) } as UserSettings;
    localStorage.setItem(key, JSON.stringify(merged));
    return merged;
  }
  try {
    const parsed = JSON.parse(saved);
    return { ...base, ...parsed } as UserSettings;
  } catch {
    localStorage.setItem(key, JSON.stringify(base));
    return base;
  }
}

export function saveSettings(userId: string, settings: UserSettings) {
  const key = `${SETTINGS_PREFIX}${userId}`;
  const next = { ...settings, lastUpdated: new Date().toISOString() };
  localStorage.setItem(key, JSON.stringify(next));
}

export function updateSettings(userId: string, patch: Partial<UserSettings>) {
  const current = loadSettings(userId, null);
  const next = { ...current, ...patch, lastUpdated: new Date().toISOString() } as UserSettings;
  localStorage.setItem(`${SETTINGS_PREFIX}${userId}`, JSON.stringify(next));
  return next;
}

export function appendActivity(userId: string, entry: { type: string; description: string }) {
  const current = loadSettings(userId, null);
  const e = { id: `act-${Date.now()}`, type: entry.type, description: entry.description, time: new Date().toISOString() };
  const next = { ...current, activityLog: [e, ...current.activityLog].slice(0, 100), lastUpdated: new Date().toISOString() };
  localStorage.setItem(`${SETTINGS_PREFIX}${userId}`, JSON.stringify(next));
  return e;
}

