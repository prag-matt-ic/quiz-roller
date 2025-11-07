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
  const confirmingColourIndex = useGameStore((s) => s.confirmingColourIndex)
  const confirmingStart = useGameStore((s) => s.confirmingStart)
  const confirmingAnswer = useGameStore((s) => s.confirmingAnswer)
  const playerColourIndex = useGameStore((s) => s.colourIndex)

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

  const showBar = !!confirmingAnswer || !!confirmingStart || confirmingColourIndex !== null

  return (
    <Html
      sprite={true}
      pointerEvents="none"
      position={[0, PLAYER_RADIUS * 4, PLAYER_RADIUS]}
      center={true}
      renderOrder={2}
      className="relative select-none">
      <Transition
        in={showBar}
        timeout={{ enter: 0, exit: 240 }}
        onEnter={onEnter}
        onExit={onExit}
        nodeRef={confirmingContainer}>
        <div
          ref={confirmingContainer}
          className="relative h-6 w-36 overflow-hidden rounded-full border-2 border-white bg-white opacity-0 shadow-lg shadow-black/25">
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

//  const label: ReactNode = isCorrectAnswer ? (
//           <CheckIcon strokeWidth={3} size={36} />
//         ) : isIncorrectAnswer ? (
//           <XIcon strokeWidth={3} size={36} />
//         ) : (
