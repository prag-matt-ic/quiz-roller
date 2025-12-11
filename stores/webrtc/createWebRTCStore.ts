import { createStore } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'

import { createConnectionSlice } from './connectionSlice'
import { createDataChannelSlice } from './dataChannelSlice'
import { createSignalingSlice } from './signalingSlice'
import type { WebRTCStore } from './types'

export const createWebRTCStore = () => {
  return createStore<WebRTCStore>()(
    subscribeWithSelector((...a) => ({
      ...createConnectionSlice(...a),
      ...createSignalingSlice(...a),
      ...createDataChannelSlice(...a),
    })),
  )
}
