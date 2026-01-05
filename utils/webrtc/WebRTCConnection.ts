import type { WebRTCMessage } from '@/stores/webrtc/types'

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
  iceServers?: RTCIceServer[]
  dataChannelLabel?: string
  iceTransportPolicy?: RTCIceTransportPolicy
}

export type SendMessageFn = (message: Omit<WebRTCMessage, 'timestamp'>) => boolean

export type PeerConnectionCallbacks = {
  onConnectionStateChange: (peerId: string, state: RTCPeerConnectionState) => void
  onSignalingStateChange: (state: RTCSignalingState) => void
  onIceCandidate: (candidate: RTCIceCandidate) => void
  onDataChannelOpen: () => void
  onDataChannelClose: () => void
  onDataChannelMessage: (message: WebRTCMessage) => void
  onError: (error: string) => void
}

/**
 * WebRTCConnection - Low-level wrapper around RTCPeerConnection
 *
 * Handles: peer connection setup, data channel, SDP offers/answers, ICE candidates
 *
 * Flow: Host calls initAsHost() + createOffer(), Client calls initAsClient() + createAnswer()
 */
export class WebRTCConnection {
  private peerConnection: RTCPeerConnection | null = null
  private dataChannel: RTCDataChannel | null = null
  private config: RTCConfiguration
  private dataChannelLabel: string
  private callbacks: PeerConnectionCallbacks
  private peerId: string
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
  }

  initAsHost(): void {
    this.createPeerConnection()
    if (!this.peerConnection) return
    this.dataChannel = this.peerConnection.createDataChannel(this.dataChannelLabel)
    this.setupDataChannelHandlers(this.dataChannel)
  }

  initAsClient(): void {
    this.createPeerConnection()
    if (!this.peerConnection) return
    this.peerConnection.ondatachannel = (event) => {
      this.dataChannel = event.channel
      this.setupDataChannelHandlers(this.dataChannel)
    }
  }

  private createPeerConnection(): void {
    try {
      this.peerConnection = new RTCPeerConnection(this.config)

      this.peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
          this.callbacks.onIceCandidate(event.candidate)
        }
      }

      // ICE errors are often benign - connection may still succeed
      this.peerConnection.onicecandidateerror = (event) => {
        console.warn(`[WebRTC][${this.peerId}] ICE error: ${event.errorCode} - ${event.errorText}`)
      }

      this.peerConnection.onconnectionstatechange = () => {
        if (!this.peerConnection) return
        const state = this.peerConnection.connectionState
        this.callbacks.onConnectionStateChange(this.peerId, state)
        
        if (state === 'connected') {
          this.logSelectedCandidatePair()
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

    try {
      const stats = await this.peerConnection.getStats()
      const reports = Array.from(stats.values())
      const selectedPair = reports.find((report) => {
        const reportType = (report as StatsReportWithType).type
        if (reportType !== 'candidate-pair') return false
        const pair = report as CandidatePairStats
        return pair.state === 'succeeded' && (pair.selected ?? pair.nominated ?? false)
      }) as CandidatePairStats | undefined

      if (!selectedPair?.localCandidateId || !selectedPair.remoteCandidateId) return

      const localCandidate = reports.find(
        (r) => r.id === selectedPair.localCandidateId,
      ) as IceCandidateStats | undefined
      const remoteCandidate = reports.find(
        (r) => r.id === selectedPair.remoteCandidateId,
      ) as IceCandidateStats | undefined

      const localType = localCandidate?.candidateType ?? 'unknown'
      const remoteType = remoteCandidate?.candidateType ?? 'unknown'
      const relayUsed = localType === 'relay' || remoteType === 'relay'

      console.warn(
        `[WebRTC][${this.peerId}] Connected ${relayUsed ? 'via TURN' : 'P2P'} (local: ${localType}, remote: ${remoteType})`,
      )
    } catch {
      // Stats reading failed - not critical
    }
  }

  private setupDataChannelHandlers(channel: RTCDataChannel): void {
    channel.onopen = () => this.callbacks.onDataChannelOpen()
    channel.onclose = () => this.callbacks.onDataChannelClose()
    channel.onerror = (event) => this.callbacks.onError(`Data channel error: ${event}`)
    channel.onmessage = (event) => {
      try {
        this.callbacks.onDataChannelMessage(JSON.parse(event.data) as WebRTCMessage)
      } catch (error) {
        this.callbacks.onError(`Failed to parse message: ${error}`)
      }
    }
  }

  async createOffer(): Promise<RTCSessionDescriptionInit> {
    if (!this.peerConnection) throw new Error('Peer connection not initialized')
    const offer = await this.peerConnection.createOffer()
    await this.peerConnection.setLocalDescription(offer)
    return offer
  }

  async createAnswer(): Promise<RTCSessionDescriptionInit> {
    if (!this.peerConnection) throw new Error('Peer connection not initialized')
    const answer = await this.peerConnection.createAnswer()
    await this.peerConnection.setLocalDescription(answer)
    return answer
  }

  async setRemoteDescription(description: RTCSessionDescriptionInit): Promise<void> {
    if (!this.peerConnection) throw new Error('Peer connection not initialized')
    await this.peerConnection.setRemoteDescription(description)
    this.remoteDescriptionSet = true

    // Process queued ICE candidates
    for (const candidate of this.pendingIceCandidates) {
      try {
        await this.peerConnection.addIceCandidate(candidate)
      } catch {
        // Candidate may be stale
      }
    }
    this.pendingIceCandidates = []
  }

  async addIceCandidate(candidate: RTCIceCandidateInit): Promise<void> {
    if (!this.peerConnection) throw new Error('Peer connection not initialized')
    
    if (!this.remoteDescriptionSet) {
      this.pendingIceCandidates.push(candidate)
      return
    }

    try {
      await this.peerConnection.addIceCandidate(candidate)
    } catch (error) {
      this.callbacks.onError(`Failed to add ICE candidate: ${error}`)
    }
  }

  sendMessage(message: Omit<WebRTCMessage, 'timestamp'>): boolean {
    if (!this.dataChannel || this.dataChannel.readyState !== 'open') return false

    try {
      this.dataChannel.send(JSON.stringify({ ...message, timestamp: Date.now() }))
      return true
    } catch (error) {
      this.callbacks.onError(`Failed to send message: ${error}`)
      return false
    }
  }

  getConnectionState(): RTCPeerConnectionState | null {
    return this.peerConnection?.connectionState ?? null
  }

  getSignalingState(): RTCSignalingState | null {
    return this.peerConnection?.signalingState ?? null
  }

  isDataChannelOpen(): boolean {
    return this.dataChannel?.readyState === 'open'
  }

  close(): void {
    this.dataChannel?.close()
    this.dataChannel = null
    this.peerConnection?.close()
    this.peerConnection = null
  }
}
