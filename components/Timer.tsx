'use client'

import { type FC, useEffect } from 'react'

import { useGameStore, useGameStoreAPI } from './GameProvider'
import { GameMode } from '@/stores/types'

const Timer: FC = () => {
  const mode = useGameStore((s) => s.mode)
  const isSpeedRunMode = mode === GameMode.SPEEDRUN
  const isSpeedRunTiming = useGameStore((s) => s.speedRunStage === 'running')
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
        totalTimeS: s.totalTimeS + deltaSeconds,
      }))
    }, 1000)

    return () => window.clearInterval(intervalId)
  }, [gameStoreAPI, _isHydrated])

  useEffect(() => {
    console.warn('Starting speed run timer', { isSpeedRunTiming, isSpeedRunMode })

    if (!isSpeedRunMode || !isSpeedRunTiming) return
    let previous = performance.now()

    const intervalId = window.setInterval(() => {
      const now = performance.now()
      const deltaCS = (now - previous) / 10
      previous = now
      gameStoreAPI.setState((s) => ({
        speedRunTimeCS: s.speedRunTimeCS + deltaCS,
      }))
    }, 10)

    return () => window.clearInterval(intervalId)
  }, [isSpeedRunMode, isSpeedRunTiming, gameStoreAPI])

  return null
}

export default Timer
