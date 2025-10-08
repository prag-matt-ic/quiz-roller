'use client'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import { PlayIcon, SkullIcon } from 'lucide-react'
import type { FC } from 'react'
import { useRef } from 'react'
import type { TransitionStatus } from 'react-transition-group'

import { Stage, useGameStore } from '@/components/GameProvider'

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
        <section>
          <h2 className="text-2xl font-bold">GAME OVER MAN, GAME OVER</h2>
          <button
            className="game-over-fade-in flex cursor-pointer items-center gap-3 rounded-full border border-white/20 bg-linear-90 from-white/5 to-white/15 px-5 py-2.5 text-xl font-medium text-white opacity-0 shadow-xl shadow-white/5 backdrop-blur-sm hover:from-black/20 hover:to-black/5"
            onClick={() => goToStage(Stage.ENTRY)}>
            <PlayIcon className="size-6" strokeWidth={1.5} />
            TRY AGAIN
          </button>
          <button
            className="game-over-fade-in flex cursor-pointer items-center gap-3 rounded-full border border-white/20 bg-linear-90 from-white/5 to-white/15 px-5 py-2.5 text-xl font-medium text-white opacity-0 shadow-xl shadow-white/5 backdrop-blur-sm hover:from-black/20 hover:to-black/5"
            onClick={() => goToStage(Stage.SPLASH)}>
            <SkullIcon className="size-6" strokeWidth={1.5} />
            GIVE UP
          </button>
        </section>
      )}
    </div>
  )
}

export default GameOverUI

