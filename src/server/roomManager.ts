import { Room, User, Track, RoomSettings, ChatMessage, Reaction, PlaybackState } from '../types';
import { fetchYouTubeMetadata } from '../lib/youtube';

export class RoomManager {
  private rooms: Map<string, Room> = new Map();
  private socketMap: Map<string, { roomId: string; userId: string }> = new Map();

  constructor() {
    // Periodic cleanup of empty rooms older than 15 minutes
    setInterval(() => this.cleanupIdleRooms(), 5 * 60 * 1000);
  }

  public generateRoomId(): string {
    const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 5; i++) {
      code += alphabet.charAt(Math.floor(Math.random() * alphabet.length));
    }
    return code;
  }

  public getRoom(roomId: string): Room | undefined {
    const rawId = roomId.trim().toUpperCase();
    const normalizedId = rawId.replace(/[^A-Z0-9]/g, '');
    return this.rooms.get(rawId) ?? this.rooms.get(normalizedId);
  }

  public getSocketInfo(socketId: string) {
    return this.socketMap.get(socketId);
  }

  public createRoom(hostUsername: string, hostSocketId: string, customRoomName?: string): { room: Room; user: User } {
    const roomId = this.generateRoomId();
    const user: User = {
      id: hostSocketId,
      username: hostUsername.trim() || 'Host Jammer',
      avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(hostUsername || hostSocketId)}`,
      isHost: true,
      isDJ: true,
      joinedAt: Date.now(),
    };

    const roomName = customRoomName?.trim() || `${user.username}'s Jam`;

    const room: Room = {
      id: roomId,
      name: roomName,
      hostId: user.id,
      users: [user],
      currentTrack: null,
      playbackState: 'paused',
      position: 0,
      lastSyncTimestamp: Date.now(),
      queue: [],
      voteSkip: {
        votedUserIds: [],
        requiredVotes: 1,
      },
      settings: {
        isOpenQueue: true,
        isOpenControl: false, // Only Host/DJ can play/pause by default
        skipThresholdPercent: 50,
      },
      chat: [
        {
          id: `sys-${Date.now()}`,
          userId: 'system',
          username: 'JamFlow Bot',
          avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=jamflow-bot',
          content: `Welcome to ${roomName}! Share the room code ${roomId} with your friends to listen together.`,
          timestamp: Date.now(),
          isSystem: true,
        },
      ],
      createdAt: Date.now(),
    };

    this.rooms.set(roomId, room);
    this.socketMap.set(hostSocketId, { roomId, userId: user.id });
    return { room, user };
  }

  public joinRoom(roomId: string, username: string, socketId: string): { room: Room; user: User } | { error: string } {
    const rawId = roomId.trim().toUpperCase();
    const normalizedId = rawId.replace(/[^A-Z0-9]/g, '');
    const room = this.rooms.get(rawId) ?? this.rooms.get(normalizedId);

    if (!room) {
      return { error: 'Room not found. Please check the code and try again.' };
    }

    // Check if user is already in the room
    const existingIndex = room.users.findIndex((u) => u.id === socketId);
    let user: User;

    if (existingIndex !== -1) {
      user = room.users[existingIndex];
      user.username = username.trim() || user.username;
    } else {
      user = {
        id: socketId,
        username: username.trim() || `Jammer ${room.users.length + 1}`,
        avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(username || socketId)}`,
        isHost: room.users.length === 0, // Fallback if host left
        isDJ: room.users.length === 0,
        joinedAt: Date.now(),
      };
      if (user.isHost) {
        room.hostId = user.id;
      }
      room.users.push(user);
    }

    this.socketMap.set(socketId, { roomId: room.id, userId: user.id });
    this.updateVoteSkipThreshold(room);

    // Add system message
    const joinMsg: ChatMessage = {
      id: `sys-${Date.now()}-${Math.random()}`,
      userId: 'system',
      username: 'JamFlow Bot',
      avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=jamflow-bot',
      content: `${user.username} joined the jam! 👋`,
      timestamp: Date.now(),
      isSystem: true,
    };
    room.chat.push(joinMsg);
    if (room.chat.length > 100) room.chat.shift();

    return { room, user };
  }

  public leaveRoom(socketId: string): { room?: Room; departedUser?: User; newHost?: User } | null {
    const info = this.socketMap.get(socketId);
    if (!info) return null;

    const { roomId, userId } = info;
    this.socketMap.delete(socketId);

    const room = this.rooms.get(roomId);
    if (!room) return null;

    const userIndex = room.users.findIndex((u) => u.id === userId);
    if (userIndex === -1) return null;

    const [departedUser] = room.users.splice(userIndex, 1);

    // Remove user's vote to skip if present
    room.voteSkip.votedUserIds = room.voteSkip.votedUserIds.filter((id) => id !== userId);
    this.updateVoteSkipThreshold(room);

    let newHost: User | undefined;

    // Host transfer if host left
    if (room.hostId === userId) {
      if (room.users.length > 0) {
        // Transfer to next user (prefer DJ if any)
        const nextHost = room.users.find((u) => u.isDJ) || room.users[0];
        nextHost.isHost = true;
        nextHost.isDJ = true;
        room.hostId = nextHost.id;
        newHost = nextHost;

        const hostTransferMsg: ChatMessage = {
          id: `sys-${Date.now()}-${Math.random()}`,
          userId: 'system',
          username: 'JamFlow Bot',
          avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=jamflow-bot',
          content: `👑 ${nextHost.username} is now the Jam Host.`,
          timestamp: Date.now(),
          isSystem: true,
        };
        room.chat.push(hostTransferMsg);
      }
    }

    const leaveMsg: ChatMessage = {
      id: `sys-${Date.now()}-${Math.random()}`,
      userId: 'system',
      username: 'JamFlow Bot',
      avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=jamflow-bot',
      content: `${departedUser.username} left the room.`,
      timestamp: Date.now(),
      isSystem: true,
    };
    room.chat.push(leaveMsg);
    if (room.chat.length > 100) room.chat.shift();

    return { room, departedUser, newHost };
  }

  // Playback sync helpers
  public calculateCurrentPosition(room: Room): number {
    if (room.playbackState !== 'playing') {
      return room.position;
    }
    const elapsedSeconds = (Date.now() - room.lastSyncTimestamp) / 1000;
    const estimated = room.position + elapsedSeconds;

    if (room.currentTrack && room.currentTrack.duration > 0 && estimated >= room.currentTrack.duration) {
      return room.currentTrack.duration;
    }
    return estimated;
  }

  public setPlay(room: Room, clientPosition?: number): { position: number; timestamp: number } {
    if (clientPosition !== undefined && !isNaN(clientPosition)) {
      room.position = clientPosition;
    }
    room.playbackState = 'playing';
    room.lastSyncTimestamp = Date.now();
    return { position: room.position, timestamp: room.lastSyncTimestamp };
  }

  public setPause(room: Room, clientPosition?: number): { position: number; timestamp: number } {
    if (clientPosition !== undefined && !isNaN(clientPosition)) {
      room.position = clientPosition;
    } else {
      room.position = this.calculateCurrentPosition(room);
    }
    room.playbackState = 'paused';
    room.lastSyncTimestamp = Date.now();
    return { position: room.position, timestamp: room.lastSyncTimestamp };
  }

  public setSeek(room: Room, newPosition: number): { position: number; timestamp: number } {
    room.position = Math.max(0, newPosition);
    room.lastSyncTimestamp = Date.now();
    return { position: room.position, timestamp: room.lastSyncTimestamp };
  }

  public updateTrackDuration(room: Room, duration: number) {
    if (room.currentTrack && duration > 0) {
      room.currentTrack.duration = duration;
    }
  }

  // Queue manipulation
  public async addTrackToQueue(room: Room, urlOrId: string, user: User): Promise<Track | null> {
    const metadata = await fetchYouTubeMetadata(urlOrId);
    if (!metadata) return null;

    const isLive = metadata.duration === 0 ||
      /radio|live stream|24\/7|live broadcast/i.test(metadata.title) ||
      ['jfKfPfyJRdk', '4xDzrJKXOOY', '5yx6BWlEVcY', 'lP26UCnoH9s', 'Dx5qFachd3A', '5qap5aO4i9A'].includes(metadata.videoId);

    const track: Track = {
      id: `track-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      videoId: metadata.videoId,
      url: metadata.url,
      title: metadata.title,
      author: metadata.author,
      duration: isLive ? 0 : metadata.duration,
      thumbnail: metadata.thumbnail,
      isLive,
      addedBy: {
        id: user.id,
        username: user.username,
      },
      addedAt: Date.now(),
    };

    // If nothing currently playing, start playing immediately!
    if (!room.currentTrack) {
      room.currentTrack = track;
      room.playbackState = 'playing';
      room.position = 0;
      room.lastSyncTimestamp = Date.now();
      room.voteSkip = { votedUserIds: [], requiredVotes: 1 };
      this.updateVoteSkipThreshold(room);
    } else {
      room.queue.push(track);
    }

    const addMsg: ChatMessage = {
      id: `sys-${Date.now()}-${Math.random()}`,
      userId: 'system',
      username: 'JamFlow Bot',
      avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=jamflow-bot',
      content: `🎵 ${user.username} queued "${track.title}"`,
      timestamp: Date.now(),
      isSystem: true,
    };
    room.chat.push(addMsg);
    if (room.chat.length > 100) room.chat.shift();

    return track;
  }

  public advanceTrack(room: Room): Track | null {
    room.voteSkip = { votedUserIds: [], requiredVotes: 1 };

    if (room.queue.length > 0) {
      const nextTrack = room.queue.shift()!;
      room.currentTrack = nextTrack;
      room.playbackState = 'playing';
      room.position = 0;
      room.lastSyncTimestamp = Date.now();
      this.updateVoteSkipThreshold(room);
      return nextTrack;
    } else {
      room.currentTrack = null;
      room.playbackState = 'paused';
      room.position = 0;
      room.lastSyncTimestamp = Date.now();
      return null;
    }
  }

  public removeQueueTrack(room: Room, trackId: string): boolean {
    const idx = room.queue.findIndex((t) => t.id === trackId);
    if (idx !== -1) {
      room.queue.splice(idx, 1);
      return true;
    }
    return false;
  }

  public reorderQueue(room: Room, startIndex: number, endIndex: number): boolean {
    if (
      startIndex < 0 ||
      startIndex >= room.queue.length ||
      endIndex < 0 ||
      endIndex >= room.queue.length
    ) {
      return false;
    }
    const [movedTrack] = room.queue.splice(startIndex, 1);
    room.queue.splice(endIndex, 0, movedTrack);
    return true;
  }

  public skipToTrack(room: Room, trackId: string): Track | null {
    const idx = room.queue.findIndex((t) => t.id === trackId);
    if (idx === -1) return null;

    const [selectedTrack] = room.queue.splice(idx, 1);
    room.currentTrack = selectedTrack;
    room.playbackState = 'playing';
    room.position = 0;
    room.lastSyncTimestamp = Date.now();
    room.voteSkip = { votedUserIds: [], requiredVotes: 1 };
    this.updateVoteSkipThreshold(room);
    return selectedTrack;
  }

  public clearQueue(room: Room) {
    room.queue = [];
  }

  // Vote to skip
  public voteSkip(room: Room, userId: string): { skipped: boolean; voteSkip: Room['voteSkip'] } {
    if (!room.currentTrack) {
      return { skipped: false, voteSkip: room.voteSkip };
    }

    if (!room.voteSkip.votedUserIds.includes(userId)) {
      room.voteSkip.votedUserIds.push(userId);
    }

    this.updateVoteSkipThreshold(room);

    if (room.voteSkip.votedUserIds.length >= room.voteSkip.requiredVotes) {
      this.advanceTrack(room);
      const skipMsg: ChatMessage = {
        id: `sys-${Date.now()}-${Math.random()}`,
        userId: 'system',
        username: 'JamFlow Bot',
        avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=jamflow-bot',
        content: `⏭️ Vote to skip passed! Now playing next track.`,
        timestamp: Date.now(),
        isSystem: true,
      };
      room.chat.push(skipMsg);
      return { skipped: true, voteSkip: room.voteSkip };
    }

    return { skipped: false, voteSkip: room.voteSkip };
  }

  private updateVoteSkipThreshold(room: Room) {
    const totalUsers = Math.max(1, room.users.length);
    const thresholdPercent = room.settings.skipThresholdPercent || 50;
    // e.g. 1 user -> 1 vote. 2 users (50%) -> 1 vote. 3 users (50%) -> 2 votes. 4 users (50%) -> 2 votes.
    room.voteSkip.requiredVotes = Math.max(1, Math.ceil((totalUsers * thresholdPercent) / 100));
  }

  // Permissions & Settings
  public canControlPlayback(room: Room, user: User): boolean {
    if (room.settings.isOpenControl) return true;
    return user.isHost || user.isDJ;
  }

  public canAddToQueue(room: Room, user: User): boolean {
    if (room.settings.isOpenQueue) return true;
    return user.isHost || user.isDJ;
  }

  public updateSettings(room: Room, settings: Partial<RoomSettings>) {
    room.settings = { ...room.settings, ...settings };
    this.updateVoteSkipThreshold(room);
  }

  public transferHost(room: Room, targetUserId: string): User | null {
    const target = room.users.find((u) => u.id === targetUserId);
    if (!target) return null;

    room.users.forEach((u) => (u.isHost = false));
    target.isHost = true;
    target.isDJ = true;
    room.hostId = target.id;
    return target;
  }

  public toggleDJ(room: Room, targetUserId: string): User | null {
    const target = room.users.find((u) => u.id === targetUserId);
    if (!target || target.isHost) return null; // Host is always DJ

    target.isDJ = !target.isDJ;
    return target;
  }

  public addChatMessage(room: Room, user: User, content: string): ChatMessage {
    const msg: ChatMessage = {
      id: `chat-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      userId: user.id,
      username: user.username,
      avatar: user.avatar,
      content: content.trim(),
      timestamp: Date.now(),
    };
    room.chat.push(msg);
    if (room.chat.length > 100) room.chat.shift();
    return msg;
  }

  private cleanupIdleRooms() {
    const maxIdleMs = 30 * 60 * 1000;
    const now = Date.now();
    this.rooms.forEach((room, roomId) => {
      if (room.users.length === 0 && now - room.createdAt > maxIdleMs) {
        this.rooms.delete(roomId);
      }
    });
  }
}
