/**
 * Signaling message types (must match server types)
 */

export enum MessageType {
  REGISTER = 'register',
  PEER_LIST = 'peer-list',
  PEER_JOINED = 'peer-joined',
  PEER_LEFT = 'peer-left',
  OFFER = 'offer',
  ANSWER = 'answer',
  ICE_CANDIDATE = 'ice-candidate',
  CREATE_ROOM = 'create-room',
  JOIN_ROOM = 'join-room',
  LEAVE_ROOM = 'leave-room',
  ROOM_CREATED = 'room-created',
  ROOM_JOINED = 'room-joined',
  ROOM_FULL = 'room-full',
  ERROR = 'error',
}

export type SignalingMessage =
  | { type: MessageType.REGISTER; peerId: string }
  | { type: MessageType.PEER_LIST; peers: string[] }
  | { type: MessageType.PEER_JOINED; peerId: string }
  | { type: MessageType.PEER_LEFT; peerId: string }
  | { type: MessageType.OFFER; from: string; to: string; offer: RTCSessionDescriptionInit }
  | { type: MessageType.ANSWER; from: string; to: string; answer: RTCSessionDescriptionInit }
  | {
      type: MessageType.ICE_CANDIDATE
      from: string
      to: string
      candidate: RTCIceCandidateInit
    }
  | { type: MessageType.CREATE_ROOM; roomId: string; peerId: string }
  | { type: MessageType.JOIN_ROOM; roomId: string; peerId: string }
  | { type: MessageType.LEAVE_ROOM; roomId: string; peerId: string }
  | { type: MessageType.ROOM_CREATED; roomId: string }
  | { type: MessageType.ROOM_JOINED; roomId: string; peers: string[] }
  | { type: MessageType.ROOM_FULL; roomId: string }
  | { type: MessageType.ERROR; message: string }

export type SignalingEventHandlers = {
  onPeerList?: (peers: string[]) => void
  onPeerJoined?: (peerId: string) => void
  onPeerLeft?: (peerId: string) => void
  onOffer?: (from: string, offer: RTCSessionDescriptionInit) => void
  onAnswer?: (from: string, answer: RTCSessionDescriptionInit) => void
  onIceCandidate?: (from: string, candidate: RTCIceCandidateInit) => void
  onRoomCreated?: (roomId: string) => void
  onRoomJoined?: (roomId: string, peers: string[]) => void
  onRoomFull?: (roomId: string) => void
  onError?: (message: string) => void
  onConnected?: () => void
  onDisconnected?: () => void
}

/**
 * WebSocket signaling client for WebRTC
 */
export class SignalingClient {
  private ws: WebSocket | null = null
  private url: string
  private peerId: string
  private handlers: SignalingEventHandlers
  private reconnectAttempts = 0
  private readonly maxReconnectAttempts = 5
  private reconnectTimeout: NodeJS.Timeout | null = null
  private isDisconnecting = false

  private static normalizeWebSocketUrl(url: string): string {
    try {
      const parsed = new URL(url)
      if (typeof window !== 'undefined' && window.location.protocol === 'https:') {
        if (parsed.protocol === 'ws:') parsed.protocol = 'wss:'
      }
      return parsed.toString()
    } catch {
      return url
    }
  }

  constructor(url: string, peerId: string, handlers: SignalingEventHandlers = {}) {
    this.url = SignalingClient.normalizeWebSocketUrl(url)
    this.peerId = peerId
    this.handlers = handlers
  }

