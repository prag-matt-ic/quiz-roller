'use client'

import { useEffect, useRef, type FC } from 'react'

import { EdgeWarningIntensities, useGameStoreAPI } from '@/components/GameProvider'

// No longer used - edge warning happens in the background shader
const EdgeWarningOverlay: FC = () => {
  const leftOverlay = useRef<HTMLDivElement>(null)
  const rightOverlay = useRef<HTMLDivElement>(null)
  const nearOverlay = useRef<HTMLDivElement>(null)
  const farOverlay = useRef<HTMLDivElement>(null)
  const gameStore = useGameStoreAPI()

  useEffect(() => {
    const nodes = {
      left: leftOverlay.current,
      right: rightOverlay.current,
      near: nearOverlay.current,
      far: farOverlay.current,
    }

    const { left, right, near, far } = nodes
    if (!left || !right || !near || !far) return

    const applyOpacities = (values: EdgeWarningIntensities) => {
      left.style.opacity = values.left.toString()
      right.style.opacity = values.right.toString()
      near.style.opacity = values.near.toString()
      far.style.opacity = values.far.toString()
    }

    applyOpacities(gameStore.getState().edgeWarningIntensities)

    const unsubscribe = gameStore.subscribe((state, prevState) => {
      if (
        JSON.stringify(state.edgeWarningIntensities) ===
        JSON.stringify(prevState.edgeWarningIntensities)
      )
        return
      applyOpacities(state.edgeWarningIntensities)
    })

    return unsubscribe
  }, [gameStore])

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-200">
      <div
        ref={leftOverlay}
        className="absolute inset-y-0 left-0 w-[20%] bg-[linear-gradient(90deg,rgba(0,0,0,0.6)_0%,transparent_100%)] opacity-0"
      />
      <div
        ref={rightOverlay}
        className="absolute inset-y-0 right-0 w-[20%] bg-[linear-gradient(270deg,rgba(0,0,0,0.6)_0%,transparent_100%)] opacity-0"
      />
      <div
        ref={nearOverlay}
        className="absolute inset-x-0 bottom-0 h-[20%] bg-[linear-gradient(0deg,rgba(0,0,0,0.6)_0%,transparent_100%)] opacity-0"
      />
      <div
        ref={farOverlay}
        className="absolute inset-x-0 top-0 h-[20%] bg-[linear-gradient(180deg,rgba(0,0,0,0.6)_0%,transparent_100%)] opacity-0"
      />
    </div>
  )
}

export default EdgeWarningOverlay
