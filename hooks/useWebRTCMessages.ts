import { useEffect } from 'react'

import { useWebRTCStoreAPI } from '@/components/webrtc/WebRTCProvider'
import type { WebRTCMessage } from '@/stores/webrtc/types'

/**
 * useWebRTCMessages
 *
 * Hook to subscribe to incoming WebRTC messages from peers.
 *
 * WHAT IT DOES:
 * - Listens for new messages in the Zustand store
 * - Calls your callback whenever a new message arrives
 * - Only fires for NEW messages (uses length comparison to detect changes)
 *
 * WHEN TO USE:
 * - Listen for game state updates from peers (positions, actions, etc.)
 * - Implement chat functionality
 * - Receive real-time multiplayer events
 *
 * USAGE:
 * useWebRTCMessages((message) => {
 *   if (message.type === 'player-position') {
 *     updatePeerPosition(message.data)
 *   } else if (message.type === 'chat') {
 *     addChatMessage(message.data)
 *   }
 * })
 *
 * NOTE: Messages are also stored in the Zustand store:
 * const messages = useWebRTCStore(s => s.messagesReceived)
 * Use this if you need to render the message history.
 */
export function useWebRTCMessages(onMessage?: (message: WebRTCMessage) => void): void {
  const storeAPI = useWebRTCStoreAPI()

  useEffect(() => {
    if (!onMessage) return

    // Subscribe to messagesReceived array changes
    const unsubscribe = storeAPI.subscribe(
      (state) => state.messagesReceived,
      (newMessages, prevMessages) => {
        // Only call handler for new messages (when array grows)
        if (newMessages.length > prevMessages.length) {
          // Get the most recent message
          onMessage(newMessages[newMessages.length - 1])
        }
      },
    )

    return unsubscribe
  }, [storeAPI, onMessage])
}
