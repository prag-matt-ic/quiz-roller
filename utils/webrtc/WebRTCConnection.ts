import type { WebRTCMessage } from '@/stores/webrtc/types'

/**
 * Default ICE servers for NAT traversal
 *
 * STUN (Session Traversal Utilities for NAT) helps peers discover their public IP address
 * and port when behind a NAT/firewall. Google's STUN servers are free and reliable.
 *
 * TURN (Traversal Using Relays around NAT) relays traffic when direct P2P connection fails.
 * This is essential for users on different networks with restrictive NATs/firewalls.
 *
 * Using public TURN servers from Open Relay Project and Metered.
 * For production with high traffic, consider running your own TURN server (coturn).
 */

type CandidatePairStats = {
  id: string
  type: 'candidate-pair'
  state?: string
  selected?: boolean
  nominated?: boolean
  localCandidateId?: string
  remoteCandidateId?: string
}

type IceCandidateStats = {
  id: string
  candidateType?: string
}

type StatsReportWithType = {
  type?: string
}

export type WebRTCConfig = {
  iceServers?: RTCIceServer[] // Custom STUN/TURN servers
  dataChannelLabel?: string // Custom label for the data channel
  iceTransportPolicy?: RTCIceTransportPolicy // Set to 'relay' to force TURN (debug)
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
      iceServers: config.iceServers,
      iceTransportPolicy: config.iceTransportPolicy,
    }

    // Log ICE server configuration
    const serverCount = config.iceServers?.length ?? 0
    const turnServers =
      config.iceServers?.filter((s) =>
        typeof s.urls === 'string'
          ? s.urls.startsWith('turn')
          : s.urls.some((u) => u.startsWith('turn')),
      ).length ?? 0
    console.log(
      `[WebRTC][${peerId}] Created with ${serverCount} ICE servers (${turnServers} TURN)`,
    )
    console.log(
      `[WebRTC][${peerId}] ICE transport policy: ${config.iceTransportPolicy ?? 'default (all)'}`,
    )
    if (config.iceServers) {
      config.iceServers.forEach((server, i) => {
        const urls = Array.isArray(server.urls) ? server.urls.join(', ') : server.urls
        console.log(`[WebRTC][${peerId}]   Server ${i + 1}: ${urls}`)
      })
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
    console.log(`[WebRTC][${this.peerId}] Initializing as HOST`)
    this.createPeerConnection()
    if (!this.peerConnection) return

    // Host creates the data channel
    console.log(`[WebRTC][${this.peerId}] Creating data channel: ${this.dataChannelLabel}`)
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
    console.log(`[WebRTC][${this.peerId}] Initializing as CLIENT`)
    this.createPeerConnection()
    if (!this.peerConnection) return

    // Client waits for data channel from host via ondatachannel event
    this.peerConnection.ondatachannel = (event) => {
      console.log(
        `[WebRTC][${this.peerId}] Received data channel from host: ${event.channel.label}`,
      )
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
      console.log(`[WebRTC][${this.peerId}] Creating RTCPeerConnection...`)
      this.peerConnection = new RTCPeerConnection(this.config)
      console.log(`[WebRTC][${this.peerId}] RTCPeerConnection created successfully`)

      // ICE candidate generated - send to peer via signaling
      this.peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
          const candidateType = event.candidate.type ?? 'unknown'
          const protocol = event.candidate.protocol ?? 'unknown'
          console.log(
            `[WebRTC][${this.peerId}] ICE candidate: type=${candidateType}, protocol=${protocol}, address=${event.candidate.address ?? 'hidden'}`,
          )
          this.callbacks.onIceCandidate(event.candidate)
        } else {
          console.log(`[WebRTC][${this.peerId}] ICE gathering complete`)
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
          const state = this.peerConnection.connectionState
          console.log(`[WebRTC][${this.peerId}] Connection state: ${state}`)
          this.callbacks.onConnectionStateChange(this.peerId, state)
          if (state === 'connected') {
            console.log(`[WebRTC][${this.peerId}] ✅ CONNECTION ESTABLISHED`)
            this.logSelectedCandidatePair().catch((error) => {
              console.warn(`[WebRTC][${this.peerId}] Failed to read ICE stats`, error)
            })
          } else if (state === 'failed') {
            console.error(`[WebRTC][${this.peerId}] ❌ CONNECTION FAILED`)
          }
        }
      }

      // Add ICE connection state logging
      this.peerConnection.oniceconnectionstatechange = () => {
        if (this.peerConnection) {
          console.log(
            `[WebRTC][${this.peerId}] ICE connection state: ${this.peerConnection.iceConnectionState}`,
          )
        }
      }

      // Add ICE gathering state logging
      this.peerConnection.onicegatheringstatechange = () => {
        if (this.peerConnection) {
          console.log(
            `[WebRTC][${this.peerId}] ICE gathering state: ${this.peerConnection.iceGatheringState}`,
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

  private async logSelectedCandidatePair(): Promise<void> {
    if (!this.peerConnection) return

    const stats = await this.peerConnection.getStats()
    const reports = Array.from(stats.values())
    const selectedPair = reports.find((report) => {
      const reportType = (report as StatsReportWithType).type
      if (reportType !== 'candidate-pair') return false
      const pair = report as CandidatePairStats
      const isSelected = pair.selected ?? pair.nominated ?? false
      return pair.state === 'succeeded' && isSelected
    }) as CandidatePairStats | undefined

    if (!selectedPair?.localCandidateId || !selectedPair.remoteCandidateId) return

    const localCandidate = reports.find(
      (report) => report.id === selectedPair.localCandidateId,
    ) as IceCandidateStats | undefined
    const remoteCandidate = reports.find(
      (report) => report.id === selectedPair.remoteCandidateId,
    ) as IceCandidateStats | undefined

    const localType = localCandidate?.candidateType ?? 'unknown'
    const remoteType = remoteCandidate?.candidateType ?? 'unknown'
    const relayUsed = localType === 'relay' || remoteType === 'relay'

    if (relayUsed) {
      console.warn(
        `[${this.peerId}] Connected via TURN (relay candidate). Local: ${localType}, Remote: ${remoteType}`,
      )
    } else {
      console.warn(
        `[${this.peerId}] Connected without TURN. Local: ${localType}, Remote: ${remoteType}`,
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
