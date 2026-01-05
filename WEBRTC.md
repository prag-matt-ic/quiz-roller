# WebRTC Multiplayer Implementation

Complete peer-to-peer multiplayer system using WebRTC data channels for real-time game communication.

## Overview

This implementation enables **2-player peer-to-peer multiplayer** without media (video/audio). Players connect directly to each other through WebRTC data channels after coordinating through a WebSocket signaling server.

### Key Features

- ✅ Peer-to-peer data channels (low latency ~50-100ms)
- ✅ WebSocket signaling server for connection setup
- ✅ Room-based matchmaking
- ✅ Automatic SDP/ICE candidate exchange
- ✅ Zustand state management
- ✅ TypeScript throughout
- ✅ Comprehensive test coverage (75 tests)
- ✅ 2-player connection limit
- ✅ Message history management (max 100 messages)

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

### 4. Test Multiplayer

1. Open http://localhost:3000 in two browser windows
2. One player creates a room
3. Other player joins the same room
4. Send messages between peers!

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Your React App                          │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────────────────────────────────────────────┐  │
│  │          WebRTCProvider (Single Context)             │  │
│  │  • Unified context: store + connectionsRef +         │  │
│  │    iceServers + config                               │  │
│  │  • Fetches TURN credentials from /api/turn-credentials│  │
│  │  • Generates local peer ID                           │  │
│  │  • Enforces 2-player limit                           │  │
│  └──────────────────────────────────────────────────────┘  │
│           │                                                  │
│           ├── useWebRTC() → Peer connection management      │
│           │                                                  │
│           └── useSignaling() → Signaling server integration │
│                       │                                      │
└───────────────────────┼──────────────────────────────────────┘
                        │
                        │ WebSocket
                        ▼
        ┌───────────────────────────┐
        │   Signaling Server        │
        │   (Node.js + WebSocket)   │
        │   • Relays SDP offers     │
        │   • Relays ICE candidates │
        │   • Manages rooms/peers   │
        └───────────────────────────┘
                        │
                        │ After handshake...
                        ▼
        ┌───────────────────────────┐
        │   Direct P2P Connection   │
        │   (WebRTC Data Channel)   │
        │   • Send game state       │
        │   • Send player actions   │
        │   • Low latency!          │
        └───────────────────────────┘
```

## Project Structure

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

## Usage

### Basic Setup

```tsx
import { WebRTCProvider } from '@/components/webrtc/WebRTCProvider'

function App() {
  return (
    <WebRTCProvider>
      <YourGameComponent />
    </WebRTCProvider>
  )
}
```

### Multiplayer Component

```tsx
'use client'
import { useState } from 'react'
import { useSignaling } from '@/hooks/useSignaling'
import { useWebRTC, useWebRTCStore } from '@/components/webrtc/WebRTCProvider'
import { useWebRTCMessages } from '@/hooks/useWebRTCMessages'

export function MultiplayerGame() {
  const [roomId, setRoomId] = useState('')

  // Connect to signaling server & manage rooms
  const { createRoom, joinRoom, isConnected } = useSignaling({
    signalingUrl: 'ws://localhost:8080',
    onRoomJoined: (id, peers) => {
      console.log(`Joined room ${id} with ${peers.length} peers`)
    },
  })

  // Get WebRTC connection methods
  const { sendMessage } = useWebRTC()

  // Get reactive state from Zustand
  const peers = useWebRTCStore((s) => s.peers)
  const connectionState = useWebRTCStore((s) => s.connectionState)
  const isDataChannelOpen = useWebRTCStore((s) => s.isDataChannelOpen)

  // Subscribe to incoming messages
  useWebRTCMessages((message) => {
    console.log('Received message:', message)

    // Handle different message types
    if (message.type === 'player-position') {
      updatePeerPosition(message.data)
    }
  })

  // Send position updates to all peers
  const broadcastPosition = (x: number, y: number, z: number) => {
    peers.forEach((peer) => {
      sendMessage(peer.id, {
        type: 'player-position',
        data: { x, y, z },
      })
    })
  }

  return (
    <div>
      <h1>Multiplayer Game</h1>

      {/* Room Controls */}
      <input
        value={roomId}
        onChange={(e) => setRoomId(e.target.value)}
        placeholder="Enter room ID"
      />
      <button onClick={() => createRoom(roomId)}>Create Room</button>
      <button onClick={() => joinRoom(roomId)}>Join Room</button>

      {/* Connection Status */}
      <p>Signaling: {isConnected() ? '🟢' : '🔴'}</p>
      <p>WebRTC: {connectionState}</p>
      <p>Data Channel: {isDataChannelOpen ? 'Open' : 'Closed'}</p>
      <p>Peers: {peers.size}</p>
    </div>
  )
}
```

## Connection Flow

### 1. Initialization

```tsx
;<WebRTCProvider>
  <YourGame />
