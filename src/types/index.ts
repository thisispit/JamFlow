export type PlaybackState = 'playing' | 'paused' | 'buffering' | 'ended';

export interface User {
  id: string;
  username: string;
  avatar: string;
  isHost: boolean;
  isDJ: boolean;
  joinedAt: number;
}

export interface Track {
  id: string; // Unique queue item identifier
  videoId: string; // YouTube 11-character video ID
  url: string;
  title: string;
  author: string;
  duration: number; // in seconds
  thumbnail: string;
  addedBy: {
    id: string;
    username: string;
  };
  addedAt: number;
}

export interface RoomSettings {
  isOpenQueue: boolean; // Anyone can add tracks to queue
  isOpenControl: boolean; // Anyone can play/pause/seek
  skipThresholdPercent: number; // e.g. 50%
}

export interface ChatMessage {
  id: string;
  userId: string;
  username: string;
  avatar: string;
  content: string;
  timestamp: number;
  isSystem?: boolean;
}

export interface Reaction {
  id: string;
  emoji: string;
  userId: string;
  username: string;
  timestamp: number;
}

export interface VoteSkipState {
  votedUserIds: string[];
  requiredVotes: number;
}

export interface Room {
  id: string;
  name: string;
  hostId: string;
  users: User[];
  currentTrack: Track | null;
  playbackState: PlaybackState;
  position: number; // seconds
  lastSyncTimestamp: number; // epoch ms
  queue: Track[];
  voteSkip: VoteSkipState;
  settings: RoomSettings;
  chat: ChatMessage[];
  createdAt: number;
}

// Socket Events
export interface ClientToServerEvents {
  'room:create': (data: { username: string; roomName?: string }, callback: (res: { success: boolean; roomId?: string; error?: string }) => void) => void;
  'room:join': (data: { roomId: string; username: string }, callback: (res: { success: boolean; room?: Room; user?: User; error?: string }) => void) => void;
  'room:leave': () => void;
  
  // Playback sync
  'playback:play': (data: { position: number }) => void;
  'playback:pause': (data: { position: number }) => void;
  'playback:seek': (data: { position: number }) => void;
  'playback:track_ended': (data: { trackId: string }) => void;
  'playback:request_sync': (callback: (data: { currentTrack: Track | null; playbackState: PlaybackState; position: number; timestamp: number }) => void) => void;

  // Queue
  'queue:add': (data: { url: string }, callback?: (res: { success: boolean; error?: string }) => void) => void;
  'queue:remove': (data: { trackId: string }) => void;
  'queue:reorder': (data: { startIndex: number; endIndex: number }) => void;
  'queue:skip_to': (data: { trackId: string }) => void;
  'queue:clear': () => void;
  'queue:vote_skip': () => void;

  // Roles & Settings
  'room:update_settings': (data: Partial<RoomSettings>) => void;
  'room:transfer_host': (data: { targetUserId: string }) => void;
  'room:toggle_dj': (data: { targetUserId: string }) => void;

  // Social
  'chat:send': (data: { content: string }) => void;
  'reaction:send': (data: { emoji: string }) => void;
}

export interface ServerToClientEvents {
  'room:state': (room: Room) => void;
  'room:user_joined': (user: User) => void;
  'room:user_left': (data: { userId: string; username: string; newHostId?: string }) => void;
  'room:host_changed': (data: { hostId: string; hostUsername: string }) => void;
  'room:settings_updated': (settings: RoomSettings) => void;

  'playback:sync': (data: {
    currentTrack: Track | null;
    playbackState: PlaybackState;
    position: number;
    timestamp: number;
    initiatedBy?: string;
  }) => void;

  'playback:play': (data: { position: number; timestamp: number; initiatedBy?: string }) => void;
  'playback:pause': (data: { position: number; timestamp: number; initiatedBy?: string }) => void;
  'playback:seek': (data: { position: number; timestamp: number; initiatedBy?: string }) => void;

  'queue:updated': (queue: Track[]) => void;
  'queue:track_started': (track: Track | null) => void;
  'queue:vote_skip_updated': (voteSkip: VoteSkipState) => void;

  'chat:new_message': (message: ChatMessage) => void;
  'reaction:new': (reaction: Reaction) => void;
  'error:notification': (data: { message: string }) => void;
}
