'use client'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import { AwardIcon, DoorOpen, PlayIcon } from 'lucide-react'
import { type FC, useRef } from 'react'
import { type TransitionStatus } from 'react-transition-group'
import { twJoin } from 'tailwind-merge'

import { Stage, useGameStore } from '@/components/GameProvider'
import { type RunStats, type Topic } from '@/model/schema'

import Button from './Button'
import { GradientText } from './GradientText'

const FADE_IN_CLASS = 'game-over-fade-in'
const BADGE_ID = 'record-badge'

type Props = {
  transitionStatus: TransitionStatus
}

const GameOverUI: FC<Props> = ({ transitionStatus }) => {
  const container = useRef<HTMLDivElement>(null)
  const topic = useGameStore((s) => s.topic)
  const currentRun = useGameStore((s) => s.currentRunStats)
  const previousRuns = useGameStore((s) => s.previousRuns)
  const goToStage = useGameStore((s) => s.goToStage)
  const resetGame = useGameStore((s) => s.resetGame)

  const hasPlayedGame = topic !== null

  const runsForTopic: RunStats[] =
    !!topic && previousRuns ? (previousRuns[topic as Topic] ?? []) : []

  const historyExcludingCurrent = currentRun
    ? runsForTopic.filter((r) => r.date !== currentRun.date)
    : runsForTopic

  const prevPB = calculatePersonalBest(historyExcludingCurrent)
  const isNewPB = checkIsNewPersonalBest(currentRun, prevPB)

  useGSAP(
    () => {
      if (transitionStatus === 'entered') {
        const timeline = gsap
          .timeline({ delay: 0.1 })
          .to(container.current, { opacity: 1 })
          .fromTo(
            `.${FADE_IN_CLASS}`,
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
            },
          )
        if (isNewPB) {
          timeline.fromTo(
            `#${BADGE_ID}`,
            {
              opacity: 0,
              scale: 1.12,
            },
            {
              opacity: 1,
              scale: 1,
              duration: 0.6,
              ease: 'back.out(1.7)',
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
      dependencies: [transitionStatus, isNewPB],
      scope: container,
    },
  )

  const onRollAgainClick = () => {
    resetGame()
    // Small delay to ensure reset completes before starting intro
    setTimeout(() => {
      goToStage(Stage.INTRO)
    }, 100)
  }

  const onExitToMenuClick = () => {
    goToStage(Stage.HOME)
  }

  return (
    <section
      ref={container}
      className="relative flex h-svh flex-col items-center justify-center gap-4 bg-black/80 px-8 opacity-0">
      <h2 className={`${FADE_IN_CLASS} heading-xl tracking-wide opacity-0`}>
        <GradientText>Game Over</GradientText>
      </h2>
      {/* New record banner */}
      {isNewPB && (
        <h3
          id={BADGE_ID}
          className={twJoin(
            'heading-md flex items-center justify-center gap-2 rounded-full',
            'bg-amber-500/20 px-4 py-2 text-center font-semibold text-white capitalize',
            'ring-1 ring-amber-400/40',
          )}>
          <AwardIcon /> You&apos;ve set a new record!
        </h3>
      )}
      {/* Results card */}
      {hasPlayedGame && (
        <div className={`${FADE_IN_CLASS} space-y-8 opacity-0`}>
          {/* Topic - spans all three columns */}
          <div className="col-span-3 mx-auto mb-4 w-fit rounded-2xl bg-black/40 p-6 text-center">
            <span className="text-sm font-semibold tracking-widest text-white/60 uppercase">
              Topic
            </span>
            <p className="mt-1 text-xl font-medium md:text-2xl">{topic}</p>
          </div>
          <ComparisonStats
            currentRun={{
              correctAnswers: currentRun?.correctAnswers ?? 0,
              distance: currentRun?.distance ?? 0,
            }}
            personalBest={{
              correctAnswers: prevPB.correctAnswers,
              distance: prevPB.distance,
            }}
          />
        </div>
      )}
      <div className="mt-4 flex flex-col gap-4 sm:flex-row">
        <Button
          variant="primary"
          color="dark"
          className={`${FADE_IN_CLASS} opacity-0`}
          onClick={onRollAgainClick}>
          Roll Again
          <PlayIcon className="size-6" strokeWidth={1.5} />
        </Button>
        <Button
          variant="secondary"
          color="dark"
          className={`${FADE_IN_CLASS} opacity-0`}
          onClick={onExitToMenuClick}>
          Exit to Menu
          <DoorOpen className="size-6" strokeWidth={1.5} />
        </Button>
      </div>
    </section>
  )
}

export default GameOverUI

type PersonalBest = {
  correctAnswers: number
  distance: number
}

function calculatePersonalBest(runs: RunStats[]): PersonalBest {
  return runs.reduce<PersonalBest>(
    (best, run) => {
      if (
        run.correctAnswers > best.correctAnswers ||
        (run.correctAnswers === best.correctAnswers && run.distance > best.distance)
      ) {
        return { correctAnswers: run.correctAnswers, distance: run.distance }
      }
      return best
    },
    { correctAnswers: 0, distance: 0 },
  )
}

function checkIsNewPersonalBest(
  currentRun: RunStats | null,
  personalBest: PersonalBest,
): boolean {
  if (!currentRun) {
    return false
  }

  return (
    currentRun.correctAnswers > personalBest.correctAnswers ||
    (currentRun.correctAnswers === personalBest.correctAnswers &&
      currentRun.distance > personalBest.distance)
  )
}

type ComparisonStatsProps = {
  currentRun: {
    correctAnswers: number
    distance: number
  }
  personalBest: {
    correctAnswers: number
    distance: number
  }
}

const ComparisonStats: FC<ComparisonStatsProps> = ({ currentRun, personalBest }) => {
  const isCorrectAnswersNewPB = currentRun.correctAnswers > personalBest.correctAnswers
  const isDistanceNewPB = currentRun.distance > personalBest.distance

  return (
    <section className="grid w-fit grid-cols-[auto_1fr_1fr] gap-x-4 gap-y-4 rounded-2xl bg-black/40 p-6 md:gap-x-8">
      {/* Column headers */}
      <div></div> {/* Empty cell for label column */}
      <h3 className="heading-sm text-white">This Run</h3>
      <h3 className="heading-sm text-white/50">Personal Best</h3>
      {/* Correct answers row */}
      <div className="flex items-center text-sm font-semibold tracking-widest text-white/60 uppercase">
        Correct Answers
      </div>
      <p
        className={twJoin(
          'text-3xl font-bold md:text-4xl',
          isCorrectAnswersNewPB && 'text-amber-400',
        )}>
        {currentRun.correctAnswers}
      </p>
      <p
        className={twJoin(
          'text-3xl font-bold md:text-4xl',
          !isCorrectAnswersNewPB && 'text-amber-400',
        )}>
        {personalBest.correctAnswers}
      </p>
      {/* Distance row */}
      <div className="flex items-center text-sm font-semibold tracking-widest text-white/60 uppercase">
        Distance Travelled
      </div>
      <p
        className={twJoin(
          'text-3xl font-bold md:text-4xl',
          isDistanceNewPB && 'text-amber-400',
        )}>
        {currentRun.distance}
      </p>
      <p
        className={twJoin(
          'text-3xl font-bold md:text-4xl',
          !isDistanceNewPB && 'text-amber-400',
        )}>
        {personalBest.distance}
      </p>
    </section>
  )
}
