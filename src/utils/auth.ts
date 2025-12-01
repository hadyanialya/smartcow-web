import { UserRole } from '../App';
import { pushNotification } from './notifications';
import { supabase } from '../lib/supabase';

export interface UserData {
  id: string;
  name: string;
  email: string;
  password: string;
  role: UserRole;
  createdAt: string;
  status: 'active' | 'pending' | 'banned' | 'suspended';
  lastLogin?: string;
  deletedAt?: string | null;
}

const STORAGE_KEY = 'smartcow_users';

// Check if Supabase is configured
const isSupabaseConfigured = () => {
  const url = import.meta.env.VITE_SUPABASE_URL;
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
  return !!(url && key && url.trim() !== '' && key.trim() !== '');
};

// Import Supabase auth functions (will be used if configured)
let supabaseAuth: typeof import('../services/supabaseAuth') | null = null;
if (isSupabaseConfigured()) {
  try {
    // Dynamic import to avoid issues if module not available
    import('../services/supabaseAuth').then(module => {
      supabaseAuth = module;
      console.log('✅ Supabase authentication enabled');
    }).catch(() => {
      console.warn('⚠️ Supabase auth module not available, using localStorage');
    });
  } catch (e) {
    console.warn('⚠️ Supabase auth module not available, using localStorage');
  }
} else {
  console.log('ℹ️ Supabase not configured, using localStorage');
}

// Default admin account (pre-configured)
const DEFAULT_ADMIN: UserData = {
  id: 'admin-001',
  name: 'Administrator',
  email: 'admin@smartcow.com',
  password: 'admin123',
  role: 'admin',
  createdAt: new Date('2025-01-01').toISOString(),
  status: 'active',
  lastLogin: undefined,
  deletedAt: null,
};

// Get all users - uses Supabase if configured, otherwise localStorage
export async function getUsers(includeDeleted = false): Promise<UserData[]> {
  // Use Supabase if configured
  if (isSupabaseConfigured()) {
    try {
      const supabaseAuth = await import('../services/supabaseAuth');
      return await supabaseAuth.getUsers(includeDeleted);
    } catch (error) {
      console.error('Error using Supabase auth:', error);
      // Fallback to localStorage
    }
  }
  
  // Fallback to localStorage
  const usersJson = localStorage.getItem(STORAGE_KEY);
  if (!usersJson) return [];
  try {
    const list = JSON.parse(usersJson) as UserData[];
    return includeDeleted ? list : list.filter(u => !u.deletedAt);
  } catch {
    return [];
  }
}

// Synchronous version for backward compatibility (deprecated, use async version)
export function getUsersSync(includeDeleted = false): UserData[] {
  const usersJson = localStorage.getItem(STORAGE_KEY);
  if (!usersJson) return [];
  try {
    const list = JSON.parse(usersJson) as UserData[];
    return includeDeleted ? list : list.filter(u => !u.deletedAt);
  } catch {
    return [];
  }
}

// Get admin account (always available)
export function getAdminAccount(): UserData {
  return DEFAULT_ADMIN;
}

// Save users to localStorage
function saveUsers(users: UserData[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(users));
}

