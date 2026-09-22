'use client';

import React, { useState, useRef } from 'react';
import {
  ListMusic,
  Plus,
  Trash2,
  Play,
  ArrowUp,
  ArrowDown,
  FastForward,
  Check,
  Music2,
  Sparkles,
} from 'lucide-react';
import { Track, VoteSkipState, User } from '@/types';

interface QueueListProps {
  queue: Track[];
  currentTrack: Track | null;
  currentUser: User | null;
  voteSkip: VoteSkipState;
  canControl: boolean;
  canAdd: boolean;
  userCount?: number;
  onAddTrack: (url: string) => Promise<boolean>;
  onRemoveTrack: (trackId: string) => void;
  onReorder: (startIndex: number, endIndex: number) => void;
  onSkipTo: (trackId: string) => void;
  onClearQueue: () => void;
  onVoteSkip: () => void;
}

const PRESET_TRACKS = [
  {
    title: '+ Lo-fi',
    url: 'https://www.youtube.com/watch?v=jfKfPfyJRdk',
  },
  {
    title: '+ Synthwave',
    url: 'https://www.youtube.com/watch?v=4xDzrJKXOOY',
  },
  {
    title: '+ Chillhop',
    url: 'https://www.youtube.com/watch?v=turbc3bT19k',
  },
];