</WebRTCProvider>

const { createRoom, joinRoom } = useSignaling({
  signalingUrl: 'ws://localhost:8080',
})
```

### 2. Create or Join Room

```typescript
// Player A becomes HOST
createRoom('room-123')

// Player B becomes CLIENT (max 2 players)
joinRoom('room-123')
```

### 3. Automatic Handshake

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

### 4. Send/Receive Messages

```typescript
// Subscribe to messages
useWebRTCMessages((message) => {
  if (message.type === 'player-position') {
    updatePeerPosition(message.data)
  }
})

// Send messages
const { sendMessage } = useWebRTC()
sendMessage(peerId, {
  type: 'player-position',
  data: { x: 10, y: 20, z: 5 },
})
```

## Key Components

### WebRTCProvider

Root provider for WebRTC state. Single unified context containing store, connections ref, ICE servers, and config.

**Pattern**: Single context with ref for connections (no re-renders) + Zustand for reactive state

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

High-level signaling + automatic peer setup hook. Streamlined implementation with minimal logging.

**Methods**:

- `createRoom(roomId)` - Creates new room (become HOST)
- `joinRoom(roomId)` - Joins existing room (become CLIENT)
- `leaveRoom(roomId)` - Leaves current room
- `isConnected()` - Returns signaling connection status

**Callbacks**:

- `onRoomCreated` - Room successfully created
- `onRoomJoined` - Joined room with peer list
- `onRoomFull` - Room at capacity (2 players)

**Note**: Logging is minimal - only errors are logged to console.

### useWebRTCMessages()

Subscribe to incoming messages from peers.

**Usage**:

```typescript
useWebRTCMessages((message) => {
  console.log('Received:', message)
})
```

### WebRTCConnection (Class)

Wraps `RTCPeerConnection` for a single peer.

**Responsibilities**:

- SDP offer/answer exchange
- ICE candidate handling
- Data channel management
- Event callbacks to Zustand store

### SignalingClient (Class)

WebSocket client for signaling server.

**Features**:

- Auto-reconnect on disconnect
- Room management
- SDP/ICE relay
- Event-based API

## Key Concepts

### HOST vs CLIENT

- **HOST**: Creates room, creates data channel, sends offer first
- **CLIENT**: Joins room, receives data channel, responds with answer

### SDP (Session Description Protocol)

Describes peer capabilities and media/data configuration.

- **Offer**: HOST's configuration
- **Answer**: CLIENT's response

### ICE (Interactive Connectivity Establishment)

Finds the best network path between peers.

- **STUN**: Discovers public IP (for NAT traversal)
- **TURN**: Relay server for restrictive NATs (via Metered.ca)
- **Candidates**: Possible network routes

**ICE Server Configuration**:
- STUN: Google's public STUN servers (fallback)
- TURN: Fetched from `/api/turn-credentials` (Metered.ca)
- Transport policy: Configurable via `NEXT_PUBLIC_WEBRTC_ICE_TRANSPORT_POLICY` ("all" or "relay")

### Data Channel

Bidirectional channel for arbitrary data.

- Supports text, binary, or JSON
- Low latency (< 100ms typical)
- Ordered and reliable delivery

## State Management

### Zustand Store (Reactive)

Used for UI updates:

```typescript
const peers = useWebRTCStore((s) => s.peers)
const connectionState = useWebRTCStore((s) => s.connectionState)
const messages = useWebRTCStore((s) => s.messagesReceived)
```

### Ref-based Connections (Non-reactive)

Used for frequently changing data:

```typescript
const connectionsRef = useRef<Map<string, WebRTCConnection>>(new Map())
```

**Why both?**

- **Zustand**: Data that triggers UI updates
- **Refs**: Connection objects that change frequently

### Store Structure

**ConnectionSlice**:

- `localPeerId` - Your peer ID
- `peers` - Map of connected peers (max 2)
- `connectionState` - Overall connection status
- `error` - Latest error message

**SignalingSlice**:

- `signalingState` - Current signaling state
- `pendingOffer/Answer` - SDP for exchange
- `pendingIceCandidates` - ICE candidates to send

**DataChannelSlice**:

- `isDataChannelOpen` - Can send messages
- `messagesReceived` - Last 100 received messages
- `messagesSent` - Last 100 sent messages

## Message Format

Messages follow a standard format:

```typescript
type WebRTCMessage = {
  type: string // Message type identifier
  timestamp: number // Auto-added by sendMessage
  data: unknown // Your custom payload
}
```

### Example Message Types

```typescript
// Player movement
{ type: 'player-position', data: { x: 10, y: 5, z: 20 } }

// Player input
{ type: 'player-input', data: { left: -1, right: 0, up: 1, down: 0 } }