// Register new user - uses Supabase if configured, otherwise localStorage
export async function registerUser(name: string, email: string, password: string, role: UserRole): Promise<{ success: boolean; message: string; user?: UserData }> {
  // Use Supabase if configured
  if (isSupabaseConfigured()) {
    try {
      const supabaseAuth = await import('../services/supabaseAuth');
      return await supabaseAuth.registerUser(name, email, password, role);
    } catch (error) {
      console.error('Error using Supabase auth:', error);
      // Fallback to localStorage
    }
  }
  
  // Fallback to localStorage
  // Prevent admin registration
  if (role === 'admin') {
    return { success: false, message: 'Registrasi sebagai admin tidak diizinkan. Gunakan akun admin yang sudah disediakan.' };
  }

  const users = await getUsers(true);
  
  // Check if email already exists (including admin email)
  if (users.some(u => u.email.toLowerCase() === email.toLowerCase()) || 
      email.toLowerCase() === DEFAULT_ADMIN.email.toLowerCase()) {
    return { success: false, message: 'Email sudah terdaftar. Silakan gunakan email lain atau login.' };
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return { success: false, message: 'Format email tidak valid.' };
  }

  // Validate password length
  if (password.length < 6) {
    return { success: false, message: 'Kata sandi minimal 6 karakter.' };
  }

  // Validate name
  if (name.trim().length < 2) {
    return { success: false, message: 'Nama minimal 2 karakter.' };
  }

  // Create new user
  const newUser: UserData = {
    id: Date.now().toString(),
    name: name.trim(),
    email: email.toLowerCase().trim(),
    password,
    role,
    createdAt: new Date().toISOString(),
    status: 'active',
    lastLogin: undefined,
    deletedAt: null,
  };

  users.push(newUser);
  saveUsers(users);

  try {
    pushNotification('admin:Administrator', { id: '', type: 'user', message: `New ${role} registration: ${newUser.name}`, severity: 'info', time: new Date().toISOString() });
  } catch {}
  return { success: true, message: 'Registrasi berhasil! Akun Anda aktif.', user: newUser };
}

// Login user - uses Supabase if configured, otherwise localStorage
export async function loginUser(email: string, password: string): Promise<{ success: boolean; message: string; user?: UserData }> {
  // Use Supabase if configured
  if (isSupabaseConfigured()) {
    try {
      const supabaseAuth = await import('../services/supabaseAuth');
      return await supabaseAuth.loginUser(email, password);
    } catch (error) {
      console.error('Error using Supabase auth:', error);
      // Fallback to localStorage
    }
  }
  
  // Fallback to localStorage
  // Check admin account first
  if (email.toLowerCase() === DEFAULT_ADMIN.email.toLowerCase()) {
    if (password === DEFAULT_ADMIN.password) {
      DEFAULT_ADMIN.lastLogin = new Date().toISOString();
      return { success: true, message: 'Login berhasil!', user: DEFAULT_ADMIN };
    } else {
      return { success: false, message: 'Kata sandi salah.' };
    }
  }

  // Check regular users
  const users = await getUsers(true); // Make sure this is awaited
  const user = users.find(u => u.email.toLowerCase() === email.toLowerCase());
  
  if (!user) {
    return { success: false, message: 'Email tidak terdaftar. Silakan registrasi terlebih dahulu.' };
  }

  if (user.password !== password) {
    return { success: false, message: 'Kata sandi salah.' };
  }

  if (user.deletedAt) {
    return { success: false, message: 'Akun ini telah dihapus sementara.' };
  }

  if (user.status === 'banned') {
    return { success: false, message: 'Akun diblokir.' };
  }

  if (user.status === 'suspended') {
    return { success: false, message: 'Akun ditangguhkan sementara.' };
  }

  user.lastLogin = new Date().toISOString();
  saveUsers(users);
  
  // If user doesn't have a proper ID (UUID), try to sync to Supabase
  if (isSupabaseConfigured() && (!user.id || !user.id.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i))) {
    console.log('🔄 User from localStorage has invalid ID, attempting to sync to Supabase...');
    try {
      const supabaseAuth = await import('../services/supabaseAuth');
      // Check if user exists in Supabase by email
      const { data: existingUser } = await supabase
        .from('users')
        .select('*')
        .eq('email', user.email.toLowerCase())
        .is('deleted_at', null)
        .maybeSingle();
      
      if (existingUser) {
        // User exists in Supabase, use that ID
        const syncedUser = {
          ...user,
          id: existingUser.id,
          status: existingUser.status || 'active',
          createdAt: existingUser.created_at,
          lastLogin: existingUser.last_login || undefined,
          deletedAt: existingUser.deleted_at || null,
        };
        console.log('✅ Found user in Supabase, using ID:', syncedUser.id);
        return { success: true, message: 'Login berhasil!', user: syncedUser };
      } else {
        // User doesn't exist in Supabase, register it
        const registerResult = await supabaseAuth.registerUser(user.name, user.email, user.password, user.role);
        if (registerResult.success && registerResult.user) {
          console.log('✅ User synced to Supabase, using ID:', registerResult.user.id);
          return { success: true, message: 'Login berhasil!', user: registerResult.user };
        }
      }
    } catch (syncError) {
      console.error('❌ Error syncing user to Supabase during login:', syncError);
    }
  }
  
  return { success: true, message: 'Login berhasil!', user };
}

