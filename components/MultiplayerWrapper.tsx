'use client'

import { type FC, type PropsWithChildren, useEffect } from 'react'

import { useGameStore } from '@/components/GameProvider'
import { WebRTCProvider, useWebRTC } from '@/components/WebRTCProvider'
import { useMultiplayerSync } from '@/hooks/useMultiplayerSync'
import { GameMode } from '@/stores/types'
import { MultiplayerMessage, type PlayerLeftMessage } from '@/utils/multiplayer/messages'

/**
 * MultiplayerSync
 *
 * Component that handles multiplayer synchronization.
 * Must be placed inside both WebRTCProvider and GameProvider.
 */
const MultiplayerSync: FC = () => {
  useMultiplayerSync()
  
  const { store, actions } = useWebRTC()
  const mode = useGameStore((s) => s.mode)

  // Handle page unload/reload - send PLAYER_LEFT message
  useEffect(() => {
    const handleBeforeUnload = () => {
      // Only send if in multiplayer mode
      if (mode !== GameMode.SPEEDRUN_MULTIPLAYER) return

      // Send PLAYER_LEFT message to all connected peers
      const { peers, localPeerId } = store.getState()
      const message: PlayerLeftMessage = {
        type: MultiplayerMessage.PLAYER_LEFT,
        data: { peerId: localPeerId || 'unknown' },
      }

      peers.forEach((_, peerId) => {
        actions.sendMessage(peerId, message)
      })
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [mode, store, actions])

  return null
}

/**
 * MultiplayerWrapper
 *
 * Wrapper component that provides WebRTC functionality to the game.
 *
 * IMPORTANT: This system is designed for exactly 2 players:
 * - WebRTC peer limit: MAX_PEERS = 2 (enforced in WebRTCProvider)
 * - Signaling server limit: 2 peers per room (enforced server-side)
 * - Each player sees exactly one remote player (the other peer)
 *
 * USAGE:
 * Wrap your game with this component to enable multiplayer:
 * <GameProvider>
 *   <MultiplayerWrapper>
 *     <Main />
 *   </MultiplayerWrapper>
 * </GameProvider>
 */
export const MultiplayerWrapper: FC<PropsWithChildren> = ({ children }) => {
  return (
    <WebRTCProvider>
      <MultiplayerSync />
      {children}
    </WebRTCProvider>
  )
}
