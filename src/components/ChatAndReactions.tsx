'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  MessageSquare,
  Users,
  Send,
  Crown,
  Headphones,
  Sparkles,
  Settings,
  MoreVertical,
  Shield,
} from 'lucide-react';
import { ChatMessage, Reaction, User, RoomSettings } from '@/types';

interface ChatAndReactionsProps {
  chat: ChatMessage[];
  users: User[];
  currentUser: User | null;
  settings: RoomSettings;
  onSendMessage: (content: string) => void;
  onSendReaction: (emoji: string) => void;
  onTransferHost: (targetUserId: string) => void;
  onToggleDJ: (targetUserId: string) => void;
  onUpdateSettings: (settings: Partial<RoomSettings>) => void;
}

const EMOJI_REACTIONS = ['🔥', '❤️', '🎵', '👏', '🎉', '🚀', '💃', '🎧'];

export const ChatAndReactions: React.FC<ChatAndReactionsProps> = ({
  chat,
  users,
  currentUser,
  settings,
  onSendMessage,
  onSendReaction,
  onTransferHost,
  onToggleDJ,
  onUpdateSettings,
}) => {
  const [activeTab, setActiveTab] = useState<'chat' | 'users' | 'settings'>('chat');
  const [messageInput, setMessageInput] = useState('');
  const chatBottomRef = useRef<HTMLDivElement>(null);

  const isHost = currentUser?.isHost ?? false;

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
    <div className="flex flex-col h-full bg-zinc-900/60 backdrop-blur-xl border border-zinc-800 rounded-2xl overflow-hidden shadow-xl">
      {/* Tabs Header */}
      <div className="flex border-b border-zinc-800 bg-zinc-950/40">
        <button
          onClick={() => setActiveTab('chat')}
          className={`flex-1 py-3 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors border-b-2 ${
            activeTab === 'chat'
              ? 'border-fuchsia-500 text-fuchsia-400 bg-zinc-900/40'
              : 'border-transparent text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <MessageSquare className="w-4 h-4" />
          <span>Chat ({chat.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('users')}
          className={`flex-1 py-3 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors border-b-2 ${
            activeTab === 'users'
              ? 'border-fuchsia-500 text-fuchsia-400 bg-zinc-900/40'
              : 'border-transparent text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Users ({users.length})</span>
        </button>

        {isHost && (
          <button
            onClick={() => setActiveTab('settings')}
            className={`flex-1 py-3 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors border-b-2 ${
              activeTab === 'settings'
                ? 'border-fuchsia-500 text-fuchsia-400 bg-zinc-900/40'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Settings className="w-4 h-4" />
            <span>Room Settings</span>
          </button>
        )}
      </div>

      {/* Tab 1: Live Chat */}
      {activeTab === 'chat' && (
        <div className="flex flex-col flex-1 min-h-0">
          {/* Messages list */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {chat.map((msg) => {
              if (msg.isSystem) {
                return (
                  <div
                    key={msg.id}
                    className="py-1.5 px-3 rounded-xl bg-zinc-800/40 border border-zinc-800 text-center text-xs text-zinc-400 italic"
                  >
                    {msg.content}
                  </div>
                );
              }

              const isMe = msg.userId === currentUser?.id;

              return (
                <div
                  key={msg.id}
                  className={`flex gap-2.5 items-start ${isMe ? 'flex-row-reverse' : ''}`}
                >
                  <img
                    src={msg.avatar}
                    alt={msg.username}
                    className="w-7 h-7 rounded-full border border-zinc-700 bg-zinc-800 shrink-0"
                  />
                  <div
                    className={`max-w-[80%] rounded-2xl px-3.5 py-2 text-xs shadow ${
                      isMe
                        ? 'bg-fuchsia-600 text-white rounded-tr-none'
                        : 'bg-zinc-800/90 text-zinc-200 rounded-tl-none border border-zinc-700/60'
                    }`}
                  >
                    {!isMe && (
                      <p className="font-bold text-[11px] text-fuchsia-300 mb-0.5">
                        {msg.username}
                      </p>
                    )}
                    <p className="break-words leading-relaxed">{msg.content}</p>
                    <p
                      className={`text-[9px] mt-1 text-right ${
                        isMe ? 'text-fuchsia-200' : 'text-zinc-500'
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
            })}
            <div ref={chatBottomRef} />
          </div>

          {/* Quick Reaction Bar */}
          <div className="px-3 py-2 border-t border-zinc-800/60 bg-zinc-950/30 flex items-center gap-1.5 overflow-x-auto scrollbar-none">
            <span className="text-[11px] text-zinc-500 shrink-0 mr-1 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-amber-400" /> React:
            </span>
            {EMOJI_REACTIONS.map((emoji) => (
              <button
                key={emoji}
                onClick={() => onSendReaction(emoji)}
                className="w-8 h-8 rounded-lg bg-zinc-800/60 hover:bg-zinc-700 hover:scale-125 active:scale-95 transition-transform flex items-center justify-center text-base"
                title={`Send ${emoji} reaction`}
              >
                {emoji}
              </button>
            ))}
          </div>

          {/* Input Box */}
          <form onSubmit={handleSendChat} className="p-3 border-t border-zinc-800 flex gap-2">
            <input
              type="text"
              placeholder="Send a chat message..."
              value={messageInput}
              onChange={(e) => setMessageInput(e.target.value)}
              className="flex-1 bg-zinc-950/90 border border-zinc-800 rounded-xl px-3.5 py-2 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-fuchsia-500"
            />
            <button
              type="submit"
              disabled={!messageInput.trim()}
              className="p-2.5 rounded-xl bg-fuchsia-600 hover:bg-fuchsia-500 text-white transition-colors disabled:opacity-40"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}

      {/* Tab 2: Participants */}
      {activeTab === 'users' && (
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {users.map((u) => {
            const isMe = u.id === currentUser?.id;

            return (
              <div
                key={u.id}
                className="flex items-center justify-between p-2.5 rounded-xl bg-zinc-950/40 border border-zinc-800/70"
              >
                <div className="flex items-center gap-3">
                  <img
                    src={u.avatar}
                    alt={u.username}
                    className="w-9 h-9 rounded-full border border-zinc-700 bg-zinc-800"
                  />
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-semibold text-zinc-200">
                        {u.username}
                      </span>
                      {isMe && (
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-zinc-800 text-zinc-400">
                          You
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 mt-0.5">
                      {u.isHost && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 font-semibold border border-amber-500/20 flex items-center gap-1">
                          <Crown className="w-2.5 h-2.5" /> Host
                        </span>
                      )}
                      {u.isDJ && !u.isHost && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 font-semibold border border-cyan-500/20 flex items-center gap-1">
                          <Headphones className="w-2.5 h-2.5" /> DJ
                        </span>
                      )}
                      {!u.isHost && !u.isDJ && (
                        <span className="text-[10px] text-zinc-500">Listener</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Host controls over users */}
                {isHost && !isMe && (
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => onToggleDJ(u.id)}
                      className={`px-2 py-1 rounded-lg text-[11px] font-medium transition-colors ${
                        u.isDJ
                          ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                          : 'bg-zinc-800 text-zinc-400 hover:text-zinc-200'
                      }`}
                      title={u.isDJ ? 'Remove DJ permissions' : 'Make DJ'}
                    >
                      {u.isDJ ? 'Remove DJ' : 'Make DJ'}
                    </button>

                    <button
                      onClick={() => onTransferHost(u.id)}
                      className="p-1.5 rounded-lg text-zinc-400 hover:text-amber-400 hover:bg-amber-500/10 transition-colors"
                      title="Transfer Host role to this user"
                    >
                      <Crown className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Tab 3: Room Settings (Host Only) */}
      {activeTab === 'settings' && isHost && (
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <div className="p-3.5 rounded-xl bg-zinc-950/60 border border-zinc-800 space-y-3">
            <h4 className="text-xs font-bold text-zinc-200 flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-fuchsia-400" /> Playback Permissions
            </h4>

            <label className="flex items-center justify-between text-xs text-zinc-300 cursor-pointer">
              <span>Allow anyone to Play / Pause / Seek</span>
              <input
                type="checkbox"
                checked={settings.isOpenControl}
                onChange={(e) => onUpdateSettings({ isOpenControl: e.target.checked })}
                className="rounded accent-fuchsia-600 w-4 h-4 cursor-pointer"
              />
            </label>
            <p className="text-[11px] text-zinc-500">
              When disabled, only the Host and designated DJs can change playback.
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-zinc-950/60 border border-zinc-800 space-y-3">
            <h4 className="text-xs font-bold text-zinc-200 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" /> Queue Permissions
            </h4>

            <label className="flex items-center justify-between text-xs text-zinc-300 cursor-pointer">
              <span>Allow anyone to add tracks to queue</span>
              <input
                type="checkbox"
                checked={settings.isOpenQueue}
                onChange={(e) => onUpdateSettings({ isOpenQueue: e.target.checked })}
                className="rounded accent-fuchsia-600 w-4 h-4 cursor-pointer"
              />
            </label>
            <p className="text-[11px] text-zinc-500">
              When disabled, only the Host and DJs can add or manage queued videos.
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-zinc-950/60 border border-zinc-800 space-y-2">
            <div className="flex justify-between text-xs text-zinc-300">
              <span>Vote to Skip Threshold</span>
              <span className="font-semibold text-fuchsia-400">
                {settings.skipThresholdPercent}%
              </span>
            </div>
            <input
              type="range"
              min={10}
              max={100}
              step={5}
              value={settings.skipThresholdPercent}
              onChange={(e) =>
                onUpdateSettings({ skipThresholdPercent: parseInt(e.target.value, 10) })
              }
              className="w-full accent-fuchsia-500 cursor-pointer"
            />
            <p className="text-[11px] text-zinc-500">
              Percentage of active listeners needed to automatically skip the current track.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
