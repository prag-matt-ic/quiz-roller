import { useEffect, useRef } from 'react'

import { useGameStoreAPI } from '@/components/GameProvider'

export type TimeChangeHandler = (elapsedSeconds: number) => void

// Subscribes to the game time without causing React re-renders.
// Consumers can read timeElapsed.current or respond to onChange events.
export function useTime(onChange?: TimeChangeHandler) {
  const gameStoreAPI = useGameStoreAPI()
  const timeElapsed = useRef(gameStoreAPI.getState().timeElapsed)

  useEffect(() => {
    onChange?.(timeElapsed.current)

    const unsubscribe = gameStoreAPI.subscribe(
      (state) => state.timeElapsed,
      (nextTime) => {
        if (timeElapsed.current === nextTime) return
        timeElapsed.current = nextTime
        onChange?.(nextTime)
      },
    )

    return unsubscribe
  }, [gameStoreAPI, onChange])

  return { timeElapsed }
}

export default useTime
