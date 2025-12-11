'use client'

import { type FC, type PropsWithChildren } from 'react'

import { WebRTCProvider } from '@/components/webrtc/WebRTCProvider'
import { useMultiplayerSync } from '@/hooks/useMultiplayerSync'

/**
 * MultiplayerSync
 *
 * Component that handles multiplayer synchronization.
 * Must be placed inside both WebRTCProvider and GameProvider.
 */
const MultiplayerSync: FC = () => {
  useMultiplayerSync()
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
