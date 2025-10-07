'use client'

import { Html } from '@react-three/drei'
import gsap from 'gsap'
import { type FC, useCallback, useRef } from 'react'
import { Transition } from 'react-transition-group'

import { useGameStore } from '@/components/GameProvider'
import { getPaletteHex } from '@/components/palette'
import { useConfirmationProgress } from '@/hooks/useConfirmationProgress'

export const PLAYER_RADIUS = 0.5

// Get colors from palette at different positions
const COLOR_START = getPaletteHex(0.3)
const COLOR_END = getPaletteHex(0.8)

const PlayerHUD: FC = () => {
  const confirmingAnswer = useGameStore((s) => s.confirmingAnswer)

  const setter = useCallback(
    (value: number) => gsap.quickSetter('#progress-bar', 'x', '%')(value),
    [],
  )

  const onConfirmationProgressChange = useCallback(
    (progress: number) => {
      const xValue = -100 + progress * 100
      setter(xValue)
    },
    [setter],
  )

  useConfirmationProgress(onConfirmationProgressChange)

  const containerTween = useRef<GSAPTween>(null)

  const onEnter = () => {
    containerTween.current?.kill()
    containerTween.current = gsap.fromTo(
      confirmingContainer.current,
      { opacity: 0, scale: 1.25 },
      { opacity: 1, scale: 1, duration: 0.24, ease: 'power1.out' },
    )
  }

  const onExit = () => {
    containerTween.current?.kill()
    containerTween.current = gsap.to(confirmingContainer.current, {
      scale: 1.1,
      opacity: 0,
      duration: 0.2,
      ease: 'power1.out',
    })
  }

  const confirmingContainer = useRef<HTMLDivElement>(null)

  return (
    <Html
      sprite={true}
      zIndexRange={[1000, 0]}
      distanceFactor={5}
      transform={true}
      position={[PLAYER_RADIUS, PLAYER_RADIUS * 6, PLAYER_RADIUS]}
      className="pointer-events-none relative select-none">
      <Transition
        in={!!confirmingAnswer}
        timeout={{ enter: 0, exit: 300 }}
        mountOnEnter={true}
        unmountOnExit={true}
        onEnter={onEnter}
        onExit={onExit}
        nodeRef={confirmingContainer}>
        <div
          ref={confirmingContainer}
          className="relative h-5 w-36 overflow-hidden rounded-full border-3 border-white bg-slate-300">
          <div
            id="progress-bar"
            className="absolute h-full w-full -translate-x-full rounded-full"
            style={{
              background: `linear-gradient(90deg, ${COLOR_START}, ${COLOR_END})`,
            }}
          />
        </div>
      </Transition>
    </Html>
  )
}

export default PlayerHUD
