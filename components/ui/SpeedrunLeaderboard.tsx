'use client'
import { type FC, useEffect, useState, useMemo } from 'react'
import { twJoin } from 'tailwind-merge'

import { getSpeedrunData } from '@/app/actions'
import type { SpeedRunDatabase } from '@/model/schema'
import { useGameStore } from '@/components/GameProvider'
import { Trophy } from 'lucide-react'

export const SpeedrunLeaderboard: FC = () => {
  const [speedruns, setSpeedruns] = useState<SpeedRunDatabase[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const username = useGameStore((s) => s.username)
  const completedSpeedruns = useGameStore((s) => s.completedSpeedRuns)
  const completedSpeedrunIds = useMemo(
    () => completedSpeedruns.map((run) => run.id),
    [completedSpeedruns],
  )

  useEffect(() => {
    let mounted = true

    getSpeedrunData().then((data) => {
      if (mounted) {
        setSpeedruns(data)
        setIsLoading(false)
      }
    })

    return () => {
      mounted = false
    }
  }, [])

  if (isLoading) {
    return <div className="w-full text-center">Loading...</div>
  }

  // TODO: highlight the current user's entries if present
  // TODO: create a skeleton loader for the leaderboard - same grid but with animated placeholders
  return (
    <section className="fixed top-32 left-1/2 w-2xl max-w-full -translate-x-1/2 rounded-lg bg-black/50 px-8 py-4">
      <div className="mb-2 flex w-full items-center justify-between border-b border-white/50 px-2 py-4">
        <Trophy className="text-leaderboard" />
        <h1 className="text-center text-3xl uppercase">Global Leaderboard</h1>
        <Trophy className="text-leaderboard" />
      </div>
      <div className="mt-1 grid grid-cols-[auto_2fr_1fr_0.5fr] rounded-lg bg-black px-4">
        {/* Header */}
        <h4 className="ml-2 flex w-7 justify-center">#</h4>
        <h4 className="px-2 text-left">Username</h4>
        <h4 className="px-2 text-center">Time</h4>
        <h4 className="px-2 text-center">Flag</h4>
        <div className="col-span-full my-2 h-px border-b border-white/50" />

        {/* Rows */}
        <div className="col-span-full w-full border-2 border-red-600">
          {speedruns.map((entry, index) => {
            const isCurrentUserId = completedSpeedrunIds.includes(entry.id)
            const isCurrentUsername = username && entry.username === username
            const isCurrentUser = isCurrentUserId || isCurrentUsername
            const isTopThree = index < 3
            return (
              <section
                key={entry.id}
                className={twJoin(
                  'mb-2 grid grid-cols-[auto_2fr_1fr_0.5fr] items-center rounded outline',
                  isCurrentUser ? 'text-leaderboard outline-leaderboard' : 'outline-white/50',
                  isTopThree ? 'h-12' : 'h-8',
                )}>
                {isTopThree ? (
                  <Medal position={index} />
                ) : (
                  <div className="ml-2 flex w-7 items-center justify-center">{index + 1}.</div>
                )}

                <h4
                  className={twJoin(
                    'flex items-center px-2 text-left uppercase',
                    isTopThree ? 'text-lg' : 'text-base',
                  )}>
                  {entry.username}
                </h4>
                <div className="flex items-center justify-center px-2 text-center tabular-nums">
                  {entry.time.toFixed(2)}s
                </div>
                <div className="flex items-center justify-center px-2 text-center">
                  {entry.flag || '-'}
                </div>
              </section>
            )
          })}
        </div>
      </div>
    </section>
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
        strokeWidth="1.5"
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
