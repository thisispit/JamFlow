import { RoomManager } from '../src/server/roomManager';
import { extractYouTubeId, fetchYouTubeMetadata, formatTime } from '../src/lib/youtube';

async function runTests() {
  console.log('=== JamFlow Automated Test Suite ===\n');
  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string) {
    if (condition) {
      console.log(`[PASS] ${testName}`);
      passed++;
    } else {
      console.error(`[FAIL] ${testName}`);
      failed++;
    }
  }

  // --- 1. YouTube Utility Tests ---
  console.log('--- 1. Testing YouTube Utilities ---');

  const id1 = extractYouTubeId('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
  assert(id1 === 'dQw4w9WgXcQ', 'Extract ID from standard watch URL');

  const id2 = extractYouTubeId('https://youtu.be/dQw4w9WgXcQ?si=123');
  assert(id2 === 'dQw4w9WgXcQ', 'Extract ID from youtu.be short link');

  const id3 = extractYouTubeId('https://www.youtube.com/shorts/dQw4w9WgXcQ');
  assert(id3 === 'dQw4w9WgXcQ', 'Extract ID from Shorts URL');

  const id4 = extractYouTubeId('dQw4w9WgXcQ');
  assert(id4 === 'dQw4w9WgXcQ', 'Extract ID from raw 11-char ID');

  const formatted1 = formatTime(125);
  assert(formatted1 === '2:05', 'Format seconds to mm:ss (125 -> 2:05)');

  const formatted2 = formatTime(3665);
  assert(formatted2 === '1:01:05', 'Format seconds to hh:mm:ss (3665 -> 1:01:05)');

  // Test oEmbed metadata resolution
  console.log('\n--- 2. Testing YouTube Metadata Fetch ---');
  const metadata = await fetchYouTubeMetadata('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
  assert(metadata !== null, 'Fetched YouTube metadata successfully');
  assert(metadata?.videoId === 'dQw4w9WgXcQ', 'Metadata contains correct video ID');
  assert(typeof metadata?.title === 'string' && metadata.title.length > 0, `Title resolved: "${metadata?.title}"`);

  // --- 3. Room Management & State Tests ---
  console.log('\n--- 3. Testing RoomManager Lifecycle ---');
  const manager = new RoomManager();

  // Test createRoom
  const { room, user: host } = manager.createRoom('Alice', 'socket-alice', 'Chill Lounge');
  assert(room.id.startsWith('JAM-'), `Room ID generated format correct (${room.id})`);
  assert(room.name === 'Chill Lounge', 'Room name matches custom name');
  assert(room.hostId === 'socket-alice', 'Alice is designated Host');
  assert(host.isHost === true && host.isDJ === true, 'Host has host and DJ roles');
  assert(room.users.length === 1, 'Room has 1 user');

  // Test joinRoom
  const joinResult = manager.joinRoom(room.id, 'Bob', 'socket-bob');
  assert(!('error' in joinResult), 'Bob successfully joined room');
  if (!('error' in joinResult)) {
    assert(joinResult.user.isHost === false, 'Bob is listener, not host');
    assert(room.users.length === 2, 'Room now has 2 users');
  }

  // --- 4. Playback Synchronization Tests ---
  console.log('\n--- 4. Testing Playback Synchronization ---');
  // Play state
  const playData = manager.setPlay(room, 15);
  assert(room.playbackState === 'playing', 'Playback state set to playing');
  assert(room.position === 15, 'Playback position set to 15s');

  // Pause state
  const pauseData = manager.setPause(room, 25);
  assert(room.playbackState === 'paused', 'Playback state set to paused');
  assert(room.position === 25, 'Playback position updated to 25s');

  // Seek state
  const seekData = manager.setSeek(room, 42);
  assert(room.position === 42, 'Playback seek position set to 42s');

  // --- 5. Queue & Vote to Skip Tests ---
  console.log('\n--- 5. Testing Queue & Vote to Skip ---');
  // Add first track
  const track1 = await manager.addTrackToQueue(room, 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', host);
  assert(track1 !== null, 'Track 1 added to queue');
  assert(room.currentTrack?.id === track1?.id, 'First track immediately becomes currentTrack');
  assert(room.playbackState === 'playing', 'First track starts playing immediately');
  assert(room.queue.length === 0, 'Queue is empty because track 1 is actively playing');

  // Add second track
  const track2 = await manager.addTrackToQueue(room, 'https://www.youtube.com/watch?v=4xDzrJKXOOY', host);
  assert(track2 !== null, 'Track 2 added');
  assert(room.queue.length === 1, 'Queue has 1 upcoming track');
  assert(room.queue[0].id === track2?.id, 'Track 2 is queued next');

  // Add third track
  const track3 = await manager.addTrackToQueue(room, 'https://www.youtube.com/watch?v=jfKfPfyJRdk', host);
  assert(room.queue.length === 2, 'Queue has 2 upcoming tracks');

  // Reorder queue
  const reorderOk = manager.reorderQueue(room, 0, 1);
  assert(reorderOk === true, 'Queue reordered');
  assert(room.queue[0].id === track3?.id, 'Track 3 moved to top of queue');

  // Vote to Skip: With 2 users and 50% threshold, 1 vote needed
  console.log('\n--- Testing Vote to Skip ---');
  assert(room.voteSkip.requiredVotes === 1, `Required votes calculated correctly (${room.voteSkip.requiredVotes})`);
  const skipResult = manager.voteSkip(room, 'socket-bob');
  assert(skipResult.skipped === true, 'Track skipped automatically after threshold reached');
  assert(room.currentTrack?.id === track3?.id, 'Next track (Track 3) is now currentTrack');
  assert(room.queue.length === 1, 'Queue remaining length is 1');

  // Advance track when last track ends
  const nextTrack = manager.advanceTrack(room);
  assert(nextTrack?.id === track2?.id, 'Advanced to last queued track (Track 2)');
  assert(room.queue.length === 0, 'Queue now empty');

  // Advance when queue empty
  const emptyAdvance = manager.advanceTrack(room);
  assert(emptyAdvance === null, 'Advance on empty queue returns null');
  assert(room.currentTrack === null, 'currentTrack is null');
  assert(room.playbackState === 'paused', 'Playback paused when queue is empty');

  // --- 6. Host Migration Tests ---
  console.log('\n--- 6. Testing Host Migration on Disconnect ---');
  const leaveRes = manager.leaveRoom('socket-alice');
  assert(leaveRes !== null, 'Alice left room');
  assert(leaveRes?.departedUser?.username === 'Alice', 'Departed user is Alice');
  assert(leaveRes?.newHost?.id === 'socket-bob', 'Bob was promoted to Host automatically');
  assert(room.hostId === 'socket-bob', 'Room hostId is now Bob');

  // Final summary
  console.log(`\n========================================`);
  console.log(`Results: ${passed} passed, ${failed} failed`);
  console.log(`========================================\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Test run error:', err);
  process.exit(1);
});
