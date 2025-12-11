import { useEffect, useRef } from 'react'

import { useGameStoreAPI } from '@/components/GameProvider'
import { useWebRTCStoreAPI } from '@/components/webrtc/WebRTCProvider'
import { useWebRTCMessages } from '@/hooks/useWebRTCMessages'
import type { RemotePlayerData } from '@/stores/types'
import type { WebRTCMessage } from '@/stores/webrtc/types'
import type { MultiplayerMessage } from '@/utils/multiplayer'

/**
 * useMultiplayerSync
 *
 * Hook to synchronize player positions via WebRTC for 2-player multiplayer.
 *
 * RESPONSIBILITIES:
 * - Listen for incoming position updates from the remote player
 * - Update game store with remote player position/rotation
 * - Clean up remote players when peer disconnects
 *
 * ARCHITECTURE:
 * This system supports exactly 2 players (enforced by MAX_PEERS = 2).
 * Each player sees one remote player (the other peer).
 * Messages include explicit sender ID for proper identification.
 */
export function useMultiplayerSync() {
  const webrtcStore = useWebRTCStoreAPI()
  const gameStoreAPI = useGameStoreAPI()

  // Track position refs for each peer
  const peerPositionRefs = useRef(new Map<string, RemotePlayerData['positionRef']>())

  // Handle incoming WebRTC messages
  useWebRTCMessages((message: WebRTCMessage) => {
    const typedMessage = message as MultiplayerMessage

    switch (typedMessage.type) {
      case 'player-position': {
        const { from, data } = typedMessage
        if (!from) {
          console.warn('[useMultiplayerSync] Received player-position without from field')
          return
        }

        const { position, rotation, platformScroll } = data

        // Get or create position ref for this peer
        let positionRef = peerPositionRefs.current.get(from)
        if (!positionRef) {
          positionRef = { current: { worldPosition: position, platformScroll, rotation } }
          peerPositionRefs.current.set(from, positionRef)
          gameStoreAPI.getState().addRemotePlayer(from, positionRef)
        } else {
          // Update ref directly (no re-render)
          positionRef.current = { worldPosition: position, platformScroll, rotation }
        }
        break
      }

      case 'player-joined': {
        const { peerId } = typedMessage.data
        if (!peerPositionRefs.current.has(peerId)) {
          const positionRef = {
            current: {
              worldPosition: { x: 4, y: 0, z: 0 },
              platformScroll: { x: 0, y: 0, z: 0 },
            },
          }
          peerPositionRefs.current.set(peerId, positionRef)
          gameStoreAPI.getState().addRemotePlayer(peerId, positionRef)
        }
        break
      }

      case 'player-left': {
        const { peerId } = typedMessage.data
        gameStoreAPI.getState().removeRemotePlayer(peerId)
        peerPositionRefs.current.delete(peerId)
        break
      }
    }
  })

  // Clean up remote players when peers disconnect
  useEffect(() => {
    const unsubscribe = webrtcStore.subscribe(
      (state) => state.peers,
      (newPeers) => {
        const currentPeerIds = Array.from(newPeers.keys())

        // Remove players that are no longer connected
        peerPositionRefs.current.forEach((_, peerId) => {
          if (!currentPeerIds.includes(peerId)) {
            gameStoreAPI.getState().removeRemotePlayer(peerId)
            peerPositionRefs.current.delete(peerId)
          }
        })
      },
    )

    return unsubscribe
  }, [webrtcStore, gameStoreAPI])
}
