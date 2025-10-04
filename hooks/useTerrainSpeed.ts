import { useEffect, useRef } from 'react'

import { useGameStoreAPI } from '@/components/GameProvider'

// Returns a ref to the current normalized terrain speed [0,1].
// Optionally accepts a callback invoked on changes (and once on mount).
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

  // Fire once on mount with the current value so consumers can initialize.
  useEffect(() => {
    onTerrainSpeedChange?.(terrainSpeed.current)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return { terrainSpeed }
}
