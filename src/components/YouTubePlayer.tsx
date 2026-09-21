'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Play, Pause, Volume2, VolumeX, Maximize, RotateCcw, Radio, Sparkles } from 'lucide-react';
import { Track, PlaybackState } from '@/types';
import { formatTime } from '@/lib/youtube';

interface YouTubePlayerProps {
  currentTrack: Track | null;
  playbackState: PlaybackState;
  serverPosition: number;
  lastSyncTimestamp: number;
  canControl: boolean;
  onPlay: (position: number) => void;
  onPause: (position: number) => void;
  onSeek: (position: number) => void;
  onTrackEnded: (trackId: string) => void;
}

export const YouTubePlayer: React.FC<YouTubePlayerProps> = ({
  currentTrack,
  playbackState,
  serverPosition,
  lastSyncTimestamp,
  canControl,
  onPlay,
  onPause,
  onSeek,
  onTrackEnded,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<any>(null);
  const isPlayerReadyRef = useRef<boolean>(false);
  const isInternalActionRef = useRef<boolean>(false);
  const internalActionTimerRef = useRef<NodeJS.Timeout | null>(null);

  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [volume, setVolume] = useState<number>(80);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [needsGesture, setNeedsGesture] = useState<boolean>(false);
  const [driftOffset, setDriftOffset] = useState<number>(0);

  const setInternalAction = () => {
    isInternalActionRef.current = true;
    if (internalActionTimerRef.current) clearTimeout(internalActionTimerRef.current);
    internalActionTimerRef.current = setTimeout(() => {
      isInternalActionRef.current = false;
    }, 1200);
  };

  // Calculate current expected server position
  const getExpectedServerPosition = useCallback(() => {
    if (playbackState !== 'playing') {
      return serverPosition;
    }
    const elapsed = (Date.now() - lastSyncTimestamp) / 1000;
    return serverPosition + elapsed;
  }, [playbackState, serverPosition, lastSyncTimestamp]);

  // Load YouTube IFrame API script
  useEffect(() => {
    if (!window.YT) {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      tag.async = true;
      const firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag?.parentNode?.insertBefore(tag, firstScriptTag);
    }
  }, []);

  // Initialize YT Player
  useEffect(() => {
    let checkInterval: NodeJS.Timeout;

    const initPlayer = () => {
      if (!window.YT || !window.YT.Player) return false;

      const playerDiv = document.getElementById('jamflow-yt-iframe');
      if (!playerDiv) return false;

      playerRef.current = new window.YT.Player('jamflow-yt-iframe', {
        videoId: currentTrack ? currentTrack.videoId : '',
        playerVars: {
          autoplay: 1,
          controls: 0, // Custom sleek controls
          disablekb: 1,
          enablejsapi: 1,
          fs: 0,
          modestbranding: 1,
          rel: 0,
          origin: typeof window !== 'undefined' ? window.location.origin : '',
        },
        events: {
          onReady: (event: any) => {
            isPlayerReadyRef.current = true;
            event.target.setVolume(volume);
            const expected = getExpectedServerPosition();
            event.target.seekTo(expected, true);

            if (playbackState === 'playing') {
              const playPromise = event.target.playVideo();
              // Check if autoplay was prevented
              if (playPromise && typeof playPromise.catch === 'function') {
                playPromise.catch(() => setNeedsGesture(true));
              }
            } else {
              event.target.pauseVideo();
            }
          },
          onStateChange: (event: any) => {
            if (!currentTrack || isInternalActionRef.current) return;

            const YTState = window.YT.PlayerState;

            // Track Ended
            if (event.data === YTState.ENDED) {
              onTrackEnded(currentTrack.id);
            }
            // User played locally (if permitted)
            else if (event.data === YTState.PLAYING) {
              if (playbackState !== 'playing' && canControl) {
                setInternalAction();
                onPlay(event.target.getCurrentTime());
              }
            }
            // User paused locally (if permitted)
            else if (event.data === YTState.PAUSED) {
              if (playbackState === 'playing' && canControl) {
                setInternalAction();
                onPause(event.target.getCurrentTime());
              }
            }
          },
          onError: (event: any) => {
            console.warn('YouTube Player error code:', event.data);
          },
        },
      });

      return true;
    };

    if (!playerRef.current) {
      if (!initPlayer()) {
        checkInterval = setInterval(() => {
          if (initPlayer()) {
            clearInterval(checkInterval);
          }
        }, 200);
      }
    }

    return () => {
      if (checkInterval) clearInterval(checkInterval);
    };
  }, []);

  // Update video when currentTrack changes
  useEffect(() => {
    if (!playerRef.current || !isPlayerReadyRef.current || !currentTrack) return;

    const currentLoadedId = playerRef.current.getVideoData?.()?.video_id;
    if (currentLoadedId !== currentTrack.videoId) {
      setInternalAction();
      const expected = getExpectedServerPosition();
      playerRef.current.loadVideoById({
        videoId: currentTrack.videoId,
        startSeconds: expected,
      });

      if (playbackState === 'playing') {
        playerRef.current.playVideo();
      } else {
        playerRef.current.pauseVideo();
      }
    }
  }, [currentTrack?.videoId]);

  // Synchronize playback state and seek from props
  useEffect(() => {
    if (!playerRef.current || !isPlayerReadyRef.current || isInternalActionRef.current) return;

    try {
      const player = playerRef.current;
      const expected = getExpectedServerPosition();
      const localTime = player.getCurrentTime ? player.getCurrentTime() : 0;
      const drift = Math.abs(localTime - expected);
      setDriftOffset(Math.round(drift * 1000));

      if (playbackState === 'playing') {
        const pState = player.getPlayerState ? player.getPlayerState() : -1;
        if (pState !== window.YT.PlayerState.PLAYING && pState !== window.YT.PlayerState.BUFFERING) {
          player.seekTo(expected, true);
          player.playVideo();
        } else if (drift > 1.8) {
          setIsSyncing(true);
          player.seekTo(expected, true);
          setTimeout(() => setIsSyncing(false), 500);
        }
      } else if (playbackState === 'paused') {
        const pState = player.getPlayerState ? player.getPlayerState() : -1;
        if (pState === window.YT.PlayerState.PLAYING) {
          player.pauseVideo();
          player.seekTo(serverPosition, true);
        } else if (drift > 0.5) {
          player.seekTo(serverPosition, true);
        }
      }
    } catch (e) {
      console.warn('Sync evaluation error:', e);
    }
  }, [playbackState, serverPosition, lastSyncTimestamp, getExpectedServerPosition]);

  // Continuous timer for local progress bar & drift correction
  useEffect(() => {
    const timer = setInterval(() => {
      if (playerRef.current && isPlayerReadyRef.current) {
        try {
          const current = playerRef.current.getCurrentTime?.() || 0;
          const dur = playerRef.current.getDuration?.() || 0;
          setCurrentTime(current);
          if (dur > 0) setDuration(dur);

          // Drift monitoring when playing
          if (playbackState === 'playing') {
            const expected = getExpectedServerPosition();
            const drift = Math.abs(current - expected);
            setDriftOffset(Math.round(drift * 1000));

            // Hard drift correction if out of sync by > 2.0 seconds
            if (drift > 2.0 && !isInternalActionRef.current) {
              playerRef.current.seekTo(expected, true);
            }
          }
        } catch {
          // Player not yet accessible
        }
      }
    }, 500);

    return () => clearInterval(timer);
  }, [playbackState, getExpectedServerPosition]);

  // Control handlers
  const handleTogglePlay = () => {
    if (!canControl || !currentTrack) return;
    setInternalAction();

    if (playbackState === 'playing') {
      const pos = playerRef.current?.getCurrentTime?.() || currentTime;
      playerRef.current?.pauseVideo?.();
      onPause(pos);
    } else {
      const pos = playerRef.current?.getCurrentTime?.() || currentTime;
      playerRef.current?.playVideo?.();
      onPlay(pos);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!canControl || !currentTrack) return;
    const newPos = parseFloat(e.target.value);
    setInternalAction();
    setCurrentTime(newPos);
    playerRef.current?.seekTo?.(newPos, true);
    onSeek(newPos);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVol = parseInt(e.target.value, 10);
    setVolume(newVol);
    if (playerRef.current) {
      playerRef.current.setVolume(newVol);
      if (newVol > 0 && isMuted) {
        playerRef.current.unMute();
        setIsMuted(false);
      }
    }
  };

  const handleToggleMute = () => {
    if (!playerRef.current) return;
    if (isMuted) {
      playerRef.current.unMute();
      setIsMuted(false);
      playerRef.current.setVolume(volume || 50);
    } else {
      playerRef.current.mute();
      setIsMuted(true);
    }
  };

  const handleManualResync = () => {
    if (!playerRef.current) return;
    setIsSyncing(true);
    const expected = getExpectedServerPosition();
    playerRef.current.seekTo(expected, true);
    if (playbackState === 'playing') {
      playerRef.current.playVideo();
    }
    setTimeout(() => setIsSyncing(false), 600);
  };

  const handleUserGestureInteract = () => {
    setNeedsGesture(false);
    if (playerRef.current) {
      playerRef.current.unMute();
      setIsMuted(false);
      const expected = getExpectedServerPosition();
      playerRef.current.seekTo(expected, true);
      playerRef.current.playVideo();
    }
  };

  const handleFullscreen = () => {
    if (containerRef.current) {
      if (document.fullscreenElement) {
        document.exitFullscreen();
      } else {
        containerRef.current.requestFullscreen();
      }
    }
  };

  const isPlaying = playbackState === 'playing';

  return (
    <div
      ref={containerRef}
      className="relative w-full rounded-2xl overflow-hidden bg-zinc-950 border border-zinc-800 shadow-2xl flex flex-col group"
    >
      {/* Autoplay blocked banner */}
      {needsGesture && (
        <div
          onClick={handleUserGestureInteract}
          className="absolute inset-0 z-30 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center cursor-pointer transition-all hover:bg-black/70"
        >
          <div className="w-16 h-16 rounded-full bg-fuchsia-600/30 border border-fuchsia-500 text-fuchsia-400 flex items-center justify-center mb-4 animate-bounce">
            <Volume2 className="w-8 h-8" />
          </div>
          <h3 className="text-xl font-bold text-white mb-2">Click to Join Audio & Sync</h3>
          <p className="text-zinc-300 text-sm max-w-md">
            Your browser requires a quick tap before playing audio with other listeners in the room.
          </p>
        </div>
      )}

      {/* Sync Status Badge */}
      <div className="absolute top-4 left-4 z-20 flex items-center gap-2">
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-zinc-900/80 backdrop-blur-md border border-zinc-700/50 text-xs font-medium text-zinc-300 shadow-lg">
          <span
            className={`w-2 h-2 rounded-full ${
              isSyncing
                ? 'bg-amber-400 animate-ping'
                : isPlaying
                ? 'bg-emerald-400 animate-pulse'
                : 'bg-zinc-500'
            }`}
          />
          <span>{isSyncing ? 'Syncing...' : isPlaying ? 'In Sync' : 'Paused'}</span>
          {driftOffset > 0 && <span className="text-zinc-500 text-[10px]">({driftOffset}ms)</span>}
        </div>

        <button
          onClick={handleManualResync}
          title="Force Sync with Room"
          className="p-1.5 rounded-full bg-zinc-900/80 hover:bg-zinc-800 text-zinc-300 hover:text-white backdrop-blur-md border border-zinc-700/50 transition-all text-xs flex items-center gap-1"
        >
          <RotateCcw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* YouTube Player IFrame container */}
      <div className="relative w-full aspect-video bg-black flex items-center justify-center overflow-hidden">
        {currentTrack ? (
          <div className="w-full h-full pointer-events-none select-none">
            <div id="jamflow-yt-iframe" className="w-full h-full" />
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center text-center p-8 select-none">
            <div className="w-20 h-20 rounded-2xl bg-zinc-900/90 border border-zinc-800 flex items-center justify-center mb-4 text-fuchsia-500 shadow-xl shadow-fuchsia-500/10">
              <Radio className="w-10 h-10 animate-pulse text-fuchsia-400" />
            </div>
            <h3 className="text-lg font-semibold text-zinc-100 mb-1">Queue is Empty</h3>
            <p className="text-sm text-zinc-400 max-w-sm">
              Paste a YouTube link or search below to start jamming with everyone!
            </p>
          </div>
        )}
      </div>

      {/* Sleek Custom Controls Bar */}
      <div className="p-4 bg-gradient-to-t from-zinc-950 via-zinc-900 to-zinc-900/90 border-t border-zinc-800/80">
        {/* Progress Scrubber */}
        <div className="flex items-center gap-3 mb-3">
          <span className="text-xs font-mono text-zinc-400 w-10 text-right">
            {formatTime(currentTime)}
          </span>
          <div className="relative flex-1 flex items-center">
            <input
              type="range"
              min={0}
              max={duration || currentTrack?.duration || 100}
              step={0.5}
              value={currentTime}
              onChange={handleSeek}
              disabled={!canControl || !currentTrack}
              className={`w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-fuchsia-500 focus:outline-none ${
                !canControl ? 'cursor-not-allowed opacity-75' : ''
              }`}
            />
          </div>
          <span className="text-xs font-mono text-zinc-400 w-10">
            {formatTime(duration || currentTrack?.duration || 0)}
          </span>
        </div>

        {/* Lower Controls */}
        <div className="flex items-center justify-between gap-4">
          {/* Track Info */}
          <div className="flex items-center gap-3 min-w-0 max-w-[40%]">
            {currentTrack?.thumbnail && (
              <img
                src={currentTrack.thumbnail}
                alt={currentTrack.title}
                className="w-11 h-11 rounded-lg object-cover border border-zinc-700 shadow shrink-0"
              />
            )}
            <div className="min-w-0">
              <h4 className="text-sm font-semibold text-zinc-100 truncate">
                {currentTrack ? currentTrack.title : 'No Track Playing'}
              </h4>
              <p className="text-xs text-zinc-400 truncate flex items-center gap-1.5">
                <span>{currentTrack ? currentTrack.author : 'Add music to queue'}</span>
                {currentTrack?.addedBy && (
                  <span className="text-zinc-500 text-[11px] truncate">
                    • Added by {currentTrack.addedBy.username}
                  </span>
                )}
              </p>
            </div>
          </div>

          {/* Central Play/Pause Controls */}
          <div className="flex items-center gap-3">
            <button
              onClick={handleTogglePlay}
              disabled={!canControl || !currentTrack}
              className={`w-12 h-12 rounded-full flex items-center justify-center font-bold shadow-lg transition-all ${
                !canControl || !currentTrack
                  ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                  : 'bg-gradient-to-r from-fuchsia-500 to-purple-600 hover:from-fuchsia-600 hover:to-purple-700 text-white hover:scale-105 active:scale-95 shadow-fuchsia-500/25'
              }`}
              title={
                !canControl
                  ? 'Only Host or DJ can control playback'
                  : isPlaying
                  ? 'Pause'
                  : 'Play'
              }
            >
              {isPlaying ? (
                <Pause className="w-5 h-5 fill-current" />
              ) : (
                <Play className="w-5 h-5 fill-current ml-0.5" />
              )}
            </button>
          </div>

          {/* Volume and Fullscreen */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <button
                onClick={handleToggleMute}
                className="text-zinc-400 hover:text-zinc-200 transition-colors"
                title={isMuted ? 'Unmute' : 'Mute'}
              >
                {isMuted || volume === 0 ? (
                  <VolumeX className="w-4 h-4 text-rose-400" />
                ) : (
                  <Volume2 className="w-4 h-4" />
                )}
              </button>
              <input
                type="range"
                min={0}
                max={100}
                value={isMuted ? 0 : volume}
                onChange={handleVolumeChange}
                className="w-16 h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-fuchsia-500"
              />
            </div>

            <button
              onClick={handleFullscreen}
              className="p-2 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
              title="Fullscreen"
            >
              <Maximize className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
