# Multiplayer Implementation Guide

Complete peer-to-peer multiplayer system using WebRTC data channels for real-time game communication.

## Overview

The multiplayer system enables **2-player peer-to-peer multiplayer** using WebRTC data channels for real-time position synchronization. Each player runs their own physics simulation locally and broadcasts their position to the connected peer. Players connect directly after coordinating through a WebSocket signaling server.

### Key Features

- ✅ Peer-to-peer data channels (low latency ~50-100ms)
- ✅ WebSocket signaling server for connection setup
- ✅ Room-based matchmaking with URL sharing
- ✅ Automatic SDP/ICE candidate exchange
- ✅ Zustand state management (single store)
- ✅ TypeScript throughout with enums for message types
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
│     │  └─ useBroadcastPlayerPosition (every ~50ms)           │
│     └─ RemotePlayer (renders Player B's position)            │
│        └─ useMultiplayerSync (receives WebRTC messages)      │
└──────────────────────────────────────────────────────────────┘
                              │
                WebRTC Data Channel (P2P)
                              │
┌──────────────────────────────────────────────────────────────┐
│                     Browser Window 2 (Player B)              │
├──────────────────────────────────────────────────────────────┤
│  (Same structure as Player A)                                │
└──────────────────────────────────────────────────────────────┘
```

---

## Project Structure

```
quiz-roller-app/
├── components/
│   ├── WebRTCProvider.tsx       # Provider + useWebRTC hook
│   ├── MultiplayerWrapper.tsx   # Wraps game with multiplayer sync
│   └── player/
│       └── RemotePlayer.tsx     # Renders remote player marble
│
├── hooks/
│   ├── useSignaling.ts          # Room management + auto handshake
│   ├── useMultiplayerSync.ts    # Incoming message handler
│   └── useBroadcastPlayerPosition.ts  # Outgoing position broadcasts
│
├── stores/
│   └── webrtcStore.ts           # Single Zustand store (connection, room, messages)
│
├── utils/
│   ├── multiplayer/
│   │   ├── messages.ts          # MultiplayerMessage enum + types
│   │   └── position.ts          # Coordinate conversion + interpolation
│   └── webrtc/
│       ├── WebRTCConnection.ts  # RTCPeerConnection wrapper
│       └── SignalingClient.ts   # WebSocket signaling client
│
quiz-roller-signalling-server/
└── src/
    ├── server.ts                # Entry point
    ├── SignalingServer.ts       # Core signaling logic
    └── types.ts                 # Server message types
```

---

## Quick Start

### 1. Start Signaling Server

```bash
cd quiz-roller-signalling-server
npm run dev
```

Server runs on `ws://localhost:8080`

### 2. Start Next.js App

```bash
cd quiz-roller-app
npm run dev
```

### 3. Connect Two Players

**Option 1: URL Sharing (Recommended)**

1. **Player A:** Click "Create Room" → Click "Copy Link"
2. **Player B:** Click the shared link → Auto-joins!

**Option 2: Manual Room ID**

1. **Player A:** Click "Create Room" (note the room ID)
2. **Player B:** Enter same room ID → Click "Join Room"

---

## Core Components

### useWebRTC() Hook

Single unified hook for all WebRTC functionality:

```typescript
const { state, actions, store } = useWebRTC()

// Reactive state (re-renders on change)
const { localPeerId, peers, roomState, isHost, dataChannelStates } = state

// Actions (stable references)
actions.sendMessage(peerId, message)
actions.createPeerConnection(peerId, role)

// Store API (for effects/subscriptions - non-reactive)
store.subscribe((s) => s.messagesReceived, callback)
store.getState().setRoomState(RoomState.IDLE)
```

### useSignaling() Hook

High-level room management with automatic WebRTC handshake:

```typescript
const {
  isSignalingConnected,
  roomState,
  isInRoom,
  currentRoomId,
  isHost,
  isPeerConnected,
  createRoom,
  joinRoom,
  leaveRoom,
} = useSignaling()
```

### useMultiplayerSync() Hook

Subscribes to incoming messages and updates game state:

```typescript
// Automatically handles:
// - MultiplayerMessage.PLAYER_POSITION → updates remote player position
// - MultiplayerMessage.PLAYER_JOINED → adds remote player
// - MultiplayerMessage.PLAYER_LEFT → removes remote player
// - MultiplayerMessage.GAME_START → starts multiplayer countdown
```

### useBroadcastPlayerPosition() Hook

Sends local player position to peers at 20Hz:

```typescript
useBroadcastPlayerPosition(sphereMeshRef, 50) // 50ms throttle
```

---

## Message Types

All multiplayer messages use the `MultiplayerMessage` enum:

```typescript
// utils/multiplayer/messages.ts

export enum MultiplayerMessage {
  PLAYER_POSITION = 'player-position',
  PLAYER_JOINED = 'player-joined',
  PLAYER_LEFT = 'player-left',
  GAME_START = 'game-start',
}

// Union type for type-safe handling
export type MultiplayerMessageUnion =
  | PlayerPositionMessage
  | PlayerJoinedMessage
  | PlayerLeftMessage
  | GameStartMessage
```

### Player Position Message

```typescript
{
  type: MultiplayerMessage.PLAYER_POSITION,
  from: 'peer-abc123',  // Added by receiver
  data: {
    position: { x: 0, y: 4, z: 10 },
    rotation: { x: 0, y: 0, z: 0, w: 1 },
    platformScroll: { x: 0, y: 0, z: 50 }
  }
}
```

### Game Start Message

```typescript
{
  type: MultiplayerMessage.GAME_START,
  data: { startTime: 1736784000000 }
}
```

---

## Signaling Messages

The signaling server uses a separate `MessageType` enum:

```typescript
// utils/webrtc/SignalingClient.ts

export enum MessageType {
  REGISTER = 'register',
  CREATE_ROOM = 'create-room',
  JOIN_ROOM = 'join-room',
  LEAVE_ROOM = 'leave-room',
  ROOM_CREATED = 'room-created',
  ROOM_JOINED = 'room-joined',
  ROOM_FULL = 'room-full',
  OFFER = 'offer',
  ANSWER = 'answer',
  ICE_CANDIDATE = 'ice-candidate',
  // ...
}
```

---

## Store Structure

Single Zustand store (`stores/webrtcStore.ts`):

```typescript
export type WebRTCStore = {
  // Identity
  localPeerId: string | null

  // Peers
  peers: Map<string, PeerInfo>

  // Connection
  connectionState: ConnectionState  // DISCONNECTED | CONNECTING | CONNECTED | FAILED
  error: string | null

  // Room
  roomState: RoomState  // IDLE | CREATING | JOINING | IN_ROOM
  currentRoomId: string | null
  isHost: boolean

  // Signaling
  signalingState: RTCSignalingState | null
  pendingOffer / pendingAnswer / pendingIceCandidates

  // Data channel
  dataChannelStates: Map<string, boolean>
  messagesReceived: MultiplayerMessageUnion[]  // Max 100
}
```

---

## Connection Flow

```
HOST                    Signaling Server              CLIENT
 │                             │                         │
 │  createRoom('room-1')       │                         │
 │────────────────────────────►│                         │
 │  ROOM_CREATED               │                         │
 │◄────────────────────────────┤                         │
 │                             │                         │
 │                             │  joinRoom('room-1')     │
 │                             │◄────────────────────────┤
 │  PEER_JOINED                │  ROOM_JOINED            │
 │◄────────────────────────────┤────────────────────────►│
 │                             │                         │
 │  createOffer()              │                         │
 │  sendOffer ─────────────────┼────────────────────────►│
 │                             │                    createAnswer()
 │◄────────────────────────────┼───────────── sendAnswer │
 │                             │                         │
 │◄── ICE candidates ──────────┼─── ICE candidates ─────►│
 │                             │                         │
 │         Direct P2P Data Channel Established!          │
 │◄─────────────────────────────────────────────────────►│
```

---

## Position Synchronization

### Coordinate Spaces

```typescript
// utils/multiplayer/position.ts

// World Position: Relative to scroll=0 (network-transmitted)
// Local Position: Relative to current scroll (visual rendering)

toWorldPosition(localPos, scroll) // Before sending
toLocalPosition(worldPos, scroll) // After receiving
```

### Interpolation

Remote player positions are interpolated for smooth movement:

```typescript
createInterpolationState() // Pre-allocate vectors
interpolatePosition(state, x, y, z, lerpFactor)
interpolateRotation(state, quat, x, y, z, w, lerpFactor)
```

---

## Performance Optimizations

- **20Hz broadcasts** instead of 60Hz (reduced bandwidth)
- **Pre-allocated Vector3/Quaternion** (no GC pressure)
- **Linear interpolation** fills gaps for smooth 60fps
- **Kinematic physics** for remote players (collision without forces)
- **Max 100 messages** in store (prevents memory growth)
- **useShallow** in useWebRTC to prevent unnecessary re-renders

---

## Troubleshooting

### Signaling Issues

- Check server running: `cd quiz-roller-signalling-server && npm run dev`
- Verify URL: `ws://localhost:8080`
- Check browser console for WebSocket errors

### Connection Issues

- Use Chrome/Firefox (best WebRTC support)
- Check STUN server accessibility
- May need TURN server for restrictive NATs

### Remote Player Not Visible

- Verify both players in same room
- Check `remotePlayers` Map in game store
- Both players must be moving initially

---

## Environment Variables

```env
# Client
NEXT_PUBLIC_SIGNALING_URL=ws://localhost:8080
NEXT_PUBLIC_WEBRTC_ICE_TRANSPORT_POLICY=all  # or 'relay' for TURN-only

# Server
PORT=8080
```

---

## Limitations

- **2 players max** (enforced by WebRTCProvider)
- **Peer-to-peer only** (no dedicated server)
- **Independent physics** (minor drift possible)
- **No reconnection** (must rejoin on disconnect)
