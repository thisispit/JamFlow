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
    <div className="flex flex-col h-full overflow-hidden bg-[#111114]">
      {/* Top Header: Pure Chat info + Quick actions (No nested tabs) */}
      <div className="px-3.5 py-2.5 border-b border-[#242429] flex items-center justify-between bg-[#111114] shrink-0">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_6px_rgba(52,211,153,0.8)]" />
          <span className="text-xs font-bold text-white tracking-wide uppercase">Room Chat</span>
          <span className="text-[10px] text-zinc-500 font-mono">({chat.length})</span>
        </div>

        <div className="flex items-center gap-1.5">
          {onOpenListeners && (
            <button
              type="button"
              onClick={onOpenListeners}
              className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-[#09090B] border border-[#242429] text-zinc-400 hover:text-white text-[11px] font-medium transition-colors"
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
              className="flex items-center gap-1 px-2 py-1 rounded-lg bg-[#09090B] border border-[#242429] text-zinc-400 hover:text-white text-[11px] font-medium transition-colors"
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
            <div className="w-10 h-10 rounded-2xl bg-[#09090B] border border-[#242429] flex items-center justify-center mb-2 text-zinc-600">
              <MessageSquare className="w-5 h-5 text-zinc-500" />
            </div>
            <p className="text-xs font-semibold text-zinc-300">No messages yet</p>
            <p className="text-[11px] text-zinc-500 mt-0.5">Say hello to everyone in the room!</p>
          </div>
        ) : (
          chat.map((msg) => {
            if (msg.isSystem) {
              return (
                <div
                  key={msg.id}
                  className="py-1 px-2.5 rounded-lg bg-[#09090B] border border-[#242429] text-center text-[11px] text-zinc-400 italic"
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
                  className="w-7 h-7 rounded-full border border-[#242429] bg-zinc-800 shrink-0 object-cover"
                />
                <div
                  className={`max-w-[82%] rounded-2xl px-3 py-2 text-xs shadow ${
                    isMe
                      ? 'bg-gradient-to-r from-[#8B5CF6] to-[#7C3AED] text-white rounded-tr-none shadow-[0_2px_8px_rgba(139,92,246,0.25)]'
                      : 'bg-[#09090B] text-zinc-200 rounded-tl-none border border-[#242429]'
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
      <div className="px-3 py-1.5 border-t border-[#242429] bg-[#09090B]/60 flex items-center gap-1.5 overflow-x-auto scrollbar-none shrink-0">
        <span className="text-[10px] text-zinc-500 shrink-0 mr-1 flex items-center gap-1 font-mono uppercase">
          <Sparkles className="w-3 h-3 text-amber-400" /> React
        </span>
        {EMOJI_REACTIONS.map((emoji) => (
          <button
            key={emoji}
            onClick={() => onSendReaction(emoji)}
            className="w-7 h-7 rounded-lg bg-[#111114] hover:bg-zinc-800 hover:scale-125 active:scale-95 transition-transform flex items-center justify-center text-sm border border-[#242429]"
            title={`Send ${emoji} reaction`}
          >
            {emoji}
          </button>
        ))}
      </div>

      {/* Input Box */}
      <form onSubmit={handleSendChat} className="p-2.5 border-t border-[#242429] flex gap-2 bg-[#111114] shrink-0">
        <input
          type="text"
          placeholder="Send a chat message..."
          value={messageInput}
          onChange={(e) => setMessageInput(e.target.value)}
          className="flex-1 bg-[#09090B] border border-[#242429] rounded-xl px-3 py-2 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-[#8B5CF6] transition-colors"
        />
        <button
          type="submit"
          disabled={!messageInput.trim()}
          className="p-2.5 rounded-xl bg-gradient-to-r from-[#8B5CF6] to-[#D946EF] hover:opacity-90 text-white transition-opacity disabled:opacity-30 shadow-[0_0_12px_rgba(139,92,246,0.3)] shrink-0"
        >
          <Send className="w-3.5 h-3.5" />
        </button>
      </form>
    </div>
  );
};
