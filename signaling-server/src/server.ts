import http from 'http'
import { type WebSocket, WebSocketServer } from 'ws'

import { SignalingServer } from './SignalingServer'
import { MAX_PEERS_PER_ROOM, PORT } from './config'

// Create HTTP server for health checks and WebSocket upgrade
const server = http.createServer((req, res) => {
  if (req.url === '/' || req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ status: 'ok', service: 'signaling-server' }))
  } else {
    res.writeHead(404, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ error: 'Not found' }))
  }
})

const wss = new WebSocketServer({ server })
const signalingServer = new SignalingServer(MAX_PEERS_PER_ROOM)

wss.on('connection', (ws: WebSocket) => {
  signalingServer.handleConnection(ws)
})

server.listen(PORT, () => {
  console.warn(`Server listening on port ${PORT}`)
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
  server.close(() => {
    console.warn('Server closed')
    process.exit(0)
  })
})

process.on('SIGINT', () => {
  console.warn('SIGINT received, closing server...')
  server.close(() => {
    console.warn('Server closed')
    process.exit(0)
  })
})
