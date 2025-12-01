import { supabase } from '../lib/supabase';

// Check if Supabase is configured
const isSupabaseConfigured = () => {
  const url = import.meta.env.VITE_SUPABASE_URL;
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
  return !!(url && key && url.trim() !== '' && key.trim() !== '');
};

export interface ForumDiscussion {
  id: string;
  authorId: string;
  authorName: string;
  authorRole: string;
  title: string;
  content: string;
  category: string;
  likes: number;
  likedUsers: string[];
  createdAt: string;
  updatedAt?: string;
  tags?: string[];
}

export interface ForumComment {
  id: string;
  discussionId: string;
  authorId: string;
  authorName: string;
  authorRole: string;
  content: string;
  createdAt: string;
  parentId?: string; // For nested comments
}

// Get all discussions
export async function getForumDiscussions(): Promise<ForumDiscussion[]> {
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from('forum_discussions')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('Error fetching discussions from Supabase:', error);
        return [];
      }
      
      if (data) {
        return data.map((d: any) => ({
          id: d.id,
          authorId: d.author_id,
          authorName: d.author_name,
          authorRole: d.author_role,
          title: d.title,
          content: d.content,
          category: d.category,
          likes: d.likes || 0,
          likedUsers: d.liked_users || [],
          createdAt: d.created_at,
          updatedAt: d.updated_at || undefined,
          tags: [], // Tags not in schema yet
        }));
      }
    } catch (error) {
      console.error('Error in getForumDiscussions:', error);
    }
  }
  
  return [];
}

// Create discussion
export async function createForumDiscussion(discussion: Omit<ForumDiscussion, 'id' | 'likes' | 'likedUsers' | 'createdAt'>): Promise<ForumDiscussion | null> {
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from('forum_discussions')
        .insert({
          author_id: discussion.authorId,
          author_name: discussion.authorName,
          author_role: discussion.authorRole,
          title: discussion.title,
          content: discussion.content,
          category: discussion.category,
          likes: 0,
          liked_users: [],
          created_at: new Date().toISOString(),
        })
        .select()
        .single();
      
      if (error) {
        console.error('Error creating discussion in Supabase:', error);
        return null;
      }
      
      if (data) {
        return {
          id: data.id,
          authorId: data.author_id,
          authorName: data.author_name,
          authorRole: data.author_role,
          title: data.title,
          content: data.content,
          category: data.category,
          likes: data.likes || 0,
          likedUsers: data.liked_users || [],
          createdAt: data.created_at,
          tags: [],
        };
      }
    } catch (error) {
      console.error('Error in createForumDiscussion:', error);
    }
  }
  
  return null;
}

// Update discussion (for likes)
export async function updateForumDiscussion(id: string, updates: { likes?: number; likedUsers?: string[] }): Promise<boolean> {
  if (isSupabaseConfigured()) {
    try {
      const updateData: any = {};
      if (updates.likes !== undefined) updateData.likes = updates.likes;
      if (updates.likedUsers !== undefined) updateData.liked_users = updates.likedUsers;
      
      const { error } = await supabase
        .from('forum_discussions')
        .update(updateData)
        .eq('id', id);
      
      if (error) {
        console.error('Error updating discussion in Supabase:', error);
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('Error in updateForumDiscussion:', error);
    }
  }
  
  return false;
}

// Get comments for a discussion
export async function getForumComments(discussionId: string): Promise<ForumComment[]> {
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from('forum_comments')
        .select('*')
        .eq('discussion_id', discussionId)
        .order('created_at', { ascending: true });
      
      if (error) {
        console.error('Error fetching comments from Supabase:', error);
        return [];
      }
      
      if (data) {
        return data.map((c: any) => ({
          id: c.id,
          discussionId: c.discussion_id,
          authorId: c.author_id,
          authorName: c.author_name,
          authorRole: c.author_role,
          content: c.content,
          createdAt: c.created_at,
        }));
      }
    } catch (error) {
      console.error('Error in getForumComments:', error);
    }
  }
  
  return [];
}

// Create comment
export async function createForumComment(comment: Omit<ForumComment, 'id' | 'createdAt'>): Promise<ForumComment | null> {
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from('forum_comments')
        .insert({
          discussion_id: comment.discussionId,
          author_id: comment.authorId,
          author_name: comment.authorName,
          author_role: comment.authorRole,
          content: comment.content,
          created_at: new Date().toISOString(),
        })
        .select()
        .single();
      
      if (error) {
        console.error('Error creating comment in Supabase:', error);
        return null;
      }
      
      if (data) {
        return {
          id: data.id,
          discussionId: data.discussion_id,
          authorId: data.author_id,
          authorName: data.author_name,
          authorRole: data.author_role,
          content: data.content,
          createdAt: data.created_at,
        };
      }
    } catch (error) {
      console.error('Error in createForumComment:', error);
    }
  }
  
  return null;
}

