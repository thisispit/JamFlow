'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Radio, Share2, Check, LogOut, Crown, Copy,
  AlertCircle, ListMusic, MessageSquare, MessageCircle, Send,
  Settings, X, Users, ChevronDown, ChevronUp,
} from 'lucide-react';
import confetti from 'canvas-confetti';

import { getSocket } from '@/lib/socket';
import { Room, User, Track, Reaction, PlaybackState, RoomSettings } from '@/types';
import { YouTubePlayer } from '@/components/YouTubePlayer';
import { YouTubeInput } from '@/components/YouTubeInput';
import { QueueList } from '@/components/QueueList';
import { ChatAndReactions } from '@/components/ChatAndReactions';
import { FloatingReactions } from '@/components/FloatingReactions';
import { getRandomDemonSlayerName } from '@/lib/animeNames';

export default function RoomPage() {
  const params = useParams();
  const router = useRouter();
  const roomId = (params.id as string)?.toUpperCase();

  const [username, setUsername] = useState('');
  const [hasPromptedUser, setHasPromptedUser] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [room, setRoom] = useState<Room | null>(null);
  const [reactions, setReactions] = useState<Reaction[]>([]);
  const [copiedField, setCopiedField] = useState<'link' | 'code' | null>(null);
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [isListenersOpen, setIsListenersOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isAndroid, setIsAndroid] = useState(false);
  const [hasNativeShare, setHasNativeShare] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Tab: 'queue' | 'chat'
  const [activeTab, setActiveTab] = useState<'queue' | 'chat'>('queue');
  const [unreadChatCount, setUnreadChatCount] = useState(0);
  const activeTabRef = useRef<'queue' | 'chat'>('queue');
  const addTrackInputRef = useRef<HTMLInputElement>(null);
  const [isMobilePanelExpanded, setIsMobilePanelExpanded] = useState(false);
  const touchStartYRef = useRef<number | null>(null);

  const switchTab = (tab: 'queue' | 'chat') => {
    setActiveTab(tab);
    activeTabRef.current = tab;
    if (tab === 'chat') setUnreadChatCount(0);
  };

  const handleMobileTabClick = (tab: 'queue' | 'chat') => {
    switchTab(tab);
    setIsMobilePanelExpanded(true);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartYRef.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e: React.TouchEvent, forExpanded: boolean) => {
    if (touchStartYRef.current === null) return;
    const touchEndY = e.changedTouches[0].clientY;
    const diffY = touchEndY - touchStartYRef.current;
    touchStartYRef.current = null;

    // Drag up on collapsed header -> expand
    if (!forExpanded && diffY < -30) {
      setIsMobilePanelExpanded(true);
    }
    // Drag down on expanded header -> collapse
    else if (forExpanded && diffY > 30) {
      setIsMobilePanelExpanded(false);
    }
  };

  const [playbackState, setPlaybackState] = useState<PlaybackState>('paused');
  const [serverPosition, setServerPosition] = useState(0);
  const [lastSyncTimestamp, setLastSyncTimestamp] = useState(Date.now());
  const [isMobile, setIsMobile] = useState<boolean | null>(null);

  useEffect(() => {
    if (typeof navigator !== 'undefined') {
      setIsAndroid(/android/i.test(navigator.userAgent));
      setHasNativeShare(typeof navigator.share === 'function');
    }
  }, []);

  useEffect(() => {
    const mql = window.matchMedia('(max-width: 1023px)');
    setIsMobile(mql.matches);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, []);

  useEffect(() => {
    const saved = sessionStorage.getItem('jamflow_username');
    setUsername(saved || getRandomDemonSlayerName());
    if (saved) setHasPromptedUser(true);
    else { setHasPromptedUser(false); setIsLoading(false); }
  }, []);

  const joinRoomWithUser = useCallback((name: string) => {
    if (!roomId || !name) return;
    setIsLoading(true);
    setErrorMessage(null);
    const socket = getSocket();
    socket.emit('room:join', { roomId, username: name }, (res) => {
      setIsLoading(false);
      if (res.success && res.room && res.user) {
        setRoom(res.room);
        setCurrentUser(res.user);
        setPlaybackState(res.room.playbackState);
        setServerPosition(res.room.position);
        setLastSyncTimestamp(res.room.lastSyncTimestamp);
        sessionStorage.setItem('jamflow_username', name);
      } else {
        setErrorMessage(res.error || 'Failed to join room');
      }
    });
  }, [roomId]);

  useEffect(() => {
    if (hasPromptedUser && username && roomId) joinRoomWithUser(username);
  }, [hasPromptedUser, username, roomId, joinRoomWithUser]);

  useEffect(() => {
    const socket = getSocket();

    const handleRoomState = (r: Room) => {
      setRoom(r); setPlaybackState(r.playbackState);
      setServerPosition(r.position); setLastSyncTimestamp(r.lastSyncTimestamp);
      const me = r.users.find(u => u.id === socket.id);
      if (me) setCurrentUser(me);
    };
    const handleUserJoined = (u: User) => setRoom(p => {
      if (!p || p.users.some(x => x.id === u.id)) return p;
      return { ...p, users: [...p.users, u] };
    });
    const handleUserLeft = (d: { userId: string; username: string; newHostId?: string }) => {
      setRoom(p => {
        if (!p) return null;
        const users = p.users.filter(u => u.id !== d.userId);
        let hostId = p.hostId;
        if (d.newHostId) { hostId = d.newHostId; users.forEach(u => { u.isHost = u.id === d.newHostId; if (u.isHost) u.isDJ = true; }); }
        return { ...p, hostId, users };
      });
      if (d.newHostId && socket.id === d.newHostId) setCurrentUser(p => p ? { ...p, isHost: true, isDJ: true } : null);
    };
    const handleHostChanged = (d: { hostId: string; hostUsername: string }) => {
      setRoom(p => {
        if (!p) return null;
        const users = p.users.map(u => ({ ...u, isHost: u.id === d.hostId, isDJ: u.id === d.hostId ? true : u.isDJ }));
        return { ...p, hostId: d.hostId, users };
      });
      if (socket.id === d.hostId) setCurrentUser(p => p ? { ...p, isHost: true, isDJ: true } : null);
    };
    const handleSettingsUpdated = (s: RoomSettings) => setRoom(p => p ? { ...p, settings: s } : null);
    const handlePlaybackSync = (d: { currentTrack: Track | null; playbackState: PlaybackState; position: number; timestamp: number }) => {
      setRoom(p => p ? { ...p, currentTrack: d.currentTrack } : null);
      setPlaybackState(d.playbackState); setServerPosition(d.position); setLastSyncTimestamp(d.timestamp);
    };
    const handlePlayEvent = (d: { position: number; timestamp: number }) => { setPlaybackState('playing'); setServerPosition(d.position); setLastSyncTimestamp(d.timestamp); };
    const handlePauseEvent = (d: { position: number; timestamp: number }) => { setPlaybackState('paused'); setServerPosition(d.position); setLastSyncTimestamp(d.timestamp); };
    const handleSeekEvent = (d: { position: number; timestamp: number }) => { setServerPosition(d.position); setLastSyncTimestamp(d.timestamp); };
    const handleQueueUpdated = (queue: Track[]) => setRoom(p => p ? { ...p, queue } : null);
    const handleTrackStarted = (track: Track | null) => { setRoom(p => p ? { ...p, currentTrack: track } : null); setPlaybackState('playing'); setServerPosition(0); setLastSyncTimestamp(Date.now()); };
    const handleVoteSkipUpdated = (vs: Room['voteSkip']) => setRoom(p => p ? { ...p, voteSkip: vs } : null);
    const handleChat = (msg: any) => {
      setRoom(p => {
        if (!p || p.chat.some(m => m.id === msg.id)) return p;
        return { ...p, chat: [...p.chat.slice(-99), msg] };
      });
      if (activeTabRef.current !== 'chat' && !msg.isSystem) setUnreadChatCount(c => c + 1);
      if (msg.isSystem && msg.content.includes('Vote to skip passed')) {
        try { confetti({ particleCount: 50, spread: 60, origin: { y: 0.7 } }); } catch {}
      }
    };
    const handleReaction = (r: Reaction) => setReactions(p => [...p.slice(-15), r]);
    const handleError = (d: { message: string }) => { setErrorMessage(d.message); setTimeout(() => setErrorMessage(null), 4000); };

    socket.on('room:state', handleRoomState);
    socket.on('room:user_joined', handleUserJoined);
    socket.on('room:user_left', handleUserLeft);
    socket.on('room:host_changed', handleHostChanged);
    socket.on('room:settings_updated', handleSettingsUpdated);
    socket.on('playback:sync', handlePlaybackSync);
    socket.on('playback:play', handlePlayEvent);
    socket.on('playback:pause', handlePauseEvent);
    socket.on('playback:seek', handleSeekEvent);
    socket.on('queue:updated', handleQueueUpdated);
    socket.on('queue:track_started', handleTrackStarted);
    socket.on('queue:vote_skip_updated', handleVoteSkipUpdated);
    socket.on('chat:new_message', handleChat);
    socket.on('reaction:new', handleReaction);
    socket.on('error:notification', handleError);

    return () => {
      socket.off('room:state', handleRoomState);
      socket.off('room:user_joined', handleUserJoined);
      socket.off('room:user_left', handleUserLeft);
      socket.off('room:host_changed', handleHostChanged);
      socket.off('room:settings_updated', handleSettingsUpdated);
      socket.off('playback:sync', handlePlaybackSync);
      socket.off('playback:play', handlePlayEvent);
      socket.off('playback:pause', handlePauseEvent);
      socket.off('playback:seek', handleSeekEvent);
      socket.off('queue:updated', handleQueueUpdated);
      socket.off('queue:track_started', handleTrackStarted);
      socket.off('queue:vote_skip_updated', handleVoteSkipUpdated);
      socket.off('chat:new_message', handleChat);
      socket.off('reaction:new', handleReaction);
      socket.off('error:notification', handleError);
    };
  }, []);

  // Socket actions
  const s = () => getSocket();
  const handlePlay = (pos: number) => s().emit('playback:play', { position: pos });
  const handlePause = (pos: number) => s().emit('playback:pause', { position: pos });
  const handleSeekAction = (pos: number) => s().emit('playback:seek', { position: pos });
  const handleTrackEnded = (id: string) => s().emit('playback:track_ended', { trackId: id });
  const handleAddTrack = (url: string): Promise<boolean> => new Promise(resolve => s().emit('queue:add', { url }, r => resolve(r.success)));
  const handleRemoveTrack = (id: string) => s().emit('queue:remove', { trackId: id });
  const handleReorder = (si: number, ei: number) => s().emit('queue:reorder', { startIndex: si, endIndex: ei });
  const handleSkipTo = (id: string) => s().emit('queue:skip_to', { trackId: id });
  const handleClearQueue = () => s().emit('queue:clear');
  const handleVoteSkip = () => s().emit('queue:vote_skip');
  const handleSendMessage = (content: string) => s().emit('chat:send', { content });
  const handleSendReaction = (emoji: string) => s().emit('reaction:send', { emoji });
  const handleTransferHost = (id: string) => s().emit('room:transfer_host', { targetUserId: id });
  const handleToggleDJ = (id: string) => s().emit('room:toggle_dj', { targetUserId: id });
  const handleUpdateSettings = (settings: Partial<RoomSettings>) => s().emit('room:update_settings', settings);

  const showToast = (msg: string) => { setToastMessage(msg); setTimeout(() => setToastMessage(null), 3000); };

  const copyToClipboard = async (text: string, field: 'link' | 'code') => {
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const ta = document.createElement('textarea');
        ta.value = text; ta.style.position = 'fixed'; ta.style.left = '-9999px';
        document.body.appendChild(ta); ta.focus(); ta.select();
        document.execCommand('copy'); document.body.removeChild(ta);
      }
      setCopiedField(field);
      showToast(field === 'link' ? 'Invite link copied!' : 'Room code copied!');
      setTimeout(() => setCopiedField(null), 2000);
    } catch { showToast('Failed to copy. Please copy manually.'); }
  };

  const getShareUrl = (code?: string) => {
    const id = code || room?.id || roomId || '';
    if (typeof window !== 'undefined') {
      const host = window.location.host;
      if (host.includes('localhost') || host.includes('127.0.0.1')) return `${window.location.protocol}//${host}/${id}`;
      if (host.includes('jamflow.world')) return `${window.location.origin}/${id}`;
    }
    return `https://jamflow.world/${id}`;
  };

  const handleShareToggle = async () => {
    if (!room) return;
    if (isAndroid && hasNativeShare) {
      try {
        await navigator.share({ title: `JamFlow — ${room.name || room.id}`, text: `Join my JamFlow room! Code: ${room.id}`, url: getShareUrl(room.id) });
        showToast('Room shared!');
        return;
      } catch (err: any) { if (err?.name === 'AbortError') return; }
    }
    setIsShareOpen(prev => !prev);
  };

  const handleLeaveRoom = () => { s().emit('room:leave'); router.push('/'); };

  const canControl = room?.settings.isOpenControl || currentUser?.isHost || currentUser?.isDJ || false;
  const canAdd = room?.settings.isOpenQueue || currentUser?.isHost || currentUser?.isDJ || false;

  const queueProps = {
    queue: room?.queue ?? [], currentTrack: room?.currentTrack ?? null,
    currentUser, voteSkip: room?.voteSkip ?? { votedUserIds: [], requiredVotes: 1 },
    canControl, canAdd,
    onAddTrack: handleAddTrack, onRemoveTrack: handleRemoveTrack,
    onReorder: handleReorder, onSkipTo: handleSkipTo,
    onClearQueue: handleClearQueue, onVoteSkip: handleVoteSkip,
    userCount: room?.users.length ?? 1,
  };

  const chatProps = {
    chat: room?.chat ?? [],
    users: room?.users ?? [],
    currentUser,
    onSendMessage: handleSendMessage,
    onSendReaction: handleSendReaction,
    onOpenListeners: () => setIsListenersOpen(true),
    onOpenSettings: () => setIsSettingsOpen(true),
  };

  // ── Username prompt ──
  if (!hasPromptedUser) {
    return (
      <main className="min-h-screen bg-zinc-950 flex items-center justify-center p-5">
        <div className="w-full max-w-sm p-7 rounded-3xl bg-zinc-900 border border-zinc-800 shadow-2xl text-center">
          <div className="w-12 h-12 rounded-2xl bg-zinc-800 flex items-center justify-center mx-auto mb-5 text-zinc-400">
            <Radio className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-white mb-1">Join {roomId}</h2>
          <p className="text-zinc-400 text-sm mb-5">Choose a nickname to start listening</p>
          <form onSubmit={e => { e.preventDefault(); if (username.trim()) { setHasPromptedUser(true); joinRoomWithUser(username.trim()); } }} className="space-y-3">
            <input
              type="text" placeholder="Your anime name" autoFocus required
              value={username} onChange={e => setUsername(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-white/30"
            />
            <button type="submit" className="w-full py-3 rounded-xl bg-gradient-to-r from-[#8B5CF6] via-[#A855F7] to-[#D946EF] text-white font-semibold text-sm shadow-lg shadow-[#8B5CF6]/25 hover:opacity-95 transition-all active:scale-[0.98]">
              Enter Room
            </button>
          </form>
        </div>
      </main>
    );
  }

  // ── Loading / Error ──
  if (isLoading || !room) {
    return (
      <main className="min-h-screen bg-zinc-950 flex items-center justify-center p-6 text-center">
        {errorMessage ? (
          <div className="max-w-sm p-6 rounded-2xl bg-zinc-900 border border-zinc-800 space-y-4">
            <AlertCircle className="w-8 h-8 text-zinc-400 mx-auto" />
            <p className="text-sm text-zinc-400">{errorMessage}</p>
            <button onClick={() => router.push('/')} className="px-4 py-2 rounded-xl bg-zinc-800 text-white text-xs">Back Home</button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3">
            <div className="w-7 h-7 border-2 border-white/20 border-t-white rounded-full animate-spin" />
            <p className="text-xs text-zinc-500">Connecting to {roomId}…</p>
          </div>
        )}
      </main>
    );
  }

  const host = room.users.find(u => u.isHost);

  // ────────────────────────────────────────────────────────────────────────────
  return (
    <main className="relative h-[100dvh] bg-[#0A0B12] flex flex-col overflow-hidden text-zinc-100 selection:bg-[#8B5CF6]/30">

      {/* Ambient glow (Desktop only to keep mobile 60fps) */}
      <div className="hidden sm:block pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden="true">
        <div
          className="absolute -top-32 left-1/2 -translate-x-1/2 w-[600px] h-[380px] rounded-full opacity-25 blur-[120px] transform-gpu"
          style={{ background: 'radial-gradient(ellipse at center, rgba(139, 92, 246, 0.5) 0%, rgba(217, 70, 239, 0.18) 50%, transparent 70%)' }}
        />
      </div>

      <FloatingReactions reactions={reactions} />

      {/* Error toast */}
      {errorMessage && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-full bg-zinc-900/95 border border-rose-500/30 text-white text-xs shadow-2xl backdrop-blur-md flex items-center gap-2 whitespace-nowrap">
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Success toast */}
      {toastMessage && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-full bg-zinc-900/95 border border-[#8B5CF6]/40 text-white text-xs shadow-2xl backdrop-blur-md flex items-center gap-2 whitespace-nowrap pointer-events-none">
          <Check className="w-4 h-4 text-emerald-400 shrink-0" />
          <span className="font-semibold">{toastMessage}</span>
        </div>
      )}

      {/* ── Top bar ── */}
      <header className="shrink-0 h-14 px-4 sm:px-6 flex items-center justify-between border-b border-white/[0.07] bg-[#0a0b0f]/70 backdrop-blur-2xl z-20 select-none">
        {/* Left: Brand + Room code */}
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={() => router.push('/')}
            className="flex items-center gap-2 text-zinc-300 hover:text-white transition-all group shrink-0 active:scale-95"
          >
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#8B5CF6] via-[#A855F7] to-[#D946EF] flex items-center justify-center shadow-[0_0_14px_rgba(139,92,246,0.4)] p-[1px]">
              <div className="w-full h-full bg-[#101116]/90 rounded-[10px] flex items-center justify-center">
                <Radio className="w-4 h-4 text-white" />
              </div>
            </div>
            <span className="text-sm font-black tracking-tight text-white hidden xs:inline">
              Jam<span className="text-transparent bg-clip-text bg-gradient-to-r from-[#C084FC] to-[#F472B6]">Flow</span>
            </span>
          </button>

          {/* Room code */}
          <button
            onClick={() => copyToClipboard(room.id, 'code')}
            className="flex items-center gap-1.5 font-mono font-bold text-zinc-300 hover:text-white text-xs bg-white/[0.05] hover:bg-white/[0.09] px-2.5 py-1.5 rounded-lg border border-white/[0.08] active:scale-95 transition-all"
            title="Copy room code"
          >
            <span className="tracking-[0.15em]">{room.id}</span>
            {copiedField === 'code' ? <Check className="w-3 h-3 text-emerald-400 shrink-0" /> : <Copy className="w-3 h-3 text-zinc-500 shrink-0" />}
          </button>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
          {/* Desktop listener indicator */}
          <button
            onClick={() => setIsListenersOpen(true)}
            className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.07] transition-all text-xs font-semibold text-zinc-300 hover:text-white active:scale-95"
            title="Click to view active listeners"
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#D946EF] opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#D946EF]" />
            </span>
            <span>{room.users.length} listening</span>
          </button>

          {/* Share */}
          <button
            onClick={handleShareToggle}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all active:scale-95 ${
              isShareOpen
                ? 'bg-gradient-to-r from-[#8B5CF6] to-[#D946EF] text-white shadow-md shadow-[#8B5CF6]/25'
                : 'text-zinc-300 hover:text-white bg-white/[0.05] hover:bg-white/[0.09] border border-white/[0.08]'
            }`}
          >
            <Share2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Share</span>
          </button>

          {/* Settings (host only) */}
          {currentUser?.isHost && (
            <button
              onClick={() => setIsSettingsOpen(prev => !prev)}
              className="p-2 rounded-lg text-zinc-400 hover:text-white bg-white/[0.05] hover:bg-white/[0.09] border border-white/[0.08] active:scale-95 transition-all"
            >
              <Settings className="w-4 h-4" />
            </button>
          )}

          {/* Leave */}
          <button
            onClick={handleLeaveRoom}
            className="p-2 rounded-lg text-rose-400/80 hover:text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 active:scale-95 transition-all"
            title="Leave room"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* ── Listeners Bottom Sheet ── */}
      {isListenersOpen && (
        <div
          className="fixed inset-0 z-60 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={() => setIsListenersOpen(false)}
        >
          <div
            className="relative w-full max-w-sm rounded-t-3xl sm:rounded-3xl bg-[#121320]/97 border border-white/[0.09] p-5 shadow-2xl backdrop-blur-2xl text-zinc-100 animate-in slide-in-from-bottom-4 sm:zoom-in-95 duration-200"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.07] mb-4">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#D946EF] animate-pulse shadow-[0_0_8px_rgba(217,70,239,0.8)]" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-white">
                  Active Listeners ({room.users.length})
                </h3>
              </div>
              <button
                onClick={() => setIsListenersOpen(false)}
                className="w-7 h-7 rounded-full bg-white/[0.05] hover:bg-white/[0.1] flex items-center justify-center text-zinc-400 hover:text-white transition-colors"
              >
                <ChevronDown className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {room.users.map(u => {
                const isMe = u.id === currentUser?.id;
                return (
                  <div key={u.id} className="flex items-center justify-between py-2 px-3 rounded-xl bg-white/[0.04] border border-white/[0.06]">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="w-2 h-2 rounded-full bg-[#D946EF] shrink-0" />
                      <span className={`text-sm truncate ${isMe ? 'font-bold text-white' : 'text-zinc-300'}`}>
                        {u.username}{isMe ? ' (You)' : ''}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0 ml-2">
                      {u.isHost ? (
                        <span className="px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/25 text-[10px] font-mono font-semibold text-amber-400 flex items-center gap-1">
                          <Crown className="w-2.5 h-2.5" /> Host
                        </span>
                      ) : (
                        <>
                          {currentUser?.isHost && (
                            <>
                              <button
                                type="button"
                                onClick={() => handleToggleDJ(u.id)}
                                className={`px-2 py-0.5 rounded-lg text-[10px] font-semibold border transition-all active:scale-95 ${
                                  u.isDJ
                                    ? 'bg-[#8B5CF6]/20 border-[#8B5CF6]/35 text-[#C084FC] hover:bg-rose-500/15 hover:border-rose-500/25 hover:text-rose-400'
                                    : 'bg-white/[0.04] border-white/[0.07] text-zinc-500 hover:text-zinc-200 hover:border-[#8B5CF6]/40'
                                }`}
                              >
                                {u.isDJ ? 'DJ ✓' : '+ DJ'}
                              </button>
                              <button
                                type="button"
                                onClick={() => { if (window.confirm(`Transfer host to ${u.username}?`)) handleTransferHost(u.id); }}
                                className="p-1 rounded-lg text-zinc-600 hover:text-amber-400 hover:bg-amber-400/10 transition-colors"
                                title="Transfer Host"
                              >
                                <Crown className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}
                          {!currentUser?.isHost && u.isDJ && (
                            <span className="px-2 py-0.5 rounded-full bg-[#8B5CF6]/15 border border-[#8B5CF6]/25 text-[10px] font-mono font-semibold text-[#C084FC]">
                              DJ
                            </span>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {currentUser?.isHost && (
              <div className="mt-4 pt-3 border-t border-white/[0.07] flex justify-end">
                <button
                  onClick={() => { setIsListenersOpen(false); setIsSettingsOpen(true); }}
                  className="flex items-center gap-1.5 text-xs font-semibold text-[#C084FC] hover:text-white transition-colors"
                >
                  <Settings className="w-3.5 h-3.5" /> Room Settings
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Settings Modal ── */}
      {isSettingsOpen && (
        <div
          className="fixed inset-0 z-70 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md"
          onClick={e => { if (e.target === e.currentTarget) setIsSettingsOpen(false); }}
        >
          <div className="relative w-full max-w-sm rounded-3xl bg-[#121320]/97 border border-white/[0.09] p-5 shadow-2xl backdrop-blur-2xl text-zinc-100 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.07] mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#8B5CF6] to-[#D946EF] flex items-center justify-center">
                  <Settings className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white leading-none">Room Settings</h3>
                  <p className="text-[11px] text-zinc-500 mt-0.5">Permissions & skipping</p>
                </div>
              </div>
              <button onClick={() => setIsSettingsOpen(false)} className="w-7 h-7 rounded-full bg-white/[0.05] hover:bg-white/[0.1] flex items-center justify-center text-zinc-400 hover:text-white transition-colors">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {!currentUser?.isHost ? (
              <div className="py-6 text-center text-zinc-500 text-xs">Only the room host can modify settings.</div>
            ) : (
              <div className="space-y-3">
                {/* Playback control */}
                <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/[0.06]">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-zinc-200">Playback Controls</span>
                    <span className="text-[10px] font-mono text-zinc-500">{room.settings.isOpenControl ? 'Everyone' : 'Host & DJs'}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-1.5 p-1 bg-white/[0.03] border border-white/[0.05] rounded-xl">
                    <button type="button" onClick={() => handleUpdateSettings({ isOpenControl: false })} className={`py-1.5 px-2 text-xs font-semibold rounded-lg transition-all ${!room.settings.isOpenControl ? 'bg-[#8B5CF6] text-white' : 'text-zinc-500 hover:text-white'}`}>Host & DJs</button>
                    <button type="button" onClick={() => handleUpdateSettings({ isOpenControl: true })} className={`py-1.5 px-2 text-xs font-semibold rounded-lg transition-all ${room.settings.isOpenControl ? 'bg-[#8B5CF6] text-white' : 'text-zinc-500 hover:text-white'}`}>Everyone</button>
                  </div>
                </div>

                {/* Queue permission */}
                <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/[0.06]">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-zinc-200">Queue Permission</span>
                    <span className="text-[10px] font-mono text-zinc-500">{room.settings.isOpenQueue ? 'Everyone' : 'Host & DJs'}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-1.5 p-1 bg-white/[0.03] border border-white/[0.05] rounded-xl">
                    <button type="button" onClick={() => handleUpdateSettings({ isOpenQueue: true })} className={`py-1.5 px-2 text-xs font-semibold rounded-lg transition-all ${room.settings.isOpenQueue ? 'bg-[#8B5CF6] text-white' : 'text-zinc-500 hover:text-white'}`}>Everyone</button>
                    <button type="button" onClick={() => handleUpdateSettings({ isOpenQueue: false })} className={`py-1.5 px-2 text-xs font-semibold rounded-lg transition-all ${!room.settings.isOpenQueue ? 'bg-[#8B5CF6] text-white' : 'text-zinc-500 hover:text-white'}`}>Host & DJs</button>
                  </div>
                </div>

                {/* Skip threshold */}
                <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/[0.06]">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-zinc-200">Vote Skip Threshold</span>
                    <span className="text-[10px] font-mono text-[#C084FC] font-bold">{room.settings.skipThresholdPercent}%</span>
                  </div>
                  <div className="grid grid-cols-3 gap-1.5">
                    {[33, 50, 66].map(pct => (
                      <button key={pct} type="button" onClick={() => handleUpdateSettings({ skipThresholdPercent: pct })} className={`py-1.5 px-2 rounded-xl text-xs font-semibold border transition-all ${room.settings.skipThresholdPercent === pct ? 'bg-[#8B5CF6]/25 border-[#8B5CF6] text-[#C084FC]' : 'bg-white/[0.03] border-white/[0.05] text-zinc-500 hover:text-white hover:border-white/20'}`}>
                        {pct}%
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Share Modal ── */}
      {isShareOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md"
          onClick={e => { if (e.target === e.currentTarget) setIsShareOpen(false); }}
        >
          <div className="relative w-full max-w-sm rounded-3xl bg-[#121320]/97 border border-white/[0.09] p-5 shadow-2xl backdrop-blur-2xl text-zinc-100 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.07] mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#8B5CF6] to-[#D946EF] flex items-center justify-center">
                  <Share2 className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white leading-none">Share Room</h3>
                  <p className="text-[11px] text-zinc-500 mt-0.5">Invite friends to listen in sync</p>
                </div>
              </div>
              <button onClick={() => setIsShareOpen(false)} className="w-7 h-7 rounded-full bg-white/[0.05] hover:bg-white/[0.1] flex items-center justify-center text-zinc-400 hover:text-white transition-colors">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Room code */}
            <div className="mb-4 p-3.5 rounded-2xl bg-white/[0.03] border border-white/[0.07] flex items-center justify-between">
              <div>
                <div className="text-[10px] uppercase font-mono tracking-wider text-zinc-500">Room Code</div>
                <div className="text-lg font-mono font-bold text-white tracking-widest mt-0.5">{room.id}</div>
              </div>
              <button onClick={() => copyToClipboard(room.id, 'code')} className="px-3 py-1.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] text-xs font-semibold text-zinc-200 flex items-center gap-1.5 transition-all border border-white/[0.07] active:scale-95">
                {copiedField === 'code' ? <><Check className="w-3.5 h-3.5 text-emerald-400" /><span className="text-emerald-400">Copied</span></> : <><Copy className="w-3.5 h-3.5 text-zinc-400" /><span>Copy</span></>}
              </button>
            </div>

            {/* Invite link */}
            <div className="mb-4">
              <label className="block text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-1.5">Invite Link</label>
              <div className="flex items-center gap-2">
                <input type="text" readOnly value={getShareUrl(room.id)} className="flex-1 min-w-0 bg-white/[0.03] border border-white/[0.07] rounded-xl px-3.5 py-2.5 text-xs font-mono text-zinc-300 truncate focus:outline-none" onClick={e => (e.target as HTMLInputElement).select()} />
                <button onClick={() => copyToClipboard(getShareUrl(room.id), 'link')} className="shrink-0 px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#8B5CF6] to-[#D946EF] hover:opacity-95 text-white font-semibold text-xs flex items-center gap-1.5 transition-all shadow-md shadow-[#8B5CF6]/20 active:scale-95">
                  {copiedField === 'link' ? <><Check className="w-3.5 h-3.5" /><span>Copied</span></> : <><Copy className="w-3.5 h-3.5" /><span>Copy</span></>}
                </button>
              </div>
            </div>

            {/* Social share */}
            <div className="pt-3 border-t border-white/[0.07] grid grid-cols-2 gap-2">
              <button
                onClick={() => { const t = `Join my JamFlow room! Code: ${room.id}\n`; const u = getShareUrl(room.id); window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(t + u)}`, '_blank'); }}
                className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-[#25D366]/10 hover:bg-[#25D366]/20 border border-[#25D366]/25 text-[#25D366] text-xs font-medium transition-all active:scale-95"
              >
                <MessageCircle className="w-3.5 h-3.5" /> WhatsApp
              </button>
              <button
                onClick={() => { const t = `Join my JamFlow room: ${room.id}`; const u = getShareUrl(room.id); window.open(`https://t.me/share/url?url=${encodeURIComponent(u)}&text=${encodeURIComponent(t)}`, '_blank'); }}
                className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-[#0088cc]/10 hover:bg-[#0088cc]/20 border border-[#0088cc]/25 text-[#0088cc] text-xs font-medium transition-all active:scale-95"
              >
                <Send className="w-3.5 h-3.5" /> Telegram
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Body ── */}
      <div className="flex-1 flex overflow-hidden min-h-0">

        {/* ━━━━ MOBILE layout ━━━━ */}
        {isMobile === true && (
          <div className="flex flex-col w-full h-full overflow-hidden">
            {/* 1. Player */}
            <div className="shrink-0">
              <YouTubePlayer
                compact
                currentTrack={room.currentTrack}
                playbackState={playbackState}
                serverPosition={serverPosition}
                lastSyncTimestamp={lastSyncTimestamp}
                canControl={canControl}
                hasQueue={room.queue.length > 0}
                onSkipNext={() => { if (room.queue.length > 0) handleSkipTo(room.queue[0].id); }}
                onPlay={handlePlay}
                onPause={handlePause}
                onSeek={handleSeekAction}
                onTrackEnded={handleTrackEnded}
              />
            </div>

            {/* 2. Listener indicator — tap to open bottom sheet */}
            <button
              onClick={() => setIsListenersOpen(true)}
              className="shrink-0 flex items-center justify-between px-4 py-2 border-b border-[#22232E] bg-[#0C0D15] hover:bg-[#12131D] transition-colors"
            >
              <div className="flex items-center gap-2">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#D946EF] opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-[#D946EF]" />
                </span>
                <span className="text-xs font-semibold text-zinc-300">
                  {room.users.length} listening
                </span>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-zinc-500" />
            </button>

            {/* 3. YouTube Input (Immediately below player & listener indicator) */}
            <div className="shrink-0 px-4 pt-3 pb-2.5 border-b border-[#22232E] bg-[#0E0F17]">
              <YouTubeInput
                canAdd={canAdd}
                onAddTrack={handleAddTrack}
                autoFocusRef={addTrackInputRef}
              />
            </div>

            {/* 4. Queue / Chat tabs directly below YouTube input */}
            <div className="flex-1 min-h-0 flex flex-col bg-[#0A0B12]">
              {/* Header bar with swipe / tap indicator */}
              <div
                onTouchStart={handleTouchStart}
                onTouchEnd={(e) => handleTouchEnd(e, false)}
                className="shrink-0 flex flex-col border-b border-[#22232E] bg-[#0C0D15] select-none"
              >
                {/* Pull handle indicator */}
                <button
                  type="button"
                  onClick={() => setIsMobilePanelExpanded(true)}
                  className="w-full flex items-center justify-center pt-2 pb-1 group focus:outline-none"
                  aria-label="Expand queue and chat overlay"
                >
                  <div className="w-10 h-1 rounded-full bg-white/20 group-hover:bg-white/40 transition-colors" />
                </button>

                {/* Tabs row */}
                <div className="flex items-center px-1">
                  <button
                    onClick={() => handleMobileTabClick('queue')}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-bold tracking-wide transition-all ${
                      activeTab === 'queue'
                        ? 'text-white border-b-2 border-[#8B5CF6]'
                        : 'text-zinc-500 hover:text-zinc-300'
                    }`}
                  >
                    <ListMusic className="w-3.5 h-3.5" />
                    Queue
                    {room.queue.length > 0 && (
                      <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono font-bold ${activeTab === 'queue' ? 'bg-[#8B5CF6]/25 text-[#C084FC]' : 'bg-white/[0.07] text-zinc-500'}`}>
                        {room.queue.length}
                      </span>
                    )}
                  </button>
                  <button
                    onClick={() => handleMobileTabClick('chat')}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-bold tracking-wide transition-all ${
                      activeTab === 'chat'
                        ? 'text-white border-b-2 border-[#8B5CF6]'
                        : 'text-zinc-500 hover:text-zinc-300'
                    }`}
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    Chat
                    {unreadChatCount > 0 && (
                      <span className="px-1.5 py-0.5 rounded-full bg-gradient-to-r from-[#D946EF] to-rose-500 text-white text-[10px] font-bold font-mono shadow-[0_0_8px_rgba(217,70,239,0.7)] animate-pulse">
                        {unreadChatCount}
                      </span>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsMobilePanelExpanded(true)}
                    className="px-2.5 py-2 text-zinc-400 hover:text-white transition-colors flex items-center gap-1 active:scale-95"
                    title="Expand overlay"
                    aria-label="Expand"
                  >
                    <ChevronUp className="w-4 h-4 text-zinc-400 hover:text-[#C084FC]" />
                  </button>
                </div>
              </div>

              {/* Collapsed Tab Content */}
              <div className="flex-1 min-h-0 overflow-hidden">
                {activeTab === 'queue' ? (
                  <QueueList
                    {...queueProps}
                    onFocusAddInput={() => addTrackInputRef.current?.focus()}
                  />
                ) : (
                  <ChatAndReactions {...chatProps} />
                )}
              </div>
            </div>

            {/* Expandable Overlay Bottom Sheet for Mobile Queue/Chat */}
            {isMobilePanelExpanded && (
              <>
                {/* Backdrop covering player and YouTubeInput */}
                <div
                  className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200"
                  onClick={() => setIsMobilePanelExpanded(false)}
                />

                {/* Expanded Sheet */}
                <div
                  className="fixed inset-x-0 bottom-0 top-14 z-50 bg-[#0C0D17] border-t border-white/[0.12] rounded-t-3xl shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom duration-300 transform-gpu"
                >
                  {/* Header with drag handle and tabs */}
                  <div
                    onTouchStart={handleTouchStart}
                    onTouchEnd={(e) => handleTouchEnd(e, true)}
                    className="shrink-0 flex flex-col border-b border-[#22232E] bg-[#0E0F1A] select-none"
                  >
                    {/* Pull down indicator pill */}
                    <button
                      type="button"
                      onClick={() => setIsMobilePanelExpanded(false)}
                      className="w-full flex items-center justify-center pt-2.5 pb-1 group focus:outline-none"
                      aria-label="Collapse overlay"
                    >
                      <div className="w-10 h-1.5 rounded-full bg-white/25 group-hover:bg-white/45 transition-colors" />
                    </button>

                    {/* Tabs row with collapse button */}
                    <div className="flex items-center px-2">
                      <button
                        onClick={() => switchTab('queue')}
                        className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-xs font-bold tracking-wide transition-all ${
                          activeTab === 'queue'
                            ? 'text-white border-b-2 border-[#8B5CF6]'
                            : 'text-zinc-500 hover:text-zinc-300'
                        }`}
                      >
                        <ListMusic className="w-4 h-4" />
                        Queue
                        {room.queue.length > 0 && (
                          <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono font-bold ${activeTab === 'queue' ? 'bg-[#8B5CF6]/25 text-[#C084FC]' : 'bg-white/[0.07] text-zinc-500'}`}>
                            {room.queue.length}
                          </span>
                        )}
                      </button>
                      <button
                        onClick={() => switchTab('chat')}
                        className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-xs font-bold tracking-wide transition-all ${
                          activeTab === 'chat'
                            ? 'text-white border-b-2 border-[#8B5CF6]'
                            : 'text-zinc-500 hover:text-zinc-300'
                        }`}
                      >
                        <MessageSquare className="w-4 h-4" />
                        Chat
                        {unreadChatCount > 0 && (
                          <span className="px-1.5 py-0.5 rounded-full bg-gradient-to-r from-[#D946EF] to-rose-500 text-white text-[10px] font-bold font-mono shadow-[0_0_8px_rgba(217,70,239,0.7)] animate-pulse">
                            {unreadChatCount}
                          </span>
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsMobilePanelExpanded(false)}
                        className="p-2 ml-1 text-zinc-400 hover:text-white rounded-lg hover:bg-white/[0.05] transition-colors active:scale-95"
                        title="Collapse overlay"
                        aria-label="Collapse"
                      >
                        <ChevronDown className="w-5 h-5 text-zinc-400 hover:text-white" />
                      </button>
                    </div>
                  </div>

                  {/* Expanded Content with full vertical height */}
                  <div className="flex-1 min-h-0 overflow-hidden bg-[#0A0B12]">
                    {activeTab === 'queue' ? (
                      <QueueList
                        {...queueProps}
                        onFocusAddInput={() => {
                          setIsMobilePanelExpanded(false);
                          setTimeout(() => addTrackInputRef.current?.focus(), 150);
                        }}
                      />
                    ) : (
                      <ChatAndReactions {...chatProps} />
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* ━━━━ DESKTOP layout ━━━━ */}
        {isMobile !== true && (
          <div className="flex w-full overflow-hidden flex-1 min-h-0">
            {/* Left — Player column (~65-70%) */}
            <div className="flex-1 min-w-0 relative h-full flex flex-col overflow-hidden bg-[#0A0B12]">
              {/* Album art background */}
              {room.currentTrack?.thumbnail ? (
                <>
                  <img
                    key={room.currentTrack.thumbnail}
                    src={room.currentTrack.thumbnail}
                    alt=""
                    className="absolute inset-0 w-full h-full object-cover blur-3xl scale-110 opacity-20 transition-all duration-1000 pointer-events-none z-0"
                  />
                  <div className="absolute inset-0 z-0 pointer-events-none" style={{ background: 'linear-gradient(to bottom, rgba(10,11,18,0.2) 0%, rgba(10,11,18,0.7) 60%, rgba(10,11,18,0.95) 100%)' }} />
                </>
              ) : (
                <div className="absolute inset-0 z-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse at 50% 0%, rgba(139,92,246,0.2) 0%, transparent 65%)' }} />
              )}

              {/* Player in upper area */}
              <div className="flex-1 min-h-0 overflow-y-auto">
                <YouTubePlayer
                  currentTrack={room.currentTrack}
                  playbackState={playbackState}
                  serverPosition={serverPosition}
                  lastSyncTimestamp={lastSyncTimestamp}
                  canControl={canControl}
                  users={room.users}
                  currentUser={currentUser}
                  userCount={room.users.length}
                  hasQueue={room.queue.length > 0}
                  onSkipNext={() => { if (room.queue.length > 0) handleSkipTo(room.queue[0].id); }}
                  onPlay={handlePlay}
                  onPause={handlePause}
                  onSeek={handleSeekAction}
                  onTrackEnded={handleTrackEnded}
                  onOpenListeners={() => setIsListenersOpen(true)}
                />
              </div>

              {/* Bottom of Left Column: YouTube Input */}
              <div className="relative z-10 shrink-0 p-4 border-t border-[#22232E] bg-[#0E0F17]/95 backdrop-blur-md">
                <YouTubeInput
                  canAdd={canAdd}
                  onAddTrack={handleAddTrack}
                  autoFocusRef={addTrackInputRef}
                />
              </div>
            </div>

            {/* Right — Sidebar (~340-380px) */}
            <div className="w-[340px] xl:w-[380px] shrink-0 border-l border-[#22232E] flex flex-col bg-[#0D0E17]/97 backdrop-blur-2xl">
              {/* Sidebar tab switcher */}
              <div className="shrink-0 flex border-b border-[#22232E] bg-[#0C0D16]">
                <button
                  onClick={() => switchTab('queue')}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-xs font-bold tracking-wide transition-all ${
                    activeTab === 'queue'
                      ? 'text-white border-b-2 border-[#8B5CF6]'
                      : 'text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  <ListMusic className="w-3.5 h-3.5" />
                  Queue
                  {room.queue.length > 0 && (
                    <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono ${activeTab === 'queue' ? 'bg-[#8B5CF6]/25 text-[#C084FC]' : 'bg-white/[0.07] text-zinc-500'}`}>
                      {room.queue.length}
                    </span>
                  )}
                </button>
                <button
                  onClick={() => switchTab('chat')}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-xs font-bold tracking-wide transition-all ${
                    activeTab === 'chat'
                      ? 'text-white border-b-2 border-[#8B5CF6]'
                      : 'text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  Chat
                  {unreadChatCount > 0 && (
                    <span className="px-1.5 py-0.5 rounded-full bg-gradient-to-r from-[#D946EF] to-rose-500 text-white text-[10px] font-bold font-mono animate-pulse">
                      {unreadChatCount}
                    </span>
                  )}
                </button>
              </div>

              <div className="flex-1 min-h-0 overflow-hidden">
                {activeTab === 'queue' ? (
                  <QueueList
                    {...queueProps}
                    onFocusAddInput={() => addTrackInputRef.current?.focus()}
                  />
                ) : (
                  <ChatAndReactions {...chatProps} />
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
