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
 * - Handles both array growth and max capacity scenarios
 *
 * WHEN TO USE:
 * - Listen for game state updates from peers (positions, actions, etc.)
 * - Implement chat functionality
 * - Receive real-time multiplayer events
 *
 * IMPORTANT FIX:
 * Previously only detected new messages when array length grew, which failed
 * when the message array reached MAX_MESSAGES (100) and got sliced.
 * Now also detects when the last message changes (different reference),
 * ensuring continuous message processing even after 100+ messages.
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
        // Check if there's a new message by comparing the last message
        // This handles both array growth and when array is at MAX_MESSAGES
        if (newMessages.length === 0) return

        const lastMessage = newMessages[newMessages.length - 1]
        const prevLastMessage = prevMessages[prevMessages.length - 1]

        // New message if array grew OR if last message changed (when at max capacity)
        if (newMessages.length > prevMessages.length || lastMessage !== prevLastMessage) {
          onMessage(lastMessage)
        }
      },
    )

    return unsubscribe
  }, [storeAPI, onMessage])
}
