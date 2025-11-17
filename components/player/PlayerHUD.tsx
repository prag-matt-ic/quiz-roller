'use client'

import { Html } from '@react-three/drei'
import gsap from 'gsap'
import { type FC, useCallback, useEffect, useRef } from 'react'
import { SwitchTransition, Transition } from 'react-transition-group'
import { ArrowUpCircleIcon, CheckIcon, XIcon } from 'lucide-react'

import { useGameStore } from '@/components/GameProvider'
import { createPaletteGradient } from '@/components/palette'
import { useConfirmationProgress } from '@/hooks/useConfirmationProgress'

export const PLAYER_RADIUS = 0.5

const PlayerHUD: FC = () => {
  const confirmingPaletteIndex = false // useGameStore((s) => s.confirmingPaletteIndex)
  const confirmingStart = false //useGameStore((s) => s.confirmingStart)
  const confirmingAnswer = false // useGameStore((s) => s.confirmingAnswer)
  const paletteIndex = useGameStore((s) => s.paletteIndex)
  const hudIndicator = useGameStore((s) => s.hudIndicator)
  const setHudIndicator = useGameStore((s) => s.setHudIndicator)

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
  const dismissTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const clearDismissTimeout = useCallback(() => {
    if (dismissTimeoutRef.current !== null) {
      clearTimeout(dismissTimeoutRef.current)
      dismissTimeoutRef.current = null
    }
  }, [])

  const scheduleDismiss = useCallback(() => {
    if (!hudIndicator?.autoDismissMs) return
    clearDismissTimeout()
    dismissTimeoutRef.current = setTimeout(() => {
      setHudIndicator(null)
    }, hudIndicator.autoDismissMs)
  }, [clearDismissTimeout, hudIndicator, setHudIndicator])

  const onEnter = useCallback(() => {
    containerTween.current?.kill()
    containerTween.current = gsap.fromTo(
      container.current,
      { opacity: 0, scale: 1.2 },
      { opacity: 1, scale: 1, duration: 0.24, ease: 'power1.out' },
    )
    scheduleDismiss()
  }, [scheduleDismiss])

  const onExit = useCallback(() => {
    containerTween.current?.kill()
    containerTween.current = gsap.to(container.current, {
      scale: 1.2,
      opacity: 0,
      duration: 0.2,
      ease: 'power1.out',
    })
    clearDismissTimeout()
  }, [clearDismissTimeout])

  useEffect(() => () => clearDismissTimeout(), [clearDismissTimeout])

  useEffect(() => {
    if (!hudIndicator) {
      clearDismissTimeout()
    }
  }, [clearDismissTimeout, hudIndicator])

  // Generate gradient colors based on selected colour band
  const rgbGradient = createPaletteGradient(paletteIndex, {
    mode: 'rgb',
  })
  const oklchGradient = createPaletteGradient(paletteIndex, {
    mode: 'oklch',
  })

  const showBar = false
  const showLabel = !!hudIndicator
  const switchKey = `${showBar}-${showLabel}`

  return (
    <Html
      sprite={true}
      pointerEvents="none"
      position={[0, PLAYER_RADIUS * 4, PLAYER_RADIUS]}
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
            if (showLabel)
              return (
                <div
                  ref={container}
                  className="overflow-hidden rounded-full bg-black/80 p-2 text-white opacity-0">
                  {/* {hudIndicator?.type === 'correct' && (
                    <CheckIcon strokeWidth={4} size={48} className="text-green-500" />
                  )}
                  {hudIndicator?.type === 'incorrect' && (
                    <XIcon strokeWidth={4} size={48} className="text-red-600" />
                  )} */}
                  {hudIndicator?.type === 'move' && (
                    <div className="flex items-center gap-2 pr-2">
                      <ArrowUpCircleIcon strokeWidth={1.5} size={32} />
                      <span className="block font-bold whitespace-nowrap uppercase">
                        Use your keys to move along
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
