'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Radio, ArrowRight, X, Music2, Users, Sparkles, Shuffle,
} from 'lucide-react';
import { getSocket } from '@/lib/socket';
import { getRandomAnimeName } from '@/lib/animeNames';

const ROOM_NAME_SUGGESTIONS = [
  { name: 'Chill', emoji: '🌴' },
  { name: 'Work', emoji: '💻' },
  { name: 'Study', emoji: '📚' },
  { name: 'Gaming', emoji: '🎮' },
  { name: 'Lofi', emoji: '🎧' },
  { name: 'Late Night', emoji: '🌙' },
];

/* ─────────────────────────────────────────────────────────────────
   Vinyl SVG — authentic grooves + label + iridescent neon sheen
───────────────────────────────────────────────────────────────── */
const VINYL_GROOVES = Array.from({ length: 18 }, (_, i) => {
  const r = 84 + i * 9;
  const shade = i % 2 === 0 ? '#1f1f1f' : '#141414';
  const sw = i % 4 === 0 ? 0.9 : 0.6;
  return { r, shade, sw };
});

function VinylRecord() {
  const cx = 250, cy = 250;

  return (
    <svg
      viewBox="0 0 500 500"
      className="w-full h-full transform-gpu"
    >
      <defs>
        {/* Outer rim gradient */}
        <radialGradient id="rimGrad" cx="50%" cy="50%" r="50%">
          <stop offset="88%" stopColor="#0a0a0a" />
          <stop offset="100%" stopColor="#1c1c1c" />
        </radialGradient>

        {/* Diagonal sheen — rotates with record for shimmer */}
        <linearGradient id="sheen" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%"   stopColor="#fff" stopOpacity="0.055" />
          <stop offset="40%"  stopColor="#fff" stopOpacity="0.01"  />
          <stop offset="60%"  stopColor="#000" stopOpacity="0.0"   />
          <stop offset="100%" stopColor="#fff" stopOpacity="0.03"  />
        </linearGradient>

        {/* Radial sheen near edge */}
        <radialGradient id="edgeSheen" cx="35%" cy="30%" r="55%">
          <stop offset="0%"   stopColor="#fff" stopOpacity="0.04" />
          <stop offset="100%" stopColor="#000" stopOpacity="0"    />
        </radialGradient>

        {/* Cyber Neon Rim Gradient */}
        <linearGradient id="neonRim" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#e879f9" stopOpacity="0.5" />
          <stop offset="50%" stopColor="#c084fc" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.5" />
        </linearGradient>

        {/* Label gradient — fuchsia → purple */}
        <radialGradient id="labelGrad" cx="45%" cy="38%" r="65%">
          <stop offset="0%"   stopColor="#e879f9" />
          <stop offset="55%"  stopColor="#a855f7" />
          <stop offset="100%" stopColor="#7c3aed" />
        </radialGradient>

        {/* Label inner glow */}
        <radialGradient id="labelGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%"   stopColor="#fff" stopOpacity="0.12" />
          <stop offset="100%" stopColor="#000" stopOpacity="0"    />
        </radialGradient>
      </defs>

      {/* ── Base disc ── */}
      <circle cx={cx} cy={cy} r={248} fill="url(#rimGrad)" />

      {/* ── Groove rings ── */}
      {VINYL_GROOVES.map((g, i) => (
        <circle key={i} cx={cx} cy={cy} r={g.r}
          fill="none" stroke={g.shade} strokeWidth={g.sw} />
      ))}

      {/* ── Sheen overlays ── */}
      <circle cx={cx} cy={cy} r={248} fill="url(#sheen)" />
      <circle cx={cx} cy={cy} r={248} fill="url(#edgeSheen)" />

      {/* ── Outer rim accent & cyber neon ring ── */}
      <circle cx={cx} cy={cy} r={246} fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="3" />
      <circle cx={cx} cy={cy} r={248} fill="none" stroke="url(#neonRim)" strokeWidth="1.2" />

      {/* ── Label disc ── */}
      <circle cx={cx} cy={cy} r={74} fill="url(#labelGrad)" />
      <circle cx={cx} cy={cy} r={74} fill="url(#labelGlow)" />
      <circle cx={cx} cy={cy} r={74} fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="0.8" />

      {/* Label decoration rings */}
      <circle cx={cx} cy={cy} r={62} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="0.6" />
      <circle cx={cx} cy={cy} r={50} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="0.6" />

      {/* Label text */}
      <text x={cx} y={cy - 9} textAnchor="middle"
        fill="white" fontSize="11" fontWeight="900"
        fontFamily="system-ui, -apple-system, sans-serif"
        letterSpacing="3.5">
        JAMFLOW
      </text>
      <text x={cx} y={cy + 7} textAnchor="middle"
        fill="rgba(255,255,255,0.85)" fontSize="6.5"
        fontFamily="system-ui, -apple-system, sans-serif"
        letterSpacing="2.2">
        LISTEN TOGETHER
      </text>
      <text x={cx} y={cy + 18} textAnchor="middle"
        fill="rgba(255,255,255,0.4)" fontSize="5.5"
        fontFamily="system-ui, -apple-system, sans-serif"
        letterSpacing="1.2">
        ♫ IN PERFECT SYNC ♫
      </text>

      {/* ── Center spindle ── */}
      <circle cx={cx} cy={cy} r={7.5} fill="#060606" />
      <circle cx={cx} cy={cy} r={7.5} fill="none" stroke="#2a2a2a" strokeWidth="0.8" />
      <circle cx={cx} cy={cy} r={2.5} fill="#1a1a1a" />
    </svg>
  );
}

