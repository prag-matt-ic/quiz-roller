'use client'
import { useQuery } from '@tanstack/react-query'
import { PlayIcon } from 'lucide-react'
import { type FC, type ReactNode, useMemo } from 'react'
import { twJoin, twMerge } from 'tailwind-merge'

import { RunWithPosition, getSpeedrunData, getSpeedrunPosition } from '@/app/actions'
import { useGameStore } from '@/components/GameProvider'
import type { SpeedRunDatabase } from '@/model/schema'

export function useLeaderboardTableData({
  count = 10,
  fetchPlayerRecentPosition = false,
  showCTARow = false,
}: {
  count: number
  fetchPlayerRecentPosition: boolean
  showCTARow: boolean
}): TableProps {
  const completedSpeedruns = useGameStore((s) => s.completedSpeedRuns)

  const userSpeedRunIds = useMemo(
    () => completedSpeedruns.map((run) => run.id),
    [completedSpeedruns],
  )

  const latestRunId = useMemo(
    () => completedSpeedruns[completedSpeedruns.length - 1]?.id ?? null,
    [completedSpeedruns],
  )

  const { data: leaderboardRuns = [], isPending: isLeaderboardPending } = useQuery({
    queryKey: ['speedrun-leaderboard', count, latestRunId],
    queryFn: () => getSpeedrunData(count),
    staleTime: 30_000,
  })

  const latestRunIsRanked =
    typeof latestRunId === 'number' && leaderboardRuns.some((run) => run.id === latestRunId)

  const shouldFetchRecentRun = Boolean(
    fetchPlayerRecentPosition && latestRunId && !isLeaderboardPending && !latestRunIsRanked,
  )

  const { data: userRecentRunData } = useQuery({
    queryKey: ['speedrun-recent-run', latestRunId],
    queryFn: () => getSpeedrunPosition(latestRunId as number),
    enabled: shouldFetchRecentRun,
    staleTime: 60_000,
  })

  return {
    count,
    isLoading: isLeaderboardPending,
    userRecentRun: shouldFetchRecentRun ? (userRecentRunData ?? null) : null,
    leaderboardRuns,
    userSpeedRunIds,
    showCTA: showCTARow,
  }
}

type TableProps = {
  count: number
  className?: string
  isLoading: boolean
  leaderboardRuns: SpeedRunDatabase[] // Those within the top `count`
  userSpeedRunIds: number[] // IDs of the user's completed speedruns
  userRecentRun: RunWithPosition | null // The user's most recent speedrun, if applicable
  showCTA?: boolean
  onStartSpeedRun?: () => void
}

export const LeaderboardTable: FC<TableProps> = ({
  count,
  className,
  isLoading,
  showCTA = true,
  userSpeedRunIds = [],
  leaderboardRuns,
  userRecentRun,
  onStartSpeedRun,
}) => {
  const placeholderRows = useMemo(() => Array.from({ length: count }), [count])
  const showCTARow = showCTA && !!onStartSpeedRun

  console.warn('[LeaderboardTable] Rendering with:', {
    count,
    isLoading,
    leaderboardRuns,
    userRecentRun,
    showCTA,
  })

  return (
    <section
      className={twMerge(
        'grid max-h-full w-full max-w-xl grid-cols-[auto_2fr_1fr_0.5fr] gap-x-4 overflow-y-auto',
        className,
      )}>
      {isLoading
        ? placeholderRows.map((_, index) => (
            <LoadingRow key={`loading-${index}`} index={index} />
          ))
        : leaderboardRuns.map((entry, index) => (
            <LeaderboardRow
              key={entry.id}
              username={entry.username}
              time={entry.time}
              flag={entry.flag}
              position={index + 1}
              isCurrentUser={userSpeedRunIds.includes(entry.id)}
              isLatestRun={entry.id === userRecentRun?.run.id}
            />
          ))}

      {!isLoading && !!userRecentRun && (
        <LeaderboardRow
          key={userRecentRun!.run.id}
          username={userRecentRun!.run.username}
          time={userRecentRun!.run.time}
          flag={userRecentRun!.run.flag}
          position={userRecentRun!.position}
          isCurrentUser={true}
          isLatestRun={true}
          className="mt-4"
        />
      )}

      {showCTARow && (
        <LeaderboardRow
          key="cta-row"
          className="pointer-events-auto z-100 mt-3 mb-2 h-fit rounded-full bg-green-400/20 text-white"
          username="Set a time"
          time={0}
          position={CTA_POSITION}
          isCurrentUser={false}
          isLatestRun={false}
          flag={
            <button
              type="button"
              onClick={onStartSpeedRun}
              className="-mr-3 flex aspect-square size-12 items-center justify-center rounded-full bg-green-600 text-white ring ring-green-400 transition-all duration-200 hover:bg-green-500 hover:ring-green-200"
              aria-label="Start a speed run">
              <PlayIcon className="h-5 w-5" strokeWidth={1.75} />
            </button>
          }
        />
      )}
    </section>
  )
}

const CTA_POSITION = -1
const ROW_CONTAINER_CLASSES = 'col-span-full grid grid-cols-subgrid items-center px-2'

type RowProps = {
  username: string
  time: number
  flag: ReactNode
  position: number
  isCurrentUser: boolean
  isLatestRun?: boolean
  className?: string
}

const LeaderboardRow: FC<RowProps> = ({
  username,
  time,
  flag,
  position,
  isCurrentUser,
  isLatestRun = false,
  className,
}) => {
  const isCTAPosition = position === CTA_POSITION
  const isTopThree = !isCTAPosition && position < 4

  return (
    <div
      className={twMerge(
        ROW_CONTAINER_CLASSES,
        position % 2 === 0 && 'bg-black/20',
        isTopThree ? 'h-14 text-white' : 'h-11 text-white/90',
        isCurrentUser && 'bg-green-600/5 text-emerald-400',
        isLatestRun && 'z-40 border! border-emerald-600',
        className,
      )}>
      {isTopThree ? (
        <Medal position={position} />
      ) : (
        <div className="flex w-full items-center justify-center pl-1 text-center font-semibold">
          {isCTAPosition ? '??' : `${position}.`}
        </div>
      )}
      <h4
        className={twJoin('flex items-center text-left', isTopThree ? 'text-base' : 'text-sm')}>
        {username}
      </h4>
      <div className="flex items-center justify-center text-center font-mono text-base tabular-nums">
        {isCTAPosition ? '00:00s' : `${time.toFixed(2)}s`}
      </div>
      <div className="flex items-center justify-center text-center text-xl font-bold">
        {flag ?? '?'}
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
        className={twJoin('absolute inset-0', medalColours[position - 1])}>
        <path
          d="M7.21 15 2.66 7.14a2 2 0 0 1 .13-2.2L4.4 2.8A2 2 0 0 1 6 2h12a2 2 0 0 1 1.6.8l1.6 2.14a2 2 0 0 1 .14 2.2L16.79 15"
          stroke="currentColor"
        />
        <path d="M11 12 5.12 2.2" stroke="currentColor" />
        <path d="m13 12 5.88-9.8" stroke="currentColor" />
        <path d="M8 7h8" stroke="currentColor" />
        <circle cx="12" cy="17" r="6" fill="currentColor" />
      </svg>
      <p className="absolute top-3.25 text-sm font-bold text-black">{position}</p>
    </div>
  )
}
