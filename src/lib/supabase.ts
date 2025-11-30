import { createClient } from '@supabase/supabase-js';

// Supabase configuration
// TODO: Replace these with your actual Supabase project credentials
// Get these from: https://app.supabase.com/project/_/settings/api
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('⚠️ Supabase credentials not found. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env file');
  console.warn('⚠️ App will use localStorage as fallback');
} else {
  console.log('✅ Supabase credentials found:', {
    url: supabaseUrl.substring(0, 30) + '...',
    hasKey: !!supabaseAnonKey
  });
}

// Create Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
  db: {
    schema: 'public',
  },
  global: {
    headers: {
      'apikey': supabaseAnonKey,
      'Content-Type': 'application/json',
    },
  },
});

// Database types
export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          name: string;
          email: string;
          password: string; // Will be hashed
          role: 'farmer' | 'compost_processor' | 'seller' | 'buyer' | 'admin';
          status: 'active' | 'pending' | 'banned' | 'suspended';
          created_at: string;
          last_login?: string | null;
          deleted_at?: string | null;
        };
        Insert: Omit<Database['public']['Tables']['users']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['users']['Insert']>;
      };
      products: {
        Row: {
          id: string;
          seller_id: string;
          seller_name: string;
          product_owner_role?: 'seller' | 'compostProcessor' | null;
          owner_user_id?: string | null;
          name: string;
          price: number;
          unit: string;
          category: string;
          stock: number;
          status: 'active' | 'inactive';
          description: string;
          image?: string | null;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['products']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['products']['Insert']>;
      };
      orders: {
        Row: {
          id: string;
          product_id: string;
          product_name: string;
          seller_id: string;
          seller_role?: 'seller' | 'compostProcessor' | null;
          seller_name: string;
          buyer_id: string;
          buyer_name: string;
          quantity: number;
          total_idr: number;
          status: 'pending' | 'processing' | 'completed';
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['orders']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['orders']['Insert']>;
      };
      forum_discussions: {
        Row: {
          id: string;
          author_id: string;
          author_name: string;
          author_role: string;
          title: string;
          content: string;
          category: string;
          likes: number;
          liked_users: string[]; // Array of user IDs
          created_at: string;
          updated_at?: string | null;
        };
        Insert: Omit<Database['public']['Tables']['forum_discussions']['Row'], 'id' | 'created_at' | 'likes' | 'liked_users'>;
        Update: Partial<Database['public']['Tables']['forum_discussions']['Insert']>;
      };
      forum_comments: {
        Row: {
          id: string;
          discussion_id: string;
          author_id: string;
          author_name: string;
          author_role: string;
          content: string;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['forum_comments']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['forum_comments']['Insert']>;
      };
      chat_messages: {
        Row: {
          id: string;
          conversation_id: string;
          sender_id: string;
          sender_name: string;
          sender_role: string;
          receiver_id: string;
          receiver_name: string;
          receiver_role: string;
          message: string;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['chat_messages']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['chat_messages']['Insert']>;
      };
      educational_articles: {
        Row: {
          id: string;
          author_id: string;
          author_name: string;
          title: string;
          content: string;
          category: string;
          publish_date?: string | null;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['educational_articles']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['educational_articles']['Insert']>;
      };
      pending_articles: {
        Row: {
          id: string;
          author_id: string;
          author_name: string;
          title: string;
          content: string;
          category: string;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['pending_articles']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['pending_articles']['Insert']>;
      };
      robot_status: {
        Row: {
          id: string;
          online: boolean;
          battery: number;
          state: 'idle' | 'cleaning' | 'charging' | 'offline';
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['robot_status']['Row'], 'id' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['robot_status']['Insert']>;
      };
      robot_activities: {
        Row: {
          id: string;
          timestamp: string;
          waste_collected: number;
          location?: string | null;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['robot_activities']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['robot_activities']['Insert']>;
      };
      robot_logs: {
        Row: {
          id: string;
          timestamp: string;
          message: string;
          type: 'info' | 'warning' | 'error';
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['robot_logs']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['robot_logs']['Insert']>;
      };
      user_settings: {
        Row: {
          id: string;
          user_id: string;
          role: string;
          settings: Record<string, any>; // JSON object
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['user_settings']['Row'], 'id' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['user_settings']['Insert']>;
      };
      // Notifications table removed - no UI for notifications yet
      // Uncomment if you want to add notification feature in the future
    };
  };
}

