import type { SignalingSlice, WebRTCSliceCreator } from './types'

const RESET_SIGNALING_STATE = {
  signalingState: null,
  pendingOffer: null,
  pendingAnswer: null,
  pendingIceCandidates: [],
}

export const createSignalingSlice: WebRTCSliceCreator<SignalingSlice> = (set) => ({
  ...RESET_SIGNALING_STATE,

  setSignalingState: (signalingState) => {
    set({ signalingState })
  },

  setPendingOffer: (pendingOffer) => {
    set({ pendingOffer })
  },

  setPendingAnswer: (pendingAnswer) => {
    set({ pendingAnswer })
  },

  addIceCandidate: (candidate) => {
    set((state) => ({
      pendingIceCandidates: [...state.pendingIceCandidates, candidate],
    }))
  },

  clearIceCandidates: () => {
    set({ pendingIceCandidates: [] })
  },
})
