# Multiplayer Implementation Guide

Complete peer-to-peer multiplayer system using WebRTC data channels for real-time game communication.

## Overview

The multiplayer system enables **2-player peer-to-peer multiplayer** using WebRTC data channels for real-time position synchronization. Each player runs their own physics simulation locally and broadcasts their position to the connected peer. Players connect directly after coordinating through a WebSocket signaling server.

### Key Features

- ✅ Peer-to-peer data channels (low latency ~50-100ms)
- ✅ WebSocket signaling server for connection setup
- ✅ Room-based matchmaking with URL sharing
- ✅ Automatic SDP/ICE candidate exchange
- ✅ Zustand state management
- ✅ TypeScript throughout
- ✅ Comprehensive test coverage (75 tests)
- ✅ 2-player connection limit
- ✅ TURN server support (Metered.ca)

### Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                     Browser Window 1 (Player A)              │
├──────────────────────────────────────────────────────────────┤
│  GameProvider                                                │
│  └─ MultiplayerWrapper (WebRTCProvider)                      │
│     ├─ Player (local physics simulation)                     │
│     │  └─ Broadcasts position every ~50ms                    │
│     └─ RemotePlayer (renders Player B's position)            │
│        └─ Receives position updates via WebRTC               │
└──────────────────────────────────────────────────────────────┘
                              │
                WebRTC Data Channel (P2P)
                              │
┌──────────────────────────────────────────────────────────────┐
│                     Browser Window 2 (Player B)              │
├──────────────────────────────────────────────────────────────┤
│  GameProvider                                                │
│  └─ MultiplayerWrapper (WebRTCProvider)                      │
│     ├─ Player (local physics simulation)                     │
│     │  └─ Broadcasts position every ~50ms                    │
│     └─ RemotePlayer (renders Player A's position)            │
│        └─ Receives position updates via WebRTC               │
└──────────────────────────────────────────────────────────────┘
```

---

## Quick Start

### 1. Install Dependencies

```bash
# Main app
npm install

# Signaling server
cd signaling-server
npm install
cd ..
```

### 2. Start Signaling Server

```bash
cd signaling-server
npm run dev
```

Server runs on `ws://localhost:8080`

### 3. Start Next.js App

```bash
npm run dev
```

### 4. Connect Two Players

**Option 1: URL Sharing (Recommended)**

1. **Player A:** Click "Create Room" → Click "Copy Link"
2. **Player A:** Share link (email, Slack, Discord, etc.)
3. **Player B:** Click the link → **Auto-joins automatically!** 🎉

**Option 2: Manual Room ID**

1. **Player A:** Click "Create Room" (note the room ID)
2. **Player B:** Enter same room ID → Click "Join Room"

**URL Structure:**

```
http://localhost:3000/multiplayer?room=game-room-1
                                    ↑
                              Room ID parameter
```

### 5. Play Together

- Each player controls **only their own marble** (keyboard/touch controls)
- Remote player's ball appears in **blue** for visual distinction
- Positions synchronized ~20 times per second (20Hz)
- Marbles can **collide** with each other (kinematic physics)
- Each client runs independent physics simulation

---

## Game Components

### RemotePlayer (`components/player/RemotePlayer.tsx`)

- Renders remote player's marble with **kinematic physics** (can collide but not affected by forces)
- Uses linear interpolation for smooth movement between network updates
- Position controlled by WebRTC messages from the peer
- **Blue tint** to distinguish from local player

### MultiplayerSlice (`stores/multiplayerSlice.ts`)

- Zustand store slice managing remote player state
- Stores: `Map<peerId, { position, rotation, lastUpdate }>`
- Actions: `addRemotePlayer`, `updateRemotePlayerPosition`, `removeRemotePlayer`

### Position Broadcasting (`hooks/useBroadcastPlayerPosition.ts`)

- Sends local player position to all connected peers
- Throttled to 20Hz (50ms interval) to reduce network traffic
- Includes position (Vector3) and rotation (Quaternion)

### Position Sync (`hooks/useMultiplayerSync.ts`)

- Listens for incoming WebRTC `player-position` messages
- Updates game store with remote player data
- Handles peer disconnection cleanup

### MultiplayerWrapper (`components/MultiplayerWrapper.tsx`)

- Provides WebRTC context to the game
- Initializes multiplayer synchronization via `useMultiplayerSync`
- Wraps game content to enable multiplayer

---

## WebRTC Components

### Project Structure

```
quiz-roller/
├── signaling-server/           # WebSocket signaling server
│   ├── src/
│   │   ├── server.ts          # Server entry point
│   │   ├── SignalingServer.ts # Core signaling logic
│   │   └── types.ts           # Message types
│   └── package.json
│
├── utils/webrtc/               # WebRTC core logic
│   ├── WebRTCConnection.ts    # RTCPeerConnection wrapper
│   └── SignalingClient.ts     # WebSocket client
│
├── components/webrtc/          # React components
│   ├── WebRTCProvider.tsx     # React provider + hooks
│   ├── SignalingExample.tsx   # Full example with signaling
│   └── WebRTCExample.tsx      # Manual connection example
│
├── stores/webrtc/              # Zustand state management
│   ├── types.ts               # Store types
│   ├── connectionSlice.ts     # Connection state
│   ├── signalingSlice.ts      # Signaling state
│   ├── dataChannelSlice.ts    # Messages state (max 100)
│   └── createWebRTCStore.ts   # Store factory
│
├── hooks/
│   ├── useSignaling.ts        # Automatic signaling hook
│   └── useWebRTCMessages.ts   # Message subscription
│
└── tests/webrtc/
    ├── WebRTCConnection.test.ts
    ├── WebRTCStore.test.ts
    └── SignalingClient.test.ts
```

### WebRTCProvider

Root provider for WebRTC state. Single unified context containing store, connections ref, ICE servers, and config.

**Features**:
- Single unified context (no nested providers)
- Fetches TURN credentials from `/api/turn-credentials` (Metered.ca)
- Enforces 2-player connection limit
- Generates unique peer IDs
- Handles cleanup on unmount

### useWebRTC()

Low-level peer connection management hook.

**Methods**:
- `createPeerConnection(peerId, role)` - Creates new peer connection
- `createOffer(peerId)` - Generates SDP offer (HOST)
- `createAnswer(peerId)` - Generates SDP answer (CLIENT)
- `sendMessage(peerId, message)` - Sends data via channel
- `setRemoteDescription(peerId, sdp)` - Sets remote SDP
- `addIceCandidate(peerId, candidate)` - Adds ICE candidate

### useSignaling()

High-level signaling + automatic peer setup hook.

**Methods**:
- `createRoom(roomId)` - Creates new room (become HOST)
- `joinRoom(roomId)` - Joins existing room (become CLIENT)
- `leaveRoom(roomId)` - Leaves current room
- `isConnected()` - Returns signaling connection status

**Callbacks**:
- `onRoomCreated` - Room successfully created
- `onRoomJoined` - Joined room with peer list
- `onRoomFull` - Room at capacity (2 players)

### useWebRTCMessages()

Subscribe to incoming messages from peers.

```typescript
useWebRTCMessages((message) => {
  console.log('Received:', message)
})
```

---

## Connection Flow

### HOST vs CLIENT

- **HOST**: Creates room, creates data channel, sends offer first
- **CLIENT**: Joins room, receives data channel, responds with answer

### Automatic Handshake

The `useSignaling` hook handles all of this automatically:

```
HOST                    Signaling Server              CLIENT
 │                             │                         │
 │  Peer B joined              │                         │
 │◄────────────────────────────┤                         │
 │                             │                         │
 │  Create connection          │                         │
 │  Generate offer             │                         │
 │──────────────────────────►│                         │
 │                             │  Offer                  │
 │                             ├────────────────────────►│
 │                             │                         │
 │                             │                    Create connection
 │                             │                    Generate answer
 │                             │  Answer                 │
 │◄────────────────────────────┤◄────────────────────────┤
 │                             │                         │
 │  ICE candidates             │  ICE candidates         │
 │◄───────────────────────────►│◄───────────────────────►│
 │                             │                         │
 │         Direct P2P connection established!            │
 │◄─────────────────────────────────────────────────────►│
```

### Key WebRTC Concepts

**SDP (Session Description Protocol)**
- Describes peer capabilities and media/data configuration
- **Offer**: HOST's configuration
- **Answer**: CLIENT's response

**ICE (Interactive Connectivity Establishment)**
- Finds the best network path between peers
- **STUN**: Discovers public IP (for NAT traversal)
- **TURN**: Relay server for restrictive NATs (via Metered.ca)
- **Candidates**: Possible network routes

**Data Channel**
- Bidirectional channel for arbitrary data
- Supports text, binary, or JSON
- Low latency (< 100ms typical)
- Ordered and reliable delivery

---

## Message Protocol

### Standard Format

```typescript
type WebRTCMessage = {
  type: string      // Message type identifier
  timestamp: number // Auto-added by sendMessage
  data: unknown     // Your custom payload
}
```

### Player Position Update

```typescript
{
  type: 'player-position',
  data: {
    position: { x: number, y: number, z: number },
    rotation: { x: number, y: number, z: number, w: number } // quaternion
  }
}
```

- Sent: ~20 times/second (50ms throttle)
- Purpose: Synchronize position and rotation

### Other Message Types

```typescript
// Player input
{ type: 'player-input', data: { left: -1, right: 0, up: 1, down: 0 } }

// Game events
{ type: 'collectible-collected', data: { id: 'coin-42' } }
{ type: 'ring-passed', data: { ringIndex: [2, 3] } }

// Game state sync
{ type: 'game-state', data: { stage: 'question', time: 45.2 } }
```

---

## Signaling Server

### Message Types

**Room Management**:
- `CREATE_ROOM` / `ROOM_CREATED` - Create a new room
- `JOIN_ROOM` / `ROOM_JOINED` - Join existing room
- `LEAVE_ROOM` - Leave current room
- `ROOM_FULL` - Room at capacity (2 players)

**WebRTC Signaling**:
- `OFFER` - SDP offer from peer
- `ANSWER` - SDP answer from peer
- `ICE_CANDIDATE` - ICE candidate for NAT traversal

### Environment Variables

```env
PORT=8080
MAX_PEERS_PER_ROOM=2
```

---

## Performance Optimizations

### Pre-allocated Objects (No GC Pressure)

```typescript
// RemotePlayer.tsx - reused every frame
const currentPos = useRef(new Vector3())
const targetPos = useRef(new Vector3())
const currentQuat = useRef(new Quaternion())
const targetQuat = useRef(new Quaternion())
```

### Position Throttling (Reduced Bandwidth)

- Broadcasts: 20Hz instead of 60Hz
- Network traffic: ~60 messages/second for 2 players
- Interpolation fills gaps for smooth 60fps visuals

### Linear Interpolation (Smooth Movement)

```typescript
currentPos.current.lerp(targetPos.current, LERP_FACTOR) // 0.2
currentQuat.current.slerp(targetQuat.current, LERP_FACTOR)
```

### Kinematic Physics (Collision Without Forces)

- Remote players use `type="kinematicPosition"`
- Can collide with local player but not affected by gravity/forces
- Position set via `setNextKinematicTranslation()`

### State Management

- **Zustand store**: Data that triggers UI updates
- **Refs**: Connection objects that change frequently (no re-renders)
- **Message history limit**: Max 100 messages prevents memory growth

---

## Integration Example

### Add Multiplayer to Any Page

```tsx
import { GameProvider } from '@/components/GameProvider'
import Main from '@/components/Main'
import { MultiplayerWrapper } from '@/components/MultiplayerWrapper'

export default function YourPage() {
  return (
    <GameProvider>
      <MultiplayerWrapper>
        <Main />
        {/* Optional: Add MultiplayerButton or MultiplayerControls */}
      </MultiplayerWrapper>
    </GameProvider>
  )
}
```

### Multiplayer Component Example

```tsx
'use client'
import { useState } from 'react'
import { useWebRTC, useWebRTCStore } from '@/components/webrtc/WebRTCProvider'
import { useSignaling } from '@/hooks/useSignaling'
import { useWebRTCMessages } from '@/hooks/useWebRTCMessages'

export function MultiplayerGame() {
  const [roomId, setRoomId] = useState('')

  const { createRoom, joinRoom, isConnected } = useSignaling({
    signalingUrl: 'ws://localhost:8080',
    onRoomJoined: (id, peers) => {
      console.log(`Joined room ${id} with ${peers.length} peers`)
    },
  })

  const { sendMessage } = useWebRTC()
  const peers = useWebRTCStore((s) => s.peers)
  const connectionState = useWebRTCStore((s) => s.connectionState)

  useWebRTCMessages((message) => {
    if (message.type === 'player-position') {
      updatePeerPosition(message.data)
    }
  })

  return (
    <div>
      <input value={roomId} onChange={(e) => setRoomId(e.target.value)} />
      <button onClick={() => createRoom(roomId)}>Create Room</button>
      <button onClick={() => joinRoom(roomId)}>Join Room</button>
      <p>Signaling: {isConnected() ? '🟢' : '🔴'}</p>
      <p>Peers: {peers.size}</p>
    </div>
  )
}
```

---

## Troubleshooting

### Signaling Issues

**"Signaling: disconnected"**
- Check server running: `cd signaling-server && npm run dev`
- Verify URL: `ws://localhost:8080`
- Check firewall/port blocking

### Connection Issues

**"Connection: failed"**
- Browser console for WebRTC errors
- Use Chrome/Firefox (best WebRTC support)
- Check STUN server accessibility
- Try incognito mode (extensions can interfere)
- May need TURN server for some networks

### Remote Player Issues

**Remote player not visible**
- Verify "Connected Players: 2" in UI
- Both players must be moving (stationary = invisible initially)
- Check browser console for position messages
- Confirm `remotePlayers` Map has entries

**Position lag/jitter**
- Increase `LERP_FACTOR` (0.2 → 0.3) for responsiveness
- Decrease `throttleMs` (50 → 30ms) for more frequent updates
- Check network latency in DevTools

### Auto-join Issues

- Confirm URL has `?room=` parameter
- Check 500ms delay hasn't been cleared prematurely
- Verify `localPeerId` and `isSignalingServerConnected` are true

---

## Testing

### Run Tests

```bash
npm test                    # Run all tests
npm test -- --watch         # Watch mode
npm run test:coverage       # With coverage
```

### Test Coverage

**75 tests** across 3 files:
- **WebRTCConnection**: 27 tests - RTCPeerConnection wrapper
- **WebRTC Store**: 25 tests - Zustand state management
- **SignalingClient**: 23 tests - WebSocket signaling

---

## Production Deployment

### Signaling Server

Deploy to any Node.js hosting (Heroku, Railway, Render, Fly.io):

```bash
cd signaling-server
npm install
npm run build
npm start
```

### Update Client URLs

```tsx
const SIGNALING_URL = process.env.NEXT_PUBLIC_SIGNALING_URL
  ?? 'wss://your-signaling-server.com'
```

### Production Checklist

- [x] TURN server for restrictive firewalls (Metered.ca integration)
- [ ] Message validation
- [ ] Authentication for signaling server
- [ ] Error reporting (Sentry, etc.)
- [ ] Connection quality monitoring
- [ ] Rate limiting
- [ ] Message compression for large payloads

---

## Limitations & Known Issues

### Current Limitations

- **2 players max** (enforced by WebRTCProvider)
- **Peer-to-peer only** (no dedicated server, requires direct connection)
- **No game state sync** (collectibles, rings, mode changes not synchronized)
- **Physics drift** (each client simulates independently, minor deviations possible)

### Known Issues

1. **Sender identification:** Messages don't include sender ID (assumes 2-player only)
2. **Auto-join re-triggering:** Multiple dependency changes can cause re-join attempts
3. **Connection errors suppressed:** Failed ICE candidates log but don't surface to UI
4. **No reconnection logic:** If peer disconnects, must manually rejoin room

---

## Future Enhancements

### Phase 1: UX Improvements

- [ ] Visual differentiation: Unique colors/patterns for each player
- [ ] Player names: Display usernames above marbles
- [ ] Connection indicators: Show ping/latency in UI
- [ ] Toast notifications: Connection status changes
- [ ] Auto-reconnect: Retry connection on failure

### Phase 2: Game State Sync

- [ ] Collectible sync: Share ring/checkpoint collection
- [ ] Mode sync: Coordinate speedrun/learn mode
- [ ] Leaderboards: Multiplayer race times
- [ ] Spectator mode: Watch other players

### Phase 3: Scalability

- [ ] 3-4 players: Mesh networking or relay server
- [ ] Room discovery: Lobby/matchmaking system
- [x] TURN server: Better NAT traversal (Metered.ca integration)
- [ ] Message compression: Reduce bandwidth

---

## Resources

- [AGENTS.md](./AGENTS.md) - Project architecture and coding guidelines
- [Signaling Server README](./signaling-server/README.md)
- [MDN WebRTC Guide](https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API)
- [RTCPeerConnection](https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection)
- [RTCDataChannel](https://developer.mozilla.org/en-US/docs/Web/API/RTCDataChannel)
- [Zustand Documentation](https://github.com/pmndrs/zustand)
