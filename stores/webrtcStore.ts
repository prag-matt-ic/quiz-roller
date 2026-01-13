import { type StateCreator, createStore } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'

import type { MultiplayerMessageUnion } from '@/utils/multiplayer/messages'

// ============================================================================
// ENUMS
// ============================================================================

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

export enum RoomState {
  IDLE = 'idle',
  CREATING = 'creating',
  JOINING = 'joining',
  IN_ROOM = 'in-room',
}

// ============================================================================
// TYPES
// ============================================================================

export type PeerInfo = {
  id: string
  role: PeerRole
  connectionState: RTCPeerConnectionState
}

export type WebRTCStore = {
  // Identity
  localPeerId: string | null
  setLocalPeerId: (id: string) => void

  // Peers
  peers: Map<string, PeerInfo>
  addPeer: (peerId: string, role: PeerRole) => void
  updatePeerConnectionState: (peerId: string, state: RTCPeerConnectionState) => void
  removePeer: (peerId: string) => void

  // Connection
  connectionState: ConnectionState
  setConnectionState: (state: ConnectionState) => void
  error: string | null
  setError: (error: string | null) => void

  // Room
  roomState: RoomState
  currentRoomId: string | null
  isHost: boolean
  setRoomState: (state: RoomState) => void
  setCurrentRoomId: (roomId: string | null) => void
  setIsHost: (isHost: boolean) => void

  // Signaling
  signalingState: RTCSignalingState | null
  setSignalingState: (state: RTCSignalingState) => void
  pendingOffer: RTCSessionDescriptionInit | null
  setPendingOffer: (offer: RTCSessionDescriptionInit | null) => void
  pendingAnswer: RTCSessionDescriptionInit | null
  setPendingAnswer: (answer: RTCSessionDescriptionInit | null) => void
  pendingIceCandidates: RTCIceCandidate[]
  addIceCandidate: (candidate: RTCIceCandidate) => void
  clearIceCandidates: () => void

  // Data channel
  dataChannelStates: Map<string, boolean>
  setDataChannelOpen: (peerId: string, isOpen: boolean) => void
  messagesReceived: MultiplayerMessageUnion[]
  addReceivedMessage: (message: MultiplayerMessageUnion) => void
  clearMessages: () => void

  // Reset
  reset: () => void
}

// ============================================================================
// INITIAL STATE
// ============================================================================

const MAX_MESSAGES = 100

const INITIAL_STATE = {
  localPeerId: null,
  peers: new Map<string, PeerInfo>(),
  connectionState: ConnectionState.DISCONNECTED,
  error: null,
  roomState: RoomState.IDLE,
  currentRoomId: null,
  isHost: false,
  signalingState: null,
  pendingOffer: null,
  pendingAnswer: null,
  pendingIceCandidates: [] as RTCIceCandidate[],
  dataChannelStates: new Map<string, boolean>(),
  messagesReceived: [] as MultiplayerMessageUnion[],
}

// ============================================================================
// STORE CREATOR
// ============================================================================

type WebRTCStoreCreator = StateCreator<
  WebRTCStore,
  [['zustand/subscribeWithSelector', never]],
  [],
  WebRTCStore
>

const createWebRTCStoreSlice: WebRTCStoreCreator = (set) => ({
  ...INITIAL_STATE,

  // Identity
  setLocalPeerId: (id) => set({ localPeerId: id }),

  // Peers
  addPeer: (peerId, role) =>
    set((state) => {
      const newPeers = new Map(state.peers)
      newPeers.set(peerId, { id: peerId, role, connectionState: 'new' })
      return { peers: newPeers }
    }),

  updatePeerConnectionState: (peerId, connectionState) =>
    set((state) => {
      const newPeers = new Map(state.peers)
      const peer = newPeers.get(peerId)
      if (peer) newPeers.set(peerId, { ...peer, connectionState })
      return { peers: newPeers }
    }),

  removePeer: (peerId) =>
    set((state) => {
      const newPeers = new Map(state.peers)
      newPeers.delete(peerId)
      return { peers: newPeers }
    }),

  // Connection
  setConnectionState: (connectionState) => set({ connectionState }),
  setError: (error) => set({ error }),

  // Room
  setRoomState: (roomState) => set({ roomState }),
  setCurrentRoomId: (currentRoomId) => set({ currentRoomId }),
  setIsHost: (isHost) => set({ isHost }),

  // Signaling
  setSignalingState: (signalingState) => set({ signalingState }),
  setPendingOffer: (pendingOffer) => set({ pendingOffer }),
  setPendingAnswer: (pendingAnswer) => set({ pendingAnswer }),
  addIceCandidate: (candidate) =>
    set((state) => ({
      pendingIceCandidates: [...state.pendingIceCandidates, candidate],
    })),
  clearIceCandidates: () => set({ pendingIceCandidates: [] }),

  // Data channel
  setDataChannelOpen: (peerId, isOpen) =>
    set((state) => {
      const newStates = new Map(state.dataChannelStates)
      if (isOpen) newStates.set(peerId, true)
      else newStates.delete(peerId)
      return { dataChannelStates: newStates }
    }),

  addReceivedMessage: (message) =>
    set((state) => ({
      messagesReceived: [...state.messagesReceived, message].slice(-MAX_MESSAGES),
    })),

  clearMessages: () => set({ messagesReceived: [] }),

  // Reset
  reset: () => set(INITIAL_STATE),
})

// ============================================================================
// EXPORT
// ============================================================================

export const createWebRTCStore = () =>
  createStore<WebRTCStore>()(subscribeWithSelector(createWebRTCStoreSlice))
