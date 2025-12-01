import { useEffect, useMemo, useRef, useState } from 'react';
import DashboardLayout from './DashboardLayout';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { ScrollArea } from './ui/scroll-area';
import { Send, Search } from 'lucide-react';
import { useAuth } from '../App';
import { getAdminAccount, getUsers } from '../utils/auth';
import * as supabaseChat from '../services/supabaseChat';

// Check if Supabase is configured
const isSupabaseConfigured = () => {
  const url = import.meta.env.VITE_SUPABASE_URL;
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
  return !!(url && key && url.trim() !== '' && key.trim() !== '');
};

type ChatMessage = {
  id: string;
  conversationId: string;
  fromId: string;
  fromName: string;
  fromRole: string;
  toId: string;
  toName: string;
  toRole: string;
  text: string;
  timestamp: string;
};

type ConversationItem = {
  id: string;
  otherId: string;
  otherName: string;
  otherRole: string;
  lastMessage: string;
  lastTime: string;
  unread: number;
  online: boolean;
};

const CHAT_STORAGE_KEY = 'smartcow_chat_messages';
const CHAT_STATE_PREFIX = 'smartcow_chat_state:';

function makeConversationId(a: string, b: string) {
  return [a, b].sort().join('|');
}

export default function Chat() {
  const { userRole, userName } = useAuth();
  const currentUserId = `${userRole}:${userName || 'anonymous'}`;
  const [currentMessage, setCurrentMessage] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [activeChatUser, setActiveChatUser] = useState<{ id: string; name: string; role: string } | null>(null);
  const [isRoomOpen, setIsRoomOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const listRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const loadMessages = async () => {
      // Try Supabase first
      if (isSupabaseConfigured()) {
        try {
          const allMessages = await supabaseChat.getAllChatMessages(currentUserId);
          // Convert to ChatMessage format
          const converted: ChatMessage[] = allMessages.map((m) => ({
            id: m.id,
            conversationId: m.conversationId,
            fromId: m.senderId,
            fromName: m.senderName,
            fromRole: m.senderRole,
            toId: m.receiverId,
            toName: m.receiverName,
            toRole: m.receiverRole,
            text: m.message,
            timestamp: m.createdAt,
          }));
          setMessages(converted);
          return;
        } catch (error) {
          console.error('Error loading messages from Supabase:', error);
          // Fallback to localStorage
        }
      }
      
      // Fallback to localStorage
      const saved = localStorage.getItem(CHAT_STORAGE_KEY);
      if (saved) {
        try {
          setMessages(JSON.parse(saved));
        } catch {
          setMessages([]);
        }
      }
    };
    
    loadMessages();
    
    // Polling for updates (every 3 seconds)
    const interval = setInterval(() => {
      loadMessages();
    }, 3000);
    
    return () => clearInterval(interval);
  }, [currentUserId]);

  const persist = async (list: ChatMessage[]) => {
    // Save to Supabase if configured (new messages only)
    // Note: We don't sync all messages to avoid duplicates
    // Only new messages are saved to Supabase in handleSend
    
    // Always save to localStorage as backup
    localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(list));
  };

  const [allUsers, setAllUsers] = useState<Array<{ id: string; name: string; role: string }>>([]);

  useEffect(() => {
    const loadUsers = async () => {
      try {
        const u = await getUsers();
        const admin = getAdminAccount();
        const list = [admin, ...(Array.isArray(u) ? u : [])];
        const mapped = list.map(x => ({ id: `${x.role}:${x.name}`, name: x.name, role: x.role || 'admin' }));
        setAllUsers(mapped);
      } catch (error) {
        console.error('Error loading users:', error);
        // Fallback to admin only
        const admin = getAdminAccount();
        setAllUsers([{ id: `${admin.role}:${admin.name}`, name: admin.name, role: admin.role || 'admin' }]);
      }
    };
    loadUsers();
  }, []);

  const conversations: ConversationItem[] = useMemo(() => {
    const map = new Map<string, ConversationItem>();
    const stateKey = `${CHAT_STATE_PREFIX}${currentUserId}`;
    const state = (() => {
      const s = localStorage.getItem(stateKey);
      if (!s) return {} as Record<string, string>;
      try { return JSON.parse(s); } catch { return {} as Record<string, string>; }
    })();
    messages.forEach(m => {
      if (m.fromId !== currentUserId && m.toId !== currentUserId) return;
      const otherId = m.fromId === currentUserId ? m.toId : m.fromId;
      const otherName = m.fromId === currentUserId ? m.toName : m.fromName;
      const otherRole = m.fromId === currentUserId ? m.toRole : m.fromRole;
      const prev = map.get(m.conversationId);
      const unread = (() => {
        const lastSeen = state[m.conversationId];
        const isUnread = !lastSeen || new Date(m.timestamp).getTime() > new Date(lastSeen).getTime();
        return prev ? prev.unread + (isUnread && m.toId === currentUserId ? 1 : 0) : (isUnread && m.toId === currentUserId ? 1 : 0);
      })();
      const item: ConversationItem = {
        id: m.conversationId,
        otherId,
        otherName,
        otherRole: otherRole as string,
        lastMessage: m.text,
        lastTime: m.timestamp,
        unread,
        online: true,
      };
      map.set(m.conversationId, item);
    });
    const arr = Array.from(map.values());
    arr.sort((a, b) => new Date(b.lastTime).getTime() - new Date(a.lastTime).getTime());
    return arr;
  }, [messages, currentUserId]);

  useEffect(() => {
    if (activeChatUser) {
      const convId = makeConversationId(currentUserId, activeChatUser.id);
      setSelectedConversationId(convId);
    } else {
      setSelectedConversationId(null);
    }
  }, [activeChatUser, currentUserId]);

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
    if (selectedConversationId) {
      const stateKey = `${CHAT_STATE_PREFIX}${currentUserId}`;
      const stateJson = localStorage.getItem(stateKey);
      let state: Record<string, string> = {};
      if (stateJson) {
        try { state = JSON.parse(stateJson); } catch { state = {}; }
      }
      const last = messages.filter(m => m.conversationId === selectedConversationId).pop();
      if (last) {
        state[selectedConversationId] = last.timestamp;
        localStorage.setItem(stateKey, JSON.stringify(state));
      }
    }
  }, [messages, selectedConversationId, currentUserId]);

  const conversationMessages = useMemo(() => {
    const grouped: Record<string, ChatMessage[]> = {};
    messages.forEach(m => {
      if (m.fromId !== currentUserId && m.toId !== currentUserId) return;
      const otherId = m.fromId === currentUserId ? m.toId : m.fromId;
      if (!grouped[otherId]) grouped[otherId] = [];
      grouped[otherId].push(m);
    });
    return grouped;
  }, [messages, currentUserId]);

  const selectedMessages = useMemo(() => {
    if (!activeChatUser) return [] as ChatMessage[];
    return conversationMessages[activeChatUser.id] || [];
  }, [conversationMessages, activeChatUser]);

  const activeConversation = useMemo(() => {
    return conversations.find(c => c.id === selectedConversationId) || (activeChatUser ? {
      id: selectedConversationId || makeConversationId(currentUserId, activeChatUser.id),
      otherId: activeChatUser.id,
      otherName: activeChatUser.name,
      otherRole: activeChatUser.role,
      lastMessage: '',
      lastTime: new Date().toISOString(),
      unread: 0,
      online: true,
    } : null);
  }, [conversations, selectedConversationId, activeChatUser, currentUserId]);

  const usersSorted = useMemo(() => {
    const stateKey = `${CHAT_STATE_PREFIX}${currentUserId}`;
    let state: Record<string, string> = {};
    const s = localStorage.getItem(stateKey);
    if (s) { try { state = JSON.parse(s); } catch { state = {}; } }

    const convMap: Record<string, { messages: ChatMessage[]; unreadCount: number; lastUpdated: string }> = {};
    messages.forEach(m => {
      if (m.fromId !== currentUserId && m.toId !== currentUserId) return;
      const otherId = m.fromId === currentUserId ? m.toId : m.fromId;
      const convId = makeConversationId(currentUserId, otherId);
      if (!convMap[otherId]) convMap[otherId] = { messages: [], unreadCount: 0, lastUpdated: '' };
      convMap[otherId].messages.push(m);
      convMap[otherId].lastUpdated = m.timestamp;
    });

    const entries = allUsers
      .filter(u => u.id !== currentUserId)
      .filter(u => u.name.toLowerCase().includes(searchQuery.toLowerCase()) || u.role?.toString().toLowerCase().includes(searchQuery.toLowerCase()))
      .map(u => {
        const convId = makeConversationId(currentUserId, u.id);
        const convMsgs = convMap[u.id]?.messages || [];
        const lastTime = convMsgs.length > 0 ? convMsgs[convMsgs.length - 1].timestamp : '';
        const lastSeen = state[convId];
        const unreadCount = convMsgs.filter(m => m.toId === currentUserId && (!lastSeen || new Date(m.timestamp).getTime() > new Date(lastSeen).getTime())).length;
        return { user: u, lastTime, unreadCount };
      });
    entries.sort((a, b) => {
      const ua = a.unreadCount > 0 ? 1 : 0;
      const ub = b.unreadCount > 0 ? 1 : 0;
      if (ub !== ua) return ub - ua;
      const ta = a.lastTime ? new Date(a.lastTime).getTime() : 0;
      const tb = b.lastTime ? new Date(b.lastTime).getTime() : 0;
      return tb - ta;
    });
    return entries;
  }, [allUsers, messages, searchQuery, currentUserId]);

  const startChatWith = (otherId: string, otherName: string, otherRole: string) => {
    setActiveChatUser({ id: otherId, name: otherName, role: otherRole });
    setIsRoomOpen(true);
  };

  const handleSend = async () => {
    if (!currentMessage.trim() || !selectedConversationId || !activeConversation) return;
    const now = new Date().toISOString();
    
    let messageId = `m-${Date.now()}`;
    
    // Try Supabase first
    if (isSupabaseConfigured()) {
      try {
        const created = await supabaseChat.createChatMessage({
          conversationId: selectedConversationId,
          senderId: currentUserId,
          senderName: userName || 'Anonymous',
          senderRole: userRole || 'unknown',
          receiverId: activeConversation.otherId,
          receiverName: activeConversation.otherName,
          receiverRole: activeConversation.otherRole,
          message: currentMessage.trim(),
        });
        
        if (created) {
          messageId = created.id;
        }
      } catch (error) {
        console.error('Error sending message to Supabase:', error);
        // Continue with localStorage save
      }
    }
    
    const m: ChatMessage = {
      id: messageId,
      conversationId: selectedConversationId,
      fromId: currentUserId,
      fromName: userName || 'Anonymous',
      fromRole: userRole || 'unknown',
      toId: activeConversation.otherId,
      toName: activeConversation.otherName,
      toRole: activeConversation.otherRole,
      text: currentMessage.trim(),
      timestamp: now,
    };
    setMessages(prev => {
      const next = [...prev, m];
      persist(next);
      return next;
    });
    setCurrentMessage('');
  };

  return (
    <DashboardLayout title="Messages">
      <Card className="h-[calc(100vh-12rem)] flex border-purple-200 overflow-hidden">
        {!isRoomOpen && (
          <div className="flex-1 flex flex-col">
            <div className="p-4 border-b border-purple-100">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search users..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 rounded-xl border-purple-200"
                />
              </div>
            </div>
            <ScrollArea className="flex-1">
              <div className="p-2 space-y-1">
                {usersSorted.map(({ user: u, unreadCount, lastTime }) => (
                  <button
                    key={u.id}
                    onClick={() => startChatWith(u.id, u.name, u.role as string)}
                    className={`w-full p-3 rounded-xl text-left transition-all ${
                      activeChatUser && activeChatUser.id === u.id
                        ? 'bg-gradient-to-r from-blue-50 to-purple-50 border-2 border-purple-200'
                        : 'hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <div className="w-12 h-12 bg-gradient-to-br from-purple-400 to-blue-500 rounded-full flex items-center justify-center text-white">
                          {u.name.charAt(0)}
                        </div>
                        {unreadCount > 0 && (
                          <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm text-gray-900 truncate">{u.name}</span>
                          <Badge className="text-xs bg-blue-100 text-blue-700">{u.role as string}</Badge>
                        </div>
                        <span className="text-[10px] text-gray-500">{lastTime ? new Date(lastTime).toLocaleTimeString() : ''}</span>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </ScrollArea>
          </div>
        )}

        {isRoomOpen && (
          <div className="flex-1 flex flex-col">
            <div className="p-4 border-b border-purple-100 flex items-center gap-3">
              <Button variant="outline" className="rounded-xl" onClick={() => { setIsRoomOpen(false); setActiveChatUser(null); }}>
                Back
              </Button>
              <div className="w-10 h-10 bg-gradient-to-br from-purple-400 to-blue-500 rounded-full flex items-center justify-center text-white">
                {activeConversation?.otherName?.charAt(0) || activeChatUser?.name.charAt(0)}
              </div>
              <div className="flex items-center gap-2">
                <div className="text-gray-900">{activeConversation?.otherName || activeChatUser?.name}</div>
                <Badge className="text-xs bg-blue-100 text-blue-700">{activeConversation?.otherRole || activeChatUser?.role}</Badge>
              </div>
            </div>

            <ScrollArea className="flex-1 p-4">
              <div ref={listRef as any} className="space-y-4">
                {selectedMessages.map((msg) => (
                  <div key={msg.id} className={`flex ${msg.fromId === currentUserId ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-md ${msg.fromId === currentUserId ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white' : 'bg-gray-100 text-gray-900'} rounded-2xl px-4 py-2`}>
                      <p className="text-sm">
                        {msg.text}
                      </p>
                      <span className={`text-[10px] mt-1 block ${msg.fromId === currentUserId ? 'text-blue-100' : 'text-gray-500'}`}>
                        {new Date(msg.timestamp).toLocaleString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>

            <div className="p-4 border-t border-purple-100">
              <div className="flex items-end gap-2">
                <div className="flex-1">
                  <Input
                    placeholder="Type your message..."
                    value={currentMessage}
                    onChange={(e) => setCurrentMessage(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                    className="rounded-2xl border-purple-200"
                  />
                </div>
                <Button onClick={handleSend} className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white rounded-full px-6">
                  <Send className="w-4 h-4 mr-2" />
                  Send
                </Button>
              </div>
            </div>
          </div>
        )}
      </Card>
    </DashboardLayout>
  );
}
