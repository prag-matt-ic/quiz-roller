import type { RawData, WebSocket } from 'ws'

import { MAX_PEERS_PER_ROOM } from './config'
import { MessageType, type SignalingMessage } from './types'

/**
 * Represents a connected peer
 */
export type Peer = {
  id: string
  ws: WebSocket
  roomId: string | null
}

/**
 * Represents a game room
 */
export type Room = {
  id: string
  hostId: string
  peerIds: Set<string>
  maxPeers: number
}

/**
 * SignalingServer manages WebRTC peer connections via WebSocket
 */
export class SignalingServer {
  private peers: Map<string, Peer> = new Map()
  private rooms: Map<string, Room> = new Map()
  private readonly maxPeersPerRoom: number

  constructor(maxPeersPerRoom = MAX_PEERS_PER_ROOM) {
    this.maxPeersPerRoom = maxPeersPerRoom
  }

  /**
   * Handle new WebSocket connection
   */
  handleConnection(ws: WebSocket): void {
    console.warn('New WebSocket connection')

    ws.on('message', (data: RawData) => {
      try {
        const message = JSON.parse(data.toString()) as SignalingMessage
        this.handleMessage(ws, message)
      } catch (error) {
        console.error('Failed to parse message:', error)
        this.sendError(ws, 'Invalid message format')
      }
    })

    ws.on('close', () => {
      this.handleDisconnection(ws)
    })

    ws.on('error', (error: Error) => {
      console.error('WebSocket error:', error)
    })
  }

  /**
   * Route incoming messages to appropriate handlers
   */
  private handleMessage(ws: WebSocket, message: SignalingMessage): void {
    switch (message.type) {
      case MessageType.REGISTER:
        this.handleRegister(ws, message.peerId)
        break
      case MessageType.CREATE_ROOM:
        this.handleCreateRoom(ws, message.roomId, message.peerId)
        break
      case MessageType.JOIN_ROOM:
        this.handleJoinRoom(ws, message.roomId, message.peerId)
        break
      case MessageType.LEAVE_ROOM:
        this.handleLeaveRoom(message.peerId)
        break
      case MessageType.OFFER:
        this.relayMessage(message.to, message)
        break
      case MessageType.ANSWER:
        this.relayMessage(message.to, message)
        break
      case MessageType.ICE_CANDIDATE:
        this.relayMessage(message.to, message)
        break
      default:
        console.warn('Unknown message type:', message)
    }
  }

  /**
   * Register a peer with the server
   */
  private handleRegister(ws: WebSocket, peerId: string): void {
    const existingPeer = this.peers.get(peerId)

    if (existingPeer) {
      console.warn(`Peer ID ${peerId} already exists, replacing stale connection`)

      // Clean up the old connection
      if (existingPeer.roomId) {
        this.handleLeaveRoom(peerId)
      }

      // Close old WebSocket if still open
      try {
        if (existingPeer.ws.readyState === existingPeer.ws.OPEN) {
          existingPeer.ws.close()
        }
      } catch (error) {
        console.error('Error closing old WebSocket:', error)
      }

      // Remove old peer
      this.peers.delete(peerId)
    }

    const peer: Peer = {
      id: peerId,
      ws,
      roomId: null,
    }

    this.peers.set(peerId, peer)
    console.warn(`Peer registered: ${peerId}`)

    // Send current peer list
    this.send(ws, {
      type: MessageType.PEER_LIST,
      peers: Array.from(this.peers.keys()),
    })
  }

  /**
   * Create a new room
   */
  private handleCreateRoom(ws: WebSocket, roomId: string, peerId: string): void {
    const peer = this.peers.get(peerId)
    if (!peer) {
      this.sendError(ws, 'Peer not registered')
      return
    }

    if (this.rooms.has(roomId)) {
      this.sendError(ws, 'Room already exists')
      return
    }

    const room: Room = {
      id: roomId,
      hostId: peerId,
      peerIds: new Set([peerId]),
      maxPeers: this.maxPeersPerRoom,
    }

    this.rooms.set(roomId, room)
    peer.roomId = roomId

    console.warn(`Room created: ${roomId} by ${peerId}`)

    this.send(ws, {
      type: MessageType.ROOM_CREATED,
      roomId,
    })
  }

