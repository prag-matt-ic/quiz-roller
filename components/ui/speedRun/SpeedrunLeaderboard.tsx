'use client'
import { type FC, useEffect, useState, useMemo } from 'react'
import { twJoin, twMerge } from 'tailwind-merge'

import { getSpeedrunData } from '@/app/actions'
import type { SpeedRunDatabase } from '@/model/schema'
import { useGameStore } from '@/components/GameProvider'
import { Trophy } from 'lucide-react'
import Button from '../Button'

type Props = {
  count?: number
  showButtons?: boolean
}

export const SpeedrunLeaderboard: FC<Props> = ({ count = 10, showButtons = true }) => {
  const startSpeedRun = useGameStore((s) => s.startSpeedRun)
  const stopSpeedRun = useGameStore((s) => s.stopSpeedRun)

  return (
    <div className="fixed inset-0 z-100 flex flex-col items-center justify-center gap-6 bg-black/60 px-4 pb-12">
      <LeaderboardTable count={count} />
      {showButtons && (
        <div className="flex gap-4">
          <Button color="light" variant="primary" onClick={startSpeedRun}>
            Retry
          </Button>
          <Button color="light" variant="secondary" onClick={stopSpeedRun}>
            Finish
          </Button>
        </div>
      )}
    </div>
  )
}

export const LeaderboardTable: FC<{
  count: number
}> = ({ count }) => {
  const [isLoading, setIsLoading] = useState(true)
  const [speedRuns, setSpeedRuns] = useState<SpeedRunDatabase[]>([])

  useEffect(() => {
    let isMounted = true

    getSpeedrunData(count).then((data) => {
      if (isMounted) {
        setSpeedRuns(data)
        setIsLoading(false)
      }
    })

    return () => {
      isMounted = false
    }
  }, [count])

  const completedSpeedruns = useGameStore((s) => s.completedSpeedRuns)
  const completedSpeedrunIds = useMemo(
    () => completedSpeedruns.map((run) => run.id),
    [completedSpeedruns],
  )
  const placeholderRows = useMemo(() => Array.from({ length: count }), [count])

  return (
    <section className="w-full max-w-xl">
      <header className="flex w-full items-center justify-between px-3 py-5">
        <Trophy className="text-leaderboard" strokeWidth={1.5} />
        <h2 className="text-center text-2xl uppercase">Global Leaderboard</h2>
        <Trophy className="text-leaderboard" strokeWidth={1.5} />
      </header>
      <div className="grid grid-cols-[auto_2fr_1fr_0.5fr] gap-x-4 rounded-md bg-black shadow-2xl shadow-black/90">
        {isLoading
          ? placeholderRows.map((_, index) => (
              <LoadingRow key={`loading-${index}`} index={index} />
            ))
          : speedRuns.map((entry, index) => (
              <LeaderboardRow
                key={entry.id}
                entry={entry}
                index={index}
                isCurrentUser={completedSpeedrunIds.includes(entry.id)}
              />
            ))}
      </div>
    </section>
  )
}

const ROW_CONTAINER_CLASSES =
  'col-span-full grid grid-cols-subgrid items-center border-b border-white/8 px-3 select-none last-of-type:border-0'

const LeaderboardRow: FC<{
  entry: SpeedRunDatabase
  index: number
  isCurrentUser: boolean
}> = ({ entry, index, isCurrentUser }) => {
  const isTopThree = index < 3

  return (
    <div
      className={twMerge(
        ROW_CONTAINER_CLASSES,
        index % 2 === 0 && 'bg-white/1',
        isCurrentUser && 'text-leaderboard bg-leaderboard/8',
        isTopThree ? 'h-14' : 'h-11',
      )}>
      {isTopThree ? (
        <Medal position={index} />
      ) : (
        <div className="flex w-full items-center justify-center pl-1 text-center">
          {index + 1}.
        </div>
      )}
      <h4
        className={twJoin(
          'flex items-center text-left uppercase',
          isTopThree ? 'text-lg' : 'text-base',
        )}>
        {entry.username}
      </h4>
      <div className="flex items-center justify-center text-center font-mono text-xl tabular-nums">
        {entry.time.toFixed(2)}s
      </div>
      <div className="flex items-center justify-center text-center text-2xl font-bold">
        {entry.flag ?? '?'}
      </div>
    </div>
  )
}

const LoadingRow: FC<{ index: number }> = ({ index }) => {
  const isTopThree = index < 3
  return (
    <div
      className={twJoin(
        ROW_CONTAINER_CLASSES,
        index % 2 === 0 && 'bg-white/1',
        isTopThree ? 'h-14' : 'h-11',
        'animate-pulse',
      )}>
      <div className="flex w-full items-center justify-center">
        {isTopThree ? (
          <div className="size-8 rounded-full bg-white/10" />
        ) : (
          <div className="h-4 w-6 rounded bg-white/10" />
        )}
      </div>
      <div className="flex items-center">
        <div className="h-4 w-32 rounded bg-white/10" />
      </div>
      <div className="flex items-center justify-center">
        <div className="h-5 w-16 rounded bg-white/10" />
      </div>
      <div className="flex items-center justify-center">
        <div className="size-8 rounded-full bg-white/10" />
      </div>
    </div>
  )
}

const Medal: FC<{ position: number }> = ({ position }) => {
  const medalColours = ['text-gold', 'text-silver', 'text-bronze']

  return (
    <div className="relative ml-1.25 flex size-8 items-center justify-center">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="32"
        height="32"
        viewBox="0 0 24 24"
        fill="none"
        strokeWidth="1"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={twJoin('absolute inset-0', medalColours[position])}>
        <path
          d="M7.21 15 2.66 7.14a2 2 0 0 1 .13-2.2L4.4 2.8A2 2 0 0 1 6 2h12a2 2 0 0 1 1.6.8l1.6 2.14a2 2 0 0 1 .14 2.2L16.79 15"
          stroke="currentColor"
        />
        <path d="M11 12 5.12 2.2" stroke="currentColor" />
        <path d="m13 12 5.88-9.8" stroke="currentColor" />
        <path d="M8 7h8" stroke="currentColor" />
        <circle cx="12" cy="17" r="6" fill="currentColor" />
      </svg>
      <p className="absolute top-3.25 text-sm font-bold text-black">{position + 1}</p>
    </div>
  )
}
