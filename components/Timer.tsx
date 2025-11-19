'use client'

import { type FC, useEffect } from 'react'

import { useGameStore, useGameStoreAPI } from './GameProvider'

const Timer: FC = () => {
  const isSpeedRunTiming = useGameStore((s) => s.isSpeedRunTiming)
  const _isHydrated = useGameStore((s) => s._isHydrated)
  const gameStoreAPI = useGameStoreAPI()

  useEffect(() => {
    if (!_isHydrated) return

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
  }, [gameStoreAPI, _isHydrated])

  useEffect(() => {
    if (!isSpeedRunTiming || !_isHydrated) return
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
  }, [isSpeedRunTiming, gameStoreAPI, _isHydrated])

  return null
}

export default Timer
