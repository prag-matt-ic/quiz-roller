import { RootState, useFrame } from '@react-three/fiber'
import { useRef } from 'react'

import { type SimFps, useGameStore } from '@/components/GameProvider'

// Calls the callback at a target simulation FPS (0 = uncapped).
// - Accumulates real frame time and steps the callback at fixed dt when capped.
// - Limits substeps per render to avoid spiral-of-death on slow frames.
// - Avoids per-frame allocations by reusing refs.
export function useGameFrame(
  callback: (state: RootState, fixedDt: number) => void,
  priority = 0,
) {
  const simFps = useGameStore((s) => s.simFps)
  const accumulator = useRef(0)
  const maxSubsteps = 5

  useFrame((state, delta) => {
    // Uncapped: forward real delta
    if (simFps === 0) {
      callback(state, delta)
      return
    }

    // Fixed-step: accumulate and run at 1/fps increments
    const step = 1 / (simFps as Exclude<SimFps, 0>)

    // Clamp extremely large deltas (tab switch) to avoid huge catch-up
    const clamped = Math.min(delta, step * maxSubsteps)
    accumulator.current += clamped

    let steps = 0
    while (accumulator.current >= step && steps < maxSubsteps) {
      callback(state, step)
      accumulator.current -= step
      steps++
    }
  }, priority)
}

export default useGameFrame
