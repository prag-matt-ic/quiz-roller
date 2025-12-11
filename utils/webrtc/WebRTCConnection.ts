import type { WebRTCMessage } from '@/stores/webrtc/types'

/**
 * Default STUN servers for NAT traversal
 *
 * STUN (Session Traversal Utilities for NAT) helps peers discover their public IP address
 * and port when behind a NAT/firewall. Google's STUN servers are free and reliable.
 *
 * For production, you may want to add TURN servers for cases where direct connection fails.
 */
const DEFAULT_ICE_SERVERS: RTCIceServer[] = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
]

export type WebRTCConfig = {
  iceServers?: RTCIceServer[] // Custom STUN/TURN servers
  dataChannelLabel?: string // Custom label for the data channel
}

export type SendMessageFn = (message: Omit<WebRTCMessage, 'timestamp'>) => boolean

/**
 * Callbacks fired during peer connection lifecycle
 * These integrate the low-level WebRTC events with the application state
 */
export type PeerConnectionCallbacks = {
  onConnectionStateChange: (peerId: string, state: RTCPeerConnectionState) => void
  onSignalingStateChange: (state: RTCSignalingState) => void
  onIceCandidate: (candidate: RTCIceCandidate) => void // Forward to signaling server
  onDataChannelOpen: () => void
  onDataChannelClose: () => void
  onDataChannelMessage: (message: WebRTCMessage) => void
  onError: (error: string) => void
}

/**
 * WebRTCConnection
 *
 * Low-level wrapper around RTCPeerConnection for managing a single peer connection.
 *
 * KEY CONCEPTS:
 * - Peer Connection: Direct browser-to-browser connection for data exchange
 * - Data Channel: Bidirectional channel for sending arbitrary data (game state, chat, etc.)
 * - SDP (Session Description Protocol): Describes media capabilities, formats, and connection info
 * - ICE (Interactive Connectivity Establishment): Finds the best network path between peers
 * - Host vs Client: Host creates the data channel, client receives it
 *
 * RESPONSIBILITIES:
 * - Create and configure RTCPeerConnection
 * - Create/receive data channel
 * - Generate SDP offers/answers
 * - Handle ICE candidate gathering
 * - Send/receive messages through data channel
 * - Manage connection lifecycle
 *
 * TYPICAL FLOW:
 * Host:                          Client:
 * 1. initAsHost()
 * 2. createOffer()
 * 3. [send offer via signaling]
 *                                4. initAsClient()
 *                                5. setRemoteDescription(offer)
 *                                6. createAnswer()
 *                                7. [send answer via signaling]
 * 8. setRemoteDescription(answer)
 * 9. [exchange ICE candidates]   10. [exchange ICE candidates]
 * 11. Connection established!    12. Connection established!
 *
 * USAGE:
 * const callbacks = { onConnectionStateChange, onIceCandidate, ... }
 * const connection = new WebRTCConnection(peerId, callbacks)
 *
 * // As host
 * connection.initAsHost()
 * const offer = await connection.createOffer()
 *
 * // As client
 * connection.initAsClient()
 * await connection.setRemoteDescription(offer)
 * const answer = await connection.createAnswer()
 */
export class WebRTCConnection {
  private peerConnection: RTCPeerConnection | null = null
  private dataChannel: RTCDataChannel | null = null
  private config: RTCConfiguration
  private dataChannelLabel: string
  private callbacks: PeerConnectionCallbacks
  private peerId: string

  // ICE candidates may arrive before remote description is set - queue them
  private pendingIceCandidates: RTCIceCandidateInit[] = []
  private remoteDescriptionSet = false

  constructor(peerId: string, callbacks: PeerConnectionCallbacks, config: WebRTCConfig = {}) {
    this.peerId = peerId
    this.callbacks = callbacks
    this.dataChannelLabel = config.dataChannelLabel ?? 'game-data'
    this.config = {
      iceServers: config.iceServers ?? DEFAULT_ICE_SERVERS,
    }
  }

  /**
   * Initialize peer connection as host (creates data channel)
   *
   * HOST responsibilities:
   * - Create the data channel (client will receive it)
   * - Generate and send the initial SDP offer
   * - Initiate the connection handshake
   */
  initAsHost(): void {
    this.createPeerConnection()
    if (!this.peerConnection) return

    // Host creates the data channel
    this.dataChannel = this.peerConnection.createDataChannel(this.dataChannelLabel)
    this.setupDataChannelHandlers(this.dataChannel)
  }

  /**
   * Initialize peer connection as client (receives data channel)
   *
   * CLIENT responsibilities:
   * - Wait for data channel from host
   * - Generate and send SDP answer in response to offer
   */
  initAsClient(): void {
    this.createPeerConnection()
    if (!this.peerConnection) return

    // Client waits for data channel from host via ondatachannel event
    this.peerConnection.ondatachannel = (event) => {
      console.warn(`[${this.peerId}] Received data channel from host`)
      this.dataChannel = event.channel
      this.setupDataChannelHandlers(this.dataChannel)
    }
  }

  /**
   * Create and configure RTCPeerConnection with event handlers
   *
   * Sets up listeners for:
   * - ICE candidate generation (for NAT traversal)
   * - Connection state changes (new -> connecting -> connected -> failed/closed)
   * - Signaling state changes (offer/answer exchange progress)
   */
  private createPeerConnection(): void {
    try {
      this.peerConnection = new RTCPeerConnection(this.config)

      // ICE candidate generated - send to peer via signaling
      this.peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
          this.callbacks.onIceCandidate(event.candidate)
        }
      }

