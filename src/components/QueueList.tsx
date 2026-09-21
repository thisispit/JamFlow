'use client';

import React, { useState } from 'react';
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
  onAddTrack: (url: string) => Promise<boolean>;
  onRemoveTrack: (trackId: string) => void;
  onReorder: (startIndex: number, endIndex: number) => void;
  onSkipTo: (trackId: string) => void;
  onClearQueue: () => void;
  onVoteSkip: () => void;
}

const PRESET_TRACKS = [
  {
    title: 'Lofi Hip Hop - Chill Beats',
    url: 'https://www.youtube.com/watch?v=jfKfPfyJRdk',
  },
  {
    title: 'Synthwave Radio - Chill Synth',
    url: 'https://www.youtube.com/watch?v=4xDzrJKXOOY',
  },
  {
    title: 'Coffee Shop Acoustic Vibes',
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
    <div className="flex flex-col h-full bg-zinc-900/60 backdrop-blur-xl border border-zinc-800 rounded-2xl overflow-hidden shadow-xl">
      {/* Header */}
      <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-fuchsia-500/10 text-fuchsia-400">
            <ListMusic className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-zinc-100 text-sm flex items-center gap-2">
              Shared Queue
              <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400 font-normal">
                {queue.length} {queue.length === 1 ? 'track' : 'tracks'}
              </span>
            </h3>
          </div>
        </div>

        {/* Vote to Skip button */}
        {currentTrack && (
          <button
            onClick={onVoteSkip}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm ${
              hasVoted
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 active:scale-95'
            }`}
            title="Vote to skip current track"
          >
            <FastForward className="w-3.5 h-3.5" />
            <span>
              {hasVoted ? 'Voted' : 'Vote Skip'} ({voteSkip.votedUserIds.length}/{voteSkip.requiredVotes})
            </span>
          </button>
        )}
      </div>

      {/* Add track form */}
      <div className="p-4 border-b border-zinc-800/80 bg-zinc-900/30">
        <form onSubmit={handleAddSubmit} className="flex gap-2">
          <input
            type="text"
            placeholder={canAdd ? "Paste YouTube link or ID..." : "Queue locked by host"}
            disabled={!canAdd || isSubmitting}
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            className="flex-1 bg-zinc-950/80 border border-zinc-800 rounded-xl px-3.5 py-2 text-sm text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-fuchsia-500 transition-colors disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={!canAdd || isSubmitting || !urlInput.trim()}
            className="px-4 py-2 rounded-xl bg-fuchsia-600 hover:bg-fuchsia-500 text-white font-medium text-sm flex items-center gap-1.5 transition-all disabled:opacity-40 shadow-lg shadow-fuchsia-600/20"
          >
            {isSubmitting ? (
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <Plus className="w-4 h-4" />
                <span>Add</span>
              </>
            )}
          </button>
        </form>

        {inputError && (
          <p className="text-xs text-rose-400 mt-2 ml-1">{inputError}</p>
        )}

        {/* Quick Suggestion Presets */}
        <div className="mt-3 flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs">
          <span className="text-zinc-500 shrink-0 text-[11px] flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-fuchsia-400" /> Quick Add:
          </span>
          {PRESET_TRACKS.map((preset, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleQuickAdd(preset.url)}
              disabled={!canAdd || isSubmitting}
              className="shrink-0 px-2.5 py-1 rounded-lg bg-zinc-800/60 hover:bg-zinc-700/80 border border-zinc-700/40 text-zinc-300 text-[11px] transition-colors"
            >
              {preset.title}
            </button>
          ))}
        </div>
      </div>

      {/* Queue items list */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {queue.length === 0 ? (
          <div className="h-48 flex flex-col items-center justify-center text-center p-4">
            <div className="w-12 h-12 rounded-full bg-zinc-800/80 flex items-center justify-center mb-2 text-zinc-500">
              <Music2 className="w-6 h-6" />
            </div>
            <p className="text-zinc-400 text-sm font-medium">The queue is empty</p>
            <p className="text-zinc-500 text-xs mt-0.5">
              Add videos using the input above to keep the music going!
            </p>
          </div>
        ) : (
          queue.map((track, idx) => (
            <div
              key={track.id}
              className="flex items-center gap-3 p-2.5 rounded-xl bg-zinc-950/40 border border-zinc-800/60 hover:border-zinc-700 transition-all group"
            >
              <span className="text-xs font-mono text-zinc-500 w-5 text-center shrink-0">
                {idx + 1}
              </span>

              <img
                src={track.thumbnail}
                alt={track.title}
                className="w-12 h-9 rounded-lg object-cover border border-zinc-800 shrink-0"
              />

              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-zinc-200 truncate group-hover:text-fuchsia-300 transition-colors">
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
        <div className="p-3 border-t border-zinc-800/80 bg-zinc-950/20 flex justify-end">
          <button
            onClick={onClearQueue}
            className="text-xs text-zinc-500 hover:text-rose-400 transition-colors flex items-center gap-1 px-2 py-1 rounded"
          >
            <Trash2 className="w-3 h-3" />
            <span>Clear Queue</span>
          </button>
        </div>
      )}
    </div>
  );
};
