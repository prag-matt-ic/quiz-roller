'use client'

import { Html } from '@react-three/drei'
import gsap from 'gsap'
import { type FC, useCallback, useRef } from 'react'
import { Transition } from 'react-transition-group'

import { useGameStore } from '@/components/GameProvider'
import { COLOUR_RANGES, createPaletteGradient } from '@/components/palette'
import { useConfirmationProgress } from '@/hooks/useConfirmationProgress'

export const PLAYER_RADIUS = 0.5

const ConfirmationBar: FC = () => {
  const confirmingTopic = useGameStore((s) => s.confirmingTopic)
  const confirmingAnswer = useGameStore((s) => s.confirmingAnswer)
  const playerColourIndex = useGameStore((s) => s.playerColourIndex)

  const setter = useCallback(
    (value: number) => gsap.quickSetter('#progress-bar', 'x', '%')(value),
    [],
  )

  const onConfirmationProgressChange = (progress: number) => {
    const xValue = -100 + progress * 100
    setter(xValue)
  }

  useConfirmationProgress(onConfirmationProgressChange)

  const containerTween = useRef<GSAPTween>(null)
  const confirmingContainer = useRef<HTMLDivElement>(null)

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

  // Generate gradient colors based on selected colour band
  const range = COLOUR_RANGES[playerColourIndex]
  const rgbGradient = createPaletteGradient(range.min, range.max, {
    mode: 'rgb',
  })
  const oklchGradient = createPaletteGradient(range.min, range.max, {
    mode: 'oklch',
  })

  return (
    <Html
      sprite={true}
      zIndexRange={[1000, 0]}
      distanceFactor={5}
      transform={true}
      pointerEvents="none"
      position={[PLAYER_RADIUS, PLAYER_RADIUS * 6, PLAYER_RADIUS]}
      className="relative select-none">
      <Transition
        in={!!confirmingAnswer || !!confirmingTopic}
        timeout={{ enter: 0, exit: 240 }}
        onEnter={onEnter}
        onExit={onExit}
        nodeRef={confirmingContainer}>
        <div
          ref={confirmingContainer}
          className="relative h-5 w-36 overflow-hidden rounded-full border-2 border-white bg-white opacity-0 shadow-lg shadow-black/25">
          <div
            id="progress-bar"
            className="absolute h-full w-full -translate-x-full rounded-full"
            style={{
              background: rgbGradient,
              backgroundImage: oklchGradient,
            }}
          />
        </div>
      </Transition>
    </Html>
  )
}

export default ConfirmationBar
