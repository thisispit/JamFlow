'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Play, Pause, Volume2, VolumeX, RotateCcw, Music, Music2, Film, Maximize, Minimize, FastForward, Crown, Radio, ChevronDown } from 'lucide-react';
import { Track, PlaybackState, User } from '@/types';
import { formatTime } from '@/lib/youtube';

interface YouTubePlayerProps {
  currentTrack: Track | null;
  playbackState: PlaybackState;
  serverPosition: number;
  lastSyncTimestamp: number;
  canControl: boolean;
  compact?: boolean; // Mini-player mode for mobile
  minimized?: boolean; // Ultra-compact sticky bar on mobile to give Queue/Chat max height
  onToggleMinimize?: () => void;
  users?: User[];
  currentUser?: User | null;
  hasQueue?: boolean;
  userCount?: number;
  onSkipNext?: () => void;
  onOpenListeners?: () => void;
  onPlay: (position: number) => void;
  onPause: (position: number) => void;
  onSeek: (position: number) => void;
  onTrackEnded: (trackId: string) => void;
}


const SoundVisualizer: React.FC<{ isPlaying: boolean }> = ({ isPlaying }) => {
  const bars = [4, 7, 5, 9, 8, 4, 8, 6, 9, 7, 5, 8, 4];
  return (
    <div className="flex items-end justify-center gap-[3px] h-4 py-0.5 select-none" aria-hidden="true">
      {bars.map((h, i) => (
        <span
          key={i}
          className={`w-[3px] rounded-full transition-all duration-200 ${
            isPlaying
              ? 'bg-gradient-to-t from-[#8B5CF6] to-[#D946EF] shadow-[0_0_6px_rgba(217,70,239,0.5)]'
              : 'bg-zinc-700 opacity-35'
          }`}
          style={{
            height: isPlaying ? `${Math.max(4, h * 1.5)}px` : '3px',
            animation: isPlaying ? `audioPulse 0.8s ease-in-out ${i * 0.07}s infinite alternate` : 'none',
          }}
        />
      ))}
    </div>
  );
};

const JamFlowAlbumArt: React.FC<{ size?: 'compact' | 'default' }> = ({ size = 'default' }) => {
  const isCompact = size === 'compact';
  return (
    <div
      className={`relative flex flex-col items-center justify-center select-none overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-b from-[#181126] via-[#100b1a] to-[#09090B] shadow-2xl transition-all duration-300 ${
        isCompact ? 'h-full aspect-square p-2.5 max-h-[195px]' : 'w-full h-full p-6'
      }`}
      style={{
        boxShadow: '0 0 35px -5px rgba(139, 92, 246, 0.35), 0 20px 40px -15px rgba(0,0,0,0.9)',
      }}
    >
      {/* Vinyl record preview / glowing center */}
      <div className="relative flex items-center justify-center mb-2">
        {/* Ambient glow */}
        <div className="absolute w-20 h-20 rounded-full bg-gradient-to-tr from-[#8B5CF6] to-[#D946EF] blur-xl opacity-40 animate-pulse" />

        {/* Outer vinyl disc */}
        <div
          className={`relative rounded-full border border-white/10 bg-[#0c0c10] flex items-center justify-center shadow-xl ${
            isCompact ? 'w-16 h-16' : 'w-24 h-24'
          }`}
        >
          {/* Subtle concentric grooves */}
          <div className="absolute inset-1.5 rounded-full border border-white/[0.04]" />
          <div className="absolute inset-3 rounded-full border border-white/[0.04]" />
          <div className="absolute inset-4.5 rounded-full border border-white/[0.04]" />

          {/* Center label */}
          <div
            className={`rounded-full bg-gradient-to-tr from-[#8B5CF6] via-[#A855F7] to-[#D946EF] flex items-center justify-center shadow-[0_0_15px_rgba(139,92,246,0.6)] ${
              isCompact ? 'w-7 h-7' : 'w-10 h-10'
            }`}
          >
            <Radio className={`${isCompact ? 'w-3.5 h-3.5' : 'w-5 h-5'} text-white`} />
          </div>
        </div>
      </div>

      {/* Typography */}
      <span className="text-white font-black text-xs tracking-[0.25em] uppercase block drop-shadow-sm">
        JAMFLOW
      </span>
      <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#C084FC] to-[#F472B6] text-[10px] font-mono tracking-widest uppercase mt-0.5 font-semibold">
        OFFICIAL FLOW
      </span>
      {!isCompact && (
        <span className="text-zinc-400 text-[11px] mt-2 font-mono">
          Ready for tracks • Perfect sync
        </span>
      )}
    </div>
  );
};

