'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  Send, Pin, Trash2, Flag, MessageSquareOff, MessageSquare,
  AtSign, Smile, ChevronDown
} from 'lucide-react';
import type { ChatMsg } from './types';
import { REACTIONS, SPAM_WORDS, MOCK_NAMES } from './types';

interface LiveChatPanelProps {
  messages: ChatMsg[];
  currentUserName: string;
  currentUserAvatar: string;
  onSend: (text: string) => void;
  onPin: (id: string) => void;
  onDelete: (id: string) => void;
  onReact: (emoji: string) => void;
  isChatDisabled: boolean;
  onToggleChat: () => void;
  isHost: boolean;
}

export function LiveChatPanel({
  messages,
  currentUserName,
  currentUserAvatar,
  onSend,
  onPin,
  onDelete,
  onReact,
  isChatDisabled,
  onToggleChat,
  isHost,
}: LiveChatPanelProps) {
  const [input, setInput] = useState('');
  const [showEmoji, setShowEmoji] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [showMentions, setShowMentions] = useState(false);
  const [activeMsg, setActiveMsg] = useState<string | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const pinnedMsg = messages.find(m => m.isPinned && !m.isDeleted);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const filterSpam = (text: string) => {
    let filtered = text;
    SPAM_WORDS.forEach(w => {
      filtered = filtered.replace(new RegExp(w, 'gi'), '[filtré]');
    });
    return filtered;
  };

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = filterSpam(input.trim());
    if (!clean || isChatDisabled) return;
    onSend(clean);
    setInput('');
    setShowMentions(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInput(val);
    const words = val.split(' ');
    const lastWord = words[words.length - 1];
    if (lastWord.startsWith('@') && lastWord.length > 1) {
      setMentionQuery(lastWord.slice(1).toLowerCase());
      setShowMentions(true);
    } else {
      setShowMentions(false);
    }
  };

  const insertMention = (name: string) => {
    const words = input.split(' ');
    words[words.length - 1] = `@${name} `;
    setInput(words.join(' '));
    setShowMentions(false);
    inputRef.current?.focus();
  };

  const renderText = (text: string) => {
    const parts = text.split(/(@\w[\w\s]*)/g);
    return parts.map((part, i) =>
      part.startsWith('@') ? (
        <span key={i} className="text-indigo-400 font-bold">{part}</span>
      ) : (
        <span key={i}>{part}</span>
      )
    );
  };

  const mentionSuggestions = MOCK_NAMES.filter(n =>
    n.toLowerCase().includes(mentionQuery)
  ).slice(0, 5);

  return (
    <div className="flex flex-col h-full">
      {/* Chat header with controls */}
      <div className="p-4 border-b border-white/10 flex items-center justify-between flex-shrink-0">
        <span className="text-[11px] font-black uppercase tracking-wider text-slate-300">
          Live Chat
        </span>
        <div className="flex items-center gap-2">
          {/* Reaction bar */}
          <div className="flex items-center gap-0.5">
            {REACTIONS.map(emoji => (
              <button
                key={emoji}
                onClick={() => onReact(emoji)}
                className="text-base hover:scale-125 transition-transform duration-100 active:scale-90"
                title={`Réagir ${emoji}`}
              >
                {emoji}
              </button>
            ))}
          </div>
          {/* Disable chat toggle (host only) */}
          {isHost && (
            <button
              onClick={onToggleChat}
              title={isChatDisabled ? 'Activer le chat' : 'Désactiver le chat'}
              className={`p-1.5 rounded-lg transition-colors ${
                isChatDisabled
                  ? 'bg-rose-500/20 text-rose-400'
                  : 'hover:bg-white/10 text-slate-400 hover:text-white'
              }`}
            >
              {isChatDisabled ? (
                <MessageSquareOff className="h-3.5 w-3.5" />
              ) : (
                <MessageSquare className="h-3.5 w-3.5" />
              )}
            </button>
          )}
        </div>
      </div>

      {/* Pinned message */}
      {pinnedMsg && (
        <div className="mx-3 mt-3 p-2.5 bg-indigo-600/10 border border-indigo-500/20 rounded-xl flex items-start gap-2 flex-shrink-0">
          <Pin className="h-3 w-3 text-indigo-400 flex-shrink-0 mt-0.5" />
          <div className="min-w-0">
            <p className="text-[9px] font-black uppercase tracking-wider text-indigo-400 mb-0.5">Épinglé</p>
            <p className="text-[10px] text-slate-300 leading-relaxed line-clamp-2">{pinnedMsg.text}</p>
          </div>
        </div>
      )}

      {/* Chat disabled banner */}
      {isChatDisabled && (
        <div className="mx-3 mt-2 p-2 bg-rose-500/10 border border-rose-500/20 rounded-xl flex items-center gap-2 flex-shrink-0">
          <MessageSquareOff className="h-3.5 w-3.5 text-rose-400 flex-shrink-0" />
          <p className="text-[10px] text-rose-300 font-medium">Chat temporairement désactivé par l'hôte</p>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3.5 scrollbar-hide min-h-0">
        {messages.filter(m => !m.isDeleted).map(msg => (
          <div
            key={msg.id}
            className={`group relative flex items-start gap-2.5 animate-in fade-in slide-in-from-bottom-1 duration-200 ${
              msg.isSystem ? 'bg-white/5 border border-white/10 p-2.5 rounded-xl' : ''
            }`}
            onMouseEnter={() => setActiveMsg(msg.id)}
            onMouseLeave={() => setActiveMsg(null)}
          >
            {!msg.isSystem && msg.avatar && (
              <img
                src={msg.avatar}
                className="h-6 w-6 rounded-full object-cover border border-white/10 flex-shrink-0 mt-0.5"
                alt=""
              />
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 mb-0.5">
                <span className={`text-[10px] font-bold ${msg.isSystem ? 'text-indigo-400' : 'text-slate-200'}`}>
                  {msg.name}
                </span>
                <span className="text-[8px] text-slate-500 font-mono">{msg.time}</span>
                {msg.isPinned && (
                  <Pin className="h-2.5 w-2.5 text-indigo-400" />
                )}
              </div>
              <p className="text-[10px] text-slate-300 leading-relaxed break-words">
                {renderText(msg.text)}
              </p>
            </div>

            {/* Hover actions (host only) */}
            {isHost && !msg.isSystem && activeMsg === msg.id && (
              <div className="absolute right-0 top-0 flex items-center gap-1 bg-[#0d1527] border border-white/10 rounded-xl p-1 shadow-xl z-10">
                <button
                  onClick={() => onPin(msg.id)}
                  title="Épingler"
                  className={`p-1 rounded-lg transition-colors ${msg.isPinned ? 'text-indigo-400 bg-indigo-400/10' : 'text-slate-400 hover:text-indigo-400 hover:bg-indigo-400/10'}`}
                >
                  <Pin className="h-3 w-3" />
                </button>
                <button
                  onClick={() => onDelete(msg.id)}
                  title="Supprimer"
                  className="p-1 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-400/10 transition-colors"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
                <button
                  title="Signaler"
                  className="p-1 rounded-lg text-slate-400 hover:text-orange-400 hover:bg-orange-400/10 transition-colors"
                >
                  <Flag className="h-3 w-3" />
                </button>
              </div>
            )}
          </div>
        ))}
        <div ref={chatEndRef} />
      </div>

      {/* @mention autocomplete */}
      {showMentions && mentionSuggestions.length > 0 && (
        <div className="mx-3 mb-2 bg-[#0a101f] border border-white/10 rounded-xl overflow-hidden shadow-xl flex-shrink-0">
          {mentionSuggestions.map(name => (
            <button
              key={name}
              onClick={() => insertMention(name)}
              className="w-full text-left px-3 py-2 text-[10px] text-slate-300 hover:bg-white/5 flex items-center gap-2 transition-colors"
            >
              <AtSign className="h-3 w-3 text-indigo-400" />
              {name}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <form
        onSubmit={handleSend}
        className="p-3 border-t border-white/10 flex items-center gap-2 flex-shrink-0"
      >
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={handleInputChange}
          disabled={isChatDisabled}
          placeholder={isChatDisabled ? 'Chat désactivé...' : 'Commentaire... (@ pour mentionner)'}
          className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-[10px] text-white placeholder-slate-500 outline-none focus:border-indigo-500/40 transition-colors disabled:opacity-40"
        />
        <button
          type="submit"
          disabled={!input.trim() || isChatDisabled}
          className="h-9 w-9 rounded-xl bg-indigo-600 hover:bg-indigo-500 flex items-center justify-center text-white disabled:opacity-40 transition-all flex-shrink-0"
        >
          <Send className="h-3.5 w-3.5" />
        </button>
      </form>
    </div>
  );
}
