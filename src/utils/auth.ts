import { UserRole } from '../App';
import { pushNotification } from './notifications';

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

// Get all users from localStorage
export function getUsers(includeDeleted = false): UserData[] {
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

// Register new user
export function registerUser(name: string, email: string, password: string, role: UserRole): { success: boolean; message: string; user?: UserData } {
  // Prevent admin registration
  if (role === 'admin') {
    return { success: false, message: 'Registrasi sebagai admin tidak diizinkan. Gunakan akun admin yang sudah disediakan.' };
  }

  const users = getUsers(true);
  
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

// Login user
export function loginUser(email: string, password: string): { success: boolean; message: string; user?: UserData } {
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
  const users = getUsers(true);
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
  return { success: true, message: 'Login berhasil!', user };
}

// Check if email exists
export function emailExists(email: string): boolean {
  // Check admin email
  if (email.toLowerCase() === DEFAULT_ADMIN.email.toLowerCase()) {
    return true;
  }
  
  const users = getUsers(true);
  return users.some(u => u.email.toLowerCase() === email.toLowerCase());
}

export function findUserByNameRole(name: string, role: UserRole): UserData | null {
  if (role === 'admin' && DEFAULT_ADMIN.name === name) return DEFAULT_ADMIN;
  const users = getUsers(true);
  return users.find(u => u.name === name && u.role === role) || null;
}

export function isUsernameTaken(name: string, excludeId?: string): boolean {
  if (DEFAULT_ADMIN.name.toLowerCase() === name.toLowerCase() && excludeId !== DEFAULT_ADMIN.id) return true;
  const users = getUsers(true);
  return users.some(u => u.name.toLowerCase() === name.toLowerCase() && u.id !== excludeId);
}

export function updateUserProfileByNameRole(name: string, role: UserRole, patch: Partial<Pick<UserData, 'name' | 'email'>>) {
  if (role === 'admin' && DEFAULT_ADMIN.name === name) {
    // Admin profile is immutable in this demo
    return { success: false, message: 'Admin profile cannot be modified in this demo.' };
  }
  const users = getUsers(true);
  const idx = users.findIndex(u => u.name === name && u.role === role);
  if (idx === -1) return { success: false, message: 'User not found.' };
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
  const users = getUsers(true);
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

export function deleteAccountByNameRole(name: string, role: UserRole) {
  if (role === 'admin' && DEFAULT_ADMIN.name === name) {
    return { success: false, message: 'Admin account cannot be deleted.' };
  }
  const users = getUsers(true);
  const idx = users.findIndex(u => u.name === name && u.role === role);
  if (idx === -1) return { success: false, message: 'User not found.' };
  const current = users[idx];
  users[idx] = { ...current, deletedAt: new Date().toISOString() };
  localStorage.setItem('smartcow_users', JSON.stringify(users));
  return { success: true, message: 'Account deleted.' };
}

export function restoreAccountById(id: string) {
  const users = getUsers(true);
  const idx = users.findIndex(u => u.id === id);
  if (idx === -1) return { success: false, message: 'User not found.' };
  users[idx] = { ...users[idx], deletedAt: null };
  localStorage.setItem('smartcow_users', JSON.stringify(users));
  return { success: true, message: 'Account restored.' };
}

export function changeRoleById(id: string, role: UserRole) {
  if (role === 'admin') {
    return { success: false, message: 'Cannot promote to admin in this demo.' };
  }
  const users = getUsers(true);
  const idx = users.findIndex(u => u.id === id);
  if (idx === -1) return { success: false, message: 'User not found.' };
  users[idx] = { ...users[idx], role };
  localStorage.setItem('smartcow_users', JSON.stringify(users));
  return { success: true, message: 'Role updated.' };
}

export function setStatusById(id: string, status: UserData['status']) {
  const users = getUsers(true);
  const idx = users.findIndex(u => u.id === id);
  if (idx === -1) return { success: false, message: 'User not found.' };
  users[idx] = { ...users[idx], status };
  localStorage.setItem('smartcow_users', JSON.stringify(users));
  return { success: true, message: 'Status updated.' };
}

export function resetPasswordById(id: string, tempPassword: string) {
  const users = getUsers(true);
  const idx = users.findIndex(u => u.id === id);
  if (idx === -1) return { success: false, message: 'User not found.' };
  users[idx] = { ...users[idx], password: tempPassword };
  localStorage.setItem('smartcow_users', JSON.stringify(users));
  return { success: true, message: 'Password reset.' };
}

export function createUserByAdmin(name: string, email: string, tempPassword: string, role: UserRole) {
  if (role === 'admin') {
    return { success: false, message: 'Cannot create admin accounts in this demo.' };
  }
  const users = getUsers(true);
  if (users.some(u => u.email.toLowerCase() === email.toLowerCase())) {
    return { success: false, message: 'Email sudah terdaftar.' };
  }
  const newUser: UserData = {
    id: Date.now().toString(),
    name: name.trim(),
    email: email.toLowerCase().trim(),
    password: tempPassword,
    role,
    createdAt: new Date().toISOString(),
    status: 'active',
    lastLogin: undefined,
    deletedAt: null,
  };
  users.push(newUser);
  localStorage.setItem('smartcow_users', JSON.stringify(users));
  return { success: true, message: 'User created.', user: newUser };
}

export function searchUsers(keyword: string, role?: UserRole, status?: UserData['status']) {
  const list = getUsers();
  return list.filter(u => {
    const matchesKeyword = keyword ? (u.name.toLowerCase().includes(keyword.toLowerCase()) || u.email.toLowerCase().includes(keyword.toLowerCase())) : true;
    const matchesRole = role ? u.role === role : true;
    const matchesStatus = status ? u.status === status : true;
    return matchesKeyword && matchesRole && matchesStatus;
  });
}

