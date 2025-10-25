'use client'
import { FootprintsIcon, GaugeIcon, GemIcon, type LucideIcon, TrophyIcon } from 'lucide-react'
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
    confirmedAnswers.reduce(
      (acc, a) => acc + (a.answer.isCorrect ? 1 : 0),
      -1, // First question is the topic, not counted
    ),
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

  const renderBlock = ({
    icon: Icon,
    content,
  }: {
    icon: LucideIcon
    content: ReactNode
  }): ReactNode => {
    return (
      <div className="relative flex items-center gap-4 rounded-xl bg-black/70 px-4 py-2">
        <Icon className="size-7 text-white" strokeWidth={1.5} />
        {content}
      </div>
    )
  }

  return (
    <section
      ref={ref}
      className="pointer-events-none fixed inset-x-0 bottom-4 flex justify-center gap-2">
      {renderBlock({
        icon: GaugeIcon,
        content: <span className="text-2xl font-extrabold">{difficultyLabel}</span>,
      })}
      {renderBlock({
        icon: GemIcon,
        content: (
          <span className={twJoin('text-4xl font-extrabold', isCorrectPB && 'text-amber-300')}>
            {correctCount}
          </span>
        ),
      })}
      {renderBlock({
        icon: FootprintsIcon,
        content: (
          <span className={twJoin('text-4xl font-extrabold', isDistancePB && 'text-amber-300')}>
            {distanceRows}
          </span>
        ),
      })}
    </section>
  )
}

export default PlayingUI
