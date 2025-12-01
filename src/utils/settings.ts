import { UserRole } from '../App';
import * as supabaseSettings from '../services/supabaseSettings';

// Check if Supabase is configured
const isSupabaseConfigured = () => {
  const url = import.meta.env.VITE_SUPABASE_URL;
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
  return !!(url && key && url.trim() !== '' && key.trim() !== '');
};

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

export async function loadSettings(userId: string, role: UserRole | null, defaults?: Partial<UserSettings>): Promise<UserSettings> {
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
  
  // Try Supabase first if configured
  if (isSupabaseConfigured() && role) {
    try {
      const supabaseSettingsData = await supabaseSettings.getUserSettings(userId, role);
      if (supabaseSettingsData) {
        // Merge with base to ensure all fields exist
        const merged = { ...base, ...supabaseSettingsData, ...(defaults || {}) } as UserSettings;
        // Also save to localStorage as backup
        const key = `${SETTINGS_PREFIX}${userId}`;
        localStorage.setItem(key, JSON.stringify(merged));
        return merged;
      }
    } catch (error) {
      console.error('Error loading settings from Supabase:', error);
      // Fallback to localStorage
    }
  }
  
  // Fallback to localStorage
  const key = `${SETTINGS_PREFIX}${userId}`;
  const saved = localStorage.getItem(key);
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

// Synchronous version for backward compatibility (deprecated, use async version)
export function loadSettingsSync(userId: string, role: UserRole | null, defaults?: Partial<UserSettings>): UserSettings {
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
  
  const key = `${SETTINGS_PREFIX}${userId}`;
  const saved = localStorage.getItem(key);
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

export async function saveSettings(userId: string, settings: UserSettings, role?: UserRole | null) {
  const next = { ...settings, lastUpdated: new Date().toISOString() };
  
  // Save to Supabase if configured
  if (isSupabaseConfigured() && role) {
    try {
      await supabaseSettings.saveUserSettings(userId, role, next);
    } catch (error) {
      console.error('Error saving settings to Supabase:', error);
      // Continue with localStorage save as fallback
    }
  }
  
  // Always save to localStorage as backup
  const key = `${SETTINGS_PREFIX}${userId}`;
  localStorage.setItem(key, JSON.stringify(next));
}

export async function updateSettings(userId: string, patch: Partial<UserSettings>, role?: UserRole | null) {
  const current = await loadSettings(userId, role || null);
  const next = { ...current, ...patch, lastUpdated: new Date().toISOString() } as UserSettings;
  
  // Save to Supabase if configured
  if (isSupabaseConfigured() && role) {
    try {
      await supabaseSettings.saveUserSettings(userId, role, next);
    } catch (error) {
      console.error('Error updating settings in Supabase:', error);
    }
  }
  
  // Always save to localStorage as backup
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

