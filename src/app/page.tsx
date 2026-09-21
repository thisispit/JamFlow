'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Radio,
  Headphones,
  Users,
  Sparkles,
  ArrowRight,
  Music,
  Zap,
  ShieldCheck,
  Flame,
} from 'lucide-react';
import { getSocket } from '@/lib/socket';

export default function HomePage() {
  const router = useRouter();

  // Create Room state
  const [createUsername, setCreateUsername] = useState('');
  const [createRoomName, setCreateRoomName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState('');

  // Join Room state
  const [joinCode, setJoinCode] = useState('');
  const [joinUsername, setJoinUsername] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  const [joinError, setJoinError] = useState('');

  const handleCreateRoom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!createUsername.trim()) {
      setCreateError('Please choose a username');
      return;
    }

    setIsCreating(true);
    setCreateError('');

    const socket = getSocket();
    socket.emit(
      'room:create',
      { username: createUsername.trim(), roomName: createRoomName.trim() },
      (res) => {
        setIsCreating(false);
        if (res.success && res.roomId) {
          sessionStorage.setItem('jamflow_username', createUsername.trim());
          router.push(`/room/${res.roomId}`);
        } else {
          setCreateError(res.error || 'Failed to create room');
        }
      }
    );
  };

  const handleJoinRoom = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = joinCode.trim().toUpperCase();
    if (!cleanCode) {
      setJoinError('Please enter a room code');
      return;
    }
    if (!joinUsername.trim()) {
      setJoinError('Please choose a username');
      return;
    }

    setIsJoining(true);
    setJoinError('');

    sessionStorage.setItem('jamflow_username', joinUsername.trim());
    router.push(`/room/${cleanCode}`);
  };

  return (
    <main className="min-h-screen relative overflow-hidden bg-gradient-to-b from-zinc-950 via-zinc-900 to-zinc-950 flex flex-col justify-between">
      {/* Background glow effects */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[750px] h-[380px] bg-fuchsia-600/15 blur-[120px] pointer-events-none rounded-full" />
      <div className="absolute bottom-10 right-10 w-[450px] h-[300px] bg-purple-600/10 blur-[130px] pointer-events-none rounded-full" />

      {/* Navigation Header */}
      <header className="relative z-10 w-full max-w-6xl mx-auto px-6 py-8 flex items-center justify-between">
        <div className="flex items-center gap-2.5 group cursor-pointer">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-fuchsia-600 to-purple-500 p-0.5 shadow-lg shadow-fuchsia-500/20 group-hover:scale-105 transition-transform">
            <div className="w-full h-full bg-zinc-950 rounded-[10px] flex items-center justify-center text-fuchsia-400">
              <Radio className="w-5 h-5 animate-pulse" />
            </div>
          </div>
          <div>
            <h1 className="text-xl font-black tracking-tight text-white flex items-center gap-1.5">
              Jam<span className="text-fuchsia-500">Flow</span>
            </h1>
            <p className="text-[10px] text-zinc-400 font-mono tracking-wider uppercase">
              Synchronized Listening
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="hidden sm:inline-flex items-center gap-1.5 text-xs text-zinc-400 bg-zinc-900/80 border border-zinc-800 px-3 py-1.5 rounded-full backdrop-blur-md">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            Live Sync Ready
          </span>
        </div>
      </header>

      {/* Hero & Interactive Entry Forms */}
      <section className="relative z-10 w-full max-w-6xl mx-auto px-6 py-6 sm:py-12 flex flex-col lg:flex-row items-center gap-12 lg:gap-16">
        {/* Left Hero Pitch */}
        <div className="flex-1 text-center lg:text-left space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-fuchsia-500/10 border border-fuchsia-500/20 text-fuchsia-300 text-xs font-medium">
            <Sparkles className="w-3.5 h-3.5 text-fuchsia-400" /> Real-time collaborative music rooms
          </div>

          <h2 className="text-4xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight leading-[1.15]">
            Listen together, <br />
            <span className="bg-gradient-to-r from-fuchsia-400 via-purple-400 to-indigo-400 bg-clip-text text-transparent">
              in perfect sync.
            </span>
          </h2>

          <p className="text-zinc-400 text-base sm:text-lg max-w-xl mx-auto lg:mx-0 leading-relaxed">
            Create temporary listening rooms with your friends. Queue YouTube tracks, vote to skip,
            chat, and experience synchronized playback with millisecond drift correction.
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-w-lg mx-auto lg:mx-0 pt-2">
            <div className="p-3 rounded-xl bg-zinc-900/50 border border-zinc-800/80 text-left">
              <Zap className="w-4 h-4 text-amber-400 mb-1" />
              <div className="text-xs font-bold text-zinc-200">Zero Drift</div>
              <div className="text-[11px] text-zinc-500">Auto drift compensation</div>
            </div>
            <div className="p-3 rounded-xl bg-zinc-900/50 border border-zinc-800/80 text-left">
              <ShieldCheck className="w-4 h-4 text-emerald-400 mb-1" />
              <div className="text-xs font-bold text-zinc-200">100% Compliant</div>
              <div className="text-[11px] text-zinc-500">Official YouTube IFrame</div>
            </div>
            <div className="p-3 rounded-xl bg-zinc-900/50 border border-zinc-800/80 text-left col-span-2 sm:col-span-1">
              <Flame className="w-4 h-4 text-fuchsia-400 mb-1" />
              <div className="text-xs font-bold text-zinc-200">Live Reactions</div>
              <div className="text-[11px] text-zinc-500">Floating emoji bursts</div>
            </div>
          </div>
        </div>

        {/* Right Cards: Create or Join Room */}
        <div className="w-full max-w-md space-y-6">
          {/* Create Room Card */}
          <div className="p-6 sm:p-7 rounded-3xl bg-zinc-900/80 backdrop-blur-2xl border border-zinc-800 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-fuchsia-500/10 rounded-full blur-2xl pointer-events-none" />

            <div className="flex items-center gap-3 mb-5">
              <div className="p-2.5 rounded-xl bg-fuchsia-500/20 text-fuchsia-400 border border-fuchsia-500/30">
                <Music className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Create a Jam Room</h3>
                <p className="text-xs text-zinc-400">Be the host and invite listeners</p>
              </div>
            </div>

            <form onSubmit={handleCreateRoom} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                  Your Username
                </label>
                <input
                  type="text"
                  placeholder="e.g. Alex"
                  required
                  value={createUsername}
                  onChange={(e) => setCreateUsername(e.target.value)}
                  className="w-full bg-zinc-950/80 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-fuchsia-500 transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                  Room Name <span className="text-zinc-500 font-normal">(Optional)</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Synthwave Study Session"
                  value={createRoomName}
                  onChange={(e) => setCreateRoomName(e.target.value)}
                  className="w-full bg-zinc-950/80 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-fuchsia-500 transition-colors"
                />
              </div>

              {createError && <p className="text-xs text-rose-400">{createError}</p>}

              <button
                type="submit"
                disabled={isCreating}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-fuchsia-600 to-purple-600 hover:from-fuchsia-500 hover:to-purple-500 text-white font-semibold text-sm shadow-lg shadow-fuchsia-600/25 flex items-center justify-center gap-2 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 cursor-pointer"
              >
                {isCreating ? (
                  <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <span>Start Jamming</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Join Room Card */}
          <div className="p-6 rounded-3xl bg-zinc-900/50 backdrop-blur-xl border border-zinc-800/80 shadow-xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 rounded-xl bg-zinc-800 text-zinc-300 border border-zinc-700/60">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Join an Existing Room</h3>
                <p className="text-xs text-zinc-400">Enter a room code or link</p>
              </div>
            </div>

            <form onSubmit={handleJoinRoom} className="space-y-3">
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Code: JAM-XXXX"
                  required
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                  className="w-1/2 uppercase font-mono tracking-wider bg-zinc-950/80 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-fuchsia-500"
                />
                <input
                  type="text"
                  placeholder="Your Name"
                  required
                  value={joinUsername}
                  onChange={(e) => setJoinUsername(e.target.value)}
                  className="w-1/2 bg-zinc-950/80 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-fuchsia-500"
                />
              </div>

              {joinError && <p className="text-xs text-rose-400">{joinError}</p>}

              <button
                type="submit"
                disabled={isJoining}
                className="w-full py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 hover:text-white font-medium text-xs border border-zinc-700/80 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Join Room</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </form>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-zinc-800/80 py-6 text-center text-xs text-zinc-500">
        <p>JamFlow — Real-Time Collaborative YouTube Listening Platform</p>
      </footer>
    </main>
  );
}
