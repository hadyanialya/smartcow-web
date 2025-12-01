import { useState, useEffect } from 'react';
import DashboardLayout from './DashboardLayout';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { BookOpen, Search, Clock, Eye, Bookmark, ChevronUp, ChevronDown } from 'lucide-react';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { useAuth } from '../App';
import * as supabaseArticles from '../services/supabaseArticles';

// Check if Supabase is configured
const isSupabaseConfigured = () => {
  const url = import.meta.env.VITE_SUPABASE_URL;
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
  return !!(url && key && url.trim() !== '' && key.trim() !== '');
};

type Article = {
  id: string;
  title: string;
  cover: string;
  author: string;
  body: string;
  publishDate: string;
  category: string;
  readTime: string;
  views: string;
};

const ARTICLES_STORAGE_KEY = 'smartcow_articles';
const SAVED_STORAGE_PREFIX = 'smartcow_saved:';
const CATEGORIES = ['Composting', 'Robotics', 'Waste Management', 'Agriculture Tips', 'Maintenance', 'Business', 'General'];

function ArticleCard({ article, onRead, isAdmin, onEdit, onDelete, isSaved, onToggleSave }: { article: Article; onRead: (a: Article) => void; isAdmin: boolean; onEdit: (a: Article) => void; onDelete: (id: string) => void; isSaved: boolean; onToggleSave: (id: string) => void; }) {
  return (
    <Card className="overflow-hidden border-purple-200 hover:border-purple-400 transition-all hover:shadow-lg group relative">
      <div className="h-48 bg-gradient-to-br from-blue-100 to-purple-100 overflow-hidden relative">
        <ImageWithFallback src={article.cover} alt={article.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
        {isSaved && (
          <Badge className="absolute top-3 right-3 bg-purple-100 text-purple-700">Saved</Badge>
        )}
      </div>
      <div className="p-4">
        <Badge className="bg-purple-100 text-purple-700 mb-3">{article.category}</Badge>
        <h3 className="text-gray-900 mb-3 group-hover:text-purple-600 transition-colors">{article.title}</h3>
        <div className="text-xs text-gray-500 mb-2">By {article.author} • {article.publishDate}</div>
        <div className="flex items-center justify-between text-sm text-gray-600 mb-4">
          <span className="flex items-center"><Clock className="w-4 h-4 mr-1" />{article.readTime}</span>
          <span className="flex items-center"><Eye className="w-4 h-4 mr-1" />{article.views}</span>
        </div>
        <div className="flex gap-2">
          <Button size="sm" className="flex-1 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg" onClick={() => onRead(article)}>
            <BookOpen className="w-3 h-3 mr-1" />
            Read
          </Button>
          <Button size="sm" variant="outline" className={`rounded-lg ${isSaved ? 'bg-purple-50 border-purple-200 text-purple-700' : ''}`} onClick={() => onToggleSave(article.id)}>
            <Bookmark className={`w-3 h-3 ${isSaved ? 'text-purple-700' : ''}`} />
            <span className="ml-1 text-xs">{isSaved ? 'Unsave' : 'Save'}</span>
          </Button>
          {isAdmin && (
            <div className="flex gap-2">
              <Button size="sm" variant="outline" className="rounded-lg" onClick={() => onEdit(article)}>Edit</Button>
              <Button size="sm" variant="destructive" className="rounded-lg" onClick={() => onDelete(article.id)}>Delete</Button>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}

export default function EducationalContent() {
  const { userRole, userName } = useAuth();
  const [search, setSearch] = useState('');
  const [articles, setArticles] = useState<Article[]>([]);
  const [selected, setSelected] = useState<Article | null>(null);
  const [savedIds, setSavedIds] = useState<string[]>([]);
  const [tab, setTab] = useState('all');
  const [savedSearch, setSavedSearch] = useState('');
  const [fromSaved, setFromSaved] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editDraft, setEditDraft] = useState<Article | null>(null);
  const [addMode, setAddMode] = useState(false);
  const [createDraft, setCreateDraft] = useState({
    title: '',
    author: '',
    cover: '',
    body: '',
    category: CATEGORIES[0],
    publishDate: 'Publish Now',
  });

  useEffect(() => {
    const loadArticles = async () => {
      // Try Supabase first
      if (isSupabaseConfigured()) {
        try {
          const supabaseArticlesData = await supabaseArticles.getEducationalArticles();
          // Convert to Article format
          const converted: Article[] = supabaseArticlesData.map((a) => ({
            id: a.id,
            title: a.title,
            cover: a.cover || '',
            author: a.authorName,
            body: a.content,
            publishDate: a.publishDate || new Date(a.createdAt).toLocaleDateString(),
            category: a.category,
            readTime: '5 min', // Default
            views: '0', // Default
          }));
          
          if (converted.length > 0) {
            setArticles(converted);
            return;
          }
        } catch (error) {
          console.error('Error loading articles from Supabase:', error);
          // Fallback to localStorage
        }
      }
      
      // Fallback to localStorage
      const saved = localStorage.getItem(ARTICLES_STORAGE_KEY);
      if (saved) {
        try {
          const parsed = JSON.parse(saved) as Article[];
          setArticles(parsed);
        } catch {
          setArticles([]);
        }
      } else {
        const defaults: Article[] = [
        {
          id: 'smart-farming-guide',
          title: 'Complete Guide to Smart Farming Technology',
          cover: 'https://images.unsplash.com/photo-1524486361537-8ad15938e1a3?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtb2Rlcm4lMjBhZ3JpY3VsdHVyZXxlbnwxfHx8fDE3NjIyODAyMzB8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral',
          author: 'Dr. Amelia Hart',
          body: 'Smart farming integrates sensors, robotics, and analytics to optimize yields. Begin with soil sensors capturing moisture and nutrient levels. Use drones for aerial monitoring to detect stress early. Automate irrigation with variable-rate systems that respond to real-time data. Deploy autonomous cleaning robots for waste removal and sanitation. Centralize data into a farm management platform for actionable insights and predictive maintenance. Train staff on safe operation and ensure cybersecurity best practices across connected devices.',
          publishDate: 'Nov 1, 2025',
          category: 'Robotics',
          readTime: '15 min',
          views: '2.4K'
        },
        {
          id: 'sustainable-composting',
          title: 'Sustainable Composting Practices',
          cover: 'https://images.unsplash.com/photo-1729368630046-8f0051467115?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjb21wb3N0JTIwb3JnYW5pYyUyMGZhcm1pbmd8ZW58MXx8fHwxNzYyMzU5MTM5fDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral',
          author: 'Rina Mahendra',
          body: 'Build a balanced compost by mixing carbon-rich browns with nitrogen-rich greens. Maintain moisture like a wrung-out sponge and turn piles weekly to aerate. Monitor temperature to ensure pathogen reduction and accelerate decomposition. Prevent odors by avoiding excess wet materials and covering food scraps. Screen mature compost for uniform texture and apply according to crop nutrient plans. Document inputs and outputs to continuously improve efficiency.',
          publishDate: 'Oct 24, 2025',
          category: 'Composting',
          readTime: '8 min',
          views: '1.2K'
        },
        {
          id: 'robot-maintenance',
          title: 'Robot Maintenance Best Practices',
          cover: 'https://images.unsplash.com/photo-1583383528064-e1867c88b7a6?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxhZ3JpY3VsdHVyYWwlMjByb2JvdCUyMHRlY2hub2xvZ3l8ZW58MXx8fHwxNzYyMzU5MTM5fDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral',
          author: 'Miguel Santos',
          body: 'Create a preventive maintenance schedule covering cleaning, lubrication, fastener checks, and sensor calibration. Log service actions and failure patterns to guide component replacement intervals. Keep firmware updated and validate safety interlocks regularly. Stock critical spares and train operators to recognize early warning signs. Establish clean charging areas and environmental controls to extend hardware life.',
          publishDate: 'Oct 10, 2025',
          category: 'Robotics',
          readTime: '12 min',
          views: '890'
        },
        {
          id: 'dairy-waste-management',
          title: 'Dairy Farm Waste Management',
          cover: 'https://images.unsplash.com/photo-1646082275982-025ccc59bd2e?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxkYWlyeSUyMGZhcm0lMjBjb3d8ZW58MXx8fHwxNzYyMzIzODUyfDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral',
          author: 'Nadia Wijaya',
          body: 'Implement segregated collection of solid manure and liquid effluent. Use anaerobic digestion to convert waste into biogas and nutrient-rich digestate. Design covered storage to minimize emissions and runoff. Integrate composting lines for solids with appropriate curing time. Monitor water usage and install filtration for wash-down processes. Comply with local environmental regulations and adopt continuous improvement audits.',
          publishDate: 'Sep 28, 2025',
          category: 'Waste Management',
          readTime: '10 min',
          views: '1.5K'
        }
        ];
        setArticles(defaults);
        localStorage.setItem(ARTICLES_STORAGE_KEY, JSON.stringify(defaults));
      }
    };
    
    loadArticles();
  }, []);

  useEffect(() => {
    const key = `${SAVED_STORAGE_PREFIX}${userRole}:${userName || 'anonymous'}`;
    try {
      const saved = localStorage.getItem(key);
      setSavedIds(saved ? JSON.parse(saved) : []);
    } catch {
      setSavedIds([]);
    }
  }, [userRole, userName]);

  const persistSaved = (ids: string[]) => {
    const key = `${SAVED_STORAGE_PREFIX}${userRole}:${userName || 'anonymous'}`;
    localStorage.setItem(key, JSON.stringify(ids));
  };

  const onToggleSave = (id: string) => {
    const next = savedIds.includes(id) ? savedIds.filter(x => x !== id) : [...savedIds, id];
    setSavedIds(next);
    persistSaved(next);
    const msg = next.includes(id) ? 'Article saved to your list' : 'Removed from saved list';
    setFeedback(msg);
    setTimeout(() => setFeedback(null), 1500);
  };

  const isAdmin = userRole === 'admin';

  const filtered = articles.filter(a => a.title.toLowerCase().includes(search.toLowerCase()) || a.category.toLowerCase().includes(search.toLowerCase()) || a.author.toLowerCase().includes(search.toLowerCase()));
  const savedList = savedIds.map(id => articles.find(a => a.id === id)).filter(Boolean) as Article[];
  const filteredSaved = savedList.filter(a => a.title.toLowerCase().includes(savedSearch.toLowerCase()));

  const startEdit = (a: Article) => {
    setIsEditing(true);
    setEditDraft(a);
  };

  const saveEdit = async () => {
    if (!editDraft) return;
    
    // Update in Supabase if configured
    if (isSupabaseConfigured()) {
      try {
        const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(editDraft.id);
        if (isUUID) {
          await supabaseArticles.updateEducationalArticle(editDraft.id, {
            title: editDraft.title,
            content: editDraft.body,
            category: editDraft.category,
          });
        }
      } catch (error) {
        console.error('Error updating article in Supabase:', error);
      }
    }
    
    const next = articles.map(a => a.id === editDraft.id ? editDraft : a);
    setArticles(next);
    localStorage.setItem(ARTICLES_STORAGE_KEY, JSON.stringify(next));
    setIsEditing(false);
    setEditDraft(null);
  };

  const deleteArticle = async (id: string) => {
    // Delete from Supabase if configured
    if (isSupabaseConfigured()) {
      try {
        const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
        if (isUUID) {
          await supabaseArticles.deleteEducationalArticle(id);
        }
      } catch (error) {
        console.error('Error deleting article from Supabase:', error);
      }
    }
    
    const next = articles.filter(a => a.id !== id);
    setArticles(next);
    localStorage.setItem(ARTICLES_STORAGE_KEY, JSON.stringify(next));
    if (selected && selected.id === id) setSelected(null);
  };

  const addNew = () => {
    setAddMode(true);
    setCreateDraft({
      title: '',
      author: userName || 'Admin',
      cover: '',
      body: '',
      category: CATEGORIES[0],
      publishDate: 'Publish Now',
    });
  };

  const dateOptions = ['Publish Now', ...Array.from({ length: 14 }).map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    return d.toLocaleDateString();
  })];

  const submitCreate = async () => {
    if (!createDraft.title || !createDraft.author || !createDraft.cover || !createDraft.body) return;
    
    const publishDate = createDraft.publishDate === 'Publish Now' ? new Date().toISOString() : createDraft.publishDate;
    let articleId = `article-${Date.now()}`;
    
    // Save to Supabase if configured
    if (isSupabaseConfigured()) {
      try {
        const authorId = `admin:${userName || 'Administrator'}`;
        const created = await supabaseArticles.createEducationalArticle({
          authorId,
          authorName: createDraft.author,
          title: createDraft.title,
          content: createDraft.body,
          category: createDraft.category,
          publishDate: publishDate,
        });
        
        if (created) {
          articleId = created.id;
        }
      } catch (error) {
        console.error('Error creating article in Supabase:', error);
        // Continue with localStorage save as fallback
      }
    }
    
    const newArticle: Article = {
      id: articleId,
      title: createDraft.title,
      cover: createDraft.cover,
      author: createDraft.author,
      body: createDraft.body,
      publishDate: createDraft.publishDate === 'Publish Now' ? new Date().toLocaleDateString() : createDraft.publishDate,
      category: createDraft.category,
      readTime: '5 min',
      views: '0'
    };
    const next = [newArticle, ...articles];
    setArticles(next);
    localStorage.setItem(ARTICLES_STORAGE_KEY, JSON.stringify(next));
    setSelected(newArticle);
    setAddMode(false);
  };

  const cancelCreate = () => {
    setAddMode(false);
  };

  const onReadArticle = (art: Article) => {
    const next = articles.map(a => a.id === art.id ? { ...a, views: String((parseInt(a.views || '0', 10) || 0) + 1) } : a);
    setArticles(next);
    localStorage.setItem(ARTICLES_STORAGE_KEY, JSON.stringify(next));
    const updated = next.find(a => a.id === art.id) || art;
    setSelected(updated);
  };

  const onReadSaved = (art: Article) => {
    setFromSaved(true);
    setTab('saved');
    onReadArticle(art);
  };

  const moveSavedUp = (id: string) => {
    const idx = savedIds.indexOf(id);
    if (idx > 0) {
      const next = [...savedIds];
      [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
      setSavedIds(next);
      persistSaved(next);
    }
  };

  const moveSavedDown = (id: string) => {
    const idx = savedIds.indexOf(id);
    if (idx >= 0 && idx < savedIds.length - 1) {
      const next = [...savedIds];
      [next[idx + 1], next[idx]] = [next[idx], next[idx + 1]];
      setSavedIds(next);
      persistSaved(next);
    }
  };

  return (
    <DashboardLayout title="Educational Content">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl text-gray-900 mb-2">Knowledge Center</h1>
            <p className="text-gray-600">Learn about sustainable farming, composting, and waste management</p>
          </div>
          {isAdmin && (
            <Button className="bg-gradient-to-r from-purple-500 to-pink-600 text-white rounded-xl" onClick={addNew}>Add Article</Button>
          )}
        </div>

        {feedback && (
          <Card className="p-3 border-purple-200 bg-purple-50 text-purple-700">
            {feedback}
          </Card>
        )}

        {!addMode && (
          <Card className="p-4 border-purple-200">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <Input placeholder="Search articles, guides, tutorials..." className="pl-12 h-12 rounded-xl border-purple-200" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
          </Card>
        )}

        {!addMode && selected && (
          <Card className="overflow-hidden border-purple-200">
            <div className="h-64 bg-gradient-to-br from-blue-100 to-purple-100">
              <ImageWithFallback src={selected.cover} alt={selected.title} className="w-full h-full object-cover" />
            </div>
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <Badge className="bg-purple-100 text-purple-700 mb-2">{selected.category}</Badge>
                  <h2 className="text-2xl text-gray-900">{selected.title}</h2>
                  <div className="text-sm text-gray-600">By {selected.author} • {selected.publishDate}</div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => onToggleSave(selected.id)} className="rounded-xl">
                    <Bookmark className="w-4 h-4" />
                    <span className="ml-2 text-sm">{savedIds.includes(selected.id) ? 'Saved' : 'Save'}</span>
                  </Button>
                  {isAdmin && (
                    <>
                      <Button variant="outline" className="rounded-xl" onClick={() => startEdit(selected)}>Edit</Button>
                      <Button variant="destructive" className="rounded-xl" onClick={() => deleteArticle(selected.id)}>Delete</Button>
                    </>
                  )}
                </div>
              </div>
              <div className="prose max-w-none text-gray-800 whitespace-pre-line">{selected.body}</div>
              <div className="flex justify-between items-center mt-6 border-t pt-4">
                <span className="text-sm text-gray-600">Read Time: {selected.readTime}</span>
                <div className="flex gap-2">
                  <Button variant="outline" className="rounded-xl" onClick={() => setSelected(null)}>Back to List</Button>
                </div>
              </div>
            </div>
          </Card>
        )}
        {!addMode && !selected && (
          <Tabs value={tab} onValueChange={setTab} className="w-full">
            <TabsList className="grid w-full grid-cols-5 bg-white border border-purple-200 p-2 rounded-xl">
              <TabsTrigger value="all" className="rounded-lg">All Topics</TabsTrigger>
              <TabsTrigger value="composting" className="rounded-lg">Composting</TabsTrigger>
              <TabsTrigger value="robotics" className="rounded-lg">Robotics</TabsTrigger>
              <TabsTrigger value="waste" className="rounded-lg">Waste Mgmt</TabsTrigger>
              <TabsTrigger value="saved" className="rounded-lg">Saved Articles</TabsTrigger>
            </TabsList>
            <TabsContent value="all" className="mt-6">
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filtered.map(a => (
                  <ArticleCard key={a.id} article={a} onRead={onReadArticle} isAdmin={isAdmin} onEdit={(art) => startEdit(art)} onDelete={deleteArticle} isSaved={savedIds.includes(a.id)} onToggleSave={onToggleSave} />
                ))}
              </div>
            </TabsContent>
            <TabsContent value="composting" className="mt-6">
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filtered.filter(a => a.category.toLowerCase() === 'composting').map(a => (
                  <ArticleCard key={a.id} article={a} onRead={onReadArticle} isAdmin={isAdmin} onEdit={(art) => startEdit(art)} onDelete={deleteArticle} isSaved={savedIds.includes(a.id)} onToggleSave={onToggleSave} />
                ))}
              </div>
            </TabsContent>
            <TabsContent value="robotics" className="mt-6">
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filtered.filter(a => a.category.toLowerCase() === 'robotics').map(a => (
                  <ArticleCard key={a.id} article={a} onRead={onReadArticle} isAdmin={isAdmin} onEdit={(art) => startEdit(art)} onDelete={deleteArticle} isSaved={savedIds.includes(a.id)} onToggleSave={onToggleSave} />
                ))}
              </div>
            </TabsContent>
            <TabsContent value="waste" className="mt-6">
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filtered.filter(a => a.category.toLowerCase() === 'waste management').map(a => (
                  <ArticleCard key={a.id} article={a} onRead={onReadArticle} isAdmin={isAdmin} onEdit={(art) => startEdit(art)} onDelete={deleteArticle} isSaved={savedIds.includes(a.id)} onToggleSave={onToggleSave} />
                ))}
              </div>
            </TabsContent>
            <TabsContent value="saved" className="mt-6">
              <Card className="p-4 border-purple-200 mb-4">
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <Input placeholder="Search saved articles..." className="pl-12 h-10 rounded-xl border-purple-200" value={savedSearch} onChange={(e) => setSavedSearch(e.target.value)} />
                </div>
              </Card>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredSaved.map(a => (
                  <div key={a.id} className="relative">
                    <ArticleCard article={a} onRead={onReadSaved} isAdmin={isAdmin} onEdit={(art) => startEdit(art)} onDelete={deleteArticle} isSaved={true} onToggleSave={onToggleSave} />
                    <div className="absolute top-3 left-3 flex gap-1">
                      <Button size="icon" variant="outline" className="rounded-full h-7 w-7" onClick={() => moveSavedUp(a.id)}>
                        <ChevronUp className="w-4 h-4" />
                      </Button>
                      <Button size="icon" variant="outline" className="rounded-full h-7 w-7" onClick={() => moveSavedDown(a.id)}>
                        <ChevronDown className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
                {filteredSaved.length === 0 && (
                  <Card className="p-6 border-purple-200">
                    <div className="text-gray-700">No saved articles yet.</div>
                  </Card>
                )}
              </div>
            </TabsContent>
          </Tabs>
        )}

        {isEditing && editDraft && (
          <Card className="p-6 border-purple-200">
            <h3 className="text-lg text-gray-900 mb-4">Edit Article</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input value={editDraft.title} onChange={(e) => setEditDraft({ ...editDraft, title: e.target.value })} placeholder="Title" className="rounded-xl" />
              <Input value={editDraft.author} onChange={(e) => setEditDraft({ ...editDraft, author: e.target.value })} placeholder="Author" className="rounded-xl" />
              <select className="rounded-xl border border-purple-200 p-2" value={editDraft.category} onChange={(e) => setEditDraft({ ...editDraft, category: e.target.value })}>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <select className="rounded-xl border border-purple-200 p-2" value={editDraft.publishDate} onChange={(e) => setEditDraft({ ...editDraft, publishDate: e.target.value })}>
                {dateOptions.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
              <Input value={editDraft.readTime} onChange={(e) => setEditDraft({ ...editDraft, readTime: e.target.value })} placeholder="Read Time" className="rounded-xl" />
              <Input value={editDraft.cover} onChange={(e) => setEditDraft({ ...editDraft, cover: e.target.value })} placeholder="Cover URL" className="md:col-span-2 rounded-xl" />
              <textarea value={editDraft.body} onChange={(e) => setEditDraft({ ...editDraft, body: e.target.value })} className="md:col-span-2 h-40 rounded-xl border border-purple-200 p-3" />
            </div>
            <div className="flex gap-2 mt-4">
              <Button className="bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl" onClick={saveEdit}>Save</Button>
              <Button variant="outline" className="rounded-xl" onClick={() => { setIsEditing(false); setEditDraft(null); }}>Cancel</Button>
            </div>
          </Card>
        )}
        {addMode && isAdmin && (
          <Card className="p-6 border-purple-200">
            <h3 className="text-lg text-gray-900 mb-4">Add New Article</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input value={createDraft.title} onChange={(e) => setCreateDraft({ ...createDraft, title: e.target.value })} placeholder="Title" className="rounded-xl" />
              <Input value={createDraft.author} onChange={(e) => setCreateDraft({ ...createDraft, author: e.target.value })} placeholder="Author" className="rounded-xl" />
              <select className="rounded-xl border border-purple-200 p-2" value={createDraft.category} onChange={(e) => setCreateDraft({ ...createDraft, category: e.target.value })}>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <select className="rounded-xl border border-purple-200 p-2" value={createDraft.publishDate} onChange={(e) => setCreateDraft({ ...createDraft, publishDate: e.target.value })}>
                {dateOptions.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
              <Input value={createDraft.cover} onChange={(e) => setCreateDraft({ ...createDraft, cover: e.target.value })} placeholder="Image URL" className="md:col-span-2 rounded-xl" />
              <textarea value={createDraft.body} onChange={(e) => setCreateDraft({ ...createDraft, body: e.target.value })} className="md:col-span-2 h-40 rounded-xl border border-purple-200 p-3" placeholder="Article Content" />
            </div>
            <div className="flex gap-2 mt-4">
              <Button className="bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl" onClick={submitCreate}>Publish</Button>
              <Button variant="outline" className="rounded-xl" onClick={cancelCreate}>Cancel</Button>
              <Button variant="outline" className="rounded-xl" onClick={() => setAddMode(false)}>Back to Education</Button>
            </div>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
