'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import Link from 'next/link';
import { 
  User, Send, Image as ImageIcon, Loader2, Sparkles, X, 
  CornerDownRight, Check, CheckCheck, Eye, Trash2, ArrowLeft,
  Smile
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { 
  getConversations, getMessages, sendMessage, deleteMessage, 
  markAsRead, markAsDelivered 
} from '@/app/actions/messages';
import type { Conversation, ChatMessage } from '@/app/actions/messages';
import type { DbUser } from '@/lib/session';
import { useAlert } from '@/components/providers/alert-provider';

interface MessagesClientProps {
  currentUser: DbUser;
  initialConversations: Conversation[];
  initialActiveId?: number;
}

const EMOJIS = [
  '😀', '😂', '😍', '🥰', '😘', '😜', '😎', '😊',
  '🤔', '🤨', '🙄', '😤', '😢', '😭', '😡', '😱',
  '👍', '👎', '👊', '👋', '👏', '🙌', '🙏', '🤝',
  '❤️', '💔', '💖', '🔥', '✨', '🎉', '🌟', '🚀'
];

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

export default function MessagesClient({ currentUser, initialConversations, initialActiveId }: MessagesClientProps) {
  const { showAlert, showConfirm } = useAlert();
  const [conversations, setConversations] = useState<Conversation[]>(initialConversations);
  const [activeId, setActiveId] = useState<number | null>(initialActiveId || null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  
  // Saisie message
  const [inputText, setInputText] = useState('');
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [showEmojis, setShowEmojis] = useState(false);
  const [replyingTo, setReplyingTo] = useState<ChatMessage | null>(null);

  // Real-time states
  const [isTyping, setIsTyping] = useState(false);
  const [otherPresence, setOtherPresence] = useState<string>('offline');

  // Timers/Refs
  const socketRef = useRef<WebSocket | null>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const isTypingLocalRef = useRef(false);
  const localTypingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [isPending, startTransition] = useTransition();

  const activeConv = conversations.find(c => c.conversation_id === activeId);

  // 1. Establish WebSocket Connection
  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = process.env.NEXT_PUBLIC_WS_URL || `${protocol}//${window.location.hostname}:3001`;

    function connect() {
      const socket = new WebSocket(wsUrl);
      socketRef.current = socket;

      socket.onopen = () => {
        console.log('WS Connected');
        // Register current user session
        socket.send(JSON.stringify({
          type: 'register',
          payload: { userId: currentUser.id }
        }));

        // Fetch user statuses for all conversations
        conversations.forEach(c => {
          socket.send(JSON.stringify({
            type: 'query_status',
            payload: { targetId: c.other_user_id }
          }));
        });
      };

      socket.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          const { type, payload } = message;

          switch (type) {
            case 'new_message':
              const newMsg = payload as ChatMessage;
              if (newMsg.sender_id === currentUser.id) {
                break;
              }
              // If the message is in the active chat, display it and mark seen
              if (activeId && newMsg.conversation_id === activeId) {
                setMessages(prev => {
                  if (prev.some(m => m.id === newMsg.id)) return prev;
                  return [...prev, newMsg];
                });
                
                // Call mark read Server Action and send socket ACK
                markAsRead(activeId);
                socket.send(JSON.stringify({
                  type: 'message_seen',
                  payload: { targetId: newMsg.sender_id, conversationId: activeId }
                }));
              } else {
                // If it is in a different chat, increment unread count and set delivered status
                setConversations(prev => prev.map(c => {
                  if (c.conversation_id === newMsg.conversation_id) {
                    return {
                      ...c,
                      last_message_content: newMsg.content,
                      last_message_image: newMsg.image_url,
                      last_message_sender_id: newMsg.sender_id,
                      last_message_status: 'delivered',
                      last_message_created_at: newMsg.created_at,
                      unread_count: c.unread_count + 1
                    };
                  }
                  return c;
                }));

                markAsDelivered(newMsg.conversation_id);
                socket.send(JSON.stringify({
                  type: 'message_delivered',
                  payload: { targetId: newMsg.sender_id, conversationId: newMsg.conversation_id }
                }));
              }
              break;

            case 'typing':
              if (activeConv && payload.conversationId === activeId) {
                setIsTyping(true);
                // Auto-clear typing indicator after 4 seconds of inactivity
                if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
                typingTimeoutRef.current = setTimeout(() => setIsTyping(false), 4000);
              }
              break;

            case 'stop_typing':
              if (activeConv && payload.conversationId === activeId) {
                setIsTyping(false);
                if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
              }
              break;

            case 'message_seen':
              if (activeId && payload.conversationId === activeId) {
                setMessages(prev => prev.map(m => m.sender_id === currentUser.id ? { ...m, status: 'seen' } : m));
              }
              break;

            case 'message_delivered':
              if (activeId && payload.conversationId === activeId) {
                setMessages(prev => prev.map(m => m.sender_id === currentUser.id && m.status === 'sent' ? { ...m, status: 'delivered' } : m));
              }
              break;

            case 'user_status':
              // Sync user presence state
              if (activeConv && payload.userId === activeConv.other_user_id) {
                setOtherPresence(payload.status);
              }
              setConversations(prev => prev.map(c => {
                if (c.other_user_id === payload.userId) {
                  return { ...c, other_user_last_active: payload.status };
                }
                return c;
              }));
              break;
          }
        } catch (e) {
          console.error(e);
        }
      };

      socket.onclose = () => {
        console.log('WS Disconnected. Reconnecting in 3s...');
        setTimeout(connect, 3000);
      };
    }

    connect();

    return () => {
      if (socketRef.current) {
        socketRef.current.close();
      }
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    };
  }, [activeId, conversations.length]);

  // 2. Fetch Messages on Active Conversation Change
  useEffect(() => {
    if (!activeId) return;

    // Load messages from database
    startTransition(async () => {
      const data = await getMessages(activeId);
      setMessages(data);

      // Clear local unread counts
      setConversations(prev => prev.map(c => c.conversation_id === activeId ? { ...c, unread_count: 0 } : c));

      // Mark as read in Database
      await markAsRead(activeId);

      // Notify recipient that current user is looking at the conversation
      if (activeConv && socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
        socketRef.current.send(JSON.stringify({
          type: 'message_seen',
          payload: { targetId: activeConv.other_user_id, conversationId: activeId }
        }));
      }
    });

    // Reset writing indicator
    setIsTyping(false);

    // Query presence
    if (activeConv && socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({
        type: 'query_status',
        payload: { targetId: activeConv.other_user_id }
      }));
    }
  }, [activeId]);

  // 3. Scroll to Bottom
  useEffect(() => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTo({
        top: messagesContainerRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  }, [messages, isTyping]);

  // 4. Typing broadcast management
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputText(e.target.value);

    if (!activeConv || !socketRef.current || socketRef.current.readyState !== WebSocket.OPEN) return;

    if (!isTypingLocalRef.current) {
      isTypingLocalRef.current = true;
      socketRef.current.send(JSON.stringify({
        type: 'typing',
        payload: { targetId: activeConv.other_user_id, conversationId: activeId }
      }));
    }

    if (localTypingTimeoutRef.current) clearTimeout(localTypingTimeoutRef.current);
    localTypingTimeoutRef.current = setTimeout(() => {
      isTypingLocalRef.current = false;
      if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
        socketRef.current.send(JSON.stringify({
          type: 'stop_typing',
          payload: { targetId: activeConv.other_user_id, conversationId: activeId }
        }));
      }
    }, 2000);
  };

  const handleEmojiClick = (emoji: string) => {
    setInputText(prev => prev + emoji);
  };
 
  // 5. Send message handler
  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() && !imageUrl) return;
    if (!activeId || !activeConv) return;
 
    const content = inputText.trim();
    setInputText('');
    setImageUrl(null);
    setReplyingTo(null);
    setShowEmojis(false);

    // Stop typing immediately
    isTypingLocalRef.current = false;
    if (localTypingTimeoutRef.current) clearTimeout(localTypingTimeoutRef.current);
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({
        type: 'stop_typing',
        payload: { targetId: activeConv.other_user_id, conversationId: activeId }
      }));
    }

    const parentId = replyingTo?.id || null;

    // Write to DB
    const res = await sendMessage(activeId, content, imageUrl, parentId);
    if (res.success && res.messageData) {
      const addedMsg = res.messageData;
      setMessages(prev => [...prev, addedMsg]);

      // Broadcast via socket for real-time delivery
      if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
        socketRef.current.send(JSON.stringify({
          type: 'send_message',
          payload: { 
            recipientId: activeConv.other_user_id,
            message: addedMsg
          }
        }));
      }

      // Update local conversation list order & preview
      setConversations(prev => {
        const updated = prev.map(c => {
          if (c.conversation_id === activeId) {
            return {
              ...c,
              last_message_content: content || '📷 Image',
              last_message_image: imageUrl,
              last_message_sender_id: currentUser.id,
              last_message_status: 'sent',
              last_message_created_at: new Date().toISOString()
            };
          }
          return c;
        });
        return [...updated].sort((a, b) => {
          const aTime = a.last_message_created_at ? new Date(a.last_message_created_at).getTime() : 0;
          const bTime = b.last_message_created_at ? new Date(b.last_message_created_at).getTime() : 0;
          return bTime - aTime;
        });
      });
    }
  };

  // Image upload handling
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        await showAlert('Image trop volumineuse. Maximum 2 Mo.');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          setImageUrl(reader.result);
          setShowEmojis(false);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Delete message handler
  const handleDelete = async (msgId: number) => {
    const confirmed = await showConfirm('Supprimer ce message définitivement ?');
    if (!confirmed) return;
    const res = await deleteMessage(msgId);
    if (res.success) {
      setMessages(prev => prev.filter(m => m.id !== msgId));
    }
  };

  return (
    <div className="flex h-full min-h-0 rounded-3xl bg-white border border-slate-200/60 shadow-sm overflow-hidden">
      
      {/* ─── CONVERSATIONS LIST SIDEBAR ─── */}
      <div className={`w-full lg:w-[320px] flex-shrink-0 border-r border-slate-200/60 flex flex-col bg-slate-50/80 min-h-0 ${
        activeId !== null ? 'hidden lg:flex' : 'flex'
      }`}>
        <div className="p-4 border-b border-slate-200/60 flex items-center justify-between">
          <span className="text-sm font-extrabold bg-gradient-to-r from-violet-600 to-fuchsia-600 bg-clip-text text-transparent uppercase tracking-wider">
            Conversations
          </span>
          <Sparkles className="h-4 w-4 text-violet-500 animate-pulse" />
        </div>
        
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {conversations.map((c) => {
            const isSelected = c.conversation_id === activeId;
            const isOnline = c.other_user_last_active === 'online';
            return (
              <button
                key={c.conversation_id}
                onClick={() => setActiveId(c.conversation_id)}
                className={`w-full flex items-center gap-3 p-3 rounded-2xl text-left transition-all group ${
                  isSelected 
                    ? 'bg-violet-50 border border-violet-200/60 shadow-xs' 
                    : 'hover:bg-slate-100/70 border border-transparent'
                }`}
              >
                {/* Avatar with status indicator */}
                <div className="relative flex-shrink-0">
                  <div className="h-10 w-10 rounded-full overflow-hidden border border-slate-200 bg-slate-100">
                    {c.other_user_avatar ? (
                      <img src={c.other_user_avatar} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center bg-slate-100 text-slate-400">
                        <User className="h-5 w-5" />
                      </div>
                    )}
                  </div>
                  {isOnline ? (
                    <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-white shadow-[0_0_4px_rgba(16,185,129,0.6)]" />
                  ) : (
                    <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-slate-300 ring-2 ring-white" />
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <p className={`text-xs font-bold truncate ${isSelected ? 'text-violet-600' : 'text-slate-800'}`}>
                      {c.other_user_name}
                    </p>
                    <span className="text-[9px] text-slate-400">
                      {formatRelativeTime(c.last_message_created_at)}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400 truncate mt-0.5">
                    {c.last_message_content || (c.last_message_image ? '📷 Image' : 'Aucun message')}
                  </p>
                </div>

                {c.unread_count > 0 && (
                  <span className="h-4 min-w-4 px-1 flex items-center justify-center bg-violet-600 text-[9px] font-bold text-white rounded-full animate-pulse">
                    {c.unread_count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ─── ACTIVE CHAT AREA ─── */}
      <div className={`flex-1 flex flex-col min-w-0 min-h-0 bg-white ${
        activeId === null ? 'hidden lg:flex' : 'flex'
      }`}>
        {activeConv ? (
          <>
            {/* Top Bar */}
            <div className="p-4 border-b border-slate-200/60 flex items-center justify-between bg-slate-50/80">
              <div className="flex items-center gap-3 min-w-0">
                <Button
                  variant="ghost"
                  size="icon"
                  className="lg:hidden h-8 w-8 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl"
                  onClick={() => setActiveId(null)}
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                
                {/* Contact Info */}
                <div className="relative flex-shrink-0">
                  <div className="h-9 w-9 rounded-full overflow-hidden border border-slate-200 bg-slate-100">
                    {activeConv.other_user_avatar ? (
                      <img src={activeConv.other_user_avatar} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center bg-slate-100 text-slate-400">
                        <User className="h-4 w-4" />
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="min-w-0">
                  <Link href={`/profile/${activeConv.other_user_id}`} className="text-xs font-bold text-slate-800 hover:text-violet-600 transition-colors truncate block">
                    {activeConv.other_user_name}
                  </Link>
                  <p className="text-[10px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                    {otherPresence === 'online' ? (
                      <span className="flex items-center gap-1">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        En ligne
                      </span>
                    ) : (
                      <span>
                        Hors ligne {otherPresence !== 'offline' ? `· vu ${formatRelativeTime(otherPresence)}` : ''}
                      </span>
                    )}
                  </p>
                </div>
              </div>
            </div>

            {/* Scrollable messages container */}
            <div ref={messagesContainerRef} className="flex-1 overflow-y-auto p-4 space-y-4">
              {isPending && messages.length === 0 ? (
                <div className="flex items-center justify-center h-full text-xs text-slate-400 gap-2">
                  <Loader2 className="h-4 w-4 animate-spin text-violet-500" />
                  Chargement de la discussion...
                </div>
              ) : (
                messages.map((m) => {
                  const isOwn = m.sender_id === currentUser.id;
                  
                  return (
                    <div 
                      key={m.id}
                      className={`flex flex-col max-w-[75%] space-y-1 ${
                        isOwn ? 'ml-auto items-end' : 'mr-auto items-start'
                      }`}
                    >
                      {/* Quoted parent message preview */}
                      {m.parent_message_id && (
                        <div className="text-[10px] bg-slate-100 border border-slate-200 rounded-lg p-2 text-slate-500 flex items-center gap-1.5 max-w-full">
                          <CornerDownRight className="h-3 w-3 text-slate-400 flex-shrink-0" />
                          <span className="truncate italic">
                            {m.parent_sender_name || 'Autre'}: {m.parent_content || '📷 Image'}
                          </span>
                        </div>
                      )}

                      {/* Bubble */}
                      <div className="relative group/bubble flex items-center gap-2 max-w-full">
                        {isOwn && (
                          <button
                            onClick={() => handleDelete(m.id)}
                            className="opacity-0 group-hover/bubble:opacity-100 h-6 w-6 rounded-lg bg-white hover:bg-rose-50 text-slate-400 hover:text-rose-500 flex items-center justify-center transition-all flex-shrink-0 border border-slate-200"
                            title="Supprimer le message"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        )}
                        
                        <div className={`rounded-2xl px-3.5 py-2.5 text-xs break-words max-w-full overflow-hidden ${
                          isOwn 
                            ? 'bg-gradient-to-br from-violet-600 to-fuchsia-600 text-white font-medium shadow-md shadow-violet-500/5'
                            : 'bg-slate-100 text-slate-800 border border-slate-200/50'
                        }`}>
                          {m.image_url && (
                            <img src={m.image_url} alt="" className="rounded-lg max-h-[160px] object-cover mb-2 border border-black/20" />
                          )}
                          {m.content && <p className="leading-relaxed whitespace-pre-wrap">{m.content}</p>}
                        </div>

                        {!isOwn && (
                          <button
                            onClick={() => setReplyingTo(m)}
                            className="opacity-0 group-hover/bubble:opacity-100 h-6 w-6 rounded-lg bg-white hover:bg-slate-100 text-slate-400 hover:text-violet-500 flex items-center justify-center transition-all flex-shrink-0 border border-slate-200"
                            title="Répondre"
                          >
                            <CornerDownRight className="h-3 w-3" />
                          </button>
                        )}
                      </div>

                      {/* Info bar below bubble */}
                      <div className="flex items-center gap-1.5 px-1">
                        <span className="text-[9px] text-slate-400">{formatRelativeTime(m.created_at)}</span>
                        {isOwn && (
                          <span className="flex items-center text-[9px]">
                            {m.status === 'seen' ? (
                              <span className="text-violet-400 flex items-center gap-0.5" title="Lu">
                                <Eye className="h-2.5 w-2.5" />
                                <span>vu</span>
                              </span>
                            ) : m.status === 'delivered' ? (
                              <span className="text-slate-400 flex items-center gap-0.5" title="Délivré">
                                <CheckCheck className="h-2.5 w-2.5" />
                                <span>reçu</span>
                              </span>
                            ) : (
                              <span className="text-slate-400 flex items-center gap-0.5" title="Envoyé">
                                <Check className="h-2.5 w-2.5" />
                                <span>envoyé</span>
                              </span>
                            )}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}

              {/* Typing bubble */}
              {isTyping && (
                <div className="flex flex-col mr-auto max-w-[70%] space-y-1">
                  <div className="rounded-2xl px-4 py-3 bg-slate-100 text-slate-500 border border-slate-200/50 flex items-center gap-1 text-[11px] font-medium leading-none">
                    <span className="flex gap-0.5 items-center mr-1">
                      <span className="h-1.5 w-1.5 rounded-full bg-violet-400 animate-bounce duration-600" />
                      <span className="h-1.5 w-1.5 rounded-full bg-violet-400 animate-bounce duration-600 delay-150" />
                      <span className="h-1.5 w-1.5 rounded-full bg-violet-400 animate-bounce duration-600 delay-300" />
                    </span>
                    {activeConv.other_user_name} est en train d'écrire...
                  </div>
                </div>
              )}
              
            </div>

            {/* Bottom input area */}
            <div className="p-4 border-t border-slate-200/60 space-y-3 bg-white">
              
              {/* Quoted message bar (replying mode) */}
              {replyingTo && (
                <div className="flex items-center justify-between gap-3 bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl text-xs text-slate-500 animate-in slide-in-from-bottom-1 duration-150">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <CornerDownRight className="h-3.5 w-3.5 text-violet-400 flex-shrink-0" />
                    <span className="truncate italic">
                      En réponse à <strong className="text-slate-700">{replyingTo.sender_id === currentUser.id ? 'Vous' : activeConv.other_user_name}</strong>: {replyingTo.content || '📷 Image'}
                    </span>
                  </div>
                  <button onClick={() => setReplyingTo(null)} className="h-5 w-5 flex items-center justify-center hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600">
                    <X className="h-3 w-3" />
                  </button>
                </div>
              )}

              {/* Image upload preview */}
              {imageUrl && (
                <div className="relative inline-block border border-slate-200 rounded-xl overflow-hidden animate-in zoom-in duration-200">
                  <img src={imageUrl} alt="Preview" className="h-20 w-20 object-cover" />
                  <button 
                    type="button" 
                    onClick={() => setImageUrl(null)} 
                    className="absolute top-1 right-1 h-5 w-5 bg-black/60 hover:bg-black/80 rounded-full flex items-center justify-center text-white"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              )}

              {/* Emoji drawer */}
              {showEmojis && (
                <div className="grid grid-cols-8 gap-1 p-2 bg-white border border-slate-200/60 rounded-2xl shadow-md animate-in fade-in zoom-in-95 duration-150 max-w-[320px]">
                  {EMOJIS.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => handleEmojiClick(emoji)}
                      className="h-8 w-8 text-base flex items-center justify-center rounded-lg hover:bg-slate-100 transition-colors active:scale-90"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              )}
 
              <form onSubmit={handleSend} className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowEmojis(prev => !prev)}
                  className={`h-9 w-9 hover:bg-slate-100 rounded-xl ${showEmojis ? 'text-violet-600 bg-violet-50' : 'text-slate-400'}`}
                  title="Sélectionner un émoji"
                >
                  <Smile className="h-4 w-4" />
                </Button>

                {/* Upload Image Button */}
                <label className="h-9 w-9 hover:bg-slate-100 rounded-xl flex items-center justify-center cursor-pointer text-slate-400 transition-colors" title="Uploader une image">
                  <ImageIcon className="h-4 w-4" />
                  <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
                </label>

                <Input
                  type="text"
                  placeholder="Écrire un message privé..."
                  value={inputText}
                  onChange={handleInputChange}
                  className="flex-1 h-9 bg-white border-slate-200 rounded-xl text-xs text-slate-800 placeholder:text-slate-400 focus-visible:ring-violet-500"
                />

                <Button
                  type="submit"
                  size="icon"
                  disabled={!inputText.trim() && !imageUrl}
                  className="h-9 w-9 bg-violet-600 hover:bg-violet-500 text-white rounded-xl disabled:opacity-40 disabled:hover:bg-violet-600 transition-colors"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8 space-y-3">
            <Sparkles className="h-8 w-8 text-slate-300 animate-pulse" />
            <p className="text-sm font-semibold text-slate-500">Sélectionnez une discussion</p>
            <p className="text-xs text-slate-400">Choisissez un utilisateur dans la liste pour commencer à discuter en direct.</p>
          </div>
        )}
      </div>

    </div>
  );
}
