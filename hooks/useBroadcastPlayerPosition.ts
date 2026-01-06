import { useRef } from 'react'
import type { Mesh } from 'three'

import { useGameStoreAPI } from '@/components/GameProvider'
import { useWebRTC, useWebRTCStoreAPI } from '@/components/webrtc/WebRTCProvider'
import { useGameFrame } from '@/hooks/useGameFrame'
import { type Position3D, type Rotation, hasPositionChanged } from '@/utils/multiplayer'

/**
 * useBroadcastPlayerPosition
 *
 * Hook to broadcast the local player's position to connected peers via WebRTC.
 *
 * RESPONSIBILITIES:
 * - Send position updates every frame (throttled to reduce network traffic)
 * - Broadcast player position directly (ball now moves in world space)
 * - Include rotation for smooth remote rendering
 * - Only send when data channel is open and position has changed
 *
 * ARCHITECTURE:
 * - 2-player system: broadcasts to exactly 1 peer
 * - Throttled to 20Hz (50ms) by default to reduce bandwidth
 * - Position is now directly the world position (no coordinate transformation needed)
 *
 * @param sphereMeshRef - Ref to the player's sphere mesh for rotation data
 * @param throttleMs - Minimum milliseconds between broadcasts (default: 50ms = 20Hz)
 */
export function useBroadcastPlayerPosition(
  sphereMeshRef: React.RefObject<Mesh | null>,
  throttleMs = 50,
) {
  const gameStoreAPI = useGameStoreAPI()
  const webrtcStoreAPI = useWebRTCStoreAPI()
  const { sendMessage } = useWebRTC()

  const lastBroadcastTime = useRef(0)
  const previousPosition = useRef({ x: 0, y: 0, z: 0 })

  useGameFrame(() => {
    const { peers, dataChannelStates } = webrtcStoreAPI.getState()
    if (peers.size === 0) return

    const now = Date.now()
    if (now - lastBroadcastTime.current < throttleMs) return

    // Read fresh values from store
    const state = gameStoreAPI.getState()
    
    // Player position IS the world position now (ball moves in world space)
    const position: Position3D = {
      x: state.playerPosition[0],
      y: state.playerPosition[1],
      z: state.playerPosition[2],
    }

    // Skip if position hasn't changed
    if (!hasPositionChanged(position, previousPosition.current)) return

    previousPosition.current = position
    lastBroadcastTime.current = now

    // Get rotation from sphere mesh if available
    let rotation: Rotation | undefined
    if (sphereMeshRef.current) {
      const quat = sphereMeshRef.current.quaternion
      rotation = { x: quat.x, y: quat.y, z: quat.z, w: quat.w }
    }

    // Broadcast to all connected peers with open data channels
    peers.forEach((peerInfo) => {
      // Only send if this peer's data channel is open
      if (!dataChannelStates.get(peerInfo.id)) return

      sendMessage(peerInfo.id, {
        type: 'player-position',
        data: {
          position,
          rotation,
          // Still include platformScroll for backwards compatibility / debugging
          platformScroll: {
            x: state.platformScrollPosition[0],
            y: state.platformScrollPosition[1],
            z: state.platformScrollPosition[2],
          },
        },
      })
    })
  })
}
