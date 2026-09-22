'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Radio, Share2, Check, LogOut, Users, Crown, Copy,
  AlertCircle, ListMusic, MessageSquare, MessageCircle, Send, Smartphone, X,
  Settings, Shield, Sparkles, Maximize2, Minimize2, ChevronDown, ChevronUp,
} from 'lucide-react';
import confetti from 'canvas-confetti';

import { getSocket } from '@/lib/socket';
import { Room, User, Track, Reaction, PlaybackState, RoomSettings } from '@/types';
import { YouTubePlayer } from '@/components/YouTubePlayer';
import { QueueList } from '@/components/QueueList';
import { ChatAndReactions } from '@/components/ChatAndReactions';
import { FloatingReactions } from '@/components/FloatingReactions';

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
  const [isListeningNowOpen, setIsListeningNowOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isAndroid, setIsAndroid] = useState(false);
  const [hasNativeShare, setHasNativeShare] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Mobile bottom panel tab: 'queue' | 'chat'
  const [mobileTab, setMobileTab] = useState<'queue' | 'chat'>('queue');
  const [isMobileExpanded, setIsMobileExpanded] = useState(false);
  // Desktop right sidebar tab
  const [desktopTab, setDesktopTab] = useState<'queue' | 'chat'>('queue');
  const [unreadChatCount, setUnreadChatCount] = useState(0);
  const activeTabRef = useRef<'queue' | 'chat'>('queue');

  const switchTab = (tab: 'queue' | 'chat') => {
    setMobileTab(tab);
    setDesktopTab(tab);
    activeTabRef.current = tab;
    if (tab === 'chat') {
      setUnreadChatCount(0);
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
    if (saved) { setUsername(saved); setHasPromptedUser(true); }
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
      if (activeTabRef.current !== 'chat' && !msg.isSystem) {
        setUnreadChatCount(c => c + 1);
      }
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
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const copyToClipboard = async (text: string, field: 'link' | 'code') => {
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.left = '-9999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
      setCopiedField(field);
      showToast(field === 'link' ? 'Invite link copied to clipboard!' : 'Room code copied to clipboard!');
      setTimeout(() => setCopiedField(null), 2000);
    } catch (err) {
      console.error('Failed to copy to clipboard', err);
      showToast('Failed to copy. Please copy manually.');
    }
  };

  const getShareUrl = (code?: string) => {
    const id = code || room?.id || roomId || '';
    if (typeof window !== 'undefined') {
      const host = window.location.host;
      if (host.includes('localhost') || host.includes('127.0.0.1')) {
        return `${window.location.protocol}//${host}/${id}`;
      }
      if (host.includes('jamflow.world')) {
        return `${window.location.origin}/${id}`;
      }
    }
    return `https://jamflow.world/${id}`;
  };

  const handleShareToggle = async () => {
    if (!room) return;
    const shareUrl = getShareUrl(room.id);
    const shareData = {
      title: `JamFlow — ${room.name || room.id}`,
      text: `Listen to music in sync with me on JamFlow! Room Code: ${room.id}`,
      url: shareUrl,
    };

    // On Android (or mobile OS supporting native share), trigger native Android share directly:
    if (isAndroid && hasNativeShare) {
      try {
        await navigator.share(shareData);
        showToast('Room shared successfully!');
        return;
      } catch (err: any) {
        if (err?.name === 'AbortError') {
          return; // User cancelled Android share sheet
        }
        console.warn('Android native share failed, falling back to share modal', err);
      }
    }

    // On desktop or as fallback: toggle the share modal/popover
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
  };

  const chatProps = {
    chat: room?.chat ?? [],
    users: room?.users ?? [],
    currentUser,
    onSendMessage: handleSendMessage,
    onSendReaction: handleSendReaction,
    onOpenListeners: () => setIsListeningNowOpen(true),
    onOpenSettings: () => setIsSettingsOpen(true),
  };

  // — Username prompt —
  if (!hasPromptedUser) {
    return (
      <main className="min-h-screen bg-zinc-950 flex items-center justify-center p-5">
        <div className="w-full max-w-sm p-7 rounded-3xl bg-zinc-900 border border-zinc-800 shadow-2xl text-center">
          <div className="w-12 h-12 rounded-2xl bg-zinc-800 flex items-center justify-center mx-auto mb-5 text-zinc-400">
            <Radio className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-white mb-1">Join {roomId}</h2>
          <p className="text-zinc-400 text-sm mb-5">Choose a nickname to start listening</p>
          <form
            onSubmit={e => { e.preventDefault(); if (username.trim()) { setHasPromptedUser(true); joinRoomWithUser(username.trim()); } }}
            className="space-y-3"
          >
            <input
              type="text" placeholder="Your nickname" autoFocus required
              value={username} onChange={e => setUsername(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-white/30"
            />
            <button type="submit" className="w-full py-3 rounded-xl bg-white text-zinc-900 font-semibold text-sm hover:bg-zinc-100 transition-colors">
              Enter Room
            </button>
          </form>
        </div>
      </main>
    );
  }

  // — Loading / Error —
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

  return (
    <main className="relative h-[100dvh] bg-[#0A0B12] flex flex-col overflow-hidden text-zinc-100 selection:bg-[#8B5CF6]/30">
      {/* ── Ambient Studio Atmosphere (rich depth, eliminates harsh pitch black) ── */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden="true">
        {/* Top vibrant violet-fuchsia aurora bloom */}
        <div
          className="absolute -top-32 left-1/2 -translate-x-1/2 w-[650px] sm:w-[950px] h-[400px] rounded-full opacity-30 blur-[100px]"
          style={{
            background: 'radial-gradient(ellipse at center, rgba(139, 92, 246, 0.45) 0%, rgba(217, 70, 239, 0.2) 45%, transparent 70%)',
          }}
        />
        {/* Subtle bottom-right indigo warm fill */}
        <div
          className="absolute -bottom-36 -right-20 w-[450px] h-[350px] rounded-full opacity-20 blur-[90px]"
          style={{
            background: 'radial-gradient(circle, rgba(139, 92, 246, 0.35) 0%, transparent 65%)',
          }}
        />
        {/* Subtle micro dot texture */}
        <div className="absolute inset-0 bg-[radial-gradient(#ffffff0a_1px,transparent_1px)] [background-size:24px_24px] opacity-20" />
      </div>

      <FloatingReactions reactions={reactions} />

      {/* Error toast */}
      {errorMessage && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-full bg-zinc-900/95 border border-rose-500/30 text-white text-xs shadow-2xl backdrop-blur-md flex items-center gap-2 whitespace-nowrap">
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Success / Action toast */}
      {toastMessage && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-full bg-zinc-900/95 border border-[#8B5CF6]/40 text-white text-xs shadow-2xl backdrop-blur-md flex items-center gap-2 whitespace-nowrap pointer-events-none">
          <Check className="w-4 h-4 text-emerald-400 shrink-0" />
          <span className="font-semibold">{toastMessage}</span>
        </div>
      )}

      {/* ── Top bar — 2-row on mobile, single-row on desktop ── */}
      <header className="shrink-0 z-20 select-none bg-[#0A0B14]/40 backdrop-blur-3xl backdrop-saturate-150 border-b border-white/[0.1] shadow-[0_8px_32px_rgba(0,0,0,0.3)]">

        {/* ── Row 1: Brand + Room Code (always visible) ── */}
        <div className="flex items-center justify-between px-4 sm:px-8 h-16 sm:h-[72px]">
          {/* Left: Logo + Name */}
          <button
            onClick={() => router.push('/')}
            className="flex items-center gap-3 text-zinc-300 hover:text-white transition-all group shrink-0 active:scale-95"
          >
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-[#8B5CF6] via-[#A855F7] to-[#D946EF] flex items-center justify-center shadow-[0_0_20px_rgba(139,92,246,0.5)] p-[1.5px]">
              <div className="w-full h-full bg-[#0A0B14]/80 rounded-[13px] flex items-center justify-center backdrop-blur-sm">
                <Radio className="w-5 h-5 text-white group-hover:scale-110 transition-transform" />
              </div>
            </div>
            <span className="text-xl font-black tracking-tight text-white">
              Jam<span className="text-transparent bg-clip-text bg-gradient-to-r from-[#C084FC] to-[#F472B6]">Flow</span>
            </span>
          </button>

          {/* Right (desktop only): All action buttons in one row */}
          <div className="hidden sm:flex items-center gap-3 shrink-0">
            {/* SYNCED badge */}
            <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/[0.04] border border-white/[0.08] text-xs font-mono">
              <span className="w-2 h-2 rounded-full bg-[#8B5CF6] shadow-[0_0_8px_rgba(139,92,246,0.8)]" />
              <span className="text-zinc-300 font-semibold tracking-wide">SYNCED</span>
            </div>

            {/* Room Code */}
            <button
              onClick={() => copyToClipboard(room.id, 'code')}
              className="flex items-center gap-2 font-mono font-bold text-zinc-200 hover:text-white transition-all bg-white/[0.05] hover:bg-white/[0.1] active:scale-95 px-4 py-2 rounded-xl border border-white/[0.09] shadow-[inset_0_1px_0_rgba(255,255,255,0.1)] text-sm"
              title="Click to copy room code"
            >
              <span className="tracking-wider">{room.id}</span>
              {copiedField === 'code' ? (
                <Check className="w-4 h-4 text-emerald-400 shrink-0" />
              ) : (
                <Copy className="w-4 h-4 text-zinc-400 shrink-0" />
              )}
            </button>

            {room.name && (
              <div className="flex items-center gap-1.5 text-zinc-400 text-sm font-medium truncate max-w-[160px]" title={room.name}>
                <span className="text-zinc-600 font-bold select-none">·</span>
                <span className="truncate">{room.name}</span>
              </div>
            )}

            {/* LIVE LISTENERS */}
            <button
              onClick={() => setIsListeningNowOpen(prev => !prev)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.09] border border-white/[0.08] hover:border-white/20 active:scale-95 transition-all shadow-sm"
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#D946EF] opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#D946EF]" />
              </span>
              <span className="font-bold text-white text-sm">LIVE {room.users.length}</span>
            </button>

            {/* Host badge */}
            {host && (
              <div className="hidden md:flex items-center gap-1.5 text-sm text-zinc-300 bg-white/[0.05] px-3 py-2 rounded-xl border border-white/[0.08]">
                <Crown className="w-4 h-4 text-amber-400 shrink-0" />
                <span className="font-medium truncate max-w-[120px]">
                  {currentUser?.isHost ? `${currentUser.username} (Host)` : host.username}
                </span>
              </div>
            )}

            {/* Settings */}
            {currentUser?.isHost && (
              <button
                onClick={() => setIsSettingsOpen(prev => !prev)}
                className="p-2.5 rounded-xl text-zinc-400 hover:text-white bg-white/[0.05] hover:bg-white/[0.09] border border-white/[0.08] active:scale-95 transition-all"
                title="Room Settings"
              >
                <Settings className="w-5 h-5" />
              </button>
            )}

            {/* Share */}
            <button
              onClick={handleShareToggle}
              className={`px-4 py-2 rounded-xl text-sm font-semibold flex items-center gap-2 transition-all active:scale-95 ${
                isShareOpen
                  ? 'bg-gradient-to-r from-[#8B5CF6] to-[#D946EF] text-white shadow-lg shadow-[#8B5CF6]/30'
                  : 'text-zinc-200 hover:text-white bg-white/[0.06] hover:bg-white/[0.1] border border-white/[0.09] shadow-sm'
              }`}
            >
              <Share2 className="w-4 h-4" />
              <span>Share</span>
            </button>

            {/* Leave */}
            <button
              onClick={handleLeaveRoom}
              className="px-4 py-2 rounded-xl text-sm font-semibold text-rose-400/90 hover:text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 hover:border-rose-500/40 active:scale-95 transition-all flex items-center gap-2 shadow-sm"
            >
              <LogOut className="w-4 h-4" />
              <span>Leave</span>
            </button>
          </div>

          {/* Right (mobile only): compact icon row */}
          <div className="flex sm:hidden items-center gap-2 shrink-0">
            {/* Live listeners pill */}
            <button
              onClick={() => setIsListeningNowOpen(prev => !prev)}
              className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/[0.05] border border-white/[0.08] active:scale-95 transition-all"
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#D946EF] opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#D946EF]" />
              </span>
              <span className="font-bold text-white text-sm">{room.users.length}</span>
            </button>

            {/* Share */}
            <button
              onClick={handleShareToggle}
              className={`w-11 h-11 rounded-xl flex items-center justify-center transition-all active:scale-95 ${
                isShareOpen
                  ? 'bg-gradient-to-r from-[#8B5CF6] to-[#D946EF] text-white shadow-lg shadow-[#8B5CF6]/30'
                  : 'text-zinc-300 bg-white/[0.06] border border-white/[0.09]'
              }`}
              title="Share Room"
            >
              <Share2 className="w-5 h-5" />
            </button>

            {/* Settings (host only) */}
            {currentUser?.isHost && (
              <button
                onClick={() => setIsSettingsOpen(prev => !prev)}
                className="w-11 h-11 rounded-xl text-zinc-400 hover:text-white bg-white/[0.05] border border-white/[0.08] active:scale-95 transition-all flex items-center justify-center"
                title="Room Settings"
              >
                <Settings className="w-5 h-5" />
              </button>
            )}

            {/* Leave */}
            <button
              onClick={handleLeaveRoom}
              className="w-11 h-11 rounded-xl text-rose-400 bg-rose-500/10 border border-rose-500/20 active:scale-95 transition-all flex items-center justify-center"
              title="Leave room"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* ── Row 2 (mobile only): Room Code + Room Name ── */}
        <div className="sm:hidden flex items-center gap-3 px-4 pb-3">
          <button
            onClick={() => copyToClipboard(room.id, 'code')}
            className="flex items-center gap-2 font-mono font-bold text-zinc-200 hover:text-white transition-all bg-white/[0.05] hover:bg-white/[0.1] active:scale-95 px-4 py-2.5 rounded-xl border border-white/[0.09] text-sm flex-1 justify-center"
            title="Tap to copy room code"
          >
            <span className="tracking-widest">{room.id}</span>
            {copiedField === 'code' ? (
              <Check className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <Copy className="w-4 h-4 text-zinc-500 shrink-0" />
            )}
          </button>

          {room.name && (
            <div className="flex items-center gap-1.5 text-zinc-400 text-sm font-medium truncate min-w-0 flex-1 justify-center">
              <span className="truncate text-center">{room.name}</span>
            </div>
          )}
        </div>

      </header>

      {/* ── LISTENING NOW Modal / Popover ── */}
      {isListeningNowOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md"
          onClick={() => setIsListeningNowOpen(false)}
        >
          <div
            className="relative w-full max-w-sm rounded-3xl bg-[#121320]/95 border border-white/[0.1] p-5 shadow-2xl backdrop-blur-2xl text-zinc-100 animate-in fade-in zoom-in-95 duration-150"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-4 border-b border-white/[0.08] mb-4">
              <div className="flex items-center gap-2.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
                <h3 className="text-sm font-bold uppercase tracking-wider text-white">Listeners ({room.users.length})</h3>
              </div>
              <button
                onClick={() => setIsListeningNowOpen(false)}
                className="w-9 h-9 rounded-full bg-white/[0.05] hover:bg-white/[0.1] flex items-center justify-center text-zinc-400 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Participant list */}
            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {room.users.map(u => {
                const isMe = u.id === currentUser?.id;
                return (
                  <div key={u.id} className="flex items-center justify-between py-2.5 px-3.5 rounded-2xl bg-white/[0.04] border border-white/[0.07]">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#8B5CF6] to-[#D946EF] flex items-center justify-center text-sm font-bold text-white uppercase shrink-0 shadow-sm">
                        {u.username.slice(0, 1)}
                      </div>
                      <span className={`text-sm truncate ${isMe ? 'font-bold text-white' : 'text-zinc-300'}`}>
                        {isMe ? `${u.username} (You)` : u.username}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 ml-2">
                      {u.isHost ? (
                        <span className="px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-[11px] font-mono font-semibold text-amber-400 flex items-center gap-1.5">
                          <Crown className="w-3 h-3" /> Host
                        </span>
                      ) : (
                        <>
                          {/* If Host, allow toggling DJ or Transferring Host */}
                          {currentUser?.isHost && (
                            <>
                              <button
                                type="button"
                                onClick={() => handleToggleDJ(u.id)}
                                className={`px-3 py-1.5 rounded-xl text-[11px] font-semibold border transition-all active:scale-95 ${
                                  u.isDJ
                                    ? 'bg-[#8B5CF6]/20 border-[#8B5CF6]/40 text-[#C084FC] hover:bg-rose-500/20 hover:border-rose-500/30 hover:text-rose-400'
                                    : 'bg-white/[0.05] border-white/[0.08] text-zinc-400 hover:text-white hover:border-[#8B5CF6]'
                                }`}
                                title={u.isDJ ? 'Click to revoke DJ status' : 'Click to make DJ'}
                              >
                                {u.isDJ ? 'DJ ✓' : '+ DJ'}
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  if (window.confirm(`Transfer host role to ${u.username}?`)) {
                                    handleTransferHost(u.id);
                                  }
                                }}
                                className="p-1.5 rounded-lg text-zinc-500 hover:text-amber-400 hover:bg-amber-400/10 border border-transparent hover:border-amber-400/20 transition-colors"
                                title="Transfer Host role"
                              >
                                <Crown className="w-4 h-4" />
                              </button>
                            </>
                          )}
                          {!currentUser?.isHost && u.isDJ && (
                            <span className="px-3 py-1 rounded-full bg-[#8B5CF6]/15 border border-[#8B5CF6]/30 text-[11px] font-mono font-semibold text-[#8B5CF6]">
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

            {/* Quick settings link for host */}
            {currentUser?.isHost && (
              <div className="mt-3.5 pt-3 border-t border-white/[0.08] flex justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setIsListeningNowOpen(false);
                    setIsSettingsOpen(true);
                  }}
                  className="flex items-center gap-1.5 text-xs font-semibold text-[#C084FC] hover:text-white transition-colors"
                >
                  <Settings className="w-3.5 h-3.5" />
                  <span>Room Settings</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Room Settings Modal ── */}
      {isSettingsOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md"
          onClick={e => { if (e.target === e.currentTarget) setIsSettingsOpen(false); }}
        >
          <div
            className="relative w-full max-w-sm rounded-3xl bg-[#121320]/95 border border-white/[0.1] p-5 shadow-2xl backdrop-blur-2xl text-zinc-100 animate-in fade-in zoom-in-95 duration-150"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.08] mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#8B5CF6] to-[#D946EF] flex items-center justify-center shadow-md shadow-[#8B5CF6]/25">
                  <Settings className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white leading-none">Room Settings</h3>
                  <p className="text-[11px] text-zinc-400 mt-0.5">Control permissions & skipping</p>
                </div>
              </div>
              <button
                onClick={() => setIsSettingsOpen(false)}
                className="w-7 h-7 rounded-full bg-white/[0.05] hover:bg-white/[0.1] flex items-center justify-center text-zinc-400 hover:text-white transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {!currentUser?.isHost ? (
              <div className="py-6 text-center text-zinc-400 text-xs">
                Only the room host can modify these settings.
              </div>
            ) : (
              <div className="space-y-3.5">
                {/* Playback Control Permission */}
                <div className="p-3.5 rounded-2xl bg-white/[0.04] border border-white/[0.07]">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-semibold text-zinc-200">Playback Controls</span>
                    <span className="text-[10px] font-mono text-zinc-400">
                      {room.settings.isOpenControl ? 'Everyone' : 'Host & DJs'}
                    </span>
                  </div>
                  <p className="text-[11px] text-zinc-500 mb-2.5">
                    Who can play, pause, seek, and skip tracks.
                  </p>
                  <div className="grid grid-cols-2 gap-1.5 p-1 bg-white/[0.03] border border-white/[0.06] rounded-xl">
                    <button
                      type="button"
                      onClick={() => handleUpdateSettings({ isOpenControl: false })}
                      className={`py-1.5 px-2 text-xs font-semibold rounded-lg transition-all ${
                        !room.settings.isOpenControl
                          ? 'bg-[#8B5CF6] text-white shadow-sm'
                          : 'text-zinc-400 hover:text-white'
                      }`}
                    >
                      Host & DJs
                    </button>
                    <button
                      type="button"
                      onClick={() => handleUpdateSettings({ isOpenControl: true })}
                      className={`py-1.5 px-2 text-xs font-semibold rounded-lg transition-all ${
                        room.settings.isOpenControl
                          ? 'bg-[#8B5CF6] text-white shadow-sm'
                          : 'text-zinc-400 hover:text-white'
                      }`}
                    >
                      Everyone
                    </button>
                  </div>
                </div>

                {/* Queue Adding Permission */}
                <div className="p-3.5 rounded-2xl bg-white/[0.04] border border-white/[0.07]">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-semibold text-zinc-200">Queue Permission</span>
                    <span className="text-[10px] font-mono text-zinc-400">
                      {room.settings.isOpenQueue ? 'Everyone' : 'Host & DJs'}
                    </span>
                  </div>
                  <p className="text-[11px] text-zinc-500 mb-2.5">
                    Who can add new songs to the playlist queue.
                  </p>
                  <div className="grid grid-cols-2 gap-1.5 p-1 bg-white/[0.03] border border-white/[0.06] rounded-xl">
                    <button
                      type="button"
                      onClick={() => handleUpdateSettings({ isOpenQueue: true })}
                      className={`py-1.5 px-2 text-xs font-semibold rounded-lg transition-all ${
                        room.settings.isOpenQueue
                          ? 'bg-[#8B5CF6] text-white shadow-sm'
                          : 'text-zinc-400 hover:text-white'
                      }`}
                    >
                      Everyone
                    </button>
                    <button
                      type="button"
                      onClick={() => handleUpdateSettings({ isOpenQueue: false })}
                      className={`py-1.5 px-2 text-xs font-semibold rounded-lg transition-all ${
                        !room.settings.isOpenQueue
                          ? 'bg-[#8B5CF6] text-white shadow-sm'
                          : 'text-zinc-400 hover:text-white'
                      }`}
                    >
                      Host & DJs
                    </button>
                  </div>
                </div>

                {/* Vote Skip Threshold */}
                <div className="p-3.5 rounded-2xl bg-white/[0.04] border border-white/[0.07]">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-semibold text-zinc-200">Vote Skip Threshold</span>
                    <span className="text-[10px] font-mono text-[#C084FC] font-bold">
                      {room.settings.skipThresholdPercent}%
                    </span>
                  </div>
                  <p className="text-[11px] text-zinc-500 mb-2.5">
                    Percentage of listeners required to skip a track.
                  </p>
                  <div className="grid grid-cols-3 gap-1.5">
                    {[33, 50, 66].map(pct => (
                      <button
                        key={pct}
                        type="button"
                        onClick={() => handleUpdateSettings({ skipThresholdPercent: pct })}
                        className={`py-1.5 px-2 rounded-xl text-xs font-semibold border transition-all ${
                          room.settings.skipThresholdPercent === pct
                            ? 'bg-[#8B5CF6]/25 border-[#8B5CF6] text-[#C084FC] shadow-sm'
                            : 'bg-white/[0.03] border-white/[0.06] text-zinc-400 hover:text-white hover:border-white/20'
                        }`}
                      >
                        {pct}% {pct === 33 ? 'Fast' : pct === 50 ? 'Default' : 'Strict'}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Share Modal / Popover ── */}
      {isShareOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md"
          onClick={e => { if (e.target === e.currentTarget) setIsShareOpen(false); }}
        >
          <div
            className="relative w-full max-w-sm rounded-3xl bg-[#121320]/95 border border-white/[0.1] p-5 shadow-2xl backdrop-blur-2xl text-zinc-100 animate-in fade-in zoom-in-95 duration-150"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.08] mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#8B5CF6] to-[#D946EF] flex items-center justify-center shadow-md shadow-[#8B5CF6]/25">
                  <Share2 className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white leading-none">Share Jam Room</h3>
                  <p className="text-[11px] text-zinc-400 mt-0.5">Invite friends to listen in sync</p>
                </div>
              </div>
              <button
                onClick={() => setIsShareOpen(false)}
                className="w-7 h-7 rounded-full bg-white/[0.05] hover:bg-white/[0.1] flex items-center justify-center text-zinc-400 hover:text-white transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Room Code Box */}
            <div className="mb-4 p-3.5 rounded-2xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-between">
              <div>
                <div className="text-[10px] uppercase font-mono tracking-wider text-zinc-500">Room Code</div>
                <div className="text-lg font-mono font-bold text-white tracking-widest mt-0.5">{room.id}</div>
              </div>
              <button
                onClick={() => copyToClipboard(room.id, 'code')}
                className="px-3.5 py-1.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] text-xs font-semibold text-zinc-200 flex items-center gap-1.5 transition-all border border-white/[0.08] active:scale-95"
              >
                {copiedField === 'code' ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-400">Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-zinc-400" />
                    <span>Copy Code</span>
                  </>
                )}
              </button>
            </div>

            {/* Invite Link Box */}
            <div className="mb-4">
              <label className="block text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">
                Invite Link
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={getShareUrl(room.id)}
                  className="flex-1 min-w-0 bg-white/[0.04] border border-white/[0.08] rounded-xl px-3.5 py-2.5 text-xs font-mono text-zinc-200 truncate focus:outline-none focus:border-[#8B5CF6]/60 shadow-inner"
                  onClick={e => (e.target as HTMLInputElement).select()}
                />
                <button
                  onClick={() => copyToClipboard(getShareUrl(room.id), 'link')}
                  className="shrink-0 px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#8B5CF6] to-[#D946EF] hover:opacity-95 text-white font-semibold text-xs flex items-center gap-1.5 transition-all shadow-md shadow-[#8B5CF6]/20 active:scale-95"
                >
                  {copiedField === 'link' ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-white" />
                      <span>Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Social / Direct Share */}
            <div className="pt-3.5 border-t border-white/[0.08] space-y-2">
              <div className="text-[10px] uppercase font-mono tracking-wider text-zinc-500 mb-2">Share Directly</div>
              <div className="grid grid-cols-2 gap-2">
                {/* WhatsApp */}
                <button
                  onClick={() => {
                    const text = `Join my JamFlow room: ${room.name || room.id}\nRoom Code: ${room.id}\n`;
                    const url = getShareUrl(room.id);
                    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text + url)}`, '_blank');
                  }}
                  className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-[#25D366]/10 hover:bg-[#25D366]/20 border border-[#25D366]/30 text-[#25D366] text-xs font-medium transition-all active:scale-95"
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                  <span>WhatsApp</span>
                </button>

                {/* Telegram */}
                <button
                  onClick={() => {
                    const text = `Join my JamFlow room: ${room.name || room.id} (Code: ${room.id})`;
                    const url = getShareUrl(room.id);
                    window.open(`https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`, '_blank');
                  }}
                  className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-[#0088cc]/10 hover:bg-[#0088cc]/20 border border-[#0088cc]/30 text-[#0088cc] text-xs font-medium transition-all active:scale-95"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Telegram</span>
                </button>
              </div>

              {/* Native OS Share Button */}
              {hasNativeShare && (
                <button
                  onClick={async () => {
                    try {
                      await navigator.share({
                        title: `JamFlow — ${room.name || room.id}`,
                        text: `Listen to music in sync with me on JamFlow! Room Code: ${room.id}`,
                        url: getShareUrl(room.id),
                      });
                      showToast('Shared successfully!');
                      setIsShareOpen(false);
                    } catch (err: any) {
                      if (err?.name !== 'AbortError') {
                        showToast('System share unavailable.');
                      }
                    }
                  }}
                  className="w-full mt-2 py-2.5 px-3 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-zinc-200 text-xs font-medium flex items-center justify-center gap-2 transition-all border border-white/[0.08] active:scale-95"
                >
                  <Smartphone className="w-3.5 h-3.5 text-zinc-400" />
                  <span>Open System Share ({isAndroid ? 'Android' : 'OS'})</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Body ── */}
      <div className="flex-1 flex overflow-hidden min-h-0">

        {/* ━━━━ MOBILE layout (flex-col, only when isMobile is true) ━━━━ */}
        {isMobile === true && (
          <div className="flex flex-col w-full overflow-hidden">
            {/* Mini player — fixed height or sticky bar when expanded */}
            <div className="shrink-0">
              <YouTubePlayer
                compact
                minimized={isMobileExpanded}
                onToggleMinimize={() => setIsMobileExpanded(prev => !prev)}
                currentTrack={room.currentTrack}
                playbackState={playbackState}
                serverPosition={serverPosition}
                lastSyncTimestamp={lastSyncTimestamp}
                canControl={canControl}
                hasQueue={room.queue.length > 0}
                onSkipNext={() => {
                  if (room.queue.length > 0) handleSkipTo(room.queue[0].id);
                }}
                onPlay={handlePlay}
                onPause={handlePause}
                onSeek={handleSeekAction}
                onTrackEnded={handleTrackEnded}
              />
            </div>

            {/* Queue / Chat — gets all remaining height */}
            <div className="flex-1 min-h-0 flex flex-col border-t border-white/[0.08] bg-[#0E0F18]/95 backdrop-blur-xl">
              {/* Sleek Segmented Switcher with Expand / Split Toggle */}
              <div className="shrink-0 px-4 py-3 bg-[#0C0D16]/60 backdrop-blur-xl border-b border-white/[0.06] flex items-center gap-3">
                <div className="flex-1 flex p-1 bg-white/[0.04] border border-white/[0.08] rounded-2xl shadow-inner">
                  <button
                    onClick={() => switchTab('queue')}
                    className={`flex-1 py-2.5 text-sm font-bold tracking-wide flex items-center justify-center gap-2 rounded-xl transition-all duration-200 ${
                      mobileTab === 'queue'
                        ? 'bg-gradient-to-r from-[#8B5CF6] to-[#7C3AED] text-white shadow-md shadow-[#8B5CF6]/30'
                        : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.03]'
                    }`}
                  >
                    <ListMusic className="w-4 h-4" />
                    <span>Queue</span>
                    {room.queue.length > 0 && (
                      <span
                        className={`px-1.5 py-0.5 rounded-full text-xs font-mono font-semibold transition-colors ${
                          mobileTab === 'queue'
                            ? 'bg-white/25 text-white'
                            : 'bg-white/[0.08] text-zinc-400'
                        }`}
                      >
                        {room.queue.length}
                      </span>
                    )}
                  </button>
                  <button
                    onClick={() => switchTab('chat')}
                    className={`flex-1 py-2.5 text-sm font-bold tracking-wide flex items-center justify-center gap-2 rounded-xl transition-all duration-200 ${
                      mobileTab === 'chat'
                        ? 'bg-gradient-to-r from-[#8B5CF6] to-[#7C3AED] text-white shadow-md shadow-[#8B5CF6]/30'
                        : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.03]'
                    }`}
                  >
                    <MessageSquare className="w-4 h-4" />
                    <span>Chat</span>
                    {unreadChatCount > 0 && (
                      <span className="px-1.5 py-0.5 rounded-full bg-gradient-to-r from-[#D946EF] to-rose-500 text-white text-xs font-bold font-mono shadow-[0_0_8px_rgba(217,70,239,0.7)] animate-pulse">
                        {unreadChatCount}
                      </span>
                    )}
                  </button>
                </div>

                {/* Expand / Collapse Button to toggle full-screen Queue/Chat */}
                <button
                  onClick={() => setIsMobileExpanded(prev => !prev)}
                  className="px-4 py-3 rounded-2xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-zinc-300 hover:text-white flex items-center gap-2 text-sm font-semibold active:scale-95 transition-all shadow-sm shrink-0"
                  title={isMobileExpanded ? "Split Screen View" : "Maximize Queue/Chat Space"}
                >
                  {isMobileExpanded ? (
                    <>
                      <Minimize2 className="w-4 h-4 text-[#C084FC]" />
                      <span className="hidden xs:inline">Split</span>
                    </>
                  ) : (
                    <>
                      <Maximize2 className="w-4 h-4 text-[#C084FC]" />
                      <span className="hidden xs:inline">Expand</span>
                    </>
                  )}
                </button>
              </div>

              {/* Panel content */}
              <div className="flex-1 min-h-0 overflow-hidden">
                {mobileTab === 'queue' ? <QueueList {...queueProps} userCount={room.users.length} /> : <ChatAndReactions {...chatProps} />}
              </div>
            </div>
          </div>
        )}

        {/* ━━━━ DESKTOP layout (flex-row, when not mobile) ━━━━ */}
        {isMobile !== true && (
          <div className="flex w-full overflow-hidden flex-1 min-h-0">
            {/* Left — Now Playing (~70%) */}
            <div className="flex-1 min-w-0 relative h-full">
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
                onSkipNext={() => {
                  if (room.queue.length > 0) handleSkipTo(room.queue[0].id);
                }}
                onPlay={handlePlay}
                onPause={handlePause}
                onSeek={handleSeekAction}
                onTrackEnded={handleTrackEnded}
              />
            </div>

            {/* Right — sidebar (~30% / 340-380px) */}
            <div className="w-[340px] xl:w-[380px] shrink-0 border-l border-white/[0.08] flex flex-col bg-[#0D0E17]/95 backdrop-blur-2xl">
              {/* Desktop Sidebar tab switcher */}
              <div className="shrink-0 p-3 border-b border-white/[0.06] bg-[#0C0D16]/80">
                <div className="flex p-1 bg-white/[0.04] border border-white/[0.08] rounded-xl shadow-inner">
                  <button
                    onClick={() => switchTab('queue')}
                    className={`flex-1 py-2 text-xs font-bold tracking-wide flex items-center justify-center gap-2 rounded-lg transition-all duration-200 ${
                      desktopTab === 'queue'
                        ? 'bg-gradient-to-r from-[#8B5CF6] to-[#7C3AED] text-white shadow-md shadow-[#8B5CF6]/30'
                        : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.03]'
                    }`}
                  >
                    <ListMusic className="w-3.5 h-3.5" />
                    <span>Queue</span>
                    {room.queue.length > 0 && (
                      <span
                        className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono font-semibold transition-colors ${
                          desktopTab === 'queue'
                            ? 'bg-white/25 text-white'
                            : 'bg-white/[0.08] text-zinc-400'
                        }`}
                      >
                        {room.queue.length}
                      </span>
                    )}
                  </button>
                  <button
                    onClick={() => switchTab('chat')}
                    className={`flex-1 py-2 text-xs font-bold tracking-wide flex items-center justify-center gap-2 rounded-lg transition-all duration-200 ${
                      desktopTab === 'chat'
                        ? 'bg-gradient-to-r from-[#8B5CF6] to-[#7C3AED] text-white shadow-md shadow-[#8B5CF6]/30'
                        : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.03]'
                    }`}
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>Chat</span>
                    {unreadChatCount > 0 && (
                      <span className="px-1.5 py-0.2 rounded-full bg-gradient-to-r from-[#D946EF] to-rose-500 text-white text-[10px] font-bold font-mono shadow-[0_0_8px_rgba(217,70,239,0.7)] animate-pulse">
                        {unreadChatCount}
                      </span>
                    )}
                  </button>
                </div>
              </div>

              <div className="flex-1 min-h-0 overflow-hidden">
                {desktopTab === 'queue' ? <QueueList {...queueProps} userCount={room.users.length} /> : <ChatAndReactions {...chatProps} />}
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
