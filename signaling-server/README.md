# WebRTC Signaling Server

WebSocket-based signaling server for establishing WebRTC peer-to-peer connections.

## Features

- ✅ Room-based peer management
- ✅ SDP offer/answer exchange
- ✅ ICE candidate relay
- ✅ Automatic reconnection
- ✅ Peer discovery
- ✅ Graceful shutdown

## Quick Start

### Installation

```bash
cd signaling-server
npm install
```

### Development

```bash
npm run dev
```

Server runs on `ws://localhost:8080` by default.

### Production

```bash
npm run build
npm start
```

## Environment Variables

Create a `.env` file (optional):

```env
PORT=8080
MAX_PEERS_PER_ROOM=4
```

## Architecture

### Message Flow

```
Client A                Signaling Server         Client B
   |                           |                      |
   |------- REGISTER --------->|                      |
   |<------ PEER_LIST ---------|                      |
   |                           |<------ REGISTER -----|
   |                           |                      |
   |--- CREATE_ROOM ---------->|                      |
   |<-- ROOM_CREATED ----------|                      |
   |                           |                      |
   |                           |<----- JOIN_ROOM -----|
   |                           |---> ROOM_JOINED ---->|
   |<----- PEER_JOINED --------|                      |
   |                           |                      |
   |------- OFFER ------------>|------- OFFER ------->|
   |                           |                      |
   |                           |<------ ANSWER -------|
   |<------ ANSWER ------------|                      |
   |                           |                      |
   |--- ICE_CANDIDATE -------->|-- ICE_CANDIDATE ---->|
   |<-- ICE_CANDIDATE ---------|<-- ICE_CANDIDATE ----|
   |                           |                      |
   |  [WebRTC Connection Established]                 |
   |<===========================================>|
```

### Message Types

**Connection Management**

- `REGISTER` - Register peer with server
- `PEER_LIST` - List of connected peers
- `PEER_JOINED` - New peer joined
- `PEER_LEFT` - Peer disconnected

**Room Management**

- `CREATE_ROOM` - Create a new room
- `JOIN_ROOM` - Join existing room
- `LEAVE_ROOM` - Leave current room
- `ROOM_CREATED` - Room creation confirmed
- `ROOM_JOINED` - Room join confirmed
- `ROOM_FULL` - Room at capacity

**WebRTC Signaling**

- `OFFER` - SDP offer from peer
- `ANSWER` - SDP answer from peer
- `ICE_CANDIDATE` - ICE candidate for NAT traversal

**Error Handling**

- `ERROR` - Error message

## API Reference

### Client Messages

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

### Server Responses

#### Peer List

```json
{
  "type": "peer-list",
  "peers": ["peer-abc123", "peer-def456"]
}
```

#### Room Created

```json
{
  "type": "room-created",
  "roomId": "room-xyz789"
}
```

#### Room Joined

```json
{
  "type": "room-joined",
  "roomId": "room-xyz789",
  "peers": ["peer-abc123"]
}
```

## Deployment

### Heroku

```bash
heroku create quiz-roller-signaling
git subtree push --prefix signaling-server heroku main
```

### Docker

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY dist ./dist
CMD ["node", "dist/server.js"]
```

### Railway / Render

Point to `signaling-server` directory and set start command:

```bash
npm install && npm run build && npm start
```

## Monitoring

Server logs statistics every 30 seconds:

```
[Stats] Peers: 4, Rooms: 2
```

## Security Considerations

⚠️ **This is a basic implementation. For production:**

1. **Authentication** - Add token-based auth
2. **Rate Limiting** - Prevent spam/DoS
3. **SSL/TLS** - Use `wss://` instead of `ws://`
4. **Room Passwords** - Optional room protection
5. **Message Validation** - Strict schema validation
6. **Peer Limits** - Enforce max connections per IP
7. **CORS** - Configure allowed origins

Example with authentication:

```typescript
// Add to handleRegister
const token = validateToken(message.token)
if (!token.valid) {
  this.sendError(ws, 'Invalid token')
  return
}
```

## Testing

```bash
# Install wscat for testing
npm install -g wscat

# Connect to server
wscat -c ws://localhost:8080

# Send register message
> {"type":"register","peerId":"test-peer-1"}

# Create room
> {"type":"create-room","roomId":"test-room","peerId":"test-peer-1"}
```

## Scaling

For production with many concurrent users:

1. **Redis Pub/Sub** - Share state across server instances
2. **Load Balancer** - Sticky sessions for WebSocket
3. **Database** - Persist room/peer state
4. **Monitoring** - Prometheus/Grafana

Example with Redis:

```typescript
import { createClient } from 'redis'

const redis = createClient()
await redis.connect()

// Publish peer joined
await redis.publish('peer-joined', JSON.stringify({ peerId, roomId }))
```

## Troubleshooting

**Connection fails**

- Check firewall rules allow port 8080
- Verify WebSocket upgrade succeeds
- Check browser console for errors

**Peers can't connect**

- Verify both peers registered
- Check room exists and not full
- Ensure offer/answer exchange completes
- Verify ICE candidates exchanged

**Memory leaks**

- Monitor with `node --inspect`
- Check peer cleanup on disconnect
- Verify room deletion when empty

## License

MIT
