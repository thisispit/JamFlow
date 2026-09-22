'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  MessageSquare,
  Users,
  Send,
  Sparkles,
  Settings,
} from 'lucide-react';
import { ChatMessage, User } from '@/types';

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
      {/* ── Top Header: Room status & Listener count ── */}
      <div className="px-3.5 py-2.5 border-b border-white/[0.08] flex items-center justify-between bg-[#0A0B14]/40 shrink-0">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
          <span className="text-xs font-bold text-white tracking-wide uppercase">Live Chat</span>
          <span className="text-[10px] text-zinc-500 font-mono">({chat.length})</span>
        </div>

        <div className="flex items-center gap-1.5">
          {onOpenListeners && (
            <button
              type="button"
              onClick={onOpenListeners}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/[0.04] border border-white/[0.08] text-zinc-300 hover:text-white text-[11px] font-medium transition-all active:scale-95 shadow-sm"
              title="View room listeners"
            >
              <Users className="w-3 h-3 text-[#8B5CF6]" />
              <span>{users.length}</span>
            </button>
          )}

          {currentUser?.isHost && onOpenSettings && (
            <button
              type="button"
              onClick={onOpenSettings}
              className="hidden sm:flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/[0.04] border border-white/[0.08] text-zinc-300 hover:text-white text-[11px] font-medium transition-all active:scale-95 shadow-sm"
              title="Room Settings"
            >
              <Settings className="w-3 h-3 text-[#D946EF]" />
              <span>Settings</span>
            </button>
          )}
        </div>
      </div>

      {/* ── Messages list ── */}
      <div className="flex-1 overflow-y-auto p-3 sm:p-3.5 space-y-3">
        {chat.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 select-none my-auto">
            <div className="w-12 h-12 rounded-2xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center mb-2.5 text-zinc-500 shadow-inner">
              <MessageSquare className="w-5 h-5 text-zinc-400" />
            </div>
            <p className="text-xs font-bold text-zinc-200">No messages yet</p>
            <p className="text-[11px] text-zinc-400 mt-0.5">Say hello to everyone in the room!</p>
          </div>
        ) : (
          chat.map((msg) => {
            if (msg.isSystem) {
              return (
                <div key={msg.id} className="flex justify-center my-1.5">
                  <span className="py-1 px-3.5 rounded-full bg-white/[0.03] border border-white/[0.06] text-center text-[10px] font-mono text-zinc-400 shadow-sm max-w-[92%] truncate">
                    {msg.content}
                  </span>
                </div>
              );
            }

            const isMe = msg.userId === currentUser?.id;

            return (
              <div
                key={msg.id}
                className={`flex gap-2 items-end ${isMe ? 'flex-row-reverse' : ''}`}
              >
                <img
                  src={msg.avatar}
                  alt={msg.username}
                  className="w-7 h-7 rounded-full border border-white/10 bg-zinc-800 shrink-0 object-cover shadow-sm mb-1"
                />
                <div
                  className={`max-w-[80%] sm:max-w-[75%] rounded-2xl px-3.5 py-2.5 text-xs shadow-sm transition-all ${
                    isMe
                      ? 'bg-gradient-to-r from-[#8B5CF6] to-[#7C3AED] text-white rounded-br-xs shadow-[0_3px_14px_rgba(139,92,246,0.3)]'
                      : 'bg-white/[0.05] border border-white/[0.08] backdrop-blur-md text-zinc-100 rounded-bl-xs'
                  }`}
                >
                  {!isMe && (
                    <p className="font-bold text-[11px] text-[#C084FC] mb-0.5">
                      {msg.username}
                    </p>
                  )}
                  <p className="break-words leading-relaxed text-[12px]">{msg.content}</p>
                  <p
                    className={`text-[9px] mt-1 text-right font-mono ${
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

      {/* ── Quick Reaction Dock (Tactile spring feel) ── */}
      <div className="px-3 py-2 border-t border-white/[0.06] bg-[#0A0B14]/30 flex items-center gap-1.5 overflow-x-auto scrollbar-none shrink-0">
        <span className="text-[10px] text-zinc-500 shrink-0 mr-1 flex items-center gap-1 font-mono uppercase tracking-wider">
          <Sparkles className="w-3 h-3 text-[#C084FC]" /> React
        </span>
        {EMOJI_REACTIONS.map((emoji) => (
          <button
            key={emoji}
            onClick={() => onSendReaction(emoji)}
            className="w-8 h-8 rounded-xl bg-white/[0.04] hover:bg-white/[0.09] active:scale-130 transition-transform duration-150 flex items-center justify-center text-sm border border-white/[0.07] shrink-0 shadow-sm"
            title={`Send ${emoji} reaction`}
          >
            {emoji}
          </button>
        ))}
      </div>

      {/* ── Floating Translucent Input Box ── */}
      <form
        onSubmit={handleSendChat}
        className="p-2.5 sm:p-3 border-t border-white/[0.08] flex items-center gap-2 bg-[#0C0D16]/95 backdrop-blur-2xl shrink-0"
      >
        <input
          type="text"
          placeholder="Say something to the room..."
          value={messageInput}
          onChange={(e) => setMessageInput(e.target.value)}
          className="flex-1 bg-white/[0.04] border border-white/[0.09] rounded-2xl px-4 py-2.5 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-[#8B5CF6] focus:ring-1 focus:ring-[#8B5CF6]/50 transition-all shadow-inner"
        />
        <button
          type="submit"
          disabled={!messageInput.trim()}
          className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-gradient-to-r from-[#8B5CF6] to-[#D946EF] hover:opacity-95 text-white flex items-center justify-center transition-all disabled:opacity-30 shadow-[0_0_15px_rgba(139,92,246,0.35)] active:scale-95 shrink-0"
          title="Send message"
        >
          <Send className="w-3.5 h-3.5" />
        </button>
      </form>
    </div>
  );
};
