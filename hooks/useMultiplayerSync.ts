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

        // Get current state actions once per message
        const {
          addRemotePlayer,
          removeRemotePlayer,
          setRemotePlayerLeft,
          startMultiplayerCountdown,
          onRemotePlayerFinished,
          setRaceEndedEarly,
          setOverlay,
          setRacePaused,
          resetMultiplayerRaceState,
        } = gameStoreAPI.getState()

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
              addRemotePlayer(from, positionRef)
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
              addRemotePlayer(peerId, positionRef)
            }
            break
          }

          case MultiplayerMessage.PLAYER_LEFT: {
            const { peerId } = lastMessage.data
            removeRemotePlayer(peerId)
            setRemotePlayerLeft(true)
            peerPositionRefs.current.delete(peerId)
            break
          }

          case MultiplayerMessage.GAME_START: {
            // Received game-start from host, start as guest (spawn on the left)
            startMultiplayerCountdown(false)
            break
          }

          case MultiplayerMessage.RACE_FINISHED: {
            // Received race-finished from peer
            const { timeCS } = lastMessage.data
            onRemotePlayerFinished(timeCS)
            break
          }

          case MultiplayerMessage.RACE_ENDED: {
            // Opponent ended the race early
            setRaceEndedEarly(true)
            setOverlay(Overlay.MULTIPLAYER_RACE_END)
            break
          }

          case MultiplayerMessage.RACE_PAUSED: {
            // Opponent paused the race
            const { peerId } = lastMessage.data
            setRacePaused(true, peerId)
            setOverlay(Overlay.MULTIPLAYER_GAME_PAUSED)
            break
          }

          case MultiplayerMessage.RACE_RESUMED: {
            // Opponent resumed the race
            setRacePaused(false, null)
            setOverlay(Overlay.NONE)
            break
          }

          case MultiplayerMessage.RACE_RESTART: {
            // Opponent requested race restart
            const { fromCurrentPosition } = lastMessage.data

            if (fromCurrentPosition) {
              // Resume from current position
              setRacePaused(false, null)
              setOverlay(Overlay.NONE)
            } else {
              // Restart from beginning - reset and start countdown as guest
              resetMultiplayerRaceState()
              startMultiplayerCountdown(false)
            }
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
            // Get current state once
            const { removeRemotePlayer, setRemotePlayerLeft, setOverlay, ...gameState } =
              gameStoreAPI.getState()

            // Peer disconnected
            removeRemotePlayer(peerId)
            peerPositionRefs.current.delete(peerId)

            // Check if disconnect happened during active multiplayer race
            const isMultiplayerRace = gameState.mode === GameMode.SPEEDRUN_MULTIPLAYER
            const isRaceActive =
              gameState.speedRunStage === SpeedRunStage.RUNNING ||
              gameState.speedRunStage === SpeedRunStage.COUNTDOWN
            const isRacePaused = gameState.isRacePaused

            // Show disconnect overlay if peer left during active race
            // If race is paused, keep the pause overlay but update remotePlayerLeft state
            if (isMultiplayerRace && isRaceActive) {
              console.warn('[useMultiplayerSync] Peer disconnected during race')
              if (isRacePaused) {
                // Keep pause overlay open, it will show opponent left message
                setRemotePlayerLeft(true)
              } else {
                setOverlay(Overlay.MULTIPLAYER_DISCONNECT)
              }
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
