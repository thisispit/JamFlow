'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Radio,
  Share2,
  Check,
  LogOut,
  Users,
  Music,
  Crown,
  Sparkles,
  AlertCircle,
  Copy,
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

  const [username, setUsername] = useState<string>('');
  const [hasPromptedUser, setHasPromptedUser] = useState<boolean>(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [room, setRoom] = useState<Room | null>(null);
  const [reactions, setReactions] = useState<Reaction[]>([]);
  const [copiedLink, setCopiedLink] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Playback sync state
  const [playbackState, setPlaybackState] = useState<PlaybackState>('paused');
  const [serverPosition, setServerPosition] = useState<number>(0);
  const [lastSyncTimestamp, setLastSyncTimestamp] = useState<number>(Date.now());

  // Check username in sessionStorage
  useEffect(() => {
    const saved = sessionStorage.getItem('jamflow_username');
    if (saved) {
      setUsername(saved);
      setHasPromptedUser(true);
    } else {
      setHasPromptedUser(false);
      setIsLoading(false);
    }
  }, []);

  // Join Room socket handler
  const joinRoomWithUser = useCallback(
    (nameToUse: string) => {
      if (!roomId || !nameToUse) return;
      setIsLoading(true);
      setErrorMessage(null);

      const socket = getSocket();

      socket.emit('room:join', { roomId, username: nameToUse }, (res) => {
        setIsLoading(false);
        if (res.success && res.room && res.user) {
          setRoom(res.room);
          setCurrentUser(res.user);
          setPlaybackState(res.room.playbackState);
          setServerPosition(res.room.position);
          setLastSyncTimestamp(res.room.lastSyncTimestamp);
          sessionStorage.setItem('jamflow_username', nameToUse);
        } else {
          setErrorMessage(res.error || 'Failed to join room');
        }
      });
    },
    [roomId]
  );

  // Initial Join once username is established
  useEffect(() => {
    if (hasPromptedUser && username && roomId) {
      joinRoomWithUser(username);
    }
  }, [hasPromptedUser, username, roomId, joinRoomWithUser]);

  // Set up socket event listeners
  useEffect(() => {
    const socket = getSocket();

    const handleRoomState = (updatedRoom: Room) => {
      setRoom(updatedRoom);
      setPlaybackState(updatedRoom.playbackState);
      setServerPosition(updatedRoom.position);
      setLastSyncTimestamp(updatedRoom.lastSyncTimestamp);
      const me = updatedRoom.users.find((u) => u.id === socket.id);
      if (me) setCurrentUser(me);
    };

    const handleUserJoined = (newUser: User) => {
      setRoom((prev) => {
        if (!prev) return null;
        if (prev.users.some((u) => u.id === newUser.id)) return prev;
        return {
          ...prev,
          users: [...prev.users, newUser],
        };
      });
    };

    const handleUserLeft = (data: { userId: string; username: string; newHostId?: string }) => {
      setRoom((prev) => {
        if (!prev) return null;
        const updatedUsers = prev.users.filter((u) => u.id !== data.userId);
        let updatedHostId = prev.hostId;
        if (data.newHostId) {
          updatedHostId = data.newHostId;
          updatedUsers.forEach((u) => {
            u.isHost = u.id === data.newHostId;
            if (u.isHost) u.isDJ = true;
          });
        }
        return {
          ...prev,
          hostId: updatedHostId,
          users: updatedUsers,
        };
      });

      if (data.newHostId && socket.id === data.newHostId) {
        setCurrentUser((prev) => (prev ? { ...prev, isHost: true, isDJ: true } : null));
      }
    };

    const handleHostChanged = (data: { hostId: string; hostUsername: string }) => {
      setRoom((prev) => {
        if (!prev) return null;
        const updatedUsers = prev.users.map((u) => ({
          ...u,
          isHost: u.id === data.hostId,
          isDJ: u.id === data.hostId ? true : u.isDJ,
        }));
        return {
          ...prev,
          hostId: data.hostId,
          users: updatedUsers,
        };
      });

      if (socket.id === data.hostId) {
        setCurrentUser((prev) => (prev ? { ...prev, isHost: true, isDJ: true } : null));
      }
    };

    const handleSettingsUpdated = (settings: RoomSettings) => {
      setRoom((prev) => (prev ? { ...prev, settings } : null));
    };

    const handlePlaybackSync = (data: {
      currentTrack: Track | null;
      playbackState: PlaybackState;
      position: number;
      timestamp: number;
    }) => {
      setRoom((prev) => (prev ? { ...prev, currentTrack: data.currentTrack } : null));
      setPlaybackState(data.playbackState);
      setServerPosition(data.position);
      setLastSyncTimestamp(data.timestamp);
    };

    const handlePlaybackPlay = (data: { position: number; timestamp: number }) => {
      setPlaybackState('playing');
      setServerPosition(data.position);
      setLastSyncTimestamp(data.timestamp);
    };

    const handlePlaybackPause = (data: { position: number; timestamp: number }) => {
      setPlaybackState('paused');
      setServerPosition(data.position);
      setLastSyncTimestamp(data.timestamp);
    };

    const handlePlaybackSeek = (data: { position: number; timestamp: number }) => {
      setServerPosition(data.position);
      setLastSyncTimestamp(data.timestamp);
    };

    const handleQueueUpdated = (queue: Track[]) => {
      setRoom((prev) => (prev ? { ...prev, queue } : null));
    };

    const handleTrackStarted = (track: Track | null) => {
      setRoom((prev) => (prev ? { ...prev, currentTrack: track } : null));
      setPlaybackState('playing');
      setServerPosition(0);
      setLastSyncTimestamp(Date.now());
    };

    const handleVoteSkipUpdated = (voteSkip: Room['voteSkip']) => {
      setRoom((prev) => (prev ? { ...prev, voteSkip } : null));
    };

    const handleNewChatMessage = (msg: any) => {
      setRoom((prev) => {
        if (!prev) return null;
        if (prev.chat.some((m) => m.id === msg.id)) return prev;
        return {
          ...prev,
          chat: [...prev.chat.slice(-99), msg],
        };
      });

      // If vote to skip passed, trigger celebratory confetti!
      if (msg.isSystem && msg.content.includes('Vote to skip passed')) {
        try {
          confetti({
            particleCount: 50,
            spread: 60,
            origin: { y: 0.7 },
          });
        } catch {}
      }
    };

    const handleNewReaction = (reaction: Reaction) => {
      setReactions((prev) => [...prev.slice(-15), reaction]);
    };

    const handleErrorNotification = (data: { message: string }) => {
      setErrorMessage(data.message);
      setTimeout(() => setErrorMessage(null), 4000);
    };

    socket.on('room:state', handleRoomState);
    socket.on('room:user_joined', handleUserJoined);
    socket.on('room:user_left', handleUserLeft);
    socket.on('room:host_changed', handleHostChanged);
    socket.on('room:settings_updated', handleSettingsUpdated);
    socket.on('playback:sync', handlePlaybackSync);
    socket.on('playback:play', handlePlaybackPlay);
    socket.on('playback:pause', handlePlaybackPause);
    socket.on('playback:seek', handlePlaybackSeek);
    socket.on('queue:updated', handleQueueUpdated);
    socket.on('queue:track_started', handleTrackStarted);
    socket.on('queue:vote_skip_updated', handleVoteSkipUpdated);
    socket.on('chat:new_message', handleNewChatMessage);
    socket.on('reaction:new', handleNewReaction);
    socket.on('error:notification', handleErrorNotification);

    return () => {
      socket.off('room:state', handleRoomState);
      socket.off('room:user_joined', handleUserJoined);
      socket.off('room:user_left', handleUserLeft);
      socket.off('room:host_changed', handleHostChanged);
      socket.off('room:settings_updated', handleSettingsUpdated);
      socket.off('playback:sync', handlePlaybackSync);
      socket.off('playback:play', handlePlaybackPlay);
      socket.off('playback:pause', handlePlaybackPause);
      socket.off('playback:seek', handlePlaybackSeek);
      socket.off('queue:updated', handleQueueUpdated);
      socket.off('queue:track_started', handleTrackStarted);
      socket.off('queue:vote_skip_updated', handleVoteSkipUpdated);
      socket.off('chat:new_message', handleNewChatMessage);
      socket.off('reaction:new', handleNewReaction);
      socket.off('error:notification', handleErrorNotification);
    };
  }, []);

  // Playback actions
  const handlePlay = (pos: number) => {
    const socket = getSocket();
    socket.emit('playback:play', { position: pos });
  };

  const handlePause = (pos: number) => {
    const socket = getSocket();
    socket.emit('playback:pause', { position: pos });
  };

  const handleSeek = (pos: number) => {
    const socket = getSocket();
    socket.emit('playback:seek', { position: pos });
  };

  const handleTrackEnded = (trackId: string) => {
    const socket = getSocket();
    socket.emit('playback:track_ended', { trackId });
  };

  // Queue actions
  const handleAddTrack = (url: string): Promise<boolean> => {
    return new Promise((resolve) => {
      const socket = getSocket();
      socket.emit('queue:add', { url }, (res) => {
        resolve(res.success);
      });
    });
  };

  const handleRemoveTrack = (trackId: string) => {
    const socket = getSocket();
    socket.emit('queue:remove', { trackId });
  };

  const handleReorder = (startIndex: number, endIndex: number) => {
    const socket = getSocket();
    socket.emit('queue:reorder', { startIndex, endIndex });
  };

  const handleSkipTo = (trackId: string) => {
    const socket = getSocket();
    socket.emit('queue:skip_to', { trackId });
  };

  const handleClearQueue = () => {
    const socket = getSocket();
    socket.emit('queue:clear');
  };

  const handleVoteSkip = () => {
    const socket = getSocket();
    socket.emit('queue:vote_skip');
  };

  // Social actions
  const handleSendMessage = (content: string) => {
    const socket = getSocket();
    socket.emit('chat:send', { content });
  };

  const handleSendReaction = (emoji: string) => {
    const socket = getSocket();
    socket.emit('reaction:send', { emoji });
  };

  // Roles & settings actions
  const handleTransferHost = (targetUserId: string) => {
    const socket = getSocket();
    socket.emit('room:transfer_host', { targetUserId });
  };

  const handleToggleDJ = (targetUserId: string) => {
    const socket = getSocket();
    socket.emit('room:toggle_dj', { targetUserId });
  };

  const handleUpdateSettings = (newSettings: Partial<RoomSettings>) => {
    const socket = getSocket();
    socket.emit('room:update_settings', newSettings);
  };

  const handleCopyLink = () => {
    if (typeof window !== 'undefined') {
      navigator.clipboard.writeText(window.location.href);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  const handleLeaveRoom = () => {
    const socket = getSocket();
    socket.emit('room:leave');
    router.push('/');
  };

  // Permissions check
  const canControl =
    room?.settings.isOpenControl || currentUser?.isHost || currentUser?.isDJ || false;
  const canAdd =
    room?.settings.isOpenQueue || currentUser?.isHost || currentUser?.isDJ || false;

  // Render Prompt Modal if username missing
  if (!hasPromptedUser) {
    return (
      <main className="min-h-screen bg-zinc-950 flex items-center justify-center p-6 relative overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[300px] bg-fuchsia-600/15 blur-[120px] pointer-events-none rounded-full" />
        <div className="w-full max-w-md p-8 rounded-3xl bg-zinc-900/90 border border-zinc-800 shadow-2xl relative z-10 text-center">
          <div className="w-16 h-16 rounded-2xl bg-fuchsia-600/20 border border-fuchsia-500/30 text-fuchsia-400 flex items-center justify-center mx-auto mb-5 shadow-lg shadow-fuchsia-500/10">
            <Radio className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Join Jam Room {roomId}</h2>
          <p className="text-zinc-400 text-sm mb-6">
            Choose a nickname to start listening in sync with everyone.
          </p>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (username.trim()) {
                setHasPromptedUser(true);
                joinRoomWithUser(username.trim());
              }
            }}
            className="space-y-4"
          >
            <input
              type="text"
              placeholder="Your nickname (e.g. Maya)"
              autoFocus
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-fuchsia-500"
            />
            <button
              type="submit"
              className="w-full py-3 rounded-xl bg-gradient-to-r from-fuchsia-600 to-purple-600 hover:from-fuchsia-500 hover:to-purple-500 text-white font-semibold text-sm shadow-lg shadow-fuchsia-600/25 transition-all"
            >
              Enter Room
            </button>
          </form>
        </div>
      </main>
    );
  }

  // Loading state
  if (isLoading || !room) {
    return (
      <main className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-6 text-center">
        {errorMessage ? (
          <div className="max-w-md p-6 rounded-2xl bg-zinc-900 border border-rose-500/30 text-rose-300 space-y-4">
            <AlertCircle className="w-10 h-10 text-rose-400 mx-auto" />
            <h3 className="text-lg font-bold text-white">Room Error</h3>
            <p className="text-sm text-zinc-400">{errorMessage}</p>
            <button
              onClick={() => router.push('/')}
              className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-semibold"
            >
              Back to Home
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3">
            <div className="w-10 h-10 border-4 border-fuchsia-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm font-medium text-zinc-400">Connecting to {roomId}...</p>
          </div>
        )}
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-zinc-950 flex flex-col text-zinc-100 relative">
      {/* Floating Reactions overlay */}
      <FloatingReactions reactions={reactions} />

      {/* Notification Toast */}
      {errorMessage && (
        <div className="fixed top-5 right-5 z-50 px-4 py-2.5 rounded-xl bg-rose-950/90 border border-rose-700 text-rose-200 text-xs shadow-xl backdrop-blur-md flex items-center gap-2 animate-bounce">
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Top Navbar */}
      <header className="border-b border-zinc-800/80 bg-zinc-900/60 backdrop-blur-xl sticky top-0 z-30 px-4 sm:px-6 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            onClick={() => router.push('/')}
            className="flex items-center gap-2 cursor-pointer group"
          >
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-fuchsia-600 to-purple-600 flex items-center justify-center text-white shadow-md shadow-fuchsia-600/20">
              <Radio className="w-4 h-4" />
            </div>
            <span className="font-extrabold text-sm tracking-tight text-white hidden sm:inline">
              Jam<span className="text-fuchsia-500">Flow</span>
            </span>
          </div>

          <div className="h-4 w-[1px] bg-zinc-800 hidden sm:block" />

          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-zinc-100 truncate max-w-[160px] sm:max-w-xs">
                {room.name}
              </h2>
              <button
                onClick={handleCopyLink}
                className="px-2 py-0.5 rounded-md bg-zinc-800/80 hover:bg-zinc-700/80 border border-zinc-700/50 text-[11px] font-mono text-zinc-300 flex items-center gap-1 transition-colors"
                title="Copy Room Code"
              >
                <span>{room.id}</span>
                {copiedLink ? (
                  <Check className="w-3 h-3 text-emerald-400" />
                ) : (
                  <Copy className="w-3 h-3 text-zinc-400" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Right actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={handleCopyLink}
            className="px-3 py-1.5 rounded-xl bg-zinc-800/80 hover:bg-zinc-700/80 text-zinc-300 hover:text-white border border-zinc-700/60 text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm"
          >
            {copiedLink ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span>Link Copied</span>
              </>
            ) : (
              <>
                <Share2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Share Room</span>
              </>
            )}
          </button>

          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-900/90 border border-zinc-800 text-xs text-zinc-400">
            <Users className="w-3.5 h-3.5 text-fuchsia-400" />
            <span className="font-semibold text-zinc-200">{room.users.length}</span>
            <span className="hidden sm:inline">listeners</span>
          </div>

          <button
            onClick={handleLeaveRoom}
            className="p-1.5 rounded-xl text-zinc-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
            title="Leave Room"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 max-w-[1550px] w-full mx-auto p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: YouTube Player & Controls (7 cols on lg, 8 cols on xl) */}
        <div className="lg:col-span-7 xl:col-span-7 space-y-4">
          <YouTubePlayer
            currentTrack={room.currentTrack}
            playbackState={playbackState}
            serverPosition={serverPosition}
            lastSyncTimestamp={lastSyncTimestamp}
            canControl={canControl}
            onPlay={handlePlay}
            onPause={handlePause}
            onSeek={handleSeek}
            onTrackEnded={handleTrackEnded}
          />

          {/* Quick Host Notice Bar */}
          <div className="p-3 rounded-xl bg-zinc-900/40 border border-zinc-800/80 flex items-center justify-between text-xs text-zinc-400">
            <div className="flex items-center gap-2">
              <Crown className="w-4 h-4 text-amber-400" />
              <span>
                Host: <strong className="text-zinc-200">{room.users.find((u) => u.isHost)?.username || 'Host'}</strong>
              </span>
            </div>
            <div>
              <span className="text-zinc-500">
                Mode:{' '}
                <strong className="text-zinc-300">
                  {room.settings.isOpenControl ? 'Collaborative (All Controls)' : 'DJ / Host Only'}
                </strong>
              </span>
            </div>
          </div>
        </div>

        {/* Right Column: Queue (5 cols) & Chat */}
        <div className="lg:col-span-5 xl:col-span-5 grid grid-cols-1 gap-6 h-[calc(100vh-140px)] min-h-[600px]">
          {/* Top Half: Queue List */}
          <div className="h-[48%] min-h-[280px]">
            <QueueList
              queue={room.queue}
              currentTrack={room.currentTrack}
              currentUser={currentUser}
              voteSkip={room.voteSkip}
              canControl={canControl}
              canAdd={canAdd}
              onAddTrack={handleAddTrack}
              onRemoveTrack={handleRemoveTrack}
              onReorder={handleReorder}
              onSkipTo={handleSkipTo}
              onClearQueue={handleClearQueue}
              onVoteSkip={handleVoteSkip}
            />
          </div>

          {/* Bottom Half: Chat, Reactions & Participants */}
          <div className="h-[48%] min-h-[280px]">
            <ChatAndReactions
              chat={room.chat}
              users={room.users}
              currentUser={currentUser}
              settings={room.settings}
              onSendMessage={handleSendMessage}
              onSendReaction={handleSendReaction}
              onTransferHost={handleTransferHost}
              onToggleDJ={handleToggleDJ}
              onUpdateSettings={handleUpdateSettings}
            />
          </div>
        </div>
      </div>
    </main>
  );
}
