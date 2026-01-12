# Multiplayer Implementation Guide

This guide explains the multiplayer system that allows two players to connect peer-to-peer and see each other's marble in real-time.

## Overview

The multiplayer system uses WebRTC data channels for real-time position synchronization between two players. Each player runs their own physics simulation locally and broadcasts their position to the connected peer.

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

## Key Components

### 1. **RemotePlayer** (`components/player/RemotePlayer.tsx`)

- Renders remote player's marble with **kinematic physics** (can collide but not affected by forces)
- Uses linear interpolation for smooth movement between network updates
- Position controlled by WebRTC messages from the peer
- **Blue tint** to distinguish from local player

### 2. **MultiplayerSlice** (`stores/multiplayerSlice.ts`)

- Zustand store slice managing remote player state
- Stores: `Map<peerId, { position, rotation, lastUpdate }>`
- Actions: `addRemotePlayer`, `updateRemotePlayerPosition`, `removeRemotePlayer`

### 3. **Position Broadcasting** (`hooks/useBroadcastPlayerPosition.ts`)

- Sends local player position to all connected peers
- Throttled to 20Hz (50ms interval) to reduce network traffic
- Includes position (Vector3) and rotation (Quaternion)

### 4. **Position Sync** (`hooks/useMultiplayerSync.ts`)

- Listens for incoming WebRTC `player-position` messages
- Updates game store with remote player data
- Handles peer disconnection cleanup

### 5. **MultiplayerWrapper** (`components/MultiplayerWrapper.tsx`)

- Provides WebRTC context to the game
- Initializes multiplayer synchronization via `useMultiplayerSync`
- Wraps game content to enable multiplayer

### 6. **URL-Based Room Sharing**

- Room ID stored in URL query params: `?room=game-room-1`
- Auto-join when opening room link (500ms delay)
- Shareable links generated with "Copy Link" button
- URL updates when creating/joining rooms

## How to Use

### Step 1: Start the Signaling Server

The signaling server coordinates WebRTC connection setup between peers:

```bash
cd signaling-server
npm run dev
```

Server runs on `ws://localhost:8080`

### Step 2: Navigate to Multiplayer Page

Open your app and navigate to `/multiplayer`:

```
http://localhost:3000/multiplayer
```

### Step 3: Connect Two Players

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

**Auto-Join Flow:**

- When URL contains `?room=` param, page auto-joins after 500ms
- Shows "🔗 Joining room: ROOM_ID" indicator
- Both players see "Connected Players: 2" when successful

### Step 4: Play Together

- Each player controls **only their own marble** (keyboard/touch controls)
- Remote player's ball appears in **blue** for visual distinction
- Positions synchronized ~20 times per second (20Hz)
- Marbles can **collide** with each other (kinematic physics)
- Each client runs independent physics simulation

## Message Protocol

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

## Performance Optimizations

### 1. **Pre-allocated Objects (No GC Pressure)**

```typescript
// RemotePlayer.tsx - reused every frame
const currentPos = useRef(new Vector3())
const targetPos = useRef(new Vector3())
const currentQuat = useRef(new Quaternion())
const targetQuat = useRef(new Quaternion())
```

### 2. **Position Throttling (Reduced Bandwidth)**

- Broadcasts: 20Hz instead of 60Hz
- Network traffic: ~60 messages/second for 2 players
- Interpolation fills gaps for smooth 60fps visuals

### 3. **Immutable Store Updates (Zustand Best Practice)**

```typescript
const newRemotePlayers = new Map(state.remotePlayers)
newRemotePlayers.set(peerId, updatedData)
return { remotePlayers: newRemotePlayers }
```

### 4. **Linear Interpolation (Smooth Movement)**

```typescript
currentPos.current.lerp(targetPos.current, LERP_FACTOR) // 0.2
currentQuat.current.slerp(targetQuat.current, LERP_FACTOR)
```

### 5. **Kinematic Physics (Collision Without Forces)**

- Remote players use `type="kinematicPosition"`
- Can collide with local player but not affected by gravity/forces
- Position set via `setNextKinematicTranslation()`

## Troubleshooting

### "Signaling: disconnected"

- ✅ Check server running: `cd signaling-server && npm run dev`
- ✅ Verify URL: `ws://localhost:8080`
- ✅ Check firewall/port blocking

### "Connection: failed"

- ✅ Browser console for WebRTC errors
- ✅ Use Chrome/Firefox (best WebRTC support)
- ✅ Check STUN server accessibility
- ✅ Try incognito mode (extensions can interfere)

### Remote player not visible

- ✅ Verify "Connected Players: 2" in UI
- ✅ Both players must be moving (stationary = invisible initially)
- ✅ Check browser console for position messages
- ✅ Confirm `remotePlayers` Map has entries

### Position lag/jitter

- ✅ Increase `LERP_FACTOR` (0.2 → 0.3) for responsiveness
- ✅ Decrease `throttleMs` (50 → 30ms) for more frequent updates
- ✅ Check network latency in DevTools
- ✅ Ensure 60fps rendering (check performance monitor)

### Auto-join not working

- ✅ Confirm URL has `?room=` parameter
- ✅ Check 500ms delay hasn't been cleared prematurely
- ✅ Verify `localPeerId` and `isSignalingServerConnected` are true
- ✅ Look for errors in `useEffect` dependencies

## Integration Examples

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

## Future Enhancements

### Phase 1: UX Improvements

- [ ] **Visual differentiation:** Unique colors/patterns for each player
- [ ] **Player names:** Display usernames above marbles
- [ ] **Connection indicators:** Show ping/latency in UI
- [ ] **Toast notifications:** Connection status changes
- [ ] **Auto-reconnect:** Retry connection on failure

### Phase 2: Game State Sync

- [ ] **Collectible sync:** Share ring/checkpoint collection
- [ ] **Mode sync:** Coordinate speedrun/learn mode
- [ ] **Leaderboards:** Multiplayer race times
- [ ] **Spectator mode:** Watch other players

### Phase 3: Scalability

- [ ] **3-4 players:** Mesh networking or relay server
- [ ] **Room discovery:** Lobby/matchmaking system
- [x] **TURN server:** Better NAT traversal (Metered.ca integration)
- [ ] **Message compression:** Reduce bandwidth

## Testing

Run tests to verify WebRTC functionality:

```bash
npm run test
```

Key test files:

- `tests/webrtc/WebRTCProvider.test.tsx`
- `tests/webrtc/useSignaling.test.ts`

## Additional Resources

- [WEBRTC.md](./WEBRTC.md) - Complete WebRTC technical documentation
- [AGENTS.md](./AGENTS.md) - Project architecture and coding guidelines
- [MDN WebRTC Guide](https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API)
- [Signaling Server README](./signaling-server/README.md)
