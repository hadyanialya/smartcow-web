import { supabase } from '../lib/supabase';

// Check if Supabase is configured
const isSupabaseConfigured = () => {
  const url = import.meta.env.VITE_SUPABASE_URL;
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
  return !!(url && key && url.trim() !== '' && key.trim() !== '');
};

export interface RobotStatus {
  id?: string;
  online: boolean;
  battery: number;
  state: 'idle' | 'cleaning' | 'charging' | 'offline';
  updatedAt: string;
}

export interface RobotActivity {
  id?: string;
  timestamp: string;
  wasteCollected: number;
  location?: string;
  createdAt: string;
}

export interface RobotLog {
  id?: string;
  timestamp: string;
  message: string;
  type: 'info' | 'warning' | 'error';
  createdAt: string;
}

// Get robot status
export async function getRobotStatus(): Promise<RobotStatus | null> {
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from('robot_status')
        .select('*')
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      
      if (error) {
        console.error('Error fetching robot status:', error);
        // No status yet, return default
        return null;
      }
      
      if (data) {
        return {
          id: data.id,
          online: data.online,
          battery: data.battery,
          state: data.state,
          updatedAt: data.updated_at,
        };
      }
    } catch (error) {
      console.error('Error in getRobotStatus:', error);
    }
  }
  
  return null;
}

// Update robot status
export async function updateRobotStatus(status: Omit<RobotStatus, 'id' | 'updatedAt'>): Promise<RobotStatus | null> {
  if (isSupabaseConfigured()) {
    try {
      // Get current status
      const current = await getRobotStatus();
      
      if (current && current.id) {
        // Update existing
        const { data, error } = await supabase
          .from('robot_status')
          .update({
            online: status.online,
            battery: status.battery,
            state: status.state,
            updated_at: new Date().toISOString(),
          })
          .eq('id', current.id)
          .select()
          .single();
        
        if (error) {
          console.error('Error updating robot status in Supabase:', error);
          return null;
        }
        
        if (data) {
          return {
            id: data.id,
            online: data.online,
            battery: data.battery,
            state: data.state,
            updatedAt: data.updated_at,
          };
        }
      } else {
        // Create new
        const { data, error } = await supabase
          .from('robot_status')
          .insert({
            online: status.online,
            battery: status.battery,
            state: status.state,
            updated_at: new Date().toISOString(),
          })
          .select()
          .single();
        
        if (error) {
          console.error('Error creating robot status in Supabase:', error);
          return null;
        }
        
        if (data) {
          return {
            id: data.id,
            online: data.online,
            battery: data.battery,
            state: data.state,
            updatedAt: data.updated_at,
          };
        }
      }
    } catch (error) {
      console.error('Error in updateRobotStatus:', error);
    }
  }
  
  return null;
}

// Get robot activities
export async function getRobotActivities(limit = 50): Promise<RobotActivity[]> {
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from('robot_activities')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(limit);
      
      if (error) {
        console.error('Error fetching robot activities from Supabase:', error);
        return [];
      }
      
      if (data) {
        return data.map((a: any) => ({
          id: a.id,
          timestamp: a.timestamp,
          wasteCollected: Number(a.waste_collected),
          location: a.location || undefined,
          createdAt: a.created_at,
        }));
      }
    } catch (error) {
      console.error('Error in getRobotActivities:', error);
    }
  }
  
  return [];
}

// Create robot activity
export async function createRobotActivity(activity: Omit<RobotActivity, 'id' | 'createdAt'>): Promise<RobotActivity | null> {
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from('robot_activities')
        .insert({
          timestamp: activity.timestamp,
          waste_collected: activity.wasteCollected,
          location: activity.location || null,
          created_at: new Date().toISOString(),
        })
        .select()
        .single();
      
      if (error) {
        console.error('Error creating robot activity in Supabase:', error);
        return null;
      }
      
      if (data) {
        return {
          id: data.id,
          timestamp: data.timestamp,
          wasteCollected: Number(data.waste_collected),
          location: data.location || undefined,
          createdAt: data.created_at,
        };
      }
    } catch (error) {
      console.error('Error in createRobotActivity:', error);
    }
  }
  
  return null;
}

// Get robot logs
export async function getRobotLogs(limit = 50): Promise<RobotLog[]> {
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from('robot_logs')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(limit);
      
      if (error) {
        console.error('Error fetching robot logs from Supabase:', error);
        return [];
      }
      
      if (data) {
        return data.map((l: any) => ({
          id: l.id,
          timestamp: l.timestamp,
          message: l.message,
          type: l.type,
          createdAt: l.created_at,
        }));
      }
    } catch (error) {
      console.error('Error in getRobotLogs:', error);
    }
  }
  
  return [];
}

// Create robot log
export async function createRobotLog(log: Omit<RobotLog, 'id' | 'createdAt'>): Promise<RobotLog | null> {
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from('robot_logs')
        .insert({
          timestamp: log.timestamp,
          message: log.message,
          type: log.type,
          created_at: new Date().toISOString(),
        })
        .select()
        .single();
      
      if (error) {
        console.error('Error creating robot log in Supabase:', error);
        return null;
      }
      
      if (data) {
        return {
          id: data.id,
          timestamp: data.timestamp,
          message: data.message,
          type: data.type,
          createdAt: data.created_at,
        };
      }
    } catch (error) {
      console.error('Error in createRobotLog:', error);
    }
  }
  
  return null;
}

