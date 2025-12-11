import { type StateCreator } from 'zustand'

export enum ConnectionState {
  DISCONNECTED = 'disconnected',
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  FAILED = 'failed',
}

export enum PeerRole {
  HOST = 'host',
  CLIENT = 'client',
}

export type PeerInfo = {
  id: string
  role: PeerRole
  connectionState: RTCPeerConnectionState
}

export type WebRTCMessage = {
  type: string
  timestamp: number
  data: unknown
  from?: string // Sender's peer ID (optional for backwards compatibility)
}

export type ConnectionSlice = {
  localPeerId: string | null
  peers: Map<string, PeerInfo>
  connectionState: ConnectionState
  error: string | null

  setLocalPeerId: (id: string) => void
  addPeer: (peerId: string, role: PeerRole) => void
  updatePeerConnectionState: (peerId: string, state: RTCPeerConnectionState) => void
  removePeer: (peerId: string) => void
  setConnectionState: (state: ConnectionState) => void
  setError: (error: string | null) => void
  reset: () => void
}

export type SignalingSlice = {
  signalingState: RTCSignalingState | null
  pendingOffer: RTCSessionDescriptionInit | null
  pendingAnswer: RTCSessionDescriptionInit | null
  pendingIceCandidates: RTCIceCandidate[]

  setSignalingState: (state: RTCSignalingState) => void
  setPendingOffer: (offer: RTCSessionDescriptionInit | null) => void
  setPendingAnswer: (answer: RTCSessionDescriptionInit | null) => void
  addIceCandidate: (candidate: RTCIceCandidate) => void
  clearIceCandidates: () => void
}

export type DataChannelSlice = {
  dataChannelStates: Map<string, boolean> // Track per-peer data channel state
  messagesReceived: WebRTCMessage[]
  messagesSent: WebRTCMessage[]

  setDataChannelOpen: (peerId: string, isOpen: boolean) => void
  addReceivedMessage: (message: WebRTCMessage) => void
  addSentMessage: (message: WebRTCMessage) => void
  clearMessages: () => void
}

export type WebRTCStore = ConnectionSlice & SignalingSlice & DataChannelSlice

export type WebRTCSliceCreator<T> = StateCreator<
  WebRTCStore,
  [['zustand/subscribeWithSelector', never]],
  [],
  T
>
