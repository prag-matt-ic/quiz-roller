import type { GameSliceCreator, MultiplayerSlice } from './types'

export const RESET_MULTIPLAYER_STATE: Pick<MultiplayerSlice, 'remotePlayers'> = {
  remotePlayers: new Map(),
}

export const createMultiplayerSlice: GameSliceCreator<MultiplayerSlice> = (set) => ({
  ...RESET_MULTIPLAYER_STATE,

  addRemotePlayer: (peerId, positionRef) => {
    set((state) => {
      const newRemotePlayers = new Map(state.remotePlayers)
      if (!newRemotePlayers.has(peerId)) {
        newRemotePlayers.set(peerId, {
          peerId,
          positionRef,
          lastUpdate: Date.now(),
        })
      }
      return { remotePlayers: newRemotePlayers }
    })
  },

  removeRemotePlayer: (peerId) => {
    set((state) => {
      const newRemotePlayers = new Map(state.remotePlayers)
      newRemotePlayers.delete(peerId)
      return { remotePlayers: newRemotePlayers }
    })
  },

  clearRemotePlayers: () => {
    set({ remotePlayers: new Map() })
  },
})
