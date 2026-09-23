'use client';

import React, { useState } from 'react';
import {
  Trash2,
  Play,
  ArrowUp,
  ArrowDown,
  FastForward,
  MoreVertical,
  Plus,
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
  onAddTrack?: (url: string) => Promise<boolean>;
  onRemoveTrack: (trackId: string) => void;
  onReorder: (startIndex: number, endIndex: number) => void;
  onSkipTo: (trackId: string) => void;
  onClearQueue: () => void;
  onVoteSkip: () => void;
  onFocusAddInput?: () => void;
}

const formatDuration = (seconds?: number) => {
  if (!seconds || isNaN(seconds)) return null;
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
};

export const QueueList: React.FC<QueueListProps> = ({
  queue,
  currentTrack,
  currentUser,
  voteSkip,
  canControl,
  canAdd,
  userCount = 1,
  onRemoveTrack,
  onReorder,
  onSkipTo,
  onClearQueue,
  onVoteSkip,
  onFocusAddInput,
}) => {
  const [activeMenuTrackId, setActiveMenuTrackId] = useState<string | null>(null);
  const hasVoted = currentUser ? voteSkip.votedUserIds.includes(currentUser.id) : false;

  return (
    <div
      className="flex flex-col h-full overflow-hidden bg-transparent select-none"
      onClick={() => setActiveMenuTrackId(null)}
    >
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {/* NOW PLAYING */}
        {currentTrack && (
          <div>
            <h3 className="text-[10px] font-mono font-bold tracking-widest text-zinc-500 uppercase mb-2">
              NOW PLAYING
            </h3>
            <div className="p-3.5 rounded-xl bg-[#12131C] border border-[#272736] hover:border-[#8B5CF6]/30 transition-colors">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <span className="w-2 h-2 rounded-full bg-[#D946EF] shadow-[0_0_8px_rgba(217,70,239,0.8)] shrink-0" />
                  <span className="text-sm font-semibold text-white truncate">
                    {currentTrack.title}
                  </span>
                </div>
                {currentTrack.duration > 0 && (
                  <span className="text-xs font-mono text-zinc-400 shrink-0">
                    {formatDuration(currentTrack.duration)}
                  </span>
                )}
              </div>
              <div className="flex items-center justify-between mt-1 text-xs text-zinc-400 pl-4">
                <span className="truncate">{currentTrack.author}</span>
                <button
                  type="button"
                  onClick={onVoteSkip}
                  className={`flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-mono transition-all active:scale-95 ${
                    hasVoted
                      ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/25'
                      : 'bg-white/[0.04] border border-white/[0.06] text-zinc-400 hover:text-zinc-200'
                  }`}
                  title="Vote to skip current track"
                >
                  <FastForward className="w-2.5 h-2.5" />
                  <span>
                    Skip ({voteSkip.votedUserIds.length}/{voteSkip.requiredVotes})
                  </span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* UP NEXT */}
        {queue.length > 0 && (
          <div>
            <h3 className="text-[10px] font-mono font-bold tracking-widest text-zinc-500 uppercase mb-2">
              UP NEXT
            </h3>
            <div className="space-y-1.5">
              {queue.map((track, idx) => {
                const isMenuOpen = activeMenuTrackId === track.id;
                const canRemove = canControl || currentUser?.id === track.addedBy.id;
                const isYou = currentUser?.id === track.addedBy.id;

                return (
                  <div
                    key={track.id}
                    className="relative flex items-center gap-3 p-3 rounded-xl bg-[#11121A] hover:bg-[#151622] border border-[#22232E] hover:border-[#2F3042] transition-colors group"
                  >
                    {/* Index */}
                    <span className="text-xs font-mono font-semibold text-zinc-500 w-5 shrink-0 text-center">
                      {String(idx + 1).padStart(2, '0')}
                    </span>

                    {/* Track info */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-medium text-zinc-200 truncate group-hover:text-white transition-colors">
                          {track.title}
                        </p>
                        {track.duration > 0 && (
                          <span className="text-xs font-mono text-zinc-500 shrink-0">
                            {formatDuration(track.duration)}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-zinc-500 truncate mt-0.5">
                        Added by {isYou ? 'You' : track.addedBy.username}
                      </p>
                    </div>

                    {/* Desktop hover controls */}
                    <div className="hidden sm:flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                      {canControl && (
                        <>
                          <button
                            onClick={() => onSkipTo(track.id)}
                            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
                            title="Play now"
                          >
                            <Play className="w-3.5 h-3.5 fill-current" />
                          </button>
                          <button
                            onClick={() => onReorder(idx, idx - 1)}
                            disabled={idx === 0}
                            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition-colors disabled:opacity-20"
                            title="Move up"
                          >
                            <ArrowUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => onReorder(idx, idx + 1)}
                            disabled={idx === queue.length - 1}
                            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition-colors disabled:opacity-20"
                            title="Move down"
                          >
                            <ArrowDown className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )}
                      {canRemove && (
                        <button
                          onClick={() => onRemoveTrack(track.id)}
                          className="p-1.5 rounded-lg text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                          title="Remove"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    {/* Mobile menu button */}
                    <div className="flex sm:hidden items-center gap-1 shrink-0">
                      {canControl && (
                        <button
                          onClick={() => onSkipTo(track.id)}
                          className="w-8 h-8 rounded-lg bg-[#8B5CF6]/15 text-[#C084FC] flex items-center justify-center active:scale-95 border border-[#8B5CF6]/20"
                          title="Play now"
                        >
                          <Play className="w-3.5 h-3.5 fill-current" />
                        </button>
                      )}
                      {(canControl || canRemove) && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveMenuTrackId(isMenuOpen ? null : track.id);
                          }}
                          className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all active:scale-95 border ${
                            isMenuOpen
                              ? 'bg-white/15 text-white border-white/20'
                              : 'bg-white/[0.04] text-zinc-400 border-white/[0.07]'
                          }`}
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    {/* Mobile popup */}
                    {isMenuOpen && (
                      <div
                        className="sm:hidden absolute right-2 top-full mt-1 z-30 flex flex-col gap-1 p-1.5 rounded-xl bg-[#151624] border border-[#2D2E42] shadow-2xl animate-in fade-in zoom-in-95 duration-100 min-w-[130px]"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {canControl && (
                          <>
                            <button
                              onClick={() => {
                                onReorder(idx, idx - 1);
                                setActiveMenuTrackId(null);
                              }}
                              disabled={idx === 0}
                              className="px-3 py-2 rounded-lg text-zinc-200 text-xs font-medium flex items-center gap-2 hover:bg-white/[0.08] disabled:opacity-25 active:scale-95"
                            >
                              <ArrowUp className="w-3.5 h-3.5" /> Move Up
                            </button>
                            <button
                              onClick={() => {
                                onReorder(idx, idx + 1);
                                setActiveMenuTrackId(null);
                              }}
                              disabled={idx === queue.length - 1}
                              className="px-3 py-2 rounded-lg text-zinc-200 text-xs font-medium flex items-center gap-2 hover:bg-white/[0.08] disabled:opacity-25 active:scale-95"
                            >
                              <ArrowDown className="w-3.5 h-3.5" /> Move Down
                            </button>
                          </>
                        )}
                        {canRemove && (
                          <button
                            onClick={() => {
                              onRemoveTrack(track.id);
                              setActiveMenuTrackId(null);
                            }}
                            className="px-3 py-2 rounded-lg text-rose-400 text-xs font-medium flex items-center gap-2 hover:bg-rose-500/10 border border-rose-500/15 active:scale-95 mt-0.5"
                          >
                            <Trash2 className="w-3.5 h-3.5" /> Remove
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* EMPTY QUEUE — Visually quiet and minimal */}
        {!currentTrack && queue.length === 0 && (
          <div className="flex flex-col items-center justify-center text-center py-16 px-6 select-none min-h-[260px]">
            <div className="text-3xl text-zinc-600 mb-4 font-serif">♪</div>
            <p className="text-zinc-300 text-sm font-semibold">
              Nothing in the queue
            </p>
            <p className="text-zinc-500 text-xs mt-1 leading-relaxed max-w-[220px]">
              {userCount > 1
                ? `${userCount} people are waiting for the next track.`
                : 'Add a track to start listening together.'}
            </p>
            {canAdd && onFocusAddInput && (
              <button
                type="button"
                onClick={onFocusAddInput}
                className="mt-6 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#8B5CF6] to-[#D946EF] hover:opacity-95 text-white font-semibold text-xs tracking-wider transition-all shadow-md shadow-[#8B5CF6]/20 active:scale-95"
              >
                + ADD TRACK
              </button>
            )}
          </div>
        )}
      </div>

      {/* Footer: Clear queue */}
      {queue.length > 0 && canControl && (
        <div className="px-4 py-2.5 border-t border-[#22232E] flex justify-end shrink-0">
          <button
            onClick={onClearQueue}
            className="text-xs text-zinc-500 hover:text-rose-400 transition-colors flex items-center gap-1.5 active:scale-95"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Clear queue
          </button>
        </div>
      )}
    </div>
  );
};