  /**
   * Join an existing room
   */
  private handleJoinRoom(ws: WebSocket, roomId: string, peerId: string): void {
    const peer = this.peers.get(peerId)
    if (!peer) {
      this.sendError(ws, 'Peer not registered')
      return
    }

    const room = this.rooms.get(roomId)
    if (!room) {
      this.sendError(ws, 'Room not found')
      return
    }

    if (room.peerIds.size >= room.maxPeers) {
      this.send(ws, {
        type: MessageType.ROOM_FULL,
        roomId,
      })
      return
    }

    // Add peer to room
    room.peerIds.add(peerId)
    peer.roomId = roomId

    console.warn(`Peer ${peerId} joined room ${roomId}`)

    // Notify the joining peer
    this.send(ws, {
      type: MessageType.ROOM_JOINED,
      roomId,
      peers: Array.from(room.peerIds).filter((id) => id !== peerId),
    })

    // Notify all other peers in the room
    this.broadcastToRoom(roomId, peerId, {
      type: MessageType.PEER_JOINED,
      peerId,
    })
  }

  /**
   * Leave a room
   */
  private handleLeaveRoom(peerId: string): void {
    const peer = this.peers.get(peerId)
    if (!peer || !peer.roomId) return

    const room = this.rooms.get(peer.roomId)
    if (!room) return

    room.peerIds.delete(peerId)
    peer.roomId = null

    console.warn(`Peer ${peerId} left room ${room.id}`)

    // Notify other peers
    this.broadcastToRoom(room.id, peerId, {
      type: MessageType.PEER_LEFT,
      peerId,
    })

    // Delete room if empty
    if (room.peerIds.size === 0) {
      this.rooms.delete(room.id)
      console.warn(`Room ${room.id} deleted (empty)`)
    }
  }

  /**
   * Handle peer disconnection
   */
  private handleDisconnection(ws: WebSocket): void {
    // Find the peer associated with this WebSocket
    const peer = Array.from(this.peers.values()).find((p) => p.ws === ws)
    if (!peer) return

    console.warn(`Peer disconnected: ${peer.id}`)

    // Leave room if in one
    if (peer.roomId) {
      this.handleLeaveRoom(peer.id)
    }

    // Remove peer
    this.peers.delete(peer.id)

    // Notify all remaining peers
    this.broadcast({
      type: MessageType.PEER_LEFT,
      peerId: peer.id,
    })
  }

  /**
   * Relay a message to a specific peer
   */
  private relayMessage(toPeerId: string, message: SignalingMessage): void {
    const peer = this.peers.get(toPeerId)
    if (!peer) {
      console.warn(`Cannot relay message: peer ${toPeerId} not found`)
      return
    }

    this.send(peer.ws, message)
  }

  /**
   * Broadcast a message to all peers in a room except the sender
   */
  private broadcastToRoom(
    roomId: string,
    excludePeerId: string,
    message: SignalingMessage,
  ): void {
    const room = this.rooms.get(roomId)
    if (!room) return

    room.peerIds.forEach((peerId) => {
      if (peerId === excludePeerId) return

      const peer = this.peers.get(peerId)
      if (peer) {
        this.send(peer.ws, message)
      }
    })
  }

  /**
   * Broadcast a message to all connected peers
   */
  private broadcast(message: SignalingMessage): void {
    this.peers.forEach((peer) => {
      this.send(peer.ws, message)
    })
  }

  /**
   * Send a message to a specific WebSocket
   */
  private send(ws: WebSocket, message: SignalingMessage): void {
    if (ws.readyState === ws.OPEN) {
      ws.send(JSON.stringify(message))
    }
  }

  /**
   * Send an error message
   */
  private sendError(ws: WebSocket, message: string): void {
    this.send(ws, {
      type: MessageType.ERROR,
      message,
    })
  }

  /**
   * Get server statistics
   */
  getStats(): { peers: number; rooms: number } {
    return {
      peers: this.peers.size,
      rooms: this.rooms.size,
    }
  }
}
