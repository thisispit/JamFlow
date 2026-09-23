'use client';

import React, { useState, useRef, useEffect } from 'react';
import { ArrowRight, Sparkles } from 'lucide-react';
import { ChatMessage, User } from '@/types';

interface ChatAndReactionsProps {
  chat: ChatMessage[];
  users: User[];
  currentUser: User | null;
  onSendMessage: (content: string) => void;
  onSendReaction: (emoji: string) => void;
}

const QUICK_REACTIONS = ['🔥', '❤️', '🎵', '👏', '🎉', '🚀'];

export const ChatAndReactions: React.FC<ChatAndReactionsProps> = ({
  chat,
  currentUser,
  onSendMessage,
  onSendReaction,
}) => {
  const [messageInput, setMessageInput] = useState('');
  const chatBottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chat]);

  const handleSendChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageInput.trim()) return;
    onSendMessage(messageInput.trim());
    setMessageInput('');
  };

  return (
    <div className="flex flex-col h-full overflow-hidden bg-transparent select-none">
      {/* ── Chat messages ── */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        <h3 className="text-[10px] font-mono font-bold tracking-widest text-zinc-500 uppercase">
          CHAT
        </h3>

        {chat.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-center py-12 px-4 min-h-[200px]">
            <p className="text-zinc-400 text-sm font-medium">No messages yet</p>
            <p className="text-zinc-600 text-xs mt-1">Say hello to the room!</p>
          </div>
        ) : (
          chat.map((msg) => {
            if (msg.isSystem) {
              return (
                <div key={msg.id} className="flex justify-center my-1.5">
                  <span className="py-1 px-3 rounded-full bg-white/[0.03] border border-white/[0.05] text-[11px] font-mono text-zinc-500 max-w-[90%] truncate">
                    {msg.content}
                  </span>
                </div>
              );
            }

            const isYou = msg.userId === currentUser?.id;

            return (
              <div key={msg.id} className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span
                    className={`text-xs font-semibold ${
                      isYou ? 'text-[#C084FC]' : 'text-zinc-300'
                    }`}
                  >
                    {isYou ? 'You' : msg.username}
                  </span>
                  <span className="text-[10px] font-mono text-zinc-600">
                    {new Date(msg.timestamp).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
                <p className="text-sm text-zinc-200 leading-relaxed break-words pl-0.5">
                  {msg.content}
                </p>
              </div>
            );
          })
        )}
        <div ref={chatBottomRef} />
      </div>

      {/* ── Quick reaction row (clean & secondary) ── */}
      <div className="px-4 py-1.5 border-t border-[#1F202B] flex items-center gap-1.5 overflow-x-auto scrollbar-none shrink-0 bg-[#0C0D15]/60">
        <span className="text-[10px] font-mono uppercase text-zinc-600 mr-1 shrink-0">
          React:
        </span>
        {QUICK_REACTIONS.map((emoji) => (
          <button
            key={emoji}
            onClick={() => onSendReaction(emoji)}
            className="w-8 h-8 rounded-lg bg-white/[0.03] hover:bg-white/[0.07] active:scale-125 transition-all text-sm border border-white/[0.05] flex items-center justify-center shrink-0"
            title={`React with ${emoji}`}
          >
            {emoji}
          </button>
        ))}
      </div>

      {/* ── Chat input bar ── */}
      <form
        onSubmit={handleSendChat}
        className="px-4 py-3 border-t border-[#22232E] flex items-center gap-2 bg-[#0E0F17] shrink-0"
      >
        <input
          type="text"
          placeholder="Write a message..."
          value={messageInput}
          onChange={(e) => setMessageInput(e.target.value)}
          className="flex-1 bg-[#14151F] border border-[#272736] rounded-xl px-3.5 py-2.5 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-[#8B5CF6] transition-colors"
        />
        <button
          type="submit"
          disabled={!messageInput.trim()}
          className="w-9 h-9 rounded-xl bg-gradient-to-r from-[#8B5CF6] to-[#D946EF] hover:opacity-95 text-white flex items-center justify-center transition-all disabled:opacity-30 active:scale-95 shrink-0 shadow-[0_0_10px_rgba(139,92,246,0.3)]"
          title="Send"
        >
          <ArrowRight className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
};