      // ICE candidate errors are common and often benign
      // Connection may still succeed with other candidates
      this.peerConnection.onicecandidateerror = (event) => {
        console.warn(`[${this.peerId}] ICE candidate error:`, {
          errorCode: event.errorCode,
          errorText: event.errorText,
          url: event.url,
        })
      }

      this.peerConnection.onconnectionstatechange = () => {
        if (this.peerConnection) {
          this.callbacks.onConnectionStateChange(
            this.peerId,
            this.peerConnection.connectionState,
          )
        }
      }

      this.peerConnection.onsignalingstatechange = () => {
        if (this.peerConnection) {
          this.callbacks.onSignalingStateChange(this.peerConnection.signalingState)
        }
      }
    } catch (error) {
      this.callbacks.onError(
        `Failed to create peer connection: ${error instanceof Error ? error.message : String(error)}`,
      )
    }
  }

  /**
   * Setup data channel event handlers
   */
  private setupDataChannelHandlers(channel: RTCDataChannel): void {
    channel.onopen = () => {
      console.warn(`[${this.peerId}] Data channel opened`)
      this.callbacks.onDataChannelOpen()
    }

    channel.onclose = () => {
      console.warn(`[${this.peerId}] Data channel closed`)
      this.callbacks.onDataChannelClose()
    }

    channel.onerror = (event) => {
      console.error(`[${this.peerId}] Data channel error:`, event)
      this.callbacks.onError(`Data channel error: ${event}`)
    }

    channel.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data) as WebRTCMessage
        this.callbacks.onDataChannelMessage(message)
      } catch (error) {
        this.callbacks.onError(
          `Failed to parse message: ${error instanceof Error ? error.message : String(error)}`,
        )
      }
    }
  }

  /**
   * Create and return an SDP offer
   */
  async createOffer(): Promise<RTCSessionDescriptionInit> {
    if (!this.peerConnection) {
      throw new Error('Peer connection not initialized')
    }

    try {
      const offer = await this.peerConnection.createOffer()
      await this.peerConnection.setLocalDescription(offer)
      return offer
    } catch (error) {
      const message = `Failed to create offer: ${error instanceof Error ? error.message : String(error)}`
      this.callbacks.onError(message)
      throw new Error(message)
    }
  }

  /**
   * Create and return an SDP answer
   */
  async createAnswer(): Promise<RTCSessionDescriptionInit> {
    if (!this.peerConnection) {
      throw new Error('Peer connection not initialized')
    }

    try {
      const answer = await this.peerConnection.createAnswer()
      await this.peerConnection.setLocalDescription(answer)
      return answer
    } catch (error) {
      const message = `Failed to create answer: ${error instanceof Error ? error.message : String(error)}`
      this.callbacks.onError(message)
      throw new Error(message)
    }
  }

  /**
   * Set remote description (offer or answer from peer)
   */
  async setRemoteDescription(description: RTCSessionDescriptionInit): Promise<void> {
    if (!this.peerConnection) {
      throw new Error('Peer connection not initialized')
    }

    try {
      await this.peerConnection.setRemoteDescription(description)
      this.remoteDescriptionSet = true

      // Process any queued ICE candidates
      for (const candidate of this.pendingIceCandidates) {
        try {
          await this.peerConnection.addIceCandidate(candidate)
        } catch (error) {
          console.warn('Failed to add queued ICE candidate:', error)
        }
      }
      this.pendingIceCandidates = []
    } catch (error) {
      const message = `Failed to set remote description: ${error instanceof Error ? error.message : String(error)}`
      this.callbacks.onError(message)
      throw new Error(message)
    }
  }

  /**
   * Add ICE candidate received from peer
   */
  async addIceCandidate(candidate: RTCIceCandidateInit): Promise<void> {
    if (!this.peerConnection) {
      throw new Error('Peer connection not initialized')
    }

    // Queue candidates if remote description not yet set
    if (!this.remoteDescriptionSet) {
      this.pendingIceCandidates.push(candidate)
      return
    }

    try {
      await this.peerConnection.addIceCandidate(candidate)
    } catch (error) {
      this.callbacks.onError(
        `Failed to add ICE candidate: ${error instanceof Error ? error.message : String(error)}`,
      )
    }
  }

  /**
   * Send a message through the data channel
   */
  sendMessage(message: Omit<WebRTCMessage, 'timestamp'>): boolean {
    if (!this.dataChannel) {
      console.warn(`[${this.peerId}] No data channel exists`)
      return false
    }

    if (this.dataChannel.readyState !== 'open') {
      console.warn(
        `[${this.peerId}] Data channel state is ${this.dataChannel.readyState}, not open`,
      )
      return false
    }

    try {
      const fullMessage: WebRTCMessage = {
        ...message,
        timestamp: Date.now(),
      }
      this.dataChannel.send(JSON.stringify(fullMessage))
      return true
    } catch (error) {
      this.callbacks.onError(
        `Failed to send message: ${error instanceof Error ? error.message : String(error)}`,
      )
      return false
    }
  }

  /**
   * Get current connection state
   */
  getConnectionState(): RTCPeerConnectionState | null {
    return this.peerConnection?.connectionState ?? null
  }

  /**
   * Get current signaling state
   */
  getSignalingState(): RTCSignalingState | null {
    return this.peerConnection?.signalingState ?? null
  }

  /**
   * Check if data channel is open
   */
  isDataChannelOpen(): boolean {
    return this.dataChannel?.readyState === 'open'
  }

  /**
   * Close connection and cleanup
   */
  close(): void {
    if (this.dataChannel) {
      this.dataChannel.close()
      this.dataChannel = null
    }

    if (this.peerConnection) {
      this.peerConnection.close()
      this.peerConnection = null
    }
  }
}
