'use client'

import { Html } from '@react-three/drei'
import gsap from 'gsap'
import { type FC, useCallback, useEffect, useRef, useState } from 'react'
import { SwitchTransition, Transition } from 'react-transition-group'

import { useGameStore } from '@/components/GameProvider'
import { useConfirmationProgress } from '@/hooks/useConfirmationProgress'

export const PLAYER_RADIUS = 0.45

const PlayerHUD: FC = () => {
  const confirmingCollectible = useGameStore((s) => s.confirmingCollectible)
  const hudIndicator = useGameStore((s) => s.hudIndicator)
  const setHudIndicator = useGameStore((s) => s.setHudIndicator)

  const showBar = confirmingCollectible !== null
  const showContent = !!hudIndicator
  const show = showBar || showContent

  const [isMounted, setIsMounted] = useState(show)
  const showRef = useRef(show)

  if (show && !isMounted) {
    setIsMounted(true)
  }

  useEffect(() => {
    showRef.current = show
  }, [show])

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
      {
        opacity: 1,
        scale: 1,
        duration: 0.24,
        ease: 'power1.out',
        onComplete: () => {
          if (!!hudIndicator?.autoDismissS) {
            gsap.delayedCall(hudIndicator.autoDismissS, () => {
              setHudIndicator(null)
            })
          }
        },
      },
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

  const switchKey = `${showBar}-${showContent}`

  if (!isMounted) return null

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
          onExited={() => {
            if (showRef.current) return
            setIsMounted(false)
          }}
          appear={true}
          nodeRef={container}>
          {() => {
            if (showBar)
              return (
                <div
                  ref={container}
                  className="flex flex-col items-center rounded-full bg-black p-1.5 opacity-0">
                  <div className="relative h-3 w-26 overflow-hidden rounded-full border border-white bg-white">
                    <div
                      id="progress-bar"
                      className="absolute h-full w-full -translate-x-full rounded-full bg-linear-0 from-amber-400 to-amber-500"
                    />
                  </div>
                </div>
              )
            if (showContent)
              return (
                <div
                  ref={container}
                  className="overflow-hidden rounded-full bg-black p-1.5 text-white opacity-0 sm:p-3">
                  {hudIndicator.content}
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