/* ─────────────────────────────────────────────────────────────────
   Animated equalizer bars — for side panels
───────────────────────────────────────────────────────────────── */
function EqBars({ count = 9, baseColor }: { count?: number; baseColor: string }) {
  const heights = [55, 80, 40, 100, 70, 90, 50, 75, 60];
  return (
    <div className="flex items-end gap-[3px]" style={{ height: 48 }}>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="rounded-full flex-1"
          style={{
            height: `${heights[i % heights.length]}%`,
            background: baseColor,
            animation: `eqBar 0.85s ease-in-out ${i * 0.1}s infinite alternate`,
            opacity: 0.85,
          }}
        />
      ))}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────
   Side panel — simulated 3D audio visualizer
───────────────────────────────────────────────────────────────── */
function SidePanel({ side }: { side: 'left' | 'right' }) {
  const isLeft = side === 'left';
  return (
    <div
      className="relative flex-shrink-0 rounded-2xl overflow-hidden shadow-2xl"
      style={{
        width: 195,
        height: 285,
        zIndex: 10,
        transform: `perspective(700px) rotateY(${isLeft ? 15 : -15}deg) scale(0.96)`,
        transformOrigin: isLeft ? 'right center' : 'left center',
      }}
    >
      {/* Dark gradient background */}
      <div
        className="absolute inset-0"
        style={{
          background: isLeft
            ? 'linear-gradient(145deg, #1a0b2e 0%, #0e071a 45%, #08080c 100%)'
            : 'linear-gradient(215deg, #26071d 0%, #15081c 45%, #080f18 100%)',
        }}
      />

      {/* Animated colour wash */}
      <div
        className="absolute inset-0"
        style={{
          background: isLeft
            ? 'radial-gradient(ellipse at 25% 75%, rgba(139,92,246,0.28) 0%, rgba(217,70,239,0.16) 50%, transparent 75%)'
            : 'radial-gradient(ellipse at 75% 25%, rgba(217,70,239,0.26) 0%, rgba(139,92,246,0.15) 50%, transparent 75%)',
          animation: 'panelPulse 3.5s ease-in-out infinite',
          animationDelay: isLeft ? '0s' : '1.75s',
        }}
      />

      {/* Subtle scanline texture */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.18) 2px, rgba(0,0,0,0.18) 3px)',
          opacity: 0.4,
        }}
      />

      {/* Content */}
      <div className="relative z-10 h-full flex flex-col items-center justify-between p-4">
        {/* Micro-header */}
        <div className="w-full flex items-center justify-between text-[9px] font-mono text-zinc-400 uppercase tracking-wider border-b border-white/[0.06] pb-1.5">
          <span className="flex items-center gap-1 text-zinc-300">
            <span className="w-1.5 h-1.5 rounded-full bg-fuchsia-400 animate-ping" />
            {isLeft ? 'Neural Stream' : 'Live Sync'}
          </span>
          <span className="text-emerald-400 font-bold">{isLeft ? '48kHz' : '0.0ms'}</span>
        </div>

        {/* Mini "album art" thumbnail */}
        <div
          className="w-[64px] h-[64px] rounded-xl border border-white/10 flex items-center justify-center relative overflow-hidden group shadow-lg"
          style={{
            background: isLeft
              ? 'linear-gradient(135deg, rgba(139,92,246,0.4), rgba(217,70,239,0.25))'
              : 'linear-gradient(135deg, rgba(217,70,239,0.35), rgba(139,92,246,0.25))',
            animation: 'artPulse 4s ease-in-out infinite',
            animationDelay: isLeft ? '0s' : '2s',
          }}
        >
          <Music2 className="w-6 h-6 text-fuchsia-300/80" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
        </div>

        {/* EQ bars */}
        <EqBars
          count={9}
          baseColor={isLeft
            ? 'linear-gradient(to top, #8b5cf6, #d946ef)'
            : 'linear-gradient(to top, #c084fc, #d946ef)'}
        />

        {/* Mini progress bar */}
        <div className="w-full pt-1">
          <div className="h-[3px] rounded-full bg-white/10 w-full overflow-hidden">
            <div
              className="h-full rounded-full"
              style={{
                width: '60%',
                background: 'linear-gradient(to right, #8b5cf6, #c084fc, #e879f9)',
                animation: 'progressBar 8s linear infinite',
              }}
            />
          </div>
        </div>
      </div>

      {/* Edge glow towards vinyl */}
      <div
        className="absolute inset-y-0 w-16 pointer-events-none"
        style={{
          [isLeft ? 'right' : 'left']: 0,
          background: isLeft
            ? 'linear-gradient(to right, transparent, rgba(139,92,246,0.2))'
            : 'linear-gradient(to left, transparent, rgba(217,70,239,0.2))',
        }}
      />

      {/* Frame border */}
      <div className="absolute inset-0 rounded-2xl ring-1 ring-white/[0.08] pointer-events-none" />
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────
   Floating ambient music notes — decorative ambience