// Game events
{ type: 'collectible-collected', data: { id: 'coin-42' } }
{ type: 'ring-passed', data: { ringIndex: [2, 3] } }

// Game state sync
{ type: 'game-state', data: { stage: 'question', time: 45.2 } }
```

## Testing

### Run Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm test -- --watch

# Run tests with coverage
npm run test:coverage
```

### Test Coverage

**75 tests** across 3 files:

- **WebRTCConnection**: 27 tests - RTCPeerConnection wrapper
- **WebRTC Store**: 25 tests - Zustand state management
- **SignalingClient**: 23 tests - WebSocket signaling

All critical paths tested:

- ✅ Connection establishment (host and client)
- ✅ SDP offer/answer exchange
- ✅ ICE candidate handling
- ✅ Data channel creation and messaging
- ✅ State management
- ✅ WebSocket signaling
- ✅ Error handling
- ✅ Connection cleanup

## Signaling Server

### Message Types

**Connection Management**:

- `REGISTER` - Register peer with server
- `PEER_LIST` - List of connected peers
- `PEER_JOINED` - New peer joined
- `PEER_LEFT` - Peer disconnected

**Room Management**:

- `CREATE_ROOM` - Create a new room
- `JOIN_ROOM` - Join existing room
- `LEAVE_ROOM` - Leave current room
- `ROOM_CREATED` - Room creation confirmed
- `ROOM_JOINED` - Room join confirmed
- `ROOM_FULL` - Room at capacity (2 players)

**WebRTC Signaling**:

- `OFFER` - SDP offer from peer
- `ANSWER` - SDP answer from peer
- `ICE_CANDIDATE` - ICE candidate for NAT traversal

### API Reference

#### Register

```json
{
  "type": "register",
  "peerId": "peer-abc123"
}
```

#### Create Room

```json
{
  "type": "create-room",
  "roomId": "room-xyz789",
  "peerId": "peer-abc123"
}
```

#### Join Room

```json
{
  "type": "join-room",
  "roomId": "room-xyz789",
  "peerId": "peer-def456"
}
```

#### Send Offer

```json
{
  "type": "offer",
  "from": "peer-abc123",
  "to": "peer-def456",
  "offer": {
    "type": "offer",
    "sdp": "..."
  }
}
```

### Environment Variables

```env
PORT=8080
MAX_PEERS_PER_ROOM=2
```

## Production Deployment

### Signaling Server

Deploy to any Node.js hosting (Heroku, Railway, Render):

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

<WebRTCProvider signalingUrl={SIGNALING_URL} />
```

### Production Checklist

Before deploying:

- [x] Add TURN server for restrictive firewalls (Metered.ca integration)
- [ ] Implement message validation
- [ ] Add authentication to signaling server
- [ ] Set up error reporting (Sentry, etc.)
- [ ] Add connection quality monitoring
- [ ] Implement rate limiting
- [ ] Test with realistic network conditions
- [ ] Add message compression for large payloads
- [ ] Implement room persistence

## Performance

### Optimizations

✅ Ref-based connections (no re-renders on connection changes)  
✅ Zustand selectors (only re-render when selected data changes)  
✅ Data channels (lower latency than WebSockets)  
✅ ICE candidate queuing (prevents race conditions)  
✅ Message history limit (max 100 messages prevents memory growth)  
✅ Connection limit (max 2 peers prevents resource exhaustion)

### Following Project Guidelines

Per `AGENTS.md`:

- No per-frame allocations in message handling
- Ref-based subscriptions for `useWebRTCMessages`
- Immutable state updates in Zustand store
- Meaningful names (`createPeerConnection`, `sendMessage`)
- Consistent vocabulary (always `peerId`, never mixed)
- Small, focused functions with single responsibility

## Troubleshooting

**Signaling won't connect**

- Check server is running on port 8080
- Verify WebSocket URL in browser console
- Check firewall/network settings

**Peers can't connect**

- Ensure both peers in same room
- Check browser console for WebRTC errors
- Verify ICE candidates are being exchanged
- May need TURN server for some networks

**Data channel won't open**

- Check connection state is 'connected'
- Verify offer/answer exchange completed
- Look for ICE connection failures

**"Maximum peers exceeded" error**

- Game enforces 2-player limit
- Ensure only 2 players join the room
- Check for stale connections in store

## Example Components

Two example components included:

**WebRTCExample.tsx** - Manual connection demo  
**SignalingExample.tsx** - Automatic connection with signaling (recommended)

## Resources

- [WebRTC API](https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API)
- [RTCPeerConnection](https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection)
- [RTCDataChannel](https://developer.mozilla.org/en-US/docs/Web/API/RTCDataChannel)
- [Zustand Documentation](https://github.com/pmndrs/zustand)
