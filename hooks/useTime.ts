import { useEffect, useRef } from 'react'

import { useGameStoreAPI } from '@/components/GameProvider'

export type TimeChangeHandler = (elapsedSeconds: number) => void

type TimeSelector = (state: { totalTimeS: number; speedRunTimeCS: number }) => number

const selectTotalTime: TimeSelector = (state) => state.totalTimeS
const selectSpeedRunTime: TimeSelector = (state) => state.speedRunTimeCS / 100

function useTimeRef(selector: TimeSelector, onChange?: TimeChangeHandler) {
  const gameStoreAPI = useGameStoreAPI()
  const value = useRef(selector(gameStoreAPI.getState()))

  useEffect(() => {
    onChange?.(value.current)

    const unsubscribe = gameStoreAPI.subscribe(selector, (nextTime) => {
      if (value.current === nextTime) return
      value.current = nextTime
      onChange?.(nextTime)
    })

    return unsubscribe
  }, [gameStoreAPI, onChange, selector])

  return value
}

// Subscribes to the total time spent in the experience (in seconds).
export function useTime(onChange?: TimeChangeHandler) {
  const totalTime = useTimeRef(selectTotalTime, onChange)
  return { totalTime }
}

export function useSpeedRunTime(onChange?: TimeChangeHandler) {
  const speedRunTime = useTimeRef(selectSpeedRunTime, onChange)
  return { speedRunTime }
}

export default useTime
