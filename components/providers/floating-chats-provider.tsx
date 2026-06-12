'use client';

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import dynamic from 'next/dynamic';
import type { Conversation } from '@/app/actions/messages';
import type { DbUser } from '@/lib/session';

const ChatFloatingWindow = dynamic(() => import('@/components/chat-floating-window'), { ssr: false });

interface OpenChat {
  conversation: Conversation;
}

interface FloatingChatsContextType {
  openChat: (conv: Conversation) => void;
  closeChat: (convId: number) => void;
  openChats: OpenChat[];
}

const FloatingChatsContext = createContext<FloatingChatsContextType>({
  openChat: () => {},
  closeChat: () => {},
  openChats: []
});

export function useFloatingChats() {
  return useContext(FloatingChatsContext);
}

interface FloatingChatsProviderProps {
  children: ReactNode;
  currentUser: DbUser | null;
}

export function FloatingChatsProvider({ children, currentUser }: FloatingChatsProviderProps) {
  const [openChats, setOpenChats] = useState<OpenChat[]>([]);

  const openChat = useCallback((conv: Conversation) => {
    setOpenChats(prev => {
      // Avoid duplicates
      const exists = prev.find(c => c.conversation.conversation_id === conv.conversation_id);
      if (exists) return prev;
      // Limit to 3 chats open at once
      const newChats = prev.length >= 3 ? prev.slice(1) : prev;
      return [...newChats, { conversation: conv }];
    });
  }, []);

  const closeChat = useCallback((convId: number) => {
    setOpenChats(prev => prev.filter(c => c.conversation.conversation_id !== convId));
  }, []);

  return (
    <FloatingChatsContext.Provider value={{ openChat, closeChat, openChats }}>
      {children}
      {/* Render floating chat windows */}
      {currentUser && openChats.map((chat, index) => (
        <ChatFloatingWindow
          key={chat.conversation.conversation_id}
          conversation={chat.conversation}
          currentUser={currentUser}
          onClose={() => closeChat(chat.conversation.conversation_id)}
          zIndex={1000 + index}
          offsetRight={index * 344} // stack them side by side: 328px width + 16px gap
        />
      ))}
    </FloatingChatsContext.Provider>
  );
}
