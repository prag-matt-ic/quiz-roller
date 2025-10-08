'use client'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import { PlayIcon, SkullIcon } from 'lucide-react'
import type { FC } from 'react'
import { useRef } from 'react'
import type { TransitionStatus } from 'react-transition-group'

import { Stage, useGameStore } from '@/components/GameProvider'

import Button from './Button'

const GameOverUI: FC<{ transitionStatus: TransitionStatus; isMobile: boolean }> = ({
  transitionStatus,
  isMobile,
}) => {
  const container = useRef<HTMLDivElement>(null)
  const goToStage = useGameStore((s) => s.goToStage)

  useGSAP(
    () => {
      if (transitionStatus === 'entered') {
        gsap.fromTo(
          '.game-over-fade-in',
          {
            opacity: 0,
            scale: 1.2,
          },
          {
            opacity: 1,
            scale: 1,
            duration: 0.5,
            ease: 'power1.out',
            stagger: 0.08,
            delay: 0.5,
          },
        )
      }
      if (transitionStatus === 'exiting') {
        gsap.to(container.current, {
          opacity: 0,
          duration: 0.4,
          ease: 'power1.out',
        })
      }
    },
    { dependencies: [transitionStatus], scope: container },
  )

  return (
    <div ref={container} className="">
      {isMobile ? (
        <p className="preference-fade-in max-w-sm p-3 text-center text-white">USE A COMPUTER</p>
      ) : (
        <section className="flex flex-col items-center gap-4">
          <h2 className="game-over-fade-in text-2xl font-bold opacity-0">
            GAME OVER MAN, GAME OVER
          </h2>
          <Button
            variant="primary"
            className="game-over-fade-in opacity-0"
            onClick={() => goToStage(Stage.ENTRY)}>
            <PlayIcon className="size-6" strokeWidth={1.5} />
            REROLL
          </Button>
          <Button
            variant="secondary"
            className="game-over-fade-in opacity-0"
            onClick={() => goToStage(Stage.SPLASH)}>
            <SkullIcon className="size-6" strokeWidth={1.5} />
            MENU
          </Button>
        </section>
      )}
    </div>
  )
}

export default GameOverUI
