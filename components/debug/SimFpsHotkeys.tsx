'use client'

import { type FC, useEffect } from 'react'

import { SimFps, useGameStore } from '@/components/GameProvider'

// Minimal debug helper: press "F" to cycle simulation FPS (0 -> 30 -> 60 -> 120 -> 0)
// No UI; logs to console. Keeps code changes small and contained.
const SimFpsHotkeys: FC = () => {
  const simFps = useGameStore((s) => s.simFps)
  const setSimFps = useGameStore((s) => s.setSimFps)

  useEffect(() => {
    const sequence: SimFps[] = [0, 30, 60, 120]
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'KeyF') {
        const idx = sequence.indexOf(simFps)
        const next = sequence[(idx + 1) % sequence.length]
        setSimFps(next)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [simFps, setSimFps])

  return (
    <div className="fixed bottom-0 left-0 z-1000 bg-black p-3 font-mono text-sm text-white select-none">
      FPS CAP: {simFps === 0 ? 'uncapped' : `${simFps} fps`}
      <span className="ml-2">(Press F)</span>
    </div>
  )
}

export default SimFpsHotkeys
