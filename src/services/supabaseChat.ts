import { supabase } from '../lib/supabase';

// Check if Supabase is configured
const isSupabaseConfigured = () => {
  const url = import.meta.env.VITE_SUPABASE_URL;
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
  return !!(url && key && url.trim() !== '' && key.trim() !== '');
};

export interface ChatMessage {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  senderRole: string;
  receiverId: string;
  receiverName: string;
  receiverRole: string;
  message: string;
  createdAt: string;
}

// Get messages for a conversation
export async function getChatMessages(conversationId: string): Promise<ChatMessage[]> {
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });
      
      if (error) {
        console.error('Error fetching chat messages from Supabase:', error);
        return [];
      }
      
      if (data) {
        return data.map((m: any) => ({
          id: m.id,
          conversationId: m.conversation_id,
          senderId: m.sender_id,
          senderName: m.sender_name,
          senderRole: m.sender_role,
          receiverId: m.receiver_id,
          receiverName: m.receiver_name,
          receiverRole: m.receiver_role,
          message: m.message,
          createdAt: m.created_at,
        }));
      }
    } catch (error) {
      console.error('Error in getChatMessages:', error);
    }
  }
  
  return [];
}

// Get all messages for a user (all conversations)
export async function getAllChatMessages(userId: string): Promise<ChatMessage[]> {
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
        .order('created_at', { ascending: true });
      
      if (error) {
        console.error('Error fetching all chat messages from Supabase:', error);
        return [];
      }
      
      if (data) {
        return data.map((m: any) => ({
          id: m.id,
          conversationId: m.conversation_id,
          senderId: m.sender_id,
          senderName: m.sender_name,
          senderRole: m.sender_role,
          receiverId: m.receiver_id,
          receiverName: m.receiver_name,
          receiverRole: m.receiver_role,
          message: m.message,
          createdAt: m.created_at,
        }));
      }
    } catch (error) {
      console.error('Error in getAllChatMessages:', error);
    }
  }
  
  return [];
}

// Create chat message
export async function createChatMessage(message: Omit<ChatMessage, 'id' | 'createdAt'>): Promise<ChatMessage | null> {
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .insert({
          conversation_id: message.conversationId,
          sender_id: message.senderId,
          sender_name: message.senderName,
          sender_role: message.senderRole,
          receiver_id: message.receiverId,
          receiver_name: message.receiverName,
          receiver_role: message.receiverRole,
          message: message.message,
          created_at: new Date().toISOString(),
        })
        .select()
        .single();
      
      if (error) {
        console.error('Error creating chat message in Supabase:', error);
        return null;
      }
      
      if (data) {
        return {
          id: data.id,
          conversationId: data.conversation_id,
          senderId: data.sender_id,
          senderName: data.sender_name,
          senderRole: data.sender_role,
          receiverId: data.receiver_id,
          receiverName: data.receiver_name,
          receiverRole: data.receiver_role,
          message: data.message,
          createdAt: data.created_at,
        };
      }
    } catch (error) {
      console.error('Error in createChatMessage:', error);
    }
  }
  
  return null;
}

