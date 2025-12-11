import { WebSocketServer, type WebSocket } from 'ws'
import { SignalingServer } from './SignalingServer'

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 8080
const MAX_PEERS_PER_ROOM = process.env.MAX_PEERS_PER_ROOM
  ? parseInt(process.env.MAX_PEERS_PER_ROOM, 10)
  : 4

const wss = new WebSocketServer({ port: PORT })
const signalingServer = new SignalingServer(MAX_PEERS_PER_ROOM)

wss.on('connection', (ws: WebSocket) => {
  signalingServer.handleConnection(ws)
})

wss.on('listening', () => {
  console.warn(`WebSocket signaling server listening on port ${PORT}`)
  console.warn(`Max peers per room: ${MAX_PEERS_PER_ROOM}`)
})

wss.on('error', (error: Error) => {
  console.error('WebSocket server error:', error)
})

// Log stats periodically
setInterval(() => {
  const stats = signalingServer.getStats()
  console.warn(`[Stats] Peers: ${stats.peers}, Rooms: ${stats.rooms}`)
}, 30000) // Every 30 seconds

// Graceful shutdown
process.on('SIGTERM', () => {
  console.warn('SIGTERM received, closing server...')
  wss.close(() => {
    console.warn('Server closed')
    process.exit(0)
  })
})

process.on('SIGINT', () => {
  console.warn('SIGINT received, closing server...')
  wss.close(() => {
    console.warn('Server closed')
    process.exit(0)
  })
})
