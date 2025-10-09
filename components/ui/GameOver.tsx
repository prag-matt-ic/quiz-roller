'use client'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import { PlayIcon, SkullIcon } from 'lucide-react'
import { type FC, useMemo, useRef } from 'react'
import type { TransitionStatus } from 'react-transition-group'
import { twJoin } from 'tailwind-merge'

import { Stage, useGameStore } from '@/components/GameProvider'

import Button from './Button'

const GameOverUI: FC<{ transitionStatus: TransitionStatus; isMobile: boolean }> = ({
  transitionStatus,
  isMobile,
}) => {
  const container = useRef<HTMLDivElement>(null)
  const goToStage = useGameStore((s) => s.goToStage)

  const topic = useGameStore((s) => s.topic)
  const currentRunStats = useGameStore((s) => s.currentRunStats)
  const getPersonalBest = useGameStore((s) => s.getPersonalBest)

  const personalBest = useMemo(
    () => (topic ? getPersonalBest(topic) : null),
    [topic, getPersonalBest],
  )

  // New record if current run matches the persisted PB metrics.
  const isNewRecord = useMemo(() => {
    if (!currentRunStats || !personalBest) return false
    return (
      currentRunStats.correctAnswers === personalBest.correctAnswers &&
      currentRunStats.distance === personalBest.distance
    )
  }, [currentRunStats, personalBest])

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
          <h2 className="game-over-fade-in text-3xl font-bold opacity-0">
            GAME OVER MAN, GAME OVER
          </h2>
          {/* Results grid */}
          <div className="game-over-fade-in w-full max-w-4xl opacity-0">
            <div className="mx-auto grid grid-cols-1 gap-4 md:grid-cols-2">
              <LevelStats
                title="Current Run"
                values={{
                  topic,
                  correctAnswers: currentRunStats?.correctAnswers ?? 0,
                  distance: currentRunStats?.distance ?? 0,
                }}
                highlight={isNewRecord}
              />
              <LevelStats
                title="Personal Best"
                values={{
                  topic: personalBest?.topic ?? topic,
                  correctAnswers: personalBest?.correctAnswers ?? 0,
                  distance: personalBest?.distance ?? 0,
                }}
                highlight={!!personalBest && isNewRecord}
              />
            </div>
            {/* New record banner */}
            {isNewRecord && (
              <div
                id="record-badge"
                className="ring-amber-400/40text-center mt-4 flex items-center justify-center gap-2 rounded-full bg-amber-500/20 px-4 py-2 text-white ring-1">
                <span className="text-xl">🏆</span>
                <span className="font-semibold">You’ve set a new record!</span>
              </div>
            )}
          </div>

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

type LevelStatsProps = {
  title: string
  values: {
    topic: string | null
    correctAnswers: number
    distance: number
  }
  highlight?: boolean
}

const LevelStats: FC<LevelStatsProps> = ({ title, values, highlight }) => {
  const { topic, correctAnswers, distance } = values

  return (
    <section
      className={twJoin(
        'relative rounded-2xl p-5 shadow-lg ring-1 md:p-6',
        highlight ? 'bg-white/10 ring-white/20' : 'bg-white/5 ring-white/10',
      )}>
      <h3 className="mb-3 text-center text-lg font-semibold tracking-wide text-white/90">
        {title}
      </h3>
      {/* Star overlay for PB highlight */}
      {highlight && (
        <span className="star-pop pointer-events-none absolute top-3 right-3 text-2xl md:top-4 md:right-4 md:text-3xl">
          ⭐
        </span>
      )}

      <div className="grid grid-cols-2 gap-3 text-center text-white">
        <div className="col-span-2">
          <span className="block text-xs tracking-widest text-white/60 uppercase">Topic</span>
          <span className="block text-base font-medium md:text-lg">{topic ?? '-'}</span>
        </div>

        <div className="">
          <span className="block text-xs tracking-widest text-white/60 uppercase">Correct</span>
          <span className="block text-2xl font-bold md:text-3xl">{correctAnswers}</span>
        </div>

        <div className="">
          <span className="block text-xs tracking-widest text-white/60 uppercase">
            Distance
          </span>
          <span className="block text-2xl font-bold md:text-3xl">{distance}</span>
        </div>
      </div>
    </section>
  )
}
