import { useEffect, useRef } from 'react'

import { useGameStoreAPI } from '@/components/GameProvider'
import { useWebRTC } from '@/components/WebRTCProvider'
import { GameMode, Overlay, type RemotePlayerData, SpeedRunStage } from '@/stores/types'
import { MultiplayerMessage, type RaceFinishedMessage } from '@/utils/multiplayer/messages'

/**
 * useMultiplayerSync
 *
 * Synchronizes player positions via WebRTC for 2-player multiplayer.
 * Handles incoming position updates and game-start messages.
 */
export function useMultiplayerSync() {
  const { store, actions } = useWebRTC()
  const gameStoreAPI = useGameStoreAPI()

  // Track position refs for each peer
  const peerPositionRefs = useRef(new Map<string, RemotePlayerData['positionRef']>())

  // Handle incoming WebRTC messages
  useEffect(() => {
    const unsubscribe = store.subscribe(
      (state) => state.messagesReceived,
      (newMessages, prevMessages) => {
        if (newMessages.length === 0) return

        const lastMessage = newMessages[newMessages.length - 1]
        const prevLastMessage = prevMessages[prevMessages.length - 1]

        // Only process if there's a new message
        if (newMessages.length <= prevMessages.length && lastMessage === prevLastMessage) return

        switch (lastMessage.type) {
          case MultiplayerMessage.PLAYER_POSITION: {
            const { from, data } = lastMessage
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

          case MultiplayerMessage.PLAYER_JOINED: {
            const { peerId } = lastMessage.data
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

          case MultiplayerMessage.PLAYER_LEFT: {
            const { peerId } = lastMessage.data
            gameStoreAPI.getState().removeRemotePlayer(peerId)
            gameStoreAPI.getState().setRemotePlayerLeft(true)
            peerPositionRefs.current.delete(peerId)
            break
          }

          case MultiplayerMessage.GAME_START: {
            // Received game-start from host, start as guest (spawn on the left)
            gameStoreAPI.getState().startMultiplayerCountdown(false)
            break
          }

          case MultiplayerMessage.RACE_FINISHED: {
            // Received race-finished from peer
            const { timeCS } = lastMessage.data
            gameStoreAPI.getState().onRemotePlayerFinished(timeCS)
            break
          }

          case MultiplayerMessage.RACE_ENDED: {
            // Opponent ended the race early
            gameStoreAPI.getState().setRaceEndedEarly(true)
            gameStoreAPI.getState().setOverlay(Overlay.MULTIPLAYER_RACE_END)
            break
          }
        }
      },
    )

    return unsubscribe
  }, [store, gameStoreAPI])

  // Clean up remote players when peers disconnect
  useEffect(() => {
    const unsubscribe = store.subscribe(
      (state) => state.peers,
      (newPeers, prevPeers) => {
        const currentPeerIds = Array.from(newPeers.keys())
        const prevPeerIds = Array.from(prevPeers.keys())

        // Check if any peers disconnected
        prevPeerIds.forEach((peerId) => {
          if (!currentPeerIds.includes(peerId)) {
            // Peer disconnected
            gameStoreAPI.getState().removeRemotePlayer(peerId)
            peerPositionRefs.current.delete(peerId)

            // Check if disconnect happened during active multiplayer race
            const gameState = gameStoreAPI.getState()
            const isMultiplayerRace = gameState.mode === GameMode.SPEEDRUN_MULTIPLAYER
            const isRaceActive =
              gameState.speedRunStage === SpeedRunStage.RUNNING ||
              gameState.speedRunStage === SpeedRunStage.COUNTDOWN

            // Show disconnect overlay if peer left during active race
            if (isMultiplayerRace && isRaceActive) {
              console.log('[useMultiplayerSync] Peer disconnected during race, showing overlay')
              gameStoreAPI.getState().setOverlay(Overlay.MULTIPLAYER_DISCONNECT)
            }
          }
        })
      },
    )

    return unsubscribe
  }, [store, gameStoreAPI])

  // Send RACE_FINISHED message when local player finishes
  useEffect(() => {
    const unsubscribe = gameStoreAPI.subscribe(
      (state) => state.localPlayerFinishedTimeCS,
      (localFinishTime, prevFinishTime) => {
        // Only send when transitioning from null to a value
        if (localFinishTime === null || prevFinishTime !== null) return

        const message: RaceFinishedMessage = {
          type: MultiplayerMessage.RACE_FINISHED,
          data: { timeCS: localFinishTime },
        }

        // Send to all connected peers
        const peers = store.getState().peers
        peers.forEach((_, peerId) => {
          actions.sendMessage(peerId, message)
        })
      },
    )

    return unsubscribe
  }, [store, gameStoreAPI, actions])
}
