'use client'
import { type FC, useEffect, useMemo, useState } from 'react'
import { twJoin, twMerge } from 'tailwind-merge'

import type { SpeedRunDatabase } from '@/model/schema'
import { TrophyIcon } from 'lucide-react'
import { getSpeedrunData, getSpeedrunPosition } from '@/app/actions'
import { useGameStore } from '@/components/GameProvider'

export function useLeaderboardTableData(count: number = 10): TableProps {
  const [isLoading, setIsLoading] = useState(true)
  const [speedRuns, setSpeedRuns] = useState<SpeedRunDatabase[]>([])
  const [playerPosition, setPlayerPosition] = useState<number | null>(null)

  const completedSpeedruns = useGameStore((s) => s.completedSpeedRuns)
  const userSpeedRunIds = useMemo(
    () => completedSpeedruns.map((run) => run.id),
    [completedSpeedruns],
  )

  const latestRunId = useMemo(
    () => completedSpeedruns[completedSpeedruns.length - 1]?.id,
    [completedSpeedruns],
  )

  useEffect(() => {
    let isMounted = true

    const fetchData = async () => {
      const speedrunData = await getSpeedrunData(count)

      if (!isMounted) return

      let playerPosition: number | null = null
      let allSpeedruns = speedrunData

      if (latestRunId) {
        const isOnLeaderboard = speedrunData.some((speedrun) => speedrun.id === latestRunId)

        if (!isOnLeaderboard) {
          const playerData = await getSpeedrunPosition(latestRunId)
          if (playerData && isMounted) {
            playerPosition = playerData.position
            allSpeedruns = [...speedrunData, playerData.run]
          }
        }
      }

      if (isMounted) {
        setSpeedRuns(allSpeedruns)
        setPlayerPosition(playerPosition)
        setIsLoading(false)
      }
    }

    fetchData()

    return () => {
      isMounted = false
    }
  }, [count, latestRunId])

  return { count, isLoading, speedRuns, userSpeedRunIds, playerPosition }
}

type TableProps = {
  count: number
  isLoading: boolean
  speedRuns: SpeedRunDatabase[]
  userSpeedRunIds: number[]
  playerPosition: number | null
}

export const LeaderboardTable: FC<TableProps> = ({
  count,
  isLoading,
  speedRuns,
  userSpeedRunIds,
  playerPosition,
}) => {
  const placeholderRows = useMemo(() => Array.from({ length: count }), [count])

  const leaderboardRuns = speedRuns.slice(0, count)
  const playerRunBelowLeaderboard =
    playerPosition && playerPosition > count ? speedRuns[speedRuns.length - 1] : null

  return (
    <section className="w-full max-w-xl">
      <header className="flex w-full px-3 py-5">
        <h2 className="w-full text-center text-2xl font-bold uppercase">
          Speed Roll Leaderboard
        </h2>
      </header>
      <div className="grid grid-cols-[auto_2fr_1fr_0.5fr] gap-x-4">
        {isLoading
          ? placeholderRows.map((_, index) => (
              <LoadingRow key={`loading-${index}`} index={index} />
            ))
          : leaderboardRuns.map((entry, index) => (
              <LeaderboardRow
                key={entry.id}
                entry={entry}
                index={index}
                isCurrentUser={userSpeedRunIds.includes(entry.id)}
              />
            ))}

        {!isLoading && playerRunBelowLeaderboard && (
          <LeaderboardRow
            key={playerRunBelowLeaderboard.id}
            entry={playerRunBelowLeaderboard}
            index={playerPosition! - 1}
            isCurrentUser={true}
            className="mt-4"
          />
        )}
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
  className?: string
}> = ({ entry, index, isCurrentUser, className }) => {
  const isTopThree = index < 3

  return (
    <div
      className={twMerge(
        ROW_CONTAINER_CLASSES,
        index % 2 === 0 && 'bg-[#000]/20',
        isCurrentUser && 'text-leaderboard bg-leaderboard/12',
        isTopThree ? 'h-14' : 'h-11',
        className,
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
