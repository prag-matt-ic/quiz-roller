import { useEffect, useRef } from 'react'
import { Vector3 } from 'three'

import { useGameStoreAPI } from '@/components/GameProvider'

export function usePlayerPosition(onPlayerPositionChange?: (pos: Vector3) => void) {
  const gameStoreAPI = useGameStoreAPI()

  // Capture current value in a ref to avoid re-renders
  const playerPosition = useRef<Vector3>(gameStoreAPI.getState().playerWorldPosition)

  useEffect(() => {
    // Subscribe to store updates and update ref only when playerPosition changes
    const unsubscribe = gameStoreAPI.subscribe((state, prevState) => {
      if (state.playerWorldPosition === prevState.playerWorldPosition) return
      playerPosition.current = state.playerWorldPosition
      onPlayerPositionChange?.(playerPosition.current)
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
