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

// Get admin account
export function getAdminAccount(): UserData {
  return {
    id: '00000000-0000-0000-0000-000000000001',
    name: 'Administrator',
    email: 'admin@smartcow.com',
    password: 'admin123',
    role: 'admin',
    createdAt: new Date('2025-01-01').toISOString(),
    status: 'active',
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
    const { data: existingEmail } = await supabase
      .from('users')
      .select('id')
      .eq('email', email.toLowerCase())
      .is('deleted_at', null)
      .maybeSingle();
    
    if (existingEmail) {
      return { success: false, message: 'Email already registered' };
    }
    
    // Check if name already exists for this role
    const { data: existingName } = await supabase
      .from('users')
      .select('id')
      .eq('name', name)
      .eq('role', role)
      .is('deleted_at', null)
      .maybeSingle();
    
    if (existingName) {
      return { success: false, message: 'Username already taken for this role' };
    }
    
    const { data, error } = await supabase
      .from('users')
      .insert({
        name,
        email: email.toLowerCase(),
        password, // TODO: Hash password properly in production
        role,
        status: 'active',
        created_at: new Date().toISOString(),
      })
      .select()
      .single();
    
    if (error) {
      console.error('❌ Error registering user:', error);
      console.error('❌ Error details:', { name, email, role, error });
      return { success: false, message: error.message || 'Failed to register user' };
    }
    
    const newUser = supabaseToUserData(data);
    console.log('✅ User registered successfully:', newUser.name);
    return { success: true, message: 'Registration successful!', user: newUser };
  } catch (error: any) {
    console.error('❌ Error in registerUser:', error);
    return { success: false, message: error.message || 'Registration failed' };
  }
}

