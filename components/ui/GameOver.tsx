'use client'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import { DoorOpen, PlayIcon } from 'lucide-react'
import { type FC, useMemo, useRef } from 'react'
import type { TransitionStatus } from 'react-transition-group'
import { twJoin } from 'tailwind-merge'

import { Stage, useGameStore } from '@/components/GameProvider'

import Button from './Button'
import { GradientText } from './GradientText'

const GameOverUI: FC<{ transitionStatus: TransitionStatus }> = ({ transitionStatus }) => {
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
    <section
      ref={container}
      className="flex h-screen flex-col items-center justify-between gap-4 border border-red-600 px-8 py-30">
      <h2 className="game-over-fade-in heading-xl tracking-wide opacity-0">
        <GradientText>Game Over</GradientText>
      </h2>
      {/* New record banner */}
      {isNewRecord ? (
        <h3
          id="record-badge"
          className="heading-md mt-4 flex items-center justify-center gap-2 rounded-full bg-amber-500/20 px-4 py-2 text-center font-semibold text-white capitalize ring-1 ring-amber-400/40">
          🏆 You’ve set a new record! 🏆
        </h3>
      ) : (
        <div className="hidden" />
      )}
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
      </div>
      <div className="mt-4 flex gap-4">
        <Button
          variant="primary"
          className="game-over-fade-in capitalize opacity-0"
          onClick={() => goToStage(Stage.INTRO)}>
          roll again
          <PlayIcon className="size-6" strokeWidth={1.5} />
        </Button>
        <Button
          variant="secondary"
          className="game-over-fade-in capitalize opacity-0"
          onClick={() => goToStage(Stage.SPLASH)}>
          exit to menu
          <DoorOpen className="size-6" strokeWidth={1.5} />
        </Button>
      </div>
    </section>
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
    <section className="relative rounded-2xl border border-white/40 bg-linear-90 from-black/5 to-black/25 p-5 text-white shadow-xl shadow-black/5 backdrop-blur-md md:p-6">
      <h3 className="heading-md mb-8 text-center tracking-wide text-white/90">{title}</h3>
      {/* Star overlay for PB highlight */}
      {highlight && (
        <span className="star-pop pointer-events-none absolute top-3 right-3 text-2xl md:top-4 md:right-4 md:text-3xl">
          ⭐
        </span>
      )}

      <div className="grid grid-cols-2 gap-1 text-center text-white">
        <span className="col-span-2 row-start-1 text-sm font-semibold tracking-widest text-white/60 uppercase">
          Topic
        </span>
        <span className="col-span-2 row-start-2 mb-8 text-xl font-medium md:text-2xl">
          {topic ?? '-'}
        </span>

        <span className="col-start-1 row-start-3 text-sm font-semibold tracking-widest text-white/60 uppercase">
          Correct
        </span>
        <span className="col-start-1 row-start-4 text-3xl font-bold md:text-4xl">
          {correctAnswers}
        </span>

        <span className="col-start-2 row-start-3 text-sm font-semibold tracking-widest text-white/60 uppercase">
          Distance
        </span>
        <span className="col-start-2 row-start-4 text-3xl font-bold md:text-4xl">
          {distance}
        </span>
      </div>
    </section>
  )
}