// Check if email exists
export function emailExists(email: string): boolean {
  // Check admin email
  if (email.toLowerCase() === DEFAULT_ADMIN.email.toLowerCase()) {
    return true;
  }
  
  const users = getUsersSync(true);
  return users.some(u => u.email.toLowerCase() === email.toLowerCase());
}

export function findUserByNameRole(name: string, role: UserRole): UserData | null {
  if (role === 'admin' && DEFAULT_ADMIN.name === name) return DEFAULT_ADMIN;
  const users = getUsersSync(true);
  return users.find(u => u.name === name && u.role === role) || null;
}

export function isUsernameTaken(name: string, excludeId?: string): boolean {
  if (DEFAULT_ADMIN.name.toLowerCase() === name.toLowerCase() && excludeId !== DEFAULT_ADMIN.id) return true;
  const users = getUsersSync(true);
  return users.some(u => u.name.toLowerCase() === name.toLowerCase() && u.id !== excludeId);
}

export async function updateUserProfileByNameRole(name: string, role: UserRole, patch: Partial<Pick<UserData, 'name' | 'email'>>, userId?: string): Promise<{ success: boolean; message: string; user?: UserData }> {
  if (role === 'admin' && DEFAULT_ADMIN.name === name) {
    // Admin profile is immutable in this demo
    return { success: false, message: 'Admin profile cannot be modified in this demo.' };
  }
  
  // Try Supabase first if configured
  if (isSupabaseConfigured()) {
    try {
      const supabaseAuth = await import('../services/supabaseAuth');
      return await supabaseAuth.updateUserProfileByNameRole(name, role, patch, userId);
    } catch (error) {
      console.error('Error updating profile in Supabase:', error);
      // Fallback to localStorage
    }
  }
  
  // Fallback to localStorage
  const users = getUsersSync(true);
  const idx = users.findIndex(u => u.name === name && u.role === role);
  if (idx === -1) {
    // If user not found in localStorage, try to get from Supabase and sync
    if (isSupabaseConfigured()) {
      try {
        const allUsers = await getUsers(true);
        const user = allUsers.find(u => u.name === name && u.role === role);
        if (user) {
          // Sync user to localStorage
          const syncedUsers = getUsersSync(true);
          const existingIdx = syncedUsers.findIndex(u => u.id === user.id);
          if (existingIdx >= 0) {
            syncedUsers[existingIdx] = user;
          } else {
            syncedUsers.push(user);
          }
          localStorage.setItem('smartcow_users', JSON.stringify(syncedUsers));
          
          // Now update
          const updateIdx = syncedUsers.findIndex(u => u.name === name && u.role === role);
          if (updateIdx >= 0) {
            const current = syncedUsers[updateIdx];
            const next = { ...current, ...patch };
            syncedUsers[updateIdx] = next;
            localStorage.setItem('smartcow_users', JSON.stringify(syncedUsers));
            
            // Also update in Supabase
            if (isSupabaseConfigured()) {
              try {
                const supabaseAuth = await import('../services/supabaseAuth');
                await supabaseAuth.updateUserProfileByNameRole(name, role, patch, user.id);
              } catch {}
            }
            
            return { success: true, message: 'Profile updated successfully.', user: next };
          }
        } else {
          // User not found in Supabase either - this means user needs to be synced
          console.log('⚠️ User not found in Supabase, but update was attempted. User may need to logout and login again.');
        }
      } catch (error) {
        console.error('Error syncing user from Supabase:', error);
      }
    }
    return { success: false, message: 'User not found. Please logout and login again to sync your account.' };
  }
  const current = users[idx];
  const next = { ...current, ...patch };
  users[idx] = next;
  localStorage.setItem('smartcow_users', JSON.stringify(users));
  return { success: true, message: 'Profile updated successfully.', user: next };
}

