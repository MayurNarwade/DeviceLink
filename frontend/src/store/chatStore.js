import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const useChatStore = create(
  persist(
    (set) => ({
      messages: [],

      addMessage: (msg) =>
        set((state) => {
          if (!msg?.id) return state;
          if (state.messages.some((m) => m.id === msg.id)) return state;
          return { messages: [...state.messages, msg] };
        }),

      updateMessageStatus: (messageId, status) =>
        set((state) => ({
          messages: state.messages.map((msg) =>
            msg.id === messageId ? { ...msg, status } : msg
          ),
        })),

      addReaction: (messageId, emoji, fromMe = true) =>
        set((state) => ({
          messages: state.messages.map((msg) => {
            if (msg.id !== messageId) return msg;
            const existing = msg.reactions || {};
            const newCount = (existing[emoji] || 0) + 1;
            let myReaction = msg.myReaction;
            if (fromMe) myReaction = emoji;
            return {
              ...msg,
              reactions: { ...existing, [emoji]: newCount },
              myReaction,
            };
          }),
        })),

      removeReaction: (messageId, emoji, fromMe = true) =>
        set((state) => ({
          messages: state.messages.map((msg) => {
            if (msg.id !== messageId) return msg;
            const existing = { ...(msg.reactions || {}) };
            const oldCount = existing[emoji] || 0;
            if (oldCount <= 1) delete existing[emoji];
            else existing[emoji] = oldCount - 1;
            let myReaction = msg.myReaction;
            if (fromMe && myReaction === emoji) myReaction = null;
            return {
              ...msg,
              reactions: existing,
              myReaction,
            };
          }),
        })),

      setReply: (messageId, replyToId, replyToText) =>
        set((state) => ({
          messages: state.messages.map((msg) =>
            msg.id === messageId
              ? { ...msg, replyTo: { id: replyToId, text: replyToText } }
              : msg
          ),
        })),

      clearMessages: () => set({ messages: [] }),
    }),
    {
      name: 'chat-storage',
      storage: localStorage, // ✅ persists across page refreshes
    }
  )
);

export default useChatStore;