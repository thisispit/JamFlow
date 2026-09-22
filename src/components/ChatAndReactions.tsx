'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  MessageSquare,
  Users,
  Send,
  Sparkles,
  Settings,
} from 'lucide-react';
import { ChatMessage, Reaction, User } from '@/types';

interface ChatAndReactionsProps {
  chat: ChatMessage[];
  users: User[];
  currentUser: User | null;
  onSendMessage: (content: string) => void;
  onSendReaction: (emoji: string) => void;
  onOpenListeners?: () => void;
  onOpenSettings?: () => void;
}

const EMOJI_REACTIONS = ['🔥', '❤️', '🎵', '👏', '🎉', '🚀', '💃', '🎧'];

export const ChatAndReactions: React.FC<ChatAndReactionsProps> = ({
  chat,
  users,
  currentUser,
  onSendMessage,
  onSendReaction,
  onOpenListeners,
  onOpenSettings,
}) => {
  const [messageInput, setMessageInput] = useState('');
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // Auto-scroll chat to bottom
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
    <div className="flex flex-col h-full overflow-hidden bg-transparent">
      {/* Top Header: Pure Chat info + Quick actions */}
      <div className="px-3.5 py-3 border-b border-white/[0.08] flex items-center justify-between bg-white/[0.02] shrink-0">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_6px_rgba(52,211,153,0.8)]" />
          <span className="text-xs font-bold text-white tracking-wide uppercase">Room Chat</span>
          <span className="text-[10px] text-zinc-500 font-mono">({chat.length})</span>
        </div>

        <div className="flex items-center gap-2">
          {onOpenListeners && (
            <button
              type="button"
              onClick={onOpenListeners}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-white/[0.04] border border-white/[0.08] text-zinc-300 hover:text-white text-[11px] font-medium transition-all active:scale-95"
              title="View listeners"
            >
              <Users className="w-3 h-3 text-[#8B5CF6]" />
              <span>{users.length}</span>
            </button>
          )}

          {currentUser?.isHost && onOpenSettings && (
            <button
              type="button"
              onClick={onOpenSettings}
              className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-white/[0.04] border border-white/[0.08] text-zinc-300 hover:text-white text-[11px] font-medium transition-all active:scale-95"
              title="Room Settings"
            >
              <Settings className="w-3 h-3 text-[#D946EF]" />
              <span className="hidden xs:inline">Settings</span>
            </button>
          )}
        </div>
      </div>

      {/* Messages list */}
      <div className="flex-1 overflow-y-auto p-3.5 space-y-2.5">
        {chat.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 select-none">
            <div className="w-12 h-12 rounded-2xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center mb-2.5 text-zinc-500 shadow-inner">
              <MessageSquare className="w-5 h-5 text-zinc-400" />
            </div>
            <p className="text-xs font-bold text-zinc-200">No messages yet</p>
            <p className="text-[11px] text-zinc-500 mt-0.5">Say hello to everyone in the room!</p>
          </div>
        ) : (
          chat.map((msg) => {
            if (msg.isSystem) {
              return (
                <div
                  key={msg.id}
                  className="py-1 px-3 rounded-xl bg-white/[0.03] border border-white/[0.06] text-center text-[11px] text-zinc-400 italic"
                >
                  {msg.content}
                </div>
              );
            }

            const isMe = msg.userId === currentUser?.id;

            return (
              <div
                key={msg.id}
                className={`flex gap-2 items-start ${isMe ? 'flex-row-reverse' : ''}`}
              >
                <img
                  src={msg.avatar}
                  alt={msg.username}
                  className="w-7 h-7 rounded-full border border-white/10 bg-zinc-800 shrink-0 object-cover shadow-sm"
                />
                <div
                  className={`max-w-[82%] rounded-2xl px-3.5 py-2.5 text-xs shadow-sm ${
                    isMe
                      ? 'bg-gradient-to-r from-[#8B5CF6] to-[#7C3AED] text-white rounded-tr-none shadow-[0_2px_10px_rgba(139,92,246,0.3)]'
                      : 'bg-white/[0.05] text-zinc-100 rounded-tl-none border border-white/[0.08]'
                  }`}
                >
                  {!isMe && (
                    <p className="font-bold text-[11px] text-[#C084FC] mb-0.5">
                      {msg.username}
                    </p>
                  )}
                  <p className="break-words leading-relaxed text-[12px]">{msg.content}</p>
                  <p
                    className={`text-[9px] mt-1 text-right ${
                      isMe ? 'text-white/70' : 'text-zinc-500'
                    }`}
                  >
                    {new Date(msg.timestamp).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
              </div>
            );
          })
        )}
        <div ref={chatBottomRef} />
      </div>

      {/* Quick Reaction Bar */}
      <div className="px-3.5 py-2 border-t border-white/[0.08] bg-white/[0.02] flex items-center gap-2 overflow-x-auto scrollbar-none shrink-0">
        <span className="text-[10px] text-zinc-500 shrink-0 mr-0.5 flex items-center gap-1 font-mono uppercase">
          <Sparkles className="w-3 h-3 text-amber-400" /> React
        </span>
        {EMOJI_REACTIONS.map((emoji) => (
          <button
            key={emoji}
            onClick={() => onSendReaction(emoji)}
            className="w-8 h-8 rounded-xl bg-white/[0.04] hover:bg-white/[0.09] hover:scale-115 active:scale-95 transition-all flex items-center justify-center text-sm border border-white/[0.08]"
            title={`Send ${emoji} reaction`}
          >
            {emoji}
          </button>
        ))}
      </div>

      {/* Input Box */}
      <form onSubmit={handleSendChat} className="p-3 border-t border-white/[0.08] flex gap-2 bg-[#0C0D16]/90 shrink-0">
        <input
          type="text"
          placeholder="Send a chat message..."
          value={messageInput}
          onChange={(e) => setMessageInput(e.target.value)}
          className="flex-1 bg-white/[0.04] border border-white/[0.09] rounded-xl px-3.5 py-2.5 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-[#8B5CF6] focus:ring-1 focus:ring-[#8B5CF6]/50 transition-all shadow-inner"
        />
        <button
          type="submit"
          disabled={!messageInput.trim()}
          className="p-3 rounded-xl bg-gradient-to-r from-[#8B5CF6] to-[#D946EF] hover:opacity-90 text-white transition-all disabled:opacity-30 shadow-[0_0_15px_rgba(139,92,246,0.3)] active:scale-95 shrink-0"
        >
          <Send className="w-3.5 h-3.5" />
        </button>
      </form>
    </div>
  );
};
