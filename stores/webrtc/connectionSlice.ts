import {
  ConnectionState,
  type ConnectionSlice,
  type WebRTCSliceCreator,
  PeerRole,
  type PeerInfo,
} from './types'

const RESET_CONNECTION_STATE = {
  localPeerId: null,
  peers: new Map<string, PeerInfo>(),
  connectionState: ConnectionState.DISCONNECTED,
  error: null,
}

export const createConnectionSlice: WebRTCSliceCreator<ConnectionSlice> = (set) => ({
  ...RESET_CONNECTION_STATE,

  setLocalPeerId: (id) => {
    set({ localPeerId: id })
  },

  addPeer: (peerId, role) => {
    set((state) => {
      const newPeers = new Map(state.peers)
      newPeers.set(peerId, {
        id: peerId,
        role,
        connectionState: 'new',
      })
      return { peers: newPeers }
    })
  },

  updatePeerConnectionState: (peerId, connectionState) => {
    set((state) => {
      const newPeers = new Map(state.peers)
      const peer = newPeers.get(peerId)
      if (peer) {
        newPeers.set(peerId, { ...peer, connectionState })
      }
      return { peers: newPeers }
    })
  },

  removePeer: (peerId) => {
    set((state) => {
      const newPeers = new Map(state.peers)
      newPeers.delete(peerId)
      return { peers: newPeers }
    })
  },

  setConnectionState: (connectionState) => {
    set({ connectionState })
  },

  setError: (error) => {
    set({ error })
  },

  reset: () => {
    set(RESET_CONNECTION_STATE)
  },
})
