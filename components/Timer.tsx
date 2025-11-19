'use client'

import { type FC, useEffect } from 'react'

import { useGameStore, useGameStoreAPI } from './GameProvider'

const Timer: FC = () => {
  const isSpeedRunTiming = useGameStore((s) => s.isSpeedRunTiming)
  const gameStoreAPI = useGameStoreAPI()

  useEffect(() => {
    let previous = Date.now()
    const intervalId = window.setInterval(() => {
      const now = Date.now()
      const deltaSeconds = (now - previous) / 1000
      previous = now
      gameStoreAPI.setState((s) => ({
        totalTimeSeconds: s.totalTimeSeconds + deltaSeconds,
      }))
    }, 1000)

    return () => window.clearInterval(intervalId)
  }, [gameStoreAPI])

  useEffect(() => {
    if (!isSpeedRunTiming) return
    let previous = performance.now()

    const intervalId = window.setInterval(() => {
      const now = performance.now()
      const deltaSeconds = (now - previous) / 1000
      previous = now
      gameStoreAPI.setState((s) => ({
        speedRunTimeSeconds: s.speedRunTimeSeconds + deltaSeconds,
      }))
    }, 10)

    return () => window.clearInterval(intervalId)
  }, [isSpeedRunTiming, gameStoreAPI])

  return null
}

export default Timer
