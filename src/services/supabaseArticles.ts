import { supabase } from '../lib/supabase';

// Check if Supabase is configured
const isSupabaseConfigured = () => {
  const url = import.meta.env.VITE_SUPABASE_URL;
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
  return !!(url && key && url.trim() !== '' && key.trim() !== '');
};

export interface EducationalArticle {
  id: string;
  authorId: string;
  authorName: string;
  title: string;
  content: string;
  category: string;
  publishDate?: string;
  createdAt: string;
  cover?: string;
  readTime?: string;
  views?: string;
}

export interface PendingArticle {
  id: string;
  authorId: string;
  authorName: string;
  title: string;
  content: string;
  category: string;
  createdAt: string;
  cover?: string;
  publishDate?: string;
}

// Get all published articles
export async function getEducationalArticles(): Promise<EducationalArticle[]> {
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from('educational_articles')
        .select('*')
        .not('publish_date', 'is', null)
        .order('publish_date', { ascending: false });
      
      if (error) {
        console.error('Error fetching articles from Supabase:', error);
        return [];
      }
      
      if (data) {
        return data.map((a: any) => ({
          id: a.id,
          authorId: a.author_id,
          authorName: a.author_name,
          title: a.title,
          content: a.content,
          category: a.category,
          publishDate: a.publish_date,
          createdAt: a.created_at,
          cover: '', // Not in schema yet
          readTime: '5 min', // Default
          views: '0', // Default
        }));
      }
    } catch (error) {
      console.error('Error in getEducationalArticles:', error);
    }
  }
  
  return [];
}

// Create article (for admin or compost processor)
export async function createEducationalArticle(article: Omit<EducationalArticle, 'id' | 'createdAt'>): Promise<EducationalArticle | null> {
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from('educational_articles')
        .insert({
          author_id: article.authorId,
          author_name: article.authorName,
          title: article.title,
          content: article.content,
          category: article.category,
          publish_date: article.publishDate || new Date().toISOString(),
          created_at: new Date().toISOString(),
        })
        .select()
        .single();
      
      if (error) {
        console.error('Error creating article in Supabase:', error);
        return null;
      }
      
      if (data) {
        return {
          id: data.id,
          authorId: data.author_id,
          authorName: data.author_name,
          title: data.title,
          content: data.content,
          category: data.category,
          publishDate: data.publish_date,
          createdAt: data.created_at,
        };
      }
    } catch (error) {
      console.error('Error in createEducationalArticle:', error);
    }
  }
  
  return null;
}

// Update article
export async function updateEducationalArticle(id: string, updates: Partial<EducationalArticle>): Promise<boolean> {
  if (isSupabaseConfigured()) {
    try {
      const updateData: any = {};
      if (updates.title !== undefined) updateData.title = updates.title;
      if (updates.content !== undefined) updateData.content = updates.content;
      if (updates.category !== undefined) updateData.category = updates.category;
      if (updates.publishDate !== undefined) updateData.publish_date = updates.publishDate;
      
      const { error } = await supabase
        .from('educational_articles')
        .update(updateData)
        .eq('id', id);
      
      if (error) {
        console.error('Error updating article in Supabase:', error);
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('Error in updateEducationalArticle:', error);
    }
  }
  
  return false;
}

// Delete article
export async function deleteEducationalArticle(id: string): Promise<boolean> {
  if (isSupabaseConfigured()) {
    try {
      const { error } = await supabase
        .from('educational_articles')
        .delete()
        .eq('id', id);
      
      if (error) {
        console.error('Error deleting article from Supabase:', error);
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('Error in deleteEducationalArticle:', error);
    }
  }
  
  return false;
}

// Get pending articles
export async function getPendingArticles(): Promise<PendingArticle[]> {
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from('pending_articles')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('Error fetching pending articles from Supabase:', error);
        return [];
      }
      
      if (data) {
        return data.map((a: any) => ({
          id: a.id,
          authorId: a.author_id,
          authorName: a.author_name,
          title: a.title,
          content: a.content,
          category: a.category,
          createdAt: a.created_at,
        }));
      }
    } catch (error) {
      console.error('Error in getPendingArticles:', error);
    }
  }
  
  return [];
}

// Create pending article
export async function createPendingArticle(article: Omit<PendingArticle, 'id' | 'createdAt'>): Promise<PendingArticle | null> {
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from('pending_articles')
        .insert({
          author_id: article.authorId,
          author_name: article.authorName,
          title: article.title,
          content: article.content,
          category: article.category,
          created_at: new Date().toISOString(),
        })
        .select()
        .single();
      
      if (error) {
        console.error('Error creating pending article in Supabase:', error);
        return null;
      }
      
      if (data) {
        return {
          id: data.id,
          authorId: data.author_id,
          authorName: data.author_name,
          title: data.title,
          content: data.content,
          category: data.category,
          createdAt: data.created_at,
        };
      }
    } catch (error) {
      console.error('Error in createPendingArticle:', error);
    }
  }
  
  return null;
}

// Delete pending article (after approval/rejection)
export async function deletePendingArticle(id: string): Promise<boolean> {
  if (isSupabaseConfigured()) {
    try {
      const { error } = await supabase
        .from('pending_articles')
        .delete()
        .eq('id', id);
      
      if (error) {
        console.error('Error deleting pending article from Supabase:', error);
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('Error in deletePendingArticle:', error);
    }
  }
  
  return false;
}