export const QueueList: React.FC<QueueListProps> = ({
  queue,
  currentTrack,
  currentUser,
  voteSkip,
  canControl,
  canAdd,
  userCount = 1,
  onAddTrack,
  onRemoveTrack,
  onReorder,
  onSkipTo,
  onClearQueue,
  onVoteSkip,
}) => {
  const [urlInput, setUrlInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [inputError, setInputError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const hasVoted = currentUser ? voteSkip.votedUserIds.includes(currentUser.id) : false;

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!urlInput.trim()) return;

    setIsSubmitting(true);
    setInputError(null);

    const success = await onAddTrack(urlInput.trim());
    setIsSubmitting(false);

    if (success) {
      setUrlInput('');
    } else {
      setInputError('Could not load YouTube video. Please check the URL.');
    }
  };

  const handleQuickAdd = async (url: string) => {
    setIsSubmitting(true);
    setInputError(null);
    await onAddTrack(url);
    setIsSubmitting(false);
  };

  return (
    <div className="flex flex-col h-full overflow-hidden bg-transparent">
      {/* Add track form */}
      <div className="p-3.5 border-b border-white/[0.08]">
        <form onSubmit={handleAddSubmit} className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            placeholder={canAdd ? "Paste YouTube link…" : "Queue locked by host"}
            disabled={!canAdd || isSubmitting}
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            className="flex-1 bg-white/[0.04] border border-white/[0.09] rounded-xl px-3.5 py-2.5 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-[#8B5CF6] focus:ring-1 focus:ring-[#8B5CF6]/50 transition-all disabled:opacity-40 shadow-inner"
          />
          <button
            type="submit"
            disabled={!canAdd || isSubmitting || !urlInput.trim()}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#8B5CF6] to-[#D946EF] text-white font-semibold text-xs flex items-center gap-1 transition-all disabled:opacity-30 hover:opacity-95 shadow-md shadow-[#8B5CF6]/25 active:scale-95"
          >
            {isSubmitting
              ? <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              : <Plus className="w-4 h-4" />
            }
          </button>
        </form>

        {inputError && <p className="text-[11px] text-rose-400 mt-1.5 ml-1">{inputError}</p>}

        {/* Quick Add presets */}
        <div className="mt-2.5 flex gap-1.5 overflow-x-auto pb-0.5 scrollbar-none">
          {PRESET_TRACKS.map((preset, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleQuickAdd(preset.url)}
              disabled={!canAdd || isSubmitting}
              className="shrink-0 px-3 py-1 rounded-full bg-white/[0.04] border border-white/[0.08] text-zinc-400 text-[11px] hover:border-[#8B5CF6]/50 hover:text-white transition-colors disabled:opacity-30 active:scale-95"
            >
              {preset.title}
            </button>
          ))}
        </div>
      </div>

      {/* Vote to skip bar */}
      {currentTrack && (
        <div className="px-3.5 py-2.5 border-b border-white/[0.08] flex items-center justify-between bg-white/[0.02]">
          <span className="text-[11px] text-zinc-400">
            Now playing · <span className="text-zinc-200 font-medium">{currentTrack.title.slice(0, 26)}{currentTrack.title.length > 26 ? '…' : ''}</span>
          </span>
          <button
            onClick={onVoteSkip}
            className={`px-3 py-1 rounded-full text-[11px] font-medium flex items-center gap-1 transition-all active:scale-95 ${
              hasVoted
                ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                : 'bg-white/[0.05] border border-white/[0.08] text-zinc-400 hover:text-zinc-200 hover:border-white/20'
            }`}
          >
            <FastForward className="w-3 h-3" />
            {hasVoted ? 'Voted' : 'Skip'} ({voteSkip.votedUserIds.length}/{voteSkip.requiredVotes})
          </button>
        </div>
      )}

      {/* Queue items list */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {queue.length === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center text-center p-6 my-auto select-none">
            <div className="w-14 h-14 rounded-2xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center mb-3 shadow-inner">
              <div className="w-6 h-6 rounded-full border-2 border-dashed border-[#8B5CF6]/60 flex items-center justify-center">
                <div className="w-2 h-2 rounded-full bg-[#8B5CF6]" />
              </div>
            </div>
            <p className="text-zinc-200 text-sm font-bold tracking-tight">
              {userCount > 1 ? 'Nothing playing' : 'Nothing in the flow'}
            </p>
            <p className="text-zinc-400 text-xs mt-1 max-w-[220px] leading-relaxed">
              {userCount > 1
                ? `${userCount} people are waiting for the next track.`
                : 'Add a track and start listening together.'}
            </p>
            <button
              type="button"
              onClick={() => inputRef.current?.focus()}
              disabled={!canAdd}
              className="mt-4 px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#8B5CF6] to-[#D946EF] hover:opacity-95 text-white font-semibold text-xs flex items-center gap-1.5 transition-all shadow-md shadow-[#8B5CF6]/25 active:scale-95 disabled:opacity-40"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{userCount > 1 ? '+ ADD TRACK' : '+ ADD FIRST TRACK'}</span>
            </button>
          </div>
        ) : (
          queue.map((track, idx) => (
            <div
              key={track.id}
              className="flex items-center gap-3 p-2.5 rounded-2xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.07] hover:border-white/15 transition-all group shadow-sm"
            >
              <span className="text-xs font-mono font-bold text-zinc-500 w-6 text-center shrink-0">
                {String(idx + 1).padStart(2, '0')}
              </span>

              <img
                src={track.thumbnail}
                alt={track.title}
                className="w-12 h-9 rounded-xl object-cover border border-white/10 shrink-0"
              />

              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-zinc-200 truncate group-hover:text-[#C084FC] transition-colors">
                  {track.title}
                </p>
                <div className="flex items-center gap-2 text-[11px] text-zinc-400 truncate">
                  <span>{track.author}</span>
                  <span className="text-zinc-600">•</span>
                  <span className="text-zinc-500">Added by {track.addedBy.username}</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-1 opacity-90 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                {canControl && (
                  <>
                    <button
                      onClick={() => onSkipTo(track.id)}
                      className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
                      title="Play Now"
                    >
                      <Play className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => onReorder(idx, idx - 1)}
                      disabled={idx === 0}
                      className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors disabled:opacity-20"
                      title="Move Up"
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => onReorder(idx, idx + 1)}
                      disabled={idx === queue.length - 1}
                      className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors disabled:opacity-20"
                      title="Move Down"
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>
                  </>
                )}

                {(canControl || currentUser?.id === track.addedBy.id) && (
                  <button
                    onClick={() => onRemoveTrack(track.id)}
                    className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                    title="Remove from queue"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Footer Clear Queue button */}
      {queue.length > 0 && canControl && (
        <div className="px-3 py-2 border-t border-white/5 flex justify-end">
          <button
            onClick={onClearQueue}
            className="text-[11px] text-zinc-600 hover:text-rose-400 transition-colors flex items-center gap-1"
          >
            <Trash2 className="w-3 h-3" />
            Clear all
          </button>
        </div>
      )}
    </div>
  );
};
