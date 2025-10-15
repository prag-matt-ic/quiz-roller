'use client'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import { AwardIcon, DoorOpen, PlayIcon } from 'lucide-react'
import { type FC, useRef } from 'react'
import type { TransitionStatus } from 'react-transition-group'
import { useShallow } from 'zustand/react/shallow'

import { Stage, useGameStore } from '@/components/GameProvider'

import Button from './Button'
import { GradientText } from './GradientText'

const GameOverUI: FC<{ transitionStatus: TransitionStatus }> = ({ transitionStatus }) => {
  const container = useRef<HTMLDivElement>(null)

  const gameOver = useGameStore(
    useShallow((s) => ({
      topic: s.topic,
      currentRun: s.currentRunStats,
      prevPB: s.previousPersonalBest,
      isNewPB: s.isNewPersonalBest,
      goToStage: s.goToStage,
      resetGame: s.resetGame,
    })),
  )

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
        if (gameOver.isNewPB) {
          gsap.fromTo(
            '#record-badge',
            {
              opacity: 0,
              scale: 0.8,
              y: -20,
            },
            {
              opacity: 1,
              scale: 1,
              y: 0,
              duration: 0.6,
              ease: 'back.out(1.7)',
              delay: 0.8,
            },
          )
        }
      }
      if (transitionStatus === 'exiting') {
        gsap.to(container.current, {
          opacity: 0,
          duration: 0.4,
          ease: 'power1.out',
        })
      }
    },
    {
      dependencies: [transitionStatus, gameOver.isNewPB],
      scope: container,
      revertOnUpdate: true,
    },
  )

  const handleRollAgain = () => {
    // Reset game state first
    gameOver.resetGame()
    // Small delay to ensure reset completes before starting intro
    setTimeout(() => {
      gameOver.goToStage(Stage.INTRO)
    }, 50)
  }

  return (
    <section
      ref={container}
      className="flex h-screen flex-col items-center justify-between gap-4 border border-red-600 px-8 py-30">
      <h2 className="game-over-fade-in heading-xl tracking-wide opacity-0">
        <GradientText>Game Over</GradientText>
      </h2>
      {/* New record banner */}
      {gameOver.isNewPB && (
        <h3
          id="record-badge"
          className="heading-md my-4 flex items-center justify-center gap-2 rounded-full bg-amber-500/20 px-4 py-2 text-center font-semibold text-white capitalize ring-1 ring-amber-400/40">
          <AwardIcon /> You&apos;ve set a new record!
        </h3>
      )}
      {/* Results grid */}
      <div className="game-over-fade-in w-full max-w-4xl opacity-0">
        <div className="mx-auto grid grid-cols-1 gap-4 md:grid-cols-2">
          <LevelStats
            title="Current Run"
            values={{
              topic: gameOver.topic,
              correctAnswers: gameOver.currentRun?.correctAnswers ?? 0,
              distance: gameOver.currentRun?.distance ?? 0,
            }}
            highlight={gameOver.isNewPB}
          />
          <LevelStats
            title="Personal Best"
            values={{
              topic: gameOver.prevPB?.topic ?? gameOver.topic,
              correctAnswers: gameOver.prevPB?.correctAnswers ?? 0,
              distance: gameOver.prevPB?.distance ?? 0,
            }}
            highlight={gameOver.isNewPB}
          />
        </div>
      </div>
      <div className="mt-4 flex gap-4">
        <Button
          variant="primary"
          color="dark"
          className="game-over-fade-in capitalize opacity-0"
          onClick={handleRollAgain}>
          Roll again
          <PlayIcon className="size-6" strokeWidth={1.5} />
        </Button>
        <Button
          variant="secondary"
          color="dark"
          className="game-over-fade-in capitalize opacity-0"
          onClick={() => gameOver.goToStage(Stage.SPLASH)}>
          Exit to menu
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
    <section className="relative rounded-2xl border border-white/40 bg-linear-90 from-black/10 to-black/25 p-5 text-white shadow-xl shadow-black/5 backdrop-blur-md md:p-6">
      <h3 className="heading-md mb-8 text-center tracking-wide text-white/90">{title}</h3>
      {/* Star overlay for PB highlight */}
      {highlight && (
        <AwardIcon className="pointer-events-none absolute top-3 right-3 size-7 text-amber-400 md:top-4 md:right-4 md:size-8" />
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
