'use client'

import { useEffect, useRef, type FC } from 'react'

import { useGameStoreAPI } from '@/components/GameProvider'

const EdgeWarningOverlay: FC = () => {
  const overlay = useRef<HTMLDivElement>(null)
  const gameStore = useGameStoreAPI()

  useEffect(() => {
    const node = overlay.current
    if (!node) return

    const setOpacity = (intensity: number) => {
      node.style.opacity = intensity.toString()
    }

    const unsubscribe = gameStore.subscribe((state, prevState) => {
      if (state.edgeWarningIntensity === prevState.edgeWarningIntensity) return
      setOpacity(state.edgeWarningIntensity)
    })

    return unsubscribe
  }, [])

  return (
    <div
      ref={overlay}
      aria-hidden
      className="pointer-events-none fixed inset-0 z-200 bg-[radial-gradient(circle_at_center,transparent_50%,#83380166_70%,#833801_96%)] opacity-0"
    />
  )
}

export default EdgeWarningOverlay
