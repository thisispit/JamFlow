# JamFlow 🎵

> **Real-Time Collaborative Listening Platform** — Listen together in synchronized harmony.

JamFlow is a modern web application that allows multiple users to join temporary rooms and listen to YouTube music and videos in real time with synchronized playback, shared queues, live chat, floating reactions, and host permissions.

---

## 🌟 Key Features

### Phase 1 — Room System
- **Temporary Rooms**: Unique short codes (e.g. `JAM-X921`) generated instantly.
- **Presence & Participant Tracking**: Real-time join/leave tracking with live listener counts and avatars.
- **Host & DJ Roles**: Rooms feature an authoritative host who can delegate DJ powers to participants.
- **Host Migration**: If a host leaves, ownership automatically passes to the active DJ or next participant.
- **Shareable Links**: One-click link copying to invite friends.

### Phase 2 — YouTube Embedded Player
- **Compliant Playback**: Official YouTube IFrame Player API integration. Zero audio extraction, no proxying, fully compliant with YouTube's Terms of Service.
- **Universal URL Parsing**: Supports standard YouTube links (`watch?v=`), short links (`youtu.be/`), embed links, shorts, and raw video IDs.
- **Automatic Metadata**: Resolves track titles, author/channel, and thumbnails using YouTube's official oEmbed service.
- **Custom Player Interface**: Sleek dark-mode interface with scrub bar, volume slider, mute toggle, and full-screen controls.

### Phase 3 — Real-Time Playback Synchronization
- **Authoritative Server State**: Playback position, state (`playing` / `paused`), and epoch timestamps are tracked on the server.
- **Automatic Drift Compensation**: Clients continually compute expected time (`position + elapsed`) and smoothly seek if drift exceeds threshold.
- **Browser Autoplay Handling**: Modern browsers restrict unmuted autoplay without user interaction. JamFlow includes an interactive "Click to Join Audio & Sync" overlay to ensure users never get stuck in a broken silent state.
- **Sync Status Indicator**: Real-time status badge with drift monitor (ms) and a manual "Sync with Host" trigger.

### Phase 4 — Collaborative Features
- **Shared Synchronized Queue**: Add tracks, reorder, delete, and auto-advance to the next video when the current song finishes.
- **Vote to Skip**: Community-driven track skipping. When active listeners meet the required majority (>50%), the track skips and celebratory confetti triggers.
- **Live Room Chat**: Integrated chat room with timestamps, system notifications for joins, leaves, and queue events.
- **Floating Emoji Reactions**: Send interactive emojis (🔥, ❤️, 🎵, 👏, 🎉, 🚀) that float across all listeners' screens in real time.
- **Host Control Settings**: Toggle between "Collaborative (Open Controls)" and "DJ/Host Only" modes.

---

## 🏗️ Architecture

```text
User Browser (React + Tailwind CSS)
      │
      ├─► Next.js App Router (Pages: / and /room/[id])
      ├─► YouTube IFrame Player (YT.Player API)
      └─► Socket.IO Client (Auto-reconnect & drift corrector)
              │
              │  WebSocket / Polling
              ▼
Node.js + Socket.IO Server (server.ts)
      │
      ├─► RoomManager State Machine (In-memory Room Store)
      ├─► Playback Synchronization & Drift Model
      ├─► Shared Queue & Vote-to-Skip Engine
      └─► YouTube oEmbed Metadata Fetcher
```

---

## 🚀 Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Run the Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### 3. Run Automated Tests
```bash
npm test
```

### 4. Build for Production
```bash
npm run build
npm start
```

---

## 🧪 Testing

JamFlow includes an automated test suite verifying:
- URL parsing across all YouTube URL formats (standard, shorts, embed, youtu.be, raw IDs)
- Live YouTube oEmbed metadata fetching
- Room creation and joining flows
- Playback synchronization calculations
- Queue additions, reordering, and auto-advancement
- Dynamic vote-to-skip thresholds and automatic triggering
- Host migration on disconnect

Run tests with:
```bash
npm test
```

---

## 📜 Compliance Notice
JamFlow strictly uses YouTube's official embedded player (`window.YT.Player`). JamFlow **does not** download, extract, proxy, convert, or remove advertisements from YouTube content, complying fully with YouTube's Terms of Service and Developer Policies.
