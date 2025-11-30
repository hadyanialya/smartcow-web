import { supabase } from '../lib/supabase';
import { UserRole } from '../App';
import { pushNotification } from '../utils/notifications';

export interface UserData {
  id: string;
  name: string;
  email: string;
  password: string; // For backward compatibility, but we'll use Supabase auth
  role: UserRole;
  createdAt: string;
  status: 'active' | 'pending' | 'banned' | 'suspended';
  lastLogin?: string;
  deletedAt?: string | null;
}

// Convert Supabase user to UserData format
function supabaseToUserData(row: any): UserData {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    password: '', // Don't expose password
    role: row.role as UserRole,
    createdAt: row.created_at,
    status: row.status,
    lastLogin: row.last_login || undefined,
    deletedAt: row.deleted_at || null,
  };
}

// Get all users from Supabase
export async function getUsers(includeDeleted = false): Promise<UserData[]> {
  try {
    let query = supabase.from('users').select('*');
    
    if (!includeDeleted) {
      query = query.is('deleted_at', null);
    }
    
    const { data, error } = await query.order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching users:', error);
      return [];
    }
    
    return (data || []).map(supabaseToUserData);
  } catch (error) {
    console.error('Error in getUsers:', error);
    return [];
  }
}

// Get admin account (always available)
export function getAdminAccount(): UserData {
  return {
    id: '00000000-0000-0000-0000-000000000001',
    name: 'Administrator',
    email: 'admin@smartcow.com',
    password: 'admin123',
    role: 'admin',
    createdAt: new Date('2025-01-01').toISOString(),
    status: 'active',
    lastLogin: undefined,
    deletedAt: null,
  };
}

// Register new user
export async function registerUser(
  name: string,
  email: string,
  password: string,
  role: UserRole
): Promise<{ success: boolean; message: string; user?: UserData }> {
  try {
    // Check if email already exists
    const { data: existing, error: checkError } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .is('deleted_at', null)
      .maybeSingle(); // Use maybeSingle instead of single to handle no results
    
    if (checkError && checkError.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error('Error checking existing user:', checkError);
    }
    
    if (existing) {
      return { success: false, message: 'Email already registered' };
    }
    
    // Create user in Supabase
    const { data, error } = await supabase
      .from('users')
      .insert({
        name,
        email,
        password, // TODO: Hash password properly in production
        role,
        status: 'active',
        created_at: new Date().toISOString(),
      })
      .select()
      .single();
    
    if (error) {
      console.error('❌ Error registering user:', error);
      console.error('❌ Error details:', {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint
      });
      return { success: false, message: error.message || 'Failed to register user' };
    }
    
    console.log('✅ User registered successfully:', data);
    
    const user = supabaseToUserData(data);
    
    // Send notification
    pushNotification(user.id, 'Welcome!', `Welcome to Smart Cow, ${name}!`);
    
    return { success: true, message: 'Registration successful', user };
  } catch (error: any) {
    console.error('Error in registerUser:', error);
    return { success: false, message: error.message || 'Registration failed' };
  }
}

// Login user
export async function loginUser(
  email: string,
  password: string
): Promise<{ success: boolean; message: string; user?: UserData }> {
  try {
    // Find user by email
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .is('deleted_at', null)
      .single();
    
    if (error || !data) {
      return { success: false, message: 'Invalid email or password' };
    }
    
    // Check password (TODO: Use proper password hashing in production)
    if (data.password !== password) {
      return { success: false, message: 'Invalid email or password' };
    }
    
    // Check status
    if (data.status !== 'active') {
      return { success: false, message: `Account is ${data.status}` };
    }
    
    // Update last login
    await supabase
      .from('users')
      .update({ last_login: new Date().toISOString() })
      .eq('id', data.id);
    
    const user = supabaseToUserData(data);
    
    return { success: true, message: 'Login successful', user };
  } catch (error: any) {
    console.error('Error in loginUser:', error);
    return { success: false, message: error.message || 'Login failed' };
  }
}

// Create user by admin
export async function createUserByAdmin(
  name: string,
  email: string,
  password: string,
  role: UserRole
): Promise<{ success: boolean; message: string; user?: UserData }> {
  return registerUser(name, email, password, role);
}

// Search users
export async function searchUsers(query: string): Promise<UserData[]> {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .is('deleted_at', null)
      .or(`name.ilike.%${query}%,email.ilike.%${query}%`)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error searching users:', error);
      return [];
    }
    
    return (data || []).map(supabaseToUserData);
  } catch (error) {
    console.error('Error in searchUsers:', error);
    return [];
  }
}

// Change user role
export async function changeRoleById(userId: string, newRole: UserRole): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('users')
      .update({ role: newRole })
      .eq('id', userId);
    
    if (error) {
      console.error('Error changing role:', error);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Error in changeRoleById:', error);
    return false;
  }
}

// Set user status
export async function setStatusById(
  userId: string,
  status: 'active' | 'pending' | 'banned' | 'suspended'
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('users')
      .update({ status })
      .eq('id', userId);
    
    if (error) {
      console.error('Error setting status:', error);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Error in setStatusById:', error);
    return false;
  }
}

// Reset password by ID
export async function resetPasswordById(userId: string, tempPassword: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('users')
      .update({ password: tempPassword }) // TODO: Hash password properly
      .eq('id', userId);
    
    if (error) {
      console.error('Error resetting password:', error);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Error in resetPasswordById:', error);
    return false;
  }
}

// Delete account by name and role
export async function deleteAccountByNameRole(name: string, role: UserRole): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('users')
      .update({ deleted_at: new Date().toISOString() })
      .eq('name', name)
      .eq('role', role);
    
    if (error) {
      console.error('Error deleting account:', error);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Error in deleteAccountByNameRole:', error);
    return false;
  }
}

// Restore account by ID
export async function restoreAccountById(userId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('users')
      .update({ deleted_at: null })
      .eq('id', userId);
    
    if (error) {
      console.error('Error restoring account:', error);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Error in restoreAccountById:', error);
    return false;
  }
}

// Update password by name and role
export async function updatePasswordByNameRole(
  name: string,
  role: UserRole,
  oldPassword: string,
  newPassword: string
): Promise<{ success: boolean; message: string }> {
  try {
    // Find user
    const { data, error: findError } = await supabase
      .from('users')
      .select('*')
      .eq('name', name)
      .eq('role', role)
      .is('deleted_at', null)
      .single();
    
    if (findError || !data) {
      return { success: false, message: 'User not found' };
    }
    
    // Verify old password
    if (data.password !== oldPassword) {
      return { success: false, message: 'Current password is incorrect' };
    }
    
    // Update password
    const { error: updateError } = await supabase
      .from('users')
      .update({ password: newPassword }) // TODO: Hash password properly
      .eq('id', data.id);
    
    if (updateError) {
      console.error('Error updating password:', updateError);
      return { success: false, message: 'Failed to update password' };
    }
    
    return { success: true, message: 'Password updated successfully' };
  } catch (error: any) {
    console.error('Error in updatePasswordByNameRole:', error);
    return { success: false, message: error.message || 'Failed to update password' };
  }
}