export const YouTubePlayer: React.FC<YouTubePlayerProps> = ({
  currentTrack,
  playbackState,
  serverPosition,
  lastSyncTimestamp,
  canControl,
  compact = false,
  minimized = false,
  onToggleMinimize,
  users = [],
  currentUser = null,
  hasQueue = false,
  userCount = 1,
  onSkipNext,
  onOpenListeners,
  onPlay,
  onPause,
  onSeek,
  onTrackEnded,
}) => {
  const playerRef = useRef<any>(null);
  const isPlayerReadyRef = useRef(false);
  const isInternalActionRef = useRef(false);
  const internalActionTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Live refs — always current inside stale YT callbacks
  const currentTrackRef = useRef<Track | null>(currentTrack);
  const playbackStateRef = useRef<PlaybackState>(playbackState);
  const canControlRef = useRef(canControl);
  const onTrackEndedRef = useRef(onTrackEnded);
  const onPlayRef = useRef(onPlay);
  const onPauseRef = useRef(onPause);

  useEffect(() => { currentTrackRef.current = currentTrack; }, [currentTrack]);
  useEffect(() => { playbackStateRef.current = playbackState; }, [playbackState]);
  useEffect(() => { canControlRef.current = canControl; }, [canControl]);
  useEffect(() => { onTrackEndedRef.current = onTrackEnded; }, [onTrackEnded]);
  useEffect(() => { onPlayRef.current = onPlay; }, [onPlay]);
  useEffect(() => { onPauseRef.current = onPause; }, [onPause]);

  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(80);
  const [isMuted, setIsMuted] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [needsGesture, setNeedsGesture] = useState(false);
  const [playerError, setPlayerError] = useState<string | null>(null);
  const [showDrift, setShowDrift] = useState(false);

  const setInternalAction = useCallback((durationMs = 3000) => {
    isInternalActionRef.current = true;
    if (internalActionTimerRef.current) clearTimeout(internalActionTimerRef.current);
    internalActionTimerRef.current = setTimeout(() => { isInternalActionRef.current = false; }, durationMs);
  }, []);

  // YouTube Music style Song vs Video toggle
  const [viewMode, setViewMode] = useState<'song' | 'video'>('song');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showFullscreenControls, setShowFullscreenControls] = useState(true);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const playerRootRef = useRef<HTMLDivElement>(null);
  const videoContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('jamflow_view_mode') as 'song' | 'video';
      if (saved === 'song' || saved === 'video') setViewMode(saved);
    } catch {}
  }, []);

  const resetControlsTimer = useCallback(() => {
    setShowFullscreenControls(true);
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    if (playbackStateRef.current === 'playing') {
      controlsTimeoutRef.current = setTimeout(() => {
        setShowFullscreenControls(false);
      }, 3000);
    }
  }, []);

  const enterFullscreen = useCallback(() => {
    setViewMode('video');
    const el = videoContainerRef.current || playerRootRef.current;
    if (el) {
      const isCurrentlyFs = !!(
        document.fullscreenElement ||
        (document as any).webkitFullscreenElement ||
        (document as any).mozFullScreenElement ||
        (document as any).msFullscreenElement
      );
      if (!isCurrentlyFs) {
        try {
          const p = el.requestFullscreen?.() ||
            (el as any).webkitRequestFullscreen?.() ||
            (el as any).mozRequestFullScreen?.() ||
            (el as any).msRequestFullscreen?.();
          if (p && typeof p.catch === 'function') {
            p.catch(() => {});
          }
        } catch {}
      }
    }
    setIsFullscreen(true);
    setShowFullscreenControls(true);
    resetControlsTimer();
    // Guarantee continuous playback across fullscreen geometry changes
    if (playbackStateRef.current === 'playing') {
      setTimeout(() => {
        try {
          if (playerRef.current?.getPlayerState?.() !== window.YT?.PlayerState?.PLAYING) {
            playerRef.current?.playVideo?.();
          }
        } catch {}
      }, 150);
    }
  }, [resetControlsTimer]);

  const exitFullscreen = useCallback(() => {
    try {
      if (
        document.fullscreenElement ||
        (document as any).webkitFullscreenElement ||
        (document as any).mozFullScreenElement ||
        (document as any).msFullscreenElement
      ) {
        const exit = document.exitFullscreen?.() ||
          (document as any).webkitExitFullscreen?.() ||
          (document as any).mozCancelFullScreen?.() ||
          (document as any).msExitFullscreen?.();
        if (exit && typeof exit.catch === 'function') {
          exit.catch(() => {});
        }
      }
    } catch {}
    setIsFullscreen(false);
    if (playbackStateRef.current === 'playing') {
      setTimeout(() => {
        try {
          if (playerRef.current?.getPlayerState?.() !== window.YT?.PlayerState?.PLAYING) {
            playerRef.current?.playVideo?.();
          }
        } catch {}
      }, 150);
    }
  }, []);

  const handleToggleViewMode = useCallback((mode: 'song' | 'video') => {
    setViewMode(mode);
    try {
      localStorage.setItem('jamflow_view_mode', mode);
    } catch {}
  }, []);

  const toggleFullscreen = useCallback(() => {
    if (isFullscreen) {
      exitFullscreen();
    } else {
      enterFullscreen();
    }
  }, [isFullscreen, enterFullscreen, exitFullscreen]);

  // Keep controls visible when paused; auto-hide when playing in fullscreen
  useEffect(() => {
    if (playbackState !== 'playing') {
      setShowFullscreenControls(true);
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    } else if (isFullscreen) {
      resetControlsTimer();
    }
  }, [playbackState, isFullscreen, resetControlsTimer]);

  useEffect(() => {
    const onFsChange = () => {
      const isFs = !!(
        document.fullscreenElement ||
        (document as any).webkitFullscreenElement ||
        (document as any).mozFullScreenElement ||
        (document as any).msFullscreenElement
      );
      setIsFullscreen(isFs);
      if (isFs) {
        setShowFullscreenControls(true);
        resetControlsTimer();
      }
      if (playbackStateRef.current === 'playing') {
        setTimeout(() => {
          try {
            if (playerRef.current?.getPlayerState?.() !== window.YT?.PlayerState?.PLAYING) {
              playerRef.current?.playVideo?.();
            }
          } catch {}
        }, 150);
      }
    };
    document.addEventListener('fullscreenchange', onFsChange);
    document.addEventListener('webkitfullscreenchange', onFsChange);
    document.addEventListener('mozfullscreenchange', onFsChange);
    document.addEventListener('MSFullscreenChange', onFsChange);

    const onKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;
      if (e.key === 'Escape' && isFullscreen) {
        exitFullscreen();
      } else if ((e.key === 'f' || e.key === 'F') && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        toggleFullscreen();
      }
    };
    window.addEventListener('keydown', onKeyDown);

    return () => {
      document.removeEventListener('fullscreenchange', onFsChange);
      document.removeEventListener('webkitfullscreenchange', onFsChange);
      document.removeEventListener('mozfullscreenchange', onFsChange);
      document.removeEventListener('MSFullscreenChange', onFsChange);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [isFullscreen, exitFullscreen, toggleFullscreen, resetControlsTimer]);

  const lastSeekTimeRef = useRef<number>(0);
  const consecutiveDriftCountRef = useRef<number>(0);
  const isBufferingRef = useRef<boolean>(false);
  const isLiveRef = useRef<boolean>(false);

  const isLiveTrack = Boolean(
    currentTrack?.isLive ||
    currentTrack?.duration === 0 ||
    ['jfKfPfyJRdk', '4xDzrJKXOOY', '5yx6BWlEVcY', 'lP26UCnoH9s', 'Dx5qFachd3A', '5qap5aO4i9A'].includes(currentTrack?.videoId || '') ||
    /radio|live stream|24\/7|live broadcast/i.test(currentTrack?.title || '') ||
    isLiveRef.current
  );

  const doSeek = (targetSeconds: number, isDriftCorrection = false) => {
    if (!playerRef.current || !isPlayerReadyRef.current) return;
    if (isLiveTrack) return; // EXEMPT: Never seek live radio streams!
    lastSeekTimeRef.current = Date.now();
    consecutiveDriftCountRef.current = 0;
    if (isDriftCorrection) {
      setIsSyncing(true);
      setTimeout(() => setIsSyncing(false), 800);
    }
    playerRef.current.seekTo?.(targetSeconds, true);
  };

  const getExpectedServerPosition = useCallback(() => {
    if (isLiveTrack) return 0;
    if (playbackState !== 'playing') return serverPosition;
    return serverPosition + (Date.now() - lastSyncTimestamp) / 1000;
  }, [playbackState, serverPosition, lastSyncTimestamp, isLiveTrack]);

  // Load YT API script
  useEffect(() => {
    if (typeof window === 'undefined' || window.YT) return;
    const tag = document.createElement('script');
    tag.src = 'https://www.youtube.com/iframe_api';
    tag.async = true;
    document.head.appendChild(tag);
  }, []);

  // Init player once
  useEffect(() => {
    let interval: NodeJS.Timeout;
    const init = () => {
      if (!window.YT?.Player || !document.getElementById('jamflow-yt-hidden')) return false;
      playerRef.current = new window.YT.Player('jamflow-yt-hidden', {
        width: '100%',
        height: '100%',
        videoId: currentTrack?.videoId ?? '',
        playerVars: {
          autoplay: 0,
          controls: 0,
          disablekb: 1,
          enablejsapi: 1,
          fs: 1,
          modestbranding: 1,
          playsinline: 1,
          rel: 0,
          origin: window.location.origin,
        },
        events: {
          onReady: (e: any) => {
            isPlayerReadyRef.current = true;
            setPlayerError(null);
            e.target.setVolume?.(volume);
            doSeek(getExpectedServerPosition(), false);
            if (playbackStateRef.current === 'playing') e.target.playVideo?.();
            else e.target.pauseVideo?.();
          },
          onAutoplayBlocked: () => {
            setNeedsGesture(true);
          },
          onStateChange: (e: any) => {
            const S = window.YT.PlayerState;
            if (e.data === S.BUFFERING) {
              isBufferingRef.current = true;
            } else {
              isBufferingRef.current = false;
            }

            if (isInternalActionRef.current) return;
            const track = currentTrackRef.current;
            const pbState = playbackStateRef.current;
            if (!track) {
              if (e.data === S.PLAYING || e.data === S.BUFFERING) playerRef.current?.stopVideo?.();
              return;
            }
            if (e.data === S.ENDED) {
              onTrackEndedRef.current(track.id);
            } else if (e.data === S.PAUSED && pbState === 'playing') {
              // Transient pause from YouTube (buffering, layout change, or fullscreen switch)
              // Do NOT pause the room! Auto-resume playback:
              if (!isInternalActionRef.current) {
                playerRef.current?.playVideo?.();
              }
            }
          },
          onError: (e: any) => {
            const message = e.data === 150 || e.data === 101
              ? 'This YouTube stream does not allow embedded playback. Choose another station.'
              : e.data === 2
                ? 'YouTube rejected this stream ID. Choose another station or check the URL.'
                : `YouTube could not play this stream (error ${e.data}).`;
            setPlayerError(message);
            console.warn('YT error:', e.data);
          },
        },
      });
      return true;
    };
    if (!playerRef.current) {
      if (!init()) interval = setInterval(() => { if (init()) clearInterval(interval); }, 200);
    }
    return () => { if (interval) clearInterval(interval); };
  }, []);

  // Track change
  useEffect(() => {
    if (!playerRef.current || !isPlayerReadyRef.current) return;
    setPlayerError(null);
    setNeedsGesture(false);
    if (!currentTrack) { setInternalAction(); playerRef.current.stopVideo?.(); setCurrentTime(0); setDuration(0); return; }
    const loadedId = playerRef.current.getVideoData?.()?.video_id;
    if (loadedId !== currentTrack.videoId) {
      setInternalAction();
      isLiveRef.current = false;
      if (isLiveTrack) {
        // EXEMPT: Connect straight to live broadcast without startSeconds
        playerRef.current.loadVideoById({ videoId: currentTrack.videoId });
      } else {
        playerRef.current.loadVideoById({ videoId: currentTrack.videoId, startSeconds: getExpectedServerPosition() });
      }
      if (playbackState === 'playing') playerRef.current.playVideo();
      else playerRef.current.pauseVideo();
    }
  }, [currentTrack?.videoId, isLiveTrack]);

  // Server sync
  useEffect(() => {
    if (!playerRef.current || !isPlayerReadyRef.current || isInternalActionRef.current) return;
    try {
      const p = playerRef.current;
      const S = window.YT.PlayerState;
      const s = p.getPlayerState?.() ?? -1;

      // EXEMPT LIVE RADIO: Only synchronize play / pause state, NEVER call doSeek or drift correction!
      if (isLiveTrack) {
        if (playbackState === 'playing') {
          if (s !== S.PLAYING && s !== S.BUFFERING) {
            p.playVideo?.();
          }
        } else if (playbackState === 'paused') {
          if (s === S.PLAYING) {
            p.pauseVideo?.();
          }
        }
        return;
      }

      const expected = getExpectedServerPosition();
      const local = p.getCurrentTime?.() ?? 0;
      const drift = Math.abs(local - expected);

      if (playbackState === 'playing') {
        if (s !== S.PLAYING && s !== S.BUFFERING) {
          doSeek(expected, false);
          p.playVideo?.();
        } else if (s === S.PLAYING && drift > 4.5 && Date.now() - lastSeekTimeRef.current > 6000) {
          doSeek(expected, true);
        }
      } else if (playbackState === 'paused') {
        if (s === S.PLAYING) {
          p.pauseVideo?.();
          doSeek(serverPosition, false);
        } else if (drift > 1.0 && Date.now() - lastSeekTimeRef.current > 3000) {
          doSeek(serverPosition, false);
        }
      }
    } catch {}
  }, [playbackState, serverPosition, lastSyncTimestamp, isLiveTrack]);

  // Progress + drift correction timer with smooth playbackRate adjustment
  useEffect(() => {
    const t = setInterval(() => {
      if (!playerRef.current || !isPlayerReadyRef.current) return;
      try {
        const p = playerRef.current;
        const S = window.YT.PlayerState;
        const playerState = p.getPlayerState?.() ?? -1;
        const isBuffering = playerState === S.BUFFERING || isBufferingRef.current;

        const videoData = p.getVideoData?.();
        if (videoData?.isLive) {
          isLiveRef.current = true;
        }

        const cur = p.getCurrentTime?.() ?? 0;
        const dur = p.getDuration?.() ?? 0;
        setCurrentTime(cur);
        if (dur > 0) {
          setDuration(prev => (prev !== dur ? dur : prev));
        }

        // EXEMPT LIVE RADIO: Never seek or alter playbackRate on live streams
        if (isLiveTrack || videoData?.isLive) {
          return;
        }

        // Only evaluate drift if actively playing and NOT currently buffering
        if (playbackState === 'playing' && playerState === S.PLAYING && !isBuffering && !isInternalActionRef.current) {
          const expected = getExpectedServerPosition();
          const drift = cur - expected; // positive: ahead, negative: behind
          const absDrift = Math.abs(drift);
          const now = Date.now();
          const timeSinceLastSeek = now - lastSeekTimeRef.current;

          // If recently sought, wait for playback to settle (cooldown: 6s)
          if (timeSinceLastSeek < 6000) {
            consecutiveDriftCountRef.current = 0;
            return;
          }

          // Case 1: Hard seek for severe desync (> 4.5 seconds)
          if (absDrift > 4.5) {
            consecutiveDriftCountRef.current += 1;
            // Require 3 consecutive checks (1.5s of sustained severe desync) before hard seek
            if (consecutiveDriftCountRef.current >= 3) {
              doSeek(expected, true);
              consecutiveDriftCountRef.current = 0;
              p.setPlaybackRate?.(1);
            }
          } 
          // Case 2: Smooth catch-up / slow-down via playbackRate (1.5s < absDrift <= 4.5s)
          // Completely seamless — NO AUDIO CUTOUT OR STUTTERING!
          else if (absDrift > 1.5) {
            consecutiveDriftCountRef.current = 0;
            const currentRate = p.getPlaybackRate?.() ?? 1;
            if (drift < -1.5 && currentRate !== 1.25) {
              p.setPlaybackRate?.(1.25);
            } else if (drift > 1.5 && currentRate !== 0.75) {
              p.setPlaybackRate?.(0.75);
            }
          } 
          // Case 3: In sync (absDrift <= 0.8s) -> restore standard 1x speed
          else if (absDrift < 0.8) {
            consecutiveDriftCountRef.current = 0;
            const currentRate = p.getPlaybackRate?.() ?? 1;
            if (currentRate !== 1) {
              p.setPlaybackRate?.(1);
            }
          }
        }
      } catch {}
    }, 500);
    return () => clearInterval(t);
  }, [playbackState, getExpectedServerPosition, isLiveTrack]);

  const handleTogglePlay = () => {
    if (!canControl || !currentTrack || !playerRef.current || !isPlayerReadyRef.current) return;
    setInternalAction();
    if (playbackState === 'playing') {
      const pos = playerRef.current.getCurrentTime?.() ?? currentTime;
      playerRef.current.pauseVideo?.();
      onPause(pos);
    } else {
      const pos = playerRef.current.getCurrentTime?.() ?? currentTime;
      playerRef.current.playVideo?.();
      onPlay(pos);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!canControl || !currentTrack || !playerRef.current || !isPlayerReadyRef.current || isLiveTrack) return;
    const v = parseFloat(e.target.value);
    setInternalAction();
    setCurrentTime(v);
    doSeek(v, false);
    onSeek(v);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = parseInt(e.target.value, 10);
    setVolume(v);
    if (!playerRef.current || !isPlayerReadyRef.current) return;
    playerRef.current.setVolume?.(v);
    if (v > 0 && isMuted) { playerRef.current.unMute?.(); setIsMuted(false); }
  };

  const handleToggleMute = () => {
    if (!playerRef.current || !isPlayerReadyRef.current) return;
    if (isMuted) { playerRef.current.unMute?.(); playerRef.current.setVolume?.(volume || 50); setIsMuted(false); }
    else { playerRef.current.mute?.(); setIsMuted(true); }
  };

  const handleResync = () => {
    if (!playerRef.current || !isPlayerReadyRef.current) return;
    setIsSyncing(true);
    setTimeout(() => setIsSyncing(false), 800);
    if (isLiveTrack) {
      playerRef.current.seekTo?.(999999, true);
      if (playbackState === 'playing') playerRef.current.playVideo?.();
      return;
    }
    doSeek(getExpectedServerPosition(), true);
    if (playbackState === 'playing') playerRef.current.playVideo?.();
  };

  const handleGesture = () => {
    setNeedsGesture(false);
    setPlayerError(null);
    if (!playerRef.current || !isPlayerReadyRef.current) return;
    playerRef.current.unMute?.();
    setIsMuted(false);
    if (!isLiveTrack) {
      doSeek(getExpectedServerPosition(), false);
    }
    playerRef.current.playVideo?.();
  };

  const isPlaying = playbackState === 'playing';
  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  const handleFullscreenTap = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('button, input, a, [role="button"]')) {
      resetControlsTimer();
      return;
    }
    if (!showFullscreenControls) {
      resetControlsTimer();
    } else {
      setShowFullscreenControls(false);
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    }
  };

  const handleFullscreenDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (canControl && currentTrack) {
      handleTogglePlay();
    }
  };

  const renderYouTubeHUD = () => (
    <div
      className="absolute inset-0 z-30 flex flex-col justify-between overflow-hidden"
      onClick={handleFullscreenTap}
      onDoubleClick={handleFullscreenDoubleClick}
    >
      {/* Dynamic blurred glow if in Song mode */}
      {viewMode === 'song' && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center pointer-events-none bg-black/85">
          {currentTrack?.thumbnail && (
            <img
              src={currentTrack.thumbnail}
              alt=""
              className="absolute inset-0 w-full h-full object-cover scale-150 blur-3xl opacity-20"
            />
          )}
          <div className="relative w-56 h-56 sm:w-72 sm:h-72 aspect-square rounded-3xl overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.8),0_0_50px_rgba(139,92,246,0.3)] border border-white/15 mb-4">
            {currentTrack?.thumbnail ? (
              <img src={currentTrack.thumbnail} alt="" className="w-full h-full object-cover" />
            ) : (
              <JamFlowAlbumArt size="default" />
            )}
          </div>
          <p className="text-white text-base sm:text-lg font-bold tracking-tight px-4 text-center truncate max-w-md">
            {currentTrack?.title ?? 'JamFlow'}
          </p>
          <p className="text-zinc-400 text-xs sm:text-sm text-center truncate max-w-sm mt-0.5">
            {currentTrack?.author ?? ''}
          </p>
          <div className="mt-3">
            <SoundVisualizer isPlaying={isPlaying} />
          </div>
        </div>
      )}

      {/* Auto-hiding HUD controls (fades out after 3s when playing) */}
      <div
        className={`absolute inset-0 z-20 flex flex-col justify-between transition-opacity duration-300 pointer-events-none ${
          showFullscreenControls ? 'opacity-100' : 'opacity-0'
        }`}
      >
        {/* Top Bar */}
        <div className="pointer-events-auto bg-gradient-to-b from-black/85 via-black/40 to-transparent pt-3 pb-8 px-4 sm:px-6 flex items-center justify-between">
          <div className="min-w-0 flex-1 mr-3">
            <p className="text-white text-sm sm:text-base font-bold truncate leading-tight drop-shadow">
              {currentTrack?.title ?? 'JamFlow'}
            </p>
            <p className="text-zinc-300 text-xs truncate mt-0.5 drop-shadow">
              {currentTrack?.author ?? ''}
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {isLiveTrack ? (
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs font-mono font-bold shadow-sm">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-500 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500" />
                </span>
                <span>LIVE RADIO</span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/10 border border-white/15 text-zinc-300 text-xs font-mono">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                <span>SYNCED</span>
              </div>
            )}
          </div>
        </div>

        {/* Center Controls */}
        <div className="pointer-events-auto flex items-center justify-center gap-6 sm:gap-10 my-auto">
          {/* Resync Button */}
          <button
            onClick={(e) => { e.stopPropagation(); handleResync(); }}
            title="Resync with room"
            className="w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-black/50 hover:bg-black/75 border border-white/15 text-white/80 hover:text-white flex items-center justify-center transition-all backdrop-blur-md active:scale-95 shadow-lg"
          >
            <RotateCcw className={`w-5 h-5 ${isSyncing ? 'animate-spin text-[#D946EF]' : ''}`} />
          </button>

          {/* Main Big Play / Pause Button */}
          <button
            onClick={(e) => { e.stopPropagation(); handleTogglePlay(); }}
            disabled={!canControl || !currentTrack}
            className={`w-16 h-16 sm:w-20 sm:h-20 rounded-full flex items-center justify-center transition-all backdrop-blur-md shadow-2xl ${
              !canControl || !currentTrack
                ? 'bg-black/50 text-white/30 border border-white/10 cursor-not-allowed'
                : 'bg-white/20 hover:bg-white/30 text-white border border-white/30 hover:scale-105 active:scale-95 shadow-[0_0_35px_rgba(139,92,246,0.5)]'
            }`}
            title={!canControl ? 'Only Host or DJ can control playback' : isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? (
              <Pause className="w-8 h-8 sm:w-10 sm:h-10 fill-current" />
            ) : (
              <Play className="w-8 h-8 sm:w-10 sm:h-10 fill-current ml-1" />
            )}
          </button>

          {/* Skip Next Button */}
          <button
            onClick={(e) => { e.stopPropagation(); onSkipNext?.(); }}
            disabled={!canControl || !hasQueue}
            className="w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-black/50 hover:bg-black/75 border border-white/15 text-white/80 hover:text-white flex items-center justify-center transition-all backdrop-blur-md active:scale-95 disabled:opacity-25 disabled:cursor-not-allowed shadow-lg"
            title={hasQueue ? "Next Track" : "Queue Empty"}
          >
            <FastForward className="w-5 h-5" />
          </button>
        </div>

        {/* Bottom Bar */}
        <div className="pointer-events-auto bg-gradient-to-t from-black/95 via-black/60 to-transparent px-4 sm:px-6 pt-10 pb-4 sm:pb-6 flex flex-col gap-2.5">
          {/* Full-width Scrubber Bar */}
          {isLiveTrack ? (
            <div className="w-full flex items-center justify-between py-1 text-xs font-mono text-zinc-300">
              <div className="flex items-center gap-2">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-500 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500" />
                </span>
                <span className="text-rose-400 font-bold">24/7 LIVE STREAM</span>
              </div>
              <span className="text-zinc-400 text-[11px]">Synchronized Edge</span>
            </div>
          ) : (
            <div className="relative w-full group py-1.5 cursor-pointer">
              <div className="relative w-full h-1 group-hover:h-2 bg-white/20 rounded-full transition-all">
                <div
                  className="absolute left-0 top-0 h-full bg-gradient-to-r from-[#8B5CF6] via-[#A855F7] to-[#D946EF] rounded-full transition-none shadow-[0_0_10px_rgba(139,92,246,0.9)]"
                  style={{ width: `${progress}%` }}
                />
                <div
                  className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3.5 h-3.5 bg-white rounded-full shadow-lg scale-0 group-hover:scale-100 transition-transform pointer-events-none"
                  style={{ left: `${progress}%` }}
                />
              </div>
              <input
                type="range"
                min={0}
                max={duration || currentTrack?.duration || 100}
                step={0.5}
                value={currentTime}
                onChange={handleSeek}
                disabled={!canControl || !currentTrack}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
              />
            </div>
          )}

          {/* Controls Row */}
          <div className="flex items-center justify-between text-white">
            <div className="flex items-center gap-3">
              <button
                onClick={(e) => { e.stopPropagation(); handleTogglePlay(); }}
                disabled={!canControl || !currentTrack}
                className="p-1.5 text-white/90 hover:text-white transition-colors"
              >
                {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-0.5" />}
              </button>

              <button
                onClick={(e) => { e.stopPropagation(); onSkipNext?.(); }}
                disabled={!canControl || !hasQueue}
                className="p-1.5 text-zinc-400 hover:text-white transition-colors disabled:opacity-20"
              >
                <FastForward className="w-4 h-4" />
              </button>

              {/* Volume */}
              <div className="flex items-center gap-1.5 ml-1">
                <button
                  onClick={(e) => { e.stopPropagation(); handleToggleMute(); }}
                  className="p-1.5 text-zinc-400 hover:text-white transition-colors"
                >
                  {isMuted || volume === 0 ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                </button>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={isMuted ? 0 : volume}
                  onChange={handleVolumeChange}
                  onClick={(e) => e.stopPropagation()}
                  className="w-16 sm:w-20 h-1 cursor-pointer accent-[#8B5CF6] hidden xs:block"
                />
              </div>

              {/* Time Readout */}
              <span className="text-xs font-mono text-zinc-300 ml-1">
                {isLiveTrack ? 'LIVE' : `${formatTime(currentTime)} / ${formatTime(duration || currentTrack?.duration || 0)}`}
              </span>
            </div>

            <div className="flex items-center gap-2">
              {/* Audio / Video Switcher */}
              <div className="flex items-center bg-white/10 backdrop-blur-md rounded-full p-0.5 border border-white/15">
                <button
                  onClick={(e) => { e.stopPropagation(); handleToggleViewMode('song'); }}
                  className={`px-2.5 py-1 rounded-full text-xs font-semibold transition-all ${
                    viewMode === 'song' ? 'bg-[#8B5CF6] text-white shadow' : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  AUDIO
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); handleToggleViewMode('video'); }}
                  className={`px-2.5 py-1 rounded-full text-xs font-semibold transition-all ${
                    viewMode === 'video' ? 'bg-[#8B5CF6] text-white shadow' : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  VIDEO
                </button>
              </div>

              {/* Exit Fullscreen */}
              <button
                onClick={(e) => { e.stopPropagation(); exitFullscreen(); }}
                className="p-2 text-white/90 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
                title="Exit Fullscreen (Esc)"
              >
                <Minimize className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // ─── Compact / Half-Screen Player (mobile) ──────────────────────────────────
  if (compact) {
    // When minimized on mobile (user expanded Queue or Chat to full height):
    if (minimized && !isFullscreen) {
      return (
        <div
          ref={playerRootRef}
          className="relative w-full h-[72px] px-4 bg-[#0C0D16]/65 backdrop-blur-2xl border-b border-white/[0.08] flex items-center justify-between gap-4 select-none shrink-0 z-10 shadow-lg"
        >
          {/* Always maintain YouTube iframe in DOM so audio is 100% uninterrupted */}
          <div className="w-0 h-0 overflow-hidden opacity-0 pointer-events-none absolute">
            <div id="jamflow-yt-hidden" />
          </div>

          {/* Left: Artwork + Title (Tap anywhere to expand full player) */}
          <div
            onClick={onToggleMinimize}
            className="flex items-center gap-3 min-w-0 flex-1 cursor-pointer group active:scale-[0.98] transition-transform"
            title="Tap to expand full player"
          >
            <div className="w-12 h-12 rounded-[14px] overflow-hidden border border-white/10 shrink-0 bg-zinc-900 shadow-md relative">
              {currentTrack?.thumbnail ? (
                <img src={currentTrack.thumbnail} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-gradient-to-tr from-[#8B5CF6] to-[#D946EF] flex items-center justify-center">
                  <Radio className="w-5 h-5 text-white" />
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-white text-sm font-bold truncate group-hover:text-[#C084FC] transition-colors leading-snug">
                {currentTrack?.title ?? 'Nothing in the flow'}
              </p>
              <div className="flex items-center gap-1.5 text-xs text-zinc-400 truncate mt-0.5">
                <span className="truncate">{currentTrack?.author ?? 'Add track to begin'}</span>
                <span className="text-zinc-600">•</span>
                <span className="text-[#C084FC] font-semibold shrink-0">Expand ↑</span>
              </div>
            </div>
          </div>

          {/* Right: Controls & Expand Button */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleTogglePlay}
              disabled={!canControl || !currentTrack}
              className={`w-11 h-11 rounded-full flex items-center justify-center transition-all shadow-md active:scale-95 ${
                !canControl || !currentTrack
                  ? 'bg-white/10 text-white/20 cursor-not-allowed'
                  : 'bg-gradient-to-tr from-[#8B5CF6] to-[#D946EF] text-white shadow-[#8B5CF6]/30'
              }`}
            >
              {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-0.5" />}
            </button>

            <button
              onClick={onSkipNext}
              disabled={!canControl || !hasQueue}
              className="w-10 h-10 rounded-full bg-white/[0.04] border border-white/[0.06] text-zinc-400 hover:text-white flex items-center justify-center active:scale-95 disabled:opacity-20"
              title="Skip"
            >
              <FastForward className="w-4 h-4" />
            </button>

            <button
              onClick={onToggleMinimize}
              className="p-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.08] text-zinc-300 hover:text-white flex items-center justify-center active:scale-95 ml-1"
              title="Expand Player"
            >
              <Maximize className="w-4 h-4 text-[#C084FC]" />
            </button>
          </div>

          {/* Glowing bottom progress line */}
          <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-white/10">
            <div
              className="h-full bg-gradient-to-r from-[#8B5CF6] to-[#D946EF] shadow-[0_0_6px_rgba(139,92,246,0.8)]"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      );
    }

    return (
      <div
        ref={playerRootRef}
        className="relative w-full bg-[#0C0D16]/90 backdrop-blur-xl border-b border-white/[0.08] p-3 sm:p-4 overflow-hidden shrink-0 select-none"
        style={{
          background: 'radial-gradient(circle at 50% 25%, rgba(139, 92, 246, 0.12), transparent 60%), #0C0D15',
        }}
      >
        {/* Dynamic blurred background */}
        <div className="absolute inset-0 z-0 pointer-events-none">
          {currentTrack?.thumbnail ? (
            <>
              <img
                src={currentTrack.thumbnail}
                alt=""
                className="absolute inset-0 w-full h-full object-cover scale-150 blur-2xl opacity-20"
              />
              <div className="absolute inset-0 bg-[#0C0D15]/80" />
            </>
          ) : (
            <div
              className="absolute inset-0 w-full h-full scale-125 blur-3xl opacity-25 pointer-events-none"
              style={{
                background: 'radial-gradient(ellipse at 50% 35%, rgba(139, 92, 246, 0.35) 0%, rgba(217, 70, 239, 0.18) 45%, transparent 70%)',
              }}
            />
          )}
        </div>

        {/* Gesture overlay */}
        {needsGesture && (
          <div
            onClick={handleGesture}
            className="absolute inset-0 z-30 bg-black/75 backdrop-blur-sm flex items-center justify-center cursor-pointer gap-3"
          >
            <Volume2 className="w-5 h-5 text-white animate-bounce" />
            <span className="text-white text-sm font-medium">Tap to sync audio</span>
          </div>
        )}

        {/* Regular Mobile Player Content */}
        <div className="relative z-10 flex flex-col items-center w-full pt-2 pb-1 px-3">
            {/* Subtle ambient glow for mobile (pure CSS, zero repaint lag) */}
            {viewMode === 'song' && (
              <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none opacity-40">
                <div
                  className="w-full h-full"
                  style={{
                    background: 'radial-gradient(circle at 50% 30%, rgba(139, 92, 246, 0.18) 0%, transparent 65%)',
                  }}
                />
              </div>
            )}

            {/* Mode switcher: AUDIO / VIDEO */}
            <div className="relative z-10 mb-1.5 inline-flex items-center p-0.5 rounded-full bg-white/[0.06] border border-white/[0.08] shadow-inner">
              <button
                onClick={() => handleToggleViewMode('song')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold tracking-wide transition-all ${
                  viewMode === 'song'
                    ? 'bg-gradient-to-r from-[#8B5CF6] to-[#7C3AED] text-white shadow-md shadow-[#8B5CF6]/30'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                <Music2 className="w-3 h-3" />
                <span>AUDIO</span>
              </button>
              <button
                onClick={() => handleToggleViewMode('video')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold tracking-wide transition-all ${
                  viewMode === 'video'
                    ? 'bg-gradient-to-r from-[#8B5CF6] to-[#7C3AED] text-white shadow-md shadow-[#8B5CF6]/30'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                <Film className="w-3 h-3" />
                <span>VIDEO</span>
              </button>
            </div>

            {/* Visual Canvas Frame (Audio & Video take the EXACT SAME 16:9 space) */}
            <div className="relative w-full max-w-sm aspect-video mx-auto my-1 flex items-center justify-center">
              {/* Video Layer — always mounted in DOM, transforms to Fullscreen HUD when isFullscreen is true */}
              <div
                ref={videoContainerRef}
                className={
                  isFullscreen
                    ? 'fixed inset-0 z-[99999] w-screen h-screen h-[100dvh] bg-black flex items-center justify-center select-none overflow-hidden rounded-none border-none'
                    : `absolute inset-0 w-full h-full rounded-2xl overflow-hidden shadow-2xl border border-white/10 bg-black transition-opacity duration-300 ${
                        viewMode === 'video'
                          ? 'opacity-100 pointer-events-auto z-20'
                          : 'opacity-0 pointer-events-none -z-10'
                      }`
                }
                onMouseMove={isFullscreen ? resetControlsTimer : undefined}
                onTouchStart={isFullscreen ? resetControlsTimer : undefined}
              >
                <div
                  id="jamflow-yt-hidden"
                  className={isFullscreen ? 'w-full h-full max-w-full max-h-full object-contain aspect-video' : 'w-full h-full'}
                />
                {isFullscreen && renderYouTubeHUD()}
              </div>

              {/* In Song Mode: Present Album Artwork Card or JamFlow Album Art */}
              {!isFullscreen && viewMode === 'song' && (
                <div className="relative z-10 w-full h-full flex items-center justify-center p-1">
                  {currentTrack ? (
                    <div
                      className="relative h-full aspect-square max-h-[195px] rounded-2xl overflow-hidden shadow-2xl border border-white/15 transition-all duration-300 group"
                      style={{
                        boxShadow: isPlaying
                          ? '0 14px 40px -5px rgba(0, 0, 0, 0.8), 0 0 35px rgba(139, 92, 246, 0.4)'
                          : '0 10px 30px -5px rgba(0, 0, 0, 0.7)',
                      }}
                    >
                      <img
                        src={currentTrack.thumbnail}
                        alt={currentTrack.title}
                        className={`w-full h-full object-cover transition-transform duration-500 ${
                          isPlaying ? 'scale-100' : 'scale-[0.97] opacity-90'
                        }`}
                      />
                      {/* Subtle vinyl gloss / glass sheen */}
                      <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-white/15 pointer-events-none" />
                    </div>
                  ) : (
                    <JamFlowAlbumArt size="compact" />
                  )}
                </div>
              )}
            </div>

            {/* Track Info */}
            <div className="relative z-10 text-center w-full max-w-xs px-2 mt-1.5">
              <p className="text-white text-base xs:text-lg font-black tracking-tight truncate leading-tight drop-shadow-md">
                {currentTrack?.title ?? 'Nothing in the flow'}
              </p>
              <p className="text-zinc-300/90 text-xs font-medium truncate mt-0.5 drop-shadow-sm">
                {currentTrack?.author ?? 'Add a track to start listening together'}
              </p>
            </div>

            {/* Scrubber Bar or Live Radio Indicator */}
            {isLiveTrack ? (
              <div className="relative z-10 w-full max-w-xs mt-2.5 px-3 py-2 rounded-xl bg-white/[0.04] border border-white/[0.07] flex items-center justify-between select-none">
                <div className="flex items-center gap-2">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-500 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.9)]" />
                  </span>
                  <span className="text-[11px] font-mono font-bold tracking-wider text-rose-400">
                    LIVE RADIO
                  </span>
                </div>
                <span className="text-[10px] font-mono text-zinc-400 bg-white/[0.04] px-2 py-0.5 rounded-full border border-white/[0.06]">
                  24/7 Stream
                </span>
              </div>
            ) : (
              <div className="relative z-10 w-full max-w-xs mt-2.5 space-y-1">
                <div className="relative w-full h-2 bg-white/[0.12] hover:bg-white/[0.18] rounded-full cursor-pointer transition-colors group">
                  <div
                    className="absolute left-0 top-0 h-full bg-gradient-to-r from-[#8B5CF6] via-[#A855F7] to-[#D946EF] rounded-full shadow-[0_0_12px_rgba(139,92,246,0.9)]"
                    style={{ width: `${progress}%` }}
                  />
                  <input
                    type="range"
                    min={0}
                    max={duration || currentTrack?.duration || 100}
                    step={0.5}
                    value={currentTime}
                    onChange={handleSeek}
                    disabled={!canControl || !currentTrack}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
                  />
                </div>
                <div className="flex justify-between items-center text-[11px] font-mono font-medium text-zinc-400 px-0.5">
                  <span>{formatTime(currentTime)}</span>
                  <span>{formatTime(duration || currentTrack?.duration || 0)}</span>
                </div>
              </div>
            )}

            {/* Controls Row with Merged Sync/Synced Button */}
            <div className="relative z-10 w-full max-w-xs flex items-center justify-between px-1 mt-2 pb-1">
              <button
                onClick={handleToggleMute}
                className="w-10 h-10 rounded-full bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] flex items-center justify-center text-zinc-400 hover:text-white transition-all active:scale-95 shadow-sm"
                title={isMuted ? "Unmute" : "Mute"}
              >
                {isMuted || volume === 0 ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              </button>

              <div className="flex items-center gap-3">
                {/* MERGED Sync + Synced button */}
                <button
                  onClick={() => {
                    setShowDrift(prev => !prev);
                    handleResync();
                  }}
                  title={isSyncing ? "Syncing with room..." : `Synced (${Math.abs(currentTime - getExpectedServerPosition()).toFixed(2)}s drift) - Tap to resync`}
                  className={`relative w-10 h-10 rounded-full border flex items-center justify-center transition-all active:scale-95 shadow-sm ${
                    isSyncing
                      ? 'bg-[#8B5CF6]/20 border-[#8B5CF6]/50 text-[#C084FC]'
                      : 'bg-white/[0.04] hover:bg-white/[0.08] border-white/[0.06] text-zinc-400 hover:text-white'
                  }`}
                >
                  <RotateCcw className={`w-4 h-4 ${isSyncing ? 'animate-spin text-[#D946EF]' : ''}`} />
                  {/* Status Indicator Dot merged onto the sync button */}
                  <span className="absolute top-1 right-1 flex h-2 w-2">
                    {isSyncing ? (
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                    ) : (
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-[#D946EF] shadow-[0_0_6px_rgba(217,70,239,0.9)]" />
                    )}
                  </span>
                  {/* Popover drift badge on tap */}
                  {showDrift && (
                    <span className="absolute -top-7 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-md bg-[#12131F] border border-white/10 text-[10px] font-mono text-zinc-300 shadow-xl whitespace-nowrap z-30">
                      {isSyncing ? 'Syncing...' : `${Math.abs(currentTime - getExpectedServerPosition()).toFixed(2)}s`}
                    </span>
                  )}
                </button>

                <button
                  onClick={handleTogglePlay}
                  disabled={!canControl || !currentTrack}
                  className={`w-14 h-14 rounded-full flex items-center justify-center transition-all shadow-xl ${
                    !canControl || !currentTrack
                      ? 'bg-white/10 text-white/20 cursor-not-allowed'
                      : 'bg-gradient-to-tr from-[#8B5CF6] via-[#A855F7] to-[#D946EF] text-white hover:scale-105 active:scale-95 shadow-[0_0_22px_rgba(139,92,246,0.5),inset_0_1px_0_rgba(255,255,255,0.3)]'
                  }`}
                  title={!canControl ? 'Only Host or DJ can control playback' : isPlaying ? 'Pause' : 'Play'}
                >
                  {isPlaying ? (
                    <Pause className="w-6 h-6 fill-current" />
                  ) : (
                    <Play className="w-6 h-6 fill-current ml-0.5" />
                  )}
                </button>

                <button
                  onClick={onSkipNext}
                  disabled={!canControl || !hasQueue}
                  className="w-10 h-10 rounded-full bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] flex items-center justify-center text-zinc-400 hover:text-white transition-all active:scale-95 disabled:opacity-20 disabled:cursor-not-allowed shadow-sm"
                  title={hasQueue ? "Skip to Next Track" : "Queue is empty"}
                >
                  <FastForward className="w-4 h-4" />
                </button>
              </div>

              <button
                onClick={enterFullscreen}
                className="w-10 h-10 rounded-full bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] flex items-center justify-center text-zinc-400 hover:text-white transition-all active:scale-95 shadow-sm"
                title="Fullscreen"
              >
                <Maximize className="w-4 h-4" />
              </button>
            </div>
          </div>

        <style jsx>{`
          @keyframes equalizerBar {
            from { transform: scaleY(0.4); }
            to { transform: scaleY(1.6); }
          }
          :global(#jamflow-yt-hidden) {
            width: 100% !important;
            height: 100% !important;
            display: block !important;
          }
          :global(#jamflow-yt-hidden iframe) {
            width: 100% !important;
            height: 100% !important;
            display: block !important;
            border: 0 !important;
          }
          :global(:fullscreen) {
            background-color: #09090b !important;
          }
        `}</style>
      </div>
    );
  }

  // ─── Full / Desktop layout ──────────────────────────────────────────
  return (
    <div
      ref={playerRootRef}
      className="relative w-full h-full flex flex-col items-center justify-center overflow-y-auto overflow-x-hidden py-6 px-6 lg:px-10 select-none"
    >

      {/* Autoplay gesture overlay */}
      {needsGesture && (
        <div onClick={handleGesture} className="absolute inset-0 z-30 bg-black/75 backdrop-blur-sm flex flex-col items-center justify-center cursor-pointer">
          <div className="w-12 h-12 rounded-full bg-white/10 border border-white/20 flex items-center justify-center mb-3 animate-bounce">
            <Volume2 className="w-5 h-5 text-white" />
          </div>
          <p className="text-white font-semibold text-sm">Tap to sync audio</p>
          <p className="text-white/50 text-xs mt-1">Browser needs a gesture to play</p>
        </div>
      )}

      {/* Top Switcher: AUDIO / VIDEO */}
      <div className="relative z-20 mb-4 inline-flex items-center p-1 rounded-full bg-white/[0.05] border border-white/[0.08] backdrop-blur-xl shadow-lg shrink-0">
        <button
          onClick={() => handleToggleViewMode('song')}
          className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-semibold tracking-wide transition-all ${
            viewMode === 'song'
              ? 'bg-gradient-to-r from-[#8B5CF6] to-[#7C3AED] text-white shadow-md shadow-[#8B5CF6]/30'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <Music2 className="w-3.5 h-3.5" />
          <span>AUDIO</span>
        </button>
        <button
          onClick={() => handleToggleViewMode('video')}
          className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-semibold tracking-wide transition-all ${
            viewMode === 'video'
              ? 'bg-gradient-to-r from-[#8B5CF6] to-[#7C3AED] text-white shadow-md shadow-[#8B5CF6]/30'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <Film className="w-3.5 h-3.5" />
          <span>VIDEO</span>
        </button>
      </div>

      {/* Center Showcase: Large Album Art (~350px) vs 16:9 Video */}
      <div className="relative z-10 flex items-center justify-center shrink-0">
        {/* Video Player Layer — always mounted */}
        <div
          ref={videoContainerRef}
          className={
            isFullscreen
              ? 'fixed inset-0 z-[99999] w-screen h-screen h-[100dvh] bg-black flex items-center justify-center select-none overflow-hidden rounded-none border-none'
              : `rounded-2xl overflow-hidden shadow-2xl border border-white/10 bg-black transition-all duration-300 ${
                  viewMode === 'video'
                    ? 'w-full max-w-2xl aspect-video relative opacity-100 pointer-events-auto'
                    : 'w-0 h-0 opacity-0 pointer-events-none absolute'
                }`
          }
          onMouseMove={isFullscreen ? resetControlsTimer : undefined}
          onTouchStart={isFullscreen ? resetControlsTimer : undefined}
        >
          <div
            id="jamflow-yt-hidden"
            className={isFullscreen ? 'w-full h-full max-w-full max-h-full object-contain aspect-video' : 'w-full h-full'}
          />
          {isFullscreen && renderYouTubeHUD()}
        </div>

        {/* Album Art Layer (Song Mode) */}
        {!isFullscreen && viewMode === 'song' && (
          <div
            className="relative w-[260px] h-[260px] sm:w-[300px] sm:h-[300px] lg:w-[340px] lg:h-[340px] aspect-square rounded-3xl overflow-hidden border border-white/15 bg-[#121320] shadow-2xl transition-all duration-300"
            style={{
              boxShadow: isPlaying && currentTrack
                ? '0 25px 60px -10px rgba(0, 0, 0, 0.9), 0 0 45px rgba(139, 92, 246, 0.4)'
                : '0 20px 40px -15px rgba(0,0,0,0.85)',
            }}
          >
            {currentTrack?.thumbnail ? (
              <img
                src={currentTrack.thumbnail}
                alt={currentTrack.title}
                className={`w-full h-full object-cover rounded-3xl transition-transform duration-500 ${
                  isPlaying ? 'scale-100' : 'scale-[0.96] opacity-80'
                }`}
              />
            ) : (
              <JamFlowAlbumArt size="default" />
            )}
            {/* Subtle glass reflection overlay */}
            <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-white/10 pointer-events-none rounded-3xl" />
          </div>
        )}
      </div>

      {/* Track Info & Visualizer */}
      <div className="relative z-10 mt-4 text-center max-w-md px-4 w-full shrink-0">
        <h2 className="text-white font-bold text-base sm:text-lg truncate tracking-tight">
          {currentTrack?.title ?? 'Nothing in the flow'}
        </h2>
        <p className="text-zinc-400 text-xs truncate mt-0.5">
          {currentTrack?.author ?? (userCount > 1 ? `${userCount} people waiting for music` : 'Add a track and start listening together')}
        </p>
        <div className="mt-2">
          <SoundVisualizer isPlaying={isPlaying} />
        </div>
      </div>

      {/* Scrubber / Progress Bar or Live Stream Badge */}
      <div className="relative z-10 w-full max-w-md mt-3 space-y-1 shrink-0">
        {isLiveTrack ? (
          <div className="w-full flex items-center justify-between py-2 px-3.5 rounded-xl bg-white/[0.04] border border-white/[0.07] select-none">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-500 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.9)]" />
              </span>
              <span className="text-xs font-mono font-bold tracking-wider text-rose-400">
                LIVE RADIO STREAM
              </span>
            </div>
            <span className="text-xs font-mono text-zinc-400 bg-white/[0.04] px-2.5 py-0.5 rounded-full border border-white/[0.06]">
              24/7 Continuous Broadcast
            </span>
          </div>
        ) : (
          <>
            <div className="relative w-full h-1.5 bg-[#242429] hover:h-2 rounded-full transition-all cursor-pointer">
              <div
                className="absolute left-0 top-0 h-full bg-gradient-to-r from-[#8B5CF6] to-[#D946EF] rounded-full transition-none shadow-[0_0_8px_rgba(139,92,246,0.6)]"
                style={{ width: `${progress}%` }}
              />
              <input
                type="range"
                min={0}
                max={duration || currentTrack?.duration || 100}
                step={0.5}
                value={currentTime}
                onChange={handleSeek}
                disabled={!canControl || !currentTrack}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
              />
            </div>
            <div className="flex justify-between text-[11px] font-mono text-zinc-400 px-0.5">
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(duration || currentTrack?.duration || 0)}</span>
            </div>
          </>
        )}
      </div>

      {/* Controls Row — 3 equal columns so play/pause is always dead-center */}
      <div className="relative z-10 grid grid-cols-3 items-center w-full max-w-md mt-3 px-2 shrink-0">
        {/* Left: Volume */}
        <div className="flex items-center gap-2 justify-self-start">
          <button
            onClick={handleToggleMute}
            className="text-zinc-400 hover:text-white transition-colors p-1"
            title={isMuted ? "Unmute" : "Mute"}
          >
            {isMuted || volume === 0 ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>
          <input
            type="range"
            min={0}
            max={100}
            value={isMuted ? 0 : volume}
            onChange={handleVolumeChange}
            className="w-16 sm:w-20 h-1 cursor-pointer accent-[#8B5CF6]"
          />
        </div>

        {/* Center: Main Controls (always centered) */}
        <div className="flex items-center gap-3 justify-self-center">
          <button
            onClick={() => {
              setShowDrift(prev => !prev);
              handleResync();
            }}
            title={isSyncing ? "Syncing with room..." : `Synced (${Math.abs(currentTime - getExpectedServerPosition()).toFixed(2)}s drift) - Tap to resync`}
            className="relative p-2 text-zinc-400 hover:text-white transition-colors rounded-full hover:bg-white/5 active:scale-95"
          >
            <RotateCcw className={`w-4 h-4 ${isSyncing ? 'animate-spin text-[#D946EF]' : ''}`} />
            <span className="absolute top-1 right-1 flex h-2 w-2">
              {isSyncing ? (
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
              ) : (
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[#D946EF] shadow-[0_0_6px_rgba(217,70,239,0.9)]" />
              )}
            </span>
          </button>

          {/* Play / Pause button */}
          <button
            onClick={handleTogglePlay}
            disabled={!canControl || !currentTrack}
            className={`w-14 h-14 rounded-full flex items-center justify-center transition-all shadow-xl ${
              !canControl || !currentTrack
                ? 'bg-white/10 text-white/20 cursor-not-allowed'
                : 'bg-gradient-to-tr from-[#8B5CF6] to-[#D946EF] text-white hover:scale-105 active:scale-95 shadow-[0_0_20px_rgba(139,92,246,0.45)]'
            }`}
            title={!canControl ? 'Only Host or DJ can control playback' : isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? (
              <Pause className="w-6 h-6 fill-current" />
            ) : (
              <Play className="w-6 h-6 fill-current ml-0.5" />
            )}
          </button>

          {/* Skip Next button */}
          <button
            onClick={onSkipNext}
            disabled={!canControl || !hasQueue}
            className="p-2 text-zinc-400 hover:text-white transition-colors rounded-full hover:bg-white/5 disabled:opacity-20 disabled:cursor-not-allowed"
            title={hasQueue ? "Skip to Next Track" : "Queue is empty"}
          >
            <FastForward className="w-4 h-4" />
          </button>
        </div>

        {/* Right: Fullscreen (mirrors left width so center stays true) */}
        <div className="flex items-center justify-self-end">
          <button
            onClick={toggleFullscreen}
            className="p-2 text-zinc-400 hover:text-white transition-colors rounded-lg hover:bg-white/5"
            title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
          >
            {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Simple status: ● SYNCED / ◌ SYNCING */}
      <div className="relative z-10 mt-4 flex justify-center">
        <button
          type="button"
          onClick={() => {
            setShowDrift(prev => !prev);
            handleResync();
          }}
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.06] transition-all active:scale-95 text-xs font-mono select-none"
          title="Tap to see sync drift info / resync"
        >
          {isSyncing ? (
            <>
              <span className="w-1.5 h-1.5 rounded-full border border-[#D946EF] border-t-transparent animate-spin" />
              <span className="text-[#C084FC] font-semibold tracking-wider text-[11px]">◌ SYNCING</span>
            </>
          ) : (
            <>
              <span className="w-1.5 h-1.5 rounded-full bg-[#D946EF] shadow-[0_0_6px_rgba(217,70,239,0.8)]" />
              <span className="text-zinc-400 font-medium tracking-wider text-[11px]">● SYNCED</span>
            </>
          )}
          {showDrift && (
            <span className="text-[10px] text-zinc-500 font-mono ml-1">
              ({Math.abs(currentTime - getExpectedServerPosition()).toFixed(2)}s)
            </span>
          )}
        </button>
      </div>


      <style jsx>{`
        @keyframes audioPulse {
          0% { transform: scaleY(0.25); }
          50% { transform: scaleY(1.15); }
          100% { transform: scaleY(0.35); }
        }
        @keyframes equalizerBar {
          from { transform: scaleY(0.4); }
          to { transform: scaleY(1.6); }
        }
        :global(#jamflow-yt-hidden) {
          width: 100% !important;
          height: 100% !important;
          display: block !important;
        }
        :global(#jamflow-yt-hidden iframe) {
          width: 100% !important;
          height: 100% !important;
          display: block !important;
          border: 0 !important;
        }
        :global(:fullscreen) {
          background-color: #09090b !important;
        }
      `}</style>
    </div>
  );
};
