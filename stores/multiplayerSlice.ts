import { type GameSliceCreator, type MultiplayerSlice, Overlay } from './types'

export const RESET_MULTIPLAYER_STATE: Pick<
  MultiplayerSlice,
  'remotePlayers' | 'localPlayerFinishedTimeCS' | 'remotePlayerFinishedTimeCS'
> = {
  remotePlayers: new Map(),
  localPlayerFinishedTimeCS: null,
  remotePlayerFinishedTimeCS: null,
}

export const createMultiplayerSlice: GameSliceCreator<MultiplayerSlice> = (set, get) => ({
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

  onLocalPlayerFinished: (timeCS: number) => {
    const { remotePlayerFinishedTimeCS } = get()
    set({ localPlayerFinishedTimeCS: timeCS })

    // Check if both players have finished
    if (remotePlayerFinishedTimeCS !== null) {
      // Both finished - show multiplayer race end overlay
      set({ overlay: Overlay.MULTIPLAYER_RACE_END })
    }
  },

  onRemotePlayerFinished: (timeCS: number) => {
    const { localPlayerFinishedTimeCS } = get()
    set({ remotePlayerFinishedTimeCS: timeCS })

    // Check if both players have finished
    if (localPlayerFinishedTimeCS !== null) {
      // Both finished - show multiplayer race end overlay
      set({ overlay: Overlay.MULTIPLAYER_RACE_END })
    }
  },

  resetMultiplayerRaceState: () => {
    set({
      localPlayerFinishedTimeCS: null,
      remotePlayerFinishedTimeCS: null,
    })
  },
})
