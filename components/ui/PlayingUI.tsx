'use client'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import { FootprintsIcon, GaugeIcon, GemIcon, type LucideIcon } from 'lucide-react'
import type { FC, ReactNode, RefObject } from 'react'
import { useMemo } from 'react'
import type { TransitionStatus } from 'react-transition-group'
import { twJoin } from 'tailwind-merge'

import { useGameStore } from '@/components/GameProvider'
import { getDifficultyLabel } from '@/model/difficulty'

type Props = {
  transitionStatus: TransitionStatus
  ref: RefObject<HTMLDivElement | null>
}

const PlayingUI: FC<Props> = ({ transitionStatus, ref }) => {
  const confirmedAnswers = useGameStore((s) => s.confirmedAnswers)
  const difficulty = useGameStore((s) => s.currentDifficulty)
  const distanceRows = useGameStore((s) => s.distanceRows)
  const topic = useGameStore((s) => s.topic)
  const previousRuns = useGameStore((s) => s.previousRuns)

  const correctCount = Math.max(
    0,
    confirmedAnswers.reduce((acc, a) => acc + (a.answer.isCorrect ? 1 : 0), 0),
  )

  const difficultyLabel = getDifficultyLabel(difficulty)

  const { maxDistance, maxCorrect } = useMemo<{
    maxDistance: number
    maxCorrect: number
  }>(() => {
    if (!topic) return { maxDistance: 0, maxCorrect: 0 }

    const runs = previousRuns[topic] ?? []
    if (!runs.length) return { maxDistance: 0, maxCorrect: 0 }

    return {
      maxDistance: Math.max(...runs.map((r) => r.distance)),
      maxCorrect: Math.max(...runs.map((r) => r.correctAnswers)),
    }
  }, [topic, previousRuns])

  const isDistancePB = distanceRows > maxDistance
  const isCorrectPB = correctCount > maxCorrect

  useGSAP(
    () => {
      if (transitionStatus === 'entered') {
        gsap.fromTo(
          ref.current,
          { opacity: 0, y: 56 },
          { opacity: 1, y: 0, duration: 0.4, ease: 'power2.out' },
        )
      }
      if (transitionStatus === 'exiting') {
        gsap.to(ref.current, { opacity: 0, y: 56, duration: 0.2 })
      }
    },
    { scope: ref, dependencies: [transitionStatus] },
  )

  const renderBlock = ({
    icon: Icon,
    content,
  }: {
    icon: LucideIcon
    content: ReactNode
  }): ReactNode => {
    return (
      <div className="relative flex w-fit items-center gap-2 rounded-xl border border-black bg-black/60 px-3 py-1 sm:gap-3 sm:px-4 sm:py-2">
        <Icon className="size-5 text-white sm:size-7" strokeWidth={1.5} />
        {content}
      </div>
    )
  }

  return (
    <section
      ref={ref}
      className="pointer-events-none fixed inset-x-4 bottom-4 flex flex-col justify-center gap-1 opacity-0 sm:flex-row sm:gap-2">
      {renderBlock({
        icon: GaugeIcon,
        content: <span className="text-lg font-extrabold sm:text-2xl">{difficultyLabel}</span>,
      })}
      {renderBlock({
        icon: GemIcon,
        content: (
          <span
            className={twJoin(
              'text-lg font-extrabold sm:text-2xl',
              isCorrectPB && 'text-amber-300',
            )}>
            {correctCount}
          </span>
        ),
      })}
      {renderBlock({
        icon: FootprintsIcon,
        content: (
          <span
            className={twJoin(
              'text-lg font-extrabold sm:text-2xl',
              isDistancePB && 'text-amber-300',
            )}>
            {distanceRows}
          </span>
        ),
      })}
    </section>
  )
}

export default PlayingUI
