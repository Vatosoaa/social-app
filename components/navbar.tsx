'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { 
  Sparkles, 
  Home, 
  Heart, 
  Tv, 
  MessageSquare, 
  Bell, 
  ChevronDown, 
  User, 
  Search, 
  LogOut, 
  LogIn, 
  UserPlus,
  MessageCircle,
  Heart as HeartIcon,
  UserPlus as UserPlusIcon,
  Loader2
} from 'lucide-react';
import { logout } from '@/app/actions/auth';
import { getConversations } from '@/app/actions/messages';
import { getNotifications, markNotificationsAsRead } from '@/app/actions/notifications';
import type { Conversation } from '@/app/actions/messages';
import type { AppNotification } from '@/app/actions/notifications';
import type { DbUser } from '@/lib/session';
import LiveSearchBar from '@/components/live-search-bar';
import { Button } from '@/components/ui/button';
import dynamic from 'next/dynamic';

const ChatFloatingWindow = dynamic(() => import('@/components/chat-floating-window'), { ssr: false });

interface NavbarProps {
  currentUser: DbUser | null;
  activeTab?: 'home' | 'favorites' | 'media' | 'search' | 'messages' | 'profile' | 'none';
  unreadMessagesCount?: number;
}

function formatRelativeTime(dateStr: string | null): string {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "À l'instant";
  if (m < 60) return `Il y a ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `Il y a ${h}h`;
  const d = Math.floor(h / 24);
  return `Il y a ${d}j`;
}

export default function Navbar({ 
  currentUser, 
  activeTab = 'none', 
  unreadMessagesCount = 0 
}: NavbarProps) {
  // Dropdown states
  const [menuOpen, setMenuOpen] = useState(false);
  const [messagesOpen, setMessagesOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  // Conversations & Notifications data
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [convSearch, setConvSearch] = useState('');
  const [loadingConvs, setLoadingConvs] = useState(false);

  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loadingNotifs, setLoadingNotifs] = useState(false);

  // Badges counts
  const [localUnreadMsgCount, setLocalUnreadMsgCount] = useState(unreadMessagesCount);
  const [unreadNotifsCount, setUnreadNotifsCount] = useState(0);

  // Floating chat windows
  const [openChats, setOpenChats] = useState<Conversation[]>([]);

  // Refs for click outside
  const dropdownRef = useRef<HTMLDivElement>(null);
  const messagesRef = useRef<HTMLDivElement>(null);
  const notificationsRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
      if (messagesRef.current && !messagesRef.current.contains(event.target as Node)) {
        setMessagesOpen(false);
      }
      if (notificationsRef.current && !notificationsRef.current.contains(event.target as Node)) {
        setNotificationsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch initial counts and data on mount
  useEffect(() => {
    if (currentUser) {
      getNotifications().then(data => {
        setNotifications(data);
        setUnreadNotifsCount(data.filter(n => !n.is_read).length);
      });
      getConversations().then(data => {
        setConversations(data);
        setLocalUnreadMsgCount(data.reduce((sum, c) => sum + c.unread_count, 0));
      });
    }
  }, [currentUser]);

  // Load conversations list when popover opens
  useEffect(() => {
    if (messagesOpen && currentUser) {
      setNotificationsOpen(false);
      setMenuOpen(false);
      setLoadingConvs(true);
      getConversations().then(data => {
        setConversations(data);
        setLocalUnreadMsgCount(data.reduce((sum, c) => sum + c.unread_count, 0));
        setLoadingConvs(false);
      });
    }
  }, [messagesOpen, currentUser]);

  // Load notifications and mark as read when popover opens
  useEffect(() => {
    if (notificationsOpen && currentUser) {
      setMessagesOpen(false);
      setMenuOpen(false);
      setLoadingNotifs(true);
      
      getNotifications().then(data => {
        setNotifications(data);
        setLoadingNotifs(false);
      });

      markNotificationsAsRead().then(res => {
        if (res.success) {
          setUnreadNotifsCount(0);
        }
      });
    }
  }, [notificationsOpen, currentUser]);

  // WebSocket for real-time message count sync
  useEffect(() => {
    if (!currentUser) return;
    
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = process.env.NEXT_PUBLIC_WS_URL || `${protocol}//${window.location.hostname}:3001`;
    let socket: WebSocket | null = null;
    
    function connect() {
      socket = new WebSocket(wsUrl);
      
      socket.onopen = () => {
        socket?.send(JSON.stringify({
          type: 'register',
          payload: { userId: currentUser!.id }
        }));
      };
      
      socket.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          
          if (msg.type === 'new_message') {
            setLocalUnreadMsgCount(prev => prev + 1);
            
            if (messagesOpen) {
              getConversations().then(setConversations);
            }
          }
        } catch (e) {
          console.error('WS Navbar error:', e);
        }
      };
      
      socket.onclose = () => {
        setTimeout(() => {
          if (currentUser) connect();
        }, 5000);
      };
    }
    
    connect();
    
    return () => {
      if (socket) socket.close();
    };
  }, [currentUser, messagesOpen]);

  // Open a floating chat window
  const handleOpenChat = (conv: Conversation) => {
    setMessagesOpen(false);
    if (conv.unread_count > 0) {
      setLocalUnreadMsgCount(prev => Math.max(0, prev - conv.unread_count));
    }
    setOpenChats(prev => {
      const exists = prev.find(c => c.conversation_id === conv.conversation_id);
      if (exists) return prev;
      const capped = prev.length >= 3 ? prev.slice(1) : prev;
      return [...capped, conv];
    });
  };

  const handleCloseChat = (convId: number) => {
    setOpenChats(prev => prev.filter(c => c.conversation_id !== convId));
  };

  // Filter conversations based on inner search input
  const filteredConversations = conversations.filter(c => {
    const term = convSearch.toLowerCase().trim();
    if (!term) return true;
    return (
      (c.other_user_name || '').toLowerCase().includes(term) ||
      (c.last_message_content || '').toLowerCase().includes(term)
    );
  });

  return (
    <>
      <header className="sticky top-0 z-40 w-full border-b border-zinc-900 bg-zinc-950/95 backdrop-blur-md">
        <div className="max-w-6xl mx-auto flex items-center justify-between px-4 sm:px-6 py-2.5">
          
          {/* Left: Logo & Search */}
          <div className="flex items-center gap-4 flex-1 max-w-lg min-w-0">
            <Link href="/" className="flex-shrink-0">
              <div className="flex items-center gap-1 relative select-none cursor-pointer">
                <span className="font-serif text-xl font-bold tracking-wide text-teal-300 relative pr-4">
                  Twinkly
                  <Sparkles className="h-3.5 w-3.5 text-teal-200 absolute top-[-5px] right-[2px] animate-pulse" />
                </span>
              </div>
            </Link>
            
            {currentUser && (
              <div className="flex-1 hidden sm:block relative z-[9999]">
                <LiveSearchBar placeholder="Rechercher sur Twinkly..." variant="navbar" />
              </div>
            )}
          </div>

          {/* Center: Tabs (only for logged-in users) */}
          {currentUser && (
            <div className="flex items-center justify-center flex-1 px-2">
              <div className="flex items-center gap-1 md:gap-4">
                {/* Home tab */}
                <Link href="/">
                  <div className="relative py-1.5 px-3 md:px-5 flex flex-col items-center justify-center group cursor-pointer">
                    <Home className={`h-5 w-5 transition-all group-hover:scale-105 ${
                      activeTab === 'home' ? 'text-teal-400' : 'text-zinc-550 group-hover:text-zinc-300'
                    }`} />
                    {activeTab === 'home' && (
                      <div className="absolute bottom-[-14px] w-7 h-[2.5px] bg-teal-400 rounded-full shadow-[0_0_8px_#2dd4bf]" />
                    )}
                  </div>
                </Link>

                {/* Heart/Favorites tab */}
                <Link href="/?filter=favorites">
                  <div className="relative py-1.5 px-3 md:px-5 flex flex-col items-center justify-center group cursor-pointer">
                    <Heart className={`h-5 w-5 transition-all group-hover:scale-105 ${
                      activeTab === 'favorites' ? 'text-teal-400' : 'text-zinc-550 group-hover:text-zinc-300'
                    }`} />
                    {activeTab === 'favorites' && (
                      <div className="absolute bottom-[-14px] w-7 h-[2.5px] bg-teal-400 rounded-full shadow-[0_0_8px_#2dd4bf]" />
                    )}
                  </div>
                </Link>

                {/* Video/Media tab */}
                <Link href="/?filter=media">
                  <div className="relative py-1.5 px-3 md:px-5 flex flex-col items-center justify-center group cursor-pointer">
                    <Tv className={`h-5 w-5 transition-all group-hover:scale-105 ${
                      activeTab === 'media' ? 'text-teal-400' : 'text-zinc-550 group-hover:text-zinc-300'
                    }`} />
                    {activeTab === 'media' && (
                      <div className="absolute bottom-[-14px] w-7 h-[2.5px] bg-teal-400 rounded-full shadow-[0_0_8px_#2dd4bf]" />
                    )}
                  </div>
                </Link>
              </div>
            </div>
          )}

          {/* Right: Actions */}
          <div className="flex items-center gap-3 flex-shrink-0">
            {currentUser ? (
              <>
                {/* Chat icon with Facebook-like dropdown */}
                <div className="relative" ref={messagesRef}>
                  <div 
                    onClick={() => setMessagesOpen(!messagesOpen)}
                    className={`p-2 rounded-full border bg-zinc-900/60 transition-all cursor-pointer select-none ${
                      messagesOpen 
                        ? 'border-teal-500/30 text-teal-400 bg-teal-950/10' 
                        : 'border-zinc-850 hover:border-zinc-800 text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    <MessageSquare className="h-4.5 w-4.5" />
                  </div>
                  {localUnreadMsgCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white text-[9px] font-extrabold h-4 min-w-[16px] px-1.5 rounded-full flex items-center justify-center animate-pulse border border-zinc-950">
                      {localUnreadMsgCount}
                    </span>
                  )}

                  {/* Discussions dropdown */}
                  {messagesOpen && (
                    <div className="absolute right-0 mt-3.5 w-[360px] max-w-[calc(100vw-32px)] rounded-2xl border border-zinc-800 bg-zinc-950/98 backdrop-blur-xl p-4 shadow-2xl z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                      <div className="flex items-center justify-between pb-2 border-b border-zinc-900/60">
                        <span className="text-sm font-bold text-zinc-100">Discussions</span>
                        <Link 
                          href="/messages" 
                          onClick={() => setMessagesOpen(false)}
                          className="text-xs font-semibold text-teal-400 hover:text-teal-300 transition-colors"
                        >
                          Tout voir
                        </Link>
                      </div>

                      {/* Internal Filter Search Input */}
                      <div className="relative my-2.5">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-550" />
                        <input
                          type="text"
                          placeholder="Rechercher une discussion..."
                          value={convSearch}
                          onChange={e => setConvSearch(e.target.value)}
                          className="w-full pl-9 pr-4 py-1.5 bg-zinc-900/40 border border-zinc-850 hover:bg-zinc-900/70 rounded-full text-xs text-zinc-250 placeholder:text-zinc-555 focus:outline-none focus:border-teal-500/50"
                        />
                      </div>

                      {/* Conversations List - clicking opens floating chat */}
                      <div className="max-h-[280px] overflow-y-auto space-y-1 pr-1">
                        {loadingConvs ? (
                          <div className="flex items-center justify-center py-8 text-zinc-500 text-xs gap-1.5">
                            <Loader2 className="h-3.5 w-3.5 animate-spin text-teal-400" />
                            Chargement des discussions...
                          </div>
                        ) : filteredConversations.length > 0 ? (
                          filteredConversations.map(c => {
                            const isUnread = c.unread_count > 0;
                            return (
                              <button
                                key={c.conversation_id}
                                onClick={() => handleOpenChat(c)}
                                className="w-full flex items-center gap-3 p-2 rounded-xl hover:bg-zinc-900/50 transition-all cursor-pointer group text-left"
                              >
                                <div className="relative h-9 w-9 rounded-full overflow-hidden border border-zinc-800 bg-zinc-900 flex-shrink-0">
                                  {c.other_user_avatar ? (
                                    <img 
                                      src={c.other_user_avatar} 
                                      alt={c.other_user_name || ''} 
                                      className="h-full w-full object-cover" 
                                    />
                                  ) : (
                                    <div className="h-full w-full flex items-center justify-center bg-zinc-950 text-zinc-500">
                                      <User className="h-4.5 w-4.5" />
                                    </div>
                                  )}
                                  
                                  {c.other_user_last_active === 'online' && (
                                    <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-emerald-500 border border-zinc-950 shadow-sm" />
                                  )}
                                </div>

                                <div className="flex-1 min-w-0">
                                  <div className="flex items-baseline justify-between gap-1">
                                    <p className="text-xs font-bold text-zinc-200 group-hover:text-teal-400 transition-colors truncate">
                                      {c.other_user_name}
                                    </p>
                                    <span className="text-[10px] text-zinc-550 whitespace-nowrap">
                                      {formatRelativeTime(c.last_message_created_at)}
                                    </span>
                                  </div>
                                  <p className={`text-[11px] truncate mt-0.5 ${
                                    isUnread ? 'text-zinc-100 font-semibold' : 'text-zinc-500'
                                  }`}>
                                    {c.last_message_sender_id === currentUser.id ? 'Vous : ' : ''}
                                    {c.last_message_content || (c.last_message_image ? '📷 Image' : 'Aucun message')}
                                  </p>
                                </div>

                                {isUnread && (
                                  <span className="h-2.5 w-2.5 rounded-full bg-teal-500 flex-shrink-0" />
                                )}
                              </button>
                            );
                          })
                        ) : (
                          <div className="text-center py-8 text-zinc-550 text-xs">
                            Aucune discussion trouvée.
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Notification icon with Facebook-like dropdown */}
                <div className="relative" ref={notificationsRef}>
                  <div 
                    onClick={() => setNotificationsOpen(!notificationsOpen)}
                    className={`p-2 rounded-full border bg-zinc-900/60 transition-all cursor-pointer select-none ${
                      notificationsOpen
                        ? 'border-teal-500/30 text-teal-400 bg-teal-950/10' 
                        : 'border-zinc-850 hover:border-zinc-800 text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    <Bell className="h-4.5 w-4.5" />
                  </div>
                  {unreadNotifsCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-gradient-to-r from-teal-550 to-cyan-550 text-white text-[9px] font-extrabold h-4 min-w-[16px] px-1.5 rounded-full flex items-center justify-center animate-pulse border border-zinc-950">
                      {unreadNotifsCount}
                    </span>
                  )}

                  {/* Notifications dropdown */}
                  {notificationsOpen && (
                    <div className="absolute right-0 mt-3.5 w-[360px] max-w-[calc(100vw-32px)] rounded-2xl border border-zinc-800 bg-zinc-950/98 backdrop-blur-xl p-4 shadow-2xl z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                      <div className="pb-2 border-b border-zinc-900/60">
                        <span className="text-sm font-bold text-zinc-100">Notifications</span>
                      </div>

                      {/* Notifications List */}
                      <div className="max-h-[300px] overflow-y-auto space-y-1 mt-2 pr-1">
                        {loadingNotifs ? (
                          <div className="flex items-center justify-center py-8 text-zinc-500 text-xs gap-1.5">
                            <Loader2 className="h-3.5 w-3.5 animate-spin text-teal-400" />
                            Chargement des notifications...
                          </div>
                        ) : notifications.length > 0 ? (
                          notifications.map(n => {
                            const link = n.type === 'follow' 
                              ? `/profile/${n.notifier_id}` 
                              : `/?post=${n.post_id}`;

                            return (
                              <Link
                                key={n.id}
                                href={link}
                                onClick={() => setNotificationsOpen(false)}
                                className="flex items-start gap-3 p-2 rounded-xl hover:bg-zinc-900/50 transition-all cursor-pointer group relative"
                              >
                                <div className="relative h-9 w-9 flex-shrink-0">
                                  <div className="h-full w-full rounded-full overflow-hidden border border-zinc-800 bg-zinc-900">
                                    {n.notifier_avatar ? (
                                      <img src={n.notifier_avatar} alt="" className="h-full w-full object-cover" />
                                    ) : (
                                      <div className="h-full w-full flex items-center justify-center bg-zinc-950 text-zinc-500">
                                        <User className="h-4.5 w-4.5" />
                                      </div>
                                    )}
                                  </div>
                                  
                                  <div className={`absolute bottom-[-2px] right-[-2px] h-4.5 w-4.5 rounded-full flex items-center justify-center border border-zinc-950 shadow-md ${
                                    n.type === 'reaction' 
                                      ? 'bg-rose-600 text-white' 
                                      : n.type === 'comment' 
                                      ? 'bg-cyan-600 text-white' 
                                      : 'bg-violet-600 text-white'
                                  }`}>
                                    {n.type === 'reaction' ? (
                                      <HeartIcon className="h-2.5 w-2.5 fill-current" />
                                    ) : n.type === 'comment' ? (
                                      <MessageCircle className="h-2.5 w-2.5 fill-current" />
                                    ) : (
                                      <UserPlusIcon className="h-2.5 w-2.5 fill-current" />
                                    )}
                                  </div>
                                </div>

                                <div className="flex-1 min-w-0">
                                  <p className="text-xs text-zinc-350 leading-normal">
                                    <span className="font-bold text-zinc-150 group-hover:text-teal-400 transition-colors">
                                      {n.notifier_name}
                                    </span>
                                    {n.type === 'reaction' && " a réagi à votre publication."}
                                    {n.type === 'comment' && " a commenté votre publication."}
                                    {n.type === 'follow' && " vous suit désormais."}
                                  </p>
                                  <span className="text-[10px] text-zinc-550 mt-1 block">
                                    {formatRelativeTime(n.created_at)}
                                  </span>
                                </div>

                                {!n.is_read && (
                                  <span className="h-2 w-2 rounded-full bg-teal-500 flex-shrink-0 mt-2" />
                                )}
                              </Link>
                            );
                          })
                        ) : (
                          <div className="text-center py-8 text-zinc-550 text-xs">
                            Aucune nouvelle notification.
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Profile Avatar with Decorative Sparkles and Dropdown */}
                <div className="relative" ref={dropdownRef}>
                  <div 
                    onClick={() => setMenuOpen(!menuOpen)}
                    className="relative cursor-pointer select-none group focus:outline-none"
                  >
                    <Sparkles className="h-2.5 w-2.5 text-teal-400 absolute top-[-3px] right-[-3px] animate-pulse pointer-events-none" />
                    <Sparkles className="h-2 w-2 text-fuchsia-400 absolute bottom-[-1px] left-[-3px] animate-pulse pointer-events-none" />

                    <div className={`h-8 w-8 rounded-full overflow-hidden border-2 transition-all group-hover:scale-102 ${
                      menuOpen ? 'border-teal-400' : 'border-zinc-700 hover:border-zinc-550'
                    }`}>
                      {currentUser.avatar_url ? (
                        <img 
                          src={currentUser.avatar_url} 
                          alt={currentUser.name || 'Avatar'} 
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center bg-zinc-950 text-zinc-500">
                          <User className="h-4.5 w-4.5" />
                        </div>
                      )}
                    </div>

                    <div className="h-4 w-4 bg-zinc-900 border border-zinc-800 rounded-full flex items-center justify-center absolute bottom-[-2px] right-[-2px] shadow-md transition-transform group-hover:translate-y-[1px]">
                      <ChevronDown className="h-2.5 w-2.5 text-zinc-400" />
                    </div>
                  </div>

                  {/* Facebook-style Profile Dropdown */}
                  {menuOpen && (
                    <div className="absolute right-0 mt-3.5 w-[340px] max-w-[calc(100vw-16px)] rounded-2xl border border-zinc-800/80 bg-zinc-950/98 backdrop-blur-xl shadow-2xl z-50 animate-in fade-in slide-in-from-top-2 duration-150 overflow-hidden">
                      
                      {/* Top section: User card */}
                      <div className="p-3">
                        <Link
                          href="/profile"
                          onClick={() => setMenuOpen(false)}
                          className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-zinc-900/60 transition-all group cursor-pointer"
                        >
                          <div className="relative flex-shrink-0">
                            <div className="h-14 w-14 rounded-full overflow-hidden border-2 border-zinc-700 shadow-lg">
                              {currentUser.avatar_url ? (
                                <img
                                  src={currentUser.avatar_url}
                                  alt={currentUser.name || 'Avatar'}
                                  className="h-full w-full object-cover"
                                />
                              ) : (
                                <div className="h-full w-full flex items-center justify-center bg-gradient-to-br from-teal-900/80 to-zinc-900 text-teal-400">
                                  <User className="h-7 w-7" />
                                </div>
                              )}
                            </div>
                            <span className="absolute bottom-0.5 right-0.5 h-3 w-3 rounded-full bg-emerald-500 border-2 border-zinc-950 shadow-sm" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-bold text-zinc-100 group-hover:text-teal-400 transition-colors truncate">{currentUser.name}</p>
                            <p className="text-[11px] text-zinc-500 truncate mt-0.5">Voir votre profil</p>
                          </div>
                          <ChevronDown className="h-4 w-4 text-zinc-600 rotate-[-90deg] flex-shrink-0" />
                        </Link>
                      </div>

                      <div className="h-px bg-zinc-800/60 mx-3" />

                      {/* Settings & Links section */}
                      <div className="p-3 space-y-0.5">

                        <Link href="/messages" onClick={() => setMenuOpen(false)}>
                          <div className="flex items-center gap-3 px-2.5 py-2.5 rounded-xl hover:bg-zinc-900/60 transition-all cursor-pointer group">
                            <div className="h-9 w-9 rounded-full bg-zinc-800/80 flex items-center justify-center flex-shrink-0 group-hover:bg-zinc-700/80 transition-colors">
                              <MessageSquare className="h-4.5 w-4.5 text-zinc-300" />
                            </div>
                            <span className="text-sm font-medium text-zinc-300 group-hover:text-zinc-100 transition-colors flex-1">Messages</span>
                            <ChevronDown className="h-4 w-4 text-zinc-600 rotate-[-90deg] flex-shrink-0" />
                          </div>
                        </Link>

                        <Link href="/search" onClick={() => setMenuOpen(false)}>
                          <div className="flex items-center gap-3 px-2.5 py-2.5 rounded-xl hover:bg-zinc-900/60 transition-all cursor-pointer group">
                            <div className="h-9 w-9 rounded-full bg-zinc-800/80 flex items-center justify-center flex-shrink-0 group-hover:bg-zinc-700/80 transition-colors">
                              <Search className="h-4.5 w-4.5 text-zinc-300" />
                            </div>
                            <span className="text-sm font-medium text-zinc-300 group-hover:text-zinc-100 transition-colors flex-1">Recherche</span>
                            <ChevronDown className="h-4 w-4 text-zinc-600 rotate-[-90deg] flex-shrink-0" />
                          </div>
                        </Link>

                        <Link href="/?filter=favorites" onClick={() => setMenuOpen(false)}>
                          <div className="flex items-center gap-3 px-2.5 py-2.5 rounded-xl hover:bg-zinc-900/60 transition-all cursor-pointer group">
                            <div className="h-9 w-9 rounded-full bg-zinc-800/80 flex items-center justify-center flex-shrink-0 group-hover:bg-zinc-700/80 transition-colors">
                              <Heart className="h-4.5 w-4.5 text-zinc-300" />
                            </div>
                            <span className="text-sm font-medium text-zinc-300 group-hover:text-zinc-100 transition-colors flex-1">Mes favoris</span>
                            <ChevronDown className="h-4 w-4 text-zinc-600 rotate-[-90deg] flex-shrink-0" />
                          </div>
                        </Link>
                      </div>

                      <div className="h-px bg-zinc-800/60 mx-3" />

                      {/* Logout */}
                      <div className="p-3">
                        <form action={logout}>
                          <button
                            type="submit"
                            className="w-full flex items-center gap-3 px-2.5 py-2.5 rounded-xl hover:bg-rose-950/20 transition-all cursor-pointer group text-left"
                          >
                            <div className="h-9 w-9 rounded-full bg-zinc-800/80 flex items-center justify-center flex-shrink-0 group-hover:bg-rose-950/40 transition-colors">
                              <LogOut className="h-4.5 w-4.5 text-zinc-300 group-hover:text-rose-400" />
                            </div>
                            <span className="text-sm font-medium text-zinc-300 group-hover:text-rose-400 transition-colors">Se déconnecter</span>
                          </button>
                        </form>

                        {/* Footer */}
                        <div className="mt-2 px-2.5 pb-1">
                          <p className="text-[10px] text-zinc-600 leading-relaxed">
                            Confidentialité · Conditions · Cookies
                            <span className="ml-1 text-zinc-700">· Twinkly © {new Date().getFullYear()}</span>
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                </div>
              </>
            ) : (
              <>
                <Link href="/login">
                  <Button variant="ghost" className="h-9 text-zinc-400 hover:text-zinc-200 rounded-xl text-sm">
                    <LogIn className="h-4 w-4 mr-1.5" /> Connexion
                  </Button>
                </Link>
                <Link href="/signup">
                  <Button className="h-9 bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-500 hover:to-cyan-500 text-white rounded-xl text-sm font-semibold shadow-md shadow-teal-500/10">
                    <UserPlus className="h-4 w-4 mr-1.5" /> Rejoindre
                  </Button>
                </Link>
              </>
            )}
          </div>

        </div>
      </header>

      {/* Floating Chat Windows - rendered at root level, fixed bottom-right */}
      {currentUser && openChats.map((conv, index) => (
        <ChatFloatingWindow
          key={conv.conversation_id}
          conversation={conv}
          currentUser={currentUser}
          onClose={() => handleCloseChat(conv.conversation_id)}
          zIndex={1000 + index}
          offsetRight={index * 344}
        />
      ))}
    </>
  );
}