export function updatePasswordByNameRole(name: string, role: UserRole, oldPassword: string, newPassword: string) {
  if (role === 'admin' && DEFAULT_ADMIN.name === name) {
    if (oldPassword !== DEFAULT_ADMIN.password) {
      return { success: false, message: 'Old password does not match.' };
    }
    // Admin password is immutable in this demo
    return { success: false, message: 'Admin password cannot be changed in this demo.' };
  }
  const users = getUsersSync(true);
  const idx = users.findIndex(u => u.name === name && u.role === role);
  if (idx === -1) return { success: false, message: 'User not found.' };
  const current = users[idx];
  if (current.password !== oldPassword) {
    return { success: false, message: 'Old password does not match.' };
  }
  users[idx] = { ...current, password: newPassword };
  localStorage.setItem('smartcow_users', JSON.stringify(users));
  return { success: true, message: 'Password changed successfully.' };
}

export async function deleteAccountByNameRole(name: string, role: UserRole): Promise<{ success: boolean; message: string }> {
  if (role === 'admin' && DEFAULT_ADMIN.name === name) {
    return { success: false, message: 'Admin account cannot be deleted.' };
  }
  
  // Use Supabase if configured
  if (isSupabaseConfigured() && supabaseAuth) {
    try {
      const success = await supabaseAuth.deleteAccountByNameRole(name, role);
      if (success) {
        return { success: true, message: 'Account deleted permanently.' };
      } else {
        return { success: false, message: 'Failed to delete account.' };
      }
    } catch (error) {
      console.error('Error deleting account in Supabase:', error);
      // Fallback to localStorage
    }
  }
  
  // Fallback to localStorage - permanently delete
  const users = getUsersSync(true);
  const idx = users.findIndex(u => u.name === name && u.role === role);
  if (idx === -1) return { success: false, message: 'User not found.' };
  users.splice(idx, 1); // Permanently remove from array
  localStorage.setItem('smartcow_users', JSON.stringify(users));
  return { success: true, message: 'Account deleted permanently.' };
}

export async function restoreAccountById(id: string): Promise<{ success: boolean; message: string }> {
  // Use Supabase if configured
  if (isSupabaseConfigured() && supabaseAuth) {
    try {
      const success = await supabaseAuth.restoreAccountById(id);
      if (success) {
        return { success: true, message: 'Account restored.' };
      } else {
        return { success: false, message: 'Failed to restore account.' };
      }
    } catch (error) {
      console.error('Error restoring account in Supabase:', error);
      // Fallback to localStorage
    }
  }
  
  // Fallback to localStorage
  const users = getUsersSync(true);
  const idx = users.findIndex(u => u.id === id);
  if (idx === -1) return { success: false, message: 'User not found.' };
  users[idx] = { ...users[idx], deletedAt: null };
  localStorage.setItem('smartcow_users', JSON.stringify(users));
  return { success: true, message: 'Account restored.' };
}

export async function changeRoleById(id: string, role: UserRole): Promise<{ success: boolean; message: string }> {
  if (role === 'admin') {
    return { success: false, message: 'Cannot promote to admin in this demo.' };
  }
  
  // Use Supabase if configured
  if (isSupabaseConfigured() && supabaseAuth) {
    try {
      const success = await supabaseAuth.changeRoleById(id, role);
      if (success) {
        return { success: true, message: 'Role updated.' };
      } else {
        return { success: false, message: 'Failed to update role.' };
      }
    } catch (error) {
      console.error('Error updating role in Supabase:', error);
      // Fallback to localStorage
    }
  }
  
  // Fallback to localStorage
  const users = getUsersSync(true);
  const idx = users.findIndex(u => u.id === id);
  if (idx === -1) return { success: false, message: 'User not found.' };
  users[idx] = { ...users[idx], role };
  localStorage.setItem('smartcow_users', JSON.stringify(users));
  return { success: true, message: 'Role updated.' };
}

