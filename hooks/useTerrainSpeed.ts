import { useEffect, useRef } from 'react'

import { useGameStoreAPI } from '@/components/GameProvider'

export function useTerrainSpeed(onTerrainSpeedChange?: (speed: number) => void) {
  const gameStoreAPI = useGameStoreAPI()

  // Capture current value in a ref to avoid re-renders
  const terrainSpeed = useRef(gameStoreAPI.getState().terrainSpeed)

  useEffect(() => {
    // Subscribe to store updates and update ref only when terrainSpeed changes
    const unsubscribe = gameStoreAPI.subscribe((state, prevState) => {
      if (state.terrainSpeed === prevState.terrainSpeed) return
      terrainSpeed.current = state.terrainSpeed
      onTerrainSpeedChange?.(terrainSpeed.current)
    })
    return unsubscribe
  }, [gameStoreAPI, onTerrainSpeedChange])

  return { terrainSpeed }
}

