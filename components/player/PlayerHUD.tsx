'use client'

import { Html } from '@react-three/drei'
import gsap from 'gsap'
import { type FC, memo, useRef } from 'react'
import { Transition } from 'react-transition-group'

export const PLAYER_RADIUS = 0.5
const CONFIRMATION_DURATION_S = 2 // seconds

type Props = {
  selectedAnswer: string | null
  onConfirmationComplete: () => void
}

const PlayerHUD: FC<Props> = ({ selectedAnswer, onConfirmationComplete }) => {
  const timelineRef = useRef<GSAPTimeline>(null)

  const onEnter = () => {
    timelineRef.current?.kill()
    console.warn('PlayerHUD onEnter')
    gsap.set('#progress-bar', { x: '-100%' })
    timelineRef.current = gsap
      .timeline()
      .fromTo(
        confirmingContainer.current,
        { opacity: 0, scale: 1.3 },
        { opacity: 1, scale: 1, duration: 0.24, ease: 'power1.out' },
      )
      .to(
        '#progress-bar',
        {
          x: 0,
          duration: CONFIRMATION_DURATION_S,
          ease: 'linear',
          onComplete: () => {
            onConfirmationComplete()
          },
        },
        0,
      )
  }

  const onExit = () => {
    console.warn('PlayerHUD onExit')
    timelineRef.current?.kill()
    timelineRef.current = gsap.timeline().to(confirmingContainer.current, {
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
      position={[1.0, PLAYER_RADIUS * 2, PLAYER_RADIUS]}
      className="pointer-events-none relative select-none">
      <Transition
        in={!!selectedAnswer}
        timeout={{ enter: 0, exit: 250 }}
        mountOnEnter={true}
        unmountOnExit={true}
        onEnter={onEnter}
        onExit={onExit}
        nodeRef={confirmingContainer}>
        <div
          ref={confirmingContainer}
          className="relative flex w-fit origin-bottom-left flex-col gap-1 rounded-xl border-2 border-black bg-black/80 p-2.5">
          <div className="animate-pulse text-sm font-semibold">Confirming</div>
          <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-white/20">
            <div id="progress-bar" className="absolute h-full w-full -translate-x-full bg-white" />
          </div>
        </div>
      </Transition>
    </Html>
  )
}

const areEqual = (prev: Props, next: Props) => prev.selectedAnswer === next.selectedAnswer

export default memo(PlayerHUD, areEqual)
