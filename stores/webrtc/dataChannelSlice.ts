import type { DataChannelSlice, WebRTCSliceCreator, WebRTCMessage } from './types'

// Maximum number of messages to keep in history (prevents memory growth)
const MAX_MESSAGES = 100

const RESET_DATA_CHANNEL_STATE = {
  isDataChannelOpen: false,
  messagesReceived: [],
  messagesSent: [],
}

export const createDataChannelSlice: WebRTCSliceCreator<DataChannelSlice> = (set) => ({
  ...RESET_DATA_CHANNEL_STATE,

  setDataChannelOpen: (isDataChannelOpen) => {
    set({ isDataChannelOpen })
  },

  addReceivedMessage: (message) => {
    set((state) => {
      const messages = [...state.messagesReceived, message]
      // Keep only last MAX_MESSAGES to prevent memory growth
      return {
        messagesReceived: messages.slice(-MAX_MESSAGES),
      }
    })
  },

  addSentMessage: (message) => {
    set((state) => {
      const messages = [...state.messagesSent, message]
      // Keep only last MAX_MESSAGES to prevent memory growth
      return {
        messagesSent: messages.slice(-MAX_MESSAGES),
      }
    })
  },

  clearMessages: () => {
    set({ messagesReceived: [], messagesSent: [] })
  },
})
