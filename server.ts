import { createServer } from 'http';
import { parse } from 'url';
import next from 'next';
import { Server as SocketIOServer } from 'socket.io';
import { RoomManager } from './src/server/roomManager';
import {
  ClientToServerEvents,
  ServerToClientEvents,
} from './src/types';

const isStandalone = process.env.STANDALONE_SOCKET === 'true';
const dev = process.env.NODE_ENV !== 'production';
const hostname = '0.0.0.0';
const port = parseInt(process.env.PORT || '3000', 10);

const roomManager = new RoomManager();

const runServer = (handle?: any) => {
  const httpServer = createServer((req, res) => {
    try {
      // Health check endpoint for Render, Railway, uptime monitors
      if (req.url === '/health' || (isStandalone && req.url === '/')) {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'ok', service: 'JamFlow WebSocket Server', timestamp: new Date().toISOString() }));
        return;
      }

      // Intercept any recursive redirect loop artifacts from previous browser cache
      if (req.url && req.url.includes('localhost:3000')) {
        res.writeHead(302, {
          Location: '/',
          'Clear-Site-Data': '"cache"',
          'Cache-Control': 'no-store',
        });
        res.end();
        return;
      }

      if (handle) {
        const parsedUrl = parse(req.url || '/', true);
        handle(req, res, parsedUrl);
      } else {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Not Found');
      }
    } catch (err) {
      console.error('Error handling HTTP request:', err);
      res.statusCode = 500;
      res.end('Internal Server Error');
    }
  });

  const io = new SocketIOServer<ClientToServerEvents, ServerToClientEvents>(httpServer, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
    transports: ['websocket', 'polling'],
  });

  io.on('connection', (socket) => {
    console.log(`[Socket Connected] ID: ${socket.id}`);

    // Create a new room
    socket.on('room:create', ({ username, roomName }, callback) => {
      try {
        const { room, user } = roomManager.createRoom(username, socket.id, roomName);
        socket.join(room.id);
        console.log(`[Room Created] Room: ${room.id} by ${user.username}`);
        callback({ success: true, roomId: room.id });
      } catch (err: any) {
        console.error('Error creating room:', err);
        callback({ success: false, error: err.message || 'Failed to create room' });
      }
    });

    // Join existing room
    socket.on('room:join', ({ roomId, username }, callback) => {
      try {
        const result = roomManager.joinRoom(roomId, username, socket.id);
        if ('error' in result) {
          return callback({ success: false, error: result.error });
        }

        const { room, user } = result;
        socket.join(room.id);
        console.log(`[Room Joined] User ${user.username} joined room ${room.id}`);

        // Broadcast authoritative users list to everyone in room
        io.to(room.id).emit('room:users_updated', room.users);
        socket.to(room.id).emit('room:user_joined', user);

        // Send recent chat message to room
        const lastChat = room.chat[room.chat.length - 1];
        if (lastChat) {
          io.to(room.id).emit('chat:new_message', lastChat);
        }

        callback({ success: true, room, user });
      } catch (err: any) {
        console.error('Error joining room:', err);
        callback({ success: false, error: err.message || 'Failed to join room' });
      }
    });

    // Explicit leave
    socket.on('room:leave', () => {
      handleLeave(socket);
    });

    // Disconnect
    socket.on('disconnect', () => {
      console.log(`[Socket Disconnected] ID: ${socket.id}`);
      handleLeave(socket);
    });

    // Playback control: Play
    socket.on('playback:play', ({ position }) => {
      const info = roomManager.getSocketInfo(socket.id);
      if (!info) return;

      const room = roomManager.getRoom(info.roomId);
      if (!room) return;

      const user = room.users.find((u) => u.id === socket.id);
      if (!user || !roomManager.canControlPlayback(room, user)) {
        return socket.emit('error:notification', { message: 'Only Host or DJ can control playback.' });
      }

      const syncData = roomManager.setPlay(room, position);
      io.to(room.id).emit('playback:play', {
        position: syncData.position,
        timestamp: syncData.timestamp,
        initiatedBy: user.username,
      });
    });

    // Playback control: Pause
    socket.on('playback:pause', ({ position }) => {
      const info = roomManager.getSocketInfo(socket.id);
      if (!info) return;

      const room = roomManager.getRoom(info.roomId);
      if (!room) return;

      const user = room.users.find((u) => u.id === socket.id);
      if (!user || !roomManager.canControlPlayback(room, user)) {
        return socket.emit('error:notification', { message: 'Only Host or DJ can control playback.' });
      }

      const syncData = roomManager.setPause(room, position);
      io.to(room.id).emit('playback:pause', {
        position: syncData.position,
        timestamp: syncData.timestamp,
        initiatedBy: user.username,
      });
    });

    // Playback control: Seek
    socket.on('playback:seek', ({ position }) => {
      const info = roomManager.getSocketInfo(socket.id);
      if (!info) return;

      const room = roomManager.getRoom(info.roomId);
      if (!room) return;

      const user = room.users.find((u) => u.id === socket.id);
      if (!user || !roomManager.canControlPlayback(room, user)) {
        return socket.emit('error:notification', { message: 'Only Host or DJ can control playback.' });
      }

      const syncData = roomManager.setSeek(room, position);
      io.to(room.id).emit('playback:seek', {
        position: syncData.position,
        timestamp: syncData.timestamp,
        initiatedBy: user.username,
      });
    });

    // Playback control: Track Ended
    socket.on('playback:track_ended', ({ trackId }) => {
      const info = roomManager.getSocketInfo(socket.id);
      if (!info) return;

      const room = roomManager.getRoom(info.roomId);
      if (!room || !room.currentTrack || room.currentTrack.id !== trackId) return;

      const nextTrack = roomManager.advanceTrack(room);
      io.to(room.id).emit('queue:track_started', nextTrack);
      io.to(room.id).emit('queue:updated', room.queue);
      io.to(room.id).emit('queue:vote_skip_updated', room.voteSkip);
    });

    // Client requests full sync
    socket.on('playback:request_sync', (callback) => {
      const info = roomManager.getSocketInfo(socket.id);
      if (!info) return;

      const room = roomManager.getRoom(info.roomId);
      if (!room) return;

      const pos = roomManager.calculateCurrentPosition(room);
      callback({
        currentTrack: room.currentTrack,
        playbackState: room.playbackState,
        position: pos,
        timestamp: room.lastSyncTimestamp,
      });
    });

    // Queue: Add track
    socket.on('queue:add', async ({ url }, callback) => {
      const info = roomManager.getSocketInfo(socket.id);
      if (!info) {
        if (callback) callback({ success: false, error: 'Not in a room' });
        return;
      }

      const room = roomManager.getRoom(info.roomId);
      if (!room) {
        if (callback) callback({ success: false, error: 'Room not found' });
        return;
      }

      const user = room.users.find((u) => u.id === socket.id);
      if (!user) {
        if (callback) callback({ success: false, error: 'User not recognized' });
        return;
      }

      if (!roomManager.canAddToQueue(room, user)) {
        if (callback) callback({ success: false, error: 'Queue is locked by host.' });
        return;
      }

      const isFirstTrack = room.currentTrack === null;
      const track = await roomManager.addTrackToQueue(room, url, user);

      if (!track) {
        if (callback) callback({ success: false, error: 'Invalid YouTube link or video not found.' });
        return;
      }

      if (isFirstTrack) {
        io.to(room.id).emit('queue:track_started', track);
        io.to(room.id).emit('playback:sync', {
          currentTrack: track,
          playbackState: 'playing',
          position: 0,
          timestamp: room.lastSyncTimestamp,
          initiatedBy: user.username,
        });
      }

      io.to(room.id).emit('queue:updated', room.queue);
      const lastMsg = room.chat[room.chat.length - 1];
      if (lastMsg) io.to(room.id).emit('chat:new_message', lastMsg);

      if (callback) callback({ success: true });
    });

    // Queue: Remove track
    socket.on('queue:remove', ({ trackId }) => {
      const info = roomManager.getSocketInfo(socket.id);
      if (!info) return;

      const room = roomManager.getRoom(info.roomId);
      if (!room) return;

      const user = room.users.find((u) => u.id === socket.id);
      if (!user || !roomManager.canAddToQueue(room, user)) return;

      const removed = roomManager.removeQueueTrack(room, trackId);
      if (removed) {
        io.to(room.id).emit('queue:updated', room.queue);
      }
    });

    // Queue: Reorder
    socket.on('queue:reorder', ({ startIndex, endIndex }) => {
      const info = roomManager.getSocketInfo(socket.id);
      if (!info) return;

      const room = roomManager.getRoom(info.roomId);
      if (!room) return;

      const user = room.users.find((u) => u.id === socket.id);
      if (!user || !roomManager.canControlPlayback(room, user)) return;

      const reordered = roomManager.reorderQueue(room, startIndex, endIndex);
      if (reordered) {
        io.to(room.id).emit('queue:updated', room.queue);
      }
    });

    // Queue: Skip To Track
    socket.on('queue:skip_to', ({ trackId }) => {
      const info = roomManager.getSocketInfo(socket.id);
      if (!info) return;

      const room = roomManager.getRoom(info.roomId);
      if (!room) return;

      const user = room.users.find((u) => u.id === socket.id);
      if (!user || !roomManager.canControlPlayback(room, user)) return;

      const track = roomManager.skipToTrack(room, trackId);
      if (track) {
        io.to(room.id).emit('queue:track_started', track);
        io.to(room.id).emit('queue:updated', room.queue);
        io.to(room.id).emit('queue:vote_skip_updated', room.voteSkip);
      }
    });

    // Queue: Clear
    socket.on('queue:clear', () => {
      const info = roomManager.getSocketInfo(socket.id);
      if (!info) return;

      const room = roomManager.getRoom(info.roomId);
      if (!room) return;

      const user = room.users.find((u) => u.id === socket.id);
      if (!user || !user.isHost) return;

      roomManager.clearQueue(room);
      io.to(room.id).emit('queue:updated', []);
    });

    // Vote to Skip
    socket.on('queue:vote_skip', () => {
      const info = roomManager.getSocketInfo(socket.id);
      if (!info) return;

      const room = roomManager.getRoom(info.roomId);
      if (!room || !room.currentTrack) return;

      const { skipped, voteSkip } = roomManager.voteSkip(room, socket.id);

      if (skipped) {
        io.to(room.id).emit('queue:track_started', room.currentTrack);
        io.to(room.id).emit('queue:updated', room.queue);
        io.to(room.id).emit('queue:vote_skip_updated', room.voteSkip);
        const lastMsg = room.chat[room.chat.length - 1];
        if (lastMsg) io.to(room.id).emit('chat:new_message', lastMsg);
      } else {
        io.to(room.id).emit('queue:vote_skip_updated', voteSkip);
      }
    });

    // Settings
    socket.on('room:update_settings', (newSettings) => {
      const info = roomManager.getSocketInfo(socket.id);
      if (!info) return;

      const room = roomManager.getRoom(info.roomId);
      if (!room) return;

      const user = room.users.find((u) => u.id === socket.id);
      if (!user || !user.isHost) {
        return socket.emit('error:notification', { message: 'Only host can change room settings.' });
      }

      roomManager.updateSettings(room, newSettings);
      io.to(room.id).emit('room:settings_updated', room.settings);
      io.to(room.id).emit('queue:vote_skip_updated', room.voteSkip);
    });

    // Host Transfer
    socket.on('room:transfer_host', ({ targetUserId }) => {
      const info = roomManager.getSocketInfo(socket.id);
      if (!info) return;

      const room = roomManager.getRoom(info.roomId);
      if (!room) return;

      const user = room.users.find((u) => u.id === socket.id);
      if (!user || !user.isHost) return;

      const newHost = roomManager.transferHost(room, targetUserId);
      if (newHost) {
        io.to(room.id).emit('room:host_changed', {
          hostId: newHost.id,
          hostUsername: newHost.username,
        });
        io.to(room.id).emit('room:state', room);
      }
    });

    // DJ Toggle
    socket.on('room:toggle_dj', ({ targetUserId }) => {
      const info = roomManager.getSocketInfo(socket.id);
      if (!info) return;

      const room = roomManager.getRoom(info.roomId);
      if (!room) return;

      const user = room.users.find((u) => u.id === socket.id);
      if (!user || !user.isHost) return;

      const target = roomManager.toggleDJ(room, targetUserId);
      if (target) {
        io.to(room.id).emit('room:state', room);
      }
    });

    // Chat
    socket.on('chat:send', ({ content }) => {
      const info = roomManager.getSocketInfo(socket.id);
      if (!info) return;

      const room = roomManager.getRoom(info.roomId);
      if (!room) return;

      const user = room.users.find((u) => u.id === socket.id);
      if (!user || !content.trim()) return;

      const msg = roomManager.addChatMessage(room, user, content);
      io.to(room.id).emit('chat:new_message', msg);
    });

    // Reactions
    socket.on('reaction:send', ({ emoji }) => {
      const info = roomManager.getSocketInfo(socket.id);
      if (!info) return;

      const room = roomManager.getRoom(info.roomId);
      if (!room) return;

      const user = room.users.find((u) => u.id === socket.id);
      if (!user) return;

      const reaction = {
        id: `react-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        emoji,
        userId: user.id,
        username: user.username,
        timestamp: Date.now(),
      };

      io.to(room.id).emit('reaction:new', reaction);
    });
  });

  function handleLeave(socket: any) {
    const res = roomManager.leaveRoom(socket.id);
    if (!res || !res.room || !res.departedUser) return;

    const { room, departedUser, newHost } = res;
    socket.leave(room.id);

    io.to(room.id).emit('room:user_left', {
      userId: departedUser.id,
      username: departedUser.username,
      newHostId: newHost ? newHost.id : undefined,
    });
    // Broadcast authoritative updated users list to all remaining room members
    io.to(room.id).emit('room:users_updated', room.users);

    if (newHost) {
      io.to(room.id).emit('room:host_changed', {
        hostId: newHost.id,
        hostUsername: newHost.username,
      });
    }

    io.to(room.id).emit('queue:vote_skip_updated', room.voteSkip);

    const lastMsg = room.chat[room.chat.length - 1];
    if (lastMsg) {
      io.to(room.id).emit('chat:new_message', lastMsg);
    }
  }

  httpServer.listen(port, '0.0.0.0', () => {
    console.log(`> JamFlow ready on http://${hostname}:${port} ${isStandalone ? '(Standalone WebSocket Server)' : '(Next.js + Socket.io)'}`);
  });
};

if (isStandalone) {
  console.log('> Starting JamFlow in Standalone WebSocket Mode (No Next.js SSR overhead)');
  runServer();
} else {
  const app = next({ dev });
  const handle = app.getRequestHandler();
  app.prepare().then(() => {
    runServer(handle);
  });
}
