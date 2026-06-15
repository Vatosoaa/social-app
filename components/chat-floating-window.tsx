'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import Link from 'next/link';
import {
  User, Send, Image as ImageIcon, Loader2, X,
  Minus, Maximize2, Smile, CornerDownRight, Check, CheckCheck, Eye, Trash2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  getMessages, sendMessage, deleteMessage,
  markAsRead, markAsDelivered
} from '@/app/actions/messages';
import type { Conversation, ChatMessage } from '@/app/actions/messages';
import type { DbUser } from '@/lib/session';
import { useAlert } from '@/components/providers/alert-provider';

const EMOJIS = [
  '😀','😂','😍','🥰','😘','😜','😎','😊',
  '🤔','🙄','😤','😢','😡','😱','👍','❤️',
  '🔥','✨','🎉','🌟','👏','🙏','💔','🚀'
];

function formatRelativeTime(dateStr: string | null): string {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "À l'instant";
  if (m < 60) return `${m}min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}j`;
}

interface ChatFloatingWindowProps {
  conversation: Conversation;
  currentUser: DbUser;
  onClose: () => void;
  zIndex?: number;
  offsetRight?: number; // px offset from right side for stacking
}

export default function ChatFloatingWindow({
  conversation,
  currentUser,
  onClose,
  zIndex = 1000,
  offsetRight = 0
}: ChatFloatingWindowProps) {
  const { showAlert, showConfirm } = useAlert();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [showEmojis, setShowEmojis] = useState(false);
  const [replyingTo, setReplyingTo] = useState<ChatMessage | null>(null);
  const [minimized, setMinimized] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [otherPresence, setOtherPresence] = useState('offline');

  const socketRef = useRef<WebSocket | null>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const localTypingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isTypingLocalRef = useRef(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [isPending, startTransition] = useTransition();

  const convId = conversation.conversation_id;

  // Connect WebSocket
  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = process.env.NEXT_PUBLIC_WS_URL || `${protocol}//${window.location.hostname}:3001`;

    function connect() {
      const socket = new WebSocket(wsUrl);
      socketRef.current = socket;

      socket.onopen = () => {
        socket.send(JSON.stringify({ type: 'register', payload: { userId: currentUser.id } }));
        socket.send(JSON.stringify({ type: 'query_status', payload: { targetId: conversation.other_user_id } }));
      };

      socket.onmessage = (event) => {
        try {
          const { type, payload } = JSON.parse(event.data);
          if (type === 'new_message') {
            const newMsg = payload as ChatMessage;
            if (newMsg.sender_id === currentUser.id) return;
            if (newMsg.conversation_id === convId) {
              setMessages(prev => {
                if (prev.some(m => m.id === newMsg.id)) return prev;
                return [...prev, newMsg];
              });
              markAsRead(convId);
              socket.send(JSON.stringify({ type: 'message_seen', payload: { targetId: newMsg.sender_id, conversationId: convId } }));
            }
          } else if (type === 'typing' && payload.conversationId === convId) {
            setIsTyping(true);
            if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
            typingTimeoutRef.current = setTimeout(() => setIsTyping(false), 4000);
          } else if (type === 'stop_typing' && payload.conversationId === convId) {
            setIsTyping(false);
          } else if (type === 'message_seen' && payload.conversationId === convId) {
            setMessages(prev => prev.map(m => m.sender_id === currentUser.id ? { ...m, status: 'seen' } : m));
          } else if (type === 'message_delivered' && payload.conversationId === convId) {
            setMessages(prev => prev.map(m => m.sender_id === currentUser.id && m.status === 'sent' ? { ...m, status: 'delivered' } : m));
          } else if (type === 'user_status' && payload.userId === conversation.other_user_id) {
            setOtherPresence(payload.status);
          }
        } catch (e) {
          console.error(e);
        }
      };

      socket.onclose = () => setTimeout(connect, 3000);
    }

    connect();
    return () => {
      socketRef.current?.close();
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      if (localTypingTimeoutRef.current) clearTimeout(localTypingTimeoutRef.current);
    };
  }, [convId, currentUser.id, conversation.other_user_id]);

  // Load messages
  useEffect(() => {
    startTransition(async () => {
      const data = await getMessages(convId);
      setMessages(data);
      await markAsRead(convId);
    });
  }, [convId]);

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputText(e.target.value);
    if (!socketRef.current || socketRef.current.readyState !== WebSocket.OPEN) return;
    if (!isTypingLocalRef.current) {
      isTypingLocalRef.current = true;
      socketRef.current.send(JSON.stringify({ type: 'typing', payload: { targetId: conversation.other_user_id, conversationId: convId } }));
    }
    if (localTypingTimeoutRef.current) clearTimeout(localTypingTimeoutRef.current);
    localTypingTimeoutRef.current = setTimeout(() => {
      isTypingLocalRef.current = false;
      socketRef.current?.send(JSON.stringify({ type: 'stop_typing', payload: { targetId: conversation.other_user_id, conversationId: convId } }));
    }, 2000);
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() && !imageUrl) return;

    const content = inputText.trim();
    setInputText('');
    setImageUrl(null);
    setReplyingTo(null);
    setShowEmojis(false);
    isTypingLocalRef.current = false;
    socketRef.current?.send(JSON.stringify({ type: 'stop_typing', payload: { targetId: conversation.other_user_id, conversationId: convId } }));

    const parentId = replyingTo?.id || null;
    const res = await sendMessage(convId, content, imageUrl, parentId);
    if (res.success && res.messageData) {
      const msg = res.messageData;
      setMessages(prev => [...prev, msg]);
      socketRef.current?.send(JSON.stringify({ type: 'send_message', payload: { recipientId: conversation.other_user_id, message: msg } }));
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { await showAlert('Image trop volumineuse. Maximum 2 Mo.'); return; }
    const reader = new FileReader();
    reader.onloadend = () => { if (typeof reader.result === 'string') setImageUrl(reader.result); };
    reader.readAsDataURL(file);
  };

  const handleDelete = async (msgId: number) => {
    const confirmed = await showConfirm('Supprimer ce message ?');
    if (!confirmed) return;
    const res = await deleteMessage(msgId);
    if (res.success) setMessages(prev => prev.filter(m => m.id !== msgId));
  };

  return (
    <div
      className="fixed bottom-0 flex flex-col shadow-2xl rounded-t-2xl overflow-hidden border border-zinc-700/60 bg-zinc-950 transition-all duration-200"
      style={{
        right: `${offsetRight + 16}px`,
        width: '328px',
        height: minimized ? '52px' : '480px',
        zIndex,
      }}
    >
      {/* Header */}
      <div
        className="flex items-center gap-2.5 px-3 py-2.5 bg-zinc-900 border-b border-zinc-800/80 cursor-pointer select-none flex-shrink-0"
        onClick={() => setMinimized(prev => !prev)}
      >
        <div className="relative flex-shrink-0">
          <div className="h-8 w-8 rounded-full overflow-hidden border border-zinc-700 bg-zinc-800">
            {conversation.other_user_avatar ? (
              <img src={conversation.other_user_avatar} alt="" className="h-full w-full object-cover" />
            ) : (
              <div className="h-full w-full flex items-center justify-center text-zinc-500">
                <User className="h-4 w-4" />
              </div>
            )}
          </div>
          <span className={`absolute bottom-0 right-0 h-2 w-2 rounded-full ring-2 ring-zinc-900 ${otherPresence === 'online' ? 'bg-emerald-500' : 'bg-zinc-600'}`} />
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-xs font-bold text-zinc-100 truncate">{conversation.other_user_name}</p>
          <p className="text-[9px] text-zinc-500">
            {otherPresence === 'online' ? (
              <span className="text-emerald-400">En ligne</span>
            ) : (
              'Hors ligne'
            )}
          </p>
        </div>

        <div className="flex items-center gap-1 flex-shrink-0" onClick={e => e.stopPropagation()}>
          <button
            onClick={() => setMinimized(prev => !prev)}
            className="h-6 w-6 rounded-full flex items-center justify-center text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 transition-colors"
          >
            <Minus className="h-3 w-3" />
          </button>
          <Link
            href={`/messages?conversationId=${convId}`}
            className="h-6 w-6 rounded-full flex items-center justify-center text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 transition-colors"
          >
            <Maximize2 className="h-3 w-3" />
          </Link>
          <button
            onClick={onClose}
            className="h-6 w-6 rounded-full flex items-center justify-center text-zinc-400 hover:bg-rose-950/40 hover:text-rose-400 transition-colors"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      </div>

      {/* Body */}
      {!minimized && (
        <>
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2.5 bg-zinc-950/60">
            {isPending && messages.length === 0 ? (
              <div className="flex items-center justify-center h-full text-xs text-zinc-500 gap-2">
                <Loader2 className="h-3 w-3 animate-spin text-teal-400" />
                Chargement...
              </div>
            ) : messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center gap-2 py-8">
                <div className="h-10 w-10 rounded-full overflow-hidden border border-zinc-800 mb-1">
                  {conversation.other_user_avatar ? (
                    <img src={conversation.other_user_avatar} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center bg-zinc-900 text-zinc-500">
                      <User className="h-5 w-5" />
                    </div>
                  )}
                </div>
                <p className="text-xs font-semibold text-zinc-300">{conversation.other_user_name}</p>
                <p className="text-[10px] text-zinc-500">Commencez la conversation 👋</p>
              </div>
            ) : (
              messages.map(m => {
                const isOwn = m.sender_id === currentUser.id;
                return (
                  <div key={m.id} className={`flex flex-col max-w-[80%] space-y-0.5 ${isOwn ? 'ml-auto items-end' : 'mr-auto items-start'}`}>
                    {m.parent_message_id && (
                      <div className="text-[9px] bg-zinc-900/80 border border-zinc-800 rounded-lg p-1.5 text-zinc-400 flex items-center gap-1 max-w-full">
                        <CornerDownRight className="h-2.5 w-2.5 flex-shrink-0" />
                        <span className="truncate italic">{m.parent_content || '📷 Image'}</span>
                      </div>
                    )}

                    <div className="relative group/bubble flex items-center gap-1.5 max-w-full">
                      {isOwn && (
                        <button
                          onClick={() => handleDelete(m.id)}
                          className="opacity-0 group-hover/bubble:opacity-100 h-5 w-5 rounded-lg bg-zinc-900/60 hover:bg-rose-950/40 text-zinc-500 hover:text-rose-400 flex items-center justify-center transition-all border border-zinc-800/60"
                        >
                          <Trash2 className="h-2.5 w-2.5" />
                        </button>
                      )}

                      <div className={`rounded-2xl px-3 py-2 text-xs break-words max-w-full overflow-hidden ${
                        isOwn
                          ? 'bg-gradient-to-br from-teal-600 to-cyan-700 text-white shadow-sm'
                          : 'bg-zinc-800/70 text-zinc-200 border border-zinc-700/20'
                      }`}>
                        {m.image_url && <img src={m.image_url} alt="" className="rounded-lg max-h-[120px] object-cover mb-1.5 border border-black/20" />}
                        {m.content && <p className="leading-relaxed whitespace-pre-wrap">{m.content}</p>}
                      </div>

                      {!isOwn && (
                        <button
                          onClick={() => setReplyingTo(m)}
                          className="opacity-0 group-hover/bubble:opacity-100 h-5 w-5 rounded-lg bg-zinc-900/60 hover:bg-zinc-800 text-zinc-500 hover:text-teal-400 flex items-center justify-center transition-all border border-zinc-800/60"
                        >
                          <CornerDownRight className="h-2.5 w-2.5" />
                        </button>
                      )}
                    </div>

                    <div className="flex items-center gap-1 px-1">
                      <span className="text-[9px] text-zinc-600">{formatRelativeTime(m.created_at)}</span>
                      {isOwn && (
                        <span className="text-[9px]">
                          {m.status === 'seen' ? (
                            <span className="text-teal-400 flex items-center gap-0.5"><Eye className="h-2 w-2" /><span>vu</span></span>
                          ) : m.status === 'delivered' ? (
                            <span className="text-zinc-500 flex items-center gap-0.5"><CheckCheck className="h-2 w-2" /></span>
                          ) : (
                            <span className="text-zinc-600"><Check className="h-2 w-2" /></span>
                          )}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}

            {isTyping && (
              <div className="flex mr-auto max-w-[70%]">
                <div className="rounded-2xl px-3 py-2.5 bg-zinc-800/60 border border-zinc-700/20 flex items-center gap-1">
                  <span className="flex gap-0.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-teal-400 animate-bounce" style={{animationDelay:'0ms'}} />
                    <span className="h-1.5 w-1.5 rounded-full bg-teal-400 animate-bounce" style={{animationDelay:'150ms'}} />
                    <span className="h-1.5 w-1.5 rounded-full bg-teal-400 animate-bounce" style={{animationDelay:'300ms'}} />
                  </span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Reply bar */}
          {replyingTo && (
            <div className="flex items-center justify-between gap-2 bg-zinc-900/60 border-t border-zinc-800 px-3 py-1.5 text-[10px] text-zinc-400">
              <div className="flex items-center gap-1.5 min-w-0">
                <CornerDownRight className="h-3 w-3 text-teal-400 flex-shrink-0" />
                <span className="truncate italic">{replyingTo.content || '📷 Image'}</span>
              </div>
              <button onClick={() => setReplyingTo(null)} className="text-zinc-500 hover:text-zinc-300 flex-shrink-0"><X className="h-3 w-3" /></button>
            </div>
          )}

          {/* Image preview */}
          {imageUrl && (
            <div className="px-3 py-1.5 bg-zinc-900/40 border-t border-zinc-800">
              <div className="relative inline-block rounded-xl overflow-hidden border border-zinc-700">
                <img src={imageUrl} alt="Preview" className="h-14 w-14 object-cover" />
                <button
                  type="button"
                  onClick={() => setImageUrl(null)}
                  className="absolute top-1 right-1 h-4 w-4 bg-black/60 rounded-full flex items-center justify-center text-white"
                >
                  <X className="h-2.5 w-2.5" />
                </button>
              </div>
            </div>
          )}

          {/* Emoji picker */}
          {showEmojis && (
            <div className="grid grid-cols-8 gap-0.5 p-2 bg-zinc-900/90 border-t border-zinc-800">
              {EMOJIS.map(emoji => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => setInputText(prev => prev + emoji)}
                  className="h-7 w-7 text-sm flex items-center justify-center rounded-lg hover:bg-zinc-800 transition-colors"
                >
                  {emoji}
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <div className="p-2.5 bg-zinc-900/80 border-t border-zinc-800/80 flex-shrink-0">
            <form onSubmit={handleSend} className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setShowEmojis(prev => !prev)}
                className={`h-8 w-8 rounded-full flex items-center justify-center transition-colors ${showEmojis ? 'text-teal-400 bg-teal-950/30' : 'text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300'}`}
              >
                <Smile className="h-4 w-4" />
              </button>

              <label className="h-8 w-8 rounded-full flex items-center justify-center cursor-pointer text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300 transition-colors">
                <ImageIcon className="h-4 w-4" />
                <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
              </label>

              <input
                type="text"
                placeholder="Aa"
                value={inputText}
                onChange={handleInputChange}
                className="flex-1 h-8 bg-zinc-800/60 border border-zinc-700/50 rounded-full px-3 text-xs text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-teal-500/50 focus:bg-zinc-800"
              />

              <button
                type="submit"
                disabled={!inputText.trim() && !imageUrl}
                className="h-8 w-8 rounded-full bg-teal-600 hover:bg-teal-500 text-white flex items-center justify-center disabled:opacity-40 disabled:hover:bg-teal-600 transition-colors flex-shrink-0"
              >
                <Send className="h-3.5 w-3.5" />
              </button>
            </form>
          </div>
        </>
      )}
    </div>
  );
}
