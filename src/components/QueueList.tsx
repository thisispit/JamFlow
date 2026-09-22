'use client';

import React, { useState, useRef } from 'react';
import {
  Plus,
  Trash2,
  Play,
  ArrowUp,
  ArrowDown,
  FastForward,
  Clipboard,
  MoreVertical,
  Radio,
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

// ── Curated 24/7 Radio Stations ──────────────────────────────────────────────
const RADIO_STATIONS = [
  {
    id: 'lofi-girl',
    name: 'Lofi Girl',
    description: 'Chill beats to study & relax',
    genre: 'Lo-Fi',
    emoji: '☕',
    accent: '#A78BFA',
    url: 'https://www.youtube.com/watch?v=jfKfPfyJRdk',
    thumb: 'https://i.ytimg.com/vi/jfKfPfyJRdk/mqdefault.jpg',
  },
  {
    id: 'lofi-girl-evening',
    name: 'Lofi Girl — Sunset',
    description: 'Evening jazzy lo-fi beats',
    genre: 'Lo-Fi',
    emoji: '🌅',
    accent: '#F472B6',
    url: 'https://www.youtube.com/watch?v=rUxyKA_-grg',
    thumb: 'https://i.ytimg.com/vi/rUxyKA_-grg/mqdefault.jpg',
  },
  {
    id: 'chillhop',
    name: 'Chillhop Music',
    description: 'Real jazz & hip-hop beats',
    genre: 'Chillhop',
    emoji: '🎺',
    accent: '#34D399',
    url: 'https://www.youtube.com/watch?v=5yx6BWlEVcY',
    thumb: 'https://i.ytimg.com/vi/5yx6BWlEVcY/mqdefault.jpg',
  },
  {
    id: 'ncs',
    name: 'NCS Music',
    description: 'No copyright sounds, 24/7',
    genre: 'NCS / EDM',
    emoji: '⚡',
    accent: '#60A5FA',
    url: 'https://www.youtube.com/watch?v=7NOSDKb0HlU',
    thumb: 'https://i.ytimg.com/vi/7NOSDKb0HlU/mqdefault.jpg',
  },
  {
    id: 'synthwave',
    name: 'Synthwave Radio',
    description: 'Retro neon electronic vibes',
    genre: 'Synthwave',
    emoji: '🌆',
    accent: '#818CF8',
    url: 'https://www.youtube.com/watch?v=4xDzrJKXOOY',
    thumb: 'https://i.ytimg.com/vi/4xDzrJKXOOY/mqdefault.jpg',
  },
  {
    id: 'jazz-bgm',
    name: 'Jazz & Blues Radio',
    description: 'Smooth jazz for the evening',
    genre: 'Jazz',
    emoji: '🎷',
    accent: '#FBBF24',
    url: 'https://www.youtube.com/watch?v=Dx5qFachd3A',
    thumb: 'https://i.ytimg.com/vi/Dx5qFachd3A/mqdefault.jpg',
  },
  {
    id: 'classical',
    name: 'Classical Focus',
    description: 'Beethoven, Mozart & more',
    genre: 'Classical',
    emoji: '🎻',
    accent: '#F87171',
    url: 'https://www.youtube.com/watch?v=DWcJFNfaw9c',
    thumb: 'https://i.ytimg.com/vi/DWcJFNfaw9c/mqdefault.jpg',
  },
  {
    id: 'deep-focus',
    name: 'Deep Focus',
    description: 'Ambient for deep work',
    genre: 'Ambient',
    emoji: '🌌',
    accent: '#2DD4BF',
    url: 'https://www.youtube.com/watch?v=WPni755-Krg',
    thumb: 'https://i.ytimg.com/vi/WPni755-Krg/mqdefault.jpg',
  },
];

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
  const [activeMenuTrackId, setActiveMenuTrackId] = useState<string | null>(null);
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

  const handlePasteClipboard = async () => {
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        const text = await navigator.clipboard.readText();
        if (text) {
          setUrlInput(text.trim());
          inputRef.current?.focus();
        }
      }
    } catch {
      inputRef.current?.focus();
    }
  };

  return (
    <div className="flex flex-col h-full overflow-hidden bg-transparent">

      {/* ── Add track form & Presets bar ── */}
      <div className="p-4 sm:p-5 border-b border-white/[0.08] bg-[#0A0B14]/40 shrink-0">
        <form onSubmit={handleAddSubmit} className="flex gap-3 items-center">
          <div className="relative flex-1 flex items-center">
            <input
              ref={inputRef}
              type="text"
              placeholder={canAdd ? "Paste YouTube link…" : "Queue locked by host"}
              disabled={!canAdd || isSubmitting}
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              className="w-full bg-white/[0.04] border border-white/[0.09] rounded-2xl pl-4 pr-16 py-3.5 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-[#8B5CF6] focus:ring-1 focus:ring-[#8B5CF6]/50 transition-all disabled:opacity-40 shadow-inner"
            />
            {!urlInput && canAdd && (
              <button
                type="button"
                onClick={handlePasteClipboard}
                className="absolute right-2 px-3 py-1.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] text-zinc-400 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition-all active:scale-95"
                title="Paste from clipboard"
              >
                <Clipboard className="w-4 h-4 text-[#C084FC]" />
                <span className="hidden xs:inline">Paste</span>
              </button>
            )}
          </div>

          <button
            type="submit"
            disabled={!canAdd || isSubmitting || !urlInput.trim()}
            className="px-5 py-3.5 rounded-2xl bg-gradient-to-r from-[#8B5CF6] to-[#D946EF] text-white font-semibold text-sm flex items-center gap-1.5 transition-all disabled:opacity-30 hover:opacity-95 shadow-md shadow-[#8B5CF6]/25 active:scale-95 shrink-0"
          >
            {isSubmitting
              ? <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              : <Plus className="w-5 h-5" />
            }
          </button>
        </form>

        {inputError && <p className="text-xs text-rose-400 mt-2 ml-1">{inputError}</p>}

        {/* Radio Stations Carousel */}
        <div className="mt-3.5 flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          <span className="text-xs text-zinc-500 font-mono uppercase tracking-wider shrink-0 flex items-center gap-1.5 mr-1">
            <Radio className="w-4 h-4 text-[#C084FC]" /> Radio:
          </span>
          {RADIO_STATIONS.map((station) => (
            <button
              key={station.id}
              type="button"
              onClick={() => handleQuickAdd(station.url)}
              disabled={!canAdd || isSubmitting}
              className="shrink-0 px-3.5 py-1.5 rounded-full bg-white/[0.04] border border-white/[0.08] text-zinc-300 hover:border-[#8B5CF6]/50 hover:text-white text-xs font-medium flex items-center gap-1.5 transition-all disabled:opacity-30 active:scale-95 shadow-sm"
            >
              <span className="text-sm">{station.emoji}</span>
              <span>{station.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ── Vote to skip bar ── */}
      {currentTrack && (
        <div className="px-4 py-3 border-b border-white/[0.08] flex items-center justify-between bg-white/[0.02] shrink-0">
          <div className="flex items-center gap-2.5 min-w-0 flex-1 mr-2">
            <div className="flex items-end gap-1 h-4 shrink-0">
              <span className="w-1 h-full bg-[#8B5CF6] rounded-full animate-pulse" />
              <span className="w-1 h-2/3 bg-[#A855F7] rounded-full animate-pulse" />
              <span className="w-1 h-4/5 bg-[#D946EF] rounded-full animate-pulse" />
            </div>
            <span className="text-xs text-zinc-400 truncate">
              Now: <span className="text-zinc-200 font-semibold">{currentTrack.title}</span>
            </span>
          </div>
          <button
            onClick={onVoteSkip}
            className={`px-4 py-1.5 rounded-full text-xs font-medium flex items-center gap-1.5 transition-all active:scale-95 shrink-0 ${
              hasVoted
                ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                : 'bg-white/[0.05] border border-white/[0.08] text-zinc-400 hover:text-zinc-200 hover:border-white/20'
            }`}
          >
            <FastForward className="w-4 h-4" />
            {hasVoted ? 'Voted' : 'Skip'} ({voteSkip.votedUserIds.length}/{voteSkip.requiredVotes})
          </button>
        </div>
      )}

      {/* ── Queue items list ── */}
      <div
        className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-2.5"
        onClick={() => setActiveMenuTrackId(null)}
      >
        {queue.length === 0 ? (
          <div className="min-h-full flex flex-col items-center justify-center text-center p-6 select-none">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-3xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center mb-4 shadow-inner">
              <div className="w-8 h-8 rounded-full border-2 border-dashed border-[#8B5CF6]/60 flex items-center justify-center">
                <div className="w-3 h-3 rounded-full bg-[#8B5CF6]" />
              </div>
            </div>
            <p className="text-zinc-200 text-base font-bold tracking-tight">
              Queue is empty
            </p>
            <p className="text-zinc-400 text-sm mt-1.5 max-w-[240px] leading-relaxed">
              {userCount > 1
                ? `${userCount} people are waiting for the next track.`
                : 'Add a track or tune into a Live Radio station above.'}
            </p>
            <button
              type="button"
              onClick={() => inputRef.current?.focus()}
              disabled={!canAdd}
              className="mt-6 px-6 py-3 rounded-xl bg-gradient-to-r from-[#8B5CF6] to-[#D946EF] hover:opacity-95 text-white font-semibold text-sm flex items-center gap-2 transition-all shadow-md shadow-[#8B5CF6]/25 active:scale-95 disabled:opacity-40"
            >
              <Plus className="w-5 h-5" />
              <span>+ ADD TRACK</span>
            </button>
          </div>
        ) : (
          queue.map((track, idx) => {
            const isMenuOpen = activeMenuTrackId === track.id;
            const canRemove = canControl || currentUser?.id === track.addedBy.id;

            return (
              <div
                key={track.id}
                className="relative flex items-center gap-3 sm:gap-4 p-3 rounded-2xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.07] hover:border-white/15 transition-all group shadow-sm"
              >
                {/* Index */}
                <span className="text-sm font-mono font-bold text-zinc-500 w-6 text-center shrink-0">
                  {String(idx + 1).padStart(2, '0')}
                </span>

                {/* Thumbnail with duration badge */}
                <div className="relative w-20 h-14 rounded-xl overflow-hidden border border-white/10 shrink-0 bg-zinc-900 shadow-sm">
                  <img
                    src={track.thumbnail}
                    alt={track.title}
                    className="w-full h-full object-cover"
                  />
                  {track.duration > 0 && (
                    <span className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded bg-black/80 backdrop-blur-sm text-[10px] font-mono text-zinc-300 font-medium leading-none">
                      {formatDuration(track.duration)}
                    </span>
                  )}
                </div>

                {/* Track details */}
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-zinc-100 truncate group-hover:text-[#C084FC] transition-colors leading-snug">
                    {track.title}
                  </p>
                  <div className="flex items-center gap-1.5 text-xs text-zinc-400 truncate mt-1">
                    <span className="truncate">{track.author}</span>
                    <span className="text-zinc-600">•</span>
                    <span className="text-zinc-500 truncate">by {track.addedBy.username}</span>
                  </div>
                </div>

                {/* Desktop hover actions */}
                <div className="hidden sm:flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  {canControl && (
                    <>
                      <button onClick={() => onSkipTo(track.id)} className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors" title="Play Now">
                        <Play className="w-5 h-5 fill-current" />
                      </button>
                      <button onClick={() => onReorder(idx, idx - 1)} disabled={idx === 0} className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors disabled:opacity-20" title="Move Up">
                        <ArrowUp className="w-5 h-5" />
                      </button>
                      <button onClick={() => onReorder(idx, idx + 1)} disabled={idx === queue.length - 1} className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors disabled:opacity-20" title="Move Down">
                        <ArrowDown className="w-5 h-5" />
                      </button>
                    </>
                  )}
                  {canRemove && (
                    <button onClick={() => onRemoveTrack(track.id)} className="p-2 rounded-xl text-zinc-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors" title="Remove">
                      <Trash2 className="w-5 h-5" />
                    </button>
                  )}
                </div>

                {/* Mobile actions */}
                <div className="flex sm:hidden items-center gap-2 shrink-0">
                  {canControl && (
                    <button onClick={() => onSkipTo(track.id)} className="w-10 h-10 rounded-xl bg-[#8B5CF6]/15 hover:bg-[#8B5CF6]/30 text-[#C084FC] flex items-center justify-center transition-all active:scale-95 border border-[#8B5CF6]/30" title="Play Now">
                      <Play className="w-5 h-5 fill-current ml-0.5" />
                    </button>
                  )}
                  {(canControl || canRemove) && (
                    <button
                      onClick={(e) => { e.stopPropagation(); setActiveMenuTrackId(isMenuOpen ? null : track.id); }}
                      className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all active:scale-95 border ${isMenuOpen ? 'bg-white/20 text-white border-white/30' : 'bg-white/[0.04] text-zinc-400 hover:text-white border-white/[0.08]'}`}
                    >
                      <MoreVertical className="w-5 h-5" />
                    </button>
                  )}
                </div>

                {/* Mobile Popover Menu */}
                {isMenuOpen && (
                  <div className="sm:hidden absolute right-3 top-full mt-2 z-30 flex flex-col gap-1 p-2 rounded-2xl bg-[#121320]/95 backdrop-blur-2xl border border-white/[0.15] shadow-2xl animate-in fade-in zoom-in-95 duration-100 min-w-[140px]" onClick={(e) => e.stopPropagation()}>
                    {canControl && (
                      <>
                        <button onClick={() => { onReorder(idx, idx - 1); setActiveMenuTrackId(null); }} disabled={idx === 0} className="px-3 py-2.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-zinc-200 text-sm font-medium flex items-center gap-2 disabled:opacity-20 active:scale-95">
                          <ArrowUp className="w-4 h-4" /><span>Move Up</span>
                        </button>
                        <button onClick={() => { onReorder(idx, idx + 1); setActiveMenuTrackId(null); }} disabled={idx === queue.length - 1} className="px-3 py-2.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-zinc-200 text-sm font-medium flex items-center gap-2 disabled:opacity-20 active:scale-95">
                          <ArrowDown className="w-4 h-4" /><span>Move Down</span>
                        </button>
                      </>
                    )}
                    {canRemove && (
                      <button onClick={() => { onRemoveTrack(track.id); setActiveMenuTrackId(null); }} className="px-3 py-2.5 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-400 text-sm font-medium flex items-center gap-2 border border-rose-500/20 active:scale-95 mt-1">
                        <Trash2 className="w-4 h-4" /><span>Delete Track</span>
                      </button>
                    )}
                    <button onClick={() => setActiveMenuTrackId(null)} className="mt-1 px-3 py-2 rounded-xl text-zinc-400 hover:text-white text-sm font-medium flex justify-center w-full">Close</button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* ── Footer ── */}
      {queue.length > 0 && canControl && (
        <div className="px-4 py-3 border-t border-white/[0.06] bg-[#0A0B14]/30 flex justify-end shrink-0">
          <button onClick={onClearQueue} className="text-xs text-zinc-500 hover:text-rose-400 transition-colors flex items-center gap-1.5 active:scale-95">
            <Trash2 className="w-4 h-4" />
            Clear all tracks
          </button>
        </div>
      )}
    </div>
  );
};
