import { useEffect, useRef } from 'react'

import { useGameStoreAPI } from '@/components/GameProvider'

export type PlayerPosition = { x: number; y: number; z: number }

export function usePlayerPosition(
  onPlayerPositionChange?: (pos: PlayerPosition) => void,
) {
  const gameStoreAPI = useGameStoreAPI()

  // Capture current value in a ref to avoid re-renders
  const playerPosition = useRef<PlayerPosition>(
    gameStoreAPI.getState().playerPosition,
  )

  useEffect(() => {
    // Subscribe to store updates and update ref only when playerPosition changes
    const unsubscribe = gameStoreAPI.subscribe((state, prevState) => {
      if (state.playerPosition === prevState.playerPosition) return
      playerPosition.current = state.playerPosition
      onPlayerPositionChange?.(playerPosition.current)
    })
    return unsubscribe
  }, [gameStoreAPI, onPlayerPositionChange])

  return { playerPosition }
}

