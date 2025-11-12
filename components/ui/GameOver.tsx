'use client'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import { AwardIcon, PlayIcon, Share2Icon } from 'lucide-react'
import { type FC, type RefObject, useCallback } from 'react'
import { type TransitionStatus } from 'react-transition-group'
import { twJoin } from 'tailwind-merge'

import { useGameStore } from '@/components/GameProvider'
import { type RunStats } from '@/model/schema'
import useWebShare from '@/hooks/useWebShare'

import Button from './Button'
import { GradientText } from './GradientText'
import Card from './Card'

const FADE_IN_CLASS = 'game-over-fade-in'

type Props = {
  transitionStatus: TransitionStatus
  ref: RefObject<HTMLDivElement | null>
}

const GameOverUI: FC<Props> = ({ transitionStatus, ref }) => {
  const currentRun = useGameStore((s) => s.currentRun)
  const previousRuns = useGameStore((s) => s.previousRuns)
  const resetGame = useGameStore((s) => s.resetGame)

  const { handleShare, isShareSupported, isSharing } = useWebShare()

  const hasPlayedGame = currentRun !== null

  const historyExcludingCurrent = currentRun
    ? previousRuns.filter((r) => r.date !== currentRun.date)
    : previousRuns

  const prevPB = calculatePersonalBest(historyExcludingCurrent)
  const isNewPB = checkIsNewPersonalBest(currentRun, prevPB)

  const onShareClick = useCallback(() => {
    if (!currentRun || typeof window === 'undefined') return
    const shareUrl = new URL(window.location.href).toString()

    const shareData: ShareData = {
      title: 'Play Quizroller!',
      text: `I just answered ${currentRun.correctAnswers} questions correctly and travelled ${currentRun.distance} meters!`,
      url: shareUrl,
    }
    handleShare(shareData)
  }, [currentRun, handleShare])

  useGSAP(
    () => {
      if (transitionStatus === 'entered') {
        gsap.timeline({ delay: 0.1 }).to(ref.current, { opacity: 1 }).fromTo(
          `.${FADE_IN_CLASS}`,
          {
            opacity: 0,
            scale: 1.2,
          },
          {
            opacity: 1,
            scale: 1,
            duration: 0.4,
            ease: 'power1.out',
            stagger: 0.08,
          },
        )
      }
      if (transitionStatus === 'exiting') {
        gsap.to(ref.current, {
          opacity: 0,
          duration: 0.4,
          ease: 'power1.out',
        })
      }
    },
    {
      dependencies: [transitionStatus, isNewPB],
      scope: ref,
    },
  )

  const onRollAgainClick = () => {
    resetGame()
  }

  return (
    <section
      ref={ref}
      className="relative z-1000 flex h-svh w-full flex-col items-center justify-center gap-4 bg-black/80 px-5 opacity-0 sm:gap-6">
      <h2 className={`${FADE_IN_CLASS} heading-lg opacity-0`}>
        <GradientText>Roll Over</GradientText>
      </h2>
      {/* New record banner */}
      {isNewPB && (
        <p
          className={twJoin(
            'paragraph-lg flex items-center justify-center gap-2 rounded-full',
            'bg-(--palette-3)/25 px-5 py-3 text-center font-semibold text-white backdrop-blur-md',
            'ring-1 ring-(--palette-3)',
            FADE_IN_CLASS,
          )}>
          <AwardIcon /> You&apos;ve set a new record!
        </p>
      )}
      {/* Results card */}
      {hasPlayedGame && (
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
      )}
      <div
        className={twJoin(
          'mt-4 flex flex-col items-center gap-3 opacity-0 sm:flex-row',
          FADE_IN_CLASS,
        )}>
        {isShareSupported && !!currentRun && (
          <Button variant="secondary" color="dark" onClick={onShareClick} disabled={isSharing}>
            Share my run
            <Share2Icon className="size-6" strokeWidth={1.5} />
          </Button>
        )}
        <Button variant="primary" color="dark" onClick={onRollAgainClick} disabled={isSharing}>
          Roll Again
          <PlayIcon className="size-8" strokeWidth={1.5} />
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
  const result = runs.reduce<PersonalBest>(
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

  return result
}

function checkIsNewPersonalBest(
  currentRun: RunStats | null,
  personalBest: PersonalBest,
): boolean {
  if (!currentRun) {
    return false
  }

  const isNewPB =
    currentRun.correctAnswers > personalBest.correctAnswers ||
    (currentRun.correctAnswers === personalBest.correctAnswers &&
      currentRun.distance > personalBest.distance)

  return isNewPB
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
  const playerColourIndex = useGameStore((s) => s.colourIndex)
  const isCorrectAnswersNewPB = currentRun.correctAnswers > personalBest.correctAnswers
  const isDistanceNewPB = currentRun.distance > personalBest.distance

  return (
    <Card
      playerColourIndex={playerColourIndex}
      className={twJoin('opacity-0', FADE_IN_CLASS)}
      childrenClassName="grid w-fit grid-cols-[auto_1fr_1fr] gap-x-4 gap-y-4 md:gap-x-8 ">
      {/* Column headers */}
      <div></div> {/* Empty cell for label column */}
      <h3 className="heading-sm text-black">This Run</h3>
      <h3 className="heading-sm text-black">Your Best</h3>
      {/* Correct answers row */}
      <div className="flex items-center text-sm font-semibold tracking-wide text-black/80 uppercase">
        Correct Answers
      </div>
      <p
        className={twJoin(
          'text-2xl font-bold md:text-3xl',
          isCorrectAnswersNewPB && 'text-(--palette-3)',
        )}>
        {currentRun.correctAnswers}
      </p>
      <p
        className={twJoin(
          'text-2xl font-bold md:text-3xl',
          !isCorrectAnswersNewPB && 'text-(--palette-3)',
        )}>
        {personalBest.correctAnswers}
      </p>
      {/* Distance row */}
      <div className="flex items-center text-sm font-semibold tracking-wide text-black/80 uppercase">
        Distance Travelled
      </div>
      <p
        className={twJoin(
          'text-2xl font-bold md:text-3xl',
          isDistanceNewPB && 'text-(--palette-3)',
        )}>
        {currentRun.distance}
      </p>
      <p
        className={twJoin(
          'text-2xl font-bold md:text-3xl',
          !isDistanceNewPB && 'text-(--palette-3)',
        )}>
        {personalBest.distance}
      </p>
    </Card>
  )
}
