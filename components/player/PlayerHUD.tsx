'use client'

import { Html } from '@react-three/drei'
import gsap from 'gsap'
import { type FC, useCallback, useRef } from 'react'
import { SwitchTransition, Transition } from 'react-transition-group'
import { ArrowUpCircleIcon, CheckIcon, XIcon } from 'lucide-react'

import { useGameStore } from '@/components/GameProvider'
import { COLOUR_RANGES, createPaletteGradient } from '@/components/palette'
import { useConfirmationProgress } from '@/hooks/useConfirmationProgress'

export const PLAYER_RADIUS = 0.5

const PlayerHUD: FC = () => {
  const confirmingColourIndex = useGameStore((s) => s.confirmingColourIndex)
  const confirmingStart = useGameStore((s) => s.confirmingStart)
  const confirmingAnswer = useGameStore((s) => s.confirmingAnswer)
  const playerColourIndex = useGameStore((s) => s.colourIndex)
  const hudIndicator = useGameStore((s) => s.hudIndicator)

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
  const container = useRef<HTMLDivElement>(null)

  const onEnter = () => {
    containerTween.current?.kill()
    containerTween.current = gsap.fromTo(
      container.current,
      { opacity: 0, scale: 1.2 },
      { opacity: 1, scale: 1, duration: 0.24, ease: 'power1.out' },
    )
  }

  const onExit = () => {
    containerTween.current?.kill()
    containerTween.current = gsap.to(container.current, {
      scale: 1.2,
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
  const showResult = !!hudIndicator
  const switchKey = `${showBar}-${showResult}`

  return (
    <Html
      sprite={true}
      pointerEvents="none"
      position={[0, PLAYER_RADIUS * 3, PLAYER_RADIUS]}
      center={true}
      renderOrder={2}
      className="relative select-none">
      <SwitchTransition mode="out-in">
        <Transition
          key={switchKey}
          timeout={{ enter: 0, exit: 220 }}
          onEnter={onEnter}
          onExit={onExit}
          appear={true}
          nodeRef={container}>
          {() => {
            if (showBar)
              return (
                <div
                  ref={container}
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
              )
            if (showResult)
              return (
                <div
                  ref={container}
                  className="overflow-hidden rounded-full bg-white p-2 opacity-0 shadow-lg shadow-black/25">
                  {hudIndicator === 'correct' && (
                    <CheckIcon strokeWidth={4} size={48} className="text-(--palette-8)" />
                  )}
                  {hudIndicator === 'incorrect' && (
                    <XIcon strokeWidth={4} size={48} className="text-(--palette-4)" />
                  )}
                  {hudIndicator === 'move' && (
                    <div className="flex items-center gap-2 pr-2 text-(--palette-7)">
                      <ArrowUpCircleIcon strokeWidth={2} size={32} />
                      <span className="block font-semibold whitespace-nowrap uppercase">
                        Stay on the platform
                      </span>
                    </div>
                  )}
                </div>
              )
            return <div ref={container} className="hidden" />
          }}
        </Transition>
      </SwitchTransition>
    </Html>
  )
}

export default PlayerHUD
