'use client'
import { CheckCircle2Icon } from 'lucide-react'
import type { FC, ReactNode } from 'react'
import type { TransitionStatus } from 'react-transition-group'
import { twMerge } from 'tailwind-merge'

import { useGameStore } from '@/components/GameProvider'
import { getDifficultyLabel } from '@/model/difficulty'

const PlayingUI: FC<{ transitionStatus: TransitionStatus }> = () => {
  const confirmedAnswers = useGameStore((s) => s.confirmedAnswers)
  const difficulty = useGameStore((s) => s.currentDifficulty)
  const distanceRows = useGameStore((s) => s.distanceRows)

  const correctCount = confirmedAnswers.reduce(
    (acc, a) => acc + (a.answer.isCorrect ? 1 : 0),
    -1, // First question is the topic, not counted
  )

  const difficultyLabel = getDifficultyLabel(difficulty)

  const renderBlock = ({
    className,
    heading,
    content,
  }: {
    className?: string
    heading: string
    content: ReactNode
  }): ReactNode => {
    return (
      <div className={twMerge('flex flex-col bg-black/40', className)}>
        <div className="block px-4 py-2 text-center text-[13px] leading-none font-medium text-white/80 uppercase">
          {heading}
        </div>
        <div className="flex-1 bg-black/40 p-2 text-center">{content}</div>
      </div>
    )
  }

  return (
    <section className="pointer-events-none fixed inset-x-0 top-3 flex justify-center gap-px">
      {renderBlock({
        heading: 'Difficulty',
        content: <span className="text-lg font-extrabold">{difficultyLabel}</span>,
      })}
      {renderBlock({
        heading: 'Gems',
        content: (
          <div className="flex items-center gap-1">
            {Array.from({ length: correctCount }).map((_, i) => (
              <CheckCircle2Icon key={i} className="size-4 text-green-400" strokeWidth={2} />
            ))}
          </div>
        ),
      })}
      {renderBlock({
        heading: 'Distance',
        content: <span className="text-xl font-extrabold">{distanceRows}</span>,
      })}
    </section>
  )
}

export default PlayingUI