// Login user
export async function loginUser(
  email: string,
  password: string
): Promise<{ success: boolean; message: string; user?: UserData }> {
  try {
    // Check admin first
    const admin = getAdminAccount();
    if (admin.email.toLowerCase() === email.toLowerCase() && admin.password === password) {
      return { success: true, message: 'Login successful!', user: admin };
    }
    
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email.toLowerCase())
      .is('deleted_at', null)
      .maybeSingle();
    
    if (error || !data) {
      return { success: false, message: 'Email atau password salah.' };
    }
    
    if (data.password !== password) {
      return { success: false, message: 'Email atau password salah.' };
    }
    
    if (data.deleted_at) {
      return { success: false, message: 'Akun ini telah dihapus sementara.' };
    }
    
    if (data.status === 'banned') {
      return { success: false, message: 'Akun diblokir.' };
    }
    
    if (data.status === 'suspended') {
      return { success: false, message: 'Akun ditangguhkan sementara.' };
    }
    
    // Update last login
    await supabase
      .from('users')
      .update({ last_login: new Date().toISOString() })
      .eq('id', data.id);
    
    const user = supabaseToUserData(data);
    return { success: true, message: 'Login berhasil!', user };
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
export async function searchUsers(
  query: string,
  roleFilter?: UserRole,
  statusFilter?: 'active' | 'pending' | 'banned' | 'suspended',
  usersList?: UserData[]
): Promise<UserData[]> {
  try {
    let users: UserData[];
    
    if (usersList) {
      users = usersList;
    } else {
      users = await getUsers(true);
    }
    
    let filtered = users.filter(u => {
      const matchesQuery = !query || 
        u.name.toLowerCase().includes(query.toLowerCase()) ||
        u.email.toLowerCase().includes(query.toLowerCase());
      const matchesRole = !roleFilter || u.role === roleFilter;
      const matchesStatus = !statusFilter || u.status === statusFilter;
      return matchesQuery && matchesRole && matchesStatus;
    });
    
    return filtered;
  } catch (error) {
    console.error('Error in searchUsers:', error);
    return [];
  }
}

// Update user profile by name and role (or by ID if provided)
export async function updateUserProfileByNameRole(
  name: string,
  role: UserRole,
  patch: Partial<Pick<UserData, 'name' | 'email'>>,
  userId?: string
): Promise<{ success: boolean; message: string; user?: UserData }> {
  try {
    console.log('🔍 Searching for user:', { name, role, userId });
    
    let userData: any = null;
    
    // If userId is provided, use it directly (more reliable)
    if (userId) {
      const { data, error: findError } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .is('deleted_at', null)
        .maybeSingle();
      
      if (findError) {
        console.error('❌ Error finding user by ID:', findError);
        // Fallback to name/role search
      } else if (data) {
        userData = data;
        console.log('✅ User found by ID:', { id: userData.id, name: userData.name, role: userData.role });
      }
    }
    
    // If not found by ID, try by name and role
    if (!userData) {
      const { data, error: findError } = await supabase
        .from('users')
        .select('*')
        .eq('name', name)
        .eq('role', role)
        .is('deleted_at', null)
        .maybeSingle();
      
      if (findError) {
        console.error('❌ Error finding user:', findError);
        console.error('❌ Error details:', { name, role, error: findError });
        return { success: false, message: `Error finding user: ${findError.message}` };
      }
      
      if (!data) {
        console.error('❌ User not found in Supabase:', { name, role });
        // Try to get all users to see what's in the database
        const { data: allUsers } = await supabase
          .from('users')
          .select('name, role, email')
          .is('deleted_at', null)
          .limit(10);
        console.log('📋 Available users in database:', allUsers);
        
        // Try to find user by email from localStorage (if user exists in localStorage but not in Supabase)
        // This handles migration case where user was created before Supabase migration
        console.log('🔄 Attempting to sync user from localStorage...');
        try {
          const localStorageUsers = JSON.parse(localStorage.getItem('smartcow_users') || '[]');
          console.log('📦 localStorage users:', localStorageUsers.length, 'users found');
          const localUser = localStorageUsers.find((u: any) => {
            const nameMatch = u.name && u.name.trim().toLowerCase() === name.trim().toLowerCase();
            const roleMatch = u.role === role;
            return nameMatch && roleMatch;
          });
          console.log('🔍 Looking for user:', { name, role, found: !!localUser });
          if (localUser && localUser.email && localUser.password) {
            console.log('📦 Found user in localStorage, attempting to register in Supabase:', { name, email: localUser.email, role });
            // Try to register user in Supabase (this will create the user if it doesn't exist)
            const registerResult = await registerUser(localUser.name, localUser.email, localUser.password, localUser.role);
            let syncedUserData: any = null;
            
            if (registerResult.success && registerResult.user) {
              console.log('✅ User synced to Supabase, ID:', registerResult.user.id);
              // Get the full user data from Supabase
              const { data: fullUserData } = await supabase
                .from('users')
                .select('*')
                .eq('id', registerResult.user.id)
                .maybeSingle();
              if (fullUserData) {
                syncedUserData = fullUserData;
              }
            } else {
              console.error('❌ Failed to sync user to Supabase:', registerResult.message);
              // If email already exists, try to find by email instead
              if (registerResult.message.includes('already') || registerResult.message.includes('Email')) {
                const { data: existingUser } = await supabase
                  .from('users')
                  .select('*')
                  .eq('email', localUser.email.toLowerCase())
                  .is('deleted_at', null)
                  .maybeSingle();
                if (existingUser) {
                  console.log('✅ Found existing user by email, ID:', existingUser.id);
                  syncedUserData = existingUser;
                }
              }
            }
            
            // If we found/synced the user, proceed with update
            if (syncedUserData) {
              // Check for conflicts
              if (patch.name && patch.name !== name) {
                const { data: nameConflict } = await supabase
                  .from('users')
                  .select('id')
                  .eq('name', patch.name)
                  .eq('role', role)
                  .neq('id', syncedUserData.id)
                  .is('deleted_at', null)
                  .maybeSingle();
                
                if (nameConflict) {
                  return { success: false, message: 'Username already taken for this role.' };
                }
              }
              
              if (patch.email && patch.email.toLowerCase() !== syncedUserData.email.toLowerCase()) {
                const { data: emailConflict } = await supabase
                  .from('users')
                  .select('id')
                  .eq('email', patch.email.toLowerCase())
                  .neq('id', syncedUserData.id)
                  .is('deleted_at', null)
                  .maybeSingle();
                
                if (emailConflict) {
                  return { success: false, message: 'Email already registered.' };
                }
              }
              
              // Update user
              const updateData: any = {};
              if (patch.name) updateData.name = patch.name;
              if (patch.email) updateData.email = patch.email.toLowerCase();
              
              const { data: updated, error: updateError } = await supabase
                .from('users')
                .update(updateData)
                .eq('id', syncedUserData.id)
                .select()
                .single();
              
              if (updateError) {
                console.error('Error updating synced user:', updateError);
                return { success: false, message: 'Failed to update profile.' };
              }
              
              const updatedUser = supabaseToUserData(updated);
              console.log('✅ Profile updated successfully after sync');
              return { success: true, message: 'Profile updated successfully.', user: updatedUser };
            }
          } else {
            console.log('⚠️ User not found in localStorage or missing email/password');
          }
        } catch (syncError) {
          console.error('❌ Error syncing user from localStorage:', syncError);
        }
        
        return { success: false, message: 'User not found. Please logout and login again to sync your account, or contact support.' };
      }
      
      userData = data;
      console.log('✅ User found by name/role:', { id: userData.id, name: userData.name, role: userData.role });
    }
    
    // Check if new name/email conflicts with existing users
    if (patch.name && patch.name !== name) {
      const { data: nameConflict } = await supabase
        .from('users')
        .select('id')
        .eq('name', patch.name)
        .eq('role', role)
        .neq('id', userData.id)
        .is('deleted_at', null)
        .maybeSingle();
      
      if (nameConflict) {
        return { success: false, message: 'Username already taken for this role.' };
      }
    }
    
    if (patch.email && patch.email.toLowerCase() !== userData.email.toLowerCase()) {
      const { data: emailConflict } = await supabase
        .from('users')
        .select('id')
        .eq('email', patch.email.toLowerCase())
        .neq('id', userData.id)
        .is('deleted_at', null)
        .maybeSingle();
      
      if (emailConflict) {
        return { success: false, message: 'Email already registered.' };
      }
    }
    
    // Update user
    const updateData: any = {};
    if (patch.name) updateData.name = patch.name;
    if (patch.email) updateData.email = patch.email.toLowerCase();
    
    const { data: updated, error: updateError } = await supabase
      .from('users')
      .update(updateData)
      .eq('id', userData.id)
      .select()
      .single();
    
    if (updateError) {
      console.error('Error updating profile:', updateError);
      return { success: false, message: 'Failed to update profile.' };
    }
    
    const updatedUser = supabaseToUserData(updated);
    return { success: true, message: 'Profile updated successfully.', user: updatedUser };
  } catch (error: any) {
    console.error('Error in updateUserProfileByNameRole:', error);
    return { success: false, message: error.message || 'Failed to update profile.' };
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
    console.log('🔐 Resetting password for userId:', userId);
    
    // First, check if user exists
    const { data: userData, error: findError } = await supabase
      .from('users')
      .select('id, name, email')
      .eq('id', userId)
      .maybeSingle();
    
    if (findError) {
      console.error('❌ Error finding user:', findError);
      return false;
    }
    
    if (!userData) {
      console.error('❌ User not found with id:', userId);
      return false;
    }
    
    console.log('✅ User found:', { id: userData.id, name: userData.name, email: userData.email });
    
    // Update password
    const { error } = await supabase
      .from('users')
      .update({ password: tempPassword }) // TODO: Hash password properly
      .eq('id', userId);
    
    if (error) {
      console.error('❌ Error resetting password:', error);
      return false;
    }
    
    console.log('✅ Password reset successfully');
    return true;
  } catch (error) {
    console.error('❌ Error in resetPasswordById:', error);
    return false;
  }
}

// Delete account by name and role (permanently)
export async function deleteAccountByNameRole(name: string, role: UserRole): Promise<boolean> {
  try {
    // Permanently delete from database
    const { error } = await supabase
      .from('users')
      .delete()
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
      .maybeSingle();
    
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