  /**
   * Connect to the signaling server
   */
  connect(): Promise<void> {
    this.isDisconnecting = false
    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(this.url)

        this.ws.onopen = () => {
          console.warn('Connected to signaling server')
          this.reconnectAttempts = 0

          // Register with the server
          this.send({
            type: MessageType.REGISTER,
            peerId: this.peerId,
          })

          this.handlers.onConnected?.()
          resolve()
        }

        this.ws.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data) as SignalingMessage
            this.handleMessage(message)
          } catch (error) {
            console.error('Failed to parse signaling message:', error)
          }
        }

        this.ws.onclose = () => {
          console.warn('Disconnected from signaling server')
          this.handlers.onDisconnected?.()

          // Only reconnect if we're not intentionally disconnecting
          if (!this.isDisconnecting) {
            this.attemptReconnect()
          }
        }

        this.ws.onerror = (error) => {
          console.error('WebSocket error:', error)
          reject(error)
        }
      } catch (error) {
        reject(error)
      }
    })
  }

  /**
   * Disconnect from the signaling server
   */
  disconnect(): void {
    this.isDisconnecting = true

    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout)
      this.reconnectTimeout = null
    }

    if (this.ws) {
      this.ws.close()
      this.ws = null
    }

    // Reset reconnect attempts
    this.reconnectAttempts = 0
  }

  /**
   * Attempt to reconnect with exponential backoff
   */
  private attemptReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached')
      return
    }

    this.reconnectAttempts++
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000)

    console.warn(`Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})...`)

    this.reconnectTimeout = setTimeout(() => {
      this.connect().catch((error) => {
        console.error('Reconnection failed:', error)
      })
    }, delay)
  }

  /**
   * Handle incoming messages
   */
  private handleMessage(message: SignalingMessage): void {
    switch (message.type) {
      case MessageType.PEER_LIST:
        this.handlers.onPeerList?.(message.peers)
        break
      case MessageType.PEER_JOINED:
        this.handlers.onPeerJoined?.(message.peerId)
        break
      case MessageType.PEER_LEFT:
        this.handlers.onPeerLeft?.(message.peerId)
        break
      case MessageType.OFFER:
        this.handlers.onOffer?.(message.from, message.offer)
        break
      case MessageType.ANSWER:
        this.handlers.onAnswer?.(message.from, message.answer)
        break
      case MessageType.ICE_CANDIDATE:
        this.handlers.onIceCandidate?.(message.from, message.candidate)
        break
      case MessageType.ROOM_CREATED:
        this.handlers.onRoomCreated?.(message.roomId)
        break
      case MessageType.ROOM_JOINED:
        this.handlers.onRoomJoined?.(message.roomId, message.peers)
        break
      case MessageType.ROOM_FULL:
        this.handlers.onRoomFull?.(message.roomId)
        break
      case MessageType.ERROR:
        this.handlers.onError?.(message.message)
        break
    }
  }

  /**
   * Send a message to the server
   */
  private send(message: SignalingMessage): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message))
    } else {
      console.warn('WebSocket not open, cannot send message')
    }
  }

  /**
   * Create a room
   */
  createRoom(roomId: string): void {
    this.send({
      type: MessageType.CREATE_ROOM,
      roomId,
      peerId: this.peerId,
    })
  }

  /**
   * Join a room
   */
  joinRoom(roomId: string): void {
    this.send({
      type: MessageType.JOIN_ROOM,
      roomId,
      peerId: this.peerId,
    })
  }

  /**
   * Leave the current room
   */
  leaveRoom(roomId: string): void {
    this.send({
      type: MessageType.LEAVE_ROOM,
      roomId,
      peerId: this.peerId,
    })
  }

  /**
   * Send an offer to a peer
   */
  sendOffer(to: string, offer: RTCSessionDescriptionInit): void {
    this.send({
      type: MessageType.OFFER,
      from: this.peerId,
      to,
      offer,
    })
  }

  /**
   * Send an answer to a peer
   */
  sendAnswer(to: string, answer: RTCSessionDescriptionInit): void {
    this.send({
      type: MessageType.ANSWER,
      from: this.peerId,
      to,
      answer,
    })
  }

  /**
   * Send an ICE candidate to a peer
   */
  sendIceCandidate(to: string, candidate: RTCIceCandidateInit): void {
    this.send({
      type: MessageType.ICE_CANDIDATE,
      from: this.peerId,
      to,
      candidate,
    })
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN
  }
}
