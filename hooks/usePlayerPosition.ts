import { useEffect, useRef } from 'react'
import { Vector3 } from 'three'

import { useGameStoreAPI } from '@/components/GameProvider'

export function usePlayerPosition(onPlayerPositionChange?: (pos: Vector3) => void) {
  const gameStoreAPI = useGameStoreAPI()

  // Capture current value in a ref to avoid re-renders
  const playerPosition = useRef<Vector3>(gameStoreAPI.getState().playerWorldPosition)
  const notifiedPosition = useRef(new Vector3().copy(playerPosition.current))

  useEffect(() => {
    // Subscribe to store updates and update ref only when playerPosition changes
    const unsubscribe = gameStoreAPI.subscribe((state) => {
      const nextPosition = state.playerWorldPosition
      if (notifiedPosition.current.equals(nextPosition)) return

      notifiedPosition.current.copy(nextPosition)
      playerPosition.current = nextPosition
      onPlayerPositionChange?.(nextPosition)
    })
    return unsubscribe
  }, [gameStoreAPI, onPlayerPositionChange])

  // Fire once on mount so consumers can initialize uniforms/refs immediately.
  useEffect(() => {
    onPlayerPositionChange?.(playerPosition.current)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return { playerPosition }
}