───────────────────────────────────────────────────────────────── */
const NOTES = ['♪', '♫', '♬', '♩'];
const NOTE_PLACEMENTS = [
  { left: '-2%',  top: '40%', size: 20, delay: '0s',  dur: 6.2 },
  { left: '10%',  top: '76%', size: 15, delay: '1.4s', dur: 5.6 },
  { left: '89%',  top: '44%', size: 22, delay: '1.9s', dur: 6.8 },
  { left: '79%',  top: '78%', size: 14, delay: '3.1s', dur: 5.8 },
];

function AmbientNotes() {
  return (
    <div aria-hidden="true" className="absolute inset-0 -z-0 pointer-events-none">
      {NOTE_PLACEMENTS.map((p, i) => (
        <span
          key={i}
          className="absolute text-fuchsia-300/35 animate-float-note"
          style={{
            left: p.left,
            top: p.top,
            fontSize: p.size,
            animationDelay: p.delay,
            animationDuration: `${p.dur}s`,
          }}
        >
          {NOTES[i % NOTES.length]}
        </span>
      ))}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────
   "Now playing" marquee — live social strip
───────────────────────────────────────────────────────────────── */
const NOW_PLAYING_TRACKS = [
  'Daft Punk — One More Time',
  'ODESZA — A Moment Apart',
  'Tame Impala — The Less I Know the Better',
  'Porter Robinson — Shelter',
  'Fred again.. — Adore U',
  'RÜFÜS DU SOL — Innerbloom',
  'Joji — Glimpse of Us',
  'Justice — D.A.N.C.E.',
];

function TrackMarquee() {
  const row = (keyPrefix: string, hidden?: boolean) => (
    <div key={keyPrefix} aria-hidden={hidden} className="flex shrink-0 items-center">
      {NOW_PLAYING_TRACKS.map((t, i) => (
        <div key={`${keyPrefix}-${i}`} className="flex items-center gap-3 px-6 whitespace-nowrap">
          <Music2 className="w-3.5 h-3.5 text-fuchsia-400/70" />
          <span className="text-zinc-400 text-xs font-mono tracking-tight">{t}</span>
          <span className="text-zinc-700">•</span>
        </div>
      ))}
    </div>
  );

  return (
    <div className="relative z-10 w-full overflow-hidden border-y border-white/[0.06] bg-[#0A0B12] py-2 select-none flex-shrink-0">
      <div className="flex w-max marquee-track">
        {row('a')}
        {row('b', true)}
      </div>
      {/* Edge fades */}
      <div className="absolute inset-y-0 left-0 w-24 bg-gradient-to-r from-[#070709] to-transparent pointer-events-none" />
      <div className="absolute inset-y-0 right-0 w-24 bg-gradient-to-l from-[#070709] to-transparent pointer-events-none" />
      <span className="absolute left-4 top-1/2 -translate-y-1/2 hidden sm:flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 z-10">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
        <span className="text-[10px] font-mono font-semibold text-emerald-300 uppercase tracking-wider">LIVE FEED</span>
      </span>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────
   Modal — create / join room (Center popup, lightweight, calm)
───────────────────────────────────────────────────────────────── */
interface ModalProps {
  mode: 'create' | 'join';
  onClose: () => void;
  // create
  createUsername: string; setCreateUsername: (v: string) => void;
  createRoomName: string; setCreateRoomName: (v: string) => void;
  isCreating: boolean; createError: string;
  onCreateRoom: (e: React.FormEvent) => void;
  onRollCreateUsername: () => void;
  // join
  joinCode: string; setJoinCode: (v: string) => void;
  joinUsername: string; setJoinUsername: (v: string) => void;
  isJoining: boolean; joinError: string;
  onJoinRoom: (e: React.FormEvent) => void;
  onRollJoinUsername: () => void;
  onSwitchMode: (mode: 'create' | 'join') => void;
}

function Modal({
  mode, onClose,
  createUsername, setCreateUsername, createRoomName, setCreateRoomName,
  isCreating, createError, onCreateRoom, onRollCreateUsername,
  joinCode, setJoinCode, joinUsername, setJoinUsername,
  isJoining, joinError, onJoinRoom, onRollJoinUsername,
  onSwitchMode,
}: ModalProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 popup-backdrop-enter"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      {/* Panel */}
      <div
        className="relative w-full max-w-sm rounded-3xl border border-white/10 overflow-hidden popup-panel-enter shadow-2xl"
        style={{ background: '#0F101A' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#8B5CF6] via-[#A855F7] to-[#D946EF] flex items-center justify-center shadow-lg shadow-[#8B5CF6]/30">
                {mode === 'create' ? <Radio className="w-4 h-4 text-white" /> : <Users className="w-4 h-4 text-white" />}
              </div>
              <span className="text-white font-bold text-sm">
                {mode === 'create' ? 'Create a Jam Room' : 'Join a Room'}
              </span>
            </div>
            <button
              onClick={onClose}
              className="w-7 h-7 rounded-full bg-zinc-900 border border-white/5 flex items-center justify-center text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Mode toggle */}
          <div className="flex bg-zinc-900/90 rounded-xl p-1 mb-5 border border-white/5">
            <button
              onClick={() => onSwitchMode('create')}
              className={`flex-1 py-2 rounded-[10px] text-xs font-semibold transition-all ${
                mode === 'create'
                  ? 'bg-gradient-to-r from-[#8B5CF6] via-[#A855F7] to-[#D946EF] text-white shadow-lg shadow-[#8B5CF6]/20'
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              Create Room
            </button>
            <button
              onClick={() => onSwitchMode('join')}
              className={`flex-1 py-2 rounded-[10px] text-xs font-semibold transition-all ${
                mode === 'join'
                  ? 'bg-gradient-to-r from-[#8B5CF6] via-[#A855F7] to-[#D946EF] text-white shadow-lg shadow-[#8B5CF6]/20'
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              Join Room
            </button>
          </div>

          {/* Create form */}
          {mode === 'create' && (
            <form onSubmit={onCreateRoom} className="space-y-3.5">
              {/* Anime Character Nickname */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles className="w-3 h-3 text-[#C084FC]" />
                    <span>Your Anime Nickname</span>
                  </label>
                  <button
                    type="button"
                    onClick={onRollCreateUsername}
                    className="text-[11px] text-[#C084FC] hover:text-[#E879F9] flex items-center gap-1 font-medium transition-colors active:scale-95"
                    title="Roll another famous character"
                  >
                    <Shuffle className="w-3 h-3" /> Roll
                  </button>
                </div>
                <div className="relative flex items-center">
                  <input
                    type="text"
                    placeholder="Famous Anime Character"
                    required
                    value={createUsername}
                    onChange={(e) => setCreateUsername(e.target.value)}
                    className="w-full bg-zinc-950/90 border border-zinc-800 rounded-xl pl-4 pr-11 py-2.5 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-[#8B5CF6] transition-colors font-medium"
                  />
                  <button
                    type="button"
                    onClick={onRollCreateUsername}
                    className="absolute right-2.5 p-1 rounded-lg text-zinc-400 hover:text-[#C084FC] hover:bg-white/[0.05] transition-colors"
                    title="Roll another famous character"
                  >
                    <Shuffle className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Room Name */}
              <div>
                <label className="block text-[11px] font-semibold text-zinc-400 mb-1.5 uppercase tracking-wider">
                  Room Name <span className="text-zinc-600 normal-case font-normal">(optional)</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Chill Session"
                  autoFocus
                  value={createRoomName}
                  onChange={(e) => setCreateRoomName(e.target.value)}
                  className="w-full bg-zinc-950/90 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-[#8B5CF6] transition-colors"
                />

                {/* Mood Presets */}
                <div className="mt-2.5">
                  <span className="text-[10px] text-zinc-500 font-mono uppercase tracking-wider block mb-1.5">
                    Tap to pick mood:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {ROOM_NAME_SUGGESTIONS.map((item) => {
                      const isSelected = createRoomName.toLowerCase() === item.name.toLowerCase();
                      return (
                        <button
                          key={item.name}
                          type="button"
                          onClick={() => setCreateRoomName(item.name)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-all active:scale-95 flex items-center gap-1 ${
                            isSelected
                              ? 'bg-[#8B5CF6]/30 border-[#8B5CF6] text-white shadow-sm shadow-[#8B5CF6]/30'
                              : 'bg-white/[0.04] border-white/[0.06] text-zinc-400 hover:text-zinc-200 hover:border-white/15'
                          }`}
                        >
                          <span>{item.emoji}</span>
                          <span>{item.name}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {createError && <p className="text-xs text-rose-400">{createError}</p>}
              <button
                type="submit"
                disabled={isCreating}
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-[#8B5CF6] via-[#A855F7] to-[#D946EF] hover:opacity-95 text-white font-semibold text-sm shadow-lg shadow-[#8B5CF6]/35 flex items-center justify-center gap-2 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 mt-1"
              >
                {isCreating
                  ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  : <><span>Launch Jam Space</span><ArrowRight className="w-4 h-4" /></>}
              </button>
            </form>
          )}

          {/* Join form */}
          {mode === 'join' && (
            <form onSubmit={onJoinRoom} className="space-y-3.5">
              <div>
                <label className="block text-[11px] font-semibold text-zinc-400 mb-1.5 uppercase tracking-wider">
                  Room Code
                </label>
                <input
                  type="text"
                  placeholder="5-character code"
                  required
                  autoFocus
                  maxLength={5}
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.replace(/[^a-zA-Z0-9]/g, '').slice(0, 5).toUpperCase())}
                  className="w-full uppercase font-mono tracking-widest bg-zinc-950/90 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-[#8B5CF6] transition-colors"
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles className="w-3 h-3 text-[#C084FC]" />
                    <span>Your Anime Nickname</span>
                  </label>
                  <button
                    type="button"
                    onClick={onRollJoinUsername}
                    className="text-[11px] text-[#C084FC] hover:text-[#E879F9] flex items-center gap-1 font-medium transition-colors active:scale-95"
                    title="Roll another famous character"
                  >
                    <Shuffle className="w-3 h-3" /> Roll
                  </button>
                </div>
                <div className="relative flex items-center">
                  <input
                    type="text"
                    placeholder="Famous Anime Character"
                    required
                    value={joinUsername}
                    onChange={(e) => setJoinUsername(e.target.value)}
                    className="w-full bg-zinc-950/90 border border-zinc-800 rounded-xl pl-4 pr-11 py-2.5 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-[#8B5CF6] transition-colors font-medium"
                  />
                  <button
                    type="button"
                    onClick={onRollJoinUsername}
                    className="absolute right-2.5 p-1 rounded-lg text-zinc-400 hover:text-[#C084FC] hover:bg-white/[0.05] transition-colors"
                    title="Roll another famous character"
                  >
                    <Shuffle className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
              {joinError && <p className="text-xs text-rose-400">{joinError}</p>}
              <button
                type="submit"
                disabled={isJoining}
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-[#8B5CF6] via-[#A855F7] to-[#D946EF] hover:opacity-95 text-white font-semibold text-sm border border-[#C084FC]/30 shadow-lg shadow-[#8B5CF6]/25 flex items-center justify-center gap-2 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 mt-1"
              >
                {isJoining
                  ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  : <><span>Connect to Room</span><ArrowRight className="w-4 h-4" /></>}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────
   Page
───────────────────────────────────────────────────────────────── */
export default function HomePage() {
  const router = useRouter();

  const [createUsername, setCreateUsername] = useState('');
  const [createRoomName, setCreateRoomName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState('');

  const [joinCode, setJoinCode] = useState('');
  const [joinUsername, setJoinUsername] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  const [joinError, setJoinError] = useState('');

  const [showModal, setShowModal] = useState<'create' | 'join' | null>(null);

  React.useEffect(() => {
    setCreateUsername(getRandomAnimeName());
    setJoinUsername(getRandomAnimeName());
  }, []);

  const handleQuickCreate = (presetName: string) => {
    const user = createUsername.trim() || getRandomAnimeName();
    if (!createUsername.trim()) setCreateUsername(user);
    setCreateRoomName(presetName);
    setIsCreating(true);
    setCreateError('');
    const socket = getSocket();
    socket.emit('room:create', { username: user, roomName: presetName }, (res) => {
      setIsCreating(false);
      if (res.success && res.roomId) {
        sessionStorage.setItem('jamflow_username', user);
        router.push(`/${res.roomId}`);
      } else {
        setCreateError(res.error || 'Failed to create room');
        setShowModal('create');
      }
    });
  };

  const handleCreateRoom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!createUsername.trim()) { setCreateError('Please choose a username'); return; }
    setIsCreating(true);
    setCreateError('');
    const socket = getSocket();
    socket.emit('room:create', { username: createUsername.trim(), roomName: createRoomName.trim() }, (res) => {
      setIsCreating(false);
      if (res.success && res.roomId) {
        sessionStorage.setItem('jamflow_username', createUsername.trim());
        router.push(`/${res.roomId}`);
      } else {
        setCreateError(res.error || 'Failed to create room');
      }
    });
  };

  const handleJoinRoom = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = joinCode.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    if (!cleanCode) { setJoinError('Please enter a room code'); return; }
    if (!/^[A-Z0-9]{5}$/.test(cleanCode)) { setJoinError('Room codes are exactly 5 letters or numbers'); return; }
    if (!joinUsername.trim()) { setJoinError('Please choose a username'); return; }
    setIsJoining(true);
    setJoinError('');
    sessionStorage.setItem('jamflow_username', joinUsername.trim());
    router.push(`/${cleanCode}`);
  };

  return (
    <main className="relative min-h-screen lg:h-screen lg:max-h-screen lg:overflow-hidden bg-[#0A0B12] overflow-x-hidden flex flex-col justify-between select-none">

      {/* ── Ambient glows (Lightweight GPU radial gradients) ──────────── */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed"
        style={{
          top: '-120px', left: '50%', transform: 'translateX(-50%)',
          width: '950px', height: '550px',
          background: 'radial-gradient(ellipse at top, rgba(139,92,246,0.22) 0%, rgba(217,70,239,0.10) 40%, transparent 70%)',
          zIndex: 0,
        }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none fixed"
        style={{
          bottom: '-60px', right: '-120px',
          width: '650px', height: '500px',
          background: 'radial-gradient(ellipse at bottom-right, rgba(217,70,239,0.12) 0%, rgba(139,92,246,0.08) 50%, transparent 70%)',
          zIndex: 0,
        }}
      />

      {/* ── Header ─────────── */}
      <header className="relative z-20 h-20 sm:h-22 flex items-center justify-between px-6 sm:px-10 lg:px-14 flex-shrink-0 border-b border-white/[0.08] bg-[#0A0B14]/90 shadow-[0_4px_24px_rgba(0,0,0,0.3)]">
        <div className="flex items-center gap-3.5">
          <div className="relative w-9 h-9 rounded-2xl bg-gradient-to-tr from-[#8B5CF6] via-[#A855F7] to-[#D946EF] flex items-center justify-center shadow-[0_0_20px_rgba(139,92,246,0.45)] p-[1px]">
            <div className="w-full h-full bg-[#0A0B12] rounded-[15px] flex items-center justify-center">
              <Radio className="w-4.5 h-4.5 text-white" />
            </div>
          </div>
          <div>
            <h1 className="text-base sm:text-lg font-black tracking-tight text-white leading-none flex items-center gap-1.5">
              Jam<span className="text-transparent bg-clip-text bg-gradient-to-r from-[#C084FC] via-[#E879F9] to-[#F472B6]">Flow</span>
            </h1>
            <p className="text-[9px] font-mono tracking-widest text-zinc-400 uppercase leading-none mt-1">
              Synchronized Listening
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/[0.05] border border-white/[0.08] shadow-lg shadow-black/30">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_#34d399]" />
          <span className="text-xs font-mono font-medium text-zinc-200">Live Sync</span>
          <span className="hidden sm:inline text-zinc-600 font-mono text-[10px]">|</span>
          <span className="hidden sm:inline text-[11px] font-mono text-emerald-400 font-bold">&lt;1ms</span>
        </div>
      </header>

      {/* ── Hero ────────────────────────────────────────────────────────── */}
      <div className="relative z-10 flex-1 min-h-0 flex items-center justify-center px-6 sm:px-10 lg:px-14 py-2 lg:py-0 w-full max-w-7xl mx-auto">
        <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">

          {/* Left Column: Punchy Headline & Actions */}
          <div className="order-2 lg:order-1 lg:col-span-7 flex flex-col items-center lg:items-start text-center lg:text-left z-20">
            {/* Pill */}
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#8B5CF6]/15 border border-[#8B5CF6]/30 mb-4 shadow-[0_0_15px_rgba(139,92,246,0.15)]">
              <Sparkles className="w-3.5 h-3.5 text-[#C084FC] animate-pulse" />
              <span className="text-[11px] font-mono font-semibold tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-[#C084FC] via-[#E879F9] to-[#F472B6] uppercase">
                AI Synchronized Stream
              </span>
            </div>

            {/* Headline */}
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight leading-[1.08]">
              Listen together,
              <br />
              <span
                className="bg-clip-text text-transparent bg-gradient-to-r from-[#A78BFA] via-[#E879F9] to-[#F472B6]"
                style={{ filter: 'drop-shadow(0 0 35px rgba(139,92,246,0.4))' }}
              >
                in perfect sync.
              </span>
            </h2>

            {/* Subtitle — short & punchy */}
            <p className="mt-3.5 text-zinc-400 text-sm sm:text-base max-w-md leading-relaxed">
              Drop any YouTube link and experience music together in millisecond harmony — zero drift, video toggle, pure sync.
            </p>

            {/* Action Section: CTAs + One-Tap Quick Launch Dock */}
            <div className="mt-6 flex flex-col gap-3.5 w-full max-w-lg">
              {/* Primary Buttons */}
              <div className="flex flex-col sm:flex-row items-center gap-3 w-full">
                <button
                  onClick={() => setShowModal('create')}
                  className="group relative overflow-hidden w-full sm:flex-1 px-6 py-3 rounded-2xl bg-gradient-to-r from-[#8B5CF6] via-[#A855F7] to-[#D946EF] text-white font-semibold text-sm shadow-[0_0_25px_rgba(139,92,246,0.35)] hover:shadow-[0_0_35px_rgba(217,70,239,0.5)] flex items-center justify-center gap-2.5 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-out" />
                  <Radio className="w-4 h-4 text-white" />
                  <span className="relative tracking-wide">Start Jamming</span>
                  <ArrowRight className="relative w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </button>

                <button
                  onClick={() => setShowModal('join')}
                  className="group relative w-full sm:w-auto px-6 py-3 rounded-2xl bg-zinc-950/80 hover:bg-zinc-900 text-zinc-200 hover:text-white font-semibold text-sm border border-zinc-700/80 hover:border-[#8B5CF6]/60 flex items-center justify-center gap-2.5 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-black/40"
                >
                  <Users className="w-4 h-4 text-zinc-400 group-hover:text-[#C084FC] transition-colors" />
                  <span>Join a Room</span>
                </button>
              </div>

              {/* Professional Instant Quick Launch Dock */}
              <div className="p-2 sm:p-2.5 rounded-2xl bg-[#0F101A]/85 border border-white/[0.08] backdrop-blur-xl shadow-xl shadow-black/40">
                <div className="flex items-center justify-between px-1.5 pb-2 mb-1.5 border-b border-white/[0.05]">
                  <div className="flex items-center gap-1.5">
                    <Sparkles className="w-3 h-3 text-[#C084FC]" />
                    <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-400">
                      Quick Rooms
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] text-zinc-500 font-mono">as</span>
                    <button
                      type="button"
                      onClick={() => setCreateUsername(getRandomAnimeName())}
                      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.06] text-[10px] font-mono font-semibold text-[#C084FC] hover:text-white transition-all active:scale-95"
                      title="Roll another anime character"
                    >
                      <span>{createUsername || 'Hero'}</span>
                      <Shuffle className="w-2.5 h-2.5 opacity-60" />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
                  {ROOM_NAME_SUGGESTIONS.map((s) => (
                    <button
                      key={s.name}
                      type="button"
                      onClick={() => handleQuickCreate(s.name)}
                      disabled={isCreating}
                      className="group flex flex-col items-center justify-center py-2 px-1 rounded-xl bg-white/[0.025] hover:bg-gradient-to-b hover:from-[#8B5CF6]/20 hover:to-transparent border border-white/[0.04] hover:border-[#8B5CF6]/40 transition-all duration-200 active:scale-95 text-center disabled:opacity-50"
                    >
                      <span className="text-base sm:text-lg mb-0.5 group-hover:scale-110 transition-transform">
                        {s.emoji}
                      </span>
                      <span className="text-[11px] font-medium text-zinc-300 group-hover:text-white truncate max-w-full">
                        {s.name}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Clean metrics row — concise & minimal */}
            <div className="mt-8 flex items-center gap-6 sm:gap-8 border-t border-white/[0.08] pt-5 w-full max-w-md justify-center lg:justify-start">
              <div>
                <div className="text-base font-bold text-white tracking-tight">0 ms</div>
                <div className="text-[11px] text-zinc-500 font-mono">Sync drift</div>
              </div>
              <div className="w-[1px] h-6 bg-zinc-800" />
              <div>
                <div className="text-base font-bold text-white tracking-tight">Lossless</div>
                <div className="text-[11px] text-zinc-500 font-mono">YouTube stream</div>
              </div>
              <div className="w-[1px] h-6 bg-zinc-800" />
              <div>
                <div className="text-base font-bold text-white tracking-tight">∞</div >
                <div className="text-[11px] text-zinc-500 font-mono">Listeners</div>
              </div>
            </div>
          </div>

          {/* Right Column: Holographic Vinyl & 3D Visualizer Showcase */}
          <div className="order-1 lg:order-2 lg:col-span-5 flex items-center justify-center relative">
            <div className="relative flex items-center justify-center w-full my-auto py-2 scale-[0.82] sm:scale-95 lg:scale-[0.88] xl:scale-100 origin-center">

              {/* Ambient background aura */}
              <div
                aria-hidden="true"
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none"
                style={{
                  width: '440px',
                  height: '440px',
                  background: 'radial-gradient(circle, rgba(139,92,246,0.22) 0%, rgba(217,70,239,0.12) 45%, transparent 70%)',
                  filter: 'blur(32px)',
                  zIndex: 0,
                }}
              />

              {/* Outer cybernetic orbital ring with dashed strokes */}
              <div
                className="absolute top-1/2 left-1/2 rounded-full pointer-events-none hidden lg:block"
                style={{
                  width: '450px',
                  height: '450px',
                  border: '1px dashed rgba(139,92,246,0.3)',
                  animation: 'orbitCw 40s linear infinite',
                  zIndex: 1,
                }}
              >
                {/* Glowing violet orbital beacon */}
                <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-[#8B5CF6] shadow-[0_0_12px_#8B5CF6]" />
              </div>

              {/* Inner counter-rotating cyber ring */}
              <div
                className="absolute top-1/2 left-1/2 rounded-full pointer-events-none hidden lg:block"
                style={{
                  width: '390px',
                  height: '390px',
                  border: '1px solid rgba(217,70,239,0.25)',
                  animation: 'orbitCcw 30s linear infinite',
                  zIndex: 1,
                }}
              >
                {/* Glowing fuchsia orbital beacon */}
                <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-fuchsia-400 shadow-[0_0_12px_#d946ef]" />
              </div>

              {/* Floating ambient musical notes */}
              <AmbientNotes />

              {/* Left 3D side panel */}
              <div className="hidden lg:block transition-transform hover:scale-105 duration-300" style={{ marginRight: -72, zIndex: 10 }}>
                <SidePanel side="left" />
              </div>

              {/* Center Spinning Vinyl */}
              <div
                className="relative flex-shrink-0"
                style={{
                  width: 'min(330px, 75vw)',
                  aspectRatio: '1/1',
                  zIndex: 20,
                }}
              >
                {/* Static soft ambient GPU glow */}
                <div className="absolute inset-1 rounded-full bg-gradient-to-tr from-[#8B5CF6]/20 to-[#D946EF]/20 blur-xl pointer-events-none transform-gpu scale-95" />
                <div className="w-full h-full vinyl-spin transform-gpu">
                  <VinylRecord />
                </div>
              </div>

              {/* Right 3D side panel */}
              <div className="hidden lg:block transition-transform hover:scale-105 duration-300" style={{ marginLeft: -72, zIndex: 10 }}>
                <SidePanel side="right" />
              </div>

            </div>
          </div>

        </div>
      </div>

      {/* ── Now playing marquee ───────────────────────────────────────── */}
      <TrackMarquee />

      {/* ── Footer ──────────────────────────────────────────────────────── */}
      <footer className="relative z-10 text-center py-2 text-xs text-zinc-600 border-t border-zinc-900/60 flex-shrink-0">
        JamFlow — Real-Time Collaborative YouTube Listening
      </footer>

      {/* ── Modal ───────────────────────────────────────────────────────── */}
      {showModal && (
        <Modal
          mode={showModal}
          onClose={() => setShowModal(null)}
          onSwitchMode={(m) => setShowModal(m)}
          createUsername={createUsername} setCreateUsername={setCreateUsername}
          createRoomName={createRoomName} setCreateRoomName={setCreateRoomName}
          isCreating={isCreating} createError={createError} onCreateRoom={handleCreateRoom}
          onRollCreateUsername={() => setCreateUsername(getRandomAnimeName())}
          joinCode={joinCode} setJoinCode={setJoinCode}
          joinUsername={joinUsername} setJoinUsername={setJoinUsername}
          isJoining={isJoining} joinError={joinError} onJoinRoom={handleJoinRoom}
          onRollJoinUsername={() => setJoinUsername(getRandomAnimeName())}
        />
      )}

      {/* ── Keyframe animations ─────────────────────────────────────────── */}
      <style jsx global>{`
        @keyframes vinylSpin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        .vinyl-spin {
          animation: vinylSpin 14s linear infinite;
          will-change: transform;
        }

        @keyframes orbitCw {
          from { transform: translate(-50%, -50%) rotate(0deg); }
          to   { transform: translate(-50%, -50%) rotate(360deg); }
        }
        @keyframes orbitCcw {
          from { transform: translate(-50%, -50%) rotate(0deg); }
          to   { transform: translate(-50%, -50%) rotate(-360deg); }
        }

        @keyframes eqBar {
          from { transform: scaleY(0.35); opacity: 0.5; }
          to   { transform: scaleY(1);    opacity: 1;   }
        }

        @keyframes panelPulse {
          0%, 100% { opacity: 0.65; }
          50%       { opacity: 1;    }
        }

        @keyframes artPulse {
          0%, 100% { filter: brightness(0.9); }
          50%      { filter: brightness(1.2); }
        }

        @keyframes progressBar {
          0%   { width: 0%; }
          100% { width: 100%; }
        }


        /* ── Hero ambience ── */
        @keyframes floatNote {
          0%   { transform: translateY(26px) translateX(0)  rotate(-6deg); opacity: 0; }
          15%  { opacity: 0.85; }
          75%  { opacity: 0.55; }
          100% { transform: translateY(-150px) translateX(16px) rotate(8deg); opacity: 0; }
        }
        .animate-float-note {
          animation: floatNote 6s ease-in-out infinite;
        }


        @keyframes marquee {
          from { transform: translateX(0); }
          to   { transform: translateX(-50%); }
        }
        .marquee-track {
          animation: marquee 30s linear infinite;
        }
        .marquee-track:hover {
          animation-play-state: paused;
        }

        @media (max-height: 680px) and (min-width: 1024px) {
          main {
            height: auto !important;
            max-height: none !important;
            overflow-y: auto !important;
          }
        }
      `}</style>
    </main>
  );
}