export async function setStatusById(id: string, status: UserData['status']): Promise<{ success: boolean; message: string }> {
  // Use Supabase if configured
  if (isSupabaseConfigured() && supabaseAuth) {
    try {
      const success = await supabaseAuth.setStatusById(id, status);
      if (success) {
        return { success: true, message: 'Status updated.' };
      } else {
        return { success: false, message: 'Failed to update status.' };
      }
    } catch (error) {
      console.error('Error updating status in Supabase:', error);
      // Fallback to localStorage
    }
  }
  
  // Fallback to localStorage
  const users = getUsersSync(true);
  const idx = users.findIndex(u => u.id === id);
  if (idx === -1) return { success: false, message: 'User not found.' };
  users[idx] = { ...users[idx], status };
  localStorage.setItem('smartcow_users', JSON.stringify(users));
  return { success: true, message: 'Status updated.' };
}

export async function resetPasswordById(id: string, tempPassword: string): Promise<{ success: boolean; message: string }> {
  // Use Supabase if configured
  if (isSupabaseConfigured() && supabaseAuth) {
    try {
      const success = await supabaseAuth.resetPasswordById(id, tempPassword);
      if (success) {
        return { success: true, message: 'Password reset.' };
      } else {
        return { success: false, message: 'Failed to reset password. User not found.' };
      }
    } catch (error) {
      console.error('Error resetting password in Supabase:', error);
      return { success: false, message: 'Failed to reset password. User not found.' };
    }
  }
  
  // Fallback to localStorage
  const users = getUsersSync(true);
  const idx = users.findIndex(u => u.id === id);
  if (idx === -1) return { success: false, message: 'User not found.' };
  users[idx] = { ...users[idx], password: tempPassword };
  localStorage.setItem('smartcow_users', JSON.stringify(users));
  return { success: true, message: 'Password reset.' };
}

export async function createUserByAdmin(name: string, email: string, tempPassword: string, role: UserRole): Promise<{ success: boolean; message: string; user?: UserData }> {
  if (role === 'admin') {
    return { success: false, message: 'Cannot create admin accounts in this demo.' };
  }
  
  // Validate inputs first
  const trimmedName = name.trim();
  const trimmedEmail = email.toLowerCase().trim();
  
  if (trimmedName.length < 2) {
    return { success: false, message: 'Nama minimal 2 karakter.' };
  }
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(trimmedEmail)) {
    return { success: false, message: 'Format email tidak valid.' };
  }
  
  if (tempPassword.length < 6) {
    return { success: false, message: 'Kata sandi minimal 6 karakter.' };
  }
  
  // Use Supabase if configured
  if (isSupabaseConfigured()) {
    try {
      const supabaseAuth = await import('../services/supabaseAuth');
      const result = await supabaseAuth.createUserByAdmin(trimmedName, trimmedEmail, tempPassword, role);
      if (result.success) {
        console.log('✅ User created in Supabase:', result.user?.name);
        return result;
      } else {
        console.error('❌ Failed to create user in Supabase:', result.message);
        // If Supabase fails, fallback to localStorage
      }
    } catch (error: any) {
      console.error('❌ Error creating user in Supabase:', error);
      // Fallback to localStorage
    }
  }
  
  // Fallback to localStorage
  const users = await getUsers(true);
  if (users.some(u => u.email.toLowerCase() === trimmedEmail.toLowerCase())) {
    return { success: false, message: 'Email sudah terdaftar.' };
  }
  
  const newUser: UserData = {
    id: Date.now().toString(),
    name: trimmedName,
    email: trimmedEmail,
    password: tempPassword,
    role,
    createdAt: new Date().toISOString(),
    status: 'active',
    lastLogin: undefined,
    deletedAt: null,
  };
  
  users.push(newUser);
  saveUsers(users);
  console.log('✅ User created in localStorage:', newUser.name);
  return { success: true, message: 'User created successfully.', user: newUser };
}

export function searchUsers(keyword: string, role?: UserRole, status?: UserData['status'], usersList?: UserData[]) {
  // Use provided list or fallback to sync version
  const list = usersList || getUsersSync();
  return list.filter(u => {
    const matchesKeyword = keyword ? (u.name.toLowerCase().includes(keyword.toLowerCase()) || u.email.toLowerCase().includes(keyword.toLowerCase())) : true;
    const matchesRole = role ? u.role === role : true;
    const matchesStatus = status ? u.status === status : true;
    return matchesKeyword && matchesRole && matchesStatus;
  });
}

