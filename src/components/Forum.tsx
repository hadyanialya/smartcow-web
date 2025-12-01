import { useState, useEffect, useMemo } from 'react';
import DashboardLayout from './DashboardLayout';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { 
  MessageSquare, Search, Plus, ThumbsUp, 
  MessageCircle, TrendingUp, Clock, Users
} from 'lucide-react';
import { useAuth } from '../App';
import { getUsers } from '../utils/auth';
import * as supabaseForum from '../services/supabaseForum';

// Check if Supabase is configured
const isSupabaseConfigured = () => {
  const url = import.meta.env.VITE_SUPABASE_URL;
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
  return !!(url && key && url.trim() !== '' && key.trim() !== '');
};

function getTimeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

type Comment = {
  commentId: string;
  authorRole: string;
  authorName: string;
  timestamp: string;
  content: string;
  children?: Comment[];
};

type Discussion = {
  id: string;
  title: string;
  authorName: string;
  authorRole: string;
  timestamp: string;
  category: string;
  likes: number;
  likedUsers: string[];
  likedByCurrentUser?: boolean;
  content: string;
  tags: string[];
  isHot?: boolean;
  comments: Comment[];
};

const FORUM_STORAGE_KEY = 'smartcow_forum_discussions';

export default function Forum() {
  const { userRole, userName } = useAuth();
  const currentUserId = `${userRole}:${userName || 'anonymous'}`;
  const [search, setSearch] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newBody, setNewBody] = useState('');
  const [newCategory, setNewCategory] = useState('General');
  const [newTags, setNewTags] = useState('');
  const [discussions, setDiscussions] = useState<Discussion[]>([]);
  const [validUsers, setValidUsers] = useState<any[]>([]);

  // Get valid users to filter discussions
  useEffect(() => {
    const loadUsers = async () => {
      try {
        const users = await getUsers();
        setValidUsers(users || []);
      } catch (error) {
        console.error('Error loading users:', error);
        setValidUsers([]);
      }
    };
    loadUsers();
  }, []);

  const validUserNames = useMemo(() => {
    if (!Array.isArray(validUsers)) return new Set(['Administrator']);
    const names = new Set(validUsers.map(u => u.name));
    // Include admin
    names.add('Administrator');
    return names;
  }, [validUsers]);
  const activeMemberCount = (Array.isArray(validUsers) ? validUsers.length : 0) + 1; // +1 for admin

  useEffect(() => {
    const loadDiscussions = async () => {
      let loadedDiscussions: Discussion[] = [];
      
      // Try Supabase first
      if (isSupabaseConfigured()) {
        try {
          const supabaseDiscussions = await supabaseForum.getForumDiscussions();
          // Convert to Discussion format
          loadedDiscussions = supabaseDiscussions.map((d) => ({
            id: d.id,
            title: d.title,
            authorName: d.authorName,
            authorRole: d.authorRole,
            timestamp: d.createdAt,
            category: d.category,
            likes: d.likes,
            likedUsers: d.likedUsers,
            content: d.content,
            tags: d.tags || [],
            comments: [], // Comments will be loaded separately
          }));
          
          // Load comments for each discussion
          for (const discussion of loadedDiscussions) {
            try {
              const comments = await supabaseForum.getForumComments(discussion.id);
              discussion.comments = comments.map((c) => ({
                commentId: c.id,
                authorRole: c.authorRole,
                authorName: c.authorName,
                timestamp: c.createdAt,
                content: c.content,
                children: [], // Nested comments not in schema yet
              }));
            } catch (error) {
              console.error('Error loading comments:', error);
            }
          }
        } catch (error) {
          console.error('Error loading discussions from Supabase:', error);
          // Fallback to localStorage
        }
      }
      
      // Fallback to localStorage if Supabase not configured or failed
      if (loadedDiscussions.length === 0) {
        const saved = localStorage.getItem(FORUM_STORAGE_KEY);
        if (saved) {
          try {
            const parsed: Discussion[] = JSON.parse(saved);
            loadedDiscussions = parsed.filter(d => validUserNames.has(d.authorName));
          } catch {
            loadedDiscussions = [];
          }
        }
      }

      setDiscussions(loadedDiscussions);
    };
    
    loadDiscussions();
    
    // Polling for updates (every 5 seconds)
    const interval = setInterval(() => {
      loadDiscussions();
    }, 5000);
    
    return () => clearInterval(interval);
  }, [validUserNames]);

  const persist = async (list: Discussion[]) => {
    // Only persist discussions from valid users
    const valid = list.filter(d => validUserNames.has(d.authorName));
    
    // Save to Supabase if configured
    if (isSupabaseConfigured()) {
      // Note: This is a simplified version - in production, you'd want to sync each discussion individually
      // For now, we'll keep localStorage as backup
    }
    
    // Always save to localStorage as backup
    localStorage.setItem(FORUM_STORAGE_KEY, JSON.stringify(valid));
    setDiscussions(valid);
  };
  const categories = ['All Topics', 'Trending', 'Questions', 'General', 'Technical'];
  const filteredAll = discussions.filter(d => d.title.toLowerCase().includes(search.toLowerCase()) || d.category.toLowerCase().includes(search.toLowerCase()) || d.authorName.toLowerCase().includes(search.toLowerCase()));
  const filteredTrending = filteredAll.filter(d => d.isHot);
  const filteredGeneral = filteredAll.filter(d => d.category.toLowerCase() === 'general');
  const filteredTechnical = filteredAll.filter(d => d.category.toLowerCase() === 'technical');

  

  const submitNew = async () => {
    if (!newTitle || !newBody) return;
    const tagsArr = newTags.split(',').map(t => t.trim()).filter(Boolean);
    
    // Try Supabase first
    if (isSupabaseConfigured()) {
      try {
        const authorId = `${userRole}:${userName || 'anonymous'}`;
        const created = await supabaseForum.createForumDiscussion({
          authorId,
          authorName: userName || 'Anonymous',
          authorRole: userRole || 'buyer',
          title: newTitle,
          content: newBody,
          category: newCategory,
        });
        
        if (created) {
          const item: Discussion = {
            id: created.id,
            title: created.title,
            authorName: created.authorName,
            authorRole: created.authorRole,
            timestamp: created.createdAt,
            category: created.category,
            likes: created.likes,
            likedUsers: created.likedUsers,
            content: created.content,
            tags: tagsArr,
            comments: [],
          };
          const next = [item, ...discussions];
          setDiscussions(next);
          await persist(next);
          setShowNew(false);
          setNewTitle('');
          setNewBody('');
          setNewCategory('General');
          setNewTags('');
          return;
        }
      } catch (error) {
        console.error('Error creating discussion in Supabase:', error);
        // Fallback to localStorage
      }
    }
    
    // Fallback to localStorage
    const item: Discussion = { id: `d-${Date.now()}`, title: newTitle, authorName: userName || 'Anonymous', authorRole: userRole, timestamp: new Date().toISOString(), category: newCategory, likes: 0, likedUsers: [], content: newBody, tags: tagsArr, comments: [] };
    const next = [item, ...discussions];
    setDiscussions(next);
    await persist(next);
    setShowNew(false);
    setNewTitle('');
    setNewBody('');
    setNewCategory('General');
    setNewTags('');
  };

  const onToggleLike = async (id: string) => {
    const discussion = discussions.find(d => d.id === id);
    if (!discussion) return;
    
    const hasLiked = discussion.likedUsers.includes(currentUserId);
    const likedUsers = hasLiked ? discussion.likedUsers.filter(u => u !== currentUserId) : [...discussion.likedUsers, currentUserId];
    const likes = hasLiked ? Math.max(0, discussion.likes - 1) : discussion.likes + 1;
    
    // Update in Supabase if configured
    if (isSupabaseConfigured()) {
      try {
        await supabaseForum.updateForumDiscussion(id, { likes, likedUsers });
      } catch (error) {
        console.error('Error updating like in Supabase:', error);
      }
    }
    
    const next = discussions.map(d => {
      if (d.id !== id) return d;
      return { ...d, likedUsers, likes };
    });
    setDiscussions(next);
    await persist(next);
  };

  const onAddComment = async (id: string, content: string) => {
    if (!content) return;
    
    // Try Supabase first
    if (isSupabaseConfigured()) {
      try {
        const authorId = `${userRole}:${userName || 'anonymous'}`;
        const created = await supabaseForum.createForumComment({
          discussionId: id,
          authorId,
          authorName: userName || 'Anonymous',
          authorRole: userRole || 'buyer',
          content,
        });
        
        if (created) {
          const c: Comment = {
            commentId: created.id,
            authorRole: created.authorRole,
            authorName: created.authorName,
            timestamp: created.createdAt,
            content: created.content,
            children: [],
          };
          const next = discussions.map(d => {
            if (d.id !== id) return d;
            return { ...d, comments: [...d.comments, c] };
          });
          setDiscussions(next);
          await persist(next);
          return;
        }
      } catch (error) {
        console.error('Error creating comment in Supabase:', error);
        // Fallback to localStorage
      }
    }
    
    // Fallback to localStorage
    const c: Comment = { commentId: `c-${Date.now()}`, authorRole: userRole, authorName: userName || 'Anonymous', timestamp: new Date().toISOString(), content, children: [] };
    const next = discussions.map(d => {
      if (d.id !== id) return d;
      return { ...d, comments: [...d.comments, c] };
    });
    setDiscussions(next);
    await persist(next);
  };

  const onReplyToComment = (id: string, commentId: string, content: string) => {
    if (!content) return;
    const next = discussions.map(d => {
      if (d.id !== id) return d;
      const updated = d.comments.map(c => {
        if (c.commentId !== commentId) return c;
        const ch: Comment = { commentId: `c-${Date.now()}`, authorRole: userRole, authorName: userName || 'Anonymous', timestamp: new Date().toISOString(), content };
        const children = [ch, ...(c.children || [])];
        return { ...c, children };
      });
      return { ...d, comments: updated };
    });
    setDiscussions(next);
    persist(next);
  };
  return (
    <DashboardLayout title="Community Forum">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl text-gray-900 mb-2">Community Forum</h1>
            <p className="text-gray-600">Connect with farmers, share experiences, and learn from the community</p>
          </div>
          <Button className="bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl" onClick={() => setShowNew(true)}>
            <Plus className="w-4 h-4 mr-2" />
            New Discussion
          </Button>
        </div>

        {showNew && (
          <Card className="p-6 border-purple-200">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="Title" className="rounded-xl" />
              <select className="rounded-xl border border-purple-200 p-2" value={newCategory} onChange={(e) => setNewCategory(e.target.value)}>
                {['General','Questions','Technical','Business','Robot Management','Regulations','Farming'].map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <textarea value={newBody} onChange={(e) => setNewBody(e.target.value)} className="md:col-span-2 h-32 rounded-xl border border-purple-200 p-3" placeholder="Discussion Content" />
              <Input value={newTags} onChange={(e) => setNewTags(e.target.value)} placeholder="Tags (comma separated)" className="md:col-span-2 rounded-xl" />
            </div>
            <div className="flex gap-2 mt-4">
              <Button className="bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl" onClick={submitNew}>Post</Button>
              <Button variant="outline" className="rounded-xl" onClick={() => setShowNew(false)}>Cancel</Button>
            </div>
          </Card>
        )}

        {/* Search & Stats */}
        <div className="grid md:grid-cols-4 gap-4">
          <Card className="md:col-span-3 p-4 border-purple-200">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <Input placeholder="Search discussions..." className="pl-12 h-12 rounded-xl border-purple-200" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
          </Card>
          <Card className="p-4 border-purple-200 text-center">
            <div className="text-2xl text-gray-900 mb-1">{activeMemberCount}</div>
            <div className="text-sm text-gray-600 flex items-center justify-center">
              <Users className="w-4 h-4 mr-1" />
              Active Members
            </div>
          </Card>
        </div>

        {/* Forum Categories */}
        <Tabs defaultValue="all" className="w-full">
          <TabsList className="grid w-full grid-cols-5 bg-white border border-purple-200 p-2 rounded-xl">
            <TabsTrigger value="all" className="rounded-lg">All Topics</TabsTrigger>
            <TabsTrigger value="trending" className="rounded-lg">Trending</TabsTrigger>
            <TabsTrigger value="questions" className="rounded-lg">Questions</TabsTrigger>
            <TabsTrigger value="general" className="rounded-lg">General</TabsTrigger>
            <TabsTrigger value="technical" className="rounded-lg">Technical</TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="mt-6 space-y-4">
            {filteredAll.map(d => (
              <ForumThread
                key={d.id}
                discussion={{
                  ...d,
                  likedByCurrentUser: d.likedUsers.includes(currentUserId),
                }}
                onToggleLike={onToggleLike}
                onAddComment={onAddComment}
                onReplyToComment={onReplyToComment}
              />
            ))}
          </TabsContent>

          <TabsContent value="trending" className="mt-6 space-y-4">
            {filteredTrending.map(d => (
              <ForumThread
                key={d.id}
                discussion={{
                  ...d,
                  likedByCurrentUser: d.likedUsers.includes(currentUserId),
                }}
                onToggleLike={onToggleLike}
                onAddComment={onAddComment}
                onReplyToComment={onReplyToComment}
              />
            ))}
          </TabsContent>

          <TabsContent value="questions" className="mt-6 space-y-4">
            {filteredAll.filter(d => d.category.toLowerCase() === 'questions').map(d => (
              <ForumThread
                key={d.id}
                discussion={{
                  ...d,
                  likedByCurrentUser: d.likedUsers.includes(currentUserId),
                }}
                onToggleLike={onToggleLike}
                onAddComment={onAddComment}
                onReplyToComment={onReplyToComment}
              />
            ))}
          </TabsContent>

          <TabsContent value="general" className="mt-6 space-y-4">
            {filteredGeneral.map(d => (
              <ForumThread
                key={d.id}
                discussion={{
                  ...d,
                  likedByCurrentUser: d.likedUsers.includes(currentUserId),
                }}
                onToggleLike={onToggleLike}
                onAddComment={onAddComment}
                onReplyToComment={onReplyToComment}
              />
            ))}
          </TabsContent>

          <TabsContent value="technical" className="mt-6 space-y-4">
            {filteredTechnical.map(d => (
              <ForumThread
                key={d.id}
                discussion={{
                  ...d,
                  likedByCurrentUser: d.likedUsers.includes(currentUserId),
                }}
                onToggleLike={onToggleLike}
                onAddComment={onAddComment}
                onReplyToComment={onReplyToComment}
              />
            ))}
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}

function ForumThread({
  discussion,
  onToggleLike,
  onAddComment,
  onReplyToComment,
}: {
  discussion: Discussion;
  onToggleLike: (id: string) => void;
  onAddComment: (id: string, content: string) => void;
  onReplyToComment: (id: string, commentId: string, content: string) => void;
}) {
  const [showReplies, setShowReplies] = useState(false);
  const [showReplyInput, setShowReplyInput] = useState(false);
  const [commentText, setCommentText] = useState('');
  const likeCountShown = Math.min(discussion.likes, 5);
  const timeAgo = (() => {
    const diff = Date.now() - new Date(discussion.timestamp).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1) return 'just now';
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    const d = Math.floor(h / 24);
    return `${d}d ago`;
  })();
  return (
    <Card className="p-6 border-purple-200 hover:border-purple-400 transition-all hover:shadow-lg">
      <div className="flex gap-4">
        {/* Avatar */}
        <div className="flex-shrink-0">
          <div className="w-12 h-12 bg-gradient-to-br from-purple-400 to-blue-500 rounded-full flex items-center justify-center text-white text-lg">
            {discussion.authorName.charAt(0)}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between mb-2">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <h3 className="text-lg text-gray-900 hover:text-purple-600 cursor-pointer">{discussion.title}</h3>
                {discussion.isHot && (
                  <Badge className="bg-red-100 text-red-700 flex items-center gap-1">
                    <TrendingUp className="w-3 h-3" />
                    Hot
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600 flex-wrap">
                <span>{discussion.authorName}</span>
                <span>•</span>
                <Badge className="bg-blue-100 text-blue-700 text-xs">{discussion.category}</Badge>
                <span>•</span>
                <span className="flex items-center">
                  <Clock className="w-3 h-3 mr-1" />
                  {timeAgo}
                </span>
                <span>•</span>
                <span className="text-xs text-gray-500">{discussion.authorRole}</span>
              </div>
            </div>
          </div>

          <p className="text-gray-700 mb-3">{discussion.content}</p>

          {/* Tags */}
          <div className="flex items-center gap-2 mb-3 flex-wrap">
            {discussion.tags.map((tag) => (
              <Badge key={tag} className="bg-purple-50 text-purple-700 border border-purple-200">
                {tag}
              </Badge>
            ))}
          </div>

          <div className="flex items-center gap-4 text-sm">
            <button
              className="flex items-center gap-1 text-gray-600 hover:text-purple-600 transition-colors"
              onClick={() => onToggleLike(discussion.id)}
            >
              <ThumbsUp className={`w-4 h-4 ${discussion.likedByCurrentUser ? 'text-purple-600' : ''}`} />
              <span>{likeCountShown}</span>
            </button>
            <button
              className="flex items-center gap-1 text-gray-600 hover:text-purple-600 transition-colors"
              onClick={() => setShowReplies((v) => !v)}
            >
              <MessageCircle className="w-4 h-4" />
              <span>{discussion.comments.length} replies</span>
            </button>
            <Button
              size="sm"
              variant="ghost"
              className="ml-auto text-purple-600 hover:text-purple-700"
              onClick={() => setShowReplyInput((v) => !v)}
            >
              {showReplyInput ? 'Cancel' : 'Reply'}
            </Button>
          </div>
          {showReplyInput && (
            <div className="mt-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="md:col-span-2">
                  <textarea value={commentText} onChange={(e) => setCommentText(e.target.value)} className="w-full h-24 rounded-xl border border-purple-200 p-3" placeholder="Write a reply" />
                </div>
                <div className="flex md:flex-col gap-2">
                  <Button
                    className="bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl"
                    onClick={() => {
                      onAddComment(discussion.id, commentText);
                      setCommentText('');
                    }}
                  >
                    Submit Reply
                  </Button>
                </div>
              </div>
            </div>
          )}
          {showReplies && (
            <div className="mt-4 border-t pt-4 space-y-3">
              <div className="space-y-3">
                {discussion.comments.map((c) => (
                  <Card key={c.commentId} className="p-3 border-purple-200">
                    <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
                      <span className="font-medium text-gray-700">{c.authorName}</span>
                      <span>•</span>
                      <span>{c.authorRole}</span>
                      <span>•</span>
                      <span>{getTimeAgo(c.timestamp)}</span>
                    </div>
                    <div className="text-gray-800 mb-2">{c.content}</div>
                    <div className="flex items-center gap-3 text-sm text-gray-600">
                      <InlineReply onSubmit={(text) => onReplyToComment(discussion.id, c.commentId, text)} />
                    </div>
                    {c.children && c.children.length > 0 && (
                      <div className="mt-3 pl-4 border-l">
                        {c.children.map((ch) => (
                          <div key={ch.commentId} className="mb-2">
                            <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
                              <span className="font-medium text-gray-700">{ch.authorName}</span>
                              <span>•</span>
                              <span>{ch.authorRole}</span>
                              <span>•</span>
                              <span>{getTimeAgo(ch.timestamp)}</span>
                            </div>
                            <div className="text-gray-700">{ch.content}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}

function InlineReply({ onSubmit }: { onSubmit: (text: string) => void }) {
  const [text, setText] = useState('');
  return (
    <div className="flex items-center gap-2">
      <Input value={text} onChange={(e) => setText(e.target.value)} placeholder="Reply" className="h-9 rounded-lg" />
      <Button size="sm" variant="outline" className="rounded-lg" onClick={() => { onSubmit(text); setText(''); }}>Reply</Button>
    </div>
  );
}
