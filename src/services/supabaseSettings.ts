import { supabase } from '../lib/supabase';
import type { UserSettings } from '../utils/settings';

// Check if Supabase is configured
const isSupabaseConfigured = () => {
  const url = import.meta.env.VITE_SUPABASE_URL;
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
  return !!(url && key && url.trim() !== '' && key.trim() !== '');
};

// Get user settings
export async function getUserSettings(userId: string, role: string): Promise<UserSettings | null> {
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from('user_settings')
        .select('settings')
        .eq('user_id', userId)
        .eq('role', role)
        .maybeSingle();
      
      if (error) {
        console.error('Error fetching user settings:', error);
        // No settings found yet
        return null;
      }
      
      if (data && data.settings) {
        return data.settings as UserSettings;
      }
    } catch (error) {
      console.error('Error fetching user settings from Supabase:', error);
    }
  }
  
  return null;
}

// Save user settings
export async function saveUserSettings(userId: string, role: string, settings: UserSettings): Promise<boolean> {
  if (isSupabaseConfigured()) {
    try {
      // Use upsert to handle both insert and update in one operation
      // This avoids the 406 error from checking first
      const { error } = await supabase
        .from('user_settings')
        .upsert({
          user_id: userId,
          role: role,
          settings: settings as any,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'user_id,role',
          ignoreDuplicates: false
        });
      
      if (error) {
        console.error('Error saving user settings in Supabase:', error);
        console.error('Error details:', { userId, role, error });
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('Error in saveUserSettings:', error);
    }
  }
  
  return false;
}

