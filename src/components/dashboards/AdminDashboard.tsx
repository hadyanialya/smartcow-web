import DashboardLayout from "../DashboardLayout";
import { Card } from "../ui/card";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Input } from "../ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Dialog, DialogContent } from "../ui/dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../ui/tabs";
import {
  Users,
  FileText,
  Activity,
  Shield,
  CheckCircle,
  Edit,
  Trash2,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { getUsers, createUserByAdmin, searchUsers, changeRoleById, setStatusById, resetPasswordById, deleteAccountByNameRole, restoreAccountById, UserData } from "../../utils/auth";
import { pushNotification } from "../../utils/notifications";
import { publishApprovedArticle, rejectArticleUpdate } from "../../services/backend";

const PENDING_ARTICLES_KEY = "smartcow_pending_articles";
const ARTICLES_STORAGE_KEY = "smartcow_articles";
const ROBOT_STATUS_KEY = "smartcow_robot_status";
const ROBOT_LOGS_KEY = "smartcow_robot_logs";
const ROBOT_ACTIVITY_KEY = "smartcow_robot_activity";
const CONTENT_REVIEWS_KEY = "smartcow_content_reviews";

export default function AdminDashboard() {
  const [users, setUsers] = useState<UserData[]>([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterRole, setFilterRole] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [previewArticle, setPreviewArticle] = useState<any | null>(null);
  const [creating, setCreating] = useState({ name: "", email: "", password: "", role: "farmer" });
  const [resettingPasswordFor, setResettingPasswordFor] = useState<{ userId: string; userName: string; newPassword: string } | null>(null);
  const filteredUsers = useMemo(() => {
    const roleFilter = filterRole === 'all' ? undefined : (filterRole as any);
    const statusFilter = filterStatus === 'all' ? undefined : (filterStatus as any);
    return searchUsers(search, roleFilter, statusFilter, users);
  }, [search, filterRole, filterStatus, users]);

  const [pendingArticles, setPendingArticles] = useState<any[]>([]);
  const [pendingArticlesLoading, setPendingArticlesLoading] = useState(true);
  const robotStatus = useMemo(() => {
    try { const saved = localStorage.getItem(ROBOT_STATUS_KEY); return saved ? JSON.parse(saved) : { online: false, battery: 0, state: 'offline' }; } catch { return { online: false, battery: 0, state: 'offline' }; }
  }, [users]);
  const [robotLogs, setRobotLogs] = useState<any[]>(() => {
    try { const saved = localStorage.getItem(ROBOT_LOGS_KEY); return saved ? JSON.parse(saved) : []; } catch { return []; }
  });
  const [robotActivities, setRobotActivities] = useState<any[]>(() => {
    try { const saved = localStorage.getItem(ROBOT_ACTIVITY_KEY); return saved ? JSON.parse(saved) : []; } catch { return []; }
  });

  useEffect(() => {
    const loadUsers = async () => {
      setUsersLoading(true);
      try {
        const allUsers = await getUsers(true);
        setUsers(allUsers);
        
        // Only migrate localStorage users if Supabase is not configured
        const isSupabaseConfigured = !!(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY);
        if (!isSupabaseConfigured) {
          // migrate any pending users to active (legacy)
          const migrated = allUsers.map(u => u.status === 'pending' ? { ...u, status: 'active' } : u);
          localStorage.setItem('smartcow_users', JSON.stringify(migrated));
          setUsers(migrated);
        }
      } catch (error) {
        console.error('Error loading users:', error);
        // Fallback to sync version if async fails
        const { getUsersSync } = await import('../../utils/auth');
        setUsers(getUsersSync(true));
      } finally {
        setUsersLoading(false);
      }
    };
    
    loadUsers();
    // Load pending articles on mount
    refreshPendingArticles();
    
    // Listen for storage events to refresh pending articles
    const onStorage = (e: StorageEvent) => {
      if (e.key === PENDING_ARTICLES_KEY) {
        refreshPendingArticles();
      }
    };
    window.addEventListener('storage', onStorage);
    
    // live polling for real-time updates
    const poll = setInterval(() => {
      try {
        const logs = localStorage.getItem(ROBOT_LOGS_KEY);
        setRobotLogs(logs ? JSON.parse(logs) : []);
      } catch {}
      try {
        const acts = localStorage.getItem(ROBOT_ACTIVITY_KEY);
        setRobotActivities(acts ? JSON.parse(acts) : []);
      } catch {}
      try {
        const status = localStorage.getItem(ROBOT_STATUS_KEY);
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const parsed = status ? JSON.parse(status) : { online: false, battery: 0, state: 'offline' };
      } catch {}
      refreshPendingArticles();
    }, 1000);
    return () => {
      clearInterval(poll);
      window.removeEventListener('storage', onStorage);
    };
  }, []);
  const refreshUsers = async () => {
    try {
      const allUsers = await getUsers(true);
      setUsers(allUsers);
    } catch (error) {
      console.error('Error refreshing users:', error);
      // Fallback to sync version
      const { getUsersSync } = await import('../../utils/auth');
      setUsers(getUsersSync(true));
    }
  };
  const refreshPendingArticles = () => { try { const saved = localStorage.getItem(PENDING_ARTICLES_KEY); setPendingArticles(saved ? JSON.parse(saved) : []); } catch { setPendingArticles([]); } };

  const onCreateUser = () => { const res = createUserByAdmin(creating.name, creating.email, creating.password, creating.role as any); if (!res.success) return; setCreating({ name: "", email: "", password: "", role: "farmer" }); refreshUsers(); };
  const approveUser = async (id: string) => { 
    const result = await setStatusById(id, 'active');
    if (result.success) {
      toast.success('User approved');
      refreshUsers();
    } else {
      toast.error(result.message || 'Failed to approve user');
    }
  };
  const rejectUser = async (id: string) => { 
    const result = await setStatusById(id, 'banned');
    if (result.success) {
      toast.success('User banned');
      refreshUsers();
    } else {
      toast.error(result.message || 'Failed to ban user');
    }
  };
  const banUser = async (id: string) => { 
    const result = await setStatusById(id, 'banned');
    if (result.success) {
      toast.success('User banned');
      refreshUsers();
    } else {
      toast.error(result.message || 'Failed to ban user');
    }
  };
  const unbanUser = async (id: string) => { 
    const result = await setStatusById(id, 'active');
    if (result.success) {
      toast.success('User unbanned');
      refreshUsers();
    } else {
      toast.error(result.message || 'Failed to unban user');
    }
  };
  const suspendUser = async (id: string) => { 
    const result = await setStatusById(id, 'suspended');
    if (result.success) {
      toast.success('User suspended');
      refreshUsers();
    } else {
      toast.error(result.message || 'Failed to suspend user');
    }
  };
  const reactivateUser = async (id: string) => { 
    const result = await setStatusById(id, 'active');
    if (result.success) {
      toast.success('User reactivated');
      refreshUsers();
    } else {
      toast.error(result.message || 'Failed to reactivate user');
    }
  };
  const startResetPassword = (id: string) => {
    const user = users.find(u => u.id === id);
    setResettingPasswordFor({
      userId: id,
      userName: user?.name || 'user',
      newPassword: Math.random().toString(36).slice(2, 10), // Generate default password
    });
  };

  const handleResetPassword = async () => {
    if (!resettingPasswordFor || !resettingPasswordFor.newPassword.trim()) {
      toast.error('Password cannot be empty');
      return;
    }
    const result = await resetPasswordById(resettingPasswordFor.userId, resettingPasswordFor.newPassword.trim());
    if (result.success) {
      toast.success(`Password reset successful!`, {
        description: (
          <span className="text-gray-900 font-medium">
            New password for {resettingPasswordFor.userName}: <span className="font-bold">{resettingPasswordFor.newPassword}</span>
          </span>
        ),
        duration: 10000,
      });
      setResettingPasswordFor(null);
      refreshUsers();
    } else {
      toast.error('Failed to reset password', {
        description: result.message || 'User not found',
      });
    }
  };

  const cancelResetPassword = () => {
    setResettingPasswordFor(null);
  };
  const softDelete = async (u: UserData) => { 
    const result = await deleteAccountByNameRole(u.name, u.role);
    if (result.success) {
      toast.success('Account deleted');
      refreshUsers();
    } else {
      toast.error(result.message || 'Failed to delete account');
    }
  };
  const restore = async (id: string) => { 
    const result = await restoreAccountById(id);
    if (result.success) {
      toast.success('Account restored');
      refreshUsers();
    } else {
      toast.error(result.message || 'Failed to restore account');
    }
  };
  const changeRole = async (id: string, role: string) => { 
    const result = await changeRoleById(id, role as any);
    if (result.success) {
      toast.success('Role updated');
      refreshUsers();
    } else {
      toast.error(result.message || 'Failed to update role');
    }
  };

  const approveArticle = async (article: any, reviewMessage?: string) => {
    // Delete from Supabase if configured
    const isSupabaseConfigured = !!(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY);
    if (isSupabaseConfigured) {
      try {
        const supabaseArticles = await import('../../services/supabaseArticles');
        // Create published article
        await supabaseArticles.createEducationalArticle({
          authorId: article.authorId || '',
          authorName: article.author || 'Unknown',
          title: article.title,
          content: article.content || '',
          category: article.category || 'General',
          publishDate: new Date().toISOString(),
        });
        // Delete from pending
        await supabaseArticles.deletePendingArticle(article.id);
      } catch (error) {
        console.error('Error approving article in Supabase:', error);
      }
    }
    
    const remaining = pendingArticles.filter((a: any) => a.id !== article.id);
    localStorage.setItem(PENDING_ARTICLES_KEY, JSON.stringify(remaining));
    try { 
      const saved = localStorage.getItem(ARTICLES_STORAGE_KEY); 
      const list = saved ? JSON.parse(saved) : []; 
      // Ensure article has all required fields including content
      const published = { 
        ...article, 
        publishDate: new Date().toISOString(), 
        reviewMessage: reviewMessage || '',
        // Ensure content is included from pending article
        content: article.content || ''
      }; 
      localStorage.setItem(ARTICLES_STORAGE_KEY, JSON.stringify([published, ...list])); 
    } catch { 
      localStorage.setItem(ARTICLES_STORAGE_KEY, JSON.stringify([{ ...article, publishDate: new Date().toISOString(), content: article.content || '' }])); 
    }
    try { const logSaved = localStorage.getItem(CONTENT_REVIEWS_KEY); const logs = logSaved ? JSON.parse(logSaved) : []; const log = { id: Date.now().toString(), articleId: article.id, action: 'approved', message: reviewMessage || '', time: new Date().toISOString() }; localStorage.setItem(CONTENT_REVIEWS_KEY, JSON.stringify([log, ...logs])); } catch {}
    try { publishApprovedArticle({ id: article.id, authorId: article.authorId }); } catch {}
    await refreshPendingArticles();
    toast.success('Article approved and published');
  };
  const rejectArticle = async (article: any, reviewMessage?: string) => {
    // Delete from Supabase if configured
    const isSupabaseConfigured = !!(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY);
    if (isSupabaseConfigured) {
      try {
        const supabaseArticles = await import('../../services/supabaseArticles');
        await supabaseArticles.deletePendingArticle(article.id);
      } catch (error) {
        console.error('Error rejecting article in Supabase:', error);
      }
    }
    
    const remaining = pendingArticles.filter((a: any) => a.id !== article.id);
    localStorage.setItem(PENDING_ARTICLES_KEY, JSON.stringify(remaining));
    try { const logSaved = localStorage.getItem(CONTENT_REVIEWS_KEY); const logs = logSaved ? JSON.parse(logSaved) : []; const log = { id: Date.now().toString(), articleId: article.id, action: 'rejected', message: reviewMessage || '', time: new Date().toISOString() }; localStorage.setItem(CONTENT_REVIEWS_KEY, JSON.stringify([log, ...logs])); } catch {}
    try { rejectArticleUpdate({ id: article.id, authorId: article.authorId }); } catch {}
    await refreshPendingArticles();
  };
  // removed edit metadata per requirements


  return (
    <DashboardLayout title="Admin Dashboard">
      <div className="space-y-6">
        {/* Admin Overview */}
        <div className="grid md:grid-cols-3 gap-6">
          <AdminStatCard
            icon={<Users className="w-6 h-6" />}
            label="Total Users"
            value={String(users.length)}
            trend="+12% this month"
            color="from-blue-500 to-indigo-600"
          />
          <AdminStatCard
            icon={<Activity className="w-6 h-6" />}
            label="Robot Status"
            value={robotStatus?.online ? 'Online' : 'Offline'}
            trend={robotStatus?.battery ? `${robotStatus.battery}% battery` : 'No data'}
            color="from-green-500 to-emerald-600"
          />
          <AdminStatCard
            icon={<FileText className="w-6 h-6" />}
            label="Pending Content"
            value={String(pendingArticles.length)}
            trend="Needs review"
            color="from-purple-500 to-pink-600"
          />
        </div>

        {/* Main Admin Content */}
        <Card className="border-purple-200">
          <Tabs defaultValue="users" className="w-full">
            <TabsList className="grid w-full grid-cols-3 bg-gray-50 rounded-t-xl p-2">
              <TabsTrigger value="users" className="rounded-lg">
                User Management
              </TabsTrigger>
              <TabsTrigger
                value="content"
                className="rounded-lg"
              >
                Content Moderation
              </TabsTrigger>
              <TabsTrigger
                value="robots"
                className="rounded-lg"
              >
                Robot Monitoring
              </TabsTrigger>
            </TabsList>

            {/* User Management */}
            <TabsContent
              value="users"
              className="p-6 space-y-6"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-lg text-gray-900">Registered Users</h3>
                <div className="flex gap-2">
                  <Input placeholder="Search name or email" value={search} onChange={(e) => setSearch(e.target.value)} className="w-64 rounded-xl" />
                  <Select value={filterRole} onValueChange={setFilterRole}>
                    <SelectTrigger className="w-40 rounded-xl"><SelectValue placeholder="Filter role" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="farmer">Farmer</SelectItem>
                      <SelectItem value="compost_processor">Compost Processor</SelectItem>
                      <SelectItem value="seller">Seller</SelectItem>
                      <SelectItem value="buyer">Buyer</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={filterStatus} onValueChange={setFilterStatus}>
                    <SelectTrigger className="w-40 rounded-xl"><SelectValue placeholder="Filter status" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="banned">Banned</SelectItem>
                      <SelectItem value="suspended">Suspended</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex flex-col lg:flex-row gap-4">
                <div className="lg:w-80 flex-shrink-0 p-4 bg-white rounded-xl border border-purple-100 space-y-3">
                  <div className="text-gray-900 font-semibold">Create New User</div>
                  <Input placeholder="Name" value={creating.name} onChange={(e) => setCreating({ ...creating, name: e.target.value })} className="rounded-xl" />
                  <Input placeholder="Email" value={creating.email} onChange={(e) => setCreating({ ...creating, email: e.target.value })} className="rounded-xl" />
                  <Input placeholder="Temporary Password" value={creating.password} onChange={(e) => setCreating({ ...creating, password: e.target.value })} className="rounded-xl" />
                  <Select value={creating.role} onValueChange={(v) => setCreating({ ...creating, role: v })}>
                    <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="farmer">Farmer</SelectItem>
                      <SelectItem value="compost_processor">Compost Processor</SelectItem>
                      <SelectItem value="seller">Seller</SelectItem>
                      <SelectItem value="buyer">Buyer</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button size="sm" variant="outline" className="rounded-lg" onClick={onCreateUser}>Create</Button>
                </div>
                <div className="flex-1 min-w-0 p-4 bg-white rounded-xl border border-purple-100">
                  <div className="space-y-3 max-h-[600px] overflow-y-auto">
                    {usersLoading ? (
                      <div className="text-center py-8 text-gray-500">Loading users...</div>
                    ) : filteredUsers.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">No users found</div>
                    ) : (
                      filteredUsers.map(u => (
                        <div key={u.id}>
                          <div className="p-3 border border-purple-100 rounded-lg flex items-center justify-between">
                            <div className="min-w-0 flex-1">
                              <div className="text-gray-900 truncate">{u.name} <span className="text-xs text-gray-500">{u.email}</span></div>
                              <div className="text-xs text-gray-500 capitalize">{String(u.role).replace('_',' ')} • {u.status} • {u.lastLogin ? new Date(u.lastLogin).toLocaleString() : 'Never'}</div>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0 ml-4">
                              <Select value={u.role as any} onValueChange={(v) => changeRole(u.id, v)}>
                                <SelectTrigger className="w-40 rounded-lg"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="farmer">Farmer</SelectItem>
                                  <SelectItem value="compost_processor">Compost Processor</SelectItem>
                                  <SelectItem value="seller">Seller</SelectItem>
                                  <SelectItem value="buyer">Buyer</SelectItem>
                                </SelectContent>
                              </Select>
                              
                              {u.status !== 'banned' ? (
                                <Button size="sm" variant="outline" className="rounded-lg" onClick={() => banUser(u.id)}>Ban</Button>
                              ) : (
                                <Button size="sm" variant="outline" className="rounded-lg" onClick={() => unbanUser(u.id)}>Unban</Button>
                              )}
                              {u.status !== 'suspended' ? (
                                <Button size="sm" variant="outline" className="rounded-lg" onClick={() => suspendUser(u.id)}>Suspend</Button>
                              ) : (
                                <Button size="sm" variant="outline" className="rounded-lg" onClick={() => reactivateUser(u.id)}>Reactivate</Button>
                              )}
                              <Button size="sm" variant="outline" className="rounded-lg" onClick={() => startResetPassword(u.id)}>Reset Password</Button>
                              {!u.deletedAt ? (
                                <Button size="sm" variant="outline" className="rounded-lg text-red-600 border-red-200" onClick={() => softDelete(u)}><Trash2 className="w-3 h-3 mr-1" />Delete</Button>
                              ) : (
                                <Button size="sm" variant="outline" className="rounded-lg" onClick={() => restore(u.id)}>Restore</Button>
                              )}
                            </div>
                          </div>
                          {resettingPasswordFor && resettingPasswordFor.userId === u.id && (
                            <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                              <div className="flex items-center gap-2">
                                <div className="flex-1">
                                  <label className="text-xs font-medium text-gray-700 mb-1 block">New Password for {resettingPasswordFor.userName}</label>
                                  <Input
                                    type="text"
                                    placeholder="Enter new password"
                                    value={resettingPasswordFor.newPassword}
                                    onChange={(e) => setResettingPasswordFor({ ...resettingPasswordFor, newPassword: e.target.value })}
                                    className="rounded-lg"
                                  />
                                  <p className="text-xs text-gray-500 mt-1">You can use the generated password or enter a custom one</p>
                                </div>
                                <div className="flex flex-col gap-2">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={handleResetPassword}
                                    className="rounded-lg"
                                  >
                                    Confirm
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={cancelResetPassword}
                                    className="rounded-lg"
                                  >
                                    Cancel
                                  </Button>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
                <div className="lg:w-64 flex-shrink-0 p-4 bg-white rounded-xl border border-purple-100 space-y-4">
                  <div className="text-gray-900 font-semibold">User Statistics</div>
                  <div className="space-y-3">
                    <div className="p-3 bg-blue-50 rounded-lg">
                      <div className="text-xs text-gray-600 mb-1">Active Users</div>
                      <div className="text-2xl font-bold text-blue-600">{users.filter(u => u.status === 'active').length}</div>
                    </div>
                    <div className="p-3 bg-yellow-50 rounded-lg">
                      <div className="text-xs text-gray-600 mb-1">Banned Users</div>
                      <div className="text-2xl font-bold text-yellow-600">{users.filter(u => u.status === 'banned').length}</div>
                    </div>
                    <div className="p-3 bg-orange-50 rounded-lg">
                      <div className="text-xs text-gray-600 mb-1">Suspended</div>
                      <div className="text-2xl font-bold text-orange-600">{users.filter(u => u.status === 'suspended').length}</div>
                    </div>
                    <div className="p-3 bg-purple-50 rounded-lg">
                      <div className="text-xs text-gray-600 mb-1">Total Users</div>
                      <div className="text-2xl font-bold text-purple-600">{users.length}</div>
                    </div>
                  </div>
                  <div className="pt-3 border-t border-purple-100">
                    <div className="text-xs text-gray-600 mb-3">By Role</div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-700">Farmer</span>
                        <span className="font-semibold text-gray-900">{users.filter(u => u.role === 'farmer').length}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-700">Compost Processor</span>
                        <span className="font-semibold text-gray-900">{users.filter(u => u.role === 'compost_processor').length}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-700">Seller</span>
                        <span className="font-semibold text-gray-900">{users.filter(u => u.role === 'seller').length}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-700">Buyer</span>
                        <span className="font-semibold text-gray-900">{users.filter(u => u.role === 'buyer').length}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* Content Moderation */}
            <TabsContent
              value="content"
              className="p-6 space-y-6"
            >
              <h3 className="text-lg text-gray-900">Pending Educational Content</h3>

              <div className="space-y-3">
                {pendingArticles.length === 0 && (
                  <div className="p-4 bg-white rounded-xl border border-purple-100">No pending content.</div>
                )}
                {pendingArticles.map((a: any) => (
                  <div key={a.id} className="p-4 bg-gradient-to-r from-purple-50 to-blue-50 rounded-xl border border-purple-100">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h4 className="text-gray-900 mb-1">{a.title}</h4>
                        <div className="flex items-center gap-3 text-sm text-gray-600">
                          <span>By {a.author}</span>
                          <span>•</span>
                          <span>{a.category}</span>
                          <span>•</span>
                          <span>{new Date(a.submittedAt).toLocaleString()}</span>
                        </div>
                      </div>
                      <Badge className="bg-yellow-100 text-yellow-700">pending</Badge>
                    </div>
                    <div className="flex gap-2 mt-3">
                      <Button size="sm" className="bg-green-500 hover:bg-green-600 text-white rounded-lg" onClick={() => approveArticle(a)}>
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Approve
                      </Button>
                      <Button size="sm" variant="outline" className="rounded-lg text-red-600 border-red-200" onClick={() => rejectArticle(a)}>
                        Reject
                      </Button>
                      <Button size="sm" variant="outline" className="rounded-lg" onClick={() => setPreviewArticle(a)}>
                        View Content
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </TabsContent>
            <Dialog open={!!previewArticle} onOpenChange={() => setPreviewArticle(null)}>
              <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
                {previewArticle && (
                  <div className="space-y-2">
                    <h3 className="text-xl font-semibold text-gray-900">{previewArticle.title}</h3>
                    <div className="text-sm text-gray-600">By {previewArticle.author} • {previewArticle.category} • {new Date(previewArticle.submittedAt).toLocaleString()}</div>
                    <div className="prose prose-sm max-w-none text-gray-800">
                      {previewArticle.content || 'No content provided.'}
                    </div>
                  </div>
                )}
              </DialogContent>
            </Dialog>

            {/* Robot Monitoring */}
            <TabsContent
              value="robots"
              className="p-6 space-y-6"
            >
              <h3 className="text-lg text-gray-900">Robot Monitoring</h3>

              <div className="grid md:grid-cols-2 gap-6">
                <Card className="p-4 border-purple-200">
                  <h4 className="text-gray-900 mb-4">Robot Activity</h4>
                  <div className="space-y-3">
                    {robotLogs.length === 0 && (
                      <div className="p-3 bg-gray-50 rounded-lg text-sm text-gray-600">No logs available.</div>
                    )}
                    {robotLogs.map((log: any, i: number) => (
                      <ActivityLog key={i} type={log.type} message={log.message} time={new Date(log.time).toLocaleString()} />
                    ))}
                  </div>
                </Card>

                <Card className="p-4 border-purple-200">
                  <h4 className="text-gray-900 mb-4">Robot Activity History</h4>
                  <div className="space-y-3">
                    {robotActivities.length === 0 && (
                      <div className="p-3 bg-gray-50 rounded-lg text-sm text-gray-600">No activity.</div>
                    )}
                    {robotActivities.map((a: any, i: number) => (
                      <ActivityLog key={i} type="info" message={`${a.action} • ${a.status} • ${a.taskName || ''}`} time={new Date(a.time).toLocaleString()} />
                    ))}
                  </div>
                </Card>
              </div>
            </TabsContent>

          </Tabs>
        </Card>
      </div>
    </DashboardLayout>
  );
}

function AdminStatCard({
  icon,
  label,
  value,
  trend,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  trend: string;
  color: string;
}) {
  return (
    <Card className="p-6 border-purple-200">
      <div
        className={`w-12 h-12 bg-gradient-to-br ${color} rounded-xl flex items-center justify-center text-white mb-4`}
      >
        {icon}
      </div>
      <div className="text-2xl text-gray-900 mb-1">{value}</div>
      <div className="text-sm text-gray-600 mb-2">{label}</div>
      <div className="text-xs text-gray-500">{trend}</div>
    </Card>
  );
}

function RoleStatCard({
  role,
  count,
  color,
}: {
  role: string;
  count: string;
  color: string;
}) {
  return (
    <div className={`p-4 rounded-xl ${color}`}>
      <div className="text-2xl mb-1">{count}</div>
      <div className="text-sm">{role}</div>
    </div>
  );
}

function UserCard({
  name,
  email,
  role,
  status,
  joinDate,
}: {
  name: string;
  email: string;
  role: string;
  status: string;
  joinDate: string;
}) {
  return (
    <div className="flex items-center justify-between p-4 bg-white rounded-xl border-2 border-purple-100 hover:border-purple-300 transition-colors">
      <div className="flex items-center space-x-4">
        <div className="w-12 h-12 bg-gradient-to-br from-purple-400 to-blue-500 rounded-full flex items-center justify-center text-white text-lg">
          {name.charAt(0)}
        </div>
        <div>
          <div className="text-gray-900">{name}</div>
          <div className="text-sm text-gray-600">{email}</div>
          <div className="flex items-center gap-2 mt-1">
            <Badge className="text-xs bg-blue-100 text-blue-700">
              {role}
            </Badge>
            <span className="text-xs text-gray-500">
              Joined {joinDate}
            </span>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Badge
          className={
            status === "active"
              ? "bg-green-100 text-green-700"
              : "bg-yellow-100 text-yellow-700"
          }
        >
          {status}
        </Badge>
        <Button size="sm" variant="ghost">
          <Edit className="w-4 h-4" />
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="text-red-600"
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}

function ContentReviewCard({
  title,
  author,
  category,
  submittedDate,
  status,
}: {
  title: string;
  author: string;
  category: string;
  submittedDate: string;
  status: string;
}) {
  return (
    <div className="p-4 bg-gradient-to-r from-purple-50 to-blue-50 rounded-xl border border-purple-100">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <h4 className="text-gray-900 mb-1">{title}</h4>
          <div className="flex items-center gap-3 text-sm text-gray-600">
            <span>By {author}</span>
            <span>•</span>
            <span>{category}</span>
            <span>•</span>
            <span>{submittedDate}</span>
          </div>
        </div>
        <Badge
          className={
            status === "approved"
              ? "bg-green-100 text-green-700"
              : "bg-yellow-100 text-yellow-700"
          }
        >
          {status}
        </Badge>
      </div>

      {status === "pending" && (
        <div className="flex gap-2 mt-3">
          <Button
            size="sm"
            className="bg-green-500 hover:bg-green-600 text-white rounded-lg"
          >
            <CheckCircle className="w-3 h-3 mr-1" />
            Approve
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="rounded-lg"
          >
            Review
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="rounded-lg text-red-600 border-red-200"
          >
            Reject
          </Button>
        </div>
      )}
    </div>
  );
}

function ActivityLog({
  type,
  message,
  time,
}: {
  type: "success" | "warning" | "info";
  message: string;
  time: string;
}) {
  const colors = {
    success: "bg-green-100 text-green-700",
    warning: "bg-yellow-100 text-yellow-700",
    info: "bg-blue-100 text-blue-700",
  };

  return (
    <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
      <div
        className={`w-2 h-2 mt-2 rounded-full ${colors[type].replace("100", "500")}`}
      ></div>
      <div className="flex-1">
        <p className="text-sm text-gray-700">{message}</p>
        <span className="text-xs text-gray-500">{time}</span>
      </div>
    </div>
  );
}

function SupportTicketCard({
  ticketId,
  user,
  subject,
  priority,
  status,
  time,
}: {
  ticketId: string;
  user: string;
  subject: string;
  priority: string;
  status: string;
  time: string;
}) {
  const priorityColors = {
    urgent: "bg-red-100 text-red-700",
    high: "bg-orange-100 text-orange-700",
    medium: "bg-yellow-100 text-yellow-700",
    low: "bg-green-100 text-green-700",
  };

  const statusColors = {
    open: "bg-blue-100 text-blue-700",
    "in-progress": "bg-purple-100 text-purple-700",
    resolved: "bg-green-100 text-green-700",
  };

  return (
    <div className="p-4 bg-white rounded-xl border-2 border-purple-100 hover:border-purple-300 transition-colors">
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm text-gray-500">
              {ticketId}
            </span>
            <Badge
              className={
                priorityColors[
                  priority as keyof typeof priorityColors
                ]
              }
            >
              {priority}
            </Badge>
            <Badge
              className={
                statusColors[
                  status as keyof typeof statusColors
                ]
              }
            >
              {status}
            </Badge>
          </div>
          <h4 className="text-gray-900 mb-1">{subject}</h4>
          <div className="text-sm text-gray-600">
            {user} • {time}
          </div>
        </div>
      </div>

      <div className="flex gap-2 mt-3">
        <Button
          size="sm"
          className="bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg"
        >
          <MessageSquare className="w-3 h-3 mr-1" />
          Respond
        </Button>
        {status !== "resolved" && (
          <Button
            size="sm"
            variant="outline"
            className="rounded-lg"
          >
            Mark Resolved
          </Button>
        )}
      </div>
    </div>
  );
}
